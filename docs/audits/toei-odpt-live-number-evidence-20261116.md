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
