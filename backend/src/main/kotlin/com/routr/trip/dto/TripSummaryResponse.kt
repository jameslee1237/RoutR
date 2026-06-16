package com.routr.trip.dto

import java.util.UUID
import java.time.Instant
import com.routr.trip.TripStatus

data class TripSummaryResponse(
    val id: UUID,
    val name: String,
    val status: TripStatus,
    val waypointCount: Int,
    val createdAt: Instant
)