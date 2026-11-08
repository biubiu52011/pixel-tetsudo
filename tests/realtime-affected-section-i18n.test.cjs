'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Keep the existing LineCard as the only affected-interval localization owner.
function lineCard() {
  const js = fs.readFileSync('js/data-state.js', 'utf8');
  const start = js.indexOf('/*\n * LineCard / SystemCard');
  assert.notEqual(start, -1);
  const i18n = {
    Kawasaki:{ja:'川崎',zh:'川崎',en:'Kawasaki',ko:'가와사키'},
    Tsurumi:{ja:'鶴見',zh:'鹤见',en:'Tsurumi',ko:'쓰루미'},
    Tokyo:{ja:'東京',zh:'东京',en:'Tokyo',ko:'도쿄'},
    Oji:{ja:'王子',zh:'王子',en:'Oji',ko:'오지'},
    'Oji-Other':{ja:'王子',zh:'王子',en:'Other Oji',ko:'다른 오지'}
  };
  const windows = {
    currentLang:'zh', RAILWAY_I18N:i18n,
    DataState:{STATUS_META:{no_data:{}}},
    RailwayDB:{
      getLineStations(id) {
        return ({KeihinTohokuNegishi:['Kawasaki','Tsurumi','Tokyo'],
          TokyoMetroNorth:['Oji'], Other:['Oji-Other']})[id] || [];
      },
      resolveStationName(id, lang) { return i18n[id] && i18n[id][lang] || id; }
    },
    t(key) { return key === 'status.toward'
      ? ({zh:'方向',ko:' 방면',en:' bound for',ja:'方面'})[windows.currentLang] : key; }
  };
  vm.runInNewContext(js.slice(start), {window:windows,document:{},console});
  return {card:windows.LineCard,window:windows};
}
test('affected station endpoints use the selected language', () => {
  const {card,window} = lineCard();
  for (const [lang,from,to] of [
    ['zh','川崎','鹤见'],['ko','가와사키','쓰루미'],['en','Kawasaki','Tsurumi']
  ]) {
    window.currentLang=lang;
    assert.equal(card.localizeStationName('川崎','KeihinTohokuNegishi'),from);
    assert.equal(card.localizeInterval('川崎→鶴見','KeihinTohokuNegishi'),from+'→'+to);
  }
  window.currentLang='ja';
  assert.equal(card.localizeInterval('川崎→鶴見','KeihinTohokuNegishi'),'川崎→鶴見');
});
test('direction text and same-name stations do not guess an ID', () => {
  const {card,window} = lineCard();
  assert.equal(card.localizeInterval('東京方面','KeihinTohokuNegishi'),'东京方向');
  window.currentLang='en';
  assert.equal(card.localizeInterval('東京方面','KeihinTohokuNegishi'),'bound for Tokyo');
  assert.equal(card.localizeStationName('王子','TokyoMetroNorth'),'Oji');
  assert.equal(card.localizeStationName('王子',''),'王子','ambiguous global name cannot choose a station');
  assert.equal(card.localizeStationName('未登録駅','KeihinTohokuNegishi'),'未登録駅');
});
test('realtime modal consumes the same line-scoped station resolver', () => {
  const source=fs.readFileSync('js/realtime-view.js','utf8');
  assert.match(source,/window\.LineCard\.localizeStationName\(name, lineId\)/);
  assert.match(source,/tStation\(parts\[0\],lineId\)/);
  assert.match(source,/tStation\(parts\[1\],lineId\)/);
  assert.match(source,/window\.LineCard\.localizeInterval\(_int,lineId\)/);
});
