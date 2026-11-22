# Translation ownership in Pixel Tetsudo

## Fixed editorial content
Tourism prose, tips, names, opening hours and interface copy are saved as reviewed `*_i18n` translations. `TourismDetailCore.getFixedTranslation` prefers these complete texts (including legacy `field_zh/en/ko` values) over on-device translation. Existing on-device fallback is retained for any still-missing tourism translations; this change does not pretend to have bulk-translated the entire catalog.

## Changing operational content
`DelayTranslator` uses authoritative RailwayDB station/line names and composes complete cause/line/direction/scope/effect sentences for Japanese source reports. A whole-clause existing template is the second option. If independent verified impact data exists, it may display a clearly labelled structured summary, not a claimed full translation. Unknown clauses, forecasts, and uncertain identity never produce a claimed translated notice.

No remote translation service, API key, local server or network proxy is used. The old `translateRemote` API is retained as a Promise-returning local alias. Regression: `tests/hybrid-translation.test.cjs`.
