package com.routr.trip.dto

import java.util.UUID
import java.time.Instant
import com.routr.trip.TripStatus
import com.routr.waypoint.dto.WaypointResponse

data class TripResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val status: TripStatus,
    val waypoints: List<WaypointResponse>,
    val createdAt: Instant,
    val updatedAt: Instant
)