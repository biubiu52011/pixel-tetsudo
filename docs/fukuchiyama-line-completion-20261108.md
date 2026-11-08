# 福知山线／JR宝塚线：站序补全（2026-11-08）

既有 `Fukuchiyama` 线路登记了大阪–篠山口 22 站。线路本名福知山线延伸至福知山，北段补齐 9 站，最终 31 站。JR宝塚线是部分区间的爱称，不能将篠山口以北标为 JR宝塚线。

站序（篠山口之后）：丹波大山 → 下滝 → 谷川 → 柏原（兵库）→ 石生 → 黒井（兵库）→ 市島 → 丹波竹田 → 福知山。

- 丹波大山、下滝、柏原（兵库）、石生、黒井（兵库）、市島、丹波竹田补建坐标与 i18n；谷川及福知山复用现有站点，维护与加古川线、山阴本线的换乘关系。
- 柏原（兵库）采用 `Kaibara-Hyogo`，防止和关西本线的 `Kashiwara` 混淆；黒井采用 `Kuroi-Tamba`，避免与信越本线另一个 `Kuroi` 混淆。全局未改写「柏原」和「黒井」既有别名。
- 站点经纬度参考 MapFan 的福知山线站点，谷川、福知山复用既存坐标。
- 既有大阪–篠山口 21 区间均保持原 4 分钟的**历史站距参考估算**。新增 9 区间使用 2026-11-08 Yahoo 换乘结果中一趟福知山 09:01 → 篠山口 10:10 普通车所列沿途时刻的相邻**参考间隔**，从篠山口方向记为 `[3,16,5,10,3,9,7,8,8]`。此为图/换乘搜索兜底时长（包含该列车停站等待），**不是所有列车通用的已核实时刻表**，不得作为今日位置、运营恢复或列车号身份的证据。
- 原 SQL 383 条历史时刻表与 357 条候选车辆映射不变。没有为新增北段虚构 2026-11 车次、车号、编组、实时位置、人工时刻。
- 生成文件 `railway_data.compact.json` / `railway-data.file.js` 和 `station_i18n.compact.json` / `station-i18n.file.js` 由 `gen-file-data.js` 同源更新。

来源：
- https://www.jr-odekake.net/station/pdf/ubn.pdf
- https://ekitan.com/sta-info/line/5801
- https://transit.yahoo.co.jp/search/result/%E7%A6%8F%E7%9F%A5%E5%B1%B1-%E7%AF%A0%E5%B1%B1%E5%8F%A3
- https://mapfan.com/spots/SCH%2CJ%2CLK0
- https://mapfan.com/spots/SCH%2CJ%2CCK0
- https://mapfan.com/spots/SCH%2CJ%2CXK0
- https://mapfan.com/spots/SCH%2CJ%2CVK0
- https://mapfan.com/spots/SCH%2CJ%2CBK0

## 北段普通列车车型参考（2026-11-08 追加）

福知山线北段（篠山口—福知山）的普通列车另有 223 系 5500 番台运用，
不能直接套用大阪—篠山口的四种历史车队候选。现有主要车队预设已经加上
**实际时刻表站序范围限制**：仅当 `JR-West.Local` 的时刻表明确包含至少两个不同车站，
且全部停车站均在篠山口—福知山的已登记车站集合内并至少有一个篠山口以北车站时，
才把其线路车型参考限定为 `JR西日本223系5500番台`。

- 这只是 `route-fleet-reference`，不确认任何单独车次、运营日、实际编组或车辆图片。
- 路线跨越南北段、站序未知、仅有一个站点，或为快速／特急时，不强制赋予北段车型。
- 前端沿用 `MajorVehicleFleetPresets` 与 `_officialConventionalServicePlan`；没有新建第二套映射系统。
- 图库尚无适用于本区间的 223 系 5500 番台 PNG，不借用阪和线 223／225 系贴图。
- 383 条历史模板、357 条历史车队候选保持不变；没有生成未经核实的北段列车番号或时刻。

参考：
- https://express22.xsrv.jp/maintarminal/jr223-5500/
- https://express22.xsrv.jp/maintarminal/jrfukuchiyamalinedia20240316/

## 2774M 节假日快速（历史共通运用证据）

- JR西日本2026年11月时刻表：公开番号 **2774M**，土休日快速，篠山口18:44出发、大阪19:51到达；项目历史模板的 `2774MH` 是带节假日 `H` 后缀的内部表示。工作日相同番号的种别为丹波路快速，不可把种别／车辆运用混同。
- 2025年3月15日改正的明石支所 207／321 系周末共通运用表第87号运用记录同一车次（篠山口18:44→大阪19:51）。这只是**上一版历史车型族证据**，不是2026年11月8日的实际车型／编组确认。
- 映射严格限制 `2026-11-08`、`2774MH`、`JR-West.Rapid`、Inbound、SQL来源模板 `68302`、土休日、完整16站停车序列一致；不扩散至其他2700M号段或其他日期。缺任一证据，退回原线路候选。
- 在此范围内候选缩为207系／321系，使用现有321系PNG仅作**示意车头**；维持 `referenceOnly=true`、`numberDateVerified=false`、`actualVehicleConfirmed=false`、`authorizesPNG=false`，不认证实际编组或实时位置。图片加载失败回退为候选标记。
- 继续使用现有 `train-number-png-ranges.js`、`train-vehicle.js`、`trains-render.js` 及回归测试，没有为这趟列车建立新的数据库或推断车辆。

资料：
- https://timetable.jr-odekake.net/train-timetable/101641?date=20261108
- https://ameblo.jp/tc205-37/entry-12906281412.html


## 2026年11月北段「2531M」官方样本（增量完成，非全线覆盖）

- 复用已有的两条一站来源：平日编号 `2531M`（SQL ID `68234`）与土休日内部编号 `2531MH`（SQL ID `68235`）。公开编号均为 `2531M`，官方标明每天运行。
- JR西日本2026年11月时刻资料核实：篠山口08:37出发，经丹波大山、下滝、谷川、柏原、石生、黒井、市島、丹波竹田，福知山09:29到达。原来只有篠山口一个时刻的记录现有10站完整样本。
- 修正这两条来源从错误的 `Inbound`（朝大阪）到 `Outbound`（朝福知山）；同步既有 `train_timetable_members` 最后站序，`train_timetable_stops` 为关联视图，自动读取新旧来源，不向视图直接写入。
- 不建立另一套时刻表。现有 `manual_timetable_templates` / `manual_timetable_template_stops` 与 `train-runs` Edge Function 继续负责，`operating_dates` 限定2026年11月1日至30日；2026年11月以外不使用本样本。
- 运行样本只有这一个公开车次：不因10站完整就声称北段列车班次已全覆盖。实际运行、车组号、GPS位置仍未确认。原357条历史车型 SQL 证据不变；`223系5500番台` 仅由现有纯北段普通列车车队规则提供候选，图库没有该区间对应的 PNG，因此使用中性候选标记。
- Edge Function 用固定 source ID、站序、起终点时刻与来源限制将其标记为日期已核实；`sourceSampleOnly` 保障整条线路继续返回 `partial`，而不是完整 HIT。
- 平日 `2774M` 原始种别误写为 `Local`，按JR西日本官方公布的「丹波路快速」更正成 `JR-West.Rapid`；同时更正 `published_jrwest_fukuchiyama_2611_source_fleet` 相关一行，保留其历史候选车型可信度。
- 本次 SQL 文件：`supabase/migrations/20261108221000_fukuchiyama_november_2531m_official_sample_and_2774m_type.sql`；测试：`tests/fukuchiyama-2611-official-north-sample.test.cjs`。

参考（JR西日本官方2026年11月时刻表）：
- https://timetable.jr-odekake.net/train-timetable/240391?date=20261024
- https://timetable.jr-odekake.net/train-timetable/101631?date=20261023


## 2026-11-08 追加：北段 2528M／2532M 与「こうのとり」8・10号修复

### 北段普通：2026年11月官方样本，不等于完整列车时刻表
- 官网每日运行车次 **2528M** 福知山09:01发→篠山口10:10到，**2532M** 福知山11:07发→篠山口12:04到；两者在本项目中分别按平日／土休日内部存为 `M`／`MH`，不是重复的物理列车。
- 两趟各10个有据停站，复用 `manual_timetable_templates`、`manual_timetable_template_stops`、`train_timetables`、`train_timetable_members` 和既有自动生成视图；新增来源 IDs `2611082528001/2`、`2611082532001/2`。
- 仅使用官方2026年11月运营范围，在 Edge 端再校验站序、时间及 source ID。保留非实时、编组未确认、不授权PNG的状态；223系5500番台仍仅是北段普通线路候选。
- 来源：https://timetable.jr-odekake.net/train-timetable/24391?date=20261103 、https://timetable.jr-odekake.net/train-timetable/24581?date=20261103
- 迁移：`supabase/migrations/20261108223000_fukuchiyama_northbound_2528_2532_official_samples.sql`。

### 特急「こうのとり」8・10号：修正已有资料而非重复导入
- 原有SQL记录 `3008M / 3008MH`（来源 68244／68245）与 `3010M / 3010MH`（68251／68252）错写为 `Local`，仅有三田—大阪4个停车站，候选车型又误继承207／321／223／225通勤车族。
- 官方2026年11月资料核对：**3008M = こうのとり8号**，**3010M = こうのとり10号**，均为 `JR-West.LimitedExpress`，从福知山经篠山口、宝塚、尼崎、大阪开往新大阪。
- 已在原 SQL 来源和规范化视图中补全福知山—大阪的停站片段：8号9个停车站，10号7个停车站；更正为 `LimitedExpress`，`destination_urns` 保留列车真实终点新大阪。本站线路图不将大阪—新大阪误算为福知山线区间。
- 原有 `published_jrwest_fukuchiyama_2611_source_fleet` 的357条来源继续保持不变，其中353条为207／321／223-6000／225-6000候选，4条特急改为287／289系车型族参考；不使用289系列的具体涂装PNG去宣称当日实车，`actual_vehicle_confirmed=false`、`authorizes_png=false`。
- 只在2026年11月标记列车番号与这段时刻已验证；不确认即时位置、当日运休、实车编组或整条线路班次覆盖。数据外的2026年月份不会继续显示这几条样本。
- 迁移：`supabase/migrations/20261108224000_fukuchiyama_kounotori_3008_3010_correct_type_north_stops.sql`。
- 来源：https://timetable.jr-odekake.net/train-timetable/91081?date=20261103 、https://timetable.jr-odekake.net/train-timetable/91111?date=20261103 、https://www.jr-odekake.net/railroad/train/kounotori/

### 完成后的计数与限制
- 福知山线站点：31／31。
- `manual_timetable_templates` 来源：**387条**，其中有至少两个实际停站时刻的 **363条**，只剩 **24条** 仅有一站的历史残片。
- 上述 `363` 包含 **357条原本的历史多站记录** 和 **6条官方普通列车样本的日历版本**，不是363条均符合2026年11月实际时刻的承诺；8号、10号是在原357条上更新，不增加来源总数。
- 北段目前经验证的公开样本：3趟普通（2531M、2528M、2532M）与2趟特急（3008M、3010M）；`MH` 后缀仍是项目的土休日内部表示。
- 日历、完整性及车型可信度分开；不因少数样本齐备而标记全线 `complete` 或实时运行。


### 当晚 SVG 中 277x / 3028 / 7025 车次的实际分类与前端缓存修复

- 已对照 JR 西日本 2026 年 11 月公开列车时刻表纠正原有 SQL 来源，并同步 `published_jrwest_fukuchiyama_2611_source_fleet`，没有创建重复的规范化列车记录：
  - `2771M/MH`（原 68158／68159）、`2775M/MH`（68170／68172）、`2780M/MH`（68312／68313）从 `Local` 改为 `Rapid`（丹波路快速）；`2773M` 平日来源 68164 从 `Local` 改为 `Rapid`，土休日 2773MH 和 2782MH 原先已正确。
  - `3028M/MH` 来源 68314／68315 修为 `LimitedExpress`（こうのとり28号），保留原来三田—大阪 4 站时刻、增加北段 3 站，总计福知山—大阪 7 站；官方继续运行至新大阪。
  - `7025MH` 来源 68168 修为 `LimitedExpress`（こうのとり25号），保留原尼崎—篠山口 6 站时刻，补上大阪及北段 4 站，总计大阪—福知山 11 站；真实列车从新大阪始发。只保留 2026-11-01～11-29 的土、日、节假日白名单；**星期五虽为官网运行日，但该历史 SQL 中不存在对应平日记录，星期五仍属待补覆盖**。
  - 三条被修正为特急的历史车次，车型候选改为 `287系 / 289系`，并延续既有 `actual_vehicle_confirmed=false`、`authorizes_png=false`、`candidate_png_paths=[]`。车型族有证据不等于当日实车编组有证据。两趟特急的停站可按官网标记日期验证，实际位置仍为计划推算。
- `data/timetables/train-number-png-ranges.js` 在同一个 `verifyFukuchiyamaSourceFleet` 内复用既有严格来源 ID、日期、站序、运营日和车种检查，允许 7 个已核实特急来源以候选形式显示；并未给 287／289 任意指定实车 PNG。
- `pages/trains.html` 的懒加载脚本查询版本已使用生成器要求的 Git Blob SHA `2e09e3ef1b76`，防止移动端仍沿用旧的 `train-number-png-ranges.js` 缓存。必须遵守 `scripts/sync-page-scripts.cjs --check`，不要手工写提交 SHA 到版本参数。
- 数据库迁移：`supabase/migrations/20261108225500_fukuchiyama_correct_evening_rapid_and_kounotori.sql`；Edge Function `train-runs` v355。新增针对车型候选安全性的 CI 测试 `tests/fukuchiyama-2611-evening-mapping.test.cjs`。
- 真实线上 API 回归已于 2026-11-08 成功检查 2026-11-08、11-09、11-30 和 12-01：土休日接口 187 条，其中 7 条官方日历验证样本；平日 176 条，其中 6 条；7025M 11 月 30 日不出现、11 月的定日期特急在 12 月不出现。
- 官方来源：`https://timetable.jr-odekake.net/train-timetable/240421?date=20261023`（2771）、`https://timetable.jr-odekake.net/train-timetable/147101?date=20261101`（2775土休日）、`https://timetable.jr-odekake.net/train-timetable/240441?date=20261024`（2780）、`https://timetable.jr-odekake.net/train-timetable/200181?date=20261012`（2773）、`https://timetable.jr-odekake.net/train-timetable/145181?date=20261018`（3028）、`https://timetable.jr-odekake.net/train-timetable/200071?date=20261114`（7025）。


## 2026-11-08 最终追加：全3000／7000号段「こうのとり」车型族映射及星期五缺口

> 本节数值和现况**覆盖前文较早版本中的387条／“7025M星期五尚未处理”／只有7条特急候选**等旧描述；保留旧日志仅为审计变更历史。

### 43条残余历史误标的整族纠正
- 原来的福知山线历史 SQL 中，`3000～3099 M/MH` 与 `7000～7099 M/MH` 总计**50条来源记录**，之前7条已更正，剩余**43条**仍错误归入 `JR-West.Local` 并候选207／321／223-6000／225-6000。
- 既有原始表 `manual_timetable_templates`、`published_jrwest_fukuchiyama_2611_source_fleet` 已按同一个已知特急车次族改成 `JR-West.LimitedExpress`，候选 **`287系 / 289系`**。不生成重复车次，不修饰尚未验证的旧站点时刻。完整的日期、停站、编号证据仍需逐趟复核；旧记录继续 `undated_not_current_verified`。
- 六条已有的7000号段土休日内部 `MH` 来源仅在**2026年11月1～29日**的周六、周日、11月3日、11月23日列入予定；不是永久每日运行的普通车。**其余7000号段的星期五具体车次仍需逐趟官网核实**。
- 执行过的不可重复迁移：`supabase/migrations/20261108231000_fukuchiyama_kounotori_source_family_50_rows.sql`。车型参考总表仍是原有 **357条**；所有 `actual_vehicle_confirmed` 和 `authorizes_png` 为 `false`。

### 7025M 的四个星期五实证样本
- 官网2026年11月「こうのとり25号」信息说明运营期限为11月29日前，周五、周六和节假日。原先 `7025MH` 是土休日内部来源，无法直接作为星期五记录。
- 在相同 canonical SQL 数据层为 **2026-11-06、11-13、11-20、11-27** 建立**一条**工作日来源 `7025M`、source ID `2611087025001`；复用了早已核实的 `7025MH`（原 68168）大阪21:10→福知山23:03的**11个原始停车站**，没有额外推算时刻或扩大到12月。
- `train-runs` 严格校验来源编号、日期、车种、站序、起终点；仅在上述四日标记 `timetable_date_verified=true`。未声明实际发车、现场运转、实车编组、连续实时位置。
- 迁移：`supabase/migrations/20261108232000_fukuchiyama_7025m_friday_official_sample.sql`。

### SVG车型示意、可信度以及缓存
- `data/timetables/train-number-png-ranges.js` 仍是负责的车型验证器：在现有源ID、区间站序、运行日、列车种别、候选车型一致的条件下，将 `30xx/70xx` 作为 `kounotori-3000-7000-express-illustration`，候选只有287／289系列。
- `js/train-vehicle.js` 仅从**现有图库**选取 `images/列车/JR西日本/JR西日本_287系.png` 作为混合287／289候选的**一张287系列代表图**，不代表这趟列车确定使用287而非289；`planned=true`、`illustrative=true`、`representativeOnly=true`、`actualVehicleConfirmed=false`。图库加载失败、来源不匹配、无候选证据，安全回退圆点。
- `js/trains-render.js` 多语言无障碍说明明确显示“车辆图片：287系仅是287／289系特急车型候选中的示意，不代表当日实际车辆或编组”。
- `pages/trains.html` 对应三个懒加载脚本使用从 Git Blob 计算的版本键，避免继续展示上一次的通勤候选旧 JS；遵循 `scripts/sync-page-scripts.cjs`，不手工乱改 script 清单。
- **剩余丹波路快速与普通 M 号段**依然可能显示候选圆点：尚缺与本路线准确匹配的223系6000番台／225系6000番台图库素材及逐趟实际运用证据。不得借用不同路线／涂装车型 PNG 假装实车。北段223系5500番台候选也一样。

### 上线数据与测试
- 总手工来源数从387变为 **388**（新增一条周五7025M），旧车型参考表**357条**，其中50条为特急候选来源。
- Edge Function `train-runs` **v357 ACTIVE**。
- GitHub Actions 完整车型与图片校验：`https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42485781732` 成功；包含新 `tests/fukuchiyama-2611-kounotori-family-and-friday.test.cjs`。
- GitHub Pages 功能变更发布：`https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42485781735` 成功。
- 单次实时调用公共 API 的成功 smoke run：`https://github.com/biubiu52011/pixel-tetsudo/actions/runs/42485900088`：
  - 2026-11-08（土休日）**187条**计划记录，**28条**30xx／70xx特急候选，**7条**日期确认来源；
  - 2026-11-06（周五）**177条**计划记录，**23条**30xx／70xx特急候选，**7条**日期确认来源（其中7025M）；
  - 2026-11-09工作日不会出现临时70xx；2026-12-01不会延用11月期限定期临时70xx。
- 覆盖状态继续 `partial=true`、`complete=false`；前述187/177条并非全部具备2026年11月实际站时刻或实车确认。
