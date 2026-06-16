CREATE TYPE event_type AS ENUM (
    'TRIP_STARTED', 'TRIP_COMPLETED', 'TRIP_CANCELLED',
    'WAYPOINT_ARRIVED', 'WAYPOINT_SKIPPED'
);

CREATE TABLE status_events (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    waypoint_id UUID        REFERENCES waypoints(id) ON DELETE SET NULL,
    type        event_type  NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata    TEXT
);

CREATE INDEX idx_status_events_trip_id ON status_events(trip_id);
