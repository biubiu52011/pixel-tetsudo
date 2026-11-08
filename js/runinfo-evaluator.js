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


  // Source text is an event timeline, not an unordered keyword bag.
  // Only currently active clauses may promote the live line-level status.
  function analyzeOperationalText(raw) {
    var text=textOf(raw).trim(), events=[], evidence=[], threshold=null;
    if(!text)return {status:"unknown",events:events,evidence:evidence,delayUpperBoundMinutes:null};
    var th=text.match(/([０-９0-9]{1,3})\s*分以上(?:の)?(?:遅延|遅れ)[^。\n]{0,45}(?:ありません|ございません|なし)/);
    if(th){threshold=Number(th[1].replace(/[０-９]/g,function(c){return String(c.charCodeAt(0)-0xff10);}));
      evidence.push({type:"DELAY_THRESHOLD_NEGATIVE",minutes:threshold});}
    var sentences=text.replace(/が[、，]/g,"。\n").replace(/(再開し)[、，](?=\s*(?:現在|ただいま|一部))/g,"$1。\n").split(/[。\n；;]/).map(function(x){return x.trim();}).filter(Boolean);
    function parseScope(sentence){
      var ranges=[], re=/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9々ヶー]{1,14})(?:駅)?\s*[〜～－−-]\s*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9々ヶー]{1,14})駅(?:間)?/gu;
      var m;
      while((m=re.exec(sentence)))ranges.push({start:m.index,end:re.lastIndex,from:m[1].replace(/駅$/,""),to:m[2],interval:m[1].replace(/駅$/,"")+"→"+m[2],incident:false,direction:null});
      ranges.forEach(function(r,i){
        var after=sentence.slice(r.end,i+1<ranges.length?ranges[i+1].start:undefined);
        r.incident=/^(?:での|における|で発生|で起きた)/.test(after)&&/(?:影響|原因|ため)/.test(after.slice(0,65));
        r.direction=/内回り/.test(after)?"inner":/外回り/.test(after)?"outer":
          /上下線|上下両線/.test(after)?"both":
          /上り線|上り列車|上り方面/.test(after)?"up":
          /下り線|下り列車|下り方面/.test(after)?"down":null;
      });
      return ranges;
    }
    function typeOf(s) {
      var policy=/(?:遅れ|遅延|運休|見合わせ)[^。]{0,80}(?:場合|とき|際)[^。]{0,80}(?:お知らせ|ご案内|掲載)|(?:場合|とき|際)[^。]{0,80}(?:遅れ|遅延|運休|見合わせ)[^。]{0,80}(?:お知らせ|ご案内|掲載)/.test(s)&&
        !/(?:現在|見合わせています|遅れが出ています|運休が出ています)/.test(s);
      if(policy)return {phase:"policy",effect:null};
      // Japanese -ます is not evidence of a future start: 「終日運転を見合わせます」
      // and 「11月10日まで見合わせます」 describe an ongoing interruption.
      var currentClaim=/(?:現在|ただいま|本日|今日|終日|当面の間|復旧まで|見合わせています|見合わせております|遅れが出ています|遅れがでています|運休しています|運休が出ています|運休がでています)/.test(s)||
        /(?:[０-９0-9]{1,2}月[０-９0-9]{1,2}日|明日|来週)[^。]{0,18}まで/.test(s);
      var futureClaim=/(?:明日|翌日|来週|来月|後日|次回|今後|再開後|予定|見込|見込み|可能性|運転計画|実施予定)/.test(s)||
        /[０-９0-9]{1,2}月[０-９0-9]{1,2}日から/.test(s);
      var planned=futureClaim&&!currentClaim;
      var historic=/(?:見合わせていました|見合わせておりました|運休していました|遅れが出ていました|遅れていました|運転を中止していました|見合わせました|平常(?:通り|どおり|運転)でした|通常(?:通り|どおり|運転)していました)/.test(s);
      var resumed=/(?:運転(?:を)?再開|運行(?:を)?再開)(?:しました|しています|しております|済み|した|し$)|平常運転に戻りました/.test(s);
      var negative=/(?:運転見合わせ|運休|遅れ|遅延)[^。]{0,12}(?:ありません|ございません|なし|発生していません|出ていません)/.test(s);
      var normal=/平常(?:通り|どおり|運転|運行)|通常(?:通り|どおり|運転|運行)|正常(?:運転|運行)/.test(s);
      var through=/直通(?:運転|運行)[^。]{0,50}(?:中止|取りやめ|見合わせ)|(?:中止|取りやめ|見合わせ)[^。]{0,50}直通(?:運転|運行)/.test(s);
      var partial=/(?:一部(?:の)?(?:列車|電車)[^。]{0,70}(?:運休|取りやめ|見合わせ)|一部運休|(?:運休|取りやめ)[^。]{0,50}一部(?:の)?(?:列車|電車)|(?:運休|取りやめ)が(?:出て|でて|発生))/.test(s);
      var suspended=/運転(?:を)?(?:見合わせ|中止)|運行(?:を)?(?:見合わせ|中止)|運転見合わせ|全線(?:で|にわたり|の全列車)[^。]{0,50}運休|全(?:ての|て)?列車[^。]{0,30}運休|区間運休(?:中|しています|しております)|[〜～－−-][^。]{0,45}駅間(?:は|で|の上下線で)[^。]{0,15}運休/.test(s);
      var delayed=/遅れ|遅延|ダイヤ乱れ|ダイヤ(?:が|は|の)?乱れ/.test(s);
      var reduction=/(?:通常の\s*[０-９0-9]+(?:\s*[～〜－−-]\s*[０-９0-9]+)?割程度|運転本数[^。]{0,35}(?:減少|少な)|本数を減らして|減便|間引き運転)/.test(s);
      var change=/折返し運転|折り返し運転|行先変更|行き先変更|運転区間(?:を|の)?変更|列車本数[^。]*減ら/.test(s);
      if(resumed)return {phase:planned?"planned":"resolved",effect:"resumed"};
      if(historic)return {phase:"historical",effect:suspended?"suspension":normal?"normal":"info"};
      if(negative)return {phase:"current",effect:normal?"normal":"negative"};
      var effect=(suspended&&!through&&!/(?:一部(?:の)?(?:列車|電車))[^。]{0,45}見合わせ/.test(s))?"suspension":
        partial?"partial_cancellation":delayed?"delay":reduction||change?"service_change":through?"through_suspension":normal?"normal":null;
      if(!effect&&planned&&/(?:運休|見合わせ|工事|減便|運行変更)/.test(s))effect=/(?:運休|見合わせ)/.test(s)?"partial_cancellation":"service_change";
      return {phase:planned?"planned":"current",effect:effect};
    }
    sentences.forEach(function(s){
      var p=typeOf(s);if(p.phase==="policy"){evidence.push({type:"PUBLICATION_POLICY"});return;}
      if(!p.effect)return;
      var scopes=parseScope(s),impact=scopes.filter(function(x){return !x.incident;}),incident=scopes.filter(function(x){return x.incident;});
      var wholeDirection=/上下線|上下両線/.test(s)?"both":/内回り/.test(s)?"inner":/外回り/.test(s)?"outer":/上り線|上り列車/.test(s)?"up":/下り線|下り列車/.test(s)?"down":null;
      (impact.length?impact:[{interval:/全線/.test(s)?"全線":null,direction:wholeDirection}]).forEach(function(x){
        events.push({effect:p.effect,phase:p.phase,interval:x.interval,direction:x.direction||wholeDirection,
          incidentLocation:incident.map(function(i){return i.interval;}).join("、")||null});
      });
      evidence.push({type:"EVENT_"+p.phase.toUpperCase()+"_"+p.effect.toUpperCase()});
    });
    var live=events.filter(function(e){return e.phase==="current";}),has=function(v){return live.some(function(e){return e.effect===v;});};
    var status=has("suspension")?"suspended":has("delay")||has("partial_cancellation")||has("service_change")?"delayed":
      has("through_suspension")?"notice":has("normal")?"normal":has("negative")?"info":
      events.some(function(e){return e.phase==="resolved";})?"info":
      events.some(function(e){return e.phase==="planned";})?"notice":"info";
    if(evidence.some(function(e){return e.type==="PUBLICATION_POLICY";})&&!events.length)status="unknown";
    // A current official "no delays >= N minutes" statement is positive
    // evidence that the line is within the *operator's reporting threshold*.
    // It is not proof of zero delay, so preserve the numeric qualification.
    // Never replace a concurrent suspension, service change or delay.
    if(threshold!=null&&has("negative")&&live.every(function(e){
      return e.effect==="negative"||e.effect==="normal";
    })){
      status="normal";
      evidence.push({type:"OFFICIAL_DELAY_THRESHOLD_CLEAR",minutes:threshold});
    }
    return {status:status,events:events,evidence:evidence,delayUpperBoundMinutes:threshold};
  }

  function evaluateText(text) {
    var a=analyzeOperationalText(text);
    return {status:a.status,evidence:a.evidence,delayUpperBoundMinutes:a.delayUpperBoundMinutes,events:a.events};
  }

  function normalizeRange(v) {
    var s = textOf(v).trim();
    return s ? s.replace(/間(?=\s*(?:[〜～－−→]|$))/g, "").replace(/[〜～－−]/g, "→") : null;
  }

  function extractMetadata(input) {
    input=input||{};
    var text=textOf(input.text||input.statusText||"").trim();
    var analysis=analyzeOperationalText(text);
    var interval=normalizeRange(input.range);
    if(!interval){
      var from=textOf(input.stationFromName).trim(),to=textOf(input.stationToName).trim();
      if(from&&to)interval=from+"→"+to;
      else if(from&&input.alertScope==="line")interval=from+"方面";
    }
    var lineStations=Array.isArray(input.lineStations)?input.lineStations.map(function(x){return textOf(x).trim().replace(/駅$/,"");}):null;
    function belongs(r){
      if(!r||r==="全線"||!lineStations||!lineStations.length)return true;
      var p=r.split("→");return p.length===2&&p.every(function(x){
        var n=x.replace(/駅$/,"");
        if(lineStations.indexOf(n)>=0)return true;
        var id=typeof input.resolveStationId==="function"?input.resolveStationId(n):null;
        return id!=null&&lineStations.indexOf(id)>=0;
      });
    }
    var events=analysis.events.map(function(x){return Object.assign({},x,{interval:belongs(x.interval)?x.interval:null});});
    var live=events.filter(function(e){return e.phase==="current"&&e.effect!=="normal"&&e.effect!=="negative";});
    if(!live.length)live=events.filter(function(e){return e.phase==="current";});
    var candidates=live.length?live:events.filter(function(e){return e.phase==="planned";});
    var rank={suspension:5,delay:4,partial_cancellation:4,service_change:4,through_suspension:3,normal:1};
    candidates.sort(function(a,b){return (rank[b.effect]||0)-(rank[a.effect]||0);});
    var uniq=function(a){return a.filter(function(v,i){return a.indexOf(v)===i;});};
    var places=uniq(candidates.map(function(e){return e.interval;}).filter(Boolean));
    var chosen=candidates[0];
    interval=interval||places.join("、")||null;
    var delayMatches=text.match(/(?:約|およそ)?\s*[０-９0-9]{1,3}\s*(?:分間|分|min)(?!頃|後|以)/gi)||[];
    var service=text.match(/通常の\s*([０-９0-9]+)(?:\s*[～〜－−-]\s*([０-９0-9]+))?\s*割程度/);
    function n(x){return Number(String(x).replace(/[０-９]/g,function(c){return String(c.charCodeAt(0)-0xff10);}));}
    var textDelayMinutes=delayMatches.length?Math.max.apply(null,delayMatches.map(function(v){
      return n((v.match(/[０-９0-9]{1,3}/)||[])[0]);
    })):null;
    var resume=null,sourceTime=textOf(input.resumeEstimate),match=sourceTime.match(/(\d{1,2}):(\d{2})/);
    var estimateSentence=text.split(/[。\n]/).filter(function(v){
      return /再開/.test(v)&&/(?:見込|予定|見通し)/.test(v);
    })[0]||"";
    var clock=sourceTime.match(/([０-９0-9]{1,2})時(?:([０-９0-9]{1,2})分)?/) ||
      estimateSentence.match(/([０-９0-9]{1,2})時(?:([０-９0-9]{1,2})分)?/);
    if(!match&&clock)match=[clock[0],String(n(clock[1])),String(n(clock[2]||"0"))];
    if(match&&n(match[1])<=29&&n(match[2])<=59)
      resume=String(n(match[1])).padStart(2,"0")+":"+String(n(match[2])).padStart(2,"0")+"頃";
    return {
      interval:interval,direction:chosen&&chosen.direction||null,effect:chosen&&chosen.effect||null,
      impacts:events.filter(function(e){return e.effect!=="negative";}).map(function(e){
        return {interval:e.interval,direction:e.direction,effect:e.effect,phase:e.phase};
      }),events:events,incidentLocation:uniq(events.map(function(e){return e.incidentLocation;}).filter(Boolean)).join("、")||null,
      cause:normalizeCause(input.cause)||extractCauseFromText(text),resume:resume,
      detail:text||null,textDelayMinutes:textDelayMinutes,
      serviceLevel:service?{minPercent:n(service[1])*10,maxPercent:n(service[2]||service[1])*10}:null
    };
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
    if (result.status === "notice") return "!";
    if (result.messageKind === "notice") return "!";
    if (result.messageKind !== "realtime") return null;
    if (result.status === "normal") return "○";
    if (result.status === "info") return "!";
    if (result.status === "delayed") return "△";
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

    // GTFS effect codes 4/5/6/7/9 describe changed service rather than
    // a whole-line delay or suspension. Keep them visible as notices.
    var gtfsEffect = Number(input.gtfsEffectCode) || 0;
    if (!structured && (gtfsEffect === 4 || gtfsEffect === 5 ||
        gtfsEffect === 6 || gtfsEffect === 7 || gtfsEffect === 9)) {
      structured = "notice";
      evidence.push({ type: "GTFS_SERVICE_CHANGE", code: gtfsEffect });
    }
    var te=evaluateText(input.text||input.statusText||"");
    evidence=evidence.concat(te.evidence||[]);
    var metadata=extractMetadata(input);
    // An independent explicit suspension signal wins. A generic ODPT
    // Suspension tag must not turn a textually scoped train cancellation into
    // a whole-line stoppage. Keep actual simultaneous suspensions intact.
    var activeEffects=(metadata.events||[]).filter(function(e){return e.phase==="current";}).map(function(e){return e.effect;});
    if(structured==="suspended"&&input.suspension!==true&&input.signalStatus!=="suspended"&&
      activeEffects.indexOf("partial_cancellation")>=0&&
      activeEffects.every(function(e){return e==="partial_cancellation"||e==="delay";})){
      structured="delayed";
      evidence.push({type:"PARTIAL_CANCELLATION_OVERRIDES_GENERIC_SUSPENSION"});
    }
    // GTFS NO_SERVICE for a trip/stop is not a full-line suspension.
    if((input.alertScope==="trip"||input.alertScope==="stop")&&structured==="suspended"){
      structured="delayed";evidence.push({type:"GTFS_PARTIAL_NO_SERVICE",scope:input.alertScope});
    }
    var resolvedStatus=structured||te.status||"unknown";
    if(messageKind==="notice"){resolvedStatus="notice";evidence.push({type:"NOTICE_STATUS_ISOLATION"});}
    var result = {
      messageKind: messageKind,
      noticeClassification: messageKind === "notice" ? classifyNotice(input) : null,
      status: resolvedStatus,
      maxDelay: delayMinutes != null ? delayMinutes : (resolvedStatus === "delayed" || resolvedStatus === "suspended" ? metadata.textDelayMinutes : null),
      delayUpperBoundMinutes: te.delayUpperBoundMinutes,
      interval: metadata.interval,
      direction: metadata.direction,
      effect: metadata.effect,
      impacts: metadata.impacts,
      events: metadata.events,
      incidentLocation: metadata.incidentLocation,
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

  return { extractLinks: extractLinks, version: "1.5.4", classifyNotice: classifyNotice, evaluate: evaluate, evaluateText: evaluateText, extractMetadata: extractMetadata, normalizeStructuredStatus: normalizeStructuredStatus, normalizeMessageKind: normalizeMessageKind, inferMessageKind: inferMessageKind, statusSymbol: statusSymbol };
});
