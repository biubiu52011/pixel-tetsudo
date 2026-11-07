# JR奈良線 2026年11月：原始时刻逐站核验与正式种别映射

**范围**：`odpt.Railway:JR-West.Nara`、2026-11-01～2026-11-30。这里只记录经过原时刻表/原列车番号/运行日精确匹配的来源，**不宣称整条线路、全部运行班次或车辆编组已核实**。入库依据为 JR 西日本 JRおでかけネット个别列车时刻（JR时刻表 2026年11月号）；列车行程原始数据仍由 `manual_timetable_templates` 与 `manual_timetable_template_stops` 独占。

## 调查

- `manual_timetable_templates` 中已存在 **331** 条 Nara 原始时刻来源，不需要新建第二套站时。
- 此前数据库没有 Nara 专属的官方逐站证据表；由于类型字段写在历史源中，不应直接覆盖导入值。
- 原始源把大量 `26xxM` 的 **みやこ路快速** 标为 `odpt.TrainType:JR-West.Local`，还把临时特急 `8061MH/8062MH` 标为 Local；官方明确显示前者为「みやこ路快速」，后者为「特急 いにしへ」。
- 历史来源 `MH` 尾字母表示土休日的导入标记，并不是官方公众车号的一部分。
- 原始 331 条中，本轮已核验 **21** 条，剩余 **310** 条未获得完整原站时认证。其中 **73** 条的来源号位于 `26xxM/MH` 家族但未核实，不得为了好看自动升级成当前日期已核验，也不得在图标上认定实际编组。

## 第一批：11 条精确来源（迁移 20261107160000）

| 官方番号 | 数据库日历 | 真实公布种别 | 已比对原来源站数 | 官方时刻依据 |
| --- | --- | --- | ---: | --- |
| `601M` | 平日 | 普通 | 21 | [官方](https://timetable.jr-odekake.net/train-timetable/44201?date=20261028) |
| `601M` | 土休日 | 普通 | 21 | [官方](https://timetable.jr-odekake.net/train-timetable/44201?date=20261018) |
| `602M` | 平日、土休日 | 普通 | 每条21 | [官方](https://timetable.jr-odekake.net/train-timetable/44291?date=20261028) |
| `621M` | 平日 | 普通 | 21 | [官方](https://timetable.jr-odekake.net/train-timetable/45791?date=20261028) |
| `621M` | 土休日 | 普通 | 21 | [官方](https://timetable.jr-odekake.net/train-timetable/45811?date=20261025) |
| `2636M` | 平日、土休日 | **みやこ路快速** | 每条11 | [官方](https://timetable.jr-odekake.net/train-timetable/26111?date=20261104) |
| `2646M` | 仅土休日来源 | **みやこ路快速** | 11 | [官方](https://timetable.jr-odekake.net/train-timetable/322681?date=20261103) |
| `8061M` | 土休日 | **特急 いにしへ61号** | 3 | [官方](https://timetable.jr-odekake.net/train-timetable/321941?date=20261025) |
| `8062M` | 土休日 | **特急 いにしへ62号** | 3 | [官方](https://timetable.jr-odekake.net/train-timetable/321951?date=20261024) |

**分日历差异**：`601M` 的平日与土休日不是相同站时；`621M` 同理。`2646M` 另有平日来源，但东福寺～京都段时刻与土休日有所不同，因此第一批仅认证土休日。未核实来源 `2601MH` 没有因为找到旧月份的个别列车页而被认作整个 2026 年 11 月都已认证。

**特别列车边界**：`8061/8062M` 是特急而非普通/みやこ路快速；官方显示 2026年11月29日前的土休日运行。保留源本来只有的京都、宇治、奈良三站，未推导其他非停车站到发时刻。绝不凭列车名称推定准确车厢或 PNG。

## 第二批：追加 10 条精确来源（迁移 20261107161000）

| 官方番号 | 日历 | 真实公布种别 | 来源站数 | 官方依据 |
| --- | --- | --- | ---: | --- |
| `604M` | 平日、土休日 | 普通 | 各21 | [官方](https://timetable.jr-odekake.net/train-timetable/44461?date=20261023) |
| `2603M` | 平日、土休日 | **みやこ路快速** | 各11 | [平日](https://timetable.jr-odekake.net/train-timetable/25441?date=20260924)、[土休日](https://timetable.jr-odekake.net/train-timetable/25451?date=20261025) |
| `2634M` | 平日、土休日 | **みやこ路快速** | 各11 | [官方](https://timetable.jr-odekake.net/train-timetable/26101?date=20261024) |
| `2638M` | 平日、土休日 | **みやこ路快速** | 各11 | [官方](https://timetable.jr-odekake.net/train-timetable/322611?date=20261024) |
| `2640M` | 平日、土休日 | **みやこ路快速** | 各11 | [官方](https://timetable.jr-odekake.net/train-timetable/322461?date=20261013) |

## 数据和接口的单一所有权

- 新增 `published_jrwest_nara_2611_verified_source_clocks`，只存原始 `source_template_id`、原始 `MH` 号码、原始来源站数和 MD5、日历、官方页面、真实公众车号、真实公布种别与列车名，**不复制站时**。新表启用 RLS，默认不给匿名读写授权。
- `published_jrwest_nara_2611_clock_evidence` 是 `security_invoker=true` 的校验视图。每次检查现有 source id、来源线路、来源文件、原始种别、运行日、行车方向、逐站站时哈希、源记录站数，约束未核验记录不能自称官方。
- Edge `train-runs v345` 在 `line_id=Nara` 且 2026-11 期间读取当日历的 **平日9／土休日12** 条证据；只在原始全部车站/到发时间匹配后，保留匹配用原始号码，同时输出 `published_train_number`（移除历史尾部 H）、正确 `train_type`、`published_train_type_label` 与 `service_name`；否则报证据冲突。
- 前端 `data/api/odpt-unified.js` 接收 `_sqlPublishedTrainNumber`、`_sqlPublishedTrainType`、`_sqlPublishedTrainTypeLabel`；`js/train-position-estimator.js` 仅对官方来源、日期、H 尾字母都吻合的 Nara 条目使用公众号码显示，原始 source identity 不变。
- 对 21 条认证来源统一清空车辆确认、候选 PNG、车辆证据，**不以特急「いにしへ」的宣传用车代表实际每班编组**。

## 验证边界和后续工作

线上 SQL 两次迁移应用成功，最后检查为 **21/21** 已认证来源（普通8、みやこ路快速11、临时特急2；平日9、土休日12）。JR西日本回归测试包含运行日、哈希、真实服务种别、原始/展示号码分离、错误 PNG 保护；共用原仓库 GitHub Actions，不新建收费或本地服务器。

**后续最值得继续补的部分**：尚未精确验证的 `26xxM/MH` 家族 73 条来源、`365xM` 区間快速、`16xxM` 普通来源以及其他日历差异；只能认证与当前官方版吻合的来源，而不是因为规律推算整日运行图。整条奈良線的 331 条既有来源是历史候选，不等于 331 条当前时刻已核验。
