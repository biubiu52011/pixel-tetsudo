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
