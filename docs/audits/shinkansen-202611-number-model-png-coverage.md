# 新干线 2026-11 列车番号 → 计划车型 → PNG 分级覆盖审计

**日期**：2026-11-05  
**范围**：Supabase `pnupwfmgbtxqhpzsrhfn` 中现有 10 条 `%Shinkansen` 线路的 `manual_timetable_templates`；`2611` 为 JR 东日本 2026 年 11 月出版版本。  
**规范**：[Notion《全线路列车番号→车型→PNG 覆盖率审计》](https://app.notion.com/p/PNG-40ed1daae25681a4ad4eca747b1586b6?source=copy_link)。

## 总体结果

| 口径 | 更新前 | 更新后 |
|---|---:|---:|
| 原始时刻表模板（不是实际每日运行记录） | 826 | 826 |
| 有官方依据的单一**计划车型** | 351 | **400** |
| 无列车级单车型计划 | 475 | **426** |
| 已证明当日实际物理编组 | 0 | **0** |
| 已写入 `published_train_number_evidence` 的新干线正式**完整列车番号** | 0 | **75** |
| 已写入 `published_train_png_number_ranges` 的新干线逐个精确番号 PNG | 0 | **73** |

**单车型计划覆盖率：400 / 826 = 48.4%。这不是“车次号段全部完成”，也不是已实际显示 400 张 PNG。**

## 各线覆盖率（2026-11-05 更新后）

| Line key | 已有模板 | 官方单车型计划 | 仍待核实 | 当前已知障碍 |
|---|---:|---:|---:|---|
| AkitaShinkansen | 45 | **45** | 0 | E6 官方车型计划；12条正式番号与 PNG 单号映射（平日11 + 休日1） |
| HokkaidoShinkansen | 26 | 0 | **26** | E5/H5 跨运营方车辆，无法按线路/爱称指定个别车 |
| HokurikuShinkansen | 72 | 0 | **72** | E7/W7、车辆所属方及通过运行需单车证据 |
| JoetsuShinkansen | 18 | **18** | 0 | E7 计划车型；**18条正式番号和精确 PNG 单号映射** |
| KyushuShinkansen | 159 | 112 | **47** | 800 与 N700 混用；已映射 N700 缺 JR 九州同车型通用 PNG |
| NishiKyushuShinkansen | 92 | **92** | 0 | N700S 6 辆计划车型确定，**图库无对应 N700S PNG** |
| SanyoShinkansen | 154 | 52 | **102** | 500/N700/N700S 混用；直通车所属方不能仅从线路推定 |
| TohokuShinkansen | 82 | 35 | **47** | E2/E5/E6/E8 等、部分併结运行；不可从爱称或尾缀直接推断 |
| TokaidoShinkansen | 132 | 0 | **132** | N700A/N700S 与跨公司运行；没有每车次对应证据 |
| YamagataShinkansen | 46 | **46** | 0 | E8 官方车型计划；43条正式番号与 PNG 单号映射（平日42 + 休日1） |
| **合计** | **826** | **400** | **426** | 实际编组全部未证实 |

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

**不能把以上进展称作 10 条新干线全覆盖**：剩余 426 条没有逐车计划车型证据，若要把余下 751 条尚无单独登记正式番号证据的模板变成可用于号段映射的记录，需要进一步用可合法复用的 JR 官方站/车次时刻表逐项核对，且不同工作日/土休日和临时列车不可混抄。既有 10 条新干线的土休日**时刻表覆盖本身仍不完整**（参见 `docs/timetable/shinkansen-holiday-coverage-2026-10-31.md`），因此不能从本审计推导已完成全日时刻表或实际每日运行结果。

## 2026-11-05 第二轮：上越新干线平日 17 条官方番号

官方2026年11月站间时刻表提供逐列对照的 **列車番号/列車名**：
- [上越・北陸新幹線 下り 平日](https://timetables.jreast.co.jp/2611/timetable-v/004d1.html)
- [上越・北陸新幹線 上り 平日](https://timetables.jreast.co.jp/2611/timetable-v/004u1.html)

本轮依照上述官方列车名和番号逐条核对既有的 17 条上越新干线 Weekday SQL 模板，按原始源模板ID、方向、日历、线路精确连接。新增 17 条完整列车番号官方证据、17 条 E7系 PNG 精确单号行，连同既有的休日 Toki301，共 18 条官方番号及 18 条 PNG 单号映射（不是宣称实际车辆编组确定）。

例如：Toki312 是 **1312C**，Toki344 是 **1344C**，Tanigawa403 是 **2403C**。同名服务可能有季节性附加番号（如4403C），本次按2026年11月常规 Weekday 号段登记，不把特别运行日的番号改写到通用模板，也不从爱称号次机械加尾缀。来源日期与停站/到发时刻的正确性仍需要各自审计。

SQL迁移： [20261105152500_joetsu_shinkansen_2611_weekday_17_official_train_numbers_png.sql](../../supabase/migrations/20261105152500_joetsu_shinkansen_2611_weekday_17_official_train_numbers_png.sql)

已部署原有 Supabase train-runs Edge Function 至 **v298**，按日期为2026-11、官方版本2611、line_key、calendar_urn、source_template_id、direction_urn，以及官方 URL 验证后，从数据库读取正式番号，保留原始 service_name 字段。不新增页面脚本或自制图标；既有 E7 系车型计划和车图库负责图像渲染。部署及数据库回读验证成功，但尚未完成逐车浏览器端显示测试。

**全库复核**：10条线826份模板；400条已确认单一计划车型、426条待定；75条正式列车番号证据；73条可精确关联的 PNG 单号记录；实际车辆编组认证为0。这些计数不是全日程时刻表的完整性，也不是实时实车位置认证。

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
