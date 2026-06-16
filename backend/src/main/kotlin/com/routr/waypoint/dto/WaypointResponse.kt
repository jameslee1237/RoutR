package com.routr.waypoint.dto

import java.util.UUID
import java.math.BigDecimal
import java.time.Instant
import com.routr.waypoint.WaypointStatus

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