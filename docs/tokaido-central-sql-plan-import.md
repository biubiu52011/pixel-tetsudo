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


## 2026-11-11：第一批部分时刻表候选资料（未上线）

本轮新增 `data/research/tokaido-central-202603-segment-candidates.json`：**8 条抽样的历史区间事实**（平日 4、土休日 4），仅针对浜松～豊橋方向各取四趟，含列车番号、两个已发表到发时间锚点、运营日类别、上下行与来源 URL。抽样数据源为 2026-03-14 改正的 [平日运用参考](https://yoke4000.main.jp/jru/hamaW.html)、[土休日运用参考](https://yoke4000.main.jp/jru/hamaH.html)，部分与 [另一站间时刻查询](https://www.jorudan.co.jp/time/to/%E6%B5%9C%E6%9D%BE_%E8%B1%8A%E6%A9%8B/?r=%E6%9D%B1%E6%B5%B7%E9%81%93%E6%9C%AC%E7%B7%9A) 交叉核对。**这不是完整时刻表，也不是确认适用于 2026-11-11 当天的资料。**

- `evidenceEdition=2026-03-14`，`serviceDateStatus=2026-11_NOT_VERIFIED`，`rightsStatus=REPUBLICATION_NOT_VERIFIED`，`publicationStatus=REVIEW_ONLY_NOT_AUTHORIZED_FOR_RUNTIME_OR_SQL`。仓库仅保存少量供研究、交叉核验的事实，不镜像第三方时刻表文件。
- 严禁把这一候选数据直接作为 `ODPT_TIMETABLES`、`TrainPositionEstimator.registerManualTimetable`、生产 `manual_timetable_templates` 或默认 2026-11 `operating_dates` 的来源；不能用“3 月改正”自动推断 11 月所有日期或临时改点。
- 已核实**代码能力**：既有 `DataFusion.ensureTimetable` 接受部分 SQL 班次、`TrainPositionEstimator` 可根据两站的实际时间锚点计算区间进度；中间站停靠与到发时间未由本批证据证明，不能自行补成官方时刻。
- 只有在取得可验证的 2026-11 运行日/版本证据、核实线路与区间、确认再利用/再发布权限后，才可以将某条候选通过现有 `import_tokaido_central_authorized_plan` 导入。授权证明须真实，不得填示例网址或把自编清单等同原始资料的授权。
- 后续扩展次序：更多时段和上行／下行、分段的真实站级停站时间、3 月后的修订、合法授权，再逐车导入；不改变 `full_day_timetable_acceptance_passed=false` 的事实，直到正式逐项核验完成。
- 回归：`tests/tokaido-central-research-candidates.test.cjs`（来源、日期、奇偶方向、时间单调与运行环境隔离）及 `tests/tokaido-central-sparse-estimate.test.cjs`（测试用模拟时间，绝不视为真实时刻表）。
