'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Waypoint, TripStatus } from '@/types'
import { WaypointStatusButton } from './WaypointStatusButton'
import { useWaypointMutations } from '@/hooks/useWaypointMutations'

interface WaypointItemProps {
  waypoint: Waypoint
  tripStatus: TripStatus
  isHighlighted?: boolean
  onClick?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
  canReorder?: boolean
}

export function WaypointItem({
  waypoint,
  tripStatus,
  isHighlighted,
  onClick,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  canReorder,
}: WaypointItemProps) {
  const { deleteWaypoint } = useWaypointMutations(waypoint.tripId)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: waypoint.id, disabled: !canReorder })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

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
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={`group flex items-stretch rounded-lg bg-white transition-all duration-150 ${
          isDragging ? 'opacity-40 shadow-xl scale-[1.02]' : ''
        } ${
          isHighlighted
            ? 'shadow-sm ring-2 ring-blue-400/30'
            : 'shadow-sm hover:shadow-md'
        }`}
        style={{
          border: isHighlighted ? '1px solid #93c5fd' : '1px solid #f1f5f9',
        }}
      >
        {/* Drag handle — left edge */}
        {canReorder && (
          <div
            {...listeners}
            className="flex cursor-grab items-center px-2 text-slate-300 transition-colors hover:text-slate-500 active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to reorder"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
              <circle cx="5" cy="4" r="1.2" />
              <circle cx="5" cy="8" r="1.2" />
              <circle cx="5" cy="12" r="1.2" />
              <circle cx="11" cy="4" r="1.2" />
              <circle cx="11" cy="8" r="1.2" />
              <circle cx="11" cy="12" r="1.2" />
            </svg>
          </div>
        )}

        {/* Card content */}
        <div
          className="flex-1 cursor-pointer py-3 pr-3"
          onClick={onClick}
        >
          <div className="flex items-center gap-3">
            {/* Order badge */}
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
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate font-medium text-slate-900">
                    {waypoint.name}
                  </h4>
                  <p className="truncate text-xs text-slate-500">
                    {waypoint.address}
                  </p>
                </div>

                {/* Up/down + status buttons */}
                <div
                  className="flex shrink-0 items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {canReorder && (
                    <div className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={onMoveUp}
                        disabled={isFirst}
                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                        aria-label="Move up"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={onMoveDown}
                        disabled={isLast}
                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                        aria-label="Move down"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  )}
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
                      <span className="font-medium">ETA:</span>{' '}
                      {formattedEstimated}
                    </p>
                  )}
                  {formattedActual && (
                    <p className="text-xs text-green-600">
                      <span className="font-medium">Arrived:</span>{' '}
                      {formattedActual}
                    </p>
                  )}
                  {waypoint.notes && (
                    <p className="text-xs italic text-slate-500">
                      {waypoint.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {tripStatus === 'DRAFT' && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
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
      </div>
    </div>
  )
}
