# 相鉄・JR直通（JR接续区间）2611 车型与番号审计

## 线路、来源、车型边界

- 内部 key: `SotetsuJRDirect`，来源铁路 `odpt.Railway:JR-East.SotetsuDirect`
- 现有四站：羽沢横浜国大、武蔵小杉、西大井、大崎；**仅 JR 接续段**，不在这里补海老名或新宿的虚构站时
- [JR / 相铁联合官方运转计划](https://www.jreast.co.jp/press/2019/20190716.pdf) 指定 **JR E233系7000番台** 和 **相铁12000系** 为直通车型；[相铁现行车辆图鉴](https://www.sotetsu.co.jp/life/gallery/train/) 仍注明 12000 系供 JR 直通
- [JR 东日本 2611 北行平日628d1p](https://timetables.jreast.co.jp/2611/timetable-v/628d1p.html)、[北行土休日628d2p](https://timetables.jreast.co.jp/2611/timetable-v/628d2p.html)、[南行平日628u1p](https://timetables.jreast.co.jp/2611/timetable-v/628u1p.html)、[南行土休日628u2p](https://timetables.jreast.co.jp/2611/timetable-v/628u2p.html)
- **1xxM/2xxM 是公共列车番号的相铁侧特急/各停区分，不是车辆所属方、运用番号或特定车辆编组。** JR 四站段类型均按 Local 处理；相铁侧其他车种绝不能因与 JR 直通车的番号相似而进入本次范围

## SQL 衔接与可信范围

数据库既有 `manual_timetable_templates` 共 184 条：平日 46 北行 + 46 南行，土休日 46 北行 + 46 南行，共 96 个不同番号。原始来源是固定版本 mini-tokyo-3d `jreast-sotetsudirect.json`，全部车型标签为空，canonical `source_only`，`timetable_validity=undated_not_current_verified`。**不声明这些钟点已经逐条比对官方2026-11时刻表。**

新建并已应用 `supabase/migrations/20261107042000_sotetsu_jr_direct_2611_two_fleet_source_candidates.sql`，只按 184 条源 ID 记录准确四站路线、历法、番号、方向，两种车型与两张已存在的像素 PNG，以及 JR 官方联合车型来源；增加 RLS，保留 `reference_only=true`、`number_date_verified=false`、`authorizes_png=false`、`actual_vehicle_confirmed=false`。当时 `train_timetable_vehicle_mappings` 仍未建立逐车次对应；现已在下方记录 2026-11-10 的后续证据与车型映射。

## 程序安全与像素列车

1. Edge `train-runs` 从上表按日历获取 92 条，核对 `source_template_id`、原始铁路、站序、方向、Local、完整番号、双车型/原始图库证据才携带候选；不直接声明逐车次日期已发布或实际车辆身份。
2. `train-number-png-ranges.js` 删除 `SaikyoKawagoe` 与 `SotetsuJRDirect` 原始无条件 E233 1xx/2xx M PNG 区间，避免因公开番号误判型号；新 `verifySotetsuJRService` 核实原始 SQL 来源、当月日历与四站、官方车种来源。
3. 站位推算器 `officialSotetsuJRPlan` 只给历史 SQL 推算（非实时确证）产生两种候选，并将所有证据传至渲染器。
4. `TrainVehicle.selectMarkerArtwork` 优先判断 JR 接续区间：未独立证实实车时只用**一个中性 SVG 标记**，候选 PNG 仅作诊断路径；不会把两种车画成同一运行中的两台车，更不会用站时数据推断真实编组。独立确证的 EXACT 实车解析不被无条件覆盖。

## 尚未实现的范围

实际列车的日内出车/编组仍未核实，也没有将羽沢与大崎两端之外的线路站时强行拼接为完整跨线位置。2026年12月及后续月份需要重新对照当期官方时刻表；2026年11月的核验不能外推。

## 2026-11-10 官方番号索引与线路展示补充

- 新增 `data/timetables/jreast-sotetsu-jr-direct-2611-number-index.js`，将 JR 东日本 2611 四张官方时刻表按平日/土休日、北行/南行登记为 46 × 4 个车次列；运行时按日期、方向和车次做精确准入，并保留官方页面 URL。
- `SotetsuJRDirect` canonical presentation 补齐 `JS`、JR 东日本绿色 `#00ac47` 和现有埼京线像素图标；图标只表示 JR 接续区段，不改变四站边界。
- 详情/折叠列车列表显示“官方列车号”和对应号段，同时明确 E233系7000番台／相铁12000系仍是车型候选；实体车号、当天实际编组和 PNG 授权仍未确认。
- 生产库只读回读：`manual_timetable_templates` 四组均为 46 条；本轮未执行 Supabase 写入、迁移或 Edge 部署。

## 2026-11-10 实际完成：计划时刻表、日期特殊变更和位置门槛

- 数据权威仍是 SQL `manual_timetable_templates` / `manual_timetable_template_stops`，不新建平行的计划时刻表。使用 ODPT 列车时刻表接口返回的四站 184 条结构化记录逐站核对了现有 SQL；数据内容 184/184 完全一致。其四个日历／方向组的列车番号及四站常规发到钟点，还与 JR 东日本 2026年11月 628d1p／628u1p／628d2p／628u2p 官方表核对，184/184 匹配。
- Supabase 新建 `published_sotetsu_jr_2611_clock_proof`（184 条，只读证据；校验来源 ID、列车番号、方向、日历、四站钟点签名；有固定指纹防止历史 SQL 被无意替换）；`published_sotetsu_jr_2611_dated_clock_variation`（8条），两表开启 RLS。来源 URL 及核验版本明确记录在每条证据，不储存整张官方网页。
- 2026-11-07：222M、226M、234M、284M、144M 北行与 223M、237M 南行，共7条指定日期官方时刻变更；2026-11-22：270M 北行1条变更。沿线四站以官方当日公布的“发／到”钟点替换，**官方未单独公开的中间站到达时刻保持空值，禁止使用历史分值伪装核验**。没有读取或合并12月6日另行公布的季节性列车。
- Edge `train-runs` 仅在2026年11月且每个 source 模板可验证时设置 `timetable_date_verified=true`、`timetable_validity=date_verified`；每个方向每天 46 条，全天92条。对于12月及以后保持 `timetable_date_verified=false`，不因旧证据把未来标成已完成时刻表。只有当92条均核验且无遗漏，API 才返回该月 `complete=true`、`plan_status=verified_2611_four_stop`；通用全线审计表仍保留原有全月份未核验值。
- `RuntimeConfig.SQL_POSITION_VERIFICATION_MONTHS.SotetsuJRDirect=["*"]` 是全月日期准入门槛：只有 Edge 的当日 `timetable_date_verified=true` 可进入时刻表位置估算。ODPT 实际实时 Train 位置源独立处理，不把“计划存在”升级为“实际开行”。所有车型始终保持 JR E233系7000番台／相铁12000系候选关系，不能靠车次号生成唯一车辆图片。
- 四语官方来源面板提供 JR 东日本直通列车运行信息、相铁运行信息与四张时刻表链接，说明 JR（约30分钟）与相铁（约10分钟）的发布阈值不同；详情懒加载失败复用现有 DataState 重试机制。
- 生产 API GET 手工回读：2026-11-10 / 2026-11-07 / 2026-11-22 三日均返回 HTTP 200、92/92 核验、`complete=true`；2026-12-01 92条仍未通过该月日期核验，`complete=false`。11/07 的 222M、223M、234M 和 11/22 的 270M 四站显示钟点已与单独日期证据匹配。

### 证据边界

- “2026年11月计划时刻表已核实”指四站、184条日历计划时刻及明示日期变更；不包括实际运营状态、列车真实位置、真实车型或羽沢／大崎以外的站时。
- 对任何其他月份，只保留历史 SQL 供来源审计，绝不能在地图上产生未核验的“当日计划位置”。

## 2026-11-10 后续：Supabase 计划车型映射（不是实车）

- 不新增平行时刻表：继续由 `manual_timetable_templates`、`train_timetables` 和 `train_timetable_vehicle_mappings` 负责车次身份、四站钟点及计划车型。
- 2026-03-14 相铁12000系与 JR E233系7000番台的**平日/土休日两套完整非官方运用表**分解为逐车次操作；与 2026-11 月四组正式号码及数据库 184 条模板匹配。平日：12000×34 / E233×58；土休日：12000×36 / E233×56。无重号、无遗漏、无车型交叉。
- 四份资料记为 `evidence_sources` 的 `source_type=reference`、`evidence_grade=C`。184 条映射写入原有 `train_timetable_vehicle_mappings` 的 `source_single_type_candidate`，附真实来源 URL 与参考运用组号。**C 级资料仅能用于计划车型参考，不是官方逐车次确认或当天真实车辆信息；不能生成真实编组号。**
- Edge `train-runs` 通过原有 `train_timetable_source_resolution` 视图查出映射，逐车次核对四站日期、车型集合、来源 URL、C 级证据和运用组格式。仅在核验通过时将选定计划车型及其对应画廊 PNG 参考传给前端，`vehicle_plan_confirmed=false`、`vehicle_artwork_path=null` 仍保持。
- 前端 `TrainVehicle.selectMarkerArtwork` 只在 2026年11月、上述完整证据齐备且没有已确认的独立真实车辆解析结果时，显示对应车型的**计划插图**。否则回退中性标记；不会将候选参考提升为真实位置或实际编组。列车详情仅显示简短的“计划车型（实车未确认）”，不加入另设的长说明区。
- 生产 Edge 回读：平日 `34/58`、土休日 `36/56`，11月7日7条日期特别钟点变更生效；12月10日未核验的92条历史模板不返回任何计划车型映射或虚构实车证据。
