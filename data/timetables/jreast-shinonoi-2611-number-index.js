/* Shinonoi source-number fleet reference, edition 2026-11.
 * The imported manual timetable is NOT verified current stop-clock data.
 * 1001M–1026M Shinano: existing 52 official 383-series service-plan rows.
 * Local: 211/E127 mixed (and prospective E131 introduction); choose a
 * representative artwork only, never an actual-number vehicle claim.
 * https://timetables.jreast.co.jp/2611/timetable-v/116u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/116d1.html
 * https://www.jreast.co.jp/train/local/e127.html
 * https://www.jreast.co.jp/train/local/211.html
 */
(function(root){
 "use strict";
 var roster={"Inbound":{"LimitedExpress":["1002M","1004M","1006M","1008M","1010M","1012M","1014M","1016M","1018M","1020M","1022M","1024M","1026M"],"Local":["1230M","1232M","1234M","1236M","1238M","1240M","148M","1520M","1522M","1524M","1530M","1532M","1534M","1536M","1538M","1540M","1542M","1544M","1546M","1548M","1550M","1824M","1826M","1828M","1830M","1832M","1836M","1840M","1842M","1844M","2228M","2230M","2232M","2234M","2236M","2238M","2240M","2242M","3424M","3520M","422M","424M","426M","428M","430M","432M","434M","436M","438M","440M","442M","444M","446M","448M","450M","822M","834M","838M"],"Rapid":["2530M","3526M"]},"Outbound":{"LimitedExpress":["1001M","1003M","1005M","1007M","1009M","1011M","1013M","1015M","1017M","1019M","1021M","1023M","1025M"],"Local":["1221M","1223M","1225M","1227M","1229M","1231M","1233M","1235M","1551M","1553M","1557M","1559M","155M","1561M","1563M","1565M","1567M","1571M","1573M","1577M","1821M","1825M","1827M","1831M","1833M","1835M","1837M","1839M","1841M","2237M","2239M","2241M","2243M","2245M","2247M","2249M","3425M","3523M","421M","423M","425M","427M","429M","431M","433M","435M","437M","439M","441M","443M","445M","447M","449M","823M","829M","843M"],"Rapid":["2535M","2537M"]}};
 var images={
  "211系（長野地区）":"../images/列车/JR東日本/JR東日本_211系_長野色.png",
  "E127系100番台":"../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png",
  "383系":"../images/列车/JR東海/JR東海_383系.png"
 };
 function resolve(p){
  if(!p || String(p.positionLineId||p.lineId||"")!=="Shinonoi" ||
     String(p.displayLineId||p.positionLineId||p.lineId||"")!=="Shinonoi" ||
     p.sourceRailway!=="odpt.Railway:JR-East.Shinonoi" ||
     ["supabase-train-run","realtime-api"].indexOf(p.positionSource)<0 ||
     (p.positionSource==="supabase-train-run"&&p.estimated!==true) ||
     (p.positionSource==="realtime-api"&&(p.estimated===true ||
       p.realtimePositionRecordPresent===false)) ||
     p.vehicleIdentityStatus==="EXACT"||p.actualVehicleConfirmed===true||
     p.vehicleResolvedFromRealtime===true||p.vehicleFormationId||
     p.realtimeVehicleType||p.realtimeDerivedVehicleType||
     (p.vehicleResolution&&p.vehicleResolution.identityStatus==="EXACT"))return null;
  var date=String(p.serviceDate||"").slice(0,10);
  if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date))return null;
  var cal=String(p.calendarType||p.serviceId||p.timetableCalendar||"");
  cal=/^(weekday|odpt.Calendar:Weekday)$/i.test(cal)?"Weekday":
      /^(holiday|odpt.Calendar:SaturdayHoliday)$/i.test(cal)?"SaturdayHoliday":"";
  if(!cal)return null;
  var dir=String(p.railDirection||"").split(/[.:]/).pop();
  if(dir!=="Inbound"&&dir!=="Outbound")return null;
  var type=String(p.trainType||"").split(/[.:]/).pop();
  if(["Local","Rapid","LimitedExpress"].indexOf(type)<0)return null;
  var number=String(p.trainNumber||"").trim().toUpperCase();
  if(roster[dir][type].indexOf(number)<0)return null;
  // Shinano is a JR-Central through train over JR-East tracks; the
  // source railway stays Shinonoi even when the stock owner differs.
  var op=String(p.trainOperator||p.operator||"").replace(/^odpt.Operator:/,"");
  if(op&&op!=="JR-East"&&!(type==="LimitedExpress"&&op==="JR-Central"))return null;
  var models=type==="LimitedExpress"?["383系"]:
    type==="Rapid"?["211系（長野地区）"]:
    ["211系（長野地区）","E127系100番台"];
  var illustration=models[0];
  var plan=p.vehiclePlan;
  if(plan&&plan.status==="PLANNED_MODEL"&&Array.isArray(plan.models)&&plan.models.length){
   var declared=plan.models.map(function(m){return String(m);});
   if(type==="LimitedExpress"&&declared.some(function(m){return m.indexOf("383")<0;}))return null;
   if(type==="Rapid"&&declared.some(function(m){return m.indexOf("211")<0;}))return null;
   if(type==="Local"){
    if(declared.some(function(m){return !/211|E127|E131/.test(m);}))return null;
    if(declared.length===1&&/E127/.test(declared[0]))illustration="E127系100番台";
    if(declared.length===1&&/E131/.test(declared[0]))return null;
   }
  }
  return {lineId:"Shinonoi",trainNumber:number,
    calendar:cal,direction:dir,trainType:type,
    scope:type==="LimitedExpress"?"official-shinano-383-plan":"historical-number-fleet-reference",
    plannedCandidates:models.slice(),illustrationModel:illustration,
    illustrationPng:images[illustration],
    sourceUrl:"https://timetables.jreast.co.jp/2611/timetable-v/116"+
      (dir==="Inbound"?"u":"d")+(cal==="Weekday"?"1":"2")+".html",
    referenceOnly:true,illustrative:true,authorizesPNG:false,
    planned:true,actualVehicleConfirmed:false,model:null,formationId:null};
 }
 root.JREastShinonoiNumberIndex202611=Object.freeze({resolve:resolve});
 var index=root.TrainNumberPngRanges;
 if(index&&typeof index.match==="function"){
  var previous=index.match;
  root.TrainNumberPngRanges=Object.freeze(Object.assign({},index,{
   match:function(number,line,p){
    if(line!=="Shinonoi")return previous(number,line,p);
    var record=resolve(Object.assign({},p||{},{
      positionLineId:"Shinonoi",trainNumber:number
    }));
    return record?{model:record.illustrationModel,pngPath:record.illustrationPng,
      lineId:"Shinonoi",number:record.trainNumber,
      source:"shinonoi-2611-planned-reference",
      referenceOnly:true,illustrative:true,planned:true,
      actualVehicleConfirmed:false}:null;
   }
  }));
 }
})(window);
