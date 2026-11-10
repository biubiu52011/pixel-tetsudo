# JR-Central ChuoCentral: SQL progress, 2026-11-11

- The existing `line_stations` now holds all 40 sequential Nagoya–Shiojiri stations, scoped to `ChuoCentral`.
- `Okuwa` refers **only** to Tobu's Tochigi station. The JR-Central Nagano station is `JRC-ChuoCentral-027`, with a separate coordinate and localized name. Its official existence and neighboring Nojiri/Suhara stations are confirmed by Okuwa Village: https://www.vill.okuwa.lg.jp/kanko/support/support_traffic.html. Coordinates cross-checked against https://mapfan.com/spots/SCH%2CJ%2CHP0.
- Shared physical station `Nagoya` coordinates were corrected once in the canonical registry and Supabase: 35.1706431, 136.8816945, corroborated by JR Central's station view at https://mapfan.com/spots/SCH%2CJ%2CP60.
- Three off-route transfer references at Minō-Ōta and Tatsuno were removed from the ChuoCentral presentation: those stations are not on its 40-station route.
- Existing `manual_timetable_templates`, `manual_timetable_template_stops`, `train_timetables`, `train_timetable_members`, and `train-runs` remain the sole data path. No new train table or frontend-estimation engine.
- A prior JR-Central `kobetsujikoku.json` evidence record concerns **2026-10-20 only**, not a licensed or verified full-day **2026-11** timetable. It cannot be expanded to recurring service dates or treated as a complete plan.
- The existing `TokaidoCentral` November authorized importer is being generalized for both JR-Central lines; imported source rows must be dated and licensed, with exact train numbers and stop clocks. No test train should persist.
- Neither JR-Central line has independently verified full-day November train plans yet; keep `missing_all_plans`. A train count of zero in the SQL source is *unknown/not integrated*, not proof of cancellation.
- Inspect `supabase/queries/chuo_central_plan_status.sql` after each import. The global page layout should remain map-only without recreating the removed explanatory notice sections.
