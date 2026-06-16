package com.routr.trip.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CreateTripRequest(
    @field:NotBlank(message = "Name is required")
    @field:Size(max = 100)
    val name: String,
    @field:Size(max = 500)
    val description: String? = null
)