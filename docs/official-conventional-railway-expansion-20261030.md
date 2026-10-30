# 2026-10-30 在来线车型关联继续补齐：京王、东武与 JR 西日本

本轮在原有西武等 297 条有来源计划关联基础上，新增 **47 条**（京王相模原线 33、东武伊势崎线 14），当前 `rail_audit.official_conventional_timetable_plans` 总计 **344 条**。这是**车型系列级的计划参考**，不是当日实车或编组判定。GitHub main 直接提交，无 PR，Pages 不自动部署。

## 已核实的官方来源与 SQL 关联

| 官方来源 | 限定范围 | 车型计划 | 当前 SQL 命中 |
| --- | --- | --- | ---: |
| https://www.keio.co.jp/zasekishitei/ | 京王相模原线 `KeioSagami` 的 `KeioLiner` 种别 | 京王 5000 系 | **33** |
| https://www.tobu.co.jp/corporation/rail/vehicles/ | 东武伊势崎线 `TobuIsesaki` 的 `TH-LINER` 种别 | 东武 70090 型 | **14** |
| https://www.tobu.co.jp/spaciax/ 及车辆官网 | `TobuNikko`、`TobuIsesaki` 的明确 `SPACIA X` 特急名称 | 东武 N100 系 | 0（旧表未含可核对名称） |
| https://www.tobu.co.jp/corporation/rail/vehicles/ | `Tojo` 线路仅 `TJ-LINER` | 东武 50090 型 | 0（无规范班次候选） |
| https://www.jr-odekake.net/railroad/kuroshio/index.html | `KiseiWest`、`Hanwa`、`TokaidoKansai` 上明确名为 `くろしお` 的 `LimitedExpress` | JR 西日本 283 / 287 / 289 系多候选 | 0（旧表没有可验证服务名） |
| https://www.jrkyushu.co.jp/english/train/sonic.html | 可查 2026-03-14～2027-02-28 Sonic 各服务号的 883/885 系资料 | 记录来源作为未来逐班验证依据 | 0（旧 `Nippo/KagoshimaMain` 的合成车次名，不能由 `Kag-3001M-WE` 猜测 `ソニック1号`） |

## 数据库

应用并提交迁移 `supabase/migrations/20261030122739_official_keio_tobu_kuroshio_conventional_fleet_20261030.sql`：
- 新增六条 `evidence_sources` 官方资料，八条 `operation_family_rules` 计划规则。
- 匹配必须同时满足 `operator`、`line_key`、完整列车种别；SPACIA X 与 Kuroshio 另外要求明确服务名称，不把整条特急线默认映射成同一车型。
- 规则只设置 `vehicle_candidates`、`planOnly=true`，`exact_vehicle_type=NULL`，未写入 `train_runs` 或实际编组表。
- 查询确认私有审计视图新增 33 + 14 = **47** 条计划关联；全体 **344** 条，`actual_vehicle_confirmed=true` 或 `exact_png_path IS NOT NULL` 的**误确认 0 条**；普通网站角色无审计视图读取权限。

## 网页运行代码

`js/train-vehicle.js`：
- 京王 5000 系的原生 `京王電鉄_5000系.png` 登记原来遗漏的 `KeioSagami` 白名单及 `5000系` 线路别名。
- 对 SQL `unresolved`、且无任何 SQL 车型输入的时刻表，仅在 `Keio + KeioSagami + odpt.TrainType:Keio.KeioLiner` 或 `Tobu + TobuIsesaki + odpt.TrainType:Tobu.TH-LINER` 的**精确组合**下，提供官方计划车型参考图。
- `resolveTimetableRun` 的最终身份必须仍是 `UNKNOWN`；仅 `vehiclePlan.status=PLANNED_MODEL` 带 PNG。不可自动改变 `EXACT`、实际车号或涂装，也不能跨线借用素材。

自动回归 `tools/train-conventional-expansion.test.cjs` 既检验迁移来源与候选限制，也执行 `resolveTimetableRun` 并验证普通车、错线路或错所属方没有 PNG，和 `source_single_type_candidate` 不被升格为实车。已纳入 `.github/workflows/verify-train-png.yml`。

## 仍需后续核对

- 新增的外部官方资料与旧人工时刻表仅有服务类别或车型关系，而非官方证明这批旧时刻表在 2026-10-30 确实有效。
- 私有计划证据没有作为公开 Data API 全量导出；仅前端编入两种可严格辨识的服务计划映射，生产 Pages 尚未发布。
- JR 西日本、JR 九州在来线的旧人工车次号还需要官方逐班运行号/服务车次/有效版本关联。不能仅靠“列车类型”或数字尾号猜测 283、287、289、883、885 系的实车编组。
