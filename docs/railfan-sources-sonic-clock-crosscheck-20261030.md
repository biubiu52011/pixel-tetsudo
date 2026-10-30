# 铁路迷/粉丝运用表证据审计及 JR 九州 Sonic 官方二站校验（2026-10-30）

## 核心结论

粉丝、铁路迷网站可以显著提高车辆计划和运行号的线索覆盖率，但 **个人运用表不等于铁路运营商发布的有效版本**，车型、车组和涂装必须保留时间、来源与证据等级。此前已完成的官方车型计划 1,094 条不修改；本轮单独增加 **14 条时刻表片段的官方双站时钟校验**。此数是 4 个 Sonic 服务车次在两条线路的 WD/WE 分段记录，不是 14 条不同实际列车，也不是今天 14 次实车观察。

## 已查看的社区网站

| 来源 | 内容 | 审计判定 |
| --- | --- | --- |
| [T-TAKE 的 JR 西日本运用表](https://www.t-take.com/jrw/index.html) | 2026-03-14 改点版：森ノ宮车、奈良车等运用；奈良 10-03 修订，森ノ宮 05-11 修订；个人调查，网站明确提示可能修正 | `DISCOVERY_ONLY`，可用于寻找原始运行号/站点，不直接当作逐班实车 |
| [鉄道運用表 JR](https://tetsudouunyou.wepage.com/jrtetsudounyou) | JR 九州车队及编成号码汇总，包含具体编组/配属信息 | `SPECIFIC_CLAIM_CONTRADICTED`；其中“103系 3月改点引退”与 2026-10-14 JR 九州 [官方公告](https://www.jrkyushu.co.jp/news/notice/)冲突：2026-10-19～11-05 筑肥线安排了 103 系五编组活动。只限制这项说法，不否定网站所有资料 |
| [鉄道プレス Sonic 2026 车次整理](https://207hd.com/post-45366/) | 按列车号汇总 883/885 系计划及站点时刻；页面原始发布时间 2025-03-16，不能单靠“2026版”标题保证最新修订 | `PARTIAL_OFFICIAL_CORROBORATION`；仅当具体列车可与 JR 九州官方车次号、时钟、车型名单对照后采用 |

社区资料登记于私有表 `rail_audit.community_railway_evidence_registry`，包括原网页、所审查修订月份、内容限制、审计状态；`exact_vehicle_authorized=false` 受数据库 CHECK 约束。

## 本轮官方反查：Sonic 4 个服务车次

JR 九州官方 [2026-03-14～2027-02-28 Sonic 系列说明](https://www.jrkyushu.co.jp/english/train/sonic.html) 标注 883/885 系对应的服务车次，以下各个运行号又在官方逐站时刻表中独立确认：

| 原运行号 | 官方服务号 | 计划车型系列 | 官网上的具体日期 | 来源 |
| --- | --- | --- | --- | --- |
| `3001M` | `ソニック1号` | 883 系 | 2026-10-17 | https://www.jrkyushu-timetable.jp/sp/2610/0001/00013201.html?d=20261017&t=2815503e |
| `3005M` | `ソニック5号` | 885 系 | 2026-10-08 | https://www.jrkyushu-timetable.jp/sp/2610/0001/00013601.html?d=20261008&t=2809800e |
| `3010M` | `ソニック10号` | 885 系（官网列有“白いソニック”） | 2026-10-29 | https://www.jrkyushu-timetable.jp/sp/2611/0007/00070101.html?d=20261029&t=2880500e |
| `3031M` | `ソニック31号` | 883 系 | 2026-10-17 | https://www.jrkyushu-timetable.jp/sp/2610/0001/00015001.html?d=20261017&t=2815503e |

检索时，原库里这些服务被拆成 `Kag-3001M-WD/WE` 与 `Nip-3001M-WD/WE` 等内部主键，**不能只由数字尾号推断服务**。本轮在 `rail_audit.sonic_official_timetable_anchors` 中存储 7 个线路片段的两个官方站钟；`rail_audit.sonic_legacy_official_time_crosscheck` 必须同时命中：
1. KagoshimaMain / Nippo 限定线路；
2. **完整原运行编号**，含数据库内部前缀及 WD/WE 标记；
3. 官方原有的 **两个不同车站和对应到发钟点**；
4. 原人工时刻表仍未验证的版本标记 `undated_not_current_verified`。

实际命中 **14 个 SQL 时刻表片段**：3001M、3005M、3031M 各有鹿儿岛本线与日丰本线×两个日历，3010M 仅日丰本线×两个日历。未命中同线路其他号码时，依旧 UNKNOWN。

两个新审计对象和社区登记都不开放给 `anon` 或 `authenticated`。返回的 `link_status='TWO_STOPS_AND_RUN_NUMBER_MATCH_UNDATED'`，`actual_vehicle_confirmed=false`，`actual_formation_id=NULL`，`exact_png_path=NULL`，并不修改 `train_timetables.timetable_validity`、`train_runs` 或公开车型解析视图。

## 本轮代码

- 已应用并同步 `main`：`supabase/migrations/20261030130459_railfan_source_registry_and_official_sonic_two_stop_crosscheck_20261030.sql`
- 新建回归 `tools/train-railfan-official-corroboration.test.cjs` 并加入 `.github/workflows/verify-train-png.yml`
- 该关联目前在**私有审计层**；还未在公共网页直接渲染为「Sonic 883/885 系」，因为旧时刻表本身仍缺少完整版本核验、实体车组号和车型专属 PNG，不应冒充实时车辆。

下一批扩充应继续检查官方 2026 年原运行号＋两站时间和 T-TAKE 2026 版实际 PDF 中的车次/运用代码，逐条纳入候选，避免旧版粉丝运用表造成批量误配。
