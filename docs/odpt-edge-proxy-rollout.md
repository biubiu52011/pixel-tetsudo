# ODPT credential migration: staged rollout (2026-11-15)

## Shipped

- `supabase/functions/odpt-proxy/index.ts`: host/resource/operator allowlist,
  no arbitrary URL input, no key in responses or logs, strict CORS, short
  cache, per-isolate limits, fail-closed 503 if a secret is absent.
- `data/api/odpt-unified.js`: opt-in `ODPT_PROXY_MODE: "strict"` or
  `window.ODPT_USE_EDGE_PROXY = true`. The strict branch never calls
  `getApiLinks()` / `getApiKey()` or falls back to direct ODPT on error.
- Cross-operator departure/interchange display uses independent source-only
  Wakoshi timetable links; it is NOT a new confirmed same-day running chain.

## Action required before switching

The available Supabase integration can deploy an Edge Function but cannot
manage **Edge Function Secrets**. Do not paste credentials into code, GitHub,
a chat, or a migration.

1. Open **Supabase Dashboard → Project pnupwfmgbtxqhpzsrhfn →
   Edge Functions → Secrets**.
2. Add `ODPT_CHALLENGE_CONSUMER_KEY` and
   `ODPT_PRODUCTION_CONSUMER_KEY` using **newly rotated**
   appropriate provider credentials. If the provider supplies only one
   value for both hosts, confirm ODPT permits reuse; do not assume it.
3. Check the function's health response from the site's own origin:
   `/functions/v1/odpt-proxy?health=1` must report both
   `challengeConfigured: true` and `productionConfigured: true`.
   The endpoint does not expose the values. Origin restrictions mean a
   bare curl command without the allowed Origin is denied by design.
4. Test a small read-only Tobu `train` and TokyoMetro `trainTimetable`
   request via the proxy. Confirm JSON/protobuf, rate limits and CORS.
5. Change runtime config to `ODPT_PROXY_MODE: "strict"` and regenerate
   `data/core/data-config-bundle.js`. Update page cache versions.
6. **Remove** `data/api/odpt-links.js` from the public script manifest
   and all public assets. Recheck every HTML/JS file for
   `acl:consumerKey=`, embedded key literals and encoded links.
7. Rotate/revoke previously exposed ODPT keys. A static-site history can
   keep old values accessible even after a file is removed.
8. Verify the browser Network panel: zero browser requests to
   `api.odpt.org` or `api-challenge.odpt.org` with a consumer key;
   all ODPT traffic must hit `odpt-proxy`, with no secret in URLs or
   response bodies. Check train positions, alerts, and timetable pagination
   on both mobile and desktop.

**Do not delete the working client link library or enable strict mode before
the service-side secrets have been installed and tested.** Doing so would
break ODPT realtime data. Conversely, until step 6 and key rotation
complete, the project is *not fully secure*.

### Public proxy abuse considerations

CORS/Origin checks are **not authentication**: non-browser clients can forge
the Origin header. In-memory per-isolate rate limiting and cache reduce
pressure but do not give a hard account-wide quota. Add a gateway-managed
rate limit/WAF and monitor ODPT quota use before making this proxy the
only production route. Keep supported resource types and operators narrow.
