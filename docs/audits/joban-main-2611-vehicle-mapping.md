# 常磐本線：2026-11 车辆映射审计

更新日期：2026-11-07。线路 ID 为 `JobanMain`，不是 `Joban`（常磐快速）或 `JobanLocal`（各站停车）。

## 数据库覆盖

- **243** 条已核验 `Joban ↔ JobanMain` 连续服务：E531 系，`source_single_type_candidate`，不代表当日实际编组。
- **132** 条已核验连续服务：E657 系，`official_service_vehicle_plan`；这只证明特急车型家族，不是实际编组或纪念涂装。
- **237** 条单段 `JobanMain` 普通列车（平日118／土休日119）：由本迁移补入 `source_single_type_candidate`，保留原始 `source_template_id`，不提高计划与站时刻的可信度。
- **100** 条单段北段普通列车（两种日历各50）：原始模型标签 `701系 / E721系`。车型是**并列候选**，并无该列车番号对应的单一车型／编组证据；不写入只允许单车型的 `train_timetable_vehicle_mappings` 表，也不自动选择 701 或 E721 的图库图片。

上述计数按 *canonical timetable row*，不同日历按不同记录计数，不是实物车辆数。

## 呈现边界

- 单段 E531 只有来源历史计划车次、日期／日历、方向、原始停站、单车型候选和线路一致时，才允许沿用图库中 `JR東日本_E531系.png` 作为 **illustrative reference（代表性像素车图）**。它不代表当日列车真实运行或使用 E531；继续保留 `undated_not_current_verified`。
- 北段的 701 / E721 同时展示为候选资料，但未验证具体列车番号与车型配对时使用中性列车图标。**不可用 701／E721 的涂装图片替代证据**。
- `Joban` 既有 H 番号 E231-0、跨取手连续 E531、`JobanLocal` 的 K/S/E、E657 特急等规则维持独立，不跨线传染图片。
- 2611 官方时刻表的「列车番号」与历史 SQL 「停站时刻」是两种不同证据。需要重新校验四种日历／方向的全站时刻后才能提升 `timetable_date_verified`。特别列车以及纪念涂装不得凭列车号猜编组。
- 数据重建后若来源规范记录重新生成，可重跑幂等迁移（而不是新增补丁函数或随意扩充型号区间）。

## 依据
- JR 東日本官方列车番号（2611 平日上／下行）：
  https://timetables.jreast.co.jp/2611/timetable-v/240u1.html
  https://timetables.jreast.co.jp/2611/timetable-v/240d1.html
- JR 東日本官方列车番号（2611 土休日上／下行）：
  https://timetables.jreast.co.jp/2611/timetable-v/240u2.html
  https://timetables.jreast.co.jp/2611/timetable-v/240d2.html
- JR 東日本 E721 系： https://www.jreast.co.jp/train/local/e721.html
- 常磐线 701 系运营范围（2026-04-27 水戸支社公告）： https://www.jreast.co.jp/press/2026/mito/20260427_mt01.pdf


## 2026-11-07 后续：北段双车型候选与停站审计

从线上数据库核查，全部 100 条北段 `source_only` 记录按平日／土休日各 50 条，车次为 222M–273M 的 50 个具体号码（不含 224M、229M）。源数据是坂元～原ノ町 **7 站**的南侧片段；250M、255M、270M、271M 为坂元～新地 **2 站**片段。**这些不是仙台～原ノ町完整时刻表，不允许据此创建仙台区间虚构位置。** 实际对照 JR 官方的 222M、273M，已核查的片段停时一致（不代表全套逐站、逐日均已复核）。

**车型证据不能进一步做成逐车次单一型号。** JR 官方将 701系与 E721系列为常磐线运营车型；2025-03-19 的实际目击更证明两系列甚至可能组成同一列车，`701系 / E721系` 不等于某辆车只属于其中一系列。因此：不向只接受单一车型的 SQL 映射表写入这些 100 行，也不把某种车型 PNG 作为地图上的真实列车。仅在同时满足原始 SQL 候选、精确服务日/日历/番号/方向、部分停站路径、单段来源和未确认车辆身份时，向单一中性 SVG 标记附带 **两张候选图库素材元数据**；详情可列出两种可能，不绘制两辆车，也不宣称配属、编组或连挂车次。

候选资源复用已有 `JR東日本_701系_仙台地区.png` 与 `JR東日本_E721系_仙台地区.png`。原有 E531(南段)/E657(特急) 线路授权不变。其他路段、其他来源、不完整站序、车号缺号、月外日期均返回未解明。

参考：
- https://www.jreast.co.jp/train/local/701.html
- https://www.jreast.co.jp/train/local/e721.html
- https://timetables.jreast.co.jp/2611/train/045/047471.html （222M 2026-11 时刻）
- https://timetables.jreast.co.jp/2611/train/045/047461.html （273M）
- https://2nd-train.net/topics/article/63722/ （2025-03 701/E721 併結记录；不是 2026-11 分配证据）
