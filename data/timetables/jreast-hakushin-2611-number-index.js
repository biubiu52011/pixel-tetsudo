/* JR East 白新線 (Niigata–Shibata) / 2026-11 (2611).
 * Exact published train service numbers, not operation/car identifiers.
 *
 * https://timetables.jreast.co.jp/2611/timetable-v/255u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/255u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/255d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/255d2.html
 * https://timetables.jreast.co.jp/2611/train/060/064201.html (8853D)
 * https://timetables.jreast.co.jp/2611/train/110/112621.html (8055M Dec only)
 * https://timetables.jreast.co.jp/2611/train/125/128421.html (9083M Dec only)
 * https://www.jreast.co.jp/train/local/e129.html
 * https://www.jreast.co.jp/train/express/inaho_shirayuki.html
 *
 * Source SQL contains 102 train numbers; ONLY 99 represent a 2611
 * November Hakushin train on its correct date. Historical SQL falsely
 * assigns E129 to Inaho/Kairi. Never turn number into physical car ID.
 */
(function(root){
  "use strict";
  var localInbound=Object.freeze([
    "1620M","1622M","1630M","1632M","1636M","1646M","1648M",
    "1660M","1664M","1666M","1676M","1680M","1682M",
    "1924M","1926M","1928M","1932M","1946M",
    "628M","634M","638M","640M","642M","644M",
    "650M","652M","654M","656M","658M","662M",
    "668M","670M","672M","674M","678M",
    "920M","922M","930M","934M","936M","938M",
    "940M","942M","944M","948M","950M"
  ]);
  var localOutbound=Object.freeze([
    "1621M","1629M","1637M","1643M","1647M","1649M",
    "1661M","1663M","1671M","1675M","1679M",
    "1925M","1937M","1941M","1951M",
    "623M","631M","633M","635M","639M","641M","645M",
    "651M","653M","655M","657M","659M","665M",
    "667M","669M","673M","677M","681M",
    "923M","927M","929M","931M","933M","935M",
    "939M","943M","945M","947M","949M"
  ]);
  var inbound=new Set(localInbound);
  var outbound=new Set(localOutbound);
  var rapid="3921M";
  // JR East 2611: both directions, exact service numbers (not formation IDs).
  var regularInahoOutbound=new Set(["1M","3M","5M","7M","9M","11M","13M"]);
  var regularInahoInbound=new Set(["2M","4M","6M","8M","10M","12M","14M"]);
  var kairiOutbound="8853D",kairiInbound="8854D";
  // Published November resort: Nov 1/3 and Fri/Sat/Holidays up to
  // Nov 22, then Nov 27/28/29. Nov 23 does NOT run.
  var kairiDays=Object.freeze([
    "2026-11-01","2026-11-03",
    "2026-11-06","2026-11-07","2026-11-08",
    "2026-11-13","2026-11-14","2026-11-15",
    "2026-11-20","2026-11-21","2026-11-22",
    "2026-11-27","2026-11-28","2026-11-29"
  ]);
  var kairiDaySet=new Set(kairiDays);
  var excludedLegacy=Object.freeze(["8055M","9083M","9883D"]);
  var railway="odpt.Railway:JR-East.Hakushin";
  var route=Object.freeze(["Niigata","Higashi-Niigata","Oogata","Niizaki",
    "Hayado","Toyosaka","Kuroyama","Sasaki","Nishi-Shibata","Shibata"]);
  var map=Object.create(null);
  route.forEach(function(n,i){map[n]=i;});
  function rawStopName(row){
    return String(row&&(row["odpt:departureStation"]||
      row["odpt:arrivalStation"]||row.stationUrn||"")||"")
      .split(".").pop();
  }
  function routeAdmitted(rows,direction){
    if(!Array.isArray(rows)||rows.length<2)return false;
    var stops=rows.map(rawStopName);
    var first=stops[0],last=stops[stops.length-1];
    if(direction==="Outbound"){
      if(first!=="Niigata"||!(last==="Toyosaka"||last==="Shibata"))
        return false;
    }else{
      if(last!=="Niigata"||
         !(first==="Toyosaka"||first==="Shibata"))return false;
    }
    var previous=null;
    for(var i=0;i<stops.length;i++){
      var key=stops[i],index=map[key];
      if(index===undefined)return false;
      if(previous!==null &&
        (direction==="Outbound"?index<=previous:index>=previous))return false;
      previous=index;
    }
    return true;
  }
  // If rawStops is supplied, require the train to be projected only onto
  // the verified Hakushin segment; never import a neighbouring Uetsu train
  // or a legacy through route by snapping its end to Shibata.
  function verify(number,source,direction,trainType,calendar,date,rawStops){
    var day=String(date||"");
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    if(source!==railway)return false;
    var dir=String(direction||"").split(/[.:]/).pop();
    if(dir!=="Inbound"&&dir!=="Outbound")return false;
    var cal=String(calendar||"").split(/[.:]/).pop();
    var weekday=cal==="Weekday"||cal==="weekday";
    var holiday=["SaturdayHoliday","Holiday","Sunday","Saturday","holiday"].includes(cal);
    if(!weekday&&!holiday)return false;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var holidayDate=dow===0||dow===6||day==="2026-11-03"||day==="2026-11-23";
    if((holidayDate&&!holiday)||(!holidayDate&&!weekday))return false;
    var n=String(number||"").trim().toUpperCase(),kind="",model="",
      actualType="",serviceName="";
    var sourceType=String(trainType||"").split(/[.:]/).pop();
    if(dir==="Inbound"&&inbound.has(n)||
       dir==="Outbound"&&outbound.has(n)){
      kind="local";model="E129系";actualType="Local";
      if(sourceType!=="Local")return false;
    }else if(n===rapid&&dir==="Outbound"){
      kind="rapid";model="E129系";actualType="Rapid";
      if(sourceType!=="Rapid"&&sourceType!=="Local")return false;
    }else if((dir==="Outbound"&&regularInahoOutbound.has(n))||
             (dir==="Inbound"&&regularInahoInbound.has(n))){
      kind="inaho";model="E653系（いなほ）";
      actualType="LimitedExpress";
      serviceName="いなほ"+parseInt(n,10)+"号";
      // Historic SQL sometimes says Local: correct from official service
      // family without claiming a day-specific physical formation.
      if(sourceType!=="Local"&&sourceType!=="LimitedExpress")return false;
    }else if(((dir==="Outbound"&&n===kairiOutbound)||
               (dir==="Inbound"&&n===kairiInbound))&&kairiDaySet.has(day)){
      kind="kairi";model="HB-E300系（海里）";actualType="Rapid";
      serviceName="海里";
      if(sourceType!=="Local"&&sourceType!=="Rapid")return false;
    }else{
      // 8055M / 9083M are December-only; old 9883D isn't an
      // admitted 2611 Hakushin train. Do not show phantom positions.
      return false;
    }
    if(rawStops!==undefined&&!routeAdmitted(rawStops,dir))return false;
    return Object.freeze({number:n,kind:kind,trainType:actualType,
      model:model,serviceName:serviceName,referenceOnly:true,
      // Approved fleet PNGs are illustrations, not actual carset evidence.
      pngAvailable:true,
      destinationStation:n==="9M"?"Sakata":
        kind==="kairi"?(dir==="Outbound"?"Sakata":"Niigata"):"",
      actualVehicleConfirmed:false,edition:"2611"});
  }
  root.JREastHakushinNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:railway,
    localInbound:localInbound,localOutbound:localOutbound,
    rapidNumber:rapid,
    inahoNumbers:Object.freeze(Array.from(regularInahoOutbound)),
    inahoInboundNumbers:Object.freeze(Array.from(regularInahoInbound)),
    inahoAllNumbers:Object.freeze(Array.from(regularInahoOutbound).concat(Array.from(regularInahoInbound))),
    kairiNumber:kairiOutbound,kairiInboundNumber:kairiInbound,
    decemberKairiNumber:"8851D",kairiDays:kairiDays,excludedLegacy:excludedLegacy,
    verify:verify
  });
})(window);
