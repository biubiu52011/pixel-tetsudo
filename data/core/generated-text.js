'use strict';

function normalizeGeneratedText(value) {
  return String(value == null ? '' : value).replace(/\r\n?/g, '\n');
}

function sameGeneratedText(actual, expected) {
  return normalizeGeneratedText(actual) === normalizeGeneratedText(expected);
}

module.exports = { normalizeGeneratedText, sameGeneratedText };
