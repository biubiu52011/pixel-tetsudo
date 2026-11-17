'use strict';
// Production gallery byte-identity audit. Filenames alone never prove stock identity.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'images','列车');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'data/timetables/vehicle-garage-png-map.js'),'utf8'),ctx);
const map=ctx.window.VehicleGaragePngMap;if(!map||!map.isQuarantinedPng)throw Error('garage quarantine missing');
const errors=[],rows=[],hashes=new Map();
function scan(p){for(const x of fs.readdirSync(p,{withFileTypes:true})){const abs=path.join(p,x.name);
 if(x.isDirectory()){scan(abs);continue;}if(!x.isFile()||!/(?:\.png|\.jpe?g|\.webp)$/i.test(x.name))continue;
 const rel=path.relative(dir,abs).split(path.sep).join('/'),op=rel.split('/')[0];
 if(rel.split('/').length!==2)errors.push({type:'nested-path',path:rel});
 if(/\.png$/i.test(rel)&&!map.hasPng('../images/列车/'+rel))errors.push({type:'missing-map',path:rel});
 const hash=crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
 const item={path:rel,operator:op};rows.push(item);
 if(!hashes.has(hash))hashes.set(hash,[]);hashes.get(hash).push(item);
}}scan(dir);
const duplicates=[...hashes.values()].filter(g=>g.length>1).map(g=>({
 type:new Set(g.map(x=>x.operator)).size>1?'cross-operator':'same-operator',paths:g.map(x=>x.path)}));
for(const p of map.quarantined){const rel=String(p).replace('../images/列车/','');
 const refs=map.findPath(p);if(!fs.existsSync(path.join(dir,rel))||!refs.length||
 refs.some(r=>!r.quarantined||r.canonicalImage||map.matchModelPath(r.model,p,r.lineIds[0])))
 errors.push({type:'quarantine-not-enforced',path:rel});}
const png=rows.filter(r=>r.path.endsWith('.png')).length;
if(png!==map.totalPng)errors.push({type:'wrong-count',actual:png,expected:map.totalPng});

// Filename audit is additive: historical source paths stay stable until every
// consumer and the generated number indexes can be migrated together.
// Unknown naming exceptions fail strict CI; documented legacy names remain
// visible as review work, not automatically renamed or reclassified.
const knownNameExceptions={
 shortCode:new Set([
  'JR東日本/e211na1n.png',
  'JR東海/c11nsk.png','JR東海/c25-1.png','JR東海/c313ce.png',
  'JR東海/c35.png','JR東海/c385.png','JR東海/c75.png',
  'JR東海/c85h.png','函館市電/toq9002or.png'
 ]),
 missingSeriesSeparator:new Set([
  'JR東日本/JR東日本_E233系3000番台.png',
  'JR東日本/JR東日本_E233系5000番台.png',
  'JR東日本/JR東日本_キハE130系0番台.png',
  'JR東日本/JR東日本_キハE130系100番台.png',
  'JR東日本/JR東日本_キハE130系500番台.png'
 ]),
 vagueVariant:new Set([
  '東武鉄道/東武鉄道_200系（別）.png',
  '都営地下鉄/都営地下鉄_8500形（別）.png',
  '東急電鉄/東急電鉄_6020系_追加.png'
 ]),
 nonstandardSpelling:new Set([
  'JR東日本/JR東日本_209系_500番台_武藏野線.png',
  'JR東日本/JR東日本_E231系_900番台_武藏野線.png'
 ]),
 nonPng:new Set(['函館市電/函館市電_9600形_9601号車_参考.jpeg'])
};
const filenameAudit={
 shortCode:[],missingSeriesSeparator:[],vagueVariant:[],
 nonstandardSpelling:[],nonPng:[],normalizedCollisions:[],
 identicalBytes:[],unreviewedExceptions:[]
};
function nameFlag(type,rel){
 filenameAudit[type].push(rel);
 if(!knownNameExceptions[type].has(rel)){
  filenameAudit.unreviewedExceptions.push(rel);
  errors.push({type:'unreviewed-filename-'+type,path:rel});
 }
}
const normalizedNames=new Map();
for(const row of rows){
 const rel=row.path,base=rel.slice(row.operator.length+1);
 if(!base.startsWith(row.operator+'_')&&base.endsWith('.png'))
  nameFlag('shortCode',rel);
 if(/(?:系|型|形)\d+番台/.test(base))
  nameFlag('missingSeriesSeparator',rel);
 if(/（別）|_追加/.test(base))
  nameFlag('vagueVariant',rel);
 if(base.includes('武藏野線'))
  nameFlag('nonstandardSpelling',rel);
 if(!base.endsWith('.png'))nameFlag('nonPng',rel);
 if(base.endsWith('.png')){
  const key=row.operator+'/'+base.replace(/(系|型|形)_(?=\d+番台)/g,'$1');
  if(!normalizedNames.has(key))normalizedNames.set(key,[]);
  normalizedNames.get(key).push(rel);
 }
}
const allowedCollisions=new Set([
 'JR東日本/JR東日本_E233系3000番台.png',
 'JR東日本/JR東日本_E233系5000番台.png'
]);
for(const [key,group] of normalizedNames){
 if(group.length<2)continue;
 filenameAudit.normalizedCollisions.push(group);
 if(!allowedCollisions.has(key))
  errors.push({type:'new-normalized-filename-collision',paths:group});
 const canonical=new Set(group.filter(p=>map.findPath('../images/列车/'+p)
  .some(r=>r.canonicalImage&&!r.quarantined&&!r.alternateOnly)));
 if(canonical.size!==1)
  errors.push({type:'ambiguous-canonical-filename',paths:group,canonical:[...canonical]});
}
function modelFingerprint(rel){
 const name=rel.split('/').pop().replace(/\.(?:png|jpe?g)$/i,'')
  .replace(/（別）$/,'').replace(/_追加$/,'');
 const stem=name.slice(name.indexOf('_')+1);
 const match=stem.match(/^(.+?(?:系客車|系|型|形))(?:_(\d+番台))?/);
 return match?(match[1]+(match[2]?'_'+match[2]:'')):stem.split('_')[0];
}
for(const group of duplicates){
 filenameAudit.identicalBytes.push(group.paths);
 const models=new Set(group.paths.map(modelFingerprint));
 if(models.size>1 && !group.paths.every(p=>map.isQuarantinedPng('../images/列车/'+p)))
  errors.push({type:'unquarantined-different-model-identical-bytes',paths:group.paths});
 if(models.size===1){
  const active=new Set(group.paths.filter(p=>map.findPath('../images/列车/'+p)
   .some(r=>r.canonicalImage&&!r.quarantined&&!r.alternateOnly)));
  if(active.size>1)
   errors.push({type:'multiple-canonical-paths-identical-bytes',paths:group.paths});
 }
}
const crossOperatorGroups=duplicates.filter(g=>g.type==='cross-operator').length;
console.log(JSON.stringify({files:rows.length,png,quarantined:map.quarantined.length,duplicateGroups:duplicates.length,crossOperatorGroups,duplicates,filenameAudit,errors},null,2));
if(errors.length||(process.argv.includes('--strict')&&crossOperatorGroups))process.exitCode=1;
