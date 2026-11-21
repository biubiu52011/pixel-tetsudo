# PNG-first 番号区间实施记录（2026-11-17）

> Notion 项目入口、现行 42 批、旧编号历史和离线同步口径见
> [PNG 番号号段项目结构与离线索引](png-number-band-project-structure-20261122.md)。

## 本次落地
- 基于 Notion「全图库 PNG 番号号段映射｜操作手册（仅保存号段）」执行；暂不改变车型调查规则、时刻表或实际编组身份。
- 通用 `data/timetables/train-number-png-ranges.js` 的 `rows` 解析从 **首个命中立即返回** 改为 **收集所有生效规则 → 按规范化 PNG 路径去重 → 仅一张返回**。
- 多个区间命中同一张 PNG 仍成功；命中不同 PNG 返回 `null`，开发日志对每个线路/番号冲突记录一次（最多 100 个不同冲突），不以文件顺序、号段长度或来源优先级裁决。
- 新增无顺序优先级、重叠/重复、边界和跨线路隔离回归测试，保留各线路现存日历、车型候选、运营方、方向、PNG 资产约束。
- 专用线路的独立早返回分支、Supabase SQL 正式映射以及最终多来源汇合目前**未完全完成全链统一**；不得将这次修改误报为整个 601 张图库已全部匹配。

## 后续边界
1. 调整 `published_train_png_number_ranges` 以兼容无来源/无车型声明的纯号段；既有 SQL 精确名册/日期服务规则不能被宽号段取代。
2. 统一特殊线路独立匹配器与多来源最终返回点的冲突处理；在其完成前，不得允许不同来源的互斥 PNG 靠优先级覆盖。
3. 先 JR，再地铁、第三部门铁道、私铁、其他。没有可用区间的 PNG 保持无号段。
4. 复用 `tools/build-train-number-png-catalog.cjs` 和现有 Actions 审计；不创建第三套映射真值表。

## 2026-11-17 continued: multi-source overlaps
- Universal last-mile selector `TrainVehicle.chooseUniqueNumberPng` gathers all four independently eligible number PNG paths and rejects different-path matches without source priority. Confirmed actual-vehicle identities stay protected. Commit 477770e; old Yamagata assertion adapted in 156933d.
- Existing catalog audit now reports **39 potential different-PNG numeric interval intersections on 20 line keys** (3 SQL–SQL, 2 SQL–JS, 34 JS–JS). This is **candidate intersection only**; calendar, source, train type, model and published-number guards can mean no runtime conflict. Report entries do not authorize a PNG and do not overwrite rules.
- No physical vehicle records or inferred number bands were added.

## 已应用正式数据库纯号段（2026-11-17）
- Supabase 迁移 `20261116180740_enable_and_seed_png_first_jr_reference_bands_2611` 已成功执行；同名迁移文件位于 `supabase/migrations/20261116180740_enable_and_seed_png_first_jr_reference_bands_2611.sql`。
- 此前残存的数据库 `CHECK (requires_exact_roster)` 会阻止所有纯号段写入：现已改为两分支约束，旧来源/车型/精确名单必须保持完整，`png_band/%` 必须车型与来源均为 NULL，`requires_exact_roster=false`，不得声明实际编组。
- 从现有 JR 已有号码规则（线路内 PNG 唯一、无旧 SQL 行并有发布号码清单）以及山形、田泽湖、仙山、两毛专用守卫导出的 CSV 整理出 **97 条真正保存的 PNG→番号范围**，涉及 **21 条线路 / 19 张 PNG**。入库前排除 SQL 素材状态为 review/需复核 的 PNG。纯号段之间同线同后缀跨 PNG 重叠 **0**。
- 数据库验证：**总行数 388 = 旧 291 + 新 97**；`invalid_pure=0`、`invalid_legacy=0`。没有更改任何旧记录。数据是**只读参考号段**，并不证明任意区间内的列车当日实际运行，也不能绕过既有前端独立认证的日历、方向和实际车辆身份约束；未启用自动的全客户端绘图授权。
- 未覆盖的其余图库 PNG 不填写猜测区间。后续分类应以此真实 SQL 表为持久编号映射源，不新建同类权威表。

## 第二批 JR 正式 PNG 番号号段（2026-11-17）
- Supabase 数据库已应用迁移 `20261116183142_seed_png_first_jr_scoped_reference_bands_2611`，追加 **20 条纯参考号段**：津轻线、水郡线、水郡支线、篠之井线、米坂线，共 5 个线路键、5 张 PNG。
- 本次引用已有 JR 号码脚本：`jreast-tsugaru-2611-number-index.js`、`jreast-suigun-2611-number-index.js`、`jreast-shinonoi-2611-number-index.js`、`jreast-yonezawa-2611-number-index.js`；整理为 **179 个唯一线路／PNG／番号对应**，压缩成 20 段，未跨越没有出现过的号码。
- 篠之井线 Local 的 211 / E127 混用不能按号码唯一确定 PNG，因此只收录 LimitedExpress 383 与 Rapid 211。大湊线明确没有获准 PNG，水郡线 `9821D/9822D` 的风子特别车辆也没有可用专用图，均排除。
- 津轻 `324M` 的星期限制、水郡线 `8325D/8326D` / `9324D` / `9329D` / `9841D` 的日期守卫、米坂线 11 月 9–13 日维护取消、篠之井线当地车辆类型等**不能靠 SQL 号段放宽**。迁移不包含车型或来源 URL；号段是只读图片参考，不是运行许可或物理编组。
- 数据库验证：`408 = 291 旧行 + 117 纯号段`；在所有纯号段内部同线路/后缀不同 PNG 的冲突 0、违规物理证据声明 0。仅在同一现有正式表中写入，没有建立第二份运行时权威表。
