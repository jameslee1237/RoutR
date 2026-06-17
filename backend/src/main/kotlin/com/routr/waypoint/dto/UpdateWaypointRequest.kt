package com.routr.waypoint.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.DecimalMax
import java.math.BigDecimal
import java.time.Instant

data class UpdateWaypointRequest(
    val name: String? = null,
    val address: String? = null,
    val lat: BigDecimal? = null,
    val lng: BigDecimal? = null,
    val estimatedArrival: Instant? = null,
    val notes: String? = null
)