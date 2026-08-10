CREATE INDEX "Session_expires_idx" ON "Session"("expires");

DO $$
BEGIN
	IF current_database() = current_setting('cron.database_name', true) THEN
		CREATE EXTENSION IF NOT EXISTS pg_cron;

		PERFORM cron.schedule(
			'cleanup-expired-sessions',
			'0 * * * *',
			$job$DELETE FROM "Session"
				WHERE "expires" IS NOT NULL
					AND "expires" <= CURRENT_TIMESTAMP$job$
		)
		WHERE NOT EXISTS (
			SELECT 1
			FROM cron.job
			WHERE jobname = 'cleanup-expired-sessions'
		);
	END IF;
END;
$$;