# 北上线 / Kitakami：2026 年 11 月官方列车番号与计划 KiHa110 图审计

## 来源及关键边界

- JR 东日本 [2611 下行（工作日）](https://timetables.jreast.co.jp/2611/timetable-v/251d1.html)、[2611 下行（土休日）](https://timetables.jreast.co.jp/2611/timetable-v/251d2.html)、[上行工作日](https://timetables.jreast.co.jp/2611/timetable-v/251u1.html)、[上行土休日](https://timetables.jreast.co.jp/2611/timetable-v/251u2.html)。
- JR 东日本 [北上线运行公告](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=kitakamiline) 和 [横手市 2026-10-26 通告](https://www.city.yokote.lg.jp/kurashi/1001144/1001292/1003743.html)：2026 年 8 月 2 日暴雨造成的 **ほっとゆだ～横手铁路区间仍停运**，代行巴士不能画成铁道列车。该线官方时刻表已将北上→ほっとゆだ的铁路服务与剩余停运路段分开。
- [JR 东日本 2023 年车辆运用与车号图](https://www.jreast.co.jp/press/2022/morioka/20221216_mr01.pdf) 提供北上线 KiHa110 常规车型依据（但不证明 2026-11 的某一天是哪辆实车）。图库使用仓库中已有 `JR東日本_キハ110系.png`。

## 仅针对现有 SQL 的五个可核实普通列车

| 番号 | 方向 | SQL 有铁路时刻的运营区间 | 日历特别条件 |
| --- | --- | --- | --- |
| 722D | 上行 | ほっとゆだ→北上 | 按服务日 |
| 724D | 上行 | 藤根→北上 | 按服务日 |
| 736D | 上行 | ほっとゆだ→北上 | 按服务日 |
| 725D | 下行 | 北上→藤根 | 星期日及国民祝日不运行，星期六**可以**运行 |
| 735D | 下行 | 北上→ほっとゆだ | 按服务日 |

旧 SQL 中另有 **9729D／9730D**，官方 2611 资料明确该「快速 ひなび 錦秋湖」仅 2026 年 **10 月 24～25 日**开行；不得把「土休日 SQL」误当作 2026 年 11 月运行。其余官方北上线普通／快速车号即使真实存在，如果当前 SQL 缺少对应站时刻，**不推测站时刻、不合成位置或图标**。

`jreast-kitakami-2611-number-index.js` 对每个待推定 SQL 车次核对服务月份、铁路 URN、方向、普通种别、星期和实际站名路径的**首尾车站及全部停站**。任一原始 `odpt:trainTimetableObject` 包含「ほっとゆだ～横手」停运段（例如横手）就拒绝整趟旧计划；**不可先裁剪线路再让通过**。索引文件缺失时本线路在 2611 的 SQL 推定拒绝出图，而不是回退为过期计划。

图库仅允许经 `TrainPositionEstimator` 完整验证且带 `officialNumberVerified:true` 的车型参考 PNG，仍保持 `estimated:true`、`vehicleIdentityStatus:UNKNOWN`、`planned:true`。这个 flag 不能代表实际车辆编号或实时到发情况。已核实的 `trainNumber` 在折叠列表中可显示「列車番号」。

核查：`node --test tests/kitakami-2611-official-number-png.test.cjs`，包括 5 号上下行、星期六 vs 星期日的 725D、10 月临时车号排除、停运区间与旧 SQL 时刻、错误铁路／车型／日期、PNG 安全回退及运行时完整位置投影。
