/* JR-East Tadami Line 2611, source-scoped scheduled train map.
 * JR East Nov 2026 base timetable (262d1/d2, 262u1/u2) is authoritative
 * for public train number, direction, operating calendar and station span.
 * Old SQL additionally imports 9423D/9425D/9430D without a verified Nov
 * operating date; these do NOT become daily November plan trains.
 * The only line-wide stock evidence is KiHa E120 + KiHa110 FAMILY, not
 * a confirmed actual vehicle or formation for any particular train.
 * Illustrative front images follow the common territorial assignments:
 * Aizu-Wakamatsu to Tadami (E120), Oshirakawa to Koide (KiHa110).
 * The boundary at Tadami is not a proof of consist replacement.
 */
(function(root){
"use strict";
var regular=Object.freeze({
  "Weekday":Object.freeze({
    "Outbound":["2421D","423D","425D","427D","8429D","431D","433D","435D","437D"],
    "Inbound":["422D","424D","426D","428D","430D","432D","434D","8436D","2428D"]
  }),
  "SaturdayHoliday":Object.freeze({
    "Outbound":["2421D","423D","425D","427D","431D","433D","435D","437D"],
    "Inbound":["422D","424D","426D","428D","430D","432D","434D","2428D"]
  })
});
var terminals=Object.freeze({
 "2421D":["Oshirakawa","Koide"],"423D":["Aizu-Wakamatsu","Koide"],
 "425D":["Aizu-Wakamatsu","Aizu-Kawaguchi"],"427D":["Aizu-Wakamatsu","Koide"],
 "8429D":["Oshirakawa","Koide"],"431D":["Aizu-Wakamatsu","Koide"],
 "433D":["Aizu-Wakamatsu","Aizu-Bange"],"435D":["Aizu-Wakamatsu","Aizu-Kawaguchi"],
 "437D":["Aizu-Wakamatsu","Aizu-Kawaguchi"],
 "422D":["Aizu-Kawaguchi","Aizu-Wakamatsu"],
 "424D":["Aizu-Kawaguchi","Aizu-Wakamatsu"],
 "426D":["Koide","Aizu-Wakamatsu"],
 "428D":["Aizu-Kawaguchi","Aizu-Wakamatsu"],
 "430D":["Koide","Aizu-Wakamatsu"],
 "432D":["Aizu-Bange","Aizu-Wakamatsu"],
 "434D":["Koide","Aizu-Wakamatsu"],
 "8436D":["Koide","Oshirakawa"],
 "2428D":["Koide","Oshirakawa"]
});
var modelByTerritory=Object.freeze({
 east:Object.freeze({model:"キハE120形",
  png:"../images/列车/JR東日本/JR東日本_キハE120形_只見線色.png"}),
 west:Object.freeze({model:"キハ110系",
  png:"../images/列车/JR東日本/JR東日本_キハ110系（只見線）.png"})
});
function station(raw){
 return String(raw||"").split(".").pop();
}
function serviceCalendar(date){
 if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date))return "";
 var day=Number(date.slice(-2));
 // Cultural Day (Nov 3), Labor Thanksgiving Day (Nov 23).
 var weekday=new Date(date+"T12:00:00Z").getUTCDay();
 return weekday===0||weekday===6||day===3||day===23
   ?"SaturdayHoliday":"Weekday";
}
function verify(p){
 if(!p||p.positionLineId&&p.positionLineId!=="Tadami"||
    String(p.sourceRailway||"")!=="odpt.Railway:JR-East.Tadami"||
    String(p.positionSource||"")!=="supabase-train-run"||
    p.trainOperator&&String(p.trainOperator).replace(/^odpt.Operator:/,"")!=="JR-East")
   return null;
 var date=String(p.serviceDate||"").slice(0,10);
 var cal=String(p.calendarType||p.serviceId||p.timetableCalendar||"").split(/[.:]/).pop();
 if(cal==="weekday")cal="Weekday";
 if(cal==="holiday")cal="SaturdayHoliday";
 if(!regular[cal]||cal!==serviceCalendar(date))return null;
 var number=String(p.trainNumber||"").trim();
 var dir=String(p.railDirection||"").split(/[.:]/).pop();
 if(!regular[cal][dir]||regular[cal][dir].indexOf(number)<0)return null;
 if(String(p.trainType||"").split(/[.:]/).pop()!=="Local")return null;
 var keys=Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[];
 var end=terminals[number];
 if(!end||keys.length<2||station(keys[0])!==end[0]||
    station(keys[keys.length-1])!==end[1])return null;
 return {number:number,direction:dir,calendar:cal,serviceDate:date,
   firstStation:end[0],lastStation:end[1],
   officialUrl:"https://timetables.jreast.co.jp/2611/timetable-v/262"+
     (dir==="Outbound"?"d":"u")+(cal==="Weekday"?"1":"2")+".html"};
}
function resolve(p){
 if(!p||String(p.displayLineId||p.positionLineId||"")!=="Tadami"||
    p.positionLineId!=="Tadami"||p.estimated!==true||
    p.vehicleIdentityStatus==="EXACT"||p.actualVehicleConfirmed===true||
    p.vehicleFormationId||p.vehicleResolvedFromRealtime===true||
    p.realtimeVehicleType||p.realtimeDerivedVehicleType||
    (p.vehicleResolution&&p.vehicleResolution.identityStatus==="EXACT"))
   return null;
 var proof=verify(p);
 if(!proof)return null;
 // 36 canonical display stations, with Tadami at index 27 and
 // Oshirakawa at 28. No fictional exact vehicle-set link at this boundary.
 var at=Number(p.stationIndex);
 if(!Number.isInteger(at)||at<0||at>35)return null;
 var target=p.segmentToIndex==null?at:Number(p.segmentToIndex);
 if(!Number.isInteger(target)||target<0||target>35)return null;
 var territory=at>=28||(at===27&&target>=28&&Number(p.segmentProgress)>0)
   ?"west":"east";
 var ref=modelByTerritory[territory];
 var plan=p.vehiclePlan;
 if(plan&&plan.status==="PLANNED_MODEL"&&Array.isArray(plan.models)&&
    plan.models.length&&plan.models.indexOf(ref.model)<0)return null;
 return {trainNumber:proof.number,lineId:"Tadami",
   illustrationModel:ref.model,illustrationPng:ref.png,
   referenceOnly:true,illustrative:true,authorizesPNG:false,
   actualVehicleConfirmed:false,formationId:null,model:null,
   evidence:"JR East Tadami family/territory representative only",
   officialUrl:proof.officialUrl};
}
root.JREastTadamiNumberIndex202611=Object.freeze({
 verify:verify,resolve:resolve,regular:regular
});
var ranges=root.TrainNumberPngRanges;
if(ranges&&typeof ranges.match==="function"){
 var previous=ranges.match;
 root.TrainNumberPngRanges=Object.freeze(Object.assign({},ranges,{
  match:function(number,line,p){
   if(line!=="Tadami")return previous(number,line,p);
   var plan=resolve(Object.assign({},p||{},{trainNumber:number}));
   return plan?{model:plan.illustrationModel,pngPath:plan.illustrationPng,
     lineId:"Tadami",trainNumber:plan.trainNumber,
     source:"tadami-2611-official-source-and-territory",
     planned:true,representative:true,referenceOnly:true,
     illustrative:true,actualVehicleConfirmed:false}:null;
  }
 }));
}
})(window);
