# RoutR

A fullstack route planning and trip tracking application. Users create trips with multiple ordered waypoints, visualize routes on an interactive Deck.GL map, and track real-time status as waypoints are completed via Server-Sent Events.

> 🚧 Currently in development — backend in progress (Phase 2/10)

---

## Tech Stack

### Backend
- **Kotlin** + **Spring Boot 3.3.x** — REST API
- **PostgreSQL** (Neon) — database
- **Flyway** — schema migrations
- **Spring Security 6** — Clerk JWT verification via JWKS
- **SSE** (`SseEmitter`) — real-time status streaming
- **Deployed on Railway**

### Frontend _(Phase 7+)_
- **Next.js 15** App Router
- **TypeScript** + **Tailwind CSS**
- **Clerk** — authentication
- **TanStack Query** — data fetching
- **Deck.GL** + **MapLibre GL** — interactive map
- **Deployed on Vercel**

---

## Architecture

```
Browser (Next.js — Vercel)
  └── Clerk JWT → Authorization header
  └── TanStack Query → REST calls
  └── Deck.GL map
  └── SSE subscription (live updates)
        │ HTTPS
Kotlin Spring Boot (Railway)
  └── Spring Security verifies Clerk JWT
  └── Controller → Facade → Service → Repository
  └── SseEmitter → /events endpoint
        │ JDBC
PostgreSQL (Neon)
  └── Flyway migrations
```

---

## API Endpoints

All endpoints require `Authorization: Bearer <clerk-jwt>` except `/actuator/health`.

```
GET    /actuator/health
GET    /api/trips
POST   /api/trips
GET    /api/trips/{id}
PUT    /api/trips/{id}
DELETE /api/trips/{id}
POST   /api/trips/{id}/start
POST   /api/trips/{id}/complete
POST   /api/trips/{id}/cancel
POST   /api/trips/{id}/waypoints
PUT    /api/trips/{id}/waypoints/{wid}
DELETE /api/trips/{id}/waypoints/{wid}
PUT    /api/trips/{id}/waypoints/reorder
POST   /api/trips/{id}/waypoints/{wid}/arrive
POST   /api/trips/{id}/waypoints/{wid}/skip
GET    /api/trips/{id}/events              (SSE)
```

---

## Local Development

### Prerequisites
- Java 21 (via SDKMAN: `sdk install java 21-tem`)
- Neon PostgreSQL account
- Clerk account

### Backend Setup
1. Clone the repo
2. Create `backend/src/main/resources/application-local.yml`:
   ```yaml
   spring:
     datasource:
       url: postgresql://<neon-connection-string>/routr?sslmode=require
     security:
       oauth2:
         resourceserver:
           jwt:
             jwk-set-uri: https://<clerk-domain>/.well-known/jwks.json
             issuer-uri: https://<clerk-domain>
   ```
3. Run the server:
   ```bash
   cd backend
   ./gradlew bootRun --args='--spring.profiles.active=local'
   ```
4. Verify: `curl http://localhost:8080/actuator/health` → `{"status":"UP"}`

### Frontend Setup _(Phase 7+)_
```bash
cd frontend
pnpm install
pnpm dev
```

---

## Git Workflow

GitHub Flow — `main` is always deployable.

- `feat/<description>` — new features
- `fix/<description>` — bug fixes
- `chore/<description>` — config, tooling
- All changes via PR → squash merge → delete branch

---

## v1 Constraints

- No geocoding (lat/lng entered manually)
- No road-following routes (straight lines between waypoints)
- No multi-user sharing
- No route optimization
