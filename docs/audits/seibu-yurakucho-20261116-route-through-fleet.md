# Seibu Yurakucho — 2026-11-16 route, through-stock and SQL audit

## Canonical route
- `Yurakucho_Seibu` = Nerima → Shin-Sakuradai → Kotake-Mukaihara; 2.6 km; SI family.
- The two actual route edges use **schematic** 2 + 2 minutes. The obsolete third 2-minute entry was not attached to a station edge; `durationTotalMin=4` is NOT official per-train travel time.
- Keep the interchange boundaries at Nerima (Seibu Ikebukuro) and Kotake-Mukaihara (Tokyo Metro Yurakucho/Fukutoshin). A route boundary is NOT a verified particular train continuation.

## Owner-scoped vehicle candidates
- Seibu 6000/40000 are self-owned model references.
- Only an explicit upstream `trainOwner` can admit Metro 10000/17000, Tokyu 5050 (incl. 4000 subseries), or MinatoMirai Y500 as a Seibu Yurakucho/Ikebukuro route-level candidate.
- Shared Tokyo Metro network presence does **not** license Tobu 50070/9000/9050 to enter Seibu Yurakucho; Tobu remains eligible only on its own appropriate corridors.
- Ordinary F-Liner is a train-type **fleet reference** only. S-TRAIN and other premium services do not inherit ordinary fleet mappings.
- Images are in the library; a candidate list MUST NOT select a per-number PNG. No guessed `Yurakucho_Seibu` number→PNG interval was introduced.

## S-TRAIN: topology-only record
- Seibu 40000-series S-TRAIN crosses the corridor: weekdays Tokorozawa→Toyosu and Toyosu→Kotesashi; holidays Seibu-Chichibu↔Motomachi-Chukagai.
- On the Seibu Yurakucho segment, Shin-Sakuradai is not a passenger stop; Nerima permits alighting only for weekday down trains. Kotake-Mukaihara is not a passenger stop.
- These are officially published service-pattern facts, not a complete train clock and not permission to simulate positions. No newly constructed SQL stop records or inferred S-TRAIN timestamps.

## Historical SQL status / reversible wording correction
- Before correction, 1,049 `manual_timetable_templates` existed for this line; all 1,049 joined canonical rows had `timetable_validity='undated_not_current_verified'`.
- 85 old F-Liner source templates (weekday 12+26, holiday 19+28) had the impossible candidate label:
  `西武40000系 / 東武50070系 / メトロ17000系 / 東急5050系4000番台`.
- The narrowly scoped SQL cleanup removes only the `東武50070系 / ` candidate segment; expected revised label:
  `西武40000系 / メトロ17000系 / 東急5050系4000番台`.
- This is still an ambiguous candidate group, not a physical formation or 2026 verified operation. No historical stop clocks, source IDs, actual dates, numbers or `timetable_validity` are modified.
- Internal keys `SYO...`, `SYI...`, `SYR-T...` must not be interpreted as public Seibu train numbers or used in PNG ranges.

## Evidence
- https://www.seiburailway.jp/railway/station/
- https://www.seiburailway.jp/railway/station/nerima/
- https://www.seiburailway.jp/railway/reservedtrain/s-train/
- https://www.seiburailway.jp/cs/faq/reservedtrain/
- https://www.tokyometro.jp/corporate/enterprise/passenger_rail/cars/working/index.html
- https://www.jametro.or.jp/subway/japan/yokohama-kousoku/guide.html
- https://www.tokyometro.jp/station/timetable.html?dr=b&dt=h&h=5&ln=yurakucho&m=27&st=shin-kiba
- https://www.seiburailway.jp/railways/2026digitaltimetable/pageindices/index.html

## Validate
```sh
node --test tests/seibu-yurakucho-202611-audit.test.cjs
node --test tests/seibu-ikebukuro-202611-audit.test.cjs
node tools/train-major-fleet-presets.test.cjs
node data/core/generate-all.js --check
node scripts/sync-page-scripts.cjs --check
```
