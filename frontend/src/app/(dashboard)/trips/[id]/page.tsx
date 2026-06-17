'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTrip } from '@/hooks/useTrip'
import { useTripEvents } from '@/hooks/useTripEvents'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TripDetailSkeleton } from '@/components/ui/LoadingSkeleton'
import { TripControlBar } from '@/components/trips/TripControlBar'
import { WaypointList } from '@/components/waypoints/WaypointList'

const TripMap = dynamic(
  () => import('@/components/map/TripMap').then((m) => m.TripMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-xl bg-slate-200">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading map...</p>
        </div>
      </div>
    ),
  }
)

export default function TripDetailPage() {
  const params = useParams()
  const tripId = params.id as string

  const { data: trip, isLoading, error } = useTrip(tripId)
  const [highlightedWaypointId, setHighlightedWaypointId] = useState<
    string | null
  >(null)

  // Listen for real-time updates via SSE
  useTripEvents(tripId)

  const handleWaypointClick = (waypointId: string) => {
    setHighlightedWaypointId((prev) => (prev === waypointId ? null : waypointId))
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="flex-1 p-6">
          <TripDetailSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">
          <Link
            href="/trips"
            className="text-slate-400 transition-colors hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">Trip not found</h1>
        </div>
        <div className="flex-1 p-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
            <p className="font-medium">Failed to load trip</p>
            <p className="mt-1 text-sm">{error.message}</p>
            <Link
              href="/trips"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Back to Trips
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!trip) return null

  const updatedDate = new Date(trip.updatedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">
        <Link
          href="/trips"
          className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-xl font-semibold text-slate-900">
              {trip.name}
            </h1>
            <StatusBadge status={trip.status} />
          </div>
          {trip.description && (
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {trip.description}
            </p>
          )}
        </div>
        <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
          Updated {updatedDate}
        </span>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left panel: details */}
        <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b border-slate-200 p-6 lg:w-[420px] lg:border-b-0 lg:border-r">
          {/* Control bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Trip Controls
            </h2>
            <TripControlBar trip={trip} />
          </div>

          {/* Waypoints */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <WaypointList
              trip={trip}
              highlightedWaypointId={highlightedWaypointId}
              onWaypointClick={handleWaypointClick}
            />
          </div>
        </div>

        {/* Right panel: map */}
        <div className="min-h-[350px] flex-1 p-4 lg:p-6">
          <TripMap
            waypoints={trip.waypoints}
            highlightedWaypointId={highlightedWaypointId}
            onWaypointClick={handleWaypointClick}
          />
        </div>
      </div>
    </div>
  )
}
