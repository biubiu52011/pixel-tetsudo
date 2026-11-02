/**
 * 主要车种预设（2026-11）。仅为线路 / 运营商的参考车队，绝非列车级运用信息。
 *
 * Strict contract:
 *  - Match exact canonical lineId + operator + ordinary service type.
 *  - Reference the operator's own rolling-stock families, not an exhaustive
 *    list of through-running partners or every livery / formation.
 *  - Never emit an actual vehicle, exact model selection or PNG.
 *  - Train-specific / dated / officially published SQL evidence wins.
 *  - Dates, train numbers and operation-code suffixes are never used as guesses.
 *
 * Public operator sources are included for re-verification during future fleet
 * replacements. Consumers must display these records as UNCONFIRMED references.
 */
(function (root) {
  'use strict';
  if (root.MajorVehicleFleetPresets) return;

  var METRO = 'https://www.tokyometro.jp/corporate/enterprise/passenger_rail/cars/working/index.html';
  var TOEI = 'https://www.kotsu.metro.tokyo.jp/about/koukai/vehicle_outline/model_diagram/';
  var JR_E233 = 'https://www.jreast.co.jp/train/local/e233.html';
  var JR_E235 = 'https://www.jreast.co.jp/train/local/e235.html';
  var JR_OTHER = 'https://www.jreast.co.jp/train/local/';
  var TOKYU = 'https://www.tokyu.co.jp/railway/trains/';

  // Carefully scoped to operator-owned principal stock, not a promise that
  // *every* train on the line is operated by these families.
  var rows = [
    {id:'jr-yamanote', operator:'JR-East', lineIds:['Yamanote'],
      models:['E235系0番台（山手線）'], sourceUrl:JR_E235},
    {id:'jr-keihin-tohoku', operator:'JR-East', lineIds:['KeihinTohoku'],
      models:['E233系1000番台'], sourceUrl:JR_E233},
    {id:'jr-chuo-ome', operator:'JR-East', lineIds:['ChuoRapid','Ome','Itsukaichi'],
      models:['E233系0番台'], sourceUrl:JR_E233},
    {id:'jr-chuo-sobu-local', operator:'JR-East', lineIds:['ChuoSobuLocal'],
      models:['E231系500番台'], sourceUrl:JR_OTHER},
    {id:'jr-yokosuka-sobu-rapid', operator:'JR-East', lineIds:['Yokosuka','SobuRapid'],
      models:['E235系1000番台'], sourceUrl:JR_E235},
    {id:'jr-yokohama', operator:'JR-East', lineIds:['Yokohama'],
      models:['E233系6000番台'], sourceUrl:JR_E233},
    {id:'jr-nambu', operator:'JR-East', lineIds:['Nambu'],
      models:['E233系8000番台'], sourceUrl:JR_E233},
    {id:'jr-tsurumi', operator:'JR-East', lineIds:['Tsurumi'],
      models:['E131系1000番台'], sourceUrl:JR_OTHER},
    {id:'jr-joban-rapid', operator:'JR-East', lineIds:['Joban'],
      models:['E231系0番台','E531系'], sourceUrl:JR_OTHER},
    {id:'jr-joban-main', operator:'JR-East', lineIds:['JobanMain'],
      models:['E531系'], sourceUrl:JR_OTHER},
    {id:'jr-joban-local', operator:'JR-East', lineIds:['JobanLocal'],
      models:['E233系2000番台'], sourceUrl:JR_E233},
    {id:'jr-keiyo', operator:'JR-East', lineIds:['Keiyo'],
      models:['E233系5000番台','E233系1000番台'], sourceUrl:JR_E233},
    {id:'jr-saikyo-kawagoe', operator:'JR-East', lineIds:['SaikyoKawagoe','Kawagoe'],
      models:['E233系7000番台'], sourceUrl:JR_E233},
    {id:'jr-shonan-color', operator:'JR-East',
      lineIds:['Tokaido','TokaidoMain','Takasaki','UtsunomiyaJR','ShonanShinjuku','UenoTokyo'],
      models:['E231系1000番台','E233系3000番台'], sourceUrl:JR_OTHER},

    {id:'metro-ginza', operator:'TokyoMetro', lineIds:['Ginza'],
      models:['東京メトロ1000系'], sourceUrl:METRO},
    {id:'metro-marunouchi', operator:'TokyoMetro', lineIds:['Marunouchi'],
      models:['東京メトロ2000系'], sourceUrl:METRO},
    {id:'metro-hibiya', operator:'TokyoMetro', lineIds:['Hibiya'],
      models:['東京メトロ13000系'], sourceUrl:METRO},
    {id:'metro-tozai', operator:'TokyoMetro', lineIds:['Tozai'],
      models:['東京メトロ05系','東京メトロ07系','東京メトロ15000系'], sourceUrl:METRO},
    {id:'metro-chiyoda', operator:'TokyoMetro', lineIds:['Chiyoda'],
      models:['東京メトロ16000系'], sourceUrl:METRO},
    {id:'metro-yurakucho-fukutoshin', operator:'TokyoMetro', lineIds:['Yurakucho','Fukutoshin'],
      models:['東京メトロ10000系','東京メトロ17000系'], sourceUrl:METRO},
    {id:'metro-hanzomon', operator:'TokyoMetro', lineIds:['Hanzomon'],
      models:['東京メトロ8000系','東京メトロ08系','東京メトロ18000系'], sourceUrl:METRO},
    {id:'metro-namboku', operator:'TokyoMetro', lineIds:['Namboku'],
      models:['東京メトロ9000系'], sourceUrl:METRO},

    {id:'toei-asakusa', operator:'Toei', lineIds:['Asakusa'],
      models:['都営5500形'], sourceUrl:TOEI},
    {id:'toei-mita', operator:'Toei', lineIds:['Mita'],
      models:['都営6300形','都営6500形'], sourceUrl:TOEI},
    {id:'toei-shinjuku', operator:'Toei', lineIds:['Shinjuku'],
      models:['都営10-300形'], sourceUrl:TOEI},
    {id:'toei-oedo', operator:'Toei', lineIds:['Oedo'],
      models:['都営12-000形','都営12-600形'], sourceUrl:TOEI},
    {id:'toei-nippori-toneri', operator:'Toei', lineIds:['Nippori_Toneri'],
      models:['都営300形','都営320形','都営330形'], sourceUrl:TOEI},

    {id:'tokyu-toyoko', operator:'Tokyu', lineIds:['TokyuToyoko'],
      models:['東急5050系','東急5050系4000番台'],
      sourceUrl:'https://www.tokyu.co.jp/railway/trains/02/'},
    {id:'tokyu-denen', operator:'Tokyu', lineIds:['TokyuDenEn'],
      models:['東急5000系','東急2020系'],
      sourceUrl:'https://www.tokyu.co.jp/company/news/detail/56331.html'},
    {id:'tokyu-meguro', operator:'Tokyu', lineIds:['TokyuMeguro','TokyuShinYokohama'],
      models:['東急3000系','東急5080系','東急3020系'], sourceUrl:TOKYU},
    {id:'tokyu-ikegami-tamagawa', operator:'Tokyu', lineIds:['TokyuIkegami','TokyuTamagawa'],
      models:['東急1000系','東急7000系'], sourceUrl:TOKYU}
  ];

  // Only commuter/passenger stopping patterns. In particular do NOT assign a
  // commuter model to a LimitedExpress/liner/special or an unnamed service.
  var ORDINARY = /^(?:Local|Rapid|SpecialRapid|CommuterRapid|SemiExpress|Express|RapidExpress|CommuterExpress|CommuterSemiExpress|ChuoSpecialRapid|OmeSpecialRapid|CommuterSpecialRapid|SectionRapid|SectionExpress|SectionSemiExpress)$/;

  function lookup(lineId, operator, trainType) {
    var id = String(lineId || '').trim();
    var op = String(operator || '').trim();
    var type = String(trainType || '').trim();
    if (!id || !op || !type) return null;
    var prefix = 'odpt.TrainType:' + op + '.';
    if (type.indexOf(prefix) !== 0 || !ORDINARY.test(type.slice(prefix.length))) return null;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.operator !== op || row.lineIds.indexOf(id) < 0) continue;
      return {
        operator: row.operator,
        vehicleCandidates: row.models.slice(),
        evidenceRole: 'route-fleet-reference',
        _fleetReferenceOnly: true,
        planOverride: false,
        sourceUrl: row.sourceUrl,
        presetId: row.id
      };
    }
    return null;
  }

  root.MajorVehicleFleetPresets = Object.freeze({
    version: '2026-11-02',
    lookup: lookup,
    list: function () {
      return rows.map(function (row) {
        return {id:row.id, operator:row.operator, lineIds:row.lineIds.slice(),
          models:row.models.slice(), sourceUrl:row.sourceUrl};
      });
    }
  });
})(window);
