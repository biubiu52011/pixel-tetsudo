'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, '..', 'data', 'api', 'odpt-unified.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function extractObjectLiteral(constName) {
  const declaration = source.indexOf(`const ${constName} =`);
  assert.notEqual(declaration, -1, `missing ${constName} declaration`);

  const start = source.indexOf('{', declaration);
  assert.notEqual(start, -1, `missing ${constName} object literal`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  throw new Error(`unterminated ${constName} object literal`);
}

function readTable(constName) {
  return vm.runInNewContext(`(${extractObjectLiteral(constName)})`, Object.create(null));
}

const operators = readTable('LINE_TO_OPERATOR');
const railwayCodes = readTable('LINE_RAILWAY_CODE');

const expected = {
  TokaidoShinkansen: ['JR-Central', 'TokaidoShinkansen'],
  TohokuShinkansen: ['JR-East', 'TohokuShinkansen'],
  JoetsuShinkansen: ['JR-East', 'JoetsuShinkansen'],
  HokurikuShinkansen: ['JR-East', 'HokurikuShinkansen'],
  YamagataShinkansen: ['JR-East', 'YamagataShinkansen'],
  AkitaShinkansen: ['JR-East', 'AkitaShinkansen'],
  HokkaidoShinkansen: ['JR-Hokkaido', 'HokkaidoShinkansen'],
  SanyoShinkansen: ['JR-West', 'SanyoShinkansen'],
  KyushuShinkansen: ['JR-Kyushu', 'KyushuShinkansen'],
  NishiKyushuShinkansen: ['JR-Kyushu', 'NishiKyushuShinkansen'],
};

for (const [lineId, [operator, railwayCode]] of Object.entries(expected)) {
  assert.equal(operators[lineId], operator, `${lineId} operator identity`);
  assert.equal(railwayCodes[lineId], railwayCode, `${lineId} railway identity`);
}

console.log(`shinkansen-line-identity: PASS (${Object.keys(expected).length})`);
'