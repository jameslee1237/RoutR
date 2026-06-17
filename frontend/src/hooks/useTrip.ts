'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Trip } from '@/types'

export function useTrip(tripId: string) {
  const { getToken } = useAuth()

  return useQuery<Trip>({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<Trip>(`/api/trips/${tripId}`, token!)
    },
    enabled: !!tripId,
  })
}
