/* Published formation coupling relationships; NEVER derive physical identity
 * or renumber a train from the last two digits alone.
 * Source: JR East 2026-11 Narita Express timetable (200xM: Ofuna / 220xM: Shinjuku).
 * Timetable evidence is a PLAN, not proof that a carset is coupled in realtime.
 */
(function (root) {
  "use strict";
  if (root.TrainCoupling) return;

  var SOURCE = "https://timetables.jreast.co.jp/2611/timetable-v/023u1.html";
  var SOURCE_OUTBOUND = "https://timetables.jreast.co.jp/2611/timetable-v/023d1.html";
  var VALID_FROM = "2026-11-01";
  var VALID_TO = "2026-11-30";
  // These are published coupling services, NOT every N'EX service or
  // every 20xxM/22xxM pair. For example 2004M -> 2204M is a
  // through/renumbering service at Tokyo, NOT a two-formation split.
  var ODD_COUPLED = [1, 3, 5, 7, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 53];
  var EVEN_COUPLED = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 40, 46, 50, 52, 54];
  var declared = Object.create(null);
  ODD_COUPLED.concat(EVEN_COUPLED).forEach(function (number) {
    var suffix = String(number).padStart(2, "0") + "M";
    declared["20" + suffix] = "22" + suffix;
    declared["22" + suffix] = "20" + suffix;
  });
  var shared = Object.create(null);
  ("Tokyo Bakurocho Kinshicho ShinKoiwa Ichikawa Funabashi Tsudanuma Inage Chiba Monoi " +
   "Sakura Narita AirportTerminal2 NaritaAirport NaritaAirportTerminal2").split(" ").forEach(function (s) { shared[s] = true; });
  var branch = Object.create(null);
  ("Shinagawa Shimbashi MusashiKosugi Yokohama Totsuka Ofuna Osaki Ebisu Shibuya Shinjuku " +
   "Ikebukuro").split(" ").forEach(function (s) { branch[s] = true; });
  var allowedLines = Object.create(null);
  ("SobuRapid SobuMain Narita NaritaAirportBranch Yokosuka ShonanShinjuku").split(" ").forEach(function (s) {
    allowedLines[s] = true;
  });

  function stationKey(s) { return String(s || "").split(/[:.]/).pop().trim(); }
  function numberMatch(p) {
    if (!p || !p.trainNumber) return null;
    var number = String(p.trainNumber).trim().toUpperCase();
    var partner = declared[number];
    if (!partner) return null;
    var date = String(p.serviceDate || "").slice(0, 10);
    if (date < VALID_FROM || date > VALID_TO) return null;
    var route = String(p.positionLineId || p.lineId || p.fusionLineId || "").trim();
    var src = String(p.sourceRailway || "");
    if (!allowedLines[route] && !/odpt\.Railway:JR-East\.(SobuRapid|SobuMain|Narita|Yokosuka|ShonanShinjuku)/.test(src)) return null;
    var op = String(p.trainOperator || p.operator || p.assignmentOperator || "").trim();
    if (op && op !== "JR-East") return null;
    var type = String(p.trainType || "");
    if (type && !/(LimitedExpress|特急)/.test(type)) return null;
    var serviceGroup = p.vehiclePlan && p.vehiclePlan.crossLineEvidence &&
      p.vehiclePlan.crossLineEvidence.serviceGroup;
    if (serviceGroup && serviceGroup !== "narita-express") return null;
    return { number:number, partner:partner, service:parseInt(number.slice(2,4),10),
      source:parseInt(number.slice(2,4),10) % 2 === 0 ? SOURCE : SOURCE_OUTBOUND };
  }

  function phaseOf(p, stationCoords) {
    var current = stationKey(p && (p.stationId || p.currentStation));
    var idx = p && p.stationIndex != null ? Number(p.stationIndex) : NaN;
    if ((!current || (!shared[current] && !branch[current])) &&
        Array.isArray(stationCoords) && Number.isInteger(idx) && idx >= 0 && idx < stationCoords.length) {
      current = stationKey(stationCoords[idx] && stationCoords[idx].stationId);
    }
    var next = "";
    var nextIdx = p && p.segmentToIndex == null ? -1 : Number(p.segmentToIndex);
    if (Array.isArray(stationCoords) && Number.isInteger(nextIdx) &&
        nextIdx >= 0 && nextIdx < stationCoords.length)
      next = stationKey(stationCoords[nextIdx] && stationCoords[nextIdx].stationId);
    if (current === "Tokyo" || next === "Tokyo") return "boundary";
    // Only identified physical corridor stations can establish whether the
    // formation is still coupled. We must not infer from train number alone.
    if (shared[current] && (!next || shared[next])) return "coupled";
    if (branch[current] && (!next || branch[next])) return "separate";
    return "unknown";
  }

  function annotateOne(p, stationCoords) {
    var match = numberMatch(p);
    if (!match) return p;
    var phase = phaseOf(p, stationCoords);
    if (phase === "unknown") return p;
    return Object.assign({}, p, {
      coupling: {
        kind:"published-formation-coupling",
        serviceName:"Narita Express",
        serviceNumber:match.service,
        trainNumber:match.number,
        partnerNumber:match.partner,
        numbers: [match.number,match.partner].sort(),
        phase:phase,
        junction:"Tokyo",
        // Scheduled operation, NEVER actual physical formation confirmation.
        physicalConfirmed:false,
        sourceUrl:match.source,
        serviceDate:String(p.serviceDate).slice(0,10)
      }
    });
  }

  function coincident(a, b) {
    if (!a || !b || !a.coupling || !b.coupling ||
        a.coupling.phase !== "coupled" || b.coupling.phase !== "coupled" ||
        a.coupling.partnerNumber !== b.trainNumber ||
        a.coupling.serviceDate !== b.coupling.serviceDate ||
        a.positionSource !== b.positionSource || a.estimated !== b.estimated ||
        String(a.sourceRailway || "") !== String(b.sourceRailway || "") ||
        String(a.railDirection || "") !== String(b.railDirection || "") ||
        Number(a.stationIndex) !== Number(b.stationIndex) ||
        String(a.segmentToIndex == null ? "" : a.segmentToIndex) !==
          String(b.segmentToIndex == null ? "" : b.segmentToIndex)) return false;
    var pa = Number(a.segmentProgress || 0), pb = Number(b.segmentProgress || 0);
    return Number.isFinite(pa) && Number.isFinite(pb) && Math.abs(pa-pb) <= 0.04;
  }

  function prepare(positions, stationCoords) {
    var enriched = (positions || []).map(function (p) { return annotateOne(p, stationCoords); });
    var used = Object.create(null), result = [];
    for (var i = 0; i < enriched.length; i++) {
      if (used[i]) continue;
      var a = enriched[i];
      if (!a || !a.coupling || a.coupling.phase !== "coupled") { result.push(a); continue; }
      var mate = -1;
      for (var j = i+1; j < enriched.length; j++) {
        if (!used[j] && coincident(a, enriched[j])) { mate=j; break; }
      }
      if (mate < 0) { result.push(a); continue; }
      used[mate] = true;
      // Shared formation = one marker; neither public train number is lost.
      // Keep the existing ID to maintain stable animation across polling.
      var copy = Object.assign({}, a, {coupling:Object.assign({}, a.coupling, {
        joinedPositionsVerified:true,
        sourceTrainNumbers:[a.trainNumber,enriched[mate].trainNumber].sort()
      })});
      result.push(copy);
    }
    return result;
  }

  function label(coupling, lang) {
    if (!coupling || coupling.kind !== "published-formation-coupling") return "";
    lang = String(lang || "ja").toLowerCase();
    var pair = coupling.numbers.join(" + "), station = coupling.junction;
    var even = coupling.serviceNumber % 2 === 0;
    if (/^zh/.test(lang)) {
      if (coupling.phase === "coupled") return "时刻表并结车号 " + pair + "（" + station + "站" + (even ? "分离" : "并结") + "）";
      if (coupling.phase === "separate") return "独立编组 " + coupling.trainNumber +
        "（" + station + "站" + (even ? "分离后" : "并结前") + "；另一编组 " + coupling.partnerNumber + "）";
      return station + "站" + (even ? "分离" : "并结") + "区间；车号 " + pair;
    }
    if (lang === "en") {
      if (coupling.phase === "coupled") return "Scheduled coupled numbers " + pair +
        " (" + station + " " + (even ? "split" : "join") + ")";
      if (coupling.phase === "separate") return "Separate portion " + coupling.trainNumber +
        " (" + (even ? "after split" : "before joining") + " at " + station +
        "; other portion " + coupling.partnerNumber + ")";
      return station + " " + (even ? "split" : "join") + " boundary: " + pair;
    }
    if (lang === "ko") {
      if (coupling.phase === "coupled") return "시각표 병결 열차번호 " + pair + " (" + station + "역 " + (even ? "분리" : "병결") + ")";
      if (coupling.phase === "separate") return "단독 편성 " + coupling.trainNumber +
        " (" + station + "역 " + (even ? "분리 후" : "병결 전") + "; 다른 편성 " + coupling.partnerNumber + ")";
      return station + "역 " + (even ? "분리" : "병결") + " 구간: " + pair;
    }
    if (coupling.phase === "coupled") return "時刻表上の併結列車番号 " + pair +
      "（" + station + "駅で" + (even ? "分割" : "併合") + "）";
    if (coupling.phase === "separate") return "単独編成 " + coupling.trainNumber +
      "（" + station + "駅" + (even ? "分割後" : "併合前") + "・相手 " + coupling.partnerNumber + "）";
    return station + "駅" + (even ? "分割" : "併合") + "区間： " + pair;
  }

  root.TrainCoupling = Object.freeze({
    version:"20261103-nex-coupling-v1",
    sourceUrl:SOURCE, sourceOutboundUrl:SOURCE_OUTBOUND,
    lookup:numberMatch, phaseOf:phaseOf, prepare:prepare, label:label
  });
})(window);
