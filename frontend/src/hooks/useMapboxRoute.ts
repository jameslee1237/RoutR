'use client'

import { useQuery } from '@tanstack/react-query'
import type { Waypoint } from '@/types'

interface RouteResult {
  coordinates: [number, number][]
}

export function useMapboxRoute(waypoints: Waypoint[]) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  return useQuery<RouteResult | null>({
    queryKey: [
      'mapbox-route',
      waypoints.map((w) => `${w.lat},${w.lng}`).join('|'),
    ],
    queryFn: async () => {
      if (!token || waypoints.length < 2) return null

      const sorted = [...waypoints].sort((a, b) => a.order - b.order)
      const coords = sorted.map((w) => `${w.lng},${w.lat}`).join(';')
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${token}`

      const res = await fetch(url)
      if (!res.ok) return null

      const data = (await res.json()) as {
        routes?: { geometry?: { coordinates?: [number, number][] } }[]
      }
      const coordinates = data.routes?.[0]?.geometry?.coordinates
      if (!coordinates || coordinates.length === 0) return null

      return { coordinates }
    },
    enabled: waypoints.length >= 2 && !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
