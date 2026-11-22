/* Tobu Sano (TI) 2026-11 number-scoped REPRESENTATIVE PNG.
 * Public.manual_timetable_templates contains 126 undated historical templates:
 * 63 numbers x Weekday/SaturdayHoliday. Trip clocks were spot-checked against
 * the 2026-11-14 public GTFS-derived table; no revision ID/operating-day
 * certificate exists for the whole archive. Do not create positions or assert
 * actual formation/livery from this number registry.
 * 601E–659E odd: Tatebayashi->Kuzu (30 locals); 602E–662E even:
 * Kuzu->Tatebayashi (31 locals); 1643/1612: named Liberty limited express.
 * Sources:
 * https://tabinomemo.jp/train/timetable/tobu/14
 * https://www.tobu.co.jp/pdf/timetable/time-table_02_kudari.pdf?202603=
 * https://www.tobu.co.jp/pdf/timetable/time-table_02_nobori.pdf?202603=
 */
(function(root){
  "use strict";
  var LOCAL_PNG="../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png";
  var LOCAL_MODEL="東武10030型50番台（佐野線代表）";
  var EXPRESS_PNG="../images/列车/東武鉄道/東武鉄道_500系_リバティ.png";
  var EXPRESS_MODEL="東武500系";
  var LOCAL_CANDIDATES=Object.freeze(["東武10000型","東武10030型","東武10030型50番台"]);
  function calendar(p){
    var raw=String(p.calendarType||p.calendar_urn||p.calendarUrn||
      p.serviceId||p.timetableCalendar||"");
    if(raw==="weekday"||raw==="odpt.Calendar:Weekday")return "weekday";
    if(raw==="holiday"||raw==="saturdayholiday"||
       raw==="odpt.Calendar:SaturdayHoliday")return "holiday";
    return "";
  }
  function numberInfo(raw){
    var number=String(raw||"").trim().toUpperCase();
    if(number==="1643")return {number:number,type:"LimitedExpress",direction:"Outbound",key:"express"};
    if(number==="1612")return {number:number,type:"LimitedExpress",direction:"Inbound",key:"express"};
    if(!/^[0-9]{3}E$/.test(number))return null;
    var n=Number(number.slice(0,3));
    if(n>=601 && n<=659 && n%2===1)
      return {number:number,type:"Local",direction:"Outbound",key:"local"};
    if(n>=602 && n<=662 && n%2===0)
      return {number:number,type:"Local",direction:"Inbound",key:"local"};
    return null;
  }
  function match(trainNumber,p){
    p=p||{};
    var spec=numberInfo(trainNumber);
    if(!spec)return null;
    var line=String(p.positionLineId||p.lineId||"");
    var type=String(p.trainType||"").split(/[.:]/).pop();
    var direction=String(p.railDirection||p.direction||"").split(/[.:]/).pop();
    var op=String(p.trainOperator||p.operator||"");
    var date=String(p.serviceDate||"").slice(0,10);
    if(line!=="Sano"||String(p.displayLineId||line)!=="Sano"||
      p.sourceRailway!=="odpt.Railway:Tobu.Sano"||
      (op&&op!=="Tobu"&&op!=="odpt.Operator:Tobu")||
      p.positionSource!=="supabase-train-run"||p.estimated!==true||
      !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
      !calendar(p)||type!==spec.type||
      (direction&&direction!==spec.direction)||
      p.vehicleIdentityStatus==="EXACT"||
      p.vehicleResolvedUpstream===true||p.vehicleResolvedFromRealtime===true||
      p.actualVehicleConfirmed===true||p.vehicleFormationId||
      p.vehicleFormationConflict||
      (Array.isArray(p.vehicleFormationCandidates)&&p.vehicleFormationCandidates.length)||
      p.realtimeVehicleType||p.realtimeDerivedVehicleType)
      return null;
    var plan=p.vehiclePlan;
    if(plan && (plan.confirmed===true ||
      (Array.isArray(plan.models)&&plan.models.length===1 &&
      (spec.key==="local"?
        ["10000系列","東武10000系列"].indexOf(String(plan.models[0]))<0:
        ["東武500系","500系"].indexOf(String(plan.models[0]))<0))))
      return null;
    var model=spec.key==="local"?LOCAL_MODEL:EXPRESS_MODEL;
    var png=spec.key==="local"?LOCAL_PNG:EXPRESS_PNG;
    var gallery=root.VehicleGaragePngMap;
    if(!gallery||typeof gallery.matchModelPath!=="function"||
       !gallery.matchModelPath(model,png,"Sano"))return null;
    return Object.freeze({
      lineId:"Sano",trainNumber:spec.number,model:model,pngPath:png,
      candidateModels:spec.key==="local"?LOCAL_CANDIDATES.slice():[EXPRESS_MODEL],
      trainType:spec.type,expectedDirection:spec.direction,
      source:"tobu-sano-sql-historical-undated-202611-reference",
      sourceUrl:spec.key==="local"?
        "https://tabinomemo.jp/train/timetable/tobu/14":
        "https://www.tobu.co.jp/pdf/timetable/time-table_02_kudari.pdf?202603=",
      sourceCalendar:calendar(p),sourceEdition:"historical-undated",edition:"2611",
      authorizesDatedService:false,authorizesPhysicalVehicle:false,
      actualVehicleConfirmed:false,planned:true,representative:true,
      referenceOnly:true,illustrative:true
    });
  }
  root.TobuSanoPng=Object.freeze({
    version:"20261115-v1",numbersPerCalendar:63,sourceTemplates:126,
    hasPublishedNumber:function(number){return !!numberInfo(number);},
    match:match
  });
})(window);
