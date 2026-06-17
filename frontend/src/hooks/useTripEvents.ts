'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'
import { BASE } from '@/lib/api'

export function useTripEvents(tripId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tripId) return

    let abortController: AbortController | null = null

    const connect = async () => {
      const token = await getToken({ template: 'API-TEST' })
      if (!token) return

      abortController = new AbortController()

      try {
        const res = await fetch(`${BASE}/api/trips/${tripId}/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        })

        if (!res.ok || !res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('data:')) {
              // Any SSE event triggers a full refetch of the trip
              queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
              queryClient.invalidateQueries({ queryKey: ['trips'] })
            }
          }
        }
      } catch (err) {
        // AbortError is expected on cleanup; ignore it
        if (err instanceof Error && err.name === 'AbortError') return
        // For other errors (network, etc.), we just stop silently
      }
    }

    connect()

    return () => {
      abortController?.abort()
    }
  }, [tripId, getToken, queryClient])
}
