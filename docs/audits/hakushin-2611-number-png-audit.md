# 白新線 2026-11（JR-East 2611）官方列车番号与车型图标审计

## 来源与范围

- [JR-East 2611 白新线・羽越本线 上行：工作日](https://timetables.jreast.co.jp/2611/timetable-v/255u1.html)、[土休日](https://timetables.jreast.co.jp/2611/timetable-v/255u2.html)
- [JR-East 2611 白新线・羽越本线 下行：工作日](https://timetables.jreast.co.jp/2611/timetable-v/255d1.html)、[土休日](https://timetables.jreast.co.jp/2611/timetable-v/255d2.html)
- [E129 系正式车型和白新线运行范围](https://www.jreast.co.jp/train/local/e129.html)
- [「いなほ」E653 系车型及白新线运行范围](https://www.jreast.co.jp/train/express/inaho_shirayuki.html)
- [快速「海里」8853D，具体运行日与站时刻](https://timetables.jreast.co.jp/2611/train/060/064201.html)
- [「いなほ55号」8055M 只在 2026-12-26～31 开行](https://timetables.jreast.co.jp/2611/train/110/112621.html)
- [「いなほ83号」9083M 只在 2026-12-26、29～31 开行](https://timetables.jreast.co.jp/2611/train/125/128421.html)
- [JR-East 白新线运行情报](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=5&lineid=hakushinline)

这里仅审计 **2026 年 11 月**白新线铁路区间 `新潟～新発田`，而非把 JR-East 合并刊载的白新・羽越时刻表所有车次都复制到本线。既有 Supabase `manual_timetable_templates` 中该线路共有 **201 条模板、102 个不同列车番号**；旧 SQL 将特急与观光列车也错标为 `E129系`。源站时刻的日期尚未逐站核验，不能作为 GPS 位置。

## 99 个可审计的 SQL 番号与三种不应运行的旧号

| 类别 | SQL 中的不同番号数 | 2026-11 处理 | 图标 |
| --- | ---: | --- | --- |
| 普通 E129 上行（新発田/豊栄→新潟） | 46 | 严格 46 个 M 号 | 已批准 `JR東日本_E129系.png` |
| 普通 E129 下行（新潟→豊栄/新発田） | 44 | 严格 44 个 M 号 | 同上 |
| 快速 3921M（新潟→村上，白新线段新潟→新発田） | 1 | 每日，快速、E129 参考 | 同上 |
| 特急「いなほ」1、3、5、7、9、11、13 号 | 7 | `1M,3M,5M,7M,9M,11M,13M`，修正旧 SQL 的 Local/E129 | E653 系车型文字，**无已确认涂装 PNG** |
| 快速「海里」 | 1 | `8853D`，指定的 14 个运行日 | HB-E300 系车型文字，**暂不启用图库待审核海里 PNG** |
| 旧的 8055M、9083M、9883D | 3 | 2026-11 无已批准车次：前两者为 12 月特急，最后一者不属本月官方验证番号 | 隐藏旧 SQL 推定列车和错误 PNG |

**共 91 个可用 E129 型号参考图的不同车号 + 8 个特急/观光列车号；另 3 个历史号排除**。这些编号是 *列车服务号*，不等于当天实际上路的车辆编组号。

`8853D` **11 月运行日**：1、3、6、7、8、13、14、15、20、21、22、27、28、29。
官方规定「11月22日までの金・土曜・休日と11月27～29日運転」，尤其 **11 月 23 日虽是国民祝日，但不运行**。11 月 7 日强风警告只是可能延误/停运，并非官方确认全部列车取消，因此不能直接抹去该日时刻表。

## 技术实现与失误防护

- `data/timetables/jreast-hakushin-2611-number-index.js` 包含 90 普通 + 3921M 快速、7 个「いなほ」、1 个「海里」的精确来源车次与服务日规则。方向、JR-East 白新线 URN、日历（包括 11/3、11/23 法定假日）、种别与来源 SQL 的**完整首尾停站/顺序**都必须吻合。没有该索引时 2611 旧 SQL 的白新线推定直接安全退回。
- `data/timetables/train-number-png-ranges.js` 仅为 91 个 E129 正确车号提供原图库 PNG；必须有匹配的 sourceRailway、车型证据与日历。**不会借给 E653、HB-E300 或邻近羽越/信越线路**。
- `js/train-position-estimator.js` 根据官方车号把旧 SQL 的 `1M,3M,..13M` 改为特急「いなほ」以及 E653 系计划候选，把 `8853D` 改为快速「海里」及 HB-E300 系计划候选；将两者原有错误 E129 车型计划从乘客可见字段替换。车型身份仍为 `UNKNOWN`，不虚构涂装或编组号。
- `js/trains-render.js` 在这两种车次的折叠信息和提示中显示**官方计划车型（并非当天实车）**，只有 E129 普通车和普通快速使用审核通过的车型 PNG。
- `scripts/page-scripts.json` 为 `Hakushin` 增加专属懒加载索引；`pages/trains.html` 的标签指纹由脚本 Manifest 生成，符合 12 位十六进制格式。
- `tests/hakushin-2611-official-number-png.test.cjs` 测试 91 号码 × 多种服务日、假日、车型 PNG、7 趟特急、14 日快速海里、3 个陈旧车号排除，及估算器中将源旧车型修正并保持中性标记。

## 限制

当前页面的 `estimated:true`、`timetableDateVerified:false` 表示仅按旧 SQL 站时刻估算参考列车位置。**已经核验公开番号和车型类别，不代表逐站时刻表与 2611 全部一致、也不代表实时定位**。当天临时运休/延误仍以独立 JR East 运行情报为准。官方公布但尚无现有 SQL 完整站时刻的其他 `いなほ` 上行车次、其他快速「海里」班次、GV-E400/キハ110 等柴油车，不合成假列车。
