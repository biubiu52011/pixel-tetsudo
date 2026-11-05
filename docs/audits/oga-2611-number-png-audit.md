# 男鹿线 2026-11 2611 官方番号与 EV-E801 车辆参考图

四向官方来源： [JR 东日本上行平日](https://timetables.jreast.co.jp/2611/timetable-v/259u1.html)、[上行土休日](https://timetables.jreast.co.jp/2611/timetable-v/259u2.html)、[下行平日](https://timetables.jreast.co.jp/2611/timetable-v/259d1.html)、[下行土休日](https://timetables.jreast.co.jp/2611/timetable-v/259d2.html)。[JR 东日本车型页](https://www.jreast.co.jp/train/local/ev_e801.html) 证实 EV-E801系（ACCUM）在线路运用。

## 本月准入与 PNG

- 上行 15 趟：1120M、1122M、1124M、1126M、1128M、1130M、1132M、1134M、1136M、1138M、1140M、1142M、1144M、1146M、1148M。
- 下行 14 趟：1123M、1125M、1127M、1129M、1131M、1133M、1135M、1137M、1139M、1141M、1143M、1145M、1147M、1149M。
- **2026-11-05**：1130M／1132M／1134M、1131M／1133M／1135M 官方列明停运，过滤其 SQL 推定位置，禁止产生基于旧站时刻的 PNG 标记。
- 2026-12-19 的 9129D／9134D 与 2027-02-13/14 的 9135D／9146D 是表中跨月临时列车，**不属于本月候选**。晚间 1145M 在 11 月 20 日另有临时时刻变更，未核实当前 SQL 站时刻前仍只当作历史计划。
- 所有有效的普通 M 列车在车辆证据无冲突时可使用现有 `JR東日本_EV-E801系.png` **代表性图片**，绝不认定实际车组或实时 GPS。

新增 `JREastOgaNumberIndex202611.verify`：将源线路、完整番号、上下行、普通车种、日历、本月日期与 11 月 5 日例外一并校验；时刻表推定与 `TrainNumberPngRanges` 调用同一判断。原始 SQL 保留而不捏造缺失的发车时刻。

## 已知不足

旧 SQL 的平日表中不含 1130M／1132M／1134M、1131M／1133M／1135M，尽管除 11 月 5 日外官方表列有运行。数据不全时**不生成不存在于 SQL 的推定车次**，后续需逐站补齐正式时刻后再纳入显示。

测试：`node --test tests/oga-2611-official-number-png.test.cjs`，覆盖全部 29 个车号的平日/土休日图标、停运日与源铁路安全边界。
