/* JR-East 2611 Ryomo official train-NUMBER roster, not working numbers.
 * Published 237u1/u2/d1/d2 lists all regular 420–484 M and selected
 * 620–661 M, with cross-line E/Y and three green-car M exceptions.
 * SQL 9482M/9484M/9486M are historical-only; excluded from 2611.
 * Any picture here is a planned FLEET illustration, not a daily formation.
 * https://timetables.jreast.co.jp/2611/timetable-v/237u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/237u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/237d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/237d2.html
 * https://www.jreast.co.jp/train/local/211.html
 */
(function(root){
 "use strict";
 var groups=[["Weekday","Outbound","211","420M,422M,424M,426M,428M,430M,432M,434M,436M,438M,440M,442M,444M,446M,448M,450M,452M,454M,456M,458M,460M,462M,464M,466M,468M,470M,472M,474M,476M,478M,480M,482M,484M,620M,622M,624M,626M,628M,630M,632M,634M,636M,638M,640M,642M,652M,654M,656M,658M,660M"],["Weekday","Inbound","211","421M,423M,425M,427M,429M,431M,433M,435M,437M,439M,441M,443M,445M,447M,449M,451M,453M,455M,457M,459M,461M,463M,465M,467M,469M,471M,473M,475M,477M,479M,481M,483M,621M,625M,627M,629M,633M,635M,637M,639M,641M,643M,645M,647M,649M,651M,653M,655M,657M,659M,661M"],["SaturdayHoliday","Outbound","211","420M,422M,424M,426M,428M,430M,432M,434M,436M,438M,440M,442M,444M,446M,448M,450M,452M,454M,456M,458M,460M,462M,464M,466M,468M,470M,472M,474M,476M,478M,480M,482M,484M,620M,622M,624M,626M,628M,630M,632M,634M,636M,638M,640M,642M,652M,654M,656M,658M,660M"],["SaturdayHoliday","Inbound","211","421M,423M,425M,427M,429M,431M,433M,435M,437M,439M,441M,443M,445M,447M,449M,451M,453M,455M,457M,459M,461M,463M,465M,467M,469M,471M,473M,475M,477M,479M,481M,483M,621M,625M,627M,629M,633M,635M,637M,639M,641M,643M,645M,647M,649M,651M,653M,655M,657M,659M,661M"],["Weekday","Outbound","mixed","1837E,1843E,1927E,1937E,2825Y,2835Y,832M,852M"],["Weekday","Inbound","mixed","1621M,1940E,2856Y,2860Y"],["SaturdayHoliday","Outbound","mixed","1837E,1841E,1843E,1847E,1925E,1937E,2825Y,2831Y,852M"],["SaturdayHoliday","Inbound","mixed","1621M,1928E,1944E,2858Y"]];
 var roster=Object.create(null);
 groups.forEach(function(g){
   var key=g[0]+"_"+g[1];if(!roster[key])roster[key]=Object.create(null);
   g[3].split(",").forEach(function(number){roster[key][number]=g[2];});
 });
 var local=["211系（高崎地区）"];
 var mixed=["E231系1000番台","E233系3000番台"];
 function resolve(p){
   if(!p || String(p.positionLineId||p.lineId||"")!=="Ryomo" ||
      String(p.displayLineId||p.positionLineId||p.lineId||"")!=="Ryomo" ||
      p.sourceRailway!=="odpt.Railway:JR-East.Ryomo" ||
      !["supabase-train-run","realtime-api"].includes(p.positionSource) ||
      (p.positionSource==="supabase-train-run" && p.estimated!==true) ||
      (p.positionSource==="realtime-api" && (p.estimated===true ||
         p.realtimePositionRecordPresent===false)) ||
      p.vehicleIdentityStatus==="EXACT" || p.actualVehicleConfirmed===true ||
      p.vehicleResolvedFromRealtime===true || p.vehicleFormationId ||
      p.realtimeVehicleType || p.realtimeDerivedVehicleType ||
      (p.vehicleResolution && p.vehicleResolution.identityStatus==="EXACT"))
     return null;
   var date=String(p.serviceDate||"").slice(0,10);
   if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date))return null;
   var cal=String(p.calendarType||p.serviceId||p.timetableCalendar||"");
   cal=/^(?:weekday|odpt.Calendar:Weekday)$/i.test(cal)?"Weekday":
     /^(?:holiday|odpt.Calendar:SaturdayHoliday)$/i.test(cal)?"SaturdayHoliday":"";
   var dir=String(p.railDirection||"").split(/[.:]/).pop();
   var number=String(p.trainNumber||"").trim().toUpperCase();
   var kind=roster[cal+"_"+dir] && roster[cal+"_"+dir][number];
   if(!kind)return null;
   var type=String(p.trainType||"").split(/[.:]/).pop();
   if(type!==(number.endsWith("Y")?"Rapid":"Local"))return null;
   var operator=String(p.trainOperator||p.operator||"").replace(/^odpt.Operator:/,"");
   if(operator&&operator!=="JR-East")return null;
   var models=kind==="211"?local:mixed;
   var existing=p.vehiclePlan;
   if(existing && existing.status==="PLANNED_MODEL" &&
      Array.isArray(existing.models) && existing.models.length &&
      existing.models.some(function(model){return models.indexOf(model)<0;}))
     return null;
   var illustrationModel=kind==="211"?local[0]:mixed[1];
   return {lineId:"Ryomo",trainNumber:number,calendar:cal,direction:dir,
      kind:kind,models:models.slice(),illustrationModel:illustrationModel,
      illustrationPng:kind==="211"
       ?"../images/列车/JR東日本/JR東日本_211系_湘南色.png"
       :"../images/列车/JR東日本/JR東日本_E233系3000番台.png",
      sourceUrl:"https://timetables.jreast.co.jp/2611/timetable-v/237"+
        (dir==="Outbound"?"u":"d")+(cal==="Weekday"?"1":"2")+".html",
      planned:true,illustrative:true,referenceOnly:true,
      actualVehicleConfirmed:false,authorizesPNG:false,
      model:null,formationId:null};
 }
 root.JREastRyomoNumberIndex202611=Object.freeze({resolve:resolve});
})(window);
