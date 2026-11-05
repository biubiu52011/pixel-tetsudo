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
  function verify(number,railway,direction,trainType,calendar,date,rawStops){
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
  root.JREastKitakamiNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:sourceRailway,
    routes:routes,
    inbound:Object.freeze(["722D","724D","736D"]),
    outbound:Object.freeze(["725D","735D"]),
    verify:verify
  });
})(window);
