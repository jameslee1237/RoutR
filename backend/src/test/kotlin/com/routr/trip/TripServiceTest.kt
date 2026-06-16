package com.routr.trip

import io.mockk.mockk
import org.junit.jupiter.api.Test
import io.mockk.every
import com.routr.trip.dto.CreateTripRequest
import org.junit.jupiter.api.Assertions.assertEquals
import io.mockk.verify
import org.junit.jupiter.api.assertThrows
import com.routr.common.exception.AppException
import com.routr.trip.service.TripService
import java.util.UUID
import com.routr.trip.TripRepository

class TripServiceTest {
    private val repo = mockk<TripRepository>()
    private val service = TripService(repo)
    private val userId = "user_clerk_test123"

    @Test
    fun `createTrip saves trip and returns response with correct name`() {
        // Arrange
        every { repo.save(any()) } answers { firstArg() }

        // Act
        val result = service.createTrip(userId, CreateTripRequest(name = "Seoul Run"))

        // Assert
        assertEquals("Seoul Run", result.name)
        verify(exactly = 1) { repo.save(any()) }
    }

    @Test
    fun `findByIdAndUserId throws NotFound when trip does not exist`() {
        // Arrange
        val tripId = UUID.randomUUID()
        every { repo.findByIdAndUserId(tripId, userId) } returns null

        // Act
        assertThrows<AppException.NotFound> { service.findByIdAndUserId(tripId, userId) }
    }

    @Test
    fun `transitionStatus throws InvalidState for illegal transition`() {
        // Arrange
        val trip = Trip(userId = userId, name = "Test").apply { status = TripStatus.COMPLETED }
        every { repo.findByIdAndUserId(trip.id, userId) } returns trip

        // Act
        assertThrows<AppException.InvalidState> { service.transitionStatus(trip.id, userId, TripStatus.ACTIVE) }
    }

    @Test
    fun `transitionStatus DRAFT to ACTIVE saves and returns updated trip`() {
        // Arrange
        val trip = Trip(userId = userId, name = "Test")
        every { repo.findByIdAndUserId(trip.id, userId) } returns trip
        every { repo.save(trip) } returns trip

        // Act
        val result = service.transitionStatus(trip.id, userId, TripStatus.ACTIVE)

        // Assert
        assertEquals(TripStatus.ACTIVE, result.status)
        verify(exactly = 1) { repo.save(trip) }
    }
}