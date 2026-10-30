# 在来线官方车型补齐 — 2026-10-30

范围：Supabase pnupwfmgbtxqhpzsrhfn，GitHub main。此为**计划车型证据**，不是实际运行车组或确定 PNG。没有 PR、没有自动 Pages 部署。

## 已写入并验证的官方关联

| 线路与服务 | 计划车型 | 已匹配规范时刻表 | 官方证据 |
| --- | --- | ---: | --- |
| 西武新宿线 Red Arrow 特急 | 西武 10000 系 | 105 | https://www.seiburailway.jp/cs/faq/reservedtrain/ |
| 西武拝岛线 拝岛 Liner | 西武 40000 系 | 15 | https://www.seiburailway.jp/cs/faq/reservedtrain/ |
| 西武新宿线 拝岛 Liner | 西武 40000 系 | 15 | https://www.seiburailway.jp/cs/faq/reservedtrain/ |
| 西武山口线 Leo Liner | 8500 系或 L00 系 | 162 | https://www.seiburailway.jp/railway/encyclopedia/8500/ 和 https://www.seiburailway.jp/railway/encyclopedia/L00/ |
| JR 九州 日丰本线 Sonic | 883 或 885 系 | 0（需要车次服务名） | https://www.jrkyushu.co.jp/trains/sp/sonic/ |
| JR 九州 鹿儿岛本线 Sonic | 883 或 885 系 | 0（需要车次服务名） | https://www.jrkyushu.co.jp/trains/sp/sonic/ |
| JR 西日本 山阳本线 Yakumo | 273 系 | 0（需要车次服务名） | https://www.jr-odekake.net/railroad/yakumo/ |
| JR 西日本 大阪环状线/JR梦咲线 | 323 系车型存在的来源证据 | 不作全线分配 | https://www.jr-odekake.net/railroad/service/train-woman.html |

合计 **297 条规范时刻表线路关联获得官方来源的计划车型候选**，并非 297 辆实际列车，也未验证时刻表当前适用性。

山口线过去 **162 条**时刻表中的“8500系（レオライナー、新型導入中）”原本是单一候选，但官方现已证实 L00 新车型。原始标签保留审计；车型解析视图将其降为 UNKNOWN，另给出 8500/L00 双候选，禁止自动选择其中一张 PNG。

前端 js/train-vehicle.js 删除错误的“40000系（Laview）”别名，并将 L00 泛型计划图片限定于山口线。JR 九州 883/885 与 JR 西日本 323 的官方模型名也已登记，但没有原生 PNG，不能从图库猜其他车型或涂装。

## 数据库迁移

- supabase/migrations/20261030121254_official_conventional_seibu_jrwest_jrkyushu_plan_fleet_20261030.sql
- supabase/migrations/20261030121401_quarantine_seibu_yamaguchi_8500_only_obsolete_candidate_20261030.sql
- supabase/migrations/20261030121430_audit_source_scoped_conventional_timetable_fleet_plans_20261030.sql

私有审计视图 rail_audit.official_conventional_timetable_plans 返回 297 条 PLAN，已查询确认实际编组/确定 PNG 0 条；anon 和 authenticated 均没有直接查询权限。

代码自动测试：tools/train-conventional-source-mapping.test.cjs，GitHub Actions Verify train PNG contracts，检查官方来源、线路作用域、旧错误别名、双候选无图片、缺失原生图片不伪造。

## 尚未完成

JR 西日本、JR 九州**在来线**目前没有进入 train_runs 的当天运行记录，且大量人工时刻表没有可独立验证的服务名与有效版本。Sonic 883/885 等是官方车辆候选而不是每班实车。大阪环状线有 323 系也不能证明所有普通车都使用它。需要官方逐服务车次／日历／实际车号的进一步来源，才可以生成确定 PNG 并进行实时显示。不能只按整条线路或候选图片代判车型。
