'use client'

import { useState } from 'react'
import type { Trip } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useTripMutations } from '@/hooks/useTripMutations'

interface TripControlBarProps {
  trip: Trip
}

export function TripControlBar({ trip }: TripControlBarProps) {
  const { startTrip, completeTrip, cancelTrip } = useTripMutations()
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (
    action: () => Promise<Trip>,
    label: string
  ) => {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${label}`)
    }
  }

  if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3">
        <StatusBadge status={trip.status} />
        {trip.status === 'COMPLETED' && (
          <span className="text-sm text-slate-500">
            All done — this trip is complete.
          </span>
        )}
        {trip.status === 'CANCELLED' && (
          <span className="text-sm text-slate-500">This trip was cancelled.</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {trip.status === 'DRAFT' && (
          <button
            type="button"
            onClick={() =>
              handleAction(
                () => startTrip.mutateAsync(trip.id),
                'start trip'
              )
            }
            disabled={startTrip.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {startTrip.isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Trip
              </>
            )}
          </button>
        )}

        {trip.status === 'ACTIVE' && (
          <button
            type="button"
            onClick={() =>
              handleAction(
                () => completeTrip.mutateAsync(trip.id),
                'complete trip'
              )
            }
            disabled={completeTrip.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completeTrip.isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Completing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Complete Trip
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            handleAction(
              () => cancelTrip.mutateAsync(trip.id),
              'cancel trip'
            )
          }
          disabled={cancelTrip.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cancelTrip.isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Cancelling...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Trip
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
