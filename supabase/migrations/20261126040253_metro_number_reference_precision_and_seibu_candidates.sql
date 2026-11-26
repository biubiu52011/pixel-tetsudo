-- 地下铁番号审计实施：四组参考包络精确化、THライナー九个无冲突参考键、
-- 西武池袋线旧 F-Liner 错误候选清理。只使用既有责任表，不新增运行时规则。
-- 来源：supabase/queries/metro_hibiya_hanzomon_exact_bands_readonly.sql
-- 与 main 88c9d86b 的原始平日/土休日名单逐键一致；
-- THライナー：https://www.tobu.co.jp/railway/th/timetable/
-- https://www.tobu.co.jp/railway/th/vehicle/ 。旧模板的服务与时刻复核见既有只读查询。
-- 仅 reference-only；保留完整番号、日期、车种、运营方和车型证据门控。
-- 1645T、1841T 与反向普通车冲突，禁止写入纯数字键。
DO $metro$
DECLARE
 scope_row record;
 n integer;
 baseline_count bigint;
 baseline_other jsonb;
 baseline_conflicts bigint;
 th_keys integer[];
 th_png constant text := '../images/列车/東武鉄道/東武鉄道_70090型.png';
 old_label constant text := '西武40000系 / 東武50070系 / メトロ17000系 / 東急5050系4000番台';
 new_label constant text := '西武40000系 / メトロ17000系 / 東急5050系4000番台';
BEGIN
 LOCK TABLE public.published_train_png_number_ranges, public.manual_timetable_templates IN SHARE ROW EXCLUSIVE MODE;
 SELECT count(*) INTO baseline_count FROM public.published_train_png_number_ranges WHERE edition='2611';
 SELECT count(*) INTO baseline_conflicts FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.png_reference<b.png_reference AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 WHERE a.edition='2611';
 SELECT jsonb_agg(to_jsonb(r) ORDER BY line_key,segment_key,min_number,max_number,suffix) INTO baseline_other
 FROM public.published_train_png_number_ranges r WHERE edition='2611' AND line_key NOT IN ('Hibiya','Hanzomon');
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key IN ('Hibiya','Hanzomon'))<>4
 THEN RAISE EXCEPTION 'metro: scope changed; review required'; END IF;
 -- 重跑官方服务时刻预检，保留两组冲突。
 SELECT array_agg(DISTINCT substring(q.numeric_suffix from '[0-9]+')::int ORDER BY substring(q.numeric_suffix from '[0-9]+')::int)
 FILTER(WHERE q.other_service_conflicts IS NULL),count(*) FILTER(WHERE q.verified_templates=1 AND q.eligible_png=1)
 INTO th_keys,n FROM (
WITH expected(cal,number,service_no,clocks) AS (
 VALUES
 ('Weekday','A643T',2,ARRAY['07:07','07:11','07:18','07:27','07:44']),
 ('Weekday','A845T',4,ARRAY['09:08','09:13','09:19','09:28','09:46']),
 ('Weekday','B1743T',1,ARRAY['17:02','17:06','17:14','17:21','17:25']),
 ('Weekday','B1847T',3,ARRAY['18:02','18:06','18:14','18:21','18:25']),
 ('Weekday','B1845T',5,ARRAY['19:02','19:06','19:14','19:21','19:25']),
 ('Weekday','B1941T',7,ARRAY['20:02','20:06','20:14','20:21','20:25']),
 ('Weekday','B2043T',9,ARRAY['21:02','21:06','21:14','21:21','21:25']),
 ('SaturdayHoliday','A845T',2,ARRAY['09:07','09:11','09:17','09:26','09:43']),
 ('SaturdayHoliday','A947T',4,ARRAY['10:17','10:21','10:27','10:36','10:53']),
 ('SaturdayHoliday','B1645T',1,ARRAY['16:02','16:06','16:14','16:21','16:25']),
 ('SaturdayHoliday','B1743T',3,ARRAY['17:02','17:06','17:14','17:21','17:25']),
 ('SaturdayHoliday','B1841T',5,ARRAY['18:02','18:06','18:14','18:21','18:25']),
 ('SaturdayHoliday','B1847T',7,ARRAY['19:02','19:06','19:14','19:21','19:25']),
 ('SaturdayHoliday','B1945T',9,ARRAY['20:02','20:06','20:14','20:21','20:25'])
), checkpoints AS (
 SELECT e.*,k.ordinality,k.station
 FROM expected e CROSS JOIN LATERAL unnest(CASE WHEN left(e.number,1)='A'
 THEN ARRAY['Ueno','Akihabara','Kayabacho','Ginza','Ebisu']
 ELSE ARRAY['Kasumigaseki','Ginza','Kayabacho','Akihabara','Ueno'] END)
 WITH ORDINALITY k(station,ordinality)
), candidates AS (
 SELECT m.id,m.train_number,m.calendar_urn
 FROM public.manual_timetable_templates m
 JOIN public.train_timetable_source_resolution r ON r.source_template_id=m.id
 WHERE m.line_key='Hibiya' AND m.train_type_urn='odpt.TrainType:TokyoMetro.TH-LINER'
 AND r.mapping_level='official_service_vehicle_plan' AND r.vehicle_type='東武70090型'
), matched AS (
 SELECT c.cal,c.number,c.service_no,m.id, count(*) FILTER(WHERE
 CASE WHEN left(c.number,1)='A' THEN s.arrival_clock ELSE s.departure_clock END
 = c.clocks[c.ordinality::int]) matched_stations
 FROM checkpoints c JOIN candidates m ON m.train_number=c.number AND m.calendar_urn='odpt.Calendar:'||c.cal
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 AND regexp_replace(coalesce(s.departure_station_urn,s.arrival_station_urn),'^.*\.','')=c.station
 GROUP BY 1,2,3,4
)
SELECT e.cal,e.number,e.service_no,
 (SELECT count(*) FROM matched m WHERE m.cal=e.cal AND m.number=e.number AND matched_stations=5) verified_templates,
 regexp_replace(e.number,'^[AB]','') numeric_suffix,
 (SELECT string_agg(DISTINCT t.train_number||':'||t.train_type_urn,',') FROM public.manual_timetable_templates t
 WHERE t.line_key='Hibiya' AND regexp_replace(t.train_number,'^[AB]','')=regexp_replace(e.number,'^[AB]','')
 AND t.train_type_urn IS DISTINCT FROM 'odpt.TrainType:TokyoMetro.TH-LINER') other_service_conflicts,
 (SELECT count(*) FROM public.vehicle_image_assets a WHERE a.image_path='images/列车/東武鉄道/東武鉄道_70090型.png'
 AND a.asset_scope='generic' AND a.asset_status='available' AND a.file_format_status='native_png') eligible_png
FROM expected e ORDER BY e.cal,e.service_no
 ) q;
 IF n<>14 OR th_keys IS DISTINCT FROM ARRAY[643,845,947,1743,1845,1847,1941,1945,2043]
 THEN RAISE EXCEPTION 'metro: TH Liner evidence changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.manual_timetable_templates m WHERE m.line_key='Hibiya'
 AND m.train_number ~ '^[AB]?[0-9]+T$' AND substring(m.train_number from '[0-9]+')::int=ANY(th_keys)
 AND m.train_type_urn IS DISTINCT FROM 'odpt.TrainType:TokyoMetro.TH-LINER')
 THEN RAISE EXCEPTION 'metro: TH Liner number conflict'; END IF;
 IF (SELECT count(*) FROM public.vehicle_image_assets WHERE image_path=substring(th_png from 4)
 AND asset_scope='generic' AND asset_status='available' AND file_format_status='native_png'
 AND appearance_class IS DISTINCT FROM 'requires_review')<>1
 THEN RAISE EXCEPTION 'metro: TH Liner asset changed'; END IF;
 IF (SELECT count(*) FROM public.manual_timetable_templates m
 JOIN public.train_timetable_source_resolution r ON r.source_template_id=m.id
 WHERE m.line_key='Ikebukuro' AND m.source_path='data/timetables/Ikebukuro-manual.js'
 AND m.train_type_urn='odpt.TrainType:Seibu.F-Liner' AND m.vehicle_type_label=old_label
 AND r.mapping_level='unresolved' AND r.vehicle_type IS NULL AND r.vehicle_artwork_path IS NULL
 AND r.timetable_validity='undated_not_current_verified')<>62
 OR (SELECT count(*) FROM public.manual_timetable_templates m WHERE m.line_key='Ikebukuro'
 AND m.train_type_urn='odpt.TrainType:Seibu.F-Liner' AND m.vehicle_type_label=old_label)<>62
 OR (SELECT count(*) FROM public.manual_timetable_templates m WHERE m.line_key='Ikebukuro'
 AND m.train_type_urn='odpt.TrainType:Seibu.F-Liner' AND m.vehicle_type_label=new_label)<>0
 THEN RAISE EXCEPTION 'metro: Seibu precondition changed'; END IF;
 FOR scope_row IN SELECT * FROM (VALUES
 ('Hibiya','S',502,2468,'../images/列车/東京メトロ/東京メトロ_13000系.png',455,442,ARRAY[502,512,514,524,526,530,532,534,536,538,540,542,544,550,556,558,560,561,562,566,568,570,572,602,604,606,608,610,612,614,616,620,626,628,632,634,636,638,640,642,644,646,648,652,661,662,663,664,666,668,672,674,702,704,706,708,710,712,714,716,718,722,724,726,728,730,732,734,736,738,742,744,746,748,754,756,758,760,761,762,763,764,770,772,802,804,806,808,810,812,814,816,818,820,822,824,826,830,832,834,838,840,842,844,846,848,850,852,856,860,861,863,866,868,874,902,904,906,908,910,912,914,916,920,922,926,928,930,934,936,938,940,942,944,946,948,952,956,958,962,963,964,966,974,1002,1004,1006,1014,1016,1018,1022,1024,1026,1030,1032,1034,1036,1038,1042,1044,1046,1048,1050,1062,1063,1066,1070,1074,1104,1106,1110,1112,1114,1122,1126,1128,1130,1134,1136,1138,1142,1144,1146,1164,1166,1170,1202,1204,1206,1210,1214,1216,1218,1222,1224,1226,1230,1232,1236,1238,1242,1244,1246,1248,1262,1266,1274,1304,1306,1312,1314,1318,1322,1326,1328,1330,1332,1334,1336,1338,1342,1344,1346,1364,1366,1370,1402,1404,1406,1410,1412,1414,1416,1422,1424,1426,1430,1436,1438,1442,1444,1446,1448,1462,1464,1466,1474,1504,1506,1508,1512,1514,1518,1522,1524,1526,1528,1530,1532,1534,1536,1538,1542,1544,1546,1566,1602,1604,1606,1608,1610,1612,1614,1616,1620,1622,1624,1626,1628,1630,1632,1634,1636,1638,1640,1642,1644,1646,1648,1650,1654,1656,1662,1664,1666,1670,1674,1702,1704,1706,1708,1710,1712,1714,1720,1722,1724,1726,1728,1730,1732,1734,1736,1738,1740,1742,1744,1746,1750,1752,1756,1758,1762,1766,1768,1772,1802,1804,1806,1808,1810,1812,1814,1816,1818,1822,1830,1832,1834,1836,1840,1842,1844,1846,1848,1850,1852,1854,1856,1862,1864,1866,1868,1870,1874,1902,1904,1906,1908,1910,1912,1914,1916,1918,1924,1926,1928,1930,1932,1934,1936,1938,1940,1944,1948,1950,1954,1964,1966,1968,1972,2002,2004,2006,2010,2012,2014,2016,2018,2022,2026,2032,2036,2038,2040,2044,2046,2048,2050,2052,2062,2072,2074,2102,2108,2110,2112,2114,2118,2122,2124,2128,2130,2140,2144,2148,2150,2154,2162,2166,2168,2204,2206,2208,2210,2212,2216,2218,2228,2230,2232,2236,2240,2248,2250,2254,2268,2272,2274,2302,2308,2314,2318,2322,2330,2340,2350,2354,2372,2374,2410,2418,2430,2436,2468]::int[]),
 ('Hanzomon','S',551,2491,'../images/列车/東京メトロ/東京メトロ_18000系.png',216,216,ARRAY[551,555,563,565,567,573,575,579,581,583,585,589,591,653,657,659,661,663,665,667,669,671,673,675,677,681,683,687,689,691,693,753,755,757,759,761,763,765,767,769,771,773,777,779,785,793,851,853,855,857,859,861,863,867,875,877,879,881,883,887,953,955,957,959,963,965,967,969,973,975,977,979,985,987,989,993,1055,1057,1059,1063,1067,1071,1073,1077,1083,1091,1093,1151,1153,1159,1161,1163,1169,1173,1175,1187,1253,1255,1263,1265,1267,1269,1271,1275,1277,1279,1287,1289,1293,1355,1357,1359,1361,1363,1365,1367,1371,1373,1377,1391,1393,1451,1459,1461,1469,1471,1477,1487,1491,1551,1553,1555,1557,1563,1565,1567,1571,1573,1575,1577,1579,1591,1651,1653,1655,1661,1663,1669,1671,1673,1677,1689,1693,1751,1757,1759,1761,1765,1775,1779,1791,1853,1855,1857,1863,1867,1869,1871,1873,1877,1879,1889,1893,1951,1959,1963,1971,1973,1987,1991,2051,2055,2057,2061,2063,2065,2067,2069,2073,2075,2077,2079,2089,2091,2093,2151,2155,2157,2159,2165,2171,2173,2177,2255,2259,2269,2271,2273,2291,2355,2361,2373,2375,2377,2471,2491]::int[]),
 ('Hanzomon','K',501,2333,'../images/列车/東急電鉄/東急電鉄_2020系.png',396,157,ARRAY[501,502,503,504,505,506,507,508,509,510,525,526,528,529,531,532,533,534,601,605,606,608,609,610,611,612,613,614,615,616,626,628,630,631,633,635,636,637,639,702,703,704,706,707,708,709,710,711,713,716,717,718,719,720,721,722,723,724,727,729,731,732,736,738,740,741,742,743,744,801,805,807,808,809,810,811,812,813,815,816,817,818,819,820,821,822,825,826,828,830,832,833,834,835,837,839,840,843,901,902,906,907,908,909,911,912,913,916,917,919,920,921,922,923,926,932,936,941,1001,1002,1003,1004,1005,1006,1007,1008,1010,1013,1017,1018,1019,1020,1021,1022,1023,1027,1028,1036,1101,1102,1104,1105,1106,1107,1108,1109,1110,1111,1115,1117,1118,1119,1120,1124,1125,1204,1205,1206,1207,1208,1210,1211,1212,1213,1216,1217,1219,1220,1221,1222,1223,1224,1301,1302,1303,1304,1306,1307,1308,1309,1312,1315,1317,1318,1321,1322,1323,1325,1401,1405,1406,1407,1408,1409,1410,1411,1415,1416,1419,1420,1421,1422,1423,1424,1502,1503,1504,1505,1506,1507,1508,1509,1510,1511,1512,1513,1514,1515,1516,1517,1518,1519,1523,1524,1529,1530,1531,1532,1601,1603,1605,1608,1609,1611,1613,1615,1617,1618,1620,1621,1622,1623,1624,1625,1626,1629,1630,1633,1634,1635,1636,1703,1704,1705,1706,1708,1709,1710,1711,1712,1714,1716,1717,1719,1720,1721,1723,1724,1725,1727,1728,1732,1734,1737,1738,1739,1740,1802,1807,1808,1810,1813,1815,1816,1817,1818,1819,1820,1821,1822,1823,1825,1826,1828,1829,1830,1831,1833,1836,1837,1838,1839,1841,1842,1901,1903,1904,1905,1909,1911,1913,1915,1916,1918,1920,1921,1922,1923,1924,1925,1926,1929,1932,1934,1935,1936,1940,1941,1942,2002,2004,2005,2006,2008,2009,2010,2011,2012,2014,2016,2018,2019,2021,2023,2024,2026,2028,2030,2031,2037,2038,2039,2101,2103,2104,2110,2113,2116,2117,2119,2120,2122,2129,2132,2133,2135,2136,2138,2201,2202,2204,2205,2208,2209,2211,2212,2216,2219,2223,2224,2225,2226,2228,2231,2234,2235,2310,2313,2316,2318,2319,2321,2323,2326,2329,2333]::int[]),
 ('Hanzomon','T',452,2282,'../images/列车/東武鉄道/東武鉄道_50050型.png',188,188,ARRAY[452,550,554,556,558,560,562,564,582,662,664,666,668,670,672,674,680,750,752,754,756,770,772,776,778,782,856,858,860,862,864,874,880,882,950,952,954,958,960,962,966,968,970,972,974,976,980,1050,1052,1054,1056,1058,1064,1066,1070,1072,1078,1082,1152,1154,1158,1160,1162,1164,1166,1168,1170,1172,1174,1176,1180,1182,1250,1268,1270,1272,1274,1276,1280,1282,1350,1354,1356,1358,1360,1362,1366,1372,1374,1378,1382,1452,1454,1458,1460,1462,1464,1466,1468,1470,1476,1478,1480,1482,1550,1556,1560,1562,1566,1570,1572,1574,1576,1650,1652,1654,1656,1658,1664,1668,1672,1674,1676,1678,1680,1750,1752,1758,1760,1762,1764,1766,1768,1770,1772,1776,1782,1850,1854,1856,1858,1862,1868,1870,1872,1874,1876,1878,1880,1950,1956,1960,1962,1964,1966,1968,1970,1972,1974,1976,1980,1982,2052,2054,2058,2060,2062,2070,2078,2150,2152,2154,2156,2158,2162,2164,2168,2172,2176,2178,2180,2182,2252,2260,2270,2276,2280,2282]::int[])
 ) v(line_key,suffix,old_min,old_max,png_reference,expected_numbers,expected_bands,numbers)
 LOOP
  IF cardinality(scope_row.numbers)<>scope_row.expected_numbers OR (SELECT count(DISTINCT x) FROM unnest(scope_row.numbers) x)<>scope_row.expected_numbers
  OR (SELECT min(x) FROM unnest(scope_row.numbers) x)<>scope_row.old_min OR (SELECT max(x) FROM unnest(scope_row.numbers) x)<>scope_row.old_max
  OR (SELECT count(*) FROM public.vehicle_image_assets a WHERE a.image_path=substring(scope_row.png_reference from 4)
   AND a.asset_status='available' AND a.asset_scope='generic' AND a.file_format_status='native_png'
   AND a.appearance_class IS DISTINCT FROM 'requires_review')<>1
  THEN RAISE EXCEPTION 'metro: roster or asset changed %/%',scope_row.line_key,scope_row.suffix; END IF;
  DELETE FROM public.published_train_png_number_ranges r
   WHERE r.edition='2611' AND r.line_key=scope_row.line_key AND r.suffix=scope_row.suffix
   AND r.segment_key='png_band/'||scope_row.line_key||'/'||lpad(scope_row.old_min::text,4,'0')||'-'||lpad(scope_row.old_max::text,4,'0')||scope_row.suffix
   AND r.min_number=scope_row.old_min AND r.max_number=scope_row.old_max AND r.png_reference=scope_row.png_reference
   AND r.vehicle_model IS NULL AND r.source_url IS NULL AND NOT r.requires_exact_roster AND NOT r.actual_vehicle_confirmed;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'metro: expected one old range %/%',scope_row.line_key,scope_row.suffix; END IF;
  INSERT INTO public.published_train_png_number_ranges
   (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
  SELECT '2611',scope_row.line_key,'png_band/'||scope_row.line_key||'/'||lpad(min(x)::text,4,'0')||'-'||lpad(max(x)::text,4,'0')||scope_row.suffix,
   min(x),max(x),scope_row.suffix,NULL,scope_row.png_reference,NULL,false,false
  FROM (SELECT x,x-row_number() OVER(ORDER BY x)::int island FROM unnest(scope_row.numbers) x) nums GROUP BY island;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>scope_row.expected_bands THEN RAISE EXCEPTION 'metro: expected % ranges, got %',scope_row.expected_bands,n; END IF;
  IF (SELECT array_agg(g.num ORDER BY g.num) FROM public.published_train_png_number_ranges r
  CROSS JOIN LATERAL generate_series(r.min_number,r.max_number) g(num)
  WHERE r.edition='2611' AND r.line_key=scope_row.line_key AND r.suffix=scope_row.suffix AND r.png_reference=scope_row.png_reference) IS DISTINCT FROM scope_row.numbers
  THEN RAISE EXCEPTION 'metro: expanded ranges differ %/%',scope_row.line_key,scope_row.suffix; END IF;
 END LOOP;
 INSERT INTO public.published_train_png_number_ranges
  (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
 SELECT '2611','Hibiya','png_band/Hibiya/'||lpad(x::text,4,'0')||'-'||lpad(x::text,4,'0')||'T',x,x,'T',NULL,th_png,NULL,false,false
 FROM unnest(th_keys) x;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>9 THEN RAISE EXCEPTION 'metro: expected nine TH Liner reference rows'; END IF;
 UPDATE public.manual_timetable_templates m SET vehicle_type_label=new_label
 WHERE m.line_key='Ikebukuro' AND m.source_path='data/timetables/Ikebukuro-manual.js'
 AND m.train_type_urn='odpt.TrainType:Seibu.F-Liner' AND m.vehicle_type_label=old_label;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>62 THEN RAISE EXCEPTION 'metro: expected 62 Seibu label corrections'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611')<>baseline_count+1008
 OR (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key IN ('Hibiya','Hanzomon'))<>1012
 OR (SELECT jsonb_agg(to_jsonb(r) ORDER BY line_key,segment_key,min_number,max_number,suffix) FROM public.published_train_png_number_ranges r WHERE edition='2611' AND line_key NOT IN ('Hibiya','Hanzomon')) IS DISTINCT FROM baseline_other
 OR EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key IN ('Hibiya','Hanzomon') AND (actual_vehicle_confirmed OR requires_exact_roster OR vehicle_model IS NOT NULL OR source_url IS NOT NULL))
 OR (SELECT count(*) FROM public.published_train_png_number_ranges a JOIN public.published_train_png_number_ranges b ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix AND a.png_reference<b.png_reference AND a.min_number<=b.max_number AND b.min_number<=a.max_number WHERE a.edition='2611')<>baseline_conflicts
 OR (SELECT count(*) FROM public.manual_timetable_templates m WHERE m.line_key='Ikebukuro' AND m.train_type_urn='odpt.TrainType:Seibu.F-Liner' AND m.vehicle_type_label=new_label)<>62
 THEN RAISE EXCEPTION 'metro: postflight failed; rollback all changes'; END IF;
END
$metro$;
