package com.routr.trip

import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import com.routr.trip.TripFacade
import com.routr.trip.service.TripService
import org.springframework.security.core.Authentication
import org.springframework.http.ResponseEntity
import com.routr.trip.dto.TripSummaryResponse
import com.routr.common.security.clerkUserId
import org.springframework.http.HttpStatus
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.RequestBody
import com.routr.trip.dto.CreateTripRequest
import com.routr.trip.dto.TripResponse
import java.util.UUID
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import com.routr.trip.dto.UpdateTripRequest
import org.springframework.web.bind.annotation.DeleteMapping

@RestController
@RequestMapping("/api/trips")
class TripController(
    private val tripFacade: TripFacade,
    private val tripService: TripService
) {
    @GetMapping
    fun listTrips(authentication: Authentication): ResponseEntity<List<TripSummaryResponse>> {
        val userId = authentication.clerkUserId()
        val trips = tripService.listTrips(userId)
        return ResponseEntity.ok(trips)
    }

    @PostMapping
    fun createTrip(authentication: Authentication, @Valid @RequestBody request: CreateTripRequest): ResponseEntity<TripResponse> {
        val userId = authentication.clerkUserId()
        val trip = tripService.createTrip(userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(trip)
    }

    @GetMapping("/{id}")    
    fun getTrip(authentication: Authentication, @PathVariable id: UUID): ResponseEntity<TripResponse> {
        val userId = authentication.clerkUserId()
        val trip = tripFacade.getTripWithWaypoints(id, userId)
        return ResponseEntity.ok(trip)
    }

    @PutMapping("/{id}")
    fun updateTrip(authentication: Authentication, @PathVariable id: UUID, @Valid @RequestBody request: UpdateTripRequest): ResponseEntity<TripResponse> {
        val userId = authentication.clerkUserId()
        val trip = tripService.updateTrip(id, userId, request)
        return ResponseEntity.ok(trip)
    }

    @DeleteMapping("/{id}")
    fun deleteTrip(authentication: Authentication, @PathVariable id: UUID): ResponseEntity<Void> {
        val userId = authentication.clerkUserId()
        tripService.deleteTrip(id, userId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/start")
    fun startTrip(authentication: Authentication, @PathVariable id: UUID): ResponseEntity<TripResponse> {
        val userId = authentication.clerkUserId()
        val trip = tripFacade.startTrip(id, userId)
        return ResponseEntity.ok(trip)
    }

    @PostMapping("/{id}/complete")
    fun completeTrip(authentication: Authentication, @PathVariable id: UUID): ResponseEntity<TripResponse> {
        val userId = authentication.clerkUserId()
        val trip = tripFacade.completeTrip(id, userId)
        return ResponseEntity.ok(trip)
    }

    @PostMapping("/{id}/cancel")
    fun cancelTrip(authentication: Authentication, @PathVariable id: UUID): ResponseEntity<TripResponse> {
        val userId = authentication.clerkUserId()
        val trip = tripFacade.cancelTrip(id, userId)
        return ResponseEntity.ok(trip)
    }
}