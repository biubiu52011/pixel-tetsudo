// Offline regression: node tests/runinfo-regression.js
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const ev=require("../js/runinfo-evaluator.js");
let n=0;
function check(name,fn){fn();n++;console.log("PASS",name);}
function parse(body,additional){return ev.evaluate(Object.assign({text:body,currentOperationalSource:true},additional||{}));}
[
 ["suspension then future resumption","現在、運転を見合わせています。明日の運転再開を見込んでいます。","suspended"],
 ["historical suspension then resumption","運転を見合わせていましたが、運転を再開しました。","info"],
 ["simultaneous partial cancellations","一部列車に遅れと運休がでています。","delayed"],
 ["reduced timetable","通常の２～３割程度で運転となります。","delayed"],
 ["scheduled engineering","12月1日から区間運休を実施します。","notice"],
 ["scheduled announcement","明日の運休を予定しています。","notice"],
 ["negative suspension and normal","運転見合わせはありません。通常どおり運転しています。","normal"],
 ["threshold is not normal","１５分以上の遅延はありません。","unknown"],
 ["publication policy is not incident","5分以上の遅れが発生した場合には運行情報をお知らせします。","unknown"],
 ["historical normal but current delay","平常どおり運転していましたが、現在は一部列車に遅れが出ています。","delayed"],
 ["through-service interruption","直通運転を中止しています。","notice"],
 ["independent current delay and suspension","立川～高尾駅間で運転を見合わせています。東京～立川駅間では遅れが出ています。","suspended"]
].forEach(([name,text,want])=>check(name,()=>assert.equal(parse(text).status,want)));
check("official structured suspension is not overridden by train cancellation",()=>{
  assert.equal(parse("一部列車に運休があります。",{structuredStatus:"Suspension"}).status,"suspended");
});
check("GTFS NO_SERVICE is scoped to trip or stop",()=>{
  for(const scope of ["trip","stop"])assert.equal(parse("一部運休",{alertScope:scope,structuredStatus:"Suspension"}).status,"delayed");
  assert.equal(parse("運転見合わせ",{alertScope:"line",structuredStatus:"Suspension"}).status,"suspended");
});
check("GTFS modified service is a notice",()=>assert.equal(parse("一部運転区間を変更します。",{gtfsEffectCode:6}).status,"notice"));
check("Keikyu's two directional impacts survive",()=>{
  const x=parse("品川駅〜横浜駅間の上り線の一部電車、横浜駅〜金沢文庫駅間の下り線の一部電車に遅れ。");
  assert.equal(x.impacts.length,2);assert.equal(x.impacts[0].direction,"up");assert.equal(x.impacts[1].direction,"down");
});
check("incident location is not an affected interval",()=>{
  const x=parse("川崎～鶴見駅間での異音の影響で、上下線の一部列車に遅れがでています。");
  assert.equal(x.incidentLocation,"川崎→鶴見");assert.equal(x.interval,null);
});
const code=fs.readFileSync(path.join(__dirname,"../js/data-fusion.js"),"utf8");
const w={RunInfoEvaluator:ev,ODPTClient:{LINE_TO_OPERATOR:{Ginza:"TokyoMetro",Chiyoda:"TokyoMetro"},LINE_RAILWAY_CODE:{}},addEventListener:()=>{}};
vm.runInNewContext(code,{window:w,document:{readyState:"loading",addEventListener:()=>{}},localStorage:{getItem:()=>null},navigator:{onLine:true},console,Date,Math,JSON,setInterval,clearInterval,setTimeout,clearTimeout});
const f=w.DataFusion,now=new Date().toISOString();
function rec(id,line,status,other){return Object.assign({"@id":id,"odpt:railway":line?"odpt.Railway:TokyoMetro."+line:"","odpt:operator":"odpt.Operator:TokyoMetro","odpt:trainInformationStatus":status,"dc:date":now},other||{});}
const rows=[rec("a","Ginza","Suspension"),rec("b","Ginza","Delay"),rec("c","Chiyoda","Suspension"),rec("d",null,"Suspension")];
check("do not borrow records of other railways",()=>assert.equal(f._selectScopedRecords(rows,{id:"Ginza",operator:"TokyoMetro"}).length,2));
check("keep concurrent active incidents",()=>{
  assert.equal(f._pickRecords(rows,{id:"Ginza",operator:"TokyoMetro"}).length,2);
  assert.equal(f._aggregateStatus(rows,{id:"Ginza",operator:"TokyoMetro"}),"suspended");
});
check("unscoped operator fallback is opt-in only",()=>{
  const yes=rec("good",null,"Delay",{"pt:operatorWide":true});
  const no=rec("bad",null,"Suspension",{"pt:operatorWide":true,"odpt:operator":"odpt.Operator:Toei"});
  assert.equal(f._selectScopedRecords([yes,no],{id:"Ginza",operator:"TokyoMetro"}).length,1);
});
check("DataFusion forwards GTFS trip scope",()=>{
  const x=f._evaluateRecord(rec("gtfs","Ginza","Suspension",{"pt:alertScope":"trip","pt:gtfsEffectCode":1}),{id:"Ginza",stations:[]});
  assert.equal(x.status,"delayed");
});
check("expired sources are not live incidents",()=>{
  assert.equal(f._pickRecords([rec("old","Ginza","Suspension",{"dct:valid":"2000-01-01T00:00:00Z"})],{id:"Ginza",operator:"TokyoMetro"}).length,0);
});
console.log("PASS",n,"offline runinfo regression checks");
