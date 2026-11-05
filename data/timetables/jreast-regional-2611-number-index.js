/* JR East November 2026 (2611): exact train-number admission for three
 * regional timetable-estimated lines. Train number is NOT operation number.
 * The model is a representative fleet, never observed physical formation.
 *
 * Kururi: 217u1/u2/d1/d2; Karasuyama: 242u1/u2/d1/d2;
 * Hachinohe: 277u1/u2/d1/d2.
 * https://timetables.jreast.co.jp/2611/timetable-v/217u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/242u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/277u1.html
 */
(function(root){
  "use strict";
  function freeze(arr){return Object.freeze(arr);}
  var kururiUp=freeze(["920D","922D","924D","926D","928D","930D","932D",
    "934D","936D","938D","940D","942D","2944D","944D","2946D",
    "946D","948D","950D","2952D","952D"]);
  var kururiDown=freeze(["921D","923D","925D","927D","929D","931D",
    "933D","935D","937D","939D","941D","2941D","943D","2943D",
    "945D","947D","949D","2949D","951D","953D"]);
  var karasuyamaUp=freeze(["322M","324M","326M","328M","330M","332M",
    "334M","336M","338M","340M","342M","344M","346M"]);
  var karasuyamaDown=freeze(["321M","323M","325M","327M","329M","331M",
    "333M","335M","337M","339M","341M","343M","345M","347M"]);
  var hachinoheUp=freeze(["1422D","424D","426D","1428D","1430D",
    "432D","1434D","436D","1438D","1440D","442D","1444D","446D",
    "1448D","1450D","1452D","454D","1456D","458D","1460D","462D"]);
  var hachinoheDown=freeze(["425D","1427D","429D","1431D","1433D",
    "435D","1437D","1439D","441D","1443D","445D","1447D","449D",
    "1451D","1453D","1455D","457D","1459D","461D","1463D"]);
  var lines=Object.freeze({
    Kururi:Object.freeze({up:kururiUp,down:kururiDown,
      model:"キハE130形100番台",suffix:"D"}),
    Karasuyama:Object.freeze({up:karasuyamaUp,down:karasuyamaDown,
      model:"EV-E301系",suffix:"M"}),
    Hachinohe:Object.freeze({up:hachinoheUp,down:hachinoheDown,
      model:"キハE130形500番台",suffix:"D"})
  });
  var karasuyamaWorkDays=freeze(["2026-11-05","2026-11-06",
    "2026-11-10","2026-11-12","2026-11-13"]);
  var karasuyamaCancelled=new Set(["330M","332M","334M",
    "329M","331M","333M"]);
  var hachinoheWorkDays=new Set(["2026-11-04","2026-11-05"]);
  // 435D and 436D still run only Hachinohe<->Same, while imported
  // whole-line SQL stops claim Same<->Kuji too. Suppress that WHOLE SQL
  // estimate on these dates until a source-backed shortened stop plan exists.
  // 1440D has a special clock on both dates; old SQL clocks are invalid.
  var hachinoheUnusableSQL=new Set(["435D","436D","441D","442D",
    "445D","446D","1440D"]);
  var hachinoheSpecial=new Set(["9445D","9446D"]);
  var novSundayMarkets=new Set(["2026-11-01","2026-11-08",
    "2026-11-15","2026-11-22","2026-11-29"]);
  function verify(lineId,number,railway,direction,trainType,calendar,date){
    var day=String(date||"");
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    var line=String(lineId||"");
    var definition=lines[line];
    if(!definition)return null;
    if(String(railway||"")!=="odpt.Railway:JR-East."+line)return false;
    var d=String(direction||"").split(/[.:]/).pop();
    if(d!=="Inbound"&&d!=="Outbound")return false;
    var cal=String(calendar||"").split(/[.:]/).pop();
    if(["Weekday","SaturdayHoliday","Saturday","Holiday","Sunday",
      "weekday","holiday"].indexOf(cal)<0)return false;
    var type=String(trainType||"").split(/[.:]/).pop();
    var n=String(number||"").trim().toUpperCase();
    if(!/^\d{3,4}[DM]$/.test(n)||!n.endsWith(definition.suffix))return false;
    var roster=d==="Inbound"?definition.up:definition.down;
    var special=false,trainClass="Local",serviceName="";
    if(line==="Hachinohe"){
      if(n==="8471D"&&d==="Outbound"){
        if(!novSundayMarkets.has(day))return false;
        special=true;trainClass="Rapid";
        serviceName="館鼻岸壁朝市号";
      }else if(hachinoheSpecial.has(n)){
        if(!hachinoheWorkDays.has(day) ||
           (n==="9445D"&&d!=="Outbound") ||
           (n==="9446D"&&d!=="Inbound"))return false;
        special=true;
      }else if(roster.indexOf(n)<0)return false;
      else if(hachinoheWorkDays.has(day)&&hachinoheUnusableSQL.has(n))
        return false;
    }else{
      if(roster.indexOf(n)<0)return false;
      if(line==="Karasuyama"&&
         karasuyamaCancelled.has(n)&&karasuyamaWorkDays.indexOf(day)>=0)
        return false;
    }
    if(type!==trainClass)return false;
    return Object.freeze({number:n,model:definition.model,
      trainType:trainClass,serviceName:serviceName,
      kind:special?"special":"regular",referenceOnly:true,
      edition:"2611",actualVehicleConfirmed:false});
  }
  root.JREastRegionalNumberIndex202611=Object.freeze({
    edition:"2026-11",lines:lines,verify:verify,
    karasuyamaWorkDays:karasuyamaWorkDays,
    hachinoheWorkDays:freeze(["2026-11-04","2026-11-05"]),
    hachinoheSundayMarketDays:freeze(Array.from(novSundayMarkets))
  });
})(window);
