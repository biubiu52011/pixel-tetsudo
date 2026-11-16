'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const data = JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8'));
const ctx = { window: { UNIFIED_LINES: data.lines } };
vm.runInNewContext(fs.readFileSync('js/line-presentation-service.js','utf8'), ctx, {
  filename:'js/line-presentation-service.js'
});
const service = ctx.window.LinePresentationService;
const segment = (lineId,from,to) =>
  service.resolveSegmentPresentation(lineId,from,to,data.lines);

test('all JR-West base/display colors agree and ten reviewed colors match site palette', () => {
  const west = Object.entries(data.lines).filter(([,l])=>l.operator==='JR-West');
  assert.equal(west.length,33);
  for(const [id,l] of west) assert.equal(l.color.toLowerCase(),l.presentation.color.toLowerCase(),id);
  for (const [id,color] of Object.entries({
    HimejiLine:'#f15a24',Kure:'#f6ac00',Kabe:'#00a9be',
    Yamaguchi:'#ed6945',Iwakado:'#009c9a',Ube:'#d5287d',
    SanyoMain:'#007ac0',Ako:'#007ac0',
    KansaiMain:'#00a65a',SaninMain:'#8360a8'
  })) assert.equal(data.lines[id].color,color,id);
});

test('regional color lookup uses adjacent named station edges in both directions', () => {
  for(const [lineId,from,to,code,color] of [
    ['SanyoMain','Kobe','Hyougo','A','#007ac0'],
    ['SanyoMain','Kamigoori','Mitsuishi','S','#a2c63a'],
    ['SanyoMain','Okayama','Kita-Nagase','W','#f39800'],
    ['SanyoMain','Fukuyama','Bingo-Akasaka','X','#00a6d8'],
    ['SanyoMain','Itosaki','Mihara','G','#56a83d'],
    ['SanyoMain','Hiroshima','Shin-Shiro-Shima','R','#e5434f'],
    ['Ako','Aioi-Hyogo','Nishi-Aioi','A','#007ac0'],
    ['Ako','Banshu-Ako','Tewa','N','#e63555'],
    ['KansaiMain','Nagoya','Hatta','CJ','#16b68f'],
    ['KansaiMain','Kameyama','Kan','V','#8263b1'],
    ['KansaiMain','Kamo','Kizu','Q','#00a65a'],
    ['SaninMain','Kyoto','Umekouji-Kyouto-Nishi','E','#8360a8'],
    ['SaninMain','Tottori','Koyama','A','#89b14b'],
    ['SaninMain','Yonago','Yasugi','D','#ec6935']
  ]) {
    const forward=segment(lineId,from,to),reverse=segment(lineId,to,from);
    assert.ok(forward,lineId+':'+from+'-'+to);
    assert.equal(forward.color,color,lineId+' color '+code);
    assert.equal(forward.code,code,lineId+' code');
    assert.equal(forward.classified,true);
    assert.equal(reverse.color,color,lineId+' reverse');
    assert.equal(reverse.code,code,lineId+' reverse code');
  }
});

test('unclassified sections use neutral rather than region-scoped color', () => {
  for(const [lineId,from,to] of [
    ['SanyoMain','Iwakuni','Minami-Iwakuni'],
    ['SaninMain','Fukuchiyama','Kamikawa-Kuchi'],
    ['SaninMain','Masuda','Toda-Obama']
  ]) {
    const s=segment(lineId,from,to);
    assert.equal(s.color,'#80868b',lineId);
    assert.equal(s.code,'');
    assert.equal(s.classified,false);
  }
  assert.equal(segment('SaninMain','Kyoto','Fukuchiyama'),null);
  assert.equal(segment('SanyoMain','missing','Hyougo'),null);
  assert.equal(segment('Kure','Mihara','Sunami'),null);
});

test('no region color changes railway ownership or canonical railway codes', () => {
  const central=segment('KansaiMain','Nagoya','Hatta');
  assert.equal(central.operator,'JR-Central');
  assert.equal(data.lines.KansaiMain.operator,'JR-West');
  assert.equal(data.lines.KansaiMain.code,'KansaiMain');
  assert.equal(data.lines.KansaiMain.presentation.code,'Q');
  assert.equal(data.lines.SanyoMain.presentation.code,'');
  assert.equal(data.lines.Ako.presentation.code,'');
  assert.equal(data.lines.TokaidoKansai.presentation.code,'A');
  assert.equal(data.lines.Fukuchiyama.color,'#fcc800');
});

test('map and list cards consume the same station-segment resolver without touching Joban exceptions', () => {
  const maps=fs.readFileSync('js/trains-data.js','utf8');
  const cards=fs.readFileSync('js/data-state.js','utf8');
  assert.match(maps,/resolveSegmentPresentation\(lineId, fromStation, toStation\)/);
  assert.match(maps,/Array\.isArray\(rules\.ranges\)/);
  assert.match(maps,/beforeRule = rules\.before/);
  assert.match(cards,/segmentBandHtml\(firstId, linesObj\)/);
  assert.match(cards,/segmentBandHtml\(lineId, linesObj\)/);
});
