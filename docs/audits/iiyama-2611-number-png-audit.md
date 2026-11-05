# 飯山线 2026 年 11 月官方列车番号→车型参考 PNG 审计

## 资料

JR 东日本 2611 四种时刻表：

- [平日上行](https://timetables.jreast.co.jp/2611/timetable-v/229u1.html)
- [土休日上行](https://timetables.jreast.co.jp/2611/timetable-v/229u2.html)
- [平日下行](https://timetables.jreast.co.jp/2611/timetable-v/229d1.html)
- [土休日下行](https://timetables.jreast.co.jp/2611/timetable-v/229d2.html)
- [「おいこっと」JR 东日本官方运行日历](https://www.jreast.co.jp/railway/joyful/oykot.html)

### 普通列车：严格 54 个官方 D 号

上行 30：1120D、1122D、120D、122D、124D、126D、128D、130D、132D、134D、136D、138D、140D、142D、144D、146D、150D、162D、164D、166D、170D、172D、182D、186D、188D、190D、192D、194D、196D、198D。

下行 24：1121D、1123D、123D、125D、127D、129D、131D、133D、135D、137D、139D、141D、143D、145D、147D、149D、151D、163D、175D、181D、185D、187D、189D、193D。

所有普通车次须严格匹配线路 `Iiyama`、来源 `odpt.Railway:JR-East.Iiyama`、方向、实际服务日、列车种别 `Local`、编号 D 后缀、SQL 明确的车型证据 `キハ110系`。代表车型图来自仓库已审核 `JR東日本_キハ110系.png`。即使有图，车辆身份依然 `UNKNOWN`，`planned:true`，**不声称当天是某组编成**。上行／下行与邻近线路绝不共用误配图标。

### 两种特别车次：严格的运行日 + 不借普通 PNG

| 名称 | 下行 | 上行 | 2026-11 运行日 | PNG 状态 |
| --- | --- | --- | --- | --- |
| 快速「おいこっと」 | 8141D | 8140D | 1、2、3、7、8、14、15、21、22、23、28、29 | 既有特别涂装 PNG 尚未审定；不可用普通キハ110图冒充 |
| 快速「越乃Shu＊Kura」 | 8133D | 8124D | 20、21、27、28、29 | キハ40・48形，不能使用キハ110 PNG |

`9140D`「十日町雪見おいこっと」为**2027 年运行的号**，不能作为 2026-11 号段。旧 SQL 虽为特别车保存多个日历类别，运行时仍以具体日期核验。2026 年 11 月 2 日是星期一，但「おいこっと」官方确实开行，因此该日允许它使用被导入为土休日的原计划行程，不放宽任何其他日期的普通列车。

## 程序修改

- 新增 `data/timetables/jreast-iiyama-2611-number-index.js`：54 普通 + 4 特别车号、日期、来源、类型准入。
- `data/timetables/train-number-png-ranges.js`：仅 54 个 `regular` 且有正确计划车型证据的普通车次可用 KiHa110 PNG。
- `data/timetables/vehicle-garage-png-map.js` 与 `js/train-vehicle.js`：为既有 KiHa110 通用参考图增加 `Iiyama` 线路范围，不批准「おいこっと」待审图库图片。
- `js/train-position-estimator.js`：防止非运行日根据旧 SQL 产生特别列车；支持 11/2 号段与日历相符的特别列车。保留官方车次号与快速名称，不生成站点时刻。
- `pages/trains.html`：线路懒加载官方索引。

**验证**：`node --test tests/iiyama-2611-official-number-png.test.cjs` 核实 54 正常号码 × 两种日历、12 个おいこっと日、5 个 Shu＊Kura 日、禁错车型 PNG、源铁路、类型和 11/2 特别开行。现有 SQL 站时刻还不代表完成 2611 逐站日期精校；保持 `timetableDateVerified:false`。
