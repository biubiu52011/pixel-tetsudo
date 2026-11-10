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

## 线路标志资产对照（2026-11-10）

用户提供的 9 张 1200×1177 PNG 标志已核对字母编号、线路身份、背景色，现有 `images/鉄道/JR東海/` 下相应 SVG 已能作为站点展示的线路徽标，canonical `line.image` 已指向这些 SVG。避免在运行代码中增加第二套线路图标映射。**原始 PNG 文件未加入本 Git 仓库**；下表保留原稿文件名及 SHA-256 供后续核验，不应把 SVG 当作 PNG 文件本体。

| 标志 | 线路 | canonical line ID | 前端资产（仓库内） | 提供的 PNG 原稿 | 原稿 SHA-256 |
|---|---|---|---|---|---|
| CA | 東海道本線 | `TokaidoCentral` | `images/鉄道/JR東海/東海道本線.svg` | `JR_Central_Tokaido_Line.png` | `90d6cf0b60e5d2c116f214eef58534c0a9d2e46653178264b7f73cb2eb0a838c` |
| CB | 御殿場線 | `Gotemba` | `images/鉄道/JR東海/御殿場線.svg` | `JR_Central_Gotemba_Line.png` | `b5263334fde2526848ac419790296abe4c32905d30ebc27146cdc6449e8f94ef` |
| CC | 身延線 | `Minobu` | `images/鉄道/JR東海/身延線.svg` | `JR_Central_Minobu_Line.png` | `e278d6075caf9153a653773aebdc8fb7808258eddb583aeb006e0f5f82aa9b9f` |
| CD | 飯田線 | `Iida` | `images/鉄道/JR東海/飯田線.svg` | `JR_Central_Iida_Line.png` | `d982b8e3d2c477b35b671c62e37f9767d7ddefaf05ade94be87432a79401c633` |
| CE | 武豊線 | `Taketoyo` | `images/鉄道/JR東海/武豊線.svg` | `JR_Central_Taketoyo_Line.png` | `888e1f1e249ab7fdc321500df25c3d8bf6a58a7ceb64ebacd172c8789c1dad2c` |
| CF | 中央本線 | `ChuoCentral` | `images/鉄道/JR東海/中央本線.svg` | `JR_Central_Chuo_Line.png` | `6170ab20b3ee6576ead68b28545bfaa578e6ab8a3341e67bca02d36b72eaa386` |
| CG | 高山本線 | `Takayama` | `images/鉄道/JR東海/高山本線.svg` | `JR_Central_Takayama_Line.png` | `a6ab049ae883529ee0816c4d246fb61d0fd7d90235e304a461c561792ece775e` |
| CI | 太多線 | `Taita` | `images/鉄道/JR東海/太多線.svg` | `JR_Central_Taita_Line.png` | `3de355b870680d9fa1ab47c08f2af3457103c8c7748a63aeb86d3cfd51af7cde` |
| CJ | 関西本線 | `KansaiCentral` | `images/鉄道/JR東海/関西本線.svg` | `JR_Central_Kansai_Line.png` | `4f3bed77794f442939af96968662ec2820f4d580d5e356203b69ff9a276e9293` |

前端保持 `line.image` 作为唯一资源入口，参照 `tools/jr-central-fujikyu-line-contract.test.cjs` 现有 9 条映射检查。JR 东日本同名线路及其独立资产不受此项影响。
