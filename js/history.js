/**
 * Pixel Tetsudo - 搜索历史模块
 * 在 localStorage 中保存并显示搜索历史
 */
(function() {
  "use strict";

  const STORAGE_KEY = "pixel_tetsudo_search_history";
  const MAX_HISTORY = 50;

  function getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      var parsed = data ? JSON.parse(data) : [];
      if (!parsed) return [];
      var list = Array.isArray(parsed) ? parsed : [parsed];
      list = migrateHistory(list);
      list = dedupHistory(list);
      return list;
    } catch (e) {
      return [];
    }
  }

  // 整理存量：相同 from+to 合并为一条，count 累加。
  // list 约定新条目在前（unshift），遍历时首个遇到的即最新，保留它并把后续同 key 的次数并进来。
  function dedupHistory(list) {
    if (!Array.isArray(list)) return list;
    var map = {};
    var out = [];
    var changed = false;
    list.forEach(function(e) {
      if (!e || !e.from || !e.to) { out.push(e); return; }
      var key = e.from + "||" + e.to;
      if (!map[key]) {
        e.count = e.count || 1;
        map[key] = e;
        out.push(e);
      } else {
        var ex = map[key];
        ex.count = (ex.count || 1) + (e.count || 1);
        if (e.timestamp && (!ex.timestamp || e.timestamp > ex.timestamp)) {
          ex.timestamp = e.timestamp;
          if (e.durationMin) ex.durationMin = e.durationMin;
          if (e.path) ex.path = e.path;
          if (e.lineInfo) ex.lineInfo = e.lineInfo;
        }
        changed = true;
      }
    });
    if (changed) persistHistory(out);
    return out;
  }

  // 旧版本遗留条目可能存了自由文本/罗马字 from/to（无 canonical ID）。
  // 这里统一反查成车站 ID，保证跳转与渲染走同一条 canonical 路径。
  function migrateHistory(list) {
    if (!Array.isArray(list)) return list;
    var resolver = window.StationResolver;
    if (!resolver || !resolver.resolve) return list;
    var changed = false;
    list.forEach(function(e) {
      if (!e) return;
      if (e.from) {
        var r = resolver.resolve(e.from);
        if (r && r.length && r[0].stationId) { e.from = r[0].stationId; changed = true; }
      }
      if (e.to) {
        var r2 = resolver.resolve(e.to);
        if (r2 && r2.length && r2[0].stationId) { e.to = r2[0].stationId; changed = true; }
      }
      // 清理已废弃的冗余字段（fromId/toId/fromName/toName）
      delete e.fromId; delete e.toId; delete e.fromName; delete e.toName;
    });
    if (changed) persistHistory(list);
    return list;
  }

  function persistHistory(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[History] persist failed:', e);
    }
  }

  function saveToHistory(from, to, result) {
    const history = getHistory();
    const now = new Date().toISOString();

    // 相同 from→to 的搜索合并为一条：移到最前、刷新时间/路径/耗时，count+1。
    // 不再每次 unshift 新条目，避免历史里出现一堆一样的记录。
    var existingIdx = -1;
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      if (h && h.from === from && h.to === to) { existingIdx = i; break; }
    }
    if (existingIdx >= 0) {
      var existing = history.splice(existingIdx, 1)[0];
      existing.timestamp = now;
      existing.durationMin = result ? result.durationMin : (existing.durationMin || 0);
      existing.path = result ? result.path : (existing.path || []);
      existing.lineInfo = result ? result.lineInfo : (existing.lineInfo || []);
      existing.count = (existing.count || 1) + 1;
      history.unshift(existing);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (e) {
        console.warn("[History] Failed to save:", e);
      }
      renderHistory();
      return existing;
    }

    const entry = {
      id: Date.now(),
      timestamp: now,
      from: from,
      to: to,
      durationMin: result ? result.durationMin : 0,
      path: result ? result.path : [],
      lineInfo: result ? result.lineInfo : [],
      count: 1
    };
    history.unshift(entry);
    if (history.length > MAX_HISTORY) {
      history.pop();
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("[History] Failed to save:", e);
    }
    renderHistory();
    return entry;
  }

  // Keep one reversible history operation at a time. The toast is outside the
  // list mount so that its button survives renderHistory() replacing the list.
  var _undoTimer = null;
  function historyUxText(key) {
    var lang = window.currentLang || "ja";
    var words = {
      ja: { deleted:"履歴を削除しました", cleared:"履歴を消去しました", undo:"元に戻す" },
      zh: { deleted:"已删除记录", cleared:"已清空历史记录", undo:"撤销" },
      ko: { deleted:"기록을 삭제했습니다", cleared:"기록을 모두 삭제했습니다", undo:"실행 취소" },
      en: { deleted:"History entry deleted", cleared:"History cleared", undo:"Undo" }
    };
    return (words[lang] || words.ja)[key];
  }
  function showHistoryUndo(snapshot, type) {
    if (_undoTimer) clearTimeout(_undoTimer);
    var old = document.getElementById("historyUndoNotice");
    if (old) old.remove();
    var notice = document.createElement("div");
    notice.id = "historyUndoNotice";
    notice.className = "history-undo-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    var message = document.createElement("span");
    message.textContent = historyUxText(type);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "history-undo-btn";
    button.textContent = historyUxText("undo");
    button.addEventListener("click", function() {
      if (_undoTimer) clearTimeout(_undoTimer);
      _undoTimer = null;
      persistHistory(snapshot);
      notice.remove();
      renderHistory();
    });
    notice.appendChild(message);
    notice.appendChild(button);
    document.body.appendChild(notice);
    _undoTimer = setTimeout(function() {
      _undoTimer = null;
      notice.remove();
    }, 8000);
  }

  function clearHistory() {
    var previous = getHistory();
    if (!previous.length) return;
    try { localStorage.removeItem(STORAGE_KEY); }
    catch (e) { console.warn("[History] Failed to clear:", e); return; }
    renderHistory();
    showHistoryUndo(previous, "cleared");
  }

  function removeEntry(id) {
    const history = getHistory();
    const filtered = history.filter(function(e) { return e.id !== id; });
    if (filtered.length === history.length) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn("[History] Failed to delete:", e);
      return;
    }
    renderHistory();
    showHistoryUndo(history, "deleted");
  }

  function escapeHtml(s) {
    if (!s) return "";
    if (typeof s !== "string") return "";
    if (s.indexOf("&") < 0 && s.indexOf("<") < 0 && s.indexOf(">") < 0 && s.indexOf('"') < 0 && s.indexOf("'") < 0) return s;
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function formatTime(isoString, t) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    var lang = window.currentLang || "ja";
    if (diff < 60000) return t("history.just_now");
    if (diff < 3600000) return Math.floor(diff / 60000) + " " + t("unit.minute") + " " + t("time.ago");
    if (diff < 86400000) return Math.floor(diff / 3600000) + " " + t("unit.hour") + " " + t("time.ago");
    return date.toLocaleDateString(lang === "ja" ? "ja-JP" : lang === "zh" ? "zh-CN" : lang === "ko" ? "ko-KR" : "en-US");
  }

  function renderHistory() {
    const container = document.getElementById("historyContainer");
    if (!container) return;
    const history = getHistory();
    const t = window.t || function(key) { return key; };

    if (history.length === 0) {
      container.innerHTML = '<div class="history-empty">' + t("history.empty") + "</div>";
      return;
    }

    let html = '<div class="history-container">';
    html += '<div class="history-header">';
    html += "<h3>" + t("history.title") + "</h3>";
    html += '<button class="history-clear-btn" id="clearHistoryBtn">' + t("history.clear") + "</button>";
    html += "</div>";

    history.forEach(function(entry) {
      const timeStr = formatTime(entry.timestamp, t);
      const _lang = window.currentLang || "ja";
      // lineInfo 为对象数组时不能直接 flat；同时兼容旧的纯字符串数组。
      function _extractLines(lineInfo) {
        var out = [];
        if (!Array.isArray(lineInfo)) return out;
        lineInfo.forEach(function(x) {
          if (x && Array.isArray(x.lines)) out = out.concat(x.lines);
          else if (typeof x === "string") out.push(x);
        });
        return out;
      }
      // lineInfo.lines 通常存 lineId；历史记录也可能保存 line.name。
      // name 字段不一致时先反查为 canonical ID，再交给 resolveLineName。
      function _resolveLineIdOrName(lid, lang) {
        var nm = (window.RailwayDB && window.RailwayDB.resolveLineName) ? window.RailwayDB.resolveLineName(lid, lang) : lid;
        if (nm !== lid) return nm;
        // resolveLineName 原样返回（未知 ID）——若输入是某线的 name 字段，反查为 ID
        if (window.RailwayDB && window.RailwayDB.getLine && !window.RailwayDB.getLine(lid)) {
          var all = (window.RailwayDB.getAllLines && window.RailwayDB.getAllLines()) || {};
          for (var _k in all) {
            var _l = all[_k];
            if (_l && (_l.name === lid || _l.nameEn === lid || _l.nameJa === lid)) {
              var _r = window.RailwayDB.resolveLineName(_k, lang);
              if (_r && _r !== _k) { nm = _r; break; }
            }
          }
        }
        return nm;
      }
      const lines = entry.lineInfo ? [...new Set(_extractLines(entry.lineInfo))].map(function(lid){ return _resolveLineIdOrName(lid, _lang); }).join(", ") : "";

      html += '<div class="history-entry" data-id="' + entry.id + '">';
      html += '<a class="history-route" href="home.html?from=' +
        encodeURIComponent(entry.from) + '&to=' + encodeURIComponent(entry.to) + '">';
      html += '<span class="history-from">' + escapeHtml(window.RailwayDB ? window.RailwayDB.resolveStationName(entry.from, window.currentLang) || entry.from : entry.from) + "</span>";
      html += '<svg class="history-arrow" viewBox="0 0 14 14" width="10" height="10" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" transform="rotate(90 7 7)" d="M6.646.146a.5.5 0 0 1 .708 0l3.5 3.5a.5.5 0 0 1-.354.854H8V13a1 1 0 1 1-2 0V4.5H3.5a.5.5 0 0 1-.354-.854z"/></svg>';
      html += '<span class="history-to">' + escapeHtml(window.RailwayDB ? window.RailwayDB.resolveStationName(entry.to, window.currentLang) || entry.to : entry.to) + "</span>";
      html += "</a>";
      html += '<div class="history-meta">';
      if (entry.durationMin > 0) {
        html += '<span class="history-duration">' + entry.durationMin + " " + t("unit.minute") + "</span>";
      }
      if (entry.count) {
        var _timesStr = (t("history.times") || "").replace("{n}", entry.count);
        html += '<span class="history-count">' + escapeHtml(_timesStr) + "</span>";
      }
      if (lines) {
        html += '<span class="history-lines">' + escapeHtml(lines) + "</span>";
      }
      html += '<span class="history-time">' + timeStr + "</span>";
      html += '<button type="button" class="history-delete-btn" data-id="' + entry.id + '" aria-label="' + escapeHtml((window.currentLang === "zh" ? "删除记录" : window.currentLang === "ko" ? "기록 삭제" : window.currentLang === "en" ? "Delete entry" : "履歴を削除") + ": " + entry.from + " → " + entry.to) + '"><svg class="pt-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6"/></svg></button>';
      html += "</div>";
      html += "</div>";
    });

    html += "</div>";
    container.innerHTML = html;

    // 使用事件委托绑定事件：每个容器只绑定一次。
    if (!container.dataset.eventsBound) {
      container.dataset.eventsBound = "1";
      container.addEventListener("click", function(e) {
        var clearBtn = e.target.closest(".history-clear-btn");
        if (clearBtn) {
          clearHistory();
          return;
        }
        var delBtn = e.target.closest(".history-delete-btn");
        if (delBtn) {
          e.stopPropagation();
          removeEntry(parseInt(delBtn.dataset.id));
          return;
        }
        // The route link uses native navigation (including modifier-click and
        // Enter); pointer taps on the rest of the card keep the old shortcut.
        if (e.target.closest(".history-route")) return;
        var entryEl = e.target.closest(".history-entry");
        if (entryEl && entryEl.classList.contains("rs-loading")) return;
        if (entryEl) {
          var id = parseInt(entryEl.dataset.id);
          var hist = getHistory();
          var item = hist.find(function(e) { return e.id === id; });
          if (!item) { console.warn("[History] Item not found:", id); return; }
          if (item) {
            entryEl.classList.add("rs-loading");
            setTimeout(function() {
              window.location.href = "home.html?from=" + encodeURIComponent(item.from) + "&to=" + encodeURIComponent(item.to);
            }, 150);
          }
        }
      });
    }
  }

  function init() {
    renderHistory();

    // 搜索持久化由 SearchUI 通过 SearchHistory.saveToHistory 负责。

    if (typeof window.onLanguageChange === "function") {
      window.onLanguageChange(function() { renderHistory(); });
    }
  }
  window.SearchHistory = {
    init: init,
    getHistory: getHistory,
    saveToHistory: saveToHistory,
    clearHistory: clearHistory,
    removeEntry: removeEntry,
    renderHistory: renderHistory,
  };

  // 除 window.t 外还需等 RailwayDB 数据就绪（DataLoader.isLoaded）——
  // 原实现只等 translations，db 异步加载完成前渲染会把站名/线路名解析成 ID/英文
  // （resolveLineName 对未知 ID 原样返回）。db 加载失败或超时（15s）也放行兜底。
  function safeInit(tries) {
    tries = tries || 0;
    var dbReady = !!(window.DataLoader && window.DataLoader.isLoaded && window.DataLoader.isLoaded());
    var dbErr = !!(window.DataLoader && window.DataLoader.getError && window.DataLoader.getError());
    if (typeof window.t === "function" && (dbReady || dbErr || tries > 300)) {
      SearchHistory.init();
    } else {
      setTimeout(function() { safeInit(tries + 1); }, 50);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInit);
  } else {
    safeInit();
  }
})();
