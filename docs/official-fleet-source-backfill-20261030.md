# 官方铁路网站车型与运行车次证据补库（2026-10-30）

> 工作分支：GitHub `main`；Supabase 项目：`pnupwfmgbtxqhpzsrhfn`。
> 没有 PR，没有自动发布 Pages。严禁将计划车型/官方服务名推断为“已经确认实际编组”。

## 已从外部官网确认的证据

| 运营方 | 官方网页 | 可证明的事实 | SQL 处理 |
| --- | --- | --- | --- |
| JR 九州 | https://www.jrkyushu.co.jp/train/kids/guardian/train_equipment/ | 西九州新干线为 N700S 六辆编组；九州新干线同时有 N700 八辆和 800 六辆列车 | 在 `NishiKyushuShinkansen` 注册 N700S 单一**计划车型系列**；无原生 PNG，仍保留中性标记 |
| JR 九州 | https://www.jrkyushu.co.jp/railway/ticket/rule/tokudai_baggage/ | 九州新干线 N700 可用于「みずほ」「さくら」「つばめ」，800 可用于「さくら」「つばめ」 | 把原来 `さくら/みずほ` N700 的过窄规则拆为 `みずほ` 及 `さくら/つばめ` 多候选规则，避免单图误配 |
| JR 九州（官方列车时刻表） | https://www.jrkyushu-timetable.jp/sp/2611/0019/00193701.html?d=20261029&t=1122701 | 2026-10-29 `2101G` =「かもめ101号」，车型 N700S 六辆 | 只作为带日期的运行编号→服务名称证明；不把 10月29日证据扩散至其他日期 |
| JR 九州（临时服务） | https://www.jrkyushu-timetable.jp/sp/2611/0030/00309501.html?d=20261030&t=2853300l | 2026-10-30 `6096G` =「かもめ96号」，显示 N700S；只在所公布日期运行 | 保留官方来源；未向现有 `train_runs` 批量补出未经核实的其他临时列车 |
| JR 西日本 / JR 东海 | https://smart-ex.jp/en/beginner/equipment/n700/ | 东海道/山阳新干线的 16 辆「のぞみ」「ひかり」「こだま」有 N700/N700A/N700S 多种车型 | 扩充原本过窄的 `SanyoShinkansen`/ `TokaidoShinkansen` 计划候选，不再把整线指定为单一 N700 PNG |
| 西武 | https://www.seiburailway.jp/railway/encyclopedia/001/ 及 https://www.seiburailway.jp/railway/encyclopedia/40000/ | Laview 为 001 系，S-TRAIN 采用 40000 系；非同一种车辆 | 原数据库已拥有官方来源规则；此前已将 119 条错误 `40000系（Laview）` 候选隔离，未将未知车次强行改判为 001 系 |

## 本次真实入库范围

`public.train_runs` 现有记录的 `source_id` 本就指向官方 `evidence_sources.notes`：内含 `trainNumber`、`trainName`、`lineId`、`operatingDates`、来源网址。这层信息以前没有用于规范车次关联。

新建的 **`rail_audit.official_train_run_service_crosswalk`** 只在来源运行号、线路、运行日期都一致时取得已发布的服务名，再核对规范时刻表的原名。共 **7,742 条**带日期的运行记录可唯一找到同名规范时刻表（JR 西日本 2,304、JR 九州 720、JR 东海 2,096、JR 东日本 2,222、JR 北海道 400）。全部为**时刻表版本未验证候选**，绝不回填 `canonical_timetable_id`。

新建的 **`rail_audit.official_train_run_planned_fleet`** 用官方服务名、线路、运营方、车型规则生效日期、单/多候选集合形成**22,586 条**来源可追溯的计划车队关联（其中部分运营方计划规则为本轮以前已经存在；不能声称 22,586 条均为新采集数据）：

| 运营线路 | 官方车次关联中已有安全计划车队范围的记录 | 处理 |
| --- | ---: | --- |
| JR 西日本 山阳新干线 | 4,636 | 全部为多车型候选；其他 32 条缺少安全对应规则 |
| JR 九州 九州新干线 | 1,427 | `さくら`、`つばめ` 等只保留 N700/800 候选集合；383 条未命中相应日期计划 |
| JR 九州 西九州新干线 | 771 | N700S 单一计划**车型系列**，无编组、无专用 PNG；110 条早于新规则有效起始日 |
| JR 东海 东海道新干线 | 7,067 | 由单一 N700 改为 N700/N700A/N700S 多候选，停止车型代判 |
| 其他（JR 东日本/北海道） | 纳入同一审计视图 | 沿用库内已签发计划规则，不擅自升级为已确认实车 |

查询确认：`actual_vehicle_confirmed=true` 或 `exact_png_path IS NOT NULL` 的新增计划结果 **0 条**。两种新审计视图都在私有 `rail_audit` schema，已撤销 `anon` 和 `authenticated` 的直接权限。前端目前尚未直接读取这些私有视图；**SQL 补库完成不等于网站已自动展示这些结果**。

## 已应用并同步到 GitHub main 的迁移

- `20261030114512_crosswalk_official_train_run_numbers_to_service_names_20261030.sql`
- `20261030114616_official_nishi_kyushu_n700s_scoped_planned_fleet_20261030.sql`
- `20261030115225_jr_kyushu_mixed_n700_800_service_plan_without_guess_20261030.sql`
- `20261030115316_official_sanyo_multiple_n700_variants_prevent_png_guess_20261030.sql`
- `20261030115351_join_official_service_runs_to_scoped_planned_vehicle_families_20261030.sql`
- `20261030115444_official_tokaido_n700_n700a_n700s_planned_candidates_20261030.sql`

前端 `js/train-vehicle.js` 注册了仅限西九州新干线的 N700S 类型名，但没有捏造、借用或注册 PNG。Node 回归文件 `tools/train-official-source-crosswalk.test.cjs` 及 `tools/train-official-fleet-plan.test.cjs` 已纳入主分支专属 GitHub Actions。最近成功验证： https://github.com/biubiu52011/pixel-tetsudo/actions/runs/41051679521

## 后续缺口与允许推进的边界

- **西武、东武等私铁**：有 SQL 规范时刻表与计划车队，缺少覆盖当前服务日的可核对 `train_runs` 以及各车次/编组来源，不能按整条线路选默认 PNG。
- **JR 西日本/九州**：官方来源 `train_runs` 的车次号与服务名现在通过来源证据可对应，但其原先的人工规范时刻表仍标记 `undated_not_current_verified`；在版本认证之前，只能输出独立的计划候选，不能批量填入真实 `canonical_timetable_id`。
- **原生 PNG**：图库没有西九州 N700S 专用素材，也没有正式授权可复用的图。保留中性车标，待图源合法入库并通过车型/系列审查。
- **前端接入**：新成果暂留私有 SQL 审计视图，未更改公共 API 授权、没有自动发布网站。未来应通过安全后端只读接口选择性获取已核验的 `planned` 模型数据，继续隔离 `EXACT` 实车身份。
