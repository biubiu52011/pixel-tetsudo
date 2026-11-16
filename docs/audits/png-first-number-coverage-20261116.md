# 基于列车 PNG 的运行番号静态覆盖审计（2026-11-16）

> 范围：`biubiu52011/pixel-tetsudo` 的 `main` 分支、`images/列车/`、统一只读目录及同日 Supabase 只读查询。未改动任何车辆身份、时刻表、数据库或页面映射规则。此处的「覆盖」是**静态直接号段引用**，不是完整运行时绘图成功率，更不是实际车组/涂装确认。

## 口径及来源

1. 物理 PNG：递归枚举 GitHub 树 `images/列车/` 的全部 `.png` 文件；排除其他图片目录。
2. SQL 已登记：`data/audits/supabase-railway-audit-snapshot-20261116.json` → `vehicle_image_assets.image_path`；并与 Supabase 实时数量核对。
3. 直接号段：`data/audits/train-number-png-catalog-2611.json` → `rules[].png`，由 `tools/build-train-number-png-catalog.cjs` 读取现有 `train-number-png-ranges.js` 和 SQL 快照衍生，**不增加第三份运行时映射权威**。
4. 数量等于规则中直接引用的**不同 PNG 路径**；不计图像在 `js/train-vehicle.js`、`vehicle-garage-png-map.js`、通用车型/线路匹配等间接路径上的潜在使用。未做当日浏览器动态渲染回放。
5. Supabase 只读查询 `public.manual_timetable_templates`、`public.train_timetable_vehicle_resolution`、`public.vehicle_image_assets`、`public.published_train_png_number_ranges`；其数量是查询时的快照。

## 关键结论

| 指标 | 结果 | 解释 |
| --- | ---: | --- |
| 物理列车 PNG | **601** | 46 个运营方目录 |
| SQL 登记且物理存在 | **477 / 601**（79.37%） | 图库登记完整度；不代表身份确认 |
| 直接被 SQL/JS 号段引用 | **87 / 601**（14.48%） | PNG-first *直接静态规则* 覆盖率 |
| 物理存在，未直接被号段引用 | **514** | 必须继续检查其他解析路径，不能全称「没有映射」 |
| 物理存在，未在 SQL 图库登记 | **124** | 登记缺口候选 |
| SQL 图库登记但物理文件缺失 | **1** | 路径或文件同步缺口 |
| 直接号段引用、物理存在但 SQL 未登记 | **3** | 优先核验登记一致性 |
| 统一目录 SQL/JS 规则 | **291 / 130**（共 421） | SQL 仅 24 条线；前端 JS 70 条线 |
| 静态号段索引线路 | **88 / 260**（33.85%） | 相对线路元数据的直接映射目录覆盖，非有效服务覆盖 |
| 共源逐号 PNG 核对 | **180 相同 / 0 冲突** | 仅 6 条 SQL/JS 共源线路的可比对明示号码 |
| 仅范围 + 运行时守卫的 JS 规则 | **9** | 不得把范围内所有号码当作实际开行 |
| SQL 资产待审规则引用 | **5** | 指向 4 张尚待独立外观确认的图片 |
| SQL 车型名称与资产标签差异 | **14** | 需核实语义，禁止自动别名/归一 |
| SQL 宽号段交叠 | **6**（其中跨车型 3） | 不能只凭号段选车型 |

物理 PNG 的互斥分类：

| 静态号段引用 | SQL 图片已登记 | 图片数 |
| --- | --- | ---: |
| 是 | 是 | 84 |
| 是 | 否 | 3 |
| 否 | 是 | 393 |
| 否 | 否 | 121 |

## 时刻表覆盖的必要限定（Supabase 当日只读查询）

- `manual_timetable_templates` 共 **98,510** 行，按 `(line_key,calendar_urn,train_number)` 去重为 **98,352** 组。
- 将上述 88 条静态索引线路键与现有计划模板交集分组：**85 条**已进入目录的线路共 **32,647** 条模板；**145 条**目录外线路共 **65,863** 条模板。合计实际有 230 条线路拥有模板；另有 30 条线路无模板。
- `train_timetable_vehicle_resolution` 返回 **96,563** 行，其中 **200** 行 `vehicle_artwork_path` 非空；**72,445** 行 `mapping_level=unresolved`。这里的路径比率**不是**网页渲染覆盖率，前端可能用其他有效车型证据选代表 PNG。
- SQL `published_train_png_number_ranges` 2611 为 **291** 行、**24** 条线；数据库图库 **478** 行。
- 因为静态区间、运行日/方向/来源守卫及车型证据不同，**不能**由「编号落入 `min/max`」或 88/260 自动推断某列车可显示何张 PNG。要得出实际运行番号覆盖率，必须逐条经最终 resolver 回放，至少区分 `exact` / `planned` / `representative` / `unresolved`。

## 按 PNG 所属运营方的静态号段引用

| 运营方图片目录 | PNG 总数 | SQL 已登记 | 号段直接引用 | 未直接引用 |
| --- | ---: | ---: | ---: | ---: |
| JR東日本 | 131 | 118 | 58 | 73 |
| JR西日本 | 70 | 8 | 2 | 68 |
| 東武鉄道 | 37 | 36 | 0 | 37 |
| 東急電鉄 | 31 | 28 | 0 | 31 |
| 都営地下鉄 | 30 | 29 | 9 | 21 |
| 上信電鉄 | 24 | 24 | 0 | 24 |
| 秩父鉄道 | 23 | 23 | 0 | 23 |
| 西武鉄道 | 22 | 22 | 0 | 22 |
| 富士急行 | 20 | 2 | 2 | 18 |
| 相模鉄道 | 19 | 19 | 1 | 18 |
| 函館市電 | 17 | 0 | 0 | 17 |
| 東京メトロ | 16 | 16 | 8 | 8 |
| 埼玉新都市交通 | 13 | 13 | 0 | 13 |
| JR東海 | 12 | 5 | 3 | 9 |
| 京成電鉄 | 11 | 11 | 0 | 11 |
| 小田急電鉄 | 11 | 11 | 1 | 10 |
| 銚子電鉄 | 11 | 11 | 0 | 11 |
| わたらせ渓谷鉄道 | 7 | 7 | 0 | 7 |
| 横浜市交通局 | 7 | 7 | 0 | 7 |
| 京浜急行電鉄 | 7 | 7 | 0 | 7 |
| 江ノ島電鉄 | 7 | 7 | 0 | 7 |
| 湘南モノレール | 7 | 7 | 0 | 7 |
| 東京モノレール | 7 | 7 | 0 | 7 |
| ひたちなか海浜鉄道 | 6 | 6 | 0 | 6 |
| 京王電鉄 | 6 | 6 | 0 | 6 |
| 伊豆箱根鉄道 | 4 | 4 | 0 | 4 |
| 流鉄株式会社 | 4 | 4 | 0 | 4 |
| 伊豆急行 | 3 | 1 | 0 | 3 |
| 山万 | 3 | 3 | 0 | 3 |
| 鹿島臨海鉄道 | 3 | 3 | 0 | 3 |
| 首都圏新都市鉄道 | 3 | 3 | 0 | 3 |
| 小田急箱根 | 3 | 3 | 0 | 3 |
| 真岡鐵道 | 3 | 3 | 0 | 3 |
| 千葉ニュータウン鉄道 | 3 | 3 | 0 | 3 |
| 北総鉄道 | 3 | 3 | 0 | 3 |
| JR北海道 | 2 | 2 | 0 | 2 |
| いすみ鉄道 | 2 | 2 | 0 | 2 |
| ゆりかもめ | 2 | 2 | 0 | 2 |
| 千葉都市モノレール | 2 | 2 | 0 | 2 |
| 多摩都市モノレール | 2 | 2 | 0 | 2 |
| 東京臨海高速鉄道 | 2 | 2 | 1 | 1 |
| JR九州 | 1 | 1 | 1 | 0 |
| 宇都宮ライトレール | 1 | 1 | 0 | 1 |
| 横浜高速鉄道 | 1 | 1 | 0 | 1 |
| 埼玉高速鉄道 | 1 | 1 | 0 | 1 |
| 東葉高速鉄道 | 1 | 1 | 1 | 0 |

**注意**：例如东武、西武、JR 西日本的低静态数字不意味着运行时完全不出图。许多资源依赖既有独立的车型映射、车辆图库登记和路线负责人；优先核实责任路径，不能把 514 张图统一补成宽号段。

## 优先修复/审核候选

### A. 直接号段已使用但 Supabase `vehicle_image_assets` 未登记（3 张）

- `images/列车/JR東日本/JR東日本_209系_500番台_武藏野線.png`
- `images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png`
- `images/列车/JR東日本/JR東日本_E231系_3000番台.png`

这些路径均在 GitHub 实际存在。先查是否有对应的规范图库别名或跨路径映射，再决定是否新增资产登记，不得以「有 PNG」自动设置 `actual_vehicle_confirmed`。

### B. 数据库已登记而 GitHub 物理文件缺失（1 张）

- `images/列车/伊豆急行/伊豆急行_8000系.png`

禁止未经证据将它替换为同车型其他涂装、车脸或变体。

### C. 尚缺逐号证据的宽范围 JS（9 条）

| ID | 线路 | 候选车型 | 过滤范围 | 审计处置 |
| --- | --- | --- | --- | --- |
| `js-0056` | SaikyoKawagoe, Rinkai | E233系7000番台 | 0–71KFS | 要求官方逐号/车型证据；保留原有守卫 |
| `js-0057` | SaikyoKawagoe | 相鉄12000系 | 72–79KFS | 要求官方逐号/车型证据；保留原有守卫 |
| `js-0058` | SaikyoKawagoe, Rinkai | 東京臨海高速鉄道70-000形 | 80–91KFS | 要求官方逐号/车型证据；保留原有守卫 |
| `js-0091` | Tozai | 東京メトロ15000系 | 400–2599S | 要求官方逐号/车型证据；保留原有守卫 |
| `js-0092` | Tozai | E231系800番台（東西線直通） | 400–2599K | 要求官方逐号/车型证据；保留原有守卫 |
| `js-0093` | Tozai | 東葉高速2000系 | 400–2599T | 要求官方逐号/车型证据；保留原有守卫 |
| `js-0094` | JobanLocal | E233系2000番台 | 400–2599K | 要求官方逐号/车型证据；保留原有守卫 |
| `js-0095` | JobanLocal | 東京メトロ16000系 | 400–2599S | 要求官方逐号/车型证据；保留原有守卫 |
| `js-0096` | JobanLocal | 小田急4000形 | 400–2599E | 要求官方逐号/车型证据；保留原有守卫 |

### D. 未登记数据库的全部物理 PNG（124 张）

以下是**登记差集**，不是「号段缺失」或「已确认当日运行」；它们既可能是新素材，也可能是历史车、涂装变体、相同车型另一路径或已有前端映射。应进一步按车型、涂装、用途分组，不自动补档。

- `images/列车/JR西日本/JR西日本_103系_播但線_BA-G1.png`
- `images/列车/JR西日本/JR西日本_103系_播但線_BA-G2.png`
- `images/列车/JR西日本/JR西日本_103系_播但線_BA-G3.png`
- `images/列车/JR西日本/JR西日本_103系_播但線_BA.png`
- `images/列车/JR西日本/JR西日本_113系_福知山線_FK053.png`
- `images/列车/JR西日本/JR西日本_117系_WEST_EXPRESS銀河.png`
- `images/列车/JR西日本/JR西日本_120系_関西地区_KAN.png`
- `images/列车/JR西日本/JR西日本_120系_中国地区_CHA.png`
- `images/列车/JR西日本/JR西日本_122系.png`
- `images/列车/JR西日本/JR西日本_187系.png`
- `images/列车/JR西日本/JR西日本_205系_阪和線_HN2.png`
- `images/列车/JR西日本/JR西日本_213系_W.png`
- `images/列车/JR西日本/JR西日本_221系_CHA.png`
- `images/列车/JR西日本/JR西日本_221系_N.png`
- `images/列车/JR西日本/JR西日本_223系_5500番台.png`
- `images/列车/JR西日本/JR西日本_223系_H2.png`
- `images/列车/JR西日本/JR西日本_223系_H6.png`
- `images/列车/JR西日本/JR西日本_223系_KAH.png`
- `images/列车/JR西日本/JR西日本_223系_KIL.png`
- `images/列车/JR西日本/JR西日本_223系_MORI.png`
- `images/列车/JR西日本/JR西日本_225系_V1.png`
- `images/列车/JR西日本/JR西日本_225系.png`
- `images/列车/JR西日本/JR西日本_227系_WK.png`
- `images/列车/JR西日本/JR西日本_271系.png`
- `images/列车/JR西日本/JR西日本_273系.png`
- `images/列车/JR西日本/JR西日本_281系.png`
- `images/列车/JR西日本/JR西日本_283系_K.png`
- `images/列车/JR西日本/JR西日本_283系.png`
- `images/列车/JR西日本/JR西日本_287系_K.png`
- `images/列车/JR西日本/JR西日本_287系_KRM.png`
- `images/列车/JR西日本/JR西日本_287系_SKR.png`
- `images/列车/JR西日本/JR西日本_287系_V1.png`
- `images/列车/JR西日本/JR西日本_287系.png`
- `images/列车/JR西日本/JR西日本_289系_G.png`
- `images/列车/JR西日本/JR西日本_289系_K_INS.png`
- `images/列车/JR西日本/JR西日本_289系_KANI.png`
- `images/列车/JR西日本/JR西日本_289系_KG.png`
- `images/列车/JR西日本/JR西日本_289系_KKANI.png`
- `images/列车/JR西日本/JR西日本_289系_MHR.png`
- `images/列车/JR西日本/JR西日本_289系_MHS.png`
- `images/列车/JR西日本/JR西日本_323系_M.png`
- `images/列车/JR西日本/JR西日本_323系_OR.png`
- `images/列车/JR西日本/JR西日本_681系_FT.png`
- `images/列车/JR西日本/JR西日本_683系_K.png`
- `images/列车/JR西日本/JR西日本_683系_K4.png`
- `images/列车/JR西日本/JR西日本_683系_N.png`
- `images/列车/JR西日本/JR西日本_683系_SRN.png`
- `images/列车/JR西日本/JR西日本_683系.png`
- `images/列车/JR西日本/JR西日本_C57形_SLやまぐち.png`
- `images/列车/JR西日本/JR西日本_キハ189系_はなあかり.png`
- `images/列车/JR西日本/JR西日本_キハ189系.png`
- `images/列车/JR西日本/JR西日本_キハ35系.png`
- `images/列车/JR西日本/JR西日本_キハ40系_AMTC.png`
- `images/列车/JR西日本/JR西日本_キハ40系_ETS.png`
- `images/列车/JR西日本/JR西日本_キハ40系_JBEL.png`
- `images/列车/JR西日本/JR西日本_キハ40系_JNRN.png`
- `images/列车/JR西日本/JR西日本_キハ40系_OOG.png`
- `images/列车/JR西日本/JR西日本_キハ40系_OOR.png`
- `images/列车/JR西日本/JR西日本_キハ40系_UYM.png`
- `images/列车/JR西日本/JR西日本_キハ41系.png`
- `images/列车/JR西日本/JR西日本_キハ47系_SAK.png`
- `images/列车/JR西日本/JR西日本_キハ87系.png`
- `images/列车/JR東海/c11nsk.png`
- `images/列车/JR東海/c25-1.png`
- `images/列车/JR東海/c313ce.png`
- `images/列车/JR東海/c35.png`
- `images/列车/JR東海/c385.png`
- `images/列车/JR東海/c75.png`
- `images/列车/JR東海/c85h.png`
- `images/列车/JR東日本/e211na1n.png`
- `images/列车/JR東日本/JR東日本_205系_1100番台_鶴見線.png`
- `images/列车/JR東日本/JR東日本_209系_3000番台.png`
- `images/列车/JR東日本/JR東日本_209系_3100番台.png`
- `images/列车/JR東日本/JR東日本_209系_500番台_武藏野線.png`
- `images/列车/JR東日本/JR東日本_719系_5000番台.png`
- `images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png`
- `images/列车/JR東日本/JR東日本_E127系_100番台_長野色_幌付.png`
- `images/列车/JR東日本/JR東日本_E231系_3000番台.png`
- `images/列车/JR東日本/JR東日本_E231系_500番台_中央・総武線各駅停車.png`
- `images/列车/JR東日本/JR東日本_E231系_900番台_武藏野線.png`
- `images/列车/JR東日本/JR東日本_E233系_房総地区_改造車.png`
- `images/列车/JR東日本/JR東日本_HB-E220系_八高線.png`
- `images/列车/伊豆急行/伊豆急行_3000系.png`
- `images/列车/伊豆急行/伊豆急行_8000系_黒排障器.png`
- `images/列车/都営地下鉄/都営地下鉄_8500形_8501号車_山吹色.png`
- `images/列车/東急電鉄/東急電鉄_6000系.png`
- `images/列车/東急電鉄/東急電鉄_6020系_追加.png`
- `images/列车/東急電鉄/東急電鉄_9000系.png`
- `images/列车/東武鉄道/東武鉄道_8000型_標準塗装.png`
- `images/列车/函館市電/toq9002or.png`
- `images/列车/函館市電/函館市電_3000形_3001号車.png`
- `images/列车/函館市電/函館市電_3000形_3002号車.png`
- `images/列车/函館市電/函館市電_3000形.png`
- `images/列车/函館市電/函館市電_30形_39号車.png`
- `images/列车/函館市電/函館市電_500形.png`
- `images/列车/函館市電/函館市電_7000形.png`
- `images/列车/函館市電/函館市電_710形_広告車.png`
- `images/列车/函館市電/函館市電_710形.png`
- `images/列车/函館市電/函館市電_8000形_広告車.png`
- `images/列车/函館市電/函館市電_8000形.png`
- `images/列车/函館市電/函館市電_8100形_広告車.png`
- `images/列车/函館市電/函館市電_8100形.png`
- `images/列车/函館市電/函館市電_9600形_9601号車.png`
- `images/列车/函館市電/函館市電_9600形_9604号車.png`
- `images/列车/函館市電/函館市電_9600形_広告車.png`
- `images/列车/函館市電/函館市電_9600形.png`
- `images/列车/富士急行/富士急行_1000系_旧塗装_水色.png`
- `images/列车/富士急行/富士急行_1000系_青色.png`
- `images/列车/富士急行/富士急行_1000系_赤白塗装.png`
- `images/列车/富士急行/富士急行_1000系_富士登山電車_別面.png`
- `images/列车/富士急行/富士急行_1000系_富士登山電車.png`
- `images/列车/富士急行/富士急行_2000系_フジサン特急_顔A_パノラマ車.png`
- `images/列车/富士急行/富士急行_2000系_フジサン特急_顔A_非パノラマ車.png`
- `images/列车/富士急行/富士急行_2000系_フジサン特急_顔B_パノラマ車.png`
- `images/列车/富士急行/富士急行_2000系_フジサン特急_顔B_非パノラマ車.png`
- `images/列车/富士急行/富士急行_5000形_トーマスランド号.png`
- `images/列车/富士急行/富士急行_5000形_標準色.png`
- `images/列车/富士急行/富士急行_6000系_マッターホルン号.png`
- `images/列车/富士急行/富士急行_6000系_リサとガスパールトレイン.png`
- `images/列车/富士急行/富士急行_6000系_紫色ラッピング.png`
- `images/列车/富士急行/富士急行_6000系_赤色塗装.png`
- `images/列车/富士急行/富士急行_8000系_フジサン特急_顔B.png`
- `images/列车/富士急行/富士急行_8500系_富士山ビュー特急_赤色.png`
- `images/列车/富士急行/富士急行_8500系_富士山ビュー特急_茶色.png`

## 后续审计建议（不改运行时）

1. **先看现有负责人**：用 `train-number-png-ranges.js`、`vehicle-garage-png-map.js`、`train-vehicle.js`、SQL 解析视图及相关测试排除间接引用；把 514 张按 `runtime_indirect`、`gallery_only`、`historical`、`needs_source` 分类，避免制造第三套映射表。
2. **实际番号覆盖率只用可观察的服务名单做分母**：以线路/服务日/方向/完整运行番号/运营商为联合主键，透传原始证据和时间范围给现有 resolver，逐号记结果。避免尾号、运用号、列车番号之间无证据的转换。
3. **错误分类**：`png_missing`、`sql_asset_unregistered`、`has_png_no_number_evidence`、`guard_rejected`、`ambiguous_vehicle`、`verified_representative`、`actual_formation_confirmed` 严格区分。
4. **优先高量线路**：对现有模板量大的未入索引线路（京急、小田急小田原、东武东上/Skytree、西武池袋、相铁本线、京成、东急东横等）逐一追溯 runtime owner 与官方完整车次表，不凭范围推断车种。
5. **回归**：继续运行 `node tools/build-train-number-png-catalog.cjs --check --strict` 和现有 `tests/train-number-png-catalog.test.cjs`，对新增状态增加纯只读检查，禁止新增宽规则绕过现有日期/方向/车型约束。

## 可复核来源

- [统一派生目录](../../data/audits/train-number-png-catalog-2611.json)
- [目录生成与校验工具](../../tools/build-train-number-png-catalog.cjs)
- [Supabase 2611 快照](../../data/audits/supabase-railway-audit-snapshot-20261116.json)
- [既有号段统一核对](train-number-png-unification-20261116.md)
- GitHub 图片根目录：`images/列车/`
- 报告锚定此前 main SHA：`430ea142ce5f3855be2eecef17f419ddcc766f8a`

**不做自动批量号段补齐**：静态资产缺口与可据官方证据映射的列车番号缺口是两类不同问题。尤其历史车、涂装、特殊编组、单日临时号不可因图片存在直接绑定整段。
