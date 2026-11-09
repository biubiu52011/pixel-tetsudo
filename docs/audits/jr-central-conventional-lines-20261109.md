# JR东海在来线补齐（2026-11-09）

## 范围

canonical 路网新增 JR-Central 的 13 条在来线路：东海道、中央、关西、纪势、高山、武丰、太多、御殿场、身延、饭田、参宫、名松、美浓赤坂。JR-East 已有的东京—热海东海道本线和高尾—盐尻中央本线保持独立，未把运营边界合并。

富士急行线使用远端已核验的 `Fujikyu` 拓扑和运营者 `FujisanrokuElectricRailway`，本次只补齐其 ODPT 线路代码映射与展示归类。

## 来源与边界

- JR东海区域与在来线清单：<https://company.jr-central.co.jp/company/area/>
- JR东海线路图与线路编号：<https://railway.jr-central.co.jp/route-map/_pdf/numbering.pdf>
- 富士急行官方车站顺序：<https://www.fujikyu-railway.jp/station/>
- 富士急行线路说明：<https://www.fujikyu-railway.jp/railway/>

本批线路记录为 `station_topology_only`，补充站点顺序、换乘关系、站名索引和生成数据；不新增车次、实时位置、车型 PNG 或虚构运营日时刻。远端已有的富士急行站点坐标、粗略区间时长和拓扑审计保持不覆盖。

## 验收

`tools/jr-central-fujikyu-line-contract.test.cjs`、JR线路身份与常规线路来源契约通过。`data/audits/jr-missing-lines-20261109.json` 已将 13 条 JR东海线路从 database-only 清单转为已实现的拓扑线路；仍缺的 JR北海道、JR四国及其他清单线路不因本批次而宣称完成。
