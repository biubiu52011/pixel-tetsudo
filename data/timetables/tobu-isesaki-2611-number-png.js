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
  // Kuki–Tatebayashi corridor only. These exact train-number memberships
  // come from the stored ODPT-source timetable templates (2 calendars) and
  // the 2026-03-14 timetable listing. Unlike the 301E/200-family roster,
  // there is NO official per-train car count or physical set assignment.
  // https://tabinomemo.jp/train/timetable/tobu/11
  // Tobu 10000 / 10030 family is documented on this corridor, but one
  // artwork cannot identify the particular 6-/8-car combination:
  // https://www.tcu-todoroki.ed.jp/wp/wp-content/uploads/2023/11/135a79ccc12d94b7e3764472289ea404-2.pdf
  var corridorArtwork=Object.freeze({
    model:"東武10030系",
    png:"../images/列车/東武鉄道/東武鉄道_10030型_未更新車.png",
    candidates:["東武10000系","東武10030系"]
  });
  function corridorFamily(number,type,cal){
    if(!/^\d{3,4}$/.test(number))return "";
    var n=Number(number);
    // Both calendars: 501–574. Weekend-only: 575,576,578,580.
    if(type==="Local" &&
       ((n>=501&&n<=574) ||
        (cal==="holiday"&&(n===575||n===576||n===578||n===580))))
      return "local";
    // 2501–2522 + even 2524–2534; 2532/2534 weekday only.
    if(type==="SectionExpress" &&
       ((n>=2501&&n<=2522) ||
        (n>=2524&&n<=2534&&n%2===0 &&
         (cal==="weekday"||n<=2530))))
      return "section-express";
    // 3501–3513 + odd 3515–3525; 3510/3512/3525 weekday only.
    if(type==="SectionSemiExpress" &&
       ((n>=3501&&n<=3513 &&
         (cal==="weekday"||(n!==3510&&n!==3512))) ||
        (n>=3515&&n<=3525&&n%2===1 &&
         (cal==="weekday"||n!==3525))))
      return "section-semi-express";
    return "";
  }
  // Imported ODPT-source number roster, used only as a November 2026
  // working illustration (also on TobuSkytree, same number/calendar).
  // This is NOT proof of the original timetable edition's effective date.
  // S/K/T determine the SCHEDULED ownership, not a physical carset
  // or unique vehicle series (operational substitutions can occur).
  // https://t-take.com/tobu/tstd_20220312/TSTD_A-S_2022-03-12.pdf
  // TH-LINER uniquely uses Tobu 70090 (operator's vehicle page):
  // https://www.tobu.co.jp/corporation/rail/vehicles/
  var throughRoster=Object.freeze({
    weekday:Object.freeze({
      "Express":"E1055S E1111K E1160T E1168T E1212K E1219K E1276T E1358T E1373S E1378T E1406K E1454T E1464T E1502K E1517K E1574T E1622K E1680T E1693S E1765S E1766T E1768T E1807K E1833K E1878T E1935K E1960T E1962T E2002K E2052T E2122K E2177S E670T E941K E980T F1019K F1058T F1078T F1154T F1164T F1173S F1206K F1217K F1274T F1302K F1393S F1422K F1468T F1480T F1507K F1565S F1566T F1633K F1635K F1678T F1708K F1752T F1760T F1762T F1802K F1877S F1925K F1982T F2162T F529K F680T F811K F855S F860T F912K F968T F976T".split(" "),
      "SemiExpress":"E4003K E4008K E4091S E4225K E4729K F4691S F4703K F4741K F4822K".split(" "),
      "TH-LINER":"A4643T A4845T B4041T B4143T B4743T B4847T B4945T".split(" "),
    }),
    holiday:Object.freeze({
      "Express":"E1018K E1056T E1071S E1162T E1164T E1180T E1204K E1216K E1268T E1301K E1357S E1374T E1410K E1421K E1476T E1506K E1553S E1575S E1620K E1650T E1669S E1712K E1765S E1766T E1808K E1854T E1878T E1901K E1951S E1976T E2023K E2060T E2075S E2122K E912K F1001K F1004K F1057S F1110K F1174T F1176T F1221K F1253S F1275S F1306K F1350T F1420K F1466T F1469S F1508K F1512K F1565S F1601K F1654T F1676T F1678T F1751S F1760T F1775S F1823K F1966T F612K F771S F818K F862T F864T F916K F968T F980T".split(" "),
      "SemiExpress":"E4664T F4756T F4922K".split(" "),
      "TH-LINER":"A4845T A4947T B4045T B4645T B4743T B4841T B4947T".split(" "),
    }),
  });
  var throughArtwork=Object.freeze({
    T:{model:"東武50050系",png:"../images/列车/東武鉄道/東武鉄道_50050型.png",candidates:["東武50050系"]},
    S:{model:"東京メトロ18000系",png:"../images/列车/東京メトロ/東京メトロ_18000系.png",candidates:["東京メトロ8000系","東京メトロ08系","東京メトロ18000系"]},
    K:{model:"東急2020系",png:"../images/列车/東急電鉄/東急電鉄_2020系.png",candidates:["東急5000系","東急2020系"]},
    liner:{model:"東武70090型",png:"../images/列车/東武鉄道/東武鉄道_70090型.png",candidates:["東武70090型"]}
  });
  function throughFamily(number,type,cal){
    var groups=throughRoster[cal];
    if(!groups||!Object.prototype.hasOwnProperty.call(groups,type)||groups[type].indexOf(number)<0)return "";
    if(type==="TH-LINER")return "liner";
    return /^[EF]\d+[KST]$/.test(number) ? number.slice(-1) : "";
  }
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
    }else{
      var corridorKind=corridorFamily(number,type,calendar(p));
      var throughKind=throughFamily(number,type,calendar(p));
      if(!corridorKind&&!throughKind)return null;
      item=throughKind?throughArtwork[throughKind]:corridorArtwork;
      family=throughKind?(throughKind==="liner"?"th-liner-70090":
        "hanzomon-through-"+throughKind.toLowerCase()+"-owner") :
        "kuki-tatebayashi-"+corridorKind;
      source=throughKind?(throughKind==="liner"?
        "https://www.tobu.co.jp/corporation/rail/vehicles/":
        "https://t-take.com/tobu/tstd_20220312/TSTD_A-S_2022-03-12.pdf"):
        "https://tabinomemo.jp/train/timetable/tobu/11";
    }
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
      source:item===corridorArtwork?"tobu-202611-corridor-number-fleet-reference-only":
        item===throughArtwork.liner?"tobu-th-liner-70090-schedule-reference":
        (item===throughArtwork.K||item===throughArtwork.S||item===throughArtwork.T)?
          "tobu-202611-through-owner-model-illustration":
          "tobu-20260314-official-number-202611-reference",
      planned:true,representative:true,referenceOnly:true,illustrative:true,
      actualVehicleConfirmed:false};
  }
  root.TobuIsesaki2611Png=Object.freeze({
    version:"20261114-v3",match:match,localNumbers:Object.keys(local).length,
    limitedNumbers:Object.keys(limited).length,corridorNumbers:125,throughNumbers:157
  });
})(window);
