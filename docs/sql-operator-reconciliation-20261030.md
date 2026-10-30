# SQL 铁路运营数据与车型关联补齐 — 2026-10-30

## 本次已经生效的修改

Supabase project `pnupwfmgbtxqhpzsrhfn`，GitHub 仓库 `biubiu52011/pixel-tetsudo`，直接提交 `main`（没有 PR）。**未调整真实列车车型/编组身份，没有触发 GitHub Pages 发布。**

已部署并在仓库跟踪的迁移：

1. `20261030112329_separate_shinkansen_service_names_and_audit_run_links.sql`：把“のぞみ、ひかり、こだま、さくら、みずほ、かもめ、はやぶさ、こまち”等 **17 类新干线服务名称**与“实际车辆形式”分离。保留 `public.train_timetable_vehicle_mappings` 原始映射，以 `rail_audit.shinkansen_service_labels` 追溯；`public.train_timetable_vehicle_resolution` 和 `public.train_timetable_source_resolution` 的车型显示统一变为 `NULL` / `unresolved`，防止后续把服务名当成 PNG 素材身份。
2. `20261030112949_quarantine_seibu_laview_legacy_vehicle_labels.sql`：西武秩父线 104 条与拝岛线 15 条旧时刻表错误写成 `40000系（Laview）`。保留原文与来源于 `rail_audit.seibu_laview_legacy_conflicts`，对外不再作为车型候选。**没有自动改判为 001 系**：只有当某车次与有日期的运营证据相匹配，才可以确认具体车辆。
3. `rail_audit.train_run_timetable_reconciliation` 为每条 `train_runs` 返回：原始车次、线路、日历、匹配候选个数、拒绝原因以及仅在严格条件满足时的 `verified_timetable_id`。使用完整车次字符串 + 线路 + 日历精确匹配，并要求来源时刻表 `current_verified`、源修订日期不得晚于服务日。该视图**不回写原始运行记录**。

在数据库检查：新干线服务标签 664 条全部从车型解析视图中剔除；西武旧标签 119 条全部剔除。两处原始证据仍保存且可审计。审计视图不向 `anon` / `authenticated` 授权。

## 最新 SQL 映射数量

| 类别 | 数量 |
|---|---:|
| `train_timetable_vehicle_resolution` 全部记录 | 91,020 |
| `unresolved` | 75,743 |
| `source_single_type_candidate` | 14,878 |
| `dated_schedule_rule` | 335 |
| `dated_operation_owner` | 64 |
| 已隔离错误新干线服务名 | 664 |
| 已隔离西武错误车型名 | 119 |

所有 91,020 条 `train_timetables.timetable_validity` 在本次快照中均为 `undated_not_current_verified`。必须取得某服务日的时间、车次、版本/来源证明，才允许使用它们作为当前实车身份。

## 运营公司覆盖（不同类型不能互相代替）

| 运营方 | `train_runs` 记录 | 规范时刻表（去重） | 运营证据说明 |
|---|---:|---:|---|
| Seibu | 0 | 7,171 | 12 条前端西武线路都有 SQL 时刻表；0 条当天实际运行入库，原有计划候选不可代判编组 |
| Tobu | 0 | 2,982 | 9/13 条前端线路已有 SQL 时刻表 |
| Keikyu | 0 | 5,451 | 5/5 线路有 SQL 时刻表 |
| JR-West | 4,668 | 4,755 | `train_runs` 仅山阳新干线；其他是规范时刻表，不能声明在来线实际车次已接入 |
| JR-Kyushu | 2,691 | 3,642 | `train_runs` 仅九州新干线、西九州新干线 |
| JR-Central | 9,424 | 131（前端归属线路统计） | 运行表多为东海辖区，但与规范时刻表车次字段仍需独立交叉验证 |
| JR-East | 8,518 | 27,227（前端归属线路统计） | 不代表可确定实际车型 |

JR 西日本 / 九州现存 `train_runs` 主要是周末、节假日快照（2026-10-17 至 2026-11-29）。运行表的 `2001G` 等运行编号并非规范时刻表的 `かもめ101`、`さくら401` 等服务车次；两种编号无可证的换算表，绝不能采用数字截取、列车名称或线路默认车型猜测。

本次严格关联审计检查 25,731 条 `train_runs`：JR 西日本、JR 九州均为 `NO_EXACT_KEY_MATCH`；仅有小田急 5 条、东京 Metro 3 条属于“键能对应但规范时刻表有效性未经验证”，**整个库目前可合法回写 `canonical_timetable_id` 的记录为 0**。保留这些空关联是正确的，不是写库失败。

## 仍需获取的新证据

- **Seibu（西武）**：有 7,171 条 SQL 时刻表、22 条图片资产和运营计划规则，但缺少当天完整 `train_runs`/编组来源。不能把 S-TRAIN 40000 系、Laview 001 系推广到所有车次。
- **JR-West（西日本）**：需实际运行号与山阳新干线服务车次的官方/可复核跨码关联，以及新时间表的日期版本；已有 4 个 PNG 资产，不代表车型分配已确定。
- **JR-Kyushu（九州）**：需新干线当日运行号与「さくら/みずほ/かもめ」车次的官方跨码关联及实时实际车型来源；库中 800 系通用图片不能用作整个九州新干线的默认列车。
- **其他私铁**：需要补齐日期/线路范围的车型证据和列车运行记录，图库/车型候选不自动获得 `EXACT` 身份。

## 检查 SQL

```sql
SELECT mapping_level, COUNT(*) AS n
FROM public.train_timetable_vehicle_resolution GROUP BY mapping_level ORDER BY n DESC;

SELECT line_key,COUNT(*) AS n
FROM rail_audit.shinkansen_service_labels GROUP BY line_key ORDER BY n DESC;

SELECT line_key,COUNT(*) AS n
FROM rail_audit.seibu_laview_legacy_conflicts GROUP BY line_key ORDER BY n DESC;

SELECT operator,reconciliation_status,COUNT(*) AS n,
       COUNT(*) FILTER (WHERE verified_timetable_id IS NOT NULL) AS eligible
FROM rail_audit.train_run_timetable_reconciliation
GROUP BY 1,2 ORDER BY 1,2;
```

请注意 `rail_audit` 位于数据库私有审计 schema，只用于开发者 SQL 查询；它不是对普通网站访客开放的数据 API。仓库自动 CI 运行 `tools/train-sql-service-reconciliation.test.cjs` 验证脚本保持服务名隔离、严格日期核验以及禁止未证实身份的回写逻辑。
