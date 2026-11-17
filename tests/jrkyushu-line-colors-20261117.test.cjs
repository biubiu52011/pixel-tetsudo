'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const data = JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8'));
const context = { window: { UNIFIED_LINES: data.lines } };
vm.runInNewContext(fs.readFileSync('js/line-presentation-service.js', 'utf8'), context);
const service = context.window.LinePresentationService;
const segment = (id, from, to) => service.resolveSegmentPresentation(id, from, to, data.lines);

test('JR-Kyushu retains 27 canonical records and numbered north-Kyushu symbols', () => {
  assert.equal(Object.values(data.lines).filter(l => l.operator === 'JR-Kyushu').length, 27);
  const numbered = {
    KagoshimaMainJA: ['JA', '#ed1c24'],
    KagoshimaMainJB: ['JB', '#ed1c24'],
    Sasaguri: ['JC', '#f5b000'],
    KashiiLine: ['JD', '#009cda'],
    Wakamatsu: ['JE', '#1485c5'],
    Haruda: ['JG', '#22ad4f'],
    Gotoji: ['JJ', '#7030a0'],
    Chikuhi: ['JK', '#863b99']
  };
  for (const [id,[code,color]] of Object.entries(numbered)) {
    const line = data.lines[id];
    assert.equal(line.operator,'JR-Kyushu',id);
    assert.equal(line.presentation.code,code,id);
    assert.equal(line.color.toLowerCase(),color,id);
    assert.equal(line.presentation.color.toLowerCase(),color,id);
    assert.ok(line.image.endsWith('.png'),id);
  }
});

test('long routes never advertise a limited-area official symbol as their full-line code', () => {
  for (const id of ['KagoshimaMain','Chikuho','NagasakiMain','Nippo','Hitahikosan','ChikuhiWest']) {
    assert.equal(data.lines[id].presentation.code,'',id);
    assert.ok(data.lines[id].presentation.displayRules.segmentColors.ranges.length,id);
  }
  for (const id of ['NagasakiMain','Nippo','Hitahikosan']) {
    assert.equal(data.lines[id].image,'',id + ': no whole-line icon');
  }
  assert.equal(data.lines.Hisatsu.presentation.code,'');
  assert.equal(data.lines.Hisatsu.code,'肥'); // historical internal key preserved
});

test('official J-series colors are attached only to exact named station sections', () => {
  for (const [id,from,to,code,color] of [
    ['KagoshimaMain','Moji-Ko','Komorie','JA','#ed1c24'],
    ['KagoshimaMain','Hakata','Takeshita','JB','#ed1c24'],
    ['Chikuho','Wakamatsu','Fujinoki','JE','#1485c5'],
    ['Chikuho','Orio','Higashi-Mizumaki','JC','#f5b000'],
    ['Chikuho','Katsuragawa','Kami-Honami','JG','#22ad4f'],
    ['NagasakiMain','Tosu','Shin-Tosu','JH','#f3ad19'],
    ['Nippo','Kokura','Nishi-Kokura','JF','#00b2e5'],
    ['Hitahikosan','Kokura','Jono','JI','#b6712f'],
    ['ChikuhiWest','Nishi-Karatsu','Karatsu','JK','#863b99']
  ]) {
    const a=segment(id,from,to),b=segment(id,to,from);
    assert.ok(a,id + ' ' + from);
    assert.equal(a.code,code,id);
    assert.equal(a.color,color,id);
    assert.equal(a.classified,true,id);
    assert.equal(b.code,code,id+' reverse code');
    assert.equal(b.color,color,id+' reverse color');
  }
});

test('out-of-scope stations remain neutral and do not inherit a partial symbol', () => {
  for (const [id,from,to] of [
    ['KagoshimaMain','Arao-Kumamoto','Minami-Arao'],
    ['NagasakiMain','Saga','Nabeshima'],
    ['Nippo','Yukuhashi','Minami-Yukuhashi'],
    ['Hitahikosan','Tagawa-Gotoji','JRW-Hitahikosan-1191415'],
    ['ChikuhiWest','Karatsu','Onizuka']
  ]) {
    const s=segment(id,from,to);
    assert.ok(s,id);
    assert.equal(s.code,'',id);
    assert.equal(s.color,'#80868b',id);
    assert.equal(s.classified,false,id);
  }
  assert.equal(segment('Nippo','Kokura','Yukuhashi'),null);
  assert.equal(segment('Chikuho','no-station','Orio'),null);
});

test('all Kyushu base/display colors match after repair; Shinkansen unchanged', () => {
  for (const [id,line] of Object.entries(data.lines)) {
    if(line.operator!=='JR-Kyushu'||!line.presentation) continue;
    assert.equal(line.color.toLowerCase(),line.presentation.color.toLowerCase(),id);
  }
  for(const id of ['KyushuShinkansen','NishiKyushuShinkansen'])
    assert.equal(data.lines[id].color,'#e60012',id);
  assert.equal(data.lines.KagoshimaMainJA.stations.length,32);
  assert.equal(data.lines.KagoshimaMainJB.stations.length,29);
});
