package com.routr.waypoint.service

import com.routr.waypoint.WaypointRepository
import com.routr.trip.Trip
import com.routr.waypoint.dto.CreateWaypointRequest
import com.routr.waypoint.dto.WaypointResponse
import com.routr.waypoint.Waypoint
import com.routr.waypoint.toResponse
import com.routr.common.exception.AppException
import java.util.UUID
import com.routr.waypoint.dto.UpdateWaypointRequest
import com.routr.waypoint.dto.ReorderWaypointsRequest
import com.routr.waypoint.WaypointStatus
import java.time.Instant
import org.springframework.stereotype.Service
import jakarta.transaction.Transactional

@Service
@Transactional
class WaypointService(
    private val waypointRepository: WaypointRepository
) {
    fun addWaypoint(trip: Trip, request: CreateWaypointRequest): WaypointResponse {
        val nextOrder = (waypointRepository.findByTripIdOrderByOrderAsc(trip.id).maxOfOrNull { it.order } ?: 0) + 1
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

    fun findByIdAndTripId(waypointId: UUID, tripId: UUID): Waypoint {
        return waypointRepository.findByIdAndTripId(waypointId, tripId)
            ?: throw AppException.NotFound("Waypoint", waypointId)
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
}