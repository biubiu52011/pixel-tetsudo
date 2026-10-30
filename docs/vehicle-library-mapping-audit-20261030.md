# Supabase 车型—PNG 映射缺口审计（2026-10-30）

本报告审查 **数据库记录是否有可追溯的车型→PNG 映射代码**，不通过文件名、运营商或运行号反推出某一列车的实际车型/编组。所有数量来自已连接 Supabase 项目 `pnupwfmgbtxqhpzsrhfn` 的当日查询及在主分支真实车型解析模块上执行的分组回放；未修改任何原始观测或候选身份记录。

## 一、图库目录 ≠ 列车身份

| 维度 | 结果 | 含义 |
| --- | ---: | --- |
| `vehicle_image_assets` | 467 | 数据库登记的图库资产行 |
| 完整 JS 运行时目录 | 598 个记录，578 个唯一 PNG 路径 | 必须 **执行** `js/train-vehicle.js` 以计入 `Object.assign`、都营车辆、图库待审和扩展注册；仅解析 `var CANONICAL_VEHICLES` 会高估缺口 |
| 数据库图片路径在完整 JS 目录可找到 | 465/467 | 图片/计划素材登记（不表示都具有可用的实名映射） |
| 真正未在代码图库登记的 SQL 图片路径 | 2 | `vehicle_image_assets.id=166`：JR E233系5000番台另一个 PNG；本型号已有另一规范图片，不可随意替换。`id=405`：伊豆急行8000系路径在当前 GitHub 仓库不存在，另有更具体的“黒排障器”素材，不能当成等价原图 |

源码里的大部分 `artwork-inventory` 项是 **待审图片资产**，不能因为路径存在就把记录升级为已确认实车。这也是此前将 293 条误称为代码缺口的根因：没有计入运行时动态生成的完整注册表。

## 二、SQL 时刻表映射层

在 `public.train_timetable_vehicle_resolution` 中：

| mapping_level | 行数 | 当前身份权限 |
| --- | ---: | --- |
| `unresolved` | 74,960 | **无**车型值 / 无来源车种规则；不可用所在路线或有图车队代判定 |
| `source_single_type_candidate` | 15,661 | 仅有一个**来源候选车型**；可用于标注为 `planned` 的时刻表参考，不能直接提升为 `EXACT` |
| `dated_schedule_rule` | 335 | 有独立日期时刻表车型映射，但还需确认当前服务日适用性 |
| `dated_operation_owner` | 64 | 有所属方时刻表规则，不能自动等同当日编组 |

以上 91,020 条的 `timetable_validity` 均为 `undated_not_current_verified`（本次快照），**没有任何一条可凭该标记证明 2026-10-30 当日的实车身份**。

`dated_schedule_rule` 中 137 条 `vehicle_artwork_path` 为空：小田急4000形75、60000形51、70000形8、1000形3。这四个车型在 JS 规范车型库中**早已登记并带正确的线路范围**。SQL 图片视图不输出它们是因为对应资产处于 `asset_scope=review` 且 `appearance_class IS NULL`，并非前端没有车型名称映射。因此 **没有绕过审核更改 SQL 视图或强行设置 PNG**。

## 三、实际逐车型回放及修复

将 `source_single_type_candidate` 与 `train_timetable_lines` 连接，得到 127 组独立的 `line_key + vehicle_type`，对应 **16,037 个线路关联**（同一 timetable 可能跨多线路，因此不等于 15,661 条不同记录）。逐组使用原版 `TrainVehicle.resolveTimetableRun` 和生产 `UNIFIED_LINES` 运营方上下文回放。

| 结果 | 修复前 | 修复后 |
| --- | ---: | ---: |
| UNKNOWN + 具备计划参考 PNG | 11,487 | **11,872** |
| UNKNOWN + 无安全计划参考 PNG | 4,550 | **4,165** |
| 候选错误晋升为实际 EXACT | 已发现代码路径可能绕过该界限 | **来源候选入口已封锁** |

已直接提交 `main`：
1. `resolveTimetableRun` 将数据库 `source_single_type_candidate` 与独立日期/实体证据分离：不再把候选的 `tt.vehicleType` 输入 `resolve()` 的确切身份池；`_sqlSourceCandidates` 继续用于生成 `PLANNED_MODEL`。`estimated` 位置可展示计划 PNG 并标记 `planned`，实时位置绝不借用。
2. `resolveTimetableVehiclePlan` 承认**已明确登记到本线路的规范 `lineAliases`** 作为跨社计划参考图片许可。以 `Rinkai` + `E233系7000番台` 为例，385 个关联从无参考 PNG 变为有 `planned` PNG；`Tojo` 或不在临海线注册的 `E235系1000番台` 仍保持无图。
3. 增加 `tools/train-sql-vehicle-mapping.test.cjs` 和 `.github/workflows/verify-train-png.yml` 中的对应 Node 回归；验证了典型候选及日期规则隔离、跨线负例和实际 PNG 投影。CI run `41045286580` 已成功。

## 四、仍缺映射的典型来源

下列均为**计划参考未映射**，不能统计成“真实列车缺失多少辆”。按本次线路关联回放排序：

| 线路 | 原始候选字符串 | 关联数 | 需要核对的边界 |
| --- | --- | ---: | --- |
| `Daishi_Tobu` | `8000系` | 438 | 当前规范车型线路作用域未明确授权该线，不能全东武通用 |
| `Seibu_Sayama` | `7000系（2026年ワンマン化）` | 258 | 未来/改造型与真实形式区别 |
| `Echigo` | `E127系` | 251 | 子系列/区段与跨线授权 |
| `KeikyuZushi` | `新1000形（4両編成）` | 215 | 4辆编组不等于特定子型/涂装 |
| `Kesennuma` | `キハ110系` | 165 | 单线来源及对应涂装/子系列 |
| `NaritaAbikoBranch` | `E231系0番台` | 160 | 线路/涂装准确性 |
| `SobuMain` | `E235系1000番台` | 118 | 目前登记 `Yokosuka/SobuRapid`，不能把 `SobuMain` 视作同一路线 |
| 新干线多个线路 | `のぞみ`、`ひかり`、`こだま` 等 | 不适用车型映射 | **这是列车服务名，不是车辆形式**；应纠正来源字段语义，不应绑定 PNG |

后续应先区分：字段语义错误、单纯别名缺失、车种子型未明确、线路未获授权、图库待审/文件失踪，以及当日实车身份来源缺失。只在证据明确且身份无歧义时为规范车型库增加映射；始终保持计划类型与实车身份分离。

## 复核 SQL

```sql
select mapping_level, count(*) as timetable_rows,
       count(*) filter (where vehicle_type is not null and vehicle_type <> '') as with_type,
       count(*) filter (where vehicle_artwork_path is not null) as with_db_artwork
from public.train_timetable_vehicle_resolution
group by mapping_level order by timetable_rows desc;

select vehicle_type, count(*) as missing_sql_art
from public.train_timetable_vehicle_resolution
where mapping_level = 'dated_schedule_rule' and vehicle_artwork_path is null
group by vehicle_type order by missing_sql_art desc;

select a.id, a.operator, a.vehicle_type, a.asset_scope, a.appearance_class, a.image_path
from public.vehicle_image_assets a
where a.id in (166,405);
```

**边界**：此次没有批量修改 `public.vehicle_image_assets`、运用观测、SQL 候选或权限策略；以上路径/身份审计需与最新仓库、最新服务日数据一起再次执行，不能永久视为当日实时车辆证明。
