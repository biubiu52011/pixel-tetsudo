#!/usr/bin/env python3
"""SHA-pinned TokyoGTFS -> restricted Supabase staging via GitHub Actions OIDC.

No database password, anon write grants, browser keys, or changes to runtime timetable.
"""
import csv
import hashlib
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
import zipfile

FEED_SHA = "bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f"
ENDPOINT = "https://pnupwfmgbtxqhpzsrhfn.supabase.co/functions/v1/tokyo-gtfs-sync"
EXISTING = {
 "Toei.Arakawa":"Arakawa","Toei.Asakusa":"Asakusa","Fujikyu.Fujikyu":"Fujikyu",
 "Keio.Inokashira":"KeioInokashira","Keio.Keio":"KeioMain","Keio.Takao":"KeioTakao",
 "JR-East.Nikko":"Nikko","Tobu.TobuUrbanPark":"Noda","Toei.Oedo":"Oedo",
 "Tobu.Ogose":"Ogose","Toei.Shinjuku":"Shinjuku","Tobu.TobuSkytree":"TobuSkytree",
 "Tobu.Tojo":"Tojo",
 "JR-Central.Gotemba":"Gotemba","JR-Central.Tokaido":"TokaidoCentral",
}
NEW = set("Chichibu.Chichibu Choshi.Choshi Enoden.Enoden Hitachinaka.Minato Hokuso.Hokuso Isumi.Isumi IzuHakone.Daiyuzan IzuHakone.Sunzu Izukyu.Izukyu Jomo.Jomo Joshin.Joshin KantoRailway.Joso KantoRailway.Ryugasaki KashimaRinkai.OaraiKashima Kominato.Kominato Moka.Moka OdakyuHakone.HakoneTozan Ryutetsu.Nagareyama Shibayama.Shibayama UtsunomiyaLightRail.UtsunomiyaLightRail WataraseKeikoku.WataraseKeikoku Yamaman.Yukarigaoka YokohamaSeaside.KanazawaSeaside".split())
REVIEW = set("JR-East.NaritaExpress Keisei.HigashiNarita Keisei.Matsudo Keisei.Skyliner Tobu.Kinugawa Tobu.KoizumiBranch".split())
CANDIDATES = set(EXISTING) | NEW | REVIEW
SCHEMA = {
 "routes": ("route_id","agency_id","route_short_name","route_long_name","route_type","candidate_status","canonical_line_key"),
 "stops": ("stop_id","stop_name","latitude","longitude","parent_station","location_type"),
 "calendar": ("service_id","start_date","end_date","week_mask"),
 "exceptions": ("service_id","service_date","exception_type"),
 "trips": ("trip_id","route_id","service_id","train_number","headsign","direction_id","shape_id","block_id","exceptional","vehicle_kind"),
 "stop_times": ("trip_id","stop_sequence","stop_id","arrival_time","departure_time","shape_dist_traveled"),
 "transfers": ("from_trip_id","to_trip_id","transfer_type"),
}
EXPECT = {"routes":165,"stops":730,"calendar":4,"exceptions":48,
          "trips":19358,"stop_times":279607,"transfers":686}

def rows(z,name):
    with z.open(name) as f:
        yield from csv.DictReader(io.TextIOWrapper(f,encoding="utf-8-sig",newline=""))

def d(s):
    return s[:4]+"-"+s[4:6]+"-"+s[6:] if s else None

class OidcSender:
    def __init__(self):
        self.token = ""
        self.token_at = 0
        self.batch_count = 0
    def refresh(self):
        url=os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
        sep="&" if "?" in url else "?"
        url+=sep+"audience="+urllib.parse.quote(ENDPOINT,safe="")
        req=urllib.request.Request(url,headers={
            "Authorization":"Bearer "+os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]})
        with urllib.request.urlopen(req,timeout=20) as res:
            self.token=json.load(res)["value"]
        self.token_at=time.monotonic()
    def send(self,kind,batch):
        if not batch and kind!="complete":
            return
        if not self.token or time.monotonic()-self.token_at>210:
            self.refresh()
        payload=json.dumps({"feed_sha":FEED_SHA,"kind":kind,"rows":batch},
            ensure_ascii=False,separators=(",",":")).encode("utf-8")
        for attempt in range(5):
            req=urllib.request.Request(ENDPOINT,data=payload,method="POST",headers={
                "Content-Type":"application/json",
                "Authorization":"Bearer "+self.token})
            try:
                with urllib.request.urlopen(req,timeout=60) as res:
                    response=json.load(res)
                if not response.get("ok"):raise RuntimeError("Unexpected response: "+str(response)[:400])
                self.batch_count+=1
                if kind=="complete":
                    print("Validated staged source counts:",json.dumps(response,ensure_ascii=False))
                elif self.batch_count%30==0:
                    print("Uploaded",self.batch_count,"batches; latest",kind,flush=True)
                return
            except urllib.error.HTTPError as e:
                msg=e.read(1000).decode("utf-8",errors="replace")
                if e.code in (401,403) and attempt==0:
                    self.refresh()
                    continue
                if e.code not in (408,429,500,502,503,504) or attempt==4:
                    raise RuntimeError("Staging request failed: HTTP "+str(e.code)+" "+msg[:400]) from e
            if attempt==4:
                raise RuntimeError("Staging retry budget exhausted")
            time.sleep(min(2**attempt,12))

def records(kind,source):
    cols=SCHEMA[kind]
    for r in source:
        yield {k:(FEED_SHA if k=="feed_sha" else (r.get(k) or None)) for k in ("feed_sha",)+cols}

def send_batches(sender,kind,source,size=650):
    count=0
    batch=[]
    for row in source:
        batch.append(row)
        if len(batch)>=size:
            sender.send(kind,batch)
            count+=len(batch)
            batch=[]
    if batch:
        sender.send(kind,batch)
        count+=len(batch)
    if count!=EXPECT[kind]:
        raise ValueError(f"{kind} count mismatch {count} vs {EXPECT[kind]}")
    print("Completed",kind,count,flush=True)

def main(path):
    with open(path,"rb") as f:
        sha=hashlib.file_digest(f,"sha256").hexdigest()
    if sha!=FEED_SHA:
        sys.exit("Rail ZIP SHA mismatch; stop rather than merging a different timetable edition")
    sender=OidcSender()
    with zipfile.ZipFile(path) as z:
        route_rows=list(rows(z,"routes.txt"))
        route_ids={x["route_id"] for x in route_rows}
        if not CANDIDATES<=route_ids:
            raise ValueError("Candidate routes missing: "+repr(CANDIDATES-route_ids))
        trip_ids={x["trip_id"] for x in rows(z,"trips.txt") if x["route_id"] in CANDIDATES}
        if len(trip_ids)!=19358:raise ValueError("Trip identity/count mismatch")
        station_ids={x["stop_id"] for x in rows(z,"stop_times.txt") if x["trip_id"] in trip_ids}
        if len(station_ids)!=730:raise ValueError("Station source count mismatch")

        def route_payload():
            for r in route_rows:
                k=r["route_id"]
                status="existing_empty" if k in EXISTING else ("new_registry_candidate" if k in NEW else ("review_only" if k in REVIEW else "already_covered"))
                yield {"feed_sha":FEED_SHA,"route_id":k,"agency_id":r["agency_id"],
                       "route_short_name":r["route_short_name"] or None,
                       "route_long_name":r["route_long_name"] or None,
                       "route_type":r["route_type"] or None,
                       "candidate_status":status,"canonical_line_key":EXISTING.get(k)}
        send_batches(sender,"routes",route_payload())
        def stop_payload():
            for r in rows(z,"stops.txt"):
                if r["stop_id"] in station_ids:
                    yield {"feed_sha":FEED_SHA,"stop_id":r["stop_id"],
                           "stop_name":r["stop_name"],"latitude":r["stop_lat"] or None,
                           "longitude":r["stop_lon"] or None,"parent_station":r["parent_station"] or None,
                           "location_type":r["location_type"] or None}
        send_batches(sender,"stops",stop_payload())
        def calendar_payload():
            for r in rows(z,"calendar.txt"):
                yield {"feed_sha":FEED_SHA,"service_id":r["service_id"],
                       "start_date":d(r["start_date"]),"end_date":d(r["end_date"]),
                       "week_mask":"".join(r[x] for x in "monday tuesday wednesday thursday friday saturday sunday".split())}
        send_batches(sender,"calendar",calendar_payload())
        def exceptions_payload():
            for r in rows(z,"calendar_dates.txt"):
                yield {"feed_sha":FEED_SHA,"service_id":r["service_id"],
                       "service_date":d(r["date"]),"exception_type":int(r["exception_type"])}
        send_batches(sender,"exceptions",exceptions_payload())
        def trip_payload():
            for r in rows(z,"trips.txt"):
                if r["route_id"] in CANDIDATES:
                    yield {"feed_sha":FEED_SHA,"trip_id":r["trip_id"],"route_id":r["route_id"],
                           "service_id":r["service_id"],"train_number":r["trip_short_name"] or None,
                           "headsign":r["trip_headsign"] or None,"direction_id":r["direction_id"] or None,
                           "shape_id":r["shape_id"] or None,"block_id":r["block_id"] or None,
                           "exceptional":r["exceptional"] or None,"vehicle_kind":r["vehicle_kind"] or None}
        send_batches(sender,"trips",trip_payload())
        def times_payload():
            for r in rows(z,"stop_times.txt"):
                if r["trip_id"] in trip_ids:
                    yield {"feed_sha":FEED_SHA,"trip_id":r["trip_id"],"stop_sequence":int(r["stop_sequence"]),
                           "stop_id":r["stop_id"],"arrival_time":r["arrival_time"] or None,
                           "departure_time":r["departure_time"] or None,
                           "shape_dist_traveled":r["shape_dist_traveled"] or None}
        send_batches(sender,"stop_times",times_payload(),size=500)
        def transfers_payload():
            for r in rows(z,"transfers.txt"):
                if r["from_trip_id"] in trip_ids and r["to_trip_id"] in trip_ids:
                    yield {"feed_sha":FEED_SHA,"from_trip_id":r["from_trip_id"],
                           "to_trip_id":r["to_trip_id"],"transfer_type":r["transfer_type"]}
        send_batches(sender,"transfers",transfers_payload())
        sender.send("complete",[])
        print("GTFS staging merge verified. Canonical timetable and realtime sources untouched.")

if __name__=="__main__":
    if len(sys.argv)!=2:sys.exit("Usage: import_tokyo_gtfs_oidc.py rail.zip")
    main(sys.argv[1])
