"use strict";
// Run: node scripts/test-koumi-i18n.cjs
// Source-owned translation check. The Komii ID remains internal/SQL-compatible.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const d=JSON.parse(read("data/core/railway_data.json"));
const t=JSON.parse(read("data/core/station_i18n.json"));
const l=d.lines.Komii;
const names=[
"小淵沢","甲斐小泉","甲斐大泉","清里","野辺山","信濃川上","佐久広瀬",
"佐久海ノ口","海尻","松原湖","小海","馬流","高岩","八千穂","海瀬",
"羽黒下","青沼","臼田","龍岡城","太田部","中込","滑津","北中込",
"岩村田","佐久平","中佐都","美里","三岡","乙女","東小諸","小諸"
];
assert.equal(l.nameJa,"小海線");
assert.equal(l.nameZh,"小海线");
assert.equal(l.nameEn,"Koumi Line");
assert.equal(l.presentation.nameEn,"Koumi Line");
assert.equal(l.nameKo,"고우미선");
assert.equal(l.presentation.nameKo,"고우미선");
assert.equal(l.stations.length,31);
assert.equal(new Set(l.stations).size,31);
l.stations.forEach((id,i)=>{
 assert.equal(t[id].ja,names[i],id+" wrong official Japanese name");
 assert.equal(d.lineStationOrder.Komii[id],i,id+" wrong station order");
 for(const lang of ["ja","zh","ko","en"])assert.ok(t[id][lang],id+" "+lang+" missing");
});
const expected={"Saku-Hirose":"佐久広瀬","Managashi":"馬流","Otabe":"太田部",
 "Namezu":"滑津","Nakasato":"中佐都","Misato-Koumi":"美里"};
for(const [id,ja] of Object.entries(expected))assert.equal(d.name_map[ja],id);
assert.ok(l.stations.includes("Misato-Koumi"));
assert.ok(!l.stations.includes("Misato"));
assert.equal(t.Misato.ja,"三郷");
assert.equal(t.Misato.zh,"三乡");
assert.ok(d.lines.Musashino.stations.includes("Misato"));
assert.equal(d.stations.Misato.lat,35.84484);
assert.equal(d.stations["Misato-Koumi"].lat,36.2923009);
assert.deepEqual(d.stationLines["Misato-Koumi"],["Komii"]);
assert.deepEqual(d.stationLines.Koumi,["Komii"]);
const alias='"Komii": { "Misato": "Misato-Koumi", "Komi": "Koumi" }';
for(const file of ["data/core/runtime-config.js","data/core/data-config-bundle.js"])
 assert.ok(read(file).includes(alias),file+" missing line-scoped alias");
for(const [original,compact,js,globalName] of [
 ["railway_data.json","railway_data.compact.json","railway-data.file.js","RAILWAY_DATA"],
 ["station_i18n.json","station_i18n.compact.json","station-i18n.file.js","RAILWAY_I18N"]]){
 const min=JSON.stringify(JSON.parse(read("data/core/"+original)));
 assert.equal(read("data/core/"+compact),min+"\n");
 assert.equal(read("data/core/"+js),"window."+globalName+" = "+
   min.replace(/<\/script/gi,"<\\/script")+";\n");
}
function sha(p){
 const data=fs.readFileSync(path.join(root,p));
 return crypto.createHash("sha1").update("blob "+data.length+"\0")
   .update(data).digest("hex").slice(0,12);
}
const loader=read("data/core/db-loader.js");
for(const file of ["railway_data.compact.json","station_i18n.compact.json",
 "railway-data.file.js","station-i18n.file.js"])
 assert.ok(loader.includes(file+"?v="+sha("data/core/"+file)),file+" has stale cache");
for(const f of fs.readdirSync(path.join(root,"pages")).filter(x=>x.endsWith(".html"))){
 const html=read("pages/"+f);
 for(const script of ["db-loader.js","data-config-bundle.js"]){
  if(!html.includes("../data/core/"+script+"?v="))continue;
  assert.ok(html.includes(script+"?v="+sha("data/core/"+script)),f+" cache stale: "+script);
 }
}
console.log("Koumi translations OK: 31 Japanese names, 4 languages, distinct Misato, synced artifacts and caches.");
