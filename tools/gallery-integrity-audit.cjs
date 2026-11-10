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
const crossOperatorGroups=duplicates.filter(g=>g.type==='cross-operator').length;
console.log(JSON.stringify({files:rows.length,png,quarantined:map.quarantined.length,duplicateGroups:duplicates.length,crossOperatorGroups,duplicates,errors},null,2));
if(errors.length||(process.argv.includes('--strict')&&crossOperatorGroups))process.exitCode=1;
