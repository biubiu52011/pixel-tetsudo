# Seibu Chichibu line: verified 2026-11 audit adjustments

- Line identity SI, 6 stations Agano–Seibu-Chichibu, 19 km (confirmed before this change). `branchOf:Ikebukuro` makes existing Agano through boundary explicit.
- Static fallback interval minutes: 5/4/6/4/5 = 24, not the old seven fake 2-minute intervals. These are representative timings from a legacy 12:09–12:33 local template, consistent with public 23–24 minute end-to-end journeys, **not official per-train clocks**. Verified SQL stop clocks take precedence.
- Seibu 4000 generic illustration now uses white standard color scheme. `西武鉄道_4000系_赤白塗装.png` is reserved for 4017F E851 55th-anniversary livery; mapped only as an unapproved planned, formation-specific PNG, no train-number inference.
- Seibu 7000 route eligibility starts 2026-09-12 (existing scoped preset retained). 001-series Laview and 40000-series S-TRAIN are distinct planned service families, not proof of actual formation.

## Database audit (pending official crosswalk)
- 246 undated source templates for SeibuChichibu: 142 local, 102 Laview, 2 S-TRAIN.
- 38 identical first-departure collision groups (34 limited express, 3 local, 1 S-TRAIN) need source-by-source reconciliation; shared departure does not prove identical physical trains.
- SaturdayHoliday 17:07 source `SCI106` (template 5226) incorrectly has Agano *departure* at 17:12, 5 minutes after Seibu-Chichibu. Competing `SBC-T035D` (5312) has 17:29 *arrival*. Neither internal code is an officially verified train number. Do not merge/delete either historical source until verified.
- The coverage audit is marked `revision_review` with these issues. 104 plan-level vehicle assignments, 0 actual formations.
- Unmapped public train number ranges remain empty. The special tourism train `52席の至福` still has no approved matching PNG; do not substitute a standard 4000 image.

Sources:
- https://www.seiburailway.jp/newsroom/news/20241108_4000e851/
- https://www.seiburailway.jp/file.jsp?file%2Fyouran2021_gaiyo.pdf=
- https://www.tetsudo.com/news/4202/
- https://www.seiburailway.jp/railways/2026digitaltimetable/pageindices/index.html
