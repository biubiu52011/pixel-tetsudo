'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');

test('train number is an internal matching key, not a fold or marker caption', () => {
  const source = read('js/trains-render.js');
  const title = source.split('  function _trainMarkerTitle(p, lineId) {')[1]
    .split('  function _trainPositionSourceText(p) {')[0];
  const fold = source.split('  function _openTrainFoldList(')[1]
    .split('  // 列车终点/方向标签')[0];
  assert.ok(!title.includes('tip.push(prefix + " " + number)'));
  assert.doesNotMatch(fold, /train-fold-official-number/);
  assert.match(source, /trainNumber/, 'matching data remains intact');
});

test('line cards omit internal running-chain relation badges', () => {
  const source = read('js/data-state.js');
  assert.doesNotMatch(source, /_chainBadgeHtml/);
  assert.match(source, /getLineIdentity/);
});

test('tourism details hide missing time and tip data', () => {
  const source = read('js/tourism-core.js');
  assert.match(source, /getI18nField\(spot, 'bestTime'\) \|\| ''/);
  assert.match(source, /if \(!Array\.isArray\(spot\.tips\) \|\| !spot\.tips\.length\) return ''/);
  for (const page of ['tourism-spot','tourism-event','tourism-shop'])
    assert.match(read('js/'+page+'.js'), /ctx\.spotBestTime/);
});

test('operator filter does not replace buttons on unchanged updates', () => {
  const source = read('js/data-state.js');
  assert.match(source, /optionsSignature === lastOptionsSignature/);
  assert.match(source, /select\(selected, false\)/);
});


test('translated run information displays only the selected language, without Japanese original', () => {
  const vm = require('node:vm');
  const source = read('js/realtime-view.js');
  assert.doesNotMatch(source, /rs-official-original|rs-cause-original|查看官方日语原文/);
  const begin = source.indexOf('  function _untranslatedOfficialText(');
  const end = source.indexOf('  function renderFilterBar(', begin);
  assert.ok(begin >= 0 && end > begin);
  const context = {
    window: { DelayTranslator: { translate: () => ({translated: '目前没有15分钟以上的延误', matched: true}) } },
    escapeHtml: s => String(s), t: () => '暂时无法翻译运行信息',
    _needsJaTranslate: s => /[\u3041-\u3096]/.test(s)
  };
  vm.createContext(context);
  vm.runInContext(source.slice(begin, end) + '\nthis.renderTranslated = _translatedText;', context);
  const original = '現在、１５分以上の遅延はありません。';
  const translated = context.renderTranslated(original, 'zh', {});
  assert.match(translated, /目前没有15分钟以上的延误/);
  assert.doesNotMatch(translated, /現在|<details|<summary/);
  assert.equal(context.renderTranslated(original, 'ja', {}), original);
  context.window.DelayTranslator = null;
  const missing = context.renderTranslated(original, 'en', {});
  assert.match(missing, /暂时无法翻译运行信息/);
  assert.doesNotMatch(missing, /現在|<details|<summary/);
});
