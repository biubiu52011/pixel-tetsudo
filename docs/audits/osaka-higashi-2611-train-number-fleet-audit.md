# JR西日本 おおさか東線（大阪东线）：2026年11月列车番号／时刻表／车辆映射审计

更新：2026-11-07。范围：像素铁道 `OsakaHigashi`（`odpt.Railway:JR-West.OsakaHigashi`），不包括大阪环状线；直通快速与大和路线连接边界须另外证明。

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
| 未证实当前适用的其它 2 站 M 记录 | 1 | 2 | 3 |
| 有官发布源和源站序/时刻指纹的示范记录 | 3 | 3 | 6 |

- 原始导入中的 **379 条记录全部被标成 `Local`**，包含直通快速与旧的特急片段。新的单独 source-family 证明表不修改原导入表；16 条车次号 `21xxM` 与官方 2026 站序、列车种别交叉校验后，在接口公开层显示为 `直通快速`（`Rapid`）。
- 土休日 `2402SH` / `2101MH` 等末尾 **H 仅是该导入器对日历的标识**：公开号码分别为 `2402S` / `2101M`。**不全库移除 H**，也不重写 canonical 身份或原始列车号。
- `2535S` 和 `2537S` 仅为 **久宝寺→放出 8 站普通列车**，不是大阪→久宝寺 15 站全程列车；不能错误拒绝或补造前半段。
- 单站 94 条不插值、不匹配同站同分钟异编号的 25 组候选，不升格为全天时刻表。
- 仅 6 条原始源模板具有完整站序、到发时刻指纹与逐车次官方来源对应，因此升级为 `date_verified`；其它 276 条为 `undated_not_current_verified` 的**来源参考**。
- 当前 2026-11 无匹配的新特急 `9081M` / `9082M` 暂不以旧来源 `1091M` / `7092MH` / `9024MH` 冒名，3 条旧的两站 M 源只在本月接口被临时隔离，原始 SQL 保留。

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
- 特急まほろば：2026年秋季官方宣传为 683系 3 辆「安寧／悠久」，但属于不同车次和运行日，必须按独立、当前官方番号＋日期＋列车类型映射；这里未对缺失的特急运用强制绑定。
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

**边界**：这只修复已有 282 条2026-11 source-family范围内的定期普通／直通快速视觉车型映射，不让已隔离的3条旧特急片段或94条单站残缺片段凭空出现车型；特急まほろば须有另行许可且可复核的现行车次数据。没有采集到当天真实NA/NB编组的运用证据，因此不标记具体列编号。仅完成仓库静态/逻辑测试，尚未证实在最终用户浏览器中的实际页面渲染。

## 验证与未解决事项

- 数据库迁移已应用；282 条 source-fleet 记录与 6 条 exact clock evidence 通过约束、计数和 invoker 哈希复核。
- `train-runs` v348 已部署；两段浏览器 JS 通过语法检查；`tests/osaka-higashi-2611-number-fleet.test.cjs` 共 4 项回归断言通过。
- 尚未在浏览器完成对部署接口的真实 GET 与页面渲染端到端测试，**部署成功不代表前端显示绝无问题**。
- 下一步：以获许可/可重用资料完成 94 条单站来源的边界重建、全日历双方向的逐车次钟点验证、奈良直通段 Canonical 衔接、特急 9081M/9082M 的独立季节运用校验。
