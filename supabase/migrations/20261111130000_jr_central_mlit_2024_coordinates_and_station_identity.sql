-- JR-Central 13-line station geography and physical ID correction, 2026-11-11.
-- Data © MLIT 国土数値情報 鉄道データ N02-2024, CC BY 4.0.
-- https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html
-- N02-2024 station name/line/operator/coordinates extract:
-- https://github.com/antfu/mlit-json/blob/main/data/stations.json
-- JR Central confirms 参宮線 池の浦シーサイド closed March 2020:
-- https://jr-central.co.jp/news/release/_pdf/000044331.pdf
-- No simulated geometry, train number, fleet, or scheduled clocks created.
BEGIN;
SELECT pg_advisory_xact_lock(2026111113);
DO $baseline$
BEGIN
 IF (SELECT count(*) FROM public.line_stations WHERE line_id='Sangu')<>11
 OR NOT EXISTS(SELECT 1 FROM public.line_stations WHERE line_id='Sangu' AND station_index=9 AND station_name='JRC-Sangu-010')
 OR NOT EXISTS(SELECT 1 FROM public.line_stations WHERE line_id='Sangu' AND station_index=10 AND station_name='JRC-Sangu-011')
 OR NOT EXISTS(SELECT 1 FROM public.line_stations WHERE line_id='Gotemba' AND station_index=9 AND station_name='Ashigara')
 OR NOT EXISTS(SELECT 1 FROM public.line_stations WHERE line_id='MinoAkasaka' AND station_index=1 AND station_name='Arao-Kumamoto')
 OR EXISTS(SELECT 1 FROM public.manual_timetable_templates WHERE line_key IN ('Sangu','Gotemba','MinoAkasaka'))
 THEN RAISE EXCEPTION 'JRC_MLIT_STATION_IDENTITY_BASELINE_CHANGED'; END IF;
END $baseline$;
UPDATE public.line_stations SET station_name='JRC-Gotemba-010'
 WHERE line_id='Gotemba' AND station_index=9 AND station_name='Ashigara';
UPDATE public.line_stations SET station_name='JRC-MinoAkasaka-002'
 WHERE line_id='MinoAkasaka' AND station_index=1 AND station_name='Arao-Kumamoto';
DELETE FROM public.line_stations
 WHERE line_id='Sangu' AND station_index=9 AND station_name='JRC-Sangu-010';
UPDATE public.line_stations SET station_index=9
 WHERE line_id='Sangu' AND station_index=10 AND station_name='JRC-Sangu-011';

CREATE TEMP TABLE _jrc_mlit_station_points(
 station_id text PRIMARY KEY, station_name text NOT NULL,
 latitude numeric NOT NULL, longitude numeric NOT NULL,
 CHECK(latitude BETWEEN 33 AND 38 AND longitude BETWEEN 135 AND 141)
) ON COMMIT DROP;
INSERT INTO _jrc_mlit_station_points(station_id,station_name,latitude,longitude) VALUES
  ('Asahi-Kansai','朝日',35.033735,136.658),
  ('Atami','熱海',35.10379,139.077805),
  ('Fujine','富士根',35.20527,138.63561),
  ('Hamamatsu','浜松',34.70406,137.735118),
  ('Haruda','春田',35.14315,136.813385),
  ('Hatta','八田',35.148787,136.852183),
  ('Hisakazu','永和',35.13284,136.76441),
  ('Ida-Kawa','井田川',34.868265,136.492585),
  ('JRC-ChuoCentral-003','鶴舞',35.156995,136.918175),
  ('JRC-ChuoCentral-004','千種',35.170925,136.931095),
  ('JRC-ChuoCentral-005','大曽根',35.18947,136.93718),
  ('JRC-ChuoCentral-006','新守山',35.20604,136.950238),
  ('JRC-ChuoCentral-007','勝川',35.2299,136.95646),
  ('JRC-ChuoCentral-008','春日井',35.242963,136.984953),
  ('JRC-ChuoCentral-009','神領',35.256595,137.010465),
  ('JRC-ChuoCentral-010','高蔵寺',35.2644,137.043255),
  ('JRC-ChuoCentral-011','定光寺',35.27797,137.080945),
  ('JRC-ChuoCentral-012','古虎渓',35.303827,137.10175),
  ('JRC-ChuoCentral-013','多治見',35.334835,137.120285),
  ('JRC-ChuoCentral-014','土岐市',35.359737,137.182133),
  ('JRC-ChuoCentral-015','瑞浪',35.369115,137.251915),
  ('JRC-ChuoCentral-016','釜戸',35.411235,137.30523),
  ('JRC-ChuoCentral-017','武並',35.43793,137.354115),
  ('JRC-ChuoCentral-018','恵那',35.45509,137.407795),
  ('JRC-ChuoCentral-019','美乃坂本',35.479255,137.450355),
  ('JRC-ChuoCentral-020','中津川',35.500147,137.50281),
  ('JRC-ChuoCentral-021','落合川',35.52532,137.530058),
  ('JRC-ChuoCentral-022','坂下',35.574577,137.531177),
  ('JRC-ChuoCentral-023','田立',35.588233,137.54903),
  ('JRC-ChuoCentral-024','南木曽',35.599043,137.6087),
  ('JRC-ChuoCentral-025','十二兼',35.645302,137.617562),
  ('JRC-ChuoCentral-026','野尻',35.67304,137.636155),
  ('JRC-ChuoCentral-027','大桑',35.684422,137.664096),
  ('JRC-ChuoCentral-028','須原',35.69785,137.69494),
  ('JRC-ChuoCentral-029','倉本',35.73294,137.714325),
  ('JRC-ChuoCentral-030','上松',35.784075,137.69327),
  ('JRC-ChuoCentral-031','木曽福島',35.843725,137.6934),
  ('JRC-ChuoCentral-032','原野',35.871265,137.74153),
  ('JRC-ChuoCentral-033','宮ノ越',35.888478,137.763934),
  ('JRC-ChuoCentral-034','藪原',35.929903,137.784283),
  ('JRC-ChuoCentral-035','奈良井',35.96947,137.81621),
  ('JRC-ChuoCentral-036','木曽平沢',35.979048,137.832285),
  ('JRC-ChuoCentral-037','贄川',36.013985,137.860945),
  ('JRC-ChuoCentral-038','日出塩',36.04906,137.894855),
  ('JRC-ChuoCentral-039','洗馬',36.08713,137.916815),
  ('JRC-Gotemba-002','下曽我',35.30355,139.18342),
  ('JRC-Gotemba-003','上大井',35.32179,139.16363),
  ('JRC-Gotemba-004','相模金子',35.333883,139.150433),
  ('JRC-Gotemba-005','松田',35.346,139.139135),
  ('JRC-Gotemba-006','東山北',35.35761,139.10773),
  ('JRC-Gotemba-007','山北',35.360813,139.08077),
  ('JRC-Gotemba-008','谷峨',35.36647,139.038347),
  ('JRC-Gotemba-009','駿河小山',35.35924,138.997583),
  ('JRC-Gotemba-010','足柄',35.33207,138.981753),
  ('JRC-Gotemba-011','御殿場',35.299947,138.93422),
  ('JRC-Gotemba-012','南御殿場',35.277227,138.925723),
  ('JRC-Gotemba-013','富士岡',35.254887,138.919643),
  ('JRC-Gotemba-014','岩波',35.21513,138.919258),
  ('JRC-Gotemba-015','裾野',35.171327,138.90926),
  ('JRC-Gotemba-016','長泉なめり',35.147345,138.899325),
  ('JRC-Gotemba-017','下土狩',35.128543,138.895105),
  ('JRC-Gotemba-018','大岡',35.11604,138.881764),
  ('JRC-Iida-002','船町',34.775735,137.374065),
  ('JRC-Iida-003','下地',34.780982,137.370625),
  ('JRC-Iida-004','小坂井',34.797602,137.363098),
  ('JRC-Iida-005','牛久保',34.80857,137.381715),
  ('JRC-Iida-006','豊川',34.82255,137.397215),
  ('JRC-Iida-007','三河一宮',34.847947,137.414603),
  ('JRC-Iida-008','長山',34.864398,137.431353),
  ('JRC-Iida-009','江島',34.86786,137.441555),
  ('JRC-Iida-010','東上',34.876157,137.455363),
  ('JRC-Iida-011','野田城',34.889295,137.47789),
  ('JRC-Iida-012','新城',34.90107,137.493),
  ('JRC-Iida-013','東新町',34.906117,137.502977),
  ('JRC-Iida-014','茶臼山',34.910355,137.514435),
  ('JRC-Iida-015','三河東郷',34.91224,137.527315),
  ('JRC-Iida-016','大海',34.930155,137.54901),
  ('JRC-Iida-017','鳥居',34.920753,137.55163),
  ('JRC-Iida-018','長篠城',34.926047,137.565277),
  ('JRC-Iida-019','本長篠',34.932645,137.576738),
  ('JRC-Iida-020','三河大野',34.95198,137.603),
  ('JRC-Iida-021','湯谷温泉',34.970497,137.613027),
  ('JRC-Iida-022','三河槙原',34.98855,137.620905),
  ('JRC-Iida-023','柿平',34.99052,137.644013),
  ('JRC-Iida-024','三河川合',35.001725,137.663995),
  ('JRC-Iida-025','池場',35.02433,137.703905),
  ('JRC-Iida-026','東栄',35.02897,137.713855),
  ('JRC-Iida-027','出馬',35.049345,137.74425),
  ('JRC-Iida-028','上市場',35.050195,137.752415),
  ('JRC-Iida-029','浦川',35.05634,137.76357),
  ('JRC-Iida-030','早瀬',35.060575,137.77509),
  ('JRC-Iida-031','下川合',35.06933,137.78639),
  ('JRC-Iida-032','中部天竜',35.085315,137.802855),
  ('JRC-Iida-033','佐久間',35.09187,137.809725),
  ('JRC-Iida-034','相月',35.11491,137.85436),
  ('JRC-Iida-035','城西',35.131585,137.862025),
  ('JRC-Iida-036','向市場',35.154065,137.869455),
  ('JRC-Iida-037','水窪',35.163335,137.8705),
  ('JRC-Iida-038','大嵐',35.19046,137.81852),
  ('JRC-Iida-039','小和田',35.2099,137.835995),
  ('JRC-Iida-040','中井侍',35.23592,137.834935),
  ('JRC-Iida-041','伊那小沢',35.254095,137.83475),
  ('JRC-Iida-042','鶯巣',35.267433,137.832667),
  ('JRC-Iida-043','平岡',35.27362,137.853647),
  ('JRC-Iida-044','為栗',35.311754,137.848576),
  ('JRC-Iida-045','温田',35.33637,137.841447),
  ('JRC-Iida-046','田本',35.348963,137.83791),
  ('JRC-Iida-047','門島',35.375355,137.81407),
  ('JRC-Iida-048','唐笠',35.402325,137.81021),
  ('JRC-Iida-049','金野',35.41915,137.817175),
  ('JRC-Iida-050','千代',35.42921,137.81678),
  ('JRC-Iida-051','天竜峡',35.4411,137.81734),
  ('JRC-Iida-052','川路',35.45312,137.81575),
  ('JRC-Iida-053','時又',35.46404,137.827755),
  ('JRC-Iida-054','駄科',35.475565,137.839815),
  ('JRC-Iida-055','毛賀',35.48744,137.839385),
  ('JRC-Iida-056','伊那八幡',35.49675,137.841545),
  ('JRC-Iida-057','下山村',35.504205,137.83974),
  ('JRC-Iida-058','鼎',35.506705,137.82836),
  ('JRC-Iida-059','切石',35.5124,137.809145),
  ('JRC-Iida-060','飯田',35.51972,137.821265),
  ('JRC-Iida-061','桜町',35.52218,137.82976),
  ('JRC-Iida-062','伊那上郷',35.520175,137.83903),
  ('JRC-Iida-063','元善光寺',35.533855,137.861425),
  ('JRC-Iida-064','下市田',35.544157,137.87634),
  ('JRC-Iida-065','市田',35.54935,137.88658),
  ('JRC-Iida-066','下平',35.572585,137.89591),
  ('JRC-Iida-067','山吹',35.577775,137.903345),
  ('JRC-Iida-068','伊那大島',35.5957,137.913215),
  ('JRC-Iida-069','上片桐',35.6175,137.90407),
  ('JRC-Iida-070','伊那田島',35.627445,137.91024),
  ('JRC-Iida-071','高遠原',35.64463,137.900545),
  ('JRC-Iida-072','七久保',35.65468,137.911375),
  ('JRC-Iida-073','伊那本郷',35.665395,137.93249),
  ('JRC-Iida-074','飯島',35.67759,137.928995),
  ('JRC-Iida-075','田切',35.695635,137.93306),
  ('JRC-Iida-076','伊那福岡',35.71223,137.933965),
  ('JRC-Iida-077','小町屋',35.726775,137.93516),
  ('JRC-Iida-078','駒ケ根',35.73628,137.936855),
  ('JRC-Iida-079','大田切',35.748198,137.940103),
  ('JRC-Iida-080','宮田',35.76727,137.938875),
  ('JRC-Iida-081','赤木',35.77793,137.943955),
  ('JRC-Iida-082','沢渡',35.80372,137.944025),
  ('JRC-Iida-083','下島',35.81318,137.940145),
  ('JRC-Iida-084','伊那市',35.838445,137.959255),
  ('JRC-Iida-085','伊那北',35.845235,137.96435),
  ('JRC-Iida-086','田畑',35.8608,137.977835),
  ('JRC-Iida-087','北殿',35.87951,137.984065),
  ('JRC-Iida-088','木ノ下',35.90083,137.988005),
  ('JRC-Iida-089','伊那松島',35.913845,137.988665),
  ('JRC-Iida-090','沢',35.93632,137.98546),
  ('JRC-Iida-091','羽場',35.953065,137.985155),
  ('JRC-Iida-092','伊那新町',35.968785,137.984055),
  ('JRC-Iida-093','宮木',35.97626,137.9905),
  ('JRC-KiseiCentral-002','下庄',34.814258,136.47961),
  ('JRC-KiseiCentral-003','一身田',34.762775,136.49939),
  ('JRC-KiseiCentral-004','津',34.734373,136.510723),
  ('JRC-KiseiCentral-005','阿漕',34.703105,136.50451),
  ('JRC-KiseiCentral-006','高茶屋',34.66728,136.51262),
  ('JRC-KiseiCentral-007','六軒',34.617625,136.50759),
  ('JRC-KiseiCentral-008','松阪',34.57685,136.53579),
  ('JRC-KiseiCentral-009','徳和',34.55403,136.55355),
  ('JRC-KiseiCentral-010','多気',34.515905,136.57311),
  ('JRC-KiseiCentral-011','相可',34.50311,136.545957),
  ('JRC-KiseiCentral-012','佐奈',34.478465,136.53904),
  ('JRC-KiseiCentral-013','栃原',34.444555,136.50934),
  ('JRC-KiseiCentral-014','川添',34.41988,136.47365),
  ('JRC-KiseiCentral-015','三瀬谷',34.39475,136.40904),
  ('JRC-KiseiCentral-016','滝原',34.360163,136.412043),
  ('JRC-KiseiCentral-017','阿曽',34.331295,136.41112),
  ('JRC-KiseiCentral-018','伊勢柏崎',34.299556,136.395724),
  ('JRC-KiseiCentral-019','大内山',34.278135,136.35924),
  ('JRC-KiseiCentral-020','梅ケ谷',34.258034,136.356564),
  ('JRC-KiseiCentral-021','紀伊長島',34.20933,136.339935),
  ('JRC-KiseiCentral-022','三野瀬',34.16769,136.282385),
  ('JRC-KiseiCentral-023','船津',34.142173,136.228717),
  ('JRC-KiseiCentral-024','相賀',34.11193,136.227127),
  ('JRC-KiseiCentral-025','尾鷲',34.07433,136.190155),
  ('JRC-KiseiCentral-026','大曽根浦',34.061903,136.223013),
  ('JRC-KiseiCentral-027','九鬼',34.01603,136.242665),
  ('JRC-KiseiCentral-028','三木里',34.001475,136.20255),
  ('JRC-KiseiCentral-029','賀田',33.97165,136.18974),
  ('JRC-KiseiCentral-030','二木島',33.939405,136.18083),
  ('JRC-KiseiCentral-031','新鹿',33.927933,136.14419),
  ('JRC-KiseiCentral-032','波田須',33.910115,136.1381),
  ('JRC-KiseiCentral-033','大泊',33.90224,136.11807),
  ('JRC-KiseiCentral-034','熊野市',33.889645,136.098775),
  ('JRC-KiseiCentral-035','有井',33.876185,136.085595),
  ('JRC-KiseiCentral-036','神志山',33.83977,136.06235),
  ('JRC-KiseiCentral-037','紀伊市木',33.82801,136.05543),
  ('JRC-KiseiCentral-038','阿田和',33.80474,136.04241),
  ('JRC-KiseiCentral-039','紀伊井田',33.75996,136.023955),
  ('JRC-KiseiCentral-040','鵜殿',33.736725,136.015515),
  ('JRC-Meisho-002','上ノ庄',34.598,136.499325),
  ('JRC-Meisho-003','権現前',34.617745,136.482115),
  ('JRC-Meisho-004','伊勢八太',34.647335,136.44701),
  ('JRC-Meisho-005','一志',34.654895,136.436095),
  ('JRC-Meisho-006','井関',34.642575,136.412785),
  ('JRC-Meisho-007','伊勢大井',34.649995,136.385175),
  ('JRC-Meisho-008','伊勢川口',34.647825,136.356745),
  ('JRC-Meisho-009','関ノ宮',34.637695,136.339605),
  ('JRC-Meisho-010','家城',34.62585,136.319225),
  ('JRC-Meisho-011','伊勢竹原',34.600035,136.309215),
  ('JRC-Meisho-012','伊勢鎌倉',34.57402,136.278375),
  ('JRC-Meisho-013','伊勢八知',34.5551,136.2638),
  ('JRC-Meisho-014','比津',34.5323,136.270815),
  ('JRC-Meisho-015','伊勢奥津',34.512165,136.259995),
  ('JRC-MinoAkasaka-002','荒尾',35.373433,136.583393),
  ('JRC-MinoAkasaka-003','美濃赤坂',35.386605,136.582195),
  ('JRC-Minobu-002','柚木',35.15731,138.63911),
  ('JRC-Minobu-003','竪堀',35.168065,138.64579),
  ('JRC-Minobu-004','入山瀬',35.18835,138.647525),
  ('JRC-Minobu-006','源道寺',35.214485,138.62712),
  ('JRC-Minobu-007','富士宮',35.2212,138.615482),
  ('JRC-Minobu-008','西富士宮',35.225451,138.602526),
  ('JRC-Minobu-009','沼久保',35.19929,138.58425),
  ('JRC-Minobu-010','芝川',35.19725,138.56383),
  ('JRC-Minobu-011','稲子',35.230535,138.536935),
  ('JRC-Minobu-012','十島',35.23019,138.515875),
  ('JRC-Minobu-013','井出',35.247455,138.490985),
  ('JRC-Minobu-014','寄畑',35.264835,138.474995),
  ('JRC-Minobu-015','内船',35.28221,138.46503),
  ('JRC-Minobu-016','甲斐大島',35.32817,138.45214),
  ('JRC-Minobu-017','身延',35.36145,138.45306),
  ('JRC-Minobu-018','塩之沢',35.379675,138.4539),
  ('JRC-Minobu-019','波高島',35.41851,138.459705),
  ('JRC-Minobu-020','下部温泉',35.425785,138.47247),
  ('JRC-Minobu-021','甲斐常葉',35.444685,138.47697),
  ('JRC-Minobu-022','市ノ瀬',35.46234,138.482135),
  ('JRC-Minobu-023','久那土',35.481495,138.46743),
  ('JRC-Minobu-024','甲斐岩間',35.49251,138.463075),
  ('JRC-Minobu-025','落居',35.50358,138.471245),
  ('JRC-Minobu-026','鰍沢口',35.541415,138.47088),
  ('JRC-Minobu-027','市川大門',35.560465,138.493205),
  ('JRC-Minobu-028','市川本町',35.56063,138.50202),
  ('JRC-Minobu-029','芦川',35.563075,138.511255),
  ('JRC-Minobu-030','甲斐上野',35.569577,138.520623),
  ('JRC-Minobu-031','東花輪',35.59485,138.527025),
  ('JRC-Minobu-032','小井川',35.60453,138.528545),
  ('JRC-Minobu-033','常永',35.61704,138.533125),
  ('JRC-Minobu-034','国母',35.63056,138.55205),
  ('JRC-Minobu-035','甲斐住吉',35.636595,138.56994),
  ('JRC-Minobu-036','南甲府',35.643793,138.578237),
  ('JRC-Minobu-037','善光寺',35.659835,138.589225),
  ('JRC-Minobu-038','金手',35.662215,138.57887),
  ('JRC-Sangu-002','外城田',34.497665,136.59666),
  ('JRC-Sangu-003','田丸',34.48845,136.634005),
  ('JRC-Sangu-004','宮川',34.503063,136.67187),
  ('JRC-Sangu-005','山田上口',34.49584,136.694286),
  ('JRC-Sangu-006','伊勢市',34.49133,136.70966),
  ('JRC-Sangu-007','五十鈴ケ丘',34.49588,136.73984),
  ('JRC-Sangu-008','二見浦',34.503685,136.777688),
  ('JRC-Sangu-009','松下',34.49615,136.79924),
  ('JRC-Sangu-011','鳥羽',34.48707,136.84152),
  ('JRC-Taita-002','小泉',35.349155,137.10056),
  ('JRC-Taita-003','根本',35.36147,137.090145),
  ('JRC-Taita-004','姫',35.382,137.072115),
  ('JRC-Taita-005','下切',35.393735,137.063715),
  ('JRC-Taita-006','可児',35.42293,137.05535),
  ('JRC-Taita-007','美濃川合',35.4441,137.045393),
  ('JRC-Takayama-002','長森',35.402085,136.802855),
  ('JRC-Takayama-003','那加',35.400535,136.835575),
  ('JRC-Takayama-004','蘇原',35.403273,136.871767),
  ('JRC-Takayama-005','各務ケ原',35.40388,136.901063),
  ('JRC-Takayama-006','鵜沼',35.39756,136.94605),
  ('JRC-Takayama-007','坂祝',35.426395,136.97681),
  ('JRC-Takayama-008','美濃太田',35.445613,137.019535),
  ('JRC-Takayama-009','古井',35.457432,137.047658),
  ('JRC-Takayama-010','中川辺',35.48708,137.065127),
  ('JRC-Takayama-011','下麻生',35.514923,137.087107),
  ('JRC-Takayama-012','上麻生',35.541303,137.118785),
  ('JRC-Takayama-013','白川口',35.579375,137.18484),
  ('JRC-Takayama-014','下油井',35.63327,137.183115),
  ('JRC-Takayama-015','飛騨金山',35.662485,137.164385),
  ('JRC-Takayama-016','焼石',35.725625,137.20061),
  ('JRC-Takayama-017','下呂',35.806097,137.239386),
  ('JRC-Takayama-018','禅昌寺',35.849137,137.225213),
  ('JRC-Takayama-019','飛騨萩原',35.874408,137.21397),
  ('JRC-Takayama-020','上呂',35.910913,137.204673),
  ('JRC-Takayama-021','飛騨宮田',35.928443,137.235553),
  ('JRC-Takayama-022','飛騨小坂',35.950785,137.25686),
  ('JRC-Takayama-023','渚',36.001455,137.287945),
  ('JRC-Takayama-024','久々野',36.05234,137.276825),
  ('JRC-Takayama-025','飛騨一ノ宮',36.088403,137.24776),
  ('JRC-Takayama-026','高山',36.14069,137.2514),
  ('JRC-Takayama-027','上枝',36.180985,137.245835),
  ('JRC-Takayama-028','飛騨国府',36.21112,137.21577),
  ('JRC-Takayama-029','飛騨古川',36.236625,137.189985),
  ('JRC-Takayama-030','杉崎',36.249895,137.16899),
  ('JRC-Takayama-031','飛騨細江',36.261125,137.14563),
  ('JRC-Takayama-032','角川',36.299905,137.113355),
  ('JRC-Takayama-033','坂上',36.327533,137.14091),
  ('JRC-Takayama-034','打保',36.383935,137.181995),
  ('JRC-Takayama-035','杉原',36.415855,137.19247),
  ('JRC-Takayama-036','猪谷',36.471805,137.237845),
  ('JRC-Takayama-037','楡原',36.529403,137.22872),
  ('JRC-Takayama-038','笹津',36.561415,137.211575),
  ('JRC-Takayama-039','東八尾',36.589617,137.175153),
  ('JRC-Takayama-040','越中八尾',36.5917,137.138292),
  ('JRC-Takayama-041','千里',36.634587,137.132453),
  ('JRC-Takayama-042','速星',36.664053,137.160433),
  ('JRC-Takayama-043','婦中鵜坂',36.677813,137.168613),
  ('JRC-Takayama-044','西富山',36.69938,137.177085),
  ('JRC-Taketoyo-002','尾張森岡',34.99388,136.97046),
  ('JRC-Taketoyo-003','緒川',34.981385,136.9719),
  ('JRC-Taketoyo-004','石浜',34.967865,136.972905),
  ('JRC-Taketoyo-005','東浦',34.949595,136.9707),
  ('JRC-Taketoyo-006','亀崎',34.91901,136.961105),
  ('JRC-Taketoyo-007','乙川',34.903357,136.94155),
  ('JRC-Taketoyo-008','半田',34.89411,136.93043),
  ('JRC-Taketoyo-009','東成岩',34.874297,136.923493),
  ('JRC-Taketoyo-010','武豊',34.85327,136.921085),
  ('JRC-TokaidoCentral-002','函南',35.108716,138.970984),
  ('JRC-TokaidoCentral-005','片浜',35.11837,138.818673),
  ('JRC-TokaidoCentral-006','原',35.124935,138.793345),
  ('JRC-TokaidoCentral-007','東田子の浦',35.13627,138.745485),
  ('JRC-TokaidoCentral-008','吉原',35.143885,138.70264),
  ('JRC-TokaidoCentral-009','富士',35.15127,138.651848),
  ('JRC-TokaidoCentral-010','富士川',35.14113,138.61871),
  ('JRC-TokaidoCentral-011','新蒲原',35.119414,138.608102),
  ('JRC-TokaidoCentral-012','蒲原',35.114037,138.58283),
  ('JRC-TokaidoCentral-013','由比',35.097125,138.55282),
  ('JRC-TokaidoCentral-014','興津',35.052515,138.521905),
  ('JRC-TokaidoCentral-016','草薙',35.002293,138.441023),
  ('JRC-TokaidoCentral-017','東静岡',34.984077,138.41292),
  ('JRC-TokaidoCentral-019','安倍川',34.94121,138.3641),
  ('JRC-TokaidoCentral-020','用宗',34.921875,138.35932),
  ('JRC-TokaidoCentral-021','焼津',34.872285,138.31848),
  ('JRC-TokaidoCentral-022','西焼津',34.859805,138.285595),
  ('JRC-TokaidoCentral-023','藤枝',34.84957,138.25287),
  ('JRC-TokaidoCentral-024','六合',34.836483,138.203843),
  ('JRC-TokaidoCentral-025','島田',34.83015,138.173425),
  ('JRC-TokaidoCentral-026','金谷',34.819235,138.125825),
  ('JRC-TokaidoCentral-027','菊川',34.761666,138.085388),
  ('JRC-TokaidoCentral-029','愛野',34.752455,137.961845),
  ('JRC-TokaidoCentral-030','袋井',34.741435,137.925995),
  ('JRC-TokaidoCentral-031','御厨',34.718659,137.885632),
  ('JRC-TokaidoCentral-032','磐田',34.710215,137.85227),
  ('JRC-TokaidoCentral-033','豊田町',34.712085,137.8198),
  ('JRC-TokaidoCentral-034','天竜川',34.717065,137.779405),
  ('JRC-TokaidoCentral-036','高塚',34.690425,137.681345),
  ('JRC-TokaidoCentral-037','舞阪',34.68569,137.62633),
  ('JRC-TokaidoCentral-038','弁天島',34.690012,137.603414),
  ('JRC-TokaidoCentral-039','新居町',34.694275,137.568823),
  ('JRC-TokaidoCentral-040','鷲津',34.71677,137.54619),
  ('JRC-TokaidoCentral-041','新所原',34.72326,137.484455),
  ('JRC-TokaidoCentral-042','二川',34.725795,137.43887),
  ('JRC-TokaidoCentral-044','西小坂井',34.797013,137.35273),
  ('JRC-TokaidoCentral-045','愛知御津',34.812585,137.316585),
  ('JRC-TokaidoCentral-046','三河大塚',34.815772,137.282956),
  ('JRC-TokaidoCentral-047','三河三谷',34.818568,137.247753),
  ('JRC-TokaidoCentral-048','蒲郡',34.822736,137.227378),
  ('JRC-TokaidoCentral-049','三河塩津',34.825427,137.201503),
  ('JRC-TokaidoCentral-050','三ケ根',34.836433,137.176548),
  ('JRC-TokaidoCentral-051','幸田',34.859653,137.164463),
  ('JRC-TokaidoCentral-052','相見',34.888043,137.160271),
  ('JRC-TokaidoCentral-053','岡崎',34.925783,137.157233),
  ('JRC-TokaidoCentral-054','西岡崎',34.94662,137.123155),
  ('JRC-TokaidoCentral-055','安城',34.96044,137.08642),
  ('JRC-TokaidoCentral-057','東刈谷',34.977355,137.043635),
  ('JRC-TokaidoCentral-058','野田新町',34.9835,137.028177),
  ('JRC-TokaidoCentral-059','刈谷',34.990805,137.00971),
  ('JRC-TokaidoCentral-060','逢妻',34.998235,136.99054),
  ('JRC-TokaidoCentral-061','大府',35.008695,136.961805),
  ('JRC-TokaidoCentral-062','共和',35.035365,136.95458),
  ('JRC-TokaidoCentral-063','南大高',35.054448,136.94872),
  ('JRC-TokaidoCentral-064','大高',35.0691,136.94028),
  ('JRC-TokaidoCentral-065','笠寺',35.095317,136.926227),
  ('JRC-TokaidoCentral-066','熱田',35.129803,136.910675),
  ('JRC-TokaidoCentral-067','金山',35.142773,136.900897),
  ('JRC-TokaidoCentral-068','尾頭橋',35.147048,136.891017),
  ('JRC-TokaidoCentral-070','枇杷島',35.19953,136.861463),
  ('JRC-TokaidoCentral-071','清洲',35.225477,136.83451),
  ('JRC-TokaidoCentral-072','稲沢',35.253097,136.82093),
  ('JRC-TokaidoCentral-073','尾張一宮',35.302,136.79738),
  ('JRC-TokaidoCentral-074','木曽川',35.347993,136.781163),
  ('JRC-TokaidoCentral-075','岐阜',35.409533,136.75656),
  ('JRC-TokaidoCentral-076','西岐阜',35.404525,136.72326),
  ('JRC-TokaidoCentral-077','穂積',35.396265,136.693635),
  ('JRC-TokaidoCentral-078','大垣',35.367105,136.617965),
  ('JRC-TokaidoCentral-079','垂井',35.369543,136.530825),
  ('JRC-TokaidoCentral-080','関ケ原',35.36372,136.470137),
  ('JRC-TokaidoCentral-081','柏原',35.344595,136.402325),
  ('JRC-TokaidoCentral-082','近江長岡',35.359077,136.374018),
  ('JRC-TokaidoCentral-083','醒ケ井',35.327705,136.34519),
  ('Kakegawa','掛川',34.769403,138.014543),
  ('Kameyama','亀山',34.850085,136.45052),
  ('Kanie','蟹江',35.14198,136.793475),
  ('Kasa-Tou','加佐登',34.89032,136.52999),
  ('Kawano','河曲',34.897885,136.568035),
  ('Kawarada','河原田',34.911235,136.599275),
  ('Kofu','甲府',35.66654,138.570365),
  ('Kozu','国府津',35.281395,139.214955),
  ('Kuwana','桑名',35.06667,136.68374),
  ('Maibara','米原',35.314841,136.290224),
  ('Mikawa-Anjo','三河安城',34.970475,137.06095),
  ('Minami-Yokkaichi','南四日市',34.941437,136.609587),
  ('Mishima','三島',35.126153,138.910603),
  ('Nagashima','長島',35.09817,136.695655),
  ('Nagoya','名古屋',35.171403,136.881663),
  ('Numazu','沼津',35.10304,138.860477),
  ('Shimizu','清水',35.0234,138.4891),
  ('Shingu','新宮',33.72433,135.994445),
  ('Shiojiri','塩尻',36.114805,137.947875),
  ('Shizuoka','静岡',34.971787,138.388917),
  ('Tatsuno','辰野',35.984517,137.997183),
  ('Tomi-da','富田',35.00816,136.65316),
  ('Tomita-Hama','富田浜',34.99656,136.650095),
  ('Toyama','富山',36.70169,137.21321),
  ('Toyohashi','豊橋',34.76207,137.382673),
  ('Yatomi','弥富',35.114065,136.725845),
  ('Yokkaichi','四日市',34.962103,136.629877);
DO $check$
BEGIN
 IF (SELECT count(*) FROM _jrc_mlit_station_points)<>412
 OR EXISTS(SELECT 1 FROM _jrc_mlit_station_points p WHERE NOT EXISTS(
   SELECT 1 FROM public.line_stations ls
   JOIN public.railway_lines rl ON rl.id=ls.line_id
   WHERE ls.station_name=p.station_id AND rl.timetable_operator='JR-Central'
     AND rl.id<>'TokaidoShinkansen'))
 OR (SELECT count(*) FROM public.line_stations WHERE line_id='Sangu')<>10
 THEN RAISE EXCEPTION 'JRC_MLIT_STATION_REGISTRY_CHANGED'; END IF;
END $check$;
INSERT INTO public.stations(id,name,latitude,longitude)
SELECT p.station_id,p.station_name,p.latitude,p.longitude
FROM _jrc_mlit_station_points p
WHERE NOT EXISTS(SELECT 1 FROM public.stations s WHERE s.id=p.station_id)
ON CONFLICT(id) DO NOTHING;
DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM _jrc_mlit_station_points p
   LEFT JOIN public.stations s ON s.id=p.station_id WHERE s.id IS NULL)
 OR EXISTS(SELECT 1 FROM public.line_stations ls
   JOIN public.railway_lines rl ON rl.id=ls.line_id
   LEFT JOIN public.stations s ON s.id=ls.station_name
   WHERE rl.timetable_operator='JR-Central' AND s.id IS NULL)
 OR EXISTS(SELECT 1 FROM public.line_stations WHERE line_id='Sangu' AND station_name='JRC-Sangu-010')
 OR EXISTS(SELECT 1 FROM public.line_stations
   WHERE (line_id='Gotemba' AND station_name='Ashigara')
      OR (line_id='MinoAkasaka' AND station_name='Arao-Kumamoto'))
 THEN RAISE EXCEPTION 'JRC_MLIT_STATION_VERIFY_FAILED'; END IF;
END $verify$;
-- Reuse the same source-licensed invoker-only importer, changing only
-- Sangu station count 11 -> 10 and the Inotani handover index 36 -> 35.
CREATE OR REPLACE FUNCTION public.import_jr_central_authorized_plan(p_line_key text, p_document jsonb)
RETURNS TABLE(inserted_trains integer, inserted_stops integer)
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_expected_count integer;
  v_railway_code text;
  v_source jsonb;
  v_url text;
  v_license text;
  v_license_url text;
  v_edition date;
  v_evidence_id bigint;
  v_source_key text;
  v_source_path text;
  v_train jsonb;
  v_stop jsonb;
  v_number text;
  v_calendar text;
  v_direction text;
  v_type text;
  v_dates date[];
  v_date text;
  v_station text;
  v_last_station text;
  v_first_station text;
  v_idx integer;
  v_prev_idx integer;
  v_prev_clock integer;
  v_current_clock integer;
  v_arr_clock integer;
  v_dep_clock integer;
  v_arr text;
  v_dep text;
  v_sequence integer;
  v_template_id bigint;
  v_timetable_id bigint;
  v_trip_hash text;
  v_existing_hash text;
  v_imported integer := 0;
  v_stops integer := 0;
BEGIN
  -- The 13 conventional canonical line IDs are the sole SQL route owners.
  -- Counts and ODPT railway suffixes are fixed to the reviewed front-end topology.
  SELECT x.station_count,x.railway_code
  INTO v_expected_count,v_railway_code
  FROM (VALUES
    ('TokaidoCentral',84,'Tokaido'),
    ('ChuoCentral',40,'Chuo'),
    ('Gotemba',19,'Gotemba'),
    ('Minobu',39,'Minobu'),
    ('Iida',94,'Iida'),
    ('Takayama',45,'Takayama'),
    ('Taita',8,'Taita'),
    ('Taketoyo',10,'Taketoyo'),
    ('KansaiCentral',18,'Kansai'),
    ('KiseiCentral',41,'Kisei'),
    ('Sangu',10,'Sangu'),
    ('Meisho',15,'Meisho'),
    ('MinoAkasaka',3,'MinoAkasaka')
  ) AS x(line_key,station_count,railway_code)
  WHERE x.line_key=p_line_key;
  IF v_expected_count IS NULL THEN
    RAISE EXCEPTION 'JRC_PLAN_UNSUPPORTED_LINE';
  END IF;
  PERFORM pg_advisory_xact_lock(2026111104);
  -- Existing evidence imports used explicit IDs and left its identity sequence
  -- below MAX(id). Correct only this sequence before any identity INSERT.
  PERFORM setval(pg_get_serial_sequence('public.evidence_sources','id'),
    GREATEST((SELECT coalesce(max(id),1) FROM public.evidence_sources),
             (SELECT last_value FROM public.evidence_sources_id_seq)),true);
  IF jsonb_typeof(p_document) <> 'object'
     OR jsonb_typeof(p_document->'source') <> 'object'
     OR jsonb_typeof(p_document->'trains') <> 'array'
     OR jsonb_array_length(p_document->'trains') NOT BETWEEN 1 AND 1000
  THEN RAISE EXCEPTION 'JRC_PLAN_INVALID_DOCUMENT'; END IF;

  -- No "website is public => permission exists" inference.
  v_source := p_document->'source';
  v_url := nullif(btrim(v_source->>'url'),'');
  v_license := v_source->>'authorization';
  v_license_url := nullif(btrim(v_source->>'authorization_evidence_url'),'');
  IF v_url IS NULL OR v_url !~ '^https://[^ ]+'
     OR v_license_url IS NULL OR v_license_url !~ '^https://[^ ]+'
     OR v_license NOT IN ('original_compilation','licensed_for_republication')
  THEN RAISE EXCEPTION 'JRC_PLAN_SOURCE_RIGHTS_UNVERIFIED'; END IF;
  IF (v_source->>'edition_date') IS NULL
     OR (v_source->>'edition_date') !~ '^20[0-9]{2}-[01][0-9]-[0-3][0-9]$'
  THEN RAISE EXCEPTION 'JRC_PLAN_EDITION_NOT_DATED'; END IF;
  v_edition := (v_source->>'edition_date')::date;
  IF v_edition > current_date THEN RAISE EXCEPTION 'JRC_PLAN_FUTURE_EDITION'; END IF;
  IF (SELECT count(*) FROM public.line_stations WHERE line_id=p_line_key) <> v_expected_count
     OR (SELECT min(station_index) FROM public.line_stations WHERE line_id=p_line_key) <> 0
     OR (SELECT max(station_index) FROM public.line_stations WHERE line_id=p_line_key) <> v_expected_count - 1
     OR (SELECT count(DISTINCT station_name) FROM public.line_stations WHERE line_id=p_line_key) <> v_expected_count
     OR NOT EXISTS (SELECT 1 FROM public.railway_lines
           WHERE id=p_line_key AND timetable_operator='JR-Central'
             AND sql_planned_fallback_enabled AND NOT timetable_api_enabled)
  THEN RAISE EXCEPTION 'JRC_PLAN_STATION_REGISTRY_OR_CAPABILITY_CHANGED'; END IF;

  v_source_key := 'jrc-'||lower(p_line_key)||'-authorized:'||md5(v_url||'|'||v_license_url||'|'||v_edition::text);
  v_source_path := 'authorized-sql:jrcentral:'||p_line_key||':'||md5(v_source_key);
  INSERT INTO public.evidence_sources(source_key,source_url,source_type,evidence_grade,notes)
  VALUES(v_source_key,v_url,'timetable','B',
         'User-reviewed '||v_license||' source; authorization evidence: '||v_license_url||
         '; edition '||v_edition::text||'; individual-train stop evidence only, not full-day acceptance')
  ON CONFLICT(source_key) DO NOTHING;
  SELECT id INTO v_evidence_id FROM public.evidence_sources WHERE source_key=v_source_key;
  IF v_evidence_id IS NULL OR NOT EXISTS
     (SELECT 1 FROM public.evidence_sources WHERE id=v_evidence_id AND source_url=v_url)
  THEN RAISE EXCEPTION 'JRC_PLAN_EVIDENCE_CONFLICT'; END IF;

  FOR v_train IN SELECT value FROM jsonb_array_elements(p_document->'trains')
  LOOP
    IF jsonb_typeof(v_train)<>'object' THEN
      RAISE EXCEPTION 'JRC_PLAN_BAD_TRAIN'; END IF;
    v_number := v_train->>'train_number';
    v_calendar := v_train->>'calendar_urn';
    v_direction := v_train->>'direction_urn';
    v_type := v_train->>'train_type';
    IF v_number IS NULL OR v_number !~ '^[0-9]{1,5}[A-Z]{0,2}$'
       OR v_calendar NOT IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
       OR v_direction NOT IN ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')
       OR v_type NOT IN ('Local','Rapid','SectionRapid','SpecialRapid','LimitedExpress')
       OR jsonb_typeof(v_train->'stops') <> 'array'
       OR jsonb_array_length(v_train->'stops') NOT BETWEEN 2 AND v_expected_count
       OR jsonb_typeof(v_train->'operating_dates') <> 'array'
       OR jsonb_array_length(v_train->'operating_dates') NOT BETWEEN 1 AND 62
    THEN RAISE EXCEPTION 'JRC_PLAN_INCOMPLETE_TRAIN:%',coalesce(v_number,'?'); END IF;
    -- Takayama is JR-Central through Inotani (index 36); the route continues
    -- on JR-West infrastructure. An operator-specific through train can be
    -- imported only with separate evidence that JR-Central operates it.
    IF p_line_key='Takayama'
       AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_train->'stops') AS item(stop)
         JOIN public.line_stations ls ON ls.line_id='Takayama'
           AND ls.station_name=item.stop->>'station_id'
         WHERE ls.station_index>35
       )
       AND (v_train->>'service_operator' IS DISTINCT FROM 'JR-Central'
         OR coalesce(v_train->>'service_operator_evidence_url','') !~ '^https://[^ ]+')
    THEN RAISE EXCEPTION 'JRC_PLAN_TAKAYAMA_CROSS_BORDER_OPERATOR_UNVERIFIED'; END IF;
    v_dates := ARRAY[]::date[];
    FOR v_date IN SELECT value FROM jsonb_array_elements_text(v_train->'operating_dates')
    LOOP
      IF v_date !~ '^20[0-9]{2}-[01][0-9]-[0-3][0-9]$'
      THEN RAISE EXCEPTION 'JRC_PLAN_BAD_SERVICE_DATE'; END IF;
      IF v_date::date < v_edition OR v_date < '2026-11-01' OR v_date > '2026-11-30'
      THEN RAISE EXCEPTION 'JRC_PLAN_DATE_OUTSIDE_AUTHORIZED_EDITION'; END IF;
      -- Standard 2026 November calendar, including Culture Day and Labor Thanksgiving Day.
      IF v_date BETWEEN '2026-11-01' AND '2026-11-30' AND
        ((v_calendar='odpt.Calendar:Weekday' AND
           (extract(isodow FROM v_date::date) IN (6,7) OR v_date IN ('2026-11-03','2026-11-23')))
          OR
         (v_calendar='odpt.Calendar:SaturdayHoliday' AND
           extract(isodow FROM v_date::date) BETWEEN 1 AND 5
           AND v_date NOT IN ('2026-11-03','2026-11-23')))
      THEN RAISE EXCEPTION 'JRC_PLAN_SERVICE_CALENDAR_CONFLICT:%',v_date; END IF;
      IF v_date::date = ANY(v_dates) THEN RAISE EXCEPTION 'JRC_PLAN_DUPLICATE_DATE'; END IF;
      v_dates:=array_append(v_dates,v_date::date);
    END LOOP;
    IF cardinality(v_dates)=0 THEN RAISE EXCEPTION 'JRC_PLAN_EMPTY_DATE_SCOPE'; END IF;

    v_prev_idx := NULL;
    v_prev_clock := NULL;
    v_first_station := NULL;
    v_last_station := NULL;
    v_sequence := 0;
    -- Validate the ENTIRE train before inserting any source template.
    FOR v_stop IN SELECT value FROM jsonb_array_elements(v_train->'stops')
    LOOP
      v_station := v_stop->>'station_id';
      SELECT station_index INTO v_idx FROM public.line_stations
       WHERE line_id=p_line_key AND station_name=v_station;
      IF NOT FOUND THEN RAISE EXCEPTION 'JRC_PLAN_UNKNOWN_STATION:%',coalesce(v_station,'?'); END IF;
      IF v_prev_idx IS NOT NULL AND
         ((v_direction='odpt.RailDirection:Outbound' AND v_idx<=v_prev_idx)
           OR (v_direction='odpt.RailDirection:Inbound' AND v_idx>=v_prev_idx))
      THEN RAISE EXCEPTION 'JRC_PLAN_WRONG_STATION_ORDER:%',v_station; END IF;
      v_arr := NULLIF(v_stop->>'arrival', '');
      v_dep := NULLIF(v_stop->>'departure', '');
      IF (v_arr IS NULL AND v_dep IS NULL)
         OR (v_arr IS NOT NULL AND v_arr !~ '^([01][0-9]|2[0-9]):[0-5][0-9]$')
         OR (v_dep IS NOT NULL AND v_dep !~ '^([01][0-9]|2[0-9]):[0-5][0-9]$')
      THEN RAISE EXCEPTION 'JRC_PLAN_INVALID_CLOCK:%',v_station; END IF;
      v_arr_clock:=CASE WHEN v_arr IS NULL THEN NULL ELSE substring(v_arr,1,2)::int*60+substring(v_arr,4,2)::int END;
      v_dep_clock:=CASE WHEN v_dep IS NULL THEN NULL ELSE substring(v_dep,1,2)::int*60+substring(v_dep,4,2)::int END;
      v_current_clock:=coalesce(v_arr_clock,v_dep_clock);
      IF (v_prev_clock IS NOT NULL AND v_current_clock<v_prev_clock)
          OR (v_arr_clock IS NOT NULL AND v_dep_clock IS NOT NULL AND v_dep_clock<v_arr_clock)
      THEN RAISE EXCEPTION 'JRC_PLAN_CLOCK_REVERSAL:%',v_station; END IF;
      v_prev_clock:=coalesce(v_dep_clock,v_arr_clock);
      IF v_sequence=0 THEN
        IF v_dep IS NULL THEN RAISE EXCEPTION 'JRC_PLAN_FIRST_STOP_MUST_DEPART'; END IF;
        v_first_station:=v_station;
      END IF;
      v_last_station:=v_station;
      v_prev_idx:=v_idx;
      v_sequence:=v_sequence+1;
    END LOOP;
    IF nullif((v_train->'stops'->(v_sequence-1))->>'arrival','') IS NULL
    THEN RAISE EXCEPTION 'JRC_PLAN_LAST_STOP_MUST_ARRIVE'; END IF;
    v_trip_hash := md5(v_train::text||'|'||v_source_key);
    SELECT source_trip_id INTO v_existing_hash FROM public.manual_timetable_templates
    WHERE line_key=p_line_key
      AND train_number=v_number AND calendar_urn=v_calendar
      AND direction_urn=v_direction
      AND operating_dates && v_dates
    LIMIT 1;
    IF FOUND THEN
      IF v_existing_hash='md5:'||v_trip_hash THEN
        CONTINUE; -- idempotent re-run of the exact evidence row.
      END IF;
      RAISE EXCEPTION 'JRC_PLAN_CONFLICTING_TRAIN_DATES:%',v_number;
    END IF;

    INSERT INTO public.manual_timetable_templates
      (line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,
       destination_urns,source_path,source_trip_id,source_revision_date,operating_dates)
    VALUES(p_line_key,v_calendar,v_number,'odpt.Railway:JR-Central.'||v_railway_code,
       v_direction,'odpt.TrainType:JR-Central.'||v_type,
       ARRAY['odpt.Station:JR-Central.'||v_railway_code||'.'||v_last_station]::text[],
       v_source_path,'md5:'||v_trip_hash,v_edition,v_dates)
    RETURNING id INTO v_template_id;
    v_sequence := 0;
    FOR v_stop IN SELECT value FROM jsonb_array_elements(v_train->'stops')
    LOOP
      v_station:=v_stop->>'station_id';
      v_arr:=nullif(v_stop->>'arrival','');
      v_dep:=nullif(v_stop->>'departure','');
      INSERT INTO public.manual_timetable_template_stops
        (template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
      VALUES(v_template_id,v_sequence,
        CASE WHEN v_arr IS NOT NULL THEN 'odpt.Station:JR-Central.'||v_railway_code||'.'||v_station END,
        CASE WHEN v_dep IS NOT NULL THEN 'odpt.Station:JR-Central.'||v_railway_code||'.'||v_station END,
        v_arr,v_dep);
      v_sequence := v_sequence + 1;
      v_stops := v_stops+1;
    END LOOP;
    INSERT INTO public.train_timetables
      (canonical_key,calendar_urn,primary_train_number,lead_source_template_id,
       group_evidence,timetable_validity,source_revision_date)
    VALUES('source:'||v_template_id,v_calendar,v_number,v_template_id,
       'source_only','date_verified',v_edition)
    RETURNING id INTO v_timetable_id;
    INSERT INTO public.train_timetable_members
      (source_template_id,timetable_id,segment_order,member_role,
       first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
    VALUES(v_template_id,v_timetable_id,0,'primary',0,v_sequence-1,0,false);
    v_imported := v_imported+1;
  END LOOP;

  -- Importing individual services is never evidence of a full-day roster.
  IF v_imported>0 THEN
    UPDATE public.published_timetable_coverage_audit
    SET template_count=(SELECT count(*) FROM public.manual_timetable_templates WHERE line_key=p_line_key),
        calendar_count=(SELECT count(DISTINCT calendar_urn) FROM public.manual_timetable_templates WHERE line_key=p_line_key),
        direction_count=(SELECT count(DISTINCT direction_urn) FROM public.manual_timetable_templates WHERE line_key=p_line_key),
        sampled_count=(SELECT count(*) FROM public.manual_timetable_templates WHERE line_key=p_line_key),
        coverage_status='sampled',checked_at=now(),
        issues=ARRAY['AUTHORIZED_INDIVIDUAL_TRAIN_ROWS_ONLY',
                     'FULL_DAY_WEEKDAY_AND_HOLIDAY_NOT_RECONCILED',
                     'DO_NOT_EXTRAPOLATE_UNVERIFIED_SERVICE_DATES',
                     'NO_ACTUAL_TRAINSET_IDENTITY']::text[]
    WHERE line_key=p_line_key;
  END IF;
  RETURN QUERY SELECT v_imported,v_stops;
END;
$fn$;
REVOKE ALL ON FUNCTION public.import_jr_central_authorized_plan(text,jsonb)
 FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
