package com.routr.trip

import org.springframework.stereotype.Component
import com.routr.trip.service.TripService
import com.routr.event.service.StatusEventService
import java.util.UUID
import com.routr.trip.dto.TripResponse
import com.routr.trip.TripStatus
import com.routr.event.StatusEventType
import jakarta.transaction.Transactional

@Component
class TripFacade(
    private val tripService: TripService, 
    private val statusEventService: StatusEventService
) {
    fun getTripWithWaypoints(tripId: UUID, userId: String): TripResponse {
        val trip = tripService.findByIdAndUserId(tripId, userId)
        return trip.toResponse()
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

    @Transactional
    fun cancelTrip(tripId: UUID, userId: String): TripResponse {
        val trip = tripService.transitionStatus(tripId, userId, TripStatus.CANCELLED)
        statusEventService.record(trip, StatusEventType.TRIP_CANCELLED)
        return trip.toResponse()
    }
}
