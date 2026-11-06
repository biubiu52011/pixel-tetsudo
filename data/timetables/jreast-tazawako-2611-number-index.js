/* Tazawako 2611: strictly conventional 701-series planned map references.
 * Public JR East 258d/u1/u2 separates Morioka-Omagari ordinary (8xxM)
 * from Komachi Shinkansen (30xx/50xxM), Ou Main (6xxM), and dated specials.
 * Historical Tazawako-manual SQL has 108 weekday / 165 weekend templates,
 * including duplicate/truncated segments and 300x/500x Komachi mislabelled
 * "Local 701". Only the longest canonical itinerary per official 8xx number
 * is admitted, with exact stops, calendar, direction and source checks.
 * SOURCE CLOCKS ARE HISTORICAL and NOT independently certified as 2611.
 * PNG is line-scoped representative 701系5000番台, NEVER an actual carset.
 * https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/258d2p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/258u1p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/258u2p.html
 */
(function(root){
"use strict";
var source={"Weekday":{"Outbound":{"823M":[8,"Morioka","Tazawako"],"825M":[11,"Tazawako","Omagari"],"827M":[11,"Tazawako","Omagari"],"831M":[5,"Morioka","Shizukuishi"],"833M":[11,"Tazawako","Omagari"],"835M":[5,"Morioka","Shizukuishi"],"839M":[7,"Morioka","Akabuchi"],"841M":[18,"Morioka","Omagari"],"843M":[5,"Morioka","Shizukuishi"],"845M":[8,"Morioka","Tazawako"],"847M":[5,"Morioka","Shizukuishi"],"849M":[11,"Tazawako","Omagari"],"851M":[18,"Morioka","Omagari"],"853M":[5,"Morioka","Shizukuishi"],"855M":[7,"Morioka","Akabuchi"],"857M":[5,"Morioka","Shizukuishi"],"861M":[5,"Morioka","Shizukuishi"]},"Inbound":{"822M":[11,"Omagari","Tazawako"],"824M":[7,"Akabuchi","Morioka"],"826M":[8,"Tazawako","Morioka"],"828M":[5,"Shizukuishi","Morioka"],"830M":[18,"Omagari","Morioka"],"832M":[5,"Shizukuishi","Morioka"],"834M":[5,"Shizukuishi","Morioka"],"838M":[7,"Akabuchi","Morioka"],"840M":[5,"Shizukuishi","Morioka"],"842M":[18,"Omagari","Morioka"],"844M":[5,"Shizukuishi","Morioka"],"846M":[18,"Omagari","Morioka"],"848M":[11,"Omagari","Tazawako"],"850M":[5,"Shizukuishi","Morioka"],"854M":[7,"Akabuchi","Morioka"],"856M":[11,"Omagari","Tazawako"]}},"SaturdayHoliday":{"Outbound":{"823M":[8,"Morioka","Tazawako"],"825M":[11,"Tazawako","Omagari"],"827M":[11,"Tazawako","Omagari"],"831M":[5,"Morioka","Shizukuishi"],"833M":[11,"Tazawako","Omagari"],"835M":[5,"Morioka","Shizukuishi"],"839M":[7,"Morioka","Akabuchi"],"841M":[18,"Morioka","Omagari"],"843M":[5,"Morioka","Shizukuishi"],"845M":[8,"Morioka","Tazawako"],"847M":[5,"Morioka","Shizukuishi"],"849M":[11,"Tazawako","Omagari"],"851M":[18,"Morioka","Omagari"],"853M":[5,"Morioka","Shizukuishi"],"855M":[7,"Morioka","Akabuchi"],"857M":[5,"Morioka","Shizukuishi"],"861M":[5,"Morioka","Shizukuishi"]},"Inbound":{"822M":[11,"Omagari","Tazawako"],"824M":[7,"Akabuchi","Morioka"],"826M":[8,"Tazawako","Morioka"],"830M":[18,"Omagari","Morioka"],"832M":[5,"Shizukuishi","Morioka"],"834M":[5,"Shizukuishi","Morioka"],"838M":[7,"Akabuchi","Morioka"],"840M":[5,"Shizukuishi","Morioka"],"842M":[18,"Omagari","Morioka"],"844M":[5,"Shizukuishi","Morioka"],"846M":[18,"Omagari","Morioka"],"848M":[11,"Omagari","Tazawako"],"850M":[5,"Shizukuishi","Morioka"],"854M":[7,"Akabuchi","Morioka"],"856M":[11,"Omagari","Tazawako"]}}};
var stops=["Morioka","Maegata","Okama","Koiwai","Shizukuishi",
 "Harukiba","Akabuchi","Tazawako","Sashimaki","Jindai",
 "Shoden","Kakunodate","Uguisu-no","Ugo-Nagano","Yariminai",
 "Ugo-Yotsuya","Kita-Omagari","Omagari"];
var stationIndex=Object.create(null);
stops.forEach(function(x,i){stationIndex[x]=i;});
var image="../images/列车/JR東日本/JR東日本_701系_5000番台.png";
function calForDate(date){
 if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date))return "";
 var day=Number(date.slice(-2));
 var weekday=new Date(date+"T12:00:00Z").getUTCDay();
 return weekday===0||weekday===6||day===3||day===23
   ?"SaturdayHoliday":"Weekday";
}
function shortStation(x){
 var key=String(x||"").split(".").pop();
 // 2026-11 manual SQL writes Uguisuno; the passenger map writes
 // Uguisu-no. Both are 鶯野駅 and normalize to the same station.
 return key==="Uguisuno"?"Uguisu-no":key;
}
function verify(p){
 if(!p||p.positionLineId&&p.positionLineId!=="Tazawako"||
    p.sourceRailway!=="odpt.Railway:JR-East.Tazawako"||
    p.positionSource!=="supabase-train-run"||
    p.trainOperator&&String(p.trainOperator).replace(/^odpt.Operator:/,"")!=="JR-East")
   return null;
 var date=String(p.serviceDate||"").slice(0,10);
 var cal=String(p.calendarType||p.serviceId||p.timetableCalendar||"")
   .split(/[.:]/).pop();
 if(cal==="weekday")cal="Weekday";
 if(cal==="holiday")cal="SaturdayHoliday";
 if(!source[cal]||cal!==calForDate(date))return null;
 var dir=String(p.railDirection||"").split(/[.:]/).pop();
 var number=String(p.trainNumber||"").trim().toUpperCase();
 var route=source[cal][dir]&&source[cal][dir][number];
 if(!route||String(p.trainType||"").split(/[.:]/).pop()!=="Local")
   return null;
 var actual=Array.isArray(p.scheduledStopKeys)?
    p.scheduledStopKeys.map(shortStation):[];
 if(actual.length!==route[0]||actual[0]!==route[1]||
    actual[actual.length-1]!==route[2])return null;
 var step=dir==="Outbound"?1:-1;
 for(var i=0;i<actual.length;i++){
   if(stationIndex[actual[i]]===undefined)return null;
   if(i>0&&(stationIndex[actual[i]]-stationIndex[actual[i-1]])*step<=0)
     return null;
 }
 return {lineId:"Tazawako",trainNumber:number,calendar:cal,
   direction:dir,stopCount:actual.length,
   origin:route[1],terminus:route[2],serviceDate:date,
   officialUrl:"https://timetables.jreast.co.jp/2611/timetable-v/258"+
     (dir==="Outbound"?"d":"u")+(cal==="Weekday"?"1":"2")+"p.html",
   numberOfficial:true,sourceClocksVerified:false};
}
function resolve(p){
 if(!p||p.positionLineId!=="Tazawako"||
    String(p.displayLineId||"Tazawako")!=="Tazawako"||
    p.estimated!==true||
    p.vehicleIdentityStatus==="EXACT"||p.actualVehicleConfirmed===true||
    p.vehicleResolvedFromRealtime===true||p.vehicleFormationId||
    p.realtimeVehicleType||p.realtimeDerivedVehicleType||
    (p.vehicleResolution&&p.vehicleResolution.identityStatus==="EXACT"))
   return null;
 var proof=verify(p);
 if(!proof)return null;
 var plan=p.vehiclePlan;
 if(plan&&plan.status==="PLANNED_MODEL"&&Array.isArray(plan.models)&&
    plan.models.length&&plan.models.indexOf("701系5000番台")<0)return null;
 return {lineId:"Tazawako",trainNumber:proof.trainNumber,
   illustrationModel:"701系5000番台",illustrationPng:image,
   candidateModels:["701系5000番台"],referenceOnly:true,
   illustrative:true,planned:true,authorizesPNG:false,
   actualVehicleConfirmed:false,model:null,formationId:null,
   sourceClocksVerified:false,
   provenance:"tazawako-2611-public-8xx-number-legacy-sql-clocks",
   officialUrl:proof.officialUrl};
}
root.JREastTazawakoNumberIndex202611=Object.freeze({
 source:source,verify:verify,resolve:resolve
});
var ranges=root.TrainNumberPngRanges;
if(ranges&&typeof ranges.match==="function"){
 var previous=ranges.match;
 root.TrainNumberPngRanges=Object.freeze(Object.assign({},ranges,{
   match:function(number,line,p){
     if(line!=="Tazawako")return previous(number,line,p);
     var found=resolve(Object.assign({},p||{},{trainNumber:number}));
     return found?{model:found.illustrationModel,pngPath:found.illustrationPng,
       lineId:"Tazawako",trainNumber:found.trainNumber,
       source:found.provenance,planned:true,
       illustrative:true,referenceOnly:true,representative:true,
       actualVehicleConfirmed:false}:null;
   }
 }));
}
})(window);
