'use client'

import Link from 'next/link'
import type { TripSummary } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface TripCardProps {
  trip: TripSummary
}

export function TripCard({ trip }: TripCardProps) {
  const createdDate = new Date(trip.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link href={`/trips/${trip.id}`} className="group block">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-150 hover:shadow-md">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-150 line-clamp-1">
            {trip.name}
          </h3>
          <StatusBadge status={trip.status} size="sm" />
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {trip.waypointCount} waypoint{trip.waypointCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {createdDate}
          </span>
        </div>
      </div>
    </Link>
  )
}
