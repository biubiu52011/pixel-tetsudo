'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('css/ux-refinements.css', 'utf8');

test('history route labels can shrink without folding under the delete control', () => {
  assert.match(css, /body\[data-page="history"\] \.history-route \{[\s\S]*?min-width:\s*0;[\s\S]*?width:\s*100%;/);
  assert.match(css, /body\[data-page="history"\] \.history-route > \.history-from,[\s\S]*?\.history-to \{[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/);
  assert.match(css, /body\[data-page="history"\] \.history-arrow \{[\s\S]*?flex:\s*0 0 auto;/);
});

test('history metadata stays readable at narrow widths', () => {
  assert.match(css, /body\[data-page="history"\] \.history-lines \{[\s\S]*?flex:\s*1 1 8rem;[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/);
  assert.match(css, /@media \(max-width: 380px\) \{[\s\S]*?body\[data-page="history"\] \.history-route \{[\s\S]*?padding-right:\s*50px;/);
  assert.match(css, /body\[data-page="history"\] \.history-meta \{[\s\S]*?column-gap:\s*6px;[\s\S]*?row-gap:\s*4px;/);
});
