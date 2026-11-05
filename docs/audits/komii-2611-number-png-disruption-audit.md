# 小海線（Komii / Koumi）2026 年 11 月 2611：官方番号、运行限制与 PNG

## 核心审计结论

**本项目线路 ID 使用 `Komii`，而不是外部常见拼写 `Koumi`。必须复用既有线路、SQL 表与脚本，不能再造重复线路。**

- JR East 官方 2026-11 小海線表有 **51 个不同番号**：上行 26、下行 25，其中 **3 个 HIGH RAIL 1375** 快速列车 `8221D`、`8222D`、`8223D`，其余 48 个为普通列车。
- 既有 `manual_timetable_templates` 已经有 **108 条来源**：其中 51 号 × 平日/土休日 = **102 条**对应当月官方表。多出的 6 条只有土休日源、并非 2611 版两个方向的正式基本车次清单：`8251D`、`8252D`、`8253D`、`8254D`、`8255D`、`9121D`。旧 SQL **保留**供历史审计，但 **不授权它们在本月被当作每日列车推算**。
- 新增数据库 `published_komii_2611_number_roster`，**51 番号 × 2 日历 = 102 行**；源模板和车次总数已事务校验。所有 `published_train_number_evidence` 也已记录 102 条证据。原始 canonical 逐站模板保持不变，不能凭番号齐全把它们升级为逐站时刻 `date_verified`。
- **普通列车的车型不能逐番号区分**：既有 SQL 只给出「キハ110系（小海線）／キハE200形」双候选。官网说明两种车型都在小海線运用，不能因此把整段 `1xxD` 或 `2xxD` 统一映射为某一种车。数据库保留 `planned_vehicle_candidates`，普通车 `fleet_model/png_reference=NULL`；前端也保持中性无图。
- 三趟 `HIGH RAIL 1375` 才有相对明确的**服务车型参考图**：`JR東日本_キハ100・110系_HIGH_RAIL_1375.png`，SQL `published_train_png_number_ranges` 只登记 **8221～8223D** 一个精确候选号段，仍须匹配数据库指定日期、方向、真实可运行铁路区间、源时刻、SQL proof。实际车辆编组身份始终 `UNKNOWN`，`actual_vehicle_confirmed=false`。

## 官方 2611 来源

- [小海線下行平日](https://timetables.jreast.co.jp/2611/timetable-v/228d1.html)
- [小海線下行土休日](https://timetables.jreast.co.jp/2611/timetable-v/228d2.html)
- [小海線上行平日](https://timetables.jreast.co.jp/2611/timetable-v/228u1.html)
- [小海線上行土休日](https://timetables.jreast.co.jp/2611/timetable-v/228u2.html)
- [HIGH RAIL 1375 官方运行时刻/车型介绍](https://www.jreast.co.jp/train/fun/highrail1375.html)
- [キハE200形官方运用介绍](https://www.jreast.co.jp/train/local/kiha_e200.html)
- [小海線 2026-11-05 运行信息（关东）](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=1&lineid=koumiline)
- [小海線 2026-11-05 运行信息（信越）](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=5&lineid=koumiline)

## 本月重要运行限制（不可用简单月度时刻表覆盖）

### 落石，2026-10-27 起，截至 2026-11-05 尚未解除

2026-10-27 的落石导致 **小海～野辺山**区间停运。官方截至 11 月 5 日仍预计约至 11 月中旬，**没有已经证实的精确恢复日期**。同时中込～小海有部分列车运休，野辺山～小淵沢减班，**不提供代行巴士**。

- SQL `published_komii_2611_rail_disruptions` 保存明确封锁区间、开始日期、公告检索日期，`ended_on=NULL` 表示尚未验证恢复，**不猜“11 月 15 日自动恢复”**。
- Edge `train-runs` 对穿越 **小海～野辺山**的候选列车作**整趟拒绝推算**（不能用整程模板虚构越过封锁段的位置）。未跨越该段的列车保留**计划时刻层级**，但中込～小海及野辺山～小淵沢部分车次存在额外取消，未得到逐号清单时**不可声称其实际一定运行**。
- 恢复后应依据新的 JR 正式公告在 SQL 中填入 `ended_on` 且将 `service_status` 改为 `verified_restored`。API 会保留恢复前历史日期的封锁事实，不会把过去列车误补回去。

### HIGH RAIL 1375 专用日历

官方 2611 版的 11 月计划运行日共 **19 天**：11 月 1～3、6～9、13～16、20～23、27～30 日。每个 `8221D`/ `8222D`/`8223D` 都按这份日历审核。**但落石使 11 月 9 日之前全部 HIGH RAIL 运休**。此后如果封锁尚未核实解除，API 也不显示其虚假的全程运行位置；计划日不等于实绩运营日。

### 11 月 17～19 日的计划维护停运

JR 官方公告 **9:30 左右至 15:00 左右，小淵沢～小海列车运休且无代行**。依据 2611 车次注记逐车登记：

| 番号 | 本月 17～19 日处理 |
| --- | --- |
| 225D / 229D（下行） | 小淵沢～小海段不运行，原时刻保留，小海～小諸段继续作为单独的有效计划路段展示 |
| 226D / 230D（上行） | 小諸～小海段继续为计划铁路段，小海～小淵沢段不渲染 |
| 227D / 228D | 原车全部运休，不显示 |
 
存储为 `published_komii_2611_maintenance`：3 日 × 6 个号码 = **18 条例外**。API 依照完整 SQL 源站序裁剪 `run.stops`，不修改原始 31 站 canonical 的时间，也不在封锁区间添加推断站或巴士。

## 数据职责和显示规则

- SQL `published_komii_2611_number_roster`：**准确 51 番号**、方向、Local/Rapid、双日历、HIGH RAIL 日期、车型候选、参考 PNG、官方 source URL。
- SQL `published_train_png_number_ranges`：**仅 8221～8223D** 的 HIGH RAIL 车型参考，单有数字范围不能显示图。
- SQL `published_komii_2611_rail_disruptions`：来源于 JR 当前公告的落石持续封锁；只有正式恢复证据能修改结束日。
- SQL `published_komii_2611_maintenance`：明确 17～19 日 6 趟车次的运营范围处理。
- Edge `supabase/functions/train-runs/index.ts`：先查官方精确番号、日历、运行日期、路线单调站序、封锁/施工 SQL；只返回可作为**计划行车位置**推定的有效区段，专用车型参考随精确 proof 送出。
- `data/timetables/train-number-png-ranges.js`：`verifyKomiiService` 二次验证是否符合 SQL 签发、铁路方向、车型、六条历史额外号拒绝、日历、施工裁剪、没有违规穿越封锁；普通车返回 `mixed_regular` + 空 PNG。
- `js/train-position-estimator.js`：小海線只使用 SQL proof，不允许绕过前述检查、从旧车型候选自动选出单一 PNG，且任何车型家族图都不能把编组身份升为 `EXACT`。

## 当前核验边界

**番号清单与 SQL 存在性：51/51。** 不能据此宣称现有 51 趟车的每个中间站**2026 年 11 月到发时刻已全部对照官方**。原始 source revision 为空；仅 HIGH RAIL 的已抽查端点和月度官方番号/车型得到更强的来源证据。全部模板仍保留 `undated_not_current_verified`，对外必须将“计划时刻”和“实际运行/实时观测”区分开。

测试：`node --test tests/komii-2611-sql-number-png.test.cjs`。测试包括 51 番号 SQL 结构、三种 HIGH RAIL、当前封锁、维护裁剪、普通车无图、旧临时额外番号拒绝，以及图库路径与车型参考身份状态。
