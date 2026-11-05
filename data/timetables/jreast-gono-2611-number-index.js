/* JR East 2611 (November 2026) official Gono plan-number admission.
 * Source: JR East 275u1/u2/d1/d2 and official Resort Shirakami
 * November 2026 service/livery calendar. Source-only train-number
 * evidence does not establish actual vehicle location or formation.
 * SQL old templates contain Ou Main continuation numbers labelled Gono;
 * keep them OFF the Gono SVG instead of making phantom Gono trains.
 */
(function(root){
  "use strict";
  var regularInbound=["122D","124D","320D","126D","128D","620D","322D","822D","3524D","3526D","224D","326D","2826D","2828D","130D","132D","134D","2830D","328D","832D","2834D","836D","838D"];
  var regularOutbound=["821D","2823D","825D","321D","623D","827D","123D","125D","2525D","2529D","127D","2531D","2533D","223D","2835D","837D","323D","2839D","131D","325D","133D","225D","135D","137D"];
  var rapidRegular=["3524D","3526D"];
  var resort={"8521D":{"route":1,"dir":"Outbound"},"8522D":{"route":2,"dir":"Inbound"},"8523D":{"route":3,"dir":"Outbound","days":[1,2,3,4,5,6,7,8,9,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]},"8524D":{"route":4,"dir":"Inbound"},"8525D":{"route":5,"dir":"Outbound"},"8526D":{"route":6,"dir":"Inbound","days":[1,2,3,4,5,6,7,8,9,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]}};
  var liveryByService={"1":{"buna":[14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],"aoi":[1,2,3,4,5,6,7,8,9],"kumagera":[10,11,12,13]},"2":{"buna":[1,2,3,4,5,6,7,8,9,10,11,12,13],"aoi":[14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],"kumagera":[]},"3":{"buna":[],"aoi":[],"kumagera":[1,2,3,4,5,6,7,8,9,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]},"4":{"buna":[14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],"aoi":[1,2,3,4,5,6,7,8,9],"kumagera":[10,11,12,13]},"5":{"buna":[1,2,3,4,5,6,7,8,9,10,11,12],"aoi":[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],"kumagera":[]},"6":{"buna":[],"aoi":[],"kumagera":[1,2,3,4,5,6,7,8,9,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]}};
  var regularIn=Object.create(null),regularOut=Object.create(null);
  regularInbound.forEach(function(n){regularIn[n]=true;});
  regularOutbound.forEach(function(n){regularOut[n]=true;});
  function verify(number,railway,direction,trainType,calendar,date){
    // null means different edition, not officially audited here.
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(String(date||"")))return null;
    if(railway!=="odpt.Railway:JR-East.Gono")return false;
    var day=Number(String(date).slice(-2));
    var cal=String(calendar||"").split(/[.:]/).pop();
    if(["Weekday","SaturdayHoliday","Saturday","Sunday","Holiday"].indexOf(cal)<0)return false;
    var dir=String(direction||"").split(/[.:]/).pop();
    var n=String(number||"").trim().toUpperCase();
    // Validate the source calendar/physical timetable direction, never
    // guess a destination from number parity alone.
    var inbound=dir==="Inbound",outbound=dir==="Outbound";
    if(!inbound&&!outbound)return false;
    var isRegular=inbound?!!regularIn[n]:!!regularOut[n];
    if(isRegular) {
      var typ=rapidRegular.indexOf(n)>=0?"Rapid":"Local";
      return Object.freeze({number:n,kind:"regular",trainType:typ,
        model:"GV-E400系",referenceOnly:true,serviceName:""});
    }
    // Six in-line Gono sections of Resort Shirakami 1-6.
    // The 862xD/863xD numbers belong to Ou Main continuation sections
    // (some have only one Gono boundary station). No extra Gono train.
    var r=resort[n];
    if(!r||(inbound?"Inbound":"Outbound")!==r.dir)return false;
    if(r.days&&r.days.indexOf(day)<0)return false;
    var plan=liveryByService[r.route];
    var livery=Object.keys(plan).filter(function(name){
      return plan[name].indexOf(day)>=0;
    })[0]||"";
    if(!livery)return false;
    return Object.freeze({number:n,kind:"resort",trainType:"Rapid",
      model:"",livery:livery,referenceOnly:true,
      serviceName:"リゾートしらかみ"+r.route+"号",resortNumber:r.route});
  }
  root.JREastGonoNumberIndex202611=Object.freeze({
    edition:"2026-11",railway:"odpt.Railway:JR-East.Gono",
    regularInbound:Object.freeze(regularInbound),
    regularOutbound:Object.freeze(regularOutbound),
    resortSegmentNumbers:Object.freeze(Object.keys(resort)),
    verify:verify
  });
})(window);
