/*
 * Pixel Tetsudo - 实时视图
 * 只读消费 DataFusion 运行快照。
 */
(function() {
  "use strict";

  const t = window.t || ((k) => k);
  const tLine = (code) => (window.tLine ? window.tLine(code) : code) || code;
  const tOp = (name) => (window.tOp ? window.tOp(name) : name) || name;
  const tStation = (name) => (window.tStation ? window.tStation(name) : name) || name;
  const getDisplayName = (line) => {
    if (!line) return "";
    // 展示身份规则：统一通过 RailwayDB.resolveLineName 获取线路名称。
    if (line.id && window.RailwayDB && window.RailwayDB.resolveLineName) {
      var _n = window.RailwayDB.resolveLineName(line.id, window.currentLang);
      if (_n) return _n;
    }
    return line.nameJa || line.nameEn || line.name || line.id || "";
  };


  // STATUS_META 定义在 data-state.js 中；使用 window.DataState.STATUS_META。
  const STATUS_META = window.DataState ? window.DataState.STATUS_META : {
    normal:    { icon: "\u25cb", color: "green"  },
    notice:    { icon: "\uff01", color: "yellow" },
    delayed:   { icon: "\u25b3", color: "orange" },
    suspended: { icon: "\u00d7", color: "red"  },
    no_data:   { icon: "\u25cc", color: "gray"   },
    no_odpt:   { icon: "\u25cc", color: "gray"   },
  };

  function _impactLabels() {
    var lang = window.currentLang || "ja";
    var all = {
      ja: { dir:{up:"上り",down:"下り",both:"上下線",inner:"内回り",outer:"外回り"}, effect:{delay:"遅延",suspension:"運転見合わせ",partial_cancellation:"一部運休",through_suspension:"直通運転中止",service_change:"運行変更",normal:"平常運転"} },
      zh: { dir:{up:"上行",down:"下行",both:"上下行",inner:"内环",outer:"外环"}, effect:{delay:"延误",suspension:"暂停运行",partial_cancellation:"部分列车停运",through_suspension:"停止直通运行",service_change:"运行方式变更",normal:"正常运行"} },
      ko: { dir:{up:"상행",down:"하행",both:"상하행",inner:"내선 순환",outer:"외선 순환"}, effect:{delay:"지연",suspension:"운전 중단",partial_cancellation:"일부 열차 운휴",through_suspension:"직통 운전 중단",service_change:"운행 변경",normal:"정상 운행"} },
      en: { dir:{up:"Upbound",down:"Downbound",both:"Both directions",inner:"Inner loop",outer:"Outer loop"}, effect:{delay:"Delayed",suspension:"Service suspended",partial_cancellation:"Some trains cancelled",through_suspension:"Through service suspended",service_change:"Service changed",normal:"Normal service"} }
    };
    return all[lang] || all.ja;
  }

  function _scopeSummary(interval, impacts) {
    var list = Array.isArray(impacts) ? impacts : [];
    var explicitRanges = list.map(function(x){ return x && x.interval; }).filter(function(x){ return x && x !== "全線"; });
    if (explicitRanges.length) return explicitRanges[0];
    if (interval && interval !== "全線") return interval;
    var direction = list.map(function(x){ return x && x.direction; }).find(function(x){ return !!x; });
    if (direction) return (_impactLabels().dir[direction] || direction);
    if (interval === "全線" || list.some(function(x){ return x && x.interval === "全線"; })) return "全線";
    return "";
  }

  function getDelayInfo(line) {
    if (line.delayInfo) return line.delayInfo;
    if (line.status) return { status: line.status, interval: line.interval, cause: line.cause };
    return null;
  }

  function clearSelectedCards() {
    var list = document.getElementById("realtimeStatusContainer");
    if (list) list.querySelectorAll(".rs-line-card.selected").forEach(function(c) { c.classList.remove("selected"); });
  }

  function openModal(lineId, linesObj, expectedIdentity, displayTitle) {
    var modal = document.getElementById("lineDetailModal");
    if (!modal || !linesObj || !linesObj[lineId]) return;
    var line = linesObj[lineId];
    var actualIdentity = (window.DataState && window.DataState.getLineIdentity) ? window.DataState.getLineIdentity(line, lineId) : "";
    if (expectedIdentity && actualIdentity && expectedIdentity !== actualIdentity) return;
    _currentModalLine = lineId;
    _currentModalTitle = displayTitle || "";
    _currentModalIdentity = actualIdentity;
    var delayInfo = getDelayInfo(line) || {};
    // 使用 window.DataState.getStatus，统一处理 NO_DATA。
    var status = delayInfo && delayInfo.status ? delayInfo.status : "loading";
    var interval = delayInfo.interval || "";
    var impacts = Array.isArray(delayInfo.impacts) ? delayInfo.impacts : [];
    var scopeSummary = _scopeSummary(interval, impacts);
    var cause = delayInfo.cause || "";
    // The status-line annotation describes the current operational effect.
    // A through-service suspension is not a suspension of this line itself,
    // so show "through service suspended" in the heading and keep the causal
    // text for the detailed official message below.
    var annotation = cause;
    var isThroughSuspension = delayInfo.effect === "through_suspension" ||
      impacts.some(function(item) { return item && item.effect === "through_suspension"; });
    if (isThroughSuspension && _impactLabels().effect.through_suspension) {
      annotation = _impactLabels().effect.through_suspension;
    }
    var s = window.DataState && window.DataState.STATUS_META && window.DataState.STATUS_META[status] ? window.DataState.STATUS_META[status] : STATUS_META[status] || STATUS_META.no_data;
    var statusText = t("status." + status) || status;
    // 标题。
    modal.querySelector(".rs-modal-title").textContent = displayTitle || getDisplayName(line) || tLine(line.id) || line.name;
    // 状态区块。
    var statusSection = modal.querySelector(".rs-status-section");
    statusSection.className = "rs-status-section rs-status-" + status;
    // 状态行 = 官方 status 词（分级翻译）+ 官方 cause（原因；非 ja 界面经 DelayTranslator 翻译）
    var _causeInline = "";
    if (annotation && status !== "normal") {
      var _cTxt = annotation;
      if ((window.currentLang || "ja") !== "ja" && window.DelayTranslator && _needsJaTranslate(annotation)) {
        try { _cTxt = window.DelayTranslator.translateFragment(annotation, window.currentLang); } catch(e) {}
      }
      _causeInline = " <span class=\"rs-cause-inline\">\uff08" + escapeHtml(_cTxt) + "\uff09</span>";
    }
    statusSection.innerHTML = "<span class=\"rs-status-indicator\"><span class=\"rs-status-dot\"></span>" + statusText + "</span>" + _causeInline;
    // 通过 DOM API 应用状态圆点颜色（符合 CSP）。
    var dot = statusSection.querySelector(".rs-status-dot");
    if (dot) dot.style.background = "var(--" + (s.color || ({ normal: "green", info: "yellow", notice: "yellow", delayed: "orange", suspended: "red", no_data: "gray", no_odpt: "gray", loading: "gray" }[status] || "gray")) + ")";
    // 区间区块。
    var intervalSection = modal.querySelector(".rs-interval-section");
    intervalSection.querySelector(".rs-info-label").textContent = t("status.interval");
    var intervalHtml;
    var _singleEndInterval = false;
    if (!scopeSummary || status === "normal" || status === "no_data") {
      intervalHtml = '<span class="rs-station-text">' + t("status.all_lines") + '</span>';
    } else {
      var intervalRanges = scopeSummary.split("、");
      var parsedRanges = intervalRanges.map(function (item) { return item.split("\u2192"); });
      var allStationRanges = parsedRanges.length > 0 && parsedRanges.every(function (parts) { return parts.length === 2; });
      if (allStationRanges) {
        intervalHtml = parsedRanges.map(function (parts) {
          return '<span class="rs-station-start">' + escapeHtml(tStation(parts[0])) + '</span>'
            + '<span class="rs-interval-arrow">\u2192</span>'
            + '<span class="rs-station-end">' + escapeHtml(tStation(parts[1])) + '</span>';
        }).join('<span class="rs-interval-separator">、</span>');
      } else {
        var _int = scopeSummary;
        if (String(_int).indexOf("\u5168\u7dda") >= 0) {
          // ODPT Range="全線" 复用 status.all_lines 多语言（非 ja 界面不显示日文原样）
          intervalHtml = "<span class=\"rs-station-text\">" + escapeHtml(t("status.all_lines")) + "</span>";
        } else {
          // 单端区间（“東京方面”）：按当前语言翻译“方面”后缀。
          if (window.DataState && typeof window.DataState.localizeInterval === "function") _int = window.DataState.localizeInterval(_int);
          intervalHtml = "<span class=\"rs-station-text\">" + escapeHtml(_int) + "</span>";
          _singleEndInterval = true;
        }
        _singleEndInterval = true;
      }
    }
    intervalSection.querySelector(".rs-interval-stations").innerHTML = intervalHtml;
    // 单端/文本兜底区间（如"京急線内"）在非 ja 界面使用离线翻译。
    if (_singleEndInterval && (window.currentLang || "ja") !== "ja") {
      var _intEl = intervalSection.querySelector(".rs-interval-stations .rs-station-text");
      if (_intEl && _needsJaTranslate(interval) && window.DelayTranslator) {
        _intEl.textContent = window.DelayTranslator.translateFragment(interval, window.currentLang);
      }
    }
    // 原因区块 → 運行情報（直接显示 ODPT 原文，不拆解碎片；
    // 非 ja 界面以译文为主显示，原文折叠保留，翻译失败自动回退原文。
    var causeSection = modal.querySelector(".rs-cause-section");
    var _detailTitles = { ja: "運行情報", en: "Service Info", zh: "运行信息", ko: "운행 정보" };
    causeSection.querySelector(".rs-section-title").textContent = _detailTitles[(window.currentLang || "ja")] || "運行情報";
    var causeHtml;
    var _transSource = "";
    // 官网网页来源只保留正文，不再展示 URL 链接行。
    var _srcText = delayInfo.detail || cause || "";
    var _exLinks = [];
    var _cleanSrc = _srcText;
    var _isWebSource = (delayInfo && delayInfo.source === "web")
      || (window.WebRunInfo && typeof window.WebRunInfo.isWebLine === "function" && window.WebRunInfo.isWebLine(lineId));
    if (window.RunInfoEvaluator && typeof window.RunInfoEvaluator.extractLinks === "function") {
      try {
        var _ex = window.RunInfoEvaluator.extractLinks(_srcText);
        _cleanSrc = _ex.cleanText;
        _exLinks = _isWebSource ? [] : (_ex.links || []);
      } catch(e) {}
    }
    if (status === "loading") {
      causeHtml = '<span class="rs-text-muted">' + t("status.loading") + '</span>';
    } else if (status === "no_data" || status === "no_odpt") {
      causeHtml = '<span class="rs-text-muted">' + t("status.no_data") + '</span>';
    } else if (_cleanSrc) {
      _transSource = _cleanSrc;
      causeHtml = _translatedText(_cleanSrc, window.currentLang || "ja", _translationOpts(lineId, status, Object.assign({}, delayInfo, { cause: cause })));
    } else {
      causeHtml = '<span class="rs-text-muted">' + t("status.none") + '</span>';
    }
    var _bodyTextEl = causeSection.querySelector(".rs-cause-text");
    if (_bodyTextEl) {
      _bodyTextEl.innerHTML = causeHtml;
      if (_cleanSrc) _upgradeBodyTranslation(_bodyTextEl, _cleanSrc, window.currentLang || "ja", _translationOpts(lineId, status, Object.assign({}, delayInfo, { cause: cause })), lineId);
    }
    // 非官网来源的 URL 渲染为可点击链接行（正文保持纯文字）。
    var previousLinks = causeSection.querySelector(".rs-cause-links");
    if (previousLinks) previousLinks.remove();
    if (_exLinks.length > 0) {
      try {
        var _linksWrap = document.createElement("div");
        _linksWrap.className = "rs-cause-links";
        var _lh = "";
        for (var _i = 0; _i < _exLinks.length; _i++) {
          _lh += '<a class="rs-cause-link" href="' + escapeHtml(_exLinks[_i]) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(_exLinks[_i]) + '</a>';
        }
        _linksWrap.innerHTML = _lh;
        causeSection.appendChild(_linksWrap);
      } catch(e) {}
    }
    // 更新时间区块。
    var updatedSection = modal.querySelector(".rs-updated-section");
    updatedSection.querySelector(".rs-info-label").textContent = t("status.updated");
    var updateTime = "";
    var sourceTime = delayInfo.sourceUpdatedAt || delayInfo.updatedAt;
    if (sourceTime) {
      try {
        updateTime = new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).format(new Date(sourceTime));
      } catch (e) {
        var d = new Date(sourceTime);
        updateTime = d.getHours().toString().padStart(2,"0") + ":" + d.getMinutes().toString().padStart(2,"0");
      }
    } else if (status === "loading") {
      updateTime = t("status.loading");
    } else if (status === "no_data" || status === "no_odpt") {
      updateTime = t("status.no_data");
    } else {
      updateTime = t("status.unknown");
    }
    updatedSection.querySelector(".rs-updated-time").textContent = updateTime;
    // 显示弹窗。
    modal.classList.add("active");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    _currentModalLine = null;
    _currentModalIdentity = "";
    var modal = document.getElementById("lineDetailModal");
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
    clearSelectedCards();
  }

  let _latestLines = null;
  let _latestOrder = null;
  let _selectedOperator = null;
  var _filterBar = null;

  let _currentModalLine = null;
  let _currentModalTitle = "";
  let _currentModalIdentity = "";
  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  // 判断文本是否含日文特征（假名/駅/線内）——只对动态日文原文做翻译，
  // 已按语言融合的站名/线路名不进入该路径（防止站名被二次翻译改写）
  function _needsJaTranslate(s) {
    if (!s) return false;
    return /[\u3041-\u3096\u30A1-\u30FA\u30FC]/.test(s) || /[駅]/.test(s) || /線内/.test(s);
  }

  function _translationOpts(lineId, status, source) {
    source = source || {};
    return {
      lineId: lineId,
      status: status,
      cause: source.cause || source.text || "",
      interval: source.interval || null,
      direction: source.direction || null,
      effect: source.effect || null,
      impacts: Array.isArray(source.impacts) ? source.impacts : [],
      serviceLevel: source.serviceLevel || null,
      resume: source.resume || null
    };
  }

  function _untranslatedOfficialText(text) {
    return '<div class="rs-cause-untranslated">'
      + '<div class="rs-text-muted">' + escapeHtml(t("status.translation_unavailable") || t("status.no_data")) + '</div>'
      + '<div class="rs-cause-original">' + escapeHtml(text) + '</div>'
      + '</div>';
  }

  // 非日文界面只渲染译文正文。官方日文原文
  // 仅在本地结构化/模板翻译器无法
  // 安全翻译自由文本时显示。
  function _translatedText(text, lang, opts) {
    var safe = escapeHtml(text);
    if (lang === "ja" || !_needsJaTranslate(text)) return safe;
    if (!window.DelayTranslator) return _untranslatedOfficialText(text);
    var r = window.DelayTranslator.translate(text, opts || {}, lang);
    var tr = r && r.translated ? r.translated : "";
    if (!tr || _needsJaTranslate(tr)) {
      return _untranslatedOfficialText(text);
    }
    return '<div class="rs-cause-translated">' + escapeHtml(tr) + '</div>';
  }

  function _upgradeBodyTranslation(textEl, text, lang, opts, lineId) {
    if (!textEl || lang === "ja" || !_needsJaTranslate(text) || !window.DelayTranslator || typeof window.DelayTranslator.translateRemote !== "function") return;
    window.DelayTranslator.translateRemote(text, opts || {}, lang).then(function(r) {
      if (!r || r.provider !== "lingva" || !r.translated || _needsJaTranslate(r.translated)) return;
      if (_currentModalLine !== lineId || !document.body.contains(textEl)) return;
      textEl.innerHTML = '<div class="rs-cause-translated">' + escapeHtml(r.translated) + '</div>';
    }).catch(function(){});
  }

  function renderFilterBar(linesObj) {
    if (!_filterBar && window.OperatorFilterBar) {
      _filterBar = window.OperatorFilterBar.get("realtimeFilterBar") || window.OperatorFilterBar.mount("realtimeFilterBar");
      _filterBar.setSelected(_selectedOperator, false);
    }
    if (_filterBar) _filterBar.render(linesObj);
  }

  function setFilter(operator) {
    _selectedOperator = operator || null;
    if (_filterBar && _filterBar.getSelected() !== _selectedOperator) _filterBar.setSelected(_selectedOperator, false);
    var container = document.getElementById("realtimeStatusContainer");
    if (!container) return;
    if (!window.DataState.setOperatorVisibility(container, _selectedOperator)) {
      if (_latestLines) renderFiltered();
      return;
    }
    // 强制下一次实时快照重新协调刚显示的卡片。
    _renderedStatusSignatures = {};
  }

  function getFilteredLines() {
    if (!_latestLines) return {};
    if (!_selectedOperator) return _latestLines;
    return window.DataState.filterLinesByOperator(_latestLines, _selectedOperator);
  }

  function statusSignature(line) {
    var d = getDelayInfo(line) || {};
    return [d.status || "loading", d.interval || "", JSON.stringify(d.impacts || []), d.cause || "", d.detail || "", d.source || ""].join("|");
  }

  function patchRealtimeCards(container, linesObj, changedIds) {
    if (!container || !changedIds || changedIds.length === 0) return true;
    var lineCard = window.LineCard;
    if (!lineCard || typeof lineCard.update !== "function" || typeof lineCard.updateSystem !== "function") return false;
    var needsFullRender = false;
    var updatedSystems = Object.create(null);

    changedIds.forEach(function(lineId) {
      var line = linesObj[lineId];
      if (!line) { needsFullRender = true; return; }

      var card = container.querySelector('.rs-line-card[data-line="' + String(lineId).replace(/"/g, '\\"') + '"]');
      if (!card || card.classList.contains("rs-system-card")) {
        var systemCards = container.querySelectorAll(".rs-system-card[data-lines]");
        var systemCard = card && card.classList.contains("rs-system-card") ? card : null;
        if (!systemCard) {
          for (var i = 0; i < systemCards.length; i++) {
            var members = (systemCards[i].dataset.lines || "").split(",");
            if (members.indexOf(lineId) >= 0) { systemCard = systemCards[i]; break; }
          }
        }
        if (systemCard) {
          var systemKey = systemCard.dataset.line || systemCard.dataset.lines || "system";
          if (updatedSystems[systemKey]) return;
          updatedSystems[systemKey] = true;
          if (!lineCard.updateSystem(systemCard, linesObj, { mode: "realtime" })) needsFullRender = true;
          return;
        }
        if (!card) { needsFullRender = true; return; }
        needsFullRender = true;
        return;
      }

      if (!lineCard.update(card, line, lineId, { mode: "realtime" })) needsFullRender = true;
    });
    return !needsFullRender;
  }

  function renderFiltered() {
    if (!_latestLines) return;
    var filtered = getFilteredLines();
    var container = document.getElementById("realtimeStatusContainer");
    if (!container) return;
    window.DataState.renderList(container, filtered, { mode: "realtime", lineOrder: _latestOrder || [] });
    // 即使当前选择没有线路，也保留完整的运营商选项。
    renderFilterBar(_latestLines);
  }

  var _renderedStatusSignatures = {};
  function reconcileRealtimeList(container, linesObj) {
    var _perfStart = (window.performance && performance.now) ? performance.now() : Date.now();
    var cards = container ? container.querySelectorAll(".rs-line-card") : [];
    if (!cards || cards.length === 0) {
      renderFiltered();
      _renderedStatusSignatures = {};
      return;
    }
    var changed = [];
    var next = {};
    var visibleLines = window.DataState.filterLinesByOperator(linesObj, _selectedOperator);
    Object.keys(visibleLines || {}).forEach(function(id) {
      next[id] = statusSignature(visibleLines[id]);
      if (_renderedStatusSignatures[id] !== next[id]) changed.push(id);
    });
    var oldIds = Object.keys(_renderedStatusSignatures);
    var structureChanged = oldIds.length !== Object.keys(next).length || oldIds.some(function(id) { return !next.hasOwnProperty(id); });
    if (structureChanged || !patchRealtimeCards(container, linesObj, changed)) renderFiltered();
    _renderedStatusSignatures = next;
    var _perfMs = (((window.performance && performance.now) ? performance.now() : Date.now()) - _perfStart);
    if (_perfMs >= 50 && window.console && console.warn) {
      console.warn("[PixelPerf] realtimeReconcile", Math.round(_perfMs * 10) / 10 + "ms", { changed: changed.length, structureChanged: structureChanged });
    }
  }

  function init() {
    const container = document.getElementById("realtimeStatusContainer");
    if (!container) return;

    // 立即挂载结构性筛选器。数据就绪只负责填充内容；
    // 不得决定组件是否存在。
    // 独立于数据加载生命周期进行订阅。
    var filterElement = document.getElementById("realtimeFilterBar");
    if (filterElement) filterElement.addEventListener("pt:operator-filter-change", function(event) {
      setFilter(event.detail && event.detail.operator);
    });

    renderFilterBar({});

    function renderLinesList(container, linesObj, lineOrderArr) {
      window.DataState.renderList(container, linesObj, { mode: "realtime", lineOrder: lineOrderArr });
    }

    function getLines() {
      // 优先级 1：DataFusion 融合数据（包含延误信息）。
      if (window.DataFusion) {
        var fused = window.DataFusion.getFusedData();
        if (fused && fused.lines && Object.keys(fused.lines).length > 0) return fused;
      }
       return null;
    }

    function render() {
      var fused = getLines();
      if (!fused || !fused.lines || Object.keys(fused.lines).length === 0) {
        window.DataState.renderPageState(container, "loading");
        return;
      }
      _latestLines = fused.lines;
      _latestOrder = fused.lineOrder || [];
      try {
        var visibleLines = getFilteredLines();
        renderLinesList(container, visibleLines, _latestOrder);
        renderFilterBar(fused.lines);
      } catch (e) {
        window.DataState.renderPageState(container, "render_error");
      }
    }

    if (window.DataState && window.DataState.setPageStateRetry) {
      window.DataState.setPageStateRetry(container, function() {
        window.DataState.renderPageState(container, "loading");
        if (!window.DataLoader || typeof window.DataLoader.retry !== "function") {
          return Promise.reject(new Error("DataLoader retry unavailable"));
        }
        return window.DataLoader.retry().then(function() {
          render();
        });
      });
    }

    // 先执行立即检查。
    render();

    // Canonical loader events are the sole startup lifecycle. DataState/DataFusion
    // render usable snapshots; loader failure terminates loading immediately.
    // Canonical railway data may arrive after the startup poll has already
    // terminated in an error/timeout state. Recover the list immediately from the
    // same canonical readiness signal instead of waiting for a later fusion emission.
    window.addEventListener("pt:railway-ready", function() {
      if (container.querySelector(".rs-line-card")) {
        if (!_latestLines) { var snapshot = getLines(); if (snapshot) _latestLines = snapshot.lines; }
        if (_latestLines) renderFilterBar(_latestLines);
        return;
      }
      render();
    });
    window.addEventListener("pt:railway-error", function() {
      if (container.querySelector(".rs-line-card")) return;
      window.DataState.renderPageState(container, navigator.onLine === false ? "offline" : "fetch_error");
    });

    // 订阅 DataFusion 更新以获取实时状态。
    if (window.DataFusion) {
      window.DataFusion.subscribe(function(fusedData) {
        if (fusedData && fusedData.lines && Object.keys(fusedData.lines).length > 0) {
          _latestLines = fusedData.lines;
          _latestOrder = fusedData.lineOrder || [];
          // 一次 DataFusion 推送最多触发一次完整列表重建。
          // 旧的运营商筛选模式会先渲染完整列表，
          // 随即又替换为筛选列表，造成两次 DOM 工作。
          // 实时快照通常只改变状态/区间数据。保留
          // 已挂载的运营商/线路外壳，只就地更新受影响的卡片。
          reconcileRealtimeList(container, _latestLines);
          renderFilterBar(_latestLines);
          if (_currentModalLine) openModal(_currentModalLine, _latestLines, _currentModalIdentity, _currentModalTitle);
        }
      });
    }

    // 设置弹窗处理器。
    var modal = document.getElementById('lineDetailModal');
    if (modal) {
      modal.querySelector('.rs-modal-close').addEventListener('click', closeModal);
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
      });
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
      });
    }

    // 卡片点击处理器。
    container.addEventListener('click', function(e) {
      var card = e.target.closest('.rs-line-card');
      if (card && _latestLines) {
        clearSelectedCards();
        card.classList.add('selected');
        openModal(card.dataset.line, _latestLines, card.dataset.lineIdentity || "", (card.querySelector(".rs-line-name") || {}).textContent || "");
      }
    });
    if (typeof window.onLanguageChange === "function") {
      window.onLanguageChange(function() {
        // 语言属于展示状态。就地重建卡片内容，
        // 不要让页面重新走 render()/加载态列表替换。
        if (_latestLines) {
          var ids = Object.keys(_latestLines);
          patchRealtimeCards(container, _latestLines, ids);
          renderFilterBar(_latestLines);
          setFilter(_selectedOperator);
        }
        if (_currentModalLine && _latestLines) {
          openModal(_currentModalLine, _latestLines, _currentModalIdentity, _currentModalTitle);
        }
      });
    }
    // WebRunInfo 数据更新（自动抓取/手动输入）后重开弹窗
    document.addEventListener("pt-runinfo-updated", function() {
      if (_currentModalLine && _latestLines) {
        try { openModal(_currentModalLine, _latestLines, _currentModalIdentity); } catch(e) {}
      }
    });
  }
  init();
})();
