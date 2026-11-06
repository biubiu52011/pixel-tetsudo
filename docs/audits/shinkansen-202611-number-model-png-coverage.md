# 新干线 2026-11 列车番号 → 计划车型 → PNG 分级覆盖审计

**最新回读日期**：2026-11-07（823/826正式番号、533/826唯一计划车型；196条精确PNG规则对应193个不同线路-番号；26份模板有11月7日明确运行日白名单；Edge v327 ACTIVE但最新main源码另有并行改动，尚未重新一致性验收）  
**范围**：Supabase `pnupwfmgbtxqhpzsrhfn` 中现有 10 条 `%Shinkansen` 线路的 `manual_timetable_templates`；`2611` 为 JR 东日本 2026 年 11 月出版版本。  
**规范**：[Notion《全线路列车番号→车型→PNG 覆盖率审计》](https://app.notion.com/p/PNG-40ed1daae25681a4ad4eca747b1586b6?source=copy_link)。




## 2026-11-07 上越新干线：全日车次与原始停站修复

继上述Nozomi修复后，对照 [JR东日本2611下行平日官方表](https://timetables.jreast.co.jp/2611/timetable-v/004d1p.html) 及 [同线路土休日官方表](https://timetables.jreast.co.jp/2611/timetable-v/004d2p.html)，确认 **333C とき333**、**405C たにがわ405** 均明确为「全日」；原始Weekday标签只是历史导入所属日历，不足以排除周末。注意**不能把其它Weekday旧源批量认定全日**：例如官方401C还列出了11月特定周六停运日。

- **とき333**（源模板575，正式番号333C，既有官方A等级E7计划车型）：[JR东日本列车详情](https://timetables.jreast.co.jp/2611/train/085/087511.html) 显示东京17:08、新潟18:57；上野从17:14/17:15修为17:13/17:14，大宫从17:33/17:34修为17:32/17:33，并补上漏记的高崎17:57到／17:58发。停站5→6。
- **たにがわ405**（源模板586，正式番号405C，既有官方A等级E7计划车型）：[JR东日本列车详情](https://timetables.jreast.co.jp/2611/train/020/021931.html) 显示东京17:12、越后汤泽18:36；上野从17:18/17:19修为17:17/17:18，大宫从17:37/17:38修为17:36/17:37，并补上熊谷17:49到／17:49发、本庄早稻田17:58到／17:59发。停站6→8。

仅修改已有 manual_timetable_templates 和 manual_timetable_template_stops 两张责任表并在原 evidence_sources 记录官方来源。写入前检查原source_only身份、精确番号、既有官方计划车型未变、未曾拥有其它日期白名单；新增站名均已在 line_stations 既有 JoetsuShinkansen 名册中核实。对原stop_sequence及旧到发时刻逐条设防，原表内部移动位置后插入3个有官方时刻的站，无任何插值猜测。

SQL回读：模板575目前6站/30天、586目前8站/30天；3个新增站URN和时刻均匹配原始证据；原有333C/405C E7 PNG仍在图库为available/native_png，未新增任何映射或图片。2026-11-07显式来源覆盖**26份**（先前24+2），正式番号仍823/826，官方唯一计划车型533/826，PNG 196条规则/193个不同线路+号码均未改变。

仍未完成：需要独立验证线上train-runs的这2趟实际JSON以及地图/Safari展示。本轮未重新部署线上Edge，旧代码与main并行差异不能靠回滚或用过时代码覆盖解决。

## 2026-11-07 续查：追加七趟跨东海道・山阳 N700S 每日运行列车

已在现有数据库直接补入7趟新干线（**1A、4A、14A、23A、27A、28A、31A**），每趟东海道与山阳2份，共14份独立来源模板：2611官方完整番号、11月1日至30日精确日期白名单、官方A等级 N700S单一计划车型。保留 source-only 分段身份，不虚构跨JR公司的实际编组号、运行号或物理直通ID。此前的 7A、11A、13A、15A 依旧有效。

| 正式番号 | 东海道源ID | 山阳源ID | 新大阪官方到达/发车 | 官方原始列车详情 |
|---|---:|---:|---|---|
| 1A | 9191 | 9328 | 08:22 / 08:24 | [JR西日本 2026-11-01](https://timetable.jr-odekake.net/train-timetable/18511?date=20261101) |
| 4A | 9225 | 9375 | 09:04 / 09:06 | [JR九州 2026-11-01](https://www.jrkyushu-timetable.jp/sp/2611/0006/00064901.html?d=20261101&t=2815505) |
| 14A | 9204 | 9377 | 11:04 / 11:06 | [JR九州 2026-11-02](https://www.jrkyushu-timetable.jp/sp/2611/0000/00005601.html?d=20261102&t=2815505) |
| 23A | 9156 | 9300 | 12:39 / 12:41 | [JR九州 2026-11-04](https://www.jrkyushu-timetable.jp/sp/2611/0001/00011201.html?d=20261104&t=2815506) |
| 27A | 9160 | 9302 | 13:39 / 13:41 | [JR九州 2026-11-07](https://www.jrkyushu-timetable.jp/sp/2611/0006/00064301.html?d=20261107&t=2815506) |
| 28A | 9209 | 9344 | 14:43 / 14:45 | [JR九州 2026-11-05](https://www.jrkyushu-timetable.jp/sp/2611/0006/00065401.html?d=20261105&t=2815505) |
| 31A | 9164 | 9306 | 14:39 / 14:41 | [JR九州 2026-11-07](https://www.jrkyushu-timetable.jp/sp/2611/0005/00054201.html?d=20261107&t=2815506) |

沿用既有日期选择算法（SaturdayHoliday从原模板选出后，只按明确的2026-11官方日期白名单再录入跨日历的单列车来源），**绝不**将其它仅在Weekday出现的过往导入一键变成周末列车。每趟事务强校验：原模板及其旧日历类型、2611正式番号对应关系、原始首末站时刻及跨新大阪接续、先前无车型映射，证据类型official/A后才能修改。新车7趟有**18处**有官方依据的到达时刻修正（首批1/27/28共8处；次批4/14/23/31共10处），包括新大阪到达与发车被错误混淆的问题，以及京都、名古屋、福山到达与发车时刻混淆。

截至该批结束，数据库只读回验结果：**826**份新干线模板、**823**份2611正式番号、**533**份唯一正式计划车型（64.5%，前一轮519+14）、**24**份2026-11-07明确运营日期来源、**3**份旧源禁用。加上上一批4趟，共**11趟/22份模板**有独立官方A等级N700S计划车型证据；验证22/22源均有30日运行日白名单、唯一对应正式番号和车型映射，缺失0份。原生N700S PNG资产仍为0，**不**展示N700作为N700S的替代品。原有精确 PNG 196条规则/193个不同线路+号码未变。

仍未完成：JR East等新干线休日来源严重不全；没有直接访问公网Edge接口的完整JSON、GitHub Pages/iOS Safari可视化证据。2026-11-07检查显示线上 train-runs v327 ACTIVE，但GitHub main的后续跨线修改与运行v327不一致，本轮只修SQL、不覆盖现有Edge部署，也未触碰其它项目的并行代码。新增证据的官方N700S型号仅是计划车辆，不表示当天实际派车。

## 2026-11-07 后续：2611 正式运行日、N700S计划车型及新大阪时刻修复

沿用现有 SQL 责任表（manual_timetable_templates、manual_timetable_template_stops、evidence_sources、train_timetable_vehicle_mappings），没有新增车型/运行时映射层或图片。

| 列车 | 东海道源 ID | 山阳源 ID | 正式番号 | 旧新大阪到达 | 官方到达 / 发车 | 车型 |
|---|---:|---:|---|---|---|---|
| のぞみ7 | 9192 | 9329 | 7A | 09:17 | 09:15 / 09:17 | N700S系 |
| のぞみ11 | 9193 | 9293 | 11A | 10:02 | 10:00 / 10:02 | N700S系 |
| のぞみ13 | 9194 | 9294 | 13A | 10:17 | 10:15 / 10:17 | N700S系 |
| のぞみ15 | 9195 | 9296 | 15A | 10:41 | 10:39 / 10:41 | N700S系 |

独立官方A等级列车来源（均标识正式番号、N700S计划车型、每日运行及东京至博多沿途时刻）：

- [7A JR九州 2611，2026-11-07](https://www.jrkyushu-timetable.jp/sp/2611/0006/00061301.html?d=20261107&t=2815506)
- [11A JR西日本 2611，2026-11-25](https://timetable.jr-odekake.net/train-timetable/3431?date=20261125)
- [13A JR九州 2611，2026-11-04](https://www.jrkyushu-timetable.jp/sp/2611/0000/00001001.html?d=20261104&t=2815506)
- [15A JR九州 2611，2026-11-02](https://www.jrkyushu-timetable.jp/sp/2611/0000/00009301.html?d=20261102&t=2815506)

每趟车的源模板、正式番号、东京首站时刻、新大阪跨社边界发车时刻及博多末站时刻均逐项通过SQL保护条件后才允许写入。8份模板各增补2026-11-01至2026-11-30的精确运行日白名单，共8条官方A等级单车型计划记录；东海道4份模板各将新大阪到达时间由误填的发车时刻订正为官方到达时刻，山阳发车时刻不变。该证据只代表计划N700S型号，不能推断实际编组，也没有N700S原生PNG可显示。

数据库卫生：原有 evidence_sources 自增序列停留在5072，低于既存最大ID5174，先前插入事务因主键冲突自动回滚。按照max(id)与序列当前值中的较大者，将序列校正到5174，然后原子写入以上证据。没有更改其他主键序列。

本轮回读：826份源模板、823份正式番号（99.6%）、519份唯一计划车型（62.8%；较前次+8）、3份旧源隔离；2026-11-07精确日期白名单共有10份来源（本次8份、此前临时2份）。196条精确PNG规则涵盖193个不同线路+番号，未新增N700S错误PNG。

日历覆盖仍不完整：现有数据库在大多数新干线的SaturdayHoliday分类下只有1条样例，且 published_timetable_coverage_audit 明确标记为sparse_review/calendar_review。不能把所有Weekday旧导入自动变为周末列车，必须逐车以官方运行日证据扩展。特别是东北、北海道、北陆、上越、秋田、山形以及东海道、山阳。

验收范围：前端TrainVehicle解析器已在隔离JS运行环境验证E6/E8、JR九州800、JR西日本500等合法PNG显示及错误车型/缺图/跨日期拒绝，尚未取得Node全量回归测试或GitHub Pages/Safari图面验收。现有Edge Function已变为v327 ACTIVE，main中的源文件又有其他工作流并行更新，本轮没有盲目用旧版本覆盖线上；此前v326源码一致性是历史快照，不应当写成当前状态。

## 2026-11-07 已实施：让既有新干线SQL精确PNG白名单进入实际列车展示

本轮按“先看责任脚本和表格”核查，不新建任何运行时平行映射表。发现既有 `published_train_png_number_ranges` 新干线已登记 **196 条2611精确PNG规则**，且官方号码、计划车型与原生素材均有合法来源，但 `train-runs` 只读取该表中部分在来线规则，没有将新干线这196条规则投影给浏览器；静态 `train-number-png-ranges.js` 原本也没有新干线号码清单。结果是SQL已登记PNG并不保证实际页面展示该图。与此同时前端通用的 `resolveTimetableVehiclePlan` 有机会从“已知一个车型”的通用图库取图，不能保证新干线图片一定经过精确号码白名单。

**修复均已直接提交 `main`，没有PR、没有新表/迁移：**

- [现有 `train-runs` 源文件](../../supabase/functions/train-runs/index.ts)（[commit a6e5aa1](https://github.com/biubiu52011/pixel-tetsudo/commit/a6e5aa19b403d6c5018a0c59f5a2b03f92362f5c)）：只在2611新干线、已有验证完整番号的来源上，查询现有 `published_train_png_number_ranges`，必须单号 `min=max`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`，并校验既有 `vehicle_image_assets` 的运营者、车型、`native_png` 状态及路径，最后再与该源 `official_service_vehicle_plan` 官方A/B证据相符，才向既有 `vehicle_artwork_path` 返回参考PNG。重复的同号同车型同图片行允许；若同号存在相互冲突的车型或图片，只对该车关闭图，不中断全线。
- [前端既有车型仲裁器](../../js/train-vehicle.js)（[commit 1b4a104](https://github.com/biubiu52011/pixel-tetsudo/commit/1b4a104916ab46a8717d57d4e8a7e18b2e1dad8f)）：2611新干线SQL计划的参考图只认上游返回且经图库线路/车型范围再次比对的精确PNG；没有号码白名单、只知道家族或官方确认但无素材时，清空图库泛用候选图，保持中性标记。`actualVehicleConfirmed=false`，不影响正式列车号/车型标签/计划位置。
- [既有图库元数据](../../data/timetables/vehicle-garage-png-map.js)（[commit fb271f9](https://github.com/biubiu52011/pixel-tetsudo/commit/fb271f95ac47790f5285566f2c63887c6c09ad3f)）：E6、E8的原生图同时允许用于其已验证的**东北新干线直通区间**，不把它们变成东北全线默认车。与规范车型库 `CANONICAL_VEHICLES` 同步。
- [页面缓存版本](../../pages/trains.html)（[commit 2b578ef](https://github.com/biubiu52011/pixel-tetsudo/commit/2b578ef4f6ed397f19c47284ffe882678191b88d)及[commit 34d50fe](https://github.com/biubiu52011/pixel-tetsudo/commit/34d50feb5a986709f4d08cf32b4c123f6e2ba2e0)）更新现有脚本哈希；[回归测试](../../tests/shinkansen-2611-plan-png.test.cjs)（[初始commit b62a9a1](https://github.com/biubiu52011/pixel-tetsudo/commit/b62a9a106e66363f8ea17b99f0e229b867293c80)、[补充commit e399382](https://github.com/biubiu52011/pixel-tetsudo/commit/e3993825a740cd76028cbb1d1c642aa5361bf1e4)）新增合法PNG、错误PNG、缺图、未确认车型、跨月份、N700S错借N700，以及JR九州800/JR西日本500规范命名场景。

**追加规范命名兼容修复**：[commit c369360](https://github.com/biubiu52011/pixel-tetsudo/commit/c3693609c76ed3c6408dc0bef48302032df1cd06) 修复SQL车型`800系`、`500系`、`700系`与图库`800系（JR九州）`、`500系（JR西日本）`、`700系（JR西日本）`名称格式不同导致的错误拒图。前端仍仅使用由SQL唯一计划车型导出的**规范单车型名**验证既有图库PNG，不按文字模糊匹配，也不增加额外映射表。

**部署与SQL只读回验（2026-11-07）**：现有 Supabase 项目原 `train-runs` 已重新部署为 **v326 / ACTIVE / verify_jwt=false**，使用 `get_edge_function` 与GitHub main `index.ts`逐字比较成功（181016字符）；`pages/trains.html`引用的 `train-vehicle.js` 版本为 `0c8d86cbef42`、`vehicle-garage-png-map.js`为`f2e158c79e65`，与当时Git blob SHA前缀相符。SQL **196条**精确规则涉及**193个不同的线路+正式番号**（秋田3001M、上越、山形各有1个同PNG的重叠证据行），**没有冲突PNG、无无效原生资产**；规则行数不可误写成196趟不同列车。

**仍未完成**：不能因为发布成功而声称已在GitHub Pages/iPhone Safari截图或实际公网GET中逐车看到193趟PNG。测试脚本已入库，但GitHub Actions是否执行、运行结果、Safari真实DOM/图片的端到端验收本节尚未确证。西九州92份N700S计划虽然均有车型证据，现有图库仍**缺JR九州N700S原生PNG**，无理由借JR东海/西日本N700图片；E5/H5、E7/W7继续保留多候选，不凭号次猜图。

## 计划列车验收标准（2026-11-06 用户确认）

**项目目标：新干线属于手工时刻表驱动的计划列车展示，不是实时车辆追踪。** 与其他手工线路统一口径。

- **必需**：官方完整列车番号；对应版本的线路、方向、平日／休日及运行日；计划停站／发到时刻；基于时刻表的计划位置推算；有独立依据的计划车型以及车型、运营者、线路相符的参考 PNG。
- **非必需**：实际车辆编组号、车辆运用号、当天实际派车确认、GPS／实时观测。**“实际编组确认 0 条”不得被计算为新干线计划映射尚未完成的缺口或用来否决已有证据的计划 PNG**；仅保留 `actual_vehicle_confirmed=false` 以避免计划与实车混淆。
- **边界**：计划车型明确时允许显示其车型参考图，不因此宣称当天实际使用该组车辆。存在 E5/H5、E7/W7、N700A/N700S 等多候选且无唯一计划车型证据，或者对应型号 PNG 缺失时，保持候选或中性列车标记，不能按后缀、爱称号次、运营者或连续范围猜图。
- **验收指标**：已核实正式番号覆盖率、计划车型可确定率、准确 PNG 展示率、时刻表推算正确性，以及平日/休日/临时运行日的准确性。SQL/代码测试与 Pages/Safari 实际渲染验收分开标记。修正优先在已有责任 SQL 表、车型库及 train-runs 中完成，不增平行图层或补丁。

> 下文历史小节保留“实际车底 0”的数据仅作证据级别说明；其不是本项目的必需指标或完成门槛。下文各阶段快照并非自动更新的最新总数。

## 2026-11-06 GitHub Pages 北陆深链接实查：网页站序与2611 SQL站点ID失配修复

**用户提供的检验入口**：https://biubiu52011.github.io/pixel-tetsudo/pages/trains.html#HokurikuShinkansen

### 复现级别及根因

直接读取该 GitHub Pages URL 的网页工具返回 Cache miss，连接的Browser读取也因无浏览器扩展上下文不可用，**因此没有直接得到真实网页的DOM、截图、网络控制台或iPhone Safari渲染结果**。但已读取该页面真实引用的仓库文件 `pages/trains.html`、`data/core/db-loader.js`、其在GitHub Pages使用的`data/core/railway_data.compact.json`，与现有Supabase `line_stations`、`manual_timetable_template_stops`和`train_timetable_stops`逐站比对：**网页北陆第12号车站仍是 `Myoko-Kogen`（妙高高原），而SQL此前已改成 `Joetsu-Myoko`（上越妙高）**。静态 `stations`仅有妙高高原真实坐标(36.8721825,138.2117975)，无上越妙高；`stationLines`及`lineStationOrder`也错误关联了妙高高原，车站多语言`station_i18n`更没有上越妙高。因此列车计划停站 URN 无法匹配网页当前线路站序，阻碍位置推算；SQL车次数据覆盖823/826不能代表网页正常。

还发现原SQL北陆 `かがやき501` 源模板ID=128899在福井的到发事件写为`odpt.Station:JR-East.HokurikuShinkansen.Fukui`。网页规范北陆福井站 key 为`Fukui-Echizen`，而不带后缀的`Fukui`在规范数据库中实际是东武伊势崎线的**福居**站（地理位置完全不同），所以不能用全站通用别名“Fukui”掩盖问题。

### 直接更新已有责任源（均 main，无PR）

- 在**唯一规范源** [`data/core/railway_data.json`](../../data/core/railway_data.json) 中，将北陆`lines.HokurikuShinkansen.stations[12]`、`stationLines`和`lineStationOrder.HokurikuShinkansen`统一改为`Joetsu-Myoko`；在规范站点`stations`加入上越妙高坐标 **37.0812454,138.2484185**，`name_map`加入“上越妙高”。真正的妙高高原坐标和日文名称映射**原样保留**；只撤销其虚假的北陆新干线站序角色。
- 在既有 [`data/core/station_i18n.json`](../../data/core/station_i18n.json) 新增上越妙高的 ja/zh/ko/en，保留真实妙高高原和真实福居的名称。
- 使用已有 [`data/core/gen-file-data.js`](../../data/core/gen-file-data.js) 的**相同转换方法**重新生成`railway_data.compact.json`、`railway-data.file.js`、`station_i18n.compact.json`、`station-i18n.file.js`，没有创建新运行时映射脚本。GitHub读取回验：4份生成产物与规范源`JSON.stringify`**完全一致**。
- 在 [`data/core/db-loader.js`](../../data/core/db-loader.js) 更新上述4份引用的12位内容哈希版本；在 [`pages/trains.html`](../../pages/trains.html) 更新`db-loader.js?v=63c4dbebdc1e`，触发`DB_CACHE_VERSION`缓存换代，避免Safari/localStorage沿用旧铁路站序。
- [SQL精确事务](../../supabase/migrations/20261107014000_hokuriku_kagayaki501_fukui_station_identity_for_webmap.sql)：仅修正模板128899`かがやき501`的福井站`arrival_station_urn`及`departure_station_urn`为`Fukui-Echizen`，并验证源表与只读`train_timetable_stops`单站一致，不修改东武伊势崎线真正的福居站。

### 验收

- GitHub`main`新版本规范北陆线路 **24站**，上越妙高 index=12，已拥有站点坐标、多语言名称及`stationLines`关系。
- Supabase SQL：北陆现有源模板涉及的22种实际停车站全部属于北陆24站的现有`line_stations`清单；**缺失匹配0，错误的Myoko-Kogen/Fukui URN为0**；`かがやき501`福井站只读VIEW返回正确`Fukui-Echizen` 1条。
- 规范源及生成资产逐字一致 **4/4**；db-loader中的4个12位缓存哈希与当前4份GitHub blob SHA完全一致；`trains.html`的db-loader 12位缓存哈希与新的blob SHA一致。
- GitHub Actions**“Verify train PNG contracts”**在相关`main`修复提交`3196ecf3`为`completed/success`，**“Deploy static content to Pages”**在同一提交也是`completed/success`。已确认发布工作流成功，但不称为实际用户浏览器视觉验收。
- **没有公网实际页面抓取成功、没有HTTP调用在线`train-runs`终端、没有iPhone Safari截图或DOM确认**，不能据此声称地图所有车次显示、标签或位置均已经端到端验收。

## 2026-11-06 修复完成后的 live 复核（Edge v325，GitHub main 同源）

本轮用户要求“修复”时，先查 **现有负责者**；确认此前已执行 `1992881` schema（现有`manual_timetable_templates.operating_dates date[]`）、`ff0fa98` 业务修复（四条日期限定列车／三条过期源隔离）、`9b2df9a` 与 `819adfc` 运行时跨日历筛选、`aa5b8f2` 精确 E8 原生 PNG。**不重跑已成功的迁移、不新造二层脚本或补丁、不使用 PR**。

Supabase live DB 检查：
- `manual_timetable_templates` 826 份现存新干线模板中，2611 `published_train_number_evidence` 已登记 **823 份（99.6%）**；余 **3 份全部为 `operating_dates='{}'::date[]` 明确隔离的历史源**：北陆`はくたか592/594`、山阳`ひかり782`。**无尚未编号却仍被标记为实际运行的旧源**。
- 已按官方 11 月运营日重建：`725 つばさ177=8177M`（9个运营日／25到发事件）、`728 つばさ88=9088M`（4日／28事件）、`729 つばさ90=9090M`（7日／28事件）、`1968 はくたか595=9595E`（2日／20事件）。四份官方到发事件均 **有时间、源表与只读VIEW同数**，并被标记 `date_verified`。
- 对 2026-11 **全30天逐日**以数据库 `day=ANY(operating_dates)` 核对4条临时车选日白名单：**16个实际有这些临时车的日期**，跨平日／周六／周日／节假日。日期如 **11月7日=8177M+9595E，11月15日=9088M+9090M，11月23日=9088M+9090M**；非运营日未返回这些临时源。所有3份隔离旧源在11月全月未入选。
- `published_train_png_number_ranges` 当前新干线 **196** 个（原193+3 E8系），均 `min_number=max_number`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`；新列车 `8177M/9088M/9090M` 仅挂官方 E8系列计划和既有 `JR東日本_E8系.png`，`9595E` 因 E7/W7未明确，**不挂不确定的PNG**。
- `mcp__Supabase__list_edge_functions` 返回 `train-runs` **version=325、status=ACTIVE、verify_jwt=false**；`get_edge_function` 取回线上`index.ts`，与刚读取的 **GitHub main`supabase/functions/train-runs/index.ts` 完全一致，长度均177876字符**，包含`SHINKANSEN_2611_DATE_WHITELIST_SOURCE_INVALID`正式日期筛选。**已确认部署，不必再部署一次**。

**验收边界：** 此次回归以官方逐车页、SQL完整数据、当前边缘函数的**部署源码逐字相等**、日期筛选SQL为证据。由于当前执行环境无法联网访问该 Supabase 公网域名，**没有实测公网Edge GET响应、GitHub Pages或Safari真机像素渲染**；以上绝不等同公网请求／客户端的端到端验收。也不声称存在实际车辆编组追踪。

## 2026-11-06 已实施：7份历史源精确到运营日，4趟2611临时车全站重建，3趟退出展示

**与此前仅调查不同，本节为已执行的业务变更。** 在此前 **819/826完整番号、511/826唯一计划车型、193/826精确PNG** 基础上，依据现有官方2611逐车页面，修正 **4个有11月实际运营日期的临时班次**，将 **3个找不到11月相符计划的过期来源**从日期列表排除。GitHub直接提交`main`（无PR、无新增表/平行映射器），SQL和Supabase现有`train-runs`边缘函数现已实际部署。

### 根因修复：现有责任源中保留精确运行日

- **不增加表：** 在现有 `manual_timetable_templates` 增加可空 `operating_dates date[]`。`NULL`原有运行日历照旧，非空的`date[]`为官网证实的运行日白名单，空`[]`明确表示过期来源在当前验证范围不提供列车。历史导入`calendar_urn`（三条山形和595都曾标为Weekday）作为原始证据保留，不伪装成准确运营日。
- [DDL](../../supabase/migrations/20261107004000_manual_template_operating_dates_for_2611_shinkansen.sql)：直接升级现有源表；无新表、无月费或本地服务器。
- [7份来源修复事务](../../supabase/migrations/20261107005000_2611_shinkansen_four_dated_official_and_three_historical.sql)：对每份固定源模板做主键、线路、运营者、原日历、方向、原始逐站到发事件、源canonical及成员范围的严格检查，删除并在**相同表**按官方停站重建，更新既有成员末站及已有`train_timetables.timetable_validity`；通过只读 `train_timetable_stops`逐事件比较官方计划后才写入`published_train_number_evidence`。
- [运行时`train-runs`既有代码](../../supabase/functions/train-runs/index.ts)：在读取模板时只对已核实日期白名单合并跨Weekday/SaturdayHoliday来源（2026-11范围），在canonical与停站数据加载**之前**过滤`operating_dates`不匹配的模板；仍对其余无日期证据模板沿用原日历。对于跨日历加入的临时来源，SQL正式番号仍按源`calendar_urn`验证，向客户端输出对应**当前日期实际星期日历**。运行时函数已在原有Supabase项目`train-runs`以**version324、status ACTIVE、verify_jwt=false（保留原设置）**重新部署。首次源码校验发现正则误写`\\d`，已在[单独fix commit](https://github.com/biubiu52011/pixel-tetsudo/commit/819adfc8b9140dea87cf0082e72804c8653b5141)更正为`\d`并**重新部署**。SQL与部署源校验不等于经公网接口回放／Safari真机验收。

### 四份11月有据的正式番号

| 原模板 | 已写入2611番号 | 11月已证实运行日 | 官方逐车与修复 |
|---|---|---|---|
| 725 つばさ177 | **8177M** | **6、7、13、14、20～22、27、28** | [JR东日本8177M](https://timetables.jreast.co.jp/2611/train/020/022661.html) 东京**09:48**→新庄**13:16**；修复旧16个全部误为arrival的事件，重新建立**25条**始发/中停到发记录，包括东京发、福岛11:22发及山形段 |
| 728 つばさ88 | **9088M** | **3、15、23、29** | [JR东日本9088M](https://timetables.jreast.co.jp/2611/train/025/025641.html) 新庄**13:57**→东京**17:36**；源13条全部到站且仅到福岛，恢复**28条**到发事件含福岛→东京 |
| 729 つばさ90 | **9090M** | **1、2、8、15、22、23、29** | [JR东日本9090M](https://timetables.jreast.co.jp/2611/train/045/048321.html) 新庄**15:51**→东京**19:40**；源13条全部到站且仅到福岛，恢复**28条**到发事件含福岛→东京 |
| 1968 はくたか595 | **9595E** | **7、14** | [JR东日本9595E](https://timetables.jreast.co.jp/2611/train/185/188191.html) 东京**10:30**→金泽**13:15**；原13:04→16:20的路线错误，重建**20条**正式到发事件。E7/W7仍不能确定，**无PNG** |

**另3份无11月官方对应来源：** 北陆 `はくたか592`（1982）、`はくたか594`（1983）、山阳`ひかり782`（9369）各置`operating_dates='{}'`，保留原站表、来源与历史名，但不再在选日图上显示；没有把「かがやき592」、12月／1月「はくたか594」、或11月别车「さくら782／9782A」冒充原旧车。

### 车种参考PNG与校验

原模板725/728/729的`train_timetable_vehicle_mappings`已独立关联JR东日本官方B级`evidence_sources`，且`vehicle_type=E8系`、`mapping_level=official_service_vehicle_plan`、`actual_vehicle_confirmed=false`。图库 `vehicle_image_assets`存在唯一`JR-East / E8系 / available / native_png / generic` 素材；因此在[同一既有精确PNG表](../../supabase/migrations/20261107006000_2611_yamagata_three_dated_e8_single_number_png.sql)新增**8177M、9088M、9090M**三个来源约束的E8参考图规则（`min=max`、`suffix=M`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`），不声称实车编组。**E7/W7、N700A/S、E5/H5混用仍不猜图。**

**SQL只读最终验收：** 2026年11月30天四种日期白名单合计**22个列车-日**、覆盖**16个不同日期**；3个历史禁用来源均为`[]`且无2611番号；4条新来源`date_verified`和正式番号均存在。四份新时刻源行数与派生VIEW完全一致（**25/25、28/28、28/28、20/20**）。**826份历史模板中已有823份2611完整番号（99.6%），511份唯一计划车型（61.9%），196条单号PNG（23.7%）**。PNG宽号段／非exact／假实车标记均为**0**；余3份是未被证明2026-11运行的历史来源，不应按“缺3个常规班次”追补。

**重要限制：** 此数是SQL模板证据覆盖率，不是单日真实运营列车班次完成度，也非已验证所有821余车的运行日期。已部署现有Edge Function但**未通过公网直接请求端到端验收**，也未在GitHub Pages/iPhone Safari验证每辆车的推算位置和E8 PNG显示。



## 2026-11-06 调查：剩余7条“未映射”实际属于日别临时列车／过期模板（只核证，未写SQL）

**本小节为只读排查，不代表完成7条SQL映射。** 本轮检索JR东日本2611官方列车页、JR西日本2026-11逐车页，并逐条回读Supabase既有 `manual_timetable_templates`、`manual_timetable_template_stops`、`train_timetable_members`、`published_train_number_evidence`，检查现有 `supabase/functions/train-runs/index.ts` 的日期与番号映射实现。**正式番号计数仍是819/826（99.2%），没有新增任何番号、车型、PNG或迁移、未部署前端。** 此处“剩余7”是7份旧模板没有**全日通用**的2611番号证据，不等于2611确实存在7趟未查到番号的常规列车。

| 既有模板 | 2611权威结果 | 与现有源的冲突及处理边界 |
|---|---|---|
| 北陆`1982 はくたか592` | [JR东日本2611的592为 **かがやき592／9592E**](https://timetables.jreast.co.jp/2611/train/130/131101.html)，**金泽17:31→东京20:08**，11月有运行；未找到能证实旧`はくたか592`的2026年11月班次 | 旧SQL仍为`はくたか592`金泽**10:56**→东京**14:12**且停靠许多站，车型/班次/时刻均不同；绝不能因为592同号次，硬改成`9592E`。先作为过期来源核验，待证实才替换或停用 |
| 北陆`1983 はくたか594` | [**6594E**](https://timetables.jreast.co.jp/2611/train/185/187731.html)官网为**2027年1月2、3日**金泽10:40→东京13:40；[**9594E**](https://timetables.jreast.co.jp/2611/train/125/128371.html)官网为**12月及1、2月指定日**，仅上越妙高11:46→东京13:40；检索到的两页均**没有11月运行日期** | 旧SQL金泽**13:56**→东京**17:12**，即便号码/运行日也不符，不应直接编号，更不应每工作日发布；保留未映射并优先核查2026-11是否该取消原模板 |
| 北陆`1968 はくたか595` | [**9595E**](https://timetables.jreast.co.jp/2611/train/185/188191.html)仅**11月7日、14日**（以及12月其他指定日），实际东京**10:30**→金泽**13:15** | 旧SQL东京**13:04**→金泽**16:20**，已非同一运行时刻且模板为Weekday，11月这两天均周六；不可把9595E写作全平日车，需日期限定与逐站原源重建 |
| 山形`725 つばさ177` | [**8177M**](https://timetables.jreast.co.jp/2611/train/020/022661.html)官网明确于**11月6、7、13、14、20～22、27、28日**运行，东京09:48→新庄13:16；[**6177M**](https://timetables.jreast.co.jp/2611/train/190/190031.html)仅12月25～31日等且官网终点**山形** | 源SQL16个停站事件**全部写入`arrival_station_urn/arrival_clock`**，包括东京始发09:48；未区分运行日、车型已存在E8计划但不能给所有Weekday编8177M。需要从官方发到站重建并按日选号码／终点 |
| 山形`728 つばさ88` | [**9088M**](https://timetables.jreast.co.jp/2611/train/025/025641.html)11月**3、15、23、29日**运行，新庄**13:57**→东京**17:36**，福岛16:02；[**6088M**](https://timetables.jreast.co.jp/2611/train/190/190091.html)仅**2027年1月4日**，只到上野17:30。注意官方表中的`8188M`属于**つばさ188**，不是88 | 源SQL`calendar=Weekday`，且13个源事件**全部只标arrival**、只到**福岛16:02**，`destination_urns`却填东京；11月官方运行日多为周日/假日，必需日历覆盖及福岛以后完整停站；不能把88变成全周一到五 |
| 山形`729 つばさ90` | [**9090M**](https://timetables.jreast.co.jp/2611/train/045/048321.html)11月**1、2、8、15、22、23、29日**新庄15:51→东京19:40；[**6090M**](https://timetables.jreast.co.jp/2611/train/110/111031.html)仅2027年1月5日**山形始发** | 旧源13个事件**全部只标arrival**并在**福岛18:02终止**，终点元信息却是东京；`calendar=Weekday`会错配周日/节日和缺少11月实际运行日，不能只补番号 |
| 山阳`9369 ひかり782` | [**ひかり782／9782A**](https://timetable.jr-odekake.net/train-timetable/385661?date=20260923)确曾在**9月23日**运行，**博多16:51→新大阪20:54**、含冈山19:36；但 [2026年11月JR西日本同`9782A`](https://timetable.jr-odekake.net/train-timetable/384751?date=20261107) 对应的是另一列**さくら782**，鹿儿岛中央09:22→广岛12:07 | 旧库保留`ひかり782`冈山19:36→新大阪20:53（官方9月实际**20:54**），来源`Weekday`，而9月证据仅一日；没有11月运行证据，不得复用11月`9782A`误认成旧ひかり；建议将老临时车历史来源与11月计划运行分离 |

**实现层已查到的共性阻碍：**
- `published_train_number_evidence` 现有唯一约束 `(edition,source_template_id)`，字段**无**`operating_dates`／`valid_from`／`valid_to`，一份模板本身不能同时表示同月指定日期的多个完整番号；`train-runs` 的新干线代码目前按 `edition=2611`、线路、`selectedCalendar`、模板ID选择**一条静态番号**。必须先设计**沿用现有日期证据/选日逻辑**的最小接入，不可仅给`train_number`拼尾缀。
- 同一运行日既涉及不同车次号码又涉及**始发/终到区间变化**，如つばさ177、88、90的12月/1月变体，因此除了番号需先验证出发、终点和停站事件。山形3份老模板的 `arrival_station_urn` 值异常（全部到站），88/90停站仅至福岛但`destination_urns`已写东京，直接挂官方番号并不能让位置推算正确。
- 已有 `published_joetsu_2611_number_roster` 含 `operating_dates`，`published_oito_east_2611_number_roster`、`published_oumain_2611_source_scope` 具备日期限定例子；研究应先复用既有拥有者、选日链路与证据字段，而不是先建一套新干线特有平行规则器。
- **统计建议**：维持现有819／826的“旧模板有无唯一番号证据”指标，同时单列“**2611实际运行日期有据、起终点/停站完整的计划班次**”作为验收项。不要为使百分比变100而将已过期旧模板虚报为2026-11常规列车。

**本次没有对运行数据库、GitHub Pages页面代码、车型PNG证据或列车源模板作写入**。本节仅记录调查可复核结论。

## 2026-11-06 继续：东海道132／132、北陆69／72、上越妙高站点归位

**起始快照：815／826条正式番号、510／826条唯一计划车型、193／826条精确原生PNG；本次新增4条2611官方完整番号（704A、553E、559E、600E）、1条唯一N700系计划车型，PNG无新增**。全部变更提交在现有 GitHub `main`，现有Supabase事务执行并回读，无新表、脚本、PR或服务器。新干线只按计划列车时刻表展示，不判定当天物理车底。

1. [东海道最后一趟「ひかり704」704A](../../supabase/migrations/20261106163000_tokaido_hikari704_2611_jrwest_full_stops.sql)：找到此前未获核验的 [JR西日本 2026-11-14 逐车页](https://timetable.jr-odekake.net/train-timetable/314481?date=20261114)，确认新大阪**10:48出发**、东京**13:42到**、N700系列计划。旧模板9267错误使用**10:46新大阪到站**作为东海道出发、遗漏滨松12:13/12:17、静冈12:37/12:41、热海13:04/13:05等站并写错部分到发时刻。迁移在断言原路线、线路、运营者、Weekday、方向、source-only成员后，重建现有 `manual_timetable_template_stops` **16个逐站发到事件**，同步成员范围，`train_timetable_stops`视图逐站回读。只绑定官方**N700系家族计划**，无N700A/N700S子型或PNG推断。**东海道正式番号132/132完整覆盖**，计划车型39/132。
2. [北陆线名实错误：妙高高原≠上越妙高](../../supabase/migrations/20261107001000_hokuriku_fix_joetsu_myoko_station_identity.sql)：原 `line_stations` 的北陆新干线第12号站错误写 `Myoko-Kogen`（妙高高原：另一条在来线的真实车站），30份北陆原始模板也错记这个URI。根据 [MapFan北陆新干线上越妙高站](https://mapfan.com/spots/SCH%2CJ%2CXKF)，在**已有** `stations` 表新增正确 `Joetsu-Myoko`（37.0812454,138.2484185），更新已有线路站序中唯一此站及30份模板的原站URI，`train_timetable_stops`派生视图复核；**保留**在来线真实 `Myoko-Kogen` 站，不误删、误改。由于之后两趟的到发事件补全，上越妙高现有SQL共32条源事件，错误残留为0。
3. [北陆平日「はくたか553」「559」](../../supabase/migrations/20261107002000_hokuriku_hakutaka553_559_2611_weekday_stop_rebuild.sql)：依据JR东日本2611版官网逐车 [553E](https://timetables.jreast.co.jp/2611/train/035/038621.html)、[559E](https://timetables.jreast.co.jp/2611/train/035/038651.html)，修复既有模板1955、1958错误增停安中榛名/佐久平及过时到发时间，恢复东京07:52→金泽11:01 **28个到发事件**、东京10:33→金泽13:36 **26个到发事件**，均逐站核对只读view。**仅映射源模板的Weekday平日常规车**：553在11月23日等另有5553E、559在若干周日／节日延长至敦贺时变成5559E，不将日别变号冒充全天候唯一番号。车型E7/W7未逐车排除另一候选，仍不填单车型计划或PNG。
4. [历史「あさま400」更新为现行「あさま600／600E」时刻槽](../../supabase/migrations/20261107003000_hokuriku_replace_legacy_asama400_with_600E.sql)：源模板1995为旧版06:00→07:40的400号，官网2611当前该早班时刻是 [600E（长野06:02→东京07:40）](https://timetables.jreast.co.jp/2611/train/035/038992.html)，**不在安中榛名停靠**，因此将这份现存、无其他600模板冲突的source-only计划改作 **あさま600**，更新canonical车名、14条逐站发到事件及成员末站。明确是**当前班次时刻槽替换，不是断言与旧400实车同一**，历史源`source_path`不改。2611官方另有上野时刻相差1分钟的600E页（038991）；本静态源按038992记，仍须运行日级时变处理才能标记所有日期完全核实。第一次事务PL/pgSQL局部变量`stations`与同名现有表冲突而自动回滚，修正变量名后同一迁移完整执行成功；没有部分写入。无E7/W7唯一车型或PNG推断。

**最新 live Supabase 全库：826份模板、819条2611正式番号（99.2%，余7）、511条唯一计划车型（61.9%，余315）、193条精确原生PNG（23.4%）。** 九州159/159、东海道132/132、北陆**69/72**；所有193个PNG仍满足 `min_number=max_number`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`，宽范围、伪实车确认为0。本站目前缺口不是实车车组号缺口。

**未写入的7份旧源模板**：
- 北陆**3**：`はくたか592/594/595`。原库含明显过时的运行时间和站点；2611官网594存在仅12月/1月等不同日期号次（例如6594E/9594E），595现行临时列车出发时间与旧13:04记录不一致，不能简单凭相同爱称号次登记。
- 山形**3**：`つばさ177/88/90`。2611官网可见177至少有8177M/6177M等日期变体，90有9090M/6090M等，88同样需验证运行日，不能将一个日期号次作为全部Weekday。
- 山阳**1**：旧`ひかり782`模板冈山19:36→新大阪20:53，只找到**2026-09-23**的「ひかり782=9782A」官网，但2026年11月的同一`9782A`又属于**さくら782**，列车及实际线路不同，绝不能复用号码或借九州/山阳另一服务的图片。

**范围声明：** SQL数据源与派生view已验收；仍未进行GitHub Pages与iPhone Safari的真机逐车渲染/PNG展示验收。静态Weekday/SaturdayHoliday无法单凭一个模板承载临时列车逐日编号变化；后续必须在既有运行日期口径上有独立官方证据，而不是把历史源补丁成一班凭空运行的列车。

## 2026-11-06 继续：东海道24趟ひかり计划番号、逐站时刻和N700系校正

针对上一轮 **791/826 官方完整番号、486/826 唯一计划车型、193/826 PNG** 的活库，新增 **24条 `TokaidoShinkansen` Weekday 源模板的官方完整A番号、24条官方N700系计划家族**（图库不新增任何N700专属单号PNG）。本站属于**静态时刻表驱动的计划列车**，已知N700系家族≠确认N700A/N700S子车型、物理编组号或车辆运营者所属，未凭番号或路线自造贴图。

**根因已核实：** 旧东海道来源 `data/timetables/TokaidoShinkansen-manual.js` 导入的模板常遗漏热海、三岛、小田原、丰桥、静冈、滨松等**实际计划停靠站**，并把部分新大阪、名古屋、京都等到站/发车混为一谈；跨山阳→东海道的 `ひかり702/706/708/710/712/714/716/718/720/722` 原源将**新大阪到站时刻**写作东海道区间的**出发时刻**，比官方发车早2分钟。只修正**已有责任表** `manual_timetable_template_stops`，补上逐车对应的到发事件、站名和时刻，再更新既有 `train_timetable_members.last_stop_sequence`。派生 `train_timetable_stops` 为只读 SQL VIEW，无需再造视图、脚本或重复源。事务执行前锁定原始模板 ID、运营者 JR-Central、线路、平日、上下行、终点、`source_only` 成员与旧全程逐站时刻，重建后逐站从 SQL VIEW 核对，最后才登记官方番号与唯一 N700 家族计划来源。

迁移分批均**已 GitHub main 提交，Supabase执行并回读**：
1. [上行6趟646A、656A、658A、660A、666A、668A](../../supabase/migrations/20261106132500_tokaido_six_hikari_646_668_2611_official_stops.sql)：独立逐车 [JR东日本646](https://timetables.jreast.co.jp/2611/train/025/027161.html)、[656](https://timetables.jreast.co.jp/2611/train/060/062671.html)、[658](https://timetables.jreast.co.jp/2611/train/025/027131.html)、[660](https://timetables.jreast.co.jp/2611/train/060/062701.html)、[666](https://timetables.jreast.co.jp/2611/train/025/027111.html)、[668](https://timetables.jreast.co.jp/2611/train/060/062721.html)，恢复小田原/丰桥/静冈/滨松等个别停靠及精确时间。
2. [下行6趟707A、709A、711A、717A、719A、721A](../../supabase/migrations/20261106140500_tokaido_six_outbound_hikari_707_721_2611_official_stops.sql)：逐车 [707](https://timetables.jreast.co.jp/2611/train/125/128521.html)、[709](https://timetables.jreast.co.jp/2611/train/125/128531.html)、[711](https://timetables.jreast.co.jp/2611/train/125/128541.html)、[717](https://timetables.jreast.co.jp/2611/train/125/128571.html)、[719](https://timetables.jreast.co.jp/2611/train/125/128581.html)、[721](https://timetables.jreast.co.jp/2611/train/125/128591.html) 对应实际停靠热海/三岛/静冈/滨松与正确名古屋、京都时刻。东京至新大阪为既有东海道模板段，官网部分列车继续去冈山，不把山阳段错误拼作同一JR-Central源。
3. [上行10趟702A、706A、708A、710A、712A、714A、716A、718A、720A、722A](../../supabase/migrations/20261106151500_tokaido_ten_hikari_702_722_2611_exact_stop_restoration.sql)：逐车官方 [702](https://timetables.jreast.co.jp/2611/train/125/128721.html)、[706](https://timetables.jreast.co.jp/2611/train/125/128741.html)、[708](https://timetables.jreast.co.jp/2611/train/125/128751.html)、[710](https://timetables.jreast.co.jp/2611/train/125/128761.html)、[712](https://timetables.jreast.co.jp/2611/train/125/128771.html)、[714](https://timetables.jreast.co.jp/2611/train/125/128781.html)、[716](https://timetables.jreast.co.jp/2611/train/125/128791.html)、[718](https://timetables.jreast.co.jp/2611/train/125/128801.html)、[720](https://timetables.jreast.co.jp/2611/train/125/128811.html)、[722](https://timetables.jreast.co.jp/2611/train/125/128821.html) 恢复准确的**新大阪出发时刻**，修正下游全程停站。
4. [ひかり731A](../../supabase/migrations/20261106154000_tokaido_hikari731_2611_correct_osaka_arrival.sql)：官网 [JR西日本2026-11-07的731A](https://timetable.jr-odekake.net/train-timetable/314251?date=20261107)，名古屋06:36发，岐阜羽岛06:46到06:47发、米原06:59到07:00发、京都07:19到07:20发，**新大阪07:32到**、07:34再开往博多。旧源错误把07:34发写成东海道模板终到时刻，现已更正。
5. [ひかり703A](../../supabase/migrations/20261106155500_tokaido_hikari703_2611_verified_jrwest_full_stops.sql)：官网 [JR西日本2026-11-17的703A](https://timetable.jr-odekake.net/train-timetable/314151?date=20261117) 证实东京08:03→新大阪10:57、经静冈09:02/09:07及滨松09:27/09:31，并于新大阪10:59继续向冈山方向。原源模板9240遗漏静冈、滨松，已修复。

**最新live SQL验收：** 826现存新干线源模板中，**815条官方完整番号（98.7%，剩11）**，**510条单车型计划（61.7%，剩316）**，**193个严格精确PNG（23.4%）**；**东海道131/132正式番号、38/132单车型计划**。24趟本轮修复车次专门SQL审计：官方来源URL不符合 train-runs 既有合法范围 **0**、时间倒序 **0**、缺失站URN **0**、原始源表与派生运行时视图停站行数不一致 **0**。193条新干线PNG仍满足 `min=max`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`，全部为计划图而非实车确认。

**剩余正式番号11条：** 东海道 `ひかり704`（1）、北陆 `あさま400/はくたか553/559/592/594/595`（6）、山形 `つばさ177/88/90`（3）、山阳临时 `ひかり782`（1）。`ひかり704`已找到10月29日 JR西日本官网个别列车页，注明2026年11月号并证实704A，但既有前端对于JR西日本个别列车证据 URL **仅接受 `date=202611xx`**；目前没有验证到同车有效 11月日期个别列车 URL，因此**没有偷换旧版URL或放宽验证以刷满132/132**。北陆源还存在过时车站和直通区间，山形日期号次变化仍待独立处理，不能猜E7/W7、E5/H5或日别后缀。

未新建表、parallel映射器、前端script/src、PR或本地服务器；**GitHub Pages/iPhone Safari实际列车PNG展示尚未验收**，SQL中的815条证据不代表已在浏览器逐车验收。

## 2026-11-06 继续：九州159／159正式番号完成、区间停运纠偏、东海道2趟ひかり

从上一阶段 783/826 正式番号、483/826 单车型计划、192/826 精确PNG，**本轮净新增8个正式番号、3个单车型计划、1个JR九州原生800系精确PNG**。全部 SQL 已直接提交既有 GitHub `main` 并在现有 Supabase执行，随后从真实业务源表及派生视图回读；没有新增表、视图、平行前端脚本、PR或本地服务器。2026年11月官网运营日期与计划范围，不代表当天实车派车。

### 九州新干线（新增6条番号，达到159／159）

- [さくら773=773A](../../supabase/migrations/20261106211000_kyushu_2611_sakura773_correct_shintamana_kumamoto.sql)：官方 [JR九州2611逐车详情](https://www.jrkyushu-timetable.jp/sp/2611/0034/00341801.html?d=20261103&t=2828300) 证实博多23:01→**新玉名23:40**→**熊本23:49**。旧源129035错误写成“熊本23:40→新八代23:49”，已直接改正 `manual_timetable_template_stops` 的两个站URN及 `manual_timetable_templates.destination_urns`，派生 `train_timetable_stops` 已回读。既有N700系计划证据保留，不随意绑定PNG。
- [旧さくら400重定版为さくら420=7420A](../../supabase/migrations/20261106214500_kyushu_2611_replace_sakura400_with_sakura420_7420a.sql)：根据 [JR九州2026-11-01官网](https://www.jrkyushu-timetable.jp/sp/2611/0038/00385801.html?d=20261101&t=2814400)，10月23日起的计划服务变为**420号／正式7420A／JR九州800系**；鹿儿岛中央06:00发，博多07:41到，**不在新八代停车**。原模板128970还是3月来源的400，本轮保留其 `source_trip_id` 作为历史来源，修正现行 `train_number` 和 canonical `primary_train_number` 为420，逐站校正时刻，删除不存在的新八代停车，重排站序与成员末端，从9站变8站。独立官方来源登记计划800系，新添唯一 **7420A→`../images/列车/JR九州/JR九州_800系.png`** 单号映射，不宣称物理车底。
- [742A、769A、771A、772A四趟10月23日后区间缩短](../../supabase/migrations/20261106223000_kyushu_2611_four_sakura_cancelled_segments_to_kumamoto.sql)：依据JR九州官方 [742A](https://www.jrkyushu-timetable.jp/sp/2611/0035/00357901.html?d=20261103&t=2828304)、[769A](https://www.jrkyushu-timetable.jp/sp/2611/0034/00348701.html?d=20261101&t=2828300)、[771A](https://www.jrkyushu-timetable.jp/sp/2611/0034/00348801.html?d=20261102&t=2828300)、[772A](https://www.jrkyushu-timetable.jp/sp/2611/0035/00359401.html?d=20261104&t=0829100)：742、772已取消鹿儿岛中央→熊本区间，只保留**熊本始发**；769、771取消熊本→鹿儿岛中央区间，只保留**熊本终到**。以源模板ID、完整原站序及原时刻做防误改检查，删除停运区间、修正时刻表成员边界、终点URN及真实的博多到站时刻（742为08:21、772为20:16），确保派生视图与官方运行区间完全吻合。四个原N700计划车型证据保留，不额外赋PNG。

### 东海道新干线新增两条正式番号与车型

- [ひかり634=634A、ひかり701=701A](../../supabase/migrations/20261106230000_tokaido_hikari634_701_2611_rebuild_official_stops.sql)：采用 [JR东日本2611官方634A全站](https://timetables.jreast.co.jp/2611/train/060/062501.html) 与 [701A全站](https://timetables.jreast.co.jp/2611/train/125/128491.html)，对现存模板9251、9239的**每条旧停站和时刻先做完整断言**。原634少滨松、静冈并错误记录部分到发时刻，现重建为**18条发到事件**（新大阪06:11→东京09:09）；原701遗漏静冈、滨松且名古屋等站时刻错误，现重建为**14条发到事件**（东京07:03→新大阪09:57），只更新既有源停站与成员边界，并用只读 `train_timetable_stops` 逐事件验收。两车独立添加正式番号与 **N700系计划家族**官方证据；不能据此判别N700A/S、运营公司车底或加未证实的PNG。

**最新真实活库快照：826份模板，791条官方完整番号（95.8%；剩35），486条唯一计划车型（58.8%；剩340），193条有来源的精确PNG白名单（23.4%）。** 九州正式番号 **159/159**、唯一计划车型 **158/159**（`さくら402`日期换型，不应静态选800/N700）、JR九州原生800系PNG **42** 条；东海道完整番号 **107/132**、唯一计划车型 **14/132**。全部193条PNG仍是 `min_number=max_number`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`，宽号段/假实际车底标记均为0。

**仍缺35条正式番号**：东海道25、北陆6、山形3、山阳1。北陆E7/W7、北海道E5/H5的单车型证据仍不可猜；山形临时车须确认运行日期不同正式号码；东海道其他 `ひかり` 的旧源站名／时刻与2611官网不符，必须先修正计划停站；山阳临时 `ひかり782` 尚无可证实的11月有效完整番号。**Pages、iPhone Safari 真机逐车PNG渲染未做，数据库审核≠浏览器展示验收。**

## 2026-11-06 继续：九州28趟「さくら」2611正式番号与逐站时刻恢复

**本轮新增**：在前一轮 **755/826 官网正式番号、483/826 唯一计划车型、189/826 精确 PNG** 的活库基础上，验证并迁移 **28 个原有 JR 九州 SaturdayHoliday 计划车次完整 A 番号**。这 28 条均已有对应单一车型计划（800系3条，N700系25条），本次不重复新增车型映射；对于仅有N700家族证据的25条不猜所属方或具体N700A/N700S外形。**3条有官方单一800系计划**的 `さくら407A/409A/411A` 正确绑定既有 `../images/列车/JR九州/JR九州_800系.png` 的精确单号证据。

所有迁移只修改现有 `manual_timetable_template_stops`（基于JR九州2611官网逐站发布时刻）；`train_timetable_stops` 已证实是该表派生的 SQL VIEW，不得直接 UPDATE 或维护第二份拷贝。对每趟列车先验证 `source_template_id`、JR九州、上下行、SaturdayHoliday、原始车名、9或6站停站数、每一条**旧站名+旧时刻**，再事务内逐站更新和 VIEW 回读，然后才写入 `published_train_number_evidence`。每条迁移失败自动回滚，不留下部分数据。

- [第一批8条下行：407、409、411、745、749、751、753、755](../../supabase/migrations/20261106185500_kyushu_2611_eight_outbound_holiday_sakura_exact_retimes.sql)：按官网完整 `407A/409A/411A/745A/749A/751A/753A/755A` 重建2026年11月计划站时；407/409/411三条为JR九州800系泛用原生PNG精确号码，其余保持N700计划车型、不选无依据PNG。
- [第二批6条上行：744、746、748、750、752、754](../../supabase/migrations/20261106191500_kyushu_six_northbound_sakura_2611_retimes_n700_family.sql)：`744A/746A/748A/750A/752A/754A`；修正鹿儿岛中央、川内、出水、新水俣、新八代等站点的变更时刻。此前车型等级B保持原样，没有变成当天实际车组。
- [第三批6条上行：756、758、760、762、764、766](../../supabase/migrations/20261106194000_kyushu_northbound_sakura_756_766_2611_source_retimes.sql)：`756A/758A/760A/762A/764A/766A`；旧计划与官网差异约3–8分钟，仅更新确定的站时，不改熊本以后正确的时刻。
- [第四批6条下行：757、759、761、763、765、767](../../supabase/migrations/20261106201000_kyushu_southbound_sakura_757_767_2611_source_retimes.sql)：`757A/759A/761A/763A/765A/767A`。**763A还有错误停靠站**：旧源模板129024把官方19:33发「新玉名 Shin-Tamana」错写成「新大牟田 Shin-Omuta」。初始事务严格拦截并回滚，随后以原车次ID、seq=3、`Shin-Omuta@19:33` 完整保护只改这一行的站名，VIEW核对后全批成功；不能把它描述成仅差几分钟。
- [第五批2条上行：768、770](../../supabase/migrations/20261106203500_kyushu_2611_sakura768_770_n700_plan_retimes.sql)：`768A、770A`；官网11月发行版表明鹿儿岛中央首发分别16:09/17:01，原SQL为16:17/17:07；已同步源计划停站并回读。

**2026-11-06 最新实际DB回读（全库总量，不是本批新增）：826个现存新干线源模板、783条2026-11正式番号（94.8%）、483条单车型计划（58.5%）、192条精确原生 PNG 白名单（23.2%）。** 九州新干线：**153/159** 官方番号，**157/159** 有单车型计划，**41** 条原生JR九州800系PNG。所有192条新干线PNG仍满足 `min=max`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`，无可疑宽号段。

**剩余官方号码43条**：九州6、东海道27、北陆6、山形3、山阳1。九州6条为 `さくら400/742/769/771/772/773`；其中 742、769、771、772 的JR九州官网注明**2026-10-23起鹿儿岛中央—熊本段停运**（按列车方向说明），原手工源仍保留已停运区间，不能仅补编号而把停运区间绘制成计划运行。773的旧源终点「新八代」而11月官方终到「熊本」，需要进一步核对原模板终点、member边界与关联字段，不靠补丁强行编号。400尚需独立按当前运营日查证。东海道多个ひかり旧版跨段首末时刻不符；山形临时车可能有日期级不同正式号码。均保留为待核验，不按爱称数字猜测。

没有新增SQL表、额外视图、前端script或src、常驻服务器、PR；所有 SQL已直接提交 `main` 并在现有 Supabase 数据库运行及回读。**尚未在 GitHub Pages 和 iPhone Safari 真机逐车验收 PNG 渲染。**

## 2026-11-06 增量：九州11月变更时刻表・土休日16趟纠偏与番号映射

**源责任和根因：** 既有土休日 `manual_timetable_templates` 来自 JR 九州 2026-03-14 基准 PDF；2026 年秋季熊本—鹿儿岛中央区间调整运行时刻后，部分源模板仍保留旧时刻。已通过 `pg_get_viewdef` 确认 `train_timetable_stops` 是 `manual_timetable_template_stops` 的**只读视图**而非第二个表，故只更新源停站行、逐站回读视图。最初试图更新 VIEW 的事务自动回滚，修正后成功；另一轮因 PL/pgSQL `record s` 名称与 SQL 表别名冲突导致事务回滚，移除遮蔽后成功。所有失败尝试都未留下部分数据。

本轮严格核验 2026-11（`2611`）JR 九州个别列车详情页，**新增16个原有 SaturdayHoliday 源模板的官方完整 A 番号、7条新的单车型计划、6个安全原生 PNG 白名单**。没有凭列车名、奇偶数、连续区间或实际派车猜测。

1. [さくら402～410 七车次](../../supabase/migrations/20261106164500_kyushu_2611_seven_sakura_holiday_official_retimes_and_numbers.sql)：**402A/403A/404A/405A/406A/408A/410A**，逐站修改旧源时刻并核对视图。403A、405A、406A沿用已有 800系官网单车型计划，新增3张 JR 九州原生 PNG 精确号段；404A/408A/410A既有 N700系计划不强行选图。**402A 在11月21、23日等官方指定日期存在800/N700车型替换，因此只补番号与计划时刻，未写死单车型或PNG**。408A 博多的源末到21:52原为继续往广岛方向的发车时刻，已改成21:50真实到站。
2. [さくら741/743、つばめ334/338/340/342 六车次](../../supabase/migrations/20261106173500_kyushu_2611_sakura741_743_and_four_late_tsubame_retimes.sql)：**741A、743A、334A、338A、340A、342A**，逐站对照官方 2611 并修正源时刻。741/743沿用既有N700计划；334A补充JR九州800系计划和精确原生PNG；338/340/342官方N700计划仅补车型不擅借PNG。
3. [つばめ303/336/343 三车次](../../supabase/migrations/20261106181500_kyushu_2611_tsubame303_336_343_exact_plan_retime.sql)：**303A、336A、343A**，官方逐站时刻与原始源表的差异经事务安全修正。303A为N700系计划；336A与343A为JR九州800系计划，各新增单号 PNG。343A中熊本站是长停留（22:35到／22:57发），仅按官网发车时刻修正，不视为停滞位置错误。

以上16条全部经既有 SQL源模板 ID、JR 九州线路、原列车名、土休日、方向、完整番号、每站旧时刻、官网新时刻、源模型与运行时 VIEW 逐条核验；所有原生 800系 PNG 都是 `min=max`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`。

**最新 Supabase 活库回读（不是本轮新增数量）：** 826份源模板、**755**条2611正式番号（91.4%，余71）、**483**条唯一计划车型（58.5%，余343）、**189**条精确原生PNG（22.9%）；九州正式番号**125/159**、唯一车型**157/159**、800系PNG**38**。其他线路本轮审计时已同步出现之前另批次提交的山阳/东海道覆盖提升，不能将它们计成本次九州16车次的成果。

**现存未证实番号71条：** 九州34、东海道27、北陆6、山形3、山阳1（临时ひかり782）。北陆同名列车可能因运行日使用不同番号，或旧数据库首末时刻与现行官网相差1～3分钟；必须保留日期与时刻边界。仍未验收 GitHub Pages 及 iPhone Safari 逐车 PNG 实际渲染。本轮没有创建SQL新表、平行源视图、脚本src、PR或服务器。

## 2026-11-06 增量：JR 九州土休日つばめ14列车及东北はやぶさ39

本次针对前一轮 **704／826 正式番号、442／826 唯一计划车型、171／826 原生 PNG** 的 live SQL 快照，**直接执行两份迁移并回读**：

1. [前10趟つばめ＋はやぶさ39](../../supabase/migrations/20261106144500_kyushu_holiday_tsubame_ten_2611_native_800_and_hayabusa39.sql)：JR 九州官网 2611 版逐车证实 **317A、319A、321A、323A、325A、327A、329A、331A、333A、335A** 的土休日模板与博多→熊本首末站到发时间完全一致。**317/319/323/325/327/329/331/335 共8条800系**，**321/333 共2条 N700系**，均有独立来源并使用既有 `official_service_vehicle_plan` 和 `evidence_sources`。800系对现有泛用原生 PNG 按单号白名单登记；N700系不借用其他公司的图片。[はやぶさ39 官网 2611](https://timetables.jreast.co.jp/2611/train/050/051791.html) 独立查到 **3039B**，与东京19:20→新青森22:30的源模板1329相符；只补番号不猜 E5/H5 PNG。
2. [晚间另4趟つばめ](../../supabase/migrations/20261106151000_kyushu_four_late_holiday_tsubame_800_native_png.sql)：官网精确确认 **337A、339A、341A、345A** 均为 **800系计划**且博多→熊本源时刻一致，对应源模板 **129027、129031、129049、129033**，独立生成四个精确 PNG 单号。第一次严格匹配发现345的源ID误填为129023（实际为343号），SQL事务自动回滚；[修正 commit](https://github.com/biubiu52011/pixel-tetsudo/commit/3fc9e8fd054faa7d5a77390e5edf20d23ccfbd39)后完整执行，四条回读成功。

**最新 Supabase 实际结果：826 模板；719 条正式番号（87.0%，尚缺107），456 条唯一计划车型（55.2%，尚缺370），183 条安全精确 PNG（22.2%）。** 九州新干线为 **109/159 正式番号、150/159 唯一车型、32 个800系精确 PNG**；东北为 **82/82 番号**。全部183条新干线 PNG 仍满足 `min_number=max_number`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`。

**明确保留的缺口**：部分既有旧手工时刻表与 2611 官网不一致（如九州土休日つばめ303官网鹿儿岛中央07:13、原源07:08；つばめ336官网19:27发、原源19:33发；つばめ343官网23:59到、原源23:57到），不为凑号码忽略时刻差。山形つばさ177/88/90有按运行日变化的多种完整号码，也不能以一个番号冒充全部 Weekday。北陆6、九州50、山阳9、东海道39、山形3共 **107 条**待独立验证。没有新增 SQL 表、前端 `src`、平行车型判断器、PR 或服务器；**Pages 与 iPhone Safari 渲染仍未实测。**

## 2026-11-06 增量：山阳→东海道8趟「のぞみ」N700S计划映射及源时刻修复

**权威来源：JR西日本 2611 官网逐车页面**，逐列证实服务名、官方完整列车番号、博多或广岛首发、新大阪到发、东京末到与计划 N700S 系。8趟为 **のぞみ10=10A、34=34A、40=40A、46=46A、50=50A、54=54A、62=62A、74=74A**。各自跨两个现存的 `source_only` 模板段：`SanyoShinkansen`（JR-West）与 `TokaidoShinkansen`（JR-Central），新增 **16 条官网番号 + 16 条计划 N700S系**；没有推断实际物理编组或运营车辆所属公司。

**根因已查清并只在数据源修复：** 8条山阳段末到新大阪原 `arrival_clock` 误写为东海道续行段的 **departure_clock**，比官方到站时刻晚2分钟。以官网逐车到站时刻修复既有 `manual_timetable_template_stops` 的8个字段（例如34A原16:06→官方到站16:04；出发仍为16:06）。经 `pg_get_viewdef` 核验，`train_timetable_stops` 和 `published_timetable_plan_stops` 是从此源表读取的 **SQL VIEW，而非可写数据表**；修复后两视图自动反映相同到站时间。首次迁移尝试对视图写入，事务按预期完整回滚；[修正到只写源表的 commit](https://github.com/biubiu52011/pixel-tetsudo/commit/1806af884ba334ebd171d64f97f52f66d7436a5c) 再执行成功。

官方URL还存在一个接口合约约束：现有 `supabase/functions/train-runs/index.ts` 要求山阳/东海道官网的个别列车详情页 URL 为 `date=202611...`。因此将のぞみ10证据 URL 规范为官网 [2026-11-01列车页](https://timetable.jr-odekake.net/train-timetable/1701?date=20261101)，同步更正已有 `evidence_sources`、`published_train_number_evidence` 与 `train_timetable_vehicle_mappings.source_path`。全线现有相关 `2611` URL 复核不含 202610 的违规个别列车链接。

[本批完整迁移及GitHub main代码](../../supabase/migrations/20261106160000_nozomi_eight_cross_line_2611_n700s_correct_sanyo_arrival.sql)。8×2条完整番号、N700S计划车型、山阳末到、对应日期运营者在Supabase逐一回读；原生素材表没有任何可用 `N700S系` PNG，因此 **0条新增PNG，不得使用JR东海/JR西日本 N700系 PNG代替**。没有新建表、页面脚本、双轨映射器、PR或服务器；未进行GitHub Pages及iPhone Safari真实渲染验收。

**最新回读：735/826正式番号（89.0%，剩91），472/826唯一计划车型（57.1%，剩354），183/826精确PNG（22.2%）。** 各线路目前未编号：九州50、东海道31、北陆6、山形3、山阳1。山阳剩下的临时 **ひかり782** 的现有原源冈山19:36→新大阪20:53，而仅查到9月限定官网的9782A、20:54到；没有对应11月有效个别列车证据，**不从9月或同期「さくら782」跨列车偷用番号**。

## 2026-11-06 增量：东海道4趟こだま正式番号与 N700 系计划

在上一阶段 **735/826** 已有官方番号、**472/826** 计划车型证据基础上，逐车核验 JR 东日本 **2611** 官方个别列车表，新增以下 **4条**现存东海道新干线平日、上行的列车级番号与车型：

| 车次 | 2611 官方完整番号 | 现有源模板ID | 始发／终到（经官方核对） | 官方车辆计划 |
|---|---|---:|---|---|
| [こだま828](https://timetables.jreast.co.jp/2611/train/125/129361.html) | **828A** | 9207 | 新大阪12:54→东京16:48 | N700系 |
| [こだま840](https://timetables.jreast.co.jp/2611/train/125/129391.html) | **840A** | 9211 | 新大阪15:54→东京19:48 | N700系 |
| [こだま850](https://timetables.jreast.co.jp/2611/train/125/129571.html) | **850A** | 9220 | 名古屋19:38→东京22:12 | N700系 |
| [こだま852](https://timetables.jreast.co.jp/2611/train/125/129411.html) | **852A** | 9218 | 新大阪18:54→东京22:48 | N700系 |

[本批已执行 GitHub main SQL 迁移](../../supabase/migrations/20261106163000_tokaido_four_kodama_2611_confirmed_n700_family.sql) 只在现有 `published_train_number_evidence`、`evidence_sources`、`train_timetable_vehicle_mappings` 写入来源受控的计划映射，逐条核对原始模板 ID、线路/运营者、Weekday、方向、首末站和到发时刻。没有新增表、脚本、车组号、PR或服务器。

官方仅证实 **N700 系计划家族**，不能由此唯一判定 N700A／N700S、实际车组或照片所属方。因此本批**没有新增 PNG 单号**，保持既有图库候选和中性标记，不借用未经证实的特定车辆图。数据库现场回读逐条一致，图库审计 **183 条均为 min=max、requires_exact_roster=true、actual_vehicle_confirmed=false**。

**最新总数：826 份源模板；739 份官方完整番号（89.5%，余87）；476份有单车型计划（57.6%，余350）；183个精确PNG单号（22.2%）。** 未编号按线：九州50、东海道27、北陆6、山形3、山阳1。历史小节仍保留当时的阶段性快照，不代表最新进度。Pages 与 iPhone Safari 真正渲染尚未验收。

## 总体结果

| 口径 | 更新前 | 更新后 |
|---|---:|---:|
| 原始时刻表模板（不是实际每日运行记录） | 826 | 826 |
| 有官方依据的单一**计划车型** | 351 | **511** |
| 无列车级单车型计划 | 475 | **315** |
| 当日实车编组确认（不作为本项目验收项） | 不适用 | **不适用** |
| 已写入 `published_train_number_evidence` 的新干线正式**完整列车番号** | 0 | **823** |
| 已写入 `published_train_png_number_ranges` 的新干线逐个精确番号 PNG | 0 | **196** |

**单车型计划覆盖率：511 / 826 = 61.9%；正式番号证据 823 / 826 = 99.6%；安全 PNG 单号 196 / 826 = 23.7%。其中3份缺号是已筛除的历史旧源；这不是全列车每日运营班次验收，也不是已在浏览器实际渲染196张PNG。**

## 各线计划车型覆盖率（2026-11-06 当前最新回读）

| Line key | 已有模板 | 官方单车型计划 | 仍待核实 | 当前已知障碍 |
|---|---:|---:|---:|---|
| AkitaShinkansen | 45 | **45** | 0 | E6 官方车型计划，**45/45 正式番号与 PNG 精确映射** |
| HokkaidoShinkansen | 26 | 0 | **26** | **26/26 正式番号**，E5/H5 不可据名分辨、PNG 仍为 0 |
| HokurikuShinkansen | 72 | 0 | **72** | **70/72 正式番号**，临时595E的正式号为9595E且仅11/7、14运行；592/594原过时模板已排除；E7/W7未唯一确认，PNG仍0 |
| JoetsuShinkansen | 18 | **18** | 0 | E7 计划车型；**18条正式番号和精确 PNG 单号映射** |
| KyushuShinkansen | 159 | **158** | **1** | **159/159**正式番号全覆盖、**42**条原生JR九州800系PNG；计划车型唯一剩余402A日期换型 |
| NishiKyushuShinkansen | 92 | **92** | 0 | N700S 6 辆计划车型确定，**图库无对应 N700S PNG** |
| SanyoShinkansen | 154 | **78** | **76** | **153/154** 正式番号、10 条精确PNG；旧临时ひかり782无11月匹配证据已排除当月展示 |
| TohokuShinkansen | 82 | 35 | **47** | **82/82 正式番号**，35 条 E6/E8 单车型 PNG；其他混用未猜测 |
| TokaidoShinkansen | 132 | **39** | **93** | **132/132** 正式番号已满，704A用11月14日官方链接恢复静冈/滨松/热海与N700计划 |
| YamagataShinkansen | 46 | **46** | 0 | **46/46正式番号**，临时177/88/90按11月运行日全程逐站重建；46条精确E8参考PNG（非实车） |
| **合计** | **826** | **511** | **315** | **823 条正式番号、196 条精确 PNG；另3份未证实历史旧源已禁用；实车确认不属验收项** |

“官方单车型计划”只表示有 `official_service_vehicle_plan` 与 `evidence_sources` 关联，并没有证实运行当天派车、具体车辆编组号或涂装。未覆盖的模板可能有线路层候选车种，但不属于列车级已确认映射。

## 第一阶段已核实的五个正式列车番号（非爱称号次）

| 线 | SQL 原始 `train_number`（列车服务名） | 2026-11 正式番号 | 车型处理 | 官方来源 |
|---|---|---|---|---|
| 秋田 | こまち1 | **3001M** | E6 → 泛用原生 PNG，计划参考 | https://timetables.jreast.co.jp/2611/train/030/033833.html |
| 山形（福岛以后） | つばさ121 | **121M** | E8 → 泛用原生 PNG，计划参考 | https://timetables.jreast.co.jp/2611/train/025/029831.html |
| 上越 | Toki301 | **1301C** | E7 → 泛用原生 PNG，计划参考 | https://timetables.jreast.co.jp/2611/train/035/038221.html |
| 北陆 | かがやき501 | **3501E** | **未选择 E7/W7 中任一张** | https://timetables.jreast.co.jp/2611/train/095/098481.html |
| 东北 | Hayabusa29 | **29B** | **未选择 E5/H5 等任一张** | https://timetables.jreast.co.jp/2611/train/125/129731.html |

五条来自既有 `supabase/functions/train-runs/index.ts` 的逐车官方来源、起点与发车时间交叉核验；新写入 `published_train_number_evidence`，限定 **SaturdayHoliday / 2611**，`verification_scope='train_number_only'`，没有以爱称号码替代正式番号。其他 821 个模板不能因这五条而被推导为固定尾缀和区间。

首批三张精确 PNG 只记录 `min_number=max_number`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`：

- `3001M` → `../images/列车/JR東日本/JR東日本_E6系.png`
- `121M` → `../images/列车/JR東日本/JR東日本_E8系.png`
- `1301C` → `../images/列车/JR東日本/JR東日本_E7系.png`

三张图库素材通过 `vehicle_image_assets` 检查均为 `available`、`native_png`、`generic`、JR-East，且同型号的计划映射与官方来源 ID 已存在。**这不代表当天具体车底/编组已知。**

## 2026-11-05 实施内容

1. 复用现有 `train_timetable_vehicle_mappings` 与 `evidence_sources`：为 **秋田 1**（`128897`）、**山形 1**（`128896`）、**西九州 47**（官方基本时刻表）共 49 条休日模板写入单车型**计划**证据，分配既有官方证据 ID `4931/4933/4932`。
2. 西九州 **46 条**的来源为官方 2026-03-14 至 2027-02-28 定期基准 PDF；另外 **かもめ1号** 为此前逐车确认的 JR 九州官方时刻表样本，保留不同来源，不篡改源。
3. 首批已写入 5 条完整正式番号与 3 条原生 PNG 的**单号范围**（随后另增上越17、秋田11、山形42）。所有 SQL 写入都具有来源、线路、原车次名、方向、日期类型或成员 ID 范围保护，且 `ON CONFLICT DO NOTHING` 以便重跑。
4. **未修改** `manual_timetable_templates.train_number`、`train_runs`、实际编组资料、原有候选值、页面布局、`home.css`、`data/stores.csv`、`scripts/page-scripts.json` 或 `train-number-png-ranges.js`。已有 SQL→车型计划→图库解析器负责显示；不再重复创建凭空号段、脚本入口和补丁。
5. 事务已在现有 Supabase 上执行，回读结果：`400` 单车型计划、`426` 未定、`75` 正式番号证据、`73` 精确 PNG 记录、`49` 本轮新增计划车型、`0` 已确认实际编组。

**可复核 SQL 迁移**：`supabase/migrations/20261105140000_shinkansen_2611_full_number_evidence_and_holiday_vehicle_plans.sql`。该迁移已在 Supabase 执行，不需要在本地额外启动服务器。

## 图片缺口与优先级

- **P0：西九州 N700S 原生 PNG**。虽然 92/92 的计划型号已确定，但 `vehicle_image_assets` 中 JR-Kyushu N700S 对应 PNG 数为 0。应通过真实 N700S 素材和与 `N700S系` 对应的图库登记补足；不能拿既有 N700/N700A 图替代。
- **P1：九州 N700 所属方/PNG**。有 106 条 `N700系` 计划，但 JR-Kyushu + `N700系` 没有相应通用图库记录。需要确认单车是 8000 番台 R 编成、JR 西日本 S 编成，还是其他真实车队，不可仅凭“运行在九州”认为车是 JR 九州持有。
- **P1：东海道（132）/山阳（102）**。需正式番号及当前型号对应证据，尤其区分 N700A、N700S、500，避免将车型系列当作统一车号段。
- **P2：北陆（72）/东北（47）/九州（47）/北海道（26）**。按 2611 官方逐车信息、运营日、起讫和续行段逐个采集；不能仅按列车名称、尾缀或东/西公司线路来指定车型。
- 所有现有未证实位置维持单个中性列车图标或未决状态，不生成两列虚构实车，也不以官方车队候选强行替换 `PLANNED_MODEL`。

## 复核查询

```sql
SELECT m.line_key, COUNT(*) total,
       COUNT(v.timetable_id) planned,
       COUNT(*) - COUNT(v.timetable_id) unresolved
FROM manual_timetable_templates m
LEFT JOIN train_timetable_vehicle_mappings v
  ON v.source_template_id=m.id
WHERE m.line_key LIKE '%Shinkansen'
GROUP BY m.line_key ORDER BY m.line_key;

SELECT line_key, train_number, source_template_id
FROM published_train_number_evidence
WHERE edition='2611' AND line_key LIKE '%Shinkansen'
ORDER BY line_key;

SELECT line_key, min_number, max_number, suffix,
       vehicle_model, png_reference
FROM published_train_png_number_ranges
WHERE edition='2611' AND line_key LIKE '%Shinkansen'
ORDER BY line_key;
```

### 明确未完成的验收条件

**不能把以上进展称作 10 条新干线全覆盖**：现有 402 条没有逐车计划车型证据，若要把余下 333 条尚无单独登记正式番号证据的模板变成可用于号段映射的记录，需要进一步用可合法复用的 JR 官方站/车次时刻表逐项核对，且不同工作日/土休日和临时列车不可混抄。既有 10 条新干线的土休日**时刻表覆盖本身仍不完整**（参见 `docs/timetable/shinkansen-holiday-coverage-2026-10-31.md`），因此不能从本审计推导已完成全日时刻表或实际每日运行结果。

## 2026-11-05 第二轮：上越新干线平日 17 条官方番号

官方2026年11月站间时刻表提供逐列对照的 **列車番号/列車名**：
- [上越・北陸新幹線 下り 平日](https://timetables.jreast.co.jp/2611/timetable-v/004d1.html)
- [上越・北陸新幹線 上り 平日](https://timetables.jreast.co.jp/2611/timetable-v/004u1.html)

本轮依照上述官方列车名和番号逐条核对既有的 17 条上越新干线 Weekday SQL 模板，按原始源模板ID、方向、日历、线路精确连接。新增 17 条完整列车番号官方证据、17 条 E7系 PNG 精确单号行，连同既有的休日 Toki301，共 18 条官方番号及 18 条 PNG 单号映射（不是宣称实际车辆编组确定）。

例如：Toki312 是 **1312C**，Toki344 是 **1344C**，Tanigawa403 是 **2403C**。同名服务可能有季节性附加番号（如4403C），本次按2026年11月常规 Weekday 号段登记，不把特别运行日的番号改写到通用模板，也不从爱称号次机械加尾缀。来源日期与停站/到发时刻的正确性仍需要各自审计。

SQL迁移： [20261105152500_joetsu_shinkansen_2611_weekday_17_official_train_numbers_png.sql](../../supabase/migrations/20261105152500_joetsu_shinkansen_2611_weekday_17_official_train_numbers_png.sql)

已部署原有 Supabase train-runs Edge Function 至 **v298**，按日期为2026-11、官方版本2611、line_key、calendar_urn、source_template_id、direction_urn，以及官方 URL 验证后，从数据库读取正式番号，保留原始 service_name 字段。不新增页面脚本或自制图标；既有 E7 系车型计划和车图库负责图像渲染。部署及数据库回读验证成功，但尚未完成逐车浏览器端显示测试。

**2026-11-05 当日阶段回读**：10条线826份模板；400条已确认单一计划车型、426条待定；75条正式列车番号证据；73条可精确关联的 PNG 单号记录；实际车辆编组认证为0。这些计数不是全日程时刻表的完整性，也不是实时实车位置认证。

后续：继续补足秋田、山形余下未核对号码，并逐车核对东北、北陆、北海道；对于 E5/H5 或 E7/W7 同线混用、併结拆分及不明配属不强制选择图片，必须查到唯一计划车型才能建立型号对应 PNG。

## 2026-11-05 第三轮：秋田新干线 11 条平日正式列车番号

官方来源：[田沢湖線・奥羽本線 下り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html)、[東北・秋田新幹線 下り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/003d1p.html)、[東北新幹線 上り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/003u1p.html)、[こまち41 个别列车](https://timetables.jreast.co.jp/2611/train/060/062371.html)。

按已存储的源车次名、方向与 Weekday 日历核对 **11 条**，沿用 JR East E6 系官方计划车型及确实存在的原生 E6 PNG。不做「3000+爱称序号」的推测：例如「こまち17 → 9017M」「こまち45 → 5045M」「こまち51 → 5051M」。在此前「こまち1 → 3001M」休日样本之外，现有 **12/45** 条秋田模板已有正式番号及 PNG 精确单号记录。

迁移已提交到 main 并执行：[秋田新干线 11 条映射](../../supabase/migrations/20261105164500_akita_shinkansen_2611_selected_11_official_train_numbers_png.sql)。这不证明模板原定停站、每个运行日期或实际当天列车编组均可靠。

## 2026-11-05 第四轮：山形新干线 42 条平日奥羽本线 M 番号

官方来源：[奥羽本線 下り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/249d1.html)、[奥羽本線 上り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/249u1.html)。核验的是**福岛以后山形・新庄区间的 M 番号**；同列车在东北新干线区间可能采用 B 番号。不可把这两个物理区段的列车番号覆盖成同一个字符串。

**42/45** 条原有 Weekday 车型 E8 模板已按官方「列車名／列車番号」一对一匹配。例：つばさ94 → 6094M，つばさ188 → 8188M，つばさ192 → 8192M，つばさ195 → 8195M。排除 3 条存在运行日/番号歧义的服务：**つばさ88、つばさ90、つばさ177**；它们仍保留原始列车名，不以猜测型号尾号填补。加之前述休日 つばさ121 → 121M，山形共 **43/46** 条精确番号与 E8 PNG 精确单号记录。

迁移已提交到 main 并执行：[山形新干线 42 条映射](../../supabase/migrations/20261105172000_yamagata_shinkansen_2611_42_official_m_numbers_png.sql)。

## 累计数据与运行时接入

| 线路 | 正式番号证据 | 精确 PNG 单号行 | 原模板 |
|---|---:|---:|---:|
| 秋田 | 12 | 12 | 45 |
| 上越 | 18 | 18 | 18 |
| 山形 | 43 | 43 | 46 |
| 北陆 | 1 | 0 | 72 |
| 东北 | 1 | 0 | 82 |
| 其他五条 | 0 | 0 | 563 |
| **合计** | **75** | **73** | **826** |

上表「其他五条」原模板数由数据库明细求和：北海道26 + 九州159 + 西九州92 + 山阳154 + 东海道132 = 563。所有精确 PNG 单号行要求 exact roster，actual_vehicle_confirmed=false，不等于实际派车。

已部署原有 train-runs Edge Function **v298**：直接读取 SQL 的 published_train_number_evidence，按数据来源、11月版、服务日历、线路及原模板 ID 核对返回官方正式番号，同时保留服务名。既有车型计划及图库负责展示路径；新 SQL 行本身不是浏览器端 PNG 成功显示的证据。未进行浏览器端到端渲染验收。

## 2026-11-06 新一轮实际执行与验证

| 线路 | 时刻表模板 | 官方完整番号证据 | 安全单车型 PNG 精确单号 |
|---|---:|---:|---:|
| 秋田 | 45 | **45** | **45**（E6） |
| 北海道 | 26 | **26** | **0**（E5/H5 无法逐车确认） |
| 北陆 | 72 | **66** | **0**（E7/W7 无法逐车确认） |
| 上越 | 18 | **18** | **18**（E7） |
| 东北 | 82 | **81** | **35**（E6/E8） |
| 山形 | 46 | **43** | **43**（E8） |
| 九州 | 159 | 0 | 0 |
| 西九州 | 92 | 0 | 0 |
| 山阳 | 154 | 0 | 0 |
| 东海道 | 132 | 0 | 0 |
| **合计** | **826** | **279（33.8%）** | **141（17.1%）** |

更新迁移均已提交 main 且执行到已有 Supabase 项目：

- [北陆：65 条 2611 平日官方番号](../../supabase/migrations/20261106035000_hokuriku_shinkansen_2611_65_weekday_official_numbers_no_fleet_guess.sql)，另有既有休日1条；遇到 553E/5553E 等候选号不强行指定。
- [东北与北海道：80+25 条 2611 平日官方番号，东北35条 E6/E8 PNG](../../supabase/migrations/20261106041500_tohoku_hokkaido_2611_105_official_numbers_35_e6_e8_png.sql)。
- [秋田：另外33条正式 M 番号及 E6 PNG](../../supabase/migrations/20261106051000_akita_shinkansen_2611_complete_33_remaining_m_numbers_e6_png.sql)，现为45/45。
- [北海道休日：はやて91 正式91B](../../supabase/migrations/20261106053000_hokkaido_shinkansen_2611_hayate91_holiday_official_number.sql)，根据[官方个别列车时刻表](https://timetables.jreast.co.jp/2611/train/040/044991.html)核对新青森06:33发车；不同日期06:39的变体不混用。

官方列车番号来源：JR东日本2611版[上越北陆下行](https://timetables.jreast.co.jp/2611/timetable-v/004d1.html)、[上行](https://timetables.jreast.co.jp/2611/timetable-v/004u1.html)、[东北北海道下行](https://timetables.jreast.co.jp/2611/timetable-v/003d1.html)、[上行](https://timetables.jreast.co.jp/2611/timetable-v/003u1.html)、[秋田下行](https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html)及[上行](https://timetables.jreast.co.jp/2611/timetable-v/258u1p.html)。

既有 [train-runs Edge Function](../../supabase/functions/train-runs/index.ts) 读取官方证据时，已修复北海道线路运用者 JR-Hokkaido 被旧 JR-East-only guard 排除的问题，**已部署 v306**。由于 GitHub main 在当时比线上 v305 多出另一个独立 Oito 线路的未部署代码，此次仅把北海道条件修改应用于当前在运行的函数并部署 v306；主分支同步提交相同修正，但**线上代码并非与 main 全文完全一致**。没有擅自上线与新干线无关的变更。

**数据库只读审计**：279条官方完整番号、141条 PNG 精确单号；所有 PNG 范围 min=max / requires_exact_roster=true / actual_vehicle_confirmed=false；缺正式番号对应证据0；与 official_service_vehicle_plan 不符的车型0；无可用 native_png 图库路径0。

仍未完成：547条模板没有独立正式番号证据，包括北陆6、东北1（旧 Hayabusa39）、山形3（つばさ88/90/177 多候选），另有东海道、山阳、九州、西九州总计537条，需JR Central/West/Kyushu独立官方资料与车型图库。全部列车的真实运行日、停站时刻一致性、编组号和浏览器/iPhone Safari真实图片展示尚未逐车端到端验收。本任务仍是**进行中**，不能因番号证据提高而标记全线路已完成。

### 2026-11-06 线上代码最终状态补充

在前述 v306 局部部署之后，仓库已有的独立 Oito 代码随后通过正常部署流程合入线上。目前实测：Supabase train-runs **v307 ACTIVE**，其 index.ts 与 GitHub main 的源文件**全文一致**；已包含本次 JR-Hokkaido owner guard。前文的 v306 与 main 不一致只是一段中间部署状态，**不再是当前状态**。

[GitHub Pages 最新部署成功](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42089177493)；[列车 PNG 契约检查已通过](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42088471449)。通过的是代码契约/Pages 部署，不代表已经逐车完成 Safari 实机图像验收。

## 2026-11-06 续篇：JR 九州与东海道／山阳／西九州新干线号段审计

本节是 **2026-11-06 最新活库快照**，覆盖前文注明为 2026-11-05 以及当天较早时点的统计。不能把以前的 279／141 小计当成最新结果。2611 是 **2026年11月**，各公司的官网应分别匹配对应发行月，不得认为所有数据都由 JR East 编辑。

| Line | 既有 SQL 模板 | 官方完整列车番号 | 精确 PNG 单号 | 已有单车型计划 |
|---|---:|---:|---:|---:|
| AkitaShinkansen | 45 | 45 | 45 | 45 |
| HokkaidoShinkansen | 26 | 26 | 0 | 0 |
| HokurikuShinkansen | 72 | 66 | 0 | 0 |
| JoetsuShinkansen | 18 | 18 | 18 | 18 |
| KyushuShinkansen | 159 | **66** | **20**（800系） | **136** |
| NishiKyushuShinkansen | 92 | **79** | **0**（N700S PNG缺失） | 92 |
| SanyoShinkansen | 154 | **41** | 0 | 52 |
| TohokuShinkansen | 82 | 81 | 35 | 35 |
| TokaidoShinkansen | 132 | **28** | 0 | 0 |
| YamagataShinkansen | 46 | 43 | 43 | 46 |
| **合计** | **826** | **493** | **161** | **424** |

本轮具体迁移和变更：

1. [JR 九州 2611 西九州 40 个かもめ名称 → 79 条现有周历模板的正式 G 列车番号](../../supabase/migrations/20261106061000_nishi_kyushu_shinkansen_40_exact_jrkyushu_2611_g_numbers.sql)。特别区分 `2001G/2037G/2103G` 等与接续 `2001H` 等リレーかもめ的号。92份 N700S 计划车型证据仍没有同运营商原生PNG，所以0张PNG。
2. [26 个经官网逐车核对的 A 号次名称 → 67 个既有东海道／山阳／九州模板](../../supabase/migrations/20261106065500_26_named_tokaido_sanyo_kyushu_a_numbers_source_scoped.sql)。JR East 2611 综合表、JR West 11月个别车次和 JR Kyushu 2611 车次页分别保留来源。`みずほ613=613A` 只证明号码，不证明旧记录里的每段在11月均能行驶。
3. [JR 九州 つばめ300/301/302/304/305/306/308 7条正式番号 + 6条原生800系PNG](../../supabase/migrations/20261106074000_jr_kyushu_tsumbame_2611_six_native_800_png_exact_numbers.sql)：302A 是 N700，**必须排除**于800型 PNG 白名单。官方 [300A](https://www.jrkyushu-timetable.jp/sp/2611/0035/00352901.html?d=20261104&t=0829100) ／ [302A](https://www.jrkyushu-timetable.jp/sp/2611/0037/00377401.html?d=20261101&t=0829200) 页面逐车可核对。
4. [JR East 2611 组合时刻表额外32个官方A号次名称 → 44 个东海道20／山阳20／九州4的平日模板](../../supabase/migrations/20261106082500_32_exact_additional_jreast_2611_a_train_numbers_tokaido_sanyo_kyushu.sql)，只写 Weekday 正式番号，不因为一个 A 后缀决定 N700A/N700S/500。
5. [JR 九州另外18个つばめ官方车次逐一辨别车辆型号](../../supabase/migrations/20261106092000_18_kyushu_tsumbame_2611_model_proofs_14_native_800_png.sql)：17个新正式 A 番号、14个 800 系原生PNG、4个 N700 系单车型计划（其中302A已在上一步登记过正式番号）。`307A`,`309A`,`311A`,`302A` 是 N700，**不得归入 800**。型号计划来自个别列车公开编组说明，不代表当日实车。

此次 **24 个新的列车级计划车型** 已写入既有 `train_timetable_vehicle_mappings`，并新增官方 A级 `evidence_sources`，无新建表；由 400→424，未知单车型从426→402。所有号码通过 `published_train_number_evidence` 按 `source_template_id, line_key, calendar_urn, direction_urn, edition=2611` 存储，并非修改 `manual_timetable_templates.train_number`。

**运行时**：现有 [train-runs/index.ts](../../supabase/functions/train-runs/index.ts) 扩展了 JR-Kyushu G 和 JR-Central/JR-West/JR-Kyushu A 的严格官方来源白名单，保留原爱称，已部署 v308 与 v309；随后存在同仓库并行线路维护部署，最终线上版本及是否与 main 一致需单独以最新 Supabase 状态回读为准。`js/train-vehicle.js` 已有 official_service_vehicle_plan → resolveTimetableVehiclePlan → canonical generic asset 的单车型计划 PNG 通路，本轮**未修改该JS**，未曾做浏览器/iPhone Safari逐车渲染验收。

**安全性**：本次不使用号码连续 min/max 蒙混未确认车次。所有新增 `published_train_png_number_ranges` 为 min=max，`requires_exact_roster=true`，`actual_vehicle_confirmed=false`；JR九州800系 PNG `../images/列车/JR九州/JR九州_800系.png` 已通过 `vehicle_image_assets` 资产与证据检查，不能拿其他运营方 N700 或不同番台 PNG 代替。

**2026-11-06 早前阶段缺口**：333个已有 SQL 模板没有单独登记完整番号证据；402个没有列车级单一计划车型证据；真正当天编组和时刻表全覆盖、iPhone Safari PNG 验收都尚未确认。Notion对应任务必须保持「进行中」。

## 2026-11-06 早前阶段：新增 173 条正式号码、当时覆盖率 80.6%

**此小节保留早前实库回读历史数据**，最新计数请以文末 674 / 826 小节为准。正式号码有 666 条，其中本轮增加 173 条；PNG 仍为 161 条（19.5%），官方单车型计划仍为 424 条（51.3%），实际确认派车仍为 0。

- [西九州 5 个不同「かもめ」/9 条平日休日 SQL 源](../../supabase/migrations/20261106052000_nishi_kyushu_2611_five_missing_kamome_exact_g_numbers.sql)：官网逐车的 2041G、2047G、2063G、2064G、2101G，对照首站发车时刻、运营方向。无 N700S 图库 PNG，不制造替代车图。
- [JR East 2611 下行 111 个逐列刊载 A 番号](../../supabase/migrations/20261106054500_tokaido_sanyo_kyushu_2611_111_verified_down_a_numbers.sql)：东海道45、山阳53、九州13个源模板，Weekday only；[官网下行](https://timetables.jreast.co.jp/2611/timetable-v/001d1.html)。
- [JR East 2611 上行 51 个逐列刊载 A 番号](../../supabase/migrations/20261106061500_tokaido_sanyo_kyushu_2611_51_verified_up_a_numbers.sql)：东海道20、山阳24、九州7个源模板，Weekday only；[官网上行](https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html)。
- [西九州 かもめ3 两个周历模板](../../supabase/migrations/20261106064000_nishi_kyushu_kamome3_2003g_both_calendars.sql)：官网 2611 个别列车页面核实 2003G，武雄温泉 07:42；无 N700S 图片，且不以 2003H 接续列车号替代。

**最新每线正式号码（分母为既有 SQL 模板）**：
秋田45/45、北海道26/26、北陆66/72、上越18/18、九州86/159、西九州90/92、山阳118/154、东北81/82、东海道93/132、山形43/46。合计 666/826，仍缺 160。
其间的北陆6、山形3及东北1受临时列车/运转日/名称号码冲突影响，不能把同名服务直接以爱称数字推出完整番号；其他未核对班次亦不得扩大号段。

本轮迁移已直接提交 GitHub main 并在 Supabase 独立执行，未新建表、未新增页面脚本、未启用本地服务器、未创建 PR。正式号码不能被视为全日运行证据，车型也不能当作当日实际车底，保持未解决或中性图标。仍需要列车逐车浏览器/iPhone Safari 真实图片显示验收。

**CI 差异**：此前 [PNG 合约检查](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42094763681) 成功，但对应 [Pages 部署](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42094763394) 在最后「Deploy to GitHub Pages」步骤失败（前面构建及上传通过）。不能把这些记录当作网页部署/实机验收成功。

### JR 九州800系原生 PNG 前端通路复核

即使 SQL 对已核实的20个九州新干线「つばめ」番号登记了 EVIDENCE/PLAN/PNG（[本期800系单号证据](../../supabase/migrations/20261106092000_18_kyushu_tsumbame_2611_model_proofs_14_native_800_png.sql)），前端原有 [js/train-vehicle.js](../../js/train-vehicle.js) 中 `planned-stock-library-28` 的 JR九州800系 canonical 条目仍**没有 lineIds**。现有 `resolveCanonicalVehicleForPlan` 对有线路上下文的资产强制校验线路，故即使 SQL 返回 `800系`，原来的图库图片也可能被拦截。

本轮只在该 canonical 条目加入 `lineIds:["KyushuShinkansen"]`，并对已有的 [tools/train-png-display-contract.test.cjs](../../tools/train-png-display-contract.test.cjs) 增加正向断言（JR九州800系在九州新干线返回 `../images/列车/JR九州/JR九州_800系.png`），以及负向断言（同图片不可扩散到山阳新干线）。未改真实派车身份解析器、未加脚本入口、未使用 N700 代图。SQL 精确号码映射仍只针对有独立官方车次/车型证据的白名单；本次仅修复**车型图像解析的线路作用域**。这些是代码级验证，不代替 Safari 实机显示测试。


## 2026-11-06 后续调查：山阳こだま逐车车型核实 + 500系原生 PNG

**最新 Supabase 直接回读：826 个原始新干线源模板，674 条独立完整官方列车番号证据，164 条安全精确 PNG，431 条有单一计划车型，395 条没有唯一计划车型；实际当日车底确认证据为0。**

| 线别 | 模板 | 完整番号证据 | 精确 PNG |
|---|---:|---:|---:|
| 秋田 | 45 | 45 | 45 |
| 北海道 | 26 | 26 | 0 |
| 北陆 | 72 | 66 | 0 |
| 上越 | 18 | 18 | 18 |
| 九州 | 159 | 86 | 20（800系） |
| 西九州 | 92 | 90 | 0（N700S缺图） |
| 山阳 | 154 | **126** | **7（500系3、700系4）** |
| 东北 | 82 | 81 | 35 |
| 东海道 | 132 | 93 | 0 |
| 山形 | 46 | 43 | 43 |
| **合计** | **826** | **674** | **168** |

**新增迁移（均直接 main 且已在现有 Supabase 执行）**：

1. [こだま944/954/958/966：4条官方完整番号+4条逐车车型，其中2条500系精确PNG](../../supabase/migrations/20261106093000_sanyo_kodama_four_source_verified_500_700_numbers_two_native_500_png.sql)。500系：`944A`、`954A`；700系：`958A`、`966A`。每项校验原模板 ID、Weekday、JR West 所属、首末站和发到时刻，以及官网11月个别车次页面，链接分别为 [944A](https://timetable.jr-odekake.net/train-timetable/315471?date=20261128)、[954A](https://timetable.jr-odekake.net/train-timetable/315521?date=20261101)、[958A](https://timetable.jr-odekake.net/train-timetable/315541?date=20261110)、[966A](https://timetable.jr-odekake.net/train-timetable/315591?date=20261101)。
2. [こだま876/970/974/976：4条官方完整番号、3条唯一计划车型和1条500系精确PNG](../../supabase/migrations/20261106095500_sanyo_four_more_kodama_numbers_only_dated_970_and_974_native_500.sql)。700系：`876A`、`976A`，暂无对应 JR West 本家原生 PNG；500系：`974A`（PNG精确单号）。**`970A`只补番号，禁止固定500或700图**，因为 JR West 11月个别列车官方页虽然主栏显示700系，但备注明确列出11月多个特定日期改用500系：[970A 日期例外来源](https://timetable.jr-odekake.net/train-timetable/315611?date=20261104)。日期换型应由已有按日期的运营规则负责，不能把整个weekday或 `970..976A` 变成一张500 PNG。
3. [已增强既有 PNG 合约测试](../../tools/train-png-display-contract.test.cjs)：500系在SanyoShinkansen可解析现有 `../images/列车/JR西日本/JR西日本_500系.png`；若在线路上下文为KyushuShinkansen则不能借用500系；700系找不到同公司对应原生图库时维持中性图。无需修改规范车型图库：`planned-stock-library-27` 原先已经有 `lineIds:["SanyoShinkansen"]`。

**资产审计**：GitHub 现有 JR 西日本图片只含 500系、N700系及N700系7000番台，**没有 700系原生PNG**；Supabase `vehicle_image_assets` 亦没有该公司的700系记录。不能以500或N700冒充，也不能仅以是否为「こだま」推断。

**存量缺口**：152 条正式番号尚无独立证据（九州73、东海道39、山阳28、北陆6、山形3、西九州2、东北1）。尽管部分线路可从JR East总表识别同名/号次，仍需核对车次来源、方向、运行日和特殊编号。最新所有164条精确PNG均为单号 `min=max`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`。代码级CI与GitHub Pages成功/失败状态应分别检查；本轮没有进行Safari实机图片显示验收。

## 2026-11-06 用户补充 JR 西日本700系 PNG：已入库并落到4趟正式车次

**最新 Supabase 回读（该节覆盖前文“164 PNG/缺700图”的历史记录）**：新干线 826 个源模板、674 条官方完整番号、431 条已核实单一计划车型，精确 PNG **168 条**（20.3%）；当天物理编组确认证据仍为 **0**。

- 用户直接上传 82×98 调色板透明像素 PNG，保存为 [`images/列车/JR西日本/JR西日本_700系.png`](../../images/列车/JR西日本/JR西日本_700系.png)。为收缩调色板做了**逐像素 RGBA 完全相同**的无损 PNG 优化（966字节）；透明区域保留。GitHub Blob SHA: `fdd1679c3fc3dab7b49f096ddf4db7b03a27fdc9`。此素材是**用户提供的通用车型图**，不代表证实某趟列车、具体编组、车辆号或外观涂装。
- 已在既有 [`js/train-vehicle.js`](../../js/train-vehicle.js) 规范车型目录新增 `700系（JR西日本）`，限定 `lineIds:["SanyoShinkansen"]`，并在原有 [`vehicle-garage-png-map.js`](../../data/timetables/vehicle-garage-png-map.js) 中登记同一图库路径与唯一车型映射（580张图库PNG、598条规范车型引用）。没有增加 HTML script src 或独立映射脚本。
- [资产与4条精确 PNG SQL 迁移](../../supabase/migrations/20261106104000_user_jrwest_700_artwork_four_exact_sanyo_png.sql) 已执行。原生图片写入 **`vehicle_image_assets` ID=581**，运营者 `JR-West`、`vehicle_type=700系`、`asset_scope=generic`、`is_generic=true`、`file_format_status=native_png`。
- 在已存在 `published_train_number_evidence` 以及 A 级官网 `official_service_vehicle_plan` 的前提下，只给山阳新干线平日 **`876A`、`958A`、`966A`、`976A`** 各添1条 `min_number=max_number` 的700系 PNG。对应 [876A](https://timetable.jr-odekake.net/train-timetable/315601?date=20261119)、[958A](https://timetable.jr-odekake.net/train-timetable/315541?date=20261110)、[966A](https://timetable.jr-odekake.net/train-timetable/315591?date=20261101)、[976A](https://timetable.jr-odekake.net/train-timetable/315631?date=20261101)，没有新增或臆测官方车型/车次。
- **`970A` 仍然无固定 PNG**：官网11月多日700系与500系换型例外，不能把整月通用型图覆盖它。全部168条新干线 PNG 在 SQL 回读中 `min=max`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`，违规宽范围为0。
- 已在原有 [`vehicle-garage-png-map.test.cjs`](../../tools/vehicle-garage-png-map.test.cjs) 与 [`train-png-display-contract.test.cjs`](../../tools/train-png-display-contract.test.cjs) 更新图库完整性计数及跨线禁止引用等测试；[该提交 PNG 全套测试通过](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42105425319)。GitHub Pages 还需要独立确认新版部署结果，iPhone Safari 仍未实机验收。

**入库提交**：[`d303c0ff6e81c57716ec02a774a37aeef860499f`](https://github.com/biubiu52011/pixel-tetsudo/commit/d303c0ff6e81c57716ec02a774a37aeef860499f)，直接 `main`，没有 PR、新 SQL 表或额外 src。

## 2026-11-06 新增调查：875A/956A/880A 700系原生PNG、四条跨线ひかり的山阳段

**本节为最新实库统计，取代上文阶段性数字**：新干线模板826条、2026年11月官方完整番号**681**条（82.4%）、唯一计划车型**439**条（53.1%）、精确原生PNG**171**条（20.7%）、当天实际车底确认**0**。本轮从674/431/168分别增加7个番号、8个车型计划和3个PNG单号。

### JR西日本700系通用原生PNG新增三趟

[本轮原SQL迁移](../../supabase/migrations/20261106111000_jrwest_2611_three_kodama_700_native_png_source_exact.sql)直接复用此前用户提供的JR西日本700系82x98原生素材、既有车型库和资产表，无重复素材或脚本。

- **875A／こだま875**：[JR西日本2611官网](https://timetable.jr-odekake.net/train-timetable/315371?date=20261108)显示700系8辆、广岛06:05发、博多07:33到、每日运行。与源模板9277（Weekday）及128895（SaturdayHoliday）分别匹配；原有weekday正式番号保留，新补holiday号码，两个日历仅生成**一条**875A单号PNG。
- **956A／こだま956**：[官网](https://timetable.jr-odekake.net/train-timetable/315531?date=20261110)：700系8辆、博多13:51发、17点以后新大阪18:25到；Weekday源模板9349。
- **880A／こだま880**：[官网](https://timetable.jr-odekake.net/train-timetable/315641?date=20261119)：700系8辆、博多22:20发、新下关22:46到；Weekday源模板9373。

三趟分别新增700系 **875A、956A、880A** 原生 PNG 精确单号；4条源模板独立列车级官方A类车型证据全部核查成功。单号条件 min=max、requires_exact_roster=true、actual_vehicle_confirmed=false，不扩大为连续8xx、9xx号段。

### 四趟跨线ひかり只登记山阳段

[本轮原SQL迁移](../../supabase/migrations/20261106115500_sanyo_four_hikari_2611_a_numbers_n700_plan_only.sql)只对下面4条山阳新干线现存平日源模板写入正式番号与N700系计划车型，**不生成N700精确PNG**，也不擅自锁定JR西日本/JR东海具体实车：

- **702A**：[官网](https://timetable.jr-odekake.net/train-timetable/314471?date=20261111) 冈山08:42→新大阪09:46。
- **708A**：[官网](https://timetable.jr-odekake.net/train-timetable/314501?date=20261121) 冈山11:36→新大阪12:46。
- **714A**：[官网](https://timetable.jr-odekake.net/train-timetable/314531?date=20261104) 冈山14:36→新大阪15:46。
- **718A**：[官网](https://timetable.jr-odekake.net/train-timetable/314551?date=20261122) 冈山16:36→新大阪17:46。

**查到旧东海道源时刻问题，停止跨线强制合并**：上述四车的东海道原始模板把新大阪第一条departure_clock记录为09:46/12:46/15:46/17:46，即官网的到站时刻；官网继续往东京的实际公布发车时刻分别是09:48/12:48/15:48/17:48。旧模板东京到站则全部晚于2611官网1分钟（如702原12:43、官网12:42）。源责任位于 data/timetables/TokaidoShinkansen-manual.js 和既有SQL模板，应先进行源数据时刻修复与版本核对，不能直接修改四条东海道段的正式号码或以补丁掩盖导入问题。本轮没有改动其任何时刻记录或正式番号。

### 970A的精确日期计划，但未升级为实际车底

[JR西日本2611官方970A](https://timetable.jr-odekake.net/train-timetable/315611?date=20261104)备注：11月2–4、6–7、9–12、14–18、20–21、23–24、26–27、29–30，共**22天**预计500系；11月1、5、8、13、19、22、25、28，共**8天**按主栏计划700系。随时可能临时更换。现有 train_vehicle_date_rules 和 operation_vehicle_date_rules 的应用语义属于日期车辆证据，不可仅凭计划将其写成当天已确认的实际派车。故970A继续没有任何静态单车型PNG或实际车底标记，等待现有日期分级机制查清再处理。

### 安全与后续

本批迁移均已commit至main、原库实际执行并回读；没有建立新SQL表、任何新script入口、本地服务器或PR。现有171条PNG严格都是min=max、requires_exact_roster=true、actual_vehicle_confirmed=false；相关原生700系图库本轮没有修改。剩余**145**个已存在模板无2611完整番号（九州73、东海道39、山阳21、北陆6、山形3、西九州2、东北1），另外**387**个缺唯一车型计划。公开Pages CI成功与iPhone Safari实际显示必须分开验收。


## 2026-11-06 追加：计划列车映射口径与山阳3趟ひかり

**用户确认新干线与其他手工线路相同，显示“计划列车”而非实时实车。** 正式番号是官网计划编号，车型来源为官网单一系列计划或明确候选；显示位置按时刻表推算，不写入实际编组身份。不因 `actual_vehicle_confirmed=false` 否决本来就有证据的计划车型；但也不能凭名字、后缀或线路把N700A/N700S、E5/H5、E7/W7或JR公司车底所有权猜成唯一车型。

本轮依据[JR东日本2611 ひかり704](https://timetables.jreast.co.jp/2611/train/125/128731.html)、[JR东日本2611 ひかり720](https://timetables.jreast.co.jp/2611/train/125/128811.html)、[JR西日本2611 ひかり682](https://timetable.jr-odekake.net/train-timetable/314441?date=20261103)逐趟核验；已按源模板ID、Weekday、SanyoShinkansen、JR-West、Inbound、首末站和发到时刻锁定既有数据库源，且证据与 `source_only` 主成员一一对应：

| 原服务名 | 官方完整番号 | 源模板ID | 首发／末到 | 唯一计划车型 | PNG |
|---|---|---:|---|---|---|
| ひかり682 | 682A | 9371 | 博多20:52 → 新大阪23:32 | N700系（计划家族） | 未绑定 |
| ひかり704 | 704A | 9338 | 冈山09:36 → 新大阪10:46 | N700系（计划家族） | 未绑定 |
| ひかり720 | 720A | 9363 | 冈山17:36 → 新大阪18:46 | N700系（计划家族） | 未绑定 |

直接main迁移：[20261106064000_sanyo_three_hikari_2611_exact_numbers_n700_plan.sql](../../supabase/migrations/20261106064000_sanyo_three_hikari_2611_exact_numbers_n700_plan.sql)，已在现有Supabase执行并读回3条精确官方番号和 `official_service_vehicle_plan`。**最新总数684/826正式番号，442/826唯一计划车型，171/826 PNG；另有142条编号和384条计划车型未补。** 现有171 PNG的宽范围=0、非exact=0、假实车标记=0。没有新增SQL表、PNG路径、脚本src、PR或本地服务器。

剩余问题：山阳のぞみ34/40/46等原始SQL存储“新大阪发车时刻”作为山阳段末到时刻（官网真实到站早2分钟），东海道部分ひかり同样存在首发时刻与官网版次差异。此类原始时刻错误必须先查清源脚本与SQL责任归属再同步修复，**不能为了提高番号数量忽略站时一致性**。真实Pages/Safari图像逐车验收未进行，因此仍为“进行中”。
