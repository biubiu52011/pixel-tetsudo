/**
 * 观光模块 - 基于坐标的推荐
 */

(function() {
  'use strict';
  function getStationCoords() { return window.STATION_COORDS || {}; }

  const TAG_LABELS = {
    all: 'tourism.tag_all',
    shrine: 'tourism.tag_shrine',
    history: 'tourism.tag_history',
    shopping: 'tourism.tag_shopping',
    nature: 'tourism.tag_nature',
    food: 'tourism.tag_food',
    landmark: 'tourism.tag_landmark',
    seasonal: 'tourism.tag_seasonal',
    event: 'tourism.tag_event',
    park: 'tourism.tag_park',
    modern: 'tourism.tag_modern',
    play: 'tourism.tag_play',
    // 补齐数据中实际使用的细分标签，避免无图卡片出现空白。
    restaurant: 'tourism.tag_restaurant',
    cafe: 'tourism.tag_cafe',
    sweets: 'tourism.tag_sweets',
    drink: 'tourism.tag_drink',
    bar: 'tourism.tag_bar',
    bakery: 'tourism.tag_bakery',
    shop: 'tourism.tag_shop',
    hotel: 'tourism.tag_hotel',
    local_specialty: 'tourism.tag_local_specialty',
    family: 'tourism.tag_family',
    museum: 'tourism.tag_museum',
    mall: 'tourism.tag_mall'
  };

  // 一级功能大类互斥；选中后按 match 标签过滤。
  // 非类型维度（landmark/family/駅直结 等）保留在 TAG_LABELS 作卡片徽章，不进筛选条
  const TAG_FILTERS = [
    { key: 'culture', label: 'tourism.group_culture',
      match: ['shrine', 'temple', 'museum', 'history', 'modern']
    },
    { key: 'gourmet', label: 'tourism.group_gourmet',
      // 亲子 family 是受众维度，不应把游乐设施误归入美食筛选。
      match: ['food', 'restaurant', 'cafe', 'sweets', 'drink', 'bar', 'bakery', 'local_specialty']
    },
    { key: 'shopping', label: 'tourism.group_shopping',
      // 百货商场归入景点；购物筛选只包含普通店铺。
      match: ['shopping', 'shop', 'hotel']
    },
    { key: 'nature', label: 'tourism.group_nature',
      match: ['nature', 'park']
    },
    { key: 'experience', label: 'tourism.group_experience',
      match: ['play', 'event', 'seasonal']
    }
  ];

  // 无图景点按类别显示文字，避免使用具体食物 emoji 作为图标。
  function labelForTags(tags) {
    if (Array.isArray(tags)) {
      for (var i = 0; i < tags.length; i++) {
        if (tags[i] !== 'all' && TAG_LABELS[tags[i]]) return t(TAG_LABELS[tags[i]]) || tags[i];
      }
    }
    return '';
  }

  const RIVERS = [
    { name: 'Sumida', lat: 35.710, lng: 139.803, width: 120 } // width in meters
  ];
  let state = {
    lang: 'ja',
    userLat: null,
    userLng: null,
    selectedStation: null,
    activeTag: null,   // 一级大类 key（null=すべて）
    autoDetected: false
  };

  let dom = {};
  const DIST_CACHE_TTL_MS = 60000;
  const DIST_CACHE_MIN_MOVE_M = 100;
  let _distCache = {};

  function cacheDom() {
    dom.container = document.getElementById('smModule');
    dom.grid = document.getElementById('smGrid');
    dom.tagFilters = document.getElementById('smTagFilters');
    dom.empty = document.getElementById('smEmpty');
    dom.stationDisplay = document.getElementById('smStationDisplay');
    dom.relocateBtn = document.getElementById('smRelocateBtn');
    dom.header = document.querySelector('.sm-header');
  }

  function t(key) {
    return (typeof window.t === 'function') ? window.t(key) : key;
  }

  function getSPOTS() { return window.TOURISM_SPOTS || []; }
  function getSpotType(spot) {
    if (window.TourismType && window.TourismType.getSpotType) {
      return window.TourismType.getSpotType(spot);
    }
    var tags = (spot && spot.tags) || [];
    if (tags.indexOf('event') >= 0) return 'event';
    // 百货商场优先归景点。
    if (tags.indexOf('mall') >= 0) return 'spot';
    // TourismType 是正常路径的唯一分类来源；回退路径也覆盖吃、喝、购物与玩乐。
    var shopTags = ['food', 'restaurant', 'cafe', 'sweets', 'drink', 'bar', 'bakery', 'local_specialty', 'shopping', 'shop', 'hotel', 'play'];
    if (tags.some(function(tag) { return shopTags.indexOf(tag) >= 0; })) return 'shop';
    return 'spot';
  }
  function isAcrossRiver(stationLat, stationLng, spotLat, spotLng) {
    for (const river of RIVERS) {
      const distToRiver = Math.abs(spotLat - river.lat) * 111000;
      if (distToRiver < river.width && Math.abs(spotLng - river.lng) < 0.005) {
        const stationDistToRiver = Math.abs(stationLat - river.lat) * 111000;
        const onOppositeSide = (spotLat > river.lat && stationLat < river.lat) ||
                               (spotLat < river.lat && stationLat > river.lat);
        if (stationDistToRiver > river.width && onOppositeSide) {
          return true;
        }
      }
    }
    return false;
  }

  function renderHeader() {
    if (!dom.header) return;
    let html = '<h2 data-i18n="tourism.title">' + t('tourism.title') + '</h2>';
    // Phase 43-A：移除 sm-auto-badge。

    dom.header.innerHTML = html;
  }

  function renderTagFilters() {
    if (!dom.tagFilters) return;
    // 一级互斥大类；选中后展开二级子分类行（纯文字，无 emoji）。
    var html = '<div class="sm-tag-row">';
    html += '<button class="sm-tag-btn' + (state.activeTag === null ? ' active' : '') + '" data-tag="all"><span class="tag-label">' + t('tourism.tag_all') + '</span></button>';
    TAG_FILTERS.forEach(function(f) {
      html += '<button class="sm-tag-btn' + (state.activeTag === f.key ? ' active' : '') + '" data-filter="' + f.key + '"><span class="tag-label">' + t(f.label) + '</span></button>';
    });
    html += '</div>';
    dom.tagFilters.innerHTML = html;

    // 事件委托：在容器上只绑定一次。
    if (!dom.tagFilters.dataset.bound) {
      dom.tagFilters.dataset.bound = '1';
      dom.tagFilters.addEventListener('click', function(e) {
        const btn = e.target.closest('.sm-tag-btn');
        if (!btn) return;
        e.preventDefault();
        const filter = btn.getAttribute('data-filter');
        if (filter === null) {
          state.activeTag = null;
        } else {
          state.activeTag = state.activeTag === filter ? null : filter;
        }
        renderGrid();
        renderTagFilters();
      });
    }
  }

  
  // 从 TOURISM_DATA 收集全部景点并计算动态距离（带缓存）。
  function getAllSpotsDynamic() {
    const stationKey = state.selectedStation;
    const uLat = state.userLat;
    const uLng = state.userLng;
    const now = Date.now();

    // 检查缓存有效性。
    if (_distCache.results &&
        _distCache.station === stationKey &&
        _distCache.userLat === uLat &&
        _distCache.userLng === uLng &&
        (now - _distCache.timestamp) < DIST_CACHE_TTL_MS) {
      return _distCache.results;
    }

    // 用户移动距离明显时重新计算。
    if (_distCache.results && stationKey && uLat !== null && uLng !== null) {
      const cachedCoord = getStationCoords()[_distCache.station];
      if (cachedCoord) {
        const moved = TourismProximity.getDistance(uLat, uLng, cachedCoord[0], cachedCoord[1]);
        if (moved < DIST_CACHE_MIN_MOVE_M) {
          return _distCache.results;
        }
      }
    }

    // 委托给统一 TourismProximity API。
    let nearby = [];
    try {
      // 先取完整附近候选池，再按美食/购物/玩乐类别筛选。
      // 否则附近的游乐和购物店可能被全类别最近30条挤出筛选结果。
      nearby = TourismProximity.getNearbySpotsByStation(stationKey, { radius: 3500, limit: Math.max(30, getSPOTS().length) });
    } catch(e) {
      console.warn('[Sightseeing] getNearbySpotsByStation failed:', e);
    }

    const result = nearby.map(function(item) {
      const spot = item.spot;
      const spotLat = spot.coord ? spot.coord[0] : null;
      const spotLng = spot.coord ? spot.coord[1] : null;
      const sCoord = getStationCoords()[stationKey];
      const sLat = sCoord ? sCoord[0] : null;
      const isAcross = sLat ? isAcrossRiver(sLat, sCoord[1], spotLat, spotLng) : false;
      return {
        ...spot,
        stationKey: item.stationId || stationKey,
        distM: item.distance,
        distText: item.distanceText,
        exitDirection: item.exitDirection,
        isAcross: isAcross
      };
    });

    _distCache = {
      station: stationKey,
      userLat: uLat,
      userLng: uLng,
      results: result,
      timestamp: now
    };
    return result;
  }
  // 翻译车站出口方向标签（東口/西口/南口/北口/駅直結）。
  function localizeExitDirection(dir) {
    if (!dir) return '';
    if (dir === '駅直結') return t('tourism.station_direct');
    var dirKeys = { '東口': 'tourism.east', '西口': 'tourism.west', '南口': 'tourism.south', '北口': 'tourism.north' };
    var key = dirKeys[dir];
    if (key) {
      var lang = state.lang || 'ja';
      var suffix = t('tourism.exit_suffix');
      return (lang === 'en') ? t(key) + ' ' + suffix : t(key) + suffix;
    }
    return dir;
  }

function renderGrid() {
    if (!dom.grid) return;
    const stationKey = state.selectedStation;
    if (!stationKey) {
      dom.grid.innerHTML = '';
      if (dom.empty) dom.empty.classList.remove('hidden');
      return;
    }
    // 动态处理：收集全部景点并计算距所选车站的距离。
    const allSpots = getAllSpotsDynamic();
    const stationCoords = getStationCoords();
    const sCoord = stationCoords[stationKey];
    let spotList = allSpots;
    if (sCoord && sCoord[0] && sCoord[1]) {
      spotList = allSpots.filter(function(s) {
        return s.distM !== null && s.distM <= 3000;
      });
    }
    // 应用标签筛选。
    if (state.activeTag) {
      var f = null;
      for (var i = 0; i < TAG_FILTERS.length; i++) if (TAG_FILTERS[i].key === state.activeTag) { f = TAG_FILTERS[i]; break; }
      if (f) {
        spotList = spotList.filter(function(s) {
          var tags = s.tags || [];
          return tags.some(function(t) { return f.match.indexOf(t) >= 0; });
        });
      }
    }
    // 有图优先，再按距离排序；无图卡片使用压缩缩略区。
    spotList.sort(function(a, b) {
      const ai = a.image ? 0 : 1;
      const bi = b.image ? 0 : 1;
      if (ai !== bi) return ai - bi;
      if (a.distM === null) return 1;
      if (b.distM === null) return -1;
      return a.distM - b.distM;
    });
    // 排除不可达的跨河结果后再判空、截断，避免空白结果或30条名额被占用。
    spotList = spotList.filter(function(s) { return !s.isAcross; });
    if (spotList.length === 0) {
      dom.grid.innerHTML = '';
      if (dom.empty) dom.empty.classList.remove('hidden');
      return;
    }
    if (dom.empty) dom.empty.classList.add('hidden');
    // 每个筛选类别都最多显示30条，不在筛选前截断候选池。
    spotList = spotList.slice(0, 30);

    spotList.sort(function(a, b) {
      if (a.distM === null || a.distM === undefined) return 1;
      if (b.distM === null || b.distM === undefined) return -1;
      return a.distM - b.distM;
    });

    if (spotList.length === 0) {
      dom.grid.innerHTML = '';
      if (dom.empty) dom.empty.classList.remove('hidden');
      return;
    }

    var _escSpot = window.escapeHtml || function(x) { return String(x); };
    dom.grid.innerHTML = spotList.map(function(s, idx) {
      const lang = state.lang || 'ja';
      const name = (s.name_i18n && s.name_i18n[lang]) || s.name || '';
      const desc = (s.desc_i18n && s.desc_i18n[lang]) || s.desc || '';
      const tags = s.tags || [];
      const image = s.image || '';

      // 无图卡片使用 56px 类别文字卡，避免 140px 空白块。
      const thumbHtml = image ? 
        '<img class="sm-thumb-img" src="' + encodeURI(image) + '" alt="' + _escSpot(name) + '">' :
        '<span class="sm-thumb-icon">' + labelForTags(tags) + '</span>';

      // 活动条目显示“開催”角标和节日色卡片。
      const isEvent = tags.indexOf('event') >= 0;
      const eventBadgeHtml = isEvent ? '<span class="sm-event-badge">' + _escSpot(t('tourism.event_badge')) + '</span>' : '';
      
      // 按当前语言翻译距离文本（缓存的 distanceText 仅为日文）。
      let distText = '';
      if (s.distM !== null && s.distM !== undefined && !isNaN(s.distM)) {
        distText = TourismProximity.formatWalkMinutes(s.distM, { at_station: t('tourism.at_station'), min_walk: t('tourism.min_walk') }) || '';
      }
      if (!distText) distText = s.distText || '';
      // 翻译出口方向（東口/西口/南口/北口/駅直結）。
      let exitText = localizeExitDirection(s.exitDirection || '');
      // 去重：部分语言的到站距离文本已经包含“駅直結”。
      if (distText && exitText && distText === exitText) exitText = '';
      const distRowHtml = (distText || exitText) ? '<p class="sm-dist">' + (distText ? _escSpot(distText) : '') + (distText && exitText ? ' · ' : '') + (exitText ? _escSpot(exitText) : '') + '</p>' : '';
      
      const tagsHtml = tags.filter(function(tag) { return tag !== 'all'; }).map(function(tag) {
        return '<span>' + t('tourism.tag_' + tag) + '</span>';
      }).join('');

      // 详情页按类型路由到活动、景点或店铺页面。
      const detailType = getSpotType(s);
      const detailUrl = 'tourism-' + detailType + '.html?station=' + encodeURIComponent(stationKey) + '&index=' + idx + '&name=' + encodeURIComponent(name);

      return '<a href="' + detailUrl + '" class="sm-card' + (isEvent ? ' sm-card--event' : '') + '" data-index="' + idx + '">' +
        '<div class="sm-thumb' + (image ? '' : ' sm-thumb-noimg') + '">' + eventBadgeHtml + thumbHtml + '</div>' +
        '<div class="sm-body">' +
          '<h3>' + _escSpot(name) + '</h3>' +
          distRowHtml +
          '<p class="sm-desc">' + _escSpot(desc) + '</p>' +
          '<div class="sm-card-tags">' + tagsHtml + '</div>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  function renderAll() {
    cacheDom();
    if (dom.relocateBtn) dom.relocateBtn.classList.remove('loading');
    renderHeader();
    renderTagFilters();
    renderGrid();
    updateStationDisplay();
  }
  
  function updateStationDisplay() {
    if (!dom.stationDisplay) return;
    if (state.locStatus === 'error') {
      // 定位失败时，如果仍显示车站（默认/手动），必须明确提示。
      if (state.selectedStation) {
        var _defLabel = state.selectedStation;
        if (window.RailwayDB && window.RailwayDB.resolveStationName) {
          _defLabel = window.RailwayDB.resolveStationName(state.selectedStation, state.lang) || state.selectedStation;
        }
        dom.stationDisplay.textContent = (t('tourism.loc_error_default') || '').replace('{station}', _defLabel);
      } else {
        dom.stationDisplay.textContent = t('tourism.loc_error');
      }
      dom.stationDisplay.classList.remove('sm-station-detected');
      return;
    }
    if (state.selectedStation) {
      var _snLabel = state.selectedStation;
      if (window.RailwayDB && window.RailwayDB.resolveStationName) {
        _snLabel = window.RailwayDB.resolveStationName(state.selectedStation, state.lang) || state.selectedStation;
      }
      const stationLabel = _snLabel;
      dom.stationDisplay.textContent = stationLabel;
      dom.stationDisplay.classList.add('sm-station-detected');
    } else {
      dom.stationDisplay.textContent = t('tourism.locating');
      dom.stationDisplay.classList.remove('sm-station-detected');
    }
  }

  function bindEvents() {
    // 观光区只展示定位附近景点，定位失败不提供备选站。
    if (dom.relocateBtn) {
      dom.relocateBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        initLocation();
      });
    }
  }

  function initLocation() {
    state.locStatus = 'locating';
    if (dom.relocateBtn) dom.relocateBtn.classList.add('loading');
    renderHeader();
    var guard = setTimeout(function() {
      if (state.locStatus === 'locating') {
        state.locStatus = 'error';
        // 定位失败保持错误状态，用户可点击刷新重试。
        state.autoDetected = false;
        renderAll();
      }
    }, 4000);
    function locFallback() {
      state.locStatus = 'error';
      // 定位失败不提供备选站。
      state.autoDetected = false;
      renderAll();
    }
    // file 协议也先尝试真实定位；无权限时由 error 回调或超时保护降级。
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      clearTimeout(guard);
      locFallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(position) {
        clearTimeout(guard);
        state.userLat = position.coords.latitude;
        state.userLng = position.coords.longitude;
        findNearestStation();
      },
      function(err) {
        clearTimeout(guard);
        locFallback();
      },
      // 位置请求不接受旧缓存，避免移动后仍停留在上一站。
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function findNearestStation() {
    var nearest = TourismProximity.getNearestStation(state.userLat, state.userLng);
    if (nearest) {
      state.selectedStation = nearest.stationId;
      state.autoDetected = true;
      state.locStatus = 'found';
      renderAll();
    } else {
      state.locStatus = 'error';
      renderAll();
    }
  }

  function init(config) {
    config = config || {};
    cacheDom();
    if (dom.relocateBtn) {
      dom.relocateBtn.title = t('tourism.relocate');
      dom.relocateBtn.setAttribute('aria-label', t('tourism.relocate'));
    }
    state.lang = config.lang || window.currentLang || 'ja';
    if (config.station) {
      state.selectedStation = config.station;
      state.autoDetected = false;
    }
    bindEvents();
    updateStationDisplay();
    renderAll();
    // 等待站点数据就绪后再定位；最多等待 6 秒，超时仍进入定位流程。
    var _attempt = 0;
    function _dataReady() {
      return (window.DataLoader && window.DataLoader.isLoaded && window.DataLoader.isLoaded())
        || (window.STATION_COORDS && Object.keys(window.STATION_COORDS).length > 0);
    }
    function _startWhenReady() {
      if (_dataReady() || ++_attempt >= 24) {
        setTimeout(initLocation, 50);
        return;
      }
      setTimeout(_startWhenReady, 250);
    }
    _startWhenReady();
  }

  function setLang(lang) {
    state.lang = lang;
    renderAll();
  }

  // 站点由定位结果确定，不提供手动站点选择。
  window.SightseeingModule = { init: init, setLang: setLang };

  if (typeof window.onLanguageChange === 'function') {
    window.onLanguageChange(function() {
      state.lang = window.currentLang || 'ja';
      renderAll();
    });
  }

  // 初始加载后旅游数据到达时重新渲染（延后加载 1.8MB 数据）。
  window.addEventListener('pt:tourism-ready', function() {
    // 清空可能在旅游数据加载前缓存的空列表，避免新商家延迟60秒才显示。
    _distCache = {};
    if (state.selectedStation) renderAll();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();








