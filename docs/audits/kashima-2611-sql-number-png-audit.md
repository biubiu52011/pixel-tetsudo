# 鹿島線 Kashima：JR 东日本 2026 年 11 月 2611 SQL 列车番号及车型映射审计

## 结论

- **现有 SQL 32 个正常列车番号 / 64 个平日+土休日模板本来已齐全**，各条均包含 `佐原－香取－十二橋－潮来－延方－鹿島神宮` 六站路径。官方线路图中香取以西的佐原是成田線接续区间；不要为这些交叉来源创造同一物理车的重复实际编组。
- 以 2026-11 [鹿島線下行平日](https://timetables.jreast.co.jp/2611/timetable-v/214d1.html)、[下行土休日](https://timetables.jreast.co.jp/2611/timetable-v/214d2.html)、[上行平日](https://timetables.jreast.co.jp/2611/timetable-v/214u1.html)、[上行土休日](https://timetables.jreast.co.jp/2611/timetable-v/214u2.html) 为依据，核验既有 **64 × 6 = 384 个官方表列的途中发时刻/末站到时**，无差异；这**不**自动证实表中未展示的途中到时，保持现存 canonical `undated_not_current_verified` 而非伪造 `date_verified`。
- 11 月 **7 日**，官方注明：`2520M → 9520M`、`2545M → 9545M`、`548M → 9548M`、`549M → 9549M`。四组 **同一时间、不同番号**，旧番号当日停运；不能两组车同时渲染。新建四个精确周六/休日来源模板，仅克隆原来六站可验证的相同钟点，不创造东京/成田全程的虚假 canonical。其他日运行旧号码，绝不运行 95xxM 替代号。
- 最终 SQL 编号证据 **36 个不同番号、68 条编号/日历记录**（正常 32×2 + 11/7 替代 4×1），以及两类车型的 **4 个候选号段**。全部只能凭数据库官方清单 + 日历 + 严格站序确认，单有号段不能显示车型。
- 车型计划图来自项目既有画廊：
  - E131系0番台／80番台 常规区域车次 → `JR東日本_E131系_0番台.png` **代表性家族插图**，不声称其具体车辆为 0 番台而非 80 番台。[JR 官方 E131 介绍](https://www.jreast.co.jp/train/local/e131.html)
  - `2520M`／`2545M` 直通以及 11/7 `9520M`／`9545M` → `JR東日本_E235系_1000番台.png`（计划车型，[JR 官方 E235 介绍](https://www.jreast.co.jp/train/local/e235.html)）。
  - `548M`／`549M` 及 11/7 `9548M`／`9549M`：现有 SQL 车型包含 E131/E235 等不唯一候选，**不发 PNG**，不能凭 M 号段猜具体编组。
- 鹿島サッカースタジアム属于 JR 正式线界，但常规的本月六站列车时刻表均以鹿島神宮为端点；没有官方列车番号+逐站来源则不延伸至臨時駅，不将鹿島臨海鉄道列车直接混成 JR 鹿島線车。

## 数据流与防错

`published_kashima_2611_number_roster` 保存编号、日历、11/7 运行日、首末站、车种、车型证据与图片。 `published_train_png_number_ranges` 存四条精确 **E131 / E235** 范围。四个替代号同时进入 `manual_timetable_templates` / `manual_timetable_template_stops` / `train_timetables` / `train_timetable_members` / `published_train_number_evidence`。

部署后的 `supabase/functions/train-runs/index.ts` **强制从 SQL 读取** 2611 日期对应 row，按精确番号、方向、Calendar、日期、6 站顺序和 family+PNG 范围审核；仅此 API 能签发 `published_number_fleet_reference`。无证据不返回幽灵车，无法唯一确定车型时返回空 PNG，实际编组字段 `actualVehicleConfirmed=false`。

前端 `TrainPositionEstimator` 通过 `TrainNumberPngRanges.verifyKashimaService` 校验服务器证据，未知车型只显示无图标记；既有跨线 Chiba 参考 JS 编号清单不能绕过这层 SQL 验证。

## 回归验证

- `node --test tests/kashima-2611-sql-number-png.test.cjs`
- 对于原有 `tests/yokosuka-sobu-202611-number-png.test.cjs`，Kashima 已加严为 SQL 证明后才可取得 E235 图，不再以单独的 Chiba 编号索引授权。
- 检查 11/7 与 11/8 的旧号/替代号互斥；检查六站/方向/源铁路/日历/车型冲突导致中性标记，确认 `UNKNOWN` 仍为实际车号身份。
