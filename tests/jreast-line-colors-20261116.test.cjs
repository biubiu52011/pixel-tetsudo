'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const all=Object.entries(data.lines).filter(([,l])=>l.operator==='JR-East');
const expected={"Kawagoe":"#808080","Uchibo":"#00b2e5","Sotobo":"#dc4532","Togane":"#f15f2b","Hakushin":"#f380b7","SensekiTohoku":"#80c900","Yahiko":"#922790","SotetsuJRDirect":"#00ac9a","TohokuShinkansen":"#008000","JoetsuShinkansen":"#ff978e","HokurikuShinkansen":"#6a3d98","YamagataShinkansen":"#f68b1e","AkitaShinkansen":"#e3007f","Joban":"#00b261","JobanLocal":"#808080","SaikyoKawagoe":"#00ac9a","Itsukaichi":"#f15a22","Hachiko":"#808080","SobuMain":"#fcc60d","Nikko":"#880033","Kururi":"#00b5ad"};
test('all 91 JR-East records have valid base colors and no conflicting presentation color',()=>{
 assert.equal(all.length,91);
 for(const [id,l] of all){
  assert.match(l.color,/^#[0-9a-f]{6}$/i,id);
  if(l.presentation?.color)assert.equal(l.color.toLowerCase(),l.presentation.color.toLowerCase(),id);
 }
});
test('JR East official line identification colors and shinkansen passenger direction colors',()=>{
 for(const [id,color] of Object.entries(expected)){
  assert.equal(data.lines[id]?.operator,'JR-East',id);
  assert.equal(data.lines[id]?.color.toLowerCase(),color,id);
 }
});
test('line codes and service families remain distinct',()=>{
 assert.equal(data.lines.Uchibo.code,'Uchibo');
 assert.equal(data.lines.Sotobo.code,'Sotobo');
 assert.equal(data.lines.Kawagoe.code,'');
 assert.equal(data.lines.Kawagoe.presentation.code,'');
 assert.equal(data.lines.SaikyoKawagoe.presentation.code,'JA');
 assert.equal(data.lines.Joban.presentation.displayRules.segmentColors.after.color,'#3333ff');
 assert.equal(data.lines.Miyo.color,data.lines.Yahiko.color);
});
