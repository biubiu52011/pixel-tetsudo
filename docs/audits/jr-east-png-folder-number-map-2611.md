# JR 东日本 PNG 131 张：2026-11 号段、日期与现役身份逐图映射

本清单覆盖 `images/列车/JR東日本/` 文件夹 **131 张物理 PNG**，每张均有审计状态、现有 SQL/JS 番号证据、来源和下一步限制。**不等同于 131 张均现役或均已取得精确号码。** 基准日 2026-11-16。

## 全部文件和状态

- [逐张 PNG × 既有号码规则 × 日期特例 JSON](../../data/audits/jr-east-png-folder-number-map-2611.json)
- [逐张 PNG 的 131 行 CSV](../../data/audits/jr-east-png-folder-number-map-2611.csv)
- [生成器](../../tools/build-jr-east-png-folder-number-map.cjs)与[自动测试](../../tests/jr-east-png-folder-number-map.test.cjs)

| 分类 | PNG 张数 |
| --- | ---: |
| 现役车系有号码线索（含日期限定的只读参考） | **59** |
| 现役车系无合规号码线索 | **25** |
| 号码来源已有但需核对现役图片 | **2** |
| 原运行区间已历史化 | **3** |
| 非定期旅客列车：检测／实验车辆 | **2** |
| 已隔离、不可配图 | **4** |
| 其余仍待逐图/逐号核实 | **36** |
| 总计 | **131** |

### 2026 年 11 月已核对日期的特别列车

| PNG | 列车番号 | 现有来源 |
| --- | --- | --- |
| HB-E300「リゾートしらかみ・橅」HB-E301-5、HB-E302-5 | `8521D`、`8522D`、`8524D`、`8525D` | 五能线原有号码索引 + JR 东日本 11 月编组日历 |
| HB-E300「SATONO」1、2 号车 | `8821D`、`8822D` | 仙山线原有日历校验器；仅计划画面，不代表运行中的车组 |
| キハ110「おいこっと」 | `8140D`、`8141D` | 饭山线原有逐号、运行日验证 |
| キハ40・48「越乃Shu＊Kura」 | `8124D`、`8133D` | 饭山线原有逐号、运行日验证 |

日期由 `jreast-gono-2611-number-index.js`、`jreast-senzan-2611-number-index.js`、`jreast-iiyama-2611-number-index.js` 中**真正的逐日校验器**重新计算，而非在表里补一个无守卫的宽号段。两张「橅」是同一车系的两端图，不能凭一个列车号自动选择车头朝向。日期明细见 JSON/CSV。

官方核对：[リゾートしらかみ](https://www.jreast.co.jp/railway/joyful/shirakami.html)、[SATONO](https://www.jreast.co.jp/multi/joyful/satono_timetable.html)、[おいこっと](https://www.jreast.co.jp/railway/joyful/oykot.html)。

### 应排除或留白的情形

- 鶴見线原 `205系1100番台`、八高/川越旧 `209系3000/3100番台` 不能继承 2026 年同线路新车型的番号。
- 山形线 `E723系5000番台` 已在 2026 年 9 月开始营业，但 `701系5500`、`719系5000` 与其并存、逐步替换，不能将整条普通列车号段分给 E723。[官方投放计划](https://www.jreast.co.jp/press/2025/20251126_ho03.pdf)、[开始营业报道](https://railf.jp/news/2026/09/23/000000.html)。
- 长野地区 `E131系` 有 2026 秋季投放计划，但缺少逐车次事实时不能把所有 `211系` 原有号段直接归到 E131。[官方公告](https://www.jreast.co.jp/press/2026/nagano/20260507_na01.pdf)。
- 中央·总武 `E235系 B31` 的转属/测试与实际 11 月 B/C 列车运用属于不同层级，不应直接匹配。
- `E926 East-i`、`FV-E991 HYBARI` 不属于普通客运列车；`E657` 特殊涂装及其他主题车不能凭车型名称一概继承既有编号。
- `JR東日本_E233系_5000番台.png` 被图库标记 `alternateOnly`，不能替代正式编号路径。

本次未更改数据库、运行时车型判定或 Edge Function；号段仍只由既有 `TrainNumberPngRanges`、SQL、各线路编号校验器管理。静态 `min/max` **不是端点之间所有番号都运行的证据**。

```bash
node tools/build-current-service-png-number-map.cjs --check
node tools/build-jr-east-png-folder-number-map.cjs --check
node --test tests/jr-east-png-folder-number-map.test.cjs
```
