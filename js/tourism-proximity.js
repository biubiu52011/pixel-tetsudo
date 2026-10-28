/**
 * TourismProximity — 统一邻近查询 API
 * 集中提供所有旅游距离查询的 Haversine 计算与缓存。
 *
 * 用法：
 *   var results = TourismProximity.getNearbySpotsByStation(stationId, { radius: 3000, limit: 10 });
 *
 * 返回：{ spot, distance, distanceText, stationId } 数组；失败时返回 []。
 */
(function() {
  'use strict';

  var R = 6371000; // Earth radius in meters
  var DEFAULT_RADIUS = 3000; // 3km
  var DEFAULT_LIMIT = 10;
  var CACHE_TTL_MS = 60000; // 60 seconds
  var CACHE_MIN_MOVE_M = 100; // Recompute only if user moved >= 100m

  /**
   * 计算两个经纬度点之间的 Haversine 距离（米）。
   * 任一点无效（0,0 或缺失）时返回 Infinity。
   */
  function haversine(lat1, lng1, lat2, lng2) {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity;
    // 防止使用（0,0）坐标。
    if ((lat1 === 0 && lng1 === 0) || (lat2 === 0 && lng2 === 0)) return Infinity;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 格式化用于显示的距离。
   */
  function formatDistance(meters) {
    if (meters === Infinity || meters === null || isNaN(meters)) return null;
    if (meters < 1000) return Math.round(meters) + 'm';
    return (meters / 1000).toFixed(1) + 'km';
  }

  /**
   * 将距离格式化为步行分钟数（面向用户显示）。
   * 假定平均步行速度为 80 米/分钟。
   */
  function formatWalkMinutes(meters, i18n) {
    if (meters === Infinity || meters === null || isNaN(meters)) return null;
    var atStation = i18n && i18n.at_station ? i18n.at_station : '駅前';
    var minWalk = i18n && i18n.min_walk ? i18n.min_walk : '分徒歩';
    if (meters < 100) return atStation;
    var mins = Math.round(meters / 80);
    return mins + ' ' + minWalk;
  }

  /**
   * 构建或返回车站附近景点的缓存结果。
   * @param {string} stationId - 车站标识
   * @param {Object} options - { radius: number, limit: number }
   * @returns {Array<{spot, distance, distanceText, stationId}>}
   */
  function getNearbySpotsByStation(stationId, options) {
    options = options || {};
    var radius = (options.radius > 0) ? options.radius : DEFAULT_RADIUS;
    var limit = (options.limit > 0) ? options.limit : DEFAULT_LIMIT;

    var spots = window.TOURISM_SPOTS || [];
    if (!spots.length) return []; // Unready data is not a cacheable nearby snapshot.
    var sc = window.STATION_COORDS || {};
    if (!stationId) return [];

    // 解析车站坐标：优先使用 RailwayDB，否则使用 STATION_COORDS。
    var stationCoord = null;
    if (window.RailwayDB && window.RailwayDB.getStationLocation) {
      stationCoord = window.RailwayDB.getStationLocation(stationId);
    }
    if (!stationCoord) {
      stationCoord = sc[stationId];
    }
    if (!stationCoord || !stationCoord[0] || !stationCoord[1]) return [];

    var sLat = stationCoord[0];
    var sLng = stationCoord[1];

    // 根据车站坐标和半径构建缓存键（不使用 stationId，以处理名称变体）。
    var cacheKey = sLat.toFixed(6) + "," + sLng.toFixed(6) + '|' + radius + '|' + limit;
    var now = Date.now();

    // 检查缓存。
    if (_proximityCache[cacheKey]) {
      var cached = _proximityCache[cacheKey];
      if ((now - cached.timestamp) < CACHE_TTL_MS) {
        // TTL 未过期：返回缓存结果。
        return cached.results;
      }
      // TTL 已过期：继续重新计算。
    }

    // 从全局景点池收集所有条目并计算距离。
    var results = [];
    for (var i = 0; i < spots.length; i++) {
      var spot = spots[i];
      if (!spot || !spot.coord || !spot.coord[0] || !spot.coord[1]) continue;
      var dist = haversine(sLat, sLng, spot.coord[0], spot.coord[1]);
      if (dist === Infinity) continue;
      if (dist <= radius) {
        results.push({
          spot: spot,
          distance: dist,
          distanceText: formatWalkMinutes(dist),
          stationId: stationId,
          exitDirection: getExitNameByCoords(stationId, dist, spot.coord[0], spot.coord[1]),
        });
      }
    }

    // 按距离升序排序。
    results.sort(function(a, b) { return a.distance - b.distance; });
    results = results.slice(0, limit);

    // 更新缓存。
    _proximityCache[cacheKey] = {
      timestamp: now,
      results: results
    };

    return results;
  }

  /**
   * 使缓存失效（数据变化时调用）。
   */
  function invalidateCache() {
    _proximityCache = {};
  }

  /**
   * 直接获取 Haversine 距离（供需要原始距离的模块使用）。
   */
  function getDistance(lat1, lng1, lat2, lng2) {
    return haversine(lat1, lng1, lat2, lng2);
  }

  /**
   * 按出入口经纬度取最近出口。
   * 遍历 STATION_EXITS[stationId] 中每个出口的真实坐标，Haversine 取与 spot 最近者。
   * @param {string} stationId - 车站标识
   * @param {number} spotLat - Spot latitude
   * @param {number} spotLng - Spot longitude
   * @returns {Object|null} { name, distance } or null（站无出口数据）
   */
  function getNearestExit(stationId, spotLat, spotLng) {
    if (spotLat == null || spotLng == null) return null;
    var stationExits = (window.STATION_EXITS && window.STATION_EXITS[stationId]) || [];
    if (!stationExits.length) return null;
    var best = null;
    for (var i = 0; i < stationExits.length; i++) {
      var ex = stationExits[i];
      if (!ex || ex.lat == null || ex.lng == null) continue;
      var d = haversine(spotLat, spotLng, ex.lat, ex.lng);
      if (d === Infinity) continue;
      if (!best || d < best.distance) best = { name: ex.name, distance: d };
    }
    return best;
  }

  /**
   * 出口名解析：spot 距站中心 <80m 视为駅直結，否则取经纬度最近出口。
   * @returns {string|null} exit name or '駅直結' or null（无出口数据）
   */
  function getExitNameByCoords(stationId, stationToSpotDist, spotLat, spotLng) {
    if (stationToSpotDist < 80) return '駅直結';
    var nearest = getNearestExit(stationId, spotLat, spotLng);
    return nearest ? nearest.name : null;
  }


  /**
   * 根据用户位置查找最近车站。
   * @param {number} userLat - 用户纬度
   * @param {number} userLng - 用户经度
   * @returns {Object|null} { stationId, distance, coord }，无结果时返回 null
   */



  /**
   * 跨站最优出站推荐——遍历 STATION_EXITS 全部站，对每站取最近出口，
   * 按出口→spot 距离升序，给出全局最优出站站+出口；同时返回当前站(fromStationId)的出站信息。
   * 场景：定位到 A 站时显示"从 A 站 O 口出"；若其他站出口明显更近，推荐"去 X 站 Y 口出"。
   * @param {number} spotLat - Spot latitude
   * @param {number} spotLng - Spot longitude
   * @param {string|null} fromStationId - 当前定位/来源站 ID（可空）
   * @param {number} maxDistM - 只考虑出口距离在此范围内的站（默认 2000m）
   * @returns {Object|null} {
   *   best: { stationId, exitName, distance } | null,
   *   fromExit: { stationId, exitName, distance } | null,
   *   list: Array<{ stationId, exitName, distance }>
   * }
   */
  function recommendExitStation(spotLat, spotLng, fromStationId, maxDistM) {
    if (spotLat == null || spotLng == null) return null;
    maxDistM = (maxDistM > 0) ? maxDistM : 2000;
    var allExits = (window.STATION_EXITS) || {};
    var list = [];
    Object.keys(allExits).forEach(function(sid) {
      var nearest = getNearestExit(sid, spotLat, spotLng);
      if (!nearest || nearest.distance == null || nearest.distance === Infinity) return;
      if (nearest.distance > maxDistM) return;
      list.push({ stationId: sid, exitName: nearest.name, distance: nearest.distance });
    });
    list.sort(function(a, b) { return a.distance - b.distance; });
    if (!list.length) return { best: null, fromExit: null, list: [] };
    var fromExit = null;
    if (fromStationId) {
      var f = getNearestExit(fromStationId, spotLat, spotLng);
      if (f && f.distance != null && f.distance !== Infinity && f.distance <= maxDistM) {
        fromExit = { stationId: fromStationId, exitName: f.name, distance: f.distance };
      }
    }
    return { best: list[0], fromExit: fromExit, list: list };
  }

  function getNearestStation(userLat, userLng) {
    if (userLat == null || userLng == null) return null;
    var sc = window.STATION_COORDS || {};
    var nearest = null;
    var minDist = Infinity;
    Object.keys(sc).forEach(function(stationId) {
      var coord = sc[stationId];
      if (!coord || !coord[0] || !coord[1]) return;
      if (coord[0] === 0 && coord[1] === 0) return;
      var dist = haversine(userLat, userLng, coord[0], coord[1]);
      if (dist < minDist) {
        minDist = dist;
        nearest = { stationId: stationId, distance: dist, coord: coord };
      }
    });
    return nearest;
  }
  var _proximityCache = {};
  window.addEventListener("pt:tourism-ready", invalidateCache);
  window.addEventListener("pt:railway-ready", invalidateCache);

  window.TourismProximity = {
    getNearbySpotsByStation: getNearbySpotsByStation,
    getDistance: getDistance,
    getNearestStation: getNearestStation,
    getNearestExit: getNearestExit,
    getExitNameByCoords: getExitNameByCoords,
    recommendExitStation: recommendExitStation,
    formatDistance: formatDistance,
    formatWalkMinutes: formatWalkMinutes,
    invalidateCache: invalidateCache,
    // 暴露常量以保持向后兼容。
    DEFAULT_RADIUS: DEFAULT_RADIUS,
    DEFAULT_LIMIT: DEFAULT_LIMIT,
    CACHE_TTL_MS: CACHE_TTL_MS,
    CACHE_MIN_MOVE_M: CACHE_MIN_MOVE_M
  };

})();

