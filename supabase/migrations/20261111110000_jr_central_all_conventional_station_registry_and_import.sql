-- JR-Central all 13 conventional routes, reviewed canonical station topology.
-- Existing ChuoCentral (40) and TokaidoCentral (84) are preserved unchanged.
-- Adds 303 station-order links for the other 11 lines; DOES NOT invent coordinates,
-- numbered services, 2026-11 stop clocks or actual vehicle dispatches.
-- Canonical source: data/core/railway_data.compact.json
-- JR-Central route scope: https://company.jr-central.co.jp/company/area/
-- Highayama line runs beyond Inotani into JR-West infrastructure.
BEGIN;
SELECT pg_advisory_xact_lock(2026111111);
CREATE TEMP TABLE _jrc_expected_stations(
  line_key text NOT NULL,
  station_index integer NOT NULL,
  station_id text NOT NULL,
  PRIMARY KEY(line_key,station_index),
  UNIQUE(line_key,station_id)
) ON COMMIT DROP;
INSERT INTO _jrc_expected_stations(line_key,station_index,station_id) VALUES
  ('Gotemba', 0, 'Kozu'),
  ('Gotemba', 1, 'JRC-Gotemba-002'),
  ('Gotemba', 2, 'JRC-Gotemba-003'),
  ('Gotemba', 3, 'JRC-Gotemba-004'),
  ('Gotemba', 4, 'JRC-Gotemba-005'),
  ('Gotemba', 5, 'JRC-Gotemba-006'),
  ('Gotemba', 6, 'JRC-Gotemba-007'),
  ('Gotemba', 7, 'JRC-Gotemba-008'),
  ('Gotemba', 8, 'JRC-Gotemba-009'),
  ('Gotemba', 9, 'Ashigara'),
  ('Gotemba', 10, 'JRC-Gotemba-011'),
  ('Gotemba', 11, 'JRC-Gotemba-012'),
  ('Gotemba', 12, 'JRC-Gotemba-013'),
  ('Gotemba', 13, 'JRC-Gotemba-014'),
  ('Gotemba', 14, 'JRC-Gotemba-015'),
  ('Gotemba', 15, 'JRC-Gotemba-016'),
  ('Gotemba', 16, 'JRC-Gotemba-017'),
  ('Gotemba', 17, 'JRC-Gotemba-018'),
  ('Gotemba', 18, 'Numazu'),
  ('Minobu', 0, 'JRC-TokaidoCentral-009'),
  ('Minobu', 1, 'JRC-Minobu-002'),
  ('Minobu', 2, 'JRC-Minobu-003'),
  ('Minobu', 3, 'JRC-Minobu-004'),
  ('Minobu', 4, 'Fujine'),
  ('Minobu', 5, 'JRC-Minobu-006'),
  ('Minobu', 6, 'JRC-Minobu-007'),
  ('Minobu', 7, 'JRC-Minobu-008'),
  ('Minobu', 8, 'JRC-Minobu-009'),
  ('Minobu', 9, 'JRC-Minobu-010'),
  ('Minobu', 10, 'JRC-Minobu-011'),
  ('Minobu', 11, 'JRC-Minobu-012'),
  ('Minobu', 12, 'JRC-Minobu-013'),
  ('Minobu', 13, 'JRC-Minobu-014'),
  ('Minobu', 14, 'JRC-Minobu-015'),
  ('Minobu', 15, 'JRC-Minobu-016'),
  ('Minobu', 16, 'JRC-Minobu-017'),
  ('Minobu', 17, 'JRC-Minobu-018'),
  ('Minobu', 18, 'JRC-Minobu-019'),
  ('Minobu', 19, 'JRC-Minobu-020'),
  ('Minobu', 20, 'JRC-Minobu-021'),
  ('Minobu', 21, 'JRC-Minobu-022'),
  ('Minobu', 22, 'JRC-Minobu-023'),
  ('Minobu', 23, 'JRC-Minobu-024'),
  ('Minobu', 24, 'JRC-Minobu-025'),
  ('Minobu', 25, 'JRC-Minobu-026'),
  ('Minobu', 26, 'JRC-Minobu-027'),
  ('Minobu', 27, 'JRC-Minobu-028'),
  ('Minobu', 28, 'JRC-Minobu-029'),
  ('Minobu', 29, 'JRC-Minobu-030'),
  ('Minobu', 30, 'JRC-Minobu-031'),
  ('Minobu', 31, 'JRC-Minobu-032'),
  ('Minobu', 32, 'JRC-Minobu-033'),
  ('Minobu', 33, 'JRC-Minobu-034'),
  ('Minobu', 34, 'JRC-Minobu-035'),
  ('Minobu', 35, 'JRC-Minobu-036'),
  ('Minobu', 36, 'JRC-Minobu-037'),
  ('Minobu', 37, 'JRC-Minobu-038'),
  ('Minobu', 38, 'Kofu'),
  ('Iida', 0, 'Toyohashi'),
  ('Iida', 1, 'JRC-Iida-002'),
  ('Iida', 2, 'JRC-Iida-003'),
  ('Iida', 3, 'JRC-Iida-004'),
  ('Iida', 4, 'JRC-Iida-005'),
  ('Iida', 5, 'JRC-Iida-006'),
  ('Iida', 6, 'JRC-Iida-007'),
  ('Iida', 7, 'JRC-Iida-008'),
  ('Iida', 8, 'JRC-Iida-009'),
  ('Iida', 9, 'JRC-Iida-010'),
  ('Iida', 10, 'JRC-Iida-011'),
  ('Iida', 11, 'JRC-Iida-012'),
  ('Iida', 12, 'JRC-Iida-013'),
  ('Iida', 13, 'JRC-Iida-014'),
  ('Iida', 14, 'JRC-Iida-015'),
  ('Iida', 15, 'JRC-Iida-016'),
  ('Iida', 16, 'JRC-Iida-017'),
  ('Iida', 17, 'JRC-Iida-018'),
  ('Iida', 18, 'JRC-Iida-019'),
  ('Iida', 19, 'JRC-Iida-020'),
  ('Iida', 20, 'JRC-Iida-021'),
  ('Iida', 21, 'JRC-Iida-022'),
  ('Iida', 22, 'JRC-Iida-023'),
  ('Iida', 23, 'JRC-Iida-024'),
  ('Iida', 24, 'JRC-Iida-025'),
  ('Iida', 25, 'JRC-Iida-026'),
  ('Iida', 26, 'JRC-Iida-027'),
  ('Iida', 27, 'JRC-Iida-028'),
  ('Iida', 28, 'JRC-Iida-029'),
  ('Iida', 29, 'JRC-Iida-030'),
  ('Iida', 30, 'JRC-Iida-031'),
  ('Iida', 31, 'JRC-Iida-032'),
  ('Iida', 32, 'JRC-Iida-033'),
  ('Iida', 33, 'JRC-Iida-034'),
  ('Iida', 34, 'JRC-Iida-035'),
  ('Iida', 35, 'JRC-Iida-036'),
  ('Iida', 36, 'JRC-Iida-037'),
  ('Iida', 37, 'JRC-Iida-038'),
  ('Iida', 38, 'JRC-Iida-039'),
  ('Iida', 39, 'JRC-Iida-040'),
  ('Iida', 40, 'JRC-Iida-041'),
  ('Iida', 41, 'JRC-Iida-042'),
  ('Iida', 42, 'JRC-Iida-043'),
  ('Iida', 43, 'JRC-Iida-044'),
  ('Iida', 44, 'JRC-Iida-045'),
  ('Iida', 45, 'JRC-Iida-046'),
  ('Iida', 46, 'JRC-Iida-047'),
  ('Iida', 47, 'JRC-Iida-048'),
  ('Iida', 48, 'JRC-Iida-049'),
  ('Iida', 49, 'JRC-Iida-050'),
  ('Iida', 50, 'JRC-Iida-051'),
  ('Iida', 51, 'JRC-Iida-052'),
  ('Iida', 52, 'JRC-Iida-053'),
  ('Iida', 53, 'JRC-Iida-054'),
  ('Iida', 54, 'JRC-Iida-055'),
  ('Iida', 55, 'JRC-Iida-056'),
  ('Iida', 56, 'JRC-Iida-057'),
  ('Iida', 57, 'JRC-Iida-058'),
  ('Iida', 58, 'JRC-Iida-059'),
  ('Iida', 59, 'JRC-Iida-060'),
  ('Iida', 60, 'JRC-Iida-061'),
  ('Iida', 61, 'JRC-Iida-062'),
  ('Iida', 62, 'JRC-Iida-063'),
  ('Iida', 63, 'JRC-Iida-064'),
  ('Iida', 64, 'JRC-Iida-065'),
  ('Iida', 65, 'JRC-Iida-066'),
  ('Iida', 66, 'JRC-Iida-067'),
  ('Iida', 67, 'JRC-Iida-068'),
  ('Iida', 68, 'JRC-Iida-069'),
  ('Iida', 69, 'JRC-Iida-070'),
  ('Iida', 70, 'JRC-Iida-071'),
  ('Iida', 71, 'JRC-Iida-072'),
  ('Iida', 72, 'JRC-Iida-073'),
  ('Iida', 73, 'JRC-Iida-074'),
  ('Iida', 74, 'JRC-Iida-075'),
  ('Iida', 75, 'JRC-Iida-076'),
  ('Iida', 76, 'JRC-Iida-077'),
  ('Iida', 77, 'JRC-Iida-078'),
  ('Iida', 78, 'JRC-Iida-079'),
  ('Iida', 79, 'JRC-Iida-080'),
  ('Iida', 80, 'JRC-Iida-081'),
  ('Iida', 81, 'JRC-Iida-082'),
  ('Iida', 82, 'JRC-Iida-083'),
  ('Iida', 83, 'JRC-Iida-084'),
  ('Iida', 84, 'JRC-Iida-085'),
  ('Iida', 85, 'JRC-Iida-086'),
  ('Iida', 86, 'JRC-Iida-087'),
  ('Iida', 87, 'JRC-Iida-088'),
  ('Iida', 88, 'JRC-Iida-089'),
  ('Iida', 89, 'JRC-Iida-090'),
  ('Iida', 90, 'JRC-Iida-091'),
  ('Iida', 91, 'JRC-Iida-092'),
  ('Iida', 92, 'JRC-Iida-093'),
  ('Iida', 93, 'Tatsuno'),
  ('Takayama', 0, 'JRC-TokaidoCentral-075'),
  ('Takayama', 1, 'JRC-Takayama-002'),
  ('Takayama', 2, 'JRC-Takayama-003'),
  ('Takayama', 3, 'JRC-Takayama-004'),
  ('Takayama', 4, 'JRC-Takayama-005'),
  ('Takayama', 5, 'JRC-Takayama-006'),
  ('Takayama', 6, 'JRC-Takayama-007'),
  ('Takayama', 7, 'JRC-Takayama-008'),
  ('Takayama', 8, 'JRC-Takayama-009'),
  ('Takayama', 9, 'JRC-Takayama-010'),
  ('Takayama', 10, 'JRC-Takayama-011'),
  ('Takayama', 11, 'JRC-Takayama-012'),
  ('Takayama', 12, 'JRC-Takayama-013'),
  ('Takayama', 13, 'JRC-Takayama-014'),
  ('Takayama', 14, 'JRC-Takayama-015'),
  ('Takayama', 15, 'JRC-Takayama-016'),
  ('Takayama', 16, 'JRC-Takayama-017'),
  ('Takayama', 17, 'JRC-Takayama-018'),
  ('Takayama', 18, 'JRC-Takayama-019'),
  ('Takayama', 19, 'JRC-Takayama-020'),
  ('Takayama', 20, 'JRC-Takayama-021'),
  ('Takayama', 21, 'JRC-Takayama-022'),
  ('Takayama', 22, 'JRC-Takayama-023'),
  ('Takayama', 23, 'JRC-Takayama-024'),
  ('Takayama', 24, 'JRC-Takayama-025'),
  ('Takayama', 25, 'JRC-Takayama-026'),
  ('Takayama', 26, 'JRC-Takayama-027'),
  ('Takayama', 27, 'JRC-Takayama-028'),
  ('Takayama', 28, 'JRC-Takayama-029'),
  ('Takayama', 29, 'JRC-Takayama-030'),
  ('Takayama', 30, 'JRC-Takayama-031'),
  ('Takayama', 31, 'JRC-Takayama-032'),
  ('Takayama', 32, 'JRC-Takayama-033'),
  ('Takayama', 33, 'JRC-Takayama-034'),
  ('Takayama', 34, 'JRC-Takayama-035'),
  ('Takayama', 35, 'JRC-Takayama-036'),
  ('Takayama', 36, 'JRC-Takayama-037'),
  ('Takayama', 37, 'JRC-Takayama-038'),
  ('Takayama', 38, 'JRC-Takayama-039'),
  ('Takayama', 39, 'JRC-Takayama-040'),
  ('Takayama', 40, 'JRC-Takayama-041'),
  ('Takayama', 41, 'JRC-Takayama-042'),
  ('Takayama', 42, 'JRC-Takayama-043'),
  ('Takayama', 43, 'JRC-Takayama-044'),
  ('Takayama', 44, 'Toyama'),
  ('Taita', 0, 'JRC-ChuoCentral-013'),
  ('Taita', 1, 'JRC-Taita-002'),
  ('Taita', 2, 'JRC-Taita-003'),
  ('Taita', 3, 'JRC-Taita-004'),
  ('Taita', 4, 'JRC-Taita-005'),
  ('Taita', 5, 'JRC-Taita-006'),
  ('Taita', 6, 'JRC-Taita-007'),
  ('Taita', 7, 'JRC-Takayama-008'),
  ('Taketoyo', 0, 'JRC-TokaidoCentral-061'),
  ('Taketoyo', 1, 'JRC-Taketoyo-002'),
  ('Taketoyo', 2, 'JRC-Taketoyo-003'),
  ('Taketoyo', 3, 'JRC-Taketoyo-004'),
  ('Taketoyo', 4, 'JRC-Taketoyo-005'),
  ('Taketoyo', 5, 'JRC-Taketoyo-006'),
  ('Taketoyo', 6, 'JRC-Taketoyo-007'),
  ('Taketoyo', 7, 'JRC-Taketoyo-008'),
  ('Taketoyo', 8, 'JRC-Taketoyo-009'),
  ('Taketoyo', 9, 'JRC-Taketoyo-010'),
  ('KansaiCentral', 0, 'Nagoya'),
  ('KansaiCentral', 1, 'Hatta'),
  ('KansaiCentral', 2, 'Haruda'),
  ('KansaiCentral', 3, 'Kanie'),
  ('KansaiCentral', 4, 'Hisakazu'),
  ('KansaiCentral', 5, 'Yatomi'),
  ('KansaiCentral', 6, 'Nagashima'),
  ('KansaiCentral', 7, 'Kuwana'),
  ('KansaiCentral', 8, 'Asahi-Kansai'),
  ('KansaiCentral', 9, 'Tomi-da'),
  ('KansaiCentral', 10, 'Tomita-Hama'),
  ('KansaiCentral', 11, 'Yokkaichi'),
  ('KansaiCentral', 12, 'Minami-Yokkaichi'),
  ('KansaiCentral', 13, 'Kawarada'),
  ('KansaiCentral', 14, 'Kawano'),
  ('KansaiCentral', 15, 'Kasa-Tou'),
  ('KansaiCentral', 16, 'Ida-Kawa'),
  ('KansaiCentral', 17, 'Kameyama'),
  ('KiseiCentral', 0, 'Kameyama'),
  ('KiseiCentral', 1, 'JRC-KiseiCentral-002'),
  ('KiseiCentral', 2, 'JRC-KiseiCentral-003'),
  ('KiseiCentral', 3, 'JRC-KiseiCentral-004'),
  ('KiseiCentral', 4, 'JRC-KiseiCentral-005'),
  ('KiseiCentral', 5, 'JRC-KiseiCentral-006'),
  ('KiseiCentral', 6, 'JRC-KiseiCentral-007'),
  ('KiseiCentral', 7, 'JRC-KiseiCentral-008'),
  ('KiseiCentral', 8, 'JRC-KiseiCentral-009'),
  ('KiseiCentral', 9, 'JRC-KiseiCentral-010'),
  ('KiseiCentral', 10, 'JRC-KiseiCentral-011'),
  ('KiseiCentral', 11, 'JRC-KiseiCentral-012'),
  ('KiseiCentral', 12, 'JRC-KiseiCentral-013'),
  ('KiseiCentral', 13, 'JRC-KiseiCentral-014'),
  ('KiseiCentral', 14, 'JRC-KiseiCentral-015'),
  ('KiseiCentral', 15, 'JRC-KiseiCentral-016'),
  ('KiseiCentral', 16, 'JRC-KiseiCentral-017'),
  ('KiseiCentral', 17, 'JRC-KiseiCentral-018'),
  ('KiseiCentral', 18, 'JRC-KiseiCentral-019'),
  ('KiseiCentral', 19, 'JRC-KiseiCentral-020'),
  ('KiseiCentral', 20, 'JRC-KiseiCentral-021'),
  ('KiseiCentral', 21, 'JRC-KiseiCentral-022'),
  ('KiseiCentral', 22, 'JRC-KiseiCentral-023'),
  ('KiseiCentral', 23, 'JRC-KiseiCentral-024'),
  ('KiseiCentral', 24, 'JRC-KiseiCentral-025'),
  ('KiseiCentral', 25, 'JRC-KiseiCentral-026'),
  ('KiseiCentral', 26, 'JRC-KiseiCentral-027'),
  ('KiseiCentral', 27, 'JRC-KiseiCentral-028'),
  ('KiseiCentral', 28, 'JRC-KiseiCentral-029'),
  ('KiseiCentral', 29, 'JRC-KiseiCentral-030'),
  ('KiseiCentral', 30, 'JRC-KiseiCentral-031'),
  ('KiseiCentral', 31, 'JRC-KiseiCentral-032'),
  ('KiseiCentral', 32, 'JRC-KiseiCentral-033'),
  ('KiseiCentral', 33, 'JRC-KiseiCentral-034'),
  ('KiseiCentral', 34, 'JRC-KiseiCentral-035'),
  ('KiseiCentral', 35, 'JRC-KiseiCentral-036'),
  ('KiseiCentral', 36, 'JRC-KiseiCentral-037'),
  ('KiseiCentral', 37, 'JRC-KiseiCentral-038'),
  ('KiseiCentral', 38, 'JRC-KiseiCentral-039'),
  ('KiseiCentral', 39, 'JRC-KiseiCentral-040'),
  ('KiseiCentral', 40, 'Shingu'),
  ('Sangu', 0, 'JRC-KiseiCentral-010'),
  ('Sangu', 1, 'JRC-Sangu-002'),
  ('Sangu', 2, 'JRC-Sangu-003'),
  ('Sangu', 3, 'JRC-Sangu-004'),
  ('Sangu', 4, 'JRC-Sangu-005'),
  ('Sangu', 5, 'JRC-Sangu-006'),
  ('Sangu', 6, 'JRC-Sangu-007'),
  ('Sangu', 7, 'JRC-Sangu-008'),
  ('Sangu', 8, 'JRC-Sangu-009'),
  ('Sangu', 9, 'JRC-Sangu-010'),
  ('Sangu', 10, 'JRC-Sangu-011'),
  ('Meisho', 0, 'JRC-KiseiCentral-008'),
  ('Meisho', 1, 'JRC-Meisho-002'),
  ('Meisho', 2, 'JRC-Meisho-003'),
  ('Meisho', 3, 'JRC-Meisho-004'),
  ('Meisho', 4, 'JRC-Meisho-005'),
  ('Meisho', 5, 'JRC-Meisho-006'),
  ('Meisho', 6, 'JRC-Meisho-007'),
  ('Meisho', 7, 'JRC-Meisho-008'),
  ('Meisho', 8, 'JRC-Meisho-009'),
  ('Meisho', 9, 'JRC-Meisho-010'),
  ('Meisho', 10, 'JRC-Meisho-011'),
  ('Meisho', 11, 'JRC-Meisho-012'),
  ('Meisho', 12, 'JRC-Meisho-013'),
  ('Meisho', 13, 'JRC-Meisho-014'),
  ('Meisho', 14, 'JRC-Meisho-015'),
  ('MinoAkasaka', 0, 'JRC-TokaidoCentral-078'),
  ('MinoAkasaka', 1, 'Arao-Kumamoto'),
  ('MinoAkasaka', 2, 'JRC-MinoAkasaka-003');

DO $precheck$
BEGIN
  IF (SELECT count(*) FROM public.railway_lines
       WHERE timetable_operator='JR-Central' AND id<>'TokaidoShinkansen')<>13
    OR (SELECT count(*) FROM public.line_stations WHERE line_id='TokaidoCentral')<>84
    OR (SELECT count(*) FROM public.line_stations WHERE line_id='ChuoCentral')<>40
    OR EXISTS(
      SELECT 1 FROM _jrc_expected_stations e
      LEFT JOIN public.railway_lines l ON l.id=e.line_key
      WHERE l.id IS NULL OR l.timetable_operator<>'JR-Central'
        OR l.timetable_api_enabled OR l.realtime_position_api_enabled
    )
    OR EXISTS (
      SELECT 1 FROM public.line_stations existing
      JOIN _jrc_expected_stations e ON existing.line_id=e.line_key
        AND (existing.station_index=e.station_index
          OR existing.station_name=e.station_id)
      WHERE existing.station_index IS DISTINCT FROM e.station_index
        OR existing.station_name IS DISTINCT FROM e.station_id
    )
    OR EXISTS (
      SELECT 1 FROM public.line_stations existing
      WHERE existing.line_id IN (SELECT DISTINCT line_key FROM _jrc_expected_stations)
        AND NOT EXISTS (
          SELECT 1 FROM _jrc_expected_stations e
          WHERE e.line_key=existing.line_id
            AND e.station_index=existing.station_index
            AND e.station_id=existing.station_name
        )
    )
  THEN RAISE EXCEPTION 'JRC_ALL_LINES_STATION_BASELINE_CONFLICT'; END IF;
END $precheck$;

-- Existing line_stations identity sequence may lag manual IDs.
SELECT setval(pg_get_serial_sequence('public.line_stations','id'),
  GREATEST((SELECT coalesce(max(id),1) FROM public.line_stations),
    (SELECT last_value FROM public.line_stations_id_seq)),true);
INSERT INTO public.line_stations(line_id,station_index,station_name)
SELECT e.line_key,e.station_index,e.station_id FROM _jrc_expected_stations e
WHERE NOT EXISTS (
  SELECT 1 FROM public.line_stations ls
  WHERE ls.line_id=e.line_key AND ls.station_index=e.station_index
);

DO $verify$
BEGIN
  IF EXISTS (
    SELECT 1 FROM _jrc_expected_stations e
    LEFT JOIN public.line_stations ls
      ON ls.line_id=e.line_key
      AND ls.station_index=e.station_index
      AND ls.station_name=e.station_id
    WHERE ls.id IS NULL
  )
  OR (SELECT count(*) FROM public.line_stations
      WHERE line_id IN (SELECT DISTINCT line_key FROM _jrc_expected_stations))<>303
  THEN RAISE EXCEPTION 'JRC_ALL_LINES_STATION_VERIFY_FAILED'; END IF;
END $verify$;

-- A topology inventory entry is NOT a published timetable or a position feed.
INSERT INTO public.line_data_inventory(
  line_key,source_path,data_kind,migration_status,notes
)
SELECT DISTINCT e.line_key,
  'data/core/railway_data.compact.json#lines.'||e.line_key,
  'station_topology_only','indexed',
  '2026-11-11: canonical station order registered only; no 2026-11 train numbers, '
  ||'stop clocks, full-day source coverage, fleet evidence or geocoding inferred.'
FROM _jrc_expected_stations e
ON CONFLICT (line_key) DO NOTHING;

-- Preserve the existing invoker-only, fully sourced importer, adding only the
-- 11 new route aliases, the SectionRapid type and Takayama operating-owner guard.
CREATE OR REPLACE FUNCTION public.import_jr_central_authorized_plan(p_line_key text, p_document jsonb)
RETURNS TABLE(inserted_trains integer, inserted_stops integer)
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_expected_count integer;
  v_railway_code text;
  v_source jsonb;
  v_url text;
  v_license text;
  v_license_url text;
  v_edition date;
  v_evidence_id bigint;
  v_source_key text;
  v_source_path text;
  v_train jsonb;
  v_stop jsonb;
  v_number text;
  v_calendar text;
  v_direction text;
  v_type text;
  v_dates date[];
  v_date text;
  v_station text;
  v_last_station text;
  v_first_station text;
  v_idx integer;
  v_prev_idx integer;
  v_prev_clock integer;
  v_current_clock integer;
  v_arr_clock integer;
  v_dep_clock integer;
  v_arr text;
  v_dep text;
  v_sequence integer;
  v_template_id bigint;
  v_timetable_id bigint;
  v_trip_hash text;
  v_existing_hash text;
  v_imported integer := 0;
  v_stops integer := 0;
BEGIN
  -- The 13 conventional canonical line IDs are the sole SQL route owners.
  -- Counts and ODPT railway suffixes are fixed to the reviewed front-end topology.
  SELECT x.station_count,x.railway_code
  INTO v_expected_count,v_railway_code
  FROM (VALUES
    ('TokaidoCentral',84,'Tokaido'),
    ('ChuoCentral',40,'Chuo'),
    ('Gotemba',19,'Gotemba'),
    ('Minobu',39,'Minobu'),
    ('Iida',94,'Iida'),
    ('Takayama',45,'Takayama'),
    ('Taita',8,'Taita'),
    ('Taketoyo',10,'Taketoyo'),
    ('KansaiCentral',18,'Kansai'),
    ('KiseiCentral',41,'Kisei'),
    ('Sangu',11,'Sangu'),
    ('Meisho',15,'Meisho'),
    ('MinoAkasaka',3,'MinoAkasaka')
  ) AS x(line_key,station_count,railway_code)
  WHERE x.line_key=p_line_key;
  IF v_expected_count IS NULL THEN
    RAISE EXCEPTION 'JRC_PLAN_UNSUPPORTED_LINE';
  END IF;
  PERFORM pg_advisory_xact_lock(2026111104);
  -- Existing evidence imports used explicit IDs and left its identity sequence
  -- below MAX(id). Correct only this sequence before any identity INSERT.
  PERFORM setval(pg_get_serial_sequence('public.evidence_sources','id'),
    GREATEST((SELECT coalesce(max(id),1) FROM public.evidence_sources),
             (SELECT last_value FROM public.evidence_sources_id_seq)),true);
  IF jsonb_typeof(p_document) <> 'object'
     OR jsonb_typeof(p_document->'source') <> 'object'
     OR jsonb_typeof(p_document->'trains') <> 'array'
     OR jsonb_array_length(p_document->'trains') NOT BETWEEN 1 AND 1000
  THEN RAISE EXCEPTION 'JRC_PLAN_INVALID_DOCUMENT'; END IF;

  -- No "website is public => permission exists" inference.
  v_source := p_document->'source';
  v_url := nullif(btrim(v_source->>'url'),'');
  v_license := v_source->>'authorization';
  v_license_url := nullif(btrim(v_source->>'authorization_evidence_url'),'');
  IF v_url IS NULL OR v_url !~ '^https://[^ ]+'
     OR v_license_url IS NULL OR v_license_url !~ '^https://[^ ]+'
     OR v_license NOT IN ('original_compilation','licensed_for_republication')
  THEN RAISE EXCEPTION 'JRC_PLAN_SOURCE_RIGHTS_UNVERIFIED'; END IF;
  IF (v_source->>'edition_date') IS NULL
     OR (v_source->>'edition_date') !~ '^20[0-9]{2}-[01][0-9]-[0-3][0-9]$'
  THEN RAISE EXCEPTION 'JRC_PLAN_EDITION_NOT_DATED'; END IF;
  v_edition := (v_source->>'edition_date')::date;
  IF v_edition > current_date THEN RAISE EXCEPTION 'JRC_PLAN_FUTURE_EDITION'; END IF;
  IF (SELECT count(*) FROM public.line_stations WHERE line_id=p_line_key) <> v_expected_count
     OR (SELECT min(station_index) FROM public.line_stations WHERE line_id=p_line_key) <> 0
     OR (SELECT max(station_index) FROM public.line_stations WHERE line_id=p_line_key) <> v_expected_count - 1
     OR (SELECT count(DISTINCT station_name) FROM public.line_stations WHERE line_id=p_line_key) <> v_expected_count
     OR NOT EXISTS (SELECT 1 FROM public.railway_lines
           WHERE id=p_line_key AND timetable_operator='JR-Central'
             AND sql_planned_fallback_enabled AND NOT timetable_api_enabled)
  THEN RAISE EXCEPTION 'JRC_PLAN_STATION_REGISTRY_OR_CAPABILITY_CHANGED'; END IF;

  v_source_key := 'jrc-'||lower(p_line_key)||'-authorized:'||md5(v_url||'|'||v_license_url||'|'||v_edition::text);
  v_source_path := 'authorized-sql:jrcentral:'||p_line_key||':'||md5(v_source_key);
  INSERT INTO public.evidence_sources(source_key,source_url,source_type,evidence_grade,notes)
  VALUES(v_source_key,v_url,'timetable','B',
         'User-reviewed '||v_license||' source; authorization evidence: '||v_license_url||
         '; edition '||v_edition::text||'; individual-train stop evidence only, not full-day acceptance')
  ON CONFLICT(source_key) DO NOTHING;
  SELECT id INTO v_evidence_id FROM public.evidence_sources WHERE source_key=v_source_key;
  IF v_evidence_id IS NULL OR NOT EXISTS
     (SELECT 1 FROM public.evidence_sources WHERE id=v_evidence_id AND source_url=v_url)
  THEN RAISE EXCEPTION 'JRC_PLAN_EVIDENCE_CONFLICT'; END IF;

  FOR v_train IN SELECT value FROM jsonb_array_elements(p_document->'trains')
  LOOP
    IF jsonb_typeof(v_train)<>'object' THEN
      RAISE EXCEPTION 'JRC_PLAN_BAD_TRAIN'; END IF;
    v_number := v_train->>'train_number';
    v_calendar := v_train->>'calendar_urn';
    v_direction := v_train->>'direction_urn';
    v_type := v_train->>'train_type';
    IF v_number IS NULL OR v_number !~ '^[0-9]{1,5}[A-Z]{0,2}$'
       OR v_calendar NOT IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
       OR v_direction NOT IN ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')
       OR v_type NOT IN ('Local','Rapid','SectionRapid','SpecialRapid','LimitedExpress')
       OR jsonb_typeof(v_train->'stops') <> 'array'
       OR jsonb_array_length(v_train->'stops') NOT BETWEEN 2 AND v_expected_count
       OR jsonb_typeof(v_train->'operating_dates') <> 'array'
       OR jsonb_array_length(v_train->'operating_dates') NOT BETWEEN 1 AND 62
    THEN RAISE EXCEPTION 'JRC_PLAN_INCOMPLETE_TRAIN:%',coalesce(v_number,'?'); END IF;
    -- Takayama is JR-Central through Inotani (index 36); the route continues
    -- on JR-West infrastructure. An operator-specific through train can be
    -- imported only with separate evidence that JR-Central operates it.
    IF p_line_key='Takayama'
       AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_train->'stops') AS item(stop)
         JOIN public.line_stations ls ON ls.line_id='Takayama'
           AND ls.station_name=item.stop->>'station_id'
         WHERE ls.station_index>36
       )
       AND (v_train->>'service_operator' IS DISTINCT FROM 'JR-Central'
         OR coalesce(v_train->>'service_operator_evidence_url','') !~ '^https://[^ ]+')
    THEN RAISE EXCEPTION 'JRC_PLAN_TAKAYAMA_CROSS_BORDER_OPERATOR_UNVERIFIED'; END IF;
    v_dates := ARRAY[]::date[];
    FOR v_date IN SELECT value FROM jsonb_array_elements_text(v_train->'operating_dates')
    LOOP
      IF v_date !~ '^20[0-9]{2}-[01][0-9]-[0-3][0-9]$'
      THEN RAISE EXCEPTION 'JRC_PLAN_BAD_SERVICE_DATE'; END IF;
      IF v_date::date < v_edition OR v_date < '2026-11-01' OR v_date > '2026-11-30'
      THEN RAISE EXCEPTION 'JRC_PLAN_DATE_OUTSIDE_AUTHORIZED_EDITION'; END IF;
      -- Standard 2026 November calendar, including Culture Day and Labor Thanksgiving Day.
      IF v_date BETWEEN '2026-11-01' AND '2026-11-30' AND
        ((v_calendar='odpt.Calendar:Weekday' AND
           (extract(isodow FROM v_date::date) IN (6,7) OR v_date IN ('2026-11-03','2026-11-23')))
          OR
         (v_calendar='odpt.Calendar:SaturdayHoliday' AND
           extract(isodow FROM v_date::date) BETWEEN 1 AND 5
           AND v_date NOT IN ('2026-11-03','2026-11-23')))
      THEN RAISE EXCEPTION 'JRC_PLAN_SERVICE_CALENDAR_CONFLICT:%',v_date; END IF;
      IF v_date::date = ANY(v_dates) THEN RAISE EXCEPTION 'JRC_PLAN_DUPLICATE_DATE'; END IF;
      v_dates:=array_append(v_dates,v_date::date);
    END LOOP;
    IF cardinality(v_dates)=0 THEN RAISE EXCEPTION 'JRC_PLAN_EMPTY_DATE_SCOPE'; END IF;

    v_prev_idx := NULL;
    v_prev_clock := NULL;
    v_first_station := NULL;
    v_last_station := NULL;
    v_sequence := 0;
    -- Validate the ENTIRE train before inserting any source template.
    FOR v_stop IN SELECT value FROM jsonb_array_elements(v_train->'stops')
    LOOP
      v_station := v_stop->>'station_id';
      SELECT station_index INTO v_idx FROM public.line_stations
       WHERE line_id=p_line_key AND station_name=v_station;
      IF NOT FOUND THEN RAISE EXCEPTION 'JRC_PLAN_UNKNOWN_STATION:%',coalesce(v_station,'?'); END IF;
      IF v_prev_idx IS NOT NULL AND
         ((v_direction='odpt.RailDirection:Outbound' AND v_idx<=v_prev_idx)
           OR (v_direction='odpt.RailDirection:Inbound' AND v_idx>=v_prev_idx))
      THEN RAISE EXCEPTION 'JRC_PLAN_WRONG_STATION_ORDER:%',v_station; END IF;
      v_arr := NULLIF(v_stop->>'arrival', '');
      v_dep := NULLIF(v_stop->>'departure', '');
      IF (v_arr IS NULL AND v_dep IS NULL)
         OR (v_arr IS NOT NULL AND v_arr !~ '^([01][0-9]|2[0-9]):[0-5][0-9]$')
         OR (v_dep IS NOT NULL AND v_dep !~ '^([01][0-9]|2[0-9]):[0-5][0-9]$')
      THEN RAISE EXCEPTION 'JRC_PLAN_INVALID_CLOCK:%',v_station; END IF;
      v_arr_clock:=CASE WHEN v_arr IS NULL THEN NULL ELSE substring(v_arr,1,2)::int*60+substring(v_arr,4,2)::int END;
      v_dep_clock:=CASE WHEN v_dep IS NULL THEN NULL ELSE substring(v_dep,1,2)::int*60+substring(v_dep,4,2)::int END;
      v_current_clock:=coalesce(v_arr_clock,v_dep_clock);
      IF (v_prev_clock IS NOT NULL AND v_current_clock<v_prev_clock)
          OR (v_arr_clock IS NOT NULL AND v_dep_clock IS NOT NULL AND v_dep_clock<v_arr_clock)
      THEN RAISE EXCEPTION 'JRC_PLAN_CLOCK_REVERSAL:%',v_station; END IF;
      v_prev_clock:=coalesce(v_dep_clock,v_arr_clock);
      IF v_sequence=0 THEN
        IF v_dep IS NULL THEN RAISE EXCEPTION 'JRC_PLAN_FIRST_STOP_MUST_DEPART'; END IF;
        v_first_station:=v_station;
      END IF;
      v_last_station:=v_station;
      v_prev_idx:=v_idx;
      v_sequence:=v_sequence+1;
    END LOOP;
    IF nullif((v_train->'stops'->(v_sequence-1))->>'arrival','') IS NULL
    THEN RAISE EXCEPTION 'JRC_PLAN_LAST_STOP_MUST_ARRIVE'; END IF;
    v_trip_hash := md5(v_train::text||'|'||v_source_key);
    SELECT source_trip_id INTO v_existing_hash FROM public.manual_timetable_templates
    WHERE line_key=p_line_key
      AND train_number=v_number AND calendar_urn=v_calendar
      AND direction_urn=v_direction
      AND operating_dates && v_dates
    LIMIT 1;
    IF FOUND THEN
      IF v_existing_hash='md5:'||v_trip_hash THEN
        CONTINUE; -- idempotent re-run of the exact evidence row.
      END IF;
      RAISE EXCEPTION 'JRC_PLAN_CONFLICTING_TRAIN_DATES:%',v_number;
    END IF;

    INSERT INTO public.manual_timetable_templates
      (line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,
       destination_urns,source_path,source_trip_id,source_revision_date,operating_dates)
    VALUES(p_line_key,v_calendar,v_number,'odpt.Railway:JR-Central.'||v_railway_code,
       v_direction,'odpt.TrainType:JR-Central.'||v_type,
       ARRAY['odpt.Station:JR-Central.'||v_railway_code||'.'||v_last_station]::text[],
       v_source_path,'md5:'||v_trip_hash,v_edition,v_dates)
    RETURNING id INTO v_template_id;
    v_sequence := 0;
    FOR v_stop IN SELECT value FROM jsonb_array_elements(v_train->'stops')
    LOOP
      v_station:=v_stop->>'station_id';
      v_arr:=nullif(v_stop->>'arrival','');
      v_dep:=nullif(v_stop->>'departure','');
      INSERT INTO public.manual_timetable_template_stops
        (template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
      VALUES(v_template_id,v_sequence,
        CASE WHEN v_arr IS NOT NULL THEN 'odpt.Station:JR-Central.'||v_railway_code||'.'||v_station END,
        CASE WHEN v_dep IS NOT NULL THEN 'odpt.Station:JR-Central.'||v_railway_code||'.'||v_station END,
        v_arr,v_dep);
      v_sequence := v_sequence + 1;
      v_stops := v_stops+1;
    END LOOP;
    INSERT INTO public.train_timetables
      (canonical_key,calendar_urn,primary_train_number,lead_source_template_id,
       group_evidence,timetable_validity,source_revision_date)
    VALUES('source:'||v_template_id,v_calendar,v_number,v_template_id,
       'source_only','date_verified',v_edition)
    RETURNING id INTO v_timetable_id;
    INSERT INTO public.train_timetable_members
      (source_template_id,timetable_id,segment_order,member_role,
       first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
    VALUES(v_template_id,v_timetable_id,0,'primary',0,v_sequence-1,0,false);
    v_imported := v_imported+1;
  END LOOP;

  -- Importing individual services is never evidence of a full-day roster.
  IF v_imported>0 THEN
    UPDATE public.published_timetable_coverage_audit
    SET template_count=(SELECT count(*) FROM public.manual_timetable_templates WHERE line_key=p_line_key),
        calendar_count=(SELECT count(DISTINCT calendar_urn) FROM public.manual_timetable_templates WHERE line_key=p_line_key),
        direction_count=(SELECT count(DISTINCT direction_urn) FROM public.manual_timetable_templates WHERE line_key=p_line_key),
        sampled_count=(SELECT count(*) FROM public.manual_timetable_templates WHERE line_key=p_line_key),
        coverage_status='sampled',checked_at=now(),
        issues=ARRAY['AUTHORIZED_INDIVIDUAL_TRAIN_ROWS_ONLY',
                     'FULL_DAY_WEEKDAY_AND_HOLIDAY_NOT_RECONCILED',
                     'DO_NOT_EXTRAPOLATE_UNVERIFIED_SERVICE_DATES',
                     'NO_ACTUAL_TRAINSET_IDENTITY']::text[]
    WHERE line_key=p_line_key;
  END IF;
  RETURN QUERY SELECT v_imported,v_stops;
END;
$fn$;

REVOKE ALL ON FUNCTION public.import_jr_central_authorized_plan(text,jsonb)
 FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
