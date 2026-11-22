/* Tobu Koizumi 2026-11 701E–762E and 764E PNG reference only.
 * SQL authority: public.manual_timetable_templates (Koizumi), 63 exact
 * numbers in EACH calendar, 126 historical source templates overall.
 * 763E is absent. The source has NO dated 2026-11 revision/operating-day proof.
 * Its vehicle_type_label is "10000系列": this proves a candidate family,
 * NOT 10000 vs 10030 subtype, formation ID, livery or actual service.
 * Example artwork is explicitly a 10030-50 front, not a train identification.
 * This rule never manufactures train positions. KoizumiBranch has NO
 * independently published full source timetable in the current SQL archive.
 * Evidence: public.published_tobu_koizumi_2611_png_bands (RLS private);
 * https://www.tobu.co.jp/corporation/rail/vehicles/
 */
(function(root){
  "use strict";
  var PNG="../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png";
  var MODEL="東武10030型50番台（小泉線代表）";
  var CANDIDATES=Object.freeze(["東武10000型","東武10030型","東武10030型50番台"]);
  function calendar(p){
    var raw=String(p.calendarType||p.calendar_urn||p.calendarUrn||
      p.serviceId||p.timetableCalendar||"");
    return raw==="weekday"||raw==="odpt.Calendar:Weekday" ? "weekday":
      raw==="holiday"||raw==="saturdayholiday"||
      raw==="odpt.Calendar:SaturdayHoliday" ? "holiday":"";
  }
  function listed(number){
    if(!/^[0-9]{3}E$/.test(number))return false;
    var n=Number(number.slice(0,3));
    return (n>=701 && n<=762)||n===764;
  }
  function match(trainNumber,p){
    p=p||{};
    var number=String(trainNumber||"").trim().toUpperCase();
    var line=String(p.positionLineId||p.lineId||"");
    var date=String(p.serviceDate||"").slice(0,10);
    var type=String(p.trainType||"").split(/[.:]/).pop();
    var op=String(p.trainOperator||p.operator||"");
    if(line!=="Koizumi"||String(p.displayLineId||line)!=="Koizumi"||
       p.sourceRailway!=="odpt.Railway:Tobu.Koizumi"||
       (op&&op!=="Tobu"&&op!=="odpt.Operator:Tobu")||
       p.positionSource!=="supabase-train-run"||p.estimated!==true||
       !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       !calendar(p)||type!=="Local"||!listed(number)||
       p.vehicleIdentityStatus==="EXACT"||
       p.vehicleResolvedUpstream===true||p.vehicleResolvedFromRealtime===true||
       p.actualVehicleConfirmed===true||p.vehicleFormationId||
       p.vehicleFormationConflict||
       (Array.isArray(p.vehicleFormationCandidates)&&p.vehicleFormationCandidates.length))
      return null;
    // Outbound 701E,703E...; inbound 702E,704E... per original
    // 126 historical source templates. Never infer direction if absent.
    var direction=String(p.railDirection||p.direction||"").split(/[.:]/).pop();
    if(direction && (Number(number.slice(0,3))%2===1 ?
        direction!=="Outbound":direction!=="Inbound"))return null;
    var plan=p.vehiclePlan;
    if(plan && Array.isArray(plan.models) && plan.models.length===1 &&
       ["10000系列","東武10000系列"].indexOf(String(plan.models[0]))<0)
      return null;
    if(p.realtimeVehicleType||p.realtimeDerivedVehicleType)return null;
    var gallery=root.VehicleGaragePngMap;
    if(!gallery||!gallery.matchModelPath(MODEL,PNG,"Koizumi"))return null;
    return Object.freeze({
      lineId:"Koizumi",trainNumber:number,model:MODEL,pngPath:PNG,
      candidateModels:CANDIDATES.slice(),source:"tobu-koizumi-sql-undated-10000-family-illustration",
      sourceUrl:"https://www.tobu.co.jp/corporation/rail/vehicles/",
      sourceCalendar:calendar(p),sourceEdition:"historical-undated",edition:"2611",
      actualVehicleConfirmed:false,planned:true,representative:true,
      referenceOnly:true,illustrative:true
    });
  }
  root.TobuKoizumiPng=Object.freeze({
    version:"20261115-v1",match:match,hasPublishedNumber:listed,
    numbersPerCalendar:63,sourceTemplates:126
  });
})(window);
