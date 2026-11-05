/* JR East 2026-11 (2611) 男鹿線: exact official M train numbers.
 * https://timetables.jreast.co.jp/2611/timetable-v/259u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/259u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/259d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/259d2.html
 * EV-E801 line stock: https://www.jreast.co.jp/train/local/ev_e801.html
 * Not the operation number or actual physical car ID.
 */
(function(root){
  "use strict";
  var inbound=Object.freeze([
    "1120M","1122M","1124M","1126M","1128M","1130M","1132M",
    "1134M","1136M","1138M","1140M","1142M","1144M","1146M","1148M"
  ]);
  var outbound=Object.freeze([
    "1123M","1125M","1127M","1129M","1131M","1133M","1135M",
    "1137M","1139M","1141M","1143M","1145M","1147M","1149M"
  ]);
  var inboundSet=new Set(inbound),outboundSet=new Set(outbound);
  var cancelledNov5=new Set([
    "1130M","1132M","1134M","1131M","1133M","1135M"
  ]);
  function verify(number,railway,direction,trainType,calendar,date){
    var day=String(date||"");
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    if(String(railway||"")!=="odpt.Railway:JR-East.Oga")return false;
    var d=String(direction||"").split(/[.:]/).pop();
    var cal=String(calendar||"").split(/[.:]/).pop();
    if(["Weekday","SaturdayHoliday","Saturday","Sunday","Holiday",
       "weekday","holiday"].indexOf(cal)<0)return false;
    // Source calendar must agree with the actual JR East operating date.
    // November 3 (Culture Day) and 23 (Labor Thanksgiving Day) are
    // holidays even when they fall on a weekday.
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var holiday=dow===0||dow===6||day==="2026-11-03"||day==="2026-11-23";
    if((cal==="Weekday"||cal==="weekday")===holiday)return false;
    var typ=String(trainType||"").split(/[.:]/).pop();
    if(typ!=="Local")return false;
    var num=String(number||"").trim().toUpperCase();
    if(!(d==="Inbound"?inboundSet:d==="Outbound"?outboundSet:new Set()).has(num))
      return false;
    // November 5 cancellation applies to the *six exact services*,
    // not every inbound or outbound Oga train.
    if(day==="2026-11-05"&&cancelledNov5.has(num))return false;
    return Object.freeze({number:num,trainType:"Local",
      model:"EV-E801系",kind:"regular",referenceOnly:true});
  }
  root.JREastOgaNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:"odpt.Railway:JR-East.Oga",
    inbound:inbound,outbound:outbound,verify:verify
  });
})(window);
