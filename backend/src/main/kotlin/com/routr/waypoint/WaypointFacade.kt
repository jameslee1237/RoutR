package com.routr.waypoint

import org.springframework.stereotype.Component
import com.routr.trip.service.TripService
import com.routr.waypoint.service.WaypointService
import com.routr.event.service.StatusEventService
import java.util.UUID
import com.routr.waypoint.dto.WaypointResponse
import com.routr.event.StatusEventType
import jakarta.transaction.Transactional

@Component
@Transactional
class WaypointFacade(
    private val tripService: TripService,
    private val waypointService: WaypointService,
    private val statusEventService: StatusEventService
) {
    fun arriveAtWaypoint(tripId: UUID, waypointId: UUID, userId: String): WaypointResponse {
        val trip = tripService.findByIdAndUserId(tripId, userId)
        val waypoint = waypointService.markArrived(waypointId, tripId)
        statusEventService.record(trip, StatusEventType.WAYPOINT_ARRIVED, waypoint)
        return waypoint.toResponse()
    }

    fun skipWaypoint(tripId: UUID, waypointId: UUID, userId: String): WaypointResponse {
        val trip = tripService.findByIdAndUserId(tripId, userId)
        val waypoint = waypointService.markSkipped(waypointId, tripId)
        statusEventService.record(trip, StatusEventType.WAYPOINT_SKIPPED, waypoint)
        return waypoint.toResponse()
    }
}