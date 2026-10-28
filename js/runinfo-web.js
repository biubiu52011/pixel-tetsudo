/*
 * Pixel Tetsudo - Web RunInfo ()
 * 官网运行情报模块：为 ODPT 无运行情报数据的运营商（千葉都市モノレール / 湘南モノレール）
 * 提供运行状况数据源。
 *
 * 渠道事实（已核对）：
 * - ODPT API 对两家均返回空数组（HTTP 200 body=[]，对照组 TamaMonorail 正常）→ ODPT 渠道不存在。
 * - 两家官网首页顶部均有运行情报区块（"運行状況" / "モノレール運行情報"），HTML 为 UTF-8，
 *   正文实测正常；但响应头无 Access-Control-Allow-Origin → 浏览器直连 fetch 被 CORS 拦截。
 * - 公共代理不可靠：r.jina.ai 对两站抓取不稳定（千叶 429 限流）；api.allorigins.win / api.codetabs.com 源站 522。
 * - 湘南官网运行状态信号图（serviceStatusSignBlue/Yellow/Red.png）为固定命名文件 → 可经 <img>
 *   跨域加载（不受 CORS 限制）做零依赖实时状态判定。
 *
 * 数据流（多通道，按可用性自动降级）：
 *   ① 同源代理（本地部署 /proxy?url=… 时启用，可全自动）
 *   ② r.jina.ai 公共阅读代理（静态部署唯一全文通道；千叶 429 限流，失败即降级）
 *   ③ 湘南信号图 <img> 状态检测（实时状态，零 CORS 依赖）
 *   ④ 手动粘贴官网原文（可靠兜底，localStorage 持久化，不自动覆盖）
 *   → getDelayInfo() 供 DataFusion 融合 → realtime 弹窗直接显示官网原文全文
 *
 * 官网直连通道移除——两家官网响应头均无 Access-Control-Allow-Origin，
 *   静态部署下浏览器直连必然被 CORS 拦截；r.jina.ai 为静态部署唯一全文通道
 *
 * 展示规则（遵循用户锁定口径）：
 *   弹窗運行情報区直接显示官网原文全文，不做碎片化关键词解析；
 *   状态映射（正常/延迟/停运/通知）仅作卡片概览与兜底。
 */
(function() {
  "use strict";

  var STORAGE_KEY = "pt_runinfo_web_v1";
  var REFRESH_INTERVAL_MS = 5 * 60 * 1000;   // 自动轮询间隔（5 分钟）
  var FETCH_TIMEOUT_MS = 15000;

  // ========== 网页源运营商配置 ==========
  // site: 官网直链（打开官网/iframe）；block: 首页运行情报区块标题关键词；extraBlock: 附加信息区块
  var SOURCES = {
    "ChibaUrbanMonorail": {
      site: "https://chiba-monorail.co.jp/",
      block: ["\u904b\u884c\u72b6\u6cc1"],                       // 運行状況
      extraBlock: ["\u305d\u306e\u4ed6\u60c5\u5831"]              // その他情報
    },
    "ShonanMonorail": {
      site: "https://www.shonan-monorail.co.jp/",
      block: ["\u30e2\u30ce\u30ec\u30fc\u30eb\u904b\u884c\u60c5\u5831"],  // モノレール運行情報
      signal: {                                                     // 信号图实时状态判定
        normal: "https://www.shonan-monorail.co.jp/common/images/serviceStatusSignBlue.png",
        delayed: "https://www.shonan-monorail.co.jp/common/images/serviceStatusSignYellow.png",
        suspended: "https://www.shonan-monorail.co.jp/common/images/serviceStatusSignRed.png"
      }
    }
  };

  // 线路 → 运营商（网页源）；与 ODPTClient.LINE_TO_OPERATOR 解耦（该表不登记这两家）
  var LINE_TO_OP = {
    "ChibaMonorail1": "ChibaUrbanMonorail",
    "ChibaMonorail2": "ChibaUrbanMonorail",
    "ShonanMonorail": "ShonanMonorail"
  };

  // ========== 内存缓存 ==========
  var _data = null;
  var _loading = {};   // op -> true（防并发抓取）
  var _timer = null;

  function loadCache() {
    if (_data) return _data;
    try {
      var raw = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.v === 1 && parsed.data) _data = parsed.data;
      }
    } catch(e) {}
    if (!_data) _data = {};
    return _data;
  }

  function persist() {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, data: _data }));
      }
    } catch(e) {}
  }

  // ========== 状态映射（仅概览/兜底；原文全量保留在 detail） ==========
  function mapStatus(text) {
    if (!text) return null;
    if (window.RunInfoEvaluator) {
      var result = window.RunInfoEvaluator.evaluate({ source: "official_web", currentOperationalSource: true, text: text });
      // The evaluator intentionally returns info for arbitrary non-empty text.
      // A website block also contains navigation/help copy, so only accept a
      // status when the text carries operational evidence. Otherwise a line
      // such as "お問い合わせ" can become the visible run-info status.
      var evidence = Array.isArray(result.evidence) ? result.evidence : [];
      var operational = evidence.some(function(item) {
        return item && item.type && item.type !== "UNCLASSIFIED_TEXT";
      });
      // "info" also covers page headings and publication-policy copy. A web
      // source may enter the cache only after it exposes a concrete current
      // state (normal/delay/suspension/notice).
      return operational && result.status !== "info" && result.status !== "unknown" ? result.status : null;
    }
    return "info";
  }

  // ========== 编码探测与解码 ==========
  // 官网 HTML 为 UTF-8（实测正文正常）；保留通用探测以兼容其他源。返回 { text, encoding }
  function decodeResponse(buf, contentType) {
    var enc = null;
    try {
      var cm = String(contentType || "").match(/charset=([\w-]+)/i);
      if (cm) enc = cm[1].toLowerCase();
    } catch(e) {}
    if (!enc) {
      try {
        var head = buf.slice(0, 6000).toString("utf8");
        var hm = head.match(/charset=["']?([\w-]+)/i);
        if (hm) enc = hm[1].toLowerCase();
      } catch(e) {}
    }
    // UTF-8 优先（官网实测 UTF-8）；shift_jis 兜底
    var tryList = [];
    if (enc && enc !== "utf-8" && enc !== "utf8") tryList.push(enc);
    tryList.push("utf-8");
    if (enc && enc === "utf-8") tryList.unshift("utf-8");
    tryList.push("shift_jis");
    for (var t = 0; t < tryList.length; t++) {
      try {
        var dec = new TextDecoder(tryList[t]);
        var s = dec.decode(buf);
        var bad = 0;
        for (var j = 0; j < s.length && j < 3000; j++) if (s.charCodeAt(j) === 0xFFFD) bad++;
        if (bad < 30) return { text: s, encoding: tryList[t] };
      } catch(e) {}
    }
    return { text: buf.toString("utf8"), encoding: "utf-8" };
  }

  // ========== 官网 HTML 解析 ==========
  // 输入：正确解码的官网首页文本（HTML 或 r.jina Markdown 均可）。输出：{ statusLine, detail }
  // HTML 形态运行情报常挤在同一行 → 先按块级标签分行；状态行按状态词匹配（非首文本行）；
  // 残留标签/注释行跳过；遇导航标题结束区块。
  function parseSiteText(text, op) {
    var cfg = SOURCES[op];
    if (!cfg || !text) return null;
    var blockTags = /<(\/)?(li|p|div|span|h[1-6]|tr|td|br)[^>]*>/gi;
    var sectionEnd = /お問い合わせ|サイトマップ|採用情報|会社概要|アクセス|リンク|ニュース|お知らせ|よくある質問|個人情報|プライバシー|利用規約|免責事項|求人|採用/;
    var normalized = String(text).replace(blockTags, "\n").replace(/<br\s*\/?>/gi, "\n");
    var lines = normalized.split(/\r?\n/).map(function(l) { return l.trim(); });
    var inBlock = false;
    var collected = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line) continue;
      if (!inBlock) {
        var hit = false;
        for (var b = 0; b < cfg.block.length; b++) {
          if (line.indexOf(cfg.block[b]) >= 0) { hit = true; break; }
        }
        if (hit) { inBlock = true; continue; }
        continue;
      }
      if (sectionEnd.test(line)) { inBlock = false; continue; }
      if (/^!\[/.test(line)) continue;
      // Markdown 链接文本提取 [text](url)
      var textOnly = line;
      var lm = textOnly.match(/^\[([^\]]+)\]\(/);
      if (lm) textOnly = lm[1];
      textOnly = textOnly.replace(/[*_`#]/g, "").trim();
      if (!textOnly) continue;
      // 残留标签/注释/辅助入口跳过
      if (textOnly.indexOf("<") >= 0 || textOnly.indexOf("-->") >= 0) continue;
      if (/遅延証明書|定期券のご案内|団体割引乗車券|信号|アイコン|Image \d+/.test(textOnly)) continue;
      collected.push(textOnly);
    }

    // 状态行 = 第一个含状态词的行（正常/遅延/運休/見合わせ等）；无匹配则用首个文本行兜底
    var statusLine = null;
    var si = -1;
    for (var j = 0; j < collected.length; j++) {
      if (mapStatus(collected[j])) { statusLine = collected[j]; si = j; break; }
    }
    // Do not fall back to the first arbitrary block line: it may be a help,
    // contact, or navigation entry rather than an operating-status claim.
    if (!statusLine) return null;
    var detail = statusLine;
    for (var k = si + 1; k < collected.length; k++) {
      detail += "\n" + collected[k];
    }
    var status = mapStatus(statusLine);
    return { statusLine: statusLine, detail: detail, status: status || "normal", interval: null };
  }

  // ========== HTML 抓取（多通道） ==========
  // 通道 ① 同源代理：若同源本地部署存在 /proxy 端点，则使用（Python 端无 CORS 限制）
  function trySameOriginProxy(op) {
    return new Promise(function(resolve) {
      try {
        var url = encodeURIComponent(SOURCES[op].site);
        fetch("/proxy?url=" + url, { method: "GET" }).then(function(res) {
          if (!res.ok) { resolve(null); return; }
          res.arrayBuffer().then(function(buf) {
            resolve({ ok: true, buf: buf, ct: res.headers.get("content-type") || "" });
          }).catch(function() { resolve(null); });
        }).catch(function() { resolve(null); });
      } catch(e) { resolve(null); }
    });
  }
  // 通道 ② r.jina.ai（对 UTF-8 页面可用；Shift-JIS 页面会乱码——解码后校验，乱码则丢弃）
  function tryJina(op) {
    return new Promise(function(resolve) {
      try {
        var ctrl = null;
        try { ctrl = new AbortController(); } catch(e) {}
        var timer = setTimeout(function() { try { if (ctrl) ctrl.abort(); } catch(e) {} resolve(null); }, FETCH_TIMEOUT_MS);
        var opts = { method: "GET", headers: { "Accept": "text/plain, text/markdown" } };
        if (ctrl) opts.signal = ctrl.signal;
        fetch("https://r.jina.ai/" + SOURCES[op].site, opts).then(function(res) {
          if (!res.ok) { clearTimeout(timer); resolve(null); return; }
          res.arrayBuffer().then(function(buf) {
            clearTimeout(timer);
            // r.jina 文本应可直接 UTF-8 解码；Shift-JIS 源站会乱码 → 交给 parse 校验（找得到区块标题才采用）
            resolve({ ok: true, buf: buf, ct: res.headers.get("content-type") || "" });
          }).catch(function() { clearTimeout(timer); resolve(null); });
        }).catch(function() { clearTimeout(timer); resolve(null); });
      } catch(e) { resolve(null); }
    });
  }

  // 抓取指定运营商并落库；成功返回 delayInfo，失败返回 null（保留旧数据）
  function refresh(op) {
    var cfg = SOURCES[op];
    if (!cfg) return Promise.resolve(null);
    if (_loading[op]) return Promise.resolve(getDelayInfoByOp(op));
    _loading[op] = true;
    return fetchHTML(op).then(function(text) {
      if (!text) return null;
      var parsed = parseSiteText(text, op);
      if (!parsed) return null;
      var data = loadCache();
      data[op] = {
        status: parsed.status,
        interval: parsed.interval,
        cause: parsed.statusLine,
        detail: parsed.detail,
        updatedAt: Date.now(),
        source: "web",
        raw: text
      };
      persist();
      notifyUpdate();
      return data[op];
    }).catch(function(e) {
      console.debug("[WebRunInfo] refresh " + op + " failed:", e && e.message ? e.message : e);
      return null;
    }).then(function(r) {
      _loading[op] = false;
      return r;
    });
  }

  function fetchHTML(op) {
    // 通道顺序：同源代理 → r.jina.ai；首个产出含区块标题的文本即采用
    return trySameOriginProxy(op).then(function(r1) {
      if (r1) {
        var d1 = decodeResponse(r1.buf, r1.ct);
        if (parseSiteText(d1.text, op)) return d1.text;
      }
      return tryJina(op).then(function(r3) {
        if (!r3) return null;
        var d3 = decodeResponse(r3.buf, r3.ct);
        if (parseSiteText(d3.text, op)) return d3.text;
        return null;
      });
    });
  }

  // ========== 湘南信号图状态检测（零 CORS 实时状态） ==========
  // 官网运行状态信号图文件名固定（Blue=正常 / Yellow=遅延 / Red=運転見合わせ），
  // <img> 跨域加载不受 CORS 限制 → 由图片加载成败判定当前状态。
  function detectSignalStatus(op) {
    return new Promise(function(resolve) {
      var cfg = SOURCES[op];
      if (!cfg || !cfg.signal) { resolve(null); return; }
      var map = cfg.signal;
      var keys = Object.keys(map);
      var checked = 0, result = null;
      keys.forEach(function(k) {
        var img = new Image();
        img.onload = function() { result = k; };
        img.onerror = function() {};
        img.onload = img.onerror = function() {
          checked++;
          if (checked === keys.length) resolve(result);
        };
        img.src = map[k];
      });
      setTimeout(function() { resolve(result); }, 4000);
    });
  }

  // ========== 手动输入（可靠兜底，不自动覆盖） ==========
  function setManual(op, text) {
    if (!SOURCES[op] || !text) return null;
    var parsed = parseSiteText(text, op);
    if (!parsed) return null;
    var data = loadCache();
    data[op] = {
      status: (parsed && parsed.status) || "normal",
      interval: parsed ? parsed.interval : null,
      cause: (parsed && parsed.statusLine) || String(text).split(/\r?\n/)[0] || "",
      detail: parsed ? parsed.detail : String(text).trim(),
      updatedAt: Date.now(),
      source: "manual",
      raw: String(text)
    };
    persist();
    notifyUpdate();
    return data[op];
  }

  function clear(op) {
    var data = loadCache();
    if (data[op]) { delete data[op]; persist(); notifyUpdate(); }
  }

  function getDelayInfoByOp(op) {
    var data = loadCache();
    var d = data[op];
    if (!d) return null;
    return {
      status: d.status,
      interval: d.interval,
      cause: d.cause,
      detail: d.detail,
      updatedAt: d.updatedAt,
      source: d.source
    };
  }

  // 供 DataFusion 调用：线路 → delayInfo（仅网页源线路）
  function getDelayInfo(lineId, line) {
    var op = (line && line.operator) || LINE_TO_OP[lineId] || null;
    if (!op || !SOURCES[op]) return null;
    var info = getDelayInfoByOp(op);
    if (info) return info;
    // 网页源线路、尚无数据：不显示 no_odpt，改为 no_data（抓取失败/未开始）
    return { status: "no_data", interval: null, cause: null, detail: null, updatedAt: null, source: null };
  }

  function isWebLine(lineId) {
    return !!LINE_TO_OP[lineId];
  }
  function getOperatorForLine(lineId) {
    return LINE_TO_OP[lineId] || null;
  }
  function getSiteUrl(op) {
    return (SOURCES[op] && SOURCES[op].site) || null;
  }
  function getInfo(op) {
    return getDelayInfoByOp(op);
  }

  // ========== 轮询（后台暂停/前台恢复，与 DataFusion 相同模式） ==========
  var _visibilityBound = false;
  function startPolling() {
    if (!_visibilityBound) {
      _visibilityBound = true;
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          if (_timer) { clearInterval(_timer); _timer = null; }
        } else {
          refreshAllIfStale();
          startPolling();
        }
      });
    }
    if (_timer || document.hidden) return;
    _timer = setInterval(function() {
      try { refreshAllIfStale(); } catch(e) {}
    }, REFRESH_INTERVAL_MS);
  }

  function refreshAllIfStale() {
    var now = Date.now();
    Object.keys(SOURCES).forEach(function(op) {
      var data = loadCache();
      var d = data[op];
      if (d && d.source === "manual") return;
      if (d && (now - d.updatedAt) < REFRESH_INTERVAL_MS) return;
      refresh(op);
      // 湘南：信号图状态兜底（与 HTML 抓取并行；HTML 成功则覆盖，失败则用信号图）
      if (SOURCES[op].signal) {
        detectSignalStatus(op).then(function(k) {
          if (!k) return;
          var data2 = loadCache();
          var existing = data2[op];
          // 仅当尚无 web 数据（或 web 抓取失败）且无 manual 数据时采用
          if (existing && existing.source === "manual") return;
          if (existing && existing.source === "web" && (now - existing.updatedAt) < REFRESH_INTERVAL_MS) return;
          if (!existing || existing.source !== "web") {
            data2[op] = {
              status: k === "normal" ? "normal" : (k === "delayed" ? "delayed" : "suspended"),
              interval: null,
              cause: k === "normal" ? "現在、平常通り運行しております。" : (k === "delayed" ? "遅延が発生しています。" : "運転を見合わせています。"),
              detail: k === "normal" ? "現在、平常通り運行しております。（湘南モノレール公式サイトの運行状況信号より）" : "",
              updatedAt: Date.now(),
              source: "web",
              raw: ""
            };
            persist();
            notifyUpdate();
          }
        });
      }
    });
  }

  function notifyUpdate() {
    try {
      window.dispatchEvent(new CustomEvent("pt-runinfo-updated", { detail: {} }));
    } catch(e) {}
  }

  // ========== 对外 API ==========
  window.WebRunInfo = {
    getDelayInfo: getDelayInfo,
    refresh: refresh,
    refreshAllIfStale: refreshAllIfStale,
    setManual: setManual,
    clear: clear,
    isWebLine: isWebLine,
    getOperatorForLine: getOperatorForLine,
    getSiteUrl: getSiteUrl,
    getInfo: getInfo,
    detectSignalStatus: detectSignalStatus,
    startPolling: startPolling,
    SOURCES: SOURCES
  };

  // 页面加载即启动轮询；首次立即刷新一次（有缓存则按过期判断）
  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() {
        try { window.WebRunInfo.refreshAllIfStale(); window.WebRunInfo.startPolling(); } catch(e) {}
      });
    } else {
      window.WebRunInfo.refreshAllIfStale();
      window.WebRunInfo.startPolling();
    }
  } catch(e) {}
})();
