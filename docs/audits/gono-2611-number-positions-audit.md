# 五能線 2026-11 官方车号、数据准入与列车可见性审计

**2026-11-05（JST）** 检查源：JR 东日本 2611 线路页
[平日上行](https://timetables.jreast.co.jp/2611/timetable-v/275u1.html) /
[土休日上行](https://timetables.jreast.co.jp/2611/timetable-v/275u2.html) /
[平日下行](https://timetables.jreast.co.jp/2611/timetable-v/275d1.html) /
[土休日下行](https://timetables.jreast.co.jp/2611/timetable-v/275d2.html)。
「上行」是川部→東能代，「下行」是東能代→川部。

## 数据库和代码缺口（与「没有车号」的感受不同）

Supabase `manual_timetable_templates` 的 `Gono` 存储 122 条模板：平日上行 29／下行 32，土休日相同。
每条已有完整番号和至少两处有时刻的站点停靠，`train_timetable_source_resolution` 122/122
已关联 canonical ID；但来源 `source_revision_date` 为 NULL，审查状态为
`pending_source_edition_verification`。浏览器仍可在合法窗口显示 **预计计划位置**，
不应误报为实时列车，也不应声称全部站时刻已完成 2611 当前版本核验。
此外旧来源把所有 Gono 车都标为 `Local` 和 GV-E400，**错误涵盖 Resort Shirakami**。
源车次 `8621D..8626D/8631D/8635D` 仅在奥羽本线分段运行，
在五能线总图仅有 0/1 个边界站，不应凭同线导入被当成五能线内的列车。

## 精确的 11 月 Gono 线主线运行段

**普通/一般快速 47 个**（上行 23、下行 24）：
- 上行：122D、124D、320D、126D、128D、620D、322D、822D、3524D、3526D、224D、326D、2826D、2828D、130D、132D、134D、2830D、328D、832D、2834D、836D、838D
- 下行：821D、2823D、825D、321D、623D、827D、123D、125D、2525D、2529D、127D、2531D、2533D、223D、2835D、837D、323D、2839D、131D、325D、133D、225D、135D、137D
- 其中 `3524D`、`3526D` 是快速，其他普通；
  **全都使用现有 `GV-E400系.png` 计划参考图片**。JR 东日本官方
  [2021年改正资料](https://www.jreast.co.jp/press/2020/akita/20201218_a01.pdf)
  明确五能线「普通・快速」均为 GV-E400、观光列车例外。
  计划参考不证明实际车号/编成。

**Resort Shirakami 六个五能线主线段番号**（`8521D..8526D`）：
`8521D`=1号／下行，`8522D`=2号／上行，
`8523D`=3号／下行，`8524D`=4号／上行，
`8525D`=5号／下行，`8526D`=6号／上行。
依照 JR 东日本[2026年11月车型与运转日日历](https://www.jreast.co.jp/train/fun/shirakami.html)：
- 1号：青池 1–9 日、くまげら 10–13 日、橅 14–30 日。
- 2号：橅 1–13 日、青池 14–30 日。
- 3号：くまげら 1–9 和14–30 日，**10–13日无车**。
- 4号：青池 1–9 日、くまげら 10–13 日、橅 14–30 日。
- 5号：橅 1–12 日、青池 13–30 日。
- 6号：くまげら 1–9 和14–30 日，**10–13日无车**。

2026-11 的上述车型和服务日由官方核验，但仓库中橅两张前脸目前处于
`pending-source-review`，青池/くまげら均无获准匹配的对应前脸 PNG。
**不允许从文字推定具体车头、借 GV-E400 或使用橅替代青池/くまげら**。
其列车番号及时间窗口可以显示，但车辆保持中性圆点。

## 新增运行时保护与修复

- 定义 `JREastGonoNumberIndex202611.verify`，将导入模板比对 **2611 来源线路、完整番号、方向、服务日历、实际运行日期**。
  运行时不从官方列车表推算不存在于 SQL 的站时刻，更不会额外生成列车。
- `TrainPositionEstimator` 使用这个索引，避免把仅奥羽本线的号码投影到五能线，
  将 2 个一般快速及观光列车的 SQL 错误 Local 类型纠正为计划列车的 `Rapid`；
  对指定日期不开行的 3/6 号阻止幻影位置。
- 官方 Gono站点 `Omaigoshi` / `Henashi` 对应目前画图站点
  `Omagoshi` / `Tomosaki`，仅在 **Gono 的计划站点索引**中进行别名兼容。
  不改地图布局，也不扩散到其他铁路。
- 车辆图仅为 47 个普通/一般快速的既有 GV-E400 PNG，
  `planned:true`、`vehicleIdentityStatus=UNKNOWN`；且不会用作实际编组证明。
- SQL 仍保留历史来源、时刻及 `pending_source_edition_verification` 状态，
  本轮没把未核验站时刻提升为认证当前时刻，也没修改其他线路、弹窗、无关文本或设置。

## 2026-11-05 运行时二次校正（页面实际加载与用户可见车辆）

**这次修复的是此前已有官方车次索引没有真正载入页面的问题**。旧 `pages/trains.html` 漏掉
`jreast-gono-2611-number-index.js`，而其他最近添加的 regional index 和核心车辆脚本的
`?v=` 参数是 `20261105-regional` 等任意字串。当前
`js/trains-detail-loader.js` **严格要求 12 位十六进制缓存指纹**；
不满足将抛出 `Invalid train asset URL`，导致整个线路详情加载失败。

本次同步 `scripts/page-scripts.json` 与 `pages/trains.html`，
将 Gono 索引明确限定 `data-line-scope="Gono"`，
同时把此前 9 个 regional index 收编进入统一脚本清单；
页面的所有懒加载 URL 恢复为各源码 Git blob SHA 的前 12 位。
此处**只改资源加载与核验，不改 home CSS、线路顺序或地图**。

在计划位置 / 图标层新增二次防护：

- 2026 年 11 月 Gono SQL 无法加载官方索引时**直接拒绝推定**，
  而不是使用 122 条历史 SQL 误画不存在的列车。
- 五能线 47 个普通／一般快速既有 GV-E400 PNG 现在在获取车型图前
  **再次验证官方 2611 编号、来源铁路、方向、平日／土休日、日期与车型种别**。
  11 月 3 日、23 日为日本国定假日，强制采用土休日模板；
  只凭正确的番号不能绕过日期核验。
- 6 个 `8521D`～`8526D`「リゾートしらかみ」继续**不用 GV-E400 车头**。
  由于旧 SQL `vehicle_type_label=GV-E400系` 也错覆到它们，运行时使用
  JR 东日本[官方 2026 年 11 月编组日历](https://www.jreast.co.jp/railway/joyful/shirakami.html)
  的确切文字取代乘客可见的错误车型候选：
  `青池→HB-E300系（青池）`、
  `橅→HB-E300系（橅）`、
  `くまげら→キハ48形（くまげら）`。
  `publishedFleetReference` 属于 **官方计划车型的说明文字**，
  `vehicleIdentityStatus` 仍是 `UNKNOWN`，不能写成实车号或当天实际编组。
- 地图悬浮信息和折叠列表会显示官方计划车型／涂装名称；
  仓库中两张「橅」车头虽已有明确文件名但仍属于
  `pending-source-review`，没有完成可确认的美术审查；
  不能擅自解除限制。青池/くまげら也没有通过对应图片校验。
  **三种特别编组一律保持中性位置点，不混用别的列车 PNG**。
- 11 月 6 日及 7 日的[官方强风提示](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=gonoline)
  是可能延误／停运的预警，**不是已证实全部停运**：
  不因预测自动删除这些日期的所有计划车次，
  真正的运行中断由实时运行情报单独反映。
- 原始 SQL 的 `source_revision_date` 为 NULL，站点时刻仍未逐站完成
  2026-11 官方修订核验。页面输出为 `estimated:true`、
  `timetableDateVerified:false`，不是实时 GPS。

对应回归测试：
`node --test tests/gono-2611-number-schedule.test.cjs`，
覆盖 47 个原图映射、六个观光列车的车型日期、节假日日历、
全程 SQL 模拟中修正错误候选、PNG 中性回退、
`Gono` 懒加载入口与 12 位缓存键。
