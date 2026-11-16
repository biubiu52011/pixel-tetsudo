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


## 2026-11-16 补充审计：运行时图库与静态号段反向引用

> 方法：直接检视 `data/timetables/vehicle-garage-png-map.js`、`js/train-vehicle.js`、`data/timetables/train-number-png-ranges.js`、已有回归测试，以及同日 Supabase 只读查询。**不把素材登记或声明范围等同于逐车次、逐日允许出图。**

### 1. 先纠正 514 张的口径

`VehicleGaragePngMap` 现声明 `totalPng=601`、`mappedPng=601`、`unassigned=[]`，说明所有物理 PNG 已有**仓库侧图片路径登记**（含待审、备用、图库和不可用项），不能将“无直接号码规则”解读为“图库从未登记”。这里的库内图库登记与 Supabase `vehicle_image_assets` 的 478 条是不同概念，不要混算。

另外，`js/train-vehicle.js` 中有 **599 个不同的静态 PNG 路径字面量**，其中对于前述 **514 张未被静态号段直接引用的 PNG，有 512 张出现在此文件中**。剩余两张仍可在 `VehicleGaragePngMap` 找到索引：JR 东日本 E233 系 5000 番台的备用路径及东武 8000 型的另一素材。静态路径字面量的出现只说明源码登记或候选引用，**不能证明该文件可用于某次实际列车**。

通过现有 `VehicleGaragePngMap` 源表的逐路径分类（同一图片可能有多条条目，按“隔离 > canonical > 有线路范围的候选 > 待审核素材 > 其他 > 备用”的优先级做互斥计数），前述 514 张可区分为：

| 既有图库声明状态（非当日实车判断） | PNG 数量 | 建议处置 |
| --- | ---: | --- |
| 有 canonical 图库模型引用、且未列入隔离 | **241** | 交叉验证具体车型、线路与服务日，不能无证据绑定完整号码 |
| 有线路范围的非 canonical 候选或参考引用 | **49** | 对照来源逐号名单与车型证据；仅代表候选 |
| `artwork-inventory` 待审图库、无直接线路范围 | **213** | 先查车型、历史/现役、涂装与来源，禁止按路径推断号码 |
| 图片身份冲突或重复字节隔离（未直接出现在 87 路径内） | **7** | 不得自动解封；逐图核实实际内容 |
| 其他无线路范围的非 canonical 引用 | **3** | 核查独立 verifiers 的适用场景 |
| 仅在 `alternates` 备用引用（E233 5000 番台） | **1** | 不可视为精确车号/车组证据 |
| **总数** | **514** | 与前述静态直接号段差集完全相符 |

图库中 9 张 PNG 被现有 `VehicleGaragePngMap` 标记为 `quarantined`。`js/train-vehicle.js` 已在规范车型、待审素材和展示路径层面检查隔离，`VehicleGaragePngMap.matchModelPath` 也不放行隔离图。**有这样的运行时防护并不意味着静态审计应忽略隔离关联。**

### 2. 静态号段之外仍有号码校验器引用其他 PNG

`train-number-png-ranges.js` 除派生的 421 条 SQL/JS 号段规则外，还含 `verifyFukuchiyamaSourceFleet`、`verifyNodaFiveCar20261104`、东武 Skytree/直通线路来源匹配、`matchChuoSobuLocalBCLiveNumber`、`matchTobuBranchFleetIllustration` 等专门逻辑及特殊车型分派。

- 同一 JS 模块中，除了 87 个统一号段目录 PNG 路径之外，还有 **29 个不同的 PNG 路径字面量**。有些属于 `exactModelArtworkMap` 的受限车型分支，有些属于多车型候选列表或服务名匹配；**29 不等于 29 张已具有官方完整车次映射**。
- 这些路径包括东武 60000/80000、50050、N100 等；东京 Metro 13000、18000、07；JR 西日本 207/321/287；JR 东海 313/373；伊豆急 8000/3000/2100 等。部分需要实时来源、具体车型、运营方或月份与原始车号同时一致才能出图。
- **不能把 87+29 直接当成可证实的车次号覆盖率分子**；需要依据每个独立 matcher 的输入、日历、来源及排除条件测试。尤其福知山 207/321 图片可以同属一个候选集合，但不能仅凭已知线路自动挑图。

### 3. 静态规则引用了被隔离的 PNG（需保留为审计风险）

| 规则 | 线路 | PNG | 判断 |
| --- | --- | --- | --- |
| `sql-0145` | Oito | `JR東日本_E127系_100番台_長野色.png` | 数据库 `review`，图库隔离 |
| `js-0061` | ChuoTatsuno | 同上 | 运行时应拒绝展示隔离图片 |
| `js-0033` | BanetsuWest | `JR東日本_DE10形_DLばんえつ物語.png` | 与客车图字节重复、车型标签冲突 |

静态规则总计 **3 条引用、2 张不同的隔离 PNG**。这不是 3 条已确认运行时误绘制：`tests/train-number-png-runtime.test.cjs` 已对 DE10 与 E127 做了隔离/不出图断言；本次没有执行完整浏览器回放。Supabase 当前 `train_timetable_vehicle_resolution` 中直接非空的 200 条 `vehicle_artwork_path`，查得 **0 条**指向上述 DE10 或 E127-100 文件。不能据此放宽或删除隔离。

### 4. 未进入统一静态号段目录的高量线路：源模板 → 规范解析（**已修正关联键**）

**2026-11-16 后续校对发现一个审计查询错误**：此前直接使用 `train_timetable_vehicle_resolution.timetable_id = manual_timetable_templates.id`，但两者主键属于**不同表**，因此旧版列表中的“解析记录 / unresolved / 直接 PNG”列全部失效。旧数据不得复用，本表使用项目已有的**真正源模板级视图** `public.train_timetable_source_resolution`，按 `s.source_template_id = m.id` 关联。这个源视图已经考虑 `train_timetable_members` 多线路／同车连续区间，比使用 `train_timetables.lead_source_template_id` 更完整。

| 线路 | 时刻表源模板 | 非空车型原始标签 | 解析 unresolved | 解析车型/候选 | 源解析直接 PNG |
| --- | ---: | ---: | ---: | ---: | ---: |
| Keikyu | 2,782 | 2,782 | 2,782 | 0 | 0 |
| Odawara | 2,117 | 0 | 1,778 | 339 | 198 |
| Ikebukuro（西武） | 2,088 | 2,083 | 1,923 | 165 | 0 |
| Tojo | 1,760 | 0 | 1,760 | 0 | 0 |
| TobuSkytree | 1,738 | 0 | 1,738 | 0 | 0 |
| SotetsuMain | 1,457 | 1,457 | 1,457 | 0 | 0 |
| Keisei | 1,413 | 0 | 1,251 | 162 | 0 |
| TokyuToyoko | 1,397 | 0 | 1,328 | 69 | 0 |
| SeibuShinjuku | 1,147 | 0 | 1,132 | 15 | 0 |
| OsakaLoop | 1,057 | 0 | 1,057 | 0 | 0 |

解释：

1. **京急／西武池袋／相铁**：原始车种字段可能表示多种车型组成的候选集合（例如京急“新1000／1500／600”），**不能选第一种 PNG 代替车次证据**。从本次源解析看，京急和相铁模板均未确定型号。
2. **小田急小田原线**：历史模板中有 **198 条具直接 SQL PNG 路径**，多数依靠带时刻表或运用来源的专门规则，**并非**“小田急零号段映射”或“当前日 198 个实车已证实”。
3. **东武 Skytree**：规范源解析仍 unresolved，但同仓库另有 `TrainNumberPngRanges` 专用官方/来源匹配规则。不能据此断言网页全线无法出图。
4. **大阪环状线与多条旧数据线路**：仍需查相应官方列车号、服务日期、车型数据和已有负责人。静态图库本身不能补实车身份。

### 5. 下一步完成“实际覆盖率”的必要条件

只读统计应采用服务主键 `(line_key, operator/railway_urn, calendar_urn, service_date, direction_urn, original_full_train_number)`，必要时加入站点时刻和来源版本区分同号复用。不要把 **98,510 个模板行**当作 2026-11 每日真实开行分母。来源不含 `operating_dates` 或修订月份未核实的模板必须单列 `unknown_calendar_scope`。

对每个存在的服务，复用既有最终 `TrainVehicle` / `TrainNumberPngRanges` 判定，输出互斥状态：`confirmed_formation`、`source_scoped_representative`、`candidate_or_planned_only`、`blocked_by_quarantine`、`missing_source_or_guard`。只对来自独立权威证据、且运行条件完整的服务计算“代表 PNG 适用率”；`confirmed_formation` 另列，不与展示参考图混计。

**本次补充不修改运行时规则、数据库和 PNG 素材**，也不从图片目录批量生成补全号段。优先顺序：先查已有负责人 → 独立官方逐号名单 → 车型证据 → 图库状态 → 最终 resolver 回放与测试。


### 6. 2026-11-16 明确日期子集实测（已独立复核）

此处不按自增 ID 错误连接，直接使用现有 `public.train_timetable_source_resolution` 视图与 `manual_timetable_templates.id` 关联；文件 `supabase/queries/train_number_png_service_date_coverage_readonly.sql` 提供可复用、只读的完整 SQL。

| 统计对象 | 查询结果 | 不能推断的内容 |
| --- | ---: | --- |
| 全部源时刻表模板 | **98,510** | 不是当日运行列车总数 |
| 明确填写 `operating_dates` 的源模板 | **309** | 其余 98,201 条不表示停运，而是需其他日历判定 |
| `operating_dates` 包含 2026-11-16 | **174** 行 | 仅本子集，不代表全网当日班次 |
| 该子集按线路/铁路/日历/方向/完整番号去重 | **173** 组 | 多来源同号须保留来源证据 |
| 该子集处于 `unresolved` | **126** 行 | 不能推断当天一定无可用前端代表图 |
| 该子集已有非空车型标签 | **48** 行 | 车型/计划的存在不表示实车身份 |
| 该子集有直接 SQL PNG 路径 | **2** 行 | 网页另有前端 renderer/matcher，不能当作展示成功率 |
| 该子集在本月有非空修订日期 | **114** 行 | 日期非空只是一个元数据，不是充分的官方验证 |
| 同一车次同日实际编组确认 | **0** 行 | 保持 `actual_vehicle_confirmed=false` |

两条有 SQL 图片路径的当日明确日期源记录是埼京线 `510S`、`759K`，使用 E233系7000番台代表图；仍需独立核对当天车辆与图片，不能提升为精确实车。

唯一重复的同日服务联合键为御殿场线 `2570M`（Weekday、Inbound），两份源记录来自不同的 `authorized-sql:jrcentral` 和 TokyoGTFS 文件；两条**来源**不能被当成两列车，也不能因重复直接判定车型冲突。

**数据库关系审计的修正与保护**：`train_timetable_vehicle_resolution.timetable_id` 引用的是 `train_timetables.id`，不是 `manual_timetable_templates.id`。并且规范时刻表的 `lead_source_template_id` 可能不同于车型映射选择的 `source_template_id`：全库有 **380** 个此类记录，其车辆来源属于同一 `train_timetable_members` 组，不属于错误主键关联。按真正 membership 核对，源解析 98,510 行及已有车型映射 24,118 行的 **nonmember 都为 0**。

**运营日历语义**：部分 `Weekday` / `SaturdayHoliday` 标签与显式 `operating_dates` 横跨的实际日期不一致，先前若直接称为错误将造成误报。`tools/route-timetable-service-calendar.test.cjs` 已明确要求“带日期 SQL 计划的服务日授权优先于日历标签”，因此这一点仅保留为来源语义复核，不自动删除有效列车、也不强制统一日期类别。

**当前可验证结论**：174 条可显式指定当日的原始计划中，只有两条直接在 SQL 中挂载 PNG。这不是全网站实际显示率。真正的全网车次号 PNG 适用率仍要求回放最终 `TrainVehicle` 及 `TrainNumberPngRanges`，并对覆盖其余 98,201 条源模板的周历与运营日证据进行核验。


### 7. 200 条数据库直接 PNG 路径的来源细分（非实际运行日确认）

与 `train_timetable_source_resolution` 正确一对一关联全部 98,510 条源模板后，目前直接带 `vehicle_artwork_path` 的 **200 条**严格分为：

| 线路及计划车型 | 源模板条数 | 车型图 | 车型证据修订日 | 后续判定 |
| --- | ---: | --- | --- | --- |
| Odawara 东京 Metro 16000系 | 118 | `東京メトロ_16000系.png` | 2026-07-06 | 源为非官方运用参考；需重新核实对应日有效性 |
| Odawara JR E233系2000番台 | 80 | `JR東日本_E233系_2000番台.png` | 2026-07-06 | 同上，不得跨日期自动作实际编组判断 |
| SaikyoKawagoe E233系7000番台 | 2 | `JR東日本_E233系_7000番台.png` | 2026-11-01 | `510S`、`759K` 当日有明确日期名单；仍是参考图 |

200 条均标记为 `dated_schedule_rule`，不等于 200 列实车或全网成功显示 PNG。小田急来源参考 `yozakura-room.net` 的 2026 年运用表，埼京来源参考 `ameblo.jp` 的带日期运用记录；即使有 URL 也不等于当日官方实车验明。现有正式图像路径与实体身份的保护层应继续保留。


### 8. 前端真实选择器的明确日期样本回放（174 条）

此次不再仅根据 SQL 字段“猜测是否显示 PNG”，而是加载 \`data/timetables/vehicle-garage-png-map.js\`、各个既有官方番号索引、\`data/timetables/train-number-png-ranges.js\`、\`js/train-vehicle.js\`、证据模块及 \`js/trains-render.js\` 的真实 \`_trainMarkerSpec\` 选择段，对相同来源的 SQL 显式日期样本逐行运行。

- 输入快照：[\`data/audits/train-number-png-runtime-sample-20261116.json\`](../../data/audits/train-number-png-runtime-sample-20261116.json)，来自 \`manual_timetable_templates\` 与 \`train_timetable_source_resolution\` 的真实来源关联，仅取 \`'2026-11-16'::date = ANY(operating_dates)\`，含完整原始列车番号、运营方线路、源日历、方向、车种和证据等级；**没有凭 PNG 文件名推导任何车辆身份**。
- 可重跑程序：[\`tools/audit-train-number-png-runtime.cjs\`](../../tools/audit-train-number-png-runtime.cjs)，使用生产模块的 \`TrainVehicle\` 和 SVG 标记选择器，无需连接 Supabase 或发出网络请求，打印按线路和负向守卫分类的 JSON 结果。运行 \`node tools/audit-train-number-png-runtime.cjs --strict\`。
- 输入由源元数据构造**最小计划位置**：\`positionSource='supabase-train-run'\`、\`estimated=true\`、\`vehicleIdentityStatus='UNKNOWN'\`、\`vehicleResolvedUpstream=false\`、原始完整车次号码／线路／日期／铁路 URN／车种；\`timetableDateVerified\` **仅在原规范 \`timetable_validity='date_verified'\` 时为真**；\`officialNumberVerified=false\`，防止凭空制造官方身份授权。不伪造 \`vehiclePlan\`、编组、实际运营观察。
- \`_isTrainArtworkFailureActive\` 固定为 \`false\`，因此**未做浏览器图像加载、缓存和网络失败模拟**；但会检查源图片路径在图库和仓库中存在，且不属于现有隔离 PNG。
- 这仅是**最小 SQL 位置源输入的 selector 回放**。真实 DataFusion/ODPT/Edge Function 的完整适配器可能附带其他已核实字段或独立颁发 \`vehiclePlan\`，允许其他合规图片。不得把返回中性圆点理解成真实页面已证实不能出图。

| 2026-11-16 明确日期样本 | 源模板条数 | SVG 返回参考 PNG | 中性标记 | 车型证明 |
| --- | ---: | ---: | ---: | --- |
| Gotemba | 92 | **86** | 6 | 315系**仅作** 313/315 混用线路的示意车型，禁止推断 86 列真实使用 315 |
| SaikyoKawagoe | 3 | **2** | 1 | \`510S\` 和 \`759K\` 输出 E233系7000番台计划参考图，不确认编组 |
| 其他 15 条线合计 | 79 | **0** | 79 | 最小输入不满足现有专用授权；必须核对实际适配器字段 |
| **总计** | **174** | **88** | **86** | **88 条全部是 \`planned=true\`，实车编组 0** |

- **174 条源行 → 173 个按线路／铁路／日历／方向／完整番号去重的联合键；88 条参考图记录 → 87 个不同联合键。** 唯一重复来自 Gotemba \`2570M\` 的授权 SQL 与 GTFS 双来源。数量**不是** 2026-11-16 全网实际班次／实车图片覆盖率。
- 88 条参考图片实际只使用 **2 张 PNG**：\`JR東海/JR東海_315系.png\` 和 \`JR東日本/JR東日本_E233系_7000番台.png\`。其中 Gotemba **86 条**返回 \`planned=true, illustrative=true\`；Saikyo 两条 \`planned=true\`，未报告实际车组。
- 这解释了为何上一阶段数据库只返回 **2 条直接 PNG**，但前端最小 selector 能返回 **88 条**：Gotemba 的 86 条图片是**已有 \`TrainNumberPngRanges\` 精确车次白名单的线路示意图**，不是数据库直接车型／PNG 判定。
- 此次 GitHub 源码中的 Gotemba 规则有 \`publishedNumbers\` 明示名单、\`validFrom='2026-11-01'\` 至 \`validTo='2026-11-30'\` 的日期限制、来源铁路限制，并明确 \`referenceOnly:true, illustrative:true\`；图片 315系不等于完整型号或真实车组。
- **需要另查可信度**：Gotemba 的 92 条显式日期样本中，源解析仍有 91 条 \`timetable_validity='undated_not_current_verified'\`。这些列车在图面展示时仍然可能使用线路示意 PNG；要把示意升级为已核验的计划车型，必须独立验证来源与各车次，不得自动利用同一张 315 图片提高实际型号覆盖率。

#### 运行时边界负向回放

对上述 **88 条实际有图片**的样本，分别只修改一个输入条件（图面线路、源铁路、未来服务日期、方向、时刻表有效性标签），再运行相同的真实 \`_trainMarkerSpec\`。在本次样本中：

| 修改项 | 仍返回图片 | 解释 |
| --- | ---: | --- |
| 改在不相干的 Yamanote 图面显示 | **0/88** | 图面来源线路隔离有效 |
| 清除 \`sourceRailway\` | **0/88** | 源铁路匹配检查有效 |
| 将日期改为 2027-11-16 | **0/88** | 有效期检查有效 |
| 将方向 Inbound/Outbound 对调 | **86/88** | Gotemba 代表图白名单当前按完整番号、来源及日期检查，但**未以方向字段作为独立阻断条件**；需对照原始运营方向后再考虑收紧 |
| 移除 \`timetableValidity\` 和核验旗标 | **88/88** | 当前示意号段不依赖这些字段，不能将其宣传为已经通过官方日历或实车审核 |

这些仅是**抗篡改边界诊断**，不直接宣称 86 次现实中的方向误绘制。更严格的方向/日历验证需要原始时刻表和实际适配器一起参与，不应无证据按奇偶号批量推断方向或涂装。

#### 可重复执行和后续范围

审计工具仅加载已存在的脚本，不增加第三套号段映射权威；在 [\`.github/workflows/verify-train-png.yml\`](../../.github/workflows/verify-train-png.yml) 中增加了只读 replay 的安全检查，阻止跨不相干线路、缺少来源铁路或超过有效期的参考图片越权；方向及日历标签差异仍作为诊断输出，**不擅自修改生产映射**。

真正的全网覆盖率下一步必须先经**线上实际 train-runs 适配器**生成 2026-11-16 的全网规范运行位置，携带受信任的车型计划和官方逐号名单，再用该脚本相同的最终 SVG 选择入口复核；同时独立统计“有图片”“参考车型”“唯一车型”“实车编组确认”，不得合并成一个百分比。
