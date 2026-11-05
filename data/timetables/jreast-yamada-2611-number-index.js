/* JR-East Yamada line, 2026-11 official SERVICE train numbers.
 * Sources: https://timetables.jreast.co.jp/2611/timetable-v/980u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/980u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/980d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/980d2.html
 * Autumn 2026 wheel-slip service: Kami-Yonai–Kawauchi CLOSED all day
 * until Dec 4; thus NO through Morioka–Miyako rail train.
 * Nov 5–6 rockfall: 08:00–19:00 Kami-Yonai–Miyako cancelled.
 * Nov 7–8 rockfall: Kami-Yonai–Miyako completely suspended.
 * https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=yamadaline
 * Original SQL includes BUS service numbers "1"–"24", must NEVER
 * promote those to train-number or vehicle-gallery evidence.
 */
(function(root){
  "use strict";
  var northInbound=Object.freeze([
    "2632D","2634D","2636D","2638D","9636D","9642D"
  ]);
  var northOutbound=Object.freeze([
    "9631D","2633D","2635D","9637D","9639D","2639D","2641D"
  ]);
  var southInbound=Object.freeze(["632D","644D","646D"]);
  var southOutbound=Object.freeze(["631D","9633D","641D"]);
  var northStops=new Set(["Morioka","Kami-Morioka","Yamagishi","Kami-Yonai"]);
  var southStops=new Set(["Kawauchi","Hakoishi","Rikuchu-Kawai",
    "Haratai","Moichi","Hikime","Kebaraichi","Sentoku","Miyako"]);
  var stopTerminals=Object.freeze({
    "2632D":["Kami-Yonai","Morioka"],"2634D":["Kami-Yonai","Morioka"],
    "2636D":["Kami-Yonai","Morioka"],"2638D":["Kami-Yonai","Morioka"],
    "9636D":["Kami-Yonai","Morioka"],"9642D":["Kami-Yonai","Morioka"],
    "9631D":["Morioka","Kami-Yonai"],"2633D":["Morioka","Kami-Yonai"],
    "2635D":["Morioka","Kami-Yonai"],"9637D":["Morioka","Kami-Yonai"],
    "9639D":["Morioka","Kami-Yonai"],"2639D":["Morioka","Kami-Yonai"],
    "2641D":["Morioka","Kami-Yonai"],
    "632D":["Miyako","Kawauchi"],"644D":["Miyako","Moichi"],
    "646D":["Miyako","Kawauchi"],
    "631D":["Kawauchi","Miyako"],"9633D":["Moichi","Miyako"],
    "641D":["Moichi","Miyako"]
  });
  var source="odpt.Railway:JR-East.Yamada";
  var north=new Set(northInbound.concat(northOutbound));
  var south=new Set(southInbound.concat(southOutbound));
  var inbound=new Set(northInbound.concat(southInbound));
  var outbound=new Set(northOutbound.concat(southOutbound));
  function station(raw){
    return String(raw&&(raw["odpt:departureStation"]||
      raw["odpt:arrivalStation"]||raw["odpt:station"]||raw.stationUrn)||"")
      .split(".").pop();
  }
  function minute(str){
    var m=/^(\d{1,2}):(\d{2})$/.exec(String(str||""));
    return m?Number(m[1])*60+Number(m[2]):null;
  }
  function verify(number,railway,direction,trainType,calendar,date,rawStops,numberOnly){
    var day=String(date||"");
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    var n=String(number||"").trim().toUpperCase();
    var isNorth=north.has(n),isSouth=south.has(n);
    if((!isNorth&&!isSouth)||String(railway||"")!==source)return false;
    var dir=String(direction||"").split(/[.:]/).pop();
    if((dir==="Inbound"?!inbound.has(n):
        dir==="Outbound"?!outbound.has(n):true))return false;
    if(String(trainType||"").split(/[.:]/).pop()!=="Local")return false;
    var cal=String(calendar||"").split(/[.:]/).pop();
    var weekday=cal==="Weekday"||cal==="weekday";
    var holiday=["SaturdayHoliday","Saturday","Sunday","Holiday","holiday"].includes(cal);
    if(!weekday&&!holiday)return false;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var national=day==="2026-11-03"||day==="2026-11-23";
    if((dow===0||dow===6||national)?!holiday:!weekday)return false;
    // JR printed 2633D / 2634D "休日運休": Saturday is permitted,
    // Sunday/national holidays are not. 2639D is weekday only.
    if((n==="2633D"||n==="2634D")&&(dow===0||national))return false;
    if(n==="2639D"&&(dow===0||dow===6||national))return false;
    // PNG layer must recheck month / weekday even after its source
    // run has been route-verified by the SQL estimator.
    if(numberOnly===true){
      if(isSouth&&(day==="2026-11-07"||day==="2026-11-08"))return false;
      return true;
    }
    // Reject old bus IDs and obsolete through runs before projection.
    // The current SQL has a separate segment with an actual 2611 number
    // for each operated service; no more than one controlled region.
    if(!Array.isArray(rawStops)||rawStops.length<2)return false;
    var keys=rawStops.map(station);
    var endpoints=stopTerminals[n],allowed=isNorth?northStops:southStops;
    if(!endpoints||keys[0]!==endpoints[0]||
       keys[keys.length-1]!==endpoints[1]||
       keys.some(function(k){return !allowed.has(k)}))return false;
    if(isSouth){
      // Official day-specific rockfall stoppages as published Nov 5.
      if(day==="2026-11-07"||day==="2026-11-08")return false;
      if(day==="2026-11-05"||day==="2026-11-06"){
        var first=rawStops[0],last=rawStops[rawStops.length-1];
        var begin=minute(first&&
          (first["odpt:departureTime"]||first["odpt:arrivalTime"]));
        var end=minute(last&&
          (last["odpt:arrivalTime"]||last["odpt:departureTime"]));
        // Conservative when a stale SQL plan lacks legible times.
        if(begin===null||end===null||end<=begin)return false;
        if(begin<19*60&&end>8*60)return false;
      }
    }
    return Object.freeze({number:n,kind:"regular",trainType:"Local",
      model:"キハ110系",area:isNorth?"Morioka–Kami-Yonai":
        "Kawauchi–Miyako",pngAvailable:true,
      referenceOnly:true,actualVehicleConfirmed:false,edition:"2611"});
  }
  root.JREastYamadaNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:source,verify:verify,
    verifyNumber:function(n,rail,direction,type,calendar,date){
      return verify(n,rail,direction,type,calendar,date,null,true);
    },
    northInbound:northInbound,northOutbound:northOutbound,
    southInbound:southInbound,southOutbound:southOutbound,
    endpoints:stopTerminals
  });
})(window);
