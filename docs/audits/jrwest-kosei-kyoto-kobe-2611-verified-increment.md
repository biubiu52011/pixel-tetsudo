# JR西日本 JR京都線・JR神戸線・湖西線 2026-11 数据增量（2026-11-07）

## 与旧资料的区别

本次不重复导入旧的 `Kosei-manual.js`、`TokaidoKansai-manual.js`、`SanyoMain-manual.js` 时刻；也不将历史 SQL 车次和后缀猜为正式现行编号。沿用现有 `manual_timetable_templates`、`train-runs` Edge、车辆候选和图库审查体系。

### 1. 湖西線：八条原来源逐站核验

以 JR 西日本当期发布的 1802/1804/1806/1808M 平日及土休日页面，对照原有 18 站到发时间。迁移 `20261107110000_jrwest_kosei_verified_clock_and_through_number_evidence.sql` 在 `published_jrwest_kosei_2611_verified_source_clocks` 记录 8 条：`1802M`、`1802MH`、`1804M`、`1804MH`、`1806M`、`1806MH`、`1808M`、`1808MH`。内部 `MH` 仍是历史导入的土休日标记，**公布列车番号为 `M`，绝非运营编组**。平日和土休日分别进行核对，不将不同日历的时间混为一谈。

证据只保存来源链接、版次和原始 18 站指纹；`published_jrwest_kosei_2611_clock_evidence` 按原数据重新计算 stop fingerprint，检查 18 站且官方版次及历法一致时，`train-runs` 才会把对应 source-only 单列车设为 `timetable_date_verified=true`，仍返回 `complete=false`（线路不完整），并在 `published_train_number` 给出无 `H` 的实际编号。无法匹配则拒绝，**绝不沿用指纹失效后的旧站时**。

来源：
- https://timetable.jr-odekake.net/train-timetable/322261?date=20261023
- https://timetable.jr-odekake.net/train-timetable/322421?date=20261031
- https://timetable.jr-odekake.net/train-timetable/15881?date=20261104
- https://timetable.jr-odekake.net/train-timetable/15891?date=20261101
- https://timetable.jr-odekake.net/train-timetable/15941?date=20261104
- https://timetable.jr-odekake.net/train-timetable/15951?date=20261018
- https://timetable.jr-odekake.net/train-timetable/322441?date=20261023
- https://timetable.jr-odekake.net/train-timetable/322451?date=20261024

### 2. 京都・神户・湖西跨线番号的八段官方来源

`published_jrwest_2611_crossline_number_reference` 提供以下独立证据，每段都记录官方 URL、番号、区间和同一列车服务键，但不产生位置：
- `3479M`：京都线+神户线、姬路方向 2 段（2026-11-07 土休日来源）。
- `3107M → 3507M`：近江今津中途改号，湖西线区段、经京都、大阪、神户至网干的区段共 4 条参考；不能把整个行程强行标成 `3107M`。
- `4006M`：サンダーバード 6 号的湖西线和京都－大阪 2 段（车型未根据车次断言）。

官方例：
- https://timetable.jr-odekake.net/train-timetable/208221?date=20261107
- https://timetable.jr-odekake.net/train-timetable/145282?date=20261107
- https://timetable.jr-odekake.net/train-timetable/258161?date=20261103

`train-runs` 的 `jrwest_official_number_references` 字段对符合历法的分段返回证据；**独立来源编号不允许产生列车位置**（`authorizes_position=false`）、不允许承认站时（`stop_clocks_verified=false`），也不能自动拼合历史复合 ID。该字段与正常的 `runs` 完全分开。

### 3. 车辆图标与剩余缺口

- 本轮**没有**为 207／321／223／225／221／521 或 681／683 做任意分车次 PNG 指派。既有 58 条京阪神和 179 条湖西候选族映射保留，但它们不是当日物理编组。
- 223/225 既有图库素材作用范围不是京阪神和湖西，不得跨涂装拿来当确定图标；无授权路径时渲染既有中性 SVG 标记。
- 当前仍需逐条匹配 JR 官方全月上下行、全部车次的番号、停站与时刻。京都／神户线仅建有历史部分段；湖西线旧 179 条不能自动算 2026 年 11 月的完整列车；サンダーバード全班次及 9017D 特殊车日历仍待分别核实。**不能把本次有限增量称作全线数据完成。**
- 无新增远程请求循环、无新前端脚本，无重复线路表；查询沿用原 `train-runs` 入口与既有车辆候选准入规则。

## 验证

在目标 Supabase `pnupwfmgbtxqhpzsrhfn` 已执行本迁移并查询：八条 `clock_evidence` 的 `verified_source_match=true`，另八条 `crossline_number_reference` 的编号证据约束均通过；随后部署 `train-runs` v330。

注意：全量官方时刻表依法不得擅自复制传播。本次的证据不再复制官方完整时刻表，而是比对现有站时后保留必要的校验元数据。


## 2026-11-07 续批：2026-11 官方时刻校验增量

### 湖西線：原 8 → 34 条日历来源

新增迁移：
`supabase/migrations/20261107123000_jrwest_kosei_2611_expand_verified_source_clocks.sql`

- 新增 26 条历史源的原始逐站指纹；累计 34 条（平日 17、土休日 17），原来 8 条保持不变。
- 新认证公众番号：`1810M`、`1812M`、`1814M`、`1816M`、`1818M`、`1820M`、`1824M`、`1826M`、`1828M`、`1830M`、`1832M`、`1834M`、`1836M`。
- `1810M` 平日 09:02 发京都、土休日 08:42 发，未共享一张车次时刻表。
- `1826M` 和 `1832M` 都延长到永原，21 个站点；其余本批 18 站。新的校验不再假设所有湖西线普通车都是 18 站。
- 只扩大原表约束，延续 `published_jrwest_kosei_2611_clock_evidence` 的运行时重算指纹检查；有任何来源时刻、站序、类型和日历变化即不核准。
- 依据 JR 西日本 2026年11月号个别列车页面，校验原始记录而非复制、重新发布官方整个区间时刻表。部分官方 URL 参数为 2026 年 10 月，但页面已经标注数据来源为 2026年11月号；且所涉列车为每日或对应的平日/土休日运行。

### JR京都線／JR神戸線：新增 5 条有官方番号的原来源行程

迁移：
`supabase/migrations/20261107124500_jrwest_kyoto_kobe_2611_five_verified_source_clocks.sql`

现有候选表 `published_jrwest_kyoto_kobe_2611_source_fleet` 新增可空的来源番号、URL、指纹与已核对的 7 站区间数值。不是新建一套历史时刻所有权；候选映射仍按原来 58 条管理，只有五条获得官方车次核验：

| 官方番号 | 日历 | 已验证区段 | 官方资料 |
| --- | --- | --- | --- |
| `3447M` | 平日 | 高槻→神戸 | [JR官方](https://timetable.jr-odekake.net/train-timetable/173871?date=20261023) |
| `3465M` | 平日 | 高槻→神戸 | [JR官方](https://timetable.jr-odekake.net/train-timetable/206551?date=20261030) |
| `3473M` | 土休日 | 高槻→神戸 | [JR官方](https://timetable.jr-odekake.net/train-timetable/206581?date=20261024) |
| `3472M` | 土休日 | 三ノ宮→京都 | [JR官方](https://timetable.jr-odekake.net/train-timetable/173081?date=20261028) |
| `3530M` | 土休日 | 三ノ宮→京都 | [JR官方](https://timetable.jr-odekake.net/train-timetable/208291?date=20261024) |

以上官方都是「新快速」服务，旧 `train_type_urn=...Rapid` 保留用于历史源和车型候选的兼容判定，另保留 `published_train_type=...SpecialRapid` 证明；**不能让历史分类擅自改变物理编组的识别逻辑**。用户需要可见种别时必须在严密的服务类型校验后才能展示。

`published_jrwest_kyoto_kobe_2611_clock_evidence` 为 `security_invoker` 视图，强制对源站序和时刻重新计算指纹。当天运行日类别对应后，`train-runs` 才把这 5 条 7 站源设置为 `timetable_date_verified=true`，其余候选仍为参考。

### 发布与边界

Supabase 已经应用上述两次迁移，查询确认 **湖西 34/34、京阪神 5/5** 有效源匹配；Edge Function 已部署为 `train-runs v332`。直接提交 `main`，不建立 PR。

无论新增的是公开车号还是已验证的站时，都**没有实车编组身份证据**，因此不执行 `207/321/223/225/221/521` 的逐车次 PNG 指派。历史源仍不能伪装为 JR西日本全线 2026-11 完整发车表。剩余车次需继续核验。


### 同日追加：九条 JR京都／JR神戸线实核区间与两条运行日冲突

迁移 `supabase/migrations/20261107132000_jrwest_kyoto_kobe_verified_nine_and_calendar_conflicts.sql` 继续向既有 `published_jrwest_kyoto_kobe_2611_source_fleet` 写入四个**平日**可核验的 7 站新快速区间：
`3452M`（三ノ宮→京都）、`3511M`（高槻→神戸）、`3531M`（高槻→神戸）、`3534M`（三ノ宮→京都）。独立官方记录分别为
[3452M](https://timetable.jr-odekake.net/train-timetable/206741?date=20261127)、
[3511M](https://timetable.jr-odekake.net/train-timetable/173961?date=20261124)、
[3531M](https://timetable.jr-odekake.net/train-timetable/209371?date=20261030)、
[3534M](https://timetable.jr-odekake.net/train-timetable/206771?date=20261009)。
京阪神累积 **9 条证据完全匹配（平日 6、土休日 3）**，均为来源局部区段的停站证据，不是全日历完整覆盖。

另外历史来源 `500310-3536200-3450M` 被归为土休日，但是[当期官方 3450M](https://timetable.jr-odekake.net/train-timetable/321991?date=20261029)为平日运行；历史来源 `500310-1866500-3506M` 被归为平日，但是[当期官方 3506M](https://timetable.jr-odekake.net/train-timetable/173162?date=20261024)仅土休日运行。原始 source ID/历史时刻全部保留，不将列车“搬到”另一个日历（没有核实该新日历的来源停站）。新增 `official_calendar_conflict`、`official_calendar_urn`、`official_calendar_source_url` 约束，Edge 主动校验来源证据后从当日结果中剔除这两个错误日历的旧列车，防止 Ghost Train。

正式番号只展示于通过 7 站原时刻校验的运行实例，不根据历史 ID 后缀自动认证；车辆仍为未确认混用候选且 `authorizes_png=false`。数据库检查通过：**湖西线 34/34、京都神户线 9/9、2 个日历冲突记录**。Edge 发布至 `train-runs v333`，继续沿用原单一接口、无新增前端请求或脚本。

