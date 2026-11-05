/* 陸羽西線 JR East 2026-11 (2611) public train NUMBER roster.
 * Not an operating code, trainset ID or real-time physical position.
 * https://timetables.jreast.co.jp/2611/timetable-v/256u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/256u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/256d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/256d2.html
 * Rail service resumed Jan 16 2026, 18 trains daily:
 * https://media.jreast.co.jp/articles/5555
 * KiHa110 reference model, NOT actual dated vehicle formation.
 */
(function(root){
  "use strict";
  var inbound=Object.freeze(["150D","152D","154D","156D",
    "3132D","158D","160D","162D","164D"]);
  var outbound=Object.freeze(["151D","153D","155D","157D",
    "159D","161D","163D","165D","3131D"]);
  var source="odpt.Railway:JR-East.RikutsuWest";
  var up=new Set(inbound),down=new Set(outbound);
  function verify(number,railway,direction,trainType,calendar,date){
    var day=String(date||"");
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    if(String(railway||"")!==source)return false;
    var dir=String(direction||"").split(/[.:]/).pop();
    if(!["Inbound","Outbound"].includes(dir))return false;
    var cal=String(calendar||"").split(/[.:]/).pop();
    var weekday=["weekday","Weekday"].includes(cal);
    var holiday=["holiday","SaturdayHoliday","Saturday","Sunday","Holiday"].includes(cal);
    if(!weekday&&!holiday)return false;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var holidayDate=dow===0||dow===6||day==="2026-11-03"||day==="2026-11-23";
    if(holidayDate?!holiday:!weekday)return false;
    var n=String(number||"").trim().toUpperCase();
    if(!(dir==="Inbound"?up:down).has(n))return false;
    var rapid=n==="3131D"||n==="3132D";
    var type=String(trainType||"").split(/[.:]/).pop();
    if(!rapid&&type!=="Local")return false;
    // Old SQL mislabels Mogamigawa Rapid as Local. Only that exact 313xD
    // official trip is permitted to recover its published service class.
    if(rapid&&type!=="Local"&&type!=="Rapid")return false;
    return Object.freeze({number:n,kind:rapid?"rapid":"regular",
      trainType:rapid?"Rapid":"Local",
      model:"キハ110系",serviceName:rapid?"最上川":"",
      referenceOnly:true,actualVehicleConfirmed:false});
  }
  root.JREastRikutsuWestNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:source,inbound:inbound,outbound:outbound,
    verify:verify
  });
})(window);
