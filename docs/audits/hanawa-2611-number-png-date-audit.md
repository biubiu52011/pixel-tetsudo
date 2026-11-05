# 花輪線 / Hanawa Line — 2026年11月番号・车辆 PNG 审计

**项目代码键保留 `Kounan`**（实际 JR 线路名为花輪線）。SQL 原模板 `manual_timetable_templates` 共 47 条，官方可对应 24 种列车番号（工作日 24 条、土休日 23 条）；不改铁路 URN、站序、任何既有出发到达时刻。

## 来源与模型

- [JR東日本 花輪線下り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/274d1.html) · [休日](https://timetables.jreast.co.jp/2611/timetable-v/274d2.html)
- [JR東日本 花輪線上り（平日）](https://timetables.jreast.co.jp/2611/timetable-v/274u1.html) · [休日](https://timetables.jreast.co.jp/2611/timetable-v/274u2.html)
- [9921D「ひなび 八幡平」官方车次](https://timetables.jreast.co.jp/2611/train/185/188831.html) · [9922D](https://timetables.jreast.co.jp/2611/train/185/188851.html)
- [JR東日本 ひなび车辆介绍、2026年11月开行日](https://www.jreast.co.jp/railway/joyful/hinabi.html) · [保守施工与停运公告](https://www.jreast.co.jp/suspend/)
- [JR東日本 キハ110系介绍](https://www.jreast.co.jp/train/local/kiha110.html)

**下り 11 个不同番号：** 921D、1923D、1925D、929D、9921D、1927D、1931D、933D、1935D、1937D、1939D。

**上り 13 个不同番号：** 1922D、1924D、1926D、928D、1930D、1932D、1934D、9922D、9934D、936D、1938D、1940D、942D。

正常普通列车的图片只采用已有通用 `JR東日本_キハ110系.png`；快速 **9921D / 9922D** 则采用 `JR東日本_HB-E300系_ひなび_陽旅.png`，限定 **2026-11-27～30**。临时普通 **9934D** 仅 **11/4、11/5** 出现且采用通用キハ110系参考 PNG。

**施工停运（11/4、11/5）：** 928D、929D、1927D、1930D、1931D、1932D、1934D，原 47 条模板并未删去；仅由查询接口按运行日过滤。该区间没有代行巴士。

## 技术约束

- 新增 SQL 表 `published_hanawa_2611_number_roster`，同时增加 `published_train_png_number_ranges` 三个需要精确名单的编号范围及 `published_train_number_evidence` 47 条编号来源记录。
- 服务器 `supabase/functions/train-runs/index.ts` 核对 `calendar`、`railway_urn`、列车番号、方向、列车类型、途经站、日期与 PNG 范围后才返回 `published_number_fleet_reference`。
- 客户端沿用 `train-number-png-ranges.js` 和 `train-position-estimator.js`，不增加新脚本或 PR。只允许受 SQL 来源确认的预计列车获得代表车型的 PNG。
- **车型图片是车系／列车服务示意，不是实际出库车辆、车号、编组；以前的 SQL 站点时钟没有被重新认证为 2611 的逐站官方时刻。** 日期限制只针对 2026-11 月官方版本，其余月份不外推。
- 回归测试：`node --test tests/hanawa-2611-exact-number-png.test.cjs`。

## 复核统计

| 项目 | 数量 |
| --- | ---: |
| 原始日历模板 / SQL roster | 47 |
| 不同官方番号 | 24 |
| 普通模板（排除 9934D） | 42 |
| ひなび模板 | 4 |
| 施工替代模板 | 1 |
| 带 11/4–5 施工取消条件的日历模板 | 14 |
| 有编号证据的模板 | 47 |
