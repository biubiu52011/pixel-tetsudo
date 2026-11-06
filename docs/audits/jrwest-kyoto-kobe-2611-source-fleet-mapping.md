# 東海道本線（JR京都線・JR神戸線）JR西日本 2611 编号与车型映射审计

## 1. 范围先分清

| 用户线路 | JR 西日本营业线路 | 项目原始数据 key | 实际数据范围 |
| --- | --- | --- | --- |
| JR 京都線 | 京都—大阪 | `TokaidoKansai` | 京都—大阪，同时记录贯通神户方向的部分运行 |
| JR 神戸線 | 大阪—姫路 | `TokaidoKansai` + `SanyoMain` | 前者到神戸附近，后者由兵庫、明石到姫路，部分历史样本延长网干 |

**不能使用** `Tokaido` / `TokaidoMain`（这是 JR 東日本湘南方向的不同铁路）；也不得将山阳本线广岛、下关区间的 `SanyoMain` 行默认为京都／神户线。实际两端范围见 JR 西日本[运行信息区间说明](https://trafficinfo.westjr.co.jp/static-pages/readme.html)。

## 2. 公共编号 vs 内部复合 ID

历史 SQL 导入的编号类似：
- `500300-1871500-107C`：内部复合来源 ID，末尾 `107C` 为来源中载有的历史运行番号片段，不能自动宣称是 2026 年 11 月当日的官方车次；
- `500310-1384900-3478M`：同理，不能因 `M` 直接认定特定 223/225 编组；
- `710100-4338200-845T`：兵庫—姫路方向的 `SanyoMain` 来源段，**绝不可**据此拼接没有关联证据的大阪—兵庫同一实体列车。

京阪神 `C` 表示缓行普通车群、`T` 是快速车次群、`M` 在此导入数据被标为 Rapid（可含新快速工作），但实际运营车型仍应根据车辆工作证据而非后缀确定。特殊 `3429A` 和 8 条特急 D/M 历史源**暂不选定车型**。

## 3. 官方车型背景

- JR 西日本[2020 年增加 225系、223系改造](https://www.westjr.co.jp/press/article/2020/02/page_15645.html)：JR 京都／神户线新快速、快速 223/225；221 系逐步转走。
- JR 官方销售资料[2024 年 3 月 221系退出京都／神户线运行](https://dwmall.westjr.co.jp/shop/g/gJT00774)：因此不能将老时刻的快速行程映射为 2026 年 11 月 221。
- JR 西日本[普通列车车辆目录](https://www.westjr.co.jp/fan/paper/local/)：京阪神普通 321 系。
- JR 西日本传媒[2025 年车载媒体运用线路资料](https://www.jcomm.co.jp/assets/pdf/transit/price/media_guide/2025/mg_77-82_2025.pdf)：321 系在京都/神户线，223/225系亦在两线运行；既有项目主要车型表记录 207 系也覆盖本区段。

以上都是**线路车型（fleet）证据**，不是已发布的 2611 编组轮班表。更不能将 `C/T/M` 视为 207/321/223/225 的车辆编号。

## 4. 数据库实际映射

原始 `manual_timetable_templates`：`TokaidoKansai` 46 行、`SanyoMain` 全线 58 行；两者都为历史来源，`source_revision_date` 为空；在 canonical 表中属于 `source_only` + `undated_not_current_verified`。**来源不具备 2026 年 11 月全量时刻核验**。

本次新表 `published_jrwest_kyoto_kobe_2611_source_fleet` **58 行**，来源 ID 唯一：
- `TokaidoKansai` 38：普通 `C` 15 / `T/M` 快速 23；
- `SanyoMain` 兵庫・明石起始的神户侧源 20：普通 `C` 11 / `T/M` 快速 9；
- 总计 `207系 / 321系` 普通 26，`223系 / 225系` 快速 32。

保留原始 `source_train_id`，`source_public_number_suffix` 只作为未验证历史后缀；为每条候选登记方向、历法、列车种别、真实来源站序和参考车型。数据库以 `number_date_verified=false`、`authorizes_png=false`、`actual_vehicle_confirmed=false` 约束任何歧义升级为实车。保留未指明车型的 8 条特急源和 1 条 `A` 后缀；`SanyoMain` 山阳本线非神户段完整保留，不强行套用本规则。

**PNG**：本项目现存 `207系_NK`、`207系_Y2`、`321系` 图库路径只授权 `TokaidoKansai` 的普通车候选元数据，且不能借此确认 NK/Y2 实际编号。223/225 现有 PNG 仅在图库里允许 `Hanwa` 等车型区域，**没有本线官方涂装可授权路径**；因此 32 条快速和神户侧 `SanyoMain` 候选保持空素材，而不是错用阪和线图像。所有匹配行统一只绘制**一个中性的 SVG 列车标记**（`kind:candidate`）。

## 5. 运行时代码与限制

- 复用原有 Edge `train-runs/index.ts` 和 `train-number-png-ranges.js`，通过 `source_template_id`、完整来源 ID、后缀与奇偶方向、历法、铁路 URN、完整站序联动。
- 站位推算器只附带`UNCONFIRMED_FLEET`候选数据；不会构造缺失的官方车次，不会自动拼接琵琶湖线或山阳本线跨线服务。
- 相同后缀 845T 在不同日历下可能对应不同来源时刻，不能简单当作同一实体车。
- 如获官方 2026-11 逐车次时刻、实车编组／运用证据、**本区段正确版本的 223/225 PNG**，可以逐条提升对应模型与素材权限；无证据时保持中性显示。

回归：`tests/jrwest-kyoto-kobe-2611-source-fleet.test.cjs`，覆盖线路隔离、历史号段、7/11/18/33 站顺序、节假日、两组车族、错误涂装阻断和真实车辆未确认规则。
