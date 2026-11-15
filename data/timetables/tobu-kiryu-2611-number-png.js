/* Tobu Kiryu 2026-11: historical undated 801E-850E LOCAL PNG illustration.
 * SQL public.manual_timetable_templates: 164 rows in two calendars:
 * 50 numbered local + 32 limited express per calendar. All undated and
 * multi-model: neither 2026-11 operation nor actual formation is proven.
 * The example 10030-50 artwork must NOT imply a 10030 is the real car.
 * Express 200 vs 500 is intentionally unresolved without dated proof.
 * No train positions are generated here.
 * https://www.tobu.co.jp/railway/guide/line/kiryu_line.html
 * https://4gousya.net/line/8224.php
 */
(function(root) {
  "use strict";
  var MODEL="東武10030型50番台（桐生線代表）";
  var PNG="../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png";
  var CANDIDATES=Object.freeze(["東武10000型","東武10030型50番台","東武800・850型（3両・代走候補）"]);
  function calendar(p) {
    var raw=String(p.calendarType||p.calendar_urn||p.calendarUrn||
      p.serviceId||p.timetableCalendar||"");
    if(raw==="weekday"||raw==="odpt.Calendar:Weekday")return "weekday";
    if(raw==="holiday"||raw==="saturdayholiday"||
       raw==="odpt.Calendar:SaturdayHoliday")return "holiday";
    return "";
  }
  function listed(number) {
    if(!/^[0-9]{3}E$/.test(number))return false;
    var n=Number(number.slice(0,3));
    return n>=801&&n<=850;
  }
  function match(trainNumber,p) {
    p=p||{};
    var number=String(trainNumber||"").trim().toUpperCase();
    if(!listed(number))return null;
    var line=String(p.positionLineId||p.lineId||"");
    var op=String(p.trainOperator||p.operator||"");
    var date=String(p.serviceDate||"").slice(0,10);
    var type=String(p.trainType||"").split(/[.:]/).pop();
    var direction=String(p.railDirection||p.direction||"").split(/[.:]/).pop();
    var expected=Number(number.slice(0,3))%2===1?"Outbound":"Inbound";
    if(line!=="Kiryu"||String(p.displayLineId||line)!=="Kiryu"||
       p.sourceRailway!=="odpt.Railway:Tobu.Kiryu"||
       (op&&op!=="Tobu"&&op!=="odpt.Operator:Tobu")||
       p.positionSource!=="supabase-train-run"||p.estimated!==true||
       !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       !calendar(p)||type!=="Local"||(direction&&direction!==expected)||
       p.vehicleIdentityStatus==="EXACT"||
       p.vehicleResolvedUpstream===true||p.vehicleResolvedFromRealtime===true||
       p.actualVehicleConfirmed===true||p.vehicleFormationId||
       p.vehicleFormationConflict||
       (Array.isArray(p.vehicleFormationCandidates)&&p.vehicleFormationCandidates.length)||
       p.realtimeVehicleType||p.realtimeDerivedVehicleType)
      return null;
    var plan=p.vehiclePlan;
    if(plan&&(plan.confirmed===true||
       (Array.isArray(plan.models)&&plan.models.length===1&&
        ["10000型 / 10030型50番台","10000系列","東武10000系列"].indexOf(String(plan.models[0]))<0)))
      return null;
    var garage=root.VehicleGaragePngMap;
    if(!garage||typeof garage.matchModelPath!=="function"||
       !garage.matchModelPath(MODEL,PNG,"Kiryu"))return null;
    return Object.freeze({
      lineId:"Kiryu",trainNumber:number,model:MODEL,pngPath:PNG,
      candidateModels:CANDIDATES.slice(),trainType:"Local",expectedDirection:expected,
      source:"tobu-kiryu-sql-historical-undated-local-illustration",
      sourceUrl:"https://4gousya.net/line/8224.php",
      sourceCalendar:calendar(p),sourceEdition:"historical-undated",edition:"2611",
      authorizesDatedService:false,authorizesPhysicalVehicle:false,
      actualVehicleConfirmed:false,planned:true,representative:true,
      referenceOnly:true,illustrative:true
    });
  }
  root.TobuKiryu2611Png=Object.freeze({
    version:"20261115-v1",match:match,hasPublishedNumber:listed,
    localNumbersPerCalendar:50,numbersPerCalendar:82,sourceTemplates:164,
    limitedExpressNumbersNotIdentified:32
  });
})(window);
