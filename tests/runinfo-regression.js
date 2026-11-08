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
 ["all-day actual suspension","本日終日運転を見合わせます。","suspended"],
 ["suspension continuing until date","11月10日まで運転を見合わせます。","suspended"],
 ["all trains cancelled","全列車が運休しています。","suspended"],
 ["segment is cancelled","品川駅〜取手駅間は運休しています。","suspended"],
 ["partial cancellation notice wording","一部運休しています。","delayed"],
 ["resumption with ongoing cancellation","運転を見合わせていましたが、運転を再開し、現在一部列車に遅れと運休が発生しています。","delayed"],
 ["negative suspension and normal","運転見合わせはありません。通常どおり運転しています。","normal"],
 ["threshold clearance is official operating-normal","１５分以上の遅延はありません。","normal"],
 ["current Toei Asakusa wording","現在、１５分以上の遅延はありません。","normal"],
 ["threshold claim never suppresses concurrent disruption","現在、１５分以上の遅延はありません。上り線では運転を見合わせています。","suspended"],
 ["threshold claim never suppresses current train delays","１５分以上の遅延はありません。現在、一部列車に遅れが出ています。","delayed"],
 ["publication policy is not incident","5分以上の遅れが発生した場合には運行情報をお知らせします。","unknown"],
 ["historical normal but current delay","平常どおり運転していましたが、現在は一部列車に遅れが出ています。","delayed"],
 ["through-service interruption","直通運転を中止しています。","notice"],
 ["independent current delay and suspension","立川～高尾駅間で運転を見合わせています。東京～立川駅間では遅れが出ています。","suspended"]
].forEach(([name,text,want])=>check(name,()=>assert.equal(parse(text).status,want)));
check("threshold clearance preserves the official threshold instead of claiming zero delay",()=>{
  const x=parse("現在、１５分以上の遅延はありません。");
  assert.equal(x.status,"normal");
  assert.equal(x.delayUpperBoundMinutes,15);
  assert.equal(x.maxDelay,null);
  assert.equal(x.symbol,"○");
  assert.ok(x.evidence.some(v=>v.type==="OFFICIAL_DELAY_THRESHOLD_CLEAR"&&v.minutes===15));
});
check("operator reporting threshold works with other minute values",()=>{
  const x=parse("現在、５分以上の遅れはありません。");
  assert.equal(x.status,"normal");
  assert.equal(x.delayUpperBoundMinutes,5);
});
check("explicit suspension remains authoritative despite threshold clearance",()=>{
  const x=parse("１５分以上の遅延はありません。",{structuredStatus:"Suspension"});
  assert.equal(x.status,"suspended");
});
check("generic structured suspension yields to scoped partial cancellation",()=>{
  const r=parse("一部列車に運休があります。",{structuredStatus:"Suspension"});
  assert.equal(r.status,"delayed");
  assert.ok(r.evidence.some(x=>x.type==="PARTIAL_CANCELLATION_OVERRIDES_GENERIC_SUSPENSION"));
});
check("explicit independent suspension remains authoritative",()=>{
  assert.equal(parse("一部列車に運休があります。",{structuredStatus:"Suspension",suspension:true}).status,"suspended");
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
check("later revision of same official event replaces old suspension",()=>{
  const old=rec("same","Ginza","Suspension",{"dc:date":new Date(Date.now()-120000).toISOString()});
  const latest=rec("same","Ginza","Delay");
  assert.equal(f._pickRecords([old,latest],{id:"Ginza",operator:"TokyoMetro"}).length,1);
  assert.equal(f._aggregateStatus([old,latest],{id:"Ginza",operator:"TokyoMetro"}),"delayed");
});
check("DataFusion forwards GTFS trip scope",()=>{
  const x=f._evaluateRecord(rec("gtfs","Ginza","Suspension",{"pt:alertScope":"trip","pt:gtfsEffectCode":1}),{id:"Ginza",stations:[]});
  assert.equal(x.status,"delayed");
});
check("expired sources are not live incidents",()=>{
  assert.equal(f._pickRecords([rec("old","Ginza","Suspension",{"dct:valid":"2000-01-01T00:00:00Z"})],{id:"Ginza",operator:"TokyoMetro"}).length,0);
});
check("future resumption estimate from Japanese official text",()=>{
  const x=parse("内房線は運転を見合わせています。運転再開は２１時３０分頃を見込んでいます。");
  assert.equal(x.resume,"21:30頃");
});
check("maximum observed delay among multiple published numbers",()=>{
  const x=parse("京急線で遅れ。品川駅８分、京急蒲田駅１３分、京急川崎駅１０分程度の遅れ。");
  assert.equal(x.maxDelay,13);
});
check("Seibu ODPT loading terminates after a successful empty operator feed",()=>{
  const seibu={id:"Ikebukuro",name:"西武池袋線",operator:"Seibu",stations:["Ikebukuro","Nerima"]};
  w.ODPTClient.LINE_TO_OPERATOR.Ikebukuro="Seibu";
  w.ODPTClient.LINE_RAILWAY_CODE.Ikebukuro="Ikebukuro";
  w.ODPTClient.supports=(operator,type)=>operator==="Seibu"&&type==="trainInformation";
  w.DataLayer={getLine:id=>id==="Ikebukuro"?seibu:null,getAllLines:()=>({Ikebukuro:seibu})};
  const state=()=>f.fuseAll().lines.Ikebukuro.delayInfo;
  assert.equal(state().status,"loading","pending operator request stays loading");
  f.updateOdptData({Seibu:[]});
  const empty=state();
  assert.equal(empty.status,"no_data","successful empty response is settled");
  assert.equal(empty.source,"odpt_no_matching_line_record");
  assert.notEqual(empty.status,"normal","an empty feed cannot certify normal");
  f.updateOdptData({Seibu:[{
    "@id":"unrelated", "odpt:operator":"odpt.Operator:Seibu",
    "odpt:railway":"odpt.Railway:Seibu.Shinjuku",
    "odpt:trainInformationStatus":"odpt.TrainInformationStatus:Delay",
    "odpt:trainInformationText":"遅れが出ています。"
  }]});
  assert.equal(state().status,"no_data","other line's alert must not be inherited");
  f.updateOdptData({Seibu:null});
  assert.equal(state().status,"no_odpt","failed request must not look like a confirmed empty feed");
});
check("Seibu live operator-wide normal text is applied to both Seibu lines",()=>{
  const seibuText={"ja":"西武鉄道各線は平常通り運行しております。","en":"Seibu Line are operating on schedule."};
  const current={
    "@id":"urn:seibu:company-wide-status",
    "@type":"odpt:TrainInformation",
    "odpt:operator":"odpt.Operator:Seibu",
    "odpt:trainInformationText":seibuText,
    "dc:date":now,
    "dct:valid":new Date(Date.now()+300000).toISOString()
  };
  w.ODPTClient.LINE_TO_OPERATOR.SeibuShinjuku="Seibu";
  w.ODPTClient.LINE_RAILWAY_CODE.SeibuShinjuku="Shinjuku";
  const lines={
    Ikebukuro:{id:"Ikebukuro",name:"西武池袋線",operator:"Seibu",stations:["Ikebukuro","Nerima"]},
    SeibuShinjuku:{id:"SeibuShinjuku",name:"西武新宿線",operator:"Seibu",stations:["SeibuShinjuku","Takadanobaba"]}
  };
  w.DataLayer={getLine:id=>lines[id]||null,getAllLines:()=>lines};
  assert.equal(f._selectScopedRecords([current],lines.Ikebukuro).length,1);
  assert.equal(f._selectScopedRecords([current],lines.SeibuShinjuku).length,1);
  assert.equal(f._selectScopedRecords([current],{id:"Ginza",operator:"TokyoMetro"}).length,0);
  f.updateOdptData({Seibu:[current]});
  const fused=f.fuseAll();
  for(const id of Object.keys(lines)){
    assert.equal(fused.lines[id].delayInfo.status,"normal");
    assert.equal(fused.lines[id].delayInfo.source,"odpt");
    assert.match(fused.lines[id].delayInfo.detail,/西武鉄道各線/);
  }
  // A line-specific incident without railway scope must NOT spread to all Seibu lines.
  const ambiguous=Object.assign({},current,{"@id":"local-incident","odpt:trainInformationText":{"ja":"西武鉄道各線のうち池袋線で遅れが出ています。"}});
  assert.equal(f._selectScopedRecords([ambiguous],lines.SeibuShinjuku).length,0);
  // An expired all-lines normal announcement must not remain current.
  const expired=Object.assign({},current,{"dct:valid":"2000-01-01T00:00:00Z"});
  assert.equal(f._pickRecords([expired],lines.Ikebukuro).length,0);
});
console.log("PASS",n,"offline runinfo regression checks");
