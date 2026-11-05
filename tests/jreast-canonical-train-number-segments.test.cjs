'use strict';
// Public JR train numbers are source/segment facts, not numbers generated
// from the canonical trip ID or converted using line-wide suffix rules.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const api=fs.readFileSync('data/api/odpt-unified.js','utf8');
const est=fs.readFileSync('js/train-position-estimator.js','utf8');

const begin=est.indexOf('  function _canonicalTrainNumberAtPosition(');
const end=est.indexOf('  function compileTrainRun(',begin);
assert.ok(begin>=0 && end>begin, 'canonical number resolver must exist');
const context=vm.createContext({});
vm.runInContext(est.slice(begin,end)+
  '\nthis.resolveNumber=_canonicalTrainNumberAtPosition;',context);
const resolve=context.resolveNumber;
const aliases=[
  {line_key:'ChuoMain',train_number:'640M'},
  {line_key:'ChuoMain',train_number:'640T'},
  {line_key:'ChuoRapid',train_number:'640T'},
  {line_key:'TsurumiOkawa',train_number:'712'},
  {line_key:'TsurumiOkawa',train_number:'712B'}
];
function plan(overrides={}){
  return {_positionSource:'supabase-train-run',
    _canonicalGroupEvidence:'verified_continuation',
    _canonicalTrainNumberAliases:aliases,...overrides};
}
function stop(line,number) {
  return {sourceLineKey:line,sourceTrainNumber:number};
}

test('JR 640M -> 640T uses the exact source section, not a guessed suffix',()=>{
  const t=plan();
  assert.equal(resolve(t,stop('ChuoMain','640M'),'640M'),'640M','western segment');
  assert.equal(resolve(t,stop('ChuoRapid','640T'),'640M'),'640T','eastern segment');
  assert.equal(resolve(t,stop('ChuoMain','640T'),'640M'),'640T','verified main-line alias');
  assert.equal(resolve(t,stop('ChuoRapid','640H'),'640M'),'640M','unlisted suffix rejected');
  assert.equal(resolve(t,stop('OtherLine','640T'),'640M'),'640M','wrong source line rejected');
});
test('Tsurumi 712 and 712B stay distinct official numbers',()=>{
  const t=plan();
  assert.equal(resolve(t,stop('TsurumiOkawa','712'),'712'),'712','07:18 train');
  assert.equal(resolve(t,stop('TsurumiOkawa','712B'),'712B'),'712B','07:56 train');
  assert.equal(resolve(t,stop('TsurumiOkawa','712C'),'712'),'712','no invented letter');
});
test('unverified and realtime data are not rewritten',()=>{
  assert.equal(resolve(plan({_canonicalGroupEvidence:'source_only'}),
    stop('ChuoRapid','640T'),'640M'),'640M','source-only');
  assert.equal(resolve(plan({_positionSource:'realtime-api'}),
    stop('ChuoRapid','640T'),'640M'),'640M','realtime must retain provider number');
  assert.equal(resolve(plan({_canonicalTrainNumberAliases:[]}),
    stop('ChuoRapid','640T'),'640M'),'640M','missing alias');
  assert.equal(resolve(plan(),null,'640M'),'640M','missing stop');
});
test('SQL stop source survives server -> adapter -> estimator -> marker',()=>{
  assert.match(edge,/source_template_id,line_key,train_number/);
  assert.match(edge,/source_train_number: completeStops/);
  assert.match(edge,/source_line_key: completeStops/);
  assert.match(api,/o\["_sqlTrainNumber"\]=String\(s\.source_train_number\)/);
  assert.match(api,/o\["_sqlSourceLineKey"\]=String\(s\.source_line_key\)/);
  assert.match(est,/sourceTrainNumber: String\(raw\["_sqlTrainNumber"\]/);
  assert.match(est,/canonicalNumberStop = lastDepartedStop\.sourceStop/);
  assert.match(est,/trainNumber: publicTrainNumber,/);
  assert.match(est,/runningChainId: timetableIdentity,/,
    'train identity must remain unchanged when its public number changes');
});
