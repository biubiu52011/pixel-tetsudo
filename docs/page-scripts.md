# 集中管理页面 script src

统一修改 `scripts/page-scripts.json` 中的依赖及顺序。各页面 HTML 中的 `pt:scripts` 区域由构建脚本生成，请勿直接手改。

本地可运行 `node scripts/sync-page-scripts.cjs`，使用 `--check` 校验；`node --test tests/page-scripts.test.cjs` 执行引用、顺序和重复加载测试。GitHub Pages 的静态发布 workflow 也会自动生成并验证。

为避免语言闪烁，`js/lang-init.js` 仍在 head 中同步运行。其他脚本采用保序 `defer`，浏览器可并行下载，但仍按声明顺序执行，并在 `DOMContentLoaded` 触发前就绪。现有 ODPT、列车号段、PNG 映射和时刻表的 JavaScript 全局接口不变。不能用 `async` 代替 `defer`。

脚本 URL 使用文件内容 Git blob 哈希前 12 位作为 `?v=`，同一脚本在不同页面共享缓存，文件更新时自动刷新。不依赖服务器端动态打包，也没有额外运行时请求。性能改进属静态分析结果，尚未完成实际浏览器网络基准测试。
