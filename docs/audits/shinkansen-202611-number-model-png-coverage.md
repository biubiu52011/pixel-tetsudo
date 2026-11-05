# 新干线 2026-11 列车番号 → 计划车型 → PNG 分级覆盖审计

**最新回读日期**：2026-11-06（新增三趟ひかり计划番号）  
**范围**：Supabase `pnupwfmgbtxqhpzsrhfn` 中现有 10 条 `%Shinkansen` 线路的 `manual_timetable_templates`；`2611` 为 JR 东日本 2026 年 11 月出版版本。  
**规范**：[Notion《全线路列车番号→车型→PNG 覆盖率审计》](https://app.notion.com/p/PNG-40ed1daae25681a4ad4eca747b1586b6?source=copy_link)。

## 计划列车验收标准（2026-11-06 用户确认）

**项目目标：新干线属于手工时刻表驱动的计划列车展示，不是实时车辆追踪。** 与其他手工线路统一口径。

- **必需**：官方完整列车番号；对应版本的线路、方向、平日／休日及运行日；计划停站／发到时刻；基于时刻表的计划位置推算；有独立依据的计划车型以及车型、运营者、线路相符的参考 PNG。
- **非必需**：实际车辆编组号、车辆运用号、当天实际派车确认、GPS／实时观测。**“实际编组确认 0 条”不得被计算为新干线计划映射尚未完成的缺口或用来否决已有证据的计划 PNG**；仅保留 `actual_vehicle_confirmed=false` 以避免计划与实车混淆。
- **边界**：计划车型明确时允许显示其车型参考图，不因此宣称当天实际使用该组车辆。存在 E5/H5、E7/W7、N700A/N700S 等多候选且无唯一计划车型证据，或者对应型号 PNG 缺失时，保持候选或中性列车标记，不能按后缀、爱称号次、运营者或连续范围猜图。
- **验收指标**：已核实正式番号覆盖率、计划车型可确定率、准确 PNG 展示率、时刻表推算正确性，以及平日/休日/临时运行日的准确性。SQL/代码测试与 Pages/Safari 实际渲染验收分开标记。修正优先在已有责任 SQL 表、车型库及 train-runs 中完成，不增平行图层或补丁。

> 下文历史小节保留“实际车底 0”的数据仅作证据级别说明；其不是本项目的必需指标或完成门槛。下文各阶段快照并非自动更新的最新总数。

## 总体结果

| 口径 | 更新前 | 更新后 |
|---|---:|---:|
| 原始时刻表模板（不是实际每日运行记录） | 826 | 826 |
| 有官方依据的单一**计划车型** | 351 | **442** |
| 无列车级单车型计划 | 475 | **384** |
| 已证明当日实际物理编组 | 0 | **0** |
| 已写入 `published_train_number_evidence` 的新干线正式**完整列车番号** | 0 | **684** |
| 已写入 `published_train_png_number_ranges` 的新干线逐个精确番号 PNG | 0 | **171** |

**单车型计划覆盖率：442 / 826 = 53.5%；正式番号证据 684 / 826 = 82.8%；安全 PNG 单号 171 / 826 = 20.7%。这不是全列车班次覆盖，也不是已在浏览器实际渲染 171 张 PNG。**

## 各线计划车型覆盖率（2026-11-06 当前最新回读）

| Line key | 已有模板 | 官方单车型计划 | 仍待核实 | 当前已知障碍 |
|---|---:|---:|---:|---|
| AkitaShinkansen | 45 | **45** | 0 | E6 官方车型计划，**45/45 正式番号与 PNG 精确映射** |
| HokkaidoShinkansen | 26 | 0 | **26** | **26/26 正式番号**，E5/H5 不可据名分辨、PNG 仍为 0 |
| HokurikuShinkansen | 72 | 0 | **72** | **66/72 正式番号**，E7/W7 车底未逐车证实、PNG 仍为 0 |
| JoetsuShinkansen | 18 | **18** | 0 | E7 计划车型；**18条正式番号和精确 PNG 单号映射** |
| KyushuShinkansen | 159 | **136** | **23** | 800／N700 依官方个别列车精确区分：66 条正式番号、20 条安全 800系 PNG；N700 缺对应图库 |
| NishiKyushuShinkansen | 92 | **92** | 0 | N700S 6 辆计划车型确定，**图库无对应 N700S PNG** |
| SanyoShinkansen | 154 | **70** | **84** | 已有136条正式番号、10条精确PNG；970A日期换型，跨公司ひかり旧时刻有差异 |
| TohokuShinkansen | 82 | 35 | **47** | **81/82 正式番号**，35 条 E6/E8 单车型 PNG；其他混用未猜测 |
| TokaidoShinkansen | 132 | 0 | **132** | N700A/N700S 与跨公司运行；没有每车次对应证据 |
| YamagataShinkansen | 46 | **46** | 0 | **43/46 正式番号与 E8 PNG**，3 条多重番号待核 |
| **合计** | **826** | **442** | **384** | 实际编组全部未证实；正式番号 684、精确 PNG 171 |

“官方单车型计划”只表示有 `official_service_vehicle_plan` 与 `evidence_sources` 关联，并没有证实运行当天派车、具体车辆编组号或涂装。未覆盖的模板可能有线路层候选车种，但不属于列车级已确认映射。

## 第一阶段已核实的五个正式列车番号（非爱称号次）

| 线 | SQL 原始 `train_number`（列车服务名） | 2026-11 正式番号 | 车型处理 | 官方来源 |
|---|---|---|---|---|
| 秋田 | こまち1 | **3001M** | E6 → 泛用原生 PNG，计划参考 | https://timetables.jreast.co.jp/2611/train/030/033833.html |
| 山形（福岛以后） | つばさ121 | **121M** | E8 → 泛用原生 PNG，计划参考 | https://timetables.jreast.co.jp/2611/train/025/029831.html |
| 上越 | Toki301 | **1301C** | E7 → 泛用原生 PNG，计划参考 | https://timetables.jreast.co.jp/2611/train/035/038221.html |
| 北陆 | かがやき501 | **3501E** | **未选择 E7/W7 中任一张** | https://timetables.jreast.co.jp/2611/train/095/098481.html |
| 东北 | Hayabusa29 | **29B** | **未选择 E5/H5 等任一张** | https://timetables.jreast.co.jp/2611/train/125/129731.html |

五条来自既有 `supabase/functions/train-runs/index.ts` 的逐车官方来源、起点与发车时间交叉核验；新写入 `published_train_number_evidence`，限定 **SaturdayHoliday / 2611**，`verification_scope='train_number_only'`，没有以爱称号码替代正式番号。其他 821 个模板不能因这五条而被推导为固定尾缀和区间。

首批三张精确 PNG 只记录 `min_number=max_number`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`：

- `3001M` → `../images/列车/JR東日本/JR東日本_E6系.png`
- `121M` → `../images/列车/JR東日本/JR東日本_E8系.png`
- `1301C` → `../images/列车/JR東日本/JR東日本_E7系.png`

三张图库素材通过 `vehicle_image_assets` 检查均为 `available`、`native_png`、`generic`、JR-East，且同型号的计划映射与官方来源 ID 已存在。**这不代表当天具体车底/编组已知。**

## 2026-11-05 实施内容

1. 复用现有 `train_timetable_vehicle_mappings` 与 `evidence_sources`：为 **秋田 1**（`128897`）、**山形 1**（`128896`）、**西九州 47**（官方基本时刻表）共 49 条休日模板写入单车型**计划**证据，分配既有官方证据 ID `4931/4933/4932`。
2. 西九州 **46 条**的来源为官方 2026-03-14 至 2027-02-28 定期基准 PDF；另外 **かもめ1号** 为此前逐车确认的 JR 九州官方时刻表样本，保留不同来源，不篡改源。
3. 首批已写入 5 条完整正式番号与 3 条原生 PNG 的**单号范围**（随后另增上越17、秋田11、山形42）。所有 SQL 写入都具有来源、线路、原车次名、方向、日期类型或成员 ID 范围保护，且 `ON CONFLICT DO NOTHING` 以便重跑。
4. **未修改** `manual_timetable_templates.train_number`、`train_runs`、实际编组资料、原有候选值、页面布局、`home.css`、`data/stores.csv`、`scripts/page-scripts.json` 或 `train-number-png-ranges.js`。已有 SQL→车型计划→图库解析器负责显示；不再重复创建凭空号段、脚本入口和补丁。
5. 事务已在现有 Supabase 上执行，回读结果：`400` 单车型计划、`426` 未定、`75` 正式番号证据、`73` 精确 PNG 记录、`49` 本轮新增计划车型、`0` 已确认实际编组。

**可复核 SQL 迁移**：`supabase/migrations/20261105140000_shinkansen_2611_full_number_evidence_and_holiday_vehicle_plans.sql`。该迁移已在 Supabase 执行，不需要在本地额外启动服务器。

## 图片缺口与优先级

- **P0：西九州 N700S 原生 PNG**。虽然 92/92 的计划型号已确定，但 `vehicle_image_assets` 中 JR-Kyushu N700S 对应 PNG 数为 0。应通过真实 N700S 素材和与 `N700S系` 对应的图库登记补足；不能拿既有 N700/N700A 图替代。
- **P1：九州 N700 所属方/PNG**。有 106 条 `N700系` 计划，但 JR-Kyushu + `N700系` 没有相应通用图库记录。需要确认单车是 8000 番台 R 编成、JR 西日本 S 编成，还是其他真实车队，不可仅凭“运行在九州”认为车是 JR 九州持有。
- **P1：东海道（132）/山阳（102）**。需正式番号及当前型号对应证据，尤其区分 N700A、N700S、500，避免将车型系列当作统一车号段。
- **P2：北陆（72）/东北（47）/九州（47）/北海道（26）**。按 2611 官方逐车信息、运营日、起讫和续行段逐个采集；不能仅按列车名称、尾缀或东/西公司线路来指定车型。
- 所有现有未证实位置维持单个中性列车图标或未决状态，不生成两列虚构实车，也不以官方车队候选强行替换 `PLANNED_MODEL`。

## 复核查询

```sql
SELECT m.line_key, COUNT(*) total,
       COUNT(v.timetable_id) planned,
       COUNT(*) - COUNT(v.timetable_id) unresolved
FROM manual_timetable_templates m
LEFT JOIN train_timetable_vehicle_mappings v
  ON v.source_template_id=m.id
WHERE m.line_key LIKE '%Shinkansen'
GROUP BY m.line_key ORDER BY m.line_key;

SELECT line_key, train_number, source_template_id
FROM published_train_number_evidence
WHERE edition='2611' AND line_key LIKE '%Shinkansen'
ORDER BY line_key;

SELECT line_key, min_number, max_number, suffix,
       vehicle_model, png_reference
FROM published_train_png_number_ranges
WHERE edition='2611' AND line_key LIKE '%Shinkansen'
ORDER BY line_key;
```

### 明确未完成的验收条件

**不能把以上进展称作 10 条新干线全覆盖**：现有 402 条没有逐车计划车型证据，若要把余下 333 条尚无单独登记正式番号证据的模板变成可用于号段映射的记录，需要进一步用可合法复用的 JR 官方站/车次时刻表逐项核对，且不同工作日/土休日和临时列车不可混抄。既有 10 条新干线的土休日**时刻表覆盖本身仍不完整**（参见 `docs/timetable/shinkansen-holiday-coverage-2026-10-31.md`），因此不能从本审计推导已完成全日时刻表或实际每日运行结果。

## 2026-11-05 第二轮：上越新干线平日 17 条官方番号

官方2026年11月站间时刻表提供逐列对照的 **列車番号/列車名**：
- [上越・北陸新幹線 下り 平日](https://timetables.jreast.co.jp/2611/timetable-v/004d1.html)
- [上越・北陸新幹線 上り 平日](https://timetables.jreast.co.jp/2611/timetable-v/004u1.html)

本轮依照上述官方列车名和番号逐条核对既有的 17 条上越新干线 Weekday SQL 模板，按原始源模板ID、方向、日历、线路精确连接。新增 17 条完整列车番号官方证据、17 条 E7系 PNG 精确单号行，连同既有的休日 Toki301，共 18 条官方番号及 18 条 PNG 单号映射（不是宣称实际车辆编组确定）。

例如：Toki312 是 **1312C**，Toki344 是 **1344C**，Tanigawa403 是 **2403C**。同名服务可能有季节性附加番号（如4403C），本次按2026年11月常规 Weekday 号段登记，不把特别运行日的番号改写到通用模板，也不从爱称号次机械加尾缀。来源日期与停站/到发时刻的正确性仍需要各自审计。

SQL迁移： [20261105152500_joetsu_shinkansen_2611_weekday_17_official_train_numbers_png.sql](../../supabase/migrations/20261105152500_joetsu_shinkansen_2611_weekday_17_official_train_numbers_png.sql)

已部署原有 Supabase train-runs Edge Function 至 **v298**，按日期为2026-11、官方版本2611、line_key、calendar_urn、source_template_id、direction_urn，以及官方 URL 验证后，从数据库读取正式番号，保留原始 service_name 字段。不新增页面脚本或自制图标；既有 E7 系车型计划和车图库负责图像渲染。部署及数据库回读验证成功，但尚未完成逐车浏览器端显示测试。

**2026-11-05 当日阶段回读**：10条线826份模板；400条已确认单一计划车型、426条待定；75条正式列车番号证据；73条可精确关联的 PNG 单号记录；实际车辆编组认证为0。这些计数不是全日程时刻表的完整性，也不是实时实车位置认证。

后续：继续补足秋田、山形余下未核对号码，并逐车核对东北、北陆、北海道；对于 E5/H5 或 E7/W7 同线混用、併结拆分及不明配属不强制选择图片，必须查到唯一计划车型才能建立型号对应 PNG。

## 2026-11-05 第三轮：秋田新干线 11 条平日正式列车番号

官方来源：[田沢湖線・奥羽本線 下り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html)、[東北・秋田新幹線 下り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/003d1p.html)、[東北新幹線 上り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/003u1p.html)、[こまち41 个别列车](https://timetables.jreast.co.jp/2611/train/060/062371.html)。

按已存储的源车次名、方向与 Weekday 日历核对 **11 条**，沿用 JR East E6 系官方计划车型及确实存在的原生 E6 PNG。不做「3000+爱称序号」的推测：例如「こまち17 → 9017M」「こまち45 → 5045M」「こまち51 → 5051M」。在此前「こまち1 → 3001M」休日样本之外，现有 **12/45** 条秋田模板已有正式番号及 PNG 精确单号记录。

迁移已提交到 main 并执行：[秋田新干线 11 条映射](../../supabase/migrations/20261105164500_akita_shinkansen_2611_selected_11_official_train_numbers_png.sql)。这不证明模板原定停站、每个运行日期或实际当天列车编组均可靠。

## 2026-11-05 第四轮：山形新干线 42 条平日奥羽本线 M 番号

官方来源：[奥羽本線 下り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/249d1.html)、[奥羽本線 上り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/249u1.html)。核验的是**福岛以后山形・新庄区间的 M 番号**；同列车在东北新干线区间可能采用 B 番号。不可把这两个物理区段的列车番号覆盖成同一个字符串。

**42/45** 条原有 Weekday 车型 E8 模板已按官方「列車名／列車番号」一对一匹配。例：つばさ94 → 6094M，つばさ188 → 8188M，つばさ192 → 8192M，つばさ195 → 8195M。排除 3 条存在运行日/番号歧义的服务：**つばさ88、つばさ90、つばさ177**；它们仍保留原始列车名，不以猜测型号尾号填补。加之前述休日 つばさ121 → 121M，山形共 **43/46** 条精确番号与 E8 PNG 精确单号记录。

迁移已提交到 main 并执行：[山形新干线 42 条映射](../../supabase/migrations/20261105172000_yamagata_shinkansen_2611_42_official_m_numbers_png.sql)。

## 累计数据与运行时接入

| 线路 | 正式番号证据 | 精确 PNG 单号行 | 原模板 |
|---|---:|---:|---:|
| 秋田 | 12 | 12 | 45 |
| 上越 | 18 | 18 | 18 |
| 山形 | 43 | 43 | 46 |
| 北陆 | 1 | 0 | 72 |
| 东北 | 1 | 0 | 82 |
| 其他五条 | 0 | 0 | 563 |
| **合计** | **75** | **73** | **826** |

上表「其他五条」原模板数由数据库明细求和：北海道26 + 九州159 + 西九州92 + 山阳154 + 东海道132 = 563。所有精确 PNG 单号行要求 exact roster，actual_vehicle_confirmed=false，不等于实际派车。

已部署原有 train-runs Edge Function **v298**：直接读取 SQL 的 published_train_number_evidence，按数据来源、11月版、服务日历、线路及原模板 ID 核对返回官方正式番号，同时保留服务名。既有车型计划及图库负责展示路径；新 SQL 行本身不是浏览器端 PNG 成功显示的证据。未进行浏览器端到端渲染验收。

## 2026-11-06 新一轮实际执行与验证

| 线路 | 时刻表模板 | 官方完整番号证据 | 安全单车型 PNG 精确单号 |
|---|---:|---:|---:|
| 秋田 | 45 | **45** | **45**（E6） |
| 北海道 | 26 | **26** | **0**（E5/H5 无法逐车确认） |
| 北陆 | 72 | **66** | **0**（E7/W7 无法逐车确认） |
| 上越 | 18 | **18** | **18**（E7） |
| 东北 | 82 | **81** | **35**（E6/E8） |
| 山形 | 46 | **43** | **43**（E8） |
| 九州 | 159 | 0 | 0 |
| 西九州 | 92 | 0 | 0 |
| 山阳 | 154 | 0 | 0 |
| 东海道 | 132 | 0 | 0 |
| **合计** | **826** | **279（33.8%）** | **141（17.1%）** |

更新迁移均已提交 main 且执行到已有 Supabase 项目：

- [北陆：65 条 2611 平日官方番号](../../supabase/migrations/20261106035000_hokuriku_shinkansen_2611_65_weekday_official_numbers_no_fleet_guess.sql)，另有既有休日1条；遇到 553E/5553E 等候选号不强行指定。
- [东北与北海道：80+25 条 2611 平日官方番号，东北35条 E6/E8 PNG](../../supabase/migrations/20261106041500_tohoku_hokkaido_2611_105_official_numbers_35_e6_e8_png.sql)。
- [秋田：另外33条正式 M 番号及 E6 PNG](../../supabase/migrations/20261106051000_akita_shinkansen_2611_complete_33_remaining_m_numbers_e6_png.sql)，现为45/45。
- [北海道休日：はやて91 正式91B](../../supabase/migrations/20261106053000_hokkaido_shinkansen_2611_hayate91_holiday_official_number.sql)，根据[官方个别列车时刻表](https://timetables.jreast.co.jp/2611/train/040/044991.html)核对新青森06:33发车；不同日期06:39的变体不混用。

官方列车番号来源：JR东日本2611版[上越北陆下行](https://timetables.jreast.co.jp/2611/timetable-v/004d1.html)、[上行](https://timetables.jreast.co.jp/2611/timetable-v/004u1.html)、[东北北海道下行](https://timetables.jreast.co.jp/2611/timetable-v/003d1.html)、[上行](https://timetables.jreast.co.jp/2611/timetable-v/003u1.html)、[秋田下行](https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html)及[上行](https://timetables.jreast.co.jp/2611/timetable-v/258u1p.html)。

既有 [train-runs Edge Function](../../supabase/functions/train-runs/index.ts) 读取官方证据时，已修复北海道线路运用者 JR-Hokkaido 被旧 JR-East-only guard 排除的问题，**已部署 v306**。由于 GitHub main 在当时比线上 v305 多出另一个独立 Oito 线路的未部署代码，此次仅把北海道条件修改应用于当前在运行的函数并部署 v306；主分支同步提交相同修正，但**线上代码并非与 main 全文完全一致**。没有擅自上线与新干线无关的变更。

**数据库只读审计**：279条官方完整番号、141条 PNG 精确单号；所有 PNG 范围 min=max / requires_exact_roster=true / actual_vehicle_confirmed=false；缺正式番号对应证据0；与 official_service_vehicle_plan 不符的车型0；无可用 native_png 图库路径0。

仍未完成：547条模板没有独立正式番号证据，包括北陆6、东北1（旧 Hayabusa39）、山形3（つばさ88/90/177 多候选），另有东海道、山阳、九州、西九州总计537条，需JR Central/West/Kyushu独立官方资料与车型图库。全部列车的真实运行日、停站时刻一致性、编组号和浏览器/iPhone Safari真实图片展示尚未逐车端到端验收。本任务仍是**进行中**，不能因番号证据提高而标记全线路已完成。

### 2026-11-06 线上代码最终状态补充

在前述 v306 局部部署之后，仓库已有的独立 Oito 代码随后通过正常部署流程合入线上。目前实测：Supabase train-runs **v307 ACTIVE**，其 index.ts 与 GitHub main 的源文件**全文一致**；已包含本次 JR-Hokkaido owner guard。前文的 v306 与 main 不一致只是一段中间部署状态，**不再是当前状态**。

[GitHub Pages 最新部署成功](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42089177493)；[列车 PNG 契约检查已通过](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42088471449)。通过的是代码契约/Pages 部署，不代表已经逐车完成 Safari 实机图像验收。

## 2026-11-06 续篇：JR 九州与东海道／山阳／西九州新干线号段审计

本节是 **2026-11-06 最新活库快照**，覆盖前文注明为 2026-11-05 以及当天较早时点的统计。不能把以前的 279／141 小计当成最新结果。2611 是 **2026年11月**，各公司的官网应分别匹配对应发行月，不得认为所有数据都由 JR East 编辑。

| Line | 既有 SQL 模板 | 官方完整列车番号 | 精确 PNG 单号 | 已有单车型计划 |
|---|---:|---:|---:|---:|
| AkitaShinkansen | 45 | 45 | 45 | 45 |
| HokkaidoShinkansen | 26 | 26 | 0 | 0 |
| HokurikuShinkansen | 72 | 66 | 0 | 0 |
| JoetsuShinkansen | 18 | 18 | 18 | 18 |
| KyushuShinkansen | 159 | **66** | **20**（800系） | **136** |
| NishiKyushuShinkansen | 92 | **79** | **0**（N700S PNG缺失） | 92 |
| SanyoShinkansen | 154 | **41** | 0 | 52 |
| TohokuShinkansen | 82 | 81 | 35 | 35 |
| TokaidoShinkansen | 132 | **28** | 0 | 0 |
| YamagataShinkansen | 46 | 43 | 43 | 46 |
| **合计** | **826** | **493** | **161** | **424** |

本轮具体迁移和变更：

1. [JR 九州 2611 西九州 40 个かもめ名称 → 79 条现有周历模板的正式 G 列车番号](../../supabase/migrations/20261106061000_nishi_kyushu_shinkansen_40_exact_jrkyushu_2611_g_numbers.sql)。特别区分 `2001G/2037G/2103G` 等与接续 `2001H` 等リレーかもめ的号。92份 N700S 计划车型证据仍没有同运营商原生PNG，所以0张PNG。
2. [26 个经官网逐车核对的 A 号次名称 → 67 个既有东海道／山阳／九州模板](../../supabase/migrations/20261106065500_26_named_tokaido_sanyo_kyushu_a_numbers_source_scoped.sql)。JR East 2611 综合表、JR West 11月个别车次和 JR Kyushu 2611 车次页分别保留来源。`みずほ613=613A` 只证明号码，不证明旧记录里的每段在11月均能行驶。
3. [JR 九州 つばめ300/301/302/304/305/306/308 7条正式番号 + 6条原生800系PNG](../../supabase/migrations/20261106074000_jr_kyushu_tsumbame_2611_six_native_800_png_exact_numbers.sql)：302A 是 N700，**必须排除**于800型 PNG 白名单。官方 [300A](https://www.jrkyushu-timetable.jp/sp/2611/0035/00352901.html?d=20261104&t=0829100) ／ [302A](https://www.jrkyushu-timetable.jp/sp/2611/0037/00377401.html?d=20261101&t=0829200) 页面逐车可核对。
4. [JR East 2611 组合时刻表额外32个官方A号次名称 → 44 个东海道20／山阳20／九州4的平日模板](../../supabase/migrations/20261106082500_32_exact_additional_jreast_2611_a_train_numbers_tokaido_sanyo_kyushu.sql)，只写 Weekday 正式番号，不因为一个 A 后缀决定 N700A/N700S/500。
5. [JR 九州另外18个つばめ官方车次逐一辨别车辆型号](../../supabase/migrations/20261106092000_18_kyushu_tsumbame_2611_model_proofs_14_native_800_png.sql)：17个新正式 A 番号、14个 800 系原生PNG、4个 N700 系单车型计划（其中302A已在上一步登记过正式番号）。`307A`,`309A`,`311A`,`302A` 是 N700，**不得归入 800**。型号计划来自个别列车公开编组说明，不代表当日实车。

此次 **24 个新的列车级计划车型** 已写入既有 `train_timetable_vehicle_mappings`，并新增官方 A级 `evidence_sources`，无新建表；由 400→424，未知单车型从426→402。所有号码通过 `published_train_number_evidence` 按 `source_template_id, line_key, calendar_urn, direction_urn, edition=2611` 存储，并非修改 `manual_timetable_templates.train_number`。

**运行时**：现有 [train-runs/index.ts](../../supabase/functions/train-runs/index.ts) 扩展了 JR-Kyushu G 和 JR-Central/JR-West/JR-Kyushu A 的严格官方来源白名单，保留原爱称，已部署 v308 与 v309；随后存在同仓库并行线路维护部署，最终线上版本及是否与 main 一致需单独以最新 Supabase 状态回读为准。`js/train-vehicle.js` 已有 official_service_vehicle_plan → resolveTimetableVehiclePlan → canonical generic asset 的单车型计划 PNG 通路，本轮**未修改该JS**，未曾做浏览器/iPhone Safari逐车渲染验收。

**安全性**：本次不使用号码连续 min/max 蒙混未确认车次。所有新增 `published_train_png_number_ranges` 为 min=max，`requires_exact_roster=true`，`actual_vehicle_confirmed=false`；JR九州800系 PNG `../images/列车/JR九州/JR九州_800系.png` 已通过 `vehicle_image_assets` 资产与证据检查，不能拿其他运营方 N700 或不同番台 PNG 代替。

**2026-11-06 早前阶段缺口**：333个已有 SQL 模板没有单独登记完整番号证据；402个没有列车级单一计划车型证据；真正当天编组和时刻表全覆盖、iPhone Safari PNG 验收都尚未确认。Notion对应任务必须保持「进行中」。

## 2026-11-06 早前阶段：新增 173 条正式号码、当时覆盖率 80.6%

**此小节保留早前实库回读历史数据**，最新计数请以文末 674 / 826 小节为准。正式号码有 666 条，其中本轮增加 173 条；PNG 仍为 161 条（19.5%），官方单车型计划仍为 424 条（51.3%），实际确认派车仍为 0。

- [西九州 5 个不同「かもめ」/9 条平日休日 SQL 源](../../supabase/migrations/20261106052000_nishi_kyushu_2611_five_missing_kamome_exact_g_numbers.sql)：官网逐车的 2041G、2047G、2063G、2064G、2101G，对照首站发车时刻、运营方向。无 N700S 图库 PNG，不制造替代车图。
- [JR East 2611 下行 111 个逐列刊载 A 番号](../../supabase/migrations/20261106054500_tokaido_sanyo_kyushu_2611_111_verified_down_a_numbers.sql)：东海道45、山阳53、九州13个源模板，Weekday only；[官网下行](https://timetables.jreast.co.jp/2611/timetable-v/001d1.html)。
- [JR East 2611 上行 51 个逐列刊载 A 番号](../../supabase/migrations/20261106061500_tokaido_sanyo_kyushu_2611_51_verified_up_a_numbers.sql)：东海道20、山阳24、九州7个源模板，Weekday only；[官网上行](https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html)。
- [西九州 かもめ3 两个周历模板](../../supabase/migrations/20261106064000_nishi_kyushu_kamome3_2003g_both_calendars.sql)：官网 2611 个别列车页面核实 2003G，武雄温泉 07:42；无 N700S 图片，且不以 2003H 接续列车号替代。

**最新每线正式号码（分母为既有 SQL 模板）**：
秋田45/45、北海道26/26、北陆66/72、上越18/18、九州86/159、西九州90/92、山阳118/154、东北81/82、东海道93/132、山形43/46。合计 666/826，仍缺 160。
其间的北陆6、山形3及东北1受临时列车/运转日/名称号码冲突影响，不能把同名服务直接以爱称数字推出完整番号；其他未核对班次亦不得扩大号段。

本轮迁移已直接提交 GitHub main 并在 Supabase 独立执行，未新建表、未新增页面脚本、未启用本地服务器、未创建 PR。正式号码不能被视为全日运行证据，车型也不能当作当日实际车底，保持未解决或中性图标。仍需要列车逐车浏览器/iPhone Safari 真实图片显示验收。

**CI 差异**：此前 [PNG 合约检查](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42094763681) 成功，但对应 [Pages 部署](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42094763394) 在最后「Deploy to GitHub Pages」步骤失败（前面构建及上传通过）。不能把这些记录当作网页部署/实机验收成功。

### JR 九州800系原生 PNG 前端通路复核

即使 SQL 对已核实的20个九州新干线「つばめ」番号登记了 EVIDENCE/PLAN/PNG（[本期800系单号证据](../../supabase/migrations/20261106092000_18_kyushu_tsumbame_2611_model_proofs_14_native_800_png.sql)），前端原有 [js/train-vehicle.js](../../js/train-vehicle.js) 中 `planned-stock-library-28` 的 JR九州800系 canonical 条目仍**没有 lineIds**。现有 `resolveCanonicalVehicleForPlan` 对有线路上下文的资产强制校验线路，故即使 SQL 返回 `800系`，原来的图库图片也可能被拦截。

本轮只在该 canonical 条目加入 `lineIds:["KyushuShinkansen"]`，并对已有的 [tools/train-png-display-contract.test.cjs](../../tools/train-png-display-contract.test.cjs) 增加正向断言（JR九州800系在九州新干线返回 `../images/列车/JR九州/JR九州_800系.png`），以及负向断言（同图片不可扩散到山阳新干线）。未改真实派车身份解析器、未加脚本入口、未使用 N700 代图。SQL 精确号码映射仍只针对有独立官方车次/车型证据的白名单；本次仅修复**车型图像解析的线路作用域**。这些是代码级验证，不代替 Safari 实机显示测试。


## 2026-11-06 后续调查：山阳こだま逐车车型核实 + 500系原生 PNG

**最新 Supabase 直接回读：826 个原始新干线源模板，674 条独立完整官方列车番号证据，164 条安全精确 PNG，431 条有单一计划车型，395 条没有唯一计划车型；实际当日车底确认证据为0。**

| 线别 | 模板 | 完整番号证据 | 精确 PNG |
|---|---:|---:|---:|
| 秋田 | 45 | 45 | 45 |
| 北海道 | 26 | 26 | 0 |
| 北陆 | 72 | 66 | 0 |
| 上越 | 18 | 18 | 18 |
| 九州 | 159 | 86 | 20（800系） |
| 西九州 | 92 | 90 | 0（N700S缺图） |
| 山阳 | 154 | **126** | **7（500系3、700系4）** |
| 东北 | 82 | 81 | 35 |
| 东海道 | 132 | 93 | 0 |
| 山形 | 46 | 43 | 43 |
| **合计** | **826** | **674** | **168** |

**新增迁移（均直接 main 且已在现有 Supabase 执行）**：

1. [こだま944/954/958/966：4条官方完整番号+4条逐车车型，其中2条500系精确PNG](../../supabase/migrations/20261106093000_sanyo_kodama_four_source_verified_500_700_numbers_two_native_500_png.sql)。500系：`944A`、`954A`；700系：`958A`、`966A`。每项校验原模板 ID、Weekday、JR West 所属、首末站和发到时刻，以及官网11月个别车次页面，链接分别为 [944A](https://timetable.jr-odekake.net/train-timetable/315471?date=20261128)、[954A](https://timetable.jr-odekake.net/train-timetable/315521?date=20261101)、[958A](https://timetable.jr-odekake.net/train-timetable/315541?date=20261110)、[966A](https://timetable.jr-odekake.net/train-timetable/315591?date=20261101)。
2. [こだま876/970/974/976：4条官方完整番号、3条唯一计划车型和1条500系精确PNG](../../supabase/migrations/20261106095500_sanyo_four_more_kodama_numbers_only_dated_970_and_974_native_500.sql)。700系：`876A`、`976A`，暂无对应 JR West 本家原生 PNG；500系：`974A`（PNG精确单号）。**`970A`只补番号，禁止固定500或700图**，因为 JR West 11月个别列车官方页虽然主栏显示700系，但备注明确列出11月多个特定日期改用500系：[970A 日期例外来源](https://timetable.jr-odekake.net/train-timetable/315611?date=20261104)。日期换型应由已有按日期的运营规则负责，不能把整个weekday或 `970..976A` 变成一张500 PNG。
3. [已增强既有 PNG 合约测试](../../tools/train-png-display-contract.test.cjs)：500系在SanyoShinkansen可解析现有 `../images/列车/JR西日本/JR西日本_500系.png`；若在线路上下文为KyushuShinkansen则不能借用500系；700系找不到同公司对应原生图库时维持中性图。无需修改规范车型图库：`planned-stock-library-27` 原先已经有 `lineIds:["SanyoShinkansen"]`。

**资产审计**：GitHub 现有 JR 西日本图片只含 500系、N700系及N700系7000番台，**没有 700系原生PNG**；Supabase `vehicle_image_assets` 亦没有该公司的700系记录。不能以500或N700冒充，也不能仅以是否为「こだま」推断。

**存量缺口**：152 条正式番号尚无独立证据（九州73、东海道39、山阳28、北陆6、山形3、西九州2、东北1）。尽管部分线路可从JR East总表识别同名/号次，仍需核对车次来源、方向、运行日和特殊编号。最新所有164条精确PNG均为单号 `min=max`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`。代码级CI与GitHub Pages成功/失败状态应分别检查；本轮没有进行Safari实机图片显示验收。

## 2026-11-06 用户补充 JR 西日本700系 PNG：已入库并落到4趟正式车次

**最新 Supabase 回读（该节覆盖前文“164 PNG/缺700图”的历史记录）**：新干线 826 个源模板、674 条官方完整番号、431 条已核实单一计划车型，精确 PNG **168 条**（20.3%）；当天物理编组确认证据仍为 **0**。

- 用户直接上传 82×98 调色板透明像素 PNG，保存为 [`images/列车/JR西日本/JR西日本_700系.png`](../../images/列车/JR西日本/JR西日本_700系.png)。为收缩调色板做了**逐像素 RGBA 完全相同**的无损 PNG 优化（966字节）；透明区域保留。GitHub Blob SHA: `fdd1679c3fc3dab7b49f096ddf4db7b03a27fdc9`。此素材是**用户提供的通用车型图**，不代表证实某趟列车、具体编组、车辆号或外观涂装。
- 已在既有 [`js/train-vehicle.js`](../../js/train-vehicle.js) 规范车型目录新增 `700系（JR西日本）`，限定 `lineIds:["SanyoShinkansen"]`，并在原有 [`vehicle-garage-png-map.js`](../../data/timetables/vehicle-garage-png-map.js) 中登记同一图库路径与唯一车型映射（580张图库PNG、598条规范车型引用）。没有增加 HTML script src 或独立映射脚本。
- [资产与4条精确 PNG SQL 迁移](../../supabase/migrations/20261106104000_user_jrwest_700_artwork_four_exact_sanyo_png.sql) 已执行。原生图片写入 **`vehicle_image_assets` ID=581**，运营者 `JR-West`、`vehicle_type=700系`、`asset_scope=generic`、`is_generic=true`、`file_format_status=native_png`。
- 在已存在 `published_train_number_evidence` 以及 A 级官网 `official_service_vehicle_plan` 的前提下，只给山阳新干线平日 **`876A`、`958A`、`966A`、`976A`** 各添1条 `min_number=max_number` 的700系 PNG。对应 [876A](https://timetable.jr-odekake.net/train-timetable/315601?date=20261119)、[958A](https://timetable.jr-odekake.net/train-timetable/315541?date=20261110)、[966A](https://timetable.jr-odekake.net/train-timetable/315591?date=20261101)、[976A](https://timetable.jr-odekake.net/train-timetable/315631?date=20261101)，没有新增或臆测官方车型/车次。
- **`970A` 仍然无固定 PNG**：官网11月多日700系与500系换型例外，不能把整月通用型图覆盖它。全部168条新干线 PNG 在 SQL 回读中 `min=max`、`requires_exact_roster=true`、`actual_vehicle_confirmed=false`，违规宽范围为0。
- 已在原有 [`vehicle-garage-png-map.test.cjs`](../../tools/vehicle-garage-png-map.test.cjs) 与 [`train-png-display-contract.test.cjs`](../../tools/train-png-display-contract.test.cjs) 更新图库完整性计数及跨线禁止引用等测试；[该提交 PNG 全套测试通过](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42105425319)。GitHub Pages 还需要独立确认新版部署结果，iPhone Safari 仍未实机验收。

**入库提交**：[`d303c0ff6e81c57716ec02a774a37aeef860499f`](https://github.com/biubiu52011/pixel-tetsudo/commit/d303c0ff6e81c57716ec02a774a37aeef860499f)，直接 `main`，没有 PR、新 SQL 表或额外 src。

## 2026-11-06 新增调查：875A/956A/880A 700系原生PNG、四条跨线ひかり的山阳段

**本节为最新实库统计，取代上文阶段性数字**：新干线模板826条、2026年11月官方完整番号**681**条（82.4%）、唯一计划车型**439**条（53.1%）、精确原生PNG**171**条（20.7%）、当天实际车底确认**0**。本轮从674/431/168分别增加7个番号、8个车型计划和3个PNG单号。

### JR西日本700系通用原生PNG新增三趟

[本轮原SQL迁移](../../supabase/migrations/20261106111000_jrwest_2611_three_kodama_700_native_png_source_exact.sql)直接复用此前用户提供的JR西日本700系82x98原生素材、既有车型库和资产表，无重复素材或脚本。

- **875A／こだま875**：[JR西日本2611官网](https://timetable.jr-odekake.net/train-timetable/315371?date=20261108)显示700系8辆、广岛06:05发、博多07:33到、每日运行。与源模板9277（Weekday）及128895（SaturdayHoliday）分别匹配；原有weekday正式番号保留，新补holiday号码，两个日历仅生成**一条**875A单号PNG。
- **956A／こだま956**：[官网](https://timetable.jr-odekake.net/train-timetable/315531?date=20261110)：700系8辆、博多13:51发、17点以后新大阪18:25到；Weekday源模板9349。
- **880A／こだま880**：[官网](https://timetable.jr-odekake.net/train-timetable/315641?date=20261119)：700系8辆、博多22:20发、新下关22:46到；Weekday源模板9373。

三趟分别新增700系 **875A、956A、880A** 原生 PNG 精确单号；4条源模板独立列车级官方A类车型证据全部核查成功。单号条件 min=max、requires_exact_roster=true、actual_vehicle_confirmed=false，不扩大为连续8xx、9xx号段。

### 四趟跨线ひかり只登记山阳段

[本轮原SQL迁移](../../supabase/migrations/20261106115500_sanyo_four_hikari_2611_a_numbers_n700_plan_only.sql)只对下面4条山阳新干线现存平日源模板写入正式番号与N700系计划车型，**不生成N700精确PNG**，也不擅自锁定JR西日本/JR东海具体实车：

- **702A**：[官网](https://timetable.jr-odekake.net/train-timetable/314471?date=20261111) 冈山08:42→新大阪09:46。
- **708A**：[官网](https://timetable.jr-odekake.net/train-timetable/314501?date=20261121) 冈山11:36→新大阪12:46。
- **714A**：[官网](https://timetable.jr-odekake.net/train-timetable/314531?date=20261104) 冈山14:36→新大阪15:46。
- **718A**：[官网](https://timetable.jr-odekake.net/train-timetable/314551?date=20261122) 冈山16:36→新大阪17:46。

**查到旧东海道源时刻问题，停止跨线强制合并**：上述四车的东海道原始模板把新大阪第一条departure_clock记录为09:46/12:46/15:46/17:46，即官网的到站时刻；官网继续往东京的实际公布发车时刻分别是09:48/12:48/15:48/17:48。旧模板东京到站则全部晚于2611官网1分钟（如702原12:43、官网12:42）。源责任位于 data/timetables/TokaidoShinkansen-manual.js 和既有SQL模板，应先进行源数据时刻修复与版本核对，不能直接修改四条东海道段的正式号码或以补丁掩盖导入问题。本轮没有改动其任何时刻记录或正式番号。

### 970A的精确日期计划，但未升级为实际车底

[JR西日本2611官方970A](https://timetable.jr-odekake.net/train-timetable/315611?date=20261104)备注：11月2–4、6–7、9–12、14–18、20–21、23–24、26–27、29–30，共**22天**预计500系；11月1、5、8、13、19、22、25、28，共**8天**按主栏计划700系。随时可能临时更换。现有 train_vehicle_date_rules 和 operation_vehicle_date_rules 的应用语义属于日期车辆证据，不可仅凭计划将其写成当天已确认的实际派车。故970A继续没有任何静态单车型PNG或实际车底标记，等待现有日期分级机制查清再处理。

### 安全与后续

本批迁移均已commit至main、原库实际执行并回读；没有建立新SQL表、任何新script入口、本地服务器或PR。现有171条PNG严格都是min=max、requires_exact_roster=true、actual_vehicle_confirmed=false；相关原生700系图库本轮没有修改。剩余**145**个已存在模板无2611完整番号（九州73、东海道39、山阳21、北陆6、山形3、西九州2、东北1），另外**387**个缺唯一车型计划。公开Pages CI成功与iPhone Safari实际显示必须分开验收。


## 2026-11-06 追加：计划列车映射口径与山阳3趟ひかり

**用户确认新干线与其他手工线路相同，显示“计划列车”而非实时实车。** 正式番号是官网计划编号，车型来源为官网单一系列计划或明确候选；显示位置按时刻表推算，不写入实际编组身份。不因 `actual_vehicle_confirmed=false` 否决本来就有证据的计划车型；但也不能凭名字、后缀或线路把N700A/N700S、E5/H5、E7/W7或JR公司车底所有权猜成唯一车型。

本轮依据[JR东日本2611 ひかり704](https://timetables.jreast.co.jp/2611/train/125/128731.html)、[JR东日本2611 ひかり720](https://timetables.jreast.co.jp/2611/train/125/128811.html)、[JR西日本2611 ひかり682](https://timetable.jr-odekake.net/train-timetable/314441?date=20261103)逐趟核验；已按源模板ID、Weekday、SanyoShinkansen、JR-West、Inbound、首末站和发到时刻锁定既有数据库源，且证据与 `source_only` 主成员一一对应：

| 原服务名 | 官方完整番号 | 源模板ID | 首发／末到 | 唯一计划车型 | PNG |
|---|---|---:|---|---|---|
| ひかり682 | 682A | 9371 | 博多20:52 → 新大阪23:32 | N700系（计划家族） | 未绑定 |
| ひかり704 | 704A | 9338 | 冈山09:36 → 新大阪10:46 | N700系（计划家族） | 未绑定 |
| ひかり720 | 720A | 9363 | 冈山17:36 → 新大阪18:46 | N700系（计划家族） | 未绑定 |

直接main迁移：[20261106064000_sanyo_three_hikari_2611_exact_numbers_n700_plan.sql](../../supabase/migrations/20261106064000_sanyo_three_hikari_2611_exact_numbers_n700_plan.sql)，已在现有Supabase执行并读回3条精确官方番号和 `official_service_vehicle_plan`。**最新总数684/826正式番号，442/826唯一计划车型，171/826 PNG；另有142条编号和384条计划车型未补。** 现有171 PNG的宽范围=0、非exact=0、假实车标记=0。没有新增SQL表、PNG路径、脚本src、PR或本地服务器。

剩余问题：山阳のぞみ34/40/46等原始SQL存储“新大阪发车时刻”作为山阳段末到时刻（官网真实到站早2分钟），东海道部分ひかり同样存在首发时刻与官网版次差异。此类原始时刻错误必须先查清源脚本与SQL责任归属再同步修复，**不能为了提高番号数量忽略站时一致性**。真实Pages/Safari图像逐车验收未进行，因此仍为“进行中”。
