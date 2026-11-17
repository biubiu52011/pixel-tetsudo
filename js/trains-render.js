/* trains-render.js：SVG 铁路图；列车标记仅使用图库 PNG 图片 */

// 车型身份由 TrainOperationEvidence/TrainVehicle 负责。渲染器只投影已解析结果。

// TrainMarker 展示状态（仅图片，不负责车型身份或
// 几何）。车型 PNG 加载失败时显示中性的“位置圆点”，绝不显示伪造的
// 车辆图片。已知损坏资源会在短 TTL 后重试。
var _trainArtworkFailure = {};
var _trainArtworkFailureCount = 0;
var _TRAIN_ARTWORK_FAILURE_MAX = 500;
var _TRAIN_ARTWORK_FAILURE_RETRY_MS = 45 * 1000;

function _rememberTrainArtworkFailure(trainUid, imagePath) {
  if (!trainUid || !imagePath) return;
  if (!_trainArtworkFailure[String(trainUid)]) _trainArtworkFailureCount++;
  // 资源失败只针对请求的 PNG，不针对列车本身。
  // 尤其是 iOS 图片/网络临时故障，不得永久隐藏
  // 后续时刻表或实时刷新中仍有效的图片。
  _trainArtworkFailure[String(trainUid)] = { path: String(imagePath), at: Date.now() };
  if (_trainArtworkFailureCount > _TRAIN_ARTWORK_FAILURE_MAX) {
    _trainArtworkFailure = {};
    _trainArtworkFailureCount = 0;
  }
}
function _isTrainArtworkFailureActive(trainUid, p) {
  var key = String(trainUid || "");
  var failure = key && _trainArtworkFailure[key];
  if (!failure) return false;
  var current = window.TrainVehicle && window.TrainVehicle.selectMarkerArtwork
    ? window.TrainVehicle.selectMarkerArtwork(p, false) : null;
  var samePath = current && current.kind === "vehicle" &&
    current.iconSrc && current.iconSrc === failure.path;
  var active = samePath && Date.now() - failure.at < _TRAIN_ARTWORK_FAILURE_RETRY_MS;
  if (!active) {
    delete _trainArtworkFailure[key];
    _trainArtworkFailureCount = Math.max(0, _trainArtworkFailureCount - 1);
  }
  return !!active;
}

  // 直通标签由 trains-data.js 的 ThroughChip 提供；这里仅保留渲染侧转发。
  function _renderThroughChip(layer, ns, x, y, lineObj, iconSize, mobile, maxWidth) {
    return window.ThroughChip ? window.ThroughChip.render(layer, ns, x, y, lineObj, iconSize, mobile, maxWidth) : 0;
  }

  
  /**
   * 计算线路几何——所有车站坐标的唯一事实来源。
   * 结果会缓存，仅在线路变化时重新计算。
   * @param {Object} line - 包含 stations、type、color 等字段的线路对象
   * @param {string} lineId - 线路 ID
   * @returns {Object} 几何对象，包含 stations、svgW、svgH、isLoop、isSixShapedLoop 等字段
   */


  // Junctions belong to the track graph; their L3 presentation is ordinary.
  function _junctionExitDirections(geometry, stationId, point) {
    if (!geometry || !point) return [];
    var signs = [], main = geometry.stations || [];
    (geometry.branchLines || []).forEach(function(branch, i) {
      var shared = (branch.stations || []).filter(function(id) {
        return main.indexOf(id) >= 0;
      })[0];
      if (shared !== stationId) return;
      signs.push(geometry.branchSides && geometry.branchSides[i] === "left" ? -1 : 1);
    });
    var fork = geometry.mapFork, coords = geometry.stationCoords || [];
    if (fork && coords[fork.junctionIndex] &&
        coords[fork.junctionIndex].stationId === stationId) {
      (fork.edges || []).forEach(function(edge) {
        if (edge[0] !== fork.junctionIndex && edge[1] !== fork.junctionIndex) return;
        var other = coords[edge[0] === fork.junctionIndex ? edge[1] : edge[0]];
        if (other && Math.abs(other.x - point.x) > 5)
          signs.push(other.x < point.x ? -1 : 1);
      });
    }
    if (geometry.isSixShapedLoop && geometry.junctionStation === stationId) {
      var tail = coords.filter(function(p) {
        return p && p.stationId !== stationId && Math.abs(p.x - point.x) > 5;
      })[0];
      if (tail) signs.push(tail.x < point.x ? -1 : 1);
    }
    return signs;
  }

  function _junctionInfoPlacement(geometry, point, stationName, mobile) {
    var exits = _junctionExitDirections(geometry, point.stationId, point);
    if (!exits.length) return null;
    var offset = mobile ? 20 : 12, x = point.x, y = point.y;
    var textSize = Array.from(String(stationName || "")).reduce(function(w, ch) {
      return w + (/[^\u0000-\u007f]/.test(ch) ? 16 : 10);
    }, 0);
    var cols = Object.create(null);
    var allColumnPoints = (geometry.stationCoords || []).slice();
    Object.keys(geometry.branchGeom || {}).forEach(function(id) {
      var branchPoints = geometry.branchGeom[id];
      if (Array.isArray(branchPoints))
        allColumnPoints = allColumnPoints.concat(branchPoints);
    });
    allColumnPoints.forEach(function(p) {
      if (!p || !isFinite(p.x) || !isFinite(p.y) ||
          Math.abs(p.x - x) < 5) return;
      var key = Number(p.x).toFixed(1);
      if (!cols[key]) cols[key] = {x:p.x, min:p.y, max:p.y, count:0};
      cols[key].min = Math.min(cols[key].min,p.y);
      cols[key].max = Math.max(cols[key].max,p.y);
      cols[key].count++;
    });
    var columns = Object.keys(cols).map(function(k){ return cols[k]; });
    function candidate(side) {
      var sign = side === "left" ? -1 : 1;
      var occupiedExit = exits.indexOf(sign) >= 0;
      var labelX = x + sign * offset, labelY = y - (occupiedExit ? 20 : 0);
      var left = sign < 0 ? labelX - textSize : labelX;
      var right = sign < 0 ? labelX : labelX + textSize;
      var score = occupiedExit ? 4 : 0;
      columns.forEach(function(col) {
        if (col.count >= 2 && col.min - 8 <= labelY &&
            col.max + 8 >= labelY &&
            left <= col.x + 5 && right >= col.x - 5) score += 20;
      });
      if (left < 2) score += 4;
      if (right > (Number(geometry.layoutWidth) || 0) - 2) score += 4;
      return {side:side, elevated:occupiedExit, score:score};
    }
    var left = candidate("left"), right = candidate("right");
    var fallbackSide = point.side === "right" ? "right" : "left";
    var chosen = left.score < right.score ? left
      : right.score < left.score ? right
      : fallbackSide === "right" ? right : left;
    return {side:chosen.side, elevated:chosen.elevated};
  }

  function _renderStationNode(layers, svgNS, o) {
    var nodeLayer = layers.nodes;
    var infoLayer = layers.info;
    var color = o.color;
    var isMobileView = o.isMobileView;
    var side = o.side || "right";
    var geometry = o.geometry || {};
    var svgW = o.svgW;
    var svgH = o.svgH;
    // 预取站名并记录字数（供占用检测估算文字宽）
    var _sName = (o.rS || function(id){ return id; })(o.stationId) || "";
    o.labelLen = _sName.length;
    // 主线、直通延伸和支线共用此渲染器。同一物理站可能从两个
    // 几何入口到达；先按站点/坐标去重节点，再按站点或同坐标同名去重标签。
    // 这只影响静态 SVG 的绘制，不改变线路、换乘或实时索引。
    var _labelRegistry = o.labelRegistry || null;
    var _pointKey = String(o.stationId || "") + "|" +
      Number(o.x).toFixed(2) + "," + Number(o.y).toFixed(2);
    if (_labelRegistry && _labelRegistry.nodes[_pointKey]) return;
    if (_labelRegistry) _labelRegistry.nodes[_pointKey] = true;
    var _labelKeys = [];
    if (o.stationId) _labelKeys.push("station:" + String(o.stationId));
    if (_sName) _labelKeys.push("name:" + _sName + "@" +
      Number(o.x).toFixed(2) + "," + Number(o.y).toFixed(2));
    var _labelAlreadyRendered = !!(_labelRegistry && _labelKeys.some(function(k) {
      return _labelRegistry.labels[k];
    }));
    if (_labelRegistry && !_labelAlreadyRendered) {
      _labelKeys.forEach(function(k) { _labelRegistry.labels[k] = true; });
    }

    // Station circle
    if (o.sharedColor) {
      // 共线区间站——平移到两条线中间，白底圆 + 双色外弧描边
      var _r = 7, _cx = o.x - 3, _cy = o.y; // 左移3px到双线正中间（线间距6px的一半）
      // 白底圆（无描边）
      var _bg = document.createElementNS(svgNS, "circle");
      _bg.setAttribute("cx", _cx);
      _bg.setAttribute("cy", _cy);
      _bg.setAttribute("r", _r);
      _bg.setAttribute("fill", "#fff");
      _bg.setAttribute("stroke", "none");
      _bg.setAttribute("data-station-index", o.si);
      nodeLayer.appendChild(_bg);
      // 左半弧（金色=有乐町线色，和左边线一致）
      var _arcLeft = document.createElementNS(svgNS, "path");
      _arcLeft.setAttribute("d", "M " + _cx + " " + (_cy - _r) + " A " + _r + " " + _r + " 0 0 0 " + _cx + " " + (_cy + _r));
      _arcLeft.setAttribute("fill", "none");
      _arcLeft.setAttribute("stroke", o.sharedColor);
      _arcLeft.setAttribute("stroke-width", "2");
      nodeLayer.appendChild(_arcLeft);
      // 右半弧（棕色=副都心线色，和右边线一致）
      var _arcRight = document.createElementNS(svgNS, "path");
      _arcRight.setAttribute("d", "M " + _cx + " " + (_cy - _r) + " A " + _r + " " + _r + " 0 0 1 " + _cx + " " + (_cy + _r));
      _arcRight.setAttribute("fill", "none");
      _arcRight.setAttribute("stroke", color);
      _arcRight.setAttribute("stroke-width", "2");
      nodeLayer.appendChild(_arcRight);
    } else {
      var circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", o.x);
      circle.setAttribute("cy", o.y);
      // 接续点是结构参考点，不是主要视觉元素。
      // 保持可读，但避免使用过去会与主要车站列车图标竞争的
      // 大型实心圆点。
      circle.setAttribute("r", "7");
      circle.setAttribute("fill", "#fff");
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("data-station-index", o.si);
      nodeLayer.appendChild(circle);
    }

    // 站名位置（优先使用 o.tx/o.ty/o.anchor，否则根据侧边推导）。
    var tx, ty, anchor;
    // 站名与圆点同行，垂直居中对齐（dominant-baseline central，ty=圆心）
    if (o.tx != null) { tx = o.tx; ty = o.ty; anchor = o.anchor || "start"; }
    else if (side === "top") { tx = o.x; ty = o.y - 10; anchor = "middle"; }
    else if (side === "bottom") { tx = o.x; ty = o.y + 15; anchor = "middle"; }
    // 移动端和桌面端：尾段及环线左侧站名保持在
    // 窄环线外侧，并由几何预留的站名车道彼此分开。
    else if (side === "left" && geometry.isSixShapedLoop && geometry.isDualLoop6) {
      tx = o.x - 12;
      ty = o.y;
      anchor = "end";
    }
    else if (side === "left" && geometry.isSixShapedLoop && !geometry.isDualLoop6) { tx = o.x + 10; ty = o.y; anchor = "start"; }
    else if (side === "left") {
      // Ordinary mobile maps use 11-unit directional train lanes and
      // 14-unit-wide vehicle artwork. Keep the station-name edge outside
      // that corridor instead of letting left-lane vehicles cover the final
      // glyph (notably Komiya and Kaneko on the Hachiko line).
      tx = o.x - (isMobileView ? 20 : 10);
      ty = o.y;
      anchor = "end";
    }
    else if (side === "dual") {
      // Dual-track station labels share the same left-side marker corridor.
      // Hachiko uses this side mode, so retain the mobile clearance here too.
      tx = o.x - (isMobileView ? 20 : 12);
      ty = o.y;
      anchor = "end";
    }
    else if (side === "right" && geometry.isSixShapedLoop && !geometry.isDualLoop6) { tx = o.x - 10; ty = o.y; anchor = "end"; }
    else { tx = o.x + (geometry.isSixShapedLoop ? 16 : 10); ty = o.y; anchor = "start"; }

    if (o.junctionPlacement) {
      var branchSide = o.junctionPlacement.side;
      tx = o.x + (branchSide === "left" ? -(isMobileView ? 20 : 12) : (isMobileView ? 20 : 12));
      ty = o.y - (o.junctionPlacement.elevated ? 20 : 0);
      anchor = branchSide === "left" ? "end" : "start";
    }

    if (_labelAlreadyRendered) return;
    var infoGroup = document.createElementNS(svgNS, "g");
    infoGroup.setAttribute("class", "station-info");
    infoGroup.setAttribute("data-station-info", String(o.stationId || ""));
    infoLayer.appendChild(infoGroup);
    var label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", tx);
    label.setAttribute("y", ty);
    label.setAttribute("font-size", "16");
    label.setAttribute("fill", "var(--text-muted)");
    label.setAttribute("font-family", "inherit"); // 站名用像素字体（与全局一致）
    label.setAttribute("font-weight", "500");
    label.setAttribute("text-anchor", anchor);
    // 左右侧站名垂直居中于圆点（top/bottom 保持基线在圆点上下方）
    if (o.junctionPlacement || (side !== "top" && side !== "bottom"))
      label.setAttribute("dominant-baseline", "central");
    // Avoid track overlap by placement, never by opaque outlines.
    var _clampAvail = anchor === "end" ? tx - 4
      : anchor === "start" ? svgW - 2 - tx : 0;
    if (geometry.isSixShapedLoop) {
      if (geometry.isDualLoop6) {
        // 文字保持在环线外侧；使用通用左右宽度限制。
      } else if (geometry.junctionX === null || o.x >= geometry.junctionX) {
        // 环线车站：站名区域 = 环线宽度的一半（两侧共用）。
        var _sc6 = isMobileView ? 1.5 : 1.3;
        var _m6r = isMobileView ? 66 : (20 * _sc6 + 12);
        var _tw6 = 70 * _sc6;
        var _lm6 = 8 * _sc6;
        var _loopW6 = svgW - _lm6 - _tw6 - _m6r;
        _clampAvail = Math.max(40, Math.floor(_loopW6 / 2) - 10);
      } else if (side === "left") {
        // 尾段车站（光丘方向）站名从 stubX 向右延伸到
        // 环线左边缘。上方通用支线逻辑错误地使用 tx-4
        // （向左留空约 31px），把所有尾段标签压缩到 40px。
        _clampAvail = Math.max(40, Math.floor(geometry.junctionX - tx - 4));
      }
    }
    if (_clampAvail > 0) label.setAttribute("data-clamp-avail", String(Math.max(40, Math.round(_clampAvail))));

    // 站名。
    var stationName = _sName;
    var nameTspan = document.createElementNS(svgNS, "tspan");
    if (o.labelLines) {
      o.labelLines.forEach(function(row,i) {
        var span = document.createElementNS(svgNS,'tspan');
        span.setAttribute('x',tx); span.setAttribute('dy',i ? 18 : 0);
        span.textContent = row; label.appendChild(span);
      });
    } else { nameTspan.textContent = stationName; label.appendChild(nameTspan); }
    label.setAttribute('data-station-label',o.stationId);
    infoGroup.appendChild(label);

    // 换乘线路图标（在站名下方圆角背景徽章内分组）。
    if (o.skipTx) return;
    var transferMap = o.transferMap || {};
    var txLines = transferMap[o.stationId] || [];
    if (txLines.length > 0) {
      var ICON = window.StationInfoLayout.icon;
      var GAP = window.StationInfoLayout.gap;
      // One L3 badge anchor rule applies to every station.
      var _align = anchor;
      var _edge = tx;
      var _available = anchor === "end" ? tx - 2
        : anchor === "start" ? svgW - 2 - tx
        : Math.max(1, 2 * Math.min(tx - 2, svgW - 2 - tx));
      var badgePlan = window.StationInfoLayout.plan(
        txLines, o.stationId, _sName, isMobileView, _available);
      var rows = badgePlan.rows;
      var totalW = badgePlan.totalWidth;
      var ix0 = _align === "end" ? _edge - totalW
        : _align === "start" ? _edge : _edge - totalW / 2;
      // If even one badge is wider than a narrow station column, preserve
      // its anchor and let the shared static viewport include the overflow.
      // Do not force it across the rail or let it cover another chip.
      if (_align === "end" && ix0 < 2) ix0 = 2;
      if (_align === "start" && ix0 + totalW > svgW - 2)
        ix0 = Math.max(2, svgW - 2 - totalW);
      var iy0 = side === "top" ? o.y + 14 : ty + 9;
      if (o.transferBelowNode) iy0 = Math.max(iy0, o.y + 14);
      if (o.horizontalBranch)
        iy0 = o.labelAbove
          ? ty - rows * window.StationInfoLayout.pitch - 14
          : ty + (o.labelLines.length - 1) * 18 + 14;
      iy0 = Math.max(2, iy0);
      // The transfer group itself is transparent. White rectangles behind
      // every station made iOS Smart Invert look like another mini-canvas.
      if (rows > 0) {
        var badgeGroup = document.createElementNS(svgNS, "g");
        badgeGroup.setAttribute("class", "station-transfer-badges");
        badgeGroup.setAttribute("data-transfer-station", String(o.stationId || ""));
        infoGroup.appendChild(badgeGroup);
        var rowCur = ix0;
        badgePlan.shown.forEach(function(entry, index) {
          var row = Math.floor(index / badgePlan.perRow);
          var col = index % badgePlan.perRow;
          if (col === 0) rowCur = ix0;
          var bx = rowCur;
          var by = iy0 + row * window.StationInfoLayout.pitch;
          var item = entry.item;
          var itemGroup = document.createElementNS(svgNS, "g");
          badgeGroup.appendChild(itemGroup);
          var badgeTitle = document.createElementNS(svgNS, "title");
          badgeTitle.textContent = window.ThroughChip.badgeText(item) +
            (item.toStation ? " → " +
              (window.RailwayDB && window.RailwayDB.resolveStationName
                ? window.RailwayDB.resolveStationName(item.toStation, window.currentLang)
                : item.toStation) : "");
          itemGroup.appendChild(badgeTitle);
          if (item.image) {
            var img = document.createElementNS(svgNS, "image");
            img.setAttribute("href", item.image);
            img.setAttribute("xlink:href", item.image);
            img.setAttribute("x", bx);
            img.setAttribute("y", by);
            img.setAttribute("width", ICON);
            img.setAttribute("height", ICON);
            itemGroup.appendChild(img);
          } else {
            var badgeHeight = isMobileView ? 15 : 11;
            var rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", bx);
            rect.setAttribute("y", by);
            rect.setAttribute("width", entry.badgeWidth);
            rect.setAttribute("height", badgeHeight);
            rect.setAttribute("rx", "2");
            rect.setAttribute("fill", item.color ||
              (window.TrainsColors ? window.TrainsColors.LABEL_FALLBACK : "#8a8a8a"));
            itemGroup.appendChild(rect);
            var nameText = document.createElementNS(svgNS, "text");
            nameText.setAttribute("x", bx + entry.badgeWidth / 2);
            nameText.setAttribute("y", by + badgeHeight / 2 + (isMobileView ? 3.2 : 2.2));
            nameText.setAttribute("text-anchor", "middle");
            nameText.setAttribute("font-size", isMobileView ? "9" : "6.5");
            nameText.setAttribute("font-weight", "600");
            nameText.setAttribute("fill", "#fff");
            nameText.textContent = entry.label;
            itemGroup.appendChild(nameText);
            if (entry.extra) {
              var extraLabel = document.createElementNS(svgNS, "text");
              extraLabel.setAttribute("x", bx + entry.badgeWidth + 3);
              extraLabel.setAttribute("y", by + badgeHeight / 2 + (isMobileView ? 3 : 2));
              extraLabel.setAttribute("font-size", isMobileView ? "7" : "5");
              extraLabel.setAttribute("font-weight", "500");
              extraLabel.setAttribute("fill", "var(--text)");
              extraLabel.textContent = entry.extra;
              itemGroup.appendChild(extraLabel);
            }
          }
          rowCur += entry.width + GAP;
        });
        if (badgePlan.moreText) {
          var overflowText = document.createElementNS(svgNS, "text");
          overflowText.setAttribute("x", ix0 + badgePlan.overflowX);
          overflowText.setAttribute("y", iy0 + badgePlan.overflowY + 8);
          overflowText.setAttribute("font-size", "7");
          overflowText.setAttribute("fill", "var(--text-muted)");
          overflowText.textContent = badgePlan.moreText;
          badgeGroup.appendChild(overflowText);
        }
      }

      // 直通标签保留在所属车站的站名/换乘列中。
      var thruList = window.ThroughChip.normalize(txLines.filter(function(it) { return it && it.through; }));
      var chipWidth = geometry.throughChipMaxWidth || (isMobileView ? 148 : 124);
      var upward = [], middle = [], down = [];
      thruList.forEach(function(it) {
        var display = Object.assign({}, it);
        if (geometry.isLoop) display.dir = "middle";
        if (display.dir === "up") upward.push(display);
        else if (display.dir === "middle") middle.push(display);
        else down.push(display);
      });
      var bounds = {minX:2, maxX:svgW-2};
      var drawGroup = function(items, x, y, align, width) {
        window.ThroughChip.layoutGroup(items, isMobileView, width, x, y, align, bounds).forEach(function(p) {
          p.item._throughSide = align === "end" ? "left" : "right";
          _renderThroughChip(infoGroup, svgNS, p.x, p.y, p.item, ICON, isMobileView, width);
        });
      };
      var belowY = Math.max(ty + 12, iy0 + rows * (ICON + GAP) + 4);
      // 上端头（线首 dir=up）在站上方横向一字排开、下端头（线末 dir=down）
      // 在站下方横向一字排开；中间站（dir=middle）贴圆点侧边纵向堆叠（）。
      var drawRow = function(items, x, y, align, width) {
        window.ThroughChip.layoutRow(items, isMobileView, width, x, y, align, bounds).forEach(function(p) {
          p.item._throughSide = "right";
          _renderThroughChip(infoGroup, svgNS, p.x, p.y, p.item, ICON, isMobileView, width);
        });
      };
      if (upward.length) {
        var uSizes = upward.map(function(it){ return window.ThroughChip.size(it, isMobileView, chipWidth); });
        var uMaxH = Math.max.apply(null, uSizes.map(function(s){ return s.h; }));
        drawRow(upward, o.x, o.y - 18 - uMaxH, "middle", chipWidth);
      }
      if (middle.length) {
        var mH = window.ThroughChip.height(middle, isMobileView, chipWidth);
        var _dotR = 7;
        var mX, mAlign, mY;
        if (geometry.isLoop) { mX = tx; mAlign = anchor === "middle" ? "middle" : anchor; mY = belowY; }
        else if (anchor === "end") { mX = o.x + _dotR + 14; mAlign = "start"; mY = o.y - mH / 2; }
        else if (anchor === "start") { mX = o.x - _dotR - 14; mAlign = "end"; mY = o.y - mH / 2; }
        else { mX = o.x + _dotR + 14; mAlign = "start"; mY = o.y - mH / 2; }
        drawGroup(middle, mX, mY, mAlign, chipWidth);
      }
      if (down.length) {
        var dSizes = down.map(function(it){ return window.ThroughChip.size(it, isMobileView, chipWidth); });
        var dMaxH = Math.max.apply(null, dSizes.map(function(s){ return s.h; }));
        drawRow(down, o.x, belowY, "middle", chipWidth);
      }

    }
  }

  function _isRealtimePositionFresh(p) {
    if (!p || p.positionSource !== "realtime-api") return true;
    var now = Date.now();
    if (p.sourceValidUntil) {
      var validUntil = Date.parse(p.sourceValidUntil);
      return !isNaN(validUntil) && validUntil >= now;
    }
    if (!p.sourceUpdatedAt) return true;
    var updatedAt = Date.parse(p.sourceUpdatedAt);
    if (isNaN(updatedAt)) return false;
    var frequency = Number(p.sourceFrequency);
    var maxAgeMs = isFinite(frequency) && frequency > 0
      ? Math.max(60000, Math.min(frequency * 1000 * 4, 5 * 60 * 1000))
      : 2 * 60 * 1000;
    return (now - updatedAt) <= maxAgeMs;
  }

  function _filterExpiredRealtimePositions(positions) {
    return (positions || []).filter(_isRealtimePositionFresh);
  }

  // Ordinary maps keep a train's artwork and direction together in one
  // SVG coordinate system. Six-shaped Oedo maps use independent fixed lanes.
  function _trainUnitContainer(child) {
    var parent = child && child.parentNode;
    return parent && parent.getAttribute &&
      parent.getAttribute('data-train-unit-id') ? parent : null;
  }

  function _discardTrainMarker(markerById, trainUid, icon) {
    if (icon._moveRaf) cancelAnimationFrame(icon._moveRaf);
    var unit = _trainUnitContainer(icon);
    if (unit && unit.parentNode) unit.parentNode.removeChild(unit);
    else if (icon.parentNode) icon.parentNode.removeChild(icon);
    delete markerById[String(trainUid)];
    return null;
  }

  // 描述当前显示的行；覆盖配置不能为快照提供认证。
  function updateEstimatedNote(el, lineId, positions) {
    try {
      var oldNotes = el.parentNode ? el.parentNode.querySelectorAll('.tp-est-note') : [];
      for (var i = 1; i < oldNotes.length; i++) oldNotes[i].remove();
      var hasEstimate = (positions || []).some(function(p) { return p && p.estimated === true; });
      var note = oldNotes[0];
      if (!note) {
        note = document.createElement("div");
        note.className = "tp-est-note";
        note.setAttribute("role", "status");
        note.setAttribute("aria-live", "polite");
        el.insertAdjacentElement('afterend', note);
      }
      // A missing verified plan is not the same as an empty train map or
      // a cancelled service. Only a successful, date-scoped SQL response
      // with an explicit missing-all-plans audit may show this distinction.
      var runStatus = window.ODPTClient && window.ODPTClient.getTrainRunStatus
        ? window.ODPTClient.getTrainRunStatus(lineId) : null;
      var missingPlan = !(positions && positions.length) && runStatus &&
        runStatus.planAvailability === "unconfirmed" &&
        runStatus.auditCoverageStatus === "missing_all_plans" &&
        runStatus.runs === 0 && runStatus.source !== "SOURCE_ERROR";
      var text = t(missingPlan ? "trains.plan_not_imported_note" :
        hasEstimate ? "trains.estimated_note" :
        positions && positions.length ? "trains.live_note" : "trains.unavailable_note");
      if (note.textContent !== text) note.textContent = text;
    } catch(e) { /* note is best-effort */ }
  }

  function _trainPositionRank(p) {
    if (!p) return 3;
    if (p.positionSource === "realtime-api" || p.estimated === false) return 0;
    if (p.positionSource === "supabase-train-run") return 1;
    if (p.positionSource === "train-timetable") return 1;
    if (p.positionSource === "station-timetable") return 2;
    return p.estimated === true ? 1 : 0;
  }

  function _sortTrainPositionsBySource(positions) {
    return (positions || []).slice().sort(function(a, b) {
      var ar = _trainPositionRank(a);
      var br = _trainPositionRank(b);
      if (ar !== br) return ar - br;
      var ai = a && a.stationIndex != null ? a.stationIndex : 9999;
      var bi = b && b.stationIndex != null ? b.stationIndex : 9999;
      if (ai !== bi) return ai - bi;
      return String((a && (a.trainNumber || a.trainId)) || "").localeCompare(String((b && (b.trainNumber || b.trainId)) || ""));
    });
  }

  function _prepareTrainPositions(positions, stationCoords) {
    var ordered = _sortTrainPositionsBySource(positions);
    if (!stationCoords || !stationCoords.length) return ordered;
    var valid = ordered.filter(function(position) {
      if (_trainPositionRank(position) === 0) return true;
      var stationIndex = position && position.stationIndex != null
        ? Number(position.stationIndex) : NaN;
      return isFinite(stationIndex) && stationIndex >= 0 && stationIndex < stationCoords.length;
    });
    // Published coupling can group only two verifiably co-located portions
    // on the same corridor. After the junction each retains its own number,
    // destination and stable source ID. Do not alter upstream identities.
    return window.TrainCoupling && typeof window.TrainCoupling.prepare === "function"
      ? window.TrainCoupling.prepare(valid, stationCoords) : valid;
  }

  // 服务走廊记录可能携带完整时刻表路径，但其
  // 面向乘客的图只拥有中央走廊。保留时刻表
  // 索引在源数据中不变，只将可见位置
  // 投影到这里的图形车站上。
  function _displayLineForMap(line, lineId) {
    var presentation = line && line.presentation;
    if (!presentation || !Array.isArray(presentation.mapStations) || presentation.mapStations.length < 2) return line;
    return Object.assign({}, line, {
      stations: presentation.mapStations.slice(),
      durations: Array.isArray(presentation.mapDurations) ? presentation.mapDurations.slice() : line.durations
    });
  }

  function _projectPositionsForMap(positions, sourceLine, displayLine) {
    if (!sourceLine || !displayLine || sourceLine === displayLine || !Array.isArray(sourceLine.stations) ||
        !Array.isArray(displayLine.stations) || sourceLine.stations === displayLine.stations) return positions;
    var displayIndex = {};
    displayLine.stations.forEach(function(station, index) { displayIndex[station] = index; });
    return (positions || []).map(function(position) {
      if (!position || position.stationIndex == null) return null;
      var sourceFrom = sourceLine.stations[Number(position.stationIndex)];
      var sourceTo = position.segmentToIndex == null ? null : sourceLine.stations[Number(position.segmentToIndex)];
      var fromIndex = displayIndex[sourceFrom];
      var toIndex = sourceTo == null ? null : displayIndex[sourceTo];
      // Only positions in the presented corridor belong on this map.
      // Never pin approaching trains to Ueno or departed trains to Shinagawa.
      if (fromIndex == null) return null;
      if (sourceTo != null && toIndex == null &&
          Number(position.segmentProgress || 0) > 0) return null;
      var projected = Object.assign({}, position);
      projected.stationIndex = fromIndex;
      projected.segmentToIndex = toIndex == null || toIndex === fromIndex ? null : toIndex;
      if (projected.segmentToIndex == null) projected.segmentProgress = 0;
      return projected;
    }).filter(Boolean);
  }

  var _trainRenderSamples = [];
  function getTrainRenderPerformanceSamples() { return _trainRenderSamples.slice(); }
  function disposeTrainMap(el) {
    if (!el || !el.querySelectorAll) return;
    Array.prototype.forEach.call(el.querySelectorAll('[data-train-id]'),function(marker) {
      if (marker._moveRaf) cancelAnimationFrame(marker._moveRaf);
      marker._moveRaf = 0;
    });
    var mapSvg = el.querySelector('.tp-map-wrap > svg');
    if (mapSvg && typeof mapSvg._disposeTrainMapGestures === 'function') mapSvg._disposeTrainMapGestures();
    var layer = el.querySelector('.train-layer');
    if (layer && typeof layer._cancelTrainFoldGesture === 'function') layer._cancelTrainFoldGesture();
    if (layer && typeof layer._closeTrainFoldPopover === 'function') layer._closeTrainFoldPopover(false);
  }

  // The SVG is a static frame, not a camera. Geometry owns its fixed
  // width and route-derived height; getBBox is diagnostic ONLY and cannot
  // change x, y, width, height or reposition the SVG.
  function _commitStaticRouteViewport(svg, staticLayer, geometry) {
    var bounds = {
      x: 0, y: 0,
      width: Number(geometry.svgW),
      height: Number(geometry.svgH)
    };
    if (!(bounds.width > 0) || !(bounds.height > 0))
      throw new Error("Invalid fixed train canvas geometry");
    svg.setAttribute("viewBox", "0 0 " + bounds.width + " " + bounds.height);
    svg.setAttribute("data-pt-viewport-source", "route-geometry");
    svg.setAttribute("data-pt-canvas-fit", "fixed-width-route-height");
    geometry.contentBounds = bounds;

    // Audit the transformed drawing against the nonmoving viewBox.
    // The result is exposed to DevTools; it does NOT resize or recenter.
    geometry.canvasOverflow = null;
    try {
      var box = staticLayer.getBBox();
      if (box && isFinite(box.x) && isFinite(box.y) &&
          isFinite(box.width) && isFinite(box.height)) {
        var k = Number(geometry.canvasScale) || 1;
        var x = (Number(geometry.canvasOffsetX) || 0) + box.x * k;
        var y = (Number(geometry.canvasOffsetY) || 0) + box.y * k;
        geometry.canvasOverflow = {
          left: Math.max(0, -x),
          top: Math.max(0, -y),
          right: Math.max(0, x + box.width * k - bounds.width),
          bottom: Math.max(0, y + box.height * k - bounds.height)
        };
      }
    } catch (_ignored) { /* SVG text measurements are not guaranteed. */ }
    return bounds;
  }

  // Read-only contract diagnostic: use it to inspect any operator/line in DevTools.
  function auditRouteCanvas(el) {
    var svg = el && el.querySelector && el.querySelector(".tp-map-wrap > svg");
    if (!svg) return null;
    var directRects = Array.prototype.filter.call(svg.children || [], function(node) {
      return String(node.tagName || "").toLowerCase() === "rect";
    });
    var viewport = svg.getAttribute("viewBox") || "";
    var geometry = svg.__geometry || {};
    var expected = geometry.contentBounds;
    var expectedViewport = expected
      ? [expected.x,expected.y,expected.width,expected.height].join(" ") : "";
    var rect = svg.getBoundingClientRect ? svg.getBoundingClientRect() : null;
    var realScale = rect && expected && expected.width > 0
      ? rect.width / expected.width : null;
    var circle = svg.querySelector(".station-node-layer circle[data-station-index]");
    var label = svg.querySelector("text[data-station-label]");
    return {
      lineId: svg.getAttribute("data-line-id") || "",
      l1Owner: ".tp-line-map",
      independentSvgBackgrounds: directRects.length,
      viewportSource: svg.getAttribute("data-pt-viewport-source") || "",
      canvasFit: svg.getAttribute("data-pt-canvas-fit") || "",
      horizontalOverflowPx: Math.max(0, el.scrollWidth - el.clientWidth),
      horizontalOffsetPx: el.scrollLeft,
      viewport: viewport,
      matchesStaticBounds: !!expected && viewport === expectedViewport,
      renderedWidthPx: rect ? rect.width : null,
      actualCssPxPerUnit: realScale == null ? null :
        Math.round(realScale * (Number(geometry.canvasScale) || 1) * 1000) / 1000,
      fixedCanvasWidth: Number(geometry.svgW) || null,
      layoutWidth: Number(geometry.layoutWidth) || null,
      layoutHeight: Number(geometry.layoutHeight) || null,
      staticCanvasOverflow: geometry.canvasOverflow || null,
      stationCircleDiameterPx: circle && realScale != null
        ? Math.round(2 * Number(circle.getAttribute("r")) * realScale *
          (Number(geometry.canvasScale) || 1) * 10) / 10 : null,
      stationLabelFontPx: label && realScale != null
        ? Math.round(Number(label.getAttribute("font-size")) * realScale *
          (Number(geometry.canvasScale) || 1) * 10) / 10 : null,
      staticLayers: svg.querySelectorAll(".static-layer").length,
      trackLayers: svg.querySelectorAll(".route-track-layer").length,
      stationNodeLayers: svg.querySelectorAll(".station-node-layer").length,
      stationInfoLayers: svg.querySelectorAll(".station-info-layer").length,
      stationInfoGroups: svg.querySelectorAll(".station-info").length,
      trainLayers: svg.querySelectorAll(".train-layer").length
    };
  }

  function renderTrainMap(el, line, lineId, renderOptions) {
    var startedAt = performance.now();
    var renderKind = 'full';
    try {
      // dct:valid 之外的 ODPT 动态数据不得继续作为实时数据可见。
      var sourceLine = line;
      var displayLine = _displayLineForMap(line, lineId);
      var positions = _filterExpiredRealtimePositions(getRealtimePositions(lineId));
      positions = _projectPositionsForMap(positions, sourceLine, displayLine);
      var _lang = window.currentLang || "ja";
      var _rS = (window.RailwayDB && window.RailwayDB.resolveStationName) ? function(id){ return window.RailwayDB.resolveStationName(id, _lang) || id; } : function(id){ return id; };
      
      // Only position-only fusion notifications can reuse the previous
      // geometry revision. All other calls verify the full static network.
      var existingSvg = el.querySelector('svg');
      var positionGeometry = renderOptions && renderOptions.positionSnapshot === true &&
        existingSvg && existingSvg.getAttribute('data-line-id') === lineId
        ? existingSvg.__geometry : null;
      var geometry = computeRouteGeometry(displayLine, lineId, positionGeometry);
      var stationCoords = geometry.stationCoords;
      // Local layout units differ from the public, fixed-width viewBox.
      var svgW = geometry.layoutWidth;
      var svgH = geometry.layoutHeight;
      // All layouts, including six-shaped loops, share the same locked SVG canvas.
      var isMobileView = _isMobileView();
      var color = geometry.color;
      
      // 检查需要完整重建（线路变化）还是只更新列车层。
      // 语言属于静态层身份：切换语言必须
      // 触发完整重建（站名/换乘标题属于 i18n）。
      var isSameLine = existingSvg && existingSvg.getAttribute('data-line-id') === lineId
        && existingSvg.getAttribute('data-lang') === _lang
        && existingSvg.__geometry && existingSvg.__geometry.lineHash === geometry.lineHash;
      
      if (isSameLine) {
        renderKind = 'incremental';
        // === 增量更新：仅使用缓存几何更新列车层 ===
        updateTrainLayer(existingSvg, positions, stationCoords, lineId, displayLine);
        updateRunningInfo(el, positions);
        updateEstimatedNote(el, lineId, positions);
        // 与实时页面同步加载占位：列车
        // 位置可用后隐藏（完整重建路径在空数据时会重新插入）。
        if (positions.length > 0) {
          var _noDataEl = el.querySelector('.tp-no-data');
          if (_noDataEl) _noDataEl.remove();
        }
        return;
      }
      
      // === 完整重建：创建分层的新 SVG ===
      disposeTrainMap(el);
      var svgNS = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("xmlns", svgNS);
      svg.setAttribute("viewBox", "0 0 " + geometry.svgW + " " + geometry.svgH);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      // Static size/background are defined once in trains.css. Only the
      // committed viewport may override width for the mobile physical scale.
      svg.setAttribute("data-pt-canvas", "content-only");
      svg.setAttribute("data-line-id", lineId);
      svg.setAttribute("data-lang", _lang);
      // 用于列车定位的支线几何（支线列车渲染在支线列）。
      svg.__branchGeom = geometry.branchGeom || null;
      svg.__geometry = geometry;
      
      // SVG 只包含线路内容，不绘制独立的底色矩形。
      // 背景由外层 .tp-line-map (CSS) 统一负责：最终 viewBox 会
      // 随站名/图标边界扩展，旧的 svgW/svgH 底色会露出错位边缘，
      // 且 iOS 智能反转可能区别对待 SVG 内的底色与 HTML 背景。
      // 保持 SVG 透明，不改变任何轨道、车站和列车几何坐标。
      
      // === 静态层：线路、车站、标签（每条线路只构建一次） ===
      var staticLayer = document.createElementNS(svgNS, "g");
      staticLayer.setAttribute("class", "static-layer");
      staticLayer.setAttribute("transform", geometry.canvasTransform);
      // All operators use the same painter order: route -> nodes -> L3 info.
      // No station or branch may append its own isolated SVG canvas.
      var trackLayer = document.createElementNS(svgNS, "g");
      trackLayer.setAttribute("class", "route-track-layer");
      var stationNodeLayer = document.createElementNS(svgNS, "g");
      stationNodeLayer.setAttribute("class", "station-node-layer");
      var stationInfoLayer = document.createElementNS(svgNS, "g");
      stationInfoLayer.setAttribute("class", "station-info-layer");
      staticLayer.appendChild(trackLayer);
      staticLayer.appendChild(stationNodeLayer);
      staticLayer.appendChild(stationInfoLayer);
      var stationLayers = {nodes: stationNodeLayer, info: stationInfoLayer};
      
      // 换乘车站图标映射（本线路上的换乘线路）。
      var transferMap = _getTransferMap(lineId, geometry.staticRevision);
      var stationRenderRegistry = {
        nodes: Object.create(null),
        labels: Object.create(null)
      };
      
      // 添加线路元素（line/rect/polyline）。
      for (var re = 0; re < geometry.routeElements.length; re++) {
        var routeEl = geometry.routeElements[re];
        var svgEl = document.createElementNS(svgNS, routeEl.type);
        for (var attr in routeEl.attrs) {
          if (routeEl.attrs.hasOwnProperty(attr)) {
            svgEl.setAttribute(attr, routeEl.attrs[attr]);
          }
        }
        if (routeEl.text) svgEl.textContent = routeEl.text;
        trackLayer.appendChild(svgEl);
      }
      
      // Junctions share ordinary station styles. Only side clearance
      // depends on actual branch exit geometry.
      for (var si = 0; si < stationCoords.length; si++) {
        var sc = stationCoords[si];
        var stationId = sc.stationId;
        var _junctionPlacement = _junctionInfoPlacement(
          geometry, sc, String(_rS(stationId) || stationId), isMobileView);
        // 共线区间站画双色半圆 + 自动判断共线线
        var _sharedColor = '';
        if (window.SharedTrackPairs && window.SharedTrackPairs.isSharedStation && window.SharedTrackPairs.isSharedStation(lineId, stationId)) {
          var _allL = (window.RailwayDB && window.RailwayDB.getAllLines) ? window.RailwayDB.getAllLines() : null;
          var _partners = window.SharedTrackPairs.getSharedLines(lineId) || [];
          if (_allL && _partners.length > 0) {
            _sharedColor = _allL[_partners[0]].color || '';
          }
        }
        _renderStationNode(stationLayers, svgNS, {
          x: sc.x, y: sc.y, stationId: stationId,
          color: geometry.stationDisplayColor ? geometry.stationDisplayColor(stationId) : color,
          si: si, side: sc.side || "right", geometry: geometry, isMobileView: isMobileView,
          svgW: svgW, svgH: svgH, transferMap: transferMap, stationCoords: stationCoords,
          labelRegistry: stationRenderRegistry,
          rS: _rS,
          sharedColor: _sharedColor,
          junctionPlacement: _junctionPlacement,
          transferBelowNode: !!(_junctionPlacement && _junctionPlacement.elevated),
          skipTx: false
        });
      }
      
      // 竖列支线名标签移至 HTML 层图注（不撑宽 viewBox，保持全线路密度统一）
      var _branchNoteItems = [];
      // 添加支线（如果有），支持环线和直线线路。
      for (var bi = 0; bi < geometry.branchLines.length; bi++) {
        var branch = geometry.branchLines[bi];
        var bColor = branch.color || color;
        // 查找接续站：支线中第一个也存在于主线的车站。
        // 支持 junction 在支线站表任意位置（我孫子支线 junction 成田在末位）
        var junctionIdx = -1;
        var _jAt = 0;
        if (branch.stations && branch.stations.length > 0 && stationCoords.length > 0) {
          var _mainIds7 = [];
          for (var _mI7 = 0; _mI7 < stationCoords.length; _mI7++) _mainIds7.push(stationCoords[_mI7].stationId);
          var _jFind7 = _branchJunctionStation(branch.stations, _mainIds7);
          if (_jFind7) {
            for (var _ji = 0; _ji < stationCoords.length; _ji++) {
              if (stationCoords[_ji].stationId === _jFind7.station) {
                junctionIdx = _ji;
                break;
              }
            }
            _jAt = _jFind7.at;
          }
        }
        if (junctionIdx >= 0 && stationCoords.length > junctionIdx) {
          // 多支线全左直排（用户："要么两条直线在左边或者右边别再有拐弯"）——
          // 全部支线同一侧、junction 行水平直 stub（无下移拐弯）；单支线保持右（现状）
          // 派生值经 geometry 跨函数传递（computeRouteGeometry → renderTrainMap）
          var _bSideNow = (geometry.branchSides && geometry.branchSides[bi]) ? geometry.branchSides[bi] : "right";
          var _bColNow = (geometry.bCol) ? geometry.bCol(bi) : 0;
          var _stubL6 = geometry.branchStubL || 0;
          var _stubR6 = geometry.branchStubR || GEOM.BRANCH_STUB; // 右侧 stub ≥ 站间距
          var _colW6 = geometry.branchColW || GEOM.BRANCH_COL_W;
          if (geometry.branchModes && geometry.branchModes[bi] === 'h') {
            // 短支线线 → 支线水平直线横排（用户："两条直线别再有拐弯"）：
            // junction 圆点直接一条水平直线延伸到最后一站（无 stub、无竖列、无拐弯）；
            // 支线站横排（跳过 junction 站，主干已画），站名朝侧边、与圆点同行。
            var _bHSt = [];
            var _rStationsH = (_jAt === branch.stations.length - 1) ? branch.stations.slice().reverse() : branch.stations;
            for (var bhi2 = 0; bhi2 < _rStationsH.length; bhi2++) {
              if (_rStationsH[bhi2] === _jFind7.station) continue;
              _bHSt.push(_rStationsH[bhi2]);
            }
            var branchLayout = geometry.branchLayouts[branch.id];
            var _bHsp = branchLayout.pitch;
            // 鶴見線の二つの短支線は図中の水平線だけで識別できるため、
            // 上部の補助注記は表示しない（他線の分岐注記は維持）。
            if (!(line && line.presentation && line.presentation.suppressBranchNotes === true)) {
              _branchNoteItems.push({ color: bColor, name: window.RailwayDB && window.RailwayDB.resolveLineName
                ? window.RailwayDB.resolveLineName(branch.id, window.currentLang) : branch.name });
            }
            var _bHX0 = stationCoords[junctionIdx].x;
            var _bHY0 = stationCoords[junctionIdx].y;
            var _bHxLast = (_bSideNow === "left")
              ? (_bHX0 - _bHSt.length * _bHsp)
              : (_bHX0 + _bHSt.length * _bHsp);
            // 水平直线：junction → 最后一站
            var bHLine = document.createElementNS(svgNS, "line");
            bHLine.setAttribute("x1", _bHX0); bHLine.setAttribute("y1", _bHY0);
            bHLine.setAttribute("x2", _bHxLast); bHLine.setAttribute("y2", _bHY0);
            bHLine.setAttribute("stroke", bColor);
            bHLine.setAttribute("stroke-width", "3");
            bHLine.setAttribute("stroke-opacity", "0.6");
            trackLayer.appendChild(bHLine);
            // 支线站横排
            for (var bsiH = 0; bsiH < _bHSt.length; bsiH++) {
              var _bHx = (_bSideNow === "left")
                ? (_bHX0 - (bsiH + 1) * _bHsp)
                : (_bHX0 + (bsiH + 1) * _bHsp);
              var _bTxH = (_bSideNow === "left") ? (_bHx - 10) : (_bHx + 10);
              _renderStationNode(stationLayers, svgNS, {
                x: _bHx, y: _bHY0, stationId: _bHSt[bsiH], isJunction: false, color: bColor,
                si: bsiH, side: _bSideNow, geometry: geometry, isMobileView: isMobileView,
                svgW: svgW, svgH: svgH, transferMap: transferMap, stationCoords: stationCoords,
                labelRegistry: stationRenderRegistry,
                rS: _rS,
                tx: _bHx,
                ty: branchLayout.labels[_bHSt[bsiH]].above
                  ? _bHY0 - 40 - (branchLayout.labels[_bHSt[bsiH]].lines.length - 1) * 18 : _bHY0 + 40,
                anchor: 'middle', labelLines: branchLayout.labels[_bHSt[bsiH]].lines,
                horizontalBranch: true, labelAbove: branchLayout.labels[_bHSt[bsiH]].above,
                skipTx: false
              });
            }
          } else {
            // ---- 竖列（现状：水平直 stub + 垂直列）----
            var bx = (_bSideNow === "left")
              ? (stationCoords[junctionIdx].x - _stubL6 - _bColNow * _colW6)
              : (stationCoords[junctionIdx].x + _stubR6 + _bColNow * GEOM.BRANCH_COL_W);
            var by = stationCoords[junctionIdx].y;
            var branchTop = by - 20;
            // junction 行水平直 stub（不拐弯）；左侧穿 junction 站名带问题由
            // junction 站名朝右解决（_isBranchJunction，见主干站渲染）
            var _connY = by;
            
            // 支线（接续行水平直 stub，拐角圆角）。
            var branchLine = document.createElementNS(svgNS, "path");
            var _brx = stationCoords[junctionIdx].x;
            var _bry = _connY;
            var _brx2 = bx;
            var _bry2 = _connY;
            var _brR = 8; // 圆角半径
            // L 形：从 junction 水平→拐角→垂直（向下）
            var _brDir = (bx > stationCoords[junctionIdx].x) ? 1 : -1; // 右/左
            var _brSign = (bx > stationCoords[junctionIdx].x) ? 1 : -1;
            branchLine.setAttribute("d",
              "M " + _brx + " " + _bry +
              " L " + (_brx2 - _brR * _brDir) + " " + _bry +
              " Q " + _brx2 + " " + _bry + " " + _brx2 + " " + (_bry + _brR) +
              " L " + _brx2 + " " + _bry2);
            branchLine.setAttribute("stroke", bColor);
            branchLine.setAttribute("stroke-width", "5");
            branchLine.setAttribute("fill", "none");
            branchLine.setAttribute("stroke-opacity", "0.6");
            trackLayer.appendChild(branchLine);
            
            // 支线竖线。
            var branchSp = geometry.sp || 24;
          var branchVLine = document.createElementNS(svgNS, "line");
          branchVLine.setAttribute("x1", bx);
          branchVLine.setAttribute("y1", _connY);
          branchVLine.setAttribute("x2", bx);
          // 竖线只画到最后一个支线站（原 branchTop+站数×sp 从 junction 上一档起、
          // 含 junction 全站计数，避免跳过 junction 或首站同行造成竖线多出。
          // 2×sp-20px 空段：丸ノ内方南町 308→462 多 96px 空线）——精确计数独有站，
          // 终点 = 最后一站 y = junction 行 + (独有站数-1)×sp
          var _vOwn = 0;
          if (branch.stations) {
            for (var _vi7 = 0; _vi7 < branch.stations.length; _vi7++) {
              if (branch.stations[_vi7] !== _jFind7.station) _vOwn++;
            }
          }
          branchVLine.setAttribute("y2", _connY + Math.max(0, _vOwn - 1) * branchSp);
          branchVLine.setAttribute("stroke", bColor);
          branchVLine.setAttribute("stroke-width", "5");
          branchVLine.setAttribute("stroke-opacity", "0.6");
          trackLayer.appendChild(branchVLine);
          
          // Branch stations（主線と同じ _renderStationNode で統一描画——スタイルは完全に同一）
          if (branch.stations) {
            var _bTx = (_bSideNow === "left") ? (bx - 10) : (bx + 10);
            var _bAnchor = (_bSideNow === "left") ? "end" : "start";
            // junction 在支线站表末位（我孫子支线）→ 反转站序从 junction 向下延伸
            // 竖列跳过 junction 站（主干已绘）——支线只画独有站，junction 不重复
            // 第一站与 junction 同行（用户："岔路的第一个站和出去的站在一行"）——
            // 岔路第一站水平叉出与岔路点同行，再竖列向下（原 _bK2=1 起于 junction 下方一档）
            var _rStations = (_jAt === branch.stations.length - 1) ? branch.stations.slice().reverse() : branch.stations;
            var _bK2 = 0;
            for (var bsi = 0; bsi < _rStations.length; bsi++) {
              if (_rStations[bsi] === _jFind7.station) continue;
              var bsy = by + _bK2 * branchSp;
              _renderStationNode(stationLayers, svgNS, {
                x: bx, y: bsy, stationId: _rStations[bsi], isJunction: false, color: bColor,
                si: bsi, side: _bSideNow, geometry: geometry, isMobileView: isMobileView,
                svgW: svgW, svgH: svgH, transferMap: transferMap, stationCoords: stationCoords,
                labelRegistry: stationRenderRegistry,
                rS: _rS,
                tx: _bTx, ty: bsy, anchor: _bAnchor, // 支线站名避让 r=7 圆点 + 垂直居中（左侧支线镜像朝左）
                skipTx: false
              });
              _bK2++;
            }
          }
          
          // 竖列支线名放回 SVG 层，显示在支线远端旁边（短名，去掉主线名前缀）
          var _fullName = (window.RailwayDB && typeof window.RailwayDB.resolveLineName === "function") ? window.RailwayDB.resolveLineName(branch.id, window.currentLang) : (branch.nameJa || branch.name);
          // 支线名称已不含括号，优先用所属主线的名称提取短标题。
          // 兼容旧式括号名称，避免缩窄 SVG 内的支线文字空间。
          var _shortName = _fullName;
          var _m = _fullName.match(/[（(](.+?)[）)]/);
          if (_m) {
            _shortName = _m[1];
          } else if (branch.branchOf && window.RailwayDB && typeof window.RailwayDB.resolveLineName === "function") {
            var _parentLineName = window.RailwayDB.resolveLineName(branch.branchOf, window.currentLang) || "";
            if (_parentLineName && _fullName.indexOf(_parentLineName) === 0) {
              var _suffixName = _fullName.slice(_parentLineName.length).replace(/^[・·\s]+/, "");
              if (_suffixName) _shortName = _suffixName;
            }
          }
          var _bNameEl = document.createElementNS(svgNS, "text");
          _bNameEl.setAttribute("x", bx);
          var _branchEndStation = (_rStations || []).filter(function(station) {
            return station !== _jFind7.station;
          }).slice(-1)[0];
          var _noteOffset = _branchTerminalCaptionOffset(transferMap[_branchEndStation]);
          _bNameEl.setAttribute("y", _connY + Math.max(0, _vOwn - 1) * branchSp + _noteOffset);
          _bNameEl.setAttribute("text-anchor", "middle");
          _bNameEl.setAttribute("font-size", "10");
          _bNameEl.setAttribute("fill", bColor);
          _bNameEl.setAttribute("font-weight", "600");
          _bNameEl.setAttribute("font-family", "inherit");
          _bNameEl.textContent = _shortName;
          stationInfoLayer.appendChild(_bNameEl);
          } // else（竖列现状）闭合
        }
      }
      
      svg.appendChild(staticLayer);

    // === 列车层 ===
      var trainLayer = document.createElementNS(svgNS, "g");
      trainLayer.setAttribute("class", "train-layer");
      trainLayer.setAttribute("transform", geometry.canvasTransform);
      svg.appendChild(trainLayer);
      
      // 替换内容。
      // 容器内に"時刻表で推定中"等の提示を出さない——推定データはページ読込と
      // 一緒に初期化し、容器内はリアルタイムと同じ見た目に。データ出所の注記は容器外
      // （tp-est-note、下・中央）に置く。
      el.innerHTML = '<div class="tp-map-wrap"></div>';
      var _mapWrap = el.querySelector('.tp-map-wrap');
      // Geometry stays fixed; user gestures transform only the nested camera.
      // 竖列支线名 HTML 图注（SVG 上方，线色着色，多条以 · 分隔）
      if (_branchNoteItems.length) {
        var _bnEl = document.createElement('div');
        _bnEl.setAttribute('class', 'branch-note');
        for (var _nbI = 0; _nbI < _branchNoteItems.length; _nbI++) {
          var _spEl = document.createElement('span');
          _spEl.style.color = _branchNoteItems[_nbI].color;
          _spEl.textContent = _branchNoteItems[_nbI].name;
          _bnEl.appendChild(_spEl);
          if (_nbI < _branchNoteItems.length - 1) _bnEl.appendChild(document.createTextNode(' · '));
        }
        _mapWrap.appendChild(_bnEl);
      }
      _mapWrap.appendChild(svg);
      // 将过长站名限制在可用宽度内（行业做法：
      // 缩小，不裁剪）。挂载后运行以确保 getBBox 准确。
      try {
        var _clampTexts = staticLayer.querySelectorAll("text[data-clamp-avail]");
        for (var _cI = 0; _cI < _clampTexts.length; _cI++) {
          var _ct = _clampTexts[_cI];
          var _av = parseFloat(_ct.getAttribute("data-clamp-avail"));
          var _f = parseFloat(_ct.getAttribute("font-size"));
          var _t = _ct.textContent || "";
          var _cjkN = (_t.match(/[\u4e00-\u9fff\u3040-\u30ff]/g) || []).length;
          var _othN = _t.length - _cjkN;
          var _estW = (_cjkN * 1.1 + _othN * 0.55) * _f;
          var _bb = _ct.getBBox();
          // 只有 getBBox 与估算一致时才信任它；否则
          // 字体可能尚未加载，测量宽度不可靠。
          var _useW = (_bb.width > 0 && Math.abs(_bb.width - _estW) < _estW * 0.5) ? _bb.width : _estW;
          if (_useW > _av) {
            // 下限 12→10——六形环左列上方站名（环段尾，朝环内）在 58px 环内窄空间
            // 需 10px 才能完整放下（5 字=55px，恰好贴右列圆点左缘不重叠）。
            // 左列上方已改朝左（不再走该窄空间）；下限 10px 仍对光丘尾避让后
            // 与左列站名带重叠的站有效（落合南長崎 5 字≈11.5px）。
            var _nf = Math.max(10, _f * _av / _useW);
            _ct.setAttribute("font-size", String(Math.round(_nf * 10) / 10));
          }
        }
      } catch (e2) { /* clamp is a best-effort readability guard */ }
      
      // Commit one stable viewport after station labels/transfer badges
      // have their final static sizes. Do NOT include the train-layer:
      // empty/loaded/timetable/realtime states must share the same L1 bounds.
      _commitStaticRouteViewport(svg, staticLayer, geometry);
      if (window.TrainMapGestures) window.TrainMapGestures.attach(svg);
      updateTrainLayer(svg, positions, stationCoords, lineId, displayLine, geometry);
      updateRunningInfo(el, positions);
      updateEstimatedNote(el, lineId, positions);
      
    } catch(e) {
      el.innerHTML = '<div class="tp-no-data">Error: ' + escapeHtml(e.message) + '</div>';
    } finally {
      _trainRenderSamples.push({ lineId: lineId, kind: renderKind, ms: Math.round((performance.now() - startedAt) * 10) / 10,
        trains: typeof positions !== 'undefined' ? positions.length : 0, at: Date.now() });
      if (_trainRenderSamples.length > 40) _trainRenderSamples.shift();
    }
  }

  /**
   * 使用 DOM 差分更新列车图层（更新已有节点、创建新节点、移除缺失节点）
   * 使用缓存的 stationCoords，不重新计算几何坐标
   */
  // 环线沿曲线移动——根据周长位置 pos 算 x/y 坐标（矩形周长）
  function _loopPosToXY(pos, rect) {
    var cx = rect.cx, cy = rect.cy, halfW = rect.halfW, halfH = rect.halfH;
    var rectW = rect.rectW, rectH = rect.rectH, perimeter = rect.perimeter;
    var p = ((pos % perimeter) + perimeter) % perimeter;
    var lx, ly;
    if (p < rectW) { lx = cx - halfW + p; ly = cy - halfH; }
    else if (p < rectW + rectH) { lx = cx + halfW; ly = cy - halfH + (p - rectW); }
    else if (p < 2 * rectW + rectH) { lx = cx + halfW - (p - rectW - rectH); ly = cy + halfH; }
    else { lx = cx - halfW; ly = cy + halfH - (p - 2 * rectW - rectH); }
    return { x: lx, y: ly };
  }

  function _setTrainIconPosition(icon, px, py, p, lineId, isLoop) {
    if (!icon) return;
    var unit = _trainUnitContainer(icon);
    // The group is the ONLY world-space position for an ordinary train.
    // Image load, a new PNG, and a later RAF cannot leave the caption at
    // an earlier station's Y coordinate.
    if (unit) unit.setAttribute('transform', 'translate(' + px + ',' + py + ')');
    var x = unit ? -7 : px - 7;
    var y = unit ? -9 : py - 9;
    var tag = String(icon.tagName || '').toLowerCase();
    if (tag === 'circle') {
      // 即使车型未知，来源已验证的实时位置仍保持可见；
      // 这里显示的是中性位置圆点，而不是车辆图片。
      icon.setAttribute('cx', String(unit ? 0 : px));
      icon.setAttribute('cy', String(unit ? 0 : py));
      icon.removeAttribute('transform');
      icon.setAttribute('data-marker-raw-transform', '');
      return;
    }
    if (tag === 'text') {
      icon.setAttribute('x', String(unit ? 0 : px));
      icon.setAttribute('y', String(unit ? 0 : py));
      icon.removeAttribute('transform');
      icon.setAttribute('data-marker-raw-transform','');
      return;
    }
    if (tag === 'image') {
      icon.setAttribute('x', String(x));
      icon.setAttribute('y', String(y));
      var direction = p && p.railDirection || '';
      if (!isLoop && direction.indexOf('Outbound') >= 0) {
        icon.setAttribute('transform', unit
          ? 'scale(-1, 1)'
          : 'translate(' + px + ', ' + py + ') scale(-1, 1) translate(' + (-px) + ', ' + (-py) + ')');
      } else {
        icon.removeAttribute('transform');
      }
      icon.setAttribute('data-marker-raw-transform', icon.getAttribute('transform') || '');
      return;
    }

  }

  function _removeTrainLabels(trainLayer, trainUid) {
    var labels = trainLayer.querySelectorAll('[data-train-label-for="' + String(trainUid).replace(/"/g, '') + '"]');
    for (var i = 0; i < labels.length; i++) labels[i].parentNode.removeChild(labels[i]);
  }

  function _trainMarkerDomKind(spec) {
    return spec && spec.kind === "vehicle"
      ? (spec.planned === true ? "planned" : "vehicle") : "unresolved";
  }

  function _trainMarkerSpec(p, trainUid, lineId) {
    // TrainVehicle 是 PNG/中性标记的唯一选择权威。本模块
    // 只负责展示几何、碰撞布局和图片加载恢复。
    // 实际绘制线路是独立的权限边界；不要让来源对象在另一条图面线路
    // 上重放旧 PNG。仅传给统一选择器，不能修改原始列车记录或车型结果。
    var selectionPosition = p && lineId
      ? Object.assign({}, p, { displayLineId: lineId }) : p;
    var artworkFailed = _isTrainArtworkFailureActive(trainUid, selectionPosition);
    var artwork = window.TrainVehicle &&
      typeof window.TrainVehicle.selectMarkerArtwork === "function"
      ? window.TrainVehicle.selectMarkerArtwork(selectionPosition, artworkFailed)
      : { kind: "unresolved", iconSrc: "" };
    var hasImage = artwork.kind === "vehicle" && !!artwork.iconSrc;
    return {
      kind: hasImage ? "vehicle" : "unresolved",
      iconSrc: hasImage ? artwork.iconSrc : "",
      planned: hasImage && artwork.planned === true,
      illustrative: hasImage && artwork.illustrative === true &&
        artwork.representativeOnly === true &&
        artwork.actualVehicleConfirmed === false,
      illustrationModel: hasImage && artwork.illustrationModel ? String(artwork.illustrationModel) : "",
      illustrationRole: hasImage ? String(artwork.illustrationRole || "") : "",
      // Unverified models retain a neutral position marker; never synthesize
      // a rolling-stock picture from a train number or candidate family.
      compact: !hasImage,
      // DOM-only rejection reason: makes source/date/formation gate visible
      // when a valid train still draws a neutral circle.
      unresolvedReason: !hasImage
        ? (String(artwork.reason || "") ||
            (window.TrainVehicle &&
             typeof window.TrainVehicle.diagnoseTobuIsesakiArtwork === "function"
              ? window.TrainVehicle.diagnoseTobuIsesakiArtwork(selectionPosition,artworkFailed)
              : ""))
        : "",
      className: hasImage && artwork.planned === true ? "train-icon planned" :
        (p && p.estimated === true ? "train-icon estimated" : "train-icon")
    };
  }

  // ODPT location evidence must never be confused with evidence that
  // this B/C train uses the single illustrative E231-500 image. Announce
  // its reference-only scope in the accessible text, not as actual stock.
  function _trainMarkerAccessibleDescription(p, lineId, spec) {
    var title = _trainMarkerTitle(p, lineId);
    if (!spec || spec.illustrative !== true) return title;
    var lang = window.currentLang || "ja";
    if(spec.illustrationRole==="tobu-branch-working-fleet-example-not-observed") {
      // The numbered A/B/C/nD timetable service uses a rotating shared
      // 10000/10030 fleet. Its representative PNG is NOT today's vehicle.
      var tobuExample=String(spec.illustrationModel||"");
      var tobuNote=/^zh/.test(lang)
        ?"车辆示意："+tobuExample+"（10000／10030型轮换运用；当天车型及编组未确认）"
        :lang==="en"
        ?"Fleet illustration: "+tobuExample+" (10000/10030 workings rotate; today's actual carset unknown)"
        :lang==="ko"
        ?"차량 참고 그림: "+tobuExample+" (10000/10030형 순환 운용; 당일 실제 편성 미확인)"
        :"車両参考図："+tobuExample+"（10000・10030型の共通運用・当日の実車編成未確認）";
      return title ? title+" · "+tobuNote : tobuNote;
    }
    if((lineId==="Tojo"||lineId==="Ogose") &&
       spec.illustrationRole==="tojo-ogose-fixed-png-not-observed-trainset" &&
       spec.illustrationModel) {
      var single=String(spec.illustrationModel);
      var refNote=/^zh/.test(lang)?"显示PNG："+single+"（计划车辆示意；当天实车未确认）":
        lang==="en"?"Displayed PNG: "+single+" (scheduled fleet illustration; actual carset unconfirmed)":
        lang==="ko"?"표시 PNG: "+single+" (운행 예시, 실제 편성 미확인)":
        "表示PNG："+single+"（運行参考図・当日の実車未確認）";
      return title ? title+" · "+refNote : refNote;
    }
    // A dated community report can choose a single REFERENCE picture
    // on a uniquely joined realtime position, not confirm the real trainset.
    var kwPlan=p&&p.datedVehicleDisplayReference;
    var kwReport=kwPlan&&kwPlan.sqlPublishedNumberFleetReference;
    if(lineId==="Kawagoe"&&p&&p.positionLineId==="Kawagoe"&&
       p.positionSource==="realtime-api"&&kwReport&&
       kwReport.reportedMappingLevel==="dated_train_number_observation"&&
       kwReport.reportedEvidenceGrade==="C"&&
       kwReport.reportedTrainNumber===p.trainNumber&&
       kwPlan.serviceDate===p.serviceDate&&kwReport.reportedModel){
      var kwModel=String(kwReport.reportedModel);
      var kwNote=/^zh/.test(lang)?"车辆参考图："+kwModel+"（当日第三方C级报告；实车未确认）"
        :lang==="en"?"Vehicle illustration: "+kwModel+" (dated community report, grade C; actual set unconfirmed)"
        :lang==="ko"?"차량 참고 이미지: "+kwModel+" (해당일 제3자 C등급 기록, 실제 편성 미확인)"
        :"車両参考図："+kwModel+"（当日の第三者C級報告、実車未確認）";
      return title?title+" · "+kwNote:kwNote;
    }
    var osaka221 = lineId==="OsakaHigashi"&&
      p.sqlPublishedNumberFleetReference&&
      p.sqlPublishedNumberFleetReference.source===
        "sql-jrwest-osaka-higashi-2611-source-family"&&
      p.sqlPublishedNumberFleetReference.candidateModels&&
      p.sqlPublishedNumberFleetReference.candidateModels.join("|")==="221系";
    var fuk321 = lineId==="Fukuchiyama"&&p&&
      p.sqlPublishedNumberFleetReference&&
      ["sql-jrwest-fukuchiyama-2611-historical-fleet-reference",
       "sql-jrwest-fukuchiyama-2611-official-7025-friday"]
        .includes(p.sqlPublishedNumberFleetReference.source);
    var fukKounotori=fuk321&&
      /^(30|70)[0-9]{2}MH?$/.test(String(p.trainNumber||""))&&
      /(?:\.|:)LimitedExpress$/.test(String(p.trainType||""));
    var note = fukKounotori
      ? (/^zh/.test(lang)?"车辆图片：287系仅是287／289系特急车型候选中的示意，不代表当日实际车辆或编组":
          lang==="en"?"287-series artwork is only an example of the 287/289 Kounotori fleet; actual trainset unconfirmed":
          lang==="ko"?"287계 이미지는 287/289계 특급 운용 참고용이며 당일 실제 편성은 미확인":
          "287系の画像は287・289系『こうのとり』の参考例で、当日の実車形式・編成は未確認")
      : fuk321
      ? (/^zh/.test(lang)?"车辆图片：321系仅为207／321系共通运用示意，实际车型和编组未确认":
          lang==="en"?"321-series artwork is only an example of the 207/321 fleet; actual stock unconfirmed":
          lang==="ko"?"321계 이미지는 207/321계 운용 참고용이며 실제 편성은 미확인":
          "321系の画像は207・321系共通運用の参考例で、実際の形式・編成は未確認")
      : osaka221
      ? (/^zh/.test(lang)?"车辆图片：221系车型示意，实际编组未确认":
         lang==="en"?"Vehicle artwork: 221 series example; actual set unconfirmed":
         "車両画像：221系の参考図、実際の編成未確認")
      : /^zh/.test(lang)
      ? "车辆图片：线路代表图，实际车型及编组未确认"
      : lang === "en"
        ? "Vehicle artwork: line illustration only; actual model and formation unconfirmed"
        : "車両画像：路線の代表図、実車形式・編成は未確認";
    return title ? title + " · " + note : note;
  }

  function _syncTrainMarkerIllustrationStatus(marker, spec) {
    if (!marker) return;
    if (spec && spec.illustrative === true) {
      marker.setAttribute("data-marker-illustrative", "mixed-line-fleet");
      // Realtime POSITION is observed; physical VEHICLE identity is not.
      marker.setAttribute("data-vehicle-unresolved", "true");
    } else {
      marker.removeAttribute("data-marker-illustrative");
      if (String(marker.tagName || "").toLowerCase() === "image")
        marker.removeAttribute("data-vehicle-unresolved");
    }
  }

  // Public identification boundary: marker spec ends before title formatting.
  // 对外身份是计划列车号，而不是车辆的
  // 运行号/编组分配。内部 ID 和 SQL 键绝不作为标签。
  // Candidate descriptions are informational and must never promote a
  // historical or route-wide fleet list into actual trainset identity.
  function _seibuCommuterCandidatesLabel(p, lineId, lang) {
    // The vehicle resolver owns candidate eligibility; SVG only formats text.
    var models = window.TrainVehicle &&
      typeof window.TrainVehicle.seibuCommuterCandidateModels === "function"
      ? window.TrainVehicle.seibuCommuterCandidateModels(p, lineId) : null;
    if (!Array.isArray(models) || !models.length) return "";
    lang = String(lang || "ja").toLowerCase();
    var prefix = /^zh/.test(lang) ? "计划车型未确认（参考）：" :
      lang === "en" ? "Scheduled model unconfirmed (reference only): " :
      lang === "ko" ? "계획 차종 미확인(참고): " :
      "計画車種未確認（参考）：";
    return prefix + models.join(" / ");
  }

  function _shonanFleetCandidatesLabel(p, lineId, lang) {
    var models = window.TrainVehicle &&
      typeof window.TrainVehicle.shonanFleetCandidateModels === "function"
      ? window.TrainVehicle.shonanFleetCandidateModels(p, lineId) : null;
    if (!Array.isArray(models) || !models.length) return "";
    lang = String(lang || "ja").toLowerCase();
    var prefix = /^zh/.test(lang) ? "计划车型未确认（湘南色参考）：" :
      lang === "en" ? "Scheduled model unconfirmed (Shonan-color reference): " :
      lang === "ko" ? "계획 차종 미확인(쇼난색 참고): " :
      "計画車種未確認（湘南色参考）：";
    return prefix + models.join(" / ");
  }

  // Display the timetable fleet mapping as a reference, separate from actual
  // train identity. Never describe a live/unknown-position train as this model.
  // Folded trains need the model already authorized by the identity resolver;
  // never copy an unverified cached name or interpret a schedule as physical proof.
  function _trainFoldExactVehicleLabel(p, lineId, lang) {
    var resolved = p && p.vehicleResolution;
    var status = p && (p.vehicleIdentityStatus || (resolved && resolved.identityStatus));
    if (!p || (p.vehiclePlan &&
        (p.vehiclePlan.source === "published-number-calendar-reference" ||
         p.vehiclePlan.source === "keiyo-shared-working-representative" ||
         p.vehiclePlan.source === "twr-shared-working-representative" ||
         p.vehiclePlan.source === "north-south-shared-working-representative" ||
         p.vehiclePlan.source === "north-south-mh-service-representative")) ||
        status !== "EXACT" || p.vehicleResolvedUpstream === false ||
        (resolved && resolved.identityStatus !== "EXACT")) return "";
    var sourceLine = String(p.vehicleResolutionLineId || (resolved && resolved.lineId) || "");
    var sources = resolved && Array.isArray(resolved.sources) ? resolved.sources : [];
    var physical = p.vehicleResolvedFromRealtime === true &&
      (sources.indexOf("official-realtime-car-number") >= 0 ||
       sources.indexOf("roster-physical-id") >= 0);
    if (lineId && sourceLine !== String(lineId) && !physical) return "";
    if (!window.TrainVehicle || typeof window.TrainVehicle.resolveCanonicalVehicle !== "function") return "";
    var canonical = window.TrainVehicle.resolveCanonicalVehicle((resolved && resolved.name) || p.vehicleType || "");
    if (!canonical || !canonical.displayName) return "";
    lang = String(lang || "ja").toLowerCase();
    // Estimated location is NOT proof of a certified scheduled vehicle.
    // Only these train-level SQL mapping levels can be named a timetable model.
    var confirmedPlan = p.estimated === true &&
      p.vehiclePlan && p.vehiclePlan.confirmed === true;
    var prefix = confirmedPlan
      ? (/^zh/.test(lang) ? "计划车型已确认（非当日实车）：" :
          lang === "en" ? "Scheduled model confirmed (not actual-day stock): " :
          lang === "ko" ? "계획 차종 확인(당일 실차 아님): " :
          "計画車種確認済み（当日の実車ではありません）：")
      : p.estimated === true
        ? (/^zh/.test(lang) ? "计划车型未确认（参考）：" :
            lang === "en" ? "Scheduled model unconfirmed (reference only): " :
            lang === "ko" ? "계획 차종 미확인(참고): " :
            "計画車種未確認（参考）：")
      : physical
        ? (/^zh/.test(lang) ? "已确认实际车型：" :
            lang === "en" ? "Physically confirmed model: " :
            lang === "ko" ? "실차 확인 차종: " :
            "実車確認済み車種：")
        : (/^zh/.test(lang) ? "车型映射参考（实车未独立确认）：" :
            lang === "en" ? "Mapped model (physical stock unverified): " :
            lang === "ko" ? "차종 매핑 참고(실차 미확인): " :
            "車種対応参考（実車未確認）：");
    return prefix + canonical.displayName;
  }

  function _trainFleetPlanLabel(p, lineId, lang) {
    if (!p) return "";
    // Fixed Tojo/Ogose PNGs replace all multi-model candidate labels.
    // Only the verified physical identity or labelled reference PNG is shown.
    if(lineId==="Tojo"||lineId==="Ogose")return "";
    var plan = p.vehiclePlan || (p.vehicleResolution && p.vehicleResolution.vehiclePlan);
    if (lineId === "Kawagoe" && p.timetableDateVerified === true) {
      var kawagoeRef = p.sqlPublishedNumberFleetReference || {};
      if (kawagoeRef.source === "sql-jreast-kawagoe-2611-shared-fleet" &&
          kawagoeRef.referenceOnly === true &&
          kawagoeRef.actualVehicleConfirmed === false &&
          kawagoeRef.singleModelUnresolved === true &&
          kawagoeRef.authorizesPNG === false &&
          Array.isArray(kawagoeRef.candidateModels) &&
          kawagoeRef.candidateModels.join("|") === "E231系3000番台|209系3500番台") {
        lang = String(lang || "ja").toLowerCase();
        var kwNo=String(p.trainNumber||"");
        var kwModel=String(kawagoeRef.reportedModel||"");
        var kwFormation=String(kawagoeRef.reportedFormation||"");
        var kwReported=kwModel&&
          ["E231系3000番台","209系3500番台"].indexOf(kwModel)>=0&&
          kawagoeRef.reportedEvidenceGrade==="C"&&
          kawagoeRef.reportedIsActual===false&&
          kawagoeRef.reportedMappingLevel==="dated_train_number_observation"&&
          kawagoeRef.reportedTrainNumber===kwNo&&
          kawagoeRef.reportedEvidenceUrl===
            "https://loo-ool.com/rail/W/00/"+
            String(p.serviceDate||"").replace(/-/g,"")+"/";
        if(kwReported){
          if(/^zh/.test(lang))return "车次"+kwNo+" · 当日报告车型："+kwModel+
            "（"+kwFormation+"，第三方记录，实车未确认）";
          if(lang==="en")return "Train "+kwNo+" · reported model: "+kwModel+
            " ("+kwFormation+"; community report, actual consist unconfirmed)";
          if(lang==="ko")return "열차 "+kwNo+" · 당일 보고 차종: "+kwModel+
            " ("+kwFormation+"; 제3자 기록, 실제 편성 미확인)";
          return "列車"+kwNo+" · 当日報告車種："+kwModel+
            "（"+kwFormation+"・第三者記録、実車未確認）";
        }
        if (/^zh/.test(lang)) return "车型候选：E231系3000番台 / 209系3500番台（共通运用，实车未确认）";
        if (lang === "en") return "Candidate models: E231-3000 / 209-3500 (shared duties; actual consist unconfirmed)";
        if (lang === "ko") return "후보 차종: E231계 3000번대 / 209계 3500번대 (공통 운용, 실제 편성 미확인)";
        return "候補車種：E231系3000番台 / 209系3500番台（共通運用・実車未確認）";
      }
    }
    if (lineId === "SotetsuJRDirect" &&
        window.JREastSotetsuJRDirectNumbers2611 &&
        typeof window.JREastSotetsuJRDirectNumbers2611.match === "function") {
      var sotetsuNumber = window.JREastSotetsuJRDirectNumbers2611.match(
        Object.assign({}, p, {displayLineId: lineId}));
      if (sotetsuNumber) {
        lang = String(lang || "ja").toLowerCase();
        var number = String(sotetsuNumber.trainNumber || p.trainNumber || "");
        var bands = (sotetsuNumber.numberBands || []).join(" / ");
        var working = p.sqlPublishedNumberFleetReference || {};
        var workingModel = String(working.plannedModel || "");
        if (p.timetableDateVerified === true &&
            working.plannedModelMappingLevel === "source_single_type_candidate" &&
            working.plannedModelEvidenceGrade === "C" &&
            working.plannedModelIsActual === false &&
            (workingModel === "E233系7000番台" || workingModel === "相鉄12000系")) {
          if (/^zh/.test(lang)) return "官方列车号：" + number +
            " · 计划车型：" + workingModel + "（运用表参考，实车未确认）";
          if (lang === "en") return "Official train no. " + number +
            " · planned model: " + workingModel +
            " (published working reference; actual consist unconfirmed)";
          if (lang === "ko") return "공식 열차번호 " + number +
            " · 예정 차종: " + workingModel +
            " (운용표 참고, 실제 편성 미확인)";
          return "公式列車番号：" + number +
            " · 計画車種：" + workingModel + "（運用表参考・実車未確認）";
        }
        var candidates = "E233系7000番台 / 相鉄12000系";
        if (/^zh/.test(lang)) return "官方列车号：" + number +
          "（号段：" + bands + "；车型候选：" + candidates + "，实体车号/编组未确认）";
        if (lang === "en") return "Official train number: " + number +
          " (number bands: " + bands + "; candidate models: E233-7000 / Sotetsu 12000; physical car number and formation unconfirmed)";
        if (lang === "ko") return "공식 열차번호: " + number +
          " (번호대: " + bands + "; 후보 차종: E233계 7000번대 / 소테쓰 12000계, 실차 번호·편성 미확인)";
        return "公式列車番号：" + number +
          "（番号帯：" + bands + "；候補車種：E233系7000番台 / 相鉄12000系、実車番号・編成は未確認）";
      }
    }
    // Respect the C-number 207/321 subgroup rather than displaying all
    // four candidates from the historical, route-wide SQL reference.
    var fukIndex=window.TrainNumberPngRanges,
      fukGroup=lineId==="Fukuchiyama"&&
        p.vehicleIdentityStatus!=="EXACT"&&fukIndex&&
        typeof fukIndex.verifyFukuchiyamaSourceFleet==="function"
        ?fukIndex.verifyFukuchiyamaSourceFleet(p):null;
    if(fukGroup&&fukGroup.numberBand==="holiday-2774M-2025-207-321-working"){
      lang=String(lang||"ja").toLowerCase();
      return (/^zh/.test(lang)?"2774M：2025年共通运用参考（2026年实车未确认）：":
        lang==="en"?"2774M: 2025 shared-duty fleet (2026 actual stock unknown): ":
        lang==="ko"?"2774M: 2025년 공통운용 참고(2026년 실차 미확인): ":
        "2774M：2025年共通運用参考（2026年の実車未確認）：")+
        fukGroup.candidateModels.join(" / ");
    }
    if(fukGroup&&fukGroup.numberBand==="local-1100-1299-C"){
      lang=String(lang||"ja").toLowerCase();
      return (/^zh/.test(lang)?"普通列车号段候选（非实车确认）：":
        lang==="en"?"Local number-band candidates (unconfirmed): ":
        lang==="ko"?"보통열차 번호대 후보 차종(실차 미확인): ":
        "普通列車番号帯の候補車種（実車未確認）：")+
        fukGroup.candidateModels.join(" / ");
    }
    // Two Osaka->Shin-Osaka Mahoroba published excerpts are 683-series
    // three-car specials. The existing 683 PNGs are other liveries and are
    // deliberately NOT mapped. Neither "安寧" nor "悠久" is a dated carset
    // assignment based on this source.
    var special=p.sqlPublishedNumberFleetReference;
    if(lineId==="OsakaHigashi"&&p.positionLineId===lineId&&
       p.estimated===true&&p.positionSource==="supabase-train-run"&&
       p.vehicleIdentityStatus!=="EXACT"&&p.vehicleResolvedUpstream!==true&&
       /^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(String(p.serviceDate||""))&&
       special&&special.source===
         "sql-jrwest-osaka-higashi-2611-mahoroba-two-stop"&&
       special.segmentScope==="osaka_shin_osaka_only"&&
       special.referenceOnly===true&&special.actualVehicleConfirmed===false&&
       special.authorizesPNG===false&&
       special.carCount===3&&special.stopClocksVerified===true&&
       Array.isArray(special.candidateModels)&&
       special.candidateModels.join("|")==="683系"&&
       plan&&plan.status==="FLEET_REFERENCE"&&plan.confirmed===false&&
       Array.isArray(plan.models)&&plan.models.join("|")==="683系"){
      lang=String(lang||"ja").toLowerCase();
      return /^zh/.test(lang)
        ?"特急まほろば：683系（3辆，安寧／悠久实际编组未确认；暂无对应涂装图片）"
        :lang==="en"
        ?"Mahoroba limited express: 683 series (3 cars; actual livery/formation unconfirmed; image unavailable)"
        :lang==="ko"
        ?"마호로바 특급: 683계 (3량, 실제 도장·편성 미확인, 이미지 없음)"
        :"特急まほろば：683系（3両、安寧／悠久の実際の編成未確認・専用画像なし）";
    }
    // Osaka Higashi scheduled 221 series is line-fleet evidence, not an
    // observed N/NA/NB carset. The N library image is a representative
    // 221-series cab, never the formation assigned to this train.
    var osakaFleet=p.sqlPublishedNumberFleetReference;
    if(lineId==="OsakaHigashi"&&p.positionLineId===lineId&&
       p.vehicleIdentityStatus!=="EXACT"&&p.vehicleResolvedUpstream!==true&&
       p.estimated===true&&p.positionSource==="supabase-train-run"&&
       /^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(String(p.serviceDate||""))&&
       osakaFleet&&osakaFleet.source==="sql-jrwest-osaka-higashi-2611-source-family"&&
       osakaFleet.referenceOnly===true&&
       osakaFleet.actualVehicleConfirmed===false&&
       osakaFleet.authorizesPNG===false&&
       Array.isArray(osakaFleet.candidateModels)&&
       osakaFleet.candidateModels.join("|")==="221系"&&
       plan&&plan.status==="FLEET_REFERENCE"&&
       Array.isArray(plan.models)&&plan.models.join("|")==="221系"&&
       plan.confirmed===false){
      var cars=osakaFleet.publicTrainType==="DirectRapid"?"8":
        osakaFleet.publicTrainType==="Local"?"6":"";
      if(cars){
        lang=String(lang||"ja").toLowerCase();
        return /^zh/.test(lang)?"线路车型：221系（"+cars+"辆，实际编组未确认）":
          lang==="en"?"Line fleet: 221 series ("+cars+" cars; actual set unconfirmed)":
          lang==="ko"?"노선 차량: 221계 ("+cars+"량, 실제 편성 미확인)":
          "路線車両：221系（"+cars+"両、実際の編成未確認）";
      }
    }
    // 米坂線: image is a KiHa110 family example only after JR 2611
    // rail-number/station/date proof. Never label a replacement bus or
    // unverified physical trainset with a railway formation.
    if(lineId==="Yonezawa"&&window.JREastYonezawaNumberIndex202611){
      var yone=window.JREastYonezawaNumberIndex202611;
      var yoneRef=yone.resolve(Object.assign({},p,{displayLineId:lineId}));
      if(yoneRef){
        lang=String(lang||"ja").toLowerCase();
        var yonePrefix=/^zh/.test(lang)?"铁路车辆参考（实际编组未确认）：":
          lang==="en"?"Rail fleet illustration (consist unverified): ":
          lang==="ko"?"철도 차량 참고(실제 편성 미확인): ":
          "鉄道車両参考（実際の編成未確認）：";
        return yonePrefix+yoneRef.illustrationModel;
      }
    }
    // Yamagata 2026: distinguish a public operating REFERENCE from a
    // scheduled physical consist. Remaining 701/719/E723 mixed workings
    // have no independently verified dated model; show candidates in text
    // but do not choose a speculative image.
    if(lineId==="Yamagata" && window.JREastYamagataNumberIndex202611){
      var yam=window.JREastYamagataNumberIndex202611;
      var yProof=yam.verify(Object.assign({},p,{displayLineId:lineId}));
      if(yProof){
        var yIllustration=yam.resolve(Object.assign({},p,{displayLineId:lineId}));
        lang=String(lang||"ja").toLowerCase();
        if(yIllustration){
          var prefix=/^zh/.test(lang)?"车型运用参考（当日实车未确认）：":
            lang==="en"?"Observed fleet reference (not today's consist): ":
            lang==="ko"?"차종 운용 참고(당일 실차 미확인): ":
            "車種運用参考（当日の実車未確認）：";
          return prefix+yIllustration.illustrationModel;
        }
        var unknownPrefix=/^zh/.test(lang)?"车型候选（单车次未核实）：":
          lang==="en"?"Mixed-fleet candidates (trainset unknown): ":
          lang==="ko"?"차종 후보(해당 열차 미확인): ":
          "車種候補（列車別運用未確認）：";
        return unknownPrefix+yam.candidates.join(" / ");
      }
    }
    // 羽越本線: the estimator emits an UNCONFIRMED physical car identity,
    // but the source-number + planned route can authorize an illustrative
    // model. Keep the distinction visible in the folded passenger list.
    if(lineId==="Uetsu" && window.JREastUetsuNumberIndex202611 &&
       typeof window.JREastUetsuNumberIndex202611.resolve==="function"){
      var uetsuIllustration=window.JREastUetsuNumberIndex202611.resolve(
        Object.assign({},p,{displayLineId:lineId}));
      if(uetsuIllustration){
        lang=String(lang||"ja").toLowerCase();
        var uetsuPrefix=/^zh/.test(lang)
          ?"车型参考（非当日实际编组）："
          :lang==="en"?"Illustrative fleet (not actual-day stock): "
          :lang==="ko"?"차종 참고(당일 실차 미확인): "
          :"車種参考（当日の実車・編成は未確認）：";
        return uetsuPrefix+uetsuIllustration.illustrationModel;
      }
    }

    // Missing ChuoMain limited expresses and special-service references:
    // one gallery image is a planned illustration, never a physical set.
    if (lineId === "ChuoMain" && window.TrainNumberPngRanges &&
        typeof window.TrainNumberPngRanges.matchChuoMainUnmappedReference === "function") {
      var extra = window.TrainNumberPngRanges.matchChuoMainUnmappedReference(
        Object.assign({},p,{displayLineId:lineId}));
      if (extra) {
        lang=String(lang||"ja").toLowerCase();
        var prefix=/^zh/.test(lang) ? "车型参考（非当天实际编组）：" :
          lang==="en" ? "Fleet reference (actual car not confirmed): " :
          lang==="ko" ? "차종 참고(당일 실차 미확인): " :
          "車種参考（当日の実車未確認）：";
        return prefix+extra.illustrationModel;
      }
    }
    // Chuo Main regular M-only trains may be 211 or new E131-200;
    // use the stable ONE 211 PNG only as an illustration (not actual stock).
    if(lineId==="ChuoMain" && window.TrainNumberPngRanges &&
       typeof window.TrainNumberPngRanges.matchChuoMainLocalReference==="function") {
      var chuoRef=window.TrainNumberPngRanges.matchChuoMainLocalReference(
        Object.assign({},p,{displayLineId:lineId}));
      if(chuoRef) {
        lang=String(lang||"ja").toLowerCase();
        var prefix=/^zh/.test(lang)
          ? "候选车型（地图211系车头仅示意、非当天实车）："
          : lang==="en" ? "Fleet candidates (211 cab illustrative, not actual stock): "
          : lang==="ko" ? "차량 후보(지도 211계는 예시, 실제 편성 미확인): "
          : "車種候補（211系画像はイメージ・実車未確認）：";
        return prefix+chuoRef.models.join(" / ");
      }
    }
    // E-number Hachiko trains can carry either E231-3000 or 209-3500.
    // The map uses ONE illustrative E231 PNG, not the day's actual carset.
    if(lineId==="Hachiko" && window.TrainNumberPngRanges &&
       typeof window.TrainNumberPngRanges.matchHachikoSouthCandidates==="function"){
      var hachikoRef=window.TrainNumberPngRanges.matchHachikoSouthCandidates(
        Object.assign({},p,{displayLineId:lineId}));
      if(hachikoRef){
        lang=String(lang||"ja").toLowerCase();
        var hachikoPrefix=/^zh/.test(lang)
          ?"车型候选（共通运用，非当日实车）："
          :lang==="en"?"Alternative fleet (not observed stock): "
          :lang==="ko"?"공통운용 후보 차량(당일 실차 아님): "
          :"車種候補（共通運用・当日の実車ではありません）：";
        var illustrativeNote = /^zh/.test(lang)
          ? "（地图单车头为E231系示意，不代表实车）"
          : lang==="en" ? " (single E231 icon is illustrative, not actual stock)"
          : lang==="ko" ? " (지도 E231 아이콘은 예시이며 실차 미확인)"
          : "（地図のE231系車両画像はイメージ・実車未確認）";
        return hachikoPrefix+hachikoRef.models.join(" / ")+illustrativeNote;
      }
    }
    // Ito's numbered ordinary services have a scoped SQL fleet candidate,
    // not a per-day rolling-stock assignment. Show the alternatives, never
    // a guessed E231/E233/Izukyu PNG or a false EXACT classification.
    if (lineId === "Ito" &&
        (p.vehicleIdentityStatus || (p.vehicleResolution && p.vehicleResolution.identityStatus)) !== "EXACT" &&
        !(plan && plan.confirmed === true) &&
        window.TrainNumberPngRanges &&
        typeof window.TrainNumberPngRanges.matchItoFleetCandidates === "function") {
      var itoCandidates = window.TrainNumberPngRanges.matchItoFleetCandidates(
        Object.assign({}, p, {displayLineId:lineId}));
      if (itoCandidates) {
        lang = String(lang || "ja").toLowerCase();
        var isWorking = itoCandidates.source === "independent-20260314-working-reference";
        var itoPrefix = isWorking
          ? (/^zh/.test(lang) ? "车型运用参考（2026年3月编组表，非当日实车）：" :
             lang === "en" ? "Working reference (March 2026 roster, not actual-day stock): " :
             lang === "ko" ? "운용 차종 참고(2026년 3월, 당일 실제 차량 아님): " :
             "車種運用参考（2026年3月編成表・当日の実車ではありません）：")
          : (/^zh/.test(lang) ? "列车番号对应的候选车型（非当日实车）：" :
             lang === "en" ? "Train-number fleet candidates (not actual-day stock): " :
             lang === "ko" ? "열차번호별 차종 후보(당일 실제 차량 아님): " :
             "列車番号別の車種候補（当日の実車ではありません）：");
        return itoPrefix + itoCandidates.models.join(" / ") +
          (itoCandidates.substitutionPossible
            ? (/^zh/.test(lang) ? "（Resort21可能由8000系代走）" :
               lang === "en" ? " (Resort21 may be replaced by 8000 series)" :
               lang === "ko" ? " (리조트21은 8000계 대체 가능)" :
               "（リゾート21は8000系に変更の場合あり）") : "");
      }
    }
    var sharedWorkingRepresentative =
      (p.positionSource === "realtime-api" || p.estimated === true) &&
      plan && (plan.source === "keiyo-shared-working-representative" ||
        plan.source === "twr-shared-working-representative" ||
        plan.source === "north-south-shared-working-representative" ||
        plan.source === "north-south-mh-service-representative");
    var publishedLivePlan = p.positionSource === "realtime-api" &&
      plan && (plan.source === "published-number-calendar-reference" ||
        sharedWorkingRepresentative);
    if ((!publishedLivePlan && p.estimated !== true) ||
        (!publishedLivePlan &&
         (p.vehicleIdentityStatus || (p.vehicleResolution && p.vehicleResolution.identityStatus)) === "EXACT")) return "";
    // An estimated timetable train without any model evidence still has the
    // binary public result UNCONFIRMED, never an empty third status.
    if (!plan && lineId && String(p.positionLineId || "") === String(lineId)) {
      lang = String(lang || "ja").toLowerCase();
      return /^zh/.test(lang) ? "计划车型未确认" :
        lang === "en" ? "Scheduled model unconfirmed" :
        lang === "ko" ? "계획 차종 미확인" : "計画車種未確認";
    }
    if (!plan || String(plan.lineId || "") !== String(lineId || "") ||
        !Array.isArray(plan.models)) return "";
    var status = String(plan.status || "");
    if (status !== "PLANNED_MODEL" && status !== "PLANNED_CANDIDATES" &&
        status !== "FLEET_REFERENCE" && status !== "FLEET_REPRESENTATIVE") return "";
    var models = plan.models.map(function(v) { return String(v || "").trim(); }).filter(Boolean);
    if (!models.length) return "";
    lang = String(lang || "ja").toLowerCase();
    // Only two public outcomes. The model names remain useful references,
    // but a mapped/inferred plan alone does not prove timetable assignment.
    var confirmed = status === "PLANNED_MODEL" && plan.confirmed === true;
    // The official source identifies a named service and its model; this
    // certifies only the published reference, NOT physical stock today.
    var officialNamedReference = status === "PLANNED_MODEL" &&
      plan.evidenceRole === "official-train-name-and-model" &&
      !!plan.modelEvidenceUrl && !!plan.serviceName;
    var prefix = sharedWorkingRepresentative
      ? (/^zh/.test(lang) ? "线路代表车型（共通运用，非固定车型或当日实车）：" :
          lang === "en" ? "Representative line model (shared working; not assigned stock): " :
          lang === "ko" ? "노선 대표 차종(공통 운용, 실제 배정 아님): " :
          "路線代表車種（共通運用・実車や固定配車ではありません）：")
      : publishedLivePlan
      ? (/^zh/.test(lang) ? "计划车型（平日／休日时刻表参考，非当日实车）：" :
          lang === "en" ? "Published scheduled model (not actual-day stock): " :
          lang === "ko" ? "계획 차종(당일 실차 아님): " :
          "計画車種（当日の実車ではありません）：")
      : officialNamedReference
      ? (/^zh/.test(lang) ? "JR官方列车车型参考（非当日实车）：" :
          lang === "en" ? "JR official named-service model (not actual-day stock): " :
          lang === "ko" ? "JR 공식 열차 차종 참고(당일 실차 아님): " :
          "JR公式列車の車種資料（当日の実車ではありません）：")
      : confirmed
      ? (/^zh/.test(lang) ? "计划车型已确认（非当日实车）：" :
          lang === "en" ? "Scheduled model confirmed (not actual-day stock): " :
          lang === "ko" ? "계획 차종 확인(당일 실차 아님): " :
          "計画車種確認済み（当日の実車ではありません）：")
      : (/^zh/.test(lang) ? "计划车型未确认（参考）：" :
          lang === "en" ? "Scheduled model unconfirmed (reference only): " :
          lang === "ko" ? "계획 차종 미확인(참고): " :
          "計画車種未確認（参考）：");
    var alternates = sharedWorkingRepresentative && Array.isArray(plan.alternativeModels)
      ? plan.alternativeModels.map(function(model){return String(model || "").trim();})
          .filter(function(model){return !!model && models.indexOf(model) < 0;})
      : [];
    var altText = alternates.length
      ? (/^zh/.test(lang) ? "（其他可能车型：" :
         lang === "en" ? " (Other possible models: " :
         lang === "ko" ? " (다른 가능 차종: " : "（その他の候補車種：") +
        alternates.slice(0, 4).join(" / ") +
        (/^zh/.test(lang) || lang === "ja" ? "）" : ")")
      : "";
    return prefix + models.slice(0, 6).join(" / ") +
      (models.length > 6 ? (/^zh/.test(lang) ? " 等" : " …") : "") + altText;
  }

  // Uetsu's fold list can exist without a visible direction SVG label
  // after collision/overflow handling. A verified scheduled stop itinerary
  // already knows its destination; don't call that "direction unknown".
  // This supplies a DISPLAY caption only, not a vehicle or realtime claim.
  function _uetsuFoldDestinationCaption(p, lineId, lang) {
    if (lineId !== "Uetsu" || !p || p.estimated !== true ||
        p.positionSource !== "supabase-train-run") return "";
    var index = window.JREastUetsuNumberIndex202611;
    if (!index || typeof index.verify !== "function") return "";
    var proof = index.verify(Object.assign({}, p, {displayLineId:lineId}));
    if (!proof || !proof.terminus) return "";
    var station = _trainDestText(proof.terminus);
    if (!station) return "";
    lang = String(lang || "ja").toLowerCase();
    return lang === "en" ? station + " bound" :
      lang === "ko" ? station + "행" :
      /^zh/.test(lang) ? "开往" + station : station + "行き";
  }

  // The fold list only needs a model name next to service/destination.
  // Keep the full provenance in the row's tooltip/accessible label; never
  // render the separate candidates paragraph or imply a model when unknown.
  function _trainFoldModelName(fleetLabel) {
    var label = String(fleetLabel || "");
    var delimiter = label.indexOf("：");
    if (delimiter < 0) delimiter = label.indexOf(":");
    return delimiter < 0 ? "" : label.slice(delimiter + 1).trim();
  }

  function _trainMarkerTitle(p, lineId) {
    var tip = [];
    var lang = String(window.currentLang || "ja").toLowerCase();
    // A Shinkansen service name / service number is not the operating train number.
    if ((lineId === "Gono" || lineId === "Hakushin") && p &&
        p.officialNumberVerified === true &&
        p.positionSource === "supabase-train-run" &&
        (p.publishedGonoLivery || p.publishedHakushinServiceFamily) &&
        p.publishedFleetReference) {
      var fleetPrefix=/^zh/.test(lang)?"官方计划车型（非当日实车确认）：" :
        lang==="en"?"Scheduled fleet (not an observed carset): ":
        lang==="ko"?"공식 운행 계획 차종(실차 미확인): ":
        "公式運行計画の車種（実車未確認）：";
      tip.push(fleetPrefix+String(p.publishedFleetReference));
    }
    if (p && p.serviceName) {
      var namePrefix = /^zh/.test(lang) ? "列车名" :
        (lang === "en" ? "Service" : (lang === "ko" ? "열차명" : "列車名"));
      tip.push(namePrefix + " " + String(p.serviceName));
    }
    if (p && p.trainType) {
      var defs = window.TRAIN_TYPE_NAMES || {};
      var def = defs[p.trainType];
      var typeText = def ? (def[window.currentLang] || def.ja) : "";
      if (typeText) tip.push(typeText);
    }
    // Wakoshi: two independently stored source schedules with a unique
    // boundary-clock match. This is not a confirmed physical continuation;
    // keep each operator's original train ID and positional source separate.
    if (p && p.positionSource === "supabase-train-run" &&
        ["Tojo","Yurakucho","Fukutoshin"].indexOf(lineId) >= 0) {
      var handover=p.throughBoundaryReference;
      if (handover && handover.line_id===lineId &&
          ["Tojo","Yurakucho","Fukutoshin"].indexOf(handover.partner_line_id)>=0 &&
          handover.partner_line_id!==lineId &&
          handover.transfer_station==="Wakoshi" &&
          handover.same_day_continuation_verified===false &&
          handover.authorizes_position===false &&
          handover.authorizes_png===false &&
          /^[0-9]{2}[TSK]$/.test(String(handover.operation_code||"")) &&
          Number.isInteger(handover.handover_gap_minutes) &&
          handover.handover_gap_minutes>=0 && handover.handover_gap_minutes<=6) {
        var partnerNames = {Tojo:{ja:"東武東上線",zh:"东武东上线",en:"Tobu Tojo"},
          Yurakucho:{ja:"有楽町線",zh:"有乐町线",en:"Yurakucho"},
          Fukutoshin:{ja:"副都心線",zh:"副都心线",en:"Fukutoshin"}};
        var local = /^zh/.test(lang)?"zh":lang==="en"?"en":"ja";
        var partner=(partnerNames[handover.partner_line_id]||{})[local]||handover.partner_line_id;
        var label=local==="zh"?"和光市直通计划参考（非实时连续验证）：":
          local==="en"?"Wakoshi through-plan reference (not live-verified): ":
          "和光市直通計画参考（実際の直通運用は未検証）：";
        tip.push(label+partner+" · "+handover.operation_code+
          " · "+String(handover.partner_train_number||"").slice(0,36));
      }
    }
    // 让此函数在仅折叠展示的场景下保持自包含，
    // 图片解析仍使用下方的共享投影。
    var vehicle = {
      status: p && (p.vehicleIdentityStatus ||
        (p.vehicleResolution && p.vehicleResolution.identityStatus)) || "",
      // 规范解析器身份优先于兼容扁平字段，避免旧缓存标题抢先显示。
      name: p && ((p.vehicleResolution && p.vehicleResolution.name) ||
        p.vehicleType || p.trainClass) || ""
    };
    // 仅向用户公开已确认车型；运用号库候选只留在内部判定链，
    // 未确认时不显示车型文字，也不把候选 PNG 冒充为当前实车。
    // 旧数据可能只带 vehicleType/trainClass 而没有身份状态；这类自由文本
    // 不能再被当成 EXACT，否则不存在于规范车型目录的名称会泄漏到 UI。
    var resolvedLineId = String(p && (p.vehicleResolutionLineId ||
      (p.vehicleResolution && p.vehicleResolution.lineId)) || "").trim();
    var resolutionSources = p && p.vehicleResolution && Array.isArray(p.vehicleResolution.sources)
      ? p.vehicleResolution.sources : [];
    var physicalThroughEvidence = !!(p && p.vehicleResolvedFromRealtime === true &&
      (resolutionSources.indexOf("official-realtime-car-number") >= 0 ||
       resolutionSources.indexOf("roster-physical-id") >= 0));
    var titleScoped = !lineId || (resolvedLineId && resolvedLineId === lineId) ||
      physicalThroughEvidence;
    // 标签与 PNG 使用同一线路和确定身份门槛；不能出现圆点已退回未知，
    // 无障碍标题却继续宣称一辆未经确认的具体车型。
    if (!(p && p.vehiclePlan &&
          (p.vehiclePlan.source === "published-number-calendar-reference" ||
           p.vehiclePlan.source === "keiyo-shared-working-representative" ||
           p.vehiclePlan.source === "twr-shared-working-representative" ||
           p.vehiclePlan.source === "north-south-shared-working-representative" ||
           p.vehiclePlan.source === "north-south-mh-service-representative")) &&
        vehicle.status === "EXACT" && vehicle.name && titleScoped &&
        (!p || p.vehicleResolvedUpstream !== false) &&
        (!p || !p.vehicleResolution || p.vehicleResolution.identityStatus === "EXACT") &&
        window.TrainVehicle && typeof window.TrainVehicle.resolveCanonicalVehicle === "function") {
      var canonicalVehicle = window.TrainVehicle.resolveCanonicalVehicle(vehicle.name);
      if (canonicalVehicle && canonicalVehicle.displayName) {
        // A resolved model on a timetable position is planned rolling stock,
        // not confirmation of a physical train on a particular day.
        var confirmedPlan = p && p.estimated === true &&
          p.vehiclePlan && p.vehiclePlan.confirmed === true;
        var modelPrefix = confirmedPlan
          ? (/^zh/.test(lang) ? "计划车型已确认（非当日实车）：" :
              lang === "en" ? "Scheduled model confirmed (not actual-day stock): " :
              lang === "ko" ? "계획 차종 확인(당일 실차 아님): " :
              "計画車種確認済み（当日の実車ではありません）：")
          : p && p.estimated === true
            ? (/^zh/.test(lang) ? "计划车型未确认（参考）：" :
                lang === "en" ? "Scheduled model unconfirmed (reference only): " :
                lang === "ko" ? "계획 차종 미확인(참고): " :
                "計画車種未確認（参考）：")
          : (physicalThroughEvidence ? "" :
              (/^zh/.test(lang) ? "车型映射参考（实车未独立确认）：" :
                lang === "en" ? "Mapped model (physical stock unverified): " :
                lang === "ko" ? "차종 매핑 참고(실차 미확인): " :
                "車種対応参考（実車未確認）："));
        tip.push(modelPrefix + canonicalVehicle.displayName);
      }
    }
    if((lineId==="Tojo"||lineId==="Ogose") && p &&
        vehicle.status!=="EXACT" && window.TobuTojoFixedPng202611 &&
        typeof window.TobuTojoFixedPng202611.resolve==="function") {
      var fixedRef=window.TobuTojoFixedPng202611.resolve(
        Object.assign({},p,{displayLineId:lineId}));
      if(fixedRef && fixedRef.illustrationPng){
        var refPrefix=/^zh/.test(lang)?"PNG示意（非当日实车）：":
          lang==="en"?"PNG illustration (not observed stock): ":
          lang==="ko"?"PNG 예시(실제 편성 아님): ":
          "PNG参考図（実車確認ではありません）：";
        tip.push(refPrefix+fixedRef.illustrationModel);
      } else if(fixedRef && lineId==="Ogose" &&
                fixedRef.illustrationModel==="東武8000系"){
        tip.push(/^zh/.test(lang)
          ?"东武8000型（实际编组及涂装未确认，不显示纪念涂装PNG）"
          :lang==="en"?"Tobu 8000 series (actual formation/livery unconfirmed; no special-livery PNG)"
          :lang==="ko"?"도부 8000계 (실제 편성·도색 미확인, 특별 도색 이미지 제외)"
          :"東武8000型（実編成・塗装未確認、特別塗装PNGは非表示）");
      }
    }
    var _fleetReference =
      (typeof _seibuCommuterCandidatesLabel === "function"
        ? _seibuCommuterCandidatesLabel(p, lineId, lang) : "") ||
      (typeof _shonanFleetCandidatesLabel === "function"
        ? _shonanFleetCandidatesLabel(p, lineId, lang) : "") ||
      (typeof _trainFleetPlanLabel === "function"
        ? _trainFleetPlanLabel(p, lineId, lang) : "");
    if (_fleetReference) tip.push(_fleetReference);
    // 保留线路门槛：源码截取型消费者可能只加载标题函数而不加载全部辅助函数。
    if (typeof _isOedoTailTrain === "function" && _isOedoTailTrain(lineId, p) && p && p.destinationStation) {
      var _towardHikarigaoka = String(p.destinationStation).split(/[:.]/).pop() === "Hikarigaoka";
      var _towardText = _trainDestText(_towardHikarigaoka ? "Hikarigaoka" : "Tochomae");
      tip.push(_towardText + (/^zh/.test(lang) ? "方向" : (lang === "en" ? " bound" : "方面")));
    } else if (p && p.railDirection) {
      var _loopD = String(p.railDirection).split(/[:.]/).pop();
      var _loopNames = { InnerLoop: ["内回り", "内环", "Inner", "내선"], OuterLoop: ["外回り", "外环", "Outer", "외선"],
                         Inner: ["内回り", "内环", "Inner", "내선"], Outer: ["外回り", "外环", "Outer", "외선"] };
      if (_loopNames[_loopD]) tip.push(_loopNames[_loopD][/^zh/.test(lang) ? 1 : (lang === "en" ? 2 : (lang === "ko" ? 3 : 0))]);
    }
    if (p && p.destinationStation) tip.push(_trainDestText(p.destinationStation));
    // A split portion retains its own official number. The partner's number
    // is shown only as a sourced timetable coupling relationship, not as an
    // actual-day physical carset identification.
    if (p && p.coupling && window.TrainCoupling &&
        typeof window.TrainCoupling.label === "function") {
      var couplingLabel = window.TrainCoupling.label(p.coupling, lang);
      if (couplingLabel) tip.push(couplingLabel);
    }
    tip.push(_trainPositionSourceText(p));
    return tip.join(" | ");
  }

  function _trainPositionSourceText(p) {
    if (!p) return t("trains.unavailable_note");
    if (p.estimated === true) return t("trains.position_estimated");
    if (p.positionSource !== "realtime-api" || !_isRealtimePositionFresh(p)) return t("trains.unavailable_note");
    var text = t("trains.position_live");
    var updated = Date.parse(p.sourceUpdatedAt || "");
    if (isFinite(updated)) text += " · " + t("trains.position_updated") + " " +
      new Date(updated).toLocaleTimeString("ja-JP", { timeZone:"Asia/Tokyo", hour12:false }) + " JST";
    else text += " · " + t("trains.position_time_unknown");
    return text;
  }

  // Keep train identity available for assistive technology (兼容测试截取锚点；说明见下方中文注释)。
  // 让辅助技术可以读取列车身份，但不创建
  // 原生浏览器提示框或标记上的 SVG <title> 节点。
  function _setTrainMarkerAccessibilityLabel(marker, label) {
    if (!marker) return;
    marker.removeAttribute("title");
    marker.setAttribute("aria-label", label);
    var tip = marker.querySelector("title");
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
  }

  function _trainFormationId(p) {
    return String((p && p.vehicleFormationId) ||
      (p && p.vehicleResolution && p.vehicleResolution.formationId) || "").trim();
  }

  function _setTrainFormationAttribute(marker, p) {
    if (!marker) return;
    var formation = _trainFormationId(p);
    if (formation) marker.setAttribute("data-vehicle-formation-id", formation);
    else marker.removeAttribute("data-vehicle-formation-id");
  }

  // 列车图标是嵌入既有铁路
  // 图中的图库 PNG。图本身可以是 SVG；列车绝不通过 SVG
  // 基元绘制，也不通过另一套渲染器映射选择。
  function _createTrainMarker(trainLayer, svgNS, trainUid, spec, px, py, p, lineId, isLoop, color, loc) {
    if (!spec) return null;
    var knownVehicle = spec.kind === "vehicle" && !!spec.iconSrc;
    // An unrecognized/missing artwork selection is always one neutral circle.
    var compact = spec.compact === true || !knownVehicle;
    var marker = document.createElementNS(svgNS,
      knownVehicle && !compact ? "image" : "circle");
    if (knownVehicle && !compact) {
      marker.setAttribute("width", "14");
      marker.setAttribute("height", "18");
      marker.setAttribute("href", spec.iconSrc);
      marker.setAttribute("data-train-artwork", spec.iconSrc);
      // Safari/iOS SVG <image> 兼容性：保持 SVG2 与 XLink
      // 引用一致；此处不进行新的车辆或资产选择。
      marker.setAttributeNS("http://www.w3.org/1999/xlink", "href", spec.iconSrc);
      marker.setAttribute("preserveAspectRatio", "xMidYMid meet");
      marker.addEventListener("load", function () {
        // SVG <image> may become measurable after the initial caption pass.
        // Recheck overlap without rebuilding or independently moving its label.
        if (trainLayer && trainLayer.isConnected && marker.isConnected)
          _resolveTrainLabelCollisions(trainLayer);
      });
      marker.addEventListener("error", function () {
        if (!trainLayer || !trainLayer.isConnected || !marker.isConnected) return;
        var uid = marker.getAttribute("data-train-id") || "";
        if (uid) _rememberTrainArtworkFailure(uid, marker.getAttribute("href"));
        marker.setAttribute("visibility", "hidden");
        // 立即保留这列已知列车的已验证位置，
        // 不必等待图片/网络错误后的下一次 ODPT 轮询。
        var unit = _trainUnitContainer(marker);
        if (!unit) return;
        // Swap the artwork INSIDE the same component. Do not instantiate
        // a second complete train or detach/reparent its destination caption.
        var neutral = _createTrainMarker(trainLayer, svgNS, trainUid,
          {kind:"unresolved", iconSrc:"", className:spec.className,
            compact:true},
          marker._displayX, marker._displayY, marker._trainPosition || p,
          lineId, isLoop, color, loc);
        if (neutral) {
          neutral.setAttribute("data-vehicle-png-reason","image-load-failed");
          neutral._displayStationIdx = marker._displayStationIdx;
          neutral._displayNextStationIdx = marker._displayNextStationIdx;
          neutral._displayRoutePos = marker._displayRoutePos;
          unit.insertBefore(neutral, marker);
          unit.removeChild(marker);
          _resolveTrainLabelCollisions(trainLayer);
        }
      });
    } else {
      marker.setAttribute("r", "4.5");
      marker.setAttribute("fill", "#666");
      marker.setAttribute("stroke", "#fff");
      marker.setAttribute("stroke-width", "1.5");
      if (!knownVehicle) {
        // 实时位置已知但车型未确认时仍显示中性圆点；不要把车型缺失
        // 误标成位置缺失，便于区分 API 位置问题与车辆映射问题。
        marker.setAttribute("data-vehicle-unresolved", "true");
        var _hasRealtimePosition = !!(p && (
          p.realtimePositionRecordPresent === true ||
          /realtime|odpt/i.test(String(p.positionSource || ""))
        ));
        if (!_hasRealtimePosition) marker.setAttribute("data-position-unresolved", "true");
      }
    }
    var titleText = _trainMarkerAccessibleDescription(p, lineId, spec);
    if (titleText) _setTrainMarkerAccessibilityLabel(marker, titleText);
    _syncTrainMarkerIllustrationStatus(marker, spec);
    _setTrainFormationAttribute(marker, p);
    marker.setAttribute("data-train-id", String(trainUid));
    marker.setAttribute("data-marker-kind", _trainMarkerDomKind(spec));
    if (spec.unresolvedReason)
      marker.setAttribute("data-vehicle-png-reason",spec.unresolvedReason);
    if (spec.planned) marker.setAttribute("data-marker-reference-only", "true");
    marker.setAttribute("data-marker-display", compact ? "compact" : "artwork");
    marker.setAttribute("class", spec.className);
    // 单个位置标记仅用于提供信息，不是可交互的详情按钮。
    // 折叠 +N 徽标仍是唯一的列车级弹窗操作。
    marker.setAttribute("role", "img");
    // The unit is mandatory for ALL marker kinds (PNG, candidate, neutral)
    // and ALL geometry, including Oedo's six-shaped display corridors.
    // A marker and its direction label must never be siblings of trainLayer.
    var unit = document.createElementNS(svgNS, "g");
    unit.setAttribute("data-train-unit-id", String(trainUid));
    unit.setAttribute("class", "train-unit train-component");
    unit.setAttribute("data-train-component-id", String(trainUid));
    unit.appendChild(marker);
    // This is an unmounted component part. The public component constructor
    // attaches the completed unit and creates the caption in one operation.
    _setTrainIconPosition(marker, px, py, p, lineId, isLoop);
    marker._displayX = px;
    marker._displayY = py;
    marker._displayLineId = lineId;
    marker._trainPosition = p;
    if (loc && loc.idx != null && isFinite(Number(loc.idx))) marker._displayStationIdx = Number(loc.idx);
    if (loc && loc.nextIdx != null && isFinite(Number(loc.nextIdx))) marker._displayNextStationIdx = Number(loc.nextIdx);
    if (loc && loc.routePos != null && isFinite(Number(loc.routePos))) marker._displayRoutePos = Number(loc.routePos);
    return marker;
  }

  // TrainComponent is the sole public lifecycle for a timetable/realtime
  // glyph. SVG image/circle, arrow, and destination are private render parts;
  // they are mounted, moved and disposed as one keyed component.
  function _createTrainComponent(trainLayer, svgNS, trainUid, spec,
      px, py, p, lineId, isLoop, color, loc) {
    var marker = _createTrainMarker(trainLayer, svgNS, trainUid, spec,
      px, py, p, lineId, isLoop, color, loc);
    if (!marker) return null;
    var component = _trainUnitContainer(marker);
    trainLayer.appendChild(component);
    _syncTrainLabels(trainLayer, svgNS, trainUid, px, py, p, lineId);
    return marker;
  }

  function _positionTrainComponent(marker, trainLayer, svgNS, trainUid,
      px, py, p, lineId, isLoop) {
    _setTrainIconPosition(marker, px, py, p, lineId, isLoop);
    _syncTrainLabels(trainLayer, svgNS, trainUid, px, py, p, lineId);
  }

  function _moveTrainComponent(marker, trainLayer, trainUid,
      px, py, p, lineId, isLoop) {
    _setTrainIconPosition(marker, px, py, p, lineId, isLoop);
    _moveTrainLabels(trainLayer, trainUid, px, py, p, lineId);
  }

  function updateTrainLayer(svg, positions, stationCoords, lineId, line, geometry) {
    var trainLayer = svg.querySelector('.train-layer');
    if (!trainLayer) return;
    positions = _prepareTrainPositions(positions, stationCoords);
    geometry = geometry || svg.__geometry || { branchGeom: svg.__branchGeom || null };
    // 增量列车图层渲染也需要线路颜色。此前
    // 中性圆点兜底引用了未定义的 `color`，导致任何
    // 无法解析车辆图标的列车都会中止该线路渲染。
    var color = geometry.color || line.color || (window.TrainsColors ? window.TrainsColors.LINE_FALLBACK : "#008803");
    
    var svgNS = "http://www.w3.org/2000/svg";
    var isLoop = stationCoords.length > 2 &&
      (line.type === "loop" || line.isDoubleColumnLoop === true || line.isSixShapedLoop === true);
    
    // TrainTrackLayout owns target geometry; this marker owns interpolation.
    var layout = (window.TrainTrackLayout && window.TrainTrackLayout.resolveAll)
      ? window.TrainTrackLayout.resolveAll(positions, stationCoords, geometry, lineId, {
          getDisplayMoveDir: _trainMoveDir,
          fusionBaseIdx: _fusionBaseIdx,
          // Up/down use symmetric side lanes; image, arrow and destination
          // stay one component when detecting collisions.
          laneGap: isLoop ? 9 : 11,
          stackGap: isLoop ? 7 : 8
        })
      : null;
    
    var _adjacentGaps = [];
    for (var _sgi = 1; _sgi < stationCoords.length; _sgi++) {
      var _sga = stationCoords[_sgi - 1], _sgb = stationCoords[_sgi];
      if (!_sga || !_sgb) continue;
      var _sgdx = _sgb.x - _sga.x, _sgdy = _sgb.y - _sga.y;
      var _gap = Math.sqrt(_sgdx * _sgdx + _sgdy * _sgdy);
      if (isFinite(_gap) && _gap > 0) _adjacentGaps.push(_gap);
    }
    _adjacentGaps.sort(function(a,b){ return a-b; });
    var _medianStationGap = _adjacentGaps.length ? _adjacentGaps[Math.floor(_adjacentGaps.length / 2)] : 40;
    // 允许最多约 4 个站间距的平滑移动，使恢复的页面（长时间
    // 轮询间隔、列车前进多个站）平滑回到位置，而不是
    // 瞬移。更大的位移（切线/来源重置）仍然直接跳转。
    var _snapDistance = Math.max(140, _medianStationGap * 4);

    var updatedIds = {};
    var markerById = {};
    var _existingMarkers = trainLayer.querySelectorAll('[data-train-id]');
    for (var _emi = 0; _emi < _existingMarkers.length; _emi++) {
      var _existingMarker = _existingMarkers[_emi];
      var _existingUid = _existingMarker.getAttribute('data-train-id') || "";
      if (!_existingUid) continue;
      if (!markerById[_existingUid]) markerById[_existingUid] = _existingMarker;
      else {
        // Two DOM markers with the same logical train ID can survive a
        // repaint, browser restore, or an older PNG-fallback implementation.
        // Remove the ENTIRE duplicate component, not only its SVG icon.
        if (_existingMarker._moveRaf) cancelAnimationFrame(_existingMarker._moveRaf);
        var _duplicateUnit = _trainUnitContainer(_existingMarker);
        if (_duplicateUnit && _duplicateUnit.parentNode)
          _duplicateUnit.parentNode.removeChild(_duplicateUnit);
        else if (_existingMarker.parentNode)
          _existingMarker.parentNode.removeChild(_existingMarker);
      }
    }
    
    for (var pi = 0; pi < positions.length; pi++) {
      var p = positions[pi];
      var loc = layout ? layout[pi] : null;
      // TrainTrackLayout 是唯一的几何权威。如果位置证据
      // 无法产生有效布局结果，应省略标记，而不是
      // 在渲染器中独立重建坐标。
      if (!loc) continue;
      var idx = loc.idx;
      var direction = p.railDirection || '';
      var px = loc.x;
      var py = loc.y;
      
      // Stable physical-service identity: confirmed running chain first.
      // 不要包含 stationIndex；否则每经过一个
      // 车站/边界都会重建 DOM 节点，即使运行链已知也会破坏连续性。
      // DOM 身份必须使用来源对象或已确认的实际运行链。
      // trainNumber 只能用于有界的同线路桥接证据，不是全局
      // 稳定对象 ID；在此复用它可能导致来源对象升级为
      // 规范 runningChainId 后产生第二个标记。
      var trainUid = p.runningChainId || p.trainId || p.sourceTrainId || p.timetableObjectId || "";
      // 数组顺序和孤立列车号不是持久的列车身份。
      // 没有稳定的来源/运行链键时，不要附加动画状态。
      if (!trainUid) continue;
      if (p && lineId && !p.positionLineId && !p.lineId) {
        p = Object.assign({}, p, { positionLineId: lineId });
      }
      var markerSpec = _trainMarkerSpec(p, trainUid, lineId);
      // 缺失“车型”不会抹除已验证的“位置”。非车型
      // 中性圆点仍参与现有布局/标签/动画。
      updatedIds[trainUid] = true;
      var existingIcon = markerById[String(trainUid)] || null;
      var expectedTag = markerSpec.kind === "vehicle" && !markerSpec.compact ? "image" : "circle";
      // Upgrade DOM made by an earlier renderer without carrying over its
      // world-space caption coordinates. Rebuild as a single SVG unit.
      if (existingIcon && !_trainUnitContainer(existingIcon)) {
        existingIcon = _discardTrainMarker(markerById, trainUid, existingIcon);
        _removeTrainLabels(trainLayer, trainUid);
      }
      if (existingIcon && (existingIcon.getAttribute("data-marker-kind") !== _trainMarkerDomKind(markerSpec) ||
          String(existingIcon.tagName || "").toLowerCase() !== expectedTag)) {
        existingIcon = _discardTrainMarker(markerById, trainUid, existingIcon);
      }
      if (existingIcon && existingIcon.getAttribute("data-marker-display") !==
          (markerSpec.compact ? "compact" : "artwork")) {
        existingIcon = _discardTrainMarker(markerById, trainUid, existingIcon);
      }
      
      // 加载失败的图片节点会隐藏；之后重试同一有效 PNG 时
      // 必须发起新的图片请求，不能保留不可见的旧节点。
      if (existingIcon && existingIcon.getAttribute("visibility") === "hidden") {
        existingIcon = _discardTrainMarker(markerById, trainUid, existingIcon);
      }

      if (existingIcon) {
        existingIcon._trainPosition = p;
        // 同一列车和标记类型可以切换到另一张认证 PNG，而不必
        // 重建标记，也不保留过期的 SVG/PNG 图片。
        if (markerSpec.kind === "vehicle" && !markerSpec.compact &&
            existingIcon.getAttribute("href") !== markerSpec.iconSrc) {
          existingIcon.setAttribute("href", markerSpec.iconSrc);
          existingIcon.setAttributeNS("http://www.w3.org/1999/xlink", "href", markerSpec.iconSrc);
          existingIcon.setAttribute("data-train-artwork", markerSpec.iconSrc);
          existingIcon.setAttribute("visibility", "visible");
        }
        // SVG 标记会跨轮询保留，但其已验证编组可能发生变化。
        // 刷新无障碍标签，不要保留过期的列车数据。
        var _freshTitle = _trainMarkerAccessibleDescription(p, lineId, markerSpec);
        _setTrainMarkerAccessibilityLabel(existingIcon, _freshTitle);
        if (markerSpec.unresolvedReason)
          existingIcon.setAttribute("data-vehicle-png-reason",markerSpec.unresolvedReason);
        else existingIcon.removeAttribute("data-vehicle-png-reason");
        _syncTrainMarkerIllustrationStatus(existingIcon, markerSpec);
        _setTrainFormationAttribute(existingIcon, p);
        // Update existing icon position.
        // TrainTrackLayout 负责目标几何；此标记负责插值。
        // 动画只有一个权威：每个标记自己的 requestAnimationFrame。
        if (existingIcon._moveRaf) {
          cancelAnimationFrame(existingIcon._moveRaf);
          existingIcon._moveRaf = 0;
        }
        var _startX = Number(existingIcon._displayX);
        var _startY = Number(existingIcon._displayY);
        if (!isFinite(_startX) || !isFinite(_startY)) {
          var _tag = String(existingIcon.tagName || '').toLowerCase();
          if (_tag === 'image') {
            var _ix = parseFloat(existingIcon.getAttribute('x'));
            var _iy = parseFloat(existingIcon.getAttribute('y'));
            if (isFinite(_ix) && isFinite(_iy)) {
              _startX = _ix + 7;
              _startY = _iy + 9;
            }
          }
        }
        var _targetX = px;
        var _targetY = py;
        var _loopRect = isLoop ? stationCoords._loopRect : null;
        var _targetRoutePos = loc && loc.routePos != null ? Number(loc.routePos) : NaN;
        var _startRoutePos = Number(existingIcon._displayRoutePos);
        var _useLoopRoute = !!(_loopRect && isFinite(_targetRoutePos) && isFinite(_startRoutePos));
        var _routeDiff = 0;
        var _loopCorrection = false;
        if (_useLoopRoute) {
          var _perimeter = Number(_loopRect.perimeter) || 0;
          _routeDiff = _targetRoutePos - _startRoutePos;
          if (_perimeter > 0) {
            var _loopDirName = String(p && p.railDirection || "").split(/[:.]/).pop();
            var _orderSign = _loopRect.stationOrderSign || 1;
            // 轮询修正绝不能把小幅回退
            // 变成完整绕行。先取环绕后的最近目标，再在
            // 与列车运行方向矛盾时直接跳转。真正的末站/首站
            // 跨越仍会得到短且符号正确的位移。
            _routeDiff = ((_routeDiff + _perimeter / 2) % _perimeter + _perimeter) % _perimeter - _perimeter / 2;
            if (/^(InnerLoop|Inner)$/.test(_loopDirName)) {
              _loopCorrection = _routeDiff * _orderSign > 0;
            } else if (/^(OuterLoop|Outer)$/.test(_loopDirName)) {
              _loopCorrection = _routeDiff * _orderSign < 0;
            }
          }
        }
        var _dx = _targetX - _startX;
        var _dy = _targetY - _startY;
        var _distance = _useLoopRoute ? Math.abs(_routeDiff) : Math.sqrt(_dx * _dx + _dy * _dy);
        var _hasDisplayPos = isFinite(_startX) && isFinite(_startY);
        var _sameLine = !existingIcon._displayLineId || existingIcon._displayLineId === lineId;
        var _targetIdx = loc && loc.idx != null ? Number(loc.idx) : NaN;
        var _targetNextIdx = loc && loc.nextIdx != null ? Number(loc.nextIdx) : NaN;
        var _previousIdx = Number(existingIcon._displayStationIdx);
        var _previousNextIdx = Number(existingIcon._displayNextStationIdx);
        var _indexContinuous = true;
        if (_sameLine && isFinite(_targetIdx) && isFinite(_previousIdx)) {
          var _idxDiff = Math.abs(_targetIdx - _previousIdx);
          if (isLoop && stationCoords.length > 1) {
            _idxDiff = Math.min(_idxDiff, stationCoords.length - _idxDiff);
          }
          _indexContinuous = _idxDiff <= 1;
          if (_indexContinuous && isFinite(_targetNextIdx) && isFinite(_previousNextIdx)) {
            var _sameSegment = _targetIdx === _previousIdx && _targetNextIdx === _previousNextIdx;
            var _advancedSegment = _targetIdx === _previousNextIdx;
            _indexContinuous = _sameSegment || _advancedSegment;
          }
        }
        // 只平滑连续更新；恢复、修正和跳过的
        // 区段直接跳到当前证据位置，不重演过去的行驶过程。
        var _shouldSnap = !_hasDisplayPos || !_sameLine || !_indexContinuous ||
          _loopCorrection || !isFinite(_distance) || _distance > _snapDistance;

        if (_shouldSnap || _distance <= 0.5) {
          _positionTrainComponent(existingIcon, trainLayer, svgNS, trainUid,
            _targetX, _targetY, p, lineId, isLoop);
          existingIcon._displayX = _targetX;
          existingIcon._displayY = _targetY;
          existingIcon._displayLineId = lineId;
          if (isFinite(_targetIdx)) existingIcon._displayStationIdx = _targetIdx;
          if (isFinite(_targetNextIdx)) existingIcon._displayNextStationIdx = _targetNextIdx;
          if (isFinite(_targetRoutePos)) existingIcon._displayRoutePos = _targetRoutePos;
        } else {
          // 每个 RAF 拥有一个不可变的目标快照。函数作用域的循环
          // 变量过去会导致所有回调都移动最后一列车。
          (function(_icon, trainUid, p, _startX, _startY, _targetX, _targetY,
              _targetIdx, _targetNextIdx, _targetRoutePos, _useLoopRoute,
              _startRoutePos, _routeDiff, _loopRect, _dx, _dy, _distance) {
          // 让移动时长响应实际位移，不要把
          // 每次更新都拉伸到固定的 14 秒。
          var _animDur = Math.max(350, Math.min(3000, Math.round(_distance * 35)));
          var _animStart = performance.now();
          _positionTrainComponent(_icon, trainLayer, svgNS, trainUid,
            _startX, _startY, p, lineId, isLoop);
          function _animFrame(now) {
            if (!_icon.isConnected || document.hidden) { _icon._moveRaf = 0; return; }
            var _t = Math.min(1, (now - _animStart) / _animDur);
            // Smoothstep：不超调，终点可确定。
            var _ease = _t * _t * (3 - 2 * _t);
            var _curX, _curY;
            if (_useLoopRoute) {
              var _curRoutePos = _startRoutePos + _routeDiff * _ease;
              var _routeXY = _loopPosToXY(_curRoutePos, _loopRect);
              _curX = _routeXY.x;
              _curY = _routeXY.y;
              _icon._displayRoutePos = _curRoutePos;
            } else {
              _curX = _startX + _dx * _ease;
              _curY = _startY + _dy * _ease;
            }
            _icon._displayX = _curX;
            _icon._displayY = _curY;
            _icon._displayLineId = lineId;
            _moveTrainComponent(_icon, trainLayer, trainUid,
              _curX, _curY, p, lineId, isLoop);
            _resolveTrainLabelCollisions(trainLayer, now);
            if (_t < 1) {
              _icon._moveRaf = requestAnimationFrame(_animFrame);
            } else {
              _icon._displayX = _targetX;
              _icon._displayY = _targetY;
              if (isFinite(_targetIdx)) _icon._displayStationIdx = _targetIdx;
              if (isFinite(_targetNextIdx)) _icon._displayNextStationIdx = _targetNextIdx;
              if (isFinite(_targetRoutePos)) _icon._displayRoutePos = _targetRoutePos;
              _icon._moveRaf = 0;
            }
          }
          _icon._moveRaf = requestAnimationFrame(_animFrame);
          })(existingIcon, trainUid, p, _startX, _startY, _targetX, _targetY,
            _targetIdx, _targetNextIdx, _targetRoutePos, _useLoopRoute,
            _startRoutePos, _routeDiff, _loopRect, _dx, _dy, _distance);
        }
      } else {
        existingIcon = _createTrainComponent(trainLayer, svgNS, trainUid,
          markerSpec, px, py, p, lineId, isLoop, color, loc);
        markerById[String(trainUid)] = existingIcon;
      }
    }
    
    // 移除已不存在列车的图标
    // 兼容终点/方向标签（data-train-label-for 与图标同 uid 清理）
    // 移除前取消该 marker 仍在运行的动画帧，避免孤悬 RAF 空转
    var allIcons = trainLayer.querySelectorAll('[data-train-id], [data-train-label-for]');
    for (var ii = 0; ii < allIcons.length; ii++) {
      var tid = allIcons[ii].getAttribute('data-train-id') || allIcons[ii].getAttribute('data-train-label-for');
      if (!updatedIds[tid]) {
        if (allIcons[ii]._moveRaf) cancelAnimationFrame(allIcons[ii]._moveRaf);
        var unit = _trainUnitContainer(allIcons[ii]);
        if (unit && unit.parentNode) unit.parentNode.removeChild(unit);
        else if (allIcons[ii].parentNode) allIcons[ii].parentNode.removeChild(allIcons[ii]);
      }
    }
    // Enforce the same DOM component invariant for every operator/line,
    // regardless of whether the current train renders as PNG or circle.
    _pruneDetachedTrainParts(trainLayer);
    _resolveTrainLabelCollisions(trainLayer);
    if (trainLayer._refreshTrainFoldPopover) trainLayer._refreshTrainFoldPopover();
  }

  // All train graphics are one keyed TrainComponent. Previous versions
  // could leave orphan root-level circles or captions in trainLayer.
  // Remove those relics on every incremental refresh; never allow them to
  // co-exist with the component's newer internal icon/label parts.
  function _pruneDetachedTrainParts(trainLayer) {
    if (!trainLayer) return;
    var roots = Array.prototype.slice.call(trainLayer.children || []);
    var seen = Object.create(null);
    for (var i = roots.length - 1; i >= 0; i--) {
      var node = roots[i];
      if (!node || !node.getAttribute) continue;
      var componentId = node.getAttribute('data-train-component-id');
      if (componentId) {
        var marker = node.querySelector('[data-train-id]');
        if (!marker || marker.getAttribute('data-train-id') !== componentId ||
            seen[componentId]) {
          if (marker && marker._moveRaf) cancelAnimationFrame(marker._moveRaf);
          trainLayer.removeChild(node);
        } else {
          seen[componentId] = true;
        }
      } else if (node.hasAttribute('data-train-id') ||
                 node.hasAttribute('data-train-label-for')) {
        // These are parts of a TrainComponent, never independent siblings.
        if (node._moveRaf) cancelAnimationFrame(node._moveRaf);
        trainLayer.removeChild(node);
      }
    }
  }

  // Visual folding uses the full TrainComponent (vehicle + arrow + caption)
  // in screen pixels. Overlapping components share one +N UI; identities do not merge.
  function _groupNearbyTrainMarkers(entries, distance) {
    var rows = (entries || []).filter(function(e) {
      var b = e && e.box;
      return e && e.id && b && isFinite(b.x) && isFinite(b.y) &&
        isFinite(b.width) && isFinite(b.height) && b.width > 0 && b.height > 0;
    }).slice().sort(function(a, b) {
      return Number(!!b.artwork) - Number(!!a.artwork) ||
        String(a.id).localeCompare(String(b.id));
    });
    var parent = rows.map(function(_, i) { return i; });
    function root(i) {
      while (i !== parent[i]) { parent[i] = parent[parent[i]]; i = parent[i]; }
      return i;
    }
    function overlaps(a, b) {
      return a.x < b.x + b.width && b.x < a.x + a.width &&
        a.y < b.y + b.height && b.y < a.y + a.height;
    }
    for (var i = 0; i < rows.length; i++)
      for (var j = i + 1; j < rows.length; j++) {
        if (!overlaps(rows[i].box, rows[j].box)) continue;
        var a = root(i), b = root(j);
        if (a !== b) parent[b] = a;
      }
    var clusters = Object.create(null), groups = Object.create(null);
    rows.forEach(function(e, i) {
      var key = String(root(i));
      (clusters[key] = clusters[key] || []).push(e.id);
    });
    Object.keys(clusters).forEach(function(key) {
      var ids = clusters[key];
      if (ids.length > 1) groups[ids[0]] = [ids[0]].concat(ids.slice(1).sort());
    });
    return groups;
  }

  function _resolveTrainLabelCollisions(trainLayer, frameTime) {
    var svg = trainLayer && trainLayer.ownerSVGElement;
    if (!svg) return;
    if (frameTime != null && trainLayer._captionFrameTime === frameTime) return;
    if (frameTime != null) {
      // Measure after every train's animation frame has updated its complete unit.
      if (trainLayer._captionPendingTime !== frameTime) {
        trainLayer._captionPendingTime = frameTime;
        trainLayer._captionPendingCount = 0;
        trainLayer._captionPendingTotal = 0;
        var moving = trainLayer.querySelectorAll('[data-train-id]');
        for (var a = 0; a < moving.length; a++)
          if (moving[a]._moveRaf) trainLayer._captionPendingTotal++;
      }
      trainLayer._captionPendingCount++;
      if (trainLayer._captionPendingCount < trainLayer._captionPendingTotal) return;
    }
    trainLayer._captionFrameTime = frameTime;
    // Train markers live in a static scaled layout group; screen-space
    // collision and folded badges must use that group's CTM.
    var matrix = typeof trainLayer.getScreenCTM === 'function'
      ? trainLayer.getScreenCTM() : svg.getScreenCTM();
    if (!matrix || !matrix.a || !matrix.d) return;
    var oldBadges = trainLayer.querySelectorAll('[data-train-fold-badge]');
    for (var f = 0; f < oldBadges.length; f++)
      oldBadges[f].parentNode.removeChild(oldBadges[f]);
    var captionById = Object.create(null);
    var labels = trainLayer.querySelectorAll('[data-train-label-for]');
    for (var n = 0; n < labels.length; n++) {
      var label = labels[n];
      var raw = label.getAttribute('data-label-raw-transform');
      if (raw != null) label.setAttribute('transform', raw);
      label.removeAttribute('display');
      captionById[label.getAttribute('data-train-label-for')] = label;
    }
    var markerById = Object.create(null), components = [];
    var icons = trainLayer.querySelectorAll('[data-train-id]');
    for (var m = 0; m < icons.length; m++) {
      var icon = icons[m], id = icon.getAttribute('data-train-id');
      if (!id) continue;
      var unit = _trainUnitContainer(icon);
      if (unit && unit.getAttribute('data-train-fold-hidden') === 'true') {
        unit.removeAttribute('visibility');
        unit.removeAttribute('data-train-fold-hidden');
      }
      icon.removeAttribute('display');
      var rawIcon = icon.getAttribute('data-marker-raw-transform') || '';
      if (rawIcon) icon.setAttribute('transform', rawIcon);
      else icon.removeAttribute('transform');
      markerById[id] = icon;
      var parts = [icon, captionById[id]].filter(Boolean).map(function(node) {
        return node.getBoundingClientRect ? node.getBoundingClientRect() : null;
      }).filter(function(b) {
        return b && isFinite(b.x) && isFinite(b.y) && isFinite(b.width) &&
          isFinite(b.height) && b.width > 0 && b.height > 0;
      });
      if (!parts.length) continue;
      var left = Math.min.apply(null, parts.map(function(b) { return b.x; }));
      var top = Math.min.apply(null, parts.map(function(b) { return b.y; }));
      var right = Math.max.apply(null, parts.map(function(b) { return b.x + b.width; }));
      var bottom = Math.max.apply(null, parts.map(function(b) { return b.y + b.height; }));
      components.push({id:id, artwork:String(icon.tagName || '').toLowerCase() === 'image',
        box:{x:left,y:top,width:right-left,height:bottom-top}});
    }
    var folded = _groupNearbyTrainMarkers(components);
    Object.keys(folded).forEach(function(root) {
      folded[root].slice(1).forEach(function(id) {
        var unit = _trainUnitContainer(markerById[id]);
        if (!unit) return;
        unit.setAttribute('visibility', 'hidden');
        unit.setAttribute('data-train-fold-hidden', 'true');
      });
    });
    _syncTrainFoldBadges(trainLayer, folded, captionById, markerById, matrix);
  }

  // The SVG badges are rebuilt as collision layout moves. A stable listener
  // on trainLayer avoids opening a popover on touch/pointer DOWN while the
  // user is scrolling, and survives replacement of the SVG badge nodes.
  function _bindTrainFoldBadgeActivation(layer) {
    if (layer._foldBadgeActivationBound) return;
    layer._foldBadgeActivationBound = true;
    var pending = null, blockClickUntil = 0;

    function badgeAt(target) {
      var badge = target && typeof target.closest === 'function'
        ? target.closest('[data-train-fold-badge]') : null;
      return badge && layer.contains(badge) ? badge : null;
    }
    function activate(badge) {
      if (!badge || !badge.isConnected || !layer.isConnected) return;
      var ids = badge._foldTrainIds;
      if (!Array.isArray(ids) || ids.length < 2 ||
          !layer._foldBadgeGroups || !layer._foldBadgeMarkers) return;
      _openTrainFoldList(layer, ids.slice(), layer._foldBadgeGroups,
        layer._foldBadgeMarkers, badge);
    }
    function clearPending() {
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onCancel, true);
      pending = null;
    }
    function onMove(e) {
      if (!pending || e.pointerId !== pending.pointerId) return;
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > 10)
        pending.dragged = true;
    }
    function onCancel(e) {
      if (!pending || e.pointerId !== pending.pointerId) return;
      blockClickUntil = Date.now() + 600;
      clearPending();
    }
    function onUp(e) {
      if (!pending || e.pointerId !== pending.pointerId) return;
      var start = pending;
      blockClickUntil = Date.now() + 600; // Ignore follow-up generated click.
      clearPending();
      if (start.dragged ||
          Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10 ||
          Date.now() - start.at > 800) return;
      // Pointer capture and animation may retarget pointerup to an obsolete
      // badge. Hit-test the CURRENT SVG and require the SAME logical group.
      var hit = typeof document.elementFromPoint === 'function'
        ? document.elementFromPoint(e.clientX, e.clientY) : e.target;
      var badge = badgeAt(hit);
      if (!badge || badge.getAttribute('data-train-fold-badge') !== start.id)
        return;
      activate(badge);
    }
    layer.addEventListener('pointerdown', function(e) {
      var badge = badgeAt(e.target);
      if (!badge || e.isPrimary === false || e.button !== 0 ||
          e.ctrlKey || e.metaKey || e.altKey) return;
      clearPending();
      pending = {
        id: badge.getAttribute('data-train-fold-badge'),
        pointerId: e.pointerId, x: e.clientX, y: e.clientY,
        at: Date.now(), dragged: false
      };
      // DO NOT preventDefault on touchstart: vertical map scrolling must work.
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
      document.addEventListener('pointercancel', onCancel, true);
    });
    layer.addEventListener('click', function(e) {
      var badge = badgeAt(e.target);
      if (!badge) return;
      if (e.button != null && e.button !== 0) return;
      e.stopPropagation();
      // Physical click follows pointerup, which already decided whether the
      // touch was a tap or a scroll. Fallback click remains for legacy clients
      // without PointerEvents and screen-reader synthesized activation.
      if (Date.now() < blockClickUntil) return;
      blockClickUntil = Date.now() + 400;
      activate(badge);
    });
    layer.addEventListener('keydown', function(e) {
      var badge = badgeAt(e.target);
      if (!badge || (e.key !== 'Enter' && e.key !== ' ') || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      blockClickUntil = Date.now() + 400;
      activate(badge);
    });
    layer._cancelTrainFoldGesture = clearPending;
  }

  function _syncTrainFoldBadges(layer, folded, groups, markers, matrix) {
    _bindTrainFoldBadgeActivation(layer);
    layer._foldBadgeGroups = groups;
    layer._foldBadgeMarkers = markers;
    var sx = Math.abs(Number(matrix && matrix.a)) || 1;
    var sy = Math.abs(Number(matrix && matrix.d)) || 1;
    Object.keys(folded).forEach(function(id) {
      var ids=folded[id], ns='http://www.w3.org/2000/svg';
      if (!ids || ids.length < 2) return;
      // The badge is attached to the surviving TrainComponent, NOT the
      // destination label: a crowded or missing label must never prevent
      // access to the folded vehicles. Its offset stays constant in pixels.
      var unit = _trainUnitContainer(markers[id]);
      if (!unit) return;
      var badge=document.createElementNS(ns,'g');
      badge.setAttribute('data-train-fold-badge',id);
      badge.setAttribute('transform','translate(0,'+(-24/sy)+') scale('+(1/sx)+','+(1/sy)+')');
      badge._foldTrainIds = ids.slice();
      badge.setAttribute('role','button');badge.setAttribute('tabindex','0');
      badge.setAttribute('pointer-events','all');
      var lang=window.currentLang||'ja';
      var action=/^zh/.test(lang)?'展开列车':lang==='en'?'Show trains':'列車を展開';
      badge.setAttribute('aria-label',action+' ('+ids.length+')');
      badge.style.cursor='pointer';
      badge.style.pointerEvents='all';
      badge.style.userSelect='none';
      badge.style.outline='none';
      var plate=document.createElementNS(ns,'rect');
      plate.setAttribute('x',-16);plate.setAttribute('y',-10);
      plate.setAttribute('width',32);plate.setAttribute('height',20);
      plate.setAttribute('rx',10);plate.setAttribute('fill','#fff');
      plate.setAttribute('stroke','#64748b');
      plate.setAttribute('stroke-width','1.5');
      badge.appendChild(plate);
      var labelText=document.createElementNS(ns,'text');
      labelText.setAttribute('x',0);labelText.setAttribute('y',4);
      labelText.setAttribute('text-anchor','middle');labelText.setAttribute('font-size','12');
      labelText.setAttribute('font-weight','bold');
      labelText.setAttribute('fill','#334155');
      labelText.textContent='+'+(ids.length-1);
      badge.appendChild(labelText);
      unit.appendChild(badge);
    });
  }

  // 折叠视图是展示分组，绝不是连挂编组或合并运行。
  // 这是唯一的列车弹窗：显示地图上已有的车型/方向标签。
  function _openTrainFoldList(layer, ids, groups, markers, anchor) {
    if (layer._closeTrainFoldPopover) layer._closeTrainFoldPopover(false);
    var panel=document.createElement('div'), lang=window.currentLang||'ja';
    var titleText=/^zh/.test(lang)?'列车列表':lang==='en'?'Trains':'列車一覧';
    panel.className='rs-modal active train-fold-popover';panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label',titleText);panel.setAttribute('aria-modal','true');
    var content=document.createElement('div');content.className='rs-modal-content';
    var header=document.createElement('div');header.className='rs-modal-header';
    var heading=document.createElement('h2');heading.className='rs-modal-title';
    var close=document.createElement('button');close.className='rs-modal-close';close.textContent='×';
    close.setAttribute('aria-label',/^zh/.test(lang)?'关闭':lang==='en'?'Close':'閉じる');
    var list=document.createElement('div');list.className='rs-modal-body train-fold-list';list.setAttribute('role','list');
    header.appendChild(heading);header.appendChild(close);content.appendChild(header);content.appendChild(list);panel.appendChild(content);
    function dismiss(focus){
      panel.remove();
      if(observer)observer.disconnect();
      if(layer._trainFoldPopover===panel){layer._trainFoldPopover=null;layer._closeTrainFoldPopover=null;layer._refreshTrainFoldPopover=null;}
      if(!document.querySelector('.rs-modal.active'))document.body.classList.remove('modal-open');
      if(focus!==false){
        var badges=layer.querySelectorAll('[data-train-fold-badge]');
        if(anchor.isConnected)anchor.focus();
        else if(badges.length)badges[0].focus();
      }
    }
    var observer=typeof MutationObserver==='function'?new MutationObserver(function(){if(!layer.isConnected)dismiss(false);}):null;
    function refresh(){
      var current={}, labels={}, nodes=layer.querySelectorAll('[data-train-id]');
      for(var i=0;i<nodes.length;i++)current[nodes[i].getAttribute('data-train-id')]=nodes[i];
      // 每次刷新后重新读取标签：语言、车型和方向
      // 折叠列表打开期间可能已经发生变化。
      var captionNodes=layer.querySelectorAll('[data-train-label-for]');
      for(var j=0;j<captionNodes.length;j++)labels[captionNodes[j].getAttribute('data-train-label-for')]=captionNodes[j];
      list.textContent='';var count=0;
      ids.forEach(function(id){
        var marker=current[id], p=marker&&marker._trainPosition;
        if(!p)return;
        var label=labels[id]||groups[id];
        var captionNode=label&&label.querySelector?label.querySelector('.train-label-dir'):null;
        var captionText=captionNode&&captionNode.textContent?String(captionNode.textContent).trim():'';
        var captionType=label&&label.getAttribute?String(label.getAttribute('data-label-type')||'').trim():'';
        var popupCaption=captionType&&captionText ? captionType+' · '+captionText : captionText;
        var entry=document.createElement('div');entry.className='train-fold-entry';entry.setAttribute('role','listitem');
        // Use the SAME artwork decision as the SVG map marker; the fold list
        // neither guesses stock nor changes realtime positions. Keep two
        // distinct cells: vehicle image / service and destination.
        var lineId=marker._displayLineId || p.positionLineId || p.lineId || "";
        var markerSpec=_trainMarkerSpec(p,id,lineId);
        var iconBox=document.createElement('div');
        iconBox.className='train-fold-vehicle-icon';
        function showUnknownVehicle() {
          // Unknown stock is a text placeholder, not a misleading train picture
          // or an unlabelled 9px status dot.
          iconBox.classList.add('unresolved');
          iconBox.setAttribute('role','img');
          var unknownLabel=lang==='en'?'Vehicle unknown':/^zh/.test(lang)?'车型未确定':lang==='ko'?'차종 미확인':'車両未特定';
          iconBox.setAttribute('aria-label',unknownLabel);
          if (!iconBox.querySelector('.train-fold-vehicle-placeholder')) {
            var placeholder=document.createElement('span');
            placeholder.className='train-fold-vehicle-placeholder';
            placeholder.textContent=lang==='en'?'Unknown':/^zh/.test(lang)?'未确定':lang==='ko'?'미확인':'未特定';
            iconBox.appendChild(placeholder);
          }
        }
        var captionBase=popupCaption||
          _uetsuFoldDestinationCaption(p,lineId,lang)||
          (lang==='en'?'Direction unknown':/^zh/.test(lang)?'方向待判定':lang==='ko'?'방향 미확인':'方向未確認');
        var caption=document.createElement('div');
        caption.className='train-fold-train-info';
        // Keep the default passenger-facing service/destination summary.
        // Numbers are retained as internal matching keys, not visible UI metadata.
        caption.textContent=captionBase;
        // Gono resort variants have published dated fleet evidence, but
        // their candidate PNGs are not gallery-approved. Show the correct
        // planned livery as TEXT beside the neutral marker instead of the
        // SQL's stale GV-E400 label or an invented car front.
        if((lineId==="Gono"||lineId==="Hakushin")&&p&&
           p.officialNumberVerified===true&&
           p.positionSource==="supabase-train-run"&&
           (p.publishedGonoLivery||p.publishedHakushinServiceFamily)&&
           p.publishedFleetReference){
          var resortNote=document.createElement('small');
          resortNote.className='train-fold-fleet-reference';
          resortNote.textContent=(lang==='en'?'Scheduled fleet: ':
            lang==='ko'?'계획 차종: ':/^zh/.test(lang)?'计划车型：':'計画車種：')+
            p.publishedFleetReference;
          caption.appendChild(resortNote);
        }
        if (markerSpec.kind==='vehicle' && markerSpec.iconSrc) {
          var fleetText = _trainFoldExactVehicleLabel(p,lineId,lang) ||
            _seibuCommuterCandidatesLabel(p,lineId,lang) ||
            _shonanFleetCandidatesLabel(p,lineId,lang) ||
            _trainFleetPlanLabel(p,lineId,lang);
          var modelName=_trainFoldModelName(fleetText);
          var icon=document.createElement('img');
          icon.className='train-fold-vehicle-image';
          icon.src=markerSpec.iconSrc;
          icon.alt=modelName||(lang==='en'?'Train model icon':/^zh/.test(lang)?'车型图标':lang==='ko'?'차량 아이콘':'車両アイコン');
          icon.loading='lazy';
          if(fleetText) {
            icon.title=fleetText;
            entry.setAttribute('aria-label',captionBase+' · '+fleetText);
          }
          // Uetsu source-approved icons identify a scheduled reference
          // family, not a physically observed carset; the status must remain
          // visible even on iOS where hovering an image is not possible.
          if (lineId === "Uetsu" && fleetText) {
            var uetsuNote=document.createElement('small');
            uetsuNote.className='train-fold-fleet-reference';
            uetsuNote.textContent=fleetText;
            caption.appendChild(uetsuNote);
          }
          // The E231 PNG is only a visual representative for the shared
          // Hachiko E231/209 working. Always expose the uncertainty in the
          // folded passenger-facing list, not just as a hover title.
          if (lineId === "Hachiko" &&
              window.TrainNumberPngRanges &&
              typeof window.TrainNumberPngRanges.matchHachikoSouthCandidates === "function") {
            var hachikoIllustration = window.TrainNumberPngRanges.matchHachikoSouthCandidates(
              Object.assign({},p,{displayLineId:lineId}));
            if (hachikoIllustration && fleetText) {
              var hachikoNote = document.createElement('small');
              hachikoNote.className = 'train-fold-fleet-reference';
              hachikoNote.textContent = fleetText;
              caption.appendChild(hachikoNote);
            }
          }
          // Show the mixed-fleet warning visibly, not just on a hover.
          if (lineId === "ChuoMain" && window.TrainNumberPngRanges &&
              typeof window.TrainNumberPngRanges.matchChuoMainUnmappedReference === "function") {
            var extraFold=window.TrainNumberPngRanges.matchChuoMainUnmappedReference(
              Object.assign({},p,{displayLineId:lineId}));
            if(extraFold) {
              var extraNote=document.createElement('small');
              extraNote.className='train-fold-fleet-reference';
              extraNote.textContent=_trainFleetPlanLabel(p,lineId,lang);
              caption.appendChild(extraNote);
            }
          }
          if (lineId === "ChuoMain" && window.TrainNumberPngRanges &&
              typeof window.TrainNumberPngRanges.matchChuoMainLocalReference === "function") {
            var chuoFoldReference=window.TrainNumberPngRanges.matchChuoMainLocalReference(
              Object.assign({},p,{displayLineId:lineId}));
            if(chuoFoldReference) {
              var chuoNote=document.createElement('small');
              chuoNote.className='train-fold-fleet-reference';
              chuoNote.textContent=_trainFleetPlanLabel(p,lineId,lang);
              caption.appendChild(chuoNote);
            }
          }
          icon.onerror=function(){
            // A failed PNG must not leave a broken-image symbol in the list.
            if(icon.parentNode===iconBox)iconBox.removeChild(icon);
            showUnknownVehicle();
          };
          iconBox.appendChild(icon);
        } else {
          // Missing or failed PNG: keep one neutral marker, not an invented
          // train-front image. Number and candidate details remain readable.
          showUnknownVehicle();
          // A numbered Ito local has documented alternative families. Show
          // those names in the fold without implying a single confirmed PNG.
          if (lineId === "Ito" || lineId === "Hachiko" ||
              lineId === "SotetsuJRDirect" ||
              lineId === "ChuoMain" || lineId === "Yamagata") {
            var fleetText = _trainFleetPlanLabel(p,lineId,lang);
            if (fleetText && (lineId === "ChuoMain" || lineId === "Yamagata" ||
                /(?:^|[.:])Local$/.test(String(p.trainType || "")))) {
              var fleetNote = document.createElement('small');
              fleetNote.className = 'train-fold-fleet-reference';
              fleetNote.textContent = fleetText;
              caption.appendChild(fleetNote);
              entry.setAttribute('aria-label',captionBase+' · '+fleetText);
            }
          }
        }
        entry.appendChild(iconBox);
        entry.appendChild(caption);
        list.appendChild(entry);
        count++;
      });
      heading.textContent=titleText+' ('+count+')';
      if(!count)dismiss(false);
    }
    close.addEventListener('click',function(){dismiss(true);});
    panel.addEventListener('click',function(e){if(e.target===panel)dismiss();});
    panel.addEventListener('keydown',function(e){
      if(e.key==='Escape'){e.stopPropagation();dismiss();}
      if(e.key==='Tab'){e.preventDefault();close.focus();}
    });
    document.body.appendChild(panel);layer._trainFoldPopover=panel;layer._closeTrainFoldPopover=dismiss;
    document.body.classList.add('modal-open');layer._refreshTrainFoldPopover=refresh;refresh();
    if(layer._trainFoldPopover===panel){
      if(observer)observer.observe(document.body,{childList:true,subtree:true});
      close.focus();
    }
  }

  // 列车终点/方向标签——方向在上（7px #999）、终点在下（8px #666）
  // 根据规范车站表解析来源车站 ID；来源
  // ID 可能省略前缀或连字符。
  function _canonicalStationId(id) {
    var raw = String(id || '').split(':').pop();
    var shortId = raw.split('.').pop();
    var db = window.RailwayDB;
    if (db && typeof db.getStations === 'function') {
      try {
        var stations = db.getStations();
        if (stations && Object.prototype.hasOwnProperty.call(stations, shortId)) return shortId;
      } catch(e) {}
    }
    var aliases = window.RuntimeConfig && window.RuntimeConfig.STATION_ALIAS;
    return (aliases && (aliases[shortId] || aliases[raw])) || shortId;
  }

  function _stationKey(id) {
    return _canonicalStationId(id).replace(/[-_]/g, '').toLowerCase();
  }

  function _resolveStationLoose(id) {
    if (!id) return '';
    id = _canonicalStationId(id);
    var db = window.RailwayDB;
    var direct = (db && db.resolveStationName) ? db.resolveStationName(id, window.currentLang) : id;
    if (direct && direct !== id) return direct;
    var norm = String(id).replace(/[-_]/g, '').toLowerCase();
    var hit = '';
    if (db && typeof db.getStations === 'function') {
      try {
        var sts = db.getStations();
        for (var k in sts) {
          if (String(k).replace(/[-_]/g, '').toLowerCase() === norm) { hit = k; break; }
        }
      } catch(e) {}
    }
    if (!hit && window.UNIFIED_LINES) {
      for (var lid in window.UNIFIED_LINES) {
        var arr = (window.UNIFIED_LINES[lid] || {}).stations || [];
        for (var i = 0; i < arr.length; i++) {
          if (String(arr[i]).replace(/[-_]/g, '').toLowerCase() === norm) { hit = arr[i]; break; }
        }
        if (hit) break;
      }
    }
    if (hit && db && db.resolveStationName) {
      var name = db.resolveStationName(hit, window.currentLang);
      if (name && name !== hit) return name;
    }
    return direct;
  }

  function _trainDestText(destStation) {
    if (Array.isArray(destStation)) destStation = destStation[0] || '';
    if (destStation && typeof destStation === 'object') {
      destStation = destStation.station_urn || destStation.station_key ||
        destStation.urn || destStation.id || destStation['@id'] || '';
    }
    if (!destStation) return '';
    var value = String(destStation);
    return _resolveStationLoose(value) || value;
  }

  // 列车方向标签朝移动方向——方向端点站名在站表中位于当前位置下方＝向下▼（标签在图标下方）、
  // 上方＝向上▲（标签在图标上方）；Inbound/Outbound 按往起点/终点判断；环线 InnerLoop/OuterLoop 等无上下概念返回 null
  // 环线方向词：内回り/外回り（按语言本地化）
  var LOOP_DIR_NAMES = {
    InnerLoop: { ja: "内回り", zh: "内环", en: "Inner", ko: "내선" },
    OuterLoop: { ja: "外回り", zh: "外环", en: "Outer", ko: "외선" },
    Inner: { ja: "内回り", zh: "内环", en: "Inner", ko: "내선" },
    Outer: { ja: "外回り", zh: "外环", en: "Outer", ko: "외선" }
  };

  // 线路级显示规则由 railway_data.json 的 presentation.displayRules 提供。
  // 渲染器只负责将字符串站名规则编译为运行时正则，不再维护线路方向外挂表。
  function _escapeDisplayRuleText(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function _canonicalDisplayOverride(lineId) {
    var all = window.UNIFIED_LINES ||
      (window.RailwayDB && window.RailwayDB.getAllLines ? window.RailwayDB.getAllLines() : {});
    var presentation = all[lineId] && all[lineId].presentation;
    var rules = presentation && presentation.displayRules;
    if (!rules) return null;
    var out = {};
    if (rules.tailTrain) {
      out.tailTrain = {
        startIdx: Number(rules.tailTrain.startIndex),
        endIdx: Number(rules.tailTrain.endIndex),
        destRegex: rules.tailTrain.destinationStation
          ? new RegExp('^' + _escapeDisplayRuleText(rules.tailTrain.destinationStation) + '$', 'i') : null
      };
    }
    if (rules.tailDirection) {
      out.tailDir = {
        upDest: rules.tailDirection.upDestination
          ? new RegExp('^' + _escapeDisplayRuleText(rules.tailDirection.upDestination) + '$', 'i') : null,
        downDest: rules.tailDirection.downDestination
          ? new RegExp('^' + _escapeDisplayRuleText(rules.tailDirection.downDestination) + '$', 'i') : null
      };
    }
    if (rules.branchStation) {
      out.branchStation = {
        regex: rules.branchStation.station
          ? new RegExp('^' + _escapeDisplayRuleText(rules.branchStation.station) + '$', 'i') : null,
        dir: rules.branchStation.direction || null
      };
    }
    if (rules.directionAxis) out.dirAxis = rules.directionAxis;
    return Object.keys(out).length ? out : null;
  }
  function _getLineOverride(lineId) {
    return _canonicalDisplayOverride(lineId);
  }

  function _isLoopDirName(dirName) {
    if (!dirName) return false;
    // ODPT 可能发送 RailDirection.InnerLoop 或 odpt:RailDirection:InnerLoop。
    return !!LOOP_DIR_NAMES[String(dirName).split(/[:.]/).pop()];
  }

  // 大江户线六字形的同线开放尾段列车识别：不是独立 branchOf 支线。
  // 站表 [0]=Tochomae（环线/光丘段枢纽）、[1..10]=光丘段（西新宿五丁目→光丘，竖直开放尾）。
  // 光丘段列车虽被 ODPT 标成 InnerLoop/OuterLoop，但没有"回り"语义——应显示真实终点（光丘/都厅前）。
  function _isOedoTailTrain(lineId, p) {
    if (!p) return false;
    var _ov = _getLineOverride(lineId);
    if (!_ov || !_ov.tailTrain) return false;
    var si = p.stationIndex != null ? Number(p.stationIndex) : NaN;
    var bt = _ov.tailTrain;
    if (si >= bt.startIdx && si <= bt.endIdx) return true;
    if (si === 0) {
      var _d0 = String(p.destinationStation || '').split('.').pop();
      if (bt.destRegex && bt.destRegex.test(_d0)) return true;
    }
    return false;
  }

  function _trainMoveDir(p, lineId) {
    var indexDir = _sourceIndexTrainMoveDir(p,lineId);
    if(lineId==="TobuSkytree"&&window.UNIFIED_LINES&&
       window.UNIFIED_LINES.TobuSkytree&&
       (window.UNIFIED_LINES.TobuSkytree.stations||[])[3]==="Hikifune")
      return indexDir==="up"?"down":indexDir==="down"?"up":indexDir;
    return indexDir;
  }

  function _sourceIndexTrainMoveDir(p, lineId) {
    var dn = String(p.railDirection || '').split(/[:.]/).pop(); // 同时拆冒号和点号（odpt:RailDirection:Waseda 和 TokyoMetro.YoyogiUehara 两种格式）
    // 支线可能从来源的最后一个车站绘制（成田--我孫子）。
    // 标签跟随屏幕上的运行方向，而不是父线路的索引顺序。
    if (p.fusionRole === 'branch' && p.fusionLineId && window.UNIFIED_LINES) {
      var branch = window.UNIFIED_LINES[p.fusionLineId];
      var parent = window.UNIFIED_LINES[lineId];
      var ids = branch && branch.stations || [];
      if (ids.length > 1 && parent && ids.findIndex(function(id) {
        return (parent.stations || []).indexOf(id) >= 0;
      }) === ids.length - 1) {
        var from = Number(p.stationIndex), to = p.segmentToIndex == null ? NaN : Number(p.segmentToIndex);
        if (isFinite(from) && isFinite(to) && from !== to) return to < from ? 'down' : 'up';
        if (dn === 'Inbound') return 'down';
        if (dn === 'Outbound') return 'up';
      }
    }
    // 大江户线光丘段列车先于环线判定——tail 从都厅前竖直向上延伸到光丘，
    // 屏幕方向与站表 index 相反：往光丘=屏幕上方=▲、往都厅前=屏幕下方=▼。
    // 光丘段区间车（光丘始发→环线，dest 为环线站如 清澄白河/都厅前 而非光丘）——
    // 终点非光丘即沿光丘段往都厅前方向移动（光丘段只有往返两向），一律 ▼。
    if (_isOedoTailTrain(lineId, p)) {
      var _ovDir = _getLineOverride(lineId);
      var _dest2 = String(p.destinationStation || '').split('.').pop();
      if (_ovDir && _ovDir.tailDir && _ovDir.tailDir.upDest && _ovDir.tailDir.upDest.test(_dest2)) return 'up';
      return 'down';
    }
    // 支线站名特判（Chiyoda KitaAyase → down）
    var _ovKita = _getLineOverride(lineId);
    if (_ovKita && _ovKita.branchStation) {
      var _bsReg = _ovKita.branchStation.regex;
      if (_bsReg && _bsReg.test(dn)) return _ovKita.branchStation.dir;
    }
    // The source service may extend beyond the four visible Ueno--Shinagawa
    // stations. Never compare a projected index to the wider source station list.
    var _mapLine = window.UNIFIED_LINES && window.UNIFIED_LINES[lineId];
    var _mapStations = _mapLine && _mapLine.presentation && _mapLine.presentation.mapStations;
    if (!Array.isArray(_mapStations) || _mapStations.length < 2) _mapStations = null;
    if (_mapStations) {
      var _fromMap = p.stationIndex == null ? NaN : Number(p.stationIndex);
      var _toMap = p.segmentToIndex == null ? NaN : Number(p.segmentToIndex);
      if (isFinite(_fromMap) && isFinite(_toMap) && _fromMap >= 0 &&
          _toMap >= 0 && _fromMap < _mapStations.length &&
          _toMap < _mapStations.length && _fromMap !== _toMap)
        return _toMap > _fromMap ? 'down' : 'up';
    }
    if (/^(InnerLoop|Inner|OuterLoop|Outer)$/.test(dn)) return null;
    // 统一性——不论方位词是抽象词(Inbound/Northbound…)还是站名，优先用「终点站在本线站表中的
    // index」自动推方向：终点在当前站之后(站表 index 更大)=往站表后方开=down，否则 up。新线自动正确，
    // 不再依赖手工 DIR_AXIS_MAP 收录。终点不在本线站表(直通他线终点/无终点)时不命中，回落下方原判定。
    var _dnDest = String(p.destinationStation || '').split('.').pop();
    if (_dnDest) {
      var _curD = p.stationIndex != null ? Number(p.stationIndex) : NaN;
      if (!isFinite(_curD) || _curD < 0) return null;
      var _stsD = _mapStations || ((window.UNIFIED_LINES && window.UNIFIED_LINES[lineId]) ? (window.UNIFIED_LINES[lineId].stations || []) : []);
      var _destN = _stationKey(_dnDest);
      for (var _ddi = 0; _ddi < _stsD.length; _ddi++) {
        if (_stationKey(_stsD[_ddi]) === _destN) {
          return _ddi > _curD ? 'down' : (_ddi < _curD ? 'up' : null);
        }
      }
    }
    if (/^Inbound$/.test(dn)) return 'up';
    if (/^Outbound$/.test(dn)) return 'down';
    // 方位词用线路映射表判定（未建表线路返回 null → ▶ 兜底）
    if (/^(Northbound|Southbound|Eastbound|Westbound)$/.test(dn)) {
      var _ovDirAxis = _getLineOverride(lineId);
      var axis = (_ovDirAxis && _ovDirAxis.dirAxis && _ovDirAxis.dirAxis[dn]);
      if (axis === undefined) return null;
      return axis > 0 ? 'down' : 'up';
    }
    if (!dn) return null;
    var cur = p.stationIndex != null ? Number(p.stationIndex) : NaN;
    if (!isFinite(cur) || cur < 0) return null;
    var sts = _mapStations || ((window.UNIFIED_LINES && window.UNIFIED_LINES[lineId]) ? (window.UNIFIED_LINES[lineId].stations || []) : []);
    var normTail = _stationKey(dn);
    for (var _di = 0; _di < sts.length; _di++) {
      if (_stationKey(sts[_di]) === normTail) {
        return _di > cur ? 'down' : 'up';
      }
    }
    return null;
  }

  // Keep direction (兼容测试截取锚点；说明见下方中文注释)。
  // 无论运行方向如何，都将方向和目的地居中放在图标下方。
  function _trainLabelY(labelPos, py, moveDir) {
    if (labelPos === 'dir') return py + 21;
    return py + 32;
  }

  // 固定的移动端大江户线图：按面向乘客的完整
  // 方向绘制到既有轨道通道中。6 字形有三条轨道：
  //   开口尾部 → 轨道右侧；左环 → 环形轨道左内侧；
  //   右环 → 环形轨道右内侧。
  // 特殊几何之外返回 null；普通线路保持不变。
  function _sixTrainDirectionLane(trainLayer, p, lineId, px, py, labelW, moveDir) {
    var svg = trainLayer && trainLayer.ownerSVGElement;
    var geom = svg && svg.__geometry;
    if (!geom || !geom.isSixShapedLoop || !_isMobileView()) return null;
    var idx = p && p.stationIndex != null ? Number(p.stationIndex) : NaN;
    var station = isFinite(idx) && geom.stationCoords ? geom.stationCoords[idx] : null;
    if (!station) return null;
    var junctionX = geom.junctionX;
    var width = isFinite(Number(labelW)) ? Number(labelW) : 0;
    var isTail = _isOedoTailTrain(lineId, p);
    if (isTail) {
      // 开口尾部与环形部分属于同一条铁路，不是独立支线。
      // 标记不能遮挡尾部车站名称（名称仍位于轨道左侧）。
      var tailRailX = idx === 0 ? junctionX : station.x;
      var rightBound = junctionX - 4;
      return {
        x: Math.max(3, Math.min(tailRailX + 8, rightBound - width)),
        y: _trainLabelY("dir", py, moveDir)
      };
    }
    // 将完整的三个日文字符环行方向放入环形区域。
    // 相对列使用列车标记相反的垂直侧，
    // 因此即使内环/外环列车相邻也不会互相覆盖。
    var rightRail = geom.stationCoords[idx].side === "right";
    var x = rightRail ? junctionX + geom.loopRectW - 4 - width : junctionX + 4;
    return {
      x: Math.max(junctionX + 3,
        Math.min(x, junctionX + geom.loopRectW - width - 3)),
      y: rightRail ? py + 17 : py - 14
    };
  }

  function _trainLabelSignature(p, lineId) {
    return [
      lineId || "",
      window.currentLang || "ja",
      p && p.railDirection || "",
      p && p.destinationStation || "",
      p && p.trainType || ""
    ].join("|");
  }

  function appendTrainLabels(trainLayer, svgNS, trainUid, px, py, p, lineId) {
    var marker = trainLayer.querySelector('[data-train-id="' + String(trainUid).replace(/"/g, '') + '"]');
    var unit = _trainUnitContainer(marker);
    // Ordinary maps use marker-relative coordinates. Oedo's six-shaped
    // label lanes use absolute corridor coordinates cancelled by an inverse
    // group transform; both still belong to the same SVG train unit.
    var sixMap = !!(unit && trainLayer.ownerSVGElement &&
      trainLayer.ownerSVGElement.__geometry &&
      trainLayer.ownerSVGElement.__geometry.isSixShapedLoop);
    var unitX = px, unitY = py;
    if (unit && !sixMap) { px = 0; py = 0; }
    var moveDir = _trainMoveDir(p, lineId);
    var isLoopDir = _isLoopDirName(p.railDirection);
    var dn = String(p.railDirection || '').split(/[:.]/).pop(); // 同时拆冒号和点号（odpt:RailDirection:Waseda 和 TokyoMetro.YoyogiUehara 两种格式）
    var lang = window.currentLang || 'ja';
    // 单标签——箭头 + 方向端点站名；不再单独显示"上下行"方向词与终点。
    // 抽象方向词（Inbound/Outbound/Northbound 等无方向端点站）→ 用终点站名；环线 → 内回/外回。
    var labelText = '';
    // 大江户线光丘段列车显示真实终点（光丘/都厅前），不走环线"内回/外回"标签
    if (_isOedoTailTrain(lineId, p)) {
      // 在开口尾部，ODPT 环行标志不表示内环/外环，
      // 闭合环内的终点也不能说明这列
      // 列车正在尾部向哪个方向运行。
      var _tailDest = String(p.destinationStation || "").split(/[:.]/).pop();
      if (_tailDest)
        labelText = _trainDestText(_tailDest === "Hikarigaoka" ? "Hikarigaoka" : "Tochomae");
    } else if (isLoopDir) {
      // 环行方向是面向乘客的服务标签。destinationStation
      // 只能描述时刻表折返点/数据边界，不能覆盖
      // an authoritative InnerLoop/OuterLoop direction.
      labelText = (LOOP_DIR_NAMES[dn] && LOOP_DIR_NAMES[dn][lang]) || (LOOP_DIR_NAMES[dn] ? LOOP_DIR_NAMES[dn].ja : '');
    } else if (/^(Inbound|Outbound|Northbound|Southbound|Eastbound|Westbound)$/.test(dn)) {
      labelText = _trainDestText(p.destinationStation);
    } else if (p.destinationStation) {
      // 优先显示实际终点站（成城学园前/向丘游园/我孫子/取手等），而非方向名（代代木上原/北绫濑）
      labelText = _trainDestText(p.destinationStation);
    } else if (dn) {
      labelText = _resolveStationLoose(dn) || dn;
    }
    if (!labelText) return;
    // 折叠列表复用来源支持的服务类型和方向；
    // 地图不会打开逐列车详情面板。
    var _typeText = '';
    var _typeDef = (window.TRAIN_TYPE_NAMES || {})[p.trainType];
    if (_typeDef) _typeText = _typeDef[lang] || _typeDef.ja || '';
    if (!_typeText && p.typeName && !/^(?:odpt[.:]|[A-Za-z0-9-]+\.)/.test(p.typeName)) _typeText = p.typeName;
    // 地图标签有意只显示目的地。将来源提供的
    // 服务类型保留在 data-label-type，供下方折叠列车列表使用。
    // 保留完整的 InnerLoop/OuterLoop 及真实大江户线开口尾部方向。
    // 将标签放入预留轨道通道，而不是截断文字。
    // 地图上的所有标签只显示目的地或环行方向。
    // 环线只显示内环/外环文字，不加箭头；普通线路用 SVG path 画三角 + 终点站名
    // （▲▼ 字符在 SVG text 里不显示——字体不支持，改用 path 画）
    var dirSym = '';
    if (!isLoopDir || _isOedoTailTrain(lineId, p)) {
      dirSym = moveDir === 'down' ? 'down' : (moveDir === 'up' ? 'up' : '');
    }
    // 方向箭头+终点站为一个整体，列车图标对标这个整体的中央（X 居中）
    var _sixLane = _sixTrainDirectionLane(trainLayer, p, lineId, px, py, 0, moveDir);
    var _labelY = _sixLane ? _sixLane.y : _trainLabelY('dir', py, moveDir);
    var labelGroup = document.createElementNS(svgNS, "g");
    labelGroup.setAttribute("data-train-label-for", String(trainUid));
    labelGroup.setAttribute("data-label-pos", "dir");
    labelGroup.setAttribute("data-dir-sym", dirSym || "");
    labelGroup.setAttribute("data-label-type", _typeText || "");
    labelGroup.setAttribute("data-label-signature", _trainLabelSignature(p, lineId));
    if (_sixLane) {
      labelGroup.setAttribute("data-six-direction-visible", "true");
      // Keep direction labels transparent to pointer events.
      labelGroup.setAttribute("pointer-events", "none");
    }
    // 三角在 g 坐标系 (0, labelY)
    if (dirSym) {
      var tri = document.createElementNS(svgNS, "path");
      var triY = _labelY - 3;
      var triX = 0;
      var _tay = triY + 1.5;
      tri.setAttribute("fill", "#666");
      tri.setAttribute("stroke", "#666");
      tri.setAttribute("stroke-width", _isMobileView() ? "3.5" : "3");
      tri.setAttribute("stroke-linejoin", "round");
      var triD = dirSym === 'down'
        ? 'M ' + (triX - 3.5) + ' ' + (_tay - 2.5) + ' L ' + triX + ' ' + (_tay + 2.5) + ' L ' + (triX + 3.5) + ' ' + (_tay - 2.5) + ' Z'
        : 'M ' + (triX - 3.5) + ' ' + (_tay + 2.5) + ' L ' + triX + ' ' + (_tay - 2.5) + ' L ' + (triX + 3.5) + ' ' + (_tay + 2.5) + ' Z';
      tri.setAttribute("d", triD);
      tri.setAttribute("class", "train-label-tri");
      labelGroup.appendChild(tri);
    }
    // 文字在 g 坐标系 (8, labelY)
    var ldir = document.createElementNS(svgNS, "text");
    ldir.setAttribute("x", "8");
    ldir.setAttribute("y", String(_labelY));
    ldir.setAttribute("text-anchor", "start");
    ldir.setAttribute("font-size", _sixLane ? "9" : "8");
    ldir.setAttribute("fill", "#666");
    ldir.setAttribute("class", "train-label-dir");
    ldir.textContent = labelText;
    labelGroup.appendChild(ldir);
    // Measure in the SAME local coordinate space as the image/circle.
    // Special six-shaped maps retain their separate, stationary label lanes.
    if (unit) unit.appendChild(labelGroup);
    else trainLayer.appendChild(labelGroup);
    try {
      var _bbox = labelGroup.getBBox();
      var _offsetX = px - (_bbox.x + _bbox.width / 2);
      if (_sixLane) {
        var _actualLane = _sixTrainDirectionLane(trainLayer, p, lineId, px, py, _bbox.width, moveDir);
        _offsetX = _actualLane.x - _bbox.x;
        labelGroup.setAttribute("data-six-caption-bbox-x", String(_bbox.x));
        labelGroup.setAttribute("data-six-caption-width", String(_bbox.width));
        // 完整文字后方的浅色徽标确保列车符号仍然清晰，
        // 同时不会遮挡相邻车站名称通道。
        var _whitePlate = document.createElementNS(svgNS, "rect");
        _whitePlate.setAttribute("class", "train-direction-plate");
        _whitePlate.setAttribute("x", String(_bbox.x - 1));
        _whitePlate.setAttribute("y", String(_bbox.y - 1));
        labelGroup.setAttribute("data-six-plate-y-offset", String(_bbox.y - 1 - _labelY));
        _whitePlate.setAttribute("width", String(_bbox.width + 2));
        _whitePlate.setAttribute("height", String(_bbox.height + 2));
        _whitePlate.setAttribute("rx", "2");
        _whitePlate.setAttribute("fill", "rgba(255,255,255,0.88)");
        labelGroup.insertBefore(_whitePlate, labelGroup.firstChild);
      }
      var _groupOffset = sixMap
        ? "translate(" + (-unitX) + "," + (-unitY) + ") " : "";
      labelGroup.setAttribute("transform", _groupOffset + "translate(" + _offsetX + ",0)");
      labelGroup.setAttribute("data-label-raw-transform", _groupOffset + "translate(" + _offsetX + ",0)");
      // 缓存普通标签的居中结果，避免逐帧同步时重建 DOM。
      labelGroup.setAttribute("data-base-offset", String(-(_bbox.x + _bbox.width / 2)));
    } catch(_e) {}
  }

  // 将已创建的列车标签移动到 (px,py)，不重建 DOM。
  // 供逐帧动画循环使用，使标签跟随列车。
  function _moveTrainLabels(trainLayer, trainUid, px, py, p, lineId) {
    var label = trainLayer.querySelector('[data-train-label-for="' + String(trainUid).replace(/"/g, '') + '"]');
    if (!label) return;
    var unit = _trainUnitContainer(label);
    var sixMap = !!(unit && trainLayer.ownerSVGElement &&
      trainLayer.ownerSVGElement.__geometry &&
      trainLayer.ownerSVGElement.__geometry.isSixShapedLoop);
    var unitX = px, unitY = py;
    if (unit && !sixMap) { px = 0; py = 0; }
    var moveDir = _trainMoveDir(p, lineId);
    var _sixLane = label.getAttribute("data-six-direction-visible") === "true"
      ? _sixTrainDirectionLane(trainLayer, p, lineId, px, py,
          parseFloat(label.getAttribute("data-six-caption-width")), moveDir) : null;
    var _labelY = _sixLane ? _sixLane.y : _trainLabelY('dir', py, moveDir);
    var tri = label.querySelector('.train-label-tri');
    if (tri) {
      var dirSym = label.getAttribute('data-dir-sym') || '';
      var _tay = _labelY - 3 + 1.5;
      tri.setAttribute('d', dirSym === 'down'
        ? 'M ' + (-3.5) + ' ' + (_tay - 2.5) + ' L 0 ' + (_tay + 2.5) + ' L 3.5 ' + (_tay - 2.5) + ' Z'
        : 'M ' + (-3.5) + ' ' + (_tay + 2.5) + ' L 0 ' + (_tay - 2.5) + ' L 3.5 ' + (_tay + 2.5) + ' Z');
    }
    var txt = label.querySelector('.train-label-dir');
    if (txt) txt.setAttribute('y', String(_labelY));
    if (_sixLane) {
      var _plate = label.querySelector(".train-direction-plate");
      var _plateOffsetY = parseFloat(label.getAttribute("data-six-plate-y-offset") || "0");
      if (_plate) _plate.setAttribute("y", String(_labelY + _plateOffsetY));
    }
    var _base = parseFloat(label.getAttribute('data-base-offset') || '0');
    if (!isFinite(_base)) _base = 0;
    if (_sixLane) {
      var _bboxX = parseFloat(label.getAttribute("data-six-caption-bbox-x") || "0");
      label.setAttribute('transform', 'translate(' + (_sixLane.x - _bboxX) + ',0)');
    } else {
      label.setAttribute('transform', 'translate(' + (px + _base) + ',0)');
    }
    if (sixMap) {
      // Keep fixed six-shape corridor lanes at their world position even
      // though their image/circle is now inside the same moving wrapper.
      label.setAttribute('transform',
        'translate(' + (-unitX) + ',' + (-unitY) + ') ' + label.getAttribute('transform'));
    }
    label.setAttribute('data-label-raw-transform', label.getAttribute('transform'));
  }

  // 让标签内容与当前服务区段保持同步，同时
  // 在动画帧中保留低成本的仅移动更新。
  function _syncTrainLabels(trainLayer, svgNS, trainUid, px, py, p, lineId) {
    var existing = trainLayer.querySelector('[data-train-label-for="' + String(trainUid).replace(/"/g, '') + '"]');
    var marker = trainLayer.querySelector('[data-train-id="' + String(trainUid).replace(/"/g, '') + '"]');
    var unit = _trainUnitContainer(marker);
    // Ensure even captions from an older DOM cannot remain detached
    // from their matching artwork after an incremental update.
    if (existing && unit && existing.parentNode !== unit) {
      existing.parentNode.removeChild(existing);
      existing = null;
    }
    // 为所有有证据支持的大江户线列车恢复面向乘客的方向标签。
    // 相同的追加/移动生命周期会将它们放入预留的内部通道；
    // 绝不为了处理碰撞而隐藏整条线路的方向。
    var signature = _trainLabelSignature(p, lineId);
    if (existing && existing.getAttribute("data-label-signature") !== signature) {
      existing.parentNode.removeChild(existing);
      existing = null;
    }
    if (existing) _moveTrainLabels(trainLayer, trainUid, px, py, p, lineId);
    else appendTrainLabels(trainLayer, svgNS, trainUid, px, py, p, lineId);
  }
  
  function updateRunningInfo(el, positions) {
    var runningEl = el.querySelector('.tp-running');
    if (runningEl) {
      var running = t("trains.running");
      var cntText = t("trains.train_count");
      runningEl.innerHTML = running + " (" + positions.length + " " + cntText + ")";
    }
  }

  // 明确暴露渲染边界。页面控制器位于独立
  // IIFE 中，不得依赖传统脚本的全局查找。
  window.TrainsRender = {
    renderTrainMap: typeof renderTrainMap === "function" ? renderTrainMap : null,
    disposeTrainMap: typeof disposeTrainMap === "function" ? disposeTrainMap : null,
    updateTrainLayer: typeof updateTrainLayer === "function" ? updateTrainLayer : null,
    updateRunningInfo: typeof updateRunningInfo === "function" ? updateRunningInfo : null,
    auditRouteCanvas: auditRouteCanvas
  };
