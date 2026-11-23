# Tobu 2026 ODPT TrainTimetable — train-number range audit

As of **2026-11-24 JST**, the protected source audit is complete. It remains a source-number audit, not a new PNG-to-train-number mapping.

## Source, date and access boundary

- Operator catalogue: [東武鉄道 列車時刻表 / Train timetable of Tobu](https://ckan.odpt.org/dataset/tobu__r_train_timetable), under the Public Transportation Open Data Challenge 2026 Limited License.
- Source API: `odpt:TrainTimetable`, `odpt:operator=odpt.Operator:Tobu`. Raw credential-bearing URLs are intentionally not copied here.
- The existing `supabase/functions/odpt-proxy/index.ts` supplies the server-side `ODPT_CHALLENGE_CONSUMER_KEY`; its value is never returned to browsers, audit output, Git, Notion or logs.
- The observed source date fields were `2026-03-14` and `2026-07-03`. Retrieval on 2026-11-24 is a dated static-source observation, not proof that the same records remain current indefinitely.
- The [Challenge license](https://developer.odpt.org/challenge_license) currently states an authorization end date of **2027-03-12**. Refresh or remove Challenge-derived behavior before that boundary if the license is not extended.

## Root cause and production fix

The configured credential was valid: all three Tobu GTFS-Realtime resources returned HTTP 200. JSON resources still returned proxy HTTP 502 because the allowlisted path began with `odpt:`. Passing that string directly to `new URL(resource, base)` made the URL parser treat `odpt:` as a custom scheme, so the Edge Function never contacted the selected ODPT HTTPS host.

The existing proxy now prefixes every allowlisted resource with `./` before URL resolution. This keeps both JSON and GTFS paths on the selected ODPT HTTPS host. `odpt-proxy` v4 is deployed and `ACTIVE`. A non-success upstream response may expose only its numeric status as diagnostic metadata; upstream response bodies, URLs and credential values remain suppressed.

## Complete read-only observation

The unfiltered endpoint returned exactly 1,000 rows and omitted later railways, so it is not accepted as complete. The audit now queries all **13 Tobu railway scopes × 2 calendars** (`Weekday`, `SaturdayHoliday`). Any individual scope that reaches 1,000 rows is treated as possibly truncated and fails completion.

Result:

- input and unique timetable rows: **6,766 / 6,766**
- unique full train-number strings: **3,405**
- failed or capped scopes: **0**
- missing number / unsupported number format / missing railway: **0 / 0 / 0**
- accepted number forms: digit-leading numbers plus observed Tobu operation prefixes `A`–`F` and `Y`; prefixes remain separate from the numeric portion so `A701E` cannot satisfy a digit-only `701E` envelope

## Three pre-existing large reference envelopes

These rows predate this audit. Observing a train number does not prove an actual model, formation, refurbishment state or livery.

| PNG | Existing source line key | Existing envelope | Observed exact codes | Observed ODPT railway | Verified train-to-PNG mappings |
|---|---|---|---:|---|---:|
| `東武鉄道_50050型.png` | `Hanzomon` | `0452–2282T` | 0 | none in this Tobu TrainTimetable source | 0 |
| `東武鉄道_20400型.png` | `TobuUtsunomiya` | `0401–0486N` | 86 | `Tobu.Nikko`, `Tobu.Utsunomiya` | 0 |
| `東武鉄道_10030型_50番台_更新車.png` | `Koizumi` | `0701–0764E` | 63 | `Tobu.Koizumi` | 0 |

Do not shrink the historical envelopes solely because one current source snapshot lacks a value. Do not expand them or authorize a PNG solely because a number appears. `20400` and `10030-50` still need independent, date-applicable evidence connecting each full train number to that unique vehicle identity. The `50050` Hanzomon reference is outside the observed Tobu railway values and cannot be disproved or certified by this endpoint alone.

For the full Tobu gallery, the single `png-first-number-band-inventory-20261117.csv` still contains 37 distinct Tobu PNGs: 12 with some historical or number reference and 25 without. This audit does not create a second inventory or promote any review asset.

## Disposition

The TrainTimetable source audit is **complete**. `--require-observation` passes, and the identity-boundary tests continue to reject automatic stock or artwork claims. This batch adds **0 new PNGs, 0 database number ranges and 0 new line keys**. No number-band CSV, production database row, runtime selection priority or vehicle identity rule was changed.

Any future mapping change still requires independent evidence for the exact train number ⇔ unique model, formation or livery relationship and its applicable date. Number presence alone is not authorization.
