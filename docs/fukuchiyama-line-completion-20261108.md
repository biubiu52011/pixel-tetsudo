# 福知山线／JR宝塚线：站序补全（2026-11-08）

既有 `Fukuchiyama` 线路登记了大阪–篠山口 22 站。线路本名福知山线延伸至福知山，北段补齐 9 站，最终 31 站。JR宝塚线是部分区间的爱称，不能将篠山口以北标为 JR宝塚线。

站序（篠山口之后）：丹波大山 → 下滝 → 谷川 → 柏原（兵库）→ 石生 → 黒井（兵库）→ 市島 → 丹波竹田 → 福知山。

- 丹波大山、下滝、柏原（兵库）、石生、黒井（兵库）、市島、丹波竹田补建坐标与 i18n；谷川及福知山复用现有站点，维护与加古川线、山阴本线的换乘关系。
- 柏原（兵库）采用 `Kaibara-Hyogo`，防止和关西本线的 `Kashiwara` 混淆；黒井采用 `Kuroi-Tamba`，避免与信越本线另一个 `Kuroi` 混淆。全局未改写「柏原」和「黒井」既有别名。
- 站点经纬度参考 MapFan 的福知山线站点，谷川、福知山复用既存坐标。
- 既有大阪–篠山口 21 区间均保持原 4 分钟的**历史站距参考估算**。新增 9 区间使用 2026-11-08 Yahoo 换乘结果中一趟福知山 09:01 → 篠山口 10:10 普通车所列沿途时刻的相邻**参考间隔**，从篠山口方向记为 `[3,16,5,10,3,9,7,8,8]`。此为图/换乘搜索兜底时长（包含该列车停站等待），**不是所有列车通用的已核实时刻表**，不得作为今日位置、运营恢复或列车号身份的证据。
- 原 SQL 383 条历史时刻表与 357 条候选车辆映射不变。没有为新增北段虚构 2026-11 车次、车号、编组、实时位置、人工时刻。
- 生成文件 `railway_data.compact.json` / `railway-data.file.js` 和 `station_i18n.compact.json` / `station-i18n.file.js` 由 `gen-file-data.js` 同源更新。

来源：
- https://www.jr-odekake.net/station/pdf/ubn.pdf
- https://ekitan.com/sta-info/line/5801
- https://transit.yahoo.co.jp/search/result/%E7%A6%8F%E7%9F%A5%E5%B1%B1-%E7%AF%A0%E5%B1%B1%E5%8F%A3
- https://mapfan.com/spots/SCH%2CJ%2CLK0
- https://mapfan.com/spots/SCH%2CJ%2CCK0
- https://mapfan.com/spots/SCH%2CJ%2CXK0
- https://mapfan.com/spots/SCH%2CJ%2CVK0
- https://mapfan.com/spots/SCH%2CJ%2CBK0

## 北段普通列车车型参考（2026-11-08 追加）

福知山线北段（篠山口—福知山）的普通列车另有 223 系 5500 番台运用，
不能直接套用大阪—篠山口的四种历史车队候选。现有主要车队预设已经加上
**实际时刻表站序范围限制**：仅当 `JR-West.Local` 的时刻表明确包含至少两个不同车站，
且全部停车站均在篠山口—福知山的已登记车站集合内并至少有一个篠山口以北车站时，
才把其线路车型参考限定为 `JR西日本223系5500番台`。

- 这只是 `route-fleet-reference`，不确认任何单独车次、运营日、实际编组或车辆图片。
- 路线跨越南北段、站序未知、仅有一个站点，或为快速／特急时，不强制赋予北段车型。
- 前端沿用 `MajorVehicleFleetPresets` 与 `_officialConventionalServicePlan`；没有新建第二套映射系统。
- 图库尚无适用于本区间的 223 系 5500 番台 PNG，不借用阪和线 223／225 系贴图。
- 383 条历史模板、357 条历史车队候选保持不变；没有生成未经核实的北段列车番号或时刻。

参考：
- https://express22.xsrv.jp/maintarminal/jr223-5500/
- https://express22.xsrv.jp/maintarminal/jrfukuchiyamalinedia20240316/

## 2774M 节假日快速（历史共通运用证据）

- JR西日本2026年11月时刻表：公开番号 **2774M**，土休日快速，篠山口18:44出发、大阪19:51到达；项目历史模板的 `2774MH` 是带节假日 `H` 后缀的内部表示。工作日相同番号的种别为丹波路快速，不可把种别／车辆运用混同。
- 2025年3月15日改正的明石支所 207／321 系周末共通运用表第87号运用记录同一车次（篠山口18:44→大阪19:51）。这只是**上一版历史车型族证据**，不是2026年11月8日的实际车型／编组确认。
- 映射严格限制 `2026-11-08`、`2774MH`、`JR-West.Rapid`、Inbound、SQL来源模板 `68302`、土休日、完整16站停车序列一致；不扩散至其他2700M号段或其他日期。缺任一证据，退回原线路候选。
- 在此范围内候选缩为207系／321系，使用现有321系PNG仅作**示意车头**；维持 `referenceOnly=true`、`numberDateVerified=false`、`actualVehicleConfirmed=false`、`authorizesPNG=false`，不认证实际编组或实时位置。图片加载失败回退为候选标记。
- 继续使用现有 `train-number-png-ranges.js`、`train-vehicle.js`、`trains-render.js` 及回归测试，没有为这趟列车建立新的数据库或推断车辆。

资料：
- https://timetable.jr-odekake.net/train-timetable/101641?date=20261108
- https://ameblo.jp/tc205-37/entry-12906281412.html


## 2026年11月北段「2531M」官方样本（增量完成，非全线覆盖）

- 复用已有的两条一站来源：平日编号 `2531M`（SQL ID `68234`）与土休日内部编号 `2531MH`（SQL ID `68235`）。公开编号均为 `2531M`，官方标明每天运行。
- JR西日本2026年11月时刻资料核实：篠山口08:37出发，经丹波大山、下滝、谷川、柏原、石生、黒井、市島、丹波竹田，福知山09:29到达。原来只有篠山口一个时刻的记录现有10站完整样本。
- 修正这两条来源从错误的 `Inbound`（朝大阪）到 `Outbound`（朝福知山）；同步既有 `train_timetable_members` 最后站序，`train_timetable_stops` 为关联视图，自动读取新旧来源，不向视图直接写入。
- 不建立另一套时刻表。现有 `manual_timetable_templates` / `manual_timetable_template_stops` 与 `train-runs` Edge Function 继续负责，`operating_dates` 限定2026年11月1日至30日；2026年11月以外不使用本样本。
- 运行样本只有这一个公开车次：不因10站完整就声称北段列车班次已全覆盖。实际运行、车组号、GPS位置仍未确认。原357条历史车型 SQL 证据不变；`223系5500番台` 仅由现有纯北段普通列车车队规则提供候选，图库没有该区间对应的 PNG，因此使用中性候选标记。
- Edge Function 用固定 source ID、站序、起终点时刻与来源限制将其标记为日期已核实；`sourceSampleOnly` 保障整条线路继续返回 `partial`，而不是完整 HIT。
- 平日 `2774M` 原始种别误写为 `Local`，按JR西日本官方公布的「丹波路快速」更正成 `JR-West.Rapid`；同时更正 `published_jrwest_fukuchiyama_2611_source_fleet` 相关一行，保留其历史候选车型可信度。
- 本次 SQL 文件：`supabase/migrations/20261108221000_fukuchiyama_november_2531m_official_sample_and_2774m_type.sql`；测试：`tests/fukuchiyama-2611-official-north-sample.test.cjs`。

参考（JR西日本官方2026年11月时刻表）：
- https://timetable.jr-odekake.net/train-timetable/240391?date=20261024
- https://timetable.jr-odekake.net/train-timetable/101631?date=20261023
