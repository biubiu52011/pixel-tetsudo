/* JR-East Senzan 2611 full published train NUMBER roster.
 * E721 family planned illustration != actual carset or 0/1000 subgroup.
 * 8821D/8822D SATONO only on official November dates; 9821D/9822D
 * are December Omoide and must NEVER appear in November.
 * Sources: timetables.jreast.co.jp/2611/timetable-v/265u1,u2,d1,d2
 * and media.jreast.co.jp/articles/6686.
 */
(function(root){
"use strict";
var regular={"Inbound":{"Local":["1820M","1822M","1824M","1828M","1830M","1832M","1836M","1838M","1840M","1842M","1844M","1846M","1848M","1850M","1852M","1854M","1856M","1858M","1860M","1862M","1864M","1866M","1868M","1870M","1872M","1874M","1876M","1878M","1880M","1882M","1888M","1890M","2826M","2834M","4822M","4844M","4848M","4850M","4852M","4854M","824M","826M","828M","832M","836M","840M","842M","846M"],"Rapid":["3820M","3830M","3834M","3838M"]},"Outbound":{"Local":["1829M","1831M","1835M","1837M","1839M","1841M","1843M","1845M","1847M","1849M","1851M","1853M","1855M","1857M","1859M","1861M","1863M","1865M","1867M","1869M","1871M","1873M","1875M","1877M","1879M","1881M","1883M","1885M","1887M","1889M","1891M","1893M","1895M","2833M","4821M","4843M","4847M","4849M","4851M","4853M","4855M","823M","825M","829M","833M","837M","839M","841M","845M"],"Rapid":["3827M","3831M","3835M"]}};
var dates=["2026-11-01","2026-11-02","2026-11-03","2026-11-06","2026-11-07","2026-11-08","2026-11-09","2026-11-13","2026-11-14","2026-11-15","2026-11-16","2026-11-21","2026-11-22","2026-11-23","2026-11-24","2026-11-27","2026-11-28","2026-11-29","2026-11-30"];
function resolve(p){
 if(!p || String(p.positionLineId||p.lineId||"")!=="Senzan" ||
    String(p.displayLineId||p.positionLineId||p.lineId||"")!=="Senzan" ||
    p.sourceRailway!=="odpt.Railway:JR-East.Senzan" ||
    ["supabase-train-run","realtime-api"].indexOf(p.positionSource)<0 ||
    (p.positionSource==="supabase-train-run"&&p.estimated!==true) ||
    (p.positionSource==="realtime-api"&&(p.estimated===true || p.realtimePositionRecordPresent===false)) ||
    p.vehicleIdentityStatus==="EXACT" || p.actualVehicleConfirmed===true ||
    p.vehicleResolvedFromRealtime===true || p.vehicleFormationId ||
    p.realtimeVehicleType || p.realtimeDerivedVehicleType ||
    (p.vehicleResolution&&p.vehicleResolution.identityStatus==="EXACT"))return null;
 var date=String(p.serviceDate||"").slice(0,10);
 if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date))return null;
 var n=String(p.trainNumber||"").trim().toUpperCase();
 if(n==="9821D"||n==="9822D")return null;
 var cal=String(p.calendarType||p.serviceId||p.timetableCalendar||"");
 cal=/^(weekday|odpt.Calendar:Weekday)$/i.test(cal)?"Weekday":
   /^(holiday|odpt.Calendar:SaturdayHoliday)$/i.test(cal)?"SaturdayHoliday":"";
 if(!cal)return null;
 var dir=String(p.railDirection||"").split(/[.:]/).pop();
 if(dir!=="Inbound"&&dir!=="Outbound")return null;
 var type=String(p.trainType||"").split(/[.:]/).pop();
 var operator=String(p.trainOperator||p.operator||"").replace(/^odpt.Operator:/,"");
 if(operator&&operator!=="JR-East")return null;
 var satono=n===(dir==="Outbound"?"8821D":"8822D");
 var model="",png="",url="",kind="";
 if(satono){
  if(type!=="Rapid"||dates.indexOf(date)<0)return null;
  kind="satono";model="HB-E300系（SATONO）";
  png="../images/列车/JR東日本/JR東日本_HB-E300系_SATONO_1号車.png";
  url="https://media.jreast.co.jp/articles/6686";
 }else{
  if(type!=="Local"&&type!=="Rapid")return null;
  if(regular[dir][type].indexOf(n)<0)return null;
  kind="electric";model="E721系";
  png="../images/列车/JR東日本/JR東日本_E721系_仙台地区.png";
  url="https://timetables.jreast.co.jp/2611/timetable-v/265"+
      (dir==="Inbound"?"u":"d")+(cal==="Weekday"?"1":"2")+".html";
 }
 var plan=p.vehiclePlan;
 if(plan&&plan.status==="PLANNED_MODEL"&&Array.isArray(plan.models)&&
    plan.models.some(function(m){return m!==model;}))return null;
 return {lineId:"Senzan",trainNumber:n,calendar:cal,direction:dir,
  serviceKind:kind,models:[model],illustrationModel:model,illustrationPng:png,
  sourceUrl:url,illustrative:true,referenceOnly:true,authorizesPNG:false,
  actualVehicleConfirmed:false,model:null,formationId:null,planned:true};
}
root.JREastSenzanNumberIndex202611=Object.freeze({resolve:resolve});
// Adapter for TrainVehicle's existing single number-to-artwork authority.
// The upstream resolver stays intact for every other line; this edition
// authorizes only a PLANNED reference PNG and never a physical formation.
var ranges=root.TrainNumberPngRanges;
if(ranges && typeof ranges.match==="function"){
 var priorMatch=ranges.match;
 root.TrainNumberPngRanges=Object.freeze(Object.assign({},ranges,{
  match:function(number,line,position){
   if(line!=="Senzan")return priorMatch(number,line,position);
   var p=Object.assign({},position||{},{trainNumber:number,positionLineId:"Senzan"});
   var entry=resolve(p);
   return entry?{lineId:"Senzan",trainNumber:entry.trainNumber,
      model:entry.illustrationModel,pngPath:entry.illustrationPng,
      source:"senzan-2611-planned-fleet-only",planned:true,
      representative:true,actualVehicleConfirmed:false}:null;
  }
 }));
}
})(window);
