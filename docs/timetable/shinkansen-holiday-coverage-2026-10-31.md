# 新幹線 土休日ダイヤの出典確認と残存ギャップ (2026-10-31)

## 数据范围
目标是出版物式 **Weekday** / **SaturdayHoliday** 两类计划，不保存每日运行结果、实际车辆编组或实时分配。

2026-10-31 以前以下 10 条新干线线路只有 664 条平日模板，没有土休日模板。所有来源最初都标为 `data/timetables/<line>-manual.js` 且缺少来源改正日期；不得批量复制为休日。

本次从原平日行程中识别并核对十班有正式运行时刻证据的列车，为每条线路添加 **一班抽样土休日计划**，共 10 班、108 停站。所有记录均以 `source_path LIKE 'official-sampled:holiday:%'` 标记为抽样，`source_trip_id='verified-holiday-from:<original_template_id>'`，保存为独立 canonical source-only 计划。

| Line key | 列车 | 关联平日模板 | 参考官方信息 | 备注 |
|---|---|---:|---|---|
| AkitaShinkansen | こまち1 | 749 | https://timetables.jreast.co.jp/2611/train/030/033833.html | 校对停站及到发分钟 |
| HokkaidoShinkansen | はやて91 | 590 | https://timetables.jreast.co.jp/2611/train/040/044991.html | 校对旧行程 |
| HokurikuShinkansen | かがやき501 | 1936 | https://timetables.jreast.co.jp/2611/train/095/098481.html | 修正到发分钟；官方终到敦贺，非旧记录中的金泽 |
| JoetsuShinkansen | とき301 | 573 | https://timetables.jreast.co.jp/2611/train/035/038221.html | 修正分钟并补回缺漏的停站 |
| KyushuShinkansen | さくら401 | 652 | https://timetable.jr-odekake.net/train-timetable/177981?date=20261018 | 已注明每日运行；时刻可能随资料月份更新 |
| NishiKyushuShinkansen | かもめ1 | 232 | https://www.jrkyushu-timetable.jp/sp/2608/0019/00190501.html?d=20260722&t=2828302e | 已注明每日运行 |
| SanyoShinkansen | こだま875 | 9277 | https://timetable.jr-odekake.net/train-timetable/315241?date=20261007 | 已注明每日运行 |
| TohokuShinkansen | はやぶさ29 | 1328 | https://timetables.jreast.co.jp/2611/train/125/129731.html | 修正到发分钟和缺漏站点 |
| TokaidoShinkansen | ひかり631 | 9146 | https://timetable.jr-odekake.net/train-timetable/162581?date=20261030 | 已注明每日运行 |
| YamagataShinkansen | つばさ121 | 708 | https://timetables.jreast.co.jp/2611/train/025/029831.html | 修正到发分钟；非临时つばさ87 |

**限制**：本次只核对了十个车次，绝不能声称十条线路的土休日时刻表完成。剩下 654 条平日参考模板尚未逐班证实是否适用于土休日，也需要调查休日独有列车。来源官方网页可能标示特定运行日期；不得只凭无日期的原始模板推定每周运营。部分来源存在版权/数据再利用限制，批量导入之前必须确认权利和可授权数据源。

### 验证
- `published_timetable_plan_trains`: 新增 10，所有新增 `is_sampled_source=true`。
- `published_timetable_plan_stops`: 新增 108。
- 全部有 canonical 主成员、无未计时的停站、无孤立停站。
- `published_timetable_coverage_audit`: 10 条线保留 `HOLIDAY_TRAIN_BY_TRAIN_COVERAGE_INCOMPLETE`；仍为 `sparse_review` / `calendar_review`。
- 不能把计划车型和实际车辆编组混为一谈；样本车辆车型字段已去掉错误的“列车爱称”标签。

### 后续完成标准
每条线路需独立审查全部**定期**列车的 Weekday 与 SaturdayHoliday 运行日、时刻、方向、站序；不把临时列车批量升级为日常列车；在取得可重用且合法的来源资料后，补齐全部对应车次，最后才解除 `HOLIDAY_TRAIN_BY_TRAIN_COVERAGE_INCOMPLETE`。

---

## 2026-10-31 后续导入：JR 九州定期列车时刻表

官方资料：[JR 九州 2026-03-14 至 2027-02-28 定期列车时刻表](https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf)。

以该资料为基础，进一步新增 **53 班 SaturdayHoliday 计划、237 条停站**，均通过 Supabase 事务写入，建立 `train_timetable_members` 主成员关系；不是每天生成的实际列车记录。原平日时刻和实际编组资料没有被改动。

| 本次批次 | 车次 | 停站 | GitHub SQL |
|---|---:|---:|---|
| 西九州新干线首批（15）+ 九州新干线（7） | 22 | 112 | [20261031164500_jrkyushu_regular_holiday_verified_stops.sql](../../supabase/migrations/20261031164500_jrkyushu_regular_holiday_verified_stops.sql) |
| 西九州新干线日间、晚间定期车次 | 25 | 106 | [20261031171500_nishi_kyushu_regular_holiday_evening_trains.sql](../../supabase/migrations/20261031171500_nishi_kyushu_regular_holiday_evening_trains.sql) |
| 西九州新干线短区间车次 | 6 | 19 | [20261031174000_nishi_kyushu_regular_holiday_short_section_trains.sql](../../supabase/migrations/20261031174000_nishi_kyushu_regular_holiday_short_section_trains.sql) |

与前一轮的 10 班抽样合并后，十条新干线的土休日计划数量：

| Line key | 土休日列车 | 已知限制 |
|---|---:|---|
| NishiKyushuShinkansen | **47**（下行24、上行23） | 官方 *regular base timetable* 所列双向 47 班已收录；加开列车、调整公告及平日源版本未完整核查 |
| KyushuShinkansen | **8** | 抽样资料，未覆盖全部定期班次 |
| AkitaShinkansen | 1 | 抽样资料，尚不完整 |
| HokkaidoShinkansen | 1 | 抽样资料，尚不完整 |
| HokurikuShinkansen | 1 | 抽样资料，尚不完整 |
| JoetsuShinkansen | 1 | 抽样资料，尚不完整 |
| SanyoShinkansen | 1 | 抽样资料，尚不完整 |
| TohokuShinkansen | 1 | 抽样资料，尚不完整 |
| TokaidoShinkansen | 1 | 抽样资料，尚不完整 |
| YamagataShinkansen | 1 | 抽样资料，尚不完整 |

导入后的全库检查：**92,487 计划模板、1,135,203 停站**；未关联 Canonical 的模板数 0、无主模板的停站数 0，按日期旧运行记录数 0，非法运行日分类数 0，审计计数偏差数 0。已通过 `anon` 角色查询土休日公开计划。

西九州新干线审计由 `sparse_review` 调整为 `calendar_review`，记录 `JRKYUSHU_20260314_PUBLISHED_BASE_47_TRAINS_24_OUT_23_IN`，同时保留 `PUBLISHED_BASELINE_CAPTURED_EXTRA_TRAINS_UNVERIFIED` 与 `WEEKDAY_SOURCE_REVISION_UNVERIFIED`。**这不表示所有时刻表已被核实完整，也不意味着列车实际运行编组已知。**

注意：`source_trip_id` 中的数字 `20260314` 是**来源版本日期**，不是某日实际运行记录。数据库日历仍只有 `odpt.Calendar:Weekday` / `odpt.Calendar:SaturdayHoliday`。下阶段应继续在其他新干线线路采集逐车次经官方资料确认的定期土休日计划，不能把旧平日模板直接复制并声称完整。
