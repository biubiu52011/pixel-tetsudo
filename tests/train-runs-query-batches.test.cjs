'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the actual batching algorithm from the Edge Function without
// invoking Deno, Supabase, or making network requests.
const source = fs.readFileSync('supabase/functions/train-runs/index.ts', 'utf8');
const start = source.indexOf('  async function batchedRows<T>(');
const end = source.indexOf('  let templates: any[] = [];', start);
assert.ok(start >= 0 && end > start, 'bounded batching implementation exists');
const impl = source.slice(start, end)
  .replace('batchedRows<T>(', 'batchedRows(')
  .replace('items: T[], batchSize: number,', 'items, batchSize,')
  .replace('fetchBatch: (batch: T[]) => Promise<any[]>,', 'fetchBatch,')
  .replace('): Promise<any[]>', ')')
  .replace('const rows: any[] = [];', 'const rows = [];')
  .replace('const reads: Promise<any[]>[] = [];', 'const reads = [];');
const ctx = vm.createContext({ Promise, Math });
vm.runInContext(impl + '\nthis.batchedRows = batchedRows;', ctx);
const batchedRows = ctx.batchedRows;

test('empty batches make no query', async () => {
  let calls = 0;
  const result = await batchedRows([], 100, async () => { calls++; return []; });
  assert.deepEqual(Array.from(result), []);
  assert.equal(calls, 0);
});
test('batch reads preserve original order with a three-request concurrency ceiling', async () => {
  const items = Array.from({ length: 810 }, (_, i) => i);
  const seen = [];
  let active = 0;
  let peak = 0;
  const returned = await batchedRows(items, 100, async batch => {
    active++;
    peak = Math.max(peak, active);
    seen.push(batch.length);
    await new Promise(resolve => setTimeout(resolve, 5 + (batch[0] % 300) / 100));
    active--;
    return [...batch];
  });
  assert.deepEqual(Array.from(returned), items);
  assert.equal(peak, 3);
  assert.deepEqual(seen, [100, 100, 100, 100, 100, 100, 100, 100, 10]);
});
test('a failed SQL read fails closed instead of serving incomplete runs', async () => {
  await assert.rejects(
    batchedRows([1, 2, 3], 1, async ([n]) => {
      if (n === 2) throw new Error('SOURCE_UNAVAILABLE');
      return [n];
    }), /SOURCE_UNAVAILABLE/
  );
});
test('time table reads still enforce provenance and stable canonical aliases', () => {
  assert.match(source, /UNMAPPED_CANONICAL_TIMETABLE_SOURCE/);
  assert.match(source, /CANONICAL_CONTINUATION_STOPS_UNAVAILABLE/);
  assert.match(source, /CANONICAL_VERIFIED_TRAIN_NUMBER_ALIASES_UNAVAILABLE/);
  assert.match(source, /source_train_number: completeStops/);
  assert.match(source, /source_line_key: completeStops/);
  assert.match(source, /status === 200 \? cors\["Cache-Control"\] : "no-store"/);
});
