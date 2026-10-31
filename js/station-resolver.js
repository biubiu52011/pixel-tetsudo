/*
 * Pixel Tetsudo — Station Resolver
 * Multi-language station name ↔ station_id resolution
 */
(function() {
  "use strict";

  var _jpToEn = {};
  var _enToJp = {};
  var _enToCanon = {};
  var _jpToCanon = {};
  var _zhToCanon = {};
  var _koToCanon = {};
  var _lineStationIds = null;

  function _hasJapanese(s) { return /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(s); }
  function _hasKorean(s) { return /[\uac00-\ud7af]/.test(s); }

  /**
   * Normalize a resolved station ID to the canonical casing used in line.stations.
   * Fixes case-mismatch where entity key differs from line references.
   * E.g. "Azabu-juban" -> "Azabu-Juban", "Tama-center" -> "Tama-Center"
   * Returns the original id if no canonical form is found (entity-only stations).
   */
  function _normalizeId(id) {
    var lower = _asciiLower(id);
    var arr = Array.from(_lineStationIds);
    // 1. exact case-insensitive match against canonical station IDs
    for (var j = 0; j < arr.length; j++) {
      if (_asciiLower(arr[j]) === lower) return arr[j];
    }
    // 2. hyphen-insensitive match: name_map may point to a variant form of a real station
    //    (Kitasenju->Kita-Senju, Shin-juku->Shinjuku, Kotake-mukaihara->Kotake-Mukaihara, ...).
    //    Resolve only when unambiguous; on collision return the original id rather than guessing.
    // Normalize away both hyphens and spaces: name_map variants like "Keikyū Kawasaki"
    // (space + macron) must match canonical "Keikyu-Kawasaki".
    var noHyphen = lower.replace(/[-_\s]/g, '');
    var matched = null;
    for (var k = 0; k < arr.length; k++) {
      if (_asciiLower(arr[k]).replace(/[-_\s]/g, '') === noHyphen) {
        if (matched) return id;
        matched = arr[k];
      }
    }
    return matched || id;
  }

  /**
   * Lowercase + decompose accents (NFD) + map long-vowel macrons to plain ASCII,
   * so name_map variants like "Keikyū Kawasaki" match canonical "Keikyu-Kawasaki".
   */
  function _asciiLower(id) {
    return String(id).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, '')
      .replace(/[ūŪ]/g, 'u')  // ū Ū
      .replace(/[ōŌ]/g, 'o')  // ō Ō
      .replace(/[āĀ]/g, 'a')  // ā Ā
      .replace(/[ēĒ]/g, 'e')  // ē Ē
      .replace(/[īĪ]/g, 'i'); // ī Ī
  }

  function _buildIndex() {
    if (_lineStationIds !== null) return;
    _lineStationIds = new Set();
    _jpToCanon = {};
    _zhToCanon = {};
    _koToCanon = {};
    _enToCanon = {};
    var lines = window.RailwayDB && window.RailwayDB.getAllLines
      ? window.RailwayDB.getAllLines()
      : (window.UNIFIED_LINES || {});
    var i18n = window._stationI18n || window.STATION_I18N || window.RAILWAY_I18N || {};
    for (var lid in lines) {
      var line = lines[lid];
      if (line && line.stations) {
        for (var i = 0; i < line.stations.length; i++) {
          var _sid = line.stations[i];
          _lineStationIds.add(_sid);
          // Reverse index: official ja display name -> canonical id (overrides broken name_map targets)
          if (window.RailwayDB && window.RailwayDB.resolveStationName) {
            var _ja = window.RailwayDB.resolveStationName(_sid, 'ja');
            if (_ja && _ja !== _sid && !_jpToCanon[_ja]) _jpToCanon[_ja] = _sid;
          }
          // Chinese / Korean / English reverse index from i18n
          // (station-i18n.file.js → window.RAILWAY_I18N; zh 简体 / ko ハングル / en 表示名)
          var entry = i18n[_sid];
          if (entry) {
            if (entry.zh && !_zhToCanon[entry.zh]) _zhToCanon[entry.zh] = _sid;
            if (entry.ko && !_koToCanon[entry.ko]) _koToCanon[entry.ko] = _sid;
            if (entry.en) {
              var _enKey = _asciiLower(entry.en);
              if (!_enToCanon[_enKey]) _enToCanon[_enKey] = _sid;
            }
          }
        }
      }
    }
    var nm = window.STATION_NAME_MAP || {};
    for (var jpKey in nm) {
      var v = nm[jpKey];
      if (typeof v === "string") {
        _jpToEn[jpKey] = v;
        if (!_enToJp[v.toLowerCase()]) _enToJp[v.toLowerCase()] = jpKey;
      } else if (v && typeof v === "object") {
        var enVal = v.en || v.ja || "";
        if (enVal) {
          _jpToEn[jpKey] = enVal;
          if (!_enToJp[enVal.toLowerCase()]) _enToJp[enVal.toLowerCase()] = jpKey;
        }
      }
    }
  }



  function resolve(query) {
    if (!query || !query.trim()) return [];
    _buildIndex();
    var q = query.trim();
    var isJp = _hasJapanese(q);
    var qLower = q.toLowerCase();

    if (isJp) {
      // Official ja display name reverse lookup first: bypasses broken name_map targets
      // (e.g. 新橋 name_map->"Shinbashi" while the real station is Shimbashi; 北千住->Kitasenju vs Kita-Senju)
      if (_jpToCanon[q]) {
        return [{ stationId: _jpToCanon[q], displayName: q, status: "EXACT" }];
      }
      if (_jpToEn[q]) {
        var normJp = _normalizeId(_jpToEn[q]);
        return [{ stationId: normJp, displayName: _jpToEn[q], status: "EXACT" }];
      }
      // Chinese / Korean input fallback: same CJK characters as Japanese,
      // but name_map keys are in Japanese kanji (東京 not 东京).
      // Check zh/ko reverse indexes from i18n before falling through to fuzzy match.
      if (_zhToCanon[q]) {
        return [{ stationId: _zhToCanon[q], displayName: q, status: "EXACT" }];
      }
      if (_koToCanon[q]) {
        return [{ stationId: _koToCanon[q], displayName: q, status: "EXACT" }];
      }
      var jpMatches = [];
      var _seen = {};
      for (var jpKey in _jpToEn) {
        if (jpKey.indexOf(q) !== -1) {
          var _nid = _normalizeId(_jpToEn[jpKey]);
          if (_nid && !_seen[_nid]) { _seen[_nid] = 1; jpMatches.push({ stationId: _nid, displayName: jpKey, status: "ALIAS" }); }
        }
      }
      for (var jaKey in _jpToCanon) {
        if (jaKey.indexOf(q) !== -1) {
          if (!_seen[_jpToCanon[jaKey]]) { _seen[_jpToCanon[jaKey]] = 1; jpMatches.push({ stationId: _jpToCanon[jaKey], displayName: jaKey, status: "ALIAS" }); }
        }
      }
      // Chinese / Korean fuzzy match: query is simplified Chinese or Hangul,
      // but _jpToEn/_jpToCanon keys are Japanese kanji (東京 not 东京).
      // Search through zh/ko reverse indexes for substring matches.
      for (var zhKey in _zhToCanon) {
        if (zhKey.indexOf(q) !== -1) {
          var _cid = _zhToCanon[zhKey];
          if (!_seen[_cid]) { _seen[_cid] = 1; jpMatches.push({ stationId: _cid, displayName: zhKey, status: "ALIAS" }); }
        }
      }
      for (var koKey in _koToCanon) {
        if (koKey.indexOf(q) !== -1) {
          var _kid = _koToCanon[koKey];
          if (!_seen[_kid]) { _seen[_kid] = 1; jpMatches.push({ stationId: _kid, displayName: koKey, status: "ALIAS" }); }
        }
      }
      if (jpMatches.length > 0) return jpMatches;
      // 带「駅」后缀的日文输入（如「渋谷駅」）容错：剥离后缀后按站名重新解析。
      if (q.charAt(q.length - 1) === "駅") {
        var bare = q.slice(0, -1);
        var bareR = resolve(bare);
        if (bareR.length > 0 && bareR[0].stationId) {
          return bareR.map(function(r) {
            return { stationId: r.stationId, displayName: q, status: r.status };
          });
        }
      }
      return [{ stationId: null, displayName: q, status: "NOT_FOUND" }];
    }

    var _arr = Array.from(_lineStationIds);
    var _qAscii = _asciiLower(q);
    // Exact match over canonical IDs with case/accent normalization
    for (var _i = 0; _i < _arr.length; _i++) {
      if (_asciiLower(_arr[_i]) === _qAscii) {
        return [{ stationId: _arr[_i], displayName: _arr[_i], status: "EXACT" }];
      }
    }
    if (_enToJp[qLower]) {
      var jk = _enToJp[qLower];
      var jid = _normalizeId(_jpToEn[jk] || qLower);
      if (jid) return [{ stationId: jid, displayName: jid, status: "ALIAS" }];
    }
    // English display name reverse lookup from i18n (Kitasenju -> Kita-Senju,
    // Toride -> Toride, ...) — covers en names not present in name_map.
    if (_enToCanon[qLower]) {
      return [{ stationId: _enToCanon[qLower], displayName: q, status: "EXACT" }];
    }
    // Korean input fallback (Hangul doesn't match Japanese regex)
    if (_hasKorean(q)) {
      if (_koToCanon[q]) {
        return [{ stationId: _koToCanon[q], displayName: q, status: "EXACT" }];
      }
      // Korean fuzzy match
      var koPartial = [];
      for (var koKey in _koToCanon) {
        if (koKey.indexOf(q) !== -1) {
          koPartial.push({ stationId: _koToCanon[koKey], displayName: koKey, status: "ALIAS" });
        }
      }
      if (koPartial.length > 0) return koPartial;
    }
    // Substring match over real station IDs (case/accent-insensitive)
    var partial = [];
    for (var _j = 0; _j < _arr.length; _j++) {
      if (_asciiLower(_arr[_j]).indexOf(_qAscii) !== -1) {
        partial.push({ stationId: _arr[_j], displayName: _arr[_j], status: "FUZZY_SINGLE" });
      }
    }
    if (partial.length > 0) return partial;
    return [{ stationId: null, displayName: q, status: "NOT_FOUND" }];
  }

  function findStationIds(term, limit) {
    limit = limit || 10;
    var results = resolve(term);
    if (results.length === 0) return [];
    if (results[0].status === "NOT_FOUND") return [];
    if (results.length === 1 && results[0].stationId) return [results[0].stationId];
    var ids = [];
    for (var i = 0; i < results.length && ids.length < limit; i++) {
      if (results[i].stationId) ids.push(results[i].stationId);
    }
    return ids;
  }

  function isKnownStation(query) {
    var r = resolve(query);
    return r.length > 0 && r[0].stationId !== null;
  }

  window.StationResolver = {
    resolve: resolve,
    findStationIds: findStationIds,
    isKnownStation: isKnownStation
  };

})();

