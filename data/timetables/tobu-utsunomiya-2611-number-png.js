/* Tobu Utsunomiya 401N-486N -> 20400 fleet IMAGE REFERENCE.
 * 172 undated historical SQL templates: 86 per Weekday/SaturdayHoliday.
 * Number/date context authorizes only a representative PNG, not actual
 * daily operation, a physical carset, or direct running beyond Shin-Tochigi.
 * https://www.tobu.co.jp/corporation/rail/vehicles/
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
 function listed(value){
  var m=/^(4[0-8][0-9])N$/.exec(String(value||"").trim().toUpperCase());
  return !!m && Number(m[1])>=401 && Number(m[1])<=486;
 }
 function match(value,p){
  p=p||{};
  var number=String(value||"").trim().toUpperCase();
  if(!listed(number))return null;
  var line=String(p.positionLineId||p.lineId||"");
  var op=String(p.trainOperator||p.operator||"");
  var date=String(p.serviceDate||"").slice(0,10);
  var type=String(p.trainType||"").split(/[.:]/).pop();
  var dir=String(p.railDirection||p.direction||"").split(/[.:]/).pop();
  var expected=Number(number.slice(0,3))%2?"Outbound":"Inbound";
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
   trainType:"Local",expectedDirection:expected,sourceCalendar:calendar(p),
   source:"tobu-utsunomiya-sql-historical-20400-reference",
   sourceUrl:"https://www.tobu.co.jp/corporation/rail/vehicles/",
   sourceEdition:"historical-undated",edition:"2611",
   authorizesDatedService:false,authorizesPhysicalVehicle:false,
   actualVehicleConfirmed:false,planned:true,representative:true,
   referenceOnly:true,illustrative:true
  });
 }
 root.TobuUtsunomiya2611Png=Object.freeze({version:"20261115-v1",
  match:match,hasPublishedNumber:listed,numbersPerCalendar:86,sourceTemplates:172});
})(window);
