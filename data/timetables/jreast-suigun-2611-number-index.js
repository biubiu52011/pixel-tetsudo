/* JR East water-gun/Suigun 2611: two exact source railway namespaces.
 * Main line and Hitachi-Ota branch share SOME train numbers but are never
 * interchangeable. The manual source has historical unverified stop clocks.
 * Ordinary trains: KiHa E130 0 family, illustrative only, NOT KiHa110 or
 * other line's E130 100/500 subtype. Official source: 243u1/u2/d1/d2.
 * Branch Weekday 929D/930D/931D/932D are direct official 2611
 * records (their old manual weekday sources were absent).
 * 9821D/9822D: November 14/15 Kazekko (trolley, no approved dedicated
 * PNG). 9329D and 9324D are date-scoped maintenance exceptions.
 */
(function(root){
"use strict";
var source={"Suigun":{"SaturdayHoliday":{"Inbound":["320D","322D","324D","328D","330D","332D","334D","336D","338D","820D","822D","824D","826D","828D","830D","8326D","832D","834D","836D","838D","840D","842D","844D","846D","848D","920D","922D","924D","926D","928D","930D","932D","934D","936D","938D","940D","942D","944D","946D","948D","9822D"],"Outbound":["321D","323D","325D","327D","329D","333D","335D","337D","339D","341D","821D","823D","825D","827D","829D","831D","8325D","833D","835D","837D","839D","841D","843D","845D","847D","921D","923D","925D","927D","929D","931D","933D","935D","937D","939D","941D","943D","945D","947D","949D","9821D","9841D"]},"Weekday":{"Inbound":["320D","322D","330D","332D","334D","336D","338D","820D","822D","824D","826D","828D","830D","8326D","832D","834D","836D","838D","840D","842D","844D","846D","848D","920D","922D","924D","926D","928D","9324D","934D","936D","938D","940D","942D","944D","946D","948D"],"Outbound":["321D","323D","325D","327D","333D","335D","337D","339D","341D","821D","823D","825D","827D","829D","831D","8325D","833D","835D","837D","839D","841D","843D","845D","847D","921D","923D","925D","927D","9329D","933D","935D","937D","939D","941D","943D","945D","947D","949D"]}},"SuigunBranch":{"SaturdayHoliday":{"Inbound":["920D","922D","924D","926D","928D","930D","932D","934D","936D","938D","940D","942D","944D","946D","948D"],"Outbound":["921D","923D","925D","927D","929D","931D","933D","935D","937D","939D","941D","943D","945D","947D","949D"]},"Weekday":{"Inbound":["920D","922D","924D","926D","928D","930D","932D","934D","936D","938D","940D","942D","944D","946D","948D"],"Outbound":["921D","923D","925D","927D","929D","931D","933D","935D","937D","939D","941D","943D","945D","947D","949D"]}}};
var png="../images/列车/JR東日本/JR東日本_キハE130系0番台.png";
var seasonal=new Set([1,2,3,7,8,14,15,21,22,23,26,27,28,29,30]);
var worksA=new Set([10,11,12]),worksB=new Set([17,18,19]);
function resolve(p){
 if(!p)return null;
 var line=String(p.positionLineId||p.lineId||"");
 var display=String(p.displayLineId||line);
 if((line!=="Suigun"&&line!=="SuigunBranch")||display!==line||
    p.sourceRailway!=="odpt.Railway:JR-East."+line||
    ["supabase-train-run","realtime-api"].indexOf(p.positionSource)<0||
    (p.positionSource==="supabase-train-run"&&p.estimated!==true)||
    (p.positionSource==="realtime-api"&&(p.estimated===true||
      p.realtimePositionRecordPresent===false))||
    p.vehicleIdentityStatus==="EXACT"||p.actualVehicleConfirmed===true||
    p.vehicleResolvedFromRealtime===true||p.vehicleFormationId||
    p.realtimeVehicleType||p.realtimeDerivedVehicleType||
    (p.vehicleResolution&&p.vehicleResolution.identityStatus==="EXACT"))
   return null;
 var date=String(p.serviceDate||"").slice(0,10);
 if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date))return null;
 var day=Number(date.slice(-2));
 var cal=String(p.calendarType||p.serviceId||p.timetableCalendar||"");
 cal=/^(weekday|odpt.Calendar:Weekday)$/i.test(cal)?"Weekday":
    /^(holiday|odpt.Calendar:SaturdayHoliday)$/i.test(cal)?"SaturdayHoliday":"";
 var dir=String(p.railDirection||"").split(/[.:]/).pop();
 if(!cal||!source[line][cal]||(dir!=="Inbound"&&dir!=="Outbound"))return null;
 var n=String(p.trainNumber||"").trim().toUpperCase();
 if(source[line][cal][dir].indexOf(n)<0)return null;
 var kind=String(p.trainType||"").split(/[.:]/).pop();
 var op=String(p.trainOperator||p.operator||"").replace(/^odpt.Operator:/,"");
 if(op&&op!=="JR-East")return null;
 if(line==="Suigun"){
   // Wind trolley has independent rolling stock and is NEVER E130.
   if(n==="9821D"||n==="9822D")return null;
   if(n==="9329D"&&!(worksA.has(day)||worksB.has(day)))return null;
   if(n==="9324D"&&!worksB.has(day))return null;
   if((n==="8325D"||n==="8326D")&&!seasonal.has(day))return null;
   if(n==="9841D"&&day!==21)return null;
   if(n==="341D"&&cal==="SaturdayHoliday"&&day===22)return null;
 }
 if(kind!=="Local")return null;
 var plan=p.vehiclePlan;
 if(plan&&plan.status==="PLANNED_MODEL"&&Array.isArray(plan.models)&&
   plan.models.length&&plan.models.some(function(x){
     return !/キハE130|KiHa.?E130/i.test(String(x))||
       /100番台|500番台/.test(String(x));
   }))return null;
 return {lineId:line,calendar:cal,direction:dir,trainNumber:n,
   illustrationModel:"キハE130系0番台",illustrationPng:png,
   candidateModels:["キハE130系0番台"],planned:true,
   referenceOnly:true,illustrative:true,authorizesPNG:false,
   actualVehicleConfirmed:false,model:null,formationId:null,
   provenance:"suigun-2611-exact-source-number",
   sourceUrl:"https://timetables.jreast.co.jp/2611/timetable-v/243"+
     (dir==="Inbound"?"u":"d")+(cal==="Weekday"?"1":"2")+".html"};
}
root.JREastSuigunNumberIndex202611=Object.freeze({resolve:resolve});
var ranges=root.TrainNumberPngRanges;
if(ranges&&typeof ranges.match==="function"){
 var previous=ranges.match;
 root.TrainNumberPngRanges=Object.freeze(Object.assign({},ranges,{
  match:function(number,line,p){
   if(line!=="Suigun"&&line!=="SuigunBranch")
     return previous(number,line,p);
   var match=resolve(Object.assign({},p||{},{positionLineId:line,trainNumber:number}));
   return match?{model:match.illustrationModel,pngPath:match.illustrationPng,
     lineId:line,trainNumber:match.trainNumber,source:match.provenance,
     planned:true,representative:true,referenceOnly:true,illustrative:true,
     actualVehicleConfirmed:false}:null;
  }
 }));
}
})(window);
