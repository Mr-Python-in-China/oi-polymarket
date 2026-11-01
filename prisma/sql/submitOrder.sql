-- @param {BigInt} $1:actorId
-- @param {BigInt} $2:eventId
-- @param {BigInt} $3:choiceId
-- @param {String} $4:side
-- @param {Int} $5:price
-- @param {BigInt} $6:quantity
-- @param {String} $7:idempotencyKey
SELECT id, status::text AS status, "remainingQuantity", quantity
FROM submit_order($1, $2, $3, $4::"OrderSide", $5, $6, $7);