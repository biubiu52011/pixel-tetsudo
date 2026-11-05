/* JR East 2611 official Ishinomaki train NUMBER admission, not physical vehicle ID.
 * Source (weekday and Saturday/holiday, up and down):
 * https://timetables.jreast.co.jp/2611/timetable-v/266u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/266u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/266d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/266d2.html
 * Old SQL imports retain 9631D/9634D, which are absent from 2611, and
 * label the 5530D/5543D HB-E210 through trains as KiHa110. Neither may
 * be silently used as current-day vehicle or timetable evidence.
 */
(function(root){
  "use strict";
  var inboundRegular=Object.freeze([
    "5620D","2622D","5624D","1626D","1628D","2926D","1630D",
    "1632D","2930D","1634D","1636D","1638D","1640D","1642D",
    "1644D","2936D","1646D","2938D","640D","1648D"
  ]);
  var outboundRegular=Object.freeze([
    "1623D","1625D","5627D","1629D","1631D","2927D","1633D",
    "1635D","1637D","1639D","2931D","1643D","1645D","1647D",
    "2937D","1649D","5651D"
  ]);
  var inbound=new Set(inboundRegular),outbound=new Set(outboundRegular);
  var seasonalDays=Object.freeze(["2026-11-21","2026-11-22","2026-11-23"]);
  var sources=Object.freeze({
    weekdayInbound:"https://timetables.jreast.co.jp/2611/timetable-v/266u1.html",
    holidayInbound:"https://timetables.jreast.co.jp/2611/timetable-v/266u2.html",
    weekdayOutbound:"https://timetables.jreast.co.jp/2611/timetable-v/266d1.html",
    holidayOutbound:"https://timetables.jreast.co.jp/2611/timetable-v/266d2.html"
  });
  function verify(number,railway,direction,trainType,calendar,date){
    // null = another edition; do not apply the November whitelist to it.
    var day=String(date||"");
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    if(String(railway||"")!=="odpt.Railway:JR-East.Ishinomaki")return false;
    var dir=String(direction||"").split(/[.:]/).pop();
    var cal=String(calendar||"").split(/[.:]/).pop();
    var weekday=cal==="Weekday"||cal==="weekday";
    var holiday=["SaturdayHoliday","Saturday","Sunday","Holiday","holiday"].indexOf(cal)>=0;
    if(!weekday&&!holiday)return false;
    if(dir!=="Inbound"&&dir!=="Outbound")return false;
    var numberKey=String(number||"").trim().toUpperCase();
    var source=sources[(weekday?"weekday":"holiday")+dir];
    var type=String(trainType||"").split(/[.:]/).pop();
    if(type && type!=="Local" && type!=="Rapid")return false;
    // The 2611 sheets also list Satono 9524D/9621D for Dec-Feb.
    // Windy Onagawa Seapal 9621D/9624D alone runs November 21-23.
    if((numberKey==="9624D"&&dir==="Inbound"||
        numberKey==="9621D"&&dir==="Outbound")&&
       holiday&&seasonalDays.indexOf(day)>=0){
      return Object.freeze({number:numberKey,trainType:"Rapid",
        serviceName:"快速 風っこ女川シーパル号",kind:"seasonal",
        model:"",referenceOnly:true,officialSourceUrl:source});
    }
    if(numberKey==="5530D"&&dir==="Inbound"||
       numberKey==="5543D"&&dir==="Outbound"){
      return Object.freeze({number:numberKey,trainType:"Rapid",
        kind:"through",model:"HB-E210系",referenceOnly:true,
        serviceName:"",officialSourceUrl:source});
    }
    if((dir==="Inbound"?inbound:outbound).has(numberKey)){
      return Object.freeze({number:numberKey,trainType:"Local",
        kind:"regular",model:"キハ110系",referenceOnly:true,
        serviceName:"",officialSourceUrl:source});
    }
    return false;
  }
  root.JREastIshinomakiNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:"odpt.Railway:JR-East.Ishinomaki",
    inboundRegular:inboundRegular,outboundRegular:outboundRegular,
    seasonalDays:seasonalDays,verify:verify
  });
})(window);
