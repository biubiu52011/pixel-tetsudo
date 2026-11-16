/* JR East Hachiko 705 (Komagawa–Takasaki, non-electrified section), 2026-11.
 * Public NUMBER roster only; every listed November regular D service is an
 * HB-E220 family candidate after KiHa110 regular-service retirement in March.
 * This is NOT an observed physical carset, and not an E231/209 EMU roster.
 * Exclude special 9xxxD December 1 maintenance numbers and replacement buses.
 * JR East official: /2611/timetable-v/705d1,d2,u1,u2.html
 * JR East fleet: https://www.jreast.co.jp/train/local/hb_e220.html
 */
(function(root){
 "use strict";
 const out=Object.freeze([
  "2281D","221D","2223D","2283D","225D","227D","229D","2261D",
  "231D","233D","2263D","2289D","235D","237D","239D","2291D",
  "2265D","241D","2293D","2267D","243D","245D","247D","2269D",
  "249D","2271D"
 ]);
 const inbound=Object.freeze([
  "2260D","220D","2262D","222D","224D","2282D","2264D","2284D",
  "226D","2286D","228D","2266D","2288D","230D","232D","234D",
  "2290D","2268D","236D","2270D","2292D","238D","240D","242D",
  "244D","246D","2294D","2248D"
 ]);
 const source="odpt.Railway:JR-East.Hachiko",line="Hachiko";
 function calendar(date){
  const d=String(date||"").slice(0,10);
  if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(d))return "";
  const w=new Date(d+"T12:00:00Z").getUTCDay();
  return w===0||w===6||d==="2026-11-03"||d==="2026-11-23"?"SaturdayHoliday":"Weekday";
 }
 function verify(p){
  if(!p||p.positionLineId!==line||p.sourceRailway!==source)return null;
  const d=String(p.serviceDate||"").slice(0,10),cal=calendar(d);
  let got=String(p.calendarType||p.serviceId||p.timetableCalendar||"").split(/[.:]/).pop();
  if(got==="holiday")got="SaturdayHoliday";
  if(got==="weekday")got="Weekday";
  if(!cal||got!==cal)return null;
  const dir=String(p.railDirection||"").split(/[.:]/).pop();
  const n=String(p.trainNumber||"").trim().toUpperCase();
  if(!((dir==="Outbound"?out:dir==="Inbound"?inbound:[]).includes(n)))return null;
  if(String(p.trainType||"").split(/[.:]/).pop()!=="Local")return null;
  const operator=String(p.trainOperator||p.operator||"").replace(/^odpt.Operator:/,"");
  if(operator&&operator!=="JR-East")return null;
  return Object.freeze({lineId:line,railSection:"Komagawa–Takasaki",
   trainNumber:n,calendar:cal,direction:dir,trainType:"Local",
   fleetFamily:"HB-E220系",edition:"2611",
   publicSourceUrl:"https://timetables.jreast.co.jp/2611/timetable-v/705"+
    (dir==="Inbound"?"u":"d")+(cal==="Weekday"?"1":"2")+".html",
   referenceOnly:true,authorizesRuntimePNG:false,
   actualVehicleConfirmed:false});
 }
 root.JREastHachikoNonElectrified2611=Object.freeze({
  edition:"2026-11",lineId:line,sourceRailway:source,
  outward:out,inward:inbound,calendar:calendar,verify:verify
 });
})(window);
