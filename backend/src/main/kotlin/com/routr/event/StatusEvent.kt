package com.routr.event

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID
import com.routr.trip.Trip
import com.routr.waypoint.Waypoint

@Entity
@Table(name = "status_events")
class StatusEvent(
    @Id
    val id: UUID = UUID.randomUUID(),
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    val trip: Trip,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "waypoint_id")
    val waypoint: Waypoint? = null,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val type: StatusEventType,
    @Column(nullable = false)
    val occurredAt: Instant = Instant.now(),
    @Column(columnDefinition = "TEXT")
    val metadata: String? = null
)