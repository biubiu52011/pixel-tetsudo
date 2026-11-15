/* TrainTrackLayout 是渲染器的坐标解析边界。 */
/*
 * TrainTrackLayout
 * 将列车位置转换为带方向通道的显示坐标。
 */
(function () {
  "use strict";

  var DEFAULTS = {
    laneGap: 11,
    stackGap: 8,
    iconW: 14,
    iconH: 18
  };

  function clamp(n, min, max) {
    n = Number(n);
    if (!isFinite(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  function loopPosToXY(pos, rect) {
    var cx = rect.cx, cy = rect.cy, halfW = rect.halfW, halfH = rect.halfH;
    var rectW = rect.rectW, rectH = rect.rectH, perimeter = rect.perimeter;
    var p = ((pos % perimeter) + perimeter) % perimeter;
    if (p < rectW) return { x: cx - halfW + p, y: cy - halfH };
    if (p < rectW + rectH) return { x: cx + halfW, y: cy - halfH + (p - rectW) };
    if (p < 2 * rectW + rectH) return { x: cx + halfW - (p - rectW - rectH), y: cy + halfH };
    return { x: cx - halfW, y: cy + halfH - (p - 2 * rectW - rectH) };
  }

  function tangentAt(points, idx, nextIdx) {
    var a = points[idx] || points[0] || { x: 0, y: 0 };
    var b = points[nextIdx] || points[idx + 1] || points[idx - 1] || a;
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  function normalFromTangent(t) {
    return { x: -t.y, y: t.x };
  }

  function laneSign(moveDir, railDirection) {
    var rd = String(railDirection || "");
    if (/Inner/.test(rd)) return -1;
    if (/Outer/.test(rd)) return 1;
    if (moveDir === "up") return -1;
    if (moveDir === "down") return 1;
    return 0;
  }

  function interpolate(a, b, progress) {
    progress = clamp(progress, 0, 1);
    return {
      x: a.x + (b.x - a.x) * progress,
      y: a.y + (b.y - a.y) * progress
    };
  }

  function trackKey(position, idx, nextIdx, lane) {
    return [
      position && position.fusionLineId ? position.fusionLineId : "main",
      Math.min(idx, nextIdx),
      Math.max(idx, nextIdx),
      lane
    ].join("|");
  }

  function stableTrainKey(p) {
    if (!p) return "";
    // 与 TrainMarker DOM 键使用相同的稳定身份契约：优先使用已确认的
    // 运行链，其次使用稳定的来源对象身份。孤立列车
    // 号绝不能作为布局堆叠槽位的键。
    return String(p.runningChainId || p.trainId || p.sourceTrainId || p.timetableObjectId || "");
  }

  function stableStackOrdinal(p, index) {
    var key = stableTrainKey(p);
    var hash = 2166136261;
    for (var i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    // 轨道中心周围的五个确定性槽位。槽位由身份而不是当前
    // 占用情况决定，避免轮询变化重新排列其他列车。
    return ((hash >>> 0) % 5) - 2;
  }

  function buildOccupancy(positions, resolver) {
    var groups = {};
    for (var i = 0; i < positions.length; i++) {
      var r = resolver(positions[i], i, true);
      if (!r) continue;
      var stableId = stableTrainKey(positions[i]);
      if (!stableId) continue;
      (groups[r.key] = groups[r.key] || []).push({ index: i, id: stableId });
    }
    var slots = {};
    Object.keys(groups).forEach(function(key) {
      groups[key].sort(function(a, b) { return a.id.localeCompare(b.id); });
      for (var j = 0; j < groups[key].length; j++) {
        slots[key + "|" + groups[key][j].index] = { ordinal: j, total: groups[key].length };
      }
    });
    return {
      get: function (key, index) {
        return slots[key + "|" + index] || { ordinal: 0, total: 1 };
      }
    };
  }

  // Existing canonical Skytree source indices: 0 Asakusa, 1 Tokyo-Skytree,
  // 2 Oshiage, 3 Hikifune, 4+ northern trunk. A route cannot travel from
  // one southern branch to the other without reversing at Hikifune.
  function _skytreeForkBranchEvidence(p) {
    var names = Array.isArray(p&&p.scheduledStopKeys)
      ? p.scheduledStopKeys.slice() : [];
    if(p&&p.destinationStation)names.push(p.destinationStation);
    if(p&&p.sourceToStation)names.push(p.sourceToStation);
    var asakusa=false,oshiage=false;
    names.forEach(function(raw){
      var s=String(raw||"").split(/[.:]/).pop().replace(/[-_]/g,"").toLowerCase();
      if(s==="asakusa"||s==="tokyosky tree".replace(/ /g,"")||s==="tokyoskytree")asakusa=true;
      if(s==="oshiage")oshiage=true;
    });
    return asakusa===oshiage?null:(asakusa?1:2);
  }
  function _skytreeForkNext(p,idx,screenDir) {
    // Screen points north while source index grows. Do not use idx +/- 1
    // across the fake Tokyo-Skytree -> Oshiage edge.
    var sourceStep=screenDir==="up"?1:screenDir==="down"?-1:0;
    if(!sourceStep)return idx;
    if(idx===0)return sourceStep>0?1:0;
    if(idx===1)return sourceStep>0?3:0;
    if(idx===2)return sourceStep>0?3:2;
    if(idx===3&&sourceStep<0)return _skytreeForkBranchEvidence(p)||3;
    return idx+sourceStep;
  }
  function _skytreeForkTravel(points,graph,from,to,progress) {
    if(!graph||graph.kind!=="tobu-skytree-hikifune-y"||!points[from]||!points[to])return null;
    // Switching Asakusa ↔ Oshiage within a through train is not a real
    // direct path. Preserve the station but reject an invalid segment.
    var left=function(i){return i===0||i===1;};
    if((left(from)&&to===2)||(from===2&&left(to)))return null;
    var adj=Object.create(null);
    (graph.edges||[]).forEach(function(e){
      if(!e||!points[e[0]]||!points[e[1]])return;
      (adj[e[0]]||(adj[e[0]]=[])).push(e[1]);
      (adj[e[1]]||(adj[e[1]]=[])).push(e[0]);
    });
    if(from===to){
      var next=from===0?1:from===1?3:from===2?3:
        from===3?4:from===points.length-1?from-1:from+1;
      return {point:{x:points[from].x,y:points[from].y},
        tangent:tangentAt(points,from,next)};
    }
    // Unique path over the fixed railway tree. An express segment may
    // skip stations but its displayed train must follow painted tracks.
    var q=[from], parent=Object.create(null);parent[from]=from;
    for(var h=0;h<q.length&&q.length<=points.length;h++){
      var u=q[h];
      (adj[u]||[]).forEach(function(v){
        if(parent[v]!=null)return;
        parent[v]=u;q.push(v);
      });
    }
    if(parent[to]==null)return null;
    var path=[to],cursor=to;
    while(cursor!==from&&path.length<=points.length){
      cursor=parent[cursor];path.unshift(cursor);
    }
    if(path[0]!==from)return null;
    var nodes=[points[path[0]]];
    for(var k=0;k<path.length-1;k++){
      var u=path[k],v=path[k+1];
      var edgeKey=Math.min(u,v)+"-"+Math.max(u,v);
      var elbow=graph.elbows&&graph.elbows[edgeKey];
      if(elbow)nodes.push(elbow);
      nodes.push(points[v]);
    }
    var lengths=[],total=0;
    for(var n=0;n<nodes.length-1;n++){
      var a=nodes[n],b=nodes[n+1],len=Math.hypot(b.x-a.x,b.y-a.y);
      lengths.push(len);total+=len;
    }
    var remaining=clamp(progress,0,1)*total;
    for(var j=0;j<lengths.length;j++){
      if(j===lengths.length-1||remaining<=lengths[j]){
        var pt=interpolate(nodes[j],nodes[j+1],
          lengths[j]?remaining/lengths[j]:0);
        return {point:pt,tangent:tangentAt(nodes,j,j+1)};
      }
      remaining-=lengths[j];
    }
    return null;
  }

  function resolveBase(position, stationCoords, geometry, lineId, opts) {
    opts = opts || {};
    var branchGeom = (geometry && geometry.branchGeom) || null;
    var rawIdx = position && position.stationIndex != null ? Number(position.stationIndex) : NaN;
    var points = stationCoords || [];
    // 必须存在位置证据。缺失/无效的 stationIndex 绝不能
    // 强制为车站 0（山手线的东京站），否则一份错误快照
    // 会把无关列车全部折叠到第一站。
    if (!isFinite(rawIdx) || rawIdx < 0) return null;
    var idx = rawIdx;

    if (position && position.fusionLineId && position.fusionRole === "branch" && branchGeom && branchGeom[position.fusionLineId]) {
      points = branchGeom[position.fusionLineId];
      if (idx >= points.length) return null;
    } else if (position && position.fusionLineId && opts.fusionBaseIdx) {
      var base = opts.fusionBaseIdx(lineId, position.fusionLineId);
      idx = base >= 0 ? base + idx : idx;
      if (idx < 0 || idx >= points.length) return null;
    } else if (idx >= points.length) {
      return null;
    }

    var toIdx = position && position.segmentToIndex != null ? Number(position.segmentToIndex) : null;
    if (toIdx != null && (!isFinite(toIdx) || toIdx < 0)) return null;
    if (toIdx != null && position && position.fusionLineId && position.fusionRole === "branch" && branchGeom && branchGeom[position.fusionLineId]) {
      if (toIdx >= points.length) return null;
    } else if (toIdx != null && position && position.fusionLineId && opts.fusionBaseIdx) {
      var base2 = opts.fusionBaseIdx(lineId, position.fusionLineId);
      toIdx = base2 >= 0 ? base2 + toIdx : toIdx;
      if (toIdx < 0 || toIdx >= points.length) return null;
    } else if (toIdx != null && toIdx >= points.length) {
      return null;
    }
    if (toIdx == null) {
      var moveDir = opts.getDisplayMoveDir ? opts.getDisplayMoveDir(position, lineId) : null;
      if(geometry&&geometry.mapFork&&geometry.mapFork.kind==="tobu-skytree-hikifune-y"&&
         points===stationCoords&&lineId==="TobuSkytree"){
        toIdx=_skytreeForkNext(position,idx,moveDir);
      }
      // 终点换乘支线上的显示方向会反转，而来源
      // 车站索引仍保留公开顺序。应分别推断来源步进
      // （当数据没有提供显式区段终点时）。
      if (points !== stationCoords && position && position.fusionRole === 'branch') {
        var branchDirection = String(position.railDirection || '').split(/[:.]/).pop();
        if (branchDirection === 'Inbound') moveDir = 'up';
        else if (branchDirection === 'Outbound') moveDir = 'down';
      }
      var _loopDirection = String(position && position.railDirection || "").split(/[:.]/).pop();
      var _closedLoop = !!(stationCoords && stationCoords._loopRect && points === stationCoords);
      var _sixRingStart = geometry && geometry.isSixShapedLoop && points === stationCoords
        ? Number(geometry.sixLoopStartIndex) : NaN;
      var _sixTailEnd = isFinite(_sixRingStart) ? _sixRingStart - 1 : NaN;
      var _sixDest = String(position && position.destinationStation || "").split(/[:.]/).pop();
      if (isFinite(_sixTailEnd) && _sixTailEnd > 0 &&
          idx === 0 && _sixDest === "Hikarigaoka") {
        // 都厅前 → 光が丘使用同一线路的开口尾部，而不是环线。
        toIdx = 1;
      } else if (isFinite(_sixTailEnd) && idx > 0 && idx <= _sixTailEnd) {
        // 向光が丘方向 stationIndex 增大，而显示 Y 减小。
        var _tailStep = _sixDest === "Hikarigaoka" ? 1
          : (_sixDest ? -1 : (moveDir === "up" ? 1 : -1));
        toIdx = Math.max(0, Math.min(_sixTailEnd, idx + _tailStep));
      } else if (isFinite(_sixRingStart) && _sixRingStart > 0 &&
          /^(InnerLoop|Inner|OuterLoop|Outer)$/.test(_loopDirection) &&
          (idx === 0 || idx >= _sixRingStart)) {
        var _sixStep = /^(InnerLoop|Inner)$/.test(_loopDirection) ? -1 : 1;
        toIdx = idx === 0 ? (_sixStep > 0 ? _sixRingStart : points.length - 1)
          : (_sixStep > 0 && idx === points.length - 1 ? 0
            : (_sixStep < 0 && idx === _sixRingStart ? 0 : idx + _sixStep));
      } else if (_closedLoop && /^(InnerLoop|Inner|OuterLoop|Outer)$/.test(_loopDirection)) {
        // A loop has no terminal index. Preserve ODPT loop direction through
        // 最后一站/第一站边界，而不是在任一端点截断。
        // 车站顺序定义正向路线方向；laneSign 保持
        // Inner/Outer on separate physical lanes.
        var _step = /^(InnerLoop|Inner)$/.test(_loopDirection) ? -1 : 1;
        toIdx = (idx + _step + points.length) % points.length;
      } else if(toIdx==null) {
        toIdx = moveDir === "up" ? Math.max(0, idx - 1) : Math.min(points.length - 1, idx + 1);
      }
    }

    var progress = position && position.segmentProgress != null ? clamp(position.segmentProgress, 0, 1) : 0;
    var a = points[idx] || { x: 0, y: 0 };
    var b = points[toIdx] || a;
    var fork = geometry && geometry.mapFork && points===stationCoords &&
      lineId==="TobuSkytree" ?
      _skytreeForkTravel(points,geometry.mapFork,idx,toIdx,progress):undefined;
    if(fork===null)return null; // Explicitly impossible or disconnected path.
    var basePt = fork ? fork.point : (progress > 0 && toIdx !== idx ?
      interpolate(a, b, progress) : { x: a.x, y: a.y });
    var canonicalIdx = Math.min(Math.max(0, idx), Math.max(0, points.length - 2));
    var t = fork ? fork.tangent : (toIdx === idx ? tangentAt(points, canonicalIdx, canonicalIdx + 1)
      : tangentAt(points, idx, toIdx));
    return { point: basePt, idx: idx, nextIdx: toIdx, tangent: t, points: points };
  }

  function resolvedMoveDir(position, base, lineId, opts, geometry) {
    if(geometry&&geometry.mapFork&&geometry.mapFork.kind==="tobu-skytree-hikifune-y"&&
       base&&base.idx!==base.nextIdx)
      return base.points[base.nextIdx].y>base.points[base.idx].y?"down":"up";
    if (geometry && geometry.isSixShapedLoop && base &&
        base.idx >= 0 && base.idx <= geometry.sixTailEndIndex &&
        base.nextIdx >= 0 && base.nextIdx <= geometry.sixTailEndIndex &&
        base.nextIdx !== base.idx) {
      return base.points[base.nextIdx].y < base.points[base.idx].y ? "up" : "down";
    }
    var rd = String(position && position.railDirection || "").split(/[:.]/).pop();
    if (/^(InnerLoop|Inner)$/.test(rd)) return "up";
    if (/^(OuterLoop|Outer)$/.test(rd)) return "down";
    if (base && base.nextIdx < base.idx) return "up";
    if (base && base.nextIdx > base.idx) return "down";
    return opts && opts.getDisplayMoveDir ? opts.getDisplayMoveDir(position, lineId) : null;
  }

  // 线路元数据声明实际单线区段；渲染器只负责把该声明映射为共享通道。
  // 这样同一规则不会在占用计算和最终定位两处分别维护线路 ID 特判。
  function _isSingleTrackSegment(base, geometry) {
    var layout = geometry && geometry.trackLayout;
    if (!layout || !base) return false;
    var low = Math.min(Number(base.idx), Number(base.nextIdx));
    if (!isFinite(low)) return false;
    if (layout.singleTrackFromIndex != null && low >= Number(layout.singleTrackFromIndex)) return true;
    var turnbacks = Array.isArray(layout.singleTrackTurnbackIndices) ? layout.singleTrackTurnbackIndices : [];
    return base.idx === base.nextIdx && turnbacks.indexOf(Number(base.idx)) >= 0;
  }

  function resolve(position, positions, index, stationCoords, geometry, lineId, opts, occupancy) {
    opts = opts || {};
    var base = resolveBase(position, stationCoords, geometry, lineId, opts);
    if (!base) return null;
    var moveDir = resolvedMoveDir(position, base, lineId, opts, geometry);
    // 几何方向来自权威环行方向/已解析
    // 区段（若可用）。目的地启发式仅作为展示兜底。
    var lane = laneSign(moveDir, position && position.railDirection);
    // 新穿梭线的实际拓扑是：大宫-丸山为双线，
    // 丸山-内宿为单线。不要在单线区段绘制人为的上下行通道，
    // 列车应共享同一实际中心线。
    // 大宫本身是环形折返点，因此方向在那里变化并不表示
    // second parallel track either.
    if (_isSingleTrackSegment(base, geometry)) {
      lane = 0;
    }
    // 方向通道标记相对于车站顺序，而不是相对于实际运行方向。
    // 进站区段已经反转切线；再次反转通道
    // 会把两个方向放到双线区段的同一侧。
    var laneTangent = base.tangent;
    if (!(geometry && (geometry.isLoop || geometry.isSixShapedLoop)) && base.nextIdx < base.idx) {
      laneTangent = { x: -base.tangent.x, y: -base.tangent.y };
    }
    var normal = normalFromTangent(laneTangent);
    var key = trackKey(position, base.idx, base.nextIdx, lane);
    var slot = occupancy ? occupancy.get(key, index) : { ordinal: 0, total: 1 };
    // 保留实际方向通道。密集的普通线路列车与其标签
    // 由 resolveLabels 统一排列；只有六形环线几何
    // retains its dedicated lateral placement.
    var stackOrdinal = geometry && geometry.isSixShapedLoop && slot.total > 1
      ? stableStackOrdinal(position, index) : 0;
    var stackOffset = stackOrdinal * (opts.stackGap || DEFAULTS.stackGap);
    // Zero is an explicit centreline request, not an absent option.
    var laneGap = opts.laneGap == null ? DEFAULTS.laneGap : opts.laneGap;
    var lateral = lane * laneGap + stackOffset;
    var px = base.point.x + normal.x * lateral;
    var py = base.point.y + normal.y * lateral;

    // 保持车站处的列车图标清晰，尤其是大型换乘站/
    // 支线交汇节点。列车恰好位于车站（progress=0）时，
    // 沿轨道切线略微移动，而不是直接堆叠
    // 在车站圆点上。这样既保留车站参考点，
    // 又让列车成为主要的移动视觉元素。
    var stationPt = base.points && base.points[base.idx];
    var atStation = position && (position.segmentProgress == null || Number(position.segmentProgress) <= 0.001);
    if (atStation && stationPt) {
      var stationOffset = opts.stationOffset || DEFAULTS.iconH;
      var stationRadius = (stationPt && stationPt.isJunction) ? 12 : 7;
      var clearDist = Math.max(stationOffset, stationRadius + (DEFAULTS.iconH / 2) + 2);
      // 移动区段切线已经从 idx 指向 nextIdx。
      // 再次应用进站符号会让停站列车向后偏移。
      var dirSign = base.nextIdx !== base.idx
        ? 1 : (moveDir === "up" ? -1 : 1);
      if (lane === 0 && !moveDir) dirSign = (slot.ordinal % 2 === 0) ? 1 : -1;
      // 停在终点的列车保持在车站的轨道一侧，
      // 绝不放到线路端点之外的空白画布中。
      if (!(geometry && geometry.isSixShapedLoop) && base.points.length > 1 && base.idx === base.nextIdx) {
        if (base.idx === base.points.length - 1) dirSign = -1;
        else if (base.idx === 0) dirSign = 1;
      }
      px += base.tangent.x * clearDist * dirSign;
      py += base.tangent.y * clearDist * dirSign;
    }

    var routePos = null;
    if (stationCoords && stationCoords._loopRect && base.points === stationCoords) {
      var _from = stationCoords[base.idx];
      var _to = stationCoords[base.nextIdx];
      if (_from && _from._loopPos != null) {
        var _fromPos = Number(_from._loopPos);
        var _toPos = (_to && _to._loopPos != null) ? Number(_to._loopPos) : _fromPos;
        var _perimeter = Number(stationCoords._loopRect.perimeter) || 0;
        var _delta = _toPos - _fromPos;
        if (_perimeter > 0 && Math.abs(_delta) > _perimeter / 2) {
          _delta += _delta > 0 ? -_perimeter : _perimeter;
        }
        routePos = _fromPos + _delta * (position && position.segmentProgress != null ? clamp(position.segmentProgress, 0, 1) : 0);
        var _routePoint = loopPosToXY(routePos, stationCoords._loopRect);
        // 保留通道/间距偏移，但在列连接处沿环线走向。
        px = _routePoint.x + (px - base.point.x);
        py = _routePoint.y + (py - base.point.y);
      }
    }
    return {
      x: px,
      y: py,
      idx: base.idx,
      nextIdx: base.nextIdx,
      routePos: routePos,
      lane: lane,
      key: key,
      moveDir: moveDir,
      tangent: base.tangent,
      normal: normal,
      trackYBounds: geometry && (geometry.isLoop || geometry.isSixShapedLoop) ? null : {
        min: Math.min.apply(null, base.points.map(function(p){return p.y;})),
        max: Math.max.apply(null, base.points.map(function(p){return p.y;}))
      }
    };
  }

  function resolveAll(positions, stationCoords, geometry, lineId, opts) {
    positions = positions || [];
    var resolver = function (p, i) { return resolveBase(p, stationCoords, geometry, lineId, opts); };
    var synthetic = function (p, i) {
      var base = resolver(p, i);
      if (!base) return null;
      var moveDir = resolvedMoveDir(p, base, lineId, opts, geometry);
      var lane = laneSign(moveDir, p && p.railDirection);
      if (_isSingleTrackSegment(base, geometry)) lane = 0;
      return { key: trackKey(p, base.idx, base.nextIdx, lane) };
    };
    var occupancy = buildOccupancy(positions, synthetic);
    var result = positions.map(function (p, i) {
      return resolve(p, positions, i, stationCoords, geometry, lineId, opts, occupancy);
    });
    // 六形环线渲染器拥有专用几何布局。普通线路保留
    // 来源锚点，并将图标与标签碰撞作为一个整体解析。
    var placed = [];
    positions.map(function (p, i) { return { id: stableTrainKey(p), index: i }; })
      .sort(function (a, b) { return a.id.localeCompare(b.id); })
      .forEach(function (entry) {
        var loc = result[entry.index];
        if (!loc || !(geometry && geometry.isSixShapedLoop)) return;
        var originX = loc.x, originY = loc.y;
        for (var attempt = 0; attempt <= positions.length * 2; attempt++) {
          var offset = attempt === 0 ? 0 : Math.ceil(attempt / 2) * 18 * (attempt % 2 ? 1 : -1);
          loc.x = originX + loc.normal.x * offset;
          loc.y = originY + loc.normal.y * offset;
          if (!placed.some(function (other) {
            return Math.abs(other.x - loc.x) < 15 && Math.abs(other.y - loc.y) < 20;
          })) break;
        }
        placed.push(loc);
      });
    return result;
  }

  // 由渲染器测量的屏幕空间标签矩形。纯布局
  // 确保车站文字、列车图标和完整目的地清晰可读。
  function resolveLabels(labels, obstacles, bounds, options) {
    options = options || {};
    var placed = (obstacles || []).slice(), visible = [], output = {};
    var maxShift = options.maxShift == null ? Infinity : Math.max(0, Number(options.maxShift));
    var maxLateralShift = options.maxLateralShift == null ? 0 : Math.max(0, Number(options.maxLateralShift));
    // 只折叠实际距离较近的列车。即使
    // 列车标记属于不同车站，标签矩形仍可能重叠。
    var maxFoldAnchorDistance = options.maxFoldAnchorDistance == null ? 44 : Math.max(0, Number(options.maxFoldAnchorDistance));
    function anchorDistanceSquared(a, b) {
      var ax = isFinite(Number(a.anchorX)) ? Number(a.anchorX) : a.x + a.width / 2;
      var ay = isFinite(Number(a.anchorY)) ? Number(a.anchorY) : a.y + a.height / 2;
      var bx = isFinite(Number(b.anchorX)) ? Number(b.anchorX) : b.x + b.width / 2;
      var by = isFinite(Number(b.anchorY)) ? Number(b.anchorY) : b.y + b.height / 2;
      return (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
    }
    function intersects(a, b) {
      return a.x < b.x + b.width + 2 && a.x + a.width + 2 > b.x &&
        a.y < b.y + b.height + 2 && a.y + a.height + 2 > b.y;
    }
    function findSlot(label, limit) {
      var candidates = [0];
      if (isFinite(label.minShift)) candidates.push(label.minShift);
      if (isFinite(label.maxShift)) candidates.push(label.maxShift);
      placed.forEach(function(other) {
        if (label.x < other.x + other.width + 2 && label.x + label.width + 2 > other.x) {
          candidates.push(other.y - label.height - 4 - label.y);
          candidates.push(other.y + other.height + 4 - label.y);
        }
      });
      if (bounds) {
        candidates.push(bounds.y - label.y);
        candidates.push(bounds.y + bounds.height - label.height - label.y);
      }
      candidates.sort(function(a,b) { return Math.abs(a)-Math.abs(b) || b-a; });
      for (var i=0;i<candidates.length;i++) {
        var dy=candidates[i];
        if (Math.abs(dy)>limit ||
            (isFinite(label.minShift) && dy<label.minShift) ||
            (isFinite(label.maxShift) && dy>label.maxShift)) continue;
        var box={x:label.x,y:label.y+dy,width:label.width,height:label.height};
        if (bounds && (box.y<bounds.y || box.y+box.height>bounds.y+bounds.height)) continue;
        if (!placed.some(function(other){return intersects(box,other);})) return {box:box,dy:dy};
      }
      return null;
    }
    // 优先垂直居中。当附近车站标签阻挡上下两个
    // 垂直选项时，将方向标签左右滑动几像素，
    // 绝不移动列车标记。该操作仍受屏幕空间单位上限限制。
    function findLateralSlot(label, maxDx, maxDy) {
      if (!(maxDx > 0)) return null;
      var candidates = [];
      placed.forEach(function(other) {
        if (label.y > other.y + other.height + maxDy + 2 ||
            label.y + label.height < other.y - maxDy - 2) return;
        candidates.push(other.x - label.x - label.width - 3);
        candidates.push(other.x + other.width + 3 - label.x);
      });
      candidates.sort(function(a,b) { return Math.abs(a)-Math.abs(b) || a-b; });
      for (var i=0;i<candidates.length;i++) {
        var dx = candidates[i];
        if (!isFinite(dx) || Math.abs(dx) > maxDx) continue;
        var box={x:label.x+dx,y:label.y,width:label.width,height:label.height};
        if (bounds && (box.x < bounds.x || box.x + box.width > bounds.x + bounds.width ||
            box.y < bounds.y || box.y + box.height > bounds.y + bounds.height)) continue;
        if (!placed.some(function(other){return intersects(box,other);})) return {box:box,dx:dx,dy:0};
      }
      return null;
    }
    // 较长目的地可能被夹在自己的列车图标和
    // 车站名称之间。应直接在同一列车标记的上下方搜索，
    // 不要让发生碰撞的标签停在默认位置，或
    // 沿引导线把它推远。渲染器提供靠近标记的
    // coordinates measured in screen pixels.
    function findMarkerSideSlot(label, maxDx) {
      if (!Array.isArray(label.markerSideYs)) return null;
      var sideYs = label.markerSideYs.filter(function(y){return isFinite(y);})
        .sort(function(a,b){return Math.abs(a-label.y)-Math.abs(b-label.y);});
      var dxValues = [0];
      if (maxDx > 0) {
        placed.forEach(function(other) {
          dxValues.push(other.x - label.x - label.width - 3);
          dxValues.push(other.x + other.width + 3 - label.x);
        });
      }
      dxValues.sort(function(a,b){return Math.abs(a)-Math.abs(b)||a-b;});
      var best = null, cost = Infinity;
      sideYs.forEach(function(y) {
        dxValues.forEach(function(dx) {
          if (!isFinite(dx) || Math.abs(dx) > maxDx) return;
          var box={x:label.x+dx,y:y,width:label.width,height:label.height};
          if (bounds && (box.x<bounds.x || box.x+box.width>bounds.x+bounds.width ||
              box.y<bounds.y || box.y+box.height>bounds.y+bounds.height)) return;
          if (placed.some(function(other){return intersects(box,other);})) return;
          var score=Math.abs(y-label.y)+Math.abs(dx);
          if (score < cost) {cost=score;best={box:box,dx:dx,dy:y-label.y};}
        });
      });
      return best;
    }
    labels.slice().sort(function(a,b){return a.id.localeCompare(b.id);}).forEach(function(label) {
      var best=findSlot(label,label.expanded?Infinity:maxShift);
      var neighbour=visible.filter(function(other) {
        return other.label.foldKey===label.foldKey &&
          anchorDistanceSquared(other.label,label)<=maxFoldAnchorDistance*maxFoldAnchorDistance &&
          label.x<other.label.x+other.label.width && label.x+label.width>other.label.x;
      }).sort(function(a,b){
        return anchorDistanceSquared(a.label,label)-anchorDistanceSquared(b.label,label) ||
          a.label.id.localeCompare(b.label.id);
      })[0];
      if (!best && neighbour && !label.expanded) {
        output[label.id]={x:0,y:0,collapsedInto:neighbour.label.id};
        return;
      }
      if (!best) best=findLateralSlot(label,maxLateralShift,label.expanded?Infinity:maxShift);
      if (!best) best=findMarkerSideSlot(label,maxLateralShift);
      // 当两个紧凑通道都被阻挡时，文字可以放在
      // 标记旁边，而不是正好居中于标记下方。渲染器根据
      // 实际标签和标记宽度计算最后兜底上限，确保两者
      // 的水平范围仍然相接；这不是无界的轨道搜索。
      var nearLimit = label.maxNearLateralShift == null ? maxLateralShift :
        Math.max(0, Number(label.maxNearLateralShift));
      if (!best && isFinite(nearLimit) && nearLimit > maxLateralShift) {
        best=findLateralSlot(label,nearLimit,label.expanded?Infinity:maxShift);
        if (!best) best=findMarkerSideSlot(label,nearLimit);
      }
      // 在有限上限内，绝不为寻找空白槽位搜索整张地图。
      // 没有局部槽位时，让孤立标签留在自己的标记处。
      if (!best && !isFinite(maxShift)) best=findSlot(label,Infinity);
      var dy=best?best.dy:Math.max(isFinite(label.minShift)?label.minShift:-Infinity,
        Math.min(isFinite(label.maxShift)?label.maxShift:Infinity,0));
      output[label.id]={x:best&&best.dx||0,y:dy};
      placed.push(best?best.box:{x:label.x,y:label.y+dy,width:label.width,height:label.height});
      visible.push({label:label});
    });
    return output;
  }

  window.TrainTrackLayout = {
    resolveAll: resolveAll,
    resolveLabels: resolveLabels,
    loopPosToXY: loopPosToXY
  };
})();
