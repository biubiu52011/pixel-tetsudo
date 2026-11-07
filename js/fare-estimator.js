/*
 * Pixel Tetsudo — 票价估算器
 * 路径搜索票价估算（概算・参考），按运营商类型分组：
 *   JR-East  → JR 东日本区间票价阶梯
 *   Metro/Toei → 地铁票价阶梯
 *   其他私铁 → 通用私铁票价阶梯
 * 距离根据区间数量估算（站数 × 平均站距），因此所有金额
 * 仅供粗略参考，绝非官方票价。
 */
(function() {
  "use strict";

  var KM_PER_SEG = { jr: 1.3, metro: 1.0, private: 1.1 };

  // [maxKm, fareYen] 阶梯，成人普通票价（简化的公开结构）
  var FARE_TABLE = {
    jr:      [[3, 150], [6, 170], [10, 190], [15, 230], [20, 290], [25, 350], [30, 410], [40, 500], [50, 580], [Infinity, 680]],
    metro:   [[6, 180], [11, 210], [19, 260], [28, 320], [40, 390], [Infinity, 460]],
    private: [[3, 150], [7, 170], [12, 200], [18, 250], [25, 310], [35, 380], [Infinity, 460]]
  };

  function operatorGroup(op) {
    if (op === 'JR-East') return 'jr';
    if (op === 'TokyoMetro' || op === 'Toei') return 'metro';
    return 'private';
  }

  function fareFor(group, km) {
    var table = FARE_TABLE[group] || FARE_TABLE.private;
    for (var i = 0; i < table.length; i++) {
      if (km <= table[i][0]) return table[i][1];
    }
    return table[table.length - 1][1];
  }

  /**
   * 估算一段乘车区间的票价。
   * @param {string} lineId canonical 线路 ID
   * @param {number} hopCount 该区间的车站间隔数（>=1）
   * @returns {number} 估算的成人日元票价
   */
  function estimateSegment(lineId, hopCount) {
    var group = 'private';
    var line = null;
    try {
      line = (window.RailwayDB && window.RailwayDB.getLine) ? window.RailwayDB.getLine(lineId) : null;
    } catch (e) {}
    // Shinkansen fares require actual distance plus limited-express/seat charges.
    // A local-station-count proxy cannot produce a defensible amount.
    if (/shinkansen|新幹線/i.test(String(lineId || '') + ' ' +
        String(line && line.name || '') + ' ' +
        String(line && line.nameJa || ''))) return null;
    if (line && line.operator) group = operatorGroup(line.operator);
    var km = Math.max(1, hopCount || 1) * KM_PER_SEG[group];
    return fareFor(group, km);
  }

  /**
   * 汇总 RouteSearch 结果（routeSegments 数组）中的各段票价。
   * @returns {number|null} 总估算票价；没有乘车区间时返回 null
   */
  function estimateTotal(segments) {
    if (!segments || !segments.length) return null;
    var total = 0, hasRide = false;
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      if (s && s.type === 'ride') {
        // Never show a partial fare as the total when one leg is unpriced.
        if (typeof s.fare !== 'number' || !Number.isFinite(s.fare)) return null;
        total += s.fare;
        hasRide = true;
      }
    }
    return hasRide ? total : null;
  }

  window.FareEstimator = {
    estimateSegment: estimateSegment,
    estimateTotal: estimateTotal,
    _groups: operatorGroup
  };
})();
