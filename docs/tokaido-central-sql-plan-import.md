# TokaidoCentral — SQL 计划时刻表导入契约（2026-11）

## 当前状态

- 路线：`TokaidoCentral` / JR-Central，热海～米原 84 站，`public.line_stations` 已注册。
- 原计划读取链：`manual_timetable_templates` → `manual_timetable_template_stops` → `train_timetables` + `train_timetable_members` → 既有 `train-runs`。
- 2026-11-11 已在生产 Supabase 安装管理员专用 `public.import_tokaido_central_authorized_plan(jsonb)`；它**不是一个新的数据源**，不自动抓取网页，不生成列车位置，不向客户端开放写入口。
- **列车计划记录目前仍为 0。** 对外页面只展示缺失状态。未获逐车许可/证明，不得称时刻表已完成。

## 来源与许可门槛

公开能查看的数据**不等于获准复制为公共数据库**。JR东海站级时刻表不提供完整逐车、逐站、全日的结构化列车计划；JR西日本区间/列车页面声明未经授权不得转载、复制或加工其时刻数据。民间 2026-03-14 OuDia 资料也必须先确认再发布许可与 2026-11 版本有效性。

合法可用的输入来源：①自行独立调查形成并享有发布权的数据；②明确获得授权、授权范围覆盖公开 SQL/网页展示的来源。必须保存来源 URL、**授权证明 URL**和版本日期，在管理员审查过后才能执行导入函数；仅填写 `authorization` 字段不能替代真实的授权审查。

## 单个 SQL 导入批次的 JSON 格式

下列是**接口结构示意，不是真实时刻表**，所有 `<...>` 必须由有来源的真实数据替换；不能直接导入。运行日以具体日期枚举，**不从平日/土休日自动扩展整月**。

```json
{
  "source": {
    "url": "https://<具有使用许可的资料来源>",
    "authorization": "original_compilation",
    "authorization_evidence_url": "https://<授权/原创资料证明>",
    "edition_date": "2026-11-01"
  },
  "trains": [
    {
      "train_number": "<经核实的公开列车番号>",
      "calendar_urn": "odpt.Calendar:Weekday",
      "direction_urn": "odpt.RailDirection:Outbound",
      "train_type": "Local",
      "operating_dates": ["2026-11-11"],
      "stops": [
        {"station_id": "<本线 canonical 出发站 ID>", "departure": "<HH:MM>"},
        {"station_id": "<本线 canonical 到达站 ID>", "arrival": "<HH:MM>"}
      ]
    }
  ]
}
```

导入调用（仅限可信管理员 SQL 会话；客户端无执行权限）：

```sql
SELECT * FROM public.import_tokaido_central_authorized_plan(
  '<已审查并转义为 SQL 字符串的 JSON>'::jsonb
);
```

注意：SQL 文本中的单引号必须转义；建议在 SQL 编辑器中使用不与内容冲突的 dollar-quoted JSON，如 `$verified$...$verified$::jsonb`。不得将服务端凭证、授权材料中的私密信息放进公开仓库。

## 严格校验

- 仅支持 `TokaidoCentral`，不借用 JR-East `Tokaido`/`TokaidoMain`、JR-West `TokaidoKansai` 或新干线的时刻表。
- 接受 `2026-11-01`～`2026-11-30` 的显式运行日期。2026-11-03、11-23 算入土休日，平日与土休日不允许错配。
- 每车需车号、日历、上下行、种别、至少两站、始发时刻及终到时刻。每站只允许来自 `line_stations` 的物理站 ID，站序严格沿运行方向递增或递减。到发时刻需按次序递增，跨午夜使用 24:xx 以上的表示，不能把 00:xx 错当在前一日。
- 同一车号、方向、日历和重叠运行日期的冲突数据拒绝导入；同一批次重试允许完全相同记录的幂等处理。
- 导入成功写入既有 canonical timetable 和停站表，来源 URL 只进入 `evidence_sources` 元数据。**不创建车辆 PNG 映射、不冒充实时列车位置。**
- 成功导入的单车是 `date_verified`，但 `published_timetable_coverage_audit` 仍为 `sampled`；在独立核实平日、土休日、上下行全日完整性前，不允许标记为通过全日验收。

## 只读验收

执行 `supabase/queries/tokaido_central_plan_status.sql`，检查 `station_count`、`weekday_trains`、`holiday_trains`、`stop_count`、`acceptance_status`。确认各项缺口并逐批补齐，禁止从车站数量推断时刻表完整度。

2026-11-11 已执行事务回滚型写入/关联校验：模拟两站列车只在事务中存在，事务回滚后计划/停站/canonical 均为 0；无授权来源会被拒绝，`anon` / `authenticated` / `service_role` 没有执行权限。
