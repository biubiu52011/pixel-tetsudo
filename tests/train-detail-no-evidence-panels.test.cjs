'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const forbidden=/trainsOfficialRuninfo|trainsCorridorEvidence|updateOfficialRuninfoSource|updateCorridorEvidence|TrainCorridorEvidence|tp-corridor-evidence|tp-evidence-note|tp-evidence-details|東海道本線（JR東海）：時刻表データ未収録|播但線：時刻表データの検証待ち|加古川線：時刻表データの検証待ち|福知山線：公式運行情報未連携/;
function* walk(dir){
 for(const item of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
  const rel=path.posix.join(dir,item.name);
  if(item.isDirectory()){
   if(/^(js\/leaflet|js\/maplibre|css\/leaflet)$/.test(rel))continue;
   yield* walk(rel);
  } else if(/\.(?:js|html|css)$/.test(rel))yield rel;
 }
}
test('no retired info panels remain in any runtime JS/HTML/CSS',()=>{
 for(const dir of ['js','pages','css','data/api','data/core'])for(const file of walk(dir)){
  const match=read(file).match(forbidden);
  assert.equal(match,null,file+': retired info panel '+(match&&match[0]));
 }
 assert.equal(fs.existsSync(path.join(root,'js/train-corridor-evidence.js')),false);
});
test('train detail has navigation, title and map; SQL and DataState remain responsible',()=>{
 const html=read('pages/trains.html');
 const start=html.indexOf('<div id="trainsDetailView"');
 const end=html.indexOf('          </div>\n        </section>',start);
 assert.ok(start>0&&end>start);
 const detail=html.slice(start,end);
 for(const id of ['trainsBackBtn','trainsDetailTitle','trainsMapContainer'])assert.ok(detail.includes('id="'+id+'"'));
 assert.doesNotMatch(detail,/<section\b|<h3\b|<details\b|data-source-url|<a\b/i);
 const js=read('js/trains-page.js');
 assert.match(js,/ensureTimetable\(lineId\)/);
 assert.match(js,/_renderTrainMap\(mapEl, fusedLine, lineId\)/);
 assert.match(js,/DataState\.renderPageState/);
 const spec=JSON.parse(read('scripts/page-scripts.json'));
 assert.ok(!spec.lazy.trains.includes('js/train-corridor-evidence.js'));
 assert.ok(!spec.lazyScopes.trains['js/train-corridor-evidence.js']);
});
