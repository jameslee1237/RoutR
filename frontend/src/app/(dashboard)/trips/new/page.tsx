import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { TripForm } from '@/components/trips/TripForm'

export const metadata = {
  title: 'Create Trip — RoutR',
}

export default function NewTripPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Create New Trip"
        actions={
          <Link
            href="/trips"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
          >
            Back to Trips
          </Link>
        }
      />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-6 text-sm text-slate-500">
              Give your trip a name to get started. You can add waypoints after
              creating it.
            </p>
            <TripForm />
          </div>
        </div>
      </div>
    </div>
  )
}
