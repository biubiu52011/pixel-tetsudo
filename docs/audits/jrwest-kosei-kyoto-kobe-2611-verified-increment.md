# JR西日本 JR京都線・JR神戸線・湖西線 2026-11 数据增量（2026-11-07）

## 与旧资料的区别

本次不重复导入旧的 `Kosei-manual.js`、`TokaidoKansai-manual.js`、`SanyoMain-manual.js` 时刻；也不将历史 SQL 车次和后缀猜为正式现行编号。沿用现有 `manual_timetable_templates`、`train-runs` Edge、车辆候选和图库审查体系。

### 1. 湖西線：八条原来源逐站核验

以 JR 西日本当期发布的 1802/1804/1806/1808M 平日及土休日页面，对照原有 18 站到发时间。迁移 `20261107110000_jrwest_kosei_verified_clock_and_through_number_evidence.sql` 在 `published_jrwest_kosei_2611_verified_source_clocks` 记录 8 条：`1802M`、`1802MH`、`1804M`、`1804MH`、`1806M`、`1806MH`、`1808M`、`1808MH`。内部 `MH` 仍是历史导入的土休日标记，**公布列车番号为 `M`，绝非运营编组**。平日和土休日分别进行核对，不将不同日历的时间混为一谈。

证据只保存来源链接、版次和原始 18 站指纹；`published_jrwest_kosei_2611_clock_evidence` 按原数据重新计算 stop fingerprint，检查 18 站且官方版次及历法一致时，`train-runs` 才会把对应 source-only 单列车设为 `timetable_date_verified=true`，仍返回 `complete=false`（线路不完整），并在 `published_train_number` 给出无 `H` 的实际编号。无法匹配则拒绝，**绝不沿用指纹失效后的旧站时**。

来源：
- https://timetable.jr-odekake.net/train-timetable/322261?date=20261023
- https://timetable.jr-odekake.net/train-timetable/322421?date=20261031
- https://timetable.jr-odekake.net/train-timetable/15881?date=20261104
- https://timetable.jr-odekake.net/train-timetable/15891?date=20261101
- https://timetable.jr-odekake.net/train-timetable/15941?date=20261104
- https://timetable.jr-odekake.net/train-timetable/15951?date=20261018
- https://timetable.jr-odekake.net/train-timetable/322441?date=20261023
- https://timetable.jr-odekake.net/train-timetable/322451?date=20261024

### 2. 京都・神户・湖西跨线番号的八段官方来源

`published_jrwest_2611_crossline_number_reference` 提供以下独立证据，每段都记录官方 URL、番号、区间和同一列车服务键，但不产生位置：
- `3479M`：京都线+神户线、姬路方向 2 段（2026-11-07 土休日来源）。
- `3107M → 3507M`：近江今津中途改号，湖西线区段、经京都、大阪、神户至网干的区段共 4 条参考；不能把整个行程强行标成 `3107M`。
- `4006M`：サンダーバード 6 号的湖西线和京都－大阪 2 段（车型未根据车次断言）。

官方例：
- https://timetable.jr-odekake.net/train-timetable/208221?date=20261107
- https://timetable.jr-odekake.net/train-timetable/145282?date=20261107
- https://timetable.jr-odekake.net/train-timetable/258161?date=20261103

`train-runs` 的 `jrwest_official_number_references` 字段对符合历法的分段返回证据；**独立来源编号不允许产生列车位置**（`authorizes_position=false`）、不允许承认站时（`stop_clocks_verified=false`），也不能自动拼合历史复合 ID。该字段与正常的 `runs` 完全分开。

### 3. 车辆图标与剩余缺口

- 本轮**没有**为 207／321／223／225／221／521 或 681／683 做任意分车次 PNG 指派。既有 58 条京阪神和 179 条湖西候选族映射保留，但它们不是当日物理编组。
- 223/225 既有图库素材作用范围不是京阪神和湖西，不得跨涂装拿来当确定图标；无授权路径时渲染既有中性 SVG 标记。
- 当前仍需逐条匹配 JR 官方全月上下行、全部车次的番号、停站与时刻。京都／神户线仅建有历史部分段；湖西线旧 179 条不能自动算 2026 年 11 月的完整列车；サンダーバード全班次及 9017D 特殊车日历仍待分别核实。**不能把本次有限增量称作全线数据完成。**
- 无新增远程请求循环、无新前端脚本，无重复线路表；查询沿用原 `train-runs` 入口与既有车辆候选准入规则。

## 验证

在目标 Supabase `pnupwfmgbtxqhpzsrhfn` 已执行本迁移并查询：八条 `clock_evidence` 的 `verified_source_match=true`，另八条 `crossline_number_reference` 的编号证据约束均通过；随后部署 `train-runs` v330。

注意：全量官方时刻表依法不得擅自复制传播。本次的证据不再复制官方完整时刻表，而是比对现有站时后保留必要的校验元数据。
