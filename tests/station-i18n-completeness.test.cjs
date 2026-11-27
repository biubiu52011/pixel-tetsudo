// Run with: node --test tests/station-i18n-completeness.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('station names have four nonempty languages and generated copies match', () => {
  const compact = read('data/core/station_i18n.compact.json');
  const stations = JSON.parse(compact);
  assert.deepEqual(JSON.parse(read('data/core/station_i18n.json')), stations);
  assert.equal(read('data/core/station-i18n.file.js').trim(),
    'window.RAILWAY_I18N = ' + compact.trim() + ';');
  for (const [id, station] of Object.entries(stations)) {
    for (const lang of ['ja', 'zh', 'ko', 'en']) {
      assert.ok(typeof station[lang] === 'string' && station[lang].trim(),
        id + ': missing ' + lang);
    }
    assert.match(station.ko, /[\uac00-\ud7af]/, id + ': Korean station name missing');
    assert.doesNotMatch(station.zh, /[\u3040-\u309f\u30a1-\u30fa\u30fd-\u30ff]/, id + ': untranslated Japanese kana in Chinese name');
    assert.doesNotMatch(station.ko, /[\u3040-\u309f\u30a1-\u30fa\u30fd-\u30ff]/, id + ': untranslated Japanese kana in Korean name');
  }
});

test('all railway lines have four language names and generated copies match', () => {
  const compact = read('data/core/railway_data.compact.json');
  const railway = JSON.parse(compact);
  assert.deepEqual(JSON.parse(read('data/core/railway_data.json')), railway);
  assert.equal(read('data/core/railway-data.file.js').trim(),
    'window.RAILWAY_DATA = ' + compact.trim() + ';');
  for (const [id, line] of Object.entries(railway.lines)) {
    for (const key of ['nameJa', 'nameZh', 'nameKo', 'nameEn']) {
      assert.ok(typeof line[key] === 'string' && line[key].trim(),
        id + ': missing ' + key);
    }
  }
});


test('Other 展示组已登记14线的车站坐标、顺序、反向索引及展示元数据完整', () => {
  const railway = JSON.parse(read('data/core/railway_data.json'));
  const names = JSON.parse(read('data/core/station_i18n.json'));
  const ids = ["Yurikamome","MinatoMirai","Rinkai","TsukubaExpress","TamaMonorail","NewShuttle","TokyoMonorail","ChibaMonorail1","ChibaMonorail2","ShonanMonorail","ToyoRapid","SaitamaRapid","UtsunomiyaLRT","HojoRailway"];
  for (const id of ids) {
    const line = railway.lines[id];
    assert.equal(new Set(line.stations).size, line.stations.length, id);
    for (const [index, station] of line.stations.entries()) {
      assert.ok(Number.isFinite(railway.stations[station]?.lat) && Number.isFinite(railway.stations[station]?.lng), id + '/' + station);
      assert.ok(railway.stationLines[station]?.includes(id), id + '/' + station);
      assert.equal(railway.lineStationOrder[id]?.[station], index, id + '/' + station);
      for (const lang of ['ja','en','zh','ko']) assert.ok(names[station]?.[lang], station + '/' + lang);
    }
    for (const lang of ['nameJa','nameEn','nameZh','nameKo']) assert.ok(line.presentation?.[lang], id + '/' + lang);
  }
  assert.equal(railway.name_map['流山セントラルパーク'], 'Nagareyama-Central-Park');
  assert.equal(railway.name_map['柏の葉キャンパス'], 'Kashiwanoha-Campus');
  assert.equal(names['Nagareyama-Central-Park'].ja, '流山セントラルパーク');
  assert.ok(Math.abs(railway.stations.Yashio.lat - 35.80756) < 0.001);
  for (const id of ["Hashira","Nagase","Kashiwa-No-Ha","Mirai-Daira","Midori-No"]) {
    assert.ok(!railway.stations[id] && !railway.stationLines[id], id);
    assert.ok(!Object.hasOwn(railway.lineStationOrder.TsukubaExpress, id), id);
  }
  assert.equal(railway.lines.ChibaMonorail1.presentation.code, 'CM');
  assert.equal(railway.lines.ChibaMonorail2.presentation.code, 'CM');
  assert.equal(railway.lines.ShonanMonorail.presentation.code, 'SMR');
  assert.equal(railway.lines.UtsunomiyaLRT.presentation.code, '');
});
