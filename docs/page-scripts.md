# 集中管理页面 script src

统一修改 `scripts/page-scripts.json` 中的依赖及顺序。各页面 HTML 中的 `pt:scripts` 区域由构建脚本生成，请勿直接手改。

本地可运行 `node scripts/sync-page-scripts.cjs`，使用 `--check` 校验；`node --test tests/page-scripts.test.cjs` 执行引用、顺序和重复加载测试。GitHub Pages 的静态发布 workflow 也会自动生成并验证。

为避免语言闪烁，`js/lang-init.js` 仍在 head 中同步运行。其他脚本采用保序 `defer`，浏览器可并行下载，但仍按声明顺序执行，并在 `DOMContentLoaded` 触发前就绪。现有 ODPT、列车号段、PNG 映射和时刻表的 JavaScript 全局接口不变。不能用 `async` 代替 `defer`。

脚本 URL 使用文件内容 Git blob 哈希前 12 位作为 `?v=`，同一脚本在不同页面共享缓存，文件更新时自动刷新。不依赖服务器端动态打包，也没有额外运行时请求。性能改进属静态分析结果，尚未完成实际浏览器网络基准测试。


## 冷启动与列车详情按需加载

`pages/trains.html` 一览页不再立即下载、解析车型 PNG 映射、车次号段与 SVG 地图渲染模块。清单 `lazy.trains` 里的资源由生成器写入惰性 `<template id="pt-trains-detail-assets">`，不会在首屏请求。打开 `trains.html#线路ID` 时，`js/trains-detail-loader.js` 分批并保序加载。初次打开详情显示加载态，加载失败显示错误，不以虚构的车次或车型替代；返回一览后，同一页面不重复加载。新文件仍受 `script-src 'self'` 限制。

## 运行状态页冷启动

`realtime.html` 是 ○/△/× 运行情报与延误详情，不渲染列车位置或车型 PNG。其启动清单不再包含 `train-vehicle.js`、`train-position-estimator.js` 和列车运行实测车型证据索引；`DataFusion.loadTrainPositions` 在 `data-page="realtime"` 下直接跳过位置推定，但运行情报融合、ODPT 延误获取、运行区间和语言翻译继续保留。列车地图页不受影响。数据库 `train-runs` 已按线路从 SQL 返回计划信息与有证据的车型/PNG 字段，保留现有 SQL 优先及前端兼容回退逻辑，未复制表或引入新 API。


## 按线路加载已验证番号索引

`lazyScopes.trains` 在原有有序 `lazy.trains` 清单上为专用 JR 2026-11 番号、南北直通和运行证据索引标注适用线路。首页一览不请求详情；进入线路图仅加载该线路适用的专用索引，未标注的通用车型、PNG 规则和 SVG 渲染模块仍保留。返回或切换线路按需追加未加载的索引，同一页面不重复下载已经成功执行的脚本。

现有 Supabase `train-runs` 已从 SQL 按线路与日期返回已验证时刻表及车型/PNG 证据，客户端 `odpt-unified.js` 已将其映射到 `_sqlVehicleArtworkPath` 等字段；这条 SQL 查询仍然优先。本次不重复创建 SQL 表，也不删除 SQL 尚未完整覆盖的前端号段回退。未完成全量 SQL↔静态规则一致性对照前，保留共用判定引擎。
