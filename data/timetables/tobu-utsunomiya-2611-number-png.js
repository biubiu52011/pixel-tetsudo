/* Tobu Utsunomiya 2611: TWO explicit train-number bands -> 20400 PNG.
 * 401N,403N,...,485N = Shin-Tochigi -> Tobu-Utsunomiya (Outbound, 43).
 * 402N,404N,...,486N = Tobu-Utsunomiya -> Shin-Tochigi (Inbound, 43).
 * Number roster cross-check (ODPT-sourced third-party timetable):
 * https://tabinomemo.jp/train/timetable/tobu/18
 * Tobu official train timetable confirms 402N/410N/... published numbers:
 * https://www.tobu.co.jp/pdf/timetable/time-table_01_nobori.pdf
 * Tobu official 20400 fleet:
 * https://www.tobu.co.jp/corporation/rail/vehicles/
 *
 * Historic SQL 172 source templates (86 per calendar) are NOT verified as
 * a November 2026 stop-clock edition. This PNG mapping is a MODEL EXAMPLE,
 * never permission to plot a daily train, claim a physical carset, or infer
 * a through working beyond Shin-Tochigi.
 */
(function(root){
 "use strict";
 var MODEL="東武20400型";
 var PNG="../images/列车/東武鉄道/東武鉄道_20400型.png";
 function calendar(p){
  var v=String(p.calendarType||p.calendar_urn||p.calendarUrn||p.serviceId||p.timetableCalendar||"");
  if(v==="weekday"||v==="odpt.Calendar:Weekday")return "weekday";
  if(v==="holiday"||v==="saturdayholiday"||v==="odpt.Calendar:SaturdayHoliday")return "holiday";
  return "";
 }
 // Source NUMBER bands; not timetable dates and not formation numbers.
 // Keep these as one canonical inventory instead of treating the whole
 // interval as an untyped, directionless guess.
 var RANGES=Object.freeze([
  Object.freeze({id:"outbound-401N-485N",first:"401N",last:"485N",
   min:401,max:485,step:2,count:43,railDirection:"Outbound",
   origin:"Shin-Tochigi",destination:"Tobu-Utsunomiya",
   model:MODEL,pngPath:PNG}),
  Object.freeze({id:"inbound-402N-486N",first:"402N",last:"486N",
   min:402,max:486,step:2,count:43,railDirection:"Inbound",
   origin:"Tobu-Utsunomiya",destination:"Shin-Tochigi",
   model:MODEL,pngPath:PNG})
 ]);
 function rangeFor(value){
  var m=/^([1-9][0-9]{2})N$/.exec(String(value||"").trim().toUpperCase());
  if(!m)return null;
  var n=Number(m[1]);
  for(var i=0;i<RANGES.length;i++){
   var band=RANGES[i];
   if(n>=band.min&&n<=band.max&&(n-band.min)%band.step===0)return band;
  }
  return null;
 }
 function listed(value){return !!rangeFor(value);}
 function match(value,p){
  p=p||{};
  var number=String(value||"").trim().toUpperCase();
  var band=rangeFor(number);
  if(!band)return null;
  var line=String(p.positionLineId||p.lineId||"");
  var op=String(p.trainOperator||p.operator||"");
  var date=String(p.serviceDate||"").slice(0,10);
  var type=String(p.trainType||"").split(/[.:]/).pop();
  var dir=String(p.railDirection||p.direction||"").split(/[.:]/).pop();
  var expected=band.railDirection;
  if(line!=="TobuUtsunomiya"||String(p.displayLineId||line)!=="TobuUtsunomiya"||
     p.sourceRailway!=="odpt.Railway:Tobu.Utsunomiya"||
     (op&&op!=="Tobu"&&op!=="odpt.Operator:Tobu")||
     p.positionSource!=="supabase-train-run"||p.estimated!==true||
     !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
     !calendar(p)||type!=="Local"||
     (dir&&dir!==expected)||
     (p.trainNumber&&String(p.trainNumber).trim().toUpperCase()!==number)||
     p.vehicleIdentityStatus==="EXACT"||
     p.vehicleResolvedUpstream===true||p.vehicleResolvedFromRealtime===true||
     p.actualVehicleConfirmed===true||p.vehicleFormationId||
     p.vehicleFormationConflict||
     (Array.isArray(p.vehicleFormationCandidates)&&p.vehicleFormationCandidates.length)||
     p.realtimeVehicleType||p.realtimeDerivedVehicleType)return null;
  var plan=p.vehiclePlan;
  if(plan&&(plan.confirmed===true||
     (Array.isArray(plan.models)&&plan.models.some(function(m){
      return !["東武20400型","20400型","東武20400系"].includes(String(m));
     }))))return null;
  var gallery=root.VehicleGaragePngMap;
  if(!gallery||!gallery.matchModelPath||!gallery.matchModelPath(MODEL,PNG,line))return null;
  return Object.freeze({
   lineId:line,trainNumber:number,model:MODEL,pngPath:PNG,
   rangeId:band.id,rangeFirst:band.first,rangeLast:band.last,
   rangeStep:band.step,rangeCount:band.count,
   trainType:"Local",expectedDirection:expected,sourceCalendar:calendar(p),
   source:"tobu-utsunomiya-sql-historical-20400-reference",
   sourceUrl:"https://www.tobu.co.jp/corporation/rail/vehicles/",
   sourceEdition:"historical-undated",edition:"2611",
   authorizesDatedService:false,authorizesPhysicalVehicle:false,
   actualVehicleConfirmed:false,planned:true,representative:true,
   referenceOnly:true,illustrative:true
  });
 }
 root.TobuUtsunomiya2611Png=Object.freeze({version:"20261116-v2",
  match:match,hasPublishedNumber:listed,rangeFor:rangeFor,
  ranges:RANGES,numbersPerCalendar:86,sourceTemplates:172,
  numbersSourceUrl:"https://tabinomemo.jp/train/timetable/tobu/18",
  fleetSourceUrl:"https://www.tobu.co.jp/corporation/rail/vehicles/"});
})(window);
