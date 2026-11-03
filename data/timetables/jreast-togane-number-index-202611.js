/* JR East November 2026 TOGANE line exact published-number index.
 * Source NUMBER SET: Pixel Tetsudo Supabase 122 existing SQL templates.
 * 61 distinct train numbers were cross-checked against JR East 2611
 * public line tables on 2026-11-04. This contains no copied train times
 * and does NOT certify each stop clock or a physical vehicle assignment.
 *
 * https://timetables.jreast.co.jp/2611/timetable-v/216u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/216u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/216d1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/216d2.html
 *
 * Official optional date-adjusted columns for 1640M / 1656M /
 * 1639M concern Dec/Jan/Feb and are not November departures.
 * The documented Keiyo-through 5680Y and 5983Y are separate train
 * NUMBER identities, not a physical coupling or running-chain merge.
 */
(function(root){
  "use strict";
  var data={
  "weekday": {
    "Inbound": [
      "620M",
      "622M",
      "626M",
      "628M",
      "648M",
      "650M",
      "652M",
      "654M",
      "658M",
      "660M",
      "664M",
      "666M",
      "668M",
      "670M",
      "672M",
      "676M",
      "1624M",
      "1630M",
      "1632M",
      "1634M",
      "1636M",
      "1638M",
      "1640M",
      "1642M",
      "1644M",
      "1646M",
      "1656M",
      "1662M",
      "1674M",
      "5680Y"
    ],
    "Outbound": [
      "621M",
      "623M",
      "629M",
      "631M",
      "637M",
      "651M",
      "655M",
      "657M",
      "659M",
      "661M",
      "665M",
      "667M",
      "669M",
      "671M",
      "673M",
      "677M",
      "679M",
      "1625M",
      "1627M",
      "1633M",
      "1635M",
      "1639M",
      "1641M",
      "1643M",
      "1645M",
      "1647M",
      "1649M",
      "1653M",
      "1663M",
      "1675M",
      "5983Y"
    ]
  },
  "holiday": {
    "Inbound": [
      "620M",
      "622M",
      "626M",
      "628M",
      "648M",
      "650M",
      "652M",
      "654M",
      "658M",
      "660M",
      "664M",
      "666M",
      "668M",
      "670M",
      "672M",
      "676M",
      "1624M",
      "1630M",
      "1632M",
      "1634M",
      "1636M",
      "1638M",
      "1640M",
      "1642M",
      "1644M",
      "1646M",
      "1656M",
      "1662M",
      "1674M",
      "5680Y"
    ],
    "Outbound": [
      "621M",
      "623M",
      "629M",
      "631M",
      "637M",
      "651M",
      "655M",
      "657M",
      "659M",
      "661M",
      "665M",
      "667M",
      "669M",
      "671M",
      "673M",
      "677M",
      "679M",
      "1625M",
      "1627M",
      "1633M",
      "1635M",
      "1639M",
      "1641M",
      "1643M",
      "1645M",
      "1647M",
      "1649M",
      "1653M",
      "1663M",
      "1675M",
      "5983Y"
    ]
  }
};
  var exact=Object.create(null);
  Object.keys(data).forEach(function(day) {
    Object.keys(data[day]).forEach(function(dir) {
      data[day][dir].forEach(function(number) {
        exact[day+"|"+dir+"|"+number]=true;
      });
    });
  });
  function verify(number,railway,direction,trainType,calendar,serviceDate){
    var date=String(serviceDate||"").slice(0,10);
    if(date<"2026-11-01"||date>"2026-11-30")return null;
    if(String(railway||"")!=="odpt.Railway:JR-East.Togane")return false;
    if(String(trainType||"").split(/[.:]/).pop()!=="Local")return false;
    var day=String(calendar||"");
    day=/(?:^|[.:])Weekday$/.test(day)?"weekday":
      /(?:^|[.:])(?:SaturdayHoliday|Saturday|Holiday|Sunday)$/.test(day)
        ?"holiday":(day==="weekday"||day==="holiday"?day:"");
    var dir=String(direction||"").split(/[.:]/).pop();
    if(!day||(dir!=="Inbound"&&dir!=="Outbound"))return false;
    return exact[day+"|"+dir+"|"+String(number||"").trim().toUpperCase()]===true;
  }
  root.JREastToganeNumberIndex202611=Object.freeze({
    version:"20261104-togane-exact-v1",
    publishedUniqueNumbers:61,
    storedCalendarTemplates:122,
    verify:verify
  });
})(window);
