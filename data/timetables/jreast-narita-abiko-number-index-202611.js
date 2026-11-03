/* JR East 2026-11 Narita Abiko branch, exact published numbers.
 * 平日 / 土曜休日: 上り 成田→我孫子 820,822,...898M (40 runs),
 * 下り 我孫子→成田 821,823,...899M (40 runs).
 * Sources: 2611 JR East 215u1/u2/d1/d2 official line schedules:
 * https://timetables.jreast.co.jp/2611/timetable-v/215u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/215u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/215d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/215d2.html
 * Number matching validates scheduled source rows, not their times,
 * current operation or individual rolling stock formation.
 * 872M is listed in BOTH calendars; the onward Joban split has
 * a calendar-specific operation reference and must not be conflated.
 */
(function(root){
 "use strict";
 function verify(number,railway,direction,trainType,calendar,serviceDate){
   var date=String(serviceDate||"").slice(0,10);
   if(date<"2026-11-01"||date>"2026-11-30")return null;
   if(String(railway||"")!=="odpt.Railway:JR-East.NaritaAbikoBranch")return false;
   if(String(trainType||"").split(/[.:]/).pop()!=="Local")return false;
   var rawCalendar=String(calendar||"");
   if(!/(?:^|[.:])(?:Weekday|SaturdayHoliday|Saturday|Holiday|Sunday)$/.test(rawCalendar) &&
       rawCalendar!=="weekday" && rawCalendar!=="holiday")return false;
   var dir=String(direction||"").split(/[.:]/).pop();
   var m=String(number||"").trim().toUpperCase().match(/^(8[2-9][0-9])M$/);
   if(!m)return false;
   var n=Number(m[1]);
   return (dir==="Inbound" && n%2===0) || (dir==="Outbound" && n%2===1);
 }
 root.JREastNaritaAbikoNumberIndex202611=Object.freeze({
    version:"20261104-narita-abiko-2611-v1",
    publishedUniqueNumbers:80,storedCalendarTemplates:160,verify:verify
 });
})(window);
