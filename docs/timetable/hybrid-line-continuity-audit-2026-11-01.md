# HYBRID 实时位置 × 计划列车身份全量审计

**审计日期**：2026-11-01（JST）  
**范围**：`data/core/runtime-config.js`、`data/api/odpt-unified.js`、`js/running-chain-resolver.js`、`railway_data.compact.json` 和 Supabase `train_timetable_continuity`、`train_timetable_members`、`published_train_continuation_vehicle_coverage`。  
**原则**：计划只有 Weekday / SaturdayHoliday；实时事实只来自新鲜的 `odpt:Train` / GTFS-RT，不把计划车型当作实际车辆编组。

## 1. 模式和实时来源能力是不同的两件事

`REALTIME_POSITION_POLICY.defaultMode=HYBRID`。**显式声明** `HYBRID` 共26条，其中：

- 注册 `REALTIME_POSITION_API_LINES=true`（20条）：Kawagoe、ChuoRapid、ChuoSobuLocal、JobanLocal、KeihinTohoku、Keiyo、Musashino、Nambu、ShonanShinjuku、SobuRapid、Tokaido、UtsunomiyaJR、Yamanote、Yokosuka、Mita、Ome、Joban、Takasaki、TobuIsesaki、TobuNikko。
- 虽标 HYBRID 但**未注册实时位置API**（6条）：Tsurumi、TsurumiUmiShibaura、TsurumiOkawa、NambuBranch、Sagami、Hachiko。这些线路的HYBRID状态只是位置回退/策略默认，不等同于当前可获得真实列车位置；不可把计划推算点标为LIVE。
- `JobanMain` 采用**默认HYBRID**（不在显式26条中），近期已启用部分实时数据源。它不等于整条取手—仙台方向均有实时覆盖。
- 其余没有单独声明的线路也继承默认HYBRID；本表的26条只计算**显式模式设置**，不等于全库只有26条HYBRID。

注册API只是客户端可能调用对应铁路来源的能力，**不是供应商公布的每段完全覆盖证明**；`FULL`、`SEGMENTED` 或`HYBRID`也不能由有API自动推断。

## 2. 已由数据库确认的跨线路 canonical 列车

`train_timetable_continuity` 共905条（包含同线路连续性）。**跨不同 line_key 共713条**，全部已有同一 `train_timetable_members.timetable_id`，日历无冲突：

| 方向 | 已验证连续列车 | 车次号码是否变化 | 本次审计结果 |
|---|---:|---|---|
| JobanMain → Joban | 188 | 0 | 车型映射188；此前已修 |
| Joban → JobanMain | 187 | 0 | 车型映射187；此前已修 |
| Ome → ChuoRapid | 132 | 0 | 车型映射132 |
| ChuoRapid → Ome | 127 | 0 | 车型映射127 |
| ChuoMain → ChuoRapid | 40 | **40均变号** | 40条已有车型映射 |
| ChuoRapid → ChuoMain | 39 | **39均变号** | 旧数据39条未映射，本次补28条候选，剩11条冲突 |

`ChuoRapid`↔`ChuoMain` 的列车号码在来源段从T/H与M发生变化：**不能**用 `trainNumber`、`lineId` 的组合自动认定两个实时观测是同一列车。应该以来源核实的 canonical ID＋区间＋日历＋时间／端点做**唯一匹配**。与常磐线相反，该走廊不能机械地沿用“同号”桥接方法。

### 已实际修复：28条明确候选

从 `ChuoRapid → ChuoMain` 的39条中，28条有完整verified continuation、3个来源成员、同calendar、历史官方JR East 2610来源URL，且三个区段的**非空车型标签恰好唯一**，为 `E233系0番台`。已按**同一 canonical timetable_id**补入28条 `source_single_type_candidate` 映射。级别是来源计划候选，不是实际编组，也不是官方逐次车辆确认。采用幂等迁移 `supabase/migrations/20261101162000_backfill_chuo_rapid_main_vehicle_candidates.sql`；再执行不会产生重复记录。

另外**11条仍待核实**：同一canonical列车的某个ChuoMain来源段写 `E233系0番台`，另一段写 `211系 / E233系0番台`；不是单一候选，必须保留 `conflicting_member_vehicle_labels` 而不强行合并。例：1519H、1569T、1725T、1867T、2339T、449T（weekday/holiday）、523T、525T、661T、865T。

写后复核：
- `ChuoRapid/ChuoMain` 总79条canonical贯通：**68条已有车型映射、11条来源车型冲突**。
- `ChuoRapid/Ome` 259条canonical贯通：**259条已有车型映射**。
- `Joban/JobanMain` 375条canonical贯通：**375条已有车型映射**。
- 全库 `train_timetable_vehicle_mappings` 数量与不同 `timetable_id` 均为**21,774**（无重复）；新增28条候选后 `source_single_type_candidate=3,446`。这不代表新加入28个canonical列车，只是补车型元数据。

## 3. 其他 HYBRID 线路：按风险类型区分

### A. 直接有跨线拓扑，但尚缺同强度canonical SQL连接证据：优先调查

- **Keiyo ↔ Musashino／Sotobo／Uchibo**：京叶与武藏野直通、沿海方向直通；虽在`serviceBoundaries`有边界关系，但当前 `train_timetable_continuity` 没有相应不同`line_key`的verified pairs。即使两个实时接口有位置，也不能只用车次号码合并。
- **ShonanShinjuku ↔ Takasaki／Tokaido／UtsunomiyaJR／Yokosuka**，及 **SobuRapid ↔ Yokosuka**：直通跨多个service系统，必须防止换线后两个运行链或同号不同车的误配。当前仍缺与常磐/青梅同强度的完整跨来源canonical连接证据。
- **ChuoSobuLocal ↔ Tozai**、**JobanLocal ↔ Chiyoda**：存在跨运营商直通，必须严格保持operator+railway命名空间和来源车次变号处理，不得按相同铁路名或同一个停靠站确认。
- **Kawagoe ↔ SaikyoKawagoe／Hachiko**：现有运行图有边界关系，但Hachiko未注册实时位置API，不应将越过覆盖区后由时刻表补上的位置伪装实时。
- **Mita ↔ TokyuMeguro**：跨运营商直通，实时来源命名空间必须分别保存。
- **TobuIsesaki ↔ TobuNikko／TobuSkytree**：同运营商不同系统，GTFS位置可能沿线切换，需按源vehicle/trip而不是线路名合并。
- **Ome ↔ Itsukaichi** 与 **Tokaido／UtsunomiyaJR／Takasaki ↔ UenoTokyo**、**Joban ↔ NaritaAbikoBranch**：需先核对连续性证据和来源覆盖，不可因有直通拓扑就直接新建canonical关系。

这些是**结构性风险清单**，不能误读成已证实实时列车正在消失；缺少跨line SQL连接也不证明ODPT源没有数据。

### B. 已有 canonical，但实时匹配仍需各线路单独验收

- **ChuoRapid↔Ome（259条）**：目前车型映射已齐，但近期新增的 `jobanCanonicalBridgeKey()` 是**常磐线专用**；不能据此宣称中央/青梅实时源切换得到相同保障。还需要实际ODPT实时对象ID、时间和站点轨迹测试。
- **ChuoRapid↔ChuoMain（79条）**：跨区段来源列车号码全部改变，需专用的别名/源链接唯一证据才能尝试实时↔计划关联；11条车型矛盾必须独立解决。
- **Joban↔JobanMain（375条）**：当前有常磐专用桥接正反例测试，仍需要带有效ODPT实时快照的浏览器现场验收。

### C. HYBRID实时来源已注册，但线路暂未显示已验证跨线canonical连接

KeihinTohoku、Nambu、Yamanote 等在静态线路数据中没有列出直接serviceBoundary；此类检查重点是`odpt:Train`实时记录有效期、完整范围、位置来源优先级、估算退化、身份去重，而不是强行制造跨线运行关系。

## 4. 后续修复原则

1. **只按列车连续性证据复用身份**：canonical timetable ID＋唯一来源对照＋有效观测站／时间；禁止仅凭相同号码、线路关联、末站相同、运营公司相同。
2. **保持实时和计划分离**：实时缺失时可展示推算，但`positionSource`不能变成`realtime-api`；后续观测恢复时回到实时优先。
3. **车型证据与位置事实分开**：官方计划车型可以跨已验证canonical车次继承；来源候选不能变成EXACT实际车辆或具体编组。
4. **先把实际来源对录入为verified continuity，再为下一条走廊做唯一匹配测试**。不直接把常磐线专用规则套到多运营商/跨号线路。
5. **缺少实时API并不意味着全部列车没有计划数据**。如果只有计划来源，应显示计划推算或未确认状态，不能画成实时位置。

