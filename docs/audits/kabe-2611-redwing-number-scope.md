# 可部線 2026-11 番号・227系 Red Wing 映射审计

## 线路与现行车辆

- 内部 key：`Kabe`，铁路 URN `odpt.Railway:JR-West.Kabe`。
- 实际运营核心是 **横川—あき亀山**，JR 西日本时刻表提供 **广岛—あき亀山**的贯通时刻，包含新白岛、横川、可部、河户帆待川、あき亀山等站。
- JR 西日本 [2018-12-14 发布的 2019 年春改正公告](https://www.westjr.co.jp/press/article/items/181214_00_hiroshima.pdf) 说明，山阳线广岛地区、吴线和**可部线全列车改为 227系 Red Wing**，不是特定车次的编组编号证据。
- 本仓库仅有 `images/列车/JR西日本/JR西日本_227系_WK.png`，这是**和歌山 WK** 图片，图库只授予 `Hanwa`、`KiseiWest`，对 `Kabe` 不授权。不能因为车型同为 227 系而展示错误配色。现阶段中性列车 SVG（仅限有真实位置证据的服务）。

## SQL 基线：旧的 87 条不可作为 2026 年时刻

原 `manual_timetable_templates` 中 `Kabe` 为 87 行、`Weekday=54`、`SaturdayHoliday=33`；全为 `source_only`、`undated_not_current_verified`，没有车辆型号标签，原始来源 `data/timetables/Kabe-manual.js`。

所有 87 条都符合以下**异常且完整一致**的规律：
1. 仅包含 **横川—可部 12 站**；缺少目前可部延伸至河户帆待川、あき亀山的站点，也缺少广岛、新白岛。
2. 列车编号为 `7001M`—`7087MH`，其中 `MH` 仅出现在旧土休日模板，不等于车型；与官方现行 `7xxM/27xxM` 番号系统不一致。
3. 所有样本前 10 段站间时刻固定相差 4 分钟，末段固定为 3 分钟，具有明显的统一生成网格特征。不能用这种数值制造真实 2026 列车位置。

**处理：** 保存到新 SQL 表 `published_jrwest_kabe_2611_source_quarantine`（87 条），校验原始站序、番号、历法与 4 分钟网格。强制 `authorizes_2611_position=false`、`authorizes_png=false`、`number_date_verified=false`、`actual_vehicle_confirmed=false`。没有改动或删除原始数据库记录。

## 来源可信的 3 条官方番号参考（不推算列车位置）

JR 西日本官方网站所显示的 `JR时刻表 2026年11月号` 个别列车页面：

| 公开番号 | 运营日类别 | 来源 |
| --- | --- | --- |
| `740M` | 土休日 | [JR 官方详情](https://timetable.jr-odekake.net/train-timetable/139551?date=20261031) |
| `866M` | 每日 | [JR 官方详情](https://timetable.jr-odekake.net/train-timetable/140121?date=20261031) |
| `868M` | 每日 | [JR 官方详情](https://timetable.jr-odekake.net/train-timetable/140131?date=20261031) |

3 条保存在 `published_jrwest_kabe_2611_number_reference`。来源查询日期为 **2026-10-31**、根据 2026年11月号；现阶段不宣称逐条通过 **2026-11-07 当天运营核验**。仅保存番号、范围、出处、车型群候选，不复制商业时刻表的详细停站时分。

注意：不同地区可能也有相同 `866M/868M`，不能用**番号单独**映射，不得跨线路判断为可部线。

## Edge Function 与前端防护

- `train-runs/index.ts` 识别 2026 年 11 月的 Kabe 旧 SQL 来源，按历法严格核对 54/33 条原模板与隔离表、官方番号参考、车型与图片的禁用标志；返回 `LEGACY_SYNTHETIC_CLOCKS_QUARANTINED`，`runs=[]`，`no_service_confirmed=false`。这表示**旧来源无法核实现行行车位置**，不是可部线当日停运。
- 新响应含 `official_number_fleet_references`，平日仅有 `866M,868M`，土休日可有 `740M,866M,868M`，并仍然全部禁用 PNG 及虚构行车时刻。
- `js/train-position-estimator.js` 在客户端额外拒绝旧缓存的 `7001M`–`7087MH` 列车，不能回流成为 ghost train。
- `major-vehicle-fleet-presets.js` 原本已对 Kabe、Kure 注册 `JR西日本227系0番台` 线路级车型，不再重复生成第二份车型判定脚本或把 WK 图片错误加入 Kabe。
- 不触及其他地区的 `SanyoMain`、`Kure`、`Kosei` 旧模板与既有车号映射。

## 待补齐

1. 以**日期明确的 2026 年11月**官方可部线时刻数据（依法可复用的来源）建立真正的全线列车与站间位置来源，包括广岛—横川、可部—あき亀山延伸，不能从 12 站旧模板补时。
2. 建立可部线 227系 Red Wing 的正确授权像素 PNG（非和歌山 WK）；没有正确素材前不可输出已确定 PNG。
3. 如要跨线接续吴线／山阳线，应依据**同一官方列车番号、前后站、时间和真实贯通证据**，不得仅用广岛站临近时间猜测。
