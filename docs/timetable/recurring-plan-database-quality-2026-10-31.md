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
- 车次名前缀单独关联：3107M／2117之前请看实际官方 3107M+2107M 併結，「かいじ」和「富士回遊」不是同一个列车编号；3123M、3132M＋2132M、44M＋2144M 亦应保留相应官方番号/方向。此次只更新车型映射，不修改名称/时刻/编组。

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
