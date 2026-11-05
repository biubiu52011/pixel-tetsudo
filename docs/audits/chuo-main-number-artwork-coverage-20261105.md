# 中央本線・列車番号と画像の適用範囲（2026-11-05）

## SQL inventory (read-only check)

Source: Supabase project `像素铁道`, `public.manual_timetable_templates`, `public.train_timetable_vehicle_mappings`.
Counts are **template records**, not unique trains or verified runs on 2026-11-05.

| SQL category | Rows |
| --- | ---: |
| ChuoMain source templates | 793 |
| With `official_service_vehicle_plan` | 143 |
| With `published_number_family_plan` | 40 |
| Without an attached timetable-level mapping | 610 |

The 610 unmapped templates include 362 distinct train-number strings; they **are not necessarily missing front-end art**, because `TrainNumberPngRanges` and independent official references also match some positions.

SQL source labels: 498 templates (264 distinct train-number strings) say `211系 / E233系0番台`, which is a mixed **candidate label** and is insufficient to identify the actual carset. `E131系200番台` is another regional candidate for applicable local workings.

Examples: `321M` / `323M` have source timetable positions, but the source's mixed candidate label is not evidence of their physical set. `640M` is a separately indexed E233-0 continuation. `9086M` is a date-restricted E353 limited express; its PNG must not appear on an unverified date. `2201M`, `2401M`, `3526M` must not be inferred as JR 211 or E233 solely from their suffix.

## Runtime decision

- Keep existing official/source/date-scoped PNG mappings in `data/timetables/train-number-png-ranges.js` unchanged.
- For positions with no authorized gallery PNG, show a **neutral location dot** and an accessible train label. The folded train list shows the train number and `車種未確認` or available candidate references; it does not create a fake train front.
- On SVG PNG load failure, swap to the same neutral marker in the existing train component; do not insert a browser emoji.
- A known train number is **not** by itself proof of the model. Never promote the mixed SQL label to a physical-car identity or broaden date-restricted images.

## Remaining coverage work

Reconcile the 610 template-level gaps against edition-specific official number, service calendar, source railway, published stock evidence and gallery assets before expanding image rules. Do not convert an interval or mixed candidate list into a definite model.
