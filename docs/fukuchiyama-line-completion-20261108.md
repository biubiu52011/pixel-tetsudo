# 福知山线／JR宝塚线：站序补全（2026-11-08）

既有 `Fukuchiyama` 线路登记了大阪–篠山口 22 站。线路本名福知山线延伸至福知山，北段补齐 9 站，最终 31 站。JR宝塚线是部分区间的爱称，不能将篠山口以北标为 JR宝塚线。

站序（篠山口之后）：丹波大山 → 下滝 → 谷川 → 柏原（兵库）→ 石生 → 黒井（兵库）→ 市島 → 丹波竹田 → 福知山。

- 丹波大山、下滝、柏原（兵库）、石生、黒井（兵库）、市島、丹波竹田补建坐标与 i18n；谷川及福知山复用现有站点，维护与加古川线、山阴本线的换乘关系。
- 柏原（兵库）采用 `Kaibara-Hyogo`，防止和关西本线的 `Kashiwara` 混淆；黒井采用 `Kuroi-Tamba`，避免与信越本线另一个 `Kuroi` 混淆。全局未改写「柏原」和「黒井」既有别名。
- 站点经纬度参考 MapFan 的福知山线站点，谷川、福知山复用既存坐标。
- 既有大阪–篠山口 21 区间均保持原 4 分钟的**历史站距参考估算**。新增 9 区间使用 2026-11-08 Yahoo 换乘结果中一趟福知山 09:01 → 篠山口 10:10 普通车所列沿途时刻的相邻**参考间隔**，从篠山口方向记为 `[3,16,5,10,3,9,7,8,8]`。此为图/换乘搜索兜底时长（包含该列车停站等待），**不是所有列车通用的已核实时刻表**，不得作为今日位置、运营恢复或列车号身份的证据。
- 原 SQL 383 条历史时刻表与 357 条候选车辆映射不变。没有为新增北段虚构 2026-11 车次、车号、编组、实时位置、人工时刻。
- 生成文件 `railway_data.compact.json` / `railway-data.file.js` 和 `station_i18n.compact.json` / `station-i18n.file.js` 由 `gen-file-data.js` 同源更新。

来源：
- https://www.jr-odekake.net/station/pdf/ubn.pdf
- https://ekitan.com/sta-info/line/5801
- https://transit.yahoo.co.jp/search/result/%E7%A6%8F%E7%9F%A5%E5%B1%B1-%E7%AF%A0%E5%B1%B1%E5%8F%A3
- https://mapfan.com/spots/SCH%2CJ%2CLK0
- https://mapfan.com/spots/SCH%2CJ%2CCK0
- https://mapfan.com/spots/SCH%2CJ%2CXK0
- https://mapfan.com/spots/SCH%2CJ%2CVK0
- https://mapfan.com/spots/SCH%2CJ%2CBK0
