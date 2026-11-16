# 都营 ODPT 实时列车号与 PNG 映射：实测前置审计（2026-11-16）

## 官方来源

- 东京都交通局 [列车位置数据](https://ckan.odpt.org/en/dataset/r_train_location-toei)：https://api-public.odpt.org/api/v4/odpt:Train?odpt:operator=odpt.Operator:Toei

- 东京都交通局 [列车时刻表](https://ckan.odpt.org/en/dataset/r_train_timetable-toei)。官方两个数据集均说明大江户线省略末尾 1/2（例如 1001A1 表示为 1001A）。

- 第三方 [四直运用资料室](https://nkth.info/traffic_info/toei/?line=a) 声称 ODPT 实时号码是四位数字，但其转换表对应 2020 年改点，不能直接证明 2026 年号码格式。

- 都营 [浅草线 2026-11-21 改点公告](https://www.kotsu.metro.tokyo.jp/pickup_information/news/subway/2026/sub_p_2026102012843_h.html)：2026-11-12 隔离区旧名单只允许用至 11 月 20 日。

## 新增只读审计工具

- `tools/audit-toei-odpt-live.cjs`：请求一次官方公开实时位置，无额外密钥；超时 12 秒，最大响应 8 MB。

- `tests/toei-odpt-number-format-audit.test.cjs`：验证原始号码、来源线路、所属方独立；不将纯数字 1008 合成 1008T；不自动将 1001A1 当作实时 1001A。

- `.github/workflows/audit-toei-odpt-live.yml`：初次添加自动运行一次，之后支持手动运行；输出 GitHub Actions Summary 和保留七日的汇总记录。没有数据库写入或生产映射更新。

- 观察器读取 `data/timetables/train-number-png-ranges.js` 原有负责人规则（经 `tools/build-train-number-png-catalog.cjs` 的 `getRows()`），不创建第二份运行真值表。

- 按浅草、三田、新宿、大江户线统计实时 Train 原始番号格式、`odpt:trainOwner`、与 2026-11 C 级 GTFS 隔离清单的逐号字面交集。

- `officialCrosswalkVerifiedCount` 固定为 0：第三方号码字面相同也不能证明官方 Train ↔ TrainTimetable 关联、特定运营日或实车车型。

- API 不通或返回格式不正确时显示 `source-unavailable` / `INCONCLUSIVE`，不能把 Actions 成功当成实时来源可用。

- 官方署名：東京都交通局・公共交通オープンデータ協議会（CC BY 4.0）。

## 本地命令

```bash
node --test tests/toei-odpt-number-format-audit.test.cjs
node tools/audit-toei-odpt-live.cjs --output /tmp/toei-odpt-observation.json
node tools/audit-toei-odpt-live.cjs --file /path/to/captured-official-trains.json
```

## 后续生产映射升级的证据门槛

1. 取得同运营日的官方 Train 与 TrainTimetable 原始响应，能复核来源时间、完整原始番号与线路。

2. 优先使用来源可验证的唯一列车 ID、日期和方向；多个候选或时刻表版本冲突时继续保持未解析。

3. 不依靠后缀、数字核心、运营商或旧第三方 2020 年转换表猜测列车番号。

4. 三田、新宿、大江户的多车型需要额外车型或车组证据；号码交集本身只能算候选，不得声称当天实车。

## 2026-11-16 官方实时快照（第二次、已修复三田线统计口径）

来源：2026-11-16 00:07:43 UTC（日本时间 09:07:43），[GitHub Actions #43778502698](https://github.com/biubiu52011/pixel-tetsudo/actions/runs/43778502698)，官方 `odpt:Train` API。

| 线路 | 实时记录 | 与既有逐号白名单相同 | 同时有 Toei 车主 | 缺失车主 | 实时车型字段存在 |

|---|---:|---:|---:|---:|---:|

| 浅草线 | 25 | 7 | 7 | 0 | 0 |

| 三田线 | 27 | 17 | 17 | 0 | 0 |

| 新宿线 | 22 | 14 | 14 | 0 | 0 |

| 大江户线 | 48 | 48 | 0 | 48 | 0 |

四线合计 122 条有线路归属的实时记录；API 返回总 148 条，另外 26 条属于非上述四线标识。此次快照 122 条记录均含字母后缀，**0 条是纯三／四位数字**，但只有单次观察，不能无限期推广。

车主按官方 realtime 字段区分：浅草 Toei 7、Keisei 12、Keikyu 4、Hokuso 2；三田 Toei 21、Sotetsu 3、Tokyu 3；新宿 Toei 14、Keio 8；大江户 48 条全部无 `odpt:trainOwner`。不得将第三方直通车套上都营 PNG。

重要修正：第一次观察器漏算已有的三田线 6300／6500 精确号码表，导致“0 命中”错报。现在将其纳入来源字段明确匹配。实时 888TC／834GA 等尾部附加字母仍不擅自合并到 888T／834G，也不生成车型。

官方运营商表与 [日本民营铁道协会直通运转说明](https://www.mintetsu.or.jp/knowledge/term/16403.html) 均支持：大江户线是例外、不参加他社直通运营。因此新的生产规则只在**实时**、来源铁路 `Toei.Oedo`、列车运营商明确为 Toei、车辆所属方字段**确实缺失**时，将线路所属方判定为 Toei；明确的他社 owner 仍拒绝。该例外**绝不授予具体车型**：因为实时完全未提供 `vehicleType`，12-000／12-600 的每一种 PNG 仍保持未解析，必须有独立车型来源。

浅草线仍只准匹配截至 2026-11-20 的号码名单。官方 2026-11-21 改点后必须重新获取新版本，不能按旧数据延长。

**本次并未创建官方号码转换表。** 这是“原始实时号码与第三方静态号码完全相等”的统计证据，而不是 `odpt:Train` 与 `odpt:TrainTimetable` 的官方唯一列车对照证据；`officialCrosswalkVerifiedCount=0` 不变。
