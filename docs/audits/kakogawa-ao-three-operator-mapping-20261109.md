# 粟生駅・加古川線 2026-11-09 路線/站点映射记录

## 既存所有权与变更边界

- Canonical: `data/core/railway_data.json`, `data/core/station_i18n.json`; `*.compact.json` 和 `*.file.js` 是派生产物。不要在展示脚本里修补车站，修改源后运行 `node data/core/generate-all.js`。
- Runtime aliases: `data/core/runtime-config.js`，同名物理站必须有不同 canonical ID，不按字符串名称假定同站。
- SQL: `railway_lines`、`stations`、`line_stations`；不能从无时刻表源的线路推算列车。
- Pages manifest: `scripts/page-scripts.json` 和 `scripts/sync-page-scripts.cjs`；源更新后同步全部页面版本号。
- 验证: `tests/ao-three-railway-transfer-map.test.cjs`、`tools/train-network-vehicle-audit.test.cjs`。

## 2026-11-09 已核对粟生站三社换乘

| 线路 | 本地 ID | 站数 | 粟生站站台 |
| --- | --- | ---: | --- |
| JR西日本 加古川線 | `KakogawaLine` | 21 | 1（西脇市方面）、2（加古川方面） |
| 神戸電鉄 粟生線 | `ShintetsuAo` | 20 | 4 |
| 北条鉄道 北条線 | `HojoRailway` | 8 | 3 |

- 官方：<https://eki.jr-odekake.net/premises?id=0611506>、<https://eki.jr-odekake.net/transfer?id=0611506>。
- 全部共用车站只使用同一 canonical `Aou` ID，并在三条线路中声明 reciprocal `transferStations`，不编造不必要的站外步行连通。不同公司票务/检票规则需以现场为准。
- 神鉄官方站序：铃兰台—粟生20站；参考 <https://www.shintetsu.co.jp/> 与 <https://ekitan.com/sta-info/line/21401>。
- 北条线官方/公共站序：粟生、網引、田原、法華口、播磨下里、長、播磨横田、北条町8站；参考 <https://rosen-zu.net/hojo/hojotetsudo-top/hojotetsudo-rosenzu/>。
- 坐标来自国土交通省2024 N02铁路车站数据的结构化整理 <https://github.com/antfu/mlit-json>；坐标是静态地图参考，不是列车观测值，保留原有粟生站 canonical 坐标。
- `Kizu-Kobe`/原 `Kizu`、`Midorigaoka-Kobe`/原 `Midorigaoka`、`Ono-Hyogo`/原 `Ono`、`Ichiba-Kobe`/原 `Shijou`、`Ebisu-Kobe`/原 `Ebisu` 严格区分物理车站；原线路和其换乘关系不更改。
- 静态 durations 是代表性列车行程的参考分钟数（来自相应线路的公开乘车路径），仅给缺乏 API 的站间线路图/路径权重使用，不是实时位置、时刻表覆盖或每天精确运行时间。
- 两条新线的 `timetableDataStatus` 为 `station_topology_only`；SQL `timetable_api_enabled=false`, `realtime_position_api_enabled=false`, `sql_planned_fallback_enabled=false`。没有证据时不补车型，不绘制假列车，也不使用错误图标。
- 神鉄20站和北条线8站在 Supabase `line_stations` 与 canonical JSON 对齐，新增独立站 ID 26 个。车辆全网审计明确保留其未覆盖车型状态，不放宽其他线路的来源审核。

## JR 西脇市→加古川剩余映射边界

- 2026-11-07（周六）官方西脇市站发往粟生/加古川方向有18个发车班次；官方核对页：<https://timetable.jr-odekake.net/station-timetable/2947036001?date=20261107>。
- SQL 当前有两个西脇市起始的列车番号：`1338S`（发往加古川）及 `2329S`（发往谷川），每营业日历各一份。因此该方向有 **1 个已存、17 个缺少完整停站证据**。不能把 `2329S` 当成发往加古川。
- `published_timetable_coverage_audit` 已记为 `sparse_review`；完整车次时间、现行生效修订日与车辆来源未验证前，不在 `manual_timetable_templates` 创造其余17条行程，更不能以其他旧车次号直接匹配。
- 先检索现有 `manual_timetable_templates` + `train_timetables` + `train_timetable_source_resolution`；按官方**编号+全部停站时间+营业日**匹配后才能入 SQL。不要一次性复制无授权的完整时刻表到数据库。
- 同时继续维护此前已核实的西脇市—谷川2026年11月19、20、24、25、26日部分区间停运；千万不可误取消西脇市以南的正常段。

## 验证方式

```bash
node data/core/generate-all.js --check
node scripts/sync-page-scripts.cjs --check
node --test tests/ao-three-railway-transfer-map.test.cjs
node --test tests/kakogawa-2611-canonical-source.test.cjs
node tools/train-network-vehicle-audit.test.cjs
```
