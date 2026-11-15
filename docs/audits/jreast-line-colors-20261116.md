# JR 东日本线路色审计及修订（2026-11-16）

## 范围与事实来源

- 共检查 `JR-East` 的 91 条记录（含分支、直通和新干线）。原始数据与 `railway_data.compact.json`、`railway-data.file.js` 同步，属于**同一份事实**，不另加运行时补丁。
- 采用旅客线路识别色与车站乘车方向导向色，不直接套用列车涂装。JR 官方的**车内路网示意图配色**可能与站名标识别色不同。例如内房线在房总车内线路图是黄色，但用于线路识别的既有方案是天蓝色；日光线现有酒红色不应凭车内图中的橙色改掉。
- 色值为参考官方视觉及公开线路色汇总的**近似 HEX**，不是 JR 公开发布的精确 Pantone/RGB 标准。

## 数值修正

- 审计前 `color` 与 `presentation.color` 不一致：45；修订后：0。
- 变更了 56 条 JR-East 记录的基础 `color`；其中部分同时更正了 `presentation.color`。更正过的关键路线包括京滨区域与地方铁路、新干线方向导向色。
- 对 `Shinetsu`（信越本线）等具有不同区间线路识别色的跨地区路线维持原值，待逐区间方案落地后才能精细分段；常磐线已有分段配色规则原样保留。

### 所有本次变更的线路

| lineId | 线路 | 原 `color` | 新 `color` |
|---|---|---|---|
| `ShonanShinjuku` | 湘南新宿ライン | `#e71112` | `#e21f26` |
| `Tsurumi` | 鶴見線 | `#ffd400` | `#f2d01f` |
| `Yamanote` | 山手線 | `#99cc00` | `#9acd32` |
| `Agatsuma` | 吾妻線 | `#00A050` | `#0f5474` |
| `BanetsuEast` | 磐越東線 | `#F15A22` | `#c71585` |
| `BanetsuWest` | 磐越西線 | `#9966FF` | `#cb7b35` |
| `Echigo` | 越後線 | `#FF6699` | `#40934d` |
| `Gono` | 五能線 | `#9966FF` | `#0a7aab` |
| `Hachinohe` | 八戸線 | `#FF6B35` | `#e93920` |
| `Hakushin` | 白新線 | `#4A90D9` | `#f380b7` |
| `Iiyama` | 飯山線 | `#A8D8A8` | `#7bc24b` |
| `Ishinomaki` | 石巻線 | `#D4A574` | `#ed77a4` |
| `Joetsu` | 上越線 | `#00CED1` | `#00b3e6` |
| `Kamaishi` | 釜石線 | `#7EB5D6` | `#0073bf` |
| `Kitakami` | 北上線 | `#B8E6B8` | `#851a72` |
| `Karasuyama` | 烏山線 | `#E07B7B` | `#339966` |
| `Kashima` | 鹿島線 | `#FF8C00` | `#c56e2e` |
| `Kawagoe` | 川越線 | `#00ac47` | `#808080` |
| `Kesennuma` | 気仙沼線 | `#A8C8E8` | `#3b459b` |
| `Komii` | 小海線 | `#C8A8D8` | `#41934c` |
| `Kounan` | 花輪線 | `#E8A87C` | `#aa1e30` |
| `Kururi` | 久留里線 | `#4B0082` | `#00b5ad` |
| `Mito` | 水戸線 | `#0096C8` | `#3333ff` |
| `Miyo` | 弥彦線 | `#8B0000` | `#922790` |
| `Ofunato` | 大船渡線 | `#E07B7B` | `#f18e44` |
| `Oga` | 男鹿線 | `#E6A817` | `#36823e` |
| `Oito` | 大糸線 | `#8B4513` | `#9370db` |
| `Ominato` | 大湊線 | `#4169E1` | `#f1aa28` |
| `OuMain` | 奥羽本線 | `#0066CC` | `#ee7b28` |
| `RikutoEast` | 陸羽東線 | `#00AA66` | `#888888` |
| `RikutsuWest` | 陸羽西線 | `#008844` | `#6fbf7f` |
| `Ryomo` | 両毛線 | `#FF69B4` | `#ffd400` |
| `Sagami` | 相模線 | `#00a3af` | `#009793` |
| `Yamada` | 山田線 | `#FF1493` | `#cd7a1e` |
| `Senseki` | 仙石線 | `#00AA00` | `#00aaee` |
| `SensekiTohoku` | 仙石東北ライン | `#00A0E8` | `#80c900` |
| `Senzan` | 仙山線 | `#9370DB` | `#72bc4a` |
| `Shinonoi` | 篠ノ井線 | `#00732f` | `#d56a29` |
| `Sotobo` | 外房線 | `#F22335` | `#dc4532` |
| `Suigun` | 水郡線 | `#006400` | `#368c44` |
| `Tazawako` | 田沢湖線 | `#4169E1` | `#9d72b0` |
| `Tsugaru` | 津軽線 | `#D32F2F` | `#15a2c4` |
| `Uchibo` | 内房線 | `#0071C5` | `#00b2e5` |
| `Uetsu` | 羽越本線 | `#006699` | `#16c0e9` |
| `Yamagata` | 山形線 | `#00AA00` | `#ee7b28` |
| `Yonezawa` | 米坂線 | `#D32F2F` | `#9b7eb9` |
| `ChuoMain` | 中央本線 | `#0073bf` | `#007ac0` |
| `Tadami` | 只見線 | `#2E8B57` | `#008dd1` |
| `Togane` | 東金線 | `#B31C31` | `#f15f2b` |
| `TohokuShinkansen` | 東北新幹線 | `#00b2e5` | `#008000` |
| `JoetsuShinkansen` | 上越新幹線 | `#00a7e1` | `#ff978e` |
| `HokurikuShinkansen` | 北陸新幹線 | `#00b2e5` | `#6a3d98` |
| `YamagataShinkansen` | 山形新幹線 | `#e60012` | `#f68b1e` |
| `AkitaShinkansen` | 秋田新幹線 | `#e60012` | `#e3007f` |
| `SotetsuJRDirect` | 相鉄線直通（JR接続区間） | `#00ac47` | `#00ac9a` |
| `Yahiko` | 弥彦線 | `#3366CC` | `#922790` |

## 本次独立核实的关键区别

- 内房 `#00b2e5`、外房 `#dc4532`、东金 `#f15f2b`，采用车站线路识别色；总武本线黄色 `#fcc60d` 与日光线酒红 `#880033` 保持不变。房总官方车内图另有用于视觉布局的黄/绿/橙/灰等，不视作更权威的 HEX 规定。
- 五条新干线在页面使用乘客乘车方向识别色：东北 `#008000`、上越 `#ff978e`、北陆 `#6a3d98`、山形 `#f68b1e`、秋田 `#e3007f`。不同 JR 官方线路图可能使用其他颜色示意相同线路。
- 川越—高丽川段从错误绿色恢复灰色，不再显示 JA；JA 应保留给埼京线及川越线大宫—川越系统。
- 修正内房/外房的 `code` 字段互换；弥彦线 `Miyo`、`Yahiko` 两个历史 ID 颜色统一，但本次为避免破坏线路引用没有合并 ID。

## 依据与局限

- JR 东日本官方线路图索引（2026-10-23）：https://www.jreast.co.jp/map/
- JR 东日本《南東北路線図》（配色类别）：https://www.jreast.co.jp/map/pdf/minamitohoku.pdf
- JR 东日本《総武・房総路線図》（车内示意色，2024.3）：https://www.jreast.co.jp/chiba/pdf/soubu.pdf
- JR 东日本《東京近郊路線ネットワーク》（车内示意色，2024.3）：https://www.jreast.co.jp/map/pdf/map_tokyo.pdf
- JR 东日本秋田支社线路图（配色类别，2016.3）：https://www.jreast.co.jp/akita/news/pdf/rosenzu.pdf
- JR 东日本 2025 新干线旅游图（颜色类别因图而异）：https://www.jreast.co.jp/tc/downloads/pdf/multi_pass_tc.pdf
- 日本线路色汇总（非官方 HEX 交叉比对）：https://ayaito.net/webtips/color_code/164/amp/

## 完整性

- 只更改线路色、已经错位的内房/外房内部 `code`、川越—高丽川的 JA 展示字段；未改变站序、位置接口、车辆映射和时刻表。
- 新增 `tests/jreast-line-colors-20261116.test.cjs`；保留旧 `tests/jr-line-colors-20261109.test.cjs` 的生成物一致性与各页面缓存哈希校验。
