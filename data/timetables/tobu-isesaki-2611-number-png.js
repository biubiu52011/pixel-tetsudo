/* Tobu Isesaki TI (Tobu-Dobutsu-Koen – Isesaki), 2026-11 illustration index.
 * Local 301E–419E: each listed number and 2-/3-car length are published by
 * Tobu for the 2026-03-14 timetable, weekday AND Saturday/holiday.
 * Limited express: numbered 200-series/500-series plan verified against
 * Tobu's March 2026 down/up express timetables.
 * 2 cars = 10000/10030 FAMILY CANDIDATES; 3 cars = 800/850 FAMILY CANDIDATES.
 * Exact physical vehicles, set IDs, and liveries are NEVER inferred.
 * Keep separate from TobuSkytree / Hibiya / Hanzomon / Kiryu / Sano.
 * Official sources:
 * https://www.tobu.co.jp/cms-pdf/news/20260210134344bOudukqdpHQTk7q2T0hikA.pdf
 * https://www.tobu.co.jp/pdf/timetable/time-table_02_kudari.pdf?202603=
 * https://www.tobu.co.jp/pdf/timetable/time-table_02_nobori.pdf?202603=
 */
(function(root) {
  "use strict";
  var localDown="301E:3 303E:3 305E:2 307E:3 309E:3 311E:3 313E:3 315E:2 317E:3 319E:2 321E:3 401E:3 323E:2 325E:3 403E:3 327E:2 329E:3 405E:2 331E:3 407E:2 333E:2 409E:3 335E:2 411E:3\n337E:3 413E:2 339E:3 341E:2 343E:3 345E:3 347E:3 349E:3 351E:2 353E:2 355E:3 357E:3 359E:3 415E:3 361E:2 363E:2 365E:2 367E:3 369E:3 371E:3 373E:3 375E:2 417E:3 419E:2";
  var localUp="402E:2 302E:3 304E:3 306E:3 308E:2 310E:3 404E:2 312E:2 314E:3 316E:3 318E:3 320E:3 322E:2 324E:3 326E:2 328E:3 406E:3 330E:2 332E:3 334E:2 408E:2 336E:3 410E:2 338E:3\n412E:2 340E:2 414E:3 342E:2 416E:2 418E:3 344E:3 346E:3 348E:2 350E:3 352E:3 354E:3 356E:3 358E:2 360E:2 362E:3 364E:3 366E:3 368E:2 370E:2 372E:2 374E:3 376E:3";
  var limitedDown="1801:500 1803:200 1805:200 1807:200 1409:500 1811:200 1813:500 1815:500 1817:200 1819:200 1421:200 1823:200 1425:500 1827:500 1429:500 1831:500 1433:200 1835:200 1837:200 1339:500 1841:200 1643:500 1845:500 1447:200 1549:500";
  var limitedUp="1502:500 1404:200 1806:200 1808:500 1310:200 1612:500 1814:500 1816:200 1818:500 1820:200 1822:200 1824:200 1826:200 1828:500 1830:500 1432:500 1834:200 1436:200 1838:200 1440:500 1842:200 1444:500 1846:500 1448:200 1850:500";
  function parsePairs(source) {
    var out=Object.create(null);
    source.trim().split(/\s+/).forEach(function(pair){
      var a=pair.split(":");
      if(out[a[0]]!==undefined)throw Error("Duplicate Isesaki number: "+a[0]);
      out[a[0]]=Number(a[1]);
    });
    return Object.freeze(out);
  }
  var local=Object.freeze(Object.assign(Object.create(null),
    parsePairs(localDown),parsePairs(localUp)));
  var limited=Object.freeze(Object.assign(Object.create(null),
    parsePairs(limitedDown),parsePairs(limitedUp)));
  var cars={
    2:{model:"東武10030系",
      png:"../images/列车/東武鉄道/東武鉄道_10030型_未更新車.png",
      candidates:["東武10000系","東武10030系"]},
    3:{model:"東武8000系",
      png:"../images/列车/東武鉄道/東武鉄道_8000型.png",
      candidates:["東武800型","東武850型"]}
  };
  var express={
    200:{model:"東武200型",
      png:"../images/列车/東武鉄道/東武鉄道_200型_りょうもう_赤.png",
      candidates:["東武200型","東武250型"]},
    500:{model:"東武500系",
      png:"../images/列车/東武鉄道/東武鉄道_500系_リバティ.png",
      candidates:["東武500系"]}
  };
  function calendar(p){
    var c=String(p.calendarType||p.calendar_urn||p.calendarUrn||"").toLowerCase();
    return c==="weekday"||c==="odpt.calendar:weekday"?"weekday":
      c==="holiday"||c==="saturdayholiday"||c==="odpt.calendar:saturdayholiday"?"holiday":"";
  }
  function match(number,p) {
    p=p||{};number=String(number||"").trim().toUpperCase();
    var line=String(p.positionLineId||p.lineId||"");
    var date=String(p.serviceDate||"").slice(0,10);
    var type=String(p.trainType||"").split(/[.:]/).pop();
    var op=String(p.trainOperator||p.operator||"");
    if(line!=="TobuIsesaki"||String(p.displayLineId||line)!=="TobuIsesaki"||
       p.sourceRailway!=="odpt.Railway:Tobu.Isesaki"||
       (op&&op!=="Tobu"&&op!=="odpt.Operator:Tobu")||
       !["supabase-train-run","realtime-api"].includes(p.positionSource)||
       (p.positionSource==="supabase-train-run"&&p.estimated!==true)||
       !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       !calendar(p)||!number||
       p.vehicleIdentityStatus==="EXACT"||
       p.vehicleResolvedUpstream===true||p.vehicleResolvedFromRealtime===true||
       p.actualVehicleConfirmed===true||p.vehicleFormationId||
       p.vehicleFormationConflict||
       (Array.isArray(p.vehicleFormationCandidates)&&p.vehicleFormationCandidates.length))
      return null;
    var family="",item=null,carCount=null,source="";
    if(Object.prototype.hasOwnProperty.call(local,number)&&type==="Local"){
      carCount=local[number];item=cars[carCount];
      family="tatebayashi-local-"+carCount+"car";
      source="https://www.tobu.co.jp/cms-pdf/news/20260210134344bOudukqdpHQTk7q2T0hikA.pdf";
    }else if(Object.prototype.hasOwnProperty.call(limited,number)&&type==="LimitedExpress"){
      item=express[limited[number]];family="ryomo-"+limited[number];
      source=(Number(number)%2===0)?"https://www.tobu.co.jp/pdf/timetable/time-table_02_nobori.pdf?202603=":"https://www.tobu.co.jp/pdf/timetable/time-table_02_kudari.pdf?202603=";
    }else return null;
    if(!item||!root.VehicleGaragePngMap||
       !root.VehicleGaragePngMap.matchModelPath(item.model,item.png,"TobuIsesaki"))
      return null;
    if(p.realtimeVehicleType&&p.realtimeVehicleType!==item.model)return null;
    if(p.realtimeDerivedVehicleType&&p.realtimeDerivedVehicleType!==item.model)return null;
    // A planned model from a stronger source beats a family illustration.
    if(p.vehiclePlan&&Array.isArray(p.vehiclePlan.models)&&
       p.vehiclePlan.models.length===1&&p.vehiclePlan.models[0]!==item.model)
      return null;
    return {lineId:"TobuIsesaki",trainNumber:number,serviceFamily:family,
      scheduledCars:carCount,candidateModels:item.candidates.slice(),
      model:item.model,pngPath:item.png,sourceUrl:source,
      source:"tobu-20260314-official-number-202611-reference",
      planned:true,representative:true,referenceOnly:true,illustrative:true,
      actualVehicleConfirmed:false};
  }
  root.TobuIsesaki2611Png=Object.freeze({
    version:"20261114-v1",match:match,localNumbers:Object.keys(local).length,
    limitedNumbers:Object.keys(limited).length
  });
})(window);
