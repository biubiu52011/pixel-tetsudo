# JR北海道・JR四国・肥薩線トポロジー补齐（2026-11-09）

本轮将 JR 缺口清单中的 20 条线路注册到 canonical `data/core/railway_data.json`，并同步 `station_i18n.json`、反向站点索引、`lineStationOrder`、ODPT 线路身份别名和生成文件。

## 范围

- JR北海道：函馆本线、根室本线、千岁线、室兰本线、石胜线、富良野线、宗谷本线、钏网本线、石北本线、札沼线（日文展示名保留“学园都市线”）、日高本线。
- JR四国：予赞线、土赞线、高德线、德岛线、鸣门线、牟岐线、予土线、内子线。
- JR九州：肥萨线，明确写入八代—吉松不通、吉松—隼人 2026-06-28 恢复运营的分段状态。

线路对象统一标记 `timetableDataStatus=station_topology_only` 和 `sourceQuality=topology_verified_times_approximate`。本轮没有创建列车番号、时刻表、实时位置、车型 PNG 或模拟运行。

## 线路色边界

新增线路以及此前 JR东海 13 条线路均补齐 `presentation.color`、线路代码和运营商展示组，且与基础 `line.color` 保持一致。北海道、四国和 JR东海的这些色值当前是路线图/线路识别色的工程近似值，记录为 `colorStatus=approximate_route_map`；它们没有被宣称为已完成官方 RGB 色票审计。JR西日本 8 条、JR东日本 5 条既有线路仍由 `tests/jr-line-colors-20261109.test.cjs` 做官方走廊级颜色回归。

## 来源与当前状态

- [JR北海道营业区域与线路営業キロ](https://www.jrhokkaido.co.jp/corporate/company/com_02.html)：用于核对北海道线路名称、营业区间及日高线/札沼线的当前范围。
- [JR四国车站编号与线路区分](https://www.jr-shikoku.co.jp/01_trainbus/st_number/)：用于核对四国线路代码及各线路展示范围。
- [JR九州肥萨线恢复公告](https://www.jrkyushu.co.jp/common/inc/emergency/__icsFiles/afieldfile/2026/05/28/20260527_The_Hisatsu_Line_Yoshimatsu_to_Hayato_will_resume_operation.pdf)：用于核对吉松—隼人恢复日期及八代—吉松仍不通的分段状态。

验证：`node --test tests/jr-hokkaido-shikoku-hisatsu-20261109.test.cjs tests/jr-line-colors-20261109.test.cjs tests/jr-missing-line-inventory-20261109.test.cjs`。
