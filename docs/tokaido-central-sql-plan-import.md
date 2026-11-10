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

## 2026-11-11：SQL 番号驱动的车辆 PNG 接入

- 在既有 `TrainNumberPngRanges.match` 中接入 `TokaidoCentral`，不添加第二套 resolver；在既有 `VehicleGaragePngMap` 中把当前三张图片登记为本线路**非实车确认的计划示意图**：`c313.png`（313系）、`c315.png`（315系）、`c373_inj.png`（373系）。
- 可识别的公开番号语法范围为 `1M`～`99999M`；**这一范围不是车型分配表**，同号段可能混用不同车型。必须同时满足：`supabase-train-run`、估算计划、已核实番号、JR-Central 专属铁路 URN、服务日期、带来源 URL 的单一车型 `PLANNED_MODEL` 或已确认计划、无互相冲突的车型候选，才自动显示相应 PNG。没有 SQL 班次或车型来源则仍无图标。
- 现有 `manual_timetable_templates` / `train_operation_mappings` 没有新增虚构数据；这是消费者映射接口而非完整时刻表，也不是仅凭列车番号认定车辆。要实现真正的各号段无车型候选也能映射，必须取得**按号码段、日历及区间逐项确认**的独立证据再配置具体号段。
- 回归代码：`tests/tokaido-central-sql-png-range.test.cjs`。环境未能从 GitHub 克隆代码进行本地 Node 执行，因此此处仅记录已提交的静态测试，**不声称通过**。


## 2026-11-11 F/M 番号与 PNG 命名处理

- 沿用 `TrainNumberPngRanges`，让经 SQL 验证的 `TokaidoCentral` 班次匹配计划车系示意，不变更实际车辆 `EXACT` 身份。
- 正规 PNG 名称：`JR東海_313系.png`、`JR東海_315系.png`、`JR東海_373系.png`，仅改名不改 PNG 内容；其他含义未知的 `c*.png` 未动。
- 丰桥～滨松 M 号精确集合取自 [平日](https://yoke4000.main.jp/jru/hamaW.html)／[土休日](https://yoke4000.main.jp/jru/hamaH.html) 2026-03 改正参考；大垣～米原土休日 3207–3223 奇数 F、3208–3224 偶数 F、3200F、3303F 为 315；3201–3206F、3226F 为 313，参考 [米原资料](https://yoke4000.main.jp/jru/maibaraH.html)。若 SQL 证据冲突，拒绝显示。
- 强制检查实际服务日期（2026-11）、国定节假日、日历、方向、运营者、单条 SQL 的日期验证状态、该车真实停站区间；编号范围不是全线实际编组证明。没有相应精确参考的车次仍需独立带来源的单一车型计划。
- 并未复制民间 OuDia 全日时刻表到 SQL；生产线路计划仍缺逐车到发数据。仅少量编号系列事实被用于计划示意，不能据此宣称真实车组或 11 月全日完备。
