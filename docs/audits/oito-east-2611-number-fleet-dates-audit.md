# 大糸線 JR 東日本（Oito）2611 番号－SQL－车辆 PNG 审计

## 范围：松本～南小谷，**不处理 JR 西日本部分**

仓库现有大糸線 JR 西日本区间已拆分。因此本次专门针对 JR 东日本的 **松本—南小谷** 线路，不删除、不迁移、更不更新原始西段的 `4xxD` 柴油列车与 `790x` 历史代行巴士数据。车次表尽管在官方页面上仍连排到糸魚川，**不得把 JR 西区间记录用于东段 PNG 映射**。

官方出处：

- [JR 东日本 2026-11 大糸線上行平日 230u1](https://timetables.jreast.co.jp/2611/timetable-v/230u1.html)
- [上行土休日 230u2](https://timetables.jreast.co.jp/2611/timetable-v/230u2.html)
- [下行平日 230d1](https://timetables.jreast.co.jp/2611/timetable-v/230d1.html)
- [下行土休日 230d2](https://timetables.jreast.co.jp/2611/timetable-v/230d2.html)
- [JR 东日本官方リゾートビューふるさと运行日](https://www.jreast.co.jp/train/fun/resortfuru.html)
- [はくば２号 8042M 运行日期及所经车站](https://timetables.jreast.co.jp/2611/train/110/112911.html)
- [8352M 运行日期及所经车站](https://timetables.jreast.co.jp/2611/train/110/112921.html)

## 2026-11 服务日历

| 服务种类 / 番号 | 11 月准入日期 | 图片 |
|---|---|---|
| 常规电车 `M` 及常规特急 `5M/38M` | 根据平日/假日官方车次表 | 既有 211系、E127系100番台、E353系参考 PNG（按原始 SQL 车型来源，而非实际编组） |
| `8361D/8362D` 快速リゾートビューふるさと | **1、2、3、6、8、9、13、14、15、16、20、21、22、23、27、28、29、30 日**（18 日） | 既有 `JR東日本_HB-E300系_リゾートビューふるさと.png` |
| `8041M/8042M` 特急はくば1/2号 | **1、21、22、23 日** | 既有 `JR東日本_E353系.png` |
| `8352M/8353M` 白馬—南小谷间临时普通列车 | **1、21、22、23 日** | 既有 `JR東日本_E127系_100番台_長野色.png`，按 SQL 参考车型显示 |
| `9095M` 旧 SQL 特急来源 | **不在 2026 年 11 月准入** | 不生成列车位置或 PNG |
| `5232M` 既有普通车号 | 按官方日历，仅有号码/来源，不足以确定车辆 | **保留铁路位置但车型图片空缺** |

**11 月 7 日并非 8361/8362D「ふるさと」运营日**；该日官方另有「リゾートビュー諏訪湖」的行程，不能偷用「ふるさと」车次或图片。11 月 3、23 日为祝日，使用土休日服务日历。

## 数据库覆盖与边界

已应用 `supabase/migrations/20261106065000_oito_east_2611_exact_number_dated_fleet_roster.sql`，新增开启 RLS 的 `published_oito_east_2611_number_roster`。

只读取原有 `manual_timetable_templates` 中 **137 条东段电车 `M` + 4 条东段 `8361D/8362D` = 141 条**，其中 **69 条平日、72 条土休日模板**。由原始 `source_template_id`、车号、方向、平日/假日和东段真实停站 key 固定证据；原来源只有历史钟点，`stop_clock_status=historical_not_2611_verified`。原数据库西段 28 条柴油车 `4xxD` 和 12 条 `790x` 记录未修改。

- 4 条 `published_train_png_number_ranges` **必须**以本次 SQL 精确车号/日期表辅助核实，不允许单凭数字范围推定车型。
- `published_train_number_evidence` 追加 **140 条东段 SQL 号段来源证据**（排除 11 月以外的 `9095M`）。
- 图库使用现有四个实体 PNG。原有 E127、E353、HB-E300 已包含 `Oito` 作用域；仅给长野色 211 系的既有图库授权 `Oito`，不复制图片、不新增图库加载层。
- `supabase/functions/train-runs/index.ts` 中新增东段专属过滤。只校验 Oito 内 `M` 与 `8361D/8362D`，**不改变其他 D 列车、巴士及 JR 西区间工作流**。
- `data/timetables/train-number-png-ranges.js` 内 `verifyOitoEastService` 按原 SQL 车次、车型候选、日期、方向与停站做严格核验；既有车图必须经该过程才可显示。
- `js/train-position-estimator.js` 在 SQL 位置投影前调用同一核验规则，仅在可信车次来源上显示对应的 **PLANNED_MODEL** 图；原有模型 UNKNOWN 或实际身份不因此变为 EXACT。
- `pages/trains.html` 三个原有 JS 的缓存版本随文件变化更新。没有新前端脚本、API 层、Docker、PR 或服务器常驻要求。

### 按服务日期核对的 SQL 可绘制来源数

| 2026-11 日期 | 合格东段 SQL 计划来源 | 有预期车型图片 | 8361/2D | はくば临时 M（4 趟） |
|---|---:|---:|---:|---:|
| 01 日 | 72 | 71 | 2 | 4 |
| 03 日 | 68 | 67 | 2 | 0 |
| 06 日 | 68 | 67 | 2 | 0 |
| 07 日 | 66 | 65 | 0 | 0 |
| 08 日 | 68 | 67 | 2 | 0 |
| 21、23 日（各） | 72 | 71 | 2 | 4 |
| 30 日 | 68 | 67 | 2 | 0 |

**这些是来自旧 SQL 且按官方 2611 车号/日期认可的计划运行记录数，不是现场实车数量或已经逐分秒验证的新时刻表。** `5232M` 没有可信单一来源车型，因此每个日历少一张图片。任何具体编组、运行番号、精确站时刻仍需独立证据。

## 验证

`tests/oito-east-2611-sql-scope.test.cjs` 已纳入既有 GitHub Actions 「Verify train PNG contracts」工作流，覆盖四种图片来源、东/西部边界、日期例外、无效车号拒绝；与已有线路合同测试一起执行。直接提交 `main`，不创建 PR。
