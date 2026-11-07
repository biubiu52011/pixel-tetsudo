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


## 2026-11-07 第三批：湖西線北段／上行与京阪神普通车

### 已部署结果

- 既有 `published_jrwest_kosei_2611_verified_source_clocks` 原表新增 **18 条**来源指纹：累计 **52 条，平日 26、土休日 26**。其中 18 条为上行／北部短区间，原有 34 条下行记录保留。
- 既有 `published_jrwest_kyoto_kobe_2611_source_fleet` 原表增加 **8 条**确认过的普通车来源：累计 **17 条，普通 8、新快速 9；平日 10、土休日 7**。其他历史来源和车型候选仍不升级为2026年11月确认时刻。
- 数据库重算源站序及到发时间的 MD5 指纹；已检查 **湖西線 52/52**、**京阪神 17/17** `verified_source_match=true`。
- Edge 已升级到 `train-runs v334`。仅在 **来源 ID、运行日、站序、站数、源指纹、官方番号/种别** 全部一致时标记本段时刻已核验。无重复运行表、无新前端请求、无新增付费服务。
- 既有两条有日历冲突的 `3450M` 和 `3506M` 继续被隔离，不移动到其他日历。

### 湖西線新增9个实际番号、18条日历来源

| JR列车番号 | 本次核验旧来源区间 | 原来源站数 | 日历特点 | JR西日本官方页 |
| --- | --- | ---: | --- | --- |
| 1831M | 永原→京都 | 21 | 平日、土休日山科～京都时刻不同 | [平日](https://timetable.jr-odekake.net/train-timetable/200841?date=20261023) / [土休日](https://timetable.jr-odekake.net/train-timetable/200851?date=20261031) |
| 1839M | 近江塩津→京都 | 22 | 每日 | [官方](https://timetable.jr-odekake.net/train-timetable/209821?date=20261030) |
| 4838M | 永原→近江今津 | 4 | 每日，敦贺直通前段未导入 | [官方](https://timetable.jr-odekake.net/train-timetable/72471?date=20261023) |
| 4840M | 近江塩津→近江今津 | 5 | 每日 | [官方](https://timetable.jr-odekake.net/train-timetable/76651?date=20261031) |
| 4842M | 永原→近江今津 | 4 | 每日，敦贺直通前段未导入 | [官方](https://timetable.jr-odekake.net/train-timetable/72481?date=20261108) |
| 4844M | 近江塩津→近江今津 | 5 | 每日 | [官方](https://timetable.jr-odekake.net/train-timetable/322481?date=20261026) |
| 4846M | 永原→近江今津 | 4 | 每日，敦贺直通前段未导入 | [官方](https://timetable.jr-odekake.net/train-timetable/321871?date=20261108) |
| 4850M | 近江塩津→近江今津 | 5 | 每日 | [官方](https://timetable.jr-odekake.net/train-timetable/91431?date=20261026) |
| 4852M | 近江塩津→近江今津 | 5 | 每日 | [官方](https://timetable.jr-odekake.net/train-timetable/322491?date=20261026) |

本批不包含 `4848M`：尚未核实2026年11月版的相同直通证据，不把2026年10月来源径直当成当期时刻。公开番号的 `M` 与库内假日标记 `MH` 区分；同番号的运行日来源不能擅自合并。

### JR京都線／JR神戸線新增8条普通来源

| 号码 | 运行日 | 已有原始来源区间 | 原来源站数 | JR西日本官方页 |
| --- | --- | --- | ---: | --- |
| 107C | 平日 | 京都→神戸 | 33 | [平日](https://timetable.jr-odekake.net/train-timetable/173541?date=20261026) |
| 107C | 土休日 | 京都→神戸 | 33 | [土休日](https://timetable.jr-odekake.net/train-timetable/173551?date=20261031) |
| 150C | 平日 | 元町→高槻 | 25 | [平日](https://timetable.jr-odekake.net/train-timetable/102541?date=20261117) |
| 150C | 土休日 | 元町→高槻 | 25 | [土休日](https://timetable.jr-odekake.net/train-timetable/102551?date=20261024) |
| 515C | 平日 | 京都→尼崎 | 19 | [官方](https://timetable.jr-odekake.net/train-timetable/209261?date=20261124) |
| 221C | 土休日 | 京都→神戸 | 33 | [官方](https://timetable.jr-odekake.net/train-timetable/20011?date=20261024) |
| 542C | 平日 | 元町→大阪（零点后） | 16 | [官方](https://timetable.jr-odekake.net/train-timetable/188971?date=20261104) |
| 542C | 土休日 | 元町→大阪（零点后） | 16 | [官方](https://timetable.jr-odekake.net/train-timetable/188971?date=20261104) |

注意：
- `107C` 和 `221C` 官方行程继续越过神戸至西明石，但旧 SQL 只保存京都→神戸。不得为缺失站点伪造预计到发，也不能把这33站冒充全程。
- `150C` 官方从西明石发车；旧源是元町以后至高槻的区间，与全程不同。
- `542C` 的凌晨片段属于上一运营日的晚间列车，切勿按自然日零时盲目拆成新车；原有 `service_date` 截断逻辑不改变。
- `C/T/M` 是用于确定发表车次的匹配信息，不意味着车型必定为207/321/223/225中的某一种，**本批没有任何逐车次 PNG 权限**。

### 代码位置与验证

- 迁移：`supabase/migrations/20261107140000_jrwest_kosei_2611_inbound_source_clocks.sql`
- 迁移：`supabase/migrations/20261107141000_jrwest_kyoto_kobe_2611_local_source_clocks.sql`
- 单一接口：`supabase/functions/train-runs/index.ts`
- 约束测试：`tests/jrwest-kosei-2611-verified-clocks-through.test.cjs`
- 官方站时因网页明确版权限制 **未复制成另一份时刻表**：仅比较数据库已有源数据，记录来源 URL、号、日历和不可伪造的源指纹。

后续缺口：湖西線大多数普通上下行／新快速以及 `4848M` 需要现行独立证据；京阪神其它普通 `C`、快速 `T` 和更多新快速 `M`、姬路及更西侧区间需要分段验收。线路总体仍为 partial，不能宣称完整时刻表。


## 2026-11-07 第四批：JR京都・神戸線快速 T の段階的証拠

在现有 `published_jrwest_kyoto_kobe_2611_source_fleet` 中追加 **6 条** Rapid T 历史片段逐站比对结果，未新建 timetable 表，也没有复制 JR 西日本发布的完整到发时刻表。相关迁移：
`supabase/migrations/20261107142000_jrwest_kyoto_kobe_2611_rapid_t_source_clocks.sql`。

| 番号 | 日历 | 旧来源已验证区间 | 核验站数 | JR西日本官方来源 |
| --- | --- | --- | ---: | --- |
| 714T | 平日 | 元町→京都 | 18 | [官方](https://timetable.jr-odekake.net/train-timetable/129501?date=20261028) |
| 714T | 土休日 | 元町→京都 | 18 | [官方](https://timetable.jr-odekake.net/train-timetable/389701?date=20261024) |
| 726T | 土休日 | 元町→京都 | 18 | [官方](https://timetable.jr-odekake.net/train-timetable/387041?date=20261024) |
| 733T | 土休日 | 西大路→神戸 | 18 | [官方](https://timetable.jr-odekake.net/train-timetable/147931?date=20261018) |
| 767T | 土休日 | 西大路→神戸 | 18 | [官方](https://timetable.jr-odekake.net/train-timetable/147561?date=20261107) |
| 791T | 平日 | 西大路→神戸 | 18 | [官方](https://timetable.jr-odekake.net/train-timetable/101651?date=20261006) |

每条核对了来源站序、到站/出站时间指纹和运行日；T 番号对应已认证的 `Rapid`，此前 `C=Local`、`M=SpecialRapid` 的区分保留。这些只代表导入来源已有的 18 站片段，不代表其官方公开行程的全程，也不是车辆系别、具体车辆号码或 PNG 的证据。

**本批修复了重要的已有兼容漏洞：** 前一版 `train-runs` 虽加入普通 `C` 可认证的 16／19／25／33 站证据，但校验末端依然要求 7 个有时间的站点，可能造成普通车来源运行时错误。现在统一使用每条来源校验过的 `official_stop_count`，适配 `Local C`、`Rapid T`、`SpecialRapid M` 三个类型。源 ID 继续用于内部匹配，而对用户公开的番号单独保存在 `published_train_number`。

当前证据视图统计：**京都神戸線共 23/23 条核验通过**（平日 12，土休日 11；普通 8、快速 6、新快速 9）；**湖西線 52/52 条**保持原数。运行时所有列车与车型图像均继续执行旧的防误配门槛；没有擅自把 223、225 或 207、321 指定到特定的 train-number。


## 2026-11-07 第五批：普通与快速按「番号＋日历＋源站时」继续验证

本批延续唯一 `published_jrwest_kyoto_kobe_2611_source_fleet` 数据所有权，不新建平行 timetable 表。新增 SQL 迁移 `supabase/migrations/20261107143000_jrwest_kyoto_kobe_2611_more_local_rapid_verified.sql` 将 **8 条**现有来源经过 JR 西日本 2026年11月号个别列车页面的站时、种别、运营日核对后升级为已验证来源：

| 公众列车番号 | 来源日历 | 历史源区间 | 核对站数 | 官方证据 |
| --- | --- | --- | ---: | --- |
| `172C` | 土休日 | 三ノ宮→高槻 | 25 | [JRおでかけネット](https://timetable.jr-odekake.net/train-timetable/129881?date=20261030)（每日） |
| `176C` | 平日 | 三ノ宮→高槻 | 25 | [JRおでかけネット](https://timetable.jr-odekake.net/train-timetable/129901?date=20261026)（每日） |
| `194C` | 土休日 | 三ノ宮→京都 | 32 | [JRおでかけネット](https://timetable.jr-odekake.net/train-timetable/129991?date=20261024)（土休日版本） |
| `202C` | 平日 | 三ノ宮→京都 | 32 | [JRおでかけネット](https://timetable.jr-odekake.net/train-timetable/86491?date=20261013)（平日版本） |
| `228C` | 平日 | 三ノ宮→京都 | 32 | [JRおでかけネット](https://timetable.jr-odekake.net/train-timetable/21281?date=20261026)（每日） |
| `810T` | 土休日 | 三ノ宮→京都 | 18 | [JRおでかけネット](https://timetable.jr-odekake.net/train-timetable/389831?date=20261012)（土休日版本） |
| `823T` | 土休日 | 西大路→神戸 | 18 | [JRおでかけネット](https://timetable.jr-odekake.net/train-timetable/129491?date=20261025) |
| `835T` | 土休日 | 西大路→神戸 | 18 | [JRおでかけネット](https://timetable.jr-odekake.net/train-timetable/386891?date=20261031) |

**注意「每天运行」不等于两份导入来源都已验证**：本次仅认证库里存在且来源站时匹配的那一种日历，没有为 `172C、176C、228C` 虚构另一种日历来源。

**双日历同号规则：** 检索官方 `194C` 和 `810T` 会发现同一番号的平日/土休日不同官方版本。不可因为看到某个平日版本写「土休日运休」，就直接断定同番号的其他日历一定没有运行。此前 `3450M、3506M` 的专门例外隔离维持原状；这批没有新增未经核实的错误日历隔离。

### 数据与接口状态

- `published_jrwest_kyoto_kobe_2611_clock_evidence`：**31/31** 已验证来源，平日 **15** 条、土休日 **16** 条；`Local C` **13**、`Rapid T` **9**、`SpecialRapid M` **9**。同时保留 2 条之前已有的日历冲突记录。
- **湖西線保持 52/52 条**已核验来源。剩余 `4848M` 在官方 2026年11月区间时刻表中可确认番号，但可访问到的整列车详情只确认了 10 月来源；**没有将旧 4 站时刻升级为 11 月已经逐站认证**。
- Edge `train-runs` 已部署至 **v336**，仅根据源 ID 和原始指纹核验的数据使用真实公众番号字段，兼容 32 站普通车；不增添地图上的空想列车，不推断编组、不授权车辆 PNG。
- `tests/jrwest-kosei-2611-verified-clocks-through.test.cjs` 增加 8 条来源、日历和指纹回归断言，与既有 QA 工作流共用同一测试入口。

本次不改首页布局、导航、额外资源加载或渲染层。源车号仅用于内部匹配；用户无需看到历史组合 ID。全线时刻和跨线行程仍未达到完整覆盖。


## 2026-11-07 第六批：JR神戸線（神戸以西）跨 SanyoMain 首次验证

JR神戸線作为运营线路跨越数据库 `TokaidoKansai` 与 `SanyoMain`；不能只核验京都～神戸的 `TokaidoKansai`，就说已经完成京都～姬路。先在 `SanyoMain` 旧来源中单独核验 **4 条普通 C 列车的原站时片段**，复用现存 `published_jrwest_kyoto_kobe_2611_source_fleet` 及其 security-invoker 视图，禁止产生第二份时刻表权威数据。

迁移：`supabase/migrations/20261107144000_jrwest_kobe_sanyo_2611_four_verified_local_sources.sql`。

| 公布番号 | 运行日 | 已核验 SanyoMain 来源区间 | 站数 | JR 西日本 2026-11 号原站时 |
| --- | --- | --- | ---: | --- |
| `173C` | 平日 | 兵庫～須磨 | 5 | [来源](https://timetable.jr-odekake.net/train-timetable/102351?date=20261024) |
| `209C` | 平日 | 兵庫～西明石 | 11 | [来源](https://timetable.jr-odekake.net/train-timetable/18981?date=20261026) |
| `217C` | 土休日 | 兵庫～西明石 | 11 | [来源](https://timetable.jr-odekake.net/train-timetable/19441?date=20261031) |
| `241C` | 平日 | 兵庫～西明石 | 11 | [来源](https://timetable.jr-odekake.net/train-timetable/23181?date=20261028) |

同时对 `741T`（weekday、兵庫～網干）做了完整源站序对照：旧源「手柄山平和公园」11:48到、**11:49发**，而[当期 JR 官方](https://timetable.jr-odekake.net/train-timetable/148091?date=20261025)为 **11:48发**，存在 1 分钟不一致。因此**不写入已验证时刻视图、不自动改动历史库、不产生确认证据**。与明确已发布的列车时刻不一致时应先恢复正确来源，不能靠贴补小修正时刻。

已执行数据库迁移，源指纹重算通过：`SanyoMain` **4/4**、`TokaidoKansai` **31/31**，合计 **35/35**（主线平日15/土休日16；神户以西平日3/土休日1），湖西線仍为 **52/52**。Edge Function `train-runs v337` 共用同一个时刻证据门槛，按来源线区分站数而非把西段的 5/11 站当作东段的 16~33 站；所有源仍不具有真实车辆编组或 PNG 授权。新增同一测试文件的覆盖断言。

注意以上四条只能证明已导入片段，**不意味着兵庫到西明石之外的路段、姬路全线、全部普通/快速班次已经完备**。


## 2026-11-07 第七批：JR神戸線西段 10 条新核验来源及 M 号快速例外

本批直接沿用 `SanyoMain` 原始模板和 `published_jrwest_kyoto_kobe_2611_source_fleet` 现有候选表；**未创建新的独立时刻表所有权、未改 UI、未加载额外 JS，也未增车次 PNG 映射**。本次两份迁移：

- `supabase/migrations/20261107145000_jrwest_kobe_sanyo_2611_six_local_source_clocks.sql`
- `supabase/migrations/20261107150000_jrwest_kobe_sanyo_2611_newrapid_rapid_source_clocks.sql`

### 新增 6 条普通 C 已核验来源

| 公众车次 | 原 SQL 运行日 | 已有原始区间 | 来源站数 | JR西日本 2026-11 个别列车证据 |
| --- | --- | --- | ---: | --- |
| `153C` | 平日 | 兵庫→須磨 | 5 | [官方](https://timetable.jr-odekake.net/train-timetable/155921?date=20261104) |
| `189C` | 平日 | 兵庫→須磨 | 5 | [官方](https://timetable.jr-odekake.net/train-timetable/102401?date=20261023) |
| `191C` | 平日 | 兵庫→須磨 | 5 | [官方](https://timetable.jr-odekake.net/train-timetable/86381?date=20261009) |
| `4631C` | 土休日 | 兵庫→西明石 | 11 | [官方](https://timetable.jr-odekake.net/train-timetable/189391?date=20261023) |
| `4693C` | 平日 | 兵庫→西明石 | 11 | [官方](https://timetable.jr-odekake.net/train-timetable/189601?date=20261013) |
| `4729C` | 土休日 | 兵庫→西明石 | 11 | [土休日官方](https://timetable.jr-odekake.net/train-timetable/189791?date=20261017) |

同一番号的**平日/土休日版本可能在个别停站有不同到发分钟**，不能从该号码的一个版本推断另一个版本；特别是 `4729C` 只认证历史 SQL 中的土休日原来源片段。所有来源时刻指纹在执行迁移前后均重新计算，未复制官方公布的整列车时刻表。

### 新增 4 条快速／新快速来源

| 公众番号 | 运行日 | 正式种别 | 已验证区间 | 来源站数 | 官方页面 |
| --- | --- | --- | --- | ---: | --- |
| `3425M` | 土休日 | 新快速 | 明石→姫路 | 4 | [JR西日本](https://timetable.jr-odekake.net/train-timetable/173971?date=20261121) |
| `3469M` | 土休日来源 | 新快速 | 明石→姫路 | 4 | [JR西日本](https://timetable.jr-odekake.net/train-timetable/145241?date=20261124)（官方号可每日运行；只认证已有假日源） |
| `717M` | 平日 | **快速** | 兵庫→姫路 | 17 | [JR西日本](https://timetable.jr-odekake.net/train-timetable/101711?date=20261027) |
| `815T` | 土休日 | 快速 | 兵庫→姫路 | 17 | [JR西日本](https://timetable.jr-odekake.net/train-timetable/102101?date=20261012) |

重要：`717M` 的公众列车番号末尾虽然是 `M`，**官方种别却是「快速」**，而非「新快速」。因此 `train-runs` 不再对 `SanyoMain` 简单使用 `M=SpecialRapid`。采用严格 source-only 证据：`717M` 在该区间明确标记 `published_train_type=Rapid`，`3425M/3469M` 是 `SpecialRapid`。号只是底层匹配依据，不凭号推算物理编组或渲染 223／225 PNG。A快速 `815T` 的公开列车设施信息也不构成逐车次车型确认。

### 状态与剩余缺口

线上已应用上述两次迁移，`train-runs` 更新为 **v339**，SQL 查询验证：
- 京都／神户走廊 **45/45** 已认证来源，`TokaidoKansai` 31，`SanyoMain` 14；
- 湖西線 **52/52** 已认证来源，无新增确认；
- 以上都是**原来源片段**而非全天完整线路时刻表。对于 `3425M` 的跨米原直通 `3225M→3425M` 不能据局部 4 站信息补全实际列车位置；类似 `3469M` 北段经湖西线的直通番号也不能擅自拼合。

仍待分开核验：`741T` 旧来源手柄山平和公园站分钟差异、`749T`、`789T`、`845T` 等分日历版本，`4848M` 湖西线现行来源，以及其他上／下行和特急。保留既有旧来源，防止幽灵列车；没有为未验证线路声称完整。


## 2026-11-07 第八批：湖西線 4848M 的官方 2026-11 号证据

前面阶段因只能找到 2026 年 10 月版列车详情而暂缓 `4848M` 认证；**这一缺口现在已经解决**。找到明确注明「JR時刻表 2026年11月号」的 JR 西日本官方个别列车页面：
[143M→4848M（近江塩津で改号）](https://timetable.jr-odekake.net/train-timetable/96861?date=20261026)。官方列车 `4848M` 为每日运行，已有旧 SQL 中两条来源分别对应平日 `4848M` 与土休日导入标记 `4848MH`。在已导入的 **永原→近江今津四站**，二者原站序与到发分钟均吻合官方页面。

迁移：`supabase/migrations/20261107151000_jrwest_kosei_2611_4848m_official_source_clock.sql`

- 在原有 `published_jrwest_kosei_2611_verified_source_clocks` 中新增两条对应日期的校验指纹，不重复写入 `manual_timetable_template_stops`。
- 原始 `source_train_number` 保留 `H` 的假日导入标记；官方 `published_train_number` 统一为 `4848M`，用源号/日历作为数据库匹配依据。
- 官方上游经近江塩津存在 `143M→4848M` 的同车改号，但既有湖西線来源只记录永原以后，**没有凭改号推导未收录的时刻或列车位置**。
- 车型和 PNG 均仍为未知具体编组，`actual_vehicle_confirmed=false`、`authorizes_png=false`。

线上数据库已执行迁移并经指纹重算确认：**湖西線 54/54 条匹配（平日 27，土休日 27）**；京阪神走廊沿用上一批 **45/45**。Edge `train-runs` 已部署为 **v340**，只在全站证据吻合且在 2026-11 窗口内才能升级来源有效性。之前各阶段“4848M 待核验”的记载是当时的审计状态，本节为**更新后的最新状态**。

总体缺口仍包括：湖西線其余新快速、全部上／下行及サンダーバード特急核验，京阪神跨线连续服务更多上下行站时和车辆精确 PNG。不能以局部指纹数表示全线运营覆盖率。


## 2026-11-07 第九批：湖西線早班短区间与跨午夜来源 + 正式改号分段

### 69条原始站时证据与接口

迁移 `supabase/migrations/20261107152000_jrwest_kosei_2611_early_local_and_overnight_clocks.sql` 复用现有湖西線 `manual_timetable_templates` / `published_jrwest_kosei_2611_verified_source_clocks`，**新增15条逐站核验的原来源**（平日+8、土休日+7），累计 **69/69**、平日35、土休日34、全数 `verified_source_match=true`。原来 54 条未改变。

| 公众番号 | 已核验范围 | 本批来源日历数 | 官方 2026-11 证据 |
| --- | --- | ---: | --- |
| `2800M` | 京都→近江舞子、13站 | 2（每天） | [官方](https://timetable.jr-odekake.net/train-timetable/27321?date=20261024) |
| `2802M` | 京都→近江舞子、13站 | 1（仅平日） | [官方](https://timetable.jr-odekake.net/train-timetable/27351?date=20261105) |
| `2804M` | 京都→近江舞子、13站 | 2（分日历） | [平日](https://timetable.jr-odekake.net/train-timetable/27361?date=20261105)／[假日](https://timetable.jr-odekake.net/train-timetable/27371?date=20261024) |
| `2806M` | 京都→近江舞子、13站 | 2（分日历） | [平日](https://timetable.jr-odekake.net/train-timetable/70641?date=20261016)／[假日](https://timetable.jr-odekake.net/train-timetable/70691?date=20261107) |
| `2808M` | 京都→堅田、7站 | 2（分日历） | [平日](https://timetable.jr-odekake.net/train-timetable/70701?date=20261030)／[假日](https://timetable.jr-odekake.net/train-timetable/70711?date=20261024) |
| `2812M` | 京都→近江舞子、13站 | 2（分日历） | [平日](https://timetable.jr-odekake.net/train-timetable/27431?date=20261105)／[假日](https://timetable.jr-odekake.net/train-timetable/27441?date=20261101) |
| `1838M` | 京都→近江今津、18站 | 2（每天） | [官方](https://timetable.jr-odekake.net/train-timetable/140231?date=20261104) |
| `1840M` | 京都→近江今津、18站 | 2（每天） | [官方](https://timetable.jr-odekake.net/train-timetable/91391?date=20261023) |

`1838M/1840M` 于晚间出发、翌日零点后抵达；不切换出发运营日。`2802M` 没有土休日已核验源，不会制造虚构的假日条目。导入的假日 `MH` **仅是源日历标记**，与公众列车番号 `M` 区分。新增的 7/13/18 站要求所有来源时刻和站序的哈希与官方人工校验时一致，且维持不授权 PNG。

Edge Function `train-runs` 已发布为 **v341**，选中日历分别要求 35/34 条来源证据，站数允许 4/5/7/13/18/21/22，仍不写入第二份时刻表，也未修改用户界面或车辆图标。

### 近江今津新快速改号：7条只用于番号证据

迁移 `supabase/migrations/20261107153000_jrwest_kosei_2611_omiimazu_through_number_boundaries.sql` 向已有 `published_jrwest_2611_crossline_number_reference` 增加 **7条分段番号**，累计 **15条**（weekday 4／saturday_holiday 8／daily 3）：

- 平日 `3143M → 3443M`：近江今津改号，前段经近江塩津，后段经湖西線／京都・神戸線至姫路。证据：[JR 2026-11 时刻页面](https://timetable.jr-odekake.net/train-timetable/145061?date=20261006)。
- 土休日 `3145M → 3445M`：同站改号，后段经京都至大阪。证据：[JR 2026-11 时刻页面](https://timetable.jr-odekake.net/train-timetable/145291?date=20261024)。

**重要数据库边界：** 现有 `3107M`、`3143M`、`3145MH` 这类历史来源把不同正式番号的两段站时存到同一来源模板。原来源不能直接当作全程同一个公众番号的连续位置轨迹。新增证据的 `stop_clocks_verified=false`、`authorizes_position=false`、`actual_vehicle_confirmed=false`、`authorizes_png=false` 都保持硬约束；只有真正把区段按改号边界核验、分段数据规范化后，才能考虑位置证据升级。

### 待办及发布范围

- 湖西線 2800系早班以外大量 28xxM 和新快速／普通上下行仍需继续逐站核验；`サンダーバード` 目前仅有先前局部列车番号引用，没有补全特急所有运行日。
- 列车型号/车辆号段/实车编组的确认与一般时刻表分开，不凭 `M/C/T` 或运营类别指定单一 PNG。
- 这次改动只涉及原 SQL、原 Edge 与测试，不新增首页层级和脚本依赖。**69/69 指当前完成认证的样本数，不是“全线69车次”或百分之百覆盖。**


## 2026-11-07 第十批：湖西線中午前 14 条原时刻 + 通用站数证明

### 追加 2810M～2826M

`supabase/migrations/20261107154000_jrwest_kosei_2611_midmorning_14_clock_sources.sql` 复用湖西線既有证据表和单一原来源 owner，增加 **14 条** 2026 年 11 月号逐站相符的原始来源，累计 **83/83** 条 verified_source_match=true；平日 **42**、土休日 **41**。新认证来源如下：

| 公众番号 | 日历 | 已核验来源区间 | 官方分日历证据 |
| --- | --- | --- | --- |
| `2810M` | 平日／土休日 | 京都～近江舞子（各13站） | [平日](https://timetable.jr-odekake.net/train-timetable/27411?date=20261023)、[土休日](https://timetable.jr-odekake.net/train-timetable/27421?date=20261101) |
| `2814M` | 平日／土休日 | 京都～近江舞子（各13站） | [平日](https://timetable.jr-odekake.net/train-timetable/121111?date=20261106)、[土休日](https://timetable.jr-odekake.net/train-timetable/121121?date=20261024) |
| `2818M` | 每日来源（2条） | 京都～近江舞子（各13站） | [官方](https://timetable.jr-odekake.net/train-timetable/27451?date=20261106) |
| `2820M` | 每日来源（2条） | 京都～近江舞子（各13站） | [官方](https://timetable.jr-odekake.net/train-timetable/209401?date=20261101) |
| `2822M` | 每日来源（2条） | 京都～近江舞子（各13站） | [官方](https://timetable.jr-odekake.net/train-timetable/189021?date=20261023) |
| `2824M` | 每日来源（2条） | 京都～堅田（各7站） | [官方](https://timetable.jr-odekake.net/train-timetable/189031?date=20261024) |
| `2826M` | 每日来源（2条） | 京都～近江舞子（各13站） | [官方](https://timetable.jr-odekake.net/train-timetable/121131?date=20261031) |

**不能合并差异日历：** `2810M` 与 `2814M` 平日、土休日虽然使用同一个公开车号，但发站及中间到发分钟不同；所以历史源各自保留独立指纹。公开 `M`、旧源 `MH` 的区别仅为日历导入字段。

### 清理早期固定 18 站的元数据

审计进一步发现证据表原字段 `source_clock_verification` 固定为 `original_18_stops_compared_with_official`，而原来 4/5/21/22 站就已经不满足字面含义；追加 7/13 站后更容易误导排查。为避免未来一开始诊断问题就打补丁，执行迁移
`supabase/migrations/20261107155000_jrwest_kosei_generic_source_stop_proof_cleanup.sql`：

- 统一表内 83 条记录并更改默认值为 `original_source_stops_compared_with_official`；去除固定 `stop_count=18` 的列默认值，今后所有入库必须显式指定站数。
- 延续原 `security_invoker=true` 证据视图，不新建数据 owner；强化 Kosei 线路、类型、来源路径、导入序号及原时刻 MD5 检查，**末尾追加 `stop_count`** 供数据接口调用。
- `train-runs` 服务在站序、日历、来源指纹以外，还强制 `Number(p.stop_count)===run.stops.length`，杜绝拿 7 站的认证套在 13 或 18 站来源上。
- 线上 SQL 查询：**83/83** 行均匹配原来源，83/83 行拥有新的通用验证标记，83/83 行原站数和视图站数一致；Edge Function 已部署至 **v343**，仍无任何车辆号段、PNG、用户 UI 变化或新增网络依赖。

### 更新后总状态

- 湖西線：**83/83 已核验来源**，平日42、土休日41。
- JR京都線／JR神戸線走廊：沿用上一批 **45/45 已核验来源**，并非完整班次。
- JR西日本跨线号码：**15 条参考分段**，包含 2026-11 的 `3143M→3443M` 和 `3145M→3445M`；只确认区段公众番号，不授权列车位置。
- 仍未处理：大量其余 `28xxM`、湖西線新快速改号后跨两段真实运行的逐站 source 规范化、サンダーバード其它车次及车辆编组确认证据。
