/* JR East 2611 相鉄線直通（JR接続区間） official train-number columns.
 * The published M numbers are service identities, not physical car numbers.
 * This index validates the four calendar/direction columns only; it never
 * assigns E233-7000 or Sotetsu 12000 to an individual operating formation.
 *
 * Sources:
 * https://timetables.jreast.co.jp/2611/timetable-v/628d1p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/628d2p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/628u1p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/628u2p.html
 */
(function(root){
  "use strict";
  function everyOther(start,end){
    var out=[];
    for(var n=start;n<=end;n+=2)out.push(String(n)+"M");
    return Object.freeze(out);
  }
  var columns=Object.freeze({
    weekday:Object.freeze({
      Northbound:Object.freeze(everyOther(120,150).concat(everyOther(220,278))),
      Southbound:Object.freeze(everyOther(121,145).concat(everyOther(221,285)))
    }),
    holiday:Object.freeze({
      Northbound:Object.freeze(everyOther(120,144).concat(everyOther(220,284))),
      Southbound:Object.freeze(everyOther(121,143).concat(everyOther(221,287)))
    })
  });
  var sources=Object.freeze({
    "weekday.Northbound":"https://timetables.jreast.co.jp/2611/timetable-v/628d1p.html",
    "weekday.Southbound":"https://timetables.jreast.co.jp/2611/timetable-v/628u1p.html",
    "holiday.Northbound":"https://timetables.jreast.co.jp/2611/timetable-v/628d2p.html",
    "holiday.Southbound":"https://timetables.jreast.co.jp/2611/timetable-v/628u2p.html"
  });
  var lookup=Object.create(null);
  ["weekday","holiday"].forEach(function(cal){
    lookup[cal]=Object.create(null);
    ["Northbound","Southbound"].forEach(function(dir){
      lookup[cal][dir]=new Set(columns[cal][dir]);
    });
  });
  function normalizeCalendar(value){
    var raw=String(value||"").trim();
    if(/(?:^|[.:])Weekday$|^weekday$/i.test(raw))return "weekday";
    if(/(?:^|[.:])(?:SaturdayHoliday|Saturday|Sunday|Holiday)$|^holiday$/i.test(raw))return "holiday";
    return "";
  }
  function normalizeDirection(value){
    var raw=String(value||"").split(/[.:]/).pop();
    return raw==="Northbound"||raw==="Southbound"?raw:"";
  }
  function numberBands(calendar,direction){
    var c=normalizeCalendar(calendar),d=normalizeDirection(direction);
    if(!lookup[c]||!lookup[c][d])return [];
    var values=columns[c][d].map(function(n){return Number(n.slice(0,-1));});
    var bands=[],start=values[0],previous=values[0];
    for(var i=1;i<values.length;i++){
      if(values[i]!==previous+2){
        bands.push(String(start)+"–"+String(previous)+"M");
        start=values[i];
      }
      previous=values[i];
    }
    if(values.length)bands.push(String(start)+"–"+String(previous)+"M");
    return bands;
  }
  function has(number,calendar,direction){
    var c=normalizeCalendar(calendar),d=normalizeDirection(direction);
    return !!(lookup[c]&&lookup[c][d]&&lookup[c][d].has(
      String(number||"").trim().toUpperCase()));
  }
  function match(p){
    if(!p||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(String(p.serviceDate||"")))return null;
    var line=String(p.positionLineId||p.lineId||"");
    if(line!=="SotetsuJRDirect"||(p.displayLineId&&p.displayLineId!=="SotetsuJRDirect"))return null;
    var source=String(p.sourceRailway||"");
    if(source&&source!=="odpt.Railway:JR-East.SotetsuDirect")return null;
    var operator=String(p.trainOperator||p.operator||"");
    if(operator&&operator!=="JR-East"&&operator!=="odpt.Operator:JR-East")return null;
    var calendar=normalizeCalendar(p.calendarType||p.serviceId||p.calendar),
      direction=normalizeDirection(p.railDirection||p.direction),
      number=String(p.trainNumber||"").trim().toUpperCase();
    if(!has(number,calendar,direction))return null;
    return Object.freeze({
      edition:"2611",lineId:"SotetsuJRDirect",trainNumber:number,
      calendarType:calendar,railDirection:direction,
      officialSourceUrl:sources[calendar+"."+direction],
      numberBands:Object.freeze(numberBands(calendar,direction)),
      publishedNumberOnly:true,operatingDateVerified:false,
      actualVehicleConfirmed:false,authorizesPNG:false
    });
  }
  root.JREastSotetsuJRDirectNumbers2611=Object.freeze({
    version:"20261110-official-four-way-number-v1",edition:"2611",
    lineId:"SotetsuJRDirect",columns:columns,sources:sources,
    numberBands:numberBands,has:has,match:match
  });
})(window);
