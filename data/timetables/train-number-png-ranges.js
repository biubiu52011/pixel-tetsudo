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
    // The 2026-11 JR-East timetable identifies all of these Karasuyama M
    // workings. JR East specifies battery EV-E301 (ACCUM) for the route.
    // These are service MODEL PNGs, never an observed physical carset.
    // https://www.jreast.co.jp/es/train/local/ev_e301.html
    // https://timetables.jreast.co.jp/2611/timetable-v/242d1.html
    {lineIds:["Karasuyama"],numberFormat:"full",from:321,to:347,
      suffixes:"M",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,sourceRailways:["odpt.Railway:JR-East.Karasuyama"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      publishedNumbers:["321M","322M","323M","324M","325M","326M","327M","328M","329M","330M","331M","332M","333M","334M","335M","336M","337M","338M","339M","340M","341M","342M","343M","344M","345M","346M","347M"],
      allowedModelLabels:["EV-E301系","EV-E301系（ACCUM）"],
      model:"EV-E301系",
      pngPath:"../images/列车/JR東日本/JR東日本_EV-E301系.png"},
    // Kururi all-day Local D workings: KiHa E130-100 fleet. This file is
    // an existing gallery image; no new artwork or timetable is synthesized.
    // https://media.jreast.co.jp/articles/6466
    // https://timetables.jreast.co.jp/2611/timetable-v/217u1.html
    {lineIds:["Kururi"],numberFormat:"full",from:900,to:2999,
      suffixes:"D",trainType:"Local",operator:"JR-East",
      sourceOperatorFallback:true,sourceRailways:["odpt.Railway:JR-East.Kururi"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      publishedNumbers:["2941D","2943D","2944D","2946D","2949D","2952D","920D","921D","922D","923D","924D","925D","926D","927D","928D","929D","930D","931D","932D","933D","934D","935D","936D","937D","938D","939D","940D","941D","942D","943D","944D","945D","946D","947D","948D","949D","950D","951D","952D","953D"],
      allowedModelLabels:["キハE130形100番台","キハE130系100番台"],
      model:"キハE130形100番台",
      pngPath:"../images/列车/JR東日本/JR東日本_キハE130系100番台.png"},
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
    // JR East published Sotetsu-through timetable numbers use 120M+ for
    // Sotetsu limited express and 220M+ for local services. Unlike K/F/S,
    // the last two digits of 277M are NOT a stock-ownership operation number.
    // Both E233-7000 and Sotetsu 12000 can operate these services.
    // Use E233-7000 strictly as the configured representative DISPLAY PNG.
    {lineIds:["SaikyoKawagoe","SotetsuJRDirect"],numberFormat:"full",
      from:120,to:199,suffixes:"M",
      model:"E233系7000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_7000番台.png"},
    {lineIds:["SaikyoKawagoe","SotetsuJRDirect"],numberFormat:"full",
      from:220,to:299,suffixes:"M",
      model:"E233系7000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_7000番台.png"},
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
        "1115M","1118M","1164M","1173M","1175M","1223M","1257M",
        "1280M","1302M","1314M","1324M","1349M","1393M","1427M",
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
      rejectAmbiguousPlan:true,model:"E231系3000番台",
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
      model:"E233系6000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_6000番台.png"},
    // 2026-11 JR East Yokosuka-Sobu numbered services.
    // EXACT public numbers from the dated source index, NEVER arbitrary ranges.
    // The Yokosuka S / Sobu Rapid F through-train family uses E235-1000
    // as an illustrative model. Yokosuka H/Y and odd M-numbered workings
    // are excluded: shared route is not evidence they are E235 trainsets.
    // https://timetables.jreast.co.jp/2611/timetable-v/222d1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/222d2.html
    {lineIds:["Yokosuka","SobuRapid","SobuMain","Narita","NaritaAirportBranch",
        "Uchibo","Sotobo","Kashima"],
      numberFormat:"full",from:400,to:5999,suffixes:"FSM",
      operator:"JR-East",sourceOperatorFallback:true,
      trainTypes:["Local","Rapid"],
      sourceRailways:["odpt.Railway:JR-East.Yokosuka",
        "odpt.Railway:JR-East.SobuRapid","odpt.Railway:JR-East.Sobu",
        "odpt.Railway:JR-East.Narita","odpt.Railway:JR-East.NaritaAirportBranch",
        "odpt.Railway:JR-East.Uchibo","odpt.Railway:JR-East.Sotobo",
        "odpt.Railway:JR-East.Kashima"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      numberIndex:"jreast-sobu-yokosuka-202611",
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
  function match(trainNumber,lineId,context){
    var number=String(trainNumber||"").trim().toUpperCase();
    var line=String(lineId||"").trim();
    // Match train NUMBER ranges, not an inferred operation ID.
    // One train number can have both a scoped tail and a full-number
    // interpretation: 1940K -> 40 on Saikyo, 1940K -> 1940 on Yokohama.
    // Determine the interpretation FROM THE LINE RULE, not from the suffix.
    // This is never a train number -> operation number conversion.
    var regular=number.match(/^[0-9]{1,2}([0-9]{2})([KFS])$/);
    // Include G for Yamanote's full public 3/4-digit G train numbers.
    // Line-scoped matching below prevents G from leaking to other routes.
    var numbered=number.match(/^([0-9]{1,4})([ABCDEKFMSTHYG])$/);
    var bare=number.match(/^([0-9]{3,4})$/);
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
      if(row.rejectAmbiguousPlan && context && context.vehiclePlan &&
         Array.isArray(context.vehiclePlan.models) &&
         context.vehiclePlan.models.length!==1)continue;
      if(row.allowedModelLabels && context){
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
    return null;
  }
  root.TrainNumberPngRanges=Object.freeze({
    version:"20261104-jre-east-official-number-calendar-v36",match:match
  });
})(window);
