/* trains-render.js：SVG 铁路图；列车标记仅使用图库 PNG 图片 */

// 车型身份由 TrainOperationEvidence/TrainVehicle 负责。渲染器只投影已解析结果。

// TrainMarker 展示状态（仅图片，不负责车型身份或
// 几何）。车型 PNG 加载失败时显示中性的“位置圆点”，绝不显示伪造的
// 车辆图片。已知损坏资源会在短 TTL 后重试。
var _trainArtworkFailure = {};
var _trainArtworkFailureCount = 0;
var _TRAIN_ARTWORK_FAILURE_MAX = 500;
var _TRAIN_ARTWORK_FAILURE_RETRY_MS = 45 * 1000;

function _badgeW(it, isMobile) {
  var txt = (it.name || it.lineId || "").slice(0, 4);
  return txt.length * (isMobile ? 7 : 5) + 8;
}

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
  var samePath = current && current.iconSrc && current.iconSrc === failure.path;
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

  function _renderStationNode(staticLayer, svgNS, o) {
    var color = o.color;
    var isJunction = !!o.isJunction;
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
    if (o.sharedColor && !isJunction) {
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
      staticLayer.appendChild(_bg);
      // 左半弧（金色=有乐町线色，和左边线一致）
      var _arcLeft = document.createElementNS(svgNS, "path");
      _arcLeft.setAttribute("d", "M " + _cx + " " + (_cy - _r) + " A " + _r + " " + _r + " 0 0 0 " + _cx + " " + (_cy + _r));
      _arcLeft.setAttribute("fill", "none");
      _arcLeft.setAttribute("stroke", o.sharedColor);
      _arcLeft.setAttribute("stroke-width", "2");
      staticLayer.appendChild(_arcLeft);
      // 右半弧（棕色=副都心线色，和右边线一致）
      var _arcRight = document.createElementNS(svgNS, "path");
      _arcRight.setAttribute("d", "M " + _cx + " " + (_cy - _r) + " A " + _r + " " + _r + " 0 0 1 " + _cx + " " + (_cy + _r));
      _arcRight.setAttribute("fill", "none");
      _arcRight.setAttribute("stroke", color);
      _arcRight.setAttribute("stroke-width", "2");
      staticLayer.appendChild(_arcRight);
    } else {
      var circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", o.x);
      circle.setAttribute("cy", o.y);
      // 接续点是结构参考点，不是主要视觉元素。
      // 保持可读，但避免使用过去会与主要车站列车图标竞争的
      // 大型实心圆点。
      circle.setAttribute("r", isJunction ? "9" : "7");
      circle.setAttribute("fill", "#fff");
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", isJunction ? "3" : "2");
      circle.setAttribute("data-station-index", o.si);
      staticLayer.appendChild(circle);
    }

    // 站名位置（优先使用 o.tx/o.ty/o.anchor，否则根据侧边推导）。
    var tx, ty, anchor;
    // 站名与圆点同行，垂直居中对齐（dominant-baseline central，ty=圆心）
    if (o.tx != null) { tx = o.tx; ty = o.ty; anchor = o.anchor || "start"; }
    else if (side === "top") { tx = o.x; ty = o.y - (isJunction ? 14 : 10); anchor = "middle"; }
    else if (side === "bottom") { tx = o.x; ty = o.y + (isJunction ? 19 : 15); anchor = "middle"; }
    // 移动端和桌面端：尾段及环线左侧站名保持在
    // 窄环线外侧，并由几何预留的站名车道彼此分开。
    else if (side === "left" && geometry.isSixShapedLoop && geometry.isDualLoop6) {
      tx = o.x - (isJunction ? 18 : 12);
      ty = isJunction ? o.y - 17 : o.y; // Tochomae above its connector
      anchor = "end";
    }
    else if (side === "left" && geometry.isSixShapedLoop && !geometry.isDualLoop6) { tx = o.x + (isJunction ? 14 : 10); ty = o.y; anchor = "start"; }
    else if (side === "left") { tx = o.x - (isJunction ? 14 : 10); ty = o.y; anchor = "end"; }
    else if (side === "dual") { tx = o.x - (isJunction ? 16 : 12); ty = o.y; anchor = "end"; }
    else if (side === "right" && geometry.isSixShapedLoop && !geometry.isDualLoop6) { tx = o.x - (isJunction ? 14 : 10); ty = o.y; anchor = "end"; }
    else { tx = o.x + (geometry.isSixShapedLoop ? 16 : (isJunction ? 14 : 10)); ty = o.y; anchor = "start"; }

    if (_labelAlreadyRendered) return;
    var label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", tx);
    label.setAttribute("y", ty);
    var _pcFsC = "16";
    var _pcFsJ = "16";
    var _pcFs = "16";
    var _lblCompact = (side === "top" || side === "bottom");
    label.setAttribute("font-size", _lblCompact ? (isMobileView ? "16" : _pcFsC) : (isJunction ? (isMobileView ? "16" : _pcFsJ) : (isMobileView ? "16" : _pcFs)));
    label.setAttribute("fill", isJunction ? color : "#555");
    label.setAttribute("font-family", "inherit"); // 站名用像素字体（与全局一致）
    label.setAttribute("font-weight", isJunction ? "700" : "500");
    label.setAttribute("text-anchor", anchor);
    // 左右侧站名垂直居中于圆点（top/bottom 保持基线在圆点上下方）
    if (side !== "top" && side !== "bottom") label.setAttribute("dominant-baseline", "central");
    // junction 站名转圆点上方时白描边遮线（主干竖线从文字后方穿过）
    if (o.paintOrder) {
      label.setAttribute("paint-order", o.paintOrder);
      if (o.stroke) label.setAttribute("stroke", o.stroke);
      if (o.strokeWidth) label.setAttribute("stroke-width", o.strokeWidth);
      label.setAttribute("stroke-linejoin", "round");
    }
    // 已命名走廊彼此分离，不需要不透明的白色描边。
    var _clampAvail = (side === "dual" || side === "left") ? (tx - 4) : ((side === "right") ? (svgW - 2 - tx) : 0);
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
    staticLayer.appendChild(label);

    // 换乘线路图标（在站名下方圆角背景徽章内分组）。
    if (o.skipTx) return;
    var transferMap = o.transferMap || {};
    var txLines = transferMap[o.stationId] || [];
    if (txLines.length > 0) {
      var isCompact = (side === "top" || side === "bottom");
      var ICON = 16; // 换乘图标统一 16px（与站名字号一致，用户尝试）
      var GAP = 2;
      var PER_ROW = 4;
      var MAX_ROWS = (window.RuntimeConfig && window.RuntimeConfig.TRANSFER_MAX_ROWS) || 4; // 2→3 行——JR 大站（东京/新宿）换乘超 8 条，截断致"同一套系统无法区分"
      var maxShow = PER_ROW * MAX_ROWS;
      var nonThru = txLines.filter(function(t) { return !t.through; });
      // 系统级去重：同一运营系统只显示一个徽章——
      // ①同 icon（视觉身份）：横须贺·总武快速同 JO、東海道線 JT 与干线本名
      //   TokaidoMain 同 icon → 合并；②无 icon 时按 LOS 系统键（高崎/宇都宮
      //   icon 不同 → 保留为两条独立线）
      var seenIcon = {};
      nonThru = nonThru.filter(function(t) {
        var key = t.image ? ("I:" + t.image) : (_losGroupKey(t) || ("L:" + t.lineId));
        if (seenIcon[key]) return false;
        seenIcon[key] = true;
        return true;
      });
      // JR 东系统内换乘排前（行业惯例：JR 线一组、私铁/地铁另排）——
      // 同记号系列（JK-JY）连续可辨，跨公司换乘不插队
      nonThru.sort(function(a, b) {
        var aj = a.operator === "JR-East" ? 0 : 1;
        var bj = b.operator === "JR-East" ? 0 : 1;
        return aj - bj;
      });
      var shown = nonThru.slice(0, maxShow);
      var rows = Math.ceil(shown.length / PER_ROW);
      var _rowWAt = function(r) {
        var acc = 0;
        var from = r * PER_ROW, to = Math.min((r + 1) * PER_ROW, shown.length);
        for (var k = from; k < to; k++) {
          var it = shown[k];
          acc += (it.image ? ICON : _badgeW(it, isMobileView)) + GAP;
        }
        return acc > 0 ? acc - GAP : 0;
      };
      var maxRowW = 0;
      for (var rw_ = 0; rw_ < rows; rw_++) maxRowW = Math.max(maxRowW, _rowWAt(rw_));
      var moreText = nonThru.length > maxShow ? "+" + (nonThru.length - maxShow) : "";
      var totalW = maxRowW + (moreText ? 12 : 0);
      var _setRows = function(perRow) {
        PER_ROW = perRow;
        shown = nonThru.slice(0, PER_ROW * MAX_ROWS);
        rows = Math.ceil(shown.length / PER_ROW);
        maxRowW = 0;
        for (var rw_2 = 0; rw_2 < rows; rw_2++) maxRowW = Math.max(maxRowW, _rowWAt(rw_2));
        moreText = nonThru.length > PER_ROW * MAX_ROWS ? "+" + (nonThru.length - PER_ROW * MAX_ROWS) : "";
        totalW = maxRowW + (moreText ? 12 : 0);
      };
      var ix0, iy0;
      // junction 站名在圆点上方（anchor=middle）时，换乘 chip 仍放圆点下方（ty 已上移，不能再用 ty+9/14）
      // 判据用 anchor==="middle"（junction top 模式唯一入口；普通站不传 o.anchor）
      var _jTopMode = (o.tx != null && o.anchor === "middle" && o.y != null);
      iy0 = _jTopMode ? (o.y + 14) : ((side === "top") ? (o.y + 14) : (ty + (isJunction ? 14 : 9))); // chip 在站名下方，避让圆点底缘（+2px）
      if (o.horizontalBranch) iy0 = o.labelAbove ? ty - rows * 18 - 14 : ty + (o.labelLines.length - 1) * 18 + 14;
      if (iy0 < 2) iy0 = 2;
      // 对齐规则（用户规定）：换乘图标块必须有一边与站名文字侧边对齐——
      // 站名在圆点右侧（anchor=start）→ chip 左缘=文字左缘；站名在左侧（anchor=end）→
      // chip 右缘=文字右缘；顶底站名（anchor=middle）→ chip 居中于文字。
      if (anchor === "end") { ix0 = tx - totalW; }
      else if (anchor === "start") { ix0 = tx; }
      else { ix0 = tx - totalW / 2; }
      // 居中的接续点标题不会让竖直轨道
      // 可用于放置换乘图片。将完整徽章放在两个
      // 方向标记车道之外（11px 车道 + 7px 半标记 + 6px 间距）。
      if (_jTopMode && !o.horizontalBranch) {
        ix0 = o.x + 24 + totalW <= svgW - 2 ? o.x + 24 : o.x - 24 - totalW;
      }
      if ((side === "left" || side === "dual") && ix0 < 2) {
        _setRows(3);
        ix0 = tx - totalW;
        if (ix0 < 2) {
          _setRows(2);
          ix0 = tx - totalW;
        }
        if (ix0 < 2) ix0 = 2;
      }
      if ((side === "right" || side === "dual") && ix0 + totalW > svgW - 2) {
        _setRows(3);
        ix0 = tx;
        if (ix0 + totalW > svgW - 2) {
          _setRows(2);
          ix0 = tx;
        }
        if (ix0 + totalW > svgW - 2) ix0 = svgW - 2 - totalW;
      }
      var bgH = 0;
      for (var r_ = 0; r_ < rows; r_++) {
        var _rowImg = false;
        for (var c_ = r_ * PER_ROW; c_ < Math.min((r_ + 1) * PER_ROW, shown.length); c_++) {
          if (shown[c_].image) { _rowImg = true; break; }
        }
        bgH += (_rowImg ? ICON + 2 : 15);
      }
      if (rows > 1) bgH += (rows - 1) * GAP;
      var bg = document.createElementNS(svgNS, "rect");
      bg.setAttribute("x", ix0 - 1);
      bg.setAttribute("y", iy0 - 1);
      bg.setAttribute("width", totalW + 2);
      bg.setAttribute("height", bgH);
      bg.setAttribute("rx", "3");
      bg.setAttribute("fill", "rgba(255,255,255,0.72)");
      staticLayer.appendChild(bg);
      {
        var _rowCur = null;
        for (var ti2 = 0; ti2 < shown.length; ti2++) {
          var txl = shown[ti2];
          var itemLayer = document.createElementNS(svgNS, "g");
          staticLayer.appendChild(itemLayer);
          var row = Math.floor(ti2 / PER_ROW);
          var col = ti2 % PER_ROW;
          if (col === 0) _rowCur = ix0;
          var tix = _rowCur;
          var tiy = iy0 + row * (ICON + GAP);
          if (txl.image) {
            var tImg = document.createElementNS(svgNS, "image");
            tImg.setAttribute("href", txl.image);
            tImg.setAttribute("xlink:href", txl.image);
            tImg.setAttribute("x", tix);
            tImg.setAttribute("y", tiy);
            tImg.setAttribute("width", ICON);
            tImg.setAttribute("height", ICON);
            tImg.setAttribute("opacity", "0.95");
            var tTitle = document.createElementNS(svgNS, "title");
            tTitle.textContent = window.ThroughChip.badgeText(txl);
            tImg.appendChild(tTitle);
            itemLayer.appendChild(tImg);
          } else {
            // 单行 badge——异名/站外信息放旁边小字，不撑高线路图
            var _toName = txl.toStation ? (window.RailwayDB && window.RailwayDB.resolveStationName ? window.RailwayDB.resolveStationName(txl.toStation, window.currentLang) : txl.toStation) : "";

            var _lineName = (txl.name || txl.lineId || "").slice(0, 4);
            var bW = _badgeW(txl, isMobileView);
            var bH = isMobileView ? 15 : 11;
            var bRect = document.createElementNS(svgNS, "rect");
            bRect.setAttribute("x", tix);
            bRect.setAttribute("y", tiy);
            bRect.setAttribute("width", bW);
            bRect.setAttribute("height", bH);
            bRect.setAttribute("rx", "2");
            bRect.setAttribute("fill", txl.color || (window.TrainsColors ? window.TrainsColors.LABEL_FALLBACK : "#8a8a8a"));
            itemLayer.appendChild(bRect);
            var bTxt = document.createElementNS(svgNS, "text");
            bTxt.setAttribute("x", tix + bW / 2);
            bTxt.setAttribute("y", tiy + bH / 2 + (isMobileView ? 3.2 : 2.2));
            bTxt.setAttribute("text-anchor", "middle");
            bTxt.setAttribute("font-size", isMobileView ? "9" : "6.5");
            bTxt.setAttribute("font-weight", "600");
            bTxt.setAttribute("fill", "#fff");
            bTxt.textContent = _lineName;
            itemLayer.appendChild(bTxt);

            // 只有真正的异名/异站换乘才在徽章右侧显示目标站名。
            // 同一站点或同名站不再重复挂载，避免出现“图标旁又有一个本站名”。
            var _normalizeStationLabel = function(value) {
              return String(value || "").replace(/[\s\u30fb・･\-‐‑–—]/g, "").toLowerCase();
            };
            var _sameStationId = String(txl.toStation || "").trim() === String(o.stationId || "").trim();
            var _sameStationName = _normalizeStationLabel(_toName) === _normalizeStationLabel(_sName);
            // 不同线路经常使用不同的站点 ID，不能只靠字符串判定。
            // 同一物理换乘点即使名称略有差异，也不应在徽章旁再挂一次站名。
            var _samePhysicalStation = false;
            if (!_sameStationId && txl.toStation && o.stationId &&
                window.RailwayDB && typeof window.RailwayDB.getTransferDistanceKm === "function") {
              var _transferKm = Number(window.RailwayDB.getTransferDistanceKm(o.stationId, txl.toStation));
              _samePhysicalStation = isFinite(_transferKm) && _transferKm <= 0.25;
            }
            var _sideTxt = (!_sameStationId && !_samePhysicalStation && _toName && !_sameStationName) ? _toName : "";
            if (_sideTxt) {
              var sTxt = document.createElementNS(svgNS, "text");
              sTxt.setAttribute("x", tix + bW + 3);
              sTxt.setAttribute("y", tiy + bH / 2 + (isMobileView ? 3 : 2));
              sTxt.setAttribute("font-size", isMobileView ? "7" : "5");
              sTxt.setAttribute("font-weight", "500");
              sTxt.setAttribute("fill", "#333");
              sTxt.textContent = _sideTxt;
              itemLayer.appendChild(sTxt);
            }
          }
          _rowCur += (txl.image ? ICON : _badgeW(txl, isMobileView)) + GAP;
        }
      }
      if (moreText) {
        var more = document.createElementNS(svgNS, "text");
        var moreX = ix0 + rowW + GAP;
        var moreY = iy0 + 8;
        more.setAttribute("x", moreX);
        more.setAttribute("y", moreY);
        more.setAttribute("font-size", "7");
        more.setAttribute("fill", "#777");
        more.textContent = moreText;
        staticLayer.appendChild(more);
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
          _renderThroughChip(staticLayer, svgNS, p.x, p.y, p.item, ICON, isMobileView, width);
        });
      };
      var belowY = Math.max(ty + 12, iy0 + rows * (ICON + GAP) + 4);
      // 上端头（线首 dir=up）在站上方横向一字排开、下端头（线末 dir=down）
      // 在站下方横向一字排开；中间站（dir=middle）贴圆点侧边纵向堆叠（）。
      var drawRow = function(items, x, y, align, width) {
        window.ThroughChip.layoutRow(items, isMobileView, width, x, y, align, bounds).forEach(function(p) {
          p.item._throughSide = "right";
          _renderThroughChip(staticLayer, svgNS, p.x, p.y, p.item, ICON, isMobileView, width);
        });
      };
      if (upward.length) {
        var uSizes = upward.map(function(it){ return window.ThroughChip.size(it, isMobileView, chipWidth); });
        var uMaxH = Math.max.apply(null, uSizes.map(function(s){ return s.h; }));
        drawRow(upward, o.x, o.y - 18 - uMaxH, "middle", chipWidth);
      }
      if (middle.length) {
        var mH = window.ThroughChip.height(middle, isMobileView, chipWidth);
        var _dotR = isJunction ? 9 : 7;
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

  function _discardTrainMarker(markerById, trainUid, icon) {
    if (icon._moveRaf) cancelAnimationFrame(icon._moveRaf);
    if (icon.parentNode) icon.parentNode.removeChild(icon);
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
      var text = t(hasEstimate ? "trains.estimated_note" :
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
    return ordered.filter(function(position) {
      if (_trainPositionRank(position) === 0) return true;
      var stationIndex = position && position.stationIndex != null
        ? Number(position.stationIndex) : NaN;
      return isFinite(stationIndex) && stationIndex >= 0 && stationIndex < stationCoords.length;
    });
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
      if (fromIndex == null && toIndex == null) return null;
      var projected = Object.assign({}, position);
      if (fromIndex == null) {
        projected.stationIndex = toIndex;
        projected.segmentToIndex = null;
        projected.segmentProgress = 0;
      } else {
        projected.stationIndex = fromIndex;
        projected.segmentToIndex = toIndex == null || toIndex === fromIndex ? null : toIndex;
        if (projected.segmentToIndex == null) projected.segmentProgress = 0;
      }
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
    var layer = el.querySelector('.train-layer');
    if (layer && typeof layer._closeTrainFoldPopover === 'function') layer._closeTrainFoldPopover(false);
  }

  function renderTrainMap(el, line, lineId) {
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
      
      // 从缓存获取线路几何（坐标唯一事实来源）。
      var geometry = computeRouteGeometry(displayLine, lineId);
      var stationCoords = geometry.stationCoords;
      var svgW = geometry.svgW;
      var svgH = geometry.svgH;
      // 固定六字形图：只能移动列车，不能移动 SVG 画布。
      el.classList.toggle("tp-six-fixed-map", !!geometry.isSixShapedLoop);
      var isMobileView = _isMobileView();
      var color = geometry.color;
      
      // 检查需要完整重建（线路变化）还是只更新列车层。
      // 语言属于静态层身份：切换语言必须
      // 触发完整重建（站名/换乘标题属于 i18n）。
      var existingSvg = el.querySelector('svg');
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
      svg.setAttribute("viewBox", "0 0 " + svgW + " " + svgH);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      // 像素 ×倍数部署（拓展后尺寸）——图超出容器需横向滚动，体验差。
      // 显示层改容器适配——svg width=100%，viewBox 按比例缩放完整显示，
      // 整图可见、无横向滚动；viewBox 逻辑尺寸（_baseW/_cw6）仍决定内容密度基线。
      svg.style.width = "100%";
      svg.style.height = "auto";
      svg.setAttribute("data-line-id", lineId);
      svg.setAttribute("data-lang", _lang);
      // 用于列车定位的支线几何（支线列车渲染在支线列）。
      svg.__branchGeom = geometry.branchGeom || null;
      svg.__geometry = geometry;
      
      // 背景。
      var bgRect = document.createElementNS(svgNS, "rect");
      bgRect.setAttribute("width", svgW);
      bgRect.setAttribute("height", svgH);
      bgRect.setAttribute("fill", "var(--bg)");
      bgRect.setAttribute("rx", "8");
      svg.appendChild(bgRect);
      
      // === 静态层：线路、车站、标签（每条线路只构建一次） ===
      var staticLayer = document.createElementNS(svgNS, "g");
      staticLayer.setAttribute("class", "static-layer");
      
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
        staticLayer.appendChild(svgEl);
      }
      
      // 添加车站圆点和标签（主线站与支线站统一由 _renderStationNode 绘制）
      // 支线 junction 站（岔路起点=各支线与主干的接续站）站名朝右（Tochomae 先例）——
      // 多支线全左直排时左侧水平 stub 不穿 junction 站名带；单支线（右侧）junction 保持朝左（现状）
      // junction 不再限定 stations[0]——我孫子支线 junction 成田在站表末位也命中
      var _isBranchJunction = function(_sid7) {
        if (!geometry.branchLines || geometry.branchLines.length < 2) return false;
        for (var _bj7 = 0; _bj7 < geometry.branchLines.length; _bj7++) {
          var _bl7 = geometry.branchLines[_bj7];
          if (_bl7.stations && _bl7.stations.indexOf(_sid7) >= 0) return true;
        }
        return false;
      };
      for (var si = 0; si < stationCoords.length; si++) {
        var sc = stationCoords[si];
        var stationId = sc.stationId;
        var isJunction = geometry.junctionStation && stationId === geometry.junctionStation;
        var _bJ7 = _isBranchJunction(stationId);
        // 共线区间站画双色半圆 + 自动判断共线线
        var _sharedColor = '';
        if (window.SharedTrackPairs && window.SharedTrackPairs.isSharedStation && window.SharedTrackPairs.isSharedStation(lineId, stationId)) {
          var _allL = (window.RailwayDB && window.RailwayDB.getAllLines) ? window.RailwayDB.getAllLines() : null;
          var _partners = window.SharedTrackPairs.getSharedLines(lineId) || [];
          if (_allL && _partners.length > 0) {
            _sharedColor = _allL[_partners[0]].color || '';
          }
        }
        _renderStationNode(staticLayer, svgNS, {
          x: sc.x, y: sc.y, stationId: stationId, isJunction: isJunction,
          color: geometry.stationDisplayColor ? geometry.stationDisplayColor(stationId) : color,
          si: si, side: sc.side || "right", geometry: geometry, isMobileView: isMobileView,
          svgW: svgW, svgH: svgH, transferMap: transferMap, stationCoords: stationCoords,
          labelRegistry: stationRenderRegistry,
          rS: _rS,
          sharedColor: _sharedColor,
          skipTx: false,
          tx: _bJ7 ? (geometry.rightBranch ? sc.x : (sc.x + 12)) : undefined, // 有右支线时 junction 站名转圆点上方居中
          ty: _bJ7 ? (geometry.rightBranch ? (sc.y - 16) : sc.y) : undefined, // 补漏 ty——junction 站名与圆点同行（此前漏传 ty，text y=undefined / 换乘 chip y=NaN）
          anchor: _bJ7 ? (geometry.rightBranch ? "middle" : "start") : undefined,
          paintOrder: (_bJ7 && geometry.rightBranch) ? "stroke" : undefined, // 白描边遮主干竖线
          stroke: (_bJ7 && geometry.rightBranch) ? "#ffffff" : undefined,
          strokeWidth: (_bJ7 && geometry.rightBranch) ? 3 : undefined
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
            bHLine.setAttribute("opacity", "0.5");
            staticLayer.appendChild(bHLine);
            // 支线站横排
            for (var bsiH = 0; bsiH < _bHSt.length; bsiH++) {
              var _bHx = (_bSideNow === "left")
                ? (_bHX0 - (bsiH + 1) * _bHsp)
                : (_bHX0 + (bsiH + 1) * _bHsp);
              var _bTxH = (_bSideNow === "left") ? (_bHx - 10) : (_bHx + 10);
              _renderStationNode(staticLayer, svgNS, {
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
            branchLine.setAttribute("opacity", "0.6");
            staticLayer.appendChild(branchLine);
            
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
          branchVLine.setAttribute("opacity", "0.6");
          staticLayer.appendChild(branchVLine);
          
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
              _renderStationNode(staticLayer, svgNS, {
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
          // 提取括号里的短名：丸ノ内線（方南町支線）→ 方南町支線
          var _shortName = _fullName;
          var _m = _fullName.match(/[（(](.+?)[）)]/);
          if (_m) _shortName = _m[1];
          var _bNameEl = document.createElementNS(svgNS, "text");
          _bNameEl.setAttribute("x", bx);
          _bNameEl.setAttribute("y", _connY + Math.max(0, _vOwn - 1) * branchSp + 18);
          _bNameEl.setAttribute("text-anchor", "middle");
          _bNameEl.setAttribute("font-size", "10");
          _bNameEl.setAttribute("fill", bColor);
          _bNameEl.setAttribute("font-weight", "600");
          _bNameEl.setAttribute("font-family", "inherit");
          _bNameEl.textContent = _shortName;
          staticLayer.appendChild(_bNameEl);
          } // else（竖列现状）闭合
        }
      }
      
      svg.appendChild(staticLayer);

    // === 列车层 ===
      var trainLayer = document.createElementNS(svgNS, "g");
      trainLayer.setAttribute("class", "train-layer");
      svg.appendChild(trainLayer);
      
      // 替换内容。
      // 容器内に"時刻表で推定中"等の提示を出さない——推定データはページ読込と
      // 一緒に初期化し、容器内はリアルタイムと同じ見た目に。データ出所の注記は容器外
      // （tp-est-note、下・中央）に置く。
      el.innerHTML = '<div class="tp-map-wrap"></div>';
      var _mapWrap = el.querySelector('.tp-map-wrap');
      // 六字形和普通图都以可用
      // 视口宽度的 100% 渲染。不要注入更宽的固有尺寸滚动面。
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
      // 其他线路类型保留历史溢出居中。
      // 六字形图完全包含在固定视口内。
      if (geometry.isSixShapedLoop) {
        // ODPT 刷新/语言切换时不产生横向滚动或布局跳动。
        el.scrollLeft = 0;
      } else {
        requestAnimationFrame(function () {
          try {
            var _scW = el.scrollWidth, _ccW = el.clientWidth;
            if (_scW > _ccW) el.scrollLeft = Math.round((_scW - _ccW) / 2);
          } catch (_e) { /* best-effort centering */ }
        });
      }
      
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
      
      // 在调整 viewBox 前填充动态层，使其标记和
      // 字幕边界参与可见画布计算。
      updateTrainLayer(svg, positions, stationCoords, lineId, displayLine, geometry);

      // 最终画布由实际渲染的文字/图标决定。坐标保持
      // 不变，使静态轨道和动态位置共用一套几何。
      if (staticLayer.getBBox) {
        var _contentBoxes = [staticLayer, trainLayer].map(function(layer) {
          try { return layer && layer.getBBox ? layer.getBBox() : null; } catch (_e) { return null; }
        }).filter(function(box) {
          return box && isFinite(box.x) && isFinite(box.y) && isFinite(box.width) && isFinite(box.height);
        });
        var content = _contentBoxes.length ? {
          x: Math.min.apply(null, _contentBoxes.map(function(box) { return box.x; })),
          y: Math.min.apply(null, _contentBoxes.map(function(box) { return box.y; })),
          width: 0,
          height: 0
        } : null;
        if (content) {
        var contentRight = Math.max.apply(null, _contentBoxes.map(function(box) { return box.x + box.width; }));
        var contentBottom = Math.max.apply(null, _contentBoxes.map(function(box) { return box.y + box.height; }));
        content.width = contentRight - content.x;
        content.height = contentBottom - content.y;
        var left = Math.min(0,content.x - 28), top = Math.min(0,content.y - 32);
        var right = Math.max(svgW,contentRight + 28);
        var bottom = Math.max(svgH,contentBottom + 32);
        svg.setAttribute('viewBox',[left,top,right-left,bottom-top].join(' '));
        geometry.contentBounds = {x:left,y:top,width:right-left,height:bottom-top};
        }
      }
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
    var x = px - 7;
    var y = py - 9;
    var tag = String(icon.tagName || '').toLowerCase();
    if (tag === 'circle') {
      // 即使车型未知，来源已验证的实时位置仍保持可见；
      // 这里显示的是中性位置圆点，而不是车辆图片。
      icon.setAttribute('cx', String(px));
      icon.setAttribute('cy', String(py));
      icon.removeAttribute('transform');
      icon.setAttribute('data-marker-raw-transform', '');
      return;
    }
    if (tag === 'image') {
      icon.setAttribute('x', String(x));
      icon.setAttribute('y', String(y));
      var direction = p && p.railDirection || '';
      if (!isLoop && direction.indexOf('Outbound') >= 0) {
        icon.setAttribute('transform', 'translate(' + px + ', ' + py + ') scale(-1, 1) translate(' + (-px) + ', ' + (-py) + ')');
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

  function _trainMarkerSpec(p, trainUid, lineId) {
    // TrainVehicle 是 PNG/中性标记的唯一选择权威。本模块
    // 只负责展示几何、碰撞布局和图片加载恢复。
    var artworkFailed = _isTrainArtworkFailureActive(trainUid, p);
    var artwork = window.TrainVehicle &&
      typeof window.TrainVehicle.selectMarkerArtwork === "function"
      ? window.TrainVehicle.selectMarkerArtwork(p, artworkFailed)
      : { kind: "unresolved", iconSrc: "" };
    var markerKind = artwork.kind === "vehicle" && artwork.iconSrc ? "vehicle" :
      (artwork.kind === "candidate" ? "candidate" : "unresolved");
    return {
      kind: markerKind,
      iconSrc: artwork.iconSrc || "",
      planned: artwork.planned === true,
      candidateAssets: Array.isArray(artwork.candidateAssets) ? artwork.candidateAssets.slice() : [],
      // 已认证的车型身份在地图上使用图库 PNG 绘制；
      // 没有认证车型的地点才保持为紧凑的
      // 中性圆点；位置仍然可见，不会伪造图片。
      compact: !(artwork.kind === "vehicle" && artwork.iconSrc),
      className: artwork.planned === true ? "train-icon planned" :
        (markerKind === "candidate" ? "train-icon candidate" :
          (p && p.estimated === true ? "train-icon estimated" : "train-icon"))
    };
  }

  // Public identification boundary: marker spec ends before title formatting.
  // 对外身份是计划列车号，而不是车辆的
  // 运行号/编组分配。内部 ID 和 SQL 键绝不作为标签。
  function _trainMarkerTitle(p, lineId) {
    var tip = [];
    var lang = String(window.currentLang || "ja").toLowerCase();
    var number = String((p && p.trainNumber) || "").trim();
    if (number && !/^est_/i.test(number) &&
        !/^(?:odpt[.:]|supabase:|manual-template:|planned-trip:)/i.test(number)) {
      var prefix = /^zh/.test(lang) ? "列车番号" : (lang === "en" ? "Train No." : "列車番号");
      tip.push(prefix + " " + number);
    }
    if (p && p.trainType) {
      var defs = window.TRAIN_TYPE_NAMES || {};
      var def = defs[p.trainType];
      var typeText = def ? (def[window.currentLang] || def.ja) : "";
      if (typeText) tip.push(typeText);
    }
    // 让此函数在仅折叠展示的场景下保持自包含，
    // 图片解析仍使用下方的共享投影。
    var vehicle = {
      status: p && (p.vehicleIdentityStatus ||
        (p.vehicleResolution && p.vehicleResolution.identityStatus)) || "",
      name: p && (p.vehicleType || p.trainClass ||
        (p.vehicleResolution && p.vehicleResolution.name)) || ""
    };
    if (!vehicle.status && vehicle.name) vehicle.status = "EXACT";
    // 仅向用户公开已确认车型；运用号库候选只留在内部判定链，
    // 未确认时不显示车型文字，也不把候选 PNG 冒充为当前实车。
    if (vehicle.status === "EXACT" && vehicle.name) tip.push(vehicle.name);
    else if (p && Array.isArray(p.vehicleCandidates) && p.vehicleCandidates.length) {
      var candidateText = p.vehicleCandidates.filter(function(v, i, a) {
        return v && a.indexOf(v) === i;
      }).join(" / ");
      if (candidateText) tip.push((/^zh/.test(lang) ? "车型候选 " :
        (lang === "en" ? "Possible stock " : "候補車種 ")) + candidateText);
    }
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
    var candidateVehicle = spec.kind === "candidate";
    var compact = spec.compact === true;
    // 未知车型不等于未知位置：只有精确车型身份才获得
    // 图库 PNG。其他已验证的实时/时刻表位置使用中性
    // 实心位置圆点，绝不伪造列车轮廓或车队车型。
    var markerTag = knownVehicle ? "image" : "circle";
    var marker = document.createElementNS(svgNS, compact ? "circle" : markerTag);
    if (knownVehicle && !compact) {
      marker.setAttribute("width", "14");
      marker.setAttribute("height", "18");
      marker.setAttribute("href", spec.iconSrc);
      // Safari/iOS SVG <image> 兼容性：保持 SVG2 与 XLink
      // 引用一致；此处不进行新的车辆或资产选择。
      marker.setAttributeNS("http://www.w3.org/1999/xlink", "href", spec.iconSrc);
      marker.setAttribute("preserveAspectRatio", "xMidYMid meet");
      marker.addEventListener("error", function () {
        if (!trainLayer || !trainLayer.isConnected || !marker.isConnected) return;
        var uid = marker.getAttribute("data-train-id") || "";
        if (uid) _rememberTrainArtworkFailure(uid, marker.getAttribute("href"));
        marker.setAttribute("visibility", "hidden");
        // 立即保留这列已知列车的已验证位置，
        // 不必等待图片/网络错误后的下一次 ODPT 轮询。
        var neutral = _createTrainMarker(trainLayer, svgNS, trainUid,
          {kind:"unresolved", iconSrc:"", className:spec.className},
          marker._displayX, marker._displayY, p, lineId, isLoop, color, loc);
        if (neutral && marker.parentNode) marker.parentNode.removeChild(marker);
      });
    } else {
      marker.setAttribute("r", "4.5");
      marker.setAttribute("fill", candidateVehicle ? (color || "#7c3aed") : "#666");
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
      if (candidateVehicle) {
        marker.setAttribute("data-vehicle-candidate", "true");
        marker.setAttribute("data-vehicle-candidate-assets", (spec.candidateAssets || []).join("|"));
      }
      if (knownVehicle && spec.iconSrc) marker.setAttribute("data-train-artwork", spec.iconSrc);
    }
    var titleText = _trainMarkerTitle(p, lineId);
    if (titleText) _setTrainMarkerAccessibilityLabel(marker, titleText);
    _setTrainFormationAttribute(marker, p);
    marker.setAttribute("data-train-id", String(trainUid));
    marker.setAttribute("data-marker-kind", spec.planned ? "planned" :
      (knownVehicle ? "vehicle" : (candidateVehicle ? "candidate" : "unresolved")));
    if (spec.planned) marker.setAttribute("data-marker-reference-only", "true");
    marker.setAttribute("data-marker-display", compact ? "compact" : "artwork");
    marker.setAttribute("class", spec.className);
    // 单个位置标记仅用于提供信息，不是可交互的详情按钮。
    // 折叠 +N 徽标仍是唯一的列车级弹窗操作。
    marker.setAttribute("role", "img");
    _setTrainIconPosition(marker, px, py, p, lineId, isLoop);
    marker._displayX = px;
    marker._displayY = py;
    marker._displayLineId = lineId;
    marker._trainPosition = p;
    if (loc && loc.idx != null && isFinite(Number(loc.idx))) marker._displayStationIdx = Number(loc.idx);
    if (loc && loc.nextIdx != null && isFinite(Number(loc.nextIdx))) marker._displayNextStationIdx = Number(loc.nextIdx);
    if (loc && loc.routePos != null && isFinite(Number(loc.routePos))) marker._displayRoutePos = Number(loc.routePos);
    trainLayer.appendChild(marker);
    return marker;
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
        if (_existingMarker._moveRaf) cancelAnimationFrame(_existingMarker._moveRaf);
        if (_existingMarker.parentNode) _existingMarker.parentNode.removeChild(_existingMarker);
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
      if (existingIcon && (existingIcon.getAttribute("data-marker-kind") !== markerSpec.kind ||
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
          existingIcon.setAttribute("visibility", "visible");
        }
        if (markerSpec.kind === "vehicle" && markerSpec.compact) {
          existingIcon.setAttribute("data-train-artwork", markerSpec.iconSrc || "");
        }
        // SVG 标记会跨轮询保留，但其已验证编组可能发生变化。
        // 刷新无障碍标签，不要保留过期的列车数据。
        var _freshTitle = _trainMarkerTitle(p, lineId);
        _setTrainMarkerAccessibilityLabel(existingIcon, _freshTitle);
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
          _setTrainIconPosition(existingIcon, _targetX, _targetY, p, lineId, isLoop);
          existingIcon._displayX = _targetX;
          existingIcon._displayY = _targetY;
          existingIcon._displayLineId = lineId;
          if (isFinite(_targetIdx)) existingIcon._displayStationIdx = _targetIdx;
          if (isFinite(_targetNextIdx)) existingIcon._displayNextStationIdx = _targetNextIdx;
          if (isFinite(_targetRoutePos)) existingIcon._displayRoutePos = _targetRoutePos;
          _syncTrainLabels(trainLayer, svgNS, trainUid, _targetX, _targetY, p, lineId);
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
          _syncTrainLabels(trainLayer, svgNS, trainUid, _startX, _startY, p, lineId);
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
            _setTrainIconPosition(_icon, _curX, _curY, p, lineId, isLoop);
            _moveTrainLabels(trainLayer, trainUid, _curX, _curY, p, lineId);
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
        existingIcon = _createTrainMarker(trainLayer, svgNS, trainUid, markerSpec, px, py, p, lineId, isLoop, color, loc);
        markerById[String(trainUid)] = existingIcon;
        _syncTrainLabels(trainLayer, svgNS, trainUid, px, py, p, lineId);
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
        allIcons[ii].parentNode.removeChild(allIcons[ii]);
      }
    }
    _resolveTrainLabelCollisions(trainLayer);
    if (trainLayer._refreshTrainFoldPopover) trainLayer._refreshTrainFoldPopover();
  }

  function _resolveTrainLabelCollisions(trainLayer, frameTime) {
    var svg = trainLayer && trainLayer.ownerSVGElement;
    var layout = window.TrainTrackLayout;
    if (!svg || !layout || !layout.resolveLabels ||
        (svg.__geometry && svg.__geometry.isSixShapedLoop)) return;
    if (frameTime != null && trainLayer._captionFrameTime === frameTime) return;
    if (frameTime != null) {
      // 每个标记的 RAF 都会在本帧绘制前运行；只有在最后一个移动标记
      // 同时更新图标和文字后，才解析整个图层。
      // 在第一个 RAF 中解析会让后续标记覆盖偏移量。
      if (trainLayer._captionPendingTime !== frameTime) {
        trainLayer._captionPendingTime = frameTime;
        trainLayer._captionPendingCount = 0;
        trainLayer._captionPendingTotal = 0;
        var moving = trainLayer.querySelectorAll('[data-train-id]');
        for (var a = 0; a < moving.length; a++) {
          if (moving[a]._moveRaf) trainLayer._captionPendingTotal++;
        }
      }
      trainLayer._captionPendingCount++;
      if (trainLayer._captionPendingCount < trainLayer._captionPendingTotal) return;
    }
    trainLayer._captionFrameTime = frameTime;
    var matrix = svg.getScreenCTM();
    if (!matrix || !matrix.a || !matrix.d) return;
    var oldBadges = trainLayer.querySelectorAll('[data-train-fold-badge]');
    for (var f=0;f<oldBadges.length;f++) oldBadges[f].parentNode.removeChild(oldBadges[f]);
    var labels = [], groups = {}, markers = {};
    var icons = trainLayer.querySelectorAll('[data-train-id]');
    for (var m = 0; m < icons.length; m++) {
      var icon = icons[m];
      var iconRaw = icon.getAttribute('data-marker-raw-transform') || '';
      icon.removeAttribute('display');
      if (iconRaw) icon.setAttribute('transform', iconRaw);
      else icon.removeAttribute('transform');
      markers[icon.getAttribute('data-train-id')] = icon;
    }
    var nodes = trainLayer.querySelectorAll('[data-train-label-for]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var raw = node.getAttribute('data-label-raw-transform');
      if (!raw) raw = node.getAttribute('transform') || 'translate(0,0)';
      node.removeAttribute('display');
      node.setAttribute('transform', raw);
      node.setAttribute('data-label-raw-transform', raw);
      var rect = node.getBoundingClientRect();
      var id = node.getAttribute('data-train-label-for');
      var marker = markers[id];
      if (marker && rect.width && rect.height) {
        var iconBox = marker.getBoundingClientRect();
        var left = rect.x, top = rect.y;
        var pairWidth = rect.width;
        var foldWidth = 36 * Math.abs(matrix.a);
        if (pairWidth < foldWidth) left -= (foldWidth - pairWidth) / 2;
        labels.push({id: id, x: left, y: top,
          // 位置由列车图标负责，而不是可能被移开的标签。
          anchorX: iconBox.x + iconBox.width / 2,
          anchorY: iconBox.y + iconBox.height / 2,
          minShift: -Infinity,
          maxShift: Infinity,
          width: Math.max(pairWidth, foldWidth),
          // 最后的横向避让必须让标签与它自己的标记
          // 保持水平相邻。此上限使用测量宽度，而不是
          // 线路专属常量或整张图的尺寸。
          maxNearLateralShift: Math.min(40, (pairWidth + iconBox.width) / 2 + 4),
          // 测量实际方向标签。仅在确实存在 +N 徽标时
          // 预留折叠徽标空间；给每个标签都加上该空间会使
          // 短标签不必要地超出严格的近标记限制。
          height: rect.height,
          // 如果通常的标签通道被阻挡，使用其自身固定标记的
          // 空闲侧，不要让标签远离标记。
          // 箭头和目的地仍属于同一个可见 SVG 组。
          markerSideYs: [
            iconBox.y - rect.height - 4,
            iconBox.y + iconBox.height + 4
          ],
          foldKey: String(node.getAttribute('data-dir-sym') || '')});
        groups[id] = node;
      }
    }
    var obstacles = [];
    var fixed = svg.querySelectorAll('text, .static-layer image, [data-train-id]');
    for (var j = 0; j < fixed.length; j++) {
      if (fixed[j].closest('[data-train-label-for]')) continue;
      var box = fixed[j].getBoundingClientRect();
      if (box.width && box.height) obstacles.push({x: box.x, y: box.y, width: box.width, height: box.height});
    }
    var bounds = svg.getBoundingClientRect();
    // 将方向文字保持在自身列车附近的小屏幕空间半径内。
    // 相近标签会折叠；绝不把它推向无关车站。
    var offsets = layout.resolveLabels(labels, obstacles, bounds,
      {maxShift:24, maxLateralShift:16, maxFoldAnchorDistance:44});
    var folded = {};
    Object.keys(offsets).forEach(function (id) {
      var label = groups[id], marker = markers[id], offset = offsets[id];
      if (offset.collapsedInto) {
        // 折叠方向文字不能抹除真实的列车位置标记。
        label.setAttribute('display', 'none');
        (folded[offset.collapsedInto] = folded[offset.collapsedInto] || [offset.collapsedInto]).push(id);
        return;
      }
      var shift = 'translate(' + (offset.x / matrix.a) + ',' + (offset.y / matrix.d) + ') ';
      label.setAttribute('transform', shift + label.getAttribute('data-label-raw-transform'));
      var rawMarkerTransform = marker.getAttribute('data-marker-raw-transform') || '';
      marker.setAttribute('transform', rawMarkerTransform);
    });    _syncTrainFoldBadges(trainLayer, folded, groups, markers);
  }

  function _syncTrainFoldBadges(layer, folded, groups, markers) {
    Object.keys(folded).forEach(function(id) {
      var label=groups[id], ids=folded[id], ns='http://www.w3.org/2000/svg';
      var box=label.getBBox(), cx=box.x+box.width/2, y=box.y+box.height+3;
      var badge=document.createElementNS(ns,'g');
      badge.setAttribute('data-train-fold-badge',id);
      badge.setAttribute('role','button');badge.setAttribute('tabindex','0');
       badge.setAttribute('pointer-events','all');
      var lang=window.currentLang||'ja';
      var action=/^zh/.test(lang)?'展开列车':lang==='en'?'Show trains':'列車を展開';
      badge.setAttribute('aria-label',action+' ('+ids.length+')');
       badge.style.cursor='pointer';
       // 当父级标签设置 pointer-events:none 时，SVG 命中测试可能忽略元素的
       // presentation 属性（六形线路图）。
       // 同时设置 DOM 样式，使展开操作在
       // 本地文件 Chromium 和触屏浏览器中仍可用。
       badge.style.pointerEvents='all';
       badge.style.userSelect='none';
      badge.style.outline='none'; /* no default focus ring on click */
      var plate=document.createElementNS(ns,'rect');
      plate.setAttribute('x',cx-17);plate.setAttribute('y',y);
      plate.setAttribute('width',34);plate.setAttribute('height',16);
      plate.setAttribute('rx',8);plate.setAttribute('fill','#fff');
      plate.setAttribute('stroke','#64748b');badge.appendChild(plate);
      var text=document.createElementNS(ns,'text');
      text.setAttribute('x',cx);text.setAttribute('y',y+11);
      text.setAttribute('text-anchor','middle');text.setAttribute('font-size','10');
      text.setAttribute('fill','#334155');text.textContent='+'+(ids.length-1);badge.appendChild(text);
       var openedAt=0;
       function open(e) {
         // 支持 Pointer 的浏览器会在 pointerdown 后触发 click；保留
         // click 监听器作为兼容性兜底，但不能重复打开。
         if (e && e.type === 'click' && Date.now() - openedAt < 500) return;
         if (e && e.type === 'pointerdown') openedAt=Date.now();
         if (e && e.stopPropagation) e.stopPropagation();
         if (e && e.preventDefault) e.preventDefault();
         _openTrainFoldList(layer,ids,groups,markers,badge);
       }
       // 在动画帧替换此 SVG 徽标前激活；click
       // 覆盖 pointerdown 未传递到 SVG 组的浏览器/本地文件路径，
       // 仍可完成操作。
       badge.addEventListener('pointerdown',open);
       badge.addEventListener('click',open);
      badge.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')open(e);});
      label.appendChild(badge);
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
        var symbol=label&&label.getAttribute?label.getAttribute('data-dir-sym'):'';
        var arrow=symbol==='up'?'▲ ':symbol==='down'?'▼ ':'';
        var entry=document.createElement('div');entry.className='train-fold-entry';entry.setAttribute('role','listitem');
        var caption=document.createElement('div');
        caption.textContent=arrow+(popupCaption||(lang==='en'?'Direction unknown':/^zh/.test(lang)?'方向待判定':lang==='ko'?'방향 미확인':'方向未確認'));
        entry.appendChild(caption);list.appendChild(entry);
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
    return _canonicalStationId(id).replace(/-/g, '').toLowerCase();
  }

  function _resolveStationLoose(id) {
    if (!id) return '';
    id = _canonicalStationId(id);
    var db = window.RailwayDB;
    var direct = (db && db.resolveStationName) ? db.resolveStationName(id, window.currentLang) : id;
    if (direct && direct !== id) return direct;
    var norm = String(id).replace(/-/g, '').toLowerCase();
    var hit = '';
    if (db && typeof db.getStations === 'function') {
      try {
        var sts = db.getStations();
        for (var k in sts) {
          if (String(k).replace(/-/g, '').toLowerCase() === norm) { hit = k; break; }
        }
      } catch(e) {}
    }
    if (!hit && window.UNIFIED_LINES) {
      for (var lid in window.UNIFIED_LINES) {
        var arr = (window.UNIFIED_LINES[lid] || {}).stations || [];
        for (var i = 0; i < arr.length; i++) {
          if (String(arr[i]).replace(/-/g, '').toLowerCase() === norm) { hit = arr[i]; break; }
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
    if (/^(InnerLoop|Inner|OuterLoop|Outer)$/.test(dn)) return null;
    // 统一性——不论方位词是抽象词(Inbound/Northbound…)还是站名，优先用「终点站在本线站表中的
    // index」自动推方向：终点在当前站之后(站表 index 更大)=往站表后方开=down，否则 up。新线自动正确，
    // 不再依赖手工 DIR_AXIS_MAP 收录。终点不在本线站表(直通他线终点/无终点)时不命中，回落下方原判定。
    var _dnDest = String(p.destinationStation || '').split('.').pop();
    if (_dnDest) {
      var _curD = p.stationIndex != null ? Number(p.stationIndex) : NaN;
      if (!isFinite(_curD) || _curD < 0) return null;
      var _stsD = (window.UNIFIED_LINES && window.UNIFIED_LINES[lineId]) ? (window.UNIFIED_LINES[lineId].stations || []) : [];
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
    var sts = (window.UNIFIED_LINES && window.UNIFIED_LINES[lineId]) ? (window.UNIFIED_LINES[lineId].stations || []) : [];
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
    // append 后用 getBBox 居中在 px
    trainLayer.appendChild(labelGroup);
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
      labelGroup.setAttribute("transform", "translate(" + _offsetX + ",0)");
      labelGroup.setAttribute("data-label-raw-transform", "translate(" + _offsetX + ",0)");
      // 缓存普通标签的居中结果，避免逐帧同步时重建 DOM。
      labelGroup.setAttribute("data-base-offset", String(-(_bbox.x + _bbox.width / 2)));
    } catch(_e) {}
  }

  // 将已创建的列车标签移动到 (px,py)，不重建 DOM。
  // 供逐帧动画循环使用，使标签跟随列车。
  function _moveTrainLabels(trainLayer, trainUid, px, py, p, lineId) {
    var label = trainLayer.querySelector('[data-train-label-for="' + String(trainUid).replace(/"/g, '') + '"]');
    if (!label) return;
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
    label.setAttribute('data-label-raw-transform', label.getAttribute('transform'));
  }

  // 让标签内容与当前服务区段保持同步，同时
  // 在动画帧中保留低成本的仅移动更新。
  function _syncTrainLabels(trainLayer, svgNS, trainUid, px, py, p, lineId) {
    var existing = trainLayer.querySelector('[data-train-label-for="' + String(trainUid).replace(/"/g, '') + '"]');
    var _sixMap = trainLayer && trainLayer.ownerSVGElement &&
      trainLayer.ownerSVGElement.__geometry &&
      trainLayer.ownerSVGElement.__geometry.isSixShapedLoop;
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
    updateRunningInfo: typeof updateRunningInfo === "function" ? updateRunningInfo : null
  };

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
      } else {
        toIdx = moveDir === "up" ? Math.max(0, idx - 1) : Math.min(points.length - 1, idx + 1);
      }
    }

    var progress = position && position.segmentProgress != null ? clamp(position.segmentProgress, 0, 1) : 0;
    var a = points[idx] || { x: 0, y: 0 };
    var b = points[toIdx] || a;
    var basePt = progress > 0 && toIdx !== idx ? interpolate(a, b, progress) : { x: a.x, y: a.y };
    var canonicalIdx = Math.min(Math.max(0, idx), Math.max(0, points.length - 2));
    var t = toIdx === idx ? tangentAt(points, canonicalIdx, canonicalIdx + 1)
      : tangentAt(points, idx, toIdx);
    return { point: basePt, idx: idx, nextIdx: toIdx, tangent: t, points: points };
  }

  function resolvedMoveDir(position, base, lineId, opts, geometry) {
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
    var laneGap = opts.laneGap || DEFAULTS.laneGap;
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

