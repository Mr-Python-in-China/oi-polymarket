# Welcome to React Router! (Experimental RSC)

⚠️ **EXPERIMENTAL**: This template demonstrates React Server Components with React Router. This is experimental technology and not recommended for production use.

A modern template for exploring React Server Components (RSC) with React Router, powered by Vite.

## Features

- 🧪 **Experimental React Server Components**
- 🚀 Server-side rendering with RSC
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization with Vite
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)
- 📚 [React Server Components guide](https://reactrouter.com/how-to/react-server-components)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:12968`.

## Tests

Run the database-independent Node unit tests with `pnpm test` (or
`pnpm run test:unit`). The dedicated Vitest configuration does not load the
React Router RSC plugins. Tests cover JSON/OAuth state codecs, pagination,
authorization, and event validation. Database and authentication dependencies
are mocked; these tests do not verify the RSC transport or session middleware.

Rebuild the development container after updating its Compose configuration.
It uses the existing PostgreSQL `db` service for both `oi-polymarket` and
`oi-polymarket-test`, and sets `TEST_DATABASE_URL` automatically. The dev
container's `postStartCommand` creates the test database only if it does not
exist, including with existing data volumes. Only the `dev` and `db` services
are needed. Both databases persist in `db_data`; existing development data
is not reset. They share the local development account, so this is database
separation, not permission isolation.

Outside the dev container, export `TEST_DATABASE_URL` pointing to a dedicated
PostgreSQL test database, different from the application's `DATABASE_URL`.
After installing dependencies and generating the Prisma client through the
normal project setup, run:

```bash
pnpm run test:integration
```

The integration global setup automatically applies migrations using only the
test URL; it never resets or drops a database. Integration tests use the real database and mock only the authenticated-user
lookup. Fixtures are created in a transaction and rolled back, including on
assertion failures. Use an otherwise idle database: pagination assertions
assume no concurrent event inserts. PostgreSQL sequences can still advance
after rollback. Missing `TEST_DATABASE_URL` fails explicitly rather than
silently skipping the suite.

## Building for Production

Create a production build:

```bash
npm run build
```

## Running Production Build

Run the production server:

```bash
npm start
```

## Session Cleanup

Sessions are stored in PostgreSQL. A session with a non-null `expires` value is
removed automatically when that value is in the past. The cleanup job runs
once per hour through PostgreSQL `pg_cron`; sessions with `expires IS NULL` are
treated as non-expiring.

### Development Container

The development container builds `.devcontainer/postgres.Dockerfile`, which
installs `pg_cron` and loads it with `shared_preload_libraries`. Applying the
Prisma migrations creates both the extension and the
`cleanup-expired-sessions` job. The job runs at the start of every hour in UTC.

After pulling this configuration into an existing development environment,
rebuild and recreate only the database container so the new image is used,
then apply the pending migration:

```bash
docker compose -f .devcontainer/docker-compose.yml build db
docker compose -f .devcontainer/docker-compose.yml up -d db
pnpm exec prisma migrate deploy
```

The existing `db_data` volume can be kept. Delete it only when resetting local
database data is acceptable:

```bash
docker compose -f .devcontainer/docker-compose.yml down -v
```

### Production PostgreSQL

The production database administrator must install and enable the `pg_cron`
extension. The exact package name depends on the PostgreSQL distribution; for
PostgreSQL 18 on Debian/Ubuntu it is commonly `postgresql-18-cron`.

1. Add `pg_cron` to `shared_preload_libraries` in `postgresql.conf` and set
   `cron.database_name` to the application database.
2. Restart PostgreSQL.
3. Apply the Prisma migrations as a user allowed to create extensions and
   schedule cron jobs. The migration creates `pg_cron`, the `Session.expires`
   index, and the cleanup job:

```bash
pnpm exec prisma migrate deploy
```

Use `SELECT * FROM cron.job;` to verify the schedule and
`SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;` to
inspect recent runs. Ensure the role used by `pg_cron` can connect to the
application database and delete rows from `"Session"`.

If enabling extensions is not possible, configure the host's system cron or
the hosting provider's scheduled job to execute the same `DELETE` statement
with `psql` once per hour. Do not use an in-process Node.js timer as the only
production scheduler, because it is not reliable across restarts and multiple
application instances.

## Understanding React Server Components

Learn more about React Server Components with React Router in our [comprehensive guide](https://reactrouter.com/how-to/react-server-components).

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
