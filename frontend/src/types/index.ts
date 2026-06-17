export type TripStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type WaypointStatus = 'PENDING' | 'ARRIVED' | 'SKIPPED'

export interface TripSummary {
  id: string
  name: string
  status: TripStatus
  waypointCount: number
  createdAt: string
}

export interface Trip {
  id: string
  name: string
  description: string | null
  status: TripStatus
  waypoints: Waypoint[]
  createdAt: string
  updatedAt: string
}

export interface Waypoint {
  id: string
  tripId: string
  order: number
  name: string
  address: string
  lat: number
  lng: number
  estimatedArrival: string | null
  actualArrival: string | null
  status: WaypointStatus
  notes: string | null
  createdAt: string
}

export interface CreateTripBody {
  name: string
  description?: string
}

export interface UpdateTripBody {
  name?: string
  description?: string
}

export interface CreateWaypointBody {
  name: string
  address: string
  lat: number
  lng: number
  estimatedArrival?: string
  notes?: string
}

export interface UpdateWaypointBody {
  name?: string
  address?: string
  lat?: number
  lng?: number
  estimatedArrival?: string
  notes?: string
}

export interface ReorderWaypointsBody {
  order: string[]
}
