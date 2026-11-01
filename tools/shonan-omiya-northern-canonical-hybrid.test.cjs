'use strict';

// Published timetable proof only: 263 Omiya reciprocal-source services.
// A full three-leg Tokaido→Shonan→Takasaki service is one canonical train,
// but train position truth remains the current ODPT observation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const resolverText=fs.readFileSync('js/running-chain-resolver.js','utf8');
const fusionText=fs.readFileSync('js/data-fusion.js','utf8');
const edgeText=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const estText=fs.readFileSync('js/train-position-estimator.js','utf8');
const cfgText=fs.readFileSync('data/core/runtime-config.js','utf8');
const w={UNIFIED_LINES:{},RuntimeConfig:{VERIFIED_CANONICAL_PLAN_PARTNERS:{
  ShonanShinjuku:['Tokaido','Takasaki','UtsunomiyaJR'],
  Takasaki:['ShonanShinjuku'],UtsunomiyaJR:['ShonanShinjuku']}}};
vm.runInNewContext(resolverText,{window:w,console});
const resolver=w.RunningChainResolver;
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('ShonanShinjuku')),
  ['Tokaido','Takasaki','UtsunomiyaJR']);
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('Takasaki')),['ShonanShinjuku']);
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('UtsunomiyaJR')),['ShonanShinjuku']);
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('Yokosuka')),[]);
const a=fusionText.indexOf('  function _linkVerifiedCanonicalRealtime(');
const b=fusionText.indexOf('  function loadTrainPositions()',a);
assert.ok(a>=0 && b>a);
const ctx={window:w,console};vm.createContext(ctx);
vm.runInContext(fusionText.slice(a,b),ctx);
const link=ctx._linkVerifiedCanonicalRealtime;

function alias(line,num,dir) {
 const rail={ShonanShinjuku:'ShonanShinjuku',Takasaki:'Takasaki',UtsunomiyaJR:'Utsunomiya',
  Tokaido:'Tokaido'}[line];
 return {line_key:line,train_number:num,direction_urn:'odpt.RailDirection:'+dir,
   railway_urn:'odpt.Railway:JR-East.'+rail};
}
function plan(line,number,dir,modelLines,opts={}) {
 const aliases=[alias('ShonanShinjuku',number,dir==='NORTH'?'Northbound':'Southbound')];
 if(modelLines.includes('Takasaki'))
   aliases.push(alias('Takasaki',number,dir==='NORTH'?'Outbound':'Inbound'));
 if(modelLines.includes('UtsunomiyaJR'))
   aliases.push(alias('UtsunomiyaJR',number,dir==='NORTH'?'Outbound':'Inbound'));
 if(modelLines.includes('Tokaido'))
   aliases.push(alias('Tokaido',number,dir==='NORTH'?'Inbound':'Outbound'));
 const direction={ShonanShinjuku:dir==='NORTH'?'Northbound':'Southbound',
 Takasaki:dir==='NORTH'?'Outbound':'Inbound',UtsunomiyaJR:dir==='NORTH'?'Outbound':'Inbound',
 Tokaido:dir==='NORTH'?'Inbound':'Outbound'}[line];
 const rail={ShonanShinjuku:'ShonanShinjuku',Takasaki:'Takasaki',
   UtsunomiyaJR:'Utsunomiya',Tokaido:'Tokaido'}[line];
 const stops=dir==='NORTH'
 ? ['Kozu','Ofuna','Yokohama','Shinjuku','Urawa','Omiya','Miyahara','Kumagaya','Takasaki','Kuki','Koganei']
 : ['Takasaki','Kumagaya','Miyahara','Koganei','Kuki','Omiya','Urawa','Shinjuku','Yokohama','Ofuna','Kozu'];
 return Object.assign({serviceDate:'2026-11-01',trainNumber:number,
   railDirection:direction,sourceRailway:'odpt.Railway:JR-East.'+rail,
   positionSource:'supabase-train-run',estimated:true,
   canonicalGroupEvidence:'verified_continuation',canonicalTimetableId:810,
   canonicalLineIds:modelLines,
   canonicalTrainNumberAliases:aliases,canonicalStopKeys:stops,
   runningChainId:'canonical-sql-trip:2026-11-01:810'},opts);
}
function live(line,number,dir,from,to,opts={}) {
 const direction=line==='ShonanShinjuku'?
   (dir==='NORTH'?'Northbound':'Southbound'):(dir==='NORTH'?'Outbound':'Inbound');
 const railway={ShonanShinjuku:'ShonanShinjuku',
 Takasaki:'Takasaki',UtsunomiyaJR:'Utsunomiya'}[line];
 return Object.assign({serviceDate:'2026-11-01',trainNumber:number,
   railDirection:direction,sourceRailway:'odpt.Railway:JR-East.'+rail,
   positionSource:'realtime-api',estimated:false,
   sourceFromStation:'odpt.Station:JR-East.'+railway+'.'+from,
   sourceToStation:'odpt.Station:JR-East.'+railway+'.'+to},opts);
}
const cases=[
 {label:'Tokaido-Shonan-Takasaki triple north',name:'2820Y',dir:'NORTH',
  planLine:'ShonanShinjuku',liveLine:'Takasaki',from:'Omiya',to:'Miyahara',
  modelLines:['Tokaido','ShonanShinjuku','Takasaki']},
 {label:'Takasaki-Shonan-Tokaido triple south',name:'2821Y',dir:'SOUTH',
  planLine:'ShonanShinjuku',liveLine:'Takasaki',from:'Kumagaya',to:'Miyahara',
  modelLines:['Takasaki','ShonanShinjuku','Tokaido']},
 {label:'Utsunomiya north',name:'2520Y',dir:'NORTH',
  planLine:'ShonanShinjuku',liveLine:'UtsunomiyaJR',from:'Omiya',to:'Kuki',
  modelLines:['ShonanShinjuku','UtsunomiyaJR']},
 {label:'Utsunomiya south',name:'2521Y',dir:'SOUTH',
  planLine:'UtsunomiyaJR',liveLine:'ShonanShinjuku',from:'Urawa',to:'Shinjuku',
  modelLines:['UtsunomiyaJR','ShonanShinjuku']},
 {label:'Takasaki south',name:'2821Y',dir:'SOUTH',
  planLine:'Takasaki',liveLine:'ShonanShinjuku',from:'Urawa',to:'Shinjuku',
  modelLines:['Takasaki','ShonanShinjuku']},
];
for(const c of cases){
 const planned=plan(c.planLine,c.name,c.dir,c.modelLines);
 const observed=live(c.liveLine,c.name,c.dir,c.from,c.to);
 assert.equal(link({[c.planLine]:[planned]},{[c.liveLine]:[observed]}),1,c.label);
 assert.equal(observed.runningChainId,planned.runningChainId,c.label);
 assert.equal(observed.positionSource,'realtime-api');
 assert.equal(observed.vehicleFormationId,undefined);
 assert.equal(observed.vehicleType,undefined);
}
const base=plan('ShonanShinjuku','2820Y','NORTH',['Tokaido','ShonanShinjuku','Takasaki']);
const obs=()=>live('Takasaki','2820Y','NORTH','Omiya','Miyahara');
const rejects=[
 ['same-number no northern canonical lines',{ShonanShinjuku:[plan('ShonanShinjuku','2820Y','NORTH',['Tokaido','ShonanShinjuku'])]},{Takasaki:[obs()]}],
 ['source-only not verified',{ShonanShinjuku:[plan('ShonanShinjuku','2820Y','NORTH',['ShonanShinjuku','Takasaki'],{canonicalGroupEvidence:'source_only'})]},{Takasaki:[obs()]}],
 ['wrong number',{ShonanShinjuku:[base]},{Takasaki:[live('Takasaki','2822Y','NORTH','Omiya','Miyahara')]}],
 ['wrong source operator',{ShonanShinjuku:[base]},{Takasaki:[live('Takasaki','2820Y','NORTH','Omiya','Miyahara',{sourceRailway:'odpt.Railway:TokyoMetro.Takasaki'})]}],
 ['wrong direction',{ShonanShinjuku:[base]},{Takasaki:[live('Takasaki','2820Y','SOUTH','Omiya','Miyahara')]}],
 ['service date mismatch',{ShonanShinjuku:[base]},{Takasaki:[live('Takasaki','2820Y','NORTH','Omiya','Miyahara',{serviceDate:'2026-11-02'})]}],
 ['station missing',{ShonanShinjuku:[base]},{Takasaki:[live('Takasaki','2820Y','NORTH','Sendai','Miyahara')]}],
 ['backwards stop order',{ShonanShinjuku:[base]},{Takasaki:[live('Takasaki','2820Y','NORTH','Kumagaya','Miyahara')]}],
 ['two candidate train IDs',{ShonanShinjuku:[base,plan('ShonanShinjuku','2820Y','NORTH',['ShonanShinjuku','Takasaki'],{canonicalTimetableId:811,runningChainId:'canonical-sql-trip:2026-11-01:811'})]},{Takasaki:[obs()]}],
 ['two live observations',{ShonanShinjuku:[base]},{Takasaki:[obs(),obs()]}],
 ['wrong partner line',{ShonanShinjuku:[base]},{UtsunomiyaJR:[live('UtsunomiyaJR','2820Y','NORTH','Omiya','Kuki')]}],
 ['no source member aliases',{ShonanShinjuku:[plan('ShonanShinjuku','2820Y','NORTH',['ShonanShinjuku','Takasaki'],{canonicalTrainNumberAliases:[]})]},{Takasaki:[obs()]}],
];
for(const [label,plans,observations] of rejects){
 const rows=Object.values(observations).flat();
 assert.equal(link(plans,observations),0,label);
 assert.ok(rows.every(x=>!x.runningChainId),label);
}
assert.match(edgeText,/"Takasaki","UtsunomiyaJR"\]\.includes\(lineId\)/);
assert.match(edgeText,/lines\.includes\("ShonanShinjuku"\)/);
assert.match(estText,/Takasaki","UtsunomiyaJR"\]\.some/);
assert.match(cfgText,/Takasaki: Object\.freeze\(\["ShonanShinjuku"\]\)/);
console.log('Shonan Omiya northern HYBRID 263 verified pairs: PASS');
