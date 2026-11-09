# JR 线路缺口与数据库登记同步结果 — 2026-11-09

## 状态与真实范围

本轮分为两个独立交付，**不要将有线路或车站视为有已验证列车**：

1. 静态主数据、线路图与路径搜索拓扑：GitHub `6d960312218f422c42629e4b1fa4c7b3ea6ed071`，随后 `bc963500bc03526bdef0a63a867b76283557f05f` 对三条新支线明示 `timetableDataStatus=station_topology_only`，避免假定存在车型 PNG。
2. Supabase 生产库 `pnupwfmgbtxqhpzsrhfn`：与已存在的 canonical `data/core/railway_data.compact.json` 对照，只补登确实已有的静态线路与站点；不生成任何新时刻表、运行日、车辆计划。

相关审计：`docs/audits/jr-missing-lines-and-physical-topology-20261109.md`。

## 生产数据库已实际执行、校验

补登以下12个 `railway_lines`，直接使用既有前端 Line ID 和运营公司：

| ID | 公司 | 已确认站数 |
|---|---|---:|
| Yumesaki | JR-West | 4 |
| KansaiAirport | JR-West | 3 |
| WakayamaLine | JR-West | 36 |
| Sakurai | JR-West | 14 |
| KagoshimaMainJA | JR-Kyushu | 32 |
| KagoshimaMainJB | JR-Kyushu | 29 |
| Wakamatsu | JR-Kyushu | 5 |
| Haruda | JR-Kyushu | 5 |
| Hitahikosan | JR-Kyushu | 16 |
| SanyoWadamisaki | JR-West | 2 |
| HanwaHagoromo | JR-West | 2 |
| SaninSenzaki | JR-West | 2 |

数据库原本没有以上12条的站序；复用JSON里146个唯一站点，其中78个数据库已有、68个新建，关联共150条，均保留原始站序及 JSON 中的经纬度。二次 SQL 查询已逐ID核对，**12/12条站序、公司完全一致**。

这12个线路登记的能力标记为：
`timetable_api_enabled=false`,
`realtime_position_api_enabled=false`,
`sql_planned_fallback_enabled=false`。
全部仍为0条 `manual_timetable_templates`。绝不由站点数量推断时刻表覆盖或实时运行能力。

另修正 `railway_lines.HakataMinami.timetable_operator` 由 `JR-Kyushu` 为 `JR-West`。既存109条 `manual_timetable_templates` 有旧JR九州标识，通过严格核对原数量、来源ARN及目标站前缀后，在原行更新 operator 前缀：
- railway_urn: `odpt.Railway:JR-West.HakataMinami`
- train_type_urn: `odpt.TrainType:JR-West.LimitedExpress`
- destination_urns: `odpt.Station:JR-West.HakataMinami.<station>`

再次读取原表及只读视图：109/109模板、109/109发布时间表方案行、218/218停站行已体现 JR-West 标识；未改变原列车号码、站序、到发时刻、适用日历及来源说明。**LimitedExpress 种别及原历史时刻表仍属未独立重新核证的旧源**，不能因为修改公司名就标成官方确认。

## 可重复的只读核验

```sql
SELECT l.id, l.timetable_operator,
       l.timetable_api_enabled, l.realtime_position_api_enabled,
       l.sql_planned_fallback_enabled,
       count(s.station_name) AS station_count,
       (SELECT count(*) FROM public.manual_timetable_templates m
        WHERE m.line_key=l.id) AS template_count
FROM public.railway_lines l
LEFT JOIN public.line_stations s ON s.line_id=l.id
WHERE l.id IN (
  'Yumesaki','KansaiAirport','WakayamaLine','Sakurai',
  'KagoshimaMainJA','KagoshimaMainJB','Wakamatsu','Haruda',
  'Hitahikosan','SanyoWadamisaki','HanwaHagoromo','SaninSenzaki')
GROUP BY l.id,l.timetable_operator,l.timetable_api_enabled,
         l.realtime_position_api_enabled,l.sql_planned_fallback_enabled
ORDER BY l.id;
```

以上是已在生产库执行的、有来源约束的补登记录，不表示把所有前端导入的线路统一交给 SQL。完整前后端身份自动同步、时刻表及列车身份仍需要后续逐线完成。

## 剩余缺口（未推测数据）

- JR东海：13个原有数据库登记项没有前端完整地理/站序及历史时刻数据；保留壳记录，不虚构站点。
- JR北海道和JR四国：前端仍缺大面积在来线。没有完整官方站序与坐标时不新增假记录。
- JR西日本：北陆、冈山/广岛/山阴部分在来线尚未完整导入；JR东日本：日光线/利府支线等；JR九州：肥萨线、筑肥线西段尚未完整导入。
- 弥彦线的 `Yahiko` 与 `Miyo` ID 是另一项需要源ID合并的工作，不能再创建重复线路表；非 JR 还有局部前后端不同步。
- 后续先看哪个脚本/主数据表负责，再做官方站表与服务日历校验；绝不先添加 UI CSS 或假定列车位置来掩盖缺口。

## 质量证据

- GitHub CI `https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42543629392`：88个工作流步骤通过（包含新增拓扑测试及车型安全审计）。
- GitHub Pages `https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42543629361`：部署成功。
- Supabase 的数据库回填在生产执行成功，并且独立二次读取逐条核实；没有将代码提交等同于数据自动部署。
