'use client'

import { useState } from 'react'
import type { Trip } from '@/types'
import { WaypointItem } from './WaypointItem'
import { WaypointForm } from './WaypointForm'
import { EmptyState } from '@/components/ui/EmptyState'

interface WaypointListProps {
  trip: Trip
  highlightedWaypointId?: string | null
  onWaypointClick?: (waypointId: string) => void
}

export function WaypointList({
  trip,
  highlightedWaypointId,
  onWaypointClick,
}: WaypointListProps) {
  const sorted = [...trip.waypoints].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Waypoints ({trip.waypoints.length})
        </h3>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="No waypoints yet"
          description={
            trip.status === 'DRAFT' || trip.status === 'ACTIVE'
              ? 'Add waypoints below to plan your route.'
              : 'This trip had no waypoints.'
          }
          icon={
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
          }
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((waypoint) => (
            <WaypointItem
              key={waypoint.id}
              waypoint={waypoint}
              tripStatus={trip.status}
              isHighlighted={highlightedWaypointId === waypoint.id}
              onClick={() => onWaypointClick?.(waypoint.id)}
            />
          ))}
        </div>
      )}

      <WaypointForm tripId={trip.id} tripStatus={trip.status} />
    </div>
  )
}
