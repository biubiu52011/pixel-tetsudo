'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeGeneratedText,
  sameGeneratedText,
} = require('../data/core/generated-text.js');

test('generated text comparison ignores checkout newline style only', () => {
  const lf = 'first\nsecond\n';
  const crlf = 'first\r\nsecond\r\n';
  assert.equal(normalizeGeneratedText(crlf), lf);
  assert.equal(sameGeneratedText(crlf, lf), true);
});

test('generated text comparison still detects content drift', () => {
  assert.equal(sameGeneratedText('first\r\nwrong\r\n', 'first\nsecond\n'), false);
  assert.equal(sameGeneratedText('first\nsecond', 'first\nsecond\n'), false);
});
