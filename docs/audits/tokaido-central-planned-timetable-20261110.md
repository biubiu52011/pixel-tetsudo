# JR东海东海道本线（TokaidoCentral）计划时刻表修复与验收记录

日期：2026-11-10。范围仅为 JR-Central 热海～米原；不得把 JR-East 的 `Tokaido` / `TokaidoMain`、JR-West 的 `TokaidoKansai` 或 `TokaidoShinkansen` 当成在来线计划车次。

## 已核实事实

- canonical 线路有 84 站（83 个相邻区间），当前为站点拓扑资料，未登记经过验证的区间运行分钟。搜索页可根据拓扑寻找路径，但只有 `RouteTimetable` 返回完整、确认过终到时刻的计划，才会显示确认旅行时间。
- Supabase 项目 `pnupwfmgbtxqhpzsrhfn` 在审计时，`manual_timetable_templates`、`published_timetable_plan_trains`、`train_runs`、`train_operation_mappings` 均无该 `line_key` / `line_id` 的记录；`line_stations` 亦未登记。
- 数据库 `published_timetable_full_day_acceptance`：`raw_coverage_status=missing_all_plans`，`acceptance_status=blocked_no_published_trains`，平日、土休日、完整日程及来源修订未通过。
- `railway_lines` 仍正确标明 `timetable_operator=JR-Central`、`timetable_api_enabled=false`、`realtime_position_api_enabled=false`。保留 `sql_planned_fallback_enabled=true` 是现有 SQL 入口的配置，**不意味着已有任何 SQL 计划**；`train-runs` 对无资料返回 `NO_API_NO_DATA` 和 `runs:[]`。
- `line_data_inventory` 已新增本线路的官方入口，`data_kind=official_station_timetable_missing_full_plan`，`migration_status=discovered`。这仅是来源登记，不是已迁移资料。
- `js/trains-page.js` 已使用现有 `trainsOfficialRuninfo` 责任组件给出中/日/英/韩四语种缺失告知，入口只作外部查询，**不参与自动列车推算**。

## 后续资料核验顺序（不以资料存在代替逐车验收）

1. **官方版本与运行日**：JR东海 2026-03-14 改正的各站时刻表：<https://railway.jr-central.co.jp/time-schedule/search/>；运行信息：<https://traininfo.jr-central.co.jp/zairaisen/index.html>。发布目录的月份需与将要使用的服务日期吻合，特殊日期、增发及运休独立处理。
2. **分区段采集**：热海～丰桥、浜松～米原分别核验平日与土休日，浜松～丰桥重叠区间必须按同日、同方向、**真实列车号和沿途时刻**消重。不能用车次数字相同自动认定贯通，也不得把武丰线或新干线并入主线。
3. **辅助图表（非 JR 官方证据）**：<https://traing.o.oo7.jp/traing/oudia/dia22.html> 标示 2026-03-14 改正的两段 OuDia 与平日、土休日 PDF。该站为第三方整理，只可作待复核来源；须遵守来源使用条款，不能以其版本标签推断 2026-11 当天全日资料已核准。
4. **号码及车辆**：列车番号必须分别具备运行日历、方向、起终站、停站时刻及来源证据；车辆映射继续使用现有 `train_operation_mappings` 与统一车型解析器。候选车型不代表当天实际编组，也不自动授权 PNG。
5. **物理车站身份阻断项**：当前的 `Kashiwara` 键与 JR-West `KansaiMain` 存在同名站冲突；在对齐 canonical 站 ID 和 SQL `line_stations` / `stations` 前，不能把该键用于全日计划的中间站连接或虚假换乘。其他缺失坐标与别名换乘也需单独核验。
6. **最终验收**：对 `published_timetable_full_day_acceptance`、`published_timetable_plan_coverage`、`published_timetable_plan_quality_summary`、`published_timetable_chronology_issues` 复核，确保平日/土休日上下行、列车番号、终到/经停、跨午夜、车次连续性、官方版本有效期及已确认的时刻覆盖。未通过之前禁止把任何线路标记为「全日完成」。

## 可重复的只读 SQL

```sql
select id, timetable_operator, timetable_api_enabled,
       realtime_position_api_enabled, sql_planned_fallback_enabled
from public.railway_lines where id = 'TokaidoCentral';

select 'templates' as source, count(*) as rows
from public.manual_timetable_templates where line_key='TokaidoCentral'
union all select 'plan_trains', count(*)
from public.published_timetable_plan_trains where line_key='TokaidoCentral'
union all select 'train_runs', count(*)
from public.train_runs where line_id='TokaidoCentral'
union all select 'operation_mappings', count(*)
from public.train_operation_mappings where line_id='TokaidoCentral'
union all select 'station_registry', count(*)
from public.line_stations where line_id='TokaidoCentral';

select line_key, raw_coverage_status, acceptance_status,
       weekday_source_trains, holiday_source_trains,
       full_day_timetable_acceptance_passed, source_audit_issues
from public.published_timetable_full_day_acceptance
where line_key='TokaidoCentral';

select line_key, source_path, migration_status, data_kind, notes
from public.line_data_inventory where line_key='TokaidoCentral';
```

## 本次限制

已修复**展示诚实性、来源登记与回归保护**。尚未获得足以安全生成所有车次与站间时刻的逐车官方来源及物理车站身份校验，因此未制造计划列车、未强行插入不完整手动时刻表，也未更改生产 Edge Function 或把测试车次写入 SQL。此状态不是最终的时刻表导入完成。

## 2026-11-10 新增调查：以 JR 东日本 SQL 为参照

### 现有 JR 东线的准确参照范围

同一生产 Supabase 实测：

| line_key | Weekday | SaturdayHoliday | 来源与覆盖性质 |
| --- | ---: | ---: | --- |
| `Tokaido` | 365 | 327 | `odpt-api:v1:Tokaido`；JR-East |
| `TokaidoMain` | 365 | 327 | 历史 `data/timetables/TokaidoMain-manual.js`；JR-East |
| `TokaidoCentral` | 0 | 0 | JR-Central，尚无 SQL 列车 |

JR-East 两组各 692 个模板，**两者不是 JR-Central 的候选时刻表**。这 1,384 个记录的 `source_revision_date`、`revision_id`、`operating_dates` 均为 NULL（0/1,384 有日期修订证据），各自全日验收状态均为 `pending_source_edition_verification`。因此只借用关系结构与消费流程，而不能把这些旧记录当作 2026-11 已逐车验证资料。JR-East 官方时刻表页面对复制、转载、加工设有限制：<https://timetables.jreast.co.jp/>。

**要复用的唯一链路**：`railway_lines.id='TokaidoCentral'` → `line_stations` / `stations`（可靠物理身份） → `manual_timetable_templates`（运营日历、番号、方向、种别、版本、来源） → `manual_timetable_template_stops`（顺序、停站到发时刻） → 现有 `train_timetable_source_resolution` / canonical source owner → `train-runs` → 前端 `DataFusion.ensureTimetable` + 同一估算器。验证运营状态与车辆运行可另外使用 `train_operation_mappings`，没有证据时保持未确认。不得另加前端自生成列车数据源。

### 已发现的资料：来源等级与获取边界

| 来源 | 具体覆盖与用途 | 不能直接证明的内容 |
| --- | --- | --- |
| JR东海官方 <https://railway.jr-central.co.jp/time-schedule/search/> | 热海～米原及大垣～美浓赤坂，站点时刻、方向、目的地、种别、平日/土休日 | 沿线每站完整到发、所有列车番号、实际编组 |
| 2026-03 官方单站示例 <https://railway.jr-central.co.jp/time-schedule/srch/_pdf/data/202603/tokaido_Gifu_A_h_d.pdf> | 岐阜土休日、大垣/米原方向，站内告示式交叉核验 | 官方逐列车全线 stop-by-stop 清单 |
| JR西日本站外可查的区间时刻表 <https://timetable.jr-odekake.net/line-timetable/2244>（米原～浜松，上行）、<https://timetable.jr-odekake.net/line-timetable/2248>（浜松～米原，下行） | 网页存在列车番号、种别、沿途时刻和指定日期；已找到 2026-11-03 下行页面。只作逐项交叉核验的调查线索 | 不能自动视为 JR-Central 已授权开放的数据库；其他日期须单独查询确认 |
| 民间 OuDia：<https://traing.o.oo7.jp/traing/oudia/dia22.html> | 2026-03-14 改正，热海～丰桥（2026-06-02 掲載）、浜松～米原（2026-04-20 掲載），均列平日/土休日；浜松～丰桥两套资料有重叠，可用于核查番号与边界 | 非官方，不能断言每一条在 2026-11 仍有效，也不能默认允许再发布原始文件 |
| 私设运用：<https://yoke4000.main.jp/jru/tokaidoWD.html>；<https://tokaido-unyo-shizuoka.com/unyo/202603/tokaido-202603-down.html> | 番号、运用族与部分区间时刻候选；供人工核对车型 | 包含推测和变动，不能作为确定编组 PNG 的授权依据 |
| 国交省国土数值信息 N02 2025：<https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html> | **CC BY 4.0**：铁路、运营者、线路、站名和站点几何，2025-12-31 基准；能合规处理站点 identity/coords，但须按要求标注来源与加工 | 不含全日列车番号和停站时刻 |
| 交通新闻社授权数据销售：<https://www.kotsu.co.jp/service/jikoku_solution/data_sales/> | JR 6社 CSV/XML/GTFS，按月更新；可获正式数据授权 | 官网明确面向法人/团体，不是零成本个人开放接口 |

**许可约束**：JR西日本 <https://www.jr-odekake.net/use/about.html> 及其列车时刻表页面说明受著作权和许可约束；交通新闻社数据亦限制未获授权的转载、复制及加工。不能因为网页可访问，就直接镜像其全线逐车时刻或把他站完整表抓取入公开数据库。OuDia 及私设资料还须确认各自许可。研究阶段仅登记来源 URL、覆盖与质量特征，**未复制任何完整第三方时刻表数据到 GitHub/Supabase**。官方 JR-East 的 2026 Challenge 数据集还存在专用限定许可：<https://ckan.odpt.org/en/dataset/jreast__r_train_timetable>；同样不能自动推及 JR-Central。

### 拟导入的单车记录契约

- `line_key` 只允许 `TokaidoCentral`；`timetable_operator=JR-Central`，`railway_urn` 须有对应来源证据，严禁复用 `odpt.Railway:JR-East.Tokaido`。
- 一条 `manual_timetable_templates` 需要明确 `calendar_urn`（平日/土休日）与列车番号。2026-11 日期有效性须通过有来源的 `revision_id` / `source_revision_date` / `operating_dates` 或官方相应版本证据确定；不能用「网页为 2026-03 改正」自动覆盖 11 月的所有临时修改。
- `manual_timetable_template_stops` 按该物理列车与线路方向记录停站、到/发时刻。不得拿首站发车表推算沿线每站 arrival/departure，也不得把 2 分钟/站的静态路径权重称为计划时刻。
- 边界处理：热海与 JR-East 的车次连续性、米原与 JR-West 的接续、浜松～丰桥两套图表交叉、武丰线/美浓赤坂支线，以及 2026 年改正后的跨浜松直通减少，均须靠实际同车证据判定；号码一样不自动合并。
- 阶段验收：先身份与来源，其次两份运行日历，再双方向、时刻顺序、跨日处理，最后车型映射和 PNG；`published_timetable_full_day_acceptance` 在两日历未确证前必须继续阻断。

### 另外发现的车站冲突（不仅是柏原）

现有 canonical `TokaidoCentral` 包含 **84** 站；**72** 站无有效坐标。且以下共用 ID 错误：

| 当前 ID | 东海道线真正车站 | 复用的错误身份 |
| --- | --- | --- |
| `Shimada` | 静冈县島田 | 山阳本线山口县島田，仓库与 SQL 当前坐标 `34.17,131.8` |
| `Kikukawa` | 静冈县菊川 | 东京都都营新宿线菊川，仓库与 SQL 当前坐标 `35.688399,139.806057` |
| `Kashiwara` | 滋贺县柏原（かしわばら） | 大阪关西本线柏原（かしわら）；当前全局坐标 `35.127227,135.07731` 也不对应本线路 |

下一步先用 N02 按**运营公司 + 线路名 + 站名 + 相邻车站 / 地理范围**建立三处独立 canonical ID，并保持原先其他线路物理站不受影响；随后完成 84 站坐标及 SQL `line_stations` 注册。不得对同名站统一覆写全局 `stations` 坐标。N02 数据未在本次连接环境下载/解析，故此节不提供未核对的替代经纬度。

### 调查执行边界

本次取得的是可核验的**来源目录、SQL参照、数据身份风险与授权边界**。没有导入列车模板、没有部署 Edge Function、没有宣称线路已通过时刻表验收。第三方 OuDia ZIP 和 N02 全量数据在当前联网环境未能下载；后续实际解析时应记录数据版本 SHA 与核验凭据，不能凭当前网页元数据猜测文件内部车次数量。
