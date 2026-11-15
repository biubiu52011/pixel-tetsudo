# 列车号段与 PNG 映射统一审计（2026-11-16，第四次整理）

## 已统一的索引与来源

- `data/audits/train-number-png-catalog-2611.json` 从既有前端 JS 和 Supabase 2026-11-16 只读快照派生，不参与运行时决策，不是第三份真值表。
- 当前 SQL 仍为 **291** 条、24 条线路；前端 JS 为 **108** 条（136 个线路关联，58 条线路）；并集覆盖 **76** 个线路键。
- SQL 号段现同时保留原始 `source_url`，前端保留日历、方向、完整号/尾两位、外部车次索引等约束。CI 禁止丢失 SQL 证据出处。
- 所有 SQL 条目 `requires_exact_roster=true`，任何号段均不得作为实体编组认定依据。`actual_vehicle_confirmed` 必须为 false。

## 已补登记、但仍禁止自动确认为已审核资产

4 个数据库原缺失图片现登记到 `public.vehicle_image_assets`，覆盖原先 **5** 条 SQL 规则引用：
1. 富士急 6000 系标准色；
2. 富士急 8000 系「フジサン特急」脸 A（被两条号段引用）；
3. JR 东日本 E127 系 100 番台长野色；
4. JR 东日本 HB-E300 系「リゾートビューふるさと」。

它们均是 `asset_status=review`、`asset_scope=review`、`appearance_class=requires_review`，文件格式已由 Actions 校验为有效 PNG，`file_format_status=native_png`；但车辆外观特征与实体身份仍未独立核实。**数据库已登记不等于图片可用、车次已证实或实体车号已证实。** CI 明确要求该状态不能在缺乏独立审核时被意外升级。

## 已澄清重叠

- **3 对新干线同车次/同模型/同图片重叠**：是 `weekday_verified_single_number` 与 `verified_single_service` 的独立证据来源。现有 Edge Function 明确允许此类重复；**保留两份来源**，不误删。
- **大糸线 3 对跨车型的宽区间重叠**：依旧不能单凭数字号段推断车型。2026-11-16 通过数据库实查 `published_oito_east_2611_number_roster`：共 **141** 条日历/方向车次记录、**73** 个不同车次号，`(train_number,calendar_urn,direction_urn)` 下没有多车型冲突，实体编组确认数为 **0**。应先以精确车次+日历+方向查实际表，要求车型和图片同时匹配；不存在的车次一律不匹配。
- 生成目录将重叠分类为 `same_artwork_separate_source_evidence` 与 `cross_model_candidate_bands_require_exact_roster`，统一 `may_select_by_band_alone=false`。
- **14** 条 SQL 车型标签与资产标签文字不完全相同，多为车型子系列、主题或运行地区表述。没有证据证明它们是错误车型，因此既不覆盖原字段，也不自动创建可用于精确车辆认定的别名。

## 仍需证据核实

- **17** 条 JS 号段缺少同条目内明确车次列表、官方逐月日历名单或外部车次索引，依靠范围与额外运行时条件；本次集中列入 `review.frontend_guard_only_rules`，需按官方时刻表逐条决定是否可以细化。不能用宽号段凭空生成时刻表记录。
- 上述 4 张图片的 PNG 文件签名已验证；仍需独立核实车辆外观、脸型、涂装及适用列车和日期。只有通过审核，才可从 `review` 改为 `available`；任何状态变化均需同步日期快照与 CI 基线。

## 再生和验证

```bash
node tools/build-train-number-png-catalog.cjs --write
node tools/build-train-number-png-catalog.cjs --check --strict
node --test tests/train-number-png-catalog.test.cjs
node tools/railway-metadata-audit.cjs --strict
node --test tests/train-number-png-runtime.test.cjs
```

数据库源记录发生变化，应先刷新 `data/audits/supabase-railway-audit-snapshot-20261116.json` 对应字段，才再生目录；CI 不直接连接生产数据库或读取密钥。

## 2026-11-16 第三次校对：宽范围收紧与误报消除

- 文件格式已由 GitHub Actions [43763974618](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/43763974618) 检验：4 张待审文件的 PNG 签名、IHDR、非零尺寸及 IEND 均通过；SQL 的 `file_format_status=native_png`，但 `asset_status=review` 与 `appearance_class=requires_review` **保持不变**。二进制格式合格不证明车辆涂装或日常编组。
- 原报告 20 条前端“仅宽范围”含 3 条误分类：`js-0059`（中央快速）及 `js-0101`（鹤见线三线）有正式的 2026-11 平日/休日完整名单；`js-0100` 为 1252M 单点且要求兼容车辆计划。故真正的纯宽范围候选为 **17** 条，不是 20。均仍属于代表图，不代表实体车。
- 修复已存在的**跨月名单绕过漏洞**：`row.officialMonthNumbers` 现在要求运行日严格属于对应官方月份；日期为空或跨月时，不能退回整段号段取 PNG。CI 对中央快速与鹤见线执行当月成功、过期拒绝及无日期拒绝测试。
- 14 条 SQL 车型名称差异按 “系列名 vs 番台/服务名”、“资产标签更加具体”、“形/系文字写法”、“多番台共用代表图” 分类。新目录的 `safe_alias_authorized=false` 明确禁止通过名称修饰自动创建精确车型别名；名称差异不代表实质车辆冲突已解决。

## 第四次校对：前端与 SQL 车次 PNG 一致性

- 两侧共有 **6 条**具有 SQL/JS 号段来源的线路：Fujikyu、Kashima、Kitakami、Kururi、Oga、RikutoEast。
- 只对 **JS 明确列出的公开列车番号**执行相同线路、相同号码与后缀、SQL 区间内的 PNG 比较，当前 **180 对一致，0 对图片冲突**。这些记录在 `review.cross_source_number_png.verified_same_png` 中逐项可追溯；CI 对新增冲突直接失败。
- Kashima 的 JS 规则没有同条目的明确公开列车号名单，当前 1 条记录保持 `unverified_js_rules`，不能由宽范围推出“两侧完全一致”的结论。
- 此项核对只是静态来源间的 PNG 指向一致性；运营日、方向、列车种别及实体编组仍由既有各条线路的运行时核验约束，**不授予实际车辆身份**。

## 第五次校对：保留完整运行时附加约束

- 原先统一目录会列出号段、车种、日历等主要条件，但没有导出所有原生 JS 条目的附加约束。现将其以 `runtime_guards` 原样保存，**不新增或替换运行时映射权威**。
- 108 条前端规则中，**100** 条含至少一个额外来源字段，共 **17** 种原字段键：包括 `allowedModelLabels`、`excludeTrainType`、`sourceOperatorFallback`、`trainTypesIfPresent`、`requireExplicitModelEvidence` 等。CI 检查这些字段与原始负责脚本逐项一致，不能被整理过程遗漏。
- 鹿岛线 JS 通用区间虽然缺少同条目的明确列车号数组，但实际运行时另有 `verifyKashimaService`，专门依赖 SQL 签发的车次、日历、方向、沿途六站及车型证据。跨源比较中的 1 条 `unverified_js_rules` 指**无法直接比较两份静态号码表**，不是称鹿岛线缺少 SQL 精确核验。


## 第六次校对：中央本线／中央快速 E353 宽号段改为官方逐号名单

- 既有 `js-0105`—`js-0108` 四条 E353 限定特急规则已从纯连续区间升级为 **2026-11 官方平日／土休日明确列车番号集合**，直接取既有 `jreast-chuo-main-2611-number-index.js` 官方上下行列（不是新增事实表）。
- 分别对应 1–60M、2101–2199M、3101–3199M、5001–5099M，**59 个不重复的官方号码**（每种日历各 58 个）。保留 `LimitedExpress` 类型检查，新增上下行奇偶校验及 2026-11-01 至 11-30 日期限制。
- 这些号码只证明出现在官方时刻表相应日历，不证明每个日期实际开行、不证明具体车辆或涂装。没有列出的号（例如 2M、2101M、3101M、5001M）、月份外、无日期、方向相反都不再用宽范围返回 E353 PNG。
- 派生目录仍由原脚本生成，全部规则计数 399 不变；需要继续核实的宽范围由 **17 减至 13 条**。本次没有新增候选车辆逻辑或重复数据库表。

官方数据来源：`data/timetables/jreast-chuo-main-2611-number-index.js` 所标注 JR 东日本 2611 中央本線上下行平日／土休日时刻表。
