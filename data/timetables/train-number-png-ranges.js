/* Train NUMBER -> display PNG ranges (not operating-number conversion).
 * Match published trainNumber DIRECTLY per line. Saikyo/Rinkai K/F/S trains
 * use their final two numerical characters; Yokohama line K trains instead
 * use the entire published 3/4-digit train number. Sotetsu M, ChuoRapid T/H,
 * and other full-number rules retain their original whole-number semantics.
 * Ome / Itsukaichi lines additionally use suffixless three/four-digit train numbers;
 * these are public train numbers too, NOT vehicle identifiers.
 * Chuo corridor regular express M numbers use full numbers PLUS the published
 * train type (LimitedExpress) because ordinary services also carry M numbers.
 * Never convert any train number to an operation number.
 * Preserve the original full train number as its identity.
 * The model is a representative image, never a verified physical formation.
 *
 * Saikyo / Kawagoe / Rinkai numbering:
 * https://timetables.jreast.co.jp/2611/timetable-v/628u2.html
 * https://note.com/ototetsu/n/n06a26a06db68
 *
 * ChuoRapid 2026 weekday/weekend official train-number lists:
 * https://timetables.jreast.co.jp/2611/timetable-v/658u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/658u2.html
 * JR East E233-0 T/H stock: https://media.jreast.co.jp/articles/3342
 *
 * Chuo main regular Azusa/Kaiji/Fuji Excursion train numbers in Nov 2026:
 * https://timetables.jreast.co.jp/2611/timetable-v/223d2p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/223u2p.html
 * E353 stock: https://www.jreast.co.jp/train/express/azusa_kaiji.html
 *
 * Ome (incl. Ome-Okutama) and Itsukaichi published train numbers, Nov 2026:
 * https://timetables.jreast.co.jp/2611/timetable-v/652u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/652u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/652d1p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/652d2.html
 * JR East confirms E233-0 on suffixless 843/1103 and 1379T/721T:
 * https://media.jreast.co.jp/articles/2564
 * JR East confirms Itsukaichi 2149 on Saturday/holiday dep Haijima 21:57:
 * https://timetables.jreast.co.jp/2611/train/050/053471.html
 * E233 fleet operates on Itsukaichi per JR East:
 * https://www.jreast.co.jp/train/local/e233.html
 *
 * Yokohama line 2026 Nov weekday/holiday public K train numbers:
 * https://timetables.jreast.co.jp/2611/timetable-v/608d1p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/608d2.html
 * 2221K (Haigashi-Kanagawa 22:04 -> Hashimoto 22:49 holiday):
 * https://timetables.jreast.co.jp/2611/train/145/146521.html
 * JR East E233-6000 (Yokohama line):
 * https://media.jreast.co.jp/articles/1710
 */
(function(root){
  "use strict";
  // Exact JR Y/A to Tozai K/S ownership index, 2026-11 2611 edition.
  // Linked by calendar, Nakano/NishiFunabashi station and 0-8 minute
  // stop boundary in existing SQL. NOT a verified physical carset.
  // https://timetables.jreast.co.jp/2611/timetable-v/659d1p.html
  // https://timetables.jreast.co.jp/2611/timetable-v/659u1p.html
  // https://timetables.jreast.co.jp/2611/timetable-v/671u1.html
  var chuoSobuTozai2611=Object.freeze({"holiday_Eastbound_K":["1202Y","1402Y","1610Y","1702Y","610Y","702Y","706Y","902Y"],"holiday_Eastbound_S":["1016Y","1020Y","1028Y","1122Y","1142Y","1216Y","1320Y","1342Y","1422Y","1516Y","1520Y","1548Y","1622Y","1628Y","1642Y","1644Y","1716Y","1734Y","1736Y","1820Y","1842Y","1848Y","1922Y","716Y","728Y","738Y","820Y","826Y","840A","848Y","858Y","922Y","936Y","944Y"],"holiday_Westbound_K":["1003Y","1303Y","1503Y","1711Y","1803Y","1807Y","803Y","811Y"],"holiday_Westbound_S":["1023Y","1117Y","1121Y","1223Y","1243Y","1317Y","1421Y","1443Y","1523Y","1529Y","1545Y","1617Y","1621Y","1635Y","1637Y","1723Y","1743Y","1749Y","617Y","621Y","627Y","629Y","639Y","723Y","737Y","741Y","749Y","759Y","817Y","845Y","921Y","929Y","943Y","949Y"],"weekday_Eastbound_K":["1602Y","1604Y","1608Y","1710Y","1802Y","1806Y","1904Y","1910Y","506A","602A","604Y","608A","610Y","910Y"],"weekday_Eastbound_S":["1012Y","1068Y","1090Y","1158Y","1180Y","1218Y","1270Y","1368Y","1380Y","1458Y","1470Y","1518Y","1548Y","1568Y","1614A","1622Y","1654Y","1656A","1680Y","1684Y","1712Y","1728A","1738A","1744Y","1764Y","1766Y","1768A","1770A","1774Y","1794A","1818Y","1820Y","1824Y","1848A","1850Y","1860A","1862A","1880A","1882A","1888Y","1914A","1916Y","1932Y","1966Y","2036Y","2082Y","2126Y","2160Y","2170Y","622Y","636A","640Y","644Y","654Y","684A","688Y","718A","728Y","730Y","734Y","764Y","790Y","792A","838Y","842Y","846Y","874A","876Y","878Y","932Y","944Y","958Y","970Y","984Y","988Y","996Y"],"weekday_Westbound_K":["1611Y","1705Y","1809Y","1811Y","1903A","1907A","2005Y","2009Y","2111Y","711A","809A","903Y","905Y"],"weekday_Westbound_S":["1059Y","1071Y","1119Y","1169Y","1259Y","1281Y","1319Y","1371Y","1469Y","1481Y","1513Y","1515Y","1539Y","1555A","1557Y","1567Y","1585Y","1595A","1623Y","1645Y","1665A","1671Y","1675Y","1689Y","1717A","1719Y","1721A","1725Y","1733Y","1749Y","1751Y","1761Y","1781Y","1815A","1829A","1837Y","1839Y","1855Y","1863Y","1867Y","1869Y","1927A","1971Y","1983Y","2061A","485Y","519Y","537Y","591Y","593Y","629Y","631A","639A","641Y","645Y","647Y","665Y","675Y","723Y","733Y","743Y","755Y","759Y","777Y","779Y","785Y","789Y","797A","813A","835A","845Y","849A","871Y","891Y","969Y","981Y"]});
  var rows=[
    // Fujikyu 2611 SQL: both weekday and SaturdayHoliday publish the
    // ordinary local number set 1-52. Use the mapped standard 6000-series
    // artwork as the representative PNG for this complete number range.
    {lineIds:["Fujikyu"],numberFormat:"bare",from:1,to:52,suffixes:"",
      publishedNumbers:["1","2","3","4","5","6","7","8","9","10",
        "11","12","13","14","15","16","17","18","19","20",
        "21","22","23","24","25","26","27","28","29","30",
        "31","32","33","34","35","36","37","38","39","40",
        "41","42","43","44","45","46","47","48","49","50",
        "51","52"],
      weekdayNumbers:["1","2","3","4","5","6","7","8","9","10",
        "11","12","13","14","15","16","17","18","19","20",
        "21","22","23","24","25","26","27","28","29","30",
        "31","32","33","34","35","36","37","38","39","40",
        "41","42","43","44","45","46","47","48","49","50",
        "51","52"],
      holidayNumbers:["1","2","3","4","5","6","7","8","9","10",
        "11","12","13","14","15","16","17","18","19","20",
        "21","22","23","24","25","26","27","28","29","30",
        "31","32","33","34","35","36","37","38","39","40",
        "41","42","43","44","45","46","47","48","49","50",
        "51","52"],
      // ODPT/railway_data uses the canonical operator ID
      // FujisanrokuElectricRailway; Fujikyu is the line ID, not the operator.
      operator:"FujisanrokuElectricRailway",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:FujisanrokuElectricRailway.Fujikyu"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      requireCompatiblePlan:true,referenceOnly:true,illustrative:true,
      model:"富士急行6000系（標準色）",
      pngPath:"../images/列车/富士急行/富士急行_6000系_標準色.png"},
    // 富士急行 2611 SQL: the imported special-service labels contain the
    // published number followed by the service name (for example
    // "701 フジサン特急 1号").  Normalize that label only for this exact
    // source railway; it is still a public service number, never a car ID.
    // The 8000-series face-A image is a stable representative reference.
    // It does not select face A/B, a formation number, or today's actual car.
    {lineIds:["Fujikyu"],numberFormat:"bare",from:701,to:794,suffixes:"",
      publishedNumbers:["701","702","703","704","705","793","794"],
      weekdayNumbers:["701","702","704","705","793","794"],
      holidayNumbers:["701","702","703","704"],
      operator:"FujisanrokuElectricRailway",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:FujisanrokuElectricRailway.Fujikyu"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      requireCompatiblePlan:true,referenceOnly:true,illustrative:true,
      model:"富士急行8000系（フジサン特急・顔A）",
      pngPath:"../images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png"},
    // Fujikyu 2611: 1455M/1456M are the only M-numbered Fujikyu
    // records that have a same-calendar, same-direction ChuoMain SQL
    // counterpart. The ChuoMain number family is labelled
    // 211系 / E233系0番台; use the existing E233 representative only as
    // a through-service plan reference. Do not widen this to the other
    // M-number collisions in the TokyoGTFS package, which have no
    // corresponding ChuoMain evidence.
    {lineIds:["Fujikyu"],numberFormat:"full",from:1455,to:1456,
      suffixes:"M",trainType:"Local",publishedNumbers:["1455M","1456M"],
      weekdayNumbers:["1455M","1456M"],holidayNumbers:["1455M","1456M"],
      directionNumberParity:"inbound-even",
      sourceRailways:["odpt.Railway:FujisanrokuElectricRailway.Fujikyu"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      referenceOnly:true,illustrative:true,
      model:"E233系0番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_0番台.png"},
    // 白新線 2611: 90 numbered E129 locals + 3921M rapid, 14 regular
    // Inaho E653 services, and November 8853D/8854D HB-E300 Kairi.
    // These images represent series/service, NEVER an actual-day carset.
    // https://timetables.jreast.co.jp/2611/timetable-v/255u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/255d1.html
    {lineIds:["Hakushin"],numberFormat:"full",from:623,to:1951,
      suffixes:"M",trainTypes:["Local"],
      numberIndex:"jreast-hakushin-2611",hakushinKind:"local",
      publishedNumbers:[
        "1620M","1622M","1630M","1632M","1636M","1646M","1648M",
        "1660M","1664M","1666M","1676M","1680M","1682M",
        "1924M","1926M","1928M","1932M","1946M",
        "628M","634M","638M","640M","642M","644M",
        "650M","652M","654M","656M","658M","662M",
        "668M","670M","672M","674M","678M",
        "920M","922M","930M","934M","936M","938M",
        "940M","942M","944M","948M","950M",
        "1621M","1629M","1637M","1643M","1647M","1649M",
        "1661M","1663M","1671M","1675M","1679M",
        "1925M","1937M","1941M","1951M",
        "623M","631M","633M","635M","639M","641M","645M",
        "651M","653M","655M","657M","659M","665M",
        "667M","669M","673M","677M","681M",
        "923M","927M","929M","931M","933M","935M",
        "939M","943M","945M","947M","949M"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Hakushin"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E129系"],requiredCandidateModelPrefix:"E129系",
      rejectAmbiguousPlan:true,model:"E129系",
      pngPath:"../images/列车/JR東日本/JR東日本_E129系.png"},
    {lineIds:["Hakushin"],numberFormat:"full",from:3921,to:3921,
      suffixes:"M",trainTypes:["Rapid"],
      numberIndex:"jreast-hakushin-2611",hakushinKind:"rapid",
      publishedNumbers:["3921M"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Hakushin"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E129系"],requiredCandidateModelPrefix:"E129系",
      rejectAmbiguousPlan:true,model:"E129系",
      pngPath:"../images/列车/JR東日本/JR東日本_E129系.png"},
    {lineIds:["Hakushin"],numberFormat:"full",from:1,to:14,
      suffixes:"M",trainTypes:["LimitedExpress"],
      numberIndex:"jreast-hakushin-2611",hakushinKind:"inaho",
      publishedNumbers:["1M","2M","3M","4M","5M","6M","7M",
        "8M","9M","10M","11M","12M","13M","14M"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Hakushin"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E653系（いなほ）"],
      requiredCandidateModelPrefix:"E653系（いなほ）",
      rejectAmbiguousPlan:true,model:"E653系（いなほ）",
      pngPath:"../images/列车/JR東日本/JR東日本_E653系（いなほ）.png"},
    {lineIds:["Hakushin"],numberFormat:"full",from:8853,to:8854,
      suffixes:"D",trainTypes:["Rapid"],
      numberIndex:"jreast-hakushin-2611",hakushinKind:"kairi",
      publishedNumbers:["8853D","8854D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Hakushin"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      operatingDates:["2026-11-01","2026-11-03","2026-11-06","2026-11-07",
        "2026-11-08","2026-11-13","2026-11-14","2026-11-15",
        "2026-11-20","2026-11-21","2026-11-22",
        "2026-11-27","2026-11-28","2026-11-29"],
      allowedModelLabels:["HB-E300系（海里）"],
      requiredCandidateModelPrefix:"HB-E300系（海里）",
      rejectAmbiguousPlan:true,model:"HB-E300系（海里）",
      pngPath:"../images/列车/JR東日本/JR東日本_HB-E300系_海里.png"},
    // 北上線: 2611 historical SQL can only project FIVE vetted local
    // numbers on Kitakami–Hotto-Yuda; Hotto-Yuda–Yokote is BUS-ONLY.
    // 9729D/9730D Hinabi Kinshuko ran only Oct 24–25, not Nov.
    // https://timetables.jreast.co.jp/2611/timetable-v/251d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/251d2.html
    {lineIds:["Kitakami"],numberFormat:"full",from:722,to:736,
      suffixes:"D",trainTypes:["Local"],
      numberIndex:"jreast-kitakami-2611",
      publishedNumbers:["722D","724D","736D","725D","735D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Kitakami"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],
      requiredCandidateModelPrefix:"キハ110系",rejectAmbiguousPlan:true,
      model:"キハ110系",
      pngPath:"../images/列车/JR東日本/JR東日本_キハ110系.png"},
    // 山田線: 2611 autumn partial trains only; NEVER bus numbers 1–24,
    // nor 633D/640D/642D through rail, 363xD Rias before Dec 4,
    // nor Jan 2027 Hinabi / Pokemon services 9635D/9638D/9640D.
    // https://timetables.jreast.co.jp/2611/timetable-v/980u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/980d1.html
    {lineIds:["Yamada"],numberFormat:"full",from:631,to:9642,
      suffixes:"D",trainTypes:["Local"],
      numberIndex:"jreast-yamada-2611",
      publishedNumbers:["2632D","2634D","2636D","2638D","9636D",
        "9642D","9631D","2633D","2635D","9637D","9639D","2639D",
        "2641D","632D","644D","646D","631D","9633D","641D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Yamada"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],
      requiredCandidateModelPrefix:"キハ110系",rejectAmbiguousPlan:true,
      model:"キハ110系",
      pngPath:"../images/列车/JR東日本/JR東日本_キハ110系.png"},
    // 飯山線 2611: 54 all-day ordinary KiHa110 D numbers, not
    // 8124D/8133D Shu＊Kura or 8140D/8141D Oykot specialist liveries.
    // https://timetables.jreast.co.jp/2611/timetable-v/229u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/229d1.html
    {lineIds:["Iiyama"],numberFormat:"full",from:120,to:1123,
      suffixes:"D",trainTypes:["Local"],
      numberIndex:"jreast-iiyama-2611",
      publishedNumbers:["1120D","1122D","120D","122D","124D",
        "126D","128D","130D","132D","134D","136D",
        "138D","140D","142D","144D","146D","150D",
        "162D","164D","166D","170D","172D","182D",
        "186D","188D","190D","192D","194D","196D",
        "198D","1121D","1123D","123D","125D","127D",
        "129D","131D","133D","135D","137D","139D",
        "141D","143D","145D","147D","149D","151D",
        "163D","175D","181D","185D","187D","189D","193D"],
      directionNumberParity:"inbound-even",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Iiyama"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],
      requiredCandidateModelPrefix:"キハ110系",rejectAmbiguousPlan:true,
      model:"キハ110系",
      pngPath:"../images/列车/JR東日本/JR東日本_キハ110系.png"},

    // 陸羽西線 2611: 16 ordinary KiHa110 D numbers; two true 313xD
    // Mogamigawa Rapid numbers (SQL incorrectly marks them Local).
    // Exclude historical holiday 9166D; not on 2611 public roster.
    // https://timetables.jreast.co.jp/2611/timetable-v/256u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/256u2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/256d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/256d2.html
    {lineIds:["RikutsuWest"],numberFormat:"full",from:150,to:165,
      suffixes:"D",trainTypes:["Local"],
      numberIndex:"jreast-rikutsu-west-2611",rikutsuKind:"regular",
      publishedNumbers:["150D","152D","154D","156D","158D","160D",
        "162D","164D","151D","153D","155D","157D","159D","161D",
        "163D","165D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.RikutsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],requiredCandidateModelPrefix:"キハ110系",
      rejectAmbiguousPlan:true,
      model:"キハ110系",
      pngPath:"../images/列车/JR東日本/JR東日本_キハ110系.png"},
    {lineIds:["RikutsuWest"],numberFormat:"full",from:3131,to:3132,
      suffixes:"D",trainTypes:["Rapid"],
      numberIndex:"jreast-rikutsu-west-2611",rikutsuKind:"rapid",
      publishedNumbers:["3131D","3132D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.RikutsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],requiredCandidateModelPrefix:"キハ110系",
      rejectAmbiguousPlan:true,
      model:"キハ110系",
      pngPath:"../images/列车/JR東日本/JR東日本_キハ110系.png"},

    // 陸羽東線 2611: only the 45 ordinary official D services and six
    // 9721–9726D "おもいで湯けむり" scheduled rapids, NOT 9727/9728D
    // nor arbitrary KiHa110 D-series on nearby railways.
    // https://timetables.jreast.co.jp/2611/timetable-v/268u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/268u2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/268d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/268d2.html
    {lineIds:["RikutoEast"],numberFormat:"full",from:1720,to:5735,
      suffixes:"D",trainTypes:["Local"],
      numberIndex:"jreast-rikuto-east-2611",rikutoKind:"regular",
      publishedNumbers:["5720D","1720D","5722D","1722D","1724D",
        "5724D","5726D","1726D","1728D","4730D","1732D",
        "4734D","5728D","1736D","5730D","1738D","5732D",
        "1740D","5734D","1742D","1744D","1746D","5721D",
        "1721D","5723D","1723D","2725D","5725D","4725D",
        "1727D","4729D","1731D","4733D","5727D","1735D",
        "5729D","1737D","5731D","1739D","5733D","1741D",
        "1743D","1745D","1747D","5735D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.RikutoEast"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],requiredCandidateModelPrefix:"キハ110系",
      rejectAmbiguousPlan:true,
      model:"キハ110系",
      pngPath:"../images/列车/JR東日本/JR東日本_キハ110系.png"},
    // 9721–9726D are named Rapid trains; SQL legacy type was Local.
    // Indexed using OFFICIAL name/calendar and independent 2026-10
    // KiHa110 working reports, not a claim of confirmed Nov formation.
    // https://timetables.jreast.co.jp/2611/train/185/189081.html
    // https://railf.jp/news/2026/04/28/000000.html
    {lineIds:["RikutoEast"],numberFormat:"full",from:9721,to:9726,
      suffixes:"D",trainTypes:["Rapid"],
      numberIndex:"jreast-rikuto-east-2611",rikutoKind:"rapid",
      publishedNumbers:["9721D","9722D","9723D","9724D","9725D","9726D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.RikutoEast"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],requiredCandidateModelPrefix:"キハ110系",
      rejectAmbiguousPlan:true,
      model:"キハ110系",
      pngPath:"../images/列车/JR東日本/JR東日本_キハ110系_おもいで車両.png"},
    // JR East 2026-11 Kururi, Karasuyama, Hachinohe official 2611
    // train-number lists. No integer interval authorization: exact lists
    // plus the separate index verify named-train dates & cancellations.
    // https://www.jreast.co.jp/train/local/kiha_e130.html
    // https://www.jreast.co.jp/train/local/ev_e301.html
    // Kururi 217u1/u2/d1/d2: 40 regular Local.
    {lineIds:["Kururi"],numberFormat:"full",
      from:920,to:2952,suffixes:"D",
      trainTypes:["Local"],numberIndex:"jreast-regional-2611",
      regionalKind:"regular",publishedNumbers:["920D","922D","924D","926D","928D","930D","932D","934D","936D","938D","940D","942D","2944D","944D","2946D","946D","948D","950D","2952D","952D","921D","923D","925D","927D","929D","931D","933D","935D","937D","939D","941D","2941D","943D","2943D","945D","947D","949D","2949D","951D","953D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Kururi"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハE130形100番台","キハE130系100番台"],
      requiredCandidateModelPrefix:"キハE130形100番台",rejectAmbiguousPlan:true,
      model:"キハE130形100番台",
      pngPath:"../images/列车/JR東日本/JR東日本_キハE130系100番台.png"},
    // Karasuyama 242u1/u2/d1/d2: 27 regular Local.
    {lineIds:["Karasuyama"],numberFormat:"full",
      from:321,to:347,suffixes:"M",
      trainTypes:["Local"],numberIndex:"jreast-regional-2611",
      regionalKind:"regular",publishedNumbers:["322M","324M","326M","328M","330M","332M","334M","336M","338M","340M","342M","344M","346M","321M","323M","325M","327M","329M","331M","333M","335M","337M","339M","341M","343M","345M","347M"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Karasuyama"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["EV-E301系","EV-E301系（ACCUM）"],
      requiredCandidateModelPrefix:"EV-E301系",rejectAmbiguousPlan:true,
      model:"EV-E301系",
      pngPath:"../images/列车/JR東日本/JR東日本_EV-E301系.png"},
    // Hachinohe 277u1/u2/d1/d2: 41 regular Local.
    {lineIds:["Hachinohe"],numberFormat:"full",
      from:424,to:1463,suffixes:"D",
      trainTypes:["Local"],numberIndex:"jreast-regional-2611",
      regionalKind:"regular",publishedNumbers:["1422D","424D","426D","1428D","1430D","432D","1434D","436D","1438D","1440D","442D","1444D","446D","1448D","1450D","1452D","454D","1456D","458D","1460D","462D","425D","1427D","429D","1431D","1433D","435D","1437D","1439D","441D","1443D","445D","1447D","449D","1451D","1453D","1455D","457D","1459D","461D","1463D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Hachinohe"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハE130形500番台","キハE130系500番台"],
      requiredCandidateModelPrefix:"キハE130形500番台",rejectAmbiguousPlan:true,
      model:"キハE130形500番台",
      pngPath:"../images/列车/JR東日本/JR東日本_キハE130系500番台.png"},
    // Hachinohe 277u1/d1: 2 special Local.
    {lineIds:["Hachinohe"],numberFormat:"full",
      from:9445,to:9446,suffixes:"D",
      trainTypes:["Local"],numberIndex:"jreast-regional-2611",
      regionalKind:"special",publishedNumbers:["9445D","9446D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Hachinohe"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハE130形500番台","キハE130系500番台"],
      requiredCandidateModelPrefix:"キハE130形500番台",rejectAmbiguousPlan:true,
      model:"キハE130形500番台",
      pngPath:"../images/列车/JR東日本/JR東日本_キハE130系500番台.png"},
    // Hachinohe 277d2: 1 special Rapid.
    {lineIds:["Hachinohe"],numberFormat:"full",
      from:8471,to:8471,suffixes:"D",
      trainTypes:["Rapid"],numberIndex:"jreast-regional-2611",
      regionalKind:"special",publishedNumbers:["8471D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Hachinohe"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハE130形500番台","キハE130系500番台"],
      requiredCandidateModelPrefix:"キハE130形500番台",rejectAmbiguousPlan:true,
      model:"キハE130形500番台",
      pngPath:"../images/列车/JR東日本/JR東日本_キハE130系500番台.png"},

    // 男鹿線 2611: 29 distinct all-day Local M numbers (15 up, 14 down).
    // December/February excursion D numbers are deliberately excluded.
    // 1130M/1132M/1134M and 1131M/1133M/1135M cancel on 2026-11-05.
    // https://timetables.jreast.co.jp/2611/timetable-v/259u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/259u2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/259d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/259d2.html
    // https://www.jreast.co.jp/train/local/ev_e801.html
    {lineIds:["Oga"],numberFormat:"full",from:1120,to:1149,
      suffixes:"M",trainType:"Local",trainTypes:["Local"],
      numberIndex:"jreast-oga-2611",
      publishedNumbers:["1120M","1122M","1124M","1126M","1128M",
        "1130M","1132M","1134M","1136M","1138M","1140M","1142M",
        "1144M","1146M","1148M","1123M","1125M","1127M","1129M",
        "1131M","1133M","1135M","1137M","1139M","1141M","1143M",
        "1145M","1147M","1149M"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Oga"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["EV-E801系","EV-E801系（ACCUM）"],
      requiredCandidateModelPrefix:"EV-E801系",rejectAmbiguousPlan:true,
      model:"EV-E801系",
      pngPath:"../images/列车/JR東日本/JR東日本_EV-E801系.png"},

    // Ishinomaki 2611: original published D numbers, NOT a guessed
    // operating-code range. 20 inbound / 17 outbound ordinary services.
    // The JR-East KiHa100/110 line-stock source and number-by-number
    // independent working reference justify an illustrative KiHa110 PNG,
    // never a claim of the particular unit running today.
    // https://timetables.jreast.co.jp/2611/timetable-v/266u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/266u2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/266d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/266d2.html
    // https://www.jreast.co.jp/train/local/kiha110.html
    // https://w.atwiki.jp/train-boundfor/pages/92.html
    {lineIds:["Ishinomaki"],numberFormat:"full",
      from:640,to:5651,suffixes:"D",trainType:"Local",
      trainTypes:["Local"],numberIndex:"jreast-ishinomaki-2611",
      ishinomakiKind:"regular",
      publishedNumbers:["5620D","2622D","5624D","1626D","1628D",
        "2926D","1630D","1632D","2930D","1634D","1636D","1638D",
        "1640D","1642D","1644D","2936D","1646D","2938D","640D",
        "1648D","1623D","1625D","5627D","1629D","1631D","2927D",
        "1633D","1635D","1637D","1639D","2931D","1643D","1645D",
        "1647D","2937D","1649D","5651D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Ishinomaki"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],requiredCandidateModelPrefix:"キハ110系",
      rejectAmbiguousPlan:true,
      model:"キハ110系",
      pngPath:"../images/列车/JR東日本/JR東日本_キハ110系.png"},
    // 5530D and 5543D are Senseki-Tohoku HB-E210 through trains on the
    // Ishinomaki railway. The OLD SQL source incorrectly labels them
    // as KiHa110. Never apply the KiHa110 image to these rapid trains.
    // Official stock: https://www.jreast.co.jp/train/local/hb_e210.html
    // Cross-checked number/working: https://w.atwiki.jp/train-boundfor/pages/92.html
    {lineIds:["Ishinomaki"],numberFormat:"full",
      from:5530,to:5543,suffixes:"D",
      trainTypes:["Rapid"],numberIndex:"jreast-ishinomaki-2611",
      ishinomakiKind:"through",
      publishedNumbers:["5530D","5543D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Ishinomaki"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["HB-E210系"],requiredCandidateModelPrefix:"HB-E210系",
      rejectAmbiguousPlan:true,
      model:"HB-E210系",
      pngPath:"../images/列车/JR東日本/JR東日本_HB-E210系.png"},

    // JR East 2611 Banetsu East: 250u1/u2/d1/d2 list exactly 18
    // inbound and 17 outbound ALL-DAY Local D-numbered services.
    // JR East official KiHa100/110 stock page explicitly includes this
    // railway. SQL vehicle plans narrow THESE services to KiHa110.
    // This single official gallery image represents the MODEL/LINE,
    // not the formation or carset observed on the service date.
    // 9730D/9737D "Fukko Stove Iwaki" run Dec 2026 / Feb 2027 only
    // and are intentionally EXCLUDED in the November roster.
    // https://timetables.jreast.co.jp/2611/timetable-v/250u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/250u2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/250d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/250d2.html
    // https://www.jreast.co.jp/train/local/kiha110.html
    {lineIds:["BanetsuEast"],numberFormat:"full",
      from:720,to:1756,suffixes:"D",trainType:"Local",
      publishedNumbers:["720D","1752D","722D","724D","728D","730D","732D","734D","736D","1754D","738D","740D","1756D","742D","744D","746D","748D","750D","721D","723D","725D","727D","729D","1751D","731D","733D","735D","737D","741D","743D","745D","1753D","1755D","747D","749D"],
      weekdayNumbers:["720D","1752D","722D","724D","728D","730D","732D","734D","736D","1754D","738D","740D","1756D","742D","744D","746D","748D","750D","721D","723D","725D","727D","729D","1751D","731D","733D","735D","737D","741D","743D","745D","1753D","1755D","747D","749D"],
      holidayNumbers:["720D","1752D","722D","724D","728D","730D","732D","734D","736D","1754D","738D","740D","1756D","742D","744D","746D","748D","750D","721D","723D","725D","727D","729D","1751D","731D","733D","735D","737D","741D","743D","745D","1753D","1755D","747D","749D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.BanetsuEast"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],
      requiredCandidateModelPrefix:"キハ110系",
      rejectAmbiguousPlan:true,
      model:"キハ110系",
      pngPath:"../images/列车/JR東日本/JR東日本_キハ110系.png"},
    // Banetsu-West 2611: 261u1/u2 and 261d1/d2 JR East public
    // train-number columns; company official pages verify LINE STOCK.
    // https://timetables.jreast.co.jp/2611/timetable-v/261u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/261u2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/261d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/261d2.html
    // https://www.jreast.co.jp/train/local/e721.html
    // https://www.jreast.co.jp/train/local/gv_e400.html
    // https://www.jreast.co.jp/train/local/kiha110.html
    // Electrified Koriyama<->Aizuwakamatsu: 36 distinct regular M
    // numbers (22 Local + 14 Rapid), E721 according to JR East + the
    // 2026-06 train profile. Exactly scoped and counted, not generic M.
    // E721 regular 22 Local M
    {lineIds:["BanetsuWest"],numberFormat:"full",
      from:1221,to:2226,suffixes:"M",
      publishedNumbers:["1222M","1224M","1226M","1228M","1230M","1232M","1234M","1236M","1238M","1240M","2226M","1221M","1223M","1225M","1227M","1229M","1231M","1233M","1235M","1237M","1239M","2225M"],
      trainTypes:["Local"],
      
      
      
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.BanetsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E721系"],
      requiredCandidateModelPrefix:"E721系",
      model:"E721系",pngPath:"../images/列车/JR東日本/JR東日本_E721系_仙台地区.png"},
    // E721 regular 14 Rapid M (including Aizu 1-6)
    {lineIds:["BanetsuWest"],numberFormat:"full",
      from:3231,to:3244,suffixes:"M",
      publishedNumbers:["3232M","3234M","3236M","3238M","3240M","3242M","3244M","3231M","3233M","3235M","3237M","3239M","3241M","3243M"],
      trainTypes:["Rapid"],
      
      
      
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.BanetsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E721系"],
      requiredCandidateModelPrefix:"E721系",
      model:"E721系",pngPath:"../images/列车/JR東日本/JR東日本_E721系_仙台地区.png"},
    // Non-electrified Aizuwakamatsu<->Niitsu: 58 regular D numbers,
    // including 2229D Rapid. Officially a MIXED GV-E400/KiHa110 LINE.
    // Reference split uses independent per-number rolling-stock working
    // (2025-09), corroborated in 2026-03 timetable / 2026-11 reports.
    // Stock substitutions are possible; never mark actualCarConfirmed.
    // https://kitatetu-e233sai157.com/?p=61389
    // https://w.atwiki.jp/train-boundfor/pages/196.html
    // https://rail7.blogspot.com/2026/05/aizu-wakamatsu.html
    // 2026-11 peculiar "2225D" is suspended on Sundays and public
    // holidays; it DOES run on Saturdays, despite serviceId grouping
    // SaturdayHoliday together. It has a separate date membership rule.
    // GV-E400 normal Local D-number working reference (39)
    {lineIds:["BanetsuWest"],numberFormat:"full",
      from:220,to:4253,suffixes:"D",
      publishedNumbers:["220D","2224D","2226D","2228D","2230D","2232D","2236D","2238D","2240D","2242D","2244D","2246D","224D","2252D","230D","234D","236D","238D","240D","4252D","221D","2221D","2223D","2227D","2233D","2235D","2237D","2239D","2241D","2243D","2245D","2247D","2249D","227D","231D","233D","237D","241D","4253D"],
      trainTypes:["Local"],
      
      
      
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.BanetsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["GV-E400系"],
      requiredCandidateModelPrefix:"GV-E400系",
      model:"GV-E400系",pngPath:"../images/列车/JR東日本/JR東日本_GV-E400系.png"},
    // GV-E400 regular Rapid 2229D
    {lineIds:["BanetsuWest"],numberFormat:"full",
      from:2229,to:2229,suffixes:"D",
      publishedNumbers:["2229D"],
      trainTypes:["Rapid"],
      
      
      
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.BanetsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["GV-E400系"],
      requiredCandidateModelPrefix:"GV-E400系",
      model:"GV-E400系",pngPath:"../images/列车/JR東日本/JR東日本_GV-E400系.png"},
    // GV-E400 Rapid 2225D: weekdays/Saturdays only, Sunday/holidays OFF
    {lineIds:["BanetsuWest"],numberFormat:"full",
      from:2225,to:2225,suffixes:"D",
      publishedNumbers:["2225D"],
      trainTypes:["Rapid"],
      
      
      operatingDates:["2026-11-02","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-14","2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-20","2026-11-21","2026-11-24","2026-11-25","2026-11-26","2026-11-27","2026-11-28","2026-11-30"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.BanetsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["GV-E400系"],
      requiredCandidateModelPrefix:"GV-E400系",
      model:"GV-E400系",pngPath:"../images/列车/JR東日本/JR東日本_GV-E400系.png"},
    // KiHa110 normal Local D-number working reference (18)
    {lineIds:["BanetsuWest"],numberFormat:"full",
      from:222,to:4259,suffixes:"D",
      publishedNumbers:["4250D","222D","226D","228D","4254D","232D","4256D","2248D","2250D","223D","225D","4255D","229D","4257D","235D","239D","2251D","4259D"],
      trainTypes:["Local"],
      
      
      
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.BanetsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],
      requiredCandidateModelPrefix:"キハ110系",
      model:"キハ110系",pngPath:"../images/列车/JR東日本/JR東日本_キハ110系.png"},
    // Temporary services: the 2611 page displays other-month trains
    // as well. Never allow 9225D / 9226D (Jan 2027) or 9233 / 9226
    // Christmas 2026 in this November month. Each train below is
    // restricted to its OWN published November operating dates.
    // Akabeko is KiHa110 series 0 (JRE 2026 media), SL is C57 180,
    // DL is DE10 (JRE 2026 operating/vehicle article).
    // https://media.jreast.co.jp/articles/5814
    // https://www.toretabi.jp/railway_info/entry-25366.html
    // https://media.jreast.co.jp/articles/6564
    // https://www.jreast.co.jp/railway/joyful/c57.html
    // Limited Express Akabeko KiHa110 0-number model reference 9211D/9212D
    {lineIds:["BanetsuWest"],numberFormat:"full",
      from:9211,to:9212,suffixes:"D",
      publishedNumbers:["9211D","9212D"],
      trainTypes:["LimitedExpress"],
      
      
      operatingDates:["2026-11-01","2026-11-02","2026-11-03","2026-11-07","2026-11-08","2026-11-14","2026-11-15","2026-11-21","2026-11-22","2026-11-23","2026-11-28","2026-11-29"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.BanetsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["キハ110系"],
      
      model:"キハ110系",pngPath:"../images/列车/JR東日本/JR東日本_キハ110系.png"},
    // SL Banetsu Monogatari locomotive C57 180, NOT the passenger carset
    {lineIds:["BanetsuWest"],numberFormat:"bare",
      from:8226,to:8233,suffixes:"",
      publishedNumbers:["8226","8233"],
      trainTypes:["Rapid","SLRapid"],
      
      
      operatingDates:["2026-11-03","2026-11-07","2026-11-14","2026-11-21"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.BanetsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["C57形（SLばんえつ物語）"],
      
      model:"C57形（SLばんえつ物語）",pngPath:"../images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png"},
    // DL Banetsu Monogatari locomotive DE10, NOT the passenger carset
    {lineIds:["BanetsuWest"],numberFormat:"bare",
      from:9226,to:9233,suffixes:"",
      publishedNumbers:["9226","9233"],
      trainTypes:["Rapid","SLRapid"],
      
      
      operatingDates:["2026-11-01","2026-11-08","2026-11-15"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.BanetsuWest"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["DE10形（DLばんえつ物語）"],
      
      model:"DE10形（DLばんえつ物語）",pngPath:"../images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png"},
    // 2026-11 JR East 五能線 official 275u1/u2/d1/d2.
    // 47 full public-number regular D trains on the actual Gono railway
    // (45 locals, two fast ordinary 3524D/3526D). GV-E400 replaced
    // conventional local/rapid stock; EXCLUDE named Resort Shirakami
    // (852xD = HB-E300 青池/橅 or KiHa48 くまげら on dated diagrams).
    // Source 2021 JR East Akita press 20201218_a01.pdf plus GV-E400 page.
    // Do NOT reuse Gono data imported from Akita/Aomori Ou Main segments.
    // https://timetables.jreast.co.jp/2611/timetable-v/275u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/275u2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/275d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/275d2.html
    {lineIds:["Gono"],numberFormat:"full",from:122,to:2839,
      suffixes:"D",trainTypes:["Local"],numberIndex:"jreast-gono-2611",
      publishedNumbers:["122D","124D","320D","126D","128D","620D","322D","822D","224D","326D","2826D","2828D","130D","132D","134D","2830D","328D","832D","2834D","836D","838D","821D","2823D","825D","321D","623D","827D","123D","125D","2525D","2529D","127D","2531D","2533D","223D","2835D","837D","323D","2839D","131D","325D","133D","225D","135D","137D"],
      weekdayNumbers:["122D","124D","320D","126D","128D","620D","322D","822D","224D","326D","2826D","2828D","130D","132D","134D","2830D","328D","832D","2834D","836D","838D","821D","2823D","825D","321D","623D","827D","123D","125D","2525D","2529D","127D","2531D","2533D","223D","2835D","837D","323D","2839D","131D","325D","133D","225D","135D","137D"],
      holidayNumbers:["122D","124D","320D","126D","128D","620D","322D","822D","224D","326D","2826D","2828D","130D","132D","134D","2830D","328D","832D","2834D","836D","838D","821D","2823D","825D","321D","623D","827D","123D","125D","2525D","2529D","127D","2531D","2533D","223D","2835D","837D","323D","2839D","131D","325D","133D","225D","135D","137D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Gono"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["GV-E400系"],
      requiredCandidateModelPrefix:"GV-E400系",
      model:"GV-E400系",pngPath:"../images/列车/JR東日本/JR東日本_GV-E400系.png"},
    {lineIds:["Gono"],numberFormat:"full",from:3524,to:3526,
      suffixes:"D",trainTypes:["Rapid"],numberIndex:"jreast-gono-2611",
      publishedNumbers:["3524D","3526D"],
      weekdayNumbers:["3524D","3526D"],
      holidayNumbers:["3524D","3526D"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Gono"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["GV-E400系"],
      requiredCandidateModelPrefix:"GV-E400系",
      model:"GV-E400系",pngPath:"../images/列车/JR東日本/JR東日本_GV-E400系.png"},
    // JR-East 2026-11: published NUMBER families confirmed against the
    // 2611 line tables and a JR-East stock source; no formation inference.
    // Senseki E131-800 S-number trains, Aobadori-Ishinomaki ONLY.
    // Exclude 55xxD Senseki-Tohoku through (HB-E210, not E131).
    // https://media.jreast.co.jp/articles/5954
    // https://timetables.jreast.co.jp/2611/timetable-v/264d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/264u1.html
    {lineIds:["Senseki"],numberFormat:"full",from:400,to:2599,
      suffixes:"S",trainTypes:["Local"],operator:"JR-East",
      sourceOperatorFallback:true,sourceRailways:["odpt.Railway:JR-East.Senseki"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      publishedNumbers:["1031S","1032S","1042S","1044S","1061S","1062S","1063S","1064S","1065S","1081S","1083S","1121S","1122S","1131S","1132S","1133S","1161S","1162S","1163S","1164S","1165S","1166S","1182S","1184S","1221S","1222S","1231S","1232S","1234S","1261S","1263S","1264S","1266S","1281S","1331S","1332S","1333S","1361S","1362S","1364S","1381S","1382S","1421S","1422S","1431S","1432S","1434S","1461S","1462S","1481S","1482S","1521S","1522S","1531S","1532S","1541S","1572S","1581S","1584S","1621S","1622S","1631S","1632S","1641S","1642S","1643S","1644S","1645S","1672S","1682S","1721S","1722S","1731S","1732S","1741S","1742S","1743S","1744S","1745S","1746S","1747S","1748S","1749S","1772S","1821S","1822S","1831S","1832S","1841S","1842S","1843S","1844S","1845S","1846S","1847S","1848S","1921S","1922S","1932S","1941S","1942S","1943S","1945S","1946S","1947S","1948S","1949S","2021S","2022S","2031S","2041S","2043S","2044S","2045S","2046S","2048S","2050S","2121S","2132S","2141S","2142S","2143S","2144S","2145S","2146S","2221S","2222S","2241S","2242S","2243S","2341S","2342S","2343S","2441S","472S","521S","522S","533S","542S","544S","572S","621S","622S","624S","631S","632S","642S","643S","662S","721S","722S","732S","734S","741S","742S","743S","744S","745S","746S","748S","750S","752S","761S","781S","821S","822S","831S","841S","842S","843S","844S","845S","847S","861S","862S","863S","864S","882S","921S","922S","931S","932S","941S","942S","943S","944S","946S","961S","962S","963S","964S"],
      allowedModelLabels:["E131系800番台"],
      model:"E131系800番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E131系_800番台.png"},
    // JR East's 2026-03 statement keeps HB-E210 on Senseki-Tohoku Line.
    // Existing SQL incorrectly labels some of these D-numbered runs as E131.
    // Explicit number + type + source guard prevents that misclassification.
    // https://www.jreast.co.jp/press/2025/sendai/20251212_s01.pdf
    // https://timetables.jreast.co.jp/2611/timetable-v/264d1.html
    {lineIds:["Senseki"],numberFormat:"full",from:5500,to:5599,
      suffixes:"D",trainTypes:["Rapid","SpecialRapid"],
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Senseki"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      publishedNumbers:["5520D","5521D","5530D","5531D","5532D","5533D","5534D","5535D","5536D","5537D","5538D","5539D","5541D","5543D","5560D","5561D","5562D","5563D","5564D","5565D","5566D","5567D","5568D","5569D","5570D","5571D","5572D","5574D"],
      allowedModelLabels:["HB-E210系"],
      model:"HB-E210系",
      pngPath:"../images/列车/JR東日本/JR東日本_HB-E210系.png"},
    // Sagami all-day regular F numbers: E131-500/580 family. The E131-500
    // PNG is the REPRESENTATIVE image, not a confirmed G-formation.
    // https://www.jreast.co.jp/en/train/local/e131.html
    // https://timetables.jreast.co.jp/2611/timetable-v/103d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/103d2.html
    {lineIds:["Sagami"],numberFormat:"full",from:400,to:2599,
      suffixes:"F",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,sourceRailways:["odpt.Railway:JR-East.Sagami"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      publishedNumbers:["1061F","1063F","1065F","1068F","1071F","1074F","1076F","1078F","1079F","1160F","1162F","1164F","1169F","1171F","1175F","1177F","1261F","1262F","1263F","1265F","1270F","1275F","1276F","1278F","1279F","1363F","1365F","1368F","1371F","1374F","1376F","1377F","1378F","1379F","1460F","1462F","1464F","1469F","1470F","1475F","1477F","1479F","1561F","1562F","1563F","1565F","1568F","1570F","1571F","1576F","1578F","1662F","1663F","1664F","1667F","1668F","1669F","1671F","1674F","1677F","1678F","1679F","1760F","1762F","1763F","1764F","1766F","1769F","1770F","1773F","1775F","1776F","1778F","1779F","1861F","1863F","1865F","1866F","1868F","1871F","1872F","1874F","1876F","1960F","1962F","1964F","1967F","1969F","1970F","1973F","1975F","1977F","1978F","2061F","2063F","2066F","2068F","2070F","2072F","2073F","2075F","2076F","2160F","2167F","2168F","2171F","2172F","2174F","2266F","2270F","2273F","2275F","2361F","2367F","2372F","2374F","461F","467F","475F","561F","562F","564F","568F","571F","573F","574F","576F","577F","579F","660F","663F","664F","666F","669F","670F","672F","675F","679F","761F","765F","767F","768F","773F","774F","776F","778F","860F","862F","864F","866F","869F","871F","872F","874F","877F","879F","961F","962F","963F","964F","965F","969F","970F","975F","978F"],
      allowedModelLabels:["E131系500番台","E131系580番台"],
      model:"E131系500番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E131系_500番台.png"},
    // Echigo normal 120-1999M locally scheduled services: E129 reference.
    // 8xxx/9xxx dated extras are intentionally EXCLUDED pending vehicle proof.
    // https://www.jreast.co.jp/train/local/e129.html
    // https://timetables.jreast.co.jp/2611/timetable-v/232u1.html
    {lineIds:["Echigo"],numberFormat:"full",from:120,to:1999,
      suffixes:"M",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,sourceRailways:["odpt.Railway:JR-East.Echigo"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      publishedNumbers:["120M","121M","122M","123M","124M","125M","126M","127M","128M","129M","130M","131M","132M","133M","134M","135M","136M","137M","138M","139M","140M","141M","142M","143M","145M","146M","148M","149M","150M","151M","1521M","1522M","1523M","1524M","1525M","1526M","1527M","1528M","1529M","152M","1530M","1531M","1532M","1533M","1534M","1535M","1536M","1537M","1538M","1539M","153M","1540M","1541M","1542M","1543M","1544M","1545M","1546M","1547M","1548M","1549M","154M","1550M","1551M","1552M","1553M","1554M","1555M","1556M","1557M","1559M","155M","1561M","156M","157M","158M","159M","160M","161M","1620M","1621M","1622M","1629M","162M","1630M","1632M","1636M","1637M","163M","1643M","1646M","1647M","1648M","1649M","164M","165M","1660M","1661M","1663M","1664M","1666M","166M","1671M","1675M","1676M","1679M","167M","1680M","1682M","168M","169M","170M","172M","174M","1924M","1925M","1926M","1928M","1932M","1937M","1941M","1946M","1951M"],
      allowedModelLabels:["E129系"],
      model:"E129系",
      pngPath:"../images/列车/JR東日本/JR東日本_E129系.png"},
    // Senseki-Tohoku Railway source also contains 55xxD rapid trains.
    // Scope HB-E210 to those proven D workings ONLY; the same source
    // combines M/S-numbered conventional local services, which this rule
    // must NOT reclassify as an HB-E210 formation.
    // https://www.jreast.co.jp/train/local/hb_e210.html
    // https://timetables.jreast.co.jp/2611/timetable-v/264u1.html
    {lineIds:["SensekiTohoku"],numberFormat:"full",from:5500,to:5599,
      suffixes:"D",trainTypes:["Rapid","SpecialRapid"],operator:"JR-East",
      sourceOperatorFallback:true,sourceRailways:["odpt.Railway:JR-East.SensekiTohoku"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      publishedNumbers:["5520D","5521D","5530D","5531D","5532D","5533D","5534D","5535D","5536D","5537D","5538D","5539D","5541D","5543D","5560D","5561D","5562D","5563D","5564D","5565D","5566D","5567D","5568D","5569D","5570D","5571D","5572D","5574D"],
      allowedModelLabels:["HB-E210系"],
      model:"HB-E210系",
      pngPath:"../images/列车/JR東日本/JR東日本_HB-E210系.png"},
    // 2026-11 official JR Echigo exception trips 8132M and 8637M.
    // They are printed in the 2611 tables but operate only on the
    // explicitly published construction-day calendar; 9630M YAHIKO
    // excursion remains outside this generic E129 model rule.
    // https://timetables.jreast.co.jp/2611/timetable-v/232u2p.html
    // https://timetables.jreast.co.jp/2611/timetable-v/232d2.html
    {lineIds:["Echigo"],numberFormat:"full",from:8132,to:8637,
      suffixes:"M",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,sourceRailways:["odpt.Railway:JR-East.Echigo"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      operatingDates:["2026-11-04","2026-11-05","2026-11-06","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-20","2026-11-24","2026-11-25","2026-11-26","2026-11-27","2026-11-30"],
      publishedNumbers:["8132M","8637M"],
      allowedModelLabels:["E129系"],
      model:"E129系",
      pngPath:"../images/列车/JR東日本/JR東日本_E129系.png"},
    // JR East 2611 9630M: Yahiko Chrysanthemum Festival service
    // (ordinary extension, Shibata -> Yoshida -> Yahiko).
    // Only the nine dated November Saturday/holiday runs are published.
    // E129 is a sourced fleet reference, never observed physical carset.
    // https://timetables.jreast.co.jp/2611/train/185/188861.html
    // https://www.tetsudo.com/event/61170/
    {lineIds:["Echigo"],numberFormat:"full",from:9630,to:9630,
      suffixes:"M",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Echigo"],
      calendarType:"holiday",validFrom:"2026-11-01",validTo:"2026-11-30",
      publishedNumbers:["9630M"],
      operatingDates:["2026-11-01","2026-11-03","2026-11-07",
        "2026-11-08","2026-11-14","2026-11-15",
        "2026-11-21","2026-11-22","2026-11-23"],
      allowedModelLabels:["E129系"],
      model:"E129系",
      pngPath:"../images/列车/JR東日本/JR東日本_E129系.png"},
    // Takasaki/Joetsu local 211: exact published JR 2611 numbers also
    // checked against JR official Nov 2026 inbound/outbound weekday/holiday
    // 238u1/238u2/238d1/238d2 plus dated 211 working reports.
    // This is a gallery reference only; neither the number nor the
    // working report proves the physical formation on a later service day.
    // Do NOT include green-car 8xxM, E through-services, Y rapid trains,
    // or E257 3xxx/4xxx limited expresses as a 211 PNG by suffix.
    // https://timetables.jreast.co.jp/2611/timetable-v/238d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/238u1.html
    // https://takasaki-115.bbs.fc2.com/
    {lineIds:["Takasaki"],numberFormat:"full",from:420,to:758,
      suffixes:"M",trainType:"Local",operator:"JR-East",
      publishedNumbers:["420M","421M","422M","423M","424M","425M","426M","427M","428M","429M","430M","431M","432M","433M","434M","435M","436M","437M","438M","439M","440M","441M","442M","443M","444M","445M","446M","447M","448M","449M","450M","451M","452M","453M","454M","455M","456M","457M","458M","459M","460M","461M","462M","463M","464M","465M","466M","467M","468M","469M","470M","471M","472M","473M","474M","475M","476M","477M","478M","479M","480M","481M","483M","520M","521M","522M","523M","524M","525M","526M","527M","528M","529M","530M","531M","532M","533M","534M","535M","536M","537M","538M","539M","540M","541M","542M","543M","544M","545M","546M","547M","620M","621M","622M","624M","625M","626M","627M","628M","629M","630M","632M","633M","634M","635M","636M","637M","638M","639M","640M","641M","642M","643M","645M","647M","649M","651M","652M","653M","654M","655M","656M","657M","658M","659M","660M","661M","720M","721M","723M","724M","725M","726M","727M","728M","729M","730M","731M","732M","733M","734M","735M","736M","737M","738M","739M","740M","741M","742M","743M","744M","745M","746M","747M","748M","749M","750M","753M","754M","755M","756M","757M","758M"],
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Takasaki"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["211系（高崎地区）","211系"],
      rejectAmbiguousPlan:true,
      model:"211系（高崎地区）",
      pngPath:"../images/列车/JR東日本/JR東日本_211系_湘南色.png"},
    // 2026-11 JR East Agatsuma official 236u1/u2/d1/d2:
    // every weekday AND holiday 520-546 even (toward Shibukawa) and
    // 521-547 odd (toward Omae), 14 per direction. Explicit entire numbers
    // below: the range must never license unlisted services or E257 expresses.
    // JR East's own 211-series fleet page lists the Agatsuma Line.
    // This is an illustrated LINE STOCK, not proof of today's car number.
    // https://timetables.jreast.co.jp/2611/timetable-v/236u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/236u2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/236d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/236d2.html
    // https://www.jreast.co.jp/train/local/211.html
    {lineIds:["Agatsuma"],numberFormat:"full",from:520,to:547,
      suffixes:"M",trainType:"Local",
      publishedNumbers:["520M","522M","524M","526M","528M","530M","532M","534M","536M","538M","540M","542M","544M","546M","521M","523M","525M","527M","529M","531M","533M","535M","537M","539M","541M","543M","545M","547M"],
      weekdayNumbers:["520M","522M","524M","526M","528M","530M","532M","534M","536M","538M","540M","542M","544M","546M","521M","523M","525M","527M","529M","531M","533M","535M","537M","539M","541M","543M","545M","547M"],
      holidayNumbers:["520M","522M","524M","526M","528M","530M","532M","534M","536M","538M","540M","542M","544M","546M","521M","523M","525M","527M","529M","531M","533M","535M","537M","539M","541M","543M","545M","547M"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Agatsuma"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["211系（高崎地区）","211系"],
      requireCandidateOverlap:true,rejectAmbiguousPlan:true,
      model:"211系（高崎地区）",
      pngPath:"../images/列车/JR東日本/JR東日本_211系_湘南色.png"},
    // Regular Kusatsu-Shima 1-4 are all-day 3001-3004 (both calendars).
    // Official JR East named-train page confirms E257-5500;
    // the published NUMBER is different from an operating number.
    // https://www.jreast.co.jp/multi/zh-CHS/traininformation/kusatsu_shima/
    {lineIds:["Agatsuma"],numberFormat:"full",from:3001,to:3004,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:["3001M","3002M","3003M","3004M"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Agatsuma"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系5500番台"],
      model:"E257系5500番台",pngPath:"../images/列车/JR東日本/JR東日本_E257系_5500番台.png"},
    // 31 & 34 operate on Saturday/public holiday (4031 / 4034).
    {lineIds:["Agatsuma"],numberFormat:"full",from:4031,to:4034,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:["4031M","4034M"],calendarType:"holiday",
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Agatsuma"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系5500番台"],
      model:"E257系5500番台",pngPath:"../images/列车/JR東日本/JR東日本_E257系_5500番台.png"},
    // Official 2611 運転日 exceptions: 9071 / 9082 / 9083 run only
    // on the listed NOVEMBER dates, even though many other 9xxx columns
    // appear in the same published sheet for Dec 2026 - Feb 2027.
    {lineIds:["Agatsuma"],numberFormat:"full",from:9071,to:9071,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:["9071M"],calendarType:"weekday",
      operatingDates:["2026-11-12","2026-11-13","2026-11-19",
        "2026-11-20","2026-11-26","2026-11-27"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Agatsuma"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系5500番台"],
      model:"E257系5500番台",pngPath:"../images/列车/JR東日本/JR東日本_E257系_5500番台.png"},
    {lineIds:["Agatsuma"],numberFormat:"full",from:9082,to:9082,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:["9082M"],calendarType:"holiday",
      operatingDates:["2026-11-01","2026-11-08","2026-11-15",
        "2026-11-22","2026-11-23","2026-11-29"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Agatsuma"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系5500番台"],
      model:"E257系5500番台",pngPath:"../images/列车/JR東日本/JR東日本_E257系_5500番台.png"},
    {lineIds:["Agatsuma"],numberFormat:"full",from:9083,to:9083,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:["9083M"],calendarType:"holiday",
      operatingDates:["2026-11-07","2026-11-14","2026-11-21",
        "2026-11-22","2026-11-28"],
      directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Agatsuma"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系5500番台"],
      model:"E257系5500番台",pngPath:"../images/列车/JR東日本/JR東日本_E257系_5500番台.png"},
    // Official 2026-11 Takasaki / Joetsu / Agatsuma through expresses.
    // Regular Kusatsu-Shima 1-4 runs every day; 31 and 34 run only on
    // Saturdays and public holidays. Weekday Akagi 1-9 uses the same
    // E257-5500 model but belongs to a separately calendar-scoped set.
    // Match EXACT public numbers, Local/Rapid never inherit the model.
    // A model-reference PNG cannot identify an actual physical formation.
    // https://timetables.jreast.co.jp/2611/train/045/047101.html (3002M)
    // https://timetables.jreast.co.jp/2611/train/045/047081.html (3001M)
    // https://timetables.jreast.co.jp/2611/train/045/047091.html (3003M)
    // https://timetables.jreast.co.jp/2611/train/045/047111.html (3004M)
    // https://timetables.jreast.co.jp/2611/train/095/098841.html (4031M)
    // https://timetables.jreast.co.jp/2611/train/095/098851.html (4034M)
    // https://timetables.jreast.co.jp/2611/train/085/087691.html (4001M)
    // https://www.jreast.co.jp/multi/traininformation/kusatsu_shima/
    // https://www.jreast.co.jp/en/train/express/akagi.html
    {lineIds:["Takasaki"],numberFormat:"full",from:3001,to:3004,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:["3001M","3002M","3003M","3004M"],
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Takasaki"],
      directionNumberParity:"inbound-even",
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系5500番台"],
      model:"E257系5500番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E257系_5500番台.png"},
    {lineIds:["Takasaki"],numberFormat:"full",from:4031,to:4034,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:["4031M","4034M"],calendarType:"holiday",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Takasaki"],
      directionNumberParity:"inbound-even",
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系5500番台"],
      model:"E257系5500番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E257系_5500番台.png"},
    {lineIds:["Takasaki"],numberFormat:"full",from:4001,to:4009,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:["4001M","4002M","4003M","4004M","4005M",
        "4006M","4007M","4008M","4009M"],
      calendarType:"weekday",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Takasaki"],
      directionNumberParity:"inbound-even",
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系5500番台"],
      model:"E257系5500番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E257系_5500番台.png"},
    // JR East introduced E131-600 for Utsunomiya--Kuroiso
    // (including some Oyama extensions) and Nikko through service.
    // The complete source-number list comes from existing SQL stop
    // templates; official 2611 columns confirm these numbered services.
    // E131 is a reference model for these short regional services,
    // NOT the common E231/E233 sets on Ueno-Tokyo through trains.
    // Without published station clocks, this rule does NOT create a trip.
    // https://www.jreast.co.jp/press/2021/omiya/20211217_o01.pdf
    // https://timetables.jreast.co.jp/2611/timetable-v/239d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/239u1.html
    // https://tr-pf.net/ssline/unyou/20260314/um_form_dw.htm
    {lineIds:["UtsunomiyaJR"],numberFormat:"full",
      from:620,to:699,suffixes:"M",trainType:"Local",
      publishedNumbers:["620M","622M","623M","624M","625M","626M","627M","628M","629M","630M","632M","633M","634M","635M","636M","637M","638M","639M","640M","641M","642M","643M","644M","645M","646M","647M","648M","649M","650M","651M","652M","653M","654M","655M","656M","657M","658M","659M","660M","661M","662M","663M","664M","665M","666M","667M","668M","669M","670M","671M","672M","673M","674M","675M","676M","677M","678M","679M","680M","681M","682M","683M","684M","685M","686M","687M","688M","689M","690M","691M","692M","693M","694M","695M","696M","697M","698M","699M"],
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Utsunomiya"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E131系600番台","E131系"],
      rejectAmbiguousPlan:true,
      model:"E131系600番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E131系_600番台.png"},
    {lineIds:["UtsunomiyaJR"],numberFormat:"full",
      from:2823,to:2823,suffixes:"M",trainType:"Local",
      publishedNumbers:["2823M"],
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Utsunomiya"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E131系600番台","E131系"],
      rejectAmbiguousPlan:true,
      model:"E131系600番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E131系_600番台.png"},
    // Yamanote E235-0: official November 2026 LOCAL G-number family.
    // Outside (外回り) = odd G, inside (内回り) = even G;
    // the FULL public number is used, not its two-digit operation tail.
    // Official service examples: 301G, 405G, 360G, 1000G, 2433G.
    // https://timetables.jreast.co.jp/2611/timetable-v/630d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/630d2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/630u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/630u2.html
    // This is an illustrative same-line stock image, not a confirmed set.
    {lineIds:["Yamanote"],numberFormat:"full",
      from:301,to:2433,suffixes:"G",trainType:"Local",
      numberIndex:"jreast-yamanote-202611",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Yamanote"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E235系0番台","E235系0番台（山手線）"],
      model:"E235系0番台（山手線）",
      pngPath:"../images/列车/JR東日本/JR東日本_E235系_0番台.png"},
    {lineIds:["SaikyoKawagoe","Rinkai"],from:0,to:71,suffixes:"KFS",
      model:"E233系7000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_7000番台.png"},
    {lineIds:["SaikyoKawagoe"],from:72,to:79,suffixes:"KFS",
      model:"相鉄12000系",
      pngPath:"../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png"},
    // 70-000 / 71-000 can both work here. The PNG is a DISPLAY DEFAULT,
    // not a claim about the actual carset or its livery.
    {lineIds:["SaikyoKawagoe","Rinkai"],from:80,to:91,suffixes:"KFS",
      model:"東京臨海高速鉄道70-000形",
      pngPath:"../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_70-000形.png"},
    // Sotetsu-through 1xxM / 2xxM distinguish Sotetsu-side express/local,
    // NOT carset ownership. Both JR E233-7000 and Sotetsu 12000 may work
    // this corridor. Never paint a sole E233 image by full public M number
    // on either SaikyoKawagoe or the JR SotetsuDirect connection.
    // Official: https://www.jreast.co.jp/press/2019/20190716.pdf
    // ChuoRapid T/H: match FULL public train numbers, not operation tails.
    // The SQL timetable comprises 1008 ODPT rows plus 79 2610-sourced
    // references retained for review, not an independently verified
    // assignment of actual carsets or a 2611-only full-day timetable.
    // Constrain 2611 PNGs by imported calendar/direction membership.
    // Earlier service months retain the original number-range fallback.
    // https://timetables.jreast.co.jp/2611/timetable-v/658u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/658u2.html
    {lineIds:["ChuoRapid"],numberFormat:"full",
      from:400,to:2599,suffixes:"TH",excludeTrainType:"LimitedExpress",
      directionNumberParity:"inbound-even",
      sourceRailwaysIfPresent:["odpt.Railway:JR-East.ChuoRapid"],
      operatorIfPresent:"JR-East",
      trainTypesIfPresent:["Rapid","ChuoSpecialRapid","OmeSpecialRapid",
        "CommuterRapid","SpecialRapid","CommuterSpecialRapid"],
      officialMonth:"2026-11",
      officialMonthNumbers:{"ChuoRapid":{"weekday":["417H","428H","428T","434T","449T","458T","467T","471T","473T","486T","496T","504H","510H","516H","523H","523T","525T","529T","536T","546T","559T","560T","566T","568T","572T","576T","584T","587T","588T","597T","600H","602H","605H","606H","608H","611H","620H","622H","624T","627T","628T","629H","635T","637T","638T","639T","640T","647T","648T","651T","652T","655T","661T","662T","665T","670T","673T","677T","680T","685T","686T","690T","692T","694T","698T","703H","704H","709H","712H","714H","717H","720T","721H","722T","723H","724H","726H","726T","728H","730T","732T","734T","736T","739T","741T","742T","744T","749T","750T","753T","754T","757T","758T","760T","764T","767T","769T","771T","774T","778T","782T","789T","791T","795T","796T","799T","801H","807H","810H","813H","815H","816H","818H","820H","821T","822H","823T","825H","825T","827H","827T","828T","829H","829T","831T","833T","835T","837T","840T","843T","846T","855T","856T","859T","863T","865T","866T","868T","870T","872T","876T","881T","883T","884T","887T","888T","889T","890T","893T","894T","897T","898T","902H","905H","906H","908H","911H","914H","917H","919H","921H","922T","929T","930T","938T","945T","947T","948T","951T","952T","957T","958T","961T","967T","969T","971T","973T","975T","977T","979T","980T","986T","992T","995T","1003H","1004H","1009H","1010H","1023H","1024T","1026T","1028H","1031T","1034T","1039T","1041T","1044T","1049T","1053T","1054T","1066T","1074T","1078T","1081T","1085T","1087T","1091T","1093T","1094T","1099T","1102H","1105H","1107H","1108H","1115H","1120H","1122H","1123T","1125T","1127T","1128T","1129H","1135T","1138T","1140T","1145T","1155T","1159T","1164T","1168T","1172T","1175T","1179T","1184T","1190T","1198T","1203H","1206H","1209H","1211H","1221H","1222T","1223H","1226T","1228H","1230T","1232T","1239T","1241T","1244T","1248T","1252T","1254T","1265T","1267T","1269T","1273T","1280T","1285T","1286T","1292T","1295T","1304H","1307H","1308H","1314H","1320H","1323T","1324T","1327T","1329T","1331T","1333T","1334T","1340T","1349T","1353T","1358T","1366T","1368T","1378T","1381T","1384T","1387T","1391T","1393T","1394T","1399T","1402H","1405H","1406H","1410H","1415H","1421H","1422T","1426T","1428T","1429H","1430T","1435T","1438T","1441T","1445T","1448T","1455T","1459T","1464T","1467T","1472T","1474T","1479T","1485T","1490T","1495T","1498T","1503H","1504H","1509H","1511H","1520H","1522H","1523T","1525T","1529T","1531T","1532T","1534T","1539T","1544T","1549T","1552T","1554T","1566T","1569T","1575T","1580T","1582T","1586T","1591T","1602H","1605H","1607H","1608H","1610H","1614H","1616H","1618H","1623H","1624T","1627T","1628H","1628T","1630T","1633T","1636T","1637T","1640T","1645T","1646T","1653T","1655T","1656T","1658T","1665T","1670T","1673T","1678T","1683T","1684T","1687T","1692T","1694T","1699T","1704H","1706H","1709H","1715H","1717H","1719H","1721H","1722T","1724H","1725T","1726T","1731T","1734T","1735T","1738T","1741T","1744T","1747T","1748T","1750T","1752T","1757T","1759T","1760T","1762T","1764T","1767T","1771T","1772T","1774T","1776T","1777T","1779T","1781T","1785T","1786T","1788T","1790T","1793T","1795T","1798T","1803H","1811H","1816H","1820H","1822H","1823T","1825H","1827T","1829H","1829T","1835T","1836T","1839T","1840T","1845T","1846T","1849T","1851T","1853T","1854T","1861T","1863T","1865T","1866T","1868T","1875T","1878T","1880T","1882T","1884T","1889T","1892T","1894T","1899T","1905H","1907H","1910H","1914H","1917H","1918H","1921H","1923H","1926H","1928H","1928T","1930T","1932T","1938T","1947T","1948T","1949T","1955T","1956T","1958T","1960T","1962T","1969T","1973T","1976T","1979T","1981T","1983T","1985T","1987T","1988T","1991T","1993T","2006H","2008H","2015H","2024T","2026T","2027H","2029H","2029T","2031T","2033T","2034T","2037T","2039T","2041T","2048T","2059T","2061T","2063T","2064T","2067T","2068T","2072T","2074T","2077T","2082T","2084T","2086T","2090T","2095T","2098T","2107H","2109H","2111H","2119H","2120H","2125T","2126H","2128H","2130T","2135T","2136T","2138T","2140T","2146T","2149T","2152T","2154T","2157T","2165T","2166T","2175T","2178T","2180T","2183T","2189T","2191T","2199T","2214H","2218H","2221H","2222H","2224T","2227H","2227T","2229H","2232T","2247T","2253T","2255T","2256T","2258T","2260T","2267T","2269T","2273T","2274T","2279T","2281T","2285T","2287T","2288T","2292T","2319H","2323H","2331T","2333T","2337T","2339T","2341T","2346T","2357T","2359T","2361T","2364T","2368T","2375T","2384T","2393T","2425T","2452T"],"holiday":["402H","412H","420H","423H","434T","449T","456T","458T","467T","471T","487T","504H","513H","521H","522H","525T","535T","544T","557T","559T","565T","570T","586T","590T","592T","596T","603H","605H","606H","620H","622T","623H","628T","630T","632T","640T","645T","648T","656T","658T","661T","664T","666T","671T","674T","682T","688T","691T","693T","694T","697T","698T","702H","704H","707H","710H","712H","722H","723T","724H","724T","726H","729T","731T","733T","734T","741T","746T","749T","757T","760T","762T","765T","767T","778T","781T","787T","789T","790T","795T","796T","799T","803H","805H","811H","813H","818H","821H","823H","825H","825T","827H","828T","835T","840T","844T","847T","859T","863T","866T","870T","875T","880T","883T","884T","886T","892T","894T","898T","906H","912H","919H","920H","922T","924H","924T","926H","929T","930T","934T","941T","945T","948T","956T","958T","961T","964T","971T","972T","973T","974T","979T","981T","982T","987T","991T","993T","997T","999T","1002H","1004H","1007H","1010H","1022H","1023T","1025H","1025T","1028T","1031T","1035T","1046T","1057T","1059T","1060T","1065T","1067T","1070T","1072T","1078T","1083T","1085T","1090T","1095T","1096T","1103H","1105H","1106H","1111H","1113H","1118H","1121H","1123H","1124H","1127H","1140T","1144T","1147T","1149T","1156T","1158T","1161T","1166T","1173T","1175T","1176T","1179T","1180T","1184T","1186T","1191T","1192T","1194T","1197T","1198T","1207H","1210H","1212H","1219H","1220H","1222H","1222T","1225H","1226H","1229T","1234T","1241T","1245T","1246T","1248T","1257T","1260T","1264T","1267T","1271T","1274T","1281T","1282T","1285T","1287T","1293T","1299T","1302H","1304H","1313H","1321H","1323H","1323T","1324T","1328T","1335T","1340T","1344T","1347T","1349T","1359T","1361T","1365T","1370T","1375T","1377T","1378T","1380T","1383T","1386T","1390T","1392T","1395T","1396T","1398T","1403H","1405H","1406H","1411H","1412H","1418H","1422T","1424H","1425T","1427H","1429T","1434T","1441T","1445T","1452T","1466T","1471T","1472T","1474T","1476T","1479T","1484T","1487T","1491T","1494T","1497T","1499T","1504H","1507H","1510H","1513H","1519H","1520H","1522H","1523T","1524T","1525H","1528T","1532T","1535T","1546T","1553T","1556T","1560T","1564T","1567T","1570T","1573T","1577T","1578T","1581T","1582T","1585T","1590T","1593T","1595T","1596T","1605H","1606H","1608H","1611H","1621H","1623H","1626H","1626T","1629T","1633T","1640T","1644T","1647T","1648T","1652T","1657T","1661T","1665T","1672T","1675T","1676T","1680T","1683T","1684T","1686T","1691T","1692T","1704H","1709H","1720H","1722H","1722T","1724H","1725T","1727H","1727T","1730T","1732T","1734T","1741T","1745T","1746T","1749T","1753T","1756T","1760T","1766T","1771T","1774T","1777T","1779T","1781T","1785T","1787T","1794T","1797T","1807H","1810H","1816H","1818H","1821H","1823T","1825H","1826T","1831T","1833T","1835T","1840T","1848T","1857T","1861T","1864T","1867T","1868T","1870T","1873T","1875T","1878T","1880T","1882T","1886T","1890T","1893T","1895T","1896T","1905H","1906H","1911H","1917H","1919H","1920H","1923H","1928T","1930T","1932T","1934T","1938T","1941T","1944T","1947T","1950T","1951T","1965T","1969T","1971T","1972T","1979T","1983T","1984T","1988T","1991T","1992T","2022H","2026H","2027T","2029T","2033T","2035T","2039T","2045T","2046T","2049T","2052T","2056T","2060T","2064T","2068T","2070T","2074T","2081T","2082T","2085T","2087T","2089T","2093T","2094T","2097T","2107H","2110H","2121H","2123H","2126T","2127H","2131T","2138T","2148T","2153T","2157T","2161T","2165T","2166T","2169T","2173T","2178T","2180T","2183T","2184T","2186T","2188T","2195T","2196T","2211H","2218H","2220H","2232T","2234T","2247T","2249T","2252T","2256T","2260T","2267T","2271T","2275T","2279T","2281T","2285T","2287T","2289T","2290T","2292T","2294T","2297T","2319H","2321H","2327T","2333T","2339T","2346T","2357T","2361T","2364T","2368T","2384T","2391T","2393T","2395T","2420H","2435T","2453T"]}},
      model:"E233系0番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_0番台.png"},
    // Chuo Main November 2026: full M train numbers, NOT trailing
    // operation numbers. JR East's published tables pair the same M
    // service with a T/H train number at Takao: 640M -> 640T,
    // 726M -> 726H and 2339T -> 2339M. Include only M numbers
    // directly paired with T/H in the 2026-11 weekday or holiday
    // official tables; nearby M-only locals have no E233 proof.
    // The 640M morning train
    // waits overnight at Otsuki before departing; this is a real
    // ODPT train record, never an advance-generated timetable vehicle.
    // The E233 PNG is a representative stock image, not an observed set.
    // https://timetables.jreast.co.jp/2611/timetable-v/223u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/223u2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/223d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/223d2.html
    // https://ameblo.jp/tc205-37/entry-12978162403.html
    {lineIds:["ChuoMain"],numberFormat:"full",
      from:600,to:2399,suffixes:"M",excludeTrainType:"LimitedExpress",
      publishedNumbers:[
        "640M","648M","661M","722M","724M","726M","744M",
        "760M","818M","865M","919M","1025M","1081M","1103M",
        "1115M","1118M","1164M","1173M","1175M","1223M","1249M","1257M",
        "1280M","1302M","1314M","1323M","1324M","1325M","1349M","1393M","1427M",
        "1429M","1472M","1474M","1519M","1522M","1556M","1569M",
        "1626M","1628M","1629M","1633M","1648M","1692M","1709M",
        "1725M","1727M","1753M","1818M","1825M","1853M","1867M",
        "1868M","1917M","1919M","1923M","1928M","1932M","1991M",
        "1993M","2008M","2024M","2026M","2052M","2152M","2166M",
        "2218M","2222M","2290M","2292M","2339M"
      ],
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Chuo",
        "odpt.Railway:JR-East.ChuoMain"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E233系0番台"],
      model:"E233系0番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_0番台.png"},

    // 2611 Tatsuno branch: the published 159M Local departs Tatsuno
    // 14:00 and terminates Shiojiri 14:25. The branch is operated by
    // E127-100 in published route/fleet sources (JR East replacement
    // release, Matsumoto depot and 2024 actual working record).
    // One E127-100 Nagano front is REFERENCE ART; not the actual-day set.
    // This source railway is ChuoTatsuno, never ChuoMain's 159M
    // candidate family; the branch is simply drawn on ChuoMain's map.
    // https://timetables.jreast.co.jp/en/2611/train/005/005241.html
    // https://www.jreast.co.jp/nagano/pdf/121221.pdf
    // https://ameblo.jp/tc205-37/entry-12854353694.html
    {lineIds:["ChuoTatsuno"],numberFormat:"full",
      from:159,to:159,suffixes:"M",trainType:"Local",
      publishedNumbers:["159M"],directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.ChuoTatsuno"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      weekdayNumbers:["159M"],holidayNumbers:["159M"],
      allowedModelLabels:["E127系","E127系100番台",
        "E127系100番台（長野色）"],
      requiredCandidateModelPrefix:"E127系",
      model:"E127系100番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png"},
    // Chuo Main 2026-11: T/H suffix is the E233-0 Chuo Rapid through
    // service. Exact SQL train-number sets are calendar scoped; November
    // roster has source_revision_date=NULL, not physical car identity.
    // https://timetables.jreast.co.jp/2611/timetable-v/223u1p.html
    // https://timetables.jreast.co.jp/2611/timetable-v/223u2p.html
    {lineIds:["ChuoMain"],numberFormat:"full",from:400,to:2399,
      suffixes:"TH",trainTypes:["Rapid","ChuoSpecialRapid","CommuterRapid"],
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Chuo",
        "odpt.Railway:JR-East.ChuoMain"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      weekdayNumbers:["449T","523T","640T","648T","722T","726H","744T","818H","865T","1081T","1115H","1164T","1175T","1223H","1280T","1314H","1393T","1429H","1474T","1522H","1569T","1628H","1633T","1692T","1709H","1725T","1825H","1853T","1868T","1917H","1923H","1932T","1993T","2008H","2024T","2152T","2222H","2292T","2339T"],
      holidayNumbers:["449T","525T","640T","648T","661T","724T","726H","760T","818H","919H","1025T","1103H","1118H","1173T","1257T","1302H","1324T","1349T","1427H","1472T","1519H","1556T","1626H","1629T","1648T","1727H","1753T","1818H","1825H","1867T","1917H","1919H","1928T","1991T","2026H","2052T","2166T","2218H","2290T","2339T"],
      allowedModelLabels:["E233系0番台"],
      model:"E233系0番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_0番台.png"},
    // 439M Otsuki 13:45 -> Matsumoto is listed for BOTH calendars in
    // JR East 2611. Independent dated 211 reports: Sep 2025 (six-car
    // Nagano stock), Feb 2026 N608, Aug 2026 N601. These justify ONE
    // illustrative 211 Nagano PNG, not proof of today's physical carset.
    // https://timetables.jreast.co.jp/2611/train/095/099191.html
    // https://kumapapa.jp/blog/?p=42621
    // https://www.youtube.com/watch?v=r5uh_ObkLPU
    // https://hiro989.hatenablog.com/?page=2
    {lineIds:["ChuoMain"],numberFormat:"full",
      from:439,to:439,suffixes:"M",trainType:"Local",
      publishedNumbers:["439M"],directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Chuo",
        "odpt.Railway:JR-East.ChuoMain"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      weekdayNumbers:["439M"],holidayNumbers:["439M"],
      allowedModelLabels:["211系","211系（長野地区）"],
      requireCandidateOverlap:true,
      model:"211系（長野地区）",
      pngPath:"../images/列车/JR東日本/JR東日本_211系_長野色.png"},
    // 1461M Takao -> Otsuki has independent photographed 211-series
    // examples in 2026 (Jan 31, Sep 8). The 2611 JR-East timetable
    // confirms this exact train number on both weekday/holiday outbound.
    // Show ONE 211 Nagano PNG as a PLANNED stock REFERENCE only; never
    // infer the actual 2026-Nov-05 carset from historical photographs.
    // https://timetables.jreast.co.jp/2611/train/000/003921.html
    // https://timetables.jreast.co.jp/2611/train/000/003931.html
    // https://tomodachiya221.livedoor.blog/archives/30401901.html
    // https://search.yahoo.co.jp/realtime/search?p=%231461M
    {lineIds:["ChuoMain"],numberFormat:"full",
      from:1461,to:1461,suffixes:"M",trainType:"Local",
      publishedNumbers:["1461M"],directionNumberParity:"inbound-even",
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Chuo",
        "odpt.Railway:JR-East.ChuoMain"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      weekdayNumbers:["1461M"],holidayNumbers:["1461M"],
      allowedModelLabels:["211系","211系（長野地区）"],
      requireCandidateOverlap:true,
      model:"211系（長野地区）",
      pngPath:"../images/列车/JR東日本/JR東日本_211系_長野色.png"},
    // Chuo Main's 320M-367M local family includes 321M (Enzan 05:38
    // -> Nirasaki 06:12). The documented three-car 211 operation is the
    // gallery REFERENCE, not proof of the actual November 2026 set.
    // E131-200 entered the Chuo Main fleet in autumn 2026; reject a
    // conflicting/ambiguous upstream model instead of overwriting it.
    // No number outside the published 2026 November 320-367 set is
    // admitted just because it falls inside the numerical interval.
    // https://timetables.jreast.co.jp/2611/train/010/010161.html
    // https://timetables.jreast.co.jp/2611/timetable-v/223d2.html
    // https://ameblo.jp/tc205-37/entry-12832324798.html
    // https://www.jreast.co.jp/press/2026/nagano/20260507_na01.pdf
    {lineIds:["ChuoMain"],numberFormat:"full",
      from:320,to:367,suffixes:"M",trainType:"Local",
      publishedNumbers:[
        "320M","321M","322M","323M","324M","325M","326M",
        "327M","328M","329M","330M","331M","332M","333M",
        "334M","335M","336M","337M","338M","339M","340M",
        "341M","342M","343M","344M","345M","346M","347M",
        "348M","349M","350M","351M","352M","353M","354M",
        "355M","356M","357M","358M","359M","360M","361M",
        "362M","363M","364M","365M","367M"
      ],
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Chuo",
        "odpt.Railway:JR-East.ChuoMain"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["211系（長野地区）"],rejectAmbiguousPlan:true,
      model:"211系（長野地区）",
      pngPath:"../images/列车/JR東日本/JR東日本_211系_長野色.png"},
    // 2026-11 JR East Keihin-Tohoku / Negishi: exact published numbers,
    // independently checked 1,263/1,263 against four 2611 official lists.
    // e.g. southbound 411B and 463C, northbound 950B and 818A.
    // The entire published 3/4-digit number is a train number; never
    // convert it to a two-digit operation suffix. Local / Rapid services
    // share the E233-1000 representative line-stock image.
    // K trains are Yokohama Line through services (E233-6000) and must
    // NOT borrow the Keihin-Tohoku E233-1000 artwork.
    // Stock PNG is a display reference, NOT actual-carset verification.
    // https://timetables.jreast.co.jp/2611/timetable-v/623d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/623d2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/623u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/623u2.html
    // https://www.jreast.co.jp/train/local/e233.html
    {lineIds:["KeihinTohoku"],numberFormat:"full",
      from:400,to:2499,suffixes:"ABC",operator:"JR-East",
      numberIndex:"jreast-keihin-202611",
      sourceOperatorFallback:true,trainTypes:["Local","Rapid"],
      sourceRailways:["odpt.Railway:JR-East.KeihinTohokuNegishi",
        "odpt.Railway:JR-East.KeihinTohoku"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E233系1000番台"],
      model:"E233系1000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_1000番台.png"},
    // Official 2611 Keihin-Tohoku K numbers are Yokohama Line through
    // segments. They must NEVER be shown as E233-1000: E233-6000 is a
    // representative gallery image only, not the actual observed carset.
    // Many northbound K timetable segments end at their through-service
    // boundary, without a terminal arrival in THIS source line. Do not
    // convert the boundary departure clock into a fake terminal arrival.
    // https://timetables.jreast.co.jp/2611/timetable-v/623u1.html
    // https://media.jreast.co.jp/articles/1710
    {lineIds:["KeihinTohoku"],numberFormat:"full",
      from:400,to:4999,suffixes:"K",operator:"JR-East",
      numberIndex:"jreast-keihin-202611",
      sourceOperatorFallback:true,trainTypes:["Local","Rapid"],
      sourceRailways:["odpt.Railway:JR-East.KeihinTohokuNegishi",
        "odpt.Railway:JR-East.KeihinTohoku"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E233系6000番台"],
      model:"E233系6000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_6000番台.png"},
    // Ito Line: exact-number 2026-11 OFFICIAL JR East limited express
    // services at Ito, not an M-suffix-wide vehicle assumption.
    // 3001M/3002M = Saphir Odoriko (E261).
    // 3021/22/24/25/26/29/30/31M = regular Odoriko (E257).
    // This is a planned representative PNG only. 40xxM Shuzenji
    // sections turn at Atami; they are NOT Ito through train numbers.
    // Seasonal 80xxM/90xxM and 3003M variants require dated evidence.
    // Official 2026-11 train refs:
    // https://timetables.jreast.co.jp/2611/train/060/063541.html
    // https://timetables.jreast.co.jp/2611/train/010/010061.html
    // https://timetables.jreast.co.jp/2611/train/095/099001.html
    // https://timetables.jreast.co.jp/2611/train/095/098981.html
    // https://www.izukyu.co.jp/train/train.php
    {lineIds:["Ito"],numberFormat:"full",from:3001,to:3002,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:["3001M","3002M"],operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Ito"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E261系"],
      model:"E261系",
      pngPath:"../images/列车/JR東日本/JR東日本_E261系_サフィール踊り子.png"},
    {lineIds:["Ito"],numberFormat:"full",from:3021,to:3031,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:[
        "3021M","3022M","3024M","3025M","3026M",
        "3029M","3030M","3031M"
      ],operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Ito"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系2000番台"],
      model:"E257系2000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E257系_2000番台.png"},
    // Tokaido JR East 2026-11 regular Odoriko: published full 30xxM
    // service numbers match the Ito source's E257-2000 nine-car portion.
    // 3024M (Atami 13:32 -> Tokyo 14:49) couples with Shuzenji
    // 4024M (E257-2500 five cars) at Atami. The train-unit remains
    // ONE physical scheduled coupled service, not two invented positions.
    // Published number + type + line + calendar/date + direction
    // authorizes the REPRESENTATIVE model image, not actual formation.
    // https://timetables.jreast.co.jp/2611/timetable-v/101u1.html
    // https://timetables.jreast.co.jp/2611/train/060/064241.html
    // https://www.jreast.co.jp/multi/traininformation/odoriko/index.html
    {lineIds:["Tokaido"],numberFormat:"full",from:3021,to:3031,
      suffixes:"M",trainType:"LimitedExpress",
      publishedNumbers:["3021M","3022M","3024M","3025M",
        "3026M","3029M","3030M","3031M"],
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Tokaido"],
      directionNumberParity:"inbound-even",
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系2000番台"],
      model:"E257系2000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E257系_2000番台.png"},
    // The 4024M Shuzenji portion appears in the official 2611 joined
    // Odoriko 4 timetable but is not a separate Tokaido SQL live point.
    // This narrowly scoped provision is for an independently sourced
    // 4024M position only; NEVER duplicate 3024M to synthesize it.
    {lineIds:["Tokaido"],numberFormat:"full",from:4024,to:4024,
      suffixes:"M",trainType:"LimitedExpress",publishedNumbers:["4024M"],
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Tokaido"],
      directionNumberParity:"inbound-even",
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E257系2500番台"],
      model:"E257系2500番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E257系_2500番台.png"},
    // Hachiko north 2026-11 official 54 D train numbers (28 up, 26 down).
    // 2026 service uses HB-E220, not retired KiHa110. Timetable calendar
    // and actual departures remain owned by the source, not this image rule.
    // https://timetables.jreast.co.jp/2611/timetable-v/705u2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/705d2.html
    // https://www.jreast.co.jp/train/local/hb_e220.html
    {lineIds:["Hachiko"],numberFormat:"full",from:220,to:2294,
      suffixes:"D",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,publishedNumbers:[
        "220D","221D","2223D","222D","2248D","224D","225D","2260D",
        "2261D","2262D","2263D","2264D","2265D","2266D","2267D","2268D",
        "2269D","226D","2270D","2271D","227D","2281D","2282D","2283D",
        "2284D","2286D","2288D","2289D","228D","2290D","2291D","2292D",
        "2293D","2294D","229D","230D","231D","232D","233D","234D",
        "235D","236D","237D","238D","239D","240D","241D","242D",
        "243D","244D","245D","246D","247D","249D"
      ],sourceRailways:["odpt.Railway:JR-East.Hachiko"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["HB-E220系","HB-E220系（八高線）"],
      rejectAmbiguousPlan:true,model:"HB-E220系",
      pngPath:"../images/列车/JR東日本/JR東日本_HB-E220系.png"},
    // Hachiko south E train-number set from the SQL undated templates;
    // current official timetable is 706u/d, full 2611 parity NOT yet proven.
    // E231-3000 and 209-3500 are both eligible fleets. Representative
    // E231 must not override competing observed stock or an ambiguous plan.
    // H suffix is the neighboring Kawagoe route portion, not Hachiko's E.
    // https://timetables.jreast.co.jp/2611/timetable-v/706u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/706d1.html
    {lineIds:["Hachiko"],numberFormat:"full",from:461,to:4778,
      suffixes:"E",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,publishedNumbers:[
        "1061E","1064E","1067E","1068E","1071E","1160E","1165E","1166E",
        "1169E","1170E","1174E","1175E","1179E","1265E","1266E","1269E",
        "1271E","1274E","1275E","1278E","1361E","1364E","1367E","1368E",
        "1379E","1460E","1465E","1466E","1469E","1470E","1474E","1475E",
        "1479E","1565E","1566E","1569E","1571E","1574E","1575E","1578E",
        "1661E","1664E","1667E","1668E","1672E","1675E","1679E","1760E",
        "1765E","1766E","1767E","1768E","1769E","1770E","1771E","1773E",
        "1774E","1778E","1779E","1861E","1866E","1867E","1868E","1871E",
        "1872E","1874E","1875E","1876E","1878E","1879E","1964E","1966E",
        "1967E","1969E","1970E","1974E","1975E","1979E","2060E","2065E",
        "2066E","2073E","2077E","2078E","2160E","2161E","2167E","2168E",
        "2172E","2175E","2176E","2261E","2266E","2274E","2279E","2373E",
        "2377E","461E","4778E","563E","565E","568E","572E","574E",
        "579E","660E","662E","664E","666E","667E","669E","670E",
        "671E","673E","674E","675E","676E","678E","761E","762E",
        "763E","764E","765E","767E","768E","771E","772E","777E",
        "860E","863E","864E","865E","866E","869E","870E","873E",
        "874E","875E","877E","878E","879E","965E","966E","969E",
        "974E","975E","978E","979E"
      ],sourceRailways:["odpt.Railway:JR-East.Hachiko"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E231系3000番台"],
      // The full public train number does not select one shared-duty carset.
      rejectAmbiguousPlan:true,requireExplicitModelEvidence:true,
      model:"E231系3000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E231系_3000番台.png"},
    // Boso 2026-11: a narrow SQL published-number *nominal* stock family.
    // 209 8-car and a few 4-car scheduled references survive the 209/E233
    // transition. The PNG is only a route/model family representation,
    // NOT a sighting of the real train or a promised 209 allocation.
    // Never infer every M-number in the line is 209: the same route uses
    // E131-0/80 and E233 converted stock. A conflicting actual model or
    // a multi-model planned service overrides this fallback.
    // 2026-11 JR East line tables:
    // https://timetables.jreast.co.jp/2611/timetable-v/221u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/221d2.html
    // https://timetables.jreast.co.jp/2611/timetable-v/220u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/220d1.html
    {lineIds:["Uchibo"],numberFormat:"full",from:123,to:1135,
      suffixes:"M",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,publishedNumbers:[
        "1133M","1135M","123M","129M","137M","141M",
        "169M","175M","181M","187M","193M","197M"
      ],
      sourceRailways:["odpt.Railway:JR-East.Uchibo"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["209系","209系2000番台","209系2100番台",
        "209系2000番台 / 2100番台",
        "209系（8両所定・計画車種／実際の代走は別）",
        "209系（4両所定・計画車種／番台・実車未確定）"],
      rejectAmbiguousPlan:true,
      model:"209系2000番台 / 2100番台",
      pngPath:"../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png"},
    {lineIds:["Sotobo"],numberFormat:"full",from:221,to:1226,
      suffixes:"M",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,publishedNumbers:[
        "1226M","221M","223M","240M","244M","261M",
        "269M","275M","278M","286M","289M","297M"
      ],
      sourceRailways:["odpt.Railway:JR-East.Sotobo"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["209系","209系2000番台","209系2100番台",
        "209系2000番台 / 2100番台",
        "209系（8両所定・計画車種／実際の代走は別）"],
      rejectAmbiguousPlan:true,
      model:"209系2000番台 / 2100番台",
      pngPath:"../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png"},
    // Sotobo Y-numbered KEIYO continuity: four current SQL references
    // are explicitly labeled E233-5000. This is NOT a blanket rule for
    // all A/Y services: other Keiyo through stock include E233-0/1000
    // and 209 variants. Use 2611 full numbers, retain line and model
    // evidence boundaries and never treat an icon as actual-car proof.
    // https://timetables.jreast.co.jp/2611/timetable-v/220u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/220d1.html
    {lineIds:["Sotobo"],numberFormat:"full",from:3680,to:5983,
      suffixes:"Y",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      publishedNumbers:["3680Y","4883Y","5680Y","5983Y"],
      sourceRailways:["odpt.Railway:JR-East.Sotobo"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E233系5000番台"],
      rejectAmbiguousPlan:true,
      model:"E233系5000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系5000番台.png"},
    // Official JR East 2611 Togane -> Keiyo through (not every Y run):
    // weekday and SaturdayHoliday 5680Y Naruto 06:51 -> Oami 07:16,
    // 5983Y Oami 19:47 -> Naruto 20:05. The SQL recurring source
    // labels E233-5000 as a reference, not a confirmed actual trainset.
    // 5680Y joins 3680Y between Honda and Tokyo; 5983Y is paired with
    // 4883Y between Tokyo and Honda. These are distinct published
    // SECTION NUMBERS and must not be rewritten or blindly merged.
    // https://timetables.jreast.co.jp/2611/timetable-v/216u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/216d1.html
    {lineIds:["Togane"],numberFormat:"full",from:5680,to:5983,
      suffixes:"Y",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      publishedNumbers:["5680Y","5983Y"],
      numberIndex:"jreast-togane-202611",
      sourceRailways:["odpt.Railway:JR-East.Togane"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E233系5000番台"],
      rejectAmbiguousPlan:true,
      model:"E233系5000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系5000番台.png"},
    // Narita Abiko Branch 2026-11: all 80 exact 820M..899M numbers
    // correspond to planned E231-0 Joban rapid-type stock. Departure
    // times, day calendar and same-day carset are independent evidence.
    // No 800-series number is an E231 vehicle formation / operation ID.
    // https://timetables.jreast.co.jp/2611/timetable-v/215u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/215d2.html
    // https://www.jreast.co.jp/train/local/e231.html
    {lineIds:["NaritaAbikoBranch"],numberFormat:"full",
      from:820,to:899,suffixes:"M",trainType:"Local",
      numberIndex:"jreast-narita-abiko-202611",
      operator:"JR-East",sourceOperatorFallback:true,
      publishedNumbers:[
        "820M","821M","822M","823M","824M","825M","826M","827M",
        "828M","829M","830M","831M","832M","833M","834M","835M",
        "836M","837M","838M","839M","840M","841M","842M","843M",
        "844M","845M","846M","847M","848M","849M","850M","851M",
        "852M","853M","854M","855M","856M","857M","858M","859M",
        "860M","861M","862M","863M","864M","865M","866M","867M",
        "868M","869M","870M","871M","872M","873M","874M","875M",
        "876M","877M","878M","879M","880M","881M","882M","883M",
        "884M","885M","886M","887M","888M","889M","890M","891M",
        "892M","893M","894M","895M","896M","897M","898M","899M"
      ],
      sourceRailways:["odpt.Railway:JR-East.NaritaAbikoBranch"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E231系0番台"],
      rejectAmbiguousPlan:true,
      model:"E231系0番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E231系_0番台.png"},
    // Ome uses both T/H-numbered Chuo through trains (e.g. 434T, 405H,
    // 1378T, 1926H) and suffixless local numbers (e.g. 509, 843, 1103,
    // 1705, 2348). They are FULL public numbers, not operation-number tails.
    // The common E233-0 gallery PNG represents the model; a 4-car Ome-Okutama
    // train must not be claimed to be a verified 10-car physical formation.
    // Itsukaichi uses the same E233-0 gallery default; 2149 on 2026-11-03
    // is confirmed as a suffixless 21:57 Haijima -> Musashi-Itsukaichi train.
    {lineIds:["Ome","Itsukaichi"],numberFormat:"full",
      from:400,to:2599,suffixes:"TH",excludeTrainType:"LimitedExpress",
      model:"E233系0番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_0番台.png"},
    {lineIds:["Ome","Itsukaichi"],numberFormat:"bare",
      from:400,to:2499,suffixes:"",excludeTrainType:"LimitedExpress",
      model:"E233系0番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_0番台.png"},
    // Musashino 2611 local E-number services, 536 source timetable rows
    // across two calendars and two directions (430 distinct numbers).
    // Official JR East: 708u1 / 708u2 / 708d1 / 708d2.
    // Regular E numbers share E231-0 and 209-500 STOCK; a number does
    // not identify which model ran. Only explicit supplied model evidence
    // may select the corresponding existing, line-scoped gallery PNG.
    // Never borrow these PNGs for 26xxM Musashino/27xxM Shimousa,
    // special 8xxx/9xxx M services, or unknown/unverified actual sets.
    // https://timetables.jreast.co.jp/2611/timetable-v/708u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/708d1.html
    {lineIds:["Musashino"],numberFormat:"full",
      from:400,to:2499,suffixes:"E",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,sourceRailways:["odpt.Railway:JR-East.Musashino"],
      directionNumberParity:"inbound-even",
      validFrom:"2026-11-01",validTo:"2026-11-30",
      weekdayNumbers:["408E","416E","445E","459E","482E","500E","504E","509E","514E","515E","517E","520E","526E","533E","541E","546E","553E","555E","556E","557E","569E","578E","580E","607E","610E","612E","618E","623E","625E","630E","632E","637E","638E","644E","647E","650E","651E","652E","658E","662E","664E","666E","668E","671E","675E","676E","677E","679E","683E","684E","701E","702E","705E","706E","711E","714E","716E","721E","722E","727E","728E","729E","734E","740E","743E","754E","756E","759E","761E","765E","770E","773E","781E","808E","819E","833E","836E","839E","842E","845E","846E","850E","855E","860E","863E","869E","874E","876E","882E","903E","904E","907E","910E","917E","920E","923E","926E","929E","935E","938E","941E","968E","972E","980E","1009E","1011E","1018E","1032E","1037E","1054E","1061E","1062E","1064E","1075E","1083E","1105E","1106E","1108E","1116E","1122E","1127E","1134E","1139E","1140E","1169E","1173E","1181E","1210E","1219E","1233E","1235E","1236E","1255E","1260E","1263E","1265E","1272E","1274E","1282E","1304E","1307E","1309E","1317E","1323E","1326E","1338E","1341E","1364E","1368E","1380E","1383E","1406E","1411E","1418E","1432E","1434E","1437E","1439E","1454E","1461E","1462E","1473E","1475E","1502E","1505E","1508E","1516E","1519E","1522E","1527E","1528E","1540E","1565E","1569E","1577E","1581E","1582E","1607E","1610E","1617E","1626E","1633E","1636E","1638E","1651E","1655E","1660E","1663E","1672E","1674E","1680E","1704E","1709E","1718E","1723E","1729E","1735E","1737E","1741E","1742E","1762E","1764E","1768E","1775E","1776E","1783E","1785E","1803E","1806E","1811E","1816E","1822E","1827E","1832E","1834E","1839E","1843E","1850E","1854E","1861E","1865E","1873E","1881E","1884E","1902E","1905E","1907E","1908E","1909E","1919E","1928E","1933E","1940E","1942E","1963E","1969E","1974E","1977E","1982E","2003E","2008E","2010E","2017E","2023E","2035E","2038E","2051E","2055E","2060E","2064E","2072E","2080E","2085E","2104E","2106E","2129E","2132E","2141E","2143E","2154E","2162E","2173E","2175E","2176E","2183E","2205E","2211E","2222E","2234E","2250E","2261E","2265E","2274E","2281E","2333E","2342E","2355E","2363E","2372E","2377E","2407E"],
      holidayNumbers:["408E","411E","445E","472E","482E","507E","509E","538E","540E","541E","546E","551E","553E","558E","559E","562E","566E","573E","575E","577E","578E","580E","602E","610E","612E","616E","617E","618E","624E","634E","637E","639E","643E","644E","658E","669E","672E","674E","676E","679E","683E","706E","708E","711E","725E","730E","732E","733E","735E","740E","747E","750E","752E","763E","767E","768E","781E","807E","813E","816E","819E","836E","838E","842E","845E","846E","862E","873E","877E","882E","903E","904E","910E","918E","924E","931E","932E","941E","951E","953E","966E","969E","980E","1012E","1017E","1034E","1037E","1039E","1052E","1063E","1072E","1076E","1081E","1083E","1105E","1106E","1111E","1116E","1119E","1125E","1130E","1133E","1140E","1150E","1167E","1168E","1213E","1224E","1235E","1236E","1238E","1253E","1262E","1269E","1273E","1277E","1280E","1282E","1304E","1307E","1310E","1312E","1317E","1318E","1331E","1332E","1341E","1351E","1366E","1383E","1406E","1425E","1434E","1437E","1439E","1452E","1463E","1467E","1468E","1472E","1476E","1481E","1505E","1511E","1513E","1516E","1519E","1530E","1533E","1536E","1540E","1550E","1575E","1577E","1582E","1602E","1607E","1610E","1624E","1635E","1638E","1651E","1653E","1662E","1666E","1669E","1673E","1674E","1680E","1704E","1712E","1717E","1718E","1731E","1732E","1737E","1741E","1742E","1763E","1767E","1772E","1776E","1783E","1803E","1806E","1811E","1813E","1820E","1825E","1834E","1839E","1840E","1843E","1850E","1852E","1858E","1859E","1868E","1875E","1881E","1902E","1905E","1907E","1916E","1919E","1930E","1933E","1936E","1938E","1942E","1953E","1966E","1973E","1977E","1982E","2003E","2010E","2017E","2021E","2024E","2035E","2041E","2051E","2058E","2069E","2074E","2080E","2106E","2118E","2131E","2132E","2137E","2143E","2152E","2167E","2175E","2176E","2183E","2211E","2220E","2225E","2230E","2234E","2239E","2240E","2250E","2253E","2259E","2281E","2319E","2333E","2342E","2374E","2377E","2407E"],
      requireExplicitModelEvidence:true,
      allowedModelLabels:["E231系0番台（武蔵野線）","E231系0番台"],
      model:"E231系0番台（武蔵野線）",
      pngPath:"../images/列车/JR東日本/JR東日本_E231系_0番台.png"},
    {lineIds:["Musashino"],numberFormat:"full",
      from:400,to:2499,suffixes:"E",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,sourceRailways:["odpt.Railway:JR-East.Musashino"],
      directionNumberParity:"inbound-even",
      validFrom:"2026-11-01",validTo:"2026-11-30",
      weekdayNumbers:["408E","416E","445E","459E","482E","500E","504E","509E","514E","515E","517E","520E","526E","533E","541E","546E","553E","555E","556E","557E","569E","578E","580E","607E","610E","612E","618E","623E","625E","630E","632E","637E","638E","644E","647E","650E","651E","652E","658E","662E","664E","666E","668E","671E","675E","676E","677E","679E","683E","684E","701E","702E","705E","706E","711E","714E","716E","721E","722E","727E","728E","729E","734E","740E","743E","754E","756E","759E","761E","765E","770E","773E","781E","808E","819E","833E","836E","839E","842E","845E","846E","850E","855E","860E","863E","869E","874E","876E","882E","903E","904E","907E","910E","917E","920E","923E","926E","929E","935E","938E","941E","968E","972E","980E","1009E","1011E","1018E","1032E","1037E","1054E","1061E","1062E","1064E","1075E","1083E","1105E","1106E","1108E","1116E","1122E","1127E","1134E","1139E","1140E","1169E","1173E","1181E","1210E","1219E","1233E","1235E","1236E","1255E","1260E","1263E","1265E","1272E","1274E","1282E","1304E","1307E","1309E","1317E","1323E","1326E","1338E","1341E","1364E","1368E","1380E","1383E","1406E","1411E","1418E","1432E","1434E","1437E","1439E","1454E","1461E","1462E","1473E","1475E","1502E","1505E","1508E","1516E","1519E","1522E","1527E","1528E","1540E","1565E","1569E","1577E","1581E","1582E","1607E","1610E","1617E","1626E","1633E","1636E","1638E","1651E","1655E","1660E","1663E","1672E","1674E","1680E","1704E","1709E","1718E","1723E","1729E","1735E","1737E","1741E","1742E","1762E","1764E","1768E","1775E","1776E","1783E","1785E","1803E","1806E","1811E","1816E","1822E","1827E","1832E","1834E","1839E","1843E","1850E","1854E","1861E","1865E","1873E","1881E","1884E","1902E","1905E","1907E","1908E","1909E","1919E","1928E","1933E","1940E","1942E","1963E","1969E","1974E","1977E","1982E","2003E","2008E","2010E","2017E","2023E","2035E","2038E","2051E","2055E","2060E","2064E","2072E","2080E","2085E","2104E","2106E","2129E","2132E","2141E","2143E","2154E","2162E","2173E","2175E","2176E","2183E","2205E","2211E","2222E","2234E","2250E","2261E","2265E","2274E","2281E","2333E","2342E","2355E","2363E","2372E","2377E","2407E"],
      holidayNumbers:["408E","411E","445E","472E","482E","507E","509E","538E","540E","541E","546E","551E","553E","558E","559E","562E","566E","573E","575E","577E","578E","580E","602E","610E","612E","616E","617E","618E","624E","634E","637E","639E","643E","644E","658E","669E","672E","674E","676E","679E","683E","706E","708E","711E","725E","730E","732E","733E","735E","740E","747E","750E","752E","763E","767E","768E","781E","807E","813E","816E","819E","836E","838E","842E","845E","846E","862E","873E","877E","882E","903E","904E","910E","918E","924E","931E","932E","941E","951E","953E","966E","969E","980E","1012E","1017E","1034E","1037E","1039E","1052E","1063E","1072E","1076E","1081E","1083E","1105E","1106E","1111E","1116E","1119E","1125E","1130E","1133E","1140E","1150E","1167E","1168E","1213E","1224E","1235E","1236E","1238E","1253E","1262E","1269E","1273E","1277E","1280E","1282E","1304E","1307E","1310E","1312E","1317E","1318E","1331E","1332E","1341E","1351E","1366E","1383E","1406E","1425E","1434E","1437E","1439E","1452E","1463E","1467E","1468E","1472E","1476E","1481E","1505E","1511E","1513E","1516E","1519E","1530E","1533E","1536E","1540E","1550E","1575E","1577E","1582E","1602E","1607E","1610E","1624E","1635E","1638E","1651E","1653E","1662E","1666E","1669E","1673E","1674E","1680E","1704E","1712E","1717E","1718E","1731E","1732E","1737E","1741E","1742E","1763E","1767E","1772E","1776E","1783E","1803E","1806E","1811E","1813E","1820E","1825E","1834E","1839E","1840E","1843E","1850E","1852E","1858E","1859E","1868E","1875E","1881E","1902E","1905E","1907E","1916E","1919E","1930E","1933E","1936E","1938E","1942E","1953E","1966E","1973E","1977E","1982E","2003E","2010E","2017E","2021E","2024E","2035E","2041E","2051E","2058E","2069E","2074E","2080E","2106E","2118E","2131E","2132E","2137E","2143E","2152E","2167E","2175E","2176E","2183E","2211E","2220E","2225E","2230E","2234E","2239E","2240E","2250E","2253E","2259E","2281E","2319E","2333E","2342E","2374E","2377E","2407E"],
      requireExplicitModelEvidence:true,
      allowedModelLabels:["209系500番台（武蔵野線）","209系500番台"],
      model:"209系500番台（武蔵野線）",
      pngPath:"../images/列车/JR東日本/JR東日本_209系_500番台_武藏野線.png"},
    // Yokohama trains use FULL public K numbers, including 415K, 2107K,
    // 2221K, 3937K, 4013K and 4747K (2026 weekday/weekend JR timetable).
    // The E233-6000 gallery default is scoped to Yokohama only. A train
    // continuing onto KeihinTohoku/Negishi is not reclassified from the
    // display line alone; a separate validated source-railway projection
    // would be needed to paint its vehicle on another line.
    {lineIds:["Yokohama"],numberFormat:"full",
      from:400,to:4999,suffixes:"K",trainTypes:["Local","Rapid"],
      operator:"JR-East",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Yokohama"],
      numberIndex:"jreast-yokohama-202611",
      validFrom:"2026-11-01",validTo:"2026-11-30",
      // This is a representative series image only. Never override a
      // conflicting observed model, SQL plan, or timetable candidate.
      allowedModelLabels:["E233系6000番台"],
      requiredCandidateModelPrefix:"E233系6000番台",
      requireCompatiblePlan:true,rejectAmbiguousPlan:true,
      model:"E233系6000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_6000番台.png"},
    // 2026-11 JR East Yokosuka-Sobu numbered services.
    // EXACT public numbers from the dated source index, NEVER arbitrary ranges.
    // Yokosuka S / Sobu Rapid F trains and source-verified 4-car
    // Kurihama-Zushi Yokosuka H shuttles use E235-1000 reference PNG.
    // H is admitted ONLY when present in the weekday/holiday exact typed
    // Chiba index; the 1342H source timetable has no Green Car and runs
    // exclusively Kurihama-Zushi. Yokosuka Y and other M workings are NOT
    // inferred from this source. No physical J trainset is identified.
    // https://timetables.jreast.co.jp/2611/train/135/137051.html
    // https://timetables.jreast.co.jp/2611/timetable-v/222d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/222d2.html
    {lineIds:["Yokosuka","SobuRapid","SobuMain","Narita","NaritaAirportBranch",
        "Uchibo","Sotobo","Kashima"],
      numberFormat:"full",from:400,to:5999,suffixes:"FSMH",
      operator:"JR-East",sourceOperatorFallback:true,
      trainTypes:["Local","Rapid"],
      sourceRailways:["odpt.Railway:JR-East.Yokosuka",
        "odpt.Railway:JR-East.SobuRapid","odpt.Railway:JR-East.Sobu",
        "odpt.Railway:JR-East.Narita","odpt.Railway:JR-East.NaritaAirportBranch",
        "odpt.Railway:JR-East.Uchibo","odpt.Railway:JR-East.Sotobo",
        "odpt.Railway:JR-East.Kashima"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      numberIndex:"jreast-sobu-yokosuka-202611",
      // The published regular S/F and through local M-number assignments
      // are even inbound, odd outbound in the source timetables. The
      // number index alone does not check a supplied travel direction.
      // This is a train-NUMBER scope, never proof of an actual E235 set.
      directionNumberParity:"inbound-even",
      allowedModelLabels:["E235系1000番台"],
      model:"E235系1000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E235系_1000番台.png"},
    // N'EX 2001-2054M from published limited-express service numbers;
    // Shiosai 400xM uses E259 *except* the day-specific E257-500
    // trains (e.g. weekday 4006M / 4011M). Exact calendar/line lookup
    // prevents assigning the wrong vehicle to those two services.
    // https://www.jreast.co.jp/train/express/nex.html
    // https://www.jreast.co.jp/press/2023/chiba/20231215_c01.pdf
    {lineIds:["Yokosuka","SobuRapid","SobuMain","Narita","NaritaAirportBranch"],
      numberFormat:"full",from:2001,to:4014,suffixes:"M",
      trainType:"LimitedExpress",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Yokosuka",
        "odpt.Railway:JR-East.SobuRapid","odpt.Railway:JR-East.Sobu",
        "odpt.Railway:JR-East.Narita","odpt.Railway:JR-East.NaritaAirportBranch"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      numberIndex:"jreast-sobu-yokosuka-202611",
      allowedModelLabels:["E259系","E259系（成田エクスプレス）","E259系（しおさい）"],
      model:"E259系",
      pngPath:"../images/列车/JR東日本/JR東日本_E259系.png"},
    // E257-500 Boso numbered services: weekday Sazanami 1001-1007M,
    // Wakashio 1051-1071M with daily calendar gaps, and Shiosai
    // 4006M / 4011M. Keiyo/Sotobo/Uchibo/SobuMain uses the
    // same model reference across each sourced segment.
    // E257-5000 does NOT share this range: it mainly runs date-specific
    // specials; its model PNG is not yet in the approved gallery.
    {lineIds:["Keiyo","Sotobo","Uchibo","SobuMain","SobuRapid"],
      numberFormat:"full",from:1001,to:4011,suffixes:"M",
      trainType:"LimitedExpress",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Keiyo",
        "odpt.Railway:JR-East.Sotobo","odpt.Railway:JR-East.Uchibo",
        "odpt.Railway:JR-East.Sobu","odpt.Railway:JR-East.SobuRapid"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      numberIndex:"jreast-sobu-yokosuka-202611",
      allowedModelLabels:["E257系500番台","E257系500番台（わかしお・さざなみ）"],
      model:"E257系500番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E257系_500番台.png"},
    // 2026-11 Nambu Branch (Shitte - HamaKawasaki) uses full public
    // H numbers. The existing 702u/d official index controls the train
    // number, calendar, direction and exact JR-East.NambuBranch source.
    // E127-0 is a REPRESENTATIVE branch-stock gallery image, not a
    // verified real carset: 205-1000 can also work on this line.
    // https://timetables.jreast.co.jp/2611/timetable-v/702u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/702d1.html
    // https://www.jreast.co.jp/press/2022/yokohama/20230217_y2.pdf
    {lineIds:["NambuBranch"],numberFormat:"full",from:400,to:2299,
      suffixes:"H",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.NambuBranch"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      numberIndex:"nambu-branch-official-202611",
      allowedModelLabels:["E127系0番台（南武支線）","E127系0番台","E127系"],
      model:"E127系0番台（南武支線）",
      pngPath:"../images/列车/JR東日本/JR東日本_E127系_0番台_南武支線.png"},
    // 2026-11 Nambu mainline JR-East F-numbered Local/Rapid services.
    // Holiday 2319F: Kawasaki 23:13 -> Musashi-Mizonokuchi 23:34.
    // E233-8000 is a representative line-stock IMAGE; E233-8500 also
    // works on this line, so F numbers never prove a physical carset.
    // https://timetables.jreast.co.jp/2611/train/140/141401.html
    // https://timetables.jreast.co.jp/2611/timetable-v/703d2.html
    // https://media.jreast.co.jp/articles/1712
    {lineIds:["Nambu"],numberFormat:"full",from:400,to:4999,
      suffixes:"F",trainTypes:["Local","Rapid"],operator:"JR-East",
      directionNumberParity:"inbound-even",
      // Full 2611 published ODPT public F numbers; weekday and
      // Saturday/Holiday have different sets. No new lookup layer.
      // JR East official: 703u1/703d1/703u2/703d2.
      weekdayNumbers:["408F","416F","420F","421F","433F","446F","447F","449F","460F","505F","509F","517F","520F","522F","532F","534F","535F","538F","539F","545F","547F","548F","553F","554F","561F","601F","602F","603F","604F","606F","607F","608F","610F","611F","616F","621F","623F","624F","625F","627F","630F","633F","635F","638F","640F","642F","643F","644F","646F","649F","650F","651F","652F","653F","655F","656F","658F","659F","660F","662F","700F","703F","707F","709F","710F","712F","713F","714F","715F","717F","718F","719F","720F","722F","724F","726F","728F","729F","731F","732F","734F","736F","739F","741F","743F","745F","747F","748F","750F","752F","754F","756F","757F","758F","761F","762F","763F","764F","801F","802F","803F","805F","806F","808F","811F","812F","814F","815F","816F","823F","825F","827F","829F","830F","833F","835F","836F","837F","838F","839F","840F","842F","844F","846F","847F","849F","851F","855F","857F","860F","863F","865F","904F","907F","917F","918F","921F","922F","926F","928F","931F","934F","937F","941F","943F","945F","946F","954F","961F","962F","1006F","1013F","1016F","1019F","1020F","1027F","1029F","1030F","1038F","1055F","1060F","1063F","1112F","1118F","1126F","1128F","1131F","1139F","1141F","1143F","1147F","1154F","1161F","1162F","1205F","1207F","1219F","1229F","1230F","1235F","1238F","1240F","1242F","1246F","1255F","1260F","1304F","1306F","1317F","1318F","1321F","1328F","1331F","1334F","1341F","1347F","1354F","1363F","1405F","1407F","1413F","1416F","1419F","1420F","1427F","1430F","1440F","1443F","1446F","1462F","1504F","1506F","1512F","1518F","1521F","1526F","1535F","1539F","1541F","1542F","1561F","1563F","1602F","1605F","1607F","1610F","1611F","1617F","1619F","1620F","1629F","1634F","1636F","1637F","1638F","1640F","1643F","1646F","1655F","1662F","1703F","1704F","1706F","1710F","1716F","1721F","1724F","1725F","1727F","1728F","1730F","1735F","1742F","1743F","1744F","1745F","1747F","1750F","1751F","1754F","1760F","1763F","1764F","1802F","1805F","1807F","1811F","1814F","1815F","1817F","1818F","1824F","1826F","1827F","1830F","1834F","1836F","1838F","1841F","1842F","1846F","1850F","1855F","1861F","1863F","1865F","1903F","1910F","1914F","1917F","1918F","1921F","1925F","1931F","1935F","1937F","1939F","1940F","1943F","1944F","1947F","1951F","1954F","1960F","1962F","2002F","2005F","2006F","2011F","2015F","2019F","2020F","2030F","2036F","2038F","2041F","2045F","2046F","2055F","2061F","2063F","2103F","2104F","2107F","2114F","2118F","2120F","2121F","2131F","2137F","2139F","2140F","2141F","2142F","2144F","2147F","2154F","2160F","2162F","2202F","2205F","2206F","2210F","2215F","2221F","2236F","2238F","2240F","2243F","2245F","2255F","2261F","2304F","2307F","2311F","2337F","2339F","2341F","2344F","2346F","2354F","2355F","2360F","2363F","2405F","2414F","2445F","2447F","4005F","4040F","4042F","4104F","4121F","4134F","4135F","4213F","4216F","4217F","4220F","4312F","4326F","4327F","4339F","4429F","4438F","4460F","4461F","4528F","4547F","4554F","4555F","4631F","4739F","4820F","4829F","4831F","4862F","4904F","4916F","4919F"],
      holidayNumbers:["404F","406F","407F","413F","426F","430F","441F","442F","443F","505F","507F","512F","522F","523F","527F","531F","540F","542F","544F","545F","546F","604F","606F","608F","610F","611F","612F","613F","620F","621F","622F","624F","628F","629F","630F","634F","637F","641F","643F","647F","648F","649F","650F","652F","702F","705F","707F","710F","713F","716F","720F","723F","725F","726F","731F","735F","736F","740F","744F","746F","748F","751F","753F","803F","804F","806F","811F","812F","817F","821F","822F","824F","827F","830F","837F","842F","845F","847F","849F","852F","905F","907F","910F","913F","920F","925F","931F","934F","936F","941F","943F","944F","946F","948F","953F","1012F","1020F","1023F","1024F","1026F","1035F","1037F","1040F","1045F","1047F","1049F","1052F","1102F","1106F","1111F","1113F","1116F","1121F","1125F","1134F","1141F","1142F","1144F","1153F","1203F","1204F","1207F","1212F","1217F","1222F","1227F","1230F","1235F","1240F","1245F","1248F","1305F","1306F","1310F","1313F","1324F","1331F","1334F","1336F","1341F","1343F","1346F","1349F","1407F","1420F","1423F","1425F","1426F","1435F","1437F","1440F","1444F","1447F","1448F","1452F","1502F","1506F","1511F","1512F","1516F","1521F","1524F","1541F","1545F","1546F","1549F","1553F","1603F","1604F","1607F","1610F","1613F","1617F","1620F","1625F","1627F","1630F","1634F","1637F","1642F","1644F","1648F","1652F","1702F","1705F","1711F","1712F","1722F","1724F","1726F","1731F","1732F","1733F","1736F","1740F","1743F","1745F","1747F","1749F","1753F","1754F","1804F","1806F","1810F","1813F","1814F","1815F","1823F","1825F","1827F","1830F","1837F","1841F","1842F","1843F","1844F","1846F","1848F","1855F","1902F","1903F","1905F","1907F","1911F","1912F","1914F","1926F","1931F","1932F","1936F","1940F","1941F","1942F","1947F","1949F","1954F","2003F","2006F","2010F","2013F","2015F","2018F","2019F","2024F","2027F","2030F","2033F","2037F","2043F","2046F","2048F","2055F","2102F","2104F","2107F","2111F","2114F","2125F","2126F","2127F","2130F","2131F","2136F","2140F","2142F","2149F","2154F","2203F","2205F","2206F","2218F","2224F","2226F","2231F","2237F","2243F","2248F","2254F","2255F","2304F","2307F","2310F","2315F","2319F","2325F","2330F","2336F","2349F","2355F","2402F","2405F","2411F","2437F","3902F","3916F","3921F","3926F","4003F","4004F","4017F","4027F","4030F","4042F","4105F","4122F","4131F","4136F","4143F","4146F","4210F","4220F","4223F","4237F","4247F","4252F","4302F","4311F","4316F","4321F","4326F","4353F","4403F","4404F","4417F","4427F","4430F","4442F","4505F","4522F","4531F","4536F","4543F","4623F"],
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Nambu"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E233系8000番台"],
      model:"E233系8000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_8000番台.png"},
    // 2026-11 JR Chuo-Sobu through Tozai: on JR source segments the
    // official number changes from Metro S or JR K to Y/A. Y/A themselves
    // do NOT identify the owner. Apply only exact stop-linked indexed numbers.
    // 15000 is one representative Metro S fleet; 05/07 share its duties.
    {lineIds:["ChuoSobuLocal"],numberFormat:"full",from:400,to:2599,
      suffixes:"YA",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.ChuoSobuLocal"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      numberIndex:"chuo-sobu-tozai-2611",throughOwner:"S",
      allowedModelLabels:["東京メトロ15000系"],
      model:"東京メトロ15000系",
      pngPath:"../images/列车/東京メトロ/東京メトロ_15000系.png"},
    {lineIds:["ChuoSobuLocal"],numberFormat:"full",from:400,to:2599,
      suffixes:"YA",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.ChuoSobuLocal"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      numberIndex:"chuo-sobu-tozai-2611",throughOwner:"K",
      allowedModelLabels:["E231系800番台","E231系800番台（東西線直通）"],
      model:"E231系800番台（東西線直通）",
      pngPath:"../images/列车/JR東日本/JR東日本_E231系_800番台.png"},
    // TokyoMetro Tozai source numbers have an A/B direction prefix and
    // an optional R after the S/K/T ownership suffix (e.g. B711KR).
    // Keep the original full public number; never turn it into an operation ID.
    {lineIds:["Tozai"],numberFormat:"metro-prefixed",from:400,to:2599,
      suffixes:"S",excludeTrainType:"LimitedExpress",
      operator:"TokyoMetro",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:TokyoMetro.Tozai"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["東京メトロ15000系"],
      model:"東京メトロ15000系",
      pngPath:"../images/列车/東京メトロ/東京メトロ_15000系.png"},
    {lineIds:["Tozai"],numberFormat:"metro-prefixed",from:400,to:2599,
      suffixes:"K",excludeTrainType:"LimitedExpress",
      operator:"TokyoMetro",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:TokyoMetro.Tozai"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E231系800番台","E231系800番台（東西線直通）"],
      model:"E231系800番台（東西線直通）",
      pngPath:"../images/列车/JR東日本/JR東日本_E231系_800番台.png"},
    {lineIds:["Tozai"],numberFormat:"metro-prefixed",from:400,to:2599,
      suffixes:"T",excludeTrainType:"LimitedExpress",
      operator:"TokyoMetro",sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:TokyoMetro.Tozai"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["東葉高速2000系"],
      model:"東葉高速2000系",
      pngPath:"../images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png"},
    // 2026-11 Joban Local (常磐線各駅停車) / Chiyoda through:
    // FULL published JR timetable numbers carry K (JR), S (Tokyo Metro),
    // E (Odakyu). K/S/E designate owning-company families, not a verified
    // formation or a two-digit operation-code conversion. Keep 1948E as 1948E.
    // Scope to the JR-East JobanLocal SOURCE railway: Joban Rapid's H numbers
    // and short Chiyoda-branch workings do not inherit these illustrations.
    // https://timetables.jreast.co.jp/2611/timetable-v/641u1p.html
    // https://timetables.jreast.co.jp/2611/timetable-v/641u2p.html
    // https://timetables.jreast.co.jp/2611/timetable-v/641d1p.html
    // https://timetables.jreast.co.jp/2611/timetable-v/641d2p.html
    {lineIds:["JobanLocal"],numberFormat:"full",from:400,to:2599,
      suffixes:"K",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.JobanLocal"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E233系2000番台"],
      model:"E233系2000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_2000番台.png"},
    {lineIds:["JobanLocal"],numberFormat:"full",from:400,to:2599,
      suffixes:"S",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.JobanLocal"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["東京メトロ16000系"],
      model:"東京メトロ16000系",
      pngPath:"../images/列车/東京メトロ/東京メトロ_16000系.png"},
    {lineIds:["JobanLocal"],numberFormat:"full",from:400,to:2599,
      suffixes:"E",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.JobanLocal"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["小田急4000形"],
      model:"小田急4000形",
      pngPath:"../images/列车/小田急電鉄/小田急電鉄_4000形_標準色.png"},
    // 2026-11 Joban Rapid E231-0: exact weekday / holiday 2611 H
    // public train-number set, never a blanket 430H-2495H interval.
    // https://timetables.jreast.co.jp/2611/timetable-v/642u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/642u2.html
    {lineIds:["Joban"],numberFormat:"full",from:430,to:2495,
      suffixes:"H",operator:"JR-East",trainTypes:["Rapid"],
      sourceRailways:["odpt.Railway:JR-East.JobanRapid"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      numberIndex:"joban-e231-h-202611",
      allowedModelLabels:["E231系0番台","E231系0番台（常磐快速線・LED）"],
      model:"E231系0番台（常磐快速線・LED）",
      pngPath:"../images/列车/JR東日本/JR東日本_E231系_0番台_常磐快速線.png"},
    // 2026-11 JR East regular Hitachi 1-30M / Tokiwa 51-86M.
    // These are exact timetable-bounded limited-express public numbers,
    // NOT a claim about the particular physical E657 formation.
    // https://www.jreast.co.jp/train/express/hitachi_tokiwa.html
    // https://timetables.jreast.co.jp/2611/timetable-v/240u1p.html
    {lineIds:["Joban","JobanMain"],numberFormat:"full",from:1,to:30,
      suffixes:"M",operator:"JR-East",trainType:"LimitedExpress",
      sourceRailways:["odpt.Railway:JR-East.Joban",
        "odpt.Railway:JR-East.JobanRapid"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E657系","E657系（ひたち・ときわ）"],
      model:"E657系",
      pngPath:"../images/列车/JR東日本/JR東日本_E657系.png"},
    {lineIds:["Joban","JobanMain"],numberFormat:"full",from:51,to:86,
      suffixes:"M",operator:"JR-East",trainType:"LimitedExpress",
      sourceRailways:["odpt.Railway:JR-East.Joban",
        "odpt.Railway:JR-East.JobanRapid"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E657系","E657系（ひたち・ときわ）"],
      model:"E657系",
      pngPath:"../images/列车/JR東日本/JR東日本_E657系.png"},
    // JR East's 2026-11 holiday timetable lists 1252M as a regular
    // Katsuta -> Shinagawa service with a Green car. The canonical SQL
    // JobanMain -> Joban record also carries an E531 source-model candidate.
    // On the rapid-line diagram the same through train may be labelled Rapid.
    // This is a narrow PLANNED artwork reference, not a confirmed carset.
    // https://timetables.jreast.co.jp/2611/timetable-v/642u2p.html
    // https://www.jreast.co.jp/en/train/local/e531.html
    {lineIds:["Joban","JobanMain"],numberFormat:"full",
      from:1252,to:1252,suffixes:"M",operator:"JR-East",
      trainTypes:["Local","Rapid"],calendarType:"holiday",
      sourceRailways:["odpt.Railway:JR-East.Joban",
        "odpt.Railway:JR-East.JobanRapid"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      requireCompatiblePlan:true,
      model:"E531系",
      pngPath:"../images/列车/JR東日本/JR東日本_E531系.png"},
    // JR East Tsurumi regular services changed to E131-1000 fleet in March
    // 2024. These remain scheduled DISPLAY REFERENCES, not observed sets.
    // 2026-11-03 holiday train 2200: Ogimachi 22:10 -> Tsurumi 22:27.
    // The 2026-11-04 weekday 602/605/606 are also published bare numbers.
    // SQL train-run estimates can omit trainOperator even though the exact
    // original JR-East Tsurumi railway URN is present. Admit ONLY that
    // authoritative source-railway namespace; never infer JR-East from a
    // trainNumber or generic model candidate.
    // https://timetables.jreast.co.jp/2611/train/030/030851.html
    // https://timetables.jreast.co.jp/2611/train/010/014271.html
    // https://timetables.jreast.co.jp/2611/train/010/014301.html
    {lineIds:["Tsurumi","TsurumiUmiShibaura","TsurumiOkawa"],
      numberFormat:"bare",from:400,to:2599,suffixes:"",
      trainType:"Local",operator:"JR-East",sourceOperatorFallback:true,
      directionNumberParity:"inbound-even",
      // JR East 2611 published 661u/d timetable, scoped by actual branch.
      // Prior service months retain their original compatibility fallback.
      officialMonth:"2026-11",
      officialMonthNumbers:{"Tsurumi":{"weekday":["501","503","600","601","602","603","604","605","606","607","608","609","610","611","612","700","701","702","703","704","705","706","707","708","709","710","711","712","713","800","801","802","803","804","805","806","807","808","809","810","811","812","813","903","905","906","907","908","909","912","913","1006","1007","1012","1013","1106","1107","1112","1113","1206","1207","1212","1213","1306","1307","1312","1313","1406","1407","1412","1413","1506","1507","1512","1513","1602","1603","1604","1606","1607","1608","1609","1612","1613","1700","1701","1702","1703","1704","1705","1706","1707","1708","1709","1712","1713","1800","1801","1803","1804","1805","1806","1807","1808","1809","1812","1813","1900","1901","1906","1907","1912","1913","2000","2001","2006","2007","2012","2013","2100","2101","2106","2107","2112","2113","2200","2201","2212","2213","2300","2301"],"holiday":["503","505","602","603","604","605","606","607","608","609","702","703","704","705","706","707","708","709","802","803","804","805","806","807","808","809","902","903","904","905","908","909","1004","1005","1008","1009","1104","1105","1108","1109","1204","1205","1208","1209","1304","1305","1308","1309","1404","1405","1408","1409","1504","1505","1508","1509","1600","1601","1602","1604","1605","1608","1609","1700","1701","1702","1703","1704","1705","1708","1709","1800","1801","1802","1803","1804","1805","1808","1809","1900","1902","1903","1904","1905","1909","2000","2001","2002","2003","2004","2005","2100","2101","2104","2105","2200","2201","2300","2301"]},"TsurumiOkawa":{"weekday":["712","713","800","801","809","1706","1707","1807","1808","1913","2012","2013"],"holiday":["704","705","804","1808"]},"TsurumiUmiShibaura":{"weekday":["601","609","700","702","703","705","706","707","711","804","812","813","912","913","1112","1212","1213","1313","1512","1609","1708","1709","1712","1713","1804","1809","1900","1901","2000","2007","2106","2200"],"holiday":["605","706","707","806","807","902","904","905","1104","1204","1205","1305","1504","1604","1605","1704","1705","1802","1803","2005","2104"]}},
      sourceRailways:["odpt.Railway:JR-East.Tsurumi",
        "odpt.Railway:JR-East.TsurumiUmiShibauraBranch",
        "odpt.Railway:JR-East.TsurumiOkawaBranch"],
      validFrom:"2024-03-16",
      model:"E131系1000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E131系_1000番台.png"},
    // 2026-11 JR East Tsurumi B numbers include short branch runs.
    // Official: 661u1 / 661d1 / 661u2 / 661d2. These are published
    // train numbers only; E131-1000 is a route-stock representative PNG.
    // Distinguish three source railways, both calendars and even/odd
    // directions so one branch never inherits another branch's service.
    {lineIds:["Tsurumi"],numberFormat:"full",from:400,to:2599,
      suffixes:"B",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Tsurumi"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      directionNumberParity:"inbound-even",
      weekdayNumbers:["600B","601B","602B","604B","605B","606B","608B","700B","703B","707B","709B","710B","712B","713B","801B","802B","804B","806B","807B","808B","811B","813B","909B","912B","1006B","1013B","1107B","1112B","1206B","1213B","1307B","1312B","1406B","1413B","1507B","1512B","1606B","1608B","1613B","1700B","1702B","1705B","1707B","1709B","1712B","1806B","1808B","1809B","1813B","1901B","1907B","1912B","2000B","2013B","2101B","2112B","2200B","2213B"],
      holidayNumbers:["604B","606B","702B","705B","706B","707B","803B","804B","807B","808B","909B","1005B","1008B","1104B","1109B","1205B","1208B","1304B","1309B","1405B","1408B","1504B","1509B","1605B","1608B","1700B","1703B","1704B","1709B","1801B","1802B","1805B","1808B","1902B","1903B","2003B","2101B","2200B"],
      model:"E131系1000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E131系_1000番台.png"},
    {lineIds:["TsurumiUmiShibaura"],numberFormat:"full",from:400,to:2599,
      suffixes:"B",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.TsurumiUmiShibauraBranch"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      directionNumberParity:"inbound-even",
      weekdayNumbers:["600B","601B","608B","710B","813B","912B","1013B","1312B","1413B","1608B","1613B","1705B","1712B","1808B","1901B","2101B"],
      holidayNumbers:["604B","706B","707B","803B","1005B","1304B","1405B","1605B","1703B","1704B","1802B","1902B","1903B"],
      model:"E131系1000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E131系_1000番台.png"},
    {lineIds:["TsurumiOkawa"],numberFormat:"full",from:400,to:2599,
      suffixes:"B",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.TsurumiOkawaBranch"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      directionNumberParity:"inbound-even",
      weekdayNumbers:["712B","713B","808B","1709B","1806B","1912B"],
      holidayNumbers:["705B","1709B"],
      model:"E131系1000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E131系_1000番台.png"},
    // 2026 scheduled Chuo limited express: 1M (Azusa 1),
    // 3107M (Kaiji 7), 2107M (Fuji Excursion 7), 5003M (Azusa 3).
    // These intervals overlap M-number ordinary trains, so require the
    // explicit LimitedExpress train type. Special 8xxx/9xxx services retain
    // their separate date-restricted published reference rules.
    {lineIds:["ChuoRapid","ChuoMain"],numberFormat:"full",
      from:1,to:60,suffixes:"M",trainType:"LimitedExpress",
      model:"E353系",
      pngPath:"../images/列车/JR東日本/JR東日本_E353系.png"},
    {lineIds:["ChuoRapid","ChuoMain"],numberFormat:"full",
      from:2101,to:2199,suffixes:"M",trainType:"LimitedExpress",
      model:"E353系",
      pngPath:"../images/列车/JR東日本/JR東日本_E353系.png"},
    {lineIds:["ChuoRapid","ChuoMain"],numberFormat:"full",
      from:3101,to:3199,suffixes:"M",trainType:"LimitedExpress",
      model:"E353系",
      pngPath:"../images/列车/JR東日本/JR東日本_E353系.png"},
    {lineIds:["ChuoRapid","ChuoMain"],numberFormat:"full",
      from:5001,to:5099,suffixes:"M",trainType:"LimitedExpress",
      model:"E353系",
      pngPath:"../images/列车/JR東日本/JR東日本_E353系.png"}
  ];
  rows.forEach(function(row){
    Object.freeze(row.lineIds);
    if(row.sourceRailwaysIfPresent)Object.freeze(row.sourceRailwaysIfPresent);
    if(row.trainTypesIfPresent)Object.freeze(row.trainTypesIfPresent);
    if(row.publishedNumbers)Object.freeze(row.publishedNumbers);
    if(row.weekdayNumbers)Object.freeze(row.weekdayNumbers);
    if(row.holidayNumbers)Object.freeze(row.holidayNumbers);
    if(row.officialMonthNumbers){
      Object.keys(row.officialMonthNumbers).forEach(function(lineKey){
        var sets=row.officialMonthNumbers[lineKey];
        Object.freeze(sets.weekday);Object.freeze(sets.holiday);Object.freeze(sets);
      });
      Object.freeze(row.officialMonthNumbers);
    }
    Object.freeze(row);
  });
  Object.freeze(rows);
  // Official JR East November 2026: this SVG Joetsu line spans
  // two disjoint rolling-stock areas. The 296 timetable also includes
  // Hokuhoku HK100 M services and Iiyama D trains: never infer E129 from M.
  var joetsuSouthNumbers=new Set(rows.filter(function(r){
    return r.lineIds.length===1&&r.lineIds[0]==="Takasaki"&&
      r.from===420&&r.to===758&&r.publishedNumbers;
  }).reduce(function(a,r){return a.concat(r.publishedNumbers);},[]));
  var joetsuNorthDown=new Set(["1721M","1723M","1725M","1727M",
    "1729M","1731M","1735M","1737M","1739M","1741M","1743M",
    "1745M","1747M","1749M","1751M"]);
  var joetsuNorthUp=new Set(["1720M","1722M","1724M","1726M",
    "1728M","1732M","1734M","1736M","1738M","1740M","1742M",
    "1744M","1746M","1748M","1750M","1752M"]);
  var joetsuSouthStops=new Set(["Takasaki","Takasaki-Tonyamachi","Ino",
    "Shin-Maebashi","Gunma-Soja","Yagihara","Shibukawa","Shikishima",
    "Tsukuda","Iwamoto","Numata","Gokan","Kamimoku","Minakami"]);
  var joetsuNorthStops=new Set(["Minakami","Yubiso","Doai","Tsuchitaru",
    "Echigo-Nakazato","Iwahara-Ski-Jo-Mae","Echigo-Yuzawa","Ishiuchi",
    "Osawa","Joetsu-Ski-Jo-Mae","Shiozawa","Muikamachi","Itsukamachi",
    "Urasa","Yairo","Koide","Echigo-Horinouchi","Kita-Horinouchi",
    "Echigo-Kawaguchi","Ojiya","Echigo-Takaya","Miyauchi","Nagaoka"]);
  var joetsuShuKura=Object.freeze({
    "9780D":{days:["01","02","03"],dir:"Inbound",name:"あかねShu＊Kura"},
    "9783D":{days:["01","02","03"],dir:"Outbound",name:"あかねShu＊Kura"},
    "9762D":{days:["06","09"],dir:"Inbound",name:"ゆざわShu＊Kura"},
    "9765D":{days:["06","09"],dir:"Outbound",name:"ゆざわShu＊Kura"},
    "9781D":{days:["07","08"],dir:"Outbound",name:"摂田屋Shu＊Kura"},
    "9782D":{days:["07","08"],dir:"Inbound",name:"摂田屋Shu＊Kura"},
    "8124D":{days:["20","21","27","28","29"],dir:"Inbound",name:"越乃Shu＊Kura"},
    "8133D":{days:["20","21","27","28","29"],dir:"Outbound",name:"越乃Shu＊Kura"}
  });
  function verifyJoetsuService(p){
    // Authoritative number, calendar, model and art are signed off by
    // the SQL-backed train-runs response. Never use a local numbered list
    // as an alternative to missing canonical database train records.
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Joetsu"||proof.referenceOnly!==true||
       proof.actualVehicleConfirmed!==false)return null;
    if(String(p.positionLineId||p.lineId||"")!=="Joetsu"||
       String(p.displayLineId||"Joetsu")!=="Joetsu"||
       p.sourceRailway!=="odpt.Railway:JR-East.Joetsu")return null;
    var operator=String(p.trainOperator||p.operator||"");
    if(operator&&operator!=="JR-East"&&operator!=="odpt.Operator:JR-East")return null;
    var number=String(p.trainNumber||"").trim().toUpperCase();
    if(proof.trainNumber!==number||proof.serviceDate!==p.serviceDate||
       String(proof.direction||"").split(/[.:]/).pop()!==
         String(p.railDirection||"").split(/[.:]/).pop())return null;
    var day=String(p.serviceDate||"").slice(0,10);
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    var cal=sourceCalendar(p),dow=new Date(day+"T12:00:00Z").getUTCDay();
    var holiday=dow===0||dow===6||day==="2026-11-03"||day==="2026-11-23";
    if(cal!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday"))
      return null;
    var stops=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[])
      .map(function(s){return String(s||"").split(".").pop();}).filter(Boolean);
    if(stops.length<2||new Set(stops).size<2)return null;
    var north=proof.segmentKey==="north"&&
      stops.every(function(x){return joetsuNorthStops.has(x);})&&
      stops.some(function(x){return x!=="Minakami";});
    var south=proof.segmentKey==="south"&&
      stops.every(function(x){
        return joetsuSouthStops.has(x)||
          // A source-verified Joetsu segment may be the same physical
          // timetable as a longer Agatsuma through service.
          x==="Naganohara-Kusatsuguchi"||x==="Kawahara-yu-Onsen"||
          x==="Iwashima"||x==="Yakura"||x==="Gohara"||
          x==="Gunma-Haramachi"||x==="Nakanojo"||x==="Ichishiro"||
          x==="Onogami-Onsen"||x==="Onogami"||x==="Sohijima"||
          x==="Kanashima"||x==="Gunma-Otsu"||x==="Haneo"||
          x==="Fukurogura"||x==="Manza-Kazawaguchi"||x==="Omae";
      })&&stops.filter(function(x){return joetsuSouthStops.has(x);}).length>=2;
    if(!north&&!south)return null;
    var localSouth=south&&proof.model==="211系（高崎地区）"&&
      proof.trainType==="odpt.TrainType:JR-East.Local"&&
      proof.pngReference==="../images/列车/JR東日本/JR東日本_211系_湘南色.png";
    var normal=north&&proof.model==="E129系"&&
      proof.trainType==="odpt.TrainType:JR-East.Local"&&
      proof.pngReference==="../images/列车/JR東日本/JR東日本_E129系.png";
    var resort=north&&proof.model==="キハ40・48形（越乃Shu＊Kura）"&&
      proof.trainType==="odpt.TrainType:JR-East.Rapid"&&
      proof.pngReference==="../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png";
    if(!normal&&!resort&&!localSouth)return null;
    var t=String(p.trainType||"").split(/[.:]/).pop();
    if(t!==((normal||localSouth)?"Local":"Rapid")&&
       !(resort&&t==="Local"&&p.positionSource==="supabase-train-run"))
      return null;
    return Object.freeze({
      number:number,kind:normal?"north":localSouth?"south":"shukura",
      model:proof.model,trainType:normal||localSouth?"Local":"Rapid",
      serviceName:proof.serviceName||"",
      pngPath:proof.pngReference,referenceOnly:true,
      actualVehicleConfirmed:false,edition:"2611"
    });
  }
  // Kamaishi 2611: the complete published NUMBER roster and PNG
  // numeric range are SQL rows served by train-runs. No hardcoded train
  // number or date can authorize a reference fleet without that proof.
  function verifyKamaishiService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Kamaishi"||proof.referenceOnly!==true||
       proof.actualVehicleConfirmed!==false||proof.segmentKey!=="full"||
       !String(proof.officialSourceUrl||"").startsWith(
         "https://timetables.jreast.co.jp/2611/"))return null;
    if(String(p.positionLineId||p.lineId||"")!=="Kamaishi"||
       String(p.displayLineId||"Kamaishi")!=="Kamaishi"||
       p.sourceRailway!=="odpt.Railway:JR-East.Kamaishi")return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-East"&&op!=="odpt.Operator:JR-East")return null;
    var num=String(p.trainNumber||"").trim().toUpperCase();
    if(proof.trainNumber!==num||proof.serviceDate!==p.serviceDate||
       String(proof.direction||"").split(/[.:]/).pop()!==
         String(p.railDirection||"").split(/[.:]/).pop())return null;
    var day=String(p.serviceDate||"").slice(0,10);
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day))return null;
    var holiday=[0,6].indexOf(new Date(day+"T12:00:00Z").getUTCDay())>=0||
      day==="2026-11-03"||day==="2026-11-23";
    if(sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday"))return null;
    var stops=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[])
      .map(function(z){return String(z||"").split(".").pop();}).filter(Boolean);
    if(stops.length<2||new Set(stops).size<2)return null;
    // Historical source can contain a believable same-number train on
    // another corridor. The SQL endpoint also validates station URNs.
    var onLine=new Set(["Hanamaki","Nitanai","Shin-Hanamaki","Oyamada",
      "Tsuchizawa","Haruyama","Iwanebashi","Miyamori","Kashiwagidaira",
      "Masuzawa","Arayamae","Iwate-Futsukamachi","Ayaori","Tono",
      "Aozasa","Iwate-Kamigo","Hirakura","Ashigase","Kami-Arisu",
      "Rikuchu-Ohashi","Dosen","Matsukura","Kosano","Kamaishi"]);
    // Only the API may grant intermediate TohokuMain stations, after
    // an exact SQL canonical through pair + source/calendar match.
    var verifiedThrough=proof.verifiedTohokuThrough===true;
    var tohoku=new Set(["Morioka","Iwate-Iioka","Yahaba",
      "Furudate","Hizume","Ishidorii","Hanamaki-Kuko"]);
    if(stops.filter(function(z){return onLine.has(z);}).length<2||
       !stops.every(function(z){
         return onLine.has(z)||z==="Morioka"||
           (verifiedThrough&&tohoku.has(z));
       }))return null;
    var normal=proof.model==="HB-E220系"&&
      proof.pngReference==="../images/列车/JR東日本/JR東日本_HB-E220系.png";
    var hinabi=proof.model==="HB-E300系（ひなび）"&&
      proof.pngReference==="../images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png";
    if(!normal&&!hinabi)return null;
    var type=String(p.trainType||"").split(/[.:]/).pop();
    var publishedType=String(proof.trainType||"").split(/[.:]/).pop();
    if(type!==publishedType|| (hinabi&&publishedType!=="Rapid")||
       (normal&&publishedType!=="Local"&&publishedType!=="Rapid"))return null;
    return Object.freeze({number:num,kind:hinabi?"hinabi":
      publishedType==="Rapid"?"hamayuri":"local",
      model:proof.model,serviceName:proof.serviceName||"",
      trainType:publishedType,pngPath:proof.pngReference,
      referenceOnly:true,actualVehicleConfirmed:false,edition:"2611"});
  }
  // Kashima: the official JR 2611 service number, exact 11/7 swap,
  // calendar, six scheduled stops and fleet family are first checked
  // in the SQL Edge endpoint. This JS only validates the returned proof.
  function verifyKashimaService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Kashima"||proof.referenceOnly!==true||
       proof.actualVehicleConfirmed!==false||
       !String(proof.officialSourceUrl||"").startsWith(
         "https://timetables.jreast.co.jp/2611/"))return null;
    if(String(p.positionLineId||p.lineId||"")!=="Kashima"||
       String(p.displayLineId||"Kashima")!=="Kashima"||
       p.sourceRailway!=="odpt.Railway:JR-East.Kashima")return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-East"&&op!=="odpt.Operator:JR-East")return null;
    var num=String(p.trainNumber||"").trim().toUpperCase();
    var day=String(p.serviceDate||"").slice(0,10);
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day)||
       num!==proof.trainNumber||day!==proof.serviceDate)return null;
    var dir=String(p.railDirection||"").split(/[.:]/).pop();
    if(dir!==String(proof.direction||"").split(/[.:]/).pop())return null;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var holiday=dow===0||dow===6||day==="2026-11-03"||day==="2026-11-23";
    if(sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday"))
      return null;
    if(String(p.trainType||"").split(/[.:]/).pop()!=="Local"||
       proof.trainType!=="odpt.TrainType:JR-East.Local")return null;
    var south=["Sawara","Katori","Junikyo","Itako",
      "Nobukata","Kashimajingu"];
    var expected=dir==="Outbound"?south:south.slice().reverse();
    var stops=Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[];
    var st=stops.map(function(x){return String(x||"").split(".").pop();});
    if(st.length!==6||st.some(function(k,i){return k!==expected[i];})||
       proof.routeFrom!==expected[0]||
       proof.routeTo!==expected[expected.length-1])return null;
    var e131=proof.model==="E131系0番台 / 80番台"&&
       proof.segmentKey==="e131_family"&&
       proof.pngReference==="../images/列车/JR東日本/JR東日本_E131系_0番台.png";
    var e235=proof.model==="E235系1000番台"&&
       proof.segmentKey==="e235_through"&&
       proof.pngReference==="../images/列车/JR東日本/JR東日本_E235系_1000番台.png";
    var mixed=!proof.model&&!proof.pngReference&&
       proof.segmentKey==="mixed_unresolved";
    if(!e131&&!e235&&!mixed)return null;
    return Object.freeze({number:num,kind:mixed?"mixed_unresolved":
      e235?"e235_through":"e131_family",model:proof.model||"",
      pngPath:proof.pngReference||"",trainType:"Local",
      edition:"2611",referenceOnly:true,actualVehicleConfirmed:false,
      stopClockStatus:proof.stopClockStatus||"number_only"});
  }
  // Kesennuma 2611: the historical SQL name covers RAIL D numbers and
  // BRT K numbers. Only an SQL-issued proof for Maeyachi–Yanagitsu may
  // authorize the KiHa110 fleet illustration. No BRT route/icon guessing.
  function verifyKesennumaRailService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Kesennuma"||
       proof.segmentKey!=="maeyachi_yanagitsu_rail"||
       proof.transportMode!=="rail"||
       proof.excludedTransportMode!=="BRT"||
       proof.referenceOnly!==true||
       proof.actualVehicleConfirmed!==false||
       !String(proof.officialSourceUrl||"").startsWith(
          "https://timetables.jreast.co.jp/2611/timetable-v/267"))
      return null;
    if(String(p.positionLineId||p.lineId||"")!=="Kesennuma"||
       String(p.displayLineId||"Kesennuma")!=="Kesennuma"||
       p.sourceRailway!=="odpt.Railway:JR-East.Kesennuma")return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-East"&&op!=="odpt.Operator:JR-East")return null;
    var number=String(p.trainNumber||"").toUpperCase().trim();
    var day=String(p.serviceDate||"").slice(0,10);
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day)||
       !/^(?:9(?:2[1-9]|3[0-5])|29(?:2[6-9]|3[0-8]))D$/.test(number)||
       number!==proof.trainNumber||day!==proof.serviceDate)return null;
    if(["2026-11-04","2026-11-05","2026-11-06"].indexOf(day)>=0&&
       ["2927D","2930D","928D","929D"].indexOf(number)>=0)
      return null;
    var dir=String(p.railDirection||"").split(/[.:]/).pop();
    if(!["Outbound","Inbound"].includes(dir)||
       dir!==String(proof.direction||"").split(/[.:]/).pop())return null;
    var holiday=[0,6].indexOf(new Date(day+"T12:00:00Z").getUTCDay())>=0||
       day==="2026-11-03"||day==="2026-11-23";
    if(sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday"))
      return null;
    if(String(p.trainType||"").split(/[.:]/).pop()!=="Local"||
       proof.trainType!=="odpt.TrainType:JR-East.Local")return null;
    var route=["Maeyachi","Wabuchi","Nonodake",
       "Rikuzen-Toyosato","Mitakedo","Yanagitsu"];
    var expected=dir==="Outbound"?route:route.slice().reverse();
    var listed=Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[];
    if(listed.length!==6||
       listed.some(function(u,i){
         return String(u||"").split(".").pop()!==expected[i];
       })||
       proof.routeFrom!==expected[0]||
       proof.routeTo!==expected[5])return null;
    if(proof.model!=="キハ110系"||
       proof.pngReference!==
         "../images/列车/JR東日本/JR東日本_キハ110系.png")return null;
    return Object.freeze({number:number,kind:"local_rail",
      model:proof.model,pngPath:proof.pngReference,trainType:"Local",
      edition:"2611",referenceOnly:true,actualVehicleConfirmed:false,
      railwayFrom:proof.routeFrom,railwayTo:proof.routeTo,
      stopClockStatus:proof.stopClockStatus});
  }
  // Komii 2611: exact SQL number/date/route proof. Normal KiHa110
  // vs hybrid E200 is ambiguous per service -> NO illustration.
  // HIGH RAIL 1375 has one named SERVICE-family PNG; never actual carset.
  function verifyKomiiService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Komii"||proof.referenceOnly!==true||
       proof.actualVehicleConfirmed!==false||
       !String(proof.officialSourceUrl||"").startsWith(
         "https://timetables.jreast.co.jp/2611/timetable-v/228"))
      return null;
    if(String(p.positionLineId||p.lineId||"")!=="Komii"||
       String(p.displayLineId||"Komii")!=="Komii"||
       p.sourceRailway!=="odpt.Railway:JR-East.Komii")return null;
    var operator=String(p.trainOperator||p.operator||"");
    if(operator&&operator!=="JR-East"&&operator!=="odpt.Operator:JR-East")
      return null;
    var day=String(p.serviceDate||"").slice(0,10),
      number=String(p.trainNumber||"").toUpperCase().trim(),
      direction=String(p.railDirection||"").split(/[.:]/).pop();
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day)||
       proof.trainNumber!==number||proof.serviceDate!==day||
       !/^\d+D$/.test(number)||
       !["Outbound","Inbound"].includes(direction)||
       String(proof.direction||"").split(/[.:]/).pop()!==direction)return null;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var holiday=dow===0||dow===6||day==="2026-11-03"||day==="2026-11-23";
    if(sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday"))
      return null;
    var trainType=String(p.trainType||"").split(/[.:]/).pop();
    if(proof.trainType!=="odpt.TrainType:JR-East."+trainType||
       !["Local","Rapid"].includes(trainType))return null;
    var order=["Kobuchizawa","Kai-Koizumi","Kai-Oizumi","Kiyosato",
      "Nobeyama","Shinano-Kawakami","Saku-Hirose",
      "Saku-Uminokuchi","Umijiri","Matsubarako","Koumi",
      "Managashi","Takaiwa","Yachiho","Kaise","Haguroshita",
      "Aonuma","Usuda","Tatsuokajo","Otabe","Nakagomi",
      "Namezu","Kita-Nakagomi","Iwamurada","Sakudaira",
      "Nakasato","Misato","Mitsuoka","Otome","Higashi-Komoro",
      "Komoro"];
    var stops=Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[];
    var stations=stops.map(function(x){return String(x||"").split(".").pop();});
    var indices=stations.map(function(x){return order.indexOf(x);});
    if(indices.length<2||indices.some(function(x,i){
      return x<0||(i>0&&(direction==="Outbound"
        ?x<=indices[i-1]:x>=indices[i-1]));
    })||stations[0]!==proof.routeFrom||
       stations[stations.length-1]!==proof.routeTo)return null;
    var hasSouth=indices.some(function(x){return x<=4;});
    var hasNorth=indices.some(function(x){return x>=10;});
    if(hasSouth&&hasNorth&&proof.rockfallCleared!==true)return null;
    var work=["2026-11-17","2026-11-18","2026-11-19"].includes(day);
    if(work){
      if(["227D","228D"].includes(number))return null;
      if(["225D","226D","229D","230D"].includes(number)){
        if(proof.operationalScope!=="partial_construction_official_2611"||
           stations[0]!==(direction==="Outbound"?"Koumi":"Komoro")||
           stations[stations.length-1]!==
             (direction==="Outbound"?"Komoro":"Koumi"))return null;
      }
    }
    var isHigh=proof.isHighRail===true,
      highNumbers=["8221D","8222D","8223D"];
    if(isHigh){
      var dates=["01","02","03","06","07","08","09","13","14","15","16",
        "20","21","22","23","27","28","29","30"].map(function(x){
          return "2026-11-"+x;
        });
      if(trainType!=="Rapid"||!highNumbers.includes(number)||
         !dates.includes(day)||day<="2026-11-09"||
         proof.segmentKey!=="highrail1375_official"||
         proof.model!=="キハ100・110系（HIGH RAIL 1375）"||
         proof.pngReference!==
           "../images/列车/JR東日本/JR東日本_キハ100・110系_HIGH_RAIL_1375.png")
        return null;
    }else if(proof.isHighRail!==false||trainType!=="Local"||
      proof.segmentKey!=="regular_mixed_unresolved"||
      proof.model||proof.pngReference||
      !Array.isArray(proof.plannedCandidates)||
      proof.plannedCandidates.length!==2||
      !proof.plannedCandidates.includes("キハ110系（小海線）")||
      !proof.plannedCandidates.includes("キハE200形"))
      return null;
    return Object.freeze({number:number,kind:isHigh?"highrail":"mixed_regular",
      model:isHigh?proof.model:"",pngPath:isHigh?proof.pngReference:"",
      trainType:trainType,isHighRail:isHigh,edition:"2611",
      representativeOnly:true,actualVehicleConfirmed:false,
      stopClockStatus:proof.stopClockStatus||"published_number_route_only",
      operationalScope:proof.operationalScope||"scheduled_rail_plan"});
  }
  // SQL positions can provide the calendar as an ODPT serviceId rather
  // than a normalized calendarType. Read the timetable source first;
  // never infer a service calendar from the last two train-number digits.
  function sourceCalendar(context){
    var raw=String(context&&(context.calendarType||context.serviceId||
      context.timetableCalendar)||"");
    return raw==="weekday"||/(?:^|[.:])Weekday$/.test(raw)?"weekday":
      raw==="holiday"||/(?:^|[.:])(?:SaturdayHoliday|Saturday|Holiday|Sunday)$/.test(raw)
        ?"holiday":"";
  }
  // JR-WEST OitoWest: correct 300-series orange/red diesel family,
  // 19 official 4xxD numbers, but just 14 legacy 3-stop SQL services.
  // All original clocks are historical and only the southern three
  // stations have source clocks: never call them a full JR-West diagram.
  // No suitable KiHa120 Oito orange/red PNG in gallery, so icon=null.
  function verifyOitoWestService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jrwest-2611-number-roster"||
       proof.lineId!=="OitoWest"||
       proof.scope!=="jr_west_minami_otari_itoigawa_partial"||
       proof.sourceScope!=="historical_three_station_partial"||
       proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
       String(p.positionLineId||p.lineId||"")!=="OitoWest"||
       (p.displayLineId&&p.displayLineId!=="OitoWest")||
       p.sourceRailway!=="odpt.Railway:JR-West.Oito"||
       p.positionSource!=="supabase-train-run")return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-West"&&op!=="odpt.Operator:JR-West")return null;
    var n=String(p.trainNumber||"").trim().toUpperCase(),
       day=String(p.serviceDate||"").slice(0,10),
       m=/^([0-9]{3})D$/.exec(n);
    if(!m||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day)||
       proof.trainNumber!==n||proof.serviceDate!==day||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0||
       proof.model!=="キハ120形300番台（大糸線・岡山色）"||
       proof.pngReference!==null||
       proof.stopClockStatus!=="historical_partial_not_2611_verified"||
       !/^https:\/\/timetable\.jr-odekake\.net\/line-timetable\/284[56]$/.test(
          String(proof.officialSourceUrl||"")))return null;
    var direction=String(p.railDirection||"").split(/[.:]/).pop(),
        typ=String(p.trainType||"").split(/[.:]/).pop(),
        inbound=direction==="Inbound";
    if(!["Inbound","Outbound"].includes(direction)||
       typ!=="Local"||
       String(proof.trainType||"")!=="odpt.TrainType:JR-West.Local"||
       String(proof.direction||"").split(/[.:]/).pop()!==direction||
       Number(m[1])%2!==(inbound?0:1)||
       proof.officialSourceUrl.slice(-4)!==(inbound?"2846":"2845"))
       return null;
    var up=new Set(["422D","426D","428D","430D",
                     "432D","434D","438D"]),
        down=new Set(["423D","425D","427D","429D",
                       "431D","433D","437D"]);
    if(!(inbound?up:down).has(n))return null;
    var dow=new Date(day+"T12:00:00Z").getUTCDay(),
      holiday=dow===0||dow===6||day==="2026-11-03"||day==="2026-11-23";
    if(sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday"))
      return null;
    if(day==="2026-11-08"&&["429D","430D"].includes(n))return null;
    if((Array.isArray(proof.excludedDates)?proof.excludedDates:[])
       .some(function(d){return String(d).slice(0,10)===day;}))return null;
    var expected=inbound?["Kita-Otari","Nakatsuchi","Minami-Otari"]:
       ["Minami-Otari","Nakatsuchi","Kita-Otari"];
    var given=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[])
      .map(function(x){return String(x||"").split(".").pop();});
    var original=proof.sourceStopKeys;
    if(given.length!==3||!Array.isArray(original)||original.length!==3||
       given.some(function(x,i){return x!==expected[i]||x!==original[i];}))
       return null;
    return Object.freeze({number:n,kind:"historical_three_station_partial",
      model:proof.model,pngPath:null,edition:"2611",
      sourceTemplateId:Number(proof.sourceTemplateId),
      referenceOnly:true,actualVehicleConfirmed:false});
  }
  // 大糸線 JR EAST ONLY: Matsumoto–Minami-Otari.
  // The frontend's separate JR-WEST diesel/bus implementation is NOT
  // part of this number/PNG authority. Verified source-template stop
  // keys and dated SQL proof are mandatory. Gallery model = reference,
  // never a physical carset, and historical stop clocks are not 2611.
  function verifyOitoEastService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Oito"||
       proof.scope!=="jr_east_matsumoto_minami_otari"||
       proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
       String(p.positionLineId||p.lineId||"")!=="Oito"||
       (p.displayLineId&&p.displayLineId!=="Oito")||
       p.sourceRailway!=="odpt.Railway:JR-East.Oito"||
       p.positionSource!=="supabase-train-run")return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-East"&&op!=="odpt.Operator:JR-East")return null;
    var n=String(p.trainNumber||"").trim().toUpperCase(),
      day=String(p.serviceDate||"").slice(0,10),
      number=/^([0-9]+)([MD])$/.exec(n);
    if(!number||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day)||
       proof.trainNumber!==n||proof.serviceDate!==day||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0||
       proof.stopClockStatus!=="historical_not_2611_verified"||
       !/^https:\/\/timetables\.jreast\.co\.jp\/2611\/timetable-v\/230[du][12]\.html$/.test(
         String(proof.officialSourceUrl||""))||
       !Array.isArray(proof.sourceStopKeys))return null;
    var dir=String(p.railDirection||"").split(/[.:]/).pop(),
      type=String(p.trainType||"").split(/[.:]/).pop();
    if(!["Inbound","Outbound"].includes(dir)||
       Number(number[1])%2!==(dir==="Inbound"?0:1)||
       String(proof.direction||"").split(/[.:]/).pop()!==dir||
       String(proof.trainType||"").split(/[.:]/).pop()!==type)return null;
    var dow=new Date(day+"T12:00:00Z").getUTCDay(),
      holiday=dow===0||dow===6||day==="2026-11-03"||day==="2026-11-23";
    if(sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday")||
       proof.officialSourceUrl.slice(-7)!==
         (dir==="Inbound"?"u":"d")+(holiday?"2":"1")+".html")return null;
    var kind=String(proof.serviceKind||""),
      model=proof.model==null?null:String(proof.model),
      png=proof.pngReference==null?null:String(proof.pngReference);
    var approved=new Map([
      ["211系（長野地区）","../images/列车/JR東日本/JR東日本_211系_長野色.png"],
      ["E127系100番台","../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png"],
      ["E353系","../images/列车/JR東日本/JR東日本_E353系.png"],
      ["HB-E300系（リゾートビューふるさと）",
       "../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png"]
    ]);
    if(model===null?(png!==null||n!=="5232M"||kind!=="regular") :
       (approved.get(model)!==png))return null;
    var active=(Array.isArray(proof.operatingDates)?proof.operatingDates:[])
      .map(function(d){return String(d).slice(0,10);});
    var resort=["2026-11-01","2026-11-02","2026-11-03",
      "2026-11-06","2026-11-08","2026-11-09",
      "2026-11-13","2026-11-14","2026-11-15","2026-11-16",
      "2026-11-20","2026-11-21","2026-11-22","2026-11-23",
      "2026-11-27","2026-11-28","2026-11-29","2026-11-30"];
    var hakuba=["2026-11-01","2026-11-21","2026-11-22","2026-11-23"];
    function exactDates(expected){
      return active.length===expected.length&&
        active.every(function(d){return expected.indexOf(d)>=0;})&&
        expected.indexOf(day)>=0;
    }
    if(kind==="resort_furusato"){
      if(!["8361D","8362D"].includes(n)||type!=="Rapid"||
         model!=="HB-E300系（リゾートビューふるさと）"||
         !exactDates(resort))return null;
    }else if(kind==="hakuba_limited"){
      if(!["8041M","8042M"].includes(n)||type!=="LimitedExpress"||
         model!=="E353系"||!exactDates(hakuba))return null;
    }else if(kind==="hakuba_local"){
      if(!["8352M","8353M"].includes(n)||type!=="Local"||
         model!=="E127系100番台"||!exactDates(hakuba))return null;
    }else if(kind==="regular"){
      if(number[2]!=="M"||n==="9095M"||
         ["8041M","8042M","8352M","8353M"].includes(n)||
         active.length!==0)return null;
      var isExpress=n==="5M"||n==="38M",
        isRapid=n==="3220M"||n==="5356M";
      if(type!==(isExpress?"LimitedExpress":isRapid?"Rapid":"Local")||
         (isExpress&&model!=="E353系")||
         (n==="3220M"&&model!=="211系（長野地区）")||
         (n==="5356M"&&model!=="E127系100番台")||
         (!isExpress&&!isRapid&&model==="E353系"))
        return null;
    }else return null;
    var allowed=new Set(["Azumi-Kutsukake","Azumi-Oiwake",
      "Azusabashi","Chikuni","Hakuba","Hakuba-Oike","Hakuyacho",
      "Hitoichiba","Hosono","Hotaka","Iimori","Inao","Kamishiro",
      "Kita-Hosono","Kita-Matsumoto","Kita-Omachi","Matsumoto",
      "Minami-Kamishiro","Minami-Omachi","Minami-Otari",
      "Minami-Toyoshina","Nakagaya","Shimatakamatsu","Shimauchi",
      "Shinano-Kizaki","Shinano-Matsukawa","Shinano-Moriue",
      "Shinano-Omachi","Shinano-Tokiwa","Shinshu-Ariake",
      "Toyoshina","Uminoguchi","Yanaba"]);
    var stops=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[])
      .map(function(x){return String(x||"").split(".").pop();});
    if(stops.length<4||stops.length>33||
       stops.length!==proof.sourceStopKeys.length||
       stops.some(function(key,i){
         return !allowed.has(key)||key!==proof.sourceStopKeys[i];
       })||
       proof.railwayFrom!==stops[0]||
       proof.railwayTo!==stops[stops.length-1])return null;
    return Object.freeze({number:n,edition:"2611",
      kind:kind,model:model,pngPath:png,
      sourceTemplateId:Number(proof.sourceTemplateId),
      referenceOnly:true,actualVehicleConfirmed:false});
  }
  // 男鹿線 2611: map a public M number to a representative
  // EV-E801 image ONLY after exact SQL template, weekday/calendar,
  // service-date and all nine surviving Oiwake--Oga stop keys agree.
  // Nov 5 cancellations and Nov 20 1145M changed clocks fail closed.
  // The six published weekday numbers missing from SQL remain in the
  // database catalogue but cannot create invented train positions.
  function verifyOgaService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Oga"||proof.segmentKey!=="oiwake_oga_regular_rail"||
       proof.calendarScope!=="sql_rail_service"||
       proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
       String(p.positionLineId||p.lineId||"")!=="Oga"||
       (p.displayLineId&&p.displayLineId!=="Oga")||
       p.sourceRailway!=="odpt.Railway:JR-East.Oga"||
       p.positionSource!=="supabase-train-run")return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-East"&&op!=="odpt.Operator:JR-East")return null;
    var n=String(p.trainNumber||"").trim().toUpperCase(),
      date=String(p.serviceDate||"").slice(0,10),
      m=/^([0-9]{4})M$/.exec(n);
    if(!m||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       Number(m[1])<1120||Number(m[1])>1149||
       proof.trainNumber!==n||proof.serviceDate!==date||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0||
       proof.stopClockStatus!=="historical_not_2611_verified"||
       proof.model!=="EV-E801系"||
       proof.pngReference!=="../images/列车/JR東日本/JR東日本_EV-E801系.png"||
       !/^https:\/\/timetables\.jreast\.co\.jp\/2611\/timetable-v\/259[du][12]\.html$/.test(
         String(proof.officialSourceUrl||"")))return null;
    var dir=String(p.railDirection||"").split(/[.:]/).pop(),
      type=String(p.trainType||"").split(/[.:]/).pop();
    if(type!=="Local"||
       String(proof.trainType||"").split(/[.:]/).pop()!=="Local"||
       !["Inbound","Outbound"].includes(dir)||
       String(proof.direction||"").split(/[.:]/).pop()!==dir||
       (Number(m[1])%2)!==(dir==="Inbound"?0:1))return null;
    var official=root.JREastOgaNumberIndex202611;
    if(!official||typeof official.verify!=="function"||
       !official.verify(n,p.sourceRailway,p.railDirection,
         p.trainType,sourceCalendar(p),date))return null;
    var dow=new Date(date+"T12:00:00Z").getUTCDay(),
      holiday=dow===0||dow===6||date==="2026-11-03"||
        date==="2026-11-23";
    if(sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday")||
       proof.officialSourceUrl.slice(-7)!==
         (dir==="Inbound"?"u":"d")+(holiday?"2":"1")+".html")return null;
    var six=new Set(["1130M","1132M","1134M","1131M","1133M","1135M"]);
    if((date==="2026-11-05"&&six.has(n))||
       (date==="2026-11-20"&&n==="1145M"))return null;
    var excluded=Array.isArray(proof.excludedDates)?proof.excludedDates:[],
      clockChange=Array.isArray(proof.clockChangeDates)?proof.clockChangeDates:[];
    if(excluded.some(function(d){return String(d).slice(0,10)===date;})||
       clockChange.some(function(d){return String(d).slice(0,10)===date;}))
      return null;
    var out=["Oiwake","Detohama","Kamifutada","Futada","Tenno",
      "Funakoshi","Wakimoto","Hadachi","Oga"];
    var expected=dir==="Inbound"?out.reverse():out,
      scheduled=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[])
        .map(function(x){return String(x||"").split(".").pop();}),
      raw=proof.sourceStopKeys;
    if(!Array.isArray(raw)||raw.length!==9||scheduled.length!==9||
       scheduled.some(function(x,i){return x!==expected[i]||raw[i]!==expected[i];})||
       proof.railwayFrom!==expected[0]||
       proof.railwayTo!==expected[8])return null;
    return Object.freeze({number:n,kind:"regular",model:proof.model,
      pngPath:proof.pngReference,edition:"2611",
      sourceTemplateId:Number(proof.sourceTemplateId),
      referenceOnly:true,actualVehicleConfirmed:false});
  }
  // 2611 大船渡線 rail-only public number proof (not a BRT bus).
  // Regular KiHa110 carries an APPROVED representative PNG; the KiHa100
  // Pokemon two-car tourist stock has NO matching library PNG. Never
  // substitute generic KiHa110 or imply a confirmed individual carset.
  function verifyOfunatoService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Ofunato"||
       proof.segmentKey!=="ichinoseki_kesennuma_rail"||
       !["rail_regular","rail_pokemon"].includes(proof.transportScope)||
       proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
       String(p.positionLineId||p.lineId||"")!=="Ofunato"||
       (p.displayLineId&&p.displayLineId!=="Ofunato")||
       p.sourceRailway!=="odpt.Railway:JR-East.Ofunato"||
       p.positionSource!=="supabase-train-run")return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-East"&&op!=="odpt.Operator:JR-East")return null;
    var n=String(p.trainNumber||"").trim().toUpperCase(),
      day=String(p.serviceDate||"").slice(0,10),
      nm=/^([0-9]{3,4})D$/.exec(n);
    if(!nm||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day)||
       proof.trainNumber!==n||proof.serviceDate!==day||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0||
       proof.stopClockStatus!=="historical_not_2611_verified"||
       !/^https:\/\/timetables\.jreast\.co\.jp\/2611\/timetable-v\/269[du][12]\.html$/.test(
         String(proof.officialSourceUrl||""))||
       !Array.isArray(proof.sourceStopKeys))return null;
    var direction=String(p.railDirection||"").split(/[.:]/).pop(),
      type=String(p.trainType||"").split(/[.:]/).pop();
    if(!["Inbound","Outbound"].includes(direction)||
       String(proof.direction||"").split(/[.:]/).pop()!==direction||
       Number(nm[1])%2!==(direction==="Inbound"?0:1)||
       String(proof.trainType||"").split(/[.:]/).pop()!==type)return null;
    var dow=new Date(day+"T12:00:00Z").getUTCDay(),
      holiday=dow===0||dow===6||
         day==="2026-11-03"||day==="2026-11-23";
    if(sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday")||
       proof.officialSourceUrl.slice(-7)!==
         (direction==="Inbound"?"u":"d")+(holiday?"2":"1")+".html")
      return null;
    var down=["Ichinoseki","Mataki","Rikuchu-Kanzaki","Iwanoshita",
      "Rikuchu-Matsukawa","Geibikei","Shibajuku","Surisawa",
      "Senmaya","Konashi","Yagoshi","Orikabe","Niitsuki","Kesennuma"];
    var pokemonDown=["Ichinoseki","Rikuchu-Matsukawa",
      "Geibikei","Senmaya","Kesennuma"];
    var regularNumbers=new Set(["321D","323D","325D","329D","331D",
      "333D","335D","337D","322D","324D","326D","328D",
      "330D","332D","334D","338D","340D"]);
    var kind=proof.transportScope,pokemon=kind==="rail_pokemon";
    var expected,model,png;
    if(pokemon){
      var pokemonDates=new Set(["2026-11-01","2026-11-03",
        "2026-11-07","2026-11-08","2026-11-14","2026-11-15",
        "2026-11-21","2026-11-22","2026-11-23","2026-11-28",
        "2026-11-29"]);
      if(!holiday||!pokemonDates.has(day)||
         (direction==="Outbound"&&n!=="8327D")||
         (direction==="Inbound"&&n!=="8336D")||
         type!=="Rapid"||
         proof.model!=="キハ100系（POKÉMON with YOU）"||
         proof.pngReference!==null||
         !Array.isArray(proof.operatingDates)||
         proof.operatingDates.length!==pokemonDates.size||
         proof.operatingDates.some(function(d){
           return !pokemonDates.has(String(d).slice(0,10));
         }))return null;
      expected=pokemonDown;
      model=proof.model;png=null;
    }else{
      if(!regularNumbers.has(n)||type!=="Local"||
         proof.model!=="キハ110系"||
         proof.pngReference!==
           "../images/列车/JR東日本/JR東日本_キハ110系（大船渡線）.png"||
         (Array.isArray(proof.operatingDates)&&proof.operatingDates.length))
        return null;
      expected=n==="322D"?down.slice(0,9):down;
      model=proof.model;png=proof.pngReference;
    }
    if(direction==="Inbound")expected=expected.slice().reverse();
    var given=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[])
      .map(function(x){return String(x||"").split(".").pop();});
    if(given.length!==expected.length||
       proof.sourceStopKeys.length!==expected.length||
       given.some(function(st,i){
         return st!==expected[i]||proof.sourceStopKeys[i]!==expected[i];
       }))return null;
    return Object.freeze({number:n,kind:kind,model:model,pngPath:png,
      edition:"2611",sourceTemplateId:Number(proof.sourceTemplateId),
      referenceOnly:true,actualVehicleConfirmed:false});
  }

  // Source-backed fleet options for the JR connection Hazawa–Osaki.
  // 184 old four-stop trips and 628-type 2611 pages do NOT prove the
  // November train clock, actual formation, or model used on this train.
  function verifySotetsuJRService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||
       proof.source!=="sql-jreast-sotetsu-jr-2611-source-candidate"||
       proof.lineId!=="SotetsuJRDirect"||
       String(p.positionLineId||p.lineId||"")!=="SotetsuJRDirect"||
       (p.displayLineId&&p.displayLineId!=="SotetsuJRDirect")||
       p.sourceRailway!=="odpt.Railway:JR-East.SotetsuDirect"||
       p.positionSource!=="supabase-train-run"||
       proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
       proof.numberDateVerified!==false||proof.authorizesPNG!==false||
       proof.stopClockStatus!=="historical_not_2611_verified"||
       proof.fleetSourceUrl!=="https://www.jreast.co.jp/press/2019/20190716.pdf")
      return null;
    var number=String(p.trainNumber||"").trim().toUpperCase(),
      m=/^(1[2-5][0-9]|2[2-8][0-9])M$/.exec(number),
      date=String(p.serviceDate||"").slice(0,10),
      dir=String(p.railDirection||"").split(/[.:]/).pop();
    if(!m||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       !["Northbound","Southbound"].includes(dir)||
       Number(m[1])%2!==(dir==="Northbound"?0:1)||
       proof.trainNumber!==number||proof.serviceDate!==date||
       proof.direction!=="odpt.RailDirection:"+dir||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0||
       String(p.trainType||"").split(/[.:]/).pop()!=="Local"||
       proof.trainType!=="odpt.TrainType:JR-East.Local")return null;
    var operator=String(p.trainOperator||p.operator||"");
    if(operator&&operator!=="JR-East"&&
       operator!=="odpt.Operator:JR-East")return null;
    var dow=new Date(date+"T12:00:00Z").getUTCDay(),
      holiday=dow===0||dow===6||date==="2026-11-03"||
        date==="2026-11-23",
      calendar=sourceCalendar(p),
      calendarUrn="odpt.Calendar:"+
        (holiday?"SaturdayHoliday":"Weekday"),
      publishedPage="https://timetables.jreast.co.jp/2611/timetable-v/628"+
        (dir==="Northbound"?"d":"u")+(holiday?"2":"1")+"p.html";
    if(calendar!==(holiday?"holiday":"weekday")||
       proof.calendar!==calendarUrn||
       proof.timetableIndexUrl!==publishedPage)return null;
    var officialNumberIndex=root.JREastSotetsuJRDirectNumbers2611,
      officialNumber=officialNumberIndex&&typeof officialNumberIndex.match==="function"
        ?officialNumberIndex.match(p):null;
    if(officialNumberIndex&&!officialNumber)return null;
    var north=["HazawaYokohamaKokudai","MusashiKosugi","NishiOi","Osaki"],
      expected=dir==="Northbound"?north:north.slice().reverse(),
      stops=Array.isArray(p.scheduledStopKeys)
        ?p.scheduledStopKeys.map(function(x){return String(x||"").split(".").pop();})
        :[],
      sourceStops=proof.sourceStopKeys;
    if(!Array.isArray(sourceStops)||sourceStops.length!==4||
       stops.length!==4||stops.some(function(s,i){
         return s!==expected[i]||sourceStops[i]!==expected[i];
       }))return null;
    var models=["E233系7000番台","相鉄12000系"],
      paths=["../images/列车/JR東日本/JR東日本_E233系_7000番台.png",
        "../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png"];
    if(!Array.isArray(proof.candidateModels)||
       !Array.isArray(proof.candidateAssets)||
       proof.candidateModels.join("|")!==models.join("|")||
       proof.candidateAssets.join("|")!==paths.join("|"))return null;
    return Object.freeze({
      lineId:"SotetsuJRDirect",trainNumber:number,
      candidateModels:Object.freeze(models),
      candidateAssets:Object.freeze(paths),
      sourceTemplateId:Number(proof.sourceTemplateId),
      referenceOnly:true,actualVehicleConfirmed:false,
      authorizesPNG:false,numberDateVerified:false,formationId:null,
      publishedNumberOnly:!!officialNumber,
      officialNumberVerified:!!officialNumber,
      officialSourceUrl:officialNumber&&officialNumber.officialSourceUrl||"",
      numberBands:officialNumber&&officialNumber.numberBands||[]
    });
  }
  // JR-West Kosei 179 M/MH source-only services. The weekend H is
  // calendar metadata, NEVER an actual train operating code or model.
  // 9017DH is a seasonal special D-train source misfiled as Local; do
  // not convert it to an ordinary electric car or a current 2611 run.
  function verifyKoseiSourceFleet(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||
       proof.source!=="sql-jrwest-kosei-2611-source-family"||
       proof.lineId!=="Kosei"||
       String(p.positionLineId||p.lineId||"")!=="Kosei"||
       (p.displayLineId&&p.displayLineId!=="Kosei")||
       p.sourceRailway!=="odpt.Railway:JR-West.Kosei"||
       p.positionSource!=="supabase-train-run"||
       proof.referenceOnly!==true||proof.numberDateVerified!==false||
       proof.actualVehicleConfirmed!==false||proof.authorizesPNG!==false||
       proof.timetableValidity!=="undated_not_current_verified"||
       proof.routeSourceUrl!=="https://www.train-guide.westjr.co.jp/kosei.html")
      return null;
    var date=String(p.serviceDate||"").slice(0,10),
      n=String(p.trainNumber||"").trim().toUpperCase(),
      m=/^([0-9]{3,4}M)(H?)$/.exec(n),
      dir=String(p.railDirection||"").split(/[.:]/).pop(),
      type=String(p.trainType||"").split(/[.:]/).pop();
    if(!m||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       !["Inbound","Outbound"].includes(dir)||
       !["Local","Rapid","SpecialRapid"].includes(type)||
       proof.trainNumber!==n||proof.sourceTrainNumber!==n||
       proof.historicalNumber!==m[1]||proof.serviceDate!==date||
       proof.direction!=="odpt.RailDirection:"+dir||
       proof.trainType!=="odpt.TrainType:JR-West."+type||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0)return null;
    var operator=String(p.trainOperator||p.operator||"");
    if(operator&&operator!=="JR-West"&&operator!=="odpt.Operator:JR-West")
      return null;
    var dow=new Date(date+"T12:00:00Z").getUTCDay(),
      holiday=dow===0||dow===6||date==="2026-11-03"||
        date==="2026-11-23";
    if(m[2]!== (holiday?"H":"")||
       sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+
          (holiday?"SaturdayHoliday":"Weekday"))return null;
    var corridor=["Kyoto","Yamashina","Ootsu-Kyou","Karasaki",
      "Hieizan-Sakamoto","Ogoto-Onsen","Katata","Ono-Kansai",
      "Wani","Hourai","Shiga","Hira","Oumi-Maiko","Kitakomatsu",
      "Oumi-Takashima","Adogawa","Shin'asahi","Oumiimazu",
      "Oumi-Naka-Shou","Makino","Nagahara-Kansai","Omi-Shiotsu"],
      stops=Array.isArray(p.scheduledStopKeys)
        ?p.scheduledStopKeys.map(function(k){
          return String(k||"").split(".").pop();}):[],
      sourceStops=proof.sourceStopKeys,
      positions=stops.map(function(k){return corridor.indexOf(k);});
    if(!Array.isArray(sourceStops)||sourceStops.length<2||
       sourceStops.length!==stops.length||
       stops.some(function(k,i){return sourceStops[i]!==k;})||
       positions.some(function(i){return i<0;})||
       positions.some(function(i,j){
         return j>0&&(dir==="Outbound"?
           i<=positions[j-1]:i>=positions[j-1]);
       }))return null;
    var northShuttle=type==="Local"&&
      ["Omi-Shiotsu","Nagahara-Kansai"].includes(stops[0])&&
      stops[stops.length-1]==="Oumiimazu",
      group=northShuttle?"north_shuttle":
        type==="Local"?"other_local":
        type==="Rapid"?"rapid":"special_rapid",
      models=group==="north_shuttle"?["223系","225系","521系"]:
        group==="other_local"?["221系","223系","225系"]:
        ["223系","225系"],
      url=group==="north_shuttle"
        ?"https://train.mi-ktt.ne.jp/rosen/koseisen/"
        :"https://www.westjr.co.jp/fan/paper/local/";
    if(proof.corridorSegment!==group||
       proof.fleetSourceUrl!==url||
       !Array.isArray(proof.candidateModels)||
       proof.candidateModels.join("|")!==models.join("|")||
       !Array.isArray(proof.candidateAssets)||
       proof.candidateAssets.length!==0)return null;
    return Object.freeze({
      lineId:"Kosei",sourceTrainNumber:n,
      historicalNumber:m[1],calendar:proof.calendar,
      corridorSegment:group,sourceTemplateId:Number(proof.sourceTemplateId),
      candidateModels:Object.freeze(models),
      candidateAssets:Object.freeze([]),
      referenceOnly:true,numberDateVerified:false,
      actualVehicleConfirmed:false,authorizesPNG:false,
      timetableValidity:"undated_not_current_verified"
    });
  }

  // Historical JR-West Fukuchiyama source fleet, not a certified
  // 2026-11 train number, actual vehicle or PNG. Keep all four alternatives.
  // A row rejected by the SQL source/stop boundary must stay unresolved.
  // Fukuchiyama 2611 historical source-number bands. The appended H is
  // a calendar marker; 1199CH is the source form of public 1199C.
  // M/MO are recorded for diagnostic lookup, but cannot identify a
  // specific 223/225-6000 formation or authorize a Hanwa-only PNG.
  var FUKUCHIYAMA_NUMBER_BANDS=Object.freeze([
    ["local-1100-1299-C","C",1100,1299,"Local"],
    ["electric-0500-0599-M","M",500,599,""],
    ["electric-2500-2599-M","M",2500,2599,""],
    ["electric-2700-2799-M","M",2700,2799,""],
    ["electric-2900-2999-M","M",2900,2999,""],
    ["kounotori-3000-7000-express-illustration","M",3000,3099,"LimitedExpress"],
    ["electric-3700-3799-M","M",3700,3799,""],
    ["electric-3900-3999-M","M",3900,3999,""],
    ["electric-5400-5599-M","M",5400,5599,""],
    ["kounotori-3000-7000-express-illustration","M",7000,7099,"LimitedExpress"],
    ["historical-2750-2799-MO","MO",2750,2799,"Local"]
  ]);
  function verifyFukuchiyamaSourceFleet(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||
       proof.source!=="sql-jrwest-fukuchiyama-2611-historical-fleet-reference"||
       proof.lineId!=="Fukuchiyama"||
       String(p.positionLineId||p.lineId||"")!=="Fukuchiyama"||
       (p.displayLineId&&p.displayLineId!=="Fukuchiyama")||
       p.sourceRailway!=="odpt.Railway:JR-West.Fukuchiyama"||
       p.positionSource!=="supabase-train-run"||
       p.estimated!==true||
       (p.timetableDateVerified===true&&
         ![68244,68245,68251,68252,68314,68315,68168].includes(
           Number(proof.sourceTemplateId)))||
       proof.referenceOnly!==true||proof.numberDateVerified!==false||
       proof.actualVehicleConfirmed!==false||proof.authorizesPNG!==false||
       proof.timetableValidity!=="undated_not_current_verified"||
       proof.timetableSourcePath!=="data/timetables/Fukuchiyama-manual.js")
      return null;
    var date=String(p.serviceDate||"").slice(0,10),
      num=String(p.trainNumber||"").trim(),
      n=/^([0-9]{3,5})(C|MO|M)(H?)$/.exec(num),
      dir=String(p.railDirection||"").split(/[.:]/).pop(),
      type=String(p.trainType||"").split(/[.:]/).pop(),
      // A family reference ONLY. The SQL proof still requires the exact
      // source template, number, calendar and stop sequence to match.
      isExpress=type==="LimitedExpress"&&/^(30|70)[0-9]{2}MH?$/.test(num),
      models=isExpress?["287系","289系"]:
        ["207系","321系","223系6000番台","225系6000番台"];
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       !n||!["Inbound","Outbound"].includes(dir)||
       !["Local","Rapid","SectionRapid","LimitedExpress"].includes(type)||
       (type==="LimitedExpress"&&!isExpress)||
       (type!=="Local"&&n[2]!=="M")||
       proof.serviceDate!==date||proof.sourceTrainId!==num||
       proof.direction!=="odpt.RailDirection:"+dir||
       proof.trainType!=="odpt.TrainType:JR-West."+type||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0)return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-West"&&op!=="odpt.Operator:JR-West")return null;
    var day=new Date(date+"T12:00:00Z").getUTCDay(),
      holiday=day===0||day===6||date==="2026-11-03"||date==="2026-11-23";
    if(n[3]!== (holiday?"H":"")||
       sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+
         (holiday?"SaturdayHoliday":"Weekday"))return null;
    var keys=Array.isArray(p.scheduledStopKeys)
      ?p.scheduledStopKeys.map(function(k){return String(k||"").split(".").pop();})
      :[],sourceKeys=proof.sourceStopKeys;
    if(!Array.isArray(sourceKeys)||sourceKeys.length<2||
       sourceKeys.length!==keys.length||
       keys.some(function(k,i){return k!==sourceKeys[i];})||
       !Array.isArray(proof.candidateModels)||
       proof.candidateModels.join("|")!==models.join("|")||
       !Array.isArray(proof.candidateAssets)||
       proof.candidateAssets.length!==0)return null;
    var digits=Number(n[1]), band=FUKUCHIYAMA_NUMBER_BANDS.find(function(x){
      return x[1]===n[2]&&digits>=x[2]&&digits<=x[3]&&
        (!x[4]||x[4]===type);
    });
    if(!band)return null;
    var isC=band[1]==="C";
    if(isC&&(dir!=="Outbound"||digits%2!==1||
       keys[0]!=="Amagasaki"||
       ["Takarazuka","Shinmita"].indexOf(keys[keys.length-1])<0))
      return null;
    // Exact holiday 2774M: JR-West 2026-11 public timetable confirms
    // train number, stop order and time. The 2025-03-15 Akashi 207/321
    // common-duty roster identifies this historical WORKING family only.
    // No 2026 physical carset or livery is confirmed from that evidence.
    var holiday2774=num==="2774MH"&&date==="2026-11-08"&&
      dir==="Inbound"&&type==="Rapid"&&Number(proof.sourceTemplateId)===68302&&
      keys.join("|")===[
        "Shinoyamaguchi","Minami-Yashiro","Furuichi","Kusano-Hyogo",
        "Ranpon","Sou-No","Hirono-Hyogo","Shinmita","Sanda-Hyogo",
        "Nishinomiya-Najio","Takarazuka","Nakayama-Tera",
        "Kawanishi-Ikeda","Itami","Amagasaki","Osaka"
      ].join("|");
    var is207321=isC||holiday2774;
    // 287/289 are both Kounotori fleet candidates. A SINGLE generic 287
    // PNG is displayed only as a clearly identified example; the SQL
    // source proves neither this train's real type nor physical formation.
    var galleryModels=is207321?["JR西日本207系（NK）",
      "JR西日本207系（Y2）","JR西日本321系"]:
      isExpress?["JR西日本287系"]:[],
      galleryPaths=is207321?[
        "../images/列车/JR西日本/JR西日本_207系_NK.png",
        "../images/列车/JR西日本/JR西日本_207系_Y2.png",
        "../images/列车/JR西日本/JR西日本_321系.png"
      ]:isExpress?["../images/列车/JR西日本/JR西日本_287系.png"]:[],
      illustration=is207321
        ?"../images/列车/JR西日本/JR西日本_321系.png":
        isExpress?"../images/列车/JR西日本/JR西日本_287系.png":"";
    return Object.freeze({
      lineId:"Fukuchiyama",sourceTrainNumber:num,
      sourceTemplateId:Number(proof.sourceTemplateId),numberBand:holiday2774?"holiday-2774M-2025-207-321-working":band[0],
      publicTrainNumber:holiday2774?"2774M":"",
      officialTrainSourceUrl:holiday2774
        ?"https://timetable.jr-odekake.net/train-timetable/101641?date=20261108":"",
      sourceFleetCandidates:Object.freeze(models),
      candidateModels:Object.freeze(is207321?["207系","321系"]:models),
      candidateGalleryModels:Object.freeze(galleryModels),
      candidateAssets:Object.freeze(galleryPaths),
      illustrationModel:is207321?"JR西日本321系":isExpress?"JR西日本287系":"",
      illustrationPng:illustration,
      illustrationSourceUrl:holiday2774
        ?"https://ameblo.jp/tc205-37/entry-12906281412.html":
        isC?"https://www.katano-transport.com/archives/29972598.html":
        isExpress?"https://www.jr-odekake.net/railroad/train/kounotori/":"",
      authorizesIllustration:is207321||isExpress,
      referenceOnly:true,numberDateVerified:false,
      actualVehicleConfirmed:false,authorizesPNG:false
    });
  }

  // 7025M Fridays (6/13/20/27 Nov) use a different SQL source ID
  // than the legacy SaturdayHoliday 7025MH. Verify the canonical Friday
  // sample by source/date/stop order instead of borrowing weekend proof.
  function verifyFukuchiyamaFriday7025(p){
    var proof=p&&p.sqlPublishedNumberFleetReference,
      dates=["2026-11-06","2026-11-13","2026-11-20","2026-11-27"],
      stops=["Osaka","Amagasaki","Takarazuka","Sanda-Hyogo",
        "Shinmita","Sou-No","Shinoyamaguchi","Tanigawa",
        "Kaibara-Hyogo","Kuroi-Tamba","Fukuchiyama"],
      models=["287系","289系"],
      date=String(p&&p.serviceDate||"").slice(0,10),
      keys=Array.isArray(p&&p.scheduledStopKeys)
        ?p.scheduledStopKeys.map(function(x){return String(x||"").split(".").pop();})
        :[];
    if(!p||!proof||dates.indexOf(date)<0||
       p.trainNumber!=="7025M"||
       p.positionLineId!=="Fukuchiyama"||
       p.displayLineId!=="Fukuchiyama"||
       p.sourceRailway!=="odpt.Railway:JR-West.Fukuchiyama"||
       p.positionSource!=="supabase-train-run"||
       p.estimated!==true||p.timetableDateVerified!==true||
       p.trainType!=="odpt.TrainType:JR-West.LimitedExpress"||
       p.railDirection!=="odpt.RailDirection:Outbound"||
       sourceCalendar(p)!=="weekday"||
       proof.source!=="sql-jrwest-fukuchiyama-2611-official-7025-friday"||
       proof.lineId!=="Fukuchiyama"||
       Number(proof.sourceTemplateId)!==2611087025001||
       proof.sourceTrainId!=="7025M"||
       proof.serviceDate!==date||
       proof.calendar!=="odpt.Calendar:Weekday"||
       proof.direction!=="odpt.RailDirection:Outbound"||
       proof.trainType!=="odpt.TrainType:JR-West.LimitedExpress"||
       proof.referenceOnly!==true||
       proof.numberDateVerified!==true||
       proof.timetableValidity!=="date_verified"||
       proof.actualVehicleConfirmed!==false||
       proof.authorizesPNG!==false||
       proof.timetableSourcePath!==
         "official-sampled:fukuchiyama:2611:7025M-friday"||
       !Array.isArray(proof.sourceStopKeys)||
       proof.sourceStopKeys.join("|")!==stops.join("|")||
       keys.join("|")!==stops.join("|")||
       !Array.isArray(proof.candidateModels)||
       proof.candidateModels.join("|")!==models.join("|")||
       !Array.isArray(proof.candidateAssets)||
       proof.candidateAssets.length!==0||
       p.vehicleIdentityStatus==="EXACT"||
       p.vehicleResolvedFromRealtime===true)return null;
    var png="../images/列车/JR西日本/JR西日本_287系.png";
    return Object.freeze({
      lineId:"Fukuchiyama",sourceTrainNumber:"7025M",
      sourceTemplateId:2611087025001,
      numberBand:"kounotori-3000-7000-express-illustration",
      sourceFleetCandidates:Object.freeze(models),
      candidateModels:Object.freeze(models),
      candidateGalleryModels:Object.freeze(["JR西日本287系"]),
      candidateAssets:Object.freeze([png]),
      illustrationModel:"JR西日本287系",
      illustrationPng:png,
      illustrationSourceUrl:"https://www.jr-odekake.net/railroad/train/kounotori/",
      authorizesIllustration:true,referenceOnly:true,
      numberDateVerified:true,actualVehicleConfirmed:false,
      authorizesPNG:false
    });
  }

  // JR-West Kyoto/Kobe historical source C/T/M suffix: 207/321
  // locals or 223/225 rapid service families. A compound internal
  // number like 500310-1385400-714T is NOT a published 2611 number or
  // physical fleet assignment. SanyoMain source only within Kobe-side
  // Hyougo–Himeji (+ imported Amiboshi continuing stop).
  function verifyJrWestKyotoKobeSourceFleet(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||
       proof.source!=="sql-jrwest-kyoto-kobe-2611-source-family"||
       proof.referenceOnly!==true||
       proof.actualVehicleConfirmed!==false||
       proof.authorizesPNG!==false||
       proof.numberDateVerified!==false||
       proof.timetableValidity!=="undated_not_current_verified"||
       p.positionSource!=="supabase-train-run")return null;
    var line=String(p.positionLineId||p.lineId||""),
      date=String(p.serviceDate||"").slice(0,10),
      num=String(p.trainNumber||"").trim(),
      m=/^([0-9]{6})-([0-9]{4,7})-([0-9]{1,4}[CMT])$/.exec(num),
      dir=String(p.railDirection||"").split(/[.:]/).pop(),
      type=String(p.trainType||"").split(/[.:]/).pop();
    if(!["TokaidoKansai","SanyoMain"].includes(line)||
       (p.displayLineId&&p.displayLineId!==line)||
       proof.lineId!==line||
       p.sourceRailway!=="odpt.Railway:JR-West."+line||
       !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       !m||!["Inbound","Outbound"].includes(dir)||
       !["Local","Rapid"].includes(type)||
       proof.sourceTrainId!==num||proof.serviceDate!==date||
       proof.sourcePublicNumberSuffix!==m[3]||
       proof.direction!=="odpt.RailDirection:"+dir||
       proof.trainType!=="odpt.TrainType:JR-West."+type||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0||
       (line==="TokaidoKansai"&&!["500300","500310"].includes(m[1]))||
       (line==="SanyoMain"&&m[1]!=="710100")||
       (Number(m[3].slice(0,-1))%2)!==(dir==="Inbound"?0:1))
      return null;
    var operator=String(p.trainOperator||p.operator||"");
    if(operator&&operator!=="JR-West"&&operator!=="odpt.Operator:JR-West")
      return null;
    var weekday=sourceCalendar(p),
      dow=new Date(date+"T12:00:00Z").getUTCDay(),
      holiday=dow===0||dow===6||date==="2026-11-03"||
        date==="2026-11-23";
    if(weekday!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+
         (holiday?"SaturdayHoliday":"Weekday"))return null;
    var c=m[3].slice(-1),
      family=type==="Local"?"local_c":"regional_rapid_t_m",
      models=type==="Local"?["207系","321系"]:["223系","225系"],
      sourceUrl=type==="Local"
        ?"https://www.westjr.co.jp/fan/paper/local/"
        :"https://www.westjr.co.jp/press/article/2020/02/page_15645.html",
      galleryModels=family==="local_c"&&line==="TokaidoKansai"
        ?["JR西日本207系（NK）","JR西日本207系（Y2）","JR西日本321系"]
        :[],
      assets=galleryModels.length?
        ["../images/列车/JR西日本/JR西日本_207系_NK.png",
         "../images/列车/JR西日本/JR西日本_207系_Y2.png",
         "../images/列车/JR西日本/JR西日本_321系.png"]:[];
    if((family==="local_c"&&c!=="C")||
       (family==="regional_rapid_t_m"&&!["T","M"].includes(c))||
       proof.serviceFamily!==family||
       proof.sourceSegment!==
        (line==="TokaidoKansai"?"kyoto_osaka_kobe":"kobe_himeji")||
       proof.timetableSourcePath!=="data/timetables/"+line+"-manual.js"||
       proof.fleetSourceUrl!==sourceUrl||
       !Array.isArray(proof.candidateModels)||
       proof.candidateModels.join("|")!==models.join("|")||
       !Array.isArray(proof.candidateGalleryModels)||
       proof.candidateGalleryModels.join("|")!==galleryModels.join("|")||
       !Array.isArray(proof.candidateAssets)||
       proof.candidateAssets.join("|")!==assets.join("|"))return null;
    var west=["Kyoto","Nishiooji","Katsuragawa","Mukouchou",
      "Nagaokakyou","Yamazaki","Shimamoto","Takatsuki",
      "Settsu-Tomita","J-R-Soujidera","Ibaraki","Senri-Oka",
      "Kishibe","Suita","Higashiyodogawa","Shin-Osaka","Osaka",
      "Tsukamoto","Amagasaki","Tachibana","Koshienguchi",
      "Nishinomiya","Sakura-Shukugawa","Ashiya","Kōnan-Yamate",
      "Settsu-Motoyama","Sumiyoshi-Hyogo","Rokkoumichi",
      "Maya","Nada","San-No-Miya","Motomachi","Kobe"],
      westSanyo=["Hyougo","Shinnagata","Takatori",
        "Suma-Kaihin-Kouen","Suma","Shioya","Tarumi","Maiko",
        "Asagiri","Akashi","Nishi-Akashi","Okubo-Hyogo",
        "Uozumi","Tsuchiyama","Higashi-Kakogawa","Kakogawa",
        "Houden","Sone","Himeji-Bessho","O-Chaku",
        "Higashi-Himeji","Himeji","Tegara-Yamahira-Kazuhiro-Sono",
        "Ei-Ga-Ho","Harima-Katsuhara","Amiboshi"],
      corridor=line==="TokaidoKansai"?west:westSanyo,
      sourceStops=proof.sourceStopKeys,
      stops=Array.isArray(p.scheduledStopKeys)
        ?p.scheduledStopKeys.map(function(k){return String(k||"").split(".").pop();})
        :[];
    if(!Array.isArray(sourceStops)||sourceStops.length<2||
       sourceStops.length!==stops.length||
       stops.some(function(k,i){return k!==sourceStops[i];}))return null;
    var indexes=stops.map(function(k){return corridor.indexOf(k);});
    if(indexes.some(function(i){return i<0;})||
       indexes.some(function(i,n){return n>0&&
         (dir==="Outbound"?i<=indexes[n-1]:i>=indexes[n-1]);}))
      return null;
    if(line==="SanyoMain"&&
       (!["Hyougo","Akashi"].includes(stops[0])||
        !["Suma","Nishi-Akashi","Himeji","Amiboshi"].includes(
          stops[stops.length-1])))return null;
    return Object.freeze({
      lineId:line,sourceTrainId:num,historicalNumberSuffix:m[3],
      serviceFamily:family,candidateModels:Object.freeze(models),
      candidateGalleryModels:Object.freeze(galleryModels),
      candidateAssets:Object.freeze(assets),
      sourceTemplateId:Number(proof.sourceTemplateId),
      referenceOnly:true,actualVehicleConfirmed:false,
      authorizesPNG:false,numberDateVerified:false,
      source:"historical-source-not-2611-carset"
    });
  }

  // 弥彦線 SQL number-calendar-date-and-stop proof for 2026-11.
  // No train icon on date-free historical or October-only Shu*Kura data.
  // Momiji Kairi's HB-E300 D numbers have a dated SQL PUBLIC ROSTER
  // but NO complete station-clock source; not faked as train positions.
  function verifyMiyoService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Miyo"||
       !["regular","seasonal_holiday","kiku"].includes(proof.segmentKey)||
       proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
       String(p.positionLineId||p.lineId||"")!=="Miyo"||
       (p.displayLineId&&p.displayLineId!=="Miyo")||
       p.sourceRailway!=="odpt.Railway:JR-East.Miyo"||
       p.positionSource!=="supabase-train-run")return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-East"&&op!=="odpt.Operator:JR-East")return null;
    var number=String(p.trainNumber||"").trim().toUpperCase(),
      date=String(p.serviceDate||"").slice(0,10),
      mat=/^([0-9]{3,4})M$/.exec(number);
    if(!mat||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       Number(mat[1])<220||Number(mat[1])>9284||
       proof.trainNumber!==number||proof.serviceDate!==date||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0||
       !Array.isArray(proof.sourceStopKeys)||
       proof.sourceStopKeys.length<2||proof.sourceStopKeys.length>8||
       proof.stopClockStatus!=="historical_not_2611_verified"||
       proof.model!=="E129系"||
       proof.pngReference!=="../images/列车/JR東日本/JR東日本_E129系.png"||
       !/^https:\/\/timetables\.jreast\.co\.jp\/2611\/timetable-v\/233[du][12]\.html$/.test(
         String(proof.officialSourceUrl||"")))return null;
    var dir=String(p.railDirection||"").split(/[.:]/).pop(),
      type=String(p.trainType||"").split(/[.:]/).pop();
    if(type!=="Local"||String(proof.trainType||"").split(/[.:]/).pop()!=="Local"||
       !["Inbound","Outbound"].includes(dir)||
       String(proof.direction||"").split(/[.:]/).pop()!==dir||
       (Number(mat[1])%2)!==(dir==="Inbound"?0:1))return null;
    var cal=sourceCalendar(p),dow=new Date(date+"T12:00:00Z").getUTCDay(),
      holiday=dow===0||dow===6||date==="2026-11-03"||date==="2026-11-23",
      kikuDays=new Set(["2026-11-01","2026-11-03","2026-11-07",
        "2026-11-08","2026-11-14","2026-11-15",
        "2026-11-21","2026-11-22","2026-11-23"]),
      kiku=kikuDays.has(date);
    if(cal!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday")||
       proof.officialSourceUrl.slice(-7)!==
          (dir==="Inbound"?"u":"d")+(holiday?"2":"1")+".html"||
       (proof.segmentKey!=="regular"&&!holiday)||
       (proof.segmentKey==="kiku"&&!kiku))return null;
    var all=["Higashi-Sanjo","Kita-Sanjo","Tsubame-Sanjo","Tsubame",
      "Nishi-Tsubame","Yoshida","Yahagi","Yahiko"];
    var original=proof.sourceStopKeys,
      expected=original.slice(),
      scope="full";
    if(kiku&&holiday){
      if(number==="234M"){
        if(original.length!==8)return null;
        expected=original.slice(-3);scope="yoshida_yahiko_only";
      }else if(number==="235M"||number==="241M"){
        if(original.length!==8)return null;
        expected=original.slice(2);scope="yoshida_higashisanjo_only";
      }else if(number==="228M"){
        if(original.length!==3)return null;
        scope="yoshida_yahiko_only";
      }
    }else if(number==="228M"&&original.length!==8){
      return null;
    }
    if(scope!==proof.railScope||expected.length<2||
       original.some(function(x){return !all.includes(x);}))return null;
    var stops=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[])
      .map(function(x){return String(x||"").split(".").pop();});
    if(stops.length!==expected.length||
       stops.some(function(x,i){return x!==expected[i];}))return null;
    return Object.freeze({number:number,model:"E129系",
      pngPath:proof.pngReference,edition:"2611",
      kind:proof.segmentKey,railScope:scope,
      sourceTemplateId:Number(proof.sourceTemplateId),
      referenceOnly:true,actualVehicleConfirmed:false});
  }
  // JR-East 2611 水戸線: 62 exact M train numbers x 2 calendars,
  // supplied ONLY by the backend's dated SQL-number roster. Subseries,
  // red revival paint, and actual physical formations remain UNCONFIRMED.
  function verifyMitoService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Mito"||proof.segmentKey!=="mito_regular_local"||
       proof.regularLocal!==true||
       proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
       String(p.positionLineId||p.lineId||"")!=="Mito"||
       (p.displayLineId&&p.displayLineId!=="Mito")||
       p.sourceRailway!=="odpt.Railway:JR-East.Mito"||
       p.positionSource!=="supabase-train-run")return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-East"&&op!=="odpt.Operator:JR-East")return null;
    var n=String(p.trainNumber||"").trim().toUpperCase(),
      date=String(p.serviceDate||"").slice(0,10),
      matched=/^([0-9]{3,4})M$/.exec(n);
    if(!matched||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       Number(matched[1])<721||Number(matched[1])>2785||
       proof.trainNumber!==n||proof.serviceDate!==date||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0||
       proof.stopClockStatus!=="historical_not_2611_verified"||
       proof.model!=="E531系"||
       proof.pngReference!=="../images/列车/JR東日本/JR東日本_E531系_水戸線.png"||
       !/^https:\/\/timetables\.jreast\.co\.jp\/2611\/timetable-v\/246[du][12]\.html$/.test(
         String(proof.officialSourceUrl||"")))return null;
    var dir=String(p.railDirection||"").split(/[.:]/).pop(),
      type=String(p.trainType||"").split(/[.:]/).pop();
    if(type!=="Local"||String(proof.trainType||"").split(/[.:]/).pop()!==type||
       (dir!=="Inbound"&&dir!=="Outbound")||
       String(proof.direction||"").split(/[.:]/).pop()!==dir||
       (Number(matched[1])%2)!==(dir==="Inbound"?0:1))return null;
    var weekday=sourceCalendar(p),dow=new Date(date+"T12:00:00Z").getUTCDay(),
      holiday=dow===0||dow===6||date==="2026-11-03"||date==="2026-11-23";
    if(weekday!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday")||
       proof.officialSourceUrl.slice(-7)!==
         (dir==="Inbound"?"u":"d")+(holiday?"2":"1")+".html")return null;
    var allowed=new Set(["Oyama","Otabayashi","Yuki",
      "Higashi-Yuki","Kawashima","Tamado","Shimodate","Niihari",
      "Yamato-Mito","Iwase","Haguro","Fukuhara","Inada","Kasama",
      "Shishido","Tomobe"]);
    var stops=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[])
      .map(function(x){return String(x||"").split(".").pop();});
    if(stops.length<2||stops.length>16||
       stops.some(function(key){return !allowed.has(key);})||
       new Set(stops).size<2)return null;
    return Object.freeze({number:n,kind:"regular",model:proof.model,
      pngPath:proof.pngReference,edition:"2611",
      sourceTemplateId:Number(proof.sourceTemplateId),
      referenceOnly:true,actualVehicleConfirmed:false});
  }
  // 2611 久留里線: SQL proof asserts 11 stops on the surviving RAIL
  // Kisarazu–Kururi section. 294xD bus-replaced trains cannot borrow PNG.
  function verifyKururiService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Kururi"||proof.segmentKey!=="kisarazu_kururi_rail"||
       !["open_rail_only","trimmed_through_rail"].includes(proof.railScope)||
       proof.closedRailSection!=="Kururi–KazusaKameyama"||
       proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
       String(p.positionLineId||p.lineId||"")!=="Kururi"||
       (p.displayLineId && p.displayLineId!=="Kururi")||
       p.sourceRailway!=="odpt.Railway:JR-East.Kururi"||
       p.positionSource!=="supabase-train-run")return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-East"&&op!=="odpt.Operator:JR-East")return null;
    var number=String(p.trainNumber||"").trim().toUpperCase(),
      date=String(p.serviceDate||"").slice(0,10);
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       proof.trainNumber!==number||proof.serviceDate!==date||
       proof.stopClockStatus!=="historical_not_2611_verified"||
       proof.model!=="キハE130形100番台"||
       proof.pngReference!=="../images/列车/JR東日本/JR東日本_キハE130系100番台.png"||
       !/^https:\/\/timetables\.jreast\.co\.jp\/2611\/timetable-v\/217[du][12]\.html$/.test(
         String(proof.officialSourceUrl||"")))return null;
    var dir=String(p.railDirection||"").split(/[.:]/).pop(),
      type=String(p.trainType||"").split(/[.:]/).pop(),
      official=root.JREastRegionalNumberIndex202611;
    if(!official||typeof official.verify!=="function")return null;
    var permitted=official.verify("Kururi",number,p.sourceRailway,
      p.railDirection,p.trainType,sourceCalendar(p),date);
    if(!permitted||permitted.kind!=="regular"||
       permitted.model!==proof.model||type!=="Local"||
       String(proof.trainType||"").split(/[.:]/).pop()!==type||
       String(proof.direction||"").split(/[.:]/).pop()!==dir)return null;
    var day=new Date(date+"T12:00:00Z").getUTCDay(),
      holiday=day===0||day===6||date==="2026-11-03"||date==="2026-11-23";
    if(proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday"))
      return null;
    var down=["Kisarazu","Gion","KazusaKiyokawa","HigashiKiyokawa",
      "Yokota","HigashiYokota","Makuta","Shimogori","Obitsu","Tawarada","Kururi"];
    var expected=dir==="Inbound"?down.reverse():down;
    var given=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[])
      .map(function(v){return String(v||"").split(".").pop();});
    if(given.length!==11||
       given.some(function(st,i){return st!==expected[i];})||
       proof.railwayFrom!==expected[0]||
       proof.railwayTo!==expected[10])return null;
    return Object.freeze({number:number,kind:"regular",model:proof.model,
      pngPath:proof.pngReference,edition:"2611",railScope:proof.railScope,
      referenceOnly:true,actualVehicleConfirmed:false});
  }
  // JR East 2611 花輪線: official-number PNG proof comes exclusively from
  // SQL, not loose number parity or an inferred fleet/operation number.
  function verifyHanawaService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="Kounan"||proof.referenceOnly!==true||
       proof.actualVehicleConfirmed!==false||
       String(p.positionLineId||p.lineId||"")!=="Kounan"||
       p.sourceRailway!=="odpt.Railway:JR-East.Kounan"||
       p.positionSource!=="supabase-train-run"||
       !String(proof.officialSourceUrl||"").startsWith(
         "https://timetables.jreast.co.jp/2611/"))return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op&&op!=="JR-East"&&op!=="odpt.Operator:JR-East")return null;
    var number=String(p.trainNumber||"").trim().toUpperCase();
    var day=String(p.serviceDate||"").slice(0,10);
    var m=/^([0-9]+)D$/.exec(number);
    if(!m||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day)||
       proof.trainNumber!==number||proof.serviceDate!==day||
       proof.stopClockStatus!=="historical_source_clocks_not_2611_verified")
      return null;
    var dir=String(p.railDirection||"").split(/[.:]/).pop();
    var publishedDir=String(proof.direction||"").split(/[.:]/).pop();
    if(dir!==publishedDir||!["Inbound","Outbound"].includes(dir)||
       (Number(m[1])%2!==(dir==="Inbound"?0:1)))return null;
    var dow=new Date(day+"T12:00:00Z").getUTCDay();
    var holiday=dow===0||dow===6||day==="2026-11-03"||day==="2026-11-23";
    if(sourceCalendar(p)!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday"))
      return null;
    var type=String(p.trainType||"").split(/[.:]/).pop();
    if(String(proof.trainType||"").split(/[.:]/).pop()!==type)return null;
    var hinabi=(number==="9921D"||number==="9922D");
    var maintenance=number==="9934D";
    if(hinabi){
      if(day<"2026-11-27"||day>"2026-11-30"||type!=="Rapid"||
         proof.segmentKey!=="hinabi"||
         proof.model!=="HB-E300系（ひなび）"||
         proof.pngReference!=="../images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png")
        return null;
    }else{
      if(type!=="Local"||proof.model!=="キハ110系"||
         proof.pngReference!=="../images/列车/JR東日本/JR東日本_キハ110系.png")
        return null;
      if(maintenance){
        if(proof.segmentKey!=="maintenance"||
           ["2026-11-04","2026-11-05"].indexOf(day)<0)return null;
      }else{
        if(proof.segmentKey!=="regular"||
           (["2026-11-04","2026-11-05"].includes(day)&&
             ["928D","929D","1927D","1930D","1931D","1932D","1934D"].includes(number)))
          return null;
      }
    }
    var stopKeys=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[])
      .map(function(x){return String(x||"").split(".").pop();});
    if(stopKeys.length<2||new Set(stopKeys).size<2)return null;
    var allowed=new Set(["Akasakata","Anihata","Appi-Kogen","Araya-Shinmachi",
      "Dobukai","Hachimantai","Higashi-Obuke","Higashi-Odate","Junisho",
      "Kazuno-Hanawa","Kitamori","Koyanohata","Matsuo-Hachimantai",
      "Obuke","Odate","Ogita","Otaki-Onsen","Rikuchu-Osato",
      "Sawajiri","Shibahira","Suehiro","Tairadate","Tayama",
      "Towada-Minami","Yokoma","Yuze-Onsen"]);
    if(stopKeys.some(function(key){return !allowed.has(key);}))return null;
    return Object.freeze({number:number,model:proof.model,pngPath:proof.pngReference,
      edition:"2611",kind:hinabi?"hinabi":maintenance?"maintenance":"regular",
      referenceOnly:true,actualVehicleConfirmed:false});
  }
  // 奥羽本線 2026-11: exact six E751-based Tsugaru/Super Tsugaru
  // public numbers (x2 calendars). SQL source clocks remain historical,
  // and the model illustration is never a physical-carset assertion.
  function verifyOuMainTsugaruService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||
       proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="OuMain"||
       proof.segmentKey!=="akita_aomori_tsugaru_e751"||
       proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
       String(p.positionLineId||p.lineId||"")!=="OuMain"||
       (p.displayLineId&&p.displayLineId!=="OuMain")||
       p.sourceRailway!=="odpt.Railway:JR-East.OuMain"||
       p.positionSource!=="supabase-train-run")return null;
    var operator=String(p.trainOperator||p.operator||"");
    if(operator&&operator!=="JR-East"&&
       operator!=="odpt.Operator:JR-East")return null;
    var number=String(p.trainNumber||"").trim().toUpperCase(),
      date=String(p.serviceDate||"").slice(0,10),
      names={
        "2021M":"スーパーつがる1号","2022M":"スーパーつがる2号",
        "2041M":"つがる41号","2042M":"つがる42号",
        "2043M":"つがる43号","2044M":"つがる44号"
      },
      name=names[number],
      direction=String(p.railDirection||"").split(/[.:]/).pop(),
      inbound=direction==="Inbound";
    if(!name||!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       !["Inbound","Outbound"].includes(direction)||
       (Number(number.replace(/M$/,""))%2)!==(inbound?0:1)||
       String(p.trainType||"").split(/[.:]/).pop()!=="LimitedExpress"||
       proof.trainNumber!==number||proof.serviceDate!==date||
       proof.trainType!=="odpt.TrainType:JR-East.LimitedExpress"||
       proof.serviceName!==name||
       proof.direction!=="odpt.RailDirection:"+direction||
       proof.model!=="E751系"||
       proof.pngReference!=="../images/列车/JR東日本/JR東日本_E751系.png"||
       proof.stopClockStatus!=="historical_not_2611_verified"||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0)return null;
    var weekday=sourceCalendar(p),
      dow=new Date(date+"T12:00:00Z").getUTCDay(),
      holiday=dow===0||dow===6||date==="2026-11-03"||date==="2026-11-23";
    if(weekday!==(holiday?"holiday":"weekday")||
       proof.calendar!=="odpt.Calendar:"+(holiday?"SaturdayHoliday":"Weekday")||
       proof.officialSourceUrl!==
        "https://timetables.jreast.co.jp/2611/timetable-v/258"+
        (inbound?"u":"d")+(holiday?"2":"1")+".html")return null;
    var original=proof.sourceStopKeys,
      stops=(Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[]).
        map(function(s){return String(s||"").split(".").pop();});
    var allowed=new Set(["Akita","Hachirogata","Moritake","Higashi-Noshiro",
      "Futatsui","Takanosu","Odate","Owani-Onsen","Hirosaki",
      "Namioka","Shin-Aomori","Aomori"]);
    if(!Array.isArray(original)||
       original.length!==(number==="2021M"||number==="2022M"?14:18)||
       stops.length!==original.length||
       stops[0]!==(inbound?"Aomori":"Akita")||
       stops[stops.length-1]!==(inbound?"Akita":"Aomori")||
       stops.some(function(s,i){return !allowed.has(s)||s!==original[i];}))
      return null;
    return Object.freeze({number:number,serviceName:name,
      trainType:"LimitedExpress",model:"E751系",
      pngPath:proof.pngReference,edition:"2611",
      referenceOnly:true,actualVehicleConfirmed:false});
  }
  // 陸羽東線 2026-11: source-templated, operator/railway/date/stop
  // proof for KiHa110 or the Omoide painted family illustration.
  // The old 6 second SQL occurrences and 9727/9728D are NOT positions.
  // Actual physical formation is never asserted by a planned PNG.
  function verifyRikutoEastService(p){
    var proof=p&&p.sqlPublishedNumberFleetReference;
    if(!p||!proof||
       proof.source!=="sql-jreast-2611-number-roster"||
       proof.lineId!=="RikutoEast"||
       !["kogota_naruko_regular","kogota_naruko_omoide_rapid"].includes(proof.segmentKey)||
       proof.referenceOnly!==true||proof.actualVehicleConfirmed!==false||
       String(p.positionLineId||p.lineId||"")!=="RikutoEast"||
       (p.displayLineId&&p.displayLineId!=="RikutoEast")||
       p.sourceRailway!=="odpt.Railway:JR-East.RikutoEast"||
       p.positionSource!=="supabase-train-run")return null;
    var operator=String(p.trainOperator||p.operator||"");
    if(operator&&operator!=="JR-East"&&operator!=="odpt.Operator:JR-East")return null;
    var num=String(p.trainNumber||"").trim().toUpperCase(),
      date=String(p.serviceDate||"").slice(0,10),
      dir=String(p.railDirection||"").split(/[.:]/).pop(),
      cal=sourceCalendar(p),
      rapid=proof.segmentKey==="kogota_naruko_omoide_rapid",
      calendar="odpt.Calendar:"+(cal==="weekday"?"Weekday":"SaturdayHoliday"),
      kind=rapid?"rapid":"regular",
      model="キハ110系",
      png=rapid?
        "../images/列车/JR東日本/JR東日本_キハ110系_おもいで車両.png":
        "../images/列车/JR東日本/JR東日本_キハ110系.png",
      official="https://timetables.jreast.co.jp/2611/timetable-v/268"+
        (dir==="Inbound"?"u":"d")+(cal==="weekday"?"1":"2")+".html";
    if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
       !["Inbound","Outbound"].includes(dir)||
       !["holiday","weekday"].includes(cal)||
       proof.trainNumber!==num||proof.serviceDate!==date||
       proof.calendar!==calendar||
       proof.direction!=="odpt.RailDirection:"+dir||
       proof.model!==model||proof.pngReference!==png||
       proof.officialSourceUrl!==official||
       proof.stopClockStatus!=="historical_not_2611_verified"||
       !Number.isSafeInteger(Number(proof.sourceTemplateId))||
       Number(proof.sourceTemplateId)<=0)return null;
    var ty=String(p.trainType||"").split(/[.:]/).pop(),
      expectedType=rapid?"Rapid":"Local",
      expectedName=rapid?"おもいで湯けむり"+num.slice(-2,-1)+"号":"",
      dates=Array.isArray(proof.validDates)?proof.validDates:[],
      officialIndex=root.JREastRikutoEastNumberIndex202611,
      officialResult=officialIndex&&typeof officialIndex.verify==="function"?
        officialIndex.verify(num,p.sourceRailway,p.railDirection,p.trainType,cal,date):null;
    if(ty!==expectedType||proof.trainType!=="odpt.TrainType:JR-East."+expectedType||
       proof.serviceName!==expectedName||
       !officialResult||officialResult.kind!==kind||
       officialResult.model!==model||officialResult.trainType!==expectedType||
       (rapid?!(cal==="holiday"&&dates.length===12&&
          dates.includes(date)&&
          dates.every(function(d){return officialIndex.specialDates.includes(d);})):
          !(dates.length===0)))return null;
    // Admit the exact timetable SOURCE's ordered full railway stop list.
    // Not the zero-minute bus section or a clipped/cropped partial source.
    var raw=proof.sourceStopKeys,
      stops=Array.isArray(p.scheduledStopKeys)?
        p.scheduledStopKeys.map(function(st){return String(st||"").split(".").pop();}):[],
      route=["Kogota","Kita-Ura","Rikuzen-Yachi","Furukawa",
        "Tsukume","Nishi-Furukawa","Higashi-Ohsaki","Nishi-Ohsaki",
        "Iwadeyama","Yubikan","Kaminome","Igetsuki","Kawatabi-Onsen",
        "Naruko-Gotenyu","Naruko-Onsen"];
    if(!Array.isArray(raw)||raw.length<2||raw.length>15||
       raw.length!==stops.length||
       stops.some(function(key,i){
          var pos=route.indexOf(key);
          return key!==raw[i]||pos<0||
            (i>0&&(dir==="Inbound"?
              pos>=route.indexOf(stops[i-1]):
              pos<=route.indexOf(stops[i-1])));
       }))return null;
    return Object.freeze({number:num,kind:kind,trainType:expectedType,
      model:model,pngPath:png,serviceName:expectedName,
      edition:"2611",referenceOnly:true,actualVehicleConfirmed:false});
  }
  function match(trainNumber,lineId,context){
    var number=String(trainNumber||"").trim().toUpperCase();
    var line=String(lineId||"").trim();
    if(line==="Fujikyu"){
      var fujikyuLabel=/^(\d{3})\s+フジサン特急(?:\s|$)/.exec(number);
      if(fujikyuLabel)number=fujikyuLabel[1];
    }
    if(line==="ChuoCentral"){
      // Published JR Central line-fleet policy: since 2023 all ordinary and
      // rapid trains on Nagoya–Nakatsugawa use 315 series. This is a line
      // fleet ILLUSTRATION, never an observed 2026-11 train formation.
      // https://jr-central.co.jp/news/release/_pdf/000041578.pdf
      // No numbered train or timetable is generated by this rule.
      var p=context||{},date=String(p.serviceDate||"").slice(0,10);
      var op=String(p.trainOperator||p.operator||"");
      var type=String(p.trainType||p.typeName||"").split(/[.:]/).pop();
      var direction=String(p.railDirection||p.direction||"").split(/[.:]/).pop();
      var calendar=sourceCalendar(p);
      if(!/^[1-9][0-9]{0,4}M$/.test(number)||
         number!==String(p.trainNumber||"").trim().toUpperCase()||
         !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
         p.positionSource!=="supabase-train-run"||p.estimated!==true||
         p.officialNumberVerified!==true||
         p.timetableDateVerified!==true||
         p.timetableValidity!=="date_verified"||
         p.sourceRailway!=="odpt.Railway:JR-Central.Chuo"||
         (op&&op!=="JR-Central"&&op!=="odpt.Operator:JR-Central")||
         !["Inbound","Outbound"].includes(direction)||!calendar||
         p.vehicleIdentityStatus==="EXACT")return null;
      var day=new Date(date+"T00:00:00Z").getUTCDay();
      var dayCal=(day===0||day===6||date==="2026-11-03"||
        date==="2026-11-23")?"holiday":"weekday";
      if(calendar!==dayCal)return null;
      // The existing SQL range pool contains eight exact 2611 Shinano
      // services. Keep this finite list source-backed; do not infer a broad
      // 1000M range from the service name or timetable family.
      var shinanoSources={
        "1001M":"https://timetables.jreast.co.jp/2611/train/000/000041.html",
        "1002M":"https://timetables.jreast.co.jp/2611/train/000/000071.html",
        "1003M":"https://timetables.jreast.co.jp/2611/train/000/000081.html",
        "1004M":"https://timetables.jreast.co.jp/2611/train/000/000111.html",
        "1005M":"https://timetables.jreast.co.jp/2611/train/015/019971.html",
        "1006M":"https://timetables.jreast.co.jp/2611/train/000/000151.html",
        "1011M":"https://timetables.jreast.co.jp/2611/train/000/000271.html",
        "1026M":"https://timetables.jreast.co.jp/2611/train/000/000461.html"
      };
      if(type==="LimitedExpress"&&shinanoSources[number]){
        var shinanoNumber=Number(number.slice(0,-1));
        if((shinanoNumber%2===0)!==(direction==="Inbound"))return null;
        var shinanoIndex={Nagoya:0,"JRC-TokaidoCentral-067":1,Shiojiri:39};
        for(var sj=3;sj<=38;sj++)
          shinanoIndex["JRC-ChuoCentral-"+String(sj).padStart(3,"0")]=sj-1;
        var shinanoStops=Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys.map(function(s){
          return String(s||"").split(".").pop();
        }):[];
        if(shinanoStops.length<2||shinanoStops.some(function(key,i){
          return !Object.prototype.hasOwnProperty.call(shinanoIndex,key)||
            (i>0&&(direction==="Inbound"
              ?shinanoIndex[key]>=shinanoIndex[shinanoStops[i-1]]
              :shinanoIndex[key]<=shinanoIndex[shinanoStops[i-1]]));
        })||shinanoStops[0]!==
          (direction==="Inbound"?"Shiojiri":"Nagoya")||
          shinanoStops[shinanoStops.length-1]!==
          (direction==="Inbound"?"Nagoya":"Shiojiri"))return null;
        var shinanoPlan=p.vehiclePlan;
        if(shinanoPlan&&Array.isArray(shinanoPlan.models)&&shinanoPlan.models.length&&
           (shinanoPlan.models.length!==1||shinanoPlan.models[0]!=="383系"))return null;
        if(Array.isArray(p.plannedVehicleCandidates)&&p.plannedVehicleCandidates.length&&
           (p.plannedVehicleCandidates.length!==1||p.plannedVehicleCandidates[0]!=="383系"))return null;
        if([p.realtimeVehicleType,p.realtimeDerivedVehicleType].some(function(v){
          return v&&String(v).trim()!=="383系";
        }))return null;
        var shinanoPng="../images/列车/JR東海/JR東海_383系.png";
        var shinanoGallery=root.VehicleGaragePngMap;
        if(!shinanoGallery||!shinanoGallery.matchModelPath("383系",shinanoPng,line))return null;
        return {trainNumber:number,lineId:line,model:"383系",pngPath:shinanoPng,
          source:"jr-central-chuo-shinano-2611-exact-number-reference",
          sourceUrl:shinanoSources[number],planned:true,representative:true,
          referenceOnly:true,illustrative:true,actualVehicleConfirmed:false};
      }
      if(!["Local","Rapid","SectionRapid","SpecialRapid"].includes(type))return null;
      // Restrict to a complete SQL journey contained entirely inside the
      // 20 canonical Nagoya–Nakatsugawa stations. Never use a segment from
      // an extended Shinano or Nakatsugawa–Shiojiri service as proof.
      var index={"Nagoya":0,"JRC-TokaidoCentral-067":1};
      for(var j=3;j<=20;j++) index["JRC-ChuoCentral-"+String(j).padStart(3,"0")]=j-1;
      var stops=Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys.map(function(s){
        return String(s||"").split(".").pop();
      }):[];
      if(stops.length<2||stops.some(function(key,i){
        return !Object.prototype.hasOwnProperty.call(index,key)||
          (i>0&&(direction==="Inbound"
            ?index[key]>=index[stops[i-1]]
            :index[key]<=index[stops[i-1]]));
      }))return null;
      var plan=p.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
         (plan.models.length!==1||plan.models[0]!=="315系"))return null;
      if(Array.isArray(p.plannedVehicleCandidates)&&
         p.plannedVehicleCandidates.length&&
         (p.plannedVehicleCandidates.length!==1||
          p.plannedVehicleCandidates[0]!=="315系"))return null;
      if([p.realtimeVehicleType,p.realtimeDerivedVehicleType].some(function(v){
        return v&&String(v).trim()!=="315系";
      }))return null;
      var png="../images/列车/JR東海/JR東海_315系.png";
      var gallery=root.VehicleGaragePngMap;
      if(!gallery||!gallery.matchModelPath("315系",png,line))return null;
      return {trainNumber:number,lineId:line,model:"315系",pngPath:png,
        source:"jr-central-chuo-line-fleet-reference",
        sourceUrl:"https://jr-central.co.jp/news/release/_pdf/000041578.pdf",
        planned:true,representative:true,referenceOnly:true,
        illustrative:true,actualVehicleConfirmed:false};
    }
    if(line==="TokaidoCentral"){
      // Number->series ILLUSTRATIONS only; never actual carset confirmation.
      // 2026-03 timetable references: https://yoke4000.main.jp/jru/hamaW.html
      // https://yoke4000.main.jp/jru/hamaH.html and /maibaraH.html.
      var p=context||{},m=number.match(/^([1-9][0-9]{0,4})([FM])$/);
      var date=String(p.serviceDate||"").slice(0,10);
      var op=String(p.trainOperator||p.operator||"");
      var calendar=sourceCalendar(p);
      var direction=String(p.railDirection||p.direction||"").split(/[.:]/).pop();
      var type=String(p.trainType||p.typeName||"").split(/[.:]/).pop();
      if(!m||number!==String(p.trainNumber||"").trim().toUpperCase()||
         !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date)||
         p.positionSource!=="supabase-train-run"||p.estimated!==true||
         p.officialNumberVerified!==true||
         p.timetableDateVerified!==true||
         p.timetableValidity!=="date_verified"||
         p.sourceRailway!=="odpt.Railway:JR-Central.Tokaido"||
         (op&&op!=="JR-Central"&&op!=="odpt.Operator:JR-Central")||
         !["Local","Rapid","SectionRapid","SpecialRapid"].includes(type)||
         !["Inbound","Outbound"].includes(direction)||!calendar||
         p.vehicleIdentityStatus==="EXACT")return null;
      var weekday=new Date(date+"T00:00:00Z").getUTCDay();
      var calendarOnDate=(weekday===0||weekday===6||
         date==="2026-11-03"||date==="2026-11-23")?"holiday":"weekday";
      if(calendar!==calendarOnDate)return null;
      var n=Number(m[1]),suffix=m[2];
      if((n%2===0)!==(direction==="Inbound"))return null;
      var stops=Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys:[];
      function route(a,b){return stops.includes(a)&&stops.includes(b);}
      var model="",url="";
      if(suffix==="M"){
        // March 2026 Hamamatsu–Toyohashi published-operation references:
        // exact public numbers per weekday/holiday diagram, not a continuous
        // numeric range and never an observed November carset.
        // The Saturday/Holiday 3943M/3944M substitute for weekday 1943M;
        // weekday 1950M is not the holiday 5522F rapid.
        // https://yoke4000.main.jp/jru/hamaW.html
        // https://yoke4000.main.jp/jru/hamaH.html
        var hamaSeries={
          "315系":[
            920,921,923,924,926,928,930,931,933,938,940,942,943,945,947,948,
            950,952,953,955,957,958,960,961,962,963,965,966,969,970,971,972,
            973,976,977,978,979,980,981,984,985,986,987,988,989,992,993,994,
            995,996,1920,1921,1922,1923,1929,1930,1932,1933,1937,1938,
            1939,1941,1942,1945,1946,1947,1948
          ],
          "313系":[
            927,929,934,936,939,941,944,946,951,956,959,964,967,974,975,
            982,983,990,991,997,998,999,1924,1925,1927,1928,1934,1936
          ],
          "373系":[922,925,932,937]
        };
        if(calendar==="weekday"){
          hamaSeries["313系"].push(1943,1950);
        }else{
          hamaSeries["313系"].push(3943,3944);
        }
        Object.keys(hamaSeries).forEach(function(series){
          if(hamaSeries[series].includes(n))model=series;
        });
        if(model)url=calendar==="holiday"
          ?"https://yoke4000.main.jp/jru/hamaH.html"
          :"https://yoke4000.main.jp/jru/hamaW.html";
        if(model&&!route("Hamamatsu","Toyohashi"))return null;
      }
      // A through rapid is not a Local M service, and its mapped model is
      // still only a published formation-family reference for this segment.
      if(suffix==="F"&&
         ((calendar==="weekday"&&n===2303)||
          (calendar==="holiday"&&n===5101)||
          (calendar==="holiday"&&n===5522))){
        model="313系";
        url=calendar==="holiday"?"https://yoke4000.main.jp/jru/hamaH.html":
          "https://yoke4000.main.jp/jru/hamaW.html";
      }
      if(suffix==="F"&&calendar==="holiday"){
        if(n===3200||n===3303||(n>=3207&&n<=3223&&n%2===1)||
           (n>=3208&&n<=3224&&n%2===0))model="315系";
        else if([3201,3202,3203,3204,3205,3206,3226,5100,5101,5103,
                 5107,5108,5109,5110,5111,5126,5128,5130].includes(n))
          model="313系";
        if(model)url="https://yoke4000.main.jp/jru/maibaraH.html";
      }
      var plan=p.vehiclePlan;
      if(model){
        if(plan&&Array.isArray(plan.models)&&plan.models.length&&
           (plan.models.length!==1||plan.models[0]!==model))return null;
      }else{
        if(!plan||(plan.confirmed!==true&&plan.status!=="PLANNED_MODEL")||
           !Array.isArray(plan.models)||plan.models.length!==1||
           !/^https:\/\//.test(String(plan.sourceUrl||"")))return null;
        model=String(plan.models[0]);
        url=String(plan.sourceUrl);
      }
      if([p.realtimeVehicleType,p.realtimeDerivedVehicleType].some(function(v){
           return v&&String(v).trim()!==model;})||
         (Array.isArray(p.plannedVehicleCandidates)&&p.plannedVehicleCandidates.length&&
          (p.plannedVehicleCandidates.length!==1||p.plannedVehicleCandidates[0]!==model))
        )return null;
      var artwork={"313系":"../images/列车/JR東海/JR東海_313系.png",
                   "315系":"../images/列车/JR東海/JR東海_315系.png",
                   "373系":"../images/列车/JR東海/JR東海_373系.png"};
      var png=artwork[model],gallery=root.VehicleGaragePngMap;
      if(!png||!gallery||!gallery.matchModelPath(model,png,line))return null;
      return {trainNumber:number,lineId:line,model:model,pngPath:png,
        source:"jr-central-sql-number-roster-reference",sourceUrl:url,
        planned:true,representative:true,referenceOnly:true,
        illustrative:true,actualVehicleConfirmed:false};
    }
    if(line==="OuMain"){
      var tsugaru=Object.assign({},context||{},{trainNumber:number});
      var model=verifyOuMainTsugaruService(tsugaru);
      if(!model||tsugaru.estimated!==true||
         tsugaru.officialNumberVerified!==true||
         tsugaru.vehicleIdentityStatus==="EXACT")return null;
      var observed=String(tsugaru.realtimeVehicleType||
        tsugaru.realtimeDerivedVehicleType||"").trim();
      if(observed&&observed!==model.model)return null;
      var plan=tsugaru.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
         (plan.models.length!==1||plan.models[0]!==model.model))
         return null;
      if(Array.isArray(tsugaru.plannedVehicleCandidates)&&
         tsugaru.plannedVehicleCandidates.length&&
         (tsugaru.plannedVehicleCandidates.length!==1||
          tsugaru.plannedVehicleCandidates[0]!==model.model))return null;
      return {trainNumber:number,lineId:line,model:model.model,
        pngPath:model.pngPath,serviceName:model.serviceName,
        planned:true,representative:true,
        source:"jr-east-2611-oumain-exact-tsugaru-e751"};
    }
    if(line==="OitoWest"){
      // Official JR-West Oito stock is orange/red KiHa120 300.
      // Existing JR-West 120 PNGs are green/blue (CHA) or purple (KAN)
      // and neither is the authentic Oito livery. Fail closed.
      return null;
    }
    if(line==="Oito"){
      var east=Object.assign({},context||{},{trainNumber:number});
      var official=verifyOitoEastService(east);
      if(!official||!official.pngPath||
         east.estimated!==true||east.officialNumberVerified!==true||
         east.vehicleIdentityStatus==="EXACT")return null;
      var observed=String(east.realtimeVehicleType||
        east.realtimeDerivedVehicleType||"").trim();
      if(observed&&observed!==official.model)return null;
      var plan=east.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
         (plan.models.length!==1||plan.models[0]!==official.model))
        return null;
      if(Array.isArray(east.plannedVehicleCandidates)&&
         east.plannedVehicleCandidates.length&&
         (east.plannedVehicleCandidates.length!==1||
          east.plannedVehicleCandidates[0]!==official.model))
        return null;
      return {trainNumber:number,lineId:line,model:official.model,
        pngPath:official.pngPath,planned:true,representative:true,
        source:"jr-east-2611-oito-exact-number-source-date"};
    }
    if(line==="Oga"){
      var oga=Object.assign({},context||{},{trainNumber:number});
      var verifiedOga=verifyOgaService(oga);
      if(!verifiedOga||oga.estimated!==true||
         oga.officialNumberVerified!==true||
         oga.vehicleIdentityStatus==="EXACT")return null;
      var realtime=String(oga.realtimeVehicleType||
        oga.realtimeDerivedVehicleType||"").trim();
      if(realtime&&realtime!=="EV-E801系"&&
         realtime!=="EV-E801系（ACCUM）")return null;
      var plan=oga.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
         (plan.models.length!==1||
          !["EV-E801系","EV-E801系（ACCUM）"].includes(plan.models[0])))
        return null;
      if(Array.isArray(oga.plannedVehicleCandidates)&&
         oga.plannedVehicleCandidates.length&&
         (oga.plannedVehicleCandidates.length!==1||
          !["EV-E801系","EV-E801系（ACCUM）"].includes(
            oga.plannedVehicleCandidates[0])))return null;
      return {trainNumber:number,lineId:line,model:verifiedOga.model,
        pngPath:verifiedOga.pngPath,planned:true,representative:true,
        source:"jr-east-2611-oga-exact-sql-number-date-rail"};
    }
    if(line==="Ofunato"){
      var ofunato=Object.assign({},context||{},{trainNumber:number});
      var rail=verifyOfunatoService(ofunato);
      // Even valid Pokemon KiHa100 trains lack an appropriate gallery PNG.
      // BRT F/K and non-dated or unsupported 9327/9336D never borrow one.
      if(!rail||rail.kind!=="rail_regular"||!rail.pngPath||
         ofunato.estimated!==true||
         ofunato.officialNumberVerified!==true||
         ofunato.vehicleIdentityStatus==="EXACT")return null;
      var observed=String(ofunato.realtimeVehicleType||
        ofunato.realtimeDerivedVehicleType||"").trim();
      if(observed&&observed!==rail.model)return null;
      var plan=ofunato.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
         (plan.models.length!==1||plan.models[0]!==rail.model))
        return null;
      if(Array.isArray(ofunato.plannedVehicleCandidates)&&
         ofunato.plannedVehicleCandidates.length&&
         (ofunato.plannedVehicleCandidates.length!==1||
          ofunato.plannedVehicleCandidates[0]!==rail.model))
        return null;
      return {trainNumber:number,lineId:line,model:rail.model,
        pngPath:rail.pngPath,planned:true,representative:true,
        source:"jr-east-2611-ofunato-rail-d-kiha110-sql"};
    }
    if(line==="Miyo"){
      var scoped=Object.assign({},context||{},{trainNumber:number});
      var miyo=verifyMiyoService(scoped);
      if(!miyo||scoped.estimated!==true||
         scoped.officialNumberVerified!==true||
         scoped.vehicleIdentityStatus==="EXACT")return null;
      var observed=String(scoped.realtimeVehicleType||
          scoped.realtimeDerivedVehicleType||"").trim();
      if(observed&&observed!==miyo.model)return null;
      var plan=scoped.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
         (plan.models.length!==1||plan.models[0]!==miyo.model))
        return null;
      if(Array.isArray(scoped.plannedVehicleCandidates)&&
         scoped.plannedVehicleCandidates.length&&
         (scoped.plannedVehicleCandidates.length!==1||
          scoped.plannedVehicleCandidates[0]!==miyo.model))
        return null;
      return {trainNumber:number,lineId:line,model:miyo.model,
        pngPath:miyo.pngPath,planned:true,representative:true,
        source:"jr-east-2611-miyo-sql-number-calendar-rail"};
    }
    if(line==="Mito"){
      var m=Object.assign({},context||{},{trainNumber:number});
      var permitted=verifyMitoService(m);
      if(!permitted||m.estimated!==true||
         m.officialNumberVerified!==true||
         m.vehicleIdentityStatus==="EXACT")return null;
      var reported=String(m.realtimeVehicleType||
        m.realtimeDerivedVehicleType||"").trim();
      if(reported&&reported!==permitted.model)return null;
      var plan=m.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
         (plan.models.length!==1||plan.models[0]!==permitted.model))
        return null;
      if(Array.isArray(m.plannedVehicleCandidates)&&
         m.plannedVehicleCandidates.length&&
         (m.plannedVehicleCandidates.length!==1||
          m.plannedVehicleCandidates[0]!==permitted.model))
        return null;
      return {trainNumber:number,lineId:line,model:permitted.model,
        pngPath:permitted.pngPath,planned:true,representative:true,
        source:"jr-east-2611-mito-sql-dated-exact-number"};
    }
    if(line==="Kururi"){
      var scopedKururi=Object.assign({},context||{},{trainNumber:number});
      var railPlan=verifyKururiService(scopedKururi);
      if(!railPlan||scopedKururi.estimated!==true||
         scopedKururi.officialNumberVerified!==true||
         scopedKururi.vehicleIdentityStatus==="EXACT")return null;
      var observed=String(scopedKururi.realtimeVehicleType||
         scopedKururi.realtimeDerivedVehicleType||"").trim();
      if(observed&&observed!==railPlan.model)return null;
      var plan=scopedKururi.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
         (plan.models.length!==1||plan.models[0]!==railPlan.model))return null;
      if(Array.isArray(scopedKururi.plannedVehicleCandidates)&&
         scopedKururi.plannedVehicleCandidates.length&&
         !scopedKururi.plannedVehicleCandidates.includes(railPlan.model))return null;
      return {trainNumber:number,lineId:line,model:railPlan.model,
        pngPath:railPlan.pngPath,planned:true,representative:true,
        source:"jr-east-2611-kururi-sql-open-rail-only"};
    }
    if(line==="Kounan"){
      var hanawa=Object.assign({},context||{},{trainNumber:number});
      var plan=verifyHanawaService(hanawa);
      if(!plan||hanawa.estimated!==true||
         hanawa.officialNumberVerified!==true||
         hanawa.vehicleIdentityStatus==="EXACT")return null;
      var reported=String(hanawa.realtimeVehicleType||
         hanawa.realtimeDerivedVehicleType||"").trim();
      if(reported&&reported!==plan.model)return null;
      var p=hanawa.vehiclePlan;
      if(p&&Array.isArray(p.models)&&p.models.length&&
         (p.models.length!==1||p.models[0]!==plan.model))return null;
      return {trainNumber:number,lineId:line,model:plan.model,
        pngPath:plan.pngPath,source:"jr-east-2611-hanawa-sql-exact-number",
        planned:true,representative:true};
    }
    if(line==="Kitakami"){
      // Source of truth is SQL-issued number/route/calendar proof. The
      // earlier five-number JS-only 2611 guard remains for legacy audits,
      // but can no longer independently authorize a new public PNG.
      var contextSource=Object.assign({},context||{},{trainNumber:number});
      var ki=root.JREastKitakamiNumberIndex202611;
      var verified=ki&&typeof ki.verifySqlProof==="function"
        ?ki.verifySqlProof(contextSource):null;
      if(!verified||contextSource.estimated!==true||
         contextSource.positionSource!=="supabase-train-run"||
         contextSource.officialNumberVerified!==true||
         contextSource.vehicleIdentityStatus==="EXACT")return null;
      var live=String(contextSource.realtimeVehicleType||
         contextSource.realtimeDerivedVehicleType||"").trim();
      if(live&&live!==verified.model)return null;
      var plan=contextSource.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
         (plan.models.length!==1||plan.models[0]!==verified.model))return null;
      if(Array.isArray(contextSource.plannedVehicleCandidates)&&
         contextSource.plannedVehicleCandidates.length&&
         contextSource.plannedVehicleCandidates.indexOf(verified.model)<0)
         return null;
      return {trainNumber:number,lineId:line,model:verified.model,
        pngPath:verified.pngPath,
        source:"jreast-2611-kitakami-sql-number-rail-scope",
        planned:true,representative:true};
    }
    if(line==="Komii"){
      var q=Object.assign({},context||{},{trainNumber:number});
      var official=verifyKomiiService(q);
      if(!official||!official.pngPath||
         q.estimated!==true||q.positionSource!=="supabase-train-run"||
         q.officialNumberVerified!==true||
         q.vehicleIdentityStatus==="EXACT")return null;
      var observed=String(q.realtimeVehicleType||
        q.realtimeDerivedVehicleType||"").trim();
      if(observed&&observed!==official.model)return null;
      if(q.vehiclePlan&&Array.isArray(q.vehiclePlan.models)&&
        q.vehiclePlan.models.length&&
        (q.vehiclePlan.models.length!==1||
         q.vehiclePlan.models[0]!==official.model))return null;
      if(Array.isArray(q.plannedVehicleCandidates)&&
         q.plannedVehicleCandidates.length&&
         !q.plannedVehicleCandidates.includes(official.model))return null;
      return {trainNumber:number,lineId:line,model:official.model,
        pngPath:official.pngPath,
        source:"jr-east-2611-komii-sql-highrail-service-reference",
        planned:true,representative:true};
    }
    if(line==="Kesennuma"){
      var scoped=Object.assign({},context||{},{trainNumber:number});
      var official=verifyKesennumaRailService(scoped);
      if(!official||scoped.estimated!==true||
         scoped.positionSource!=="supabase-train-run"||
         scoped.officialNumberVerified!==true||
         scoped.vehicleIdentityStatus==="EXACT")return null;
      var live=String(scoped.realtimeVehicleType||
          scoped.realtimeDerivedVehicleType||"").trim();
      if(live&&live!==official.model)return null;
      var plan=scoped.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
        (plan.models.length!==1||plan.models[0]!==official.model))return null;
      if(Array.isArray(scoped.plannedVehicleCandidates)&&
         scoped.plannedVehicleCandidates.length&&
         scoped.plannedVehicleCandidates.indexOf(official.model)<0)return null;
      return {trainNumber:number,lineId:line,model:official.model,
        pngPath:official.pngPath,
        source:"jr-east-2611-kesennuma-sql-rail-only-number",
        planned:true,representative:true};
    }
    if(line==="Kashima"){
      var query=Object.assign({},context||{},{trainNumber:number});
      var approved=verifyKashimaService(query);
      if(!approved||!approved.pngPath||query.estimated!==true||
         query.positionSource!=="supabase-train-run"||
         query.officialNumberVerified!==true||
         query.vehicleIdentityStatus==="EXACT")return null;
      var realtime=String(query.realtimeVehicleType||
        query.realtimeDerivedVehicleType||"").trim();
      if(realtime&&realtime!==approved.model)return null;
      var plan=query.vehiclePlan;
      if(plan&&Array.isArray(plan.models)&&plan.models.length&&
        (plan.models.length!==1||plan.models[0]!==approved.model))return null;
      if(Array.isArray(query.plannedVehicleCandidates)&&
         query.plannedVehicleCandidates.length&&
         query.plannedVehicleCandidates.indexOf(approved.model)<0)return null;
      return {trainNumber:number,lineId:line,model:approved.model,
        pngPath:approved.pngPath,source:"jr-east-2611-kashima-sql-number-family",
        planned:true,representative:true};
    }
    if(line==="Kamaishi"){
      var src=Object.assign({},context||{},{trainNumber:number});
      var plan=verifyKamaishiService(src);
      if(!plan||src.estimated!==true||
         String(src.trainType||"").split(/[.:]/).pop()!==plan.trainType)
        return null;
      var actualType=String(src.realtimeVehicleType||
        src.realtimeDerivedVehicleType||"").trim();
      if(actualType&&actualType!==plan.model)return null;
      var fleet=src.vehiclePlan;
      if(fleet&&Array.isArray(fleet.models)&&fleet.models.length&&
         (fleet.models.length!==1||fleet.models[0]!==plan.model))return null;
      if(Array.isArray(src.plannedVehicleCandidates)&&
         src.plannedVehicleCandidates.length&&
         src.plannedVehicleCandidates.indexOf(plan.model)<0)return null;
      return {trainNumber:number,lineId:line,model:plan.model,
        pngPath:plan.pngPath,source:"jreast-2611-kamaishi-sql-number-roster",
        planned:true,representative:true};
    }
    if(line==="Joetsu"){
      var source=Object.assign({},context||{},{trainNumber:number});
      var official=verifyJoetsuService(source);
      if(!official||source.estimated!==true||
         String(source.trainType||"").split(/[.:]/).pop()!==official.trainType)
        return null;
      var actual=String(source.realtimeVehicleType||
        source.realtimeDerivedVehicleType||"").trim();
      if(actual&&actual!==official.model)return null;
      var planned=source.vehiclePlan;
      if(planned&&Array.isArray(planned.models)&&planned.models.length&&
         (planned.models.length!==1||planned.models[0]!==official.model))return null;
      if(Array.isArray(source.plannedVehicleCandidates)&&
         source.plannedVehicleCandidates.length&&
         !source.plannedVehicleCandidates.some(function(m){
           return m===official.model||
             (official.kind==="south"&&m==="211系");
         }))return null;
      return {trainNumber:number,lineId:line,model:official.model,
        pngPath:official.pngPath,source:"jr-east-2611-joetsu-number-stops",
        planned:true,representative:true};
    }
    // A train-number roster can authorize a REFERENCE image only when
    // this is an Ito SQL-estimated local service in the audited Nov month.
    // The March 2026 stock working is not a current-day physical identity.
    // Resort21 (A) substitution risk and mixed JR E fleet remain image-less.
    if (line === "Ito" && context) {
      var itoWorking = matchItoFleetCandidates(context);
      if (itoWorking && itoWorking.trainNumber === number &&
          itoWorking.referencePng && itoWorking.referenceModel &&
          itoWorking.models.length === 1 && itoWorking.authorizesPNG &&
          context.vehicleResolvedFromRealtime !== true &&
          context.vehicleIdentityStatus !== "EXACT") {
        return {trainNumber:number,lineId:line,
          model:itoWorking.referenceModel,pngPath:itoWorking.referencePng,
          source:itoWorking.source,planned:true,representative:true};
      }
    }

    // Chuo Main SQL M-only locals: ONE illustrative 211 PNG, never
    // claim the physical set is 211; E131-200 also works here as of
    // October 2026. E233 M->T/H through numbers retain their own image.
    if (line === "ChuoMain" && context) {
      var chuoReference = matchChuoMainLocalReference(context);
      if (chuoReference && chuoReference.trainNumber === number &&
          chuoReference.illustrationOnly &&
          chuoReference.authorizesIllustration &&
          !chuoReference.authorizesPNG && !chuoReference.confirmed) {
        return {trainNumber:number,lineId:line,
          model:chuoReference.illustrationModel,
          pngPath:chuoReference.illustrationPng,
          source:"sql-chuo-main-local-illustration",
          planned:true,representative:true,illustrative:true};
      }
    }
    // Match train NUMBER ranges, not an inferred operation ID.
    // One train number can have both a scoped tail and a full-number
    // interpretation: 1940K -> 40 on Saikyo, 1940K -> 1940 on Yokohama.
    // Determine the interpretation FROM THE LINE RULE, not from the suffix.
    // This is never a train number -> operation number conversion.
    var regular=number.match(/^[0-9]{1,2}([0-9]{2})([KFS])$/);
    // Include G for Yamanote's full public 3/4-digit G train numbers.
    // Line-scoped matching below prevents G from leaking to other routes.
    var numbered=number.match(/^([0-9]{1,4})([ABCDEKFMSTHYG])$/);
    // Some private railway timetables publish short bare numbers such as
    // Fujikyu's ordinary 1-52 services; keep the range rule responsible for
    // deciding whether a short number is valid on its line.
    var bare=number.match(/^([0-9]{1,4})$/);
    // Metro Tozai timetable: B485S / B711KR / A1758T.
    // The A/B prefix and optional R belong to the full train number.
    var metroNumber=line==="Tozai"
      ? number.match(/^[AB]([0-9]{3,4})([KST])R?$/) : null;
    if((!regular&&!numbered&&!bare&&!metroNumber)||!line)return null;
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      if(row.lineIds.indexOf(line)<0)continue;
      if(row.publishedNumbers && row.publishedNumbers.indexOf(number)<0)continue;
      // For the verified month only, match an actual published number on
      // THIS line and THIS timetable calendar, not a plausible bare range.
      if(row.officialMonthNumbers &&
         String(context&&context.serviceDate||"").slice(0,7)===row.officialMonth){
        var monthSets=row.officialMonthNumbers[line];
        if(!monthSets)continue;
        var monthCal=sourceCalendar(context);
        if(monthCal==="weekday" && monthSets.weekday.indexOf(number)<0)continue;
        if(monthCal==="holiday" && monthSets.holiday.indexOf(number)<0)continue;
        if(!monthCal && monthSets.weekday.indexOf(number)<0 &&
           monthSets.holiday.indexOf(number)<0)continue;
      }
      // Calendar-scoped timetable numbers. Missing realtime calendar
      // falls back only to the union of published services, never to
      // an unrestricted numeric F range.
      if(row.weekdayNumbers && row.holidayNumbers){
        var observedCalendar=sourceCalendar(context);
        if(observedCalendar==="weekday" && row.weekdayNumbers.indexOf(number)<0)continue;
        if(observedCalendar==="holiday" && row.holidayNumbers.indexOf(number)<0)continue;
        if(!observedCalendar && row.weekdayNumbers.indexOf(number)<0 &&
           row.holidayNumbers.indexOf(number)<0)continue;
      }
      var format=row.numberFormat||"tail";
      var numberValue,suffix;
      if(format==="tail"&&regular){
        numberValue=Number(regular[1]);
        suffix=regular[2];
      }else if(format==="full"&&numbered){
        numberValue=Number(numbered[1]);
        suffix=numbered[2];
      }else if(format==="bare"&&bare){
        numberValue=Number(bare[1]);
        suffix="";
      }else if(format==="metro-prefixed"&&metroNumber){
        numberValue=Number(metroNumber[1]);
        suffix=metroNumber[2];
      }else continue;
      if(numberValue<row.from||numberValue>row.to||
          row.suffixes.indexOf(suffix)<0)continue;
      // JR East 2611 Nambu F and Tsurumi B public numbers:
      // even numbers run upstream (上り), odd downstream (下り).
      // Only check directions supplied by realtime or the timetable.
      if(row.directionNumberParity==="inbound-even"){
        var numberDirection=String(context&&
          (context.railDirection||context.directionUrn||context.direction)||"")
          .split(/[.:]/).pop();
        if((numberDirection==="Inbound" && numberValue%2!==0)||
           (numberDirection==="Outbound" && numberValue%2!==1))continue;
      }
      // M suffix alone does not distinguish an express from an ordinary
      // train: require the ODPT or SQL train-type field for these rows.
      var actualType=String(context&&(context.trainType||context.typeName)||"");
      if(row.excludeTrainType &&
         (/(?:^|[.:])LimitedExpress$/i.test(actualType) ||
          /^特急$/.test(actualType) || /^limited express$/i.test(actualType)))continue;
      if(row.trainType){
        var trainType=String(context&&(context.trainType||context.typeName)||"");
        if(row.trainType==="Local"){
          if(!/(?:^|[.:])Local$/i.test(trainType)&&!/^普通$/.test(trainType))continue;
        }else if(!/(?:^|[.:])LimitedExpress$/i.test(trainType)&&
            !/^特急$/.test(trainType)&&
            !/^limited express$/i.test(trainType))continue;
      }
      if(row.operator){
        var trainOperator=String(context&&(context.trainOperator||context.operator)||"");
        // A planned SQL position can omit a trainOperator field even while
        // carrying its exact JR-East ODPT railway URN. For explicitly
        // source-scoped rows only, this verified namespace is sufficient.
        var scopedSource=String(context&&context.sourceRailway||"");
        var operatorFromSource=row.sourceOperatorFallback===true &&
          !trainOperator && Array.isArray(row.sourceRailways) &&
          row.sourceRailways.indexOf(scopedSource)>=0 &&
          scopedSource.indexOf("odpt.Railway:"+row.operator+".")===0;
        if(trainOperator!==row.operator&&
            trainOperator!=="odpt.Operator:"+row.operator&&
            !operatorFromSource)continue;
      }
      if(row.validFrom){
        var serviceDate=String(context&&context.serviceDate||"").slice(0,10);
        if(!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)||serviceDate<row.validFrom)continue;
      }
      if(row.validTo && String(context&&context.serviceDate||"").slice(0,10)>row.validTo)continue;
      if(row.operatingDates && row.operatingDates.indexOf(
          String(context&&context.serviceDate||"").slice(0,10))<0)continue;
      if(row.calendarType && sourceCalendar(context)!==row.calendarType)continue;
      if(row.trainTypes){
        var runtimeType=String(context&&(context.trainType||context.typeName)||"").split(/[.:]/).pop();
        if(row.trainTypes.indexOf(runtimeType)<0)continue;
      }
      if(row.sourceRailways &&
          row.sourceRailways.indexOf(String(context&&context.sourceRailway||""))<0)continue;
      // A supplied railway must belong to the same ChuoRapid source line.
      // No-context legacy lookups remain supported.
      if(row.sourceRailwaysIfPresent &&
          String(context&&context.sourceRailway||"") &&
          row.sourceRailwaysIfPresent.indexOf(String(context.sourceRailway))<0)continue;
      // Optional guards preserve legacy no-context train-number lookups,
      // but a supplied foreign operator or noncommuter train type cannot
      // inherit the ChuoRapid representative E233 PNG.
      if(row.operatorIfPresent){
        var sourceOperator=String(context&&(context.trainOperator||context.operator)||"");
        if(sourceOperator && sourceOperator!==row.operatorIfPresent &&
           sourceOperator!=="odpt.Operator:"+row.operatorIfPresent)continue;
      }
      if(row.trainTypesIfPresent){
        var scopedType=String(context&&(context.trainType||context.typeName)||"")
          .split(/[.:]/).pop();
        if(scopedType && row.trainTypesIfPresent.indexOf(scopedType)<0)continue;
      }
      if(row.numberIndex==="chuo-sobu-tozai-2611"){
        var rawCal=String(context&&(context.calendarType||context.serviceId||
          context.timetableCalendar)||"");
        var cal=rawCal==="weekday"||/(?:^|[.:])Weekday$/.test(rawCal) ? "weekday" :
          rawCal==="holiday"||/(?:^|[.:])(?:SaturdayHoliday|Saturday|Holiday|Sunday)$/.test(rawCal)
          ? "holiday" : "";
        var direction=String(context&&(context.railDirection||context.direction)||"")
          .split(/[.:]/).pop();
        var indexed=chuoSobuTozai2611[cal+"_"+direction+"_"+row.throughOwner];
        if(!indexed||indexed.indexOf(number)<0)continue;
      }
      if(row.numberIndex==="nambu-branch-official-202611"){
        var branchIdx=root.NambuBranchOfficial202611;
        if(!branchIdx || typeof branchIdx.verify!=="function")continue;
        var branchRawCal=String(context&&(context.calendarType||
          context.serviceId||context.timetableCalendar)||"");
        var branchCal=sourceCalendar(context);
        // The published H-number sets happen to be the same on both
        // calendars; unknown realtime calendar may use their union, but
        // an explicitly invalid calendar must not be silently accepted.
        if(branchRawCal && !branchCal)continue;
        var branchCals=branchCal==="weekday" ? ["odpt.Calendar:Weekday"] :
          branchCal==="holiday" ? ["odpt.Calendar:SaturdayHoliday"] :
          ["odpt.Calendar:Weekday","odpt.Calendar:SaturdayHoliday"];
        var branchDirection=String(context&&(context.railDirection||
          context.directionUrn||context.direction)||"");
        var branchDate=String(context&&context.serviceDate||"");
        var branchRailway=String(context&&context.sourceRailway||"");
        if(!branchCals.some(function(cal){
          return branchIdx.verify(number,branchRailway,branchDirection,
            "odpt.TrainType:JR-East.Local",cal,branchDate)===true;
        }))continue;
      }
      if(row.numberIndex==="jreast-hakushin-2611"){
        var hakushinIndex=root.JREastHakushinNumberIndex202611;
        var hakushinResult=hakushinIndex&&typeof hakushinIndex.verify==="function"
          ?hakushinIndex.verify(number,context&&context.sourceRailway,
            context&&(context.railDirection||context.directionUrn||context.direction),
            context&&(context.trainType||context.typeName),
            sourceCalendar(context),context&&context.serviceDate):null;
        if(!hakushinResult||hakushinResult.kind!==row.hakushinKind||
           hakushinResult.model!==row.model||
           hakushinResult.pngAvailable!==true)continue;
      }
      if(row.numberIndex==="jreast-gono-2611"){
        var gonoIndex=root.JREastGonoNumberIndex202611;
        var gonoMatched=gonoIndex&&typeof gonoIndex.verify==="function"
          ?gonoIndex.verify(number,context&&context.sourceRailway,
            context&&(context.railDirection||context.directionUrn||context.direction),
            context&&(context.trainType||context.typeName),
            sourceCalendar(context),context&&context.serviceDate):null;
        if(!gonoMatched||gonoMatched.kind!=="regular"||
           gonoMatched.model!==row.model)continue;
      }
      if(row.numberIndex==="jreast-kitakami-2611"){
        var kitakamiIdx=root.JREastKitakamiNumberIndex202611;
        // Estimator already checks RAW stop path. Matcher independently
        // rechecks exact 2611 direction / date / operator calendar.
        if(!kitakamiIdx||typeof kitakamiIdx.verifyNumber!=="function"||
           !context||context.officialNumberVerified!==true||
           context.positionSource!=="supabase-train-run"||
           kitakamiIdx.verifyNumber(number,context.sourceRailway,
             context.railDirection||context.directionUrn||context.direction,
             context.trainType||context.typeName,
             sourceCalendar(context),context.serviceDate)!==true)continue;
      }
      if(row.numberIndex==="jreast-yamada-2611"){
        var yamadaIdx=root.JREastYamadaNumberIndex202611;
        if(!yamadaIdx||typeof yamadaIdx.verifyNumber!=="function"||
           !context||context.officialNumberVerified!==true||
           context.positionSource!=="supabase-train-run"||
           yamadaIdx.verifyNumber(number,context.sourceRailway,
             context.railDirection||context.directionUrn||context.direction,
             context.trainType||context.typeName,
             sourceCalendar(context),context.serviceDate)!==true)continue;
      }
      if(row.numberIndex==="jreast-iiyama-2611"){
        var iiyamaIdx=root.JREastIiyamaNumberIndex202611;
        var iiyamaResult=iiyamaIdx&&typeof iiyamaIdx.verify==="function"
          ?iiyamaIdx.verify(number,context&&context.sourceRailway,
            context&&(context.railDirection||context.directionUrn||context.direction),
            context&&(context.trainType||context.typeName),
            sourceCalendar(context),context&&context.serviceDate):null;
        if(!iiyamaResult||iiyamaResult.kind!=="regular"||
           iiyamaResult.model!==row.model||iiyamaResult.pngAvailable!==true)
          continue;
      }
      if(row.numberIndex==="jreast-rikutsu-west-2611"){
        var westIdx=root.JREastRikutsuWestNumberIndex202611;
        var westResult=westIdx&&typeof westIdx.verify==="function"
          ?westIdx.verify(number,context&&context.sourceRailway,
            context&&(context.railDirection||context.directionUrn||context.direction),
            context&&(context.trainType||context.typeName),
            sourceCalendar(context),context&&context.serviceDate):null;
        if(!westResult||westResult.kind!==row.rikutsuKind||
           westResult.model!==row.model)continue;
      }
      if(row.numberIndex==="jreast-rikuto-east-2611"){
        var rkProof=verifyRikutoEastService(
          Object.assign({},context||{},{trainNumber:number}));
        if(!rkProof||rkProof.kind!==row.rikutoKind||
           rkProof.model!==row.model||rkProof.pngPath!==row.pngPath)continue;
      }
      if(row.numberIndex==="jreast-regional-2611"){
        var regionalIndex=root.JREastRegionalNumberIndex202611;
        var officialRegional=regionalIndex&&typeof regionalIndex.verify==="function"
          ?regionalIndex.verify(line,number,
            context&&context.sourceRailway,
            context&&(context.railDirection||context.directionUrn||context.direction),
            context&&(context.trainType||context.typeName),
            sourceCalendar(context),context&&context.serviceDate):null;
        if(!officialRegional||officialRegional.model!==row.model||
           officialRegional.kind!==row.regionalKind)continue;
      }
      if(row.numberIndex==="jreast-oga-2611"){
        var ogaIndex=root.JREastOgaNumberIndex202611;
        var officialOga=ogaIndex&&typeof ogaIndex.verify==="function"
          ?ogaIndex.verify(number,context&&context.sourceRailway,
            context&&(context.railDirection||context.directionUrn||context.direction),
            context&&(context.trainType||context.typeName),
            sourceCalendar(context),context&&context.serviceDate):null;
        if(!officialOga||officialOga.model!==row.model)continue;
      }
      if(row.numberIndex==="jreast-ishinomaki-2611"){
        var ishIndex=root.JREastIshinomakiNumberIndex202611;
        var ishSource=ishIndex && typeof ishIndex.verify==="function"
          ?ishIndex.verify(number,context&&context.sourceRailway,
            context&&(context.railDirection||context.directionUrn||context.direction),
            context&&(context.trainType||context.typeName),
            sourceCalendar(context),context&&context.serviceDate):null;
        if(!ishSource || ishSource.model!==row.model ||
           ishSource.kind!==row.ishinomakiKind)continue;
      }
      if(row.numberIndex==="jreast-yokohama-202611"){
        var yokohamaIndex=root.JREastYokohama202611NumberIndex;
        if(!yokohamaIndex || typeof yokohamaIndex.contains!=="function" ||
            !yokohamaIndex.contains(number,context))continue;
      }
      if(row.numberIndex==="jreast-yamanote-202611"){
        var yamanoteIndex=root.JREastYamanote202611NumberIndex;
        if(!yamanoteIndex || typeof yamanoteIndex.contains!=="function" ||
            !yamanoteIndex.contains(number,context))continue;
      }
      if(row.numberIndex==="jreast-keihin-202611"){
        var keihinIndex=root.JREastKeihin202611NumberIndex;
        if(!keihinIndex || typeof keihinIndex.contains!=="function" ||
            !keihinIndex.contains(number,context))continue;
      }
      if(row.numberIndex==="jreast-sobu-yokosuka-202611"){
        // Prefer the complete typed, real-railway-URN source index. Old
        // snapshots used the UI key SobuMain where the provider uses Sobu
        // and omitted Boso through segments and Shiosai mixed workings.
        var newIndex=root.JREastChibaNumberIndex202611;
        if(newIndex && typeof newIndex.match==="function"){
          if(newIndex.match(number,line,context)!==row.model)continue;
        }else{
          var officialIndex=root.JREastSobuYokosuka202611NumberIndex;
          if(!officialIndex || typeof officialIndex.match!=="function" ||
              !officialIndex.match(row.model,number,line,context))continue;
        }
      }
      // Where an actual source timetable supplies a direction, compare
      // that direction with the existing official 2611 number index.
      // Legacy exact-number records without direction retain the
      // published-number fallback, not a guessed directional assignment.
      if(row.numberIndex==="jreast-togane-202611" ||
         row.numberIndex==="jreast-narita-abiko-202611"){
        var officialNumberIndex=row.numberIndex==="jreast-togane-202611"
          ?root.JREastToganeNumberIndex202611
          :root.JREastNaritaAbikoNumberIndex202611;
        var publishedDirection=String(context&&
          (context.railDirection||context.directionUrn||context.direction)||"");
        var publishedCalendar=sourceCalendar(context);
        if(publishedDirection && publishedCalendar &&
           (!officialNumberIndex || typeof officialNumberIndex.verify!=="function" ||
            officialNumberIndex.verify(number,context.sourceRailway,publishedDirection,
              actualType,publishedCalendar,context.serviceDate)!==true))continue;
      }
      if(row.numberIndex==="joban-e231-h-202611"){
        var idx=root.JobanE231RapidNumberIndex;
        if(!idx || typeof idx.match!=="function" ||
            !idx.match(number,sourceCalendar(context),
              context&&context.serviceDate))continue;
      }
      if(row.requiredCandidateModelPrefix && context &&
         Array.isArray(context.plannedVehicleCandidates) &&
         context.plannedVehicleCandidates.length &&
         !context.plannedVehicleCandidates.some(function(model){
           return String(model).indexOf(row.requiredCandidateModelPrefix)===0;
         }))continue;
      // A scoped single-fleet image must not win when SQL or realtime
      // supplies contradictory model candidates. Keep it unresolved.
      if(row.requireCompatiblePlan && row.requiredCandidateModelPrefix &&
         context && Array.isArray(context.plannedVehicleCandidates) &&
         context.plannedVehicleCandidates.some(function(model){
           return String(model||"").indexOf(row.requiredCandidateModelPrefix)!==0;
         }))continue;
      if(row.requireCandidateOverlap && context &&
         Array.isArray(context.plannedVehicleCandidates) &&
         context.plannedVehicleCandidates.length &&
         !context.plannedVehicleCandidates.some(function(model){
           return /^211系/.test(String(model));
         }))continue;
      if(row.rejectAmbiguousPlan && context && context.vehiclePlan &&
         Array.isArray(context.vehiclePlan.models) &&
         context.vehiclePlan.models.length!==1)continue;
      if(row.allowedModelLabels && context){
        // Check BOTH independent observations, not just the first truthy one.
        // Conflicting realtime labels may not justify a representative PNG.
        if(row.requireCompatiblePlan &&
           [context.realtimeVehicleType,context.realtimeDerivedVehicleType]
             .some(function(model){
               var label=String(model||"").trim();
               return label && row.allowedModelLabels.indexOf(label)<0;
             }))continue;
        var observed=String(context.realtimeVehicleType ||
          context.realtimeDerivedVehicleType || "").trim();
        if(observed && row.allowedModelLabels.indexOf(observed)<0)continue;
        var plan=context.vehiclePlan;
        if(plan && (plan.confirmed===true || plan.status==="PLANNED_MODEL") &&
            Array.isArray(plan.models) && plan.models.length &&
            plan.models.some(function(m){return row.allowedModelLabels.indexOf(m)<0;}))
          continue;
      }
      // A mixed-stock railway cannot assign a physical model from an E
      // train number alone. An explicit exact model label or a verified
      // single-model plan is required before drawing either reference PNG.
      if(row.requireExplicitModelEvidence){
        if(!context || !Array.isArray(row.allowedModelLabels))continue;
        var explicitLabel=String(context.realtimeVehicleType||"").trim();
        var explicitPlan=context.vehiclePlan;
        var sourcedPlan=explicitPlan &&
          (explicitPlan.confirmed===true || explicitPlan.status==="PLANNED_MODEL") &&
          Array.isArray(explicitPlan.models) && explicitPlan.models.length===1 &&
          row.allowedModelLabels.indexOf(explicitPlan.models[0])>=0;
        if(explicitLabel
           ? row.allowedModelLabels.indexOf(explicitLabel)<0
           : !sourcedPlan)continue;
      }
      if(row.requireCompatiblePlan && context && context.vehiclePlan &&
          Array.isArray(context.vehiclePlan.models) && context.vehiclePlan.models.length &&
          context.vehiclePlan.models.indexOf(row.model)<0)continue;
      return {trainNumber:number,lineId:line,model:row.model,
        pngPath:row.pngPath,source:"train-number-range",
        planned:true,representative:true};
    }
    // Exact rules above win. Only source-scoped SQL estimates can use
    // these fallback service-family illustrations.
    if(line==="ChuoMain" && context){
      var ref=matchChuoMainUnmappedReference(context);
      if(ref && ref.trainNumber===number && ref.illustrationOnly &&
         ref.authorizesIllustration && ref.authorizesPNG===false &&
         ref.confirmed===false)
        return {trainNumber:number,lineId:line,model:ref.illustrationModel,
          pngPath:ref.illustrationPng,source:ref.source,
          planned:true,representative:true,illustrative:true};
    }
    return null;
  }
  // Ito November 2026: exact JR East published TRAIN numbers, crossed
  // with the 2026-03-14 timetable's Atami turnaround working/formation
  // reference (independent site, NOT an observed November car assignment).
  // https://timetables.jreast.co.jp/2611/timetable-v/101d1.html
  // https://timetables.jreast.co.jp/2611/timetable-v/101u1.html
  // https://ss1.xrea.com/shirabetai.g1.xrea.com/unyou/20260314/ito_ikk.html
  // https://www.izukyu.co.jp/train/train.php
  // IMPORTANT: old SQL labels mistakenly classify many 16xxM shuttles
  // as JR E231/E233; the working reference identifies them as Izukyu.
  // Resort21 (A) may be replaced by 8000: NO single PNG for those.
  // All assignments here are *illustrative planned stock*, never EXACT.
  var itoMarchWorking = Object.freeze([
    {
      "model": "伊豆急行8000系",
      "png": "../images/列车/伊豆急行/伊豆急行_8000系_黒排障器.png",
      "numbers": [
        "1621M",
        "1622M",
        "1623M",
        "1624M",
        "5625M",
        "1626M",
        "5627M",
        "5628M",
        "1629M",
        "5632M",
        "5633M",
        "1634M",
        "5635M",
        "5638M",
        "5639M",
        "5640M",
        "5641M",
        "5646M",
        "5647M",
        "5650M",
        "5651M",
        "5654M",
        "5655M",
        "5660M",
        "1661M",
        "5662M",
        "1663M",
        "1664M",
        "5665M",
        "1666M",
        "1667M",
        "5668M",
        "1669M",
        "1670M",
        "1671M",
        "1672M",
        "1673M",
        "1674M",
        "1675M",
        "1676M",
        "1677M",
        "1678M"
      ],
      "status": "regular"
    },
    {
      "model": "伊豆急行3000系",
      "png": "../images/列车/伊豆急行/伊豆急行_3000系.png",
      "numbers": [
        "5644M",
        "5645M",
        "5652M",
        "1653M",
        "1658M",
        "5659M"
      ],
      "status": "aloha"
    },
    {
      "model": "伊豆急行2100系",
      "png": "../images/列车/伊豆急行/伊豆急行_2100系.png",
      "numbers": [
        "5636M",
        "5637M",
        "5648M",
        "5649M"
      ],
      "status": "resort21-usual"
    },
    {
      "model": "伊豆急行2100系",
      "png": "",
      "numbers": [
        "5630M",
        "5631M",
        "5642M",
        "5643M",
        "5656M",
        "5657M"
      ],
      "status": "resort21-substitution-possible"
    }
  ]);
  var itoJrETrainNumbers = Object.freeze(["1560E","1589E","1597E","1656E","1670E","1883E","1932E","1941E"]);
  function matchItoFleetCandidates(p) {
    if (!p || p.positionSource !== "supabase-train-run" ||
        p.estimated !== true ||
        String(p.positionLineId || p.lineId || "") !== "Ito" ||
        String(p.displayLineId || p.positionLineId || p.lineId || "") !== "Ito" ||
        String(p.sourceRailway || "") !== "odpt.Railway:JR-East.Ito" ||
        !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(String(p.serviceDate || "")) ||
        !/(?:[.:])Local$/.test(String(p.trainType || "")) ||
        p.vehicleResolvedFromRealtime === true ||
        p.vehicleIdentityStatus === "EXACT" ||
        (p.vehiclePlan && p.vehiclePlan.confirmed === true)) return null;
    var number = String(p.trainNumber || "").trim().toUpperCase();
    var working = itoMarchWorking.find(function(group) {
      return group.numbers.indexOf(number) >= 0;
    });
    if (working) {
      var substitution = working.status === "resort21-substitution-possible";
      var models = substitution
        ? ["伊豆急行2100系","伊豆急行8000系"] : [working.model];
      var sqlCandidates = Array.isArray(p.plannedVehicleCandidates)
        ? p.plannedVehicleCandidates.filter(Boolean) : [];
      return {
        lineId:"Ito", trainNumber:number, owner:"Izukyu",
        models:models, status:"UNCONFIRMED_PLANNED_FLEET",
        referenceModel:substitution ? "" : working.model,
        referencePng:substitution ? "" : working.png,
        substitutionPossible:substitution,
        sourceCandidateConflict:sqlCandidates.length > 0 &&
          sqlCandidates.every(function(m){return models.indexOf(m)<0;}),
        authorizesPNG:!substitution, confirmed:false,
        source:"independent-20260314-working-reference",
        sourceUrl:"https://ss1.xrea.com/shirabetai.g1.xrea.com/unyou/20260314/ito_ikk.html"
      };
    }
    // Eight E-suffix JR through services genuinely remain a two-fleet
    // candidate. Do not choose E231 or E233 using the train number alone.
    if (itoJrETrainNumbers.indexOf(number) >= 0) {
      return {
        lineId:"Ito",trainNumber:number,owner:"JR-East",
        models:["E231系1000番台","E233系3000番台"],
        status:"UNCONFIRMED_PLANNED_FLEET",
        referenceModel:"",referencePng:"",substitutionPossible:false,
        sourceCandidateConflict:false,
        authorizesPNG:false,confirmed:false,
        source:"sql-two-model-fleet-reference",
        sourceUrl:"https://timetables.jreast.co.jp/2611/timetable-v/101d1.html"
      };
    }
    return null;
  }
  // Hachiko SOUTH: 209-3500 / E231-3000 shared duties, 2026-11.
  // The public E train number certifies neither carset.
  // https://timetables.jreast.co.jp/2611/timetable-v/706d1.html
  // https://timetables.jreast.co.jp/2611/timetable-v/706u1.html
  // https://4gousya.net/jr_e/line/8113.php
  var hachikoSouthRule=rows.find(function(row){
    return row.lineIds.length===1 && row.lineIds[0]==="Hachiko" &&
      row.suffixes==="E" && row.model==="E231系3000番台" &&
      Array.isArray(row.publishedNumbers);
  });
  var hachikoSouthNumbers=Object.freeze(hachikoSouthRule
    ? hachikoSouthRule.publishedNumbers.slice() : []);
  function matchHachikoSouthCandidates(p){
    if(!p || p.positionSource!=="supabase-train-run" ||
       p.estimated!==true ||
       String(p.positionLineId||p.lineId||"")!=="Hachiko" ||
       String(p.displayLineId||p.positionLineId||p.lineId||"")!=="Hachiko" ||
       String(p.sourceRailway||"")!=="odpt.Railway:JR-East.Hachiko" ||
       !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(String(p.serviceDate||"")) ||
       !/(?:[.:])Local$/.test(String(p.trainType||"")) ||
       p.vehicleResolvedFromRealtime===true || p.vehicleIdentityStatus==="EXACT" ||
       (p.vehiclePlan && (p.vehiclePlan.confirmed===true ||
         (p.vehiclePlan.status==="PLANNED_MODEL" &&
          Array.isArray(p.vehiclePlan.models) && p.vehiclePlan.models.length===1))))
      return null;
    var n=String(p.trainNumber||"").trim().toUpperCase();
    if(!/^[0-9]{3,4}E$/.test(n) || hachikoSouthNumbers.indexOf(n)<0) return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op && op!=="JR-East" && op!=="odpt.Operator:JR-East")return null;
    var models=["E231系3000番台","209系3500番台"];
    var sourceCandidates=Array.isArray(p.plannedVehicleCandidates)
      ?p.plannedVehicleCandidates.filter(Boolean):[];
    if(sourceCandidates.length && (sourceCandidates.length!==2 ||
       sourceCandidates.some(function(m){return models.indexOf(m)<0;})))return null;
    var planModels=p.vehiclePlan && Array.isArray(p.vehiclePlan.models)
      ?p.vehiclePlan.models.filter(Boolean):[];
    if(planModels.length && (planModels.length!==2 ||
       planModels.some(function(m){return models.indexOf(m)<0;})))return null;
    return {lineId:"Hachiko",trainNumber:n,models:models,
      candidateAssets:[
        "../images/列车/JR東日本/JR東日本_E231系_3000番台.png",
        "../images/列车/JR東日本/JR東日本_209系_3500番台.png"
      ],
      // A stable SINGLE gallery PNG for *visual illustration only*.
      // It is NOT evidence that this train uses an E231 today.
      illustrationModel:"E231系3000番台",
      illustrationPng:"../images/列车/JR東日本/JR東日本_E231系_3000番台.png",
      illustrationOnly:true,authorizesIllustration:true,
      status:"UNCONFIRMED_PLANNED_FLEET",confirmed:false,
      authorizesPNG:false,source:"hachiko-202611-common-working",
      sourceUrl:"https://4gousya.net/jr_e/line/8113.php"};
  }

  // Existing SQL's 211 / E233 candidate is undated and predates the
  // autumn 2026 E131-200 service. Do not infer a physical model from M.
  // https://www.jreast.co.jp/press/2026/nagano/20260507_na01.pdf
  // https://news.railway-pressnet.com/archives/92382
  var chuoMainLocalNumbers=Object.freeze({
    weekday:Object.freeze(["148M","150M","151M","152M","153M","154M","155M","156M","157M","158M","159M","160M","161M","162M","163M","164M","165M","166M","167M","169M","203M","205M","209M","210M","211M","320M","321M","322M","323M","324M","325M","326M","327M","328M","329M","330M","331M","332M","333M","334M","335M","336M","337M","338M","339M","340M","341M","342M","343M","344M","345M","346M","347M","348M","349M","350M","351M","352M","353M","354M","355M","356M","357M","358M","359M","360M","361M","362M","363M","364M","365M","367M","420M","421M","422M","423M","424M","425M","426M","427M","428M","429M","430M","431M","432M","433M","434M","435M","436M","437M","438M","439M","440M","441M","442M","443M","444M","445M","446M","447M","448M","449M","450M","520M","521M","522M","523M","524M","525M","526M","527M","528M","529M","530M","531M","532M","533M","534M","535M","536M","537M","538M","539M","540M","541M","542M","543M","544M","545M","546M","547M","548M","549M","550M","551M","552M","553M","554M","555M","556M","558M","645M","1223M","1227M","1229M","1230M","1231M","1232M","1233M","1234M","1235M","1236M","1262M","1403M","1405M","1407M","1408M","1410M","1412M","1413M","1416M","1418M","1419M","1420M","1421M","1423M","1424M","1425M","1426M","1428M","1429M","1431M","1432M","1433M","1434M","1436M","1450M","1451M","1452M","1453M","1454M","1455M","1456M","1457M","1460M","1461M","1464M","1465M","1467M","1519M","1520M","1522M","1524M","1530M","1531M","1532M","1534M","1536M","1538M","1539M","1540M","1542M","1544M","1546M","1548M","1550M","1551M","1553M","1557M","1559M","1561M","1563M","1565M","1567M","1568M","1570M","1571M","1573M","1575M","1577M","2230M","2234M","2237M","2238M","2241M","2243M","3424M","3425M","3520M","3523M"]),
    holiday:Object.freeze(["148M","150M","151M","152M","153M","154M","155M","156M","157M","158M","159M","160M","161M","162M","163M","164M","165M","166M","167M","169M","203M","205M","209M","210M","211M","320M","321M","322M","323M","324M","325M","326M","327M","328M","329M","330M","331M","332M","333M","334M","335M","336M","337M","338M","339M","341M","342M","343M","346M","347M","348M","349M","350M","351M","352M","353M","354M","355M","356M","357M","358M","359M","360M","361M","362M","363M","364M","365M","367M","420M","421M","422M","423M","424M","425M","426M","427M","428M","429M","430M","431M","432M","433M","434M","435M","436M","437M","438M","439M","440M","441M","442M","443M","444M","445M","446M","447M","448M","449M","450M","520M","521M","522M","523M","524M","525M","526M","527M","528M","529M","530M","531M","532M","533M","534M","535M","536M","537M","538M","539M","540M","541M","542M","543M","544M","545M","546M","547M","548M","549M","550M","551M","552M","553M","554M","555M","556M","558M","1223M","1227M","1229M","1230M","1231M","1232M","1233M","1234M","1235M","1236M","1262M","1403M","1405M","1407M","1408M","1410M","1412M","1413M","1416M","1418M","1419M","1420M","1421M","1423M","1424M","1425M","1426M","1428M","1429M","1431M","1432M","1433M","1434M","1436M","1450M","1451M","1452M","1453M","1454M","1455M","1456M","1457M","1460M","1461M","1464M","1465M","1467M","1519M","1520M","1522M","1524M","1530M","1531M","1532M","1534M","1536M","1538M","1539M","1540M","1542M","1544M","1546M","1548M","1550M","1551M","1553M","1557M","1559M","1561M","1563M","1565M","1567M","1568M","1570M","1571M","1573M","1575M","1577M","2230M","2234M","2237M","2238M","2241M","2243M","3424M","3425M","3520M","3523M"])
  });
  var chuoMainE233MPairs=Object.freeze((function(){
    var row=rows.find(function(r){
      return r.lineIds.length===1 && r.lineIds[0]==="ChuoMain" &&
        r.suffixes==="M" && r.model==="E233系0番台" &&
        Array.isArray(r.publishedNumbers);
    });
    return row ? row.publishedNumbers.slice() : [];
  })());
  function matchChuoMainLocalReference(p) {
    if(!p || p.positionSource!=="supabase-train-run" ||
       p.estimated!==true ||
       String(p.positionLineId||p.lineId||"")!=="ChuoMain" ||
       String(p.displayLineId||p.positionLineId||p.lineId||"")!=="ChuoMain" ||
       ["odpt.Railway:JR-East.ChuoMain","odpt.Railway:JR-East.Chuo"]
         .indexOf(String(p.sourceRailway||""))<0 ||
       !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(String(p.serviceDate||"")) ||
       !/(?:[.:])Local$/.test(String(p.trainType||"")) ||
       p.vehicleResolvedFromRealtime===true ||
       p.vehicleIdentityStatus==="EXACT" ||
       p.realtimeVehicleType || p.realtimeDerivedVehicleType ||
       (p.vehiclePlan && (p.vehiclePlan.confirmed===true ||
         p.vehiclePlan.status==="PLANNED_MODEL")))return null;
    var num=String(p.trainNumber||"").trim().toUpperCase();
    if(!/^[0-9]{2,4}M$/.test(num) ||
       chuoMainE233MPairs.indexOf(num)>=0)return null;
    var calendar=sourceCalendar(p);
    var set=calendar==="weekday"?chuoMainLocalNumbers.weekday:
      calendar==="holiday"?chuoMainLocalNumbers.holiday:null;
    if(set ? set.indexOf(num)<0 :
        chuoMainLocalNumbers.weekday.indexOf(num)<0 &&
        chuoMainLocalNumbers.holiday.indexOf(num)<0)return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op && op!=="JR-East" && op!=="odpt.Operator:JR-East")return null;
    var candidates=Array.isArray(p.plannedVehicleCandidates)
      ?p.plannedVehicleCandidates.filter(Boolean):[];
    if(candidates.length &&
       (!candidates.some(function(x){return /^211系/.test(x);}) ||
        candidates.some(function(x){
          return !/^211系/.test(x) && x!=="E233系0番台" &&
            x!=="E131系200番台";
        })))return null;
    if(p.vehiclePlan && Array.isArray(p.vehiclePlan.models) &&
       p.vehiclePlan.models.length &&
       p.vehiclePlan.models.every(function(x){
         return !/^211系/.test(x) && x!=="E233系0番台" &&
           x!=="E131系200番台";
       }))return null;
    return {lineId:"ChuoMain",trainNumber:num,
      models:["211系（長野地区）","E131系200番台","E233系0番台"],
      illustrationModel:"211系（長野地区）",
      illustrationPng:"../images/列车/JR東日本/JR東日本_211系_長野色.png",
      illustrationOnly:true,authorizesIllustration:true,
      authorizesPNG:false,confirmed:false,
      status:"UNCONFIRMED_PLANNED_FLEET",
      source:"undated-sql-2026-autumn-fleet-reference"};
  }
  // ChuoMain November 2026 SQL is an UNDATED train roster. A vehicle
  // illustration never proves the actual formation or train operating day.
  // JR-East: Resort View Suwako 9580D/9581D = HB-E300, Nov 7 only.
  // https://timetables.jreast.co.jp/2611/train/185/189211.html
  // https://www.jreast.co.jp/press/2026/nagano/20260624_na01.pdf
  var chuoMissingServiceNumbers=Object.freeze({
    express:Object.freeze(["5102M","5106M","5110M","5114M","5135M",
      "5139M","5143M","5147M","5151M","5157M","5159M","8074M",
      "8075M","8077M","8079M","8083M","8084M","8170M","8193M",
      "8194M","8199M","8091M","8092M","9021M","9022M","9071M",
      "9076M","9078M","9081M","9082M","9085M","9086M","9088M",
      "9089M","9091M","9093M","9178M","9181M"]),
    local:Object.freeze(["9592M","9593M"]),
    rapid211:Object.freeze(["2535M"]),
    resort:Object.freeze(["9580D","9581D"])
  });
  function matchChuoMainUnmappedReference(p) {
    if(!p || p.positionSource!=="supabase-train-run" ||
       p.estimated!==true ||
       String(p.positionLineId||p.lineId||"")!=="ChuoMain" ||
       String(p.displayLineId||p.positionLineId||p.lineId||"")!=="ChuoMain" ||
       ["odpt.Railway:JR-East.ChuoMain","odpt.Railway:JR-East.Chuo"]
         .indexOf(String(p.sourceRailway||""))<0 ||
       !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(String(p.serviceDate||"")) ||
       p.vehicleResolvedFromRealtime===true ||
       p.vehicleIdentityStatus==="EXACT" ||
       p.realtimeVehicleType || p.realtimeDerivedVehicleType ||
       (p.vehiclePlan && (p.vehiclePlan.confirmed===true ||
         p.vehiclePlan.status==="PLANNED_MODEL")))return null;
    var op=String(p.trainOperator||p.operator||"");
    if(op && op!=="JR-East" && op!=="odpt.Operator:JR-East")return null;
    var n=String(p.trainNumber||"").trim().toUpperCase();
    var type=String(p.trainType||"").split(/[.:]/).pop();
    var cal=sourceCalendar(p),date=String(p.serviceDate||"");
    var cs=Array.isArray(p.plannedVehicleCandidates)
      ?p.plannedVehicleCandidates.filter(Boolean):[];
    var ps=p.vehiclePlan && Array.isArray(p.vehiclePlan.models)
      ?p.vehiclePlan.models.filter(Boolean):[];
    function compatible(regex){
      return cs.length>0 &&
        cs.every(function(v){return regex.test(String(v));}) &&
        (!ps.length || ps.every(function(v){return regex.test(String(v));}));
    }
    var model="",png="",source="";
    // 8xxx/9xxx temporary expresses have day-specific operation and may
    // substitute E257 stock (e.g. 9086M): an undated SQL E353 label is
    // NOT enough to choose the model or to claim the train runs today.
    // Let the existing date-authorized official number resolver handle
    // them; otherwise the renderer shows one identity-neutral train.
    if(type==="LimitedExpress" && /^[89][0-9]{3}M$/.test(n) &&
       n!=="8091M" && n!=="8092M")return null;
    if(type==="LimitedExpress" &&
       (n==="8091M" || n==="8092M") && cal!=="weekday")return null;
    if(type==="LimitedExpress" &&
       chuoMissingServiceNumbers.express.indexOf(n)>=0 &&
       compatible(/^E353系(?:（[^）]+）)?$/)) {
      // An existing dated rule that rejects today's operating date
      // must not be bypassed by an illustrative E353 fleet fallback.
      var dated=rows.filter(function(row){
        return row.lineIds.indexOf("ChuoMain")>=0 &&
          row.trainType==="LimitedExpress" &&
          Array.isArray(row.publishedNumbers) &&
          row.publishedNumbers.indexOf(n)>=0 &&
          Array.isArray(row.operatingDates) && row.operatingDates.length;
      });
      if(dated.length && !dated.some(function(row){
        return row.operatingDates.indexOf(date)>=0 &&
          (!row.calendarType || row.calendarType===cal);
      }))return null;
      model="E353系";
      png="../images/列车/JR東日本/JR東日本_E353系.png";
      source="sql-e353-family-reference-operation-day-unverified";
    }else if(type==="Local" && cal==="holiday" &&
      chuoMissingServiceNumbers.local.indexOf(n)>=0 &&
      compatible(/^(?:211系(?:（長野地区）)?|E233系0番台|E131系200番台)$/) &&
      cs.some(function(x){return /^211系/.test(x);})) {
      model="211系（長野地区）";
      png="../images/列车/JR東日本/JR東日本_211系_長野色.png";
      source="sql-extra-local-illustration";
    }else if(type==="Rapid" &&
      chuoMissingServiceNumbers.rapid211.indexOf(n)>=0 &&
      compatible(/^(?:211系(?:（長野地区）)?|E233系0番台|E131系200番台)$/) &&
      cs.some(function(x){return /^211系/.test(x);})) {
      model="211系（長野地区）";
      png="../images/列车/JR東日本/JR東日本_211系_長野色.png";
      source="2535m-observed-211-202605-reference";
    }else if(type==="Rapid" && cal==="holiday" &&
      date==="2026-11-07" &&
      chuoMissingServiceNumbers.resort.indexOf(n)>=0) {
      // The old SQL 211/E233 label is wrong for this named resort run.
      model="HB-E300系（リゾートビューふるさと）";
      png="../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png";
      source="official-resort-view-suwako-20261107";
    }
    if(!png)return null;
    return {lineId:"ChuoMain",trainNumber:n,models:[model],
      illustrationModel:model,illustrationPng:png,source:source,
      illustrationOnly:true,authorizesIllustration:true,
      authorizesPNG:false,confirmed:false,
      status:"UNCONFIRMED_PLANNED_FLEET"};
  }
  // JR-East 2611 中央・総武線各駅停車 B/C. The historical SQL source
  // has 483 weekday and 429 holiday FULL public numbers, all numerically
  // between 402 and 2499. The numeric bounds only constrain realtime
  // data; they DO NOT declare every number in this interval a valid train.
  // Fresh ODPT trainId is the concrete evidence that the specific number
  // exists today. NO derivation of a 63B working number, and NO inference
  // that an actual B/C train is E231-500 rather than E231-0 or E235-0.
  // https://timetables.jreast.co.jp/2611/timetable-v/659u1.html
  function matchChuoSobuLocalBCLiveNumber(p) {
    if (!p || p.positionSource !== "realtime-api" || p.estimated === true ||
        p.realtimePositionRecordPresent === false ||
        p.positionLineId !== "ChuoSobuLocal" ||
        String(p.displayLineId || p.positionLineId) !== "ChuoSobuLocal" ||
        p.sourceRailway !== "odpt.Railway:JR-East.ChuoSobuLocal" ||
        p.trainType !== "odpt.TrainType:JR-East.Local" ||
        (p.trainOperator && p.trainOperator !== "JR-East" &&
          p.trainOperator !== "odpt.Operator:JR-East") ||
        p.vehicleIdentityStatus === "EXACT" ||
        p.vehicleResolvedFromRealtime === true ||
        p.actualVehicleConfirmed === true ||
        p.vehicleFormationId ||
        (Array.isArray(p.vehicleFormationCandidates) && p.vehicleFormationCandidates.length) ||
        p.realtimeVehicleType || p.vehicleType || p.vehicleIconPath ||
        (p.vehicleResolution && p.vehicleResolution.identityStatus === "EXACT") ||
        (p.vehicleResolutionLineId && p.vehicleResolutionLineId !== "ChuoSobuLocal"))
      return null;
    var n = String(p.trainNumber || "").trim().toUpperCase();
    var day = String(p.serviceDate || "").slice(0, 10);
    var dir = String(p.railDirection || "").split(/[.:]/).pop();
    var num = Number(n.slice(0,-1));
    // Only an observed JR train with its exact ODPT entity ID is admitted:
    // a generic B/C suffix or a timeless operation number is insufficient.
    if (!/^[0-9]{3,4}[BC]$/.test(n) || num < 402 || num > 2499 ||
        !/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(day) ||
        (dir !== "Eastbound" && dir !== "Westbound") ||
        (num % 2 === 0) !== (dir === "Eastbound") ||
        String(p.trainId || "") !== "odpt.Train:JR-East.ChuoSobuLocal." + n)
      return null;
    var model = "E231系500番台";
    var png = "../images/列车/JR東日本/JR東日本_E231系_500番台_中央・総武線各駅停車.png";
    var garage = root.VehicleGaragePngMap;
    if (!garage || typeof garage.matchModelPath !== "function" ||
        !garage.matchModelPath(model, png, "ChuoSobuLocal")) return null;
    return {
      lineId: "ChuoSobuLocal", trainNumber: n,
      numberSource: "odpt-live-jreast-train-id",
      numberScope: "2611-bc-402-2499",
      referenceOnly: true, authorizesIllustration: true,
      authorizesPNG: false, actualVehicleConfirmed: false,
      model: null, formationId: null,
      candidateModels: [
        "E231系500番台",
        "E231系0番台（中央・総武線各駅停車）",
        "E235系0番台（中央・総武線各駅停車）"
      ],
      illustrationModel: model, illustrationPng: png,
      status: "UNCONFIRMED_MIXED_FLEET"
    };
  }

  root.TrainNumberPngRanges=Object.freeze({
    version:"20261105-kashima-sql-2611-v1",match:match,
    verifyJoetsuService:verifyJoetsuService,
    verifyKamaishiService:verifyKamaishiService,
    verifyKashimaService:verifyKashimaService,
    verifyKesennumaRailService:verifyKesennumaRailService,
    verifyKomiiService:verifyKomiiService,
    verifyHanawaService:verifyHanawaService,
    verifyKururiService:verifyKururiService,
    verifyMitoService:verifyMitoService,
    verifyMiyoService:verifyMiyoService,
    verifyKoseiSourceFleet:verifyKoseiSourceFleet,
    verifyFukuchiyamaSourceFleet:verifyFukuchiyamaSourceFleet,
    verifyFukuchiyamaFriday7025:verifyFukuchiyamaFriday7025,
    verifyJrWestKyotoKobeSourceFleet:verifyJrWestKyotoKobeSourceFleet,
    verifySotetsuJRService:verifySotetsuJRService,
    verifyOfunatoService:verifyOfunatoService,
    verifyOgaService:verifyOgaService,
    verifyRikutoEastService:verifyRikutoEastService,
    verifyOuMainTsugaruService:verifyOuMainTsugaruService,
    verifyOitoEastService:verifyOitoEastService,
    verifyOitoWestService:verifyOitoWestService,
    matchChuoSobuLocalBCLiveNumber:matchChuoSobuLocalBCLiveNumber,
    matchItoFleetCandidates:matchItoFleetCandidates,
    matchHachikoSouthCandidates:matchHachikoSouthCandidates,
    matchChuoMainLocalReference:matchChuoMainLocalReference,
    matchChuoMainUnmappedReference:matchChuoMainUnmappedReference
  });
})(window);
