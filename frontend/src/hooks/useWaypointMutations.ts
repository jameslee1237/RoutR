'use client'

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  Waypoint,
  CreateWaypointBody,
  UpdateWaypointBody,
  ReorderWaypointsBody,
} from '@/types'

export function useWaypointMutations(tripId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trips'] })
  }

  const addWaypoint = useMutation<Waypoint, Error, CreateWaypointBody>({
    mutationFn: async (body) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<Waypoint>(`/api/trips/${tripId}/waypoints`, token!, {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    onSuccess: invalidate,
  })

  const updateWaypoint = useMutation<
    Waypoint,
    Error,
    { waypointId: string; body: UpdateWaypointBody }
  >({
    mutationFn: async ({ waypointId, body }) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<Waypoint>(
        `/api/trips/${tripId}/waypoints/${waypointId}`,
        token!,
        { method: 'PUT', body: JSON.stringify(body) }
      )
    },
    onSuccess: invalidate,
  })

  const deleteWaypoint = useMutation<void, Error, string>({
    mutationFn: async (waypointId) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<void>(
        `/api/trips/${tripId}/waypoints/${waypointId}`,
        token!,
        { method: 'DELETE' }
      )
    },
    onSuccess: invalidate,
  })

  const reorderWaypoints = useMutation<
    { ok: true },
    Error,
    ReorderWaypointsBody
  >({
    mutationFn: async (body) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<{ ok: true }>(
        `/api/trips/${tripId}/waypoints/reorder`,
        token!,
        { method: 'PUT', body: JSON.stringify(body) }
      )
    },
    onSuccess: invalidate,
  })

  const arriveAtWaypoint = useMutation<Waypoint, Error, string>({
    mutationFn: async (waypointId) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<Waypoint>(
        `/api/trips/${tripId}/waypoints/${waypointId}/arrive`,
        token!,
        { method: 'POST' }
      )
    },
    onSuccess: invalidate,
  })

  const skipWaypoint = useMutation<Waypoint, Error, string>({
    mutationFn: async (waypointId) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<Waypoint>(
        `/api/trips/${tripId}/waypoints/${waypointId}/skip`,
        token!,
        { method: 'POST' }
      )
    },
    onSuccess: invalidate,
  })

  return {
    addWaypoint,
    updateWaypoint,
    deleteWaypoint,
    reorderWaypoints,
    arriveAtWaypoint,
    skipWaypoint,
  }
}
