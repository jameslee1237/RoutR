package com.routr.trip.dto

import jakarta.validation.constraints.Size

data class UpdateTripRequest(
    @field:Size(max = 100)
    val name: String? = null,
    @field:Size(max = 500)
    val description: String? = null
)