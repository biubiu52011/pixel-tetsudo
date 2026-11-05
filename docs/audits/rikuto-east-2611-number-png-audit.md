# 陸羽東線・2026 年 11 月官方列车番号与计划车型 PNG 审计

## 数据来源

JR 东日本 2611 线路时刻表（含列车番号、上下行、土休日与运行日）：
- [平日上行](https://timetables.jreast.co.jp/2611/timetable-v/268u1.html)
- [土休日上行](https://timetables.jreast.co.jp/2611/timetable-v/268u2.html)
- [平日下行](https://timetables.jreast.co.jp/2611/timetable-v/268d1.html)
- [土休日下行](https://timetables.jreast.co.jp/2611/timetable-v/268d2.html)

车型依据：JR 东日本[キハ100・110](https://www.jreast.co.jp/train/local/kiha110.html) 的线路资料及 2026 年 [「おもいで湯けむり号」使用 キハ110 系的实车报道](https://2nd-train.net/topics/article/76159/)。此处车型 PNG 是 **线路／车型参考**，不是该天车辆编组的确认或 GPS 测量。

## 号码核对

对照历史 SQL `manual_timetable_templates`：
- 本月普通定期 **45 个**独立编号：上行 22（5720D、1720D、5722D、1722D、1724D、5724D、5726D、1726D、1728D、4730D、1732D、4734D、5728D、1736D、5730D、1738D、5732D、1740D、5734D、1742D、1744D、1746D）；下行 23（5721D、1721D、5723D、1723D、2725D、5725D、4725D、1727D、4729D、1731D、4733D、5727D、1735D、5729D、1737D、5731D、1739D、5733D、1741D、1743D、1745D、1747D、5735D）。
- 「**おもいで湯けむり 1–6 号**」六个番号：下行 9721D、9723D、9725D，上行 9722D、9724D、9726D。官方列车种别为 **快速**，SQL 原始模板误标 Local，运行时覆盖该类别，不改原始站时刻。运行日为 **11 月 1、2、3、7、8、14、15、21、22、23、28、29 日**（官方标注至 11/29 的土曜休日及 10/31–11/3）。
- 旧 SQL 的 **9727D、9728D** 不属于 2026-11 实际开行名单：9727D 是下月以后「風っこストーブ湯けむり」，不要当作今天的キハ110／列车位置或延伸号段。绝不将 9720–9728 整个整数范围授权。
- 共 **51 个**本月有官方列车番号及车型参考的车次；所有车次仍以 `estimated:true`、`vehicleIdentityStatus:UNKNOWN`、PNG `planned:true` 呈现。严格匹配号码、`RikutoEast`、JR 东日本、铁路 URN、日历、列车种别与实际运行日期。

## 停运区段是硬边界

JR 东日本[运行公告](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=riku-eastline) 证实 2024 年 7 月灾害以来 **鳴子温泉～新庄** 仍暂停铁路列车，另有代行巴士。不可把原计划列车外推过停运区间；即便号码正确也不能画列车。当前 SQL 的 `RikutoEast` 共 1058 个 stop 记录，检查无停运区段站点，已在位置推定层另加防护：若未来导入含中山平温泉、堺田等停运段站点的旧 SQL 模板，拒绝整条不可信的计划列车，待有官方分段站表后再重建。

## 程序变更

- 新增 `data/timetables/jreast-rikuto-east-2611-number-index.js`，逐号/方向/服务日/月度名单准入。
- `TrainPositionEstimator` 只使用该月准入列车，赋予快速车次正确种别和名称，阻止 9727D/9728D 及跨停运区间的幻影位置。对于 11 月 2 日快速特别运转，可兼容旧数据存储为土休日模板的情况；**但实际取数是否提供该模板仍受上游缓存/日历筛选影响**。
- `TrainNumberPngRanges` 同一索引进行车型配图，`VehicleGaragePngMap` 和 `TrainVehicle` 给既有 `JR東日本_キハ110系.png` 授予线路范围。图库无新增图片，缺少来源时仍显示灰点。
- 上游 SQL 的站时刻版次仍为未确认，**没有更新或杜撰任何时间、实体车辆号、实际 GPS、停运代行巴士时刻**。

测试：`node --test tests/rikuto-east-2611-official-number-png.test.cjs`，验证 45+6 个号、12 个临时日、11 月 2 日、错误线路/日期、PNG 原图、无实车身份升级、停运区间保护。
