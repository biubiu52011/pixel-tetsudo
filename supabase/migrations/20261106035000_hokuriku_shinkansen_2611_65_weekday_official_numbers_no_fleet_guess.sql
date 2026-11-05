-- 2026-11 JR East official printed service-number crosswalk for
-- 65 exact weekday Hokuriku Shinkansen source templates.
-- Official 004d1/004u1 columns: 列車番号 and 列車名.
-- This establishes formal full service number ONLY.
-- DO NOT insert fleet PNGs: E7 and W7 stock both possible and specific
-- physical vehicle assignments are not proved from these timetables.
--
-- Excluded ambiguous/different-calendar services:
-- Hakutaka 553 (553E / 5553E), 559 (559E / 5559E),
-- 594 (9594E; special), Asama 400 (not in current timetable),
-- Hakutaka 592 and 595 (not in current published pages).
BEGIN;
WITH official(service_name, full_number, direction, official_source_url) AS
(VALUES
  ('かがやき501','35501E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('かがやき503','35503E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('かがやき505','35505E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('かがやき507','35507E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('かがやき509','35509E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('かがやき511','35511E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('かがやき515','35515E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('かがやき517','35517E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('かがやき519','35519E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか551','551E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか555','555E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか557','557E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか561','561E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか563','563E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか567','567E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか569','569E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか571','571E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか573','573E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか575','575E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか577','577E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('はくたか591','591E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま601','601E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま605','605E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま609','609E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま611','611E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま615','615E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま617','617E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま621','621E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま625','625E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま627','627E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま629','629E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('あさま633','633E','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
  ('かがやき500','35500E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('かがやき504','35504E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('かがやき506','35506E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('かがやき508','35508E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('かがやき510','35510E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('かがやき512','35512E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('かがやき514','35514E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('かがやき516','35516E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('かがやき518','35518E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか552','552E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか554','554E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか556','556E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか558','558E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか562','562E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか564','564E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか568','568E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか570','570E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか572','572E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか574','574E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか576','576E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか578','578E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('はくたか590','590E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま604','604E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま608','608E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま610','610E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま612','612E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま614','614E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま618','618E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま620','620E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま626','626E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま628','628E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま630','630E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
  ('あさま632','632E','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html')
), mapped AS (
 SELECT m.id,m.calendar_urn,m.direction_urn,m.line_key,o.full_number,o.official_source_url
 FROM official o
 JOIN public.manual_timetable_templates m
 ON m.line_key='HokurikuShinkansen' AND m.train_number=o.service_name
 AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.direction_urn='odpt.RailDirection:'||o.direction
 AND m.railway_urn='odpt.Railway:JR-East.HokurikuShinkansen'
) 
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT '2611',m.line_key,m.calendar_urn,m.direction_urn,
 m.full_number,m.id,m.official_source_url,'train_number_only'
FROM mapped m
WHERE (SELECT count(*) FROM mapped)=65
  AND (SELECT count(DISTINCT id) FROM mapped)=65
ON CONFLICT DO NOTHING;
COMMIT;
