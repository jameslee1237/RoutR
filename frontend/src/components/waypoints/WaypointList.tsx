'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import type { Trip, Waypoint } from '@/types'
import { WaypointItem } from './WaypointItem'
import { WaypointForm } from './WaypointForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { useWaypointMutations } from '@/hooks/useWaypointMutations'

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
  const serverSorted = [...trip.waypoints].sort((a, b) => a.order - b.order)
  const { reorderWaypoints } = useWaypointMutations(trip.id)
  const [localOrder, setLocalOrder] = useState<Waypoint[]>(serverSorted)
  const [activeId, setActiveId] = useState<string | null>(null)

  const canReorder = trip.status === 'DRAFT' || trip.status === 'ACTIVE'

  // Sync from server when not dirty (e.g. after save or external update)
  const isDirty = localOrder.map((w) => w.id).join() !== serverSorted.map((w) => w.id).join()

  useEffect(() => {
    if (!isDirty) {
      setLocalOrder([...trip.waypoints].sort((a, b) => a.order - b.order))
    }
  }, [trip.waypoints])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const oldIndex = localOrder.findIndex((w) => w.id === active.id)
    const newIndex = localOrder.findIndex((w) => w.id === over.id)
    setLocalOrder((prev) => arrayMove(prev, oldIndex, newIndex))
  }

  const move = (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    setLocalOrder((prev) => {
      const next = [...prev]
      ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
      return next
    })
  }

  const handleSave = () => {
    reorderWaypoints.mutate({ order: localOrder.map((w) => w.id) })
  }

  const handleReset = () => {
    setLocalOrder(serverSorted)
  }

  const activeWaypoint = activeId
    ? localOrder.find((w) => w.id === activeId)
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Waypoints ({trip.waypoints.length})
        </h3>
        {isDirty && canReorder && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleReset}
              disabled={reorderWaypoints.isPending}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={reorderWaypoints.isPending}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {reorderWaypoints.isPending ? 'Saving…' : 'Save order'}
            </button>
          </div>
        )}
      </div>

      {localOrder.length === 0 ? (
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
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localOrder.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localOrder.map((waypoint, index) => (
                  <WaypointItem
                    key={waypoint.id}
                    waypoint={waypoint}
                    tripStatus={trip.status}
                    isHighlighted={highlightedWaypointId === waypoint.id}
                    onClick={() => onWaypointClick?.(waypoint.id)}
                    onMoveUp={() => move(index, 'up')}
                    onMoveDown={() => move(index, 'down')}
                    isFirst={index === 0}
                    isLast={index === localOrder.length - 1}
                    canReorder={canReorder}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeWaypoint && (
                <div className="rounded-lg border border-blue-300 bg-white px-4 py-3 shadow-xl ring-2 ring-blue-400/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {activeWaypoint.order}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{activeWaypoint.name}</p>
                      <p className="text-xs text-slate-500">{activeWaypoint.address}</p>
                    </div>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>

        </>
      )}

      <WaypointForm tripId={trip.id} tripStatus={trip.status} />
    </div>
  )
}
