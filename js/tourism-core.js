/*
 * Tourism Detail Core - 三类型详情页公共底座
 * 由 tourism-event.js / tourism-spot.js / tourism-shop.js 共享：
 *   - 数据加载流程（DataLoader / 就绪事件）
 *   - 条目查找 / 距离·出站指引计算（跨站最优出口融合口径）
 *   - 公共章节构建（about / map / 徽章 / 字段）
 *   - 地图初始化（MapLibre + MapTiler → Leaflet 兜底）
 *   - 翻译 / 语言切换
 * 三类型各自的渲染（快速信息条 / 信息网格 / 正文顺序 / 菜单板块）在三个类型 JS 中独立实现。
 */
(function() {
  "use strict";

  var THEME_GRADIENTS = {
    history:  "linear-gradient(135deg, #8B4513 0%, #D2691E 100%)",
    nature:   "linear-gradient(135deg, #228B22 0%, #32CD32 100%)",
    food:     "linear-gradient(135deg, #FF6347 0%, #FFA500 100%)",
    shrine:   "linear-gradient(135deg, #DC143C 0%, #FF6B6B 100%)",
    night:    "linear-gradient(135deg, #191970 0%, #4169E1 100%)",
    seasonal: "linear-gradient(135deg, #FF69B4 0%, #FFB6C1 100%)",
    event:    "linear-gradient(135deg, #FF4500 0%, #FFD700 100%)",
    museum:   "linear-gradient(135deg, #4A4A4A 0%, #8B8B8B 100%)",
    landmark: "linear-gradient(135deg, #008803 0%, #00AA00 100%)",
    park:     "linear-gradient(135deg, #2E8B57 0%, #3CB371 100%)",
    local:    "linear-gradient(135deg, #8B7355 0%, #D2B48C 100%)",
    shopping: "linear-gradient(135deg, #FF6347 0%, #FFA500 100%)",
    mall:     "linear-gradient(135deg, #7B68EE 0%, #9370DB 100%)",
    temple:   "linear-gradient(135deg, #B8860B 0%, #DAA520 100%)",
    default:  "linear-gradient(135deg, #008803 0%, #006600 100%)"
  };

  var MAPTILER_KEY = 'tYRNv4akrEAKTL5ORzUm';  // MapTiler 免费 key（origin 白名单：GitHub Pages + 本地开发端口 8017，防盗用）

  var state = {
    currentSpotIndex: 0,
    allSpots: [],
    currentStationKey: null,
    scopedSpots: [],
    lang: window.currentLang || 'ja',
    currentSpot: null
  };

  function t(key) {
    return (typeof window.t === "function") ? window.t(key) : key;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function getStationLabel(key) {
    if (window.RailwayDB && window.RailwayDB.resolveStationName) {
      return window.RailwayDB.resolveStationName(key, state.lang) || key;
    }
    return key;
  }

  // 根据当前语言获取景点显示名称。
  function getSpotName(spot) {
    if (!spot) return '';
    var l = state.lang || 'ja';
    if (spot.name_i18n && spot.name_i18n[l]) return spot.name_i18n[l];
    if (spot['name_' + l]) return spot['name_' + l];
    return '';
  }

  // 获取 i18n 字段值并按优先级回退。
  function getI18nField(spot, field) {
    if (!spot) return '';
    var i18nField = field + '_i18n';
    if (spot[i18nField] && spot[i18nField][state.lang]) return spot[i18nField][state.lang];
    if (spot[i18nField] && spot[i18nField].ja) return spot[i18nField].ja;
    return spot[field] || '';
  }

  // 翻译营业时间/费用字段中的常见日文词语。
  function translateCommonTerms(text) {
    if (!text) return text;
    var translations = {
      '無料': { zh: '免费', en: 'Free', ko: '무료' },
      '年中無休': { zh: '全年无休', en: 'Open year-round', ko: '연중무휴' },
      '定休日': { zh: '定期休息日', en: 'Regular holiday', ko: '정기휴일' },
      '火曜定休': { zh: '周二休息', en: 'Closed Tuesdays', ko: '화요일 휴무' },
      '外観のみ公開': { zh: '仅外观开放', en: 'Exterior only', ko: '외관만 공개' },
      '内部非公開': { zh: '内部不开放', en: 'Interior not open', ko: '내부 비공개' },
      '24時間営業': { zh: '24小时营业', en: 'Open 24 hours', ko: '24시간 영업' },
      '24時間開放': { zh: '24小时开放', en: 'Open 24 hours', ko: '24시간 개방' }
    };
    var result = text;
    Object.keys(translations).forEach(function(term) {
      if (translations[term][state.lang]) {
        result = result.replace(new RegExp(term, 'g'), translations[term][state.lang]);
      }
    });
    return result;
  }

  // 从全局 TOURISM_SPOTS 池获取所有景点（不绑定车站）。
  function getAllSpots() {
    return window.TOURISM_SPOTS || [];
  }

  // 获取范围内景点：使用全局池；设置 stationKey 时按距车站距离排序。
  function getScopedSpots() {
    if (state.currentStationKey && window.TourismProximity) {
      var nearby = TourismProximity.getNearbySpotsByStation(state.currentStationKey, { radius: 50000, limit: 100 });
      if (nearby && nearby.length > 0) {
        return nearby.map(function(item) { return item.spot; });
      }
      return [];
    }
    return state.allSpots;
  }

  // 按名称或索引查找景点。
  function findSpotByName(name) {
    if (!name || state.allSpots.length === 0) return null;
    return state.allSpots.find(function(s) {
      return s.name === name
        || (s.name_i18n && Object.keys(s.name_i18n).some(function(lang) { return s.name_i18n[lang] === name; }))
        || ['ja', 'zh', 'en', 'ko'].some(function(lang) { return s['name_' + lang] === name; });
    }) || null;
  }

  function getGradientForTags(tags) {
    if (!tags || tags.length === 0) return THEME_GRADIENTS.default;
    for (var i = 0; i < tags.length; i++) {
      if (THEME_GRADIENTS[tags[i]]) return THEME_GRADIENTS[tags[i]];
    }
    return THEME_GRADIENTS.default;
  }

  function getHeroClassForGradient(gradient) {
    var norm = gradient.replace(/\s+/g, " ").trim();
    var order = ["default","landmark","history","nature","food","shrine","night","seasonal","event","museum","park","local","temple","mall"];
    for (var i = 0; i < order.length; i++) {
      var ref = THEME_GRADIENTS[order[i]];
      if (ref && norm.indexOf(ref.replace(/\s+/g, " ").trim().substring(0, 25)) >= 0) {
        return "article-hero--" + order[i];
      }
    }
    return "article-hero--landmark";
  }

  // 条目三类型判定（活动/店铺/景点）——列表路由与详情渲染共用
  // 玩乐·体验（play）归店铺；mall 标签优先归景点。
  function getSpotType(spot) {
    if (window.TourismType && window.TourismType.getSpotType) {
      return window.TourismType.getSpotType(spot);
    }
    var tags = (spot && spot.tags) || [];
    if (tags.indexOf('event') >= 0) return 'event';
    if (tags.indexOf('mall') >= 0) return 'spot';
    if (tags.indexOf('food') >= 0 || tags.indexOf('shopping') >= 0 || tags.indexOf('play') >= 0) return 'shop';
    return 'spot';
  }

  // 距离/出站指引计算（跨站最优出口融合口径）→ {stationName, distMain, distSub, distText}
  function computeDistance(spot, stationKey) {
    var ctx = { stationName: '', distText: '', distMain: '', distSub: '' };
    if (window.DataLoader && !window.DataLoader.isLoaded()) return ctx;
    var mapLat = (spot.coord && spot.coord[0]) || 35.71;
    var mapLng = (spot.coord && spot.coord[1]) || 139.80;
    var stationCoords = window.STATION_COORDS || {};
    var spotStation = spot.station || state.currentStationKey || '';
    if (stationKey || state.currentStationKey) {
      ctx.stationName = getStationLabel(stationKey || state.currentStationKey);
    } else if (spotStation && stationCoords[spotStation]) {
      ctx.stationName = getStationLabel(spotStation);
    }
    var exitReco = null;
    if (window.TourismProximity && TourismProximity.recommendExitStation) {
      exitReco = TourismProximity.recommendExitStation(mapLat, mapLng, stationKey || state.currentStationKey || null, 2000);
    }
    if (exitReco && exitReco.best) {
      var _bestLabel = getStationLabel(exitReco.best.stationId);
      var _bestDistM = TourismProximity.formatDistance(exitReco.best.distance);
      ctx.distMain = _bestLabel + ' ' + exitReco.best.exitName + '・' + (_bestDistM || '');
      if (exitReco.best.distance >= 100) {
        ctx.distSub = TourismProximity.formatWalkMinutes(exitReco.best.distance, { at_station: t('detail.at_station'), min_walk: t('detail.min_walk') }) || '';
      }
    }
    if (!ctx.distMain) {
      if (spotStation && stationCoords[spotStation]) {
        var sc = stationCoords[spotStation];
        var sLat = sc[0] || 0, sLng = sc[1] || 0;
        if (sLat && sLng) {
          var dist = TourismProximity.getDistance(sLat, sLng, mapLat, mapLng);
          ctx.distText = TourismProximity.formatWalkMinutes(dist, { at_station: t('detail.at_station'), min_walk: t('detail.min_walk') });
        }
      }
      if (!ctx.distText && spot.dist) ctx.distText = spot.dist;
    }
    return ctx;
  }

  // 快速信息条·距离项（三种类型共用）
  function distValueHtml(dist) {
    if (window.DataLoader && !window.DataLoader.isLoaded()) return '';
    return dist.distMain
      ? '<span class="qi-main">' + escapeHtml(dist.distMain) + '</span>' + (dist.distSub ? '<br><span class="qi-sub">' + escapeHtml(dist.distSub) + '</span>' : '')
      : escapeHtml(dist.distText || t('detail.near_station'));
  }

  // 公共上下文：字段/徽章/章节/坐标（类型 JS 基于它构建专属部分）
  function buildContext(spot, stationKey) {
    var spotName = getSpotName(spot);
    var desc = (spot.desc_i18n && spot.desc_i18n[state.lang]) || spot['desc_' + state.lang] || spot.desc || '';
    var tags = spot.tags || ['all'];
    var gradient = getGradientForTags(tags);
    var coord = spot.coord || [35.71, 139.80];
    var mapLat = coord[0] || 35.71;
    var mapLng = coord[1] || 139.80;
    var dist = computeDistance(spot, stationKey);
    var imageHtml = spot.image
      ? '<div class="article-hero-img"><img src="' + escapeHtml(spot.image) + '" alt="' + escapeHtml(spotName) + '" data-gallery="' + escapeHtml(spot.name || '') + '" data-gallery-idx="0"></div>'
      : '';
    var tagsHtml = '';
    for (var i = 0; i < tags.length; i++) {
      var tagKey = 'tourism.tag_' + tags[i].replace(/-/g, '_');
      tagsHtml += '<span class="tag-badge ' + escapeHtml(tags[i]) + '">' + escapeHtml(t(tagKey)) + '</span>';
    }
    var spotType = getSpotType(spot);
    var typeBadge = '<span class="type-badge type-badge--' + spotType + '">' + escapeHtml(t('detail.type_' + spotType)) + '</span>';
    var stationBadge = '<span data-tourism-station>' + stationBadgeHtml(dist) + '</span>';
    var spotHours = getI18nField(spot, 'hours') || t('detail.i18n_missing');
    spotHours = translateCommonTerms(spotHours);
    var spotFee = getI18nField(spot, 'fee') || t('detail.i18n_missing');
    spotFee = translateCommonTerms(spotFee);
    var spotBestTime = getI18nField(spot, 'bestTime') || t('detail.fallback_best_time');
    spotBestTime = translateCommonTerms(spotBestTime);
    var spotAddress = spot.address || '';
    var addressRow = spotAddress
      ? '<div class="info-row info-row--full"><span class="info-label">' + t('detail.address') + '</span><span class="info-value">' + escapeHtml(spotAddress) + '</span></div>'
      : '';
    var aboutSection = '<div class="article-section">'
      + '<h3 class="section-heading">' + t('detail.about') + '</h3>'
      + '<p class="article-text">' + escapeHtml(desc) + '</p>'
      + '</div>';
    var mapHtml = '<div id="tourismMap" class="map-container"><div class="map-loading">' + t('detail.map_loading') + '</div></div>';
    var mapSection = '<div class="article-section">'
      + '<h3 class="section-heading">' + t('detail.location') + '</h3>'
      + '<div class="map-info">' + mapHtml + '</div>'
      + '</div>';
    return {
      spot: spot, spotName: spotName, desc: desc, tags: tags, gradient: gradient,
      mapLat: mapLat, mapLng: mapLng, dist: dist,
      imageHtml: imageHtml, tagsHtml: tagsHtml, typeBadge: typeBadge, stationBadge: stationBadge,
      spotHours: spotHours, spotFee: spotFee, spotBestTime: spotBestTime, spotAddress: spotAddress, addressRow: addressRow,
      aboutSection: aboutSection, mapSection: mapSection,
      heroClass: getHeroClassForGradient(gradient)
    };
  }

  // 组装框架（hero + 快速信息条 + 正文）并挂载地图
  function renderInto(ctx, quickInfo, bodySections) {
    var container = document.getElementById("articleContainer");
    if (!container) return;
    var html = '<div class="article-hero ' + ctx.heroClass + '">'
      + ctx.imageHtml
      + '<div class="article-hero-overlay"></div>'
      + '<div class="article-hero-content">'
      + '<div class="hero-meta">' + ctx.stationBadge + ctx.typeBadge + ctx.tagsHtml + '</div>'
      + '<h1 class="article-title">' + escapeHtml(ctx.spotName) + '</h1>'
      + '</div></div>'
      + quickInfo
      + '<div class="article-body">' + bodySections + '</div>';
    container.innerHTML = '<div class="article-content article-content--' + getSpotType(ctx.spot) + '">' + html + '</div>';
    observeMap(ctx.mapLat, ctx.mapLng, ctx.spotName);
    var pageTitle = ctx.spotName + ' | ' + (ctx.dist.stationName || '') + ' | PIXEL TETSUDO';
    if (document.title) document.title = pageTitle;
  }

  // 贴士/推荐列表（标题与附加类由类型 JS 传入）
  function buildTipsHtml(spot, titleKey, extraClass) {
    var html = '<div class="article-section">'
      + '<h3 class="section-heading">' + t(titleKey) + '</h3>'
      + '<ul class="tips-list' + (extraClass ? ' ' + extraClass : '') + '">';
    if (spot.tips && spot.tips.length > 0) {
      for (var ti = 0; ti < spot.tips.length; ti++) {
      var tipText = (spot.tips_i18n && spot.tips_i18n[state.lang] && spot.tips_i18n[state.lang][ti])
          || spot.tips[ti] || t('detail.i18n_missing');
        html += '<li>' + escapeHtml(tipText) + '</li>';
      }
    } else {
      html += '<li>' + escapeHtml(t('detail.fallback_best_time')) + '</li>';
    }
    return html + '</ul></div>';
  }

  // 返回按钮回到来源一览页（home 观光模块），不依赖浏览器历史状态。
  function handleBack() {
    location.href = 'home.html';
  }

  function translateUI() {
    var backBtnText = document.getElementById("backBtnText");
    if (backBtnText) backBtnText.textContent = t("detail.back");
  }

  // canonical 旅游详情返回控件；三个详情页都提供同一个挂载点。
  function mountDetailBackButton() {
    var mount = document.querySelector('[data-tourism-detail-back]');
    if (!mount || document.getElementById('detailBackBtn')) return;
    mount.innerHTML = '<button type="button" id="detailBackBtn" class="detail-back-btn">'
      + '<span class="back-arrow"><svg viewBox="0 0 14 14" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" transform="rotate(-90 7 7)" d="M6.646.146a.5.5 0 0 1 .708 0l3.5 3.5a.5.5 0 0 1-.354.854H8V13a1 1 0 1 1-2 0V4.5H3.5a.5.5 0 0 1-.354-.854z"/></svg></span> '
      + '<span id="backBtnText">戻る</span></button>';
  }

  function disposeMap() {
    var previousMap = document.getElementById('tourismMap');
    if (previousMap && previousMap._tdObserver) previousMap._tdObserver.disconnect();
    if (previousMap && previousMap._tdMap) previousMap._tdMap.remove();
    if (previousMap && previousMap._tdLeaflet) previousMap._tdLeaflet.remove();
  }

  function stationBadgeHtml(dist) {
    return dist.stationName ? '<span class="station-badge"><img src="../images/icon-metro-station.svg" alt="" class="station-icon">' + escapeHtml(dist.stationName) + '</span>' : '';
  }

  // 这些稳定挂载点归共享详情所有者负责。铁路事件不得
  // 替换文章、图片、菜单、图集或地图节点。
  function updateRailwayDetails(spot, stationKey) {
    var dist = computeDistance(spot, stationKey);
    var badge = document.querySelector('[data-tourism-station]');
    if (badge && badge.innerHTML !== stationBadgeHtml(dist)) badge.innerHTML = stationBadgeHtml(dist);
    var value = document.querySelector('[data-tourism-distance]');
    if (value && value.innerHTML !== distValueHtml(dist)) value.innerHTML = distValueHtml(dist);
    var row = document.querySelector('[data-tourism-distance-row]');
    if (row) row.hidden = row.getAttribute('data-tourism-distance-row') === 'ready'
      ? !window.DataLoader.isLoaded() : !(dist.distMain || dist.distText);
    document.title = getSpotName(spot) + ' | ' + (dist.stationName || '') + ' | PIXEL TETSUDO';
  }

  // 通用数据加载流程：加载完成后调用类型 JS 提供的 renderArticle
  function start(renderArticle) {
    if (start.started) return;
    start.started = true;
    mountDetailBackButton();
    bindGallery();
    state.lang = window.currentLang || 'ja';
    translateUI();
    var ct = document.getElementById('articleContainer');
    if (ct) ct.innerHTML = '<div class="td-loading-state"><div class="td-loading-dots">&bull;&bull;&bull;</div><div class="td-loading-text">' + t('detail.loading') + '</div></div>';

    // 在检查状态前登记一次：铁路和旅游数据独立完成。
    var backBtn = document.getElementById('detailBackBtn');
    if (backBtn) backBtn.addEventListener('click', handleBack);

    var renderedIdentity = null;
    var resolvedIndexRequest = null;
    function unavailable() {
      disposeMap();
      renderedIdentity = null;
      state.currentSpot = null;
      if (ct) ct.innerHTML = '<p class="td-error-msg">' + escapeHtml(t('detail.unavailable')) + '</p>';
    }
    function boot() {
      var params = new URLSearchParams(window.location.search);
      var spotName = params.get('name');
      var stationKey = params.get('station');
      var indexParam = params.get('index');
      var spotIndex = indexParam === null ? 0 : Number(indexParam);
      state.currentStationKey = stationKey;
      state.lang = window.currentLang || 'ja';
      var loader = window.DataLoader;
      if (!loader || !loader.getTourismStatus) { unavailable(); return; }
      if (loader.getTourismStatus() === 'error') { unavailable(); return; }
      if (loader.getTourismStatus() !== 'ready') return;
      // 索引属于车站距离排序。铁路数据等待期间，
      // 不要在全局池中解析该索引。
      if (!params.has('name') && (!stationKey || !Number.isSafeInteger(spotIndex) || spotIndex < 0 || (indexParam !== null && !/^\d+$/.test(indexParam)))) { unavailable(); return; }
      if (!spotName && stationKey && !loader.isLoaded()) {
        if (loader.getError()) unavailable();
        return;
      }
      if (!spotName && stationKey && (!(window.STATION_COORDS || {})[stationKey] || !window.TourismProximity)) { unavailable(); return; }
      // 命名目标不依赖邻近查询成功。
      state.allSpots = getAllSpots();
      var sameIndexRequest = !params.has('name') && resolvedIndexRequest === params.toString() && state.currentSpot;
      if (!sameIndexRequest) state.scopedSpots = spotName ? state.allSpots : getScopedSpots();
      // 已解析的索引只标识本次导航使用的记录，不是会在车站刷新后
      // 静默选择邻近条目的实时排序。
      var target = params.has('name') ? findSpotByName(spotName) : sameIndexRequest ? findSpotByName(state.currentSpot.name) : state.scopedSpots[spotIndex];
      if (!target) { unavailable(); return; }
      resolvedIndexRequest = params.has('name') ? null : params.toString();
      state.currentSpot = target;
      state.currentSpotIndex = state.scopedSpots.indexOf(target);
      var identity = JSON.stringify([target, state.lang, stationKey]);
      if (identity === renderedIdentity) { updateRailwayDetails(target, stationKey); return; }
      renderedIdentity = identity;
      disposeMap();
      renderArticle(target, stationKey);
    }
    window.addEventListener('pt:tourism-ready', boot);
    window.addEventListener('pt:tourism-error', boot);
    window.addEventListener('pt:railway-ready', boot);
    window.addEventListener('pt:railway-error', boot);
    window.addEventListener('popstate', boot);
    if (typeof window.onLanguageChange === 'function') {
      window.onLanguageChange(function() {
        state.lang = window.currentLang || 'ja';
        translateUI();
        boot();
      });
    }
    if (window.DataLoader && window.DataLoader.load) {
      window.DataLoader.load().then(boot).catch(boot);
      boot(); // Covers already applied snapshots; railway and tourism remain separate.
    } else unavailable();
  }

  function observeMap(lat, lng, name) {
    var mapEl = document.getElementById('tourismMap');
    if (!mapEl) return;
    if (mapEl._tdObserver) mapEl._tdObserver.disconnect();
    if (!window.IntersectionObserver) { initMap(lat, lng, name); return; }
    mapEl._tdObserver = new IntersectionObserver(function(entries) {
      if (!entries.some(function(entry) { return entry.isIntersecting; })) return;
      mapEl._tdObserver.disconnect();
      if (document.getElementById('tourismMap') === mapEl) initMap(lat, lng, name);
    });
    mapEl._tdObserver.observe(mapEl);
  }

  // MapLibre + MapTiler vector（语言跟随）→ Leaflet 兜底
  // 地图库按需动态加载，详情页首屏不再同步解析大体积地图库。
  var _tdMapLibsLoading = false;
  var _tdMapLibsCallbacks = [];
  function _tdLoadScript(src, cb) {
    var build = document.querySelector('meta[name="pt-build"]');
    if (build) src += "?build=" + encodeURIComponent(build.content);
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = cb;
    document.head.appendChild(s);
  }
  function _tdInjectCss(href) {
    var build = document.querySelector('meta[name="pt-build"]');
    if (build) href += "?build=" + encodeURIComponent(build.content);
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }
  function _tdEnsureMapLibs(cb, leafletOnly) {
    if (!leafletOnly && window.maplibregl && window.MAPTILER_STREETS_V2_JSON) { cb(); return; }
    if (typeof L !== 'undefined') { cb(); return; }
    if (_tdMapLibsLoading) { _tdMapLibsCallbacks.push(cb); return; }
    _tdMapLibsLoading = true;
    _tdMapLibsCallbacks.push(cb);
    function settle() {
      _tdMapLibsLoading = false;
      var cbs = _tdMapLibsCallbacks;
      _tdMapLibsCallbacks = [];
      for (var i = 0; i < cbs.length; i++) cbs[i]();
    }
    if (leafletOnly) {
      _tdLoadScript('../js/leaflet/leaflet.min.js', function () {
        _tdInjectCss('../css/leaflet/leaflet.css');
        settle();
      });
      return;
    }
    // 样式是独立数据：与引擎链一起获取，
    // 完成后只释放同一回调队列一次。不要在慢地图路径上
    // 额外发起网络往返，也不要在样式缺失时初始化。
    var engineReady = false, styleReady = false, mapLibsSettled = false;
    function finishMapLibs() {
      if (mapLibsSettled || !engineReady || !styleReady) return;
      mapLibsSettled = true;
      if (window.maplibregl && window.MAPTILER_STREETS_V2_JSON) {
        _tdInjectCss('../js/maplibre/maplibre-gl.css');
        settle();
      } else {
        // 引擎或样式脚本失败时使用已有的 Leaflet 回退。
        _tdLoadScript('../js/leaflet/leaflet.min.js', function () {
          _tdInjectCss('../css/leaflet/leaflet.css');
          settle();
        });
      }
    }
    _tdLoadScript('../js/maplibre/streets-', function () {
      styleReady = true;
      finishMapLibs();
    });
    _tdLoadScript('../js/maplibre/raf-polyfill.js', function () {
      _tdLoadScript('../js/maplibre/maplibre-gl.js', function () {
        engineReady = true;
        finishMapLibs();
      });
    });
  }

  function initMap(lat, lng, name) {
    var mapEl = document.getElementById("tourismMap");
    if (!mapEl || mapEl._tdInitializing || mapEl._tdMap || mapEl._tdLeaflet) return;
    mapEl._tdInitializing = true;
    function tryInit() {
      if (document.getElementById("tourismMap") !== mapEl) return;
      if (window.maplibregl && window.MAPTILER_STREETS_V2_JSON) {
        _initMapMaplibre(mapEl, lat, lng, name);
      } else if (typeof L !== 'undefined') {
        _initMapLeaflet(mapEl, lat, lng, name);
      } else {
        mapEl.innerHTML = '<div class="map-error">' + escapeHtml(t('detail.unavailable')) + '</div>';
      }
    }
    _tdEnsureMapLibs(tryInit);
  }

  function _initMapMaplibre(mapEl, lat, lng, name) {
    if (mapEl._tdMap) { mapEl._tdMap.remove(); mapEl._tdMap = null; }
    var lang = { ja: 'ja', zh: 'zh', ko: 'ko', en: 'en' }[window.currentLang] || 'en';
    var style = null;
    try {
      style = JSON.parse(window.MAPTILER_STREETS_V2_JSON.split('name:__LANG__').join('name:' + lang));
    } catch (e) { /* fallthrough */ }
    if (!style) { _initMapLeaflet(mapEl, lat, lng, name); return; }
    var map;
    try {
      map = new maplibregl.Map({
        container: mapEl,
        style: style,
        center: [lng, lat],
        zoom: 15,
        attributionControl: { compact: true },
        scrollZoom: false,
        boxZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        canvasContextAttributes: { antialias: true }
      });
    } catch (e) { _initMapLeaflet(mapEl, lat, lng, name); return; }
    mapEl._tdMap = map;
    var mlFailed = false;
    map.on('error', function (e) {
      if (document.getElementById('tourismMap') !== mapEl || mapEl._tdMap !== map) return;
      if (mlFailed) return;
      var msg = (e && e.error && e.error.message) || '';
      if (/sprite/i.test(msg)) return;
      mlFailed = true;
      try { map.remove(); } catch (err) {}
      mapEl._tdMap = null;
      _initMapLeaflet(mapEl, lat, lng, name);
    });
    var dot = document.createElement('div');
    dot.className = 'td-map-marker-dot';
    new maplibregl.Marker({ element: dot, anchor: 'center' })
      .setLngLat([lng, lat])
      .setPopup(new maplibregl.Popup({ closeButton: false, offset: 14 }).setHTML('<b>' + escapeHtml(name || '') + '</b>'))
      .addTo(map);
    setTimeout(function () { if (document.getElementById('tourismMap') === mapEl && mapEl._tdMap === map) map.resize(); }, 120);
  }

  // Leaflet 兜底（MapTiler streets raster + Carto light_all）
  function _initMapLeaflet(mapEl, lat, lng, name) {
    if (document.getElementById('tourismMap') !== mapEl) return;
    if (typeof L === 'undefined') {
      _tdEnsureMapLibs(function () {
        if (document.getElementById('tourismMap') !== mapEl) return;
        if (typeof L !== 'undefined') _initMapLeaflet(mapEl, lat, lng, name);
        else mapEl.innerHTML = '<div class="map-error">' + escapeHtml(t('detail.unavailable')) + '</div>';
      }, true);
      return;
    }
    if (mapEl._tdLeaflet) { mapEl._tdLeaflet.remove(); mapEl._tdLeaflet = null; }
    var map = L.map(mapEl, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
    mapEl._tdLeaflet = map;
    var mtLang = { ja: 'ja', zh: 'zh', ko: 'ko', en: 'en' }[window.currentLang] || 'en';
    var mtLayer = L.tileLayer('https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=' + MAPTILER_KEY + '&language=' + mtLang, {
      attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      tileSize: 512,
      zoomOffset: -1,
      crossOrigin: 'anonymous'
    }).addTo(map);
    var mtFallback = false;
    mtLayer.on('tileerror', function () {
      if (mtFallback) return;
      mtFallback = true;
      try {
        map.removeLayer(mtLayer);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);
      } catch (e) { /* noop */ }
    });
    var icon = L.divIcon({ className: 'td-map-marker', html: '<div class="td-map-marker-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    L.marker([lat, lng], { icon: icon }).addTo(map).bindPopup('<b>' + escapeHtml(name || '') + '</b>', { closeButton: false });
    map.setView([lat, lng], 15);
    setTimeout(function () {
      if (document.getElementById('tourismMap') !== mapEl || mapEl._tdLeaflet !== map) return;
      var size = map.getSize();
      // 即使 invalidateSize 未发现
      // 尺寸变化，Leaflet 也会清除精确中心。避免不必要的投影舍入和重绘。
      if (size.x === mapEl.clientWidth && size.y === mapEl.clientHeight) return;
      var center = map.getCenter(), zoom = map.getZoom();
      map.invalidateSize({ pan: false });
      // 真正调整尺寸后保留当前视图，包括用户的平移/缩放。
      map.setView(center, zoom, { animate: false });
    }, 120);
  }

  // ============================================
  // 图集查看器（Gallery Viewer）——三类型详情页共用。
  // 不再是"单纯弹一张图"：多图切换 + 计数 + 缩略图 + 名称/类型徽章 + 图片来源
  // 交互：左右箭头 / 缩略图 / 键盘(←→Esc) / 触摸滑动；点击背景关闭
  // ============================================
  var galleryState = { items: [], index: 0, overlay: null };

  function galleryIsOpen() {
    return !!galleryState.overlay && galleryState.overlay.classList.contains('is-open');
  }

  function galleryClose() {
    if (!galleryState.overlay) return;
    galleryState.overlay.classList.remove('is-open');
    document.body.classList.remove('tgl-lock');
  }

  function galleryRender() {
    var ov = galleryState.overlay;
    if (!ov) return;
    var items = galleryState.items;
    var idx = galleryState.index;
    var it = items[idx];
    if (!it) return;
    var img = ov.querySelector('.tgl-img');
    img.src = it.src;
    img.alt = it.label || '';
    var badgeEl = ov.querySelector('.tgl-badge');
    badgeEl.textContent = it.badge || '';
    badgeEl.className = 'tgl-badge' + (it.badgeClass ? ' ' + it.badgeClass : '');
    ov.querySelector('.tgl-name').textContent = it.name || '';
    ov.querySelector('.tgl-caption').textContent = it.label || '';
    ov.querySelector('.tgl-price').textContent = it.price || '';
    ov.querySelector('.tgl-count').textContent = (idx + 1) + ' / ' + items.length;
    var srcEl = ov.querySelector('.tgl-source');
    srcEl.textContent = it.source ? (t('detail.image_source') + ': ' + it.source) : '';
    var thumbs = ov.querySelector('.tgl-thumbs');
    thumbs.innerHTML = '';
    for (var i = 0; i < items.length; i++) {
      (function (i) {
        var th = document.createElement('button');
        th.type = 'button';
        th.className = 'tgl-thumb' + (i === idx ? ' is-active' : '');
        th.setAttribute('aria-label', String(i + 1));
        var im = document.createElement('img');
        im.src = items[i].src;
        im.alt = items[i].label || '';
        im.loading = 'lazy';
        th.appendChild(im);
        th.addEventListener('click', function (e) { e.stopPropagation(); galleryState.index = i; galleryRender(); });
        thumbs.appendChild(th);
      })(i);
    }
  }

  function galleryStep(d) {
    var n = galleryState.items.length;
    if (n === 0) return;
    galleryState.index = (galleryState.index + d + n) % n;
    galleryRender();
  }

  function galleryEnsureOverlay() {
    if (galleryState.overlay) return galleryState.overlay;
    var ov = document.createElement('div');
    ov.className = 'tgl-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.innerHTML =
      '<div class="tgl-head">'
      + '<div class="tgl-title"><span class="tgl-badge"></span><span class="tgl-name"></span></div>'
      + '<button type="button" class="tgl-close" aria-label="' + escapeHtml(t('detail.close')) + '">&times;</button>'
      + '</div>'
      + '<div class="tgl-stage">'
      + '<button type="button" class="tgl-nav tgl-nav--prev" aria-label="' + escapeHtml(t('detail.prev')) + '">&lsaquo;</button>'
      + '<figure class="tgl-fig"><img class="tgl-img" alt=""><figcaption class="tgl-caption"></figcaption><div class="tgl-price"></div></figure>'
      + '<button type="button" class="tgl-nav tgl-nav--next" aria-label="' + escapeHtml(t('detail.next')) + '">&rsaquo;</button>'
      + '</div>'
      + '<div class="tgl-foot">'
      + '<span class="tgl-count"></span>'
      + '<div class="tgl-thumbs"></div>'
      + '<span class="tgl-source"></span>'
      + '</div>';
    document.body.appendChild(ov);
    galleryState.overlay = ov;
    ov.querySelector('.tgl-close').addEventListener('click', galleryClose);
    ov.querySelector('.tgl-nav--prev').addEventListener('click', function (e) { e.stopPropagation(); galleryStep(-1); });
    ov.querySelector('.tgl-nav--next').addEventListener('click', function (e) { e.stopPropagation(); galleryStep(1); });
    ov.addEventListener('click', function (e) { if (e.target === ov) galleryClose(); });
    document.addEventListener('keydown', function (e) {
      if (!galleryIsOpen()) return;
      if (e.key === 'Escape' || e.key === 'Esc') { galleryClose(); return; }
      if (e.key === 'ArrowLeft') { galleryStep(-1); return; }
      if (e.key === 'ArrowRight') { galleryStep(1); }
    });
    var tx = null;
    ov.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    ov.addEventListener('touchend', function (e) {
      if (tx === null) return;
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 48) galleryStep(dx > 0 ? -1 : 1);
      tx = null;
    }, { passive: true });
    return ov;
  }

  function galleryOpen(items, index) {
    if (!items || items.length === 0) return;
    galleryState.items = items;
    galleryState.index = Math.max(0, Math.min(index || 0, items.length - 1));
    var ov = galleryEnsureOverlay();
    galleryRender();
    ov.classList.add('is-open');
    document.body.classList.add('tgl-lock');
  }

  // 从 spot 组装图集：主图(index 0) + 菜单图（图注/来源/徽章随图切换）
  function galleryItemsForSpot(spot) {
    var items = [];
    var name = getSpotName(spot);
    var type = getSpotType(spot);
    var badge = t('detail.type_' + type);
    var badgeClass = 'type-badge--' + type;
    if (spot.image) {
      var feeText = (spot.fee_i18n && spot.fee_i18n[state.lang]) || spot.fee || '';
      items.push({ src: spot.image, label: name, name: name, badge: badge, badgeClass: badgeClass, source: spot.imageSource || '', price: feeText });
    }
    var menu = spot.menu || [];
    for (var i = 0; i < menu.length; i++) {
      if (menu[i] && menu[i].img) {
        var itemText = (spot.menu_i18n && spot.menu_i18n[i] && spot.menu_i18n[i][state.lang]) || menu[i].item || '';
        items.push({ src: menu[i].img, label: itemText, name: name, badge: badge, badgeClass: badgeClass, source: spot.imageSource || '', price: menu[i].price || '' });
      }
    }
    return items;
  }

  // 图集只包含实际存在的图片，不包含每一条菜单记录。
  function galleryIndexForMenu(spot, menuIndex) {
    var index = spot.image ? 1 : 0;
    for (var i = 0; i < menuIndex; i++) {
      if (spot.menu[i] && spot.menu[i].img) index++;
    }
    return index;
  }

  function galleryOpenForSpot(spot, index) {
    if (!spot) return;
    galleryOpen(galleryItemsForSpot(spot), index || 0);
  }

  // 全局委托：点击任何 [data-gallery] 打开该条目图集（hero / 照片按钮 / 菜单图共用）
  var galleryBound = false;
  function bindGallery() {
    if (galleryBound) return;
    galleryBound = true;
    document.addEventListener('click', function (e) {
      var el = (e.target && e.target.closest) ? e.target.closest('[data-gallery]') : null;
      if (!el) return;
      e.preventDefault();
      var nameAttr = el.getAttribute('data-gallery') || '';
      var spot = nameAttr ? findSpotByName(nameAttr) : null;
      if (!spot) spot = state.currentSpot;
      if (!spot) return;
      var idx = parseInt(el.getAttribute('data-gallery-idx') || '0', 10) || 0;
      galleryOpenForSpot(spot, idx);
    });
  }

  window.TourismDetailCore = {
    state: state,
    t: t,
    escapeHtml: escapeHtml,
    getSpotName: getSpotName,
    getI18nField: getI18nField,
    translateCommonTerms: translateCommonTerms,
    getStationLabel: getStationLabel,
    getGradientForTags: getGradientForTags,
    getHeroClassForGradient: getHeroClassForGradient,
    getSpotType: getSpotType,
    computeDistance: computeDistance,
    distValueHtml: distValueHtml,
    buildContext: buildContext,
    renderInto: renderInto,
    buildTipsHtml: buildTipsHtml,
    start: start,
    initMap: initMap,
    observeMap: observeMap,
    bindGallery: bindGallery,
    galleryIndexForMenu: galleryIndexForMenu,
    galleryOpenForSpot: galleryOpenForSpot
  };
})();
