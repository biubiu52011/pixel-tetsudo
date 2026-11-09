# JR缺失线路与虚假连通修复记录 — 2026-11-09

## 已修改并有明确官方依据的范围

权威源: data/core/railway_data.json。所有生成的 JSON / script 版本必须同步，禁止另加运行时覆盖表、重复列车或虚构到发。

### 支线实体（3条新增前端线）
| parent | new route ID | 真实站序 | 修复 |
|---|---|---|---|
| SanyoMain | SanyoWadamisaki | Hyougo→Wada-Misaki | 不再把和田岬插在兵库与新长田之间 |
| Hanwa | HanwaHagoromo | Otori→Higashi-Hagoromo | 不再把东羽衣插在凤与富木之间 |
| SaninMain | SaninSenzaki | Nagato-Shi→Senzaki | 不再把仙崎插在长门市与黄波户之间 |

所有 junction 与终点都是已有的 canonical station ID 和坐标，branchOf 指向已存在的主线，线路图不创建额外真实线路图标；新支线暂无数据库完整时刻表。沿用旧源近似站间时长，但标记 sourceQuality=topology_verified_times_approximate，不能将该时长当作实际列车时刻。

依据：JR西日本官方:
- 和田岬站 https://timetable.jr-odekake.net/station-timetable/2871022001
- 羽衣线区间 https://timetable.jr-odekake.net/line-timetable/2284
- 仙崎支线: 山阴本线长门市—仙崎，车站个别时刻需再单列核对。

### 从铁路地图移除不属于铁路的后缀
- KansaiMain: 线路到 JR难波(J-R-Nanba) 截止，旧数据插入的大正→大阪是大阪环状线直通，并非关西本线物理轨道。直通关系在原 throughServices/serviceBoundaries 留存，不新增臆测线路。
- Kesennuma: 铁路只保留 Maeyachi→Yanagitsu 共6站。其余气仙沼方向BRT仍留在历史SQL中，不得由铁路位置估算器按列车显示。
- Ofunato: 铁路只保留 Ichinoseki→Kesennuma 共14站。Kesennuma→Sakari 是 BRT，原 SQL BRT source 不删除。
- Hitahikosan: 铁路只保留 Kokura→Soeda（JRW-Hitahikosan-1191418）共16站。Soeda→Hita 为BRTひこぼしライン。日田BRT原始站点仍保留在站点坐标及名称数据库，不标成铁路。

官方:
- JR东日本 气仙沼线2026年11月 https://timetables.jreast.co.jp/2611/timetable/tt1585/1585020.html
- JR东日本 既有气仙沼线/大船渡线轨道与BRT审计 docs/audits/kesennuma-2611-rail-brt-number-png-audit.md 和 docs/audits/ofunato-2611-rail-brt-kiha110-pokemon-number-png-audit.md
- JR九州官方 BRT https://www.jrkyushu.co.jp/train/hikoboshiline/

以上没有建立BRT交通方式的完整路线图，因此网页的铁路换乘功能暂不规划BRT公交行程，不能把两个系统当成相同列车继续乘坐。

### 历史复合铁路的物理断点
- Shinetsu: Yokokawa→Shinonoi (旧段不同/已断)、Nagano→Naoetsu（第三部门铁路），不能画成JR直通钢轨连接。
- KagoshimaMain: Yatsushiro→Satsuma-Sendai 属肥萨橙铁道。官方： https://www.jrkyushu.co.jp/company/ir/library/integrated_report/pdf/annualreport2017_J.pdf ；肥萨橙铁道 https://www.hs-orange.com/

这些 legacy aggregated line IDs 仍保留全部历史站序与SQL所有权，添加 topologyBreaks 字段（from/to）作为物理路网的唯一边界源：
- js/route-search.js 的邻接图、换乘 Dijkstra 和 direct route 候选屏蔽这些边。
- js/trains-data.js SVG不绘制断开的段。
- 没有擅自为其他运营商（肥萨橙铁道、信浓铁道、越后心动铁道）制造路线或时刻。

### 运营公司边界
- HakataMinami 的基础 operator 从JR-Kyushu 改为JR-West，展示 operatorGroup 同步。
- HokurikuShinkansen 的 company operatorSections 标东京→上越妙高JR东日本、上越妙高→敦贺JR西日本。保留既有联合行驶主线ID和 train-runs SQL，不按运营公司凭空拆分列车。
- JR西日本北陆新干线公司资料 https://www.westjr.co.jp/company/ir/pdf/20260501_01.pdf
- 博多南站官方 https://eki.jr-odekake.net/top?id=0810101

## 其他尚未完成的缺口

本轮避免大量无证据造站/造位置：
1. 13个已有数据库登记的JR东海传统线路目前全部0个手工时刻表模板、0个停站时刻，前端还需逐线补官方站表与坐标，不应直接设为“完整”。
2. JR北海道12个在来线与JR四国8条在来线未登记。JR西日本北陆/中国地区及JR东日本日光/利府、JR九州肥萨/筑肥西段仍需标准化的完整站序。
3. DB-only line IDs 与前端-only line IDs须统一。Miyo/Yahiko 指向同一弥彦线，不新建重复运营身份；Yumesaki、WakayamaLine等前端线尚无可靠SQL时刻表，登记时必须保证“不支持实时/完整运行”的能力标记。
4. 不能将公共拓扑数据修正等价于全部2026年11月时刻、车号、车组信息完成核对。需要分别做官方当月车次完整性审计。

## 验证
测试 tests/jr-route-topology-20261109.test.cjs 应进入 GitHub Actions，覆盖3条真实支线、4个 rail-only 终点、3条断边、运营归属及生成文件一致性。
