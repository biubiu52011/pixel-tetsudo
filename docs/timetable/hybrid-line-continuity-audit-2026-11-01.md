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


## 7. 2026-11-01 湘南新宿线 × 东海道／横须贺：严格双向来源验收与35列 canonical 归并

### 全库审计的重要前提

此前 `train_timetable_continuity` 只对Joban/Ome/Chuo等已建设的线路有连接；湘南新宿线虽有380个来源计划，东海道Tokaido有692、宇都宫UtsunomiyaJR有599、高崎Takasaki有450、横须贺Yokosuka有691，但**跨这些线路没有已确认的 canonical links**。JR-East官方[Ofuna駅时刻表](https://timetables.jreast.co.jp/en/timetable/list0342.html)展示各运行系统对应的车站区间；[ODPT JR-East 2026时刻表数据集](https://ckan.odpt.org/en/dataset/jreast__r_train_timetable)注明只覆盖部分区域/部分直通，实时[GTFS-RT数据集](https://ckan.odpt.org/en/dataset/odpt_jreast_tokyo_area)也不承诺每班临时/直通列车均有真实位置。

只按**同calendar+trainNumber**连接湘南新宿与周边：Takasaki有135候选、Tokaido139、UtsunomiyaJR128、Yokosuka144。由于湘南新宿来源方向采用Northbound/Southbound，周边干线采用Inbound/Outbound，单纯字符串对比得0，并不等于没有物理贯通。进一步以**同源唯一番号+真实交界站同一时刻+来源前后序互引+修订版本一致**验证，Ofuna得到：
- **ShonanShinjuku ↔ Tokaido：35个**（东海道→湘南新宿18、反方向17）。
- **ShonanShinjuku ↔ Yokosuka：2个**（每方向1，来源2526Y和2551Y）。
- 在Takasaki/UtsunomiyaJR方向的同号候选里，本轮按相同端点时钟条件**没有可自动归并的组**。需后续用完整端点引用、passing/boundary时序、来源修订等另行核对，不能直接按号合并。

### 本轮已实际落库：35个东海道/湘南新宿贯通canonical列车

新增 `published_shonan_verified_boundary_sources` security-invoker视图，以直接可查SQL证明37个候选：`from_template_id`、`to_template_id`、`line_key`、双向 `source_trip_id` 前后序引用、同 `calendar_urn`／同 `train_number`／同 `source_revision_date`、Ofuna端点 **arrival_clock=departure_clock**、正确顺序（northbound=Inbound，southbound=Outbound）。严格使用 `reciprocal_source_ids_station_time_revision` 级别，不能把同号视为同一物理列车。

35个Tokaido配对进一步预检全部成功：
- 双方原来都是 `source_only`，每端恰好一个source member、各不少于2站；
- 无任一对已有 `train_timetable_continuity` 占用、无同一root或child被多对使用；
- 无 `train_runs` 运行日期引用、无车型映射、无运用证据引用；可以保留原有root canonical ID安全合并。
- 在一次**原子数据库迁移**中写入35个continuity边，将child `train_timetable_members` 迁移到root，`segment_order=1`、`member_role=verified_continuation`、`merge_first_stop=true`（大船公共边界只计一次），更新root `group_evidence=verified_continuation`，并删除35个已无成员的source-only child canonical记录。所有原 `manual_timetable_templates` 和停止时刻原封不动保留。
- `train_timetable_stops` 是使用成员索引的动态 **VIEW**；更新成员关系即可即时呈现一条跨区段完整计划，没有写入真实每日运行时间或复制停站。
- 迁移 `20261101180000_merge_35_shonan_tokaido_canonical_trains.sql` 已写入GitHub；第一次实际数据库操作采用同等严格的非幂等预检事务，仓库文件为便于重放的幂等变体（重放没有未归并对象时不会重复操作）。
- 合并后验证：35/35同一canonical，35/35 `verified_continuation`，35/35每列2个source member、跨2条line_keys，合并后的停站序列号**没有重复**；全库canonical计划列车 **91,254→91,219**，是去掉35个重复身份，不代表班次取消。其余两条Yokosuka仍各自保持source_only，独立待审。

### 横须贺两对为什么保留

`2526Y`、`2551Y` 虽然具有相同的Ofuna双向来源时刻与来源引用，但两条Yokosuka源模板已有 `E235系1000番台` 单一车型候选映射，Shonan段没有相应确认。为了避免把车型候选从横须贺车次直接提升/传播到整个湘南新宿列车，本轮**没有合并这两对**。须独立核实型号与实际服务关系，不能因为看见E235候选就自动把它赋给湘南新宿线。

### 运行时已部署：HYBRID canonical 身份桥接

1. `supabase/functions/train-runs/index.ts`：现有 `verified_continuation` 返回完整站序／`canonical_line_ids`；本轮把已经SQL确认 `ShonanShinjuku+Tokaido` 的source members并入 `canonical_number_aliases` 返回集合，不允许普通 `source_only` 或单靠同号获得这些别名。
2. `RunningChainResolver.shonanTokaidoCanonicalBridgeKeys`：限定 `lineId` 为ShonanShinjuku/Tokaido、运营商JR-East的准确ODPT rail namespace，并用**官方方向对应** `Northbound↔Inbound`、`Southbound↔Outbound` 构造已验证canonical候选。服务日期、源铁路、车次、方向都是键的一部分；只有SQL两个成员线路完整且verified才能产生计划键。不会放宽Yokosuka、Takasaki、Utsunomiya或其他运营商。
3. `js/data-fusion.js`：加入第四条独立的 `_linkVerifiedCanonicalRealtime` 走廊；仍必须唯一canonical、唯一实时观测且 `fromStation`／`toStation` 在完整计划站序一致。实时永远保持 `positionSource=realtime-api`，不会由计划来源推定实际车组。
4. `RuntimeConfig.VERIFIED_CANONICAL_PLAN_PARTNERS` 增加 `ShonanShinjuku↔Tokaido`，只是**计划SQL预取**不改变线路几何或创造额外行车区间；`train-position-estimator` 对同一已证实跨线路列车固定 `canonical-sql-trip:<serviceDate>:<id>` 身份。
5. 新增 `tools/shonan-tokaido-canonical-hybrid.test.cjs`：北向/南向正例与13个拒绝用例（Yokosuka候选不得合并、不同服务日、不同车次、相反方向、其它运营商、源铁路不符、错误站点、站序倒退、多个计划/实时候选等）。本轮与Joban、ChuoRapid/Ome、ChuoRapid/ChuoMain三个既有测试使用**仓库源码**一起运行，四组均PASS。
6. Supabase `train-runs` 已从v276升级为 **v277 ACTIVE**，再次读取已部署 `index.ts` 与GitHub当前文件**字节内容一致**；车型映射仍**21,774**条、唯一mapping ID也是21,774、`actual_vehicle_confirmed`全部false。

**剩余局限**：官方ODPT Challenge 2026提供部分实时源但本环境没有真实当日ODPT列车跨大船的连续快照；上述是数据库与离线源码测试验证，非手机端实际线路切换完备性担保。TokaidoMain作为历史来源另有与Tokaido相同的分段行程，可能仍产生来源投影重复；本轮没有越权重写这批历史来源。高崎/宇都宫和横须贺剩余链接需要分段证据审查，不能拿新白名单替代canonical核验。


## 8. 2026-11-01 湘南新宿线 × 高崎／宇都宫：大宫263组正式canonical合并，HYBRID v278

### 为什么上轮没找到，以及本轮的严格证据

ShonanShinjuku计划采用 `Northbound` / `Southbound`，Takasaki／UtsunomiyaJR在大宫以北则采用 `Outbound` / `Inbound`，且**北行对应Outbound、南行对应Inbound**。与东海道侧 `Northbound↔Inbound` 正好相反。因此字符串同名匹配得0，不意味着没有真正贯通。

本轮基于既存 **出版式ODPT来源** 对ShonanShinjuku + Takasaki／UtsunomiyaJR同calendar、同完整车次号的263组逐条验证：
- 双方source trip ID均存在且 `previous_timetable_ids`、`next_timetable_ids` **相互引用**；
- `source_revision_date`一致、运营者为JR-East、平日／休日一致；
- 以大宫站为真实**两个来源段的边界端点**，前段到达与后段发车均有有效时刻，前后顺序和方向正确；
- 两端时刻差：Shonan→Takasaki **67组（1–3分钟）**；Takasaki→Shonan **68组（1–4分钟）**；Shonan→Utsunomiya **64组（1–6分钟）**；Utsunomiya→Shonan **64组（1–3分钟）**；
- 263个from和263个to源模板均一对一，且没有占用旧的 `train_timetable_continuity` 的起点或终点；
- 不能仅靠番号重合推断车次连续；[JR East大宫站时刻表](https://timetables.jreast.co.jp/en/timetable/list0350.html)可用于复核运行系统和方向，精确到每个列车的关系以SQL保存的相互引用、端点时刻为证据。

新增 `published_shonan_omiya_verified_boundary_sources` 安全调用者视图（`security_invoker=true`）即时复算263组。迁移源码：
- `supabase/migrations/20261101190000_shonan_omiya_verified_sources.sql`；
- `supabase/migrations/20261101191000_merge_263_shonan_omiya_canonical_trains.sql`：**完整复刻已执行的原子SQL迁移**，包含严格计数预检（北131、南132）、成员和引用安全校验、唯一性检查、停站顺序后检。此迁移是一次性变更而不是可反复跑的重建脚本；在现有项目上无需再次执行。

### 实际数据库处理结果

- **263组全部合并** 到既存 canonical `train_timetable_id`，不生成物理列车编组或真实每日行车记录。
- 北行131组在已存在的Shonan canonical尾部继续接入高崎／宇都宫来源；南行132组将高崎／宇都宫来源**前置**，但保留此前Shonan canonical ID（若有后续东海道段则继续保留）。
- 先前已连接的Ofuna 35列东海道↔湘南新宿全部保留，最后 **35个三段贯通**：东海道→湘南新宿→高崎18个、高崎→湘南新宿→东海道17个。其余228个为两段贯通。
- 停站序号通过 `train_timetable_members.segment_order` / `stop_offset` / `merge_first_stop` 重新编排，每个相邻边界站只出现一次。**263/263** 出现正确数量的完整 `train_timetable_stops`，站序号无重复，跨线来源member无重复。
- 全库canonical计划列车 **91,219→90,956**（减少263个重复区段ID）；`verified_continuation` canonical数从1,119增至 **1,347**（其中35原先已经是已核实贯通身份）。总车型映射仍 **21,774**，所有mapping均 `actual_vehicle_confirmed=false`，唯一 `timetable_id` 21,774。
- Shonan／Yokosuka在大船的 **2526Y、2551Y两个来源** 依然没有合并；虽然双向来源/时刻有证据，但横须贺来源的车型候选为E235系1000番台，不能贸然传播到湘南新宿的实际车型。未做批量清理或升级。

### HYBRID实时与计划接口

`train-runs` v278（Supabase ACTIVE）:
- `canonical_line_ids` 返回完整已验证来源线路成员；
- `canonical_number_aliases` 在SQL verified Shonan + Tokaido、Takasaki或UtsunomiyaJR 关系下返回真实来源别名，不用车次番号近似匹配；
- `js/running-chain-resolver.js` 新增 `shonanTakasakiCanonicalBridgeKeys` 和 `shonanUtsunomiyaCanonicalBridgeKeys`，匹配候选 key 要求车次、铁路命名空间、归一化方向、服务日，并仍要求数据库同时包含来源路线及 `verified_continuation`。
- `js/data-fusion.js` 在原有常磐、中央/青梅、中央本线变号、湘南/东海道四条走廊基础上新增这2条，严格保留**唯一计划、唯一实时观测、来源站点、停站方向与顺序**要求；不把计划估计点标记成实时。
- `RuntimeConfig.VERIFIED_CANONICAL_PLAN_PARTNERS` 新增 ShonanShinjuku↔Takasaki、ShonanShinjuku↔UtsunomiyaJR 的SQL计划预取，不意味着提供商这两条线路每段都有实时覆盖。
- `train-position-estimator.js` 在已确认的2/3段 canonical 计划中固定 `runningChainId`，不让局部线路视图重设同一列车身份。
- 新增 `tools/shonan-omiya-northern-canonical-hybrid.test.cjs`：高崎/宇都宫两方向与Tokaido-Shonan-Takasaki三段贯通正例，且有未核实来源、同号不同车、错误运营商、方向、服务日、站序倒退、重复候选、错误线路等拒绝例。一起回归**5个套件全部PASS**。
- 已再次从Supabase取回v278部署文件，确认与GitHub `supabase/functions/train-runs/index.ts` **内容完全一致**。

### 精度限制与后续

以上是**出版计划的来源连续性**，不是“今天一定有这班车”的证明；只有 `Weekday`、`SaturdayHoliday` 两种计划。JR East 2026-11出版时刻可能与当前历史ODPT source修订不同，实时覆盖会按车次/时间缺失。由于缺少有效ODPT实时快照，本轮未做真实移动端列车跨大宫的动态验收，不能宣称所有实时列车在两个源中都能追踪。

下一步优先核实 **横须贺2个车型冲突来源**、SobuRapid↔Yokosuka跨系统，以及来源重复的 TokaidoMain，不得用相似车次或路线上同一站直接套用此次合并规则。
