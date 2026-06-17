'use client'

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Trip, CreateTripBody, UpdateTripBody } from '@/types'

export function useTripMutations() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  const invalidate = (tripId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['trips'] })
    if (tripId) {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
    }
  }

  const createTrip = useMutation<Trip, Error, CreateTripBody>({
    mutationFn: async (body) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<Trip>('/api/trips', token!, {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => invalidate(),
  })

  const updateTrip = useMutation<
    Trip,
    Error,
    { id: string; body: UpdateTripBody }
  >({
    mutationFn: async ({ id, body }) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<Trip>(`/api/trips/${id}`, token!, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
    onSuccess: (_, { id }) => invalidate(id),
  })

  const deleteTrip = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<void>(`/api/trips/${id}`, token!, {
        method: 'DELETE',
      })
    },
    onSuccess: (_, id) => invalidate(id),
  })

  const startTrip = useMutation<Trip, Error, string>({
    mutationFn: async (id) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<Trip>(`/api/trips/${id}/start`, token!, {
        method: 'POST',
      })
    },
    onSuccess: (_, id) => invalidate(id),
  })

  const completeTrip = useMutation<Trip, Error, string>({
    mutationFn: async (id) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<Trip>(`/api/trips/${id}/complete`, token!, {
        method: 'POST',
      })
    },
    onSuccess: (_, id) => invalidate(id),
  })

  const cancelTrip = useMutation<Trip, Error, string>({
    mutationFn: async (id) => {
      const token = await getToken({ template: 'API-TEST' })
      return apiFetch<Trip>(`/api/trips/${id}/cancel`, token!, {
        method: 'POST',
      })
    },
    onSuccess: (_, id) => invalidate(id),
  })

  return {
    createTrip,
    updateTrip,
    deleteTrip,
    startTrip,
    completeTrip,
    cancelTrip,
  }
}
