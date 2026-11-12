# TokyoGTFS 隔离导入｜2026-11-12

当前阶段：**已创建 Supabase 独立 schema gtfs_stage；已登记 42 条候选路线；原始 GTFS 班次尚未全部写入数据库**。此文件解释一次性导入及后续核验。

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

## 一次性导入（无需常驻本地服务器）

1. GitHub Actions Secrets 设置 SUPABASE_DB_URL（原 Supabase 的 PostgreSQL 连接串，**不要放到 GitHub 仓库或客户端 JS**）。
2. 在 Actions 手动执行 Stage audited TokyoGTFS railway timetable。
3. 工作流使用固定 SHA-256 校验下载版本；来源变动时会终止，不能静默把新版本混入旧审计。
4. 脚本 scripts/prepare_tokyo_gtfs_stage.py 生成按来源完整保留 trips、stop_times、calendar、calendar_dates、transfers 的 PostgreSQL COPY 导入，整个数据写入 gtfs_stage；默认不改运行环境。
5. 对比 gtfs_stage.feed_imports 的期望数量与 gtfs_stage.trips / gtfs_stage.stop_times 实际数量。

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

当前数据库生产计数未变：manual_timetable_templates 93,144；manual_timetable_template_stops 1,138,714。
