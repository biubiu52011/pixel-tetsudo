#!/usr/bin/env node
'use strict';
// Canonical manifest -> static HTML tags. Defer preserves DOMContentLoaded and
// the global-script dependency order while allowing parallel network requests.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), spec = require('./page-scripts.json');
const check = process.argv.includes('--check');
if (spec.version !== 1) throw Error('Unsupported manifest version');
function expand(items, stack = []) {
  return items.flatMap(item => {
    if (!item.startsWith('@')) return [item];
    const name = item.slice(1);
    if (!Object.prototype.hasOwnProperty.call(spec.groups, name)) throw Error('Unknown script group: ' + name);
    if (stack.includes(name)) throw Error('Cyclic script group: ' + name);
    return expand(spec.groups[name], [...stack, name]);
  });
}
function version(asset) {
  if (!/^(js|data)\/[a-zA-Z0-9_./-]+\.js$/.test(asset) || asset.includes('..')) throw Error('Unsafe asset: ' + asset);
  const buf = fs.readFileSync(path.join(root, asset));
  return crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex').slice(0, 12);
}
function tags(assets, phase) {
  if (new Set(assets).size !== assets.length) throw Error('Repeated script: ' + assets.join(','));
  return assets.map(s => '    <script' + (phase === 'body' ? ' defer' : '') + ' src="../' + s + '?v=' + version(s) + '"></script>').join('\n');
}
function region(html, phase, text, filename) {
  const a = '    <!-- pt:scripts:' + phase + ':start -->', b = '    <!-- pt:scripts:' + phase + ':end -->';
  if (html.split(a).length !== 2 || html.split(b).length !== 2 || html.indexOf(a) >= html.indexOf(b)) throw Error('Invalid markers in ' + filename);
  return html.slice(0, html.indexOf(a) + a.length) + '\n' + text + '\n' + html.slice(html.indexOf(b));
}
let stale = 0;
for (const [name, items] of Object.entries(spec.pages)) {
  if (!/^[a-z-]+$/.test(name)) throw Error('Unsafe page name: ' + name);
  const file = path.join(root, 'pages', name + '.html'), original = fs.readFileSync(file, 'utf8');
  const head = expand(spec.head), body = expand(items);
  const lazy = expand((spec.lazy && spec.lazy[name]) || []);
  const scopes = (spec.lazyScopes && spec.lazyScopes[name]) || {};
  for (const [asset, lines] of Object.entries(scopes)) {
    if (!lazy.includes(asset) || !Array.isArray(lines) || !lines.length ||
        new Set(lines).size !== lines.length ||
        lines.some(id => !/^[A-Za-z0-9._:-]+$/.test(id))) {
      throw Error('Invalid scoped asset: ' + name + ':' + asset);
    }
  }
  if (new Set(lazy).size !== lazy.length || lazy.some(s => head.includes(s) || body.includes(s))) {
    throw Error('Duplicated lazy script: ' + name);
  }
  if (new Set([...head, ...body]).size !== head.length + body.length) throw Error('Duplicate head/body asset: ' + name);
  let result = region(original, 'head', tags(head, 'head'), file);
  result = region(result, 'body', tags(body, 'body'), file);
  if (lazy.length) {
    const inert = '    <template id="pt-trains-detail-assets">\n' +
      lazy.map(s => '      <span data-script-src="../' + s + '?v=' + version(s) + '"' +
        (scopes[s] ? ' data-line-scope="' + scopes[s].join(',') + '"' : '') + '></span>').join('\n') +
      '\n    </template>';
    result = region(result, 'lazy', inert, file);
  }
  if ((result.match(/<script\b/gi) || []).length !== head.length + body.length) throw Error('Unexpected script outside manifest: ' + name);
  if (result !== original) {
    stale++;
    if (!check) fs.writeFileSync(file, result);
    console.log((check ? 'STALE ' : 'SYNC ') + path.relative(root, file));
  }
}
if (check && stale) {
  console.error('Run node scripts/sync-page-scripts.cjs');
  process.exitCode = 1;
} else console.log('Page script manifest OK (' + Object.keys(spec.pages).length + ' pages)');
