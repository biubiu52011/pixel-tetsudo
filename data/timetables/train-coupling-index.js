/* Published formation coupling relationships; NEVER derive physical identity
 * or renumber a train from the last two digits alone.
 * Source: JR East 2026-11 Narita Express / Odoriko coupling timetables.
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
  // Odoriko's two portions split at Atami when southbound and join there
  // when northbound. These exact public train-number pairs are independently
  // published by JR East; a 30xxM/40xxM numerical pattern is not evidence.
  var odoriko = Object.create(null);
  function addOdoriko(a, b, service, source, limitedDates) {
    var detail = {service:service, source:source, limitedDates:limitedDates || null};
    odoriko[a] = Object.assign({partner:b}, detail);
    odoriko[b] = Object.assign({partner:a}, detail);
  }
  addOdoriko("3021M","4021M",1,
    "https://timetables.jreast.co.jp/2611/train/095/099001.html");
  addOdoriko("9027M","8077M",7,
    "https://timetables.jreast.co.jp/2611/train/100/101021.html",
    ["2026-11-01","2026-11-03","2026-11-21","2026-11-22","2026-11-23","2026-11-28","2026-11-29"]);
  addOdoriko("3029M","4029M",9,
    "https://timetables.jreast.co.jp/2611/train/095/099011.html");
  addOdoriko("3024M","4024M",4,
    "https://timetables.jreast.co.jp/2611/train/060/064241.html");
  addOdoriko("9028M","8078M",8,
    "https://timetables.jreast.co.jp/2611/train/100/101041.html",
    ["2026-11-01","2026-11-03","2026-11-21","2026-11-22","2026-11-23","2026-11-28","2026-11-29"]);
  addOdoriko("3030M","4030M",10,
    "https://timetables.jreast.co.jp/2611/train/060/063531.html");

  var odorikoShared = Object.create(null);
  ("Tokyo Shinagawa Kawasaki Yokohama Totsuka Ofuna Fujisawa Chigasaki Hiratsuka " +
   "Oiso Ninomiya Kozu Kamonomiya Odawara Hayakawa Nebukawa Manazuru Yugawara").split(" ").forEach(function(s){
    odorikoShared[s] = true;
  });
  var odorikoBranch = Object.create(null);
  ("Ito Usami Ajiro Izukogen Izuatagawa Izuinatori Kawazu IzukyuShimoda " +
   "Mishima MishimaTamachi Daiba IzuNagaoka Ohito Shuzenji").split(" ").forEach(function(s){
    odorikoBranch[s] = true;
  });
  var odorikoLines = Object.create(null);
  ("Tokaido TokaidoMain Ito IzuKyuko IzuHakoneSunzu").split(" ").forEach(function(s) {
    odorikoLines[s] = true;
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
    var nPartner = declared[number], o = odoriko[number];
    if (!nPartner && !o) return null;
    var date = String(p.serviceDate || "").slice(0, 10);
    if (date < VALID_FROM || date > VALID_TO) return null;
    if (o && o.limitedDates && o.limitedDates.indexOf(date) < 0) return null;
    var isOdoriko = !!o;
    var route = String(p.positionLineId || p.lineId || p.fusionLineId || "").trim();
    var src = String(p.sourceRailway || "");
    if (isOdoriko) {
      if (!odorikoLines[route] &&
          !/odpt\.Railway:(?:JR-East\.(?:Tokaido|Ito)|IzuKyuko\.|IzuHakone\.)/.test(src)) return null;
    } else if (!allowedLines[route] &&
        !/odpt\.Railway:JR-East\.(SobuRapid|SobuMain|Narita|Yokosuka|ShonanShinjuku)/.test(src)) return null;
    var op = String(p.trainOperator || p.operator || p.assignmentOperator || "").trim();
    if (op && op !== "JR-East") return null;
    var type = String(p.trainType || "");
    if (type && !/(LimitedExpress|特急)/.test(type)) return null;
    var serviceGroup = p.vehiclePlan && p.vehiclePlan.crossLineEvidence &&
      p.vehiclePlan.crossLineEvidence.serviceGroup;
    if (serviceGroup && serviceGroup !== (isOdoriko ? "odoriko" : "narita-express")) return null;
    var service = isOdoriko ? o.service : parseInt(number.slice(2,4),10);
    return {
      number:number, partner:isOdoriko ? o.partner : nPartner,
      service:service, group:isOdoriko ? "odoriko" : "narita-express",
      serviceName:isOdoriko ? "Odoriko" : "Narita Express",
      junction:isOdoriko ? "Atami" : "Tokyo",
      operation:isOdoriko
        ? (service % 2 ? "split" : "join")
        : (service % 2 ? "join" : "split"),
      source:isOdoriko ? o.source : service % 2 === 0 ? SOURCE : SOURCE_OUTBOUND
    };
  }

  function phaseOf(p, stationCoords) {
    var match = numberMatch(p);
    if (!match) return "unknown";
    var common = match.group === "odoriko" ? odorikoShared : shared;
    var alone = match.group === "odoriko" ? odorikoBranch : branch;
    var current = stationKey(p && (p.stationId || p.currentStation));
    var idx = p && p.stationIndex != null ? Number(p.stationIndex) : NaN;
    if ((!current || (!common[current] && !alone[current] && current !== match.junction)) &&
        Array.isArray(stationCoords) && Number.isInteger(idx) && idx >= 0 && idx < stationCoords.length) {
      current = stationKey(stationCoords[idx] && stationCoords[idx].stationId);
    }
    var next = "";
    var nextIdx = p && p.segmentToIndex == null ? -1 : Number(p.segmentToIndex);
    if (Array.isArray(stationCoords) && Number.isInteger(nextIdx) &&
        nextIdx >= 0 && nextIdx < stationCoords.length)
      next = stationKey(stationCoords[nextIdx] && stationCoords[nextIdx].stationId);
    if (current === match.junction || next === match.junction) return "boundary";
    // Only identified physical corridor stations can establish whether the
    // formation is still coupled. We must not infer from train number alone.
    if (common[current] && (!next || common[next])) return "coupled";
    if (alone[current] && (!next || alone[next])) return "separate";
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
        serviceName:match.serviceName,
        serviceNumber:match.service,
        operation:match.operation,
        trainNumber:match.number,
        partnerNumber:match.partner,
        numbers: [match.number,match.partner].sort(),
        phase:phase,
        junction:match.junction,
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
    var splitting = coupling.operation === "split";
    if (/^zh/.test(lang)) {
      if (coupling.phase === "coupled") return "时刻表并结车号 " + pair + "（" + station + "站" + (splitting ? "分离" : "并结") + "）";
      if (coupling.phase === "separate") return "独立编组 " + coupling.trainNumber +
        "（" + station + "站" + (splitting ? "分离后" : "并结前") + "；另一编组 " + coupling.partnerNumber + "）";
      return station + "站" + (splitting ? "分离" : "并结") + "区间；车号 " + pair;
    }
    if (lang === "en") {
      if (coupling.phase === "coupled") return "Scheduled coupled numbers " + pair +
        " (" + station + " " + (splitting ? "split" : "join") + ")";
      if (coupling.phase === "separate") return "Separate portion " + coupling.trainNumber +
        " (" + (splitting ? "after split" : "before joining") + " at " + station +
        "; other portion " + coupling.partnerNumber + ")";
      return station + " " + (splitting ? "split" : "join") + " boundary: " + pair;
    }
    if (lang === "ko") {
      if (coupling.phase === "coupled") return "시각표 병결 열차번호 " + pair + " (" + station + "역 " + (splitting ? "분리" : "병결") + ")";
      if (coupling.phase === "separate") return "단독 편성 " + coupling.trainNumber +
        " (" + station + "역 " + (splitting ? "분리 후" : "병결 전") + "; 다른 편성 " + coupling.partnerNumber + ")";
      return station + "역 " + (splitting ? "분리" : "병결") + " 구간: " + pair;
    }
    if (coupling.phase === "coupled") return "時刻表上の併結列車番号 " + pair +
      "（" + station + "駅で" + (splitting ? "分割" : "併合") + "）";
    if (coupling.phase === "separate") return "単独編成 " + coupling.trainNumber +
      "（" + station + "駅" + (splitting ? "分割後" : "併合前") + "・相手 " + coupling.partnerNumber + "）";
    return station + "駅" + (splitting ? "分割" : "併合") + "区間： " + pair;
  }

  root.TrainCoupling = Object.freeze({
    version:"20261103-jr-coupling-v2",
    sourceUrl:SOURCE, sourceOutboundUrl:SOURCE_OUTBOUND,
    lookup:numberMatch, phaseOf:phaseOf, prepare:prepare, label:label
  });
})(window);
