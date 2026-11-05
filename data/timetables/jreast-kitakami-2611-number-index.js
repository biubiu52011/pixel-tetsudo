/* JR East Kitakami 2026-11: scope exact SQL train-number/route pairs.
 * JR East 2611:
 * https://timetables.jreast.co.jp/2611/timetable-v/251u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/251u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/251d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/251d2.html
 * https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=kitakamiline
 * Aug 2 flood closure: Hotto-Yuda–Yokote rail suspended. No BUS is a train.
 * KiHa110 PNG is line-fleet reference, not confirmed physical carset.
 */
(function(root){
  "use strict";
  var routes=Object.freeze({
    "722D":Object.freeze({dir:"Inbound",from:"Hotto-Yuda",to:"Kitakami"}),
    "724D":Object.freeze({dir:"Inbound",from:"Fujine",to:"Kitakami"}),
    "736D":Object.freeze({dir:"Inbound",from:"Hotto-Yuda",to:"Kitakami"}),
    "725D":Object.freeze({dir:"Outbound",from:"Kitakami",to:"Fujine"}),
    "735D":Object.freeze({dir:"Outbound",from:"Kitakami",to:"Hotto-Yuda"})
  });
  var allowedStations=new Set(["Kitakami","Yanagihara","Ezuriko","Fujine",
    "Tatekawame","Yokokawame","Iwasawa","Waka-Sennin","Yuda-Kinshuko",
    "Hotto-Yuda"]);
  var sourceRailway="odpt.Railway:JR-East.Kitakami";
  function stationKey(raw){
    var item=raw&&(raw["odpt:departureStation"]||
      raw["odpt:arrivalStation"]||raw["odpt:station"]||raw.stationUrn||"");
    return String(item||"").split(".").pop();
  }
  function verify(number,railway,direction,trainType,calendar,date,rawStops,numberOnly){
    var day=String(date||"");
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    var n=String(number||"").trim().toUpperCase(),route=routes[n];
    if(!route||String(railway||"")!==sourceRailway)return false;
    var dir=String(direction||"").split(/[.:]/).pop();
    if(dir!==route.dir||String(trainType||"").split(/[.:]/).pop()!=="Local")
      return false;
    var cal=String(calendar||"").split(/[.:]/).pop();
    var wk=cal==="Weekday"||cal==="weekday";
    var hol=["SaturdayHoliday","Saturday","Sunday","Holiday","holiday"].includes(cal);
    if(!wk&&!hol)return false;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var national=day==="2026-11-03"||day==="2026-11-23";
    var isWeekend=dow===0||dow===6;
    if((isWeekend||national)?!hol:!wk)return false;
    // 725D's official "休日運休" refers to Sunday/national holidays,
    // NOT Saturday. A SaturdayHoliday SQL template is valid on Saturday.
    if(n==="725D"&&(dow===0||national))return false;
    if(numberOnly===true)return true;
    // SQL stop provenance is mandatory for live display: reject any
    // historical trip reaching the flood-damaged bus-replacement section
    // and never crop a through-service to turn it into a fictitious train.
    if(!Array.isArray(rawStops)||rawStops.length<2)return false;
    var st=rawStops.map(stationKey);
    if(st[0]!==route.from||st[st.length-1]!==route.to||
       st.some(function(k){return !allowedStations.has(k)}))return false;
    return Object.freeze({number:n,kind:"regular",trainType:"Local",
      model:"キハ110系",edition:"2611",referenceOnly:true,
      actualVehicleConfirmed:false,railSegment:route.from+"–"+route.to});
  }
  // November 2611 complete timetable is kept in SQL. This checker
  // validates the PROOF issued by train-runs after its exact SQL number,
  // date, operator, route, damaged-section and PNG-range checks.
  // Never authorize a new number based on JS numeric parity/range alone.
  var ordered=["Kitakami","Yanagihara","Ezuriko","Fujine",
    "Tatekawame","Yokokawame","Iwasawa","Waka-Sennin",
    "Yuda-Kinshuko","Hotto-Yuda"];
  function verifySqlProof(context){
    var p=context||{},proof=p.sqlPublishedNumberFleetReference;
    if(!proof||proof.source!=="sql-jreast-2611-number-roster"||
      proof.lineId!=="Kitakami"||proof.segmentKey!=="rail_to_hotto_yuda"||
      proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
      proof.closedRailSection!=="Hotto-Yuda–Yokote")return null;
    if(String(p.positionLineId||p.lineId||"")!=="Kitakami"||
       p.sourceRailway!=="odpt.Railway:JR-East.Kitakami")return null;
    var operator=String(p.trainOperator||p.operator||"");
    if(operator&&operator!=="JR-East"&&operator!=="odpt.Operator:JR-East")return null;
    var n=String(p.trainNumber||"").trim().toUpperCase();
    var day=String(p.serviceDate||"").slice(0,10);
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day)||
       proof.trainNumber!==n||proof.serviceDate!==day)return null;
    var dir=String(p.railDirection||"").split(/[.:]/).pop();
    if(dir!==String(proof.direction||"").split(/[.:]/).pop())return null;
    var type=String(p.trainType||"").split(/[.:]/).pop(),
      pubType=String(proof.trainType||"").split(/[.:]/).pop();
    if(type!==pubType||(type!=="Local"&&type!=="Rapid"))return null;
    if(proof.model!=="キハ110系"||
       proof.pngReference!=="../images/列车/JR東日本/JR東日本_キハ110系.png"||
       !/^https:\/\/timetables\.jreast\.co\.jp\/(?:2611|2610)\//.test(
        String(proof.officialSourceUrl||"")))return null;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var national=day==="2026-11-03"||day==="2026-11-23";
    var hol=dow===0||dow===6||national;
    var cal=String(p.calendarType||p.serviceId||"").split(/[.:]/).pop();
    var isHoliday=["holiday","SaturdayHoliday","Saturday","Sunday","Holiday"].includes(cal);
    var isWeekday=["weekday","Weekday"].includes(cal);
    if(hol?!isHoliday:!isWeekday)return null;
    if(proof.calendar!=="odpt.Calendar:"+(hol?"SaturdayHoliday":"Weekday"))
      return null;
    if(n==="725D"&&(dow===0||national))return null;
    var keys=Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[];
    var st=keys.map(function(x){return String(x||"").split(".").pop();});
    if(st.length<2||st.some(function(x){return ordered.indexOf(x)<0;}))
      return null;
    if(st[0]!==proof.railwayFrom||
       st[st.length-1]!==proof.railwayTo)return null;
    for(var i=1;i<st.length;i++){
      var prev=ordered.indexOf(st[i-1]),now=ordered.indexOf(st[i]);
      if(dir==="Outbound"&&now<=prev || dir==="Inbound"&&now>=prev)
        return null;
    }
    return Object.freeze({number:n,kind:pubType==="Rapid"?"rapid":"regular",
      trainType:pubType,model:proof.model,pngPath:proof.pngReference,
      edition:"2611",referenceOnly:true,actualVehicleConfirmed:false,
      railSegment:proof.railwayFrom+"–"+proof.railwayTo,
      stopClockStatus:proof.stopClockStatus||"number_only"});
  }
  root.JREastKitakamiNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:sourceRailway,
    routes:routes,
    verifySqlProof:verifySqlProof,
    inbound:Object.freeze(["722D","724D","736D"]),
    outbound:Object.freeze(["725D","735D"]),
    verify:verify,
    verifyNumber:function(n,rail,direction,type,calendar,date){
      return verify(n,rail,direction,type,calendar,date,null,true);
    }
  });
})(window);
