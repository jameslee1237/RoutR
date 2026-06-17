'use client'

import type { TripStatus, WaypointStatus } from '@/types'

type Status = TripStatus | WaypointStatus

const statusStyles: Record<Status, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ACTIVE: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  PENDING: 'bg-slate-100 text-slate-600 border-slate-200',
  ARRIVED: 'bg-green-100 text-green-700 border-green-200',
  SKIPPED: 'bg-orange-100 text-orange-700 border-orange-200',
}

const statusLabels: Record<Status, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  PENDING: 'Pending',
  ARRIVED: 'Arrived',
  SKIPPED: 'Skipped',
}

interface StatusBadgeProps {
  status: Status
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const base = statusStyles[status]
  const sizeClass =
    size === 'sm'
      ? 'text-xs px-2 py-0.5'
      : 'text-xs font-medium px-2.5 py-1'

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${base} ${sizeClass}`}
    >
      {statusLabels[status]}
    </span>
  )
}
