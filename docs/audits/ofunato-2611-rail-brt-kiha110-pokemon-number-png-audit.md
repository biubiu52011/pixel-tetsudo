# 大船渡線（Ofunato）2026 年 11 月铁路／BRT 分离与车型 PNG 映射

## 判断结果

JR 东日本 2026 年 11 月 **269u1/u2/d1/d2** 官方页面合并列出两种性质完全不同的交通工具：

- **一ノ関 ～ 気仙沼：大船渡線铁路**，定期普通车使用 **キハ110系**。2025 年起已经从原先的キハ100系换型；将「定期キハ110」与「特殊キハ100」区分。
- **気仙沼 ～ 盛：大船渡線 BRT**，列车番号表使用 **`F` 结尾**（另有 `1918K`）。这是巴士，不应视为轨道车辆，更不能分配铁路 PNG。
- **快速「ポケモントレイン気仙沼号」**：下行 **8327D**、上行 **8336D**，2026 年 11 月的周末和假日运行，实际为特殊改造的 **キハ100系 2 辆（POKÉMON with YOU）**。本项目图片库里没有对应的 JR 东日本宝可梦涂装 PNG，**仅保留车号、日期和铁路位置计划，不拿普通キハ110图片冒用**。
- 官方同月时刻表中的「ひなび 気仙沼」**9327D / 9336D** 只在 **2027 年 2 月 27～28 日**运行，2026 年 11 月不准生成运行车辆或 PNG。

## 官方来源

1. [JR 东日本 2611 大船渡線・BRT 下行平日](https://timetables.jreast.co.jp/2611/timetable-v/269d1.html)
2. [JR 东日本 2611 大船渡線・BRT 下行土休日](https://timetables.jreast.co.jp/2611/timetable-v/269d2.html)
3. [JR 东日本 2611 大船渡線・BRT 上行平日](https://timetables.jreast.co.jp/2611/timetable-v/269u1.html)
4. [JR 东日本 2611 大船渡線・BRT 上行土休日](https://timetables.jreast.co.jp/2611/timetable-v/269u2.html)
5. [JR 东日本「大船渡線开业 100 周年」：定期车已经统一キハ110](https://media.jreast.co.jp/articles/4399)
6. [官方快速 8327D 一ノ関→気仙沼停站、车型名称和运行日](https://timetables.jreast.co.jp/2611/train/075/076751.html)
7. [官方快速 8336D 気仙沼→一ノ関停站、运行日](https://timetables.jreast.co.jp/2611/train/055/055491.html)
8. [JR 东日本 2026 年夏季临时列车资料：宝可梦列车使用キハ100系 2 辆](https://www.jreast.co.jp/railway/extratrain/2026/summer_list.pdf)
9. [JR 东日本大船渡線 BRT 运行情报](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=ofunatoline_brt)（2026-11-08 地方活动临时 BRT 停站变更；11-09 ～ 29 专用道路维修及绕行，均不得作用于铁路列车 PNG）。

## SQL 原表的 159 条记录如何分类

| 日历 | 方向 | 定期铁路 `D` | 特殊铁路 `D` | BRT `F/K` |
|---|---|---:|---:|---:|
| 平日 | 上行 | 9 | 0 | 33 |
| 平日 | 下行 | 8 | 0 | 33 |
| 土休日 | 上行 | 9 | 1（8336D） | 27 |
| 土休日 | 下行 | 8 | 1（8327D） | 30 |
| **总计** | | **34** | **2** | **123** |

这 **159 条是两种日历的所有旧 SQL 模板**，并不代表单日运行 159 辆铁路车辆。**实际定期铁路列车番号为 17 个**：偶数（上行）9 个，奇数（下行）8 个；每个日历各有一份，不相互重复。

### 正规列车号与允许的参考 PNG

- **上行（偶数）**：`322D`、`324D`、`326D`、`328D`、`330D`、`332D`、`334D`、`338D`、`340D`。
- **下行（奇数）**：`321D`、`323D`、`325D`、`329D`、`331D`、`333D`、`335D`、`337D`。
- 车型族为 **`キハ110系`**；严格使用仓库现成 `../images/列车/JR東日本/JR東日本_キハ110系（大船渡線）.png`。已将这张图库原本的未审核库存项目，登记为仅限 `Ofunato` 的 **planned/reference** 项目，非确切车组。
- **322D 的始发站是千厩，不是气仙沼**：旧 SQL 有正确 **9 站**来源，不能将它硬扩充成 14 站全程或反向显示。其他定期铁路车次均为 14 站。
- 官方列车号和 2026-11 日历被核实，但历史 SQL 的全部到发分秒值仍标记为 `historical_not_2611_verified`，不能表示为官方逐站时刻完成核验。

### 宝可梦列车的实际运营日期（2026 年 11 月）

**11 月 1、3、7、8、14、15、21、22、23、28、29 日**。官方车次为 `8327D`（11:00 一ノ関出发）及 `8336D`（14:50 気仙沼出发），两者均为 **快速** 而非旧手工 SQL 所写的普通列车。站序分别：

- 下行：**一ノ関 → 陸中松川 → 猊鼻渓 → 千厩 → 気仙沼**（5 站）。
- 上行：以上 5 站反向。

2026 年 11 月的平日（11 月 3、23 日除外）及其他非官方运营日期不生成 8327D／8336D 位置。图片引用必须 `NULL`，避免把 `キハ110系（大船渡線）.png` 用到キハ100专用涂装车。

## 写入的数据与代码

1. 新 migration：`supabase/migrations/20261106041500_ofunato_2611_rail_brt_pokemon_vehicle_roster.sql`。新表 `published_ofunato_2611_number_roster` **159 行**：`rail_regular=34`、`rail_pokemon=2`、`brt_only=123`；严格检查 SQL 来源 template ID、calendar、suffix、车型和 PNG。源表未删除或更新，BRT 数据仍可供独立巴士查询。
2. 既存 `published_train_number_evidence` 增加 **36 条**有原始铁路来源的编号与日历证据。既存 `published_train_png_number_ranges` 增加 `Ofunato` **1 条** `321..340D`、`requires_exact_roster=true` 的粗范围，绝不能单凭数字区间授权图片。
3. `supabase/functions/train-runs/index.ts`：服务端按日期与原始 `source_template_id` 对应 159 条来源；**剔除 123 条 BRT**，对铁路严格校验站序；仅真正运行的 8327D／8336D 显示 Rapid、宝可梦列车名、KiHa100 候选且无图；regular train 使用明确证据的 KiHa110 车型族。
4. `data/timetables/train-number-png-ranges.js`：新增 `verifyOfunatoService`，逐车号/运营日/方向/站序/日历校验；`match` 只对 17 个定期 D 号提供 KiHa110 PNG。宝可梦即便有效也没有车辆 PNG，其他铁路、BRT 和未证实的 `9327D`/`9336D` 均拒绝。
5. `js/train-position-estimator.js`：新增 `officialOfunatoPlan` 来源关卡；维持计划位置与真实车辆身份的区别；宝可梦因无原始 PNG 不得获得普通列车假图。
6. `data/timetables/vehicle-garage-png-map.js`：仅将已存在的专用キハ110图片准入 `Ofunato` 车型族，图片总量不变。
7. 新增 `tests/ofunato-2611-rail-brt-pokemon-number-png.test.cjs`、加入 `Verify train PNG contracts` 流程，测试 17 普通番号、322D、11 宝可梦运营日、BRT F/K、2027-02 ひなび、反例与权限边界。
8. 刷新 `pages/trains.html` 对上述三个共享 JS 文件的缓存版本号。**直接 commit 到 `main`，不创建 PR**。

## 无法证明的事情

车次 **321D/322D** 等不是物理编组或车号；本次只证明公开日历上的列车番号和车系计划参考图，不能由号码推断具体某台キハ110、实车编成、车辆所在地点或实际发车状态。因缺少真正的宝可梦 PNG，列车的计划铁路位置可以存在，但其专用车辆图片不能凭空生成。BRT 为另一交通系统，11 月临时绕行应由独立 BRT 时刻表实现，不应混进列车地图。
