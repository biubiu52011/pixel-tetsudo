/*
 * Pixel Tetsudo - 列车位置估算器
 * 按当前 JST 时钟推算计划时刻表位置；实际延误位置由 ODPT Train 提供
 *
 * Provider: TrainPositionEstimator
 * Consumer: DataFusion.loadTrainPositions()
 * Input: ODPT / SQL TrainTimetable data + line stations + current wall time
 * Output: estimated positions [{ stationIndex, trainId, delayMin, estimated: true }]
 */
(function() {
  "use strict";

  var ESTIMATOR_VERSION = 13;
  var _manualTimetableRegistry = {};
  var _timetableIndexCache = { source: null, stamp: "", arrays: {}, manualVersion: 0, builtManualVersion: -1, index: {} };
  var _manualRegistryVersion = 0;
  // 按线路对象和车站数组身份缓存站点布局。源数组变化时重建；
  // 保持已编译运行布局契约不变。
  var _stationLayoutCache = new WeakMap();
  var _layoutKeyCache = new WeakMap();
  function getCompiledLayoutKey(lineId, workLine, verifiedContinuation, projection) {
    var perLine = _layoutKeyCache.get(workLine);
    if (!perLine) { perLine = Object.create(null); _layoutKeyCache.set(workLine, perLine); }
    var base = perLine[lineId];
    if (!base) {
      base = lineId + "|" + workLine.stations.join("|");
      perLine[lineId] = base;
    }
    return base + (verifiedContinuation ? JSON.stringify(projection || {}) : "");
  }
  function getEstimatorStationLayout(lineId, line) {
    var reversed = REVERSED_STATION_ORDER.indexOf(lineId) >= 0;
    // 仅依赖数组身份会漏掉原地编辑（splice/重排/重命名）。
    // 签名还可防止线路对象被分配到另一个 ID 后继续复用。
    var stationSignature = JSON.stringify(line.stations);
    var cached = _stationLayoutCache.get(line);
    if (cached && cached.lineId === lineId && cached.stations === line.stations &&
        cached.stationSignature === stationSignature && cached.reversed === reversed) return cached;
    var workLine = reversed ? Object.assign({}, line, { stations: line.stations.slice().reverse() }) : line;
    var stationIndexMap = {};
    for (var i = 0; i < workLine.stations.length; i++) {
      var key = workLine.stations[i];
      stationIndexMap[normalizeStationKey(key)] = i;
      stationIndexMap[key] = i;
    }
    cached = { lineId: lineId, stations: line.stations, stationSignature: stationSignature,
      reversed: reversed, workLine: workLine, stationIndexMap: stationIndexMap };
    _stationLayoutCache.set(line, cached);
    return cached;
  }

  function registerManualTimetable(lineId, rows) {
    // A confirmed empty snapshot retires the previous plan. Invalid/error
    // responses are rejected by the caller and must not be passed as [].
    if (!lineId || !Array.isArray(rows)) return;
    if (_manualTimetableRegistry[lineId] !== rows) {
      _manualTimetableRegistry[lineId] = rows;
      _manualRegistryVersion++;
    }
  }

  // ========== 方向反转线路 ==========
  // 这些线路的ODPT站序和本地站表顺序相反，需要反转索引
  // 例：Rinkai（临海线）ODPT站序=Osaki→Shin-Kiba，本地站表=Shin-Kiba→Osaki
  var REVERSED_STATION_ORDER = ['Rinkai'];

  // ========== 列车类型分类 ==========
  // 通用特急关键词——部分运营商只写 "LimitedExpress"，不提供爱称。
  var LIMITED_EXPRESS_KEYWORDS = ['LimitedExpress', 'Limited Express', '特急'];

  // 有料特急 operator 白名单——这些 operator 的通用词 LimitedExpress 指「有料特急」（需特急券）
    // JR-East（あずさ/かいじ等）和 Tobu（スペーシアX/リバティ等）trainType 使用通用词。
  // 铁道路知识：Odakyu（ロマンスカー全特急有料）・Seibu（特急=座席指定有料）同义
  // 京急（LimitedExpress/RapidLimitedExpress=快特・特急，普通运费速达）・京成/京王/都営（特急=普通运费）
  // 的 LimitedExpress 不属于有料特急——不在此白名单则通用词不生效（防止误爆）
  var PAID_LIMITED_EXPRESS_OPS = ['JR-East', 'Tobu', 'Odakyu', 'Seibu'];

  // 有料特急爱称名（按 line 归属）——ODPT 中 京成/小田急/西武 在 trainType 写具体爱称
  // （TrainIcons.typeMatch 实测命中：Skyliner/SuperHakone/Hakone/HomeWay/MorningWay/Enoshima/BayResort/Ltrain/S-TRAIN）
  // 与 train-vehicle.js 内 TrainIcons 的「特急・観光列車」区段保持整合；新增爱称时两侧同步
  var LIMITED_EXPRESS_NAMES = {
    'NaritaAccess': ['Skyliner'],
    'NaritaSkyAccess': ['Skyliner'],
    'Odawara': ['SuperHakone', 'Hakone', 'HomeWay', 'MorningWay'],
    'OdakyuEnoshima': ['Enoshima', 'BayResort', 'HomeWay', 'MorningWay'],
    'Ikebukuro': ['Ltrain', 'S-TRAIN', 'STRAIN'],
    'SeibuChichibu': ['Ltrain'],
    'SeibuShinjuku': ['S-TRAIN', 'STRAIN']
  };

  // 从 trainType URN 提取 operator key："odpt.TrainType:JR-East.LimitedExpress" → "JR-East"；
  // 兼容 "Tobu.LimitedExpress" 省略形式
  function extractOperatorKey(typeStr) {
    try {
      var m = String(typeStr).match(/(?:odpt\.TrainType:)?([^.:]+)\./);
      return m ? m[1] : '';
    } catch(e) { return ''; }
  }
  
  // 直通运行列车类型
  // 移除 JR 中央线三个 SpecialRapid（CommuterSpecialRapid/ChuoSpecialRapid/OmeSpecialRapid）——
  // 它们是中央线快速等级（特快），非直通运行（跨图显示由 ODPT 按 railway 分段数据 + 按线匹配实现，与此字段无关）。
  // 保留项均为真实直通/有料列车：TH-LINER（東武晴空塔⇄地下鉄）、TJ-LINER（東上線有料）、
  // S-TRAIN/F-Liner（西武⇄地下鉄⇄東急 直通）、KeioLiner（京王有料）。
  // 班次编号尾字母 S/K 规则保留，仅用于内部区分直通运行；不得作为实际车辆编组号展示。
  var THROUGH_TRAIN_TYPES = {
    'TH-LINER': 'Tobu-TokyoMetro through',
    'TJ-LINER': 'Tobu Tojo line reserved',
    'S-TRAIN': 'Seibu-TokyoMetro-Tokyu through',
    'F-Liner': 'Tokyu-TokyoMetro-Seibu through',
    'KeioLiner': 'Keio reserved train'
  };

  // 判断是否为有料特急列车（需特急券）
  // lineId 用于爱称归属限定（同词在不同 line 可能不同义）；operator 语义经 PAID_LIMITED_EXPRESS_OPS 限定
  function isLimitedExpress(trainType, lineId) {
    try {
      if (!trainType) return false;
      var typeStr = typeof trainType === 'object' ? JSON.stringify(trainType) : String(trainType);
      // 1. 爱称白名单（按 line 归属）——京成 Skyliner / 小田急ロマンスカー / 西武 L-train・S-TRAIN
      if (lineId && LIMITED_EXPRESS_NAMES[lineId]) {
        var names = LIMITED_EXPRESS_NAMES[lineId];
        for (var ni = 0; ni < names.length; ni++) {
          if (typeStr.indexOf(names[ni]) >= 0) return true;
        }
      }
      // 2. 通用词——仅限「LimitedExpress=有料特急」的 operator
      //    （京急 LimitedExpress/RapidLimitedExpress=快特・特急、京成/京王/都営 LimitedExpress=特急，均普通运费速达）
      if (PAID_LIMITED_EXPRESS_OPS.indexOf(extractOperatorKey(typeStr)) < 0) return false;
      for (var i = 0; i < LIMITED_EXPRESS_KEYWORDS.length; i++) {
        if (typeStr.indexOf(LIMITED_EXPRESS_KEYWORDS[i]) >= 0) return true;
      }
      return false;
    } catch(e) { return false; }
  }

  // 判断是否为直通运行列车
  function isThroughTrain(trainType, trainNumber) {
    try {
      var typeStr = typeof trainType === 'object' ? JSON.stringify(trainType) : String(trainType);
      // 检查列车类型
      for (var key in THROUGH_TRAIN_TYPES) {
        if (typeStr.indexOf(key) >= 0) return true;
      }
      // 检查列车编号（东武直通列车通常以特定字母结尾）
      if (trainNumber) {
        var numStr = String(trainNumber);
        // 东武晴空塔线直通日比谷线的列车通常以S结尾
        // 东武伊势崎线直通半藏门线的列车通常以K结尾
        if (/[SK]$/.test(numStr)) return true;
      }
      return false;
    } catch(e) { return false; }
  }

  // 获取列车类型分类
  function classifyTrain(trainType, trainNumber, lineId) {
    try {
      var result = {
        isLimitedExpress: isLimitedExpress(trainType, lineId),
        isThroughTrain: isThroughTrain(trainType, trainNumber),
        typeName: ''
      };
      var typeStr = typeof trainType === 'object' ? (trainType['odpt:trainType'] || JSON.stringify(trainType)) : String(trainType);
      // 提取类型名称
      var parts = typeStr.split(':');
      result.typeName = parts.length > 1 ? parts[parts.length - 1] : typeStr;
      return result;
    } catch(e) {
      return { isLimitedExpress: false, isThroughTrain: false, typeName: 'unknown' };
    }
  }

  // 法定节假日事实属于 data/core/runtime-config.js。
  // 估算器只计算相应营业日，并保留按日期的运营商覆盖规则。

  function _jstNow() { return new Date(Date.now() + 9 * 60 * 60 * 1000); }

  // ========== 日历判定 ==========
  function _calendarsForJstDate(now) {
    var day = now.getUTCDay(); // 0=Sunday, 6=Saturday
      // 明确的服务日覆盖来自权威日历
      // 数据；不得仅凭星期几猜测日本节假日。
      // 键为本地 YYYY-MM-DD 日期。
      var dateKey = now.getUTCFullYear() + "-" +
        String(now.getUTCMonth() + 1).padStart(2, "0") + "-" +
        String(now.getUTCDate()).padStart(2, "0");
      var overrides = window.RuntimeConfig && window.RuntimeConfig.SERVICE_DAY_CALENDAR;
      var override = overrides && Object.prototype.hasOwnProperty.call(overrides, dateKey)
        ? overrides[dateKey] : null;
      if (override === "holiday") day = 0;
      else if (override === "weekday") day = 1;
      else if (override === "saturday") day = 6;
      else {
        var holidayTable = window.RuntimeConfig && window.RuntimeConfig.PUBLISHED_JP_HOLIDAYS;
        var published = holidayTable && holidayTable[String(now.getUTCFullYear())];
        if (Array.isArray(published) && published.indexOf(dateKey.slice(5)) >= 0) day = 0;
      }
      // 返回匹配的日历类型数组。
      // ODPT Holiday 包含周日和法定节假日，不包含普通周六。
      // 法定节假日落在周六时，Holiday 优先。
      if (day === 6) return ["odpt.Calendar:Saturday", "odpt.Calendar:SaturdayHoliday"];
      if (day === 0) return ["odpt.Calendar:Holiday", "odpt.Calendar:SaturdayHoliday", "odpt.Calendar:Sunday"];
      return ["odpt.Calendar:Weekday"];
  }

  // Public date-scoped calendar lookup for rolling-stock reference and other
  // timetable consumers. Reuse the SAME Japan holiday/override policy as
  // live positions without changing the estimator's position logic.
  function getCalendarsForDate(serviceDate) {
    var day = String(serviceDate || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
    var jstDate = new Date(day + "T12:00:00Z");
    if (isNaN(jstDate.getTime()) ||
        jstDate.toISOString().slice(0, 10) !== day) return [];
    return _calendarsForJstDate(jstDate);
  }

  function getCurrentCalendars() {
    try {
      // 铁路服务日历使用 JST，并在 04:00 切换服务日。
      var now = _jstNow();
      if (now.getUTCHours() < 4) now.setUTCDate(now.getUTCDate() - 1);
      return _calendarsForJstDate(now);
    } catch(e) { return ["odpt.Calendar:Weekday"]; }
  }

  // 实时车型引用遵循墙上时钟日期的日历。
  // 位置时间轴仍使用 getCurrentCalendars()/getTokyoServiceDate()
  // 因此跨夜位置仍归属于前一个铁路服务日。
  function getWallClockCalendars() {
    try { return _calendarsForJstDate(_jstNow()); }
    catch(e) { return ["odpt.Calendar:Weekday"]; }
  }

  // 向后兼容。
  function getCurrentCalendar() {
    var cals = getCurrentCalendars();
    return cals[0];
  }

  // ========== 时间解析 ==========
  function parseTimeToMinutes(timeStr) {
    try {
      if (!timeStr) return null;
      var parts = timeStr.split(":");
      if (parts.length < 2) return null;
      var h = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10);
      // 跨零点时间不再 h-24（24:05→5 会把深夜列车错位到当天凌晨，被误判已到终点/收车丢弃）。
      // 保留原值使 24:xx = 1440+（次日凌晨偏移），与当天 0-1439 时间轴单调连续：
      // 23:50 发车 24:05 到达 → 1445，任何当天时刻（≤1439）都不会越过它
      // 运营日以 04:00 为界——0:00-3:59 属前一日深夜，统一 +24（00:09→24:09→1449），
      // 与 24:xx 记法同处 1440+ 单调轴；03:54→27:54 等深夜延伸同样正确处理
      if (h < 4) h += 24;
      return h * 60 + m;
    } catch(e) { return null; }
  }

  function getCurrentMinutes() {
    try {
      var now = _jstNow();
      var h = now.getUTCHours();
      // ODPT TrainTimetable 时刻和实时位置证据共用 JST。
      return (h < 4 ? h + 24 : h) * 60 + now.getUTCMinutes() +
        now.getUTCSeconds() / 60 + now.getUTCMilliseconds() / 60000;
    } catch(e) { return 0; }
  }

  // ========== 车站名称提取 ==========
  function extractStationKey(stationUrn) {
    try {
      if (!stationUrn) return "";
      // “odpt.Station:TokyoMetro.Namboku.Ichigaya” → “Ichigaya”。
      var parts = String(stationUrn).split(".");
      return parts[parts.length - 1] || "";
    } catch(e) { return ""; }
  }

  // 规范化用于匹配的车站键（移除连字符，处理常见变体）。
  function normalizeStationKey(key, lineId) {
    try {
      if (!key) return "";
      // Prefer a RAILWAY-SCOPED alias for ambiguous station names:
      // 成田線湖北 Kohoku != 日暮里舎人ライナー江北 Kohoku.
      // For unambiguous names, use the existing shared alias table.
      var config = window.RuntimeConfig || {};
      var scopes = config.STATION_ALIAS_BY_RAILWAY || {};
      var scoped = lineId && scopes[lineId];
      if (scoped && Object.prototype.hasOwnProperty.call(scoped, key))
        key = scoped[key];
      var sharedAliases = config.STATION_ALIAS;
      if (sharedAliases && Object.prototype.hasOwnProperty.call(sharedAliases, key)) key = sharedAliases[key];
      // Gono's timetable uses official URNs Omaigoshi/Henashi, while
      // the display map retains its older Omagoshi/Tomosaki station keys.
      // Resolve these only for Gono, never globally or on Ou Main.
      if(lineId==="Gono"){
        if(key==="Omaigoshi")key="Omagoshi";
        if(key==="Henashi")key="Tomosaki";
      }
      var k = String(key).toLowerCase();
      // 移除连字符和空格。
      k = k.replace(/[-_\s]/g, "");
      // 处理常见命名变体。
      var aliases = {
        "kokusaitenjijo": "tokyoshowacenter",
        "tennozuisle": "tennozuise",
        "shinagawaseaside": "shinagawaseaside",
        "oimachi": "oimachi",
        "tokyoteleport": "tokyoteleport",
        "shinkiba": "shinkiba",
        "shinonome": "shinonome",
        // 官方来源车站 ID 与现有 Pixel Tetsudo
        // 车站键拼写不同，但都指向同一车站。
        "kokukoen": "kokukokoen",
        "shiraitodai": "shiroitai",
        "ryugasakishi": "ryugasaki"
      };
      return aliases[k] || k;
    } catch(e) { return String(key || "").toLowerCase().replace(/[-_\s]/g, ""); }
  }

  function extractRailwayKey(railwayUrn) {
    try {
      if (!railwayUrn) return "";
      // “odpt.Railway:TokyoMetro.Namboku” → “Namboku”。
      var parts = String(railwayUrn).split(":");
      if (parts.length < 2) return "";
      var dotParts = parts[1].split(".");
      return dotParts[dotParts.length - 1] || "";
    } catch(e) { return ""; }
  }

  function getTokyoServiceDate() {
    try {
      // 日本的铁路证据按日期限定。这里不要使用 odpt:calendar：
      // 该字段是日历类别（Weekday/SaturdayHoliday），不是 YYYY-MM-DD。
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date());
      var out = {};
      parts.forEach(function(p){ out[p.type] = p.value; });
      var jstHour = _jstNow().getUTCHours();
      if (jstHour < 4) {
        var preceding = new Date(Date.parse(out.year + '-' + out.month + '-' + out.day + 'T00:00:00Z') - 86400000);
        return preceding.toISOString().slice(0, 10);
      }
      return out.year + '-' + out.month + '-' + out.day;
    } catch (e) {
      var now = _jstNow();
      if (now.getUTCHours() < 4) now.setUTCDate(now.getUTCDate() - 1);
      return now.toISOString().slice(0, 10);
    }
  }

  // ========== 核心估算 ==========
  // 按每个线路/车站布局一次性编译不可变时刻表字段。
  // 编译值设为不可枚举，使原始 ODPT 行保持干净，便于缓存、
  // 诊断和运行链消费者使用。
  function sourceRouteProjection(lineId, workLine, stationIndexMap, allLines) {
    var result = {}, codes = window.ODPTClient && window.ODPTClient.LINE_RAILWAY_CODE;
    var owners = window.ODPTClient && window.ODPTClient.LINE_TO_OPERATOR;
    if (!allLines || !codes || !owners) return result;
    Object.keys(allLines).forEach(function(id) {
      var source = allLines[id];
      if (!source || !Array.isArray(source.stations) || owners[id] !== owners[lineId]) return;
      var anchors = [];
      source.stations.forEach(function(key, i) {
        var target = stationIndexMap[normalizeStationKey(key)];
        if (target !== undefined) anchors.push([i, target]);
      });
      if (anchors.length < 2) return;
      var slope = (anchors[1][1] - anchors[0][1]) / (anchors[1][0] - anchors[0][0]);
      if (Math.abs(slope) !== 1 || !anchors.every(function(a) {
        return a[1] === anchors[0][1] + (a[0] - anchors[0][0]) * slope;
      })) return;
      source.stations.forEach(function(key, i) {
        result[owners[id] + '.' + codes[id] + '.' + normalizeStationKey(key)] =
          anchors[0][1] + (i - anchors[0][0]) * slope;
      });
    });
    return result;
  }

  // Public train numbers can change at verified JR through-run boundaries
  // (e.g. ChuoMain 640M -> ChuoRapid 640T). Never guess a suffix.
  function _canonicalTrainNumberAtPosition(tt, stop, fallback) {
    if (!tt || tt._positionSource !== "supabase-train-run" ||
        tt._canonicalGroupEvidence !== "verified_continuation" ||
        !stop || !stop.sourceTrainNumber || !stop.sourceLineKey) return fallback;
    var aliases = tt._canonicalTrainNumberAliases;
    if (!Array.isArray(aliases)) return fallback;
    var number = String(stop.sourceTrainNumber).trim();
    var line = String(stop.sourceLineKey).trim();
    return aliases.some(function(a) {
      return a && String(a.line_key || "") === line &&
        String(a.train_number || "") === number;
    }) ? number : fallback;
  }

  function compileTrainRun(tt, lineId, workLine, stationIndexMap, projection) {
    if (!tt) return null;
    var verifiedContinuation = tt._positionSource === 'supabase-train-run' &&
      tt._canonicalGroupEvidence === 'verified_continuation';
    var layoutKey = getCompiledLayoutKey(lineId, workLine, verifiedContinuation, projection);
    var cached = tt._compiledTrainRun;
    if (cached && cached.layoutKey === layoutKey) return cached;

    var trainNumber = tt["odpt:trainNumber"] || tt["odpt:train"] || "";
    var timetableObjectId = tt["@id"] || tt["owl:sameAs"] || "";
    var timetableIdentity = timetableObjectId ||
      ((tt["odpt:railway"] || lineId || "") + "|" + String(trainNumber));
    var tto = tt["odpt:trainTimetableObject"];
    if (!Array.isArray(tto) || tto.length === 0) return null;

    var stops = [];
    for (var s = 0; s < tto.length; s++) {
      var raw = tto[s];
      if (!raw) continue;
      var stationUrn = raw["odpt:departureStation"] || raw["odpt:arrivalStation"] || raw["odpt:station"] || "";
      var stationKey = extractStationKey(stationUrn);
      var normStationKey = normalizeStationKey(stationKey, lineId);
      var idx = stationIndexMap[normStationKey];
      if (idx === undefined) idx = stationIndexMap[stationKey];
      if (idx === undefined && verifiedContinuation && projection) {
        var stationParts = String(stationUrn).replace(/^odpt\.Station:/, '').split('.');
        if (stationParts.length === 3) idx = projection[stationParts[0] + '.' + stationParts[1] + '.' + normStationKey];
      }
      stops.push({
        raw: raw,
        stationUrn: stationUrn,
        stationIndex: idx,
        sourceTrainNumber: String(raw["_sqlTrainNumber"] || ""),
        sourceLineKey: String(raw["_sqlSourceLineKey"] || ""),
        arrivalMinute: parseTimeToMinutes(raw["odpt:arrivalTime"]),
        departureMinute: parseTimeToMinutes(raw["odpt:departureTime"])
      });
    }

    var destinationStation = "", destinationStationUrn = "";
    var rawDestinations = tt["odpt:destinationStation"];
    if (rawDestinations == null || rawDestinations === "") rawDestinations = tt.destinationStation;
    if (rawDestinations == null || rawDestinations === "") rawDestinations = tt.destination_station;
    if (rawDestinations == null || rawDestinations === "") rawDestinations = tt.destinationStationUrn;
    if (rawDestinations == null || rawDestinations === "") rawDestinations = tt.destination_station_urn;
    var destStations = Array.isArray(rawDestinations) ? rawDestinations : (rawDestinations ? [rawDestinations] : []);
    destStations = destStations.map(function(value) {
      if (value && typeof value === "object") {
        value = value.station_urn || value.station_key || value.urn || value.id || value["@id"] || "";
      }
      return value == null ? "" : String(value);
    }).filter(function(value) { return !!value; });
    if (destStations.length) {
      destinationStationUrn = String(destStations[0]);
      destinationStation = destinationStationUrn.split(".").pop();
    }
    // 环线没有"记录末站=终点"的语义：ODPT/本地环线 TrainTimetable（Yamanote 等）只覆盖
    // 一个运行段，末站常是数据截断点（如 Yamanote 949/1037 条记录末站全为 Osaki），
    // 不是列车真实终点。destinationStation 缺失时保持 UNKNOWN，由渲染层显示方向
    // （内回/外回）；绝不把截断点当作终点传播给全部列车。
    var _isLoopLine = workLine && (workLine.type === 'loop' ||
      workLine.isDoubleColumnLoop === true || workLine.isSixShapedLoop === true);
    if (!destinationStation && !_isLoopLine) {
      for (var di = tto.length - 1; di >= 0; di--) {
        var dr = tto[di] || {};
        if ((dr["odpt:departureTime"] || "") === "") {
          destinationStationUrn = String(dr["odpt:station"] || dr["odpt:arrivalStation"] || "");
          destinationStation = destinationStationUrn.split(".").pop();
          if (destinationStation) break;
        }
      }
    }

    // 即使导入时刻表意外保留了更长运行的停站，已公布终点仍限定本服务。
    // 所有证据保留在原始行中；只有定位视图在唯一终点处结束。
    // 环线区间和多个终点不能使用这个线性边界。

    if (!_isLoopLine && destStations.length === 1 && destinationStation) {
      var terminalKey = normalizeStationKey(destinationStation);
      var terminalIndex = stops.findIndex(function(stop) {
        return normalizeStationKey(extractStationKey(stop.stationUrn)) === terminalKey;
      });
      if (terminalIndex >= 0) {
        stops = stops.slice(0, terminalIndex + 1);
        var terminal = stops[stops.length - 1];
        terminal.arrivalMinute = terminal.arrivalMinute !== null
          ? terminal.arrivalMinute : terminal.departureMinute;
        terminal.departureMinute = null;
      }
    }

    var firstTimedMinute = null, lastTimedMinute = null;
    stops.forEach(function(stop) {
      var arrival = stop && stop.arrivalMinute;
      var departure = stop && stop.departureMinute;
      var first = arrival == null ? departure : arrival;
      var last = departure == null ? arrival : departure;
      if (first != null && (firstTimedMinute == null || first < firstTimedMinute)) firstTimedMinute = first;
      if (last != null && (lastTimedMinute == null || last > lastTimedMinute)) lastTimedMinute = last;
    });

    var railDirection = tt["odpt:railDirection"] || "";
    // 同一实体计划运行可能因不同对象 ID 被导入两次。
    // 只对车站/时刻顺序完全相同的行程去重，不能仅凭
    // 相同车次、方向或潜在直通路径去重。
    var scheduledItineraryKey = JSON.stringify([
      lineId, String(trainNumber), String(tt["odpt:calendar"] || ""),
      String(railDirection),
      stops.map(function(stop) {
        return [normalizeStationKey(extractStationKey(stop.stationUrn)),
          stop.arrivalMinute, stop.departureMinute];
      })
    ]);
    var dp = String(railDirection).split(":");
    cached = {
      layoutKey: layoutKey,
      trainNumber: trainNumber,
      serviceName: String(tt._sqlServiceName || ""),
      timetableObjectId: timetableObjectId,
      timetableIdentity: timetableIdentity,
      scheduledItineraryKey: scheduledItineraryKey,
      calendar: tt["odpt:calendar"] || "",
      railwayKey: extractRailwayKey(tt["odpt:railway"]),
      trainType: tt["odpt:trainType"] || "",
      railDirection: railDirection,
      directionName: dp.length > 1 ? dp[dp.length - 1] : String(railDirection),
      destinationStation: destinationStation,
      destinationStationUrn: destinationStationUrn,
      firstTimedMinute: firstTimedMinute,
      lastTimedMinute: lastTimedMinute,
      stops: stops
    };
    try {
      Object.defineProperty(tt, "_compiledTrainRun", {
        value: cached, writable: true, configurable: true, enumerable: false
      });
    } catch(e) {
      tt._compiledTrainRun = cached;
    }
    return cached;
  }

  // 经认证的精确车次/日历车型是唯一可公开的候选。
  // 旧 SQL 时刻表候选标签单独保留在
  // plannedVehicleCandidates 中供审计，绝不重新加入 EXACT 结果。
  function visibleVehicleCandidates(vehicle, historicalCandidates) {
    if (vehicle && vehicle.identityStatus === 'EXACT') {
      var confirmed = String(vehicle.name || '').trim();
      return confirmed ? [confirmed] : [];
    }
    var candidates = Array.isArray(vehicle && vehicle.candidates) ? vehicle.candidates.slice() : [];
    (Array.isArray(historicalCandidates) ? historicalCandidates : []).forEach(function(name) {
      name = String(name || '').trim();
      if (name && candidates.indexOf(name) < 0) candidates.push(name);
    });
    return candidates;
  }

  // Scheduled positions must pass through the same exact train-number /
  // service-calendar REFERENCE lookup as fresh ODPT positions. A corridor
  // representative is not an observed physical trainset: never upgrade
  // vehicleIdentityStatus, vehicleType, trainClass, formation or car number.
  function attachPublishedVehiclePlanToEstimate(position, run, tt, lineId, line) {
    if (!position || !run || !tt || position.estimated !== true ||
        position.vehicleIdentityStatus === "EXACT" ||
        !window.TrainVehicle ||
        typeof window.TrainVehicle.resolvePublishedPositionPlan !== "function") return;
    var currentPlan = position.vehiclePlan;
    // Preserve independently confirmed single-model timetable evidence.
    if (currentPlan && (currentPlan.confirmed === true ||
        (currentPlan.status === "PLANNED_MODEL" &&
         currentPlan.source !== "operation-family-plan"))) return;
    var calendar = String(run.calendar || tt["odpt:calendar"] || "");
    var calendarType = /(?:^|[:.])Weekday$/.test(calendar) ? "weekday" :
      /(?:^|[:.])(?:SaturdayHoliday|Saturday|Holiday|Sunday)$/.test(calendar)
        ? "holiday" : "";
    if (!calendarType || !String(position.serviceDate || "").match(/^\d{4}-\d{2}-\d{2}$/))
      return;
    var railway = String(tt["odpt:railway"] || position.sourceRailway || "");
    if (!railway || !position.trainNumber) return;
    var operator = String(tt["odpt:operator"] || (line && line.operator) || "")
      .replace(/^odpt\.Operator:/, "");
    var reference;
    try {
      reference = window.TrainVehicle.resolvePublishedPositionPlan({
        trainNumber: position.trainNumber,
        serviceDate: position.serviceDate,
        calendarType: calendarType,
        positionLineId: lineId,
        sourceRailway: railway,
        trainOperator: operator,
        trainType: position.trainType,
        positionSource: position.positionSource,
        estimated: true
      });
    } catch (e) {
      // No reference must never turn a valid estimated position into a failure.
      return;
    }
    if (!reference || !reference.iconPath ||
        (reference.status !== "PLANNED_MODEL" &&
         reference.status !== "FLEET_REPRESENTATIVE") ||
        reference.lineId !== lineId) return;
    position.calendarType = calendarType;
    position.vehiclePlan = reference;
    // The chosen gallery artwork is a scheduled reference only. Keep the
    // physical car identity unresolved for both E231/E233 common workings.
  }

  // 车型证据、身份和图片由统一运行时负责。
  function resolveTrainRunIdentity(run, tt, lineId, line, serviceDateOverride) {
    if (window.TrainVehicle && window.TrainVehicle.resolveTimetableRun) {
      return window.TrainVehicle.resolveTimetableRun(run, tt, lineId, line,
        serviceDateOverride || getTokyoServiceDate());
    }
    return {trainOwner:'',assignmentOperator:'',assignmentMatches:[],assignmentFormations:[],
      timetableVehicleInput:'',plannedVehicleCandidates:[],plannedVehicleCandidateStatus:'unresolved',
      vehicleResult:{name:'',vehicleTypeStr:'',candidates:[],identityStatus:'UNKNOWN',iconPath:''}};
  }

  /**
   * 根据时刻表和墙上时钟估算单条线路的计划位置。
   * @param {string} lineId - 线路 ID（如 “Namboku”）
   * @param {object} line - 包含 stations 数组的线路对象
   * @param {Array} timetableData - 该线路运营商的 TrainTimetable 对象数组
   * @param {object} delayInfo - 按运营商键控的延误信息
   * @param {string} operatorId - 规范化运营商 ID
   * @returns {Array} 估算位置 [{ stationIndex, trainId, delayMin, estimated: true }]
   */
  function planOperationContext(tt, lineId, line, run, delayInfo, operatorId) {
    var references = (tt._operationReferences || []).slice();
    var evaluator = window.RunInfoEvaluator;
    var operator = (window.ODPTClient && window.ODPTClient.LINE_TO_OPERATOR || {})[lineId] || line.operator || operatorId;
    var railway = (window.ODPTClient && window.ODPTClient.LINE_RAILWAY_CODE || {})[lineId] || lineId;
    var snapshot = delayInfo && (delayInfo[operatorId] || delayInfo[operator]);
    if (evaluator && evaluator.selectRecord && Array.isArray(snapshot)) {
      var record = evaluator.selectRecord(snapshot, operator, railway, function(rec) {
        return evaluator.evaluate({source:'odpt',currentOperationalSource:true,
          structuredStatus:rec['odpt:trainInformationStatus'],
          messageKind:rec['pt:messageKind'] || rec['odpt:category'],
          text:rec['odpt:trainInformationText'] || rec['odpt:text']});
      });
      if (record) {
        var ev = evaluator.evaluate({source:'odpt',currentOperationalSource:true,
          structuredStatus:record['odpt:trainInformationStatus'],
          messageKind:record['pt:messageKind'] || record['odpt:category'],
          text:record['odpt:trainInformationText'] || record['odpt:text']});
        var published = record['dc:date'] || record['odpt:timeOfOrigin'];
        var expiry = record['dct:valid'];
        (ev.impacts && ev.impacts.length ? ev.impacts : [{effect:ev.effect,interval:ev.interval}]).forEach(function(impact) {
          if (!impact.effect || impact.effect === 'normal') return;
          var range = String(impact.interval || '').split('→');
          references.push({id:record['@id'] || record['owl:sameAs'],line_id:lineId,
            source_url:record['@id'] || record['owl:sameAs'] || 'ODPT TrainInformation',
            published_at:published,starts_at:ev.messageKind === 'realtime' ? published : null,
            ends_at:expiry || (Number.isFinite(Date.parse(published || '')) ? new Date(Date.parse(published)+10*60*1000).toISOString() : null),
            exception_type:impact.effect === 'through_suspension' ? 'through_suspended'
              : impact.effect === 'suspension' ? 'suspended' : impact.effect,
            whole_line:impact.interval === '全線',
            station_from:range.length === 2 ? range[0].replace(/駅$/, '') : null,
            station_to:range.length === 2 ? range[1].replace(/駅$/, '') : null,
            train_number:record['odpt:trainNumber'] || null,
            rail_direction:impact.direction && impact.direction !== 'both' ? impact.direction : null,
            notes:ev.detail || ''});
        });
      }
    }
    var now = Date.now(), serviceDate = tt._serviceDate || getTokyoServiceDate();
    var direction = String(run.railDirection || '').split(/[:.]/).pop();
    var current = references.filter(function(ref) {
      if (!ref || !ref.source_url || !Number.isFinite(Date.parse(ref.published_at || ''))) return false;
      if (Date.parse(ref.published_at) > now || ref.line_id && ref.line_id !== lineId) return false;
      if (ref.service_date && ref.service_date !== serviceDate) return false;
      if (ref.train_number && ref.train_number !== run.trainNumber) return false;
      if (ref.rail_direction && String(ref.rail_direction).split(/[:.]/).pop() !== direction) return false;
      return !ref.ends_at || !Number.isFinite(Date.parse(ref.ends_at)) || now < Date.parse(ref.ends_at);
    }).map(function(ref) {
      return Object.assign({},ref,{applied:false,active:Number.isFinite(Date.parse(ref.starts_at || '')) &&
        Date.parse(ref.starts_at) <= now && Number.isFinite(Date.parse(ref.ends_at || '')) && now < Date.parse(ref.ends_at)});
    });
    // 不同事件可以共存；重复推送不会重复累加延误。
    var delays = current.filter(function(ref) {return ref.active && ref.exception_type === 'delay' &&
      (ref.train_run_id != null || ref.train_number === run.trainNumber) &&
      !ref.station_from && !ref.station_to && Number.isFinite(ref.delay_minutes) && ref.delay_minutes >= 0;});
    var values = delays.map(function(ref) {return ref.delay_minutes;});
    var delay = values.length && values.every(function(v) {return v === values[0];}) ? values[0] : 0;
    if (values.length && values.every(function(v) {return v === values[0];})) delays.forEach(function(ref) {ref.applied=true;});
    return {references:current,delayMinutes:delay};
  }

  function estimateLinePositions(lineId, line, timetableData, delayInfo, operatorId, allLines) {
    try {
      if (!line || !line.stations || !Array.isArray(line.stations) || line.stations.length === 0) return [];
      if (!timetableData || !Array.isArray(timetableData) || timetableData.length === 0) return [];

      var currentCalendars = getCurrentCalendars();
      var currentMin = getCurrentMinutes();
      // SQL/ODPT 时刻表描述计划时刻。运营商/线路状态
      // 不测量本列车的延误：将从文本推导的最坏
      // 15/60 分钟应用到所有服务会在警报变化时回拨每趟列车。
      // 实际 ODPT Train 位置及其测量延误仍由融合层处理。
      var delayMin = 0;
      var adjustedCurrentMin = currentMin;

      // 反转线路——站表顺序和ODPT站序相反时，反转站表数组
      // 这样后面的所有计算逻辑都不用改，结果自动正确
      var layout = getEstimatorStationLayout(lineId, line);
      var workLine = layout.workLine;
      var stationIndexMap = layout.stationIndexMap;
      var projection = sourceRouteProjection(lineId, workLine, stationIndexMap, allLines);

      var positions = [];
      var processedTrainIds = {};
      var serviceDate = getTokyoServiceDate();

      for (var t = 0; t < timetableData.length; t++) {
        var tt = timetableData[t];
        if (!tt) continue;
        if (tt._serviceDate && tt._serviceDate !== serviceDate) continue;
        if (tt._positionSource === 'supabase-train-run' && tt._sqlLineId && tt._sqlLineId !== lineId) continue;

        var run = compileTrainRun(tt, lineId, workLine, stationIndexMap, projection);
        if (!run) continue;
        // Kabe SQL's 7001M–7087MH is a synthetic 12-stop
        // Yokokawa–Kabe timetable grid, NOT the 2026-11
        // Hiroshima–Aki-Kameyama official 7xxM / 27xxM services.
        // The Edge Function quarantines it; this second guard
        // prevents stale SQL caches from drawing ghost trains.
        if(lineId==="Kabe"&&tt._positionSource==="supabase-train-run"&&
           /^2026-11-\d{2}$/.test(serviceDate)&&
           /^70[0-9]{2}MH?$/.test(String(run.trainNumber||"")))
          continue;
        // Yamagata local-only 2611: verify the published ordinary-train
        // number, 35-station scope and calendar before projecting historical
        // SQL clocks. This proves the NUMBER, not current stop times/stock.
        // Shinkansen Tsubasa remains a separate line.
        var officialYamagataNumberProof=null;
        if(lineId==="Yamagata"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var yamIndex=window.JREastYamagataNumberIndex202611;
          if(!yamIndex||typeof yamIndex.verify!=="function")continue;
          officialYamagataNumberProof=yamIndex.verify({
            trainNumber:run.trainNumber,positionLineId:"Yamagata",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            trainType:tt["odpt:trainType"]||"",
            railDirection:tt["odpt:railDirection"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,estimated:true,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";})
          });
          if(!officialYamagataNumberProof)continue;
        }
        if(lineId==="Uetsu" && tt._positionSource==="supabase-train-run" &&
           String(serviceDate).startsWith("2026-11")){
          var uetsu=window.JREastUetsuNumberIndex202611;
          if(!uetsu||!uetsu.verify({
            trainNumber:run.trainNumber,positionLineId:"Uetsu",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,estimated:true,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";})
          }))continue;
        }
        // Tsugaru 2611: only Aomori–Kanita is operating by rail.
        // Historical SQL retains the ordinary 18-number diagram; official
        // 324M runs Saturdays but not Sundays or Nov 3/23 holidays.
        // Check exact source station sequence and official end clocks.
        // Kanita–Minmaya replacement buses must never produce train icons.
        if(lineId==="Tsugaru"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var tsugaruIndex=window.JREastTsugaruNumberIndex202611;
          var tsugaruStops=run.stops||[];
          var firstTsugaru=tsugaruStops[0],lastTsugaru=tsugaruStops[tsugaruStops.length-1];
          if(!tsugaruIndex||typeof tsugaruIndex.verify!=="function"||
             !tsugaruIndex.verify({
               trainNumber:run.trainNumber,positionLineId:"Tsugaru",
               sourceRailway:tt["odpt:railway"]||"",
               trainOperator:tt["odpt:operator"]||"JR-East",
               railDirection:tt["odpt:railDirection"]||"",
               trainType:tt["odpt:trainType"]||"",
               calendarType:run.calendar,serviceDate:serviceDate,
               positionSource:tt._positionSource,estimated:true,
               scheduledStopKeys:tsugaruStops.map(function(x){
                 return x.stationUrn||"";
               }),
               firstDepartureClock:firstTsugaru&&firstTsugaru.raw&&
                 firstTsugaru.raw["odpt:departureTime"],
               lastArrivalClock:lastTsugaru&&lastTsugaru.raw&&
                 lastTsugaru.raw["odpt:arrivalTime"]
             }))continue;
        }
        // Tazawako 2611: old SQL mixes 701 locals, E6 Komachi services
        // falsely classified as 701 'Local', and partial duplicate 8xxM
        // records. The scoped JR East source-number/stop/calendar proof
        // keeps ONLY one full conventional itinerary per numbered service.
        // This does not change separately observed realtime positions.
        if(lineId==="Tazawako"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var tazawakoIndex=window.JREastTazawakoNumberIndex202611;
          if(!tazawakoIndex||typeof tazawakoIndex.verify!=="function"||
             !tazawakoIndex.verify({
               trainNumber:run.trainNumber,positionLineId:"Tazawako",
               sourceRailway:tt["odpt:railway"]||"",
               trainOperator:tt["odpt:operator"]||"JR-East",
               railDirection:tt["odpt:railDirection"]||"",
               trainType:tt["odpt:trainType"]||"",
               calendarType:run.calendar,serviceDate:serviceDate,
               positionSource:tt._positionSource,
               scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";})
             }))continue;
        }
        // Tadami 2611: only the published JR East base diagram may
        // generate scheduled map markers. Legacy manual imports also
        // contain undated 9423D/9425D/9430D; keeping those as ordinary
        // daily positions would invent train service. Fail closed if
        // the lazily loaded, line-scoped official roster is missing.
        // This guard never applies to independently observed ODPT trains.
        if(lineId==="Tadami"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var tadamiIndex=window.JREastTadamiNumberIndex202611;
          if(!tadamiIndex||typeof tadamiIndex.verify!=="function"||
             !tadamiIndex.verify({
               trainNumber:run.trainNumber,positionLineId:"Tadami",
               sourceRailway:tt["odpt:railway"]||"",
               trainOperator:tt["odpt:operator"]||"JR-East",
               railDirection:tt["odpt:railDirection"]||"",
               trainType:tt["odpt:trainType"]||"",
               calendarType:run.calendar,serviceDate:serviceDate,
               positionSource:tt._positionSource,
               scheduledStopKeys:run.stops.map(function(x){
                 return x.stationUrn||"";
               })
             }))continue;
        }
        // 白新線: 2026-11 public train numbers and actual rail segment.
        // Historic SQL says E129 even for Inaho E653 and Kairi HB-E300,
        // and includes 8055M / 9083M (December only) and 9883D.
        // Hide unverified SQL, never suppress independently sourced ODPT.
        var officialHakushinPlan=null;
        if(lineId==="Hakushin"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var hakushinIdx=window.JREastHakushinNumberIndex202611;
          if(!hakushinIdx||typeof hakushinIdx.verify!=="function")continue;
          officialHakushinPlan=hakushinIdx.verify(
            run.trainNumber,tt["odpt:railway"]||"",
            tt["odpt:railDirection"]||"",tt["odpt:trainType"]||"",
            run.calendar,serviceDate,tt["odpt:trainTimetableObject"]);
          if(!officialHakushinPlan)continue;
        }

        // Official JR East 2611 Joetsu public train number, calendar,
        // direction and *actual segment stops* must all agree.
        var officialJoetsuPlan=null;
        if(lineId==="Joetsu"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var joetsuIdx=window.TrainNumberPngRanges;
          if(joetsuIdx&&typeof joetsuIdx.verifyJoetsuService==="function")
            officialJoetsuPlan=joetsuIdx.verifyJoetsuService({
              trainNumber:run.trainNumber,positionLineId:"Joetsu",
              sourceRailway:tt["odpt:railway"]||"",
              trainOperator:tt["odpt:operator"]||"JR-East",
              railDirection:tt["odpt:railDirection"]||"",
              trainType:tt["odpt:trainType"]||"",
              calendarType:run.calendar,serviceDate:serviceDate,
              positionSource:tt._positionSource,
              scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
              sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
            });
        }
        // Kesennuma SQL namespace contains BRT K and RAIL D together.
        // In the train-position diagram NEVER infer from K bus times,
        // even when a BRT station shares the same geographic station.
        // The JR East 2611 Komii roster is SQL-authoritative.
        // Reject old holiday-only 825xD / 9121D, HIGH RAIL on non
        // operating dates, and any train through the rockfall closure.
        var officialKomiiPlan=null;
        if(lineId==="Komii"&&String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var komiiIdx=window.TrainNumberPngRanges;
          if(!komiiIdx||typeof komiiIdx.verifyKomiiService!=="function")continue;
          officialKomiiPlan=komiiIdx.verifyKomiiService({
            trainNumber:run.trainNumber,positionLineId:"Komii",
            displayLineId:"Komii",sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialKomiiPlan)continue;
        }
        var officialKesennumaRailPlan=null;
        if(lineId==="Kesennuma"&&String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var kesennumaRules=window.TrainNumberPngRanges;
          if(!kesennumaRules||
             typeof kesennumaRules.verifyKesennumaRailService!=="function")
            continue;
          officialKesennumaRailPlan=kesennumaRules.verifyKesennumaRailService({
            trainNumber:run.trainNumber,positionLineId:"Kesennuma",
            displayLineId:"Kesennuma",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialKesennumaRailPlan)continue;
        }
        var officialKashimaPlan=null;
        if(lineId==="Kashima"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var kIndex=window.TrainNumberPngRanges;
          if(!kIndex||typeof kIndex.verifyKashimaService!=="function")continue;
          officialKashimaPlan=kIndex.verifyKashimaService({
            trainNumber:run.trainNumber,positionLineId:"Kashima",
            displayLineId:"Kashima",sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialKashimaPlan)continue;
        }
        var officialKamaishiPlan=null;
        if(lineId==="Kamaishi"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var kamaishiIdx=window.TrainNumberPngRanges;
          if(!kamaishiIdx||typeof kamaishiIdx.verifyKamaishiService!=="function")continue;
          officialKamaishiPlan=kamaishiIdx.verifyKamaishiService({
            trainNumber:run.trainNumber,positionLineId:"Kamaishi",
            displayLineId:"Kamaishi",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialKamaishiPlan)continue;
        }
        var officialGonoPlan = null;
        if(lineId==="Gono" && tt._positionSource==="supabase-train-run" &&
           String(serviceDate).slice(0,7)==="2026-11"){
          // Strict fail-closed: without this lazy-loaded official roster,
          // do not show old SQL 852x resort cars as local GV-E400 trains.
          var gonoIndex=window.JREastGonoNumberIndex202611;
          if(!gonoIndex||typeof gonoIndex.verify!=="function")continue;
          officialGonoPlan=gonoIndex.verify(
            run.trainNumber,tt["odpt:railway"]||"",tt["odpt:railDirection"]||"",
            tt["odpt:trainType"]||"",run.calendar,serviceDate);
          if(!officialGonoPlan)continue;
        }

        // November 2026 Ishinomaki: only the published 266u1/u2/d1/d2
        // train numbers and service dates may produce SQL plan positions.
        // Older SQL contains 9631D/9634D and December-only Satono trips.
        // Never suppress an independently reported realtime observation.
        var officialIshinomakiPlan = null;
        if(lineId==="Ishinomaki" && tt._positionSource==="supabase-train-run" &&
           String(serviceDate).slice(0,7)==="2026-11" &&
           window.JREastIshinomakiNumberIndex202611 &&
           typeof window.JREastIshinomakiNumberIndex202611.verify==="function"){
          officialIshinomakiPlan=window.JREastIshinomakiNumberIndex202611.verify(
            run.trainNumber,tt["odpt:railway"]||"",tt["odpt:railDirection"]||"",
            tt["odpt:trainType"]||"",run.calendar,serviceDate);
          if(officialIshinomakiPlan===false)continue;
        }

        // 大糸線 JR WEST OitoWest is a different OPERATOR/diagram.
        // No bus 790x, no East M or 8361/2D and no guessed full
        // Itoigawa clocks. Verify only 3-station historical partial
        // sources and keep both actual-car identity and PNG unresolved.
        var officialOitoWestPlan=null;
        if(lineId==="OitoWest"&&String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run"||
             !/^4[0-9]{2}D$/.test(String(run.trainNumber||"")))continue;
          var westIndex=window.TrainNumberPngRanges;
          if(!westIndex||
             typeof westIndex.verifyOitoWestService!=="function")continue;
          officialOitoWestPlan=westIndex.verifyOitoWestService({
            trainNumber:run.trainNumber,positionLineId:"OitoWest",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-West",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialOitoWestPlan)continue;
        }

        // 大糸線 2611 JR-East Matsumoto–Minami-Otari ONLY.
        // Do NOT operate on existing separately handled JR-WEST 4xxD
        // diesel services or old 790x bus records. The East M and
        // 8361D/8362D special trains require an exact dated SQL proof.
        var officialOitoEastPlan=null;
        if(lineId==="Oito"&&String(serviceDate).slice(0,7)==="2026-11"&&
           (/^[0-9]+M$/.test(String(run.trainNumber||""))||
             ["8361D","8362D"].includes(String(run.trainNumber||"")))){
          if(tt._positionSource!=="supabase-train-run")continue;
          var eastIndex=window.TrainNumberPngRanges;
          if(!eastIndex||
             typeof eastIndex.verifyOitoEastService!=="function")continue;
          officialOitoEastPlan=eastIndex.verifyOitoEastService({
            trainNumber:run.trainNumber,positionLineId:"Oito",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialOitoEastPlan)continue;
        }

        // OuMain 2611: six exact published Tsugaru/Super Tsugaru
        // limited expresses use E751. No generic OuMain M-number PNG:
        // the backend's train number, source stops, edition and calendar
        // must also pass the client-side source-bound validator.
        var officialOuMainTsugaruPlan=null;
        if(lineId==="OuMain"&&
           ["2021M","2022M","2041M","2042M","2043M","2044M"]
             .indexOf(String(run.trainNumber||""))>=0&&
           String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var ouTsugaru=window.TrainNumberPngRanges;
          if(!ouTsugaru||
             typeof ouTsugaru.verifyOuMainTsugaruService!=="function")
             continue;
          officialOuMainTsugaruPlan=ouTsugaru.verifyOuMainTsugaruService({
            trainNumber:run.trainNumber,positionLineId:"OuMain",
            displayLineId:"OuMain",sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialOuMainTsugaruPlan)continue;
        }

        // 2611 Oga: only verified source-template M-number and 9-stop
        // railway SQL timetable can provide a planned EV-E801 marker.
        // November 5 six cancellations / November 20 1145M time
        // variant are enforced at the source before position projection.
        var officialOgaPlan=null;
        if(lineId==="Oga"&&String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var ogaIndex=window.TrainNumberPngRanges;
          if(!ogaIndex||typeof ogaIndex.verifyOgaService!=="function")
            continue;
          officialOgaPlan=ogaIndex.verifyOgaService({
            trainNumber:run.trainNumber,positionLineId:"Oga",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialOgaPlan)continue;
        }

        // Regional JR East 2611 exact public numbers and operating dates:
        // Kururi: 40 D services; Karasuyama: scheduled work-day cancellations;
        // Hachinohe: Nov 4/5 partial suspensions, changed clock, dated
        // replacement trains and Sunday-only market rapid.
        // Apply ONLY to SQL-derived planned positions, never live ODPT trains.
        // A cancelled or partially altered historical SQL route cannot be
        // projected as if its full current timetable still ran.
        if(["Kururi","Karasuyama","Hachinohe"].indexOf(lineId)>=0 &&
           tt._positionSource==="supabase-train-run" &&
           String(serviceDate).slice(0,7)==="2026-11" &&
           window.JREastRegionalNumberIndex202611 &&
           typeof window.JREastRegionalNumberIndex202611.verify==="function"){
          var officialRegionalPlan=window.JREastRegionalNumberIndex202611.verify(
            lineId,run.trainNumber,tt["odpt:railway"]||"",
            tt["odpt:railDirection"]||"",tt["odpt:trainType"]||"",
            run.calendar,serviceDate);
          if(officialRegionalPlan===false)continue;
        }

        // 久留里線 2611: verify the exact SQL rail-only stop list after
        // the server cropped the closed Kururi–KazusaKameyama segment.
        var officialKururiPlan=null;
        if(lineId==="Kururi"&&String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var kururiIndex=window.TrainNumberPngRanges;
          if(!kururiIndex||typeof kururiIndex.verifyKururiService!=="function")
            continue;
          officialKururiPlan=kururiIndex.verifyKururiService({
            trainNumber:run.trainNumber,positionLineId:"Kururi",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialKururiPlan)continue;
        }

        // 大船渡線 2611: Ofunato internal line mixes BRT F/K numbers
        // and genuine Ichinoseki--Kesennuma railway D train numbers.
        // Only SQL-source-dated rail D records can be plotted as TRAINS.
        // Pokemon KiHa100 has no genuine PNG in the gallery.
        var officialOfunatoPlan=null;
        if(lineId==="Ofunato"&&String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var ofunatoRanges=window.TrainNumberPngRanges;
          if(!ofunatoRanges||
             typeof ofunatoRanges.verifyOfunatoService!=="function")
            continue;
          officialOfunatoPlan=ofunatoRanges.verifyOfunatoService({
            trainNumber:run.trainNumber,positionLineId:"Ofunato",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialOfunatoPlan)continue;
        }

        // Sotetsu/JR 2611: verified historical four-stop source, but
        // neither the 1xx/2xx public number nor the old stop clock
        // certifies the physical E233-7000 vs Sotetsu-12000 assignment.
        var officialSotetsuJRPlan=null;
        if(lineId==="SotetsuJRDirect"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var sotetsuIndex=window.TrainNumberPngRanges;
          if(!sotetsuIndex||
             typeof sotetsuIndex.verifySotetsuJRService!=="function")
            continue;
          officialSotetsuJRPlan=sotetsuIndex.verifySotetsuJRService({
            trainNumber:run.trainNumber,positionLineId:"SotetsuJRDirect",
            displayLineId:"SotetsuJRDirect",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(st){
              return st.stationUrn||"";
            }),
            sqlPublishedNumberFleetReference:
              tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialSotetsuJRPlan)continue;
        }

        // Kyoto–Osaka–Kobe JR-West C/T/M source-only fleet.
        // SanyoMain is shared with non-Kobe districts, so only SQL
        // source-template IDs and exact stop order can admit a candidate.
        var officialJrWestKyotoKobePlan=null;
        if((lineId==="TokaidoKansai"||lineId==="SanyoMain")&&
           String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run"){
            // Unrelated realtime sources remain governed by their own
            // actual-vehicle evidence, not historical SQL C/T/M suffixes.
          }else{
            var jrWestKbIndex=window.TrainNumberPngRanges;
            if(jrWestKbIndex&&
               typeof jrWestKbIndex.verifyJrWestKyotoKobeSourceFleet==="function"){
              officialJrWestKyotoKobePlan=
                jrWestKbIndex.verifyJrWestKyotoKobeSourceFleet({
                  trainNumber:run.trainNumber,positionLineId:lineId,
                  displayLineId:lineId,
                  sourceRailway:tt["odpt:railway"]||"",
                  trainOperator:tt["odpt:operator"]||"JR-West",
                  railDirection:tt["odpt:railDirection"]||"",
                  trainType:tt["odpt:trainType"]||"",
                  calendarType:run.calendar,serviceDate:serviceDate,
                  positionSource:tt._positionSource,
                  scheduledStopKeys:run.stops.map(function(st){
                    return st.stationUrn||"";
                  }),
                  sqlPublishedNumberFleetReference:
                    tt._sqlPublishedNumberFleetReference||null
                });
            }
          }
          // Unlike a true 2611 official timetable, source-only candidates
          // may be absent: never suppress unrelated SanyoMain services.
        }

        // 2611 湖西線: the old Kosei SQL has 179 ordinary/rapid
        // source-only M/MH rows; H denotes a weekend calendar, not a
        // separate physical carset. 9017DH is a seasonal special wrongly
        // labeled Local by the import and must not create a 2611 map train.
        var officialKoseiPlan=null;
        if(lineId==="Kosei"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var koseiNumberIndex=window.TrainNumberPngRanges;
          if(!koseiNumberIndex||
             typeof koseiNumberIndex.verifyKoseiSourceFleet!=="function")
            continue;
          officialKoseiPlan=koseiNumberIndex.verifyKoseiSourceFleet({
            trainNumber:run.trainNumber,positionLineId:"Kosei",
            displayLineId:"Kosei",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-West",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(st){
              return st.stationUrn||"";
            }),
            sqlPublishedNumberFleetReference:
              tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialKoseiPlan)continue;
        }

        // 2611 弥彦線 internal Miyo: 9-day Kiku segmented timetable.
        // Oct-24 Shu*Kura must be excluded, and Momiji Kairi has no
        // matching source SQL stop clocks (do not invent a position).
        var officialMiyoPlan=null;
        if(lineId==="Miyo"&&String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var miyoIndex=window.TrainNumberPngRanges;
          if(!miyoIndex||typeof miyoIndex.verifyMiyoService!=="function")
            continue;
          officialMiyoPlan=miyoIndex.verifyMiyoService({
            trainNumber:run.trainNumber,positionLineId:"Miyo",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(st){return st.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialMiyoPlan)continue;
        }

        // Mito 2611 regular M-number proof and date-specific 756M/763M
        // variants must come from the SQL server. Reject historical
        // duplicate/future/October-only records, never infer formation.
        var officialMitoPlan=null;
        if(lineId==="Mito"&&String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var mitoIndex=window.TrainNumberPngRanges;
          if(!mitoIndex||typeof mitoIndex.verifyMitoService!=="function")
            continue;
          officialMitoPlan=mitoIndex.verifyMitoService({
            trainNumber:run.trainNumber,positionLineId:"Mito",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialMitoPlan)continue;
        }

        // RikutoEast 2611: never turn the legacy SQL D-number roster into
        // phantom trains. Official 268u1/u2/d1/d2 provides the real
        // calendar, including 9721–9726D rapid dates (Oct31–Nov3 +
        // November weekends/holidays). Naruko-Onsen–Shinjo is suspended
        // after the July 2024 damage: OLD whole-route estimates must
        // not draw a rail train on the replacement-bus section.
        var officialRikutoEastPlan=null;
        if(lineId==="RikutoEast"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"&&
           window.JREastRikutoEastNumberIndex202611&&
           typeof window.JREastRikutoEastNumberIndex202611.verify==="function"){
          officialRikutoEastPlan=window.JREastRikutoEastNumberIndex202611.verify(
            run.trainNumber,tt["odpt:railway"]||"",tt["odpt:railDirection"]||"",
            tt["odpt:trainType"]||"",run.calendar,serviceDate);
          if(officialRikutoEastPlan===false)continue;
          // Stop proof is essential: any historical timetable that includes
          // stations beyond Naruko-Onsen cannot be an operating rail run.
          // Current SQL stops do NOT include this suspended segment.
          // Use RAW published stop rows here, not run.stops:
          // compileTrainRun truncates at a declared destination. A stale
          // source can conceal cancelled onward segments after that point.
          var suspendedRikutoStop=(tt["odpt:trainTimetableObject"]||[])
            .some(function(raw){
              var urn=raw&&(raw["odpt:departureStation"]||
                raw["odpt:arrivalStation"]||raw["odpt:station"]||"");
              var st=normalizeStationKey(extractStationKey(urn));
              return /^(?:nakayamadairaonsen|sakaida|akakuraonsen|tachikoji|mogami|ohori|usugi|semionsen|higashinagasawa|nagasawa|minamishinjo|shinjo)$/.test(st);
            });
          if(suspendedRikutoStop)continue;
          var rk26=window.TrainNumberPngRanges;
          if(!officialRikutoEastPlan||!rk26||
             typeof rk26.verifyRikutoEastService!=="function")continue;
          var sourceBackedRikuto=rk26.verifyRikutoEastService({
            trainNumber:run.trainNumber,positionLineId:"RikutoEast",
            displayLineId:"RikutoEast",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!sourceBackedRikuto||
             sourceBackedRikuto.kind!==officialRikutoEastPlan.kind||
             sourceBackedRikuto.model!==officialRikutoEastPlan.model)continue;
        }

        // 米坂線: internal ID Yonezawa. Strict source-number/station/date
        // verification prevents historical Local-labelled bus rows (1--22)
        // from becoming moving trains. No rail position past Imaizumi.
        var officialYonesakaPlan=null;
        if(lineId==="Yonezawa"&&String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var yoneIndex=window.JREastYonezawaNumberIndex202611;
          if(!yoneIndex||typeof yoneIndex.verify!=="function")continue;
          officialYonesakaPlan=yoneIndex.verify({
            trainNumber:run.trainNumber,positionLineId:"Yonezawa",
            displayLineId:"Yonezawa",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,estimated:true,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";})
          });
          if(!officialYonesakaPlan)continue;
        }

        // 陸羽西線 restored rail services in 2026. Use only the exact
        // 2611 numbers and calendar for November SQL-based positions.
        // Old 9166D is not on this month's published train-number roster.
        var officialRikutsuWestPlan=null;
        if(lineId==="RikutsuWest"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"&&
           window.JREastRikutsuWestNumberIndex202611&&
           typeof window.JREastRikutsuWestNumberIndex202611.verify==="function"){
          officialRikutsuWestPlan=window.JREastRikutsuWestNumberIndex202611.verify(
            run.trainNumber,tt["odpt:railway"]||"",tt["odpt:railDirection"]||"",
            tt["odpt:trainType"]||"",run.calendar,serviceDate);
          if(officialRikutsuWestPlan===false)continue;
        }

        // 大湊線: JR East 2611 is the final authority for each D number.
        // Maintenance 10–13 November cancels six exact rail segments; an
        // Aomori Railway continuation does NOT restore its cancelled
        // Ominato segment. Dec-only Hinabi 9227D/9236D is not a Nov train.
        var officialOminatoPlan=null;
        if(lineId==="Ominato"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"&&
           window.JREastOminatoNumberIndex202611&&
           typeof window.JREastOminatoNumberIndex202611.verify==="function"){
          officialOminatoPlan=window.JREastOminatoNumberIndex202611.verify(
            run.trainNumber,tt["odpt:railway"]||"",
            tt["odpt:railDirection"]||"",tt["odpt:trainType"]||"",
            run.calendar,serviceDate);
          if(officialOminatoPlan===false)continue;
        }

        // 飯山線: public 2611 D numbers, distinct Oykot and Shu＊Kura
        // running dates. These are service types, NOT physical trainsets.
        // The specialist liveries have no approved shared gallery image.
        var officialIiyamaPlan=null;
        if(lineId==="Iiyama"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"&&
           window.JREastIiyamaNumberIndex202611&&
           typeof window.JREastIiyamaNumberIndex202611.verify==="function"){
          officialIiyamaPlan=window.JREastIiyamaNumberIndex202611.verify(
            run.trainNumber,tt["odpt:railway"]||"",tt["odpt:railDirection"]||"",
            tt["odpt:trainType"]||"",run.calendar,serviceDate);
          if(officialIiyamaPlan===false)continue;
        }

        // Hanawa 2611: SQL source/number/date must authorize the picture.
        var officialHanawaPlan=null;
        if(lineId==="Kounan"&&String(serviceDate).slice(0,7)==="2026-11"){
          if(tt._positionSource!=="supabase-train-run")continue;
          var hanawaRange=window.TrainNumberPngRanges;
          if(!hanawaRange||typeof hanawaRange.verifyHanawaService!=="function")continue;
          officialHanawaPlan=hanawaRange.verifyHanawaService({
            trainNumber:run.trainNumber,positionLineId:"Kounan",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            positionSource:tt._positionSource,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialHanawaPlan)continue;
        }

        // Kitakami Nov 2026: 8/2 flood closed Hotto-Yuda–Yokote
        // (bus replacement). Require source-backed 2611 NUMBER AND the
        // actual RAW rail stop endpoints, never crop a phantom through run.
        var officialKitakamiPlan=null;
        if(lineId==="Kitakami"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var kiIndex=window.JREastKitakamiNumberIndex202611;
          if(!kiIndex||typeof kiIndex.verifySqlProof!=="function")continue;
          officialKitakamiPlan=kiIndex.verifySqlProof({
            trainNumber:run.trainNumber,positionLineId:"Kitakami",
            sourceRailway:tt["odpt:railway"]||"",
            trainOperator:tt["odpt:operator"]||"JR-East",
            railDirection:tt["odpt:railDirection"]||"",
            trainType:tt["odpt:trainType"]||"",
            calendarType:run.calendar,serviceDate:serviceDate,
            scheduledStopKeys:run.stops.map(function(x){return x.stationUrn||"";}),
            sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference||null
          });
          if(!officialKitakamiPlan)continue;
        }

        // Yamada Nov 2026: leaf-slip closure removes ALL Morioka–Miyako
        // direct rail services. Separate north and south local runs exist,
        // but old SQL also stores bus services as bare numbers 1–24.
        // Nov 5–6 daytime and Nov 7–8 all-day rockfall suspensions further
        // block the southern rail section. Admit only exact service+RAW
        // stop endpoints, or hide rather than invent a vehicle position.
        var officialYamadaPlan=null;
        if(lineId==="Yamada"&&tt._positionSource==="supabase-train-run"&&
           String(serviceDate).slice(0,7)==="2026-11"){
          var yaIndex=window.JREastYamadaNumberIndex202611;
          if(!yaIndex||typeof yaIndex.verify!=="function")continue;
          officialYamadaPlan=yaIndex.verify(
            run.trainNumber,tt["odpt:railway"]||"",
            tt["odpt:railDirection"]||"",tt["odpt:trainType"]||"",
            run.calendar,serviceDate,tt["odpt:trainTimetableObject"]);
          if(!officialYamadaPlan)continue;
        }

        // 按日历筛选（匹配当前任一日历类型）。
        var calendar = run.calendar;
        if (calendar && currentCalendars.indexOf(calendar) < 0 &&
            !(officialRikutoEastPlan &&
              officialRikutoEastPlan.holidayTemplateOnWeekday===true &&
              serviceDate==="2026-11-02" &&
              /(?:^|[.:])(?:SaturdayHoliday|Saturday|Sunday|Holiday)$/.test(calendar)) &&
            !(officialIiyamaPlan &&
              officialIiyamaPlan.holidayTemplateOnWeekday===true &&
              serviceDate==="2026-11-02" &&
              /(?:^|[.:])(?:SaturdayHoliday|Saturday|Sunday|Holiday)$/.test(calendar)))
          continue;

        // JR East disaster timetable, 2026-11-01 through 11-08.
        // The Anegasaki--Nagaura tracks are CLOSED in both directions
        // (Typhoon 25). A regular SQL timetable crossing the closed
        // section is NOT a valid whole-train plan: temporary shortened
        // services have their own unverified stops/numbers and must not
        // be invented from the old timetable. This affects *all* regular
        // Boso stock families, irrespective of a vehicle PNG guess.
        // Suppress only historical SQL-derived through-runs; leave
        // observed realtime vehicles and independently supplied sources
        // alone. Keep the underlying SQL templates intact.
        // JR East: https://traininfo.jreast.co.jp/train_info/line.aspx?gid=1&lineid=uchiboline
        // Chiba Prefecture: https://www.pref.chiba.lg.jp/kendosei/kendo/r8-taihuu25-uchibousen-kendou287.html
        if (lineId === "Uchibo" &&
            tt._positionSource === "supabase-train-run" &&
            serviceDate >= "2026-11-01" && serviceDate <= "2026-11-08") {
          var closedStations = ["Anegasaki", "Nagaura"].map(function(station) {
            return workLine.stations.findIndex(function(urn) {
              return normalizeStationKey(extractStationKey(urn)) ===
                normalizeStationKey(station);
            });
          });
          if (closedStations[0] >= 0 && closedStations[1] >= 0) {
            var indices = run.stops.map(function(stop) {
              return stop.stationIndex;
            }).filter(function(index) { return Number.isInteger(index); });
            if (indices.length >= 2 &&
                Math.min.apply(null, indices) <= Math.min.apply(null, closedStations) &&
                Math.max.apply(null, indices) >= Math.max.apply(null, closedStations)) {
              continue;
            }
          }
        }

        // JR East 2026-11-07 (Saturday) Boso rapid train numbering differs
        // from the normal SaturdayHoliday train plan. Official 2611 tables
        // explicitly cancel these numbered services on that date:
        // Uchibo 3680F -> 9680M / 9680F, 3606F -> 9606M / 9606F
        // Sotobo 3573F -> 9573F / 9573M,
        //        3719F -> 9887F / 9887M, 3845F -> 9939F / 8939M.
        // The alternate numbered services are NOT yet present as complete
        // dated SQL timetable runs. Suppress only these proven phantom
        // NORMAL services, never synthesize another train, or alter ODPT.
        // Sources (11/7 conditional "◆" operating-day columns):
        // https://timetables.jreast.co.jp/2611/timetable-v/221u2p.html
        // https://timetables.jreast.co.jp/2611/timetable-v/220d2p.html
        if (tt._positionSource === "supabase-train-run" &&
            serviceDate === "2026-11-07" &&
            /(?:^|[:.])(?:SaturdayHoliday|Saturday|Holiday|Sunday)$/.test(
              String(calendar || "")) &&
            String(tt["odpt:railway"] || "") ===
              "odpt.Railway:JR-East." + lineId &&
            String(tt["odpt:trainType"] || "").split(/[:.]/).pop() ===
              "Rapid" &&
            ((lineId === "Uchibo" &&
                ["3680F","3606F"].indexOf(run.trainNumber) >= 0) ||
             (lineId === "Sotobo" &&
                ["3573F","3719F","3845F"].indexOf(run.trainNumber) >= 0))) {
          continue;
        }

        // A historical Saturday/Holiday template may include a special
        // train which the current JR East monthly timetable runs on ONLY
        // explicitly selected dates. It must not produce a phantom planned
        // marker on unrelated holidays. This rule does not touch realtime.
        if (lineId === "ChuoMain" &&
            tt._positionSource === "supabase-train-run" &&
            window.CHUO_MAIN_OFFICIAL_VEHICLE_REFERENCES &&
            String(serviceDate).slice(0,7) ===
              window.CHUO_MAIN_OFFICIAL_VEHICLE_REFERENCES.revision) {
          var officialRules=window.CHUO_MAIN_OFFICIAL_VEHICLE_REFERENCES.rules || [];
          var officialNumber=String(run.trainNumber || "").trim();
          var officialCal=/(?:^|[:.])Weekday$/.test(calendar) ? "weekday" :
            /(?:^|[:.])(?:SaturdayHoliday|Saturday|Holiday|Sunday)$/.test(calendar)
              ? "holiday" : "";
          var officialRailway=String(tt["odpt:railway"] || "");
          var officialType=String(tt["odpt:trainType"] || "").split(/[:.]/).pop();
          var datedRule=officialRules.filter(function(rule) {
            return rule && rule.trainNumber === officialNumber &&
              rule.calendarType === officialCal &&
              rule.trainType === officialType &&
              Array.isArray(rule.sourceRailways) &&
              rule.sourceRailways.indexOf(officialRailway) >= 0 &&
              (!rule.effectiveFrom || serviceDate >= rule.effectiveFrom) &&
              (!rule.effectiveTo || serviceDate <= rule.effectiveTo);
          })[0];
          if (datedRule && Array.isArray(datedRule.operatingDates) &&
              datedRule.operatingDates.indexOf(serviceDate) < 0) continue;
        }

        // JR East Narita Abiko branch official 2611 number index:
        // weekday/holiday 40 each direction; full 820M-899M number
        // identities. Restrict ONLY SQL-derived PLANNED positions.
        // Never infer a Joban continuation, actual carset, or substitute
        // operation number. Do not block ODPT / independent timetables.
        if (lineId === "NaritaAbikoBranch" &&
            tt._positionSource === "supabase-train-run" &&
            window.JREastNaritaAbikoNumberIndex202611 &&
            typeof window.JREastNaritaAbikoNumberIndex202611.verify === "function") {
          var listedAbiko = window.JREastNaritaAbikoNumberIndex202611.verify(
            run.trainNumber, tt["odpt:railway"] || "",
            tt["odpt:railDirection"] || "",
            tt["odpt:trainType"] || "",
            calendar, serviceDate);
          if (listedAbiko === false) continue;
        }

        // Togane Nov 2026 SQL number admission follows all four JR East
        // 2611 published day/direction lists (30 inbound, 31 outbound).
        // Apply to PLANNED SQL services only. It cannot change an actual
        // observation, infer vehicle assignment, or certify stop clocks.
        // Historical SQL remains usable outside Nov 2026; re-audit future
        // editions before imposing the same number list.
        if (lineId === "Togane" &&
            tt._positionSource === "supabase-train-run" &&
            window.JREastToganeNumberIndex202611 &&
            typeof window.JREastToganeNumberIndex202611.verify === "function") {
          var publishedTogane = window.JREastToganeNumberIndex202611.verify(
            run.trainNumber, tt["odpt:railway"] || "",
            tt["odpt:railDirection"] || "",
            tt["odpt:trainType"] || "",
            calendar, serviceDate);
          if (publishedTogane === false) continue;
        }

        // NambuBranch has an exact JR East November 2026 public-number
        // schedule in both directions. Admit only those SQL services for
        // this edition; keep the train number as 500H/2211H, NOT a guessed
        // operating/car number. Outside this edition, the historical SQL
        // timetable remains usable but its revision is still unverified.
        // The separate realtime channel is never filtered by this plan index.
        if (lineId === "NambuBranch" &&
            tt._positionSource === "supabase-train-run" &&
            window.NambuBranchOfficial202611 &&
            typeof window.NambuBranchOfficial202611.verify === "function") {
          var officiallyListed = window.NambuBranchOfficial202611.verify(
            run.trainNumber, tt["odpt:railway"] || "",
            tt["odpt:railDirection"] || "",
            tt["odpt:trainType"] || "",
            calendar, serviceDate);
          if (officiallyListed === false) continue;
        }

        // 按铁路筛选（如果 lineId 匹配）。
        var railwayKey = run.railwayKey;
        if (railwayKey && railwayKey !== lineId &&
            !(tt._positionSource === 'supabase-train-run' && tt._sqlLineId === lineId)) {
          // 反查 LINE_RAILWAY_CODE——ODPT Kawagoe（川越-高麗川間）数据对应
          // 项目 KawagoeWest 线、SaikyoKawagoe 数据对应 Saikyo/Kawagoe 线（大宮〜川越段）
          var _rwc = window.ODPTClient && window.ODPTClient.LINE_RAILWAY_CODE;
          if (!_rwc || _rwc[lineId] !== railwayKey) continue;
        }

        // Most timetable rows are outside the current service window. Reject
        // them before delay evaluation, stop scanning, and vehicle evidence;
        // this keeps a live poll proportional to trains actually in service.
        if (run.firstTimedMinute != null && currentMin < run.firstTimedMinute) continue;
        if (run.lastTimedMinute != null && currentMin > run.lastTimedMinute) continue;

        var trainNumber = run.trainNumber || ("est_" + t);
        // 车次号不是全局唯一；已编译运行保留
        // canonical 时刻表对象/铁路身份，跨刷新保持不变。
        var timetableObjectId = run.timetableObjectId;
        var timetableIdentity = run.timetableIdentity;
        if (processedTrainIds[timetableIdentity]) continue;

        var tto = tt["odpt:trainTimetableObject"];
        if (!tto || !Array.isArray(tto) || tto.length === 0) continue;

        // 已公布停站是完整的位置权威。终点
        // 不会补充缺失的通过时刻，也不授权外推。
        var verifiedContinuation = tt._positionSource === 'supabase-train-run' &&
          tt._canonicalGroupEvidence === 'verified_continuation';
        var fullStops = run.stops;
        var operation = planOperationContext(tt, lineId, line, run, delayInfo, operatorId);
        delayMin = operation.delayMinutes;
        adjustedCurrentMin = currentMin - delayMin;
        operation.references.forEach(function(ref) {
          if (!ref.active || ref.exception_type !== 'through_suspended' || !ref.boundary_station) return;
          var boundary = normalizeStationKey(extractStationKey(ref.boundary_station));
          var boundaryIndex = fullStops.findIndex(function(stop) {return normalizeStationKey(extractStationKey(stop.stationUrn)) === boundary;});
          if (boundaryIndex >= 0) { fullStops = fullStops.slice(0, boundaryIndex + 1); ref.applied=true; }
        });

        // 根据时间查找当前车站。
        var currentStationIndex = -1;
        var foundInService = false;
        var segmentToIndex = null;
        var segmentProgress = 0;
        var lastDepartedStop = null;
        var canonicalNumberStop = null;

        for (var s = 0; s < fullStops.length; s++) {
          var stop = fullStops[s];
          if (!stop) continue;

          var depTime = stop.departureMinute;
          var arrTime = stop.arrivalMinute;
          var idx = stop.stationIndex;

          if (idx === undefined) {
            // Outside the displayed route: do not keep the previous station
            // or interpolate across an unmapped branch. A later mapped stop
            // may establish a new visible position when its own clock is reached.
            if (lastDepartedStop && adjustedCurrentMin > lastDepartedStop.time) {
              foundInService = false;
              lastDepartedStop = null;
            }
            continue;
          }
          if (idx === undefined || (idx < 0 && !verifiedContinuation)) continue;

          // 站内停车判定拆分——到达（arrival）与发车（departure）分开判定：
          // 停车期间（arrTime <= now < depTime）列车就在本站，不应回退显示在上一站。
          // 显式 !== null（0 = 00:00 是合法时间，原 depTime || arrTime 把 0 当 falsy 误判）
          var effectiveArrival = (arrTime !== null && arrTime !== undefined) ? arrTime : depTime;
          var effectiveDeparture = (depTime !== null && depTime !== undefined) ? depTime : arrTime;
          // 第一站还没发车，不显示——把时刻表上即将发车的车（15:10 发车，
          // 当前 15:03）误算成在始发站待发车，导致 12 列车堆北绫濑。
          // 只有已经从始发站发车的车才显示。
          if (s === 0 && effectiveDeparture !== null && adjustedCurrentMin < effectiveDeparture) {
            foundInService = false;
            break;
          }
          if (lastDepartedStop && effectiveArrival !== null && adjustedCurrentMin < effectiveArrival) {
            currentStationIndex = lastDepartedStop.idx;
            foundInService = true;
            segmentToIndex = idx;
            var _segDur = Math.max(1, effectiveArrival - lastDepartedStop.time);
            segmentProgress = Math.max(0, Math.min(1, (adjustedCurrentMin - lastDepartedStop.time) / _segDur));
            canonicalNumberStop = lastDepartedStop.sourceStop || null;
            break;
          }
          if (effectiveArrival !== null && adjustedCurrentMin >= effectiveArrival) {
            currentStationIndex = idx;
            foundInService = true;
            canonicalNumberStop = stop;
          }
          if (effectiveDeparture !== null && adjustedCurrentMin >= effectiveDeparture) {
            lastDepartedStop = { idx: idx, time: effectiveDeparture, sourceStop: stop };
          }
          // 尚未发车（停车中或未到达）即停——列车不会越过本站
          if (effectiveDeparture !== null && adjustedCurrentMin < effectiveDeparture) {
            break;
          }
        }

        // Timed brackets can extend outside this map. Interpolate along the
        // published source station order, then clip the visible position.
        // No junction passage times or synthetic stopping times are created.
        if (verifiedContinuation && foundInService) {
          var coordinate = segmentToIndex === null ? currentStationIndex :
            currentStationIndex + (segmentToIndex - currentStationIndex) * segmentProgress;
          if (coordinate < 0 || coordinate > workLine.stations.length - 1) continue;
          if (segmentToIndex !== null) {
            var forward = segmentToIndex >= currentStationIndex;
            currentStationIndex = forward ? Math.floor(coordinate) : Math.ceil(coordinate);
            segmentToIndex = forward ? Math.ceil(coordinate) : Math.floor(coordinate);
            segmentProgress = Math.abs(coordinate - currentStationIndex);
          }
        }

        // 只纳入当前正在运行的列车（至少已从一个车站发车）。
        if (foundInService && currentStationIndex >= 0) {
          // 在最后一个已公布时刻结束，包括不完整的终点行。
          // 宽限区间不得将服务延长到其时刻证据之外。
          var lastArrTime = null;
          for (var _ls = fullStops.length - 1; _ls >= 0; _ls--) {
            var _stp7 = fullStops[_ls] || {};
            // The last timed row may be an intermediate stop followed by
            // untimed pass-through rows. Keep its published dwell until
            // departure; a verified terminus already has departure cleared.
            var _arr7 = _stp7.arrivalMinute, _dep7 = _stp7.departureMinute;
            var _tm7 = _arr7 == null ? _dep7 : (_dep7 == null ? _arr7 : Math.max(_arr7, _dep7));
            if (_tm7 !== null && _tm7 !== undefined) { lastArrTime = _tm7; break; }
          }
          if (lastArrTime !== null && adjustedCurrentMin > lastArrTime) continue; // No post-terminal schedule movement.

          var publicTrainNumber = _canonicalTrainNumberAtPosition(
            tt, canonicalNumberStop, trainNumber);
          processedTrainIds[timetableIdentity] = true;
          // Original SQL imported all Gono services as Local/GV-E400,
          // even the named Resort Shirakami and two Rapid D services.
          // Restore the source-verified public service class for display.
          var publishedGonoTrainType=officialGonoPlan && officialGonoPlan.trainType
            ? "odpt.TrainType:JR-East."+officialGonoPlan.trainType : "";
          var publishedIshinomakiTrainType=officialIshinomakiPlan &&
            officialIshinomakiPlan.trainType
            ? "odpt.TrainType:JR-East."+officialIshinomakiPlan.trainType : "";
          var publishedRikutoEastTrainType=officialRikutoEastPlan &&
            officialRikutoEastPlan.trainType
            ? "odpt.TrainType:JR-East."+officialRikutoEastPlan.trainType : "";
          var publishedRikutsuWestTrainType=officialRikutsuWestPlan &&
            officialRikutsuWestPlan.trainType
            ? "odpt.TrainType:JR-East."+officialRikutsuWestPlan.trainType : "";
          var publishedOminatoTrainType=officialOminatoPlan &&
            officialOminatoPlan.trainType
            ? "odpt.TrainType:JR-East."+officialOminatoPlan.trainType : "";
          var publishedIiyamaTrainType=officialIiyamaPlan &&
            officialIiyamaPlan.trainType
            ? "odpt.TrainType:JR-East."+officialIiyamaPlan.trainType : "";
          var publishedHakushinTrainType=officialHakushinPlan &&
            officialHakushinPlan.trainType
            ? "odpt.TrainType:JR-East."+officialHakushinPlan.trainType:"";
          var publishedJoetsuTrainType=officialJoetsuPlan&&officialJoetsuPlan.trainType
            ?"odpt.TrainType:JR-East."+officialJoetsuPlan.trainType:"";
          var publishedKamaishiTrainType=officialKamaishiPlan&&officialKamaishiPlan.trainType
            ?"odpt.TrainType:JR-East."+officialKamaishiPlan.trainType:"";
          var publishedKitakamiTrainType=officialKitakamiPlan&&officialKitakamiPlan.trainType
            ?"odpt.TrainType:JR-East."+officialKitakamiPlan.trainType:"";
          var publishedKashimaTrainType=officialKashimaPlan&&officialKashimaPlan.trainType
            ?"odpt.TrainType:JR-East."+officialKashimaPlan.trainType:"";
          var publishedKesennumaTrainType=officialKesennumaRailPlan&&
            officialKesennumaRailPlan.trainType
            ?"odpt.TrainType:JR-East."+officialKesennumaRailPlan.trainType:"";
          var publishedKomiiTrainType=officialKomiiPlan&&officialKomiiPlan.trainType
             ?"odpt.TrainType:JR-East."+officialKomiiPlan.trainType:"";
          var effectivePublishedTrainType=publishedKomiiTrainType||publishedKesennumaTrainType||publishedKashimaTrainType||publishedKitakamiTrainType||publishedKamaishiTrainType||publishedJoetsuTrainType||
            publishedHakushinTrainType || publishedGonoTrainType ||
            publishedIshinomakiTrainType || publishedRikutoEastTrainType ||
            publishedRikutsuWestTrainType || publishedOminatoTrainType ||
            publishedIiyamaTrainType || "";
          var trainClassification = classifyTrain(
            effectivePublishedTrainType || run.trainType, trainNumber, lineId);
          var railDirection = run.railDirection;
          var directionName = run.directionName;
          // 白新線 is only a segment; JR East 2611 confirms 9M
          // continues Shibata -> Sakata. Preserve planned position clipping.
          var officialTerminal=officialHakushinPlan &&
            officialHakushinPlan.destinationStation||"";
          var destinationStation=officialTerminal||run.destinationStation;
          var destinationStationUrn=officialTerminal
            ?"odpt.Station:JR-East."+officialTerminal
            :run.destinationStationUrn;
          // Vehicle identity is compiled once through the canonical evidence resolver.
          var _runIdentity = resolveTrainRunIdentity(run, tt, lineId, line);
          var _trainOwner = _runIdentity.trainOwner;
          var _assignmentOperator = _runIdentity.assignmentOperator;
          var _assignmentMatches = _runIdentity.assignmentMatches;
          var _assignmentFormationIds = _runIdentity.assignmentFormations;
          var _timetableVehicleInput = _runIdentity.timetableVehicleInput;
          var vehResult = _runIdentity.vehicleResult;
          var _plannedCandidates = _runIdentity.plannedVehicleCandidates || [];
          var _visibleCandidates = visibleVehicleCandidates(vehResult, _plannedCandidates);
          // The source SQL falsely labels ALL Gono trains GV-E400,
          // including Resort Shirakami. Replace the passenger-facing
          // candidate and plan ONLY on officially indexed 852xD resorts.
          // Preserve the old source row for audit; never claim a dated
          // physical carset or use an unapproved 青池/橅/くまげら PNG.
          var _gonoResortFleet=officialGonoPlan &&
            officialGonoPlan.kind==="resort" &&
            vehResult.identityStatus!=="EXACT"
            ?String(officialGonoPlan.fleetReference||""):"";
          var _publishedVehiclePlan=vehResult.vehiclePlan||null;
          if(_gonoResortFleet){
            _plannedCandidates=[_gonoResortFleet];
            _visibleCandidates=[_gonoResortFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_gonoResortFleet],
              iconPath:"",representativeModel:"",
              source:"jr-east-2026-11-gono-resort-calendar",
              sourceUrl:"https://www.jreast.co.jp/railway/joyful/shirakami.html",
              lineId:"Gono",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // White-Shinetsu 2611 timetable confirms these service family
          // models but does NOT establish the real physical formation.
          // Discard the imported E129 planned candidate for limited
          // express Inaho and the HB-E300 Kairi resort. Since their
          // artwork has unresolved livery / source, leave the map neutral.
          var _hakushinSpecialFleet=officialHakushinPlan&&
            (officialHakushinPlan.kind==="inaho"||
             officialHakushinPlan.kind==="kairi")&&
            vehResult.identityStatus!=="EXACT"
            ?String(officialHakushinPlan.model||""):"";
          if(_hakushinSpecialFleet){
            _plannedCandidates=[_hakushinSpecialFleet];
            _visibleCandidates=[_hakushinSpecialFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_hakushinSpecialFleet],
              iconPath:"",representativeModel:"",
              source:"jr-east-2026-11-hakushin-official-service",
              sourceUrl:"https://timetables.jreast.co.jp/2611/timetable-v/255d1.html",
              lineId:"Hakushin",operator:"JR-East",confirmed:false,
              referenceOnly:true
            };
          }
          // A source-verified Joetsu fleet is a plan REFERENCE only; a
          // stale SQL E129/211 label must not override the published service.
          var _joetsuFleet=officialJoetsuPlan&&vehResult.identityStatus!=="EXACT"
            ?String(officialJoetsuPlan.model||""):"";
          if(_joetsuFleet){
            _plannedCandidates=[_joetsuFleet];
            _visibleCandidates=[_joetsuFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_joetsuFleet],
              iconPath:"",representativeModel:"",
              source:"jr-east-2026-11-joetsu-number-stops",
              sourceUrl:officialJoetsuPlan.kind==="south"
                ?"https://timetables.jreast.co.jp/2611/timetable-v/238d1.html"
                :"https://timetables.jreast.co.jp/2611/timetable-v/296d1.html",
              lineId:"Joetsu",operator:"JR-East",confirmed:false,referenceOnly:true
            };
          }
          // Official SQL Kamaishi NUMBER -> fleet illustration only.
          var _kamaishiFleet=officialKamaishiPlan &&
            vehResult.identityStatus!=="EXACT"
            ?String(officialKamaishiPlan.model||""):"";
          if(_kamaishiFleet){
            _plannedCandidates=[_kamaishiFleet];
            _visibleCandidates=[_kamaishiFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_kamaishiFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2026-11-kamaishi-number-roster",
              sourceUrl:tt._sqlPublishedNumberFleetReference &&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl ||"",
              lineId:"Kamaishi",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // JR-West Oito KiHa120-300 orange/red is documented, but
          // there is no corresponding original PNG in this repo.
          var _oitoWestNoPng=!!officialOitoWestPlan;
          if(_oitoWestNoPng){
            _plannedCandidates=[];
            _visibleCandidates=[];
            _publishedVehiclePlan=null;
          }
          // JR-East Oito exact-source / date-approved illustrated model.
          // Do not infer a model for 5232M: the SQL family is unknown.
          var _oitoEastUnknown=officialOitoEastPlan&&
            officialOitoEastPlan.model===null;
          var _oitoEastFleet=officialOitoEastPlan&&
            officialOitoEastPlan.pngPath&&
            vehResult.identityStatus!=="EXACT"
            ?String(officialOitoEastPlan.model||""):"";
          if(_oitoEastUnknown){
            _plannedCandidates=[];
            _visibleCandidates=[];
            _publishedVehiclePlan=null;
          }
          if(_oitoEastFleet){
            _plannedCandidates=[_oitoEastFleet];
            _visibleCandidates=[_oitoEastFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_oitoEastFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-oito-east-number-dated",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Oito",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // Officially mapped E751 family (not a confirmed formation).
          var _ouTsugaruFleet=officialOuMainTsugaruPlan&&
            vehResult.identityStatus!=="EXACT"
            ?String(officialOuMainTsugaruPlan.model||""):"";
          if(_ouTsugaruFleet){
            _plannedCandidates=[_ouTsugaruFleet];
            _visibleCandidates=[_ouTsugaruFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_ouTsugaruFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-oumain-tsugaru-e751",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"OuMain",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // Oga: EV-E801 is a fleet REFERENCE, not observed carset.
          var _ogaFleet=officialOgaPlan&&vehResult.identityStatus!=="EXACT"
            ?String(officialOgaPlan.model||""):"";
          if(_ogaFleet){
            _plannedCandidates=[_ogaFleet];
            _visibleCandidates=[_ogaFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_ogaFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-oga-number-date-rail",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Oga",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // 大船渡線: ordinary KiHa110 gets the pre-existing railway
          // family PNG, but KiHa100 Pokemon never borrows that livery.
          var _ofunatoPokemon=officialOfunatoPlan&&
            officialOfunatoPlan.kind==="rail_pokemon";
          var _ofunatoFleet=officialOfunatoPlan&&
            officialOfunatoPlan.kind==="rail_regular"&&
            officialOfunatoPlan.pngPath&&
            vehResult.identityStatus!=="EXACT"
              ?String(officialOfunatoPlan.model||""):"";
          if(_ofunatoPokemon){
            // No approved Pokemon image: a neutral train marker is more
            // accurate than a generic KiHa110 masquerading as KiHa100.
            _plannedCandidates=[];
            _visibleCandidates=[];
            _publishedVehiclePlan=null;
          }
          if(_ofunatoFleet){
            _plannedCandidates=[_ofunatoFleet];
            _visibleCandidates=[_ofunatoFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_ofunatoFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-ofunato-number-rail",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Ofunato",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }

          // Kosei source-only M/MH does not authorize an image. Even the
          // gallery's 681/683 models belong to unimported Thunderbird
          // LIMITED EXPRESS, never 1802M/3145MH ordinary/rapid trains.
          var _koseiScoped=!!officialKoseiPlan&&
            vehResult.identityStatus!=="EXACT";
          if(_koseiScoped){
            _plannedCandidates=officialKoseiPlan.candidateModels.slice();
            _visibleCandidates=officialKoseiPlan.candidateModels.slice();
            _publishedVehiclePlan={
              status:"UNCONFIRMED_FLEET",
              models:officialKoseiPlan.candidateModels.slice(),
              iconPath:"",representativeModel:"",
              source:"sql-jrwest-kosei-2611-source-family",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.fleetSourceUrl||"",
              lineId:"Kosei",operator:"JR-West",
              confirmed:false,referenceOnly:true
            };
          }
          // Source only: C=207/321 fleet; T/M rapid=223/225 fleet.
          // The 500310-...-714T composite key is not a 2611 public
          // number, and candidate PNGs cannot identify physical stock.
          var _jrwestKyotoKobeScoped=!!officialJrWestKyotoKobePlan&&
            vehResult.identityStatus!=="EXACT";
          if(_jrwestKyotoKobeScoped){
            _plannedCandidates=
              officialJrWestKyotoKobePlan.candidateModels.slice();
            _visibleCandidates=
              officialJrWestKyotoKobePlan.candidateModels.slice();
            _publishedVehiclePlan={
              status:"UNCONFIRMED_FLEET",
              models:officialJrWestKyotoKobePlan.candidateModels.slice(),
              iconPath:"",representativeModel:"",
              source:"sql-jrwest-kyoto-kobe-2611-source-family",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.fleetSourceUrl||"",
              lineId:lineId,operator:"JR-West",
              confirmed:false,referenceOnly:true
            };
          }
          // SQL candidate set is NOT an E233 single-model authorization.
          // A genuine independently established EXACT formation wins.
          var _sotetsuJrScoped=!!officialSotetsuJRPlan&&
            vehResult.identityStatus!=="EXACT";
          if(_sotetsuJrScoped){
            _plannedCandidates=officialSotetsuJRPlan.candidateModels.slice();
            _visibleCandidates=officialSotetsuJRPlan.candidateModels.slice();
            _publishedVehiclePlan={
              status:"UNCONFIRMED_FLEET",
              models:officialSotetsuJRPlan.candidateModels.slice(),
              iconPath:"",representativeModel:"",
              source:"sql-jreast-sotetsu-jr-2611-source-candidate",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.fleetSourceUrl||"",
              lineId:"SotetsuJRDirect",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // 弥彦線 E129 approved fleet PNG is representative ONLY.
          var _miyoFleet=officialMiyoPlan&&vehResult.identityStatus!=="EXACT"
            ?String(officialMiyoPlan.model||""):"";
          if(_miyoFleet){
            _plannedCandidates=[_miyoFleet];
            _visibleCandidates=[_miyoFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_miyoFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-miyo-number-dated",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Miyo",operator:"JR-East",confirmed:false,referenceOnly:true
            };
          }
          // Published Mito E531 5-car family, not a 0/3000 series or
          // commemorative colour assignment for a specific train.
          var _mitoFleet=officialMitoPlan&&vehResult.identityStatus!=="EXACT"
            ?String(officialMitoPlan.model||""):"";
          if(_mitoFleet){
            _plannedCandidates=[_mitoFleet];
            _visibleCandidates=[_mitoFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_mitoFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-mito-number-dated",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Mito",operator:"JR-East",confirmed:false,referenceOnly:true
            };
          }
          // Kururi: allow only SQL-authorized Kisarazu–Kururi rail family
          // illustration, never closed-only 29xxD or replacement bus.
          var _kururiFleet=officialKururiPlan&&vehResult.identityStatus!=="EXACT"
            ?String(officialKururiPlan.model||""):"";
          if(_kururiFleet){
            _plannedCandidates=[_kururiFleet];
            _visibleCandidates=[_kururiFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_kururiFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-kururi-open-rail-number-proof",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Kururi",operator:"JR-East",confirmed:false,referenceOnly:true
            };
          }
          // Hanawa SQL-issued exact train number -> representative vehicle PNG.
          var _hanawaFleet=officialHanawaPlan &&
            vehResult.identityStatus!=="EXACT"
              ?String(officialHanawaPlan.model||""):"";
          if(_hanawaFleet){
            _plannedCandidates=[_hanawaFleet];
            _visibleCandidates=[_hanawaFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_hanawaFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-hanawa-number-date-proof",
              sourceUrl:tt._sqlPublishedNumberFleetReference &&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Kounan",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // SQL-verified Kitakami roster grants illustrative KiHa110
          // stock only on the surviving rail section, never the bus line.
          var _kitakamiFleet=officialKitakamiPlan &&
            vehResult.identityStatus!=="EXACT"
              ?String(officialKitakamiPlan.model||""):"";
          if(_kitakamiFleet){
            _plannedCandidates=[_kitakamiFleet];
            _visibleCandidates=[_kitakamiFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_kitakamiFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-kitakami-number-rail-scope",
              sourceUrl:tt._sqlPublishedNumberFleetReference &&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Kitakami",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // Kashima: exact SQL source decides E131/E235 family illustration;
          // 548/549 and November-7 variants remain visually unresolved.
          var _kashimaScoped=!!officialKashimaPlan;
          var _kashimaFleet=_kashimaScoped && vehResult.identityStatus!=="EXACT"
            ?String(officialKashimaPlan.model||""):"";
          var _kashimaMixed=_kashimaScoped&&!officialKashimaPlan.pngPath;
          if(_kashimaScoped){
            _plannedCandidates=_kashimaFleet?[_kashimaFleet]:[];
            _visibleCandidates=_plannedCandidates.slice();
            _publishedVehiclePlan={
              status:_kashimaFleet?"PLANNED_MODEL":"UNKNOWN",
              models:_plannedCandidates.slice(),
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-kashima-number-family",
              sourceUrl:tt._sqlPublishedNumberFleetReference &&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Kashima",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // Kesennuma: PNG only for SQL-proofed rail D local service;
          // family series reference is NOT the physically observed carset.
          var _kesennumaFleet=officialKesennumaRailPlan &&
             vehResult.identityStatus!=="EXACT"
             ?String(officialKesennumaRailPlan.model||""):"";
          if(_kesennumaFleet){
            _plannedCandidates=[_kesennumaFleet];
            _visibleCandidates=[_kesennumaFleet];
            _publishedVehiclePlan={
              status:"PLANNED_MODEL",models:[_kesennumaFleet],
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-kesennuma-rail-only",
              sourceUrl:tt._sqlPublishedNumberFleetReference &&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Kesennuma",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // HIGH RAIL has a named-family image. The other 48 regular
          // numbers are mixed KiHa110/KiHaE200 candidates with NO valid
          // per-number PNG. Never resurrect a legacy candidate image.
          var _komiiScoped=!!officialKomiiPlan;
          var _komiiFleet=_komiiScoped&&officialKomiiPlan.pngPath&&
            vehResult.identityStatus!=="EXACT"
             ?String(officialKomiiPlan.model||""):"";
          if(_komiiScoped){
            _plannedCandidates=_komiiFleet?[_komiiFleet]:[];
            _visibleCandidates=_plannedCandidates.slice();
            _publishedVehiclePlan={
              status:_komiiFleet?"PLANNED_MODEL":"UNKNOWN",
              models:_plannedCandidates.slice(),
              iconPath:"",representativeModel:"",
              source:"sql-jreast-2611-komii-number-service-family",
              sourceUrl:tt._sqlPublishedNumberFleetReference&&
                tt._sqlPublishedNumberFleetReference.officialSourceUrl||"",
              lineId:"Komii",operator:"JR-East",
              confirmed:false,referenceOnly:true
            };
          }
          // 车型身份状态始终来自 TrainVehicle；SQL
          // 历史候选不得将 UNKNOWN 提升为 NARROWED/EXACT。
          var trainClass = (_koseiScoped||_jrwestKyotoKobeScoped||_sotetsuJrScoped||_komiiScoped||_kesennumaFleet||_kashimaScoped||_hakushinSpecialFleet||_joetsuFleet||_kamaishiFleet||_kitakamiFleet||_hanawaFleet||_kururiFleet||_mitoFleet||_miyoFleet||_ofunatoFleet||_ofunatoPokemon||_ogaFleet||_oitoEastFleet||_oitoEastUnknown||_oitoWestNoPng) ? "" : (vehResult.name || '');
          var _vehicleType = (_koseiScoped||_jrwestKyotoKobeScoped||_sotetsuJrScoped||_komiiScoped||_kesennumaFleet||_kashimaScoped||_hakushinSpecialFleet||_joetsuFleet||_kamaishiFleet||_kitakamiFleet||_hanawaFleet||_kururiFleet||_mitoFleet||_miyoFleet||_ofunatoFleet||_ofunatoPokemon||_ogaFleet||_oitoEastFleet||_oitoEastUnknown||_oitoWestNoPng) ? "" :
            (vehResult.vehicleTypeStr || '');
          // Missing resolver means unresolved identity; timetable data must not
          // bypass the single source-arbitration authority.
          var blocked = operation.references.some(function(ref) {
            if (!ref.active || ['cancelled','suspended','construction'].indexOf(ref.exception_type) < 0) return false;
            if (ref.whole_line === true || ref.train_run_id != null && !ref.station_from && !ref.station_to) return true;
            var from = workLine.stations.findIndex(function(id) {return normalizeStationKey(id) === normalizeStationKey(extractStationKey(ref.station_from || ''));});
            var to = workLine.stations.findIndex(function(id) {return normalizeStationKey(id) === normalizeStationKey(extractStationKey(ref.station_to || ''));});
            if (from < 0 || to < 0) return false;
            var target = segmentToIndex == null ? currentStationIndex : segmentToIndex;
            return Math.max(currentStationIndex,target) >= Math.min(from,to) && Math.min(currentStationIndex,target) <= Math.max(from,to);
          });
          if (blocked) continue;
          positions.push({
            stationIndex: currentStationIndex,
            trainId: lineId + '_' + trainNumber,
            timetableIdentity: timetableIdentity,
            // Verified SQL continuation identifies the same SERVICE across source lines.
            // Expose source stops only for the cross-segment matching proof,
            // never as realtime observed position or a physical carset identity.
            canonicalTimetableId: tt._canonicalTrainTimetableId || null,
            canonicalGroupEvidence: tt._canonicalGroupEvidence || "source_only",
            canonicalLineIds: Array.isArray(tt._canonicalLineIds)
              ? tt._canonicalLineIds.slice() : [],
            canonicalTrainNumberAliases: Array.isArray(tt._canonicalTrainNumberAliases)
              ? tt._canonicalTrainNumberAliases.slice() : [],
            canonicalStopKeys: tt._canonicalGroupEvidence === "verified_continuation" &&
                tt._canonicalTrainTimetableId
              ? run.stops.map(function(stop){return String(stop.stationUrn||"").split(".").pop();}).filter(Boolean)
              : [],
            // Published station stops for THIS line's planned service.
            // Live train-number matching must check the observed source station
            // against these stops even for a source_only canonical timetable.
            // These are planned station keys, NOT real-time vehicle positions.
            scheduledStopKeys: tt._positionSource === "supabase-train-run"
              ? run.stops.map(function(stop) {
                  return String(stop.stationUrn || "").split(".").pop();
                }).filter(Boolean)
              : [],
            sourceRailway: tt["odpt:railway"] || "",
            positionLineId: lineId,
            scheduledItineraryKey: run.scheduledItineraryKey || "",
            runningChainId: timetableIdentity,
            runningChainEvidence: "TIMETABLE_SEGMENT",
            trainNumber: publicTrainNumber,
            // Keep historical composite/H source trainNumber for canonical
            // matching; only date-verified official public M numbers may be
            // used for optional presentation. No carset inference.
            displayTrainNumber:tt._positionSource==="supabase-train-run"&&
              tt._timetableDateVerified===true&&
              ((lineId==="Kosei"&&officialKoseiPlan&&
                tt._sqlTrainNumberVerification==="official-2611-kosei-source-stop-clock"&&
                String(tt._sqlPublishedTrainNumber||"")===
                String(officialKoseiPlan.historicalNumber||""))||
               (lineId==="TokaidoKansai"&&officialJrWestKyotoKobePlan&&
                tt._sqlTrainNumberVerification==="official-2611-kyoto-kobe-source-stop-clock"&&
                String(tt._sqlPublishedTrainNumber||"")===
                String(officialJrWestKyotoKobePlan.historicalNumberSuffix||""))||
               (lineId==="Nara"&&
                tt._sqlTrainNumberVerification==="official-2611-nara-source-stop-clock"&&
                /^[0-9]{3,4}M$/.test(String(tt._sqlPublishedTrainNumber||""))&&
                String(tt._sqlPublishedTrainNumber||"")===
                  String(publicTrainNumber||"").replace(/H$/,"")))
              ?tt._sqlPublishedTrainNumber:publicTrainNumber,
            officialNumberVerified: Boolean(tt._positionSource==="supabase-train-run"&&
              tt._timetableDateVerified===true&&
              String(publicTrainNumber||"")===String(run.trainNumber||"")&&
              ((lineId==="Kosei"&&officialKoseiPlan&&
                tt._sqlTrainNumberVerification==="official-2611-kosei-source-stop-clock"&&
                String(tt._sqlPublishedTrainNumber||"")===
                String(officialKoseiPlan.historicalNumber||""))||
               (lineId==="TokaidoKansai"&&officialJrWestKyotoKobePlan&&
                tt._sqlTrainNumberVerification==="official-2611-kyoto-kobe-source-stop-clock"&&
                String(tt._sqlPublishedTrainNumber||"")===
                String(officialJrWestKyotoKobePlan.historicalNumberSuffix||""))||
               (lineId==="Nara"&&
                tt._sqlTrainNumberVerification==="official-2611-nara-source-stop-clock"&&
                /^[0-9]{3,4}M$/.test(String(tt._sqlPublishedTrainNumber||""))&&
                String(tt._sqlPublishedTrainNumber||"")===
                  String(publicTrainNumber||"").replace(/H$/,""))))||
              Boolean(officialYonesakaPlan || officialYamagataNumberProof || officialOuMainTsugaruPlan || officialGonoPlan || officialIshinomakiPlan ||
              officialOgaPlan || officialRegionalPlan ||
              officialRikutoEastPlan || officialRikutsuWestPlan ||
              officialOminatoPlan || officialIiyamaPlan ||
              officialKitakamiPlan || officialHanawaPlan || officialKururiPlan || officialMitoPlan || officialMiyoPlan || officialOfunatoPlan || officialOitoEastPlan || officialOitoWestPlan || officialYamadaPlan ||
              officialHakushinPlan || officialJoetsuPlan || officialKamaishiPlan || officialKashimaPlan ||
               officialKesennumaRailPlan || officialKomiiPlan) &&
              // Other-line public number only when its underlying source
              // identity is unchanged; never infer physical vehicle.
              String(publicTrainNumber||"").toUpperCase() ===
                String(run.trainNumber||"").toUpperCase(),
            historicalKoseiPublicNumber:
              officialKoseiPlan?officialKoseiPlan.historicalNumber:"",
            historicalSourcePublicNumberSuffix:
              officialJrWestKyotoKobePlan
                ?officialJrWestKyotoKobePlan.historicalNumberSuffix:"",
            trainNumberSource: publicTrainNumber !== trainNumber
              ? "canonical-source-stop" : "timetable-record",
            publishedGonoLivery:_gonoResortFleet
              ?officialGonoPlan.livery:"",
            publishedFleetReference:_ouTsugaruFleet||_komiiFleet||_kesennumaFleet||_kashimaFleet||_kitakamiFleet||_kamaishiFleet||_joetsuFleet||_hanawaFleet||_kururiFleet||_mitoFleet||_miyoFleet||_ofunatoFleet||_ofunatoPokemon||_ogaFleet||_oitoEastFleet||_oitoEastUnknown||_oitoWestNoPng||_hakushinSpecialFleet||_gonoResortFleet,
            sqlPublishedNumberFleetReference:(officialKoseiPlan||officialJrWestKyotoKobePlan||officialSotetsuJRPlan||officialOuMainTsugaruPlan||officialJoetsuPlan||officialKamaishiPlan||officialKitakamiPlan||officialHanawaPlan||officialKururiPlan||officialMitoPlan||officialMiyoPlan||officialOfunatoPlan||officialOgaPlan||officialOitoEastPlan||officialOitoWestPlan||officialKashimaPlan||officialKesennumaRailPlan||officialKomiiPlan)
              ?tt._sqlPublishedNumberFleetReference||null:null,
            publishedHakushinServiceFamily:_hakushinSpecialFleet
              ?officialHakushinPlan.kind:"",
            serviceName: officialOuMainTsugaruPlan && officialOuMainTsugaruPlan.serviceName
              ?officialOuMainTsugaruPlan.serviceName
              : officialKamaishiPlan && officialKamaishiPlan.serviceName
              ? officialKamaishiPlan.serviceName
              : officialJoetsuPlan && officialJoetsuPlan.serviceName
              ? officialJoetsuPlan.serviceName
              : officialHakushinPlan && officialHakushinPlan.serviceName
              ? officialHakushinPlan.serviceName
              : officialGonoPlan && officialGonoPlan.serviceName
                ? officialGonoPlan.serviceName
              : officialIshinomakiPlan && officialIshinomakiPlan.serviceName
                ? officialIshinomakiPlan.serviceName
                : officialRikutoEastPlan && officialRikutoEastPlan.serviceName
                  ? officialRikutoEastPlan.serviceName
                  : officialRikutsuWestPlan && officialRikutsuWestPlan.serviceName
                    ? officialRikutsuWestPlan.serviceName
                    : officialOminatoPlan && officialOminatoPlan.serviceName
                      ? officialOminatoPlan.serviceName
                      : officialIiyamaPlan && officialIiyamaPlan.serviceName
                        ? officialIiyamaPlan.serviceName : (run.serviceName || ""),
            // 即使车型证据不可用或未确认，位置身份仍属于计划的服务日。

            serviceDate: tt._serviceDate || getTokyoServiceDate(),
            delayMin: delayMin,
            estimated: true,
            positionSource: tt._positionSource || "train-timetable",
            // 保留 SQL 来源日期核验供诊断使用；绝不
            // 将未经核验的历史时刻表提升为当前计划。
            timetableValidity: tt._positionSource === "supabase-train-run"
              ? (tt._timetableValidity || "undated_not_current_verified") : null,
            timetableDateVerified: tt._positionSource === "supabase-train-run"
              ? tt._timetableDateVerified === true : null,
            plannedTripId: tt._plannedTripId || timetableIdentity,
            planSource: tt._planSource || "odpt-scheduled-timetable",
            serviceId: tt._serviceId || run.calendar || "",
            sourceRevisionDate: tt._sourceRevisionDate || null,
            operationReferences: operation.references,
            segmentToIndex: segmentToIndex,
            segmentProgress: segmentProgress,
            extrapolated: false,
            trainType: effectivePublishedTrainType || tt['odpt:trainType'] || '',
            trainOwner: _trainOwner,
            assignmentOperator: _assignmentOperator,
            operationEvidence: _assignmentMatches,
            vehicleFormationId: _assignmentFormationIds.length === 1 ? _assignmentFormationIds[0] : '',
            vehicleFormationCandidates: _assignmentFormationIds.slice(),
            vehicleIdentityStatus: vehResult.identityStatus || 'UNKNOWN',
            vehicleIdentityReason: vehResult.identityReason || 'no-vehicle-evidence',
            vehicleCandidates: _visibleCandidates,
            plannedVehicleCandidates: _plannedCandidates.slice(),
            plannedVehicleCandidateStatus: _koseiScoped
              ?"unresolved-mixed-fleet" : _jrwestKyotoKobeScoped
              ?"unresolved-mixed-fleet" : _sotetsuJrScoped
              ?"unresolved-mixed-fleet" : _komiiScoped
              ?(_komiiFleet?"official-service-family-reference":"unresolved-mixed-fleet")
              : _kesennumaFleet
              ?"official-service-family-reference"
              : _kashimaScoped
              ?(_kashimaMixed?"unresolved-mixed-fleet":"official-service-family-reference")
              : (_kamaishiFleet||_joetsuFleet||_kitakamiFleet)
              ? "official-service-family-reference"
              : _runIdentity.plannedVehicleCandidateStatus,
            // 候选图片仅供参考；绝不使用它替代
            // TrainVehicle 解析器验证过的 vehicleIconPath。
            plannedVehicleCandidateArtworkPath: (_komiiScoped||_kesennumaFleet||_kashimaScoped)?""
              : tt._positionSource === 'supabase-train-run'
              ? (tt._sqlCandidateArtworkPath || '') : '',
            plannedVehicleCandidateArtworkStatus: tt._positionSource === 'supabase-train-run'
              ? (tt._sqlCandidateArtworkStatus || '') : '',
            candidateArtworkConfirmedByDatedRule: !!_runIdentity.candidateArtworkConfirmedByDatedRule,
            typeName: trainClassification.typeName,
            isLimitedExpress: trainClassification.isLimitedExpress,
            isThroughTrain: trainClassification.isThroughTrain,
            railDirection: directionName,
            destinationStation: destinationStation,
            destinationStationUrn: destinationStationUrn,
            trainClass: trainClass,
            vehicleType: _vehicleType,
            vehicleIconPath: (_koseiScoped||_jrwestKyotoKobeScoped||_sotetsuJrScoped||_komiiScoped||_kesennumaFleet||_kashimaScoped||_hakushinSpecialFleet||_joetsuFleet||_kamaishiFleet||_kitakamiFleet||_hanawaFleet||_kururiFleet||_mitoFleet||_miyoFleet||_ofunatoFleet||_ofunatoPokemon||_ogaFleet||_oitoEastFleet||_oitoEastUnknown||_oitoWestNoPng)
              ? "" : (vehResult.iconPath || ''),
            vehiclePlan: _publishedVehiclePlan,
            vehicleSource: vehResult.source || '',
            vehicleConfidence: vehResult.confidence || 'none',
            vehicleResolution: vehResult,
            operationArtworkCandidates: Array.isArray(vehResult.operationArtworkCandidates)
              ? vehResult.operationArtworkCandidates.map(function(entry) {
                  return {
                    vehicleType: entry && entry.vehicleType || '',
                    asset: entry && entry.asset || '',
                    sourceUrl: entry && entry.sourceUrl || ''
                  };
                }) : [],
            vehicleResolvedUpstream: vehResult.identityStatus === 'EXACT',
            timetableVehicleType: _timetableVehicleInput
          });
          // Complete scheduled train-to-reference mapping AFTER positional
          // evidence has been determined. The map still cannot call this an
          // actual-day carset; it can show a labelled planned fleet PNG.
          attachPublishedVehiclePlanToEstimate(
            positions[positions.length - 1], run, tt, lineId, line);
        }
      }

      return positions;
    } catch(e) {
      console.debug("[PositionEstimator] estimateLinePositions error for", lineId, ":", e.message);
      return [];
    }
  }

  /**
   * Estimate positions for all lines that don't have realtime data
   * @param {object} allLines - All line objects keyed by lineId
   * @param {object} odptTrains - Raw ODPT train/timetable data keyed by operator
   * @param {object} delayInfo - 按运营商键控的延误信息
   * @param {object} existingPositions - Deprecated input, ignored (realtime merging belongs to DataFusion)
   * @returns {object} Estimated positions keyed by lineId
   */
  // At a published Takao boundary the final ChuoMain train position must
  // expire, but its verified SQL service identity may still be needed when
  // the FIRST ChuoRapid/JR-East.Chuo realtime observation arrives later.
  // These records are identity-only: they are never returned as train
  // positions, may never interpolate a position, and cannot identify stock.
  var _canonicalHandoverEvidence = {};
  function getCanonicalHandoverEvidence() {
    return _canonicalHandoverEvidence;
  }
  function _collectChuoTakaoHandover(lineId, line, timetables, allLines) {
    if (lineId !== "ChuoMain" && lineId !== "ChuoRapid") return [];
    if (!line || !Array.isArray(line.stations)) return [];
    var layout = getEstimatorStationLayout(lineId, line);
    var projection = sourceRouteProjection(lineId, layout.workLine, layout.stationIndexMap, allLines);
    var now = getCurrentMinutes(), serviceDate = getTokyoServiceDate();
    var calendar = getCurrentCalendars(), evidence = [], seen = {};
    (timetables || []).forEach(function(tt) {
      if (!tt || tt._positionSource !== "supabase-train-run" ||
          tt._sqlLineId !== lineId ||
          tt._serviceDate && tt._serviceDate !== serviceDate ||
          tt._canonicalGroupEvidence !== "verified_continuation" ||
          !tt._canonicalTrainTimetableId ||
          !Array.isArray(tt._canonicalLineIds) ||
          tt._canonicalLineIds.indexOf("ChuoMain") < 0 ||
          tt._canonicalLineIds.indexOf("ChuoRapid") < 0 ||
          !Array.isArray(tt._canonicalTrainNumberAliases) ||
          !tt._canonicalTrainNumberAliases.length) return;
      var run = compileTrainRun(tt, lineId, layout.workLine, layout.stationIndexMap, projection);
      if (!run || !run.trainNumber || !run.railDirection ||
          !run.calendar || calendar.indexOf(run.calendar) < 0) return;
      var takao = run.stops.filter(function(stop) {
        return normalizeStationKey(extractStationKey(stop.stationUrn)) === "takao";
      });
      if (takao.length !== 1) return;
      var minute = takao[0].arrivalMinute == null
        ? takao[0].departureMinute : takao[0].arrivalMinute;
      // A bounded 90-minute window from the published Takao passage covers
      // the first later live snapshot, but does not claim the scheduled
      // train is still at Takao or shift it to another station.
      if (minute == null || now < minute - 20 || now > minute + 90) return;
      var id = String(tt._canonicalTrainTimetableId);
      var chain = run.timetableIdentity;
      if (!/^canonical-sql-trip:/.test(chain) || seen[id]) return;
      seen[id] = true;
      evidence.push({
        runningChainId:chain, timetableIdentity:chain,
        canonicalTimetableId:id, canonicalGroupEvidence:"verified_continuation",
        canonicalLineIds:tt._canonicalLineIds.slice(),
        canonicalTrainNumberAliases:tt._canonicalTrainNumberAliases.slice(),
        // The canonical SQL source supplies the full published itinerary.
        // compileTrainRun intentionally clips POSITION at a local terminal;
        // the identity handover must not lose the opposite-side stop keys.
        canonicalStopKeys:(tt["odpt:trainTimetableObject"] || []).map(function(stop) {
          return extractStationKey(stop && (stop["odpt:departureStation"] ||
            stop["odpt:arrivalStation"] || stop["odpt:station"]));
        }).filter(Boolean),
        serviceDate:serviceDate, trainNumber:run.trainNumber,
        trainType:run.trainType, railDirection:run.railDirection,
        destinationStation:run.destinationStation,
        sourceRailway:String(tt["odpt:railway"] || ""),
        positionSource:"supabase-train-run", estimated:true,
        handoverEvidenceOnly:true, handoverBoundaryStation:"Takao",
        handoverBoundaryMinute:minute
      });
    });
    return evidence;
  }

  function estimateAllPositions(allLines, odptTrains, delayInfo, existingPositions, options) {
    try {
      options = options || {};
      var estimated = {};
      _canonicalHandoverEvidence = {};
      var requested = Array.isArray(options.lineIds) ? options.lineIds : null;
      var lineIds = requested ? requested.filter(function(id) { return !!(allLines && allLines[id]); }) : Object.keys(allLines || {});

      // Cache the expensive operator/railway timetable index across polls.
      // ODPT timetable arrays are long-lived and only grow when lazy loads merge
      // new rows, so an operator:length stamp plus manual registry version is a
      // safe invalidation key for this read-only grouping index.
      var _src = odptTrains || {};
      var _stampParts = [];
      var _sourceArrays = {};
      var _sameArrays = true;
      Object.keys(_src).sort().forEach(function(op) {
        var rows = _src[op];
        _stampParts.push(op + ":" + (Array.isArray(rows) ? rows.length : 0));
        _sourceArrays[op] = rows;
        if (_timetableIndexCache.arrays[op] !== rows) _sameArrays = false;
      });
      var _stamp = _stampParts.join("|");
      var _reuseIndex = _timetableIndexCache.source === _src &&
        _timetableIndexCache.stamp === _stamp && _sameArrays &&
        _timetableIndexCache.builtManualVersion === _manualRegistryVersion;
      var timetableIndex = _reuseIndex ? _timetableIndexCache.index : {};
      if (!_reuseIndex) {
        Object.keys(_src).forEach(function(op) {
          var data = _src[op];
          if (!Array.isArray(data) || data.length === 0) return;
          var first = data[0];
          if (!(first && first["odpt:trainTimetableObject"])) return;
          var idx = {};
          for (var ti = 0; ti < data.length; ti++) {
            var _tt = data[ti];
            if (!_tt) continue;
            var rk = extractRailwayKey(_tt["odpt:railway"]) || "_";
            (idx[rk] = idx[rk] || []).push(_tt);
          }
          timetableIndex[op] = idx;
        });
        Object.keys(_manualTimetableRegistry).forEach(function(lineId) {
          var m = _manualTimetableRegistry[lineId];
          if (!Array.isArray(m) || m.length === 0) return;
          m.forEach(function(tt) {
            if (!tt || !tt["odpt:railway"]) return;
            try {
              if (tt._positionSource === 'supabase-train-run' && tt._sqlLineId === lineId && allLines[lineId]) {
                var sqlOp = _normalizeTimetableOperator(allLines[lineId].operator);
                var sqlIndex = timetableIndex[sqlOp] = timetableIndex[sqlOp] || {};
                (sqlIndex[lineId] = sqlIndex[lineId] || []).push(tt);
                return;
              }
              // A Supabase run retains its original provenance. Rewriting
              // it as a manual timetable silently changes vehicle evidence
              // policy and hides the SQL read-through source in diagnostics.
              if (!tt._positionSource) tt._positionSource = "station-timetable";
              var _rp = String(tt["odpt:railway"]).split(":");
              var _dot = _rp[1] ? _rp[1].split(".") : [];
              if (_dot.length < 2) return;
              var _op = _dot.slice(0, -1).join(".");
              var _rk = _dot[_dot.length - 1];
              if (!_op || !_rk) return;
              (timetableIndex[_op] = timetableIndex[_op] || {});
              (timetableIndex[_op][_rk] = timetableIndex[_op][_rk] || []).push(tt);
            } catch (e) {}
          });
        });
        _timetableIndexCache = {
          source: _src,
          stamp: _stamp,
          arrays: _sourceArrays,
          manualVersion: _manualRegistryVersion,
          builtManualVersion: _manualRegistryVersion,
          index: timetableIndex
        };
      }

      if (Object.keys(timetableIndex).length === 0) return estimated;

      function _normalizeTimetableOperator(op) {
        var v = op || "";
        if (window.TransitConstants && typeof window.TransitConstants.normalizeOp === "function") v = window.TransitConstants.normalizeOp(v);
        var aliases = { "Rinkai": "TWR", "TsukubaExpress": "MIR" };
        return aliases[v] || v;
      }
      function _lineTimetables(lid) {
        var ln = allLines[lid]; if (!ln || !ln.operator) return [];
        var oid = _normalizeTimetableOperator(ln.operator);
        var ri = timetableIndex[oid] || {};
        var keys = {}, rwc = window.ODPTClient && window.ODPTClient.LINE_RAILWAY_CODE;
        if (ri[lid]) keys[lid] = true;
        if (rwc && rwc[lid] && ri[rwc[lid]]) keys[rwc[lid]] = true;
        var out = []; Object.keys(keys).forEach(function(k){ out = out.concat(ri[k]); });
        return out;
      }
      function _directChainCandidates(lid) {
        var out = [];
        if (!window.RunningChainResolver || typeof window.RunningChainResolver.getDirectThroughLines !== "function") return out;
        (window.RunningChainResolver.getDirectThroughLines(lid) || []).forEach(function(pid){
          _lineTimetables(pid).forEach(function(tt){ out.push({lineId:pid,timetable:tt}); });
        });
        return out;
      }

      // Process each line
      for (var i = 0; i < lineIds.length; i++) {
        var lineId = lineIds[i];
        var line = allLines[lineId];

        // 不再跳过有实时位置的线路——中距离线路实时数据只覆盖一部分区间，
        // 需要用推定补全缺失区间的列车（合并时去重）
        if (!line || !line.operator) continue;

        // Normalize operator ID
        var opId = line.operator;
        if (window.TransitConstants && typeof window.TransitConstants.normalizeOp === "function") {
          opId = window.TransitConstants.normalizeOp(opId);
        }
        // ODPT 运营商别名——时刻表池按 ODPT_ENDPOINTS 键组织（api.odpt.org 的 TWR/MIR），
        // 而本地 line.operator 用独立键（Rinkai/TsukubaExpress）→ timetableIndex[opId] 取不到 → 推定空白。
        // 实测 ODPT：odpt:TrainTimetable?operator=TWR = 564 条全为 TWR.Rinkai；MIR = 841 条全为 MIR.TsukubaExpress。
        // 别名仅作用于"取时刻表池"这一处，不影响 LOS 分组/图标/延误（那些仍用 line.operator 原键）。
        var TT_OP_ALIAS = { "Rinkai": "TWR", "TsukubaExpress": "MIR" };
        if (TT_OP_ALIAS[opId]) opId = TT_OP_ALIAS[opId];

        // One scoped lookup serves positioning and through-chain evidence.
        var lineTimetable = _lineTimetables(lineId);
        if (lineTimetable.length === 0) continue;
        if (lineId === "ChuoMain" || lineId === "ChuoRapid") {
          _canonicalHandoverEvidence[lineId] =
            _collectChuoTakaoHandover(lineId, line, lineTimetable, allLines);
        }

        var positions = estimateLinePositions(lineId, line, lineTimetable, delayInfo, opId, allLines);
        if (positions.length > 0 && window.RunningChainResolver && typeof window.RunningChainResolver.resolveTimetableChain === "function") {
          // Seed with direct neighbours, then add their direct neighbours as
          // candidate segments only. The resolver still validates every edge
          // against a canonical direct boundary before graph composition.
          var chainCandidates = _directChainCandidates(lineId);
          var candidateLines = {};
          chainCandidates.forEach(function(x){ candidateLines[x.lineId] = true; });
          Object.keys(candidateLines).forEach(function(mid) {
            _directChainCandidates(mid).forEach(function(x) {
              if (x.lineId !== lineId) chainCandidates.push(x);
            });
          });
          if (chainCandidates.length > 0) {
            var byIdentity = {};
            lineTimetable.forEach(function(tt) {
              var n = tt["odpt:trainNumber"] || tt["odpt:train"] || "";
              var tid = tt["@id"] || tt["owl:sameAs"] || ((tt["odpt:railway"] || lineId || "") + "|" + String(n));
              byIdentity[String(tid)] = tt;
            });
            positions.forEach(function(pos) {
              var sourceTT = byIdentity[String(pos.timetableIdentity || "")];
              if (!sourceTT) return;
              var resolved = window.RunningChainResolver.resolveTimetableChain(sourceTT, lineId, chainCandidates);
              if (resolved && resolved.runningChainId) {
                pos.runningChainId = resolved.runningChainId;
                pos.runningChainEvidence = resolved.evidence || "TIMETABLE_SEGMENT";
                if (resolved.partnerLineId) pos.runningChainPartnerLineId = resolved.partnerLineId;
                if (resolved.timeGapMin !== undefined) pos.runningChainTimeGapMin = resolved.timeGapMin;
                // Chain propagation may only start from the position's already-resolved
                // EXACT identity. Never re-promote a raw timetable vehicleType here:
                // doing so would bypass TrainVehicle's evidence decision.
                var explicitVehicle = (pos.vehicleIdentityStatus === 'EXACT')
                  ? String(pos.trainClass || pos.vehicleType || '').trim() : '';
                if (explicitVehicle && window.TrainVehicle &&
                    typeof window.TrainVehicle.registerFormationEvidence === 'function') {
                  window.TrainVehicle.registerFormationEvidence({
                    lineId: lineId,
                    runningChainId: resolved.runningChainId,
                    vehicleType: explicitVehicle,
                    serviceDate: pos.serviceDate,
                    evidenceSource: pos.vehicleSource || sourceTT._vehicleEvidenceSource || 'resolved-exact-vehicle',
                    evidenceDetail: sourceTT._vehicleEvidence || null
                  });
                  var chainVehicle = window.TrainVehicle.resolveFormationEvidence({
                    lineId: lineId,
                    runningChainId: resolved.runningChainId,
                    serviceDate: pos.serviceDate
                  });
                  if (chainVehicle) {
                    // resolveFormationEvidence already returns a canonical EXACT
                    // TrainVehicle resolution. Preserve its structural provenance;
                    // never disguise running-chain formation evidence as timetable.
                    pos.trainClass = chainVehicle.vehicleName || '';
                    pos.vehicleType = chainVehicle.vehicleName || '';
                    pos.vehicleIconPath = chainVehicle.iconPath || '';
                    pos.vehicleSource = chainVehicle.source || 'formation-evidence';
                    pos.vehicleConfidence = chainVehicle.confidence || 'high';
                    pos.vehicleResolution = chainVehicle;
                    pos.vehicleIdentityStatus = chainVehicle.identityStatus || 'UNKNOWN';
                    pos.vehicleIdentityReason = chainVehicle.identityReason || 'no-vehicle-evidence';
                    pos.vehicleResolvedUpstream = chainVehicle.identityStatus === 'EXACT';
                    pos.vehicleFormationId = chainVehicle.formationId || pos.vehicleFormationId || '';
                    pos.vehicleEvidenceSource = chainVehicle.evidenceSource || sourceTT._vehicleEvidenceSource || 'running-chain-vehicle';
                    pos.vehicleEvidence = chainVehicle.evidenceDetail || sourceTT._vehicleEvidence || null;
                  }
                }
              }
            });
          }
        }
        // A database-confirmed continuation has an authoritative train ID.
        // Do not let availability of neighbouring line pages change that ID.
        // Scope fixed canonical identity to verified member-line combinations.
        // No timetable-only source can claim another line's physical train.
        if(["Joban","JobanMain","ChuoRapid","Ome","ChuoMain",
            "ShonanShinjuku","Tokaido","Takasaki","UtsunomiyaJR"].indexOf(lineId)>=0) {
          positions.forEach(function(pos) {
            var memberLines=Array.isArray(pos.canonicalLineIds)?pos.canonicalLineIds:[];
            var verifiedCorridor=
              (memberLines.indexOf("Joban")>=0&&memberLines.indexOf("JobanMain")>=0)||
              (memberLines.indexOf("ChuoRapid")>=0&&memberLines.indexOf("Ome")>=0)||
              (memberLines.indexOf("ChuoRapid")>=0&&memberLines.indexOf("ChuoMain")>=0)||
              (memberLines.indexOf("ShonanShinjuku")>=0&&
                ["Tokaido","Takasaki","UtsunomiyaJR"].some(function(other){
                  return memberLines.indexOf(other)>=0;
                }));
            if(verifiedCorridor&&pos.canonicalGroupEvidence==="verified_continuation" &&
               pos.canonicalTimetableId &&
               /^canonical-sql-trip:/.test(String(pos.timetableIdentity||""))) {
              pos.runningChainId=pos.timetableIdentity;
              pos.runningChainEvidence="VERIFIED_SQL_CANONICAL";
            }
          });
        }
        if (positions.length > 0) {
          // This layer returns timetable-derived positions ONLY. Realtime
          // source records are owned by DataFusion, which performs the single
          // merge after resolving each train's physical running chain. Mixing
          // existing realtime rows here created two identities for one train.
          estimated[lineId] = positions;
        }
      }

      return estimated;
    } catch(e) {
      console.debug("[PositionEstimator] estimateAllPositions error:", e.message);
      return {};
    }
  }

  // ========== Public API ==========
  window.TrainPositionEstimator = {
    version: ESTIMATOR_VERSION,
    estimateLinePositions: estimateLinePositions,
    getCanonicalHandoverEvidence: getCanonicalHandoverEvidence,
    estimateAllPositions: estimateAllPositions,
    registerManualTimetable: registerManualTimetable,
    getRegisteredManualLineIds: function() { return Object.keys(_manualTimetableRegistry); },
    getRegisteredManualTimetable: function(lineId) { return _manualTimetableRegistry[lineId] || null; },
    getCurrentCalendar: getCurrentCalendar,
    getCurrentCalendars: getCurrentCalendars,
    getCalendarsForDate: getCalendarsForDate,
    getWallClockCalendars: getWallClockCalendars,
    getCurrentMinutes: getCurrentMinutes,
    getCurrentServiceDate: getTokyoServiceDate,
    normalizeStationKey: normalizeStationKey,
    isLimitedExpress: isLimitedExpress
  };

  console.debug("[PositionEstimator] v" + ESTIMATOR_VERSION + " initialized");
})();
