/* Tobu Kiryu 2026-11: historical SQL local PNG and official Ryomo series references.
 * SQL public.manual_timetable_templates: 164 rows in two calendars:
 * 50 numbered local + 32 limited express per calendar. All undated and
 * multi-model: neither 2026-11 operation nor actual formation is proven.
 * The example 10030-50 artwork must NOT imply a 10030 is the real car.
 * The exact 32 Ryomo number->200/500 series allocations come from Tobu's
 * official March 14 2026 revised timetable; NOT proof of the actual formation.
 * https://www.tobu.co.jp/pdf/timetable/time-table_02_kudari.pdf?202603=
 * https://www.tobu.co.jp/pdf/timetable/time-table_02_nobori.pdf?202603=
 * No train positions are generated here.
 * https://www.tobu.co.jp/railway/guide/line/kiryu_line.html
 * https://4gousya.net/line/8224.php
 */
(function(root) {
  "use strict";
  var MODEL="東武10030型50番台（桐生線代表）";
  var PNG="../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png";
  var CANDIDATES=Object.freeze(["東武10000型","東武10030型50番台","東武800・850型（3両・代走候補）"]);
  // Strict 32-number membership; never interpolate missing 180x numbers.
  // Same planned 200/500 assignments as the existing Isesaki official index.
  var EXPRESS_NUMBERS=Object.freeze({"1801":"500","1803":"200","1805":"200","1806":"200","1807":"200","1808":"500","1811":"200","1813":"500","1814":"500","1815":"500","1816":"200","1817":"200","1818":"500","1819":"200","1820":"200","1822":"200","1823":"200","1824":"200","1826":"200","1827":"500","1828":"500","1830":"500","1831":"500","1834":"200","1835":"200","1837":"200","1838":"200","1841":"200","1842":"200","1845":"500","1846":"500","1850":"500"});
  var EXPRESS=Object.freeze({
    200:{model:"東武200型",
      png:"../images/列车/東武鉄道/東武鉄道_200型_りょうもう_赤.png",
      candidates:["東武200型","東武250型"]},
    500:{model:"東武500系",
      png:"../images/列车/東武鉄道/東武鉄道_500系_リバティ.png",
      candidates:["東武500系"]}
  });
  function calendar(p) {
    var raw=String(p.calendarType||p.calendar_urn||p.calendarUrn||
      p.serviceId||p.timetableCalendar||"");
    if(raw==="weekday"||raw==="odpt.Calendar:Weekday")return "weekday";
    if(raw==="holiday"||raw==="saturdayholiday"||
       raw==="odpt.Calendar:SaturdayHoliday")return "holiday";
    return "";
  }
  function listedLocal(number) {
    if(!/^[0-9]{3}E$/.test(number))return false;
    var n=Number(number.slice(0,3));
    return n>=801&&n<=850;
  }
  function listed(number) {
    return listedLocal(number)||
      Object.prototype.hasOwnProperty.call(EXPRESS_NUMBERS,number);
  }
  function match(trainNumber,p) {
    p=p||{};
    var number=String(trainNumber||"").trim().toUpperCase();
    if(!listed(number))return null;
    var series=Object.prototype.hasOwnProperty.call(EXPRESS_NUMBERS,number)?
      Number(EXPRESS_NUMBERS[number]):0;
    var model=series?EXPRESS[series].model:MODEL;
    var png=series?EXPRESS[series].png:PNG;
    var candidates=series?EXPRESS[series].candidates:CANDIDATES;
    var line=String(p.positionLineId||p.lineId||"");
    var op=String(p.trainOperator||p.operator||"");
    var date=String(p.serviceDate||"").slice(0,10);
    var type=String(p.trainType||"").split(/[.:]/).pop();
    var direction=String(p.railDirection||p.direction||"").split(/[.:]/).pop();
    var expected=Number(number.match(/^\d+/)[0])%2===1?"Outbound":"Inbound";
    if(line!=="Kiryu"||String(p.displayLineId||line)!=="Kiryu"||
       p.sourceRailway!=="odpt.Railway:Tobu.Kiryu"||
       (op&&op!=="Tobu"&&op!=="odpt.Operator:Tobu")||
       p.positionSource!=="supabase-train-run"||p.estimated!==true||
       !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       !calendar(p)||type!==(series?"LimitedExpress":"Local")||
       (direction&&direction!==expected)||
       (p.trainNumber&&String(p.trainNumber).trim().toUpperCase()!==number)||
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
        (series?
          !(series===200?/(?:200|250)(?:系|型)/:/500(?:系|型)/).test(String(plan.models[0])):
          ["10000型 / 10030型50番台","10000系列","東武10000系列"].indexOf(String(plan.models[0]))<0))))
      return null;
    var garage=root.VehicleGaragePngMap;
    if(!garage||typeof garage.matchModelPath!=="function"||
       !garage.matchModelPath(model,png,"Kiryu"))return null;
    return Object.freeze({
      lineId:"Kiryu",trainNumber:number,model:model,pngPath:png,
      candidateModels:candidates.slice(),
      trainType:series?"LimitedExpress":"Local",expectedDirection:expected,
      serviceFamily:series?"ryomo-"+series:"kiryu-local",
      source:series?"tobu-kiryu-20260314-official-number-series-illustration":
        "tobu-kiryu-sql-historical-undated-local-illustration",
      sourceUrl:series?
        (expected==="Outbound"?
          "https://www.tobu.co.jp/pdf/timetable/time-table_02_kudari.pdf?202603=":
          "https://www.tobu.co.jp/pdf/timetable/time-table_02_nobori.pdf?202603="):
        "https://4gousya.net/line/8224.php",
      sourceCalendar:calendar(p),
      sourceEdition:series?"2026-03-14-official-ryomo":"historical-undated",
      edition:"2611",
      authorizesDatedService:false,authorizesPhysicalVehicle:false,
      actualVehicleConfirmed:false,planned:true,representative:true,
      referenceOnly:true,illustrative:true
    });
  }
  root.TobuKiryuPng=Object.freeze({
    version:"20261115-v2",match:match,hasPublishedNumber:listed,
    localNumbersPerCalendar:50,limitedExpressNumbersPerCalendar:32,
    numbersPerCalendar:82,sourceTemplates:164
  });
})(window);
