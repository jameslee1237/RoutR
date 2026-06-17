'use client'

import { useState } from 'react'
import type { TripStatus } from '@/types'
import { useWaypointMutations } from '@/hooks/useWaypointMutations'

interface WaypointFormProps {
  tripId: string
  tripStatus: TripStatus
}

interface FormState {
  name: string
  address: string
  lat: string
  lng: string
  estimatedArrival: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '',
  address: '',
  lat: '',
  lng: '',
  estimatedArrival: '',
  notes: '',
}

export function WaypointForm({ tripId, tripStatus }: WaypointFormProps) {
  const { addWaypoint } = useWaypointMutations(tripId)
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  if (tripStatus !== 'DRAFT' && tripStatus !== 'ACTIVE') {
    return null
  }

  const handleChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const lat = parseFloat(form.lat)
    const lng = parseFloat(form.lng)

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be a number between -90 and 90')
      return
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be a number between -180 and 180')
      return
    }

    try {
      await addWaypoint.mutateAsync({
        name: form.name.trim(),
        address: form.address.trim(),
        lat,
        lng,
        estimatedArrival: form.estimatedArrival || undefined,
        notes: form.notes.trim() || undefined,
      })
      setForm(EMPTY_FORM)
      setExpanded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add waypoint')
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition-colors duration-150 hover:border-blue-400 hover:text-blue-600"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Waypoint
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-800">New Waypoint</h4>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Waypoint name"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={handleChange('address')}
              placeholder="Street address"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Latitude <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={handleChange('lat')}
              placeholder="37.7749"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Longitude <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={handleChange('lng')}
              placeholder="-122.4194"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Estimated Arrival{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="datetime-local"
            value={form.estimatedArrival}
            onChange={handleChange('estimatedArrival')}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Notes{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={handleChange('notes')}
            placeholder="Any special instructions..."
            rows={2}
            className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setExpanded(false)
              setForm(EMPTY_FORM)
              setError(null)
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={addWaypoint.isPending || !form.name.trim() || !form.address.trim() || !form.lat || !form.lng}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addWaypoint.isPending ? (
              <>
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding...
              </>
            ) : (
              'Add Waypoint'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
