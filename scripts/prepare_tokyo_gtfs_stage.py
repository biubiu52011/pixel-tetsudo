#!/usr/bin/env python3
"""TokyoGTFS -> isolated Supabase gtfs_stage, never the runtime timetable."""
import csv, gzip, hashlib, io, json, sys, zipfile
from collections import Counter
from pathlib import Path

EMPTY={
 'Toei.Arakawa':'Arakawa','Toei.Asakusa':'Asakusa','Fujikyu.Fujikyu':'Fujikyu',
 'Keio.Inokashira':'KeioInokashira','Keio.Keio':'KeioMain','Keio.Takao':'KeioTakao',
 'JR-East.Nikko':'Nikko','Tobu.TobuUrbanPark':'Noda','Toei.Oedo':'Oedo',
 'Tobu.Ogose':'Ogose','Toei.Shinjuku':'Shinjuku','Tobu.TobuSkytree':'TobuSkytree',
 'Tobu.Tojo':'Tojo'
}
NEW=set('Chichibu.Chichibu Choshi.Choshi Enoden.Enoden Hitachinaka.Minato Hokuso.Hokuso Isumi.Isumi IzuHakone.Daiyuzan IzuHakone.Sunzu Izukyu.Izukyu Jomo.Jomo Joshin.Joshin KantoRailway.Joso KantoRailway.Ryugasaki KashimaRinkai.OaraiKashima Kominato.Kominato Moka.Moka OdakyuHakone.HakoneTozan Ryutetsu.Nagareyama Shibayama.Shibayama UtsunomiyaLightRail.UtsunomiyaLightRail WataraseKeikoku.WataraseKeikoku Yamaman.Yukarigaoka YokohamaSeaside.KanazawaSeaside'.split())
REVIEW=set('JR-East.NaritaExpress Keisei.HigashiNarita Keisei.Matsudo Keisei.Skyliner Tobu.Kinugawa Tobu.KoizumiBranch'.split())
SELECTED=set(EMPTY)|NEW|REVIEW
TABLES=[
 ('feed_imports','feed_sha source_url source_label service_start service_end scope_note raw_route_count staged_trip_count staged_stop_time_count attribution'),
 ('routes','feed_sha route_id agency_id route_short_name route_long_name route_type candidate_status canonical_line_key'),
 ('stops','feed_sha stop_id stop_name latitude longitude parent_station location_type'),
 ('service_calendar','feed_sha service_id start_date end_date week_mask'),
 ('service_exceptions','feed_sha service_id service_date exception_type'),
 ('trips','feed_sha trip_id route_id service_id train_number headsign direction_id shape_id block_id exceptional vehicle_kind'),
 ('stop_times','feed_sha trip_id stop_sequence stop_id arrival_time departure_time shape_dist_traveled'),
 ('transfers','feed_sha from_trip_id to_trip_id transfer_type'),
]

def records(z,filename):
 with z.open(filename) as src:
  yield from csv.DictReader(io.TextIOWrapper(src,encoding='utf-8-sig',newline=''))
def fmtdate(s):return '-'.join((s[:4],s[4:6],s[6:])) if s else ''
def stage_status(k):
 if k in EMPTY:return 'existing_empty'
 if k in NEW:return 'new_registry_candidate'
 if k in REVIEW:return 'review_only'
 return 'already_covered'

def build(input_zip,outdir):
 outdir.mkdir(parents=True,exist_ok=True)
 with open(input_zip,'rb') as f: sha=hashlib.file_digest(f,'sha256').hexdigest()
 with zipfile.ZipFile(input_zip) as z:
  routes={r['route_id']:r for r in records(z,'routes.txt')}
  if SELECTED-set(routes):raise ValueError(f'Missing routes: {sorted(SELECTED-set(routes))}')
  all_counts=Counter(r['route_id'] for r in records(z,'trips.txt'))
  trips=[r for r in records(z,'trips.txt') if r['route_id'] in SELECTED]
  ids={r['trip_id'] for r in trips}
  if len(ids)!=len(trips):raise ValueError('Duplicate priority trip_id')
  times=[];stop_ids=set()
  for r in records(z,'stop_times.txt'):
   if r['trip_id'] in ids:
    times.append(r);stop_ids.add(r['stop_id'])
  stops={r['stop_id']:r for r in records(z,'stops.txt') if r['stop_id'] in stop_ids}
  if stop_ids-set(stops):raise ValueError('Unresolved stop ids')
  calendars=list(records(z,'calendar.txt'))
  exceptions=list(records(z,'calendar_dates.txt'))
  transfers=[r for r in records(z,'transfers.txt') if r['from_trip_id'] in ids and r['to_trip_id'] in ids]
  start=min(x['start_date'] for x in calendars)
  end=max(x['end_date'] for x in calendars)
  info=dict(source='https://mkuran.pl/gtfs/tokyo/rail.zip',sha256=sha,
    service_from=fmtdate(start),service_to=fmtdate(end),total_routes=len(routes),
    priority_routes=len(SELECTED),priority_trips=len(trips),priority_stops=len(times),
    unique_stations=len(stops),through_transfers=len(transfers),
    existing_empty_count=sum(all_counts[r] for r in EMPTY),
    new_line_candidate_count=sum(all_counts[r] for r in NEW),
    review_only_count=sum(all_counts[r] for r in REVIEW))
  (outdir/'tokyo-gtfs-audit.json').write_text(json.dumps(info,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
  target=outdir/'tokyo-gtfs-priority-stage.sql.gz'
  with gzip.open(target,'wt',encoding='utf-8',newline='') as file:
   file.write('-- Only gtfs_stage, not live or canonical timetable.\n')
   file.write('\\set ON_ERROR_STOP on\nBEGIN;\n')
   file.write(f"DELETE FROM gtfs_stage.feed_imports WHERE feed_sha='{sha}';\n")
   def emit(idx,data):
    table,columns=TABLES[idx]; names=columns.split()
    file.write('COPY gtfs_stage.'+table+' ('+', '.join(names)+") FROM STDIN WITH (FORMAT csv, NULL '\\N');\n")
    writer=csv.writer(file,lineterminator='\n')
    for row in data:writer.writerow([r if r is not None and r!='' else r'\N' for r in (row.get(k) for k in names)])
    file.write('\\.\n')
   emit(0,[dict(feed_sha=sha,source_url=info['source'],
    source_label='TokyoGTFS via mini-tokyo-3d',service_start=info['service_from'],
    service_end=info['service_to'],scope_note='42 route candidates; quarantined source records',
    raw_route_count=len(routes),staged_trip_count=len(trips),staged_stop_time_count=len(times),
    attribution='Schedules: Copyright (c) 2019-2025 Akihiko Kusanagi (MIT); GTFS: Mikołaj Kuranowski')])
   emit(1,(dict(feed_sha=sha,route_id=k,agency_id=r['agency_id'],
    route_short_name=r['route_short_name'],route_long_name=r['route_long_name'],
    route_type=r['route_type'],candidate_status=stage_status(k),
    canonical_line_key=EMPTY.get(k,'')) for k,r in sorted(routes.items())))
   emit(2,(dict(feed_sha=sha,stop_id=k,stop_name=r['stop_name'],
    latitude=r['stop_lat'],longitude=r['stop_lon'],parent_station=r['parent_station'],
    location_type=r['location_type']) for k,r in sorted(stops.items())))
   emit(3,(dict(feed_sha=sha,service_id=r['service_id'],
    start_date=fmtdate(r['start_date']),end_date=fmtdate(r['end_date']),
    week_mask=''.join(r[d] for d in 'monday tuesday wednesday thursday friday saturday sunday'.split())) for r in calendars))
   emit(4,(dict(feed_sha=sha,service_id=r['service_id'],service_date=fmtdate(r['date']),
    exception_type=r['exception_type']) for r in exceptions))
   emit(5,(dict(feed_sha=sha,trip_id=r['trip_id'],route_id=r['route_id'],
    service_id=r['service_id'],train_number=r['trip_short_name'],
    headsign=r['trip_headsign'],direction_id=r['direction_id'],shape_id=r['shape_id'],
    block_id=r['block_id'],exceptional=r['exceptional'],vehicle_kind=r['vehicle_kind']) for r in trips))
   emit(6,(dict(feed_sha=sha,trip_id=r['trip_id'],stop_sequence=r['stop_sequence'],
    stop_id=r['stop_id'],arrival_time=r['arrival_time'],departure_time=r['departure_time'],
    shape_dist_traveled=r['shape_dist_traveled']) for r in times))
   emit(7,(dict(feed_sha=sha,from_trip_id=r['from_trip_id'],
    to_trip_id=r['to_trip_id'],transfer_type=r['transfer_type']) for r in transfers))
   file.write('COMMIT;\n')
  print(json.dumps(info,ensure_ascii=False,indent=2))
  print('SQL import file:',target)
if __name__=='__main__':
 if len(sys.argv)!=3:sys.exit('Usage: prepare_tokyo_gtfs_stage.py ZIP OUTPUT_DIR')
 build(Path(sys.argv[1]),Path(sys.argv[2]))
