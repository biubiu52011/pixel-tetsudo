const assert = require('node:assert/strict');
const fs = require('node:fs');

const data = JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8'));
const i18n = JSON.parse(fs.readFileSync('data/core/station_i18n.json', 'utf8'));
const odpt = fs.readFileSync('data/api/odpt-unified.js', 'utf8');
const generated = fs.readFileSync('data/core/railway-data.file.js', 'utf8');

const expected = {
  TokaidoCentral: ['JR-Central', 'Tokaido', '熱海', '米原'],
  ChuoCentral: ['JR-Central', 'Chuo', '名古屋', '塩尻'],
  KansaiCentral: ['JR-Central', 'Kansai', '名古屋', '亀山'],
  KiseiCentral: ['JR-Central', 'Kisei', '亀山', '新宮'],
  Takayama: ['JR-Central', 'Takayama', '岐阜', '富山'],
  Taketoyo: ['JR-Central', 'Taketoyo', '大府', '武豊'],
  Taita: ['JR-Central', 'Taita', '多治見', '美濃太田'],
  Gotemba: ['JR-Central', 'Gotemba', '国府津', '沼津'],
  Minobu: ['JR-Central', 'Minobu', '富士', '甲府'],
  Iida: ['JR-Central', 'Iida', '豊橋', '辰野'],
  Sangu: ['JR-Central', 'Sangu', '多気', '鳥羽'],
  Meisho: ['JR-Central', 'Meisho', '松阪', '伊勢奥津'],
  MinoAkasaka: ['JR-Central', 'MinoAkasaka', '大垣', '美濃赤坂'],
  Fujikyu: ['FujisanrokuElectricRailway', 'Fujikyu', '大月', '河口湖']
};

for (const [lineId, [operator, railwayCode, first, last]] of Object.entries(expected)) {
  const line = data.lines[lineId];
  assert.ok(line, `missing canonical line: ${lineId}`);
  assert.equal(line.operator, operator, `${lineId} operator`);
  assert.equal(i18n[line.stations[0]].ja, first, `${lineId} first station`);
  assert.equal(i18n[line.stations.at(-1)].ja, last, `${lineId} last station`);
  const order = data.lineStationOrder[lineId];
  const orderedStations = Array.isArray(order) ? order : Object.keys(order).sort((a, b) => order[a] - order[b]);
  assert.deepEqual(orderedStations, line.stations, `${lineId} order index`);
  for (const station of line.stations) {
    assert.ok(i18n[station], `${lineId} station i18n missing: ${station}`);
    assert.ok(data.stationLines[station].includes(lineId), `${station} missing ${lineId} membership`);
  }
  assert.equal(data.line_types[lineId], 'local', `${lineId} type`);
}

for (const [lineId, [, railwayCode]] of Object.entries(expected)) {
  assert.match(odpt, new RegExp('"' + lineId + '": "' + expected[lineId][0].replace('-', '\\-') + '"'));
  assert.match(odpt, new RegExp('"' + lineId + '": "' + railwayCode + '"'));
  assert.match(generated, new RegExp('"' + lineId + '"'));
}

console.log('JR Central + Fujikyu canonical line contract passed');

// JR Central route badge assets are resolved through canonical line.image.
const centralIcons = {
  "ChuoCentral": "../images/鉄道/JR東海/中央本線.svg",
  "Gotemba": "../images/鉄道/JR東海/御殿場線.svg",
  "Iida": "../images/鉄道/JR東海/飯田線.svg",
  "KansaiCentral": "../images/鉄道/JR東海/関西本線.svg",
  "Minobu": "../images/鉄道/JR東海/身延線.svg",
  "Taita": "../images/鉄道/JR東海/太多線.svg",
  "Takayama": "../images/鉄道/JR東海/高山本線.svg",
  "Taketoyo": "../images/鉄道/JR東海/武豊線.svg",
  "TokaidoCentral": "../images/鉄道/JR東海/東海道本線.svg"
};
for (const [lineId, iconPath] of Object.entries(centralIcons)) {
  assert.equal(data.lines[lineId].image, iconPath, `${lineId} line icon mapping`);
  assert.ok(fs.existsSync(iconPath.replace(/^\.\.\//, '')), `missing JR Central icon: ${iconPath}`);
}
