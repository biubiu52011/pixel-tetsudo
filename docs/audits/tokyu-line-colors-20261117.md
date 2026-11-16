# 東急電鉄线路色审计与修复 — 2026-11-17

## 已处理
- 9 条東急 canonical 线路中 8 条的 `color` 与 `presentation.color` 不一致；现已全部一致。
- 使用**原先已上线的 passenger presentation 色**统一基础色，避免修改正确的前端显示配色；`TokyuShinYokohama` 原有两字段一致，无需修改。
- `TokyuDenEn` 基础 `code` 修正 `TD` → `DT`；`TokyuTamagawa` 修正 `TTM` → `TM`。
- 原有 canonical ID、ODPT source identity、站序、行车与车辆数据不动。
- 网站 HEX 不是東急官方发布的精确 CSS 规格；以東急官方线路图确认线路色类别与乘客记号。

| ID | 线路 | 代号 | 统一网站颜色 |
|---|---|---|---|
| `TokyuToyoko` | 東横線 | TY | `#da0442` |
| `TokyuMeguro` | 目黒線 | MG | `#009cd2` |
| `TokyuShinYokohama` | 東急新横浜線 | SH | `#6F2C91` |
| `TokyuDenEn` | 田園都市線 | DT | `#00a850` |
| `TokyuOimachi` | 大井町線 | OM | `#f18c43` |
| `TokyuIkegami` | 池上線 | IK | `#ee86a7` |
| `TokyuTamagawa` | 東急多摩川線 | TM | `#ae0378` |
| `TokyuSetagaya` | 世田谷線 | SG | `#fcc70d` |
| `TokyuKodomonokuni` | こどもの国線 | KD | `#0068b7` |

## 责任边界与测试
- 权威源：`data/core/railway_data.json`；同步生成 `data/core/railway_data.compact.json`、`data/core/railway-data.file.js`。
- 旧快照 `data/audits/railway-metadata-known-gaps-20261116.json` 保持不动；新快照 `data/audits/railway-metadata-known-gaps-20261117.json` 移除 8 条已修复東急色差，剩余 30 条其他线路待审。
- 审计工具及测试指向新基线；新建 `tests/tokyu-line-colors-20261117.test.cjs`。
- 保持 `MinatoMirai` 作为横浜高速鉄道的独立运营者，不更改其颜色和线路身份；Supabase `railway_lines` 无颜色字段，不改库。

## 检查命令
`node data/core/generate-all.js --check`
`node --test tests/tokyu-line-colors-20261117.test.cjs tests/railway-metadata-audit.test.cjs`

资料：
- https://www.tokyu.co.jp/railway/map/
- https://www.tokyu.co.jp/global/assets/rosen-chinese_sc.pdf
- https://ayaito.net/webtips/color_code/12224/
