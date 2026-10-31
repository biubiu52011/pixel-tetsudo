# 在来线计划审计：2026-10-31

## 核心边界
此项目的 Supabase 仅供读取 **Weekday** 与 **SaturdayHoliday** 出版式、重复运行的列车计划，不储存每天实际列车、实际编组、未经证实的计划车型。不能靠复制平日模板补休日，不能把样本视为整日覆盖。

## 所有在来线库存（本轮审计）
- 200 个在来线路线键，**每个**至少有平日和土休日两个来源日历。
- 平日 48,392 条来源模板；土休日 43,368 条；合计 91,760 条。
- 原审计状态：`unverified` 153 条、`sparse_review` 45 条、`sampled` 1 条、`direction_issue` 1 条。**这些是修订前的审计类别分布，并非已完成的准确率。**
- 有源修订日期的模板仅一部分；即使有两类日历，也无法推断官方时刻表完全匹配或适用于任意日期。
- 全库物理列车应按 `published_timetable_plan_unique_counts` 的 canonical 维度查询，不应跨线直接累加 source templates；否则包括千代田支线在内的共享计划会重复计数。

## 已核对的具体问题

### JR 东日本 鹤见线大川支线 TsurumiOkawa
- 原来 `LOW_TEMPLATE_COUNT_NEEDS_EXTERNAL_BASELINE` 将假定低运量误认作数据缺口。
- 对照 JR 东日本**2026 年 11 月版**官网时刻表：平日上下行 9 + 9 班，土休日上下行 3 + 3 班。这与数据库 24 条两站来源模板数量及大川站出发分钟相符。
- **不是每条线都有高密度休日列车**：这里不应生成额外的假列车。
- Audit 状态变更为 `calendar_review` 并记录 `JR_EAST_202611_OKAWA_BASELINE_9_PLUS_9_WEEKDAY_3_PLUS_3_HOLIDAY_MATCH`。仍保留修订有效期核查，**不将历史样本宣告为永久最新**。
- 官方参考：[大川平日](https://timetables.jreast.co.jp/2611/timetable/tt0311/0311010.html)、[大川休日](https://timetables.jreast.co.jp/2611/timetable/tt0311/0311011.html)、[鹤见线下行](https://timetables.jreast.co.jp/2611/timetable-v/661d2.html)、[上行](https://timetables.jreast.co.jp/2611/timetable-v/661u2.html)。
- JR 东日本官网页面明确告知未授权不得复印、转存和加工；本轮只是比较计数/少量时刻核对，**没有批量抓取并发布官方时刻表数据**。

### 东京 Metro 千代田线北绫濑支线 ChiyodaBranch
- 现有 238 条支线来源模板：Weekday 125、SaturdayHoliday 113。
- **238/238 均已映射到 Chiyoda 主线路由上的相同 canonical timetable ID**，因此不是额外的 238 班物理列车。**不要删除来源**：支线页面显示需要它们。
- 源文件只有往北绫濑方向的别名，Edge Function `train-runs` 从 Chiyoda 主线读取另一个方向，并投影到绫濑－北绫濑区间。
- Audit 由 `direction_issue` 调整为 `calendar_review`，明确别名和另一个方向的数据来源。年度修订仍未彻底验证。
- 官网页面：[东京 Metro 北绫濑站](https://www.tokyometro.jp/station/kita-ayase/timetable/index.html)。

### JR 东日本 川越线 Kawagoe
- Supabase 只有 **3 个平日样本 + 2 个土休日样本**；官方高丽川站和川越站当天时刻表明确还有很多班。
- **保留 `sampled` 和 `DO_NOT_TREAT_AS_COMPLETE`**；没有合法/完整数据来源时不得用当前两班休日列车冒充整日运营。
- 官网页面：[高丽川土休日](https://timetables.jreast.co.jp/2611/timetable/tt0711/0711011.html)、[川越土休日](https://timetables.jreast.co.jp/2611/timetable/tt0525/0525011.html)。

### JR 西日本 山阴本线 SaninMain 和山阳本线 SanyoMain
- 前者平日37、土休日16；后者平日40、土休日18。
- 各条主线跨多个长距离区间，旧数据包含不同的起终点。**不能单凭休日/平日数量比值推导具体缺了哪些车次，也不能以全线为单位直接复制**。
- 保留 `sparse_review`，增加 `MULTIPLE_LONG_DISTANCE_SECTIONS_REQUIRE_PER_CORRIDOR_BASELINE` 与修订版本待查提醒；后续按具体运营区间获取许可/来源、逐条判定运行日。
- 尚未导入任何额外车次。

## 已应用的数据库更正
迁移文件：[20261031221500_conventional_line_baseline_and_alias_audit.sql](../../supabase/migrations/20261031221500_conventional_line_baseline_and_alias_audit.sql)。

事务有保护性断言：大川 24 条、千代田支线 238 条与主线 canonical 匹配、川越5条、山阴53条、山阳58条。**只更新审计表状态和问题说明，不改动 train time、stops、车辆和 daily records。**

完成后验证：
- 全部 `published_timetable_plan_trains` = 92,586，`published_timetable_plan_stops` = 1,135,945。
- 按日旧 `train_runs` = 0；非法日历 = 0；未关联模板 = 0；所有审计计数偏差 = 0。
- `anon` 能读取覆盖视图的三个重点线路。
- `published_timetable_plan_unique_counts` 的全局去重结果：Weekday **48,356** unique canonical trains（来源 49,056）、SaturdayHoliday **42,809**（来源 43,530）。该视图包括新干线；不要混同于上述在来线 48,392/43,368 源模板数量。

## 下一轮优先工作
1. **川越线**：先取得允许再利用的2026官方/ODPT完整时刻来源，再导入真实双日历的所有站点车次。
2. **长距离山阴与山阳本线**：先拆到管理者和区间进行覆盖盘点，再逐区间核实。
3. **153 条 unverified 在来线**：以可信公开发行版号、改正日期、官方统计与不同车次的停站证据逐线审查，不准靠模板非空判定完成。
4. **自动化的来源版本检查**：当线路官宣改正时，只将经版本核对的新计划视为正式；保持已有标记但不要静默复写老来源。
