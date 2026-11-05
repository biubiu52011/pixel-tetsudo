# 久留里線（Kururi）— 2026 年 11 月车辆／列车番号／停运区间映射

本次沿用现有 `Kururi` 线路键及共享 `jreast-regional-2611-number-index.js`，不另建独立加载脚本，不改动原始 SQL 逐站时刻，不建立 PR。

## 2026-11 的实际铁路运行区间

**木更津—久留里：铁路正常班次；久留里—上総亀山：台风 25 号受灾、铁路停运，巴士／出租车代行。** JR 2026 年 10 月宣布后者不再复旧，代行持续至 2027-03-31，计划于 2027-04-01 废线。虽然 JR 2026 年 11 月的纸面时刻表仍列出上総亀山的 D 列车番号，不能把这些“纸面列车”画成实际柴油车。

参考资料：
- [JR 東日本 2611 久留里線下り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/217d1.html) / [土休日](https://timetables.jreast.co.jp/2611/timetable-v/217d2.html)
- [JR 東日本 2611 久留里線上り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/217u1.html) / [土休日](https://timetables.jreast.co.jp/2611/timetable-v/217u2.html)
- [JR 東日本 久留里線运行情报](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=1&lineid=kururiline)
- [木更津市 2026-11-05 通告](https://www.city.kisarazu.lg.jp/kurashi/doro_kotsu/bus_densha/1/10805.html)
- [JR 東日本 キハE120・キハE130 系车辆资料](https://www.jreast.co.jp/train/local/kiha_e130.html)
- [JRE 媒体：久留里線的 キハE130形100番台](https://media.jreast.co.jp/articles/6466)

## 车型及编号对应

`キハE130形100番台` → `../images/列车/JR東日本/JR東日本_キハE130系100番台.png`（沿用图库现有 PNG）。

| 范围 | 2026-11 处理 | 项目所存数量（每种日历） |
|---|---|---:|
| 920D–953D 内官方列出的 34 个 D 编号 | 只允许木更津—久留里铁路段，示意图使用 キハE130形100番台 | 34 |
| 其中 11 个历史时刻表跨越久留里站到上総亀山 | 裁去受灾段，只保留已有 SQL 中的开放区间 11 个原始站点与到发时刻，不增加站点或推造时刻 | 11 |
| 2941D、2943D、2949D（下り）；2944D、2946D、2952D（上り） | 专属于久留里—上総亀山区间，全数停运；不生成铁路位置，也不授权 PNG | 6 |
| 原始列车番号（日历合计） | 40 个不同番号 × 平日与土休日 = 80 SQL 模板 | 80 |

经 SQL 比对：每种日历 23 个原生开放区间行、11 个原历史直通截断行、6 个关闭区间行，共 40；全年与未来版本不从 2026-11 的临时运行状态猜测。

## 复用现有代码结构

- Migration: `20261106004500_kururi_2611_rail_only_kie130_exact_roster.sql`，新增 `published_kururi_2611_rail_vehicle_roster`：80 条官方号码/来源/全站序与铁路段 11 站序的映射；现有 `published_train_number_evidence` 添加 80 条号码证据；`published_train_png_number_ranges` 只对 **920D–953D** 有铁路 PNG 区间，并且必须逐条匹配 roster。
- `supabase/functions/train-runs/index.ts` 对 2026 年 11 月从数据库读取上述证据，校验 source railway、方向、日历、列车类型、完整原始站序、车系、PNG 及区间。6 个 closed-only 班次从实际铁路列表剔除；11 个历史 through 仅裁原始 14 站为开放区间 11 站。
- `jreast-regional-2611-number-index.js` 保留原 40 列车号码索引，同时标记闭塞段 6 个列车号的铁路运用无效。
- `train-number-png-ranges.js` 内 `verifyKururiService` 严格验证 SQL 证明、日期、11 个开放段站序及图库 PNG；`train-position-estimator.js` 在计划列车图上调用同一个校验，源不能验证就不造列车。
- PNG 始终代表**计划车型族**；绝不代表实际车组、车辆番号或 GPS 观察位置。历史 SQL 站点时钟没有被单独再认证为 2611 的全站时刻。
- 自动化测试：`node --test tests/kururi-2611-open-rail-number-png.test.cjs`；既有 `tests/jreast-regional-2611-number-png.test.cjs` 和 `tests/train-number-png-runtime.test.cjs` 同步更新，以排除原先将已停运 294xD 绘为铁路的测试假设。

## 验证

2026-11-06 SQL 复核：`published_kururi_2611_rail_vehicle_roster` 共 **80** 行，68 条具有铁路 PNG，12 条 closed-only 的 PNG 为 NULL；`published_train_number_evidence` **80** 条。服务层以 SQL 记录作为唯一允许出现柴油车型图片的证明。

**注意**：这解决“线路计划列车图和车型映射”，不表示逐列车实际编组已核实。JR 东日本运休和线路事故的公告始终优于 2611 静态时刻表。
