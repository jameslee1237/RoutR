package com.routr.trip.service

import org.springframework.stereotype.Service
import com.routr.trip.TripRepository
import com.routr.trip.dto.CreateTripRequest
import com.routr.trip.dto.TripResponse
import com.routr.trip.Trip
import com.routr.trip.toResponse
import com.routr.common.exception.AppException
import java.util.UUID
import com.routr.trip.TripStatus
import com.routr.trip.dto.TripSummaryResponse
import com.routr.trip.toSummaryResponse
import java.time.Instant
import com.routr.trip.dto.UpdateTripRequest

@Service
class TripService(private val tripRepository: TripRepository) {
    fun createTrip(userId: String, request: CreateTripRequest): TripResponse {
        val trip = Trip(userId = userId, name = request.name, description = request.description)
        return tripRepository.save(trip).toResponse()
    }

    fun findByIdAndUserId(tripId: UUID, userId: String): Trip =
        tripRepository.findByIdAndUserId(tripId, userId)
            ?: throw AppException.NotFound("Trip", tripId)

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

    fun listTrips(userId: String): List<TripSummaryResponse> =
        tripRepository.findByUserIdOrderByCreatedAtDesc(userId).map { it.toSummaryResponse() }

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
}