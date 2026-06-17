'use client'

import { useState } from 'react'
import type { Waypoint, TripStatus } from '@/types'
import { WaypointStatusButton } from './WaypointStatusButton'
import { useWaypointMutations } from '@/hooks/useWaypointMutations'

interface WaypointItemProps {
  waypoint: Waypoint
  tripStatus: TripStatus
  isHighlighted?: boolean
  onClick?: () => void
}

export function WaypointItem({
  waypoint,
  tripStatus,
  isHighlighted,
  onClick,
}: WaypointItemProps) {
  const { deleteWaypoint } = useWaypointMutations(waypoint.tripId)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    await deleteWaypoint.mutateAsync(waypoint.id)
  }

  const formattedEstimated = waypoint.estimatedArrival
    ? new Date(waypoint.estimatedArrival).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  const formattedActual = waypoint.actualArrival
    ? new Date(waypoint.actualArrival).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  return (
    <div
      className={`rounded-lg border bg-white p-4 transition-all duration-150 cursor-pointer ${
        isHighlighted
          ? 'border-blue-400 ring-2 ring-blue-400/20'
          : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Order number */}
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            waypoint.status === 'ARRIVED'
              ? 'bg-green-100 text-green-700'
              : waypoint.status === 'SKIPPED'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {waypoint.order}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate font-medium text-slate-900">
                {waypoint.name}
              </h4>
              <p className="truncate text-xs text-slate-500">{waypoint.address}</p>
            </div>
            <div className="shrink-0">
              <WaypointStatusButton
                waypoint={waypoint}
                tripStatus={tripStatus}
              />
            </div>
          </div>

          {(formattedEstimated || formattedActual || waypoint.notes) && (
            <div className="mt-2 space-y-1">
              {formattedEstimated && (
                <p className="text-xs text-slate-500">
                  <span className="font-medium">ETA:</span> {formattedEstimated}
                </p>
              )}
              {formattedActual && (
                <p className="text-xs text-green-600">
                  <span className="font-medium">Arrived:</span> {formattedActual}
                </p>
              )}
              {waypoint.notes && (
                <p className="text-xs text-slate-500 italic">{waypoint.notes}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete button — only show for DRAFT trips */}
      {tripStatus === 'DRAFT' && (
        <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteWaypoint.isPending}
            className={`text-xs transition-colors duration-150 ${
              confirmDelete
                ? 'font-medium text-red-600 hover:text-red-700'
                : 'text-slate-400 hover:text-red-500'
            }`}
          >
            {confirmDelete ? 'Confirm delete?' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  )
}
