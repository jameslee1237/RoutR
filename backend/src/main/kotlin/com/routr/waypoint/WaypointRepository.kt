package com.routr.waypoint

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface WaypointRepository: JpaRepository<Waypoint, UUID> {
    fun findByTripIdOrderByOrderAsc(tripId: UUID): List<Waypoint>
    fun findByIdAndTripId(id: UUID, tripId: UUID): Waypoint?
}