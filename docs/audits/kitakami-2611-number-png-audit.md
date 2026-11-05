# 北上線 2026 年 11 月（2611）番号、逐站来源、列车 PNG 审计

## 核心结论

- **18 个本月有效的公开列车番号**、**36 条 SQL 日历／番号记录**（Weekday、SaturdayHoliday 各 18）。原库只有 10 条旧模板，包含**仅 2026-10-24～25 行驶、11 月无效**的 `9729D/9730D`「ひなび 錦秋湖」；现已新增 13 个番号与 724D／725D 缺失的平日模板，历史记录保留但本月 API 不提供。
- 从 **2026-08-02 暴雨**起，**ほっとゆだ–横手**铁路区间停运，使用代行巴士。**绝不能**将该段作为铁路推定位置，也不能把巴士映射成 KiHa110 PNG。当前铁路运行图严格限定 **北上–ほっとゆだ**；部分短途列车仅到藤根。
- SQL 持有完整列车番号、日历、来源、铁路端点和号段映射。Edge `train-runs` 从 SQL 精确 roster 验证区间、车型、番号、日历、日期与停运边界，然后签发 `published_number_fleet_reference`。前端只在收到签发信息、核对整条停站路径后选择 **キハ110系.png**。这是**车型参考**，不是实际编组，`actualVehicleConfirmed=false`、`vehicleIdentityStatus=UNKNOWN`。
- **不宣称 2026-11 所有逐站时刻已核验**：下行 9 个车次用 2611 官方列车详情／车站表；上行部分车次逐站时刻目前参考 2610 及现月车站端点，已作为 `prior_edition_or_station_board_partial` 分类，在每站逐一复核前保留 `timetable_validity=undated_not_current_verified`。数据库已有可供推算的车次模板，并不等于时刻表已全部验证。

## 2611 番号清单（北上→ほっとゆだ 为下行；反向为上行）

| 方向 | 种别 | 官方番号 |
| --- | --- | --- |
| 下行 | 普通 | 723D、725D（北上→藤根）、727D、733D、735D、737D |
| 下行 | 快速 | 3729D、3731D、3739D |
| 上行 | 普通 | 722D、724D（藤根→北上）、726D、728D、732D、734D、736D、738D |
| 上行 | 快速 | 3730D |

725D 特殊日历：**星期六运行、星期日与日本国民祝日不运行**。不能把 `SaturdayHoliday` 全部视为 725D 运行。

## 官方来源与更新范围

- [JR 东日本 2611 北上駅](https://timetables.jreast.co.jp/2611/timetable/tt0564/0564040.html)
- [JR 东日本北上线运行公告](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=kitakamiline)
- [横手市运营调整通告](https://www.city.yokote.lg.jp/kurashi/1001144/1001292/1003743.html)
- 下行本月 2611 官方车次页面作为逐站来源：`723D`、`727D`、`3729D`、`3731D`、`733D`、`735D`、`737D`、`3739D`，及 `725D` 车次页面。
- 上行现有中间站钟点资料来源需注意：`722D`、`726D`、`728D`、`3730D`、`732D`、`734D`、`736D`、`738D` 目前引用 2610 官方逐站页与当月公告/端点；`724D` 仅现有短途模板及当月车站资料。没有证据时不升级为 2611 全部站点已核查。

## SQL 表与代码边界

- `published_kitakami_2611_number_roster`: 18 个有效列车番号在两个日历下的精确记录，`stop_clock_status` 区分来源。
- `published_kitakami_2611_rail_suspension`: 8/2 起停运边界及 `replacement_bus_not_rail`。
- `published_train_png_number_ranges`: 分为 722～739D 与 3729～3739D 两个候选号段，**仅号段不足以授权车辆图**，必须命中精确 SQL roster、车次方向、来源及服务日。
- `manual_timetable_templates`、`manual_timetable_template_stops`、`train_timetables`、`train_timetable_members`: 缺失列车与停站时间导入项目既有的 canonical SQL 架构，而不是另立前端时刻表。
- `supabase/functions/train-runs/index.ts`：拒绝非 2611 号码和停运区间，725D 星期日／祝日拒绝、快速保留 Rapid，签发仅参考的车族 PNG 证明。
- `data/timetables/jreast-kitakami-2611-number-index.js`：`verifySqlProof` 验证签发证据及递增／递减站序。不再让旧 5 号码白名单决定实际渲染。旧 `verify` 保留用于原五车次安全回归对照。
- `data/timetables/train-number-png-ranges.js`：生产匹配 `Kitakami` 必须经上述 SQL proof。
- `js/train-position-estimator.js`：车型和种别从 SQL 审核结果读取，且保持 actual identity UNKNOWN。

## 验证

执行 `node --test tests/kitakami-2611-official-number-png.test.cjs tests/kitakami-2611-sql-full-roster.test.cjs`。SQL 可检查精确 18 号码、36 行计划、全部已导入路线末端均在「北上–ほっとゆだ」范围，正常 KiHa110 参考图，以及不运行日／洪灾停运边界。

**下一步**：把 2610 来源的上行逐站时刻逐个与 JR 2611 官方列车详情复核，修正实际差异并更新 provenance 后，才可认定 11 月整线逐站时刻完整。
