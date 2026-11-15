# Seibu Toshima Line audit — 2026-11-16

## Corrected routing
- Seibu Toshima Line (SI06 Nerima–SI39 Toshimaen) branches from the Seibu Ikebukuro Line.
- Selected local through services reach Ikebukuro through Nerima. Reciprocal `throughServices`, `serviceBoundaries` and branch metadata describe route topology only, not per-train verified connections.
- The line's base color now agrees with its existing orange presentation color (`#EF7A00`).
- No train number, train continuation or timetable clock may be inferred just from this route relation.

## Fleet and train PNGs
- Reference candidates for 2026 ordinary 8-car working: Seibu 20000, 30000 and 40000 series 50 subseries. These are **model groups**, not assigned trainsets.
- The 2000 series was documented for eligible Toshima operation in 2024; specific 2026 scheduled participation is not confirmed. Preserve the existing qualified historic SQL row, but do not add it to 2026 runtime candidates.
- `images/列车/西武鉄道/西武鉄道_40050系_緑帯.png` is registered as an **unapproved** reference only: `asset:null`, `candidateOnly:true`, `promotePlannedAsset:false`, `plannedOnly:true` and `pending-source-review`. A generic 40000 blue-band PNG is not a substitute.
- The 2026 ordinary line has **no** evidence-based per-train model/PNG selection. `data/timetables/train-number-png-ranges.js` remains unmodified.

## Outstanding SQL timetable work
At the 2026-10-31 published timetable audit:
- 305 historical two-station canonical templates: weekday 77 outbound/77 inbound; holiday 75 outbound/76 inbound.
- 305 origin departures correspond to posted Seibu station times, **not** operator train-number verification.
- 12 adjacent-station arrivals verified, 293 still unverified.
- 153 Toshimaen-origin two-station records require reconciliation with complete Ikebukuro-bound source columns.
- Old `STOO`/`STOI` symbols are internal IDs, not genuine published train numbers.
- Do not infer train-specific vehicle models, scheduled destination arrivals, or actual formations.

## Evidence
- [Official Seibu 2026 digital timetable](https://www.seiburailway.jp/railways/2026digitaltimetable/pageindices/index.html)
- [Official Seibu fleet](https://www.seiburailway.jp/railway/encyclopedia/)
- [Official 40000 specifications](https://www.seiburailway.jp/railway/encyclopedia/40000/)
- [Toshima line official departure listing](https://seibu.ekitan.com/norikae/timetable/station/233-0/d1?dw=1)
- [8-car fleet group reference (community, model-group only)](https://4gousya.net/line/8241.php)

## Validation
`node tools/train-png-display-contract.test.cjs`
`node tools/seibu-toshima-202611-audit.test.cjs`

When editing timetable/railway assets, refresh the GitHub Pages script and data loader version strings to avoid old cached information.
