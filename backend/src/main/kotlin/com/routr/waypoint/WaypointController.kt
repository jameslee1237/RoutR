package com.routr.waypoint

import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import jakarta.validation.Valid
import com.routr.trip.service.TripService
import com.routr.waypoint.service.WaypointService
import com.routr.waypoint.WaypointFacade
import java.util.UUID
import com.routr.waypoint.dto.CreateWaypointRequest
import com.routr.waypoint.dto.WaypointResponse
import com.routr.common.security.clerkUserId
import org.springframework.security.core.Authentication
import org.springframework.http.ResponseEntity
import org.springframework.http.HttpStatus
import com.routr.waypoint.dto.UpdateWaypointRequest
import org.springframework.web.bind.annotation.PutMapping
import com.routr.waypoint.dto.ReorderWaypointsRequest
import org.springframework.web.bind.annotation.DeleteMapping

@RestController
@RequestMapping("/api/trips/{tripId}/waypoints")
class WaypointController(
    private val tripService: TripService,
    private val waypointService: WaypointService,
    private val waypointFacade: WaypointFacade
) {
    @PostMapping
    fun addWaypoint(authentication: Authentication, @PathVariable tripId: UUID, @Valid @RequestBody request: CreateWaypointRequest): ResponseEntity<WaypointResponse> {
        val userId = authentication.clerkUserId()
        val trip = tripService.findByIdAndUserId(tripId, userId)
        val waypoint = waypointService.addWaypoint(trip, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(waypoint)
    }

    @PutMapping("/{waypointId}")
    fun updateWaypoint(authentication: Authentication, @PathVariable tripId: UUID, @PathVariable waypointId: UUID, @Valid @RequestBody request: UpdateWaypointRequest): ResponseEntity<WaypointResponse> {
        val userId = authentication.clerkUserId()
        tripService.findByIdAndUserId(tripId, userId)
        val waypoint = waypointService.updateWaypoint(tripId, waypointId, request)
        return ResponseEntity.ok(waypoint)
    }

    @DeleteMapping("/{waypointId}")
    fun deleteWaypoint(authentication: Authentication, @PathVariable tripId: UUID, @PathVariable waypointId: UUID): ResponseEntity<Void> {
        val userId = authentication.clerkUserId()
        tripService.findByIdAndUserId(tripId, userId)
        waypointService.deleteWaypoint(tripId, waypointId)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/reorder")
    fun reorderWaypoints(authentication: Authentication, @PathVariable tripId: UUID, @RequestBody request: ReorderWaypointsRequest): ResponseEntity<Map<String, Boolean>> {
        val userId = authentication.clerkUserId()
        tripService.findByIdAndUserId(tripId, userId)
        waypointService.reorderWaypoints(tripId, request)
        return ResponseEntity.ok(mapOf("ok" to true))
    }

    @PostMapping("/{waypointId}/arrive")
    fun arriveAtWaypoint(authentication: Authentication, @PathVariable tripId: UUID, @PathVariable waypointId: UUID): ResponseEntity<WaypointResponse> {
        val userId = authentication.clerkUserId()
        val waypoint = waypointFacade.arriveAtWaypoint(tripId, waypointId, userId)
        return ResponseEntity.ok(waypoint)
    }

    @PostMapping("/{waypointId}/skip")
    fun skipWaypoint(authentication: Authentication, @PathVariable tripId: UUID, @PathVariable waypointId: UUID): ResponseEntity<WaypointResponse> {
        val userId = authentication.clerkUserId()
        val waypoint = waypointFacade.skipWaypoint(tripId, waypointId, userId)
        return ResponseEntity.ok(waypoint)
    }
}