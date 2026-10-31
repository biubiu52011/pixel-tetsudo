# 在来线出版物计划：源记录完整性修复与剩余缺口（2026-10-31）

## 项目边界
Supabase 存储 **Weekday（平日）**、**SaturdayHoliday（土休日）**的列车运营计划，不采集每日车次的实际运行记录，不采集实际车辆编组。不把未证实的平日车次机械复制为土休日。

## 本轮实质修复
### 鹤见线大川支线（TsurumiOkawa）
- 原来平日18班、休日6班；其中9班平日、3班休日**返程**在安善站的时间为空，每条仅有大川出发时刻，因 Edge API 要求两个有时刻的站点而被过滤。
- 根据 JR 东日本 2026-11 的列车公开时刻，将12班返程的**安善站发车时刻**补齐，保留 arrival_clock=NULL，不伪造到达分钟。
- 现在平日18/18、土休日6/6都满足两个有时刻站点要求；没有新增列车、实际编组或每日记录。
- 官方时刻表：
  - https://timetables.jreast.co.jp/2611/timetable-v/661u1.html
  - https://timetables.jreast.co.jp/2611/timetable-v/661u2.html
  - https://timetables.jreast.co.jp/2611/train/065/066021.html
- 数据修复: [SQL](../../supabase/migrations/20261031203500_okawa_12_inbound_official_anzen_times.sql)

### 千代田线支线（ChiyodaBranch）
- 238条支线原始模板均共享与千代田本线同一个 Canonical Train，**不是要删除的伪造列车**。
- 支线实际计划由本线投影补充：往北绫濑平日125/休日113；反方向通过本线两站投影平日124/休日111，合计平日249/休日224。服务端投影应只保留绫濑、北绫濑站点。
- 审计由 direction_issue 改为 calendar_review；尚未完成 2026 改正版本全面核查。
- [审计修正 SQL](../../supabase/migrations/20261031205000_conventional_line_coverage_audit_scopes.sql)

### 全线路服务端来源覆盖判定
- `supabase/functions/train-runs/index.ts` 已部署 **v271**。
- `complete` 不再仅凭列车每站都有时刻就标记真；额外读取 `published_timetable_coverage_audit`。仅审计为 `verified` 或 `complete` 且数据结构无缺漏、非抽样时才允许声称覆盖完整。
- 未核验时已有列车仍返回，但 `partial=true`，附 `audit_coverage_status`、`audit_issues` 和 `source_coverage`。
- 当前210条线路的审计尚无可直接升级的 verified/complete，因此客户端会看到更多“部分/待核验”；这是**覆盖真实性**的调整，不是删除原有时刻表。
- [Edge API 源码](../../supabase/functions/train-runs/index.ts)

## 全网质量扫描
扫描200条在来线、91,760条模板发现 **15条线路共728条**原始计划不满足服务端要求：
- **536条**只有1个停站；
- **192条**有两个及以上停站，但不足2站有有效时刻；
- 平日355条、土休日373条。
- 这728条都为 source_only，没有已核验的 continuation 可用于补全，因此读取接口不能把它们当做完整列车。
- 对15条线路的 `published_timetable_coverage_audit.issues` 加了 `SOURCE_TRAIN_HAS_FEWER_THAN_TWO_TIMED_STOPS`、`UNRENDERABLE_SOURCE_TEMPLATES_REQUIRE_OFFICIAL_TIMES_NOT_INTERPOLATION`。不自动删除或补编时刻。

| 在来线 | 受影响 |
|---|---:|
| OsakaLoop | 203 |
| Narita | 94 |
| OsakaHigashi | 94 |
| SobuMain | 94 |
| ChuoMain | 85 |
| OuMain | 75 |
| Fukuchiyama | 26 |
| ChuoTatsuno | 16 |
| Suigun | 14 |
| TohokuMain | 12 |
| Chiyoda | 5 |
| ChuoSobuLocal | 4 |
| Shinonoi | 4 |
| Hanwa | 1 |
| TokyuSetagaya | 1 |
| **总计** | **728** |

[源站点缺失标记 SQL](../../supabase/migrations/20261031211000_flag_728_unrenderable_conventional_source_trains.sql)

## 需从官方许可来源补齐的数据
1. **Narita / SobuMain**：各94条只有区间、车次、缺两站有效时刻，应该先做车次时刻与区间来源核验。
2. **OsakaLoop / OsakaHigashi / ChuoMain / OuMain**：大量仅有一站，需要整条列车计划而非凭其他车次推算站点。
3. **Kawagoe**：只收录5条抽样车次，JR 东日本官方出版时刻表列出的实际列车更多。旧来源受 JR 东日本公开数据重用许可限制，不能直接复制整份网站时刻表。
4. **SanyoMain / SaninMain**：旧人工资料仅覆盖特定区间或零散车次；需明确运营区间、出版社改正版本及两类运行计划。
5. **ChiyodaBranch**：审计已修正，但原始来源修订日期尚未逐车次验证。

## 最终查询验证
- 全库 published 计划 92,586，计划停站 1,135,945；
- 旧 `train_runs` 按日记录 0、非法日历分类 0；
- 大川支线可读取列车 24 / 24；
- 15条线路已标记时间结构缺漏；
- 当前维护 2 套出版物式计划，不追踪实际列车车辆编组。

---

## 续查：通勤列车与特急资料分流（2026-10-31）

针对原 728 条“不足两个有效站点时刻”的记录，补查列车种别及跨线相同时刻来源。此前的 728 并不都是通勤车次需要补时刻，现已通过数据库视图 `published_conventional_plan_quality` 区分：

| 分类 | 记录数 | 后续处理 |
|---|---:|---|
| 特急类未计时来源片段 | 215 | 不算入通勤电车计划缺口；单独核对列车真实停站 |
| 通勤车单站来源片段 | 513 | 仍不能用于列车定位，需核对真实区间和是否为边界来源 |
| 通勤车多站但有效时间不足 | 0 | 无该类缺口 |
| **合计** | **728** | 不得由平日复制休日或插值猜测时间 |

**成田线 94 + 总武本线 94 条**以前被列为优先补时间；现查明全为 `JR-East.LimitedExpress`。其中列车编号 `2001M`、`2003M` 等为成田特快 N’EX 的车次，且相应来源在佐仓、成田等未停站区间没有公开停车分钟。不能把“没有在该站营业停靠”写成“通勤电车漏了一班”。
官方参考：[JR 东日本 N'EX 平日](https://timetables.jreast.co.jp/2611/timetable-v/023d1.html)；[土休日](https://timetables.jreast.co.jp/2611/timetable-v/023d2.html)。

另有 `ChuoMain` 23 条、`ChuoSobuLocal` 4 条特急来源片段。成田线、总武本线、中央·总武缓行线经本次通勤车结构检查，**通勤类缺时刻为 0**；但这不代表整线已通过官方计划核验。

### 513 条通勤单站来源片段的再分类

借助 `published_conventional_boundary_candidates` 按“相同运营商、车次编号、平日/休日类型、方向、站点、分钟”与另一条已有 **2 个以上有效时刻站点**的来源匹配，找出 **153 条可能的跨线路交界资料**：

| 单站所在来源 | 候选数 | 对应完整行程来源 |
|---|---:|---|
| 奥羽本线（OuMain） | 75 | 山形线、田泽湖线 |
| 中央本线（ChuoMain） | 62 | 辰野支线、篠之井线 |
| 中央线辰野支线（ChuoTatsuno） | 16 | 篠之井线 |
| **合计** | **153** | 同号同站同分钟，**但尚未审定为同一 Canonical Train** |

剩下 **360 条**尚无这样的严格跨线匹配；重点是大阪环状线 203、大阪东线 94、福知山线 26 等。注意：单站资料也可能只是边界车次标记，不能无条件认定缺了整班列车。

对应视图及审计修正：
- [通勤/特急来源分类与跨线候选视图](../../supabase/migrations/20261031220000_conventional_commuter_vs_limited_express_source_integrity.sql)
- [修正特急专属及跨线候选提示](../../supabase/migrations/20261031221000_clarify_commuter_vs_express_coverage_audit.sql)

### 后续可供逐班核对的官方发布资料

- [JR 西日本大阪环状线区间时刻表](https://timetable.jr-odekake.net/line-timetable/2278) — 官方提供车次编号与站点时刻；出版物《西日本時刻表》对大阪环状线只刊首末班，因此不能依赖该纸质出版物补全年内环所有普通车。
- [JR 西日本大阪东线放出站时刻表](https://timetable.jr-odekake.net/station-timetable/2895073002?date=20260620) — 用于核对列车实际出发时刻，但单独站时刻不足以确定完整车次与沿途时刻。
- [交通新闻社《西日本時刻表》出版范围](https://www.kotsu.co.jp/products/jikoku/west/) — 明确近郊分平日、土休日，但大阪环状线只列始发末班。

**关键规则不变**：网站和数据库按平日/土休日两种出版物运行计划工作，不保存每日运行记录或实际车辆编组。网页按两个有效站点的条件渲染完整列车；匹配候选不表示已经确定同车直通，不复制时刻填空。
