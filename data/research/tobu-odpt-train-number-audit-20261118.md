# Tobu 2026 ODPT TrainTimetable — train-number range audit (blocked by provider configuration)

As of **2026-11-18**, this is a **source audit, not a new PNG-to-train-number mapping**.

## Source and access result

- Operator data catalogue: [東武鉄道 列車時刻表 / Train timetable of Tobu](https://ckan.odpt.org/dataset/tobu__r_train_timetable), under **公共交通オープンデータチャレンジ 2026 限定ライセンス**.
- Source API: `odpt:TrainTimetable`, `odpt:operator=odpt.Operator:Tobu`. The user's shared raw URL is intentionally **not** copied here; do not store provider credentials in GitHub.
- Existing permitted route: `supabase/functions/odpt-proxy/index.ts`, `operator=Tobu&type=trainTimetable` — passes its **server-side** `ODPT_CHALLENGE_CONSUMER_KEY` without ever returning credential values to browsers or audit logs.
- A real GitHub Actions probe on **2026-11-18** returned **HTTP 503** for all queried scopes. A follow-up `?health=1` check reported `challengeConfigured=false`. Therefore **0 retrieved records, 0 verified train-number matches, source coverage incomplete**. Zero is **NOT** evidence that any actual train number is missing.
- [Read-only audit workflow](https://github.com/biubiu52011/pixel-tetsudo/blob/main/.github/workflows/audit-tobu-odpt-number-bands.yml) runs [Tobu source-number comparator](https://github.com/biubiu52011/pixel-tetsudo/blob/main/tools/audit-tobu-odpt-number-bands.cjs) and [identity-boundary tests](https://github.com/biubiu52011/pixel-tetsudo/blob/main/tests/tobu-odpt-number-band-audit.test.cjs).
- The pipeline now **fails closed** if it retrieves no valid ODPT timetable records. The separate website Pages CI is not tied to source availability.

## Three existing large number-reference envelopes to check

All below are **pre-existing SQL/CSV source references**, not proof of every intervening number or of a physical trainset:

| PNG | Existing source line key | Existing inclusive number-reference envelope | Possible numeric positions in interval | Source verification |
|---|---|---|---:|---|
| `東武鉄道_50050型.png` | `Hanzomon` | `0452–2282T` | 1,831 | NOT observed from this endpoint (503); operator and through-running scope must also match |
| `東武鉄道_20400型.png` | `TobuUtsunomiya` | `0401–0486N` | 86 | NOT observed from this endpoint (503); require actual model/line proof |
| `東武鉄道_10030型_50番台_更新車.png` | `Koizumi` | `0701–0764E` | 64 | NOT observed from this endpoint (503); must distinguish refurbished stock from other 10030 series |

Do not infer that any/all of these **1,981 potential numeric positions** are actual scheduled services. Even a genuine exact ODPT train number does not automatically prove an individual model, stock refurbishment, formation, or livery.

For the full Tobu gallery, the current single `png-first-number-band-inventory-20261117.csv` contains **37 distinct Tobu PNGs: 12 with some historical/number reference and 25 without**. Those 25 remain in the original `png-unmapped-source-triage-20261118.csv` until a source-backed connection is established.

## Safe recovery and acceptance criteria

1. In the project's Supabase dashboard, set the Edge Function secret **`ODPT_CHALLENGE_CONSUMER_KEY`** to the authorized Challenge credential. **Never place it in a migration, JS frontend, workflow YAML, log, Notion record or CSV**. Configuration is a user/admin action; current automation cannot set secrets.
2. Re-run [Audit Tobu official timetable number bands (read-only)](https://github.com/biubiu52011/pixel-tetsudo/actions/workflows/audit-tobu-odpt-number-bands.yml) after Edge health reports `challengeConfigured=true`. The job uses only the existing secure proxy and can retry per-railway scopes if the unfiltered response is oversized. The 7-day artifact contains **aggregate/source-number observations only**.
3. Compare actual exact `odpt:trainNumber` strings by **`odpt:railway` + `odpt:calendar` + `odpt:railDirection` + `odpt:trainType`** and metadata date, preserving suffixes, directions and real seasonal calendars. Never turn service-name digits or formation/car numbers into train numbers. Missing results in a partial response are inconclusive.
4. For any *new* PNG number row, independently source the exact **train number ⇔ vehicle model/formation/livery** relationship and its applicable date. Existing `review` assets need independent verification. The endpoint by itself is *not* the stock identity authority.
5. Only then create a migration to the **existing** `public.published_train_png_number_ranges`, reconcile the single existing PNG CSV/triage, add regression tests and check both Pages and railway audit. Compress only verified, consecutive full train numbers; never fill gaps or broaden unrelated railway keys.

**Disposition: BLOCKED / evidence pending**. This batch intentionally adds **0 new PNGs, 0 database number ranges, and 0 new line keys**. No runtime source-of-truth, selection priority, or vehicle identity logic was changed.
