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

  // The north Fukuchiyama local corridor uses distinct 223-5500 stock.
  // A two-station itinerary is required before this can narrow a reference.
  var FUKUCHIYAMA_NORTH_KEYS = Object.freeze([
    'Shinoyamaguchi','Tamba-Oyama','Shimotaki','Tanigawa',
    'Kaibara-Hyogo','Iso-Tamba','Kuroi-Tamba','Ichijima',
    'Tamba-Takeda','Fukuchiyama'
  ]);

  // Carefully scoped to operator-owned principal stock, not a promise that
  // *every* train on the line is operated by these families.
  var rows = [
    {id:'jr-yamanote', operator:'JR-East', lineIds:['Yamanote'], serviceTypes:['Local'],
      models:['E235系0番台（山手線）'], sourceUrl:JR_E235},
    {id:'jr-keihin-tohoku', operator:'JR-East', lineIds:['KeihinTohoku'],
      models:['E233系1000番台'], sourceUrl:JR_E233},
    {id:'jr-chuo-ome', operator:'JR-East', lineIds:['ChuoRapid','Ome','Itsukaichi'],
      models:['E233系0番台'], sourceUrl:JR_E233},
    // 2026: Mitaka's yellow local fleet mixes E231-500, residual
    // E231-0 and Yamanote-transferred E235-0 (B31/B33 are *formation*
    // IDs, not a B/C train-number mapping). Tozai through stock remains
    // separately resolved by the 659/671 Y/A↔K/S source crosswalk.
    {id:'jr-chuo-sobu-local', operator:'JR-East', lineIds:['ChuoSobuLocal'],
      models:['E231系500番台','E231系0番台（中央・総武線各駅停車）',
        'E235系0番台（中央・総武線各駅停車）'],
      sourceUrl:'https://media.jreast.co.jp/articles/1723'},
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
    // 大崎～川越（埼京・川越線直通）と川越～高麗川（八高・川越線）は別の車隊。
    // どちらも路線単位の参考情報に過ぎず、個別列車の実車確定には使わない。
    {id:'jr-saikyo-kawagoe', operator:'JR-East', lineIds:['SaikyoKawagoe'],
      models:['E233系7000番台'], sourceUrl:JR_E233},
    {id:'jr-kawagoe-west', operator:'JR-East', lineIds:['Kawagoe'],
      models:['E231系3000番台','209系3500番台'],
      sourceUrl:'https://www.jreast.co.jp/press/2025/omiya/20250925_o01.pdf'},
    {id:'jr-shonan-color', operator:'JR-East',
      lineIds:['Tokaido','TokaidoMain','Takasaki','UtsunomiyaJR','ShonanShinjuku','UenoTokyo'],
      models:['E231系1000番台','E233系3000番台'], sourceUrl:JR_OTHER},

    {id:'metro-ginza', operator:'TokyoMetro', lineIds:['Ginza'], serviceTypes:['Local'],
      models:['東京メトロ1000系'], sourceUrl:METRO},
    {id:'metro-marunouchi', operator:'TokyoMetro', lineIds:['Marunouchi'], serviceTypes:['Local'],
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
    {id:'toei-oedo', operator:'Toei', lineIds:['Oedo'], serviceTypes:['Local'],
      models:['都営12-000形','都営12-600形'], sourceUrl:TOEI},
    {id:'toei-nippori-toneri', operator:'Toei', lineIds:['Nippori_Toneri'], serviceTypes:['Local'],
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
    {id:'keio-inokashira', operator:'Keio', lineIds:['KeioInokashira'], serviceTypes:['Local'],
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
    {id:'tobu-skytree', operator:'Tobu',
      lineIds:['TobuSkytree'],
      models:['東武10000型','東武10030型','東武50050型',
        '東武70000型','東武70090型','東武200型','東武500系'],
      sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},
    // TI northward / Tatebayashi: not a blanket TS roster. In particular,
    // 2-car 10000/10030 and 3-car 800/850 are different 2026 service pools.
    // Fleet lists do NOT prove numbered-train actual carsets.
    {id:'tobu-isesaki', operator:'Tobu',
      lineIds:['TobuIsesaki'],
      models:['東武800型','東武850型','東武10000型','東武10030型',
        '東武200型','東武500系','東武50050型',
        '東武70000型','東武70090型'],
      sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},
    {id:'tobu-tojo', operator:'Tobu', lineIds:['Tojo'],
      models:['東武10000型','東武10030型','東武30000系',
        '東武50000型','東武50070型','東武50090型','東武90000系'],
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
      sourceUrl:'https://www.tokyo-monorail.co.jp/fun/vehicle/'},

    // ===== 2026-11 phase 3: branch lines, local fleets and urban transit =====
    // All rows remain operator-scoped, reference-only candidates. These do not
    // assert any train's actual rolling stock, car number, formation or artwork.

    // JR East: keep branches separate; regional through services can use
    // additional stock not included in this representative reference list.
    {id:'jr-musashino', operator:'JR-East', lineIds:['Musashino'],
      models:['E231系0番台','209系500番台'],
      sourceUrl:'https://www.jreast.co.jp/train/local/'},
    {id:'jr-sagami', operator:'JR-East', lineIds:['Sagami'],
      models:['E131系500番台'], sourceUrl:'https://www.jreast.co.jp/train/local/'},
    {id:'jr-tsurumi-branches', operator:'JR-East',
      lineIds:['TsurumiUmiShibaura','TsurumiOkawa'],
      models:['E131系1000番台'], sourceUrl:'https://www.jreast.co.jp/train/local/'},
    {id:'jr-sotetsu-direct', operator:'JR-East', lineIds:['SotetsuJRDirect'],
      models:['E233系7000番台'], sourceUrl:JR_E233},

    // Tokyo Metro's short service branches must not inherit arbitrary train
    // types from other sections of Chiyoda or Marunouchi.
    {id:'metro-marunouchi-branch', operator:'TokyoMetro', lineIds:['MarunouchiBranch'], serviceTypes:['Local'],
      models:['東京メトロ2000系'], sourceUrl:METRO},
    {id:'metro-chiyoda-branch', operator:'TokyoMetro', lineIds:['ChiyodaBranch'], serviceTypes:['Local'],
      models:['東京メトロ05系（区間列車用）','東京メトロ16000系'], sourceUrl:METRO},

    // Toei Arakawa (Tokyo Sakura Tram) uses streetcar families rather than
    // the subway or Nippori-Toneri rolling stock.
    {id:'toei-arakawa-tram', operator:'Toei', lineIds:['Arakawa'], serviceTypes:['Local'],
      models:['都電7700形','都電8500形','都電8800形','都電8900形','都電9000形'],
      sourceUrl:'https://www.kotsu.metro.tokyo.jp/about/service/toden.html'},

    // Seibu: branch-local vehicles, sustainable transferred rolling stock and
    // the 2026 L00 Leo Liner are distinct from ordinary Ikebukuro Line stock.
    {id:'seibu-shinjuku', operator:'Seibu', lineIds:['SeibuShinjuku'],
      models:['西武2000系','西武20000系','西武30000系','西武40000系'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/'},
    {id:'seibu-chichibu-local', operator:'Seibu', lineIds:['SeibuChichibu'],
      models:['西武4000系','西武40000系'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/'},
    {id:'seibu-tamako', operator:'Seibu', lineIds:['SeibuTamako'],
      models:['西武9000系'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/9000/'},
    {id:'seibu-yamaguchi', operator:'Seibu', lineIds:['SeibuYamaguchi'], serviceTypes:['Local'],
      models:['西武8500系','西武L00系'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/L00/'},
    {id:'seibu-kokubunji', operator:'Seibu', lineIds:['Kokubunji'],
      models:['西武2000系','西武8000系（2025年導入）'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/8000/'},
    {id:'seibu-sayama', operator:'Seibu', lineIds:['Seibu_Sayama'],
      models:['西武2000系','西武7000系（2026年導入）'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/7000/'},
    {id:'seibu-toshima', operator:'Seibu', lineIds:['SeibuToshima'],
      models:['西武2000系','西武30000系'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/'},
    {id:'seibu-tamagawa', operator:'Seibu', lineIds:['SeibuTamagawa'],
      models:['西武101系'],
      sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/'},

    // Tobu's small local branches should not inherit the entire Skytree
    // or Tojo network fleet.
    // 8000 series left scheduled service on both Daishi and Kameido by 2025-07-22.
    // The currently shared two-car, one-person fleet is 10000 + 10030 (50 subgroup).
    // Route fleet is reference-only; it MUST NOT identify a specific train or PNG.
    // https://www.tetsudo.com/column/1315/
    // https://railf.jp/news/2025/01/19/165500.html
    // 1000 series is planned from 2027 onward, not in service in 2026.
    // https://www.tobu.co.jp/cms-pdf/releases/202603311157314Fpgmv6VfB8SxpzFBFF5Uw.pdf
    {id:'tobu-daishi', operator:'Tobu', lineIds:['Daishi_Tobu'],
      models:['東武10000型','東武10030型50番台'],
      validFrom:'2025-07-23',
      sourceUrl:'https://www.tetsudo.com/column/1315/'},
    {id:'tobu-kameido', operator:'Tobu', lineIds:['Tobu_Kameido'],
      models:['東武10000型','東武10030型50番台'],
      validFrom:'2025-07-23',
      sourceUrl:'https://www.tetsudo.com/column/1315/'},
    {id:'tobu-northern-branches', operator:'Tobu',
      lineIds:['Kiryu','Koizumi','Sano'],
      models:['東武8000系'],
      sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},

    // Tokyu Oimachi Line currently mixes older local stock with new
    // 5-car 6020 and 7-car express 6020 sets; the route alone is insufficient
    // to pick an exact model or even its formation length.
    // 大井町線は急行7両・各駅停車5両。路線だけで編成を決めない。
    {id:'tokyu-oimachi', operator:'Tokyu', lineIds:['TokyuOimachi'],
      serviceTypes:['Local','Express'],
      models:['東急6000系','東急6020系','東急9000系','東急9020系'],
      modelsByService:{
        Local:['東急6020系（5両・各駅停車）','東急9000系','東急9020系'],
        Express:['東急6000系（7両・急行）','東急6020系（7両・急行）']
      }, sourceUrl:'https://www.tokyu.co.jp/company/information/detail/58201.html'},
    {id:'tokyu-setagaya', operator:'Tokyu', lineIds:['TokyuSetagaya'], serviceTypes:['Local'],
      models:['東急300系'], sourceUrl:TOKYU},
    // 東急が列車運行、横浜高速鉄道が線路・Y000系車両を所有する例外。
    {id:'tokyu-kodomonokuni-y000', operator:'Tokyu', lineIds:['TokyuKodomonokuni'],
      vehicleOwner:'MinatoMirai', serviceTypes:['Local'],
      models:['横浜高速鉄道Y000系'],
      sourceUrl:'https://www.tokyu.co.jp/railway/train-history/kd/'},

    // Automated guideway, monorail and tram vehicles are line-specific.
    {id:'yurikamome-modern', operator:'Yurikamome', lineIds:['Yurikamome'], serviceTypes:['Local'],
      models:['ゆりかもめ7300系','ゆりかもめ7500系'],
      sourceUrl:'https://www.yurikamome.co.jp/feature/vehicle/'},
    {id:'tama-monorail', operator:'TamaMonorail', lineIds:['TamaMonorail'], serviceTypes:['Local'],
      models:['多摩都市モノレール1000系'],
      sourceUrl:'https://www.locationbox.metro.tokyo.lg.jp/catalog/996/'},
    {id:'new-shuttle', operator:'SaitamaNewUrbanTransit', lineIds:['NewShuttle'], serviceTypes:['Local'],
      models:['ニューシャトル2000系','ニューシャトル2020系'],
      sourceUrl:'https://new-shuttle.jp/newshuttle_atraction/'},
    {id:'chiba-monorail', operator:'ChibaUrbanMonorail',
      lineIds:['ChibaMonorail1','ChibaMonorail2'], serviceTypes:['Local'],
      models:['千葉都市モノレール1000形','千葉都市モノレール0形'],
      sourceUrl:'https://chiba-monorail.co.jp/index.php/about-monorail/sharyou/'},
    {id:'shonan-monorail', operator:'ShonanMonorail', lineIds:['ShonanMonorail'], serviceTypes:['Local'],
      models:['湘南モノレール5000系'],
      sourceUrl:'https://www.shonan-monorail.co.jp/fun/vehicle.html'},
    {id:'enoden-local', operator:'EnoshimaElectric', lineIds:['Enoshima'], serviceTypes:['Local'],
      models:['江ノ電1000形','江ノ電2000形','江ノ電20形','江ノ電500形',
        '江ノ電700形（2026年導入）'],
      sourceUrl:'https://www.enoden.co.jp/fan/museum/vehicle/700/'},
    {id:'toyo-rapid-owned', operator:'ToyoRapid', lineIds:['ToyoRapid'],
      models:['東葉高速鉄道2000系'],
      sourceUrl:'https://www.toyokosoku.co.jp/company/profile'},
    {id:'utsunomiya-lrt', operator:'UtsunomiyaLightRail', lineIds:['UtsunomiyaLRT'], serviceTypes:['Local'],
      models:['宇都宮ライトレールHU300形'],
      sourceUrl:'https://www.miyarail.co.jp/userguide-ticket-info'}
,

    // ===== 2026-11 phase 4: JR East regional fleets, rail segments only =====
    // Representative line fleets only. A line crossing multiple electrical,
    // regional or BRT boundaries cannot decide an individual train identity.
    // BRT conversions and service suspensions are NOT resolved by this data.
    // In particular E131 stock replaced Senseki 205 cars in March 2026,
    // while the independent Senseki-Tohoku Line still uses HB-E210 cars.
    // Do not display any preset model as a verified/real-time assignment.
    {id:'jr-niigata-e129', operator:'JR-East', lineIds:['Echigo','Hakushin','Miyo','Yahiko'],
      models:['E129系'], sourceUrl:'https://www.jreast.co.jp/train/local/e129.html'},
    {id:'jr-joetsu-regional', operator:'JR-East', lineIds:['Joetsu'],
      models:['211系','E129系'], sourceUrl:'https://www.jreast.co.jp/train/local/211.html'},
    // E131-200 is confined to Shinonoi–Nagano, never a default for all Shinetsu.
    {id:'jr-shinetsu-regional', operator:'JR-East', lineIds:['Shinetsu'],
      models:['211系','E129系','GV-E400系','E131系200番台'],
      sourceUrl:'https://www.jreast.co.jp/press/2026/nagano/20260507_na01.pdf'},
    {id:'jr-uetsu-regional', operator:'JR-East', lineIds:['Uetsu'],
      models:['E129系','701系','GV-E400系'], sourceUrl:'https://www.jreast.co.jp/train/local/gv_e400.html'},
    {id:'jr-gunma-local', operator:'JR-East', lineIds:['Agatsuma','Ryomo'],
      models:['211系'], sourceUrl:'https://www.jreast.co.jp/train/local/211.html'},
    // Nagano E131-200 began entering service in autumn 2026. These entries
    // are non-exclusive line fleet references, not train-level dispatch data.
    {id:'jr-chuo-main-local', operator:'JR-East', lineIds:['ChuoMain'],
      models:['211系','E127系','E131系200番台'],
      sourceUrl:'https://www.jreast.co.jp/press/2026/nagano/20260507_na01.pdf'},
    // Oito is not on the published Nagano E131-200 deployment corridor.
    {id:'jr-oito-local', operator:'JR-East', lineIds:['Oito'],
      models:['211系','E127系'], sourceUrl:'https://www.jreast.co.jp/train/local/e127.html'},
    // The JR-West Oito section has its OWN KiHa120-300 Okayama-style
    // orange/red diesel family; neither existing regional 120 PNG
    // matches the Oito livery, so the reference contains NO icon.
    {id:'jr-west-oito-kiha120-300',operator:'JR-West',
      lineIds:['OitoWest'],models:['キハ120形300番台（大糸線・岡山色）'],
      sourceUrl:'https://info-otari.jp/oito_line/'},
    {id:'jr-nagano-shinonoi-local', operator:'JR-East', lineIds:['Shinonoi'],
      models:['211系','E127系','E131系200番台'],
      sourceUrl:'https://www.jreast.co.jp/press/2026/nagano/20260507_na01.pdf'},
    {id:'jr-chuo-tatsuno', operator:'JR-East', lineIds:['ChuoTatsuno'],
      models:['E127系'], sourceUrl:'https://www.jreast.co.jp/train/local/e127.html'},
    {id:'jr-boso-local', operator:'JR-East', lineIds:['Uchibo','Sotobo'],
      models:['209系2000・2100番台','E131系','E233系5000番台'], sourceUrl:'https://www.jreast.co.jp/train/local/e131.html'},
    {id:'jr-togane', operator:'JR-East', lineIds:['Togane'],
      models:['209系2000・2100番台','E233系5000番台'], sourceUrl:'https://www.jreast.co.jp/train/local/209.html'},
    {id:'jr-sobu-main', operator:'JR-East', lineIds:['SobuMain'],
      models:['209系2000・2100番台','E131系'], sourceUrl:'https://www.jreast.co.jp/train/local/209.html'},
    {id:'jr-narita-main', operator:'JR-East', lineIds:['Narita'],
      models:['209系2000・2100番台','E131系','E231系'], sourceUrl:'https://www.jreast.co.jp/train/local/e131.html'},
    {id:'jr-narita-abiko', operator:'JR-East', lineIds:['NaritaAbikoBranch'],
      models:['E231系0番台'], sourceUrl:'https://www.jreast.co.jp/train/local/e231.html'},
    {id:'jr-narita-airport', operator:'JR-East', lineIds:['NaritaAirportBranch'],
      models:['E235系1000番台'], sourceUrl:'https://www.jreast.co.jp/train/local/e235.html'},
    {id:'jr-kashima', operator:'JR-East', lineIds:['Kashima'],
      models:['E131系'], sourceUrl:'https://www.jreast.co.jp/train/local/e131.html'},
    {id:'jr-senseki-2026', operator:'JR-East', lineIds:['Senseki'],
      models:['E131系（仙石線仕様）'], sourceUrl:'https://www.jreast.co.jp/train/local/e131.html'},
    {id:'jr-senseki-tohoku', operator:'JR-East', lineIds:['SensekiTohoku'],
      models:['HB-E210系'], sourceUrl:'https://www.jreast.co.jp/train/local/hb_e210.html'},
    {id:'jr-senzan', operator:'JR-East', lineIds:['Senzan'],
      models:['E721系'], sourceUrl:'https://www.jreast.co.jp/train/local/e721.html'},
    {id:'jr-banetsu-west', operator:'JR-East', lineIds:['BanetsuWest'],
      models:['E721系','GV-E400系','キハ110系'], sourceUrl:'https://www.jreast.co.jp/train/local/e721.html'},
    {id:'jr-tohoku-main-regional', operator:'JR-East', lineIds:['TohokuMain'],
      models:['701系','E721系','HB-E220系'], sourceUrl:'https://www.jreast.co.jp/train/local/e721.html'},
    // Route-wide *candidate inventory*, not a per-number vehicle assignment.
    // 2026-09-19 E723-5000 began service on Fukushima–Shinjo; 719-5000
    // is being phased out. The OuMain corridor also carries Gono resort,
    // Tsugaru express, Oga ACCUM and separately modeled Shinkansen trains.
    {id:'jr-ou-main-regional', operator:'JR-East', lineIds:['OuMain'],
      models:['701系','701系5500番台','719系5000番台','E723系5000番台',
        'EV-E801系','GV-E400系','キハ110系','E751系','HB-E300系'],
      sourceUrl:'https://www.jreast.co.jp/train/local/701.html'},
    // In Yamagata, the September 2026 E723-5000 launch began replacing
    // 719-5000, while standard-gauge 701-5500 continues in the fleet.
    // These are candidate families, not dated per-number assignments.
    // Tazawako's 701-5000 must not inherit Yamagata's mixed-fleet models.
    {id:'jr-yamagata-regional-2611', operator:'JR-East', lineIds:['Yamagata'],
      models:['701系5500番台','719系5000番台','E723系5000番台'],
      sourceUrl:'https://www.jreast.co.jp/press/2025/20251126_ho03.pdf'},
    {id:'jr-tazawako-standard-gauge', operator:'JR-East', lineIds:['Tazawako'],
      models:['701系5000番台'],
      sourceUrl:'https://www.jreast.co.jp/train/local/701.html'},
    {id:'jr-tsugaru', operator:'JR-East', lineIds:['Tsugaru'],
      models:['701系（鉄道運行区間）'], sourceUrl:'https://www.jreast.co.jp/train/local/701.html'},
    {id:'jr-oga-accum', operator:'JR-East', lineIds:['Oga'],
      models:['EV-E801系'], sourceUrl:'https://www.jreast.co.jp/train/local/ev_e801.html'},
    {id:'jr-gono', operator:'JR-East', lineIds:['Gono'],
      models:['GV-E400系'], sourceUrl:'https://www.jreast.co.jp/train/local/gv_e400.html'},
    {id:'jr-banetsu-east', operator:'JR-East', lineIds:['BanetsuEast'],
      models:['キハ110系'], sourceUrl:'https://www.jreast.co.jp/train/local/kiha110.html'},
    {id:'jr-tohoku-diesel-lines', operator:'JR-East', lineIds:['Ishinomaki','Kitakami','Iiyama','Ominato','Yamada','Kounan','RikutoEast','RikutsuWest'],
      models:['キハ100系・キハ110系'], sourceUrl:'https://www.jreast.co.jp/train/local/kiha110.html'},
    {id:'jr-koumi', operator:'JR-East', lineIds:['Komii'],
      models:['キハ110系','キハE200形'], sourceUrl:'https://www.jreast.co.jp/train/local/kiha_e200.html'},
    {id:'jr-hachinohe', operator:'JR-East', lineIds:['Hachinohe'],
      models:['キハE130系'], sourceUrl:'https://www.jreast.co.jp/train/local/kiha_e130.html'},
    {id:'jr-kururi', operator:'JR-East', lineIds:['Kururi'],
      models:['キハE130系'], sourceUrl:'https://www.jreast.co.jp/train/local/kiha_e130.html'},
    {id:'jr-suigun', operator:'JR-East', lineIds:['Suigun','SuigunBranch'],
      models:['キハE130系'], sourceUrl:'https://www.jreast.co.jp/train/local/kiha_e130.html'},
    {id:'jr-tadami', operator:'JR-East', lineIds:['Tadami'],
      models:['キハE120形','キハ110系'], sourceUrl:'https://www.jreast.co.jp/train/local/kiha_e130.html'},
    {id:'jr-kamaishi', operator:'JR-East', lineIds:['Kamaishi'],
      models:['HB-E220系','キハ100系・キハ110系'], sourceUrl:'https://www.jreast.co.jp/train/local/hb_e220.html'},
    {id:'jr-hachiko', operator:'JR-East', lineIds:['Hachiko'],
      models:['HB-E220系（非電化区間）','E231系3000番台（電化区間）','209系3500番台（電化区間）'], sourceUrl:'https://www.jreast.co.jp/train/local/hb_e220.html'},
    {id:'jr-karasuyama', operator:'JR-East', lineIds:['Karasuyama'],
      models:['EV-E301系'], sourceUrl:'https://www.jreast.co.jp/train/local/ev_e301.html'},
    {id:'jr-mito', operator:'JR-East', lineIds:['Mito'],
      models:['E531系'], sourceUrl:'https://www.jreast.co.jp/train/local/e531.html'},
    {id:'jr-ito', operator:'JR-East', lineIds:['Ito'],
      models:['E231系1000番台','E233系3000番台'], sourceUrl:'https://www.jreast.co.jp/train/local/e231.html'},
    {id:'jr-nambu-hamakawasaki', operator:'JR-East', lineIds:['NambuBranch'],
      models:['E127系'], sourceUrl:'https://www.jreast.co.jp/press/2022/yokohama/20230217_y2.pdf'},
    {id:'jr-yonesaka-rail', operator:'JR-East', lineIds:['Yonezawa'],
      models:['キハ110系（運行中の鉄道区間）'], sourceUrl:'https://www.jreast.co.jp/train/local/kiha110.html'},
    {id:'seibu-seibuen', operator:'Seibu', lineIds:['SeibuEn'],
      models:['西武2000系'], sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/2000/'},

    // ===== 2026-11 phase 5: Shinkansen operator-owned fleet references =====
    // A named service NEVER implies its exact rolling stock or consist.
    // A Hokkaido H5 / West N700S owner row does not include every JR East,
    // JR Central or partner-operated through train seen on the same tracks.
    {id:'jr-east-tohoku-shinkansen', operator:'JR-East', lineIds:['TohokuShinkansen'],
      models:['E2系','E5系','E6系','E8系'], shinkansenTypes:['Shinkansen','Hayabusa','Hayate','Yamabiko','Nasuno','Komachi','Tsubasa'],
      sourceUrl:'https://www.jreast.co.jp/railway/train/'},
    {id:'jr-east-joetsu-shinkansen', operator:'JR-East', lineIds:['JoetsuShinkansen'],
      models:['E7系'], shinkansenTypes:['Shinkansen','Toki','Tanigawa'],
      sourceUrl:'https://www.jreast.co.jp/train/shinkan/e7.html'},
    {id:'jr-east-hokuriku-shinkansen', operator:'JR-East', lineIds:['HokurikuShinkansen'],
      models:['E7系'], shinkansenTypes:['Shinkansen','Kagayaki','Hakutaka','Asama'],
      sourceUrl:'https://www.jreast.co.jp/train/shinkan/e7.html'},
    {id:'jr-east-yamagata-shinkansen', operator:'JR-East', lineIds:['YamagataShinkansen'],
      models:['E8系'], shinkansenTypes:['Shinkansen','Tsubasa'],
      sourceUrl:'https://www.jreast.co.jp/train/shinkan/e8.html'},
    {id:'jr-east-akita-shinkansen', operator:'JR-East', lineIds:['AkitaShinkansen'],
      models:['E6系'], shinkansenTypes:['Shinkansen','Komachi'],
      sourceUrl:'https://www.jreast.co.jp/train/shinkan/e6.html'},
    {id:'jr-hokkaido-shinkansen', operator:'JR-Hokkaido', lineIds:['HokkaidoShinkansen'],
      models:['H5系（JR北海道保有車）'], shinkansenTypes:['Shinkansen','Hayabusa','Hayate'],
      sourceUrl:'https://www.jrhokkaido.co.jp/train/shinkansen.html'},
    {id:'jr-central-tokaido-shinkansen', operator:'JR-Central', lineIds:['TokaidoShinkansen'],
      models:['N700S系','N700A系'], shinkansenTypes:['Shinkansen','Nozomi','Hikari','Kodama'],
      sourceUrl:'https://recommend.jr-central.co.jp/gooddayexpress/evolution/'},
    {id:'jr-west-sanyo-shinkansen', operator:'JR-West', lineIds:['SanyoShinkansen'],
      models:['500系','N700系（JR西日本保有車）','N700S系（JR西日本保有車）'], shinkansenTypes:['Shinkansen','Nozomi','Hikari','Kodama','Mizuho','Sakura'],
      sourceUrl:'https://www.jr-odekake.net/train/500/'},
    {id:'jr-kyushu-kyushu-shinkansen', operator:'JR-Kyushu', lineIds:['KyushuShinkansen'],
      models:['800系','N700系8000番台（R編成）'], shinkansenTypes:['Shinkansen','Mizuho','Sakura','Tsubame'],
      sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jr-kyushu-nishi-kyushu-shinkansen', operator:'JR-Kyushu', lineIds:['NishiKyushuShinkansen'],
      models:['N700S系（西九州・かもめ用6両編成）'], shinkansenTypes:['Shinkansen','Kamome'],
      sourceUrl:'https://www.jrkyushu.co.jp/train/'},

    // ===== 2026-11 phase 6: JR West and JR Kyushu regional fleets =====
    // Regional lines combine multiple electrification and through-running
    // segments. These source-backed types are examples, never a vehicle assignment.
    {id:'jrwest-osaka-loop', operator:'JR-West', lineIds:['OsakaLoop'],
      models:['JR西日本323系'], sourceUrl:'https://www.westjr.co.jp/press/article/2019/05/page_14241.html'},
    {id:'jrwest-yumesaki', operator:'JR-West', lineIds:['Yumesaki'],
      models:['JR西日本323系'], sourceUrl:'https://www.westjr.co.jp/press/article/2019/05/page_14241.html'},
    {id:'jrwest-yamatoji', operator:'JR-West', lineIds:['KansaiMain'],
      models:['JR西日本221系','JR西日本キハ120形（非電化区間）'], sourceUrl:'https://www.westjr.co.jp/press/article/2020/02/page_15645.html'},
    {id:'jrwest-osaka-higashi', operator:'JR-West', lineIds:['OsakaHigashi'],
      models:['JR西日本221系'], sourceUrl:'https://www.westjr.co.jp/press/article/2020/02/page_15645.html'},
    {id:'jrwest-nara', operator:'JR-West', lineIds:['Nara'],
      models:['JR西日本221系'], sourceUrl:'https://www.westjr.co.jp/press/article/2020/02/page_15645.html'},
    {id:'jrwest-kyoto-kobe', operator:'JR-West', lineIds:['TokaidoKansai'],
      models:['JR西日本223系','JR西日本225系','JR西日本207系','JR西日本321系'], sourceUrl:'https://www.westjr.co.jp/press/article/2020/02/page_15645.html'},
    {id:'jrwest-hanwa-kansai', operator:'JR-West', lineIds:['Hanwa','KansaiAirport'],
      models:['JR西日本223系','JR西日本225系'], sourceUrl:'https://www.westjr.co.jp/fan/paper/local/'},
    {id:'jrwest-gakkentoshi', operator:'JR-West', lineIds:['Gakkentoshi','JRTozai'],
      models:['JR西日本207系','JR西日本321系'], sourceUrl:'https://www.jr-odekake.net/railroad/service/train-woman.html'},
    {id:'jrwest-fukuchiyama', operator:'JR-West', lineIds:['Fukuchiyama'],
      // Route-wide candidate fleet only; not an individual service/formation.
      models:['JR西日本207系','JR西日本321系','JR西日本223系6000番台','JR西日本225系6000番台'],
      // 篠山口～福知山の普通列車に限り、下の区間判定で223系5500番台へ絞る。
      // 车型参考不等于特定列车的运用证据；不推断编成或 PNG。
      sourceUrl:'https://express22.xsrv.jp/maintarminal/jrtakaraduka/'},
    {id:'jrwest-wakayama-sakurai', operator:'JR-West', lineIds:['WakayamaLine','Sakurai'],
      models:['JR西日本227系1000番台'], sourceUrl:'https://www.westjr.co.jp/press/article/2018/03/page_12012.html'},
    {id:'jrwest-kisei', operator:'JR-West', lineIds:['KiseiWest'],
      models:['JR西日本227系1000番台'], sourceUrl:'https://www.westjr.co.jp/press/article/2018/03/page_12012.html'},
    {id:'jrwest-hiroshima', operator:'JR-West', lineIds:['Kure','Kabe'],
      models:['JR西日本227系0番台'], sourceUrl:'https://www.westjr.co.jp/press/article/2014/06/page_5790.html'},
    {id:'jrwest-sanyo-main', operator:'JR-West', lineIds:['SanyoMain'],
      models:['JR西日本227系','JR西日本223系','JR西日本225系'], sourceUrl:'https://www.westjr.co.jp/press/article/2014/06/page_5790.html'},
    {id:'jrwest-kakogawa', operator:'JR-West', lineIds:['KakogawaLine'],
      models:['JR西日本125系'], sourceUrl:'https://www.westjr.co.jp/fan/paper/local/'},
    {id:'jrwest-kishin', operator:'JR-West', lineIds:['HimejiLine'],
      models:['JR西日本キハ122形','JR西日本キハ127形'], sourceUrl:'https://www.westjr.co.jp/company/info/issue/data/pdf/data2025_15.pdf'},
    {id:'jrwest-kosei', operator:'JR-West', lineIds:['Kosei'],
      models:['JR西日本223系','JR西日本225系','JR西日本521系'], sourceUrl:'https://www.westjr.co.jp/fan/paper/local/'},
    {id:'jrwest-ako', operator:'JR-West', lineIds:['Ako'],
      models:['JR西日本223系','JR西日本225系','JR西日本227系'], sourceUrl:'https://www.westjr.co.jp/fan/paper/local/'},
    {id:'jrkyushu-kagoshima-main', operator:'JR-Kyushu', lineIds:['KagoshimaMain'],
      models:['JR九州813系','JR九州817系','JR九州821系'], sourceUrl:'https://www.jrkyushu.co.jp/company/info/history/history07.html'},
    {id:'jrkyushu-kashii-dencha', operator:'JR-Kyushu', lineIds:['KashiiLine'],
      models:['JR九州BEC819系（DENCHA）'], sourceUrl:'https://www.jrkyushu.co.jp/company/info/history/history07.html'},
    {id:'jrkyushu-nagasaki-yc1', operator:'JR-Kyushu', lineIds:['NagasakiMain'],
      models:['JR九州YC1系','JR九州817系（電化区間）'], sourceUrl:'https://www.jrkyushu.co.jp/news/__icsFiles/afieldfile/2025/06/12/20250612_saga_nagasaki_new_car_model.pdf'},
    {id:'jrkyushu-sasebo-yc1', operator:'JR-Kyushu', lineIds:['Sasebo'],
      models:['JR九州YC1系','JR九州817系（電化区間）'], sourceUrl:'https://www.jrkyushu.co.jp/news/__icsFiles/afieldfile/2025/06/12/20250612_saga_nagasaki_new_car_model.pdf'},
    {id:'jrkyushu-omura-yc1', operator:'JR-Kyushu', lineIds:['Omura'],
      models:['JR九州YC1系'], sourceUrl:'https://www.jrkyushu.co.jp/news/__icsFiles/afieldfile/2025/06/12/20250612_saga_nagasaki_new_car_model.pdf'},
    {id:'jrkyushu-chikuhi', operator:'JR-Kyushu', lineIds:['Chikuhi'],
      models:['JR九州103系1500番台','JR九州303系','JR九州305系'], sourceUrl:'https://www.jrkyushu.co.jp/byarea/fukuoka_saga/info/__icsFiles/afieldfile/2025/10/14/20251015_Chikuhi_Line_103_Series_Karatsu_Kunchi_Headmark_1.pdf'},
    {id:'jrkyushu-karatsu', operator:'JR-Kyushu', lineIds:['Karatsu'],
      models:['JR九州103系1500番台','JR九州303系','JR九州305系','JR九州キハ125形'], sourceUrl:'https://www.jrkyushu.co.jp/byarea/fukuoka_saga/info/__icsFiles/afieldfile/2025/10/14/20251015_Chikuhi_Line_103_Series_Karatsu_Kunchi_Headmark_1.pdf'},
    {id:'jrkyushu-chikuho', operator:'JR-Kyushu', lineIds:['Chikuho'],
      models:['JR九州817系','JR九州BEC819系'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-wakamatsu', operator:'JR-Kyushu', lineIds:['Wakamatsu'],
      models:['JR九州BEC819系'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-sasaguri', operator:'JR-Kyushu', lineIds:['Sasaguri'],
      models:['JR九州817系','JR九州821系'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},

    // ===== 2026-11 phase 7: JR West remainder, Kyushu regional and Hakodate =====
    // These are operator-scoped reference fleets only, not train assignments.
    // Diesel/electric and through-running corridor boundaries must be
    // checked against a station-level service record before identification.
    // For Hitahikosan, the BRT section is explicitly NOT a railway vehicle.
    {id:'jrwest-sanin-main', operator:'JR-West', lineIds:['SaninMain'],
      models:['JR西日本221系（嵯峨野線区間）','JR西日本223系5500番台','JR西日本キハ126系','JR西日本キハ120形','JR西日本キハ40系'], sourceUrl:'https://www.westjr.co.jp/company/info/issue/data/pdf/data2025_15.pdf'},
    {id:'jrwest-bantan', operator:'JR-West', lineIds:['Bantan'],
      models:['JR西日本103系（電化区間）','JR西日本キハ40系（非電化区間）','JR西日本223系（姫路～寺前・個別列車確認要）','JR西日本キハ41形（寺前～和田山）','JR西日本キハ189系（特急はまかぜ・全線）'], sourceUrl:'https://www.westjr.co.jp/company/info/issue/data/pdf/data2025_15.pdf'},
    {id:'jrwest-maizuru', operator:'JR-West', lineIds:['Maizuru'],
      models:['JR西日本125系','JR西日本223系5500番台'], sourceUrl:'https://www.westjr.co.jp/company/info/issue/data/pdf/data2025_15.pdf'},
    {id:'jrwest-yamaguchi', operator:'JR-West', lineIds:['Yamaguchi'],
      models:['JR西日本キハ40系','JR西日本キハ47形'], sourceUrl:'https://www.westjr.co.jp/company/info/issue/data/pdf/data2025_15.pdf'},
    {id:'jrwest-iwatoku', operator:'JR-West', lineIds:['Iwakado'],
      models:['JR西日本キハ40系','JR西日本キハ47形'], sourceUrl:'https://www.westjr.co.jp/company/info/issue/data/pdf/data2025_15.pdf'},
    {id:'jrwest-ube', operator:'JR-West', lineIds:['Ube'],
      models:['JR西日本105系','JR西日本123系'], sourceUrl:'https://www.westjr.co.jp/company/info/issue/data/pdf/data2025_15.pdf'},
    {id:'jrkyushu-nippo', operator:'JR-Kyushu', lineIds:['Nippo'],
      models:['JR九州815系','JR九州817系'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-kyudai', operator:'JR-Kyushu', lineIds:['Kyudai'],
      models:['JR九州キハ125形','JR九州キハ200形','JR九州キハ220形'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-hohi', operator:'JR-Kyushu', lineIds:['Hohi'],
      models:['JR九州815系（熊本～肥後大津の電化区間）','JR九州817系（電化区間）','JR九州キハ200形（非電化区間）','JR九州キハ220形（非電化区間）'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-misumi', operator:'JR-Kyushu', lineIds:['Misumi'],
      models:['JR九州キハ200形','JR九州キハ220形'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-ibusuki', operator:'JR-Kyushu', lineIds:['IbusukiMakurazaki'],
      models:['JR九州キハ40系','JR九州キハ47形','JR九州キハ200形'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-gotoji', operator:'JR-Kyushu', lineIds:['Gotoji'],
      models:['JR九州キハ40系','JR九州キハ47形'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-nichinan', operator:'JR-Kyushu', lineIds:['Nichinan'],
      models:['JR九州キハ40系','JR九州キハ47形'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-miyazaki-airport', operator:'JR-Kyushu', lineIds:['MiyazakiAirport'],
      models:['JR九州817系','JR九州713系'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-kitto', operator:'JR-Kyushu', lineIds:['Kitto'],
      models:['JR九州キハ40系','JR九州キハ47形'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-kagoshima-branches', operator:'JR-Kyushu', lineIds:['KagoshimaMainJA','KagoshimaMainJB'],
      models:['JR九州811系','JR九州813系','JR九州817系','JR九州821系'], sourceUrl:'https://www.jrkyushu.co.jp/company/info/history/history07.html'},
    {id:'jrkyushu-haruda', operator:'JR-Kyushu', lineIds:['Haruda'],
      models:['JR九州キハ40系','JR九州キハ47形'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'jrkyushu-hitahikosan-rail', operator:'JR-Kyushu', lineIds:['Hitahikosan'],
      models:['JR九州キハ40系（城野～添田の鉄道区間のみ）','JR九州キハ47形（城野～添田の鉄道区間のみ）'], sourceUrl:'https://www.jrkyushu.co.jp/train/'},
    {id:'hakodate-tram-owned', operator:'HakodateCity', lineIds:['Hakodate2','Hakodate5'],
      models:['函館市電710形','函館市電800形','函館市電2000形','函館市電3000形','函館市電7000形','函館市電8000形','函館市電8100形','函館市電9600形'], sourceUrl:'https://www.city.hakodate.hokkaido.jp/docs/2014012101097/'}
  ];


  // Operator-owned through-service candidates. These are NOT additional
  // operator/line combinations in the canonical line dataset. Use them only
  // when the upstream timetable explicitly supplies a different trainOwner.
  // Network presence or a suffix on the public train number alone is not proof.
  var throughRows = [
    // Only when upstream supplies the explicit vehicle owner. A route name,
    // train suffix or fleet preset alone never confirms a train's physical stock.
    {operator:'JR-East', lineIds:['SaikyoKawagoe'], vehicleOwner:'TWR',
      models:['東京臨海高速鉄道70-000形','東京臨海高速鉄道71-000形'],
      sourceUrl:'https://www.twr.co.jp/route/tabid/144/Default.aspx'},
    {operator:'JR-East', lineIds:['SaikyoKawagoe','SotetsuJRDirect'], vehicleOwner:'Sotetsu',
      models:['相鉄12000系'], sourceUrl:'https://www.sotetsu.co.jp/life/gallery/train/'},
    {operator:'TokyoMetro', lineIds:['Hibiya'], vehicleOwner:'Tobu',
      models:['東武70000型','東武70090型'], sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},
    {operator:'TokyoMetro', lineIds:['Tozai'], vehicleOwner:'JR-East',
      models:['E231系800番台'], sourceUrl:'https://www.jreast.co.jp/train/local/e231.html'},
    {operator:'TokyoMetro', lineIds:['Tozai'], vehicleOwner:'ToyoRapid',
      models:['東葉高速鉄道2000系'], sourceUrl:'https://www.toyokosoku.co.jp/company/profile'},
    {operator:'TokyoMetro', lineIds:['Chiyoda'], vehicleOwner:'JR-East',
      models:['E233系2000番台'], sourceUrl:JR_E233},
    {operator:'TokyoMetro', lineIds:['Chiyoda'], vehicleOwner:'Odakyu',
      models:['小田急4000形'], sourceUrl:'https://www.odakyu.jp/company/railroad/train/'},
    {operator:'JR-East', lineIds:['JobanLocal'], vehicleOwner:'TokyoMetro',
      models:['東京メトロ16000系'], sourceUrl:METRO},
    {operator:'JR-East', lineIds:['JobanLocal'], vehicleOwner:'Odakyu',
      models:['小田急4000形'], sourceUrl:'https://www.odakyu.jp/company/railroad/train/'},
    {operator:'TokyoMetro', lineIds:['Hanzomon'], vehicleOwner:'Tokyu',
      models:['東急5000系','東急2020系'], sourceUrl:TOKYU},
    {operator:'TokyoMetro', lineIds:['Hanzomon'], vehicleOwner:'Tobu',
      models:['東武50050型'], sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},
    {operator:'TokyoMetro', lineIds:['Namboku'], vehicleOwner:'SaitamaRapidRailway',
      models:['埼玉高速鉄道2000系'], sourceUrl:'https://www.s-rail.co.jp/news/2026/339.html'},
    {operator:'TokyoMetro', lineIds:['Namboku'], vehicleOwner:'Tokyu',
      models:['東急3000系','東急5080系','東急3020系'], sourceUrl:TOKYU},
    {operator:'TokyoMetro', lineIds:['Namboku'], vehicleOwner:'Sotetsu',
      models:['相鉄21000系'], sourceUrl:'https://www.sotetsu.co.jp/life/gallery/train/'},
    {operator:'Toei', lineIds:['Mita'], vehicleOwner:'Tokyu',
      models:['東急3000系','東急5080系','東急3020系'], sourceUrl:TOKYU},
    {operator:'Toei', lineIds:['Mita'], vehicleOwner:'Sotetsu',
      models:['相鉄21000系'], sourceUrl:'https://www.sotetsu.co.jp/life/gallery/train/'},
    {operator:'TokyoMetro', lineIds:['Yurakucho','Fukutoshin'], vehicleOwner:'Tobu',
      models:['東武50070型'], sourceUrl:'https://www.tobu.co.jp/corporation/rail/vehicles/'},
    {operator:'TokyoMetro', lineIds:['Yurakucho','Fukutoshin'], vehicleOwner:'Seibu',
      models:['西武6000系','西武40000系'], sourceUrl:'https://www.seiburailway.jp/railway/encyclopedia/'},
    {operator:'TokyoMetro', lineIds:['Fukutoshin'], vehicleOwner:'Tokyu',
      models:['東急5050系','東急5050系4000番台'], sourceUrl:TOKYU},
    {operator:'TokyoMetro', lineIds:['Fukutoshin'], vehicleOwner:'MinatoMirai',
      models:['横浜高速鉄道Y500系'], sourceUrl:'https://www.mm21railway.co.jp/info/news/2026/03/denayokohama-dena-baystars-train-2026.html?mode=pc'},
    {operator:'TokyoMetro', lineIds:['Fukutoshin'], vehicleOwner:'Sotetsu',
      models:['相鉄20000系'], sourceUrl:'https://www.sotetsu.co.jp/life/gallery/train/'},
    {operator:'Toei', lineIds:['Asakusa'], vehicleOwner:'Keikyu',
      models:['京急1000形','京急600形'], sourceUrl:'https://www.keikyu.co.jp/ride/train/'},
    {operator:'Toei', lineIds:['Asakusa'], vehicleOwner:'Keisei',
      models:['京成3000形','京成3100形'], sourceUrl:'https://www.keisei.co.jp/keisei/keisei_museum/pictbook/'},
    {operator:'Rinkai', lineIds:['Rinkai'], vehicleOwner:'JR-East',
      models:['E233系7000番台'], sourceUrl:JR_E233}
  ];

  // Only commuter/passenger stopping patterns. In particular do NOT assign a
  // commuter model to a LimitedExpress/liner/special or an unnamed service.
  var ORDINARY = /^(?:Local|Rapid|SpecialRapid|CommuterRapid|SemiExpress|Express|RapidExpress|CommuterExpress|CommuterSemiExpress|ChuoSpecialRapid|OmeSpecialRapid|CommuterSpecialRapid|SectionRapid|SectionExpress|SectionSemiExpress)$/;

  // Optional future dated editions are admitted only on their documented
  // operating dates. Undated rows remain reference-only and do NOT certify
  // that any particular train/formation was operated on the queried date.
  function validServiceDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    var parsed = new Date(date + 'T12:00:00Z');
    return Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0,10) === date;
  }
  function withinPublishedPeriod(row, day) {
    var from = row.validFrom || '', to = row.validTo || '';
    if (!from && !to) return true;
    return !!day && validServiceDate(day) &&
      (!from || day >= from) && (!to || day <= to);
  }

  function lookup(lineId, operator, trainType, options) {
    var id = String(lineId || '').trim();
    var op = String(operator || '').trim();
    var type = String(trainType || '').trim();
    if (!id || !op || !type) return null;
    var day = String(options && options.serviceDate || '').slice(0,10);
    if (day && !validServiceDate(day)) return null;
    var prefix = 'odpt.TrainType:' + op + '.';
    if (type.indexOf(prefix) !== 0) return null;
    var suffix = type.slice(prefix.length);
    // Conventional services and explicitly scoped Shinkansen named services.
    if (!ORDINARY.test(suffix) && !/^Shinkansen$/.test(suffix) &&
        !/^(?:Hayabusa|Hayate|Yamabiko|Nasuno|Komachi|Tsubasa|Toki|Tanigawa|Kagayaki|Hakutaka|Asama|Nozomi|Hikari|Kodama|Mizuho|Sakura|Tsubame|Kamome)$/.test(suffix)) return null;
    // An observed ODPT trainOwner is not always the operating line's company.
    // No trainOwner -> line fleet only. Known other owner -> explicit through
    // mapping only. Never borrow the line operator's models in that case.
    var owner = String(options && options.trainOwner || '').trim()
      .replace(/^odpt\.(?:Operator|TrainOwner):/, '');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.operator !== op || row.lineIds.indexOf(id) < 0 ||
          !withinPublishedPeriod(row,day)) continue;
      if (row.shinkansenTypes) {
        if (row.shinkansenTypes.indexOf(suffix) < 0) return null;
      } else if (!ORDINARY.test(suffix)) return null;
      if (row.serviceTypes && row.serviceTypes.indexOf(suffix) < 0) return null;
      if (owner && owner !== (row.vehicleOwner || row.operator)) break;
      var models = row.modelsByService ? row.modelsByService[suffix] : row.models;
      var scopedPresetId = row.id, scopedSourceUrl = row.sourceUrl;
      // 223-5500 is a north-section LOCAL fleet reference only. Mixed or
      // unknown routes stay on the broad historical line fleet candidates.
      // Never use number suffixes or this reference to select a physical set.
      if (row.id === 'jrwest-fukuchiyama' && suffix === 'Local') {
        var stationKeys = options && options.stationKeys;
        if (Array.isArray(stationKeys) && stationKeys.length >= 2 &&
            new Set(stationKeys).size >= 2 &&
            stationKeys.every(function(k) {
              return FUKUCHIYAMA_NORTH_KEYS.indexOf(k) >= 0;
            }) &&
            stationKeys.some(function(k) { return k !== 'Shinoyamaguchi'; })) {
          models = ['JR西日本223系5500番台'];
          scopedPresetId = 'jrwest-fukuchiyama-north-local';
          scopedSourceUrl = 'https://express22.xsrv.jp/maintarminal/jr223-5500/';
        }
      }
      if (!models || !models.length) return null;
      return {
        operator: row.operator,
        vehicleOwner: row.vehicleOwner || row.operator,
        vehicleCandidates: models.slice(),
        evidenceRole: 'route-fleet-reference',
        _fleetReferenceOnly: true,
        planOverride: false,
        sourceUrl: scopedSourceUrl,
        asOf: '2026-11-03',
        validFrom: row.validFrom || null, validTo: row.validTo || null,
        presetId: scopedPresetId
      };
    }
    if (!owner || !ORDINARY.test(suffix)) return null;
    for (var j = 0; j < throughRows.length; j++) {
      var through = throughRows[j];
      if (through.operator !== op || through.vehicleOwner !== owner ||
          through.lineIds.indexOf(id) < 0 ||
          !withinPublishedPeriod(through,day)) continue;
      return {
        operator: op, vehicleOwner: owner,
        vehicleCandidates: through.models.slice(),
        evidenceRole: 'route-fleet-reference',
        _fleetReferenceOnly: true,
        planOverride: false,
        sourceUrl: through.sourceUrl,
        asOf: '2026-11-03',
        validFrom: through.validFrom || null, validTo: through.validTo || null,
        presetId: 'through-owner-' + op + '-' + id + '-' + owner
      };
    }
    return null;
  }

  root.MajorVehicleFleetPresets = Object.freeze({
    version: '2026-11-03-kanto',
    asOf: '2026-11-03',
    // Validity dates are authored facts; never inferred from train numbers.
    isValidForDate: withinPublishedPeriod,
    lookup: lookup,
    listThrough: function () {
      return throughRows.map(function(row) {
        return {operator:row.operator, vehicleOwner:row.vehicleOwner,
          lineIds:row.lineIds.slice(), models:row.models.slice(), sourceUrl:row.sourceUrl};
      });
    },
    list: function () {
      return rows.map(function (row) {
        return {id:row.id, operator:row.operator, lineIds:row.lineIds.slice(),
          models:row.models.slice(), vehicleOwner:row.vehicleOwner || row.operator,
          serviceTypes:row.serviceTypes ? row.serviceTypes.slice() : null,
          modelsByService:row.modelsByService ? Object.keys(row.modelsByService).reduce(function(o,k) {
            o[k]=row.modelsByService[k].slice(); return o;
          }, {}) : null,
          shinkansenTypes:row.shinkansenTypes ? row.shinkansenTypes.slice() : null,
          validFrom:row.validFrom || null, validTo:row.validTo || null,
          sourceUrl:row.sourceUrl};
      });
    }
  });
})(window);
