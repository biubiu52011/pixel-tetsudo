# 相鉄・JR直通（JR接续区间）2611 车型与番号审计

## 线路、来源、车型边界

- 内部 key: `SotetsuJRDirect`，来源铁路 `odpt.Railway:JR-East.SotetsuDirect`
- 现有四站：羽沢横浜国大、武蔵小杉、西大井、大崎；**仅 JR 接续段**，不在这里补海老名或新宿的虚构站时
- [JR / 相铁联合官方运转计划](https://www.jreast.co.jp/press/2019/20190716.pdf) 指定 **JR E233系7000番台** 和 **相铁12000系** 为直通车型；[相铁现行车辆图鉴](https://www.sotetsu.co.jp/life/gallery/train/) 仍注明 12000 系供 JR 直通
- [JR 东日本 2611 北行平日628d1p](https://timetables.jreast.co.jp/2611/timetable-v/628d1p.html)、[北行土休日628d2p](https://timetables.jreast.co.jp/2611/timetable-v/628d2p.html)、[南行平日628u1p](https://timetables.jreast.co.jp/2611/timetable-v/628u1p.html)、[南行土休日628u2p](https://timetables.jreast.co.jp/2611/timetable-v/628u2p.html)
- **1xxM/2xxM 是公共列车番号的相铁侧特急/各停区分，不是车辆所属方、运用番号或特定车辆编组。** JR 四站段类型均按 Local 处理；相铁侧其他车种绝不能因与 JR 直通车的番号相似而进入本次范围

## SQL 衔接与可信范围

数据库既有 `manual_timetable_templates` 共 184 条：平日 46 北行 + 46 南行，土休日 46 北行 + 46 南行，共 96 个不同番号。原始来源是固定版本 mini-tokyo-3d `jreast-sotetsudirect.json`，全部车型标签为空，canonical `source_only`，`timetable_validity=undated_not_current_verified`。**不声明这些钟点已经逐条比对官方2026-11时刻表。**

新建并已应用 `supabase/migrations/20261107042000_sotetsu_jr_direct_2611_two_fleet_source_candidates.sql`，只按 184 条源 ID 记录准确四站路线、历法、番号、方向，两种车型与两张已存在的像素 PNG，以及 JR 官方联合车型来源；增加 RLS，保留 `reference_only=true`、`number_date_verified=false`、`authorizes_png=false`、`actual_vehicle_confirmed=false`。原有 `train_timetable_vehicle_mappings` 184 条 unresolved **不提升为某一特定车型**。

## 程序安全与像素列车

1. Edge `train-runs` 从上表按日历获取 92 条，核对 `source_template_id`、原始铁路、站序、方向、Local、完整番号、双车型/原始图库证据才携带候选；不直接声明逐车次日期已发布或实际车辆身份。
2. `train-number-png-ranges.js` 删除 `SaikyoKawagoe` 与 `SotetsuJRDirect` 原始无条件 E233 1xx/2xx M PNG 区间，避免因公开番号误判型号；新 `verifySotetsuJRService` 核实原始 SQL 来源、当月日历与四站、官方车种来源。
3. 站位推算器 `officialSotetsuJRPlan` 只给历史 SQL 推算（非实时确证）产生两种候选，并将所有证据传至渲染器。
4. `TrainVehicle.selectMarkerArtwork` 优先判断 JR 接续区间：未独立证实实车时只用**一个中性 SVG 标记**，候选 PNG 仅作诊断路径；不会把两种车画成同一运行中的两台车，更不会用站时数据推断真实编组。独立确证的 EXACT 实车解析不被无条件覆盖。

## 尚未实现的范围

没有全量核实 2026 年 11 月全部 184 条源时刻是否与 628 官方日历完全相符；没有当天列车的实车编组资料；没有越过羽沢与大崎边界拼接其他线路的列车运行图。需要额外日期核验和跨线路明确同一实车证据。

## 2026-11-10 官方番号索引与线路展示补充

- 新增 `data/timetables/jreast-sotetsu-jr-direct-2611-number-index.js`，将 JR 东日本 2611 四张官方时刻表按平日/土休日、北行/南行登记为 46 × 4 个车次列；运行时按日期、方向和车次做精确准入，并保留官方页面 URL。
- `SotetsuJRDirect` canonical presentation 补齐 `JS`、JR 东日本绿色 `#00ac47` 和现有埼京线像素图标；图标只表示 JR 接续区段，不改变四站边界。
- 详情/折叠列车列表显示“官方列车号”和对应号段，同时明确 E233系7000番台／相铁12000系仍是车型候选；实体车号、当天实际编组和 PNG 授权仍未确认。
- 生产库只读回读：`manual_timetable_templates` 四组均为 46 条；本轮未执行 Supabase 写入、迁移或 Edge 部署。
