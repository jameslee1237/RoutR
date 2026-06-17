'use client'

import { useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { Map } from 'react-map-gl/maplibre'

import type { PickingInfo } from '@deck.gl/core'
import { WebMercatorViewport } from '@deck.gl/core'
import type { Waypoint } from '@/types'
import { useMapboxRoute } from '@/hooks/useMapboxRoute'

interface TripMapProps {
  waypoints: Waypoint[]
  highlightedWaypointId?: string | null
  onWaypointClick?: (waypointId: string) => void
}

const MAPLIBRE_STYLE = 'https://demotiles.maplibre.org/style.json'

const STATUS_COLORS: Record<string, [number, number, number]> = {
  PENDING: [59, 130, 246],   // blue-500
  ARRIVED: [34, 197, 94],    // green-500
  SKIPPED: [249, 115, 22],   // orange-500
}

interface ViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
}

function getBoundingBox(waypoints: Waypoint[]) {
  if (waypoints.length === 0) return null
  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity
  for (const wp of waypoints) {
    minLng = Math.min(minLng, wp.lng)
    maxLng = Math.max(maxLng, wp.lng)
    minLat = Math.min(minLat, wp.lat)
    maxLat = Math.max(maxLat, wp.lat)
  }
  return { minLng, maxLng, minLat, maxLat }
}

function getInitialViewState(waypoints: Waypoint[]): ViewState {
  const defaultView: ViewState = {
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 3,
    pitch: 0,
    bearing: 0,
  }

  if (waypoints.length === 0) return defaultView

  if (waypoints.length === 1) {
    return {
      longitude: waypoints[0].lng,
      latitude: waypoints[0].lat,
      zoom: 13,
      pitch: 0,
      bearing: 0,
    }
  }

  const bbox = getBoundingBox(waypoints)
  if (!bbox) return defaultView

  try {
    const viewport = new WebMercatorViewport({ width: 800, height: 600 })
    const { longitude, latitude, zoom } = viewport.fitBounds(
      [
        [bbox.minLng, bbox.minLat],
        [bbox.maxLng, bbox.maxLat],
      ],
      { padding: 80 }
    )
    return { longitude, latitude, zoom: Math.min(zoom, 16), pitch: 0, bearing: 0 }
  } catch {
    return defaultView
  }
}

export function TripMap({
  waypoints,
  highlightedWaypointId,
  onWaypointClick,
}: TripMapProps) {
  const sorted = useMemo(
    () => [...waypoints].sort((a, b) => a.order - b.order),
    [waypoints]
  )

  const initialViewState = useMemo(() => getInitialViewState(sorted), [sorted])
  const [viewState, setViewState] = useState<ViewState>(initialViewState)

  const { data: route } = useMapboxRoute(sorted)

  const layers = useMemo(() => {
    const result = []

    // Route path layer
    if (route && route.coordinates.length > 0) {
      result.push(
        new PathLayer({
          id: 'route-path',
          data: [{ path: route.coordinates }],
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: [37, 99, 235, 200], // blue-600 with alpha
          getWidth: 4,
          widthUnits: 'pixels',
          pickable: false,
        })
      )
    } else if (sorted.length >= 2) {
      // Fallback: straight lines between waypoints
      result.push(
        new PathLayer({
          id: 'route-path-fallback',
          data: [{ path: sorted.map((w) => [w.lng, w.lat] as [number, number]) }],
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: [148, 163, 184, 150], // slate-400 dashed feel
          getWidth: 2,
          widthUnits: 'pixels',
          pickable: false,
        })
      )
    }

    // Waypoint scatter layer
    result.push(
      new ScatterplotLayer<Waypoint>({
        id: 'waypoints',
        data: sorted,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: (d) => (d.id === highlightedWaypointId ? 14 : 10),
        getFillColor: (d) => {
          const base = STATUS_COLORS[d.status] ?? [59, 130, 246]
          return [...base, 230] as [number, number, number, number]
        },
        getLineColor: (d) =>
          d.id === highlightedWaypointId
            ? [255, 255, 255, 255]
            : [255, 255, 255, 180],
        getLineWidth: (d) => (d.id === highlightedWaypointId ? 3 : 2),
        lineWidthUnits: 'pixels',
        radiusUnits: 'pixels',
        pickable: true,
        onClick: (info: PickingInfo<Waypoint>) => {
          if (info.object) {
            onWaypointClick?.(info.object.id)
          }
        },
        updateTriggers: {
          getRadius: highlightedWaypointId,
          getLineColor: highlightedWaypointId,
          getLineWidth: highlightedWaypointId,
        },
      })
    )

    // Order number text layer
    result.push(
      new TextLayer<Waypoint>({
        id: 'waypoint-labels',
        data: sorted,
        getPosition: (d) => [d.lng, d.lat],
        getText: (d) => String(d.order),
        getSize: 11,
        getColor: [255, 255, 255, 255],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 700,
        pickable: false,
      })
    )

    return result
  }, [sorted, route, highlightedWaypointId, onWaypointClick])

  if (waypoints.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <div className="text-center">
          <svg
            className="mx-auto mb-3 h-10 w-10 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-sm text-slate-400">Add waypoints to see the map</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-200">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }: { viewState: unknown }) =>
          setViewState(vs as ViewState)
        }
        controller
        layers={layers}
        getCursor={({ isDragging, isHovering }) =>
          isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'
        }
      >
        <Map mapStyle={MAPLIBRE_STYLE} />
      </DeckGL>

      {/* Map legend */}
      <div className="absolute bottom-4 right-4 rounded-lg border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
        <p className="mb-2 text-xs font-semibold text-slate-600">Waypoints</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-slate-600">Arrived</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-orange-500" />
            <span className="text-xs text-slate-600">Skipped</span>
          </div>
        </div>
      </div>
    </div>
  )
}
