# 车型运用证据判定审核（2026-10-30）

## 已部署

Supabase 东京项目「像素铁道」(`pnupwfmgbtxqhpzsrhfn`) 上的迁移 `20261030094145` 创建了私有的 `rail_audit.vehicle_operation_decisions`。此视图**不会**修改 `public` 的数据、Edge Functions 或前端车型解析器；不将 SQL 计划、线路现役车型表、历史运用或候选图片直接作为实时 `EXACT`。

每个 `service_date + operator + network_key + operation_code + valid_from_time + valid_to_time` 为一组，防止将不同有效时段的编成混合。审核顺序：

1. `CONFLICT`：同组存在超过一种车型或编成；不能挑第一条。
2. `REVIEW_REQUIRED`：缺车型、证据非 A/C 级、来源缺少 HTTP(S) URL、观测日期早于服务日，或只是 `fallback`。
3. `HISTORICAL_ONLY`：合格证据只适用于过去日期。
4. `FUTURE_DATE`：未来日期证据不得用于今天。
5. `DATE_MATCHED_EVIDENCE`：仅说明有当日、可溯源且无冲突的候选观测，**并不自动判为实车 EXACT**；仍须在实时入口确认运营方/网络/运用号/时段并核验真实身份。

`eligible_for_realtime_review` 为审核标志，不是画 PNG 的许可位。完整实体/编成判定仍在既有 TrainVehicle 逻辑中。

## 验收数据

2026-10-30 查询：350 条原始观测，349 个运用-时段组；297 组 `HISTORICAL_ONLY`、51 组 `REVIEW_REQUIRED`、1 组 `CONFLICT`、0 组 `DATE_MATCHED_EVIDENCE`。冲突实例为 2026-09-23 TOKYU/iketama/08，同一未标时段出现「東急1000系」和「東急1000系1500番台」及两套编成。

检查视图：

```sql
select decision_status, count(*), sum(evidence_rows)
from rail_audit.vehicle_operation_decisions
group by decision_status order by decision_status;
```

核心不变量：

```sql
select count(*) as bad_promotions
from rail_audit.vehicle_operation_decisions
where eligible_for_realtime_review
  and (service_date <> (now() at time zone 'Asia/Tokyo')::date
       or vehicle_type_count <> 1 or formation_count > 1
       or not coalesce(all_sources_decisive,false));
-- 必须为 0
```

视图 `security_invoker=true`；私有 schema 对 `anon` / `authenticated` 不开放。GitHub Pages 不会直接访问该审核视图。

## 下一阶段

补当日来源记录，首先解决源数据日期、运用号及实体车号的缺口。仅凭已经过期的京叶/东西线运用表不能增加今天的实时 EXACT。新的直接来源应由既有数据入口入库并经冲突审核，禁止为了“消灭灰点”借用计划车型 PNG。
