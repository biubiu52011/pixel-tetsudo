/* trains-data.js: 列车页数据读取（全局） */

// 全局缓存
var _routeGeometryCache = {};
var _transferMapCache = null;
var _staticNetworkState = { signature: null, revision: 0 };

// 签名只包含静态事实，不得包含位置、状态或时间。
// 融合记录和 canonical 记录都需要：融合层会有意省略部分
// 换乘/关系字段，后到的 canonical 数据可能替换这些字段。
function _staticNetworkSignature() {
  var lang = window.currentLang || "ja";
  var canonical = window.RailwayDB && window.RailwayDB.getAllLines
    ? window.RailwayDB.getAllLines() : window.UNIFIED_LINES || {};
  function project(lines) {
    return Object.keys(lines).sort().map(function(id) {
      var l = lines[id] || {};
      return [id,l.stations,l.type,l.color,l.image,l.code,l.operator,l.branchOf,
      l.presentation,l.serviceBoundaries,l.throughServices,l.servicePatterns,l.transferStations,
        l.isSixShapedLoop,l.isDoubleColumnLoop,l.loopJunction,
        window.LineOperationSystemsResolveColor ? window.LineOperationSystemsResolveColor(id) : null];
    });
  }
  var names = {};
  Object.keys(canonical).forEach(function(id) {
    (canonical[id].stations || []).forEach(function(s) {
      if (names[s] == null) names[s] = window.RailwayDB && window.RailwayDB.resolveStationName
        ? window.RailwayDB.resolveStationName(s, lang) : s;
    });
  });
  var signature = JSON.stringify([project(canonical),project(getLinesData()),names,lang,
    window.TrainsActiveSystemLineIds || [], window.RuntimeConfig || {}]);
  if (_staticNetworkState.signature !== signature) {
    _staticNetworkState.signature = signature;
    _staticNetworkState.revision++;
  }
  // 只保留一份精确的网络快照，不要复制到每个
  // 缓存线路几何中。相等性保持精确，不产生有损哈希冲突。
  return _staticNetworkState.revision;
}

function _canonicalThroughLines(lineId) {
  var line = window.UNIFIED_LINES && window.UNIFIED_LINES[lineId];
  var corridors = (window.RuntimeConfig || {}).SERVICE_CORRIDOR_LINES || {};
  return line && Array.isArray(line.throughServices) ? line.throughServices.filter(function(id) {
    // 服务走廊不会作为独立数据源显示，但它
    // 在所属线路声明相同边界时仍是有效的面向乘客直通区段。
    // 保留该关系的可见性，但不要
    // 将走廊变成第二个实时来源。
    if (!corridors[id]) return true;
    return Array.isArray(line.serviceBoundaries) && line.serviceBoundaries.some(function(boundary) {
      return boundary && boundary.lineId === id && Array.isArray(boundary.handoverStations) && boundary.handoverStations.length > 0;
    });
  }) : [];
}

function _canonicalJoinStations(lineId, partnerId) {
  var line = window.UNIFIED_LINES && window.UNIFIED_LINES[lineId];
  var boundaries = line && Array.isArray(line.serviceBoundaries) ? line.serviceBoundaries : [];
  for (var i = 0; i < boundaries.length; i++) {
    var boundary = boundaries[i];
    if (boundary && boundary.lineId === partnerId) {
      return Array.isArray(boundary.handoverStations) ? boundary.handoverStations.slice() : null;
    }
  }
  return null;
}

function getLinesData() {
  if (window.DataFusion) {
    var fused = window.DataFusion.getFusedData();
    if (fused && fused.lines && Object.keys(fused.lines).length > 0) {
      return fused.lines;
    }
  }
  var rawLines = window.DataLayer ? window.DataLayer.getAllLines() : (window.UNIFIED_LINES || {});
  var ul = Array.isArray(rawLines) ? (function() { var d = {}; rawLines.forEach(function(l) { d[l.id || l.line_id] = l; }); return d; })() : rawLines;
  if (!ul) return {};
  var lines = {};
  var ids = Object.keys(ul);
  for (var i = 0; i < ids.length; i++) {
    var l = ul[ids[i]];
    if (!l) continue;
    lines[ids[i]] = {
      id: ids[i],
      name: l.name || ids[i],
      nameEn: l.nameEn || l.name || ids[i],
      code: l.code || ids[i],
      color: (window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(ids[i])) || l.color || (window.TrainsColors ? window.TrainsColors.LINE_UNKNOWN : "#888888"),
      operator: l.operator || "Unknown",
      region: l.region || "",
      type: l.type || "straight",
      image: l.image || "",
      stations: l.stations || [],
      durations: l.durations || [],
      realtimePositions: [],
      nameJa: l.nameJa || l.name || ids[i],
      branchOf: l.branchOf || null,
      serviceBoundaries: Array.isArray(l.serviceBoundaries) ? l.serviceBoundaries : [],
      throughServices: Array.isArray(l.throughServices) ? l.throughServices : [],
      servicePatterns: Array.isArray(l.servicePatterns) ? l.servicePatterns : [],
      isSixShapedLoop: l.isSixShapedLoop === true,
      isDoubleColumnLoop: l.isDoubleColumnLoop === true,
      loopJunction: l.loopJunction || null,
      presentation: l.presentation || null
    };
  }
  return lines;
}

function getRealtimePositions(lineId) {
  var positions = _getBasePositions(lineId);
  // 此映射读取原始位置。使用与 DataFusion 和几何层相同的
  // 物理区段权威投影关联服务。
  if(window.SharedTrackPairs && window.SharedTrackPairs.projectPosition){
    positions=positions.slice();
    var known={};positions.forEach(function(p){var id=p.runningChainId||p.trainId;if(id)known[id]=true;});
    window.SharedTrackPairs.getSharedLines(lineId).forEach(function(peer){
      _getBasePositions(peer).forEach(function(p){
        var id=p.runningChainId||p.trainId;if(id&&known[id])return;
        var projected=window.SharedTrackPairs.projectPosition(lineId,peer,p);
        if(projected){positions.push(projected);if(id)known[id]=true;}
      });
    });
  }
  var ext = _fusionExtensionLines(lineId);
  if (ext && ext.length > 0) {
    var all = positions.slice();
    for (var ei = 0; ei < ext.length; ei++) {
      var ep = _getBasePositions(ext[ei].lid);
      for (var ej = 0; ej < ep.length; ej++) {
        var np = {};
        for (var pk in ep[ej]) { if (ep[ej].hasOwnProperty(pk)) np[pk] = ep[ej][pk]; }
        np.fusionLineId = ext[ei].lid;
        np.fusionRole = "extension";
        all.push(np);
      }
    }
    positions = all;
  }
  var _src = (window.RailwayDB && window.RailwayDB.getAllLines) ? window.RailwayDB.getAllLines() : getLinesData();
  var _brs = window.LinePresentationService ? window.LinePresentationService.getMapBranchIds(lineId, _src) : [];
  if (_brs.length > 0) {
    var _all2 = positions.slice();
    for (var _bi2 = 0; _bi2 < _brs.length; _bi2++) {
      var _blid = _brs[_bi2];
      if (!_src[_blid] || !_src[_blid].stations || _src[_blid].stations.length === 0) continue;
      var _bp = _getBasePositions(_blid);
      for (var _bj = 0; _bj < _bp.length; _bj++) {
        var _np2 = {};
        for (var _pk2 in _bp[_bj]) { if (_bp[_bj].hasOwnProperty(_pk2)) _np2[_pk2] = _bp[_bj][_pk2]; }
        _np2.fusionLineId = _blid;
        _np2.fusionRole = "branch";
        _all2.push(_np2);
      }
    }
    return _dedupeTrainPositions(_all2, lineId);
  }
  return _dedupeTrainPositions(positions, lineId);
}

function _isFreshRealtimePosition(p) {
  if (!p || p.positionSource !== "realtime-api") return false;
  // 缺失有效性元数据不是过期证据；保留现有
  // 实时优先级。但一旦提供 dct:valid，过期/无效
  // 时间戳不得抑制当前时刻表估算。
  if (!p.sourceValidUntil) return true;
  var validUntil = Date.parse(p.sourceValidUntil);
  return !isNaN(validUntil) && validUntil >= Date.now();
}

function _positionSourceRank(p) {
  if (!p) return 9;
  // 来源元数据是权威。DataFusion 明确将 ODPT 实时
  // 位置和时刻表推导位置分别标记。
  // 过期实时数据在去重前失去优先级，使时刻表回退能够
  // 接管，而不是让渲染器之后删除胜出的过期记录。
  if (p.positionSource === "realtime-api") return _isFreshRealtimePosition(p) ? 0 : 8;
  if (p.positionSource === "supabase-train-run") return 1;
  if (p.positionSource === "train-timetable") return 1;
  if (p.positionSource === "station-timetable") return 2;
  if (p.estimated === true) return 3;
  // 未标记的旧位置仍可使用，但不得优先于已知来源。
  return 4;
}

function _trainIdentityKey(p, lineId) {
  if (!p) return "";
  // 每条线路使用相同的已解析运行链/来源对象身份。
  // 单独车次号不是全局唯一，甚至不总是线路内唯一。
  // 保留命名空间：移除 odpt.Train 与 odpt.TrainTimetable
  // 前缀可能把后缀相同但无关的来源对象合并。
  var id = p.runningChainId || p.trainId ||
    p.sourceTrainId || p.timetableObjectId || "";
  id = String(id).trim();
  if (!id) return "";
  // 运行链识别跨公司的一个实体服务，而不是一个
  // 可互换的位置记录。Metro SQL 区段和 JR 实时区段
  // 在直通线路视图同时包含两者时必须仍可分别寻址。
  // 在同一来源线路内，实时数据仍优先于重复的时刻表行。
  var segmentLineId = p.fusionLineId || lineId || "";
  return segmentLineId + "::" + id;
}

function _positionCompleteness(p) {
  if (!p) return 0;
  var score = 0;
  if (p.segmentToIndex != null) score += 4;
  if (p.segmentProgress != null) score += 3;
  if (p.stationId) score += 2;
  if (p.destinationStation) score += 1;
  return score;
}

function _preferTrainPosition(next, cur) {
  if (!cur) return next;
  var nr = _positionSourceRank(next);
  var cr = _positionSourceRank(cur);
  if (nr !== cr) return nr < cr ? next : cur;
  var nc = _positionCompleteness(next);
  var cc = _positionCompleteness(cur);
  if (nc !== cc) return nc > cc ? next : cur;
  if (!!next.fusionLineId !== !!cur.fusionLineId) return next.fusionLineId ? cur : next;
  return cur;
}

function _dedupeTrainPositions(positions, lineId) {
  positions = positions || [];
  var byId = {};
  var order = [];
  var out = [];
  for (var i = 0; i < positions.length; i++) {
    var p = positions[i];
    var key = _trainIdentityKey(p, lineId);
    if (!key) {
      out.push(p);
      continue;
    }
    if (!byId[key]) {
      byId[key] = p;
      order.push(key);
    } else {
      byId[key] = _preferTrainPosition(p, byId[key]);
    }
  }
  for (var j = 0; j < order.length; j++) out.push(byId[order[j]]);
  return out;
}

function _getBasePositions(lineId) {
  try {
    if (window.DataFusion && window.DataFusion.getRealtimePositions) {
      var pos = window.DataFusion.getRealtimePositions(lineId);
      // 当前确认的空快照不得复活旧缓存列车。
      if (Array.isArray(pos)) return pos;
    }
    if (window.DataLayer && window.DataLayer.getCachedPositions) {
      var cp = window.DataLayer.getCachedPositions(lineId);
      if (cp && cp.length > 0) return cp;
    }
    var ul = window.UNIFIED_LINES;
    if (ul && ul[lineId] && ul[lineId].cachedPositions) {
      return ul[lineId].cachedPositions;
    }
  } catch(e) {}
  return [];
}

function _fusionExtensionLines(lineId) {
  try {
    var src = (window.RailwayDB && window.RailwayDB.getAllLines) ? window.RailwayDB.getAllLines() : getLinesData();
    var own = src[lineId];
    if (!own || !own.stations || own.stations.length < 2) return null;
    var first = own.stations[0], last = own.stations[own.stations.length - 1];
    var out = [];
    var sysLineIds = null;
    var activeSystemLineIds = Array.isArray(window.TrainsActiveSystemLineIds) ? window.TrainsActiveSystemLineIds : null;
    if (activeSystemLineIds && activeSystemLineIds.indexOf(lineId) >= 0) {
      sysLineIds = activeSystemLineIds;
    } else if (window.LineOperationSystems) {
      var ops = window.LineOperationSystems;
      for (var ok in ops) {
        var list = ops[ok];
        if (!Array.isArray(list)) continue;
        for (var si = 0; si < list.length; si++) {
          var sys = list[si];
          if (sys && sys.lineIds && sys.lineIds.indexOf(lineId) >= 0 && sys.lineIds.length > 1) {
            sysLineIds = sys.lineIds;
            break;
          }
        }
        if (sysLineIds) break;
      }
    }
    if (sysLineIds) {
      var thr = _canonicalThroughLines(lineId);
      if (thr && thr.length > 0) {
        for (var i = 0; i < sysLineIds.length; i++) {
          var lid2 = sysLineIds[i];
          if (lid2 === lineId) continue;
          if (thr.indexOf(lid2) < 0) continue;
          var l2 = src[lid2];
          if (!l2 || !l2.stations || l2.stations.length < 2) continue;
          if (l2.stations[0] === last) {
            out.push({ lid: lid2, joinAtEnd: true, baseIdx: own.stations.length - 1, systemMember: !!activeSystemLineIds });
          } else if (l2.stations[l2.stations.length - 1] === first) {
            out.push({ lid: lid2, joinAtEnd: false, baseIdx: 0, systemMember: !!activeSystemLineIds });
          }
        }
      }
    }
    var trunk = (window.DataState && window.DataState.TRUNK_MAIN_LINE_IDS) || [];
    var _TRUNK_EXTENSION_ALLOW = (window.RuntimeConfig && window.RuntimeConfig.TRUNK_EXTENSION_ALLOW) || {};
    for (var ti = 0; ti < trunk.length; ti++) {
      var tlid = trunk[ti];
      if (!_TRUNK_EXTENSION_ALLOW[tlid]) continue;
      var tl = src[tlid];
      if (!tl || !tl.stations || tl.stations.length < 2) continue;
      var already = false;
      for (var ai = 0; ai < out.length; ai++) { if (out[ai].lid === tlid) { already = true; break; } }
      if (already) continue;
      if (tl.stations[0] === last) {
        out.push({ lid: tlid, joinAtEnd: true, baseIdx: own.stations.length - 1 });
      } else if (tl.stations[tl.stations.length - 1] === first) {
        out.push({ lid: tlid, joinAtEnd: false, baseIdx: 0 });
      }
    }
    return out.length ? out : null;
  } catch(e) { return null; }
}

function _fusionBaseIdx(lineId, fusionLineId) {
  try {
    var g = _routeGeometryCache[_geomKey(lineId)];
    if (g && g.fusionMap && g.fusionMap[fusionLineId]) return g.fusionMap[fusionLineId].baseIdx;
    var allLines = getLinesData();
    var own = allLines[lineId], ext = allLines[fusionLineId];
    if (own && ext && ext.stations && own.stations) {
      if (ext.stations[0] === own.stations[own.stations.length - 1]) return own.stations.length - 1;
      if (ext.stations[ext.stations.length - 1] === own.stations[0]) return 0;
    }
  } catch(e) {}
  return -1;
}

function _throughDirForStation(lineId, stationId, throughLineId) {
  return window.ThroughChip ? window.ThroughChip.dirForStation(lineId, stationId, throughLineId) : null;
}

function _transferPoint(raw) {
  if (!raw) return null;
  var lat = Number(Array.isArray(raw) ? raw[0] : raw.lat);
  var lng = Number(Array.isArray(raw) ? raw[1] : (raw.lng != null ? raw.lng : raw.lon));
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat: lat, lng: lng } : null;
}

function _transferDistanceKm(a, b) {
  var rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  var square = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 12742 * Math.asin(Math.min(1, Math.sqrt(Math.max(0, square))));
}

function _transferNeighborhood(lines, lineId, stationId, coords) {
  var line = lines && lines[lineId], stations = line && line.stations;
  if (!Array.isArray(stations)) return null;
  var index = stations.indexOf(stationId), points = [];
  if (index < 0) return null;
  for (var offset = -2; offset <= 2; offset++) {
    if (!offset || !stations[index + offset]) continue;
    var point = _transferPoint(coords[stations[index + offset]]);
    if (point) points.push(point);
  }
  if (!points.length) return null;
  points.sort(function(a, b) { return a.lat - b.lat; });
  var lat = points.length % 2 ? points[(points.length - 1) / 2].lat : (points[points.length / 2 - 1].lat + points[points.length / 2].lat) / 2;
  points.sort(function(a, b) { return a.lng - b.lng; });
  var lng = points.length % 2 ? points[(points.length - 1) / 2].lng : (points[points.length / 2 - 1].lng + points[points.length / 2].lng) / 2;
  return { lat: lat, lng: lng };
}

function _transferCoordinatesCompatible(fromLine, fromStation, toLine, toStation, lines) {
  try {
    var coords = window.STATION_COORDS || {};
    var directA = _transferPoint(coords[fromStation]), directB = _transferPoint(coords[toStation]);
    var sameId = fromStation === toStation;
    var maxDistance = sameId ? 170 : 3;
    if (!sameId && directA && directB) return _transferDistanceKm(directA, directB) <= maxDistance;
    var a = _transferNeighborhood(lines, fromLine, fromStation, coords);
    var b = _transferNeighborhood(lines, toLine, toStation, coords);
    if (a && b) return _transferDistanceKm(a, b) <= maxDistance;
    // canonical 直通交接在两条线路上使用相同车站 ID，
    // 已由 serviceBoundaries 支持。将这一身份安全事实
    // 提供给尚未加载车站几何的轻量消费者；
    // 普通同名换乘声明仍需要坐标。
    if (sameId && lines) {
      var from = lines[fromLine], to = lines[toLine];
      var boundary = function(line, peer) {
        return !!(line && Array.isArray(line.throughServices) &&
          line.throughServices.indexOf(peer) >= 0 &&
          Array.isArray(line.serviceBoundaries) && line.serviceBoundaries.some(function(item) {
            return item && item.lineId === peer && Array.isArray(item.handoverStations) &&
              item.handoverStations.indexOf(fromStation) >= 0;
          }));
      };
      if (boundary(from, toLine) || boundary(to, fromLine)) return true;
    }
    return !!(directA && directB && _transferDistanceKm(directA, directB) <= maxDistance);
  } catch (e) { return false; }
}

function _getTransferMap(lineId, staticRevision) {
  var _langNow = window.currentLang || "ja";
  var _activeSystemIds = Array.isArray(window.TrainsActiveSystemLineIds) ? window.TrainsActiveSystemLineIds : [];
  var _systemKey = _activeSystemIds.join(",");
  var staticKey = staticRevision == null ? _staticNetworkSignature() : staticRevision;
  if (_transferMapCache && _transferMapCache.lineId === lineId && _transferMapCache.lang === _langNow && _transferMapCache.systemKey === _systemKey && _transferMapCache.staticKey === staticKey) return _transferMapCache.map;
  var src = (window.RailwayDB && window.RailwayDB.getAllLines) ? window.RailwayDB.getAllLines() : getLinesData();
  var map = {};
  var own = src[lineId];
  var declared = (own && Array.isArray(own.transferStations)) ? own.transferStations : [];
  var ownStations = (own && own.stations) ? own.stations : [];
  for (var di = 0; di < declared.length; di++) {
    var t = declared[di];
    if (!t || !t.station || !t.lineId) continue;
    if (t.lineId === lineId) continue;
    var internal = window.LinePresentationService ? window.LinePresentationService.getMapBranchIds(lineId, src) : [];
    if (internal.indexOf(t.lineId) >= 0) continue;
    // 当前 LOS 的同级成员属于同一个面向乘客的运行系统。
    // 即使 canonical transferStations 包含物理交接，也不要将其内部边界
    // 渲染为换乘/直通标签。
    if (_activeSystemIds.indexOf(lineId) >= 0 && _activeSystemIds.indexOf(t.lineId) >= 0) continue;
    // 共线区间不画换乘标记 + 自动判断共线线
    if (window.SharedTrackPairs && window.SharedTrackPairs.isSharedStation) {
      if (window.SharedTrackPairs.isSharedStation(lineId, t.station, t.lineId)) continue;
    }
    // Retain the canonical station key even when a coordinate gate rejects a
    // malformed/remote declaration; consumers can distinguish an empty,
    // non-rendered entry from a missing station without inventing a badge.
    if (!map[t.station]) map[t.station] = [];
    var tl = src[t.lineId];
    if (!tl) continue;
    if (!_transferCoordinatesCompatible(lineId, t.station, t.lineId, t.toStation || t.station, src)) continue;
    var _placeholderRe = /(グループ|ロゴ|マーク|アイコン|シンボル)/;
    var _canonicalIcon = tl.image && !_placeholderRe.test(tl.image) ? tl.image : "";
    var _losIcon = (window.LineOperationSystemsResolveIcon && window.LineOperationSystemsResolveIcon(t.lineId)) || "";
    var img = _canonicalIcon || ((_losIcon && !_placeholderRe.test(_losIcon)) ? _losIcon : "");
    var nm = (window.RailwayDB && window.RailwayDB.resolveLineName) ? window.RailwayDB.resolveLineName(t.lineId, window.currentLang) : (tl.name || t.lineId);
    map[t.station].push({
      lineId: t.lineId, image: img, name: nm, operator: tl.operator || "",
      code: tl.code || "",
      color: (window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(t.lineId)) || tl.color || "", type: t.type === "out" ? "out" : "in", note: t.note || "", toStation: t.toStation || ""
    });
  }
  // 声明可能只存在于来源线路。将其镜像到目标
  // 映射，使访客在任一线路视图都看到相同连接。
  // canonical 数据有意允许普通
  // 同 ID 换乘和别名车站（两条线路使用不同
  // ID）的单侧声明，因此这里必须处理两种形式。
  Object.keys(src).forEach(function(sourceId) {
    if (sourceId === lineId) return;
    var sourceLine = src[sourceId];
    var sourceTransfers = sourceLine && Array.isArray(sourceLine.transferStations) ? sourceLine.transferStations : [];
    sourceTransfers.forEach(function(t) {
      if (!t || t.lineId !== lineId) return;
      let targetStation = t.toStation || t.station;
      if (!t.station || !targetStation || ownStations.indexOf(targetStation) < 0) return;
      // 别名声明必须在来源侧识别真实车站。
      // 对于同 ID 声明，目标线路是权威侧
      // 即使来源线路的车站列表不完整；否则
      // 有效 canonical 记录也无法在目标视图生成图标。
      if (t.toStation && (!Array.isArray(sourceLine.stations) || sourceLine.stations.indexOf(t.station) < 0)) return;
      var internal = window.LinePresentationService ? window.LinePresentationService.getMapBranchIds(lineId, src) : [];
      if (internal.indexOf(sourceId) >= 0) return;
      if (_activeSystemIds.indexOf(lineId) >= 0 && _activeSystemIds.indexOf(sourceId) >= 0) return;
      if (window.SharedTrackPairs && window.SharedTrackPairs.isSharedStation &&
          window.SharedTrackPairs.isSharedStation(lineId, targetStation, sourceId)) return;
      if (!_transferCoordinatesCompatible(sourceId, t.station, lineId, targetStation, src)) return;
      if (map[targetStation] && map[targetStation].some(function(it) { return it.lineId === sourceId; })) return;
      var sourcePlaceholderRe = /(グループ|ロゴ|マーク|アイコン|シンボル)/;
      var sourceCanonicalIcon = sourceLine.image && !sourcePlaceholderRe.test(sourceLine.image) ? sourceLine.image : "";
      var sourceLosIcon = (window.LineOperationSystemsResolveIcon && window.LineOperationSystemsResolveIcon(sourceId)) || "";
      var sourceImg = sourceCanonicalIcon || ((sourceLosIcon && !sourcePlaceholderRe.test(sourceLosIcon)) ? sourceLosIcon : "");
      var sourceName = (window.RailwayDB && window.RailwayDB.resolveLineName) ? window.RailwayDB.resolveLineName(sourceId, window.currentLang) : (sourceLine.name || sourceId);
      if (!map[targetStation]) map[targetStation] = [];
      map[targetStation].push({
        lineId: sourceId, image: sourceImg, name: sourceName, operator: sourceLine.operator || "",
        code: sourceLine.code || "",
        color: (window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(sourceId)) || sourceLine.color || "",
        type: t.type === "out" ? "out" : "in", note: t.note || "", toStation: t.station || ""
      });
    });
  });
  // 独立支线仍与父线路保持车站级连接。
  // 这是换乘条目；只有 canonical 直通证据才能在下方升级。
  Object.keys(src).forEach(function(peerId) {
    var peer = src[peerId];
    if (!peer || !(peer.branchOf === lineId || own && own.branchOf === peerId)) return;
    if (window.LinePresentationService && !window.LinePresentationService.isIndependentLine(peerId, src)) return;
    var shared = ownStations.filter(function(station) { return (peer.stations || []).indexOf(station) >= 0; });
    if (shared.length !== 1) return;
    var station = shared[0];
    if (!_transferCoordinatesCompatible(lineId, station, peerId, station, src)) return;
    if (!map[station]) map[station] = [];
    if (map[station].some(function(it) { return it.lineId === peerId; })) return;
    map[station].push({lineId:peerId, name:window.RailwayDB && window.RailwayDB.resolveLineName
      ? window.RailwayDB.resolveLineName(peerId, window.currentLang) : (peer.nameJa || peer.name || peerId),
      image:peer.image || "", operator:peer.operator || "", color:peer.color || "", type:"in"});
  });

  var throughLines = _canonicalThroughLines(lineId);

  // canonical 直通交接本身就是展示关系。
  // 不要要求必须存在重复的 transferStations 条目才允许
  // 直通标签（例如西船桥的京叶 ↔ 武藏野）。
  for (var th = 0; th < throughLines.length; th++) {
    var thLineId = throughLines[th];
    if (window.LinePresentationService && window.LinePresentationService.getMapBranchIds(lineId, src).indexOf(thLineId) >= 0) continue;
    // 当前 LOS 同级成员之间的边界是内部系统
    // 区段边界，不是面向乘客的直通换乘。
    if (_activeSystemIds.indexOf(lineId) >= 0 && _activeSystemIds.indexOf(thLineId) >= 0) continue;
    var thLine = src[thLineId];
    if (!thLine) continue;
    var joins = _canonicalJoinStations(lineId, thLineId);
    if (!Array.isArray(joins) || joins.length === 0) continue;
    for (var jh = 0; jh < joins.length; jh++) {
      var joinStation = joins[jh];
      if (ownStations.indexOf(joinStation) < 0) continue;
      if (!_transferCoordinatesCompatible(lineId, joinStation, thLineId, joinStation, src)) continue;
      if (!map[joinStation]) map[joinStation] = [];
      var exists = false;
      for (var eh = 0; eh < map[joinStation].length; eh++) {
        if (map[joinStation][eh].lineId === thLineId) { exists = true; break; }
      }
      if (exists) continue;
      var thPlaceholderRe = /(グループ|ロゴ|マーク|アイコン|シンボル)/;
      var thCanonicalIcon = thLine.image && !thPlaceholderRe.test(thLine.image) ? thLine.image : "";
      var thLosIcon = (window.LineOperationSystemsResolveIcon && window.LineOperationSystemsResolveIcon(thLineId)) || "";
      var thImg = thCanonicalIcon || ((thLosIcon && !thPlaceholderRe.test(thLosIcon)) ? thLosIcon : "");
      var thName = (window.RailwayDB && window.RailwayDB.resolveLineName) ? window.RailwayDB.resolveLineName(thLineId, window.currentLang) : (thLine.name || thLineId);
      map[joinStation].push({
        lineId: thLineId, image: thImg, name: thName, operator: thLine.operator || "",
        code: thLine.code || "", color: (window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(thLineId)) || thLine.color || "",
        type: "in", note: "", toStation: "", through: true,
        dir: _throughDirForStation(lineId, joinStation, thLineId) || "middle"
      });
    }
  }

  if (throughLines.length > 0) {
    for (var i2 = 0; i2 < ownStations.length; i2++) {
      var stArr = map[ownStations[i2]];
      if (!stArr) continue;
      for (var j2 = 0; j2 < stArr.length; j2++) {
        if (throughLines.indexOf(stArr[j2].lineId) >= 0) {
          if (_activeSystemIds.indexOf(lineId) >= 0 && _activeSystemIds.indexOf(stArr[j2].lineId) >= 0) continue;
          var _js = _canonicalJoinStations(lineId, stArr[j2].lineId);
          if (_js === null || _js.indexOf(ownStations[i2]) >= 0) {
            stArr[j2].through = true;
            stArr[j2].dir = _throughDirForStation(lineId, ownStations[i2], stArr[j2].lineId) || "middle";
          }
        }
      }
    }
  }

  // 部分面向乘客的走廊卡片会有意压缩更长的
  // 服务图为短图。其端点标签是展示
  // 契约，不替代 canonical serviceBoundaries。保留
  // 来源关系不变，但允许卡片声明哪些服务
  // 显示在每个可见终端（例如上野东京线的南北
  // 服务族）。
  var endpointPresentation = own && own.presentation && Array.isArray(own.presentation.mapThroughEndpoints)
    ? own.presentation.mapThroughEndpoints : [];
  if (endpointPresentation.length > 0) {
    var displayStations = own.presentation && Array.isArray(own.presentation.mapStations)
      ? own.presentation.mapStations : ownStations;
    // 端点展示有意只保留端点：紧凑
    // 走廊不得在东京或
    // 其他内部车站将相同服务重复为中间标签。
    displayStations.forEach(function(stationId) {
      if (!map[stationId]) map[stationId] = [];
      map[stationId] = map[stationId].filter(function(item) { return !item.through; });
    });
    endpointPresentation.forEach(function(spec) {
      if (!spec || !spec.station || !Array.isArray(spec.lineIds)) return;
      var displayIndex = displayStations.indexOf(spec.station);
      var displayDir = displayIndex === 0 ? "up"
        : displayIndex === displayStations.length - 1 ? "down" : "middle";
      spec.lineIds.forEach(function(endpointLineId) {
        var endpointLine = src[endpointLineId];
        if (!endpointLine) return;
        if (!_transferCoordinatesCompatible(lineId, spec.station, endpointLineId, spec.station, src)) return;
        var existing = map[spec.station].filter(function(item) { return item.lineId === endpointLineId; })[0];
        if (existing) {
          existing.through = true;
          existing.dir = displayDir;
          return;
        }
        var endpointName = (window.RailwayDB && window.RailwayDB.resolveLineName)
          ? window.RailwayDB.resolveLineName(endpointLineId, window.currentLang) : (endpointLine.name || endpointLineId);
        map[spec.station].push({
          lineId: endpointLineId,
          image: endpointLine.image || "",
          name: endpointName,
          operator: endpointLine.operator || "",
          code: endpointLine.code || "",
          color: (window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(endpointLineId)) || endpointLine.color || "",
          type: "in",
          note: "",
          toStation: "",
          through: true,
          dir: displayDir
        });
      });
    });
  }

  // 线路可以为数据融合保留 canonical 直通关系
  // 同时在自己的地图上隐藏重复标签。这只是展示
  // 规则：服务边界和实时投影保持不变。
  var hiddenThrough = own && own.presentation && Array.isArray(own.presentation.mapHiddenThroughServices)
    ? own.presentation.mapHiddenThroughServices : [];
  if (hiddenThrough.length > 0) {
    Object.keys(map).forEach(function(stationId) {
      map[stationId] = map[stationId].filter(function(item) {
        return !(item && item.through && hiddenThrough.indexOf(item.lineId) >= 0);
      });
    });
  }
  _transferMapCache = { lineId: lineId, lang: _langNow, systemKey: _systemKey, staticKey: staticKey, map: map };
  return map;
}

function _losGroupKey(t) {
  var los = window.LineOperationSystems;
  if (!los || !t) return null;
  var found = null;
  for (var g in los) {
    var arr = los[g];
    if (!Array.isArray(arr)) continue;
    for (var i = 0; i < arr.length; i++) {
      var sys = arr[i];
      if (sys.lineIds && sys.lineIds.indexOf(t.lineId) !== -1) { found = sys; break; }
    }
    if (found) break;
  }
  if (!found) return null;
  return found.code + "|" + (found.icon || "");
}

/*
 * 列车地图几何和直通展示由列车数据所有者统一维护，
 * 使页面在渲染前只有一个地图内核来源。
 */
/* 列车页几何计算与几何令牌（本文件的 TrainsConfig/几何实现） */

// 几何层拥有共享列车图令牌和辅助函数。将它们放在这里
// 可以明确加载链：data → through-chip → geometry → render；
// 列车页不再有独立的转发/配置外壳。
window.TrainsConfig = {
  GEOM: {
    BRANCH_COL_W: 96,
    BRANCH_STUB: 20,
    MAIN_BASE_W_MOBILE: 410,
    MOBILE_CONTENT_W: 297,
    MAIN_BASE_W_MIN: 440,
    MAIN_BASE_W_MAX: 820
  },
  COLORS: {
    LINE_FALLBACK: "#008803",
    LINE_UNKNOWN: "#888888",
    LABEL_FALLBACK: "#8a8a8a"
  }
};
window.GEOM = window.TrainsConfig.GEOM;
window.TrainsColors = window.TrainsConfig.COLORS;

var _isMobileView = typeof _isMobileView === "function" ? _isMobileView : function() {
  return typeof window !== "undefined" && window.innerWidth < 600;
};

var _geomKey = typeof _geomKey === "function" ? _geomKey : function(lineId) {
  return lineId + (_isMobileView() ? "__m" : "__d");
};

  // Physical track sharing, not station-name overlap. Official Tokyo Metro:
  // https://www.tokyometro.jp/corporate/enterprise/passenger_rail/transportation/lines/index.html
  // Fukutoshin uses Yurakucho tracks Wakoshi--Kotake (8.3 km).
  var _SHARED_TRACK_SECTIONS = [
    {lines:['Yurakucho','Fukutoshin'],from:'Wakoshi',to:'Kotake-Mukaihara'},
    {lines:['Namboku','Mita'],from:'Meguro',to:'Shirokane-Takanawa'}
  ];
  function _sharedLinesData() {
    return window.RailwayDB && window.RailwayDB.getAllLines ? window.RailwayDB.getAllLines() :
      window.DataLayer && window.DataLayer.getAllLines ? window.DataLayer.getAllLines() : {};
  }
  function _sharedSections(lineId, partner, allLines) {
    var all=allLines||_sharedLinesData(), own=(all[lineId]||{}).stations||[];
    return _SHARED_TRACK_SECTIONS.filter(function(s){
      return s.lines.indexOf(lineId)>=0 && (!partner||s.lines.indexOf(partner)>=0&&partner!==lineId);
    }).map(function(s){
      var peer=s.lines.filter(function(id){return id!==lineId;})[0];
      var other=(all[peer]||{}).stations||[], a=own.indexOf(s.from), b=own.indexOf(s.to);
      if(a<0||b<0||other.indexOf(s.from)<0||other.indexOf(s.to)<0)return null;
      var ids=own.slice(Math.min(a,b),Math.max(a,b)+1);
      if(ids.some(function(id){return other.indexOf(id)<0;}))return null;
      return {partner:peer,start:Math.min(a,b),end:Math.max(a,b),stations:ids};
    }).filter(Boolean);
  }
  function _findSharedSegments(line, allLines) {
    return _sharedSections(line.id||line.lineId||line.name,null,allLines);
  }
  function _projectSharedPosition(lineId, sourceId, p, allLines) {
    var all=allLines||_sharedLinesData(), own=(all[lineId]||{}).stations||[];
    var source=(all[sourceId]||{}).stations||[];
    var from=Number(p.stationIndex), to=p.segmentToIndex==null?from:Number(p.segmentToIndex);
    var progress=p.segmentProgress==null?0:Number(p.segmentProgress);
    if(!Number.isFinite(from)||!Number.isFinite(to)||!Number.isFinite(progress)||progress<0||progress>1)return null;
    var coordinate=from+(to-from)*progress, lo=Math.floor(coordinate), hi=Math.ceil(coordinate);
    if(!_sharedSections(lineId,sourceId,all).some(function(s){
      return s.stations.indexOf(source[lo])>=0&&s.stations.indexOf(source[hi])>=0;
    }))return null;
    var a=own.indexOf(source[lo]), b=own.indexOf(source[hi]);
    if(a<0||b<0||lo!==hi&&Math.abs(b-a)!==1)return null;
    var at=a+(b-a)*(coordinate-lo), forward=to>=from;
    var base=forward?Math.floor(at):Math.ceil(at), target=forward?Math.ceil(at):Math.floor(at);
    return Object.assign({},p,{stationIndex:base,segmentToIndex:target===base?null:target,
      segmentProgress:Math.abs(at-base),stationId:own[base],
      sharedFromLineId:sourceId,fusionRole:'shared-track'});
  }

  // 支线 junction 站解析——支线站表中第一个出现在主干站表的站。
  // 支持 junction 在支线站表首位（鹤见线海芝浦/大川、成田线空港支线）或**末位**
  // （成田线我孫子支线 [我孫子…下総松崎,成田]，junction 成田在最后——旧代码只查
  // stations[0] 导致整条支线不渲染）。返回 { station, at } 或 null。
  function _branchJunctionStation(branchStations, mainStations) {
    try {
      if (!branchStations || !branchStations.length || !mainStations || !mainStations.length) return null;
      var _bm = {};
      for (var _iM = 0; _iM < mainStations.length; _iM++) _bm[mainStations[_iM]] = true;
      for (var _iB = 0; _iB < branchStations.length; _iB++) {
        if (_bm[branchStations[_iB]]) return { station: branchStations[_iB], at: _iB };
      }
      return null;
    } catch(e) { return null; }
  }

  // 线路分段颜色只影响路线图展示，不改变线路身份、实时归属或运行链。
  // 边界站颜色和区段颜色由 canonical presentation.displayRules 统一声明。
  function _lineSegmentDisplayRules(lineId) {
    var all = (window.RailwayDB && window.RailwayDB.getAllLines) ? window.RailwayDB.getAllLines() : {};
    var line = all && all[lineId];
    var presentation = line && line.presentation;
    var rules = presentation && presentation.displayRules;
    return rules && rules.segmentColors || null;
  }

  // Segment-level display colors. This affects route rendering only; it does
  // not change line identity, realtime ownership, or running-chain continuity.
  function _segmentDisplayColor(lineId, fromStation, toStation, fallback) {
    var rules = _lineSegmentDisplayRules(lineId);
    if (!rules) return fallback;
    var all = (window.RailwayDB && window.RailwayDB.getAllLines) ? window.RailwayDB.getAllLines() : {};
    var beforeRule = rules.before || {};
    var afterRule = rules.after || {};
    var beforeColor = beforeRule.colorLineId &&
      ((window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(beforeRule.colorLineId)) ||
        (all[beforeRule.colorLineId] && all[beforeRule.colorLineId].color));
    // Joban station order is used only to identify the display boundary; the
    // boundary itself is keyed by station ID so inserting stations does not
    // silently move the color transition.
    var sts = (all.Joban && all.Joban.stations) || [];
    var before = sts.indexOf(beforeRule.station);
    var after = sts.indexOf(afterRule.station);
    var from = sts.indexOf(fromStation);
    var to = sts.indexOf(toStation);
    if (before >= 0 && from >= 0 && to >= 0 && Math.max(from, to) <= before) return beforeColor || fallback;
    // Medium-distance Joban services use the blue display band north of the
    // rapid-operation boundary. This is presentation-only and does not create
    // a separate railway identity.
    if (after >= 0 && from >= 0 && to >= 0 && Math.min(from, to) >= after) return afterRule.color || fallback;
    return fallback;
  }

  function _measureRouteText(text, size) {
    var context = null;
    if (typeof document !== 'undefined' && document.createElement) {
      if (!_measureRouteText.canvas) _measureRouteText.canvas = document.createElement('canvas');
      var canvas = _measureRouteText.canvas;
      if (canvas.getContext) context = canvas.getContext('2d');
    }
    if (context) {
      var family = typeof getComputedStyle === 'function' && document.body
        ? getComputedStyle(document.body).fontFamily : 'sans-serif';
      context.font = size + 'px ' + family;
      return context.measureText(text).width;
    }
    return Array.from(text).reduce(function(w,c) { return w + (/[^\x00-\xff]/.test(c) ? size : size * .6); }, 0);
  }

  function _branchLabelLines(text) {
    var lines = [], current = '';
    // Break at word boundaries where possible, then by character for long words/CJK.
    var tokens = String(text).match(/[A-Za-z0-9-]+\s*|./gu) || [];
    tokens.forEach(function(token) {
      if (current && _measureRouteText(current + token,16) > 104) { lines.push(current.trim()); current = ''; }
      Array.from(token).forEach(function(c) {
        if (current && _measureRouteText(current + c,16) > 104) { lines.push(current.trim()); current = ''; }
        current += c;
      });
    });
    if (current.trim()) lines.push(current.trim());
    return lines.length ? lines : [''];
  }

  function computeRouteGeometry(line, lineId) {
    var staticRevision = typeof _staticNetworkSignature === 'function' ? _staticNetworkSignature() : null;
    var lineHash = _computeLineHash(line, lineId, staticRevision);
    // 先检查缓存。
    if (_routeGeometryCache[_geomKey(lineId)] && _routeGeometryCache[_geomKey(lineId)].lineHash === lineHash) {
      return _routeGeometryCache[_geomKey(lineId)];
    }
    
    var stations = line.stations || [];
    var color = line.color || (window.TrainsColors ? window.TrainsColors.LINE_FALLBACK : "#008803");
    var isLoop = line.type === "loop";
    var isSixShapedLoop = line.isSixShapedLoop === true;
    var throughChipMaxWidth = isLoop ? (_isMobileView() ? 69 : 74) : (_isMobileView() ? 148 : 124);
    // 几何和 SVG 渲染共用 ThroughChip 高度计算。
    // 对未挂载
    // 可选视觉组件的离线/单元环境保留零高度回退。
    var _throughChipHeight = function(items, mobile, maxWidth, dir) {
      return window.ThroughChip && typeof window.ThroughChip.height === 'function'
        ? window.ThroughChip.height(items || [], mobile, maxWidth, dir)
        : 0;
    };
    // 换乘车站图标映射（单一来源，只读）。
    var transferMap = _getTransferMap(lineId, staticRevision);
    // 为线路端点的盒式直通标签留空间：∧ 标签位于
    // 起点站上方，∨ 标签位于终点站下方。
    var thrTopPad = 0, thrBotPad = 0;
    if (stations.length > 1 && !isLoop) {
      thrTopPad = _throughChipHeight(transferMap[stations[0]], _isMobileView(), throughChipMaxWidth, "up");
      thrBotPad = _throughChipHeight(transferMap[stations[stations.length - 1]], _isMobileView(), throughChipMaxWidth, "down");
      if (thrTopPad) thrTopPad += 10;
      if (thrBotPad) thrBotPad += 10;
    }
    // 站间距标准 = 实际换乘图标底部 + 6px 空隙（共同规则 5.4.1.5），
    // 但全线保留 45px 最低站间距，避免无换乘/单排换乘线路变得过密。
    // 普通线的换乘块从站点中心下方 9px 开始；每行按 ICON16+GAP2 计 18px。
    // 渲染层每行最多 4 个图标，但这里按 3 个估算，给窄列/文字徽章留出保守空间。
    // 行数上限为 RuntimeConfig.TRANSFER_MAX_ROWS，并与 "+n" 截断保持一致。
    // 站间距 = 全线各站换乘图标的高最大值 + 空隙（移动/桌面统一，
    // 不再按站数分档）；环线双列 _colPitch 同式复用。
    var ROW_H = 18, TX_TOP = 9, SP_GAP = 6, MIN_SP = 45;
    var _chipPitch = function(ids) {
      var mx = MIN_SP;
      for (var _cp = 0; _cp < ids.length; _cp++) {
        var _txLines = transferMap[ids[_cp]] || [];
        var _txN = _txLines.filter(function(t) { return !t.through; }).length;
        var _throughH = _throughChipHeight(_txLines, _isMobileView(), throughChipMaxWidth);
        var _rows = Math.ceil(Math.min(_txN, 16) / 3); // 4→3（窄列 PER_ROW 降级保守值，防 chip 超高重叠）
        var _ordinaryExtent = _txN > 0 ? TX_TOP + _rows * ROW_H : 0;
        var _throughExtent = _throughH > 0 ? _throughH / 2 : 0;
        mx = Math.max(mx, Math.max(_ordinaryExtent, _throughExtent) + SP_GAP);
      }
      return Math.max(mx, MIN_SP);
    };
    var sp = _chipPitch(stations);
    var topP = 18 + thrTopPad, botP = 16 + thrBotPad;
    // 主直线**全线统一**定距（用户：要统一站间距，回退 逐段）——每段 = sp（全线 max）。
    var _spSeg = [];
    for (var _sr2 = 0; _sr2 < stations.length; _sr2++) _spSeg.push(sp); // 全线统一 sp
    var _yAt = function(i) { var y = topP; for (var _yi = 0; _yi < i && _yi < _spSeg.length; _yi++) y += _spSeg[_yi]; return y; };
    
    // 获取支线。
    var allLines = getLinesData();
    var branchLines = [];
    var mapBranchIds = window.LinePresentationService ? window.LinePresentationService.getMapBranchIds(lineId, allLines) : [];
    for (var bid in allLines) {
      if (mapBranchIds.indexOf(bid) >= 0) {
        var bl = allLines[bid];
        branchLines.push({ id: bid, name: bl.name || bid, color: (window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(bid)) || bl.color || color, stations: bl.stations });
      }
    }
    // 双支线及以上**左右分侧**（用户："成田线现在这样可读性很差"——三条竖线全挤左侧、
    // 空港 2 站也被长支线拖成拐弯竖列）——每条支线独立画法：非 junction 站 ≤4 → 水平直线横排（h），
    // >4 → 竖列（v）；竖列支线放左、横排支线放右（全部横排时保持全左，鹤见线不回归）；
    // junction 站名在存在右支线时转圆点上方+白描边遮线（两侧都被占，renderTrainMap 实现）。
    var _branchModes = []; // 每支线 'h' 横排 / 'v' 竖列
    var _hasVCol = false;
    for (var _bmi = 0; _bmi < branchLines.length; _bmi++) {
      var _bmSt = branchLines[_bmi].stations || [];
      var _bmJ = _bmSt.length ? _branchJunctionStation(_bmSt, stations) : null;
      var _bmN = _bmJ ? (_bmSt.length - 1) : _bmSt.length;
      // 单支线保持右侧弯折（现状：丸ノ内方南町/千代田北綾瀬）——不启用横排
      var _bmode = (branchLines.length >= 2 && _bmN <= 4) ? 'h' : 'v';
      _branchModes.push(_bmode);
      if (_bmode === 'v') _hasVCol = true;
    }
    // 位置规则：竖列支线在左；横排支线在右（仅当存在竖列支线时）；全部横排（鹤见线）保持全左现状。
    var _bSide = function(_i6b) {
      if (branchLines.length < 2) return "right";
      if (_branchModes[_i6b] === 'v') return "left";
      return _hasVCol ? "right" : "left";
    };
    var _bCol = function(_i6b) { // 同侧内列序号
      var _c = 0;
      for (var _ci = 0; _ci < _i6b; _ci++) {
        if (_bSide(_ci) === _bSide(_i6b)) _c++;
      }
      return _c;
    };
    // 全横排（鹤见线）标志：兼容 _leftNeedH 与旧渲染路径
    var _branchH = (branchLines.length >= 2) && !_hasVCol;
    var _rightCols = 0, _leftCols = 0;
    for (var _ci2 = 0; _ci2 < branchLines.length; _ci2++) {
      if (_bSide(_ci2) === "left") _leftCols++; else _rightCols++;
    }
    var _branchStubL = 0, _branchMaxNameW = function(_sd6) {
      var _mx6 = 0;
      for (var _bi3 = 0; _bi3 < branchLines.length; _bi3++) {
        if (_bSide(_bi3) !== _sd6) continue;
        var _bl3 = branchLines[_bi3];
        if (!_bl3.stations) continue;
        for (var _bs3 = 0; _bs3 < _bl3.stations.length; _bs3++) {
          var _bn3 = (window.RailwayDB && window.RailwayDB.resolveStationName)
            ? (window.RailwayDB.resolveStationName(_bl3.stations[_bs3], window.currentLang) || _bl3.stations[_bs3])
            : _bl3.stations[_bs3];
          _mx6 = Math.max(_mx6, _measureRouteText(_bn3 || '',16));
        }
      }
      return _mx6;
    };
    if (_leftCols > 0) {
      var _mainMaxW = 0;
      for (var _mw = 0; _mw < stations.length; _mw++) {
        var _mn = (window.RailwayDB && window.RailwayDB.resolveStationName)
          ? (window.RailwayDB.resolveStationName(stations[_mw], window.currentLang) || stations[_mw])
          : stations[_mw];
        _mainMaxW = Math.max(_mainMaxW, _measureRouteText(_mn || '',16));
      }
      _branchStubL = _mainMaxW + 22; // 主干站名朝左偏移 12（side=dual）+ gap 10
      // 成田有一条较长的并行我孫子支线：在两列之间
      // 预留列车/字幕车道，不要挤压两侧站名带。
      if (_hasVCol && branchLines.length > 1) _branchStubL += 40;
    }
    // "插线叉出去那一部分也要算站间距"——右侧支线水平叉出段（stub）≥ 标准站间距：
    // 原固定 20px 使单支线（南武線浜川崎/丸ノ内方南町/千代田北綾瀬）竖列紧贴主线，视觉像
    // 双线并行；改为 ≥ sp 后支线与主干间距 = 一个站间距，与横排/竖列"算站间距"规则统一。
    var _branchStubR = Math.max(GEOM.BRANCH_STUB, sp);
    // 左侧列距动态化——列 1 竖线不穿列 0 名带（列 0 名带右缘=bx0-10，列 1 竖线=bx0-列距，需 gap ≥ 4）
    var _branchColW = _leftCols > 0 ? Math.max(GEOM.BRANCH_COL_W, _branchMaxNameW("left") + 14) : GEOM.BRANCH_COL_W;
    // 水平支线间距由标签宽度和换乘内容推导。
    // 长站名增加留白，但不成倍放大基础间距。
    var branchLayouts = {};
    branchLines.forEach(function(branch,index) {
      if (_branchModes[index] !== 'h') return;
      var junction = _branchJunctionStation(branch.stations, stations);
      var ordered = junction && junction.at === branch.stations.length - 1 ? branch.stations.slice().reverse() : branch.stations;
      var labels = {}, widths = [], heights = [];
      ordered.filter(function(s) { return !junction || s !== junction.station; }).forEach(function(s,i) {
        var name = window.RailwayDB && window.RailwayDB.resolveStationName ? window.RailwayDB.resolveStationName(s,window.currentLang) || s : s;
        var rows = _branchLabelLines(name);
        var width = Math.max.apply(null, rows.map(function(row) { return _measureRouteText(row,16); }));
        labels[s] = { lines: rows, above: i % 2 === 0, width: width };
        var transferItems = transferMap[s] || [];
        var transferRows = Math.ceil(Math.min(transferItems.filter(function(t) { return !t.through; }).length,16) / 4);
        widths.push(width); heights.push(rows.length * 18 + transferRows * 18 +
          _throughChipHeight(transferItems,_isMobileView(),throughChipMaxWidth));
      });
      // 相对两侧标签可以在 x 方向重叠；相隔两个节点的标签不得重叠。
      // 列车标记在轨道周围拥有独立的 28px 车道。
      var pitch = 38;
      widths.forEach(function(w,i) {
        if (i >= 2) pitch = Math.max(pitch, (w + widths[i-2]) / 4 + 8);
      });
      pitch = Math.max(pitch, (widths[0] || 0) / 2 + 30);
      branchLayouts[branch.id] = { pitch: Math.ceil(pitch), labels: labels,
        endWidth: widths[widths.length-1] || 0 };
      var ji = junction ? stations.indexOf(junction.station) : -1;
      var clearance = Math.max.apply(null,[76].concat(heights.map(function(h) { return h + 58; })));
      if (ji > 0) _spSeg[ji-1] = Math.max(_spSeg[ji-1],clearance);
      if (ji >= 0 && ji < _spSeg.length) _spSeg[ji] = Math.max(_spSeg[ji],clearance);
    });
    var _branchHSp = 0; // Deprecated scalar: geometry consumers use each branch's pitch.
    var _leftNeed = _leftCols > 0 ? (_branchStubL + (_leftCols - 1) * _branchColW + 10 + _branchMaxNameW("left") + 2) : 0;
    var _rightNeed = 0;
    if (_rightCols > 0) {
      if (branchLines.length >= 2) {
        // 右横排支线需求 = 横排长（站数×站距）+ 站名带 + 余量
        for (var _rn = 0; _rn < branchLines.length; _rn++) {
          if (_bSide(_rn) !== "right") continue;
          var _rSt = branchLines[_rn].stations || [];
          var _rJ = _rSt.length ? _branchJunctionStation(_rSt, stations) : null;
          var _rN = _rJ ? (_rSt.length - 1) : _rSt.length;
          var rightLayout = branchLayouts[branchLines[_rn].id];
          _rightNeed = Math.max(_rightNeed, rightLayout ? _rN * rightLayout.pitch + rightLayout.endWidth / 2 + 28 : _branchStubR + _branchMaxNameW('right') + 28);
        }
      } else {
        _rightNeed = _branchStubR + 10 + _branchMaxNameW("right") + 2; // 单支线（现状）
      }
    }
    var branchOffset = branchLines.length > 0 ? GEOM.BRANCH_COL_W * branchLines.length : 0;
    // 支线名称标签位于接续站上方 26px（符合行业
    // 支线标注）。接续站是首站时预留顶部空间。
    if (branchLines.length > 0) {
      for (var _b1 = 0; _b1 < branchLines.length; _b1++) {
        if (branchLines[_b1].stations && branchLines[_b1].stations.length > 0 && stations.indexOf(branchLines[_b1].stations[0]) === 0) {
          topP += 26; break;
        }
      }
    }
    
    var svgW, svgH;
    var stationCoords = []; // Array of {x, y, side, stationId}
    var routeElements = []; // SVG elements for route lines (static layer)
    
    if (isSixShapedLoop && stations.length > 2) {
      // 六字形环线：“环 + 尾段”结构（不是两个环）。
      // 光丘方向 = 开放的竖直尾段，都厅前方向 = 闭合矩形环线。
      var hikarigaokaIdx = stations.indexOf("Hikarigaoka");
      if (hikarigaokaIdx === -1) hikarigaokaIdx = Math.floor(stations.length / 3);
      
      var hikarigaokaStations = stations.slice(0, hikarigaokaIdx + 1); // [0]=Tochomae (junction)
      var loopStations = [stations[0]].concat(stations.slice(hikarigaokaIdx + 1));
      
      // ============ 尺寸计算 ===========
      // 桌面画布基准固定（820）——环宽恒定（viewBox 内容密度基线，显示层 容器适配）。
      // 移动端画布=容器内容宽（1:1 密度基线，无横向滚动）。
      var _cw6;
      if (_isMobileView()) {
        var _mcw6 = ((typeof document !== "undefined" && document.querySelector("#trainsMapContainer")) || {}).clientWidth || 360;
        _cw6 = Math.max(_mcw6 - 16, 320);
      } else {
        _cw6 = GEOM.MAIN_BASE_W_MAX;
      }
      var _cw6Content = _cw6;
      // 缩放系数对齐山手线 loopScale（移动 1.5 / 桌面 1.6）。
      // 用户裁定环线标准宽度——六形环圆环部分与山手线统一（48 基准，移动 72px/桌面 76.8px）。
      var scale6 = _isMobileView() ? 1.5 : 1.6;
      var spLoop6 = _isMobileView() ? 39 : 41.6;
      var loopRectW = _isMobileView() ? 63 : 67.2; // 环宽基准 48→42 // 环宽对齐山手线标准（48 基准），给光丘尾留水平空间
      // 六形环环段改左右二分（双列）——环高用山手线公式（站数/2 列 × 36 基准 −80），
      // 并按各列最宽换乘 chip 高度动态放大（_colPitch6，与山手线 _colPitch 同款）。
      var loopRectH = Math.max(loopStations.length * 36 / 2 - 80, 140) * scale6;
      var _colPitch6 = function(ids) { return _chipPitch(ids); }; // 复用共同规则 _chipPitch（5.4.1.5）
      var _loopN = loopStations.length;
      // 支线从环左侧 1/2 处展开（参考车站实际位置——都庁前在环左半）：
      // Tochomae(junction) 在左列第 7 位（环左缘、中点偏上 0.5/14×rectH，最接近 1/2 处）；
      // 左列（顶→下）= [S32..S37, Tochomae, S11..S17]（14 站）、右列（顶→下）= [S18..S31]（14 站）。
      var _halfN = Math.ceil(_loopN / 2); // 28 → 14/14
      var _juncIdx6 = Math.floor((_halfN - 1) / 2); // Tochomae 左列索引（6 = 第 7 位）
      var _leftIds6 = [], _rightIds6 = [];
      for (var _s6 = 0; _s6 < _juncIdx6; _s6++) _leftIds6.push(loopStations[_loopN - _juncIdx6 + _s6]); // S32..S37（环段尾）
      _leftIds6.push(loopStations[0]); // Tochomae
      for (var _s6b = 0; _s6b < _halfN - 1 - _juncIdx6; _s6b++) _leftIds6.push(loopStations[1 + _s6b]); // S11..S17（环段头）
      var _rightStart = 1 + (_halfN - 1 - _juncIdx6); // 8 → S18
      for (var _s6c = 0; _s6c < _halfN; _s6c++) _rightIds6.push(loopStations[_rightStart + _s6c]); // S18..S31
      var _pitch6 = Math.max(_colPitch6(_leftIds6), _colPitch6(_rightIds6));
      // 左右列各 14 站（站距 rectH/14），与 站距密度一致。
      var _needH6 = _pitch6 * (_halfN - 1);
      if (_needH6 > loopRectH) loopRectH = _needH6;
      
      var leftMargin = _isMobileView() ? 12 : 12.8;
      // 已确认的窄六字形环线需要为站名
      // 和两侧换乘保留独立空间；不得将所有车道挤进 360px。
      var marginRight = _isMobileView() ? 14 : 28;
      var marginTopBot = _isMobileView() ? 60 : 64;
      // tail 列宽与直线支线同源（GEOM.BRANCH_COL_W × 本图缩放系数）。
      // 移动端容器是 1:1 硬约束，tail 列让位给环（保底 BRANCH_COL_W×1.1 ≈ 现状 105px）。
      // 支线宽度取决于文本最多的那个站（用户指示）——不硬编码 105.6/88，
      // 动态扫描光丘尾列（stub 前 10 站）与左列上方站名的最大文字宽（字数×16×1.1，与
      // _pickSixLabelSide 同源）；语言切换/站名变化时 stubX 与 tailCap 自适应。
      var _sixNameW = function(_id6) {
        var _n6 = (window.RailwayDB && window.RailwayDB.resolveStationName)
          ? (window.RailwayDB.resolveStationName(_id6, window.currentLang) || _id6) : _id6;
        return (_n6 || "").length * 16 * 1.1;
      };
      var _tailWidest = 0;
      for (var _tw6 = 1; _tw6 < hikarigaokaStations.length; _tw6++)
        _tailWidest = Math.max(_tailWidest, _sixNameW(hikarigaokaStations[_tw6]));
      var _leftWidest = 0, _rightWidest = 0;
      for (var _lw6 = 0; _lw6 < _leftIds6.length; _lw6++)
        _leftWidest = Math.max(_leftWidest, _sixNameW(_leftIds6[_lw6]));
      for (var _rw6 = 0; _rw6 < _rightIds6.length; _rw6++)
        _rightWidest = Math.max(_rightWidest, _sixNameW(_rightIds6[_rw6]));
      // 保留三条可测量的站名/换乘车道和约定的 63px 环线。
      // SVG viewBox 包含完整图形；渲染器将该固定
      // 组合适配到可见移动视口，不产生横向平移。
      var _sixTailLane = Math.max(92, _tailWidest);
      var _sixLeftLane = Math.max(92, _leftWidest);
      var _sixRightLane = Math.max(92, _rightWidest);
      var stubX = leftMargin + _sixTailLane + 16;
      var tailAreaWidth = stubX + _sixLeftLane + 24;
      svgW = tailAreaWidth + loopRectW + 16 + _sixRightLane + marginRight;
      // Tail 高度先算（依赖 loopRectH），svgH 须同时容纳环（垂直居中）与向上伸出的光丘尾。
      // junction 在左列第 7 位（中点偏上 0.5/14×rectH），tail 顶 = loopCy−juncOff−tailTotalHeight ≥ 边距
      var tailCount = hikarigaokaStations.length - 1;
      // tail 站距 = 环线站距 / 2（支线紧凑，不撑高全图）
      // Open tail has its own major transfer stations; reserve enough rows.
      var _tailPitch6 = _chipPitch(hikarigaokaStations.slice(1));
      var tailStep = tailCount > 0 ? Math.max(56, Math.ceil(_tailPitch6 * 0.8)) : 0;
      var tailTotalHeight = tailCount > 0 ? tailCount * tailStep + 32 : 0;
      var _juncOff6 = loopRectH * Math.abs(0.5 - (_juncIdx6 + 0.5) / _halfN); // 0.5/14×rectH ≈ 36px
      svgH = Math.max(loopRectH + marginTopBot * 2,
                      2 * (marginTopBot + _juncOff6 + tailTotalHeight));
      
      // ============ 几何计算 ===========
      // 环线中心：由 SVG 尺寸推导，不单独设置。
      var loopCx = tailAreaWidth + loopRectW / 2;
      var loopCy = svgH / 2;
      var loopHalfW = loopRectW / 2;
      var loopHalfH = loopRectH / 2;
      
      // Junction (Tochomae) - MUST be derived from loop rectangle position formula
      // 支线从环左侧 1/2 处展开（都庁前实际在环左半）——junction = 环左缘、
      // 左列第 7 位（y=loopCy−0.5/14×rectH，中点偏上 36px 取最接近）。光丘尾水平 stub 后向上。
      var junctionX = loopCx - loopHalfW;   // 环左缘 x = Tochomae x（左列站 x）
      var junctionY = loopCy - loopHalfH + ((_juncIdx6 + 0.5) / _halfN) * loopRectH; // 左列第 7 位
      
      // Stub: 从环左缘（Tochomae）水平向左到 stubX（画布左缘 + 边距 10px），再垂直向上
      // 光丘尾站名改朝左（用户指令）——竖线右移，保证最宽站
      // （西新宿五丁目 6 字 ≈105.6px）全尺寸朝左时文字左缘仍 ≥ leftMargin（12/12.8px）。
      // 宽度取光丘尾列实际最长站名（_tailWidest 动态），不硬编码 105.6。
      // stubX already comes from the measured tail label lane.
      var stubY = junctionY;
      
      // Tail station coordinates: first = junction (Tochomae, 环左缘 1/2 处), rest = along vertical line at stubX
      var hikarigaokaLinePts = [{ x: junctionX, y: junctionY, side: 'left', stationId: hikarigaokaStations[0] }];
      for (var i = 1; i < hikarigaokaStations.length; i++) {
        hikarigaokaLinePts.push({ 
          x: stubX, 
          y: stubY - i * tailStep, 
          side: 'left', 
          stationId: hikarigaokaStations[i] 
        });
      }
      
      // 环段 27 站 + Tochomae 分左右两列（14/14）——左列（顶→下）=
      // [S32..S37（麻布十番…新宿）, Tochomae, S11..S17（新宿西口…春日）]，右列（顶→下）= [S18..S31（本郷三丁目…赤羽橋）]。
      // 站序流：Tochomae→左列下（春日）→环底→右列下（本郷三丁目）→右列上（赤羽橋）→环顶→
      // 左列上（麻布十番…新宿）→Tochomae（闭合）。
      var _leftOrder6 = [];
      for (var _lo6 = 0; _lo6 < _juncIdx6; _lo6++) _leftOrder6.push(loopStations[_loopN - _juncIdx6 + _lo6]); // S32..S37
      _leftOrder6.push(loopStations[0]); // Tochomae
      for (var _lo6b = 0; _lo6b < _halfN - 1 - _juncIdx6; _lo6b++) _leftOrder6.push(loopStations[1 + _lo6b]); // S11..S17
      var loopPts6 = [];
      for (var li6 = 0; li6 < _halfN; li6++) {
        var _tl6 = (li6 + 0.5) / _halfN;
        loopPts6.push({ x: junctionX, y: loopCy - loopHalfH + _tl6 * loopRectH, side: "left", stationId: _leftOrder6[li6] });
      }
      for (var ri6 = 0; ri6 < _halfN; ri6++) {
        var _tr6 = (ri6 + 0.5) / _halfN;
        loopPts6.push({ x: loopCx + loopHalfW, y: loopCy - loopHalfH + _tr6 * loopRectH, side: "right", stationId: loopStations[_rightStart + ri6] });
      }
      
      // 几何可以按列顺序绘制，但列车位置始终
      // 使用 canonical line.stations 索引。不得使用视觉行顺序。
      stationCoords = new Array(stations.length);
      for (var _tailI6 = 0; _tailI6 < hikarigaokaLinePts.length; _tailI6++)
        stationCoords[_tailI6] = hikarigaokaLinePts[_tailI6];
      for (var _loopI6 = 0; _loopI6 < loopPts6.length; _loopI6++) {
        var _canonicalI6 = stations.indexOf(loopPts6[_loopI6].stationId);
        if (_canonicalI6 >= 0) stationCoords[_canonicalI6] = loopPts6[_loopI6];
      }
      
      // ============ 静态层线路元素 ===========
      // 主环线矩形（视觉权重更高 = 主线）。
      routeElements.push({
        type: 'rect',
        attrs: { 
          x: loopCx - loopHalfW, 
          y: loopCy - loopHalfH, 
          width: loopRectW, 
          height: loopRectH, 
          rx: 12, 
          ry: 12, 
          stroke: color, 
          'stroke-width': 5, 
          fill: 'none', 
          opacity: 1.0 
        }
      });
      
      // 光丘开放端和都厅前接续属于同一条
      // 线路：线宽/颜色连续，绝不是淡化支线。
      if (hikarigaokaLinePts.length > 1) {
        var tailTopY = hikarigaokaLinePts[hikarigaokaLinePts.length - 1].y;
        routeElements.push({
          type: 'path',
          attrs: {
            d: 'M ' + stubX + ' ' + tailTopY +
               ' L ' + stubX + ' ' + junctionY +
               ' L ' + junctionX + ' ' + junctionY,
            stroke: color, 'stroke-width': 5,
            'stroke-linecap': 'round', 'stroke-linejoin': 'round',
            fill: 'none', opacity: 1.0
          }
        });
      }

    } else if (isLoop && stations.length > 2) {
      // 标准环线。
      var loopScale = _isMobileView() ? 1.5 : 1.6;
      var loopRectH = Math.max(stations.length * 36 / 2 - 80, 140) * loopScale;
      // 保留已确认的环线图尺寸：
      // 双列环线较窄，外部标签布局保持不变。
      // 不要重新引入更宽的内部方向标签走廊。
      var rectW = _isMobileView() ? 63 : 67.2, rectH = loopRectH;
      // Equivalent to the previous fixed viewBox widths, without the old
      // ambiguous conditional operator precedence.
      svgW = _isMobileView() ? 225 : 240;
      svgH = loopRectH + (_isMobileView() ? 120 : 128); // 加括号
      var cx = svgW / 2, cy = svgH / 2;
      var halfW = rectW / 2, halfH = rectH / 2;
      var loopPts = [];
      // 所有普通闭合环线共用一个双列模板。现有
      // 山手线展示将田端保持在右上方及其方向。
      // 展示顺序和奇数车站数量都不得改变来源索引。
      var _rightStart = line.isDoubleColumnLoop ? Math.max(0, stations.indexOf("Tabata")) : 0;
      var _orderStep = line.isDoubleColumnLoop ? -1 : 1;
      var _rightCount = Math.ceil(stations.length / 2);
      var _leftCount = stations.length - _rightCount;
      var _rightSeq = [], _leftSeq = [];
      for (var ri = 0; ri < _rightCount; ri++) {
        _rightSeq.push((_rightStart + _orderStep * ri + stations.length) % stations.length);
      }
      for (var li = 0; li < _leftCount; li++) {
        _leftSeq.push((_rightStart - _orderStep * (li + 1) + stations.length) % stations.length);
      }
      var _pitch = Math.max(_chipPitch(_rightSeq.map(function(si) { return stations[si]; })),
        _chipPitch(_leftSeq.map(function(si) { return stations[si]; })));
      var _needH = _pitch * Math.max(_rightCount, _leftCount);
      if (_needH > loopRectH) {
        rectH = _needH;
        halfH = rectH / 2;
        svgH = rectH + (_isMobileView() ? 150 : 160);
        cy = svgH / 2;
      }
      for (var ri = 0; ri < _rightSeq.length; ri++) {
        var _tR = (ri + 0.5) / _rightSeq.length;
        var _sourceRi = _rightSeq[ri];
        loopPts[_sourceRi] = { x: cx + halfW, y: cy - halfH + _tR * rectH, side: "right", stationId: stations[_sourceRi], _loopPos: rectW + _tR * rectH };
      }
      for (var li = 0; li < _leftSeq.length; li++) {
        var _tL = (li + 0.5) / _leftSeq.length;
        var _sourceLi = _leftSeq[li];
        loopPts[_sourceLi] = { x: cx - halfW, y: cy - halfH + _tL * rectH, side: "left", stationId: stations[_sourceLi], _loopPos: 2 * rectW + rectH + (1 - _tL) * rectH };
      }
      var perimeter = 2 * (rectW + rectH);
      // 环线沿曲线移动——存矩形参数供渲染层沿周长插值
      stationCoords = loopPts;
      stationCoords._loopRect = { cx: cx, cy: cy, halfW: halfW, halfH: halfH, rectW: rectW, rectH: rectH, perimeter: perimeter, stationOrderSign: _orderStep };
      
      routeElements.push({
        type: 'rect',
        attrs: { x: cx - halfW, y: cy - halfH, width: rectW, height: rectH, rx: 20, ry: 20, stroke: color, 'stroke-width': 5, fill: 'none', opacity: 0.6 }
      });
      
    } else {
      // 标准直线：扩展画布，使左侧（站名）和右侧（图标）都能使用。
      var isMobileView = _isMobileView();
      // 桌面画布基准统一为内容基准（297，同移动端/山手线环线）——
      // 此前桌面固定 820：svg width=100% 拉到桌面容器（~1000px+）时放大 3-4x+（字 50-68px 巨大）。
      // 统一内容基准后渲染倍率由 CSS max-width 封顶（，桌面 ≤520px），
      // 手机（1.51x）与桌面（~1.75x）字号接近，两种尺寸均可读。
      var _baseW = GEOM.MOBILE_CONTENT_W;
      var _rightPad = isMobileView ? 24 : 40;
      var mainCx, svgW;
      if (branchLines.length >= 2) {
        // 多支线全左直排——mainCx ≥ 左侧支线区需求（站名朝左放下），
        // 右侧仅 junction 站名朝右（岔路）+ 余量；左侧 stub 已避开主干站名带（_branchStubL）。
        var _jMaxW6 = 0;
        for (var _jb6 = 0; _jb6 < branchLines.length; _jb6++) {
          var _bl6 = branchLines[_jb6];
          var _jst6 = "";
          if (_bl6.stations && _bl6.stations.length) {
            var _jf6 = _branchJunctionStation(_bl6.stations, stations);
            _jst6 = (_jf6 && _jf6.station) || _bl6.stations[0];
          }
          var _jn6 = _jst6
            ? ((window.RailwayDB && window.RailwayDB.resolveStationName)
              ? (window.RailwayDB.resolveStationName(_jst6, window.currentLang) || _jst6)
              : _jst6)
            : "";
          _jMaxW6 = Math.max(_jMaxW6, (_jn6 || "").length * 16 * 1.1);
        }
        // 横排时左需求 = 最长支线横排长 + 最宽站名 + 余量（竖列时走 _leftNeed）
        var _leftNeedH = 0;
        if (_branchH) {
          for (var _lh = 0; _lh < branchLines.length; _lh++) {
            var _lhSt = branchLines[_lh].stations || [];
            var _lhJ = _branchJunctionStation(_lhSt, stations);
            var _lhN = _lhJ ? (_lhSt.length - 1) : _lhSt.length;
            var leftLayout = branchLayouts[branchLines[_lh].id];
            _leftNeedH = Math.max(_leftNeedH, _lhN * leftLayout.pitch + leftLayout.endWidth / 2 + 28);
          }
        }
        mainCx = Math.max(_baseW / 2, (_branchH ? _leftNeedH : _leftNeed) + 20);
        // 右侧需求含右横排支线（此前仅 junction 名宽）；左需求已含竖列支线
        svgW = Math.max(_baseW, mainCx + 12 + _jMaxW6 + _rightNeed + _rightPad);

      } else {
        // 单支线/无支线：主线中心固定（现状）
        mainCx = _baseW / 2;
        // 不再把竖列支线名标签宽计入 svgW——标签已移至 HTML 层图注（trains-render.js
        // .branch-note），viewBox 宽度与主流线一致（297），保持全线路字大小密度统一。
        svgW = Math.max(_baseW, mainCx + _branchStubR + branchOffset + _rightPad);
      }
      
      // 逐段定距（_yAt）替代旧「均匀 sp + _extraY 补偿」——旧补偿 min(换乘数,8) 与渲染 min(16) 不一致，已废
      for (var i = 0; i < stations.length; i++) {
        stationCoords.push({ x: mainCx, y: _yAt(i), side: 'dual', stationId: stations[i] });
      }
      // svgH must be computed AFTER stationCoords is populated (with the
      // per-station 2-row chip compensation) or the viewBox clips the line.
      svgH = (stationCoords.length ? stationCoords[stationCoords.length - 1].y : topP) + (_spSeg.length ? _spSeg[_spSeg.length - 1] : sp) + botP;
      var y1 = topP, y2 = stationCoords.length ? stationCoords[stationCoords.length - 1].y : (topP + (stations.length - 1) * sp);
      // Draw ordinary main lines by station segment so display color can
      // change exactly at a named boundary station (e.g. Joban at Ueno/Toride).
      if (stationCoords.length > 1) {
        for (var _segI = 0; _segI < stationCoords.length - 1; _segI++) {
          var _segA = stationCoords[_segI], _segB = stationCoords[_segI + 1];
          routeElements.push({
            type: 'line',
            attrs: {
              x1: _segA.x, y1: _segA.y, x2: _segB.x, y2: _segB.y,
              stroke: _segmentDisplayColor(lineId, _segA.stationId, _segB.stationId, color),
              'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.6
            }
          });
        }
      } else {
        routeElements.push({
          type: 'line',
          attrs: { x1: mainCx, y1: y1, x2: mainCx, y2: y2, stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.6 }
        });
      }
      // .3.422: 融合机制——直通运行系统延伸段几何（如横須賀線・総武快速線）
      // 延伸线接主线端点（東京站）后沿同一垂直方向、同一列继续排布（一条连续线）；
      // 列车索引 = baseIdx + 延伸线站表索引
      var fusionMap = {};
      var _extLines = _fusionExtensionLines(lineId);
      if (_extLines && _extLines.length > 0) {
        var extOffsetX = 0; // 同列延伸，保持同一线路的连续视觉。
        var yBase = stationCoords.length ? stationCoords[stationCoords.length - 1].y : topP;
        var yStartRef = topP;
        for (var exi = 0; exi < _extLines.length; exi++) {
          var exl = _extLines[exi];
          var exLine = allLines[exl.lid];
          if (!exLine || !exLine.stations) continue;
          var exSt = exLine.stations;
          var exColor = (window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(exl.lid)) || exLine.color || "#888";
          // 延伸站 = 去掉与主线共享的接续站（主线末站/首站）
          var extStations = exl.joinAtEnd ? exSt.slice(1) : exSt.slice(0, -1);
          if (extStations.length === 0) continue;
          var extStartY = exl.joinAtEnd ? yBase : yStartRef;
          var extBaseIdx = stationCoords.length;
          for (var exk = 0; exk < extStations.length; exk++) {
            var exY = exl.joinAtEnd ? (extStartY + (exk + 1) * sp) : (extStartY - (exk + 1) * sp);
            stationCoords.push({ x: mainCx + extOffsetX, y: exY, side: exl.systemMember ? 'dual' : 'right', stationId: extStations[exk], fusionLineId: exl.lid });
          }
          // 连接线：主线端点 → 延伸段第一站（同列时即为垂直连续线）
          var jx = mainCx, jy = exl.joinAtEnd ? yBase : yStartRef;
          var exFirstY = exl.joinAtEnd ? (yBase + sp) : (yStartRef - sp);
          routeElements.push({ type: 'line', attrs: { x1: jx, y1: jy, x2: mainCx + extOffsetX, y2: jy, stroke: exColor, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.6 } });
          routeElements.push({ type: 'line', attrs: { x1: mainCx + extOffsetX, y1: jy, x2: mainCx + extOffsetX, y2: exFirstY, stroke: exColor, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.6 } });
          // 延伸段站内连线
          for (var exk2 = 0; exk2 < extStations.length - 1; exk2++) {
            var yA = exl.joinAtEnd ? (extStartY + (exk2 + 1) * sp) : (extStartY - (exk2 + 1) * sp);
            var yB = exl.joinAtEnd ? (extStartY + (exk2 + 2) * sp) : (extStartY - (exk2 + 2) * sp);
            routeElements.push({ type: 'line', attrs: { x1: mainCx + extOffsetX, y1: yA, x2: mainCx + extOffsetX, y2: yB, stroke: exColor, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.6 } });
          }
          // LOS 系统成员是同级干线区段，不是从属延伸。
          // 只为真正的外部/干线延伸保留标签。
          if (!exl.systemMember) {
            var _exName = (window.RailwayDB && window.RailwayDB.resolveLineName) ? window.RailwayDB.resolveLineName(exl.lid, window.currentLang) || exl.lid : exl.lid;
            routeElements.push({ type: 'text', attrs: { x: mainCx + extOffsetX, y: exl.joinAtEnd ? (extStartY + (extStations.length + 1) * sp) : (extStartY - (extStations.length + 1) * sp), 'text-anchor': 'middle', 'font-size': '12', fill: exColor, 'font-weight': '600' }, text: _exName });
          }
          fusionMap[exl.lid] = { baseIdx: extBaseIdx, joinAtEnd: exl.joinAtEnd, stationCount: extStations.length };
        }
        // svg 尺寸扩展：同列延伸只扩展高度（站名沿用主线站名区宽度）
        if (stationCoords.length) {
          var _lastY = stationCoords[stationCoords.length - 1].y;
          svgH = Math.max(svgH, _lastY + sp + botP);
          var _minY = Math.min.apply(null, stationCoords.map(function(c) { return c.y; }));
          svgH = Math.max(svgH, _minY + sp * 2 + botP);
        }
      }
      // 共用区段的双平行线（行业标准）。
      var sharedSegs = _findSharedSegments(line, allLines);
      for (var si = 0; si < sharedSegs.length; si++) {
        var sseg = sharedSegs[si];
        var pColor = (window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(sseg.partner)) || (allLines[sseg.partner] && allLines[sseg.partner].color) || "#888";
        routeElements.push({
          type: 'line',
          attrs: { x1: mainCx - 7, y1: _yAt(sseg.start), x2: mainCx - 7, y2: _yAt(sseg.end), stroke: pColor, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.6 }
        });
      }
    }
    
    // 用于实时列车定位的支线几何（与主线分开
    // 使支线列车在自己的车站列中渲染，并保持视觉间距）。
    var branchGeom = null;
    if (branchLines.length > 0 && stationCoords.length > 0) {
      branchGeom = {};
      for (var bgi = 0; bgi < branchLines.length; bgi++) {
        var _br = branchLines[bgi];
        if (!_br.stations || _br.stations.length === 0) continue;
        var _jfG = _branchJunctionStation(_br.stations, stations);
        if (!_jfG) continue;
        var _jIdx = -1;
        for (var _ji2 = 0; _ji2 < stationCoords.length; _ji2++) {
          if (stationCoords[_ji2].stationId === _jfG.station) { _jIdx = _ji2; break; }
        }
        if (_jIdx < 0) continue;
        var _bx = (_bSide(bgi) === "left")
          ? (stationCoords[_jIdx].x - _branchStubL - _bCol(bgi) * _branchColW)
          : (stationCoords[_jIdx].x + _branchStubR + _bCol(bgi) * GEOM.BRANCH_COL_W);
        var _by = stationCoords[_jIdx].y;
        var _bsp = sp || 24;
        // junction 在支线站表末位（我孫子支线）→ 反转站序从 junction 向下延伸
        var _gStations = (_jfG.at === _br.stations.length - 1) ? _br.stations.slice().reverse() : _br.stations;
        var _bcoords = new Array(_br.stations.length);
        _bcoords[_jfG.at] = {stationId:_jfG.station, x:stationCoords[_jIdx].x, y:_by};
        if (_branchModes[bgi] === 'h') {
          // 短支线水平直线横排——跳过 junction 站（主干已画），从 junction
          // 向侧边水平排开（站距 = 全支线最宽名 + 12）；列车定位坐标同步横排
          var _bHx0 = stationCoords[_jIdx].x, _bHy0 = stationCoords[_jIdx].y, _bHi = 0;
          for (var _bsiH = 0; _bsiH < _gStations.length; _bsiH++) {
            if (_gStations[_bsiH] === _jfG.station) continue;
            var _bHx = (_bSide(bgi) === "left")
              ? (_bHx0 - (_bHi + 1) * branchLayouts[_br.id].pitch)
              : (_bHx0 + (_bHi + 1) * branchLayouts[_br.id].pitch);
            _bcoords[_br.stations.indexOf(_gStations[_bsiH])] = { stationId: _gStations[_bsiH], x: _bHx, y: _bHy0 };
            _bHi++;
          }
        } else {
          // 竖列跳过 junction 站（主干已绘）——支线独有站**第一站与 junction 同行**：
          // 用户："岔路的第一个站和出去的站在一行"——岔路第一站水平叉出、与岔路点（junction）
          // 同一水平行，再竖列向下（原 _bK=1 从 junction 下方一档开始，第一站落到主干下一站行，
          // 岔路起点视觉下沉一档）；横排支线第一站本就与 junction 同行（y=by），规则统一。
          var _bK = 0;
          for (var _bsi = 0; _bsi < _gStations.length; _bsi++) {
            if (_gStations[_bsi] === _jfG.station) continue;
            _bcoords[_br.stations.indexOf(_gStations[_bsi])] = { stationId: _gStations[_bsi], x: _bx, y: _by + _bK * _bsp };
            _bK++;
          }
        }
        branchGeom[_br.id] = _bcoords;
      }
    }

    // 将竖直支线尾段纳入地图高度。
    // svgH 原只按主干 stationCoords 站间距计算（junction 靠上 + 长竖列支线时支线底部会被
    // viewBox 裁剪）；现取全部支线坐标最大 y，超过主干底时扩展画布（横排与 junction 同行
    // 不影响高度，竖列每站已按 sp 站间距排布，底部 = 站数 × sp）。
    if (branchGeom) {
      var _maxBrY = 0;
      for (var _bgKey in branchGeom) {
        if (Object.prototype.hasOwnProperty.call(branchGeom, _bgKey)) {
          var _bgArr = branchGeom[_bgKey];
          if (_bgArr && _bgArr.length) {
            var _bgLast = _bgArr[_bgArr.length - 1];
            if (_bgLast && _bgLast.y > _maxBrY) _maxBrY = _bgLast.y;
          }
        }
      }
      if (_maxBrY > 0) {
        svgH = Math.max(svgH, _maxBrY + sp + botP);
      }
    }

    // 终点标签也是内容：确保最后一个车站拥有的标签堆栈位于视图内。
    stationCoords.forEach(function(p) {
      var h = _throughChipHeight(transferMap[p.stationId], _isMobileView(), throughChipMaxWidth);
      if (h) svgH = Math.max(svgH, p.y + h + 64);
    });

    // 构建几何对象。
    var geometry = {
      lineId: lineId,
      lineHash: lineHash,
      staticRevision: staticRevision,
      stations: stations,
      stationCoords: stationCoords,
      svgW: svgW,
      svgH: svgH,
      isLoop: isLoop,
      throughChipMaxWidth: throughChipMaxWidth,
      isSixShapedLoop: isSixShapedLoop,
      trackLayout: line.trackLayout || null,
      sixLoopStartIndex: isSixShapedLoop ? hikarigaokaIdx + 1 : null,
      sixTailEndIndex: isSixShapedLoop ? hikarigaokaIdx : null,
      sixTopology: isSixShapedLoop ? "one-line-open-tail-and-closed-loop" : null,
      isDualLoop6: isSixShapedLoop, // 六形环环段左右二分（双列）——站名朝外、clamp 走通用
      sp: sp,
      color: color,
      stationDisplayColor: function(stationId) {
        var rules = _lineSegmentDisplayRules(lineId);
        if (!rules) return color;
        var _idx = stations.indexOf(stationId);
        if (_idx < 0) return color;
        var _next = _idx < stations.length - 1 ? stations[_idx + 1] : stationId;
        var _prev = _idx > 0 ? stations[_idx - 1] : stationId;
        // 边界车站采用进入其后的区段颜色。
        if (rules.before && stationId === rules.before.station && rules.before.stationMode === "next") {
          return _segmentDisplayColor(lineId, stationId, _next, color);
        }
        if (rules.after && stationId === rules.after.station && rules.after.stationMode === "self") {
          return rules.after.color || color;
        }
        return _segmentDisplayColor(lineId, _prev, _next, color);
      },
      branchLines: branchLines,
      branchOffset: branchOffset,
      branchSides: (function() { var _ba = []; for (var _bi5 = 0; _bi5 < branchLines.length; _bi5++) _ba.push(_bSide(_bi5)); return _ba; })(), // 每支线分叉侧（跨函数传给 renderTrainMap）
      bCol: _bCol, // 支线列序号（跨函数）
      branchStubL: _branchStubL, // 左侧支线 stub（主干最宽站名+22，跨函数）
      branchStubR: _branchStubR, // 右侧支线 stub（≥ 站间距，跨函数）
      branchColW: _branchColW, // 左侧列距动态化（跨函数）
      branchH: _branchH, // 短支线线 → 支线水平直线横排（跨函数）
      branchModes: _branchModes, // 每支线画法（h 横排 / v 竖列，跨函数）
      rightBranch: _rightCols > 0 && branchLines.length >= 2, // 存在右支线（junction 站名转圆点上方+白描边）
      branchLayouts: branchLayouts,
      branchHSp: _branchHSp, // 横排站距（跨函数）
      branchGeom: branchGeom,
      routeElements: routeElements,
      junctionStation: isSixShapedLoop ? stations[0] : null,
      junctionX: isSixShapedLoop ? junctionX : null,
      junctionY: isSixShapedLoop ? junctionY : null, // 左列第 7 位 y（站名方向/紧致 clamp 依据）
      loopRectW: isSixShapedLoop ? loopRectW : null, // 环宽（左列上方站 clamp 到右列圆点前）
      fusionMap: fusionMap || null
    };
    
    // 写入缓存。
    _routeGeometryCache[_geomKey(lineId)] = geometry;
    
    return geometry;
  }
  
  function _computeLineHash(line, lineId, staticRevision) {
    var host = typeof document !== 'undefined' && document.querySelector
      ? document.querySelector('#trainsMapContainer') : null;
    return JSON.stringify([lineId, line.stations, line.type, line.color,
      line.isSixShapedLoop, line.isDoubleColumnLoop, line.loopJunction,
      line.trackLayout || null,
      staticRevision != null ? staticRevision : (typeof _staticNetworkSignature === 'function' ? _staticNetworkSignature() : getLinesData()),
      window.currentLang || 'ja', _isMobileView(), host ? host.clientWidth : window.innerWidth,
      GEOM, typeof document !== 'undefined' && document.fonts ? document.fonts.status : '', window.TrainsActiveSystemLineIds || []]);
  }
  
  function invalidateRouteGeometryCache(lineId) {
    if (lineId) {
      // 缓存的父线路映射也拥有其支线和延伸几何。
      // 使所有消费该线路的语言/视口缓存条目失效。
      Object.keys(_routeGeometryCache).forEach(function(key) {
        var geometry = _routeGeometryCache[key];
        if (geometry.lineId === lineId ||
            geometry.branchLines.some(function(branch) { return branch.id === lineId; }) ||
            geometry.fusionMap && geometry.fusionMap[lineId]) {
          delete _routeGeometryCache[key];
        }
      });
    } else {
      _routeGeometryCache = {};
    }
  }
  
  // === 统一车站渲染器（主线与支线共用样式） ===
  // 主線/支線の区別は geometry（座標・side・色）のみに残し、駅・ラベル・
  // 乗換チップ・直通チップの描画はこの関数一本で統一。支線駅も主線駅と同一スタイル。

  // 枝干站名侧 = 站名占用检测（用户纠正："我说的是站名"）——检测对象是
  // **站名文字带**而非空间/几何：枝干（光丘尾 10 站 + Tochomae junction）站名放某一侧时，
  // 若与主干（环）站的站名文字带重叠（该侧被主干站名占用），则放另一侧；双侧都不重叠
  // → 默认朝右（岔路站名标准）。主干站名带方向按双排固定规则（左列上方朝右、
  // 左列下方朝左、右列朝右，）。画布边界为硬约束（放不下即占用）。
  function _pickSixLabelSide(o, geometry, svgW) {
    var x = o.x, y = o.y;
    var off = o.isJunction ? 14 : 10;
    var W = (o.labelLen || 3) * 16 * 1.1; // 当前枝干站全尺寸文字宽
    var y0 = y - 8, y1 = y + 8;
    var rightRect = [x + off, x + off + W, y0, y1];
    var leftRect = [x - off - W, x - off, y0, y1];
    var rightOccupied = false, leftOccupied = false;

    // 画布边界硬约束（放不下即占用）
    if (rightRect[1] > svgW - 2) rightOccupied = true;
    if (leftRect[0] < 0) leftOccupied = true;

    // 主干（环）站名文字带重叠检测
    var scs = geometry.stationCoords || [];
    var jx = geometry.junctionX, jy = geometry.junctionY;
    for (var i = 0; i < scs.length; i++) {
      var sc = scs[i];
      if (sc.stationId === o.stationId) continue;      // 跳过自身
      if (sc.x < jx - 0.5) continue;                   // 跳过枝干光丘尾站（环外）
      if (Math.abs(sc.x - jx) < 0.5 && sc.stationId === geometry.junctionStation) continue; // 跳过 junction 自身
      var sName = (window.RailwayDB && window.RailwayDB.resolveStationName)
        ? (window.RailwayDB.resolveStationName(sc.stationId, window.currentLang) || sc.stationId)
        : sc.stationId;
      var sW = (sName || "").length * 16 * 1.1;
      var soff = (sc.stationId === geometry.junctionStation) ? 14 : 10;
      var sRect;
      if (Math.abs(sc.x - jx) < 0.5) {
        // 左列主干站统一朝左（上方由朝右改朝左，与左列下方一致）
        sRect = [sc.x - soff - sW, sc.x - soff, sc.y - 8, sc.y + 8];
      } else {
        // 右列主干站：朝右
        sRect = [sc.x + soff, sc.x + soff + sW, sc.y - 8, sc.y + 8];
      }
      if (rightRect[0] < sRect[1] && sRect[0] < rightRect[1] &&
          rightRect[2] < sRect[3] && sRect[2] < rightRect[3]) rightOccupied = true;
      if (leftRect[0] < sRect[1] && sRect[0] < leftRect[1] &&
          leftRect[2] < sRect[3] && sRect[2] < leftRect[3]) leftOccupied = true;
    }

    if (leftOccupied && !rightOccupied) return "right";
    if (rightOccupied && !leftOccupied) return "left";
    return "right"; // 双侧同况（都空/都占）→ 默认朝右
  }

  // 暴露共线线路配置表——其他模块自动获取共线线
  window.SharedTrackPairs = {
    getSharedLines:function(lineId){return _sharedSections(lineId).map(function(s){return s.partner;});},
    isSharedStation:function(lineId,stationId,partner){
      return _sharedSections(lineId,partner).some(function(s){return s.stations.indexOf(stationId)>=0;});
    },
    projectPosition:_projectSharedPosition
  };

/* ThroughChip 属于列车地图几何所有者。 */
/* 直通标签公共组件（window.ThroughChip）
 * 直通标签的尺寸、颜色与布局工具集中在本组件内。
 * 同质异参组件：样式统一，仅文本（直通+线路名）、方向（up/down/middle）、
 * 窄屏换行、mobile/desktop 字号等参数变化。
 *
 * API：
 *   ThroughChip.size(lineObj, mobile, maxWidth)
 *     -> {w,h,label,lines,fontSize,rowH,arrowX,textX}
 *   ThroughChip.height(items, mobile, maxWidth, dir)
 *     -> 堆叠高度（几何预留与渲染共用同一计算）
 *   ThroughChip.layoutGroup(items, mobile, maxWidth, x, y, align, bounds)
 *     -> [{item,x,y,size}]（组内放置，含边界钳制）
 *   ThroughChip.normalize(items)
 *     -> 归一化去重排序列表（up/down/middle）
 *   ThroughChip.dirForStation(lineId, stationId, throughLineId)
 *     -> "up"|"down"|"middle"|null（线首/线末/接续方向）
 *   ThroughChip.render(layer, ns, x, y, lineObj, iconSize, mobile, maxWidth)
 *     -> 消耗宽度 w（渲染 SVG <g> 并绑定跳转）
 *   ThroughChip.badgeText(lineObj)
 *     -> 完整文本（aria-label / <title> 用）
 */
(function () {
  "use strict";

  var _measureCache = {};

  function _estimateWidth(label, fontSize) {
    var w = 0;
    var s = String(label || "");
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      if (/\s/.test(s.charAt(i))) w += fontSize * 0.5;
      else if (code >= 0x3000 || code === 0x2026) w += fontSize;
      else w += fontSize * 0.68;
    }
    return Math.ceil(w);
  }

  // SVG 隐藏探针测量（带缓存）；DOM 不可用时回退估算。
  function _measureWidth(label, fontSize) {
    var key = fontSize + "|" + label;
    if (_measureCache[key] != null) return _measureCache[key];
    var fallback = _estimateWidth(label, fontSize);
    try {
      if (typeof document === "undefined" || !document.body) {
        _measureCache[key] = fallback;
        return fallback;
      }
      var ns = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(ns, "svg");
      var text = document.createElementNS(ns, "text");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      svg.style.left = "-9999px";
      svg.style.top = "-9999px";
      svg.style.visibility = "hidden";
      text.setAttribute("font-family", "inherit");
      text.setAttribute("font-size", fontSize);
      text.setAttribute("font-weight", "700");
      text.textContent = label;
      svg.appendChild(text);
      document.body.appendChild(svg);
      var measured = Math.ceil(text.getComputedTextLength ? text.getComputedTextLength() : fallback);
      document.body.removeChild(svg);
      _measureCache[key] = measured || fallback;
      return _measureCache[key];
    } catch (e) {
      _measureCache[key] = fallback;
      return fallback;
    }
  }

  // 短名：去"直通/직통/Through Service"前缀，取括注线路名或主名。
  function _shortName(lineObj, mobile) {
    if (lineObj && lineObj.overflowCount) return "+" + lineObj.overflowCount;
    var nm = String(lineObj.name || lineObj.lineId || "").replace(/直通|직통|Through Service/gi, "").replace(/\s+/g, " ").trim();
    var m = nm.match(/[（(]([^）)]*(?:ライン|路線|路线))[）)]/);
    nm = m ? m[1] : nm.split(/[（(]/)[0].trim();
    return nm;
  }

  // 完整文本（含运营公司 / 直通 / 站外换乘注记）。
  function _badgeText(lineObj) {
    var opName = (lineObj.operator && window.tOp) ? window.tOp(lineObj.operator) : "";
    var base = (opName ? opName + " " : "") + lineObj.name;
    if (lineObj.through) {
      var thru = (window.t ? window.t("train.throughService", "相互直通運転") : "相互直通運転");
      base = base + "（" + thru + "）";
    } else if (lineObj.type === "out") {
      var outLbl = (window.t ? window.t("train.transferOut", "站外換乘") : "站外換乘");
      var _note = lineObj.note || "";
      var _walkM = _note.match(/徒歩約(\d+)分/);
      if (_walkM) {
        var _n = parseInt(_walkM[1], 10);
        var _lng = window.currentLang || "ja";
        var _wl = _lng === "en" ? ("approx " + _n + " min walk")
          : _lng === "zh" ? ("步行約" + _n + "分")
          : _lng === "ko" ? ("도보 약 " + _n + "분")
          : ("徒歩約" + _n + "分");
        _note = _note.replace(/，?徒歩約\d+分/, "，" + _wl);
      }
      base = base + "（" + outLbl + (_note ? " " + _note : "") + "）";
    }
    return base;
  }

  function _hexToRgba(hex, a) {
    var h = String(hex || "#555").replace("#", "");
    if (h.length === 3) h = h.split("").map(function(c){ return c + c; }).join("");
    var n = parseInt(h, 16);
    if (isNaN(n)) { h = "555"; n = parseInt(h, 16); }
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  // 尺寸：测量 + 窄屏换行 + 箭头槽/文字起点。
  // 标签直接显示线路短名（"直通"前缀冗余——箭头已表达直通语义，且窄屏时避免独占换行层）。
  function _chipSize(lineObj, mobile, maxWidth) {
    var nm = _shortName(lineObj, mobile);
    var label = nm;
    var fontSize = mobile ? 11 : 9;
    var narrow = maxWidth && maxWidth < 100;
    var arrowSlot = narrow ? 8 : (mobile ? 12 : 11), gap = narrow ? 4 : (mobile ? 10 : 8);
    var padX = mobile ? 5 : 4, padEnd = narrow ? 5 : (mobile ? 8 : 6);
    var maxW = Math.max(48, Math.min(maxWidth || (mobile ? 148 : 124), mobile ? 148 : 124));
    var overhead = padX + arrowSlot + gap + padEnd;
    var available = maxW - overhead;
    var wrapped = _measureWidth(label, fontSize) > available;
    var lines = [], current = "";
    Array.from(nm).forEach(function(ch) {
      if (current && _measureWidth(current + ch, fontSize) > available) {
        lines.push(current.trim()); current = "";
      }
      current += ch;
    });
    if (current.trim()) lines.push(current.trim());
    var textW = Math.max.apply(null, lines.map(function(x) { return _measureWidth(x, fontSize); }));
    var h = Math.max(fontSize + 8, lines.length * (fontSize + 2) + 8);
    return {w: Math.min(maxW, overhead + textW), h: h, label: label, lines: lines,
      fontSize: fontSize, rowH: h + 4, arrowX: padX + arrowSlot / 2,
      textX: padX + arrowSlot + gap};
  }

  // 几何预留与渲染共用同一堆叠高度。
  function _chipHeight(items, mobile, maxWidth, dir) {
    return _normalize(items).filter(function(it) { return !dir || it.dir === dir; })
      .reduce(function(h, it) { return h + _chipSize(it, mobile, maxWidth).h + 4; }, 0);
  }

  // 组内放置（对齐 + 边界钳制），返回每项放置结果。
  function _layoutGroup(items, mobile, maxWidth, x, y, align, bounds) {
    var sizes = items.map(function(it) { return _chipSize(it, mobile, maxWidth); });
    var width = Math.max.apply(null, sizes.map(function(sz) { return sz.w; }));
    if (!items.length) return [];
    var left = align === "end" ? x - width : align === "middle" ? x - width / 2 : x;
    left = Math.max(bounds.minX, Math.min(left, bounds.maxX - width));
    return items.map(function(it, i) {
      var sz = sizes[i];
      var itemX = left + (align === "end" ? width - sz.w : align === "middle" ? (width - sz.w) / 2 : 0);
      var placed = {item:it, x:itemX, y:y, size:sz};
      y += sz.h + 4;
      return placed;
    });
  }

  // 横向一字排开（上/下端头标签用），锚点对齐 + 边界钳制；各 chip 顶部对齐同一 y。
  function _layoutRow(items, mobile, maxWidth, x, y, align, bounds) {
    var sizes = items.map(function(it) { return _chipSize(it, mobile, maxWidth); });
    if (!items.length) return [];
    var rowGap = 6;
    var totalW = sizes.reduce(function(s, sz) { return s + sz.w + rowGap; }, -rowGap);
    var left = align === "end" ? x - totalW : align === "middle" ? x - totalW / 2 : x;
    left = Math.max(bounds.minX, Math.min(left, bounds.maxX - totalW));
    var cx = left;
    return items.map(function(it, i) {
      var sz = sizes[i];
      var placed = {item:it, x:cx, y:y, size:sz};
      cx += sz.w + rowGap;
      return placed;
    });
  }

  // 归一化 + 去重 + 排序（up < middle < down 按名称）。
  function _normalize(items) {
    var seen = {}, out = [];
    (items || []).forEach(function(it) {
      if (!it || !it.through) return;
      var dir = it.dir === "up" || it.dir === "down" ? it.dir : "middle";
      var key = dir + "|" + (it.lineId || it.name || "");
      if (seen[key]) return;
      seen[key] = true;
      out.push(Object.assign({}, it, {dir:dir}));
    });
    return out.sort(function(a, b) {
      return a.dir.localeCompare(b.dir) || String(a.lineId || a.name).localeCompare(String(b.lineId || b.name));
    });
  }

  // 方向数据（逻辑收敛自 trains-data.js _throughDirForStation）：
  // 线首站→up、线末站→down、接续（canonical/display anchor）→middle、贯通前后段判定。
  function _dirForStation(lineId, stationId, throughLineId) {
    var thrIds = _canonicalThroughLines(lineId);
    if (!thrIds.length) return null;
    var src2 = (window.RailwayDB && window.RailwayDB.getAllLines) ? window.RailwayDB.getAllLines() : getLinesData();
    var own2 = src2[lineId];
    // A passenger-facing corridor can intentionally be shorter than the
    // canonical timetable route (for example Ueno-Tokyo is drawn Ueno→
    // Shinagawa while its source timetable keeps the whole service path).
    // Endpoint direction belongs to the displayed diagram, not to that
    // hidden source route; otherwise both visible terminal chips fall back
    // to middle and violate the shared DM layout rule.
    var ownPresentation = own2 && own2.presentation;
    var displayStations = ownPresentation && Array.isArray(ownPresentation.mapStations)
      ? ownPresentation.mapStations : null;
    var sts2 = displayStations || ((own2 && own2.stations) ? own2.stations : []);
    var idx2 = sts2.indexOf(stationId);
    if (idx2 < 0) return null;
    var targetIds = throughLineId ? [throughLineId] : thrIds;
    for (var ti = 0; ti < targetIds.length; ti++) {
      var targetId = targetIds[ti];
      var tl = src2[targetId];
      if (!tl || !tl.stations) continue;
      var joins = _canonicalJoinStations(lineId, targetId);
      var anchors = joins;
      var isCanonicalJoin = Array.isArray(joins) && joins.indexOf(stationId) >= 0;
      var isDisplayAnchor = Array.isArray(anchors) && anchors.indexOf(stationId) >= 0;
      if (!isCanonicalJoin && !isDisplayAnchor && tl.stations.indexOf(stationId) < 0) continue;
      if (idx2 === 0) return "up";
      if (idx2 === sts2.length - 1) return "down";
      if (isCanonicalJoin || isDisplayAnchor) return "middle";
      var allAfterOnThrough = true;
      var afterCount = 0;
      for (var ai = idx2 + 1; ai < sts2.length; ai++) {
        if (tl.stations.indexOf(sts2[ai]) < 0) { allAfterOnThrough = false; break; }
        afterCount++;
      }
      if (allAfterOnThrough && afterCount >= 2) return "down";
      var allBeforeOnThrough = true;
      var beforeCount = 0;
      for (var bi = 0; bi < idx2; bi++) {
        if (tl.stations.indexOf(sts2[bi]) < 0) { allBeforeOnThrough = false; break; }
        beforeCount++;
      }
      if (allBeforeOnThrough && beforeCount >= 2) return "up";
      return "middle";
    }
    return null;
  }

  // 直通标签为纯展示（不再绑定跳转链接）。

  // SVG 渲染：背景 + 方向箭头（up/down/middle）+ 居中文本块 + title。
  // 返回消耗宽度 w（供流式布局推进）。
  function _render(layer, ns, x, y, lineObj, iconSize, mobile, maxWidth) {
    var sz = _chipSize(lineObj, mobile, maxWidth);
    var label = sz.label;
    var w = sz.w, h = sz.h;
    var lc = lineObj.color || "#555";
    var chip = document.createElementNS(ns, "g");
    chip.setAttribute("transform", "translate(" + x + "," + y + ")");
    chip.setAttribute("class", "through-chip");
    chip.setAttribute("data-through-line", lineObj.lineId || "");
    layer.appendChild(chip);
    var bg = document.createElementNS(ns, "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", w);
    bg.setAttribute("height", h);
    bg.setAttribute("rx", "3");
    bg.setAttribute("fill", _hexToRgba(lc, 0.16));
    bg.setAttribute("stroke", lc);
    bg.setAttribute("stroke-width", "1");
    chip.appendChild(bg);
    if (lineObj.title) {
      var bgTitle = document.createElementNS(ns, "title");
      bgTitle.textContent = lineObj.title;
      bg.appendChild(bgTitle);
    }
    // 箭头：up=▲朝上 / down=▼朝下 / middle=→朝右（left 侧 chip 用 ←）。
    var dir = lineObj.dir || "middle";
    var arr = document.createElementNS(ns, "path");
    arr.setAttribute("fill", lc);
    arr.setAttribute("stroke", lc);
    arr.setAttribute("stroke-width", mobile ? "2" : "1.8");
    arr.setAttribute("stroke-linecap", "round");
    arr.setAttribute("stroke-linejoin", "round");
    var _ax = sz.arrowX || 8;
    var _ay = h / 2;
    var _d;
    if (dir === "up") {
      _d = "M" + (_ax - 3.5) + " " + (_ay + 2.5) + " L " + _ax + " " + (_ay - 2.5) + " L " + (_ax + 3.5) + " " + (_ay + 2.5) + " Z";
    } else if (dir === "down") {
      _d = "M" + (_ax - 3.5) + " " + (_ay - 2.5) + " L " + _ax + " " + (_ay + 2.5) + " L " + (_ax + 3.5) + " " + (_ay - 2.5) + " Z";
    } else {
      if (lineObj._throughSide === "left") {
        _d = "M" + (_ax + 3) + "," + (_ay - 2.5) + " L" + (_ax - 3) + "," + _ay + " L" + (_ax + 3) + "," + (_ay + 2.5) + " Z";
      } else {
        _d = "M" + (_ax - 3) + "," + (_ay - 2.5) + " L" + (_ax + 3) + "," + _ay + " L" + (_ax - 3) + "," + (_ay + 2.5) + " Z";
      }
    }
    arr.setAttribute("d", _d);
    chip.appendChild(arr);
    var txt = document.createElementNS(ns, "text");
    txt.setAttribute("x", sz.textX || 14);
    txt.setAttribute("y", h / 2);
    txt.setAttribute("font-size", sz.fontSize || (mobile ? 11 : 9));
    txt.setAttribute("fill", lc);
    txt.setAttribute("font-weight", "700");
    txt.setAttribute("dominant-baseline", "central");
    // 文本块垂直中心 = chip 中心 h/2（与箭头 _ay=h/2 同一中线）。
    var _nLines = sz.lines.length;
    var _firstY = h / 2 - (_nLines - 1) * (sz.fontSize + 2) / 2;
    sz.lines.forEach(function(line, i) {
      var span = document.createElementNS(ns, "tspan");
      span.setAttribute("x", sz.textX);
      span.setAttribute("dominant-baseline", "central");
      span.setAttribute("y", _firstY + i * (sz.fontSize + 2));
      span.textContent = line;
      txt.appendChild(span);
    });
    chip.appendChild(txt);
    var title = document.createElementNS(ns, "title");
    title.textContent = lineObj.title || _badgeText(lineObj);
    chip.appendChild(title);
    return w;
  }

  window.ThroughChip = {
    size: _chipSize,
    height: _chipHeight,
    layoutGroup: _layoutGroup,
    layoutRow: _layoutRow,
    normalize: _normalize,
    dirForStation: _dirForStation,
    render: _render,
    badgeText: _badgeText,
    shortName: _shortName,
    measureWidth: _measureWidth
  };
})();


