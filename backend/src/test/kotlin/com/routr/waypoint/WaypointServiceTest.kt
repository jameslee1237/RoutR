package com.routr.waypoint

import io.mockk.mockk
import com.routr.waypoint.service.WaypointService
import com.routr.trip.Trip
import org.junit.jupiter.api.Test
import io.mockk.every
import org.junit.jupiter.api.Assertions.assertEquals
import java.math.BigDecimal
import com.routr.waypoint.dto.CreateWaypointRequest
import com.routr.waypoint.WaypointRepository
import com.routr.common.exception.AppException
import org.junit.jupiter.api.assertThrows
import java.util.UUID
import com.routr.waypoint.dto.ReorderWaypointsRequest

class WaypointServiceTest {
    private val repo = mockk<WaypointRepository>()
    private val service = WaypointService(repo)
    private val trip = Trip(userId = "user_test", name = "Trip")

    @Test
    fun `addWaypoint assigns order 1 when no existing waypoints`() {
        // Arrange
        every { repo.findByTripIdOrderByOrderAsc(trip.id) } returns emptyList()
        every { repo.save(any()) } answers { firstArg() }
        val request = CreateWaypointRequest(name = "Stop A", address = "Seoul", lat = BigDecimal("37.5"), lng = BigDecimal("127.0"))

        // Act
        val result = service.addWaypoint(trip, request)
        
        // Assert
        assertEquals(1, result.order)
    }

    @Test
    fun `addWaypoint assigns next order after existing waypoints`() {
        // Arrange
        val existing = Waypoint(trip = trip, order = 3, name = "C", address = "C", lat = BigDecimal("37.5"), lng = BigDecimal("127.0"))
        every { repo.findByTripIdOrderByOrderAsc(trip.id) } returns listOf(existing)
        every { repo.save(any()) } answers { firstArg() }
        val request = CreateWaypointRequest(name = "D", address = "D", lat = BigDecimal("37.6"), lng = BigDecimal("127.1"))

        // Act
        val result = service.addWaypoint(trip, request)
        
        // Assert
        assertEquals(4, result.order)
    }

    @Test
    fun `findByIdAndTripId throws NotFound when waypoint does not exist`() {
        // Arrange
        val waypointId = UUID.randomUUID()
        every { repo.findByIdAndTripId(waypointId, trip.id) } returns null

        // Act + Assert
        assertThrows<AppException.NotFound> {
            service.findByIdAndTripId(waypointId, trip.id)
        }
    }

    @Test
    fun `reorderWaypoints sets correct order for each waypoint`() {
        // Arrange
        val waypoints = listOf(
            Waypoint(trip = trip, order = 1, name = "A", address = "A", lat = BigDecimal("37.5"), lng = BigDecimal("127.0")),
            Waypoint(trip = trip, order = 2, name = "B", address = "B", lat = BigDecimal("37.6"), lng = BigDecimal("127.1")),
            Waypoint(trip = trip, order = 3, name = "C", address = "C", lat = BigDecimal("37.7"), lng = BigDecimal("127.2"))
        )
        every { repo.findByTripIdOrderByOrderAsc(trip.id) } returns waypoints
        every { repo.saveAll(any<Iterable<Waypoint>>()) } returns emptyList()
        val request = ReorderWaypointsRequest(order = listOf(waypoints[1].id, waypoints[0].id, waypoints[2].id))

        // Act
        service.reorderWaypoints(trip.id, request)

        // Assert
        assertEquals(listOf(2, 1, 3), waypoints.map { it.order })
    }
}