# Pixel Tetsudo

Pixel Tetsudo 是一个静态多语言铁路信息站点。它结合 canonical 铁路拓扑、
计划时刻表、可用的实时观测和有证据范围的车辆图片，但不会把计划冒充为
实际运行。

## 页面

| 页面 | 入口 | 用途 |
| --- | --- | --- |
| 首页 | `pages/home.html` | 路线搜索、计划接续、周边观光 |
| 运行情报 | `pages/realtime.html` | 线路状态与可用实时观测 |
| 列车 | `pages/trains.html` | 线路图、观测/推定位置和车辆参考 |
| 历史 | `pages/history.html` | 本地保存的搜索历史 |
| 观光 | `pages/tourism-{event,shop,spot}.html` | 共用的观光详情页 |

开发时从仓库根目录启动静态 HTTP 服务，然后打开 `/pages/home.html`。
项目保留了供离线使用的 `file://` 加载链，但 HTTP 服务是常规开发方式。

## 架构概览

```text
canonical 铁路/观光数据 -> 生成产物 -> DataLoader / RailwayDB
ODPT 观测 + SQL 计划时刻表 -> ODPTClient -> DataFusion / 位置推定
有范围的车辆证据 -> TrainVehicle -> 列车渲染器
共享 UI 组件 -> 页面控制器 -> 七个页面
```

浏览器端当前使用按顺序加载的经典脚本和明确的 `window.*` 公共门面。
脚本所有权和加载顺序记录在 [`docs/COMPONENTS.md`](docs/COMPONENTS.md)；不要仅凭
文件名推测依赖关系。

## 真相源规则

- `data/core/railway_data.json`：铁路身份、拓扑、车站和展示元数据。
- `data/core/station_i18n.json`：canonical 车站翻译。
- `data/core/tourism_data.json`：观光事实。
- Supabase 时刻表行是计划，不是实际运行或编成证据。
- 实时观测、时刻表推定和车辆证据必须分别保留来源。
- 生成的 `.compact.json` 和 `.file.js` 是产物，不是独立编辑入口。

## 开发检查

```powershell
node data/core/generate-all.js --check
node --test tests/railway-browser-contract.test.cjs
node --test tests/train-position-service-day.test.cjs
git diff --check
```

再根据实际变更组件运行其他测试。本地测试、哈希比较或截图都不等于生产验收。

## 文档

- [`AGENTS.md`](AGENTS.md)：代码智能体的仓库交付规则。
- [`ENGINEERING.md`](ENGINEERING.md)：长期架构、数据和验证规则。
- [`docs/COMPONENTS.md`](docs/COMPONENTS.md)：当前模块所有权和加载关系。
- [`PROGRESS.md`](PROGRESS.md)：当前与历史执行证据。
- [`docs/README.md`](docs/README.md)：现役与历史文档索引。

已授权的普通变更默认直接提交到 `main`。推送会运行 CI，但不授权
Pages 生产发布、Supabase 写入/迁移、Edge 部署或 Release 登记。
