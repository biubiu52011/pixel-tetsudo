/*
 * 延误翻译器
 * ------------------------------------------------------------------
 * 离线运行情报翻译引擎（Provider: window.DelayTranslator）
 *
 * 运行规则：翻译 API 方案在线上 GitHub Pages 不可用——
 * 本地 serve.py 代理在静态托管上 404；MyMemory 直连在用户网络环境亦失败
 * （虽服务端返回 CORS 头，但用户侧连接被拒）。业界调研结论：实时延误文本的
 * 多语言没有"免费无限制、无需注册"的第三方 API（Google/DeepL/微软均需
 * 注册 key 或付费；大厂 App 用自研引擎或内容预翻译）。
 *
 * 方案：本地模板翻译引擎——ODPT/官方运行情报文本句式高度模板化
 * （本次全量 145 条实测），按"整句式模板 → 原因词+术语+站名+线路名词典
 * 替换 → 摘要兜底"三级处理，完全离线、零网络依赖、即时、稳定，
 * GitHub Pages 静态环境同样可用，无限免费。
 *
 * 设计边界：
 * - 只翻译动态运行情报文本；站名/线路名一律经 RailwayDB.resolveStationName /
 *   resolveLineName 解析（Display Identity Rule），禁止自建显示名解析器。
 * - lang=ja 恒返回原文；未命中任何模板/词典时返回原文（安全回退，
 *   原文折叠保留在 realtime-view，用户始终可查 ODPT 原文全文）。
 * - 不承诺对任意自由文本的完整翻译——长通知类文本走摘要模式（cause+状态），
 *   细节保留在折叠原文中。
 *
 * API: window.DelayTranslator.translate(text, opts, lang)
 *   opts = { cause, status, lineId }
 *   返回 { translated, matched }（matched=false 表示回退原文）
 * Consumers: realtime-view（弹窗正文）
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  // ---- 原因词表（ja → 4 语言；长词优先匹配）----
  var CAUSES = {
    "安全確認": { zh: "安全确认", ko: "안전 확인", en: "safety check" },
    "停止位置確認": { zh: "停车位置确认", ko: "정차 위치 확인", en: "stopping-position check" },
    "信号確認": { zh: "信号确认", ko: "신호 확인", en: "signal check" },
    "信号故障": { zh: "信号故障", ko: "신호 고장", en: "signal failure" },
    "踏切安全確認": { zh: "道口安全确认", ko: "건널목 안전 확인", en: "level-crossing safety check" },
    "人身事故": { zh: "人身事故", ko: "인명 사고", en: "personal accident" },
    "お客さま救護": { zh: "乘客救助", ko: "승객 구호", en: "passenger assistance" },
    "車両点検": { zh: "车辆检查", ko: "차량 점검", en: "vehicle inspection" },
    "設備点検": { zh: "设备检查", ko: "설비 점검", en: "facility inspection" },
    "強風": { zh: "强风", ko: "강풍", en: "strong wind" },
    "大雨": { zh: "大雨", ko: "폭우", en: "heavy rain" },
    "豪雨": { zh: "暴雨", ko: "호우", en: "torrential rain" },
    "倒木": { zh: "倒木", ko: "도목(나무 쓰러짐)", en: "fallen tree" },
    "土砂崩れ": { zh: "塌方", ko: "산사태", en: "landslide" },
    "線路設備被害": { zh: "线路设备受损", ko: "선로 설비 피해", en: "track equipment damage" },
    "線路支障": { zh: "线路障碍", ko: "선로 장애", en: "track obstruction" },
    "異音の確認": { zh: "异响确认", ko: "이음 확인", en: "unusual noise check" },
    "集中工事": { zh: "集中施工", ko: "집중 공사", en: "concentrated construction" },
    "設備メンテナンス": { zh: "设备维护", ko: "설비 유지보수", en: "facility maintenance" },
    "線路設備の改良工事": { zh: "线路设备改良施工", ko: "선로 설비 개량 공사", en: "track improvement works" },
    "線路内点検": { zh: "线路内检查", ko: "선로 내 점검", en: "track inspection" },
    "架線故障": { zh: "接触网故障", ko: "가선 고장", en: "overhead line failure" },
    "架線に支障物": { zh: "接触网上有障碍物", ko: "가선에 지장물이 있음", en: "obstruction on the overhead line" },
    "ポイント故障": { zh: "道岔故障", ko: "분기기 고장", en: "points failure" },
    "輸送障害": { zh: "运输障碍", ko: "수송 장애", en: "traffic disruption" },
    "乗務員": { zh: "乘务员", ko: "승무원", en: "crew" },
    "停電": { zh: "停电", ko: "정전", en: "power outage" },
    "地震": { zh: "地震", ko: "지진", en: "earthquake" },
    "雪": { zh: "降雪", ko: "눈", en: "snow" },
    "工事": { zh: "施工", ko: "공사", en: "construction" },
    "動物": { zh: "动物", ko: "동물", en: "animal" },
    "不審者": { zh: "可疑人员", ko: "수상한 인물", en: "suspicious person" },
    "火災": { zh: "火灾", ko: "화재", en: "fire" },
    "人身影響": { zh: "人身影响", ko: "인명 영향", en: "personal impact" },
    "輸送混乱": { zh: "运输混乱", ko: "수송 혼란", en: "traffic disruption" },
    "線路設備": { zh: "线路设备", ko: "선로 설비", en: "track equipment" },
    "バス": { zh: "巴士", ko: "버스", en: "bus" },
    "台風": { zh: "台风", ko: "태풍", en: "typhoon" },
    "混雑": { zh: "拥挤", ko: "혼잡", en: "congestion" },
    "急病人": { zh: "突发疾病乘客", ko: "응급 환자", en: "passenger illness" },
    "線路内立入": { zh: "人员进入线路", ko: "선로 내 출입", en: "person on the tracks" },
    "ドア点検": { zh: "车门检查", ko: "출입문 점검", en: "door inspection" },
    "原因不明": { zh: "原因不明", ko: "원인 불명", en: "unknown cause" },
    "その他の原因": { zh: "其他原因", ko: "기타 원인", en: "other cause" },
    "設備故障": { zh: "设备故障", ko: "설비 고장", en: "equipment failure" },
    "ストライキ": { zh: "罢工", ko: "파업", en: "strike" },
    "デモ": { zh: "示威活动", ko: "시위", en: "demonstration" },
    "事故": { zh: "事故", ko: "사고", en: "accident" },
    "休日": { zh: "假日", ko: "휴일", en: "holiday" },
    "天候": { zh: "天气", ko: "기상", en: "weather" },
    "保守": { zh: "维护", ko: "보수", en: "maintenance" },
    "工事": { zh: "工程", ko: "공사", en: "construction" },
    "警察活動": { zh: "警察活动", ko: "경찰 활동", en: "police activity" },
    "医療緊急事態": { zh: "医疗急救", ko: "의료 응급 상황", en: "medical emergency" }
  };

  // ---- 常用术语表（ja → 4 语言）----
  var TERMS = {
    "上下線": { zh: "上下行线", ko: "상하행선", en: "both directions" },
    "下り線": { zh: "下行线", ko: "하행선", en: "downbound" },
    "上り線": { zh: "上行线", ko: "상행선", en: "upbound" },
    "内回り電車": { zh: "内环电车", ko: "내선 순환 전동차", en: "inner-loop trains" },
    "外回り電車": { zh: "外环电车", ko: "외선 순환 전동차", en: "outer-loop trains" },
    "内回り": { zh: "内环", ko: "내선 순환", en: "inner-loop" },
    "外回り": { zh: "外环", ko: "외선 순환", en: "outer-loop" },
    "一部列車": { zh: "部分列车", ko: "일부 열차", en: "some trains" },
    "全線": { zh: "全线", ko: "전 노선", en: "all lines" },
    "上下": { zh: "上下行", ko: "상하행", en: "both directions" },
    "下り": { zh: "下行", ko: "하행", en: "downbound" },
    "上り": { zh: "上行", ko: "상행", en: "upbound" },
    "当分の間": { zh: "今后一段时间", ko: "당분간", en: "for the time being" },
    "当面の間": { zh: "目前一段时间", ko: "당분간", en: "for now" },
    "折返し運転": { zh: "折返运行", ko: "회차 운전", en: "turnback operation" },
    "運転再開見込は立っていません": { zh: "目前尚无恢复运行时间预估", ko: "운전 재개 예상 시각은 정해지지 않았습니다", en: "there is currently no estimated time for service resumption" },
    "運転再開見込み": { zh: "恢复运行预估", ko: "운전 재개 예상", en: "estimated service resumption" },
    "通常の": { zh: "正常班次的", ko: "통상의", en: "the normal service level of" },
    "割程度": { zh: "成左右", ko: "할 정도", en: " tenths of normal" },
    "終日": { zh: "全天", ko: "종일", en: "all day" },
    "本日": { zh: "今日", ko: "오늘", en: "today" },
    "日中時間帯": { zh: "白天时段", ko: "주간 시간대", en: "daytime hours" },
    "代行輸送": { zh: "替代运输", ko: "대행 수송", en: "replacement transport" },
    "代行バス": { zh: "替代巴士", ko: "대행 버스", en: "replacement bus" },
    "振替輸送": { zh: "替代运输", ko: "대체 수송", en: "alternative transport" },
    "運転見合わせ": { zh: "暂停运行", ko: "운전 중단", en: "suspended" },
    "運転再開": { zh: "恢复运行", ko: "운전 재개", en: "resumed" },
    "運休": { zh: "停运", ko: "운휴", en: "cancellation" },
    "遅延": { zh: "延误", ko: "지연", en: "delay" },
    "遅れ": { zh: "延误", ko: "지연", en: "delay" },
    "平常運転": { zh: "正常运营", ko: "정상 운행", en: "normal operation" },
    "平常通り": { zh: "照常", ko: "평소대로", en: "as usual" },
    "平常どおり": { zh: "照常", ko: "평소대로", en: "as usual" },
    "平常運行": { zh: "正常运营", ko: "정상 운행", en: "normal operation" },
    "時刻変更": { zh: "时刻变更", ko: "시각 변경", en: "schedule change" },
    "臨時列車": { zh: "临时列车", ko: "임시 열차", en: "extra trains" },
    "区間運休": { zh: "区间停运", ko: "구간 운휴", en: "section cancellation" },
    "可能性があります": { zh: "可能出现", ko: "발생할 가능성이 있습니다", en: "may occur" },
    "運転しています": { zh: "正在运行", ko: "운행 중입니다", en: "is in operation" },
    "運転しております": { zh: "正在运行", ko: "운행 중입니다", en: "is in operation" },
    "運行しております": { zh: "正在运行", ko: "운행 중입니다", en: "is in operation" },
    "運転しています": { zh: "正在运行", ko: "운행 중입니다", en: "is in operation" },
    "遅れが出ています": { zh: "出现延误", ko: "지연이 발생하고 있습니다", en: "delays are occurring" },
    "ダイヤが乱れています": { zh: "运行时刻出现紊乱", ko: "운행 시간표가 흐트러지고 있습니다", en: "the timetable is disrupted" },
    "運転します": { zh: "运行", ko: "운행합니다", en: "will operate" },
    "運休します": { zh: "停运", ko: "운휴합니다", en: "will be cancelled" },
    "運休となります": { zh: "停运", ko: "운휴가 됩니다", en: "will be cancelled" },
    "運休が発生します": { zh: "发生停运", ko: "운휴가 발생합니다", en: "cancellations will occur" },
    "運転を取りやめます": { zh: "停止运行", ko: "운행을 중지합니다", en: "will be suspended" },
    "全ての列車": { zh: "全部列车", ko: "모든 열차", en: "all trains" },
    "再開しました": { zh: "已恢复", ko: "재개되었습니다", en: "has resumed" },
    "遅れと運休": { zh: "延误和停运", ko: "지연과 운휴", en: "delays and cancellations" },
    "運転を見合わせています": { zh: "正在暂停运行", ko: "운전을 중단하고 있습니다", en: "service is suspended" },
    "運転を見合わせます": { zh: "将暂停运行", ko: "운전을 중단합니다", en: "service will be suspended" },
    "直通運転": { zh: "直通运行", ko: "직통 운전", en: "through service" },
    "直通運転を中止しています": { zh: "已停止直通运行", ko: "직통 운전을 중단하고 있습니다", en: "through service is suspended" }
  };

  // ---- 小词表（影响源片段内的连接词）----
  var PARTICLES = {
    "内での": { zh: "内的", ko: " 내 ", en: " within" },
    "内で": { zh: "内", ko: " 내 ", en: " within" },
    "での": { zh: "的", ko: "에서 ", en: "at" },
    "による": { zh: "因", ko: "로 인한", en: "due to" },
    "のため": { zh: "因", ko: "로 인해", en: "due to" },
    "の影響": { zh: "的影响", ko: "의 영향", en: "impact" },
    "の影響で": { zh: "影响", ko: "영향으로", en: "due to" },
    "駅間": { zh: "站间", ko: "역 간", en: "between" },
    "間の": { zh: "之间的", ko: "간의", en: "between" },
    "間で": { zh: "区间", ko: "구간에서", en: "section" },
    "の列車に": { zh: "列车", ko: "열차에", en: "trains" },
    "列車に": { zh: "列车", ko: "열차에", en: "trains" },
    "の": { zh: "", ko: "의", en: "" },
    "を": { zh: "", ko: "", en: "" },
    "〜": { zh: "～", ko: "~", en: "-" }
  };

  var _stCache = null;   // { jaName -> langName }
  var _lnCache = null;   // { jaName -> langName }

  function _buildStations() {
    if (_stCache) return _stCache;
    // 数据未就绪（i18n 尚未加载）时不缓存，下次重试，避免空缓存污染
    if (!window.RailwayDB || !window.RailwayDB.getStations || !window.RailwayDB.resolveStationName || !window.RailwayDB.resolveStationName("Yokohama", "ja")) return {};
    _stCache = {};
    try {
      // 站实体 + 全线路站表 + 换乘站 合并收集（長野原草津口等仅有 i18n/线路引用、无站实体的站也要覆盖）
      var ids = {};
      var sts = window.RailwayDB.getStations() || {};
      Object.keys(sts).forEach(function (id) { ids[id] = 1; });
      var lines = window.RailwayDB.getAllLines ? window.RailwayDB.getAllLines() : {};
      Object.keys(lines).forEach(function (lid) {
        var arr = lines[lid] && lines[lid].stations;
        if (Array.isArray(arr)) arr.forEach(function (sid) { ids[sid] = 1; });
      });
      Object.keys(sts).forEach(function (id) {
        var s = sts[id];
        if (s && s.transferStations) Object.keys(s.transferStations).forEach(function (t) { ids[t] = 1; });
      });
      Object.keys(ids).forEach(function (id) {
        var ja = window.RailwayDB.resolveStationName(id, "ja");
        if (!ja) return;
        ["zh", "ko", "en"].forEach(function (lang) {
          var nm = window.RailwayDB.resolveStationName(id, lang);
          if (nm && nm !== id && nm !== ja) _stCache[ja + "|" + lang] = nm;
        });
      });
    } catch (e) { /* 忽略构建失败 */ }
    return _stCache;
  }

  function _buildLines() {
    if (_lnCache) return _lnCache;
    if (!window.RailwayDB || !window.RailwayDB.getAllLines || !window.RailwayDB.resolveLineName || !window.RailwayDB.resolveLineName("Yamanote", "ja")) return {};
    _lnCache = {};
    try {
      var lines = window.RailwayDB && window.RailwayDB.getAllLines ? window.RailwayDB.getAllLines() : {};
      Object.keys(lines).forEach(function (id) {
        var ja = lines[id] && (lines[id].nameJa || lines[id].name);
        if (!ja) return;
        ["zh", "ko", "en"].forEach(function (lang) {
          var nm = window.RailwayDB.resolveLineName(id, lang);
          if (nm && nm !== id && nm !== ja) _lnCache[ja + "|" + lang] = nm;
        });
      });
    } catch (e) { /* 忽略构建失败 */ }
    return _lnCache;
  }

  function _langOf(entry, lang) {
    if (!entry) return null;
    if (entry[lang] !== undefined && entry[lang] !== null) return entry[lang];
    return entry.en || entry.ja || null;
  }

  // 词级替换：长词优先、区间去重（防止替换结果被再次匹配的连锁替换，如"上下線"→"上下行线"后再被"上下"命中）
  function _replaceFragment(s, lang) {
    if (!s || lang === "ja") return s;
    var out = s;
    // 收集候选替换（按 ja 词长降序，保证长词先替换，避免短词切碎）
    var cand = [];
    var push = function (ja, tr) { if (ja && tr !== ja && tr !== null && tr !== undefined) cand.push([ja, tr]); };
    var st = _buildStations(), ln = _buildLines();
    Object.keys(CAUSES).forEach(function (k) { var v = _langOf(CAUSES[k], lang); if (v !== null && v !== undefined) push(k, v); });
    Object.keys(TERMS).forEach(function (k) { var v = _langOf(TERMS[k], lang); if (v !== null && v !== undefined) push(k, v); });
    Object.keys(PARTICLES).forEach(function (k) { var v = _langOf(PARTICLES[k], lang); if (v !== null && v !== undefined) push(k, v); });
    Object.keys(st).forEach(function (k) { if (k.indexOf("|" + lang) > 0) push(k.split("|")[0], st[k]); });
    Object.keys(ln).forEach(function (k) { if (k.indexOf("|" + lang) > 0) push(k.split("|")[0], ln[k]); });
    // 在原文上收集所有出现位置，长词优先、重叠去重
    var occ = [];
    cand.forEach(function (c) {
      var ja = c[0], tr = c[1], idx = 0;
      while ((idx = out.indexOf(ja, idx)) >= 0) {
        occ.push({ s: idx, e: idx + ja.length, ja: ja, tr: tr });
        idx += ja.length;
      }
    });
    occ.sort(function (a, b) { return b.ja.length - a.ja.length || a.s - b.s; });
    var picked = [];
    occ.forEach(function (o) {
      var ok = picked.every(function (p) { return o.e <= p.s || o.s >= p.e; });
      if (ok) picked.push(o);
    });
    // 从右到左替换（保持左侧索引有效）
    picked.sort(function (a, b) { return b.s - a.s; });
    picked.forEach(function (o) { out = out.slice(0, o.s) + o.tr + out.slice(o.e); });
    // 清理孤立残留"駅"（站名替换后）
    out = out.replace(/駅/g, "");
    return out;
  }

  // ---- 整句式模板（顺序匹配，命中即结构化输出）----
  var TEMPLATES = [
    {
      // 減便・運転本数："通常の5割程度で運転" / "通常の7～8割程度の本数で運転"
      re: /通常の\s*([０-９0-9]+)(?:\s*[～〜－−-]\s*([０-９0-9]+))?\s*割程度(?:の本数)?で運転(?:します|しています|しております)?/,
      build: function (m, lang) {
        function n(v) { return String(v || "").replace(/[０-９]/g, function(c){ return String(c.charCodeAt(0)-0xFF10); }); }
        var a = n(m[1]) + "0%";
        var level = m[2] ? a + "～" + n(m[2]) + "0%" : a;
        return { zh: "约按正常班次的" + level + "运行。", ko: "통상 운행 횟수의 약 " + level + " 수준으로 운행합니다.", en: "Service is operating at approximately " + level + " of the normal frequency." }[lang];
      }
    },
    {
      // 直通運転中止
      re: /(.+?線)?(?:との|への)?直通運転を(?:中止|取りやめ|見合わせ)(?:しています|します|しております)?/,
      build: function (m, lang) {
        var target = m[1] ? _replaceFragment(m[1], lang) : "";
        return { zh: (target ? "已停止与" + target + "的直通运行。" : "已停止直通运行。"), ko: (target ? target + "과의 직통 운전을 중단하고 있습니다." : "직통 운전을 중단하고 있습니다."), en: (target ? "Through service with " + target + " is suspended." : "Through service is suspended.") }[lang];
      }
    },
    {
      // 影响源 + 方向别延误（无主语）："...内での停止位置確認の影響で、下り線の一部列車に遅れが出ています"
      // 必须在纯方向模板之前，避免只输出"下行线出现延误"而丢失原因。
      re: /(.+?)(?:の影響で|の影響|のため|による)、(上り線|下り線|上下線|内回り(?:電車)?|外回り(?:電車)?)(?:の一部列車|の列車|の電車)?に(遅れが出ています|遅延しています)/,
      build: function (m, lang) {
        var src = _replaceFragment(m[1], lang);
        var dir = _replaceFragment(m[2], lang);
        return { zh: "因" + src + "，" + dir + "部分列车出现延误。", ko: src + "으로 인해 " + dir + " 일부 열차에 지연이 발생하고 있습니다.", en: "Some " + dir + " trains are delayed due to " + src + "." }[lang];
      }
    },
    {
      // 方向別の遅延・見合わせ：上り/下り/内回り/外回り
      re: /(上り線|下り線|内回り(?:電車)?|外回り(?:電車)?)(?:の一部列車|の列車|の電車)?(?:で|に|は)?(?:一部列車に)?(遅れが出ています|遅延しています|運転を見合わせています|運転見合わせ|運転を中止しています)/,
      build: function (m, lang) {
        var dir = _replaceFragment(m[1], lang);
        var stop = /見合わせ|中止/.test(m[2]);
        return { zh: dir + (stop ? "暂停运行。" : "出现延误。"), ko: dir + (stop ? " 운전이 중단되었습니다." : "에 지연이 발생하고 있습니다."), en: dir + (stop ? " service is suspended." : " services are delayed.") }[lang];
      }
    },
    {
      // 延误+运休："京浜東北線は、東海道線内での安全確認の影響で、上下線の一部列車に遅れと運休がでています"
      // 影响源分隔符兼容 "の影響で、/の影響、/のため、/による、"
      re: /^(.+?)は、(.+?)(?:の影響で|の影響|のため|による)、(.+?)(?:の一部列車|の列車|の電車)?に(遅れと運休|遅れ|遅延)(?:がでています|が出ています)/,
      build: function (m, lang, lineName) {
        var src = _replaceFragment(m[2], lang);
        var dir = _replaceFragment(m[3], lang);
        var act = (m[4] === "遅れと運休") ? { zh: "出现延误和停运", ko: "지연과 운휴가 발생하고 있습니다", en: "delays and cancellations are occurring" }[lang] || m[4] : { zh: "出现延误", ko: "지연이 발생하고 있습니다", en: "delays are occurring" }[lang] || m[4];
        return { zh: lineName + "因" + src + "，" + dir + "部分列车" + act + "。", ko: lineName + "은(는) " + src + "으로 인해 " + dir + " 일부 열차에 " + (m[4] === "遅れと運休" ? "지연과 운휴가 발생하고 있습니다" : "지연이 발생하고 있습니다") + "。", en: lineName + " is experiencing " + (m[4] === "遅れと運休" ? "delays and cancellations" : "delays") + " on " + dir + " trains due to " + src + "." }[lang];
      }
    },
    {
      // 運転再開："東北本線は、異音の確認の影響で、花泉〜一ノ関駅間の上下線で運転を見合わせていましたが、１９時１０分頃に運転を再開しました"
      // 必须在"見合わせ"模板之前（更具体，避免误匹配"見合わせていましたが"）
      re: /運転を見合わせていましたが、(.+?)に運転を再開しました/,
      build: function (m, lang) {
        var time = _normTime(m[1], lang);
        return { zh: "曾暂停运行，" + time + "已恢复运行。", ko: "운전을 중단했으나 " + time + "에 운전을 재개했습니다.", en: "Service was suspended, then resumed at " + time + "." }[lang];
      }
    },
    {
      // 運転見合わせ（正在/預告）："吾妻線は、長野原草津口駅での倒木の影響で、長野原草津口〜大前駅間の上下線で本日全ての列車の運転を取りやめます"
      // 動作語兼容 運転を取りやめます / 運転を見合わせています / 運転を見合わせます / 運転を見合わせ
      re: /^(.+?)は、(.+?)(?:の影響で|の影響|のため|による)、(.+?駅間)(?:の上下線|の上下|で)?(?:で)?(.+?)運転を(?:取りやめます|見合わせています|見合わせます|見合わせ)/,
      build: function (m, lang, lineName) {
        var src = _replaceFragment(m[2], lang);
        var seg = _replaceFragment(m[3], lang);
        var extra = _replaceFragment(m[4], lang);
        return { zh: lineName + "因" + src + "，" + seg + extra + "暂停运行。", ko: lineName + "은(는) " + src + "으로 인해 " + seg + extra + " 운전을 중단합니다.", en: lineName + " service is suspended between " + seg + extra + " due to " + src + "." }[lang];
      }
    },
    {
      // 運転見合わせ（預告・簡約）："津軽線は、線路設備被害のため、蟹田〜三厩駅間で終日運転を見合わせます"
      re: /^(.+?)は、(.+?)(?:のため|による|の影響で|の影響)、(.+?駅間)(?:で|の)(.+?)運転を見合わせます/,
      build: function (m, lang, lineName) {
        var src = _replaceFragment(m[2], lang);
        var seg = _replaceFragment(m[3], lang);
        var extra = _replaceFragment(m[4], lang);
        return { zh: lineName + "因" + src + "，" + seg + extra + "暂停运行。", ko: lineName + "은(는) " + src + "으로 인해 " + seg + extra + " 운전을 중단합니다.", en: lineName + " service will be suspended on " + seg + extra + " due to " + src + "." }[lang];
      }
    },
    {
      // 平常運転
      re: /平常運転|現在、平常どおり運転しています|現在、平常通り運転しています|平常通り運転しています|平常通り運行しております|平常どおり運転しています|平常運行|現在、平常通り運転しています/,
      build: function (m, lang) {
        return { zh: "正常运营", ko: "정상 운행", en: "normal operation" }[lang];
      }
    },
    {
      // 无延误（都营系）
      re: /１５分以上の遅延はありません/,
      build: function (m, lang) {
        return { zh: "目前没有15分钟以上的延误", ko: "현재 15분 이상의 지연은 없습니다", en: "No delays of 15 minutes or more" }[lang];
      }
    },
    {
      // 部分列车延误（东京Metro系）
      re: /一部の列車に遅れが出ています/,
      build: function (m, lang) {
        return { zh: "部分列车出现延误", ko: "일부 열차에 지연이 발생하고 있습니다", en: "Some trains are delayed" }[lang];
      }
    },
    {
      // 安全確認 全线延迟（横滨BlueLine系）
      re: /安全確認のため全線で遅延/,
      build: function (m, lang) {
        return { zh: "因安全确认，全线延误", ko: "안전 확인으로 전 노선 지연", en: "All lines delayed for safety check" }[lang];
      }
    },
    {
      // 各社線 平常（東急/京急/西武等）
      re: /^(.+?線)は、平常通り運転しています/,
      build: function (m, lang) {
        return { zh: "正常运营", ko: "정상 운행", en: "normal operation" }[lang];
      }
    },
    {
      // 遅延予告
      re: /遅れや運休が発生する可能性があります/,
      build: function (m, lang) {
        return { zh: "可能出现延误或停运", ko: "지연이나 운휴가 발생할 가능성이 있습니다", en: "Delays or cancellations may occur" }[lang];
      }
    }
  ];

  // 时间规范化："１９時１０分頃"→"19:10左右"（全角→半角、時→:、分/頃 处理）
  function _normTime(s, lang) {
    if (!s) return s;
    lang = lang || window.currentLang || "zh";
    var t = s.replace(/[０-９]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); });
    t = t.replace(/時/g, ":").replace(/分/g, "");
    t = t.replace(/頃/g, { zh: "左右", ko: "경", en: " approx." }[lang] || "");
    return t;
  }


  function _percentText(serviceLevel) {
    if (!serviceLevel || serviceLevel.minPercent == null) return "";
    if (serviceLevel.maxPercent != null && serviceLevel.maxPercent !== serviceLevel.minPercent) {
      return serviceLevel.minPercent + "%～" + serviceLevel.maxPercent + "%";
    }
    return serviceLevel.minPercent + "%";
  }

  function _directionLabel(direction, lang) {
    var labels = {
      zh: { up: "上行", down: "下行", both: "上下行", inner: "内环", outer: "外环" },
      ko: { up: "상행", down: "하행", both: "상하행", inner: "내선 순환", outer: "외선 순환" },
      en: { up: "upbound", down: "downbound", both: "both directions", inner: "inner-loop", outer: "outer-loop" }
    };
    return (labels[lang] && labels[lang][direction]) || "";
  }

  function _effectPhrase(effect, status, lang) {
    var key = effect || (status === "normal" ? "normal" : (status === "suspended" ? "suspension" : (status === "delayed" ? "delay" : status)));
    var labels = {
      zh: { delay: "出现延误", suspension: "暂停运行", partial_cancellation: "有部分列车停运", through_suspension: "停止直通运行", service_change: "运行方式变更", normal: "正常运行", notice: "有运行通知", info: "有运行情报" },
      ko: { delay: "지연이 발생하고 있습니다", suspension: "운전을 중단하고 있습니다", partial_cancellation: "일부 열차가 운휴합니다", through_suspension: "직통 운전을 중단하고 있습니다", service_change: "운행이 변경되었습니다", normal: "정상 운행 중입니다", notice: "운행 안내가 있습니다", info: "운행 정보가 있습니다" },
      en: { delay: "delays are occurring", suspension: "service is suspended", partial_cancellation: "some trains are cancelled", through_suspension: "through service is suspended", service_change: "service has changed", normal: "normal service", notice: "a service notice is in effect", info: "service information is available" }
    };
    return (labels[lang] && labels[lang][key]) || "";
  }

  function _scopeText(item, lang) {
    if (!item) return "";
    var parts = [];
    if (item.interval) parts.push(_replaceFragment(String(item.interval).replace(/→/g, "〜"), lang));
    var dir = _directionLabel(item.direction, lang);
    if (dir) parts.push(dir);
    return parts.join(lang === "en" ? ", " : "・");
  }

  function _structuredSummary(opts, lang) {
    opts = opts || {};
    var status = opts.status || "";
    var lineName = opts.lineId && window.RailwayDB ? (window.RailwayDB.resolveLineName(opts.lineId, lang) || "") : "";
    var cause = opts.cause ? _replaceFragment(opts.cause, lang) : "";
    var impacts = Array.isArray(opts.impacts) ? opts.impacts.filter(function(x){ return x && (x.interval || x.direction || x.effect); }) : [];
    var serviceLevel = _percentText(opts.serviceLevel);
    var hasStructured = impacts.length || opts.interval || opts.direction || opts.effect || serviceLevel || opts.resume || (cause && (status === "delayed" || status === "suspended" || status === "notice" || status === "info"));
    if (!hasStructured) return null;

    var prefix = lineName ? lineName + (lang === "en" ? ": " : "：") : "";
    var pieces = [];
    if (serviceLevel) {
      pieces.push({
        zh: "约按正常班次的" + serviceLevel + "运行",
        ko: "통상 운행 횟수의 약 " + serviceLevel + " 수준으로 운행합니다",
        en: "operating at approximately " + serviceLevel + " of normal frequency"
      }[lang]);
    }

    if (impacts.length) {
      impacts.forEach(function(item) {
        var scope = _scopeText(item, lang);
        var effect = _effectPhrase(item.effect, status, lang);
        if (!effect) return;
        if (lang === "en") pieces.push(scope ? scope + ": " + effect : effect);
        else pieces.push((scope ? scope + "：" : "") + effect);
      });
    } else {
      var scopeOnly = _scopeText({ interval: opts.interval, direction: opts.direction }, lang);
      var effectOnly = _effectPhrase(opts.effect, status, lang);
      if (effectOnly) {
        if (lang === "en") pieces.push(scopeOnly ? scopeOnly + ": " + effectOnly : effectOnly);
        else pieces.push((scopeOnly ? scopeOnly + "：" : "") + effectOnly);
      }
    }

    if (!pieces.length) return null;
    var body = pieces.join(lang === "en" ? "; " : "。");
    if (cause) {
      if (lang === "zh") body = "因" + cause + "，" + body;
      else if (lang === "ko") body = cause + "으로 인해 " + body;
      else body = body + " due to " + cause;
    }
    if (opts.resume) {
      var resume = _normTime(opts.resume, lang);
      if (lang === "zh") body += "。预计恢复时间：" + resume;
      else if (lang === "ko") body += "。운전 재개 예상: " + resume;
      else body += "; estimated resumption: " + resume;
    }
    return prefix + body.replace(/。+/g, "。") + (lang === "en" ? "." : "。");
  }

  // ---- 主入口 ----
  function translate(text, opts, lang) {
    lang = (lang || window.currentLang || "ja").toLowerCase();
    opts = opts || {};
    if (!text || lang === "ja") return { translated: text, matched: false };
    // 正常状态文本不翻译（弹窗对 normal 已有统一状态显示；但"平常運転"仍翻译以保持正文一致）
    var t = String(text);
    // 1) 整句式模板
    for (var i = 0; i < TEMPLATES.length; i++) {
      var m = TEMPLATES[i].re.exec(t);
      if (m) {
        var lineName = opts.lineId ? (window.RailwayDB ? window.RailwayDB.resolveLineName(opts.lineId, lang) : "") : "";
        var out = TEMPLATES[i].build(m, lang, lineName);
        if (out) return { translated: out, matched: true };
      }
    }
    var structured = _structuredSummary(opts, lang);
    if (structured) return { translated: structured, matched: true, structured: true };
    // 2) Full-text fallback. Never replace the official body with a generic
    // status summary ("有运行情报" etc.). Translate every known fragment in
    // place and preserve all unmatched source text so no operational detail is
    // discarded. This keeps the official Japanese body as the factual source.
    var full = _replaceFragment(t, lang);
    return { translated: full, matched: full !== t, fullText: true };
  }

  var _remoteCache = {};
  // Public Lingva instances: no registration / API key required.
  // Try in order; local railway-aware translation remains the final fallback.
  var REMOTE_BASES = [
    "https://lingva.ml",
    "https://translate.igna.wtf",
    "https://translate.plausibility.cloud",
    "https://lingva.lunar.icu",
    "https://translate.projectsegfau.lt",
    "https://translate.dr460nf1r3.org",
    "https://lingva.garudalinux.org",
    "https://translate.jae.fi"
  ];
  function translateRemote(text, opts, lang) {
    lang = (lang || window.currentLang || "ja").toLowerCase();
    opts = opts || {};
    if (!text || lang === "ja") return Promise.resolve({ translated: text, matched: false, provider: "local" });
    var target = lang === "zh" ? "zh" : lang;
    var key = target + "\n" + text;
    if (_remoteCache[key]) return Promise.resolve(_remoteCache[key]);
    var fallback = translate(text, opts, lang);
    if (typeof fetch !== "function") return Promise.resolve(fallback);
    var i = 0;
    function attempt() {
      if (i >= REMOTE_BASES.length) return Promise.resolve(fallback);
      var base = REMOTE_BASES[i++];
      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = controller ? setTimeout(function(){ controller.abort(); }, 3500) : null;
      var url = base + "/api//" + encodeURIComponent(target) + "/" + encodeURIComponent(String(text));
      return fetch(url, { method:"GET", mode:"cors", signal: controller ? controller.signal : undefined })
        .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function(data){
          if (timer) clearTimeout(timer);
          if (!data || !data.translation) throw new Error("empty translation");
          var out = { translated:String(data.translation), matched:true, fullText:true, provider:"lingva", endpoint:base };
          _remoteCache[key] = out;
          return out;
        })
        .catch(function(){ if (timer) clearTimeout(timer); return attempt(); });
    }
    return attempt();
  }

  window.DelayTranslator = {
    translate: translate,
    translateRemote: translateRemote,
    translateFragment: _replaceFragment
  };
})();
