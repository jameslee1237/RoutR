'use client'

import type { TripStatus, WaypointStatus } from '@/types'

type Status = TripStatus | WaypointStatus

const statusConfig: Record<Status, { bg: string; text: string; border: string; dot: string }> = {
  DRAFT:     { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8' },
  ACTIVE:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  COMPLETED: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#10b981' },
  CANCELLED: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', dot: '#f87171' },
  PENDING:   { bg: '#fefce8', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  ARRIVED:   { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#10b981' },
  SKIPPED:   { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316' },
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
  const { bg, text, border, dot } = statusConfig[status]
  const padding = size === 'sm' ? '2px 8px' : '3px 10px'
  const fontSize = size === 'sm' ? '11px' : '12px'

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{
        background: bg,
        color: text,
        border: `1px solid ${border}`,
        padding,
        fontSize,
        lineHeight: '1.5',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        className="shrink-0 rounded-full"
        style={{ width: '6px', height: '6px', background: dot }}
      />
      {statusLabels[status]}
    </span>
  )
}
