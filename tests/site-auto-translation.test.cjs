'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../js/lang-init.js'), 'utf8');

function boot({ stored = null, locales = ['en-US'], translator = null } = {}) {
  const storage = { value: stored, getItem() { return this.value; },
    setItem(key, value) { this.value = value; } };
  const doc = {
    readyState: 'loading', documentElement: { lang: '' },
    addEventListener() {}, getElementById() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }
  };
  const win = { Translator: translator, t: key => key };
  vm.runInNewContext(script, {
    window: win, document: doc, navigator: { languages: locales, language: locales[0] },
    localStorage: storage, location: { hash: '', pathname: '/pages/home.html' },
    Promise, Map, Set, Array, String, Object
  }, { filename: 'lang-init.js' });
  return { win, doc, storage };
}

function node(text) {
  const attrs = { 'data-auto-translate': 'ja' };
  return {
    textContent: text, isConnected: true,
    matches(query) { return query === '[data-auto-translate]'; },
    querySelectorAll() { return []; },
    getAttribute(key) { return attrs[key] || null; },
    setAttribute(key, value) { attrs[key] = value; }
  };
}

test('first visit follows browser language; saved manual choice takes priority', () => {
  assert.equal(boot({ locales: ['ko-KR'] }).win.currentLang, 'ko');
  assert.equal(boot({ locales: ['zh-Hant-TW'] }).win.currentLang, 'zh');
  assert.equal(boot({ stored: 'ja', locales: ['en-US'] }).win.currentLang, 'ja');
  assert.equal(boot({ locales: ['fr-FR'] }).win.currentLang, 'ja');
});

test('missing Japanese content uses on-device translation and returns to source', async () => {
  const translator = {
    availability: async () => 'available',
    create: async () => ({ translate: async text => 'Translation: ' + text })
  };
  const { win } = boot({ translator });
  const el = node('列車に遅れが出ています');
  win.SiteAutoTranslate.scan(el);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(el.textContent, 'Translation: 列車に遅れが出ています');
  assert.equal(el.getAttribute('lang'), 'en');
  assert.equal(win.setSiteLanguage('ja'), true);
  win.SiteAutoTranslate.scan(el);
  assert.equal(el.textContent, '列車に遅れが出ています');
});

test('missing Translator API retains original text, never contacts a remote service', async () => {
  const { win } = boot({ translator: null });
  const el = node('線路内安全確認');
  win.SiteAutoTranslate.scan(el);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(el.textContent, '線路内安全確認');
  assert.equal(await win.SiteAutoTranslate.translateText(el.textContent, 'en'), null);
});

test('slow old-language translation cannot overwrite a later language selection', async () => {
  let resolve;
  const translator = {
    availability: async () => 'available',
    create: async () => ({ translate: () => new Promise(r => { resolve = r; }) })
  };
  const { win } = boot({ translator });
  const el = node('運転見合わせ');
  win.SiteAutoTranslate.scan(el);
  await new Promise(r => setImmediate(r));
  assert.equal(win.setSiteLanguage('ja'), true);
  win.SiteAutoTranslate.scan(el);
  resolve('Suspended');
  await new Promise(r => setImmediate(r));
  assert.equal(el.textContent, '運転見合わせ');
});
