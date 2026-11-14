/* Fixed PNG projection for Tobu Tojo and Ogose, effective 2026-11.
 * These are concrete, gallery-approved art ASSETS, not trainset assignment
 * claims. An independently confirmed realtime vehicle takes precedence.
 * The 2026 TokyoGTFS 2026-11-02..2027-11-02 feed proves service numbers /
 * station itineraries, not vehicle formations. No multiple vehicle candidates.
 */
(function () {
  'use strict';
  var TOBU='https://www.tobu.co.jp/corporation/rail/vehicles/';
  var METRO='https://www.tokyometro.jp/corporate/enterprise/passenger_rail/cars/working/index.html';
  var MF='https://loo-ool.com/rail/MF/32/';
  var assets=Object.freeze({
    ogose:Object.freeze({model:'東武8000系',png:'../images/列车/東武鉄道/東武鉄道_8000型.png',sourceUrl:TOBU}),
    west:Object.freeze({model:'東武8000系',png:'../images/列车/東武鉄道/東武鉄道_8000型.png',sourceUrl:TOBU}),
    tj:Object.freeze({model:'東武50090系',png:'../images/列车/東武鉄道/東武鉄道_50090型.png',sourceUrl:TOBU}),
    tobu:Object.freeze({model:'東武50070系',png:'../images/列车/東武鉄道/東武鉄道_50070型.png',sourceUrl:MF}),
    metro:Object.freeze({model:'東京メトロ17000系',png:'../images/列车/東京メトロ/東京メトロ_17000系.png',sourceUrl:METRO}),
    tokyu:Object.freeze({model:'東急5050系',png:'../images/列车/東急電鉄/東急電鉄_5050系.png',sourceUrl:MF}),
    ground:Object.freeze({model:'東武50000系',png:'../images/列车/東武鉄道/東武鉄道_50000型.png',sourceUrl:TOBU})
  });
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
      if(!/^A\d{3,5}$/.test(number)||type!=='Local')return null;
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
      referenceOnly:true,illustrative:true,representativeOnly:true,
      actualVehicleConfirmed:false,authorizesActualVehicle:false,
      evidenceRole:confirmation
    };
  }
  window.TobuTojoFixedPng202611=Object.freeze({
    version:'2026-11-15', assets:assets, resolve:choose
  });
})();
