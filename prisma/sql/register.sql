-- @param {String} $1:username
-- @param {String} $2:avatar
-- @param {String} $3:codeforcesSub

WITH lock_acquired AS (
  SELECT pg_try_advisory_xact_lock(21086) AS acquired
),
is_first_check AS (
  SELECT NOT EXISTS (SELECT 1 FROM "User") AS is_first
)
INSERT INTO "User" ("username", "avatar", "codeforcesSub", "role")
SELECT
  $1,
  $2,
  $3,
  CASE WHEN is_first_check.is_first THEN 'ADMIN'::"UserRole" ELSE 'USER'::"UserRole" END
FROM lock_acquired
CROSS JOIN is_first_check
WHERE lock_acquired.acquired
RETURNING "id";
