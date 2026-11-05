/* JR-East Ominato 2026-11 official public train-number admission.
 * https://timetables.jreast.co.jp/2611/timetable-v/278u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/278u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/278d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/278d2.html
 * https://www.jreast.co.jp/press/2025/morioka/20260220_mr01.pdf
 * No authorized JR KiHa100 image in gallery as of this audit;
 * a listed public number MUST NOT imply a KiHa110 PNG or confirmed set.
 */
(function(root){
  "use strict";
  var ordinaryInbound=Object.freeze(["222D","224D","234D","238D","240D","242D"]);
  var ordinaryOutbound=Object.freeze(["221D","223D","229D","235D","237D","239D","241D"]);
  var rapidInbound=Object.freeze(["3226D","3228D","3230D"]);
  var rapidOutbound=Object.freeze(["3225D","3233D"]);
  var allInbound=new Set(ordinaryInbound.concat(rapidInbound));
  var allOutbound=new Set(ordinaryOutbound.concat(rapidOutbound));
  var rapid=new Set(rapidInbound.concat(rapidOutbound));
  var cancelled=new Set(["223D","3225D","229D","3228D","3230D","234D"]);
  var maintenanceDates=Object.freeze(["2026-11-10","2026-11-11",
    "2026-11-12","2026-11-13"]);
  var maintenance=new Set(maintenanceDates);
  var railwayUrn="odpt.Railway:JR-East.Ominato";
  function verify(number,railway,direction,trainType,calendar,date){
    var day=String(date||"");
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    if(String(railway||"")!==railwayUrn)return false;
    var dir=String(direction||"").split(/[.:]/).pop();
    if(dir!=="Inbound"&&dir!=="Outbound")return false;
    var cal=String(calendar||"").split(/[.:]/).pop();
    var weekday=cal==="weekday"||cal==="Weekday";
    var holiday=["holiday","SaturdayHoliday","Saturday","Sunday","Holiday"].includes(cal);
    if(!weekday&&!holiday)return false;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var holidayDay=dow===0||dow===6||day==="2026-11-03"||day==="2026-11-23";
    if(holidayDay?!holiday:!weekday)return false;
    var n=String(number||"").trim().toUpperCase();
    if(!(dir==="Inbound"?allInbound:allOutbound).has(n))return false;
    if(maintenance.has(day)&&cancelled.has(n))return false;
    var isRapid=rapid.has(n);
    var type=String(trainType||"").split(/[.:]/).pop();
    if(!isRapid&&type!=="Local")return false;
    // Historic SQL wrongly labels 322x/323x "しもきた" Rapid as Local.
    if(isRapid&&type!=="Local"&&type!=="Rapid")return false;
    return Object.freeze({number:n,kind:isRapid?"rapid":"regular",
      trainType:isRapid?"Rapid":"Local",
      serviceName:isRapid?"しもきた":"",
      model:"キハ100系",referenceOnly:true,
      pngAvailable:false,actualVehicleConfirmed:false,
      edition:"2611"});
  }
  root.JREastOminatoNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:railwayUrn,
    ordinaryInbound:ordinaryInbound,ordinaryOutbound:ordinaryOutbound,
    rapidInbound:rapidInbound,rapidOutbound:rapidOutbound,
    maintenanceDates:maintenanceDates,cancelledNumbers:Object.freeze(Array.from(cancelled)),
    verify:verify
  });
})(window);
