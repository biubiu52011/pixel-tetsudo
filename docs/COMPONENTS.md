# Pixel Tetsudo 组件索引

状态：当前源码级所有权。2026-11-26 已对照变更前 HEAD `2117c424` 核对源码。
部署版本和生产健康状态不属于本文件；时效证据记录在 `PROGRESS.md`。

修改消费者前，先使用本索引找到现有所有者。下列公共入口是门面选录，不代表所有
内部函数都是稳定 API。

## 1. Canonical 数据与加载

| 能力 | 所有者 | 边界 |
| --- | --- | --- |
| 铁路身份/拓扑/展示 | `data/core/railway_data.json` | Canonical 可编辑源 |
| 车站翻译 | `data/core/station_i18n.json` | Canonical 可编辑源 |
| 观光事实 | `data/core/tourism_data.json` | Canonical 可编辑源 |
| 核心产物生成 | `data/core/generate-all.js` | 生成/检查现役 `.compact.json`、`.file.js` 和配置产物 |
| 核心数据加载 | `data/core/db-loader.js` / `DataLoader`、`RailwayDB` | HTTP 紧凑 JSON、`file://` 脚本包、索引和实时缓存 |
| 运行时配置 | `data/core/data-config-bundle.js` | 生成包；应编辑其源模块 |
| ODPT 与 SQL 计划客户端 | `data/api/odpt-unified.js` / `ODPTClient` | 请求、缓存、身份适配和 train-runs 访问 |
| SQL 计划端点 | `supabase/functions/train-runs/index.ts` | 按运行日选计划；不证明实际运行 |

可读 JSON 是唯一编辑源。紧凑 JSON 服务于 HTTP；`.file.js` 服务于离线 `file://`。
它们的重复载荷是有意设计，必须与生成器保持同步。

## 2. 业务所有者

| 能力 | 所有者/公共门面 | 主要消费者 |
| --- | --- | --- |
| 路线拓扑 | `js/route-search.js` / `RouteSearch` | `SearchUI` |
| 计划接续 | `js/route-timetable.js` / `RouteTimetable` | `SearchUI`、换乘展示 |
| 搜索交互 | `js/search-ui.js` / `SearchUI` | 首页 |
| 直通运行身份 | `js/running-chain-resolver.js` / `RunningChainResolver` | 融合、推定和列车视图 |
| 观测/计划融合 | `js/data-fusion.js` / `DataFusion` | 运行情报与列车控制器 |
| 基于计划的位置推定 | `js/train-position-estimator.js` / `TrainPositionEstimator` | `DataFusion` 与列车详情 |
| 车辆证据与图片 | `js/train-vehicle.js` / `TrainOperationEvidence`、`TrainVehicle`、`TrainIcons` | 推定、融合与渲染 |
| 车次号图片规则 | `data/timetables/train-number-png-ranges.js` / `TrainNumberPngRanges` | `TrainVehicle` |
| 线路展示 | `js/line-presentation-service.js` / `LinePresentationService` | 卡片、状态和列车视图 |
| 车站身份解析 | `js/station-resolver.js` / `StationResolver` | 搜索与展示服务 |
| 运行情报语义 | `js/runinfo-evaluator.js`、`js/runinfo-web.js` | 融合与状态视图 |
| 离线运行情报翻译 | `js/delay-translator.js` / `DelayTranslator` | 运行情报页 |

`DataFusion` 和 `RouteTimetable` 通过 `ODPTClient` 消费计划；页面不构造竞争的
时刻表请求。`TrainVehicle` 是唯一公共车辆/图片门面，尽管其当前实现仍是较大的
兼容文件。

## 3. 共享 UI 所有者

| 能力 | 所有者 | 页面 |
| --- | --- | --- |
| Header/导航/语言/Footer | `js/site-shell.js` / `SiteShell` | 全部七页 |
| 线路和系统卡片 | `js/line-card.js` / `LineCard` | 运行情报、列车 |
| 列表/页面数据状态 | `js/data-state.js` / `DataState` | 运行情报、列车 |
| 运营者筛选 | `js/operator-filter-bar.js` / `OperatorFilterBar` | 运行情报、列车 |
| 换乘结果徽章 | `js/transfer-badge.js` / `TransferBadge` | 首页搜索结果 |
| 观光类型分类 | `js/tourism-type.js` / `TourismType` | 观光入口/详情流程 |
| 观光详情底座 | `js/tourism-core.js` / `TourismDetailCore` | 活动、店铺和景点详情 |
| 观光周边 | `js/tourism-proximity.js` | 首页和观光视图 |

组件拥有自己的内部 DOM。页面代码只提供挂载点、数据和事件；不得查询私有 class 修补共享组件。

## 4. 列车页所有权与加载顺序

列车页由轻量控制壳与按线路冷加载的详情包组成。当前所有权为：

| 模块 | 当前职责 |
| --- | --- |
| `js/trains-data.js` | 视图数据组装、几何输入、静态网络签名和共享几何工具 |
| `js/through-chip.js` / `ThroughChip` | 直通标签测量、布局、方向和 SVG 渲染 |
| `js/trains-detail-loader.js` / `TrainsDetailLoader` | 验证并按顺序动态加载线路范围详情脚本 |
| `js/train-position-estimator.js` | 详情加载后基于计划推定列车位置 |
| `js/train-track-layout.js` / `TrainTrackLayout` | 具有方向通道与冲突车道的列车标记坐标 |
| `js/trains-render.js` / `TrainsRender` | SVG/DOM 图层、标记、详情和增量更新 |
| `js/trains-page.js` | 页面生命周期、选择、事件和组装 |

`pages/trains.html` 首屏加载 `trains-data.js`、`through-chip.js`、`trains-detail-loader.js` 和
`trains-page.js`。其 `#pt-trains-detail-assets` 模板随后按依赖顺序加载共享车辆/
号段数据、线路范围时刻表索引、`train-position-estimator.js`、`train-track-layout.js`
和 `trains-render.js`。

因此 `through-chip.js` 和 `train-track-layout.js` 是现役所有者，并非废弃转发壳。不得将
它们的算法吸收进页面，也不得声称列车页只加载 `trains-data.js` 和 `trains-render.js`。

## 5. 页面脚本链

- `home.html`：加载器/配置 -> 身份与翻译 -> ODPT/运行情报 -> 融合 -> 路线/时刻表/搜索 -> 观光/历史。
- `realtime.html`：加载器/配置 -> ODPT/运行情报 -> 融合 -> 展示与状态 -> 延误翻译 -> 运行情报控制器。
- `trains.html`：同一共享数据/状态底座 -> 展示/状态 -> 列车壳 -> 按线路冷加载详情包。
- 观光详情页：语言/站点外壳 -> 核心加载器 -> 观光详情底座 -> 类型控制器。

按顺序加载的经典脚本模型要求公共 `window.*` 门面在消费者执行前已存在。应通过现有
工具更新 `scripts/page-scripts.json`、生成页面标签和相关缓存指纹，不得手工维护第二份脚本清单。

## 6. 生成数据与证据数据

下列内容是派生或有证据范围的数据，不得成为竞争的 canonical 源：

- `data/audits/*.json`：生成目录、快照和审查证据；
- `data/timetables/*-index.js`：线路/来源范围的时刻表索引；
- `data/timetables/vehicle-operation-evidence*`：导出的车辆证据；
- SQL 迁移：不可改写的历史数据库变更，不是可编辑当前配置；
- 带日期的审计 Markdown：只对记录的来源/提交成立。

代表 PNG 映射仍受线路、日期、班次、来源和证据级别限制。图库关联不授权车次号映射或实际编成声明。

## 7. 验证入口

| 区域 | 入口 |
| --- | --- |
| 核心生成产物 | `node data/core/generate-all.js --check` |
| 浏览器数据契约 | `node --test tests/railway-browser-contract.test.cjs` |
| 运行日/位置语义 | `node --test tests/train-position-service-day.test.cjs` |
| 车次号图片运行时 | `node --test tests/train-number-png-runtime.test.cjs` |
| 运行情报语义 | `node tools/runinfo-evaluator.test.js` 与相关范围测试 |
| 页面脚本同步 | `scripts/` 下现有页面脚本测试与同步检查器 |

根据变更所有者和全部受影响消费者选择额外测试。本地检查不能证明当前 Supabase、
Edge、Pages、浏览器或设备状态。

## 8. 已知结构债

当前公共门面仍是权威入口，但以下实现体积较大且变更频繁：`train-vehicle.js`、
`train-number-png-ranges.js`、`train-runs/index.ts`、`trains-render.js` 和
`train-position-estimator.js`。重构时应在现有门面后按职责逐个拆分，并覆盖消费者与回归。
不得引入平行 v2 链或将规则移入页面代码。
