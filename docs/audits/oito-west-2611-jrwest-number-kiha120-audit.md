# 大糸線 JR 西日本区间：独立 OitoWest 与 2026-11 列车番号／车型 PNG 审计

## 任务范围

仅 **JR 西日本** 南小谷—糸魚川非电化区间。**JR 东日本** 松本—南小谷原有 `Oito`、141 条已核验旧 SQL、E127/211/E353/HB-E300 车辆映射保留，不修改其列车番号；站点拓扑仅纠正此前错误纳入 JR 西区间的旧站点。GitHub 直接在 `main` 提交，不使用 PR。

**证据**（列车番号、运行例外与车系）：

- [JR 西日本大糸線・糸魚川→南小谷时刻表（2846）](https://timetable.jr-odekake.net/line-timetable/2846)
- [JR 西日本大糸線・南小谷→糸魚川时刻表（2845）](https://timetable.jr-odekake.net/line-timetable/2845)
- [JR 东日本 2611 大糸線上行公告（230u1/u2）](https://timetables.jreast.co.jp/2611/timetable-v/230u2.html)
- [JR 东日本 2611 大糸線下行公告（230d1/d2）](https://timetables.jreast.co.jp/2611/timetable-v/230d2.html)
- [小谷村・大糸線信息及キハ120型列车](https://info-otari.jp/oito_line/)
- [railf.jp：大糸線キハ120形300番台及冈山色涂装](https://railf.jp/news/2010/03/14/024800.html)

## 运营商拆分

| 属性 | JR 东日本 | JR 西日本 |
|---|---|---|
| 线路 ID | `Oito` | `OitoWest` |
| `railway_lines.timetable_operator` | `JR-East` | `JR-West` |
| 原始来源铁路 URN | `odpt.Railway:JR-East.Oito` | `odpt.Railway:JR-West.Oito` |
| 区间 | 松本—南小谷 | 南小谷—糸魚川 |
| 车系 | 211、E127、E353、HB-E300 等 | **キハ120形300番台（大糸線・岡山色）** |
| SQL 历史模板 | **141 条**，全部原封未动 | **40 条**：28 柴油车 + 12 旧巴士 |
| PNG | 原有东段规则 | 没有对应的正确涂装 PNG，绝不借用其他色彩 |

新增独立西段线路 **9 站**：**南小谷 → 中土 → 北小谷 → 平岩 → 小滝 → 根知 → 頸城大野 → 姫川 → 糸魚川**。西段具备车站名称 ja/zh/en/ko、经纬度、正向站序、运营商分类 `JR_WEST`，在南小谷与 JR 东日本东段换乘，在糸魚川与北陆新干线连接。

旧 `Oito` 线路曾错误混入 `Otariguchi`、`Kita-Otari`、`Naka-Otsari`；现在 East 站序仅至南小谷，西段统一官方站名 **中土 Nakatsuchi**，不再把历史拼写错误的 `Naka-Otsari` 作为真实车站。

## 2026 年 11 月 JR 西日本官方番号

| 方向 | 官方列车番号 | 本月共计 |
|---|---|---:|
| 上行・糸魚川→南小谷 | **420D、422D、424D、426D、428D、430D、432D、434D、436D、438D** | **10** |
| 下行・南小谷→糸魚川 | **421D、423D、425D、427D、429D、431D、433D、435D、437D** | **9** |

11 月 8 日因为行事调整，**429D、430D 停运**；其他日期不能据此全线停运。历史 `7901`—`7906` 是 **10 月 31 日以前的代行巴士**，不能以铁路列车番号进入 11 月车位图或申请キハ120 PNG。

数据库旧资料只有 **14 个列车番号**，各平日与土休日一份，合计 28 条；但全部都**只有南小谷—中土—北小谷三站**时刻，缺少北小谷—糸魚川六个站的正式分钟级来源。缺少的 5 个官方车次是：

- 上行 **420D、424D、436D**。
- 下行 **421D、435D**。

旧 SQL 绝不能凭推算把北小谷终到当成糸魚川终到，更不能把 3 站历史钟点表示成已经校准的 JR 西日本 2026-11 全区间时刻。新表将每个车次、日历都登记，包括未能关联来源的官方号码，这些不能从凭空捏造的 SQL 产生列车位置。

## 数据库迁移

已成功应用 `supabase/migrations/20261106083000_oito_west_2611_company_split_kiha120_exact_roster.sql`：

1. `railway_lines` 新增 `OitoWest`（JR-West，非 ODPT 实时，SQL 时刻表推定支持）。
2. 严格限定迁移条件，仅把 28 `4xxD` 历史模板与 12 `790x` 代行巴士模板的 `line_key`、`railway_urn`、`train_type_urn`、站点与目的地 URN 修正到 JR-West；恢复原本错误的「JR-East」归属，不改数据库现存的 East 141 条。
3. 创建开启 RLS 的 `published_oito_west_2611_number_roster`，**38 条**车次×日历证明：**28 条绑定真实来源模板 ID/三站，10 条无来源**；所有车辆图片字段 `NULL`。
4. `published_train_number_evidence` 新增 28 条源模板有据的番号/日历证明，拒绝把未有 SQL 的 10 条编号编造为车次位置。
5. 429D、430D 附带日期范围内的 11 月 8 日排除规则；790x 巴士仍保存于独立西段历史资料，但不作为 11 月铁路车辆显示。

### 数据结构与来源边界

新表使用 `source_scope`：
- `historical_three_station_partial`：3 站原始来源 + 车次，有资格保留**局部计划位置**，但不是完整糸魚川全线运行。
- `official_number_no_sql_stops`：仅官方番号证据，没有足够源时间数据，不制造位置。
- `png_reference=NULL`：知道运营车系并**不意味着图库已有正确车辆图片**。
- `clock_source_status=historical_partial_not_2611_verified`：不得声称站时刻是 2026-11 分秒精确的官方已核对数据。

## 图库素材审计

已读取现成的 `JR西日本_120系_中国地区_CHA.png`（实际是绿色／蓝色前脸），以及 `JR西日本_120系_関西地区_KAN.png`（其他地区的涂装）。它们**都不是大糸線实际使用的银白底橙红色带キハ120-300**，不可做假图。

因此车辆候选保留 **`キハ120形300番台（大糸線・岡山色）`**，但列车 PNG 保持空缺，并且 `vehicleIdentityStatus` 不上升为 `EXACT`，不推定物理车组。新增既有 `data/core/major-vehicle-fleet-presets.js` 的 **JR-West OitoWest 车型族候选**，只解决全网「公司-线路-车系」归属，不由车型族自发获得 PNG。

## 已连接既有运行图模块

- `data/core/railway_data.json` 是可读源；同步生成 `railway_data.compact.json`、`railway-data.file.js`，以及 `station_i18n.json` 的两份打包文件；**没有新加载脚本**。
- `supabase/functions/train-runs/index.ts` 对 JR-West `OitoWest` 的 `4xxD` 逐车号、日期、公司、原来源 ID、三站顺序做可失败的验证；拒绝 `790x` 巴士；只保留来源合法的局部位置计划。对应部署为 **train-runs v310 ACTIVE**。
- `data/timetables/train-number-png-ranges.js` 新增 `verifyOitoWestService`；对该线路的任何号码请求一律不给未经图库证实的 PNG。
- `js/train-position-estimator.js` 保留公式和其他公司的原有脚本，仅新增 JR-West 4xxD 的 SQL 证据关卡、无 PNG 的中性列车位置处理；运行图记录的车系不是实车身份。
- `data/core/db-loader.js` 中铁路/站名数据使用既有缓存版本 hash，避免更新后仍在浏览器载入旧 237 线结构；现有七个页面的 script hash 跟随同步。
- `tests/oito-west-2611-company-kiha120-number.test.cjs` 验证 9 个站、东/西运营商拆分、14 个有源番号、5 个无源番号、11/8 停运、巴士及错误 PNG 拒绝。加入已有 `Verify train PNG contracts` CI，仍直接提交 `main`，不创建 PR。

## 已知未完成：必须保留的事实边界

1. **完整的糸魚川↔南小谷九站逐站时刻没有导入**，此版本仅保留可信的局部历史 SQL；不代表完成全线实时列车定位。
2. **缺少 5 个车次的原始站点时间源**，已登记官方番号但不能生成不真实的车位。
3. **缺少正确涂装的キハ120形300番台 PNG**，不会用不相符的绿色或紫色 JR 西日本 120 系替代。
4. 不已知具体实车编组与现场运营状况，不把列车番号误认为车组番号或实时 GPS。
