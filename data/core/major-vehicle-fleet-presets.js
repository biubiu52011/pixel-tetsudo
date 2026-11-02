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
      models:['東急1000系','東急7000系'], sourceUrl:TOKYU},

    // ===== 2026-11 phase 2: major private-railway and urban-network fleets =====
    // 京王2000系は2026年1月から営業中。これらは京王「所有車」の
    // 候補であり、都営新宿線からの直通車両を含む全運用一覧ではない。
    {id:'keio-main-network', operator:'Keio',
      lineIds:['KeioMain','KeioShin','KeioSagami','KeioTakao'],
      models:['京王2000系','京王5000系','京王7000系','京王8000系','京王9000系'],
      sourceUrl:'https://www.keio.co.jp/keiofan/museum/exist/'},
    {id:'keio-inokashira', operator:'Keio', lineIds:['KeioInokashira'],
      models:['京王1000系'], sourceUrl:'https://www.keio.co.jp/keiofan/museum/exist/'},
    {id:'keio-short-branches', operator:'Keio', lineIds:['KeioKeibajo','KeioZoo'],
      models:['京王7000系'], sourceUrl:'https://www.keio.co.jp/keiofan/museum/exist/'},

    // 小田急の通勤型。ロマンスカー / 地下鉄直通他社車 / 編成確定を含まない。
    {id:'odakyu-odawara', operator:'Odakyu', lineIds:['Odawara'],
      models:['小田急1000形','小田急2000形','小田急3000形',
        '小田急4000形','小田急5000形','小田急8000形'],
      sourceUrl:'https://www.odakyu.jp/company/railroad/train/'},
    {id:'odakyu-enoshima', operator:'Odakyu', lineIds:['OdakyuEnoshima'],
      models:['小田急1000形','小田急3000形','小田急4000形','小田急5000形'],
      sourceUrl:'https://www.odakyu.jp/company/railroad/train/'},
    {id:'odakyu-tama', operator:'Odakyu', lineIds:['OdakyuTama'],
      models:['小田急3000形','小田急4000形','小田急5000形'],
      sourceUrl:'https://www.odakyu.jp/company/railroad/train/'},

    // 京急1000形はアルミ / ステンレス / 番台で複数の外観あり。
    // 代表 PNG はここでは一切選択しない。
    {id:'keikyu-main', operator:'Keikyu', lineIds:['Keikyu'],
      models:['京急1000形','京急600形','京急1500形','京急2100形'],
      sourceUrl:'https://www.keikyu.co.jp/ride/train/'},
    {id:'keikyu-airport', operator:'Keikyu', lineIds:['KeikyuAirport'],
      models:['京急1000形','京急600形','京急1500形'],
      sourceUrl:'https://www.keikyu.co.jp/ride/train/'},
    {id:'keikyu-southern', operator:'Keikyu',
      lineIds:['KeikyuKurihama','KeikyuZushi'],
      models:['京急1000形','京急600形','京急1500形','京急2100形'],
      sourceUrl:'https://www.keikyu.co.jp/ride/train/'},
    {id:'keikyu-daishi', operator:'Keikyu', lineIds:['Daishi_Keikyu'],
      models:['京急1000形','京急1500形'],
      sourceUrl:'https://www.keikyu.co.jp/ride/train/'},

    // 2025年導入の新3200形を旧3200形と区別。AE形は
    // Skyliner 専用であり普通/快速の参照車隊へ入れない。
    {id:'keisei-main', operator:'Keisei', lineIds:['Keisei'],
      models:['京成3000形','京成3200形（2025年導入）','京成3700形',
        '京成3500形','京成3400形'],
      sourceUrl:'https://www.keisei.co.jp/keisei/keisei_museum/pictbook/'},
    {id:'keisei-oshiage', operator:'Keisei', lineIds:['KeiseiOshiage'],
      models:['京成3000形','京成3100形','京成3700形'],
      sourceUrl:'https://www.keisei.co.jp/keisei/keisei_museum/pictbook/'},
    {id:'keisei-chiba-network', operator:'Keisei',
      lineIds:['KeiseiChiba','KeiseiChihara'],
      models:['京成3000形','京成3200形（2025年導入）','京成3500形'],
      sourceUrl:'https://www.keisei.co.jp/keisei/keisei_museum/pictbook/'},
    {id:'keisei-kanamachi', operator:'Keisei', lineIds:['KeiseiKanamachi'],
      models:['京成3500形','京成3200形（2025年導入）'],
      sourceUrl:'https://www.keisei.co.jp/keisei/keisei_museum/pictbook/'},
    {id:'keisei-skyaccess', operator:'Keisei', lineIds:['NaritaSkyAccess'],
      models:['京成3100形'], sourceUrl:'https://www.keisei.co.jp/keisei/keisei_museum/pictbook/'},

    // 東武: 都心直通、東上、アーバンパーク、支線の車隊を混同しない。
    // 80000/80050型は野田線の2025/2026年導入車。
    {id:'tobu-isesaki-sky-tree', operator:'Tobu',
      lineIds:['TobuSkytree','TobuIsesaki'],
      models:['東武10000型','東武10030型','東武50050型',
        '東武70000型','東武70090型'],
      sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},
    {id:'tobu-tojo', operator:'Tobu', lineIds:['Tojo'],
      models:['東武10000型','東武10030型','東武30000系',
        '東武50000型','東武50070型','東武50090型'],
      sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},
    {id:'tobu-urban-park', operator:'Tobu', lineIds:['Noda'],
      models:['東武8000系','東武60000系','東武80000型','東武80050型'],
      sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},
    {id:'tobu-nikko-local', operator:'Tobu', lineIds:['TobuNikko','Nikkoku'],
      models:['東武20400型','東武10000型','東武10030型'],
      sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},
    {id:'tobu-utsunomiya', operator:'Tobu', lineIds:['TobuUtsunomiya'],
      models:['東武20400型'], sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},
    {id:'tobu-ogose', operator:'Tobu', lineIds:['Ogose'],
      models:['東武8000系'], sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},

    // 相鉄13000系は2026年3月から営業。新横浜線を走るJR・東急
    // の直通車両は所属方の異なるため、この相鉄所有車隊には含めない。
    {id:'sotetsu-main', operator:'Sotetsu', lineIds:['SotetsuMain','SotetsuIzumino'],
      models:['相鉄8000系','相鉄9000系','相鉄10000系','相鉄11000系',
        '相鉄12000系','相鉄13000系','相鉄20000系','相鉄21000系'],
      sourceUrl:'https://www.sotetsu.co.jp/life/gallery/train/'},
    {id:'sotetsu-shinyokohama', operator:'Sotetsu', lineIds:['SotetsuShin-Yokohama'],
      models:['相鉄12000系','相鉄20000系','相鉄21000系'],
      sourceUrl:'https://www.sotetsu.co.jp/life/gallery/train/'},

    {id:'seibu-ikebukuro', operator:'Seibu', lineIds:['Ikebukuro'],
      models:['西武2000系','西武6000系','西武20000系','西武30000系','西武40000系'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/'},
    {id:'seibu-haijima', operator:'Seibu', lineIds:['Haijima'],
      models:['西武2000系','西武20000系','西武30000系','西武40000系'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/'},
    {id:'seibu-yurakucho-through', operator:'Seibu', lineIds:['Yurakucho_Seibu'],
      models:['西武6000系','西武40000系'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/'},

    // 横浜市営地下鉄。引退済み1000/2000形を現役車隊に入れない。
    {id:'yokohama-blue', operator:'YokohamaMunicipal', lineIds:['YokohamaBlue'],
      models:['横浜市営地下鉄3000形','横浜市営地下鉄4000形'],
      sourceUrl:'https://www.city.yokohama.lg.jp/kotsu/tanoshimou/otanoshimi/sharyosyoukai.html'},
    {id:'yokohama-green', operator:'YokohamaMunicipal', lineIds:['YokohamaGreen'],
      models:['横浜市営地下鉄10000形'],
      sourceUrl:'https://www.city.yokohama.lg.jp/kotsu/tanoshimou/otanoshimi/sharyosyoukai.html'},

    // TX-1000系の交流区間進入は禁止（守谷以南のみ）。
    // 以下は路線単位の参照であり、列車/終点別の適用判定ではない。
    {id:'tx-fleet', operator:'TsukubaExpress', lineIds:['TsukubaExpress'],
      models:['TX-1000系（秋葉原〜守谷）','TX-2000系','TX-3000系'],
      sourceUrl:'https://www.mir.co.jp/feature/about_tx/index.html'},
    {id:'rinkai-owned', operator:'Rinkai', lineIds:['Rinkai'],
      models:['東京臨海高速鉄道70-000形','東京臨海高速鉄道71-000形'],
      sourceUrl:'https://www.twr.co.jp/route/tabid/144/Default.aspx'},
    {id:'minatomirai-owned', operator:'MinatoMirai', lineIds:['MinatoMirai'],
      models:['横浜高速鉄道Y500系'],
      sourceUrl:'https://www.mm21railway.co.jp/info/news/2026/03/denayokohama-dena-baystars-train-2026.html?mode=pc'},
    {id:'saitama-rapid-owned', operator:'SaitamaRapidRailway', lineIds:['SaitamaRapid'],
      models:['埼玉高速鉄道2000系'],
      sourceUrl:'https://www.s-rail.co.jp/news/2026/339.html'},

    // モノレール/高速線：車隊の候補であり広告媒体などの編成記録は
    // 当日の運転割当を証明しない。
    {id:'tokyo-monorail', operator:'TokyoMonorail', lineIds:['TokyoMonorail'],
      models:['東京モノレール1000形','東京モノレール2000形','東京モノレール10000形'],
      sourceUrl:'https://www.tokyo-monorail.co.jp/fun/vehicle/'}
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
