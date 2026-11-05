# 弥彦線（内部キー `Miyo`）2026-11 车型／列车番号／运营日期映射审计

## 来源与范围

JR 东日本的 2026 年 11 月（`2611`）时刻表，**内部线路为 `Miyo` 而非 `Yahiko`**；铁路标识为 `odpt.Railway:JR-East.Miyo`。此次复用已有的 `manual_timetable_templates` 94 条 SQL 原始行、统一 `train-runs`、`train-number-png-ranges.js` 和站位推算器。只关联官方公布的**列车番号**，不推断运行番号或具体编组，不新增 JS 加载脚本。

官方编号与日期：
- [弥彦线 下行（弥彦→吉田→东三条）平日](https://timetables.jreast.co.jp/2611/timetable-v/233d1.html)
- [弥彦线 下行 土休日](https://timetables.jreast.co.jp/2611/timetable-v/233d2.html)
- [弥彦线 上行（东三条→吉田→弥彦）平日](https://timetables.jreast.co.jp/2611/timetable-v/233u1.html)
- [弥彦线 上行 土休日](https://timetables.jreast.co.jp/2611/timetable-v/233u2.html)
- [JR 东日本官方 E129 系车型页面](https://www.jreast.co.jp/train/local/e129.html)
- [JR 东日本 2026 年秋季临时列车公告](https://www.jreast.co.jp/th/press/2026/autumnextratrain/index.html/)
- [JR 东日本 「もみじ海里」列车时刻](https://timetables.jreast.co.jp/2611/train/185/188931.html)

## 完整车型及日期

| 服务 | 官方列车番号 | 车型参考 PNG | 2026 年 11 月内可用日期 |
|---|---|---|---|
| 普通列车 | 220M～278M 内经 233u/d1/u/d2 核对的 40 个正常番号（平日每方向 20） | `JR東日本_E129系.png` | 正常平日／土休日（有日期变动时按下表处理） |
| 菊花祭增开普通车 | 9235M、9234M、9228M、9241M、9281M、9282M、9284M | `JR東日本_E129系.png` | **11/1、3、7、8、14、15、21、22、23** |
| 冬季土休日增开 | 8231M、8232M、8266M、8271M | `JR東日本_E129系.png` | 当月土休日和法定假日 |
| 快速「もみじ海里」 | **9278D**（上行）、**9279D、9179D**（下行跨区段番号） | `JR東日本_HB-E300系_海里.png` | **11/2、9、16、23** |
| 快速「弥彦 Shu＊Kura」 | **9222D、9225D** | 11 月**无任何车辆示意授权** | 官方 2611 表显示 **仅10月24日**；11月不能出现 |

上述「もみじ海里」为 **HB-E300 系海里** 车型族，而非普通 E129。虽然官方有 9278D/9279D/9179D 的号码和日期，**现有 94 条手工 SQL 并没有对应的三条完整逐站源表**，因此这三条在 `published_miyo_2611_number_roster` 中留下日期确切的 **`momiji_no_sql_source`** 证明，但绝不从其他列车时刻补出虚假的列车位置；待导入完整公开时刻后才能安全加入列车运行图。这并不代表该列车没有实际运行。

## 节庆区间替代：防止显示重复列车

2026 年 **11/1、3、7、8、14、15、21、22、23** 日，以下定期番号有部分区间停运或不同于原始全程时刻。服务器严格选用原始 SQL 所存且官方明确仍运行的那一段：

| 定期番号 | 处理 | 同日增开的替代编号 |
|---|---|---|
| 228M | 日常使用旧 SQL 全程 8 站记录；上述 9 天切换为 `source_occurrence=1` 的 **吉田→弥彦** 3 站记录；全程历史来源不再显示 | 9228M（东三条→吉田） |
| 234M | 上述 9 天仅保留 **吉田→弥彦** 3 站，剔除东三条→吉田的旧计划区段 | 9234M（东三条→吉田） |
| 235M | 上述 9 天仅保留 **吉田→东三条** 的后半段，剔除弥彦→吉田的旧计划区段 | 9235M（弥彦→吉田） |
| 241M | 同 235M，仅保留 **吉田→东三条** 区段 | 9241M（弥彦→吉田） |

不补写任何 JR 未发布的时刻，不把历史模板的站序变成“已经证明 2026-11 逐站钟点准确”。同时保留 `scheduledStopKeys` 进行最后一层车型授权，防止取消区段在站位推算后重新出现。

## 数据和仓库修改

- 新增 migration `supabase/migrations/20261106033000_miyo_2611_yahiko_exact_number_fleet_calendar.sql`，以 SQL 精确关联来源 ID；**94 条原始时刻表 + 6 条「もみじ海里」日历来源元数据 = 100 条映射记录**。其中包含 2 条仅在 10 月运行、不得用于 11 月的 Shu＊Kura 记录。
- `published_train_number_evidence` 为实际有来源的 2611 号码登记；`published_train_png_number_ranges` 新增 Miyo 2 条严格依赖精确源表的车型号段（E129 常规与 HB-E300 海里），**号段本身不构成 PNG 授权**。
- `supabase/functions/train-runs/index.ts` 查询 `published_miyo_2611_number_roster`，核验运营日期、日历、方向、车次、原始 8 站或短途区段、SQL 模板 ID，并在事件日裁剪受影响区间。没有 SQL 原始来源的海里并不凭空构造位置。
- `data/timetables/train-number-png-ranges.js` 的 `verifyMiyoService` 强制逐车号检查来源证明、服务日、站序和 E129 PNG；`js/train-position-estimator.js` 仅接纳 SQL 证明。旧普通列车不自动借用海里、Shu＊Kura 或其他线路的 PNG。
- `vehicle-garage-png-map.js` 已经有 `E129系` 对 `Miyo` 的受控图库关系，本次补充 `HB-E300系（海里）` → `Miyo`，不重新绘制图库或制作新脚本。
- 新增 `tests/miyo-2611-yahiko-e129-dated-number.test.cjs` 和 GitHub Actions，覆盖普通列车、11 月九天菊花季、季节性 8xxxM、假日区间截断及无来源的 D 特别车次。

## 未确认或不得外推

- 不确认 E129 或 HB-E300 的具体车组/编成番号，也不指认现场观察的确切车辆位置。
- JR 已刊行时刻表的临时加开/运休与未来改正要单独复核；此次仅处理 **2026-11**。
- 弥彦線共用吉田站，与越后线等同一**列车番号**不能简单当作整个线路的唯一个体运用编号；只有经过来源证明的铁路段可用现有 PNG。
- GitHub 工作流为直接提交 `main`，没有 Pull Request。
