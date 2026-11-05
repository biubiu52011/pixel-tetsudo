# JR 大湊線 2026-11 (2611) 列车番号与安全回退审计

## 官方资料

- [2611 工作日下行 278d1](https://timetables.jreast.co.jp/2611/timetable-v/278d1.html)
- [2611 土休日下行 278d2](https://timetables.jreast.co.jp/2611/timetable-v/278d2.html)
- [2611 工作日上行 278u1](https://timetables.jreast.co.jp/2611/timetable-v/278u1.html)
- [2611 土休日上行 278u2](https://timetables.jreast.co.jp/2611/timetable-v/278u2.html)
- [JR 东日本 2026 年 2 月 20 日盛冈支社维护区间／日期公告（PDF）](https://www.jreast.co.jp/press/2025/morioka/20260220_mr01.pdf)
- [JR 东日本大湊线运行公告](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=ominatoline)

## 18 个 2026-11 日常营业车次

| 种别 | 上行／大湊→野辺地 | 下行／野辺地→大湊 |
| --- | --- | --- |
| 普通 | 222D、224D、234D、238D、240D、242D | 221D、223D、229D、235D、237D、239D、241D |
| 快速「しもきた」 | 3226D、3228D、3230D | 3225D、3233D |

**维护日 11 月 10～13 日**：223D、229D、3225D、234D、3228D、3230D 在大湊线全部停运。3225D／3228D 在青い森鉄道的八戸～野辺地部分区间仍可按独立的铁路来源运行，但**大湊线这段不能画车**。此处理只影响源自旧 SQL 的推定位置，不抹掉实时且有独立证据的数据。

旧 SQL `9227D`（快速「ひなび 下北」）和 `9236D`（同方向为「ひなび 下北」或「ふるさと大湊」）属于 **12 月／2027 年 1 月**运行日，本月不能推定。官网还列出 `9231D`，但同样仅 12 月运行。不能从 9xxxD 数字范围推测本月定期开行。

## 车型 PNG：必须暂时留空，不可画错

- 旧 SQL 统一标签是 `キハ100系 / キハ110系`，不能单凭它为某一车指定真实车型。
- 2026 年车辆资料更具体地证实大湊线使用 **キハ100形 0／200 番台**：
  - [2026 年 7 月 KiHa100-26 进入大湊线运用](https://4gousya.net/forums/post/121930)
  - [2026 年 11 月 4 日报导 KiHa100-201／202／204 自原大湊线车辆移交北条铁路](https://railf.jp/news/2026/11/04/052000.html)
  - [4号车车辆配置](https://4gousya.net/pu_e/jr_e/4049.php)记载仍在该线的 KiHa100。
- 仓库中没有经过批准且适用于 **JR 东日本 キハ100（大湊线）** 的参考 PNG：不能把 `JR東日本_キハ110系.png` 当成外形相同，也不能借用他社既有 `ひたちなか海浜鉄道_キハ100形.png`。
- 新号码索引返回 `model:"キハ100系"`，但 `pngAvailable:false`，**没有将大湊线加入 KiHa110 图库授权**。有官方车号和计划位置时仍可显示中性灰点和官方 D 号，待独立审查／补充正确美术资产再开 PNG 映射。不能从数字推出实车编组。

## 实现与验证

新增 `data/timetables/jreast-ominato-2611-number-index.js`，严格核对 18 个车号、方向、日历、JR-East 来源和维护停运日期。 `js/train-position-estimator.js` 将旧 SQL 标错的 3225D／3226D／3228D／3230D／3233D 恢复为 **快速「しもきた」**，不造新时刻。 `pages/trains.html` 随线路加载索引。

`node --test tests/ominato-2611-official-number-estimate.test.cjs` 验证所有 18 车次、6 个维护车次、12 月车次排除、快速恢复及 **不会误配キハ110 PNG**。SQL 的原始时间仍未完成当月逐站核对，`timetableDateVerified:false`。
