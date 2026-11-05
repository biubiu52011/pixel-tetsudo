/* JR East 2026-11 (2611) Iiyama: official public D train numbers.
 * Source: https://timetables.jreast.co.jp/2611/timetable-v/229u1.html
 *         https://timetables.jreast.co.jp/2611/timetable-v/229u2.html
 *         https://timetables.jreast.co.jp/2611/timetable-v/229d1.html
 *         https://timetables.jreast.co.jp/2611/timetable-v/229d2.html
 * OyKot 2026 dates: https://www.jreast.co.jp/railway/joyful/oykot.html
 * Number and fleet illustration only; NEVER a confirmed physical set.
 */
(function(root){
  "use strict";
  var normalUp=Object.freeze([
    "1120D","1122D","120D","122D","124D","126D",
    "128D","130D","132D","134D","136D","138D","140D",
    "142D","144D","146D","150D","162D","164D",
    "166D","170D","172D","182D","186D","188D",
    "190D","192D","194D","196D","198D"
  ]);
  var normalDown=Object.freeze([
    "1121D","1123D","123D","125D","127D","129D",
    "131D","133D","135D","137D","139D","141D",
    "143D","145D","147D","149D","151D","163D",
    "175D","181D","185D","187D","189D","193D"
  ]);
  var up=new Set(normalUp),down=new Set(normalDown);
  var oykotDays=Object.freeze([
    "2026-11-01","2026-11-02","2026-11-03",
    "2026-11-07","2026-11-08","2026-11-14","2026-11-15",
    "2026-11-21","2026-11-22","2026-11-23",
    "2026-11-28","2026-11-29"
  ]);
  var shuKuraDays=Object.freeze([
    "2026-11-20","2026-11-21","2026-11-27",
    "2026-11-28","2026-11-29"
  ]);
  var oykot=new Set(oykotDays),shukura=new Set(shuKuraDays);
  var railwayUrn="odpt.Railway:JR-East.Iiyama";
  function verify(number,railway,direction,trainType,calendar,date){
    var day=String(date||"");
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    if(String(railway||"")!==railwayUrn)return false;
    var dir=String(direction||"").split(/[.:]/).pop();
    if(dir!=="Inbound"&&dir!=="Outbound")return false;
    var cal=String(calendar||"").split(/[.:]/).pop();
    var weekday=cal==="weekday"||cal==="Weekday";
    var holiday=["holiday","SaturdayHoliday","Saturday","Sunday","Holiday"].includes(cal);
    if(!weekday&&!holiday)return false;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var holidayDate=dow===0||dow===6||
      day==="2026-11-03"||day==="2026-11-23";
    var n=String(number||"").trim().toUpperCase();
    var type=String(trainType||"").split(/[.:]/).pop();
    var special=false,serviceName="",model="キハ110系",kind="regular";
    if((n==="8140D"&&dir==="Inbound")||
       (n==="8141D"&&dir==="Outbound")){
      if(!oykot.has(day)||type!=="Rapid")return false;
      special=true;kind="oykot";serviceName="おいこっと";
      model="キハ110系（おいこっと）";
    }else if((n==="8124D"&&dir==="Inbound")||
             (n==="8133D"&&dir==="Outbound")){
      if(!shukura.has(day)||type!=="Rapid")return false;
      special=true;kind="shukura";serviceName="越乃Shu＊Kura";
      model="キハ40・48形（越乃Shu＊Kura）";
    }else{
      if(!(dir==="Inbound"?up:down).has(n)||type!=="Local")return false;
    }
    // Nov 2 Oykot is officially operating despite being a Monday.
    // Historical source SQL has both calendar categories, so admit the
    // sole exception but keep normal weekday/holiday checks strict.
    var specialHolidayTemplateOnWeekday=special&&kind==="oykot"&&
      day==="2026-11-02"&&holiday;
    if(holidayDate?!holiday:!weekday){
      if(!specialHolidayTemplateOnWeekday)return false;
    }
    return Object.freeze({number:n,kind:kind,trainType:special?"Rapid":"Local",
      model:model,serviceName:serviceName,edition:"2611",
      referenceOnly:true,actualVehicleConfirmed:false,
      pngAvailable:!special,
      holidayTemplateOnWeekday:specialHolidayTemplateOnWeekday});
  }
  root.JREastIiyamaNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:railwayUrn,
    normalInbound:normalUp,normalOutbound:normalDown,
    oykotDays:oykotDays,shuKuraDays:shuKuraDays,
    verify:verify
  });
})(window);
