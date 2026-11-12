# JR-Central 2611 source-scoped planned timetable sample: 5100F, 3001D

Small original normalization of a few selected, public scheduled timetable
facts for the existing Supabase `import_jr_central_authorized_plan` routine.

## TokaidoCentral — 5100F, 土曜・休日のみ

Reference: https://timetable.jr-odekake.net/train-timetable/348321?date=20261114
Official 2026-11 Saturday page explicitly says **5100F** and **土曜・休日運転**;
this is special rapid (特別快速), not generic `Rapid`. The JR Central
Tokaido segment travels from Maibara index 83 to Toyohashi index 42,
which is `odpt.RailDirection:Inbound` in the project's canonical order.

Selected scheduled stops only:
- `Maibara` 米原, 07:07 dep.
- `JRC-TokaidoCentral-075` 岐阜, 07:51 arr / 07:51 dep.
- `Nagoya` 名古屋, 08:12 arr / 08:14 dep.
- `JRC-TokaidoCentral-059` 刈谷, 08:33 arr / 08:34 dep.
- `JRC-TokaidoCentral-053` 岡崎, 08:46 arr / 08:46 dep.
- `Toyohashi` 豊橋, 09:09 arr. (Confirm exact canonical station ID in SQL
  before importing: the SQL registry may use a shared/alias identifier.)

Only the November 2026 Saturday / Sunday / national holiday dates are
included. No weekday service is asserted.

## KiseiCentral — 3001D, everyday limited express 南紀1号

Reference: https://timetable.jr-odekake.net/train-timetable/28011?date=20261024
The page explicitly cites the **2026-11 issue** and says `毎日運転`.
This service starts on the Kansai / Ise Railway path, then enters the
JR Central Kisei line at Taki and runs onward via Shingu to the JR West
territory. **Only Taki→Shingu** is represented here, `Outbound` in the
canonical station index 9→40.

Selected scheduled JR-Central Kisei stops:
- `JRC-KiseiCentral-010` 多気, 09:23 arr / 09:24 dep.
- `JRC-KiseiCentral-015` 三瀬谷, 09:47 arr / 09:49 dep.
- `JRC-KiseiCentral-021` 紀伊長島, 10:17 arr / 10:23 dep.
- `JRC-KiseiCentral-025` 尾鷲, 10:44 arr / 10:45 dep.
- `JRC-KiseiCentral-034` 熊野市, 11:13 arr / 11:14 dep.
- `Shingu` 新宮, 11:34 arr / 11:36 dep.

JR Western operator / interline stops before Taki or beyond Shingu are
not imported under the KiseiCentral line, and the physical service is
not declared as terminating at the cropped boundary.

## Evidentiary and publishing boundaries

This document represents a narrow independently authored selection of
scheduled number + stop-clock facts and their native line-key/ID
normalization. Full JR timetable copyright and redistribution constraints
remain with the original publisher Kotsu Shimbunsha. No full-day/whole
route database was copied, no blanket source license is claimed.

The limited facts in this authored note are used as the project-
maintained `original_compilation` artifact with attribution. Do not
extrapolate unlisted intermediate stop clock times. Neither source
confirms actual train operation or physical carsets; PNGs remain
line-scoped selections from the **planned number** pool only.
The source-data coverage should remain **sampled**.
