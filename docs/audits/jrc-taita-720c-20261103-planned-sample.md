# JR-Central Taita: 720C scheduled train — narrowly date-scoped sample

**2026-11-03 ONLY**, SaturdayHoliday calendar (Japan Culture Day).
The sample does not establish operation on other November dates.
No actual vehicle, formation, observed delay or train-car identity data.

**Official scheduled train-number evidence:**
https://timetable.jr-odekake.net/line-timetable/2364?arv_node=&day=3&dep_node=&hour=&index=&min=&month=11&year=2026
The JR timetable, dated 2026-11-03, lists `720C` and origin
`多治見09:53` as a scheduled normal train continuing toward Gifu.

**Independently corroborated scheduled Taita section clocks:**
- https://transit.yahoo.co.jp/search/result/%E4%B8%AD%E6%B0%B4%E9%87%8E-%E9%A3%9B%E9%A8%A8%E5%8F%A4%E5%B7%9D
  (2026-11-02 itinerary: Tajimi 09:53 → Mino-Ota 10:24)
- https://www.jorudan.co.jp/time/to/%E5%A4%9A%E6%B2%BB%E8%A6%8B_%E7%BE%8E%E6%BF%83%E5%A4%AA%E7%94%B0/?Ddd=11&Dym=202610&r=%E5%A4%AA%E5%A4%9A%E7%B7%9A
  (2026-10 Sunday timetable: 09:53 → 10:24)
These corroborate the timetable baseline but **do not independently
validate every intervening stop clock for 11/03**.

**Original selected facts for source-specific SQL sample:**
- Train `720C`, `Local`, Taita, Outbound canonical direction.
- Tajimi `JRC-ChuoCentral-013` (line index 0), dep 09:53.
- Mino-Ota `JRC-Takayama-008` (line index 7), arr 10:24.
- Operating date **only 2026-11-03**, SaturdayHoliday. The
  complete service continues to Gifu on the Takayama route, but the
  Taita portion is scoped to its own canonical station boundary.

The selected public time/number facts and original project-specific
station normalization are documented with source attribution; this is
not a license to redistribute a publisher's whole timetable.

**Acceptance must remain sampled**: one planned day, 2 timed station
events only, no imputed intermediate arrival/dwell times, no assertion
of regularly scheduled service on all 2026 November dates, no actual
trainset validation, no arbitrary PNG model assignment.
