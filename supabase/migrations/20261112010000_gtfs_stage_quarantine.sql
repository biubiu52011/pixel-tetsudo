-- TokyoGTFS raw source is quarantined: not official timetable, not realtime.
-- Applied to production project on 2026-11-12. This file preserves the same DDL.
CREATE SCHEMA IF NOT EXISTS gtfs_stage;
REVOKE ALL ON SCHEMA gtfs_stage FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS gtfs_stage.feed_imports (
  feed_sha text PRIMARY KEY CHECK (feed_sha ~ '^[0-9a-f]{64}$'),
  source_url text NOT NULL,
  source_label text NOT NULL,
  service_start date,
  service_end date,
  imported_at timestamptz NOT NULL DEFAULT now(),
  scope_note text NOT NULL,
  raw_route_count integer NOT NULL DEFAULT 0,
  staged_trip_count integer NOT NULL DEFAULT 0,
  staged_stop_time_count integer NOT NULL DEFAULT 0,
  attribution text NOT NULL
);

CREATE TABLE IF NOT EXISTS gtfs_stage.routes (
  feed_sha text NOT NULL REFERENCES gtfs_stage.feed_imports(feed_sha) ON DELETE CASCADE,
  route_id text NOT NULL,
  agency_id text NOT NULL,
  route_short_name text,
  route_long_name text,
  route_type text,
  candidate_status text NOT NULL CHECK(candidate_status IN ('existing_empty','new_registry_candidate','review_only','already_covered')),
  canonical_line_key text,
  PRIMARY KEY(feed_sha,route_id)
);

CREATE TABLE IF NOT EXISTS gtfs_stage.stops (
  feed_sha text NOT NULL REFERENCES gtfs_stage.feed_imports(feed_sha) ON DELETE CASCADE,
  stop_id text NOT NULL,
  stop_name text NOT NULL,
  latitude numeric,
  longitude numeric,
  parent_station text,
  location_type text,
  PRIMARY KEY(feed_sha,stop_id)
);

CREATE TABLE IF NOT EXISTS gtfs_stage.service_calendar (
  feed_sha text NOT NULL REFERENCES gtfs_stage.feed_imports(feed_sha) ON DELETE CASCADE,
  service_id text NOT NULL,
  start_date date,
  end_date date,
  week_mask text NOT NULL,
  PRIMARY KEY(feed_sha,service_id)
);

CREATE TABLE IF NOT EXISTS gtfs_stage.service_exceptions (
  feed_sha text NOT NULL REFERENCES gtfs_stage.feed_imports(feed_sha) ON DELETE CASCADE,
  service_id text NOT NULL,
  service_date date NOT NULL,
  exception_type integer NOT NULL CHECK(exception_type IN (1,2)),
  PRIMARY KEY(feed_sha,service_id,service_date)
);

CREATE TABLE IF NOT EXISTS gtfs_stage.trips (
  feed_sha text NOT NULL REFERENCES gtfs_stage.feed_imports(feed_sha) ON DELETE CASCADE,
  trip_id text NOT NULL,
  route_id text NOT NULL,
  service_id text NOT NULL,
  train_number text,
  headsign text,
  direction_id text,
  shape_id text,
  block_id text,
  exceptional text,
  vehicle_kind text,
  PRIMARY KEY(feed_sha,trip_id),
  FOREIGN KEY(feed_sha,route_id) REFERENCES gtfs_stage.routes(feed_sha,route_id)
);

CREATE TABLE IF NOT EXISTS gtfs_stage.stop_times (
  feed_sha text NOT NULL,
  trip_id text NOT NULL,
  stop_sequence integer NOT NULL,
  stop_id text NOT NULL,
  arrival_time text,
  departure_time text,
  shape_dist_traveled text,
  PRIMARY KEY(feed_sha,trip_id,stop_sequence),
  FOREIGN KEY(feed_sha,trip_id) REFERENCES gtfs_stage.trips(feed_sha,trip_id),
  FOREIGN KEY(feed_sha,stop_id) REFERENCES gtfs_stage.stops(feed_sha,stop_id)
);

CREATE TABLE IF NOT EXISTS gtfs_stage.transfers (
  feed_sha text NOT NULL REFERENCES gtfs_stage.feed_imports(feed_sha) ON DELETE CASCADE,
  from_trip_id text NOT NULL,
  to_trip_id text NOT NULL,
  transfer_type text NOT NULL,
  PRIMARY KEY(feed_sha,from_trip_id,to_trip_id,transfer_type)
);

CREATE INDEX IF NOT EXISTS gtfs_stage_trips_route_idx ON gtfs_stage.trips(feed_sha,route_id,service_id);
CREATE INDEX IF NOT EXISTS gtfs_stage_stop_times_stop_idx ON gtfs_stage.stop_times(feed_sha,stop_id);
CREATE INDEX IF NOT EXISTS gtfs_stage_transfers_to_idx ON gtfs_stage.transfers(feed_sha,to_trip_id);
COMMENT ON SCHEMA gtfs_stage IS 'Quarantined TokyoGTFS source records only; no realtime positions or official-current timetable authorization.';
