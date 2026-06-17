package com.routr.waypoint.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.DecimalMax
import java.math.BigDecimal
import java.time.Instant

data class CreateWaypointRequest(
    @field:NotBlank val name: String,
    @field:NotBlank val address: String,
    @field:DecimalMin("-90.0") @field:DecimalMax("90.0") val lat: BigDecimal,
    @field:DecimalMin("-180.0") @field:DecimalMax("180.0") val lng: BigDecimal,
    val estimatedArrival: Instant? = null,
    val notes: String? = null
)