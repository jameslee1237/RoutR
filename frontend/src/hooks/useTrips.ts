'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { TripSummary } from '@/types'

export function useTrips() {
  const { getToken } = useAuth()

  return useQuery<TripSummary[]>({
    queryKey: ['trips'],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<TripSummary[]>('/api/trips', token!)
    },
  })
}
