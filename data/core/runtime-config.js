/**
 * Pixel Tetsudo - 运行时配置
 * 
 * 集中维护影响运行时行为的固定映射。
 * 所有 Provider 必须从本模块读取，不得复制粘贴形成重复配置。
 * 
 * 使用方：
 *   data-state.js        → TRUNK_MAIN_LINE_IDS
 *   data-fusion.js       → SOURCE_RAILWAY_LINE_SCOPE, PRIORITY_OPS, STATION_ALIAS,
 *                          STATION_ALIAS_BY_RAILWAY, TRAIN_WARMUP_LINES, REFRESH_INTERVAL,
 *                          POSITION_INTERVAL
 *   odpt-unified.js      → API_RATE_LIMIT, API_MAX_CONCURRENCY, TT_TRUNCATE_LIMIT
 *   trains-page.js       → TRUNK_EXTENSION_ALLOW, TRANSFER_MAX_ROWS
 */
(function() {
  "use strict";

  // ========== 线路层级 ==========

  /**
   * 干线本名（非運行系統）不进线路一览；数据保留作换乘锚点/支线父线。
   * 信越本線(分断)/東海道本線/東北本線 — 类比京沪铁路，不是运行系统。
   * 中央本線已独立 CO 卡，不在此列。
   */
  var TRUNK_MAIN_LINE_IDS = ["Shinetsu", "TokaidoMain", "Tohoku"];

  /**
   * 干线本名延伸白名单（显式登记，防止自动端点相接误判）。
   * 横須賀線等线路不会自动延伸干线本名；本表为空表示不允许任何隐式延伸。
   */
  var TRUNK_EXTENSION_ALLOW = {};

  // ========== 直通运行 ==========

  /**
   * 对于一个铁路实体横跨多个 canonical 项目线路/运营商的来源，定义其铁路身份范围。
   * 这里只决定候选是否准入，不代表优先顺序，也不能证明两条记录是同一列物理列车。

   */
  var SOURCE_RAILWAY_LINE_SCOPE = {
    "SotetsuDirect": ["SotetsuShinYokohama", "Yokosuka", "SaikyoKawagoe", "ShonanShinjuku"]
  };

  /**
   * Provider railway identity -> visible canonical line.
   *
   * ODPT's railway identity is often broader than a page card: Chuo covers
   * both the rapid and the main-line segment, Tokaido/Joban/Utsunomiya may
   * overlap hidden trunk records, and SotetsuDirect is published by JR-East
   * while its visible service belongs to the Saikyo-Kawagoe card. Prefer the
   * visible line when the source station exists there; the fusion layer still
   * falls back to a unique station match when it does not.
   */
  var SOURCE_RAILWAY_CANONICAL_LINE = {
    "Chuo": "ChuoMain",
    "Tokaido": "Tokaido",
    "JobanRapid": "Joban",
    "Joban": "Joban",
    "Utsunomiya": "UtsunomiyaJR",
    "Takasaki": "Takasaki",
    "KeihinTohokuNegishi": "KeihinTohoku",
    "SotetsuDirect": "SaikyoKawagoe"
  };

  // Verified SQL canonical trains can contain multiple line segments even
  // when the map's physical topology is overlapping rather than a new
  // switch/transfer edge. These are plan-fetch dependencies ONLY, never
  // evidence of realtime position or of a different physical vehicle.
  var VERIFIED_CANONICAL_PLAN_PARTNERS = Object.freeze({
    Joban: Object.freeze(["JobanMain"]),
    JobanMain: Object.freeze(["Joban"]),
    // Ome/ChuoRapid 259 SQL verified services; no new physical line edge.
    ChuoRapid: Object.freeze(["Ome","ChuoMain"]),
    Ome: Object.freeze(["ChuoRapid"]),
    ChuoMain: Object.freeze(["ChuoRapid"])
  });

  // 乘客服务走廊保留来源记录和车站
  // 拓扑，但不是独立线路，也不是列车之间的交接边。
  var SERVICE_CORRIDOR_LINES = Object.freeze({ UenoTokyo: true });

  /**
   * 时刻表按需加载优先运营商白名单。
   * 只有白名单内的 operator 才会触发 loadMissingTimetables 补拉。
   * JR-East 也纳入白名单；地方线可能只有 Railway 而没有 Train/TT。
   */
  var PRIORITY_OPS = [
    "JR-East", "TokyoMetro", "Toei", "YokohamaMunicipal", "Keio",
    "Sotetsu", "Tokyu", "Tobu", "TWR", "MIR", "TamaMonorail", "HakodateCity"
  ];

  /**
   * 实时位置覆盖策略（通用能力模型，不在融合算法中硬编码线路）。
   *
   * mode:
   *   FULL      - 配置为完整实时覆盖；仍需逐条校验观测有效期。
   *   HYBRID    - 默认。实时优先，缺失列车/区间允许 timetable 补位。
   *   SEGMENTED - 仅部分区间有实时覆盖；有效观测在各自区间优先。
   *   COARSE    - 实时源只能给出粗粒度位置；允许 timetable 提供更细位置，但不得覆盖
   *               同一列车已有的实时事实。
   *   UNKNOWN   - 覆盖完整性未知；行为等同 HYBRID，但明确禁止升级为 FULL。
   *
   * 合并不变量：
   *   1) 同一列车/区间的有效实时观测优先，计划不能覆盖实际位置。
   *   2) 所有模式均可查询 SQL 计划到发，缺有效实时才有提示地补缺。
   *   3) 覆盖配置不证明当日开行；过期观测撤销，恢复后撤销重复推定。
   *   4) running-chain 可跨覆盖边界传递 identity/service/destination 证据，不改变 positionSource。
   * 规则：线路事实只写配置；DataFusion/Estimator 不得按具体 lineId 写专属分支。
   */
  var REALTIME_POSITION_POLICY = {
    defaultMode: "HYBRID",
    staleAfterMs: 90000,
    lines: {
      "Asakusa": { mode: "FULL" },
      "Shinjuku": { mode: "FULL" },
      // 位置能力与有来源的服务日计划相互独立。
      "SaikyoKawagoe": { mode: "FULL" },
      // 川越（川越–高丽川）有 Train API，但尚未证明覆盖完整。
      // 有来源的部分计划在 SQL 响应中仍明确标记为部分覆盖。
      "Kawagoe": { mode: "HYBRID" },
      "ChuoRapid": { mode: "HYBRID" },
      // JR-East 为中央・总武各站停车服务发布带车号和位置的 Train 记录。
      // SQL 继续作为计划/车型证据来源，但
      // 渲染位置由最新 ODPT 观测拥有。
      "ChuoSobuLocal": { mode: "HYBRID" },
      "JobanLocal": { mode: "HYBRID" },
      "KeihinTohoku": { mode: "HYBRID" },
      "Keiyo": { mode: "HYBRID" },
      "Musashino": { mode: "HYBRID" },
      "Nambu": { mode: "HYBRID" },
      "ShonanShinjuku": { mode: "HYBRID" },
      "SobuRapid": { mode: "HYBRID" },
      "Tokaido": { mode: "HYBRID" },
      "UtsunomiyaJR": { mode: "HYBRID" },
      "Yamanote": { mode: "HYBRID" },
      "Yokosuka": { mode: "HYBRID" },
      "Oedo": { mode: "FULL" },
      "Arakawa": { mode: "FULL" },
      "KeioMain": { mode: "FULL" },
      "KeioSagami": { mode: "FULL" },
      "KeioZoo": { mode: "FULL" },
      "KeioShin": { mode: "FULL" },
      "KeioInokashira": { mode: "FULL" },
      "KeioKeibajo": { mode: "FULL" },
      "KeioTakao": { mode: "FULL" },
      "TobuSkytree": { mode: "FULL" },
      "Noda": { mode: "FULL" },
      "Tojo": { mode: "FULL" },
      "Ogose": { mode: "FULL" },
      "Daishi_Tobu": { mode: "FULL" },

      // 已知为部分/受限来源，但尚未保存经过验证的本地站间覆盖。
      // 在 coveredSegments/excludedSegments 获得来源观测支持前保持 HYBRID；
      // 不得把 SEGMENTED 当作占位状态。
      "Mita": { mode: "HYBRID" },
      "Ome": { mode: "HYBRID" },
      "Joban": { mode: "HYBRID" },
      "Takasaki": { mode: "HYBRID" },

      // 官方来源在该铁路的部分区间中位置粒度不足。
      "Tobu_Kameido": { mode: "COARSE" },

      // 已明确不是完整的实时位置来源。
      "TobuIsesaki": { mode: "HYBRID" },
      "TobuNikko": { mode: "HYBRID" },
      "Tsurumi": { mode: "HYBRID" },
      "TsurumiUmiShibaura": { mode: "HYBRID" },
      "TsurumiOkawa": { mode: "HYBRID" },
      "NambuBranch": { mode: "HYBRID" },
      "Sagami": { mode: "HYBRID" },
      "Hachiko": { mode: "HYBRID" }
    }
  };

  // JR East 公布的 Train Location 覆盖范围。端点按运营商提供；
  // 下方线路注册表只准入来源公告覆盖的铁路身份；
  // SQL 仍是所有线路的计划/车型回退来源。
  var JR_EAST_TRAIN_LOCATION_SCOPE = Object.freeze({
    operator: "JR-East",
    endpoint: "https://api-challenge.odpt.org/api/v4/odpt:Train?odpt:operator=odpt.Operator:JR-East",
    region: "Kanto-area conventional lines in and around Tokyo, Kanagawa and Saitama",
    excludes: Object.freeze(["Sagami", "Tsurumi", "NambuBranch", "Hachiko"]),
    segmentLimits: Object.freeze({
      Joban: "Hatori and south",
      Takasaki: "Jinbohara and south",
      Ome: "Tachikawa-Ome",
      Chuo: "Kofu and east"
    })
  });

   // 已配置实时位置 API（JSON Train 或 GTFS-RT VehiclePosition）的线路；这与
  // FULL/HYBRID 位置覆盖策略不同。已根据 JR-East 来源范围
  // 和当前运营商来源范围核对。计划资格
  // 独立于此能力；被排除的线路继续仅使用 SQL。
  // 现有 FULL 线路策略在启用 Train 端点时也符合条件。
  var REALTIME_POSITION_API_LINES = Object.freeze({
    "Arakawa": true,
    "Asakusa": true,
    "ChuoRapid": true,
    // JR-East Chuo source is a partial HYBRID observation, not FULL.
    "ChuoMain": true,
    "ChuoSobuLocal": true,
     // Tobu GTFS-RT is an operator-wide feed; activate every canonical
     // Tobu railway here and retain COARSE policy where station precision is limited.
     "Daishi_Tobu": true,
    "Itsukaichi": true,
    "Joban": true,
    // JR East realtime coverage is limited to Hatori and south, not the
    // entire JobanMain route. Keep its default HYBRID policy.
    "JobanMain": true,
    "JobanLocal": true,
    "Kawagoe": true,
    "KeioMain": true,
    "KeioInokashira": true,
    "KeioKeibajo": true,
    "KeioTakao": true,
    "KeioSagami": true,
    "KeioShin": true,
    "KeioZoo": true,
    "KeihinTohoku": true,
    "Keiyo": true,
     "Kiryu": true,
     "Koizumi": true,
    "Mita": true,
    "Musashino": true,
    "Nambu": true,
    "Noda": true,
    "Ogose": true,
    "Oedo": true,
    "Ome": true,
    "SaikyoKawagoe": true,
    "Shinjuku": true,
    "ShonanShinjuku": true,
    "SobuRapid": true,
     "Sano": true,
    "Takasaki": true,
    "Tojo": true,
    "TobuIsesaki": true,
    "TobuNikko": true,
    "Nikkoku": true,
    "TobuSkytree": true,
     "Tobu_Kameido": true,
     "TobuUtsunomiya": true,
    "Tokaido": true,
    "UtsunomiyaJR": true,
    "Yamanote": true,
    "Yokohama": true,
    "Hakodate2": true,
    "Hakodate5": true,
    "YokohamaBlue": true,
    "YokohamaGreen": true,
     "Yokosuka": true,
     "Nippori_Toneri": true
  });

  // ========== ODPT 站 ID 别名映射 ==========

  /**
   * 全局站 ID 别名：ODPT 驼峰/连字符/拼写差异 → 本地冻结站表 ID。
   * 这些别名只处理已核对的外部字段差异；基础站点表保持 canonical，匹配层负责归一化。
   */
  var STATION_ALIAS = {
    "MusashiHikida": "Musashi-Hikida",
    "Minowabashi": "Sannomi_Bashi",
    "ArakawaItchumae": "Arakawa_Ichi_Mae",
    "Arakawakuyakushomae": "Arakawa_Kuyakusho_Mae",
    "ArakawaNichome": "Arakawa_Ni",
    "ArakawaNanachome": "Arakawa_Nana",
    "MachiyaEkimae": "Machiya_Eki_Mae",
    "MachiyaNichome": "Machiya_Ni",
    "HigashiOguSanchome": "Higashi_Oku_San",
    "Kumanomae": "Kuma_Mae",
    "Miyanomae": "Miyano_Mae",
    "Odai": "Kodai",
    "ArakawaYuenchimae": "Arakawa_Yuengiei_Mae",
    "ArakawaShakomae": "Arakawa_Shako_Mae",
    "Sakaecho": "Eimachi",
    "OjiEkimae": "Oji_Eki_Mae",
    "TakinogawaItchome": "Takino_Kawa_Ichome",
    "NishigaharaYonchome": "Nishi_Kbara_Yon",
    "ShinKoshinzuka": "Shin_Kosenzuka",
    "Koshinzuka": "Kosenzuka",
    "Sugamoshinden": "Sugamo_Shimmachi",
    "OtsukaEkimae": "Otsuka_Eki_Mae",
    "Mukohara": "Mukaiohara",
    "HigashiIkebukuroYonchome": "Higashi_Ikebukuro_Yon",
    "TodenZoshigaya": "Toei_Zoshigaya",
    "Kishibojimmae": "Onishimogami_Mae",
    "Gakushuinshita": "Gakuin_Mae",
    "Kasumigaseki": "Kasumigaseki-Tojo",
    "Shimbamba": "Shin-Baba",
    "Umeyashiki": "Umayabashi",
    "Futamatashimmachi": "Futamata-Shinmachi",
    "KasaiRinkaiPark": "Kasai-Rinkai-Koen",
    "KitaKonosu": "Kita-Kounosu",
    "ShinNihombashi": "Shin-Nihonbashi",
    "Ozaku": "Kosaku",
    "Kawasakidaishi": "Kawasaki_Daishi",
    "YrpNobi": "YRP-Nohbi",
    "Misakiguchi": "Misasaki-Guchi",
    "ShimMatsudo": "Shin-Matsudo",
    "HanedaAirportTerminal1and2": "Haneda-Kuko-T1T2",
    "Yaita": "Yaida",
    "Konosu": "Kounosu",
    "Kojimashinden": "Kojima_Shinden",
    "Jimmuji": "Jinmuji",
    "Ryugasakishi": "Ryugasaki",
    "Omurai": "Komura_i",
    "ShimMisato": "Shin-Misato",
    "Kojiya": "Kokuji",
    "Motohasunuma": "Hon-Hasuneuma",
    "Daishimae": "Daishi_Mae",
    "Hamura": "Hamu",
    "HanedaAirportTerminal3": "Haneda-Kuko-T3",
    "Suzukicho": "Suzukimachi",
    "Daishibashi": "Daishi_Bashi",
    "MinamiSendai": "Minami-Sendai",
    "HigashiAbiko": "Higashi-Abiko",
    "ShimosaManzaki": "Shimosa-Manzaki",
    "NaritaAirportTerminal2and3": "Airport-Terminal-2",
    "NaritaAirportTerminal1": "Narita-Airport",
    "NaritaAirportTerminal2": "Airport-Terminal-2",
    "HamaKawasaki": "Hama-Kawasaki"
  };

  /**
   * Railway 感知别名：ODPT 同名站 ID 在不同线路指向不同本地站，需按 railway 区分。
   * Oyama（Tojo=大山/Ooyama, Utsunomiya=小山/Oyama）双义。
   * Kohoku（NipporiToneri=江北/Kohoku, NaritaAbikoBranch=湖北/Kohoku-Narita）双义。
   */
  var STATION_ALIAS_BY_RAILWAY = {
    "Tojo": { "Oyama": "Ooyama" },
    "NaritaAbikoBranch": { "Kohoku": "Kohoku-Narita" },
    "Utsunomiya": {
      "Kamasusaka": "Kabasaka",
      "Jichiidai": "Jichi-Ikaidaigaku"
    }
  };

  // ========== 性能调优参数 ==========

  /** ODPT API 最小请求间隔（毫秒）。 */
  var API_RATE_LIMIT = 150;

  /** ODPT API 每域最大并发数（滑动窗口）。实测 12 并发稳定。 */
  var API_MAX_CONCURRENCY = 3;

  /** ODPT 时刻表单请求的截断阈值；达到阈值时按日历拆分并合并。 */
  var TT_TRUNCATE_LIMIT = 1000;

  /** 时刻表按需加载批量上限，与请求限速和并发窗口配套。 */
  var TIMETABLE_LOAD_BATCH = 24;

  /** 实时数据轮询间隔（毫秒）。 */
  var REFRESH_INTERVAL = 15000;

  /** 列车位置轮询间隔（毫秒）。比延误轮询慢，位置变化频率较低。 */
  var POSITION_INTERVAL = 60000;

  // ========== ODPT 缓存 / 轮询 / 存储 key 规则 ==========

  /** 时刻表 IDB 主键（新版 v6） */
  var ODPT_TIMETABLE_CACHE_KEY = 'odpt_timetable_cache_v6';

  /** 旧 localStorage 缓存 key（v3，迁移后清除） */
  var ODPT_LEGACY_LS_CACHE_KEY = 'odpt_timetable_cache_v3';

  /** 时刻表缓存 TTL（毫秒，24h） */
  var ODPT_TIMETABLE_CACHE_TTL = 86400000;

  /** ODPT_TT_PROBED 持久化 key（localStorage，24h 滑动 TTL） */
  var ODPT_TT_PROBED_KEY = 'odpt_tt_probed_v1';

  /** ODPT_TT_PROBED TTL（毫秒，24h） */
  var ODPT_TT_PROBED_TTL = 86400000;

  /** 实时数据轮询间隔（毫秒，ODPTClient 后台刷新）。 */
  var ODPT_REALTIME_INTERVAL = 15000;
  var ODPT_INFORMATION_INTERVAL = 30000;

  /** trains 页后台预加载线路白名单（用户高频切换的线路）。打开 trains.html 后 2 秒开始后台加载。 */
  var TRAIN_WARMUP_LINES = ['Yamanote', 'ChuoRapid', 'KeihinTohoku', 'Seibuen', 'Keikyu', 'Odawara'];

  /**
   * 快速通过站白名单——route-search 计算时跳过这些站的停站+加减速时间（按 EXPRESS_PASS_RATIO 折扣）。
   * 数据源：各线公式停站表（wiki）。Joban=常磐快速 松戸〜柏 间ノンストップ（通过 亀有/馬橋/新松戸/北小金）。
   */
  var EXPRESS_SKIP_STATIONS = {
    'Joban': { 'Kameari': 1, 'Mabashi': 1, 'Shin-Matsudo': 1, 'Kita-Kogane': 1 }
  };

  // ========== UI 策略常量 ==========

  /** 换乘 chip 行数上限（per station）；与每行图标上限共同控制紧凑布局。 */
  var TRANSFER_MAX_ROWS = 4;

  var BUILD_SHA = "";
  try { BUILD_SHA = new URL(document.currentScript.src).searchParams.get("build") || ""; } catch(e) {}

  window.RuntimeConfig = {
    BUILD_SHA: BUILD_SHA,
    // 线路层级
    TRUNK_MAIN_LINE_IDS: TRUNK_MAIN_LINE_IDS,
    TRUNK_EXTENSION_ALLOW: TRUNK_EXTENSION_ALLOW,
    // 直通运行
    SOURCE_RAILWAY_LINE_SCOPE: SOURCE_RAILWAY_LINE_SCOPE,
    SOURCE_RAILWAY_CANONICAL_LINE: SOURCE_RAILWAY_CANONICAL_LINE,
    VERIFIED_CANONICAL_PLAN_PARTNERS: VERIFIED_CANONICAL_PLAN_PARTNERS,
    SERVICE_CORRIDOR_LINES: SERVICE_CORRIDOR_LINES,
    PRIORITY_OPS: PRIORITY_OPS,
    JR_EAST_TRAIN_LOCATION_SCOPE: JR_EAST_TRAIN_LOCATION_SCOPE,
    REALTIME_POSITION_POLICY: REALTIME_POSITION_POLICY,
    REALTIME_POSITION_API_LINES: REALTIME_POSITION_API_LINES,
    // ODPT 站 ID 别名
    STATION_ALIAS: STATION_ALIAS,
    STATION_ALIAS_BY_RAILWAY: STATION_ALIAS_BY_RAILWAY,
    // 性能调优
    API_RATE_LIMIT: API_RATE_LIMIT,
    API_MAX_CONCURRENCY: API_MAX_CONCURRENCY,
    TT_TRUNCATE_LIMIT: TT_TRUNCATE_LIMIT,
    TIMETABLE_LOAD_BATCH: TIMETABLE_LOAD_BATCH,
    REFRESH_INTERVAL: REFRESH_INTERVAL,
    POSITION_INTERVAL: POSITION_INTERVAL,
    TRAIN_WARMUP_LINES: TRAIN_WARMUP_LINES,
    // ODPT 缓存 / 轮询 / 存储 key
    ODPT_TIMETABLE_CACHE_KEY: ODPT_TIMETABLE_CACHE_KEY,
    ODPT_LEGACY_LS_CACHE_KEY: ODPT_LEGACY_LS_CACHE_KEY,
    ODPT_TIMETABLE_CACHE_TTL: ODPT_TIMETABLE_CACHE_TTL,
    ODPT_TT_PROBED_KEY: ODPT_TT_PROBED_KEY,
    ODPT_TT_PROBED_TTL: ODPT_TT_PROBED_TTL,
    ODPT_REALTIME_INTERVAL: ODPT_REALTIME_INTERVAL,
    ODPT_INFORMATION_INTERVAL: ODPT_INFORMATION_INTERVAL,
    // 快速通过站（route-search）
    EXPRESS_SKIP_STATIONS: EXPRESS_SKIP_STATIONS,
    // UI 策略
    TRANSFER_MAX_ROWS: TRANSFER_MAX_ROWS
  };
})();
