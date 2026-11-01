# 运营计划数据库质量与读取安全改进（2026-10-31）

本记录覆盖项目 `biubiu52011/pixel-tetsudo` 的所有运营商和线路。**Supabase 保存的列车时刻计划只有 Weekday / SaturdayHoliday 两套出版式计划**；`service_date` 只在 API 请求时决定使用哪套计划，不持久化实际每日车次或真实车辆编组。已有的历史车辆观测等其他业务表不在本次变更范围内。

## 1. 规范化 354 个时间字段，增加数据库约束

发现旧模板存在 158 个到站和 196 个发车时刻写为 `6:14`、`7:58` 等一位数小时；这些不应导致字典序比较或接口数据错位。

- **实际修复**：仅将一位小时补前导零，全部规范为 `HH:MM`；分钟和时刻语义、车次、运行日、站点顺序均未改变。
- 新增通过全库验证的 `manual_timetable_stop_clock_hhmm` CHECK 约束，阻止新写入非规范格式。
- 允许 `24:00` 等跨午夜/次日表示，**不把历史记录改为某日实际车次**。
- [SQL 迁移](../../supabase/migrations/20261031232000_normalize_recurring_train_clock_hhmm.sql)。

## 2. 所有运营商共用动态数据库质量视图

新建两个仅供内部维护／服务角色读取、`security_invoker=true` 的视图（无公开匿名授权）：

- `public.published_timetable_plan_quality_summary`：逐线路、逐运行日统计来源模板数量、停站数量、可用于展示的两个不同时刻站、不能展示的模板、来源修订日期缺失、抽样来源、可疑时间倒退等；
- `public.published_timetable_chronology_issues`：逐来源列出非正常跨午夜的相邻站时间倒退（原始行程保留，不擅自补造）。

视图随来源变动重新计算，省去手动更新固定计数；对全部 **210 条线路 × 2 套运行日 = 420 组**已通过统计完整性测试。

[SQL 迁移](../../supabase/migrations/20261031233500_recurring_plan_quality_audit_views.sql)。

### 校验快照
| 检验 | 结果 |
|---|---:|
| 原始计划模板 | 92,586 |
| 原始停站记录 | 1,135,945 |
| 可展示的两不同有效时刻站来源 | 91,858 |
| 不满足两站有效时刻来源 | 728 |
| 非午夜异常来源 | 39 条 |
| 非午夜相邻站时间倒退事件 | 40 处 |
| 疑似跨午夜的同站到发时间倒退 | 110 处 |
| 非规范到发字段 | 0 |
| 按具体日期的 `train_runs` | 0 |
| 非 Weekday / SaturdayHoliday 模板 | 0 |
| 缺少 Canonical 成员的模板 | 0 |

**注意**：110 处 `arrival_clock > departure_clock` 全部符合深夜跨凌晨模式，但是否真实正确仍需要来源版本核对。此前一次中间汇报将这项残余数量误报为 46，**以全库核验后的 110 为准**。

### 涉及非午夜相邻站倒退的线路
- 东北本线 `TohokuMain`：平日 21 条来源出现 22 处事件，休日 17 条来源出现 17 处；
- 山田线 `Yamada`：土休日 1 条来源出现 1 处；
- 合计 39 条来源、40 处事件。典型风险：11:35 的上一站后，同一计划下一站变成 06:02。无需猜测就可知道该顺序不能直接用于移动列车位置推算。

原始站时间未删除或校正，只把异常标为 `SOURCE_NON_MIDNIGHT_STOP_CLOCK_REVERSAL_NEEDS_VERIFICATION`；[审计修改](../../supabase/migrations/20261031234500_annotate_remaining_clock_reversal_source_audits.sql)。

## 3. Edge Function v273 保留有效计划、隔离异常

`supabase/functions/train-runs/index.ts` 更新为 v273：针对 `source_only` 来源，按原始站序检测正常时间倒退与午夜跨日时刻；非午夜倒退的源计划在关联运用/计划车型之前隔离，不再用于列车位置推算。无可验证数据时绝不“自动顺延时间”或创造新站点。

- 新增响应 `suppressed_non_midnight_clock_reversal_runs`；
- 原有 `suppressed_station_only_source_fragments` 与 `omitted_incomplete_runs` 均保留，后者包含隔离的时序错误行程；
- 前端 `data/api/odpt-unified.js` 保存 `suppressedClockReversalRuns` 和 `auditCoverageStatus` 用于后续诊断；
- v273 处于 ACTIVE，且与 GitHub `main` 内容一致。此轮**未做外部 HTTP 端到端测试**，不能以代码部署成功替代浏览器实际测试。

## 4. 两个时刻表关联表的外键索引

按数据库性能顾问的提示，为 `published_timetable_exact_duplicates(canonical_template_id)`（现有约 930 条）和 `published_timetable_through_service_gaps(existing_template_id)`（现有约 5 条）补建 BTREE 索引，便于数据关联检查和源记录维护，不增加定时任务或付费服务。

[索引 SQL](../../supabase/migrations/20261031235500_timetable_reconciliation_fk_indexes.sql)。

## 5. 后续工作重点

1. **东北本线**：核对 38 条跨站时序倒退来源是否拼错站序、车次或同一源混入不同区间；无证据不调整时刻。
2. **山田线**：复核休日 1 条行程、站序和来源日期。
3. **大阪环状线、大阪东线**：仍有 203 / 94 条单站来源，隔离不等于补齐完整行程；取得有复用许可、含明确版本的时刻资料后逐班补录。
4. **旧模板来源有效性**：大量 `source_revision_date` 缺失。数据库中“有平日/土休日两套”不代表2026版真实、完整。
5. **访问控制**：Supabase Advisor 的 `rls_enabled_no_policy` INFO 仍覆盖多张既有表。某些内部表故意不向访客开放，不能因为该提示就批量新增匿名 SELECT 策略；需逐表核实真实访问需求。

用以下 SQL 可随时查询动态总览：

```sql
SELECT line_key, operating_pattern, source_templates,
       renderable_source_templates,
       insufficient_timed_station_templates,
       suspect_clock_order_templates,
       revision_unverified_templates
FROM public.published_timetable_plan_quality_summary
ORDER BY insufficient_timed_station_templates DESC, line_key;
```

以上 SQL 需要数据库管理或服务角色权限，不能以 `anon` 调用本次内部审计视图。


## 6. 2026-11-01 车型确认和旧来源文件同步提醒

2026-11-01 在 Supabase 核验的计划车型，不包含实际车组或实际运行日。

### 山形线历史来源路径（不能直接按旧路径重新导入）

Supabase 中保留的 source_path=data/timetables/Yamagata-manual.js 是历史来源元数据。GitHub main 主分支实际 data/timetables 目录未包含 Yamagata-manual.js，现存 Oedo-manual.js 和 vehicle-operation-evidence-data.js。不能自行重新创建该大文件当作经过核实的原始时刻表。

Supabase 中已将25条来源误标为普通701系5500番台的「つばさ」新庄→福岛计划纠正为 JR-East.Shinkansen / E8系，车型对应映射 source_id=4915，mapping_level=official_service_vehicle_plan。官方证据：https://www.jreast.co.jp/train/shinkan/e8.html 和 https://timetables.jreast.co.jp/2611/train/050/051843.html 。今后来源重新导入时不得凭历史字段覆盖这25条纠正；需先核对列车番号、日历、线路、来源版本。其余山形线普通列车不受此项车型确证约束。

### 中央本线计划车型新增3条

2026-11 官方逐车次资料将大月→高尾车次与中央快速直通关联，计划车型 E233系0番台。映射等级 published_number_family_plan（不是当日实车编组）。

| 车次和日历 | 大月发—高尾到 | 高尾后列车番号 | Supabase source_id |
|---|---|---|---|
| 722M / Weekday | 06:26—07:02 | 722T（通勤特快） | 4917 |
| 724M / SaturdayHoliday | 06:26—07:02 | 724T（中央特快） | 4918 |
| 1324M / SaturdayHoliday | 12:23—13:01 | 1324T（中央特快） | 4916 |

官方页面：
- https://timetables.jreast.co.jp/2611/train/125/125291.html
- https://timetables.jreast.co.jp/en/2611/train/105/109611.html
- https://timetables.jreast.co.jp/en/2611/train/120/124691.html
- https://www.jreast.co.jp/train/local/e233.html

2026-11-01 核验：车型映射累计21,522条；该批中央本线剩余37条尚需逐车次确证。统计为当时快照，不代表全库完成。


## 7. 2026-11-01 中央本线大月→高尾 E233系0番台剩余37条全部确认

继上节722M、724M、1324M的3条逐车次确认后，使用JR East 2026年11月官方中央本线上行时刻表，核实其余37个canonical计划与高尾后中央快速车次直通关系，全部新增source-backed计划车型 E233系0番台。**证据等级是“官方直通车次＋官方运营车型”，不是逐车次实际车组实测**。

- 平日：19条；官方 https://timetables.jreast.co.jp/2611/timetable-v/223u1.html ，Supabase evidence source_id=4920。具体 M→T/H：1164→1164T、1280→1280T、1314→1314H、1474→1474T、1522→1522H、1628→1628H、1692→1692T、1868→1868T、1932→1932T、2008→2008H、2024→2024T、2152→2152T、2222→2222H、2292→2292T、640→640T、648→648T、726→726H、744→744T、818→818H。M车次均加后缀M。
- 土休日：18条；官方 https://timetables.jreast.co.jp/2611/timetable-v/223u2.html ，Supabase evidence source_id=4919。具体 M→T/H：1118→1118H、1302→1302H、1472→1472T、1556→1556T、1626→1626H、1648→1648T、1818→1818H、1928→1928T、2026→2026H、2052→2052T、2166→2166T、2218→2218H、2290→2290T、640→640T、648→648T、726→726H、760→760T、818→818H。
- JR East官方车型介绍（中央线快速E233系0代）https://media.jreast.co.jp/articles/3342 。
- 写入表 public.train_timetable_vehicle_mappings：vehicle_type=E233系0番台、mapping_level=published_number_family_plan、actual_vehicle_confirmed=false；保留原始source_path 2610车次明细页，另以2026-11官方综合时刻表作为source_id证据。不存实际编组或具体日期车次。
- SQL复核：本次37条全部写入；2026-11-01快照全库映射21,559条且timetable_id无重复。原本“大月→高尾E233系0番台40条待映射”的批次在此前3条和本次37条完成后，剩余0条。**仅代表这40条候选完成计划车型证据配对，不代表中央本线所有车次或所有线路完成确认**。


## 8. 2026-11-01 车型候选升级：E353系与HB-E300系

此节记录计划列车车型证据升级，不新增每日期实际车次，不证明实车编组，不把“可用车辆”当作每一班车的编组记录。

### 官方名称、车次和车型交叉核对：10条E353系候选升级

依据JR East 2026年11月公布的特急详细时刻与车型官方页（https://www.jreast.co.jp/train/express/azusa_kaiji.html），以下原先 mapping_level=source_single_type_candidate、source_id为空的十条映射已改为 official_service_vehicle_plan，车型统一为 E353系：

- あずさ1号：1M；ChuoMain 2条（Weekday、SaturdayHoliday）。来源 source_id=4921；https://timetables.jreast.co.jp/2611/train/005/008041.html。
- あずさ3号：5003M；ChuoMain、ChuoSobuLocal 各2条，共4条。来源 source_id=4922；https://timetables.jreast.co.jp/2611/train/050/054811.html。与富士回游2103M并行／併結的情况不得误称为同一列车编号。
- あずさ38号：38M；ChuoMain、Oito 各2条，共4条。来源 source_id=4923；https://timetables.jreast.co.jp/2611/train/110/111551.html。

注意：1M的2026-11官方平日与休日到达时刻版本存在差异，数据库这两条来源的旧到达钟并未在本车型任务中复核或调整。车型来源的核实**不自动证明**旧时刻数据为最新版。特别是临时特急不能只凭“あずさ”名字一律推断车型，应以当次计划公布的车辆型号为准。

### 大糸线「リゾートビューふるさと」：4条HB-E300系候选升级

- 8361D 松本11:43→南小谷13:40：Weekday、SaturdayHoliday 两条；source_id=4924；JR East https://timetables.jreast.co.jp/2611/train/025/029481.html。
- 8362D 南小谷14:29→松本16:02：两条；source_id=4925；JR East https://timetables.jreast.co.jp/2611/train/045/047332.html。
- JR East长野支社 https://www.jreast.co.jp/press/2025/nagano/20260312_na01.pdf 官方车辆资料指出 リゾートビューふるさと 使用的同型车为 HB-E300系。
- 上述四条原为 source_single_type_candidate，现以 official_service_vehicle_plan、vehicle_type=HB-E300系 表示车型；但这是季节性开行的列车，**出现Weekday、SaturdayHoliday两个来源模板不代表每个平日及休日都开行**。

### 不要误删已核实的四条HB-E300

历史 evidence_sources.id=4828 的警告涉及大糸线3220M、5356M当年被错贴“リゾートビューふるさと”车型的**另外四条旧模板**。2026-11-01复查，这两种车次各两套日历的现有记录 vehicle_type_label 与车型映射都为NULL；不再误标。它不是针对8361D、8362D这四条真正的「リゾートビューふるさと」车次，**禁止根据4828的旧备注删除后者的正确车型映射**。2026-11官方大糸线上行时刻：https://timetables.jreast.co.jp/2611/timetable-v/230u1.html 。

### 剩余未解决

- 山形线新庄→山形的26条来源被贴701系5500番台，但官方逐车次时刻不等于车型证据，不得直接升级。
- ChuoMain中8091M经2026-11官方列车时刻（https://timetables.jreast.co.jp/2611/train/090/094611.html）确认车名是「信州1号」，现有候选标签“E353系（あずさ・かいじ）”的服务注释不准确；需按发布期车辆资料独立核实该条再改。
- 2026-11-01 SQL复核：全库仍有21,559条vehicle mappings，14条属于从候选升级到已核实型号，**没有新增14个已覆盖列车**；source_single_type_candidate剩余4,251条，升级数据源为4921～4925。以上不代表全库车型全量通过。


## 9. 2026-11-01 E353系常规特急计划车型：90条候选升级

这一批属于计划车型（published planned fleet/model）确证；不等于每日真实列车运行或实际车辆编组。不新增 canonical 列车，也不修补旧来源时刻。

### 常规「あずさ／かいじ／富士回遊」88条

利用 JR East 2026-11 官方中央本线平日/土休日的列车番号-列车名对应表，配合官方 https://www.jreast.co.jp/train/express/azusa_kaiji.html 中 E353系车型资料，将既有映射中限定的来源候选（source_single_type_candidate）升级为 official_service_vehicle_plan、vehicle_type=E353系：

- 下行：46条，Weekday 23条、SaturdayHoliday 23条；22种不同车次番号在两个日历各1条，另「あずさ5号」5M跨大糸线原始来源段各1条。原 2611 对照：平日 https://timetables.jreast.co.jp/2611/timetable-v/223d1.html ，休日 https://timetables.jreast.co.jp/2611/timetable-v/223d2.html ，官方来源 source_id=4927/4926。
- 下行被逐组核实的 22 个番号：5M、9M、13M、17M、21M、25M、29M、33M、37M、5004M、5008M、5012M、5016M、3107M、3111M、3115M、3119M、3123M、2103M、2107M、2111M、2115M。
- 上行：42条，Weekday 21条、SaturdayHoliday 21条。官方来源：平日 https://timetables.jreast.co.jp/2611/timetable-v/223u1.html ，休日 https://timetables.jreast.co.jp/2611/timetable-v/223u2.html ，source_id=4929/4928。
- 上行被核实的21个番号：18M、22M、26M、30M、34M、42M、44M、46M、54M、60M、3120M、3124M、3128M、3132M、3136M、3140M、3148M、2132M、2136M、2144M、2148M。
- 车次名前缀单独关联：3107M＋2107M 的官方併結，「かいじ」和「富士回遊」不是同一个列车编号；3123M、3132M＋2132M、44M＋2144M 亦应保留相应官方番号/方向。此次只更新车型映射，不修改名称/时刻/编组。

以上仅是**明确在官方2026-11常规特急列表中的已存在车次**。不得将80xx、90xx等季节/增发列车根据阿拉伯数字后缀或线路通用车型批量强制E353：部分「富士回遊93号」在JR East 2026年春季官方增发资料中列为E257系；每个发布期须单独查具体车型。

### 特急「信州」8091M／8092M：2条

JR East 2026-11官方网站列车详细时刻确认:
- 8091M → 特急「信州1号」：https://timetables.jreast.co.jp/2611/train/090/094611.html 。
- 8092M → 特急「信州2号」：https://timetables.jreast.co.jp/2611/train/095/099331.html 。
- 2026年JR East夏季临时列车车辆公告 第10页 https://www.jreast.co.jp/railway/extratrain/2026/summer_list.pdf 明列「信州1/2/3号」E353系。

两条既有 Weekday 候选已设置 vehicle_type=E353系、mapping_level=official_service_vehicle_plan、source_id=4930，并把两个来源模板原先误加的「E353系（あずさ・かいじ）」服务标签纠正为「E353系（信州）」。**不代表每日平日开行**；数据库两条旧来源片段只是塩尻单站，不能当成完整行程、也不能以此为时刻表覆盖合格证据。

### 入库验收和未完成边界

- 2026-11-01 验证：total train_timetable_vehicle_mappings = 21,559；unique timetable_id = 21,559（无重复）；本批升级 source_id=4926-4930 合计90；剩余 source_single_type_candidate 4,161。
- 这90条是原本有映射的候选转为官方服务车型，故**已映射车次覆盖总数不变**。本批全部 actual_vehicle_confirmed=false（保留实际编组未知）。
- 山形线新庄→山形26条旧701系5500番台来源，及其他临时列车与混用车型，仍需逐次核查，不得冒充整库确认完成。


## 10. 2026-11-01 按官方专用服务确认车型：581条候选升级

**定位：** 对已有的单一车型候选实施车型型号归一化与官方服务-车辆对应的证据升级，保留全部原始列车（服务）编号、运行日历、停站、时刻，不涉及实际编组或实际运行日期。数据库中仅 Weekday/SaturdayHoliday 两种计划；不能据此推断每天真的开行。原始 source_path 中若指向已不在 GitHub main 的 *-manual.js，只是数据库历史来源元数据，不可将本记录误当现存原始JS来源。

### 三类新干线：169条

| 线路/服务 | 修正前错误的车型字段 | 正确计划车型 | 数量 | 证据ID |
|---|---|---|---:|---:|
| AkitaShinkansen「こまち」 | こまち | E6系 | 44 | 4931 |
| TohokuShinkansen「こまち」 | こまち | E6系 | 14 | 4931 |
| YamagataShinkansen「つばさ」 | つばさ | E8系 | 45 | 4933 |
| TohokuShinkansen「つばさ」 | つばさ | E8系 | 21 | 4933 |
| NishiKyushuShinkansen「かもめ」 | かもめ | N700S系 | 45 | 4932 |

- E8系：JR East 2026年改正明确「つばさ」统一使用E8 https://media.jreast.co.jp/articles/5625 ，车辆官方介绍 https://www.jreast.co.jp/train/shinkan/e8.html 。该确认是对命名为Tsubasa/つばさ的服务，不可把“东北新干线其他列车”都变为E8。
- E6系：JR East 2026秋田新干线资料明确「こまち」全车使用E6 https://event.jreast.co.jp/pages/akita_shinkansen_699 ，车辆介绍 https://www.jreast.co.jp/train/shinkan/e6.html 。
- N700S系：JR九州西九州新干线「かもめ」车型 https://www.jrkyushu.co.jp/railway/ticket/rule/tokudai_baggage/ 与2026-2027官方服务介绍 https://www.jrkyushu.co.jp/english/train/shinkansen_kamome.html 。
- 原历史列车编号如 Komachi27、Tsubasa121、こまち1、かもめ102号 **仍原样保留**；它们是来源模板中的“列车名＋号数”，不能说已经核实为铁路公司的数字运用番号。只修正车型字段，绝不把列车名称填入车型字段。

### 成田特快与Skyliner：412条

| 线路/服务 | 归一化型号 | 数量 | 证据ID |
|---|---|---:|---:|
| Narita 成田エクスプレス | E259系 | 108 | 4934 |
| NaritaAirportBranch 成田エクスプレス | E259系 | 108 | 4934 |
| SobuMain 成田エクスプレス | E259系 | 108 | 4934 |
| NaritaSkyAccess スカイライナー | AE形 | 88 | 4935 |

- JR East https://www.jreast.co.jp/train/express/nex.html 明确「成田エクスプレス」使用E259系。候选源符合JR-East.LimitedExpress及机场方向线路分段，旧编号2001M-2054M；来源编号未逐条以2026-11官方逐列车表独立核实。
- 京成 https://www.keisei.co.jp/keisei/tetudou/accessj/sharyou.htm 明确第三代スカイライナー使用AE形；本批候选为Keisei.Skyliner类型、AE格式源号，不能声称源号全部是官方2026版运用代码。

### 实施与证据边界

- 数据库更新 public.train_timetable_vehicle_mappings 的 vehicle_type、mapping_level=official_service_vehicle_plan、source_id=4931～4935；actual_vehicle_confirmed=false，**不是**“官方每班车逐车实测”。
- 同步修正581个 manual_timetable_templates.vehicle_type_label（服务名误写为车型的169条，车型名称规范化的412条）。未改 primary_train_number、calendar_urn、stop clocks、运行日期、车辆编组。
- source grade=B：车型的运营商官方证明可信，但内部模板的具体车次编号、源修订日期和精确行程并未全量核实。
- 2026-11-01 写后核验：581条源证据ID均有对应行且车次映射与模板车型一致；全库车型映射21,559条，distinct timetable_id仍为21,559；单一车型候选数 4,161→**3,580**。没有凭线路候选批量推定真实每日车组。
- 最早遗留的“山形线新庄→山形”26条车型争议依然待单独核对，不能从上述「つばさ」的E8车型推广到普通列车。


## 11. 2026-11-01 常规特急车型确认172条及2026年「しおさい」明确更正

本次仅处理**已存在**的 `source_single_type_candidate` 车型映射，按照2026-11 JR东日本官方车次、官方使用车辆资料和2026-03/2024-03改正公告升级计划车型。来源表仍只含 Weekday/SaturdayHoliday 计划；不保存实际每日运行、真实编组或车辆运用。原始时刻、停站和车次编号不修改。

| 范围 | 车型 | 升级映射数 | evidence_sources.id | 备注 |
|---|---|---:|---:|---|
| JobanMain 常磐线「ひたち／ときわ」常规偶数号2–30及52–86 | E657系 | 66 | 4936 | 33个不同番号×2日历 |
| Shinetsu 「しらゆき」51M–58M | E653系 | 16 | 4937 | 8号数×2日历 |
| Uetsu 「いなほ」1M–14M | E653系 | 28 | 4938 | 14号数×2日历 |
| Agatsuma+Joetsu「草津・四万」3001M–3004M常规段 | E257系5500番台 | 16 | 4939 | 两个区段×4号数×2日历；并非16条独立列车实车 |
| Sotobo「わかしお」1051M–1071M来源 | E257系500番台 | 37 | 4940 | 平日21、土休日16，排除临时特别车型 |
| Uchibo「さざなみ」1001M–1007M来源 | E257系500番台 | 7 | 4941 | 仅平日7条 |
| SobuMain「しおさい4号」4004M（Weekday） | **E259系** | 1 | 4942 | **纠正原错误E257标签** |
| SobuMain「しおさい6号」4006M（Weekday） | E257系500番台 | 1 | 4943 | 逐车次核实 |
| **合计** | | **172** | | |

官方证据：
- JR East [E657「ひたち／ときわ」](https://www.jreast.co.jp/train/express/hitachi_tokiwa.html)；[常磐线2026年11月平日上行](https://timetables.jreast.co.jp/2611/timetable-v/240u1p.html)、[休日上行](https://timetables.jreast.co.jp/2611/timetable-v/240u2p.html)；[2M](https://timetables.jreast.co.jp/2611/train/045/048471.html)、[86M](https://timetables.jreast.co.jp/2611/train/050/050381.html)。
- JR East [E653「いなほ／しらゆき」](https://www.jreast.co.jp/train/express/inaho_shirayuki.html)；2026-11 [いなほ1号 1M](https://timetables.jreast.co.jp/2611/train/060/064091.html)、[14号14M](https://timetables.jreast.co.jp/2611/train/060/064191.html)、[しらゆき1号51M](https://timetables.jreast.co.jp/2611/train/060/064031.html)、[8号58M](https://timetables.jreast.co.jp/2611/train/075/076201.html)。
- JR East [E257系5500番台「草津・四万」](https://www.jreast.co.jp/multi/traininformation/kusatsu_shima/)；2026-11 [3001M](https://timetables.jreast.co.jp/2611/train/045/047081.html)、[3004M](https://timetables.jreast.co.jp/2611/train/045/047111.html)。
- JR East [E257「わかしお／さざなみ」](https://www.jreast.co.jp/multi/traininformation/sazanami_wakashio/index.html)；[2024-03千叶支社改正公告PDF第2页](https://www.jreast.co.jp/press/2023/chiba/20231215_c01.pdf)明确常规两列车服务改用E257系5辆；2026-11 [わかしお1号1051M](https://timetables.jreast.co.jp/2611/train/045/049461.html)、[さざなみ1号1001M](https://timetables.jreast.co.jp/2611/train/045/049721.html)。一些**临时**「新宿わかしお」使用255系，不适用常规一律E257的简化规则。
- **特别重要**：JR East [2026-03千叶支社改正公告PDF第2页](https://www.jreast.co.jp/press/2025/chiba/20251212_c01.pdf)明列平日 **しおさい4号改E259系6辆、しおさい6号改E257系5辆**；2026-11官方 [4004M](https://timetables.jreast.co.jp/2611/train/035/038311.html)、[4006M](https://timetables.jreast.co.jp/2611/train/095/098921.html)对应车次、区间、出发时间，已相应纠正数据库来源模板和映射。不得根据「しおさい」线路统一设E257或E259；其他号数仍需各自车型证明。

**保留未核实边界**：Uetsu 8005M、8010M、8052M、8055M、8086M、9011M、9083M共7个临时来源；Agatsuma/Joetsu 4031M、4034M各2条来源；SobuMain 其他20条 E257（しおさい）候选均不在本次升级范围。编号后缀、相同服务名和来源单类型标签不能证明季节列车实际车型。此前山形线26条普通列车也仍待逐车次核对。

技术记录：曾尝试为上述`4004M/4006M`设置`mapping_level=dated_schedule_rule`，数据库约束要求随该等级提供车辆规则ID，写入被原子拒绝；随后使用含官方A档证据的`official_service_vehicle_plan`完成两条更新，无遗留部分事务。其余170条以官方服务计划级别存储，全部`actual_vehicle_confirmed=false`。

写后 SQL 验证（2026-11-01快照）：证据 source_id=4936～4943 正好172条，映射总量21,559、distinct timetable_id也是21,559（无重复），`source_single_type_candidate`从3,580降至**3,408**。全部172条`train_timetable_vehicle_mappings.vehicle_type`与`manual_timetable_templates.vehicle_type_label`一致。这个更新并不增加映射覆盖的 canonical 列车数。


## 12. 2026-11-01 确认50条既有车型候选：しおさい纠错、地铁MSE、E261、285及东武500

本批依据经营者官方车型资料和明确的列车服务归属，将 **50 条既有 `source_single_type_candidate` 映射**升级为 `official_service_vehicle_plan`。车型映射覆盖总数没有变化；只更新计划车型型号、对应证据及原始来源模板的 `vehicle_type_label`。没有修改列车到发时间、日历、实际车辆编组或运营日期。

| 对象及原始条件 | 正式计划车型 | 数量 | Supabase evidence id |
|---|---|---:|---:|
| SobuMain 常规「しおさい」4001M–4014M剩余候选，排除已单独修复的4004M、4006M及4011M | E259系 | 19 | 4944 |
| SobuMain 平日「しおさい11号」4011M | E257系500番台 | 1 | 4945 |
| Chiyoda 直通特急（非普通电车） | 小田急60000形 MSE | 18 | 4946 |
| TokaidoMain 寝台特急「サンライズ出雲」5031M／5032M | 285系 | 4 | 4947 |
| TokaidoMain「サフィール踊り子」3001M／3002M | E261系 | 4 | 4948 |
| Sano「リバティりょうもう」1612／1643 | 东武500系 | 4 | 4949 |

### 逐服务官方车型证据

- **しおさい按班次区分E259/E257**：JR东日本 JRE Media 更新于2026-03-18的[官方「しおさい」介绍](https://media.jreast.co.jp/articles/2432)直接写明 **E257系用于しおさい6・11号**，其余常规列车采用 E259系；[2026-03-14改正对4、6号车辆置换的报道](https://news.mynavi.jp/article/20251213-3807169/)以及 [2026常规时刻表](https://shinkansenkenkyu.com/time-shiosai/)用于交叉核对，原来的4004M⇒E259和4006M⇒E257在上一轮已正确修复、此次没有再次改写。现有SobuMain整批22条来源车型全部去掉旧统一E257候选错误，保留编号、时刻、日历。原先剩余20条中的19条变E259、4011M变E257。
- **小田急60000形MSE**：[东京Metro官方千代田线特急Romancecar页面](https://www.tokyometro.jp/romancecar/index.html)明确显示使用MSE（60000形）。仅匹配18条`odpt.TrainType:TokyoMetro.LimitedExpress`并原已标签为60000 MSE的模板，**不能**将地铁千代田线普通车或其他直通车辆也设为MSE；源编号如A1711E并未逐个与运营者最新运用番号独立比对。
- **285系**：[JR东海官方285系列车说明](https://railway.jr-central.co.jp/train/express/detail_02_05/index.html)指明寝台特急「サンライズ出雲／瀬戸」使用285系。TokaidoMain原始来源只含东京—热海段，不替代出云/濑户全程逐站核验。
- **E261系**：[JR东日本官方「サフィール踊り子」车辆说明](https://www.jreast.co.jp/saphir/cars/)唯一标明E261系，追加该车东海道本线来源段4条；此前伊东线同服务4条已确认，各来源段单独记录。
- **东武500系**：[东武铁道官方「リバティ」](https://www.tobu.co.jp/railway/special_express/vehicle/revaty/)明确「リバティりょうもう」使用500系。Sano 1612／1643各Weekday、SaturdayHoliday两种计划共4条，只确认服务车型，不宣称源车次编号已全面与[东武2026-03-14官方时刻表](https://www.tobu.co.jp/pdf/timetable/2026/time-table_02_nobori.pdf?202603=)逐号核实。

### 核验及限制

- source_id=4944～4949共**50条**；升级后 `vehicle_type` 均等于 `manual_timetable_templates.vehicle_type_label`。
- 2026-11-01 写入后复查：车型映射全库 **21,559**、`count(distinct timetable_id)=21,559`（无重复）；本批50条全为 `actual_vehicle_confirmed=false`。剩余 `source_single_type_candidate` 从**3,408降到3,358**。
- 还有69,695条canonical计划列车没有车型映射，尤其混用通勤车与无官方逐车次车型依据的来源；不要将“已存在映射”当作“已达到同一强度的官方计划车型确认”。山形线新庄—山形26条旧701系标签继续留在待核实状态。
- `source_path='data/timetables/*-manual.js'` 为历史来源元数据，可能不是 GitHub 当前存在的文件；以后重新导入时需对照这份审计和 Supabase 最新模板，不能恢复错误的全线E257标签。


## 13. 2026-11-01 计划车型继续核实：61条（常规及季节性特急）

本节只针对列车**出版式运营计划车型**（车型系列），没有录入真实每天运行日期、实车编组、实时运行结果，也没有更改到发时刻。 `mapping_level=official_service_vehicle_plan` 表示已由官方列车服务与车辆资料对应到型号，**并非每班列车实测编组**。

| 范围 | 计划车型 | 升级记录 | 证据ID |
|---|---|---:|---:|
| 上越线＋吾妻线「草津・四万31/34号」，4031M与4034M来源分段（休日） | E257系5500番台 | 4 | 4950 |
| 中央本线常规「あずさ／かいじ」22个列车番号，Weekday＋SaturdayHoliday两套（22×2） | E353系 | 44 | 4953/4952 |
| 其中「​​あずさ50号」5050M的千叶方向 ChuoSobuLocal 另两个来源分段 | E353系 | 2 | 4953/4952 |
| 羽越线季节性「いなほ」8005M、8010M、8052M、8055M、8086M、9083M（SaturdayHoliday来源模板） | E653系 | 6 | 4951 |
| 中央本线季节性「あずさ」8074M、8075M、8077M、8079M、8083M（仅SaturdayHoliday） | E353系 | 5 | 4954 |
| **合计** | | **61** | |

### 官方型号与对应车次

- 「草津・四万」4031M/4034M：JR East官方2026-11 [31号](https://timetables.jreast.co.jp/2611/train/095/098841.html)、[34号](https://timetables.jreast.co.jp/2611/train/095/098851.html)匹配数据库高崎→渋川→長野原草津口 / 反向来源段；[JR East官方车辆](https://www.jreast.co.jp/multi/traininformation/kusatsu_shima/)明确使用 E257系5500番台。
- 常规「あずさ／かいじ」：JR East 2026-11 官方[中央本线平日下行](https://timetables.jreast.co.jp/2611/timetable-v/223d1p.html)、[平日上行](https://timetables.jreast.co.jp/2611/timetable-v/223u1p.html)、[休日下行](https://timetables.jreast.co.jp/2611/timetable-v/223d2p.html)、[休日上行](https://timetables.jreast.co.jp/2611/timetable-v/223u2p.html)，及[JR East E353官方车型页](https://www.jreast.co.jp/train/express/azusa_kaiji.html)。该批22个列车番号：3127M、3131M、3152M、3156M、3158M、5041M、5045M、5049M、5050M、5053M、5055M、5102M、5106M、5110M、5114M、5135M、5139M、5143M、5147M、5151M、5157M、5159M；另5050M「​​あずさ50号」延长至千叶，跨ChuoSobuLocal来源有额外2条，不要混淆“分段记录数量”与“独立列车车次数量”。
- 季节性「あずさ」：JR East 2026-11 [8074M](https://timetables.jreast.co.jp/2611/train/060/064271.html)、[8075M](https://timetables.jreast.co.jp/2611/train/060/064261.html)、[8077M](https://timetables.jreast.co.jp/2611/train/070/071581.html)、[8079M](https://timetables.jreast.co.jp/2611/train/070/071591.html)、[8083M](https://timetables.jreast.co.jp/2611/train/075/076761.html) 的具体名称与番号匹配，再参照上述官方 E353 型号。**没有升级 8083M 的 Weekday旧来源记录**：官方发布的对应运转时段是周末及节假日，旧Weekday来源存在日历模板不匹配风险。
- 季节性「いなほ」：JR East [2026-05-15新潟支社临时列车车型公告第2页](https://www.jreast.co.jp/press/2026/niigata/20260515_ni01.pdf)将いなほ5/10秋田延长与增发いなほ52/55/83/86列为 **E653系**（4辆或7辆取决于公布列车与季节）；[JR East E653官方说明](https://www.jreast.co.jp/train/express/inaho_shirayuki.html)。JR East 2026-11时刻表核实 [8005M](https://timetables.jreast.co.jp/2611/train/075/076172.html)、[8010M](https://timetables.jreast.co.jp/2611/train/075/076182.html)、[8052M](https://timetables.jreast.co.jp/2611/train/110/112631.html)、[8055M](https://timetables.jreast.co.jp/2611/train/110/112621.html)、[9083M](https://timetables.jreast.co.jp/2611/train/125/128421.html)，及2026-09 [8086M](https://timetables.jreast.co.jp/2610/train/090/090791.html)。**确认只到E653车型系列，不确认实际车厢数或各季节完全相同的编组**。其中9083M 2026年冬的时刻已与夏季版有差异，旧来源到发时刻并未因此获认证。
- 特别谨慎：羽越线来源 `9011M` 被旧模板标为E653いなほ候选，但2026-11 JR East其他时刻表存在 `9011M=サンライズ出雲91号` https://timetables.jreast.co.jp/2611/train/045/047321.html ，而羽越线此来源自象潟至秋田、到时19:55，与当期普通「いなほ11号」运营区间不符。**暂不提升、不得拿相同号码跨线路强行赋予285系**。需追溯旧模板版本/实际线路图与列车名称；这里只做风险标记。

### 写后复核

2026-11-01 已核验 source_id=4950～4954对应61条映射；来源`manual_timetable_templates.vehicle_type_label` 与`train_timetable_vehicle_mappings.vehicle_type` 全部一致，`actual_vehicle_confirmed=false`。总映射依旧21,559、`COUNT(DISTINCT timetable_id)=21,559`，单一车型候选从3,358降至 **3,297**。另外69,695条还没有任何车型映射。**日期与编组均不是本次任务目标**。


## 14. 2026-11-01 常磐线—快速线贯通列车：按 canonical 列车身份恢复车型

### 故障成因

不是列车跨越取手站时换了一辆车，也不是数据库缺少跨线停站。数据库 `train_timetable_continuity` 已有 JobanMain→Joban **188条**，Joban→JobanMain **187条**，全部在 `train_timetable_members.timetable_id` 层正确合并，合计 **375个独立canonical贯通列车**。这些列车的 `train_timetable_stops` 无缺失站UR​N且满足至少两站、两条计时点要求。

真正的问题是旧的车型回填逻辑只通过 `train_timetables.lead_source_template_id` 读取首段线路车型标签，而没有读取同一 `timetable_id` 下的其他 `train_timetable_members.source_template_id`。JobanMain→Joban 的188条首段有车型标签；Joban→JobanMain 的187条首段 Joban（快速线）为空，尽管后续同一辆车的 JobanMain 段车型标签不为空。这造成用户跨越快速区段时看到确定车型突然消失。注意：两条线路历史模板的 `physical_service_key` 都为NULL，**不能单独据此说 canonical 列车ID未统一**；实际已统一，唯一身份是 `timetable_id`。

### 已执行的数据库修复

- 以 `train_timetable_continuity` 的双向链接、同日历、同车次、`train_timetable_members` 共同canonical ID、`group_evidence=verified_continuation` 和恰好2个来源段为条件，向**既存 canonical 列车**补全缺失的187条 `train_timetable_vehicle_mappings`，没有新建列车。
- 121条使用后续 JobanMain 段的单一 `E531系` 来源标签，级别 **`source_single_type_candidate`**（车型候选，不宣称每班车官方确定）。
- 66条常磐线特急 `ひたち／ときわ` 根据官方服务型号 `E657系`（`evidence_sources.id=4936`）写入 **`official_service_vehicle_plan`**；来源段为 JobanMain，但 mapping 挂到**同一 canonical timetable_id**，包含快速线区间。
- 两日历 `Weekday`／`SaturdayHoliday` 继续只是出版式计划，没有记录每日实车、编组或实际运营日期。
- 修复后全库车型映射21,746、唯一 `timetable_id` 数也是21,746；常磐跨区段375个canonical train**均有模型候选或官方计划车型**，并不代表每个都是官方逐车次实车确认。

### Edge Function 已部署：train-runs v274

对应 GitHub `supabase/functions/train-runs/index.ts` 的提交 `921259b79b841dc10c3d7e925c8a7df2be4d3143`：
- `train_timetable_source_resolution` 与 `canonical_timetable_id` 本来就按 canonical 列车返回；现在 `scheduleVehicleType` 可将有 `source_id`、`source_url` 支撑的 `official_service_vehicle_plan`、`published_number_family_plan` 作为**计划车型**显示，同时保留来源版本匹配检查；不再仅识别日期规则而掩盖全部已核实的出版式计划型号。
- 若所选快速线模板无车型字段，仍从该canonical映射的 `vehicle_type` 回填 `vehicle_type_candidates`，保持候选等级，不能冒充官方确认。
- `vehicle_evidence_source=database-published-service-plan` 区分官方计划与日期实车；`vehicle_artwork_path` 不会因为计划证据而强行指定具体车辆编组/涂装。
- 已通过 Supabase `get_edge_function` 再次核查：部署版本 **274 ACTIVE**，文件内容与GitHub完全一致。运行环境无法联网解析公网域名，**尚不能声称实际HTTP请求和移动端视觉已完整验收**。

### 持续性监控与防止回退

新建 `published_train_continuation_vehicle_coverage` （security_invoker视图；数据库迁移 + GitHub），按 **同一个canonical train** 聚合全部线路来源和车身型号，有候选冲突/未映射时发出明确状态，不能按某一线路的默认车型强行确认。

复核SQL：

```sql
SELECT vehicle_coverage_status, mapping_level, canonical_vehicle_model, COUNT(*)
FROM public.published_train_continuation_vehicle_coverage
WHERE line_keys @> ARRAY['Joban', 'JobanMain']::text[]
GROUP BY 1,2,3 ORDER BY 1,2,3;
```

期待这375条没有 `missing_canonical_vehicle_mapping` 或 `conflicting_member_vehicle_labels`，并且整个计划的车型候选与官方模型不能混为同一证据等级。未来源计划重新导入应按照 `train_timetable_members` 为每一个canonical列车聚合，不能重新用 `lead_source_template_id` 限定车型；历史 `*-manual.js` 文件路径只是来源元数据。
