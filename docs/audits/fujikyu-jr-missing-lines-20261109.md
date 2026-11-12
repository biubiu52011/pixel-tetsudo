# 缺线补充：富士急行线／JR日光线／利府支线／筑肥线西段（2026-11-09）

## 实施范围
在 canonical `data/core/railway_data.json` 中新增4条线路、33个尚不存在的站点，连同 `stationLines`、`lineStationOrder`、`name_map`、四色语言名称及 compact/JS生成件同步。现线路记录244→248，站点3696→3729。原有车站坐标仅修正两处，原有线路的车站序列、ODPT、SQL车次、车辆候选未改。

|线路ID|运营者|官方确认站序|区间|
|---|---|---|---|
|Fujikyu|富士山麓电气铁道（品牌：富士急行线）|18站|大月→河口湖，26.6km|
|Nikko|JR东日本|7站|宇都宫→日光|
|TohokuRifu|JR东日本|3站|岩切→新利府→利府|
|ChikuhiWest|JR九州|14站|西唐津→唐津→鬼塚→山本→肥前久保→西相知→佐里→駒鳴→大川野→肥前长野→桃川→金石原→上伊万里→伊万里|

Fujikyu 是一条旅客运营线路展示ID，实际由大月线（大月—富士山）与河口湖线（富士山—河口湖）组成；富士山站存在折返方向变化，路线上仍可从大月至河口湖行驶。FJ为站编号前缀，展示色 #5d3602 为站牌棕色系的网站近似值，非运营公司公布的色票。和东京Metro赤坂站、JR横滨线十日市场站分别保留独立站ID `Akasaka-Fujikyu`、`Tokaichiba-Fujikyu`，未覆盖这些既存站名映射。

## 坐标与名字资料
- 富士急行线18站官方名称和2026年3月14日时刻表：https://www.fujikyu-railway.jp/station/
- 富士急行线车站坐标：https://www.rosenzu.net/甲信越/富士急行（大月〜河口湖）
- 日光线7站：https://en.japan-rail.com/JR-East/Nikko 、日光市2026年10月06日公告 https://www.city.nikko.lg.jp/kurashi_tetsuzuki/bus_kokyokotsu/4/10747.html
- 日光线车站坐标：https://www.rosenzu.net/関東/ＪＲ日光線（宇都宮〜日光）
- 利府线真实三站：https://timetables.jreast.co.jp/2611/timetable-v/248d1p.html
- 新利府坐标：https://postcode.teraren.com/stations/7750
- 利府坐标：https://mapfan.com/spots/SCH,J,T3
- 筑肥线西段官方站表（含山本换乘和铁路归属）：https://www.jrkyushu.co.jp/railway/station/
- 筑肥线西段地理坐标：https://www.rosenzu.net/九州・沖縄/ＪＲ筑肥線（姪浜〜伊万里）

复用既有 canonical `Otsuki`、`Utsunomiya`、`Iwakiri`、`Nishi-Karatsu`、`Karatsu`、`Onizuka`、`Yamamoto-Saga`。原 `Nikko`（36.7139,139.6986）实际上落在今市附近，依据日光线地理站表修正为（36.747192,139.622108）；原 `Kawaguchiko`（35.5133,138.7658）更正至（35.498239,138.768624）。不改 Otsuki 等已有正确站点坐标。

## SQL/实时数据安全
四条线路 `timetableDataStatus=station_topology_only`，`sourceQuality=topology_verified_times_approximate`。本轮 `durations` 与 `durationTotalMin` 是路线搜索所需粗估、**不是运营日时刻表**。没有制造列车番号、列车位置、延误、PNG车型或车辆归属。富士回游和中央线已有真实直通，但本轮仅标记大月换乘／直通关系；不生成模拟列车。筑肥西段西唐津→山本使用唐津线既有轨道，不能解读成全部轨道归属筑肥线。JR利府支线与本线共享岩切车站。保留旧路网 topoBreaks 与JR/ BRT隔离。

生产 `railway_lines` 如需登记，必须对这四条设置全部实际数据能力为 false，避免用空数据库制造列车；数据库注册仅用于持有ID，不等于已有时刻表。等官方停站/历法录完，再独立提升能力标记。

## 缺线清单和验收
`data/audits/jr-missing-lines-20261109.json` 将 Nikko、TohokuRifu、ChikuhiWest 从 `missingFrontend` 移至 `implementedFrontend` 且标注 `station_topology_only`；富士急行线另存 `newNonJrLines`，不错误计入JR线路数。仍缺的 JR北海道/四国/JR西日本/东海线路另行处理，不能因本轮补充宣称完成。
`tests/new-rail-lines-fujikyu-20261109.test.cjs` 检查站序/连接/车站坐标/ i18n/ ID冲突/ 生成物缓存。GitHub Pages 7页面版本号均取真实Git Blob SHA，避免旧数据缓存。

## Supabase 静态计划时刻表补全（2026-11-12）

用户提供的 `rail.zip` 含 GTFS 静态数据，不含 GTFS-RT VehiclePosition、TripUpdate 或 Alert；因此本批只补计划时刻表，不扩展实时范围。富士急行线筛出 152 个计划车次（平日 76、土休日 76）、2304 条停站时刻，覆盖既有 18 站及往返两个方向。站点冲突继续使用 canonical 的 `Akasaka-Fujikyu`、`Tokaichiba-Fujikyu`，没有覆盖东京 Metro 赤坂站或横滨线十日市场站。

已应用迁移：

- `20261112085044_fujikyu_gtfs_rail_20261112.sql`：登记 GTFS 来源、两个历法 revision、模板/停站/canonical timetable/member、线路站点，并只打开 SQL 计划回退。
- `20261112090359_fujikyu_coverage_audit_20261112.sql`：建立富士急行线的 `unverified` 覆盖审计基线。

Supabase 回读结果为模板 152、停站时刻 2304、线路站点 18、canonical timetable/member 各 152、非法钟点 0、车辆字段 0；`sql_planned_fallback_enabled=true`，`timetable_api_enabled=false`，`realtime_position_api_enabled=false`。完整性视图仍保持 `pending_official_full_day_timetable_reconciliation`，不能据此宣称已完成运营公司正式版全日时刻表核验。
