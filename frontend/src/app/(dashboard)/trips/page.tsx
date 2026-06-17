import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { TripList } from '@/components/trips/TripList'

export const metadata = {
  title: 'My Trips — RoutR',
}

export default function TripsPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="My Trips"
        actions={
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:opacity-90 hover:-translate-y-px active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Trip
          </Link>
        }
      />
      <div className="flex-1 p-6">
        <TripList />
      </div>
    </div>
  )
}
