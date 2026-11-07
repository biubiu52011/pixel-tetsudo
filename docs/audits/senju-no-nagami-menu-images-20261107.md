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

## 2026-11-07：四款实际菜品照片的逐项候选记录（待转载授权）

照片候选只登记页面来源和商品对应关系，**没有将原照片下载、镜像或上线**。公开可查看 ≠ 可转载。所有记录的 `reusePermission` 均为 `not_verified`；除非拍摄者/权利人许可或明确开放许可证可供核验，不能将其改写为 `img` 或移入 `images/料理/` 后冒充本地版权可用图片。当前四个 SVG `coverRole: illustration` 保持不动。

| 菜单原名 | 对应本店实拍来源 | 商品/日期核对 | 再利用状态 |
| --- | --- | --- | --- |
| マグロぶつ | [楽天ブログ：2026-10-24 まぐろのぶつ](https://plaza.rakuten.co.jp/mashimorinotake/diary/202610240010/?scid=we_blg_pc_lastctgy_1_title)；[食べログ 2026-02 访店](https://tabelog.com/tokyo/A1324/A132402/13008737/dtlrvwlst/B522595477/) | 来源明确店名、菜名，楽天博客注明 500円；单品和本店对应可确认 | not_verified |
| 千住あげ | [2026-10-24 到店记录分类页（含「当店名物 千寿揚げ」）](https://plaza.rakuten.co.jp/mashimorinotake/diary/ctgylist/?ctgy=29)；[食べログ有「千住揚げ470円」用户照片](https://tabelog.com/tokyo/A1324/A132402/13008737/dtlphotolst/smp2/)；[2025-03 摄影博客](https://ameblo.jp/tyameko018/entry-12889836724.html) | 同一家店的鱼肉糜炸饼；有蒜味版与普通版，实际照片必须注明对应版本 | not_verified |
| 煮込み | [2026-10-24 访店记录分类页（「牛の煮込み」）](https://plaza.rakuten.co.jp/mashimorinotake/diary/ctgylist/?ctgy=29)；[ねこにゃん的本店实食](https://ameblo.jp/nekonyan190721/entry-12911212783.html) | 本店牛煮込み；2026年访店记录为 550円，**与仓库旧菜单的630円不一致**，本次不修改原数据价格 | not_verified |
| ハイボール（ジャンボ） | [関西女のプチ日記：2023-11-27](https://kansai-onna.com/nomitabearuki/tokyo-kitasenju-magami/) | 文章标示「ウイスキーハイボール ジャンボサイズ」，同时出现芋ソーダ割；须逐图区分杯子，不能误用烧酎ハイボール或芋ソーダ割照片 | not_verified |

### 取得授权后的落地流程
1. 使用具备转载许可、且明确对应菜品的**原始单品照片**（分别确认来源、作者、授权条款、适用范围）。
2. 为每款图片入库 `images/料理/千住の永見_<序号>_<商品>.webp`，保留作者与来源记录；按实际约束进行缩放和压缩。
3. 修改唯一真源 `data/core/tourism_data.json` 中该店相应 `menu[].img`，去掉旧 SVG `cover` / `coverRole` 占位；不要改店铺头图及未经确认的价格。
4. 运行 `node data/core/generate-all.js`，检查生成的 `tourism_data.compact.json` 与 `tourism-data.file.js` 一致；检查四张图片均可加载、`file://` 及 HTTPS 均可访问。
5. 仅在确认拥有授权或适当许可后，才能将状态更改为 `licensed`。


## 2026-11-07 — Current rendering (supersedes the SVG cards)

- Four active menu items now contain `photoSourceUrl` and `photoSourceType: "third_party"` linking to relevant photographs on their original publishing pages. The links are **not** official menu verification.
- Removed SVG `cover` and `coverRole` references from the four active menu entries. Until reuse permission is verified, the site displays compact text menu rows with original-photo links instead of copying or hotlinking the photographers' work.
- The existing venue hero picture, four recorded prices, note entries and the 「情報未確認」 disclaimer remain unchanged. No four-item 「すべて見る」 dialog.
- The photographs themselves were not downloaded or published in this repository. If photo owners grant reuse permission, place the authorized originals in `images/料理/`, write item `img` paths, and regenerate both tourism bundles.
- Loader updates both network and `file://` tourism bundle versions and its separate local storage tourism cache key, avoiding stale SVG menu entries.
