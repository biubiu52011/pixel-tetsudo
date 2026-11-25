'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const activeDocuments = [
  'README.md',
  'AGENTS.md',
  'ENGINEERING.md',
  'docs/README.md',
  'docs/COMPONENTS.md',
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('active documentation has no missing relative link targets', () => {
  for (const relativePath of activeDocuments) {
    const source = read(relativePath);
    const directory = path.dirname(path.join(root, relativePath));
    for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const link = match[1].replace(/^<|>$/g, '').split('#')[0];
      if (!link || /^(?:https?:|mailto:)/.test(link)) continue;
      assert.equal(
        fs.existsSync(path.resolve(directory, link)),
        true,
        `${relativePath} links to missing ${link}`,
      );
    }
  }
});

test('component index names the current trains-page owners', () => {
  const components = read('docs/COMPONENTS.md');
  const trainsPage = read('pages/trains.html');
  const owners = [
    'js/trains-data.js',
    'js/through-chip.js',
    'js/trains-detail-loader.js',
    'js/train-position-estimator.js',
    'js/train-track-layout.js',
    'js/trains-render.js',
    'js/trains-page.js',
  ];
  for (const owner of owners) {
    assert.equal(fs.existsSync(path.join(root, owner)), true, `${owner} is missing`);
    assert.match(components, new RegExp(owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(trainsPage, /src="\.\.\/js\/through-chip\.js\?v=/);
  assert.match(trainsPage, /data-script-src="\.\.\/js\/train-track-layout\.js\?v=/);
  assert.doesNotMatch(components, /through-chip\.js[^\n]*(?:removed|\u5df2\u6536\u56de)/i);
});

test('active policy documents are present at the repository root', () => {
  for (const relativePath of ['AGENTS.md', 'ENGINEERING.md', 'PROGRESS.md']) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), true, `${relativePath} is missing`);
  }
  assert.match(read('README.md'), /^# Pixel Tetsudo/m);
  assert.match(read('README.md'), /^## Architecture at a glance/m);
});
