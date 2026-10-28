/**
 * Pixel Tetsudo - 搜索 UI 模块（已优化）
 */
(function() {
  'use strict';

  const SearchUI = {
    container: null,
    fromInput: null,
    toInput: null,
    searchBtn: null,
    resultsDiv: null,

    // 公共 API：按车站 ID 填充起点/终点输入框。以下两种恢复路径共用这一入口：
    // ?from=&to= URL 恢复（init）和历史恢复（SearchHistory.restoreFromRecent）。
    // 同时设置 value 和权威的 data-station-id；调用方不得直接操作内部状态。
    setRoute: function(fromId, toId) {
      var db = window.RailwayDB;
      var lang = window.currentLang || 'ja';
      var fill = function(input, id) {
        if (!input || !id) return;
        var name = (db && db.resolveStationName) ? (db.resolveStationName(id, lang) || id) : id;
        input.value = name;
        // 先派发 input，让监听器清理过期 ID 并刷新建议
        // 再写入权威车站 ID。
        input.dispatchEvent(new Event('input'));
        input.setAttribute('data-station-id', id);
      };
      fill(this.fromInput, fromId);
      fill(this.toInput, toId);
    },

    init: function() {
      this.container = document.getElementById('searchContainer');
      if (!this.container) {
        return;
      }

      this.fromInput = document.getElementById('searchFrom');
      this.toInput = document.getElementById('searchTo');
      this.searchBtn = document.getElementById('searchBtn');
      this.swapBtn = document.getElementById('swapBtn');
      this.resultsDiv = document.getElementById('searchResults');

      this.timeMode = document.getElementById('searchTimeMode');
      this.timeInput = document.getElementById('searchTime');
      if(this.timeMode && this.timeInput) {
        var clock = new Date(Date.now()+9*3600000);
        this.timeInput.value = String(clock.getUTCHours()).padStart(2,'0')+':'+String(clock.getUTCMinutes()).padStart(2,'0');
        this.timeMode.addEventListener('change', () => { this.timeInput.disabled=this.timeMode.value==='now'; });
      }

      // 解析 ?from=/&to= URL 参数。等 RailwayDB 数据就绪后再真正填充；
      // 解析罗马字车站 ID（如 Kita-Senju）需要名称映射；
      // 过早填充会让 setRoute 回退到输入框中的原始罗马字 ID，
      // 形成点击历史记录时的“罗马字泄漏”。
      var _params = null;
      try { _params = new URLSearchParams(window.location.search); } catch(e) {}
      var _fromParam = _params ? _params.get('from') : null;
      var _toParam = _params ? _params.get('to') : null;
      if (_fromParam || _toParam) {
        var self = this;
        var _tries = 0;
        (function _waitDb() {
          var _ready = !!(window.RailwayDB && window.RailwayDB.resolveStationName &&
                          window.DataLoader && window.DataLoader.isLoaded && window.DataLoader.isLoaded());
          var _err = !!(window.DataLoader && window.DataLoader.getError && window.DataLoader.getError());
          if (_ready || _err || _tries > 300) {
            self.setRoute(_fromParam, _toParam);
            try { window.history.replaceState({}, '', window.location.pathname); } catch(e) {}
          } else {
            _tries++;
            setTimeout(_waitDb, 50);
          }
        })();
      }
      this.lastRouteResult = null;
      this.bindEvents();
      window.onLanguageChange(() => this.refreshUI());
    },

    refreshUI: function() {
      const t = window.t || function(key) { return key; };
      if (this.fromInput) this.fromInput.placeholder = t('search.fromPlaceholder');
      if (this.toInput) this.toInput.placeholder = t('search.toPlaceholder');
      if (this.searchBtn) this.searchBtn.textContent = t('search.btn');
      // 静态 [data-i18n] / [data-i18n-placeholder] 节点只由
      // lang-init.js 负责。这里不要重写任意元素的 textContent：复合
      // 控件可能包含必须在切换语言后保留的结构性图标/符号。
      // 清空建议缓存，使重新查询时按新语言解析名称。
      this._suggestionCache = {};
      this._suggestionCacheDOM = {};
      this._suggestionBindDone = {};
      // 重新解析输入框中已选车站名称（仅在已知 stationId 时）。
      var _lang = window.currentLang || 'ja';
      if (this.fromInput) {
        var _fid = this.fromInput.getAttribute('data-station-id');
        if (_fid && window.RailwayDB && window.RailwayDB.resolveStationName) {
          var _fn = window.RailwayDB.resolveStationName(_fid, _lang);
          if (_fn) this.fromInput.value = _fn;
        }
      }
      if (this.toInput) {
        var _tid = this.toInput.getAttribute('data-station-id');
        if (_tid && window.RailwayDB && window.RailwayDB.resolveStationName) {
          var _tn = window.RailwayDB.resolveStationName(_tid, _lang);
          if (_tn) this.toInput.value = _tn;
        }
      }
      // 如果已执行过搜索，则重新渲染路径结果。
      if (this.lastRouteResult && this.resultsDiv && this.resultsDiv.innerHTML.trim() !== '') {
        this.renderResults(this.lastRouteResult, t);
      }
    },


    _swapInputs: function() {
      var fromVal = this.fromInput ? this.fromInput.value : '';
      var toVal = this.toInput ? this.toInput.value : '';
      var fromId = this.fromInput ? (this.fromInput.getAttribute('data-station-id') || '') : '';
      var toId = this.toInput ? (this.toInput.getAttribute('data-station-id') || '') : '';
      if (this.fromInput) {
        this.fromInput.value = toVal;
        this.fromInput.setAttribute('data-station-id', toId || '');
      }
      if (this.toInput) {
        this.toInput.value = fromVal;
        this.toInput.setAttribute('data-station-id', fromId || '');
      }
      // 触发建议刷新。
      if (this.fromInput && this.fromInput.value) {
        this.showSuggestions(this.fromInput.value, 'fromSuggestions', this.fromInput);
      }
      if (this.toInput && this.toInput.value) {
        this.showSuggestions(this.toInput.value, 'toSuggestions', this.toInput);
      }
    },

    bindEvents: function() {
      const self = this;

      if (this.swapBtn) {
        this.swapBtn.addEventListener('click', () => this._swapInputs());
      }
      if (this.searchBtn) {
        this.searchBtn.addEventListener('click', () => self.performSearch());
      }

      if (this.fromInput) {
        this.fromInput.addEventListener('keypress', e => {
          if (e.key === 'Enter') self.performSearch();
        });
        this.fromInput.addEventListener('input', function() {
          // 手动编辑会使之前选中的车站失效：如果不清除，
          // data-station-id 仍指向旧车站，而
          // 输入框显示新名称，performSearch 却会解析到旧车站。
          this.removeAttribute('data-station-id');
          self.showSuggestions(this.value, 'fromSuggestions', this);
        });
      }

      if (this.toInput) {
        this.toInput.addEventListener('keypress', e => {
          if (e.key === 'Enter') self.performSearch();
        });
        this.toInput.addEventListener('input', function() {
          // Same stale data-station-id invalidation as the from input above.
          this.removeAttribute('data-station-id');
          self.showSuggestions(this.value, 'toSuggestions', this);
        });
      }

      document.addEventListener('click', e => {
        if (!e.target.closest('.input-group')) {
          document.querySelectorAll('.suggestions').forEach(el => el.classList.remove('active'));
        }
      });
    },

    _suggestionCache: {},
    _suggestionBindDone: {},

    showSuggestions: function(query, containerId, inputEl) {
      const container = document.getElementById(containerId);
      if (!container) return;

      if (!query || query.length < 1) {
        container.classList.remove('active');
        container.innerHTML = '';
        return;
      }

      // 缓存建议，避免重复查询。
      if (!this._suggestionCache[query]) {
        this._suggestionCache[query] = window.RouteSearch ? window.RouteSearch.findStationsByTerm(query) : [];
      }
      const stations = this._suggestionCache[query];
      if (stations.length === 0) {
        container.classList.remove('active');
        container.innerHTML = '';
        return;
      }

      // 当前查询有缓存 DOM 时直接复用。
      const cachedKey = containerId + '_' + query;
      if (this._suggestionBindDone[cachedKey]) {
        container.innerHTML = this._suggestionCacheDOM[cachedKey] || '';
        container.classList.add('active');
        // 重新绑定点击处理器：重写 innerHTML 会销毁旧节点
        // 及其监听器，后续 input 事件会让条目无法点击。
        this._bindSuggestionEvents(container, inputEl);
        return;
      }

      container.innerHTML = stations.map(function(s) {
				var did = s.stationId || s;
				var dn = s.displayName || s;
				return "<div class=\"suggestion-item\" data-station-id=\"" + window.escapeHtml(did) + "\">" + window.escapeHtml(dn) + "</div>";
			}).join("");

      container.classList.add('active');

      // 缓存渲染后的 HTML。
      this._suggestionCacheDOM = this._suggestionCacheDOM || {};
      this._suggestionCacheDOM[cachedKey] = container.innerHTML;
      this._suggestionBindDone[cachedKey] = true;

      this._bindSuggestionEvents(container, inputEl);
    },

    _bindSuggestionEvents: function(container, inputEl) {
      container.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          var did = item.getAttribute('data-station-id');
          var dn = item.textContent;
          inputEl.value = dn;
          inputEl.setAttribute('data-station-id', did || '');
          container.classList.remove('active');
          container.innerHTML = '';
        });
      });
    },

    performSearch: function() {
      // Prefer station ID from data-station-id (set by suggestion click); fall back to display name for direct input
      const rawFrom = (this.fromInput ? (this.fromInput.getAttribute('data-station-id') || this.fromInput.value.trim()) : '');
      const rawTo = (this.toInput ? (this.toInput.getAttribute('data-station-id') || this.toInput.value.trim()) : '');
      // 直接输入回退：显示名称必须解析为 canonical 车站 ID（如 Kitasenju → Kita-Senju）。
      var _resolveId = function(v) {
        if (!v) return '';
        if (window.StationResolver) {
          var r = window.StationResolver.resolve(v);
          if (r && r.length > 0 && r[0].stationId) return r[0].stationId;
        }
        return v;
      };
      const from = _resolveId(rawFrom);
      const to = _resolveId(rawTo);
      const t = window.t || function(key) { return key; };

      this._renderGeneration = (this._renderGeneration || 0) + 1;
      this.lastRouteResult = null;
      var timeOptions={mode:this.timeMode ? this.timeMode.value : 'now',time:this.timeInput ? this.timeInput.value : ''};
      if(timeOptions.mode!=='now' && !/^\d{2}:\d{2}$/.test(timeOptions.time)) {
        this.resultsDiv.textContent=t('search.invalid_time'); return;
      }
      if (!from || !to) {
        if (this.resultsDiv) {
          this.resultsDiv.innerHTML = '<div class="search-error">' + t('validate.input_required') + '</div>';
        }
        return;
      }

      if (this.resultsDiv) {
        this.resultsDiv.innerHTML = '<div class="rs-loading"><div class="rs-loading-spinner"></div><span>' + t('status.loading') + '</span></div>';
      }

      this.currentMode = this.currentMode || 'combo';
      let result = null;
      if (window.RouteSearch) {
        result = window.RouteSearch.findRoute(from, to, this.currentMode);
        if (this.resultsDiv) {
          if (result) {
            result.timeOptions=timeOptions;
            this.renderResults(result, t);
            this.lastRouteResult = result;
            // 将已完成的搜索持久化到 History（History 通过 SearchUI
            // 公共 API 消费输出；history.js 中旧的 monkey-patch
            // 包装构造属性但从未触发）。
            if (window.SearchHistory && window.SearchHistory.saveToHistory) {
              window.SearchHistory.saveToHistory(from, to, result);
            }
          } else {
            this.resultsDiv.innerHTML = '<div class="search-error">' + t('search.no_results') + '</div>';
          }
        }
      }
      return result;
    },

    getRouteRealtime: function(result) {
      if (!result || !result.routeSegments || result.routeSegments.length === 0) return null;
      var cacheKey = result.routeSegments.map(function(seg) {
        return seg.lineId || seg.lineName || '';
      }).join('||');
      if (!this._routeRealtimeCache) this._routeRealtimeCache = {};
      if (this._routeRealtimeCache[cacheKey]) return this._routeRealtimeCache[cacheKey];
      var rtData = null;
      try { rtData = window.DATA_FUSION ? window.DATA_FUSION.getDelayInfoForLineIds(result.routeSegments.map(function(s){return s.lineId}).filter(Boolean)) : null; } catch(e) {}
      this._routeRealtimeCache[cacheKey] = rtData;
      return rtData;
    },

    // 线路徽章：使用 RailwayDB 的 line.image（Provider 所有字段）图标，
    // 缺少图标时回退到已解析的显示名称，避免出现空白。
    _lineBadge: function(lid, plat) {
      if (!lid) return '';
      var nm = (window.RailwayDB && window.RailwayDB.resolveLineName) ? window.RailwayDB.resolveLineName(lid, window.currentLang) : lid;
      var line = (window.RailwayDB && window.RailwayDB.getLine) ? window.RailwayDB.getLine(lid) : null;
      var _canonicalImg = line && line.image && !/(グループ|ロゴ|マーク|アイコン|シンボル)/.test(line.image) ? line.image : '';
      var img = _canonicalImg || (window.LineOperationSystemsResolveIcon && window.LineOperationSystemsResolveIcon(lid)) || '';
      var _platChip = '';
      if (plat) {
        var _plabel = (window.t && window.t('search.platform')) ? window.t('search.platform').replace('{p}', plat) : (plat + '号站台');
        _platChip = '<span class="journey-line-platform">' + window.escapeHtml(_plabel) + '</span>';
      }
      if (img) {
        return '<span class="journey-line-badge"><img class="journey-line-icon" src="' + window.escapeHtml(img) + '" alt="' + window.escapeHtml(nm) + '" title="' + window.escapeHtml(nm) + '" loading="lazy"><span class="journey-line-name">' + window.escapeHtml(nm) + '</span>' + _platChip + '</span>';
      }
      return '<span class="journey-line-name-fallback">' + window.escapeHtml(nm) + _platChip + '</span>';
    },

    renderResults: function(result, t) {
      if (!this.resultsDiv) return;
      var renderGeneration=this._renderGeneration=(this._renderGeneration || 0)+1;
      var lang = window.currentLang || 'ja';
      var dur = result.durationMin || 0;
      var transfers = 0;
      var segs = result.routeSegments || result.lineInfo || [];
      for (var i = 0; i < segs.length; i++) { if (segs[i].type === 'transfer' && !segs[i].through) transfers++; }

      var origin = window.RailwayDB && window.RailwayDB.resolveStationName ? window.RailwayDB.resolveStationName(result.path[0], lang) : (result.path[0] || '');
      var dest = window.RailwayDB && window.RailwayDB.resolveStationName ? window.RailwayDB.resolveStationName(result.path[result.path.length - 1], lang) : (result.path[result.path.length - 1] || '');

      var html = '<div class="search-result journey-card">';
      // 模式标签（推荐 / 最快 / 最少换乘），对应换乘案内。
      var _modes = [['combo', t('search.mode.combo')], ['duration', t('search.mode.duration')], ['transfers', t('search.mode.transfers')]];
      html += '<div class="journey-modes">';
      for (var _mi = 0; _mi < _modes.length; _mi++) {
        var _mCls = (_modes[_mi][0] === this.currentMode) ? 'mode-tab active' : 'mode-tab';
        html += '<button type="button" class="' + _mCls + '" data-mode="' + _modes[_mi][0] + '">' + window.escapeHtml(_modes[_mi][1]) + '</button>';
      }
      html += '</div>';
      // 标题：总时长 + 换乘次数 + 估算票价。
      html += '<div class="journey-header">';
      html += '<span class="journey-duration">' + dur + ' ' + t('search.min_unit') + '</span>';
      if (transfers > 0) { html += '<span class="journey-transfers">' + transfers + ' ' + t('search_result.transfer_count') + '</span>'; }
      var _totalFare = (window.FareEstimator && result.routeSegments) ? window.FareEstimator.estimateTotal(result.routeSegments) : null;
      if (_totalFare) { html += '<span class="journey-fare">¥' + _totalFare.toLocaleString() + ' <span class="journey-fare-tag">' + window.escapeHtml(t('search.fare_tag')) + '</span></span>'; }
      html += '</div>';
      html += '<div class="journey-schedule" role="status" aria-live="polite">'+window.escapeHtml(t('search.schedule_loading'))+'</div>';
      // 时间线：起点 → 区间 → 终点。
      html += '<div class="journey-timeline">';
      // 起点节点。
      html += '<div class="journey-node journey-node--origin">';
      html += '<span class="journey-node-dot"></span>';
      html += '<span class="journey-node-label">' + window.escapeHtml(origin) + '</span>';
      html += '</div>';
      // 区间。
      if (segs.length > 0) {
        html += '<div class="journey-segments">';
        for (var i = 0; i < segs.length; i++) {
          var seg = segs[i];
          if (seg.type === 'transfer') {
            // 换乘徽章：实现收敛至 js/transfer-badge.js（window.TransferBadge），样式与直通变体统一
            html += window.TransferBadge ? window.TransferBadge.build(segs, i, lang, this._lineBadge.bind(this)) : '';
          } else {
            var lineId = seg.lineId || null;
            var lineName = lineId ? (window.RailwayDB && window.RailwayDB.resolveLineName ? window.RailwayDB.resolveLineName(lineId, window.currentLang) : null) : null;
            var lineColor = (window.LineOperationSystemsResolveColor && window.LineOperationSystemsResolveColor(lineId)) || (window.RailwayDB && window.RailwayDB.getLine(lineId) ? (window.RailwayDB.getLine(lineId).color || null) : null) || null;
            var fromSt = window.RailwayDB && window.RailwayDB.resolveStationName ? window.RailwayDB.resolveStationName(seg.fromStation, lang) : (seg.fromStation || '');
            var toSt = window.RailwayDB && window.RailwayDB.resolveStationName ? window.RailwayDB.resolveStationName(seg.toStation, lang) : (seg.toStation || '');
            html += '<div class="journey-seg" data-seg-color="' + window.escapeHtml(lineColor || '') + '" data-seg-idx="' + i + '">';
            html += '<div class="journey-seg-head">';
            html += '<span class="journey-seg-name">' + window.escapeHtml(lineName || '') + '</span>';
            if (seg.trainType) { html += '<span class="journey-seg-type">' + window.escapeHtml(t('train_type.' + seg.trainType)) + '</span>'; }
            // 运行状态徽章与实时页面同步（仅延误/停运时显示）。
            var _stBadge = '';
            if (lineId && window.DataFusion) {
              try {
                var _fused = window.DataFusion.getFusedData();
                var _fl = _fused && _fused.lines && _fused.lines[lineId];
                var _di = _fl && _fl.delayInfo;
                if (_di && (_di.status === 'delayed' || _di.status === 'suspended')) {
                  var _stCls = _di.status === 'delayed' ? 'delayed' : 'suspended';
                  var _stIcon = _di.status === 'delayed' ? '\u25b3' : '\u00d7';
                  var _stLabel = (window.t && window.t('status.' + _di.status)) || _di.status;
                  _stBadge = ' <span class="route-status-badge ' + _stCls + '">' + _stIcon + ' ' + window.escapeHtml(_stLabel) + '</span>';
                }
              } catch(_e) {}
            }
            if (_stBadge) { html += _stBadge; }
            // 方向徽章：乗車情報（行先）掛在乗車段頂部——Yahoo式乗車駅直下挂位；恒取段终点（行进方向）
            // （线路站序反向乘车段曾误显示起点站名，例：新宿→渋谷 显示"新宿方面"，乘客视角应始终是驶向的站）
            if (seg.direction !== 0 && lineId) {
              var _dirSt = seg.toStation;
              var _dirName = (window.RailwayDB && window.RailwayDB.resolveStationName) ? window.RailwayDB.resolveStationName(_dirSt, lang) : _dirSt;
              html += '<span class="journey-seg-direction-badge">' + window.escapeHtml(t('search.direction').replace('{s}', _dirName)) + '</span>';
            }
            html += '<span class="journey-seg-times" data-seg-times="' + i + '"></span>';
            html += '</div>';
            html += '<span class="journey-seg-route">' + window.escapeHtml(fromSt) + ' &rarr; ' + window.escapeHtml(toSt) + '</span>';
            html += '</div>';
          }
        }
        html += '</div>';
      }
      // 终点节点。
      html += '<div class="journey-node journey-node--dest">';
      html += '<span class="journey-node-dot"></span>';
      html += '<span class="journey-node-label">' + window.escapeHtml(dest) + '</span>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      var destStation = result.path[result.path.length - 1];
      var spotsHtml = '';
      if (destStation && typeof this.renderNearbySpots === 'function') { spotsHtml = this.renderNearbySpots(destStation, t); }
      this.resultsDiv.innerHTML = html;
      // 通过 DOM API 应用行程区间边框颜色（符合 CSP；style-src 'self' 会阻止内联 style 属性）。
      this.resultsDiv.querySelectorAll('.journey-seg').forEach(function(seg) {
        var color = seg.getAttribute('data-seg-color');
        if (color) seg.style.setProperty('border-left-color', color);
      });
      if (spotsHtml) { this.resultsDiv.insertAdjacentHTML('beforeend', spotsHtml); }
      // 発着時刻推算（异步回填）——ODPT 时刻表/手动表查询完成后把 "14:05発 14:12着"
      // 注入各乗車段右侧（数据未就绪时不阻塞首屏，查询失败静默降级为无时刻展示）
      if (window.RouteTimetable && result.routeSegments) {
        var _rtSelf = this;
        var _rtDP = t('search.time_dep') || '\u767a';
        var _rtAR = t('search.time_arr') || '\u7740';
        window.RouteTimetable.enrichSegments(result.routeSegments, result.timeOptions).then(function(res) {
          if (!_rtSelf.resultsDiv || renderGeneration!==_rtSelf._renderGeneration) return;
          var notice=_rtSelf.resultsDiv.querySelector('.journey-schedule');
          if(notice) notice.textContent=res && res.complete ? res.serviceDate+' · '+t('search.schedule_summary').replace('{d}',res.departure).replace('{a}',res.arrival).replace('{m}',res.durationMin)+' · '+t('search.schedule_note') : t('search.schedule_missing');
          if(res && res.complete){var duration=_rtSelf.resultsDiv.querySelector('.journey-duration');if(duration) duration.textContent=res.durationMin+' '+t('search.min_unit');}
          // enrich 返回 { times, downgrade }；downgrade = 直通贯通失败需降级为换乘的 transfer 段索引
          var _times = (res && res.times) ? res.times : (res || {});
          for (var _ridx in _times) {
            var _slot = _rtSelf.resultsDiv.querySelector('[data-seg-times="' + _ridx + '"]');
            if (!_slot || !_times[_ridx]) continue;
            var _tm = _times[_ridx];
            var _platHtml = _tm.platform ? '<span class="journey-seg-platform">' + window.escapeHtml(t('search.platform').replace('{p}', _tm.platform)) + '</span>' : '';
            _slot.innerHTML = '<span class="journey-seg-time-dep">' + window.escapeHtml(_tm.dep) + _rtDP + '</span>' +
                              _platHtml +
                              '<span class="journey-seg-time-arr">' + window.escapeHtml(_tm.arr) + _rtAR + '</span>';
          }
          // 直通降级：ODPT 分表无贯通车次时，"乗換不要"改回换乘文案并去除直通样式（避免误导）
          var _dg = (res && res.downgrade) || [];
          for (var _d2 = 0; _d2 < _dg.length; _d2++) {
            var _tr = _rtSelf.resultsDiv.querySelector('[data-tx-idx="' + _dg[_d2] + '"]');
            if (!_tr) continue;
            _tr.classList.remove('journey-transfer--through');
            var _txt = _tr.querySelector('.journey-transfer-text');
            if (_txt) {
              _txt.classList.remove('journey-transfer-text--through');
              _txt.textContent = t('search_result.transfer');
            }
          }
        }).catch(function(){if(renderGeneration===_rtSelf._renderGeneration){var notice=_rtSelf.resultsDiv.querySelector('.journey-schedule');if(notice) notice.textContent=t('search.schedule_missing');}});
      }
      // 模式标签切换：使用新模式重新搜索（在 innerHTML 提交后绑定）。
      var _self = this;
      var _modeTabs = this.resultsDiv ? this.resultsDiv.querySelectorAll('.mode-tab') : [];
      for (var _ti = 0; _ti < _modeTabs.length; _ti++) {
        _modeTabs[_ti].addEventListener('click', function() {
          _self.currentMode = this.getAttribute('data-mode');
          _self.performSearch();
        });
      }
    },




  };

  window.SearchUI = SearchUI;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SearchUI.init());
  } else {
    SearchUI.init();
  }
})();
