CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Support the hourly pg_cron cleanup query.
CREATE INDEX "Session_expires_idx" ON "Session"("expires");

SELECT cron.schedule(
	'cleanup-expired-sessions',
	'0 * * * *',
	$$DELETE FROM "Session"
		WHERE "expires" IS NOT NULL
			AND "expires" <= CURRENT_TIMESTAMP$$
)
WHERE NOT EXISTS (
	SELECT 1
	FROM cron.job
	WHERE jobname = 'cleanup-expired-sessions'
);