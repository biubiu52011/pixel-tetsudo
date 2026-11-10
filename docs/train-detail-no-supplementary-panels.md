# No supplementary panels in the train detail

`pages/trains.html` is a map-only line detail: back button, line title, and
the existing `trainsMapContainer`. The existing `DataState` flow handles
loading, errors and empty/unknown data. The map retains its standard
estimate indication where applicable.

Do **not** reintroduce supplementary line-specific notice boxes, including
retired `trainsOfficialRuninfo` and `trainsCorridorEvidence`, or renamed
copies with a heading and timetable-missing/source-quality paragraph. No
external timetable/traffic link cards above the route map. This rule applies
to every railway/operator and language.

The JR Tōzai evidence still exists as SQL and source metadata; removing its
UI renderer did not delete Supabase evidence, train-plan source identity,
vehicle restrictions or timetable-estimation logic.

`tests/train-detail-no-evidence-panels.test.cjs` scans runtime JS/HTML/CSS
for retired generators and verifies the minimal detail DOM. CI executes this
test on Pages builds.
