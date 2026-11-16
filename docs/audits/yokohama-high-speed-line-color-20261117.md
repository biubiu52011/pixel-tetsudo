# 横浜高速鉄道线路色审计修复 — 2026-11-17

## 审计范围
- 横浜高速鉄道的みなとみらい線：独立运营线路 `MinatoMirai`，乘客线路代号 `MM`。
- こどもの国線：横浜高速鉄道作为第三种铁路事业者持有轨道设施和车辆；東急電鉄作为第二种铁路事业者承担客运运营。项目线路 `TokyuKodomonokuni` 继续归入 `Tokyu` 的运行和线路列表，不应因设施所有权而改其 `operator` 字段。

## 检查与处理
| 线路 | 修复前基础色 | 现有展示色 | 修复后基础色 | 代号 | 运营商归属 |
|---|---|---|---|---|---|
| みなとみらい線 | `#00B6C7` | `#003399` | `#003399` | MM | MinatoMirai |
| こどもの国線 | `#0068b7` | `#0068b7` | 不变 | KD | Tokyu |

- みなとみらい線的线路色类别为蓝色系；`#003399` 是项目现有的深蓝色展示色，不宣称为官方精确 HEX。
- 仅修改 `data/core/railway_data.json` 中 `MinatoMirai.color`；保留 `presentation.color`、编号、六站顺序、直通关系、线路图标和运营字段。
- 同步重新生成 `railway_data.compact.json` 和 `railway-data.file.js`；更新 db-loader 和 7 个页面的内容 SHA 缓存版本，防止 GitHub Pages 上继续加载旧配色。
- `data/audits/railway-metadata-known-gaps-20261117.json` 移除 `MinatoMirai` 待审配色差异，未审核差异数量为 29；历史 `20261116` 快照不改。
- 不调整 Supabase SQL、GTFS、ODPT 及车辆 PNG 规则。

## 资料
- 横浜高速鉄道官方线路图：https://www.mm21railway.co.jp/info/route_map.html
- 横浜高速鉄道关于こどもの国線的运营关系：https://www.mm21railway.co.jp/info/kodomo.html
- 横浜市关于第三种与第二种铁路事业者的说明：https://www.city.yokohama.lg.jp/kurashi/machizukuri-kankyo/kotsu/tetsudo/kodomo.html

## 回归
- `node data/core/generate-all.js --check`
- `node scripts/sync-page-scripts.cjs --check`
- `node --test tests/minatomirai-line-color-20261117.test.cjs tests/railway-metadata-audit.test.cjs`
