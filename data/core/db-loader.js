/**
 * Pixel Tetsudo - 数据库加载器
 * 从 railway_data.json 加载所有数据到全局变量
 * 提供：IndexedDB 实时数据缓存（列车位置 + 延误信息）
 */
(function() {
  "use strict";

  // ========== IndexedDB 实时缓存 ==========
  var RT_DB_NAME = "PixelTetsudoRT";
  var RT_STORE_NAME = "realtime";
  var _rtDb = null;
  var _rtDbPromise = null;
  var _rtDbDisabled = false;
  var _rtMemory = {};
  var _loadPromise = null;

  function openRTDb() {
    if (_rtDbDisabled || typeof indexedDB === "undefined") return Promise.resolve(null);
    if (_rtDbPromise) return _rtDbPromise;
    _rtDbPromise = new Promise(function(resolve, reject) {
      if (_rtDb) { resolve(_rtDb); return; }
      var req = indexedDB.open(RT_DB_NAME, 1);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(RT_STORE_NAME)) {
          db.createObjectStore(RT_STORE_NAME, { keyPath: "key" });
        }
      };
      req.onsuccess = function(e) {
        _rtDb = e.target.result;
        _rtDb.onversionchange = function() {
          try { _rtDb.close(); } catch(_e) {}
          _rtDb = null;
          _rtDbPromise = null;
        };
        resolve(_rtDb);
      };
      req.onerror = function() { reject(req.error || new Error("IndexedDB open failed")); };
      req.onblocked = function() { reject(new Error("IndexedDB blocked")); };
    });
    _rtDbPromise = _rtDbPromise.catch(function(err) {
      console.warn("[RTCache] IndexedDB unavailable, using memory cache:", err.message);
      _rtDb = null;
      _rtDbPromise = null;
      _rtDbDisabled = true;
      return null;
    });
    return _rtDbPromise;
  }

  function rtPut(key, value) {
    return openRTDb().then(function(db) {
      if (!db) {
        _rtMemory[key] = { value: value, ts: Date.now() };
        return;
      }
      return new Promise(function(resolve, reject) {
        try {
          var tx = db.transaction(RT_STORE_NAME, "readwrite");
          tx.objectStore(RT_STORE_NAME).put({ key: key, value: value, ts: Date.now() });
          tx.oncomplete = function() { resolve(); };
          tx.onerror = function() { reject(tx.error); };
          tx.onabort = function() { reject(tx.error); };
        } catch(e) { reject(e); }
      });
    }).catch(function(err) {
      console.warn("[RTCache] Write fell back to memory:", err.message);
      _rtMemory[key] = { value: value, ts: Date.now() };
    });
  }

  function rtGet(key) {
    return openRTDb().then(function(db) {
      if (!db) return _rtMemory[key] ? _rtMemory[key].value : null;
      return new Promise(function(resolve, reject) {
        try {
          var tx = db.transaction(RT_STORE_NAME, "readonly");
          var req = tx.objectStore(RT_STORE_NAME).get(key);
          req.onsuccess = function() { resolve(req.result ? req.result.value : null); };
          req.onerror = function() { reject(tx.error); };
          tx.onabort = function() { reject(tx.error); };
        } catch(e) { reject(e); }
      });
    }).catch(function(err) {
      console.warn("[RTCache] Read fell back to memory:", err.message);
      return _rtMemory[key] ? _rtMemory[key].value : null;
    });
  }

  window.RTCache = {
    put: rtPut,
    get: rtGet,
    savePositions: function(positions) { return rtPut("positions", positions); },
    saveDelayInfo: function(delayInfo) { return rtPut("delayInfo", delayInfo); },
    loadPositions: function() { return rtGet("positions"); },
    loadDelayInfo: function() { return rtGet("delayInfo"); }
  };

  // http(s) 分支加载由
  // data/core/gen-file-data.js 生成的紧凑单行 JSON 副本，而不是可读源文件，
  // 以减少 GitHub Pages 的下载和解析量。可读源文件仍是唯一事实来源。
  var DATA_FILE = "../data/core/railway_data.compact.json";
  var STATION_I18N_FILE = "../data/core/station_i18n.compact.json";
  var TOURISM_DATA_FILE = "../data/core/tourism_data.compact.json";
  var _stationI18n = {};
  var _i18nNormMap = null; // hyphen-insensitive lookup cache, built once in applyData
  var loaded = false;
  var tourismStatus = "loading";
  var error = null;

  // 从包含 .stations、.lines 结构的对象应用车站数据。
  // 铁路源数据不再携带旅游锚点字段。
function applyData(data, i18n) {
    _stationI18n = i18n || {};
    // 供 StationResolver 使用（它会在 _buildIndex 中读取 window.RAILWAY_I18N）。
    // 这样 home.html 可以移除重复的 506KB station-i18n.file.js <script> 标签。
    window.RAILWAY_I18N = _stationI18n;
    // 一次性构建不区分连字符的查找表，替代
    // 每次 resolveStationName 未命中时执行的 O(n) 线性扫描（StationResolver._buildIndex 约调用 3500 次）。
    _i18nNormMap = {};
    for (var _ik in _stationI18n) {
      var _norm = _ik.replace(/-/g, '').toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(_i18nNormMap, _norm)) {
        _i18nNormMap[_norm] = _ik;
      } else if (_i18nNormMap[_norm] !== _ik) {
        // 规范化后的歧义 ID 不得静默互相覆盖。
        // 精确车站 ID 仍是权威；null 会禁用模糊回退。
        _i18nNormMap[_norm] = null;
      }
    }
    window.STATION_COORDS = {};
    Object.keys(data.stations).forEach(function(id) {
      var s = data.stations[id];
      if (s.lat && s.lng) {
        window.STATION_COORDS[id] = [s.lat, s.lng];
      }
    });

    window.STATION_NAME_MAP = data.name_map || {};
    window.EN_STATION_NAME_MAP = {};
    Object.keys(window.STATION_NAME_MAP).forEach(function(jp) {
      var v = window.STATION_NAME_MAP[jp];
      if (v && v.en) window.EN_STATION_NAME_MAP[v.en] = jp;
    });

    window.UNIFIED_LINES = data.lines || {};
    
    // 旅游数据：全局景点池（不绑定车站）。
    // 锚点字段（station_coords / station_exits）以及旧的按车站分组
    // 旅游字段已从 railway_data.json 移除；景点是唯一来源，
    // 车站通过 STATION_COORDS 和邻近距离自动发现。
    window.TOURISM_SPOTS = window.TOURISM_SPOTS || [];
    // 保留空的 TOURISM_DATA 以兼容旧代码（旧代码可能会检查它）。
    window.TOURISM_DATA = {};
    // 旅游锚点车站：没有显式锚点，车站选择器会自动发现
    // 附近存在景点的车站（见 Sightseeing.getMajorStations 回退）。
    window.TOURISM_STATIONS = [];

    // 构建 canonical StationLine 关系。
    window.STATION_LINES = {};
    if (data.stationLines) {
      Object.assign(window.STATION_LINES, data.stationLines);
    } else {
      Object.keys(window.UNIFIED_LINES).forEach(function(lid) {
        var line = window.UNIFIED_LINES[lid];
        if (line.stations) {
          line.stations.forEach(function(sid, order) {
            if (!window.STATION_LINES[sid]) window.STATION_LINES[sid] = [];
            window.STATION_LINES[sid].push({line_id: lid, station_order: order});
          });
        }
      });
    }

    // 构建线路 → 车站顺序映射。
    window.LINE_STATION_ORDER = {};
    if (data.lineStationOrder) {
      Object.assign(window.LINE_STATION_ORDER, data.lineStationOrder);
    } else {
      Object.keys(window.UNIFIED_LINES).forEach(function(lid) {
        var line = window.UNIFIED_LINES[lid];
        if (line.stations) {
          window.LINE_STATION_ORDER[lid] = {};
          line.stations.forEach(function(sid, order) {
            window.LINE_STATION_ORDER[lid][sid] = order;
          });
        }
      });
    }

    // ========== 统一铁路数据访问层 ==========
          // 名称映射缓存。
      var _nameMapCache = {};

      window.RailwayDB = {
      // 车站查询。
      getStation: function(id) { return data.stations[id] || null; },
      getStations: function() { return data.stations; },
      getStationLocation: function(id) {
        var s = data.stations[id];
        return s && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng))
          ? [Number(s.lat), Number(s.lng)] : null;
      },
      getTransferDistanceKm: function(fromId, toId) {
        var a = this.getStationLocation(fromId), b = this.getStationLocation(toId);
        if (!a || !b) return null;
        var rad = Math.PI / 180;
        var dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
        var square = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(a[0] * rad) * Math.cos(b[0] * rad) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 12742 * Math.asin(Math.min(1, Math.sqrt(Math.max(0, square))));
      },
      isTransferCoordinateCompatible: function(fromId, toId, maxKm) {
        var distance = this.getTransferDistanceKm(fromId, toId);
        return distance != null && distance <= (Number(maxKm) || 3);
      },
      getStationLines: function(id) { return window.STATION_LINES[id] || []; },
      getStationName: function(id, lang) {
        if (!id) return null;
        var nm = window.STATION_NAME_MAP;
        if (lang === 'en') {
          var enMap = window.EN_STATION_NAME_MAP || {};
          if (nm[id] && nm[id].en) return nm[id].en;
          for (var k in nm) { if (nm[k].en === id) return nm[k].ja || k; }
          return id;
        }
        return nm[id] && nm[id].ja ? nm[id].ja : id;
      },

      // 线路查询。
      getLine: function(id) { return data.lines[id] || null; },
      getAllLines: function() { return data.lines; },
      getLineStations: function(id) {
        var line = data.lines[id];
        return line ? line.stations || [] : [];
      },
      getLineStationOrder: function(lineId, stationId) {
        var orderMap = window.LINE_STATION_ORDER[lineId];
        return orderMap ? orderMap[stationId] : null;
      },
      getLineColors: function() {
        var colors = {};
        Object.keys(data.lines).forEach(function(k){ colors[k] = data.lines[k].color; });
        return colors;
      },
      // 显示名称解析。
      resolveLineName: function(id, lang) {
        if (!id) return '';
        lang = (lang || window.currentLang || 'ja').toLowerCase();

        // 显式线路翻译是显示名称的权威来源。不得从
        // 运营商身份推导线路标签（例如 Rinkai → TWR）。
        var dict = window.translations && (window.translations[lang] || window.translations.ja);
        var translated = dict && dict['line.' + id];
        if (translated && translated !== ('line.' + id)) return translated;

        var line = data.lines ? data.lines[id] : null;
        if (!line) return id;
        var nameKey = 'name' + lang.charAt(0).toUpperCase() + lang.slice(1);
        return line[nameKey] || line.nameJa || line.nameEn || line.name || id;
      },
      // 邻近查询。
      getNearbyStations: function(lat, lng, radiusKm, limit) {
        limit = limit || 10;
        radiusKm = radiusKm || 2;
        var results = [];
        Object.keys(data.stations).forEach(function(id) {
          var s = data.stations[id];
          if (!s.lat || !s.lng) return;
          var d = Math.sqrt(Math.pow(s.lat-lat,2)+Math.pow(s.lng-lng,2))*111;
          if (d <= radiusKm) results.push({id: id, dist: d, name: s});
        });
        results.sort(function(a,b){return a.dist-b.dist;});
        return results.slice(0, limit).map(function(r){return r.id;});
      },

      // 名称映射。
      getNameMap: function() { return data.name_map; },
      resolveStationName: function(id, lang) {
        if (!id) return null;
        lang = lang || window.currentLang || 'ja';
        // 0. 优先检查专用 station_i18n 数据（zh/ko/ja）。
        if (_stationI18n && _stationI18n[id]) {
          var _i18n = _stationI18n[id];
          if (lang === 'zh' && _i18n.zh) return _i18n.zh;
          if (lang === 'ko' && _i18n.ko) return _i18n.ko;
          if (lang === 'ja' && _i18n.ja) return _i18n.ja;
          if (lang === 'en' && _i18n.en) return _i18n.en;
        }
        // 宽松匹配：直接查找没命中时，去掉连字符再查。
        if (_i18nNormMap) {
          var _normId = String(id).replace(/-/g, '').toLowerCase();
          var _normKey = _i18nNormMap[_normId];
          if (_normKey) {
            var _i18n2 = _stationI18n[_normKey];
            if (lang === 'zh' && _i18n2.zh) return _i18n2.zh;
            if (lang === 'ko' && _i18n2.ko) return _i18n2.ko;
            if (lang === 'ja' && _i18n2.ja) return _i18n2.ja;
            if (lang === 'en' && _i18n2.en) return _i18n2.en;
          }
        }
        var nm = data.name_map;
        var _hasJp = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(id);

        // 0. 如果 id 已经是日文，ja 模式直接返回；
        //    其他语言尝试通过 name_map 获取英文翻译。
        if (_hasJp) {
          if (lang === 'ja') return id;
          var direct = nm[id];
          if (direct) {
            if (typeof direct === 'string') return direct;
            if (typeof direct === 'object' && direct[lang]) return direct[lang];
            if (typeof direct === 'object' && direct.en) return direct.en;
          }
          return id;
        }

        // 1. 检查车站实体的 name 字段（保持向前兼容）。
        var s = data.stations[id];
        if (s) {
          var n = s['name' + lang.charAt(0).toUpperCase() + lang.slice(1)];
          if (n) return n;
        }

        // 2. 反向查找：将罗马字 ID 映射到 name_map 中的日文键。
        //    两者都存在时优先使用不带末尾“駅”的键（显示名省略该后缀）。
        var valToKey = _nameMapCache.valToKey;
        if (!valToKey) {
          valToKey = {};
          Object.keys(nm).forEach(function(jpKey) {
            var val = nm[jpKey];
            if (typeof val !== 'string') return;
            var lk = val.toLowerCase().replace(/-/g, ''); // 归一化 ODPT 与站表中的连字符差异。
            // 两者都存在时优先使用不带末尾“駅”的键。
            if (!valToKey[lk] || (jpKey.slice(-1) !== '\u99c5' && valToKey[lk].slice(-1) === '\u99c5')) {
              valToKey[lk] = jpKey;
            }
          });
          _nameMapCache.valToKey = valToKey;
        }
        var matchedKey = valToKey[String(id).toLowerCase().replace(/-/g, '')]; // 查询侧同样去除连字符。
        if (matchedKey) {
          // 在规范化键之前保存原始英文值。
          var _enVal = nm[matchedKey];
          // 如果裸站名键也存在，则去掉末尾的“駅”
          // （例如“新宿駅”→“新宿”，因为显示名省略后缀）。
          if (matchedKey.slice(-1) === '\u99c5' && nm[matchedKey.slice(0, -1)]) {
            matchedKey = matchedKey.slice(0, -1);
          }
          if (lang === 'ja') return matchedKey;
          if (lang === 'en') {
            return typeof _enVal === 'string' ? _enVal : matchedKey;
          }
          // zh / ko：canonical DB 没有翻译数据时回退到
          // 日文汉字（中文用户可读），而不是英文。
          return matchedKey;
        }

        // 3. 回退：返回 id。
        return id;
      },

      // 线路查询辅助函数（兼容曾使用 window.UNIFIED_LINES 的模块）。
      getLines: function() { return window.UNIFIED_LINES || {}; },
      getAllLineIds: function() { return window.UNIFIED_LINES ? Object.keys(window.UNIFIED_LINES) : []; },
      hasLine: function(id) { return !!(window.UNIFIED_LINES && window.UNIFIED_LINES[id]); },
      getLineDurations: function(id) {
        var l = window.UNIFIED_LINES ? window.UNIFIED_LINES[id] : null;
        return l ? (l.durations || []) : [];
      },
      getLineTransferStations: function(id) {
        var l = window.UNIFIED_LINES ? window.UNIFIED_LINES[id] : null;
        return l ? (l.transferStations || []) : [];
      },
      getLineOrder: function(id) { return window.LINE_STATION_ORDER ? window.LINE_STATION_ORDER[id] : null; },

      // 模式信息。
      getSchema: function() {
        return {
          lineCount: Object.keys(data.lines).length,
          stationCount: Object.keys(data.stations).length,
          stationLineCount: Object.keys(window.STATION_LINES).length,
          nameMapCount: Object.keys(data.name_map).length
        };
      }
    };
  }
  // Realtime/train pages do not consume tourism data. Keep this capability
  // decision in the loader that owns the cache and fetch lifecycle.
  var _pagePath = window.location && window.location.pathname || '';
  if (!window.PT_SKIP_TOURISM && /\/(?:realtime|trains)\.html$/i.test(_pagePath)) {
    window.PT_SKIP_TOURISM = true;
  }

  // ========== 静态数据库缓存（stale-while-revalidate） ==========
  // localStorage key 跟随 script 的 ?v= 版本参数自动失效（同版本刷新秒开，发版后自动重新下载）
  var DB_CACHE_VERSION = (function() {
    try {
      var src = (document.currentScript && document.currentScript.src) || "";
      var m = src.match(/[?&](?:build|v)=([^&]+)/);
      if (m && m[1]) return m[1];
    } catch(e) {}
    return "0";
  })();
  var DB_CACHE_KEY = "pt_db_v" + DB_CACHE_VERSION;
  // tourism 使用独立缓存键（pt_tourism_v*）——realtime 等页面
  // 通过 PT_SKIP_TOURISM 跳过 2.24MB tourism_data.json 的下载/解析/缓存读写。
  var TOURISM_CACHE_KEY = "pt_tourism_v" + DB_CACHE_VERSION;
  var SKIP_TOURISM = !!(window.PT_SKIP_TOURISM);

  function cacheRead() {
    try {
      var raw = localStorage.getItem(DB_CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.railway || !obj.railway.lines || !obj.railway.stations || !obj.i18n) return null;
      return obj;
    } catch(e) { return null; }
  }

  function cacheReadTourism() {
    if (SKIP_TOURISM) return null;
    try {
      var raw = localStorage.getItem(TOURISM_CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return (obj && obj.tourism) ? obj.tourism : null;
    } catch(e) { return null; }
  }

  function cacheWrite(railway, i18n, onCommitted) {
    // 将 JSON.stringify + localStorage.setItem 延后到关键路径之外。
    // Prune old caches only after the replacement is durably written; otherwise
    // a release can delete its own last-known-good recovery source.
    setTimeout(function() {
      var committed = false;
      try {
        localStorage.setItem(DB_CACHE_KEY, JSON.stringify({ railway: railway, i18n: i18n, ts: Date.now() }));
        committed = true;
      } catch(e) { /* quota / private mode: keep older caches */ }
      if (committed && typeof onCommitted === "function") onCommitted();
    }, 0);
  }

  function cacheWriteTourism(tourism) {
    if (SKIP_TOURISM) return;
    setTimeout(function() {
      try {
        localStorage.setItem(TOURISM_CACHE_KEY, JSON.stringify({ tourism: tourism, ts: Date.now() }));
      } catch(e) {}
    }, 0);
  }

  // 清理旧版本缓存（只留当前版本）
  function cleanOldCaches() {
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && (k.indexOf("pt_db_v") === 0 || k.indexOf("pt_tourism_v") === 0) && k !== DB_CACHE_KEY && k !== TOURISM_CACHE_KEY) localStorage.removeItem(k);
      }
    } catch(e) {}
  }

  // 网络失败时的最后兜底：取任意旧版本缓存（最新优先）
  function readAnyCache() {
    try {
      var best = null, bestTs = -1;
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf("pt_db_v") !== 0) continue;
        try {
          var obj = JSON.parse(localStorage.getItem(k));
          if (!obj || !obj.railway || !obj.railway.lines) continue;
          if (obj.ts > bestTs) { bestTs = obj.ts; best = obj; }
        } catch(e) {}
      }
      if (best) best.tourism = cacheReadTourism();
      return best;
    } catch(e) { return null; }
  }

  // 带超时的 fetch（默认 15 秒）。
  function fetchWithTimeout(url, ms) {
    ms = ms || 15000;
    if (typeof AbortController === "undefined") return fetch(url);
    var ctrl = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); }, ms);
    return fetch(url, { cache: "no-cache", signal: ctrl.signal }).then(
      function(r) { clearTimeout(timer); return r; },
      function(err) { clearTimeout(timer); throw err; }
    );
  }

  // fetch + 重试（共 3 次，退避 400ms/800ms）。
  function fetchJSON(url, tries) {
    tries = (tries === undefined) ? 3 : tries;
    return fetchWithTimeout(url).then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).catch(function(err) {
      if (tries <= 1) throw err;
      return new Promise(function(resolve) { setTimeout(resolve, 400 * (3 - tries + 1)); })
        .then(function() { return fetchJSON(url, tries - 1); });
    });
  }

  // 出入口只接受有明确来源标记的坐标。没有 source 的旧估算、站中心
  // 兜底和运行时拼接记录一律丢弃，避免把推定位置展示成真实出入口。
  var VERIFIED_EXIT_SOURCES = {
    osm_overpass: true,
    official_station_map: true,
    official_station_page: true
  };
  var EXPLICIT_EXIT_NAME = /(出口|出入口|入口|口$|改札口)$/i;

  function normalizeStationExits(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function(stationId) {
      var entries = Array.isArray(raw[stationId]) ? raw[stationId] : [];
      var verified = entries.filter(function(entry) {
        return entry && typeof entry.name === 'string' && entry.name.trim() &&
          entry.kind === 'station_exit' && EXPLICIT_EXIT_NAME.test(entry.name.trim()) &&
          Number.isFinite(Number(entry.lat)) && Number.isFinite(Number(entry.lng)) &&
          VERIFIED_EXIT_SOURCES[entry.source];
      }).map(function(entry) {
        return {
          name: entry.name.trim(),
          lat: Number(entry.lat),
          lng: Number(entry.lng),
          source: entry.source,
          kind: entry.kind
        };
      });
      if (verified.length) out[stationId] = verified;
    });
    return out;
  }

  // 应用 tourism_data.json（唯一真源：全局 spot 池，无锚点字段）
  // station_coords/station_exits 旧锚点已移除；景点坐标直接来自
  // 数据本身，站坐标统一走 railway STATION_COORDS，站选择器自动发现附近有景点的站。
  function applyTourismData(override) {
    override = override || {};
    if (override.spots && Array.isArray(override.spots)) window.TOURISM_SPOTS = override.spots;
    var buckets = (window.TourismType && window.TourismType.partitionSpots)
      ? window.TourismType.partitionSpots(window.TOURISM_SPOTS || [])
      : { event: [], shop: [], spot: (window.TOURISM_SPOTS || []) };
    window.TOURISM_EVENTS = buckets.event;
    window.TOURISM_SHOPS = buckets.shop;
    window.TOURISM_SIGHTS = buckets.spot;
    // 出口坐标使用 { stationId: [{name,lat,lng,source}] }；只保留有来源记录。
    window.STATION_EXITS = normalizeStationExits(override.station_exits);
    window.TOURISM_DATA = {};
    window.TOURISM_STATIONS = [];
    // 通知旅游模块景点已可用（延后加载路径）。
    if (Array.isArray(override.spots)) {
      tourismStatus = 'ready';
      window.dispatchEvent(new CustomEvent('pt:tourism-ready'));
    }
  }

  function tourismFailed(e) {
    if (tourismStatus !== 'ready') tourismStatus = 'error';
    window.dispatchEvent(new CustomEvent('pt:tourism-error', { detail: { error: e } }));
  }

  // 远程加载：railway+i18n 先到先应用（搜索立即可用），tourism 后台异步加载
  function fetchRemote() {
    var railwayData = null;
    var i18nData = null;

    var railwayPromise = Promise.all([
      fetchJSON(DATA_FILE),
      fetchJSON(STATION_I18N_FILE).then(function(r) { return r; }, function() { return {}; })
    ]).then(function(results) {
      railwayData = results[0];
      i18nData = results[1];
      applyData(railwayData, i18nData);
      // 铁路刷新不得重置由旅游模块独立拥有的快照。
      // Commit the new cache before pruning old versions. Keeping the previous
      // cache until the replacement write succeeds preserves a recovery source
      // across mobile/network failures and interrupted page lifecycles.
      cacheWrite(railwayData, i18nData, cleanOldCaches);
      loaded = true;
      try { window.dispatchEvent(new CustomEvent("pt:railway-ready", { detail: { source: "remote" } })); } catch(e) {}
      console.log(
        Object.keys(railwayData.stations).length + " stations, " +
        Object.keys(railwayData.lines).length + " lines, railway ready");
      return results;
    });

    // 旅游数据独立加载，不阻塞铁路数据就绪。
    if (!SKIP_TOURISM) {
      fetchJSON(TOURISM_DATA_FILE).then(function(tourismData) {
        if (!tourismData || !Array.isArray(tourismData.spots)) throw new Error("Invalid tourism snapshot");
        applyTourismData(tourismData);
        cacheWriteTourism(tourismData);
        console.log((tourismData && tourismData.spots ? tourismData.spots.length : 0) + " tourism spots loaded");
      }).catch(function(e) {
        tourismFailed(e);
        console.warn("[DbLoader] Tourism load failed:", e.message);
      });
    }

    return railwayPromise;
  }

  // file:// 协议：通过 <script> 标签加载生成的数据包。
  var FILE_BUNDLES = [
    "../data/core/railway-data.file.js",
    "../data/core/station-i18n.file.js",
    "../data/core/tourism-data.file.js"
  ];
  function loadScript(url) {
    return new Promise(function(res, rej) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = function() { res(); };
      s.onerror = function() { rej(new Error('file bundle load failed: ' + url)); };
      document.head.appendChild(s);
    });
  }
  function loadFileBundles() {
    var bundles = SKIP_TOURISM ? FILE_BUNDLES.slice(0, 2) : FILE_BUNDLES;
    return bundles.reduce(function(p, u) {
      return p.then(function() { return loadScript(u); });
    }, Promise.resolve());
  }
  // 拆分 file:// 加载：先加载 railway+i18n（搜索可用），再加载 tourism。
  function loadFileBundlesRailwayOnly() {
    return FILE_BUNDLES.slice(0, 2).reduce(function(p, u) {
      return p.then(function() { return loadScript(u); });
    }, Promise.resolve());
  }
  function loadFileBundleTourism() {
    return loadScript(FILE_BUNDLES[2]);
  }

function load() {
    if (loaded) return Promise.resolve();
    if (_loadPromise) return _loadPromise;

    // 策略 A：file:// 协议下跳过 fetch（CORS 会阻止），直接使用脚本数据。
    var isFileProtocol = (window.location.protocol === 'file:');
    if (isFileProtocol) {
      // file:// 数据包：在 fetch 被 CORS 阻止时由 <script src> 加载。
      // 先加载 railway+i18n 让搜索尽快可用；tourism（1.8MB）随后加载。
      _loadPromise = loadFileBundlesRailwayOnly().then(function() {
        if (window.RAILWAY_DATA && window.RAILWAY_DATA.stations) {
          applyData(window.RAILWAY_DATA, window.RAILWAY_I18N || {});
          loaded = true;
          try { window.dispatchEvent(new CustomEvent("pt:railway-ready", { detail: { source: "file" } })); } catch(e) {}
          // tourism 数据包在后台非阻塞加载。
          if (!SKIP_TOURISM) {
            loadFileBundleTourism().then(function() {
              if (!window.RAILWAY_TOURISM || !Array.isArray(window.RAILWAY_TOURISM.spots)) throw new Error("Invalid tourism bundle");
              applyTourismData(window.RAILWAY_TOURISM);
            }).catch(function(e) {
              tourismFailed(e);
              console.warn("[DbLoader] Tourism bundle load failed:", e.message);
            });
          }
          return;
        }
        error = new Error("No data source available under file:// protocol");
        console.error("[DbLoader] Failed to load data under file:// protocol");
        throw error;
      }).catch(function(err) {
        _loadPromise = null;
        throw err;
      });
      return _loadPromise;
    }

    // 策略 B：stale-while-revalidate。
    // 1) 缓存命中 → railway 立即应用（首屏秒开），tourism 缓存延迟解析，后台刷新数据
    // Tourism cache is independent of railway cache presence. Never let a late
    // cache read overwrite an already accepted remote tourism snapshot.
    if (!SKIP_TOURISM) setTimeout(function() {
      var ct = cacheReadTourism();
      if (ct && tourismStatus !== 'ready') applyTourismData(ct);
    }, 0);
    var cached = cacheRead();
    if (cached) {
      try {
        applyData(cached.railway, cached.i18n);
        // 在铁路关键路径之外读取旅游缓存。
        loaded = true;
        try { window.dispatchEvent(new CustomEvent("pt:railway-ready", { detail: { source: "cache" } })); } catch(e) {}
        console.log("[DbLoader] Railway cache hit (v" + DB_CACHE_VERSION + "), background refresh scheduled");
        // 延后解析旅游缓存 JSON（约 1.8MB），搜索不需要它。

        fetchRemote().catch(function(err) {
          console.warn("[DbLoader] Background refresh failed, keeping cache:", err.message);
        });
        return Promise.resolve();
      } catch(e) {
        // 缓存损坏 → 走远程
        console.warn("[DbLoader] Cache apply failed, falling back to remote:", e.message);
        try { localStorage.removeItem(DB_CACHE_KEY); } catch(_e) {}
      }
    }

    // 2) 无缓存 → 远程加载（超时 + 重试）
    _loadPromise = fetchRemote().catch(function(err) {
      // 3) 远程失败 → 旧版本缓存兜底（避免白屏 / Render failed）
      var fallback = readAnyCache();
      if (fallback) {
        try {
          applyData(fallback.railway, fallback.i18n);
          applyTourismData(fallback.tourism || {});
          loaded = true;
          try { window.dispatchEvent(new CustomEvent("pt:railway-ready", { detail: { source: "fallback-cache" } })); } catch(e) {}
          console.warn("[DbLoader] Remote failed, using older cache fallback:", err.message);
          return fallback;
        } catch(e2) {}
      }
      error = err;
      try { window.dispatchEvent(new CustomEvent("pt:railway-error", { detail: { error: err } })); } catch(e) {}
      console.error("[DbLoader] Failed to load:", err.message);
      throw err;
    }).catch(function(err) {
      _loadPromise = null;
      throw err;
    });
    return _loadPromise;
  }

  function retry() {
    // Reuse the canonical in-flight load. Multiple recovery triggers (online,
    // BFCache restore, retry button) must not start parallel railway fetches.
    if (loaded) return Promise.resolve();
    if (_loadPromise) return _loadPromise;
    error = null;
    return load();
  }

  window.DataLoader = {
    load: load,
    retry: retry,
    isLoaded: function() { return loaded; },
    getTourismStatus: function() { return tourismStatus; },
    getError: function() { return error; }
  };

  // 暴露实时缓存辅助函数。
  window.RailwayRTC = {
    savePositions: function(positions) { return window.RTCache.savePositions(positions); },
    saveDelayInfo: function(delayInfo) { return window.RTCache.saveDelayInfo(delayInfo); },
    loadPositions: function() { return window.RTCache.loadPositions(); },
    loadDelayInfo: function() { return window.RTCache.loadDelayInfo(); }
  };

  // Kick off data loading immediately: bundles are dynamic <script>/fetch and
  // do not need the DOM, so download+parse runs in parallel with the remaining
  // synchronous scripts and the page reaches full data sooner.
  setTimeout(load, 0);

  // ========== 未处理 Promise 拒绝监听器 ==========
  // 捕获逃出内部 catch 块的 ODPT fetch 或异步错误。
  window.addEventListener('unhandledrejection', function(event) {
    console.warn('[PixelTetsudo] Unhandled promise rejection:', event.reason ? event.reason.message || event.reason : event.reason);
    event.preventDefault();
  });
})();

/*
 * DataLayer 兼容门面。
 * 线路事实由 RailwayDB/UNIFIED_LINES 拥有；本门面只保留旧消费者需要的
 * 线路查询和实时缓存访问，不再维护第二套通用网络/JSON 缓存。
 */
(function() {
  'use strict';

  // 线路数据辅助函数。
  function getAllLines() {
    if (window.RailwayDB && window.RailwayDB.getAllLines) {
      return window.RailwayDB.getAllLines();
    }
    return window.UNIFIED_LINES || {};
  }

  function getLine(lineId) {
    if (window.RailwayDB && window.RailwayDB.getLine) {
      return window.RailwayDB.getLine(lineId) || null;
    }
    return window.UNIFIED_LINES ? window.UNIFIED_LINES[lineId] : null;
  }

  function getGroupedLines() {
    var result = { grouped: {}, regionOrder: [] };
    var lines = getAllLines();
    Object.keys(lines).forEach(function(id) {
      var line = lines[id];
      var region = line.region || 'Unknown';
      if (!result.grouped[region]) {
        result.grouped[region] = [];
        result.regionOrder.push(region);
      }
      result.grouped[region].push(line);
    });
    return result;
  }

  // 公共 API。

  // 车站坐标访问器。
  function getStationCoords() {
    return window.STATION_COORDS || {};
  }

  // 缓存的列车位置（lineId → [{stationIndex, delayMin, ...}]）。
var _cachedPositions = {};

function getCachedPositions(lineId) {
  return _cachedPositions[lineId] || [];
}

function setCachedPositions(lineId, positions) {
  if (!positions || !Array.isArray(positions)) return;
  _cachedPositions[lineId] = positions;
}

window.DataLayer = {
    getStationCoords: getStationCoords,
    getAllLines: getAllLines,
    getLine: getLine,
    getGroupedLines: getGroupedLines,
    getCachedPositions: getCachedPositions,
    setCachedPositions: setCachedPositions
  };

})();


