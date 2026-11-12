# TokyoGTFS 隔离导入｜2026-11-12

**2026-11-12 合并已完成**：通过 SHA-256 固定版本、GitHub Actions OIDC 身份认证与服务端 RPC，在 Supabase 私有 `gtfs_stage` 完成全部 42 条候选线路的源数据导入；GitHub Actions 运行成功。正式计划时刻表与实时运行数据没有被覆盖。

## 经比对的范围

| 类别 | 路线 | 班次 |
|---|---:|---:|
| 已注册而没有 SQL 时刻表 | 13 | 12,496 |
| 未注册、需要规范线路映射 | 23 | 5,103 |
| 直通/支线/特殊路线需单独审核 | 6 | 1,222 |
| 合计（隔离源数据） | **42** | **18,821** |

这些班次对应 276,106 条原始停站时刻、707 个相关源站点、663 条源 transfers.txt 接续记录；原始数据共有 165 条路线。不可把候选班次数当成已新增的正式列车。

## 快照来源

- Source: https://mkuran.pl/gtfs/tokyo/rail.zip
- 上传文件 SHA-256: bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f
- GTFS service calendar: 2026-11-02 至 2027-11-02（仅代表来源声称的日历范围，不是运营商逐车核验）。
- Attribution: Schedules: Copyright (c) 2019-2025 Akihiko Kusanagi (MIT); GTFS conversion: Mikołaj Kuranowski.

## 已完成的一次性导入（无需数据库密码或本地服务器）

1. GitHub Actions: [tokyo-gtfs-sync.yml](https://github.com/biubiu52011/pixel-tetsudo/actions/workflows/tokyo-gtfs-sync.yml)。2026-11-12 [执行记录 #1](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/43177831088)，结果 **success**。
2. GitHub runner 从公开的 TokyoGTFS 来源下载 `rail.zip` 并核对固定 SHA-256；不接受不同版本。
3. `scripts/import_tokyo_gtfs_oidc.py` 使用 GitHub OIDC JWT 调用 `tokyo-gtfs-sync` Edge Function。仅允许仓库 ID 1437552358 的 main 上指定工作流；服务端经不可匿名调用的 `public.import_tokyo_gtfs_batch` 写入 `gtfs_stage`。
4. 全部数据已写入，且服务端最终行数校验成功：

| 来源表 | 导入条数 |
| --- | ---: |
| 所有源线路登记（含 123 条已覆盖、未重复导入班次的线路） | 165 |
| 候选列车班次 | **18,821** |
| 候选班次停站时刻 | **276,106** |
| 来源车站 | **707** |
| 同车次接续关系 | **663** |
| 运行日历 | **4** |
| 运行日历例外 | **48** |

校验时原正式库仍为 `manual_timetable_templates: 93,144` 与 `manual_timetable_template_stops: 1,138,714`，未被本次 GTFS 源导入修改。`train_timetables` 的数量可能由其他流程独立更新，不应把其中变化归因于本导入。

## 下一步的正式数据库入库门槛

- 按原有架构先检查是否有专门维护线路/站点映射的表或脚本；保持 GitHub 规范线路归属。
- 将每条 GTFS route_id、stop_id 映射到规范 railway_lines 和站点 URN，未通过的留在隔离区。
- 核对周末/节假日例外、车次是否复用、来源修订号、跨线的 block_id 与 transfers，不推断实际列车编组。
- 经授权并与运营商时刻表核实后才将符合条件的计划班次写入 manual_timetable_templates 与停站表；不要一键开启 sql_planned_fallback_enabled。
- 列车位置仍必须标记为『時刻表推算』，不得伪装为リアルタイム。

## 重要发现：实时源与静态 ZIP 是两个不同资源

- Trip Updates (GTFS-Realtime): https://mkuran.pl/gtfs/tokyo/rail_positions.pb
- Service Alerts (GTFS-Realtime): https://mkuran.pl/gtfs/tokyo/rail_alerts.pb
- 实时源是独立数据，实际覆盖、刷新时间、trip_id 对齐需要另行核验，不要与 ZIP 时刻表混用。

现有正式库基础模板仍为 93,144 条，停站时刻仍为 1,138,714 条；GTFS 是并存的私有来源库。此合并**未启用**网站 SQL fallback 或将 GTFS 伪装为 realtime。
