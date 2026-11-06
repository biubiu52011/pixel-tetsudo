/* 山形線, JR East 2611. Source-only/local M timetable number scope.
 * This is a separate 35-station Fukushima–Shinjo LINE, not OuMain
 * north of Shinjo and not the YamagataShinkansen E8 / Tsubasa route.
 * SQL 1xxM and 6xxx/8xxx/9xxxM "Local 701" are historical/incorrect
 * shinkansen aliases, NEVER admissible for Yamagata ordinary markers.
 * Timetable number context:
 * https://timetables.jreast.co.jp/2611/timetable-v/249d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/249u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/249d2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/249u2.html
 * Mixed stock: 701-5500 / 719-5000 / new E723-5000 (in revenue
 * service since 2026-09-19). SQL's 701 label is NOT a dated consist.
 * Concrete reference assignments below are from 2026-era public
 * operating observations, not official Nov-6 assignment certificates;
 * pictures are ILLUSTRATIONS only and no actual car/formation claim.
 */
(function(root){"use strict";
var stops=["Fukushima","Sasanogawa","Niwasaka","Itaya","Toge","Osawa-Yamagata","Sekine","Yonezawa","Okitama","Takahata","Akayu","Nakagawa","Uzen-Nakayama","Kaminoyama-Onsen","Mogami-Kinenkan-mae","Za-o","Yamagata","Kita-Yamagata","Uzen-Chitose","Minami-Dewa","Urushiyama","Takadama","Tendo-Minami","Tendo","Midaregawa","Jimba","Sakuranbo-Higashine","Higashine","Murayama","Sodesaki","Oishida","Kita-Oishida","Ashisawa","Funagata","Shinjo"];
var roster={"Weekday":{"1420M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1422M":["Inbound",[28,27,26,25,24,23,22,21,20,19,18,17,16]],"1424M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1426M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1428M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1430M":["Inbound",[28,27,26,25,24,23,22,21,20,19,18,17,16]],"1432M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1434M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1436M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1440M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1442M":["Inbound",[28,27,26,25,24,23,22,21,20,19,18,17,16]],"1444M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1446M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1448M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1450M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1452M":["Inbound",[23,22,21,20,19,18,17,16]],"1454M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"420M":["Inbound",[16,15,14,13,12,11,10,9,8,7,6,4,3,2,1,0]],"422M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"424M":["Inbound",[7,6,4,3,2,1,0]],"426M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"428M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"430M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"432M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"434M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"436M":["Inbound",[7,6,4,3,2,1,0]],"440M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"442M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"444M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"446M":["Inbound",[7,6,4,3,2,1,0]],"448M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"450M":["Inbound",[7,6,4,3,2,1,0]],"452M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"454M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"456M":["Inbound",[7,6,4,3,2,1,0]],"458M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"460M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"462M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"464M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"5422M":["Inbound",[2,1,0]],"5424M":["Inbound",[2,1,0]],"5426M":["Inbound",[2,1,0]],"5428M":["Inbound",[2,1,0]],"5430M":["Inbound",[2,1,0]],"1421M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1425M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1427M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28]],"1429M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1431M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1433M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1437M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1439M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28]],"1441M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1443M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1445M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1447M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1449M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1451M":["Outbound",[16,17,18,19,20,21,22,23]],"1453M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1455M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1457M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1459M":["Outbound",[16,17,18,19,20,21,22,23]],"421M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"423M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"425M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"427M":["Outbound",[0,1,2,3,4,6,7]],"429M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"431M":["Outbound",[0,1,2,3,4,6,7]],"433M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"435M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"437M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"439M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"441M":["Outbound",[0,1,2,3,4,6,7]],"443M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"445M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"447M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"449M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"451M":["Outbound",[0,1,2,3,4,6,7]],"453M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"455M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"457M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"459M":["Outbound",[0,1,2,3,4,6,7]],"461M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"463M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"465M":["Outbound",[0,1,2,3,4,6,7]],"467M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"5423M":["Outbound",[0,1,2]],"5425M":["Outbound",[0,1,2]],"5427M":["Outbound",[0,1,2]],"5429M":["Outbound",[0,1,2]],"5431M":["Outbound",[0,1,2]]},"SaturdayHoliday":{"1420M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1424M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1426M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1428M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1430M":["Inbound",[28,27,26,25,24,23,22,21,20,19,18,17,16]],"1432M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1434M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1436M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1438M":["Inbound",[28,27,26,25,24,23,22,21,20,19,18,17,16]],"1440M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1442M":["Inbound",[28,27,26,25,24,23,22,21,20,19,18,17,16]],"1444M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1446M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1448M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1450M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"1452M":["Inbound",[23,22,21,20,19,18,17,16]],"1454M":["Inbound",[34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16]],"420M":["Inbound",[16,15,14,13,12,11,10,9,8,7,6,4,3,2,1,0]],"422M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"424M":["Inbound",[7,6,4,3,2,1,0]],"426M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"428M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"430M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"432M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"434M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"436M":["Inbound",[7,6,4,3,2,1,0]],"440M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"442M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"444M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"446M":["Inbound",[7,6,4,3,2,1,0]],"448M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"450M":["Inbound",[7,6,4,3,2,1,0]],"452M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"454M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"456M":["Inbound",[7,6,4,3,2,1,0]],"458M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"460M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"462M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"464M":["Inbound",[16,15,14,13,12,11,10,9,8,7]],"5422M":["Inbound",[2,1,0]],"5424M":["Inbound",[2,1,0]],"5426M":["Inbound",[2,1,0]],"5428M":["Inbound",[2,1,0]],"5430M":["Inbound",[2,1,0]],"1421M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1425M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1427M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28]],"1429M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1431M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1433M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1435M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28]],"1437M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1439M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28]],"1441M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1443M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1445M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1447M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1449M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1451M":["Outbound",[16,17,18,19,20,21,22,23]],"1453M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1455M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1457M":["Outbound",[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]],"1459M":["Outbound",[16,17,18,19,20,21,22,23]],"421M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"423M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"425M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"427M":["Outbound",[0,1,2,3,4,6,7]],"429M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"431M":["Outbound",[0,1,2,3,4,6,7]],"433M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"435M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"437M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"439M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"441M":["Outbound",[0,1,2,3,4,6,7]],"443M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"445M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"447M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"449M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"451M":["Outbound",[0,1,2,3,4,6,7]],"453M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"455M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"457M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"459M":["Outbound",[0,1,2,3,4,6,7]],"461M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"463M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"465M":["Outbound",[0,1,2,3,4,6,7]],"467M":["Outbound",[7,8,9,10,11,12,13,14,15,16]],"5423M":["Outbound",[0,1,2]],"5425M":["Outbound",[0,1,2]],"5427M":["Outbound",[0,1,2]],"5429M":["Outbound",[0,1,2]],"5431M":["Outbound",[0,1,2]]}};
var candidates=Object.freeze(["701系5500番台","719系5000番台","E723系5000番台"]);
// 5429M -> 5430M: E723 B-1 photographed/reported on 2026-10-23
// (https://search.yahoo.co.jp/realtime/search?ei=UTF-8&p=e723%E7%B3%BB+b2&rkf=1).
// This is an operating reference ONLY, not an 11/06 formation assignment.
var observed={
 "E723系5000番台":Object.freeze(["420M","431M","436M","5425M","5426M","5429M","5430M","451M","455M"]),
 "701系5500番台":Object.freeze(["429M","422M","1425M","1437M","1443M","1445M","1447M","1449M","1455M","1457M","1420M","1424M","1432M","1444M","1446M","1448M","1450M","1454M"])
};
var image={
 "701系5500番台":"../images/列车/JR東日本/JR東日本_701系_5500番台.png",
 "E723系5000番台":"../images/列车/JR東日本/JR東日本_E723系_5000番台.png"
};
var source={
 "701系5500番台":"https://w.atwiki.jp/train-boundfor/pages/95.html",
 "E723系5000番台":"https://freedomtrain.jp/book25-25/57377/"
};
function serviceCalendar(date){
 if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date))return "";
 var dow=new Date(date+"T12:00:00Z").getUTCDay(),d=Number(date.slice(-2));
 return dow===0||dow===6||d===3||d===23?"SaturdayHoliday":"Weekday";
}
function station(s){return String(s||"").split(".").pop();}
function verify(p){
 if(!p||p.positionLineId!=="Yamagata"||
   (p.displayLineId&&p.displayLineId!=="Yamagata")||
   p.sourceRailway!=="odpt.Railway:JR-East.Yamagata"||
   p.positionSource!=="supabase-train-run"||p.estimated!==true)return null;
 var date=String(p.serviceDate||"").slice(0,10),
  cal=String(p.calendarType||p.serviceId||p.timetableCalendar||"").split(/[.:]/).pop();
 if(cal==="weekday")cal="Weekday";if(cal==="holiday")cal="SaturdayHoliday";
 if(!serviceCalendar(date)||cal!==serviceCalendar(date))return null;
 var op=String(p.trainOperator||p.operator||"").replace(/^odpt.Operator:/,"");
 if(op&&op!=="JR-East")return null;
 // Reject Shinkansen even when old SQL incorrectly labels it Local.
 var n=String(p.trainNumber||"").trim().toUpperCase();
 if(!/^(?:4[0-9]{2}|14[0-9]{2}|54[0-9]{2})M$/.test(n)||
    String(p.trainType||"").split(/[.:]/).pop()!=="Local")return null;
 var record=roster[cal]&&roster[cal][n];
 if(!record||record[0]!==String(p.railDirection||"").split(/[.:]/).pop())return null;
 var actual=Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys.map(station):[];
 if(actual.length!==record[1].length)return null;
 for(var i=0;i<actual.length;i++)if(actual[i]!==stops[record[1][i]])return null;
 return {trainNumber:n,serviceDate:date,calendar:cal,direction:record[0],
   origin:actual[0],terminus:actual[actual.length-1],stops:record[1].length,
   officialNumberScope:true,sourceClocksVerified:false,
   actualVehicleConfirmed:false};
}
// A verified timetable number can have several plausible fleets. Expose
// available gallery assets only as candidates; never assign one to the trip.
function resolveCandidates(p){
 var proof=verify(p);if(!proof)return null;
 if(p.vehicleResolvedFromRealtime===true||p.actualVehicleConfirmed===true||
    p.vehicleFormationId||p.realtimeVehicleType||p.realtimeDerivedVehicleType||
    (Array.isArray(p.vehicleFormationCandidates)&&p.vehicleFormationCandidates.length))
   return null;
 var known=resolve(p);
 if(known)return null; // single sourced illustration already has precedence
 var plan=p.vehiclePlan;
 if(plan&&plan.status==="PLANNED_MODEL"&&plan.confirmed===true&&
    plan.source==="database-verified-published-plan")return null;
 var assetModels=candidates.filter(function(model){return !!image[model];});
 return {lineId:"Yamagata",trainNumber:proof.trainNumber,
   models:candidates.slice(),assetModels:assetModels,
   candidateAssets:assetModels.map(function(model){return image[model];}),
   actualVehicleConfirmed:false,referenceOnly:true};
}
function resolve(p){
 var proof=verify(p);if(!proof)return null;
 // A verified physical ID has its own canonical artwork path; never
 // turn it into a different planned regional illustration.
 if(p.vehicleResolvedFromRealtime===true||p.actualVehicleConfirmed===true||
    p.vehicleFormationId||p.realtimeVehicleType||p.realtimeDerivedVehicleType||
    (Array.isArray(p.vehicleFormationCandidates)&&p.vehicleFormationCandidates.length))
   return null;
 var model="";
 for(var name in observed)if(observed[name].indexOf(proof.trainNumber)>=0){
   model=name;break;
 }
 if(!model)return null;
 var plan=p.vehiclePlan;
 // Contradictions from independently published, dated timetable models
 // must block even an illustrative operating reference. Historical SQL
 // candidate 701 labels are not a 2026 assignment certificate.
 if(plan&&plan.status==="PLANNED_MODEL"&&plan.confirmed===true&&
   plan.source==="database-verified-published-plan"&&
   Array.isArray(plan.models)&&plan.models.length&&
   plan.models.some(function(x){return String(x)!==model;}))return null;
 var at=Number(p.stationIndex),to=p.segmentToIndex==null?at:Number(p.segmentToIndex);
 if(!Number.isInteger(at)||!Number.isInteger(to)||at<0||to<0||
    at>=stops.length||to>=stops.length)return null;
 return {lineId:"Yamagata",trainNumber:proof.trainNumber,model:null,
  family:model,illustrationModel:model,illustrationPng:image[model],
  sourceUrl:source[model],referenceOnly:true,illustrative:true,
  authorizesPNG:false,actualVehicleConfirmed:false,formationId:null,
  planned:true,modelEvidence:"2026-operations-reference-not-november-consist",
  actualNovemberModelConfirmed:false};
}
root.JREastYamagataNumberIndex202611=Object.freeze({
 stops:stops,roster:roster,candidates:candidates,observed:observed,
 verify:verify,resolve:resolve,resolveCandidates:resolveCandidates,image:image
});
})(window);
