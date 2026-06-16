# RoutR — Design Spec

**Date:** 2026-06-16
**Stack:** Kotlin Spring Boot 3.x · Next.js 15 · PostgreSQL (Neon) · Clerk auth · Deck.GL

---

## What We're Building

A fullstack route planning and trip tracking app. Users create trips with ordered waypoints, visualize routes on an interactive Deck.GL map, and track real-time status as waypoints are completed. Status changes stream to the UI via Server-Sent Events without a page refresh.

---

## Architecture

```
Browser (Next.js 15 — Vercel)
  Clerk session → JWT in Authorization header
  TanStack Query hooks → REST calls to backend
  Deck.GL map
  SSE subscription for live updates
        │ HTTPS
Kotlin Spring Boot 3.x (Railway)
  Spring Security 6 verifies Clerk JWT via JWKS
  Controller → Facade → Service → Repository
  SseEmitter for /events endpoint
        │ JDBC
PostgreSQL (Neon)
  Migrations managed by Flyway
```

---

## Implementation Approach

Option C (DB-first, then incremental backend, then frontend) was chosen because:
- The developer has some Java background but is new to backend concepts
- SQL basics are known but schema design is new — understanding the data model first makes the Spring Boot code easier to follow
- Backend is fully built and tested before frontend begins

---

## Phase 0 — Dev Environment

**Goal:** Everything installed and accounts created before writing a line of app code.

**Checklist:**
- Java 21 JDK via SDKMAN (`sdk install java 21-tem`)
- Cursor extensions: Kotlin (fwcd), Extension Pack for Java (Microsoft), Spring Boot Extension Pack (VMware), SQLTools + PostgreSQL driver
- Neon account — create a `routr` database, save the connection string
- Clerk account — save publishable key, secret key, JWKS URL, issuer URI
- Postman or Bruno for manual API testing

---

## Phase 1 — Database Design & ERD

**Goal:** Understand the full data model, write the 3 migration files, verify tables exist in Neon.

### Entity Relationship

```
trips (1) ──── (many) waypoints
trips (1) ──── (many) status_events
waypoints (1) ── (0 or 1) status_events   ← some events reference a waypoint, some don't
```

### Why Each Table Exists

**trips** — the top-level entity. Belongs to one user (Clerk user ID stored as text). Has a status that follows a state machine: `DRAFT → ACTIVE → COMPLETED | CANCELLED`.

**waypoints** — ordered stops within a trip. Each has coordinates (lat/lng), a display address, and a status (`PENDING → ARRIVED | SKIPPED`). The `order` integer column defines user-defined sequence. `ON DELETE CASCADE` from trips — delete a trip, waypoints go with it.

**status_events** — immutable audit log. Every state change (trip started, waypoint arrived, etc.) writes one row. Never updated or deleted. References both a trip (always) and optionally a waypoint.

### Key Design Decisions

| Decision | Reason |
|---|---|
| UUID primary keys | Unguessable; safe to generate without coordination |
| Postgres enum types for status | DB enforces only valid values can be stored |
| `order` INTEGER on waypoints | Simple, explicit user-defined sequence; easy to reorder by updating integers |
| `ON DELETE CASCADE` on waypoints | Deleting a trip cleans up all related rows automatically |
| `ON DELETE SET NULL` on status_events.waypoint_id | Preserve event history even if a waypoint is deleted |
| Indexes on `user_id`, `trip_id` | These are the most common WHERE/JOIN columns |

### Migration Files

Three Flyway SQL files in `backend/src/main/resources/db/migration/`:
- `V1__create_trips.sql` — trips table + trip_status enum + index on user_id
- `V2__create_waypoints.sql` — waypoints table + waypoint_status enum + index on trip_id
- `V3__create_status_events.sql` — status_events table + event_type enum + index on trip_id

**Deliverable:** Connect SQLTools to Neon, run migrations, confirm 3 tables exist with correct columns and constraints.

---

## Phase 2 — Spring Boot Project Setup

**Goal:** Spring Boot boots, connects to Neon, health endpoint returns 200.

- Generate project at `start.spring.io`: Web, Data JPA, Security, OAuth2 Resource Server, Validation, Actuator, Flyway, PostgreSQL
- Write `build.gradle.kts` with all dependencies
- Write `application.yml` — datasource points to Neon, Flyway enabled, Hibernate on `validate` mode (Flyway owns the schema, Hibernate only checks it matches)
- Configure Clerk JWT verification in `SecurityConfig.kt` (JWKS URL from env var)
- `GET /actuator/health` returns 200 without auth — first working endpoint

---

## Phase 3 — Kotlin + JPA Entities

**Goal:** Write the 3 entity classes that map to the tables from Phase 1. Learn how JPA annotations connect Kotlin code to DB columns.

**Key Kotlin concepts to cover:**
- `class` vs `data class` — JPA entities use plain `class` (mutability needed)
- Nullable types: `String?` vs `String` maps directly to nullable vs NOT NULL columns
- Default parameter values: `= Instant.now()`, `= UUID.randomUUID()`
- `@Enumerated(EnumType.STRING)` — stores enum name as text, not ordinal integer

**Entities:** `Trip`, `Waypoint`, `StatusEvent` + their enum types (`TripStatus`, `WaypointStatus`, `StatusEventType`)

---

## Phase 4 — Trip CRUD

**Goal:** Full CRUD for trips working end-to-end, tested in Postman.

**Layer pattern (learn this once, repeat it):**

```
TripController   — receives HTTP, validates input, calls Facade or Service, returns ResponseEntity
TripFacade       — orchestrates multiple services; owns @Transactional for cross-service ops
TripService      — business logic; enforces ownership (userId filter on every query)
TripRepository   — Spring Data JPA interface; data access only
```

**Concepts covered:**
- DTOs: why the API shape differs from the entity (don't expose internal fields; shape responses for clients)
- Extension functions for mapping: `Trip.toResponse()` lives in `TripMappings.kt`, not inside the entity
- `AppException` sealed class — typed errors that map to HTTP status codes
- `@RestControllerAdvice` — catches exceptions globally, returns RFC 9457 ProblemDetail JSON
- Ownership guard: every query includes `userId` so users can only see their own trips

**Endpoints:** `GET /api/trips`, `POST /api/trips`, `GET /api/trips/{id}`, `PUT /api/trips/{id}`, `DELETE /api/trips/{id}`

---

## Phase 5 — Waypoint CRUD

**Goal:** Full CRUD for waypoints using the same pattern learned in Phase 4.

Same layer structure as Phase 4. One new endpoint: `PUT /api/trips/{id}/waypoints/reorder` — accepts an ordered list of waypoint UUIDs, updates the `order` integer on each in a single transaction.

**Endpoints:** `POST /api/trips/{id}/waypoints`, `PUT /api/trips/{id}/waypoints/{wid}`, `DELETE /api/trips/{id}/waypoints/{wid}`, `PUT /api/trips/{id}/waypoints/reorder`

---

## Phase 6 — Trip Actions + SSE

**Goal:** State transitions work with validation, events are recorded, SSE streams them to clients.

**State machine** (enforced in `TripService.transitionStatus`):
```
DRAFT → ACTIVE      (start trip)
DRAFT → CANCELLED
ACTIVE → COMPLETED  (complete trip)
ACTIVE → CANCELLED
```
Any other transition throws `AppException.InvalidState`.

**StatusEvent recording:** Every valid transition writes one immutable row to `status_events`. `StatusEventService` handles this — called from `TripFacade` after the status change is saved.

**SSE:** `SseController` opens a `SseEmitter` per client connection. A background task polls `status_events` every 2 seconds for rows newer than the last seen ID and streams them. Simple polling — no Postgres NOTIFY needed for v1.

**Endpoints:** `POST /api/trips/{id}/start`, `POST /api/trips/{id}/complete`, `POST /api/trips/{id}/cancel`, `POST /api/trips/{id}/waypoints/{wid}/arrive`, `POST /api/trips/{id}/waypoints/{wid}/skip`, `GET /api/trips/{id}/events` (SSE)

---

## Phase 7 — Frontend Setup

**Goal:** Next.js app running, Clerk auth working, API helper attaches JWT to every request.

- `pnpm create next-app frontend --typescript --tailwind --app`
- Install and configure Clerk (`@clerk/nextjs`)
- Write `src/lib/api.ts` — server-side and client-side fetch wrappers that attach `Authorization: Bearer <clerk-token>`
- Sign-in / sign-up routes via Clerk's catch-all pages
- Protected dashboard layout using Clerk middleware

---

## Phase 8 — Trip + Waypoint UI

**Goal:** Full trip and waypoint management in the browser, no map yet.

- TanStack Query hooks: `useTrips`, `useTrip`, `useTripMutations`, `useWaypointMutations`
- Pages: `/trips` (list + create button), `/trips/new` (form), `/trips/[id]` (detail + waypoint list)
- Components: `TripCard`, `TripList`, `TripForm`, `WaypointList`, `WaypointItem`, `WaypointForm`
- End-to-end test: create trip in UI, confirm row appears in Neon via SQLTools

---

## Phase 9 — Deck.GL Map

**Goal:** Interactive map on the trip detail page showing route and waypoint status.

- Install `deck.gl`, `@deck.gl/react`, `react-map-gl`, `maplibre-gl`
- `TripMap.tsx` — MapLibre base layer + Deck.GL overlay
- `PathLayer` — polyline connecting waypoints in order
- `ScatterplotLayer` — markers colored by status (pending=blue, arrived=green, skipped=gray)
- `TextLayer` — order numbers on markers
- Auto-fit viewport to bounding box of all waypoints on load
- Click marker → open waypoint detail drawer

---

## Phase 10 — Real-time + Polish

**Goal:** Status changes update the map live; app deployed and publicly accessible.

- `useTripEvents` hook — `EventSource` subscribes to `/api/trips/{id}/events`, invalidates TanStack Query cache on each event
- `WaypointStatusButton` — "Arrive" / "Skip" with optimistic updates
- Trip control bar — Start / Complete / Cancel (visible based on `trip.status`)
- Responsive layout (mobile: map collapses to top)
- Loading skeletons, error boundaries
- Deploy backend to Railway, frontend to Vercel
- README with live URL and screenshot

---

## Constraints (v1)

- No geocoding — lat/lng entered manually, address is display-only
- No road-following routes — straight lines between waypoints
- No push notifications — SSE only
- Single-user trips only — no sharing or collaboration
- No route optimization — user-defined order
- SSE uses polling (2s interval), not Postgres NOTIFY
- Spring MVC (not WebFlux) — SseEmitter sufficient for this scale
- No Docker in dev — run Spring Boot via `./gradlew bootRun`, use Neon for DB

---

## Definition of Done (v1)

- User can sign up, create a trip, add ordered waypoints with coordinates
- Trip detail shows an interactive Deck.GL map with markers and polylines
- User can start a trip, mark waypoints arrived/skipped, complete the trip
- Status changes update the map in real-time via SSE without page refresh
- Optimistic updates make status changes feel instant
- Backend on Railway, frontend on Vercel, both publicly accessible
- README has live link and screenshot
