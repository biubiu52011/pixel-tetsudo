/* Scoped Tojo train illustrations and Ogose fleet metadata, effective 2026-11.
 * A rostered Ogose train number proves 8000 series service, not the 81111F
 * grape-brown commemorative livery. Do not assign that PNG by default. An independently confirmed realtime vehicle takes precedence.
 * The 2026 TokyoGTFS 2026-11-02..2027-11-02 feed proves service numbers /
 * station itineraries, not vehicle formations. No multiple vehicle candidates.
 */
(function () {
  'use strict';
  var TOBU='https://www.tobu.co.jp/corporation/rail/vehicles/';
  var METRO='https://www.tokyometro.jp/corporate/enterprise/passenger_rail/cars/working/index.html';
  var MF='https://loo-ool.com/rail/MF/32/';
  var assets=Object.freeze({
    // The existing 8000 PNG depicts 81111F's special brown livery, NOT the
    // ordinary blue/white 8000. No gallery-certified standard Ogose PNG yet.
    ogose:Object.freeze({model:'東武8000系',png:null,
      specialLiveryFormation:'81111F',
      specialLiveryPng:'../images/列车/東武鉄道/東武鉄道_8000型.png',sourceUrl:TOBU}),
    west:Object.freeze({model:'東武8000系',png:'../images/列车/東武鉄道/東武鉄道_8000型.png',sourceUrl:TOBU}),
    tj:Object.freeze({model:'東武50090系',png:'../images/列车/東武鉄道/東武鉄道_50090型.png',sourceUrl:TOBU}),
    tobu:Object.freeze({model:'東武50070系',png:'../images/列车/東武鉄道/東武鉄道_50070型.png',sourceUrl:MF}),
    metro:Object.freeze({model:'東京メトロ17000系',png:'../images/列车/東京メトロ/東京メトロ_17000系.png',sourceUrl:METRO}),
    tokyu:Object.freeze({model:'東急5050系',png:'../images/列车/東急電鉄/東急電鉄_5050系.png',sourceUrl:MF}),
    ground:Object.freeze({model:'東武50000系',png:'../images/列车/東武鉄道/東武鉄道_50000型.png',sourceUrl:TOBU})
  });
  // TokyoGTFS Ogose source-only train numbers (not vehicle/formation IDs).
  // Source SHA bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f; valid 2026-11-02..2027-11-02.
  // 146 weekday and 144 SaturdayHoliday trips, 150 distinct train numbers.
  // Do not grant artwork to absent numbers or numbers from the wrong calendar.
  var ogoseNumberRoster=Object.freeze({
    weekday:new Set('A581,A586,A588,A589,A680,A681,A684,A685,A686,A687,A688,A689,A780,A781,A783,A784,A785,A786,A787,A788,A789,A881,A882,A883,A884,A885,A886,A887,A888,A889,A980,A981,A982,A983,A984,A985,A986,A987,A1080,A1081,A1082,A1083,A1084,A1085,A1086,A1087,A1180,A1181,A1182,A1183,A1184,A1185,A1186,A1187,A1280,A1281,A1282,A1283,A1284,A1285,A1286,A1287,A1380,A1381,A1382,A1383,A1384,A1385,A1386,A1387,A1480,A1481,A1482,A1483,A1484,A1485,A1486,A1487,A1580,A1581,A1582,A1583,A1584,A1585,A1586,A1587,A1680,A1681,A1682,A1683,A1684,A1685,A1686,A1687,A1780,A1781,A1782,A1783,A1784,A1785,A1786,A1787,A1880,A1881,A1882,A1883,A1884,A1885,A1886,A1887,A1980,A1981,A1982,A1983,A1984,A1985,A1986,A1987,A2080,A2081,A2082,A2083,A2084,A2085,A2086,A2087,A2180,A2181,A2184,A2185,A2186,A2187,A2280,A2281,A2284,A2285,A2286,A2287,A2380,A2381,A2384,A2385,A2387,A3588,A3780,A3980'.split(',')),
    holiday:new Set('A581,A586,A588,A589,A680,A681,A684,A686,A687,A688,A689,A780,A781,A784,A785,A786,A787,A788,A789,A880,A881,A882,A883,A884,A885,A886,A887,A888,A889,A980,A981,A982,A983,A984,A985,A986,A987,A1080,A1081,A1082,A1083,A1084,A1085,A1086,A1087,A1180,A1181,A1182,A1183,A1184,A1185,A1186,A1187,A1280,A1281,A1282,A1283,A1284,A1285,A1286,A1287,A1380,A1381,A1382,A1383,A1384,A1385,A1386,A1387,A1480,A1481,A1482,A1483,A1484,A1485,A1486,A1487,A1580,A1581,A1582,A1583,A1584,A1585,A1586,A1587,A1680,A1681,A1682,A1683,A1684,A1685,A1686,A1687,A1780,A1781,A1783,A1784,A1785,A1786,A1787,A1880,A1881,A1882,A1883,A1884,A1885,A1886,A1887,A1980,A1981,A1982,A1983,A1984,A1985,A1986,A1987,A2080,A2081,A2082,A2083,A2084,A2085,A2086,A2087,A2180,A2181,A2184,A2185,A2186,A2187,A2280,A2281,A2284,A2285,A2286,A2287,A2380,A2381,A2384,A2385,A3588,A3687,A5180,A5385'.split(','))
  });
  function ogoseCalendar(p){
    var value=String(p.calendarType||p.serviceId||p.timetableCalendar||'').trim().toLowerCase();
    if(value==='weekday'||/[.:]weekday$/.test(value))return 'weekday';
    if(value==='holiday'||value==='saturday_holiday'||/[.:]saturdayholiday$/.test(value))return 'holiday';
    return '';
  }
  function isPublishedOgoseNumber(p,number){
    var calendar=ogoseCalendar(p);
    if(!calendar||!ogoseNumberRoster[calendar].has(number))return false;
    // Date-specific active-trip proof remains the responsibility of train-runs.
    // When source identity is propagated, reject mismatched route/calendar/feed.
    var trip=String(p.sourceTripId||p.source_trip_id||'');
    if(trip&&trip!=='Tobu.Ogose.'+number+'.'+(calendar==='weekday'?'Weekday':'SaturdayHoliday'))return false;
    var source=String(p.sourcePath||p.source_path||'');
    if(source&&source!=='gtfs-stage:TokyoGTFS:bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f:Ogose')return false;
    return true;
  }
  var westStations=Object.create(null);
  ['Ogawamachi','TobuTakezawa','MinamiYorii','Obusuma','Hachigata','Tamayodo','Yorii'].forEach(function(s){westStations[s]=true;});
  function cleanStation(s){return String(s||'').split(/[.:]/).pop().replace(/[-_\s]/g,'');}
  function choose(p){
    if(!p)return null;
    var line=String(p.positionLineId||p.lineId||'');
    if(line!=='Tojo'&&line!=='Ogose')return null;
    if(p.displayLineId&&String(p.displayLineId)!==line)return null;
    if(['supabase-train-run','realtime-api','train-timetable'].indexOf(String(p.positionSource||''))<0)return null;
    if(p.positionSource==='supabase-train-run'&&p.estimated!==true)return null;
    // The source railway and operator are identity constraints, not a
    // license for a guessed train-type or physical vehicle.
    if(String(p.sourceRailway||'')!=='odpt.Railway:Tobu.'+line)return null;
    var trainOwner=String(p.trainOperator||p.operator||'');
    if(trainOwner&&trainOwner!=='Tobu'&&trainOwner!=='odpt.Operator:Tobu')return null;
    var date=String(p.serviceDate||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<'2026-11-02'||date>'2027-11-02')return null;
    var number=String(p.trainNumber||'').trim().toUpperCase();
    if(!number||number.length>60)return null;
    var type=String(p.trainType||'').split(/[.:]/).pop();
    var key='';
    var confirmation='line-fleet-illustration';
    if(line==='Ogose'){
      if(type!=='Local'||!isPublishedOgoseNumber(p,number))return null;
      key='ogose';confirmation='line-single-fleet-model';
    }else{
      var stops=Array.isArray(p.scheduledStopKeys)?p.scheduledStopKeys.map(cleanStation):[];
      if(type==='TJ-Liner'||type==='TJ-LINER'||type==='TJ-Liner'){
        if(!/^\d{1,3}(?: TJ.*)?$/.test(number)&&!/^[0-9]{1,5}$/.test(number))return null;
        key='tj';confirmation='official-named-service-model';
      }else if(/^Y\d{3,4}$/.test(number) ||
        (stops.length>=2 && stops.every(function(s){return westStations[s]===true;})
        && stops.some(function(s){return s!=='Ogawamachi';}))){
        // Proven GTFS itinerary is entirely west of Ogawamachi.
        key='west';confirmation='line-single-fleet-model';
      }else{
        var m=number.match(/^[A-F](\d{2,4})([TSK])$/);
        var run=m?parseInt(m[1].slice(-2),10):-1;
        var owner=m&&m[2];
        if(owner==='T'&&run>=1&&run<=23)key='tobu';
        else if(owner==='S'&&run>=1&&run<=99)key='metro';
        else if(owner==='K'&&((run>=1&&run<=35)||(run>=51&&run<=65)))key='tokyu';
        else if(/^(?:\d{1,5}|A\d{3,5}|B\d{3,5})$/.test(number))key='ground';
        else return null;
      }
    }
    var asset=assets[key];
    if(!asset)return null;
    return {
      lineId:line,trainNumber:number,serviceDate:date,
      illustrationModel:asset.model,illustrationPng:asset.png,
      sourceUrl:asset.sourceUrl,ruleId:key,
      referenceOnly:true,illustrative:!!asset.png,
      authorizesIllustration:!!asset.png,representativeOnly:true,
      actualVehicleConfirmed:false,authorizesActualVehicle:false,
      evidenceRole:confirmation
    };
  }
  window.TobuTojoFixedPng202611=Object.freeze({
    version:'2026-11-15-livery-gated', assets:assets, resolve:choose
  });
})();
