# 湖西線 2611 车型候选、番号与时刻来源审计

## 线路边界

内部 key 为 `Kosei`，原始 `railway_urn=odpt.Railway:JR-West.Kosei`。湖西线本线山科—近江塩津；项目还有京都—山科的接续显示，北端部分车次在近江塩津转北陆本线至敦贺，但历史 SQL 最北仅 **近江塩津**，绝不能从本表凭空生成敦贺／新疋田的行车时刻。

- 官方 [JR西日本湖西线列车走行位置](https://www.train-guide.westjr.co.jp/kosei.html) 显示近江塩津—山科/京都站序、快速/新快速/部分特急。
- [2026 年 11 月 7 日敦贺駅官方时刻表](https://timetable.jr-odekake.net/station-timetable/2635014001?date=20261107) 有大阪方向直通新快速/快速与サンダーバード等，不代表历史 180 个车次已经逐个匹配当日实运番号。
- [JR 西日本车辆系谱](https://www.westjr.co.jp/fan/paper/local/) 有 221/223/225；[湖西线资料](https://train.mi-ktt.ne.jp/rosen/koseisen/) 对北段 521 系有线路级参考。另有 [2026-03 改正湖西线实务资料](https://express22.xsrv.jp/maintarminal/jrkoseilinedia-20260314/)。

## 现有 SQL 180 条：别把 H 当车型

`manual_timetable_templates` 共 180 行，`Weekday=90`、`SaturdayHoliday=90`。全部 `source_only`、`undated_not_current_verified`，`vehicle_type_label IS NULL`，`source_path=data/timetables/Kosei-manual.js`。

- 平日历史来源 `1802M`、`3107M`、`4840M` 等；
- 周末历史来源 `1802MH`、`3145MH`、`4840MH` 等——末尾 **H 是来源表对土休日的附注标记**。在页面同时保留原始 source number 和仅供参考的 `M` 号码，绝不把 `MH` 拆成另一辆车、也不从 `3145M` 推断物理编组。
- 周末唯一 `9017DH` **被来源误标为 Local**。JR 西日本[2026年9月官方临时列车表](https://timetable.jr-odekake.net/train-timetable/385191?date=20260927) 将 `9017D` 作为「はなあかり」特急之一，只在指定运营日开行。即使来源里有 `9017DH` 和一些旧站时，也不能直接当 2026-11 普通车、也不能擅自宣称 11 月有这个特别列车，因此 **不进入本次 179 行普通/快速映射**。

## 车型候选而非实际编组

| 服务与来源位置 | SQL 行数 | 官方／地区级候选 | PNG 处理 |
| --- | ---: | --- | --- |
| 近江今津以北短区间普通 | 16 | 223／225／521 | 本线未授权 PNG |
| 其他普通 | 125 | 221／223／225 | 本线未授权 PNG |
| 快速 | 4 | 223／225 | 本线未授权 PNG |
| 新快速 | 34 | 223／225 | 本线未授权 PNG |
| **合计** | **179** | **候选而非确定车型** | **单一中性 SVG 位置** |

不能把北段 521 号段推广到京都—堅田普通段，也不能根据 221/223/225 列车型谱去推测每个号码的编组。图库 `VehicleGaragePngMap.lineModels('Kosei')` 目前只包含 **681/683系特急车型 PNG**，不允许拿它们代替普通、快速、新快速。JR 京都／神户线与阪和线的其他车型 PNG 同理不能跨涂装引用。

### 特急「サンダーバード」

[2026年10月定期时刻表](https://jr-group.jp/thunderbird-timetable/)列出 Osaka—Tsuruga 的当期特急，与 [官方 2026-11 敦贺车站时刻](https://timetable.jr-odekake.net/station-timetable/2635014001?date=20261107)相容；历史湖西线 **180 行完全没有 LimitedExpress 类别**。因此特急不能从普通/快速 `M/MH` 号码推算，现阶段仅保留项目已登记的 681/683 系图库和独立证据通道，未构造缺失的特急停站或车号。

## 本轮迁移与运行时

- SQL `published_jrwest_kosei_2611_source_fleet` 新增 179 source_template_id 唯一的历史来源候选表，保存源/参考编号、日历、站序、方向、JR-West 车型候选；所有 `number_date_verified=false`、`actual_vehicle_confirmed=false`、`authorizes_png=false`、`reference_only=true`，RLS 启用。
- `train-runs/index.ts` 按日历读取 90 平日 / 89 土休日，严格核对已有 22 站顺序、原始铁路 URN、M/MH 日历与车型；任何缺失、变形或 `9017DH` 在来源模式中 fail-closed，不会自动画成普通车。
- `train-number-png-ranges.js` 添加 `verifyKoseiSourceFleet`；前端估算器与像素图渲染仅标示一个无 PNG 的混合车型候选，真实编组必须有另一份独立实时证据才能核实。
- 不更改 `TokaidoKansai`、`SanyoMain` 或其他线路的编号规则。未证实的完整 2026-11 站时与跨线直通不冒充实时。

## 下一阶段缺口

1. 以 JR 西日本 2026-11 日期页逐条核验 **实际公共番号与各站时刻**，而不是沿用来源表 M/MH 标识。
2. 独立为サンダーバード校验特急号次与停站（仍不可由特急名直接推断物理编组）。
3. 收集合法的 Kosei 实际涂装 221／223／225／521 像素图，复用现有图库注册体系；若是暂时缺失，保持中性 SVG。
