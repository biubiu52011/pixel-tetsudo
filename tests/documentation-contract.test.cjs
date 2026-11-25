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

test('现役文档不存在缺失的相对链接目标', () => {
  for (const relativePath of activeDocuments) {
    const source = read(relativePath);
    const directory = path.dirname(path.join(root, relativePath));
    for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const link = match[1].replace(/^<|>$/g, '').split('#')[0];
      if (!link || /^(?:https?:|mailto:)/.test(link)) continue;
      assert.equal(
        fs.existsSync(path.resolve(directory, link)),
        true,
        `${relativePath} 链接到缺失目标 ${link}`,
      );
    }
  }
});

test('组件索引列出当前列车页所有者', () => {
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
    assert.equal(fs.existsSync(path.join(root, owner)), true, `${owner} 不存在`);
    assert.match(components, new RegExp(owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(trainsPage, /src="\.\.\/js\/through-chip\.js\?v=/);
  assert.match(trainsPage, /data-script-src="\.\.\/js\/train-track-layout\.js\?v=/);
  assert.doesNotMatch(components, /through-chip\.js[^\n]*(?:removed|\u5df2\u6536\u56de)/i);
});

test('现役规范文档存在于仓库根目录', () => {
  for (const relativePath of ['AGENTS.md', 'ENGINEERING.md', 'PROGRESS.md']) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), true, `${relativePath} 不存在`);
  }
  assert.match(read('README.md'), /^# Pixel Tetsudo/m);
  assert.match(read('README.md'), /^## 架构概览/m);
});
