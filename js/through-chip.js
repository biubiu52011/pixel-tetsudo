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

  var _measureCache = Object.create(null);
  var _fontCacheSignature = "";

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
  function _measureWidth(label, fontSize, fontWeight) {
    var weight = Number(fontWeight) || 400;
    var hasDOM = typeof document !== "undefined" && !!document.body;
    var family = hasDOM && typeof getComputedStyle === "function"
      ? getComputedStyle(document.body).fontFamily : "";
    var lang = hasDOM
      ? ((document.documentElement && document.documentElement.lang) || window.currentLang || "ja")
      : "";
    var fontStatus = hasDOM && document.fonts ? document.fonts.status : "";
    var signature = lang + "|" + family + "|" + fontStatus + "|" + hasDOM;
    if (signature !== _fontCacheSignature) {
      _measureCache = Object.create(null);
      _fontCacheSignature = signature;
    }
    var key = fontSize + "|" + weight + "|" + label;
    if (_measureCache[key] != null) return _measureCache[key];
    var fallback = _estimateWidth(label, fontSize);
    if (!hasDOM) return fallback;
    var svg = null;
    try {
      var ns = "http://www.w3.org/2000/svg";
      svg = document.createElementNS(ns, "svg");
      var node = document.createElementNS(ns, "text");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      svg.style.left = "-9999px";
      svg.style.top = "-9999px";
      svg.style.visibility = "hidden";
      svg.style.fontFamily = family;
      node.setAttribute("font-family", "inherit");
      node.setAttribute("font-size", fontSize);
      node.setAttribute("font-weight", String(weight));
      node.style.fontSynthesis = "none";
      node.textContent = label;
      svg.appendChild(node);
      document.body.appendChild(svg);
      var measured = Math.ceil(node.getComputedTextLength ? node.getComputedTextLength() : fallback);
      _measureCache[key] = measured > 0 ? measured : fallback;
      return _measureCache[key];
    } catch (e) {
      return fallback;
    } finally {
      if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
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
      // A selected limited-express connection is a route relationship, not
      // a generic all-trains through-service claim. Keep its label to the
      // destination line name; the serviceScope remains in canonical data.
      if (lineObj.throughScope !== "selected-limited-express" &&
          lineObj.throughScope !== "selected-local-destination-only") {
        var thru = window.t ? window.t("train.throughService", "相互直通運転") : "相互直通運転";
        base = base + "（" + thru + "）";
      }
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
      // Skytree's source array runs Asakusa -> Tobu-Dobutsu-Koen, while
      // its passenger map deliberately places Tobu-Dobutsu-Koen at the
      // TOP. Endpoint through arrows must follow the painted map, not the
      // opposite source-index order; interior Oshiage/Hibiya joins stay
      // governed by the existing canonical join rule.
      var reverseSkytreeMap = lineId === "TobuSkytree" &&
        sts2.length > 4 && sts2[0] === "Asakusa" &&
        sts2[3] === "Hikifune" &&
        sts2[sts2.length - 1] === "Tobu-Dobutsu-Koen";
      // Oshiage is the physical lower endpoint of the right-hand Y spur,
      // even though it remains index 2 in the canonical train/SQL route.
      // Its Hanzomon chip belongs BELOW that branch terminal, not beside
      // the station name as a middle-join arrow.
      if (reverseSkytreeMap && stationId === "Oshiage" &&
          targetId === "Hanzomon") return "down";
      if (idx2 === 0) return reverseSkytreeMap ? "down" : "up";
      if (idx2 === sts2.length - 1) return reverseSkytreeMap ? "up" : "down";
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
    txt.setAttribute("font-weight", "400");
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
