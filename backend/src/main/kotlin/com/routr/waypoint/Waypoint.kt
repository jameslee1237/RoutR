package com.routr.waypoint

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID
import com.routr.trip.Trip
import java.math.BigDecimal

@Entity
@Table(name = "waypoints")
class Waypoint(
    @Id
    val id: UUID = UUID.randomUUID(),
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    val trip: Trip,
    @Column(name = "`order`", nullable = false)
    var order: Int,
    @Column(nullable = false)
    var name: String,
    @Column(nullable = false)
    var address: String,
    @Column(nullable = false, precision = 9, scale = 6)
    var lat: BigDecimal,
    @Column(nullable = false, precision = 9, scale = 6)
    var lng: BigDecimal,
    var estimatedArrival: Instant? = null,
    var actualArrival: Instant? = null,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: WaypointStatus = WaypointStatus.PENDING,
    @Column(columnDefinition = "TEXT")
    var notes: String? = null,
    @Column(nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
)