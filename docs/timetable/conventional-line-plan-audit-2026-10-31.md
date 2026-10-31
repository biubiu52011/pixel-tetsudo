# 在来线平日／土休日运营计划审计与修复（2026-10-31）

## 项目唯一数据目标

Supabase 中的列车运营计划只按 `odpt.Calendar:Weekday` 与 `odpt.Calendar:SaturdayHoliday` 保存；不生成按具体日期的实际运行车次，也不以实际车辆编组编号为车型计划的必要证据。计划运行号／计划车型要与列车时刻表分开验证。

## 在来线覆盖现状

- 共 **200 条非新干线线路**，已同时保存平日／土休日两套计划；
- `Weekday` **48,392 条**，`SaturdayHoliday` **43,368 条**，合计 **91,760 条来源模板**；
- 拥有两套不代表对照过官方最新版：平日仅 4,095、土休日仅 3,760 条来源模板带来源修订日期；
- 原审计中 153 条 `unverified`，45 条 `sparse_review`，`Kawagoe` 为 sampled，`ChiyodaBranch` 为 direction_issue。核对后的 `TsurumiOkawa` 调整为 `calendar_review`，不再因为真实少班次而误报缺漏。

### 大川支线已核对

JR East 2026 年 11 月公开时刻：土休日大川方向 `705 / 705B / 1709B`，反方向 `704 / 804 / 1808`。与 SQL 中已存在的六班车、分支站发到时刻一致，不应强行扩充至平日 18 班。原行程模板保留两站分支段，主体区间已由 JR 鶴見線拥有，不能当作缺失中间站来批量复制。

来源：
- [大川站土休日出发](https://timetables.jreast.co.jp/2611/timetable/tt0311/0311011.html)
- [705 大川行](https://timetables.jreast.co.jp/2611/train/015/015671.html)
- [705B 大川行](https://timetables.jreast.co.jp/2611/train/065/066521.html)
- [1709B 大川行](https://timetables.jreast.co.jp/2611/train/065/065601.html)
- [704 鶴見行](https://timetables.jreast.co.jp/2611/train/015/015641.html)
- [804 鶴見行](https://timetables.jreast.co.jp/2611/train/065/066181.html)
- [1808 鶴見行](https://timetables.jreast.co.jp/2611/train/065/066021.html)

尚待核对平日来源版本，所以 `calendar_review` 而非“全部完成”。

### Canonical Train 去重

新增 `public.published_timetable_plan_unique_counts` 供所有运营商统计；按已有 `train_timetable_members.timetable_id` 去重，**不**按车次名称、时刻或相邻站推定同车。

| 运营模式 | 来源模板 | Canonical 列车 | 重复来源段 |
|---|---:|---:|---:|
| Weekday | 49,056 | 48,356 | 700 |
| SaturdayHoliday | 43,530 | 42,809 | 721 |
| 合计 | 92,586 | 91,165 | 1,421 |

这些数字包括新干线。1,421 是已有 Canonical 映射的重复来源片段，不应删除，因为跨线查询依然需要各自来源。

迁移：[20261031194000_conventional_canonical_unique_counts_and_okawa_audit.sql](../../supabase/migrations/20261031194000_conventional_canonical_unique_counts_and_okawa_audit.sql)。

### 千代田线支线双向读取修复

旧 `ChiyodaBranch` 数据有 238 个 **北綾瀬方向** alias 来源：平日125、土休日113。逐条核对全部与主线 `Chiyoda` 的同编号、同日历 Canonical 共享，所有 Ayase/KitaAyase 时刻均存在。

主线 `Chiyoda` 则已有从北綾瀬方向起、往綾瀬／代々木上原方面的计划：平日124、土休日111，两个支线站点均有来源时刻。无需再次复制到数据库。

Edge Function `train-runs` **v270**：
- 对 `lineId='ChiyodaBranch'` 的独立两日历请求，在已存在北綾瀬方向 alias 基础上读取主线反向计划；所有计划仍属于同一 Canonical；
- 在构造前端运行计划时，仅投影 `Ayase` / `KitaAyase` 两个站点，其他本线列车不报告为“支线计划缺失”；
- 预期支线计划：平日 **249 班**，土休日 **224 班**；全部已在 SQL 层核对原始车次、两个时刻和 Canonical 唯一性；
- **不**新建新车次、不写入实际编组编号。年度版本未证实与 2026-03-14 改正完全一致，仍保持校验待办。

代码：[supabase/functions/train-runs/index.ts](../../supabase/functions/train-runs/index.ts)。

JR／私铁出版物型数据与官方改正日期可能不同，不能把“存在计划”视作现行时刻验证。东京地铁 2026-03-14 对千代田线平日及土休日列车作过时刻调整：https://www.tokyometro.jp/news/2025/222471.html 。必须以更新版分时刻表复核。

## 下一优先级

- **川越线**：3 条平日、2 条土休日仅为可审计抽样（`Kawagoe`），严禁当完整计划；JR 东日本来源有授权限制，需可再利用的正式来源才能整批补齐。
- **山阴本线**：平日37、土休日16；**山阳本线**：平日40、土休日18。跨多区间线路须先建立覆盖区段清单，不能用全线模板条数直接认定实际少班次原因。
- **肥萨／地方少班次**：`Kitto`、`Kitakami`、`MiyazakiAirport` 等先识别到底是少班次、部分区段、历史来源，之后再核对官方发行时刻表。
- **都营／私铁／地铁**：核对时刻表来源日期、双向运行和计划运用车型规则；继续只存 Weekday/SaturdayHoliday，不引入每日实际车辆编组。

## 验证状态

- SQL 匿名读到 `published_timetable_plan_unique_counts`，91,165 Canonical 总数可复算；
- `train-runs` v270 已部署 ACTIVE，代码已同步 GitHub；源数据库预计包含 249/224 支线双向可用计划，需用户浏览器中进一步完成端到端显示验证；
- 保留 `Kawagoe` sampled / `ChiyodaBranch` 方向来源不足状态，不伪称全在来线现行完整覆盖。
