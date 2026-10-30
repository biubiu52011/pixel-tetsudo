<!-- product-version:start -->
> 产品版本：0.0.1；状态：IN_PROGRESS。产品版本不随 Commit、CI run 或缓存构建递增；构建身份使用 Git SHA。
<!-- product-version:end -->

# Pixel Tetsudo 工程进度

### REALTIME-CANDIDATE-CONTRACT-20261030 — 候选车型恢复中性显示（COMPLETE）

| 项目 | 当前状态 |
| --- | --- |
| 根因 | `selectMarkerArtwork()` 将 NARROWED 多车型候选的第一张 PNG 返回为普通 `vehicle`，使候选身份看起来像已确定实车；缺少线路戳记的扁平候选也可能被投影。 |
| 修复 | 多候选现在返回 `kind: candidate` 与完整候选资产元数据，复用 renderer 已有的线路色/紫色候选点，不投影具体 PNG；候选投影必须同时携带匹配的位置线路和解析线路。确定车型和唯一计划车型继续沿原 EXACT 契约显示。 |
| 验证 | 本地车型流水线、无猜车型、图标解析、运营证据、都营 GTFS、请求契约、HAR 回放、运行链/位置/终点、renderer、资产路径及架构守卫通过。HAR 为 429 行、281 条 EXACT/PNG；597 个图片引用、598 个 canonical artwork、0 个失效路径。 |
| 发布边界 | 普通提交推送 `main` 仅触发 CI；未授权生产 Pages 发布。 |

### STATION-EXIT-SOURCE-GUARD-20261030 — 清理捏造车站出入口与跨站补位（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 根因 | 一是 `tourism_data.json` 曾把站中心偏移、站前兜底及无来源估算坐标当作真实出入口；二是详情页会遍历所有车站，在 2 公里内选择任意最近出口，导致没有出口资料的小站借用邻站出口。 |
| 修复 | 出口库收敛为 10 个已逐站核验车站、41 条记录，每条均保存运营方、官方站页/站图、坐标来源与审核状态。`db-loader.js` 与 `tourism-proximity.js` 只接受证据字段完整且归属当前站的记录；详情页只查询当前车站，未收录的小站退回本站中心步行距离，不再跨站补出口，也不再自动捏造“駅直結”。 |
| 验证 | `node data/core/generate-all.js --check`、`node --check data/core/db-loader.js`、`node --check js/tourism-proximity.js`、`node --check js/tourism-core.js`、`node tools/tourism-exit-integrity.test.cjs` 通过；新增回归覆盖“邻站出口更近”和“小站无资料”两种情况。既有 `tourism-loading.test.cjs` 仍有与本改动无关的样式加载断言失败，未修改其契约。 |
| 备份 | `.work/backups/20261030-station-exits/` |

### REALTIME-UNKNOWN-REDUCTION-20261029 — 实时灰色判定收敛（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 根因 | 规范车队规则的计划作用域在实时查询中被错误地当成“已有计划”，一旦命中就提前丢弃同线路的实时车队事实；同时宇都宫线 3/6 両编成的 E131 系600番台事实没有进入共享证据快照。另有来源快照使用 `JR E233系5000番台`、号段规则使用 `E233系5000番台` 的身份别名差异；中央线 H/T 通配规则也曾接受没有种别字段的未知号码。 |
| 修复 | `js/train-vehicle.js` 仅在 planned 模式启用计划作用域；实时/回退模式不再被计划规则拦截。规范快照新增 JR 东日本官方宇都宫线 E131 系600番台规则（普通列车、3 或 6 両），并恢复 evidence inventory 的来源键→canonical 键血缘。车型冲突比较统一走 canonical identity；运营号的逗号通配模式由共享匹配器处理；中央线 H/T 规则增加 Local/Rapid/各中央快速种别门槛，缺种别的未知号码不再被车型通配吞掉。 |
| 结果 | HAR 回放 429 行中 EXACT/PNG 为 281；148 行仍为 `UNKNOWN/no-vehicle-evidence`。曾尝试的京叶静态 A/Y 车队规则已撤回：缺少当日运行/编成证据时必须保持 UNKNOWN，不能把线路现役车队表当成实时实体判定。 |
| 验证 | `node --check js/train-vehicle.js`、`keiyo-operation-evidence`、`canonical-evidence-snapshot-guard`、`runtime-har-replay`（281 EXACT/PNG）、`train-vehicle-pipeline`、`train-image-assets`、`vehicle-audit`、`gallery-sync`、`frontend-smoke` 全部通过。 |
| 证据 | JR 东日本官方宇都宫线・日光线 E131 系投入公告：<https://www.jreast.co.jp/press/2021/omiya/20211217_o01.pdf>。 |

### ARTWORK-INVENTORY-DEDUPE-20261029 — わ99形素材登记去重（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 修复 | 将わ99形正式车型占位与重复的 `artwork-inventory-079` 合并；普通名称及车号标签仅保留为 `plannedAliases`，不进入实时 canonical 别名索引。 |
| 结果 | 待审素材回到 244 条；图库 579 张 PNG、599 个 canonical 条目、0 个游离/缺失路径。 |
| 验证 | `artwork-inventory-mapping`、`train-image-assets`、`gallery-sync`、`vehicle-audit`、`train-vehicle-pipeline` 全部通过。 |

### ASSET-LOCK-REFRESH-20261029 — 网站替换素材锁定基线同步（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 核对 | 重新核对 9200 形及同批相铁 21000、京急 600、京王 1000、伊豆箱根 5000、北総 7500/7800 网站原图；均为有效 82×98 PNG。 |
| 修复 | 将 7 张已确认替换素材的 Git blob 哈希同步到 `tools/vehicle-image-lock-baseline.json`，不改图片内容。 |
| 验证 | `vehicle-image-lock` 537 张全部通过；图库审计、实时 HAR 回放继续通过。 |

### LOCAL-CONSOLIDATION-20261029 — 当前修复吸收合并（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 收拢范围 | 实时车型共享解析、canonical evidence 快照、运营号 PNG 库、わ99形登记、网站替换素材锁定基线统一为当前工作区状态；JSON 快照与生成 JS 已逐项比对，无漂移。 |
| 结果 | 454 条 records、346 条 dated records、362 条 family rules、10,777 条 reference rules、178 条 carsets 与生成快照全部一致；不存在过宽京叶规则 723 的 family 记录。 |
| 限制 | 当前目录没有 `.git`，因此只能完成本地吸收合并，不能创建提交、分支或推送。 |

### OLD-CONTRACT-CONSOLIDATION-20261029 — 旧测试契约吸收合并（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 修复 | 将八高、伊东、京叶、Metro、三田/南北、中央特急、运行链连续性等旧测试夹具统一到当前职责边界：实时只接受直接车号/车型反馈，不携带 SQL 运行计划；计划车型只在 SQL/时刻表入口校验。修正 JR 参考证据的重复脚本加载、有效期后仍可用的独立车队规则、JR 九州 JA 独立展示槽、磐越西 DE10 原生计划图契约。 |
| 环境契约 | 版本历史审计在无 `.git` 工作区明确跳过并保留真实 checkout 审计入口；发布包回环测试本地 HTTP 绑定在受限环境失败时不改生产逻辑，已在允许本机回环的验证环境通过。 |
| 验证 | 74 个工具测试中产品/数据/架构回归全部通过；普通受限运行只剩发布回环的 127.0.0.1 权限阻断，单独放行网络绑定后 `release-bundle` 通过。JR 参考、排序、剩余计划车型、版本审计及此前 12 个旧契约失败均已通过或按环境明确跳过。 |
| 限制 | 工作区没有 `.git`，未提交、未推送；浏览器/生产发布仍不由本地测试代替。 |

### ARCH-VEHICLE-PIPELINE-20261029 — 全链路完整度复核（本地 REVIEW）

| 项目 | 当前状态 |
| --- | --- |
| 已覆盖链路 | 已核对实时输入 → DataFusion → TrainVehicle → PNG 选择 → renderer → trains-page 刷新；车型/候选图片变化会触发显示刷新，renderer 不再拥有第二套车型区间判定。实时缓存键已包含编成数与候选编成，运行链证据绑定 `serviceDate`，解析异常会留下可诊断状态。 |
| 复核结果 | `train_vehicle_mapping_guard`、`vehicle-audit`（599 个 canonical artwork 条目、0 个失效 artwork path）、`gallery-sync`（579 张 PNG 全部进入 canonical asset/plannedAsset 目录、0 张游离）、`vehicle-image-lock`（537 张已审锁定 PNG）、canonical evidence ambiguity、车型流水线、scoped planned vehicle、运行时变更契约、runtime architecture guard 均通过；车型语法检查通过。わ99形与待审素材的重复占位已合并，实时车号别名仍保持隔离。 |
| 资产登记边界 | 实际图库有 579 张 PNG；在原有正式车型记录之外新增 244 条 `artwork-inventory-*` 待审记录，现已全部以 `plannedAsset` 入库，因此“未注册路径”从 244/245 降为 0。新增记录统一标记 `pending-source-review`、`plannedOnly`，不写入线路、编成、车号别名或 realtime EXACT 规则；它们是可追溯的素材清单，不等于实时车型已判定。`vehicle-image-lock` 仍只锁定此前完成审查的 537 张，不在没有重新审图授权时扩大锁定基线。 |
| 仍待核对 | 244 条待审素材仍需按官方来源/线路/编成证据逐条转正，不能按文件名自动绑定；这不阻塞已登记的计划 PNG 映射。 |
| 全量复核（2026-10-29 JST） | 旧契约吸收后，74 个工具测试中的 72 项在受限环境通过；剩余发布回环测试仅受 `127.0.0.1` 绑定权限影响，放行本机回环后通过；版本历史审计因当前目录没有 `.git` 明确跳过。产品/数据/架构回归没有业务失败。 |

### GLOBAL-ARTWORK-PLANNED-MAPPING-20261029 — 待审素材的全局计划映射（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 映射方式 | 为 244 条待审素材生成带运营方前缀的 `plannedAliases`，并建立独立计划别名索引；这些别名只在时刻表计划解析阶段启用，实时 canonical 别名索引明确隔离。 |
| 结果 | 显式提供完整运营方+素材标签的计划记录现在可以得到对应 `plannedAsset` PNG；未提供该标签的实时记录不会因为文件名或运行号被猜测成车型。 |
| 验证 | `artwork-inventory-mapping.test.js`（244 条计划别名、实时隔离、计划 PNG 投影）通过；车型流水线、无猜车型、`gallery-sync`、`vehicle-audit` 继续通过。 |
| 边界 | 这不是把 244 张图片伪造成实时实体车号；要启用实时 EXACT，仍需官方车号/编成或运营号来源证据。 |
| 实机 / 发布边界 | 侧边浏览器现场回读仍未完成；当前目录不是 Git 工作树，未提交、未推送、未发布。Python 守卫因环境没有 `py` 启动器未运行，等价 Node 架构守卫已通过。 |

### OPERATION-PNG-RENDER-20261029 — 候选运用号不再退回灰点（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 根因 | 运用号库已经把大江户/三田实时行缩小到有来源的多车型候选，但 `selectMarkerArtwork()` 只接受 EXACT 或已发行计划 PNG，候选行最后仍被渲染成灰色圆点。 |
| 修复 | `TrainVehicle.selectMarkerArtwork()` 现在读取 `operationArtworkCandidates`；多候选时展示稳定排序的代表 PNG，并标记为 `planned`，不改写 `vehicleIdentityStatus`、车型名称或实体车号判定。DataFusion 同时把候选图片作为扁平展示元数据投影，跨线/缓存浅拷贝丢失嵌套结果时再由共享运用号 PNG 库恢复。 |
| 结果 | 大江户 A/B、三田 T 等“已完成候选判定但尚无实体车号”的实时行不再显示灰点；标题仍不冒充 EXACT 车型。真实车号或明确车型到达后，原有 EXACT PNG 优先覆盖候选代表图。 |
| 验证 | `node --check js/train-vehicle.js`；`node tools/train-vehicle-pipeline.test.js`（新增候选/扁平位置图片回归）；`node tools/train_vehicle_mapping_guard.js`；`node tools/runtime-har-replay.test.js`（429 行、281 条 EXACT/PNG）通过。浏览器页面已实际走到 `planned` 图片分支；本地 file:// 页面仍需用户刷新后确认最终视觉结果。 |
| 备份 / 发布 | 备份位于 `.work/backups/20261029-candidate-artwork/`；当前目录不是 Git 工作树，未提交、未推送、未发布。 |

### OPERATION-PNG-LIBRARY-20261029 — 运营番号号段到车型 PNG 库（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 用户目标 | 需要的是“运营番号号段 → 车型 → PNG”的库，不是只在渲染层按车型名称补图。 |
| 原位实施 | `js/train-vehicle.js` 在现有 `TrainVehicle` / `TrainOperationEvidence` 责任点增加 `TOEI_OPERATION_PNG_LIBRARY`：浅草 `*T`、新宿 `*T`、三田 `20T-89T`、大江户 `*A/*B` 均登记车型及原生 PNG；唯一车型号段在实时解析中直接进入 `realtimeDerivedVehicleType` 并投影 PNG；多车型号段保留完整 `operationArtworkCandidates`，身份不挑第一张图，渲染层只显示带 `planned` 标记的稳定代表图。新增 `TrainVehicle.getOperationPngLibrary()` 与通用 `resolveOperationPng()`；canonical `VEHICLE_FAMILY_RULES` 中的非通配唯一号段和可绘制候选号段均纳入快照（当前 331 条，292 条为候选，298 条为计划范围），并按生效日期、日历、车种和编成数过滤，避免把线路级计划车队误当实时号段事实。 |
| 判定边界 | 新宿 `*T` 当前可稳定映射到都営10-300形代表图；三田和大江户的号段对应多个车型，官方资料只确认线路车队构成，不能从 A/B 或 T 号段唯一确定编成，因此仍返回 NARROWED + 全部候选 PNG，不伪造 EXACT。 |
| 来源 | 都营官方车辆形式图与车辆表示器页面列出三田 6300/6500、新宿 10-300、大江户 12-000/12-600 的车型范围；官方页面未提供三田/大江户“号段固定车型”的唯一表。 |
| 验证 | `node --check js/train-vehicle.js`；`node tools/train-vehicle-pipeline.test.js`；`node tools/train_vehicle_mapping_guard.js`；`node tools/canonical-evidence-snapshot-guard.test.js`；`node tools/train-fold-layout.test.js`；`node tests/railway-browser-contract.test.cjs`（45/45）；`node tools/toei-gtfs-vehicle-type.test.js`；`node tools/toei-gtfs-direction.test.js` 均通过。新回归覆盖共享号段解析、运营方隔离、新宿唯一号段 PNG、大江户候选 PNG 集合和库快照。 |
| 浏览器 / 发布 | `browser runtime: NOT VERIFIED`；当前目录不是 Git 工作树，未提交、未推送、未发布。 |

### REALTIME-LOG-RATE-LIMIT-20261028 — 日志暴露的实时请求风暴与快照丢失修复（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 日志证据 | `C:\Users\80996\Downloads\-1793192576206.log` 显示挑战接口回退 URL 使用了错误的 `&acl:consumerKey` 连接符；`api.odpt.org` 的都营 VehiclePosition/TripUpdate 与中心线 alert 持续返回 429，挑战接口 alert 返回 403；实时失败路径随后把上一份位置/延误快照写成 `null`。 |
| 原位修复 | `data/api/odpt-unified.js` 统一修正回退 URL 的查询分隔符并对 key 做 URL 编码；共享请求队列合并同一 JSON/GTFS 请求，按域对 429/403 建立冷却窗口；惰性模式的显式空运营商列表不再扩展成全量位置请求；实时位置/延误请求失败时保留最后有效快照并记录 `ODPT_REALTIME_STATUS`，只有成功空数组才表示确认无记录。 |
| 验证 | `runtime-request-contract` 新增回退 URL、GTFS 合并、429 冷却、空位置范围和失败快照保留回归；Toei 车型/环线方向、位置连续性、性能生命周期、浏览器契约 45/45、HAR 回放（429 行、277 条 EXACT/PNG）、车型映射审计（0 个失效 artwork path）均通过；`node --check data/api/odpt-unified.js` 通过。 |
| 安全 / 实机边界 | 附件日志包含 ODPT consumerKey，未在代码或回复中回显；建议立即在 ODPT 后台撤销并轮换该 key。浏览器 file:// 实机回读仍未完成，未将本地结构与回放测试冒充为实机通过。当前目录不是 Git 工作树，未提交、未推送、未发布。 |
| 追加修复（2026-10-28 JST） | 重新解码并核对 `data/api/odpt-links.js`：三个都营 GTFS-RT 链接与用户提供地址完全一致，未产生无意义的 key 变更；直接探测 Vehicle/TripUpdate/Alert 均返回 HTTP 200。现行 feed 的 trip_id 前缀已从旧 `12/22/42...` 族切换为 `10/20/40...` 族，统一适配器已补齐 Asakusa/Mita/Shinjuku/Oedo/Arakawa 的新旧前缀；铁路事实异步到达时，`pt:railway-ready` 会对已激活但没有位置快照的运营商补拉一次。真实 VehiclePosition 回放得到 72 条有效位置（Asakusa 12、Mita 14、Shinjuku 10、Oedo 28、Arakawa 8）。 |
| 线路范围视图（2026-10-28 JST） | GTFS-RT 传输仍保持运营商整包（接口不支持线路参数）；新增 `ODPT_TRAIN_POSITION_VIEWS` 作为 DataFusion 输入视图：保留 `ODPT_TRAIN_POSITIONS` 完整快照用于缓存和跨页复用，详情页激活 Oedo 时仅将 Oedo 行送入融合层，切换线路只重建视图，不重复拉同一运营商。新增运行时契约验证无关 Toei 行被排除；实时位置、浏览器契约 45/45、性能生命周期和车型回归通过。 |
| 都营压缩 TripUpdate 与终点补全（2026-10-28 JST） | 真实都营 GTFS-RT 的 `stop_time_update` 使用 `stop_sequence=1`、到达事件=2、出发事件=3，当前没有 `stop_id`；统一解码器已同时兼容该布局和标准布局，按 `stop_sequence` 稳定排序。大江户线按 A/B 环线方向及已发布站序映射 Tochomae／Hikarigaoka／Kiyosumi-Shirakawa／Shiodome 等明确终点；其他都营线路在 VehiclePosition 当前站序与 canonical 站序能对齐时补终点，靠近端点但方向仍有歧义的中段记录保持空值，不伪造终点。真实接口回放合并 69 条位置中 68 条得到可信终点（Asakusa 12/12、Shinjuku 9/9、Oedo 26/26、Arakawa 8/8、Mita 13/14）；剩余 1 条 Mita 在 Nishi-Sugamo 中段且源数据同时缺少 `stop_id` 与方向，两个端点均可能，保留空值是证据规则要求。重复的 `_gtfsOrderedStops` 定义已删除。 |
| 实时 PNG 结论（2026-10-28 JST） | 本次真实样本的 Toei `vehicle_id` 多数等于 `trip_id`，没有物理车号或车型标签；因此 `TrainVehicle.resolveRealtime` 按契约返回 UNKNOWN，渲染器保留中性点，不把 12-000/12-600、6300/6500 等混合车队按线路硬猜成 PNG。已确认车型（例如真实车号或明确 G 运用的相铁 21000 系）仍沿现有图库解析；相关都营 PNG 路径均存在。图片未出现的这批记录是源证据缺失，不是 PNG 文件路径错误。 |
| PNG 刷新签名（2026-10-28 JST） | `js/data-fusion.js` 的位置变更分类现在同时比较 `vehicleResolution`、实时解析来源/状态和车型上游确认标志；即使位置坐标不变，只要后到的车型证据投影出新的 PNG，仍会触发共享渲染器更新，不再停留在旧中性点。 |
| 都营车号字段审计（2026-10-28 JST） | 统一适配器新增 `gtfs:vehicleEvidenceKind`：`physical-vehicle-id`、`physical-vehicle-label`、`operation-derived-type`、`trip-id-only`、`missing-vehicle-identity`。VehiclePosition 与 TripUpdate 合并后保留该字段，并投影到 DataFusion 的实时位置记录；不改变车型判定，不把 `trip_id` 当车辆号。 |
| 只读实况审计（2026-10-28 JST） | 通过已授权 ODPT 接口复核：VehiclePosition 66 条（浅草 11、三田 13、新宿 8、大江户 26、荒川 8），TripUpdate 66 条；两份 feed 均为 `trip-id-only` 66/66，`vehicle_id` 与 `trip_id` 相同且没有车型标签。说明当前无 PNG 是上游没有实体车号，不是本地 PNG 路径或刷新失败；`TrainVehicle` 现已明确阻断 trip-id-only 的 `vehicle_id` 进入车型目录，后续 feed 出现实体车号时仍由刷新签名触发重新解析。 |
| 都营所属方判定（2026-10-28 JST） | 进一步核对实时运用号末尾字母：浅草线 `T/K/H/N` 分别归属都营/京成/京急/北总，三田线 `T/K/G` 归属都营/东急/相铁，新宿线 `T/K` 归属都营/京王；适配器现已写入 `odpt:trainOwner`。该层只确定“谁家的车”，不把多车型所属方硬猜成具体 PNG。当前实况样本中浅草 10 条（都营 5、京成 2、京急 2、北总 1）、三田 11 条（都营 9、东急 2）、新宿 8 条（都营 7、京王 1），大江户/荒川仍为都营。 |
| 车型覆盖审计（2026-10-28 JST） | 将当前 VehiclePosition 样本逐条送入同一 `TrainVehicle` 解析器：浅草都营车 6/6 已为 5500 形 PNG；新宿都营车 6/6 只能确定为 10-300 形，但官方仍同时存在 1・2 次车与 3 次车以后，图库没有不误导的共用 PNG，因此保持无图；三田/大江户都营及京成/京急/北总/东急/京王车仍是多车型 UNKNOWN。未发现渲染器丢失已确认 PNG 的新缺陷。 |
| 官方车号复核（2026-10-28 JST） | 再次读取都营 VehiclePosition：44 条（浅草 8、三田 10、新宿 7、大江户 19），实体 `vehicle_id` 0 条、`vehicle_label` 0 条，44 条均为 `vehicle_id == trip_id`。因此当前仍不能基于官方实时 feed 做实体车号→车型 PNG 映射；可继续接入带实体车号的官方补充源，但不能把内部 trip ID 当车号。 |
| 本轮验证 | `toei-gtfs-vehicle-type`、`toei-gtfs-direction`、`train-vehicle-pipeline`、`runtime-request-contract`、`railway-browser-contract` 45/45、`position-refresh-continuity`、`train-position-evidence-regression`、`vehicle-no-guess-policy`、三个核心脚本语法检查均通过。浏览器 file:// 现场 DOM 仍未验证，未将接口回放冒充视觉实机通过。 |

## 当前任务与阅读规则

### RUNINFO-CAUSE-20261028 — 新运行原因的统一判定与展示（REVIEW）

| 项目 | 当前状态 |
| --- | --- |
| 已知样本 / 根因 | 运行情报出现新原因时，原因短语可能被截成“の信号確認”等残片；GTFS 标准原因曾直接以中文进入按日文来源处理的融合/翻译链。前者根因是旧正则从因果连接词附近取片段，后者根因是适配层把展示语言当成事实值。 |
| 原位修复 | `js/runinfo-evaluator.js` 按因果连接词和逗号边界提取完整原因，去除句首线路主语残片及影响区间前缀，并解析全角恢复时间；明确本线停运（全线、区间、方向、部分列车）统一为 `suspended/×`，直通运行中止单独保持 `notice/△`；检测到“已恢复后仍有延误/运休”时由当前状态覆盖过去停运，改为 `delayed/△`；新增官网同类字段的统一判定：折返し运转、行先変更、减班等服务变更归入 `delayed/△`，当前“运休しています”归入 `suspended/×`，官网关于“何种情况发布运行信息”的说明文字不再被当作当前故障；`js/realtime-view.js` 的状态行在直通中止时显示“直通運転中止”，原因仍保留在详细原文中；`data/api/odpt-unified.js` 输出日文标准原因并保留 `gtfs:causeCode`；`js/delay-translator.js` 补齐 GTFS 1–12 原因及“架線に支障物”的四语展示；`js/runinfo-web.js` 不再把官网块中的“お問い合わせ”等任意文本当成运行状态，未识别时不写入缓存。未新增旁路运行情报链。 |
| 验证 | `node --check` 变更脚本通过；`runinfo-evaluator`、`runinfo-web-parser`、`runinfo-modal-sync`、`delay-translator-fulltext`、`runinfo-scope`、`runinfo-loading-state` 全部通过；停运样本解析为原因“架線に支障物”、区间“荻窪→西荻窪駅”、恢复时间“14:20頃”、状态 `suspended/×`；追加的“已于14:14頃恢复，随后仍有延误和运休”样本解析为 `delayed/△`；直通中止样本“立川→青梅駅”解析为 `notice/△`，状态行显示“直通運転中止”而非原因；消息类别“問い合わせ”保持 `notice/!`；新增验证折返し运转为 `delayed/△`、当前运休为 `suspended/×`、官网阈值说明/效果枚举文字保持 unknown；同步修正状态卡测试使用现行 `data-lines` 字段，并将加载状态测试改为检查当前代码契约。 |
| 浏览器 / 发布 | `browser runtime: NOT VERIFIED`；当前目录不是 Git 工作树，未提交、未推送、未部署。需在运行情报页回读新的 GTFS 原因卡片及详情弹窗。 |

### SCRIPT-CONSOLIDATION-20261023 — 脚本历史补丁收敛（本地持续整理）

| 项目 | 当前状态 |
| --- | --- |
| 根因 | 多个生命周期、实时覆盖、时刻表刷新和列车渲染入口重复执行相同判定；新逻辑曾叠加在旧逻辑外层，形成多层 fallback。 |
| 已处理 | `js/data-fusion.js` 合并前后台恢复兜底、实时覆盖策略和时刻表刷新入口；`js/trains-render.js` 合并列车排序与估算位置有效性过滤；`js/trains-page.js` 删除空错误监听器；同步更新对应源码契约断言；清理项目自有 JS 中 199 行版本号式历史注释/日志标记，保留第三方库版本声明；删除 `js/trains-geometry.js` 中无消费者的旧 `_spRows` 分支，并将支线间距与地图高度的历史说明合并为当前规则；进一步合并 DataFusion、渲染器和位置估算器的重复判定/清理路径，核心三文件合计减少约 2.1 KB；`js/train-vehicle.js` 合并证据唯一性、编成拆分、身份片段和重复初始化包装，文件减少约 1.4 KB；本轮将 DataLayer 收回 `data/core/db-loader.js`，LineCard 收回 `js/data-state.js`，ThroughChip 与全部列车几何收回 `js/trains-data.js`，TrainTrackLayout 收回 `js/trains-render.js`，移除 5 个旧页面入口和对应源文件，trains/realtime 分别降至 20/19 个脚本标签。 |
| 本地验证 | `frontend-smoke`、`train-fold-layout`、`train-position-evidence-regression`、`position-refresh-continuity`、车型证据/禁止猜车型、runtime architecture guard、canonical evidence snapshot guard、F1-F4 几何/服务日/换乘回归全部通过；本轮 59 项核心测试通过，全部现役 `js/*.js` 语法检查通过。 |
| 已追加 | `odpt-lazy.js` 的惰性标志收回 `data/api/odpt-unified.js`；`page-config-realtime.js` 的旅游跳过判断收回 `data/core/db-loader.js`；删除两个仅负责预置全局旗标的脚本，并保持页面加载顺序与当前行为。清理 `trains-render.js` 中 canonical 已不存在且无消费者的 `LINE_DISPLAY_OVERRIDES.Saikyo` 旧键；geometry 合并工具保留独立回放对 `_isMobileView` / `_geomKey` 的注入边界；在 `data-fusion.js` 原位合并实时回推、线路切换与融合轮询的同快照短时重复加载，保留正常 15 秒估算节奏；将 `js/line-presentation-service.js` 的英文注释完整翻译为中文，并按类别、排序、展示实体、身份关系、导出 API 五个层级整理注释；继续完成 `data-state.js`、`route-search.js`、`realtime-view.js`、`site-shell.js`、`common.js`、`history.js`、`fare-estimator.js`、`tourism-type.js`、`tourism-proximity.js`、`data/core/db-loader.js` 与 `data/core/runtime-config.js` 的说明性注释中文化；继续完成 `running-chain-resolver.js`、`search-ui.js`、`trains-page.js`、`tourism-core.js`、三类旅游详情控制器、`sightseeing.js` 与 `delay-translator.js` 的说明性注释中文化；补齐 `train-position-estimator.js` 核心位置估算注释，并继续中文化 `data/api/odpt-unified.js`、`data-fusion.js` 与 `trains-data.js` 的核心说明性注释，未改动运行逻辑；服务日/证据回归仍有既有测试夹具截取源码失败及 4 项断言失败，未修改测试掩盖。继续完成 `js/train-vehicle.js` 与 `js/trains-render.js` 的证据、车型、位置布局、动画与 SVG 交互说明性注释中文化；为源码截取型列车布局测试保留两个兼容锚点，未改变运行逻辑。两文件语法检查通过，列车折叠/布局、线路排序与路线转乘回归通过；服务日/证据回归中的既有夹具截取与断言问题仍未修改。随后修复 P0：`gen-config-bundle.js --check` 可验证生成产物同步并接入 CI；runtime architecture guard 改为忽略注释、保留字符串和 URL，不再因注释变化误计网络调用，更新真实 db-loader 计数；语言刷新契约改用稳定代码入口而非英文注释截取。P0 相关守卫、浏览器契约 44/44、运行时变更/请求契约、线路排序与列车布局回归均通过。随后进行脚本结构优化：`data/core/db-loader.js` 中的 DataLayer 收敛为 RailwayDB/UNIFIED_LINES 线路查询与实时位置缓存兼容门面，移除无消费者的第二套通用 JSON/network cache，并同步删除对应 RuntimeConfig 配置；生成 bundle 已重新同步，runtime owner 从 db-loader 的 5 次网络调用降为 2 次。架构、请求、几何、共享轨道、排序、列车布局和路线回归均通过。现役 `js/` 从 39 个降至 37 个。随后统一现役构建入口：新增 `data/core/generate-all.js`，将 `.file.js/.compact.json` 与 `data-config-bundle.js` 的生成和 `--check` 校验收敛为一条命令，并接入 CI；保留 `generate-platform-data.js`（输出当前未被引用的 `platform-data.generated.js`）和 `generate_real_timetable.js`（输出当前不存在且无消费者的 TokyoMonorail-up-manual.js）作为下一轮清理对象，未误删历史校正脚本。 |
| 结构化追加 | `js/train-vehicle.js` 的日期证据提供器已统一使用 `registerEvidenceProvider`；车型 alias 后置追加已改为声明式扩展表，并删除东京单轨被 scope 表重复覆盖的 `lineIds` 写入。文件当前 4090 行；主表追加与线路 scope 仍保留为独立事实层，未强行合并。 |
| 线路特例归并 | 荒川线实时列车号语义、New Shuttle 单线区段、鹤见线分支注记抑制已迁入 `railway_data.json` 元数据；DataFusion、位置估算与渲染层改为读取线路事实，移除对应脚本硬编码及重复判断。活动产物已重新生成并通过 `generate-all.js --check`。 |
| 契约校正 | 性能生命周期测试中依赖旧英文注释、旧变量名和旧估算入口的源码截取断言已改为稳定代码边界；没有放宽运行行为检查。性能契约当前全部通过。 |
| 未完成 | `data-fusion.js` 的运行链车型继承/计划补缺仍是复杂的单次融合流程；`odpt-links.js` 仍由生成器产出并保留为跨页面数据入口，不能直接手改合并；大体积 `vehicle-operation-evidence-data.js` 仍是独立生成数据，不与逻辑脚本混写。 |
| 发布状态 | 仅完成本地源码整理与验证；未提交、未推送、未发布。 |

### REALTIME-VEHICLE-CONFLICT-20261027 — 实时 PNG 被后置车型候选覆盖修复

| 项目 | 当前状态 |
| --- | --- |
| 根因 | 实时来源已经给出 EXACT 车型并生成 PNG 后，融合阶段继续把较弱的时刻表车型候选送入统一解析；候选冲突会返回非 EXACT，随后覆盖实时结果，列车标记因此从 PNG 退回灰点。 |
| 原位修复 | `js/data-fusion.js` 在实时车型已确认时保留实时 `vehicleResolution` 与 PNG，只记录 `vehicleEvidenceConflict` 供诊断和运行链继承保护；未新增脚本，未放宽未知车型的图片显示规则。 |
| 验证 | `node --check js/data-fusion.js`、`train-position-evidence-regression`、`train-vehicle-pipeline`、`train_vehicle_mapping_guard`、`audit_train_mapping` 均通过；实时位置/车型冲突不再清空已确认 PNG。 |
| 本轮继续处理（2026-10-28 JST） | 在 `js/data-fusion.js` 修复系统时钟回拨时的实时快照短时去重；让交接解析器在无 `window` 的离线上下文安全运行；将 `position-refresh-continuity` 与服务日回归改为按真实函数边界截取，移除生产脚本中的测试专用注释锚点。未新增第二套实时链。 |
| 用户界面修复（2026-10-28 JST） | js/trains-render.js 的列车标记标题仅保留已确认车型名称；计划车型、候选车型、未确认/未判定/车型缺失等判定文案不再展示，但内部 vehicleIdentityStatus、证据和 PNG 选择链保持不变。同步更新折叠布局与计划车型回归断言。 |
| 实时/计划职责分离（2026-10-28 JST） | 删除 `js/data-fusion.js` 中把实时 ODPT 列车与 TrainTimetable/SQL 车型和 PNG 回填的流程；`TrainVehicle.resolveRealtime` 不再消费 timetable-reference、历史计划或代表性计划图，实时仅保留反馈车号、trainOwner/operator、实时车型/编成及直接运行证据。移除 `TrainPositionEstimator.matchRealtimeVehicleEvidence` 失效公开入口；计划车型继续由 SQL/运行计划推定链提供。同步更新实时/计划边界回归。 |
| 实时车队判定补全（2026-10-28 JST） | 通过生成器写入 24 条 source-backed `realtimeOnly` family rules，覆盖 Yokohama、Nambu、Yokosuka、KeihinTohoku/Negishi、Chuo、Ome、Itsukaichi、Joban、SobuRapid 及明确特急号；新增 `odpt:carComposition` 实时字段传递，并以 JR 东日本官方资料限定宇都宫线 3/6 辆编成为 E131系600番台；补齐原始实时车号匹配，覆盖 2253M、特急日光 8126M、特急サフィール踊り子 8004M；加入 `realtimeScope` 种别/编成过滤，`_plannedRun` 阻止这些实时事实进入 SQL 计划。429 行 HAR 回放得到 277 条 EXACT 且 277 条均有 PNG；152 条混合车队记录因原始实时缺少车型/车号仍保持 UNKNOWN，未用灰点隐藏或计划车型替代。追加都营 GTFS 实车号规范化：`12-611F`、`12-618` 等带连字符格式现在与 `12611` 等无分隔格式统一判定为都営12-600形/12-000形，避免 Oedo 实时字段已提供车辆号却落成灰点。 |
| 大江户线环线方向适配（2026-10-28 JST） | 都营 GTFS-RT 适配器按实时 `trip_id` 的 A/B 运用证据将大江户线映射为 `InnerLoop`/`OuterLoop`，不再把环线段错误压成 `Inbound/Outbound`；无 A/B 证据时保留 GTFS 方向回退，光丘开口尾段继续由渲染器按终点处理。新增 `tools/toei-gtfs-direction.test.js`，与车型规范化测试分离。 |
| 大江户线车型批次映射（2026-10-28 JST） | 都营 GTFS 实车号继续在共享适配器内按 12-600 编组范围归并到现有 PNG 代表图：12-611～618 为 1 次车，12-621～681 为前期车，12-691 及以后为后期车；12-000 4 次车保持原规则。未知车号仍返回通用 12-600 形，不用计划车型或灰点替代实时反馈。 |
| 都营全线 GTFS 实时适配（2026-10-28 JST） | 统一补齐浅草 5500、三田 6300/6500、新宿 10-300 批次、日暮里・舎人 300/320/330 的实际车号格式（编成号、车号、F 后缀）；TripUpdate 现在传递车型与 trainOwner，合并到 VehiclePosition 时不再丢失。继续保留荒川线按 33 辆实际车号的唯一解析，不把 ODPT 行程号当车辆号。 |
| 都营站点编号解析修复（2026-10-28 JST） | 修复 GTFS 站号正则将 `\\d` 当成字面量的问题；`A01/I02/S12/E05/K03/NT01` 现在按线路站序解析，不再因站点无法解析而丢弃实时列车。 |
| 都营 VehiclePosition 字段修复（2026-10-28 JST） | GTFS-RT `VehiclePosition.stop_id` 标准字段为 7，旧实现误读字段 6（拥挤度）导致缺少坐标的都营行全部被丢弃；现已按字段 7 解码，并加入最小 protobuf 回放回归。 |
| 本轮验证（追加） | `runtime-har-replay` PASS（429 rows, 277 EXACT/PNG）；新增 `toei-gtfs-vehicle-type.test.js` PASS；`train_vehicle_mapping_guard`、`audit_train_mapping`（0 unresolved artwork paths）、`vehicle-no-guess-policy`、`canonical-evidence-snapshot-guard`、车型流水线与主要线路回归 PASS。`scoped-planned-vehicle-rules` 的 Boso shared-artwork 断言、`remaining-planned-vehicles` 的 BanetsuWest missing-art 断言仍为既有失败。浏览器实机仍未验证。 |
| 本轮验证 | `train-vehicle-pipeline`、`chuo-main-planned-vehicles`、`saikyo-sotetsu-vehicle`、`subway-planned-vehicles`、`chuo-sobu-operation-evidence`、`keiyo-operation-evidence`、`train-vehicle-icon-resolution`、`planned-vehicle-inference`、`train-position-evidence-regression`、`realtime-handover`、`position-refresh-continuity`、三个核心脚本 `node --check` 均通过。`scoped-planned-vehicle-rules` 与 `remaining-planned-vehicles` 仍有既有计划图库断言失败，未归因于本轮实时边界修改。 |
| 实机边界 | 侧边浏览器实机回读未完成：Computer Use 在获取当前 Chrome URL 时无法建立足够置信度，按安全策略停止；因此未把 file:// 页面运行状态冒充为浏览器通过。 |
| 浏览器 / 发布 | 尚未完成 file:// 浏览器回读；当前目录不是 Git 工作树，未提交、未推送、未发布。刷新 `trains.html#TobuIsesaki` 后重点观察同一实时列车是否仍保持 PNG。 |

### TRAIN-VIEW-ROUTE-STATE-20261027 — 线路切换残留系统成员修复

| 项目 | 当前状态 |
| --- | --- |
| 已知样本 / 根因 | `trains.html#TobuIsesaki` 的 DOM 中出现 `odpt.Train:Tobu.Tojo...` 方向标签。`trains-page.js::showLineView` 从多成员的東上線视图切到单线路伊勢崎線时没有清空 `currentSystemLineIds`，旧的 Tojo 位置依赖因此可能继续参与当前地图。标签本身的 `display="none"` 是碰撞折叠结果，不是车型或字体问题。 |
| 原位修复 | `js/trains-page.js` 现在每次路由切换都重新设置系统成员；单线路或缺少 presentation 成员时明确置空，避免旧系统成员跨线路泄漏。未在 `trains-render.js` 增加线路专属过滤或补丁。 |
| 验证 | `node --check js/trains-page.js`、`js/trains-data.js`、`js/data-fusion.js` 通过；`tests/trains-transfer-map.test.cjs`、`tests/railway-browser-contract.test.cjs` 及 `tests/train-position-service-day.test.cjs` 当前均通过（服务日 43/43，浏览器契约 45/45）。 |
| 浏览器 / 发布 | file:// 浏览器回读尚未验证；当前目录不是 Git 工作树，未提交、未推送、未发布。刷新后应重点确认从 `#Tojo` 切到 `#TobuIsesaki` 不再保留 Tojo 标签。 |

### GALLERY-COVERAGE-20261024 — 列车图库与车型目录全量核查（部分完成，待来源补齐）

| 项目 | 当前状态 |
| --- | --- |
| 核查范围 | 扫描 `images/列车` 全部运营商目录，共 550 张 PNG；对照唯一车型责任脚本 `js/train-vehicle.js` 的 `asset` 与 `plannedAsset`，不按文件名自动猜车型。 |
| 当前覆盖 | 331 条 canonical 车型记录；264 张正式可选图；53 张计划图路径；正式图和计划图路径均无失效引用。 |
| 实际缺口 | JR 西日本原先 64 张“缺口”实际是已下载但缩写命名的素材，已统一命名并登记；图库完全未进入车型目录的数量由 309 张降至 245 张。 |
| 原位修复 | 在 `js/train-vehicle.js` 登记 64 张 JR 西日本素材；统一为 `JR西日本_车型_变体.png`，保留无法从缩写确认的原始变体代码；补入 C57/SLやまぐち、103系播但、113系福知山、205系/223系/225系阪和、187/189/287/289系福知山・山阴・纪势、271/281系关空、283系纪势、321系片町/东海道/大阪东、323系大阪环状、681/683系湖西・东海道、227系和歌山・纪势、207系京阪神网络、213系山阳・赤穗、221系大阪环状・大和路、117系 WEST EXPRESS 銀河、273系やくも、285系サンライズ出雲、KiHa40/41/47 山阴地区、KiHa120 中国地区变体，以及 N700/500 系山阳新干线等明确 `lineIds`，其余变体不按缩写强行归线；更新 `tools/vehicle-image-lock-baseline.json`，并扩展既有 `tools/gallery-sync.js` 审计口径。未新增脚本，未用泛称车型覆盖变体。 |
| 本轮站点核对（2026-10-28 JST） | 通过 Train Front View `btfv-e5.htm` 确认 `e12bap.png` 为ばんえつ物語的 DE10 图，导入并绑定 `jr-east-de10-banetsu-plan`；通过 `btfv-toq2.htm` 确认标准 `伊豆急 / Izukyu 3000` 条目，导入 `izq3000bl.png` 并绑定 `izukyu-3000-plan`。`btfv-pthk2.htm` 未发现会津 AT-700/AT-750 精确图，继续按无图标规则，不以 AT-650 等近似车型替代。|
| 验证 | `gallery-sync`、`train_vehicle_mapping_guard`、`vehicle-audit`、`vehicle-image-lock.test`、车型禁止猜测、图标解析和计划车型回归均 PASS；图库中有 0 条失效 canonical 路径，537 张 PNG 已锁定。 |
| 未完成 / 限制 | 其余 245 张仍需逐批确认车型/线路/编成来源，不能仅凭文件名硬绑；当前目录不是 Git 工作树，未提交、未推送、未发布。 |

### VEHICLE-CATALOG-CONTINUATION-20261024 — JR西日本剩余车型范围收敛（本地完成）

| 项目 | 当前状态 |
| --- | --- |
| 原位修复 | 在现有 `js/train-vehicle.js` 中将关西地区 KAN 变体规范为 `JR西日本キハ120系（関西地区・KAN）`，限定到 `KansaiMain`；将 `JR西日本122系` 规范为 `JR西日本キハ122系`，限定到 `HimejiLine`；补齐明确车型范围的京叶、武藏野、常磐快速、南武支线、日暮里・舎人、埼京・川越、八高・川越、日光／鬼怒川直通特急、中央／信越／高崎／房总、东京 Metro、京急、京王、京成、小田急、东急、东武、西武、相铁、都营、东叶高速、临海、新交通、单轨与都电条目。通过单一线路范围覆盖表统一写回既有车型记录，未新增脚本。 |
| 判定边界 | `キハ35系` 已确认是 JR 西日本历史退役车辆，素材保留但不绑定现役线路，避免把历史图库当作当前车型证据。 |
| 来源 | 关西本线现役キハ120系参照 [JR西日本保有車両一覧](https://www.westjr.co.jp/company/business/material/pdf/list_rolling_stock.pdf) 与关西本线车辆资料；キハ122系按 JR 西日本姫新線投入资料归类。 |
| 验证状态 | `node --check js/train-vehicle.js`、`train_vehicle_mapping_guard`、`canonical-evidence-snapshot-guard.test`、车型图标解析、禁止猜车型、图片锁定、车型流水线、运用证据提供器、`vehicle-audit` 与 `gallery-sync` 均通过；当前 331 条 canonical 车型、550 张 PNG、0 条失效图路径；当前运行时仍有 58 条未绑定线路，主要是历史、计划库、跨区域泛用车或项目未建线路；未提交、未推送、未发布。 |

### CHUOSOBU-THROUGH-SCOPE-20261024 — 中央・总武各站停车直通车型范围修复

| 项目 | 当前状态 |
| --- | --- |
| 根因 | E231系800番台、东京 Metro 05/07/15000系和东叶高速2000系原先只登记在东西线；中央・总武线的直通计划因此无法命中原生 PNG，落成候选或灰点。 |
| 原位修复 | 在现有 `js/train-vehicle.js` 的线路范围覆盖表中补入 `ChuoSobuLocal`，保留 `Tozai`、`ToyoRapid` 原有范围；没有新增脚本，也没有把 Metro 多车型候选强行选成单一车型。 |
| 验证 | `chuo-sobu-operation-evidence.test.js`、`planned-vehicle-inference.test.js`、`train-vehicle-icon-resolution.test.js` 与 `node --check js/train-vehicle.js` 均通过；E231系800番台和东叶高速2000系计划样本已能得到原生 PNG。 |

### KEIYO-VEHICLE-20261024 — 京叶线实时标记灰点（部分修复，待浏览器回读）

| 项目 | 当前状态 |
| --- | --- |
| 已知样本 / 根因 | 2026-10-24 生成的京叶线 SVG 中 13 个实时标记全部为 `data-marker-kind="unresolved"`。根因不是 `trains-render.js` 未执行，而是实时公开车号（如 `611Y`）与证据表的运用番号（如 `11Y`）没有在 canonical 证据入口统一匹配；当天 Supabase 原先也没有京叶线编成观测。 |
| 原位修复 | `js/train-vehicle.js` 在现有 `TrainOperationEvidence` 入口内复用京叶／武藏野车号归一化：仅当网络范围明确且存在同日、同运用、唯一车型与来源时，允许实时车号命中运用证据；补充偶数 `E` 车号向奇数运用号的归一化（如 `612E→13E`），并把当天公开运用表中已有编成的 `07E/09E/11E/39E/41E/51E/53E/63E/73E/75E/77E/79E/83E` 纳入现有京叶证据提供器。未新增脚本。 |
| 当日证据 | 按 [loo-ool 京叶线运用表](https://loo-ool.com/rail/B/) 核对并写入 Supabase `operation_vehicle_observations`：11Y→E233系5000番台・502，13E→E231系0番台（武藏野线）・MU20，45E→E231系0番台（武藏野线）・MU33，以及当天已登记的武藏野直通编成；实时 API 本身没有车型/编成字段。当前本地大体积生成快照未通过 exporter 覆盖，运行时由现有 `train-vehicle.js` 责任提供器承接这批新增事实。 |
| 当前结果 | 在重新加载当前源码的运行时中，已登记的武藏野直通运用可按公开编成命中；`611Y`、`612E`、`445E` 已验证为 `EXACT` 并有原生 PNG。当天来源仍未登记编成的京叶 `Y` 运用和部分 `E` 运用继续保持灰点；武藏野 209 系虽已判定车型，但当前素材库没有对应武藏野色 PNG，因此不能拿京叶色图片冒充。 |
| 验证 | `keiyo-operation-evidence`、`canonical-evidence-snapshot-guard`、`train-vehicle-icon-resolution`、`node --check js/train-vehicle.js`、JSON 解析均 PASS；快照共 454 条记录。完整 exporter 尝试因匿名 Supabase 角色无 `train_operation_mappings` SELECT 权限而未完成，未覆盖旧快照。 |
| 发布 / 限制 | 当前目录不是 Git 工作树；未提交、未推送、未发布。file:// 浏览器尚未回读，需刷新 `trains.html#Keiyo` 后确认 3 个对应标记；其余灰点是证据缺口，不是图片加载失败。 |

### REALTIME-MAPPING-20261024 — 当日运用观测进入实时车型解析（本地完成，待浏览器回读）

| 项目 | 当前状态 |
| --- | --- |
| 根因 | 当天 Loo-ool 运用表已经有编成，但实时入口没有把当天京叶／武藏野观测与 ODPT 公开车号连接到同一解析上下文；例如 `614Y` 可归一到 `15Y`，却仍落成灰点。 |
| 原位修复 | 在现有 `js/train-vehicle.js` 的京叶／武藏野证据提供器内登记 2026-10-24 当天有明确编成的运用；`js/data-fusion.js` 将 `positionSource: "realtime-api"` 传入同一 `TrainVehicle.resolveRealtime` 入口。当天观测只在真实实时上下文启用，计划与日历参考不被日期观测污染；删除当天武藏野表与休日参考表的重复数据，改为复用同一车型表并保留当天来源/日期标记。未新增脚本。 |
| 已验证 | `614Y → 15Y → E233系5000番台 → 506 → JR東日本_E233系5000番台.png` 为 `EXACT`；`612E → 13E → E231系0番台（武藏野线） → MU20` 为 `EXACT`；无当天编成的 `613Y` 保持 `UNKNOWN`；209系当天可判车型但因图库没有对应武藏野色 PNG，不冒用 E231 图片。 |
| 门禁 | `keiyo-operation-evidence`、中央・总武实时证据、`train-position-evidence-regression`、车型 pipeline/icon/no-guess、`vehicle-audit`、`gallery-sync`、`vehicle-image-lock` 均通过；`position-refresh-continuity.test.js` 仍在既有 FULL 融合场景第 64 行出现空位置断言失败，未将其误报为本轮通过。 |
| 来源 / 限制 | 当日京叶／武藏野运用表来源为 [loo-ool 京叶线](https://loo-ool.com/rail/B/00/20261024/) 与 [loo-ool 武藏野线](https://loo-ool.com/rail/M/00/20261024/)；未录入页面没有明确编成的运用，Fukuchiyama 等不提供 JR East ODPT 实时位置的线路仍不能伪造实时车型。当前目录不是 Git 工作树，未提交、未推送、未发布。 |

### JR-SERVICE-PATTERNS-20261024 — 湘南新宿线 / 上野东京线运行模式收敛（本地完成，未发布）

| 项目 | 当前状态 |
| --- | --- |
| 根因 | 湘南新宿线是两组公布的运行系统而非四个边界任意组合；上野东京线是跨既有线路的服务走廊，不能作为独立物理线路或普通列车交接边。 |
| 实施 | `data/core/railway_data.json` 增加两条湘南新宿运行模式与三条上野东京运行模式及来源；`js/running-chain-resolver.js` 只在同一 canonical 模式内合并候选，模式冲突保持未确认；`js/data-fusion.js` 明确阻止上野东京走廊重新进入实时交接；`js/trains-data.js` 将模式事实纳入静态缓存签名和运行数据。未新增脚本。 |
| 地图表现 | 湘南新宿线在大宫只显示宇都宫/高崎侧，在大船只显示横须贺/东海道侧；上野东京源数据保留，但继续不生成独立物理线路卡或列车交接。同步 `railway-data.file.js` 与 `railway_data.compact.json`。 |
| 验证 | `tests/train-position-service-day.test.cjs`、`tests/trains-transfer-map.test.cjs` 共 48 项通过；铁路几何/浏览器契约、终端一致性、直通标签布局、线路身份覆盖、frontend smoke、runtime architecture guard、canonical evidence snapshot guard 均通过；file/compact canonical bundle 一致。 |
| 发布状态 | 本地源码与生成产物已完成；当前目录不是 Git 工作树，未提交、未推送、未执行 Pages 或 Supabase 发布；file:// 浏览器真实回读因浏览器策略未验证。 |

### UTSUNOMIYA-LRT-20261023 — 宇都宫芳贺 LRT 线路、运营公司与 PNG 入库（源码已修改，待验证）

| 项目 | 当前状态 |
| --- | --- |
| 来源 / 实施 | 按宇都宫ライトレール官方路线图登记 19 个停留场；运营商 key `UtsunomiyaLightRail`，线路 ID `UtsunomiyaLRT`；用户提供的黄色标志已转换为 `images/鉄道/宇都宮ライトレール/宇都宮芳賀ライトレール線.png`。 |
| 拓扑 / 换乘 | `Utsunomiya-LRT-East` 独立于 JR `Utsunomiya`，通过 canonical `transferStations` 的 `toStation` 声明连接 `UtsunomiyaJR`、`TohokuShinkansen`、`Nikko`、`Karasuyama`；沿用 `trains-data.js` 现有双向镜像逻辑显示换乘图标，未新增脚本。 |
| 生成 / 验证 | canonical JSON、station_i18n、compact/file 构建产物已重生成；待执行语法、canonical、architecture、frontend 与换乘相关测试。 |
| 发布阻塞 / 修复 | `60021801` 已推送 `main`；首次 push 的生产 Chromium 启动超时后自动恢复旧版，授权发布因 WebKit 冷安装超过 35 分钟被取消；已将 `.github/workflows/ci-cd.yml` 的旅游验收窗口放宽到 60 分钟，未跳过验收，待重新推送确认。 |

### CI-CD-DOMAINS-20261022 — 新架构所有者分离与 main 自动发布（源码实施、Actions 待验收）

| 项目 | 当前状态 |
| --- | --- |
| 基线 | ef226ca99989；同一 main 非强推提交，未建立分支或 PR。 |
| 修改 | 唯一 `.github/workflows/ci-cd.yml`，两个现役工作流结构验证脚本、原 CI 设计报告、PROGRESS 与精确哈希声明；本轮将 main push 接入既有验证→构建→Pages→线上验收→登记链，保留手动授权/回滚入口；不触及前端 JS/CSS、Supabase、PNG、版本。 |
| 责任域 | Validate 负责契约/请求 owner；Canonical Data 管运行图、服务日、证据、车型与 SQL 迁移；Railway Chromium 管列车、线路图和方向字幕；Tourism Chromium/WebKit 独立负责地图/图集/BFCache；Release Guards 管资产与 ODPT 凭据。 |
| 发布保障 | 原保护检查名字保持；构建/部署明确等待五个 owner，main push 自动发布、手动 main 仍需显式授权，`_site` 不可变发布与线上字节/浏览器验收及验证过的回滚代码原样保留。PR/其他分支不发布。 |
| 本地验证 | 新工作流、发布门禁和 RunInfo 断言需执行完整语法与静态拓扑验收；已同步 main push 自动发布断言，远端 CI、浏览器、生产状态待本轮 run 验收。 |
| 已知风险 | Narita/Tsurumi 字幕碰撞是否完全修复，必须由新 HEAD 的 railway browser 真实结果判断；测试分域不允许放宽字幕零重叠要求。 |

### TRAIN-EXISTING-LINE-VEHICLE-20261022 — renderer 消费已有线路车号范围 PNG 与车型判定（本地完成，需重新发布）

| 项目 | 当前状态 |
| --- | --- |
| 已知样本 / 根因 | 部分位置对象只携带上游 `vehicleResolution`，或只携带来源明确的车号范围与 PNG 关系，renderer 没有把已有线路结果投影到列车标记；同时不能把 UNKNOWN、NARROWED 或计划候选误升级为实车车型。 |
| 实施范围 | `js/trains-render.js` 支持明确的 `xxxx-xxxx=ooo.png`（`existingLinePngRanges` 等上游范围表），并补入已有规则：千代田 `01S-61S`、小田急 `C11-C23`、东西线/东叶高速 `50T-68T` 偶数；JR 特急按线路、车种和车号范围映射 E657、E353、E257-5500、E653、E751、E259、E257-500、253、E257-2000/2500。范围命中现在同时投影来源明确的 `vehicleName`、`vehicleType`、`vehicleResolution` 和 PNG，地图标记标题与图标共用该投影；前缀/后缀一致且落在闭区间时使用唯一 PNG，越界、冲突或非法路径 fail-closed；普通 JR 车不会因 `M` 后缀触发特急图。嵌套 EXACT 结果继续兼容，PNG 仍交给 `TrainVehicle.selectMarkerArtwork` 唯一选择；计划、NARROWED、CONFLICT 不会被内置范围表覆盖。 |
| 测试 | `node --check js/trains-render.js`；`tools/train-render-existing-line.test.js` 新增范围命中车型名与标记标题回归，并覆盖 JR 各线路特急、N'EX/しおさい/日光车号段、普通车隔离、5 组既有规则、线路隔离、特急类型、偶数限制、命中、越界、冲突及嵌套 EXACT；`train-position-evidence-regression`、`train-fold-layout`、`frontend-smoke`、`train-vehicle-pipeline`、`train-vehicle-icon-resolution`、`train-terminal-consistency`、`git diff --check` 均通过。 |
| Commit / Push / 生产 | `d350f1e9` 已提交并推送 `main`；本轮配置自动发布后，后续 main push 将重新发布并在验收通过后登记。当前车型修复需等待本轮 workflow 完成后回读。 |

### TRAIN-MARKER-TOOLTIP-20261022 — 移除列车标记原生悬浮标题（源码已修复，生产未发布）

| 项目 | 当前状态 |
| --- | --- |
| 日期 / 执行者 | 2026-10-22 20:46 JST；Codex；基于 `main` 最新提交 `6727f4e9`，无新分支或 PR。 |
| 已知样本 / 根因 | 列车 SVG 标记由 `js/trains-render.js` 创建 `<title>` 和 `title` 属性，浏览器显示包含列车号、车型、目的地、位置来源与更新时间的原生悬浮内容。 |
| 修复范围 | 原位改写列车标记辅助标签更新：删除 `<title>` 子元素及 `title` 属性；保留 `aria-label`，并在实时刷新时清理旧标题。同步更新 `tools/train-position-evidence-regression.test.js` 与 `tools/train-fold-layout.test.js`。 |
| 验证 | `node --check js/trains-render.js`、`train-position-evidence-regression`、`train-fold-layout`、`frontend-smoke`、`git diff --check` 均通过。 |
| Commit / Push / 生产 | 待提交并推送 `main`；本轮未授权生产 Pages 发布，需另行授权后执行线上回读。 |

### TRAIN-MAP-CAPTION-20261022 — 线路图方向字幕仅显示目的地（源码已修复，生产未发布）

| 项目 | 当前状态 |
| --- | --- |
| 日期 / 执行者 | 2026-10-22 JST；Codex；基于 `main` 的 `e5fc3636`，无新分支或 PR。 |
| 已知样本 / 根因 | `js/trains-render.js::appendTrainLabels` 将已解析的列车等级与目的地拼成地图 `<text class="train-label-dir">`，产生“快速 · 立川”。 |
| 修复范围 | 地图方向字幕改为只写目的地；服务类型继续保存在 `data-label-type`，折叠列车列表单独组合显示“快速 · 立川”，不改变数据来源或运行判断。 |
| 验证 | `node --check js/trains-render.js`、`train-fold-layout`、`train-position-evidence-regression`、`frontend-smoke`、`git diff --check` 均通过；覆盖多语言地图字幕和折叠列表。 |
| Commit / Push / 生产 | 待提交并推送 `main`；本轮未授权生产 Pages 发布，需另行授权后执行线上回读。 |

### CAPTION-LOCAL-LATERAL-20261022 — 多语言线路图字幕最后近邻侧移（源码已修复，CI 待验证）

| 项目 | 现状 |
| --- | --- |
| 来源日志 | 新 CI 的 F1–F4 回放 `Narita/1280/ja,en,zh,ko` 全通过；`Tsurumi/1280/ja` 的方向字幕（655.326,462.738;48.134×19）与静态 Bentembashi（593.627,469.619;84.016×39）重叠；浏览器零重叠断言继续保持。 |
| 根因 | 上下 16px、左右 16px 和自身车标另一侧都找不到合法位置时，旧 `resolveLabels` 返回原位。该次水平方向至少需要约 25.316px 离开站名，但不能靠恢复无界长距离移动或引导线实现。 |
| 通用修正 | 现役 `js/train-track-layout.js` 增加最末尾的、由 `js/trains-render.js` 按真实字幕及图标宽度提供上限的水平近邻候选，最多 40 个屏幕像素；只在先前候选都失败时使用，所有候选仍需通过静态站名、其他列车字幕与图标、地图边界检查。 |
| 影响范围 | 无线路 ID 和语言特判、不动 CSS/车标位置、不简写方向/终点、不生成 data-train-caption-link，不变更 `+N` 及实时/推定数据语义。 |
| 本轮验证 | 修复前的受限三障碍几何可复现原位碰撞；修复后字幕侧移约 25.316px，站名/标记无遮挡、与自身图标紧邻。新回归左右镜像 12 条断言通过；通用渲染器级模拟通过，三个变更脚本 JS 语法通过。 |
| Commit / 生产 | 直接推入 `main`；受保护测试 SHA256 契约已添加。尚未确认远端完整 F1–F4 `after/stress`、移动端、Chromium/WebKit 全绿，亦未执行生产 Pages 部署。 |

### CAPTION-SIDE-PLACEMENT-20261022 — 英文长方向字幕避让（实现完成，远端 CI 待核实）

| 项目 | 当前状态 |
| --- | --- |
| 根因与影响 | F1–F4 Narita / en / 1280px：机场支线长字幕被列车图标和静态 Narita-Airport 站名夹住，原有限位移兜底返回原位导致浏览器零重叠断言失败；JA 同屏已通过，但跨语言共享根因未覆盖。 |
| 修复 | `js/train-track-layout.js` 为有限避让失败的字幕搜索车标上下侧紧邻位置；`js/trains-render.js` 提供标记的真实屏幕包围盒上下 4px 候选坐标；不移动标记、不生成引导线、不改 CSS、字幕内容及 `+N` 折叠。 |
| 验证 | 利用失败日志里的英语站名字框及代表性列车标记区域，布局函数级验证字幕在标记上侧、无遮挡；15 辆密集列车跨 ChuoRapid／Joban／JobanMain 均保留 3 可见 / 12 折叠、输入顺序稳定。更新原 `tools/train-fold-layout.test.js` 为语言无关行为测试，并登记受保护测试文件前后 SHA256。 |
| 部署/限制 | 已直改 main；Chromium F1–F4 完整运行、实际生产发布及公开缓存回读未确认。旧 CI 失败仍需以新 HEAD 的真实运行结果关闭，不能将函数级结果标为整个 CI 已通过。 |

### CI-CD-CURRENT-ARCH-20261022 — 基于现役架构重写 CI/CD（源码完成；远端验收待核实）

| 项目 | 当前状态 |
| --- | --- |
| 日期 / 执行者 | 2026-10-22 JST；ChatGPT，直接更新现有 `main`；未建立 PR 或分支。 |
| 范围 | `.github/workflows/ci-cd.yml`、`tools/deployment-gate.test.js`、`tools/runinfo-loading-state.test.js`、CI 设计报告与受保护哈希声明。 |
| 设计 | 据 ENGINEERING §§11、13、14、README 现役 DataFusion／TrainVehicle 链路和最新列车显示 MD；从原五域并行结构重编为 Validate／Release Guards／browser-replay 三个产品验证 owner。 |
| 清退 | 33 项车型/运用专用回归退出默认 CI、原 `vehicle-regressions` 和 `layout-replay` Jobs 移除；旧 HAR 摘要逆向还原不再必跑；历史测试源码、MD 和夹具保留供专项审计。 |
| 保留 | canonical 身份、运营日/终到/跨线路、车型统一证据和图片、位置与延误状态、线路图和旅游浏览器行为、离线迁移和实体/架构/首页守卫；Release Artifact/SHA/contentId、手动授权生产、验收/回滚/登记完整保留。 |
| 静态验证 | 工作流必需依赖、单一 Pages 发布 owner、五种授权场景和生产回滚逻辑的门禁测试在内存模拟环境通过；受保护源文件 SHA256 变更声明生成。 |
| 仍需验证 | 当前 HEAD 的 GitHub Actions 实际成功状态、完整 Node/Python/PGlite/Chromium/WebKit 结果、正式部署和公开资源回读均**未确认**。不声称线上已有变化。 |
| 生产 | 未触发正式 Pages、SQL、Edge Functions 部署；CSS、车型 PNG、数据源和产品版本均未修改。 |

### REPO-CICD-20261022 — 仓库整理与 CI/CD 修复（DONE：修复提交 CI 通过，未生产发布）

| 项目 | 当前状态 |
| --- | --- |
| 执行 / 基线 | Codex；2026-10-22 JST。开工 main `95265153`，快进保留远端修复至 `76146168`；无新分支/PR。 |
| 已知样本 / 实际范围 | 近期 Actions 的 RunInfo/ThroughChip 失败已由远端修复接入；调查扩展至全部三个工作流、发布/回滚消费者及 80 个版本化回归入口。详见 [CI/CD 维护报告](docs/reports/ci-cd-maintenance-20261022.md)。 |
| 根因 / 实施 | 生产与普通验证共用排队、reusable guard 取消风险、回滚仅查最近 10 次、Node 配置过晚且混用版本、失败证据不留存；原所有者内修正，保留授权和生产验收门。另修支线显式缓存失效遗漏父线，将完整几何回归接入原 CI job。 |
| 仓库整理 | 55 个旧备份移入 `.work/backups/ci-maintenance-sync-backup2`，逐文件 SHA256 一致；忽略 Supabase CLI `.temp`。并发改动、历史 SQL、产品号保留。 |
| 本地验证 | 80 个 Node 入口全部取得通过证据（首轮失败的几何入口经原位修复后复验）；四个 Python guards、PGlite 离线迁移、三个 YAML/80 段 shell、精确哈希契约通过。F1–F4 浏览器 32 组、铁路固定 HAR 16 组、观光交互 35 组通过；1684 文件/94 资源发布包及三页挂载/返回通过，已按修复提交 SHA 再构建核验。Chromium/WebKit 加载各27组通过；日志和最终汇总 `.work/ci-maintenance/verification-summary.json`。 |
| 初次失败 / 复验 | 铁路 ChuoMain 首次长任务 2133ms 超过原 2000ms 门槛，空闲复验 16 组全过（最坏1586ms）；观光 spot 返回地图首次30秒超时，定点及后续完整 Chromium 复验通过。Windows 合并两引擎运行触及原240秒整轮期限，保留日志，分引擎完成27+27；Linux CI 原合并入口通过。未放宽门槛或改写相关产品实现。 |
| Review / Commit / Push / CI | Open Code Review Delegation Mode：8/8 可审查文件、0 跳过，另直接审查默认排除的两份测试和三份文档；精确哈希契约通过。修复 `27fea4a5ffa4109053e22eca4a349f93104dbcb1` 已普通提交并直接推送 main。[CI 39714573367](https://github.com/biubiu52011/Pixel-Tetsudo/actions/runs/39714573367) 的 Validate、Release Guards、全部浏览器和发布包构建成功；[证据同步39714573366](https://github.com/biubiu52011/Pixel-Tetsudo/actions/runs/39714573366)成功。此条文档收尾提交不改变上述已验收代码，提交身份以 Git log 为准。 |
| 生产 / 限制 | 未授权也未执行 Pages、数据库写入、Edge 部署或 Release 登记。既有数据/架构 guard warnings 保留；真实设备及生产回滚未验收。 |

### ROUTE-STATION-IDENTITY-20261021 — 全国同名站跨地区捷径防护（PARTIAL）

| 项目 | 当前状态 |
| --- | --- |
| 已知样本 | 成田机场→大阪当前寻路可经东京王子（Oji）瞬间换乘至奈良王寺（Oji），甚至转富田同名站；站名相同并非全国唯一物理站身份。 |
| 实际根因 | route-search 将同一站点字符串视为同站；canonical 数据仍有数十个跨地区站点 ID 碰撞以及部分错坐标。 |
| 本轮实施 | 在原 route-search 按线路邻近站（前后 2 站）的坐标中位数过滤明显跨区域（超过 170km）的假换乘；相邻铁路站间连通和同城换乘保留。重置图缓存时同时重置分层/距离索引。 |
| 验证 | 真实 canonical 成田机场→大阪、东京→新大阪 + 合成同名远近站图回归。当前不更改 SQL、ODPT、车型或静态地图。 |
| 未解决 | 需要源头生成全国唯一 Canonical Station ID 并保留显示名别名；本轮距离防护不能消除同名起终点搜索与站名坐标污染，缺失坐标仍可能使区分失效。正式 Pages 需另行授权和验收。 |

### DB-CONSOLIDATE-20261021 — 库表/证据链统合前置处理（PARTIAL / 无生产写入）

| 范围 | 当次只读核查与处理 |
| --- | --- |
| 事实规模 | 生产 public：47 张实体表、14 个视图、10 个自定义 SQL 函数、97 条历史迁移；Edge 为 train-runs v262、timetable-ingest v8，代码与 main 同字节。 |
| 先验重复 | operation_vehicle_observations 与 runtime_vehicle_operation_evidence 各 334 行，334 个 observation_id 一一对应且观测字段无差异；后者有 Trigger 同步与独立匿名 SELECT 策略。 |
| 阻塞差异 | 7 条 mita-namboku-meguro 记录在镜像表为 primary、当前网络策略为 fallback。原表 RLS 没有公开 SELECT 策略，派生表有；直接改成 security_invoker 视图会改变授权及前端可读性，因此暂不 DROP。 |
| 其他候选 | 覆盖策略（28/8/35）、两个网络别名表（5/35）、车型/运用规则群、重叠解析视图、ODPT 模板写入函数都需要消费方/性能/日期/权限验证。不能按表名相似立即合并。 |
| 已实施 | 增加可重复执行的只读 SQL 审计与专项报告，修正 ENGINEERING 同步工作流叙述、COMPONENTS 失效 API、文档索引及 F1–F4 历史状态。当前无 SQL DDL/DML、无 Edge / Pages 发布。 |
| 验收/限制 | SQL 只读回放确认镜像 334/334、角色差异 7、RLS 策略差异；仓库需经 main CI 验证。仅文档/审计代码改动，不宣称生产对象减少。 |
| 后续 | 非生产建立等价迁移方案并跑读写兼容/RLS/API/性能测试；合并只在逐消费者证据充足时分批实施，生产 DDL、数据更新另行明确确认。 |

详见 [数据库统合审计](docs/reports/db-consolidation-20261021.md)。

### F1-F4-20261021 — 身份、底图生命周期、紧凑支线与计划证据（PARTIAL：main 已合并，生产未完成全链验收）

> 状态补记（2026-10-21 JST）：原分支改造提交 087608e 已通过非强制快进进入 main；生产迁移 20261021024309 已存在；train-runs v262、timetable-ingest v8 回读与 main 对应代码完全一致。正式 Pages 最近已确认的 Release SHA 仍是 5978830。下表的分支/未合并/未迁移字样仅记录 Codex 当次执行快照，不应作为当前交付结论。真实运用新版认证及回填仍为 0；整页性能和 Safari 尚待验证。

| 项目 | 当前交付状态 |
| --- | --- |
| 执行 / 基线 | Codex；2026-10-21 JST。基于再次核实的最新 main `2e8d7f27`，独立 `codex/f1-f4-integration`；原工作区已有改动保持原样 |
| 已知样本 / 范围 | JC/JA/JU/SAN 九个主体；七组地图支线；224 条现役 canonical、236 个库内登记的并集 237 行。按公共根因调查身份、几何、文字/车道和计划版本 |
| 根因 / 所有者 | LineCard 按展示 code 首项刷新；geometry 缓存遗漏支线等依赖；横支线共用最长名站距、标签避让移动列车位置；TrainVehicle 多候选首图/京成后缀回退；SQL 版本/运用作用域不足 |
| F1～F3 | 公共修复与本地回放通过：稳定主体/来源/内部码/UI 分离；精确静态 revision 和重建条件；各横支线独立测量换行；站点/列车同坐标；文字避让不移动列车锚点；分叉换乘避开车道；取消失效动画并走原弹窗关闭生命周期 |
| F4 | 公共版本选择、完整运用匹配、冲突/来源回传、中性候选图标和离线 SQL 准备完成。迁移在 PGlite 验证同号版本并存、原 writer 幂等重导入与历史保留；没有另建表/融合器/推断器。真实来源核验和样本推广未完成 |
| 本地验证 | 77 个 Node 入口通过；新增八项 F1～F4 合约进入原铁路浏览器测试入口；四个 Python guards 通过、保留已知 warnings。原两份 429 条 HAR 摘要仍校验，153 项候选仅清空代表型号/图片，有逐项差异清单，不放宽基线 |
| 浏览器 | 48 组布局回放（16 原版、16 改后、16 超长四语/多换乘压力），1280/390px。改后/压力站名、列车图标/标签和换乘无碰撞，静态层/marker复用、删除/失效重建通过；256次动态刷新P95约17.4ms。原整页50ms门槛在未改main/候选均约66.7ms失败；真实手机/Safari未验收 |
| 数据 / 未解决 | 全程只读生产；92,434模板中84,579缺改正日期。Keisei的1,413模板为2025-12-15来源版本；Asakusa SQL为0但API已配置；缺独立松户实体，Yahiko缺登记。KS/MA返回403，SKS目击资料未当周期计划。0条真实运用新认证、0条生产回填 |
| Commit / Push / CI | 本变更集在上述单一实施分支交付；确切SHA、综合草稿PR与远端CI以最终交付/PR checks为准。不得把本地通过写成远端/生产通过；未合并main |
| 生产 / 回滚 | 未执行迁移、Edge发布、Pages部署、Release或版本递增，未改工作流/保护。先批准迁移与回填，再Edge/前端；回退先还原代码，新增列保留，不可强删新版本恢复旧唯一键 |

完整文件、九项验收、来源 CSV/JSON、迁移兼容性、八张前后截图和未完成边界见[综合实施报告](docs/reports/f1-f4-implementation.md)。本地备份/日志在 `.work/f1-f4`；交付证据随报告保存。F4 来源、完整 schema 非生产副本回放和原性能门槛未结项，不宣称四项全部上线完成。

### DOCS-SUBMIT-20261021 — 新版核心 Markdown 提交

| 项目 | 状态 |
| --- | --- |
| 基线 / 范围 | 基于远端 5978830135459536105c9f091479494612b9bfc3 隔离整理五份核心 Markdown，附 ENGINEERING 精确哈希契约声明；不包含代码/数据/工作流变更 |
| 内容 | 原位修复与根因范围、电子计划/有效实时分离、官方运行参考、组件单一所有权、历史/当前分级；保留远端新增生命周期、定时任务、产品身份与发布控制 |
| 验证 | PASS：27 份受跟踪 Markdown 的 202 个内部链接/锚点；保护基线精确哈希契约；既有契约及产品身份回归；产品号仍 v4.3.1070；只包含五份文档和必要哈希声明。不是产品/生产验收 |
| 提交方式 | 本地验证后直接 Commit / Push；main 如受保护而拒绝则保留同一提交推送 codex/docs-rules-20261021，不新建 PR、不绕过保护 |
| 生产 | 本轮未授权也未触发部署；现役 push/PR 不部署，产品版本不递增 |
| 原工作区 | 原 main 及其他未提交代码、数据、图片和报告保留；本次以隔离目录的提交为准 |


更新日期：2026-10-21（JST）。本页把当前任务、后续实施、验证/发布和历史证据分开。历史记录的 DONE、REVIEW、FULL/SQL 策略、PR 或发布步骤仅说明当时状态，不能覆盖现役 [工程规范](ENGINEERING.md)。旧任务阶段记录合并到对应日期折叠区，不再作为多套“当前总览”。

### DEPLOY-20261021 — 已授权生产发布（进行中）

- 用户本轮明确要求“部署上线”；在 `.work/release-20261021` 从最新远端 f916acd 隔离整合此前架构、补丁清理及页脚调整，不整体提交原工作区其他未提交改动。原工作区仍为历史基线，不能把本地 HEAD 当线上版本。
- PR #44 的 Validate、Release Guards、固定 HAR 浏览器回放（含 Chromium/WebKit 观光验收）、发布包构建四项全部成功，已合并源提交 `5978830135459536105c9f091479494612b9bfc3`。75 个 Node 回归入口及四个 Python 守卫通过，保留既有 warnings。
- Supabase `train-runs` v258、`timetable-ingest` v8 已部署，回读源码与发布提交一致；FULL 不再提前拦截 SQL 计划，既有山手线522班/川越3班及 partial 标记正常，导入方法/凭据拒绝边界正常。未触发实际时刻导入或修改数据库内容。原源码备份在 `.work/release-backend-backup`，原网站成功回退 run 为39411895450。
- 前端生产 run：[39503302347](https://github.com/biubiu52011/Pixel-Tetsudo/actions/runs/39503302347) 正在运行；产物预期1607文件、94项线上字节校验，网站是否上线以完成后的真实回读为准。产品版本未递增，build 参数/内部发布身份保留。
- 本地浏览器：七页手机宽度各一个 Header/Nav/Footer、无重复ID/横向溢出；四语 Footer 均仅版权与站名。审计F1–F4未在本次发布中实施；原237线审计快照不等同于基于远端整合后的224线发布内容。
- 发布审查：Open Code Review Delegation Mode，29个可审查条目中23个审查、6个生成/压缩条目明确跳过独立语义审查（另做一致性/回归验证）；报告 `.work/release-review.json`，验证 `.work/release-verification`。

### TARGETED-20261021 — 指向性脚本审计与页脚版本核验

| 项目 | 本轮状态 |
| --- | --- |
| 范围 / 执行者 | Codex；代码只读审计、诊断回放、页脚核验；新增审计报告，更新 README 页脚约定和本条记录，保留既有产品改动 |
| 已知样本 / 筛选 | 全部 237 条 canonical 线路；50 个一方 JS 的线路引用与条件候选；七页 67 个脚本入口，含 21 个证据脚本；按身份冲突、支线拓扑、环尾、来源编号和 Provider 范围调查 |
| 通用根因 | F1：LineCard 按展示 code 找第一个主体，JC/JA/JU/SAN 四组重号，回放确认 Kawagoe→SaikyoKawagoe、UtsunomiyaJR→Takasaki、JR Yamada→Tobu Sano；Ome/Itsukaichi 排除只避开部分症状。F2：几何缓存未计支线依赖，七组父线均复用旧坐标。F3：同一混合拓扑因 Narita ID 改变像素/锚点，属于公共布局模型缺口 |
| 真差异 / 未定项 | NewShuttle 单线、Oedo 环加尾段有官方依据，应以正式数据和共享模型表达；编号语法与带来源/日期的车型 Provider 不应一概删除。F4 Keisei 日期/后缀车型 fallback 的来源追溯不足，不能凭车辆图鉴证明运用规则；具体记录与未重新核实范围见报告 |
| 本地验证 | 237 条生产几何函数均输出有限坐标；7 组支线变更/失效回放与跨社 code 冲突回放完成；10 个相关既有检查入口通过，不代表 F1–F4 已修复。诊断变更只在内存副本，没有写 canonical |
| 页脚 / 浏览器 | 当前本地模板已无版本号，未做多余 JS/CSS 修改；Edge 七页 footer 各一、版本标记/文本为零，四语切换及 build 导航参数通过。公开首页仍是旧构建 f916acd…，显示 v4.3.1070；线上取消尚未发布，不宣称已上线 |
| 状态 / 后续 | 审计完成；F1–F4 待实施，优先公共身份和缓存，再统一布局/来源规则。遵守本轮审计授权，未擅自修业务算法；本地页脚目标已满足，线上发布仍待单独授权与验证 |
| 审查 / 证据 | Open Code Review Delegation Mode；报告见下方链接，OCR 覆盖/跳过原因在 .work/targeted-review.json；开工快照在 .work/backups/targeted-scripts-20261021 |
| Commit / Push / 生产 | 未提交、未推送、未部署；未改产品 JS/HTML/CSS、canonical、SQL、工作流或基线 |

完整分类、复现表、责任点及限制见 [指向性脚本排查](docs/TARGETED-SCRIPTS-AUDIT.md)。

### DOCS-ROOTCAUSE-20261021 — 问题样本与实际修复范围规范

| 项目 | 本轮状态 |
| --- | --- |
| 范围 / 执行者 | Codex；仅 ENGINEERING、README、COMPONENTS、PROGRESS 四份现有 Markdown，保留其他任务的本地改动 |
| 已知样本 | 用户以成田/鹤见支线布局、五日市/青梅状态归属作调查示例；本轮不认定这些对象当前故障或根因 |
| 根因 / 性质 | 规范缺少从症状样本推导影响范围的强制闭环，存在只修报告对象、遗漏公共机制的流程风险；不是本轮产品故障诊断 |
| 实际影响范围 / 所有者 | 适用于各页面、线路、运营商和数据来源的问题修复流程；ENGINEERING 统一拥有规则，README 提供测试/系统优先入口，COMPONENTS 明确公共能力及输入/拓扑类别 |
| 修改 | 写入根因分类、同类筛选、通用机制优先、六类禁令、故障/同类/正常三组回归与三种完成判定；同根因对象归同一任务，明确调查范围与写入授权分别遵守 |
| 本地验证 | PASS：19 份受跟踪 Markdown 的 164 个内部链接/锚点有效；根因分类、跨对象调查、六类禁令和三种完成判定覆盖齐全；四份文档之外的受跟踪文件哈希与本轮检查前一致，其他任务及历史记录原文保留；本轮复核沿用现有规则，不重复追加正文 |
| 文档状态 | DONE：ENGINEERING 规则与 README / COMPONENTS 引用已核对，任务记录已补齐；只代表规范落地，不代表示例线路或公共算法已经修复 |
| 未解决同类问题 | 实际产品根因与同类对象未在本轮调查/修复；其他任务的实现、回归和发布状态沿用原记录，不因规范写入自动关闭 |
| Commit / Push / 生产 | 本轮未提交、未推送、未部署；未改 JS、HTML、SQL、工作流或 Ruleset；browser runtime: NOT VERIFIED（仅文档任务） |

问题修复任务今后按 [ENGINEERING §8](ENGINEERING.md#8-开发与协作流程) 简记已知样本、根因、实际影响范围、同类/正常回归及未解决项，按 [§11.2](ENGINEERING.md#112-完成判定与允许报告的结论) 限定完成声明。历史记录不追改为本轮已完成的根因调查。

### INLINE-20261021 — 删除补丁链，修正原责任模块

| 项目 | 本轮状态 |
| --- | --- |
| 范围 / 执行者 | Codex；15 份源文件/文档/测试的本地调整，含删除旧存根与新增外壳交互回归；保留此前架构任务和其他未提交改动 |
| 外壳与语言 | SiteShell 在 header mount 内直接生成 header 同级语言入口、唯一 listbox 与静态属性；lang-init 删除 body 搬移和跨搜索组件的点击例外，用一次事件委托处理新旧 controls，响应外壳重新挂载；语言和订阅者保持有效 |
| 样式责任 | lang-bar.css 原规则直接拥有固定定位，删除 `.is-fixed` 覆盖链及其 4 处 `!important`，删除主样式越界设置语言按钮尺寸；手机保留 36px 外观并补足实际 44×44px 点击区域。观光网格列数只由 tourism-styles.css 维护，删除主样式冲突与网格 `!important` |
| 运行状态 | 删除 local-railway-data.js 及 trains 脚本引用；DataFusion 删除本地线路/状态存根、预填 loading、手动覆盖优先级与无消费者的校准标记/轮询句柄。原匹配函数直接接收 canonical 字典键，不再回写 line.id；当前 ODPT/官网 → 有时限且标为 stale 的 last-good → 缺失/失败状态 |
| 原模板错误 | realtime-view 的异步详情模板删除多余引号转义，恢复正确的状态指示样式类；正常状态清除旧异常区间。状态点属于页面自己的详情弹窗，未另建 LineCard 接口或搬移到错误组件 |
| 回归 / 浏览器 | 58 个 tools 套件、三份 node:test 共 69 项通过；后续删除死代码与修正弹窗后，相关状态/生命周期/位置/模板套件复跑通过；4 个现有 Python 守卫通过，保留既有 warnings，未改基线。新增外壳检查在开工快照上失败、修改后通过。Edge 本地七页菜单/语言切换、唯一 Header/Nav/Footer、无重复 ID、390px 无横向溢出通过；44px 点击区域四角命中；600/768px 观光单列、769px 双列通过；真实手机/Safari 未验收 |
| 审查 / 证据 | Open Code Review Delegation Mode：按 OCR 清单/规则审查本轮差异；其他既有改动逐项列为跳过。本轮备份与 SHA256 在 .work/backups/embedded-patches-20261021，审查/验证在 .work/embedded-review.json、.work/embedded-verification |
| 提交 / 生产 | 未提交、未推送、未部署；未修改生产数据库、工作流或守卫基线 |

### ARCH-20261021 — 按新版规范收敛基础数据、计划与位置链

| 项目 | 本轮状态 |
| --- | --- |
| 执行者 / 时间 | Codex；2026-10-21 JST |
| 实现范围 | 本地完成 CANONICAL-CORRECTIONS、PLAN-REALTIME-SEPARATION；完成普通实时/计划来源提示与公共列车详情；不代表后续队列全部关闭 |
| 唯一责任链 | canonical → db-loader / RailwayDB；ODPT 观测与 SQL 服务日计划 → DataFusion / Estimator；TrainVehicle 仍唯一拥有车型判定；renderer 只表达已解析结果 |
| 清理 | 删除 DataCorrectionRules 定义/调用、按线路重补索引、错误的运行时 durations 默认值；删除 DataFusion 的 manual 注入与旧 ODPT 补缺加载器，以及 RouteTimetable 的本地表回退；移除失效配置开关并重新生成产物 |
| 计划与实时 | FULL 等模式不再拦截 SQL 查询、导入或计划缺口推定；有效实时优先。保留原始来源铁路 URN，计划服务日独立于车型解析，避免同车实时/计划重复 |
| 展示 / 适用页面 | 七页共用 loader；home 的 RouteTimetable 与 trains 使用同一计划入口；trains 的单列车/折叠列表显示四语来源与时间。原大江户专用点击详情收敛为所有地图共用，支持键盘、关闭、过期撤销和语言刷新；其他六页未复制详情实现 |
| 本地验证 | 58 个 tools 套件通过；两份 node:test 文件共 67 项通过；4 个既有 Python 守卫通过（保留既有 warnings）；含 210 线路 SQL 身份回放、56 个官方季节班次日期回放、FULL 实时→过期推定→恢复去重→确认空清除及 frozen canonical 加载 |
| 浏览器 | 本地 Edge：七页各一个 Header/Nav/Footer、无重复 ID；trains 桌面与 390px 移动宽度、真实 ODPT 来源/JST 时间、普通环线点击详情、中文切换同步通过。观光地图/所有线路实况未作全面验收；真实 Safari / 手机设备未验证 |
| 审查 | Open Code Review Delegation Mode；按 OCR 文件清单/规则审查本轮修改。其他任务原有改动列为跳过，不将整个脏工作区声称为审查完成；清单及结果保存在被忽略的 .work/architecture-review.json |
| 备份 / 保留 | 开工前受跟踪源文件与 SHA256 清单保存在 .work/backups/architecture-20261021；既有工作流、车型证据、图片和其他任务改动保留；未更新守卫基线 |
| Commit / Push / 生产 | 未提交、未推送、未部署前端或 Edge Function，未改生产数据库/工作流/Ruleset；计划端变化上线须同时发布对应 Edge Function 后另行回读 |
| 遗留 | 全库计划版本/来源与官方事件派生仍按下表排队；16 个新增正式站点记录未取得可靠坐标，保留名称和既有 ID，坐标保持缺失，不继承旧补丁的猜测值 |

补正迁移逐项结论：Tonami、丸之内/鹤见支线、大江户重排、千代田和辰野已有 canonical 事实，旧补正删除；桐生/佐野/篠之井保留正式 ID 与已有坐标，修正复制错误的线路名和区间数组长度，不复制补丁里的重复 ID。正式源补入弥彦线、27 个已存在图库引用、横滨站名映射及缺失站点记录；山形线移除已废止赤岩停站，未删除任何既有 station 实体。四份铁路/站名浏览器产物重新生成且与源一致。

事实核对来源：[东武桐生线站序](https://www.tobu.co.jp/railway/guide/line/kiryu_line.html)、[JR 东日本赤岩站废止公告](https://www.jreast.co.jp/press/2021/sendai/20210120_s01.pdf)、[JR 东日本弥彦线站序](https://timetables.jreast.co.jp/cgi-bin/st_search.cgi?rosen=64)。坐标没有以近似值冒充本次核验结果。

### DOCS-ARCH-20261021 — 核心 Markdown 修订

| 项目 | 本轮状态 |
| --- | --- |
| 执行者 / 范围 | Codex；仅 ENGINEERING、README、COMPONENTS、PROGRESS、docs/README 五份既有 Markdown |
| 实现 | DONE（文档范围）；旧章节已重写/合并，代码目标未实施 |
| 本地验证 | PASS：19 份现存受跟踪 Markdown 的 155 个内部链接/锚点有效；组件路径/API 已核对；SVG 布局细则、历史 SHA/数据证据保留；五份文档之外的受跟踪文件哈希与开工快照一致；五份文档 diff 格式检查通过 |
| 浏览器 | browser runtime: NOT VERIFIED；文档任务不作产品验收 |
| Commit / Push | 本轮未执行；保留其他任务未提交内容 |
| CI / 生产发布 | 本轮未触发；未修改工作流、Ruleset、JS、HTML、SQL 或生产 |
| 来源 | 用户粘贴的最终结论 + 当前工作区源码对照；不是远端实时状态审计 |

本轮将原位修复、禁止运行时基础数据补正、运行图版本计划、实时/计划分离、官方动态参考与按列车/区间的来源提示归入现役规范。README 保留 SVG、响应式、字体、图库和多语言细则；COMPONENTS 删除淘汰入口、核对真实 API；日志按日期归组，规则/重复问卷归并到 ENGINEERING。

## 后续实施队列

下列是代码与目标的差距，不是本轮已经完成的修复；实施前应重新核对当时源码和用户任务范围。

| 优先级 / 任务 | 本地证据或历史依据 | 实施要求 | 状态 |
| --- | --- | --- | --- |
| P0 CANONICAL-CORRECTIONS | ARCH-20261021 已删除补正并生成正式产物，不可变加载回归通过 | 保持 loader 只加载事实与索引；缺坐标另按来源核实 | DONE（本地） |
| P0 PLAN-REALTIME-SEPARATION | ARCH-20261021 客户端、融合、读取/导入端已解耦；FULL 全生命周期回放通过 | 发布对应前端和 Edge Function 后回读确认；生产未变 | DONE（本地）；生产待发布 |
| P0 PLAN-LIFECYCLE | 既有来源/日期审计仍有未决项；旧快照不代表当前库 | 以改正版本/生效日/日历/例外管理电子计划，避免旧新并存；不追求每日当班证明 | TODO |
| P1 OPERATION-REFERENCE | 尚未确认统一完成的官方事件派生入口 | 在既有融合/推定链实现工事、延误、停运、直通暂停，含范围/撤销/折返证据 | TODO |
| P1 SOURCE-DISCLOSURE | ARCH-20261021 已补普通实时/计划逐列车提示、时间和所有地图可点开详情；不再隐藏 FULL 来源说明 | 官方运行调整仍需随 OPERATION-REFERENCE 补齐事件依据与区间表达 | PARTIAL |
| P1 COMMIT-DEPLOY-SEPARATION | 远端 59788301 工作流已用 authorize_production 区分普通推送与生产 | 本轮保留；main 保护仍按现状遵守，不通过文档改写绕过 | 已有实现，本轮只核对配置 |
| P1 UI-LIFECYCLE / RUNINFO | 既有 UI-004/005、RUNINFO-004 未关闭快照 | 继续现有 DataState/公共状态语义与移动恢复；先核对已完成项，勿重建组件 | 待复核 |
| P2 TOURISM-BODY | 三观光页已有 Core/公共返回，主体仍有重复结构 | 在现有 core/controller 收敛主体，不扩大 CSP | 待复核 |
| P2 VEHICLE-GAPS | 现役车型说明仍列计划/图库缺口 | 按来源补计划候选与原生资产；不伪造实际编成 | 待复核 |

### VEHICLE-ADAPTER-20261022 — 车辆证据导出脚本输入适配（DONE：本地）

| 项目 | 当前状态 |
| --- | --- |
| 已知问题 / 根因 | `tools/export-vehicle-operation-evidence.js` 的离线结构化导入只接受 camelCase 顶层键，SQL 导出常用的 snake_case 字段及 `referenceRules` / `familyRules` 别名无法直接复用；适配边界因此可能拒绝有效导出或丢弃映射。 |
| 修改范围 | 仅修改现有导出器：在写入 canonical `vehicle-operation-evidence` 快照前统一归一化两种字段命名、顶层键、网络别名、库存、计划车型规则和车组字段；TrainVehicle 运行时、车型事实和证据优先级未改。 |
| 影响范围 | 所有使用 `--mapping-input` 或 `--structural-input` 的车辆证据导出；不新增映射表、线路专属 resolver 或实际编组推断。 |
| 本地验证 | snake_case / camelCase 映射与结构化输入回放通过；车型映射守卫、统一 TrainVehicle 管线、无猜测策略、证据 Provider、计划车型、地铁车型、部署门禁及 `git diff --check` 通过。 |
| 提交 / 生产 | 本地提交 `8e690152` 已直接写入现有 `main`；未执行 Supabase 写入、Edge/Pages 发布，生产车型状态不因本适配自动改变。 |

## 验证与发布状态

| 范围 | 已有证据 | 本轮可作的结论 |
| --- | --- | --- |
| 五份核心文档 | 本地文件、模块导出、生成器、页面 mounts 与工作流源码，链接/路径/范围检查通过 | 文档范围 DONE，不代表目标代码或生产验收 |
| 成田及既有发布 | 下方 2026-10-19 记录含 659f590e / 39226356268 等回读 | 只是当时验收，未在本轮重新查询生产 |
| 未提交产品改动 | 开工时已存在工作流、代码、数据、图片及测试改动 | 本轮保留；不能将其功能/部署算作本轮成果 |
| 新架构代码要求 | ARCH-20261021 与上方后续实施队列 | 基础补正/计划实时解耦本地完成并回归；官方事件等仍未完成；生产未发布 |

## 后续记录方式

同一任务保留一个当前条目，更新实现/验证/提交/发布状态，结束后连同实际日期、SHA、证据范围与遗留问题归入历史。沿用已有任务，不为一次验证重试另开重复条目；旧事实不删除或改写成当前成功。完整开发与交接规则只维护在 ENGINEERING。

## 历史记录（非现役开发指引）

以下保留既有执行事实、SHA、回放数量及当时状态。折叠区内的旧政策、模板与未完成队列只供追溯；现役待办以上表为准。重复的开工问卷/记录模板/交接规范已归并，不再混入当前执行入口。

<details>
<summary>2026-10-19 JST — 历史执行证据</summary>

### 2026-10-19 JST — 成田线修复（DONE：本轮缺车/方向/车型修复已发布验收；其他时刻表审计仍未全部关闭）

- 既有 #41 已合并为 main 0dae0ad8：机场站名归一化、最后计时停站的到发边界、我孙子支线屏幕方向/源站序分离、既有 Narita-manual.js 车型字段同步。未新增文件、PR、表或产品版本。
- Supabase 既有模板已原地修正240条车型标签：144 Local 为209系2000/2100候选，96 Rapid 为E235系1000；96条既有 canonical 候选投影已刷新。普通时刻、ID、日历、来源路径及修订日期未动。线上接口已回读确认，实际车型确认仍为false。
- 机场平日/休日220条班次在已发布计时窗口中点回放通过；1460M区间、2010M停站09:47–09:49与发车后终止、39项运营日及位置连续检查通过。本地浏览器已见2041M E259在机场支线，876M上野方向沿支线推进。
- 补充跨线路检查发现双端回接的ChuoTatsuno会被过宽的末端判断反转箭头。既有renderer已收紧为与geometry一致的首个接续站判断，真实canonical辰野/我孙子双向回归通过。既有#42 head 07a3242c的旧PR基线精确测试声明已补齐，检查标准未降低；四项必需检查全部通过并合并为main 659f590ef2e27a01740823830e40dcede90ea84e。
- 用户先要求保留#42、暂不部署，后明确重新授权“提交上线”。本次仅复用既有#42，不新增PR、文件或产品版本。先前正式发布39223765927已取消；本次正式发布39226356268的验证、浏览器回放、守卫、构建、Pages部署、生产验收及发布登记全部成功。产品版本仍为v4.3.1070。
- 公开estimator、renderer、track-layout及Narita-manual四个文件HTTP200，逐字与发布工作区一致；release-manifest.sourceSha为659f590e。用户原成田线标签页已刷新至该构建，已见机场4587F往空港与4818F往久里滨（计划E235系1000番台）、878M往上野（计划E231系0番台）及主线2473M（209系2000/2100候选）。连续观测中机场两车X分别338.998→350.921、325.936→310.039，上野方向Y287.565→307.843，轨道横坐标保持84.4。位置是时刻表推算，不升级为实际定位证明。
- 用户给出的ODPT目录只明确关东部分线路及限制，未逐段确认成田六区间。当前JSON与GTFS-RT采样未证明成田全区间覆盖，保留HYBRID及真实位置优先，不把时刻表推算标为FULL。

### 2026-10-19 JST — 开发残留收敛（DONE：本地改造，未提交或发布）

- 仅修改/删除既有文件，新增文件 0。删除 66 个旧文件：archive/scripts 的 43 个一次性脚本、21 个已替代旅游维护文件、独立 Pages 工作流、千代田线旧证据脚本。保留 SQL 迁移、数据快照、测试、图片和本地同步备份。
- 发布统一到 ci-cd.yml：main 的 push/手动部署均依赖 validate；PR 与发布分队列，写入权限仅属于 deploy。既有构建缓存戳及其校验保留。
- 旅游维护复用 audit-menu-images.cjs（只读审计，--list 输出明细）与 align-tourism-image-refs.cjs（默认预览，--apply 才写入；--rename-main/--rename-menu 复用旧重命名能力）。分类使用既有 TourismType；结构化修改引用，拒绝歧义、越界、缺失源和重名覆盖。未修改实际旅游数据或图片。
- 直通几何/数据/渲染直接调用 ThroughChip，删除 8 个转发壳；布局算法未改。删除无消费者的 aggregateDelayRecords，保留现有按线路隔离逻辑及其他未提交修改。千代田测试改用正式证据快照，仍覆盖三方车型、日期隔离、支线 05 系及 PNG 链路。
- 验证：60 个现有 Node 入口通过（其中页面契约 26 项、service-day 39 项），4 项 Python 守卫通过；直通标签手机/桌面共 284 个框的边界及无重叠回归通过。新增检查归入既有测试文件，未新增测试文件。OCR 离线委托规则复核本轮 16 个修改文件，删除文件无有效消费引用；没有外部模型调用。
- 真实旅游数据只读审计：516 条，破损引用 0、空文件 0、未引用图片 25、命名候选 2；修正预览 0 项，没有应用写入。架构守卫仍有既有未分类引用 33 条，未增加 UNIFIED_LINES 消费点或修改基线。全工作区格式检查另报既有 docs/reports/non-full-sql-timetables.md 末尾空行，保留用户原改动。未做浏览器现场验收、Supabase 写入、提交或推送。

### 2026-10-19 JST — Issue #43 来源与日期补丁复核（PARTIAL）

已读取Issue #43和用户提供完整检查报告；生产只读重查确认210线92322模板、84467修订日期为空、五线171排除项、十二线536单站模板且零停站0。最新JobanMain冲突失败、Keisei/TokyuToyoko空结果仍在。23176日期班次全部canonical_timetable_id为空，23173有来源URL；不能凭URL或车号推导同一周期班次。现有测试重现同号改时刻旧新并存风险；39项service-day测试及位置连续/终到/TTL回归PASS，不等于日期替代风险已修复。现役导入临时staging不保留历史排除对象，171项逐号恢复需原始归档或标明新采集时间的只读上游比对。准确现状、来源能力矩阵和最小修复边界补入既有docs/reports/non-full-sql-timetables.md。没有生产写入/导入/部署；车型和Logo遗留及逐条来源对账仍未完成。此前实时快照freshness修复只覆盖位置过期，不代表完成本Issue。

</details>

## 2026-10-28 JST — TOEI-REALTIME-FLEET-CANDIDATE-DISPLAY — PARTIAL

- 根因：当前都营 GTFS-RT VehiclePosition/TripUpdate 样本仍将 `vehicle_id` 原样复用为 `trip_id`；最新 44 条 VehiclePosition 中实体车号 0 条、车型标签 0 条，不能从实时数据唯一投影车辆 PNG。
- 处理：在既有 `js/train-vehicle.js` 中登记官方所属方可确认但车型混合的候选集合：三田线（6300/6500）与大江户线（12-000/12-600 各批次）；候选只保留在内部判定/诊断链，标题与折叠列车详情不公开“车型候选”，不选择其中一张 PNG，不改变灰点的真实性语义。
- 验证：`train-vehicle-pipeline.test.js`、`train-fold-layout.test.js`、`toei-gtfs-vehicle-type.test.js`、`toei-gtfs-direction.test.js`、`train-position-evidence-regression.test.js`、`vehicle-no-guess-policy.test.js`、脚本语法检查通过。浏览器现场刷新仍未验证；精确 PNG 仍需官方实体车号/车型字段或用户明确接受候选图模式。
- 未完成：大江户线当前只能显示完整候选集合，不能安全显示单一车辆 PNG；不以线路默认车型替代实时证据。

## 2026-10-29 JST — TOEI-OPERATION-FLEET-LIBRARY — LOCAL

- 处理：在既有 `js/train-vehicle.js` 的都营所属方判定层加入静态运用号库。三田线仅接受 `20T-89T`，大江户线仅接受 `*A/*B`；命中后保留 6300/6500 或 12-000/12-600 各批次的候选集合。
- 边界：运用号库只做长期线路/运用号约束，不保存某一天的编成分配，不抓取 loo-ool，也不把候选集合提升为单一车型或 PNG。缺少运用号、运用号后缀不匹配或实时仍只有 `trip_id` 时保持 `UNKNOWN`。
- 验证：新增错误后缀回归；`train-vehicle-pipeline.test.js`、`railway-browser-contract.test.cjs`（45/45）及既有都营、位置、请求契约回归通过，`node --check js/train-vehicle.js` 通过。
- 发布状态：当前目录不是 Git 工作树，仅保留本地修改与备份，未提交、未推送、未发布；浏览器现场仍未验证。

## 2026-10-29 JST — TOEI-OPERATION-LIBRARY-UI-BOUNDARY — LOCAL

- 调整：运用号库候选继续参与内部 `NARROWED` 判定，但不再在地图标题或折叠详情中显示“车型候选”及候选车型；未确认车型仍保持中性展示。
- 验证：列车折叠/布局、车型流水线、都营 GTFS、浏览器契约 45/45 均通过；`js/trains-render.js` 语法检查通过。

## 2026-10-29 JST — TOEI-OPERATION-LIBRARY-SOURCE-AUDIT — LOCAL

- 资料复核：官方车辆形式图确认三田线同时存在 6300/6500、大江户线同时存在 12-000/12-600；loo-ool 的三田线页面按当天运用表用符号给出车型。
- 关键边界：同一运用号并非永久车型绑定。交叉读取 `89T` 时，2025-07-23 页面为 6500 形编成，而 2026-10-28 页面标记为 6300 形；把该关系写成无日期库会产生错误 PNG。
- 结论：在没有官方当日排图或实时实体车号/编成号时，当前实时记录继续保持 `NARROWED/UNKNOWN`，不显示车辆 PNG；这不是图片刷新失败，而是证据不足。未新增运行时 loo-ool 抓取。

## 2026-10-29 JST — TOEI-MODEL-PNG-MAP-AUDIT — LOCAL

- 核验：现有 `CANONICAL_VEHICLES` 已包含车型名称→PNG 映射；显式实时车型 `都営12-600形`、`都営12-000形`、`都営10-300形` 均可解析为 `EXACT` 并得到现有图库路径。
- 回归：新增三条车型→PNG 断言；实时记录仍只有 `trip_id` 时继续保持无图，避免把运用号或行程号伪装成车型字段。

<details>
<summary>2026-10-18 JST — 历史执行证据</summary>

### 2026-10-18 JST — INA-DIRECTIONAL-LAYOUT / agent

Status REVIEW pending release. Reproduced NewShuttle double-track opposite-direction trains at exactly the same screen coordinate: travel tangent and lane sign both reversed inbound. Existing js/train-track-layout.js now bases open-line lateral lanes on station order, preserving movement tangent for station clearance. Fix inbound at-station clearance double reversal as well; terminal clearance stays inside route. Maruyama(index8)--Uchijuku remains one shared physical centreline; Omiya terminal unchanged. Existing paired icon/caption/folding owner retained, no new renderer/recovery. Applies to trains page shared open-line layout; other six pages do not load this module. trains HTML resource4.3.1266. Existing train-fold-layout expanded with opposite lanes, single-track boundary and inbound/terminal clearance assertions;5existing verification entries PASS including45planned-fleet cases and all-line marker/through-chip contracts. Browser runtime NOT VERIFIED: IAB unavailable. Read-only public SQL API returns192SaturdayHoliday runs, all date_unverified; current2026-03-14official timetable and seasonal additions require separate source comparison, no SQL clocks rewritten or claimed current. Fleet plan resolves2000/2020 candidates and existing representative PNG; no fabricated daily formations. Official topology source:https://www.new-shuttle.jp/contact/faq/ . Canonical topology/assets/DB unchanged. Git records release commit; primary targeted backup/sync and CI pending.

Release status — INA-DIRECTIONAL-LAYOUT: commit4454fa1c,PR#41 https://github.com/biubiu52011/Pixel-Tetsudo/pull/41 . Validate/release-guards SUCCESS;protectedmain rejectsmerge:3of4requiredchecks expected. Public deployment NOT UPDATED. Existing branch protections retained;localreceipt .work/backups/ina-layout/release.json.

### 2026-10-18 JST — KEISEI-PLANNED-FLEET / agent

Status REVIEW pending protected-branch PR publication. Existing6canonicalKeiseilines/3596SQLtemplate rows now resolve planned native PNGs:Keisei1413,Chiba408,Chihara206,Kanamachi328,Oshiage931,NaritaSkyAccess310;0missing in bounded no-label source replay. Added15source-scopedoperation_family_rules via existingSupabaseowner;fixed145/146Morningliner/Eveningliner case aliases. Existingexporter produces279rules/35aliases;allpriornon-familyevidenceunchanged,priorfamilyrulesunchangedexcept2lineraliases. ExistingTrainVehicle now accepts rawsource trainNumbers whitelist (line/type/date constrained), does not coerce numeric/synthetic IDs into working codes. Real source evidence remains priority. ExistingnativePNGcatalog adds6planned-only entries3200/3500updated/3600/80000/8800/8900;N800model retained without borrowing3000art. No newfiles/runtimepatch/recovery/migration/schema/topology/timetableclocks. SyntheticOshiageIDs retain mixedoperatorcandidates;Kanamachi short-car family;Matsudocandidates excludedfromChihara.

Validation:full3596rowreplay and15existingentriesPASS including45baselinefleet cases,explicitKeiseiowner/liner/isolation/date/unknownID/PNG checks,26browsercontracts,4Pythonguards,468imagehashlock. Browser runtime NOT VERIFIED:IAB unavailable. Scope is existing6lines, not company topology completion:canonicalMatsudo/HigashiNarita absent andnotfabricated;N800nativeartmissing;source timetablecurrentrevisionnotrevalidated. Pagesrealtime/trains sharedowner+evidencetokens4.3.1267;other5pages do not load these vehiclemodules. FixedSQL/export/replaybackupunderprimary.work/backups;preservepreviousInaPRlocalchanges. Git records releasecommit;CIandpublicationpending.

Release status — KEISEI-PLANNED-FLEET:7fbf24b9 PR#42 https://github.com/biubiu52011/Pixel-Tetsudo/pull/42 . Validate/release-guards SUCCESS. Protectedmain rejectsmerge:3of4requiredstatuschecks expected. DB15rules/2aliasesapplied;publicfrontendNOTUPDATED. Localreceipt .work/backups/keisei-release.json.

### 2026-10-18 JST — EXISTING-PR-CONSOLIDATION / agent

User requested consolidation and no arbitrary new PRs. Preserve both Ina layout4454fa1c and Keisei fleet7fbf24b9 changes in existing PR#41;PR#42 to be closed only after push/readback verifies inclusion. Resolve append-only PROGRESS conflict by retaining both entries;trainsHTML automatically retains both layout4.3.1266 andvehicle/evidence4.3.1267 resources. No production behavior beyond originaltwoPRs, no SQL changes. Existingbranchprotectionmissing-check blocker remains;consolidatingPRs does not deploy or recycle GitHub issue/PR numbers. Validation/publication status follows below.

User correction / consolidation complete:retain#42asOPENDRAFTplaceholder,title占位,emptybody,zerochangedfiles/additions/deletions;doNOTclose. #42baseisexisting#41branch,headab06c7aaaddsoneemptycommit;bothoriginalworkcommitsretainedin#41(23280014combined). No newPRcreated. FourlocalcombinedchecksPASS;productionmainstillunchanged. Futuredevelopmentmayreuse#42byupdatingitsbranch/base/title/bodywithuserauthorization. This supersedes earlierintentiontoclose#42.

</details>

<details>
<summary>2026-10-17 JST — 历史执行证据</summary>

### 2026-10-17 JST — CHUO-MAIN-PLAN / agent

Status REVIEW pending deployment; browser runtime NOT VERIFIED. Audit 539 explicit regular timetable records across four official JR East 2610 sheets against production SQL by station/clock: all matched, including verified renumbered/merged services. Do not invent trips from 42 boundary-only/insufficient-clock rows; no timetable/stop/topology mutations. Added 3 canonical Grade C family plans, scoped regional plan to168 published train numbers, and Nagano E131 planned representative catalogue entry. Ordinary211/E131, rapid throughE233 and explicit E353 remain distinct; actual model priority retained. New791-reference regression PASS; all60 verification entries PASS. Twelve production position replays retain counts and PNGs; screenshot23:52 has3 trains over the full line, with2 outside the visible top segment. SQL migrations 20261016151338 / 20261016151640. Files: js/train-vehicle.js, two evidence snapshots, trains/realtime page resource tokens, two migrations, tools/chuo-main-planned-vehicles.test.js, docs/chuo-main-plan-audit-20261017.md. Details/backups: recovery/chuo-main-20261017/. Conditional/seasonal timetable notes remain outside the539-record completeness claim.

### 2026-10-17 中央本线无旧提示输入的计划车型修正

已复现：421M 等官方定期车号在 ODPT 实时输入或 SQL 车型提示为空时，被区域计划规则的 candidateLabelsAny 拦截，最终显示待判定。移除该多余前提，仍严格限定 168 个官方定期车号、线路和列车类型。保留实际车辆证据优先级及临时车号隔离。SQL 迁移 20261017020949 已应用并回读。

回归覆盖 168 车号 × 2 运营日 × 2 输入路径，共 672 例，验证最终标记选中计划车型 PNG；额外验证未收录车号和伪造计划对象不能取得图标。浏览器运行时尚未验证，完整回归及发布检查另存 recovery/chuo-plan-admission-20261017。

完整回归：60 个检查入口全部通过（含 65 个 node:test 用例、4 个 Python 守卫及车型映射守卫）。

### 2026-10-17 JST — ITO-PLANNED-VEHICLES / agent

Status REVIEW pending deployment. Browser confirmed 5641M had E233-1000 / Izukyu8000 legacy candidates and no proper native plan. Added four canonical SQL Grade C families:36 JR ordinary numbers -> E231-1000/E233-3000;34 Izukyu ordinary numbers ->8000/3000/2100;8 Odoriko ->E257-2000;3001M/3002M Saphir ->E261. Exact regular-number and train-type admission; no broad M suffix inference. Corrected152 SQL/local reference labels only; no stop/clock/topology changes. Added explicit Izukyu owner label to the shared parser and native8000 planned representative/E261 catalogue entries. Izukyu3000 lacks native artwork;2100 only has old original livery, so neither borrows another image. All candidates retained with8000 representative, not daily carset claims. SQL migration20261017023833 applied/read back. Tests152rows x realtime/SQL final-marker PNG plus blank/legacy label, unknown/type guard and actual priority PASS. Full regression and deployed browser verification pending. Files:js/train-vehicle.js,2evidence snapshots,Ito-manual.js,trains/realtime resource versions,migration,tools/ito-planned-vehicles.test.js. Recovery:recovery/ito-plans-20261017/.

Validation: all61 full-suite entries PASS, including65 node:test cases,4Python guards, mapping guard and304 Ito final-marker cases.152 timetable rows preserve all non-model fields; prior actual/dated/reference evidence unchanged. Browser before-fix3025M unresolved confirmed; deployed browser check pending.

### 2026-10-17 JST — ITO-ICON-TRANSPARENCY / agent

Status REVIEW pending deploy. User iPhone screenshot showed opaque magenta around Izukyu8000. Existing82x98 RGB asset lacked tRNS; replaced with unmodified original Train Front View bp/izq8000b.png, whose magenta key is transparent. Use qualified new filename to bypass stale image cache; preserve old asset in recovery. No AI redraw or pixel-edit conversion; catalogue remains planned representative. Newly used E2572000/E261 assets already have valid transparency. train-vehicle/page cache4.3.1260. Source and usage notes:docs/ito-icon-source-20261017.md. Backup:recovery/ito-icon-alpha-20261017/.

PNG content-lock follow-up: explicitly re-reviewed original visual, source bytes and tRNS; update only renamed8000 entry, keep guard unchanged.

### 2026-10-17 JST — HACHIKO-PLANNED-VEHICLES / agent

Status REVIEW pending release. Browser reproduced5unresolved:1166E,1269E,1278E,230D,235D all legacy209-3000. Canonical SQL2Grade C families admit148known E numbers ->E231-3000/209-3500 and54known D numbers ->HB-E220(Hachiko), effective2026-03-14. Correct298SQL/local labels; preserve stops, clocks, IDs, calendars and existing actual/dated evidence. Add TrainVehicle E231-3000 native and HB-E220 Hachiko planned representative from unmodified Train Front View downloads; preserve generic HB-E220 artwork for other lines. Reviewed2new transparent PNGs and add only2content locks. E231/209 ordinary candidates retained; no guessed daily formation. New596realtime/SQL final-marker cases PASS, including station boundary check at Komagawa, blank/retired model labels, pre-revision/unknown/type isolation and actual priority. Migration20261017033944 applied/read back. Resources4.3.1262; retain concurrent ODPT cache update frombb9ae03d. Full suite and deployment pending. Files:TrainVehicle,2snapshots,Hachiko-manual,2page tokens,2PNG,content-lock,migration,test. Backups:recovery/hachiko-plans-20261017/.

Validation update: all62verification entries PASS (including65node:test cases,4Python guards,image content lock and596Hachiko final-marker cases). All298non-model timetable rows, prior facts and prior image hashes preserved.

### 2026-10-17 JST — RETIRE-RECOVERY / agent

Status REVIEW pending full validation/release. Addressed user concern about dated recovery accumulation. Archived both workspaces plus5superseded vehicle reports,4083files/827489237bytes ->1958SHA256objects/32144045byteZIP; verified CRC, every object, manifest and all source hashes before removing both recovery directories. One ignored local archive at primary .work/backups/recovery-archive.zip; no new dated recovery or permanent temporary runner.4CI JSON fixtures relocated byte-identically to tests/fixtures/guards;3existing guards now use formal paths, with existing architecture guard rejecting recreated recovery. Historical canonical audit/non-FULL report moved to docs/reports;5dated model reports consolidated in docs/train-vehicle-plans.md, original detail retained in archive. Updated README,ENGINEERING,docs index and gitignore. No runtime/model/SQL/topology/image behavior changes; no legacy tests removed. Negative recreation guard PASS; runtime files equal basee423c39b. Full62entries running via existing tests into fixed .work/verification outputs.

Validation: all62existing verification entries PASS after fixture relocation;65node:test cases and all4Python guards retained. Explicit negative test rejects a recreated recovery directory. Both working copies have no recovery directory; runtime/data/image files remain byte-identical to basee423c39b. Archive integrity and all4083source hashes verified before cleanup.

### 2026-10-17 JST — POSITION-CLOCK-NO-REPLAY / agent

Status REVIEW pending release; timetable source validation remains PARTIAL. Reproduced operator-wide alerts rewinding every scheduled train and resurrecting terminated trips (unknown delay invented15min, suspension60min). Removed this unsupported position offset in the existing estimator; realtime ODPT position/measured delay priority retained. Planned positions now use JST seconds and a15s local foreground tick, no separate renderer clock or new network polling. Remove95% position cap; snap discontinuous/resumed corrections instead of reenacting skipped travel. Correct loop target wrapping: a backward correction no longer expands to a full lap, true last/first seam remains continuous. Existing terminal/continuity tests extended;63existing verification entries PASS including65node:test cases,4Python guards and artwork guard. Local browser Hachiko7trains advance in respective directions on same mounted page. Resources4.3.1263. Files:3existing runtime owners,2page tokens,2existingtests,existingSQLreport. No new recovery/runner/data truth files. Backup:Git basebe29c9d8 plus primary .work/backups/position-clock.patch.

Read-only SQL audit:92,322source resolutions have no date_verified validity metadata;26lines/16131rows have uppercase-prefix internal identifiers requiring original source review (not proof every clock is fabricated). Current timetable validity and all-line stop-by-stop matching NOT VERIFIED; no SQL times rewritten or blanket source deletion. This is separate from fixed position replay. Audit summary in existing docs/reports/non-full-sql-timetables.md and ignored .work/timetable-source-audit.json.


Release verification — POSITION-CLOCK-NO-REPLAY: runtime commit7dbb7d1ba8c49f9c728eb6c51266f90610cc75a9. CI/CD39001828432,ReleaseGuards39001828445,Pages39001827983 success. Published3runtime files HTTP200 and byte-identical;HTMLbuild tokens point to7dbb7d1b. Public browser Hachiko5current services loaded;1278E/230D from earlier local sample no longer present after their schedule ended. Local7train same-tab directional progression verified. Follow-up terminal regression uses10:35 with30min operator alert so the original bug specifically resurrects the10:00–10:10 trip;updated test PASS. Source timetable date verification remains PARTIAL as recorded above.

### 2026-10-17 JST — SQL-PLAN-COMPLETENESS-UCHIBO / agent

Status REVIEW pending front-end release; broader SQL coverage audit PARTIAL. Compared4official2026-10Uchibo matrices plus2train-detail calendars. Existing weekday189numbers present;5456matrix clocks checked,5417same-field matches/39endpoint arrival-vs-departure field omissions, no conflicting stored clocks. Weekend lacked9043M/9046M;insert56date-specific plans/560stops for28published dates each through2026-11-29, preserve370recurring templates. Existingservice_exceptions owns4explicit cancellations for2026-10-17/18;retain plans,exclude cancelled movement. Repeated status columns were withdrawn;actualmigrationhistory20261017044313/20261017050314 retained, no new exception owner. train-runsv242deployed with originalverify_jwt=false;publicAPI183plans/2cancelled today,189weekday,no seasonalruns afterexpiry. Sources/remaining10Shinkansenmissingweekendcalendars in existing non-FULL report. No stock/PNG mapping assertions added.

Shared runtime fix in existing owners: refreshSQLwithinservice day at ten-minute TTL,evictoldsame-lineSQLpoolcopies,allow confirmed empty to retire oldregisteredplan;errors remain retryable withoutlegacypositionfallback. Extend existing continuity/service-day/browser guards and add sourced seasonal fixture;no new runner/recovery. Fullvalidation/release pending. Versions4.3.1264. Browser runtime pending front-end release.


Validation update — SQL-PLAN-COMPLETENESS-UCHIBO: final63existingverificationentriesPASS (65node:testcases,4Python guards,56publishedseasonaldatecases,SQLTTL/confirmed-empty/error isolation,1005rowexceptionpagination). FixedHH:MM versusHH:MM:SS itinerary dedup so a cancelled dated overlay replaces its exact recurring duplicate. Edgev243deployed after verifyingv241baseline/v242successor;originalpublicfunctionpermissions retained. LocalbrowserUchibo10currentregularmarkers rendered;cancelledseasonalplans excluded byadapter. Mergedindependentthrough-chiprelease8d607f38withoutoverwritingprimarychanges. Runtime/publicfront-enddeployment pending;all-linecalendarcoverage remains PARTIAL.


Release verification — SQL-PLAN-COMPLETENESS-UCHIBO: code c7a0d472b853235f5d928963d57798ecd991bf07; CI/CD39005695669,ReleaseGuards39005695645,Pages39005694910,canonical-sync39005695646 allSUCCESS. Three publishedruntimefilesHTTP200/byte-identical;publictrainsHTMLbuild=c7a0d472. PublicbrowserUchibo11currentregularmarkersrendered,local10earliermarkersverified;date-specificcancelledadaptercovered56sourcecalendarcases. DBreadback370recurringtemplatespreserved/56addeddateplans/4existing-ownerexceptions/0duplicatestatuscolumns. Localownedfilessynced;primaryunrelatedchangespreserved. This completesUchibopublished-plan supplementation and sharedsame-dayrefresh work;broader10ShinkansenmissingweekendcalendarsremainsPARTIAL.

### 2026-10-17 JST — SHINKANSEN-PUBLISHED-WEEKENDS / agent

Status PARTIAL / awaiting explicit reapproval required by automatic review. Existing SQL owners only; no runtime/schema/image changes. Target10lines/16publishedweekend+holidaydates through2026-11-29:2057sourceplans/23111datedruns/183573stops. Current15189runs/118872stops;664weekdaytemplatespreserved. Remaining7922runs/64701stops +130KyushuShinOsaka namespace corrections in primary .work/backups/shinkansen-plans-remaining.sql. Invalid destination payload corrected;40Komachi destinations inherited from coupled Hayabusa corrected toAkita. Legitimate SanyoTokyo/HokkaidoTokyo terminals supported by official12A/3036B detailpages. Auto-review demanded explicit user reapproval for remaining bulk production writes;stopped,no bypass. Read-only170APIcases:storedstops/clocksconsistent,7922missing/130URNdiffs;not fullPASS. PublicJoetsuE7markers andNishiKyushu2038Gactivation verified;2038Gstockunresolved. Updated existing report and fixed local backups;no datedrecovery/new runtime runner. Git records documentation commit;databasecompletion pendingapproval.

### 2026-10-17 JST — SHINKANSEN-PUBLISHED-WEEKENDS completion / agent

Status DONE for bounded10line/16publishedweekend+holidaydates2026-10-17..2026-11-29;laterdates/weekdayrevalidation/remainingstockinference not included. User explicitly reapproved remainingSQL and requested continuation. All6approvedbatches executed from remainingSQL SHA256 6fb0637ce5acfee0cc19302f57b2142d16d7b95a3b49c1d1df2dd074bdc9e8d8:added7922runs/64701stops,corrected130KyushuShinOsaka namespaces. FinalDB23111datedruns/183573stops;664weekdaytemplatespreserved;0duplicate line/date/trainnumbers;0datesmissing source evidence;0pendingnamespacefixes. Temporaryapprovalusage-limit preventedinitialreadback;afterusercontinuation allchecks completed. PublicAPI170cases PASS:23111fullstation/time/destination comparisons,0missing/0URNdiffs,10December5unverified-date no-replay checks. PublicbrowserHokkaido3031B->ShinHakodate/3044B->Tokyo render withH5/E5plannedcandidates verified. Existingruntime/Edgeowners unchanged. Onlyexistingreport/PROGRESS updated;fixedlocalbackup+executionreceipt synchronized;no newruntime/recovery/schema. Git records completioncommit;documentationpublication verification pending. PriorPARTIAL entry retained as history.


Release verification — SHINKANSEN-PUBLISHED-WEEKENDS: verifiedcommit95a0fa40d8b0c87d060f44520ff5cdcbc2f5ef64. CI/CD39022366264,ReleaseGuards39022366308,Pages39022365544 allSUCCESS. PublictrainsHTML HTTP200/build95a0fa40. SQL170APIcases complete/0missing/0destinationdiffs;localreceipt/sourcearchive synchronized. This supersedes earlier publication-pending status. Follow-up changes only record verification in existing documentation.

### 2026-10-17 JST — LINE-ICON-SYNC / agent

Status REVIEW pending public release. Imported44user-updatedPNGs(11JR-Kyushu/33JR-West),byte-identical;renamed by operator-directory + Japanese region_code (九州_JA,近畿_A,広島_B,岡山_L,山陰_V). All44old/newname+SHA256pairs saved in primary .work/backups/line-icon-rename.json. Set18canonical line.image fields only:OsakaLoop,TokaidoKansai,Kosei,Nara,OsakaHigashi,Fukuchiyama,Gakkentoshi,KakogawaLine,Bantan,HimejiLine,Maizuru,Hanwa,Kure,Kabe,Sasaguri,KashiiLine,Gotoji,Chikuhi. OsakaLoop no longer uses Shinkansen logo. Multi-region letters remain separately named assets;no arbitrary whole-line assignment or line/card splitting. User-deleted2unusedShinkansenSVGs synchronized;existingPNGShinkansenlogos retained. Regeneratedexistingrailwaycompact/filebundles;allnon-imagecanonicalfieldspreserved. Sevenpages db-loader cache4.3.1265. Existing6verificationentriesPASS(lineorder,browsercontract,4Pythonguards);44hashes,18assignments,267existingimagepaths,3formats/7cacheversions checked. Onepre-existingunrelatedmissingTokyuShinYokohamaPNG unchanged;no new missing paths. No runtime/source-plan/TrainVehicle/SQL/topology changes;no recovery/new runtime scripts. Localprimarytargetedmetadata+assetssynchronizedwithoutoverwritingunrelateddirtyfiles. Git records commit;browser/deployment pending.


Release verification — LINE-ICON-SYNC DONE:3a4e3ed03c60bc7e1d0e224bb67d836c8e26712c. CI/CD39022945061,ReleaseGuards39022945097,Pages39022944571 allSUCCESS. Public44PNG URLs HTTP200/SHA256equaluserinput;18canonicalimagepaths and7HTMLbuildtokens matchrelease. BrowserOsakaLoopcard uses近畿_O.png andcomplete/naturalWidth confirmsloaded;othernewKabe/Kosei/Kakogawaicons visuallyobserved. Lazyoffscreenimages checkedafterviewportentry;originalall-linesfilterrestored. Primarytargetedfiles/renamemanifest/releasereceipt synced. RemainingunrelatedTokyuShinYokohamamissingimageunchanged. Verification recorded without newruntime/SQL/recovery files.

</details>

<details>
<summary>2026-10-16 JST — 历史执行证据</summary>

### 2026-10-16 JST — 小田急按列车号补充车型计划（DONE：本轮补充已同步并公开验证）

- Workstream: odakyu-train-plans-20261016；执行者Codex。补充既有计划时刻表的车型依据，不重建时刻表，不查询当天实际编成。Supabase现有train_vehicle_rules追加2,126组列车号/日历计划，经唯一TrainOperationEvidence → TrainVehicle → PNG入口消费。
- 来源：小田急官方2026-03-14改正的平日/土休日上下行Romancecar PDF，159组固定车型标记；夜桜の部屋2026普通车运用表，1,967组普通车计划。普通车平日来源标记2026-03-16、土休日2026-03-14。MSE/GSE固定标记按车型补充；97组EXE符号保留EXE/EXEα两候选；官方▲可变运行日班次未强定车型。A/B运用保留多车型候选，1000/4000固定计划仍不是当天编成证明。来源署名/URL/等级/生效日保留，不人为设截止日期。
- 修正具体列车号/运用计划被宽泛SQL候选盖住的优先级；整段技术区间排除（如TX交流区间）仍先于不相容列车号计划，明确实时车型仍优先。没有随机分图，也没有建立第二套车型renderer。planned查询不生成当日observedDate/decisive实车证明，原物理证据兼容入口保持。资源4.3.1245，Fusion15/Estimator11使旧计划代表图缓存失效。
- 数据库迁移20261016030131由Supabase实际迁移历史回读导出；新计划与库中既有241条小田急参考无车型冲突。小田原线既有2,117源模板/31,112停站行未改变，新增依据覆盖平日475/1,095、土休日528/1,022源行程；未覆盖班次保持原候选。完整2,126组也含小田急其他区间，不能视为小田原线2,126班。
- 固定2026-10-16 12:10 JST，同一1,041条实际SQL时刻表回放：47个位置/47个图标保持，原按种别统一候选的44列中21列细化为各自运用/官方车型计划；其余23列仍为宽泛候选。原有3列JR/Metro计划保持，位置/班次未改。这是回放验证，不冒充浏览器现场。
- 新增odakyu-planned-vehicles回归：同Local的7004→3000/8000、6505→2000/1000不同代表PNG，EXE双候选、MSE、休日GSE、▲不强定、前导零、日历/改正日期/线路、冲突拒绝、技术区间与实时优先。47工具套件、65项node:test、4守卫及映射检查通过（53个入口）。browser runtime: NOT VERIFIED。
- 修改范围：trains/realtime车型链、home已有Fusion引用及唯一证据快照；其余四页无车型计划消费无需改动。新增离线来源提取工具、回归和SQL迁移；原件、PDF、来源表、SQL备份/回读及回放日志在recovery/odakyu-train-plans-20261016。保留主工作区其他文档及未公开旅游提交，不重置/强推。
- 发布实现d08856d6，自动快照b29a5bc6；CI/CD、Release Guards和Sync canonical vehicle evidence均success。4个公开JS HTTP200且逐字匹配，线上证据10,777条（新增2,126）；7004/6505/0002/0401M按公开代码解析正确。浏览器连接超时，未现场验收。最终补强planned模式无观察日期语义，资源4.3.1245的最终实现e0e8d48e已公开；CI/CD、Release Guards及Pages均success，4核心JS HTTP200逐字匹配，页面引用该构建。公开planned查询observedDate为空、decisive=false。
- 遗留：自由运用及官方▲班次仍需更细的有来源计划；候选代表图不等于确定车型。其他线路车型计划缺口不在本轮完成声明内。

### 2026-10-16 JST — 小田原计划车型、TX全程约束与临海直通（DONE：本轮范围已发布验证，全网仍PARTIAL）

- Workstream: vehicle-plan-rules-20261016；执行者Codex。本轮完成范围为小田原、TX区间约束、临海已声明JR车型及计划名称解析；全网计划仍为PARTIAL，不以出图数量声明全部合法。
- 在既有operation_family_rules添加plan_scope JSONB，八条规则由Supabase唯一快照导出。规则仅在planned模式按种别、整段已知行程/起终点、运营商及原候选适用；未知条件/格式拒绝匹配。普通车、千代田/常磐直通、Romancecar、Metro Romancecar及御殿场MSE分开。已有具体运用计划和明确实车车型优先。计划不编造每日观察/编成，也不设置无官方依据的截止日，持续至被明确修订。
- TX保存源841条中459条进入守谷以北：SQL源标签和本地TsukubaExpress-manual同步去除TX-1000，保留TX-2000/3000。运行时仍校验旧缓存和双向完整行程，不能只看终点；仅秋叶原—守谷的382条源模板保留原三候选。原始ID/标签备份可恢复。
- 临海线只在已有E233系7000番台候选、允许种别和TWR/JR行程上下文中补足JR所属资格，不作为任意跨公司默认。计划层统一括号和省略系名，补EXE/EXEα原生图；房总2000/2100联合图只作plannedAsset，物理单一番台图片依然拒绝，旧no-guess断言未改。
- 共享入口仍为TrainOperationEvidence/TrainVehicle；源库没有复制线路拓扑，无新renderer。train-vehicle/证据快照/融合/推算三页资源4.3.1243，Fusion14/Estimator10。trains、realtime使用车型链；home仅已有Fusion引用；其余四页无该功能。
- 固定2026-10-15T12:33:10.646Z，同一210线SQL样本：183线1529位置，PNG593→654，旧身份EXACT保持248（其中也含计划参考，不等于当天实车核实）。小田原3→48/48、临海0→5/5、池袋23→26/26、成田0→2/2、总武本线0→6/9；TX原9个跨交流区间错误代表均改为允许车型候选。此为回放验收。
- 2026-10-16 11:15 JST公开SQL入口当天1041/463/296行程回读：小田原47/47、TX15/15、临海6/6当前推定位置有图；TX坏源候选0。没有把SQL推定写成真实当班车辆。
- 新增scoped-planned-vehicle-rules回归：双向TX/中间站、普通/特急/Metro/御殿场、日期/线路/未知输入、原生图片、实际车型优先。46工具套件、65项node:test、4守卫及映射检查全部PASS（52个运行入口）。浏览器运行时：NOT VERIFIED。现有安全顾问45项RLS无策略INFO及1项扩展位置WARN，本轮未新增扩展/授权/函数或视图。
- SQL迁移版本20261016020012、20261016020450、20261016022146均已由Supabase实际历史导出；备份/SQL回读/旧新回放/当天样本/日志recovery/vehicle-plan-rules-20261016。全网仍有875个固定回放缺口，东横/西武新宿等空计划、新干线服务名和Laview错误源继续按调查清单处理；本轮不声称这些已修。

- 发布实现8e72d603，自动数据库快照91707c0b。CI/CD、Release Guards及Sync canonical vehicle evidence均success；自动导出保留47规则/8个计划范围/8651列车参考/8车组。公开3核心JS逐字匹配且证据数据含8个持续计划；浏览器连接超时，现场UI未复测。主工作区其他文档和既有未公开提交保留。

### 2026-10-16 JST — 计划车型推定恢复（DONE：已独立发布并验证）

- 用户纠正目标：补充完整的计划车型推定，不以当天实际编成为显示车型的前提。统一TrainVehicle在同一运行结果中保留vehiclePlan；物理身份EXACT/NARROWED/UNKNOWN、编成证据和日期约束保持独立。SQL候选、声明车型及已有线路运用族计划经同一规范车型目录生成候选，缺当天实车证明仍可显示计划代表PNG。没有候选资料不借用线路默认车型。
- 中央・总武线E231系500/0番台保留全部候选。500番台尚无专属PNG，代表图使用候选中的0番台中央・总武线黄色涂装，不借常磐线图片、不声称当天实际车型/编成。提示明确计划候选。扩充现有规范目录的Metro/京王/小田急/西武/京急/TX等精确车型名称和已有资产；不从图片文件名反推列车身份。
- 计划贯通SQL位置输出、DataFusion实时唯一时刻表接续、图标选择和提示。保留日期/方向/时窗/唯一行程限制；同号不同路线或冲突计划不接续。实车车型/冲突优先，计划变化参与刷新签名，缓存Fusion13/Estimator9；三页相关资源4.3.1242。范围trains/realtime和home现有Fusion引用；其余四页无车型位置逻辑。
- 同一固定时刻2026-10-15T12:33:10.646Z回放210条已保存SQL线路，183条有位置共1529列：图标248→593（新增345列计划代表）；物理EXACT仍248，没有伪造新增实车身份。中央总武35/35、田园都市27/27、筑波快线14/14、半藏门17/17可显示。剩余580列无计划、356列有标签但无可匹配图片/标签并非车型；小田原、东横等部分源缺计划，未宣称全线路完成。旧SQL还存在退役型号、错误跨线标签及服务名代替车型，需继续清理来源。
- 新增planned-vehicle-inference测试：计划候选/黄色涂装/运营者隔离/实车优先/缓存失效/提示/SQL位置/实时唯一接续/日期和行程冲突/本地PNG存在。45工具套件、65项node:test、4守卫及车型映射检查全部PASS（51个运行入口）。没有改写旧物理身份测试。CI新增本套件。浏览器连接仍不可用，本次为运行时回放及资源检查，不声称已现场查看。
- 原件、连接脚本、覆盖报告和全部日志：recovery/planned-vehicle-inference-20261016/；原始SQL样本沿用recovery/position-refresh-audit-20261015/。本次未修改Supabase。
- 公开实现b07c6277的CI/CD、Release Guards及Pages全部success；5个公开JS HTTP200且逐字匹配，trains/realtime/home均引用该构建。独立发布从origin/main整理，仅包含本次修复；保留主工作区未公开旅游提交29ea03a6及并发文档重构。主工作区本次等价实现4216086c；后续同步需保留两边各自工作，勿强推或硬重置。

### 2026-10-16 Metro shared tracks / planned models

Reuse SharedTrackPairs, DataFusion and TrainVehicle. Explicit physical sections replace name overlap; map raw-position consumer and on-demand shared-peer loading use that owner. Parallel Y/F tracks south of Kotake remain independent. Planned models stay in Supabase canonical evidence; no daily formation claims or new renderer. Supabase migrations 20261016045735 / 20261016050609: 12 planned working rules; source timetable counts remain Y843/F993. Added7 named PNG catalogue entries and full-width Sotetsu alias. SQL and realtime inputs share working constraints, including B526K2 source segment suffix; ordinary families and S-TRAIN are separate. All1836 weekday/holiday rows have planned models and existing PNG paths. All55 verification entries pass (49 tool suites,65 node:test cases,4 Python guards,mapping guard). Browser local Y view confirmed F services to Motomachi and original ShinKiba services together. F browser switch timed out; symmetric merge and split clipping verified by regression. Backups: recovery/metro-shared-tracks-20261016/.

Merged concurrent ThroughChip/TransferBadge refactor; retained component script and latest resource versions. Updated navigation/layout regression harnesses to load and exercise the public component, replacing a removed private helper call.\n

### 2026-10-16 Mita/Namboku shared-track planned vehicle follow-up

Existing SharedTrackPairs already owns Meguro--ShirokaneTakanawa symmetric projection and loading. Reuse TrainVehicle planned operationPatterns and Supabase family rules; no additional renderer, private model map or daily assignments. Add Mita hour+working parsing and Metro segment occurrence handling; source model ambiguity retained. Backups: recovery/mita-namboku-plans-20261016/.

Mita/Namboku follow-up validation: 7 planned working rules; SQL source counts unchanged Mita758/Namboku744. All1502 plan rows resolve existing PNGs; explicit source operation codes cannot bypass train-number working constraints. Both map directions, Meguro--Shirokane interval interpolation and split exit pass. Full56 verification entries pass; existing10777 train references retained. Deployment pending.

### 2026-10-16 Remaining subway planned vehicles

Use existing TrainVehicle operationPatterns and Supabase family evidence; no second inference/rendering owner. Audit all Metro/Toei subway timetables, correct owner suffix parsing and legacy multi-owner source candidates. Keep through-qualified fleets, TH-LINER, MSE and three-car shuttle constraints distinct. Generic artwork remains non-exact; a known model can use a separately labelled planned representative without choosing a carset/variant. Backups: recovery/subway-plans-20261016/.

Subway audit completed: 15 Metro/Toei subway datasets (including two internal branches),13624 timetable rows have drawable models. Added27 planned working/type constraints; family total93 and existing10777 train references retained. Fixed TH-LINER aliases, owner parsing including H/N and numeric occurrences, MSE18 services versus4000, removed legacy Chiyoda page provider. Generic Toei bodies retain null exact artwork with separate planned representative; no invented carset/generation. Removed arbitrary Nov30 expiry for official single-fleet rules while testing explicit expiry. Full57 verification entries pass. SQL migration20261016085156. Deployment pending.

Merged concurrent through-label centering/prefix changes and migrated the existing280-box layout regression to those documented component rules; bounds/overlap coverage retained. Final57 verification entries pass.

### 2026-10-16 列车种别与方向标签统一

- 移除仅东急显示种别的线路开关；所有已识别种别统一显示「种别＋目的地／环线方向」，缺失或未知种别不猜为普通。
- 保留图标与文字整体上下避让及折叠；沿用最新环线中途直通外侧列布局，并修正对应旧断言。
- train-fold-layout 增加五条线路、四语言、TH-LINER、未知种别和环线方向回归。完整 57 项验证通过。
- trains-render 缓存版本 4.3.1251；浏览器连接超时，实页视觉复核未完成。

### 2026-10-16 图标下方统一仅显示方向

- 按用户最新要求，线路图列车图标下方统一隐藏种别，仅保留目的地／环线方向；列车详情与折叠列表不受影响。
- 覆盖东武晴空塔线等六条线路、四语言、普通与 TH-LINER、未知种别和环线方向；保留图标文字整体布局。
- trains-render 缓存版本 4.3.1252。
- 完整 57 项验证通过，图标与文字紧贴及上下避让回归通过。

### 2026-10-16 京叶／武藏野计划车型与直通标签（JST，agent）

- Workstream: KEIYO-PLAN；状态 IN_PROGRESS。沿用 TrainVehicle／TrainOperationEvidence 和 Supabase canonical family rules，补5条计划约束；本线 A/Y、83/85 分割、武藏野 E、房总特急 M 分离。
- 旧参考把京叶线 E 列车统一写成 E233-5000、武藏野统一写成无图 E231-900，SQL 模板车型为空；新计划规则保留全部候选，不冒充当天编组。
- 登记武藏野 E231-0 和 E257-500 已有原生图；红色京叶 E233-1000／武藏野209精确图缺口保留为空，不借用蓝色或红色异线图片。
- canonical Keiyo→Musashino 边界保留西船桥源边界，补市川盐滨／南船桥两处主图接续点；未增加虚构站、线路或并行拓扑。来源 https://www.jreast.co.jp/chiba/news/pdf/pre1608_netrains.pdf 、 https://timetables.jreast.co.jp/timetable/list1500.html 。苏我内外房接续回归同时保留。
- 新测试1663条参考时刻表与实时同入口、上下行偶数号码归一化、分割运用与实际车型优先通过；完整发布检查待运行。SQL migration20261016093118，备份 recovery/keiyo-plans-20261016/。browser runtime: NOT VERIFIED。
- 验证更新：完整58项全部通过；京叶／武藏野1663条参考班次无缺图，284个直通标签边界与不重叠检查通过。canonical file/compact生成物与db-loader缓存版本同步。SQL模板保留京叶1068／武藏野536行及现有10777列车参考。浏览器再次连接超时，browser runtime: NOT VERIFIED。

### 2026-10-16 Remaining line planned vehicle/icon coverage

Status: REVIEW until public deployment; browser runtime NOT VERIFIED. Reuse the existing TrainOperationEvidence -> TrainVehicle -> native PNG owner. Added 157 Grade C planned family/through-working rules on 69 canonical line IDs, 83 native catalogue entries (including representative-only artwork where body/livery is not proven), qualified full/half-width aliases and scoped working normalization. No daily observed carset claims, timetable topology changes or second model truth map. Retained prior 98 family rules and all train references. Supabase applied/read back migrations 20261016102543 and 20261016140956. Corrected Tokaido ordinary fleet, E257-5500 express family, E8 replacement and airport/access type coverage; preserve 2100/Sky Access and through-owner restrictions. All 59 verification entries PASS, including 45 new line/type cases and existing 65 node:test cases. Full 218-dataset / 102755-row reference replay: missing artwork 41456 -> 14922, 91 improved datasets, zero regressions. Added official Laview001 / S-TRAIN40000 separation; see docs/remaining-planned-vehicle-coverage-20261016.md. Backups/evidence: recovery/remaining-plans-20261016/. Missing correct native artwork remains neutral rather than using another operator/model.

</details>

<details>
<summary>2026-10-15 JST — 历史执行证据</summary>

### 2026-10-15 JST — 线路位置刷新与SQL线路接入（DONE：已发布并验证）

- 补齐SQL适配器_sqlLineId：保留正式line_id并按其建立推算索引，源railway URN仍原样保留作来源。位置和运行链候选共用_lineTimetables，删除重复的旧别名查找。SQL不得跨明确归属线路使用。
- 当前线路及图中依赖每次位置重建均同步重算；旧逻辑只以实时列车线路为种子，SQL图会在同分钟轮询中被清空。前台/BFCache兜底改为loadTrainPositions，避免fuseAll只重发旧位置。缓存版本FUSION12、ESTIMATOR8，相关三页资源4.3.1241。
- SQL 210条源身份核查中19条旧代码匹配有缺口：Daishi_Keikyu、Daishi_Tobu、KeioSagami、KeioShin、KeioZoo、KeiseiChihara、KeiseiOshiage、Nikkoku、SaitamaRapid、Seibu_Sayama、SeibuEn、SobuMain、SotetsuJRDirect、SotetsuShin-Yokohama、Tobu_Kameido、TobuUtsunomiya、TokyoMonorail、TokyuDenEn、Yurakucho_Seibu；显式SQL线路归属统一接入。此为身份入口核查，不代表210条时刻表均已核实当前运营完整性。
- 新测试覆盖210条源身份和同页30秒/分钟/一小时推进、终到退出、旧实时过期、前台恢复。实际相铁JR SQL样本20:24为146M/139M，20:25位置推进并新增148M，21:24为274M/143M；旧实时全部过期。浏览器连接超时，尚未现场定位用户原先所见列车。
- 全量当前SQL只读采集210条均有数据，181条当前有位置；一小时回放无完全相同班次/坐标输出，零读取错误。JR-East/Tobu/Keio/Toei原始源均有当前时间戳；少量过期行由现有有效期过滤。实际ensureTimetable入口21:21输出143M为SQL位置、274M为实时位置。
- 44工具套件、65项node:test、4项守卫、映射检查全部PASS。实现ed3a514d的CI/CD、Release Guards和Pages均success；公开3个位置脚本HTTP200且逐字匹配，home/realtime/trains均引用4.3.1241资源。已打开的浏览器需整页刷新加载新脚本，hash切线不热替换。范围trains/realtime及home现有共享融合/ODPT脚本；其余四页无列车位置逻辑无需改动。原件、SQL只读回读、原始样本和日志recovery/position-refresh-audit-20261015，无数据库写入。用户补充多数线路似固定时段循环，现有证据排除本次采集源统一回放；用户原浏览器画面仍无法连接现场验收，不把回放结果冒充原现场复测。

### 2026-10-15 JST — 埼京／相铁JR直通车型缺失（DONE：SQL同步及公开发布验证）

- 实时20:24样本270M（新宿）与141M（海老名）UNKNOWN：旧埼京参考只导入K/F/S号，缺失M号；12000系又重复注册同名canonical身份，车型已知时仍拒绝PNG。
- 依2026-03-14改正平日/休日运用表，向Supabase train_vehicle_rules增185条完整列车号参考：相铁12000系71条、E233系7000番台114条；按日历及改正日期隔离，仅计划车型、不提供当天编组。SQL回读经既有导出器更新唯一快照，增加SotetsuJRDirect到saikyo证据域别名，不扩散至东急直通。
- 合并12000系重复catalog条目与10辆别名，保留真正名称冲突的拒绝策略。trains/realtime共用链更新资源4.3.1240；home与其余四页没有该车型脚本无需改动。原件、SQL、来源、回读与日志在recovery/saikyo-sotetsu-vehicle-20261015。
- 185条参考实时/SQL双入口、日期/网络隔离、日历换车型和显式实时优先PASS；相同ODPT回放埼京26列全部有车型，270M→12000系PNG、141M→E233-7000 PNG。实际SQL相铁JR直通92行程全部车型/PNG明确。43工具套件、65项node:test、4项守卫及映射检查PASS。实现530186d6的CI/CD、Release Guards、Pages均success；公开车型脚本/证据快照逐字匹配，两页面均引用build=530186d6完整SHA的新资源，两PNG返回200且签名正确。浏览器连接不可用，未声称现场UI复测。

### 2026-10-15 JST — 合并车辆证据与车型运行时（DONE：已发布并验证）

- 链路为ODPT／SQL列车号 → 有来源的线路车型对应 → TrainOperationEvidence → TrainVehicle → PNG。证据与车型职责合并在唯一js/train-vehicle.js，保留window.TrainOperationEvidence注册接口，删除原独立证据脚本与页面引用。
- resolveRealtime接收实际ODPT上下文，resolveTimetableRun接收SQL行程与日历；DataFusion和推算器只适配原始输入及投影结果，不重复判定。不修改SQL事实、车型参考或编组证据。
- 修复canonical数据晚到或替换时提供者捕获空/旧数组，以及SQL当天UNKNOWN持续缓存的问题。数据变化刷新canonical提供者及证据版本，行程车型缓存随版本失效；重复加载不会重置注册或实车编组状态。
- 范围trains/realtime；home仅同步已有DataFusion，其余四页无车型链。资源4.3.1239；原件/日志recovery/vehicle-pipeline-merge-20261015。保留已有Markdown整理修改，只提交本任务增量。
- 新回归覆盖272条E353通过实时统一入口、并结号码、网络/日期隔离、显式实时优先、同一SQL行程晚到数据UNKNOWN→EXACT、撤回与重复导入。42工具套件、65项node:test、4项守卫及相同ODPT/SQL生产回放PASS；66个SQL特急60个确定、6个临时号仍无班次级证据，不猜车型。实现340f6e27的CI/CD、Release Guards及Pages均success；公开3脚本/2页面HTTP200且逐字MATCH，页面无旧引用，旧独立脚本HTTP404。浏览器连接不可用，本轮不声称用户当时具体列车已现场复测。

> 本文件记录任务执行与验收状态。工程约束见 [ENGINEERING](ENGINEERING.md)，技术参考见 [README](README.md)，分类报告见 [文档索引](docs/README.md)。记录中的数量、浏览器结果和发布状态仅适用于对应提交与评估时间；后续记录可以取代早期方案，但不得改写旧证据。

### 2026-10-15 JST — Markdown 文档整理（DONE：本地文档校验完成）

- 执行者：Codex；范围：README、ENGINEERING、PROGRESS、分类索引及既有报告导航。
- 明确文档职责，按真实标题修复目录；纠正“无 SQL 数据库”、已移除车型／关系脚本仍作为现役入口等矛盾说明；核对本地启动路径。
- 增加分类索引，历史报告注明范围；恢复资料中的旧 60 线路基线只作历史记录。保留原有修订表、样本数字、原始验收结论与全部章节。
- 验证：17 份文档、172 个内部链接检查通过；14 份原跟踪文档均有索引，11 份历史报告非空正文与代码围栏逐项保留；diff 检查通过。仅改 Markdown，不修改产品脚本、数据或样式，不触发浏览器功能验收。
- 提交范围：本轮 Markdown 整理及三个分类入口；仅声明文档校验完成，不声明运行时重新验证或重新部署。

### 2026-10-15 JST — 乘客堆叠列表去除列车号

- 用户指出普通乘客不需要编号，移除trains.html共用堆叠弹窗列车号，保留图标、种别、目的地、晚点及推定提示；正点实时列车不生成空的次要信息行。只改变呈现，原始trainNumber与运行匹配数据保留。其他六页无此列表，不修改。
- Commit: f9dc2617。renderer资源4.3.1230；原件备份recovery/passenger-list-no-number-20261015。既有乘客列表无编号/无空行回归、语法及diff检查PASS；CI/CD、Release Guards与Pages部署success，公开renderer HTTP200且逐字MATCH，已同步上线。原有五项本地数据修改保留。

### 2026-10-15 JST — 终点边界、位置图层一致性与乘客列车列表（DONE：已发布并公开验收）

- Commit: 0723994c。CI/CD、Release Guards与Pages部署success，六个公开JS/CSS逐字MATCH；公开京浜东北真实折叠组已打开，包含1012B/978C及正确大宫/南浦和目的地；49个marker含3实时，没有同号重复。验收发现实时typeName仍是JR-East.Rapid，11b5bd40复用TRAIN_TYPE_NAMES修正种别显示，renderer资源补至4.3.1228。另实际DOM发现语言菜单outside-click无论是否打开都focus语言按钮，破坏弹窗焦点；共用lang-init修正为仅已打开且显式关闭时归还焦点，outside-click不抢焦点，七页同步4.3.1229并补回归。
- 最终实现e6aab94c的CI/CD、Release Guards及Pages均success，七个公开JS/CSS全部HTTP200并逐字MATCH。公开浏览器840K/875C真实组显示“普通 · 大船行き”及车号/晚点，无内部种别码/车型诊断；400px共享弹窗，焦点在关闭按钮，Escape后返回展开按钮。最后补丁及回归已发布，不附截图。
- 用户发现终到后仍演算、越入不可能区间及两个图层独立移动。共享estimator现在以明确单一目的地截断线性行程，终到时钟后结束推定，移除旧5分钟滞留及平均速度补造后续站时刻。未映射支线不能跨过主线插值；有实际时刻的后续本站到达可重新入图。环线不按单段目的地截断，既有有来源的常磐/中央跨线时刻接续保留。不用车型或目的地生成缺失位置，不改源SQL或车辆证据。
- renderer动画闭包原来共享循环变量，多个RAF会操作最后一列车；每个marker现在持有自己的位置目标、caption、RAF及下一站状态。同一帧全部marker完成位置更新后再统一避让，避免后续marker覆盖第一回调计算的排布偏移。融合位置的匹配增加原始railway身份；同线路/来源railway/运营日/车号/方向有唯一当前实时报文时，不再并列显示SQL重复版本；有歧义时不继承车型或运行链。页面更新签名纳入终点/种别/晚点，静止列车也能刷新信息。
- 堆叠列表复用运行状况rs-modal样式，仅保留图标、种别、目的地、列车号、晚点和推定提示；不复制原始tooltip中的车型/来源诊断。图标和方向仍整体上下避让，不左右拆开。移除每站4条推定的静默截断，合法列车交由折叠完整保留。弹窗从当前marker刷新，已结束列车从列表移除，支持Escape/关闭/背景关闭及焦点恢复。
- 固定09:33:37 JST及同一份既有210线路SQL/887条ODPT输入回放，位置范围记录1677→1404（包含父子重复范围，非物理列车数；旧ODPT过期仍排除，未延长有效期）。核对京浜东北741A 09:28大船、754B 09:30大宫、763C 09:29矶子，旧版09:33仍滞留，新版结束；完整前后JSON与逐线路差异保存在recovery/train-terminal-consistency-20261015。不把减少记录全部声称为已确认数据库错误。
- 新增终到/逆向/无时刻终点/跨日/环线/支线离图与再入图、原来源/方向/运营日隔离、两列车同时RAF与caption同步回归；乘客弹窗刷新/消失/信息简化回归接入CI。41工具套件、64 node:test、4 Python守卫及diff检查PASS。本地京浜东北/中央快速图加载；受控密集列表实际浏览器确认共享400px弹窗、仅旅客信息、Escape与焦点恢复。未回传截图。
- 共享位置引擎适用trains/realtime，home仅同步已有data-fusion引用，其余4页不含这些资源；位置/CSS4.3.1227、renderer4.3.1228、七页lang-init4.3.1229。原件/复现/日志保存在上述recovery目录，原有5项本地数据修改保留。运行时边界修复不声称源数据库所有目的地/车辆事实已逐条纠正。

### 2026-10-15 JST — 车辆映射第二批：JR定期车型参考（DONE：本批已公开验证，剩余缺口保留）

- Commit: d984ce5c。Validate、Release Guards及CI Pages部署success；公开车型脚本与证据快照逐字MATCH，5个PNG及报告均HTTP200。公开浏览器947A/822A为1000、840K/947K/808K为6000，PASS；本地鹤见908/912B/907为E131-1000。
- 继续处理未判定清单。Supabase既有train_vehicle_rules新增2916条逐号/平日休日计划参考：京浜东北本系984（E233-1000）、源previous/next明确接横滨且同日历目标模板存在277（E233-6000）、横滨622、相模242（E131-500）、仙石普通359（E131-800）、鹤见主326/大川24/海芝浦82（E131-1000）。均Grade-C timetable-reference，有效10-15至11-30，不声称实际编组、涂装或当日时刻有效性。SQL插入事务/回读/分组计数PASS。
- 特别保留两处隔离：京浜东北同一源railway含横滨直通K号，不整线指定1000；516K平日与532K休日无已核验接续引用不插入。仙石模板混有仙石东北直通快速，本批只纳入原模板明确E131-800的普通列车。没有新增后缀车型运行时逻辑或修改位置/直通事实。
- 官方来源JR East现役与车辆基地资料、换车公告、ATO直通区间资料及政府公开JR答复，详见docs/reports/vehicle-mapping-batch2-20261015.md。旧5092参考、39family rules、34aliases、8carsets及所有日期/实车证据逐项不变；既有exporter生成8008参考，库存从SQL同步。唯一车型目录登记5个既有PNG，合计93路径全存在，trains/realtime资源4.3.1226；其余五页无此车型图标链。
- 固定原09:33:37 JST同输入对照：111范围/1677记录，新增京浜东北67、横滨19、相模9、仙石9、鹤见3，共107；有图273→380，待证据1404→1297（范围可能重复，非物理车数）。没有延长旧ODPT记录有效期。浏览器本地846A为1000、840K/947K/808K为6000，PASS；公开验收见上。
- 40工具套件、64 node:test、4 Python守卫、diff检查PASS。新增逐条2916参考双模式、PNG、有效期、未知号/日历/网络隔离回归并接CI。备份/SQL/同输入结果recovery/vehicle-mapping-batch2-20261015。原有五项本地数据修改保留。
- 观察到根岸站出现只见线换乘，疑似同名站关系混淆，已登记待另查；本批只改车型证据，未借此改canonical拓扑。

### 2026-10-15 JST — 运营时段车辆映射全网检查（DONE：检查与有依据修正已发布，缺口见清单）

- Commit: 4ebaf383（实现/报告）；CI/CD、Release Guards、证据同步success，现有独立legacy Pages run cancelled而CI的Pages部署success。公开JS/证据逐字MATCH，两PNG和报告HTTP200；公开浏览器A817/A9551等已显示2000系，银座本地A917/B937显示1000系。
- 检查223条canonical线路、210个非FULL SQL入口和4家运营商887条ODPT记录；当前111个范围/1677位置记录，父子重复不作为物理车数。保存逐号CSV及223行报告docs/reports/vehicle-mapping-audit-20261015.md，原始数据/对照/备份recovery/live-vehicle-audit-20261015。ODPT源时间09:11—09:12，接收时已过期，生产继续排除；另在源时间回放1029位置记录检查映射，未声称是当前实时。
- 用户当前丸ノ内页面整批待判定：SQL没有现役单一车型证据且唯一目录未登记已有PNG。核对Tokyo Metro当前官方现役列表与02退役官方说明，Supabase evidence_sources402、family rules38/39补丸ノ内2000/银座1000，MarunouchiBranch证据域归属母线；有效2026-10-15至11-30，不推编组/涂装。SQL回读PASS；现有exporter新增只读connector结构导入，原37条规则/33别名及全部dated/reference/carsets事实保留。
- TrainOperationEvidence→TrainVehicle→原生PNG链路不变；登记2原生图。相同时间/输入新增丸ノ内43、支线5、银座30图，合计78。当前273有图、1404尚缺证据。新宿回放13条已判10-300但仅有分批外观PNG，缺实体编组不能指定批次；荒川ODPT运行ID非车号，仍保留待判定。未取得全网当天编组实证，不能把未知等同错配或宣称所有既有映射正确。
- 适用trains/realtime共用车型链，两个页面资源4.3.1225；其余5页无该车型图标链，不改。39工具套件、64 node:test、4 Python守卫、图片路径/语法与diff PASS。实际本地丸ノ内浏览器已确认A819/A9551等为2000系；不附截图。线上待发布验收，原有5项数据修改保留。

### 2026-10-15 JST — 纠正内部支线误拆范围

- 用户指出鶴見/千代田/丸ノ内等未独立命名支线不应单列。撤回branchOf一刀切规则；canonical独立presentation作为正式线路展示声明，无声明的内部支线回到父卡片与父图。9内部区间：水郡、方南町、北绫濑、辰野、鹤见海芝浦/大川、成田我孙子/机场、南武浜川崎。8已有正式presentation支线保持独立，西九州新干线按JR九州官方线路名补独立presentation（https://www.jrkyushu-timetable.jp/jr-k_time/r_shinkansen2.html）。
- LinePresentationService统一独立卡片与父图支线范围，DataState两列表同规则；几何、列车收集与激活同步。组合延伸不再提前返回而漏掉内部支线。支线几何保存junction和canonical站序索引，反向支线不再错位一站。内部交接不标成对外线路入口。源列车号/车型/SQL事实未变。
- 恢复合图时发现方南町旧站表误含大江户线西新宿五丁目、漏掉两站。按Tokyo Metro官方页（https://www.tokyometro.jp/station/line_marunouchi/index.html）改为中野坂上→中野新桥→中野富士见町→方南町，复用既有canonical别名ID，补站名、顺序/关系索引；删除旧错误区间时长，未猜时刻或坐标。
- 38工具套件、64 node:test、4守卫PASS。实际本地丸ノ内父图确认官方4站。适用realtime/trains共享卡片，其余页同步已有公共资源；资源4.3.1224。原件recovery/branch-scope-correction-20261015，canonical/fallback仅暂存相关修正，原有5项数据修改保留。不附截图。

### 2026-10-15 JST — 导入东叶/埼玉线路标志

- 用户提供两张PNG原样导入images/鉄道目录，东叶800×800、埼玉320×320，与附件逐字相同，保留透明度。
- ToyoRapid/SaitamaRapid的image与presentation.icon接入同一原始PNG；离线fallback同步，七页db-loader版本4.3.1222。卡片与换乘标记复用已有字段，无颜色、车型、SQL或拓扑改动。
- 原件和HEAD备份recovery/line-icons-20261015。frontend smoke、图片检查、4守卫及diff check PASS。canonical/fallback仅暂存两条图标增量，原有5项本地数据修改保留。不附截图，公开验收待同步。

### 2026-10-15 JST — 支线独立卡片与独立线路图

- 用户明确要求全站有独立数据的支线独立成卡片。共享DataState取消branchOf隐藏；LineCard删除父卡片嵌套支线行，旧CSS/点击入口清理。18条canonical支线在trains/realtime均恰好一张一级卡片；原branchOf/站表/运行链/SQL身份保持。
- LinePresentationService新增唯一getMapBranchIds：只有显式组合presentation成员才纳入组合图，branchOf不再自动扩展地图。geometry、getRealtimePositions、trains-page激活范围复用该入口，普通独立父线不收集子线站点/列车，支线自己加载原位置与SQL。已明确的其他组合展示保留。
- 所有线路图接续标记支持鼠标、Enter/Space导航独立线路。canonical父子关系且唯一实际共享站补普通接续入口，只有原through事实才升级直通；不猜交接站。无共同站的关系不造连线。
- 适用共享卡片页面realtime/trains；其余五页仅同步已有共享资源，保留页面能力声明。资源4.3.1221。原先保留的北绫濑图标路径修正现为新独立卡片所必需，一并纳入；其余5项原有数据修改保留，原件/HEAD备份recovery/independent-branches-20261015。
- 新回归验证全部18支线两种卡片列表、18父线不展开、支线自有站点/列车、父线接续与鼠标/键盘导航；旧激活测试改为父线/支线分别激活，front-end smoke接入CI。38工具套件、64 node:test、4守卫及diff检查PASS。
- 本地浏览器已确认京急5独立卡片、主线无支线站点；实际点击京急蒲田直通标记进入空港线7站图。截图keikyu-cards-local.jpg；公开验收待发布。

### 2026-10-15 JST — 全线路直通标签通用排布

- 用户澄清主要问题为未专门修正线路的标签错位/歪斜。旧renderer把端点整排标签逐个clamp回画布，宽度超出时相互挤压；中间接续固定放到车站名称相反侧，在窄环/分支场景容易进入另一轨道。
- 复用trains-utils／geometry／renderer唯一链路：标签以所属车站为组，上端居中堆叠，中途/下端与站名、换乘图标同列同侧对齐；组整体调边界，取消逐标签挤压与固定2条＋N截断。窄列按名称换行，前缀独立，不拆成散落标记；环线接续保持外侧标签列，非终端不强行上下指向。
- 统一标签实际尺寸供几何站距、首尾留白和renderer绘制使用，删除旧固定行数算法。沿用已有线路名称中的旅客简称（如大和路線、スカイツリーライン），内部括号说明保留在完整标题；重复直通字样去重，不另建线路映射表。
- 功能适用trains.html所有直线/环线/支线共享站点绘制；其余六页无该线路图组件，不改无关资源。源码拓扑、直通事实、SQL、车辆判定未改。三个共享资源4.3.1220，原有6项本地数据修改保留；原件备份recovery/through-layout-20261015。
- 新测试运行真实canonical线路＋shared renderer，280个移动/桌面标签矩形检查边界、组内不重叠、环线外侧归属和前缀去重PASS。37工具套件、64 node:test、4发布守卫与diff检查PASS。本地浏览器已验收大崎双接续与大阪环线天王寺双接续，窄屏390×844实际预览通过，临时viewport已恢复；公开验收待发布。

### 2026-10-15 JST — 普通环线统一双排模板

- 用户指出环线未统一。trains-geometry旧路径仅山手启用写死30站双排，大阪环状线仍沿周长排站。删除普通环线旧分支，所有闭环按真实站数分两列，支持19/30等奇偶站数；使用共同换乘图标间距与原窄环尺寸，保留山手田端顶右/品川右底朝向和canonical stationIndex。
- 大江户线原闭环双列＋光丘开尾结构保留，无站表/SQL/运行链更改。统一功能适用trains.html线路图；其他六页无该图，不改无关显示。
- 双排站点保存闭环周长坐标和画面朝向，复用TrainTrackLayout和renderer沿闭环插值；上下连接区间不斜穿空白，动画方向兼容山手倒序排布。几何/布局/renderer资源4.3.1219，图标与文本整体排布保持。
- 原件备份recovery/loop-template-20261015。新增真实大阪19站/山手30站移动与桌面布局、左右列站数、全部canonical索引、站间距与每段中点在闭环轨道验证。36工具测试与4发布守卫PASS；上线浏览器验收待完成。原有六项本地数据修改保留。

### 2026-10-15 JST — FULL 隐藏位置提示、其余覆盖类型统一提示

- 用户要求 FULL 不出现 tp-est-note 元素，其余类型统一一种提示。复用 ODPTClient.usesSqlTimetable 既有覆盖策略，FULL 在创建前退出并清理旧提示；非 FULL 不依赖当前列车来源或数量，固定显示实时数据优先、未覆盖部分按时刻表推定，不显示 ODPT 时间。
- 唯一实现位于 trains.html 的共享 trains-render，增量和重建两条路径同步。其余六页无线路图提示，仅同步共同 translations 资源版本；四语言统一文案，删除已无调用的 mixed 文案与时间格式函数。资源 4.3.1218。
- 原件备份 recovery/train-note-20261015。45 条配置线路、未知线路、连续刷新及非 FULL→FULL 切换验证 PASS，frontend-smoke、语法、diff check 和4发布守卫 PASS（保留已有 baseline warnings）。浏览器线上验收待发布后确认。原有6项数据修改保留。

### 2026-10-15 — 发布补充验收（原记录未单列标题，按其截图日期归组）

- 本次上线验收：efd8e715，CI/CD 与 Release Guards success，公开 renderer/translations HTTP200 且逐字 MATCH。实际浏览器刷新埼京线无提示，常磐快速显示统一日语提示，再切回埼京线旧提示消失。截图 recovery/train-note-20261015/full-after.jpg。

- 环线公开验收：6b93fdd2，几何/布局/renderer三个公开JS HTTP200并逐字MATCH。实际浏览器大阪环状线已显示两列站名、无顶部居中站点，截图recovery/loop-template-20261015/osaka-after.jpg；当前深夜无列车，动态连接区间由全部区间回归验证，未声称实时列车过境视觉验收。

- 直通标签上线验收：7f4cdcb7生产改动＋d4dc14d4持续检查入口。公开utils/geometry/renderer三个JS HTTP200并逐字MATCH；实际公开大阪环状线天王寺两标签在所属外侧列对齐，大崎显示直通りんかい線／直通相鉄線且无重复/截断。公开截图recovery/through-layout-20261015/osaka-public-after.jpg。Release Guards、Pages success；CI Validate和Deploy均completed（整体状态聚合当时仍in_progress）。原有6项修改保持。

- 独立支线上线验收：2d8ed3bb，CI/CD、Release Guards、Pages全部success，7个公开组件/样式HTTP200并逐字MATCH。公开京急筛选已确认本线/空港/久里滨/逗子/大师5独立卡片，实际点击空港线卡片进入7站独立图；本地成田机场支线3站图亦确认。公开截图keikyu-cards-public.jpg。当前用户页面已刷新，末次实际查看为相铁本线，已确认只保留本线站点与两处支线接续入口；除纳入的北绫濑图标路径外，原有5项独立本地数据修改保留。

- 图标公开验收：dd25bfe0，CI/CD、Release Guards、Pages全部success。公开canonical两条线路的image/presentation.icon已更新，两张原始PNG HTTP200且逐字与附件MATCH。原有5项数据修改保留，未输出截图。

</details>

<details>
<summary>2026-10-14 JST — 历史执行证据</summary>

### 2026-10-14 JST — 高尾实时区间转线与末站图标归位（已发布，公开高尾视图验收通过）

- 用户指出高尾后列车不转线、向画布底部走。共享DataFusion仅按fromStation归属线路，忽略高尾→相模湖的实际toStation；共享布局在最后站idx==nextIdx时用同一坐标计算切向量，零长度退化，且停站偏移朝轨道端点外。
- 复用canonical serviceBoundaries／handoverStations与真实ODPT from/to区间：只有当前线路不含toStation、同operator伙伴线路包含from/to且物理相邻、from为已声明接续站、伙伴唯一时才转线。不靠目的地推位置，未知/跳站/歧义保持原归属。高尾→相模湖进入ChuoMain index0→1；高尾→西八王子归ChuoRapid index23→22；尚在西八王子→高尾和缺toStation停站不提前转线。
- 原trainId／sourceRailway／trainNumber不变，源from/to与实际positionLineId保留；车型继续按原证据匹配。编组缓存隔离增加实际positionLineId，防止提供者railway/号码未改时跨物理运行段继承完整编组。共享estimator同样携带positionLineId。
- 普通末站布局使用最后相邻轨道方向；停站位移朝轨道内侧，起点同样朝内侧。图标与方向依旧整体排布，大江户六字专用偏移保留，无页面CSS补丁，无自动页面跳转、无SQL/拓扑改动。
- 适用trains.html的所有普通线路图；realtime.html共用DataFusion/estimator位置事实但无SVG排布，资源同步。data-fusion／estimator与trains track-layout版本4.3.1216。
- 36 tools suites与4守卫PASS。新增真实canonical高尾双向边界、缺失/未知/非相邻/歧义/无边界隔离、末站坐标/主线第一段放置回归；旧Chuo SQL高尾离图、E353、E233、Joban、折叠、Six以及物理运行段编组隔离回归保留。
- 本地原件备份recovery/takao-handover-20261014。browser runtime: NOT VERIFIED；其他六项本地修改保留。

- 浏览器连接恢复，公开图实际复现“往三鷹”列车被整体碰撞避让推到高尾下方空白区。追加每列车实际轨道Y范围，按SVG屏幕矩阵约束图标中心可用上下槽位，轨道端点以外不作为空位；端点拥挤沿用折叠。branch使用自身points范围，环形/六字专用布局保留。补充末端障碍、空白画布与拥挤折叠回归，36 suites/4守卫PASS。track-layout/renderer 4.3.1217。

- 最终发布与浏览器验收：e6c4fa3ffce94f0a8ae65cf8ee4fcf9a2decf340实时归属/末站切向量修复＋b24d0e7eab5fafee67f05a8e1b4f6ffc446a0908轨道范围避让约束。CI/CD、Release Guards、Pages全部success；四个公开JS逐字MATCH。浏览器连接恢复，实际刷新公开ChuoRapid页并滚到高尾，已确认高尾之后空白区无列车，图标文字保持整体。截图takao-after.jpg已保存；当前实时样本未逐列车观察一次高尾到相模湖过境全过程，该边界由回归测试验证。其他六项原有修改保留。

### 2026-10-14 JST — 中央快速あずさ／かいじ E353 图标（已发布，浏览器视觉验收待补）

- 用户澄清“新宿目的地未识别”实际是缺失列车图标，随后确认影响整批あずさ／かいじ。站名未改；问题是定期特急缺少可用于实时fallback的 exact train/calendar 车型参考，车型目录也未登记E353原生PNG。
- 使用Supabase技能，复用evidence_sources／train_vehicle_rules、既有exporter、TrainOperationEvidence／TrainVehicle。官方2026年10月八王子双方向平日／休日时刻表逐详情核验102份文档，52平日＋52休日定期あずさ／かいじ／富士回遊列车号。官方车型页 https://www.jreast.co.jp/train/express/azusa_kaiji.html 支持E353计划参考；data-misc运转日注意的临时列车排除，不因M后缀或特急等级默认车型（临时富士回遊可能E257）。
- 为ChuoRapid实时源与ChuoMain SQL源分别写入104条，合计208条Grade-C timetable-reference，生效2026-10-14至2026-11-30。不声称当天车辆号、辆数、连挂或编组身份。首个事务因旧唯一键不含calendar而回滚，改为与已有规则相同的NULL service_name，列车名称保留在逐号核验清单/原官方页面；后续插入与SQL计数核验成功，无schema/权限/函数更改。
- 既有E353 PNG登记唯一车型目录；两个页面train-vehicle／evidence-data资源4.3.1215。有效参考4884→5092，旧参考全保留，records／datedRecords／networkAliases／familyRules／carsets逐项完全一致；inventory从当前SQL同步。
- 35 tools suites与4发布守卫PASS。新回归覆盖全部208参考→E353→native PNG、未知/临时号、到期、同号常磐18M仍为原车型、实时车型优先，以及真实新宿终到18M／3120M SQL行→estimator→图标。旧E233回归保持1081独立车型范围。
- 备份与官方文档：recovery/chuo-destination-20261014；browser runtime: NOT VERIFIED（浏览器工具持续超时）。其他六项本地修改保留。

- 上线验收：fd90b8a06a40d23cb59eb3783164f9598c2ededc。CI Validate、Deploy to GitHub Pages及Release Guards均success。公开vehicle/evidence JS逐字MATCH；trains/realtime HTML由发布流程改成build=本提交SHA，确认实际加载新版本（因此不与源码v参数逐字相同）。公开E353 PNG HTTP200、82×98。额外自动pages build任务仍排队，实际CI发布已成功。browser runtime: NOT VERIFIED；未声称视觉PASS。

### 2026-10-14 JST — 列车整体上下排布与密集折叠（已发布，浏览器视觉验收待补）

- 目标：中央快速、常磐快速及共享普通线路图取消横向拥挤槽位；保留实际方向轨道，图标与完整方向文字紧贴、同量上下位移。常磐本线同样适用。大江户六字环形既有专用布局保留。
- 路径：trains.html → TrainTrackLayout.resolveAll／resolveLabels → trains-render。realtime.html不加载线路图renderer，未修改其无关资源；其他页面无此列车位置图。
- 普通线路底层保留源位置锚点，联合图标／文字矩形就近寻找上下空隙；默认位移最多72屏幕像素。局部同方向密集组放不下时折叠为＋N，不跨方向合并，不改运行链或真实列车数据。不同方向/无邻近组继续独立显示。
- 点击／键盘展开显示可滚动列表，每项图标在上、完整方向在下，并可选择原列车详情。列表支持关闭、Escape、点击外部、切线清理；原始每列车marker与caption保留。
- 修改共享js/train-track-layout.js、js/trains-render.js、css/trains.css，trains.html资源4.3.1214；tests新增train-fold-layout并修订旧横向槽位断言为原位置锚点。34 tools suites和4守卫PASS，覆盖ChuoRapid／Joban／JobanMain的同站15车、倒序刷新、有限位移、全部身份保留、方向隔离和逐车选择；既有图标文字6px间距/重复帧回归PASS。
- 浏览器工具超时，browser runtime: NOT VERIFIED。本地原件备份recovery/train-layout-20261014。未涉及SQL车型与时刻表更改。

- 发布验收：9e873810f96f979e3c90d6dfe090cd77a28c6aa9排布提交＋49bc017930fbdb1533944a1609df6b0f9d955bef动画折叠按钮响应修复；CI/CD、Release Guards、Pages均success。公开layout、renderer、CSS、trains.html四项200并逐字匹配本地；浏览器工具超时，browser runtime: NOT VERIFIED。原有六项本地修改保留。

### 2026-10-14 JST — 中央快速 SQL 车型与完整运行段（已发布，浏览器运行验收待补）

- 复用 Supabase train_vehicle_rules／evidence_sources、canonical members/stops、现有 exporter、TrainOperationEvidence／TrainVehicle 和原生 PNG。ChuoRapid 保持独立 presentation，未合并青梅／中央本线页面或复制拓扑。
- 1,087条官方 ODPT 记录（581平日／506休日）逐站逐时与SQL完全一致。JR East E233／0番台、绿色车及河口湖分割运用官方资料支持计划车型参考；写入1,081个 exact train-number/calendar Grade-C E233系0番台参考，覆盖1,087模板，适用2026-10-14至2026-11-30。不按后缀或线路设默认车型，不声称当天编组、涂装、车辆号或12辆实况。
- 青梅630条原时刻完全匹配官方，仅补来源ID；259组立川运行段按双向引用、日历、方向、单侧真实边界时刻与前后计时站顺序核验。NULL保持未知，没有补造另一侧时刻。窄 CHECK 扩展接受此证据，迁移版本由Supabase生成。
- 中央本线 ODPT 公开接口为0；不能假定259个跨段引用包含本线（实际全部青梅）。改用JR官方2026年10月列车详情，同一页面明确高尾前后改号。79组全部核验：39去本线、40返回快速。78个高尾字段补齐／到发语义按官方纠正；本线77条使用正式停站时刻，另新增1223M／1522M高尾区间两条，盐尻同号旧记录未覆盖。79个旧本线快速段作为经共同官方页面确认的重复来源收敛到同一canonical run，保留原件。
- 合计338个 verified continuation：平日177／休日161。重用原root canonical ID，日期仍未提升为当前已核验时刻表。官方补充过的79条快速记录source_path指向原详情，既有独立来源保护保留，后续整批重导须重新核对补充证据。
- 共享 estimator 使用真实合并停站，并在单站分支离开可视图后退出，避免立川／高尾滞留。共享车型目录登记已有E233系0番台82×98 PNG。两个快照参考3803→4884，原records／datedRecords／familyRules／networkAliases／carsets均保留，inventory从SQL同步。trains/realtime相关三个资源4.3.1213。
- 32 tools suites、64 Node checks、4 Python guards PASS。回归覆盖全部1081参考、原生PNG、实时车型冲突优先、未知号／过期／本线隔离、立川离图、高尾实际停车、上行从图外进入、休日及独立页面；来源和原件在 recovery/chuo-rapid-check-20261014。
- 自动审批拒绝了广泛共享函数替换／重命名（包含原函数删除逻辑）；改用仅限已核验班次的数据修复与窄证据 CHECK，均通过审批，不替换共享函数。浏览器工具持续超时，未声称实际公开DOM／视觉验收。
- 前轮超时后延迟写入的重复测试块已核实、备份并清除；其他六项原本地修改完整保留。

- 用户补充分割／併合运行：车型接续不证明编组不变。共享 DataFusion 的编组缓存和候选合并现要求相同 sourceRailway＋published trainNumber，未知或不同运行段不继承整组 carset／证据；本段独立证据保留，车型跨实时覆盖边界仍接续。estimator保留源railway供此校验。新增formation-segment-continuity实际函数回归覆盖同段丢帧、常磐→成田段、改号、未知来源、独立证据和跨日隔离。这里只修编组证据安全边界；尚无逐列车split/join组成关系，未把多候选车型或多个编组ID画成连挂列车。盛冈与大月官方资料已核对，不能将所有成田直通一概固定为减5辆。

- 发布验收：实现提交aca17169415cc52cd7b2f0964fd44c17a3fa33d4；自动证据同步2142a0a53eba7f22aa6fbc80f48c7ae694ff0c4a已快进到本地，验证仅排序变化、所有事实保留。33 tools suites与4守卫PASS；CI/CD、Release Guards、证据同步、最终Pages部署success。四个公开运行脚本200并与本地逐字MATCH。browser runtime: NOT VERIFIED（浏览器工具持续超时）；未声称完成逐列车分割併合组成展示。

### 2026-10-14 JST — 图标与方向紧贴并整体上下避让（DONE：2bb60875已公开部署，浏览器连接不可用）

- 用户指出文字被推到数站以外。复用共享 resolveLabels，输入图标及完整方向文字的联合矩形，最近上下槽位避让；renderer给图标与文字相同位移，保持原始固定间距及居中，删除长虚线引导。
- 保留原始几何／动画坐标，逐帧恢复原transform再计算整体位移，PNG方向翻转保留，避免累计偏移。大江户六形专用布局保留。仅trains资源4.3.1212，SQL与车型不改。
- 31 tools suites、64 Node checks及4 Python guards通过；实际renderer回归验证图标文字相同位移、间距固定、重复刷新不累计，另测最近上方槽位和源顺序稳定。浏览器工具本轮连接超时，未声称实际页面测量。
- 修改前备份 recovery/local-backup-20261014-before-compact-train-caption；六项独立修改保留。

### 2026-10-14 JST — 常磐快速越过实时范围后 SQL 接续（DONE：5df7c18f已发布并验收）

- 根因：JobanRapid 时刻表在取手截断；JobanMain SQL 来源缺少前后官方运行段标识。修改前 SQL 和官方原件备份 recovery/joban-continuity-20261014。
- 逐项核对官方平日357／休日355，共712条原始停站 URN、到发时刻、方向、种别、终点完全一致，仅补 source_trip_id／previous／next；原 source_path、时刻、车型和未核验日期保留。未削弱独立来源导入保护。
- 复用 continuity／members／stops／train-runs，共375个同 calendar/revision、列车号、方向且双向 source link 的取手接续：普通243组实际边界时刻，特急132组保留NULL通过时刻、核对真实计时站括号。原root canonical ID保留，既有导入同步函数续用刷新。
- SQL adapter保留 canonical_group_evidence；共享estimator仅为verified_continuation使用完整来源时刻与既有canonical站序投影，按可视范围裁切，不补造中间站时刻；Ryugasakishi对齐原Ryugasaki。成田仍独立，实时位置优先，相关资源4.3.1211。
- 1185M／1187M／19M／8M真实来源回归覆盖取手后连续、停站、北端离图、特急括号、反方向入图及未验证来源隔离。64 Node checks、31 tools suites、4 Python guards PASS（保留基线warnings）；本地浏览器确认1185M取手后SQL E531 PNG正常显示，error0。
- 自动审批首次拒绝新增内部函数权限收紧；核对SECURITY INVOKER、RLS与无公开写权限以及既有内部函数ACL后，仅撤销本次新函数的默认公开执行权限，复审通过，未新授任何权限。其他六项本地修改保留。

### 2026-10-14 JST — 方向／目的地标签恢复图标正下方（DONE：8517fce3已发布，公开17标签验证通过）

- 用户指出方向应该在列车图标正下方。常规线路 _trainLabelY 的上／下行共用 py+21，方向箭头仍按实际运行方向；共享 resolveLabels 固定横向中心，只允许向下避让，不再横移或移到图标上方。移位时保留竖直引导，完整终点不裁切。既有大江户六形地图的专用方向走廊继续使用原入口。
- 适用仅 trains 的共享 renderer/layout；其余六页不加载这两个模块，车型／SQL／拓扑不变。缓存资源 4.3.1210。新增真实函数上下行／未知方向锚点检查与密集标签不横移／不上移回归。
- 本地 Joban DOM 13 标签全部位于所属 PNG 下方；横向中心最大误差0.000041px、最小间隙5.59px，标签互相重叠0、error0。密集站点仅向下延后标签，并用竖线保持归属。
- 修改前备份 recovery/local-backup-20261014-before-caption-anchor；原六项独立修改保留。

### 2026-10-14 JST — 常磐快速车辆判定补齐（DONE：SQL／公开页面验证通过）

- 用户要求补齐当前 Joban 页车辆判定。复用 Supabase train_vehicle_rules／evidence_sources、既有 export-vehicle-operation-evidence.js、TrainOperationEvidence、TrainVehicle 和原生 PNG；未新增第二套车型 resolver、线路后缀默认值或运行拓扑。
- 当前公开 JO/J 20260314 平日／休日表、确切列车号／列车种别／首都圈停站及同编组 G 组，与 JR East E231、E531、Hitachi/Tokiwa E657 官方资料交叉核对。按线路+完整列车号+calendar 写入 1,143 个 Grade-C timetable-reference：Joban 682（平日343+休日339，现有班次全部覆盖）、JobanMain 375、NaritaAbikoBranch 86。323M↔1152M／1157M、327M↔462M 为明确刊载的同编组关联，不是所有 M 号默认 E531。北段 E501/E531 混用等未核对号保留未判定。
- 计划车型适用 2026-10-14～2026-11-30，到期必须重新核验；不声称当天实际编组、特殊涂装或未验证的时刻表日期。原 ODPT template source_revision_date=null 等状态保留，不提升为当前已核验时刻表。成田线页面／拓扑仍独立。
- 既有 canonical exporter 的 mapping-input 更新两份快照，保留全部原 records／datedRecords／familyRules／aliases／carsets；既有 2,660 条 reference 全部保留，总数 3,803；inventory 与 SQL 增量一致。
- 修复共享 TrainPositionEstimator 缺失 source calendarType：纯 SQL 位置也能按源 Weekday／SaturdayHoliday 解析车型参考；不根据宿主日期或线路号段猜车型。TrainVehicle 增加 E657 标准模型原生 PNG 的明确目录登记，不从列车号判特殊涂装。三种 PNG 均原生 82×98。
- 适用页面 trains／realtime 共用车型与推算模块，相关三个资源 4.3.1209；home/history/tourism 不加载该链路，无需改运行逻辑。63 页面／服务日检查、31 tools suites、4 Python guards PASS（保留既有基线警告）。新增完整 SQL-reference→车辆→PNG、纯 SQL 推算平日／休日、跨线／过期隔离及实时车型优先回归。
- 本地真实 Joban DOM 当前 18 个标记全部 vehicle PNG，未判定 0、浏览器 error 0。来源原件、SHA256 manifest、SQL 导入／导出与修改前备份保存在 recovery/joban-vehicle-evidence-20261014；其他六项既有本地修改保留。
- 发布 d04a33ebd6502e9446f4a69bc4c4b3bafd4e8e74；CI / CD 38521567650、Release Guards 38521567540、Pages 38521566583 全 success。三个公开脚本 HTTP 200 并逐字匹配提交。公开浏览器当前 18 标记全部 PNG，车型为 E231常磐快速／E531／E657，未判定 0、标签重叠 0、error 0、无横向溢出；加载 build=d04a33eb。SQL 对照再核对：Weekday343/343、SaturdayHoliday339/339。报告 recovery/reports/2026-10-14_joban_vehicle_completion.md；发布后验收记录保留本地。

### 2026-10-14 JST — 页面问题汇总修复（DONE：发布与公开页面验证通过）

- 成田线保持独立，Joban presentation.lineIds 仅 Joban；常磐快速日／中／英文标题移除成田线，NaritaAbikoBranch.branchOf=Narita 保留，实际我孙子跨线班次仍按证据判断。此前融合条目已明确标为撤回。
- 保留既有上野东京走廊语义、上野基础终点、品川延伸停站与实际目的地，以及同站交接的 running-chain 修正。
- 复用 TrainTrackLayout：稳定标识槽位发生哈希碰撞／相邻段重合时再次避让，不改变 stationIndex、段进度或删除列车。复用 trains-render 标签更新生命周期：完整目的地避开站名、图标、其他目的地；移位标签带虚线引导；动画每帧共用一次布局，既有大江户六形专用布局保持。
- Supabase 只读核对：Joban 相关 train_vehicle_rules 仅 chiyoda-joban-odakyu 缓行网络 1593 行；常磐快速／本线未找到可用规则或 operation observations/runtime evidence。保持未判定圆点，未从线路／号段猜测车型，未写入数据库。
- 新增同站 12 班列车不重合、反转 SQL 行序保持布局、8 个目的地避让站名／彼此并保持边界、独立标题／支线归属回归。31 tools suites、63 node checks、4 Python guards PASS（既有 baseline warnings）。本地真实页面 13 标记／13 完整标签，标签重叠 0，无浏览器 error／横向溢出。
- 修改前备份：recovery/local-backup-20261014-before-summary-fix；保留原有六项独立本地修改。发布仅三个标题字段、共享布局／渲染与 trains 资源 4.3.1208、回归和本记录。
- 发布提交 2ea7d5e028cf142f8e4b6b9d137d585ef20aa891；CI / CD 38506660361、Release Guards 38506660586、Pages 38506659081 全 success。公开布局／渲染／canonical JSON HTTP 200 且匹配提交。公开浏览器测得 13 标记／13 标签：标记互相、标签互相、标签与站名的重叠均 0，error 0，无横向溢出；独立卡片常磐快速上野↔土浦／成田线佐仓↔松岸、UenoTokyo 卡片 0。报告 recovery/reports/2026-10-14_joban_summary_fix.md；本条发布后验收记录保留本地。

### 2026-10-14 JST — 用户叫停：撤回成田线融合

- 用户明确“有单独的成田线，不要融合”。停止该方案，撤回 34122a62／74164c7a 的组合成员与地图融合改动，恢复独立成田线及原支线归属。保留此前上野东京走廊与上野基础终点修正。
- 发布仅撤回融合范围；其他原有本地数据修改保留。资源升至 4.3.1203 使撤回立即可加载。

### 2026-10-14 JST — 常磐快速・成田线组合范围补齐（已按用户要求撤回）

- 用户指出标题包含成田线但地图只绘常磐快速，先前验收漏查该范围。根因：NaritaAbikoBranch 物理 branchOf=Narita，Joban presentation.lineIds 只有 Joban；原 geometry／positions 仅依父子关系，漏掉另一个父线下的组合展示成员。
- Joban 既有 presentation.lineIds 增加 NaritaAbikoBranch。共享 LinePresentationService.getMapBranchIds 根据 canonical 支线与显式组合成员范围统一给 geometry、train positions、activation 供给。保留 NaritaAbikoBranch.branchOf=Narita、原拓扑／运行情报／SQL source identity，不重新建表、改名或复制站表。
- 我孙子 junction 与东我孙子、湖北、新木、布佐、木下、小林、安食、下总松崎、成田九个站点使用既有支线几何；支线 SQL 列车以 branch fusionRole 投影到该列。成田主线原页面仍保留我孙子支线和机场支线。
- Supabase 原有平日 80／SaturdayHoliday 80 班次；本次只读核对，未修改 SQL。新增真实数据结构回归同时验证成员范围、双页面分支、物理归属、支线列车、移动／桌面九站坐标与画布边界。
- 验证：31 tools suites、64 页面／服务日检查、4 Python guards PASS（既有 baseline warnings 保留）。相关资源版本 4.3.1201。原有其他本地修改保留，数据发布仅含 presentation.lineIds 增量。
- 下一步：同步上线并实际检查公开 Joban 地图的支线站点和支线列车；此前截图／视觉声明不代替这次验收。

### 2026-10-14 JST — 上野东京运行走廊语义修正（DONE）

- 用户更正：上野东京线是连接品川—上野的共用运行走廊，不是独立线路；常磐以上野为基本终点，部分班次（含特急）按实际时刻表延伸品川。
- 复用 RuntimeConfig 的走廊角色声明、共享 LinePresentationService／DataState／LineCard、trains-data 和 RunningChainResolver：走廊不生成独立线路卡片或直通标志，不参与列车跨线路后继拼接；原 source records／站表／SQL 保留。Joban presentation.originStation=Ueno，只影响基础区间文字，保留所有品川延伸停站与特急实际目的地。
- 修正所有线路交接条件：前段末站必须等于后段首站，不能只因两站同属 handoverStations 集合而串联。成田线等真实跨线关系与证据判断保留。
- 测试：63 页面／服务日检查、31 tools suites、49 线路排序、运行情报隔离、4 Python guards PASS（既有 baseline warnings 保留）。新增多交接站误串复现、走廊隐藏／真实成田直通保留、常磐上野基础区间卡片检查。相关七页资源版本 4.3.1200。
- 既有独立本地数据改动不纳入本次发布；railway_data.json／file fallback 仅发布 presentation.originStation 增量。修改前文件备份于 recovery/local-backup-20261014-before-corridor-fix。
- 最终发布 HEAD：5e18ad0a0b4158b537f8c78000ce99ee54914210（生产增量 ea75bbb3／4505d6f7；测试调用参数修正 5e18ad0a）。CI / CD 38504289194、Release Guards 38504289184、Pages 38504288765 均 success。
- 公开浏览器 DOM：常磐卡片为 上野↔土浦，UenoTokyo 独立卡片数 0；地图保留 品川／上野，直通上野东京文本 0，列车标记中 UenoTokyo 误串 ID 0。按真实班次停站及 destination 保留品川始发／终到，包括特急。未做系统截图或宣称人工视觉验收。
- 发布完成后的验收记录保存在本地；原有六项独立修改保持，JSON／file fallback 仅向线上增加 originStation 字段。

### 2026-10-14 JST — 公开 Joban 页面只读检查（DONE：诊断；未修复）

- 用户要求检查当前浏览器 trains.html#Joban。实际 DOM／日志、只读 Supabase SQL 与现有 resolver 最小复现完成；未修改生产脚本或数据库。
- P1：running-chain 将 Joban 1161M 与 UenoTokyo 1159M、1157M 与 1155M 错串。_confirmedEdge 仅要求末站／首站各自在 [Ueno,Tokyo,Shinagawa] 内，没有要求同一交接站；上野 11:32 → 品川 11:35 被当作 dt=3、numberChanged=true、sourceLinked=false 的连续边。
- P2：实际目的地 DOM 边界框捕获 5 对重叠；同站圆点也重合。
- 车型覆盖缺口：初始 20 标记均为未判定圆点，0 PNG；Joban／JobanMain／UenoTokyo 现有证据审计为 0，抽查 SQL mapping unresolved。中性降级本身符合证据规则，不是 PNG 文件损坏。
- 页面加载／状态正常，浏览器 error／warn 为空，503×603 视口无横向溢出；未使用系统截图。报告：recovery/reports/2026-10-14_joban_browser_inspection.md。原有本地修改保持。

### 2026-10-14 JST — 本地备份、线上同步与 trains.html 公开发布（DONE）

- 用户明确授权保留本地备份、与线上同步并公开对接 trains.html。24 个文件逐文件 SHA256 备份通过；原始完整 binary patch 和 manifest 保存在 recovery/local-backup-20261014-before-publish，Git stash backup-before-non-full-sql-publish-20261014 继续保留。
- 工作区已快进至 origin/main 5483796c8cbed364b0158a95ab7f6a5de9e31cac，在最新脚本上合入非 FULL SQL 策略；保留线上新增日历有效性、候选车型分级、列车去重、荒川 ODPT trip ID 保护、渲染和日期叠加功能。未覆盖 Supabase v142/v7 函数。
- 发布范围为既有 ODPTClient、DataFusion、trains-page 的共用 SQL 选择规则、共享配置注释、七页相关资源版本 4.3.1199 及回归测试／执行记录。本地其他原有数据、Meguro manual、normalization backlog、db-loader 改动在备份／工作区保留，独立于本次发布。
- 最新基准验证：31 tools suites、61 node:test checks、4 Python guards PASS；保留既有 baseline warnings。SQL 已有 210 非 FULL 线路，13 FULL 禁用 SQL，新增班次导入及 PNG 检查记录见本次报告。
- 发布代码提交：0cccd721bf834f568f7a881b7879be7aa9ad5e3d。CI / CD 38495454495、Release Guards 38495454599、Pages 38495454358 全部 success；公开四个改动脚本 HTTP 200、SHA256 与提交内容一致，页面资源版本 4.3.1199。
- 真实浏览器 DOM 验收通过：公开 trains.html 山手线显示 planned-trip 1000G／929G 等 SQL 班次及原生 E235系0番台 PNG；埼京线显示 odpt.Train／urn:ucode 实时标记，接口为 REALTIME_API_LINE BYPASS；没有浏览器 error 日志。未使用系统截图或声明人工视觉验收。
- 原有六个独立本地修改逐文件 SHA256 与备份一致；备份、binary patch 和 Git stash 均保留。发布验收材料存放在 recovery/local-backup-20261014-before-publish。

### 2026-10-14 JST — 非 FULL 线路统一 SQL 时刻表（数据库完成；前端本地验证完成）

- Workstream：non-full-sql-timetables；执行者 Codex；Commit SHA：未提交。用户明确要求 ODPT／SQL 列车号 → 线路车型对应 → TrainOperationEvidence → TrainVehicle → PNG 检查，非 FULL 统一 Supabase SQL。本次要求优先于此前“所有实时 API 线路禁止 SQL”的记录。
- 复用既有 ODPTClient、RuntimeConfig、DataFusion、trains-page 及 Supabase 导入／canonical mapping 链。覆盖模式与 API 存在性分离：210 非 FULL 使用 SQL，13 FULL 禁用 SQL；实时观测仍优先，缺失或错误 SQL 不复活旧 JS 位置源。日期滚动与直通依赖同步采用新规则。
- Supabase SQL 更新 railway_lines 的现有 eligibility 字段；通过现有 SQL job／timetable-ingest／persist_odpt_timetable_templates 补齐 18 条线路的平日与休日。36 jobs：26 complete、10 partial、0 failed；新增 12,842 有效班次、220,482 停站，171 不完整上游记录被排除。现有 210 条 SQL 线路、92,320 模板，缺失非 FULL 线路及新增模板 canonical resolution 均为 0。
- 实测服务接口：Yamanote 522／Mita 406／Rinkai 296，Keiyo 558 PARTIAL，Kawagoe 3 PARTIAL；SaikyoKawagoe FULL BYPASS。山手线实际 SQL 522 条经既有证据／车型解析均得到 E235系0番台同车型原生 PNG。证据不足的其他列车不猜车型或编成。
- 验证：31 tools suites、50 node:test checks、4 Python guards、JS syntax、diff check PASS；83 canonical artworks、78 refs、466 locked PNG、0 missing native PNG。保留既有工程 baseline warnings。七页相关资源版本升至 4.3.1198，原有未提交改动保留。
- 修改：data/api/odpt-unified.js、runtime-config.js／data-config-bundle.js、js/data-fusion.js／trains-page.js、两个既有 Supabase function 源文件、两个既有测试、七页资源版本及本进度记录。完整执行与验证记录：recovery/reports/2026-10-14_non_full_sql_timetables.md。
- 发布边界：数据库 SQL 已执行；前端未提交／推送／发布，browser runtime: NOT VERIFIED。未部署或降级现有 train-runs v142／timetable-ingest v7，它们已经支持 SQL eligibility；本地改动保持较旧工作区接口，不整文件覆盖线上新功能。

</details>

<details>
<summary>2026-10-13 JST — 历史执行证据</summary>

### 2026-10-13 JST — SQL 已核验车辆 PNG 路径断链修复（REVIEW）

- 根因：`train-runs` 经 `train_timetable_source_resolution` 已传回 source-dated `dated_operation_owner` 车型与 `vehicle_artwork_path`，但 `js/train-position-estimator.js` 的 `resolveTrainRunIdentity` 和 `matchRealtimeVehicleEvidence` 只让 `dated_schedule_rule` 携带图片。既有 TrainVehicle 解析器因此收到确认车型却丢失可用 PNG，渲染退化为中性点。
- SQL 只读核验：`train_timetable_vehicle_mappings` 中 `dated_operation_owner` 64 个车型映射，`train_timetable_vehicle_artwork` 均为已登记的 `相模鉄道_20000系_YOKOHAMA_NAVYBLUE.png`；GitHub 列车图库 468 张 PNG、Supabase 467 条资产登记、38 个编成图标链接，SQL 引用路径均存在于 Git 树。
- 修复：仅扩展现有 `js/train-position-estimator.js` 的 3 个 source-dated PNG 许可条件，从仅 `dated_schedule_rule` 改为允许 `dated_operation_owner`。模型仍必须是单一来源认证的同一 identity，路径仍须经过 `TrainVehicle.resolve` 的 exact-model + gallery path 检查；不把 `source_single_type_candidate` 升级成准确车型，不引入新脚本/映射表，也不更改 SQL/RLS/静态拓扑。
- 提交：`5e847bae`（代码）；`20d1837f`、`292e6a80`（补充并隔离已有 `tools/train-vehicle-icon-resolution.test.js` 的 source-dated owner/候选负例回归）。
- 测试：最新版 `292e6a80` 的 GitHub Release Guards 已成功，CI Validate 已成功。GitHub Pages 的最终部署及交互可视化仍需以最新 Actions 与真实浏览器检查为准；无外网 DNS 时不伪称生产 PNG HTTP 200。
- 限制：本次恢复的是已有充分证据的 PNG 通路，不代表 223 条线路的每一趟列车都能断言具体车型。无证据列车保留灰点，不凭运营线路、车次或图片名称猜测。
- 浏览器兼容补充：列车 SVG `<image>` 创建及路径更新时，现同步设置 SVG2 `href` 和带命名空间的 `xlink:href`，与既有站内图标双引用策略对齐，降低 Safari/iOS 兼容风险（`1cf11ed9`）。新增 `tools/train-vehicle-icon-resolution.test.js` 双属性回归（`e21bfab7`），`tools/train-position-evidence-regression.test.js` 的仿真 DOM 补充 `setAttributeNS` 和真实 SVG 双属性断言（`839be1a8`）；测试不依赖改变车型判断。
- CI 修复记录：`e21bfab7` 曾在 Train Position Evidence 回归测试失败（模拟 SVG 节点遗漏标准 `setAttributeNS`，非生产 JavaScript 运行时缺失）；已针对 test fixture 修复，`839be1a8` Validate 与 Release Guards 成功，最终 Pages 以 Actions 验收结果为准。
- 后续：若用户所指为其它具体线路仍不显示，按该线路的 `vehicleIdentityStatus`、`vehicleIconPath`、浏览器 SVG image/error 与 ODPT 源记录排查；线型参考图片本身不能证明某一具体班次使用该车，禁止批量填充猜测车型。

### 2026-10-13 JST — GitHub × Supabase 结构体检整改（PARTIAL）

- 范围：只修复已确认且不改变线路事实/身份/RLS 的问题。没有批量删除手动时刻表、迁移 pg_net、覆盖已验证车型或复活第二套位置推定。
- 数据库索引：执行 Supabase migration `20261013072931_index_timetable_ingest_jobs_line_fk`，给 `public.timetable_ingest_jobs(line_id)` 增加外键索引；GitHub 同名文件已同步（`2dd13aeb`），Performance Advisor 的 `unindexed_foreign_keys` 告警已消失。
- 日期有效性：`train-runs` 在原 `train_timetable_source_resolution` 查询中读取已有 `timetable_validity`，每班返回 `timetable_validity` 和 `timetable_date_verified`，并新增 `date_verified_runs` / `date_unverified_runs`。不改变原 `complete/partial` 的结构完整性含义，不将来源日期未知当成当前有效，也不删掉可用的停站推定（`53542744`）。
- 防回归：扩展现有 `tools/performance-lifecycle.test.js`，检查来源日期验证与结构完整度独立（`ec070a35`）；对应 GitHub CI / CD 与 Release Guards 已成功。
- Supabase Edge：`train-runs` 已发布为 ACTIVE v70，部署源码与 GitHub 逐字节一致，保留已有公开只读 GET / `verify_jwt=false` 契约。无法由当前执行环境直连实际 HTTP 端点（外网 DNS 不可用），所以不声称真实 API 响应验收通过。
- 数据证据：未修改数据库中 `undated_not_current_verified` 或 `actual_vehicle_confirmed=false` 的原始状态，绝不凭数据行完整、计划车型或 PNG 文件名提高证明级别。
- 尚未自动处理（需要前置条件）：`timetable-ingest` 仍有从公开仓库解码 ODPT key 的兼容路径。现有工具不能查看或设置 Edge secrets，也不能替上游轮换凭据；在确认 `ODPT_CONSUMER_KEY` / `ODPT_CHALLENGE_CONSUMER_KEY` 已配置前删除 fallback 会使导入中断。需要先配置新服务端凭据，再移除公开回退并做真实导入验收。
- 保留（不属于安全一键修复）：45 张 RLS enabled/no policy 表默认拒绝访问；`pg_net` 扩展 `extrelocatable=false`，禁止直接 `ALTER EXTENSION SET SCHEMA`；历史未使用索引/源时刻表缺少现行有效证据，继续保留待测，不做无凭据猜测。
- 最低验证：迁移文件与数据库版本一致；索引存在；性能告警下降；GitHub CI / CD & Release Guards 成功；Supabase Edge v70 源码一致。尚需浏览器生产 HTTP 与真实接口返回的最终验证。

### 2026-10-13 JST — realtime 分支梳理与增量落地（REVIEW）

- 依据提交历史梳理 9 个 realtime 相关远程分支与 main 的关系：`ome-itsukaichi-isolation`（data-state.js/line-card.js/runinfo-scope 测试与 main 逐字节一致）、`yamanote-single-chain`（data-fusion.js 已含 "No parallel realtime merge"、无 Composite mode 残留）、`yamanote-canonical-station-indices`（trains-geometry.js 与 main SAME，canonical index 断言已在）、`odpt-realtime-vehicle-evidence`（JST 服务日修正 `_snapshotJstNow` 已在 main）、`odpt-dual-source-model`（main 已有 matched-timetable 与 dated_operation_owner）、`odpt-default-markers`（main 的 roster/vehicle 证据链已超越分支）均已吸收；`realtime-source-authority` 的 `_realtimeSourceIdentity` 已在 main。
- 移植 `fix/double-column-loop-readability-20261011` 的双列环可读性增量：`js/trains-geometry.js` 双列环 rectW 加宽（移动 120/桌面 132，普通环 63/67.2 不变）、修复 `svgW = rectW + _isMobileView() ? 225 : 240` 运算符优先级 bug（恒取 225/240，丢弃动态环宽）、返回对象补 `isDoubleColumnLoop`；`js/trains-render.js` 站名标签双列偏移 ±24、新增 `_trainLabelDisplayX` 将环方向标题移入内环走廊并在初绘/逐帧两处调用。保留 main 的 canonical index 存储（分支旧 loopPts.push 不回退）。
- 移植 `fix/realtime-source-fusion-safe-20261010` 的 3 项独立修复：`_isFreshRealtimeRecord` 拒绝未来 `dc:date`（> now+60s 时钟偏差）；ODPT railway 多候选匹配改唯一匹配（`_mappedMatches.length===1` / 精确 `_exactMatches`），移除子串猜测兜底；`_linePositionIndex` 空 trainId 不折叠、`set` 前判空。其余分支改动（_uniqueMatchedChain/_timetableFallbackReason/odpt-unified 缓存）已被 main 10-13 融合管道重写取代，不移植。
- 测试：`train-position-evidence-regression.test.js` 新增双列环布局、唯一匹配、空 trainId、未来时间戳 4 组断言；railway-browser-contract 26 pass、vehicle-icon/runinfo/performance 全 PASS，brace/arch/ci/home 4 个 Python guards PASS，`git diff --check` 通过。trains.html 的 trains-geometry/trains-render 版本升至 4.3.1197。
- 未提交/推送/部署；先前本地 TokyuMeguro-manual.js / normalization backlog / PROGRESS 部署记录保留。真实浏览器视觉由用户人工确认（项目规则：禁止系统截图确认）。

### 2026-10-13 JST — realtime 实机体检与 ODPT 命名空间修复（REVIEW）

- 实机体检（桌面浏览器 + DevTools）确认：线上 trains.html 三脚本均为 4.3.1197 且 SHA256 与本地一致；山手线双列环（#Yamanote）左右站名、内环/外环方向标签（环带走廊）、换乘字母（JA/JS/JB/M/S/E/KD/OH/JK/JC/G/JO/JE/JU/JT/Y）均无遮挡；京叶线（#Keiyo）站点/换乘字母正常；console 无 JS 错误；运行情报弹窗（埼京线·川越线）直接显示 ODPT text 原文（平常運転，更新 16:12）。湘南单轨官网外部状态图 2 个 404 属 runinfo 降级，非本次范围。
- 体检发现并修复唯一匹配回归（提交 `55de0918`）：ODPT `odpt:railway` 带运营商命名空间前缀（如 `JR-East.Joban`），而 `_railwayCodeLines` 的 key 是无前缀短名（`Joban`），导致修复前唯一匹配永远 miss、京叶线/常磐线位置落入 ambiguous 分支（console 曾出现 1473E/JR-East.Keiyo、2394M/JR-East.Joban 两例）。修复：`var _shortRailway = String(railwayName).split(".").pop();` 后再查 `_railwayCodeLines[_shortRailway]` 与 `_exactMatches`；映射命中如 `JR-East.Joban` → `JobanMain`（常磐線本線），未映射短名走精确匹配（`Keiyo` → 京叶线）。测试补命名空间规范化断言；`train-position-evidence-regression.test.js` 全 PASS。
- 部署确认：55de0918 推送后线上 data-fusion.js SHA256 与本地 match=True 且含 `_shortRailway`；页面刷新后 console ambiguous 日志消失，新 build 以 `?build_ead08907a08956` 出现在 odpt-unified.js 等资源 URL。远程 main HEAD = 55de0918a267d6ef411e250086ead08907a08956，本地与 origin/main 0 ahead / 0 behind。
- 视觉验收由用户人工确认（项目规则：禁止系统截图确认；诊断截图用完即删）。

### 2026-10-13 JST — mapping cleanup and snapshot validity optimization

- Deployment verified: `6f0bbf801d530f20395ca126eb0191eb57c3905b`; CI/CD `38348625461`, Pages `38348624436`, Release Guards `38348625389` and canonical sync `38348625381` all succeeded. Published trains HTML uses this build, and all three changed runtime scripts match local SHA256. Deployment audit saved as `mapping-optimization-deployment.json` outside the repository.

- Kept the existing scripts and shared data chain. Vehicle rosters now index owner/car and owner/formation, select the newest snapshot not after service day, then validate active status. Retired/status-conflicting records cannot revive an old active car; canonical alias duplicates converge. Snapshot replacement rebuilds indexes.
- Evidence network matching caches the verified alias graph, handles deep/cyclic aliases, and parses ODPT railway namespaces explicitly. Removed arbitrary suffix matches; audit uses this exact shared matcher rather than a second alias implementation. Realtime fallback identity uses normalized operator scope.
- Coverage audit now uses the estimator's Japan service date/calendar and separates historical from current eligible evidence: 223 lines audited, 35 with stored evidence, 17 with currently eligible rules on 2026-10-13 weekday. Eligibility still requires exact train/run matching; it does not certify every train or today's formation.
- Extended existing tests for retirement, future snapshots, conflicting status, deep/cyclic aliases, cache replacement, suffix isolation and JSON/browser roster parity. 31 tools suites and 49 service-day/browser tests passed; four Python release guards and HTML/script verification passed. OCR delegation review includes changed runtime/audit and manually includes test files; unrelated Meguro/backlog changes preserved.

### 2026-10-13 JST — all-line vehicle mapping and deduplication

- Deployment confirmed: `daf7b982be7035ce0a130b02b5a1514f8e07c16c` pushed to main. CI/CD `38347461263`, Release Guards `38347461260`, canonical sync `38347461271`, Pages `38347461046` all succeeded. Published HTML points to this build; runtime/evidence/05 shuttle PNG match local hashes. Final service-day/browser total: 49 tests passed.

- No new project scripts. Shared `TrainVehicle` now resolves source-supplied car/formation IDs against sourced SQL carsets, scoped to owner and snapshot date. Physical identity outranks planned references; contradictory physical/model evidence blocks PNG selection.
- Existing canonical exporter admits every source/date/calendar-complete network, instead of Saikyo only: 2,660 references (Saikyo 826, Chiyoda–Joban–Odakyu 1,593, Odakyu main 241). The 67 Tobu rows without calendar remain excluded from this provider; existing Tobu evidence stays intact. Added 8 TWR carsets / 80 car IDs through the Supabase read-only connector export, without exposing credentials.
- Official Tokyo Metro Chiyoda 05 shuttle identity projects to its existing native PNG; bare ambiguous 05 family remains unresolved. All six exported reference models now have model-exact PNGs.
- Realtime deduplication uses source `owl:sameAs`/train object identity, or operator/railway/number/direction scope, and rejects older duplicate records. Existing SQL/realtime running-chain deduplication remains the single physical-run join.
- Existing artwork audit checks all 223 canonical lines: 35 have local source-scoped evidence; all others require explicit source identity. 83 canonical artwork records, zero missing native PNG paths. Report saved outside repository as `all-line-vehicle-mapping-audit.json`.
- Validation: 31 tools suites, service-day/browser contract tests, all 4 Python release guards pass. OCR delegation review covers runtime/export/audit changes and generated snapshot consistency; unrelated local Meguro/backlog edits remain untouched.

> 本文件是智能体之间的**唯一共享进度账本**。开始工作前先读 `ENGINEERING.md` 和本文件；完成/阻塞/交接后必须更新本文件。
>
> 最后人工整理：2026-10-07 JST

### 2026-10-13 JST — train icon deployment verified complete

- 发布提交：fbcc68828714b077d9c89363b6536827cf928b67，已推送 origin/main。CI / CD run 38339581582 的 Validate 与 Deploy to GitHub Pages 均 success；Release Guards run 38339581463 success；pages build/deployment run 38339580685 success。
- 线上验收：pages/trains.html HTTP 200，引用本次 ?build=fbcc688... 且含 no-cache meta；railway_data.json 的 JO 成员为 [Yokosuka,SobuRapid]；新 db-loader cache key 识别 build 标记。抽查 3 张已有列车 PNG HTTP 200、SHA256 与本地完全一致。
- Supabase：train-runs 已部署 ACTIVE v60，保留既有公开只读 verify_jwt=false 配置；旧 v59 源码/元数据已备份到当前对话 visualization。真实请求 Rinkai / 2026-10-13 = HTTP200、SQL HIT、296 个 canonical timetable runs；SaikyoKawagoe = HTTP200、REALTIME_API_LINE BYPASS、0 SQL runs，实时数据源隔离正常。Rinkai 响应无 certified vehicle label，不能据此声称全部车次都有已确认车型；无证据继续维持 UNKNOWN，而不猜图标。
- 校验范围：资产发布、CI/Release Guards、线上页面/缓存/JO 数据、PNG 完整性及真实 SQL/API 读请求；未进行人工浏览器互动验收。
- 发布未包含先前独立的 TokyuMeguro-manual.js / normalization backlog 修改；仍保留本地文件及原始 stash/备份。本段是部署后的本地进度记录，尚未另行提交。

### 2026-10-13 JST — train icon deployment release (in progress)

- 用户明确授权完成列车图标部署。发布已验证的最新版整合及 JO 合并展示修复，保留 canonical 实体、车辆/编成证据、同车型 PNG 和实时/SQL 单一链路。原始本地工作仍在备份及 stash。
- 发布范围：页面/缓存/地图数据融合/SQL 日期查询/现有测试；TokyuMeguro-manual.js 和 normalization backlog 是先前独立修改，本次不提交、不发布。没有新增脚本。
- 发布前检查：47 node:test PASS；49 排序/JO 地图检查 PASS；77 图片引用 PASS；466 locked PNG 内容校验 PASS；列车图标身份/同车型映射回归 PASS。此前全套 33 工具测试与4工程 guards 已通过。
- 新修复：db-loader 的缓存 key 识别 deploy workflow 的 ?build=SHA，同时兼容 ?v=，避免新发布继续读取分开 JO/旧图标的静态缓存。新增实际版本键行为测试。
- Supabase train-runs v59 部署源码已备份，并确认其与 GitHub 最新基准一致；拟发布已测试的日期 run/stop 分页及部分有效数据保留。沿用现有 verify_jwt=false 的公开只读接口，不改 schema，不发布 importer。
- 完成条件：GitHub CI/CD 与 Release Guards 成功，Pages 实际页面为本次 build，静态图标可访问；Supabase 函数更新并通过真实读请求验证。

### 2026-10-13 JST — JO combined presentation restored after user correction

- 用户明确：横须贺线与总武快速线分开是错误编译产物，不能当作新版设计。此前为接受分开结构而修改 real-data 测试的判断已撤销；原“独立 JO”整合记录是错误判断，以下更正为准。
- 只恢复两条 canonical line 的 presentation.lineIds = [Yokosuka, SobuRapid]，Yokosuka 为展示 primary。保留独立物理站表、时刻表、运行情报、列车身份、ODPT/API 能力和既有东京站 handover；未合并实体 topology。
- railway_data.json 与 railway-data.file.js 同步，程序验证两份数据一致，并验证移除这两个成员字段后所有其余 canonical 字段与修改前完全相同。
- 恢复 JO 单一卡片排序断言，并新增 SobuRapid 不单独占卡片、两线共同成员声明、file fallback 一致、东京站地图延伸和两条实体实时列车身份保留的行为检查。
- 七页 db-loader 版本统一提升至 4.3.1194，避免旧静态缓存的分开列表继续留在界面。没有新增脚本。
- 验证：排序/地图检查 PASS；46 node:test 页面/服务日/直通检查 PASS；identity coverage、runinfo scope、frontend smoke PASS；canonical entity guard / home guard / diff check PASS（既有 baseline warnings 保留）。未提交/推送/部署。

### 2026-10-13 JST — latest-main integration completed locally (PASS; deployment pending)

- 用户授权：先保存旧工作区，取得线上新版，迁移仍需要的改动并验证，再更新原项目目录。整合基准 = origin/main 9b7c3915ba6d83e39180368d8428769c5e33734b，较旧本地基准多 115 个提交。
- 安全保存：22 个原本未提交文件逐文件备份并核对 SHA256；完整 7,705,589 字节 binary patch / manifest 保存在当前对话 visualization/local-backup-before-online-integration。原始工作将另外保留在 Git stash 中；不丢弃恢复材料。
- 最新架构优先：保留 canonical timetable/source resolution、实体直通链、operation owner/车辆证据、来源 PNG 校验；复用新版单推定与日本时区实现。实时 API 线路保持 API 权威，不以空快照启动 SQL；当前地图中的无实时 API 支线/直通段使用 SQL，维持混合展示。旧 FULL 断流自动切 SQL 不迁移。
- 迁移增量：SQL-only 行按服务日期限定；现有 position timer 按分钟推进、跨日失败逐线重试；旧推定清理；区间进度/有效期 dirty 检测；支线/延伸数据 scope 与展示体系分离；实时请求与时刻表加载并行；当前空位置快照不复活旧缓存；SQL 优先级及日期 run/stop 分页、有效部分保留。
- 原本的 TokyuMeguro-manual / normalization backlog 无线上重叠，保留本地更新。旧车辆快照、旧 resolver/exporter 及其旧测试已被新版 canonical 证据/测试取代，不覆盖线上新版；原文件完整保存在备份与 stash。PROGRESS 历史记录保留。
- 脚本约束：只修改现有工程脚本/页面/测试，不新增工程脚本。HTML 资产版本升到 4.3.1193；版本 guard 允许不低于已验证的发布版本，避免新版本被旧的精确 pin 拒绝。
- 排序测试修正：新版 canonical 将 Yokosuka / SobuRapid 建为独立 JO presentations，旧 real-data 测试仍要求单一 JO slot。现断言两项独立实体及成员边界；不改变 canonical topology 或公共排序逻辑。
- 验证：46 node:test checks PASS；33 工具测试/映射/图库检查 PASS；4 Python 工程 guards PASS（保留原有基线警告）；43 JS scripts 语法 PASS；train-runs TypeScript 语法 PASS；git diff --check PASS。Open Code Review 内置委托方式审查整合范围，未发现未解决 high/medium 问题。
- 未提交本次改动、未推送、未发布 GitHub Pages / Supabase Edge。真实浏览器验收与线上部署验收仍未执行。

### 2026-10-13 JST — GitHub online/local reconciliation audit

- 用户要求与线上仓库核对。两次 git ls-remote 验证线上 main = 9b7c3915ba6d83e39180368d8428769c5e33734b；本地 HEAD/origin-main 缓存仍为 175b87a7095a71fbc3f88411039519fd83e864ea。GitHub compare 确认线上领先 115 个提交、修改 101 个文件。
- 本地 22 个未提交文件，其中 19 个与线上修改重叠；22 个文件按固定 SHA 读取线上内容，三方文本比较 16 个文件出现冲突，均未执行工作区合并。核对快照与报告保存在当前对话 visualization/repository-check。
- 线上已实现单次推定、日本时区/服务日、SQL 来源保留，以及 canonical timetable/source resolution、实体直通关联、operation owner 与车辆证据映射。
- 关键语义差异：线上通过 hasRealtimePositionApi / realtime_position_api_enabled 禁止实时线路查询 SQL；本地允许 SQL 补缺和 FULL 断流回退。整文件覆盖会丢失线上新版字段和证据链，必须按功能迁移。
- 前轮 27 tests 与委托审查仅验证旧基准工作区，不证明与线上新版兼容；原 local PASS 不应当作可直接发布状态。本次只核对，没有提交、推送、拉取覆盖或部署。

### 2026-10-13 JST — Open Code Review delegation completed (local PASS)

- 用户选择插件内置委托模式；OCR 用于 preview/rule，当前 Codex 执行审查，不需要额外模型 API 端点；未修改 Codex 登录凭据。
- 本次范围：OCR 选出的 10 个 refactor 文件全部 reviewed，额外手动检查 tools/performance-lifecycle.test.js；共 11 个文件、0 skipped、范围覆盖率 100%。其余 11 个既有车辆相关改动/进度账本未纳入代码审查；不声称全工作区审查完成。
- 发现并修复 4 项：区间内 segmentProgress/实时有效期变化不触发 dirty fusion（high）；服务日 SQL 失败预先标记日期导致不重试（medium）；SQL 日期与本地日历/分钟轴时区不一致（high）；主线可见 SQL 支线/延伸未激活（medium）。已修复，当前范围无未解决 high/medium findings。
- 修复方式：细化现有 dirty 比较；按线路记录成功 SQL 日期，现有分钟 timer 重试；日历、推定分钟和实时证据统一日本时区/04:00 服务日；可见位置依赖与 presentation membership 分开跟踪。仍不新增脚本。
- 验证：27 node:test checks、performance-lifecycle、train-position-evidence-regression、frontend-smoke PASS；服务日测试在 UTC 和 America/Los_Angeles 环境各 13 项 PASS；git diff --check PASS。审查报告保存在当前对话 visualization 目录 trains-review.json。
- 仍未提交/推送/部署；真实浏览器、GitHub CI/Pages、线上 Supabase Edge 发布尚未验证。

### 2026-10-13 JST — trains realtime / SQL position pipeline (local validation PASS; deployment REVIEW)

- 用户约束：仅改造现有脚本，不新增脚本；保留工作区已有未提交改动。
- 页面结构：trains.html 现有脚本依赖分组说明、更新相关资源版本；Controller 负责线路激活/生命周期，DataFusion 负责唯一位置融合，Estimator 负责时刻推定，render 负责展示。
- 数据：现有 ODPTClient 同时启动实时拉取和 SQL 时刻表读取；SQL fallback_only 不再因线路配置 API 而跳过数据库。SQL 无记录且已有时刻表 API 时保留该 API 时刻表回退；无 API 线路 SQL 缺失保持无数据，不启用旧 manual 脚本位置源。
- 融合：移除两处重复 manual 推定/合并；重算前移除旧推定与过期实时位置。HYBRID 按物理列车去重补缺；FULL 有有效实时时维持权威，断流后允许 SQL；SEGMENTED 保留声明区间规则。SQL 来源标记保留为 supabase-train-run，并持续标为 estimated。
- 生命周期：复用已有 position timer，每分钟推进无实时 API 的时刻表位置，后台停止；日本 04:00 服务日切换重新读 SQL，旧服务日记录不再推定。当前系统/支线共同加载、共同参与可见位置签名和过期检查；当前空快照不复活 IDB 旧列车。
- SQL：现有 train-runs/index.ts 的日期 run/stop 查询分页、stop ID 分批；不完整 run 不影响其他有效 run，返回 partial 与 omitted_incomplete_runs。不新增 schema 或 migration。
- Supabase 只读核查：manual_timetable_templates = 79,473 条 / 191 条线路；train_runs = 9 条 / 2 条线路，最新日期 2026-10-09。实时线上 endpoint 本次未部署修改。
- 验证：performance-lifecycle、train-position-evidence-regression、frontend-smoke PASS；两个现有 node:test 文件共 24 tests PASS，包含 1,005 个 SQL runs / 8,040 stops 分页、部分有效记录保留、空快照、来源优先、FULL/HYBRID 回退、日本服务日边界。JS 语法与 git diff --check PASS。
- Open Code Review 已尝试，但因未配置 LLM endpoint 启动失败；不声称 OCR 审查完成。实际浏览器、GitHub CI/Pages 和 Supabase Edge 部署尚未验证。当前为本地可审查改动，未提交/推送/部署。

</details>

<details>
<summary>2026-10-10 JST — 历史执行证据</summary>

### 2026-10-10 — IMG-001 SQL verified formation artwork integration

- Status: REVIEW（自动化回归 / 浏览器运行环境待确认）
- Scope: `images/列车` 的车型 PNG 映射；适用产品页为 `pages/trains.html`，由 `js/trains-render.js` 共享唯一标记选择入口。运行情报页不显示列车车型 PNG，无需新增映射。
- Ownership: 列车运行证据由 `TrainOperationEvidence`、`runningChainId` 与 `TrainVehicle.resolve` 收敛；PNG 由 `TrainIcons.resolveVehicleArtwork` 与 `TrainVehicle.selectMarkerArtwork` 唯一选择；图形排布仍由 `trains-render.js` 负责。
- Work: 允许 Supabase `vehicle_visual_identities` 的 `exact` 编成级 PNG 用于已经明确的公司+车型+编成身份；执行日期窗口和一身份多 PNG 的冲突拒绝。旧 `tools/gallery-sync.js` 改成只读仓库图库核对，删除其旧 `VEHICLE_NAME_TO_ICON` / line / operator / pool 逆推逻辑；Release Guards 接入只读检查。历史允许 177 条缺图引用的阈值归零。
- Data parity: 2026-10-10 GitHub 476 张 PNG = Supabase 475 条图库资产 + `共通_形式未確認.png`；数据库 62 available / 413 review；`vehicle_visual_identities` 58 exact（38 带图片，均为编成级），不能把 review 图片提升成确认车型。
- Safety: 不变更 PNG、数据库/RLS、列车事实认定；UNKNOWN/NARROWED、无编成证据、日期不符与图片歧义继续落入 neutral PNG。只在原解析器加索引，禁止恢复第二条映射链路。
- Validation: 加入 SQL 编成/日期/冲突回归与图库路径校验。GitHub Actions 与 Chrome 实际数据渲染由本次 PR 校验结果决定最终状态。
- Next: 验证 `CI / CD`、`Release Guards` 和生产列车图；未知车辆图保持中性，不从 PNG 名称反推模型。


</details>

<details>
<summary>2026-10-09 JST — 历史执行证据</summary>

### 2026-10-09 JST — UI-004 / UI-002 non-business DOM coupling cleanup (REVIEW)

- 执行者：ChatGPT GitHub connector；直接修改 main，未使用 Work。
- 目标：解除筛选器对线路列表的全局 DOM 查询、页面 controller 对运营商分组内部 DOM 的重复控制；保留业务数据/页面详情差异。
- 修改：`js/operator-filter-bar.js`、`js/data-state.js`、`js/realtime-view.js`、`js/trains-page.js`、`pages/history.html`。
- 关联 commits：`668d28aa`、`3e5cdc80`、`471a225c`、`6f1a965b`、`4aac2751`；先前历史页容器保留修复 `e193f3ad`。
- 结果：FilterBar 不再从其他组件内部查找运营商；公共 DataState 提供 `setOperatorVisibility` 和 `filterLinesByOperator`，realtime/trains 均调用；realtime 卡片选中状态限定到本页列表；两页空结果走公共列表渲染；history 的稳定 mount 不再预置随后被替换的内部 DOM。
- 静态回读：两个页面均已调用共享筛选接口；页面控制器内 `group.style.display` 已消失；FilterBar 全局 `document.querySelectorAll(".rs-line-list-content...")` 已消失。
- 验证：GitHub 源码回读 PASS；语法/架构测试、CI/CD、Pages、browser runtime **NOT VERIFIED**。
- 遗留：realtime/trains 筛选器+列表组合容器的统一结构契约尚未落地；PageState lifecycle、CSS 全量粘连及七页动态 DOM 完整检查未完成。状态 REVIEW，不得标记 DONE。

### 2026-10-09 JST — UI-004 shared layout boundary follow-up (REVIEW)

- 执行者：ChatGPT GitHub connector；用户要求不使用 Work。
- 修复上一轮 `js/data-state.js` 新增接口意外含字面 `\\n` 的语法风险，commit `095e83d6`；GitHub 源码回读确认已恢复实际换行。
- 为 `pages/realtime.html` 和 `pages/trains.html` 增加一致的 `data-railway-browser` 组合布局容器，分别提交 `450c7c67`、`bfa6c860`；仅包裹筛选器和线路列表，详情视图保持页面业务所有权。
- 结构回读：两页均有一个 `data-railway-browser`，内部保留原 FilterBar、LineList shell、data-state-host，未新增第二套组件。
- 状态 REVIEW：未运行 JS syntax/tests/CI、浏览器和 Pages 验证；跨页结构自动化 guard 尚待实现。不得标记 DONE。

### 2026-10-09 JST — UI-004 railway-browser contract guard (REVIEW)

- 新增 `tests/railway-browser-contract.test.cjs`，commit `db3c6a46`；使用 Node 内置 `node:test`，命令 `node --test tests/railway-browser-contract.test.cjs`。
- 断言：realtime/trains 唯一组合容器及 FilterBar→LineList 布局顺序、数据状态宿主、FilterBar 不全局查询 LineList 内部、两页 controller 只使用共享筛选接口、realtime 选中态局部化、history mount 稳定。
- 文件写入与 GitHub 回读已确认；测试执行、CI、浏览器运行时仍 **NOT VERIFIED**。不要因测试文件存在而声称 PASS。
- 下一步：运行该测试与现有 CI；复核 trains 详情态筛选栏显隐和筛选后结构更新；继续清理 PageState 重复生命周期。状态 REVIEW。

### 2026-10-09 JST — UI-004 trains detail/layout regression fix (REVIEW)

- 修复 `js/trains-page.js` 进入详情只隐藏列表、不隐藏新增组合容器内筛选栏的问题：详情进入/返回分别隐藏/恢复最近的 `[data-railway-browser]`；commit `e771f89c`。
- 切换语言时重建运营商组使用共享 `DataState.filterLinesByOperator`，避免筛选状态丢失；保留原滚动位置及卡片更新逻辑。
- `tests/railway-browser-contract.test.cjs` 添加详情容器显隐及语言刷新筛选断言；commit `a28df3cf`。
- 验证：GitHub 源码修改提交成功；测试执行、CI 和真实浏览器 **NOT VERIFIED**。状态 REVIEW。

### 2026-10-09 JST — UI-004 trains language refresh DOM ownership (REVIEW)

- `js/trains-page.js` 删除 `_oldGroups/_freshGroups/_freshByOp` 的运营商组 DOM 逐个匹配替换；使用共享 `DataState.renderList` 的结果一次更新稳定 list host，保留 `setFilter` 及滚动位置恢复。commit `5575095d`。
- `tests/railway-browser-contract.test.cjs` 新增防止页面恢复内部 group reconciler 的断言，commit `69044912`。
- GitHub 当前 HEAD 组合状态查询无 statuses（空数组不代表 CI PASS）；Node 测试及浏览器 **NOT VERIFIED**。
- 状态 REVIEW。后续必须验证语言切换时的滚动/焦点/筛选、realtime 更新、CI 运行结果。

### 2026-10-09 JST — UI-004 operator selection across snapshot updates (REVIEW)

- `js/trains-page.js` 的 `renderList` 不再直接渲染全量线路，而是委托现有 `renderFiltered`，保持已选运营商；commit `4cbb094d`。
- `js/realtime-view.js` 的 `reconcileRealtimeList` 状态签名只遍历 `DataState.filterLinesByOperator` 得到的可见线路，避免筛选状态下把全网签名误当成列表结构；commit `4ebd3317`。
- `tests/railway-browser-contract.test.cjs` 添加刷新链路源码断言，commit `0627be7a`。
- 验证：已提交，未实际执行 Node 测试、CI 或浏览器；状态 REVIEW。须重点验证筛选切换、语言切换、实时推送后的卡片状态和 DOM 增量更新。

### 2026-10-09 JST — UI-004 empty/missing mount guard (REVIEW)

- `DataState.renderList` 在访问 `container.innerHTML` 前独立判断 `!container`，避免缺失 mount 时异常；commit `82f821c5`。
- `OperatorFilterBar.render` 在运营商列表变空时清空过期按钮并调用现有 `available(false)`；commit `8de9fd5c`。
- `tests/railway-browser-contract.test.cjs` 新增上述边界条件的源码断言；commit `4db303f4`。
- 验证：GitHub 提交成功；Node 测试/CI/浏览器 **NOT VERIFIED**。状态 REVIEW。

### 2026-10-09 JST — UI contract guard connected to existing CI (REVIEW)

- `.github/workflows/ci-cd.yml` 的既有 `validate` job（Node 20 setup 后）添加 `node --test tests/railway-browser-contract.test.cjs`，没有新建 workflow；commit `c3e1c07f`。
- 查询该提交的 GitHub combined statuses 和 commit workflow runs 均返回空列表，**不代表 PASS**；未取得测试执行结果或浏览器验收。
- 保持 UI-004/UI-005 REVIEW，后续须读取实际 Actions job 结果并解决真实失败项。

### 2026-10-09 JST — UI-004 language-change empty state (REVIEW)

- `js/trains-page.js` 的语言切换刷新不再跳过空的 `_linesNow`；统一通过 `DataState.renderList` 替换旧列表，避免旧卡片残留；commit `74c9f539`。
- `tests/railway-browser-contract.test.cjs` 添加语言切换空列表源码回归断言；commit `f02aba04`。
- 验证：GitHub 已提交；CI Actions 的实际 job 结果和浏览器行为尚未获取，状态保持 REVIEW。

### 2026-10-09 JST — UI-004 realtime empty-selection filter controls (REVIEW)

- `js/realtime-view.js` 的 `renderFiltered` 不再因筛选结果为空而提前跳过 `renderFilterBar(_latestLines)`，统一通过共享 `DataState.renderList` 显示空状态；commit `29b59706`。
- `tests/railway-browser-contract.test.cjs` 新增对应源码回归测试；commit `19b53ca3`。
- 验证：代码已提交；本会话未能取得 GitHub Actions 实际运行日志，也未执行浏览器验收；保持 REVIEW。

### 2026-10-09 JST — GitHub Actions verified for 6ce272c7 (CI PASS; browser REVIEW)

- 实际查询 Actions run 列表并读取 run `37847954790` 的 jobs；此前 `fetch_commit_workflow_runs` 仅筛选 PR 触发的记录，不能用于判断 main push 的 CI。
- commit `6ce272c7a1b3617cf92776204942ee4ea335cfde`：CI / CD run `37847954790` = completed/success；`Validate` 含 `Railway browser cross-page contract` = success，`Deploy to GitHub Pages` = success。
- 同一提交：Release Guards run `37847954732` = completed/success；pages build and deployment run `37847953855` = completed/success。
- 前序 push 对应运行部分 cancelled，与并发取消设置吻合，不能计为当前提交 FAIL。
- **UI-004/UI-005：CI 验证 PASS；实际浏览器交互尚未测试，浏览器验收 REVIEW。**

</details>

<details>
<summary>2026-10-08 JST — 历史执行证据</summary>

### 2026-10-08 — UI-004B shared LineCard mobile CSS — agent

- Status: REVIEW
- Scope: 将 realtime 页面私有的移动端 LineCard 样式统一归入共享样式表，供 realtime / trains 共用
- Files: `css/style.css`, `css/realtime.css`, `PROGRESS.md`
- Commits: `c7e8e7f1`, `5e7a27f9`
- Work: 保留原规则数值，将 `.rs-line-card` / `.rs-line-name` / `.rs-operator-title` 的移动端规则从 realtime.css 移入 style.css；不增加新 renderer，不更改业务逻辑。
- Validation: source-level rule migration；CI/CD, Release Guards, Pages, browser runtime: NOT VERIFIED。
- Next: 复核剩余页面 CSS 覆盖及移动端视觉，确认 CI 后再关闭 UI-004B；继续 UI-005 现有 DataState lifecycle 收敛。

### 2026-10-08 — UI-005 shared recovery single-flight — agent

- Status: REVIEW
- Scope: DataState 的 online/pageshow 自动恢复并发保护
- Files: `js/data-state.js`, `PROGRESS.md`
- Commit: `22c689c9`
- Work: 共享 retryVisibleFailedStates 入口增加 pending guard；同步事件和 Promise resolve/reject 均释放保护；复用页面已登记的 retry callback，不增加新的 DataLoader/renderer。
- Validation: source-level review only；CI/CD, Release Guards, Pages, browser runtime: NOT VERIFIED。
- Next: 补自动恢复回归测试，核实 Actions，再逐页吸收重复 loading/error/retry glue；不得提前标记 UI-005 DONE。

### 2026-10-08 — UI-006 tourism detail shared back control — agent

- Status: REVIEW
- Scope: 统一三种观光详情页返回按钮 DOM 结构
- Files: `js/tourism-core.js`, `pages/tourism-event.html`, `pages/tourism-shop.html`, `pages/tourism-spot.html`, `PROGRESS.md`
- Commits: `60852841`, `f83fefda`, `08fa3381`, `5e9502c8`
- Work: tourism-core.start() 首先在 `data-tourism-detail-back` mount 生成唯一返回按钮；三页移除重复按钮 HTML，保留原 ID、SVG、样式、翻译与回到 home 的事件链。
- Validation: source-level migration only；CI/CD, Release Guards, Pages, browser runtime: NOT VERIFIED。
- Next: 核实生产页面脚本加载与按钮行为，继续抽取旅游详情页面主体，避免创建平行 controller。

</details>

<details>
<summary>2026-10-07 JST — 历史执行证据</summary>

### 2026-10-07 16:xx JST — UI-003 LineCard / SystemCard — agent

- Status: REVIEW
- Scope: 卡片模板所有权与增量更新边界统一
- Files: `js/line-card.js`, `js/data-state.js`, `js/realtime-view.js`, `pages/realtime.html`, `pages/trains.html`, architecture guard
- Commits: `5e23ce6e`, `8a1ea29e`, `80c8f16e`, `4cdd5f0f`, `f2638f39`, `2b33847d`, `3868d2a8`, `b4c696f0`, `4a438c5c`
- Work: 建立 LineCard update boundary；迁出 LineCard/SystemCard 唯一模板；DataState 退回列表/状态职责；realtime 删除内部 DOM patch；两页面加载 canonical component。
- Validation: 三个核心 JS syntax PASS；COMPONENT-002 guard 已升级为检查唯一模板所有权和旧 API 回流。
- Risks / blockers: GitHub Actions 尚在执行；浏览器视觉输出刻意保持原模板结构，未声明新的视觉验收。
- Next: HEAD Actions 全绿后将 UI-003 标记 DONE；随后处理 UI-004B CSS override 收敛。

### 2026-10-07 — UI architecture audit — agent

- Status: PARTIAL
- Scope: 全站 HTML/UI 基础层审计
- Files: 7 个 `pages/*.html`、共享/页面 CSS、realtime/trains UI JS
- Base HEAD: 包含 `670e1c34`
- Commit: `670e1c34`（本轮仅实际代码修正）
- Work: 确认全站重复 SiteShell；确认线路卡片为共享 renderer + mode 分叉 + 页面 DOM patch；删除未要求的 Footer 顶部分割线。
- Validation: repository source inspection；Footer CSS rule 已从公共 style 删除。
- Risks / blockers: 尚未执行 SiteShell 迁移；OperatorFilterBar 当前轮 CI 最终状态需复核。
- Next: 先完成 UI-002 P0 回归检查，再开始 UI-001 SiteShell contract。

### 2026-10-07 13:xx JST — UI-002 P0 readiness — agent

- Status: REVIEW
- Scope: SiteShell 开工前 FilterBar/CI 回归清理
- Files: `tools/train-position-evidence-regression.test.js`, `js/trains-page.js`, `js/operator-filter-bar.js`
- Base HEAD: `c6a6266d`
- Commits: `59471139`, `94f11773`, `cdba6c6d`
- Work: 修复 CI guard 重复声明；恢复 trains JR-East 特殊过滤；详情显隐统一走组件 API；共享 FilterBar 恢复 tOp 多语言标签链。
- Validation: source inspection complete；最新 Actions 已启动，最终结果待确认。
- Risks / blockers: Actions 未完成前 UI-002 仍为 REVIEW；SiteShell 暂不应标记 IN_PROGRESS。
- Next: 等待/确认最新三条 Actions 全绿后，将 UI-002 标记 DONE，再启动 UI-001A SiteShell contract。

### 2026-10-07 15:23 JST — UI readiness final check — agent

- Status: DONE
- Scope: SiteShell 开工准备最终检查
- Files: 7 个 `pages/*.html`, GitHub Actions, `PROGRESS.md`
- Base HEAD: `4ada406b`
- Commit: pending progress-ledger commit
- Work: 确认 HEAD 的 Release Guards / CI/CD / Pages 全绿；复核 7 页 CSP、脚本依赖和导航结构；确认 SiteShell 只统一 body 公共壳，页面 capability/CSP 保持最小权限。
- Validation: Release Guards SUCCESS；CI/CD SUCCESS；Pages SUCCESS；7 页 source inspection complete。
- Risks / blockers: 无 P0 blocker。HTML 中手工 asset version 不一致属于后续 SiteShell/asset 收敛范围，不阻塞 UI-001A。
- Next: UI-001A 定义 SiteShell DOM/API contract，并添加防双链路 architecture guard，再开始逐页迁移。

### 2026-10-07 — UI-001A SiteShell contract — agent

- Status: REVIEW
- Scope: 全站 SiteShell 唯一 DOM/API 契约与防双链路 guard
- Files: `js/site-shell.js`, `.github/workflows/arch_guard_check.py`, `PROGRESS.md`
- Base HEAD: `941da537`
- Commits: `865225b7`, `befbe1c5`
- Work: 建立 canonical SiteShell；统一 Header/LanguageSwitcher/Nav/Footer renderer 与三个 mount；active tab 由 page identity 决定；加入 SHELL-001，页面一旦加载 SiteShell 就禁止保留旧 header/nav/footer 副本。
- Validation: source contract inspection complete；生产页面尚未加载 SiteShell，因此本提交无 UI 行为切换；Actions 待本轮最终确认。
- Risks / blockers: `lang-init.js` 会把 language wrapper 移到 body，SiteShell 保持原 ID/class 以兼容；不能把各页 CSP/head 能力统一。
- Next: Actions 通过后开始 UI-001B~E，迁移页面并删除旧重复 Shell markup；每批迁移后验证 i18n/mobile/nav。

### 2026-10-07 — UI-001B~F SiteShell migration — agent

- Status: REVIEW
- Scope: 7 页生产 SiteShell 迁移与迁移后残留清理
- Files: 7 个 `pages/*.html`, `js/site-shell.js`, `.github/workflows/arch_guard_check.py`, `PROGRESS.md`
- Commits: `e3655605`, `1e6cf471`, `6734ff78`, `adb18884`, `5e86052a`, `d89baebe`, `d003a1eb`, `49cf04cf`, `ad666582`
- Work: 7 页删除重复 Header/Nav/Footer 并使用 canonical mounts；保留各页 CSP/业务 DOM；检查页面 CSS 无 realtime/trains/tourism 私有 Shell 覆盖；补 SiteShell 内部导航 build token 传播；扩展 SHELL-001 guard。
- Validation: 每页 SiteShell=1、三个 mount 各=1、旧 Header/Nav/Footer=0；source CSS inspection complete；Actions 待最新 HEAD 最终确认。
- Risks / blockers: browser runtime 尚未在用户的 mobile Chrome 实机确认，故保持 REVIEW。
- Next: 确认 Actions；实机/生产检查语言切换、sticky nav、active tab、footer；通过后 UI-001 DONE，进入 UI-003 LineCard。

### 2026-10-07 — UI-001 CSP production recovery — agent

- Status: REVIEW
- Scope: SiteShell 手机生产环境公共 UI 全消失回归
- Files: `js/site-shell.js`, 7 个 `pages/*.html`, `.github/workflows/arch_guard_check.py`, `PROGRESS.md`
- Commits: `cee818d7`, `8cadf6e8`, `1ac6cf76`, `40395a9d`, `7989f04d`, `2c7a61e4`, `4c289634`, `d2bc607d`, `0003ae80`
- Work: 根据用户 mobile Chrome 截图确认业务 DOM 正常但公共 Shell 全空；根因是所有页面 CSP 为 `script-src 'self'`，旧 inline `window.SiteShell.mount()` 被拦截。改为 external `site-shell.js` 自启动，删除 7 页 inline bootstrap；SHELL-001 禁止回归。
- Validation: HEAD `0003ae80` Release Guards SUCCESS；CI/CD SUCCESS；Pages SUCCESS。公开 Pages 无法由当前外部抓取器读取，因此不伪称 browser runtime verified。
- Risks / blockers: mobile Chrome production refresh still required；UI-001 继续 REVIEW。
- Next: 用户刷新生产页确认 Header/Language/Nav/Footer；若恢复则 UI-001 DONE，若仍异常按实机现象继续修。

</details>

<details>
<summary>文档版本与补充证据</summary>

### 文档版本历史（README 修订记录迁移，按日期）

> 自 RC-7（2026-10-15）起，README 1.2 详细修订内容迁移至本文件统一按日期管理；README 仅保留版本索引。

| 日期 JST | 版本 | 修订内容（详细） |
|---|---|---|
| 2026-10-15 | RC-8 | 文档分类导航、真实标题目录和历史范围标注；校正 Supabase／SQL、移除模块与恢复基线说明；只改 Markdown，未更改运行时事实或重新执行浏览器验收。 |
| 2026-10-15 | RC-7 | **文档结构更新**：数据架构统一为新链路「ODPT/SQL 列车号 → 线路车型对应 → TrainOperationEvidence → TrainVehicle → PNG」（README 3.7/2.4/3.10.3/5.4.5/术语表/目录/数据字典同步）；修订记录（日志）迁移至本文件按日期管理，README 1.2 仅保留版本索引。 |
| 2026-10-15 | RC-6 | **文档更名与整理**：DEVELOPMENT.md 全量整理后更名为 README.md（保留全部开发细节，作为仓库首页文档）；同步登记 2026-10-14～10-15 开发进展：高尾实时区间转线与末站图标归位（v4.3.1216/1217）、FULL 隐藏位置提示（v4.3.1218）、普通环线统一双排模板（v4.3.1219）、全线路直通标签通用排布（v4.3.1220）、支线独立卡片与独立线路图（v4.3.1221）、导入东叶/埼玉线路标志（v4.3.1222）、纠正内部支线误拆范围（v4.3.1224）、运营时段车辆映射全网检查（v4.3.1225）、车辆映射第二批 JR 定期车型参考（v4.3.1226）、终到边界/位置图层一致性/乘客列车列表（v4.3.1227-1229）、乘客堆叠列表去除列车号（v4.3.1230）。各条目 Commit：e6c4fa3f/b24d0e7e、4ebaf383、d984ce5c、0723994c、f9dc2617 等。 |
| 2026-09-27 | RC-5 | **代码对照修订**：以当前 main 为事实来源，修正 trains 模块拆分、车型身份解析、line-service-relations/LOS、ODPT 唯一入口、i18n、CSP、CI/CD、canonical data freeze、recovery/baseline、canonical migration audit、approved removal manifest、baseline refresh 生命周期、release gate 与已知债务记录；修复章节编号/目录漂移与重复版本号。 |
| 2026-09-21 | RC-4.3 | **Freeze 例外**：清理第一类真坐标错误 16 组。①删孤儿 8 个：Imaichi/Aizu-Minamiwa/Waga/Narushima-Yonezawa/Douzawa/Juni/Kommata/Takine；②Jatenda 合并到 Hebita（仙石东北线同站）；③Ariake-8oh 改名陸中有明（八户线），删重复条目，坐标修正（东京有明→岩手）；④修 7 个站坐标：Higashi-Shizugawa/Higashi-Ishinomaki/Aizu-Oshio/Osawa-Yamagata/Ono/Nakagawa（相邻站插值）；⑤Aizu-Oshio.ja 会津塩→会津大塩；⑥Atago-2 从东北本线删除（东北本线无爱宕站）；⑦Kunai 合并到 Miyauchi（信越本线宫内站）。重跑 gen-file-data.js；verify_transfer_pairs.js 退出码 0。 |
| 2026-09-21 | RC-4.2 | **Freeze 例外**：清理同站双 ID 拼写冗余 19 组（ODPT 实证对齐）。A 类单边引用删孤儿 10 个：Shinbashi/Nihonbashi/Ginza-hitchome/Minami-Nagase/Nagase-Otakanomori/Aizuwakamatsu/Ashizawa/Rikuzen-Koizumi/Kaimen/Echigo-Sudara；B 类双方引用合并 9 组：Hongo-Sanchome/Shin-Maruko/Motosumiyoshi/Tamagawa-Josui/Tama-Dobutsukoen/Nishi-Tokorozawa/Tenku-Bashi/Shimo-takaido/Tennozu Isle（按 ODPT 驼峰/连字符规范对齐）；name_map 同步改指。重跑 gen-file-data.js；verify_transfer_pairs.js 退出码 0（1953 条不变）。 |
| 2026-09-21 | RC-4.1 | **Freeze 例外**：清理坐标偏移的孤儿车站 ID。删 stations[Makuhari-Hong/Makuta/Minami-No/Hacchobori]（4 个均无线路引用、坐标与被引用变体差数百米至 7.5km）；name_map 改指：馬来田→Uma_Kita、八丁堀→Hatchobori；删 station_i18n 孤儿条目 Makuhari-Hong/Makuta/Minami-No/Hacchobori/Makuhari-Hongo；修 Hatchobori.en 误写 Hacchobori。重跑 gen-file-data.js；verify_transfer_pairs.js 退出码 0（1953 条不变）。 |
| 2026-09-18 | RC-4 | 与确认稿 RC-3 对齐：第 11 章硬规则编号补回（系统优先变更「变更前」/ 无孤儿迁移 / 发布门）、附录 A 结论编号补回；移除 5.2 误混入的根入口路由行（该文件已删除，入口统一 pages/home.html）。 |
| 2026-09-17 | RC-3 | 可读性优化：目录置顶（全文锚点）；多份开发文档整理合并（线路图设计规定并入正文 5.4，设计文档与 README 保留为附录 A/B）；设计文档全文中译；6.5 节重复内容清理；错别字修正。 |
| 2026-09-17 | RC-2 | 结构优化（章节重组、CRLF→LF、重复版本号标注〔并发会话〕）；语言统一为中文；新增第 3 章“系统架构设计”（含 3.10 页面结构规则，原第 0 章并入）；第 6 章按“系统模块划分 / 后台权限模型 / 数据库设计 / ODPT 实时数据对接 & 双库联动策略 / 核心业务规则”重组；第 7 章按 7.1-7.6 重排（全局格式 / 错误码 / 前台业务接口 / ODPT 封装 / 后台管理接口 / 数据字典）；新增第 8-10 章（部署与运维 / 测试规范 / 风险说明 & FAQ）；取消“用户指示”笔录形态，变更日志统一为标准条目。 |
| 2026-09-11 | v1.0 | 由 AGENTS.md、LINE-DIAGRAM-SPEC.md、4.3.31_design.md、README.md 等多份开发文档整理合并形成综合版；完整原文收录于附录 A-B。 |

</details>

<details>
<summary>2026-10-07～09 迁移快照与提交清单（仅历史）</summary>

#### 2026-10-07～09 迁移状态快照（已过时）

| Workstream | 状态 | 当前结论 / 下一步 |
|---|---|---|
| UI-001 全站 SiteShell | DONE | 7 页已接管；CSP-safe 外部自启动已稳定；2026-10-07 mobile Chrome 实机确认 Header/语言按钮/自适应居中菜单可通过 |
| UI-002 OperatorFilterBar | DONE | JR-East、tOp、显隐链路已修；HEAD `4ada406b` 的 CI/CD、Release Guards、Pages 全部成功 |
| UI-003 LineCard / SystemCard | REVIEW | `js/line-card.js` 已成为唯一卡片模板/更新入口；DataState 仅列表编排，realtime 不再 patch 卡片内部 DOM；等待 HEAD Actions 最终验证 |
| UI-004 LineList / OperatorGroup | PARTIAL | `DataState.renderList` 已共享；需与 LineCard 职责拆清并统一空结果/排序 |
| UI-005 PageState lifecycle | PARTIAL | `DataState` 已共享 render/retry 基础；页面仍重复 loading/retry/recovery glue |
| UI-006 Tourism Detail Shell | PARTIAL | 已由现有 tourism-core.js 接管三页重复返回按钮 DOM；其余详情页主体 Shell 仍需公共化，待验证 |
| UI-007 CSS 收敛 | IN_PROGRESS | 已移除 realtime 独占的移动端 LineCard 规则并迁至共享 style.css（`c7e8e7f1`, `5e7a27f9`）；仍需检查其他页面覆盖与浏览器回归 |
| RECOVERY-001 Mobile Chrome 恢复 | DONE | BFCache/online/late-data/ODPT/DataFusion 恢复链已建立并有 guard |
| RUNINFO-001 运行情报线路隔离 | DONE | 已修复跨线路 incident leakage |
| RUNINFO-002 popup freshness | DONE | popup cache 已缩短到 15 秒并加 guard |
| RUNINFO-003 realtime freshness | DONE | `dct:valid` / `dc:date` / frequency 新鲜度检查已加入 DataFusion/trains |
| RUNINFO-004 状态语义统一 | TODO | DataFusion 与 RunInfoAPI 对 operator-global/empty-success/last-good 语义仍需统一 |
| DEPLOY-001 Pages cache busting | DONE | deploy 时以 commit SHA 重写本地资产/页面 URL，避免手机长期卡旧版本 |
| DATA-001 Supabase runtime coverage | PARTIAL | runtime/evidence 架构已存在；timed run 数据与 network coverage 仍不足 |
| VEHICLE-001 图片命名/图库 | PARTIAL | 已有大规模 inventory/rename 工作；继续按文件命名规范推进，避免重复审计 |

#### 2026-10-07 迁移前架构快照（已过时）

#### 全站 HTML

当前页面：

- `home.html`
- `history.html`
- `realtime.html`
- `trains.html`
- `tourism-event.html`
- `tourism-shop.html`
- `tourism-spot.html`

2026-10-07 审计确认：

- Header / LanguageSwitcher / Footer 在 7 页重复。
- 主导航在多页重复。
- tourism event/shop/spot 的主体 HTML 基本同构。
- 同一公共 CSS 在页面中存在不同手工版本号。
- 当前是“各 HTML 自己写底层 + 各自 JS/CSS 努力做出相似视觉”的结构，不是统一 SiteShell。

#### 线路卡片

已有共享基础：

- `DataState.renderCard()`
- `DataState.renderSystemCard()`
- `DataState.renderList()`

但仍不是完整组件：

- `renderCard` 内存在 `mode === "realtime"` / `mode === "trains"` 分叉。
- realtime 页面直接查询/替换 `.rs-line-card`、`.rs-line-interval`、`.rs-line-info` 等内部 DOM。
- `style.css` 是共享样式，但 realtime/trains CSS 仍存在页面覆盖。

目标：建立正式 LineCard API，页面 Controller 不再操作内部 DOM。


### 3. 已完成 / 已提交记录

| 日期 JST | Task | 执行者 | 状态 | Commit | 内容 / 验证 |
|---|---|---|---|---|---|
| 2026-10-07 | DEPLOY-001 | agent | DONE | `eb787d5a` | Pages deploy 注入 no-cache meta + commit SHA asset/page cache busting |
| 2026-10-07 | DEPLOY-001 | agent | DONE | `f23f93bf` | manual Pages deploy 同步 cache-safe 逻辑 |
| 2026-10-07 | RECOVERY-001 | agent | DONE | `b1a6ce5` | bounded/deduped ODPT readiness waits |
| 2026-10-07 | RECOVERY-001 | agent | DONE | `7e1a786` | db-loader 统一 `pt:railway-ready` signal |
| 2026-10-07 | RECOVERY-001 | agent | DONE | `3b22dc9` | trains late-data recovery |
| 2026-10-07 | RECOVERY-001 | agent | DONE | `c823df3e` | trains startup DataLoader error state |
| 2026-10-07 | RECOVERY-001 | agent | DONE | `eedb8bf3` | DataState online/pageshow retry recovery |
| 2026-10-07 | RECOVERY-001 | agent | DONE | `38555711` | realtime responds to late railway-ready |
| 2026-10-07 | RECOVERY-001 | agent | DONE | `5abfd73` | architecture guard for mobile recovery |
| 2026-10-07 | RECOVERY-001 | agent | DONE | `35fe74f1` | ODPT refresh after BFCache restore |
| 2026-10-07 | RECOVERY-001 | agent | DONE | `7e3d2d03` | DataFusion resume after BFCache restore |
| 2026-10-07 | RECOVERY-001 | agent | DONE | `01a734fd` | BFCache LIVE recovery guard；当时 Actions 全绿 |
| 2026-10-07 | RUNINFO-001 | agent | DONE | `e5f68419` | 修复 DataFusion 跨线路 ODPT incident leakage |
| 2026-10-07 | RUNINFO-001 | agent | DONE | `74c6e99c` | 加 line-scoped runinfo static guard；当时 Actions 全绿 |
| 2026-10-07 | RUNINFO-002 | agent | DONE | `51e93b0b` | RunInfoAPI popup cache TTL 缩短至 15s |
| 2026-10-07 | RUNINFO-002 | agent | DONE | `946059d8` | popup freshness guard |
| 2026-10-07 | RUNINFO-003 | agent | DONE | `b1c1f3ac` | DataFusion realtime freshness policy |
| 2026-10-07 | RUNINFO-003 | agent | DONE | `1053937c` | trains renderer 同步 freshness policy |
| 2026-10-07 | RUNINFO-003 | agent | DONE | `5862e2c5` | train position evidence regression guard |
| 2026-10-07 | UI-002 | agent | REVIEW | `4a40a090` | 新增共享 `js/operator-filter-bar.js` |
| 2026-10-07 | UI-002 | agent | REVIEW | `f704d9fb` | realtime 接入共享 OperatorFilterBar |
| 2026-10-07 | UI-002 | agent | REVIEW | `36170f7d` | trains 接入共享 OperatorFilterBar；需确认 JR-East 特殊过滤语义未回退 |
| 2026-10-07 | UI-002 | agent | REVIEW | `3a27ef55` | realtime HTML 加载共享 FilterBar |
| 2026-10-07 | UI-002 | agent | REVIEW | `bb35e750` | trains HTML 加载共享 FilterBar |
| 2026-10-07 | UI-002 | agent | REVIEW | `f846a376` | COMPONENT-001 architecture guard；该轮 Actions 在记录时仍需复核最终状态 |
| 2026-10-07 | UI-007 | agent | REVIEW | `670e1c34` | 删除公共 `.pixel-footer` 未经设计要求的 `border-top` 分割线 |


### 4. 待办队列

#### P0 — 先保证当前迁移没有回归

- [x] **UI-002A** HEAD `4ada406b...`：Release Guards、CI/CD、Pages 全部 SUCCESS。旧 CI 失败根因 `fusionSource` 重复声明已由 `59471139` 修复。
- [x] **UI-002B** trains 已恢复 `TransitConstants.isJRERoute` 特殊过滤语义（`94f11773`）。
- [x] **UI-002C** 共享 FilterBar 优先使用 `tOp()`，再 fallback `operatorLabel()`（`cdba6c6d`）。
- [x] **UI-002D** trains detail show/hide 已统一走 `setFilterAvailability()` → 组件 API（`94f11773`）。

#### P1 — 全站基础层

- [x] **UI-001A** 已建立 `js/site-shell.js`：固定 header/navigation/footer mounts、page identity/active tab、`pt:site-shell-ready`；保持页面 CSP/能力 `<head>` 独立。SHELL-001 guard 已加入（`865225b7`, `befbe1c5`）。
- [x] **UI-001B** 7 页 Header 已由 canonical SiteShell 接管。
- [x] **UI-001C** 7 页 LanguageSwitcher 已由 SiteShell 接管，并保持 lang-init 的 body reparent 行为。
- [x] **UI-001D** MainNavigation 已由 page identity 生成 active tab；SiteShell 同时继承 deploy `?build=` token，避免页面导航丢失 cache-busting。
- [x] **UI-001E** 7 页 Footer 已由 SiteShell 接管；共享 footer 保持无顶部横线。
- [x] **UI-001F** SHELL-001 已保护唯一 SiteShell、三 mount、禁止迁移页重新复制旧 Shell，并保护 build token 传播。

#### P1 — 卡片/列表

- [x] **UI-003A** 已提取 `js/line-card.js`，LineCard 模板所有权移出 DataState。
- [x] **UI-003B** SystemCard 已归入同一 `window.LineCard` 组件体系。
- [x] **UI-003C** 已建立 `LineCard.update()/updateSystem()/applyColor()` 稳定入口。
- [x] **UI-003D** realtime 已只提交数据变化给 LineCard API，不再 patch 卡片内部 DOM。
- [x] **UI-004A** DataState/LineList 现只负责 list/group orchestration，不再拥有卡片内部模板。
- [ ] **UI-004B** 已迁移 realtime 移动端 LineCard 样式到共享 CSS（`c7e8e7f1`, `5e7a27f9`）；仍需检查其他覆盖并通过 Actions / 浏览器回归后关闭。

#### P1 — 页面状态

- [ ] **UI-005A** 在现有 `DataState` 上吸收 page lifecycle；已为 online/pageshow 自动恢复添加单飞保护（`22c689c9`），其余页面重复 glue 仍待吸收。
- [ ] **UI-005B** 统一 loading/offline/fetch_error/timeout/retry。
- [ ] **UI-005C** 保留 mobile Chrome BFCache/online recovery 语义。
- [ ] **UI-005D** 更新 RECOVERY-001 guard，从检查页面重复 glue 转为检查共享 lifecycle contract。

#### P2 — Tourism

- [ ] **UI-006A** event/shop/spot 使用同一 TourismDetailShell；已将三页重复返回按钮交由 tourism-core.js 唯一生成（`60852841`, `f83fefda`, `08fa3381`, `5e9502c8`），其余主体待迁移。
- [ ] **UI-006B** 类型差异通过 config/controller 注入，不复制 HTML。
- [ ] **UI-006C** 地图能力/CSP 继续最小权限，不因 shell 统一而扩大权限。

#### P2 — RunInfo 后续

- [ ] **RUNINFO-004A** 统一 RunInfoAPI 与 DataFusion 的 line/operator-global record 选择语义。
- [ ] **RUNINFO-004B** 成功返回 `[]` 时明确“本次 snapshot 无 incident/正常”与 last-good 的关系，避免旧 incident 无意义保留 10 分钟。
- [ ] **RUNINFO-004C** 检查 last-good 是否应保存 notice/info。
- [ ] **RUNINFO-004D** 搜索 `aggregateDelayRecords` 是否已成为 dead path，确认后再删除。
- [ ] **RUNINFO-004E** 检查 `_previousPosMap` / raw realtime restore，确保 stale row 不会复活。



</details>

<details>
<summary>远端 59788301 的补充执行证据（按当时状态保留，不作为当前规则）</summary>

## 2026-10-21 JST — 架构/补丁清理与页脚发布

用户已授权上线；已在远端 f916acd 基线隔离整合此前实现。当前处于本地复核/PR/生产验收流程，实际发布结果以本节后续证据为准。保留远端新实现及原工作区其他改动。设计与迁移见 [发布整合](docs/reports/architecture-footer-release.md)，审计四项仍未实施。

# Pixel Tetsudo 工程进度

## 2026-10-20 JST — 搜索时间筛选修复（仅本次发布范围）

- 按用户最新要求仅发布现在出发／指定出发／指定到达的时间筛选及必要时刻计算，不发布路径指引、站台标注、候车展示或其他整理。完整改动保留在本地备份分支。版本号不变，不新增文件或PR，沿用已授权的#8。
- 消费既有时刻表接口，保留日历/日期、跨午夜与全程接续验证，避免筛选只改变界面而不约束班次；旧异步查询不能覆盖新筛选结果。

## 2026-10-20 JST — 长野两车型三原图修复（验证通过，已授权上线）

- 用户明确要求规范命名/映射且不是版本升级，并追加修复默认直接上线；v4.3.1070保持。e127mt/e127mtp/e300frst原生PNG按E127-100长野色、幌付、HB-E300リゾートビューふるさと命名，下载原字节及旧文件备份在主工作区.work/backups/nagano-art-mapping。只扩现有TrainVehicle精确目录和别名；plannedAsset不声明当日编组，不增加加载器或运行时补丁。
- 1340次既有本地/SQL标签输入映射回归通过；新增别名/公司隔离/未知标签/0番台保留均通过。472 PNG锁（原469项不变）、共享链/位置/范围/架构/前端/线路身份检查通过。实际公开SQL357班中353可画；篠ノ井四班211系标签另待明确，不借新图补猜。旧时刻表日期/区间真实性缺口不因有图而结项。
- 本地8789实际大糸页出现5242M、3239M的E127-100原图与8362Dふるさと原图，DOM/标题均为计划形式，未修改页面时钟；公开上线尚待同一源提交的CI与部署验证。无新PR，排除并行CSS改动。

## 2026-10-20 JST — 扩展他人计划/运用资料，整理车型资源（研究清单，未发布）

- 按用户要求扩大来源：T-TAKE的2026/3改正、奈良2026/10/3修正；铁路运用Hub阪和/关西非电化2026表；T.A.P熊本气动车2026/3及大分2025/3旧参考；官方车型/编成图交叉核对。明确区分现行逐车表、旧表、编成库存和实配观察。
- 在原docs/train-vehicle-plans.md和non-full-sql-audit.json整理61项首批原生PNG准备项（按地区外观分项，非最终图片张数），另列二批待核、已有图片复用和停运/旧车型纠错。补查跨公司关西线315/HC85/キハ75，不能仅按canonical公司的名字列车型。未把车型集合写进全线运行规则，未新增SQL记录/变更。
- 纠正上一轮错误的しおさい旧关联结论：官方2026改正明确4号E257→E259、6号E259→E257。补合法E257-500しおさい别名，原负向用例改为真正未登记注记，未知名禁止猜测的断言保留；计划/实配/未知型号回归通过。历史统计保留为此前快照，不能把可画PNG数当正确车型数。
- 本地泛称E653系PNG的外观可能为しらゆき1100，先核作者型号，不列确认缺图。津轻蟹田—三厩现行代行交通，不补旧キハ40虚拟列车。无新PR、版本、生产发布或运行时补丁目录。

## 2026-10-20 JST — 非FULL全量调查及首批计划修复（INCOMPLETE，未发布）

- 按当前canonical/policy检查223线：13 FULL、210非FULL。SQL注册全开且均有两站以上模板；10/20与10/25共420公开响应无空线路、无请求错误，返回92869条。但8线696模板有统一7001M～7087MH/四分钟站间/无来源ID特征，不能计为可靠时刻表；川越SQL平日仅3班，上越主要是吾妻贯通补充，仍缺完整班次。
- 实际SQL经现役适配器/TrainVehicle处理10/20的48574班：41524可画、6498无计划（50线）、552候选不可画（13线），共63线仍有缺口。候选不可画也可能是旧或错误车型，不能全称缺PNG。本地备用表与实际SQL口径不同，已分开检查。
- 首批原地补小海普通/八岳高原/HIGH RAIL及川越/鹿岛/弥彦6条family rules，271 SQL候选标签与结构快照同步，现有canonical车型/operation投影刷新。小海8255D不再误套HIGH RAIL，普通保留两种候选。452条本地源记录除车型字段外逐字段不变，SQL模板身份/来源/日历不变；4个现有PNG只补计划注册，未修改图片像素。
- 新增原audit工具的本地计划表与公开SQL模式，直接执行现役适配器和判定链；完整清单在docs/reports/non-full-sql-timetables.md与non-full-sql-audit.json。小海临时开行日期、上越/川越全班次、63线缺口均未结项。不新PR、不升级v4.3.1070、不推送或部署；保留磐越西线待发布提交和并行工作区其他修改。
- 首批修复验收：452源记录、271模板身份/元数据、65服务日/浏览器契约、469 PNG锁、现役车型/位置/架构/图标链/smoke/精确契约检查通过。canonical投影刷新后四线126公开班次均可画；小海本地实页约13:00 JST出现228D/230D/137D/136D原生图，保留候选说明，未改变浏览器时钟。备份位于主工作区`.work/backups/non-full-sql-audit/`；全量任务仍INCOMPLETE。

## 2026-10-20 JST — 磐越西线计划／车型／日期边界（VALIDATING，本地与SQL已验，前端待发布，2类原生PNG缺口）

- 基线main c5574dd4，沿用现有发布工作区，改原canonical、两条关联手工表、车型计划解析与证据快照，无新加载器/运行时补丁、无新PR、v4.3.1070不变。本轮尚未推送或生产发布。
- 官方四总表2328处时刻与逐车页交叉核对：188条常规记录（平日/休日各94），149条10—11月日期记录，常规补1896到站时刻及52处发车修正。原SQL201模板ID全部保留，13条临时/同号变时来源移出固定日历；沿用date-run overlay，不虚构改正日/date_verified。
- E721、GV-E400/キハ110候选与特急/观光/SL/DL分别计划；修复plannedAsset公司归属漏判，337条双输入车型与旧公司隔离、实配优先均通过。DE10及AT-700/750尚缺准确原生PNG，已知形式保留中性标记，不冒用别的涂装。
- 山都与大和ID分离，纠正安子ケ島、站序、线路归属和会津若松只见线换乘；2229D新津接续的两线路共享完整行程/身份，2225D周日/节假日停开亦同步信越线，其他580条关联线路原记录未变。
- 五日期公开API合计5754停站逐时一致，SQL成员边界错误0、伪造日期认证0；13个共用回归入口、前端smoke、线路身份与精确契约检查通过。实页已见42站/正确站名与换乘，验收时已过末班。源数据、备份、边界与尚缺图片见docs/train-vehicle-plans.md。

## 2026-10-20 JST — 磐越东线／吾妻线修正上线（RELEASED_VERIFIED）

- 用户明确授权“推送上线”后，磐越东线提交f6e627ca推送至现有#38；PR CI39271436523四项检查通过，以保留历史的merge方式合并为main c5574dd4005cb5455ec0ee40127a76ee01948a00。未新建PR，v4.3.1070不变；吾妻线此前的待审核限制由本轮明确上线授权更新。
- main合并检查39273271817通过；授权生产任务39273322035的Validate、Release Guards、完整浏览器回放、Build、Pages部署、Verify production及发布登记全部success，回滚skipped。公网manifest.sourceSha=c5574dd4，八项线路/时刻表/车型证据/原生PNG资源均HTTP200且逐字等于本地。
- 用户浏览器中的独立公网验收页已刷新到build=c5574dd4，磐越东线16站和首尾换乘正常，版本v4.3.1070。验收时已过750D的23:37终到，页面无车辆图片、无末班循环；日间计划图已在前轮本地实页验证，未伪造公网当前时间。证据位于`.work/banetsu/production-verification.json`、`production-ci-jobs.json`及`browser-production.json`，已复制主工作区备份。本段是发布后本地交接，不再触发源码提交或额外发布。

## 2026-10-19 JST — 磐越东线缺失补齐（本地/SQL验证及上线授权记录）

- 用户本轮明确“推送上线”，授权将磐越东线与#38既有吾妻线修正一并推送、检查通过后合并并按现有main流程部署。此前待审核限制已由本轮明确授权更新；不新增PR或版本，不跳过既有门禁。13个相关本地测试入口、三组精确契约及平日/周末API重新核验通过。后续发布结果须以实际CI、生产SHA与页面验收记录为准。

- 在现有发布工作区改造原手工表/canonical/证据快照；保留吾妻线#38待审核，不新PR、不升级v4.3.1070、不合并或部署。原70条班次数齐，新增612到站时刻、修正4发车时刻；逐车来源与官方平日/休日上下行768时刻一致。
- Supabase保留70模板身份，更新748停站，补35个定期车号キハ110计划，经现有TrainOperationEvidence→TrainVehicle→PNG；不认定实配编组。两服务日公开API各35班374停站逐时一致。
- 删除小国/米坂线误挂换乘和统一2分钟占位；实页750D已见计划图标及小野新町终到。731D停车、1751D区间终到、749D终到退出及既有车型/位置/296标签/架构/证据/469PNG锁/39服务日检查通过。精确测试契约保留全部旧断言；本轮尚无新远端CI结果。证据、备份及边界见docs/train-vehicle-plans.md。

## 2026-10-19 JST — 吾妻线普通计划／车型／涩川接续（READY_FOR_RELEASE，待明确合并／上线授权）

- 执行者Codex；基线main952d152f。保留主工作区和本地上轮发布交接；本轮修改原文件，继续前轮上线流程、复用剩余占位#38，不新增PR、不递增v4.3.1070，尚未部署前端。
- 根因：Agatsuma/Joetsu各10条均特急，无普通。补官方逐车56条普通完整行程，两线各66条；同一实际官方URL＋日历＋完整行程复用56个canonical身份。四线路表956个普通时刻及线上四场景2440停站核对通过，无修订日期／FULL认证升级。
- 原SQL证据及快照补普通211高崎车型计划、Joetsu/Takasaki已收录草津・四万E2575500计划，保留实际证据优先与未知车号隔离。既有湘南色图与长野色分开；旧特急2500混合声明退出本地车辆确认路径。
- 原canonical接续补涩川与高崎，吾妻移除错误branchOf与占位运行时长；终到／跨线、原图片及全线路标签回归在既有入口扩展。本地实页已见547M普通211计划图与正确目的地。证据、备份和验收范围见[既有计划说明](docs/train-vehicle-plans.md)。
- #38旧保护基线012b113f导致首轮精确声明失败，未改检查器或断言；追加真实旧基线与当前main两组哈希后，head69333de9的CI39265042837四项必需检查全部success（含完整浏览器及构建）。正式合并/发布操作被自动审批拒绝：保留的“停在待审核，不合并main、不生产部署”限制仍被视为有效，当前“继续修复”不构成本轮新的明确生产授权。没有绕过拒绝；只读回查#38仍open/merged=false，main仍952d152f。本地/SQL已修复，前端尚未上线，等待用户明确授权合并#38并部署。此行为发布前本地交接，未改变已通过CI的head。

## 2026-10-19 JST — 东金线时刻表／线路图返工（RELEASED_VERIFIED：本轮图标及已验证修正；整程接续身份仍待证据）

- 后续用户明确授权“导入部署上线”：原字节导入e233bo1.png为房总改造E233图标，验证透明色键，补既有车型目录、原图片锁单条及原回归。复用占位#39提交本轮东金修正，所有既有门禁保留；按原main authorize_production流程发布，候选v4.3.1070不变。实际构建/部署结果待本节后续记录。
- #39 head 998e1ac5的四项必需检查在CI39231451882全部通过，用户再次要求继续完成后合并为main 952d152f；main push CI39258753176四项亦全通过。正式生产授权任务39258779476已启动，公网验收结果待后续本地记录；不将合并/构建当作上线完成。
- 2026-10-19 22:34 JST 本轮发布验收完成：39258779476的Validate、Release Guards、完整浏览器回放、Build、Pages部署、Verify production和发布登记全部success，回滚skipped。线上manifest.sourceSha=952d152f、版本v4.3.1070；新PNG1732字节SHA256与用户原图一致，车型目录/加载器/canonical/手工表/证据快照六资源均HTTP200且逐字一致。用户原标签页从012b113f刷新至952d152f，已见外房直通、成东总武本线文字及677M/676M计划候选图标；未把209代表图当作当班车型确认。
- 本地验收JSON位于工作区`.work/boso-production-verification.json`；主工作区`.work/backups`保留原PNG、SQL原值、资产哈希、压缩修改补丁及本轮线上验收。该行是发布后本地交接记录，未再次更改已冻结的生产源码或新建PR。

- 基线659f590e；沿用现有发布工作区，保留主工作区其他修改。v4.3.1070不变，不新PR、不合并、不生产发布。
- 原122条定期记录/598个官方时刻核对无差异；补原SQL两条车型候选计划并导出既有证据快照，区分京叶分合编与10月开始的房总换车期。蓝黄E233无精确PNG不借其他涂装；不认定实际编组、不提前加2027年E131、不补造改正日期。
- canonical大网双向外房直通声明；删除db-loader将总武本线强改JO图标的过时覆盖。扩展原车型及布局测试，不新建运行时补丁或测试入口。备份、数据边界、实页观测见[既有车型计划文档](docs/train-vehicle-plans.md)。
- 当前source_only跨线记录缺上游接续ID，未擅自按同号合并成物理列车；两条Y列车的整程canonical身份接续尚未证明。SQL已同步，前端修正在本地预览，不能称公网全部完成。
- 验证：122条×2车型输入、京叶1663条、车型图片/统一流水线、288直通标签、架构与禁止猜测守卫、39服务日/接续及精确契约声明通过；本地实页661M使用原生209房总计划代表。全站i18n审计基线与修正后均144错误/2警告且逐条相同，属于已有问题，未声称全站全绿。SQL回读122模板/2规则/0伪造改正日期；全部停站与时刻未变。

## 2026-10-19 JST — D08 / #40 旅游详情实际加载复核（VALIDATING）

- 执行者 Codex；基线f1f0e9da，提交SHA由本条所在Git提交记录。仅返工当前#40，保留v4.3.1070，不新PR、不合并main、不生产部署、不创建Release。
- 原旅游正文与铁路独立、稳定DOM和懒地图逻辑继续保留；修正无归属/非法index误选、MapLibre样式失败不兜底，并在原地图加载器内并行样式/引擎以满足原低速网络地图预算。文件：tourism-core、原加载回归/浏览器脚本、原精确哈希声明、原专项审计与验证JSON。
- 原有字段/字体/就绪/坐标与架构/版本/部署门禁保留；本地原始基线24样本、最终Chromium27+WebKit27场景、未拦截三页移动端真实地图及分阶段/请求/DOM证据见[原专项审计](docs/reports/tourism-critical-loading.md)。原240秒整进程超时与原5秒低速地图失败保留为负例，未放宽阈值，CI仍运行完整入口。
- 原始数据、全部时刻、请求URL及移动截图哈希追加至原验证JSON；最新head四门禁结果以PR检查为准，真实Safari设备和用户页面验收尚待，不能登记整个原需求完成。预览localhost:8017三类详情，保留旧历史与所有CI/CD门禁。

## 2026-10-18 JST — #40 观光首屏独立加载验收返工（VALIDATING）

- 用户反馈原问题尚未解决，继续原 D08 / #40，候选 v4.3.1070 不变，不创建新PR、不合并或部署。基线55a4d4a8；本轮重新打开原任务，而非新增功能。
- 明确name的旅游正文不再等待铁路，站名/距离独立更新；无名称索引先验证铁路归属并绑定原记录。地图可视区初始化，移除style.load/setStyle重入，保留原Leaflet兜底。三页脚本按原顺序defer下载。
- 所有者/设计/测试契约及验收边界见 [首屏返工审计](docs/reports/tourism-critical-loading.md)。保留原35+16场景及全部断言，新加Chromium/WebKit三页八场景的分时序和实际网络/DOM证据；真机Safari及用户验收不能用WebKit替代。
- 本地48个新增Chromium/WebKit场景、原35详情场景、2,064次字段渲染及60验证入口通过。相同3秒铁路延迟：北千住正文Chrome3194→287ms、WebKit3416→469ms；铁路刷新正文重建新增0，离屏地图库脚本4→0，JSON3/字体1不增加。真实未拦截三页MapLibre底图加载成功。详细原始指标、负例和截图哈希见专项验证JSON。
- 旅游实现提交2ba190a8；推送时#40远端已前进至d9284392（五个已有列车布局/京成证据提交），同分支保留合入，不强推、不合并main。旅游代码/页面/测试字节与已测2ba190a8完全一致；新增远端车型/布局回归同步通过，再执行完整CI。
- 完整最新head CI与不可变构建仍以PR检查记录为准；真实Safari设备和用户实际页面验收尚待，不登记正式完成。工作树预览位于localhost:8017，未生产发布。

## 2026-10-18 JST — #40 观光既有字段漏显返工（VALIDATING）

- 用户明确只修复已有资料未显示，不新增事实或数据。基本字段并未缺失；店铺价格/提示/最佳时间、活动提示和稀疏菜单图库有真实漏显或错位。详见 [字段可见性审计](docs/reports/tourism-field-visibility.md)。
- 沿用原渲染器、共享图库、样式及版本 v4.3.1070；数据/图片不变。新增全量四语言2,064次渲染检查和稀疏菜单真实浏览器案例，保留所有原断言和预算。活动页已有视频与精确frame-src配置一并核对，其它页面不增加视频域名权限。
- 继续原 #40，未新建PR、未合并、未生产发布；最新head完整CI通过后才进入待审核验收，不能以本地通过替代生产验收。

## 2026-10-18 JST — #40 北千住观光详情加载返工（VALIDATING）

- 保持候选版本 v4.3.1070，属于原 D08 / #40，不新建 PR、不合并或部署。实际 HAR、生命周期根因、单一所有者、字体压缩及三类详情验收见 [专项审计](docs/reports/tourism-detail-readiness-audit.md)。
- 复用 pt:tourism-ready，消除空缓存和无界启动重试；铁路刷新不清空观光快照，指定名称缺失不显示其他店铺；修正保存语言、重复键盘监听和地图运行时回退。静态 JSON 仍由现有 DataLoader 请求，产品数据与图片不变。
- 五份原铁路 HAR/原性能门禁继续保留；新加五种生命周期与三类真实浏览器场景、字体来源/字形证据。全部 CI 的实际结果以最新 #40 head 为准；没有把本地通过当作生产验收。

## 2026-10-18 JST — #40 历史去重与产品编号治理（VALIDATING）

- 完整审计 main 可达 4,082 Commit、#1–#40 实际差异及组成提交、11,742 条 Actions 元数据、全部 tag/Release 和公网 manifest 状态。永久证据与 A/B/C 表见 [版本审计](docs/reports/version-consolidation.md)。历史最多资源号为1265；没有把用户提及但未发现的1266当作已发布事实。
- 40 PR 归为7个逻辑范围，直接main另有旅游多图/菜单范围D08，共8个；阶段/返工/已撤销方案不自动成为独立发布。D01–D06 有历史 main 实现，D07 在 #40；正式 GitHub Release 数为0，不补造8次历史生产验收。#5/#25 无独立差异，#27 新外观已撤销，#8/#24 保持开放，#36–#39 为已包含的阶段审查记录。
- 唯一产品定义位于 config/product-version.json。新候选号依冻结源码的1062资源锚点+8归并范围计算为1070；这是显式编号政策候选，非追认旧正式Release。真实旧1070碰撞用编号纪元+完整SHA、永久逐文件映射和新复合tag消除歧义；旧tag/历史原文不改。资源继续构建SHA，不恢复人工?v=。
- 实际修改构建器、哈希manifest、SiteShell页脚、正式Release登记身份与CI版本守卫；README/本文件的现役版本块自动生成。追加序号需要明确交付及真实前次生产验收Release，机械修复/缓存/同步/CI不能自动增加。
- 已验证65项跨页/服务日检查、版本序列、历史碰撞、文档漂移、假Release/CI-only拒绝、manifest篡改、旧SHA-only产物兼容、原架构所有权、284个直通标签及三页本地真实Chrome。最新head四项强制检查与真实SHA产物的实际结果以#40检查页为准，不能引用旧head成功代替。失败场景和验证边界见 [验证记录](docs/reports/version-verification.json)。
- 未合并、未部署、未创建Release、未新建PR、未改铁路数据或PNG；完成验证后停在#40待用户审核。检查点无完整历史生产验收凭证，首个受控生产/真实公网回滚也未执行，不能标RELEASED_VERIFIED。
- 代码检查点76ff54f3的CI39109581802四门禁全通过；实际PR测试合并源337e0f2e与head源码树一致。16场景最大SVG51ms/位置219.6ms/P95帧16.8ms/长任务680ms，冻结状态额外请求0，1070产物三页真实Chrome通过。此后仅提交验收文档证据；最新head检查仍以PR为准。状态保持VALIDATING待用户审阅编号政策与交付，不将预发布验收改写为生产完成。

# 当前交付状态（2026-10-18 JST）

Workstream RELEASE-PIPELINE-INTEGRATION / #40；执行者 Codex；状态 VALIDATING。继续同一整合分支，不创建新PR，不合并/部署。已审计main=78accf09、7个开放PR及实际配置/失败发布案例；移除RunInfoAPI独立查询/状态/缓存和页面覆写、修正RuntimeConfig次序及独立周期、删除观光旧启动轮询、改为构建SHA和显式授权CD/验收后Release。scope原期望保留并迁移到Fusion；新增双视口16浏览器场景、语义所有者负例、静态资源/发布身份/Release证明。具体文件与完整前后所有权、契约变更和历史分类证据见docs/reports/runtime-pipeline-audit.md、engineering-history-index.json及本PR变更。Commit将在提交记录标识；当前未提交开发内容不能冒充已验证源码。无生产成功/回滚基线，收敛提交26f013f9的CI39086073228四项全部成功；16浏览器场景、staged产物验收及所有契约守卫通过，原始指标见runtime-convergence-verification.json；未来源时钟/缓存纠正负例及本次文档再随同一#40验证。补充da9e7b88的CI39086443283：语义/16场景通过，staged Chrome在10秒边界就绪导致启动误报并正确阻断发布；启动基础设施契约改为30秒、增加独立延迟/超时/致命错误测试，所有产品性能阈值与240秒总期限保持不变，明确列入审查。规范同步退休的观光轮询与Train15秒登记，截图不再被测试JSON撑宽。2dbd4498的CI39086944907四项全成功、16场景及staged验收通过、生产均skipped。交接复核仅再补语义守卫递归扫描及嵌套模块负例，运行时不变；当前提交时VALIDATING，达到READY_FOR_RELEASE须以最新head四项检查为准，生产仍未发布。下文历史DONE/REVIEW/PARTIAL只作当时记录，正式状态以本节及PR当前证据为准。

---

# Pixel Tetsudo 工程进度

## 2026-10-17 20:43 JST — 数据链路阶段 04：固定回放与性能门禁（REVIEW）

- Workstream runtime-replay-performance；执行者Codex；依赖#38（GitHub CI success）。本阶段不合并main、不部署；生产页面设计、名称、车型图片、canonical数据及SQL规则未改。
- 原有TrainOperationEvidence内索引车型族规则，原RunningChainResolver按端点/20分钟时窗索引候选再执行同一确认/歧义判断；删除全量扫描/全对比较。Fusion只对本次依赖范围做实时车型接续。官方网页监听器只绑定一次；独立情报刷新不再清空Train原始快照；RunInfoAPI不吞请求失败；覆盖与逐班日期未验证计数保留。
- 固定429列车全输出SHA一致；本机Node645/599ms→81/55ms；18个捕获直通根结果与旧实现逐项一致，4525候选检查；源码不保存第二套图解析器。
- 浏览器固定回放已见埼京20标记(位置715.1ms/SVG65.6ms)、中央本线31(1881.5/82)、吾妻0(146.9/9.4，只有6条计划，不补造)、常磐各停8(882.7/25.5)。未放宽原规则或预算。
- CI增加独立Chromium四场景作业：真实计时、SVG500ms/位置2000ms阈值、扇出上限、身份唯一、元数据事件无重绘、SQL覆盖；与Validate/Release Guards共同阻止部署。回放远程请求仅从脱敏HAR夹具读取，缺失记录明确报错；CI保存JSON与PNG。
- 最终本地50个Node入口、65项node:test、4个Python守卫全部通过。阶段04提交b8cafaae的GitHub CI/CD run39029895965全部success：Validate、Release Guards、真实Chromium四场景；Deploy按PR规则skipped。无需新生产库或付费服务。
- 文件：请求/融合/车型证据/直通图/运行情报既有所有者、回放测试与夹具、CI、审计报告、文档索引。Commit SHA见本阶段PR。
- 四个PR：#36基线/发布、#37请求/快照、#38事件/所有权、#39性能/浏览器门禁；四个实现提交GitHub CI均success。CI Chromium：埼京SVG18/位置54.9ms、中央15.6/177.2ms、吾妻8.8/43.6ms、常磐19.7/69.7ms；覆盖/元数据无重绘/身份及扇出预算全通过，产物browser-replay-metrics保存4份JSON与PNG。
- 交付范围为已识别链路风险及长期门禁；四类代表样本不等于全网人工验收。合并/生产发布仍须按#36→#37→#38→#39顺序审查；当前未合并、未部署。

## 2026-10-17 JST — 数据链路阶段 03：变化契约贯通与长期守卫（REVIEW）

- 执行者 Codex；Workstream runtime-change-contract；依赖 PR #37（GitHub CI success）。
- DataFusion 逐线路区分 position/display/metadata，DataState 透传既有订阅；页面把源时间/有效期从位移哈希移除，单独续期检查；保持车次身份、种别、车型/计划、目的地及状态变化的既有绘制逻辑。订阅者异常相互隔离。源记录重排不作为位移。
- 删除旧逐索引脏检测，复用唯一分类器；分钟协作批次只处理有已加载/注册时刻表的线路，取消无计划全网空算。TrainsPage增加有界绘制耗时读接口，复用Fusion指标。
- ENGINEERING新增数据契约、网络及定时器所有权清单。CI禁止未审查新增网络/周期任务；门禁测试保护生产发布不在中途取消，PR验证仍可取消旧轮次。未放宽既有断言，抽取式测试改为加载真实分类器。
- 本地65项node:test、变化契约/所有权守卫、位置推进/终到/重复号/图库/生命周期通过。浏览器本地埼京图实际有19标记；SVG增量绘制观测17.7–66.1ms。真实网络观测非固定输入前后对比。
- 性能缺口：浏览器loadTrainPositions出现4502.5–7001.5ms，其中车型解析2984–4840.7ms；不得声明性能完成，继续阶段04。缺少受控浏览器HAR前后性能基准。
- 文件：Fusion、DataState、trains-page/render、契约测试及网络/定时器清单、ENGINEERING、CI。Commit SHA见阶段PR；未合并main/未部署。

## 2026-10-17 JST — 数据链路阶段 02：统一请求契约（REVIEW）

- Workstream: runtime-request-contract；执行者 Codex；依赖阶段01 PR #36（CI success），独立叠加分支，不合并 main。
- 扩展唯一 ODPTClient：同 URL 在途共享；Train/TrainInformation 同刷新窗口共享结果；保留原限流与时刻表缓存；错误继续 reject，不伪装为空数据。指标仅汇总 started/joined/cacheHits/failed/staleRows，无密钥/URL输出。
- 比较同一源身份的 dc:date，较老行不能覆盖较新位置；SQL 响应及行都绑定请求 line_id/service_date；跨04:00的旧请求不覆盖新运行日状态，旧日内存缓存淘汰。保留 partial 标签及遗漏数量，不扩大源覆盖声明。
- Train 与 TrainInformation 各自调度，不因当前线路激活而停止情报刷新；后台同时停止、前台恢复；复用既有轮询生命周期。
- 测试：20消费者→1请求、已完成窗口复用、错误传播/重试、源时间倒序、捕获7条线路SQL适配/partial、错线路拒绝、跨日乱序；65既有node:test及位置连续性/生命周期通过。45个其余CI Node入口通过；全地铁计划套件需单独等待较长执行，最终记录见PR。browser runtime: NOT VERIFIED。
- 文件：odpt-unified.js、runtime-request-contract.test.js、sql-har-contract.json、CI与本进度。Commit SHA见阶段PR。
- 遗留：此阶段未声称动画/浏览器性能完成，下一阶段变化契约和旧路径守卫。

## 2026-10-17 JST — 数据链路阶段 01：五份 HAR 基线与发布门禁（REVIEW）

- Workstream: runtime-pipeline-audit；执行者 Codex；隔离工作目录基于 origin/main 78accf09，保留主工作区全部未提交内容。
- 五份 HAR 已从 Downloads 读取；只提交脱敏汇总及 SHA256，不提交含密钥/请求头的 HAR。107/108/89/792/5 个请求；realtime 样本有 1 次同 URL 请求重叠，其余样本为 0。不能把所有轮询都归为重复请求。
- CI/CD 成为唯一 Pages 发布者；Release Guards 变为可复用必经作业；PR 按 ref 隔离并发，发布串行且不在中途取消；手动重发仅允许 main 并重新验证。删除旧手动绕过入口。回滚通过 revert PR，经同一验证和发布链。
- 本地 deployment-gate、6 个发布检查、4 个 Python 守卫全部通过（历史警告保留）；GitHub CI 待 PR。browser runtime: NOT VERIFIED。
- 修改：.github/workflows、tools/deployment-gate.test.js、tools/audit-request-har.cjs、tests/fixtures/guards/request-har-baseline.json、docs/reports/runtime-pipeline-audit.md。Commit SHA：见本阶段 PR。
- 遗留：网络基线不能证明脚本/渲染性能；下一阶段请求共享、失败语义、响应归属及版本；尚未宣称整体重构完成。

### YYYY-MM-DD HH:mm JST — <Task ID> — <agent name>

- Status: CLAIMED | IN_PROGRESS | BLOCKED | REVIEW | DONE | PARTIAL
- Scope:
- Files:
- Base HEAD:
- Commit:
- Work:
- Validation:
- Risks / blockers:
- Next:
```

## 2026-10-17 JST — RELEASE-PIPELINE-INTEGRATION

Status REVIEW. Integrates runtime phases #36–39 with immutable build/manifest, all-gate deploy dependencies, staged + production browser acceptance, verified-artifact rollback and exact-hash contract-change disclosure. Evidence sync now creates candidate branch, dispatches CI and outputs manual PR link; Actions PR creation remains disabled per user. main requires PR + all checks with0 mandatory approvals. No merge or production deploy in this task; actual GitHub CI/config readback pending below. First managed release needs its first successful production acceptance before historical verified rollback is available.

Repository configuration applied and read back: main requires PR with0 approvals; strict Validate / release-guards / release-guards / Fixed HAR browser replay / Build verified release checks bound to GitHub Actions app15368; enforce_admins=true; force push/delete=false; conversation resolution=true. Pages build_type=workflow; old pages.yml workflow343057107 disabled_manually; github-pages environment retains sole main branch policy; Actions can_approve_pull_request_reviews=false. Integration PR https://github.com/biubiu52011/Pixel-Tetsudo/pull/40. main source has not been changed. First CI caught a synchronous assertion on the asynchronous hashchange back route; corrected the driver to await actual overview restoration without weakening assertions. Final rerun pending.

## 2026-10-18 JST — EXISTING-PR-CONSOLIDATION / agent

User requested consolidation and no arbitrary new PRs. Preserve both Ina layout4454fa1c and Keisei fleet7fbf24b9 changes in existing PR#41;PR#42 to be closed only after push/readback verifies inclusion. Resolve append-only PROGRESS conflict by retaining both entries;trainsHTML automatically retains both layout4.3.1266 andvehicle/evidence4.3.1267 resources. No production behavior beyond originaltwoPRs, no SQL changes. Existingbranchprotectionmissing-check blocker remains;consolidatingPRs does not deploy or recycle GitHub issue/PR numbers. Validation/publication status follows below.

Consolidation validation: existingtrain-fold-layout,remaining-planned-vehicles,26browser-contractcases,andbraceguardPASS. Bothoriginalfixesretained;existingPR#41willholdcombinedchange.

User correction / consolidation complete:retain#42asOPENDRAFTplaceholder,title占位,emptybody,zerochangedfiles/additions/deletions;doNOTclose. #42baseisexisting#41branch,headab06c7aaaddsoneemptycommit;bothoriginalworkcommitsretainedin#41(23280014combined). No newPRcreated. FourlocalcombinedchecksPASS;productionmainstillunchanged. Futuredevelopmentmayreuse#42byupdatingitsbranch/base/title/bodywithuserauthorization. This supersedes earlierintentiontoclose#42.

## 2026-10-18 JST — #40 京成发布链路接入（INTEGRATION）

用户要求继续实际补全；沿用现有#40，不新增PR。将#41伊奈线/京成提交整合进最终候选。保留#40车型网络索引、唯一状态所有者、不可变产物及全部发布门禁；冲突仅组合原始trainNumber范围和现有网络索引。HTML保留构建SHA机制，不恢复人工资源版本。产品候选1070不因本轮修复递增。两个原测试仅追加断言，精确哈希与解释登记在现有契约清单。SQL15计划规则已在原任务写入，本轮无SQL/拓扑/图片新写入。公开旧版78accf09对当日线上样本四线1098条无计划图标；修复版本同样本1675条全有计划图标。全量3596源记录回放与四门禁尚须验证本次整合head。生产发布涉及#40已待审的整个集成候选，不能将PR内验证当作已上线。

Integration verification:3596/3596source rows resolve planned PNGs after retaining indexed evidence provider;unchanged429HARdecisionSHA8a646b8babe0fe3006e9439211f7fd2266e320b4953279885e48930a73a91e18,first101ms/repeat36ms. Existingcontract/layout/fleet/pipeline/productversion/deploymentgatechecksPASS. LatestcombinedheadrequiresallfourGitHubgatesandstagedbrowseracceptancebeforeproductionauthorization.

## 2026-10-24 JST — IMPORT-ENOSHIMA-RAILWAY — REVIEW

- 执行者 Codex；导入江ノ島電鉄線（Enoshima）；不新增脚本、不接入未经确认的实时接口。
- canonical：`data/core/railway_data.json` 新增 15 站线路、站序、坐标、藤泽/镰仓同站换乘及线路卡 presentation；江之岛与湘南单轨/小田急片濑江之岛保持独立站点，不捏造同站换乘。`data/core/station_i18n.json` 补齐站名；`js/common.js`、`js/line-presentation-service.js`、`js/translations.js` 接入运营商分组与四语名称。
- PNG 判定：在既有 `js/train-vehicle.js` 的唯一车型目录登记江ノ島電鉄 10/20/300/500/700/1000/2000 形，绑定 `Enoshima` 线路作用域、运营商前缀和对应 PNG；裸车型名只有在该线路/运营商上下文中才可解析，禁止按线路默认猜车。
- 生成：运行 `node data/core/gen-file-data.js`，同步 railway/station i18n 的 file.js 与 compact.json。
- 验证：canonical JSON/图标/站序/换乘断言、7 个车型到 PNG 的精确映射、SQL 裸车型线路作用域映射、JS 语法、train_vehicle_mapping_guard、vehicle-audit、train-position-evidence-regression 通过；浏览器本地线路页因 Browser Use 的 file URL 策略未能回读，browser runtime: NOT VERIFIED。
- 风险/下一步：江ノ島電鉄未接入 ODPT/SQL 实时班次与车型实证，因此当前只提供静态线路图/线路卡；已有江ノ島電鉄车辆 PNG 未被擅自当作当日实车证据。当前目录无 Git 元数据，未 commit/push。

## 2026-10-24 JST — CHUOSOBU-HOLIDAY-REALTIME — DONE

- 根因：ODPT 当日实时数据只提供公共列车号，不提供车型；本地证据只有 2026-10-23，导致 2026-10-24 休日的中央・总武线车辆始终落入候选/灰点。
- 处理：将已核对的 Loo-ool 2026-10-24 休日运用表按运用番号并入既有 `js/train-vehicle.js` 证据注册表；公共车号只转换为末两位加 B/C 后缀，例如 `2139B → 39B`，不新增脚本。
- 样例：`2139B → 39B → E231系500番台 / A530`、`2111B → 11B → E231系500番台 / A502`、`2169B → 69B → E231系0番台（中央・総武線各駅停車） / B10`，均可继续解析到既有 PNG。
- 安全边界：休日表中空白的 `43B`、`04C` 等不补猜测，仍保持 UNKNOWN/灰点；未把休日编成外推为平日规则。
- 验证：JS 语法、中央・总武既有回归测试通过；当前 ODPT 抽取的 30 个车号中，10 个有可核对的休日编成并解析为 EXACT，其余 20 个因源表无对应明确编成而保持未判定。浏览器视觉刷新尚未在本轮回读。

## 2026-10-24 JST — CHUOSOBU-ODPT-DIRECT-AUDIT — DONE

- 直接读取用户提供的 ODPT JR-East `odpt:Train` 接口核对实时链路；本次返回 28 列中央・总武线列车。
- API 实际字段包含车号、线路、方向、车站、延误、更新时间和 `odpt:carComposition`，但没有 `odpt:vehicleType`、车辆编号或编成号字段；只有具备官方编成约束的窄范围规则（例如宇都宫线 3/6 辆 E131）才能由实时字段直接判定，混编线路仍不能凭线路名猜车型。
- 现有架构已经由 `data/api/odpt-unified.js` 拉取数据，经 `js/data-fusion.js` 将 `odpt:trainNumber` 传入 `TrainVehicle.resolveRealtime`，再由 `js/train-vehicle.js` 查询休日/平日运用证据；不新增 API 脚本或第二套映射器。
- 本次实时车号审计中，9 列通过休日运用表解析为 EXACT；其余车号对应 Loo-ool 休日表的“－”空白运用，继续保持 UNKNOWN，避免把 API 的 10 両编成数量误判成车型。

## 2026-10-24 JST — CHUOSOBU-CALENDAR-PNG-MAP — DONE

- 按 Loo-ool `K/` 首页的运用编号和标记整理为现有 `js/train-vehicle.js` 内的平日/休日静态车型 PNG 映射；不新增脚本、不运行时抓网页。
- 休日保留当日有 A/B 编成号的精确证据；平日/休日表只负责车型 PNG，已有日期证据优先，历史早于基准日不回填，避免跨日期污染。
- `－` 空白运用没有写入映射，继续返回 UNKNOWN；当前测试和 PNG 解析守门测试通过。
- 渲染层补齐编成号投影：`trains-render.js` 将已确认的 `vehicleFormationId` 同步到 `data-vehicle-formation-id` 和无障碍标签（如 `编成 A530`），不对缺失编号进行推测。
- 终点语义回归已补齐：中央・总武线 `toStation=津田沼, destinationStation=千葉` 继续显示千叶；只有 `destinationStation=津田沼` 的短折列车才显示津田沼。

## 2026-10-25 JST — HAKODATECITY-GTFSRT-ENDPOINTS — PARTIAL

- 将函馆市电 `HakodateCity / Alllines` 的 GTFS-RT VehiclePosition、TripUpdates、Alert 三个官方端点并入现有 `data/api/odpt-unified.js` 统一端点表；不新增脚本、不新增第二套实时链路。
- 当前项目 canonical 数据只有“新函馆北斗”站，没有函馆市电线路、站点、坐标和线路图定义，因此本次不伪造 `LINE_TO_OPERATOR` 或车辆落点映射；接口配置已具备，页面实际显示仍待静态 GTFS 线路资料入库后验证。
- 验证：`node --check data/api/odpt-unified.js`、`frontend-smoke.test.js`、`performance-lifecycle.test.js` 通过。浏览器实时显示未验证；函馆市电静态线路导入是下一步前置条件。

## 2026-10-25 JST — KEIO-GTFSRT-CANONICAL-MAPPING — DONE

- 根因：京王相模原线、新线、动物园线的实时运营商映射仍使用旧 ID `KeioSagamihara / KeioNew / KeioDobutsuen`，而 canonical 线路实际为 `KeioSagami / KeioShin / KeioZoo`；接口可读取但三条线路无法进入位置映射。
- 处理：在现有 `data/api/odpt-unified.js` 内将 `LINE_TO_OPERATOR` 与 `LINE_RAILWAY_CODE` 统一到 canonical ID；没有新增脚本、运行时补丁或第二套映射器。京王 7 条 canonical 线路现在均能通过统一客户端进入实时位置能力判断。
- 验证：JS 语法、线路身份覆盖、前端冒烟、实时位置证据回归均通过。当前环境仍无法直读外部 GTFS-RT protobuf，因此现场车辆样本与浏览器视觉位置尚未验证。

## 2026-10-25 JST — TOBU-GTFSRT-CANONICAL-MAPPING — DONE

- 根因：东武大師线、龟户线、宇都宫线的实时映射使用旧键或泛名，未与 canonical `Daishi_Tobu / Tobu_Kameido / TobuUtsunomiya` 对齐；对应 railway code 别名也存在同样偏差。
- 处理：在既有 `data/api/odpt-unified.js` 统一客户端内收敛运营商映射和 railway code；删除失效旧键，不新增脚本或第二套位置链。
- 验证：JS 语法、线路身份覆盖、前端冒烟、实时位置证据回归通过。外部 GTFS-RT 现场 protobuf 仍受当前网络环境限制，未宣称现场车辆样本已回读。

## 2026-10-26 JST — GTFSRT-TERMINAL-FALLBACK — DONE

- 根因：DataFusion 只读取 `odpt:destinationStation`；部分已成功合并的 GTFS-RT TripUpdate 仅保留可信终点在 `odpt:toStation`，导致实时车辆有位置和方向但没有终到站。
- 处理：在现有 `js/data-fusion.js` 统一终点解析入口中增加受信任回退，仅对带 `gtfs:tripUpdateTimestamp` 的 TripUpdate 记录读取 `odpt:toStation`；普通 VehiclePosition 的区间下一站不会被误当作终点。
- 验证：DataFusion 语法、实时位置证据、终点一致性、前端冒烟测试通过。浏览器现场实时样本仍受网络限制，待刷新页面后核对实际 DOM。

## 2026-10-26 JST — TOEI-TRIPUPDATE-MATCH-KEYS — DONE

- 根因：都营 VehiclePosition 与 TripUpdate 在部分记录中未共享可用的 `trip_id`/服务车号，导致既有终点合并入口没有命中；前一轮 `toStation` 回退因此没有输入可用。
- 处理：在现有 `_mergeToeiGtfsTripUpdates` 内增加同线路作用域的 `operationCode` 和 `vehicleId` 精确匹配，保留原有 `trip_id`、线路+车号及唯一车号顺序；不使用跨线路模糊匹配。
- 验证：JS 语法、实时位置证据、终点一致性、前端冒烟测试通过。当前网络仍无法回读现场 GTFS-RT，需整页刷新后确认都营实时 DOM 的终点标签。

## 2026-10-26 JST — GTFSRT-TERMINAL-ORDER-AND-SERVICE-MATCH — DONE

- 根因：GTFS-RT 的 `stop_time_update` 不保证按站序排列；同时都营实时短运用号与计划表完整车次号格式不同，严格运行链键会阻断可信终点继承。
- 处理：在既有 `data/api/odpt-unified.js` 中按 `stop_sequence` 稳定排序后取终点；在既有 `js/data-fusion.js` 中增加带服务日/方向作用域的都营运用号归一化匹配，只有实时与计划双方唯一时才继承终点，不跨线路猜测。
- 验证：两份脚本语法、实时位置证据回归、终点一致性、前端冒烟测试均通过；外部 GTFS-RT 现场 DOM 仍需用户刷新页面确认。

## 2026-10-26 JST — GTFSRT-UNIFIED-ENTRYPOINT — DONE

- 处理：确认实时链路以 GTFS-RT 为主，静态 JSON/SQL 仍作为线路、站点、时刻表和车型基础数据；将位置与 TripUpdate 的合并函数收敛为运营商无关的 `_mergeGtfsTripUpdates`，所有已配置 GTFS-RT 的运营商共用同一入口。
- 清理：修正 TripUpdate 失败日志仍固定写“都营”的旧命名，避免误判其他运营商的接入状态；没有新增脚本或第二套实时链路。
- 验证：后续执行 JS 语法、实时位置证据、终点一致性和前端冒烟测试。

## 2026-10-26 JST — GTFSRT-LINE-ACTIVATION-COVERAGE — DONE

- 根因：运营商级 GTFS-RT 端点已经存在，但部分 canonical 线路没有进入 `REALTIME_POSITION_API_LINES`；其中东武支线、龟户/宇都宫线及都营日暮里・舍人线因此没有触发实时位置请求。
- 处理：在现有 `data/core/runtime-config.js` 补齐已登记 GTFS-RT 运营商的 canonical 线路激活项；保留东武龟户线的 `COARSE` 精度语义，不把粗粒度来源伪装成完整覆盖。没有新增脚本或第二套实时入口。
- 验证：runtime 配置语法、runtime architecture guard、实时位置证据回归、frontend smoke 均通过。JR-East 的官方范围限制、未提供 VehiclePosition 的 Metro/TWR/MIR、以及没有 canonical 线路资料的函馆市电仍不强行标为实时位置全覆盖。

## 2026-10-26 JST — TOBU-SKYTREE-GTFS-STATION-NORMALIZATION — DONE

- 根因：东武晴空塔线 canonical 站点含连字符（如 `Kita-Senju`、`Tokyo-Skytree`），GTFS-RT `stop_id` 可能使用无分隔符形式；通用解析器原先只做完全相等比较，无法解析站点就丢弃整条 VehiclePosition。
- 处理：在现有 `data/api/odpt-unified.js` 的通用 GTFS-RT 站点解析中加入线路作用域内的分隔符归一化；不做跨线路、跨运营商的全局站名猜测。
- 验证：脚本语法、实时位置证据回归、runtime architecture guard、frontend smoke 均通过；页面需刷新后确认现场车辆数量。

## 2026-10-26 JST — GTFSRT-RAILWAY-TOKEN-NORMALIZATION — DONE

- 根因：通用 GTFS-RT 线路归属只按原始 route_id 字符串匹配；同一 canonical railway 使用下划线/连字符等分隔符时，位置记录在进入站点解析前就被丢弃。
- 处理：在既有 `data/api/odpt-unified.js` 线路归属函数中增加运营商和候选线路作用域内的 token 归一化，保留精确 railway identity 优先，不做跨运营商或全局站名猜测。
- 验证：脚本语法、实时位置证据回归、runtime architecture guard、frontend smoke 均通过。

## 2026-10-26 JST — TOBU-GTFS-VEHICLE-TYPE-PROJECTION — DONE

- 根因：通用 GTFS-RT 车型解析此前只处理横滨市营；东武实时记录中的明确 `vehicle_id/vehicle_label` 车型族没有进入车型责任层，因此位置可以显示但车辆栏为空。
- 处理：在既有 `data/api/odpt-unified.js` 接入明确携带的东武 30000/50050/70000/70090 车型文本，并在 `js/train-vehicle.js` 补齐已有本地 PNG 的 30000/70000 canonical 记录；纯数字车号仍不反推车型。
- 验证：两份脚本语法、车型图标回归、实时位置回归、frontend smoke 均通过。

## 2026-10-26 JST — TOBU-REALTIME-POSITION-SOURCE-FIX — DONE

- 根因：东武 GTFS-RT VehiclePosition 虽有车辆坐标，但该流实际只带内部 trip/vehicle ID，缺少 `route_id` 和 `stop_id`；旧解析器还把标准 `timestamp`/`stop_id` 错读成字段 6/4，最终所有东武位置在线路归属或站点解析阶段被丢弃。现场接口核对显示 JSON `odpt:Train` 当前可返回东武晴空塔线记录，而页面日志此前为东武位置 403 后 0 条。
- 处理：在既有 `data/api/odpt-unified.js` 修正 GTFS-RT VehiclePosition 标准字段读取；东武位置主源改用已带 railway/fromStation/toStation 的 JSON `odpt:Train`，GTFS-RT TripUpdate 继续作为补充合并。没有新增脚本或第二套渲染链路。
- 验证：脚本语法、前端冒烟、实时位置证据回归、runtime architecture guard 均通过；需刷新页面确认浏览器现场车辆显示。

## 2026-10-26 JST — TOBU-SKYTREE-OPERATION-CANDIDATE-MAPPING — DONE

- 根因：东武晴空塔线实时位置已进入页面，但纯车号没有直接车型字段；既有证据表没有接入 loo-ool 平日/休日运用表，所以车辆只能保持未判定灰点。
- 处理：在 canonical 车型证据快照中加入 12 条平日/休日计划规则，按公开列车号原值精确匹配，覆盖东武 100/20000/20050/30000/50050/70000/70090 系候选；不把多候选运用表误报为实际编组。
- 处理：候选规则允许既有车型责任层选择来源支持的代表 PNG；标记仍为 planned，ARIA 标签继续完整列出候选，不把代表图当作实际编组。
- 验证：JSON/JS 快照一致性、车型 PNG 解析、运行时架构约束均通过；没有新增脚本或第二套映射入口。

## 2026-10-26 JST — TOBU-ISESAKI-OPERATION-CANDIDATE-MAPPING — DONE

- 根因：东武伊势崎线已有本地平日/休日运用表，但没有进入 canonical 车型证据表，因此实时车号如 501、A4643T 无法得到车型计划或 PNG。
- 处理：补入 6 条平日、6 条休日伊势崎线规则，使用公开列车号原值匹配，并限制 lineIds 为 TobuIsesaki；代表 PNG 仍标记为 planned，不冒充实际编组。
- 验证：canonical 快照、车型 PNG 映射、运行时架构约束均通过；没有新增脚本或旁路映射。

## 2026-10-26 JST — TOBU-MAINLINE-VEHICLE-CATALOG-CORRECTION — DONE

- 根因：loo-ool 的东武编成附加信息页能确认 8000/850、10000、10030 等车型族，但本地规范车型库只把 8000 系限制在越生线，且缺少本线常用别名，导致已有 PNG 无法参与东武本线候选解析。
- 处理：在既有 `js/train-vehicle.js` 规范车型库内补齐东武 8000/850、10000、10030 的别名、TobuSkytree/TobuIsesaki/TobuNikko 线路作用域和已有 PNG 资产；不把编成附加信息误当成实时列车号或具体编成判定。
- 追加匹配（2026-10-27 JST）：将 loo-ool `/rail/TS/41/` 的 73 个在籍编成登记为 formation-only 证据，并同步 `vehicle-operation-evidence.json` 与生成的 `vehicle-operation-evidence-data.js`；实时 `vehicle_id/vehicle_label` 中的 `801F/11433F/1003011433F` 等值在东武上下文内提取编成号，再按既有车辆责任层解析到车型与 PNG。删除重复注册的東武70000系，避免规范别名冲突造成灰点。
- 追加修复（2026-10-27 JST）：候选计划的 PNG 许可随 `vehiclePlan.allowCandidateArtwork` 传递，解决 DataFusion 克隆对象后被渲染层误判为未授权、最终退回灰点的问题；无具体编成号时仍标记为计划候选，不冒充 EXACT。
- 验证：73/73 个东武编成均解析为 EXACT 且有 PNG；克隆后的计划对象仍能输出代表车型 PNG；脚本语法、canonical evidence snapshot、车型图标回归、runtime architecture guard 均通过；没有新增脚本或旁路渲染链路。

## 2026-10-29 JST — TRAIN-PNG-VISUAL-AUDIT — REVIEWED

- 审核范围：`images/列车` 下 579 张 PNG；按运营方生成 24 页缩略图总览，并对全部缩略图页做批量视觉检查。
- 结构结果：初检发现 8 张 PNG 的 CRC/块边界不合规；已从 Train Front View 大图页补回 7 张确认度高的 82×98 原图：京急600、京王1000、伊豆箱根5000、北総7500、北総7800、千葉ニュータウン9200、相模21000。
- 相模21000使用网站 `sote20000.png`：依据车型资料将 21000 系视为 20000 系直通改造分支，共用前视图属于同族复用，不再标为错误近似（参考：https://zh.wikipedia.org/wiki/%E7%9B%B8%E9%90%B520000%E7%B3%BB%E9%9B%BB%E8%81%AF%E8%BB%8A）。来源记录见 `.work/train-png-review-20261029/source-replacements.json`。
- 仍待可信源图：わたらせ渓谷鉄道 わ99形；Train Front View 仅找到わたらせ710，未冒充精确车型写入。日本語版 Wikipedia、わ鐵官方车辆介绍与 Wikimedia Commons 均确认这是 5010/5080（JR东日本12系）+ 5020/5070（京王5000系改造トロッコ）的固定4辆编成，现有资料为照片而非可直接替换的 82×98 像素车头图；证据已登记于 `.work/train-png-review-20261029/source-replacements.json`。
- 全局映射补齐（本轮）：在既有 `js/train-vehicle.js` 统一车辆责任层登记 `watarase-wa99`，并将官方车号 5010/5020/5070/5080 在わ鐵运营方与线路上下文内解析为わ99形；错误运营方或普通列车号不会命中。因精确 PNG 仍缺源，实时判定可为 EXACT，但 `iconPath` 保持空值，不冒充近似图。
- 其余 578 张通过 PNG 结构检查；重复哈希共 7 组，属于跨车型/别名或同图复用候选，不等同于文件损坏，暂不自动删除或改名。
- 验证追加：わ99全局车号映射、运营方隔离回归通过；`train-vehicle-pipeline.test.js`、`train-image-assets.test.js`、`vehicle-audit.js`、`gallery-sync.js` 均通过。现阶段仍只有わ99形 PNG 文件待精确源审。

</details>

<details>
<summary>提交基线的旧部署待办（已由现役配置取代）</summary>

以下保留原排队文字，仅说明远端文档曾滞后于配置，不能作为当前推送会自动部署的依据。

| 优先级 / 任务 | 当时依据 | 当时计划 | 当时状态 |
| --- | --- | --- | --- |
| P1 COMMIT-DEPLOY-SEPARATION | 本地 ci-cd.yml main push 仍会部署 | 单独实施提交/生产分离；本轮不修改工作流/Ruleset，不靠 Push 触发未授权部署 | TODO |

</details>

