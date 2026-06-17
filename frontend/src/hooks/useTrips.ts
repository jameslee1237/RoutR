'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { TripSummary } from '@/types'

export function useTrips() {
  const { getToken, isSignedIn } = useAuth()

  return useQuery<TripSummary[]>({
    queryKey: ['trips'],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const token = await getToken({ template: 'API-TEST' })
      if (!token) throw new Error('Not authenticated')
      return apiFetch<TripSummary[]>('/api/trips', token)
    },
  })
}
