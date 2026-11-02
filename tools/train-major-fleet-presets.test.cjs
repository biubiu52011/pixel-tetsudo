'use strict';
// Major rolling-stock line presets are *reference fleet candidates only*.
// They must never be treated as a train-level assignment, real carset or PNG.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const browser = {};
const ctx = {window:browser, console:{debug(){},warn(){},error(){},log(){}},
  Date, Map, Set, WeakSet, WeakMap, Promise, Object, Array, Number, String, Math};
const presetFile = fs.readFileSync(path.join(root,'data/core/major-vehicle-fleet-presets.js'),'utf8');
vm.runInNewContext(presetFile,ctx,{timeout:10000});
const presets=browser.MajorVehicleFleetPresets;
assert.ok(presets && typeof presets.lookup==='function');
const entries=presets.list();
assert.ok(entries.length>=142, 'phase-5 Shinkansen fleet preset groups missing');
const railwayData = JSON.parse(fs.readFileSync(
  path.join(root,'data/core/railway_data.compact.json'),'utf8'));
const checked = Object.keys(railwayData.lines || {});
assert.ok(checked.length>=200,'railway data failed to load');
const seen=new Set();
entries.forEach(row=>{
  assert.ok(/^https:\/\//.test(row.sourceUrl),row.id+': source');
  assert.ok(row.models.length>0,row.id+': models');
  row.lineIds.forEach(line=>{
    const key=row.operator+'|'+line;
    assert.ok(checked.includes(line),'unknown canonical line ID in preset: '+key);
    assert.equal(railwayData.lines[line].operator,row.operator,
      'operator mismatch on canonical line ID: '+key);
    assert.ok(!seen.has(key),'duplicate operator/line preset: '+key);
    seen.add(key);
    const evidence=presets.lookup(line,row.operator,'odpt.TrainType:'+row.operator+'.'+
      (row.shinkansenTypes ? 'Shinkansen' : 'Local'));
    assert.equal(evidence.evidenceRole,'route-fleet-reference');
    assert.equal(evidence._fleetReferenceOnly,true);
    assert.equal(evidence.planOverride,false);
    assert.deepEqual(Array.from(evidence.vehicleCandidates),Array.from(row.models));
    assert.ok(!evidence.iconPath && !evidence.vehicleType,
      'fleet reference cannot assign actual vehicle or PNG');
  });
});
for (const [line,op,type] of [
  ['Yamanote','TokyoMetro','Local'],
  ['Ginza','JR-East','Local'],
  ['Yamanote','JR-East','LimitedExpress'],
  ['TokyuToyoko','Tokyu','CommuterLimitedExpress'],
  ['Keiyo','JR-East','MorningLiner'],
  ['Yamanote','JR-East',''],
  ['TohokuShinkansen','JR-East','Local'],
  ['','JR-East','Local']
]) {
  const found=presets.lookup(line,op,type && 'odpt.TrainType:'+op+'.'+type);
  assert.equal(found,null,'must not use out-of-scope fleet: '+line+'/'+op+'/'+type);
}

// Phase 2: operator/route-specific fleet references, including new 2025/26 stock.
for (const [line, operator, requiredModel] of [
  ['KeioMain','Keio','京王2000系'],
  ['KeioInokashira','Keio','京王1000系'],
  ['Odawara','Odakyu','小田急5000形'],
  ['KeikyuAirport','Keikyu','京急1000形'],
  ['Keisei','Keisei','京成3200形（2025年導入）'],
  ['NaritaSkyAccess','Keisei','京成3100形'],
  ['Tojo','Tobu','東武50070型'],
  ['Noda','Tobu','東武80050型'],
  ['SotetsuMain','Sotetsu','相鉄13000系'],
  ['Ikebukuro','Seibu','西武40000系'],
  ['YokohamaBlue','YokohamaMunicipal','横浜市営地下鉄4000形'],
  ['TsukubaExpress','TsukubaExpress','TX-2000系'],
  ['Rinkai','Rinkai','東京臨海高速鉄道71-000形'],
  ['MinatoMirai','MinatoMirai','横浜高速鉄道Y500系'],
  ['SaitamaRapid','SaitamaRapidRailway','埼玉高速鉄道2000系'],
  ['TokyoMonorail','TokyoMonorail','東京モノレール10000形']
]) {
  const item=presets.lookup(line,operator,'odpt.TrainType:'+operator+'.Local');
  assert.ok(item && item.vehicleCandidates.includes(requiredModel),
    line+': missing '+requiredModel);
  assert.equal(item._fleetReferenceOnly,true,line+': fleet only');
  assert.equal(item.planOverride,false,line+': must not override a train-specific plan');
}
const access = presets.lookup('NaritaSkyAccess','Keisei',
  'odpt.TrainType:Keisei.Local');
assert.ok(!access.vehicleCandidates.some(model=>model.includes('AE')),
  'Skyliner must not be treated as an ordinary service');
const tx=presets.lookup('TsukubaExpress','TsukubaExpress',
  'odpt.TrainType:TsukubaExpress.Local');
assert.ok(tx.vehicleCandidates.some(model=>/守谷/.test(model)),
  'TX-1000 geographic constraint must remain visible');
for(const [line,op,type] of [
  ['KeioMain','Keio','KeioLiner'],
  ['Odawara','Odakyu','LimitedExpress'],
  ['KeikyuAirport','Keikyu','MorningWing'],
  ['NaritaSkyAccess','Keisei','Skyliner'],
  ['Tojo','Tobu','TJ-Liner'],
  ['Noda','Tobu','LimitedExpress'],
  ['Ikebukuro','Seibu','LimitedExpress'],
]) {
  assert.equal(presets.lookup(line,op,'odpt.TrainType:'+op+'.'+type),null,
    'premium service must not borrow commuter fleet '+line+'/'+type);
}

// Phase 3: all additions must remain source-backed, scoped reference lists.
assert.ok(seen.size>=182,'phase-5 route scopes missing');
for (const [line,operator,requiredModel] of [
  ['Musashino','JR-East','209系500番台'],
  ['Sagami','JR-East','E131系500番台'],
  ['TsurumiOkawa','JR-East','E131系1000番台'],
  ['SotetsuJRDirect','JR-East','E233系7000番台'],
  ['MarunouchiBranch','TokyoMetro','東京メトロ2000系'],
  ['ChiyodaBranch','TokyoMetro','東京メトロ05系（区間列車用）'],
  ['Arakawa','Toei','都電8900形'],
  ['SeibuShinjuku','Seibu','西武20000系'],
  ['SeibuTamako','Seibu','西武9000系'],
  ['SeibuYamaguchi','Seibu','西武L00系'],
  ['Kokubunji','Seibu','西武8000系（2025年導入）'],
  ['Seibu_Sayama','Seibu','西武7000系（2026年導入）'],
  ['Daishi_Tobu','Tobu','東武8000系'],
  ['Tobu_Kameido','Tobu','東武8000系'],
  ['TokyuOimachi','Tokyu','東急6020系'],
  ['TokyuSetagaya','Tokyu','東急300系'],
  ['Yurikamome','Yurikamome','ゆりかもめ7500系'],
  ['TamaMonorail','TamaMonorail','多摩都市モノレール1000系'],
  ['NewShuttle','SaitamaNewUrbanTransit','ニューシャトル2020系'],
  ['ChibaMonorail2','ChibaUrbanMonorail','千葉都市モノレール0形'],
  ['ShonanMonorail','ShonanMonorail','湘南モノレール5000系'],
  ['Enoshima','EnoshimaElectric','江ノ電700形（2026年導入）'],
  ['ToyoRapid','ToyoRapid','東葉高速鉄道2000系'],
  ['UtsunomiyaLRT','UtsunomiyaLightRail','宇都宮ライトレールHU300形']
]) {
  const item=presets.lookup(line,operator,'odpt.TrainType:'+operator+'.Local');
  assert.ok(item && item.vehicleCandidates.includes(requiredModel),
    line+': missing scoped reference model '+requiredModel);
  assert.equal(item._fleetReferenceOnly,true,line+': must remain fleet-only');
  assert.equal(item.planOverride,false,line+': cannot override train evidence');
  assert.ok(!item.iconPath && !item.vehicleType,line+': cannot choose PNG or identity');
}
for (const [line,op,type] of [
  ['SeibuYamaguchi','Seibu','LimitedExpress'],
  ['Enoshima','EnoshimaElectric','LimitedExpress'],
  ['Tobu_Kameido','Tobu','TJ-Liner'],
  ['Seibu_Sayama','Seibu','LimitedExpress']
]) {
  assert.equal(presets.lookup(line,op,'odpt.TrainType:'+op+'.'+type),null,
    line+': special service cannot inherit commuter fleet');
}
// A branch reference must not leak into another operator or similarly-named line.
assert.equal(presets.lookup('SeibuYamaguchi','JR-East','odpt.TrainType:JR-East.Local'),null);
assert.equal(presets.lookup('Yurikamome','TokyoMonorail','odpt.TrainType:TokyoMonorail.Local'),null);

// Phase 4: sourced regional fleet candidates are reference-only, never identity.
for (const [line,operator,expected] of [
  ['Echigo','JR-East','E129系'],
  ['Hakushin','JR-East','E129系'],
  ['Miyo','JR-East','E129系'],
  ['Yahiko','JR-East','E129系'],
  ['Agatsuma','JR-East','211系'],
  ['ChuoMain','JR-East','E127系'],
  ['Sotobo','JR-East','E131系'],
  ['NaritaAbikoBranch','JR-East','E231系0番台'],
  ['Kashima','JR-East','E131系'],
  ['Senseki','JR-East','E131系（仙石線仕様）'],
  ['SensekiTohoku','JR-East','HB-E210系'],
  ['Senzan','JR-East','E721系'],
  ['TohokuMain','JR-East','HB-E220系'],
  ['OuMain','JR-East','EV-E801系'],
  ['Oga','JR-East','EV-E801系'],
  ['Gono','JR-East','GV-E400系'],
  ['Kounan','JR-East','キハ100系・キハ110系'],
  ['Komii','JR-East','キハE200形'],
  ['Kururi','JR-East','キハE130系'],
  ['Tadami','JR-East','キハE120形'],
  ['Kamaishi','JR-East','HB-E220系'],
  ['Hachiko','JR-East','HB-E220系（非電化区間）'],
  ['Karasuyama','JR-East','EV-E301系'],
  ['Mito','JR-East','E531系'],
  ['NambuBranch','JR-East','E127系'],
  ['SeibuEn','Seibu','西武2000系']
]) {
  const item=presets.lookup(line,operator,'odpt.TrainType:'+operator+'.Local');
  assert.ok(item && item.vehicleCandidates.includes(expected),
    line+': missing regional fleet candidate '+expected);
  assert.equal(item.evidenceRole,'route-fleet-reference');
  assert.equal(item._fleetReferenceOnly,true);
  assert.equal(item.planOverride,false);
  assert.ok(!item.iconPath && !item.vehicleType,
    line+': route candidate cannot become actual vehicle identity');
}
for (const [line,op,type] of [
  ['Senseki','JR-East','LimitedExpress'],
  ['ChuoMain','JR-East','LimitedExpress'],
  ['Gono','JR-East','ResortShirakami'],
  ['Kamaishi','JR-East','SLGinga'],
  ['SeibuEn','Seibu','LimitedExpress']
]) assert.equal(presets.lookup(line,op,'odpt.TrainType:'+op+'.'+type),null,
  line+': limited/special service cannot borrow regular route fleet');
assert.equal(presets.lookup('Senzan','TokyoMetro','odpt.TrainType:TokyoMetro.Local'),null);
assert.equal(presets.lookup('Oga','JR-East','odpt.TrainType:JR-East.Shinkansen'),null);

// Phase 5: named Shinkansen services must match exact canonical operator
// and line scopes, never making a vehicle identity or choosing a PNG.
for (const [line,op,service,model] of [
  ['TohokuShinkansen','JR-East','Hayabusa','E5系'],
  ['JoetsuShinkansen','JR-East','Toki','E7系'],
  ['HokurikuShinkansen','JR-East','Kagayaki','E7系'],
  ['YamagataShinkansen','JR-East','Tsubasa','E8系'],
  ['AkitaShinkansen','JR-East','Komachi','E6系'],
  ['HokkaidoShinkansen','JR-Hokkaido','Hayate','H5系（JR北海道保有車）'],
  ['TokaidoShinkansen','JR-Central','Nozomi','N700S系'],
  ['SanyoShinkansen','JR-West','Kodama','500系'],
  ['KyushuShinkansen','JR-Kyushu','Sakura','800系'],
  ['NishiKyushuShinkansen','JR-Kyushu','Kamome','N700S系（西九州・かもめ用6両編成）']
]) {
  const v=presets.lookup(line,op,'odpt.TrainType:'+op+'.'+service);
  assert.ok(v && v.vehicleCandidates.includes(model),line+' missing '+service);
  assert.equal(v.evidenceRole,'route-fleet-reference');
  assert.equal(v._fleetReferenceOnly,true);
  assert.equal(v.planOverride,false);
  assert.ok(!v.vehicleType && !v.iconPath,line+': no Shinkansen identity/PNG');
}
for (const [line,op,type] of [
  ['TohokuShinkansen','JR-East','Local'],
  ['TohokuShinkansen','JR-East','Rapid'],
  ['TohokuShinkansen','JR-East','Nozomi'],
  ['YamagataShinkansen','JR-East','Komachi'],
  ['JoetsuShinkansen','JR-East','Hayabusa'],
  ['TokaidoShinkansen','JR-Central','Hayabusa'],
  ['SanyoShinkansen','JR-West','Tsubame'],
  ['KyushuShinkansen','JR-Kyushu','Kamome'],
  ['NishiKyushuShinkansen','JR-Kyushu','Sakura'],
  ['HokkaidoShinkansen','JR-East','Hayabusa']
]) {
  assert.equal(presets.lookup(line,op,'odpt.TrainType:'+op+'.'+type),null,
    line+': must reject out-of-scope Shinkansen service '+type);
}
assert.equal(presets.lookup('TokaidoShinkansen','JR-Central',''),null,
  'unknown Shinkansen service must not guess');

const scripts=fs.readFileSync(path.join(root,'pages/trains.html'),'utf8');
assert.ok(scripts.indexOf('major-vehicle-fleet-presets.js')>0);
assert.ok(scripts.indexOf('major-vehicle-fleet-presets.js') <
  scripts.indexOf('train-vehicle.js'),'load fleet library before consumer');

vm.runInNewContext(fs.readFileSync(path.join(root,'js/train-vehicle.js'),'utf8'),
  ctx,{filename:'train-vehicle.js',timeout:15000});
function run(lineId,op,type,level,candidate){
  const r={trainNumber:'UNKNOWN_123',calendar:'odpt.Calendar:Weekday',
    trainType:'odpt.TrainType:'+op+'.'+type};
  const tt={_positionSource:'supabase-train-run',
    _sqlVehicleMappingLevel:level||'unresolved',
    _sqlVehicleCandidateLabel:candidate||'',
    'odpt:trainType':r.trainType,_serviceDate:'2026-11-02'};
  return browser.TrainVehicle.resolveTimetableRun(r,tt,lineId,{operator:op},'2026-11-02').vehicleResult;
}
for (const [line,op] of [
  ['Yamanote','JR-East'],['Ginza','TokyoMetro'],['Mita','Toei'],
  ['TokyuToyoko','Tokyu'],['Yokosuka','JR-East'],
  ['KeioMain','Keio'],['Odawara','Odakyu'],['Keikyu','Keikyu'],
  ['Keisei','Keisei'],['Tojo','Tobu'],['Noda','Tobu'],
  ['Senseki','JR-East'],['SensekiTohoku','JR-East'],
  ['Kamaishi','JR-East'],['NambuBranch','JR-East'],
  ['SotetsuMain','Sotetsu'],['YokohamaBlue','YokohamaMunicipal'],
  ['Rinkai','Rinkai'],['TsukubaExpress','TsukubaExpress']
]) {
  const v=run(line,op,'Local');
  assert.equal(v.identityStatus,'UNKNOWN',line+': reference is not actual identity');
  assert.equal(v.iconPath,'',line+': reference cannot emit actual PNG');
  assert.equal(v.vehiclePlan?.status,'FLEET_REFERENCE',line+': missing route reference');
  assert.equal(v.vehiclePlan?.iconPath,'',line+': no fleet PNG');
}
const limited=run('Yokosuka','JR-East','LimitedExpress');
assert.ok(!limited.vehiclePlan?.models?.length,
  'LimitedExpress must not borrow conventional commuter fleet');
// An imported single historical candidate must take priority over this fallback,
// without being promoted to verified identity.
const historical=run('Yamanote','JR-East','Local','source_single_type_candidate','E235系0番台');
assert.equal(historical.identityStatus,'UNKNOWN');
assert.equal(historical.vehiclePlan?.status,'PLANNED_CANDIDATES');
assert.equal(historical.vehiclePlan?.iconPath,'');
const modelUnknown=run('Tojo','Tobu','LimitedExpress');
assert.equal(modelUnknown.identityStatus,'UNKNOWN');
assert.ok(!modelUnknown.vehiclePlan?.models?.length);
console.log('major fleet presets: PASS ('+entries.length+' operator-owned groups, '+seen.size+' line scopes)');
