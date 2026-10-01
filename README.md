# EVE Healthcare — Diagnostic Booking API

A production-minded Node.js backend for managing diagnostic centres, tests, and patient appointment bookings. Built as an SDE Intern assignment.

---

## Features

- **Authentication** — JWT-based signup/login with bcrypt password hashing
- **Diagnostic Centres** — Full CRUD with pagination
- **Diagnostic Tests** — Full CRUD with M:N relationship to centres
- **Booking System** — Create, view, list, and cancel appointments with explicit state transitions
- **Simulated Payments** — Payment processing with 70% simulated success rate
- **Idempotent Webhook** — Safe to retry; database-enforced uniqueness prevents duplicate processing
- **Redis Caching** — Read-through cache for centres and tests with automatic invalidation
- **Redis-backed Rate Limiting** — Per-route limits on auth, payment, and webhook endpoints
- **Structured Logging** — Winston JSON logs with request IDs for tracing
- **Pagination** — All collection endpoints support `?page=N&limit=N`
- **Swagger UI** — Live API docs at `/api-docs`
- **Docker** — Single-command startup with `docker compose up --build`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express.js 4 |
| Database | PostgreSQL 16 + Prisma ORM |
| Cache/Queue | Redis 7 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| Logging | Winston |
| Testing | Jest + Supertest |
| Docs | Swagger UI (swagger-jsdoc) |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
src/
  app.js              # Express app (middleware, routes, Swagger)
  server.js           # HTTP server with graceful shutdown

  config/
    index.js          # Centralised environment config
    prisma.js         # Singleton Prisma client (switches DB for tests)
    redis.js          # Redis client with graceful degradation
    logger.js         # Winston structured logger
    swagger.js        # OpenAPI spec definition

  controllers/        # HTTP layer — validates, calls service, responds
  routes/             # Express routers with JSDoc OpenAPI annotations
  services/           # Business logic (auth, centres, tests, bookings, payments, cache)
  middleware/         # auth.js, errorHandler.js, rateLimiter.js, requestLogger.js
  validators/         # Zod schemas for each resource
  utils/              # asyncHandler, errors, response helpers, validation helpers

prisma/
  schema.prisma       # Data models, enums, indexes
  seed.js             # Seed data (2 users, 3 centres, 5 tests, 11 links)
  migrations/         # SQL migration files

tests/
  auth.test.js
  centres.test.js
  tests.test.js
  bookings.test.js
  payments.test.js
  helpers/
    db.js             # DB setup/teardown + factory functions
    auth.js           # JWT test token helpers

postman/
  EVE-Healthcare.postman_collection.json
  EVE-Healthcare.postman_environment.json
```

---

## Database Schema

### Models

```
User               — id, name, email (unique), passwordHash, timestamps
DiagnosticCentre   — id, name, location, timestamps
DiagnosticTest     — id, name, description, price (DECIMAL 10,2), timestamps
CentreTest         — id, centreId, testId (UNIQUE together), timestamps  [M:N join]
Booking            — id, userId, testId, centreId, appointmentDate, amount, status, timestamps
Payment            — id, bookingId, provider, providerPaymentId, eventId (unique), amount, status, metadata, timestamps
```

### Enums

```
BookingStatus: PENDING | CONFIRMED | FAILED | CANCELLED
PaymentStatus: PENDING | SUCCESS | FAILED
```

### Key Design Decisions

**Price capture at booking time** — `Booking.amount` is written from `DiagnosticTest.price` when the booking is created. Later price changes do not affect historical bookings.

**Payment relationship** — A booking can have multiple `Payment` records (retry attempts, webhook duplicates). However, the `eventId` column has a DB-level `UNIQUE` constraint that prevents duplicate payment records for the same webhook event. This is the correct model because you want an audit trail but not duplicate state mutations.

**CentreTest junction** — The M:N join table allows each centre to offer any subset of tests. A test's price is on `DiagnosticTest` (canonical), not the junction — one price per test globally. This was chosen for simplicity; the junction could hold a centre-specific price override if needed.

---

## Entity Relationships

```
User ──(1:N)──► Booking ──(N:1)──► DiagnosticTest
                   │                    │
                   └──(N:1)──► DiagnosticCentre
                   │
                   └──(1:N)──► Payment

DiagnosticCentre ──(M:N via CentreTest)──► DiagnosticTest
```

---

## Authentication Flow

1. `POST /api/auth/signup` — hash password with bcrypt (12 rounds), create user, return JWT
2. `POST /api/auth/login` — compare hash; constant-time check even for unknown emails to prevent timing attacks; return JWT
3. Protected routes — `authenticate` middleware extracts and verifies Bearer JWT; attaches `req.user = { id, email }`

JWT payload: `{ sub: userId, email, iat, exp }`

---

## Booking Flow

```
1. POST /api/bookings
   → verify test exists at centre (CentreTest lookup)
   → capture test price as booking.amount
   → create Booking with status=PENDING

2. POST /api/payments
   → verify booking belongs to authenticated user
   → simulate payment (70% success)
   → atomically create Payment + update Booking status
   → PENDING → CONFIRMED (success) or PENDING → FAILED (failure)

3. PATCH /api/bookings/:id/cancel
   → only PENDING or FAILED bookings can be cancelled
   → CONFIRMED bookings cannot be cancelled
```

### State Transitions

```
PENDING  ──► CONFIRMED  (successful payment)
PENDING  ──► FAILED     (payment failed)
PENDING  ──► CANCELLED  (user cancels)
FAILED   ──► CANCELLED  (user cleans up failed booking)

CONFIRMED → * (blocked — no cancellation after confirmation)
CANCELLED → * (blocked — terminal state)
```

---

## Payment Flow

```
POST /api/payments
  Body: { bookingId }
  Auth: Required (booking must belong to caller)
  
  Server derives: userId from JWT, amount from Booking.amount
  Never trusts client for amount, userId, or booking ownership.
  
  Returns Payment record with status: SUCCESS | FAILED
```

---

## Webhook Idempotency

This is the most security-critical part of the system.

### Strategy

1. **eventId** — The provider includes a unique `eventId` per event. This field has a `UNIQUE` constraint in the `Payment` table.
2. **Check before insert** — Fast path: if `eventId` already exists, return immediately without re-processing.
3. **Transaction** — Payment record creation and booking status update happen atomically in a single `$transaction`.
4. **Race condition handling** — Two concurrent requests for the same `eventId` will race to insert. The loser gets a `P2002` Prisma unique constraint error, which is caught and handled gracefully (returns 200 as if already processed).
5. **Non-PENDING bookings** — If a booking is already `CONFIRMED` or `FAILED` (from a previous successful webhook), the endpoint returns 200 without creating a new payment record.
6. **Return 200 for duplicates** — Returning 4xx for duplicate events causes providers to keep retrying. Returning 200 signals "received and understood".

```
First webhook (evt_123):
  → Insert Payment(eventId=evt_123) + update Booking → CONFIRMED
  → Return 200 { alreadyProcessed: false }

Second webhook (evt_123) — either sequential or concurrent:
  → Find existing Payment(eventId=evt_123) → return immediately
  → OR: race condition → P2002 on insert → catch and return
  → Return 200 { alreadyProcessed: true }
```

---

## Redis Caching Strategy

Caching is applied to read-heavy, public, non-sensitive data only.

| Cache Key | Data | TTL |
|---|---|---|
| `centre:{id}` | Single centre | 5 min |
| `centres:list:{page}:{limit}` | Paginated centre list | 5 min |
| `centre:{id}:tests:{page}:{limit}` | Tests at a centre | 5 min |
| `test:{id}` | Single test | 5 min |
| `tests:list:{page}:{limit}` | Paginated test list | 5 min |
| `test:{id}:centres:{page}:{limit}` | Centres offering a test | 5 min |

**Invalidation** — On create/update/delete, relevant specific keys and list pattern keys are deleted using `KEYS` + `DEL`.

**Graceful degradation** — All cache operations are wrapped in `try/catch`. If Redis is down, requests hit the database without error.

**Not cached** — Booking and payment data (private, user-specific).

---

## Rate Limiting

| Route group | Window | Limit |
|---|---|---|
| Global | 15 min | 100 req/IP |
| Auth (`/auth/*`) | 15 min | 10 req/IP |
| Payments & Webhook | 15 min | 20 req/IP |

- Uses `rate-limit-redis` for Redis-backed counters (shared across instances)
- Falls back to in-memory store if Redis is unavailable
- Disabled in test environment to avoid interfering with test assertions

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Register new user |
| POST | `/api/auth/login` | — | Login, get JWT |
| GET | `/api/centres` | — | List centres (paginated) |
| POST | `/api/centres` | ✓ | Create centre |
| GET | `/api/centres/:id` | — | Get centre |
| PATCH | `/api/centres/:id` | ✓ | Update centre |
| DELETE | `/api/centres/:id` | ✓ | Delete centre |
| GET | `/api/centres/:id/tests` | — | List tests at centre |
| GET | `/api/tests` | — | List tests (paginated) |
| POST | `/api/tests` | ✓ | Create test |
| GET | `/api/tests/:id` | — | Get test |
| PATCH | `/api/tests/:id` | ✓ | Update test |
| DELETE | `/api/tests/:id` | ✓ | Delete test |
| POST | `/api/tests/:id/centres` | ✓ | Link test to centre |
| DELETE | `/api/tests/:id/centres/:centreId` | ✓ | Unlink test from centre |
| GET | `/api/tests/:id/centres` | — | List centres offering test |
| POST | `/api/bookings` | ✓ | Create booking |
| GET | `/api/bookings` | ✓ | List my bookings |
| GET | `/api/bookings/:id` | ✓ | Get booking |
| PATCH | `/api/bookings/:id/cancel` | ✓ | Cancel booking |
| POST | `/api/payments` | ✓ | Initiate payment |
| POST | `/api/payments/webhook` | — | Payment webhook (idempotent) |
| GET | `/api-docs` | — | Swagger UI |
| GET | `/health` | — | Health check |

---

## Local Setup

### Prerequisites

- Node.js 22+
- PostgreSQL 16 running on port 5432
- Redis running on port 6379
- (Or use Docker Compose — see below)

### Steps

```bash
# Clone the repo
git clone <repo-url>
cd eve-healthcare

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your DB credentials

# Run migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed

# Start the server
npm run dev
```

The API will be available at `http://localhost:3000`.
Swagger UI at `http://localhost:3000/api-docs`.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environment |
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `TEST_DATABASE_URL` | — | PostgreSQL connection string for tests |
| `JWT_SECRET` | — | **Change this in production** |
| `JWT_EXPIRES_IN` | `7d` | JWT TTL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `100` | Global max requests per window |
| `AUTH_RATE_LIMIT_MAX` | `10` | Auth endpoint max requests |
| `PAYMENT_RATE_LIMIT_MAX` | `20` | Payment endpoint max requests |
| `CACHE_TTL_CENTRES` | `300` | Centre cache TTL (seconds) |
| `CACHE_TTL_TESTS` | `300` | Test cache TTL (seconds) |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |

---

## Seed Credentials

> **For local development only. Never use in production.**

| Email | Password | Name |
|---|---|---|
| alice@eve.health | DevPass1 | Alice Sharma |
| bob@eve.health | DevPass1 | Bob Mehta |

Seeded centres: Apollo Diagnostics (Andheri), Metropolis Healthcare (Bandra), SRL Diagnostics (Pune)

Seeded tests: CBC, Lipid Profile, HbA1c, TFT, Vitamin D

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

Tests use the `TEST_DATABASE_URL` database. They clean up after themselves via `beforeAll`/`afterAll` hooks.

**Coverage:** 70 tests across 5 suites — auth, centres, tests, bookings, payments/webhooks.

---

## Prisma Commands

```bash
# Apply migrations
npx prisma migrate deploy

# Create new migration (dev)
npx prisma migrate dev --name describe_change

# Seed database
npx prisma db seed

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

---

## Docker Setup

```bash
# Start everything (API + PostgreSQL + Redis)
docker compose up --build

# Run migrations (handled by the 'migrate' service)
# Seeds must be run manually after startup:
docker compose exec api npx prisma db seed

# Stop everything
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

The `migrate` service runs `prisma migrate deploy` and exits before the `api` service starts (dependency chain via `depends_on: condition: service_healthy`).

---

## Postman Collection

Import both files into Postman:

- `postman/EVE-Healthcare.postman_collection.json` — All requests with test scripts
- `postman/EVE-Healthcare.postman_environment.json` — Variable definitions

**Usage:** Run requests from top to bottom. Signup/Login automatically saves `accessToken`. Create operations save `centreId`, `testId`, `bookingId` automatically via test scripts.

---

## Error Response Format

All errors use this consistent shape:

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_NOT_FOUND",
    "message": "Booking not found"
  }
}
```

Validation errors include a `details` array:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email address" }
    ]
  }
}
```

---

## Important Assumptions

1. **Authentication is open to all users** — any signed-up user can create centres and tests. In a real product, an admin role would gate these mutations.
2. **Payment simulation** — The simulated provider uses 70% success rate. The `POST /api/payments` endpoint and `POST /api/payments/webhook` are both present — in a real integration, only the webhook would drive booking state changes.
3. **Single price per test** — Price lives on `DiagnosticTest`, not `CentreTest`. This means all centres charge the same price for the same test. The design could be extended with a `price` on `CentreTest` for per-centre pricing.
4. **Appointment dates** — Only validated to be in the future at creation time. No slot/availability system is implemented.

---

## Edge Cases Handled

- Duplicate email on signup → 409
- Wrong password → 401 (constant-time to prevent timing attacks)
- Missing/expired/invalid JWT → 401
- Creating booking for test not offered at selected centre → 400
- Creating booking in the past → 422
- Accessing another user's booking → 403
- Cancelling a CONFIRMED booking → 400 (state machine)
- Paying for a non-PENDING booking → 400
- Paying for another user's booking → 403
- Duplicate webhook event (sequential) → 200, no duplicate payment
- Concurrent duplicate webhook (race condition) → 200, one payment via DB unique constraint
- Unknown booking in webhook → 404
- Invalid webhook payload → 422

---

## Bonus Features Implemented

- ✅ Redis caching (centres, tests, centre-test relationships)
- ✅ Redis-backed rate limiting (auth, payment, webhook routes)
- ✅ Structured logging (Winston, request IDs, JSON in prod)
- ✅ Pagination (all collection endpoints)
- ✅ Webhook idempotency with race-condition safety

---

## What Could Be Improved with More Time

1. **Admin roles** — Gate centre/test mutation behind an admin flag
2. **Per-centre pricing** — Add `price` to `CentreTest` junction for centre-specific overrides
3. **Appointment slot availability** — Prevent double-booking the same test/centre/time
4. **Webhook signature verification** — In production, verify HMAC signatures from the provider
5. **Outbox pattern** — For stronger at-least-once delivery guarantees
6. **Soft deletes** — Preserve historical data when centres/tests are deleted
7. **Refresh tokens** — Shorter-lived access tokens with refresh flow
8. **Integration test isolation** — Use `pg-mem` or transaction rollback instead of table truncation
9. **OpenTelemetry** — Distributed tracing for multi-service setups
10. **Input sanitisation** — Though Prisma prevents SQL injection, HTML escaping for display contexts
