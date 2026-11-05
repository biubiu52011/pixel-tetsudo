# 気仙沼線：JR 东日本 2026 年 11 月 2611 — 铁道、BRT、施工运休、车辆 PNG

## 验证结论

**先检查既有 SQL，而不是新造一套时刻表。**

既有 `manual_timetable_templates(line_key='Kesennuma')` 有 **165 条来源模板、88 个不同番号**，但包含两种不同交通方式：

- **铁路**：D 结尾番号，**18 个号码（下行 9 / 上行 9）× 平日／土休日 = 36 条**，均已有前谷地～柳津共 6 站的计划时刻。
- **BRT**：K 结尾番号，**70 个不同号码、129 条模板**，既有线路数据和时刻全部保留；不应由列车位置估算器当作铁路列车，也不能用柴油列车 PNG 渲染 BRT。

JR 东日本明确说明：前谷地～柳津段**铁路与 BRT 并行**，柳津～気仙沼使用 BRT；BRT 不保证与列车接续，不能把二者套入同一种速度/站间运行图。

官方时刻表：

- [2611 下行平日（267d1）](https://timetables.jreast.co.jp/2611/timetable-v/267d1.html)
- [2611 下行土休日（267d2）](https://timetables.jreast.co.jp/2611/timetable-v/267d2.html)
- [2611 上行平日（267u1）](https://timetables.jreast.co.jp/2611/timetable-v/267u1.html)
- [2611 上行土休日（267u2）](https://timetables.jreast.co.jp/2611/timetable-v/267u2.html)
- [JR 施工运休官方通告](https://www.jreast.co.jp/suspend/)
- [JR キハ100系／キハ110系车辆介绍](https://www.jreast.co.jp/train/local/kiha110.html)

## 实际铁路番号（18 个）

| 方向 | 号码 |
| --- | --- |
| 下行 前谷地→柳津 | 921D、923D、925D、2927D、929D、2931D、933D、935D、2937D |
| 上行 柳津→前谷地 | 922D、924D、2926D、928D、2930D、932D、934D、2936D、2938D |

既有每个铁路模板的站序均为六站：

- 下行：Maeyachi → Wabuchi → Nonodake → Rikuzen-Toyosato → Mitakedo → Yanagitsu
- 上行：反向

核对 **18 个铁路号码在平日与土休日的 36 条首站发车时刻**，与 2611 官方站时刻表一致。数据库各模板还有其他五个站的计划时刻，但尚未完成逐车逐站的**当月官方到发时刻全量核验**；因此只登记 `stop_clock_status='official_2611_origin_departure_only'`，不修改 canonical `timetable_validity='undated_not_current_verified'`，也不声称所有车次实际运行/编组已确认。

## 2026 年 11 月 4～6 日的计划施工运休

JR 官方规定，前谷地～柳津段因日间维护于 **11 月 4～6 日**及 **12 月 7 日**运休部分车次，不提供巴士或出租车代行；气仙沼线 **BRT 照常运行**。本 SQL 2611 月版只登记 11 月三日：

| 列车 | 11/4–11/6 范围 | 对本线铁路显示的处理 |
| --- | --- | --- |
| 2927D | **前谷地→柳津区间运休**（小牛田侧来源可能仍有计划） | 気仙沼線铁路不显示该车 |
| 2930D | **柳津→前谷地区间运休**（后续石巻線侧独立处理） | 気仙沼線铁路不显示该车 |
| 929D | 全列车运休 | 気仙沼線铁路不显示 |
| 928D | 全列车运休 | 気仙沼線铁路不显示 |

日历抽样 SQL 核验：

- **11/03：18 趟铁路计划车次**
- **11/04、11/05、11/06：每天 14 趟**
- **11/07 之后的常规运行日：18 趟**

这是按公开计划运营日历生成的铁路时刻推算，**不是实时到站定位**。现有 SQL 的 `K` BRT 车次不因该段铁路维护被取消。

## SQL 与应用分工

- `published_kesennuma_2611_rail_roster`：18 个精确铁路 D 号码、36 条日历/编号记录、首站时刻、官方来源、`actual_vehicle_confirmed=false`。
- `published_kesennuma_2611_rail_interruptions`：三日 × 四车次 = 12 条施工运休记录；区分全列车取消与跨线服务仅本铁路区间取消。
- `published_train_png_number_ranges`：存 **921–935D** 和 **2926–2938D** 两个参考数字范围。**绝不**单靠数值区间授权显示 PNG；必须同时匹配 SQL 精确号码。
- `published_train_number_evidence`：36 条源模板的编号证据；原 BRT K 模板保留但不在该铁路清单中。
- `supabase/functions/train-runs/index.ts`：严格查 SQL 公布清单、日期运休、两种日历、6 站 URN 顺序、铁路番号及图库对应，只有合法铁路 D 记录签发 `published_number_fleet_reference`。同 namespace 的 K 结尾 BRT 在本铁路端点**直接排除**。
- `data/timetables/train-number-png-ranges.js`：`verifyKesennumaRailService` 二次校验签发信息；不允许从 BRT K、无来源 D 号、错误日历、错线路或施工运休日起图。
- `js/train-position-estimator.js`：气仙沼线 2611 页面**只投影** Supabase 签发的铁路 D 列车，不 fallback 到可能是 BRT 的同名历史时刻源。
- `data/timetables/vehicle-garage-png-map.js`：复用既有 `JR東日本_キハ110系.png`（JR 官方介绍キハ100系・キハ110系均在区域运用的车辆**家族参考图**）；不声称每列为キハ110特定编组，车辆身份仍 UNKNOWN。

## 回归

`node --test tests/kesennuma-2611-rail-sql-number-png.test.cjs`

重点断言 **18 D 号码 × 平日／土休日、4 个维护运休号 × 三日、BRT K、假冒运行区间、错误时间/日期/方向/车型与缺失 SQL proof** 全部有合适的允许或拒绝结果。页面需保留 BRT 的独立业务数据，但在铁路运行图中不渲染公交车。
