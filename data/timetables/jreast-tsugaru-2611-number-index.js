/* JR East Tsugaru 2611: official planned services on the open Aomori–Kanita
 * 11-station segment ONLY. Kanita–Minmaya is suspended as of Nov 2026;
 * buses and Wan-Taku are separate road modes, never railway train markers.
 *
 * Source: https://timetables.jreast.co.jp/2611/timetable-v/280d2.html
 *         https://timetables.jreast.co.jp/2611/timetable-v/280u2.html
 * 324M: Saturdays run, Sundays/national holidays do NOT run.
 * JR East 2025-03 revision switched the last GV-E400 runs to 701 stock.
 * Image is an Akita-region 701 FAMILY illustration, NOT an actual carset.
 */
(function(root){
"use strict";
var board=Object.freeze({
 Outbound:Object.freeze({
  "325M":["06:17","06:52"],"327M":["08:14","08:50"],
  "329M":["11:01","11:39"],"331M":["13:16","13:51"],
  "333M":["15:31","16:06"],"335M":["16:42","17:18"],
  "337M":["18:12","18:50"],"339M":["20:16","20:54"],
  "341M":["22:10","22:47"]
 }),
 Inbound:Object.freeze({
  "322M":["05:33","06:08"],"324M":["06:26","07:02"],
  "326M":["07:09","07:47"],"328M":["09:06","09:45"],
  "330M":["12:10","12:58"],"332M":["14:14","14:54"],
  "334M":["16:25","17:13"],"336M":["17:27","18:03"],
  "338M":["19:08","19:43"]
 })
});
var stations=Object.freeze(["Aomori","Aburakawa","Tsugaru-Miyata",
 "Okunai","Satsumi","Ushirogata","Nakasawa","Yomogita",
 "Gozawa","Seheji","Kanita"]);
var png="../images/列车/JR東日本/JR東日本_701系_秋田地区.png";
function serviceCalendar(date){
 if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date))return "";
 var weekday=new Date(date+"T12:00:00Z").getUTCDay();
 var num=Number(date.slice(-2));
 return weekday===0||weekday===6||num===3||num===23
   ?"SaturdayHoliday":"Weekday";
}
function isNo324Day(date){
 var weekday=new Date(date+"T12:00:00Z").getUTCDay();
 return weekday===0||date==="2026-11-03"||date==="2026-11-23";
}
function terminal(x){return String(x||"").split(".").pop();}
function verify(p){
 if(!p||p.positionLineId!=="Tsugaru"||
    p.sourceRailway!=="odpt.Railway:JR-East.Tsugaru"||
    p.positionSource!=="supabase-train-run"||p.estimated!==true)
   return null;
 var date=String(p.serviceDate||"").slice(0,10);
 var officialCalendar=serviceCalendar(date);
 if(!officialCalendar)return null;
 var cal=String(p.calendarType||p.serviceId||p.timetableCalendar||"").split(/[.:]/).pop();
 if(cal==="weekday")cal="Weekday";
 if(cal==="holiday")cal="SaturdayHoliday";
 if(cal!==officialCalendar)return null;
 var op=String(p.trainOperator||p.operator||"").replace(/^odpt.Operator:/,"");
 if(op&&op!=="JR-East")return null;
 if(String(p.trainType||"").split(/[.:]/).pop()!=="Local")return null;
 var dir=String(p.railDirection||"").split(/[.:]/).pop();
 var number=String(p.trainNumber||"").trim().toUpperCase();
 var clocks=board[dir]&&board[dir][number];
 if(!clocks||(number==="324M"&&isNo324Day(date)))return null;
 var actual=Array.isArray(p.scheduledStopKeys)?
   p.scheduledStopKeys.map(terminal):[];
 var expected=dir==="Inbound"?stations.slice().reverse():stations;
 if(actual.length!==expected.length||
    expected.some(function(key,i){return key!==actual[i];}))return null;
 if(p.firstDepartureClock&&String(p.firstDepartureClock).slice(0,5)!==clocks[0])
   return null;
 if(p.lastArrivalClock&&String(p.lastArrivalClock).slice(0,5)!==clocks[1])
   return null;
 return {lineId:"Tsugaru",serviceDate:date,calendar:cal,direction:dir,
   trainNumber:number,firstStation:expected[0],lastStation:expected[10],
   firstClock:clocks[0],lastClock:clocks[1],
   currentRailwaySegment:"Aomori-Kanita",closedAfter:"Kanita",
   officialUrl:"https://timetables.jreast.co.jp/2611/timetable-v/280"+
     (dir==="Inbound"?"u":"d")+(cal==="Weekday"?"1":"2")+".html"};
}
function resolve(p){
 if(!p||p.displayLineId&&p.displayLineId!=="Tsugaru"||
    p.vehicleIdentityStatus==="EXACT"||p.actualVehicleConfirmed===true||
    p.vehicleResolvedFromRealtime===true||p.vehicleFormationId||
    p.realtimeVehicleType||p.realtimeDerivedVehicleType||
    (p.vehicleResolution&&p.vehicleResolution.identityStatus==="EXACT"))
   return null;
 var proof=verify(p);if(!proof)return null;
 var at=Number(p.stationIndex);
 if(!Number.isInteger(at)||at<0||at>10)return null;
 var to=p.segmentToIndex==null?at:Number(p.segmentToIndex);
 if(!Number.isInteger(to)||to<0||to>10)return null;
 var plan=p.vehiclePlan;
 if(plan&&plan.status==="PLANNED_MODEL"&&Array.isArray(plan.models)&&
    plan.models.length&&plan.models.some(function(m){
      return ["701系","701系0番台","701系100番台",
        "701系（秋田地区）"].indexOf(String(m))<0;
    }))return null;
 return {lineId:"Tsugaru",trainNumber:proof.trainNumber,
   illustrationModel:"701系（秋田地区）",illustrationPng:png,
   candidateModels:["701系"],planned:true,
   referenceOnly:true,illustrative:true,authorizesPNG:false,
   actualVehicleConfirmed:false,model:null,formationId:null,
   provenance:"tsugaru-2611-official-280-number-and-time-scope",
   officialUrl:proof.officialUrl};
}
root.JREastTsugaruNumberIndex202611=Object.freeze({
 verify:verify,resolve:resolve,board:board,
 openStations:stations,closedAfter:"Kanita"
});
var ranges=root.TrainNumberPngRanges;
if(ranges&&typeof ranges.match==="function"){
 var previous=ranges.match;
 root.TrainNumberPngRanges=Object.freeze(Object.assign({},ranges,{
  match:function(number,line,p){
   if(line!=="Tsugaru")return previous(number,line,p);
   var found=resolve(Object.assign({},p||{trainNumber:number}, {trainNumber:number}));
   return found?{model:found.illustrationModel,pngPath:found.illustrationPng,
     lineId:"Tsugaru",trainNumber:found.trainNumber,source:found.provenance,
     planned:true,illustrative:true,representative:true,referenceOnly:true,
     actualVehicleConfirmed:false}:null;
  }
 }));
}
})(window);
