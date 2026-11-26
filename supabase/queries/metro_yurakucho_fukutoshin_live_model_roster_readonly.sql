-- 第十六轮／地下铁第五批：有乐町线、副都心线车型番号只读审计（2026-11-26）
-- 生产模板并非已核实的现行时刻表；所有分组的 source_revision_date 非空数量均为 0。
-- 按线路/日历/车种/完整番号计数，不能解释为不重复实体列车或实际编组。
-- 本次生产只读查询结果：
-- Fukutoshin: G=52, K=505, K2=1, M=79, S=320, T=36 (33组/993条组合)
-- Yurakucho: M=142, S=543, T=158 (14组/843条组合)
-- 合计47组/1836条组合。保留 B526K2，不截断或猜测与 B526K 的同一性。
-- 现有四条 S 规则覆盖 10000/17000，两个车型共用番号名单；
-- M/T/K/G 无该线路的直接静态番号规则。不能从车主后缀直接唯一选定车型。
-- 后缀参考（历史公开资料，非2026现行号段证明）：
-- https://ja.wikipedia.org/wiki/東京メトロ副都心線
-- https://4gousya.net/line/8207.php
-- S=Metro, T=东武, M=西武, K=东急/横滨高速共通, G=相铁。
-- 图库检查：9000/9050/50070、40000、Y500、5050、20000均有相应候选图；
-- 西武6000现有图库线路白名单仅含Fukutoshin而缺Yurakucho；
-- 东急5000图库不含Fukutoshin，不能绕过图库门禁；5050的Yurakucho标签不代表定期直通。
-- S-TRAIN 与普通M不得混用；F-Liner不证明唯一型号；10000系8両图片不能仅凭番号选择。
-- 下一步：核对当前运营商资料、来源日历/明确实时车主/车型/车种及图库白名单，
-- 复用既有公共匹配入口并更新反向索引/现役清单、正反例测试；不扩大历史有效期。
-- 本文件只读，不修改生产SQL、运行时映射或现行状态。
with grouped as (
  select line_key, calendar_urn,
         regexp_replace(train_type_urn,'^.*\.','') as type,
         substring(train_number from '[A-Z]+[0-9]*$') as suffix,
         count(distinct train_number) as n,
         count(source_revision_date) as dated,
         array_agg(distinct train_number order by train_number) as numbers
  from public.manual_timetable_templates
  where line_key in ('Yurakucho','Fukutoshin')
  group by 1,2,3,4
)
select * from grouped order by line_key,calendar_urn,type,suffix;
