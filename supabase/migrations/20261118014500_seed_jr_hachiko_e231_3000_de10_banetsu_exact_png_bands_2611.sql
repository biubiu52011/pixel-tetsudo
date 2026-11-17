-- JR 2026-11 gallery PNG NUMBER reference only (not a vehicle identification).
-- Existing source js-0073: JR-East Hachiko E231-3000, 148 public
-- exact listed E numbers -> 90 connected intervals; gaps do NOT imply numbers.
-- Existing source js-0033: BanetsuWest DL DE10, exact 9226 / 9233,
-- only on Nov 1, 8, 15 with operating-calendar/route/model/type guards.
-- Confirmed JR East official 2611 timetable service pages:
-- https://timetables.jreast.co.jp/2611/train/185/187871.html
-- https://timetables.jreast.co.jp/2611/train/185/187881.html
--
-- Both native gallery file paths remain asset_status='review',
-- asset_scope='review', appearance_class='requires_review'! This is
-- ONLY a number-source reference; NEVER promote image, force an actual
-- trainset or bypass the source's explicit model-evidence requirement.
-- Musashino E231-0 vs 209-500 shared number ownership stays excluded.
-- No replacement runtime resolution, no fallback, no image priority.
DO $jr_hachiko_de10_png_preflight$
DECLARE img record;
BEGIN
  FOR img IN SELECT * FROM (VALUES
    ('JR-East','E231系','images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
    ('JR-East','DE10形','images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png')
  ) AS v(operator,vehicle_type,image_path)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicle_image_assets a
      WHERE a.image_path=img.image_path AND a.operator=img.operator
        AND a.vehicle_type=img.vehicle_type
        AND a.asset_status='review'
        AND a.asset_scope='review'
        AND a.appearance_class='requires_review'
    ) THEN RAISE EXCEPTION 'Review-only image identity changed: %',img.image_path; END IF;
  END LOOP;
  IF EXISTS (
    WITH proposed(line_key,min_number,max_number,suffix,png_reference) AS (
      VALUES
      ('Hachiko',461,461,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',563,563,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',565,565,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',568,568,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',572,572,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',574,574,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',579,579,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',660,660,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',662,662,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',664,664,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',666,667,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',669,671,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',673,676,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',678,678,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',761,765,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',767,768,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',771,772,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',777,777,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',860,860,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',863,866,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',869,870,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',873,875,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',877,879,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',965,966,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',969,969,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',974,975,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',978,979,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1061,1061,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1064,1064,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1067,1068,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1071,1071,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1160,1160,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1165,1166,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1169,1170,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1174,1175,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1179,1179,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1265,1266,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1269,1269,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1271,1271,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1274,1275,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1278,1278,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1361,1361,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1364,1364,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1367,1368,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1379,1379,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1460,1460,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1465,1466,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1469,1470,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1474,1475,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1479,1479,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1565,1566,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1569,1569,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1571,1571,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1574,1575,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1578,1578,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1661,1661,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1664,1664,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1667,1668,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1672,1672,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1675,1675,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1679,1679,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1760,1760,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1765,1771,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1773,1774,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1778,1779,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1861,1861,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1866,1868,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1871,1872,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1874,1876,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1878,1879,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1964,1964,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1966,1967,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1969,1970,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1974,1975,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',1979,1979,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2060,2060,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2065,2066,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2073,2073,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2077,2078,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2160,2161,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2167,2168,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2172,2172,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2175,2176,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2261,2261,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2266,2266,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2274,2274,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2279,2279,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2373,2373,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',2377,2377,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('Hachiko',4778,4778,'E','../images/列车/JR東日本/JR東日本_E231系_3000番台.png'),
      ('BanetsuWest',9226,9226,'','../images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png'),
      ('BanetsuWest',9233,9233,'','../images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png')
    )
    SELECT 1 FROM proposed p
    JOIN public.published_train_png_number_ranges r
      ON r.edition='2611' AND r.line_key=p.line_key
      AND r.suffix=p.suffix AND r.min_number<=p.max_number
      AND r.max_number>=p.min_number
    WHERE r.png_reference<>p.png_reference
  ) THEN RAISE EXCEPTION 'Hachiko / Banetsu source band has different PNG overlap'; END IF;
END
$jr_hachiko_de10_png_preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Hachiko','png_band/Hachiko/0461-0461E',461,461,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0563-0563E',563,563,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0565-0565E',565,565,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0568-0568E',568,568,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0572-0572E',572,572,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0574-0574E',574,574,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0579-0579E',579,579,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0660-0660E',660,660,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0662-0662E',662,662,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0664-0664E',664,664,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0666-0667E',666,667,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0669-0671E',669,671,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0673-0676E',673,676,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0678-0678E',678,678,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0761-0765E',761,765,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0767-0768E',767,768,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0771-0772E',771,772,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0777-0777E',777,777,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0860-0860E',860,860,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0863-0866E',863,866,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0869-0870E',869,870,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0873-0875E',873,875,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0877-0879E',877,879,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0965-0966E',965,966,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0969-0969E',969,969,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0974-0975E',974,975,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0978-0979E',978,979,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1061-1061E',1061,1061,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1064-1064E',1064,1064,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1067-1068E',1067,1068,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1071-1071E',1071,1071,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1160-1160E',1160,1160,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1165-1166E',1165,1166,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1169-1170E',1169,1170,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1174-1175E',1174,1175,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1179-1179E',1179,1179,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1265-1266E',1265,1266,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1269-1269E',1269,1269,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1271-1271E',1271,1271,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1274-1275E',1274,1275,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1278-1278E',1278,1278,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1361-1361E',1361,1361,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1364-1364E',1364,1364,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1367-1368E',1367,1368,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1379-1379E',1379,1379,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1460-1460E',1460,1460,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1465-1466E',1465,1466,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1469-1470E',1469,1470,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1474-1475E',1474,1475,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1479-1479E',1479,1479,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1565-1566E',1565,1566,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1569-1569E',1569,1569,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1571-1571E',1571,1571,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1574-1575E',1574,1575,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1578-1578E',1578,1578,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1661-1661E',1661,1661,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1664-1664E',1664,1664,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1667-1668E',1667,1668,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1672-1672E',1672,1672,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1675-1675E',1675,1675,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1679-1679E',1679,1679,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1760-1760E',1760,1760,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1765-1771E',1765,1771,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1773-1774E',1773,1774,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1778-1779E',1778,1779,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1861-1861E',1861,1861,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1866-1868E',1866,1868,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1871-1872E',1871,1872,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1874-1876E',1874,1876,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1878-1879E',1878,1879,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1964-1964E',1964,1964,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1966-1967E',1966,1967,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1969-1970E',1969,1970,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1974-1975E',1974,1975,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/1979-1979E',1979,1979,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2060-2060E',2060,2060,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2065-2066E',2065,2066,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2073-2073E',2073,2073,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2077-2078E',2077,2078,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2160-2161E',2160,2161,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2167-2168E',2167,2168,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2172-2172E',2172,2172,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2175-2176E',2175,2176,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2261-2261E',2261,2261,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2266-2266E',2266,2266,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2274-2274E',2274,2274,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2279-2279E',2279,2279,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2373-2373E',2373,2373,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2377-2377E',2377,2377,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/4778-4778E',4778,4778,'E',NULL,'../images/列车/JR東日本/JR東日本_E231系_3000番台.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/9226-9226',9226,9226,'',NULL,'../images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/9233-9233',9233,9233,'',NULL,'../images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $jr_hachiko_de10_verify$
DECLARE actual integer;
BEGIN
  SELECT count(*) INTO actual FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND segment_key LIKE 'png_band/%'
    AND (
     (line_key='Hachiko' AND suffix='E'
      AND png_reference='../images/列车/JR東日本/JR東日本_E231系_3000番台.png')
     OR
     (line_key='BanetsuWest' AND suffix=''
      AND png_reference='../images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png')
    )
    AND vehicle_model IS NULL AND source_url IS NULL
    AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
  IF actual<>92 THEN RAISE EXCEPTION 'JR reference-only PNG bands must total 92, got %',actual; END IF;
END
$jr_hachiko_de10_verify$;
