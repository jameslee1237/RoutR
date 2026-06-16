package com.routr.waypoint

import com.routr.waypoint.dto.WaypointResponse

fun Waypoint.toResponse() = WaypointResponse(
    id = id,
    tripId = trip.id,
    order = order,
    name = name,
    address = address,
    lat = lat,
    lng = lng,
    estimatedArrival = estimatedArrival,
    actualArrival = actualArrival,
    status = status,
    notes = notes,
    createdAt = createdAt
)