# 都营地下铁 GTFS 列车番号解码审计（2026-11-20 版）

## 结论

东京都交通局通过公共交通开放数据中心公开的静态 GTFS 可以解释都营 GTFS-Realtime 的 `trip_id`：其中同时包含完整列车番号和两位运用番号。旧适配器只提取 `03T` 一类运用番号并写入 `odpt:trainNumber`，使 `403T` 等现有精确番号规则无法命中。

本次只修正实时字段契约。仓库已经根据官方 TrainTimetable 维护浅草线现行名单，并完成三田、新宿和大江户线对账；本次保留这些较新的名单及车型守卫，不另建第二套运行时名册。

## 来源固定

- 数据集：东京都交通局「铁路相关信息 / Train information」
- 资源：<https://api-public.odpt.org/api/v4/files/Toei/data/Toei-Train-GTFS.zip>
- 提供者：东京都交通局、公共交通开放数据协议会
- 许可：CC BY 4.0
- `feed_version`：`20261120`
- `feed_start_date`：`20261121`
- `feed_end_date`：`20270312`
- ZIP SHA-256：`5EDCD252F2380C68CE22683BF52D4F78479D5E514303A15F4487DCF295AA55BD`

## 番号解码

现行 `trip_id` 由“线路位 + source occurrence 位 + 零填充列车番号 + 可选末尾 0”组成。

| `trip_id` | 完整列车番号 | 运用番号 |
| --- | --- | --- |
| `100403T0` | `403T` | `03T` |
| `100509TB` | `509TB` | `09T` |
| `201842G0` | `1842G` | `42G` |
| `300460K0` | `460K` | `60K` |
| `400501B0` | `501B` | `01B` |

实时适配器应把完整值写入 `odpt:trainNumber`，把两位值保留在 `odpt:operationCode`。所属方判定仍使用运用后缀；列车番号不能证明当天实际开行、具体编成或物理车号。

## 边界

- 未修改官方 TrainTimetable 名单、生产 SQL 或素材授权。
- 未写入 Supabase、部署 Edge Function 或执行 Pages 生产发布。
- 未满足已知编码契约的不透明 `trip_id` 保持原有降级路径，不伪装成完整列车番号。
