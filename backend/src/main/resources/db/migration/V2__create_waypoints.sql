CREATE TYPE waypoint_status AS ENUM ('PENDING', 'ARRIVED', 'SKIPPED');

CREATE TABLE waypoints (
    id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id           UUID            NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    "order"           INTEGER         NOT NULL,
    name              TEXT            NOT NULL,
    address           TEXT            NOT NULL,
    lat               DECIMAL(9, 6)   NOT NULL,
    lng               DECIMAL(9, 6)   NOT NULL,
    estimated_arrival TIMESTAMPTZ,
    actual_arrival    TIMESTAMPTZ,
    status            waypoint_status NOT NULL DEFAULT 'PENDING',
    notes             TEXT,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waypoints_trip_id ON waypoints(trip_id);
