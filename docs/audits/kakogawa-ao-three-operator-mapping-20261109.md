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

## JR 加古川线修正与剩余证据边界（2026-11-09）

- 路线记号保持 `I`，canonical `color` 与 `presentation.color` 统一为 `#00A98F`（青绿色/ターコイズ）；依据 JR 西日本近畿官方青绿色配色的网页近似值（非官方精确色票）。
- `Tanigawa`（谷川）共享同一 canonical 车站 ID，补全加古川线 → 福知山线的显式换乘定义，勿新增假站或站外通路。
- 修正韩语：厄神 `야쿠진`、新西脇 `신니시와키`、日本へそ公園 `니혼헤소코엔`。
- 静态 `durationTotalMin=88` 与 20 段 `durations` 之和 65 分钟使用不同参考口径，尚不能直接互换；保留现值，不伪造全线同一班次运行秒表或换乘等待。

### Supabase 实际数据库核查

- `manual_timetable_templates` 有 98 条：平日 Inbound 11/Outbound 38，周末节假日 Inbound 16/Outbound 33；90 条属于 `undated_not_current_verified`、8 条属于 `date_verified`。
- 2026-11-08 JR 西日本公开节假日两方向共有 80 个车次号码。SQL 对应 49 个号码；剩余 31 个仍缺完整停站模板（Inbound 24，Outbound 7）。**编号映射并不等于全程现行时刻已验证**。
- 西脇市始发、前往加古川的周末节假日 SQL 模板目前有 8 条，其中 7 条具备当月日期验证、1 条 `1338S` 仅为未核实历史来源。不得将 `2329S`（西脇市→谷川）误算作加古川方向。
- 新增配置 `RuntimeConfig.SQL_POSITION_VERIFICATION_MONTHS`，加古川线限定 2026-11：仅 `_timetableDateVerified===true` 的 SQL 计划允许生成**推算**列车图标；历史 SQL 仍可保留在数据库供来源审计。官方实时位置不由此配置推断。
- 官方西脇市—谷川施工停运 2026-11-19/20/24/25/26 每天 4 条，数据库现有 `published_railway_date_exceptions` 共 20 行。该规则不能扩大到西脇市以南。
- 数据库目前加古川线 98 条模板没有已登记的逐车车型证明；103系3550番台与125系为线路车型背景，不能以播但线103系 PNG 代表真实车辆。
- 旧记录中「仅1个西脇市起始模板、缺17条」是先前快照，现已过期；以上以本次实际数据库查询为准。

### 官方来源

- <https://timetable.jr-odekake.net/line-timetable/2455?date=20261108>
- <https://timetable.jr-odekake.net/line-timetable/2456?date=20261108>
- <https://timetable.jr-odekake.net/train-timetable/65411?date=20261128>（1340S 每天运行）
- <https://www.city.nishiwaki.lg.jp/kakukanogoannai/machizukuribu/koutsuuseisakuka/jrkakogawasen/31530.html>
- 官方时刻表注明未经授权不得整页转载或加工，不能以自动拼凑补满 31 条空缺。

## 验证方式

```bash
node data/core/generate-all.js --check
node scripts/sync-page-scripts.cjs --check
node --test tests/ao-three-railway-transfer-map.test.cjs
node --test tests/kakogawa-2611-canonical-source.test.cjs
node tools/train-network-vehicle-audit.test.cjs
```
