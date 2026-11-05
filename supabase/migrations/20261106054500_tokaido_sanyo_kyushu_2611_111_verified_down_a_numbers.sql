-- JR East published Nov 2026 001d1: source-scoped 111 explicit
-- weekday Tokyo->Hakata / Hakata-bound service-name-to-train-number pairs.
-- Each tuple is independently found in the printed 列車名 / 列車番号
-- columns (not an inferred contiguous interval). Holiday timetable
-- has exceptions; never extend weekday proof to SaturdayHoliday.
-- Source-only number evidence; no vehicle type, carset, stop clock
-- schedule-date override or broad N700A/N700S/500 PNG inference.
BEGIN;
WITH published(line_key,service_name,full_number) AS (
VALUES
('TokaidoShinkansen','こだま809','809A'),
('TokaidoShinkansen','こだま815','815A'),
('TokaidoShinkansen','こだま817','817A'),
('TokaidoShinkansen','こだま819','819A'),
('TokaidoShinkansen','こだま821','821A'),
('TokaidoShinkansen','こだま823','823A'),
('TokaidoShinkansen','こだま825','825A'),
('TokaidoShinkansen','こだま833','833A'),
('TokaidoShinkansen','こだま835','835A'),
('TokaidoShinkansen','こだま837','837A'),
('TokaidoShinkansen','こだま839','839A'),
('TokaidoShinkansen','こだま841','841A'),
('TokaidoShinkansen','こだま843','843A'),
('TokaidoShinkansen','こだま845','845A'),
('TokaidoShinkansen','こだま847','847A'),
('TokaidoShinkansen','こだま849','849A'),
('TokaidoShinkansen','こだま851','851A'),
('TokaidoShinkansen','こだま853','853A'),
('TokaidoShinkansen','こだま855','855A'),
('TokaidoShinkansen','こだま857','857A'),
('TokaidoShinkansen','ひかり635','635A'),
('TokaidoShinkansen','ひかり639','639A'),
('TokaidoShinkansen','ひかり641','641A'),
('TokaidoShinkansen','ひかり647','647A'),
('TokaidoShinkansen','ひかり649','649A'),
('TokaidoShinkansen','ひかり651','651A'),
('TokaidoShinkansen','ひかり653','653A'),
('TokaidoShinkansen','ひかり655','655A'),
('TokaidoShinkansen','ひかり657','657A'),
('TokaidoShinkansen','ひかり659','659A'),
('TokaidoShinkansen','ひかり661','661A'),
('TokaidoShinkansen','ひかり663','663A'),
('TokaidoShinkansen','ひかり665','665A'),
('TokaidoShinkansen','ひかり667','667A'),
('TokaidoShinkansen','ひかり669','669A'),
('TokaidoShinkansen','のぞみ7','7A'),
('TokaidoShinkansen','のぞみ15','15A'),
('TokaidoShinkansen','のぞみ23','23A'),
('TokaidoShinkansen','のぞみ27','27A'),
('TokaidoShinkansen','のぞみ31','31A'),
('TokaidoShinkansen','のぞみ45','45A'),
('TokaidoShinkansen','のぞみ47','47A'),
('TokaidoShinkansen','のぞみ55','55A'),
('TokaidoShinkansen','のぞみ59','59A'),
('TokaidoShinkansen','のぞみ69','69A'),
('SanyoShinkansen','こだま871','871A'),
('SanyoShinkansen','こだま873','873A'),
('SanyoShinkansen','こだま875','875A'),
('SanyoShinkansen','こだま877','877A'),
('SanyoShinkansen','こだま879','879A'),
('SanyoShinkansen','こだま885','885A'),
('SanyoShinkansen','こだま931','931A'),
('SanyoShinkansen','こだま935','935A'),
('SanyoShinkansen','こだま937','937A'),
('SanyoShinkansen','こだま941','941A'),
('SanyoShinkansen','こだま945','945A'),
('SanyoShinkansen','こだま951','951A'),
('SanyoShinkansen','こだま953','953A'),
('SanyoShinkansen','こだま955','955A'),
('SanyoShinkansen','こだま957','957A'),
('SanyoShinkansen','こだま959','959A'),
('SanyoShinkansen','こだま961','961A'),
('SanyoShinkansen','こだま965','965A'),
('SanyoShinkansen','こだま967','967A'),
('SanyoShinkansen','ひかり681','681A'),
('SanyoShinkansen','ひかり701','701A'),
('SanyoShinkansen','ひかり703','703A'),
('SanyoShinkansen','ひかり707','707A'),
('SanyoShinkansen','ひかり709','709A'),
('SanyoShinkansen','ひかり711','711A'),
('SanyoShinkansen','ひかり717','717A'),
('SanyoShinkansen','ひかり719','719A'),
('SanyoShinkansen','ひかり721','721A'),
('SanyoShinkansen','ひかり731','731A'),
('SanyoShinkansen','のぞみ7','7A'),
('SanyoShinkansen','のぞみ15','15A'),
('SanyoShinkansen','のぞみ23','23A'),
('SanyoShinkansen','のぞみ27','27A'),
('SanyoShinkansen','のぞみ31','31A'),
('SanyoShinkansen','のぞみ45','45A'),
('SanyoShinkansen','のぞみ47','47A'),
('SanyoShinkansen','のぞみ55','55A'),
('SanyoShinkansen','のぞみ59','59A'),
('SanyoShinkansen','のぞみ69','69A'),
('SanyoShinkansen','のぞみ101','101A'),
('SanyoShinkansen','さくら741','741A'),
('SanyoShinkansen','さくら743','743A'),
('SanyoShinkansen','さくら745','745A'),
('SanyoShinkansen','さくら749','749A'),
('SanyoShinkansen','さくら753','753A'),
('SanyoShinkansen','さくら755','755A'),
('SanyoShinkansen','さくら757','757A'),
('SanyoShinkansen','さくら759','759A'),
('SanyoShinkansen','さくら765','765A'),
('SanyoShinkansen','さくら767','767A'),
('SanyoShinkansen','さくら769','769A'),
('SanyoShinkansen','さくら771','771A'),
('SanyoShinkansen','さくら773','773A'),
('KyushuShinkansen','さくら741','741A'),
('KyushuShinkansen','さくら743','743A'),
('KyushuShinkansen','さくら745','745A'),
('KyushuShinkansen','さくら749','749A'),
('KyushuShinkansen','さくら753','753A'),
('KyushuShinkansen','さくら755','755A'),
('KyushuShinkansen','さくら757','757A'),
('KyushuShinkansen','さくら759','759A'),
('KyushuShinkansen','さくら765','765A'),
('KyushuShinkansen','さくら767','767A'),
('KyushuShinkansen','さくら769','769A'),
('KyushuShinkansen','さくら771','771A'),
('KyushuShinkansen','さくら773','773A')
), source_exact AS (
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,p.full_number
 FROM published p JOIN public.manual_timetable_templates m
 ON m.line_key=p.line_key AND m.train_number=p.service_name
 AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.direction_urn='odpt.RailDirection:Outbound'
 AND m.railway_urn=CASE p.line_key
  WHEN 'TokaidoShinkansen' THEN 'odpt.Railway:JR-Central.TokaidoShinkansen'
  WHEN 'SanyoShinkansen' THEN 'odpt.Railway:JR-West.SanyoShinkansen'
  ELSE 'odpt.Railway:JR-Kyushu.KyushuShinkansen' END
)
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
SELECT '2611',line_key,calendar_urn,direction_urn,full_number,id,
'https://timetables.jreast.co.jp/2611/timetable-v/001d1.html','train_number_only'
FROM source_exact WHERE (SELECT count(*) FROM published)=111
 AND (SELECT count(*) FROM source_exact)=111
 AND (SELECT count(DISTINCT id) FROM source_exact)=111
ON CONFLICT DO NOTHING;
COMMIT;
