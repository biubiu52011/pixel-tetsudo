# 列车号段与 PNG 映射统一审计（2026-11-16，第四次整理）

## 已统一的索引与来源

- `data/audits/train-number-png-catalog-2611.json` 从既有前端 JS 和 Supabase 2026-11-16 只读快照派生，不参与运行时决策，不是第三份真值表。
- 当前 SQL 仍为 **291** 条、24 条线路；前端 JS 为 **108** 条（136 个线路关联，58 条线路）；并集覆盖 **76** 个线路键。
- SQL 号段现同时保留原始 `source_url`，前端保留日历、方向、完整号/尾两位、外部车次索引等约束。CI 禁止丢失 SQL 证据出处。
- 所有 SQL 条目 `requires_exact_roster=true`，任何号段均不得作为实体编组认定依据。`actual_vehicle_confirmed` 必须为 false。

## 已补登记、但仍禁止自动确认为已审核资产

4 个数据库原缺失图片现登记到 `public.vehicle_image_assets`，覆盖原先 **5** 条 SQL 规则引用：
1. 富士急 6000 系标准色；
2. 富士急 8000 系「フジサン特急」脸 A（被两条号段引用）；
3. JR 东日本 E127 系 100 番台长野色；
4. JR 东日本 HB-E300 系「リゾートビューふるさと」。

它们均是 `asset_status=review`、`asset_scope=review`、`appearance_class=requires_review`，文件格式已由 Actions 校验为有效 PNG，`file_format_status=native_png`；但车辆外观特征与实体身份仍未独立核实。**数据库已登记不等于图片可用、车次已证实或实体车号已证实。** CI 明确要求该状态不能在缺乏独立审核时被意外升级。

## 已澄清重叠

- **3 对新干线同车次/同模型/同图片重叠**：是 `weekday_verified_single_number` 与 `verified_single_service` 的独立证据来源。现有 Edge Function 明确允许此类重复；**保留两份来源**，不误删。
- **大糸线 3 对跨车型的宽区间重叠**：依旧不能单凭数字号段推断车型。2026-11-16 通过数据库实查 `published_oito_east_2611_number_roster`：共 **141** 条日历/方向车次记录、**73** 个不同车次号，`(train_number,calendar_urn,direction_urn)` 下没有多车型冲突，实体编组确认数为 **0**。应先以精确车次+日历+方向查实际表，要求车型和图片同时匹配；不存在的车次一律不匹配。
- 生成目录将重叠分类为 `same_artwork_separate_source_evidence` 与 `cross_model_candidate_bands_require_exact_roster`，统一 `may_select_by_band_alone=false`。
- **14** 条 SQL 车型标签与资产标签文字不完全相同，多为车型子系列、主题或运行地区表述。没有证据证明它们是错误车型，因此既不覆盖原字段，也不自动创建可用于精确车辆认定的别名。

## 仍需证据核实

- **17** 条 JS 号段缺少同条目内明确车次列表、官方逐月日历名单或外部车次索引，依靠范围与额外运行时条件；本次集中列入 `review.frontend_guard_only_rules`，需按官方时刻表逐条决定是否可以细化。不能用宽号段凭空生成时刻表记录。
- 上述 4 张图片的 PNG 文件签名已验证；仍需独立核实车辆外观、脸型、涂装及适用列车和日期。只有通过审核，才可从 `review` 改为 `available`；任何状态变化均需同步日期快照与 CI 基线。

## 再生和验证

```bash
node tools/build-train-number-png-catalog.cjs --write
node tools/build-train-number-png-catalog.cjs --check --strict
node --test tests/train-number-png-catalog.test.cjs
node tools/railway-metadata-audit.cjs --strict
node --test tests/train-number-png-runtime.test.cjs
```

数据库源记录发生变化，应先刷新 `data/audits/supabase-railway-audit-snapshot-20261116.json` 对应字段，才再生目录；CI 不直接连接生产数据库或读取密钥。

## 2026-11-16 第三次校对：宽范围收紧与误报消除

- 文件格式已由 GitHub Actions [43763974618](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/43763974618) 检验：4 张待审文件的 PNG 签名、IHDR、非零尺寸及 IEND 均通过；SQL 的 `file_format_status=native_png`，但 `asset_status=review` 与 `appearance_class=requires_review` **保持不变**。二进制格式合格不证明车辆涂装或日常编组。
- 原报告 20 条前端“仅宽范围”含 3 条误分类：`js-0059`（中央快速）及 `js-0101`（鹤见线三线）有正式的 2026-11 平日/休日完整名单；`js-0100` 为 1252M 单点且要求兼容车辆计划。故真正的纯宽范围候选为 **17** 条，不是 20。均仍属于代表图，不代表实体车。
- 修复已存在的**跨月名单绕过漏洞**：`row.officialMonthNumbers` 现在要求运行日严格属于对应官方月份；日期为空或跨月时，不能退回整段号段取 PNG。CI 对中央快速与鹤见线执行当月成功、过期拒绝及无日期拒绝测试。
- 14 条 SQL 车型名称差异按 “系列名 vs 番台/服务名”、“资产标签更加具体”、“形/系文字写法”、“多番台共用代表图” 分类。新目录的 `safe_alias_authorized=false` 明确禁止通过名称修饰自动创建精确车型别名；名称差异不代表实质车辆冲突已解决。

## 第四次校对：前端与 SQL 车次 PNG 一致性

- 两侧共有 **6 条**具有 SQL/JS 号段来源的线路：Fujikyu、Kashima、Kitakami、Kururi、Oga、RikutoEast。
- 只对 **JS 明确列出的公开列车番号**执行相同线路、相同号码与后缀、SQL 区间内的 PNG 比较，当前 **180 对一致，0 对图片冲突**。这些记录在 `review.cross_source_number_png.verified_same_png` 中逐项可追溯；CI 对新增冲突直接失败。
- Kashima 的 JS 规则没有同条目的明确公开列车号名单，当前 1 条记录保持 `unverified_js_rules`，不能由宽范围推出“两侧完全一致”的结论。
- 此项核对只是静态来源间的 PNG 指向一致性；运营日、方向、列车种别及实体编组仍由既有各条线路的运行时核验约束，**不授予实际车辆身份**。

## 第五次校对：保留完整运行时附加约束

- 原先统一目录会列出号段、车种、日历等主要条件，但没有导出所有原生 JS 条目的附加约束。现将其以 `runtime_guards` 原样保存，**不新增或替换运行时映射权威**。
- 108 条前端规则中，**100** 条含至少一个额外来源字段，共 **17** 种原字段键：包括 `allowedModelLabels`、`excludeTrainType`、`sourceOperatorFallback`、`trainTypesIfPresent`、`requireExplicitModelEvidence` 等。CI 检查这些字段与原始负责脚本逐项一致，不能被整理过程遗漏。
- 鹿岛线 JS 通用区间虽然缺少同条目的明确列车号数组，但实际运行时另有 `verifyKashimaService`，专门依赖 SQL 签发的车次、日历、方向、沿途六站及车型证据。跨源比较中的 1 条 `unverified_js_rules` 指**无法直接比较两份静态号码表**，不是称鹿岛线缺少 SQL 精确核验。


## 第六次校对：中央本线／中央快速 E353 宽号段改为官方逐号名单

- 既有 `js-0105`—`js-0108` 四条 E353 限定特急规则已从纯连续区间升级为 **2026-11 官方平日／土休日明确列车番号集合**，直接取既有 `jreast-chuo-main-2611-number-index.js` 官方上下行列（不是新增事实表）。
- 分别对应 1–60M、2101–2199M、3101–3199M、5001–5099M，**59 个不重复的官方号码**（每种日历各 58 个）。保留 `LimitedExpress` 类型检查，新增上下行奇偶校验及 2026-11-01 至 11-30 日期限制。
- 这些号码只证明出现在官方时刻表相应日历，不证明每个日期实际开行、不证明具体车辆或涂装。没有列出的号（例如 2M、2101M、3101M、5001M）、月份外、无日期、方向相反都不再用宽范围返回 E353 PNG。
- 派生目录仍由原脚本生成，全部规则计数 399 不变；需要继续核实的宽范围由 **17 减至 13 条**。本次没有新增候选车辆逻辑或重复数据库表。

官方数据来源：`data/timetables/jreast-chuo-main-2611-number-index.js` 所标注 JR 东日本 2611 中央本線上下行平日／土休日时刻表。


## 第七次校对：常磐线 E657 66 个常规番号及 2 个临时番号

- 复用 `js-0098`／`js-0099` 的原有 E657 图库授权，按 JR 东日本 2611 常磐线平日／土休日官方时刻表，对 `1M–30M`（ひたち 30 个）与 `51M–86M`（ときわ 36 个）导出明确车次名单。与原始 SQL `Joban`、`JobanMain` 各 **66 个不重复特急番号／平日66／休日66** 相互校对。新增方向奇偶检查。完整列车番号始终不转换成运用号。
- 2026-11-25（平日）官方标记 `86M` 运休、`9086M` 替代运行：同一规则负责人使用 `excludedServiceDatesByNumber` 禁止 86M 当天出图，并为 9086M 添加 **仅当天** 的编号规则。
- 2026-11-15（土休日）官方列出临时 `9037M`（ひたちシーサイドマラソン37号），添加仅当天编号规则。
- 2 条常规宽号段升级为已列号；增加 2 条只有明确号码、日期、方向、类型和来源可用的临时规则。前端合计 **110** 条，SQL 原 **291** 条不动；待逐号核实宽号段从 **13 降至 11**。
- 代表 E657 系 PNG **不能证明**当日实体编组、特定车组或纪念涂装。既有图库隔离和同线路／同来源约束均保留，不依赖候选图片池。

来源：JR 东日本 2026-11 官方 `https://timetables.jreast.co.jp/2611/timetable-v/240u1p.html`、`240d1p.html`、`240u2p.html`、`240d2p.html`；原有 Supabase `manual_timetable_templates` 的常磐特急号段枚举用于交叉确认，不升级其未知来源月份的实际运行日可信度。


## 第八次校对：青梅／五日市 2611 官方号码与分线路来源交集

- JR 东日本 652 四张官网时刻表中，排除 9xxx 临时号、超范围号后，工作日合并 **379** 个普通 T/H／无后缀号码、土休日合并 **354** 个。这些是两线路的合并列，并非每个车次同时属于两线路。
- 既有 SQL `manual_timetable_templates` 的 `Ome`／`Itsukaichi` 历史线路、日历番号来源只用作**分线交叉证据**；与官方 2611 列表取交集才可进入前端 PNG 名单。历史 SQL 不被提升为 2026-11 的实际运行日或实体编组证明。
- `js-0079` 的 T/H 源证据仅属于 `Ome`：平日 **153**、土休日 **134**；从 `Itsukaichi` 移除这条宽号段继承关系。
- `js-0080` 的无后缀号码按 `Ome`／`Itsukaichi` 分开保存官方月度名单，与源 URN、运营商、上下行奇偶配合准入。丢弃任意连续号段推断。
- 索引为独立审计结果；不能表示车辆编组、绿车编成、区间实际停站或每天开行。特殊 9xxx 与跨月一律不由这些规则出图。
- 前端规则总数 **110** 不变；待核验宽号段从 **11 减为 9**。

官方网页：
https://timetables.jreast.co.jp/2611/timetable-v/652u1.html
https://timetables.jreast.co.jp/2611/timetable-v/652u2.html
https://timetables.jreast.co.jp/2611/timetable-v/652d1.html
https://timetables.jreast.co.jp/2611/timetable-v/652d2.html

分线交集校验（旧 SQL 不在官方列上的列车番号保持未确认）：
```text
Itsukaichi.holiday: {"source":92,"retained":89,"unmatched":["6643","6849","6949"]}
Itsukaichi.weekday: {"source":104,"retained":102,"unmatched":["6044","6342"]}
Ome.holiday: {"source":298,"retained":291,"unmatched":["7047","7540","7640","7646","7741","7847","7941"]}
Ome.weekday: {"source":332,"retained":331,"unmatched":["6044"]}
corridor.weekday: {"official":379,"matched":379,"unresolved":[]}
corridor.holiday: {"official":354,"matched":354,"unresolved":[]}
```


## 第九次校对：东西线 S、临海线 8x 的混合车型 PNG

- 东京 Metro 官方现役车型将东西线列为 **05、07、15000 系**，所以 `S` 列车番号尾缀不能自动确定唯一的 15000 PNG。原 `js-0091` 现在只在上游明确确认 07／15000 车型且证据不冲突时选对应已授权 PNG；05 系尚无独立核准的具体图库映射，继续保持未解明。
- 东京临海高速铁道 71-000 形自 2025-10 投入运行、将逐步替换 70-000。原 `js-0058` 的 80–91 K/F/S 号段同样不能据尾号认定为 70-000，现必须由上游明确车型标识选择 70／71 PNG，限定 2611 月度且冲突时返回 null。
- 两条仍属于不具官方完整逐号名单的范围规则；`frontend_guard_only_rules` **维持 9 条**。唯一 PNG 来自准确车型证据，并非候选图片池或虚构编组。

官方参考：
https://www.tokyometro.jp/corporate/enterprise/passenger_rail/cars/working/index.html
https://www.twr.co.jp/Default.aspx?TabId=382


## 第八次校对：东京 Metro／都营地下铁源番号 PNG（2026-11-16）

- 复用现有 JavaScript 号段负责人，新增 **13** 条完整车次号白名单规则：银座 1000、丸之内本线 2000、丸之内支线 2000（需车型证据）、千代田 16000、千代田支线 16000／05（需车型证据）、南北 9000、有乐町与副都心 17000／10000（需车型证据）、都营三田 6300／6500（需车型证据）。同时增加 A/B 前缀 3～5 位号码及字母后缀解析，保留旧东西线、日比谷、半藏门的专门负责人。
- 数据从当前 `public.manual_timetable_templates` 按平日／休日去重，保留完整番号 A/B + 数字 + 运营公司字母。**不进行运用编号转换**；min/max 只是快速过滤，必须满足精确号名单、线路、源铁路、服务日历及所需车型证据，才返回参考图。
- SQL `source_revision_date` 仍未核实，不能宣称名单已得到 2026-11 官方逐日验证。2026-11-01～30 只是保守展示授权窗口；**PNG 不是实际运营编组证据**。
- 既有都营浅草／新宿／大江户线没有精确导入列车番号来源，故不杜撰号段，不把跨公司车辆一律映射成一个车型。三田线 K/G 他社车保持未解析。没有新增数据库表或车号候选池。
- JS 110→123，线路键 76→85，SQL 仍 291，新增 SQL/JS 图片冲突 0，纯宽段待核 9。

| Line key | 平日完整番号 | 休日完整番号 |
| --- | ---: | ---: |
| Ginza | 728 | 618 |
| Marunouchi | 686 | 503 |
| MarunouchiBranch | 366 | 292 |
| Chiyoda | 294 | 223 |
| ChiyodaBranch | 36 | 37 |
| Namboku | 201 | 195 |
| Yurakucho | 282 | 261 |
| Fukutoshin | 150 | 170 |
| Mita | 319 | 278 |

官方车型索引：<https://www.tokyometro.jp/corporate/enterprise/passenger_rail/cars/working/index.html>；<https://www.kotsu.metro.tokyo.jp/about/koukai/vehicle_outline/model_diagram/>。车次来源仅为既有导入 SQL，修订日期尚待证实。


## 第九次校对：都营浅草／新宿／大江户线号段（2026-11-16）

- 首先检查现有 `data/timetables/train-number-png-ranges.js`、`vehicle-garage-png-map.js` 和 SQL。正式 `manual_timetable_templates` 三线目前是 **0**；唯一可用的逐号完整来源是隔离表 `gtfs_stage.trips`，源文件 `https://mkuran.pl/gtfs/tokyo/rail.zip`，SHA-256 `bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f`，本次**不变更数据库或计划时刻表**。
- 根据隔离 SQL 原样保留**完整公开列车番号**（不变成运用号），使用 `Weekday`／`SaturdayHoliday` 精确白名单。特别保留浅草 `1008Ta`／`1008Tb`，将输入统一大写后仅比较同一完整番号，不折叠尾部 a/b。
- **7 条新 PNG 规则**：浅草线 T 号→都营 5500 形代表 PNG；新宿线 T 号→10-300 形 1・2 次车／3 次车以后 PNG（仅有明确车型证据时出图）；大江户线 A/B 号→12-000 形（4 次车）／12-600 形（1 次车／前期车／后期车）（均须明确车型）。
- 由于 TokyoGTFS 为**非官方来源、隔离区 C 级资料**，必须在原始号码白名单之外再满足：`positionSource=realtime-api`、`trainOwner=Toei`、`estimated=false`、原始 ODPT 来源为 `odpt.Railway:Toei.<line>`、本线路日历及日期。未经证实的 SQL 计划推算、他社车或错误车型**不能激活 PNG**。
- **有效期**：2026-11-02 起。都营浅草线官方将于 **2026-11-21 改点**，旧号段最高只开放至 11 月 20 日，之后保持未解析，必须重新核对新数据；新宿／大江户暂限 11 月 30 日（仅表示静态展示窗口，不证明每日开行）。2026-11-01 不在 TokyoGTFS 声称日历覆盖范围，不硬补车次。
- **ODPT 官方大江户线番号**会省略末尾的 1／2（例如 1001A1 → 1001A），不能把未省略的号码自动生成或伪装成相同列车；本次只按来源确实存在的 1001A 等编号匹配。
- 号段只绑定**代表图片**；`actual_vehicle_confirmed=false`，不证明当天车组及特定外观版次。其它公司浅草 H/K/N 或新宿 K 留待各自可信车型映射，不错误绘制都营车。
- 静态规则 123→130，索引线路键 85→88；数据库原 291 条 SQL 不动，不新增重叠号段冲突。CI 增加来源、运营方、日历、车型、改点边界和 A/B 后缀测试。

| Line key | 平日精确可列车号 | 土休日精确可列车号 |
| --- | ---: | ---: |
| Asakusa | 199 | 202 |
| Oedo | 452 | 387 |
| Shinjuku | 235 | 183 |

资料：原仓库 `docs/tokyo-gtfs-import-20261112.md`、官方 ODPT 数据目录 <https://ckan.odpt.org/dataset/r_train_timetable-toei>（大江户线编号规范）、都营浅草线 2026 年 11 月 21 日改点告知 <https://www.kotsu.metro.tokyo.jp/pickup_information/news/subway/2026/sub_p_2026102012843_h.html>、车型 <https://www.jametro.or.jp/subway/japan/tokyo/guide.html>。


## 第十次校对：埼京／临海线尾号跨线路误配防护

- 保留 JS `js-0056`、`js-0057`、`js-0058` 现有 K/F/S 尾号规则；不把 00–71、72–79、80–91 变成“已经逐号证实的车次名册”或实际车辆身份。
- 在统一号码映射负责人中增加 **仅在已提供来源时生效**的铁路 URN 约束（JR East SaikyoKawagoe／TWR Rinkai）、Local／Rapid／CommuterRapid 类型排除条件。上游来源为常磐、中央线或特急时不再继承埼京／临海 PNG。
- 为 E233-7000 和相铁 12000 参考图添加与源车型观测及已确认单车型计划的冲突检查；当上游明确报告其他车型时，不再只凭两位尾号绘制旧 PNG。70-000／71-000 仍维持独立确定车型才选择一张图的严格模式。
- 原始规则 **130 条不变**；仍有 **9 条**缺少完整 2026-11 官方番号名单。附加来源防护覆盖的前端规则数量由 123 增至 125；不改变 SQL 规则及资产审核状态。


## 第十次运行链路与 ODPT 所属方格式审计（2026-11-16）

- 复核负责链路 `js/data-fusion.js`：实时对象原样保留 `odpt:trainNumber`、`odpt:railway`、`odpt:trainOwner`，且标记 `positionSource=realtime-api`；`js/trains-render.js` 的地图标记调用统一 `TrainVehicle.selectMarkerArtwork`。无须新增覆盖数据源的转换脚本。
- 修复既有 `requireRealtimeToeiOwner` 归一化遗漏：除 `Toei`、`odpt.Operator:Toei` 外，现在也承认 ODPT 所属方命名空间 `odpt.TrainOwner:Toei`。运营路线 `operator=Toei` 仍然**不能替代**实时车辆所有权证据，也不改变原始号码。
- 新增端到端测试：全部七条新车型规则的完整实时位置 → `lookupTrainNumberRangePng` → `VehicleGaragePngMap` → SVG marker 的代表图必须唯一且未确认实车；空/他社 owner 均禁止。
- **仍待核验的跨来源问题**：某些公开的都营 ODPT 位置数据使用四位裸数字号码，而 TokyoGTFS 列车时刻表含 T/A/B 等字母；已有的第三方说明见 <https://nkth.info/traffic_info/toei/?line=a>，其记载可能针对旧版，**不应直接视为 2026 年现状**。没有实测快照和官方逐号对照前，绝不通过附加字母、截断或运用号推断来拼接二者。裸数字号码保持未解析。ODPT 官方时刻表还规定大江户线省略末尾 1/2：<https://ckan.odpt.org/dataset/r_train_timetable-toei>。
- 浅草线 2026-11-21 改点确认：<https://www.kotsu.metro.tokyo.jp/pickup_information/news/subway/2026/sub_p_2026102012843_h.html>，当天以后旧 C 级号段保持禁用，直到替换为经审核的新时刻表。
