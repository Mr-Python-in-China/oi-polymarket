-- @param {String} $1:username
-- @param {String} $2:avatar
-- @param {String} $3:codeforcesSub
-- @param {BigInt} $4:initialMoney
 WITH get_lock AS MATERIALIZED
  (SELECT pg_advisory_xact_lock(21086)),
      is_first_check AS
  (SELECT NOT EXISTS
     (SELECT 1
      FROM "User") AS is_first)
INSERT INTO "User" ("username",
                    "avatar",
                    "codeforcesSub",
                    "money",
                    "role")
SELECT $1,
       $2,
       $3,
       $4,
       CASE
           WHEN is_first_check.is_first THEN 'ADMIN'::"UserRole"
           ELSE 'USER'::"UserRole"
       END
FROM get_lock
CROSS JOIN is_first_check RETURNING "id";