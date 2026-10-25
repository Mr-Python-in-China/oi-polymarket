SELECT 'CREATE DATABASE "oi-polymarket-test"'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'oi-polymarket-test'
)
\gexec