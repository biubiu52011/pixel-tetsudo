/*
 * Pixel Tetsudo - 列车位置页面控制器
 * - 从 railway_data.json 加载 stations/durations + line-control.js 元数据
 */
(function() {
  "use strict";
  var currentLine = null;
  var currentLineIdentity = "";
  var listEl = null;
  var detailEl = null;
  var titleEl = null;
  var filterBarEl = null;
  var _filterBar = null;
  var mapEl = null;
  var backBtn = null;
  var _selectedOperator = null;

  function _renderTrainMap(el, line, lineId, renderOptions) {
    if (!window.TrainsRender || typeof window.TrainsRender.renderTrainMap !== "function") {
      throw new Error("trains-render.js did not register window.TrainsRender");
    }
    return window.TrainsRender.renderTrainMap(el, line, lineId, renderOptions);
  }

  var _lastPositionsHash = '';
  var _lastDetailStateHash = '';
  var _realtimeExpiryTimer = null;
  var currentSystemLineIds = null;
  var t = window.t || function(k) { return k; };
  var escapeHtml = window.escapeHtml || function(s) {
    if (!s) return "";
    if (typeof s !== "string") return "";
    if (s.indexOf("&") < 0 && s.indexOf("<") < 0 && s.indexOf(">") < 0 && s.indexOf('"') < 0 && s.indexOf("'") < 0) return s;
    var d = document.createElement("div"); d.textContent = s; return d.innerHTML;
  };

  // === GEOM 设计令牌（由 trains-data.js 提供） ===
  var GEOM = window.TrainsConfig.GEOM;

  // 色块徽章宽度（无图标线的统一徽章，）
  // 徽章文字改线名（当前语言）而非记号——HAC 等记号普通用户看不懂，
  // 图片徽章内含线名可读，色块徽章同理显示线名（截 4 字）

  
  function _systemIdsForRoute(lineId) {
    if (!lineId) return null;
    var lines = getLinesData();
    var ids = (window.LinePresentationService && window.LinePresentationService.getPresentationMembers)
      ? window.LinePresentationService.getPresentationMembers(lineId, lines) : [];
    if (ids.length > 1) return ids.slice();
    return null;
  }

  function _scheduleRealtimeExpiryRefresh(lineId, fusedLine) {
    if (_realtimeExpiryTimer) {
      clearTimeout(_realtimeExpiryTimer);
      _realtimeExpiryTimer = null;
    }
    if (!lineId || !fusedLine || !Array.isArray(fusedLine.realtimePositions)) return;
    var now = Date.now();
    var nextExpiry = 0;
    getRealtimePositions(lineId).forEach(function(p) {
      if (!p || p.positionSource !== "realtime-api" || !p.sourceValidUntil) return;
      var ts = Date.parse(p.sourceValidUntil);
      if (!isNaN(ts) && ts >= now && (!nextExpiry || ts < nextExpiry)) nextExpiry = ts;
    });
    if (!nextExpiry) return;
    // 在最近的 ODPT dct:valid 边界之后立即重新渲染一次。
    // 即使尚未收到新的 API
    // 快照，渲染器也会过滤过期的实时记录。
    _realtimeExpiryTimer = setTimeout(function() {
      _realtimeExpiryTimer = null;
      if (currentLine !== lineId || !detailEl || detailEl.classList.contains("hidden")) return;
      if (window.DataFusion && window.DataFusion.loadTrainPositions) window.DataFusion.loadTrainPositions();
      var latest = getLinesData()[lineId];
      if (latest && mapEl) {
        _renderTrainMap(mapEl, latest, lineId);
        _scheduleRealtimeExpiryRefresh(lineId, latest);
      }
    }, Math.max(50, nextExpiry - now + 50));
  }

  function updateLineTitle(lineId, fusedLine) {
    var _title = (window.RailwayDB && window.RailwayDB.resolveLineName ? window.RailwayDB.resolveLineName(lineId, window.currentLang) : (fusedLine.nameEn || fusedLine.nameJa || lineId));
    var _sys2 = (window.LinePresentationService && window.LinePresentationService.getPresentation)
      ? window.LinePresentationService.getPresentation(lineId, getLinesData()) : null;
    if (_sys2) {
      var _lang2 = window.currentLang || "ja";
      if (_lang2 === "zh" && _sys2.nameZh) _title = _sys2.nameZh;
      else if (_lang2 === "en" && _sys2.nameEn) _title = _sys2.nameEn;
      else if (_lang2 === "ko" && _sys2.nameKo) _title = _sys2.nameKo;
      else if (_sys2.nameJa) _title = _sys2.nameJa;
    }
    if (titleEl) titleEl.textContent = _title;
  }

  // Public timetable references are metadata, never timetable/position rows.
  // The line-scoped module fetches only when that route is open.
  function updateCorridorEvidence(lineId) {
    var host = document.getElementById("trainsCorridorEvidence");
    if (!host) return;
    if (window.TrainCorridorEvidence &&
        typeof window.TrainCorridorEvidence.show === "function") {
      window.TrainCorridorEvidence.show(host, lineId);
    } else {
      host.hidden = true;
      host.replaceChildren();
    }
  }

  // Source reference only: do not label a non-integrated JR-West feed as
  // normal, delayed or realtime. Both Kinki subareas are listed on one page.
  function updateOfficialRuninfoSource(lineId) {
    var host = document.getElementById("trainsOfficialRuninfo");
    if (!host) return;
    host.replaceChildren();
    host.hidden = true;
    if (lineId === "Bantan") {
      // The archived SQL has no current-date-verified inbound electric runs.
      // This is source-only navigation, NEVER an embedded, copied or inferred
      // realtime feed. JR-West itself warns of incompletely mapped segments.
      var bantanTexts = {
        ja: ["播但線：公式データの確認先",
          "当サイトの旧SQL時刻は2026年11月の全列車・全駅時刻として未検証です。列車が地図に表示されないことは、運休を意味しません。JR西日本の走行位置表示にも、一部の列車や位置が表示されない区間があります。",
          "公式列車走行位置", "公式時刻表（上り・姫路方面）", "公式時刻表（下り・和田山方面）"],
        zh: ["播但线：官方数据入口",
          "本站历史SQL时刻表尚未核实为2026年11月的完整班次。地图不显示列车不代表停运。JR西日本官方走行位置页面本身也有部分列车不显示、部分区间位置不准确的限制。",
          "查看官方列车走行位置", "官方时刻表（上行·姬路方向）", "官方时刻表（下行·和田山方向）"],
        en: ["Bantan Line: official sources",
          "Historical SQL stop times are not verified as the complete November 2026 timetable. A missing map marker does not mean cancellation. JR-West also warns that some trains and segments may not have accurate positions.",
          "Official train positions", "Official timetable (toward Himeji)", "Official timetable (toward Wadayama)"],
        ko: ["반탄선: 공식 정보",
          "기존 SQL 시간표는 2026년 11월의 전체 열차 운행 자료로 검증되지 않았습니다. 지도에 열차가 표시되지 않는 것이 운휴를 뜻하지는 않습니다. JR서일본의 공식 위치 안내에도 일부 미표시·오차 구간이 있습니다.",
          "공식 열차 운행 위치", "공식 시간표(히메지 방면)", "공식 시간표(와다야마 방면)"]
      };
      var labels = bantanTexts[window.currentLang] || bantanTexts.ja;
      var heading = document.createElement("h3");
      heading.textContent = labels[0];
      var warning = document.createElement("p");
      warning.className = "tp-evidence-note";
      warning.textContent = labels[1];
      host.append(heading, warning);
      [
        ["https://www.train-guide.westjr.co.jp/bantan.html", labels[2]],
        ["https://timetable.jr-odekake.net/line-timetable/2443", labels[3]],
        ["https://timetable.jr-odekake.net/line-timetable/2442", labels[4]]
      ].forEach(function(entry, index) {
        if (index) host.append(document.createTextNode(" · "));
        var link = document.createElement("a");
        link.href = entry[0];
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = entry[1];
        host.append(link);
      });
      host.hidden = false;
      return;
    }
    if (lineId !== "Fukuchiyama") return;
    var texts = {
      ja: ["JR西日本・公式運行情報",
        "大阪～新三田は京阪神地区、新三田～福知山は北近畿地区をご確認ください。このページでは現在の公式運行状況を自動取得していません。",
        "JR西日本の運行情報を開く"],
      zh: ["JR西日本官方运行信息",
        "大阪—新三田属于京阪神地区，新三田—福知山属于北近畿地区。本站尚未取得可验证的本线路实时运行状况。",
        "查看JR西日本官方运行信息"],
      en: ["JR-West official service updates",
        "Check Keihanshin for Osaka–Shin-Sanda and Northern Kinki for Shin-Sanda–Fukuchiyama. Live official disruption status is not available in this map.",
        "Open JR-West service updates"],
      ko: ["JR서일본 공식 운행 정보",
        "오사카~신산다는 게이한신, 신산다~후쿠치야마는 기타킨키 지역을 확인해 주세요. 이 지도는 공식 실시간 운행 상태를 제공하지 않습니다.",
        "JR서일본 공식 운행 정보 열기"]
    };
    var strings = texts[window.currentLang] || texts.ja;
    var title = document.createElement("h3");
    title.textContent = strings[0];
    var note = document.createElement("p");
    note.className = "tp-evidence-note";
    note.textContent = strings[1];
    var link = document.createElement("a");
    link.href = "https://trafficinfo.westjr.co.jp/kinki.html";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = strings[2];
    host.append(title,note,link);
    host.hidden = false;
  }

  var _detailLoadRequestedFor = null;
  var _overviewScrollY = 0;
  function releaseOverviewDom() {
    if (!listEl) return;
    // Keep the line cards only in the visible overview; a selected SVG route
    // must not carry 200+ invisible image/card elements in the DOM.
    if (listEl.querySelector(".rs-line-card")) _overviewScrollY = window.scrollY || window.pageYOffset || 0;
    listEl.replaceChildren();
    if (filterBarEl) filterBarEl.replaceChildren();
  }
  function showLineView(lineId, systemLineIds, expectedIdentity, expectedMemberIdentities) {
    // Map, train-number indexes and vehicle PNG logic are not part of the
    // initial line browser. Load exactly once when a detail route is entered.
    if (window.TrainsDetailLoader && !window.TrainsDetailLoader.isReady(lineId)) {
      if (_detailLoadRequestedFor === lineId) return;
      _detailLoadRequestedFor = lineId;
      var browser = listEl && listEl.closest("[data-railway-browser]");
      if (browser) browser.classList.add("hidden");
      if (detailEl) detailEl.classList.remove("hidden");
      releaseOverviewDom();
      if (mapEl && window.DataState) window.DataState.renderPageState(mapEl, "loading");
      window.TrainsDetailLoader.load(lineId).then(function () {
        if (_detailLoadRequestedFor !== lineId ||
            (window.location.hash || "").replace(/^#/, "") !== lineId) return;
        _detailLoadRequestedFor = null;
        showLineView(lineId, systemLineIds, expectedIdentity, expectedMemberIdentities);
      }).catch(function(err) {
        if (_detailLoadRequestedFor !== lineId) return;
        _detailLoadRequestedFor = null;
        console.error("[trains] detail asset load failed:", err);
        if (mapEl && window.DataState) window.DataState.renderPageState(mapEl, "render_error");
      });
      return;
    }
    // 每次切换线路都重新确定展示系统。单线路没有 presentation 成员时
    // 也必须清空上一个多成员系统，否则例如从 Tojo 切到 TobuIsesaki
    // 会把旧的 Tojo 位置依赖带进当前地图。
    currentSystemLineIds = Array.isArray(systemLineIds) && systemLineIds.length > 1
      ? systemLineIds.slice() : null;
    window.TrainsActiveSystemLineIds = currentSystemLineIds ? currentSystemLineIds.slice() : null;
    try {
      var lines = getLinesData();
      var fusedLine = lines[lineId];
      if (!fusedLine) return;
      var actualIdentity = (window.DataState && window.DataState.getLineIdentity) ? window.DataState.getLineIdentity(fusedLine, lineId) : "";
      expectedIdentity = expectedIdentity || "";
      if (expectedIdentity && actualIdentity && expectedIdentity !== actualIdentity) return;
      if (expectedMemberIdentities && Array.isArray(systemLineIds)) {
        var renderedMembers = String(expectedMemberIdentities).split("|");
        for (var _emi = 0; _emi < systemLineIds.length; _emi++) {
          var _elid = systemLineIds[_emi], _eline = lines[_elid];
          var _ekey = (window.DataState && window.DataState.getLineIdentity && _eline) ? window.DataState.getLineIdentity(_eline, _elid) : "";
          if (renderedMembers.indexOf(_elid + "=" + _ekey) < 0) return;
        }
      }
      // 路由应用必须幂等。线路打开期间 DataState 可能多次推送；
      // 这些推送应通过下方订阅器更新地图，
      // 不得重新进入详情初始化路径。
      if (currentLine === lineId && currentLineIdentity === actualIdentity &&
          detailEl && !detailEl.classList.contains("hidden")) return;
      currentLine = lineId;
      currentLineIdentity = actualIdentity;
      // Dependency selection belongs to trains-data; this controller only
      // activates sources and owns the visible detail lifecycle.
      if (!window.TrainsDataDependencies || !window.TrainsDataDependencies.select) {
        throw new Error("Train dependency selector unavailable");
      }
      var activeSources = window.TrainsDataDependencies.select(lineId, currentSystemLineIds, lines);
      var _requestedLines = activeSources.realtimeLineIds;
      var _timetablePartners = activeSources.timetablePartnerIds;
      window.TrainsActivePositionLineIds = _requestedLines.slice();
      var _activationPromise = Promise.resolve();
      if (window.ODPTClient && window.ODPTClient.activateRealtimeLines) {
        _activationPromise = window.ODPTClient.activateRealtimeLines(_requestedLines).catch(function(e) {
          console.debug("[trains] on-demand realtime skip:", lineId, e && e.message);
        });
      }
      var browser = listEl && listEl.closest("[data-railway-browser]");
      if (browser) browser.classList.add("hidden");
      if (detailEl) detailEl.classList.remove("hidden");
      releaseOverviewDom();
      updateLineTitle(lineId, fusedLine);
      updateCorridorEvidence(lineId);
      updateOfficialRuninfoSource(lineId);
      if (mapEl && window.DataState && window.DataState.setPageStateRetry) {
        window.DataState.setPageStateRetry(mapEl, function() {
          var latest = getLinesData()[lineId];
          if (!latest || currentLine !== lineId) return;
          _renderTrainMap(mapEl, latest, lineId);
          _scheduleRealtimeExpiryRefresh(lineId, latest);
        });
      }
      if (mapEl) _renderTrainMap(mapEl, fusedLine, lineId);
      _scheduleRealtimeExpiryRefresh(lineId, fusedLine);
      // 激活后通过共享客户端读取指定日期的 SQL 计划。
      // 加载完成后 DataFusion 内部已重推定+重融合；此处按结果归属检查后重渲染当前线路，
      // 用户切走线路时旧结果不覆盖新状态；加载失败保持首次渲染（与无数据现状一致）。
      if (window.DataFusion && window.DataFusion.ensureTimetable) {
        _activationPromise.then(function() {
          if (currentLine !== lineId) return false;
          // 复用 DataFusion 的唯一估算器处理仅有时刻表的邻线；
          // 不要创建并行的车次/图片渲染器。
          return Promise.all(_timetablePartners.map(function(id) {
            return window.DataFusion.ensureTimetable(id).catch(function(){ return false; });
          })).then(function(updated) {
            return window.DataFusion.ensureTimetable(lineId).then(function(mainUpdated) {
              return mainUpdated || updated.some(Boolean);
            });
          });
        }).then(function(changed) {
          // 缓存或缺失的手动数据不执行任何操作。Promise 完成不得
          // 在打开详情后立即造成第二次地图绘制。
          if (!changed || currentLine !== lineId) return;
          var fused2 = getLinesData()[lineId];
          if (fused2 && mapEl) {
            _renderTrainMap(mapEl, fused2, lineId);
            _scheduleRealtimeExpiryRefresh(lineId, fused2);
          }
        }).catch(function(e) {
          console.debug("[trains] timetable fallback skip:", lineId, e.message);
        });
      }
    } catch(e) {
      console.error("[trains] line detail render failed:", lineId, e);
      if (mapEl && window.DataState) window.DataState.renderPageState(mapEl, "render_error");
    }
  }

  function hideLineView() {
    updateOfficialRuninfoSource(null);
    _detailLoadRequestedFor = null;
    var evidenceHost = document.getElementById("trainsCorridorEvidence");
    if (window.TrainCorridorEvidence &&
        typeof window.TrainCorridorEvidence.hide === "function")
      window.TrainCorridorEvidence.hide(evidenceHost);
    else if (evidenceHost) { evidenceHost.hidden = true; evidenceHost.replaceChildren(); }
    try {
      disposeTrainMap(mapEl);
      currentLine = null;
      currentLineIdentity = "";
      if (_realtimeExpiryTimer) {
        clearTimeout(_realtimeExpiryTimer);
        _realtimeExpiryTimer = null;
      }
      currentSystemLineIds = null;
      window.TrainsActiveSystemLineIds = null;
      window.TrainsActivePositionLineIds = null;
      if (window.ODPTClient && window.ODPTClient.clearRealtimeLines) window.ODPTClient.clearRealtimeLines();
      // Restore the overview only when navigating back. Rebuild using the
      // current language and selected operator, then restore its scroll.
      if (detailEl) detailEl.classList.add("hidden");
      if (listEl) listEl.classList.remove("hidden");
      var browser = listEl && listEl.closest("[data-railway-browser]");
      if (browser) browser.classList.remove("hidden");
      if (listEl && !listEl.querySelector(".rs-line-card")) {
        renderList(listEl);
        renderFilterBar(filterBarEl);
        if (_overviewScrollY && window.requestAnimationFrame) {
          window.requestAnimationFrame(function() { window.scrollTo(0, _overviewScrollY); });
        }
      }
      if (listEl) setFilter(_selectedOperator);
    } catch(e) {}
  }

  // ========== 从 IndexedDB 加载缓存的实时位置 ==========
  function loadCachedPositions(callback) {
    try {
      if (window.RailwayRTC && window.RailwayRTC.loadPositions) {
        window.RailwayRTC.loadPositions().then(function(positions) {
          if (positions && Object.keys(positions).length > 0) {
            // 将缓存位置存入 DataLayer。
            if (window.DataLayer && window.DataLayer.setCachedPositions) {
              Object.keys(positions).forEach(function(lid) {
                if (positions[lid] && positions[lid].length > 0) {
                  window.DataLayer.setCachedPositions(lid, positions[lid]);
                }
              });
            } else {
              // 兼容回退：合并到 UNIFIED_LINES。
              var ul = window.UNIFIED_LINES;
              if (ul) {
                Object.keys(positions).forEach(function(lid) {
                  if (ul[lid] && positions[lid].length > 0) {
                    ul[lid].cachedPositions = positions[lid];
                  }
                });
              }
            }
          }
          if (callback) callback();
        }).catch(function(e) { console.warn("[trains] Cache load error:", e.message); if (callback) callback(); });
      } else {
        if (callback) callback();
      }
    } catch(e) { if (callback) callback(); }
  }

  function renderList(el, linesSnapshot) {
    if (!el || !window.DataState) return;
    // DataState 推送 canonical 快照后，精确渲染该快照。
    // getLinesData() 仅作为启动回退；在一次
    // 通知中混用两者会导致首次渲染与后续筛选渲染不一致。
    var ul = linesSnapshot || getLinesData();
    if (!ul || Object.keys(ul).length === 0) {
      // 与实时页面同步加载动画（rs-loading spinner）。
      window.DataState.renderPageState(el, "loading");
      return;
    }
    renderFiltered(el, ul);
  }

  function init() {
    try {
      listEl = document.getElementById("trainsLineListContent");
      detailEl = document.getElementById("trainsDetailView");
      titleEl = document.getElementById("trainsDetailTitle");
      mapEl = document.getElementById("trainsMapContainer");
      // 此页面控制器只拥有一套 observer/listener。只观察宽度
      // 可避免静态图高度变化时形成循环。
      function refreshVisibleMap() {
        if (document.hidden || !currentLine || !mapEl || !detailEl || detailEl.classList.contains('hidden')) return;
        var latest = getLinesData()[currentLine];
        if (latest) { _renderTrainMap(mapEl,latest,currentLine); _scheduleRealtimeExpiryRefresh(currentLine,latest); }
      }
      if (typeof ResizeObserver !== 'undefined' && mapEl) {
        var lastWidth = mapEl.clientWidth;
        var mapObserver = new ResizeObserver(function() {
          var width = mapEl.clientWidth;
          if (width && width !== lastWidth) { lastWidth = width; refreshVisibleMap(); }
        });
        mapObserver.observe(mapEl);
      }
      document.addEventListener('visibilitychange',function() {
        if (document.hidden) disposeTrainMap(mapEl); else refreshVisibleMap();
      });
      window.addEventListener('pagehide',function() { disposeTrainMap(mapEl); });
      window.addEventListener('pageshow',refreshVisibleMap);
      window.addEventListener('pt:railway-ready',refreshVisibleMap);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshVisibleMap);
      filterBarEl = document.getElementById("trainsFilterBar");
      if (filterBarEl) filterBarEl.addEventListener("pt:operator-filter-change", function(e) { setFilter(e.detail && e.detail.operator); });
      backBtn = document.getElementById("trainsBackBtn");
      if (!listEl) return;
      // canonical 加载器拥有失败事件，但本页面拥有
      // 线路列表表面。共享加载器已经进入终态错误后，不要保留
      // 初始加载指示器。
      window.addEventListener("pt:railway-error", function() {
        if (listEl && window.DataState) {
          window.DataState.renderPageState(listEl, navigator.onLine === false ? "offline" : "fetch_error");
        }
      });
      // 与实时页面同步加载动画（rs-loading spinner）。
      window.DataState.renderPageState(listEl, "loading");
      if (window.DataState && window.DataState.setRailwayPageRetry) {
        window.DataState.setRailwayPageRetry(listEl, function() {
          window.DataState.renderPageState(listEl, "loading");
          if (!window.DataLoader || typeof window.DataLoader.retry !== "function") {
            return Promise.reject(new Error("DataLoader retry unavailable"));
          }
          return window.DataLoader.retry().then(function() {
            var lines = getLinesData();
            if (_selectedOperator === null) renderList(listEl);
            else renderFiltered(listEl, lines);
            renderFilterBar(filterBarEl);
            _applyRoute();
          });
        });
      }
      listEl.addEventListener("keydown", function(e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        var card = e.target.closest(".rs-line-card");
        if (!card || e.target !== card) return;
        e.preventDefault();
        card.click();
      });
      listEl.addEventListener("click", function(e) {
        var card = e.target.closest(".rs-line-card");
        if (card && card.dataset.line) {
          window.location.hash = card.dataset.line;
        }
      });
      if (backBtn) {
        backBtn.addEventListener("click", function() {
          // 统一回到线路一览（用户："所有返回统一回到一览"）——
          // history.back() 返回时清 hash，触发 hashchange 兜底。
          // hideLineView()，无论从哪进入详情（列表/主页/上一详情/直开），
          // 点返回一律回到线路一览页。
          window.location.hash = "";
        });
      }
      // hash 路由兜底：history.back() 后 hash 变化时恢复对应视图
      // （与 tourism 详情页的 history.back() 行为同步，避免页内返回后停留在详情）
      function _applyRoute() {
        var h = (window.location.hash || "").replace(/^#/, "");
        if (!h) {
          if (currentLine || (detailEl && !detailEl.classList.contains("hidden"))) hideLineView();
          return false;
        }
        var lines = getLinesData();
        if (!lines || !lines[h]) return false;
        if (h === currentLine && detailEl && !detailEl.classList.contains("hidden")) return true;
        try { showLineView(h, _systemIdsForRoute(h)); return true; } catch(e) {
          console.error("[trains] route render failed:", h, e);
          if (mapEl && window.DataState) window.DataState.renderPageState(mapEl, "render_error");
          return false;
        }
      }
      window.addEventListener("hashchange", _applyRoute);
      loadCachedPositions(function() {
        // Direct links should not build hundreds of hidden overview cards.
        if (!window.location.hash) {
          renderList(listEl);
          renderFilterBar(document.getElementById("trainsFilterBar"));
        }
        // canonical loader/DataState 事件负责数据就绪。不要轮询
        // 页面 DOM 长达一分钟；延迟快照由订阅器处理。
        // 路由恢复集中在 _applyRoute；此处的有限轮询
        // 只等待初始异步数据，不会重复初始化详情。
        (function waitForInitialRoute() {
          var attempts = 0;
          (function tick() {
            if (_applyRoute()) return;
            if (window.location.hash && ++attempts < 25) setTimeout(tick, 400);
          })();
        })();
        // 箭头是结构性 UI；只有嵌套标签由 lang-init 翻译。
      });
      // 订阅 DataState 变化，处理延迟数据加载。
      if (window.DataState) {
        window.DataState.subscribe(function(lines, delayData, positions, changes) {
          if (!lines || Object.keys(lines).length === 0 || !listEl) return;
          // 数据到达后，待处理的深链接可能变得可解析。
          _applyRoute();
          // 列车总览是结构性内容（运营商/线路/终点），不
          // 渲染实时列车位置。不要在每次 DataState
          // 推送时扫描每条线路/列车来决定是否重建总览。位置变化
          // 检测范围限定在下方当前打开的详情线路。
          var posHash = '';
          if (currentLine && lines[currentLine]) {
            try {
              var _cl = lines[currentLine];
              var _pos = getRealtimePositions(currentLine);
              posHash = currentLine + ":" + _pos.length + ":";
              for (var _pi = 0; _pi < _pos.length; _pi++) {
                var _tp = _pos[_pi];
                posHash += (_tp.runningChainId || _tp.trainId || ("t" + _pi)) + "@"
                  + (_tp.stationIndex || 0) + ">"
                  + (_tp.segmentToIndex == null ? "" : _tp.segmentToIndex) + ":"
                  + (_tp.segmentProgress == null ? "" : Math.round(_tp.segmentProgress * 100)) + ":"
                  + (_tp.positionSource || "") + ":"
                  + (_tp.destinationStation || "") + ":"
                  + (_tp.typeName || "") + ":" + (_tp.delayMin || 0) + ":"
                  + (_tp.serviceDate || "") + ":"
                  // These are inputs to the existing TrainVehicle PNG mapper.
                  // Repaint even when the train hasn't moved but mapping evidence changed.
                  + (_tp.trainNumber || "") + ":"
                  + (_tp.sourceRailway || "") + ":"
                  + (_tp.positionLineId || "") + ":"
                  + (_tp.fusionLineId || "") + ":"
                  + (_tp.fusionRole || "") + ":"
                  + (_tp.trainOperator || "") + ":"
                  + (_tp.trainType || "") + ":"
                  + (_tp.railDirection || "") + ":"
                  + (_tp.calendarType || "") + ":"
                  + (_tp.serviceId || "") + ":"
                  + (_tp.realtimeVehicleType || "") + ":"
                  + (_tp.realtimeDerivedVehicleType || "") + ":"
                  + (_tp.timetableVehicleType || "") + ":"
                  + (_tp.officialNumberVerified === true ? "official" : "") + ":"
                  + JSON.stringify(_tp.plannedVehicleCandidates || null) + ":"
                  + (_tp.plannedVehicleCandidateStatus || "") + ":"
                  + (_tp.plannedVehicleCandidateArtworkPath || "") + ":"
                  + (_tp.plannedVehicleCandidateArtworkStatus || "") + ":"
                  + (_tp.candidateArtworkConfirmedByDatedRule === true ? "candidate-art" : "") + ":"
                  + (_tp.vehicleIconPath || "") + ":"
                  + (_tp.vehicleResolvedUpstream === true ? "resolved-upstream" : "") + ":"
                  + (_tp.vehicleResolvedFromRealtime === true ? "resolved-live" : "") + ":"
                  + (_tp.vehicleResolvedFromRealtimeDerived === true ? "resolved-derived" : "") + ":"
                  + (_tp.vehicleIdentityStatus || "") + ":"
                  + JSON.stringify(_tp.vehiclePlan || null) + ":"
                  + (_tp.vehicleType || "") + ":"
                  + (_tp.vehicleFormationId || "") + ":"
                  + (Array.isArray(_tp.vehicleFormationCandidates) ? _tp.vehicleFormationCandidates.join("/") : "") + ":"
                  + (Array.isArray(_tp.operationEvidence) ? _tp.operationEvidence.map(function(e) {
                      return e && e.decisive ? [e.observedDate || "", e.formationId || ""].join("/") : "";
                    }).join(";") : "") + ":"
                  + (_tp.estimated === true ? "estimated" : "observed") + ","
                  ;
              }
            } catch(e) {}
          }
          // 详情渲染还依赖非位置状态（延误/状态、
          // 直通/支线关系上下文和融合线路元数据）。只包含位置的
          // hash 会在临时状态移除元素后留下过期详情 SVG：
          // 状态恢复但列车未移动时不会触发渲染。
          // 即使只有元数据变化也要更新过期时间；不要重启 SVG 动画。
          var currentLineChanges = currentLine && changes && changes.lines
            ? changes.lines[currentLine] : null;
          var displayChanged = !!(currentLineChanges && currentLineChanges.display);
          if (currentLine && lines[currentLine] && currentLineChanges &&
              currentLineChanges.metadata) {
            _scheduleRealtimeExpiryRefresh(currentLine, lines[currentLine]);
          }
          // A "positions" notification updates trains/vehicle display only.
          // Structural snapshots still validate the complete network revision.
          var positionSnapshot = !!(changes && changes.kind === "positions");
          var detailStateHash = '';
          var staticGeometryChanged = false;
          if (currentLine && lines[currentLine]) {
            try {
              var _dl = lines[currentLine];
              var _dd = _dl.delayInfo || {};
              var _cm = _dl._chainMeta || {};
              var mountedSvg = mapEl && mapEl.querySelector('svg');
              var previousRevision = positionSnapshot && mountedSvg && mountedSvg.__geometry
                ? mountedSvg.__geometry.staticRevision : undefined;
              staticGeometryChanged = !!mapEl && (!mountedSvg || !mountedSvg.__geometry ||
                mountedSvg.__geometry.lineHash !== _computeLineHash(_dl,currentLine,previousRevision));
              detailStateHash = JSON.stringify({
                id: currentLine,
                identity: currentLineIdentity,
                status: _dl.status || '',
                interval: _dl.interval || '',
                cause: _dl.cause || '',
                delayStatus: _dd.status || '',
                delay: _dd.maxDelay == null ? '' : _dd.maxDelay,
                delayCause: _dd.cause || '',
                chain: _cm.identity || _cm.runningChainId || '',
                related: _cm.relatedLines || [],
                through: _cm.isThroughService || false,
                branch: _cm.isBranch || false,
                alias: _cm.isAlias || false
              });
            } catch(e) {}
          }
          var hasLineCards = !!listEl.querySelector(".rs-line-card");
          // loading/error 状态同样包含 innerHTML，因此 DOM 长度不能判断
          // 是否已经挂载可用铁路内容。
          // canonical/融合数据延迟到达时自动恢复。
          if (!hasLineCards && (!detailEl || detailEl.classList.contains("hidden"))) {
            if (_selectedOperator === null) {
              renderList(listEl, lines);
            } else {
              renderFiltered(listEl, lines);
            }
            renderFilterBar(document.getElementById("trainsFilterBar"));
            _lastPositionsHash = posHash;
            _lastDetailStateHash = detailStateHash;
            // 路由恢复在订阅器入口处处理一次。
          } else if (posHash !== _lastPositionsHash || detailStateHash !== _lastDetailStateHash ||
                     displayChanged || staticGeometryChanged) {
            var _positionsChanged = posHash !== _lastPositionsHash;
            var _detailStateChanged = detailStateHash !== _lastDetailStateHash;
            _lastPositionsHash = posHash;
            _lastDetailStateHash = detailStateHash;
            // 实时位置变化只影响已打开的详情地图。总览
            // 卡片不包含列车位置内容，因此此处重建完整列表
            // 只是无意义的 DOM 变动。
            // （直通服务信息现在位于列车图换乘图标中。）
            // 详情视图打开时更新地图列车位置（增量更新以保持动画平滑）。
            if (currentLine && detailEl && !detailEl.classList.contains("hidden")) {
              var _lines = getLinesData();
              var _fusedLine = _lines[currentLine];
              if (_fusedLine) {
      _renderTrainMap(mapEl, _fusedLine, currentLine, { positionSnapshot: positionSnapshot });
                _scheduleRealtimeExpiryRefresh(currentLine, _fusedLine);
              }
            }
          }
        });
      }
      // 语言变化只影响展示。保留已挂载的总览
      // 及其滚动/筛选状态，就地刷新卡片/分组。
      if (typeof window.onLanguageChange === "function") {
        window.onLanguageChange(function() {
          if (currentLine) updateCorridorEvidence(currentLine);
          renderFilterBar(document.getElementById("trainsFilterBar"));
          if (currentLine && detailEl && !detailEl.classList.contains("hidden")) {
            var latest = getLinesData()[currentLine];
            if (latest) {
              updateLineTitle(currentLine, latest);
      if (mapEl) _renderTrainMap(mapEl, latest, currentLine);
              _scheduleRealtimeExpiryRefresh(currentLine, latest);
            }
          }
          if (listEl && detailEl && detailEl.classList.contains("hidden")) {
            var _scrollY = window.scrollY || window.pageYOffset || 0;
            var _freshHost = document.createElement("div");
            var _linesNow = window.DataState.filterLinesByOperator(getLinesData(), _selectedOperator);
            var _orderNow = (window.LinePresentationService && window.UNIFIED_LINES) ? window.LinePresentationService.getDisplayOrder(window.UNIFIED_LINES, { includeServiceCorridors: true }) : [];
            window.DataState.renderList(_freshHost, _linesNow, { mode: "trains", lineOrder: _orderNow, includeServiceCorridors: true, flatGroups: true });
            // 同时渲染共享空态，避免旧卡片在切换语言后残留。
            listEl.innerHTML = _freshHost.innerHTML;
            setFilter(_selectedOperator);
            if (_scrollY) window.scrollTo(0, _scrollY);
          }
        });
      }
    } catch(e) { console.error("[trains] initialization failed:", e); }
  }


  function renderFilterBar(container) {
    if (!_filterBar && window.OperatorFilterBar) {
      _filterBar = window.OperatorFilterBar.get("trainsFilterBar") || window.OperatorFilterBar.mount(container || "trainsFilterBar");
      _filterBar.setSelected(_selectedOperator, false);
    }
    if (_filterBar) _filterBar.render(getLinesData());
  }

  function setFilter(op) {
    _selectedOperator = op || null;
    if (_filterBar && _filterBar.getSelected() !== _selectedOperator) _filterBar.setSelected(_selectedOperator, false);
    if (!listEl) return;
    if (!window.DataState.setOperatorVisibility(listEl, _selectedOperator)) {
      renderFiltered(listEl);
    }
  }

  function renderFiltered(el, linesSnapshot) {
    if (!el || !window.DataState) return;
    var allLines = linesSnapshot || getLinesData() || {};
    var filtered = window.DataState.filterLinesByOperator(allLines, _selectedOperator);
    var lineOrder = (window.LinePresentationService && window.UNIFIED_LINES) ? window.LinePresentationService.getDisplayOrder(window.UNIFIED_LINES, { includeServiceCorridors: true }) : [];
    try { window.DataState.renderList(el, filtered, { mode: "trains", lineOrder: lineOrder, includeServiceCorridors: true, flatGroups: true }); }
    catch(e) { window.DataState.renderPageState(el, "render_error"); }
  }

  window.TrainsPage = {
    init: init,
    getPerformanceSamples: function() { return getTrainRenderPerformanceSamples(); },
    refreshUI: function() { renderList(listEl); },
    showLineView: showLineView,
    hideLineView: hideLineView
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
