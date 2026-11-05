# 新干线 2026-11 列车番号 → 计划车型 → PNG 分级覆盖审计

**最新回读日期**：2026-11-06  
**范围**：Supabase `pnupwfmgbtxqhpzsrhfn` 中现有 10 条 `%Shinkansen` 线路的 `manual_timetable_templates`；`2611` 为 JR 东日本 2026 年 11 月出版版本。  
**规范**：[Notion《全线路列车番号→车型→PNG 覆盖率审计》](https://app.notion.com/p/PNG-40ed1daae25681a4ad4eca747b1586b6?source=copy_link)。

## 总体结果

| 口径 | 更新前 | 更新后 |
|---|---:|---:|
| 原始时刻表模板（不是实际每日运行记录） | 826 | 826 |
| 有官方依据的单一**计划车型** | 351 | **424** |
| 无列车级单车型计划 | 475 | **402** |
| 已证明当日实际物理编组 | 0 | **0** |
| 已写入 `published_train_number_evidence` 的新干线正式**完整列车番号** | 0 | **493** |
| 已写入 `published_train_png_number_ranges` 的新干线逐个精确番号 PNG | 0 | **161** |

**单车型计划覆盖率：424 / 826 = 51.3%；正式番号证据 493 / 826 = 59.7%；安全 PNG 单号 161 / 826 = 19.5%。这不是全列车班次覆盖，也不是已在浏览器实际渲染 161 张 PNG。**

## 各线计划车型覆盖率（2026-11-06 最新回读）

| Line key | 已有模板 | 官方单车型计划 | 仍待核实 | 当前已知障碍 |
|---|---:|---:|---:|---|
| AkitaShinkansen | 45 | **45** | 0 | E6 官方车型计划，**45/45 正式番号与 PNG 精确映射** |
| HokkaidoShinkansen | 26 | 0 | **26** | **26/26 正式番号**，E5/H5 不可据名分辨、PNG 仍为 0 |
| HokurikuShinkansen | 72 | 0 | **72** | **66/72 正式番号**，E7/W7 车底未逐车证实、PNG 仍为 0 |
| JoetsuShinkansen | 18 | **18** | 0 | E7 计划车型；**18条正式番号和精确 PNG 单号映射** |
| KyushuShinkansen | 159 | **136** | **23** | 800／N700 依官方个别列车精确区分：66 条正式番号、20 条安全 800系 PNG；N700 缺对应图库 |
| NishiKyushuShinkansen | 92 | **92** | 0 | N700S 6 辆计划车型确定，**图库无对应 N700S PNG** |
| SanyoShinkansen | 154 | 52 | **102** | 500/N700/N700S 混用；直通车所属方不能仅从线路推定 |
| TohokuShinkansen | 82 | 35 | **47** | **81/82 正式番号**，35 条 E6/E8 单车型 PNG；其他混用未猜测 |
| TokaidoShinkansen | 132 | 0 | **132** | N700A/N700S 与跨公司运行；没有每车次对应证据 |
| YamagataShinkansen | 46 | **46** | 0 | **43/46 正式番号与 E8 PNG**，3 条多重番号待核 |
| **合计** | **826** | **424** | **402** | 实际编组全部未证实；正式番号 493、精确 PNG 161 |

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

**剩余缺口**：333个已有 SQL 模板没有单独登记完整番号证据；402个没有列车级单一计划车型证据；真正当天编组和时刻表全覆盖、iPhone Safari PNG 验收都尚未确认。Notion对应任务必须保持「进行中」。
