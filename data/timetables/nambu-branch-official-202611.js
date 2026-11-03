/* JR East 2026 November Nambu Branch (Shitte <-> HamaKawasaki).
 * Public TRAIN NUMBERS only; no invented trainsets, locations or timings.
 * 2026-11 source: official JR East monthly timetable for BOTH directions
 * and weekday / Saturday-Holiday.
 * https://timetables.jreast.co.jp/2611/timetable-v/702u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/702u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/702d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/702d2.html
 *
 * Distinct public train-number sets happen to be the same across calendars,
 * but the actual stop clocks may differ (notably the published 時変 rows).
 * This index authenticates a train number + direction + calendar for the
 * current monthly edition. Positions still come exclusively from individual
 * sourced stop clocks or exact fresh realtime observations.
 */
(function(root){
  "use strict";
  var inbound=Object.freeze("500H,600H,610H,620H,700H,702H,710H,712H,722H,800H,802H,810H,820H,900H,910H,920H,1000H,1100H,1110H,1200H,1300H,1310H,1400H,1500H,1510H,1600H,1700H,1710H,1720H,1800H,1810H,1820H,1900H,1910H,2000H,2100H,2110H,2200H,2210H".split(","));
  var outbound=Object.freeze("411H,501H,601H,611H,613H,701H,703H,711H,713H,721H,801H,803H,811H,813H,901H,911H,921H,1001H,1011H,1101H,1201H,1211H,1301H,1401H,1411H,1501H,1601H,1611H,1701H,1711H,1801H,1811H,1821H,1901H,1911H,2001H,2011H,2101H,2111H,2201H,2211H".split(","));
  function verify(number,railway,direction,trainType,calendar,serviceDate){
    var date=String(serviceDate||"").slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||
       date<"2026-11-01"||date>"2026-11-30")return null;
    if(railway!=="odpt.Railway:JR-East.NambuBranch"||
       trainType!=="odpt.TrainType:JR-East.Local"||
       (calendar!=="odpt.Calendar:Weekday"&&
        calendar!=="odpt.Calendar:SaturdayHoliday"))return false;
    var dir=String(direction||"").split(/[.:]/).pop();
    var entries=dir==="Inbound"?inbound:dir==="Outbound"?outbound:null;
    return !!(entries&&entries.indexOf(String(number||""))>=0);
  }
  root.NambuBranchOfficial202611=Object.freeze({
    version:"20261103-nambu-branch-2611-v1",
    railway:"odpt.Railway:JR-East.NambuBranch",
    inboundCount:inbound.length,
    outboundCount:outbound.length,
    verify:verify
  });
})(window);
