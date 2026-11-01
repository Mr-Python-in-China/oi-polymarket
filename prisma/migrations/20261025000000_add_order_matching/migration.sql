CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'PARTIALLY_FILLED', 'FILLED');
-- Support the composite foreign key that keeps each order's choice and event consistent.
CREATE UNIQUE INDEX "Choice_id_eventId_key" ON "Choice" ("id", "eventId");

-- Prices use integer ticks from 0 to 1000; quantities never use floating point.
CREATE TABLE "Order" (
  "id" BIGSERIAL PRIMARY KEY,
  "userId" BIGINT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "eventId" BIGINT NOT NULL REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "choiceId" BIGINT NOT NULL,
  "side" "OrderSide" NOT NULL,
  "price" SMALLINT NOT NULL CHECK ("price" BETWEEN 0 AND 1000),
  "quantity" BIGINT NOT NULL CHECK ("quantity" > 0),
  "remainingQuantity" BIGINT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
  "idempotencyKey" VARCHAR(128) NOT NULL CHECK (length(trim("idempotencyKey")) > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("choiceId", "eventId") REFERENCES "Choice"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK ("remainingQuantity" BETWEEN 0 AND "quantity"),
  -- Reject status/quantity combinations that would corrupt the order book.
  CHECK (("status" = 'OPEN' AND "remainingQuantity" = "quantity")
    OR ("status" = 'PARTIALLY_FILLED' AND "remainingQuantity" > 0 AND "remainingQuantity" < "quantity")
    OR ("status" = 'FILLED' AND "remainingQuantity" = 0))
);
CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key" ON "Order" ("userId", "idempotencyKey");
CREATE INDEX "Order_choiceId_side_price_id_idx" ON "Order" ("choiceId", "side", "price", "id");

-- Each fill records the resting order (maker) and incoming order (taker).
CREATE TABLE "Trade" (
  "id" BIGSERIAL PRIMARY KEY,
  "makerOrderId" BIGINT NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "takerOrderId" BIGINT NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "price" SMALLINT NOT NULL CHECK ("price" BETWEEN 0 AND 1000),
  "quantity" BIGINT NOT NULL CHECK ("quantity" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("makerOrderId" <> "takerOrderId")
);
CREATE INDEX "Trade_makerOrderId_idx" ON "Trade" ("makerOrderId");
CREATE INDEX "Trade_takerOrderId_idx" ON "Trade" ("takerOrderId");

-- All writes participate in the caller's transaction; any error rolls them back together.
CREATE FUNCTION submit_order(
  actor_id BIGINT, event_id BIGINT, choice_id BIGINT, order_side "OrderSide",
  limit_price INTEGER, order_quantity BIGINT, request_key TEXT
) RETURNS SETOF "Order" LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  incoming "Order"%ROWTYPE;
  maker "Order"%ROWTYPE;
  matched_quantity BIGINT;
  deadline TIMESTAMP(3);
BEGIN
  -- Validate here too: callers can invoke SQL without the application validator.
  IF actor_id IS NULL OR event_id IS NULL OR choice_id IS NULL OR order_side IS NULL
    OR limit_price IS NULL OR limit_price NOT BETWEEN 0 AND 1000
    OR order_quantity IS NULL OR order_quantity <= 0
    OR request_key IS NULL OR length(trim(request_key)) = 0 OR length(request_key) > 128 THEN
    RAISE EXCEPTION 'Invalid order parameters' USING ERRCODE = '22023';
  END IF;
  -- Lock request identity before the choice, including retries targeting a different choice.
  -- Transaction-level advisory locks are released automatically at commit or rollback.
  PERFORM pg_advisory_xact_lock(hashtextextended('order-request:' || actor_id || ':' || request_key, 0));
  SELECT * INTO incoming FROM "Order" WHERE "userId" = actor_id AND "idempotencyKey" = request_key;
  IF FOUND THEN
    -- An identical retry returns current state, even after the event deadline.
    IF incoming."eventId" <> event_id OR incoming."choiceId" <> choice_id
      OR incoming.side <> order_side OR incoming.price <> limit_price OR incoming.quantity <> order_quantity THEN
      RAISE EXCEPTION 'Idempotency key reused with different parameters' USING ERRCODE = '22023';
    END IF;
    RETURN NEXT incoming;
    RETURN;
  END IF;

  -- Serialize matching per choice; do not skip locked orders and violate price/time priority.
  PERFORM pg_advisory_xact_lock(hashtextextended('order-choice:' || choice_id, 0));
  -- Keep event/choice metadata stable until this submission finishes.
  SELECT event."lockAt" INTO deadline FROM "Event" event
    JOIN "Choice" choice ON choice."eventId" = event.id
    WHERE event.id = event_id AND choice.id = choice_id FOR SHARE OF event, choice;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Choice does not belong to event' USING ERRCODE = '22023';
  END IF;
  -- Use wall-clock time so time spent waiting for the lock counts toward the deadline.
  IF deadline <= clock_timestamp()::timestamp THEN
    RAISE EXCEPTION 'Event is closed' USING ERRCODE = '22023';
  END IF;
  INSERT INTO "Order" ("userId", "eventId", "choiceId", side, price, quantity, "remainingQuantity", "idempotencyKey")
    VALUES (actor_id, event_id, choice_id, order_side, limit_price, order_quantity, order_quantity, request_key)
    RETURNING * INTO incoming;
  WHILE incoming."remainingQuantity" > 0 LOOP
    -- Buy takes the lowest ask; sell takes the highest bid. IDs break price ties
    -- in insertion order because all submissions for this choice hold the same lock.
    SELECT * INTO maker FROM "Order"
      WHERE "choiceId" = choice_id AND side <> order_side AND "remainingQuantity" > 0
        AND ((order_side = 'BUY' AND price <= limit_price) OR (order_side = 'SELL' AND price >= limit_price))
      ORDER BY CASE WHEN order_side = 'BUY' THEN price ELSE -price END, id
      LIMIT 1 FOR UPDATE;
    -- No compatible maker: leave the remainder for a future incoming order.
    EXIT WHEN NOT FOUND;
    matched_quantity := LEAST(incoming."remainingQuantity", maker."remainingQuantity");
    -- Execute at the resting maker's price, not the incoming limit price.
    INSERT INTO "Trade" ("makerOrderId", "takerOrderId", price, quantity)
      VALUES (maker.id, incoming.id, maker.price, matched_quantity);
    -- Both orders consume the same quantity; SET expressions read pre-update values.
    UPDATE "Order" SET
      "remainingQuantity" = "remainingQuantity" - matched_quantity,
      status = CASE WHEN "remainingQuantity" = matched_quantity THEN 'FILLED'::"OrderStatus" ELSE 'PARTIALLY_FILLED'::"OrderStatus" END,
      "updatedAt" = clock_timestamp()
      WHERE id IN (maker.id, incoming.id);
    incoming."remainingQuantity" := incoming."remainingQuantity" - matched_quantity;
    -- Trade is the fill record; lastPrice is only a display cache.
    UPDATE "Choice" SET "lastPrice" = maker.price WHERE id = choice_id;
  END LOOP;
  RETURN QUERY SELECT * FROM "Order" WHERE id = incoming.id;
END;
$$;