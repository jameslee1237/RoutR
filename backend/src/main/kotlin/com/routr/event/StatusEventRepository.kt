package com.routr.event

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID
import java.time.Instant

interface StatusEventRepository: JpaRepository<StatusEvent, UUID> {
    fun findByTripIdOrderByOccurredAtAsc(tripId: UUID): List<StatusEvent>
    fun findByTripIdAndOccurredAtGreaterThanOrderByOccurredAtAsc(tripId: UUID, after: Instant): List<StatusEvent>
}