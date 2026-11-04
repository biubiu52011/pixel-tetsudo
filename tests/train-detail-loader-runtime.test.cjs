'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const spec = require('../scripts/page-scripts.json');
const core = spec.lazy.trains;
const scopes = spec.lazyScopes.trains;
const source = fs.readFileSync('js/trains-detail-loader.js', 'utf8');

function fixture() {
  const append = [];
  const events = [];
  const nodes = core.map(path => ({
    getAttribute(name) {
      if (name === 'data-script-src') return '../' + path + '?v=000000000000';
      if (name === 'data-line-scope') return scopes[path] ? scopes[path].join(',') : null;
      return null;
    }
  }));
  const document = {
    getElementById(id) {
      return id === 'pt-trains-detail-assets'
        ? { content: { querySelectorAll() { return nodes; } } } : null;
    },
    createElement(name) { assert.equal(name, 'script'); return {}; },
    head: {
      appendChild(script) {
        assert.equal(script.async, false, 'classic scripts must not race');
        append.push(script.src);
        setImmediate(() => script.onload());
      }
    }
  };
  const window = { dispatchEvent(event) { events.push(event.type); } };
  vm.runInNewContext(source, {
    window, document, console, Promise, Set, CustomEvent: function(type) { this.type = type; },
    requestAnimationFrame(fn) { fn(); }, setTimeout(fn) { setImmediate(fn); }
  }, { timeout: 3000 });
  return { loader: window.TrainsDetailLoader, append, events };
}
function urls(line) {
  return core.filter(path => !scopes[path] || scopes[path].includes(line))
    .map(path => '../' + path + '?v=000000000000');
}

test('first open only loads indexes for selected line and preserves manifest order', async () => {
  const f = fixture();
  assert.equal(f.loader.isReady('Yamanote'), false);
  await f.loader.load('Yamanote');
  assert.deepEqual(f.append, urls('Yamanote'));
  assert.equal(f.loader.isReady('Yamanote'), true);
  assert.ok(f.append.some(url => url.includes('jreast-yamanote-2611-number-index')));
  assert.ok(!f.append.some(url => url.includes('jreast-keihin-2611-number-index')));
  assert.ok(!f.append.some(url => url.includes('jreast-yokohama-2611-number-index')));
});

test('switching lines fetches missing modules once and supports concurrent routes', async () => {
  const f = fixture();
  const [a,b] = await Promise.all([
    f.loader.load('Yamanote'), f.loader.load('KeihinTohoku')
  ]);
  assert.equal(f.loader.isReady('Yamanote'), true);
  assert.equal(f.loader.isReady('KeihinTohoku'), true);
  assert.equal(new Set(f.append).size, f.append.length,
    'a successful classic script must never be executed twice');
  const prev = f.append.length;
  await f.loader.load('Yamanote');
  assert.equal(f.append.length, prev, 'reopen uses already loaded scripts');
  await f.loader.load('Yokohama');
  assert.equal(new Set(f.append).size, f.append.length);
  assert.ok(f.append.some(url => url.includes('jreast-yokohama-2611-number-index')));
});

test('missing or malicious route ID never injects network scripts', async () => {
  const f = fixture();
  await assert.rejects(f.loader.load('../../etc/passwd'), /Invalid line ID/);
  assert.equal(f.loader.isReady('../../etc/passwd'), false);
  assert.equal(f.append.length, 0);
});

test('existing SQL first artwork and evidence channels remain connected', () => {
  const edge = fs.readFileSync('supabase/functions/train-runs/index.ts', 'utf8');
  const client = fs.readFileSync('data/api/odpt-unified.js', 'utf8');
  for (const key of ['vehicle_artwork_path', 'vehicle_candidate_artwork_path',
    'vehicle_mapping_level', 'vehicle_evidence_source', 'vehicle_plan_confirmed']) {
    assert.ok(edge.includes(key), 'SQL output missing ' + key);
    assert.ok(client.includes('run.' + key), 'frontend SQL consumer missing ' + key);
  }
  assert.ok(client.includes('_sqlVehicleArtworkPath'));
  assert.ok(client.includes('_sqlCandidateArtworkPath'));
});
