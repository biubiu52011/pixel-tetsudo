# 千住の永見：菜单图片补充及来源（2026-11-07）

## 范围与处理
- 对象：北千住「千住の永見」的4个已有菜单：マグロぶつ、千住あげ、煮込み、ハイボール（ジャンボ）。
- 原先4个菜单复用店铺外观照 `../images/観光地/千住の永見.jpg`，造成不同菜品的错误视觉表述。
- 本次仅将4条菜单的 `cover` 改为 `../images/料理/` 下独立绘制的本地SVG，并设 `coverRole: "illustration"`。前端将其标记为「イメージ」；不应称作本店实拍。
- 原有菜单名、价格、注释条目、来源未确认状态全部保持；`image` 的店铺头图不修改。特别地，没有更正现有菜单价格，仅替换图片。
- 数据源：`data/core/tourism_data.json`；同步 `tourism_data.compact.json` 与 `tourism-data.file.js`，兼容HTTPS、file://。
- 现有 `js/tourism-shop.js` 已能处理 `coverRole: "illustration"`，不改UI或创建额外脚本。

## 实拍核对来源（仅作研究，未复制到仓库）
- [足立区观光网店铺介绍](https://www.adachikanko.net/spot/%E5%8D%83%E4%BD%8F%E3%81%AE%E6%B0%B8%E8%A6%8B)：介绍千寿揚げ、鶏軟骨つくね焼与マグロぶつ等本店菜品；内容注明为2017年历史资料。
- [足立区观光PDF（2025）](https://www.adachikanko.net/wp-content/uploads/2025/09/7bc70d3fa2b895c8cc7f440394f4758c.pdf)：展示千寿揚げ（にんにく入）的本店实拍与价格。
- [食べログ菜单](https://tabelog.com/tokyo/A1324/A132402/13008737/dtlmenu/)：访客更新的历史菜单，价格并非实时数据。
- [Yahoo!地图](https://map.yahoo.co.jp/v3/place/mFEBvmymqO6/menu)：用户上传菜单与菜品资料。
- [2026-10-24到店餐食记录](https://plaza.rakuten.co.jp/mashimorinotake/diary/ctgylist/?ctgy=29)：近期千寿揚げ、牛の煮込み等的实食记录。
- [食べログ单品实拍](https://tabelog.com/tokyo/A1324/A132402/13008737/)：千寿揚げ的用户摄影。摄影作品的转载授权未确认，未用于图片文件。

## 注意
- SVG为原创示意图，非本店实际装盘或精确外观；获得授权的本店摄影后，可将单条菜单的 `img` 指向照片并去掉示意图配置。
- 千住あげ是鱼肉糜制成的名物炸物，不应把未核实的豆腐制品照片用作本品。
