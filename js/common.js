/*
 * Pixel Tetsudo - 通用工具
 */
(function() {
  "use strict";

  window.escapeHtml = function(str) {
    if (!str) return '';
    if (typeof str !== 'string') return '';
    if (str.indexOf("&") < 0 && str.indexOf("<") < 0 && str.indexOf(">") < 0 && str.indexOf('"') < 0 && str.indexOf("'") < 0) return str;
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  window.getBasePath = function() {
    const path = window.location.pathname;
    return path.includes('/pages/') ? '..' : '';
  };

  window.formatTime = function(minutes) {
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return h + ':' + (m < 10 ? '0' : '') + m;
  };

  // Leave unhandled rejections visible to browser diagnostics.

})();

  // canonical 运营商键规范化：LOS 格式（UNDERSCORE_UPPER）↔ 标准格式（JR-East）。
  var TRANSIT_NORMALIZE = {
    "JR_EAST": "JR-East", "JR_WEST": "JR-West",
    "TOKYO_METRO": "TokyoMetro", "TOEI": "Toei", "YOKOHAMA_MUNICIPAL": "YokohamaMunicipal",
    "KEIO": "Keio", "ODAKYU": "Odakyu", "SEIBU": "Seibu", "TOBU": "Tobu", "TOKYU": "Tokyu",
    "KEIKYU": "Keikyu", "KEISEI": "Keisei", "SOTETSU": "Sotetsu", "RINKAI": "Rinkai",
    "MINATO_MIRAI": "MinatoMirai", "TWR": "TWR", "MIR": "MIR",
    "TAMA_MONORAIL": "TamaMonorail",
    "YURIKAMOME": "Yurikamome", "TSUKUBA_EXPRESS": "TsukubaExpress",
    "ENOSHIMA_ELECTRIC": "EnoshimaElectric"
  };
  // 标准数据库运营商键 → LOS 键（NORMALIZE 的反向转换；处理
  // TsukubaExpress → TSUKUBA_EXPRESS 等不规则拼写）。
  var LOS_KEY_MAP = {
    "JR-East": "JR_EAST", "JR-West": "JR_WEST",
    "TokyoMetro": "TOKYO_METRO", "Toei": "TOEI", "YokohamaMunicipal": "YOKOHAMA_MUNICIPAL",
    "Keio": "KEIO", "Odakyu": "ODAKYU", "Seibu": "SEIBU", "Tobu": "TOBU", "Tokyu": "TOKYU",
    "Keikyu": "KEIKYU", "Keisei": "KEISEI", "Sotetsu": "SOTETSU", "Rinkai": "RINKAI",
    "MinatoMirai": "MINATO_MIRAI", "TWR": "TWR", "MIR": "MIR",
    "TamaMonorail": "TAMA_MONORAIL",
    "Yurikamome": "YURIKAMOME", "TsukubaExpress": "TSUKUBA_EXPRESS",
    "SaitamaNewUrbanTransit": "SAITAMA_NEW_URBAN_TRANSIT",
    "TokyoMonorail": "TOKYO_MONORAIL",
    // 新增两家单轨运营商（千葉都市モノレール / 湘南モノレール）
    "ChibaUrbanMonorail": "CHIBA_URBAN_MONORAIL",
    "ShonanMonorail": "SHONAN_MONORAIL",
    "EnoshimaElectric": "ENOSHIMA_ELECTRIC"
  };
  window.TransitConstants = {
    // Canonical operator order: JR -> Metro -> Other / third-sector -> Private.
    // Passenger-facing list groups and both operator filters share this sequence.
    OP_ORDER: [
      // JR
      "JR-East", "JR-Central", "JR-West", "JR-Hokkaido", "JR-Shikoku",
      "JR-Kyushu", "JR-Freight",
      // Metro / Subway
      "TokyoMetro", "Toei", "YokohamaMunicipal", "OsakaMetro", "NagoyaMunicipal",
      "KyotoMunicipal", "KobeMunicipal", "SapporoMunicipal", "SendaiMunicipal", "FukuokaMunicipal",
      // Third-sector and Other rail
      "MinatoMirai", "Rinkai", "TsukubaExpress", "ToyoRapid", "SaitamaRapidRailway",
      "HojoRailway", "TWR", "MIR", "Yurikamome", "TamaMonorail",
      "TokyoMonorail", "SaitamaNewUrbanTransit", "ChibaUrbanMonorail", "ShonanMonorail", "UtsunomiyaLightRail",
      "HakodateCity",
      // Private Rail
      "Keio", "Odakyu", "Seibu", "Tobu", "Tokyu",
      "Keikyu", "Keisei", "Sotetsu", "EnoshimaElectric", "FujisanrokuElectricRailway",
      "Kintetsu", "Hankyu", "Hanshin", "Keihan", "Nankai",
      "Meitetsu", "Nishitetsu", "KobeDentetsu", "ChichibuRailway", "HiroshimaElectric"
    ],
    NORMALIZE: TRANSIT_NORMALIZE,
    // JRE (JR東日本) 白名单：路線記号 JA~JY 全覆盖；無記号の地方線（operator=JR-East）兜底
    JRE_MARK_CODES: ["JA","JB","JC","JE","JH","JI","JJ","JK","JL","JM","JN","JO","JS","JT","JU","JY"],
    isJRERoute: function(line) {
      if (!line) return false;
      var code = String(line.code || "");
      if (this.JRE_MARK_CODES.indexOf(code) >= 0) return true;
      if (code.indexOf("JI-") === 0) return true;  // 鶴見線支線 JI-O / JI-U
      return line.operator === "JR-East";          // 無記号の地方線（上越線・水郡線等）
    },
    OP_NAMES: {},
    // 任意格式（"JR-East" / "JR_EAST" / "jr east"）→ 标准 DB/ODPT 键（"JR-East"）。
    normalizeOp: function(op) {
      if (!op) return op;
      var key = String(op).replace(/-/g, "_").replace(/ /g, "_").toUpperCase();
      return TRANSIT_NORMALIZE[key] || op;
    },
    // 标准格式/任意格式 → LOS 键（"JR-East" → "JR_EAST"）。
    toLosKey: function(op) {
      if (!op) return op;
      if (LOS_KEY_MAP[op]) return LOS_KEY_MAP[op];
      return String(op).replace(/-/g, "_").replace(/ /g, "_").toUpperCase();
    }
  };
