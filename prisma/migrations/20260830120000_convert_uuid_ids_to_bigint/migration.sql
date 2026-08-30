-- Preserve the historical UUIDv7 order while replacing event and choice IDs
-- with compact BIGINT keys. User IDs are already numeric, so only widen them.

ALTER TABLE "Event" DROP CONSTRAINT "Event_createById_fkey";
ALTER TABLE "Choice" DROP CONSTRAINT "Choice_eventId_fkey";

ALTER TABLE "User" ALTER COLUMN "id" TYPE BIGINT;
ALTER SEQUENCE "User_id_seq" AS BIGINT;
ALTER TABLE "Event" ALTER COLUMN "createById" TYPE BIGINT;

ALTER TABLE "Event"
    ADD COLUMN "id_new" BIGINT,
    ADD COLUMN "createdAt" TIMESTAMP(3);

ALTER TABLE "Choice"
    ADD COLUMN "id_new" BIGINT,
    ADD COLUMN "eventId_new" BIGINT;

WITH numbered_events AS (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "id")::BIGINT AS "id_new"
    FROM "Event"
)
UPDATE "Event" AS event
SET "id_new" = numbered_events."id_new"
FROM numbered_events
WHERE event."id" = numbered_events."id";

UPDATE "Event"
SET "createdAt" = uuid_extract_timestamp("id");

UPDATE "Choice" AS choice
SET "eventId_new" = event."id_new"
FROM "Event" AS event
WHERE choice."eventId" = event."id";

WITH numbered_choices AS (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "id")::BIGINT AS "id_new"
    FROM "Choice"
)
UPDATE "Choice" AS choice
SET "id_new" = numbered_choices."id_new"
FROM numbered_choices
WHERE choice."id" = numbered_choices."id";

ALTER TABLE "Event" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "Choice" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "Choice" ALTER COLUMN "eventId_new" SET NOT NULL;

ALTER TABLE "Event" DROP CONSTRAINT "Event_pkey";
ALTER TABLE "Choice" DROP CONSTRAINT "Choice_pkey";

ALTER TABLE "Choice" DROP COLUMN "eventId";
ALTER TABLE "Choice" RENAME COLUMN "eventId_new" TO "eventId";
ALTER TABLE "Choice" DROP COLUMN "order";
ALTER TABLE "Choice" DROP COLUMN "id";
ALTER TABLE "Choice" RENAME COLUMN "id_new" TO "id";

ALTER TABLE "Event" DROP COLUMN "id";
ALTER TABLE "Event" RENAME COLUMN "id_new" TO "id";

ALTER TABLE "Event" ADD CONSTRAINT "Event_pkey" PRIMARY KEY ("id");
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_pkey" PRIMARY KEY ("id");

ALTER TABLE "Event"
    ADD CONSTRAINT "Event_createById_fkey"
    FOREIGN KEY ("createById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Choice"
    ADD CONSTRAINT "Choice_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE SEQUENCE "Event_id_seq" AS BIGINT;
CREATE SEQUENCE "Choice_id_seq" AS BIGINT;
ALTER SEQUENCE "Event_id_seq" OWNED BY "Event"."id";
ALTER SEQUENCE "Choice_id_seq" OWNED BY "Choice"."id";

ALTER TABLE "Event" ALTER COLUMN "id" SET DEFAULT nextval('"Event_id_seq"');
ALTER TABLE "Choice" ALTER COLUMN "id" SET DEFAULT nextval('"Choice_id_seq"');

SELECT setval('"User_id_seq"', COALESCE((SELECT MAX("id") FROM "User"), 1), EXISTS (SELECT 1 FROM "User"));
SELECT setval('"Event_id_seq"', COALESCE((SELECT MAX("id") FROM "Event"), 1), EXISTS (SELECT 1 FROM "Event"));
SELECT setval('"Choice_id_seq"', COALESCE((SELECT MAX("id") FROM "Choice"), 1), EXISTS (SELECT 1 FROM "Choice"));

CREATE INDEX "Choice_eventId_idx" ON "Choice"("eventId");

ALTER TABLE "Event" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
