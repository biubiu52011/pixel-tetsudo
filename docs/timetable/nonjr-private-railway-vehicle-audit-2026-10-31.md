# 私铁／地铁／第三部门铁道：计划车次及车型判定专项审计
日期：2026-10-31。生产库：`pnupwfmgbtxqhpzsrhfn`。

## 口径

本项目的 Supabase **只存放出版物式平日与土休日列车计划**；本专项检查的“车型”特指能被可靠来源关联至相应计划车次的车型系列（**不是实际车辆编组、每日车辆记录、日别运行结果**）。运营商车队中存在某种车型、线路只有某一种候选车型、某运行日有列车计划，都不自动证明该车次的确切计划车型。

所有结果来自生产 `manual_timetable_templates` 与 `train_timetable_source_resolution`、`operation_family_rules`、`railway_lines`。

## 发现

在 21 个非 JR 运营主体，77 条有列车计划的线路中，平日＋土休日 **55,673** 条模板。这里不存在只收录1–2条车次的线路；已收录线路的最少模板数是126，且都具有两种日历。**不是全部已核实全天完整。**

| 车型判定档次 | 模板数 | 含义 |
|---|---:|---|
| 来源支持的计划运用／运营归属规则 | 403 | 目前数据库中有实际计划规则关联，尚需关注适用范围和版本 |
| 单一来源车型候选（source_single_type_candidate） | 7,006 | 只从已有来源列出一类候选，**不是经运用号确认的车型** |
| 未得到唯一车型结果 | 48,264 | 无法把现有候选车辆列表变为确切的单班计划车型 |
| **总数** | **55,673** | 三类互斥 |

### 问题较大的线路
| 线路 | 有计划 | 计划运用规则支持 | 来源单一候选 | 未知 |
|---|---:|---:|---:|---:|
| 京急本线 Keikyu | 2,782 | 0 | 130 | 2,652 |
| 西武池袋线 Ikebukuro | 2,088 | 0 | 8 | 2,080 |
| 相铁本线 SotetsuMain | 1,457 | 0 | 0 | 1,457 |
| 京成本线 Keisei | 1,413 | 0 | 0 | 1,413 |
| 东京地铁银座线 Ginza | 1,346 | 0 | 0 | 1,346 |
| 东急东横线 TokyuToyoko | 1,397 | 64 | 0 | 1,333 |
| 西武新宿线 SeibuShinjuku | 1,147 | 0 | 0 | 1,147 |
| 筑波快线 TsukubaExpress | 841 | 0 | 0 | 841 |
| 百合海鸥线 Yurikamome | 991 | 0 | 0 | 991 |

**仅有1条车型规则的运营商**包括：TsukubaExpress、Yurikamome、TokyoMonorail、TWR、ShonanMonorail、TamaMonorail、SaitamaNewUrbanTransit、EnoshimaElectricRailway、YokohamaMinatomiraiRailway 等。规则行数不等于覆盖所有该公司车次；`operation_family_rules` 中 `vehicle_candidates` 有多个值时，永远不能直接转为唯一车型。

案例：`Ikebukuro` 的多数 `vehicle_type_label` 列出「6000系 / 30000系 / 20000系」等多个候选；`SotetsuMain` 可列出8000/9000/11000、12000/JR E233等多种车型。来源文本可以用作车型候选说明，但没有对应计划运用号及版本证据前不能强制选定其中一个。

## 注册线路与时刻源对不上

`railway_lines` 中非 JR 线路共登记 29 个 ID，其中 12 个**按原样 line_key JOIN 为 0**：

- **京王 4**：KeioInokashira / KeioKeibajo / KeioMain / KeioTakao
- **东武 4**：Noda / Ogose / TobuSkytree / Tojo
- **都营 4**：Arakawa / Asakusa / Oedo / Shinjuku

这些是**ID 完全匹配失败**，不是已经证明公司未提供计划。必须区分可能的别名、线路分段、导入未运行和源文件缺失。当前 GitHub main 的 `data/timetables/Oedo-manual.js` 文件读取内容为空；尚不能将 Oedo 判为已完成。别名确认后需要重建合法来源，不得复制其他线车次来充数。

## 运营商名称不统一：已核实的5个案例

| 线路 | 来源运营商字段 | 官方／规则名称 | 性质 |
|---|---|---|---|
| NewShuttle | SaitamaRailway | SaitamaNewUrbanTransit | **归属写错公司** |
| TsukubaExpress | MIR | TsukubaExpress | 不同命名 |
| ChibaMonorail1 / 2 | ChibaMonorail | ChibaUrbanMonorail | 不同命名 |
| MinatoMirai | MinatoMirai | YokohamaMinatomiraiRailway | 不同命名 |

官方核对：
- New Shuttle：[埼玉新都市交通公司概要](https://www.new-shuttle.jp/company/resume/)
- TsukubaExpress：[首都圈新都市铁道公司概要](https://www.mir.co.jp/company/outline.html)
- ChibaMonorail：[千叶都市单轨公司概要](https://chiba-monorail.co.jp/index.php/company-info/)
- MinatoMirai：[横滨高速铁道公司概要](https://www.mm21railway.co.jp/info/corpo/corpo.html)

目前只在独立审计视图中记录核实结果。没有贸然改动老 `railway_urn` 或 `train_timetable_members`，因为会影响客户端线路映射；**更不会把车型规则直接分配给一整线所有班次**。

## 本轮实施与复核

已在 Supabase 执行并将 SQL 同步 GitHub main：

1. [私铁线路计划/车型证据动态审计](../../supabase/migrations/20261031234510_nonjr_vehicle_and_timetable_readiness.sql)：`published_nonjr_timetable_vehicle_readiness`、`published_nonjr_operator_readiness`；可按线路/运营商查询两个日历、车型证据等级、登记但没有对应 ID 的线路。
2. [已核实运营商名称异常](../../supabase/migrations/20261031235550_nonjr_operator_identity_review.sql)：`published_nonjr_operator_identity_review`，NewShuttle 的 `published_timetable_coverage_audit` 标注“源运营商写错”；其余为命名别名。
3. 这3个视图 `security_invoker=true`；只授权 `service_role`，不向匿名用户开放。
4. 核验快照：89 个被审计线路 ID（77个有数据＋12个登记但无同名计划），55,673条计划＝403规则支持＋7,006候选＋48,264未判定；数据库总计92,586模板／1,135,945停站，`train_runs=0`，日历类型仍仅 Weekday／SaturdayHoliday。

## 排优先级补齐（需要来源）
1. **缺线路计划**：京王、东武、都营12个登记 ID 做真实线路别名和导入路径对照，确定缺失再合法补来源。
2. **严重车型未知**：优先西武池袋/新宿、京急、京成、相铁、东京地铁银座线及东急东横线。获取具有来源版本的平日/土休日运用号与车型系列对应表，不要用车队名单代替车次证据。
3. **公司别名对齐**：New Shuttle 真正运营公司标注为埼玉新都市交通；其他四个名称差异需统一关联键，避免 `operation_family_rules` 和 `railway_urn` 不能连接。
4. 规则要区分 `exact_plan_vehicle`、`source_single_candidate`、`unknown`，不能将整个公司的1条泛用规则推广到所有车次。

可以在数据库维护角色下运行：
```sql
SELECT * FROM public.published_nonjr_operator_readiness
ORDER BY vehicle_unresolved DESC;
SELECT * FROM public.published_nonjr_timetable_vehicle_readiness
WHERE timetable_readiness='registered_id_without_matching_timetable'
   OR planned_vehicle_readiness='unresolved_plan_vehicle'
ORDER BY plan_templates DESC;
SELECT * FROM public.published_nonjr_operator_identity_review;
```


---

## 后续实际处理：公司归属、缺线路来源分流、候选车型显示（2026-10-31）

本节覆盖生产库与 GitHub `main` 的已完成修复；**没有导入虚构的平日/休日车次或按具体日期存放列车运用，更没有指定实际车辆编组**。

### 1. 网页已停止将单一候选车型当作确定车型
原 `data/api/odpt-unified.js` 中，只要 `vehicle_mapping_level=source_single_type_candidate` 且候选只有一项，便会填充 `vehicleType`。后端设计上明确此等级**不等于已核实的计划运用车型**。

已修正为只在 `dated_schedule_rule`、`dated_operation_owner`、`verified_scheduled_boundary` 提供确定 `vehicleType`。候选车型仍保存在 `_sqlVehicleCandidateLabel`，证据等级仍保存在 `_sqlVehicleMappingLevel`，不删除来源。

[已修正前端适配器](../../data/api/odpt-unified.js)（commit `3b7458fb1e178bbef1eadbb7d0bf301ac0305f24`）

### 2. 修正 New Shuttle 公司归属，不修改埼玉高速铁道

官方经营主体：**埼玉新都市交通株式会社**；旧登记将 New Shuttle 的 `railway_lines.timetable_operator` 写成 `SaitamaRailway`。已实改为 `SaitamaNewUrbanTransit`，而 `SaitamaRapid` 原先正确的 `SaitamaRailway` 不变。

- [校正 SQL](../../supabase/migrations/20261031235610_new_shuttle_official_operator_metadata.sql)
- 官方：[New Shuttle 公司概要](https://www.new-shuttle.jp/company/resume/)
- 老的 `railway_urn`、原始停站路径与前端旧 ODPT 源命名空间**暂未直接改写**，避免破坏现有接口标识和来源可追溯性。前端历史兼容映射仅更新注释，明确它不代表实际经营公司。

### 3. 12个没有同名 SQL 计划的登记线路：分开处理

新增内部视图 `published_nonjr_registered_line_import_triage`，识别路线登记与真实计划来源，不擅自套用其他线路的列车。

| 处理组 | 数量 | 线路 |
|---|---:|---|
| 外部时刻表 API **已配置**，但无 SQL 计划 | 5 | Asakusa, KeioMain, Oedo, Shinjuku, TobuSkytree |
| 没有 SQL 计划，也**没有配置**外部时刻表 API | 7 | Arakawa, KeioInokashira, KeioKeibajo, KeioTakao, Noda, Ogose, Tojo |

**注意：接口设置为 true 不代表当前调用已测试正常，也不意味着有完整的两种运行日出版计划**。第二组的7条线路确实需要合法的时刻表导入与接入工作。

[来源分流视图 SQL](../../supabase/migrations/20261031235700_nonjr_missing_registered_route_import_triage.sql)

### 4. 五个运营商命名案例已真正参与审计统计

`published_nonjr_timetable_vehicle_readiness` 现在在聚合时优先采用前文已核实的线路级公司身份，而不是总按原始 `railway_urn` 名称分组；原来源字段仍保留便于追踪：

- NewShuttle 424 计划 → `SaitamaNewUrbanTransit`，与 `SaitamaRapid` 533 计划分开；
- TsukubaExpress 841 计划 → `TsukubaExpress`（旧源为 `MIR`）；
- ChibaMonorail1/2 共 888 计划 → `ChibaUrbanMonorail`；
- MinatoMirai 1,216 计划 → `YokohamaMinatomiraiRailway`。

[已实改汇总视图 SQL](../../supabase/migrations/20261031235800_nonjr_verified_operator_grouping.sql)

### 5. 一家公司的规则，不得用于该公司所有线路

新增内部 `published_nonjr_line_vehicle_rule_scope`，在原运营商名称匹配基础上，额外要求车型规则的 `network_key` 或 `plan_scope.lineIds` 明确包含对应线路。

例：横滨高速铁道虽然有一条 `Y000` 车型规则，但规则的 `network_key=kodomonokuni`，不是 `MinatoMirai`。因此：
- 横滨高速铁道运营商级规则：1；
- 港未来线实际适用线路规则：**0**；
- 港未来线 1,216 条计划仍是车型**待判定**，不能通过 Y000 的公司规则虚假补全。

NewShuttle、TsukubaExpress 和千叶单轨的线路级候选规则可在新视图找到，但**规则适用线路≠已确认某班车的车型**。

[车型规则线路适用性 SQL](../../supabase/migrations/20261031235900_nonjr_line_vehicle_rule_scope.sql)

### 6. 最终验收和剩余工作

- 线路审计 ID：**89**（77 条已收录来源＋12 条登记但无同名计划）；
- 非 JR 计划模板：**55,673**，其中**403** 有计划运用规则、**7,006** 仅有单车型候选、**48,264** 仍无法判定；
- 运行计划总模板：**92,586**、停站记录 **1,135,945**；
- `train_runs=0`，非 Weekday/SaturdayHoliday 日历分类 **0**，没有孤立 Canonical 计划；
- 新增内部视图 `security_invoker=true` 且未向 `anon` 授权，已检验读权限；
- 前端代码与数据库 SQL 已推送 `main`；未测试公网浏览器端到端时序，也未宣称已补完未知车型。

下一步需对7条未接入的线路先确认合法来源；对5条已配置外部接口的线路，实际核验 API 是否能提供准确的平日/土休日出版计划。车型方面则优先寻找**按列车计划运用号、来源版本**的具体车型关联规则，尤其京急、西武、京成、相铁、东京地铁；不能凭公司只有一个候选车型就冒充列车计划车型。

## 2026-11-28 私铁 P0：登记口径修复及京王来源分流

### P0-01（已修复）
生产迁移 [20261128073842_nonjr_canonical_registry_readiness_p0.sql](../../supabase/migrations/20261128073842_nonjr_canonical_registry_readiness_p0.sql) 修改原有两个审计视图，不建立平行表。登记以 canonical railway_lines 的 timetable_operator 优先、ODPT operator 兜底，保留官方身份复核优先级与源 operator。修复后 96 条非 JR 登记线路全部进入审计，13 条无同名计划、61,068 条计划模板；原来完全遗漏的 ChichibuMain、Enoshima、HojoRailway、KoizumiBranch、ShintetsuAo、UtsunomiyaLRT 均已纳入。四个审计视图均 security_invoker/security_barrier，anon/authenticated 无 SELECT，service_role 可读。未写入任何时刻或车型。

### P0-02（来源已定位，运行接入尚未完成）
已有 gtfs_stage TokyoGTFS 固定版本，Keio.Inokashira 630/548（平日/土休日）、Keio.Keio 873/802、Keio.Takao 219/222，共 3294 trips，均有非空 train_number。不得把隔离记录统计为正式运行计划。高尾线源有 2 条 Meidaimae 停站记录，必须核实直通或站点归属；京王本线部分 headsign 指向其他线路，需核对实际跨线边界，不能用本线最后站冒充全程终点。KeioKeibajo 现有 208 条（108/100）canonical plans 全为 undated_not_current_verified；不启用未经复核的 SQL fallback。官方站点/时刻表：https://www.keio.co.jp/train/station/ 。ODPT 官方 GTFS 另有 Challenge 2026 限定许可：https://ckan.odpt.org/dataset/?organization=keio&q=2026&res_format=GTFS%2FGTFS-JP 。不要与第三方 MIT 来源混用。
后续按原有 TokyoGTFS 校验流程执行：校验站序、番号、跨线目的地、日期例外及来源有效期；经官方来源校验后，复用现有服务端读取流程和日期白名单模式。当前 train-runs 的 GTFS 白名单为 Tobu 专用，不应把京王硬塞入东武命名空间或仅切换 fallback=true。未改 API 能力配置，未部署 Edge Function，未执行公网浏览器回归。

### P0-02 继续核验（2026-11-28）
- TokyoGTFS checksum 固定来源共 3294 trips、40526 stop_times；KeioMain 1675 / 23460，KeioInokashira 1178 / 14035，KeioTakao 441 / 3031。按 canonical SQL 站序（含明确拼写别名 HirayamajoshiKoen/Musashinodai/ShimoKitazawa）、方向、时刻格式/先后、停站序号核查，3292 班通过结构校验。高尾线 7501、7503 SaturdayHoliday 含跨线 Meidaimae，整班不进入白名单，不改变原始来源。
- 官方 https://www.keio.co.jp/train/station/ 与 https://transfer-train.navitime.biz/pdf/keio/timetable/20260816/1556.pdf ：井之头线吉祥寺往涩谷方向两日历班次数及首班时刻一致（平日296、土休日268，首班04:52）。仅为一站一方向抽验，PDF截图抓取失败，非逐班/全线官方核验；不能据此授权实际车型。
- 新增共用日期 RPC [tokyogtfs_active_trip_ids](../../supabase/migrations/20261128074912_tokyogtfs_shared_date_scope_keio_p0.sql)，[权限收敛](../../supabase/migrations/20261128074950_tokyogtfs_shared_date_scope_private_stage_privileges.sql) 保留既有私有 stage 访问边界，service_role 实际执行 548 条，anon/authenticated 无权限。旧 Tobu RPC 留作线上兼容；4条东武线路在平日、土曜、祝日、超期的16组 trip_id 差集均为0。
- [共用接入代码及测试](https://github.com/biubiu52011/pixel-tetsudo/commit/2617619105a206d120c87cf3fe705085cb832581) 已进入 main。2026-11-27/28/23 京王本线 873/802/802，井之头 630/548/548，高尾 219/220/220；超期2027-11-03三线均0。
- 生产 train-runs v386 与仓库 main 源文件不同，尚未合并两端差异；CI [46123093017](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/46123093017) 在 SendaiAirportTransit 无 rank、SendaiAirport 无 icon 等 canonical 检查提前失败，未完成新增测试。未覆盖线上函数，未导入正式京王模板，未开启 fallback。竞马场线仍待活动日及时刻版本核验。后续应先处理部署差异与 CI 阻塞，再接入校验通过的源计划；不将源候选标记为实际运行或已确认车型。

### P0-02 第三轮实际实施（2026-11-28）
- 生产 train-runs v386 与 main 的全部差异已逐段比对：Fukuchiyama/Shinkansen/SaikyoKawagoe/Kakogawa 日期过滤重构及共用 TokyoGTFS 日期 RPC。相应 CI 定向测试通过后部署 v387，随后 get_edge_function 确认 ACTIVE 且源码与 main 完全相同；未改变原有 JWT 配置。公网 HTTP 工具访问失败，未完成端到端浏览器验收。
- 仙台空港线已有四站 SQL 登记，修复 operator rank、历史审计快照漏登记和无独立图标的显式审查记录（e5684c3）；不虚构线路图标。同步铁路、站名数据缓存及生成页面清单（a396712、71aa589）；京王本线两个来源拼写别名 HirayamajoshiKoen/Musashinodai 在原有 STATION_ALIAS_BY_RAILWAY 内维护。
- 生产正式计划库迁移： [井之头线](../../supabase/migrations/20261128081022_keio_inokashira_tokyogtfs_source_only_p0.sql) 1178 模板/14035 停站；[京王本线及高尾线](../../supabase/migrations/20261128081310_keio_main_takao_tokyogtfs_source_only_p0.sql) 分别 1675/23460、439/3027。合计3292模板、40522停站；全部 source_only / undated_not_current_verified，未赋予实际车辆或已核实计划车型。跨线 headsign 使用已有来源/规范目的地 URN，原线路区间停站不被伪造延长，未合并直通列车。高尾线 7501、7503 留在隔离区。
- 正式模板与日期白名单关联复核：平日 873/630/219、土曜和祝日 802/548/220，超期三线0；来源 resolution 行数一致，vehicle_type 非空0。 [fallback 配置迁移](../../supabase/migrations/20261128081843_keio_three_date_gated_sql_plan_fallback_p0.sql) 已启用三线 SQL 降级资格，保留原 realtime/API 配置，竞马场线仍关闭（208条旧模板未核实活动日）。前端本来允许独立查询 SQL 计划；SQL flag 不等于实际网页渲染已验证。
- [CI 46125170535](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/46125170535)：京王/东武日期门槛、京王别名、铁路与站名生成物回归已通过；全局仍有东西线配车说明断言及无 fleet reference 的新 active route 审计阻塞，Pages deploy skipped。未放宽或关闭检查。所有 GitHub 修改直接 main，无 PR。

### P0-02 第四轮：发布阻塞与竞马场线日期保护（2026-11-29 JST）
- [车辆范围与东西线标签修复 2526754](https://github.com/biubiu52011/pixel-tetsudo/commit/2526754a0b437af7b4a2651ccb0d6dcbfc552ec7)：仙台空港铁道 SAT721系与 JR-East E721系500番台直通车辆分别按 owner 维护来源参考，禁止把车队参考当作实际车型或 PNG 授权。官方来源：https://www.senat.co.jp/question/qa03 、https://www.jreast.co.jp/train/local/e721.html 。东西线历史样本为0时保留原候选车型说明而非零计数覆盖；仍不改变未知车型灰点或猜测当日编组。[CI 46157866471](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/46157866471) 成功。
- 京王竞马场线原有208条计划（平日108/土休日100），operating_dates 非空0；主要来源为 atwiki pages/76、78，另有2条 Jorudan。休日A不能代替竞马開催休日B/C。京王官方2026-11-20公告明确11月30日平日增发：https://www.keio.co.jp/news/update/announce/announce2026/pdf/20261120_rinji.pdf 。08:00–17:59两方向各52条官方公告发车时刻，旧平日库各32条，仅各11条时间吻合、各21条旧时刻不在公告、各41条公告时刻不在旧库。公告PDF文本可读但截图抓取失败；第三方11月30日运用表 https://w.atwiki.jp/keio_unyo/pages/117.html 全页读取失败，不能据片段或官方发车时间推造全部列车番号、到达时刻、编组。
- [日期保护 f0def24](https://github.com/biubiu52011/pixel-tetsudo/commit/f0def24a4b088dc1e00bd3ef8cfff013b66d105c)：复用 filterDateScopedTemplates，仅允许 KeioKeibajo 明确包含目标 operating_dates 的计划进入当日推定；旧208条保留为历史来源，不删除、不启用 SQL fallback、不修改 realtime API 配置。新增正常日、11月30日特例及超期回归测试。[CI 46158249484](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/46158249484) verify/build/gallery/deploy 全部成功。生产 train-runs v388 ACTIVE，读取已部署源码确认与 main 一致。公网 HTTP/浏览器端到端验收仍未完成。
- P0-01、三条京王 GTFS SQL 接入及全站发布阻塞已处理；竞马场线当前有效时刻表/日期例外完整导入（含普通日与活动日）仍未完成，不能宣称四线全部可推定。未进入 P1，未创建 PR。

### P0-02 第五轮：竞马场线有效日期与临时运行计划（2026-11-29 JST）
- 以官方 11月30日增发公告 https://www.keio.co.jp/news/update/announce/announce2026/pdf/20261120_rinji.pdf 的 08:00–17:59 两方向各52条发车时刻，与 11月27日更新的日期专用运用资料 https://w.atwiki.jp/keio_unyo/pages/117.html 逐条交叉检查；104条发车均相符。第三方番号/到达时刻仍是 source-only，不是运营商逐班验证。PDF文本可读，截图访问失败。
- 该第三方资料将 6832 同时用于 15:56 东府中发与16:11府中竞马正门前发；两条均隔离，不从奇偶推造更正番号。[迁移 20261128161917](../../supabase/migrations/20261128161917_keio_keibajo_20261130_partial_source_plans_p0.sql) 实际入库102计划/204停站、对应 canonical members 102，operating_dates 仅 2026-11-30，未赋车型。
- 当前 https://tabinomemo.jp/train/timetable/keio/5 普通平日两方向各54条与原有108条 SQL 记录的番号、发车、到达三元组完全一致。旧来源不覆盖或删除；通过11月30日专用运用资料确认公告窗口外44条原记录，补至当日146条唯一番号、146条 canonical resolution。新增日期范围 [迁移 20261128162405](../../supabase/migrations/20261128162405_keio_keibajo_ordinary_weekday_and_special_day_edges_p0.sql)：依据现行普通平日时刻表及 JRA 东京赛马场本季结束11月30日 https://www.jra.go.jp/facilities/race/tokyo/ ，普通平日仅2026-12-01至12-25的19个工作日；这是有限的计划日历适用范围，不是逐日实车观测，不延至年末或未核实的周末。遇后续公告必须更新范围。
- 生产复核：11/29=0、11/30=146、12/1=108、12/5=0、12/25=108、12/28=0；所有准入记录的 canonical resolution 存在，vehicle_type 非空0。原208条模板完整保留，其中108条普通平日已补充有限 operating_dates，100条普通休日仍未准入。SQL fallback 线路全局标志仍为 false，原 realtime true，既有 v388 按明确日期准入计划。未改实际车型、PNG或实时位置逻辑。
- 仍缺普通休日及赛马日B/C完整日期关联、6832冲突的可靠更正；公网 train-runs HTTP 访问失败，日志查询未返回相关调用，不能宣称端到端验收通过。未改 Edge Function 或前端脚本，未进 P1。
