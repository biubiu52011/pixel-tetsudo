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
    // JR East 2026 ChuoRapid published 3-4 digit T/H train numbers,
    // including 1932T, 1926H, 486T and 2452T. This is the full
    // public train-number interval, not its trailing operation digits.
    // Other ChuoRapid services (e.g. 2627M) are NOT part of this range.
    {lineIds:["ChuoRapid"],numberFormat:"full",
      from:400,to:2599,suffixes:"TH",
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
    // Yokohama trains use FULL public K numbers, including 415K, 2107K,
    // 2221K, 3937K, 4013K and 4747K (2026 weekday/weekend JR timetable).
    // The E233-6000 gallery default is scoped to Yokohama only. A train
    // continuing onto KeihinTohoku/Negishi is not reclassified from the
    // display line alone; a separate validated source-railway projection
    // would be needed to paint its vehicle on another line.
    {lineIds:["Yokohama"],numberFormat:"full",
      from:400,to:4999,suffixes:"K",excludeTrainType:"LimitedExpress",
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
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Nambu"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E233系8000番台"],
      model:"E233系8000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_8000番台.png"},
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
      sourceRailways:["odpt.Railway:JR-East.Tsurumi",
        "odpt.Railway:JR-East.TsurumiUmiShibauraBranch",
        "odpt.Railway:JR-East.TsurumiOkawaBranch"],
      validFrom:"2024-03-16",
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
    if(row.publishedNumbers)Object.freeze(row.publishedNumbers);
    Object.freeze(row);
  });
  Object.freeze(rows);
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
    if((!regular&&!numbered&&!bare)||!line)return null;
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      if(row.lineIds.indexOf(line)<0)continue;
      if(row.publishedNumbers && row.publishedNumbers.indexOf(number)<0)continue;
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
      }else continue;
      if(numberValue<row.from||numberValue>row.to||
          row.suffixes.indexOf(suffix)<0)continue;
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
      if(row.calendarType && String(context&&context.calendarType||"")!==row.calendarType)continue;
      if(row.trainTypes){
        var runtimeType=String(context&&(context.trainType||context.typeName)||"").split(/[.:]/).pop();
        if(row.trainTypes.indexOf(runtimeType)<0)continue;
      }
      if(row.sourceRailways &&
          row.sourceRailways.indexOf(String(context&&context.sourceRailway||""))<0)continue;
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
      if(row.numberIndex==="joban-e231-h-202611"){
        var idx=root.JobanE231RapidNumberIndex;
        if(!idx || typeof idx.match!=="function" ||
            !idx.match(number,String(context&&context.calendarType||""),
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
    version:"20261104-jreast-north-number-png-v32",match:match
  });
})(window);
