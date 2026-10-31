# 大阪环状线、大阪东线列车计划源记录调查（2026-10-31）

## 目标和边界
「像素铁道」Supabase 只保存 `odpt.Calendar:Weekday` / `odpt.Calendar:SaturdayHoliday` 两类**出版物式列车运营计划**，不追踪某日实际车次、实际车辆编组。此次是**诊断与审计修正**，不是未授权的大批量复制官方时刻数据。

## Supabase 实际调查（生产库）
| 线路 | 平日全部模板 | 土休日全部模板 | 平日单站片段 | 土休日单站片段 |
|---|---:|---:|---:|---:|
| OsakaLoop | 525 | 532 | 98 | 105 |
| OsakaHigashi | 189 | 190 | 46 | 48 |
| 合计 | 714 | 722 | **144** | **153** |

这 297 条单站片段全部标为 `Inbound`，但**不能仅因字段 Inbound 就推定实际终点**：

- OsakaLoop：大阪站 108 条（全是 departure_clock，非“终到到达”），天王寺站 95 条（arrival_clock 和 departure_clock 都存在）。这些属于**单一车站时间片段**，不等于已录入整个行程。
- OsakaHigashi：新大阪站 94 条（全有 arrival_clock，其中 62 条同时有 departure_clock）；同一线路**还存在大量久宝寺⇄大阪地下站的完整多站行程**，并非整个方向完全未收录。
- 当前 297 条单站片段各自属于 `source_only` 的 Canonical 成员，没有与其他来源共享同一 Canonical 行程。
- 按相同线路、calendar、方向、站点和 arrival/departure 时刻与其他**多站来源**匹配，可找到 OsakaHigashi **25 条**、OsakaLoop **2 条**候选；这 27 对的**列车编号不同**，不能据此自动判定为同车，不可直接合并。
- 两条线路全部 1,436 条模板的 `source_revision_date` 都为空；它们不能被宣称为 2026 年已验证完整日程。

### 具体例子
- OsakaHigashi 平日 `1002M`：新大阪 07:42 到、07:46 发，来源只有新大阪这一个站。
- OsakaHigashi 土休日 `1002MH`：新大阪 07:38 到、07:39 发，亦为一站。
- OsakaLoop 土休日 `3304KH`：数据库只有大阪站 07:40 的 departure_clock。
- JR 西日本官方内回区间时刻表出现 `3304K`，而非上述 `3304KH`，说明至少有旧来源将日历后缀混入车次的疑点，不能简单当作官方车次编号。

## 扩大调查：JR 西日本车次编号可能被附加“休日 H”
对 JR-West 来源的 `SaturdayHoliday` 模板筛选尾字母 `H`：
- **2,085** 条尾部为 H（涉及 18 条线路）；
- 其中 **1,548** 条去掉最后一个 H 后与同线路平日车次号相同；
- OsakaLoop 532 条、OsakaHigashi 190 条土休日车次号**全部以 H 结尾**；
- 但实际列车编号也可能依法/惯例以 H 结尾（例如其他班次号），因此这是**需要逐种规则核验的来源编码问题**，**不能全库 `trim(H)`**。

## 官方资料交叉核对
- [JR 西日本大阪环状线内回区间时刻表（2026-10-04）](https://timetable.jr-odekake.net/line-timetable/2861?arv_node=&day=4&dep_node=&hour=&index=&min=&month=10&year=2026)：列出列车号、全环线路车站、方向，并有 `3304K` 等列车号。
- [JR 西日本新大阪站大阪东线往大阪地下站方向时刻表（2026-10-31）](https://timetable.jr-odekake.net/station-timetable/2815073002)：新大阪⇢大阪为正常运营方向，不能把新大阪单站行当作完整“已到终点”车次。
- [JR 西日本 2023-03-18 大阪地下站开业资料](https://www.westjr.co.jp/railroad/project/project2/)；该站与大阪东线当前线路网络关联。
- [JR 西日本官方时刻表](https://timetable.jr-odekake.net/cgi-bin/mydia_sp.cgi?EID=0612102&EN=JR%EF%BF%BDW%EF%BF%BDH&FN=0&MD=3) 指出数据基于交通新闻社时刻表，明确禁止未授权转载、复制或加工。**此调查仅用于错误诊断；批量入库须获取许可或采用合法可重用的数据源。**

## 资料可复现性问题
数据库 `source_path` 指向 `data/timetables/OsakaLoop-manual.js` 与 `data/timetables/OsakaHigashi-manual.js`；在 GitHub `main` 通过精确路径读取均返回 404。故暂时**无法从仓库重新生成这些原始源行程**，不能擅自用公开网站抓取取代原始受许可资料。

## 本次已实际完成
- Supabase 线路审计 `published_timetable_coverage_audit.issues` 新增精确标记：297 单站源片段、25 个跨编号时刻候选、2026 版本缺失、土休日 H 后缀风险。
- `coverage_status` 仍为 `unverified`；`train-runs` 现有 v271 的「至少2个有时刻停站」逻辑会排除不能完整显示的单站行程。
- 没有删除、复制或合并列车记录；原始 92,586 模板、1,135,945 停站保留，`train_runs` 按具体日期记录数为零。
- [可复现审计迁移](../../supabase/migrations/20261031224000_osaka_loop_higashi_source_investigation.sql)。

## 后续解决路线
1. 找回原始人工导入源（若无法找回，先解决数据来源合法复用许可），对照现有 2026 JR 西日本列车时刻；
2. 分车次核对 `Inbound` 与实际内/外回方向、起终点，尤其新大阪的单站到/发与已经到大阪的行程之间的关系；
3. 对“相同分钟但不同列车号”的 27 对，验证是否真实同车或编号变化；证明前不自动合并；
4. 对 JR-West 18 条受尾部 H 影响的线路，分种别和来源逐条核对车次编号；使用 Weekday/SaturdayHoliday 字段而非拼接假号作为日历区分；
5. 取得合法、可版本化的平日/休日完整车次时刻后，再修正停站链、Canonical 归属与审计。不可把单站出发时刻插值得到全线路停站，更不可生成每日实际编组。

---

## 2026-10-31 处理结果：39 个已核实号码与实际读取隔离

已经执行下面两项**实际修复**：

**1. 39 个大阪环状线土休日车次的列车编号纠正**

2026 年 JR 西日本内回区间出版资料及逐车次资料证实 3304K、3306K、3310K 至 3398K 中数据库保存的一组 39 个源编号被写作 `33xxKH`。生产 SQL 迁移严格校验39条、Canonical一对一、无目标编号冲突后，更新了：

- `manual_timetable_templates.train_number`
- `train_timetables.primary_train_number`

不改变来源主键/Canonical ID、运行日、停站、时刻、列车种别或车辆。修正后39/39保持一致。**其余任何 `H` 都未修改**，因为JR西日本真实车次也可能以 H 结尾（例如 4507H）。

[SQL 迁移](../../supabase/migrations/20261031231500_osaka_loop_verified_39_yamatoji_number_corrections.sql)

**2. 将单站片段从计划运用解析环节隔离，不删除原始证据**

Supabase Edge Function `train-runs` v272 在 OsakaLoop/OsakaHigashi 两线路中，在计划运用及车型来源解析前剔除无法组成两个不同且有时刻车站的片段。保留数据库源行供后续追溯。接口返回：

- `omitted_incomplete_runs`（所有遗漏来源）
- `suppressed_station_only_source_fragments`（本次严格隔离的片段数）

网页的数据 API 也会将该字段映射为 `suppressedStationOnlyFragments` 状态元数据。**这不是恢复了全程计划**，只是修复了残缺源行进入完整列车处理逻辑的问题。

生产库结构核对：

| 线路 | 平日单站隔离 | 土休日单站隔离 | 平日仍有完整两站时刻源 | 土休日仍有完整两站时刻源 |
|---|---:|---:|---:|---:|
| OsakaLoop | 98 | 105 | 427 | 427 |
| OsakaHigashi | 46 | 48 | 143 | 142 |
| 总计 | **144** | **153** | **570** | **569** |

全部单站原始源保留在数据库，不把它们简单认定为“297 班列车缺失”；没有擅自合并同站同时、不同车次号的 27 对候选。文件恢复检查：GitHub `main` 目录 `data/timetables` 只含 `Oedo-manual.js` 和 `vehicle-operation-evidence-data.js`，对 `OsakaLoop-manual.js`、`OsakaHigashi-manual.js` 的历史提交路径查询均为空，无法从当前仓库重建源。

**最终数据库校验**：92,586 计划模板、1,135,945 停站，按具体日期运行记录0，非法日历0，Canonical失联0；Edge Function v272 ACTIVE，与 GitHub `main` 文件内容一致。

下一阶段要恢复剩余单站片段为完整时刻表，需取得可合法复用且可明确版本的 JR 西日本来源；确认每条原始车次的起终点、内外回、每站到发后，再逐条补站。不能推算，不应全局裁剪 H。
