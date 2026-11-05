# 白新線 2026-11（JR 東日本 2611）列车番号 × 车型核对

## 官方依据

- [白新線・羽越本線上行平日](https://timetables.jreast.co.jp/2611/timetable-v/255u1.html)、[上行土休日](https://timetables.jreast.co.jp/2611/timetable-v/255u2.html)
- [白新線・羽越本線下行平日](https://timetables.jreast.co.jp/2611/timetable-v/255d1.html)、[下行土休日](https://timetables.jreast.co.jp/2611/timetable-v/255d2.html)
- [いなほ9号・9M・新潟17:58→酒田20:10](https://timetables.jreast.co.jp/2611/train/060/064121.html)
- [いなほ车型：JR 东日本 E653 系](https://www.jreast.co.jp/train/express/inaho_shirayuki.html)
- [白新線 E129 系：JR 东日本车型目录](https://www.jreast.co.jp/train/local/e129.html)
- [海里 8853D（11月）](https://timetables.jreast.co.jp/2611/train/060/064201.html)、[海里 8854D（11月）](https://timetables.jreast.co.jp/2611/train/060/064221.html)、[海里 8851D（12月以后）](https://timetables.jreast.co.jp/2611/train/060/064211.html)
- [海里专用 4 辆编成混合动力列车](https://www.jreast.co.jp/railway/joyful/kairi.html)

## 映射（列车番号属于列车服务，不是编成/运用号）

| 服务类别 | 2611 公布番号 | 本地图标 | 身份含义 |
| --- | --- | --- | --- |
| 白新线普通 | 已审核的 46 上行 / 44 下行番号 | E129 系 | 线路与服务计划代表车型；不等于当天实车 |
| 快速（普通车辆） | 3921M 下行 | E129 系 | 同上 |
| 特急「いなほ」下行 | 1M、3M、5M、7M、9M、11M、13M | E653 系（いなほ） | 服务车型图片，仅作参考 |
| 特急「いなほ」上行 | 2M、4M、6M、8M、10M、12M、14M | E653 系（いなほ） | 服务车型图片，仅作参考 |
| 快速「海里」下行 | 8853D，仅 2026 年 11 月指定日 | HB-E300 系（海里） | 专用列车车型参考 |
| 快速「海里」上行 | 8854D，相同 11 月指定日 | HB-E300 系（海里） | 专用列车车型参考 |
| 快速「海里」12 月后 | 8851D | 2026 年 11 月不显示 | 不能套用 11 月 8853D 日历 |
| 旧源 8055M、9083M、9883D | 非此月审定列车 | 不显示 | 阻止陈旧计划伪装为 11 月列车 |

海里 11 月运行日：1、3、6、7、8、13、14、15、20、21、22、27、28、29 日。**11 月 23 日不运行**。

原有 SQL 有 201 条模板、102 种不同列车番号，其中先前只有 99 个番号具备白新線 11 月路段/服务日审核。此次增加了上行特急 7 个番号及上行海里 8854D 的**验证/显示规则**，但并未捏造缺失的上行 SQL 列车计划或逐站时刻。

## 运行时约束

1. 只在 **Hakushin**、**JR-East**、来源 **odpt.Railway:JR-East.Hakushin**、2026 年 11 月、番号、上下行、服务日历、种别全部一致时授权对应 PNG。真实已验证运行证据优先，UNKNOWN 不得晋升为 EXACT。
2. 对原 SQL 误写成 E129/Local 的「いなほ」「海里」先使用官方番号纠正种别与候选车型，再由图标选择器匹配官方服务。错误的原始 Local 记录不能直接触发特急/海里图标。
3. 9M 的官方最终终点是 **酒田**，而白新線区间数据末站是 **新発田**；修正展示终点但不改变白新線几何、计划位置或将推算当作实时。
4. PNG 为车型/服务参考，实际编组、涂装、车辆编号仍需独立证据；黑箱推定和通用线路车型不能充当实车确认。
5. 旧 SQL 的 `timetableDateVerified:false`、逐站到发时刻未经逐列车核验的问题仍存在。列车番号正确不代表 GPS、即时运行状态或逐站时间已证实。

测试：`tests/hakushin-2611-official-number-png.test.cjs` 覆盖上/下行、11 月运行日、方向/日历/路段/车型跨线隔离及不能把参考图升级为实车。
