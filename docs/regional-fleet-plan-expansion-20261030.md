# 在来线列车计划继续补齐：关西普通/快速与九州区间车队（2026-10-30）

项目：Supabase `pnupwfmgbtxqhpzsrhfn`；GitHub `biubiu52011/pixel-tetsudo`。
本轮只补充有出处的 **车型系列可能范围**，不是确认当天每个车次的车型、编组、车身外观或实际运行。不创建 PR，不触发 Pages 发布。

## 官网核查并部署的计划证据

| 来源 | 限定范围 | 新增车型证据 | 时刻表关联 |
|---|---|---|---:|
| [JR 西日本：大阪环状线 323 全编组投入](https://www.westjr.co.jp/press/article/2019/05/page_14241.html) 与 [2024 年官方无障碍整备资料](https://www.westjr.co.jp/press/article/items/240314_00_press_dansa.pdf) | `OsakaLoop` 仅 `Local`，不包含关空快速、大和路快速 | 323 系 **非排他性参考**，不是每班必定 323 | **726** |
| [JR 西日本：223 / 225 投入资料](https://www.westjr.co.jp/press/article/2020/02/page_15645.html) | `TokaidoKansai` 仅 `Rapid`；实际官网主要涉及 JR 京都线、神户线 | 223 + 225 系 **部分车队参考** | **24** |
| [JR 九州 2025-11-27 官方公告](https://www.jrkyushu.co.jp/news/__icsFiles/afieldfile/2025/11/27/20251127_Autonomous_driving_section_expansion_press.pdf) | 鹿儿岛本线 **门司港—荒尾** | 813 / 817 系；这仅证明目标区间的车辆存在，不证明全线、每班或自动驾驶状态 | 仅区间资料 |
| 同一 JR 九州官方公告 | 日丰本线 **小仓—宇佐** | 813 / 817 系，区间范围证据 | 仅区间资料 |
| [JR 九州 2021 筑肥线公告](https://www.jrkyushu.co.jp/common/inc/news/newtopics/__icsFiles/afieldfile/2021/03/11/210311ipadwokatsuyou.pdf) | 筑肥线／唐津线 **姪滨—西唐津** | 303 / 305 系。历史资料只证实部分列车使用，不能证明 2026 具体车次 | 仅区间资料 |
| [JR 九州 2026-10-14 公告](https://www.jrkyushu.co.jp/news/__icsFiles/afieldfile/2026/10/14/20261014_karatsu_kunchi_chikuhisen_103kei_headmark.pdf) | 筑肥线 **筑前前原—唐津**；唐津线延至西唐津 | 103 系（2026 年 10 月活动资料）。不能根据该公告直接推断每班列车或各编组的车头徽标 | 仅区间资料 |

本轮数据库迁移 `supabase/migrations/20261030125204_scoped_conventional_local_fleet_and_corridor_evidence_20261030.sql` 实际部署并提交 `main`。

## 具体 SQL 成果和差异

`rail_audit.official_conventional_timetable_plans` 合计 **1,094** 条：
- 前几轮有运营商及列车种别来源、但时刻表版本仍未验证的计划关联：**344** 条；
- 本轮新增大阪环状线普通 726 条、关西东海道快速 24 条：**750** 条，统一标为 `PARTIAL_FLEET_REFERENCE_UNDATED`。

新建 `rail_audit.official_conventional_corridor_fleet_inventory`：独立保存 **4 条**区间车型来源，记录 fromStation/toStation、车型候选和来源 URL。**不与具体时刻表 join**，因为当前库不具备官方证明全部列车都使用该车型的准确区间、车次或当日车组证据。即使区间存在也不能把它扩散成整条 `KagoshimaMain/Nippo/Chikuhi` 的列车实车身份。

`anon`、`authenticated` 对两个审计视图都没有直接读取权限。数据库检验：实际车辆确认 **0**、具体 PNG **0**；`public.train_runs` 不被修改。

## 前端与原生图片

`js/train-vehicle.js` 对由 Supabase 读取且无车型来源的记录，如果严格匹配 **JR-West + OsakaLoop + Local**，则在 `vehicleResult.vehiclePlan` 中附加 `FLEET_REFERENCE`（323 系）；如果严格匹配 **JR-West + TokaidoKansai + Rapid**，则返回 223 / 225 系参考候选。二者 **`identityStatus=UNKNOWN`、`iconPath=''`、`representativeModel=''`**。

图库里虽然有 `JR西日本_323系_M.png`、`JR西日本_323系_OR.png` 以及 223 特定车辆与 225 原生图片，但**不能根据系列名称任意借用某一个涂装或把多候选挑成单一 PNG**。这一点由回归测试检查。

已纳入 `.github/workflows/verify-train-png.yml` 的 `tools/train-regional-fleet-scope.test.cjs` 同时验证 SQL 范围、来源、隔离区间、运行时 UNKNOWN、无图片和越界负例。

## 尚未完成的部分

本轮重点补“列车计划的证据”；没有增加任何 2026-10-30 的 `JR-West` / `JR-Kyushu` 在来线 `train_runs` 数据。全部旧人工规范时刻表仍需日期版本认证。九州区间车队还需要具体服务号、起讫站与运行日期相匹配，才有资格把局部区间证据用于具体车次；即使这样仍需要当天车辆实际记录才能判定 `EXACT`。

当前方案优先防止错误图，保留可追踪来源与“部分车队”“区间资料”“某班车型”之间的边界。
