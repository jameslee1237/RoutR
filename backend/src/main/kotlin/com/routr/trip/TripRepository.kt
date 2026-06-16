package com.routr.trip

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface TripRepository: JpaRepository<Trip, UUID> {
    fun findByIdAndUserId(id: UUID, userId: String): Trip?
    fun findByUserIdOrderByCreatedAtDesc(userId: String): List<Trip>
}