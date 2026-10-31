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
