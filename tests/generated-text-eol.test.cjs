'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeGeneratedText,
  sameGeneratedText,
} = require('../data/core/generated-text.js');

test('生成文本比较只忽略检出换行风格', () => {
  const lf = 'first\nsecond\n';
  const crlf = 'first\r\nsecond\r\n';
  assert.equal(normalizeGeneratedText(crlf), lf);
  assert.equal(sameGeneratedText(crlf, lf), true);
});

test('生成文本比较仍能检出内容偏差', () => {
  assert.equal(sameGeneratedText('first\r\nwrong\r\n', 'first\nsecond\n'), false);
  assert.equal(sameGeneratedText('first\nsecond', 'first\nsecond\n'), false);
});
