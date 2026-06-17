package com.routr.event

import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import org.springframework.http.MediaType
import org.springframework.security.core.Authentication
import com.routr.trip.service.TripService
import com.routr.event.service.StatusEventService
import org.springframework.scheduling.TaskScheduler
import java.util.UUID
import com.routr.common.security.clerkUserId
import java.time.Duration
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper


@RestController
@RequestMapping("/api/trips/{tripId}/events")
class SseController(
    private val tripService: TripService,
    private val statusEventService: StatusEventService,
    private val taskScheduler: TaskScheduler
) {

    private val mapper = jacksonObjectMapper().apply { findAndRegisterModules() }

    @GetMapping(produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun streamEvents(
        @PathVariable tripId: UUID,
        authentication: Authentication
    ): SseEmitter {
        tripService.findByIdAndUserId(tripId, authentication.clerkUserId())

        val emitter = SseEmitter(300_000L)
        var lastSeenAt: java.time.Instant? = null

        val task = taskScheduler.scheduleAtFixedRate({
            try {
                val newEvents = statusEventService.findNewEvents(tripId, lastSeenAt)
                newEvents.forEach { event -> 
                    emitter.send(
                        SseEmitter.event()
                            .id(event.id.toString())
                            .name(event.type.name.lowercase())
                            .data(mapper.writeValueAsString(mapOf(
                                "id" to event.id,
                                "type" to event.type,
                                "tripId" to event.trip.id,
                                "waypointId" to event.waypoint?.id,
                                "occurredAt" to event.occurredAt
                            )))
                    )
                    lastSeenAt = event.occurredAt
                }
            } catch (e: Exception) {
                emitter.completeWithError(e)
            }
        }, Duration.ofSeconds(2))

        emitter.onCompletion { task.cancel(false) }
        emitter.onTimeout { task.cancel(false) }
        emitter.onError { task.cancel(false) }

        return emitter
    }
}