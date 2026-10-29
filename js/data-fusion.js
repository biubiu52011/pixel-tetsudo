/*
 * Pixel Tetsudo - DataFusion（位置支持）
 */
(function() {
  function _normalizeOperator(value, stringify) {
    var normalized = window.TransitConstants && typeof window.TransitConstants.normalizeOp === "function"
      ? window.TransitConstants.normalizeOp(value) : value;
    return stringify ? String(normalized) : normalized;
  }
  function _directThroughLines(lineId) {
    var resolver = window.RunningChainResolver;
    return resolver && typeof resolver.getDirectThroughLines === "function"
      ? resolver.getDirectThroughLines(lineId) || [] : [];
  }

  "use strict";

  var FUSION_VERSION = 15;
  // 实时轮询间隔 — 见 runtime-config.js REFRESH_INTERVAL
  // 位置轮询间隔 — 见 runtime-config.js POSITION_INTERVAL

  var odptData = { trains: {}, delayInfo: {}, realtimePositions: {} };
  function _positionIdentity(p) { return p && (p.runningChainId || p.trainId) || ""; }
  // 有来源的 from/to 区间在有文档依据的服务边界内拥有位置。
  // 仅有终点不得将列车转移到合作线路。
  function _resolveRealtimeHandover(record, target, lines) {
    if (!record || !target || !target.line) return null;
    var corridorLines = ((typeof window !== "undefined" && window.RuntimeConfig) || {}).SERVICE_CORRIDOR_LINES || {};
    if (corridorLines[target.lid]) return null;
    function key(v) { return String(v || '').split('.').pop().replace(/[-_\s]/g,'').toLowerCase(); }
    function index(line, station) {
      var list=line && line.stations || [], n=key(station);
      for(var i=0;i<list.length;i++)if(key(list[i])===n)return i;
      return -1;
    }
    var from=record['odpt:fromStation'], to=record['odpt:toStation'];
    if (!from || !to || key(from)===key(to) || index(target.line,to)>=0) return null;
    var matches=[];
    (target.line.serviceBoundaries || []).forEach(function(boundary) {
      if (corridorLines[boundary.lineId]) return;
      var partner=lines[boundary.lineId];
      if (!partner || partner.operator!==target.line.operator) return;
      if (!(boundary.handoverStations || []).some(function(station){return key(station)===key(from);})) return;
      var fromIndex=index(partner,from), toIndex=index(partner,to);
      // 必须同时具备唯一相邻物理区间和已公布的交接车站；
      // 跳过或未知车站不足以构成证据。
      if(fromIndex<0 || toIndex<0 || Math.abs(fromIndex-toIndex)!==1)return;
      matches.push({target:{lid:boundary.lineId,idx:fromIndex,line:partner},toIndex:toIndex});
    });
    return matches.length===1?matches[0]:null;
  }

  function _realtimeSourceIdentity(record, operator, railway) {
    var explicit = record['owl:sameAs'] || record['odpt:train'];
    if (explicit) return String(explicit);
    var number = String(record['odpt:trainNumber'] || '');
    if (!number) return String(record['@id'] || '');
    return ['realtime', operator, railway, number, record['odpt:railDirection'] || ''].join('::');
  }

  function _destinationStationValues(record) {
    if (!record) return [];
    var raw = record['odpt:destinationStation'];
    if (raw == null || raw === '') raw = record.destinationStation;
    if (raw == null || raw === '') raw = record.destination_station;
    if (raw == null || raw === '') raw = record.destinationStationUrn;
    if (raw == null || raw === '') raw = record.destination_station_urn;
    // GTFS-RT TripUpdate 的可信终点有时只保留在 odpt:toStation；
    // 仅当该记录已经带有 TripUpdate 时间戳时才允许回退，避免把
    // VehiclePosition 的当前区间下一站误当成列车终点。
    if ((raw == null || raw === '') && record['gtfs:tripUpdateTimestamp']) {
      raw = record['odpt:toStation'];
    }
    var values = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    return values.map(function(value) {
      if (value && typeof value === 'object') {
        value = value.station_urn || value.station_key || value.urn || value.id || value['@id'] || '';
      }
      return value == null ? '' : String(value);
    }).filter(function(value) { return !!value; });
  }

  function _destinationStationKey(record) {
    var values = _destinationStationValues(record);
    return values.length ? values[0].split('.').pop() : '';
  }

  // 有证据支持的车型身份遵循实体运行链，而不是
  // 当前渲染线路。不得用地图/车队/图标
  // 估算结果初始化该注册表。只有已经是 EXACT 的车型身份才能进入运行链
  // 注册表；置信度/来源标签本身不能制造车型身份。
  var _chainVehicleRegistry = {};
  // 在短暂来源中断期间保留已确认的实时证据。位置
  // 事实仍来自当前快照；此桥接只在时刻表回退接管期间保留
  // 实体列车身份/车型证据。
  var _CHAIN_EVIDENCE_TTL_MS = 3 * 60 * 1000;
  function _vehicleEvidenceRank(p) {
    if (!p) return 0;
    var r = p.vehicleResolution || null;
    var sources = r && Array.isArray(r.sources) ? r.sources : [];
    var src = p.vehicleSource || (r && r.source) || "";
    if (sources.indexOf("official-realtime-car-number") >= 0 || sources.indexOf("roster-physical-id") >= 0) return 5;
    if (p.vehicleResolvedFromRealtime === true || sources.indexOf("realtime") >= 0 || src === "realtime") return 5;
    if (p.vehicleResolvedFromRealtimeDerived === true || sources.indexOf("realtime-derived") >= 0 || src === "realtime-derived") return 4;
    if (sources.indexOf("structural") >= 0 || src === "structural" || src === "formation-evidence") return 3;
    if (sources.indexOf("operation-assignment-provider") >= 0 || sources.indexOf("odpt") >= 0 ||
        sources.indexOf("timetable") >= 0 || src === "operation-assignment-provider" || src === "odpt" || src === "timetable") return 2;
    if (sources.indexOf("manual") >= 0 || src === "manual") return 1;
    return 0;
  }
  function _projectVehicleResolution(p, resolution, inherited) {
    if (!p) return p;
    var r = resolution || null;
    p.vehicleResolution = r;
    p.vehicleResolutionLineId = r && r.lineId || p.lineId || '';
    p.vehiclePlan = r && r.vehiclePlan || null;
    p.trainClass = r && r.identityStatus === "EXACT" ? (r.name || "") : "";
    p.vehicleType = r && r.identityStatus === "EXACT" ? (r.vehicleTypeStr || r.name || "") : "";
    p.vehicleSource = r ? (r.source || "") : "";
    p.vehicleConfidence = r ? (r.confidence || "none") : "none";
    p.vehicleIdentityStatus = r ? (r.identityStatus || "UNKNOWN") : "UNKNOWN";
    p.vehicleIdentityReason = r ? (r.identityReason || "") : "no-vehicle-evidence";
    p.vehicleIconPath = r && r.identityStatus === "EXACT" ? (r.iconPath || "") : "";
    // 保留运用号库的候选 PNG 作为独立展示元数据。候选不改变
    // identityStatus，也不进入 vehicleType；它只是让渲染层能显示
    // “已缩小范围、仍待实体车号确认”的代表图，而不是退回灰点。
    p.operationArtworkCandidates = r && Array.isArray(r.operationArtworkCandidates)
      ? r.operationArtworkCandidates.map(function(entry) {
          return {
            vehicleType: entry && entry.vehicleType || "",
            asset: entry && entry.asset || "",
            sourceUrl: entry && entry.sourceUrl || ""
          };
        }) : [];
    var _sources = r && Array.isArray(r.sources) ? r.sources : [];
    p.vehicleResolvedFromRealtime = !!(r && r.identityStatus === "EXACT" &&
      (_sources.indexOf("realtime") >= 0 || _sources.indexOf("official-realtime-car-number") >= 0 ||
       _sources.indexOf("roster-physical-id") >= 0 || r.source === "realtime"));
    p.vehicleResolvedFromRealtimeDerived = !!(r && r.identityStatus === "EXACT" &&
      (_sources.indexOf("realtime-derived") >= 0 || r.source === "realtime-derived"));
    p.vehicleResolvedUpstream = !!(r && r.identityStatus === "EXACT");
    p.vehicleInheritedFromRunningChain = inherited === true;
    return p;
  }
  // 只有带日期且具有决定性的列车/运用观测才能为高优先级实时车型
  // 增加实体编成。仅有运用编号
  // 从来不是编成证据。
  function _confirmedFormationEvidence(p) {
    if (!p || !p.serviceDate || p.vehicleIdentityStatus !== "EXACT") return null;
    var ids = Array.isArray(p.vehicleFormationCandidates)
      ? p.vehicleFormationCandidates.map(function(x){return String(x || "").trim();}).filter(Boolean)
      : [];
    var fid = String(p.vehicleFormationId || "").trim();
    if (!ids.length && fid) ids = [fid];
    if (!ids.length || (fid && (ids.length !== 1 || ids[0] !== fid))) return null;
    var matches = (p.operationEvidence || []).filter(function(e) {
      if (!e || e.decisive !== true || !e.sourceUrl || !e.formationId) return false;
      if (String(e.observedDate || "").slice(0,10) !== String(p.serviceDate).slice(0,10)) return false;
      var form = String(e.formationId).split(/\s*\/\s*|\s*,\s*|\s*\|\s*/).map(function(v){return v.trim();}).filter(Boolean);
      return form.length === ids.length && form.every(function(v){return ids.indexOf(v) >= 0;});
    });
    return matches.length === 1 ? matches[0] : null;
  }

  // 时刻表接续证明服务连续性，不证明编成未发生变化。
  // 编成观测必须保留在其来源铁路和已公布车次下；
  // 未知区间不能通过分拆/合并继承完整编成。
  function _formationSegmentKey(p) {
    var railway = String(p && p.sourceRailway || "").split(".").pop();
    var number = String(p && p.trainNumber || "").trim();
    return railway && number ? railway + "|" + number + "|" +
      String(p.positionLineId || railway) : "";
  }

  function _rememberChainVehicle(p) {
    if (!p || !p.runningChainId) return;
    var resolution = p.vehicleResolution || null;
    // 注册表存储 canonical 决策对象，而不是第二份可变的
    // 投影车型字段副本。
    if (!resolution || resolution.identityStatus !== "EXACT" || !resolution.name) return;
    var _incomingRank = _vehicleEvidenceRank(p);
    var _existing = _chainVehicleRegistry[p.runningChainId];
    if (_existing) {
      var _existingRank = _existing.evidenceRank || 0;
      var _existingName = _existing.resolution && _existing.resolution.name || "";
      var _sameVehicle = _existingName && _existingName === resolution.name;
      if (!_sameVehicle && _existingRank >= _incomingRank) {
        _existing.lastSeenAt = Date.now();
        return;
      }
    }
    var proof = _confirmedFormationEvidence(p);
    // 最新实时行确认相同车型但缺少编成字段时，
    // 保留带日期且有来源支持的编成。
    if (!proof && !p.vehicleFormationConflict && _existing && _existing.formationProof &&
        _existing.evidenceServiceDate === p.serviceDate &&
        _formationSegmentKey(p) && _existing.formationSegmentKey === _formationSegmentKey(p) &&
        _existing.resolution && _existing.resolution.name === resolution.name) {
      proof = _existing.formationProof;
      p.vehicleFormationId = _existing.formationId;
      p.vehicleFormationCandidates = _existing.formationCandidates.slice();
      p.operationEvidence = (p.operationEvidence || []).concat([proof]);
    }
    _chainVehicleRegistry[p.runningChainId] = {
      resolution: resolution,
      formationId: proof ? (p.vehicleFormationId || "") : "",
      formationCandidates: proof ? (p.vehicleFormationCandidates || []).slice() : [],
      formationProof: proof,
      formationSegmentKey: _formationSegmentKey(p),
      evidenceServiceDate: p.serviceDate || "",
      evidenceRank: _incomingRank,
      lastSeenAt: Date.now()
    };
  }
  function _inheritChainVehicle(p) {
    if (!p || !p.runningChainId || p.vehicleEvidenceConflict) return p;
    var v = _chainVehicleRegistry[p.runningChainId];
    if (!v) return p;
    if (v.lastSeenAt && (Date.now() - v.lastSeenAt) > _CHAIN_EVIDENCE_TTL_MS) {
      delete _chainVehicleRegistry[p.runningChainId];
      return p;
    }
    // 不得在来源中断期间传播前一服务日的编成。
    if (v.evidenceServiceDate && p.serviceDate !== v.evidenceServiceDate) return p;
    if (p.vehicleFormationConflict) return p;
    // 不得将不兼容的合作线路时刻表标签继承为 EXACT
    // 车型。临海 70/71 候选不得变成通用 JR E233 PNG。
    // 只有具体的实时车型观测可以覆盖过期的
    // 时刻表候选列表。
    var _allowedCandidates = Array.isArray(p.vehicleCandidates) ? p.vehicleCandidates : [];
    if (_allowedCandidates.length && v.resolution && v.resolution.name &&
        _allowedCandidates.indexOf(v.resolution.name) < 0 &&
        (v.evidenceRank || 0) < 5) return p;
    var currentResolution = p.vehicleResolution || null;
    var sameExact = currentResolution && currentResolution.identityStatus === "EXACT" &&
      v.resolution && currentResolution.name === v.resolution.name;
    var sameFormationSegment = _formationSegmentKey(p) &&
      v.formationSegmentKey === _formationSegmentKey(p);
    if (sameExact && sameFormationSegment && v.formationProof && !p.vehicleFormationId) {
      p.vehicleFormationId = v.formationId || "";
      p.vehicleFormationCandidates = (v.formationCandidates || []).slice();
      p.operationEvidence = (p.operationEvidence || []).concat([v.formationProof]);
      return p; // Preserve the stronger realtime identity and its PNG.
    }
    if (currentResolution && currentResolution.identityStatus === "EXACT" &&
        _vehicleEvidenceRank(p) >= (v.evidenceRank || 0)) return p;
    _projectVehicleResolution(p, v.resolution, true);
    if (sameFormationSegment && !p.vehicleFormationId && v.formationProof) {
      p.vehicleFormationId = v.formationId || "";
      p.vehicleFormationCandidates = (v.formationCandidates || []).slice();
      p.operationEvidence = (p.operationEvidence || []).concat([v.formationProof]);
    }
    return p;
  }
  // 实时 Provider 有时会在其他字段新鲜的位置快照中省略车型字段。
  // 在短暂缺失窗口内，针对相同 ODPT 列车
  // 来源对象、铁路、车次和服务日复用已解析车型；
  // 位置和延误数据始终来自新的来源快照。
  // 这是现有运行链注册表中的范围别名，不是第二套车型
  // 查询，也不是运营商范围的车队假设。
  function _realtimeVehicleSourceKey(p) {
    if (!p || p.positionSource !== "realtime-api" || !p.serviceDate ||
        !p.sourceRailway || !p.trainId || !p.trainNumber) return "";
    return "realtime-source:" + [p.serviceDate,p.sourceRailway,p.trainId,p.trainNumber]
      .map(function(s) { return encodeURIComponent(String(s)); }).join("|");
  }
  function _preserveRealtimeSourceVehicle(p, explicitVehicleType) {
    var key = _realtimeVehicleSourceKey(p);
    if (!key) return p;
    // 不得将别名赋值为 runningChainId：原始身份解析器
    // 仍负责实体直通和重复抑制。
    var proxy = Object.assign({}, p, { runningChainId: key });
    var r = p.vehicleResolution || null;
    if (r && r.identityStatus === "EXACT" && r.name) {
      var prior = _chainVehicleRegistry[key];
      // 新确认的 EXACT 车型优先于较旧的来源观测。
      // 普通运行链冲突规则仍可能保护其他证据。
      if (prior && prior.resolution && prior.resolution.name !== r.name) {
        delete _chainVehicleRegistry[key];
      }
      _rememberChainVehicle(proxy);
    } else if (!String(explicitVehicleType || "").trim()) {
      // 缺失车型字段不是车队变化证据，但
      // 相互矛盾的新候选集合不得继承之前的车型。
      var priorVehicle = _chainVehicleRegistry[key];
      var allowed = Array.isArray(p.vehicleCandidates) ? p.vehicleCandidates : [];
      if (allowed.length && priorVehicle && priorVehicle.resolution &&
          allowed.indexOf(priorVehicle.resolution.name) < 0) return p;
      _inheritChainVehicle(proxy);
      if (proxy.vehicleInheritedFromRunningChain === true &&
          proxy.vehicleIdentityStatus === "EXACT") {
        _projectVehicleResolution(p, proxy.vehicleResolution, true);
      }
    }
    return p;
  }

  var subscribers = [];
  var _lastFusedData = null;
  var _lineControlVersion = null;
  var _positionTimer = null;
  var _positionServiceDate = Object.create(null);
  var _positionLoadedAt = Object.create(null);
  // 同一原始位置快照可能在短时间内通过实时推送、
  // 路由激活和融合轮询路径重复到达。
  // 保持正常的 15 秒估算节奏，但不要对相同的
  // 运营商数组重复解析。
  var _lastPositionSourceRefs = Object.create(null);
  var _lastPositionLoadAt = 0;
  var _initialized = false;
  var _cacheTimer = null;
  // (E1): 融合/缓存轮询间隔（init 时从 RuntimeConfig 读取，回前台恢复时复用）
  var _refreshIntervalMs = 15000;

  // 用于运行时诊断的轻量滚动性能遥测。只保留
  // 最近样本，避免监控本身造成内存/日志问题。
  var _perfSamples = [];
  var _lastEstimationMinute = -1;
  var _lastFusionEmitAt = 0;
  var _resumeFallbackTimer = null;
  // 缓存每个运营商的运行情报签名。updateOdptData 每次轮询都会收到新的
  // payload 对象；同时序列化前后两个
  // payload 会在数据未变化时使同步工作翻倍。
  var _delayInfoSignatures = {};
  var _resolutionLineIdsSource = null;
  var _resolutionLineIds = [];
  var _lastCacheSavedFusionAt = 0;
  var _minuteEstimationGeneration = 0;

  function _getResolutionLineIds() {
    var src = window.UNIFIED_LINES || {};
    if (_resolutionLineIdsSource !== src) {
      _resolutionLineIdsSource = src;
      _resolutionLineIds = Object.keys(src);
    }
    return _resolutionLineIds;
  }
  function _perfNow() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function _perfRecord(name, startedAt, meta) {
    var ms = Math.round((_perfNow() - startedAt) * 10) / 10;
    _perfSamples.push({ name: name, ms: ms, at: Date.now(), meta: meta || null });
    if (_perfSamples.length > 40) _perfSamples.splice(0, _perfSamples.length - 40);
    if (ms >= 200 && window.console && console.warn) console.warn("[PixelPerf]", name, ms + "ms", meta || "");
    return ms;
  }

  // ========== 融合轮询生命周期（E1: visibilitychange 暂停/恢复） ==========
  // 后台标签页暂停 15s fuseAll + saveToCache；回前台立即融合一次再恢复周期——
  // 后台页不再产生计算与 IDB 写入开销（配合 odpt-unified 的拉取暂停双管齐下）。
  function startFusionPolling() {
    if (_cacheTimer) return;
    // 仅 SQL 线路没有 Train API 轮询来推进分钟时钟。
    // 复用现有计时器；根据墙上时间重新计算，不重放路径。
    // 本地 tick 在现有十分钟缓存过期前复用 SQL。
    if (!_positionTimer) _positionTimer = setInterval(function() {
      if (document.hidden || (window.location.pathname || "").indexOf("trains.html") < 0) return;
      var lid = (window.location.hash || "").replace(/^#/, "");
      if (!lid) return;
      var estimator = window.TrainPositionEstimator;
      var date = estimator && estimator.getCurrentServiceDate ? estimator.getCurrentServiceDate() : "";
      var ids = window.TrainsActivePositionLineIds || window.TrainsActiveSystemLineIds || [lid];
      ids.forEach(function(id) {
        // 只有 SQL 成功后才标记日期；临时错误在下一分钟重试。
        var needsSqlPlan = !!(window.ODPTClient && window.ODPTClient.usesSqlTimetable &&
          window.ODPTClient.usesSqlTimetable(id));
        if (date && needsSqlPlan && (_positionServiceDate[id] !== date ||
            Date.now() - (_positionLoadedAt[id] || 0) >= 600000)) {
          ensureTimetable(id).catch(function() {});
        }
      });
      loadTrainPositions();
    }, 15000);

    // 融合由来源驱动：ODPT 更新和 SQL 时刻表完成
    // 使用脏融合；初始化和显式刷新仍使用 fuseAll()。
    // 第二个
    // 无条件 15 秒融合循环会发出相同快照，并迫使
    // realtime.html 在 30 秒网络轮询之间重建完整线路列表。
    _cacheTimer = setInterval(function() { try { saveToCache(); } catch(e) {} }, _refreshIntervalMs);
  }
  function stopFusionPolling() {
    if (_positionTimer) { clearInterval(_positionTimer); _positionTimer = null; }
    if (_cacheTimer) { clearInterval(_cacheTimer); _cacheTimer = null; }
  }

  function scheduleResumeFallback(source) {
    var resumedAt = Date.now();
    if (_resumeFallbackTimer) clearTimeout(_resumeFallbackTimer);
    _resumeFallbackTimer = setTimeout(function() {
      _resumeFallbackTimer = null;
      if (_lastFusionEmitAt < resumedAt) {
        try { loadTrainPositions(); } catch(e) {
          console.debug("[DataFusion] " + source + " fallback->positions error:", e.message);
        }
      }
    }, 1500);
  }

  function getRealtimePositionPolicy(lineId) {
    try {
      var cfg = window.RuntimeConfig || {};
      var model = cfg.REALTIME_POSITION_POLICY || {};
      var linePolicy = model.lines && model.lines[lineId];
      if (linePolicy && linePolicy.mode) return linePolicy;
      return { mode: model.defaultMode || "HYBRID" };
    } catch(e) {
      return { mode: "UNKNOWN" };
    }
  }

  function getRealtimePositionRecordCoverage(lineId, position) {
    var policy = getRealtimePositionPolicy(lineId);
    var mode = policy.mode || "UNKNOWN";
    if (!position || position.positionSource !== "realtime-api") {
      return { mode: mode, currentTrainCovered: false, reason: "no-current-realtime-record" };
    }
    // 覆盖模式只控制是否允许估算缺失列车/区间；
    // 从不使实际实时来源行失效。
    return { mode: mode, currentTrainCovered: true, reason: "current-realtime-record" };
  }

  document.addEventListener('visibilitychange', function() {
    try {
      if (document.hidden) {
        stopFusionPolling();
      } else {
        // ODPT 负责前台刷新并立即请求最新实时
        // 数据。避免与急切的全网融合竞争。保留有界
        // 回退，用于 ODPT 不存在或刷新始终不推送的页面。
        scheduleResumeFallback("visible");
        startFusionPolling();
      }
    } catch(e) { console.debug("[DataFusion] visibilitychange handler error:", e.message); }
  });

  window.addEventListener('pageshow', function(event) {
    if (!event.persisted || document.hidden) return;
    // ODPT 在同一次 BFCache 恢复中请求新快照。给它一个
    // 有界窗口优先推送；否则让现有来源收敛，使
    // UI 不会停留在进入后台前的冻结快照。
    scheduleResumeFallback("pageshow");
    startFusionPolling();
  });

  // ========== 车站坐标匹配 ==========
  function findStationIndex(line, lat, lon) {
    try {
      if (!line || !line.stations || !window.STATION_COORDS) return 0;
      var bestIdx = 0;
      var bestDist = Infinity;
      for (var i = 0; i < line.stations.length; i++) {
        var stName = line.stations[i];
        var coords = window.STATION_COORDS[stName];
        if (!coords) continue;
        var dlat = lat - coords[0];
        var dlon = lon - coords[1];
        var dist = dlat * dlat + dlon * dlon;
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
      return bestIdx;
    } catch(e) { return 0; }
  }

  var LAST_GOOD_KEY = "pt_runinfo_last_good_v1";
  var LAST_GOOD_MAX_AGE_MS = 10 * 60 * 1000;
  var _lastGoodCacheRaw = null;
  var _lastGoodCacheParsed = {};
  // 每次融合只读取一次存储快照；避免在全网或脏线路协调中
  // 为每条线路同步读取 localStorage。
  var _lastGoodFusionSnapshot = null;
  function readLastGoodSnapshot() {
    try {
      var raw = localStorage.getItem(LAST_GOOD_KEY) || "{}";
      if (raw !== _lastGoodCacheRaw) {
        _lastGoodCacheParsed = JSON.parse(raw);
        _lastGoodCacheRaw = raw;
      }
      return _lastGoodCacheParsed;
    } catch(e) { return {}; }
  }
  // 唯一的 last-good 写入者：持久化已接受的状态快照，而不是 UI 查询结果。
  function persistLastGood(data) {
    if (!data || !data.lines) return;
    var all = readLastGoodSnapshot(), next = Object.assign({}, all), changed = false;
    Object.keys(data.lines).forEach(function(id) {
      var r = data.lines[id].delayInfo;
      if (!r || r.stale || !r.source || ['loading','no_data','no_odpt','unknown'].indexOf(r.status) >= 0) return;
      if (all[id] && JSON.stringify(all[id].r) === JSON.stringify(r)) return;
      next[id] = { t: Date.now(), r: r }; changed = true;
    });
    if (changed) try { localStorage.setItem(LAST_GOOD_KEY, JSON.stringify(next)); _lastGoodCacheRaw = null; } catch(e) {}
  }

  function getLastGoodDelay(lineId) {
    try {
      var v = (_lastGoodFusionSnapshot || readLastGoodSnapshot())[lineId];
      if (!v || !v.r || !v.r.status || !v.t) return null;
      if ((Date.now() - v.t) > LAST_GOOD_MAX_AGE_MS) return null;
      var st = v.r.status;
      if (st === "loading" || st === "no_data" || st === "no_odpt" || st === "unknown") return null;
      return {
        status: st,
        maxDelay: v.r.maxDelay == null ? null : v.r.maxDelay,
        interval: v.r.interval || null,
        direction: v.r.direction || null,
        effect: v.r.effect || null,
        impacts: Array.isArray(v.r.impacts) ? v.r.impacts : [],
        cause: v.r.cause || null,
        detail: v.r.detail || v.r.text || "",
        updatedAt: v.r.updatedAt || v.t || null,
        source: "last_good",
        stale: true,
        refreshing: true
      };
    } catch(e) { return null; }
  }

  // ========== 数据加载 ==========
  // 变更契约：元数据刷新可被观察，但不代表列车移动。
  function classifyPositionChanges(before, after) {
    var result = { position: false, display: false, metadata: false };
    var previous = Object.create(null);
    (before || []).forEach(function(p) { previous[_positionIdentity(p)] = p; });
    if ((before || []).length !== (after || []).length) result.position = true;
    (after || []).forEach(function(a) {
      var b = previous[_positionIdentity(a)];
      if (!b) { result.position = result.display = result.metadata = true; return; }
      ['stationIndex','segmentToIndex','segmentProgress','positionSource','estimated','railDirection'].forEach(function(k) {
        if (a[k] !== b[k]) result.position = true;
      });
      ['delayMin','destinationStation','vehicleIconPath','vehicleType','vehicleIdentityStatus',
        'vehicleFormationId','trainNumber','trainType','typeName','serviceDate'].forEach(function(k) {
        if (a[k] !== b[k]) result.display = true;
      });
      ['vehiclePlan','vehicleFormationCandidates','operationEvidence','vehicleResolution',
        'operationArtworkCandidates'].forEach(function(k) {
        if (JSON.stringify(a[k] || null) !== JSON.stringify(b[k] || null)) result.display = true;
      });
      ['vehicleResolvedUpstream','vehicleResolvedFromRealtime','vehicleResolvedFromRealtimeDerived',
        'vehicleSource','vehicleIdentityReason','vehicleResolutionError'].forEach(function(k) {
        if (a[k] !== b[k]) result.display = true;
      });
      if (a.sourceUpdatedAt !== b.sourceUpdatedAt || a.sourceValidUntil !== b.sourceValidUntil) result.metadata = true;
    });
    return result;
  }

  function emitUpdate(fusedData, changes) {
    _lastFusionEmitAt = Date.now();
    persistLastGood(fusedData);
    if (fusedData) { _lastFusedData = fusedData; }
    // 先提交 DATA_FUSION 再通知订阅者——原顺序为「先 cb 后赋值」，
    // 订阅回调内 getFusedData() 经 window.DATA_FUSION || _lastFusedData 读到
    // 上一次的旧值（首屏空融合后为 truthy 空对象），Priority 1 判空失败回退
    // DataLayer 基线 → 延误状态在 15s REFRESH_INTERVAL 二次融合前永不显示。
    try { window.DATA_FUSION = fusedData; } catch(e) {}
    subscribers.forEach(function(cb) {
      try { cb(fusedData, changes || { kind: 'snapshot' }); }
      catch(e) { console.debug('[DataFusion] Subscriber error:', e.message); }
    });
  }

  function subscribe(callback) {
    if (typeof callback !== "function") return function() {};
    subscribers.push(callback);
    var existing = window.DATA_FUSION || _lastFusedData;
    if (existing) { try { callback(existing); } catch(e) { console.debug("[DataFusion] Immediate callback error:", e.message); } }
    return function unsubscribe() { var idx = subscribers.indexOf(callback); if (idx >= 0) subscribers.splice(idx, 1); };
  }

  function checkCacheStale() {
    try {
      var rdbLines = (window.DataLayer && window.DataLayer.getAllLines) ? window.DataLayer.getAllLines() : {};
      if (!rdbLines || Object.keys(rdbLines).length === 0) return;
      var currentVersion = Object.keys(rdbLines).length;
      if (_lineControlVersion !== null && _lineControlVersion !== currentVersion) { _lastFusedData = null; }
      _lineControlVersion = currentVersion;
    } catch(e) {}
  }

  function getOperatorForLine(lineId, lineName) {
    try {
      if (!window.ODPTClient || !window.ODPTClient.LINE_TO_OPERATOR) return null;
      return window.ODPTClient.LINE_TO_OPERATOR[lineId] || window.ODPTClient.LINE_TO_OPERATOR[lineName] || null;
    } catch(e) { return null; }
  }

  function getOperator(line) {
    if (!line) return null;
    // ODPT routing must use the canonical operator namespace for a known line.
    // Display/operator metadata may contain localized or presentation names
    // (e.g. 東京都交通局); those are not valid odpt.Operator identifiers.
    if (line.id && window.ODPTClient && window.ODPTClient.LINE_TO_OPERATOR &&
        window.ODPTClient.LINE_TO_OPERATOR[line.id]) {
      return window.ODPTClient.LINE_TO_OPERATOR[line.id];
    }
    return line.operator || null;
  }

  // Canonical ODPT identity is operator namespace + railway code.
  // Short railway codes are never globally unique and must not be matched alone.
  function parseRailwayIdentity(rec) {
    if (window.ODPTClient && typeof window.ODPTClient.parseRailwayIdentity === "function") {
      return window.ODPTClient.parseRailwayIdentity(rec);
    }
    try {
      var rw = String((rec && rec["odpt:railway"]) || "");
      var m = rw.match(/^odpt\.Railway:([^.]+)\.(.+)$/);
      return m ? { operator: m[1], railwayCode: m[2], key: m[1] + "::" + m[2] } : null;
    } catch (e) { return null; }
  }

  function expectedRailwayIdentity(line) {
    if (!line) return null;
    var operator = getOperator(line);
    if (!operator && window.ODPTClient && window.ODPTClient.LINE_TO_OPERATOR && line.id) {
      operator = window.ODPTClient.LINE_TO_OPERATOR[line.id] || null;
    }
    if (!operator) return null;
    var code = line.id || "";
    if (window.ODPTClient && window.ODPTClient.LINE_RAILWAY_CODE && line.id &&
        window.ODPTClient.LINE_RAILWAY_CODE[line.id]) code = window.ODPTClient.LINE_RAILWAY_CODE[line.id];
    return code ? { operator: operator, railwayCode: code } : null;
  }

  // Railway-specific records require a complete namespace match.
  // Records without railway remain operator/global fallback because fetchODPT is operator-scoped.
  function selectScopedRecords(records, line) {
    if (!records || records.length === 0) return [];
    var expected = expectedRailwayIdentity(line);
    if (!expected) return [];
    var own = records.filter(function(rec) {
      var id = parseRailwayIdentity(rec);
      return id && id.operator.toLowerCase() === String(expected.operator).toLowerCase() &&
        id.railwayCode.toLowerCase() === String(expected.railwayCode).toLowerCase();
    });
    if (own.length) return own;
    return records.filter(function(rec) { return rec && !rec["odpt:railway"]; });
  }

  function recordText(rec) {
    if (!rec) return "";
    var v = rec["odpt:trainInformationText"] || rec["odpt:text"] || "";
    if (typeof v === "string") return v;
    if (v && typeof v === "object") return String(v.ja || v["ja-Hrkt"] || v.en || v["zh-Hans"] || v["zh-Hant"] || v.ko || "");
    return "";
  }

  function resolveCanonicalStation(name) {
    var resolver = window.StationResolver;
    if (!resolver || typeof resolver.resolve !== "function") return null;
    var matches = resolver.resolve(name);
    var exact = (matches || []).filter(function(item) {
      return item && item.stationId && (item.status === "EXACT" || item.status === "ALIAS");
    });
    return exact.length === 1 ? exact[0].stationId : null;
  }

  function evaluateRecord(rec, line) {
    if (!rec || !window.RunInfoEvaluator) return null;
    return window.RunInfoEvaluator.evaluate({
      source: "odpt",
      currentOperationalSource: true,
      cause: rec["odpt:trainInformationCause"],
      range: rec["odpt:trainInformationRange"],
      stationFromName: String(rec["odpt:stationFrom"] || "").split(".").pop(),
      stationToName: String(rec["odpt:stationTo"] || "").split(".").pop(),
      resumeEstimate: rec["odpt:resumeEstimate"],
      structuredStatus: rec["odpt:trainInformationStatus"],
      messageKind: rec["pt:messageKind"] || rec["odpt:trainInformationCategory"] || rec["odpt:category"],
      suspension: rec["odpt:suspension"] === true,
      delay: rec["odpt:delay"] === true,
      delayMinutes: (typeof rec["odpt:delay"] === "number") ? rec["odpt:delay"] : null,
      text: recordText(rec),
      lineStations: line && Array.isArray(line.stations) && window.StationResolver ? line.stations : null,
      resolveStationId: resolveCanonicalStation
    });
  }

  function recordTime(rec) {
    if (!rec) return null;
    var raw = rec["dc:date"] || rec["odpt:timeOfOrigin"] || null;
    if (!raw) return null;
    var t = Date.parse(raw);
    return isNaN(t) ? null : t;
  }

  function recordIsExpired(rec, now) {
    if (!rec || !rec["dct:valid"]) return false;
    var t = Date.parse(rec["dct:valid"]);
    return !isNaN(t) && t < now;
  }

  function pickRecord(records, line) {
    var scoped = selectScopedRecords(records, line);
    if (!scoped.length) return null;
    var rank = { suspended: 5, delayed: 4, info: 2, normal: 1, unknown: 0 };
    var realtime = [], notices = [];
    scoped.forEach(function(rec) {
      var ev = evaluateRecord(rec, line);
      // Official structured status is valid current-state evidence even when
      // the operator omits human-readable text.
      var hasStructuredEvidence = !!(rec["odpt:trainInformationStatus"] ||
        rec["odpt:suspension"] === true || rec["odpt:delay"] === true ||
        (typeof rec["odpt:delay"] === "number" && rec["odpt:delay"] > 0));
      if (!recordText(rec) && !hasStructuredEvidence) return;
      if (ev && ev.messageKind === "notice") notices.push({ rec: rec, ev: ev });
      else realtime.push({ rec: rec, ev: ev });
    });
    var pool = realtime.length ? realtime : notices;
    if (!pool.length) return null;
    var now = Date.now();
    var current = pool.filter(function(item) { return !recordIsExpired(item.rec, now) && (recordTime(item.rec) == null || recordTime(item.rec) <= now + 60000); });
    // An explicitly expired official record is historical context, never
    // current operating-state evidence. If every candidate expired, there is
    // no primary current record.
    if (!current.length) return null;
    if (current.length) pool = current;

    // When records carry source timestamps, the newest official update is the
    // current truth. Severity only breaks ties within the same update moment.
    var timed = pool.filter(function(item) { return recordTime(item.rec) != null; });
    if (timed.length) {
      var newest = Math.max.apply(null, timed.map(function(item) { return recordTime(item.rec); }));
      pool = timed.filter(function(item) { return recordTime(item.rec) === newest; });
    }

    var chosen = null, chosenRank = -1;
    pool.forEach(function(item) {
      var st = item.ev ? item.ev.status : "unknown";
      var rr = rank[st] == null ? 0 : rank[st];
      if (!chosen || rr > chosenRank) { chosen = item.rec; chosenRank = rr; }
    });
    return chosen;
  }


  function aggregateStatus(records, line) { var primary = pickRecord(records, line); return primary ? evaluateRecord(primary, line).status : null; }
  // ========== TrainInformation full-record matching ==========
  // ODPT "odpt.Railway:TokyoMetro.Ginza" -> "Ginza"
  function extractRailwayShort(rec) {
    try {
      var rw = (rec && rec["odpt:railway"]) || "";
      if (!rw) return "";
      var parts = String(rw).split(":");
      if (parts.length < 2) return "";
      var dots = parts[parts.length - 1].split(".");
      return dots[dots.length - 1] || "";
    } catch(e) { return ""; }
  }

  function buildLineIdentity(line, lineId) {
    try {
      line = line || {};
      if (window.LinePresentationService && window.LinePresentationService.getLineIdentity) {
        return window.LinePresentationService.getLineIdentity(lineId, { [lineId]: line });
      }
      var operator = getOperatorForLine(lineId, line.name) || line.operator || "";
      var railwayCode = "";
      if (window.ODPTClient && window.ODPTClient.LINE_RAILWAY_CODE) railwayCode = window.ODPTClient.LINE_RAILWAY_CODE[lineId] || lineId;
      if (!operator || !railwayCode) return null;
      return { operator: String(operator), railwayCode: String(railwayCode), key: String(operator) + "::" + String(railwayCode) };
    } catch(e) { return null; }
  }

  function getApiDelayInfo(line, lineId) {
    try {
      var op = getOperatorForLine(lineId, line.name);
      if (!odptData.delayInfo || !op) return null;
      var norm = _normalizeOperator(op);
      var raw = odptData.delayInfo[norm] || odptData.delayInfo[op];
      if (!raw) return null;
      // Only exact railway/operator identity or explicit operator-wide evidence applies.
      // Records without a matching railway identity cannot inherit another line's incident.
      var record = pickRecord(Array.isArray(raw) ? raw : [raw], Object.assign({}, line, { id: lineId }));
      if (!record) return null;
      var result = evaluateRecord(record, line);
      result.detail = recordText(record);
      result.sourceUpdatedAt = record['dc:date'] || record['odpt:timeOfOrigin'] || null;
      result.validUntil = record['dct:valid'] || null;
      result.updatedAt = result.sourceUpdatedAt;
      return result;
    } catch(e) { return null; }
  }


  function fuseLine(lineId) {
    try {
      var line = window.DataLayer && window.DataLayer.getLine ? window.DataLayer.getLine(lineId) : null;
      if (!line) return null;
      var apiInfo = getApiDelayInfo(line, lineId);
      var fallbackDelay = { status: "no_odpt", maxDelay: 0, interval: null, cause: null };
      try {
        var _opLine = window.ODPTClient && window.ODPTClient.LINE_TO_OPERATOR ? (window.ODPTClient.LINE_TO_OPERATOR[lineId] || window.ODPTClient.LINE_TO_OPERATOR[line.name]) : null;
        if (_opLine && window.ODPTClient.supports && window.ODPTClient.supports(_opLine, 'trainInformation')) {
          // RunInfo loading semantics: only explicit source evidence may produce normal. Missing/pending line data stays loading.
          var _opKey = _normalizeOperator(_opLine);
          var _opState = odptData.delayInfo && _opKey ? odptData.delayInfo[_opKey] : undefined;
          var _opFailed = _opState === null;
          var _opLoading = _opState === undefined;
          fallbackDelay = _opFailed ? { status: "no_odpt", maxDelay: 0, interval: null, cause: null }
            : (_opLoading ? { status: "loading", maxDelay: null, interval: null, cause: null }
              : { status: "loading", maxDelay: null, interval: null, cause: null, source: "awaiting_line_record" });
        }
      } catch(_e) {}
      // Live ODPT > official website > bounded, explicitly stale last-good cache.
      // Missing evidence is resolved by fallbackDelay, never by a seeded local status.
      var webInfo = null;
      try {
        if (window.WebRunInfo && window.WebRunInfo.getDelayInfo) {
          webInfo = window.WebRunInfo.getDelayInfo(lineId, line);
        }
      } catch(_we) {}
      var _lastGood = getLastGoodDelay(lineId);
      var delayInfo = apiInfo || webInfo || _lastGood || fallbackDelay;
      // Attach running-chain resolution context (transient, not persistent)

      var _rtPositions = (odptData.realtimePositions[lineId] || []).slice();
      var _ownStations = line.stations || [];
      // Reuse station positions across shared-track and through-service checks.
      // First occurrence wins, matching Array#indexOf on the original list.
      var _ownStationIndex = new Map();
      _ownStations.forEach(function(name, index) {
        if (!_ownStationIndex.has(name)) _ownStationIndex.set(name, index);
      });
      var _existingIds = {};
      _rtPositions.forEach(function(p) { var _id = _positionIdentity(p); if (_id) _existingIds[_id] = true; });

      var _sharedPartners = (window.SharedTrackPairs && window.SharedTrackPairs.getSharedLines) ? window.SharedTrackPairs.getSharedLines(lineId) : [];
      for (var _sp = 0; _sp < _sharedPartners.length; _sp++) {
        var _spLine = _sharedPartners[_sp];
        var _spPositions = odptData.realtimePositions[_spLine] || [];
        _spPositions.forEach(function(p) {
          var _pid = _positionIdentity(p);
          if (_pid && _existingIds[_pid]) return;
          var _copy = window.SharedTrackPairs.projectPosition
            ? window.SharedTrackPairs.projectPosition(lineId,_spLine,p) : null;
          if(_copy){
            _rtPositions.push(_copy);
            if(_pid) _existingIds[_pid]=true;
          }
        });
      }

      // Direct canonical through neighbours are independent of shared-track
      // membership.  The old nesting made this path unreachable for lines with
      // no SharedTrackPairs entry (including Keiyo).
      var _throughLines = _directThroughLines(lineId);
      for (var _tl = 0; _tl < _throughLines.length; _tl++) {
        var _tlLine = _throughLines[_tl];
        var _tlPositions = odptData.realtimePositions[_tlLine] || [];
        _tlPositions.forEach(function(p) {
          var _pid = _positionIdentity(p);
          if (_pid && _existingIds[_pid]) return;
          var _stName = (p.stationId || '').split('.').pop();
          var _tlIdx = (_ownStationIndex.has(_stName) ? _ownStationIndex.get(_stName) : -1);
          if (_tlIdx >= 0) {
            var _copy = Object.assign({}, p, { stationIndex: _tlIdx, fusionLineId: _tlLine });
            _rtPositions.push(_copy);
            if (_pid) _existingIds[_pid] = true;
          }
        });
      }
      var _chainMeta = null;
      try {
        if (window.RunningChainResolver && window.RunningChainResolver.getResolutionContext) {
          _chainMeta = window.RunningChainResolver.getResolutionContext(lineId, _getResolutionLineIds());
        }
      } catch(_ce) {}
      var _lineIdentity = buildLineIdentity(line, lineId);
      return { id: lineId, name: line.name, nameEn: line.nameEn || line.name, code: line.code, color: (window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(lineId)) || line.color, operator: line.operator, region: line.region, type: line.type, image: line.image, stations: line.stations || [], durations: line.durations || [], intervalTotal: line.durationTotalMin || 0, realtimePositions: _rtPositions, delayInfo: delayInfo, lineIdentity: _lineIdentity, _chainMeta: _chainMeta, branchOf: line.branchOf || null, isSixShapedLoop: line.isSixShapedLoop === true, isDoubleColumnLoop: line.isDoubleColumnLoop === true, loopJunction: line.loopJunction || null, presentation: line.presentation || null, operationRules: line.operationRules || null, trackLayout: line.trackLayout || null };
    } catch(e) { console.debug("[DataFusion] fuseLine error for " + lineId + ":", e.message); return null; }
  }

  function _expandDirtyLines(seedIds, lines) {
    var dirty = {};
    (seedIds || []).forEach(function(id) { if (id && lines && lines[id]) dirty[id] = true; });
    var queue = Object.keys(dirty);
    var branches = getBranchIndex(lines || {});
    // A cursor avoids shifting the whole pending array for every dependency.
    for (var cursor = 0; cursor < queue.length; cursor++) {
      var id = queue[cursor];
      var line = lines[id] || {};
      var deps = [];
      try {
        if (window.SharedTrackPairs && window.SharedTrackPairs.getSharedLines) deps = deps.concat(window.SharedTrackPairs.getSharedLines(id) || []);
      } catch(e) {}
      try {
        deps = deps.concat(_directThroughLines(id));
      } catch(e) {}
      if (line.branchOf) deps.push(line.branchOf);
      if (line.branches) deps = deps.concat(line.branches);
      if (branches[id]) deps = deps.concat(branches[id]);
      deps.forEach(function(dep) {
        if (dep && lines[dep] && !dirty[dep]) { dirty[dep] = true; queue.push(dep); }
      });
    }
    return Object.keys(dirty);
  }

  function fuseDirty(seedIds) {
    var _perfStart = _perfNow();
    try {
      var dlLines = (window.DataLayer && window.DataLayer.getAllLines) ? window.DataLayer.getAllLines() : null;
      if (!_lastFusedData || !_lastFusedData.lines || !dlLines) return fuseAll();
      _lastGoodFusionSnapshot = readLastGoodSnapshot();
      var dirtyIds = _expandDirtyLines(seedIds, dlLines);
      if (dirtyIds.length === 0) return _lastFusedData;
      // If dependency expansion reaches most of the network, a single full pass
      // is cheaper and simpler than cloning plus many targeted writes.
      if (dirtyIds.length > Math.max(40, Math.floor(Object.keys(dlLines).length * 0.45))) return fuseAll();
      var fusedLines = Object.assign({}, _lastFusedData.lines);
      dirtyIds.forEach(function(lineId) {
        var fused = fuseLine(lineId);
        if (fused) fusedLines[lineId] = fused;
        else delete fusedLines[lineId];
      });
      var fusedData = Object.assign({}, _lastFusedData, {
        timestamp: new Date().toISOString(),
        lines: fusedLines,
        odptOperatorsLoaded: Object.keys(odptData.delayInfo).length
      });
      emitUpdate(fusedData, arguments[1]);
      _lastGoodFusionSnapshot = null;
      _perfRecord("fuseDirty", _perfStart, { seeds: (seedIds || []).length, dirty: dirtyIds.length });
      return fusedData;
    } catch(e) {
      _lastGoodFusionSnapshot = null;
      _perfRecord("fuseDirty:error", _perfStart, { seeds: (seedIds || []).length });
      console.debug("[DataFusion] fuseDirty fallback:", e.message);
      return fuseAll();
    }
  }

  function fuseAll() {
    var _perfStart = _perfNow();
    try {
      _lastGoodFusionSnapshot = readLastGoodSnapshot();
      var fusedLines = {};
      var allLineIds = {};
      var dlLines = (window.DataLayer && window.DataLayer.getAllLines) ? window.DataLayer.getAllLines() : null;
      if (dlLines) Object.keys(dlLines).forEach(function(k) { allLineIds[k] = true; });
      Object.keys(allLineIds).forEach(function(lineId) {
        var fused = fuseLine(lineId);
        if (fused) fusedLines[fused.id] = fused;
      });
      var fusedData = { version: FUSION_VERSION, timestamp: new Date().toISOString(), lines: fusedLines, lineOrder: (window.LinePresentationService && dlLines) ? window.LinePresentationService.getDisplayOrder(dlLines) : Object.keys(allLineIds), odptOperatorsLoaded: Object.keys(odptData.delayInfo).length, totalLines: Object.keys(allLineIds).length };
      emitUpdate(fusedData);
      _lastGoodFusionSnapshot = null;
      _perfRecord("fuseAll", _perfStart, { lines: Object.keys(fusedLines).length });
      return fusedData;
    } catch(e) { _lastGoodFusionSnapshot = null; _perfRecord("fuseAll:error", _perfStart); console.error("[DataFusion] fuseAll error:", e.message); if (_lastFusedData) { emitUpdate(_lastFusedData); return _lastFusedData; } return null; }
  }

  // Station identity aliases are centralized in RuntimeConfig; this layer only
  // applies the canonical mapping while fusing provider records.

  // Provider railway identifiers are normalized through the canonical source
  // identity adapter below; through-service topology is never inferred here.
  var allLines = null;
  var doEstimation = null;
  var posMap = {};
  // External provider railway names may differ from the canonical line id.
  // This is identity adaptation only; topology remains in railway_data.json.
  var SOURCE_RAILWAY_CANONICAL_LINE = (window.RuntimeConfig && window.RuntimeConfig.SOURCE_RAILWAY_CANONICAL_LINE) || {};
  var _stationLineIndex = null;
  var _stationLineIndexSource = null;
  var _branchIndex = null;
  var _branchIndexSource = null;
  var _timetablePresenceIndex = {};
  var _timetablePresenceStamp = "";

  function getTimetablePresenceIndex() {
    var src = window.ODPT_TIMETABLES || {};
    var parts = [];
    Object.keys(src).sort().forEach(function(op) {
      parts.push(op + ":" + (Array.isArray(src[op]) ? src[op].length : 0));
    });
    var stamp = parts.join("|");
    if (stamp === _timetablePresenceStamp) return _timetablePresenceIndex;
    var idx = {};
    Object.keys(src).forEach(function(op) {
      var rows = src[op];
      if (!Array.isArray(rows)) return;
      var opIdx = idx[op] = {};
      rows.forEach(function(t) {
        var rw = t && t["odpt:railway"];
        if (!rw) return;
        var raw = String(rw);
        var colon = raw.split(":");
        var tail = colon.length > 1 ? colon[colon.length - 1] : raw;
        var dots = tail.split(".");
        var railwayKey = dots[dots.length - 1] || "";
        if (railwayKey) opIdx[railwayKey] = true;
      });
    });
    _timetablePresenceIndex = idx;
    _timetablePresenceStamp = stamp;
    return idx;
  }

  function hasOdptTimetableForLine(lineId, operator) {
    var idx = getTimetablePresenceIndex();
    var op = operator || "";
    var normalized = _normalizeOperator(op);
    var aliases = { "Rinkai": "TWR", "TsukubaExpress": "MIR" };
    var candidates = [op, normalized, aliases[op], aliases[normalized]].filter(Boolean);
    var code = (window.ODPTClient && window.ODPTClient.LINE_RAILWAY_CODE &&
      window.ODPTClient.LINE_RAILWAY_CODE[lineId]) || lineId;
    for (var i = 0; i < candidates.length; i++) {
      var oi = idx[candidates[i]];
      if (oi && (oi[lineId] || oi[code])) return true;
    }
    return false;
  }

  function getBranchIndex(lines) {
    if (_branchIndex && _branchIndexSource === lines) return _branchIndex;
    var idx = {};
    Object.keys(lines || {}).forEach(function(id) {
      var line = lines[id];
      if (!line || !line.branchOf) return;
      if (!idx[line.branchOf]) idx[line.branchOf] = [];
      idx[line.branchOf].push(id);
    });
    _branchIndex = idx;
    _branchIndexSource = lines;
    return idx;
  }

  function getStationLineIndex(lines) {
    if (_stationLineIndex && _stationLineIndexSource === lines) return _stationLineIndex;
    var idx = {};
    Object.keys(lines || {}).forEach(function(lid) {
      var line = lines[lid];
      if (!line || !line.stations) return;
      for (var i = 0; i < line.stations.length; i++) {
        var raw = String(line.stations[i] || "");
        if (!raw) continue;
        var norm = raw.replace(/-/g, "").toLowerCase();
        if (!idx[norm]) idx[norm] = [];
        idx[norm].push({ lineId: lid, stationIndex: i });
      }
    });
    _stationLineIndex = idx;
    _stationLineIndexSource = lines;
    return idx;
  }

  // Vehicle identity has one authority. Rendering/icon rules must never infer
  // a train class back into the operational data model.
  function resolveTrainClass(vehCtx) {
    try {
      if (window.TrainVehicle && typeof window.TrainVehicle.resolve === 'function') {
        return window.TrainVehicle.resolve(vehCtx).name || '';
      }
    } catch(e) {}
    return '';
  }

  function _uniqueTimetableRailwayForTrain(operatorKey, trainNumber) {
    if (!operatorKey || !trainNumber) return "";
    var src = window.ODPT_TIMETABLES || {};
    var rows = src[operatorKey] || [];
    // Some loaders store operator aliases differently; compare normalized
    // operator keys, but never cross operator boundaries.
    if (!rows.length) {
      var want = _normalizeOperator(operatorKey, true);
      Object.keys(src).forEach(function(k) {
        if (rows.length) return;
      var nk = _normalizeOperator(k, true);
        if (nk === want) rows = src[k] || [];
      });
    }
    var railways = {};
    rows.forEach(function(tt) {
      if (!tt) return;
      var n = tt["odpt:trainNumber"] || tt["odpt:train"] || "";
      if (String(n) !== String(trainNumber)) return;
      var rw = tt["odpt:railway"] || "";
      if (!rw) return;
      var parts = String(rw).split(":");
      var shortName = parts.length > 1 ? parts[parts.length - 1] : String(rw);
      if (shortName) railways[shortName] = true;
    });
    var keys = Object.keys(railways);
    return keys.length === 1 ? keys[0] : "";
  }

  function _isFreshRealtimeRecord(record) {
    if (!record) return false;
    var now = Date.now();
    var validRaw = record["dct:valid"];
    if (validRaw) {
      var validMs = Date.parse(validRaw);
      // Explicit provider validity is authoritative. Invalid timestamps fail
      // closed because they cannot prove that a dynamic position is current.
      return !isNaN(validMs) && validMs >= now;
    }
    var updatedRaw = record["dc:date"];
    if (!updatedRaw) return true;
    var updatedMs = Date.parse(updatedRaw);
    // A provider timestamp in the future is not evidence that a dynamic
    // position is current; it is an impossible or doctored source update.
    // Allow 60s clock skew between the provider and this client.
    if (isNaN(updatedMs) || updatedMs > now + 60000) return false;
    var frequency = Number(record["odpt:frequency"]);
    // Without dct:valid, bound freshness by the provider cadence when supplied.
    // Otherwise use 2 minutes: four normal 30s polling cycles, long enough for
    // transient network jitter but short enough not to present an old train as LIVE.
    var maxAgeMs = isFinite(frequency) && frequency > 0
      ? Math.max(60000, Math.min(frequency * 1000 * 4, 5 * 60 * 1000))
      : 2 * 60 * 1000;
    return (now - updatedMs) <= maxAgeMs;
  }

  // Realtime records without fromStation cannot establish position truth, but
  // may still carry train-level evidence (vehicle type, destination, train no).
  // Keep that evidence separate so timetable estimation can consume it later
  // without pretending the incomplete record is a live position.
  var _realtimeEvidenceWithoutPosition = {};

  function loadTrainPositions() {
    var _perfStart = _perfNow();
    try {
      // Position truth must come only from the dedicated realtime container.
      // Realtime positions come only from the dedicated ODPT position store.
      // ODPT_TRAIN_POSITIONS remains the complete operator snapshot for
      // persistence. Detail pages may provide a line-scoped view so unrelated
      // operator rows do not enter the fusion/vehicle pipeline.
      var positionSource = window.ODPT_TRAIN_POSITION_VIEWS || window.ODPT_TRAIN_POSITIONS || {};
      var _forcePositionLoad = loadTrainPositions._calibrated === false;
      var _nowPositionLoad = Date.now();
      if (!_forcePositionLoad && _lastPositionLoadAt &&
          _nowPositionLoad >= _lastPositionLoadAt &&
          _nowPositionLoad - _lastPositionLoadAt < 1200) {
        var _samePositionSnapshot = true;
        var _sourceOperators = Object.keys(positionSource);
        var _knownOperators = Object.keys(_lastPositionSourceRefs);
        if (_sourceOperators.length !== _knownOperators.length) {
          _samePositionSnapshot = false;
        } else {
          _sourceOperators.forEach(function(op) {
            if (_lastPositionSourceRefs[op] !== positionSource[op]) _samePositionSnapshot = false;
          });
        }
        if (_samePositionSnapshot) return;
      }
      allLines = (window.DataLayer && window.DataLayer.getAllLines) ? window.DataLayer.getAllLines() : {};
      if (!allLines || Object.keys(allLines).length === 0) {
        // DataLayer 未就绪时延迟重试（最多 30 次），
        // 避免 ODPT 列车位置先于线路数据到达导致静默 return、实时位置永久丢失
        if (!loadTrainPositions._retry) loadTrainPositions._retry = 0;
        if (loadTrainPositions._retry < 30) {
          loadTrainPositions._retry++;
          setTimeout(loadTrainPositions, 300);
        }
        return;
      }
      loadTrainPositions._retry = 0;
      var _previousPosMap = odptData.realtimePositions || {};
      posMap = {};
      // Snapshot-local lookup avoids scanning all previously placed trains
      // for every incoming record; preserve the original first-match behavior.
      var _positionIndexByLine = Object.create(null);
      // Service date/calendar are shared by all vehicle-evidence lookups in
      // this snapshot; calculate once instead of allocating a Date per train.
      var _snapshotNow = new Date();
      // Keep actual JST dates across overseas browsers. At 00:00–03:59 JST,
      // railway service remains on the preceding day and times are 24:00+.
      var _snapshotJstNow = new Date(_snapshotNow.getTime() + 9 * 60 * 60 * 1000);
      var _snapshotJstHour = _snapshotJstNow.getUTCHours();
      var _snapshotServiceTime = String(_snapshotJstHour < 4 ? _snapshotJstHour + 24 : _snapshotJstHour).padStart(2, "0") +
        ":" + String(_snapshotJstNow.getUTCMinutes()).padStart(2, "0");
      var _serviceDayNow = new Date(_snapshotJstNow.getTime() - (_snapshotJstHour < 4 ? 86400000 : 0));
      var _snapshotServiceDate = _serviceDayNow.getUTCFullYear() + "-" + String(_serviceDayNow.getUTCMonth() + 1).padStart(2, "0") + "-" + String(_serviceDayNow.getUTCDate()).padStart(2, "0");
      var _snapshotServiceDay = _serviceDayNow.getUTCDay();
      // Vehicle references follow the wall-clock timetable calendar. The
      // position service date remains the preceding railway service date
      // before 04:00 so overnight positions keep their continuous time axis.
      // Sharing the service-day calendar here made Saturday 01:35 realtime
      // trains use Friday's weekday reference set (e.g. 443K/545K/639K).
      var _publishedCalendars = window.TrainPositionEstimator &&
        typeof window.TrainPositionEstimator.getWallClockCalendars === "function"
        ? window.TrainPositionEstimator.getWallClockCalendars()
        : (window.TrainPositionEstimator &&
          typeof window.TrainPositionEstimator.getCurrentCalendars === "function"
          ? window.TrainPositionEstimator.getCurrentCalendars() : []);
      var _snapshotCalendarType = _publishedCalendars.some(function(c) {
        return /odpt\.Calendar:(?:Holiday|Sunday|Saturday|SaturdayHoliday)$/.test(c);
      }) ? "holiday" : "weekday";
      if (!_publishedCalendars.length)
        _snapshotCalendarType = (_snapshotJstNow.getUTCDay() === 0 || _snapshotJstNow.getUTCDay() === 6) ? "holiday" : "weekday";
      var _vehicleResolveCalls = 0, _vehicleResolveMs = 0, _vehicleResolveErrors = 0;
      var _vehicleEvidenceCalls = 0, _vehicleEvidenceMs = 0;
      // Build the ODPT railway-code reverse lookup once per position snapshot.
      // Keep source key order so ambiguous-code selection remains unchanged.
      var _railwayCodeLines = Object.create(null);
      var _railwayCodes = window.ODPTClient && window.ODPTClient.LINE_RAILWAY_CODE;
      if (_railwayCodes) Object.keys(_railwayCodes).forEach(function(id) {
        var code = _railwayCodes[id];
        if (!_railwayCodeLines[code]) _railwayCodeLines[code] = [];
        _railwayCodeLines[code].push(id);
      });
      // The station index is immutable for the current canonical snapshot.
      // Building it inside every train record turns one poll into an
      // all-lines scan multiplied by the number of vehicles.
      var _stationIndex = getStationLineIndex(allLines);
      odptData.trains = {};
      // Snapshot-scoped: incomplete realtime evidence must not leak into later
      // polls after the source record disappears.
      _realtimeEvidenceWithoutPosition = {};
      Object.keys(positionSource).forEach(function(op) {
        var trains = positionSource[op] || [];
        odptData.trains[op] = trains;
        var top = _normalizeOperator(op);
        trains.forEach(function(t) {
          if (!t || !_isFreshRealtimeRecord(t)) return;
          var fromId = t["odpt:fromStation"] || "";
          var stationKey = String(fromId).split(".").pop();
          var _rawTrainNo = t["odpt:trainNumber"] || t["odpt:train"] || "";
          if (!stationKey) {
            if (_rawTrainNo) {
              var _evKey = String(op) + "::" + String(_rawTrainNo);
              _realtimeEvidenceWithoutPosition[_evKey] = {
                operator: op,
                trainNumber: _rawTrainNo,
                railway: t["odpt:railway"] || "",
                railDirection: t["odpt:railDirection"] || "",
                destinationStation: _destinationStationKey(t),
                vehicleType: t["odpt:vehicleType"] || t["vehicleType"] || "",
                trainOwner: t["odpt:trainOwner"] || t["trainOwner"] || "",
                observedAt: Date.now()
              };
            }
            return;
          }
          var railway = t["odpt:railway"] || "";
          var railwayName = "";
          if (railway) {
            var railParts = String(railway).split(":");
            railwayName = railParts.length > 1 ? railParts[railParts.length - 1] : String(railway);
          }
          // Missing realtime railway identity may be recovered only from a
          // unique timetable match inside the same operator. Train number alone
          // is never treated as proof when it maps to multiple railways.
          if (!railwayName) {
            var _identityTrainNo = t["odpt:trainNumber"] || t["odpt:train"] || "";
            railwayName = _uniqueTimetableRailwayForTrain(op, _identityTrainNo);
          }
          // 别名转换（ODPT 拼写差异站 ID → 项目站表 ID）
          // railway 感知别名优先（Oyama=Tojo 大山/Oyama=Utsunomiya 小山 双义），再回退全局
          if (window.RuntimeConfig.STATION_ALIAS_BY_RAILWAY[railwayName] && window.RuntimeConfig.STATION_ALIAS_BY_RAILWAY[railwayName][stationKey]) {
            stationKey = window.RuntimeConfig.STATION_ALIAS_BY_RAILWAY[railwayName][stationKey];
          } else if (window.RuntimeConfig.STATION_ALIAS[stationKey]) {
            stationKey = window.RuntimeConfig.STATION_ALIAS[stationKey];
          }
          var delayMin = t["odpt:delay"] != null ? (parseInt(t["odpt:delay"], 10) || 0) : 0;
          var trainId = _realtimeSourceIdentity(t, top, railwayName);
          var trainNumber = String(t["odpt:trainNumber"] || t["odpt:train"] || "");
          var railDirection = t["odpt:railDirection"] || "";
          var directionName = "";
          if (railDirection) {
            var dirParts = String(railDirection).split(":");
            directionName = dirParts.length > 1 ? dirParts[dirParts.length - 1] : String(railDirection);
          }
          // 终点站提取（odpt:destinationStation）——供详情图列车标签显示终点/方向
          var destStations = _destinationStationValues(t);
          var destStation = destStations.length ? destStations[0].split(".").pop() : "";
          // InnerLoop / OuterLoop is direction evidence only. Keep the
          // source destination intact; rendering prefers a real terminal when present.
          var matchingLines = [];
          var _canonicalSourceLine = SOURCE_RAILWAY_CANONICAL_LINE[railwayName] || "";
          var _stationCandidates = _stationIndex[String(stationKey).replace(/-/g, "").toLowerCase()] || [];
          _stationCandidates.forEach(function(_candidate) {
            var lid = _candidate.lineId;
            var line = allLines[lid];
            if (!line || !line.stations) return;
            var lop = _normalizeOperator(line.operator);
            // Cross-operator admission is allowed only for the canonical line
            // explicitly identified by the provider adapter. Through neighbours
            // are discovered from canonical topology, never from this map.
            if (lop !== top && lid !== _canonicalSourceLine) return;
            var idx = _candidate.stationIndex;
            if (idx < 0) return;
            matchingLines.push({ lid: lid, idx: idx, line: line });
          });
          var targetLine = null;
          if (_canonicalSourceLine) {
            for (var _csi = 0; _csi < matchingLines.length; _csi++) {
              if (matchingLines[_csi].lid === _canonicalSourceLine) {
                targetLine = matchingLines[_csi];
                break;
              }
            }
          }
          if (!targetLine && matchingLines.length === 1) {
            targetLine = matchingLines[0];
          } else if (!targetLine && matchingLines.length > 1) {
            // 1. 优先使用railway字段精确匹配
            if (railwayName) {
              // 先用 LINE_RAILWAY_CODE 反查 odpt railway 短名 → 项目线 key 列表
              // （如 SaikyoKawagoe→[Saikyo,Kawagoe]、Kawagoe→[KawagoeWest]），集合匹配比
              // 子串猜测更准——避免川越〜高麗川的 Kawagoe 数据错配到大宮〜川越段。
              // ODPT railway codes arrive with an operator namespace prefix
              // ("JR-East.Joban") while LINE_RAILWAY_CODE stores bare short
              // names ("Joban"). Normalize to the short name for lookup.
              var _shortRailway = String(railwayName).split(".").pop();
              var mappedLids = _railwayCodeLines[_shortRailway] || [];
              // The ODPT railway-code mapping can span several project lines.
              // Shared stations cannot determine which segment owns a train.
              // Choose the line only when this source has one unique match.
              var _mappedMatches = matchingLines.filter(function(ml) {
                return mappedLids.indexOf(ml.lid) >= 0;
              });
              if (_mappedMatches.length === 1) targetLine = _mappedMatches[0];
              if (!targetLine && mappedLids.length === 0) {
                var _exactMatches = matchingLines.filter(function(ml) { return ml.lid === _shortRailway; });
                if (_exactMatches.length === 1) targetLine = _exactMatches[0];
              }
            }
            // 2. Ambiguous source identity must stay unresolved.
            // A shared station, train number, or "longest line" is not evidence
            // of railway/operator ownership. Do not guess a target line when
            // canonical railway identity and verified through fallback cannot
            // disambiguate the realtime record.
            if (!targetLine) {
              console.debug("[DataFusion] ambiguous realtime line identity", {
                trainNumber: trainNumber,
                railway: railwayName,
                station: stationKey,
                candidates: matchingLines.map(function(ml) { return ml.lid; })
              });
            }
          }
          var _handover = _resolveRealtimeHandover(t, targetLine, allLines);
          if (_handover) targetLine = _handover.target;
          if (targetLine) {
            var lid = targetLine.lid;
            var idx = targetLine.idx;
            var lineMeta = (allLines && allLines[lid]) || targetLine.line || {};
            var operationRules = lineMeta.operationRules || {};
            var realtimeTrainNumberIsPhysicalCar = operationRules.realtimeTrainNumber === "physical-car";
            if (!posMap[lid]) posMap[lid] = [];
            var _linePositionIndex = _positionIndexByLine[lid];
            if (!_linePositionIndex) _linePositionIndex = _positionIndexByLine[lid] = new Map();
            // Missing ODPT train ID cannot prove two records are the same train.
            var existingIdx = trainId && _linePositionIndex.has(trainId) ? _linePositionIndex.get(trainId) : -1;
            if (existingIdx >= 0) {
              var _previousSourceTime = Date.parse(posMap[lid][existingIdx].sourceUpdatedAt || '');
              var _incomingSourceTime = Date.parse(t['dc:date'] || '');
              // Duplicate source identities are one train. An older response
              // must not replace its newer position or physical vehicle proof.
              if (isFinite(_previousSourceTime) &&
                  (!isFinite(_incomingSourceTime) || _incomingSourceTime < _previousSourceTime)) return;
            }
            var rawType = t["odpt:trainType"] || "";
            var typeName = "";
            if (rawType) {
              var tp = String(rawType).split(":");
              typeName = tp.length > 1 ? tp[tp.length - 1] : String(rawType);
            }
            var positionData = { 
              stationIndex: idx,
              stationId: stationKey,
              sourceRailway: t["odpt:railway"] || "",
              positionLineId: lid,
              trainId: trainId,
              trainNumber: trainNumber,
              operationCode: t["odpt:operationCode"] || t.operationCode || "",
              serviceDate: _snapshotServiceDate,
              delayMin: delayMin,
              railDirection: directionName,
              destinationStation: destStation,
              sourceFromStation: fromId,
              sourceToStation: t["odpt:toStation"] || "",
              segmentToIndex: _handover ? _handover.toIndex : null,
              trainType: rawType,
              typeName: typeName,
              estimated: false,
              positionSource: "realtime-api",
              // Preserve ODPT dynamic-data freshness metadata for the train UI.
              // Do not synthesize timestamps here: dc:date/dct:valid/frequency belong
              // to the source response and are needed to distinguish fresh vs stale.
              sourceUpdatedAt: t["dc:date"] || null,
              sourceValidUntil: t["dct:valid"] || null,
              sourceFrequency: t["odpt:frequency"] != null ? t["odpt:frequency"] : null
            };
            // Resolve vehicle identity once while the train still has realtime
            // source evidence. The renderer must consume this result rather than
            // independently guessing again from the current display line.
            var trainOperator = t["odpt:operator"] || "";
            var trainOpShort = trainOperator.replace('odpt.Operator:', '') || '';
            var odptVehicleType = t["odpt:vehicleType"] || t["vehicleType"] || "";
            var odptTrainOwner = t["odpt:trainOwner"] || t["trainOwner"] || "";
            // 保留适配器对 GTFS 实体车号证据的分类，供诊断和 UI 来源说明使用。
            // 该字段只描述上游事实，不会把 trip_id 推断成物理车号。
            var vehicleEvidenceKind = t["gtfs:vehicleEvidenceKind"] || "";
            positionData.trainOwner = odptTrainOwner;
            positionData.realtimeVehicleType = odptVehicleType;
            positionData.vehicleEvidenceKind = vehicleEvidenceKind;
            positionData.realtimeVehicleId = String(t["gtfs:vehicleId"] || "").trim();
            positionData.realtimeVehicleLabel = String(t.vehicleLabel || t["gtfs:vehicleLabel"] || "").trim();
            // Live Toei.Arakawa ODPTnnnn values are trip IDs, not physical
            // ODPT 这里提供的是行程 ID，不是实体车辆编号。
            // Expose why the renderer has no model PNG; never turn ODPT digits
            // into a guessed 7700/8500/8800/8900/9000 series identity.
            if (realtimeTrainNumberIsPhysicalCar && /^ODPT\d+$/i.test(positionData.trainNumber) &&
                !odptVehicleType && !t.vehicleCarNumber && !t.carNumber) {
              positionData.vehicleEvidenceGap = "odpt-trip-id-without-car-number";
            }
            // An explicit vehicle type carried by the realtime record is train-level
            // evidence. Register it before resolving so the same train number can
            // reuse that evidence without depending on the current display line.
            if (window.TrainVehicle && typeof window.TrainVehicle.resolveRealtime === "function") {
              try {
                var _sourceFormation=String(t.vehicleFormationId||t.formationId||'').trim();
                var _sourceCar=String(t.vehicleCarNumber||t.carNumber||'').trim();
                var _vehicleStart=_perfNow();
                _vehicleResolveCalls++;
                if(!odptVehicleType)_vehicleEvidenceCalls++;
                var _decision=window.TrainVehicle.resolveRealtime({
                  lineId:lid,operator:trainOpShort,trainOwner:odptTrainOwner,
                  trainNumber:positionData.trainNumber,railway: railway,railDirection:railDirection,
                   operationCode: positionData.operationCode,
                  stationIndex:idx,trainType:rawType,destinationStation:destStations,trainId:trainId,
                  fromStation:fromId,toStation:t["odpt:toStation"]||"",
                  serviceDate:_snapshotServiceDate,serviceTime:_snapshotServiceTime,calendarType:_snapshotCalendarType,
                  positionSource:"realtime-api",
                  carComposition:t["odpt:carComposition"] != null ? t["odpt:carComposition"] : t.carComposition,
                  formationId:_sourceFormation,realtimeVehicleType: odptVehicleType,
                  realtimeVehicleLabel: t.vehicleLabel || t["gtfs:vehicleLabel"] || "",
                  vehicleEvidenceKind: vehicleEvidenceKind,
                  gtfsVehicleId: t["gtfs:vehicleId"] || "",
                  realtimeCarNumber: realtimeTrainNumberIsPhysicalCar && railway === "odpt.Railway:Toei.Arakawa" &&
                    trainOpShort === "Toei" && /^\d{4}$/.test(positionData.trainNumber)
                      ? positionData.trainNumber : _sourceCar
                });
                var _rtVehicle=_decision.vehicleResult;
                var _derivedVehicleType=_decision.realtimeDerivedVehicleType;
                var _realtimeReferenceModel=_decision.realtimeReferenceModel;
                positionData.vehicleFormationCandidates=_decision.formationCandidates;
                positionData.vehicleFormationId=_decision.formationId;
                if(_decision.evidence){
                  positionData.vehicleEvidenceSource=_decision.evidence.providerId||'dated-or-structural-evidence';
                  positionData.operationEvidence=[_decision.evidence];
                }
                // Preserve the two source assertions for subsequent timetable
                // joins. A projected vehicle name is NOT itself raw evidence.
                positionData.realtimeDerivedVehicleType = _derivedVehicleType;
                positionData.realtimeReferenceModel = _realtimeReferenceModel;
                _vehicleResolveMs += _perfNow() - _vehicleStart;
                _projectVehicleResolution(positionData, _rtVehicle, false);
                if (_rtVehicle.verifiedCarNumber) positionData.vehicleCarNumber = _rtVehicle.verifiedCarNumber;
              } catch(e) {
                _vehicleResolveErrors++;
                _vehicleResolveMs += _perfNow() - _vehicleStart;
                _projectVehicleResolution(positionData, null, false);
                positionData.vehicleIdentityReason = "vehicle-resolution-error";
                positionData.vehicleResolutionError = true;
                console.debug("[DataFusion] TrainVehicle realtime resolution failed", e);
              }
            }
            var _positionCoverage = getRealtimePositionRecordCoverage(lid, positionData);
            positionData.realtimeCoverageMode = _positionCoverage.mode;
            positionData.realtimePositionRecordPresent = _positionCoverage.currentTrainCovered;
            positionData.realtimePositionCoverageReason = _positionCoverage.reason;
            // 双向直通列车处理
            // 1. 临海线的车（operator=TWR）开到JR区间了 → 在JR线路图上显示临海线车型
            // 存车自己的 operator（渲染层判断直通车、按车籍选图标，治跨线"变身"）
            positionData.trainOperator = trainOperator.replace('odpt.Operator:', '') || '';
            // An intermittent missing vehicle field must not erase a model
            // already established for this same ODPT train source identity.
            _preserveRealtimeSourceVehicle(positionData, odptVehicleType);
            // Zero-fallback vehicle contract: realtime records without explicit
            // vehicle evidence keep trainClass empty. Line/operator/train number,
            // service type and through-service context may not manufacture it.
            // Destination on a partner line is routing intent, not position
            // evidence. Never synthesize a partner-line realtime position from
            // destination alone. Cross-line continuity must be confirmed by
            // timetable/running-chain evidence before rendering on that line.
            if (existingIdx >= 0) {
              posMap[lid][existingIdx] = positionData;
            } else {
              if (trainId) _linePositionIndex.set(trainId, posMap[lid].length);
              posMap[lid].push(positionData);
            }
          }
        });
      });
      // Publish the mutable working map for estimation/through-service logic.
      // _previousPosMap remains the immutable reference to the prior snapshot
      // because posMap is a newly allocated object for this poll.
      odptData.realtimePositions = posMap;

      // ===== Merge plans only into gaps left by valid per-train observations =====
      doEstimation = function(requestedLineIds) {
        var _estPerfStart = _perfNow();
        try {
          if (window.TrainPositionEstimator && typeof window.TrainPositionEstimator.estimateAllPositions === "function") {
            // Timetable estimation consumes timetable rows only; never fall back to the
            // Timetable estimation reads only the dedicated timetable store.
            Object.keys(posMap).forEach(function(lid) {
              if (requestedLineIds && requestedLineIds.length && requestedLineIds.indexOf(lid) < 0) return;
              posMap[lid] = (posMap[lid] || []).filter(function(p) {
                return p && p.positionSource === "realtime-api" && _isFreshRealtimeRecord({
                  "dct:valid": p.sourceValidUntil, "dc:date": p.sourceUpdatedAt,
                  "odpt:frequency": p.sourceFrequency
                });
              });
            });
            var timetableSource = window.ODPT_TIMETABLES || {};
            var estimated = window.TrainPositionEstimator.estimateAllPositions(
              allLines,
              timetableSource,
              odptData.delayInfo,
              null, // No parallel realtime merge inside TrainPositionEstimator.
              { lineIds: requestedLineIds && requestedLineIds.length ? requestedLineIds : null }
            );

            // Timetable/SQL vehicle plans are estimation-only. A valid ODPT
            // realtime row keeps the identity resolved at ingestion time from
            // its reported train number, owner/operator and direct realtime
            // evidence. Never join a timetable model or timetable artwork back
            // into that live row: a matching planned run is not proof of the
            // physical vehicle currently operating.

            // The established RunningChainResolver is the only authority for
            // scoped live/timetable candidate keys, for EVERY railway.
            // Count individual candidates as well as distinct chains: two
            // scheduled runs sharing one number/direction cannot silently
            // collapse just because their chain IDs happen to agree.
            var _chainsByScheduledKey = Object.create(null);
            var _scheduledEstimateCounts = Object.create(null);
            var _scheduledEstimateItineraries = Object.create(null);
            var _scheduledLiveCounts = Object.create(null);
            function _chainBridgeKey(lid, p) {
              return window.RunningChainResolver &&
                typeof window.RunningChainResolver.scheduledMatchKey === "function"
                ? window.RunningChainResolver.scheduledMatchKey(lid, p) : "";
            }
            Object.keys(estimated).forEach(function(_vlid) {
              (estimated[_vlid] || []).forEach(function(_ep) {
                if (!_ep || !_ep.runningChainId) return;
                var k = _chainBridgeKey(_vlid, _ep);
                if (!k) return;
                // A duplicated exact itinerary is one scheduled run. Two
                // different itineraries with the same number remain ambiguous.
                var fingerprint = _ep.scheduledItineraryKey ||
                  ("unique-source:" + String(_ep.timetableIdentity || _ep.trainId || ""));
                if (!_scheduledEstimateItineraries[k]) {
                  _scheduledEstimateItineraries[k] = Object.create(null);
                }
                if (!_scheduledEstimateItineraries[k][fingerprint]) {
                  _scheduledEstimateItineraries[k][fingerprint] = true;
                  _scheduledEstimateCounts[k] = (_scheduledEstimateCounts[k] || 0) + 1;
                }
                if (!_chainsByScheduledKey[k]) _chainsByScheduledKey[k] = Object.create(null);
                _chainsByScheduledKey[k][_ep.runningChainId] = true;
              });
            });
            Object.keys(posMap).forEach(function(_vlid) {
              (posMap[_vlid] || []).forEach(function(_rp) {
                var k = _chainBridgeKey(_vlid, _rp);
                if (k) _scheduledLiveCounts[k] = (_scheduledLiveCounts[k] || 0) + 1;
              });
            });
            var _chainVehicleCandidates = {};
            function _queueChainVehicle(p) {
              if (!p || !p.runningChainId || !p.vehicleType) return;
              var exact = p.vehicleIdentityStatus === "EXACT" ||
                (p.vehicleResolution && p.vehicleResolution.identityStatus === "EXACT");
              if (!exact) return;
              var cid = p.runningChainId;
              var current = _chainVehicleCandidates[cid];
              if (!current) { _chainVehicleCandidates[cid] = p; return; }
              var preferred = _vehicleEvidenceRank(p) > _vehicleEvidenceRank(current) ? p : current;
              var other = preferred === p ? current : p;
              // Join different evidence channels only for the SAME resolved
              // physical chain, service date and exact vehicle type.
              if (preferred.serviceDate && preferred.serviceDate === other.serviceDate &&
                  _formationSegmentKey(preferred) &&
                  _formationSegmentKey(preferred) === _formationSegmentKey(other) &&
                  preferred.vehicleResolution && other.vehicleResolution &&
                  preferred.vehicleResolution.name === other.vehicleResolution.name) {
                var primary = _confirmedFormationEvidence(preferred);
                var secondary = _confirmedFormationEvidence(other);
                if (!primary && secondary && !preferred.vehicleFormationId && !preferred.vehicleFormationConflict) {
                  preferred.vehicleFormationId = other.vehicleFormationId || "";
                  preferred.vehicleFormationCandidates = (other.vehicleFormationCandidates || []).slice();
                  preferred.operationEvidence = (preferred.operationEvidence || []).concat([secondary]);
                } else if (primary && secondary &&
                    String(primary.formationId) !== String(secondary.formationId)) {
                  // Conflicting observations cannot select a physical carset.
                  preferred.vehicleFormationId = "";
                  preferred.vehicleFormationCandidates = [];
                  preferred.operationEvidence = [];
                  preferred.vehicleFormationConflict = true;
                }
              }
              _chainVehicleCandidates[cid] = preferred;
            }
            Object.keys(posMap).forEach(function(_vlid) {
              (posMap[_vlid] || []).forEach(function(_rp) {
                if (!_rp) return;
                var _bridgeKey = _chainBridgeKey(_vlid, _rp);
                if (!_rp.runningChainId && _bridgeKey &&
                    _scheduledEstimateCounts[_bridgeKey] === 1 &&
                    _scheduledLiveCounts[_bridgeKey] === 1 &&
                    _chainsByScheduledKey[_bridgeKey]) {
                  var _chainIds = Object.keys(_chainsByScheduledKey[_bridgeKey]);
                  if (_chainIds.length === 1) _rp.runningChainId = _chainIds[0];
                }
                _queueChainVehicle(_rp);
              });
            });
            // Positionless realtime rows may contribute vehicle identity only
            // after a unique physical chain is known. They never create position.
            Object.keys(_realtimeEvidenceWithoutPosition).forEach(function(_evKey) {
              var _ev = _realtimeEvidenceWithoutPosition[_evKey];
              if (!_ev || !_ev.trainNumber || !_ev.vehicleType) return;
              // Positionless evidence must not join a different railway
              // that happens to reuse the same number. Require one mapped
              // line, date, direction, scheduled run, and canonical chain.
              var _evRailway = String(_ev.railway || "").split(".").pop();
              if (!_evRailway || !_ev.railDirection) return;
              var _evLines = Object.keys(estimated).filter(function(lid) {
                return lid === _evRailway ||
                  (_railwayCodes && _railwayCodes[lid] === _evRailway);
              });
              if (_evLines.length !== 1) return;
              var _evMatchKey = _chainBridgeKey(_evLines[0], {
                trainNumber:_ev.trainNumber,
                serviceDate:_snapshotServiceDate,
                railDirection:_ev.railDirection
              });
              if (!_evMatchKey || _scheduledEstimateCounts[_evMatchKey] !== 1) return;
              var _evChains = _chainsByScheduledKey[_evMatchKey] || {};
              var _evChainIds = Object.keys(_evChains);
              if (_evChainIds.length !== 1) return;
              var _evResolution = (window.TrainVehicle && typeof window.TrainVehicle.resolve === "function")
                ? window.TrainVehicle.resolve({trainNumber:_ev.trainNumber,realtimeVehicleType:_ev.vehicleType}) : null;
              var _evSources = _evResolution && Array.isArray(_evResolution.sources) ? _evResolution.sources : [];
              if (!_evResolution || _evResolution.identityStatus !== "EXACT" ||
                  (_evSources.indexOf("realtime") < 0 && _evResolution.source !== "realtime")) return;
              _queueChainVehicle({
                runningChainId:_evChainIds[0], trainClass:_evResolution.name||"",
                vehicleType:_evResolution.vehicleTypeStr||_ev.vehicleType,
                vehicleIconPath:_evResolution.iconPath, vehicleSource:_evResolution.source||"realtime",
                vehicleConfidence:_evResolution.confidence||"high", vehicleResolution:_evResolution,
                vehicleIdentityStatus:_evResolution.identityStatus,
                vehicleIdentityReason:_evResolution.identityReason||"", vehicleResolvedFromRealtime:true
              });
            });
            Object.keys(estimated).forEach(function(_vlid) {
              (estimated[_vlid] || []).forEach(function(_p) {
                _queueChainVehicle(_p);
                // Formation evidence is another candidate for the same physical
                // chain. Queue it before the single registry commit; never write
                // the registry again later in the fusion pass.
                if (window.TrainVehicle && typeof window.TrainVehicle.resolveFormationEvidence === "function" &&
                    typeof window.TrainVehicle.resolve === "function") {
                  var _fe = window.TrainVehicle.resolveFormationEvidence({
                    lineId: _vlid,
                    runningChainId: _p && _p.runningChainId,
                    at: Date.now()
                  });
                  if (_fe) {
                    var _feResolution = {
                      name:_fe.vehicleName||"", vehicleTypeStr:_fe.vehicleName||"", iconPath:_fe.iconPath||"",
                      source:"formation-evidence", sources:["formation-evidence"], confidence:_fe.confidence||"high",
                      identityStatus:_fe.identityStatus||"EXACT",
                      identityReason:_fe.identityReason||"dated-running-chain-vehicle-evidence"
                    };
                    _queueChainVehicle({
                      runningChainId:_p.runningChainId, serviceDate:_fe.serviceDate || _p.serviceDate,
                      trainClass:_feResolution.name,
                      vehicleType:_feResolution.vehicleTypeStr, vehicleIconPath:_feResolution.iconPath,
                      vehicleSource:_feResolution.source, vehicleConfidence:_feResolution.confidence,
                      vehicleResolution:_feResolution, vehicleIdentityStatus:_feResolution.identityStatus,
                      vehicleIdentityReason:_feResolution.identityReason,
                      vehicleFormationId:_fe.formationId||"", vehicleFormationCandidates:_fe.formationId?[_fe.formationId]:[]
                    });
                  }
                }
              });
            });
            // One physical chain, one registry commit per fusion pass.
            Object.keys(_chainVehicleCandidates).forEach(function(_cid) {
              _rememberChainVehicle(_chainVehicleCandidates[_cid]);
            });
            // Timetable/SQL EXACT evidence has now seeded the registry.
            // Apply it to realtime-position rows on the same unique running
            // chain only when no stronger realtime vehicle identity already
            // established that chain.
            Object.keys(posMap).forEach(function(_vlid) {
              (posMap[_vlid] || []).forEach(function(_p) {
                _inheritChainVehicle(_p);
              });
            });
            Object.keys(estimated).forEach(function(_vlid) {
              (estimated[_vlid] || []).forEach(function(_p) {
                _inheritChainVehicle(_p);
              });
            });

            // Keep registry lifetime scoped to chains that still exist in the
            // current realtime/timetable snapshot. This prevents a long-lived
            // browser tab from reusing stale vehicle identity if a chain id is
            // later recycled by upstream timetable data.
            var _activeChainIds = {};
            Object.keys(posMap).forEach(function(_vlid) {
              (posMap[_vlid] || []).forEach(function(_p) {
                if (_p && _p.runningChainId) _activeChainIds[_p.runningChainId] = true;
              });
            });
            Object.keys(estimated).forEach(function(_vlid) {
              (estimated[_vlid] || []).forEach(function(_p) {
                if (_p && _p.runningChainId) _activeChainIds[_p.runningChainId] = true;
              });
            });
            // Crossing a realtime coverage boundary must not make a physical
            // train forget an already-confirmed vehicle. As long as the canonical
            // running chain is still active (including timetable-only branch
            // segments), refresh identity lifetime without manufacturing position.
            Object.keys(_activeChainIds).forEach(function(_cid) {
              if (_chainVehicleRegistry[_cid]) _chainVehicleRegistry[_cid].lastSeenAt = Date.now();
            });
            Object.keys(_chainVehicleRegistry).forEach(function(_cid) {
              var _cv = _chainVehicleRegistry[_cid];
              // Do not erase confirmed identity on the first missing realtime
              // poll. A train can enter a no-signal/no-public-position segment
              // while its timetable running chain remains valid. Expire only
              // after a bounded dropout window; never use this cache as position.
              if (!_activeChainIds[_cid] && (!_cv || !_cv.lastSeenAt ||
                  (Date.now() - _cv.lastSeenAt) > _CHAIN_EVIDENCE_TTL_MS)) {
                delete _chainVehicleRegistry[_cid];
              }
            });
            var estCount = 0;
            Object.keys(estimated).forEach(function(lid) {
              var _est = estimated[lid];
              if (!_est || !_est.length) return;
              // 无条件合并（去重：实时/直通插入优先，推定补缺）——
              // 此前 posMap 非空（有实时或直通插入列车）时推定列车全丢，
              // 导致副都心/千代田/日比谷/東西 等直通线页面只剩 1-3 列直通插入车（卡 join/末站），
              // 自社时刻表列车（银座/丸ノ内等无直通实时插入的线推定全量正常）完全缺失。
              // One merge path whether the live map is empty or populated.
              // SQL, ODPT and manual rows may describe the same scheduled run
              // with different object IDs; train number is a same-line
              // secondary guard, never a replacement for the running-chain ID.
              if (!posMap[lid]) posMap[lid] = [];
              // Retain the bridge's day/number/direction scope, adding the
              // original railway namespace when available. Identity inheritance
              // still requires one unambiguous scheduled match.
              function _sameLineNumberKey(p) { return _sourcePositionKey(p) || _chainBridgeKey(lid, p); }
               function _terminalMatchKey(p) {
                 if (!p) return "";
                 var lineMeta = (typeof allLines !== "undefined" && allLines[lid]) || {};
                 var operationRules = lineMeta.operationRules || {};
                 var num = String(p.operationCode || p.trainNumber || "").trim().toUpperCase();
                 if (!num) return "";
                 // Some providers publish a compact service suffix (42G),
                 // while timetable rows retain the full public number (2142G).
                 // The canonical line rule owns this normalization; fusion
                 // must not grow another operator-specific branch.
                 if (operationRules.realtimeTrainNumberNormalization === "toei-service-suffix") {
                   var _service = num.match(/(\d{2})([ABGKNHT])(?:[A-Z0-9]*)$/);
                   if (_service) num = _service[1] + _service[2];
                 }
                 var date = String(p.serviceDate || "").slice(0, 10);
                 var dir = String(p.railDirection || "").split(/[:.]/).pop().trim().toUpperCase();
                 if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !dir) return "";
                 return "terminal-match:" + [lid, date, num, dir].map(function(v) {
                   return encodeURIComponent(String(v));
                 }).join("|");
               }
              var _estKeyCounts = Object.create(null);
              var _liveKeyCounts = Object.create(null);
               var _estTerminalKeyCounts = Object.create(null);
               var _liveTerminalKeyCounts = Object.create(null);
              var _liveSourceCounts = Object.create(null);
              function _sourcePositionKey(p) {
                var resolver = window.RunningChainResolver;
                return resolver && typeof resolver.sourcePositionMatchKey === 'function'
                  ? resolver.sourcePositionMatchKey(lid, p) : '';
              }
              _est.forEach(function(p) {
                if (!p) return;
                var k = _sameLineNumberKey(p);
                if (k) _estKeyCounts[k] = (_estKeyCounts[k] || 0) + 1;
                 var terminalKey = _terminalMatchKey(p);
                 if (terminalKey) _estTerminalKeyCounts[terminalKey] = (_estTerminalKeyCounts[terminalKey] || 0) + 1;
              });
              posMap[lid].forEach(function(p) {
                var k = _sameLineNumberKey(p);
                if (k) _liveKeyCounts[k] = (_liveKeyCounts[k] || 0) + 1;
                 var terminalKey = _terminalMatchKey(p);
                 if (terminalKey) _liveTerminalKeyCounts[terminalKey] = (_liveTerminalKeyCounts[terminalKey] || 0) + 1;
                var sourceKey = p && !p.estimated && _sourcePositionKey(p);
                if (sourceKey) _liveSourceCounts[sourceKey] = (_liveSourceCounts[sourceKey] || 0) + 1;
              });
              var _haveId = Object.create(null);
              var _haveScheduledKey = Object.create(null);
              posMap[lid].forEach(function(p) {
                if (!p) return;
                if (_positionIdentity(p)) _haveId[_positionIdentity(p)] = true;
                var k = _sameLineNumberKey(p);
                if (k) _haveScheduledKey[k] = true;
              });
              var _addN = 0;
              _est.forEach(function(p) {
                if (!p) return;
                var _pid = _positionIdentity(p);
                // One current observation owns this source run's position even
                // when SQL has conflicting variants. This does not bridge their
                // vehicle identity or inherit ambiguous destination information.
                var _sourceKey = _sourcePositionKey(p);
                if (_sourceKey && _liveSourceCounts[_sourceKey] === 1) return;
                var _noKey = _sameLineNumberKey(p);
                var _uniqueSchedule = _noKey &&
                  _estKeyCounts[_noKey] === 1 && _liveKeyCounts[_noKey] === 1;
                if ((_pid && _haveId[_pid]) ||
                    (_uniqueSchedule && _haveScheduledKey[_noKey])) return;
                posMap[lid].push(p);
                if (_pid) _haveId[_pid] = true;
                if (_noKey) _haveScheduledKey[_noKey] = true;
                _addN++;
              });
              estCount += _addN;
              // Realtime owns position. Missing destination is inherited
              // only from identical chain or uniquely matched timetable run.
              var _estById = Object.create(null);
              var _estByScheduledKey = Object.create(null);
               var _estByTerminalKey = Object.create(null);
              _est.forEach(function(p) {
                if (!p) return;
                if (_positionIdentity(p)) _estById[_positionIdentity(p)] = p;
                var k = _sameLineNumberKey(p);
                if (k && _estKeyCounts[k] === 1 && !_estByScheduledKey[k]) {
                  _estByScheduledKey[k] = p;
                }
                 var terminalKey = _terminalMatchKey(p);
                 if (terminalKey && _estTerminalKeyCounts[terminalKey] === 1 && !_estByTerminalKey[terminalKey]) {
                   _estByTerminalKey[terminalKey] = p;
                 }
              });
              posMap[lid].forEach(function(p) {
                if (!p || p.destinationStation) return;
                var match = _positionIdentity(p) && _estById[_positionIdentity(p)];
                var k = _sameLineNumberKey(p);
                if (!match && k && _estKeyCounts[k] === 1 &&
                    _liveKeyCounts[k] === 1) match = _estByScheduledKey[k];
                 if (!match) {
                   var terminalKey = _terminalMatchKey(p);
                   if (terminalKey && _estTerminalKeyCounts[terminalKey] === 1 &&
                       _liveTerminalKeyCounts[terminalKey] === 1) {
                     match = _estByTerminalKey[terminalKey];
                   }
                 }
                if (match && match.destinationStation) p.destinationStation = match.destinationStation;
              });
            });
            if (estCount > 0) {
              console.debug("[DataFusion] Estimated", estCount, "train positions for", Object.keys(estimated).length, "lines");
            }

            // Manual timetable rows already enter the same estimator via
            // registerManualTimetable(). A second manual-only position pass
            // duplicated SQL/ODPT trains under different source identities.

          }
        } catch(estErr) { console.debug("[DataFusion] Position estimation error:", estErr.message); }
        finally { _perfRecord("doEstimation", _estPerfStart, { requested: requestedLineIds ? requestedLineIds.length : "all", positionLines: Object.keys(posMap || {}).length }); }
      }

      // Timetable positions advance with wall-clock minutes even when the
      // network payload is identical. Run a full estimation at most once per
      // minute; within the same minute, re-estimate only lines touched by the
      // realtime snapshot plus their dependency neighbourhood.
      var _minuteKey = Math.floor(Date.now() / 60000);
      var _estimationSeeds = [];
      var _seenEstimationSeed = {};
      // Visible SQL maps and their rendered dependencies advance on EVERY poll.
      // Rebuilding the live snapshot must not erase them between minute batches.
      (window.TrainsActivePositionLineIds || window.TrainsActiveSystemLineIds || []).forEach(function(id) {
        if (allLines[id] && !_seenEstimationSeed[id]) {
          _seenEstimationSeed[id] = true; _estimationSeeds.push(id);
        }
      });
      Object.keys(posMap || {}).forEach(function(id) {
        if (!_seenEstimationSeed[id]) { _seenEstimationSeed[id] = true; _estimationSeeds.push(id); }
      });
      var _minuteAdvanced = _minuteKey !== _lastEstimationMinute;
      var _estimationTargets = _expandDirtyLines(_estimationSeeds, allLines);
      // Keep the current realtime neighbourhood synchronous so the visible
      // snapshot is coherent, but never turn a minute boundary into one
      // full-network main-thread task. Timetable-only lines still need their
      // clock-driven positions advanced once per minute, so process the
      // remainder cooperatively in small batches between browser turns.
      doEstimation(_estimationTargets);
      if (_minuteAdvanced) {
        var _targetSet = {};
        (_estimationTargets || []).forEach(function(id) { _targetSet[id] = true; });
        var _minuteRemainder = Object.keys(allLines || {}).filter(function(id) {
          var registered = window.TrainPositionEstimator && window.TrainPositionEstimator.getRegisteredManualTimetable &&
            window.TrainPositionEstimator.getRegisteredManualTimetable(id);
          var hasSchedule = (registered && registered.length) || hasOdptTimetableForLine(id, allLines[id] && allLines[id].operator);
          return !_targetSet[id] && hasSchedule;
        });
        var _minuteBatchToken = _minuteKey;
        var _minuteBatchGeneration = ++_minuteEstimationGeneration;
        var _minuteBatchSize = 8;
        (function _runMinuteBatch(offset) {
          if (_minuteBatchGeneration !== _minuteEstimationGeneration ||
              _minuteBatchToken !== Math.floor(Date.now() / 60000)) return;
          var batch = _minuteRemainder.slice(offset, offset + _minuteBatchSize);
          if (!batch.length) return;
          setTimeout(function() {
            try {
              doEstimation(batch);
              fuseDirty(batch);
            } catch(e) {
              console.debug("[DataFusion] minute estimation batch error:", e.message);
            }
            _runMinuteBatch(offset + _minuteBatchSize);
          }, 0);
        })(0);
      }
      _lastEstimationMinute = _minuteKey;

      try {
        var _positionDirty = {};
        var _positionKeys = {};
        var _positionChanges = {};
        Object.keys(_previousPosMap || {}).forEach(function(id) { _positionKeys[id] = true; });
        Object.keys(posMap || {}).forEach(function(id) { _positionKeys[id] = true; });
        Object.keys(_positionKeys).forEach(function(id) {
          var changes = classifyPositionChanges(_previousPosMap[id] || [], posMap[id] || []);
          if (changes.position || changes.display || changes.metadata) {
            _positionDirty[id] = true;
            _positionChanges[id] = changes;
          }
        });
        fuseDirty(Object.keys(_positionDirty), { kind: 'positions', lines: _positionChanges });
        // Report aggregate resolver costs without logging individual train identities.
        _perfSamples.push({ name: "vehicleEvidence", ms: Math.round(_vehicleEvidenceMs * 10) / 10, at: Date.now(), meta: { calls: _vehicleEvidenceCalls } });
        _perfSamples.push({ name: "vehicleResolve", ms: Math.round(_vehicleResolveMs * 10) / 10, at: Date.now(), meta: { calls: _vehicleResolveCalls, errors: _vehicleResolveErrors } });
        if (_perfSamples.length > 40) _perfSamples.splice(0, _perfSamples.length - 40);
        _lastPositionSourceRefs = Object.create(null);
        Object.keys(positionSource).forEach(function(op) {
          _lastPositionSourceRefs[op] = positionSource[op];
        });
        _lastPositionLoadAt = Date.now();
        loadTrainPositions._calibrated = true;
        _perfRecord("loadTrainPositions", _perfStart, { dirty: Object.keys(_positionDirty).length, positionLines: Object.keys(posMap || {}).length });
      } catch(e) { _perfRecord("loadTrainPositions:error", _perfStart); console.debug("[DataFusion] loadTrainPositions->fuseDirty error:", e.message); }

    } catch(e) { console.debug("[DataFusion] loadTrainPositions error:", e.message); }
  }

  // ========== Persist fused snapshots ==========
  function saveToCache() {
    try {
      if (!window.RailwayRTC || !_lastFusedData) return;
      // The timer is a persistence opportunity, not a reason to rewrite the
      // same snapshot. Skip the all-line scan and IndexedDB writes until fusion
      // has actually emitted newer data.
      if (_lastFusionEmitAt && _lastFusionEmitAt <= _lastCacheSavedFusionAt) return;
      var posList = [];
      var delayMap = {};
      var fusedLines = _lastFusedData.lines || {};
      Object.keys(fusedLines).forEach(function(lid) {
        var fl = fusedLines[lid];
        if (fl && fl.realtimePositions && fl.realtimePositions.length > 0) {
          posList.push({ lineId: lid, positions: fl.realtimePositions });
        }
        if (fl && fl.delayInfo) {
          delayMap[lid] = { status: fl.delayInfo.status, maxDelay: fl.delayInfo.maxDelay, interval: fl.delayInfo.interval, cause: fl.delayInfo.cause };
        }
      });
      window.RailwayRTC.savePositions(posList);
      window.RailwayRTC.saveDelayInfo(delayMap);
      _lastCacheSavedFusionAt = _lastFusionEmitAt || Date.now();
    } catch(e) {}
  }
  function init() {
    if (_initialized) return;
    _initialized = true;
    checkCacheStale();
    fuseAll();
    _refreshIntervalMs = (window.RuntimeConfig && window.RuntimeConfig.REFRESH_INTERVAL) || 15000;
    startFusionPolling();
    (function pollUnified() {
      var checkLines = (window.DataLayer && window.DataLayer.getAllLines) ? window.DataLayer.getAllLines() : {};
      if (checkLines && Object.keys(checkLines).length > 0) {
        // pt:railway-ready is the authoritative late-load convergence path.
        // Keep polling only as a compatibility fallback for external/legacy
        // data injection that does not emit the readiness signal.
        var fusedLines = _lastFusedData && _lastFusedData.lines;
        if (!fusedLines || Object.keys(fusedLines).length === 0) {
          fuseAll();
        }
        // 数据就绪后，如果当前在 trains.html 线路详情页（hash 有 lineId），
        // 自动触发一次 ensureTimetable——showLineView 可能在 DataFusion 未就绪时
        // 已从 DataLayer 渲染站表并跳过了服务日计划加载。
        try {
          var h = (window.location.hash || "").replace(/^#/, "");
          var isTrainsPage = (window.location.pathname || "").indexOf("trains.html") >= 0;
          if (isTrainsPage && h && window.DataFusion && window.DataFusion.ensureTimetable) {
            window.DataFusion.ensureTimetable(h).catch(function(e) {
              console.debug("[DataFusion] auto-ensure timetable error:", h, e.message);
            });
          }
          // No timetable warm-up here. trains.html activates timetable work only
          // after the user opens a line; this keeps first-load CPU/network bounded.
        } catch(e) {}
        return;
      }
      setTimeout(pollUnified, 500);
    })();
  }

  window.addEventListener("pt:railway-ready", function() {
    // Canonical readiness is the single late-load/retry convergence point.
    // Rebuild baseline once even if init ran against an empty DataLayer.
    try {
      fuseAll();
    } catch(e) {
      console.debug("[DataFusion] railway-ready fuse error:", e.message);
    }
  });

  function _hasOdptTimetable(lineId) {
    try {
      var lines = (window.DataLayer && window.DataLayer.getAllLines) ? window.DataLayer.getAllLines() : {};
      var line = lines && lines[lineId];
      if (line && hasOdptTimetableForLine(lineId, line.operator)) return true;
      // Compatibility fallback for a line not yet present in DataLayer: check
      // every indexed operator without rescanning raw timetable rows.
      var idx = getTimetablePresenceIndex();
      var code = (window.ODPTClient && window.ODPTClient.LINE_RAILWAY_CODE &&
        window.ODPTClient.LINE_RAILWAY_CODE[lineId]) || lineId;
      return Object.keys(idx).some(function(op) {
        return !!(idx[op] && (idx[op][lineId] || idx[op][code]));
      });
    } catch(e) {}
    return false;
  }

  function refreshTimetableLines(lineId, reason) {
    try {
      var targets = _expandDirtyLines([lineId], allLines);
      if (typeof doEstimation === "function") doEstimation(targets);
      else loadTrainPositions();
      fuseDirty([lineId]);
    } catch(err) {
      console.debug("[DataFusion] " + reason + ":", err.message);
    }
  }

  function ensureTimetable(lineId) {
    // SQL owns service-date plans for every coverage mode. Fusion protects live rows.
    // A partner's SQL timetable may already have been loaded into the shared
    // ODPT-shaped pool by ODPTClient. Re-estimate through evidence without
    // registering those same rows as a second manual timetable source.
    var date = window.TrainPositionEstimator && window.TrainPositionEstimator.getCurrentServiceDate
      ? window.TrainPositionEstimator.getCurrentServiceDate() : "";
    if (_hasOdptTimetable(lineId) || (date && _positionServiceDate[lineId] === date)) {
      var client = window.ODPTClient;
      var identity = client && client.getLineRailwayIdentity && client.getLineRailwayIdentity(lineId);
      var op = client && client.LINE_TO_OPERATOR && client.LINE_TO_OPERATOR[lineId];
      var shared = window.ODPT_TIMETABLES && window.ODPT_TIMETABLES[op] || [];
      var currentSql = identity && shared.some(function(tt) {
        var actual = client.parseRailwayIdentity(tt);
        return tt._positionSource === "supabase-train-run" && tt._serviceDate === date &&
          actual && actual.key === identity.key;
      });
      if (currentSql && !_positionLoadedAt[lineId]) {
        var sharedStatus = client.getTrainRunStatus && client.getTrainRunStatus(lineId);
        if (sharedStatus && (sharedStatus.complete || sharedStatus.partial) && sharedStatus.serviceDate === date) {
          _positionLoadedAt[lineId] = sharedStatus.updatedAt || 0;
        }
      }
      if ((currentSql || (date && _positionServiceDate[lineId] === date)) &&
          Date.now() - (_positionLoadedAt[lineId] || 0) < 600000) {
        _positionServiceDate[lineId] = date;
        if (typeof refreshTimetableLines === "function") {
          refreshTimetableLines(lineId, "ready timetable refresh");
        }
        return Promise.resolve(true);
      }
    }
    // Empty/error results never activate a parallel local timetable.
    if (!window.ODPTClient || typeof window.ODPTClient.getCachedTrainRuns !== "function") {
      return Promise.resolve(false);
    }
    return window.ODPTClient.getCachedTrainRuns(lineId).then(function(rows) {
      var status = window.ODPTClient.getTrainRunStatus && window.ODPTClient.getTrainRunStatus(lineId);
      if (!rows || (!rows.length && !(status && (status.complete || status.partial)))) return false;
      _positionServiceDate[lineId] = rows.length ? rows[0]._serviceDate || "" : status.serviceDate || "";
      _positionLoadedAt[lineId] = Date.now();
      // Replace this railway snapshot, including a confirmed empty/cancelled
      // result. A stale SQL copy in the shared ODPT pool cannot resurrect it.
      Object.keys(window.ODPT_TIMETABLES || {}).forEach(function(owner) {
        var pool = window.ODPT_TIMETABLES[owner];
        if (!Array.isArray(pool)) return;
        window.ODPT_TIMETABLES[owner] = pool.filter(function(tt) {
          return !(tt && tt._positionSource === "supabase-train-run" && tt._sqlLineId === lineId);
        });
      });
      if (window.TrainPositionEstimator && typeof window.TrainPositionEstimator.registerManualTimetable === "function") {
        window.TrainPositionEstimator.registerManualTimetable(lineId, rows);
      }
      if (typeof refreshTimetableLines === "function") {
        refreshTimetableLines(lineId, "ensureTimetable refresh");
      }
      return true;
    }).catch(function() { return false; });
  }

  window.DataFusion = {
    init: init, fuseAll: fuseAll, fuseDirty: fuseDirty, subscribe: subscribe,
    getFusedData: function() { return window.DATA_FUSION || _lastFusedData || null; },
    getLine: function(lineId) { var data = window.DATA_FUSION || _lastFusedData; return data && data.lines ? data.lines[lineId] : null; },
    getOdptData: function() { return odptData; },
    getRealtimePositions: function(lineId) { return odptData.realtimePositions[lineId] || []; },
    loadTrainPositions: loadTrainPositions,
    getCachedData: function() { return _lastFusedData; },
    classifyPositionChanges: classifyPositionChanges,
    _selectScopedRecords: selectScopedRecords, _pickRecord: pickRecord,
    _aggregateStatus: aggregateStatus, _evaluateRecord: evaluateRecord,
    getPerformanceSamples: function() { return _perfSamples.slice(); },
    saveToCache: saveToCache, refresh: function() { return fuseAll(); },
    ensureTimetable: ensureTimetable,
    // Direct operational neighbours come from the running-chain authority.
    getDirectThroughLines: function(lineId) {
      return _directThroughLines(lineId);
    },
    updateOdptData: function(delayData) {
      if (delayData && typeof delayData === 'object') {
        var previous = odptData.delayInfo || {};
        odptData.delayInfo = delayData;
        try {
          var dirtyOps = {};
          var opKeys = {};
          Object.keys(previous).forEach(function(op) { opKeys[op] = true; });
          Object.keys(delayData).forEach(function(op) { opKeys[op] = true; });
          Object.keys(opKeys).forEach(function(op) {
            var b = delayData[op];
            var sb = b == null ? String(b) : JSON.stringify(b);
            var sa;
            if (Object.prototype.hasOwnProperty.call(_delayInfoSignatures, op)) {
              sa = _delayInfoSignatures[op];
            } else {
              var a = previous[op];
              sa = a == null ? String(a) : JSON.stringify(a);
            }
            if (sa !== sb) dirtyOps[op] = true;
            _delayInfoSignatures[op] = sb;
          });
          // Drop signatures for operators no longer present so the cache cannot
          // retain stale payload strings indefinitely.
          Object.keys(_delayInfoSignatures).forEach(function(op) {
            if (!Object.prototype.hasOwnProperty.call(delayData, op)) delete _delayInfoSignatures[op];
          });
          var lines = (window.DataLayer && window.DataLayer.getAllLines) ? window.DataLayer.getAllLines() : {};
          var dirtyLines = [];
          Object.keys(lines || {}).forEach(function(id) {
            var line = lines[id] || {};
            var op = getOperatorForLine(id, line.name) || line.operator || "";
            var normalized = _normalizeOperator(op);
            if (dirtyOps[op] || dirtyOps[normalized]) dirtyLines.push(id);
          });
          if (dirtyLines.length) fuseDirty(dirtyLines);
        } catch(e) { console.debug('[DataFusion] updateOdptData->fuseDirty error:', e.message); fuseAll(); }
      }
    }
  };

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }
  document.addEventListener("pt-runinfo-updated", function(event) {
    if (event.detail && event.detail.lineId) fuseDirty([event.detail.lineId]); else fuseAll();
  });
  window.addEventListener("beforeunload", function() {
    if (_positionTimer) clearInterval(_positionTimer);
    if (_cacheTimer) clearInterval(_cacheTimer);
  });
})();
