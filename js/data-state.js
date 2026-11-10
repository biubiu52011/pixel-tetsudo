/**
 * Pixel Tetsudo - 统一数据状态模块
 * 统一的数据状态管理 + 线路列表编排
 * 供 realtime.html 和 trains.html 共享使用
 */
(function() {
  "use strict";

  // ========== 状态定义 ==========
  var STATUS_META = {
    normal:    { icon: "\u25cb", cls: "rs-status-icon-normal",    label: "normal"    },
    info:      { icon: "\uff01", cls: "rs-status-icon-notice",    label: "info"      },
    notice:    { icon: "\uff01", cls: "rs-status-icon-notice",    label: "notice"    },
    delayed:   { icon: "\u25b3", cls: "rs-status-icon-delayed",  label: "delayed"   },
    suspended: { icon: "\u00d7", cls: "rs-status-icon-suspended", label: "suspended" },
    no_data:   { icon: "?", cls: "rs-status-icon-no-data",   label: "no_data"  },
    no_odpt:   { icon: "\u2014", cls: "rs-status-icon-no-odpt",   label: "no_odpt"  },
    loading:   { icon: "\u2026", cls: "rs-status-icon-loading",   label: "loading"  }
  };

  // ========== 内部状态 ==========
  var _lines = {};
  var _positions = {};
  var _listeners = [];
  var _initialized = false;

  // ========== 辅助函数 ==========
  function escapeHtml(s) {
    if (!s) return "";
    if (typeof s !== "string") return "";
    if (s.indexOf("&") < 0 && s.indexOf("<") < 0 && s.indexOf(">") < 0 && s.indexOf('"') < 0 && s.indexOf("'") < 0) return s;
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Identity and status presentation are owned by LineCard below.
  // The state store deliberately does not duplicate those rules.

  function t(key) {
    return (typeof window.t === "function") ? window.t(key) : (key || "");
  }

  // 已移除 tLine：改用 RailwayDB.resolveLineName(lineId, lang)。

  function tOp(name) {
    return (window.tOp && window.tOp(name)) || name || "";
  }

  // ========== 渲染函数 ==========

  /**
   * realtime/trains 列表容器共用的页面级状态渲染器。
   * 保持不同页面的加载、空态、错误语义和 DOM 结构一致。
   */
  function renderPageState(container, state, messageKey) {
    if (!container) return;
    var key = messageKey || (state === "loading" ? "status.loading"
      : state === "render_error" ? "status.display_unavailable"
      : state === "fetch_error" ? "status.load_error"
      : state === "timeout" ? "status.timeout"
      : state === "offline" ? "status.offline"
      : "status.fetch_unavailable");
    var message = t(key);
    container.dataset.pageState = state;
    container.dataset.pageStateKey = key;
    if (state === "loading") {
      container.innerHTML = '<div class="rs-loading" role="status" aria-live="polite"><div class="rs-loading-spinner" aria-hidden="true"></div><span data-i18n="' + escapeHtml(key) + '">' + escapeHtml(message) + '</span></div>';
      return;
    }
    var cls = state === "render_error" || state === "fetch_error" || state === "error" ? "rs-error" : "rs-empty";
    var detailKey = state === "render_error" ? "status.display_unavailable_hint"
      : state === "fetch_error" ? "status.load_error_hint"
      : state === "timeout" ? "status.timeout_hint"
      : state === "offline" ? "status.offline_hint"
      : "status.fetch_unavailable_hint";
    container.innerHTML = '<div class="' + cls + '" role="status" aria-live="polite">'
      + '<div data-i18n="' + escapeHtml(key) + '">' + escapeHtml(message) + '</div>'
      + '<div class="rs-state-hint" data-i18n="' + detailKey + '">' + escapeHtml(t(detailKey)) + '</div>'
      + '<button type="button" class="rs-state-retry" data-i18n="status.retry">' + escapeHtml(t("status.retry")) + '</button>'
      + '</div>';
    var retry = container.querySelector(".rs-state-retry");
    if (retry) retry.addEventListener("click", function() {
      if (retry.disabled) return;
      retry.disabled = true;
      var fallbackReload = function() { window.location.reload(); };
      if (typeof container._pageStateRetry === "function") {
        try {
          var result = container._pageStateRetry();
          if (result && typeof result.then === "function") {
            result.catch(function(err) {
              console.error("[DataState] page retry failed", err);
              fallbackReload();
            });
          }
          return;
        } catch (err) {
          console.error("[DataState] page retry failed", err);
          fallbackReload();
          return;
        }
      }
      fallbackReload();
    });
  }

  function railwayStateHosts() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-state-host="railway-lines"]'));
  }

  function setRailwayHostState(state) {
    railwayStateHosts().forEach(function(container) { renderPageState(container, state); });
  }

  function initRailwayStateHosts() {
    var hosts = railwayStateHosts();
    if (!hosts.length) return;
    hosts.forEach(function(container) {
      if (!container.dataset.pageState && !container.children.length) renderPageState(container, "loading");
    });
    window.addEventListener("pt:railway-error", function() {
      setRailwayHostState(navigator.onLine === false ? "offline" : "fetch_error");
    });
  }

  function setPageStateRetry(container, callback) {
    if (!container) return;
    container._pageStateRetry = typeof callback === "function" ? callback : null;
  }

  // 共享状态所有者负责加载、单航班重试和终态错误；控制器只描述如何渲染恢复后的数据。
  function setRailwayPageRetry(container, onReady) {
    var pending = null;
    setPageStateRetry(container, function() {
      if (pending) return pending;
      renderPageState(container, "loading");
      pending = Promise.resolve().then(function() {
        if (!window.DataLoader || typeof window.DataLoader.retry !== 'function') throw new Error('DataLoader retry unavailable');
        return window.DataLoader.retry();
      }).then(function() {
        if (!window.UNIFIED_LINES || !Object.keys(window.UNIFIED_LINES).length) throw new Error('Canonical railway data unavailable after retry');
        return onReady();
      }).catch(function(err) {
        renderPageState(container, navigator.onLine === false ? 'offline' : 'fetch_error');
        console.error('[DataState] railway recovery failed', err);
      }).finally(function() { pending = null; });
      return pending;
    });
  }

  var _automaticRecoveryPending = false;
  function retryVisibleFailedStates() {
    if (_automaticRecoveryPending || navigator.onLine === false ||
        !window.DataLoader || typeof window.DataLoader.retry !== "function") return;
    var containers = Array.prototype.slice.call(document.querySelectorAll("[data-page-state]")).filter(function(container) {
      return ["offline", "fetch_error", "timeout"].indexOf(container.dataset.pageState) !== -1 &&
        typeof container._pageStateRetry === "function";
    });
    if (!containers.length) return;
    // online/pageshow 同时触发时也只执行一次共享重试。
    // 复用页面已登记的回调，不新增并行加载器。
    _automaticRecoveryPending = true;
    try {
      var result = containers[0]._pageStateRetry();
      if (result && typeof result.then === "function") {
        Promise.resolve(result).then(function() {
          _automaticRecoveryPending = false;
        }, function(err) {
          _automaticRecoveryPending = false;
          console.error("[DataState] automatic recovery failed", err);
        });
      } else {
        _automaticRecoveryPending = false;
      }
    } catch (err) {
      _automaticRecoveryPending = false;
      console.error("[DataState] automatic recovery failed", err);
    }
  }

  /**
   * 按运营商分组渲染完整线路列表。
   * @param {HTMLElement} container - 目标 DOM 元素
   * @param {Object} linesObj - 线路 ID → 线路数据映射
   * @param {Object} options - { mode, lineOrder }
   */
  // 干线本名（非運行系統）不进线路一览；数据保留作换乘锚点/支线父线
  var TRUNK_MAIN_LINE_IDS = (window.RuntimeConfig && window.RuntimeConfig.TRUNK_MAIN_LINE_IDS) || [];

  function getPresentationStatusMembers(memberIds, mode, linesObj, primaryId) {
    if (!Array.isArray(memberIds)) return [];
    return window.LinePresentationService.getStatusMembers(memberIds, mode, linesObj, primaryId || memberIds[0]);
  }

  // 公共 LineList 行为：页面控制器不得直接操作运营商分组。
  function setOperatorVisibility(container, operator) {
    if (!container) return false;
    var groups = container.querySelectorAll(".rs-operator-group[data-operator]");
    if (!groups.length) return false;
    Array.prototype.forEach.call(groups, function(group) {
      var visible = !operator || group.getAttribute("data-operator") === operator;
      group.style.display = visible ? "" : "none";
    });
    return true;
  }

  function filterLinesByOperator(lines, operator) {
    if (!operator) return lines || {};
    var filtered = {};
    Object.keys(lines || {}).forEach(function(id) {
      var line = lines[id];
      if (!line) return;
      var matches = operator === "JR-East"
        ? (window.TransitConstants && window.TransitConstants.isJRERoute
          ? window.TransitConstants.isJRERoute(line) : line.operator === "JR-East")
        : line.operator === operator;
      if (matches) filtered[id] = line;
    });
    return filtered;
  }

  function renderList(container, linesObj, options) {
    if (!container) return;
    if (!linesObj || typeof linesObj !== "object" || Object.keys(linesObj).length === 0) {
      container.innerHTML = '<div class="rs-empty">' + (typeof window.t === "function" ? window.t("status.no_trains") : "No data") + '</div>';
      return;
    }
    // A real rendered list must not retain the loading/error marker.
    container.removeAttribute("data-page-state");
    container.removeAttribute("data-page-state-key");
    options = options || {};
    var mode = options.mode || "realtime";
    var flatGroups = options.flatGroups === true;
    // 服务走廊默认不显示：trains.html 可以显示面向乘客的走廊卡片，
    // realtime.html 则保持来源所有权不变。
    var lineOrder = options.lineOrder || (window.LinePresentationService ? window.LinePresentationService.getDisplayOrder(window.UNIFIED_LINES, {
      includeServiceCorridors: options.includeServiceCorridors === true
    }) : []);

    var insertMap = {};
    for (var i = 0; i < lineOrder.length; i++) { insertMap[lineOrder[i]] = i; }

    var groups = {};
    var opOrder = [];
    var ids = Object.keys(linesObj);
    for (var i = 0; i < ids.length; i++) {
      var lid = ids[i];
      var line = linesObj[lid];
      if (!line) continue;
      if (((window.RuntimeConfig || {}).SERVICE_CORRIDOR_LINES || {})[lid] && !options.includeServiceCorridors) continue;
      // 只有被正式定义为独立的乘客线路才拥有单独卡片。
      if (window.LinePresentationService && typeof window.LinePresentationService.isIndependentLine === "function" &&
          !window.LinePresentationService.isIndependentLine(lid, linesObj)) continue;
      // 国鉄幹線本名（类比京沪铁路/成渝铁路）不是運行系統：中央本線/東海道本線/東北本線 不进入线路一览，
      // 数据保留作换乘锚点/支线父线。
      if (TRUNK_MAIN_LINE_IDS.indexOf(lid) >= 0) continue;
      var op = line.operator || "Unknown";
      if (!groups[op]) {
        groups[op] = [];
        opOrder.push(op);
      }
      groups[op].push({ id: lid, line: line, sortIdx: insertMap[lid] !== undefined ? insertMap[lid] : 99999 });
    }

    // 使用统一的 LinePresentationService 比较器排序运营商分组
    // （全局顺序 JR > Metro > Private > Other），未知运营商追加到末尾。
    if (window.LinePresentationService && typeof window.LinePresentationService.orderOperators === "function") {
      opOrder = window.LinePresentationService.orderOperators(opOrder);
    } else {
      var knownOps = (window.TransitConstants && window.TransitConstants.OP_ORDER) || [];
      var unknownOps = opOrder.filter(function(op){ return knownOps.indexOf(op) === -1; });
      opOrder = knownOps.filter(function(op){ return groups[op]; }).concat(unknownOps);
    }

    // 在每个运营商组内按 lineOrder 排序 fallback 线路。
    var presentationOrderMap = (window.LinePresentationService && window.UNIFIED_LINES)
      ? window.LinePresentationService.getDisplayOrderMap(window.UNIFIED_LINES) : {};
    for (var op in groups) {
      if (groups.hasOwnProperty(op)) {
        groups[op].sort(function(a, b) {
          var idxA = a.sortIdx;
          var idxB = b.sortIdx;
          if (idxA !== idxB) return idxA - idxB;
          var pA = presentationOrderMap[a.id] !== undefined ? presentationOrderMap[a.id] : 99999;
          var pB = presentationOrderMap[b.id] !== undefined ? presentationOrderMap[b.id] : 99999;
          return pA - pB;
        });
      }
    }

    var html = "";
    for (var o = 0; o < opOrder.length; o++) {
      var op = opOrder[o];
      html += '<div class="rs-operator-group" data-operator="' + escapeHtml(op) + '"><div class="rs-operator-title">' + escapeHtml(tOp(op)) + '</div>'
        + (flatGroups ? '' : '<div class="rs-cards-container">');
      // 按统一展示顺序精确渲染。主展示实体占用自己的排序位置；
      // 只有主记录渲染后才抑制成员记录。所有可见主展示实体
      // 均使用整数排序值，不给被聚合的成员线路单独分配 UI 排名。
      var covered = {};
      for (var k = 0; k < groups[op].length; k++) {
        var g = groups[op][k];
        if (covered[g.id]) continue;
        var pres = (window.LinePresentationService && window.LinePresentationService.getPrimaryPresentation)
          ? window.LinePresentationService.getPrimaryPresentation(g.id, linesObj)
          : null;
        if (pres) {
          var memberIds = getPresentationStatusMembers(window.LinePresentationService.getPresentationMembers(g.id, linesObj), mode, linesObj, g.id);
          if (memberIds.length > 0) {
            memberIds.forEach(function(id) { covered[id] = true; });
            html += window.LineCard.renderSystem(pres, memberIds, linesObj, { mode: mode });
            continue;
          }
        }
        html += window.LineCard.render(g.line, g.id, { mode: mode, linesObj: linesObj });
      }
      html += flatGroups ? "</div>" : "</div></div>";
    }
    container.innerHTML = html;
    // 通过 DOM API 应用线路颜色（符合 CSP，不依赖 style-src 白名单）。
    Array.prototype.slice.call(container.querySelectorAll('.rs-line-card')).forEach(window.LineCard.applyColor);
  }


  // ========== 数据管理 ==========

  function setLines(lines, changes) { _lines = lines || {}; notify(changes); }
  function setPositions(positions) { _positions = positions || {}; notify(); }

  function getLine(lineId) { return _lines[lineId] || null; }
  function getPositions(lineId) { return _positions[lineId] || []; }

  function subscribe(listener) {
    if (_listeners.indexOf(listener) === -1) {
      _listeners.push(listener);
      try { listener(_lines, null, _positions); } catch(e) {}
    }
  }

  function unsubscribe(listener) {
    var idx = _listeners.indexOf(listener);
    if (idx >= 0) _listeners.splice(idx, 1);
  }

  function notify(changes) {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](_lines, null, _positions, changes); } catch(e) {}
    }
  }

  function initLangSupport() {
    if (typeof window.onLanguageChange === "function") {
      window.onLanguageChange(function() {
        // 融合数据与语言无关。翻译在 DataState/视图渲染器中进行，
        // 因此切换语言不得触发全网重新融合。
        notify();
      });
    }
  }

  // 运营商筛选属于共享铁路状态层。将其生命周期放在这里，
  // 可以移除页面专属入口，而不与某个列表渲染器耦合。
  function operatorSort(ops) {
    var fallback = (ops || []).slice().sort();
    try {
      var ordered = window.LinePresentationService && typeof window.LinePresentationService.orderOperators === "function"
        ? window.LinePresentationService.orderOperators(ops) : null;
      return Array.isArray(ordered) && ordered.length === fallback.length ? ordered : fallback;
    } catch (e) { return fallback; }
  }

  function operatorsFromLines(lines) {
    var found = {};
    if (Array.isArray(lines)) {
      lines.forEach(function(line) { if (line && line.operator) found[line.operator] = true; });
    } else {
      Object.keys(lines || {}).forEach(function(id) {
        var line = lines[id];
        if (line && line.operator) found[line.operator] = true;
      });
    }
    return operatorSort(Object.keys(found));
  }

  function operatorLabel(op) {
    try {
      var translated = tOp(op);
      if (translated && translated !== op) return translated;
      return window.TransitConstants && typeof window.TransitConstants.operatorLabel === "function"
        ? window.TransitConstants.operatorLabel(op) : op;
    } catch (e) { return op; }
  }

  function createOperatorFilter(containerOrId, opts) {
    opts = opts || {};
    var el = typeof containerOrId === "string" ? document.getElementById(containerOrId) : containerOrId;
    var selected = opts.selected || null;
    var lastOptionsSignature = null;
    function available(value) {
      if (!el) return;
      el.classList.toggle("hidden", !value);
      el.setAttribute("aria-hidden", value ? "false" : "true");
    }
    function select(value, notifyChange) {
      selected = value || null;
      if (el) {
        Array.prototype.slice.call(el.querySelectorAll(".rs-filter-btn")).forEach(function(button) {
          var active = (button.dataset.operator || null) === selected;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        if (notifyChange !== false) {
          try {
            el.dispatchEvent(new CustomEvent("pt:operator-filter-change", { detail: { operator: selected } }));
          } catch (e) {}
        }
      }
      return selected;
    }
    function render(lines) {
      if (!el) return;
      var availableOps = operatorsFromLines(lines);
      if (!availableOps.length) {
        if (el.innerHTML) el.innerHTML = "";
        lastOptionsSignature = null;
        available(false);
        return;
      }
      available(true);
      var optionsSignature = (t("filter.all") || "All") + "\u0001" +
        availableOps.map(function(op) { return op + "\u0002" + operatorLabel(op); }).join("\u0001");
      if (optionsSignature === lastOptionsSignature &&
          el.querySelectorAll(".rs-filter-btn").length === availableOps.length + 1) {
        select(selected, false);
        return;
      }
      lastOptionsSignature = optionsSignature;
      var html = '<button type="button" class="rs-filter-btn' + (selected === null ? ' active' : '')
        + '" data-operator="" aria-pressed="' + (selected === null ? 'true' : 'false') + '">'
        + (t("filter.all") || "All") + "</button>";
      availableOps.forEach(function(op) {
        html += '<button type="button" class="rs-filter-btn' + (selected === op ? ' active' : '')
          + '" data-operator="' + escapeHtml(op) + '" aria-pressed="' + (selected === op ? 'true' : 'false') + '">'
          + operatorLabel(op) + "</button>";
      });
      el.innerHTML = html;
      Array.prototype.slice.call(el.querySelectorAll(".rs-filter-btn")).forEach(function(button) {
        button.addEventListener("click", function() { select(button.dataset.operator || null, true); });
      });
    }
    return { render: render, setAvailable: available, setSelected: select,
      getSelected: function() { return selected; }, getElement: function() { return el; } };
  }

  var operatorFilterMounted = {};
  function mountOperatorFilter(id, opts) {
    if (operatorFilterMounted[id]) return operatorFilterMounted[id];
    operatorFilterMounted[id] = createOperatorFilter(id, opts || {});
    return operatorFilterMounted[id];
  }

  function autoMount() {
    var page = document.body && document.body.dataset ? document.body.dataset.page : "";
    var id = page === "realtime" ? "realtimeFilterBar" : page === "trains" ? "trainsFilterBar" : null;
    if (id && document.getElementById(id)) mountOperatorFilter(id, {});
  }

  // ========== 公共 API ==========
  window.DataState = {
    STATUS_META: STATUS_META,
    TRUNK_MAIN_LINE_IDS: TRUNK_MAIN_LINE_IDS,
    renderList: renderList,
    // 供 LineCard.updateSystem 共用，使异步实时更新使用相同的成员集合。
    getPresentationStatusMembers: getPresentationStatusMembers,
    setOperatorVisibility: setOperatorVisibility,
    filterLinesByOperator: filterLinesByOperator,
    renderPageState: renderPageState,
    setPageStateRetry: setPageStateRetry,
    setRailwayPageRetry: setRailwayPageRetry,
    localizeInterval: function(str) { return window.LineCard.localizeInterval(str); },
    getLineIdentity: function(line, lineId) { return window.LineCard.getLineIdentity(line, lineId); },
    setLines: setLines,
    setPositions: setPositions,
    getLine: getLine,
    getPositions: getPositions,
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    init: function() {
      if (_initialized) return;
      _initialized = true;
      if (window.UNIFIED_LINES) setLines(window.UNIFIED_LINES);

      window.addEventListener("pt:railway-ready", function() {
        if (window.UNIFIED_LINES) setLines(window.UNIFIED_LINES);
      });

      // 移动版 Chrome 可能从 BFCache 恢复冻结页面，或恢复网络但不再次触发 DOMContentLoaded。
      // 页面恢复可用后，立即通过已有页面重试回调恢复可见的失败状态。
      window.addEventListener("online", retryVisibleFailedStates);
      window.addEventListener("pageshow", function(event) {
        if (event.persisted) retryVisibleFailedStates();
      });

      if (window.DataFusion) {
        var fused = window.DataFusion.getFusedData();
        if (fused && fused.lines) setLines(fused.lines);
        window.DataFusion.subscribe(function(fd, changes) {
          if (fd && fd.lines) setLines(fd.lines, changes);

        });
      }
      initRailwayStateHosts();
      initLangSupport();
    }
  };

  window.OperatorFilterBar = {
    create: createOperatorFilter,
    mount: mountOperatorFilter,
    get: function(id) { return operatorFilterMounted[id] || null; },
    operatorsFromLines: operatorsFromLines
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() { window.DataState.init(); autoMount(); });
  } else {
    window.DataState.init();
    autoMount();
  }
})();


/*
 * LineCard / SystemCard 的所有权归 DataState 列表状态。
 * 两者由 realtime 和 trains 共用，并在 DOMContentLoaded 之前初始化。
 */
/**
 * Pixel Tetsudo - canonical LineCard / SystemCard 组件。
 * 负责 realtime + trains 的卡片 DOM 模板和卡片内部更新。
 */
(function() {
  "use strict";

  // One canonical status catalog, shared with the DataState store.
  var STATUS_META = window.DataState.STATUS_META;
  function escapeHtml(s) {
    if (!s || typeof s !== "string") return "";
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function getDelayInfo(line) {
    if (line && line.delayInfo) return line.delayInfo;
    if (line && line.status) return {status:line.status,interval:line.interval,cause:line.cause};
    return null;
  }
  function getLineIdentity(line,lineId) {
    line=line||{};
    if (window.LinePresentationService && window.LinePresentationService.getLineIdentity) {
      var identity=window.LinePresentationService.getLineIdentity(lineId, { [lineId]: line });
      if (identity) return identity.sourceKey;
    }
    if (line.lineIdentity && line.lineIdentity.key) return String(line.lineIdentity.key);
    var operator=line.operator||"", railwayCode="";
    if (window.ODPTClient && window.ODPTClient.LINE_RAILWAY_CODE && lineId) railwayCode=window.ODPTClient.LINE_RAILWAY_CODE[lineId]||"";
    return operator && railwayCode ? String(operator)+"::"+String(railwayCode) : "";
  }
  function getStatus(status) { return STATUS_META[status] || STATUS_META.no_data; }
  function cardActionLabel(mode, status) {
    if (mode === "realtime") return t("status." + status);
    var names = { ja: "路線を表示", zh: "查看线路", ko: "노선 보기", en: "View line" };
    return names[window.currentLang || "ja"] || names.ja;
  }
  function t(key) { return typeof window.t==="function" ? window.t(key) : (key||""); }
  // Source-neutral interval display: map official Japanese station names to
  // canonical station IDs before asking RailwayDB for the selected language.
  // Keep the original name when an ID is absent or ambiguous.
  var _affectedStationI18nRef = null, _affectedStationIndex = null;
  function affectedStationIndex() {
    var i18n = window.RAILWAY_I18N || {};
    if (_affectedStationI18nRef === i18n && _affectedStationIndex) return _affectedStationIndex;
    var index = Object.create(null);
    Object.keys(i18n).forEach(function(id) {
      var ja = i18n[id] && i18n[id].ja;
      if (!ja) return;
      if (Object.prototype.hasOwnProperty.call(index,ja) && index[ja] !== id)
        index[ja] = null; // Same Japanese label: require line-scoped evidence.
      else if (!Object.prototype.hasOwnProperty.call(index,ja))
        index[ja] = id;
    });
    _affectedStationI18nRef = i18n;
    _affectedStationIndex = index;
    return index;
  }
  function localizeStationName(name, lineId) {
    var raw = String(name || "").trim();
    var lang = window.currentLang || "ja";
    if (!raw || lang === "ja") return raw;
    var canonical = raw.replace(/駅$/,"");
    var db = window.RailwayDB;
    if (!db || typeof db.resolveStationName !== "function") return raw;
    var lineStations = db.getLineStations && lineId ? db.getLineStations(lineId) : null;
    var scopedId = null, ambiguous = false;
    if (Array.isArray(lineStations)) lineStations.forEach(function(id) {
      if (id === canonical || db.resolveStationName(id,"ja") === canonical) {
        if (scopedId && scopedId !== id) ambiguous = true;
        scopedId = id;
      }
    });
    if (ambiguous) return raw;
    var ids = affectedStationIndex();
    var id = scopedId || (Object.prototype.hasOwnProperty.call(ids,canonical) ? ids[canonical] : null);
    if (!id) return raw;
    var localized = db.resolveStationName(id,lang);
    return localized || raw; // The translated English name may equal the canonical ID.
  }
  function localizeInterval(str,lineId) {
    if (!str) return str;
    var lang = window.currentLang || "ja", raw = String(str);
    if (lang === "ja") return raw;
    return raw.split(/(、)/).map(function(fragment) {
      if (fragment === "、") return lang === "en" ? ", " : fragment;
      var range = fragment.match(/^\s*(.+?)\s*(→|↔|〜|～)\s*(.+?)\s*$/);
      if (range) return localizeStationName(range[1],lineId) + range[2] +
        localizeStationName(range[3].replace(/駅間$/,""),lineId);
      var direction = fragment.match(/^\s*(.+?)方面\s*$/);
      if (direction) {
        var station = localizeStationName(direction[1],lineId);
        var toward = t("status.toward");
        return lang === "en" ? String(toward || "toward").trim() + " " + station :
          station + (toward || "方面");
      }
      return fragment;
    }).join("");
  }
  // 没有官方 PNG 路线记号时使用短名称徽章；绝不把内部 lineId 当成线路代码展示。
  function neutralLineBadgeText(name, fallback) {
    var text = String(name || fallback || "?").trim();
    return text.slice(0, 4) || "?";
  }
  // 所有 JR 旅客公司的地方线使用统一的备选线路徽章。
  // 正式线路记号/图片始终优先；新干线不作为地方线套用。
  var JR_GROUP_BADGE_IMAGE = "../images/鉄道/JR東日本/JRグループ.png";
  function isJRRegionalFallback(line, operator, lineId) {
    line = line || {};
    var op = String(line.operator || operator || "").replace(/[\s_-]/g, "").toUpperCase();
    var isJRE = !!(window.TransitConstants && window.TransitConstants.isJRERoute &&
      window.TransitConstants.isJRERoute(line));
    if (!isJRE && !/^JR(?:EAST|CENTRAL|WEST|HOKKAIDO|SHIKOKU|KYUSHU)$/.test(op)) return false;
    var name = [lineId || "", line.name || "", line.nameJa || "", line.nameEn || ""].join(" ");
    return !/(?:shinkansen|新幹線)/i.test(name);
  }
  function jrGroupBadgeHtml() {
    return '<div class="rs-line-icon-fallback"><img src="' +
      escapeHtml(JR_GROUP_BADGE_IMAGE) + '" alt="JR" loading="lazy"></div>';
  }
  // 系统级状态聚合的严重度等级（数值越大越严重）。
  function statusRank(s) {
    if (s === "suspended") return 5;
    if (s === "delayed") return 4;
    if (s === "notice") return 3.5;
    if (s === "info") return 3;
    if (s === "no_odpt") return 3;
    if (s === "loading") return 2;
    if (s === "no_data") return 2;
    if (s === "normal") return 1;
    return 0;
  }

  /**
   * 渲染运行系统卡片（一个 LOS 条目对应一张卡片）。
   * @param {Object} sys - LOS 系统条目 { code, nameJa/nameZh/nameEn/nameKo, color, lineIds }
   * @param {Array} memberIds - 当前视图中的数据库线路 ID
   * @param {Object} linesObj - 线路 ID → 线路数据映射
   * @param {Object} options - { mode: "realtime"|"trains" }
   */
  function renderSystemCard(sys, memberIds, linesObj, options) {
    options = options || {};
    var mode = options.mode || "realtime";
    var lang = window.currentLang || "ja";
    var name = sys.nameJa || "";
    if (lang === "zh" && sys.nameZh) name = sys.nameZh;
    else if (lang === "en" && sys.nameEn) name = sys.nameEn;
    else if (lang === "ko" && sys.nameKo) name = sys.nameKo;
    var color = sys.color || "#00b643";
    var code = sys.code || "";

    // 聚合成员线路中最严重的状态，作为卡片级图标。
    var worst = null;
    var firstId = null;
    var allLoop = false;
    var intervalSegments = []; // 收集所有线路的起终点用于合并
    for (var i = 0; i < memberIds.length; i++) {
      var lid = memberIds[i];
      if (firstId === null) firstId = lid;
      var line = linesObj[lid] || {};
      var dInfo = getDelayInfo(line) || {};
      var status = dInfo.status ? dInfo.status : "loading";
      // 只有所有成员都确认正常时，系统卡片才能声明正常。
      // 除非真实故障具有更高优先级，否则保留 loading/no-data 状态。
      if (!worst) worst = status;
      else if ((status === "loading" || status === "no_data" || status === "no_odpt") && worst === "normal") worst = status;
      else if (!(worst === "loading" || worst === "no_data" || worst === "no_odpt") && statusRank(status) > statusRank(worst)) worst = status;
      else if ((worst === "loading" || worst === "no_data" || worst === "no_odpt") && status !== "normal" && statusRank(status) > 3) worst = status;
      if (mode === "trains") {
      var cardInterval = sys.cardInterval || null;
      var stations = cardInterval ? [] : (line.stations || []);
        // 环线（山手线 / 大江户线）没有有意义的起终点：图上的首末站在环上相邻，
        // 会误导用户（山手线图形顺序从东京→有乐町开始）。跳过这些线路；
        // 纯环线卡片在下方回退显示“環状”。
        var isLoopLine = !!(line.isDoubleColumnLoop || line.isSixShapedLoop);
        if (isLoopLine) allLoop = true;
        if (cardInterval && cardInterval.from && cardInterval.to) {
          intervalSegments.push({ from: cardInterval.from, to: cardInterval.to });
        } else if (stations.length >= 2 && !isLoopLine) {
          var baseOrigin = line.presentation && line.presentation.originStation;
          intervalSegments.push({ from: baseOrigin && stations.indexOf(baseOrigin) >= 0 ? baseOrigin : stations[0], to: stations[stations.length - 1] });
        }
      }
    }
    // 合并连续线路的区间（前一条终点 == 后一条起点）
    // 卡片副标题只描述面向乘客的线路区间。
    // 直通服务/subName 元数据属于关系徽章/详情，不得替换起点和终点。
    var chipsHtml = "";
    if (mode === "trains" && intervalSegments.length === 0 && allLoop) {
      // 整张卡片只有环线时，显示“環状”，不显示没有意义的首末站区间
      // （山手线/大江户线 LOS 卡片）。
      chipsHtml = '<span class="rs-sys-chip">' + escapeHtml(t('line.loop')) + '</span>';
    } else if (mode === "trains" && intervalSegments.length > 0) {
      var merged = [intervalSegments[0]];
      for (var si = 1; si < intervalSegments.length; si++) {
        var prev = merged[merged.length - 1];
        var curr = intervalSegments[si];
        if (prev.to === curr.from) {
          // 连续，合并：起点保持，终点更新，中间站记录
          prev.to = curr.to;
          prev.mid = (prev.mid ? prev.mid + "↔" : "") + curr.from;
        } else {
          merged.push(curr);
        }
      }
      for (var mi = 0; mi < merged.length; mi++) {
        var seg = merged[mi];
        var sFromName = (window.RailwayDB && window.RailwayDB.resolveStationName) ? window.RailwayDB.resolveStationName(seg.from, lang) || seg.from : seg.from;
        var sToName = (window.RailwayDB && window.RailwayDB.resolveStationName) ? window.RailwayDB.resolveStationName(seg.to, lang) || seg.to : seg.to;
        var midText = "";
        if (seg.mid) {
          var midStations = seg.mid.split("↔");
          var midNames = [];
          for (var msi = 0; msi < midStations.length; msi++) {
            var midName = (window.RailwayDB && window.RailwayDB.resolveStationName) ? window.RailwayDB.resolveStationName(midStations[msi], lang) || midStations[msi] : midStations[msi];
            midNames.push(escapeHtml(midName));
          }
          midText = midNames.join("↔") + "↔";
        }
        var intervalText = escapeHtml(sFromName) + "↔" + midText + escapeHtml(sToName);
        chipsHtml += '<span class="rs-sys-chip">' + intervalText + '</span>';
      }
    }
    // Most systems have exactly one interval; omit its redundant wrapper.
    // Keep the wrapper for genuine multi-interval systems.
    var rangeHtml = chipsHtml;
    if (chipsHtml && chipsHtml.indexOf('</span><span class="rs-sys-chip">') === -1) {
      rangeHtml = chipsHtml.replace('class="rs-sys-chip"', 'class="rs-system-lines rs-sys-chip"');
    } else if (chipsHtml) {
      rangeHtml = '<div class="rs-system-lines">' + chipsHtml + '</div>';
    }
    var worstS = getStatus(worst);
    var statusHtml = "";
    if (mode === "realtime") {
      statusHtml = '<span class="rs-status-icon ' + worstS.cls + '" aria-hidden="true">' + worstS.icon + '</span>';
    }

    // 优先使用正式线路图标；JR 各社无正式记号的地方线共享彩色 JR 徽章。
    var iconHtml = "";
    if (sys.icon) {
      if (String(sys.icon).indexOf("JRグループ.png") !== -1) {
        iconHtml = '<div class="rs-line-icon-fallback"><img src="' + escapeHtml(sys.icon) + '" alt="JR" loading="lazy"></div>';
      } else {
        iconHtml = '<img class="rs-line-icon" src="' + escapeHtml(sys.icon) + '" alt="" loading="lazy">';
      }
    } else {
      var _firstLine = memberIds.length > 0 ? (linesObj[memberIds[0]] || {}) : {};
      var _firstLineIcon = _firstLine.image && !/(グループ|ロゴ|マーク|アイコン|シンボル)/.test(_firstLine.image) ? _firstLine.image : "";
      if (_firstLineIcon) {
        iconHtml = '<img class="rs-line-icon" src="' + escapeHtml(_firstLineIcon) + '" alt="" loading="lazy">';
      } else if (isJRRegionalFallback(_firstLine, sys.operator, memberIds[0])) {
        iconHtml = jrGroupBadgeHtml();
      } else {
        iconHtml = '<div class="rs-system-badge">' + escapeHtml(neutralLineBadgeText(name, code)) + '</div>';
      }
    }
    var _memberIdentities = [];
    for (var _mi = 0; _mi < memberIds.length; _mi++) {
      var _mid = memberIds[_mi];
      _memberIdentities.push(_mid + "=" + getLineIdentity(linesObj[_mid] || {}, _mid));
    }
    return '<div class="rs-line-card rs-system-card" role="button" tabindex="0" aria-label="' + escapeHtml(name + ' · ' + cardActionLabel(mode, worst)) + '" data-line="' + escapeHtml(firstId) + '" data-line-identity="' + escapeHtml(getLineIdentity(linesObj[firstId] || {}, firstId)) + '" data-line-identities="' + escapeHtml(_memberIdentities.join("|")) + '" data-system="' + escapeHtml(code) + '" data-lines="' + escapeHtml(memberIds.join(",")) + '" data-line-color="' + escapeHtml(color) + '">'
      + iconHtml
      + '<div class="rs-line-info">'
      + '<div class="rs-line-name">' + escapeHtml(name) + '</div>'
      + (mode === "trains" ? rangeHtml : '')
      + '</div>'
      + statusHtml
      + '</div>';
  }

  /**
   * 渲染单条线路卡片。
   * @param {Object} line - 线路数据对象
   * @param {String} lineId - 线路标识
   * @param {Object} options - { mode: "realtime"|"trains" }
   */
  function renderCard(line, lineId, options) {
    options = options || {};
    var mode = options.mode || "realtime";
    var linesObj = options.linesObj || window.UNIFIED_LINES || {};
    var delayInfo = getDelayInfo(line) || {};
    var status = delayInfo && delayInfo.status ? delayInfo.status : "loading";
    var interval = delayInfo.interval || "";
    var _presentation = (window.LinePresentationService && window.LinePresentationService.getPresentation)
      ? window.LinePresentationService.getPresentation(lineId, linesObj || window.UNIFIED_LINES)
      : null;
    var lineColor = (_presentation && _presentation.color) || line.color || "#00b643";
    var displayName = (window.RailwayDB && window.RailwayDB.resolveLineName) ? window.RailwayDB.resolveLineName(lineId, window.currentLang) : (line.nameEn || line.name || lineId);
    // 回退：RailwayDB 不可用（例如测试环境）时使用原始字段。

    // 图标。
    var iconHtml = "";
    // 运营商通用标志（如 JRグループ.png）不是线路图标；
    // 跳过它们，避免单线路卡片借用其他运营商的标志。
    var _losIcon = (_presentation && _presentation.icon) || "";
    var _imgOk = _losIcon || (line.image && !/(グループ|ロゴ|マーク|アイコン|シンボル)/.test(line.image));
    if (_losIcon) {
      if (String(_losIcon).indexOf("JRグループ.png") !== -1) {
        iconHtml = '<div class="rs-line-icon-fallback"><img src="' + escapeHtml(_losIcon) + '" alt="JR"></div>';
      } else {
        iconHtml = '<img class="rs-line-icon" src="' + escapeHtml(_losIcon) + '" alt="" loading="lazy">';
      }
    } else if (_imgOk) {
      iconHtml = '<img class="rs-line-icon" src="' + escapeHtml(line.image) + '" alt="" loading="lazy">';
    } else if (isJRRegionalFallback(line, "", lineId)) {
      iconHtml = jrGroupBadgeHtml();
    } else {
      // 无 PNG 时只显示当前语言的短线路名；不把内部 lineId/line.code 冒充官方记号。
      var osCode = (_presentation && _presentation.code) || "";
      iconHtml = '<div class="rs-code-badge">' + escapeHtml(neutralLineBadgeText(displayName, osCode || line.symbol)) + '</div>';
    }

    // 区间文本（realtime 模式）。
    var intervalHtml = "";
    if (mode === "realtime" && interval) {
      intervalHtml = '<div class="rs-line-interval">' + escapeHtml(localizeInterval(interval,lineId)) + '</div>';
    }

    // 状态图标。
    var s = getStatus(status);
    var statusIconHtml = "";
    if (mode === "realtime") {
      statusIconHtml = '<span class="rs-status-icon ' + s.cls + '" aria-hidden="true">' + s.icon + '</span>';
    }
    // 线路区间副标题（trains 模式）：始终描述本线路的起点/终点。
    // presentation.subName 是关系/展示元数据，不得替换线路区间。
    var subHtml = "";
    if (mode === "trains") {
      var intervalText = "";
      try {
        var stations = (window.RailwayDB && window.RailwayDB.getLineStations) ? window.RailwayDB.getLineStations(lineId) : [];
        // 环线（山手线/大江户线）的图形首末站在环上相邻，容易误导用户，
        // 因此显示“環状”。
        var _isLoop = !!(line && (line.isDoubleColumnLoop || line.isSixShapedLoop));
        if (_isLoop) {
          intervalText = t('line.loop');
        } else if (stations && stations.length >= 2) {
          var lang = window.currentLang || 'ja';
          var resolveName = (window.RailwayDB && window.RailwayDB.resolveStationName) ? window.RailwayDB.resolveStationName : null;
          if (resolveName) {
            var baseOrigin = line.presentation && line.presentation.originStation;
            var origin = baseOrigin && stations.indexOf(baseOrigin) >= 0 ? baseOrigin : stations[0];
            var first = resolveName(origin, lang) || origin;
            var last = resolveName(stations[stations.length - 1], lang) || stations[stations.length - 1];
            intervalText = first + '\u2194 ' + last;
          }
        }
      } catch(e) {}
      if (intervalText) {
        subHtml = '<div class="rs-line-interval">' + escapeHtml(intervalText) + '</div>';
      }
    }

    // Running-chain identity is internal; no passenger-facing relation badge.
    return '<div class="rs-line-card" role="button" tabindex="0" aria-label="' + escapeHtml(displayName + ' · ' + cardActionLabel(mode, status)) + '" data-line="' + escapeHtml(lineId) + '" data-line-identity="' + escapeHtml(getLineIdentity(line, lineId)) + '" data-line-color="' + escapeHtml(lineColor) + '">'
      + '<div class="rs-line-header">'
      + iconHtml
      + '<div class="rs-line-info">'
      + '<div class="rs-line-name">' + escapeHtml(displayName) + '</div>'
      + subHtml
      + intervalHtml
      + '</div>'
      + statusIconHtml
      + '</div>'
      + '</div>';
  }

  function elementFromHtml(html) {
    var wrap=document.createElement("div"); wrap.innerHTML=html||""; return wrap.firstElementChild||null;
  }
  function applyColor(card) {
    if (!card) return;
    var color=card.getAttribute("data-line-color");
    if (color) card.style.setProperty("--line-color",color);
  }
  function renderSystemById(primaryId,linesObj,options) {
    var service=window.LinePresentationService;
    var sys=service && service.getPrimaryPresentation(primaryId,linesObj);
    if (!sys) return "";
    var members=service.getPresentationMembers(primaryId,linesObj);
    if (window.DataState && window.DataState.getPresentationStatusMembers) {
      members=window.DataState.getPresentationStatusMembers(members,(options&&options.mode)||"realtime",linesObj,primaryId);
    }
    return members.length ? renderSystemCard(sys,members,linesObj,options||{mode:"realtime"}) : "";
  }
  function update(card,line,lineId,options) {
    if (!card || !line) return false;
    options=options||{};
    var fresh=elementFromHtml(renderCard(line,lineId,options));
    if (!fresh) return false;
    applyColor(fresh);
    if ((options.mode||"realtime")!=="realtime") { card.replaceWith(fresh); return true; }
    // Realtime patches retain DOM identity; refresh the accessible label too.
    card.setAttribute("aria-label", fresh.getAttribute("aria-label") || "");
    var oldStatus=card.querySelector(".rs-status-icon"), newStatus=fresh.querySelector(".rs-status-icon");
    if (oldStatus && newStatus) { oldStatus.className=newStatus.className; oldStatus.textContent=newStatus.textContent; }
    else if (oldStatus && !newStatus) oldStatus.remove();
    else if (!oldStatus && newStatus) { var header=card.querySelector(".rs-line-header"); if(header) header.appendChild(newStatus); }
    var oldInterval=card.querySelector(".rs-line-interval"), newInterval=fresh.querySelector(".rs-line-interval");
    if (oldInterval && newInterval) oldInterval.textContent=newInterval.textContent;
    else if (oldInterval && !newInterval) oldInterval.remove();
    else if (!oldInterval && newInterval) { var info=card.querySelector(".rs-line-info"); if(info) info.appendChild(newInterval); }
    return true;
  }
  function updateSystem(card,linesObj,options) {
    if (!card || !linesObj) return false;
    var fresh=elementFromHtml(renderSystemById(card.dataset.line||"",linesObj,options||{mode:"realtime"}));
    if (!fresh) return false;
    applyColor(fresh);
    var wasFocused = document.activeElement === card;
    if (card.classList.contains("selected")) fresh.classList.add("selected");
    card.replaceWith(fresh);
    if (wasFocused && typeof fresh.focus === "function") fresh.focus();
    return true;
  }

  window.LineCard = {
    render: renderCard,
    renderSystem: renderSystemCard,
    renderSystemById: renderSystemById,
    update: update,
    updateSystem: updateSystem,
    applyColor: applyColor,
    localizeInterval: localizeInterval,
    localizeStationName: localizeStationName,
    getLineIdentity: getLineIdentity
  };
})();

