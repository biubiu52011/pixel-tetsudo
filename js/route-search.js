/**
 * Pixel Tetsudo - 路径搜索模块
 * 基于 UNIFIED_LINES 数据结构，使用广度优先搜索（BFS）查找车站之间的路径。
 */

(function() {
  'use strict';

  let _graphCache = null;
  let _graphVersion = 0;

  /**
   * 根据 UNIFIED_LINES 构建双向邻接表。
   * 返回：Map<stationName, Set<connectedStationNames>>
   */
  // 干线本名不进搜索图。线路层级只允许 RuntimeConfig 持有一份，
  // 避免 route-search 与展示层各自维护名单后发生 ID 漂移。
  function _isTrunk(lineId) {
    var ids = (window.RuntimeConfig && window.RuntimeConfig.TRUNK_MAIN_LINE_IDS) || [];
    return ids.indexOf(lineId) >= 0;
  }

  function buildStationGraph() {
    if (_graphCache) return _graphCache;
    const graph = new Map();
    
    for (const [lineId, line] of Object.entries(window.RailwayDB ? window.RailwayDB.getAllLines() : (window.DataLayer ? window.DataLayer.getAllLines() : window.UNIFIED_LINES || {}))) {
      if (!line || !line.stations) continue;
      if (_isTrunk(lineId)) continue;
      
      // 将本线路的所有车站加入图（建立相邻连接）。
      for (let i = 0; i < line.stations.length; i++) {
        const station = line.stations[i];
        if (!graph.has(station)) {
          graph.set(station, new Set());
        }
        
        // 连接到前一个车站（如果存在）。
        if (i > 0) {
          const prev = line.stations[i - 1];
          graph.get(station).add(prev);
          graph.get(prev).add(station);
        }
        
        // 连接到后一个车站（如果存在）。
        if (i < line.stations.length - 1) {
          const next = line.stations[i + 1];
          graph.get(station).add(next);
          if (graph.has(next)) { graph.get(next).add(station); }
        }
      }
      
      // 这里不构建跨线路换乘：换乘关系由共享车站 ID（buildLayerGraph.stationLines）
      // 和显式 transferStations（换乘惩罚）/transferStations[].toStation（异名换乘）
      // 建立，并在下方的 Dijkstra 换乘步骤中消费。
    }
    
    _graphCache = graph;
    return graph;
  }

  /**
   * 获取缓存图；必要时在两站之间重新构建。
   * @param {string} fromStation - 起点站名
   * @param {string} toStation - 终点站名
   * @returns {Object|null} { path: string[], durationMin: number, lineInfo: Array[] }，无路径时返回 null
   */
  // 搜索模式的换乘惩罚（分钟）。三种模式对应换乘案内：
  // combo（推荐）= 均衡，duration（最快）= 低惩罚，transfers（最少换乘）= 惩罚优先。
  const MODE_PENALTY = {
    combo: { transfer: 6, through: 0 },
    duration: { transfer: 3, through: 0 },
    transfers: { transfer: 1000, through: 0 }
  };

  // Dijkstra 优先队列使用的最小二叉堆。
  function _MinHeap() {
    this.a = [];
  }
  _MinHeap.prototype.push = function(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      // 比较（成本、换乘次数）：成本相同时优先换乘次数更少的状态。
      if (a[p][0] < a[i][0] || (a[p][0] === a[i][0] && a[p][1] <= a[i][1])) break;
      const t = a[p]; a[p] = a[i]; a[i] = t;
      i = p;
    }
  };
  _MinHeap.prototype.pop = function() {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && (a[l][0] < a[m][0] || (a[l][0] === a[m][0] && a[l][1] < a[m][1]))) m = l;
        if (r < a.length && (a[r][0] < a[m][0] || (a[r][0] === a[m][0] && a[r][1] < a[m][1]))) m = r;
        if (m === i) break;
        const t = a[m]; a[m] = a[i]; a[i] = t;
        i = m;
      }
    }
    return top;
  };
  _MinHeap.prototype.size = function() { return this.a.length; };

  // 文本车站 ID 不是全国范围的物理车站身份。
  // 例如东京的王子和奈良的王寺都可能存为 "Oji"；在 canonical ID 修正前，
  // 必须阻止相距很远的线路通过合并后的标签换乘。
  // 使用线路邻站证据，是因为共享车站键上的单个坐标本身也可能指向错误地理位置。
  // 换乘是车站位置之间的实际步行，不是名称匹配。
  // canonical 换乘声明包含站外连接；已支持的最大步行距离仍在此边界内。
  // 坐标缺失时保持未确认，不得静默创建全国范围的同名站边。
  const TRANSFER_MAX_DISTANCE_KM = 3;
  const SHARED_ID_MAX_DISTANCE_KM = 170;

  function _medianGeoNumber(values) {
    if (!values.length) return null;
    values.sort(function(a,b){return a-b;});
    const mid=Math.floor(values.length/2);
    return values.length%2 ? values[mid] : (values[mid-1]+values[mid])/2;
  }

  function _pointFromCanonicalCoords(raw) {
    if (!raw) return null;
    const lat=Number(Array.isArray(raw) ? raw[0] : raw.lat);
    const lng=Number(Array.isArray(raw) ? raw[1] : (raw.lng != null ? raw.lng : raw.lon));
    return Number.isFinite(lat) && Number.isFinite(lng) &&
      Math.abs(lat)<=90 && Math.abs(lng)<=180 ? {lat:lat,lng:lng} : null;
  }

  function _lineNeighborhood(stations, index, coords) {
    const neighbors=[];
    for (let offset=-2;offset<=2;offset++) {
      if (offset===0 || !stations[index+offset]) continue;
      const p=_pointFromCanonicalCoords(coords[stations[index+offset]]);
      if (p) neighbors.push(p);
    }
    if (!neighbors.length) return null;
    return {
      lat:_medianGeoNumber(neighbors.map(function(p){return p.lat;})),
      lng:_medianGeoNumber(neighbors.map(function(p){return p.lng;}))
    };
  }

  function _geographicDistanceKm(a,b) {
    const rad=Math.PI/180;
    const dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;
    const square=Math.sin(dLat/2)**2+
      Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
    return 12742*Math.asin(Math.min(1,Math.sqrt(Math.max(0,square))));
  }

  function _plausibleTransfer(layer,station,fromLine,toStation,toLine) {
    const maxDistance = station === toStation ? SHARED_ID_MAX_DISTANCE_KM : TRANSFER_MAX_DISTANCE_KM;
    const directA = _pointFromCanonicalCoords(layer.stationCoords && layer.stationCoords[station]);
    const directB = _pointFromCanonicalCoords(layer.stationCoords && layer.stationCoords[toStation]);
    const a=layer.stationGeoContexts.get(station+'\u0001'+fromLine);
    const b=layer.stationGeoContexts.get(toStation+'\u0001'+toLine);
    // 别名车站拥有自己的 canonical 坐标；不要比较可能相距数公里的线路邻域。
    if (station !== toStation && directA && directB) {
      return _geographicDistanceKm(directA,directB) <= maxDistance;
    }
    // 共享 ID 优先使用线路本地邻站证据：它可以捕获单个车站坐标误导造成的
    // canonical ID 冲突。
    if (a && b) return _geographicDistanceKm(a,b) <= maxDistance;
    // 线路邻域不完整时，仍可使用 canonical 坐标检查。
    if (directA && directB) return _geographicDistanceKm(directA,directB) <= maxDistance;
    // 没有位置证据表示未确认，不得编造换乘。
    return false;
  }

  // 分层图缓存：（车站、线路）状态。
  // stationLines：Map<station, Set<lineId>>；lineMeta：lineId -> {stations, positions, durations, durationTotalMin}
  let _layerCache = null;
  function buildLayerGraph() {
    if (_layerCache) return _layerCache;
    const lines = window.RailwayDB ? window.RailwayDB.getAllLines() :
                  (window.DataLayer ? window.DataLayer.getAllLines() : window.UNIFIED_LINES || {});
    const lineIds = Object.keys(lines);
    const stationLines = new Map();
    const lineMeta = {};
    const stationGeoContexts = new Map();
    const sourceCoords = (window.STATION_COORDS && Object.keys(window.STATION_COORDS).length)
      ? window.STATION_COORDS
      : ((window.RailwayDB && window.RailwayDB.getData && window.RailwayDB.getData().stations) || {});
    for (const lid of lineIds) {
      const l = lines[lid];
      if (!l || !l.stations || !l.stations.length) continue;
      // 干线本名不进层图（与 buildStationGraph 一致）
      if (_isTrunk(lid)) continue;
      const positions = new Map();
      l.stations.forEach(function(st, i) {
        positions.set(st, i);
        if (!stationLines.has(st)) stationLines.set(st, new Set());
        stationLines.get(st).add(lid);
        stationGeoContexts.set(st+'\u0001'+lid,_lineNeighborhood(l.stations,i,sourceCoords));
      });
      lineMeta[lid] = {
        stations: l.stations,
        positions: positions,
        durations: Array.isArray(l.durations) ? l.durations : [],
        durationTotalMin: Number(l.durationTotalMin)
      };
    }
    _layerCache = { stationLines: stationLines, lineMeta: lineMeta, transferPenalty: buildTransferPenalty(lines), aliasTransfers: buildAliasTransfers(lines), stationGeoContexts: stationGeoContexts, stationCoords: sourceCoords };
    return _layerCache;
  }

  // 部分导入线路记录只有总时长或不完整的区间列表。
  // 将回退逻辑集中在此处，避免路径搜索和区间拆分出现分歧；
  // 始终按两站之间的区间索引，而不是按行驶方向索引。
  function segmentDuration(meta, segmentIndex) {
    if (!meta || segmentIndex == null) return 2;
    const explicit = Number(meta.durations && meta.durations[segmentIndex]);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const count = Math.max(1, (meta.stations || []).length - 1);
    const total = Number(meta.durationTotalMin);
    return Number.isFinite(total) && total > 0 ? Math.max(1, Math.round(total / count)) : 2;
  }

  function durationBetween(meta, fromIndex, toIndex) {
    if (!meta || fromIndex == null || toIndex == null || fromIndex === toIndex) return 0;
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    let total = 0;
    for (let i = start; i < end; i++) total += segmentDuration(meta, i);
    return total;
  }

  // 从显式 transferStations 声明中读取换乘惩罚。
  // 共享车站 ID 足以支持网站的基础换乘搜索；声明补充实际步行时间和别名车站映射。
  // 即使来源缺少声明，也能保留普通访客路径。
  function buildTransferPenalty(lines) {
    const m = new Map(); // "station\u0001lineA\u0001lineB" -> { out: bool, walk: int }
    function addPenalty(station, a, b, transfer) {
      if (!station || !a || !b) return;
      const key = station + '\u0001' + (a < b ? a : b) + '\u0001' + (a < b ? b : a);
      const current = m.get(key);
      if (!current || (transfer.type === 'out' && !current.out) || (walkMin(transfer.note) > current.walk)) {
        m.set(key, { out: transfer.type === 'out' || !!(current && current.out), walk: walkMin(transfer.note) });
      }
    }
    for (const lid of Object.keys(lines)) {
      const l = lines[lid];
      if (!l || !Array.isArray(l.transferStations)) continue;
      for (const t of l.transferStations) {
        if (!t || !t.station || !t.lineId || !lines[t.lineId]) continue;
        const a = lid, b = t.lineId;
        addPenalty(t.station, a, b, t);
        // 别名换乘在另一条线路上使用不同车站 ID；从两个方向都保留相同的步行规则。
        if (t.toStation) addPenalty(t.toStation, a, b, t);
      }
    }
    return m;
  }

  // 异名换乘声明：当同一物理换乘点在不同线路上使用不同 ID 时，
  // transferStations[].toStation 指向目标线路的车站 ID
  // （JR 原宿 Harajuku ↔ 千代田线 明治神宫前 Meiji-Jingumae）。
  // 返回 Map<"fromStation\u0001fromLine", Map<toLineId, toStation>>。
  function buildAliasTransfers(lines) {
    const m = new Map();
    for (const lid of Object.keys(lines)) {
      const l = lines[lid];
      if (!l || !Array.isArray(l.transferStations)) continue;
      for (const t of l.transferStations) {
        if (!t || !t.station || !t.lineId || !t.toStation) continue;
        const tl = lines[t.lineId];
        if (!tl || !Array.isArray(tl.stations) || tl.stations.indexOf(t.toStation) < 0) continue;
        const key = t.station + '\u0001' + lid;
        if (!m.has(key)) m.set(key, new Map());
        m.get(key).set(t.lineId, t.toStation);
        // 当路径从目标线路出发、再在别名车站换回来源线路时，需要反向查找。
        const reverseKey = t.toStation + '\u0001' + t.lineId;
        if (!m.has(reverseKey)) m.set(reverseKey, new Map());
        m.get(reverseKey).set(lid, t.station);
      }
    }
    return m;
  }

  // 从 canonical note 文本（如“徒歩約5分”）中提取步行分钟数。
  function walkMin(note) {
    if (!note) return 0;
    const mt = String(note).match(/徒歩約(\d+)分/);
    return mt ? parseInt(mt[1], 10) : 0;
  }

  // 零换乘直通边只存在于有证据支持的运行边界交接站。
  // 同一走廊其他位置的共站仍是普通换乘，避免 Dijkstra 拼接出免费的曲折路径。
  function isThroughAtStation(a, b, st) {
    try {
      return !!(window.RunningChainResolver &&
        typeof window.RunningChainResolver.isThroughAtStation === "function" &&
        window.RunningChainResolver.isThroughAtStation(a, b, st));
    } catch(e) { return false; }
  }

  /**
   * 在（车站、线路）状态上运行 Dijkstra，寻找“乘车时间 + 换乘惩罚”最小的路径。
   * 返回结构保持不变：{ path, durationMin, segments, lineInfo, routeSegments }
   */
  function findRoute(fromStation, toStation, mode) {
    const pen = MODE_PENALTY[mode] || MODE_PENALTY.combo;
    if (!fromStation || !toStation) return null;
    if (fromStation.toLowerCase() === toStation.toLowerCase()) {
      return { path: [fromStation], durationMin: 0, segments: 0, lineInfo: [] };
    }

    const layer = buildLayerGraph();
    const stationLines = layer.stationLines;
    let fromKey = null, toKey = null;
    for (const st of stationLines.keys()) {
      if (st.toLowerCase() === fromStation.toLowerCase()) fromKey = st;
      if (st.toLowerCase() === toStation.toLowerCase()) toKey = st;
      if (fromKey && toKey) break;
    }
    if (!fromKey || !toKey) return null;

    const startLines = Array.from(stationLines.get(fromKey) || []);
    if (startLines.length === 0) return null;

    const heap = new _MinHeap();
    const dist = new Map(); // key -> [cost, transfers]
    const prev = new Map(); // key -> { key, station, line }
    const rideDur = new Map(); // accumulated ride-only minutes (excludes penalty)
    for (const lid of startLines) {
      const k = fromKey + '\u0001' + lid;
      dist.set(k, [0, 0]);
      rideDur.set(k, 0);
      heap.push([0, 0, k]);
    }

    let endKey = null;
    while (heap.size() > 0) {
      const top = heap.pop();
      const cost = top[0], transfers = top[1], key = top[2];
      const dcur = dist.get(key);
      if (!dcur || dcur[0] < cost || (dcur[0] === cost && dcur[1] < transfers)) continue;
      const sep = key.indexOf('\u0001');
      const st = key.slice(0, sep), lid = key.slice(sep + 1);
      if (st === toKey) { endKey = key; break; }

      const meta = layer.lineMeta[lid];
      if (!meta) continue;
      const pos = meta.positions.get(st);

      // 沿同一线路前往相邻车站。
      const adj = [];
      if (pos > 0) adj.push(pos - 1);
      if (pos < meta.stations.length - 1) adj.push(pos + 1);
      for (const ai of adj) {
        const nst = meta.stations[ai];
        const nk = nst + '\u0001' + lid;
        let d = segmentDuration(meta, Math.min(pos, ai));
        const nc = cost + d;
        const rc = dist.get(nk);
        if (!rc || nc < rc[0] || (nc === rc[0] && transfers < rc[1])) {
          dist.set(nk, [nc, transfers]);
          rideDur.set(nk, (rideDur.get(key) || 0) + d);
          prev.set(nk, { key: key, station: st, line: lid });
          heap.push([nc, transfers, nk]);
        }
      }

      // 在同一车站换乘其他线路。
      const otherLines = stationLines.get(st) || new Set();
      // 异名换乘：transferStations[].toStation 将本站连接到目标线路上 ID 不同的车站，
      // 例如 JR 原宿 Harajuku ↔ 千代田线 明治神宫前〈原宿〉 Meiji-Jingumae。
      const aliasMap = (layer.aliasTransfers && layer.aliasTransfers.get(st + '\u0001' + lid)) || null;
      const txTargets = new Set(otherLines);
      if (aliasMap) { for (const ol of aliasMap.keys()) { if (ol !== lid) txTargets.add(ol); } }
      for (const ol of txTargets) {
        if (ol === lid) continue;
        const txSt = (aliasMap && aliasMap.has(ol)) ? aliasMap.get(ol) : st;
        // 名称相同本身从不构成跨地区换乘依据。
        if (!_plausibleTransfer(layer,st,lid,txSt,ol)) continue;
        const nk = txSt + '\u0001' + ol;
        // through 惩罚仅限声明接续站（大船/大宮/東京 等）；非接续共站按普通换乘
        const isAlias = txSt !== st;
        const through = !isAlias && isThroughAtStation(lid, ol, st);
        let txCost = through ? pen.through : pen.transfer;
        // 站外换乘：加入 transferStations 声明的实际步行分钟数
        // （用户规则：“不是线路经过就可以换乘”）。
        if (!through && layer.transferPenalty) {
          const pk = st + '\u0001' + (lid < ol ? lid : ol) + '\u0001' + (lid < ol ? ol : lid);
          const p = layer.transferPenalty.get(pk);
          if (p && p.out) txCost += (p.walk || 0);
        }
        const nc = cost + txCost;
        const nt = transfers + 1;
        const tc = dist.get(nk);
        if (!tc || nc < tc[0] || (nc === tc[0] && nt < tc[1])) {
          dist.set(nk, [nc, nt]);
          rideDur.set(nk, rideDur.get(key) || 0);
          prev.set(nk, { key: key, station: st, line: lid });
          heap.push([nc, nt, nk]);
        }
      }
    }
    if (!endKey) return null;

    // 重建状态链（起点 → 终点）。
    const states = [];
    let cur = endKey;
    while (cur) {
      states.push(cur);
      cur = prev.get(cur) ? prev.get(cur).key : null;
    }
    states.reverse();

    // 构建路径（去重车站）和 lineInfo（每个相邻站对及其所选线路 ID）。
    const path = [];
    const lineInfo = [];
    let lastSt = null, lastLine = null, segFrom = null;
    for (const k of states) {
      const sep = k.indexOf('\u0001');
      const st = k.slice(0, sep), lid = k.slice(sep + 1);
      if (lastSt === null) {
        lastSt = st; lastLine = lid; segFrom = st; path.push(st);
        continue;
      }
      if (lid === lastLine && st !== lastSt) {
        // 沿同一线路前进。
        path.push(st);
        lastSt = st;
      } else if (lid !== lastLine) {
        // 在本站换乘（车站不变），结束上一段乘车区间。
        if (segFrom !== null && lastSt !== null && segFrom !== lastSt) {
          // lines 存 lineId（真实 ID）而非 line.name——name 字段不一致
          // （UtsunomiyaJR.name="Utsunomiya Line" 等英文名），消费方（search-ui._lineBadge /
          // history）都按 ID 解析，name 会导致 resolveLineName 查不到而原样显示英文。
          lineInfo.push({ from: segFrom, to: lastSt, lines: [lastLine] });
        } else if (lastSt !== null) {
          // 别名换乘可能发生在第一次乘车之前，或紧邻终点之前
          // （原宿 ↔ 明治神宫前）。保留零长度标记，
          // 使 buildRouteSegments 仍能渲染换乘徽章和两条线路身份。
          lineInfo.push({ from: lastSt, to: lastSt, lines: [lastLine] });
        }
        lastLine = lid;
        segFrom = st;
        // 异名换乘会改变换乘前后的车站 ID（原宿 → 明治神宫前），
        // 因此新 ID 必须出现在路径中。
        if (st !== lastSt) path.push(st);
        lastSt = st;
      } else {
        lastSt = st;
      }
    }
    if (segFrom !== null && lastSt !== null && segFrom !== lastSt) {
      lineInfo.push({ from: segFrom, to: lastSt, lines: [lastLine] });
    } else if (lineInfo.length > 0 && segFrom !== null && lastSt !== null && lineInfo[lineInfo.length - 1].lines[0] !== lastLine) {
      lineInfo.push({ from: lastSt, to: lastSt, lines: [lastLine] });
    }

    return {
      path: path,
      durationMin: rideDur.get(endKey) || 0,
      segments: path.length - 1,
      lineInfo: lineInfo,
      mode: mode || "combo",
      routeSegments: buildRouteSegments({ lineInfo: lineInfo })
    };
  }

  /**
   * 获取连接两个相邻车站的线路。
   */
  const _lineCache = new Map();
  /**
   * 将 BFS 路径结果转换为 RouteSegment[] 数组。
   */
  // 列车类型映射从数据层 line_types 读取（不再硬编码）
  const TRAIN_TYPE_BY_LINE = (window.RailwayDB && window.RailwayDB.getData && window.RailwayDB.getData().line_types) || {};

  function buildRouteSegments(route) {
    if (!route || !route.lineInfo || route.lineInfo.length === 0) return [];
    const segments = [];
    const lineOrder = window.LINE_STATION_ORDER || {};
    for (let i = 0; i < route.lineInfo.length; i++) {
      const seg = route.lineInfo[i];
      // lineInfo.lines[0] 为 lineId（真实 ID）；lineName 仅作兼容字段
      const lineId = seg.lines[0] || null;
      const lineName = lineId ? ((window.RailwayDB && window.RailwayDB.getLine && window.RailwayDB.getLine(lineId)) || {}).name || lineId : null;
      let direction = 0;
      if (lineId && lineOrder[lineId]) {
        const o = lineOrder[lineId];
        const fromIdx = o[seg.from], toIdx = o[seg.to];
        direction = toIdx > fromIdx ? 1 : (toIdx < fromIdx ? -1 : 0);
      }
      let duration = null;
      if (lineId && window.RailwayDB && lineOrder[lineId]) {
        const o = lineOrder[lineId];
        const line = window.RailwayDB.getLine ? window.RailwayDB.getLine(lineId) : null;
        if (o[seg.from] != null && o[seg.to] != null) {
          const fi = o[seg.from], ti = o[seg.to];
          duration = durationBetween({
            stations: line && line.stations || Object.keys(o),
            durations: line && line.durations || window.RailwayDB.getLineDurations(lineId) || [],
            durationTotalMin: line && line.durationTotalMin
          }, fi, ti);
        }
      }
      const lo = (lineId && lineOrder[lineId]) ? lineOrder[lineId] : null;
      const hopCount = (lo && lo[seg.from] != null && lo[seg.to] != null) ? Math.abs(lo[seg.to] - lo[seg.from]) : 1;
      const fare = (lineId && window.FareEstimator) ? window.FareEstimator.estimateSegment(lineId, hopCount) : null;
      if (seg.from !== seg.to) {
        segments.push({ type: 'ride', lineId, lineName, fromStation: seg.from, toStation: seg.to, duration, direction, trainType: TRAIN_TYPE_BY_LINE[lineId] || null, fare, walking: null });
      }
      if (i < route.lineInfo.length - 1) {
        const nextLid = route.lineInfo[i+1].lines[0] || null;
        if (nextLid && nextLid !== lineId) {
          // 直通徽章同样按接续站判定（避免在非接续共站显示"乗換不要"）
          const targetFrom = route.lineInfo[i + 1] && route.lineInfo[i + 1].from;
          const through = !!(lineId && nextLid && targetFrom === seg.to && isThroughAtStation(lineId, nextLid, seg.to));
          const source = window.RailwayDB && window.RailwayDB.getLine ? window.RailwayDB.getLine(lineId) : null;
          const target = window.RailwayDB && window.RailwayDB.getLine ? window.RailwayDB.getLine(nextLid) : null;
          const declaration = ((source && source.transferStations) || []).find(t => t.station === seg.to && t.lineId === nextLid) ||
            ((target && target.transferStations) || []).find(t => t.station === targetFrom && t.lineId === lineId);
          const walkingDuration = declaration ? walkMin(declaration.note) : null;
          segments.push({ type: 'transfer', station: seg.to, toStation: targetFrom || seg.to, fromLine: lineId, toLines: [nextLid], walking: declaration ? declaration.type === 'out' : false, walkingDuration: walkingDuration, through: through });
        }
      }
    }
    return segments;
  }


  function getLinesForSegment(station1, station2) {
    const key = station1 + '||' + station2;
    if (_lineCache.has(key)) return _lineCache.get(key);
    const lines = [];
    for (const [lineId, line] of Object.entries(window.RailwayDB ? window.RailwayDB.getAllLines() : (window.DataLayer ? window.DataLayer.getAllLines() : window.UNIFIED_LINES || {}))) {
      if (line && line.stations) {
        const idx1 = line.stations.indexOf(station1);
        const idx2 = line.stations.indexOf(station2);
        if ((idx1 >= 0 && idx2 >= 0 && Math.abs(idx1 - idx2) === 1)) {
          lines.push(line.name);
        }
      }
    }
    _lineCache.set(key, lines);
    return lines;
  }

  /**
   * 查找包含搜索词的所有车站（用于自动补全）。
   * @param {string} term - 搜索词（部分站名）
   * @returns {Array<string>} 匹配的站名
   */
  function findStationsByTerm(term) {
    if (!term || term.trim() === '') return [];
    // 如果可用则使用 StationResolver（支持日文/英文/混合输入）。
    if (window.StationResolver) {
      var results = window.StationResolver.resolve(term);
      var lang = window.currentLang || 'en';
      // 过滤 NOT_FOUND/null stationId 结果，防止无 ID 建议项进入渲染层。
      return results
        .filter(function(r) { return r && r.stationId && r.status !== 'NOT_FOUND'; })
        .slice(0, 10).map(function(r) {
        var did = r.stationId;
        var dn = r.displayName || did;
        if (window.RailwayDB && window.RailwayDB.resolveStationName) {
          var ln = window.RailwayDB.resolveStationName(did, lang);
          if (ln && ln !== did) dn = ln;
        }
        return { stationId: did, displayName: dn };
      });
    }
  // 回退：在线路车站 ID 中进行子串匹配。
    const query = term.toLowerCase().trim();
    const matches = new Set();
    for (const [lineId, line] of Object.entries(window.RailwayDB ? window.RailwayDB.getAllLines() : (window.DataLayer ? window.DataLayer.getAllLines() : window.UNIFIED_LINES || {}))) {
      if (line && line.stations) {
        for (const station of line.stations) {
          if (station.toLowerCase().includes(query)) {
            matches.add(station);
          }
        }
      }
    }
    var lang = window.currentLang || 'en';
    return Array.from(matches).slice(0, 10).map(function(sid) {
      var dn = sid;
      if (window.RailwayDB && window.RailwayDB.resolveStationName) {
        var ln = window.RailwayDB.resolveStationName(sid, lang);
        if (ln && ln !== sid) dn = ln;
      }
      return { stationId: sid, displayName: dn };
    });
  }

  
  // Search returns one topology candidate. If that route has no timetable
  // match, try a bounded set of legitimate alternatives, never invented trains.
  // This is intentionally a supplement to findRoute, not a second graph owner.
  function findRouteCandidates(from, to, mode, limit) {
    var cap = Math.max(1, Math.min(8, Number(limit) || 6));
    var first = findRoute(from, to, mode);
    if (!first || !first.routeSegments) return [];
    var candidates = [], seen = new Set();
    function push(route) {
      if (!route || !route.routeSegments || !route.routeSegments.some(function(s){return s.type==='ride';})) return;
      var signature=route.routeSegments.map(function(s) {
        return s.type==='ride' ? s.lineId+':'+s.fromStation+':'+s.toStation :
          'transfer:'+s.station+':'+s.toStation;
      }).join('|');
      if (seen.has(signature)) return;
      seen.add(signature);
      candidates.push(route);
    }
    push(first);
    ['transfers','duration','combo'].forEach(function(variant) {
      if (variant !== mode) push(findRoute(from,to,variant));
    });
    var realFrom=first.path[0], realTo=first.path[first.path.length-1];
    var direct=[];
    var layer=buildLayerGraph();
    Object.keys(layer.lineMeta).forEach(function(lid) {
      var meta=layer.lineMeta[lid];
      var a=meta.positions.get(realFrom), b=meta.positions.get(realTo);
      if (a == null || b == null || a === b) return;
      var duration=durationBetween(meta,a,b);
      if (!(duration > 0)) return;
      var info=[{from:realFrom,to:realTo,lines:[lid]}];
      direct.push({path:[realFrom,realTo],durationMin:duration,segments:Math.abs(b-a),
        lineInfo:info,mode:mode||'combo',routeSegments:buildRouteSegments({lineInfo:info})});
    });
    direct.sort(function(a,b){return a.durationMin-b.durationMin;});
    direct.forEach(push);
    return candidates.slice(0,cap);
  }

  // 公共 API.
  window.RouteSearch = {
    findRoute: findRoute,
    findRouteCandidates: findRouteCandidates,
    findStationsByTerm: findStationsByTerm,
    buildStationGraph: buildStationGraph,
    getLinesForSegment: getLinesForSegment,
    invalidateGraphCache: function() { _graphCache = null; _layerCache = null; _lineCache.clear(); },
    buildRouteSegments: buildRouteSegments
  };

})();
