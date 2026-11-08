'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

function el(tag) {
  return {
    tag,children:[],hidden:false,textContent:'',className:'',
    appendChild(child){this.children.push(child);return child;},
    replaceChildren(...children){this.children=children;},
  };
}
function walk(x){return (x.textContent||'')+(x.children||[]).map(walk).join('');}
function hrefs(x){return (x.tag==='a'?[x.href]:[]).concat(...(x.children||[]).map(hrefs));}
function fixture(fetcher) {
  const document={
    createElement:tag=>el(tag),
    createDocumentFragment:()=>el('fragment')
  };
  const window={
    currentLang:'zh',
    MajorVehicleFleetPresets:{
      lookup(line,operator){
        assert.equal(line,'JRTozai');assert.equal(operator,'JR-West');
        return {evidenceRole:'route-fleet-reference',
          vehicleCandidates:['JR西日本207系','JR西日本321系']};
      }
    }
  };
  const context={window,document,fetch:fetcher,console,Date,Promise};
  vm.runInNewContext(read('js/train-corridor-evidence.js'),context,{timeout:4000});
  return {window,document};
}
const raw=[
 {source_template_id:41568,calendar_urn:'odpt.Calendar:Weekday',
  source_train_number:'4622C',public_train_number:'4622C',
  traversal_direction:'JRTozai_to_Gakkentoshi',continued_as_train_number:null,
  kyobashi_departure_clock:'13:00',
  official_source_url:'https://timetable.jr-odekake.net/train-timetable/190231?date=20261029',
  timetable_completeness:'partial_source_only'},
 {source_template_id:41340,calendar_urn:'odpt.Calendar:Weekday',
  source_train_number:'5727C',public_train_number:'5727C',
  traversal_direction:'Gakkentoshi_to_JRTozai',continued_as_train_number:'4527C',
  kyobashi_departure_clock:'06:32',
  official_source_url:'https://timetable.jr-odekake.net/train-timetable/123341?date=20261027',
  timetable_completeness:'partial_source_only'}
];
test('a published-key SQL feed is scoped to sources, never to train positions or carsets',()=>{
  const js=read('js/train-corridor-evidence.js');
  const sql=read('supabase/migrations/20261109074500_jrwest_tozai_public_source_feed.sql');
  assert.match(js,/published_jrwest_tozai_2611_public_evidence/);
  assert.match(js,/if \(lineId !== "JRTozai"\)/);
  assert.match(js,/cache:"no-cache"/);
  assert.match(js,/vehicleCandidates/);
  assert.doesNotMatch(js,/window\.ODPT_TIMETABLES|window\.UNIFIED_LINES|setCachedPositions|vehicleIconPath\s*=/);
  assert.match(sql,/security_invoker = true/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/FOR SELECT TO anon, authenticated/);
  assert.match(sql,/vehicle_type IS NULL AND vehicle_png_path IS NULL/);
  assert.doesNotMatch(sql,/INSERT INTO\s+public\.train_timetable_|UPDATE\s+public\.train_timetable_/);
});
test('JR Tozai displays source evidence, official links, and multi-model uncertainty',async()=>{
  const calls=[];
  const {window}=fixture((url,options)=>{
    calls.push({url,options});
    return Promise.resolve({ok:true,json:()=>Promise.resolve(raw)});
  });
  const host=el('section');
  const ok=await window.TrainCorridorEvidence.show(host,'JRTozai');
  assert.equal(ok,true);
  assert.equal(host.hidden,false);
  const text=walk(host);
  for(const phrase of ['已核实的直通车次','207系','321系','4622C','5727C → 4527C',
    '不是全天时刻表','未确认']) assert.ok(text.includes(phrase),phrase);
  assert.equal(hrefs(host).length,2);
  assert.ok(calls[0].url.includes('/rest/v1/published_jrwest_tozai_2611_public_evidence'));
  assert.equal(calls[0].options.method,'GET');
  assert.ok(calls[0].options.headers.apikey.startsWith('sb_publishable_'));
  const again=await window.TrainCorridorEvidence.show(host,'JRTozai');
  assert.equal(again,true);
  assert.equal(calls.length,1,'cache prevents redundant network requests');
  await window.TrainCorridorEvidence.show(host,'Tozai');
  assert.equal(host.hidden,true);
  assert.equal(host.children.length,0);
});
test('invalid or malicious evidence is rejected and never rendered as HTML',async()=>{
  const poisoned={...raw[0],source_template_id:77,
    official_source_url:'javascript:alert(1)',public_train_number:'<script>'};
  const {window}=fixture(()=>Promise.resolve({ok:true,json:()=>Promise.resolve([raw[0],poisoned])}));
  const host=el('section');
  await window.TrainCorridorEvidence.show(host,'JRTozai');
  assert.equal(hrefs(host).length,1);
  assert.ok(!walk(host).includes('<script>'));
});
test('leaving the line cancels pending source render without creating a false zero-train result',async()=>{
  let done;
  const {window}=fixture(()=>new Promise(resolve=>{done=resolve;}));
  const host=el('section');
  const pending=window.TrainCorridorEvidence.show(host,'JRTozai');
  window.TrainCorridorEvidence.hide(host);
  done({ok:true,json:()=>Promise.resolve(raw)});
  assert.equal(await pending,false);
  assert.equal(host.hidden,true);
  assert.equal(host.children.length,0);
});
test('network failure reports source unavailability, not zero trains',async()=>{
  const {window}=fixture(()=>Promise.reject(Error('offline')));
  const host=el('section');
  assert.equal(await window.TrainCorridorEvidence.show(host,'JRTozai'),false);
  assert.ok(walk(host).includes('无法加载来源证据'));
  assert.ok(!walk(host).includes('0趟'));
});
test('controller keeps evidence lifecycle separate from train map painting',()=>{
  const pg=read('js/trains-page.js'),html=read('pages/trains.html'),manifest=read('scripts/page-scripts.json');
  assert.match(pg,/TrainCorridorEvidence\.show/);
  assert.match(pg,/TrainCorridorEvidence\.hide/);
  assert.match(html,/id="trainsCorridorEvidence"/);
  const m=JSON.parse(manifest);
  assert.ok(m.lazy.trains.includes('js/train-corridor-evidence.js'));
  assert.deepEqual(m.lazyScopes.trains['js/train-corridor-evidence.js'],['JRTozai']);
});