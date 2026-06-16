# RoutR

Fullstack route planning and trip tracking app.
**Backend:** Kotlin Spring Boot 3.x → Railway | **Frontend:** Next.js 15 App Router → Vercel | **DB:** PostgreSQL (Neon) | **Auth:** Clerk

---

## Monorepo Structure

```
backend/    Kotlin Spring Boot REST API
frontend/   Next.js 15 App Router (Phase 7+)
docs/       Design specs and implementation plans
```

---

## Commands

### Backend (`cd backend/`)
- Dev server: `./gradlew bootRun --args='--spring.profiles.active=local'`
- All tests: `./gradlew test`
- Single test: `./gradlew test --tests "com.routr.<package>.<TestClass>"`
- Build jar: `./gradlew bootJar`
- Dependency tree: `./gradlew dependencies`

### Frontend (`cd frontend/`) — Phase 7+
- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Type check: `pnpm tsc --noEmit`

---

## Git & Branch Strategy

**GitHub Flow** — `main` is always deployable. No `develop` branch.

### Branch Naming
| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<description>` | `feat/phase-1-db-migrations` |
| Bug fix | `fix/<description>` | `fix/trip-status-transition` |
| Config/tooling | `chore/<description>` | `chore/add-dockerfile` |
| Docs | `docs/<description>` | `docs/update-readme` |

### Rules — NEVER break these
- **Never commit directly to `main`**
- Every change: `branch → PR → merge → delete branch`
- Always branch off latest `main`
- One concern per branch (one phase = one branch)

### Commit Messages (Conventional Commits)
```
feat: add trip CRUD endpoints
fix: correct waypoint order assignment
chore: configure Railway deployment
test: add TripService unit tests
docs: add backend implementation plan
```

### PR Convention
- Title: conventional commit format (`feat: phase 1 — DB migrations`)
- Body: what changed and why (English)
- Squash merge preferred to keep history linear

---

## Backend Architecture

**Layer order — never skip layers:**
```
Controller → Facade → Service → Repository
```

| Layer | Rule |
|---|---|
| Controller | HTTP only — receives request, calls facade/service, returns ResponseEntity. Zero business logic. |
| Facade | Orchestration only — coordinates multiple services. Owns `@Transactional` for cross-service ops. |
| Service | Business logic — enforces ownership (`userId` on every query), throws `AppException` for violations. |
| Repository | Data access only — Spring Data JPA interfaces. |

**Ownership guard:** Every service method that accesses data by ID must also filter by `userId`. No exceptions.

**Error handling:** Throw `AppException` subclasses (`NotFound`, `Forbidden`, `InvalidState`, etc.). `GlobalExceptionHandler` converts these to RFC 9457 `ProblemDetail` JSON automatically.

**Mapping:** Entity → DTO conversions live in `*Mappings.kt` as top-level extension functions. Never put mapping logic inside an entity.

---

## Backend Code Style (Kotlin)

- Plain `class` for JPA entities (not `data class` — avoids lazy-load issues with `equals`/`hashCode`)
- Nullable types (`String?`) map to nullable DB columns; non-null (`String`) map to `NOT NULL`
- `@Enumerated(EnumType.STRING)` always — never store ordinals
- Quote reserved SQL keywords in `@Column(name = "\`order\`")`
- Extension functions over utility classes

---

## Environment Variables

### Backend — `backend/src/main/resources/application-local.yml` (gitignored)
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

### Backend — Railway env vars (production)
- `DATABASE_URL`, `CLERK_JWKS_URL`, `CLERK_ISSUER_URI`, `FRONTEND_URL`

### Frontend — `frontend/.env.local` (Phase 7+)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_BACKEND_URL`, `BACKEND_URL`
- `NEXT_PUBLIC_MAPTILER_KEY`

---

## Testing Rules

- Write tests **before** implementation (TDD) for all Service layer code
- MockK for mocking — never Mockito
- Run `./gradlew test` before every commit on backend
- No business logic without a unit test — no merge without tests passing

---

## v1 Constraints (do not implement)

No geocoding · no road-following routes · no push notifications · no multi-user sharing · no route optimization · SSE uses polling (no Postgres NOTIFY) · Spring MVC not WebFlux · no Docker in dev

---

## Reference

- Design spec: `@docs/superpowers/specs/2026-06-16-routr-design.md`
- Backend plan: `@docs/superpowers/plans/2026-06-16-routr-backend.md`
