package com.routr.trip

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID
import com.routr.waypoint.Waypoint

@Entity
@Table(name = "trips")
class Trip(
    @Id
    val id: UUID = UUID.randomUUID(),
    @Column(nullable = false)
    val userId: String,
    @Column(nullable = false)
    var name: String,
    @Column(columnDefinition = "TEXT")
    var description: String? = null,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: TripStatus = TripStatus.DRAFT,
    @OneToMany(mappedBy = "trip", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    @OrderBy("order ASC")
    var waypoints: MutableList<Waypoint> = mutableListOf(),
    @Column(nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
    @Column(nullable = false)
    var updatedAt: Instant = Instant.now()
)