# RoutR Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the Kotlin Spring Boot backend for RoutR — REST API with PostgreSQL, Clerk JWT auth, and SSE for real-time updates.

**Architecture:** Controller → Facade → Service → Repository layered architecture. Flyway manages DB schema, Hibernate only validates it matches. Spring Security 6 verifies Clerk JWTs via JWKS. SSE endpoint polls `status_events` every 2 seconds.

**Tech Stack:** Kotlin 2.0, Spring Boot 3.3.x, Spring Data JPA, Spring Security 6 (OAuth2 Resource Server), Flyway, PostgreSQL (Neon), JUnit 5 + MockK, Gradle (Kotlin DSL)

---

## TDD Methodology — Red-Green-Refactor (RGR)

Sources: [Beyond Red, Green, Refactor (Incubyte 2025)](https://blog.incubyte.co/blog/a-practical-approach-to-test-driven-development-beyond-red-green-refactor/) · [Practicing TDD the Right Way (Medium 2025)](https://medium.com/@gulsaba.fiha/beyond-the-buzz-practicing-tdd-the-right-way-red-green-refactor-57f6af3ae317)

**Every repository and service follows this cycle — no exceptions:**

```
🔴 RED    → Write the test first. It must FAIL (usually: compilation error because
             the class/interface doesn't exist yet). If it doesn't fail, the test is wrong.

🟢 GREEN  → Write the minimum code to make the test pass. No extras, no polish.
             Run tests again — all must be green before moving on.

🔵 COMMIT → Commit now, while tests are green. Small commits = easy to revert.

🔄 REFACTOR → Clean up names, extract duplication, improve readability.
               Tests must stay green throughout.
```

**Strict task order for each entity:**
1. Write DTOs (needed for tests to compile)
2. Write `XxxRepositoryTest` — run → 🔴 RED (can't find `XxxRepository`)
3. Write `XxxRepository` — run → 🟢 GREEN
4. Commit
5. Write `XxxServiceTest` — run → 🔴 RED (can't find `XxxService`)
6. Write `XxxService` — run → 🟢 GREEN
7. Commit

---

## File Map

```
backend/
├── build.gradle.kts
├── Dockerfile
└── src/
    ├── main/
    │   ├── kotlin/com/routr/
    │   │   ├── RoutrApplication.kt
    │   │   ├── common/
    │   │   │   ├── config/
    │   │   │   │   ├── SecurityConfig.kt
    │   │   │   │   └── CorsConfig.kt
    │   │   │   ├── security/
    │   │   │   │   └── ClerkAuth.kt
    │   │   │   └── exception/
    │   │   │       ├── AppException.kt
    │   │   │       └── GlobalExceptionHandler.kt
    │   │   ├── trip/
    │   │   │   ├── Trip.kt
    │   │   │   ├── TripStatus.kt
    │   │   │   ├── TripRepository.kt
    │   │   │   ├── TripFacade.kt
    │   │   │   ├── TripController.kt
    │   │   │   ├── TripMappings.kt
    │   │   │   ├── service/
    │   │   │   │   └── TripService.kt          ← service subfolder
    │   │   │   └── dto/
    │   │   │       ├── CreateTripRequest.kt
    │   │   │       ├── UpdateTripRequest.kt
    │   │   │       ├── TripResponse.kt
    │   │   │       └── TripSummaryResponse.kt
    │   │   ├── waypoint/
    │   │   │   ├── Waypoint.kt
    │   │   │   ├── WaypointStatus.kt
    │   │   │   ├── WaypointRepository.kt
    │   │   │   ├── WaypointFacade.kt
    │   │   │   ├── WaypointController.kt
    │   │   │   ├── WaypointMappings.kt
    │   │   │   ├── service/
    │   │   │   │   └── WaypointService.kt      ← service subfolder
    │   │   │   └── dto/
    │   │   │       ├── CreateWaypointRequest.kt
    │   │   │       ├── UpdateWaypointRequest.kt
    │   │   │       ├── ReorderWaypointsRequest.kt
    │   │   │       └── WaypointResponse.kt
    │   │   └── event/
    │   │       ├── StatusEvent.kt
    │   │       ├── StatusEventType.kt
    │   │       ├── StatusEventRepository.kt
    │   │       ├── SseController.kt
    │   │       └── service/
    │   │           └── StatusEventService.kt   ← service subfolder
    │   └── resources/
    │       ├── application.yml
    │       ├── application-local.yml
    │       └── db/migration/
    │           ├── V1__create_trips.sql
    │           ├── V2__create_waypoints.sql
    │           └── V3__create_status_events.sql
    └── test/kotlin/com/routr/
        ├── trip/
        │   └── TripServiceTest.kt
        └── waypoint/
            ├── WaypointRepositoryTest.kt   ← [RED] before repo
            └── WaypointServiceTest.kt      ← [RED] before service
```

---

## Phase 0 — Dev Environment

### Task 1: Install Java 21 via SDKMAN

- [ ] Open terminal. Install SDKMAN:
  ```bash
  curl -s "https://get.sdkman.io" | bash
  source "$HOME/.sdkman/bin/sdkman-init.sh"
  ```
- [ ] Install Java 21:
  ```bash
  sdk install java 21-tem
  ```
- [ ] Verify:
  ```bash
  java -version
  ```
  Expected output: `openjdk version "21.x.x"`

### Task 2: Install Cursor Extensions

- [ ] Open Cursor Extensions panel (`Cmd+Shift+X`), install each:
  - `Kotlin` by fwcd
  - `Extension Pack for Java` by Microsoft
  - `Spring Boot Extension Pack` by VMware
  - `SQLTools` by Matheus Teixeira
  - `SQLTools PostgreSQL/Cockroach Driver` by Matheus Teixeira
- [ ] Restart Cursor after installing.

### Task 3: Create Neon Database

- [ ] Go to neon.tech → sign up → create a project named `routr`.
- [ ] In the Neon dashboard, create a database named `routr` (separate from the default `neondb`).
- [ ] Copy the connection string — it looks like:
  ```
  postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/routr?sslmode=require
  ```
- [ ] In Cursor, open the SQLTools sidebar, click **Add New Connection**, select PostgreSQL, paste the connection string. Click **Test Connection** — expected: success.

### Task 4: Create Clerk Account

- [ ] Go to clerk.com → sign up → create an application named `routr`.
- [ ] In the Clerk dashboard, go to **API Keys**. Save these values to a local notes file:
  - Publishable key (starts with `pk_test_`)
  - Secret key (starts with `sk_test_`)
- [ ] Go to **JWT Templates** → note your **JWKS URL**:
  ```
  https://<your-clerk-domain>/.well-known/jwks.json
  ```
- [ ] Note your **Issuer URI**:
  ```
  https://<your-clerk-domain>
  ```
  Save both — needed in `application-local.yml`.

---

## Phase 1 — Database Migrations

> These SQL files live in `backend/src/main/resources/db/migration/`. Create the `backend/` directory structure manually for now — Gradle will add more files in Phase 2.

### Task 5: Write V1 Migration — trips table

- [ ] Create `backend/src/main/resources/db/migration/V1__create_trips.sql`:
  ```sql
  CREATE TYPE trip_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

  CREATE TABLE trips (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     TEXT        NOT NULL,
      name        TEXT        NOT NULL,
      description TEXT,
      status      trip_status NOT NULL DEFAULT 'DRAFT',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_trips_user_id ON trips(user_id);
  ```
- [ ] Run it in SQLTools (right-click → Run Query). Expected: no errors.
- [ ] Verify: run `SELECT * FROM trips;` in SQLTools. Expected: empty result set — the table exists.

### Task 6: Write V2 Migration — waypoints table

- [ ] Create `backend/src/main/resources/db/migration/V2__create_waypoints.sql`:
  ```sql
  CREATE TYPE waypoint_status AS ENUM ('PENDING', 'ARRIVED', 'SKIPPED');

  CREATE TABLE waypoints (
      id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id           UUID            NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      "order"           INTEGER         NOT NULL,
      name              TEXT            NOT NULL,
      address           TEXT            NOT NULL,
      lat               DECIMAL(9, 6)   NOT NULL,
      lng               DECIMAL(9, 6)   NOT NULL,
      estimated_arrival TIMESTAMPTZ,
      actual_arrival    TIMESTAMPTZ,
      status            waypoint_status NOT NULL DEFAULT 'PENDING',
      notes             TEXT,
      created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_waypoints_trip_id ON waypoints(trip_id);
  ```
- [ ] Run in SQLTools. Expected: no errors.
- [ ] Verify the foreign key: run `SELECT conname FROM pg_constraint WHERE conrelid = 'waypoints'::regclass;`
  Expected: a row with `waypoints_trip_id_fkey`.

### Task 7: Write V3 Migration — status_events table

- [ ] Create `backend/src/main/resources/db/migration/V3__create_status_events.sql`:
  ```sql
  CREATE TYPE event_type AS ENUM (
      'TRIP_STARTED', 'TRIP_COMPLETED', 'TRIP_CANCELLED',
      'WAYPOINT_ARRIVED', 'WAYPOINT_SKIPPED'
  );

  CREATE TABLE status_events (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id     UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      waypoint_id UUID        REFERENCES waypoints(id) ON DELETE SET NULL,
      type        event_type  NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata    TEXT
  );

  CREATE INDEX idx_status_events_trip_id ON status_events(trip_id);
  ```
- [ ] Run in SQLTools. Expected: no errors.
- [ ] Verify all 3 tables:
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name;
  ```
  Expected: `status_events`, `trips`, `waypoints`.

---

## Phase 2 — Spring Boot Project Setup

### Task 8: Generate the Project

- [ ] Open https://start.spring.io. Configure:
  - **Project:** Gradle - Kotlin
  - **Language:** Kotlin
  - **Spring Boot:** 3.3.x (latest 3.3)
  - **Group:** `com.routr`
  - **Artifact:** `backend`
  - **Packaging:** Jar
  - **Java:** 21
  - **Dependencies:** Spring Web, Spring Data JPA, Spring Security, OAuth2 Resource Server, Validation, Spring Boot Actuator, Flyway Migration, PostgreSQL Driver
- [ ] Click **Generate**, download the zip, unzip it into `RoutR/backend/`. Your structure should now have `RoutR/backend/build.gradle.kts`.

### Task 9: Configure build.gradle.kts

- [ ] Replace the entire contents of `backend/build.gradle.kts` with:
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

  repositories { mavenCentral() }

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
  }

  tasks.withType<Test> { useJUnitPlatform() }
  ```
- [ ] From `backend/`, run:
  ```bash
  ./gradlew dependencies
  ```
  Expected: dependency tree prints, no download errors.

### Task 10: Configure application.yml

- [ ] Replace `backend/src/main/resources/application.yml`:
  ```yaml
  spring:
    application:
      name: routr
    datasource:
      url: ${DATABASE_URL}
      driver-class-name: org.postgresql.Driver
    jpa:
      hibernate:
        ddl-auto: validate
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
        enabled: true

  server:
    port: 8080

  management:
    endpoints:
      web:
        exposure:
          include: health
  ```
- [ ] Create `backend/src/main/resources/application-local.yml` (fill in your actual values from Task 3 and Task 4):
  ```yaml
  spring:
    datasource:
      url: postgresql://YOUR_NEON_CONNECTION_STRING/routr?sslmode=require
    security:
      oauth2:
        resourceserver:
          jwt:
            jwk-set-uri: https://YOUR_CLERK_DOMAIN/.well-known/jwks.json
            issuer-uri: https://YOUR_CLERK_DOMAIN
  ```
  > `application-local.yml` is a Spring **profile override** — when you run with `--spring.profiles.active=local`, Spring merges this on top of `application.yml`, filling in the `${...}` placeholders.

### Task 11: Verify the App Boots

- [ ] From `backend/`, run:
  ```bash
  ./gradlew bootRun --args='--spring.profiles.active=local'
  ```
  Expected: `Started RoutrApplication` in logs. No `SchemaManagementException` — Flyway should also report the 3 migrations are already applied (it tracks them in a `flyway_schema_history` table).
- [ ] In a second terminal:
  ```bash
  curl http://localhost:8080/actuator/health
  ```
  Expected: `{"status":"UP"}`
- [ ] Stop the server (`Ctrl+C`).
- [ ] Commit:
  ```bash
  git add backend/
  git commit -m "feat: Spring Boot skeleton — DB connection, Flyway, health endpoint"
  ```

---

## Phase 3 — Security Config

### Task 12: Write ClerkAuth helper

- [ ] Create `backend/src/main/kotlin/com/routr/common/security/ClerkAuth.kt`:
  ```kotlin
  package com.routr.common.security

  import org.springframework.security.core.Authentication

  fun Authentication.clerkUserId(): String = name
  ```
  > Spring Security sets `Authentication.name` to the JWT `sub` claim, which is the Clerk user ID. This extension function is just a readable alias used across all controllers.

### Task 13: Write SecurityConfig

- [ ] Create `backend/src/main/kotlin/com/routr/common/config/SecurityConfig.kt`:
  ```kotlin
  package com.routr.common.config

  import org.springframework.context.annotation.Bean
  import org.springframework.context.annotation.Configuration
  import org.springframework.security.config.annotation.web.builders.HttpSecurity
  import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
  import org.springframework.security.config.annotation.web.invoke
  import org.springframework.security.config.http.SessionCreationPolicy
  import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter
  import org.springframework.security.oauth2.jwt.JwtClaimNames
  import org.springframework.security.web.SecurityFilterChain

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
      fun clerkJwtConverter(): JwtAuthenticationConverter {
          val converter = JwtAuthenticationConverter()
          converter.setPrincipalClaimName(JwtClaimNames.SUB)
          return converter
      }
  }
  ```

### Task 14: Write CorsConfig

- [ ] Create `backend/src/main/kotlin/com/routr/common/config/CorsConfig.kt`:
  ```kotlin
  package com.routr.common.config

  import org.springframework.context.annotation.Bean
  import org.springframework.context.annotation.Configuration
  import org.springframework.web.cors.CorsConfiguration
  import org.springframework.web.cors.UrlBasedCorsConfigurationSource

  @Configuration
  class CorsConfig {
      @Bean
      fun corsConfigurationSource(): UrlBasedCorsConfigurationSource {
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
- [ ] Boot the app and verify security is active:
  ```bash
  ./gradlew bootRun --args='--spring.profiles.active=local'
  # In another terminal:
  curl -i http://localhost:8080/api/trips
  ```
  Expected: `HTTP/1.1 401` — unauthenticated requests are rejected.
- [ ] Stop the server.
- [ ] Commit:
  ```bash
  git add backend/src/main/kotlin/com/routr/common/
  git commit -m "feat: Clerk JWT security + CORS config"
  ```

---

## Phase 3 — Exception Handling

### Task 15: Write AppException

- [ ] Create `backend/src/main/kotlin/com/routr/common/exception/AppException.kt`:
  ```kotlin
  package com.routr.common.exception

  import org.springframework.http.HttpStatus

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
  > `sealed class` means all subtypes must be declared in the same file. Kotlin's `when` expression can then exhaustively match them without a default branch.

### Task 16: Write GlobalExceptionHandler

- [ ] Create `backend/src/main/kotlin/com/routr/common/exception/GlobalExceptionHandler.kt`:
  ```kotlin
  package com.routr.common.exception

  import jakarta.servlet.http.HttpServletRequest
  import org.springframework.http.HttpStatus
  import org.springframework.http.ProblemDetail
  import org.springframework.http.ResponseEntity
  import org.springframework.web.bind.annotation.ExceptionHandler
  import org.springframework.web.bind.annotation.RestControllerAdvice
  import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler
  import java.net.URI

  @RestControllerAdvice
  class GlobalExceptionHandler : ResponseEntityExceptionHandler() {

      @ExceptionHandler(AppException::class)
      fun handleAppException(
          ex: AppException,
          request: HttpServletRequest
      ): ResponseEntity<ProblemDetail> {
          val problem = ProblemDetail.forStatusAndDetail(ex.httpStatus, ex.message ?: "")
          problem.type = URI("https://routr.app/errors/${ex.httpStatus.value()}")
          problem.instance = URI(request.requestURI)
          problem.setProperty("errorCode", ex::class.simpleName)
          return ResponseEntity.status(ex.httpStatus).body(problem)
      }

      @ExceptionHandler(Exception::class)
      fun handleUnexpected(
          ex: Exception,
          request: HttpServletRequest
      ): ResponseEntity<ProblemDetail> {
          val problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR)
          problem.detail = "An unexpected error occurred"
          problem.instance = URI(request.requestURI)
          return ResponseEntity.status(500).body(problem)
      }
  }
  ```
- [ ] Commit:
  ```bash
  git add backend/src/main/kotlin/com/routr/common/exception/
  git commit -m "feat: AppException sealed class + GlobalExceptionHandler"
  ```

---

## Phase 3 — JPA Entities

### Task 17: Write TripStatus enum

- [ ] Create `backend/src/main/kotlin/com/routr/trip/TripStatus.kt`:
  ```kotlin
  package com.routr.trip

  enum class TripStatus { DRAFT, ACTIVE, COMPLETED, CANCELLED }
  ```

### Task 18: Write Trip entity

- [ ] Create `backend/src/main/kotlin/com/routr/trip/Trip.kt`:
  ```kotlin
  package com.routr.trip

  import com.routr.waypoint.Waypoint
  import jakarta.persistence.*
  import java.time.Instant
  import java.util.UUID

  @Entity
  @Table(name = "trips")
  class Trip(
      @Id
      val id: UUID = UUID.randomUUID(),

      @Column(nullable = false)
      val userId: String,

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
  ```
  > **Why `class` not `data class`?** JPA entities need a mutable state and a no-arg constructor. `data class` generates `equals`/`hashCode` based on all properties, which causes problems with lazy-loaded collections like `waypoints`. Plain `class` avoids these pitfalls.

### Task 19: Write WaypointStatus enum

- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/WaypointStatus.kt`:
  ```kotlin
  package com.routr.waypoint

  enum class WaypointStatus { PENDING, ARRIVED, SKIPPED }
  ```

### Task 20: Write Waypoint entity

- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/Waypoint.kt`:
  ```kotlin
  package com.routr.waypoint

  import com.routr.trip.Trip
  import jakarta.persistence.*
  import java.math.BigDecimal
  import java.time.Instant
  import java.util.UUID

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
  ```
  > **Why `name = "\`order\`"`?** `order` is a reserved SQL keyword. The backticks tell Hibernate to quote it in generated SQL so it doesn't conflict.

### Task 21: Write StatusEventType enum + StatusEvent entity

- [ ] Create `backend/src/main/kotlin/com/routr/event/StatusEventType.kt`:
  ```kotlin
  package com.routr.event

  enum class StatusEventType {
      TRIP_STARTED, TRIP_COMPLETED, TRIP_CANCELLED,
      WAYPOINT_ARRIVED, WAYPOINT_SKIPPED
  }
  ```
- [ ] Create `backend/src/main/kotlin/com/routr/event/StatusEvent.kt`:
  ```kotlin
  package com.routr.event

  import com.routr.trip.Trip
  import com.routr.waypoint.Waypoint
  import jakarta.persistence.*
  import java.time.Instant
  import java.util.UUID

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
      val metadata: String? = null
  )
  ```

### Task 22: Verify Entities Match the Schema

- [ ] Boot the app:
  ```bash
  ./gradlew bootRun --args='--spring.profiles.active=local'
  ```
  Expected: starts without a `SchemaManagementException`. Hibernate's `ddl-auto: validate` compares every entity field against the DB — if it boots cleanly, your entities match the schema from Phase 1.
- [ ] Stop the server.
- [ ] Commit:
  ```bash
  git add backend/src/main/kotlin/com/routr/trip/ backend/src/main/kotlin/com/routr/waypoint/ backend/src/main/kotlin/com/routr/event/
  git commit -m "feat: JPA entities for Trip, Waypoint, StatusEvent"
  ```

---

## Phase 4 — Trip CRUD

### Task 23: Write WaypointResponse DTO

> Needed now because `TripResponse` references it.

- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/dto/WaypointResponse.kt`:
  ```kotlin
  package com.routr.waypoint.dto

  import com.routr.waypoint.WaypointStatus
  import java.math.BigDecimal
  import java.time.Instant
  import java.util.UUID

  data class WaypointResponse(
      val id: UUID,
      val tripId: UUID,
      val order: Int,
      val name: String,
      val address: String,
      val lat: BigDecimal,
      val lng: BigDecimal,
      val estimatedArrival: Instant?,
      val actualArrival: Instant?,
      val status: WaypointStatus,
      val notes: String?,
      val createdAt: Instant
  )
  ```

### Task 24: Write WaypointMappings

- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/WaypointMappings.kt`:
  ```kotlin
  package com.routr.waypoint

  import com.routr.waypoint.dto.WaypointResponse

  fun Waypoint.toResponse() = WaypointResponse(
      id = id,
      tripId = trip.id,
      order = order,
      name = name,
      address = address,
      lat = lat,
      lng = lng,
      estimatedArrival = estimatedArrival,
      actualArrival = actualArrival,
      status = status,
      notes = notes,
      createdAt = createdAt
  )
  ```

### Task 25: Write Trip DTOs

- [ ] Create `backend/src/main/kotlin/com/routr/trip/dto/TripSummaryResponse.kt`:
  ```kotlin
  package com.routr.trip.dto

  import com.routr.trip.TripStatus
  import java.time.Instant
  import java.util.UUID

  data class TripSummaryResponse(
      val id: UUID,
      val name: String,
      val status: TripStatus,
      val waypointCount: Int,
      val createdAt: Instant
  )
  ```
- [ ] Create `backend/src/main/kotlin/com/routr/trip/dto/TripResponse.kt`:
  ```kotlin
  package com.routr.trip.dto

  import com.routr.trip.TripStatus
  import com.routr.waypoint.dto.WaypointResponse
  import java.time.Instant
  import java.util.UUID

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
- [ ] Create `backend/src/main/kotlin/com/routr/trip/dto/CreateTripRequest.kt`:
  ```kotlin
  package com.routr.trip.dto

  import jakarta.validation.constraints.NotBlank
  import jakarta.validation.constraints.Size

  data class CreateTripRequest(
      @field:NotBlank(message = "Name is required")
      @field:Size(max = 100)
      val name: String,

      @field:Size(max = 500)
      val description: String? = null
  )
  ```
- [ ] Create `backend/src/main/kotlin/com/routr/trip/dto/UpdateTripRequest.kt`:
  ```kotlin
  package com.routr.trip.dto

  import jakarta.validation.constraints.Size

  data class UpdateTripRequest(
      @field:Size(max = 100)
      val name: String? = null,

      @field:Size(max = 500)
      val description: String? = null
  )
  ```

### Task 26: Write TripMappings

- [ ] Create `backend/src/main/kotlin/com/routr/trip/TripMappings.kt`:
  ```kotlin
  package com.routr.trip

  import com.routr.trip.dto.TripResponse
  import com.routr.trip.dto.TripSummaryResponse
  import com.routr.waypoint.toResponse

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

### Task 27: Write TripRepository

- [ ] Create `backend/src/main/kotlin/com/routr/trip/TripRepository.kt`:
  ```kotlin
  package com.routr.trip

  import org.springframework.data.jpa.repository.JpaRepository
  import java.util.UUID

  interface TripRepository : JpaRepository<Trip, UUID> {
      fun findByIdAndUserId(id: UUID, userId: String): Trip?
      fun findByUserIdOrderByCreatedAtDesc(userId: String): List<Trip>
  }
  ```
  > Spring Data generates the SQL from the method name at startup. `findByIdAndUserId` becomes `SELECT * FROM trips WHERE id = ? AND user_id = ?`. No SQL needed.

### Task 28: Write TripService tests first (TDD)

- [ ] Create `backend/src/test/kotlin/com/routr/trip/TripServiceTest.kt`:
  ```kotlin
  package com.routr.trip

  import com.routr.common.exception.AppException
  import com.routr.trip.dto.CreateTripRequest
  import com.routr.trip.dto.UpdateTripRequest
  import io.mockk.every
  import io.mockk.mockk
  import io.mockk.verify
  import org.junit.jupiter.api.Assertions.*
  import org.junit.jupiter.api.Test
  import org.junit.jupiter.api.assertThrows
  import java.util.UUID

  class TripServiceTest {

      private val repo = mockk<TripRepository>()
      private val service = TripService(repo)
      private val userId = "user_clerk_test123"

      @Test
      fun `createTrip saves trip and returns response with correct name`() {
          val request = CreateTripRequest(name = "Seoul Run")
          every { repo.save(any()) } answers { firstArg() }

          val result = service.createTrip(userId, request)

          assertEquals("Seoul Run", result.name)
          verify(exactly = 1) { repo.save(any()) }
      }

      @Test
      fun `findByIdAndUserId throws NotFound when trip does not exist`() {
          val tripId = UUID.randomUUID()
          every { repo.findByIdAndUserId(tripId, userId) } returns null

          assertThrows<AppException.NotFound> {
              service.findByIdAndUserId(tripId, userId)
          }
      }

      @Test
      fun `transitionStatus throws InvalidState for illegal transition`() {
          val trip = Trip(userId = userId, name = "Test").apply { status = TripStatus.COMPLETED }
          every { repo.findByIdAndUserId(trip.id, userId) } returns trip

          assertThrows<AppException.InvalidState> {
              service.transitionStatus(trip.id, userId, TripStatus.ACTIVE)
          }
      }

      @Test
      fun `transitionStatus DRAFT to ACTIVE saves and returns updated trip`() {
          val trip = Trip(userId = userId, name = "Test")
          every { repo.findByIdAndUserId(trip.id, userId) } returns trip
          every { repo.save(trip) } returns trip

          val result = service.transitionStatus(trip.id, userId, TripStatus.ACTIVE)

          assertEquals(TripStatus.ACTIVE, result.status)
          verify(exactly = 1) { repo.save(trip) }
      }
  }
  ```
- [ ] Run the tests:
  ```bash
  ./gradlew test --tests "com.routr.trip.TripServiceTest"
  ```
  Expected: **compilation failure** — `TripService` doesn't exist yet. This is correct for TDD.

### Task 29: Write TripService

- [ ] Create `backend/src/main/kotlin/com/routr/trip/TripService.kt`:
  ```kotlin
  package com.routr.trip

  import com.routr.common.exception.AppException
  import com.routr.trip.dto.CreateTripRequest
  import com.routr.trip.dto.TripResponse
  import com.routr.trip.dto.TripSummaryResponse
  import com.routr.trip.dto.UpdateTripRequest
  import org.springframework.stereotype.Service
  import java.time.Instant
  import java.util.UUID

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
          request.name?.let { trip.name = it }
          request.description?.let { trip.description = it }
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
              TripStatus.DRAFT   to setOf(TripStatus.ACTIVE, TripStatus.CANCELLED),
              TripStatus.ACTIVE  to setOf(TripStatus.COMPLETED, TripStatus.CANCELLED)
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
- [ ] Run the tests again:
  ```bash
  ./gradlew test --tests "com.routr.trip.TripServiceTest"
  ```
  Expected: **all 4 tests pass**.

### Task 30: Write StatusEventRepository + StatusEventService (needed by TripFacade)

- [ ] Create `backend/src/main/kotlin/com/routr/event/StatusEventRepository.kt`:
  ```kotlin
  package com.routr.event

  import org.springframework.data.jpa.repository.JpaRepository
  import java.time.Instant
  import java.util.UUID

  interface StatusEventRepository : JpaRepository<StatusEvent, UUID> {
      fun findByTripIdOrderByOccurredAtAsc(tripId: UUID): List<StatusEvent>
      fun findByTripIdAndOccurredAtGreaterThanOrderByOccurredAtAsc(tripId: UUID, after: Instant): List<StatusEvent>
  }
  ```
- [ ] Create `backend/src/main/kotlin/com/routr/event/StatusEventService.kt`:
  ```kotlin
  package com.routr.event

  import com.routr.trip.Trip
  import com.routr.waypoint.Waypoint
  import org.springframework.stereotype.Service
  import java.time.Instant
  import java.util.UUID

  @Service
  class StatusEventService(private val statusEventRepository: StatusEventRepository) {

      fun record(trip: Trip, type: StatusEventType, waypoint: Waypoint? = null) {
          val event = StatusEvent(trip = trip, waypoint = waypoint, type = type)
          statusEventRepository.save(event)
      }

      fun findNewEvents(tripId: UUID, after: Instant?): List<StatusEvent> =
          if (after == null)
              statusEventRepository.findByTripIdOrderByOccurredAtAsc(tripId)
          else
              statusEventRepository.findByTripIdAndOccurredAtGreaterThanOrderByOccurredAtAsc(tripId, after)
  }
  ```

### Task 31: Write TripFacade

- [ ] Create `backend/src/main/kotlin/com/routr/trip/TripFacade.kt`:
  ```kotlin
  package com.routr.trip

  import com.routr.event.service.StatusEventService
  import com.routr.event.StatusEventType
  import com.routr.trip.dto.TripResponse
  import com.routr.trip.service.TripService
  import com.routr.waypoint.service.WaypointService
  import jakarta.transaction.Transactional
  import org.springframework.stereotype.Component
  import java.util.UUID

  @Component
  class TripFacade(
      private val tripService: TripService,
      private val waypointService: WaypointService,
      private val statusEventService: StatusEventService
  ) {
      fun getTripWithWaypoints(tripId: UUID, userId: String): TripResponse =
          tripService.findByIdAndUserId(tripId, userId).toResponse()

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

      @Transactional
      fun cancelTrip(tripId: UUID, userId: String): TripResponse {
          val trip = tripService.transitionStatus(tripId, userId, TripStatus.CANCELLED)
          statusEventService.record(trip, StatusEventType.TRIP_CANCELLED)
          return trip.toResponse()
      }
  }
  ```

### Task 33: Write TripController

- [ ] Create `backend/src/main/kotlin/com/routr/trip/TripController.kt`:
  ```kotlin
  package com.routr.trip

  import com.routr.common.security.clerkUserId
  import com.routr.trip.dto.CreateTripRequest
  import com.routr.trip.dto.TripResponse
  import com.routr.trip.dto.TripSummaryResponse
  import com.routr.trip.dto.UpdateTripRequest
  import com.routr.trip.service.TripService
  import jakarta.validation.Valid
  import org.springframework.http.HttpStatus
  import org.springframework.http.ResponseEntity
  import org.springframework.security.core.Authentication
  import org.springframework.web.bind.annotation.*
  import java.util.UUID

  @RestController
  @RequestMapping("/api/trips")
  class TripController(
      private val tripFacade: TripFacade,
      private val tripService: TripService
  ) {
      @GetMapping
      fun listTrips(auth: Authentication): ResponseEntity<List<TripSummaryResponse>> =
          ResponseEntity.ok(tripService.listTrips(auth.clerkUserId()))

      @PostMapping
      fun createTrip(
          @Valid @RequestBody request: CreateTripRequest,
          auth: Authentication
      ): ResponseEntity<TripResponse> =
          ResponseEntity.status(HttpStatus.CREATED)
              .body(tripService.createTrip(auth.clerkUserId(), request))

      @GetMapping("/{id}")
      fun getTrip(@PathVariable id: UUID, auth: Authentication): ResponseEntity<TripResponse> =
          ResponseEntity.ok(tripFacade.getTripWithWaypoints(id, auth.clerkUserId()))

      @PutMapping("/{id}")
      fun updateTrip(
          @PathVariable id: UUID,
          @Valid @RequestBody request: UpdateTripRequest,
          auth: Authentication
      ): ResponseEntity<TripResponse> =
          ResponseEntity.ok(tripService.updateTrip(id, auth.clerkUserId(), request))

      @DeleteMapping("/{id}")
      fun deleteTrip(@PathVariable id: UUID, auth: Authentication): ResponseEntity<Void> {
          tripService.deleteTrip(id, auth.clerkUserId())
          return ResponseEntity.noContent().build()
      }

      @PostMapping("/{id}/start")
      fun startTrip(@PathVariable id: UUID, auth: Authentication): ResponseEntity<TripResponse> =
          ResponseEntity.ok(tripFacade.startTrip(id, auth.clerkUserId()))

      @PostMapping("/{id}/complete")
      fun completeTrip(@PathVariable id: UUID, auth: Authentication): ResponseEntity<TripResponse> =
          ResponseEntity.ok(tripFacade.completeTrip(id, auth.clerkUserId()))

      @PostMapping("/{id}/cancel")
      fun cancelTrip(@PathVariable id: UUID, auth: Authentication): ResponseEntity<TripResponse> =
          ResponseEntity.ok(tripFacade.cancelTrip(id, auth.clerkUserId()))
  }
  ```

### Task 34: Build and manually test Trip CRUD

- [ ] Build:
  ```bash
  ./gradlew build
  ```
  Expected: `BUILD SUCCESSFUL`
- [ ] Boot: `./gradlew bootRun --args='--spring.profiles.active=local'`
- [ ] Get a real Clerk JWT: log into your Clerk dashboard → **Users** → pick any user (or create one in your app) → copy their JWT. In Postman, set header `Authorization: Bearer <token>`.
- [ ] Test sequence in Postman:
  1. `POST /api/trips` body `{"name":"Test Trip"}` → expect 201, response has `id` and `status: "DRAFT"`
  2. `GET /api/trips` → expect 200, array with one trip
  3. `GET /api/trips/{id}` → expect 200, trip with empty `waypoints` array
  4. `PUT /api/trips/{id}` body `{"name":"Renamed"}` → expect 200, name updated
  5. `POST /api/trips/{id}/start` → expect 200, `status: "ACTIVE"`
  6. `POST /api/trips/{id}/start` again → expect 422 `InvalidState` error
  7. `DELETE /api/trips/{id}` → expect 204
- [ ] Stop the server.
- [ ] Commit:
  ```bash
  git add backend/src/
  git commit -m "feat: Trip CRUD — repository, service, facade, controller, DTOs"
  ```

---

## Phase 5 — Waypoint CRUD

> **TDD order:** DTOs → RepositoryTest [🔴 RED] → Repository [🟢 GREEN] → ServiceTest [🔴 RED] → Service [🟢 GREEN] → Facade → Controller

### Task 35: Write remaining Waypoint DTOs

> Write DTOs first — tests need to import them to compile.

- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/dto/CreateWaypointRequest.kt`:
  ```kotlin
  package com.routr.waypoint.dto

  import jakarta.validation.constraints.DecimalMax
  import jakarta.validation.constraints.DecimalMin
  import jakarta.validation.constraints.NotBlank
  import java.math.BigDecimal
  import java.time.Instant

  data class CreateWaypointRequest(
      @field:NotBlank val name: String,
      @field:NotBlank val address: String,
      @field:DecimalMin("-90.0") @field:DecimalMax("90.0") val lat: BigDecimal,
      @field:DecimalMin("-180.0") @field:DecimalMax("180.0") val lng: BigDecimal,
      val estimatedArrival: Instant? = null,
      val notes: String? = null
  )
  ```
- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/dto/UpdateWaypointRequest.kt`:
  ```kotlin
  package com.routr.waypoint.dto

  import java.math.BigDecimal
  import java.time.Instant

  data class UpdateWaypointRequest(
      val name: String? = null,
      val address: String? = null,
      val lat: BigDecimal? = null,
      val lng: BigDecimal? = null,
      val estimatedArrival: Instant? = null,
      val notes: String? = null
  )
  ```
- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/dto/ReorderWaypointsRequest.kt`:
  ```kotlin
  package com.routr.waypoint.dto

  import java.util.UUID

  data class ReorderWaypointsRequest(val order: List<UUID>)
  ```

### Task 36: Write WaypointRepositoryTest [🔴 RED]

> Write this test BEFORE creating `WaypointRepository.kt`. It will fail to compile — that is the RED state confirming your test is actually testing something real.

- [ ] Create `backend/src/test/kotlin/com/routr/waypoint/WaypointRepositoryTest.kt`:
  ```kotlin
  package com.routr.waypoint

  import io.mockk.every
  import io.mockk.mockk
  import org.junit.jupiter.api.Assertions.*
  import org.junit.jupiter.api.Test
  import java.util.UUID

  class WaypointRepositoryTest {

      private val repo = mockk<WaypointRepository>()

      @Test
      fun `WaypointRepository has findByTripIdOrderByOrderAsc method`() {
          val tripId = UUID.randomUUID()
          every { repo.findByTripIdOrderByOrderAsc(tripId) } returns emptyList()
          val result = repo.findByTripIdOrderByOrderAsc(tripId)
          assertEquals(emptyList<Waypoint>(), result)
      }

      @Test
      fun `WaypointRepository has findByIdAndTripId method returning null when not found`() {
          val id = UUID.randomUUID()
          val tripId = UUID.randomUUID()
          every { repo.findByIdAndTripId(id, tripId) } returns null
          val result = repo.findByIdAndTripId(id, tripId)
          assertNull(result)
      }
  }
  ```
- [ ] Run the test:
  ```bash
  ./gradlew test --tests "com.routr.waypoint.WaypointRepositoryTest"
  ```
  Expected: **compilation FAIL** — `WaypointRepository` does not exist yet. This is the 🔴 RED state — correct!

### Task 37: Write WaypointRepository [🟢 GREEN]

- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/WaypointRepository.kt`:
  ```kotlin
  package com.routr.waypoint

  import org.springframework.data.jpa.repository.JpaRepository
  import java.util.UUID

  interface WaypointRepository : JpaRepository<Waypoint, UUID> {
      fun findByTripIdOrderByOrderAsc(tripId: UUID): List<Waypoint>
      fun findByIdAndTripId(id: UUID, tripId: UUID): Waypoint?
  }
  ```
- [ ] Run the test again:
  ```bash
  ./gradlew test --tests "com.routr.waypoint.WaypointRepositoryTest"
  ```
  Expected: **both tests pass** — 🟢 GREEN.
- [ ] Commit:
  ```bash
  git add backend/src/main/kotlin/com/routr/waypoint/WaypointRepository.kt \
          backend/src/test/kotlin/com/routr/waypoint/WaypointRepositoryTest.kt
  git commit -m "feat: WaypointRepository — TDD RED→GREEN"
  ```

### Task 38: Write WaypointServiceTest [🔴 RED]

> Write service tests BEFORE creating `WaypointService.kt`. Tests will fail to compile — that's the RED state.

- [ ] Create `backend/src/test/kotlin/com/routr/waypoint/WaypointServiceTest.kt`:
  ```kotlin
  package com.routr.waypoint

  import com.routr.common.exception.AppException
  import com.routr.trip.Trip
  import com.routr.waypoint.dto.CreateWaypointRequest
  import com.routr.waypoint.service.WaypointService
  import io.mockk.every
  import io.mockk.mockk
  import org.junit.jupiter.api.Assertions.*
  import org.junit.jupiter.api.Test
  import org.junit.jupiter.api.assertThrows
  import java.math.BigDecimal
  import java.util.UUID

  class WaypointServiceTest {

      private val repo = mockk<WaypointRepository>()
      private val service = WaypointService(repo)
      private val trip = Trip(userId = "user_test", name = "Trip")

      @Test
      fun `addWaypoint assigns order 1 when no existing waypoints`() {
          // Arrange
          every { repo.findByTripIdOrderByOrderAsc(trip.id) } returns emptyList()
          every { repo.save(any()) } answers { firstArg() }
          val request = CreateWaypointRequest(
              name = "Stop A", address = "Seoul", lat = BigDecimal("37.5"), lng = BigDecimal("127.0")
          )

          // Act
          val result = service.addWaypoint(trip, request)

          // Assert
          assertEquals(1, result.order)
      }

      @Test
      fun `addWaypoint assigns next order after existing waypoints`() {
          // Arrange
          val existing = Waypoint(trip = trip, order = 3, name = "C", address = "C",
              lat = BigDecimal("37.5"), lng = BigDecimal("127.0"))
          every { repo.findByTripIdOrderByOrderAsc(trip.id) } returns listOf(existing)
          every { repo.save(any()) } answers { firstArg() }
          val request = CreateWaypointRequest(
              name = "D", address = "D", lat = BigDecimal("37.6"), lng = BigDecimal("127.1")
          )

          // Act
          val result = service.addWaypoint(trip, request)

          // Assert
          assertEquals(4, result.order)
      }

      @Test
      fun `findByIdAndTripId throws NotFound when waypoint does not exist`() {
          // Arrange
          val waypointId = UUID.randomUUID()
          every { repo.findByIdAndTripId(waypointId, trip.id) } returns null

          // Act + Assert
          assertThrows<AppException.NotFound> {
              service.findByIdAndTripId(waypointId, trip.id)
          }
      }
  }
  ```
- [ ] Run the test:
  ```bash
  ./gradlew test --tests "com.routr.waypoint.WaypointServiceTest"
  ```
  Expected: **compilation FAIL** — `WaypointService` does not exist yet. This is the 🔴 RED state — correct!

### Task 39: Write WaypointService [🟢 GREEN]

- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/service/WaypointService.kt`:
  ```kotlin
  package com.routr.waypoint.service

  import com.routr.common.exception.AppException
  import com.routr.trip.Trip
  import com.routr.waypoint.Waypoint
  import com.routr.waypoint.WaypointRepository
  import com.routr.waypoint.WaypointStatus
  import com.routr.waypoint.dto.CreateWaypointRequest
  import com.routr.waypoint.dto.ReorderWaypointsRequest
  import com.routr.waypoint.dto.UpdateWaypointRequest
  import com.routr.waypoint.dto.WaypointResponse
  import com.routr.waypoint.toResponse
  import jakarta.transaction.Transactional
  import org.springframework.stereotype.Service
  import java.time.Instant
  import java.util.UUID

  @Service
  class WaypointService(private val waypointRepository: WaypointRepository) {

      fun addWaypoint(trip: Trip, request: CreateWaypointRequest): WaypointResponse {
          val nextOrder = (waypointRepository.findByTripIdOrderByOrderAsc(trip.id)
              .maxOfOrNull { it.order } ?: 0) + 1
          val waypoint = Waypoint(
              trip = trip,
              order = nextOrder,
              name = request.name,
              address = request.address,
              lat = request.lat,
              lng = request.lng,
              estimatedArrival = request.estimatedArrival,
              notes = request.notes
          )
          return waypointRepository.save(waypoint).toResponse()
      }

      fun updateWaypoint(tripId: UUID, waypointId: UUID, request: UpdateWaypointRequest): WaypointResponse {
          val waypoint = findByIdAndTripId(waypointId, tripId)
          request.name?.let { waypoint.name = it }
          request.address?.let { waypoint.address = it }
          request.lat?.let { waypoint.lat = it }
          request.lng?.let { waypoint.lng = it }
          request.estimatedArrival?.let { waypoint.estimatedArrival = it }
          request.notes?.let { waypoint.notes = it }
          return waypointRepository.save(waypoint).toResponse()
      }

      fun deleteWaypoint(tripId: UUID, waypointId: UUID) {
          val waypoint = findByIdAndTripId(waypointId, tripId)
          waypointRepository.delete(waypoint)
      }

      @Transactional
      fun reorderWaypoints(tripId: UUID, request: ReorderWaypointsRequest) {
          val waypointMap = waypointRepository.findByTripIdOrderByOrderAsc(tripId).associateBy { it.id }
          request.order.forEachIndexed { index, id ->
              waypointMap[id]?.order = index + 1
          }
          waypointRepository.saveAll(waypointMap.values)
      }

      fun markArrived(waypointId: UUID, tripId: UUID): Waypoint {
          val waypoint = findByIdAndTripId(waypointId, tripId)
          waypoint.status = WaypointStatus.ARRIVED
          waypoint.actualArrival = Instant.now()
          return waypointRepository.save(waypoint)
      }

      fun markSkipped(waypointId: UUID, tripId: UUID): Waypoint {
          val waypoint = findByIdAndTripId(waypointId, tripId)
          waypoint.status = WaypointStatus.SKIPPED
          return waypointRepository.save(waypoint)
      }

      fun findByIdAndTripId(waypointId: UUID, tripId: UUID): Waypoint =
          waypointRepository.findByIdAndTripId(waypointId, tripId)
              ?: throw AppException.NotFound("Waypoint", waypointId)
  }
  ```
- [ ] Run the tests again:
  ```bash
  ./gradlew test --tests "com.routr.waypoint.WaypointServiceTest"
  ```
  Expected: **all 3 tests pass** — 🟢 GREEN.
- [ ] Commit:
  ```bash
  git add backend/src/main/kotlin/com/routr/waypoint/service/ \
          backend/src/test/kotlin/com/routr/waypoint/WaypointServiceTest.kt
  git commit -m "feat: WaypointService — TDD RED→GREEN"
  ```

### Task 40: Write WaypointFacade

- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/WaypointFacade.kt`:
  ```kotlin
  package com.routr.waypoint

  import com.routr.event.StatusEventType
  import com.routr.event.service.StatusEventService
  import com.routr.trip.service.TripService
  import com.routr.waypoint.dto.WaypointResponse
  import com.routr.waypoint.service.WaypointService
  import jakarta.transaction.Transactional
  import org.springframework.stereotype.Component
  import java.util.UUID

  @Component
  class WaypointFacade(
      private val tripService: TripService,
      private val waypointService: WaypointService,
      private val statusEventService: StatusEventService
  ) {
      @Transactional
      fun arriveAtWaypoint(tripId: UUID, waypointId: UUID, userId: String): WaypointResponse {
          val trip = tripService.findByIdAndUserId(tripId, userId)
          val waypoint = waypointService.markArrived(waypointId, tripId)
          statusEventService.record(trip, StatusEventType.WAYPOINT_ARRIVED, waypoint)
          return waypoint.toResponse()
      }

      @Transactional
      fun skipWaypoint(tripId: UUID, waypointId: UUID, userId: String): WaypointResponse {
          val trip = tripService.findByIdAndUserId(tripId, userId)
          val waypoint = waypointService.markSkipped(waypointId, tripId)
          statusEventService.record(trip, StatusEventType.WAYPOINT_SKIPPED, waypoint)
          return waypoint.toResponse()
      }
  }
  ```

### Task 41: Write WaypointController

- [ ] Create `backend/src/main/kotlin/com/routr/waypoint/WaypointController.kt`:
  ```kotlin
  package com.routr.waypoint

  import com.routr.common.security.clerkUserId
  import com.routr.trip.service.TripService
  import com.routr.waypoint.dto.CreateWaypointRequest
  import com.routr.waypoint.dto.ReorderWaypointsRequest
  import com.routr.waypoint.dto.UpdateWaypointRequest
  import com.routr.waypoint.dto.WaypointResponse
  import com.routr.waypoint.service.WaypointService
  import jakarta.validation.Valid
  import org.springframework.http.HttpStatus
  import org.springframework.http.ResponseEntity
  import org.springframework.security.core.Authentication
  import org.springframework.web.bind.annotation.*
  import java.util.UUID

  @RestController
  @RequestMapping("/api/trips/{tripId}/waypoints")
  class WaypointController(
      private val tripService: TripService,
      private val waypointService: WaypointService,
      private val waypointFacade: WaypointFacade
  ) {
      @PostMapping
      fun addWaypoint(
          @PathVariable tripId: UUID,
          @Valid @RequestBody request: CreateWaypointRequest,
          auth: Authentication
      ): ResponseEntity<WaypointResponse> {
          val trip = tripService.findByIdAndUserId(tripId, auth.clerkUserId())
          return ResponseEntity.status(HttpStatus.CREATED)
              .body(waypointService.addWaypoint(trip, request))
      }

      @PutMapping("/{waypointId}")
      fun updateWaypoint(
          @PathVariable tripId: UUID,
          @PathVariable waypointId: UUID,
          @Valid @RequestBody request: UpdateWaypointRequest,
          auth: Authentication
      ): ResponseEntity<WaypointResponse> {
          tripService.findByIdAndUserId(tripId, auth.clerkUserId())
          return ResponseEntity.ok(waypointService.updateWaypoint(tripId, waypointId, request))
      }

      @DeleteMapping("/{waypointId}")
      fun deleteWaypoint(
          @PathVariable tripId: UUID,
          @PathVariable waypointId: UUID,
          auth: Authentication
      ): ResponseEntity<Void> {
          tripService.findByIdAndUserId(tripId, auth.clerkUserId())
          waypointService.deleteWaypoint(tripId, waypointId)
          return ResponseEntity.noContent().build()
      }

      @PutMapping("/reorder")
      fun reorderWaypoints(
          @PathVariable tripId: UUID,
          @RequestBody request: ReorderWaypointsRequest,
          auth: Authentication
      ): ResponseEntity<Map<String, Boolean>> {
          tripService.findByIdAndUserId(tripId, auth.clerkUserId())
          waypointService.reorderWaypoints(tripId, request)
          return ResponseEntity.ok(mapOf("ok" to true))
      }

      @PostMapping("/{waypointId}/arrive")
      fun arriveAtWaypoint(
          @PathVariable tripId: UUID,
          @PathVariable waypointId: UUID,
          auth: Authentication
      ): ResponseEntity<WaypointResponse> =
          ResponseEntity.ok(waypointFacade.arriveAtWaypoint(tripId, waypointId, auth.clerkUserId()))

      @PostMapping("/{waypointId}/skip")
      fun skipWaypoint(
          @PathVariable tripId: UUID,
          @PathVariable waypointId: UUID,
          auth: Authentication
      ): ResponseEntity<WaypointResponse> =
          ResponseEntity.ok(waypointFacade.skipWaypoint(tripId, waypointId, auth.clerkUserId()))
  }
  ```

### Task 42: Build and manually test Waypoint CRUD

- [ ] Run all tests:
  ```bash
  ./gradlew test
  ```
  Expected: all tests pass.
- [ ] Boot: `./gradlew bootRun --args='--spring.profiles.active=local'`
- [ ] Test sequence in Postman (use the trip `id` from Phase 4 testing, or create a new one):
  1. `POST /api/trips/{id}/waypoints` body:
     ```json
     {"name":"City Hall","address":"Seoul City Hall","lat":37.566535,"lng":126.977969}
     ```
     → expect 201, `order: 1`
  2. `POST /api/trips/{id}/waypoints` with a second location → expect 201, `order: 2`
  3. `PUT /api/trips/{id}/waypoints/reorder` body `{"order":["<id2>","<id1>"]}` → expect 200 `{"ok":true}`
  4. `GET /api/trips/{id}` → confirm waypoints are now in reversed order
  5. `POST /api/trips/{id}/start` → put trip in ACTIVE state first
  6. `POST /api/trips/{id}/waypoints/{wid}/arrive` → expect 200, `status: "ARRIVED"`
- [ ] Stop the server.
- [ ] Commit:
  ```bash
  git add backend/src/
  git commit -m "feat: Waypoint CRUD — facade, controller"
  ```

---

## Phase 6 — SSE

### Task 43: Write SseController

- [ ] Create `backend/src/main/kotlin/com/routr/event/SseController.kt`:
  ```kotlin
  package com.routr.event

  import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
  import com.routr.common.security.clerkUserId
  import com.routr.event.service.StatusEventService
  import com.routr.trip.service.TripService
  import org.springframework.http.MediaType
  import org.springframework.scheduling.TaskScheduler
  import org.springframework.security.core.Authentication
  import org.springframework.web.bind.annotation.*
  import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
  import java.time.Duration
  import java.util.UUID

  @RestController
  @RequestMapping("/api/trips/{tripId}/events")
  class SseController(
      private val tripService: TripService,
      private val statusEventService: StatusEventService,
      private val taskScheduler: TaskScheduler
  ) {
      private val mapper = jacksonObjectMapper().apply { findAndRegisterModules() }

      @GetMapping(produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
      fun streamEvents(
          @PathVariable tripId: UUID,
          auth: Authentication
      ): SseEmitter {
          tripService.findByIdAndUserId(tripId, auth.clerkUserId())

          val emitter = SseEmitter(300_000L)
          var lastSeenAt: java.time.Instant? = null

          val task = taskScheduler.scheduleAtFixedRate({
              try {
                  val newEvents = statusEventService.findNewEvents(tripId, lastSeenAt)
                  newEvents.forEach { event ->
                      emitter.send(
                          SseEmitter.event()
                              .id(event.id.toString())
                              .name(event.type.name.lowercase())
                              .data(mapper.writeValueAsString(mapOf(
                                  "id" to event.id,
                                  "type" to event.type,
                                  "tripId" to event.trip.id,
                                  "waypointId" to event.waypoint?.id,
                                  "occurredAt" to event.occurredAt
                              )))
                      )
                      lastSeenAt = event.occurredAt
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
- [ ] Create `backend/src/main/kotlin/com/routr/common/config/SchedulerConfig.kt`:
  ```kotlin
  package com.routr.common.config

  import org.springframework.context.annotation.Bean
  import org.springframework.context.annotation.Configuration
  import org.springframework.scheduling.TaskScheduler
  import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler

  @Configuration
  class SchedulerConfig {
      @Bean
      fun taskScheduler(): TaskScheduler =
          ThreadPoolTaskScheduler().apply { poolSize = 5; initialize() }
  }
  ```

### Task 44: Build, test SSE stream

- [ ] Run all tests:
  ```bash
  ./gradlew test
  ```
  Expected: all pass.
- [ ] Boot the app.
- [ ] In Postman, open a new request → GET `http://localhost:8080/api/trips/{id}/events` with the Clerk JWT header → switch response type to **SSE / Stream**.
- [ ] In a second Postman tab, `POST /api/trips/{id}/start` → you should see a `trip_started` event appear in the SSE stream within 2 seconds.
- [ ] `POST /api/trips/{id}/waypoints/{wid}/arrive` → you should see a `waypoint_arrived` event.
- [ ] Stop the server.
- [ ] Commit:
  ```bash
  git add backend/src/
  git commit -m "feat: SSE stream for real-time trip status events"
  ```

---

## Phase 7 — Deploy to Railway

### Task 45: Write Dockerfile

- [ ] Create `backend/Dockerfile`:
  ```dockerfile
  FROM eclipse-temurin:21-jre-alpine
  WORKDIR /app
  COPY build/libs/*.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "app.jar"]
  ```

### Task 46: Deploy to Railway

- [ ] Build the fat jar:
  ```bash
  ./gradlew bootJar
  ```
  Expected: `backend/build/libs/backend-0.0.1-SNAPSHOT.jar` created.
- [ ] Go to railway.app → sign up → **New Project** → **Deploy from GitHub repo** → select `jameslee1237/RoutR`.
- [ ] Set the **Root Directory** to `backend` in Railway settings.
- [ ] Add environment variables in Railway dashboard:
  ```
  DATABASE_URL=jdbc:postgresql://your-neon-host/routr?sslmode=require&channel_binding=require
  CLERK_JWKS_URL=https://your-clerk-domain/.well-known/jwks.json
  CLERK_ISSUER_URI=https://your-clerk-domain
  FRONTEND_URL=https://routr.vercel.app
  SPRING_DATASOURCE_USERNAME=neondb_owner
  SPRING_DATASOURCE_PASSWORD=your-password
  ```
- [ ] Trigger a deploy. Watch the build logs — expected: `Started RoutrApplication`.
- [ ] Copy the Railway public URL (e.g. `https://routr-backend.up.railway.app`).
- [ ] Verify:
  ```bash
  curl https://your-railway-url/actuator/health
  ```
  Expected: `{"status":"UP"}`
- [ ] Commit the Dockerfile:
  ```bash
  git add backend/Dockerfile
  git commit -m "feat: add Dockerfile for Railway deployment"
  ```

---

## Backend Complete ✓

All endpoints working and deployed:

| Method | Path | Auth |
|---|---|---|
| GET | `/actuator/health` | None |
| GET | `/api/trips` | JWT |
| POST | `/api/trips` | JWT |
| GET | `/api/trips/{id}` | JWT |
| PUT | `/api/trips/{id}` | JWT |
| DELETE | `/api/trips/{id}` | JWT |
| POST | `/api/trips/{id}/start` | JWT |
| POST | `/api/trips/{id}/complete` | JWT |
| POST | `/api/trips/{id}/cancel` | JWT |
| POST | `/api/trips/{id}/waypoints` | JWT |
| PUT | `/api/trips/{id}/waypoints/{wid}` | JWT |
| DELETE | `/api/trips/{id}/waypoints/{wid}` | JWT |
| PUT | `/api/trips/{id}/waypoints/reorder` | JWT |
| POST | `/api/trips/{id}/waypoints/{wid}/arrive` | JWT |
| POST | `/api/trips/{id}/waypoints/{wid}/skip` | JWT |
| GET | `/api/trips/{id}/events` | JWT (SSE) |

**Next:** see `2026-06-16-routr-frontend.md` for the frontend plan.
