# JR東海线路色修订及官方编号审计 — 2026-11-17

## 范围与依据

审计现有 14 条 `JR-Central` canonical 记录：13 条在来线和 1 条东海道新干线。JR東海 2025 年 10 月官方铁路图确认 CA、CB、CC、CD、CE、CF、CG、CI、CJ 共 9 种在来线编号；未纳入编号体系的线路不能自行创建客运路线记号。

官网地图仅用于核对色系。下列 HEX 采用**项目已有的 9 个 SVG 背景填充色**，是网站的近似显示色，不代表 JR東海发布了官方精确 HEX。

| 线路 ID | 官方记号 | 旧基础色 | 新基础色与展示色 |
| --- | --- | --- | --- |
| TokaidoCentral | CA | `#f68b1e` | `#f6861f` |
| Gotemba | CB | `#2e8b57` | `#477543` |
| Minobu | CC | `#d88b00` | `#773c97` |
| Iida | CD | `#d33c6e` | `#6fa3d7` |
| Taketoyo | CE | `#e66b1f` | `#8c5a38` |
| ChuoCentral | CF | `#0073bf` | `#327198` |
| Takayama | CG | `#b85c00` | `#9e1813` |
| Taita | CI | `#7b3f98` | `#c8ba45` |
| KansaiCentral | CJ | `#f15a24` | `#16b68f` |

## 未编号线路

`KiseiCentral`（紀勢本線）、`Sangu`（参宮線）、`Meisho`（名松線）、`MinoAkasaka`（東海道本線美濃赤坂支线）：清空此前自造的“紀”“参”“名”“美” `presentation.code`，基础和展示颜色设为网站中性灰 `#80868b`。这不是 JR 官方指定线路颜色；`line.code` 保留供内部兼容。

## 跨公司显示与范围约束

JR-West canonical `KansaiMain` 的名古屋—亀山区段标记 `CJ` 的颜色从 `#00a88f` 调整为 `#16b68f`，与 `KansaiCentral` 一致。区段展示归属 `JR-Central` 不变；`KansaiMain` canonical 运营商 `JR-West` 不变。该改动不涉及跨公司物理拓扑重构。

东海道新干线 `TokaidoShinkansen` 的原色 `#00a7e1` 保留。所有列车时刻表、SQL、ODPT/GTFS、车辆 PNG 及号段映射不变。

## 工程同步

更新唯一权威数据 `data/core/railway_data.json`，并同步生成 `railway_data.compact.json` 与 `railway-data.file.js`；刷新 `db-loader.js` 的依赖 SHA，以及 7 个页面的加载器 SHA。新增 `tests/jr-central-line-colors-20261117.test.cjs`，并加入 CI；同步更新 JR-West 的 CJ 区段测试期望。

## 官方来源

- JR東海 铁路路线图（2025.10）：https://railway.jr-central.co.jp/route-map/_pdf/numbering.pdf
- JR東海 2017-12-13 车站编号、路线符号与路线色公告：https://jr-central.co.jp/news/release/_pdf/000035928.pdf
