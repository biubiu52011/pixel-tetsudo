/* JR East 2611 米坂線 / internal Yonezawa.
 * 2026-11: RAIL only Yonezawa–Imaizumi (8 stations).
 * Imaizumi–Sakamachi runs replacement BUSES, never rail position markers.
 * Official numbers are 7142D–7159D: even inbound, odd outbound.
 * All numbered railway services have this exact 8-station itinerary.
 * Weekday Nov 9–13 maintenance cancels 7149D, 7151D,
 * 7150D and 7152D; replacement service is NOT provided for these.
 * Source: https://timetables.jreast.co.jp/2611/timetable-v/252d1.html
 *         https://timetables.jreast.co.jp/2611/timetable-v/252u1.html
 *         https://timetables.jreast.co.jp/2611/timetable-v/252d2.html
 *         https://timetables.jreast.co.jp/2611/timetable-v/252u2.html
 * Fleet: KiHa110 family only as an ILLUSTRATION, not observed consist,
 * image path is already in the existing canonical vehicle gallery.
 * SQL templates have no 2026 source revision: never certify all stop clocks
 * or actual day's rolling stock solely from this timetable number index.
 */
(function(root){"use strict";
var rails=Object.freeze(["Yonezawa","Minami-Yonezawa","Nishi-Yonezawa",
 "Narushima","Chugun","Uzen-Komatsu","Inukawa","Imaizumi"]);
var allStations=Object.freeze(rails.concat(["Hagyu","Uzen-Tsubaki","Tenoko",
 "Uzen-Numazawa","Isaryo","Uzen-Matsuoka","Oguni","Echigo-Kanamaru",
 "Echigo-Katakai","Echigo-Shimoseki","Echigo-Oshima","Sakamachi"]));
var outward=Object.freeze(["7143D","7145D","7147D","7149D","7151D",
 "7153D","7155D","7157D","7159D"]);
var inward=Object.freeze(["7142D","7144D","7146D","7148D","7150D",
 "7152D","7154D","7156D","7158D"]);
var maintenance=Object.freeze(["7149D","7150D","7151D","7152D"]);
var sources=Object.freeze({
 Weekday:Object.freeze({
  Outbound:"https://timetables.jreast.co.jp/2611/timetable-v/252d1.html",
  Inbound:"https://timetables.jreast.co.jp/2611/timetable-v/252u1.html"
 }),
 SaturdayHoliday:Object.freeze({
  Outbound:"https://timetables.jreast.co.jp/2611/timetable-v/252d2.html",
  Inbound:"https://timetables.jreast.co.jp/2611/timetable-v/252u2.html"
 })
});
var image="../images/列车/JR東日本/JR東日本_キハ110系.png";
function serviceCalendar(date){
 if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date))return "";
 var day=Number(date.slice(-2));
 var dow=new Date(date+"T12:00:00Z").getUTCDay();
 return dow===0||dow===6||day===3||day===23
  ?"SaturdayHoliday":"Weekday";
}
function isCancelled(number,date){
 return /^2026-11-(?:09|10|11|12|13)$/.test(date)&&
   maintenance.indexOf(number)>=0;
}
function station(s){return String(s||"").split(".").pop();}
function verify(p){
 if(!p||p.positionLineId!=="Yonezawa"||
    (p.displayLineId&&p.displayLineId!=="Yonezawa")||
    p.sourceRailway!=="odpt.Railway:JR-East.Yonezawa"||
    p.positionSource!=="supabase-train-run"||p.estimated!==true)return null;
 var date=String(p.serviceDate||"").slice(0,10);
 var calendar=String(p.calendarType||p.serviceId||
   p.timetableCalendar||"").split(/[.:]/).pop();
 if(calendar==="weekday")calendar="Weekday";
 if(calendar==="holiday")calendar="SaturdayHoliday";
 if(!serviceCalendar(date)||calendar!==serviceCalendar(date))return null;
 var op=String(p.trainOperator||p.operator||"")
   .replace(/^odpt.Operator:/,"");
 if(op&&op!=="JR-East")return null;
 if(String(p.trainType||"").split(/[.:]/).pop()!=="Local")return null;
 var number=String(p.trainNumber||"").trim().toUpperCase();
 var direction=String(p.railDirection||"").split(/[.:]/).pop();
 var approved=direction==="Outbound"?outward:
   direction==="Inbound"?inward:null;
 if(!approved||approved.indexOf(number)<0||isCancelled(number,date))return null;
 var stops=Array.isArray(p.scheduledStopKeys)
   ?p.scheduledStopKeys.map(station):[];
 if(stops.length!==rails.length)return null;
 for(var i=0;i<rails.length;i++){
  var expected=direction==="Outbound"?rails[i]:rails[rails.length-1-i];
  if(stops[i]!==expected)return null;
 }
 return {lineId:"Yonezawa",trainNumber:number,serviceDate:date,
  calendar:calendar,direction:direction,numberSourceUrl:sources[calendar][direction],
  firstStation:stops[0],lastStation:stops[stops.length-1],
  railOnly:true,replacementBus:false,referenceOnly:true,
  sourceClocksVerified:false,actualVehicleConfirmed:false};
}
function resolve(p){
 var proof=verify(p);
 if(!proof||p.vehicleResolvedFromRealtime===true||
    p.actualVehicleConfirmed===true||p.vehicleFormationId||
    p.realtimeVehicleType||p.realtimeDerivedVehicleType||
    (Array.isArray(p.vehicleFormationCandidates)&&
      p.vehicleFormationCandidates.length))return null;
 return {lineId:"Yonezawa",trainNumber:proof.trainNumber,
  illustrationModel:"キハ110系",illustrationPng:image,
  sourceUrl:proof.numberSourceUrl,model:null,formationId:null,
  planned:true,illustrative:true,referenceOnly:true,
  authorizesPNG:false,actualVehicleConfirmed:false,
  actualNovemberModelConfirmed:false};
}
root.JREastYonezawaNumberIndex202611=Object.freeze({
 railStations:rails,allStations:allStations,outbound:outward,
 inbound:inward,maintenance:maintenance,sourceUrls:sources,
 serviceCalendar:serviceCalendar,isCancelled:isCancelled,
 verify:verify,resolve:resolve,image:image
});
})(window);
