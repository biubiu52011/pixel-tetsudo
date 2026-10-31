# 运营计划数据库质量与读取安全改进（2026-10-31）

本记录覆盖项目 `biubiu52011/pixel-tetsudo` 的所有运营商和线路。**Supabase 保存的列车时刻计划只有 Weekday / SaturdayHoliday 两套出版式计划**；`service_date` 只在 API 请求时决定使用哪套计划，不持久化实际每日车次或真实车辆编组。已有的历史车辆观测等其他业务表不在本次变更范围内。

## 1. 规范化 354 个时间字段，增加数据库约束

发现旧模板存在 158 个到站和 196 个发车时刻写为 `6:14`、`7:58` 等一位数小时；这些不应导致字典序比较或接口数据错位。

- **实际修复**：仅将一位小时补前导零，全部规范为 `HH:MM`；分钟和时刻语义、车次、运行日、站点顺序均未改变。
- 新增通过全库验证的 `manual_timetable_stop_clock_hhmm` CHECK 约束，阻止新写入非规范格式。
- 允许 `24:00` 等跨午夜/次日表示，**不把历史记录改为某日实际车次**。
- [SQL 迁移](../../supabase/migrations/20261031232000_normalize_recurring_train_clock_hhmm.sql)。

## 2. 所有运营商共用动态数据库质量视图

新建两个仅供内部维护／服务角色读取、`security_invoker=true` 的视图（无公开匿名授权）：

- `public.published_timetable_plan_quality_summary`：逐线路、逐运行日统计来源模板数量、停站数量、可用于展示的两个不同时刻站、不能展示的模板、来源修订日期缺失、抽样来源、可疑时间倒退等；
- `public.published_timetable_chronology_issues`：逐来源列出非正常跨午夜的相邻站时间倒退（原始行程保留，不擅自补造）。

视图随来源变动重新计算，省去手动更新固定计数；对全部 **210 条线路 × 2 套运行日 = 420 组**已通过统计完整性测试。

[SQL 迁移](../../supabase/migrations/20261031233500_recurring_plan_quality_audit_views.sql)。

### 校验快照
| 检验 | 结果 |
|---|---:|
| 原始计划模板 | 92,586 |
| 原始停站记录 | 1,135,945 |
| 可展示的两不同有效时刻站来源 | 91,858 |
| 不满足两站有效时刻来源 | 728 |
| 非午夜异常来源 | 39 条 |
| 非午夜相邻站时间倒退事件 | 40 处 |
| 疑似跨午夜的同站到发时间倒退 | 110 处 |
| 非规范到发字段 | 0 |
| 按具体日期的 `train_runs` | 0 |
| 非 Weekday / SaturdayHoliday 模板 | 0 |
| 缺少 Canonical 成员的模板 | 0 |

**注意**：110 处 `arrival_clock > departure_clock` 全部符合深夜跨凌晨模式，但是否真实正确仍需要来源版本核对。此前一次中间汇报将这项残余数量误报为 46，**以全库核验后的 110 为准**。

### 涉及非午夜相邻站倒退的线路
- 东北本线 `TohokuMain`：平日 21 条来源出现 22 处事件，休日 17 条来源出现 17 处；
- 山田线 `Yamada`：土休日 1 条来源出现 1 处；
- 合计 39 条来源、40 处事件。典型风险：11:35 的上一站后，同一计划下一站变成 06:02。无需猜测就可知道该顺序不能直接用于移动列车位置推算。

原始站时间未删除或校正，只把异常标为 `SOURCE_NON_MIDNIGHT_STOP_CLOCK_REVERSAL_NEEDS_VERIFICATION`；[审计修改](../../supabase/migrations/20261031234500_annotate_remaining_clock_reversal_source_audits.sql)。

## 3. Edge Function v273 保留有效计划、隔离异常

`supabase/functions/train-runs/index.ts` 更新为 v273：针对 `source_only` 来源，按原始站序检测正常时间倒退与午夜跨日时刻；非午夜倒退的源计划在关联运用/计划车型之前隔离，不再用于列车位置推算。无可验证数据时绝不“自动顺延时间”或创造新站点。

- 新增响应 `suppressed_non_midnight_clock_reversal_runs`；
- 原有 `suppressed_station_only_source_fragments` 与 `omitted_incomplete_runs` 均保留，后者包含隔离的时序错误行程；
- 前端 `data/api/odpt-unified.js` 保存 `suppressedClockReversalRuns` 和 `auditCoverageStatus` 用于后续诊断；
- v273 处于 ACTIVE，且与 GitHub `main` 内容一致。此轮**未做外部 HTTP 端到端测试**，不能以代码部署成功替代浏览器实际测试。

## 4. 两个时刻表关联表的外键索引

按数据库性能顾问的提示，为 `published_timetable_exact_duplicates(canonical_template_id)`（现有约 930 条）和 `published_timetable_through_service_gaps(existing_template_id)`（现有约 5 条）补建 BTREE 索引，便于数据关联检查和源记录维护，不增加定时任务或付费服务。

[索引 SQL](../../supabase/migrations/20261031235500_timetable_reconciliation_fk_indexes.sql)。

## 5. 后续工作重点

1. **东北本线**：核对 38 条跨站时序倒退来源是否拼错站序、车次或同一源混入不同区间；无证据不调整时刻。
2. **山田线**：复核休日 1 条行程、站序和来源日期。
3. **大阪环状线、大阪东线**：仍有 203 / 94 条单站来源，隔离不等于补齐完整行程；取得有复用许可、含明确版本的时刻资料后逐班补录。
4. **旧模板来源有效性**：大量 `source_revision_date` 缺失。数据库中“有平日/土休日两套”不代表2026版真实、完整。
5. **访问控制**：Supabase Advisor 的 `rls_enabled_no_policy` INFO 仍覆盖多张既有表。某些内部表故意不向访客开放，不能因为该提示就批量新增匿名 SELECT 策略；需逐表核实真实访问需求。

用以下 SQL 可随时查询动态总览：

```sql
SELECT line_key, operating_pattern, source_templates,
       renderable_source_templates,
       insufficient_timed_station_templates,
       suspect_clock_order_templates,
       revision_unverified_templates
FROM public.published_timetable_plan_quality_summary
ORDER BY insufficient_timed_station_templates DESC, line_key;
```

以上 SQL 需要数据库管理或服务角色权限，不能以 `anon` 调用本次内部审计视图。
