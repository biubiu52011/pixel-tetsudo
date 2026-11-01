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


## 5. 2026-11-01 中央快速↔青梅：已落实HYBRID实时/计划canonical唯一匹配

该线路**不是**之前中央快速↔中央本线79条变号列车。数据库已独立验证：
- `ChuoRapid → Ome`：127个现有、`verified_continuation`、同服务日模板、同来源车次号码的canonical列车；
- `Ome → ChuoRapid`：132个，条件同上；
- 259个 canonical timetable_id 的 `train_timetable_lines` 均同时且仅含 `ChuoRapid` 和 `Ome`，**没有任意一个关联 ChuoMain**；
- 原始来源铁路代码分别是 `odpt.Railway:JR-East.ChuoRapid`（259来源成员）和 `odpt.Railway:JR-East.Ome`（259来源成员）。
- 259条已在先前的车型映射表内，不新增列车，也不修改候选车型或实车编组。

### 已完成代码改动

1. `supabase/functions/train-runs/index.ts` 在读取 `verified_continuation` 的完整 `train_timetable_stops` 后，对相同 canonical IDs 批量获取 `train_timetable_lines`，返回额外的 `canonical_line_ids`。该字段是来源事实，**仅描述实际属于同一canonical列车的线路**，不是简单的地图直通白名单；读取失败时不虚构归属。
2. `data/api/odpt-unified.js` 和 `js/train-position-estimator.js` 分别将 `canonical_line_ids` 保留成 `_canonicalLineIds` 和计划位置的 `canonicalLineIds`；不影响ODPT实时观测、编组及图片。
3. `js/running-chain-resolver.js` 在原有 `jobanCanonicalBridgeKey` 之外新增严格的 `omeCanonicalBridgeKey`：JR-East运营商、来源 `ChuoRapid` 或 `Ome`；SQL计划端必须 `group_evidence=verified_continuation`、存在 canonical ID **且 canonicalLineIds 同时包含 Ome、ChuoRapid**，实时端必须有真实 `fromStation`。共同 key 还需服务日＋完整车次号＋运行方向。该条件明确拒绝中央快速↔中央本线的T/H ↔ M 变号来源。
4. `js/data-fusion.js` 的 `_linkVerifiedCanonicalRealtime` 现在独立处理两条经核实的走廊：Joban／JobanMain与ChuoRapid／Ome，各使用独立候选key。依旧需要**唯一canonical计划、唯一实时观测、实际来源站点和完整计划行程站序一致**才绑定共同runningChainId；不能因线路相同或列车号相同强行合并。原先常磐专用的同等限制保持不变。
5. `data/core/runtime-config.js` 的 `VERIFIED_CANONICAL_PLAN_PARTNERS` 新增 `ChuoRapid ↔ Ome`，仅为计划加载依赖，不创造新铁路拓扑边或改变地图几何。
6. 新增 `tools/chuo-ome-canonical-realtime-hybrid.test.cjs`，并更新原 `tools/joban-canonical-realtime-hybrid.test.cjs` 继续对通用匹配器执行原有常磐回归测试。

### 上线与复核

- Supabase `train-runs` 已部署 **v275，ACTIVE**，再次读取线上函数代码与GitHub `supabase/functions/train-runs/index.ts` **完全一致**。
- 实际源码在隔离JS环境中测试：常磐旧回归PASS，中央快速/青梅新回归PASS；青梅测试包括两个方向成功、计划服务日不符、号数不符、方向不符、来源运营商不符、车站顺序倒退、两个候选计划、两个同时实时观测、中央快速/中央本线误关联、无canonical来源证明、JobanLocal/中央总武各站停车误入等反例。绝不根据服务车型推断具体实车编组。
- 2026-11-01数据库复查：canonical 259条两来源完全匹配（259/259）、与ChuoMain线路交叠0；全库车型映射仍 **21,774** 条（无重复），候选 **3,446**，本轮没有写入新列车或实际运行日期。
- **局限**：该轮尚无带有效ODPT实时车次的端到端HTTP快照，也没有实际手机端跨立川/青梅方向线路切换的动态追踪证据；回归PASS不能当成实时现场验收。不能声称其他HYBRID线已经自动获得同等严格的canonical桥接。
- **待落实**：中央快速／中央本线的79条已核实贯通中，变号（T/H↔M）需要按官方逐段服务号别名、切换站/时间、真实站点、唯一canonical身份构建新的专用证据，不能用青梅线路的同号规则迁就。尤其11条相互矛盾的车型标签仍待逐车次核对。


## 6. 2026-11-01 中央快速 ↔ 中央本线79条 **变号贯通**：实名别名 + HYBRID

### 事实与边界

与259条同号的青梅／中央快速贯通不同，中央本线与中央快速经过区段后列车号码由 `M` 改为 `T/H`（及反方向），**不得用字符串后缀替换或相邻线路关系生成身份**。

数据库对79个既存 `group_evidence=verified_continuation` 的 canonical 列车逐一核对：
- 平日39、土休日40，每列具有3个来源模板：ChuoMain的M，ChuoMain的T/H，以及ChuoRapid的T/H，共 **237个来源成员**；
- 79个canonical列车各有至少一个M和一个T/H来源车次，所有来源 `direction_urn` 和 `railway_urn` 均存在；
- 按 `calendar_urn + train_number + railway_urn + direction_urn` 聚合，**0个别名组合对应超过一个canonical列车**；
- 数据库实际存的中央本线来源 `railway_urn=odpt.Railway:JR-East.ChuoMain` 共158条，快速来源 `...ChuoRapid` 79条；实际ODPT实时来源则使用 `odpt.Railway:JR-East.Chuo`，不能直接进行源字符串精确比较；
- 此79列车中40个已存 `published_number_family_plan=E233系0番台`，另外28条 `source_single_type_candidate=E233系0番台`，**11条仍存在 E233 vs 211/E233 车型来源冲突**。身份核实独立于车型核实，未变更这11条车型，也没有新增实际编组数据。

### 已提交的端到端链路（不是号码推测）

1. Edge Function `train-runs` 原先已返回 canonical ID、完整合并的停站、来源线路；本轮再通过 **已证实属于同一canonical列车的 `train_timetable_members`** 读取 `manual_timetable_templates` 的 `train_number`、`line_key`、`railway_urn`、`direction_urn`，为中央快速/本线的已核实列车返回 `canonical_number_aliases`。不同来源的车次号都挂在**同一个 canonical timetable_id** 下。来源缺失时抛出显式错误，不伪造号码/时刻。
2. `data/api/odpt-unified.js` 将该字段转换为 `_canonicalTrainNumberAliases`；`js/train-position-estimator.js` 仅作为计划列车证据带出 `canonicalTrainNumberAliases`，不会覆盖实时列车的铁路原始身份。
3. `RunningChainResolver.chuoMainCanonicalBridgeKeys` 根据**来源真实别名**生成（服务日＋车次号＋方向＋铁路命名空间）候选键，只接受 `canonicalLineIds` 同时包含 `ChuoRapid` 和 `ChuoMain` 的 `verified_continuation` 来源。校验源别名和所属线路，**仅**将数据库历史 `JR-East.ChuoMain` 别名标准化成JR东日本当前实时源 `JR-East.Chuo`，不改变其他线路或运营商，不猜测M/T/H后缀关系。
4. `js/data-fusion.js` 已扩展为3条相互独立的matcher：JobanRapid/Joban、ChuoRapid/Ome、ChuoRapid/ChuoMain。原来的唯一 canonical ID／唯一有效实时快照／服务日方向／实际站点路径/下一站不倒退限制继续生效；**只有一个候选并证实线路和编号对应时**才继承 `runningChainId`。位置来源仍为真实 `realtime-api`；计划车型不转化为实际实车编组。
5. `data/core/runtime-config.js` 扩展 `VERIFIED_CANONICAL_PLAN_PARTNERS`：ChuoRapid←→ChuoMain 的计划 SQL 必须作为依赖预取。将 `ChuoMain` 加入部分 realtime API lines（继续默认HYBRID，**不是FULL**）；`data/api/odpt-unified.js` 显式声明 `ChuoMain` 属于JR-East以及对外ODPT码 `Chuo`。

### 已执行测试与部署

- `tools/chuo-main-canonical-number-alias-hybrid.test.cjs`：真实SQL所用 ChuoMain 来源 URN 与 ODPT.Chuo 实时 URN 的规范化；`640M`↔`640T` 两方向成功案例；错误车次后缀、来源线不符、跨运营商、来源无canonical证明、方向/服务日不同、车站外、站序倒退、多个计划、多个实时观测、青梅和各停车隔离等拒绝案例。
- 原常磐 `tools/joban-canonical-realtime-hybrid.test.cjs`、中央快速／青梅 `tools/chuo-ome-canonical-realtime-hybrid.test.cjs` 一起用**仓库实际JS源码**在隔离环境运行，**三个回归套件PASS**；修正了原有测试关于新增 partner 的fixture与断言。
- Supabase `train-runs` 从v275更新部署到 **v276 ACTIVE**；函数部署文件再次读取，与GitHub源码一致。
- 本轮 **没有新增任何 canonical 计划列车、实际每日运行、车辆编组或车型映射**。映射仍21,774、无重复；`actual_vehicle_confirmed`全部false。
- **现场数据待验收**：现有环境无有效ODPT当期实时列车网络快照，无法证明实际移动端所有边界位置或来源车次都能连续显示。SQL计划来源为2026-10历史版，不能将其逐日开行情况或准确到发时刻当作已核实的2026-11实际运行。

