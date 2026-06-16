package com.routr.trip

import com.routr.trip.dto.TripResponse
import com.routr.trip.dto.TripSummaryResponse
import com.routr.waypoint.toResponse

fun Trip.toResponse() = TripResponse(
    id = id,
    name = name,
    description = description,
    status = status,
    waypoints = waypoints.map { it.toResponse() },
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Trip.toSummaryResponse() = TripSummaryResponse(
    id = id,
    name = name,
    status = status,
    waypointCount = waypoints.size,
    createdAt = createdAt
)