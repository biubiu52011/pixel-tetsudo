/* JR-West JR Tozai official train-number junction evidence.
 * Read-only Supabase Data API feed, loaded only in the JRTozai detail.
 * Never feeds position estimation, vehicle identity or exact PNG selection.
 */
(function() {
  "use strict";
  if (window.TrainCorridorEvidence) return;
  var URL = "https://pnupwfmgbtxqhpzsrhfn.supabase.co/rest/v1/" +
    "published_jrwest_tozai_2611_public_evidence?" +
    "select=source_template_id,calendar_urn,source_train_number,public_train_number," +
    "traversal_direction,continued_as_train_number,kyobashi_departure_clock," +
    "official_source_url,timetable_completeness&" +
    "order=kyobashi_departure_clock.asc&limit=100";
  var API_KEY = "sb_publishable_aY6j3dd1thLsVojyH776YA_8lojQxGy";
  var cached = null, fetchedAt = 0, inflight = null, generation = 0;
  var strings = {
    ja: {
      title:"確認済み直通列車番号（資料の一部）",
      loading:"出典資料を確認しています…",
      notice:"全日ダイヤや現在の列車位置ではありません。各列車の207系／321系・編成は未確認です。",
      fleet:"路線の車種候補（各列車の実車ではありません）：",
      expand:"資料と番号を表示",
      east:"JR東西線 → 学研都市線",
      west:"学研都市線 → JR東西線",
      weekday:"平日", holiday:"土休日",
      kyobashi:"京橋発", source:"公式時刻表",
      empty:"公開された照合資料がありません。運転本数が0本という意味ではありません。",
      error:"出典を読み込めませんでした。運転本数や実車は推定しません。"
    },
    zh: {
      title:"已核实的直通车次（部分来源）",
      loading:"正在读取来源证据…",
      notice:"不是全天时刻表，也不代表实时位置。各车次的207系／321系具体车型与编组均未确认。",
      fleet:"线路车型候选（非逐车实车）：",
      expand:"查看车次与官方出处",
      east:"JR东西线 → 学研都市线",
      west:"学研都市线 → JR东西线",
      weekday:"平日", holiday:"周末及节假日",
      kyobashi:"京桥发", source:"官方时刻表",
      empty:"没有可公开核对的来源，并不代表没有运行列车。",
      error:"目前无法加载来源证据，不推算列车数量或实际车型。"
    },
    en: {
      title:"Verified through-service numbers (partial sources)",
      loading:"Loading source evidence…",
      notice:"Not a complete timetable or live train positions. No individual 207/321 model or formation is verified.",
      fleet:"Route fleet candidates (not individual train assignments): ",
      expand:"Show numbers and official sources",
      east:"JR Tōzai → Gakkentoshi",
      west:"Gakkentoshi → JR Tōzai",
      weekday:"Weekday", holiday:"Weekend / holiday",
      kyobashi:"Kyōbashi dep.", source:"Official timetable",
      empty:"No published source evidence is available; this does not mean no trains operate.",
      error:"Source evidence could not load. No train count or stock is inferred."
    },
    ko: {
      title:"검증된 직통 열차번호(일부 자료)",
      loading:"출처 자료를 확인하는 중…",
      notice:"전일 시간표나 실시간 위치가 아닙니다. 열차별 207/321계 및 편성은 미확인입니다.",
      fleet:"노선 차량 후보(열차별 실제 차량 아님): ",
      expand:"열차번호와 공식 출처 보기",
      east:"JR 도자이선 → 갓켄토시선",
      west:"갓켄토시선 → JR 도자이선",
      weekday:"평일", holiday:"주말·공휴일",
      kyobashi:"교바시 출발", source:"공식 시간표",
      empty:"공개 자료가 없어도 운행 열차가 0편이라는 뜻은 아닙니다.",
      error:"출처 자료를 불러올 수 없습니다. 열차 수와 실제 차량은 추정하지 않습니다."
    }
  };
  function tr() { return strings[window.currentLang] || strings.ja; }
  function node(tag, text, className) {
    var el = document.createElement(tag);
    if (text != null) el.textContent = String(text);
    if (className) el.className = className;
    return el;
  }
  function validate(rows) {
    if (!Array.isArray(rows)) throw Error("INVALID_CORRIDOR_EVIDENCE");
    var seen = Object.create(null);
    return rows.filter(function(r) {
      if (!r || !Number.isSafeInteger(r.source_template_id) ||
          seen[r.source_template_id] ||
          !/^[0-9]{3,5}[A-Z]H?$/.test(String(r.source_train_number||"")) ||
          !/^[0-9]{3,5}[A-Z]H?$/.test(String(r.public_train_number||"")) ||
          (r.continued_as_train_number &&
           !/^[0-9]{3,5}[A-Z]$/.test(String(r.continued_as_train_number))) ||
          !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(r.kyobashi_departure_clock||"")) ||
          !["odpt.Calendar:Weekday","odpt.Calendar:SaturdayHoliday"].includes(r.calendar_urn) ||
          !["JRTozai_to_Gakkentoshi","Gakkentoshi_to_JRTozai"].includes(r.traversal_direction) ||
          r.timetable_completeness !== "partial_source_only" ||
          !/^https:\/\/timetable\.jr-odekake\.net\/train-timetable\/\d+\?date=20\d{6}$/.test(String(r.official_source_url||""))) {
        return false;
      }
      seen[r.source_template_id] = true;
      return true;
    });
  }
  function getRows() {
    if (cached && Date.now() - fetchedAt < 600000) return Promise.resolve(cached);
    if (inflight) return inflight;
    inflight = fetch(URL, {
      method:"GET", cache:"no-cache",
      headers:{"apikey":API_KEY,"Accept":"application/json"}
    }).then(function(response) {
      if (!response.ok) throw Error("CORRIDOR_SOURCE_HTTP_" + response.status);
      return response.json();
    }).then(function(rows) {
      cached = validate(rows); fetchedAt = Date.now();
      return cached;
    }).catch(function(error) {
      cached = null; throw error;
    }).finally(function() { inflight = null; });
    return inflight;
  }
  function render(host, rows) {
    var t = tr(), root = document.createDocumentFragment();
    root.appendChild(node("h3", t.title));
    root.appendChild(node("p", t.notice, "tp-evidence-note"));
    var preset = window.MajorVehicleFleetPresets &&
      window.MajorVehicleFleetPresets.lookup &&
      window.MajorVehicleFleetPresets.lookup("JRTozai","JR-West","odpt.TrainType:JR-West.Local");
    if (preset && preset.evidenceRole === "route-fleet-reference" &&
        Array.isArray(preset.vehicleCandidates) && preset.vehicleCandidates.length > 1) {
      root.appendChild(node("p",t.fleet + preset.vehicleCandidates.join(" / "),"tp-evidence-fleet"));
    }
    if (!rows.length) {
      root.appendChild(node("p",t.empty,"tp-evidence-note"));
      host.replaceChildren(root);
      return;
    }
    var details = node("details",null,"tp-evidence-details");
    details.appendChild(node("summary",t.expand+" ("+rows.length+")"));
    [["JRTozai_to_Gakkentoshi","east"],["Gakkentoshi_to_JRTozai","west"]].forEach(function(dir) {
      var list = rows.filter(function(row) { return row.traversal_direction === dir[0]; });
      if (!list.length) return;
      details.appendChild(node("h4", t[dir[1]]));
      var ul = node("ul");
      list.forEach(function(row) {
        var item = node("li");
        var train = row.continued_as_train_number
          ? row.public_train_number + " → " + row.continued_as_train_number
          : row.public_train_number;
        item.appendChild(node("strong",train));
        item.appendChild(node("span"," · "+(row.calendar_urn.endsWith("Weekday")?t.weekday:t.holiday)+
          " · "+t.kyobashi+" "+row.kyobashi_departure_clock+" · "));
        var link = node("a",t.source);
        link.href = row.official_source_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        item.appendChild(link);
        ul.appendChild(item);
      });
      details.appendChild(ul);
    });
    root.appendChild(details);
    host.replaceChildren(root);
  }
  function show(host, lineId) {
    var ticket = ++generation, t = tr();
    if (!host) return Promise.resolve(false);
    if (lineId !== "JRTozai") {
      host.hidden = true; host.replaceChildren();
      return Promise.resolve(false);
    }
    host.hidden = false;
    host.replaceChildren(node("p",t.loading,"tp-evidence-note"));
    return getRows().then(function(rows) {
      if (ticket !== generation) return false;
      render(host,rows);
      return true;
    }).catch(function() {
      if (ticket === generation) host.replaceChildren(node("p",tr().error,"tp-evidence-note"));
      return false;
    });
  }
  function hide(host) {
    ++generation;
    if (host) { host.hidden = true; host.replaceChildren(); }
  }
  window.TrainCorridorEvidence = {show:show,hide:hide};
})();