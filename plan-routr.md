# routr — Implementation Plan

## What This Is

A fullstack route planning and trip tracking application. Users create trips with multiple ordered waypoints, visualize routes on an interactive Deck.GL map, and track real-time status as waypoints are completed.

**Stack split:**
- **Frontend:** Next.js 15 App Router (deployed to Vercel)
- **Backend:** Kotlin Spring Boot 3.x REST API (deployed to Railway)
- **Database:** PostgreSQL (Neon)
- **Auth:** Clerk (JWT issued to frontend, verified by Spring Security on backend)

**Why Kotlin backend:** Demonstrates true fullstack capability (TypeScript frontend + Kotlin backend). Spring Boot 3 + Kotlin is production-grade and directly relevant to real enterprise work.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
│  Next.js 15 (Vercel)                                │
│  - Clerk session → JWT in Authorization header      │
│  - TanStack Query hooks → REST calls to backend     │
│  - Deck.GL map                                      │
│  - SSE subscription for live updates                │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────┐
│  Kotlin Spring Boot 3.x (Railway)                   │
│  - Spring Security 6 verifies Clerk JWT (JWKS)      │
│  - Controller → Facade → Service → Repository       │
│  - SseEmitter for /events endpoint                  │
└───────────────────────┬─────────────────────────────┘
                        │ JDBC
┌───────────────────────▼─────────────────────────────┐
│  PostgreSQL (Neon)                                  │
│  Migrations: Flyway                                 │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend

| Layer | Choice | Rationale |
|---|---|---|
| Language | Kotlin | Null-safety, data classes, extension functions, coroutine-ready |
| Framework | Spring Boot 3.3.x | Industry standard, Kotlin first-class support |
| Build | Gradle (Kotlin DSL) | Type-safe build scripts |
| API | Spring MVC + `@RestController` | Simpler than WebFlux for this CRUD-heavy API |
| ORM | Spring Data JPA + Hibernate | Standard, Kotlin-compatible |
| DB migration | Flyway | SQL-based, version-controlled |
| Security | Spring Security 6 (OAuth2 Resource Server) | Clerk JWT verification via JWKS |
| Validation | Jakarta Bean Validation (`@field:NotBlank`, etc.) | Declarative, integrated with Spring |
| Error handling | RFC 9457 ProblemDetail + `@RestControllerAdvice` | Modern standard, built into Spring Boot 3 |
| SSE | `SseEmitter` (Spring MVC) | Simple, sufficient for low-concurrency v1 |
| Testing | JUnit 5 + MockK + Testcontainers | Kotlin-idiomatic mocking |

### Frontend

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 App Router | Server Components, familiar |
| Language | TypeScript | End-to-end type safety |
| Auth | Clerk | Best DX for Next.js; JWT passed to backend |
| Data fetching | TanStack Query v5 | Caching, optimistic updates, invalidation |
| Forms | react-hook-form + Zod | Consistent with existing skills |
| Map | Deck.GL + MapLibre GL | Deck.GL for data layers, MapLibre for free tiles |
| Styling | Tailwind CSS v4 | Utility-first |
| State | Zustand | Map viewport + UI state |
| Real-time | SSE (`EventSource`) | Subscribes to backend `/events` endpoint |
| Deployment | Vercel | Zero-config, free tier |

---

## Repository Structure

Monorepo with two independent projects:

```
routr/
├── backend/                        # Kotlin Spring Boot
│   ├── src/
│   │   ├── main/
│   │   │   ├── kotlin/com/routr/
│   │   │   │   ├── RoutrApplication.kt
│   │   │   │   ├── common/
│   │   │   │   │   ├── config/
│   │   │   │   │   │   ├── SecurityConfig.kt
│   │   │   │   │   │   └── CorsConfig.kt
│   │   │   │   │   └── exception/
│   │   │   │   │       ├── AppException.kt
│   │   │   │   │       └── GlobalExceptionHandler.kt
│   │   │   │   ├── trip/
│   │   │   │   │   ├── TripController.kt
│   │   │   │   │   ├── TripFacade.kt
│   │   │   │   │   ├── TripService.kt
│   │   │   │   │   ├── TripRepository.kt
│   │   │   │   │   ├── Trip.kt                 # JPA entity
│   │   │   │   │   ├── TripStatus.kt           # enum
│   │   │   │   │   ├── TripMappings.kt         # extension functions
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── CreateTripRequest.kt
│   │   │   │   │       ├── UpdateTripRequest.kt
│   │   │   │   │       └── TripResponse.kt
│   │   │   │   ├── waypoint/
│   │   │   │   │   ├── WaypointController.kt
│   │   │   │   │   ├── WaypointFacade.kt
│   │   │   │   │   ├── WaypointService.kt
│   │   │   │   │   ├── WaypointRepository.kt
│   │   │   │   │   ├── Waypoint.kt
│   │   │   │   │   ├── WaypointStatus.kt
│   │   │   │   │   ├── WaypointMappings.kt
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── CreateWaypointRequest.kt
│   │   │   │   │       ├── UpdateWaypointRequest.kt
│   │   │   │   │       ├── ReorderWaypointsRequest.kt
│   │   │   │   │       └── WaypointResponse.kt
│   │   │   │   └── event/
│   │   │   │       ├── StatusEvent.kt
│   │   │   │       ├── StatusEventType.kt
│   │   │   │       ├── StatusEventRepository.kt
│   │   │   │       ├── StatusEventService.kt
│   │   │   │       └── SseController.kt
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       ├── application-local.yml
│   │   │       └── db/migration/
│   │   │           ├── V1__create_trips.sql
│   │   │           ├── V2__create_waypoints.sql
│   │   │           └── V3__create_status_events.sql
│   │   └── test/kotlin/com/routr/
│   │       ├── trip/
│   │       │   ├── TripControllerTest.kt
│   │       │   └── TripServiceTest.kt
│   │       └── waypoint/
│   │           └── WaypointServiceTest.kt
│   ├── build.gradle.kts
│   └── Dockerfile
│
├── frontend/                       # Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── trips/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── edit/page.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   ├── TripMap.tsx
│   │   │   │   ├── RouteLayer.tsx
│   │   │   │   └── WaypointLayer.tsx
│   │   │   ├── trips/
│   │   │   │   ├── TripCard.tsx
│   │   │   │   ├── TripList.tsx
│   │   │   │   └── TripForm.tsx
│   │   │   ├── waypoints/
│   │   │   │   ├── WaypointList.tsx
│   │   │   │   ├── WaypointItem.tsx
│   │   │   │   ├── WaypointForm.tsx
│   │   │   │   └── WaypointStatusButton.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Drawer.tsx
│   │   │       └── Badge.tsx
│   │   ├── hooks/
│   │   │   ├── useTrips.ts
│   │   │   ├── useTrip.ts
│   │   │   ├── useTripMutations.ts
│   │   │   ├── useWaypointMutations.ts
│   │   │   └── useTripEvents.ts
│   │   ├── lib/
│   │   │   ├── api.ts              # Axios/fetch wrapper — attaches Clerk JWT
│   │   │   ├── geo.ts
│   │   │   └── cn.ts
│   │   ├── store/
│   │   │   └── map.store.ts
│   │   └── types/
│   │       ├── trip.ts
│   │       └── waypoint.ts
│   ├── .env.local
│   └── package.json
│
└── README.md
```

---

## Backend Architecture

### Layer Responsibilities

```
HTTP Request
    ↓
Controller        — Thin. Receives HTTP, validates input (@Valid), calls Facade or Service,
                    returns ResponseEntity. Never contains business logic.
    ↓
Facade            — Orchestration only. Calls multiple Services in the right order.
                    Owns @Transactional for cross-service operations.
                    Has no business logic of its own.
    ↓
Service           — Business logic. Enforces domain rules. Calls Repository.
                    Throws AppException for domain violations.
    ↓
Repository        — Data access only. Spring Data JPA interfaces + custom JPQL if needed.
    ↓
Entity/Domain     — JPA entities. No business logic inside entities for this project
                    (keeps it simple; full DDD not needed at this scale).
```

**When to use Facade vs direct Service call:**

| Operation | Layer | Reason |
|---|---|---|
| List trips | Controller → TripService | Single service, no orchestration |
| Get trip with waypoints | Controller → TripFacade | Joins TripService + WaypointService data |
| Start trip | Controller → TripFacade | Updates trip status AND writes StatusEvent |
| Arrive at waypoint | Controller → WaypointFacade | Updates waypoint AND writes StatusEvent |
| Create waypoint | Controller → WaypointService | Single service |

---

### JPA Entities

`trip/Trip.kt`:
```kotlin
@Entity
@Table(name = "trips")
class Trip(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    val userId: String,                // Clerk user ID (sub claim)

    @Column(nullable = false)
    var name: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: TripStatus = TripStatus.DRAFT,

    @OneToMany(mappedBy = "trip", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    @OrderBy("order ASC")
    val waypoints: MutableList<Waypoint> = mutableListOf(),

    @Column(nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now()
)

enum class TripStatus { DRAFT, ACTIVE, COMPLETED, CANCELLED }
```

`waypoint/Waypoint.kt`:
```kotlin
@Entity
@Table(name = "waypoints")
class Waypoint(
    @Id
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    val trip: Trip,

    @Column(name = "`order`", nullable = false)
    var order: Int,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var address: String,

    @Column(nullable = false, precision = 9, scale = 6)
    var lat: BigDecimal,

    @Column(nullable = false, precision = 9, scale = 6)
    var lng: BigDecimal,

    var estimatedArrival: Instant? = null,
    var actualArrival: Instant? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: WaypointStatus = WaypointStatus.PENDING,

    @Column(columnDefinition = "TEXT")
    var notes: String? = null,

    @Column(nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
)

enum class WaypointStatus { PENDING, ARRIVED, SKIPPED }
```

`event/StatusEvent.kt`:
```kotlin
@Entity
@Table(name = "status_events")
class StatusEvent(
    @Id
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    val trip: Trip,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "waypoint_id")
    val waypoint: Waypoint? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val type: StatusEventType,

    @Column(nullable = false)
    val occurredAt: Instant = Instant.now(),

    @Column(columnDefinition = "TEXT")
    val metadata: String? = null           // JSON string for optional extras
)

enum class StatusEventType {
    TRIP_STARTED, TRIP_COMPLETED, TRIP_CANCELLED,
    WAYPOINT_ARRIVED, WAYPOINT_SKIPPED
}
```

---

### DTOs and Mapping

`trip/dto/TripResponse.kt`:
```kotlin
data class TripResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val status: TripStatus,
    val waypoints: List<WaypointResponse>,
    val createdAt: Instant,
    val updatedAt: Instant
)
```

`trip/dto/CreateTripRequest.kt`:
```kotlin
data class CreateTripRequest(
    @field:NotBlank(message = "Name is required")
    @field:Size(max = 100)
    val name: String,

    @field:Size(max = 500)
    val description: String?
)
```

`waypoint/dto/CreateWaypointRequest.kt`:
```kotlin
data class CreateWaypointRequest(
    @field:NotBlank val name: String,
    @field:NotBlank val address: String,
    @field:DecimalMin("-90.0") @field:DecimalMax("90.0") val lat: BigDecimal,
    @field:DecimalMin("-180.0") @field:DecimalMax("180.0") val lng: BigDecimal,
    val estimatedArrival: Instant?,
    val notes: String?
)
```

`trip/TripMappings.kt` — extension functions, never inside entity:
```kotlin
fun Trip.toResponse() = TripResponse(
    id = id,
    name = name,
    description = description,
    status = status,
    waypoints = waypoints.map { it.toResponse() },
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Trip.toSummaryResponse() = TripSummaryResponse(
    id = id,
    name = name,
    status = status,
    waypointCount = waypoints.size,
    createdAt = createdAt
)
```

---

### Exception Hierarchy

`common/exception/AppException.kt`:
```kotlin
sealed class AppException(
    message: String,
    val httpStatus: HttpStatus
) : RuntimeException(message) {

    class NotFound(resource: String, id: Any)
        : AppException("$resource '$id' not found", HttpStatus.NOT_FOUND)

    class Forbidden(message: String = "Access denied")
        : AppException(message, HttpStatus.FORBIDDEN)

    class Conflict(message: String)
        : AppException(message, HttpStatus.CONFLICT)

    class InvalidState(message: String)
        : AppException(message, HttpStatus.UNPROCESSABLE_ENTITY)

    class BadRequest(message: String)
        : AppException(message, HttpStatus.BAD_REQUEST)
}
```

`common/exception/GlobalExceptionHandler.kt`:
```kotlin
@RestControllerAdvice
class GlobalExceptionHandler : ResponseEntityExceptionHandler() {

    @ExceptionHandler(AppException::class)
    fun handleAppException(ex: AppException, request: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val problem = ProblemDetail.forStatusAndDetail(ex.httpStatus, ex.message ?: "")
        problem.type = URI("https://routr.app/errors/${ex.httpStatus.value()}")
        problem.instance = URI(request.requestURI)
        problem.setProperty("errorCode", ex::class.simpleName)
        return ResponseEntity.status(ex.httpStatus).body(problem)
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception, request: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR)
        problem.detail = "An unexpected error occurred"
        problem.instance = URI(request.requestURI)
        return ResponseEntity.status(500).body(problem)
    }
}
```

Error response shape (RFC 9457):
```json
{
  "type": "https://routr.app/errors/404",
  "title": "Not Found",
  "status": 404,
  "detail": "Trip 'abc-123' not found",
  "instance": "/api/trips/abc-123",
  "errorCode": "NotFound"
}
```

---

### Security Config (Clerk JWT)

`common/config/SecurityConfig.kt`:
```kotlin
@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http {
            csrf { disable() }
            sessionManagement {
                sessionCreationPolicy = SessionCreationPolicy.STATELESS
            }
            authorizeHttpRequests {
                authorize("/actuator/health", permitAll)
                authorize(anyRequest, authenticated)
            }
            oauth2ResourceServer {
                jwt {
                    jwtAuthenticationConverter = clerkJwtConverter()
                }
            }
        }
        return http.build()
    }

    @Bean
    fun jwtDecoder(): JwtDecoder {
        // Clerk JWKS URL — replace <your-clerk-domain> with your actual domain
        val decoder = NimbusJwtDecoder
            .withJwkSetUri("https://<your-clerk-domain>/.well-known/jwks.json")
            .build()

        val validators = listOf(
            JwtValidators.createDefaultWithIssuer("https://<your-clerk-domain>"),
            // Optional: validate azp claim matches your frontend origin
            JwtClaimValidator<String>("azp") { it == System.getenv("FRONTEND_URL") }
        )
        decoder.setJwtValidator(DelegatingOAuth2TokenValidator(validators))
        return decoder
    }

    @Bean
    fun clerkJwtConverter(): JwtAuthenticationConverter {
        val converter = JwtAuthenticationConverter()
        converter.setPrincipalClaimName(JwtClaimNames.SUB)  // sub = Clerk userId
        return converter
    }
}
```

`common/config/CorsConfig.kt`:
```kotlin
@Configuration
class CorsConfig {
    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration()
        config.allowedOrigins = listOf(System.getenv("FRONTEND_URL") ?: "http://localhost:3000")
        config.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
        config.allowedHeaders = listOf("*")
        config.allowCredentials = true

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/api/**", config)
        return source
    }
}
```

**Extracting userId in controllers:**
```kotlin
// Helper — add to common/security/
fun Authentication.clerkUserId(): String = name   // name = sub claim = Clerk userId

// Usage in any controller method:
@GetMapping
fun listTrips(authentication: Authentication): ResponseEntity<List<TripSummaryResponse>> {
    val userId = authentication.clerkUserId()
    return ResponseEntity.ok(tripService.listTrips(userId))
}
```

---

### Example: TripController + TripFacade + TripService

`trip/TripController.kt`:
```kotlin
@RestController
@RequestMapping("/api/trips")
class TripController(
    private val tripFacade: TripFacade,
    private val tripService: TripService
) {
    @GetMapping
    fun listTrips(authentication: Authentication): ResponseEntity<List<TripSummaryResponse>> =
        ResponseEntity.ok(tripService.listTrips(authentication.clerkUserId()))

    @PostMapping
    fun createTrip(
        @Valid @RequestBody request: CreateTripRequest,
        authentication: Authentication
    ): ResponseEntity<TripResponse> {
        val trip = tripService.createTrip(authentication.clerkUserId(), request)
        return ResponseEntity.status(HttpStatus.CREATED).body(trip)
    }

    @GetMapping("/{id}")
    fun getTrip(@PathVariable id: UUID, authentication: Authentication): ResponseEntity<TripResponse> =
        ResponseEntity.ok(tripFacade.getTripWithWaypoints(id, authentication.clerkUserId()))

    @PutMapping("/{id}")
    fun updateTrip(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateTripRequest,
        authentication: Authentication
    ): ResponseEntity<TripResponse> =
        ResponseEntity.ok(tripService.updateTrip(id, authentication.clerkUserId(), request))

    @DeleteMapping("/{id}")
    fun deleteTrip(@PathVariable id: UUID, authentication: Authentication): ResponseEntity<Void> {
        tripService.deleteTrip(id, authentication.clerkUserId())
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/start")
    fun startTrip(@PathVariable id: UUID, authentication: Authentication): ResponseEntity<TripResponse> =
        ResponseEntity.ok(tripFacade.startTrip(id, authentication.clerkUserId()))

    @PostMapping("/{id}/complete")
    fun completeTrip(@PathVariable id: UUID, authentication: Authentication): ResponseEntity<TripResponse> =
        ResponseEntity.ok(tripFacade.completeTrip(id, authentication.clerkUserId()))
}
```

`trip/TripFacade.kt`:
```kotlin
@Component
class TripFacade(
    private val tripService: TripService,
    private val waypointService: WaypointService,
    private val statusEventService: StatusEventService
) {
    fun getTripWithWaypoints(tripId: UUID, userId: String): TripResponse {
        val trip = tripService.findByIdAndUserId(tripId, userId)
        return trip.toResponse()   // waypoints loaded via @OneToMany
    }

    @Transactional
    fun startTrip(tripId: UUID, userId: String): TripResponse {
        val trip = tripService.transitionStatus(tripId, userId, TripStatus.ACTIVE)
        statusEventService.record(trip, StatusEventType.TRIP_STARTED)
        return trip.toResponse()
    }

    @Transactional
    fun completeTrip(tripId: UUID, userId: String): TripResponse {
        val trip = tripService.transitionStatus(tripId, userId, TripStatus.COMPLETED)
        statusEventService.record(trip, StatusEventType.TRIP_COMPLETED)
        return trip.toResponse()
    }
}
```

`trip/TripService.kt`:
```kotlin
@Service
class TripService(private val tripRepository: TripRepository) {

    fun listTrips(userId: String): List<TripSummaryResponse> =
        tripRepository.findByUserIdOrderByCreatedAtDesc(userId).map { it.toSummaryResponse() }

    fun createTrip(userId: String, request: CreateTripRequest): TripResponse {
        val trip = Trip(userId = userId, name = request.name, description = request.description)
        return tripRepository.save(trip).toResponse()
    }

    fun findByIdAndUserId(tripId: UUID, userId: String): Trip =
        tripRepository.findByIdAndUserId(tripId, userId)
            ?: throw AppException.NotFound("Trip", tripId)

    fun updateTrip(tripId: UUID, userId: String, request: UpdateTripRequest): TripResponse {
        val trip = findByIdAndUserId(tripId, userId)
        trip.name = request.name ?: trip.name
        trip.description = request.description ?: trip.description
        trip.updatedAt = Instant.now()
        return tripRepository.save(trip).toResponse()
    }

    fun deleteTrip(tripId: UUID, userId: String) {
        val trip = findByIdAndUserId(tripId, userId)
        tripRepository.delete(trip)
    }

    fun transitionStatus(tripId: UUID, userId: String, to: TripStatus): Trip {
        val trip = findByIdAndUserId(tripId, userId)
        val validTransitions = mapOf(
            TripStatus.DRAFT to setOf(TripStatus.ACTIVE, TripStatus.CANCELLED),
            TripStatus.ACTIVE to setOf(TripStatus.COMPLETED, TripStatus.CANCELLED)
        )
        if (to !in (validTransitions[trip.status] ?: emptySet())) {
            throw AppException.InvalidState("Cannot transition from ${trip.status} to $to")
        }
        trip.status = to
        trip.updatedAt = Instant.now()
        return tripRepository.save(trip)
    }
}
```

`trip/TripRepository.kt`:
```kotlin
interface TripRepository : JpaRepository<Trip, UUID> {
    fun findByIdAndUserId(id: UUID, userId: String): Trip?
    fun findByUserIdOrderByCreatedAtDesc(userId: String): List<Trip>
}
```

---

### SSE (Server-Sent Events)

`event/SseController.kt`:
```kotlin
@RestController
@RequestMapping("/api/trips/{tripId}/events")
class SseController(
    private val tripService: TripService,
    private val statusEventService: StatusEventService,
    private val taskScheduler: TaskScheduler
) {
    @GetMapping(produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun streamEvents(
        @PathVariable tripId: UUID,
        authentication: Authentication
    ): SseEmitter {
        // Verify ownership
        tripService.findByIdAndUserId(tripId, authentication.clerkUserId())

        val emitter = SseEmitter(300_000L)  // 5 min timeout
        var lastSeenId: UUID? = null

        val task = taskScheduler.scheduleAtFixedRate({
            try {
                val newEvents = statusEventService.findNewEvents(tripId, lastSeenId)
                if (newEvents.isNotEmpty()) {
                    newEvents.forEach { event ->
                        emitter.send(
                            SseEmitter.event()
                                .id(event.id.toString())
                                .name(event.type.name.lowercase())
                                .data(jacksonObjectMapper().writeValueAsString(event))
                        )
                    }
                    lastSeenId = newEvents.last().id
                }
            } catch (e: Exception) {
                emitter.completeWithError(e)
            }
        }, Duration.ofSeconds(2))

        emitter.onCompletion { task.cancel(false) }
        emitter.onTimeout { task.cancel(false) }
        emitter.onError { task.cancel(false) }

        return emitter
    }
}
```

---

### Flyway Migrations

`resources/db/migration/V1__create_trips.sql`:
```sql
CREATE TYPE trip_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status trip_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
```

`resources/db/migration/V2__create_waypoints.sql`:
```sql
CREATE TYPE waypoint_status AS ENUM ('PENDING', 'ARRIVED', 'SKIPPED');

CREATE TABLE waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(9, 6) NOT NULL,
    lng DECIMAL(9, 6) NOT NULL,
    estimated_arrival TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    status waypoint_status NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waypoints_trip_id ON waypoints(trip_id);
```

`resources/db/migration/V3__create_status_events.sql`:
```sql
CREATE TYPE event_type AS ENUM (
    'TRIP_STARTED', 'TRIP_COMPLETED', 'TRIP_CANCELLED',
    'WAYPOINT_ARRIVED', 'WAYPOINT_SKIPPED'
);

CREATE TABLE status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    waypoint_id UUID REFERENCES waypoints(id) ON DELETE SET NULL,
    type event_type NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata TEXT
);

CREATE INDEX idx_status_events_trip_id ON status_events(trip_id);
```

---

### `application.yml`

```yaml
spring:
  application:
    name: routr
  datasource:
    url: ${DATABASE_URL}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate        # Flyway owns schema — Hibernate only validates
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect
  flyway:
    enabled: true
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: ${CLERK_JWKS_URL}
          issuer-uri: ${CLERK_ISSUER_URI}
  mvc:
    problemdetails:
      enabled: true             # RFC 9457 — auto-handles Spring MVC exceptions

server:
  port: 8080

management:
  endpoints:
    web:
      exposure:
        include: health
```

---

### `build.gradle.kts`

```kotlin
plugins {
    kotlin("jvm") version "2.0.0"
    kotlin("plugin.spring") version "2.0.0"
    kotlin("plugin.jpa") version "2.0.0"
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.routr"
version = "0.0.1-SNAPSHOT"

java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("io.mockk:mockk:1.13.12")
    testImplementation("org.testcontainers:postgresql:1.20.1")
}
```

---

## API Design

All endpoints require `Authorization: Bearer <clerk-jwt>` header.

```
GET    /api/trips                               → List<TripSummaryResponse>
POST   /api/trips                               → TripResponse (201)
GET    /api/trips/{id}                          → TripResponse (with waypoints)
PUT    /api/trips/{id}                          → TripResponse
DELETE /api/trips/{id}                          → 204

POST   /api/trips/{id}/waypoints                → WaypointResponse (201)
PUT    /api/trips/{id}/waypoints/{wid}          → WaypointResponse
DELETE /api/trips/{id}/waypoints/{wid}          → 204
PUT    /api/trips/{id}/waypoints/reorder        → 200 { ok: true }  (body: { order: [uuid] })

POST   /api/trips/{id}/start                    → TripResponse
POST   /api/trips/{id}/complete                 → TripResponse
POST   /api/trips/{id}/cancel                   → TripResponse
POST   /api/trips/{id}/waypoints/{wid}/arrive   → WaypointResponse
POST   /api/trips/{id}/waypoints/{wid}/skip     → WaypointResponse

GET    /api/trips/{id}/events                   → SSE stream (text/event-stream)
```

---

## Frontend: Attaching Clerk JWT to API Calls

`frontend/src/lib/api.ts`:
```typescript
import { auth } from '@clerk/nextjs/server'

// Server-side fetch (Server Components, Route Handlers)
export async function serverFetch(path: string, init?: RequestInit) {
  const { getToken } = auth()
  const token = await getToken()
  return fetch(`${process.env.BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

// Client-side: use @clerk/nextjs useAuth() hook to get token, then attach to TanStack Query fetches
```

`frontend/src/hooks/useTrips.ts`:
```typescript
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'

export function useTrips() {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch trips')
      return res.json()
    }
  })
}
```

---

## Environment Variables

### Backend (`backend/.env` / Railway env vars)
```
DATABASE_URL=postgresql://user:password@neon-host/routr
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
CLERK_ISSUER_URI=https://<your-clerk-domain>
FRONTEND_URL=https://routr.vercel.app
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080     # in dev
BACKEND_URL=http://localhost:8080                  # server-side in dev
NEXT_PUBLIC_MAPTILER_KEY=...                       # for map tiles
```

---

## Phase Breakdown

### Phase 1 — Backend project setup + auth + DB (Week 1, ~12h)
- [ ] Create Spring Boot project at `start.spring.io`: Web, Data JPA, Security, OAuth2 Resource Server, Validation, Actuator, Flyway, PostgreSQL
- [ ] Write `build.gradle.kts` (above)
- [ ] Write `application.yml` skeleton
- [ ] Write three Flyway migration SQL files (`V1`, `V2`, `V3`)
- [ ] Write all JPA entities: `Trip`, `Waypoint`, `StatusEvent` + enums
- [ ] Configure Spring Security with Clerk JWKS (SecurityConfig + CorsConfig)
- [ ] Write `GET /actuator/health` — verify it returns 200 without auth
- [ ] Write `GET /api/trips` — returns empty list with a valid Clerk JWT
- [ ] Test: hit `/api/trips` with a real Clerk token from Postman/Insomnia → expect 200 `[]`
- [ ] Deploy to Railway — set env vars, verify health endpoint

### Phase 2 — Trip + Waypoint CRUD (Week 1–2, ~12h)
- [ ] Write exception hierarchy: sealed `AppException` + `GlobalExceptionHandler`
- [ ] Write `TripRepository`, `TripService`, `TripFacade`, `TripController` with all CRUD routes
- [ ] Write DTOs + extension function mappers for Trip
- [ ] Write `WaypointRepository`, `WaypointService`, `WaypointFacade`, `WaypointController`
- [ ] Write DTOs + extension function mappers for Waypoint
- [ ] Implement `reorderWaypoints` — update `order` field on all affected waypoints in one transaction
- [ ] Ownership guard: every query filters by `userId` at service layer — add unit tests for this
- [ ] Write unit tests for `TripService` using MockK
- [ ] Manual test: full CRUD cycle with Postman

### Phase 3 — Trip actions + StatusEvent + SSE (Week 2–3, ~10h)
- [ ] Write `StatusEventService` + `StatusEventRepository`
- [ ] Implement action endpoints in Facade: `startTrip`, `completeTrip`, `cancelTrip`, `arriveAtWaypoint`, `skipWaypoint`
- [ ] Implement state machine validation in `TripService.transitionStatus`
- [ ] Write `SseController` with `SseEmitter` + 2s polling of `status_events`
- [ ] Test: start a trip, arrive at waypoints, verify events appear in SSE stream

### Phase 4 — Frontend setup + Trip list UI (Week 3, ~10h)
- [ ] `pnpm create next-app frontend --typescript --tailwind --app`
- [ ] Install and configure Clerk
- [ ] Write `api.ts` helper with Clerk token attachment
- [ ] Write `useTrips`, `useTrip`, `useTripMutations`, `useWaypointMutations` hooks
- [ ] Build `TripCard`, `TripList`, `TripForm`
- [ ] Build `/trips` page (list + create button)
- [ ] Build `/trips/new` page (form → redirect to `/trips/[id]`)
- [ ] Build `/trips/[id]` page — header, waypoint list, no map yet
- [ ] Test end-to-end: create trip in UI, verify it appears in backend DB

### Phase 5 — Deck.GL map (Week 4, ~12h)
- [ ] Install `deck.gl`, `@deck.gl/react`, `react-map-gl`, `maplibre-gl`
- [ ] Write `TripMap.tsx` — MapLibre base + Deck.GL overlay
- [ ] `PathLayer` connecting waypoints in order
- [ ] `ScatterplotLayer` with color by status (pending=blue, arrived=green, skipped=gray)
- [ ] `TextLayer` rendering order numbers on markers
- [ ] Auto-fit viewport to bounding box of all waypoints on trip load
- [ ] Click marker → set `selectedWaypointId` in Zustand → open `Drawer` with waypoint detail
- [ ] Split layout: map (left 60%) + waypoint list (right 40%)

### Phase 6 — Real-time + actions UI + polish (Week 5–6, ~10h)
- [ ] Write `useTripEvents` hook — `EventSource` subscription, invalidates TanStack Query on event
- [ ] `WaypointStatusButton` — "Arrive" / "Skip" with optimistic updates
- [ ] Trip control bar — Start / Complete / Cancel (conditional on `trip.status`)
- [ ] Optimistic updates for waypoint status changes
- [ ] Responsive layout (mobile: map collapses to top)
- [ ] Loading skeletons, error boundaries
- [ ] Seed data for public demo
- [ ] Deploy frontend to Vercel, set all env vars
- [ ] README: description, live URL, screenshot or demo GIF

---

## Constraints & Non-Goals for v1

- **No geocoding.** Lat/lng entered manually. Address is a display label only.
- **No road-following routes.** Straight lines between waypoints. Directions API = v2.
- **No push notifications.** SSE only, no service workers.
- **No sharing or multi-user collaboration.** Single-user trips only.
- **No route optimization.** User-defined order only.
- **SSE = polling, not Postgres NOTIFY.** Simple 2s poll is fine for v1.
- **Spring MVC, not WebFlux.** SseEmitter is sufficient for this scale. Migrate if concurrency becomes a concern.
- **No Docker in dev.** Run Spring Boot locally via `./gradlew bootRun`, use Neon for DB.

---

## Definition of Done for v1

- [ ] User can sign up, create a trip, add ordered waypoints with coordinates
- [ ] Trip detail shows an interactive Deck.GL map with markers and connecting polylines
- [ ] User can start a trip, mark waypoints arrived/skipped, and complete the trip
- [ ] Status changes update the map in real-time via SSE without page refresh
- [ ] Optimistic updates make status changes feel instant
- [ ] Backend deployed on Railway, frontend on Vercel, both publicly accessible
- [ ] README has live link and screenshot
