package com.routr.waypoint

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.util.UUID
import org.junit.jupiter.api.Assertions.assertNull
import com.routr.waypoint.WaypointRepository
import com.routr.waypoint.Waypoint

class WaypointRepositoryTest {
    private val repo = mockk<WaypointRepository>()

    @Test
    fun `WaypointRepository has findByTripIdOrderByOrderAsc method`() {
        val tripId = UUID.randomUUID()
        every { repo.findByTripIdOrderByOrderAsc(tripId) } returns emptyList()
        val result = repo.findByTripIdOrderByOrderAsc(tripId)
        assertEquals(emptyList<Waypoint>(), result)
    }

    @Test
    fun `WaypointRepository has findByIdAndTripId method returning null when not found`() {
        val id = UUID.randomUUID()
        val tripId = UUID.randomUUID()
        every { repo.findByIdAndTripId(id, tripId) } returns null
        val result = repo.findByIdAndTripId(id, tripId)
        assertNull(result)
    }
}