package com.routr.waypoint.dto

import java.util.UUID

data class ReorderWaypointsRequest(val order: List<UUID>)