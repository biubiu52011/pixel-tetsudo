-- 东西／千代田／南北线及直通线路番号对账，只读。
-- 原始番号保留 A/B 与 R。仅东西线走廊按既有 metro-prefixed 解析器
-- 将 R 作为数字索引归类的一部分，不用于认定同一趟列车。
-- 末两位运用号与完整番号分开。未定修订日模板不授予 2611 新号段。
-- 同站同日历同番号数字部分与到发时刻相等仅是接续候选，不是实际编组。
WITH scopes(line_key,owner_suffix,include_r,kind) AS (
 VALUES ('Tozai','T',true,'full'),('ToyoRapid','T',true,'full'),
 ('Chiyoda','K',false,'full'),('Chiyoda','E',false,'full'),
 ('JobanLocal','K',false,'full'),('JobanLocal','S',false,'full'),
 ('JobanLocal','E',false,'full'),
 ('Namboku','M',false,'full'),('SaitamaRapid','M',false,'full')
), raw AS (
 SELECT m.id,m.line_key,m.train_number,m.calendar_urn,m.source_revision_date,
 substring(m.train_number from '[0-9]+')::int n,
 substring(m.train_number from '[A-Z]+$') suffix,
 regexp_replace(m.train_number,'^[AB]','') normalized
 FROM public.manual_timetable_templates m
 WHERE m.line_key IN ('Tozai','ToyoRapid','Chiyoda','JobanLocal','Namboku','SaitamaRapid')
 AND m.train_number ~ '^[AB]?[0-9]+[A-Z]+$'
), scoped AS (
 SELECT r.*,s.owner_suffix FROM raw r JOIN scopes s ON r.line_key=s.line_key
 AND (r.suffix=s.owner_suffix OR (s.include_r AND r.suffix=s.owner_suffix||'R'))
), keys AS (
 SELECT DISTINCT line_key,owner_suffix,n FROM scoped
), islands AS (
 SELECT *,n-row_number() OVER(PARTITION BY line_key,owner_suffix ORDER BY n)::int grp FROM keys
), bands AS (
 SELECT line_key,owner_suffix,min(n) lo,max(n) hi,count(*) numbers
 FROM islands GROUP BY line_key,owner_suffix,grp
), inventory AS (
 SELECT b.line_key,b.owner_suffix,count(*) bands,sum(b.numbers)::int number_keys,min(b.lo) lo,max(b.hi) hi,
 (SELECT count(DISTINCT r.train_number) FROM scoped r WHERE r.line_key=b.line_key AND r.owner_suffix=b.owner_suffix) raw_numbers,
 (SELECT count(*) FROM scoped r WHERE r.line_key=b.line_key AND r.owner_suffix=b.owner_suffix AND r.source_revision_date IS NOT NULL) dated_templates,
 (SELECT array_agg(DISTINCT k.n%100 ORDER BY k.n%100) FROM keys k WHERE k.line_key=b.line_key AND k.owner_suffix=b.owner_suffix) operation_tails
 FROM bands b GROUP BY b.line_key,b.owner_suffix
), pairs(a,b,station) AS (
 VALUES ('Tozai','ToyoRapid','NishiFunabashi'),('Chiyoda','JobanLocal','Ayase'),('Namboku','SaitamaRapid','AkabaneIwabuchi')
), stops AS (
 SELECT DISTINCT r.*,regexp_replace(coalesce(s.arrival_station_urn,s.departure_station_urn),'^.*\.','') station,
 s.arrival_clock,s.departure_clock
 FROM raw r JOIN public.manual_timetable_template_stops s ON s.template_id=r.id
 WHERE coalesce(s.arrival_station_urn,s.departure_station_urn) ~ '(NishiFunabashi|Ayase|AkabaneIwabuchi)$'
), edges AS (
 SELECT DISTINCT p.a,p.b,p.station,x.id xid,y.id yid,x.train_number xn,y.train_number yn,x.suffix,x.calendar_urn
 FROM pairs p JOIN stops x ON x.line_key=p.a AND x.station=p.station
 JOIN stops y ON y.line_key=p.b AND y.station=p.station AND y.calendar_urn=x.calendar_urn
 AND x.normalized=y.normalized AND (x.arrival_clock=y.departure_clock OR y.arrival_clock=x.departure_clock)
), unique_edges AS (
 SELECT *,count(*) OVER(PARTITION BY a,b,xid) xc,count(*) OVER(PARTITION BY a,b,yid) yc FROM edges
), boundary AS (
 SELECT a,b,station,suffix,count(*) pairs,count(*) FILTER(WHERE xc=1 AND yc=1) unique_pairs,
 count(DISTINCT xn) FILTER(WHERE xc=1 AND yc=1) unique_raw_numbers,
 count(*) FILTER(WHERE xn=yn AND xc=1 AND yc=1) same_full_number
 FROM unique_edges GROUP BY 1,2,3,4
), current_k AS (
 SELECT p.min_number num,
 (SELECT array_agg(DISTINCT r.train_number ORDER BY r.train_number) FROM raw r
 WHERE r.line_key='Tozai' AND r.suffix IN ('K','KR') AND r.n=p.min_number) template_numbers
 FROM public.published_train_png_number_ranges p
 WHERE p.edition='2611' AND p.line_key='Tozai' AND p.suffix='K' AND p.min_number=p.max_number
 AND p.png_reference LIKE '%E231%800%'
)
SELECT jsonb_build_object(
 'candidate_inventory',(SELECT jsonb_agg(to_jsonb(i) ORDER BY line_key,owner_suffix) FROM inventory i),
 'strict_boundary_candidates',(SELECT jsonb_agg(to_jsonb(boundary_row) ORDER BY a,suffix) FROM boundary boundary_row),
 'existing_tozai_k_reference_comparison',(SELECT jsonb_agg(to_jsonb(k) ORDER BY num) FROM current_k k)
) audit;
