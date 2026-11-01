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

Run both test projects with `pnpm test`, or only the database-independent Node
unit tests with `pnpm run test:unit`. Run only integration tests with
`pnpm run test:integration`. All projects share `vitest.config.ts`, without
loading the React Router RSC plugins. Unit tests mock database and authentication
dependencies; they do not verify the RSC transport or session middleware.

The default Vitest configuration registers named `unit` and `integration`
projects so the VS Code Vitest extension can discover both. Refresh the test
explorer or reload the VS Code window after changing the configuration.
Running all tests requires `TEST_DATABASE_URL`; selecting only `unit` does not.

### Coverage

Run `pnpm run test:coverage` for both projects, or
`pnpm run test:integration:coverage` for integration coverage only. Both commands
write HTML and LCOV reports to `coverage/all`, replacing the previous report.
For unit coverage only, run `pnpm run test:coverage --project unit`.
V8 measures application TypeScript/TSX, including untested files, but not
PostgreSQL SQL functions. Generated reports are ignored by Git. No minimum
coverage threshold is enforced yet.

### Integration Database

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
lookup. Event fixtures are rolled back in a transaction; concurrent order tests
create committed fixtures and delete their own records in teardown. Use an otherwise idle database: pagination assertions
assume no concurrent event inserts. PostgreSQL sequences can still advance
after rollback. Missing `TEST_DATABASE_URL` fails explicitly rather than
silently skipping the suite.

## Order Matching MVP

Apply migrations before generating typed SQL or running the application:

```bash
pnpm exec prisma migrate deploy
pnpm run typegen
```

The authenticated `submitOrder` server function accepts `eventId` and `choiceId`
as bigint, `side` (`BUY` or `SELL`), integer `price` (0 to 1000), positive bigint
`quantity`, and a nonempty `idempotencyKey` of at most 128 characters. The user
ID comes from the session, not request data. Returned IDs and quantities are
bigint; use the existing JSON codec if passing results through JSON.

PostgreSQL `submit_order` owns the entire atomic operation. A transaction-level
advisory lock serializes submissions for each choice. Compatible orders match
in best-price order, then insertion order (ID), at the resting order's price.
Matching continues until the incoming quantity is filled or no compatible
order remains. `OPEN` and `PARTIALLY_FILLED` orders with remaining quantity are
the queue; no worker is required. Self-trading is allowed.

Keys are unique per user. Retrying identical parameters returns the current
order, including after the event closes; reusing a key with different parameters
fails. New orders are rejected after the event deadline. Order status and
remaining quantity are protected by database checks; trades record each fill
and `Choice.lastPrice` is only a display cache. Application submissions must use
the function, not direct order writes. No balances, holdings, settlement,
cancellation, or public order UI are implemented, so SELL does not prove asset
ownership. This is an order-matching ledger, not a funded trading system.

Order integration tests cover price/time priority, partial and multi-fill
matching, concurrent submissions, idempotency, deadlines, and authentication.

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
