'use client'

import { useState } from 'react'
import type { Waypoint, TripStatus } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useWaypointMutations } from '@/hooks/useWaypointMutations'

interface WaypointStatusButtonProps {
  waypoint: Waypoint
  tripStatus: TripStatus
}

export function WaypointStatusButton({
  waypoint,
  tripStatus,
}: WaypointStatusButtonProps) {
  const { arriveAtWaypoint, skipWaypoint } = useWaypointMutations(
    waypoint.tripId
  )
  const [error, setError] = useState<string | null>(null)

  const handleArrive = async () => {
    setError(null)
    try {
      await arriveAtWaypoint.mutateAsync(waypoint.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark arrived')
    }
  }

  const handleSkip = async () => {
    setError(null)
    try {
      await skipWaypoint.mutateAsync(waypoint.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip waypoint')
    }
  }

  if (waypoint.status !== 'PENDING' || tripStatus !== 'ACTIVE') {
    return <StatusBadge status={waypoint.status} size="sm" />
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleArrive}
          disabled={arriveAtWaypoint.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-green-700 disabled:opacity-50"
        >
          {arriveAtWaypoint.isPending ? (
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          Arrive
        </button>

        <button
          type="button"
          onClick={handleSkip}
          disabled={skipWaypoint.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-orange-500 px-2.5 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-orange-600 disabled:opacity-50"
        >
          {skipWaypoint.isPending ? (
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
          Skip
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
