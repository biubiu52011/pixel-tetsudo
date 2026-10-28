/**
 * 线路展示服务。
 * 统一管理所有线路总览中的 UI 排序。
 *
 * 排序单位 = 展示实体 / 运行系统：
 *   每条线路记录都可以携带 `presentation` 区块（由已淘汰的 LOS 层吸收而来的
 *   canonical 元数据）。`presentation.lineIds[0] === lineId` 的记录是主记录；
 *   成员线路（lineIds[1..]）共享主记录的排序位置，不单独占用 UI 位置。
 *
 * 全局类别顺序：JR > Metro（地下铁）> Private（私铁）> Other（其他）。
 * 同一运营商组内依次比较：
 *   显式 presentation.order → 特殊符号 → A-Z 符号
 *   → 显示名称 → 稳定的原始顺序。
 *
 * canonical 物理线路仍在 railway_data.json 中独立建模；
 * 本层只负责展示，不合并或改写 canonical 拓扑。
 *
 * 公共 API：
 *   - getDisplayOrder(lines, options) → 按顺序排列的线路 ID（主记录 + 成员）
 *     options.includeServiceCorridors：将仅用于展示的走廊卡片纳入排序。
 *   - getPresentationOrder(lines) → 按顺序排列的主展示实体
 *   - getDisplayOrderMap(lines) → 线路 ID 到展示序号的映射
 *   - orderOperators(ops) → 按类别、JR 固定顺序、OP_ORDER 和字母顺序排列运营商
 */
(function() {
  "use strict";

  // ===== 1. 类别与固定顺序 =====

  var CATEGORY_ORDER = ["JR", "Metro", "Private", "Other"];
  var JR_OPERATOR_ORDER = [
    "JR-East",
    "JR-Central",
    "JR-West",
    "JR-Hokkaido",
    "JR-Shikoku",
    "JR-Kyushu",
    "JR-Freight"
  ];

  // 最小类别元数据：以 "JR-" 前缀识别 JR 运营商
  // （JR-East / JR-West / JR-Central / JR-Kyushu / JR-Hokkaido / JR-Shikoku）。
  // Metro = 公营・地下铁；Private = 大型私铁及准大型/近畿・中部・九州私铁；
  // 其余运营商（单轨、新交通、AGT、TWR 等）归入 Other。
  var METRO_OPS = [
    "TokyoMetro", "Toei", "YokohamaMunicipal",
    "OsakaMetro", "NagoyaMunicipal", "KyotoMunicipal", "KobeMunicipal",
    "SapporoMunicipal", "SendaiMunicipal", "FukuokaMunicipal", "HiroshimaElectric"
  ];
  var PRIVATE_OPS = [
    "Keio", "Odakyu", "EnoshimaElectric", "Seibu", "Tobu", "Tokyu",
    "Keikyu", "Keisei", "Sotetsu",
    "Kintetsu", "Hankyu", "Hanshin", "Keihan", "Nankai",
    "Meitetsu", "Nishitetsu"
  ];

  // ===== 2. 基础分类与排序键 =====

  function categoryOf(op) {
    if (!op) return "Other";
    if (/^JR-/.test(op)) return "JR";
    if (METRO_OPS.indexOf(op) >= 0) return "Metro";
    if (PRIVATE_OPS.indexOf(op) >= 0) return "Private";
    return "Other";
  }

  function categoryIndex(op) {
    var c = categoryOf(op);
    var i = CATEGORY_ORDER.indexOf(c);
    return i >= 0 ? i : CATEGORY_ORDER.length - 1;
  }

  function jrOperatorIndex(op) {
    var i = JR_OPERATOR_ORDER.indexOf(op);
    return i >= 0 ? i : JR_OPERATOR_ORDER.length;
  }

  // 规范化符号：纯 A-Z 字母按字母排序；其他符号（数字、"-"、混合字符、CJK）
  // 视为“特殊符号”，排在 A-Z 之前。
  function symbolSortKey(code) {
    var c = String(code || "").toUpperCase();
    if (!c) return "2|";                    // no symbol -> fallback tier
    if (/^[A-Z]+$/.test(c)) return "1|" + c; // A-Z tier
    return "0|" + c;                        // special tier (first)
  }

  function displayNameOf(line, pres) {
    if (pres) return pres.nameJa || pres.nameEn || "";
    return (line && (line.nameJa || line.nameEn || line.name)) || "";
  }

  // 新干线是面向乘客的铁路类别，不是运营商或展示系统。
  // 在每个 JR 运营商组内，将它作为普通线路之后的连续区块，
  // 避免 fallback 记录把普通线路插入不同的新干线服务之间。
  function isShinkansenLine(line) {
    if (!line) return false;
    var id = String(line.name || "");
    var ja = String(line.nameJa || "");
    var en = String(line.nameEn || "");
    return /Shinkansen/i.test(id) || /新幹線/.test(ja) || /Shinkansen/i.test(en);
  }

  // 生成运营商组内实体的确定性排序键。
  function entitySortKey(entity) {
    var pres = entity.pres;
    var orderKey = (pres && pres.order != null)
      ? "1|" + String(("0000" + String(pres.order)).slice(-4))
      : "2|";
    var code = (pres && pres.code) || (entity.line && entity.line.code) || "";
    var symKey = "0|" + symbolSortKey(code);
    var nameKey = displayNameOf(entity.line, pres);
    var orig = String(("000000" + String(entity.orig)).slice(-6));
    return orderKey + "|" + symKey + "|" + nameKey + "|" + orig;
  }

  // 收集 `lines` 中出现的运营商键；未传入时回退到 UNIFIED_LINES。
  function collectOperators(lines) {
    var src = lines || window.UNIFIED_LINES || {};
    var ops = [];
    Object.keys(src).forEach(function(lid) {
      var op = src[lid] && src[lid].operator;
      if (op && ops.indexOf(op) === -1) ops.push(op);
    });
    return ops;
  }

  // ===== 3. 运营商与展示实体排序 =====

  /**
   * 按全局类别（JR > Metro > Private > Other）、JR 固定组顺序、
   * OP_ORDER（项目 canonical 顺序）和字母顺序排列全部运营商键。
   * 未知运营商不得导致异常。
   */
  function getOperatorOrder(lines) {
    var known = (window.TransitConstants && Array.isArray(window.TransitConstants.OP_ORDER))
      ? window.TransitConstants.OP_ORDER.slice() : [];
    var ops = collectOperators(lines);
    var out = [];
    known.forEach(function(op) { if (ops.indexOf(op) !== -1 && out.indexOf(op) === -1) out.push(op); });
    ops.forEach(function(op) { if (out.indexOf(op) === -1) out.push(op); });
    out.sort(function(a, b) {
      var ca = categoryIndex(a), cb = categoryIndex(b);
      if (ca !== cb) return ca - cb;
      if (categoryOf(a) === "JR" && categoryOf(b) === "JR") {
        var ja = jrOperatorIndex(a), jb = jrOperatorIndex(b);
        if (ja !== jb) return ja - jb;
      }
      var ia = known.indexOf(a), ib = known.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return String(a).localeCompare(String(b));
    });
    return out;
  }

  /**
   * orderOperators(ops)：稳定排列任意运营商子集（筛选栏使用）。
   * 顺序遵循 getOperatorOrder；当前完整顺序之外的运营商追加到字母序末尾。
   */
  function orderOperators(ops) {
    if (!Array.isArray(ops) || ops.length === 0) return ops || [];
    var full = getOperatorOrder(null);
    var inFull = [], rest = [];
    ops.forEach(function(op) { (full.indexOf(op) >= 0 ? inFull : rest).push(op); });
    inFull.sort(function(a, b) { return full.indexOf(a) - full.indexOf(b); });
    rest.sort(function(a, b) { return String(a).localeCompare(String(b)); });
    return inFull.concat(rest);
  }

  /**
   * 返回全局展示顺序中的主展示实体。
   * 每个多线路展示实体只贡献一个排序单位。
   */
  function getPresentationOrder(allLines) {
    allLines = allLines || {};
    var presEntities = [], covered = {};
    Object.keys(allLines).forEach(function(lid) {
      var line = allLines[lid];
      if (!line || !line.presentation) return;
      if (((window.RuntimeConfig || {}).SERVICE_CORRIDOR_LINES || {})[lid]) {
        covered[lid] = true;
        return;
      }
      var ids = line.presentation.lineIds;
      if (!Array.isArray(ids) || ids.length === 0) return;
      if (ids[0] !== lid) return; // member record: not a sort slot
      presEntities.push({ id: lid, pres: line.presentation, line: line, orig: presEntities.length, isPresentation: true });
      ids.forEach(function(m) { covered[m] = true; });
    });
    // fallback 实体：没有 presentation 且不属于其他展示实体成员的线路。
    var fallback = [];
    Object.keys(allLines).forEach(function(lid) {
      var line = allLines[lid];
      if (!line || covered[lid]) return;
      if (((window.RuntimeConfig || {}).SERVICE_CORRIDOR_LINES || {})[lid]) return;
      fallback.push({ id: lid, pres: null, line: line, orig: 100000 + fallback.length, isPresentation: false });
    });

    var byOp = {};
    presEntities.forEach(function(e) {
      var op = (e.line && e.line.operator) || "Unknown";
      e._op = op;
      if (!byOp[op]) byOp[op] = [];
      byOp[op].push(e);
    });
    fallback.forEach(function(e) {
      var op = (e.line && e.line.operator) || "Unknown";
      e._op = op;
      if (!byOp[op]) byOp[op] = [];
      byOp[op].push(e);
    });

    var opOrder = getOperatorOrder(allLines).filter(function(op) { return byOp[op]; });
    Object.keys(byOp).forEach(function(op) { if (opOrder.indexOf(op) === -1) opOrder.push(op); });

    var result = [];
    opOrder.forEach(function(op) {
      var list = byOp[op].slice();
      list.sort(function(a, b) {
        if (a.isPresentation !== b.isPresentation) return a.isPresentation ? -1 : 1; // passenger systems first
        if (!a.isPresentation && categoryOf(op) === "JR") {
          var aShinkansen = isShinkansenLine(a.line);
          var bShinkansen = isShinkansenLine(b.line);
          if (aShinkansen !== bShinkansen) return aShinkansen ? 1 : -1; // conventional fallback, then one Shinkansen block
        }
        var ka = entitySortKey(a), kb = entitySortKey(b);
        return ka < kb ? -1 : (ka > kb ? 1 : 0);
      });
      list.forEach(function(e) { result.push(e); });
    });
    return result;
  }

  /**
   * 返回完整的 lineId 顺序：先放按展示顺序排列的主记录，再放其成员线路。
   * 成员共享主记录的排序位置，UI 聚合层负责去重。
   */
  function getDisplayOrder(allLines, options) {
    allLines = allLines || {};
    options = options || {};
    var pres = getPresentationOrder(allLines);
    var out = [];
    pres.forEach(function(e) {
      out.push(e.id);
      if (e.pres) {
        (e.pres.lineIds || []).forEach(function(m) {
          if (m !== e.id && allLines[m]) out.push(m);
        });
      }
    });
    if (options.includeServiceCorridors) {
      Object.keys(allLines).forEach(function(lid) {
        var line = allLines[lid];
        if (!line || !(((window.RuntimeConfig || {}).SERVICE_CORRIDOR_LINES || {})[lid])) return;
        var presentation = line.presentation || {};
        var afterLineId = presentation.afterLineId;
        if (afterLineId && out.indexOf(lid) === -1) {
          var afterIndex = out.indexOf(afterLineId);
          if (afterIndex >= 0) out.splice(afterIndex + 1, 0, lid);
        }
      });
    }
    return out;
  }

  function getDisplayOrderMap(allLines) {
    var order = getDisplayOrder(allLines);
    var map = {};
    for (var i = 0; i < order.length; i++) map[order[i]] = i;
    return map;
  }

  // ===== 4. 线路身份与分支关系 =====

  function getPresentation(lineId, allLines) {
    allLines = allLines || window.UNIFIED_LINES || {};
    var line = allLines[lineId] || null;
    return line && line.presentation ? line.presentation : null;
  }

  function getPrimaryPresentation(lineId, allLines) {
    var pres = getPresentation(lineId, allLines);
    return pres && Array.isArray(pres.lineIds) && pres.lineIds[0] === lineId ? pres : null;
  }

  function getPresentationMembers(lineId, allLines) {
    allLines = allLines || window.UNIFIED_LINES || {};
    var pres = getPrimaryPresentation(lineId, allLines);
    return pres ? pres.lineIds.filter(function(id) { return !!allLines[id]; }) : [];
  }

  // canonical 身份、来源身份和乘客可见符号各自承担不同职责。
  // 同一运营商内也可能共享符号；符号不能用于选择实体。
  function getLineIdentity(lineId, allLines) {
    allLines = allLines || window.UNIFIED_LINES || {};
    var line = allLines[lineId];
    if (!line) return null;
    var operator = line.operator || "";
    var client = window.ODPTClient || {};
    var canonical = (window.UNIFIED_LINES || {})[lineId] || line;
    var internalCode = line.internalCode || canonical.internalCode || lineId;
    var sourceOperator = (client.LINE_TO_OPERATOR || {})[lineId] || operator;
    var railwayCode = (client.LINE_RAILWAY_CODE || {})[lineId] || lineId;
    return { canonicalId: lineId, operator: operator,
      key: operator + "::" + lineId,
      internalCode: internalCode,
      internalKey: operator + "::" + internalCode,
      displayCode: (line.presentation || {}).code || line.code || "",
      railwayCode: railwayCode,
      sourceOperator: sourceOperator,
      sourceKey: sourceOperator + "::" + railwayCode,
      railwayId: (client.LINE_TO_OPERATOR || {})[lineId]
        ? "odpt.Railway:" + sourceOperator + "." + railwayCode : null };
  }

  function getStatusMembers(memberIds, mode, allLines, primaryId) {
    allLines = allLines || window.UNIFIED_LINES || {};
    if (mode !== "realtime") return memberIds.slice();
    return memberIds.filter(function(id) {
      return id === primaryId || !getPrimaryPresentation(id, allLines);
    });
  }

  // 独立的乘客线路必须显式作为自己的线路展示。
  // 未命名的内部支线无论 SQL 身份如何，都保留在父线路内部。
  function isIndependentLine(lineId, allLines) {
    allLines = allLines || window.UNIFIED_LINES || {};
    var line = allLines[lineId];
    return !!(line && (!line.branchOf || getPrimaryPresentation(lineId, allLines)));
  }

  function getMapBranchIds(lineId, allLines) {
    allLines = allLines || window.UNIFIED_LINES || {};
    var members = getPresentationMembers(lineId, allLines);
    return Object.keys(allLines).filter(function(id) {
      return id !== lineId && allLines[id].branchOf === lineId &&
        (!isIndependentLine(id, allLines) || members.indexOf(id) >= 0);
    });
  }

  function isBranch(lineId, allLines) {
    allLines = allLines || window.UNIFIED_LINES || {};
    try {
      if (window.RunningChainResolver && typeof window.RunningChainResolver.getResolutionContext === "function") {
        var ctx = window.RunningChainResolver.getResolutionContext(lineId, Object.keys(allLines));
        if (ctx) return ctx.isBranch === true;
      }
    } catch(e) {}
    var line = allLines[lineId] || null;
    return !!(line && line.branchOf);
  }

  // ===== 5. 对外导出 =====

  window.LinePresentationService = {
    getDisplayOrder: getDisplayOrder,
    getPresentationOrder: getPresentationOrder,
    getDisplayOrderMap: getDisplayOrderMap,
    getOperatorOrder: getOperatorOrder,
    orderOperators: orderOperators,
    categoryOf: categoryOf,
    getPresentation: getPresentation,
    getPrimaryPresentation: getPrimaryPresentation,
    getPresentationMembers: getPresentationMembers,
    getLineIdentity: getLineIdentity,
    getStatusMembers: getStatusMembers,
    getMapBranchIds: getMapBranchIds,
    isIndependentLine: isIndependentLine,
    isBranch: isBranch
  };
})();
