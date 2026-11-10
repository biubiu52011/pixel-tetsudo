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
