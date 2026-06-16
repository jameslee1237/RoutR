package com.routr.event.service

import org.springframework.stereotype.Service
import com.routr.event.StatusEventRepository
import com.routr.event.StatusEvent
import com.routr.event.StatusEventType
import com.routr.trip.Trip
import com.routr.waypoint.Waypoint
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