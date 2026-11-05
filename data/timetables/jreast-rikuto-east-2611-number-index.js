/* JR East November 2026 (2611) 陸羽東線 published train numbers.
 * Source:
 * https://timetables.jreast.co.jp/2611/timetable-v/268u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/268u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/268d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/268d2.html
 * The Naruko-Onsen–Shinjo railway is still CLOSED as of Nov 2026:
 * https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=riku-eastline
 * This is NUMBER / SERVICE admission, not actual-day rolling-stock ID.
 */
(function(root){
  "use strict";
  var normalInbound=Object.freeze([
    "5720D","1720D","5722D","1722D","1724D","5724D",
    "5726D","1726D","1728D","4730D","1732D","4734D",
    "5728D","1736D","5730D","1738D","5732D","1740D",
    "5734D","1742D","1744D","1746D"
  ]);
  var normalOutbound=Object.freeze([
    "5721D","1721D","5723D","1723D","2725D","5725D",
    "4725D","1727D","4729D","1731D","4733D","5727D",
    "1735D","5729D","1737D","5731D","1739D","5733D",
    "1741D","1743D","1745D","1747D","5735D"
  ]);
  var up=new Set(normalInbound),down=new Set(normalOutbound);
  // Omoide Yukemuri 1–6, JR East official 2611 運転日.
  // Nov 2 is separately permitted despite using a holiday SQL template:
  // the official line sheet explicitly lists Oct 31–Nov 3.
  var rapidDown=new Set(["9721D","9723D","9725D"]);
  var rapidUp=new Set(["9722D","9724D","9726D"]);
  var specialDates=Object.freeze(["2026-11-01","2026-11-02",
    "2026-11-03","2026-11-07","2026-11-08",
    "2026-11-14","2026-11-15","2026-11-21",
    "2026-11-22","2026-11-23","2026-11-28","2026-11-29"]);
  var specialDays=new Set(specialDates);
  var sourceRailway="odpt.Railway:JR-East.RikutoEast";
  // Valid, source-backed rail segment only; replacement buses are NOT
  // vehicle positions. Used to reject old whole-line SQL route projections.
  var closedBeyond="Naruko-Onsen";
  function verify(number,railway,direction,trainType,calendar,date){
    var day=String(date||"");
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    if(String(railway||"")!==sourceRailway)return false;
    var dir=String(direction||"").split(/[.:]/).pop();
    if(dir!=="Inbound"&&dir!=="Outbound")return false;
    var cal=String(calendar||"").split(/[.:]/).pop();
    var weekday=cal==="Weekday"||cal==="weekday";
    var holiday=["SaturdayHoliday","Saturday","Holiday",
      "Sunday","holiday"].indexOf(cal)>=0;
    if(!weekday&&!holiday)return false;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var holidayDate=dow===0||dow===6||
      day==="2026-11-03"||day==="2026-11-23";
    var numberKey=String(number||"").trim().toUpperCase();
    var type=String(trainType||"").split(/[.:]/).pop();
    var isRapid=(dir==="Inbound"?rapidUp:rapidDown).has(numberKey);
    if(isRapid){
      if(!specialDays.has(day)||
         // Nov 2 is a published special operated on an otherwise weekday.
         !(holiday||(day==="2026-11-02"&&weekday)))return false;
      if(!["Local","Rapid"].includes(type))return false;
      return Object.freeze({number:numberKey,kind:"rapid",
        trainType:"Rapid",model:"キハ110系",referenceOnly:true,
        serviceName:"おもいで湯けむり"+String(parseInt(numberKey.slice(0,-1),10)%10)+"号",
        holidayTemplateOnWeekday:day==="2026-11-02"});
    }
    if(holidayDate?!holiday:!weekday)return false;
    if(type!=="Local"||
       !(dir==="Inbound"?up:down).has(numberKey))return false;
    return Object.freeze({number:numberKey,kind:"regular",trainType:"Local",
      model:"キハ110系",referenceOnly:true,serviceName:"",
      holidayTemplateOnWeekday:false});
  }
  root.JREastRikutoEastNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:sourceRailway,
    normalInbound:normalInbound,normalOutbound:normalOutbound,
    rapidInbound:Object.freeze(Array.from(rapidUp)),
    rapidOutbound:Object.freeze(Array.from(rapidDown)),
    specialDates:specialDates,closedBeyond:closedBeyond,verify:verify
  });
})(window);
