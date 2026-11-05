/* JR East 中央本線 2026-11 2611 official published train-number columns.
 * This is a calendar/direction NUMBER index only, not a model/PNG map.
 * Do NOT infer individual operating days, carsets, or through chains.
 * Special/seasonal trains require the official 運転日 restriction separately.
 */
(function(root){
  "use strict";
  var columns=Object.freeze({
    weekday:Object.freeze({
      Inbound:Object.freeze(["1450M","640M","640T","648M","648T","520M","8170M","722M","722T","522M","726M","726H","524M","744M","744T","818M","818H","526M","320M","5102M","1452M","420M","2401M","528M","322M","422M","148M","5004M","5106M","324M","1403M","530M","1230M","5008M","424M","426M","1405M","150M","152M","5110M","9272M","1454M","326M","532M","428M","1520M","2201M","1522M","3520M","5012M","430M","203M","5114M","328M","1524M","534M","205M","5016M","1164M","1164T","432M","1456M","1407M","2230M","154M","330M","18M","3120M","1280M","1280T","434M","536M","1413M","22M","3124M","1314M","1314H","436M","1419M","2234M","26M","1474M","1474T","332M","3128M","1460M","438M","438M","334M","336M","1530M","1232M","156M","3424M","30M","1522M","1522H","3132M","2132M","1692M","1692T","538M","1532M","1421M","34M","3136M","2136M","338M","2625M","1628M","1628H","540M","8194M","2238M","38M","542M","3140M","3140M","440M","1423M","42M","1868M","1868T","44M","2144M","544M","340M","1534M","1425M","1234M","158M","342M","546M","1536M","46M","2627M","3148M","2148M","344M","1932M","1932T","548M","1429M","3526M","346M","550M","1538M","1519M","5050M","442M","3152M","2024M","2024T","2008M","2008H","444M","160M","348M","350M","1540M","1464M","352M","209M","354M","1542M","54M","356M","3156M","2152M","2152T","552M","3158M","446M","1431M","162M","1544M","2222M","2222H","2292M","2292T","358M","554M","211M","1236M","60M","448M","1433M","164M","556M","558M","1546M","360M","1548M","1531M","362M","364M","166M","8092M","450M","1539M","1550M"]),
      Outbound:Object.freeze(["1551M","1553M","8091M","1223M","1408M","151M","1227M","1410M","321M","421M","1412M","449T","1349M","2535M","1557M","323M","423M","153M","3523M","1229M","155M","1262M","325M","523T","1323M","327M","425M","1451M","2237M","427M","645M","3425M","329M","544M","429M","331M","1453M","1M","521M","431M","333M","1455M","8075M","5003M","2103M","523M","5M","1416M","335M","525M","1457M","9079M","157M","2241M","433M","3107M","2107M","527M","527M","9M","529M","435M","2622M","3111M","3111M","2111M","13M","1418M","531M","865T","865M","9083M","2243M","437M","3115M","2115M","533M","17M","535M","1081T","1081M","9085M","1559M","3119M","337M","1115H","1115M","21M","159M","1231M","339M","1561M","1420M","1233M","8193M","3123M","341M","1175T","1175M","25M","1563M","1568M","439M","1461M","3127M","343M","1223H","1223M","1393T","1393M","29M","1570M","441M","3131M","345M","161M","347M","33M","1424M","1565M","537M","1429H","1429M","9093M","5135M","349M","37M","1567M","163M","1426M","443M","1428M","445M","539M","1569T","1569M","5139M","351M","5041M","165M","1432M","353M","1571M","541M","5143M","355M","357M","543M","1633T","1633M","5045M","1573M","210M","167M","447M","545M","1725T","1725M","5147M","359M","361M","1709H","1709M","5049M","1235M","1434M","1575M","449M","1825H","1825M","2626M","5151M","363M","547M","1853T","1853M","5053M","1436M","169M","365M","1917H","1917M","1577M","1923H","1923M","9273M","1993T","1993M","1993M","8199M","367M","2628M","5055M","549M","551M","553M","5157M","555M","1465M","5159M","1467M","2339T","2339M"])
    }),
    holiday:Object.freeze({
      Inbound:Object.freeze(["1450M","640M","640T","648M","648T","520M","724M","724T","2631M","522M","726M","726H","524M","760M","760T","818M","818H","526M","320M","5102M","1452M","420M","2401M","528M","322M","422M","148M","5004M","5106M","324M","1403M","530M","1230M","5008M","424M","426M","1405M","150M","152M","5110M","2635M","1454M","326M","532M","428M","1520M","2201M","1522M","3520M","5012M","430M","203M","5114M","328M","1524M","534M","205M","5016M","1118M","1118H","432M","1456M","1407M","2230M","154M","330M","18M","3120M","1324M","1324T","434M","536M","9580D","1413M","22M","3124M","1302M","1302H","436M","1419M","2234M","26M","1472M","1472T","332M","3128M","1460M","438M","438M","334M","336M","1530M","1232M","156M","3424M","30M","1556M","1556T","3132M","3132M","2132M","1648M","1648T","9021M","538M","1532M","1421M","34M","3136M","3136M","2136M","338M","8074M","9576M","9339M","2637M","1626M","1626H","540M","540M","9188M","9076M","2238M","38M","542M","3140M","3140M","440M","1423M","42M","2639M","9078M","9178M","1818M","1818H","44M","2144M","544M","1534M","1425M","1234M","158M","9082M","342M","546M","1536M","1536M","9352M","46M","3148M","3148M","2148M","1928M","1928T","548M","1429M","3526M","8084M","346M","550M","1538M","1519M","5050M","442M","9086M","3152M","2052M","2052T","2026M","2026H","444M","160M","348M","350M","1540M","1464M","352M","209M","354M","1542M","54M","356M","3156M","2166M","2166T","552M","3158M","446M","1431M","162M","1544M","9088M","2218M","2218H","2290M","2290T","358M","554M","211M","1236M","60M","448M","1433M","164M","556M","558M","1546M","360M","1548M","1531M","362M","364M","166M","450M","1539M","1550M"]),
      Outbound:Object.freeze(["1551M","1553M","1223M","1408M","151M","1227M","1410M","321M","421M","1412M","449T","1249M","2535M","1557M","323M","423M","153M","3523M","1229M","155M","1262M","325M","525T","1325M","327M","425M","1451M","9189M","2237M","427M","661T","661M","3425M","3425M","3425M","329M","544M","9071M","429M","429M","331M","1453M","1M","1M","521M","431M","333M","1455M","8075M","5003M","2103M","523M","9336M","9577M","5M","1416M","335M","8077M","525M","1457M","8079M","157M","2241M","433M","3107M","3107M","2107M","527M","9M","529M","435M","9081M","9181M","2632M","9351M","3111M","3111M","2111M","13M","1418M","531M","9022M","919H","919M","9083M","9083M","8083M","2243M","437M","3115M","3115M","2115M","533M","17M","535M","1025T","1025M","9085M","1559M","3119M","337M","1103H","1103M","21M","159M","1231M","9089M","9089M","1561M","1561M","339M","339M","1420M","1233M","9581D","3123M","341M","1173T","1173M","25M","1563M","1568M","439M","1461M","3127M","343M","1257T","1257M","1349T","1349M","29M","1570M","441M","3131M","161M","347M","33M","1424M","1565M","537M","1427H","1427M","9093M","5135M","349M","37M","1567M","163M","1426M","443M","1428M","445M","539M","1519H","1519M","5139M","351M","5041M","165M","1432M","353M","1571M","541M","5143M","355M","357M","543M","1629T","1629M","5045M","1573M","210M","167M","447M","545M","1753T","1753M","5147M","359M","361M","1727H","1727M","2638M","5049M","1235M","1434M","1575M","449M","1825H","1825M","5151M","363M","547M","1867T","1867M","5053M","1436M","169M","365M","1917H","1917M","1577M","1919H","1919M","2640M","1991T","1991M","367M","5055M","549M","551M","553M","5157M","555M","1465M","5159M","1467M","2339T","2339M"])
    }),
  });
  var sources=Object.freeze({
    "weekday.Inbound":"https://timetables.jreast.co.jp/2611/timetable-v/223u1.html",
    "holiday.Inbound":"https://timetables.jreast.co.jp/2611/timetable-v/223u2.html",
    "weekday.Outbound":"https://timetables.jreast.co.jp/2611/timetable-v/223d1.html",
    "holiday.Outbound":"https://timetables.jreast.co.jp/2611/timetable-v/223d2.html",
  });
  var lookup={};
  ['weekday','holiday'].forEach(function(cal){
    lookup[cal]={};
    ['Inbound','Outbound'].forEach(function(dir){lookup[cal][dir]=new Set(columns[cal][dir]);});
  });
  function normalizeCalendar(value){
    var raw=String(value||'').trim();
    if(/(?:^|[.:])Weekday$|^weekday$/i.test(raw))return 'weekday';
    if(/(?:^|[.:])(?:SaturdayHoliday|Saturday|Sunday|Holiday)$|^holiday$/i.test(raw))return 'holiday';
    return '';
  }
  function normalizeDirection(value){
    var raw=String(value||'').replace(/^.*[.:]/,'');
    return raw==='Inbound'||raw==='Outbound'?raw:'';
  }
  function has(number,calendar,direction){
    var c=normalizeCalendar(calendar),d=normalizeDirection(direction);
    return !!(lookup[c]&&lookup[c][d]&&lookup[c][d].has(String(number||'').trim().toUpperCase()));
  }
  function match(p){
    if(!p||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(String(p.serviceDate||'')))return null;
    var line=String(p.positionLineId||p.lineId||'');
    if(line!=='ChuoMain'||(p.displayLineId&&p.displayLineId!=='ChuoMain'))return null;
    var src=String(p.sourceRailway||'');
    if(src&&src!=='odpt.Railway:JR-East.Chuo'&&src!=='odpt.Railway:JR-East.ChuoMain')return null;
    var op=String(p.trainOperator||p.operator||'');
    if(op&&op!=='JR-East'&&op!=='odpt.Operator:JR-East')return null;
    var cal=normalizeCalendar(p.calendarType||p.serviceId||p.calendar);
    var dir=normalizeDirection(p.railDirection||p.direction);
    var number=String(p.trainNumber||'').trim().toUpperCase();
    if(!has(number,cal,dir))return null;
    return {edition:'2611',lineId:'ChuoMain',trainNumber:number,calendarType:cal,
      railDirection:dir,officialSourceUrl:sources[cal+'.'+dir],
      publishedNumberOnly:true,operatingDateVerified:false,
      actualVehicleConfirmed:false,authorizesPNG:false};
  }
  root.JREastChuoMainNumbers2611=Object.freeze({
    version:'20261105-official-four-way-number-v1',edition:'2611',
    columns:columns,sources:sources,has:has,match:match
  });
})(window);
