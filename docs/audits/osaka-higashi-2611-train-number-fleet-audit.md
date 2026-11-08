# JR西日本 おおさか東線（大阪东线）：2026年11月列车番号／时刻表／车辆映射审计

更新：2026-11-08。范围：像素铁道 `OsakaHigashi`（`odpt.Railway:JR-West.OsakaHigashi`），不包括大阪环状线；直通快速与大和路线连接边界须另外证明。

## 优先复用的数据层

- 原始数据库：`manual_timetable_templates` / `manual_timetable_template_stops`，`source_path=data/timetables/OsakaHigashi-manual.js`；**原 JS 文件在 main 不存在**，原始 SQL 停站不作改写。
- 原有不完整源隔离：`supabase/functions/train-runs/index.ts` 在 canonical / 车辆判定前过滤单站来源；保留原始证据。
- 主要车队预设：`data/core/major-vehicle-fleet-presets.js` 已有 `jrwest-osaka-higashi` 221系；不增设第二套图标猜测器。
- 本轮补充表：`published_jrwest_osaka_higashi_2611_source_fleet`、`published_jrwest_osaka_higashi_2611_verified_source_clocks` 与 invoker 视图 `published_jrwest_osaka_higashi_2611_clock_evidence`。

## 数据质量与处理结果

| 项目 | Weekday | SaturdayHoliday | 合计 |
|---|---:|---:|---:|
| 既有模板 | 189 | 190 | 379 |
| 仅新大阪单站片段 | 46 | 48 | 94 |
| 可核对的普通列车源记录 | 134 | 132 | 266 |
| 可核对的直通快速源记录 | 8 | 8 | 16 |
| 需独立核对的两站特急源记录 | 1 | 2 | 3 |
| 有官发布源和源站序/时刻指纹的示范记录 | 3 | 3 | 6 |

- 原始导入中的 **379 条记录全部被标成 `Local`**，包含直通快速与旧的特急片段。新的单独 source-family 证明表不修改原导入表；16 条车次号 `21xxM` 与官方 2026 站序、列车种别交叉校验后，在接口公开层显示为 `直通快速`（`Rapid`）。
- 土休日 `2402SH` / `2101MH` 等末尾 **H 仅是该导入器对日历的标识**：公开号码分别为 `2402S` / `2101M`。**不全库移除 H**，也不重写 canonical 身份或原始列车号。
- `2535S` 和 `2537S` 仅为 **久宝寺→放出 8 站普通列车**，不是大阪→久宝寺 15 站全程列车；不能错误拒绝或补造前半段。
- 单站 94 条不插值、不匹配同站同分钟异编号的 25 组候选，不升格为全天时刻表。
- 仅 6 条原始源模板具有完整站序、到发时刻指纹与逐车次官方来源对应，因此升级为 `date_verified`；其它 276 条为 `undated_not_current_verified` 的**来源参考**。
- 2026-11官方复核：`7092MH` / `9024MH` 分别是土休日现行特急`7092M` / `9024M`的日历导入形式，已恢复为特急683系3辆的两站证据。仅`1091M`需隔离，因为其实际行程经由大阪环状线，不应画在大阪东线。缺少的平日`9081M` / `9082M`不能用历史车次冒名。

## 已核对的 6 条精确源时刻（无需复制整个官方时刻表）

| 公开车次 | 日历 | Source 编号 | 校验范围 |
|---|---|---|---|
| 2402S | 平日 | 2402S | 大阪→久宝寺，15 站 |
| 2402S | 土休日 | 2402SH | 大阪→久宝寺，15 站，时分与平日部分不同 |
| 2101M | 平日 | 2101M | JR河内永和→大阪，8 站 *部分直通快速* |
| 2101M | 土休日 | 2101MH | JR河内永和→大阪，8 站 *部分直通快速* |
| 2110M | 平日 | 2110M | 大阪→久宝寺，9 站 *部分直通快速* |
| 2110M | 土休日 | 2110MH | 大阪→久宝寺，9 站 *部分直通快速* |

**重要：** 2101M 的 SQL 源从 JR河内永和才有记录，2110M 的 SQL 源在久宝寺终止。2026 官方直通快速起讫为奈良↔大阪，但**不能把缺失的大和路线部分插值为完整行程**，也不得将具有不同 `line_key` 的模板按时间相近强制合并。

## 车型约束

- 普通 24xxS/25xxS：**JR西日本221系（6辆）**作为当前线路车队参考；
- 直通快速 21xxM：**JR西日本221系（8辆）**作为当前线路车队参考，不能继续映射到2023年前的207系/321系；
- 特急まほろば：本月`7092M`与`9024M`的原始大阪→新大阪双站时刻已核验，计划车型为683系3辆；并无当天安寧/悠久编组证据，且图库缺少正确专用涂装图，故只显示文字，不滥用普通683系图片。
- 所有 source-only 221 系候选均保留 `referenceOnly=true`、`actualVehicleConfirmed=false`、`authorizesPNG=false`、`candidate_png_paths=[]`。不捏造具体列编号、涂装、车辆图标或实时已观测列车。
- `vehicle_type_label` 不会被此映射强制赋予车型，原始编组信息仍为未知。

## 资料与版权边界

官方区间表（2026-11-04）：
- [大阪→久宝寺/奈良（下り）](https://timetable.jr-odekake.net/line-timetable/2310?day=4&month=11&year=2026)
- [奈良/久宝寺→大阪（上り）](https://timetable.jr-odekake.net/line-timetable/2311?day=4&month=11&year=2026)

核对示例：
- [普通 2402S 平日](https://timetable.jr-odekake.net/train-timetable/242121?date=20261023)
- [普通 2402S 土休日](https://timetable.jr-odekake.net/train-timetable/242131?date=20261024)
- [直通快速 2101M 平日](https://timetable.jr-odekake.net/train-timetable/243201?date=20261028)
- [直通快速 2101M 土休日](https://timetable.jr-odekake.net/train-timetable/243211?date=20261031)
- [直通快速 2110M 平日](https://timetable.jr-odekake.net/train-timetable/323591?date=20261104)
- [直通快速 2110M 土休日](https://timetable.jr-odekake.net/train-timetable/323441?date=20261017)
- [短程普通 2535S](https://timetable.jr-odekake.net/train-timetable/156211?date=20261023)
- [短程普通 2537S](https://timetable.jr-odekake.net/train-timetable/156221?date=20261028)
- [2026 秋季まほろば与 683系](https://prtimes.jp/main/html/rd/p/000002217.000095753.html)
- [2023 直通快速221系更新报道](https://railf.jp/news/2023/03/19/063000.html)

JR おでかけネット对时刻表有版权及无授权转载/复制/加工限制。本轮仅核验原项目已经存在的少量来源记录，保存原始行校验指纹、出处及类型判定；不批量复制官方时刻表。

## 2026-11-07 追补：车辆图片未显示的原因及修复

用户发现上一版虽然把 282 个原始来源列车关联到 `221系`，但网页仍无车头图片。原因不在时刻表条数：`train-runs` 原本只给 `candidate_models=['221系']` 且 `authorizes_png=false`，前端 `_osakaHigashiScoped` 又清空了 `vehicleIconPath`；同时图片目录 `vehicle-garage-png-map.js` 的既存 `JR西日本_221系_N.png` 不允许 `OsakaHigashi` 线路。

已按现有统一渲染规则修复，不新建一套图片解析器：
- `data/timetables/vehicle-garage-png-map.js`：只将既存 **221 N** 代表素材加入大阪东线使用范围，不把历史的207系/321系解释为当前普通/直通快速车辆。
- `js/train-vehicle.js`：规范目录增加大阪东线 `221系` 唯一 scoped alias；`selectMarkerArtwork` 验证 SQL 来源标记、线路、2026-11月份、公开列车号与原始 `H` 日历后缀、停站顺序和计划候选，再返回 `planned + illustrative + representativeOnly` 的221系图片。**数据库 `authorizes_png=false` 保持不变**，意味着不能从来源证明“这列车当天是图库 N 编成”；代表图单独具有已确认的车型用途，不是实际编成授权。
- `js/train-position-estimator.js`：计划状态从内部未知 `UNCONFIRMED_FLEET` 改为可呈现的 `FLEET_REFERENCE`；**`vehicleIdentityStatus` 不升级为 `EXACT`**，`vehicleType` 与实车编组不凭候选自动填写。
- `js/trains-render.js`：普通显示“线路车型：221系（6辆，实际编组未确认）”，直通快速显示“线路车型：221系（8辆，实际编组未确认）”，并将代表图无障碍提示明确为“车型示意”。
- `pages/trains.html`、`pages/home.html`、`pages/realtime.html`：刷新相应静态脚本查询版本，避免浏览器继续使用旧 `train-vehicle.js` 和旧图库。
- `tests/osaka-higashi-2611-vehicle-render.test.cjs`：真实渲染分支抽样执行、既有图库匹配、号码/站序/日期/线路/车型错配拒绝、6辆／8辆文字和页面缓存校验均通过。

**边界**：定期普通／直通快速282条使用221系代表图；另恢复2条具有官方时刻证据的まほろば原始两站记录，车型系列为683系但无正确涂装PNG。`1091M`非本线行程仍隔离，94条单站残缺片段也不推算位置。任何记录均不冒充当天实际NA/NB或安寧/悠久编组。尚未在最终用户浏览器完成真实画面端到端验证。

## 2026-11-08 まほろば源记录纠正（已发布 v349）

JR西日本2026年11月官方时刻表说明，原SQL中的 `7092MH` 与 `9024MH` **不是已退出的特急**。它们是本月土休日的 `7092M`（まほろば）及 `9024M`（まほろば92号），`H` 是原导入日历标志。

| 原始源号 | 公开车次 | 原始可证实区间 | 车型参考 | 特定涂装 |
|---|---|---|---|---|
| 7092MH | 7092M（特急まほろば） | 大阪→新大阪 | 683系3辆 | 安寧／悠久未确认 |
| 9024MH | 9024M（特急まほろば92号） | 大阪→新大阪 | 683系3辆 | 安寧／悠久未确认 |

- 数据表：`published_jrwest_osaka_higashi_2611_special_segments` 与安全调用者视图 `published_jrwest_osaka_higashi_2611_special_clock_evidence`。两个源的双站时刻、车次、日历和原始MD5指纹都匹配；RLS启用，`authorizes_png=false`。
- Edge Function `train-runs` **v349**：只恢复这两条**大阪→新大阪两站原有时刻**，公开编号去掉导入用H，列车类型为特急，车辆计划参考683系。不能推算新大阪经由本线去奈良的未知通过时刻。
- 前端：保留公开7092M／9024M和爱称，计划车型683系3辆、当日实车编组未确认。仓库已有普通683系素材，但没有经过校验的「安寧／悠久」专用涂装图，故保持中性位置标记，不拿其他涂装冒名。
- `1091M` 是经大阪环状线的「らくラクやまと」：虽然原SQL按大阪东线错误导入，但没有本线通过证据，继续隔离；平日加班的 `9081M`／`9082M`仍待独立运转日和原时刻来源。

官方依据：[7092M](https://timetable.jr-odekake.net/train-timetable/279101?date=20261101)、[9024M](https://timetable.jr-odekake.net/train-timetable/275461?date=20261101)、[1091M](https://timetable.jr-odekake.net/train-timetable/258721?date=20261008)、[まほろば车辆与运行](https://www.jr-odekake.net/railroad/mahorobalimitedexpress/)。

## 验证与未解决事项

- 数据库迁移已应用；282 条 source-fleet 记录与 6 条 exact clock evidence 通过约束、计数和 invoker 哈希复核。
- `train-runs` v348 已部署；两段浏览器 JS 通过语法检查；`tests/osaka-higashi-2611-number-fleet.test.cjs` 共 4 项回归断言通过。
- 尚未在浏览器完成对部署接口的真实 GET 与页面渲染端到端测试，**部署成功不代表前端显示绝无问题**。
- 下一步：以获许可/可重用资料完成 94 条单站来源的边界重建、全日历双方向的逐车次钟点验证、奈良直通段 Canonical 衔接、特急 9081M/9082M 的独立季节运用校验。

## 2026-11-08 线上 v349 复核与诊断修复

本节取代上文“尚未真实 GET”及“9081M/9082M 运转日未核实”的旧状态，**不表示新增完整时刻或完成单站来源修复**。

- 生产函数清单确认 `train-runs` ACTIVE v349；下载函数正文，与审计基线 `85d50ebe215408c84e427bb384b603efae48d6aa` 的 `supabase/functions/train-runs/index.ts` 在统一换行后逐字相同。
- 已对生产接口执行真实 GET（`line_id=OsakaHigashi`），不是仅凭部署成功判断。三次均 HTTP 200、`complete=false`、`partial=true`：

| 服务日 | 返回源记录 | 单站隔离 | 特急错误源隔离 | 全部遗漏源记录 | 日期已核实记录 |
|---|---:|---:|---:|---:|---:|
| 2026-11-08（土休日） | 142 | 48 | 0 | 48 | 5 |
| 2026-11-09（临时特急运转平日） | 142 | 46 | 1 | 47 | 3 |
| 2026-11-16（非临时特急运转平日） | 142 | 46 | 1 | 47 | 3 |

上述条数是**源记录**，不是核实的全日班次数或缺失列车数。土休日5条日期证据=3条原有钟点证明+2条まほろば双站证明。平日隔离1条为错误线路源 `1091M`；不能据此认为缺少的 `9081M/9082M` 已加入。

### 单站来源与指纹

生产库只读复核仍为379条模板、94条新大阪Inbound单站来源（平日46、土休日48）；94条都有到达时刻，62条还有发车时刻。25组候选使用“到达或发车任一相等”的口径；如果要求两者同时相等，只剩1组，二者不能混称为25组完整时刻匹配。候选列车号均不同，不自动合并。6条普通/直通快速钟点指纹全部匹配；2条特急双站指纹也匹配，PNG授权仍为false。

可重跑的[只读审计SQL](osaka-higashi-2611-readonly-audit.sql)保留计数和指纹查询，没有更新/删除语句。原导入JS仍未在main找到；94条片段没有获得可恢复全程的原始证据，继续隔离。

### 平日临时まほろば：已查明、未导入

[JR西日本2026-08-21公告](https://www.westjr.co.jp/press/article/2026/08/21/items/260821_00_press_mahoroba.pdf)和逐车次页面互相印证：

| 公开车号 | 爱称 | 已证实方向 | 2026年11月运转日 | 原SQL来源 |
|---|---|---|---|---|
| 9081M | まほろば81号 | 奈良→大阪 | 2、4–6、9–13日（9天） | 无 |
| 9082M | まほろば82号 | 大阪→奈良 | 同上 | 无 |

车号来源：[9081M](https://timetable.jr-odekake.net/train-timetable/388591?date=20261110)、[9082M](https://timetable.jr-odekake.net/train-timetable/388581?date=20261102)。公告确认计划车型683系3辆，允许安寧或悠久且可能代车，不证明当日具体编组。不把旧1091M改号，也不把土休日7092MH/9024MH复制到平日。中途通过站没有可用通过钟点，不插值成逐站位置。**本轮未写入生产SQL或部署Edge函数，v349仍没有这两条平日临时计划。** 后续必须在现有计划导入与Canonical来源链中录入带9日运行日集合的独立来源，再验证运行/非运行日期，不能仅加一条车型规则伪装成时刻表已补齐。

### 本轮实际最小修复及回归

- 问题在统一客户端 `getCachedTrainRuns` 的状态投影：v349已返回 `suppressed_unverified_osaka_higashi_special_sources`，前端却只保留单站及时间倒退隔离数。现在保留 `suppressedUnverifiedOsakaHigashiSpecialSources`，使平日47条遗漏可解释为46+1；不改变源班次、车型、PNG或位置逻辑，不重复累计总数，`missingTrainCount`仍为null。
- `tools/route-timetable-service-calendar.test.cjs` 执行实际缓存读取函数，覆盖1/0/缺省计数及来源完整性；`tests/osaka-higashi-2611-mahoroba-special.test.cjs` 新增服务器字段→实际SQL适配器→位置估算器→图片选择器回放，确认7092M/9024M公开编号、特急、683系参考、两站范围和无PNG，并确认取消计划不会产生时刻表。
- Pages实际HTML已HTTP 200回读，其核心脚本查询版本与此前まほろば修复一致。当前 `static.yml` 已恢复main push自动发布，与旧文档“仅手动发布”不同；本轮不改发布工作流。HTML回读/离线流水线不代替真实浏览器SVG验收。
- 更新客户端后使用既有脚本清单生成器同步七页标签。生成器同时纠正基线已陈旧的脚本查询键及非清单标签；发布检查还发现既存 `ux-refinements.css` 查询键过期，按现有CSS的真实blob哈希刷新六页引用，未改CSS正文或图片。大阪东线测试与诊断回归已接入既有PNG CI。

### 续查：线上已为 v351（2026-11-08）

提交前重新读取生产函数：`train-runs` 已由其他任务升级为 **ACTIVE v351**。下载正文与 `53a88c7` 的 `supabase/functions/train-runs/index.ts` 统一换行后完全相同。上文 v349 正文比较属于先前审计快照，不应当作当前部署版本；本轮没有重部署函数。

重新对 11/08、11/09、11/16 执行实际 HTTP GET：均 200，分别单站隔离 48/46/46、错误特急源隔离 0/1/1、总遗漏 48/47/47，各 142 条源记录，日期证据 5/3/3，均 `complete=false, partial=true`。三日均无 `9081M/9082M`。生产 SQL 再查确认平日189模板/46单站、土休日190模板/48单站；6/6钟点指纹匹配，2/2特急双站指纹匹配且无PNG授权；异编号候选仍25组，双钟点相同仅1组。

再次打开公告及两个逐车次官方页面，确认9个运行日与车次方向。公告提供的是停靠站时刻，逐车次页面中本线中间站为通过标志，没有可用于逐站定位的时刻。本轮保留独立临时计划尚未导入的缺口，不把运行日核实表述为时刻表导入完成。

吸收 main 至 `53a88c7`，保留山阳、福知山及运行信息的并发修改。大阪东线两处旧测试将脚本哈希写死，遇到福知山更新即失败；改为计算当前素材的 Git blob SHA-1 前12位并核对页面标签，继续拒绝陈旧缓存键。核心真实适配器、隔离诊断、图片选择及脚本清单回归 **34/34通过**。完整工作流结果以下述最终提交记录为准，旧基线的6个失败不作为新 main 的当前结论。
