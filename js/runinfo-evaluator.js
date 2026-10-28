/*
 * Pixel Tetsudo - RunInfo Evaluator
 * Source-neutral operational-status evidence evaluator.
 * Structured official signals win; text-only sources are interpreted conservatively.
 */
(function(root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RunInfoEvaluator = api;
})(typeof window !== "undefined" ? window : null, function() {
  "use strict";

  var RANK = { unknown: 0, normal: 1, info: 2, notice: 3, delayed: 4, suspended: 5 };

  function textOf(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") return String(v.ja || v["ja-Hrkt"] || v.en || v["zh-Hans"] || v["zh-Hant"] || v.ko || "");
    return String(v);
  }

  // GTFS alert causes are sometimes adapted by an upstream client before
  // they reach the evaluator. Normalize the standard labels back to the
  // Japanese source vocabulary so the same cause/translation path is used
  // for ODPT and GTFS records.
  var CAUSE_ALIASES = {
    "未知原因": "原因不明",
    "其他原因": "その他の原因",
    "设备故障": "設備故障",
    "罢工": "ストライキ",
    "示威活动": "デモ",
    "事故": "事故",
    "假日": "休日",
    "天气": "天候",
    "维修": "保守",
    "工程": "工事",
    "警察活动": "警察活動",
    "医疗急救": "医療緊急事態"
  };

  function normalizeCause(v) {
    var s = textOf(v).replace(/^\s+|\s+$/g, "");
    if (!s) return null;
    s = s.replace(/^[のノ]+/, "");
    return CAUSE_ALIASES[s] || s;
  }

  function extractCauseFromText(text) {
    var s = textOf(text).replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    if (!s) return null;
    // Keep the last comma-delimited clause before the causal connector. This
    // removes a leading line subject such as "京浜東北線は、" while retaining
    // useful context such as "東京メトロ線内での".
    var marker = /(の影響により|の影響で|の影響|(?:の)?ため|により|による|が原因(?:で)?|の発生(?:に伴い)?|に伴い)/g;
    var match;
    while ((match = marker.exec(s))) {
      var prefix = s.slice(0, match.index);
      var parts = prefix.split(/[、，,]/);
      var candidate = parts[parts.length - 1].trim();
      candidate = candidate.replace(/^発生(?:した|し)/, "").replace(/(?:が発生した|が発生し)$/, "");
      // In messages such as "荻窪〜西荻窪駅間での架線に支障物の影響で",
      // the affected station range is a scope, not part of the cause.
      candidate = candidate.replace(/^.*?[〜～－−-][^、，,。]*?駅間での/, "");
      if (candidate) return normalizeCause(candidate);
    }
    return null;
  }

  function normalizeStructuredStatus(v) {
    var s = textOf(v);
    if (!s) return null;
    var tail = s.split(":").pop();
    if (/^(?:Normal|normal)$/i.test(tail)) return "normal";
    if (/^(?:Delay|Delayed|delay)$/i.test(tail)) return "delayed";
    if (/^(?:Suspension|Suspended|suspension)$/i.test(tail)) return "suspended";
    return null;
  }

  function evaluateText(text) {
    var s = textOf(text).replace(/\s+/g, " ").trim();
    var evidence = [];
    if (!s) return { status: "unknown", evidence: evidence, delayUpperBoundMinutes: null };

    var threshold = s.match(/([０-９0-9]{1,3})\s*分以上(?:の)?(?:遅延|遅れ)[^。\n]*(?:ありません|ございません|なし)/);
    if (threshold) {
      var n = parseInt(threshold[1].replace(/[０-９]/g, function(c){ return String(c.charCodeAt(0)-0xFF10); }), 10);
      evidence.push({ type: "DELAY_THRESHOLD_NEGATIVE", minutes: n });
      return { status: "normal", evidence: evidence, delayUpperBoundMinutes: isNaN(n) ? null : n };
    }

    if (/平常(?:通り|どおり|運転|運行)|通常(?:運転|運行)|正常(?:運転|運行)|遅延(?:は)?ありません|遅延なし/.test(s)) {
      evidence.push({ type: "EXPLICIT_NORMAL" });
      return { status: "normal", evidence: evidence, delayUpperBoundMinutes: null };
    }

    // Operator pages often explain their publication threshold in the same
    // block as the live status (for example, “5 minutes or more ... we will
    // announce it”). That sentence is policy, not a current delay.
    if (/(?:遅延|遅れ)[^。\n]*(?:場合|とき|際)[^。\n]*(?:お知らせ|ご案内|掲載|情報)/.test(s) &&
        !/(現在|本日|発生しています|出ています|見込んでいます)/.test(s)) {
      evidence.push({ type: "PUBLICATION_POLICY" });
      return { status: "unknown", evidence: evidence, delayUpperBoundMinutes: null };
    }

    // The same policy copy can enumerate effects (“delay, cancellation,
    // through-service suspension, turnback...”) without describing an active
    // incident. Do not let that enumeration become a live service change.
    if (/運行情報[^。\n]*(?:あります|お知らせ|ご案内)/.test(s) &&
        /(?:運休|直通運転|折返し運転|折り返し運転|行先変更|行き先変更)/.test(s) &&
        !/(現在|本日|発生しています|出ています|実施しています|中止しています)/.test(s)) {
      evidence.push({ type: "PUBLICATION_POLICY" });
      return { status: "unknown", evidence: evidence, delayUpperBoundMinutes: null };
    }

    var through = /直通(?:運転|運行)[^。\n]*(?:中止|取りやめ|見合わせ|運休)|(?:中止|取りやめ|見合わせ)[^。\n]*直通(?:運転|運行)/.test(s);
    if (through) evidence.push({ type: "THROUGH_SERVICE_CANCELLED" });

    var timetable = /ダイヤ(?:が|は)?(?:乱れ|乱れて)|ダイヤ乱れ|時刻表[^。\n]*(?:乱れ|変更)|(?:遅延|遅れ)(?:(?:が|は|も)?(?:発生|出て|生じ|見込|見込み|あり|しています|しております|でています|となっています))/.test(s);
    if (timetable) evidence.push({ type: "TIMETABLE_DISRUPTION" });

    // Official operator cards place turnback, destination changes and
    // reduced frequency in the same △ family as delays.
    var serviceChange = /折返し運転|折り返し運転|行先変更|行き先変更|運転本数[^。\n]*(?:減|少)|本数を減らして/.test(s);
    if (serviceChange) evidence.push({ type: "SERVICE_CHANGE" });

    var partial = /一部(?:の)?(?:列車|電車|区間)?[^。\n]*(?:運休|運転見合わせ|運転を見合わせ|運転中止|取りやめ)|一部列車[^。\n]*区間運休|区間運休/.test(s);
    var reducedService = /通常の[０-９0-9]+割程度[^。\n]*運転|列車本数[^。\n]*(?:少な|減少)|本数を減らして[^。\n]*運転/.test(s);
    if (reducedService) evidence.push({ type: "REDUCED_SERVICE" });
    if (partial) evidence.push({ type: "PARTIAL_SERVICE_IMPACT" });

    var whole = /全線[^。\n]*(?:運休|運転見合わせ|運転を見合わせ|運転中止|運転を中止|取りやめ)|全列車[^。\n]*(?:運休|取りやめ|運転を見合わせ)/.test(s);
    if (whole) evidence.push({ type: "WHOLE_LINE_SUSPENSION" });

    var explicitRangeSuspension = /[^。\n]{1,40}駅\s*[～〜－−-]\s*[^。\n]{1,40}駅(?:間)?[^。\n]*(?:運転見合わせ|運転を見合わせ|運休|運転中止)/.test(s);
    if (explicitRangeSuspension) evidence.push({ type: "RANGE_SUSPENSION" });

    // A past suspension followed by a resumption and current delay/cancellation
    // is no longer a suspended state. The latest operating clause wins.
    var resumedWithCurrentDisruption = /(?:運転(?:を)?再開|運転再開)[^。\n]*(?:遅れ|遅延|運休|ダイヤ(?:が|は)?(?:乱れ|乱れて)|折返し運転|折り返し運転|行先変更|行き先変更)/.test(s);
    if (resumedWithCurrentDisruption) evidence.push({ type: "RESUMED_WITH_CURRENT_DISRUPTION" });
    if (resumedWithCurrentDisruption) return { status: "delayed", evidence: evidence, delayUpperBoundMinutes: null };

    var currentCancellation = /(?:運休|運転を?取りやめ)(?:しています|しております|となっています|が出ています|中)/.test(s);
    if (currentCancellation) evidence.push({ type: "CURRENT_CANCELLATION" });

    var directionalSuspension = /(?:上り線|下り線|内回り|外回り)[^。\n]*(?:運転見合わせ|運転を見合わせ|運転中止|運転を中止|運休)/.test(s);
    if (directionalSuspension) evidence.push({ type: "DIRECTIONAL_SUSPENSION" });
    // Any confirmed suspension is rendered as ×, including a station range,
    // one direction, or a partial train cancellation. The affected scope is
    // still preserved separately in interval/direction/impacts.
    if (whole || explicitRangeSuspension || directionalSuspension || partial || currentCancellation) {
      return { status: "suspended", evidence: evidence, delayUpperBoundMinutes: null };
    }
    if (timetable || serviceChange) return { status: "delayed", evidence: evidence, delayUpperBoundMinutes: null };
    if (through) return { status: "notice", evidence: evidence, delayUpperBoundMinutes: null };
    if (reducedService) return { status: "notice", evidence: evidence, delayUpperBoundMinutes: null };

    // A bare keyword is not enough to upgrade the whole line.
    if (/運休|見合わせ|中止|運行情報|運転情報/.test(s)) {
      evidence.push({ type: "UNSCOPED_OPERATIONAL_INFO" });
      return { status: "info", evidence: evidence, delayUpperBoundMinutes: null };
    }
    return { status: "info", evidence: [{ type: "UNCLASSIFIED_TEXT" }], delayUpperBoundMinutes: null };
  }

  function normalizeRange(v) {
    var s = textOf(v).trim();
    return s ? s.replace(/間(?=\s*(?:[〜～－−→]|$))/g, "").replace(/[〜～－−]/g, "→") : null;
  }

  function extractMetadata(input) {
    input = input || {};
    var text = textOf(input.text || "");
    var cause = normalizeCause(input.cause);
    var interval = normalizeRange(input.range);
    if (!interval) {
      var from = textOf(input.stationFromName).trim();
      var to = textOf(input.stationToName).trim();
      if (from && to) interval = from + "→" + to;
      else if (from) interval = from + "方面";
      else if (to) interval = to + "方面";
    }
    // A cause on another railway must never become this line's affected interval.
    // Optional canonical station membership is a second, independent safeguard.
    var lineStations = Array.isArray(input.lineStations) ? input.lineStations.map(function(v) {
      return textOf(v).trim().replace(/駅$/, "");
    }) : null;
    function belongsToLine(range) {
      if (!range || range === "全線" || !lineStations || !lineStations.length) return true;
      var ends = range.split("→");
      return ends.length !== 2 || ends.every(function(v) {
        var name = v.trim().replace(/駅$/, "");
        if (lineStations.indexOf(name) !== -1) return true;
        if (typeof input.resolveStationId !== "function") return false;
        var resolved = input.resolveStationId(name);
        return !!resolved && lineStations.indexOf(resolved) !== -1;
      });
    }
    // Cause phrases alone do not establish foreign-line identity: a local
    // station range can also be followed by "設備点検の影響で".
    // Text-only official messages often carry the affected station range
    // without structured stationFrom/stationTo fields.
    if (!interval && text) {
      var rangeRe = /([^。\n、，,]{1,30}?駅)\s*[～〜－−-]\s*([^。\n、，,]{1,30}?駅)(?:間)?/g;
      var ranges = [];
      var rangeMatch;
      while ((rangeMatch = rangeRe.exec(text))) {
        var left = rangeMatch[1].trim().replace(/^[・･]+/, "");
        ranges.push(left + "→" + rangeMatch[2].trim());
      }
      if (!ranges.length) {
        var omittedStationRe = /([^。\n、，,]{1,30}?)\s*[～〜－−-]\s*([^。\n、，,]{1,30}?駅)(?:間)?/g;
        while ((rangeMatch = omittedStationRe.exec(text))) {
          var leftOmitted = rangeMatch[1].trim().replace(/^[・･]+/, "");
          ranges.push(leftOmitted + "→" + rangeMatch[2].trim());
        }
      }
      if (!ranges.length) {
        var fromToRe = /([^。\n、，,]{1,30}?駅)\s*から\s*([^。\n、，,]{1,30}?駅)\s*まで/g;
        while ((rangeMatch = fromToRe.exec(text))) ranges.push(rangeMatch[1].trim() + "→" + rangeMatch[2].trim());
      }
      if (ranges.length) interval = ranges.filter(belongsToLine).join("、") || null;
      if (!interval && /全線/.test(text)) interval = "全線";
    }
    var direction = null;
    if (/内回り/.test(text)) direction = "inner";
    else if (/外回り/.test(text)) direction = "outer";
    else if (/上下線|上下両線|両方向/.test(text)) direction = "both";
    else if (/上り線|上り列車|上り方面/.test(text)) direction = "up";
    else if (/下り線|下り列車|下り方面/.test(text)) direction = "down";

    var resumedWithCurrentDisruption = /(?:運転(?:を)?再開|運転再開)[^。\n]*(?:遅れ|遅延|運休|ダイヤ(?:が|は)?(?:乱れ|乱れて)|折返し運転|折り返し運転|行先変更|行き先変更)/.test(text);
    var effect = null;
    if (resumedWithCurrentDisruption) effect = "delay";
    else if (/直通(?:運転|運行)[^。\n]*(?:中止|取りやめ|見合わせ)|(?:中止|取りやめ|見合わせ)[^。\n]*直通(?:運転|運行)/.test(text)) effect = "through_suspension";
    else if (/運転見合わせ|運転を見合わせ|運転中止|運転を中止/.test(text)) effect = "suspension";
    else if (/区間運休|一部(?:の)?(?:列車|電車)?[^。\n]*運休/.test(text)) effect = "partial_cancellation";
    else if (/ダイヤ(?:が|は)?(?:乱れ|乱れて)|ダイヤ乱れ|(?:遅延|遅れ)(?:(?:が|は|も)?(?:発生|出て|生じ|見込|見込み|あり|しています|しております|でています|となっています))/.test(text)) effect = "delay";
    else if (/折返し運転|折り返し運転|行先変更|行き先変更|運転本数[^。\n]*(?:減|少)|本数を減らして/.test(text)) effect = "service_change";
    else if (/平常(?:通り|どおり|運転|運行)|通常(?:運転|運行)|正常(?:運転|運行)/.test(text)) effect = "normal";

    function directionOf(fragment) {
      if (/内回り/.test(fragment)) return "inner";
      if (/外回り/.test(fragment)) return "outer";
      if (/上下線|上下両線|両方向/.test(fragment)) return "both";
      if (/上り線|上り列車|上り方面/.test(fragment)) return "up";
      if (/下り線|下り列車|下り方面/.test(fragment)) return "down";
      return null;
    }
    function effectOf(fragment) {
      if (/直通(?:運転|運行)[^。\n]*(?:中止|取りやめ|見合わせ)|(?:中止|取りやめ|見合わせ)[^。\n]*直通(?:運転|運行)/.test(fragment)) return "through_suspension";
      if (/運転見合わせ|運転を見合わせ|運転中止|運転を中止/.test(fragment)) return "suspension";
      if (/区間運休|一部(?:の)?(?:列車|電車)?[^。\n]*運休/.test(fragment)) return "partial_cancellation";
      if (/ダイヤ(?:が|は)?(?:乱れ|乱れて)|ダイヤ乱れ|(?:遅延|遅れ)(?:(?:が|は|も)?(?:発生|出て|生じ|見込|見込み|あり|しています|しております|でています|となっています))/.test(fragment)) return "delay";
      if (/折返し運転|折り返し運転|行先変更|行き先変更|運転本数[^。\n]*(?:減|少)|本数を減らして/.test(fragment)) return "service_change";
      if (/平常(?:通り|どおり|運転|運行)|通常(?:運転|運行)|正常(?:運転|運行)/.test(fragment)) return "normal";
      return null;
    }
    function intervalOf(fragment) {
      var ir = fragment.match(/([^。\n、，,]{1,30}?駅)\s*[～〜－−-]\s*([^。\n、，,]{1,30}?駅)(?:間)?/);
      if (!ir) ir = fragment.match(/([^。\n、，,]{1,30}?)\s*[～〜－−-]\s*([^。\n、，,]{1,30}?駅)(?:間)?/);
      if (ir) {
        var from = ir[1].trim().replace(/^.*[（(]/, "").replace(/^[・･（(]+/, "");
        var to = ir[2].trim().replace(/[）)]*$/, "");
        return from + "→" + to;
      }
      return /全線/.test(fragment) ? "全線" : null;
    }
    function effectClauses(sentence) {
      var clauses = [];
      var re = /(直通(?:運転|運行)[^。\n]{0,40}?(?:中止|取りやめ|見合わせ)|(?:運転を?見合わせ|運転見合わせ|運転を?中止|区間運休|一部(?:の)?(?:列車|電車)?[^。\n]{0,20}?運休|ダイヤ(?:が|は)?(?:乱れ|乱れて)|ダイヤ乱れ|(?:遅延|遅れ)(?:(?:が|は|も)?(?:発生|出て|生じ|見込|見込み|あり|しています|しております|でています|となっています))|折返し運転|折り返し運転|行先変更|行き先変更|運転本数[^。\n]*(?:減|少)|本数を減らして|平常(?:通り|どおり|運転|運行)|通常(?:運転|運行)|正常(?:運転|運行)))/g;
      var m;
      while ((m = re.exec(sentence))) clauses.push({ index: m.index, effect: effectOf(m[0]) || effectOf(sentence.slice(Math.max(0, m.index - 40), re.lastIndex)) });
      return clauses.filter(function(x){ return !!x.effect; });
    }
    function nearestBefore(items, index) {
      var best = null;
      items.forEach(function(item) {
        if (item.index <= index && (!best || item.index > best.index)) best = item;
      });
      return best;
    }
    var impacts = [];
    var precedingSentenceRange = null;
    text.split(/[。\n；;]/).forEach(function(sentence) {
      sentence = sentence.trim();
      if (!sentence) return;

      var scopes = [];
      var scopeRe = /([^。\n、，,]{1,30}?駅\s*[～〜－−-]\s*[^。\n、，,]{1,30}?駅(?:間)?|[^。\n、，,]{1,30}?\s*[～〜－−-]\s*[^。\n、，,]{1,30}?駅(?:間)?|全線|上下線|上下両線|両方向|上り線|上り列車|上り方面|下り線|下り列車|下り方面|内回り(?:電車)?|外回り(?:電車)?)/g;
      var sm;
      while ((sm = scopeRe.exec(sentence))) {
        var raw = sm[0];
        var scopedInterval = intervalOf(raw);
        // Only canonical membership, not causal wording, excludes a range.
        if (scopedInterval && !belongsToLine(scopedInterval)) scopedInterval = null;
        scopes.push({ index: sm.index, interval: scopedInterval, direction: directionOf(raw) });
      }

      var effects = effectClauses(sentence);
      if (!effects.length) return;
      effects.forEach(function(fx, effectIndex) {
        var preceding = scopes.filter(function(s){ return s.index <= fx.index; });
        var rangeScopes = preceding.filter(function(s){ return !!s.interval; });
        var rangeScope = nearestBefore(rangeScopes, fx.index);
        var directionScope = nearestBefore(preceding.filter(function(s){ return !!s.direction; }), fx.index);
        var previousEffectIndex = effectIndex > 0 ? effects[effectIndex - 1].index : -1;

        // Multiple station ranges listed before one effect share that effect
        // ("A-B間・C-D間で運転見合わせ"). Only ranges introduced after the
        // previous effect belong to the current clause; this prevents a later
        // delay clause from inheriting every earlier range.
        var clauseRanges = rangeScopes.filter(function(s){ return s.index > previousEffectIndex; });
        if (clauseRanges.length > 1) {
          clauseRanges.forEach(function(scope) {
            impacts.push({
              interval: scope.interval,
              direction: directionScope ? directionScope.direction : null,
              effect: fx.effect
            });
          });
          return;
        }

        impacts.push({
          interval: rangeScope ? rangeScope.interval : (!rangeScopes.length && precedingSentenceRange && /^\s*(?:上り線|下り線|上下線|内回り|外回り)(?:では|は|で)/.test(sentence) ? precedingSentenceRange : null),
          direction: directionScope ? directionScope.direction : null,
          effect: fx.effect
        });
      });
      var sentenceRanges = scopes.filter(function(scope){ return !!scope.interval; });
      if (sentenceRanges.length === 1) precedingSentenceRange = sentenceRanges[0].interval;
      else if (sentenceRanges.length > 1 || !/^\s*(?:上り線|下り線|上下線|内回り|外回り)/.test(sentence)) precedingSentenceRange = null;
    });
    // Deduplicate only identical semantic impacts; never merge different effects
    // or directions merely because they occur in the same sentence.
    if (resumedWithCurrentDisruption) {
      impacts = impacts.filter(function(item) {
        return item.effect !== "suspension" && item.effect !== "through_suspension";
      });
    }
    impacts = impacts.filter(function(item, idx, arr) {
      return arr.findIndex(function(other) {
        return other.interval === item.interval && other.direction === item.direction && other.effect === item.effect;
      }) === idx;
    });
    if (!impacts.length && (interval || direction || effect)) impacts.push({ interval: interval, direction: direction, effect: effect });
    var resume = null;
    if (input.resumeEstimate) {
      var resumeRaw = String(input.resumeEstimate);
      var rm = resumeRaw.match(/(\d{2}):(\d{2})/);
      if (rm) resume = rm[1] + ":" + rm[2] + (/頃|およそ|約/.test(resumeRaw) ? "頃" : "");
    }
    if (!resume && text) {
      var fullwidthTime = /(?:運転(?:を)?再開|運転再開)/.test(text)
        ? text.match(/([０-９0-9]{1,2})時([０-９0-9]{1,2})分頃/)
        : text.match(/運転再開(?:見込|見込み|予定)[^。\n]*?([０-９0-9]{1,2})時([０-９0-9]{1,2})分頃/);
      if (fullwidthTime) {
        var hour = parseInt(String(fullwidthTime[1]).replace(/[０-９]/g, function(c) { return String(c.charCodeAt(0) - 0xFF10); }), 10);
        var minute = parseInt(String(fullwidthTime[2]).replace(/[０-９]/g, function(c) { return String(c.charCodeAt(0) - 0xFF10); }), 10);
        if (hour >= 0 && hour <= 29 && minute >= 0 && minute <= 59) {
          resume = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0") + "頃";
        }
      }
    }
    var serviceLevel = null;
    var serviceRange = text.match(/通常の\s*([０-９0-9]+)\s*[～〜－−-]\s*([０-９0-9]+)\s*割程度/);
    var serviceSingle = !serviceRange && text.match(/通常の\s*([０-９0-9]+)\s*割程度/);
    function toAsciiNumber(v) {
      return parseInt(String(v).replace(/[０-９]/g, function(c){ return String(c.charCodeAt(0)-0xFF10); }), 10);
    }
    if (serviceRange) {
      serviceLevel = { minPercent: toAsciiNumber(serviceRange[1]) * 10, maxPercent: toAsciiNumber(serviceRange[2]) * 10 };
    } else if (serviceSingle) {
      var servicePercent = toAsciiNumber(serviceSingle[1]) * 10;
      serviceLevel = { minPercent: servicePercent, maxPercent: servicePercent };
    }
    var textDelayMinutes = null;
    var dm = text.match(/(?:約|およそ)?\s*(\d{1,3})\s*(?:分間|分|min)(?!頃|後|以)/i);
    if (dm) textDelayMinutes = parseInt(dm[1], 10);
    if (!cause && text) cause = extractCauseFromText(text);
    return { interval: interval, direction: direction, effect: effect, impacts: impacts, cause: cause, resume: resume, detail: text || null, textDelayMinutes: textDelayMinutes, serviceLevel: serviceLevel };
  }

  function normalizeMessageKind(v) {
    var s = textOf(v).trim();
    if (!s) return null;
    if (/^(?:notice|announcement|お知らせ|告知|通知|問い合わせ|問合せ|お問合せ)$/i.test(s)) return "notice";
    if (/^(?:realtime|operation|status|運行状況|運行情報|運転状況|運転情報)$/i.test(s)) return "realtime";
    return null;
  }

  function inferMessageKind(input) {
    var explicit = normalizeMessageKind(input.messageKind || input.category || input.messageCategory);
    if (explicit) return explicit;
    // Structured operational signals are current operating-state evidence.
    if (normalizeStructuredStatus(input.structuredStatus) || input.suspension === true || input.delay === true || (typeof input.delayMinutes === "number" && input.delayMinutes > 0)) return "realtime";
    // A caller may assert that the record came from a current official
    // operational-status endpoint. This is source provenance, not text guessing.
    if (input.currentOperationalSource === true) return "realtime";
    // Do not infer notice/realtime from causes or operational-looking prose alone.
    return "unknown";
  }

  // Notice subject is independent of whether it is currently in force.
  // Never turn a planned notice into a live suspension from keywords alone.
  function classifyNotice(input) {
    input = input || {};
    var s = textOf(input.text || input.statusText || "");
    var construction = /集中工事|計画工事|線路工事|設備工事|保守工事|工事に伴う/.test(s);
    var recovery = /復旧工事|災害復旧|土砂崩れ|土砂流入|斜面崩壊|崩落|被災/.test(s);
    var planned = /予定|実施します|実施予定|運休します|運休予定|運転計画|(?:来週|明日|翌日|週末)|(?:[０-９0-9]{1,2}月[０-９0-9]{1,2}日)/.test(s);
    var active = /現在|運休しています|運転を見合わせています|運転見合わせ中|運転を中止しています|当面の間|復旧まで/.test(s);
    var resumed = /運転を再開しました|運転再開済み|平常運転に戻りました/.test(s);
    var subject = recovery ? "disaster_recovery" : construction ? "construction" :
      /台風|大雨|大雪|地震|強風/.test(s) ? "weather" :
      /振替輸送|代行バス|バス代行/.test(s) ? "replacement_transport" : "general";
    var phase = resumed ? "ended_claim" : active ? "active_claim" :
      planned ? "planned" : "undetermined";
    return { subject: subject, phase: phase, currentStatusVerified: false };
  }

  function statusSymbol(result) {
    result = result || {};
    if (result.status === "suspended") return "×";
    if (result.messageKind === "notice") return "!";
    if (result.messageKind !== "realtime") return null;
    if (result.status === "normal") return "○";
    if (result.status === "delayed" || result.status === "notice" || result.status === "info") return "△";
    return null;
  }

  function evaluate(input) {
    input = input || {};
    var evidence = [];
    var messageKind = inferMessageKind(input);
    var structured = normalizeStructuredStatus(input.structuredStatus);
    if (structured) evidence.push({ type: "STRUCTURED_STATUS", value: structured });

    if (input.suspension === true) {
      structured = "suspended";
      evidence.push({ type: "STRUCTURED_SUSPENSION" });
    }

    var delayMinutes = null;
    if (input.delayMinutes != null && input.delayMinutes !== false) {
      var n = parseInt(input.delayMinutes, 10);
      if (!isNaN(n) && n > 0) {
        delayMinutes = n;
        if (structured !== "suspended") structured = "delayed";
        evidence.push({ type: "STRUCTURED_DELAY", minutes: n });
      }
    } else if (input.delay === true) {
      if (structured !== "suspended") structured = "delayed";
      evidence.push({ type: "STRUCTURED_DELAY" });
    }

    // Official non-text signals (e.g. Shonan status image) are authoritative.
    if (input.signalStatus && RANK[input.signalStatus] != null) {
      structured = input.signalStatus;
      evidence.push({ type: "OFFICIAL_SIGNAL", value: input.signalStatus });
    }

    var te = evaluateText(input.text || input.statusText || "");
    evidence = evidence.concat(te.evidence || []);
    var metadata = extractMetadata(input);
    var resumedWithCurrentDisruption = (te.evidence || []).some(function(item) {
      return item && item.type === "RESUMED_WITH_CURRENT_DISRUPTION";
    });
    if (resumedWithCurrentDisruption && structured === "suspended") {
      structured = "delayed";
      evidence.push({ type: "RESUMED_STATUS_OVERRIDES_PAST_SUSPENSION" });
    }
    if (structured === "suspended" && metadata.effect === "through_suspension") {
      structured = "notice";
      evidence.push({ type: "THROUGH_SUSPENSION_IS_NOT_LINE_SUSPENSION" });
    }
    if (messageKind === "realtime" && metadata.impacts && metadata.impacts.length > 1) {
      var hasWholeSuspension = metadata.impacts.some(function(x){ return x.interval === "全線" && x.effect === "suspension"; });
      if (!hasWholeSuspension && structured === "suspended") evidence.push({ type: "MULTI_IMPACT_PARTIAL_OPERATION" });
    }
    // A structured Suspension may describe only a station range, but any
    // confirmed suspension still uses the suspended/× state.
    if (structured === "suspended" && metadata.interval && metadata.interval !== "全線") {
      evidence.push({ type: "STRUCTURED_PARTIAL_SUSPENSION", interval: metadata.interval });
    }

    // A source explicitly categorized as a notice is not current operating
    // state evidence. Preserve parsed impact metadata for display, but never let
    // planned/stale notices promote the line to delayed/suspended downstream.
    var resolvedStatus = structured || te.status || "unknown";
    if (messageKind === "notice") {
      resolvedStatus = "notice";
      evidence.push({ type: "NOTICE_STATUS_ISOLATION" });
    }

    var result = {
      messageKind: messageKind,
      noticeClassification: messageKind === "notice" ? classifyNotice(input) : null,
      status: resolvedStatus,
      maxDelay: delayMinutes != null ? delayMinutes : metadata.textDelayMinutes,
      delayUpperBoundMinutes: te.delayUpperBoundMinutes,
      interval: metadata.interval,
      direction: metadata.direction,
      effect: metadata.effect,
      impacts: metadata.impacts,
      cause: metadata.cause,
      resume: metadata.resume,
      detail: metadata.detail,
      serviceLevel: metadata.serviceLevel,
      evidence: evidence,
      source: input.source || null
    };
    result.symbol = statusSymbol(result);
    return result;
  }

  function extractLinks(text) {
    if (!text) return { cleanText: (text || ""), links: [] };
    var links = [];
    var seen = {};
    var clean = String(text).replace(/\(?\s*(https?:\/\/[^\s\u3000\u3001\u3002\uff08\uff09<>"'\\]+)\s*\)?/g, function(m, u) {
      // 去掉结尾的标点噪声（URL 后紧跟的句号/括号等）
      u = u.replace(/[)）,，。.;；]+$/, "");
      if (u && !seen[u]) { seen[u] = true; links.push(u); }
      return "";
    });
    // 清理提取后残留的空白
    clean = clean.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{2,}/g, "\n").trim();
    return { cleanText: clean, links: links };
  }

  return { extractLinks: extractLinks, version: "1.4.0", classifyNotice: classifyNotice, evaluate: evaluate, evaluateText: evaluateText, extractMetadata: extractMetadata, normalizeStructuredStatus: normalizeStructuredStatus, normalizeMessageKind: normalizeMessageKind, inferMessageKind: inferMessageKind, statusSymbol: statusSymbol };
});
