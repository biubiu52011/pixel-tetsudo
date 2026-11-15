# Pixel Tetsudo — GitHub × Supabase railway metadata and train PNG audit (2026-11-16)

This is a **production-data repair plus a dated read-only snapshot**, not a claim that all 283 routes or all train-number assignments are officially verified. All GitHub changes were committed directly to `main`; no PR was created.

## Production repairs verified

| Scope | Result | Protection |
| --- | --- | --- |
| Marunouchi branch | `Nakano-Sakaue → Nakano-Shimbashi → Nakano-fujimicho → Honancho`; added the missing Nakano-Shimbashi coordinates | Guarded idempotent SQL |
| Tobu Ogose line | Ordered `Bushu-Nagase → Higashi_Moro → Bushu-Karasawa` to match Tobu's station guide | Does not alter timetable or station identity |
| Train artwork | Six same-byte/conflicting-label PNG paths and the absent Izukyu 8000 path marked `appearance_class=requires_review` | Reviewed identity baseline remains locked, `asset_status` unchanged |
| SQL registry | Registered Enoden, Utsunomiya LRT, and Chichibu Main, 71 station references | All three have `timetable_api_enabled=false`, `realtime_position_api_enabled=false`, `sql_planned_fallback_enabled=false` |

The first attempted artwork `asset_status` update was **rejected by the production audit trigger** and rolled back. The migration was corrected to respect `guard_vehicle_image_review_baseline()`. `train_timetable_vehicle_artwork` only selects `appearance_class='standard_or_fixed_livery'`; the seven affected paths are therefore excluded from that view without changing reviewed basic identities.

**Evidence**

- Marunouchi branch: frontend canonical station order; station point https://mapfan.com/spots/S3C44%2CJ%2CSXREW
- Tobu Ogose official order: https://www.tobu.co.jp/railway/guide/line/ogose_line.html
- Read-only production verification: four Marunouchi branch records with indexes 0–3; Ogose indexes 4–6 corrected; 7 artwork paths `requires_review`; 3 registered routes with 15 + 19 + 37 stops.

## Open gaps — do not silently fill

- **283 canonical GitHub routes, 260 registered in Supabase**; the 23 remaining frontend-only routes are listed in `data/audits/railway-metadata-known-gaps-20261116.json`.
- The missing routes include JR Hokkaido and JR Shikoku data containing `JR-...-001` placeholder station keys (not verified physical stations), incomplete Hakodate tram geometry, and `Yahiko`, which reverses the same stations as existing `Miyo`. Registering these without identity reconciliation risks corrupting real route topology.
- **38** base/display color differences are recorded **as pending official-palette review**, not automatically made equal. Multiple operator presentation palettes intentionally use different visual layers.
- **14** SQL/frontend station-list discrepancies remain in the snapshot (including BRT boundaries, branch overlap and scoped station IDs). Do not replace them by matching lengths alone.
- **74** canonical routes have one or more station entries with null/missing/non-numeric coordinates. Many are placeholder-heavy regional routes.
- **63** routes have no own `image` or `presentation.icon`, including lines that intentionally inherit a parent icon. The audit prevents new omissions without falsely declaring all 63 broken.
- **601** repository train PNG files, **474** SQL asset rows; one SQL path is absent (Izukyu 8000), marked `requires_review`. There are six same-byte PNG pairs; distinct-model pairs are quarantined in JS.
- **291** published SQL train-number ranges have valid existing PNG paths and `requires_exact_roster=true`. Six range-overlap pairs exist (three different-model overlaps, mainly Oito); they must be evaluated with full train number, direction, date, section, train type and evidence scope, not a guessed numerical range.
- **8,300** operation mappings currently remain `unverified`; model references do not establish actual daily formations.

## New audit implementation

- `tools/railway-metadata-audit.cjs`: static canonical color + icon validation; parent/display references; station-coordinate gap detection; SQL route and station-list snapshot reconciliation; PNG asset and numbered-rule file existence; exact-roster requirements; byte-identical image detection. It is read-only.
- `tests/railway-metadata-audit.test.cjs`: regression contracts for reviewed artwork, registered static routes, and two corrected station orders.
- `.github/workflows/railway-metadata-audit.yml`: checks on `main` pushes to relevant files, plus manual `workflow_dispatch`. No PR workflow, no database credentials.
- `data/audits/railway-metadata-known-gaps-20261116.json`: dated exception inventory (exceptions are **not approvals**).
- `data/audits/supabase-railway-audit-snapshot-20261116.json`: read-only extraction made after applying the repairs. This is **not live Supabase CI monitoring**.

### To validate

```sh
node tools/railway-metadata-audit.cjs --strict
node --test tests/railway-metadata-audit.test.cjs
node data/core/generate-all.js --check
```

To refresh the dated Supabase snapshot, retrieve `railway_lines`, ordered `line_stations`, `vehicle_image_assets`, and `published_train_png_number_ranges` with the connected Supabase account, regenerate the snapshot and known exceptions **only after reviewing new differences**. Do not put a service-role key in GitHub Actions and do not claim the snapshot reflects changes made after 2026-11-16.

## Remediation policy

1. Fix confirmed errors by changing their existing responsible source/table; do not add runtime patches.
2. Preserve unique station identity, physical line vs service corridor, and BRT versus rail boundaries.
3. Recheck operator/official palette sources before changing any of the 38 mismatches.
4. Never infer actual formations from a train number range, fleet gallery, vehicle owner, train livery, or daily layout guess.
5. Update the evidence snapshot when production SQL changes; keep the workflow able to detect unexpected new drift.
