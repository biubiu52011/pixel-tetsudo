# 水戸線（Mito）2026 年 11 月车辆／列车番号／日期限定映射

## 结论

- 线路键 **`Mito`**；铁路 URN **`odpt.Railway:JR-East.Mito`**。
- 2026 年 11 月正式普通列车：**上行 32 个 M 列车番号，下行 30 个 M 列车番号**，平日与土休日相同，共 **62 个不同普通车番号 × 2 类日历 = 124 条数据库号码证据**。
- 全部定期普通列车采用 **E531 系 5 辆编组**车型族示意，借用图库原有 **`../images/列车/JR東日本/JR東日本_E531系_水戸線.png`**。图像并非实际车组、0/3000 番台或赤电色逐车次确认。
- 原 `Mito` SQL 的 `E501系 / E531系` 为历史混合标签。**JR 东日本于 2019 年 3 月将当时的水戸線正规运营统一为 E531 系**；不过 [2026 年 7 月的车辆爱好者报告](https://4gousya.net/forums/post/11587)提到此前曾有 E501 系进入水戸線、6 月下旬起再度停止。因此不能把 **2019 年公告**理解成此后永不出现 E501 的绝对保证，也不能凭历史混合标签把 2026-11 任一列车号认定为 E501。当前采用 E531 系作为**定期列车车型族示意**，不是每趟实车证明。原 SQL 模板不修改；服务端与前端严格按官方番号及服务日期证明显示。
- **不创建 PR**；修改直接提交 `main`，复用统一 `train-runs` / `train-number-png-ranges.js` / `train-position-estimator.js`。

## 官方依据

1. [JR 东日本 2611 水戸線 上行平日](https://timetables.jreast.co.jp/2611/timetable-v/246u1.html)；
   [上行土休日](https://timetables.jreast.co.jp/2611/timetable-v/246u2.html)。
2. [JR 东日本 2611 水戸線 下行平日](https://timetables.jreast.co.jp/2611/timetable-v/246d1.html)；
   [下行土休日](https://timetables.jreast.co.jp/2611/timetable-v/246d2.html)。
3. [JR 东日本水戸支社 2018-12-14 改正公告](https://www.jreast.co.jp/mito/press/181214/press_01m.pdf)，自 2019-03-16 起水戸線统一 E531 系 5 両。
4. [JRE 媒体：E501 系已退出水戸線](https://media.jreast.co.jp/articles/2335)。
5. [2026-07-04 车辆爱好者论坛：E501 曾短暂进入水戸線并在 6 月下旬停止](https://4gousya.net/forums/post/11587)（非 JR 官方公告，不能据此推定逐车次车型）。

## 2611 正规番号

| 方向 | 个数 | 官方公开号码 |
|---|---:|---|
| 上行（Inbound，偶数） | 32 | 1720M、722M、1724M、726M、2728M、730M、1732M、2734M、736M、1738M、740M、1742M、744M、746M、748M、750M、752M、754M、756M、758M、760M、762M、764M、766M、2768M、1770M、772M、1774M、776M、778M、1780M、782M |
| 下行（Outbound，奇数） | 30 | 721M、723M、725M、2729M、731M、1733M、735M、737M、1739M、741M、743M、745M、747M、749M、751M、753M、755M、757M、759M、761M、763M、765M、1767M、769M、771M、1773M、775M、1777M、779M、1781M |

**不能按数字区间直接匹配！** 721–2785 仅用于粗边界；必须先在服务日期的 SQL 精确番号 roster 中找到匹配铁路、方向、日期、车型与时刻表来源才能授权 PNG。

## 旧版 SQL 的重复时刻处理

原始 `manual_timetable_templates` 共 134 条（平日 64、土休日 70）。其中有 **62 × 2 = 124** 条基准普通车时刻表；另有 7 条同一番号的时变来源行和 3 条未授权的特殊来源行。

| 号码 | 日期／范围 | 使用的 SQL 来源策略 |
|---|---|---|
| **756M** | 11 月 23 日 | 土休日 `source_occurrence=1` 的时变记录（历史来源模板 6717）；其余日选择 0 |
| **763M** | 11 月 1、8 日 | 土休日 `source_occurrence=2`（模板 6651）；其余不在该表的日期不借此记录 |
| **763M** | 11 月 21、28、29 日 | 土休日 `source_occurrence=3`（模板 6652） |
| **763M** | 其余 11 月日期 | 基准来源 `source_occurrence=0`；10 月 31 日专属变化不沿用 |
| **725M** | 10 月 25 日／次年 1 月 31 日的时变 | 11 月无需使用这些时变记录，选择基准 |
| **772M** | 历史平日第二条时变 | 未获得 2026 年 11 月运行日证明，11 月选基准 |
| **9074M／9075M** | 10 月 31 日的特急「常磐日光号」 | **2026 年 11 月一律排除**；不能标注为 E531 普通列车 |
| **9785M** | 历史 SQL 有记录，2611 官方 11 月普通列车目录无运行依据 | **不授权 PNG、不给计划铁路位置** |

这些不是同一时刻出现的重复车辆或“运用番号”；它们是同一 **列车番号** 在不同日期及站内时刻下的候选时刻表版本。服务端依 `date_variant_template_ids` 只选择一天一个 `source_template_id`，不额外生成列车。

## 代码与数据改动

- 新增 migration `supabase/migrations/20261106015500_mito_2611_e531_exact_number_calendar.sql`，只写入经过目录核对的 62 × 2 号码、出典、时间变体与示意图证明，保留历史手工 SQL 行。
- 新增 `published_mito_2611_number_roster`（124 行）、现有 `published_train_number_evidence`（水戸線 124 行）、`published_train_png_number_ranges`（水戸線 1 行，`requires_exact_roster=true`）。
- `train-runs` 2026-11 水戸線运行过滤：准确检查实际原始 `source_template_id`、服务日、铁路、日历、方向、列车种类、线路 16 个站名合法性；排除所有重复时刻模板和非 November 编号；仅在验证成功时给出 `published_number_fleet_reference`。
- `train-number-png-ranges.js` 的 `verifyMitoService` 以及 `train-position-estimator.js` 的 `officialMitoPlan` 都要求上述 SQL 证明，不接纳普通实时／其他线路／只有数字的输入。
- 复用 `JR東日本_E531系_水戸線.png`，在共享 `vehicle-garage-png-map.js` 中将该图库资产限定为 **`Mito` 计划车型示意**。不改成逐车次的赤电／3000 番台。
- 新增 `tests/mito-2611-exact-number-e531.test.cjs` 并加入 `Verify train PNG contracts` 自动化测试。

## 证明范围和限制

**已确认**：官方 2611 号码、普通车日期类别、例外日期、线路车型族 E531、是否可以选择图库示意 PNG。

**未确认**：每辆车实际编组、具体车次的 E531 子番台、赤电涂装、2026 年临时 E501 改派或返回、实时位置及所有历史 SQL 的逐站到发钟点。旧手工时刻表不被本次车型任务伪称为正式核验过的当月时刻；列车位置如果可显示，仍标记为计划估算。若官方公布停运、临时变更，需另由对应运休规则覆盖。
