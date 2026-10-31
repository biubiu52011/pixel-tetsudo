function registerEvidenceProvider(provider) {
  if (!provider) return;
  if (window.TrainOperationEvidence && typeof window.TrainOperationEvidence.register === "function") {
    window.TrainOperationEvidence.register(provider);
    return;
  }
  (window.TRAIN_OPERATION_EVIDENCE_PROVIDERS || (window.TRAIN_OPERATION_EVIDENCE_PROVIDERS = [])).push(provider);
}

(function(){
  "use strict";
  if(window.TrainVehicle)return;
/* 列车运行证据注册表：证据按可追溯性分级。 */
  var providers = window.TRAIN_OPERATION_EVIDENCE_PROVIDERS ||
    (window.TRAIN_OPERATION_EVIDENCE_PROVIDERS = []);
  var evidenceRevision = 0;
  var VALID_GRADES = { A:true, B:true, C:true, D:true };
  function normalizeEvidence(provider, rec) {
    if (!provider || !rec) return null;
    var grade = String(rec.grade || provider.grade || '').toUpperCase();
    if (!VALID_GRADES[grade]) return null;
    var sourceUrl = rec.sourceUrl || provider.sourceUrl || '';
    var observedDate = rec.observedDate || rec.serviceDate || '';
    var provenance = rec.provenance || provider.provenance || '';
    return {
      operator: rec.operator || '',
      vehicleType: rec.vehicleType || '',
      vehicleCandidates: Array.isArray(rec.vehicleCandidates) ? rec.vehicleCandidates.slice() : [],
      formationId: rec.formationId || '',
      operationCode: rec.operationCode || '',
      grade: grade,
      sourceUrl: sourceUrl,
      provenance: provenance,
      observedDate: observedDate,
      providerId: provider.id,
      evidenceRole: rec.evidenceRole || '',
      planOverride: rec.planOverride === true,
      allowCandidateArtwork: rec.allowCandidateArtwork === true,
      // A/C 级运行证据可以决定日期分配；B 仅是结构性
      // 约束；D 只是线索，绝不能单独决定身份。
      decisive: (grade === 'A' || grade === 'C') && !!observedDate && !!sourceUrl
    };
  }

  function normalizeOperationCode(trainNumber, ctx) {
    ctx = ctx || {};
    var raw = String(trainNumber || "").toUpperCase().trim();
    // 东西线公开列车号在末尾保留运行号后缀。
    // 形式为末两位数字加所属字母：507K -> 07K、603K -> 03K、655S -> 55S，
    // A650T -> 50T。应先按该网络形式解析，再尝试通用显式形式。
    if (/Tozai|ChuoSobu|ToyoRapid|東西|中央.*総武|東葉/i.test([ctx.lineId,ctx.railway].join("|"))) {
      var tz = raw.match(/(?:^|[^0-9A-Z])(?:A|B)?\d*(\d{2})([KST])(?:R)?$/);
      if (tz) return tz[1] + tz[2];
    }
    // Metro 的 SQL 时刻表标识可能追加区段序号（如 B526K2）。
    // 仅在该网络范围内移除区段序号，并保留所属及运行后缀。
    if(/Yurakucho|Fukutoshin/.test([ctx.lineId,ctx.railway].join('|')) && /^[AB]\d{3,4}[KSMTG][12]$/.test(raw)) raw=raw.slice(0,-1);
    // 三田线使用“小时+运行号”形式，不带 Metro 的 A/B 前缀；Metro 数据源
    // 标识也可能在所属字母后追加区段序号。
    if(/Mita|Namboku|Hibiya|Hanzomon|Chiyoda|Asakusa|Shinjuku/.test([ctx.lineId,ctx.railway].join('|'))){
      var mn=raw.match(/^(?:A|B)?[0-9]*([0-9]{2})([KSMTGEHN])(?:[1-5]|[AB])?$/);
      if(mn) return mn[1]+mn[2];
    }
    // 直通线路沿用同一套公开的“小时+运行号”编码。
    if (/SaitamaRapid|TokyuMeguro|TokyuShinYokohama|TokyuToyoko|MinatoMirai|TokyuDenEn/.test([ctx.lineId,ctx.railway].join('|'))) {
      var through=raw.match(/^(?:A|B)?[0-9]*([0-9]{2})([KSMTGHN])(?:[1-5]|[AB])?$/);
      if(through)return through[1]+through[2];
    }
    // 京叶线/武藏野线的“小时+运行号”保留末两位数字及 A/Y/E 系列。
    if (/Keiyo|Musashino/.test([ctx.lineId,ctx.railway].join('|'))) {
      var km=raw.match(/^([0-9]{1,2})?([0-9]{2})([AYE])$/);
      if(km) {
        // 京叶线/武藏野线的公开偶数列车号与下一个奇数运行号共用
        // 运行号（00Y/00E -> 01Y/01E）；武藏野线直通列车
        // 例如 612E 就通过此规则对应到数据源运行号 13E。
        var working=parseInt(km[2],10);
        if(working%2===0)working++;
        return String(working).padStart(2,'0')+km[3];
      }
    }
    // 显式运行号形式在直通网络中不会丢失信息，且可安全复用。
    // 示例：03K、50T、02S、91G、A1291G、B691G。
    var explicit = raw.match(/(?:^|[^0-9A-Z])(?:A|B)?(\d{1,4})([A-Z])$/);
    if (explicit) {
      var digits = explicit[1];
      // A1291G/B691G 将运行号编码在末两位数字中。
      if (/^[AB]/.test(raw) && digits.length >= 3) digits = digits.slice(-2);
      return String(parseInt(digits, 10)).padStart(2, "0") + explicit[2];
    }
    return "";
  }

  function _uniqueEvidence(records, includeScalarFormation) {
    var identities = {};
    records.forEach(function(record) {
      var formation = Array.isArray(record.formationIds) ? record.formationIds.join("+")
        : includeScalarFormation ? (record.formationId || "") : "";
      identities[(record.vehicleType || "") + "|" + formation] = true;
    });
    return Object.keys(identities).length === 1 ? records[0] : null;
  }

  // SQL 证据域别名是唯一允许跨线路使用的身份别名。
  // 只规范名称拼写，绝不从列车号或运行号推断车型。
  function _evidenceNetworkToken(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  let networkAliasSource = null;
  let networkAliasEdges = Object.create(null);
  let networkMatchesCache = Object.create(null);
  function _evidenceNetworkMatches(networkKey, ctx) {
    ctx = ctx || {};
    const key = _evidenceNetworkToken(networkKey);
    if (!key) return false;
    const aliases = window.VEHICLE_NETWORK_ALIASES;
    if (aliases !== networkAliasSource) {
      networkAliasSource = aliases;
      networkAliasEdges = Object.create(null);
      networkMatchesCache = Object.create(null);
      (Array.isArray(aliases) ? aliases : []).forEach(function(row) {
        if (!row || (row.alias_scope !== 'evidence_domain' && row.alias_scope !== 'exact')) return;
        const canonical = _evidenceNetworkToken(row.canonical_network_key);
        const alias = _evidenceNetworkToken(row.alias_key);
        if (canonical && alias) {
          (networkAliasEdges[canonical] || (networkAliasEdges[canonical] = [])).push(alias);
          (networkAliasEdges[alias] || (networkAliasEdges[alias] = [])).push(canonical);
        }
      });
    }
    let accepted = networkMatchesCache[key];
    if (!accepted) {
      accepted = Object.create(null);
      accepted[key] = true;
      const pending = [key];
      for (let i = 0; i < pending.length; i++) {
        (networkAliasEdges[pending[i]] || []).forEach(function(alias) {
          if (!accepted[alias]) { accepted[alias] = true; pending.push(alias); }
        });
      }
      networkMatchesCache[key] = accepted;
    }
    return [ctx.lineId, ctx.railway].some(function(raw) {
      if (accepted[_evidenceNetworkToken(raw)]) return true;
      // 解析 ODPT railway 命名空间；任意后缀不构成身份。
      const railway = String(raw || '').match(/^odpt\.Railway:[^.]+\.(.+)$/);
      return !!(railway && accepted[_evidenceNetworkToken(railway[1])]);
    });
  }

  function register(provider) {
    if (!provider || !provider.id || typeof provider.resolveEvidence !== 'function') return false;
    for (var i = 0; i < providers.length; i++) {
      if (providers[i] && providers[i].id === provider.id) return false;
    }
    evidenceRevision++;
    providers.push(provider);
    return true;
  }

  // 规范数据提供器：单一提供器消费生成快照中的全部线路记录，
  // 线路专属证据应存放在数据中，而不是继续堆叠在 JS 分支里。
  function registerCanonicalSnapshotProvider() {
    var records = window.VEHICLE_OPERATION_EVIDENCE || [];
    if (!Array.isArray(records) || !records.length) return false;
    return register({
      id: "canonical-vehicle-operation-evidence",
      grade: "C",
      resolveEvidence: function(trainNumber, ctx) {
        ctx = ctx || {};
        var d = String(ctx.serviceDate || "").slice(0, 10);
        var n = String(trainNumber || "");
        var matches = [];
        for (var i=0;i<records.length;i++) {
          var r=records[i];
          if (!r || r.validDate !== d) continue;
          if (!_evidenceNetworkMatches(r.networkKey, ctx)) continue;
          var trainMatch = r.trainNumbers && r.trainNumbers.indexOf(n) >= 0;
          // ODPT 发布的京叶线/武藏野线公开列车号可能是 611Y，
          // 而运行证据使用运行号 11Y 作为键。
          // 仅在兜底时使用现有的网络范围规范化器；
          // 绝不能把无关列车号转换成运行号匹配。
          var normalizedOperation = ctx.operationCode || normalizeOperationCode(n, ctx);
          var derivedOperationMatch = ctx.operationCodeDerived === true &&
            /Keiyo|Musashino/.test([ctx.lineId, ctx.railway].join("|"));
          var opMatch = (!ctx.requireTrainNumberMatch || derivedOperationMatch) && normalizedOperation &&
            String(normalizedOperation) === String(r.operationCode);
          if (trainMatch || opMatch) matches.push(r);
        }
        if (!matches.length) return null;

        // 调用方提供服务时间时，优先使用显式时间区段。
        var t = String(ctx.serviceTime || ctx.currentTime || "").slice(0,5);
        if (t) {
          var hasTimedSegments = matches.some(function(r) {
            return !!(String(r.validFromTime || "").slice(0,5) || String(r.validToTime || "").slice(0,5));
          });
          var timed = matches.filter(function(r) {
            var from = String(r.validFromTime || "").slice(0,5);
            var to = String(r.validToTime || "").slice(0,5);
            if (!from && !to) return false;
            return (!from || t >= from) && (!to || t < to);
          });
          // 运行号/日期一旦被分段，服务时间就是身份的一部分。
          // 出现空档或重叠时必须保持未解析；绝不能退回到
          // “全天同车型”的合并结果。
          if (hasTimedSegments) {
            if (timed.length !== 1) return null;
            matches = timed;
          }
        }

        // 同一身份的重复证据可以安全合并；同一日期/运行号对应不同身份时，
        // 除非存在区段或精确列车号唯一解析，否则应视为歧义。
        // 绝不能简单返回第一个匹配项。
        var hit = _uniqueEvidence(matches, true);
        if (!hit) return null;
        return {operator:hit.operator,vehicleType:hit.vehicleType,
          formationId:hit.formationId || (Array.isArray(hit.formationIds) ? hit.formationIds.join(" / ") : ""),
          operationCode:hit.operationCode || normalizedOperation,grade:hit.grade||"C",sourceUrl:hit.sourceUrl||"",
          provenance:"canonical vehicle operation evidence snapshot",observedDate:d,
          evidenceRole:hit.evidenceRole||""};
      }
    });
  }



  // 规范的日期证据提供器：它仍属于现有时刻表证据通道，
  // 不是第三套车型来源。精确列车号证据
  // 与运行号证据同时存在时，优先级高于运行号证据。
  function registerCanonicalDatedProvider() {
    var records = window.VEHICLE_DATED_EVIDENCE || [];
    if (!Array.isArray(records) || !records.length) return false;
    return register({
      id: "canonical-dated-vehicle-evidence",
      grade: "C",
      resolveEvidence: function(trainNumber, ctx) {
        ctx = ctx || {};
        var d = String(ctx.serviceDate || "").slice(0,10);
        if (!d) return null;
        var n = String(trainNumber || "");
        var op = String(ctx.operationCode || normalizeOperationCode(n,ctx) || "");
        var exactTrain = [], operation = [];
        for (var i=0;i<records.length;i++) {
          var r=records[i];
          if (!r || r.validDate !== d || !_evidenceNetworkMatches(r.networkKey, ctx)) continue;
          if (r.trainNumber && String(r.trainNumber) === n) exactTrain.push(r);
          else if (!ctx.requireTrainNumberMatch && r.operationCode && op && String(r.operationCode) === op) operation.push(r);
        }
        var matches = exactTrain.length ? exactTrain : operation;
        if (!matches.length) return null;
        var hit = _uniqueEvidence(matches, false);
        if (!hit) return null;
        return {operator:hit.operator,vehicleType:hit.vehicleType,
          formationId:Array.isArray(hit.formationIds) ? hit.formationIds.join(" / ") : "",
          operationCode:hit.operationCode||op,grade:hit.grade||"C",sourceUrl:hit.sourceUrl||"",
          provenance:"canonical dated vehicle evidence snapshot",observedDate:hit.observedDate||d};
      }
    });
  }



  function familyPatternMatches(pattern, operationCode) {
    pattern=String(pattern||"").trim(); operationCode=String(operationCode||"").trim().toUpperCase();
    if (!pattern || !operationCode) return false;
    if (pattern.indexOf(",")>=0) {
      return pattern.split(",").some(function(part) {
        return familyPatternMatches(part, operationCode);
      });
    }
    if (pattern === "*") return true;
    if (/^\*[A-Z]$/.test(pattern)) return operationCode.endsWith(pattern.slice(1));
    if (/^[A-Z]\*$/.test(pattern)) return operationCode.startsWith(pattern.slice(0,1));
    var m=pattern.match(/^([A-Z]?)(\d+)([A-Z]?)-([A-Z]?)(\d+)([A-Z]?)(?:\s+(odd|even))?$/i);
    if (m) {
      var om=operationCode.match(/^([A-Z]?)(\d+)([A-Z]?)$/);
      if (!om) return false;
      var prefix=(m[1]||m[4]||"").toUpperCase(), suffix=(m[3]||m[6]||"").toUpperCase();
      if (prefix && om[1]!==prefix) return false;
      if (suffix && om[3]!==suffix) return false;
      var n=parseInt(om[2],10), lo=parseInt(m[2],10), hi=parseInt(m[5],10);
      if (n<lo || n>hi) return false;
      if (m[7]==="odd" && n%2!==1) return false;
      if (m[7]==="even" && n%2!==0) return false;
      return true;
    }
    return pattern.toUpperCase()===operationCode;
  }

  // 计划规则只约束已知行程，绝不识别
  // 实际编组，也不能进入日期/实际证据路径。
  function familyPlanScopeMatches(scope, ctx, operationCode) {
    if (!scope || scope.planOnly!==true || !ctx._plannedEvidenceMode) return false;
    var allowedKeys=['trainNumbers','operationPatterns','planOnly','overridePlan','lineIds','trainTypes','allStationOperators','anyStationOperators','anyStationNames','candidateLabelsAny'];
    if (Object.keys(scope).some(function(k){return allowedKeys.indexOf(k)<0;})) return false;
    var arrayKeys=allowedKeys.filter(function(k){return k!=="planOnly"&&k!=="overridePlan";});
    if (arrayKeys.some(function(k){return scope[k]!==undefined&&(!Array.isArray(scope[k])||!scope[k].length||scope[k].some(function(v){return typeof v!=="string"||!v;}));})) return false;
    if (scope.overridePlan!==undefined&&typeof scope.overridePlan!=="boolean") return false;
    if (scope.lineIds && scope.lineIds.indexOf(ctx.lineId)<0) return false;
    // 来源时刻表 ID 可以是数字或合成值；绝不能强制转换为运行号。
    if(scope.trainNumbers && scope.trainNumbers.indexOf(String(ctx.trainNumber||''))<0) return false;
    if(scope.operationPatterns && !scope.operationPatterns.some(function(pattern){
      return familyPatternMatches(pattern,operationCode||normalizeOperationCode(ctx.trainNumber,ctx));
    })) return false;
    var type=String(ctx.trainType||'').split(/[:.]/).pop();
    if (scope.trainTypes && (!type || scope.trainTypes.indexOf(type)<0)) return false;
    var labels=String(ctx.plannedCandidateLabel||'').split(/\s*\/\s*/);
    if (scope.candidateLabelsAny && !scope.candidateLabelsAny.some(function(v){return labels.indexOf(v)>=0;})) return false;
    var stations=[].concat(ctx.itineraryStations||[],ctx.originStation||[],ctx.destinationStation||[],ctx.fromStation||[],ctx.toStation||[])
      .filter(Boolean).map(function(v){return String(v);});
    function stationOp(v){var m=v.match(/^(?:odpt\.Station:)?([^.:]+)\.[^.]+\./);return m?m[1]:'';}
    if (scope.allStationOperators && (!stations.length || stations.some(function(v){return scope.allStationOperators.indexOf(stationOp(v))<0;}))) return false;
    if (scope.anyStationOperators && !stations.some(function(v){return scope.anyStationOperators.indexOf(stationOp(v))>=0;})) return false;
    function name(v){return v.split(/[:.]/).pop().replace(/[^a-z0-9]/gi,'').toLowerCase();}
    if (scope.anyStationNames && !stations.some(function(v){return scope.anyStationNames.some(function(n){return name(n)===name(v);});})) return false;
    return true;
  }

  function registerCanonicalFamilyRuleProvider() {
    var rules=window.VEHICLE_FAMILY_RULES||[];
    if (!Array.isArray(rules)||!rules.length) return false;
    // 在证据所属方内建立索引；日期/类型/行程仍按每次调用分别处理。
    var rulesByNetwork = Object.create(null);
    var indexedAliases = window.VEHICLE_NETWORK_ALIASES;
    return register({
      id:"canonical-vehicle-family-rules", grade:"B",
      resolveEvidence:function(trainNumber,ctx) {
        ctx=ctx||{}; var d=String(ctx.serviceDate||"").slice(0,10);
        var op=String(ctx.operationCode||normalizeOperationCode(trainNumber,ctx)||"");
        if (!d) return null;
        // ODPT 实时记录通常带服务日期，但没有日历标签。
        // 应根据日期解析来源的工作日/休息日类别，使
        // 实时记录与 SQL 记录使用一致的节假日/工作日规则。
        var cal=String(ctx.calendarType||"").toLowerCase();
        if(!cal && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
          var serviceDay=new Date(d+'T00:00:00Z').getUTCDay();
          cal=serviceDay===0||serviceDay===6?'holiday':'weekday';
        }
        var scopedPlanAvailable=false;
        // Plan-only scope matching must be enabled only for a planned lookup.
        // Realtime/fallback resolution still needs to see a source-backed
        // family rule on the same line; treating every call as planned made
        // a matching timetable scope set `scopedPlanAvailable` and discard
        // otherwise valid realtime fleet evidence.
        var plannedCtx=Object.assign({},ctx,{_plannedEvidenceMode:ctx._plannedEvidenceMode === true,trainNumber:String(trainNumber||ctx.trainNumber||"")});
        if (indexedAliases !== window.VEHICLE_NETWORK_ALIASES) {
          indexedAliases = window.VEHICLE_NETWORK_ALIASES;
          rulesByNetwork = Object.create(null);
        }
        var networkScope = JSON.stringify([ctx.lineId || '', ctx.railway || '']);
        var candidateRules = rulesByNetwork[networkScope];
        if (!candidateRules) {
          candidateRules = rules.filter(function(r) { return _evidenceNetworkMatches(r.networkKey, ctx); });
          rulesByNetwork[networkScope] = candidateRules;
        }
        var matches=candidateRules.filter(function(r){
          if (r.effectiveFrom && d<r.effectiveFrom) return false;
          if (r.effectiveTo && d>r.effectiveTo) return false;
          if (r.calendarType && (!cal || String(r.calendarType).toLowerCase()!==cal)) return false;
          if (r.realtimeOnly === true && (ctx._plannedEvidenceMode || ctx._plannedRun)) return false;
          // 实时车队事实可以限定适用的列车种别；例如常磐快速线的
          // 通勤车队规则不能吞掉同一线路展示中的特急 M 号。
          if (r.realtimeScope && Array.isArray(r.realtimeScope.trainTypes)) {
            var realtimeType = String(ctx.trainType || '').split(/[:.]/).pop();
            if (!realtimeType || r.realtimeScope.trainTypes.indexOf(realtimeType) < 0) return false;
          }
          if (r.realtimeScope && Array.isArray(r.realtimeScope.carCompositions)) {
            var realtimeComposition = Number(ctx.carComposition);
            if (!isFinite(realtimeComposition) || r.realtimeScope.carCompositions.indexOf(realtimeComposition) < 0) return false;
          }
          if (r.planScope && r.planScope.planOnly) {
            var scopeHit=familyPlanScopeMatches(r.planScope,plannedCtx,normalizeOperationCode(trainNumber,ctx)||op);
            if(scopeHit&&(r.planScope.operationPatterns||r.planScope.trainNumbers)&&r.planScope.overridePlan)scopedPlanAvailable=true;
            return ctx._plannedEvidenceMode&&scopeHit;
          }
          // Source-backed family rules may be authored against the public
          // realtime train number (for example 2253M) or the normalized
          // operation code (for example 53M). Accept either form; do not
          // synthesize a new number or borrow timetable evidence.
          var rawRealtimeNumber = String(trainNumber || "").toUpperCase();
          return r.codePattern === "*" ? true :
            ((!!op && familyPatternMatches(r.codePattern,op)) ||
             (!!rawRealtimeNumber && familyPatternMatches(r.codePattern,rawRealtimeNumber)));
        });
        // 针对工作日/节假日的运行表优先于同一服务日期的通用
        // 循环车队规则。没有这道门槛时，
        // 通用候选会重新并入唯一的节假日
        // 运行号，渲染器就会正确地永久保持灰色。
        var calendarMatches=matches.filter(function(r){
          return r.calendarType && String(r.calendarType).toLowerCase()===cal;
        });
        if(calendarMatches.length)matches=calendarMatches;
        // 循环车队计划不能仅因为调用方提供了今天的服务日期，
        // 就被当作有日期的实际观测。
        if(!ctx._plannedEvidenceMode&&scopedPlanAvailable)return null;
        if (!matches.length) return null;
        // 已发布的运行专属约束比车队计划更具体。
        var operationMatches=matches.filter(function(r){return !(r.planScope&&r.planScope.planOnly) && r.codePattern!=="*" && (r.exactVehicleType||(r.vehicleCandidates||[]).length);});
        var scopedWorking=matches.filter(function(r){return r.planScope&&r.planScope.planOnly&&r.planScope.overridePlan&&(r.planScope.operationPatterns||r.planScope.trainNumbers);});
        if(scopedWorking.length) matches=scopedWorking;
        else if (operationMatches.length) matches=operationMatches;
        var plannedOnly=matches.every(function(r){return r.planScope&&r.planScope.planOnly;});
        var overridePlan=plannedOnly&&matches.some(function(r){return r.planScope.overridePlan===true;});
        var exact={}; var candidates={}; var operators={};
        matches.forEach(function(r){
          if (r.operator) operators[r.operator]=true;
          if (r.exactVehicleType) exact[r.exactVehicleType]=r;
          (r.vehicleCandidates||[]).forEach(function(v){if(v)candidates[v]=true;});
        });
        var exactKeys=Object.keys(exact), candidateKeys=Object.keys(candidates), operatorKeys=Object.keys(operators);
        if (exactKeys.length===1) {
          var hit=exact[exactKeys[0]];
          return {operator:operatorKeys.length===1?operatorKeys[0]:"",vehicleType:exactKeys[0],
            vehicleCandidates:[exactKeys[0]],operationCode:op,grade:hit.grade||"B",sourceUrl:hit.sourceUrl||"",
            evidenceRole:plannedOnly?"timetable-plan":"",planOverride:overridePlan,
            provenance:"canonical operation family exact rule",observedDate:plannedOnly?"":d};
        }
        if (exactKeys.length>1) return null;
        if (candidateKeys.length) {
          var hit2=matches.find(function(r){return (r.vehicleCandidates||[]).length;})||matches[0];
          return {operator:operatorKeys.length===1?operatorKeys[0]:"",vehicleType:"",
            vehicleCandidates:candidateKeys,operationCode:op,grade:hit2.grade||"B",sourceUrl:hit2.sourceUrl||"",
            evidenceRole:plannedOnly?"timetable-plan":"",planOverride:overridePlan,
            allowCandidateArtwork:plannedOnly&&matches.some(function(r){
              return r.allowCandidateArtwork===true ||
                (r.networkKey==="tobu-limited-express" &&
                 r.sourceUrl==="https://loo-ool.com/rail/K/");
            }),
            provenance:"canonical operation family narrowed rule",observedDate:plannedOnly?"":d};
        }
        // 仅声明所属方的规则可以约束运营方，但绝不能凭空创造车型。
        var own=matches[0];
        return {operator:operatorKeys.length===1?operatorKeys[0]:"",vehicleType:"",vehicleCandidates:[],
          operationCode:op,grade:own.grade||"B",sourceUrl:own.sourceUrl||"",
          provenance:"canonical operation family ownership rule",observedDate:d};
      }
    });
  }




  // 根据精确的公开列车号、铁路、
  // 服务日历及生效时刻表修订版解析时刻表参考车型；这并不表示
  // 今天实际运行的编组，也不得反推任何运行号。
  function registerCanonicalReferenceProvider() {
    var rules = window.VEHICLE_REFERENCE_RULES || [];
    if (!Array.isArray(rules) || !rules.length) return false;
    var byNumber = Object.create(null);
    rules.forEach(function(r) {
      if (!r || !r.trainNumber || !r.sourceUrl || !r.effectiveFrom) return;
      (byNumber[r.trainNumber] || (byNumber[r.trainNumber] = [])).push(r);
    });
    return register({
      id: "canonical-timetable-reference-vehicles", grade: "C",
      resolveEvidence: function(trainNumber, ctx) {
        ctx = ctx || {};
        var n = String(trainNumber || "").trim();
        var day = String(ctx.serviceDate || "").slice(0, 10);
        var cal = String(ctx.calendarType || "").toLowerCase();
        if (!n || !day || !cal) return null;
        var hits = (byNumber[n] || []).filter(function(r) {
          return r.trainNumber === n &&
            r.calendarType === cal &&
            (!r.effectiveFrom || day >= r.effectiveFrom) &&
            (!r.effectiveTo || day <= r.effectiveTo) &&
            _evidenceNetworkMatches(r.networkKey, ctx);
        });
        if (!hits.length) return null;
        var models = {};
        hits.forEach(function(r) { if (r.vehicleType) models[r.vehicleType] = true; });
        if (Object.keys(models).length !== 1) return null;
        var hit = hits[0];
        return {
          operator: hit.operator || "", vehicleType: Object.keys(models)[0],
          grade: hit.grade || "C", sourceUrl: hit.sourceUrl || "",
          observedDate: ctx._plannedEvidenceMode ? "" : day, evidenceRole: "timetable-reference",
          provenance: "published timetable reference model (not live carset)"
        };
      }
    });
  }


  // 实时与时刻表估算共用一个证据解析器。实时
  // 记录可以使用同一服务日的日期列车号证据，但绝不能
  // 仅凭其他运行使用过的运行号借用实际编组。
  // 在使用时绑定规范来源：数据快照可能在本模块加载后才到达，
  // 也可能在页面保持打开时被替换。自定义线路
  // 提供器保留自身注册，只有发生变化的规范绑定会重置。
  var canonicalBindings = [{key:'VEHICLE_OPERATION_EVIDENCE',id:'canonical-vehicle-operation-evidence',register:registerCanonicalSnapshotProvider,source:null},
    {key:'VEHICLE_DATED_EVIDENCE',id:'canonical-dated-vehicle-evidence',register:registerCanonicalDatedProvider,source:null},
    {key:'VEHICLE_FAMILY_RULES',id:'canonical-vehicle-family-rules',register:registerCanonicalFamilyRuleProvider,source:null},
    {key:'VEHICLE_REFERENCE_RULES',id:'canonical-timetable-reference-vehicles',register:registerCanonicalReferenceProvider,source:null}];
  function ensureCanonicalProviders() {
    canonicalBindings.forEach(function(binding) {
      var source=window[binding.key]||null;
      if(source===binding.source)return;
      binding.source=source;
      evidenceRevision++;
      for(var i=providers.length-1;i>=0;i--)if(providers[i].id===binding.id)providers.splice(i,1);
      binding.register();
    });
  }
  ensureCanonicalProviders();

  function resolveEvidence(trainNumber, ctx, mode) {
    ensureCanonicalProviders();
    mode = mode || "fallback";
    var familyHit = null;
    var referenceHit = null;
    var runHits = [];
    // API/SQL 提供列车号；已注册的线路运行脚本
    // 解释其文档化运行号并提供车型证据。
    // 保持唯一仲裁路径；DataFusion 与渲染器不得绕过它。
    var inputCtx = ctx || {};
    var normalizedInputOperation = normalizeOperationCode(trainNumber, inputCtx);
    var providerCtx = Object.assign({}, inputCtx, {
      _plannedEvidenceMode: mode === "planned",
      operationCode: inputCtx.operationCode ||
        normalizedInputOperation,
      operationCodeDerived: !inputCtx.operationCode && !!normalizedInputOperation
    });
    function evidenceVehicleIdentityKey(value) {
      var raw = String(value || '').trim();
      if (!raw) return '';
      // Canonical snapshots may retain source-qualified labels such as
      // `JR E233系5000番台`, while family rules use the catalogue label
      // `E233系5000番台`. Compare their canonical vehicle identity before
      // declaring a realtime conflict; the returned evidence string is kept
      // intact and is normalized by TrainVehicle at the projection boundary.
      try {
        var canonicalResolver = window.TrainVehicle &&
          typeof window.TrainVehicle.resolveCanonicalVehicle === 'function'
          ? window.TrainVehicle.resolveCanonicalVehicle : null;
        var canonical = canonicalResolver ? canonicalResolver(raw) : null;
        if (canonical && canonical.id) return String(canonical.id);
      } catch (_) {}
      return raw;
    }
    if (mode === "realtime-derived") {
      providerCtx = Object.assign({}, providerCtx, { requireTrainNumberMatch: true });
    }
    for (var i = 0; i < providers.length; i++) {
      var provider = providers[i];
      if (!provider) continue;
      var isFamily = provider.id === "canonical-vehicle-family-rules";
      var isReference = provider.id === "canonical-timetable-reference-vehicles" ||
        provider.id === "jr-musashino-calendar-reference";
      var isCanonicalRun = provider.id === "canonical-dated-vehicle-evidence" ||
        provider.id === "canonical-vehicle-operation-evidence";
      // 其他已注册的线路专属脚本过去会被跳过，
      // 即使已经调用 register(provider) 也一样。应将其来源证据纳入同一条
      // 冲突/日期/候选检查路径，绝不能退化为图标或线路名称兜底。
      var rec = normalizeEvidence(provider, provider.resolveEvidence(trainNumber, providerCtx));
      if (!rec) continue;
      if (!isFamily && !isReference && !isCanonicalRun &&
          (!rec.sourceUrl || !rec.observedDate)) continue;
      if (isFamily) familyHit = rec;
      else if (isReference) referenceHit = rec;
      else runHits.push(rec);
    }

    if(mode==='planned') {
      // 路线兼容性排除仍然约束列车号计划。
      // 否则应先使用其公开运行号，再考虑宽泛的车队允许范围。
      return familyHit && familyHit.planOverride ? familyHit : (referenceHit || familyHit);
    }

    // 实时数据绝不把孤立运行号当作实际编组证明。
    // 上述规范日期提供器要求精确的公开列车号、
    // 当前服务日期、唯一车型/编组及可追溯来源。
    if (mode === "realtime-derived") {
      var liveIdentities = {};
      runHits.forEach(function(hit) {
        if (!hit.decisive || !hit.vehicleType) return;
        var formations = String(hit.formationId || "").split(/\s*\/\s*|\s*,\s*|\s*\|\s*/)
          .filter(Boolean).sort().join("|");
        liveIdentities[evidenceVehicleIdentityKey(hit.vehicleType) + "|" + formations] = hit;
      });
      var liveKeys = Object.keys(liveIdentities);
      // 同一车型对应不同实际编组时同样存在歧义。
      if (liveKeys.length > 1) return null;
      if (liveKeys.length === 1) {
        var liveHit = liveIdentities[liveKeys[0]];
        var liveName = liveHit.vehicleType;
        if (familyHit &&
            ((familyHit.vehicleType &&
              evidenceVehicleIdentityKey(familyHit.vehicleType) !== evidenceVehicleIdentityKey(liveName)) ||
             (familyHit.vehicleCandidates.length &&
              !familyHit.vehicleCandidates.some(function(candidate) {
                return evidenceVehicleIdentityKey(candidate) === evidenceVehicleIdentityKey(liveName);
              })))) return null;
        return liveHit;
      }
      // 发布的列车/日历参考属于运行计划，不能进入实时车型判定。
      // 实时只保留同一反馈车号命中的运行/所属方规则；没有这类
      // 直接证据时返回空，让实时列车保持 UNKNOWN，而不是借计划车型。
      if (referenceHit && familyHit && referenceHit.vehicleType &&
          ((familyHit.vehicleType && familyHit.vehicleType !== referenceHit.vehicleType) ||
           (familyHit.vehicleCandidates.length &&
            familyHit.vehicleCandidates.indexOf(referenceHit.vehicleType) < 0))) return null;
      return familyHit || null;
    }

    // A/C 级日期运行证据可以决定身份，但所有决定性提供器
    // 必须先达成一致，之后才能应用结构性约束。
    var exact = {};
    runHits.forEach(function(h){
      if (h.decisive && h.vehicleType) exact[h.vehicleType] = h;
    });
    var exactKeys = Object.keys(exact);
    if (exactKeys.length > 1) return null;

    var allowedVehicles = null;
    if (familyHit) {
      var familyVehicles = [];
      if (familyHit.vehicleType) familyVehicles.push(familyHit.vehicleType);
      (familyHit.vehicleCandidates || []).forEach(function(v){
        if (v && familyVehicles.indexOf(v) < 0) familyVehicles.push(v);
      });
      if (familyVehicles.length) allowedVehicles = familyVehicles;
    }

    if (exactKeys.length === 1) {
      var exactHit = exact[exactKeys[0]];
      // 结构/系列证据约束兜底身份；日期精确证据
      // 若落在兼容系列之外就是冲突，绝不能据此覆盖
      // 结构规则。
      if (allowedVehicles && allowedVehicles.indexOf(exactKeys[0]) < 0) return null;
      return exactHit;
    }

    // 精确的日期运行观测优先于计划参考；匹配的
    // 参考可以为任意目的地补足缺失的车型身份。
    if (referenceHit) return referenceHit;

    // 一条有文档、日期有效且车队唯一的 A 级事实，就足以决定
    // 时刻表估算中的身份，和实时推导的身份一样。
    // 这不是通用的线路/运营方默认值：B/C 级系列分配
    // 仍然只是约束，任何冲突的日期运行候选都会阻止该结论。
    if (familyHit && familyHit.grade === "A" && familyHit.decisive &&
        familyHit.vehicleType && familyHit.sourceUrl &&
        allowedVehicles && allowedVehicles.length === 1) {
      var incompatible = runHits.some(function(h) {
        if (h.vehicleType && h.vehicleType !== familyHit.vehicleType) return true;
        return (h.vehicleCandidates || []).some(function(v) {
          return v && v !== familyHit.vehicleType;
        });
      });
      if (!incompatible) return familyHit;
    }

    // 没有决定性的运行级精确证据时，只保留与
    // 结构系列兼容的候选。候选证据绝不能伪造 EXACT 结果。
    var candidates = {};
    runHits.forEach(function(h){
      (h.vehicleCandidates || []).forEach(function(v){
        if (v && (!allowedVehicles || allowedVehicles.indexOf(v) >= 0)) candidates[v] = true;
      });
    });
    var candidateKeys = Object.keys(candidates);
    if (!candidateKeys.length) {
      // 在兜底模式中，B/C 结构证据仍然只是约束，绝不能成为
      // 独立的运行分配（包括仅声明所属方的系列规则）。
      return null;
    }
    var first = runHits[0] || familyHit;
    if (!first) return null;
    first.vehicleType = "";
    first.vehicleCandidates = candidateKeys;
    return first;
  }


  window.TrainOperationEvidence = {
    getRevision: function(){ensureCanonicalProviders();return evidenceRevision;},
    matchesNetwork: _evidenceNetworkMatches,
    register: register,
    normalizeEvidence: normalizeEvidence,
    normalizeOperationCode: normalizeOperationCode,
    resolveEvidence: resolveEvidence,
    providers: providers,
    policy: {
      requireTraceableSourceForDecisiveEvidence: true,
      allowCuratedEnthusiastRunEvidence: true,
      structuralEvidenceIsConstraintOnly: true,
      isolatedObservationIsNonDecisive: true,
      forbidLineDefault: true,
      forbidNumberRangeGuess: true,
      forbidPrefixGuessWithoutProviderEvidence: true,
      forbidHashAssignment: true
    }
  };

  console.debug('[TrainVehicle] evidence registry ready (merged runtime)');

/* 统一车型身份与 PNG 图片运行时模块。 */
(function() {
  "use strict";

  function _splitFormationIds(value) {
    return String(value || "").split(/\s*\/\s*|\s*,\s*|\s*\|\s*/)
      .map(function(v) { return v.trim(); }).filter(Boolean);
  }

var CANONICAL_VEHICLES = {
  "enoden-1000": {
    displayName: "江ノ島電鉄1000形",
    iconName: "江ノ島電鉄1000形",
    asset: "../images/列车/江ノ島電鉄/江ノ島電鉄_1000形.png",
    lineIds: ["Enoshima"],
    lineAliases: { "Enoshima": ["1000形"] },
    aliases: ["江ノ電1000形", "1000形（江ノ島電鉄）"]
  },
  "enoden-10": {
    displayName: "江ノ島電鉄10形",
    iconName: "江ノ島電鉄10形",
    asset: "../images/列车/江ノ島電鉄/江ノ島電鉄_10形.png",
    lineIds: ["Enoshima"],
    lineAliases: { "Enoshima": ["10形"] },
    aliases: ["江ノ電10形", "10形（江ノ島電鉄）"]
  },
  "enoden-2000": {
    displayName: "江ノ島電鉄2000形",
    iconName: "江ノ島電鉄2000形",
    asset: "../images/列车/江ノ島電鉄/江ノ島電鉄_2000形.png",
    lineIds: ["Enoshima"],
    lineAliases: { "Enoshima": ["2000形"] },
    aliases: ["江ノ電2000形", "2000形（江ノ島電鉄）"]
  },
  "enoden-20": {
    displayName: "江ノ島電鉄20形",
    iconName: "江ノ島電鉄20形",
    asset: "../images/列车/江ノ島電鉄/江ノ島電鉄_20形.png",
    lineIds: ["Enoshima"],
    lineAliases: { "Enoshima": ["20形"] },
    aliases: ["江ノ電20形", "20形（江ノ島電鉄）"]
  },
  "enoden-300": {
    displayName: "江ノ島電鉄300形",
    iconName: "江ノ島電鉄300形",
    asset: "../images/列车/江ノ島電鉄/江ノ島電鉄_300形.png",
    lineIds: ["Enoshima"],
    lineAliases: { "Enoshima": ["300形"] },
    aliases: ["江ノ電300形", "300形（江ノ島電鉄）"]
  },
  "enoden-500": {
    displayName: "江ノ島電鉄500形",
    iconName: "江ノ島電鉄500形",
    asset: "../images/列车/江ノ島電鉄/江ノ島電鉄_500形.png",
    lineIds: ["Enoshima"],
    lineAliases: { "Enoshima": ["500形"] },
    aliases: ["江ノ電500形", "500形（江ノ島電鉄）"]
  },
  "enoden-700": {
    displayName: "江ノ島電鉄700形",
    iconName: "江ノ島電鉄700形",
    asset: "../images/列车/江ノ島電鉄/江ノ島電鉄_700形.png",
    lineIds: ["Enoshima"],
    lineAliases: { "Enoshima": ["700形"] },
    aliases: ["江ノ電700形", "700形（江ノ島電鉄）"]
  },
  "jr-e233-1000": {
    displayName:"E233系1000番台", iconName:"E233系1000番台",
    asset:"../images/列车/JR東日本/JR東日本_E233系_1000番台.png",
    lineIds:["KeihinTohokuNegishi"],
    aliases:["JR東日本E233系1000番台","JR E233系1000番台"]
  },
  "jr-e233-6000": {
    displayName:"E233系6000番台", iconName:"E233系6000番台",
    asset:"../images/列车/JR東日本/JR東日本_E233系_6000番台.png",
    lineIds:["Yokohama"],lineAliases:{Yokohama:["E233系6000番台"]},
    aliases:["JR東日本E233系6000番台","JR E233系6000番台"]
  },
  "jr-e131-500": {
    displayName:"E131系500番台", iconName:"E131系500番台",
    asset:"../images/列车/JR東日本/JR東日本_E131系_500番台.png",
    lineIds:["Sagami"],lineAliases:{Sagami:["E131系500番台"]},
    aliases:["JR東日本E131系500番台","JR E131系500番台"]
  },
  "jr-e131-600": {
    displayName:"E131系600番台", iconName:"E131系600番台",
    asset:"../images/列车/JR東日本/JR東日本_E131系_600番台.png",
    lineIds:["Utsunomiya"],lineAliases:{Utsunomiya:["E131系600番台"]},
    aliases:["JR東日本E131系600番台","JR E131系600番台"]
  },
  "jr-e131-800": {
    displayName:"E131系800番台", iconName:"E131系800番台",
    asset:"../images/列车/JR東日本/JR東日本_E131系_800番台.png",
    aliases:["JR東日本E131系800番台","JR E131系800番台"]
  },
  "jr-e131-1000": {
    displayName:"E131系1000番台", iconName:"E131系1000番台",
    asset:"../images/列车/JR東日本/JR東日本_E131系_1000番台.png",
    lineIds:["ChuoMain","Shinonoi","Shinetsu"],lineAliases:{ChuoMain:["E131系1000番台"],Shinonoi:["E131系1000番台"],Shinetsu:["E131系1000番台"]},
    aliases:["JR東日本E131系1000番台","JR E131系1000番台"]
  },
  "metro-2000": {
    displayName:"東京メトロ2000系", iconName:"東京メトロ2000系",
    asset:"../images/列车/東京メトロ/東京メトロ_2000系.png",
    lineIds:["Marunouchi"],lineAliases:{Marunouchi:["東京メトロ2000系"]},
    aliases:["東京メトロ 2000系"]
  },
  "metro-1000": {
    displayName:"東京メトロ1000系", iconName:"東京メトロ1000系",
    asset:"../images/列车/東京メトロ/東京メトロ_1000系.png",
    lineIds:["Ginza"],lineAliases:{Ginza:["東京メトロ1000系"]},
    aliases:["東京メトロ 1000系"]
  },
  "jr-e353": {
    displayName:"E353系", iconName:"E353系",
    asset:"../images/列车/JR東日本/JR東日本_E353系.png",
    lineIds:["ChuoMain", "ChuoRapid", "Chuo", "Oito"],lineAliases:{ChuoMain:["E353系"], ChuoRapid:["E353系"], Chuo:["E353系"], Oito:["E353系（あずさ）"]},
    aliases:["JR東日本E353系","JR E353系","E353系（あずさ・かいじ）","E353系（あずさ・富士回遊）"]
  },
  // JR 东日本中央快速线标准车型；不推断涂装、编组或具体车辆。
  "jr-e233-0": {
    displayName: "E233系0番台", iconName: "E233系0番台",
    asset: "../images/列车/JR東日本/JR東日本_E233系_0番台.png",
    lineIds: ["ChuoMain", "ChuoRapid", "Chuo", "Ome", "Itsukaichi"],
    lineAliases: {
      ChuoMain: ["E233系0番台"],
      ChuoRapid: ["E233系0番台"],
      Chuo: ["E233系0番台"],
      Ome: ["E233系0番台"],
      Itsukaichi: ["E233系0番台"]
    },
    aliases: ["JR東日本E233系0番台", "JR E233系0番台"]
  },
  // 官方身份来源：https://www.tokyometro.jp/corporate/enterprise/passenger_rail/cars/working/chiyoda_05/index.html
  "metro-05-chiyoda-shuttle": {
    displayName:"東京メトロ05系（千代田支線）",iconName:"東京メトロ05系（千代田支線）",
    asset:"../images/列车/東京メトロ/東京メトロ_05系_区間列車車両.png",
    lineIds:["ChiyodaBranch"],lineAliases:{ChiyodaBranch:["東京メトロ05系"]},
    aliases:["東京メトロ05系（区間列車車両）"]
  },
  "new-shuttle-2000-01": { displayName: "埼玉新都市交通2000系（01編成）", iconName: "埼玉新都市交通2000系（01編成）", asset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2000系_01編成_レッドパープル.png", aliases: ["2000系（01編成）","埼玉新都市交通2000系（01編成）"] },
  "new-shuttle-2000-02": { displayName: "埼玉新都市交通2000系（02編成）", iconName: "埼玉新都市交通2000系（02編成）", asset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2000系_02編成_オレンジ.png", aliases: ["2000系（02編成）","埼玉新都市交通2000系（02編成）"] },
  "new-shuttle-2000-03": { displayName: "埼玉新都市交通2000系（03編成）", iconName: "埼玉新都市交通2000系（03編成）", asset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2000系_03編成_グリーン.png", aliases: ["2000系（03編成）","埼玉新都市交通2000系（03編成）"] },
  "new-shuttle-2000-04": { displayName: "埼玉新都市交通2000系（04編成）", iconName: "埼玉新都市交通2000系（04編成）", asset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2000系_04編成_イエロー.png", aliases: ["2000系（04編成）","埼玉新都市交通2000系（04編成）"] },
  "new-shuttle-2000-05": { displayName: "埼玉新都市交通2000系（05編成）", iconName: "埼玉新都市交通2000系（05編成）", asset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2000系_05編成_ブルー.png", aliases: ["2000系（05編成）","埼玉新都市交通2000系（05編成）"] },
  "new-shuttle-2000-06": { displayName: "埼玉新都市交通2000系（06編成）", iconName: "埼玉新都市交通2000系（06編成）", asset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2000系_06編成_レッド.png", aliases: ["2000系（06編成）","埼玉新都市交通2000系（06編成）"] },
  "new-shuttle-2000-07": { displayName: "埼玉新都市交通2000系（07編成）", iconName: "埼玉新都市交通2000系（07編成）", asset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2000系_07編成_さくら色.png", aliases: ["2000系（07編成）","埼玉新都市交通2000系（07編成）"] },

  "keikyu-1500": { displayName: "京急1500形", iconName: "京急1500形", asset: "../images/列车/京浜急行電鉄/京浜急行電鉄_1500形.png", aliases: ["京急1500形","京浜急行電鉄1500形"] },
  "keikyu-600": { displayName: "京急600形", iconName: "京急600形", asset: "../images/列车/京浜急行電鉄/京浜急行電鉄_600形.png", aliases: ["京急600形","京浜急行電鉄600形"] },
  "keisei-3000": { displayName: "京成3000形", iconName: "京成3000形", asset: "../images/列车/京成電鉄/京成電鉄_3000形.png", aliases: ["京成3000形","京成電鉄3000形"] },
  "keisei-3100": { displayName: "京成3100形", iconName: "京成3100形", asset: "../images/列车/京成電鉄/京成電鉄_3100形.png", aliases: ["京成3100形","京成電鉄3100形"] },
  "keisei-3200": {"displayName":"京成3200形","iconName":"京成3200形","asset":null,"plannedAsset":"../images/列车/京成電鉄/京成電鉄_3200形.png","aliases":["京成電鉄3200形"]},
  "keisei-3500-updated": {"displayName":"京成3500形（更新車）","iconName":"京成3500形（更新車）","asset":null,"plannedAsset":"../images/列车/京成電鉄/京成電鉄_3500形更新車.png","aliases":["京成電鉄3500形（更新車）"]},
  "keisei-3600": {"displayName":"京成3600形","iconName":"京成3600形","asset":null,"plannedAsset":"../images/列车/京成電鉄/京成電鉄_3600形.png","aliases":["京成電鉄3600形"]},
  "keisei-80000": {"displayName":"京成80000形","iconName":"京成80000形","asset":null,"plannedAsset":"../images/列车/京成電鉄/京成電鉄_80000形.png","aliases":["京成電鉄80000形"]},
  "keisei-8800": {"displayName":"京成8800形","iconName":"京成8800形","asset":null,"plannedAsset":"../images/列车/京成電鉄/京成電鉄_8800形.png","aliases":["京成電鉄8800形"]},
  "keisei-8900": {"displayName":"京成8900形","iconName":"京成8900形","asset":null,"plannedAsset":"../images/列车/京成電鉄/京成電鉄_8900形.png","aliases":["京成電鉄8900形"]},
  "keisei-3400": { displayName: "京成3400形", iconName: "京成3400形", asset: "../images/列车/京成電鉄/京成電鉄_3400形.png", aliases: ["京成3400形","京成電鉄3400形"] },
  "keisei-3700": { displayName: "京成3700形", iconName: "京成3700形", asset: "../images/列车/京成電鉄/京成電鉄_3700形.png", aliases: ["京成3700形","京成電鉄3700形"] },
  "keio-5000": { displayName: "京王5000系", iconName: "京王5000系", asset: "../images/列车/京王電鉄/京王電鉄_5000系.png", lineIds: ["KeioMain","KeioTakao","KeioSagami","Shinjuku"], lineAliases: { KeioMain: ["5000系"], KeioTakao: ["5000系"], KeioSagami: ["5000系"], Shinjuku: ["5000系"] }, aliases: ["京王5000系","京王電鉄5000系"] },
  "odakyu-4000": { displayName: "小田急4000形", iconName: "小田急4000形", asset: "../images/列车/小田急電鉄/小田急電鉄_4000形_標準色.png", allowCrossOperator: true, aliases: ["小田急4000形","小田急電鉄4000形"] },
  "metro-16000": {
    displayName: "東京メトロ16000系", iconName: "東京メトロ16000系",
    asset: "../images/列车/東京メトロ/東京メトロ_16000系.png",
    lineIds: ["Chiyoda", "ChiyodaBranch", "JobanLocal"],
    lineAliases: { Chiyoda: ["東京メトロ16000系"], ChiyodaBranch: ["東京メトロ16000系"], JobanLocal: ["東京メトロ16000系"] },
    aliases: ["東京メトロ 16000系"]
  },
  "metro-07-10": { displayName: "東京メトロ07系", iconName: "東京メトロ07系", asset: "../images/列车/東京メトロ/東京メトロ_07系.png", lineIds: ["Tozai"], lineAliases: { Tozai: ["東京メトロ07系"] }, aliases: ["東京メトロ07系(10両)","東京メトロ07系"] },
  "metro-15000-10": { displayName: "東京メトロ15000系", iconName: "東京メトロ15000系", asset: "../images/列车/東京メトロ/東京メトロ_15000系.png", lineIds: ["Tozai"], lineAliases: { Tozai: ["東京メトロ15000系"] }, aliases: ["東京メトロ15000系(10両)","東京メトロ15000系"] },
  "tokyu-2020-10": { displayName: "東急2020系", iconName: "東急2020系", asset: "../images/列车/東急電鉄/東急電鉄_2020系.png", aliases: ["東急2020系(10両)","東急2020系"] },
  "tokyu-5080": { displayName: "東急5080系", iconName: "東急5080系", asset: "../images/列车/東急電鉄/東急電鉄_5080系.png", aliases: ["東急5080系"] },
  "tokyu-6020": { displayName: "東急6020系", iconName: "東急6020系", asset: "../images/列车/東急電鉄/東急電鉄_6020系.png", aliases: ["東急6020系(5両)","東急6020系(7両)","東急6020系"] },
  "tokyu-6000": { displayName: "東急6000系", iconName: "東急6000系", asset: "../images/列车/東急電鉄/東急電鉄_6000系.png", lineIds: ["TokyuOimachi"], aliases: ["東急6000系"] },
  "tokyu-9000": { displayName: "東急9000系", iconName: "東急9000系", asset: "../images/列车/東急電鉄/東急電鉄_9000系.png", lineIds: ["TokyuOimachi"], aliases: ["東急9000系"] },
  "tokyu-9020-plan": { displayName: "東急9020系", iconName: "東急9020系", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_9000系.png", lineIds: ["TokyuOimachi"], aliases: ["東急9020系"] },
  "tokyu-7000": { displayName: "東急7000系", iconName: "東急7000系", asset: "../images/列车/東急電鉄/東急電鉄_7000系.png", aliases: ["東急7000系"] },
  "tokyu-1000-1500-plan": { displayName: "東急1000系1500番台", iconName: "東急1000系1500番台", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_1000系_1500番台_1504F.png", aliases: ["東急1000系1500番台"] },
  "tobu-50000-10": { displayName: "東武50000系", iconName: "東武50000系", asset: "../images/列车/東武鉄道/東武鉄道_50000型.png", lineIds: ["Tojo"], aliases: ["東武50000系(10両)","東武50000系"] },
  "tobu-50050-10": { displayName: "東武50050系", iconName: "東武50050系", asset: "../images/列车/東武鉄道/東武鉄道_50050型.png", aliases: ["東武50050系(10両)","東武50050系"] },
  "tobu-30000": { displayName: "東武30000系", iconName: "東武30000系", asset: "../images/列车/東武鉄道/東武鉄道_30000系.png", lineIds: ["TobuIsesaki", "TobuSkytree", "Tojo"], aliases: ["東武30000系"] },
  "tobu-70000": { displayName: "東武70000系", iconName: "東武70000系", asset: "../images/列车/東武鉄道/東武鉄道_70000系.png", lineIds: ["TobuIsesaki", "TobuSkytree", "Hibiya"], aliases: ["東武70000系"] },
  "tobu-70090": { displayName: "東武70090型", iconName: "東武70090型", asset: "../images/列车/東武鉄道/東武鉄道_70090型.png", aliases: ["東武70090型","東武70090系","東武70090系（TH-LINER）","東武70090系(TH-LINER)",
      "東武70090系（THライナー専用・日比谷線直通）"] },
  "sotetsu-13000-8": { displayName: "相鉄13000系", iconName: "相鉄13000系", asset: "../images/列车/相模鉄道/相模鉄道_13000系_YOKOHAMA_NAVYBLUE.png", aliases: ["相鉄13000系(8両)","相鉄13000系"] },
  "sotetsu-20000-10": { displayName: "相鉄20000系", iconName: "相鉄20000系", asset: "../images/列车/相模鉄道/相模鉄道_20000系_YOKOHAMA_NAVYBLUE.png", lineIds:["Toyoko","TokyuMeguro","Mita","Namboku"], aliases: ["相鉄20000系(10両)","相鉄20000系（10両）"] },
  "sotetsu-21000": { displayName: "相鉄21000系", iconName: "相鉄21000系", asset: "../images/列车/相模鉄道/相模鉄道_21000系.png", lineIds:["Meguro","TokyuMeguro","Mita","Namboku"], aliases: ["相鉄21000系", "相鉄21000系(8両)"] },

  "jr-east-209-500-keiyo": {
    displayName: "209系500番台（京葉線）",
    iconName: "209系500番台（京葉線）",
    asset: "../images/列车/JR東日本/JR東日本_209系_500番台_京葉線.png",
    lineIds: ["Keiyo"],
    lineAliases: { Keiyo: ["209系500番台"] },
    aliases: ["209系500番台（京葉線）", "JR 209系500番台", "JR東日本209系500番台"]
  },
  "sotetsu-12000": {
    displayName: "相鉄12000系",
    iconName: "相鉄12000系",
    asset: "../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png",
    aliases: ["相模鉄道12000系", "相鉄12000系", "相鉄12000系(10両)"]
  },
  "odakyu-5000": {
    displayName: "小田急5000形",
    iconName: "小田急5000形",
    asset: "../images/列车/小田急電鉄/小田急電鉄_5000形_標準色.png",
    aliases: ["小田急5000形", "小田急電鉄5000形"]
  },
  "jr-east-e235-0-yamanote": {
    displayName: "E235系0番台（山手線）",
    iconName: "E235系山手線",
    asset: "../images/列车/JR東日本/JR東日本_E235系_0番台.png",
    lineIds: ["Yamanote"],
    lineAliases: { Yamanote: ["E235系"] },
    aliases: ["E235系0番台（山手線）", "E235系山手線", "JR E235系0番台"]
  },
  "jr-east-e231-800-tozai-through": {
    displayName: "E231系800番台（東西線直通）",
    iconName: "E231系800番台（東西線直通）",
    asset: "../images/列车/JR東日本/JR東日本_E231系_800番台.png",
    lineIds: ["Tozai"],
    lineAliases: { "Tozai": ["E231系800番台"] },
    aliases: ["E231系800番台（東西線直通）", "JR E231系800番台(10両)", "JR東日本E231系800番台"]
  },
  "toyo-rapid-2000-tozai-through": {
    displayName: "東葉高速2000系",
    iconName: "東葉高速鉄道2000系",
    asset: "../images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png",
    lineIds: ["Tozai"],
    aliases: ["東葉高速2000系", "東葉高速鉄道2000系", "東葉高速2000系(10両)"]
  },
  "jr-east-e233-2000-joban-local-chiyoda": {
    displayName: "E233系2000番台",
    iconName: "E233系2000番台",
    asset: "../images/列车/JR東日本/JR東日本_E233系_2000番台.png",
    lineIds: ["JobanLocal", "Chiyoda", "ChiyodaBranch"],
    lineAliases: { JobanLocal: ["E233系2000番台"], Chiyoda: ["E233系2000番台"], ChiyodaBranch: ["E233系2000番台"] },
    aliases: ["E233系2000番台", "JR東日本E233系2000番台", "JR E233系2000番台"]
  },
  "jr-east-e531-joban-medium": {
    displayName: "E531系",
    iconName: "E531系",
    asset: "../images/列车/JR東日本/JR東日本_E531系.png",
    lineIds: ["Joban", "JobanMain"],
    lineAliases: { Joban: ["E531系"], JobanMain: ["E531系"] },
    aliases: ["E531系"]
  },
  "jr-east-e501-mito": {
    displayName: "E501系",
    iconName: "E501系",
    asset: "../images/列车/JR東日本/JR東日本_E501系.png",
    lineIds: ["Mito"],
    lineAliases: { Mito: ["E501系"] },
    aliases: ["JR東日本E501系", "JR E501系"]
  },
  "jr-east-e531-3000-joban": {
    displayName: "E531系3000番台",
    iconName: "E531系3000番台",
    asset: "../images/列车/JR東日本/JR東日本_E531系_3000番台.png",
    lineIds: ["Joban", "JobanMain"],
    aliases: [
      "E531-3000",
      "E531系3000番台（常磐線）",
      "JR東日本E531系3000番台",
      "JR E531系3000番台"
    ]
  },
  // JR 东日本公开的常磐/常磐特急车型；仅使用标准车型图片，
  // 列车号或计划车型不能证明特殊涂装。
  // 来源：https://www.jreast.co.jp/train/express/hitachi_tokiwa.html
  "jr-east-e657-hitachi-tokiwa": {
    displayName: "E657系",
    iconName: "E657系",
    asset: "../images/列车/JR東日本/JR東日本_E657系.png",
    lineIds: ["JobanMain", "Joban", "JobanRapid"],
    lineAliases: { JobanMain: ["E657系", "E657系（ひたち・ときわ）", "E657系（ときわ・ひたち）"], Joban: ["E657系"], JobanRapid: ["E657系"] },
    aliases: ["JR東日本E657系", "JR E657系", "E657系（ひたち・ときわ）", "E657系（ときわ・ひたち）"]
  },
  "jr-east-e231-0-joban-rapid": {
    displayName: "E231系0番台",
    iconName: "E231系0番台",
    asset: "../images/列车/JR東日本/JR東日本_E231系_0番台.png",
    lineIds: ["Joban"],
    lineAliases: { Joban: ["E231系0番台"] },
    aliases: ["E231系0番台"]
  },
  "jr-east-e231-0-joban-rapid-led": {
    displayName: "E231系0番台（常磐快速線・LED）",
    iconName: "E231系0番台（常磐快速線・LED）",
    asset: "../images/列车/JR東日本/JR東日本_E231系_0番台_常磐快速線.png",
    lineIds: ["Joban", "JobanRapid"],
    lineAliases: { Joban: ["E231系0番台"], JobanRapid: ["E231系0番台（常磐快速線・LED）"] },
    aliases: ["E231系0番台（常磐快速線・LED）"]
  },
  "jr-east-e233-7000-saikyo": {
    displayName: "E233系7000番台",
    iconName: "E233系7000番台",
    asset: "../images/列车/JR東日本/JR東日本_E233系_7000番台.png",
    lineIds: ["SaikyoKawagoe", "Rinkai", "SotetsuJRDirect"],
    lineAliases: { SaikyoKawagoe: ["E233系7000番台"], Rinkai: ["E233系7000番台", "JR東日本E233系7000番台"], SotetsuJRDirect: ["E233系7000番台"] },
    aliases: ["E233系7000番台", "JR E233系7000番台", "JR東日本E233系7000番台"]
  },
  "twr-70-000-rinkai": {
    displayName: "東京臨海高速鉄道70-000形",
    iconName: "東京臨海高速鉄道70-000形",
    asset: "../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_70-000形.png",
    lineIds: ["Rinkai", "SaikyoKawagoe"],
    lineAliases: { Rinkai: ["東京臨海高速鉄道70-000形", "70-000形"], SaikyoKawagoe: ["東京臨海高速鉄道70-000形", "70-000形"] },
    aliases: ["東京臨海高速鉄道70-000形", "70-000形"]
  },
  "twr-71-000-rinkai": {
    displayName: "東京臨海高速鉄道71-000形",
    iconName: "東京臨海高速鉄道71-000形",
    asset: "../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_71-000形.png",
    lineIds: ["Rinkai", "SaikyoKawagoe"],
    lineAliases: { Rinkai: ["東京臨海高速鉄道71-000形", "71-000形"], SaikyoKawagoe: ["東京臨海高速鉄道71-000形", "71-000形"] },
    aliases: ["東京臨海高速鉄道71-000形", "71-000形"]
  },
  "jr-east-209-3500-hachiko-kawagoe": {
    displayName: "209系3500番台",
    iconName: "209系3500番台（八高・川越線）",
    asset: "../images/列车/JR東日本/JR東日本_209系_3500番台.png",
    lineIds: ["Hachiko", "Kawagoe"],
    lineAliases: { Hachiko: ["209系3500番台"], Kawagoe: ["209系3500番台"] },
    aliases: ["209系3500番台", "209系3500番台（八高・川越線）"]
  },
  "jr-east-209-3000-hachiko-kawagoe": {
    displayName: "209系3000番台",
    iconName: "209系3000番台（八高・川越線）",
    asset: null,
    plannedAsset: "../images/列车/JR東日本/JR東日本_209系_3000番台.png",
    lineIds: ["Hachiko", "Kawagoe"],
    lineAliases: { Hachiko: ["209系3000番台"], Kawagoe: ["209系3000番台"] },
    aliases: ["209系3000番台", "209系3000番台（八高・川越線）"]
  },
  "jr-east-209-3100-kawagoe": {
    displayName: "209系3100番台",
    iconName: "209系3100番台（川越線）",
    asset: null,
    plannedAsset: "../images/列车/JR東日本/JR東日本_209系_3100番台.png",
    lineIds: ["Kawagoe"],
    lineAliases: { Kawagoe: ["209系3100番台"] },
    aliases: ["209系3100番台", "209系3100番台（川越線）"]
  },
  "jr-east-e233-boso-converted": {
    displayName: "E233系（房総地区・改造車）",
    iconName: "E233系（房総地区・改造車）",
    asset: "../images/列车/JR東日本/JR東日本_E233系_房総地区_改造車.png",
    lineIds: ["Uchibo", "Sotobo", "Togane", "Narita", "SobuMain"],
    lineAliases: { Uchibo: ["E233系"], Sotobo: ["E233系"], Togane: ["E233系"], Narita: ["E233系"], SobuMain: ["E233系"] },
    aliases: ["JR東日本E233系（房総地区・改造車）"]
  },
  "jr-east-209-2000-2100-boso-keiyo": {
    displayName: "209系2000番台 / 2100番台",
    iconName: "209系2000番台 / 2100番台",
    asset: "../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png",
    lineIds: ["Uchibo", "Sotobo", "Togane", "Narita", "SobuMain"],
    lineAliases: { Uchibo: ["209系2000番台 / 2100番台"], Sotobo: ["209系2000番台 / 2100番台"], Togane: ["209系2000番台 / 2100番台"], Narita: ["209系2000番台 / 2100番台"], SobuMain: ["209系2000番台 / 2100番台"] },
    aliases: ["209系2000番台 / 2100番台"]
  },
  "planned-stock-library-0": {"displayName":"E233系8000番台","iconName":"E233系8000番台","asset":"../images/列车/JR東日本/JR東日本_E233系_8000番台.png","lineIds":["Nambu"],"aliases":["JR東日本E233系8000番台","JR E233系8000番台"]},
  "planned-stock-library-1": {"displayName":"E235系1000番台","iconName":"E235系1000番台","asset":"../images/列车/JR東日本/JR東日本_E235系_1000番台.png","lineIds":["Yokosuka","SobuRapid","SobuMain"],"aliases":["JR東日本E235系1000番台","JR E235系1000番台"]},
  "planned-stock-library-2": {"displayName":"E259系","iconName":"E259系","asset":"../images/列车/JR東日本/JR東日本_E259系.png","lineIds":["Yokosuka","SobuRapid","SobuMain","Narita","NaritaAirportBranch","ShonanShinjuku"],"aliases":["E259系（成田エクスプレス）","E259系（しおさい）","JR東日本E259系","JR E259系"]},
  "planned-stock-library-3": {"displayName":"E257系5500番台","iconName":"E257系5500番台","asset":"../images/列车/JR東日本/JR東日本_E257系_5500番台.png","lineIds":["Agatsuma","Joetsu","Takasaki"],"lineAliases":{"Agatsuma":["E257系5500番台","E257系（草津・四萬・あかぎ）"],"Joetsu":["E257系5500番台"],"Takasaki":["E257系5500番台"]},"aliases":["JR東日本E257系5500番台","JR E257系5500番台","E257系（草津・四萬・あかぎ）"]},
  "planned-stock-library-4": {"displayName":"E129系","iconName":"E129系","asset":"../images/列车/JR東日本/JR東日本_E129系.png","aliases":["JR東日本E129系","JR E129系"]},
      "planned-stock-library-5": {"displayName":"E127系0番台（南武支線）","iconName":"E127系0番台（南武支線）","asset":"../images/列车/JR東日本/JR東日本_E127系_0番台_南武支線.png","lineIds":["NambuBranch"],"lineAliases":{"NambuBranch":["E127系0番台"]},"aliases":["JR東日本E127系0番台（南武支線）","JR E127系0番台（南武支線）"]},
  "planned-stock-library-6": {"displayName":"E127系0番台（新潟地区）","iconName":"E127系0番台（新潟地区）","asset":"../images/列车/JR東日本/JR東日本_E127系_0番台_新潟色.png","aliases":["JR東日本E127系0番台（新潟地区）","JR E127系0番台（新潟地区）"]},
  "planned-stock-library-7": {"displayName":"211系（長野地区）","iconName":"211系（長野地区）","asset":"../images/列车/JR東日本/JR東日本_211系_長野色.png","lineIds":["ChuoMain","Shinonoi","Shinetsu"],"lineAliases":{"ChuoMain":["211系"],"Shinonoi":["211系"],"Shinetsu":["211系"]},"aliases":["JR東日本211系（長野地区）","JR 211系（長野地区）"]},
  "jr-east-211-takasaki": {"displayName":"211系（高崎地区）","iconName":"211系（高崎地区）","asset":"../images/列车/JR東日本/JR東日本_211系_湘南色.png","lineIds":["Takasaki","Ryomo","Joetsu"],"lineAliases":{"Takasaki":["211系"],"Ryomo":["211系"],"Joetsu":["211系"]},"aliases":["JR東日本211系（高崎地区）"]},
  "planned-stock-library-8": {"displayName":"701系5000番台","iconName":"701系5000番台","asset":"../images/列车/JR東日本/JR東日本_701系_5000番台.png","aliases":["JR東日本701系5000番台","JR 701系5000番台"]},
  "planned-stock-library-9": {"displayName":"701系5500番台","iconName":"701系5500番台","asset":"../images/列车/JR東日本/JR東日本_701系_5500番台.png","lineIds":["Yamagata"],"lineAliases":{"Yamagata":["701系5500番台"]},"aliases":["JR東日本701系5500番台","JR 701系5500番台"]},
  "planned-stock-library-10": {"displayName":"キハ110系","iconName":"キハ110系","asset":"../images/列车/JR東日本/JR東日本_キハ110系.png","aliases":["JR東日本キハ110系","JR キハ110系","キハ110系0番台（快速南三陸）","JR東日本キハ110系0番台（快速南三陸）"]},
  "jr-east-e131-0-plan": {"displayName":"E131系0番台","iconName":"E131系0番台","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_E131系_0番台.png","aliases":["JR東日本E131系0番台"]},
  "jr-east-kiha110-koumi-plan": {"displayName":"キハ110系（小海線）","iconName":"キハ110系（小海線）","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_キハ110系（小海線）.png","aliases":["JR東日本キハ110系（小海線）"]},
  "jr-east-kiha-e200-plan": {"displayName":"キハE200形","iconName":"キハE200形","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_キハE200系（小海線）.png","aliases":["JR東日本キハE200形"]},
  "jr-east-highrail1375-plan": {"displayName":"キハ100・110系（HIGH RAIL 1375）","iconName":"HIGH RAIL 1375","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_キハ100・110系_HIGH_RAIL_1375.png","aliases":["JR東日本キハ100・110系（HIGH RAIL 1375）"]},
  "planned-stock-library-11": {"displayName":"キハE130系0番台","iconName":"キハE130系0番台","asset":"../images/列车/JR東日本/JR東日本_キハE130系0番台.png","aliases":["JR東日本キハE130系0番台","JR キハE130系0番台"]},
  "planned-stock-library-12": {"displayName":"キハE130形100番台","iconName":"キハE130形100番台","asset":"../images/列车/JR東日本/JR東日本_キハE130系100番台.png","aliases":["キハE130系100番台","JR東日本キハE130形100番台","JR キハE130形100番台"]},
  "planned-stock-library-13": {"displayName":"キハE130形500番台","iconName":"キハE130形500番台","asset":"../images/列车/JR東日本/JR東日本_キハE130系500番台.png","aliases":["キハE130系500番台","JR東日本キハE130形500番台","JR キハE130形500番台"]},
  "planned-stock-library-14": {"displayName":"HB-E210系","iconName":"HB-E210系","asset":"../images/列车/JR東日本/JR東日本_HB-E210系.png","aliases":["JR東日本HB-E210系","JR HB-E210系"]},
  "planned-stock-library-15": {"displayName":"HB-E220系","iconName":"HB-E220系","asset":"../images/列车/JR東日本/JR東日本_HB-E220系.png","aliases":["JR東日本HB-E220系","JR HB-E220系"]},
  "planned-stock-library-16": {"displayName":"GV-E400系","iconName":"GV-E400系","asset":"../images/列车/JR東日本/JR東日本_GV-E400系.png","aliases":["JR東日本GV-E400系","JR GV-E400系"]},
  "planned-stock-library-17": {"displayName":"EV-E301系","iconName":"EV-E301系","asset":"../images/列车/JR東日本/JR東日本_EV-E301系.png","aliases":["EV-E301系（ACCUM）","JR東日本EV-E301系","JR EV-E301系"]},
  "planned-stock-library-18": {"displayName":"EV-E801系","iconName":"EV-E801系","asset":"../images/列车/JR東日本/JR東日本_EV-E801系.png","aliases":["EV-E801系（ACCUM）","JR東日本EV-E801系","JR EV-E801系"]},
  "planned-stock-library-19": {"displayName":"E5系","iconName":"E5系","asset":"../images/列车/JR東日本/JR東日本_E5系.png","aliases":["JR東日本E5系","JR E5系"]},
  "planned-stock-library-20": {"displayName":"E6系","iconName":"E6系","asset":"../images/列车/JR東日本/JR東日本_E6系.png","aliases":["JR東日本E6系","JR E6系"]},
  "planned-stock-library-21": {"displayName":"E7系","iconName":"E7系","asset":"../images/列车/JR東日本/JR東日本_E7系.png","aliases":["JR東日本E7系","JR E7系"]},
  "planned-stock-library-22": {"displayName":"E8系","iconName":"E8系","asset":"../images/列车/JR東日本/JR東日本_E8系.png","aliases":["JR東日本E8系","JR E8系"]},
  "planned-stock-library-23": {"displayName":"H5系","iconName":"H5系","asset":"../images/列车/JR北海道/JR北海道_H5系.png","aliases":[]},
  "planned-stock-library-24": {"displayName":"N700系（JR東海）","iconName":"N700系（JR東海）","asset":null,"plannedAsset":"../images/列车/JR東海/JR東海_N700系.png","lineIds":["TokaidoShinkansen"],"aliases":["JR東海N700系"]},
  "planned-stock-library-25": {"displayName":"N700系（JR西日本）","iconName":"N700系（JR西日本）","asset":null,"plannedAsset":"../images/列车/JR西日本/JR西日本_N700系.png","lineIds":["TokaidoShinkansen","SanyoShinkansen"],"aliases":["JR西日本N700系"]},
  "planned-stock-library-26": {"displayName":"N700系7000番台（JR西日本）","iconName":"N700系7000番台（JR西日本）","asset":"../images/列车/JR西日本/JR西日本_N700系_7000番台.png","lineIds":["SanyoShinkansen","KyushuShinkansen"],"aliases":["JR西日本N700系7000番台"]},
  "planned-stock-library-27": {"displayName":"500系（JR西日本）","iconName":"500系（JR西日本）","asset":"../images/列车/JR西日本/JR西日本_500系.png","lineIds":["SanyoShinkansen"],"aliases":["JR西日本500系"]},
  "planned-stock-library-28": {"displayName":"800系（JR九州）","iconName":"800系（JR九州）","asset":"../images/列车/JR九州/JR九州_800系.png","aliases":["JR九州800系"]},
  "planned-stock-library-29": {"displayName":"千葉都市モノレール0形","iconName":"千葉都市モノレール0形","asset":"../images/列车/千葉都市モノレール/千葉都市モノレール_0形.png","aliases":[]},
  "planned-stock-library-30": {"displayName":"千葉都市モノレール1000形","iconName":"千葉都市モノレール1000形","asset":"../images/列车/千葉都市モノレール/千葉都市モノレール_1000形.png","aliases":[]},
  "planned-stock-library-31": {"displayName":"ゆりかもめ7300系","iconName":"ゆりかもめ7300系","asset":"../images/列车/ゆりかもめ/ゆりかもめ_7300系.png","aliases":["7300系","7300系（7000系は全廃）"]},
  "planned-stock-library-32": {"displayName":"ゆりかもめ7500系","iconName":"ゆりかもめ7500系","asset":"../images/列车/ゆりかもめ/ゆりかもめ_7500系.png","aliases":["7500系","7500系（7000系は全廃）"]},
  "planned-stock-library-33": {"displayName":"横浜市営3000N形","iconName":"横浜市営3000N形","asset":"../images/列车/横浜市交通局/横浜市交通局_3000N形.png","aliases":["横浜市営地下鉄3000N形"]},
  "planned-stock-library-34": {"displayName":"横浜市営3000R形","iconName":"横浜市営3000R形","asset":"../images/列车/横浜市交通局/横浜市交通局_3000R形.png","aliases":["横浜市営地下鉄3000R形"]},
  "planned-stock-library-35": {"displayName":"横浜市営3000S形","iconName":"横浜市営3000S形","asset":"../images/列车/横浜市交通局/横浜市交通局_3000S形.png","aliases":["横浜市営地下鉄3000S形"]},
  "planned-stock-library-36": {"displayName":"横浜市営3000V形","iconName":"横浜市営3000V形","asset":"../images/列车/横浜市交通局/横浜市交通局_3000V形.png","aliases":["横浜市営地下鉄3000V形"]},
  "planned-stock-library-37": {"displayName":"横浜市営4000形","iconName":"横浜市営4000形","asset":"../images/列车/横浜市交通局/横浜市交通局_4000形.png","aliases":["横浜市営地下鉄4000形"]},
  "planned-stock-library-38": {"displayName":"横浜市営3000形","iconName":"横浜市営3000形","asset":null,"plannedAsset":"../images/列车/横浜市交通局/横浜市交通局_3000V形.png","aliases":[],"candidateOnly":true},
  "planned-stock-library-39": {"displayName":"横浜市営10000形","iconName":"横浜市営10000形","asset":null,"plannedAsset":"../images/列车/横浜市交通局/横浜市交通局_10000形_2次車.png","aliases":["横浜市営地下鉄10000形"]},
  "planned-stock-library-40": {"displayName":"東京モノレール10000形","iconName":"東京モノレール10000形","asset":"../images/列车/東京モノレール/東京モノレール_10000形.png","aliases":[]},
  "planned-stock-library-41": {"displayName":"東京モノレール2000形","iconName":"東京モノレール2000形","asset":"../images/列车/東京モノレール/東京モノレール_2000形.png","aliases":[]},
  "planned-stock-library-42": {"displayName":"東京モノレール1000形","iconName":"東京モノレール1000形","asset":null,"plannedAsset":"../images/列车/東京モノレール/東京モノレール_1000形_1003編成.png","aliases":[]},
  "planned-stock-library-43": {"displayName":"湘南モノレール5000系","iconName":"湘南モノレール5000系","asset":null,"plannedAsset":"../images/列车/湘南モノレール/湘南モノレール_5000系_5601編成_レッド.png","aliases":[]},
  "planned-stock-library-44": {"displayName":"埼玉新都市交通2000系","iconName":"埼玉新都市交通2000系","asset":null,"plannedAsset":"../images/列车/埼玉新都市交通/埼玉新都市交通_2000系_01編成_レッドパープル.png","aliases":[]},
  "planned-stock-library-45": {"displayName":"埼玉新都市交通2020系","iconName":"埼玉新都市交通2020系","asset":null,"plannedAsset":"../images/列车/埼玉新都市交通/埼玉新都市交通_2020系_21編成_グリーンクリスタル.png","aliases":[]},
  "planned-stock-library-46": {"displayName":"多摩モノレール1000系","iconName":"多摩モノレール1000系","asset":"../images/列车/多摩都市モノレール/多摩都市モノレール_1000系_標準塗装.png","aliases":["多摩都市モノレール1000系"]},
      "planned-stock-library-47": {"displayName":"都営300形（日暮里・舎人ライナー）","iconName":"都営300形（日暮里・舎人ライナー）","asset":"../images/列车/都営地下鉄/都営地下鉄_300形.png","lineIds":["Nippori_Toneri"],"lineAliases":{"Nippori_Toneri":["都営300形"]},"aliases":["都営300形"]},
      "planned-stock-library-48": {"displayName":"都営320形（日暮里・舎人ライナー）","iconName":"都営320形（日暮里・舎人ライナー）","asset":"../images/列车/都営地下鉄/都営地下鉄_320形.png","lineIds":["Nippori_Toneri"],"lineAliases":{"Nippori_Toneri":["都営320形"]},"aliases":["都営320形"]},
      "planned-stock-library-49": {"displayName":"都営330形（日暮里・舎人ライナー）","iconName":"都営330形（日暮里・舎人ライナー）","asset":"../images/列车/都営地下鉄/都営地下鉄_330形.png","lineIds":["Nippori_Toneri"],"lineAliases":{"Nippori_Toneri":["都営330形"]},"aliases":["都営330形"]},
  "planned-stock-library-50": {"displayName":"都電7700形","iconName":"都電7700形","asset":null,"plannedAsset":"../images/列车/都営地下鉄/都営地下鉄_7700形_みどり.png","aliases":["都営7700形"]},
  "planned-stock-library-51": {"displayName":"都電8800形","iconName":"都電8800形","asset":null,"plannedAsset":"../images/列车/都営地下鉄/都営地下鉄_8800形_ローズレッド.png","aliases":["都営8800形"]},
  "planned-stock-library-52": {"displayName":"都電8900形","iconName":"都電8900形","asset":null,"plannedAsset":"../images/列车/都営地下鉄/都営地下鉄_8900形_イエロー.png","aliases":["都営8900形"]},
  "planned-stock-library-53": {"displayName":"都電9000形","iconName":"都電9000形","asset":null,"plannedAsset":"../images/列车/都営地下鉄/都営地下鉄_9000形_9001号車_赤色.png","aliases":["都営9000形"]},
  "planned-stock-library-54": {"displayName":"京王1000系","iconName":"京王1000系","asset":null,"plannedAsset":"../images/列车/京王電鉄/京王電鉄_1000系.png","lineIds":["KeioInokashira"],"lineAliases":{"KeioInokashira":["1000系"]},"aliases":[]},
  "planned-stock-library-55": {"displayName":"横浜高速鉄道Y000系","iconName":"横浜高速鉄道Y000系","asset":"../images/列车/東急電鉄/東急電鉄_Y000系_通常塗装.png","aliases":["Y000系","東急Y000系"]},
  "planned-stock-library-56": {"displayName":"東急300系","iconName":"東急300系","asset":null,"plannedAsset":"../images/列车/東急電鉄/東急電鉄_300系_304編成_アップルグリーン.png","aliases":[]},
  "planned-stock-library-57": {"displayName":"相鉄8000系","iconName":"相鉄8000系","asset":null,"plannedAsset":"../images/列车/相模鉄道/相模鉄道_8000系_YOKOHAMA_NAVYBLUE.png","aliases":[]},
  "planned-stock-library-58": {"displayName":"相鉄9000系","iconName":"相鉄9000系","asset":null,"plannedAsset":"../images/列车/相模鉄道/相模鉄道_9000系_YOKOHAMA_NAVYBLUE.png","aliases":[]},
  "planned-stock-library-59": {"displayName":"相鉄10000系","iconName":"相鉄10000系","asset":null,"plannedAsset":"../images/列车/相模鉄道/相模鉄道_10000系_YOKOHAMA_NAVYBLUE.png","aliases":["相鉄10000系(8両)","相鉄10000系（8両）","相鉄10000系(10両)","相鉄10000系（10両）"]},
  "planned-stock-library-60": {"displayName":"相鉄11000系","iconName":"相鉄11000系","asset":null,"plannedAsset":"../images/列车/相模鉄道/相模鉄道_11000系_相鉄グループカラー.png","aliases":[]},
  // Loo-ool 的东武编成附加信息页确认这些系列属于东武本线网；
  // 这里仅补齐规范车型、线路作用域和已有 PNG，不把编成资料当成实时列车号映射。
  "planned-stock-library-61": {"displayName":"東武8000系","iconName":"東武8000系","asset":"../images/列车/東武鉄道/東武鉄道_8000型.png","lineIds":["Ogose","TobuIsesaki","TobuSkytree","TobuNikko","Tojo"],"lineAliases":{"Ogose":["8000系"],"TobuIsesaki":["東武8000系","東武850系"],"TobuSkytree":["東武8000系","東武850系"],"TobuNikko":["東武8000系","東武850系"],"Tojo":["東武8000系","東武8000型"]},"aliases":["東武8000型","東武8000系","東武850型","東武850系"]},
  "planned-stock-library-62": {"displayName":"東武10000系","iconName":"東武10000系","asset":null,"plannedAsset":"../images/列车/東武鉄道/東武鉄道_10000型_未更新車.png","lineIds":["TobuIsesaki","TobuSkytree","TobuNikko","Tojo"],"lineAliases":{"TobuIsesaki":["東武10000系","東武10000型"],"TobuSkytree":["東武10000系","東武10000型"],"TobuNikko":["東武10000系","東武10000型"],"Tojo":["東武10000系","東武10000型"]},"aliases":["東武10000型","東武10000系","10000系10050型","東武10000系10050型"]},
  "planned-stock-library-63": {"displayName":"東武10030系","iconName":"東武10030系","asset":null,"plannedAsset":"../images/列车/東武鉄道/東武鉄道_10030型_未更新車.png","lineIds":["TobuIsesaki","TobuSkytree","TobuNikko","Tojo"],"lineAliases":{"TobuIsesaki":["東武10030系","東武10030型"],"TobuSkytree":["東武10030系","東武10030型"],"TobuNikko":["東武10030系","東武10030型"],"Tojo":["東武10030系","東武10030型"]},"aliases":["東武10030型","東武10030系"]},
  "planned-stock-library-66": {"displayName":"東武90000系","iconName":"東武90000系","asset":"../images/列车/東武鉄道/東武鉄道_90000系.png","lineIds":["Tojo"],"lineAliases":{"Tojo":["東武90000系","東武90000型"]},"aliases":["東武90000型","東武90000系"]},
  "planned-stock-library-64": {"displayName":"東武20400型","iconName":"東武20400型","asset":"../images/列车/東武鉄道/東武鉄道_20400型.png","aliases":["東武20400系"]},
  "planned-stock-library-65": {"displayName":"京成AE形","iconName":"京成AE形","asset":"../images/列车/京成電鉄/京成電鉄_AE形.png","aliases":["京成AE形（スカイライナー）"]},
  "remaining-fleet-extra-0": {"displayName":"西武2000系","iconName":"西武2000系","asset":"../images/列车/西武鉄道/西武鉄道_2000系_黄色塗装.png","lineIds":["Ikebukuro","SeibuShinjuku","SeibuToshima"],"lineAliases":{"SeibuToshima":["西武2000系（8両編成・池袋線直通）"]},"aliases":["西武新2000系（2000系）"]},
  "remaining-fleet-extra-1": {"displayName":"西武101系","iconName":"西武101系","asset":null,"plannedAsset":"../images/列车/西武鉄道/西武鉄道_101系.png","aliases":["西武新101系（ワンマン専用塗装）","西武新101系（ワンマン）"]},
  "remaining-fleet-extra-2": {"displayName":"西武4000系","iconName":"西武4000系","asset":"../images/列车/西武鉄道/西武鉄道_4000系_赤白塗装.png","aliases":[]},
  "remaining-fleet-extra-3": {"displayName":"西武10000系","iconName":"西武10000系","asset":"../images/列车/西武鉄道/西武鉄道_10000系_ニューレッドアロー.png","aliases":["西武10000系（レッドアロー）","10000系（レッドアロー）"]},
  "remaining-fleet-extra-4": {"displayName":"西武8500系","iconName":"西武8500系","asset":"../images/列车/西武鉄道/西武鉄道_8500系_レオライナー.png","aliases":["西武8500系（レオライナー、新型導入中）"]},
  "remaining-fleet-extra-5": {"displayName":"西武7000系","iconName":"西武7000系","asset":"../images/列车/西武鉄道/西武鉄道_7000系_サステナ車両.png","aliases":["西武7000系（2026年ワンマン化）"]},
  "remaining-fleet-extra-6": {"displayName":"西武L00系","iconName":"西武L00系","asset":null,"plannedAsset":"../images/列车/西武鉄道/西武鉄道_L00系_れおけい.png","lineIds":["SeibuYamaguchi"],"aliases":["L00系（レオライナー）"],"candidateOnly":true,"evidenceSource":"https://www.seiburailway.jp/railway/encyclopedia/L00/"},
  "remaining-fleet-extra-7": {"displayName":"東武50090系","iconName":"東武50090系","asset":"../images/列车/東武鉄道/東武鉄道_50090型.png","aliases":["東武50090系（TJライナー専用）","東武50090型"]},
  "remaining-fleet-extra-8": {"displayName":"東武N100系","iconName":"東武N100系","asset":"../images/列车/東武鉄道/東武鉄道_N100系_SPACIA_X.png","aliases":["東武N100系（スペーシアX）"]},
  "remaining-fleet-extra-9": {"displayName":"東武100系","iconName":"東武100系","asset":null,"plannedAsset":"../images/列车/東武鉄道/東武鉄道_100系_原色.png","lineIds":["TobuNikko","TobuSkytree"],"aliases":["東武100系（スペーシア）","東武100系（きぬ）"]},
  "remaining-fleet-extra-10": {"displayName":"東武500系","iconName":"東武500系","asset":"../images/列车/東武鉄道/東武鉄道_500系_リバティ.png","lineIds":["TobuNikko"],"lineAliases":{"TobuNikko":["500系「リバティ」","500系「リバティ会津」"]},"aliases":["東武500系（リバティ）","東武500系（リバティりょうもう）","500系「リバティ」","500系「リバティ会津」"]},
  "remaining-fleet-extra-11": {"displayName":"東武200型","iconName":"東武200型","asset":null,"plannedAsset":"../images/列车/東武鉄道/東武鉄道_200型_りょうもう_赤.png","aliases":["東武200型（りょうもう）","東武200系"]},
  "remaining-fleet-extra-12": {"displayName":"東武250型","iconName":"東武250型","asset":"../images/列车/東武鉄道/東武鉄道_200型_250番台.png","aliases":["東武250系","東武250系（両毛）"]},
  "remaining-fleet-extra-13": {"displayName":"東武80000系","iconName":"東武80000系","asset":"../images/列车/東武鉄道/東武鉄道_80000系.png","aliases":[]},
  "remaining-fleet-extra-14": {"displayName":"小田急30000形","iconName":"小田急30000形","asset":null,"plannedAsset":"../images/列车/小田急電鉄/小田急電鉄_30000形_EXEα.png","aliases":["小田急30000形 EXEα"]},
  "remaining-fleet-extra-15": {"displayName":"E721系","iconName":"E721系","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_E721系_仙台地区.png","aliases":[]},
  "jr-east-e127-100-nagano-plan": {"displayName":"E127系100番台","iconName":"E127系100番台（長野色）","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png","lineIds":["Oito","Shinonoi","ChuoTatsuno"],"aliases":["JR東日本E127系100番台","E127系100番台（長野色）","JR東日本E127系100番台（長野色）"]},
  "jr-east-e127-100-nagano-horo-plan": {"displayName":"E127系100番台（長野色・幌付）","iconName":"E127系100番台（長野色・幌付）","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_E127系_100番台_長野色_幌付.png","lineIds":["Oito","Shinonoi","ChuoTatsuno"],"aliases":["JR東日本E127系100番台（長野色・幌付）"]},
  "jr-east-hbe300-furusato-plan": {"displayName":"HB-E300系（リゾートビューふるさと）","iconName":"HB-E300系（リゾートビューふるさと）","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png","lineIds":["Oito","Shinonoi"],"aliases":["JR東日本HB-E300系（リゾートビューふるさと）"]},
  "jr-east-hbe300-satono-plan": {"displayName":"HB-E300系（SATONO）","iconName":"HB-E300系（SATONO）","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_HB-E300系_SATONO_1号車.png","aliases":[]},
  "jr-east-c57-banetsu-plan": {"displayName":"C57形（SLばんえつ物語）","iconName":"C57形（SLばんえつ物語）","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png","aliases":[]},
  "jr-east-de10-banetsu-plan": {"displayName":"DE10形（DLばんえつ物語）","iconName":"DE10形（DLばんえつ物語）","asset":"../images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png","plannedAsset":null,"aliases":[]},
  "aizu-at700-mount-plan": {"displayName":"会津鉄道AT-700・AT-750形","iconName":"会津鉄道AT-700・AT-750形","asset":null,"plannedAsset":null,"aliases":[]},
  "remaining-fleet-extra-16": {"displayName":"E653系（いなほ）","iconName":"E653系（いなほ）","asset":"../images/列车/JR東日本/JR東日本_E653系（いなほ）.png","aliases":["JR東日本E653系（いなほ）"]},
  "jr-east-e653-shirayuki": {"displayName":"E653系（しらゆき）","iconName":"E653系（しらゆき）","asset":"../images/列车/JR東日本/JR東日本_E653系.png","lineIds":["Shinetsu"],"lineAliases":{"Shinetsu":["E653系"]},"aliases":["JR東日本E653系（しらゆき）"]},
  "izukyu-8000-plan": {"displayName":"伊豆急行8000系","iconName":"伊豆急行8000系","asset":null,"plannedAsset":"../images/列车/伊豆急行/伊豆急行_8000系_黒排障器.png","aliases":[]},
  "izukyu-3000-plan": {"displayName":"伊豆急行3000系","iconName":"伊豆急行3000系","asset":"../images/列车/伊豆急行/伊豆急行_3000系.png","aliases":[]},
  "izukyu-2100-plan": {"displayName":"伊豆急行2100系","iconName":"伊豆急行2100系","asset":null,"plannedAsset":"../images/列车/伊豆急行/伊豆急行_2100系.png","aliases":["伊豆急行2100系（リゾート21）"]},
  "jr-east-e261-saphir": {"displayName":"E261系","iconName":"E261系","asset":"../images/列车/JR東日本/JR東日本_E261系_サフィール踊り子.png","lineIds":["Tokaido","TokaidoMain","Ito"],"lineAliases":{"Tokaido":["E261系"],"TokaidoMain":["E261系"],"Ito":["E261系"]},"aliases":["E261系（サフィール踊り子）"]},
  "jr-east-e231-3000-hachiko": {"displayName":"E231系3000番台","iconName":"E231系3000番台","asset":"../images/列车/JR東日本/JR東日本_E231系_3000番台.png","lineIds":["Hachiko","Kawagoe"],"lineAliases":{"Hachiko":["E231系3000番台"],"Kawagoe":["E231系3000番台"]},"aliases":["JR東日本E231系3000番台"]},
  "jr-east-hbe220-hachiko-plan": {"displayName":"HB-E220系（八高線）","iconName":"HB-E220系（八高線）","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_HB-E220系_八高線.png","aliases":["JR東日本HB-E220系（八高線）"]},
  "jr-east-e131-nagano-planned": {"displayName":"E131系（長野地区）","iconName":"E131系（長野地区）","asset":null,"plannedAsset":"../images/列车/JR東日本/JR東日本_E131系_長野地区.png","aliases":["JR東日本E131系（長野地区）"]},
  "jr-east-e231-0-musashino": {"displayName":"E231系0番台（武蔵野線）","iconName":"E231系0番台（武蔵野線）","asset":"../images/列车/JR東日本/JR東日本_E231系_0番台.png","lineIds":["Musashino","Keiyo"],"lineAliases":{"Musashino":["E231系0番台"],"Keiyo":["E231系0番台"]},"aliases":["E231系0番台（武蔵野線）"]},
  "jr-east-209-500-musashino": {"displayName":"209系500番台（武蔵野線）","iconName":"209系500番台（武蔵野線）","asset":"../images/列车/JR東日本/JR東日本_209系_500番台_武藏野線.png","lineIds":["Musashino"],"lineAliases":{"Musashino":["209系500番台（武蔵野線）"]},"aliases":["209系500番台（武蔵野線）"]},
  "jr-east-e257-500-boso": {displayName:"E257系500番台",iconName:"E257系500番台",asset:"../images/列车/JR東日本/JR東日本_E257系_500番台.png",lineIds:["Uchibo","Sotobo","SobuMain"],lineAliases:{Uchibo:["E257系500番台"],Sotobo:["E257系500番台"],SobuMain:["E257系500番台（しおさい）"],Keiyo:["E257系500番台","E257系500番台（わかしお・さざなみ）","JR東日本E257系500番台（わかしお・さざなみ）"]},aliases:["E257系500番台","E257系500番台（わかしお・さざなみ）"]},
  "jr-east-e233-5000-keiyo": {
    displayName: "E233系5000番台",
    iconName: "E233系5000番台",
    asset: "../images/列车/JR東日本/JR東日本_E233系5000番台.png",
    lineIds: ["Keiyo", "Togane"],
    lineAliases: { Keiyo: ["E233系5000番台"], Togane: ["E233系5000番台"] },
    aliases: ["E233系5000番台", "JR E233系5000番台"]
  },
  "jr-east-e231-900-musashino": {
    displayName: "E231系900番台",
    iconName: "E231系900番台",
    asset: "../images/列车/JR東日本/JR東日本_E231系_900番台_武藏野線.png",
    lineIds: ["Musashino"],
    lineAliases: { Musashino: ["E231系900番台"] },
    aliases: ["E231系900番台"]
  },
  "jr-east-e231-1000-shonan-shinjuku": {
    displayName: "E231系1000番台",
    iconName: "E231系1000番台",
    asset: "../images/列车/JR東日本/JR東日本_E231系_1000番台.png",
    lineIds: ["ShonanShinjuku", "UenoTokyo", "UtsunomiyaJR", "Takasaki", "Tokaido", "TokaidoMain", "Ito"],
    lineAliases: { ShonanShinjuku: ["E231系1000番台"], UenoTokyo: ["E231系1000番台"], UtsunomiyaJR: ["E231系1000番台"], Takasaki: ["E231系1000番台"], Tokaido: ["E231系1000番台"], TokaidoMain: ["E231系1000番台"], Ito: ["E231系1000番台"] },
    aliases: ["E231系1000番台"]
  },
  "jr-east-e233-3000-shonan-shinjuku": {
    displayName: "E233系3000番台",
    iconName: "E233系3000番台",
    asset: "../images/列车/JR東日本/JR東日本_E233系3000番台.png",
    lineIds: ["ShonanShinjuku", "UenoTokyo", "UtsunomiyaJR", "Takasaki", "Tokaido", "TokaidoMain", "Ito"],
    lineAliases: { ShonanShinjuku: ["E233系3000番台"], UenoTokyo: ["E233系3000番台"], UtsunomiyaJR: ["E233系3000番台"], Takasaki: ["E233系3000番台"], Tokaido: ["E233系3000番台"], TokaidoMain: ["E233系3000番台"], Ito: ["E233系3000番台"] },
    aliases: ["E233系3000番台"]
  },
  "jr-east-e257-2000-odoriko": {
    displayName: "E257系2000番台",
    iconName: "E257系2000番台",
    asset: "../images/列车/JR東日本/JR東日本_E257系_2000番台.png",
    lineIds: ["Tokaido", "TokaidoMain", "Ito"],
    lineAliases: { Tokaido: ["E257系2000番台"], TokaidoMain: ["E257系2000番台"], Ito: ["E257系2000番台"] },
    aliases: ["E257系2000番台"]
  },
  "jr-east-e257-2500-odoriko-shonan": {
    displayName: "E257系2500番台",
    iconName: "E257系2500番台",
    asset: "../images/列车/JR東日本/JR東日本_E257系_2500番台.png",
    lineIds: ["Tokaido", "TokaidoMain", "Ito"],
    lineAliases: { Tokaido: ["E257系2500番台"], TokaidoMain: ["E257系2500番台"], Ito: ["E257系2500番台"] },
    aliases: ["E257系2500番台"]
  },
  "jr-east-253-1000-nikko-kinugawa": {
    displayName: "253系（日光・きぬがわ）",
    iconName: "253系（日光・きぬがわ）",
    asset: "../images/列车/JR東日本/JR東日本_253系_1000番台.png",
    lineIds: ["UtsunomiyaJR", "TobuNikko", "Nikkoku", "ShonanShinjuku"],
    lineAliases: {
      UtsunomiyaJR: ["253系"],
      TobuNikko: ["253系"],
      Nikkoku: ["253系"],
      ShonanShinjuku: ["253系"]
    },
    aliases: ["253系（日光・きぬがわ）", "E253系（日光・きぬがわ）", "JR東日本E253系"]
  },
  // JR西日本图库原始缩写已规范化；变体代码保留在身份名中，避免按泛称车型误选。
  "jr-west-c57-sl-yamaguchi": { displayName: "JR西日本C57形（SLやまぐち）", iconName: "JR西日本C57形（SLやまぐち）", asset: "../images/列车/JR西日本/JR西日本_C57形_SLやまぐち.png", lineIds: ["Yamaguchi"], lineAliases: { Yamaguchi: ["C57形"] }, aliases: [] },
  "jr-west-103-bantan-ba": { displayName: "JR西日本103系（播但線・BA）", iconName: "JR西日本103系（播但線・BA）", asset: "../images/列车/JR西日本/JR西日本_103系_播但線_BA.png", lineIds: ["Bantan"], lineAliases: { Bantan: ["103系"] }, aliases: [] },
  "jr-west-103-bantan-ba-g1": { displayName: "JR西日本103系（播但線・BA-G1）", iconName: "JR西日本103系（播但線・BA-G1）", asset: "../images/列车/JR西日本/JR西日本_103系_播但線_BA-G1.png", lineIds: ["Bantan"], aliases: [] },
  "jr-west-103-bantan-ba-g2": { displayName: "JR西日本103系（播但線・BA-G2）", iconName: "JR西日本103系（播但線・BA-G2）", asset: "../images/列车/JR西日本/JR西日本_103系_播但線_BA-G2.png", lineIds: ["Bantan"], lineAliases: { Bantan: ["103系（BA-G2）"] }, aliases: [] },
  "jr-west-103-bantan-ba-g3": { displayName: "JR西日本103系（播但線・BA-G3）", iconName: "JR西日本103系（播但線・BA-G3）", asset: "../images/列车/JR西日本/JR西日本_103系_播但線_BA-G3.png", lineIds: ["Bantan"], lineAliases: { Bantan: ["103系（BA-G3）"] }, aliases: [] },
  "jr-west-113-fukuchiyama-fk053": { displayName: "JR西日本113系（福知山線・FK053）", iconName: "JR西日本113系（福知山線・FK053）", asset: "../images/列车/JR西日本/JR西日本_113系_福知山線_FK053.png", lineIds: ["Fukuchiyama"], lineAliases: { Fukuchiyama: ["113系"] }, aliases: [] },
  "jr-west-117-west-express-galaxy": { displayName: "JR西日本117系（WEST EXPRESS 銀河）", iconName: "JR西日本117系（WEST EXPRESS 銀河）", asset: "../images/列车/JR西日本/JR西日本_117系_WEST_EXPRESS銀河.png", lineIds: ["TokaidoKansai", "SanyoMain", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-120-chugoku-cha": { displayName: "JR西日本120系（中国地区・CHA）", iconName: "JR西日本120系（中国地区・CHA）", asset: "../images/列车/JR西日本/JR西日本_120系_中国地区_CHA.png", lineIds: ["SaninMain"], lineAliases: { SaninMain: ["キハ120系"] }, aliases: [] },
  "jr-west-120-kansai-kan": { displayName: "JR西日本キハ120系（関西地区・KAN）", iconName: "JR西日本キハ120系（関西地区・KAN）", asset: "../images/列车/JR西日本/JR西日本_120系_関西地区_KAN.png", lineIds: ["KansaiMain"], lineAliases: { KansaiMain: ["キハ120系"] }, aliases: ["JR西日本120系（関西地区・KAN）", "キハ120系（関西本線）"] },
  "jr-west-122": { displayName: "JR西日本キハ122系", iconName: "JR西日本キハ122系", asset: "../images/列车/JR西日本/JR西日本_122系.png", lineIds: ["HimejiLine"], lineAliases: { HimejiLine: ["キハ122系"] }, aliases: ["JR西日本122系", "キハ122系（姫新線）"] },
  "jr-west-187": { displayName: "JR西日本187系", iconName: "JR西日本187系", asset: "../images/列车/JR西日本/JR西日本_187系.png", lineIds: ["SaninMain"], aliases: ["187系"] },
  "jr-west-189": { displayName: "JR西日本キハ189系", iconName: "JR西日本キハ189系", asset: "../images/列车/JR西日本/JR西日本_キハ189系.png", lineIds: ["TokaidoKansai", "SaninMain"], aliases: ["キハ189系"] },
  "jr-west-189-hanaakari": { displayName: "JR西日本キハ189系（はなあかり）", iconName: "JR西日本キハ189系（はなあかり）", asset: "../images/列车/JR西日本/JR西日本_キハ189系_はなあかり.png", lineIds: ["SaninMain"], aliases: [] },
  "jr-west-205-hanwa-hn2": { displayName: "JR西日本205系（阪和線・HN2）", iconName: "JR西日本205系（阪和線・HN2）", asset: "../images/列车/JR西日本/JR西日本_205系_阪和線_HN2.png", lineIds: ["Hanwa"], lineAliases: { Hanwa: ["205系"] }, aliases: [] },
  "jr-west-207-nk": { displayName: "JR西日本207系（NK）", iconName: "JR西日本207系（NK）", asset: "../images/列车/JR西日本/JR西日本_207系_NK.png", lineIds: ["TokaidoKansai", "Fukuchiyama", "Gakkentoshi", "OsakaHigashi"], lineAliases: { TokaidoKansai: ["207系"], Fukuchiyama: ["207系"], Gakkentoshi: ["207系"], OsakaHigashi: ["207系"] }, aliases: [] },
  "jr-west-207-y2": { displayName: "JR西日本207系（Y2）", iconName: "JR西日本207系（Y2）", asset: "../images/列车/JR西日本/JR西日本_207系_Y2.png", lineIds: ["TokaidoKansai", "Fukuchiyama", "Gakkentoshi", "OsakaHigashi"], lineAliases: { TokaidoKansai: ["207系"], Fukuchiyama: ["207系"], Gakkentoshi: ["207系"], OsakaHigashi: ["207系"] }, aliases: [] },
  "jr-west-213-w": { displayName: "JR西日本213系（W）", iconName: "JR西日本213系（W）", asset: "../images/列车/JR西日本/JR西日本_213系_W.png", lineIds: ["SanyoMain", "Ako"], lineAliases: { SanyoMain: ["213系"], Ako: ["213系"] }, aliases: [] },
  "jr-west-221-cha": { displayName: "JR西日本221系（CHA）", iconName: "JR西日本221系（CHA）", asset: "../images/列车/JR西日本/JR西日本_221系_CHA.png", lineIds: ["KansaiMain", "OsakaLoop"], lineAliases: { KansaiMain: ["221系"], OsakaLoop: ["221系"] }, aliases: [] },
  "jr-west-221-n": { displayName: "JR西日本221系（N）", iconName: "JR西日本221系（N）", asset: "../images/列车/JR西日本/JR西日本_221系_N.png", lineIds: ["KansaiMain", "OsakaLoop"], lineAliases: { KansaiMain: ["221系"], OsakaLoop: ["221系"] }, aliases: [] },
  "jr-west-223-h2": { displayName: "JR西日本223系（H2）", iconName: "JR西日本223系（H2）", asset: "../images/列车/JR西日本/JR西日本_223系_H2.png", lineIds: ["Hanwa"], aliases: [] },
  "jr-west-223-h6": { displayName: "JR西日本223系（H6）", iconName: "JR西日本223系（H6）", asset: "../images/列车/JR西日本/JR西日本_223系_H6.png", lineIds: ["Hanwa"], aliases: [] },
  "jr-west-223-kah": { displayName: "JR西日本223系（KAH）", iconName: "JR西日本223系（KAH）", asset: "../images/列车/JR西日本/JR西日本_223系_KAH.png", lineIds: ["Hanwa", "KiseiWest"], aliases: [] },
  "jr-west-223-kil": { displayName: "JR西日本223系（KIL）", iconName: "JR西日本223系（KIL）", asset: "../images/列车/JR西日本/JR西日本_223系_KIL.png", lineIds: ["Hanwa", "KiseiWest"], aliases: [] },
  "jr-west-223-mori": { displayName: "JR西日本223系（MORI）", iconName: "JR西日本223系（MORI）", asset: "../images/列车/JR西日本/JR西日本_223系_MORI.png", lineIds: ["Hanwa", "KiseiWest"], aliases: [] },
  "jr-west-225": { displayName: "JR西日本225系", iconName: "JR西日本225系", asset: "../images/列车/JR西日本/JR西日本_225系.png", lineIds: ["Hanwa"], aliases: ["225系"] },
  "jr-west-225-v1": { displayName: "JR西日本225系（V1）", iconName: "JR西日本225系（V1）", asset: "../images/列车/JR西日本/JR西日本_225系_V1.png", lineIds: ["Hanwa"], aliases: [] },
  "jr-west-227-wakayama": { displayName: "JR西日本227系（WK）", iconName: "JR西日本227系（WK）", asset: "../images/列车/JR西日本/JR西日本_227系_WK.png", lineIds: ["Hanwa", "KiseiWest"], lineAliases: { Hanwa: ["227系"], KiseiWest: ["227系"] }, aliases: [] },
  "jr-west-271": { displayName: "JR西日本271系", iconName: "JR西日本271系", asset: "../images/列车/JR西日本/JR西日本_271系.png", lineIds: ["TokaidoKansai", "Hanwa"], aliases: ["271系"] },
  "jr-west-273": { displayName: "JR西日本273系", iconName: "JR西日本273系", asset: "../images/列车/JR西日本/JR西日本_273系.png", lineIds: ["SanyoMain", "SaninMain"], aliases: [] },
  "jr-west-281": { displayName: "JR西日本281系", iconName: "JR西日本281系", asset: "../images/列车/JR西日本/JR西日本_281系.png", lineIds: ["TokaidoKansai", "Hanwa"], aliases: ["281系"] },
  "jr-west-283": { displayName: "JR西日本283系", iconName: "JR西日本283系", asset: "../images/列车/JR西日本/JR西日本_283系.png", lineIds: ["KiseiWest"], aliases: [] },
  "jr-west-283-k": { displayName: "JR西日本283系（K）", iconName: "JR西日本283系（K）", asset: "../images/列车/JR西日本/JR西日本_283系_K.png", lineIds: ["KiseiWest"], aliases: [] },
  "jr-west-287": { displayName: "JR西日本287系", iconName: "JR西日本287系", asset: "../images/列车/JR西日本/JR西日本_287系.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: ["287系"] },
  "jr-west-287-k": { displayName: "JR西日本287系（K）", iconName: "JR西日本287系（K）", asset: "../images/列车/JR西日本/JR西日本_287系_K.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-287-krm": { displayName: "JR西日本287系（KRM）", iconName: "JR西日本287系（KRM）", asset: "../images/列车/JR西日本/JR西日本_287系_KRM.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-287-skr": { displayName: "JR西日本287系（SKR）", iconName: "JR西日本287系（SKR）", asset: "../images/列车/JR西日本/JR西日本_287系_SKR.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-287-v1": { displayName: "JR西日本287系（V1）", iconName: "JR西日本287系（V1）", asset: "../images/列车/JR西日本/JR西日本_287系_V1.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-289-g": { displayName: "JR西日本289系（G）", iconName: "JR西日本289系（G）", asset: "../images/列车/JR西日本/JR西日本_289系_G.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-289-k-ins": { displayName: "JR西日本289系（K-INS）", iconName: "JR西日本289系（K-INS）", asset: "../images/列车/JR西日本/JR西日本_289系_K_INS.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-289-kani": { displayName: "JR西日本289系（KANI）", iconName: "JR西日本289系（KANI）", asset: "../images/列车/JR西日本/JR西日本_289系_KANI.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-289-kg": { displayName: "JR西日本289系（KG）", iconName: "JR西日本289系（KG）", asset: "../images/列车/JR西日本/JR西日本_289系_KG.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-289-k-kani": { displayName: "JR西日本289系（K-KANI）", iconName: "JR西日本289系（K-KANI）", asset: "../images/列车/JR西日本/JR西日本_289系_KKANI.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-289-mhr": { displayName: "JR西日本289系（MHR）", iconName: "JR西日本289系（MHR）", asset: "../images/列车/JR西日本/JR西日本_289系_MHR.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-289-mhs": { displayName: "JR西日本289系（MHS）", iconName: "JR西日本289系（MHS）", asset: "../images/列车/JR西日本/JR西日本_289系_MHS.png", lineIds: ["Fukuchiyama", "SaninMain", "KiseiWest"], aliases: [] },
  "jr-west-321": { displayName: "JR西日本321系", iconName: "JR西日本321系", asset: "../images/列车/JR西日本/JR西日本_321系.png", lineIds: ["TokaidoKansai", "Gakkentoshi", "OsakaHigashi"], aliases: ["321系"] },
  "jr-west-323-m": { displayName: "JR西日本323系（M）", iconName: "JR西日本323系（M）", asset: "../images/列车/JR西日本/JR西日本_323系_M.png", lineIds: ["OsakaLoop"], aliases: [] },
  "jr-west-323-or": { displayName: "JR西日本323系（OR）", iconName: "JR西日本323系（OR）", asset: "../images/列车/JR西日本/JR西日本_323系_OR.png", lineIds: ["OsakaLoop"], lineAliases: { OsakaLoop: ["323系"] }, aliases: [] },
  "jr-west-kiha35": { displayName: "JR西日本キハ35系", iconName: "JR西日本キハ35系", asset: "../images/列车/JR西日本/JR西日本_キハ35系.png", aliases: [] },
  "jr-west-kiha40-amtc": { displayName: "JR西日本キハ40系（AMTC）", iconName: "JR西日本キハ40系（AMTC）", asset: "../images/列车/JR西日本/JR西日本_キハ40系_AMTC.png", lineIds: ["SaninMain"], aliases: [] },
  "jr-west-kiha40-ets": { displayName: "JR西日本キハ40系（ETS）", iconName: "JR西日本キハ40系（ETS）", asset: "../images/列车/JR西日本/JR西日本_キハ40系_ETS.png", lineIds: ["SaninMain"], aliases: [] },
  "jr-west-kiha40-jbel": { displayName: "JR西日本キハ40系（JBEL）", iconName: "JR西日本キハ40系（JBEL）", asset: "../images/列车/JR西日本/JR西日本_キハ40系_JBEL.png", lineIds: ["SaninMain"], aliases: [] },
  "jr-west-kiha40-jnrn": { displayName: "JR西日本キハ40系（JNRN）", iconName: "JR西日本キハ40系（JNRN）", asset: "../images/列车/JR西日本/JR西日本_キハ40系_JNRN.png", lineIds: ["SaninMain"], aliases: [] },
  "jr-west-kiha40-oog": { displayName: "JR西日本キハ40系（OOG）", iconName: "JR西日本キハ40系（OOG）", asset: "../images/列车/JR西日本/JR西日本_キハ40系_OOG.png", lineIds: ["SaninMain"], aliases: [] },
  "jr-west-kiha40-oor": { displayName: "JR西日本キハ40系（OOR）", iconName: "JR西日本キハ40系（OOR）", asset: "../images/列车/JR西日本/JR西日本_キハ40系_OOR.png", lineIds: ["SaninMain"], aliases: [] },
  "jr-west-kiha40-uym": { displayName: "JR西日本キハ40系（UYM）", iconName: "JR西日本キハ40系（UYM）", asset: "../images/列车/JR西日本/JR西日本_キハ40系_UYM.png", lineIds: ["SaninMain"], aliases: [] },
  "jr-west-kiha41": { displayName: "JR西日本キハ41系", iconName: "JR西日本キハ41系", asset: "../images/列车/JR西日本/JR西日本_キハ41系.png", lineIds: ["SaninMain"], aliases: [] },
  "jr-west-kiha47-sak": { displayName: "JR西日本キハ47系（SAK）", iconName: "JR西日本キハ47系（SAK）", asset: "../images/列车/JR西日本/JR西日本_キハ47系_SAK.png", lineIds: ["SaninMain"], aliases: [] },
  "jr-west-681-ft": { displayName: "JR西日本681系（FT）", iconName: "JR西日本681系（FT）", asset: "../images/列车/JR西日本/JR西日本_681系_FT.png", lineIds: ["TokaidoKansai", "Kosei"], aliases: [] },
  "jr-west-683": { displayName: "JR西日本683系", iconName: "JR西日本683系", asset: "../images/列车/JR西日本/JR西日本_683系.png", lineIds: ["TokaidoKansai", "Kosei"], aliases: ["683系"] },
  "jr-west-683-k": { displayName: "JR西日本683系（K）", iconName: "JR西日本683系（K）", asset: "../images/列车/JR西日本/JR西日本_683系_K.png", lineIds: ["TokaidoKansai", "Kosei"], aliases: [] },
  "jr-west-683-k4": { displayName: "JR西日本683系（K4）", iconName: "JR西日本683系（K4）", asset: "../images/列车/JR西日本/JR西日本_683系_K4.png", lineIds: ["TokaidoKansai", "Kosei"], aliases: [] },
  "jr-west-683-n": { displayName: "JR西日本683系（N）", iconName: "JR西日本683系（N）", asset: "../images/列车/JR西日本/JR西日本_683系_N.png", lineIds: ["TokaidoKansai", "Kosei"], aliases: [] },
  "jr-west-683-srn": { displayName: "JR西日本683系（SRN）", iconName: "JR西日本683系（SRN）", asset: "../images/列车/JR西日本/JR西日本_683系_SRN.png", lineIds: ["TokaidoKansai", "Kosei"], aliases: [] },
  "jr-west-kiha87": { displayName: "JR西日本キハ87系", iconName: "JR西日本キハ87系", asset: "../images/列车/JR西日本/JR西日本_キハ87系.png", lineIds: ["TokaidoKansai", "SanyoMain", "SaninMain"], aliases: [] },
  // わ99形は一个固定四辆客车编成，不按单一来源车辆外形拆成
  // 12系或京王5000系；PNG 仍待精确像素源，不能复用わたらせ710形。
  "watarase-wa99": {
    displayName: "わたらせ渓谷鐵道わ99形客車",
    iconName: "わたらせ渓谷鐵道わ99形客車",
    asset: null,
    plannedAsset: "../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_わ99形.png",
    aliases: [],
    artworkStatus: "pending-source-review",
    plannedOnly: true,
    plannedAliases: [
      "わ99形",
      "わ99",
      "わたらせ渓谷鐵道わ99形",
      "わたらせ渓谷鉄道わ99形",
      "わ99-5010",
      "わ99-5020",
      "わ99-5070",
      "わ99-5080",
      "わたらせ渓谷鉄道わたらせ渓谷鉄道_わ99形",
      "わたらせ渓谷鉄道 わたらせ渓谷鉄道_わ99形",
      "わたらせ渓谷鉄道わ99形",
      "わたらせ渓谷鉄道_わ99形"
    ]
  },
};

/**
 * 东京樱花电车：历史上的 Toei.Arakawa Train 记录有时使用
 * 四位数实际车辆号，可用于识别 33 辆车辆中的一辆。
 * 但当前 ODPT Train 数据返回的是 ODPTnnnn 行程标识，
 * 不含车辆号或 vehicleType；绝不能移除前缀或把
 * ODPTnnnn 数字解释为车辆/编组 ID。除非其他来源证明实际车辆，
 * 这些列车必须保持 UNKNOWN。
 *
 * 33 辆车队：https://www.kotsu.metro.tokyo.jp/about/service/toden.html
 * 车辆编号/涂装：https://2nd-train.net/formations/affiliation/216/荒川車両検修所/
 * 8501 于 2026 年 4 月翻新；像素图片由项目所有者提供。
 * https://www.kotsu.metro.tokyo.jp/pickup_information/news/toden/2026/tdn_p_2026041512633_h.html
 */
var TODEN_ARAKAWA_BY_CAR = Object.create(null);
[
  { cars: "7701 7702", name: "都電7700形（みどり）", asset: "../images/列车/都営地下鉄/都営地下鉄_7700形_みどり.png" },
  { cars: "7703 7704 7705", name: "都電7700形（あお）", asset: "../images/列车/都営地下鉄/都営地下鉄_7700形_あお.png" },
  { cars: "7706 7707 7708", name: "都電7700形（えんじ）", asset: "../images/列车/都営地下鉄/都営地下鉄_7700形_えんじ.png" },
  { cars: "8501", name: "都電8500形（8501号車・リニューアル）", asset: "../images/列车/都営地下鉄/都営地下鉄_8500形_8501号車_山吹色.png" },
  { cars: "8502 8503 8504 8505", name: "都電8500形", asset: "../images/列车/都営地下鉄/都営地下鉄_8500形.png" },
  { cars: "8801 8802 8803 8804 8805", name: "都電8800形（ローズレッド）", asset: "../images/列车/都営地下鉄/都営地下鉄_8800形_ローズレッド.png" },
  { cars: "8806 8807", name: "都電8800形（バイオレット）", asset: "../images/列车/都営地下鉄/都営地下鉄_8800形_バイオレット.png" },
  { cars: "8808 8809", name: "都電8800形（オレンジ）", asset: "../images/列车/都営地下鉄/都営地下鉄_8800形_オレンジ.png" },
  { cars: "8810", name: "都電8800形（イエロー）", asset: "../images/列车/都営地下鉄/都営地下鉄_8800形_イエロー.png" },
  { cars: "8901 8902", name: "都電8900形（オレンジ）", asset: "../images/列车/都営地下鉄/都営地下鉄_8900形_オレンジ.png" },
  { cars: "8903 8904", name: "都電8900形（ブルー）", asset: "../images/列车/都営地下鉄/都営地下鉄_8900形_ブルー.png" },
  { cars: "8905 8906", name: "都電8900形（ローズピンク）", asset: "../images/列车/都営地下鉄/都営地下鉄_8900形_ローズピンク.png" },
  { cars: "8907 8908", name: "都電8900形（イエロー）", asset: "../images/列车/都営地下鉄/都営地下鉄_8900形_イエロー.png" },
  { cars: "9001", name: "都電9000形（9001号車・赤色）", asset: "../images/列车/都営地下鉄/都営地下鉄_9000形_9001号車_赤色.png" },
  { cars: "9002", name: "都電9000形（9002号車・青色）", asset: "../images/列车/都営地下鉄/都営地下鉄_9000形_9002号車_青色.png" }
].forEach(function(group, i) {
  var id = 'toden-arakawa-car-group-' + i;
  CANONICAL_VEHICLES[id] = {
    displayName: group.name, iconName: group.name, asset: group.asset, aliases: []
  };
  group.cars.split(' ').forEach(function(car) {
    if (TODEN_ARAKAWA_BY_CAR[car]) throw new Error('Duplicate Toden car number: ' + car);
    TODEN_ARAKAWA_BY_CAR[car] = group.name;
  });
});

function resolveTodenArakawaLiveCar(ctx) {
  // 必须同时满足三个范围条件及字面实际车辆号。
  // 当前荒川线 ODPT Train 数据也使用 ODPTnnnn；绝不能
  // 把这些行程 ID 重新解释为实际车辆或映射到某一车型。
  if (ctx.lineId !== 'Arakawa' || normOp(ctx.operator) !== 'Toei' ||
      ctx.railway !== 'odpt.Railway:Toei.Arakawa') return null;
  var number = String(ctx.realtimeCarNumber || '').trim();
  if (!/^[0-9]{4}$/.test(number)) return null;
  var name = TODEN_ARAKAWA_BY_CAR[number];
  return name ? { number: number, name: name } : null;
}

// 函館市電 GTFS-RT 的 vehicle_id 是实际车辆号；只在运营方、线路和
// 字面车号同时匹配时使用。未知车号不按车号前缀猜测车型，保持未判定。
var HAKODATE_LIVE_CAR_TYPES = {
  "3001": "函館市電3000形（3001号車）",
  "3002": "函館市電3000形（3002号車）",
  "3003": "函館市電3000形",
  "3004": "函館市電3000形",
  "8001": "函館市電8000形", "8002": "函館市電8000形",
  "8003": "函館市電8000形", "8004": "函館市電8000形",
  "8005": "函館市電8000形", "8006": "函館市電8000形",
  "8007": "函館市電8000形", "8008": "函館市電8000形",
  "8009": "函館市電8000形", "8010": "函館市電8000形",
  "8101": "函館市電8100形",
  "7001": "函館市電7000形", "7002": "函館市電7000形", "7003": "函館市電7000形",
  "501": "函館市電500形", "530": "函館市電500形",
  "716": "函館市電710形", "719": "函館市電710形", "723": "函館市電710形",
  "812": "函館市電800形",
  "9601": "函館市電9600形（9601号車）", "9602": "函館市電9600形",
  "9603": "函館市電9600形", "9604": "函館市電9600形（9604号車）", "9605": "函館市電9600形",
  "39": "函館市電30形（39号車）"
};
function resolveHakodateLiveCar(ctx) {
  ctx = ctx || {};
  if (normOp(ctx.operator) !== "HakodateCity" ||
      (ctx.lineId !== "Hakodate2" && ctx.lineId !== "Hakodate5")) return null;
  var number = String(ctx.realtimeCarNumber || ctx.vehicleCarNumber || ctx.gtfsVehicleId || "").trim();
  var name = HAKODATE_LIVE_CAR_TYPES[number];
  return name ? { number: number, name: name } : null;
}

// わ鐵官方车辆介绍列出的固定编成车号；只有在运营方上下文和
// 字面实际车号同时命中时才投影为わ99形，不能把普通列车号当作车辆号。
var WATARASE_WA99_CARS = {
  "5010": true, "5020": true, "5070": true, "5080": true
};
function resolveWataraseWa99Car(ctx) {
  ctx = ctx || {};
  var owner = normOp(ctx.operator || ctx.assignmentOperator || ctx.trainOwner || "");
  var railway = String(ctx.railway || "");
  var isWatarase = owner === "Watarase" || owner === "WataraseKeikoku" ||
    /Watarase|わたらせ渓谷/.test(railway);
  if (!isWatarase) return null;
  var number = String(ctx.realtimeCarNumber || ctx.vehicleCarNumber || "").trim();
  if (!WATARASE_WA99_CARS[number]) return null;
  return {
    number: number,
    name: "わたらせ渓谷鐵道わ99形客車",
    formationId: "わ99",
    sourceUrl: "https://watetsu.com/sightseeing/train.php"
  };
}

// 这里只接受来源提供的精确实际车辆 ID；公开列车号绝不是
// 车辆号。直通服务应按车辆所属方限定，而不是按承载线路限定。
let rosterSource = null;
let rosterCars = Object.create(null);
let rosterFormations = Object.create(null);
function resolveRosterCar(ctx) {
  const number = String(ctx.realtimeCarNumber || ctx.vehicleCarNumber || '').trim();
  const formation = String(ctx.formationId || '').trim();
  const owner = normOp(ctx.trainOwner || ctx.assignmentOperator || ctx.operator);
  const day = String(ctx.serviceDate || '');
  if ((!number && !formation) || !owner || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const roster = window.VEHICLE_CARSETS;
  if (roster !== rosterSource) {
    rosterSource = roster;
    rosterCars = Object.create(null);
    rosterFormations = Object.create(null);
    (Array.isArray(roster) ? roster : []).forEach(function(r) {
      if (!r || !r.source_url || !r.vehicle_type || !r.carset_id ||
          !/^\d{4}-\d{2}-\d{2}$/.test(r.snapshot_date || '')) return;
      const rosterOwner = r.operator === '東京臨海高速鉄道' ? 'TWR' :
        r.operator === '東武鉄道' ? 'Tobu' : normOp(r.operator);
      if (!rosterOwner) return;
      const formationKey = rosterOwner + '|' + r.carset_id;
      (rosterFormations[formationKey] || (rosterFormations[formationKey] = [])).push(r);
      (Array.isArray(r.cars) ? r.cars : []).forEach(function(car) {
        const carKey = rosterOwner + '|' + car;
        (rosterCars[carKey] || (rosterCars[carKey] = [])).push(r);
      });
    });
  }
  const scoped = (number ? rosterCars[owner + '|' + number] : rosterFormations[owner + '|' + formation]) || [];
  const dated = scoped.filter(function(r) { return r.snapshot_date <= day; });
  const latestDate = dated.reduce(function(latest,r) { return r.snapshot_date > latest ? r.snapshot_date : latest; },'');
  const hits = dated.filter(function(r) { return r.snapshot_date === latestDate; });
  // 检查有效状态前先解析最新的适用快照。
  // 否则已退役车辆可能悄悄回退到旧的有效编组表。
  if (!hits.length || hits.some(function(r) { return r.status !== '運用中'; })) return null;
  const identities = Object.create(null);
  hits.forEach(function(r) {
    const canonical = resolveCanonicalVehicle(r.vehicle_type);
    identities[(canonical ? canonical.displayName : r.vehicle_type) + '|' + r.carset_id] = r;
  });
  const keys = Object.keys(identities);
  if (keys.length !== 1) return null;
  const hit = identities[keys[0]];
  return {number:number,name:hit.vehicle_type,formationId:hit.carset_id,sourceUrl:hit.source_url};
}

// 已验证的都营车辆身份及所属方图库图片。
// 车队来源：东京都交通局车辆图鉴
// https://www.kotsu.metro.tokyo.jp/about/koukai/vehicle_outline/model_diagram/
// https://www.kotsu.metro.tokyo.jp/about/service/subway.html
// 来源：https://www.kotsu.metro.tokyo.jp/about/service/nippori_toneri.html
// 图片身份仅在精确时成立；仅有多车型共现系列时不提供 PNG。
[
  { id: "toei-fleet-0", displayName: "都営5500形", asset: "../images/列车/都営地下鉄/都営地下鉄_5500形.png", aliases: ["都営地下鉄5500形","東京都交通局5500形"] },
  { id: "toei-fleet-1", displayName: "都営6300形", asset: "../images/列车/都営地下鉄/都営地下鉄_6300形_3次車.png", aliases: ["都営地下鉄6300形","東京都交通局6300形","都営6300形（3次車）"] },
  { id: "toei-fleet-2", displayName: "都営6500形", asset: "../images/列车/都営地下鉄/都営地下鉄_6500形.png", aliases: ["都営地下鉄6500形","東京都交通局6500形"] },
  { id: "toei-fleet-3", displayName: "都営10-300形", asset: null, plannedAsset:"../images/列车/都営地下鉄/都営地下鉄_10-300形_3次車以降.png", aliases: ["都営地下鉄10-300形","東京都交通局10-300形"], candidateOnly: true },
  { id: "toei-fleet-4", displayName: "都営10-300形（1・2次車）", asset: "../images/列车/都営地下鉄/都営地下鉄_10-300形_1・2次車.png", aliases: [] },
  { id: "toei-fleet-5", displayName: "都営10-300形（3次車以降）", asset: "../images/列车/都営地下鉄/都営地下鉄_10-300形_3次車以降.png", aliases: [] },
  { id: "toei-fleet-6", displayName: "都営12-000形（4次車）", asset: "../images/列车/都営地下鉄/都営地下鉄_12-000形_4次車.png", aliases: [] },
  { id: "toei-fleet-7", displayName: "都営12-600形", asset: null, plannedAsset:"../images/列车/都営地下鉄/都営地下鉄_12-600形_1次車.png", aliases: ["都営地下鉄12-600形","東京都交通局12-600形"], candidateOnly: true },
  { id: "toei-fleet-8", displayName: "都営12-600形（1次車）", asset: "../images/列车/都営地下鉄/都営地下鉄_12-600形_1次車.png", aliases: [] },
  { id: "toei-fleet-9", displayName: "都営12-600形（前期車）", asset: "../images/列车/都営地下鉄/都営地下鉄_12-600形_前期車.png", aliases: [] },
  { id: "toei-fleet-10", displayName: "都営12-600形（後期車）", asset: "../images/列车/都営地下鉄/都営地下鉄_12-600形_後期車.png", aliases: [] },
  { id: "toei-fleet-11", displayName: "日暮里・舎人ライナー300形", asset: "../images/列车/都営地下鉄/都営地下鉄_300形.png", aliases: ["都営日暮里・舎人ライナー300形"] },
  { id: "toei-fleet-12", displayName: "日暮里・舎人ライナー320形", asset: "../images/列车/都営地下鉄/都営地下鉄_320形.png", aliases: ["都営日暮里・舎人ライナー320形"] },
  { id: "toei-fleet-13", displayName: "日暮里・舎人ライナー330形", asset: "../images/列车/都営地下鉄/都営地下鉄_330形.png", aliases: ["都営日暮里・舎人ライナー330形"] }
].forEach(function(rec) {
  CANONICAL_VEHICLES[rec.id] = {
    displayName: rec.displayName,
    iconName: rec.displayName,
    asset: rec.asset,
    aliases: rec.aliases,
    candidateOnly: rec.candidateOnly === true
  };
  if(rec.plannedAsset) CANONICAL_VEHICLES[rec.id].plannedAsset=rec.plannedAsset;
});

// ODPT 的 trainOwner（而非 operator）用于识别直通线路上实际运营方的
// 车辆。当前只有这两支都营自有车队是单一车型；
// 三田线和大江户线包含多种车型，不要在此猜测。
function resolveToeiOwnerSingleFleet(ctx) {
  if (normOp(ctx.operator) !== "Toei") return null;
  var owner = String(ctx.trainOwner || "").replace(/^odpt\.(?:Operator|TrainOwner):/, "");
  if (owner !== "Toei") return null;
  if (ctx.lineId === "Asakusa" && ctx.railway === "odpt.Railway:Toei.Asakusa")
    return "都営5500形";
  if (ctx.lineId === "Shinjuku" && ctx.railway === "odpt.Railway:Toei.Shinjuku")
    return "都営10-300形";
  return null;
}

// 都营实时 feed 在没有实体车号时仍能通过末尾运用字母确定
// 所属方，但不能在混合车队内挑出某一编成。这里的运用号库只描述
// 长期稳定的“线路 + 运用号后缀”约束，不承载某一天的编成分配。
// 因而它可以缩小车队候选，但候选本身绝不取得 PNG 身份。
var TOEI_OPERATION_FLEET_LIBRARY = [
  {
    lineId: "Mita",
    operationPatterns: ["20T-89T"],
    candidates: ["都営6300形（3次車）", "都営6500形"]
  },
  {
    lineId: "Oedo",
    // 大江户线运用号以 A/B 系列标识；具体编成仍需实体车号或编成证据。
    operationPatterns: ["*A", "*B"],
    candidates: [
      "都営12-000形（4次車）",
      "都営12-600形（1次車）",
      "都営12-600形（前期車）",
      "都営12-600形（後期車）"
    ]
  }
];

// 运营番号库的图片投影。这里保留“号段 -> 车型 -> PNG”的原始结构，
// 但只有 mappings 只有一个车型时才允许实时链路把它提升为 EXACT。
// Mita/Oedo 的同一号段仍可能换车，因此保留完整的候选图片集合，
// 不用第一张图冒充实际编成。
var TOEI_OPERATION_PNG_LIBRARY = [
  {
    lineId: "Asakusa",
    operator: "Toei",
    operationPatterns: ["*T"],
    mappings: [
      { vehicleType: "都営5500形" }
    ],
    sourceUrl: "https://www.kotsu.metro.tokyo.jp/about/koukai/vehicle_outline/model_diagram/"
  },
  {
    lineId: "Shinjuku",
    operator: "Toei",
    operationPatterns: ["*T"],
    mappings: [
      // 10-300形的图库只有代表图；身份仍是唯一车型，图片按代表图展示。
      { vehicleType: "都営10-300形", representative: true }
    ],
    sourceUrl: "https://www.kotsu.metro.tokyo.jp/about/koukai/vehicle_outline/model_diagram/"
  },
  {
    lineId: "Mita",
    operator: "Toei",
    operationPatterns: ["20T-89T"],
    // 同一运用号段覆盖 6300 形与 6500 形；保留完整候选集，
    // 不能把号段本身当成单一车型证据。
    candidateOnly: true,
    mappings: [
      { vehicleType: "都営6300形（3次車）" },
      { vehicleType: "都営6500形" }
    ],
    sourceUrl: "https://www.kotsu.metro.tokyo.jp/about/koukai/vehicle_outline/model_diagram/"
  },
  {
    lineId: "Oedo",
    operator: "Toei",
    operationPatterns: ["*A", "*B"],
    // A/B 运用号会跨越 12-000 与 12-600 各次车，
    // 只有实体车号或日期编成证据才能提升为具体 PNG。
    candidateOnly: true,
    mappings: [
      { vehicleType: "都営12-000形（4次車）" },
      { vehicleType: "都営12-600形（1次車）" },
      { vehicleType: "都営12-600形（前期車）" },
      { vehicleType: "都営12-600形（後期車）" }
    ],
    sourceUrl: "https://www.kotsu.metro.tokyo.jp/about/koukai/vehicle_outline/model_diagram/"
  }
];

function _toeiOperationCode(ctx) {
  ctx = ctx || {};
  var explicit = String(ctx.operationCode || "").toUpperCase().trim();
  if (explicit) return explicit;
  var normalizer = window.TrainOperationEvidence &&
    typeof window.TrainOperationEvidence.normalizeOperationCode === "function"
    ? window.TrainOperationEvidence.normalizeOperationCode : null;
  return normalizer ? String(normalizer(ctx.trainNumber, ctx) || "").toUpperCase().trim() : "";
}

function _toeiOperationLibraryEntry(ctx) {
  if (!ctx) return null;
  var code = _toeiOperationCode(ctx);
  var hasCode = !!code;
  for (var i = 0; i < TOEI_OPERATION_FLEET_LIBRARY.length; i++) {
    var entry = TOEI_OPERATION_FLEET_LIBRARY[i];
    if (entry.lineId !== ctx.lineId ||
        (entry.railway && entry.railway !== ctx.railway)) continue;
    // 运用号缺失时不能把整条线路扩大成车型候选；只有明确运用号
    // 且通过库内规则，才能进入 NARROWED 结果。
    if (hasCode && entry.operationPatterns.some(function(pattern) {
      return familyPatternMatches(pattern, code);
    })) return entry;
  }
  return null;
}

function _toeiOperationPngLibraryEntry(ctx) {
  if (!ctx) return null;
  var operator = normOp(ctx.operator || ctx.trainOwner || "");
  if (operator && operator !== "Toei") return null;
  var code = _toeiOperationCode(ctx);
  if (!code) return null;
  for (var i = 0; i < TOEI_OPERATION_PNG_LIBRARY.length; i++) {
    var entry = TOEI_OPERATION_PNG_LIBRARY[i];
    if (entry.lineId !== ctx.lineId) continue;
    if (entry.operator && operator && entry.operator !== operator) continue;
    if (entry.operationPatterns.some(function(pattern) {
      return familyPatternMatches(pattern, code);
    })) return entry;
  }
  return null;
}

function resolveToeiOperationArtwork(ctx) {
  var entry = _toeiOperationPngLibraryEntry(ctx);
  return entry ? entry.mappings.map(function(mapping) {
    var canonical = resolveCanonicalVehicle(mapping.vehicleType);
    return Object.assign({}, mapping, {
      asset: canonical && (canonical.asset || canonical.plannedAsset) || "",
      sourceUrl: entry.sourceUrl || ""
    });
  }) : [];
}

function resolveToeiOperationExact(ctx) {
  var mappings = resolveToeiOperationArtwork(ctx);
  if (mappings.length !== 1) return null;
  return mappings[0];
}

// 公开只读快照，供审计工具和运行诊断检查“运营号段 -> PNG”是否完整。
// canonical family rules 中同样的唯一车型规则也纳入快照，避免维护第二套
// 线路运行表；Toei 的多车型号段则只输出候选集合。
var _operationPngLibraryCache = { revision: -1, rules: null, rows: null };
function getOperationPngLibrary() {
  var revision = window.TrainOperationEvidence &&
    typeof window.TrainOperationEvidence.getRevision === "function"
    ? window.TrainOperationEvidence.getRevision() : 0;
  var rules = window.VEHICLE_FAMILY_RULES || [];
  if (_operationPngLibraryCache.rows &&
      _operationPngLibraryCache.revision === revision &&
      _operationPngLibraryCache.rules === rules) {
    return _operationPngLibraryCache.rows;
  }
  var rows = [];
  var seen = Object.create(null);
  function add(row) {
    if (!row || !row.lineId || !row.operationPatterns || !row.mappings || !row.mappings.length) return;
    var key = [String(row.lineId).toLowerCase(), row.operationPatterns.join(","), row.mappings.map(function(m){return m.vehicleType;}).join(",")].join("|");
    if (seen[key]) return;
    seen[key] = true;
    rows.push({
      lineId: row.lineId,
      operator: row.operator || "",
      operationPatterns: row.operationPatterns.slice(),
      mappings: row.mappings.map(function(m){
        var canonical = resolveCanonicalVehicle(m.vehicleType);
        return Object.assign({}, m, {
          asset: m.asset || (canonical && (canonical.asset || canonical.plannedAsset)) || ""
        });
      }),
      sourceUrl: row.sourceUrl || "",
      effectiveFrom: row.effectiveFrom || "",
      effectiveTo: row.effectiveTo || "",
      calendarType: row.calendarType || "",
      realtimeScope: row.realtimeScope || null,
      candidateOnly: row.candidateOnly === true,
      planOnly: row.planOnly === true
    });
  }
  TOEI_OPERATION_PNG_LIBRARY.forEach(add);
  rules.forEach(function(rule) {
    if (!rule || !rule.networkKey || !rule.codePattern || rule.codePattern === "*") return;
    var sourceNames = rule.exactVehicleType ? [rule.exactVehicleType] :
      (Array.isArray(rule.vehicleCandidates) ? rule.vehicleCandidates : []);
    if (!sourceNames.length) return;
    var mappings = sourceNames.map(function(name) {
      var canonical = resolveCanonicalVehicle(name);
      var asset = canonical && (canonical.asset || canonical.plannedAsset);
      return asset ? { vehicleType: name, asset: asset, representative: !canonical.asset } : null;
    }).filter(Boolean);
    if (!mappings.length) return;
    add({
      lineId: rule.networkKey,
      operationPatterns: [rule.codePattern],
      mappings: mappings,
      sourceUrl: rule.sourceUrl || "",
      effectiveFrom: rule.effectiveFrom || "",
      effectiveTo: rule.effectiveTo || "",
      calendarType: rule.calendarType || "",
      realtimeScope: rule.realtimeScope || null,
      candidateOnly: !rule.exactVehicleType,
      planOnly: !!(rule.planScope && rule.planScope.planOnly)
    });
  });
  rows.forEach(function(row) {
    row.operationPatterns = Object.freeze(row.operationPatterns);
    row.mappings.forEach(Object.freeze);
    row.mappings = Object.freeze(row.mappings);
    Object.freeze(row);
  });
  rows = Object.freeze(rows);
  _operationPngLibraryCache = { revision: revision, rules: rules, rows: rows };
  return rows;
}

function resolveOperationPng(ctx) {
  ctx = ctx || {};
  var code = _toeiOperationCode(ctx);
  if (!code) return null;
  var operator = normOp(ctx.operator || ctx.trainOwner || "");
  var matches = getOperationPngLibrary().filter(function(row) {
    if (row.planOnly) return false;
    if (row.operator && operator && row.operator !== operator) return false;
    if (row.lineId !== ctx.lineId) {
      var matcher = window.TrainOperationEvidence && window.TrainOperationEvidence.matchesNetwork;
      if (typeof matcher !== "function" || !matcher(row.lineId, ctx)) return false;
    }
    var serviceDate = String(ctx.serviceDate || "").slice(0, 10);
    if (row.effectiveFrom && serviceDate && serviceDate < row.effectiveFrom) return false;
    if (row.effectiveTo && serviceDate && serviceDate > row.effectiveTo) return false;
    if (row.calendarType && String(row.calendarType).toLowerCase() !== String(ctx.calendarType || "").toLowerCase()) return false;
    if (row.realtimeScope && Array.isArray(row.realtimeScope.trainTypes)) {
      var trainType = String(ctx.trainType || "").split(/[:.]/).pop();
      if (!trainType || row.realtimeScope.trainTypes.indexOf(trainType) < 0) return false;
    }
    if (row.realtimeScope && Array.isArray(row.realtimeScope.carCompositions)) {
      var composition = Number(ctx.carComposition);
      if (!isFinite(composition) || row.realtimeScope.carCompositions.indexOf(composition) < 0) return false;
    }
    return row.operationPatterns.some(function(pattern) {
      return familyPatternMatches(pattern, code);
    });
  });
  if (!matches.length) return null;
  var mappings = [];
  matches.forEach(function(row) {
    (row.mappings || []).forEach(function(mapping) {
      if (!mappings.some(function(existing) { return existing.vehicleType === mapping.vehicleType; })) {
        mappings.push(Object.assign({}, mapping, { sourceUrl: mapping.sourceUrl || row.sourceUrl || "" }));
      }
    });
  });
  if (!mappings.length) return null;
  var candidateOnly = matches.some(function(row) { return row.candidateOnly === true; });
  return {
    status: !candidateOnly && mappings.length === 1 ? "EXACT" : "NARROWED",
    operationCode: code,
    mappings: mappings,
    vehicleType: mappings.length === 1 ? mappings[0].vehicleType : "",
    asset: mappings.length === 1 ? mappings[0].asset : "",
    sourceUrls: matches.map(function(row) { return row.sourceUrl || ""; }).filter(function(v, i, a) {
      return v && a.indexOf(v) === i;
    })
  };
}

function resolveToeiOwnerFleetCandidates(ctx) {
  if (!ctx || normOp(ctx.operator) !== "Toei") return [];
  var owner = String(ctx.trainOwner || "").replace(/^odpt\.(?:Operator|TrainOwner):/, "");
  if (owner !== "Toei") return [];
  var entry = _toeiOperationLibraryEntry(ctx);
  return entry ? entry.candidates.slice() : [];
}

// 精确目录补充复用已有命名资产；它们不会给列车分配车型。
Object.assign(CANONICAL_VEHICLES,{
  "jr-209-2000-boso": {
    "displayName": "209系2000番台",
    "iconName": "209系2000番台",
    "asset": null,
    "plannedAsset": "../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png",
    "aliases": [
      "JR東日本209系2000番台"
    ]
  },
  "jr-209-2100-boso": {
    "displayName": "209系2100番台",
    "iconName": "209系2100番台",
    "asset": null,
    "plannedAsset": "../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png",
    "aliases": [
      "JR東日本209系2100番台"
    ]
  },
  "odakyu-30000-EXE": {
    "displayName": "小田急30000形（EXE）",
    "iconName": "小田急30000形（EXE）",
    "asset": "../images/列车/小田急電鉄/小田急電鉄_30000形_EXE.png",
    "aliases": [
      "小田急30000形(EXE)"
    ]
  },
  "odakyu-30000-EXEα": {
    "displayName": "小田急30000形（EXEα）",
    "iconName": "小田急30000形（EXEα）",
    "asset": "../images/列车/小田急電鉄/小田急電鉄_30000形_EXEα.png",
    "aliases": [
      "小田急30000形(EXEα)"
    ]
  }
});
Object.assign(CANONICAL_VEHICLES,{
  "jr-e231-500-plan": {
    "displayName": "E231系500番台",
    "iconName": "E231系500番台（中央・総武線各駅停車）",
    "asset": "../images/列车/JR東日本/JR東日本_E231系_500番台_中央・総武線各駅停車.png",
    "lineIds": ["ChuoSobuLocal"],
    "aliases": ["E231系500番台（中央・総武線）"]
  },
  "jr-e231-0-chuo-sobu": {
    "displayName": "E231系0番台（中央・総武線各駅停車）",
    "iconName": "E231系0番台（中央・総武線各駅停車）",
    "asset": "../images/列车/JR東日本/JR東日本_E231系_0番台_中央・総武線各駅停車.png",
    "lineIds": ["ChuoSobuLocal"],
    "lineAliases": {
      "ChuoSobuLocal": ["E231系0番台"]
    },
    "aliases": ["E231系0番台（中央・総武線）"]
  },
  "metro-08": {
    "displayName": "東京メトロ08系",
    "iconName": "東京メトロ08系",
    "asset": "../images/列车/東京メトロ/東京メトロ_08系.png",
    "lineIds": ["Hanzomon"],
    "lineAliases": { "Hanzomon": ["東京メトロ08系"] },
    "aliases": []
  },
  "metro-8000": {
    "displayName": "東京メトロ8000系",
    "iconName": "東京メトロ8000系",
    "asset": "../images/列车/東京メトロ/東京メトロ_8000系.png",
    "lineIds": ["Hanzomon"],
    "lineAliases": { "Hanzomon": ["東京メトロ8000系"] },
    "aliases": []
  },
  "metro-9000": {
    "displayName": "東京メトロ9000系",
    "iconName": "東京メトロ9000系",
    "asset": "../images/列车/東京メトロ/東京メトロ_9000系.png",
    "lineIds": ["Namboku"],
    "lineAliases": { "Namboku": ["東京メトロ9000系"] },
    "aliases": []
  },
  "metro-10000": {
    "displayName": "東京メトロ10000系",
    "iconName": "東京メトロ10000系",
    "asset": "../images/列车/東京メトロ/東京メトロ_10000系.png",
    "lineIds": ["Yurakucho", "Fukutoshin"],
    "lineAliases": { "Yurakucho": ["東京メトロ10000系"], "Fukutoshin": ["東京メトロ10000系"] },
    "aliases": []
  },
  "metro-13000": {
    "displayName": "東京メトロ13000系",
    "iconName": "東京メトロ13000系",
    "asset": "../images/列车/東京メトロ/東京メトロ_13000系.png",
    "lineIds": ["Hibiya"],
    "lineAliases": { "Hibiya": ["東京メトロ13000系"] },
    "aliases": []
  },
  "metro-17000": {
    "displayName": "東京メトロ17000系",
    "iconName": "東京メトロ17000系",
    "asset": "../images/列车/東京メトロ/東京メトロ_17000系.png",
    "lineIds": ["Yurakucho", "Fukutoshin"],
    "lineAliases": { "Yurakucho": ["東京メトロ17000系"], "Fukutoshin": ["東京メトロ17000系"] },
    "aliases": []
  },
  "metro-18000": {
    "displayName": "東京メトロ18000系",
    "iconName": "東京メトロ18000系",
    "asset": "../images/列车/東京メトロ/東京メトロ_18000系.png",
    "lineIds": ["Hanzomon"],
    "lineAliases": { "Hanzomon": ["東京メトロ18000系"] },
    "aliases": []
  },
  "keio-7000": {
    "displayName": "京王7000系",
    "iconName": "京王7000系",
    "asset": "../images/列车/京王電鉄/京王電鉄_7000系.png",
    "aliases": []
  },
  "keio-8000": {
    "displayName": "京王8000系",
    "iconName": "京王8000系",
    "asset": "../images/列车/京王電鉄/京王電鉄_8000系.png",
    "aliases": []
  },
  "keio-9000": {
    "displayName": "京王9000系",
    "iconName": "京王9000系",
    "asset": "../images/列车/京王電鉄/京王電鉄_9000系.png",
    "aliases": []
  },
  "tx-TX-1000": {
    "displayName": "TX-1000系",
    "iconName": "TX-1000系",
    "asset": "../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-1000系.png",
    "aliases": []
  },
  "tx-TX-2000": {
    "displayName": "TX-2000系",
    "iconName": "TX-2000系",
    "asset": "../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-2000系.png",
    "aliases": []
  },
  "tx-TX-3000": {
    "displayName": "TX-3000系",
    "iconName": "TX-3000系",
    "asset": "../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-3000系.png",
    "aliases": []
  },
  "keikyu-2100": {
    "displayName": "京急2100形",
    "iconName": "京急2100形",
    "asset": "../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png",
    "aliases": []
  },
  "tokyu-5000": {
    "displayName": "東急5000系",
    "iconName": "東急5000系",
    "asset": "../images/列车/東急電鉄/東急電鉄_5000系_従来デザイン.png",
    "aliases": ["東急5000系(10両)", "東急5000系（10両）"]
  },
  "yokohama-y500": {
    "displayName": "横浜高速Y500系",
    "iconName": "横浜高速Y500系",
    "asset": "../images/列车/横浜高速鉄道/横浜高速鉄道_Y500系.png",
    "allowCrossOperator": true,
    "aliases": [
      "横浜高速鉄道Y500系"
    ]
  },
  "seibu-6000-fukutoshin": {
    "displayName": "西武6000系",
    "iconName": "西武6000系",
    "asset": "../images/列车/西武鉄道/西武鉄道_6000系_副都心線対応車.png",
    "aliases": []
  },
  "seibu-40000": {
    "displayName": "西武40000系",
    "iconName": "西武40000系",
    "asset": "../images/列车/西武鉄道/西武鉄道_40000系_青帯.png",
    "lineIds": ["Ikebukuro", "Yurakucho_Seibu", "SeibuChichibu", "SeibuShinjuku"],
    "lineAliases": {"SeibuShinjuku":["40000系（S-TRAIN）","40000系（拝島ライナー）"]},
    "aliases": ["西武40000系（S-TRAIN）","西武40000系（拝島ライナー）"]
  },
  "tobu-50070": {
    "displayName": "東武50070系",
    "iconName": "東武50070系",
    "asset": "../images/列车/東武鉄道/東武鉄道_50070型.png",
    "aliases": [
      "東武50070型"
    ]
  },
  "tobu-9000": {
    "displayName": "東武9000系",
    "iconName": "東武9000系",
    "asset": "../images/列车/東武鉄道/東武鉄道_9000型.png",
    "aliases": [
      "東武9000型"
    ]
  },
  "tobu-9050": {
    "displayName": "東武9050系",
    "iconName": "東武9050系",
    "asset": "../images/列车/東武鉄道/東武鉄道_9050型.png",
    "aliases": [
      "東武9050型"
    ]
  },
  "tokyu-5050": {
    "displayName": "東急5050系",
    "iconName": "東急5050系",
    "asset": "../images/列车/東急電鉄/東急電鉄_5050系.png",
    "aliases": []
  },
  "tokyu-3000-plan": {displayName:"東急3000系",iconName:"東急3000系",asset:null,plannedAsset:"../images/列车/東急電鉄/東急電鉄_3000系_リニューアル車.png",lineAliases:{Mita:["東急3000系"],Namboku:["東急3000系"],TokyuMeguro:["東急3000系"],TokyuShinYokohama:["東急3000系"]},aliases:["東急3000系"]},
  "saitama-2000": {displayName:"埼玉高速2000系",iconName:"埼玉高速2000系",asset:"../images/列车/埼玉高速鉄道/埼玉高速鉄道_2000系.png",aliases:["埼玉高速鉄道2000系"]},
  "subway-fleet-1": {
    "displayName": "東京メトロ05系",
    "iconName": "東京メトロ05系",
    "asset": null,
    "plannedAsset": "../images/列车/東京メトロ/東京メトロ_05系_4～7次車.png",
    "lineIds": ["Tozai", "ChuoSobuLocal"],
    "lineAliases": { "Tozai": ["東京メトロ05系(10両)", "東京メトロ05系"], "ChuoSobuLocal": ["東京メトロ05系(10両)", "東京メトロ05系"] },
    "aliases": [
      "東京メトロ05系(10両)",
      "東京メトロ05N系"
    ]
  },
  "subway-fleet-3": {
    "displayName": "都営12-000形",
    "iconName": "都営12-000形",
    "asset": null,
    "plannedAsset": "../images/列车/都営地下鉄/都営地下鉄_12-000形_4次車.png",
    "aliases": [
      "12-000形"
    ]
  },
  "subway-fleet-4": {
    "displayName": "京王9000系（9030系）",
    "iconName": "京王9000系（9030系）",
    "asset": null,
    "plannedAsset": "../images/列车/京王電鉄/京王電鉄_9000系.png",
    "aliases": [
      "京王9000系30番台",
      "京王9030系"
    ]
  },
  "subway-fleet-5": {
    "displayName": "京急1000形",
    "iconName": "京急1000形",
    "asset": null,
    "plannedAsset": "../images/列车/京浜急行電鉄/京浜急行電鉄_1000形_1200番台.png",
    "aliases": ["京急1000形", "京急新1000形"]
  },
  "tokyu-1000-plan": {
    "displayName": "東急1000系",
    "iconName": "東急1000系",
    "asset": null,
    "plannedAsset": "../images/列车/東急電鉄/東急電鉄_1000系_1012F.png",
    "aliases": ["東急1000系（池上線・多摩川線）"]
  },
  "subway-fleet-6": {
    "displayName": "北総7300形",
    "iconName": "北総7300形",
    "asset": "../images/列车/北総鉄道/北総鉄道_7300形.png",
    "aliases": []
  },
  "subway-fleet-7": {
    "displayName": "北総7500形",
    "iconName": "北総7500形",
    "asset": "../images/列车/北総鉄道/北総鉄道_7500形.png",
    "aliases": []
  },
  "subway-fleet-8": {
    "displayName": "北総7800形",
    "iconName": "北総7800形",
    "asset": "../images/列车/北総鉄道/北総鉄道_7800形.png",
    "aliases": []
  },
  "subway-fleet-9": {
    "displayName": "千葉ニュータウン9100形",
    "iconName": "千葉ニュータウン9100形",
    "asset": "../images/列车/千葉ニュータウン鉄道/千葉ニュータウン鉄道_9100形.png",
    "aliases": [
      "北総9100形"
    ]
  },
  "subway-fleet-10": {
    "displayName": "千葉ニュータウン9200形",
    "iconName": "千葉ニュータウン9200形",
    "asset": "../images/列车/千葉ニュータウン鉄道/千葉ニュータウン鉄道_9200形.png",
    "aliases": [
      "北総9200形"
    ]
  },
  "subway-fleet-11": {
    "displayName": "千葉ニュータウン9800形",
    "iconName": "千葉ニュータウン9800形",
    "asset": "../images/列车/千葉ニュータウン鉄道/千葉ニュータウン鉄道_9800形.png",
    "aliases": [
      "北総9800形"
    ]
  },
  "tokyu-3020": {
    "displayName": "東急3020系",
    "iconName": "東急3020系",
    "asset": "../images/列车/東急電鉄/東急電鉄_3020系.png",
    "aliases": []
  },
  "odakyu-1000": {
    "displayName": "小田急1000形",
    "iconName": "小田急1000形",
    "asset": "../images/列车/小田急電鉄/小田急電鉄_1000形_標準色.png",
    "aliases": []
  },
  "odakyu-2000": {
    "displayName": "小田急2000形",
    "iconName": "小田急2000形",
    "asset": "../images/列车/小田急電鉄/小田急電鉄_2000形_標準色.png",
    "aliases": []
  },
  "odakyu-3000": {
    "displayName": "小田急3000形",
    "iconName": "小田急3000形",
    "asset": "../images/列车/小田急電鉄/小田急電鉄_3000形_標準色.png",
    "aliases": []
  },
  "odakyu-8000": {
    "displayName": "小田急8000形",
    "iconName": "小田急8000形",
    "asset": null,
    "plannedAsset": "../images/列车/小田急電鉄/小田急電鉄_8000形_標準色_更新車.png",
    "lineIds": ["Odawara", "OdakyuEnoshima", "OdakyuTama"],
    "aliases": []
  },
  "odakyu-60000": {
    "displayName": "小田急60000形",
    "iconName": "小田急60000形",
    "asset": "../images/列车/小田急電鉄/小田急電鉄_60000形_MSE.png",
    "aliases": ["小田急60000系(MSE)"]
  },
  "odakyu-70000": {
    "displayName": "小田急70000形",
    "iconName": "小田急70000形",
    "asset": "../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png",
    "aliases": []
  },
  "seibu-20000": {
    "displayName": "西武20000系",
    "iconName": "西武20000系",
    "asset": "../images/列车/西武鉄道/西武鉄道_20000系_標準塗装.png",
    "aliases": []
  },
  "seibu-30000": {
    "displayName": "西武30000系",
    "iconName": "西武30000系",
    "asset": "../images/列车/西武鉄道/西武鉄道_30000系_スマイルトレイン.png",
    "aliases": []
  },
  "seibu-9000": {
    "displayName": "西武9000系",
    "iconName": "西武9000系",
    "asset": "../images/列车/西武鉄道/西武鉄道_9000系.png",
    "aliases": []
  },
  "jr-west-285-sunrise": {
    "displayName": "285系（サンライズ出雲）",
    "iconName": "285系（サンライズ出雲）",
    "asset": "../images/列车/JR西日本/JR西日本_285系_サンライズエクスプレス.png",
    "lineIds": ["TokaidoKansai", "SanyoMain", "SaninMain"],
    "allowCrossOperator": true,
    "aliases": ["JR西日本285系（サンライズ出雲）", "285系（サンライズエクスプレス）"]
  },
  "seibu-001": {
    "displayName": "西武001系",
    "iconName": "西武001系",
    "asset": "../images/列车/西武鉄道/西武鉄道_001系_Laview.png",
    "aliases": [
      "001系（Laview）"
    ]
  },
  "tobu-634": {
    "displayName": "東武634型",
    "iconName": "東武634型",
    "asset": "../images/列车/東武鉄道/東武鉄道_634型_スカイツリートレイン.png",
    "lineIds": ["TobuNikko", "TobuSkytree"],
    "aliases": ["東武634形", "東武634型（スカイツリートレイン）"]
  },
  "hakodate-30": {
    "displayName": "函館市電30形", "iconName": "函館市電30形",
    "asset": "../images/列车/函館市電/函館市電_30形_39号車.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電30形", "函館市電30型"]
  },
  "hakodate-30-39": {
    "displayName": "函館市電30形（39号車）", "iconName": "函館市電30形（39号車）",
    "asset": "../images/列车/函館市電/函館市電_30形_39号車.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電39号車"]
  },
  "hakodate-500": {
    "displayName": "函館市電500形", "iconName": "函館市電500形",
    "asset": "../images/列车/函館市電/函館市電_500形.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電500型"]
  },
  "hakodate-710": {
    "displayName": "函館市電710形", "iconName": "函館市電710形",
    "asset": "../images/列车/函館市電/函館市電_710形.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電710型"]
  },
  "hakodate-7000": {
    "displayName": "函館市電7000形", "iconName": "函館市電7000形",
    "asset": "../images/列车/函館市電/函館市電_7000形.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電7000型"]
  },
  "hakodate-3000": {
    "displayName": "函館市電3000形", "iconName": "函館市電3000形",
    "asset": "../images/列车/函館市電/函館市電_3000形.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電3000型"]
  },
  "hakodate-3000-3001": {
    "displayName": "函館市電3000形（3001号車）", "iconName": "函館市電3000形（3001号車）",
    "asset": "../images/列车/函館市電/函館市電_3000形_3001号車.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電3001号車"]
  },
  "hakodate-3000-3002": {
    "displayName": "函館市電3000形（3002号車）", "iconName": "函館市電3000形（3002号車）",
    "asset": "../images/列车/函館市電/函館市電_3000形_3002号車.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電3002号車"]
  },
  "hakodate-8000": {
    "displayName": "函館市電8000形", "iconName": "函館市電8000形",
    "asset": "../images/列车/函館市電/函館市電_8000形.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電8000型"]
  },
  "hakodate-8100": {
    "displayName": "函館市電8100形", "iconName": "函館市電8100形",
    "asset": "../images/列车/函館市電/函館市電_8100形.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電8100型"]
  },
  "hakodate-9600": {
    "displayName": "函館市電9600形", "iconName": "函館市電9600形",
    "asset": "../images/列车/函館市電/函館市電_9600形.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電9600型", "函館市電らっくる号"]
  },
  "hakodate-9600-9601": {
    "displayName": "函館市電9600形（9601号車）", "iconName": "函館市電9600形（9601号車）",
    "asset": "../images/列车/函館市電/函館市電_9600形_9601号車.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電9601号車"]
  },
  "hakodate-9600-9604": {
    "displayName": "函館市電9600形（9604号車）", "iconName": "函館市電9600形（9604号車）",
    "asset": "../images/列车/函館市電/函館市電_9600形_9604号車.png",
    "lineIds": ["Hakodate2", "Hakodate5"], "aliases": ["函館市電9604号車"]
  }
});

// 已发布的来源注释在同一目录索引中保留其显式车型。
var VEHICLE_ALIAS_EXTENSIONS = {
  "seibu-40000": ["西武40000系（デュアルシート）"],
  "jr-e353": ["E353系（あずさ）"],
  "jr-east-e257-500-boso": ["E257系500番台（わかしお）", "E257系500番台（さざなみ）", "E257系500番台（しおさい）"],
  "remaining-fleet-extra-0": ["西武2000系（8両編成・池袋線直通）"],
  "remaining-fleet-extra-8": ["東武N100系「スペーシアX」"],
  "remaining-fleet-extra-9": ["東武100系「スペーシア」", "東武100系"],
  "remaining-fleet-extra-10": ["東武500系「リバティ」", "東武500系「リバティ会津」"],
  "planned-stock-library-57": ["相鉄8000系(10両)", "相鉄8000系（10両）"],
  "planned-stock-library-58": ["相鉄9000系(10両)", "相鉄9000系（10両）"],
  "planned-stock-library-60": ["相鉄11000系(10両)", "相鉄11000系（10両）"],
  "planned-stock-library-42": ["東京モノレール1000形（1003編成）"],
  "planned-stock-library-63": ["東武10030系"],
  "planned-stock-library-61": ["東武8000系"]
};
Object.keys(VEHICLE_ALIAS_EXTENSIONS).forEach(function(id) {
  if (CANONICAL_VEHICLES[id]) CANONICAL_VEHICLES[id].aliases.push.apply(
    CANONICAL_VEHICLES[id].aliases, VEHICLE_ALIAS_EXTENSIONS[id]);
});
CANONICAL_VEHICLES["planned-stock-library-40"].lineAliases = {TokyoMonorail: ["10000形"]};
CANONICAL_VEHICLES["planned-stock-library-41"].lineAliases = {TokyoMonorail: ["2000形"]};
CANONICAL_VEHICLES["planned-stock-library-42"].lineAliases = {TokyoMonorail: ["1000形"]};
CANONICAL_VEHICLES["tobu-60000"] = {
  displayName: "東武60000系",
  iconName: "東武60000系",
  asset: "../images/列车/東武鉄道/東武鉄道_60000系.png",
  lineIds: ["Noda"],
  aliases: []
};
// 对于来源条目被多个运营方共用，或由车队子列表生成的既有目录记录，
// 明确限定线路范围。
var VEHICLE_LINE_SCOPE_OVERRIDES = {
  "new-shuttle-2000-01": ["NewShuttle"],
  "new-shuttle-2000-02": ["NewShuttle"],
  "new-shuttle-2000-03": ["NewShuttle"],
  "new-shuttle-2000-04": ["NewShuttle"],
  "new-shuttle-2000-05": ["NewShuttle"],
  "new-shuttle-2000-06": ["NewShuttle"],
  "new-shuttle-2000-07": ["NewShuttle"],
  "keikyu-1500": ["Keikyu", "KeikyuAirport", "KeikyuKurihama", "KeikyuZushi", "Daishi_Keikyu"],
  "keikyu-600": ["Keikyu", "KeikyuAirport", "KeikyuKurihama", "KeikyuZushi"],
  "keikyu-2100": ["Keikyu", "KeikyuAirport", "KeikyuKurihama"],
  "keio-7000": ["KeioMain", "KeioShin", "KeioSagami", "KeioTakao", "KeioKeibajo", "KeioZoo"],
  "keio-8000": ["KeioMain", "KeioShin", "KeioSagami", "KeioTakao", "KeioKeibajo", "KeioZoo"],
  "keio-9000": ["KeioMain", "KeioShin", "KeioSagami", "KeioTakao", "KeioKeibajo", "KeioZoo", "Shinjuku"],
  "jr-east-e231-800-tozai-through": ["Tozai", "ChuoSobuLocal"],
  "metro-2000": ["Marunouchi", "MarunouchiBranch"],
  "metro-07-10": ["Tozai", "ChuoSobuLocal"],
  "metro-15000-10": ["Tozai", "ChuoSobuLocal"],
  "toyo-rapid-2000-tozai-through": ["ToyoRapid", "Tozai", "ChuoSobuLocal"],
  "twr-70-000-rinkai": ["Rinkai"],
  "twr-71-000-rinkai": ["Rinkai"],
  "planned-stock-library-29": ["ChibaMonorail1"],
  "planned-stock-library-30": ["ChibaMonorail2"],
  "planned-stock-library-31": ["Yurikamome"],
  "planned-stock-library-32": ["Yurikamome"],
  "planned-stock-library-40": ["TokyoMonorail"],
  "planned-stock-library-41": ["TokyoMonorail"],
  "tx-TX-1000": ["TsukubaExpress"],
  "tx-TX-2000": ["TsukubaExpress"],
  "tx-TX-3000": ["TsukubaExpress"],
  "toei-fleet-0": ["Asakusa", "Keisei"],
  "toei-fleet-1": ["Mita"],
  "toei-fleet-2": ["Mita"],
  "toei-fleet-3": ["Shinjuku"],
  "toei-fleet-4": ["Shinjuku"],
  "toei-fleet-5": ["Shinjuku"],
  "toei-fleet-6": ["Oedo"],
  "toei-fleet-7": ["Oedo"],
  "toei-fleet-8": ["Oedo"],
  "metro-05-chiyoda-shuttle": ["Chiyoda", "ChiyodaBranch"],
  "toei-fleet-9": ["Oedo"],
  "toei-fleet-10": ["Oedo"],
  "toei-fleet-11": ["Nippori_Toneri"],
  "toei-fleet-12": ["Nippori_Toneri"],
  "toei-fleet-13": ["Nippori_Toneri"],
  "keisei-3000": ["Keisei", "KeiseiOshiage", "KeiseiKanamachi", "KeiseiChiba", "KeiseiChihara", "Asakusa"],
  "keisei-3100": ["Keisei", "KeiseiOshiage", "KeiseiChiba", "KeiseiChihara", "NaritaSkyAccess", "Asakusa"],
  "keisei-3200": ["Keisei", "KeiseiOshiage", "KeiseiChiba", "KeiseiChihara"],
  "keisei-3500-updated": ["Keisei", "KeiseiOshiage", "KeiseiKanamachi", "KeiseiChiba", "KeiseiChihara"],
  "keisei-3600": ["Keisei", "KeiseiOshiage", "KeiseiKanamachi", "KeiseiChiba", "KeiseiChihara"],
  "keisei-80000": ["Keisei"],
  "keisei-8800": ["Keisei"],
  "keisei-8900": ["Keisei"],
  "keisei-3400": ["Keisei", "KeiseiOshiage", "KeiseiChiba", "KeiseiChihara"],
  "keisei-3700": ["Keisei", "KeiseiOshiage", "KeiseiChiba", "KeiseiChihara"],
  "odakyu-4000": ["Odawara", "OdakyuEnoshima", "OdakyuTama", "Chiyoda", "ChiyodaBranch", "JobanLocal"],
  "odakyu-5000": ["Odawara", "OdakyuEnoshima", "OdakyuTama"],
  "odakyu-1000": ["Odawara", "OdakyuEnoshima", "OdakyuTama"],
  "odakyu-2000": ["Odawara", "OdakyuEnoshima", "OdakyuTama"],
  "odakyu-3000": ["Odawara", "OdakyuEnoshima", "OdakyuTama"],
  "odakyu-8000": ["Odawara", "OdakyuEnoshima", "OdakyuTama"],
  "tokyu-2020-10": ["TokyuDenEn"],
  "tokyu-5080": ["TokyuMeguro"],
  "tokyu-6020": ["TokyuOimachi"],
  "tokyu-7000": ["TokyuIkegami", "TokyuTamagawa"],
  "tokyu-1000-1500-plan": ["TokyuIkegami", "TokyuTamagawa"],
  "tokyu-1000-plan": ["TokyuIkegami", "TokyuTamagawa"],
  "tokyu-5000": ["TokyuToyoko", "TokyuDenEn"],
  "tokyu-5050": ["TokyuToyoko", "MinatoMirai", "Fukutoshin", "Yurakucho"],
  "tokyu-3000-plan": ["TokyuMeguro", "TokyuShinYokohama", "Mita", "Namboku"],
  "tokyu-3020": ["TokyuMeguro", "TokyuShinYokohama"],
  "yokohama-y500": ["TokyuToyoko", "MinatoMirai", "Fukutoshin"],
  "seibu-6000-fukutoshin": ["Ikebukuro", "Yurakucho_Seibu", "Fukutoshin"],
  "seibu-40000": ["Ikebukuro", "Yurakucho_Seibu", "Fukutoshin", "Yurakucho", "SeibuChichibu", "SeibuShinjuku"],
  "seibu-20000": ["Ikebukuro", "SeibuShinjuku"],
  "seibu-30000": ["Ikebukuro", "SeibuShinjuku"],
  "seibu-9000": ["Ikebukuro", "SeibuShinjuku"],
  "seibu-001": ["Ikebukuro", "SeibuChichibu"],
  "saitama-2000": ["SaitamaRapid", "Namboku"],
  "tobu-50000-10": ["Tojo"],
  "tobu-50050-10": ["TobuIsesaki", "TobuSkytree", "Hanzomon"],
  "tobu-70090": ["TobuIsesaki", "TobuSkytree", "Hibiya"],
  "tobu-50070": ["Tojo", "Yurakucho", "Fukutoshin"],
  "tobu-9000": ["Tojo", "Yurakucho", "Fukutoshin"],
  "tobu-9050": ["Tojo", "Yurakucho", "Fukutoshin"],
  "sotetsu-13000-8": ["SotetsuMain", "SotetsuIzumino", "SotetsuShin-Yokohama", "SotetsuJRDirect"],
  "sotetsu-20000-10": ["SotetsuMain", "SotetsuIzumino", "SotetsuShin-Yokohama", "Fukutoshin", "Toyoko", "TokyuMeguro", "Mita", "Namboku"],
  "sotetsu-21000": ["SotetsuMain", "SotetsuIzumino", "SotetsuShin-Yokohama", "Meguro", "TokyuMeguro", "Mita", "Namboku"],
  "sotetsu-12000": ["SotetsuMain", "SotetsuIzumino", "SotetsuJRDirect", "SaikyoKawagoe"],
  "jr-east-209-3000-hachiko-kawagoe": ["Hachiko", "Kawagoe"],
  "jr-east-209-3100-kawagoe": ["Kawagoe"],
  "jr-e233-1000": ["KeihinTohoku", "KeihinTohokuNegishi"],
  "jr-e131-800": ["Senseki"],
  "jr-east-209-500-musashino": ["Musashino"],
  "subway-fleet-1": ["Tozai", "ChuoSobuLocal"],
  "subway-fleet-3": ["Oedo"],
  "subway-fleet-4": ["KeioMain", "KeioShin", "Shinjuku"],
  "subway-fleet-5": ["Asakusa", "Keikyu", "KeikyuAirport", "KeikyuKurihama", "KeikyuZushi"],
  "planned-stock-library-0": ["Nambu"],
  "planned-stock-library-3": ["Takasaki"],
  "planned-stock-library-8": ["Tazawako"],
  "planned-stock-library-9": ["YamagataShinkansen"],
  "planned-stock-library-10": ["BanetsuEast", "BanetsuWest"],
  "jr-east-highrail1375-plan": ["Komii"],
  "remaining-fleet-extra-15": ["BanetsuWest"],
  "jr-east-c57-banetsu-plan": ["BanetsuWest"],
  "jr-east-de10-banetsu-plan": ["BanetsuWest"],
  "jr-east-hbe300-satono-plan": ["BanetsuWest"],
  "planned-stock-library-1": ["Yokosuka", "SobuRapid"],
  "planned-stock-library-2": ["Yokosuka", "Narita", "NaritaAirportBranch", "SobuRapid", "ShonanShinjuku"],
  "planned-stock-library-5": ["NambuBranch", "Oito"],
  "planned-stock-library-4": ["Shinetsu", "Hakushin", "Echigo", "Miyo"],
  "planned-stock-library-6": ["Shinetsu", "Hakushin", "Oito"],
  "planned-stock-library-11": ["Kururi", "Suigun"],
  "planned-stock-library-12": ["Kururi"],
  "planned-stock-library-13": ["Hachinohe"],
  "planned-stock-library-14": ["Senseki", "SensekiTohoku"],
  "planned-stock-library-16": ["Uetsu", "Shinetsu", "BanetsuEast", "BanetsuWest", "OuMain", "Gono"],
  "planned-stock-library-17": ["Karasuyama"],
  "planned-stock-library-18": ["Oga"],
  "planned-stock-library-19": ["TohokuShinkansen"],
  "planned-stock-library-20": ["AkitaShinkansen"],
  "planned-stock-library-21": ["JoetsuShinkansen", "HokurikuShinkansen"],
  "planned-stock-library-22": ["YamagataShinkansen"],
  "planned-stock-library-23": ["TohokuShinkansen"],
  "planned-stock-library-28": ["KyushuShinkansen"],
  "planned-stock-library-15": ["Hachiko"],
  "planned-stock-library-33": ["YokohamaBlue"],
  "planned-stock-library-34": ["YokohamaBlue"],
  "planned-stock-library-35": ["YokohamaBlue"],
  "planned-stock-library-36": ["YokohamaBlue"],
  "planned-stock-library-37": ["YokohamaBlue"],
  "planned-stock-library-38": ["YokohamaBlue"],
  "planned-stock-library-39": ["YokohamaGreen"],
  "planned-stock-library-42": ["TokyoMonorail"],
  "planned-stock-library-43": ["ShonanMonorail"],
  "planned-stock-library-44": ["NewShuttle"],
  "planned-stock-library-45": ["NewShuttle"],
  "planned-stock-library-46": ["TamaMonorail"],
  "planned-stock-library-50": ["Arakawa"],
  "planned-stock-library-51": ["Arakawa"],
  "planned-stock-library-52": ["Arakawa"],
  "planned-stock-library-53": ["Arakawa"],
  "planned-stock-library-54": ["KeioInokashira"],
  "planned-stock-library-55": ["TokyuKodomonokuni"],
  "planned-stock-library-56": ["TokyuSetagaya"],
  "planned-stock-library-57": ["SotetsuMain", "SotetsuIzumino", "SotetsuShin-Yokohama"],
  "planned-stock-library-58": ["SotetsuMain", "SotetsuIzumino", "SotetsuShin-Yokohama"],
  "planned-stock-library-59": ["SotetsuMain", "SotetsuIzumino", "SotetsuShin-Yokohama", "SotetsuJRDirect"],
  "planned-stock-library-60": ["SotetsuMain", "SotetsuIzumino", "SotetsuShin-Yokohama", "SotetsuJRDirect"],
  "planned-stock-library-64": ["TobuUtsunomiya", "TobuNikko"],
  "planned-stock-library-65": ["Keisei", "NaritaSkyAccess"],
  "jr-east-e131-0-plan": ["Uchibo", "Sotobo", "Narita", "Kashima"],
   "jr-east-e127-100-nagano-plan": ["Oito", "ChuoMain", "Shinonoi", "Shinetsu"],
   "jr-east-e127-100-nagano-horo-plan": ["Oito", "ChuoMain", "Shinonoi", "Shinetsu"],
  "jr-east-hbe220-hachiko-plan": ["Hachiko"],
  "jr-east-e231-900-musashino": ["Musashino"],
  "jr-209-2000-boso": ["Uchibo", "Sotobo", "Narita", "SobuMain"],
  "jr-209-2100-boso": ["Uchibo", "Sotobo", "Narita", "SobuMain"],
  "remaining-fleet-extra-16": ["Uetsu"],
  "izukyu-8000-plan": ["Ito"],
  "izukyu-3000-plan": ["Ito"],
  "izukyu-2100-plan": ["Ito"],
  "odakyu-30000-EXE": ["Odawara", "OdakyuEnoshima"],
  "odakyu-30000-EXEα": ["Odawara", "OdakyuEnoshima"],
  "odakyu-60000": ["Odawara", "OdakyuEnoshima", "Chiyoda"],
  "odakyu-70000": ["Odawara", "OdakyuEnoshima"],
  "remaining-fleet-extra-0": ["SeibuShinjuku", "Ikebukuro", "SeibuToshima"],
  "remaining-fleet-extra-2": ["SeibuChichibu"],
  "remaining-fleet-extra-3": ["SeibuShinjuku"],
  "remaining-fleet-extra-4": ["SeibuYamaguchi"],
  "remaining-fleet-extra-7": ["Tojo"],
  "remaining-fleet-extra-8": ["TobuNikko"],
  "remaining-fleet-extra-12": ["TobuIsesaki"],
  "remaining-fleet-extra-13": ["Noda"],
  "subway-fleet-6": ["Keisei", "KeiseiOshiage", "KeiseiChiba", "KeiseiChihara", "NaritaSkyAccess"],
  "subway-fleet-7": ["Keisei", "KeiseiOshiage", "KeiseiChiba", "KeiseiChihara", "NaritaSkyAccess"],
  "subway-fleet-8": ["Keisei", "KeiseiOshiage", "KeiseiChiba", "KeiseiChihara", "NaritaSkyAccess"],
  "subway-fleet-9": ["Keisei", "KeiseiOshiage", "KeiseiChiba", "KeiseiChihara", "NaritaSkyAccess"],
  "subway-fleet-10": ["Keisei", "KeiseiOshiage", "KeiseiChiba", "KeiseiChihara", "NaritaSkyAccess"],
  "subway-fleet-11": ["Keisei", "KeiseiOshiage", "KeiseiChiba", "KeiseiChihara", "NaritaSkyAccess"]
};
Object.keys(VEHICLE_LINE_SCOPE_OVERRIDES).forEach(function(id) {
  if (CANONICAL_VEHICLES[id]) CANONICAL_VEHICLES[id].lineIds = VEHICLE_LINE_SCOPE_OVERRIDES[id].slice();
});
for (var todenScopeIndex = 0; todenScopeIndex < 15; todenScopeIndex++) {
  var todenScopeRecord = CANONICAL_VEHICLES["toden-arakawa-car-group-" + todenScopeIndex];
  if (todenScopeRecord) todenScopeRecord.lineIds = ["Arakawa"];
}
var CANONICAL_VEHICLE_ALIAS_INDEX = {};
var CANONICAL_VEHICLE_ALIAS_CONFLICTS = {};
var CANONICAL_VEHICLE_PLANNED_ALIAS_INDEX = {};
var CANONICAL_VEHICLE_PLANNED_ALIAS_CONFLICTS = {};
function _canonicalVehicleAliasKey(value) {
  return String(value || "").replace(/（/g, "(").replace(/）/g, ")").trim();
}
function _registerCanonicalVehicleAlias(alias, rec) {
  var key = _canonicalVehicleAliasKey(alias);
  if (!key || CANONICAL_VEHICLE_ALIAS_CONFLICTS[key]) return;
  var existing = CANONICAL_VEHICLE_ALIAS_INDEX[key];
  if (existing && existing.id !== rec.id) {
    delete CANONICAL_VEHICLE_ALIAS_INDEX[key];
    CANONICAL_VEHICLE_ALIAS_CONFLICTS[key] = true;
    return;
  }
  CANONICAL_VEHICLE_ALIAS_INDEX[key] = rec;
}
function _registerCanonicalVehiclePlannedAlias(alias, rec) {
  var key = _canonicalVehicleAliasKey(alias);
  if (!key || CANONICAL_VEHICLE_PLANNED_ALIAS_CONFLICTS[key]) return;
  var existing = CANONICAL_VEHICLE_PLANNED_ALIAS_INDEX[key];
  if (existing && existing.id !== rec.id) {
    delete CANONICAL_VEHICLE_PLANNED_ALIAS_INDEX[key];
    CANONICAL_VEHICLE_PLANNED_ALIAS_CONFLICTS[key] = true;
    return;
  }
  CANONICAL_VEHICLE_PLANNED_ALIAS_INDEX[key] = rec;
}
// 未登记 PNG 的统一待审素材目录。
// 这些条目只登记文件、目录运营商和待审状态，不声明线路、编成或实时 EXACT 身份。
// 只有后续补齐来源/线路/编成证据后，才可迁入正式车型别名或 realtime 规则。
var UNREGISTERED_ARTWORK_CATALOG = [
  { id: "artwork-inventory-001", displayName: "图库待审・JR北海道・JR北海道_733系_1000代_はこだてライナー", iconName: "图库待审・JR北海道・JR北海道_733系_1000代_はこだてライナー", asset: null, plannedAsset: "../images/列车/JR北海道/JR北海道_733系_1000代_はこだてライナー.png", aliases: [], operatorDirectory: "JR北海道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-002", displayName: "图库待审・JR東日本・e211na1n", iconName: "图库待审・JR東日本・e211na1n", asset: null, plannedAsset: "../images/列车/JR東日本/e211na1n.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-003", displayName: "图库待审・JR東日本・JR東日本_12系客車_SLばんえつ物語_オコジョ展望車", iconName: "图库待审・JR東日本・JR東日本_12系客車_SLばんえつ物語_オコジョ展望車", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_12系客車_SLばんえつ物語_オコジョ展望車.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-004", displayName: "图库待审・JR東日本・JR東日本_12系客車_SLばんえつ物語_展望車", iconName: "图库待审・JR東日本・JR東日本_12系客車_SLばんえつ物語_展望車", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_12系客車_SLばんえつ物語_展望車.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-005", displayName: "图库待审・JR東日本・JR東日本_701系_100番台", iconName: "图库待审・JR東日本・JR東日本_701系_100番台", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_701系_100番台.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-006", displayName: "图库待审・JR東日本・JR東日本_701系_仙台地区", iconName: "图库待审・JR東日本・JR東日本_701系_仙台地区", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_701系_仙台地区.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-007", displayName: "图库待审・JR東日本・JR東日本_701系_盛岡地区", iconName: "图库待审・JR東日本・JR東日本_701系_盛岡地区", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_701系_盛岡地区.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-008", displayName: "图库待审・JR東日本・JR東日本_701系_秋田地区", iconName: "图库待审・JR東日本・JR東日本_701系_秋田地区", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_701系_秋田地区.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-009", displayName: "图库待审・JR東日本・JR東日本_E001形_TRAIN_SUITE四季島", iconName: "图库待审・JR東日本・JR東日本_E001形_TRAIN_SUITE四季島", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E001形_TRAIN_SUITE四季島.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-010", displayName: "图库待审・JR東日本・JR東日本_E233系_0番台_青梅線", iconName: "图库待审・JR東日本・JR東日本_E233系_0番台_青梅線", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E233系_0番台_青梅線.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-011", displayName: "图库待审・JR東日本・JR東日本_E233系_3000番台", iconName: "图库待审・JR東日本・JR東日本_E233系_3000番台", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E233系_3000番台.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-012", displayName: "图库待审・JR東日本・JR東日本_E235系_0番台_B31編成_中央・総武線", iconName: "图库待审・JR東日本・JR東日本_E235系_0番台_B31編成_中央・総武線", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E235系_0番台_B31編成_中央・総武線.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-013", displayName: "图库待审・JR東日本・JR東日本_E501系_E501_SAKIGAKE", iconName: "图库待审・JR東日本・JR東日本_E501系_E501_SAKIGAKE", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E501系_E501_SAKIGAKE.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-014", displayName: "图库待审・JR東日本・JR東日本_E501系_さきがけ", iconName: "图库待审・JR東日本・JR東日本_E501系_さきがけ", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E501系_さきがけ.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-015", displayName: "图库待审・JR東日本・JR東日本_E531系_水戸線", iconName: "图库待审・JR東日本・JR東日本_E531系_水戸線", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E531系_水戸線.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-016", displayName: "图库待审・JR東日本・JR東日本_E531系_赤電", iconName: "图库待审・JR東日本・JR東日本_E531系_赤電", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E531系_赤電.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-017", displayName: "图库待审・JR東日本・JR東日本_E653系_1000番台", iconName: "图库待审・JR東日本・JR東日本_E653系_1000番台", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E653系_1000番台.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-018", displayName: "图库待审・JR東日本・JR東日本_E653系_1000番台_U101編成_583系カラー", iconName: "图库待审・JR東日本・JR東日本_E653系_1000番台_U101編成_583系カラー", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E653系_1000番台_U101編成_583系カラー.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-019", displayName: "图库待审・JR東日本・JR東日本_E653系_1000番台_いなほ色", iconName: "图库待审・JR東日本・JR東日本_E653系_1000番台_いなほ色", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E653系_1000番台_いなほ色.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-020", displayName: "图库待审・JR東日本・JR東日本_E653系_1000番台_ハマナス色", iconName: "图库待审・JR東日本・JR東日本_E653系_1000番台_ハマナス色", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E653系_1000番台_ハマナス色.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-021", displayName: "图库待审・JR東日本・JR東日本_E653系_1000番台_瑠璃色", iconName: "图库待审・JR東日本・JR東日本_E653系_1000番台_瑠璃色", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E653系_1000番台_瑠璃色.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-022", displayName: "图库待审・JR東日本・JR東日本_E653系（水戸地区）", iconName: "图库待审・JR東日本・JR東日本_E653系（水戸地区）", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E653系（水戸地区）.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-023", displayName: "图库待审・JR東日本・JR東日本_E655系_なごみ_和", iconName: "图库待审・JR東日本・JR東日本_E655系_なごみ_和", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E655系_なごみ_和.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-024", displayName: "图库待审・JR東日本・JR東日本_E657系_651系電車オマージュカラー", iconName: "图库待审・JR東日本・JR東日本_E657系_651系電車オマージュカラー", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E657系_651系電車オマージュカラー.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-025", displayName: "图库待审・JR東日本・JR東日本_E657系_ルナ・アズール", iconName: "图库待审・JR東日本・JR東日本_E657系_ルナ・アズール", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E657系_ルナ・アズール.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-026", displayName: "图库待审・JR東日本・JR東日本_E657系_橙", iconName: "图库待审・JR東日本・JR東日本_E657系_橙", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E657系_橙.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-027", displayName: "图库待审・JR東日本・JR東日本_E657系_紅", iconName: "图库待审・JR東日本・JR東日本_E657系_紅", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E657系_紅.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-028", displayName: "图库待审・JR東日本・JR東日本_E657系_緑", iconName: "图库待审・JR東日本・JR東日本_E657系_緑", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E657系_緑.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-029", displayName: "图库待审・JR東日本・JR東日本_E657系_青", iconName: "图库待审・JR東日本・JR東日本_E657系_青", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E657系_青.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-030", displayName: "图库待审・JR東日本・JR東日本_E657系_黄", iconName: "图库待审・JR東日本・JR東日本_E657系_黄", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E657系_黄.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-031", displayName: "图库待审・JR東日本・JR東日本_E721系_0番台", iconName: "图库待审・JR東日本・JR東日本_E721系_0番台", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E721系_0番台.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-032", displayName: "图库待审・JR東日本・JR東日本_E723系_5000番台", iconName: "图库待审・JR東日本・JR東日本_E723系_5000番台", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E723系_5000番台.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-033", displayName: "图库待审・JR東日本・JR東日本_E751系", iconName: "图库待审・JR東日本・JR東日本_E751系", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E751系.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-034", displayName: "图库待审・JR東日本・JR東日本_E926形_East-i", iconName: "图库待审・JR東日本・JR東日本_E926形_East-i", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_E926形_East-i.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-035", displayName: "图库待审・JR東日本・JR東日本_FV-E991系_HYBARI", iconName: "图库待审・JR東日本・JR東日本_FV-E991系_HYBARI", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_FV-E991系_HYBARI.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-036", displayName: "图库待审・JR東日本・JR東日本_GV-E400系_米坂線", iconName: "图库待审・JR東日本・JR東日本_GV-E400系_米坂線", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_GV-E400系_米坂線.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-037", displayName: "图库待审・JR東日本・JR東日本_HB-E300系_SATONO_2号車", iconName: "图库待审・JR東日本・JR東日本_HB-E300系_SATONO_2号車", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_HB-E300系_SATONO_2号車.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-038", displayName: "图库待审・JR東日本・JR東日本_HB-E300系_ひなび_陽旅", iconName: "图库待审・JR東日本・JR東日本_HB-E300系_ひなび_陽旅", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-039", displayName: "图库待审・JR東日本・JR東日本_HB-E300系_リゾートしらかみ「橅」_HB-E301-5", iconName: "图库待审・JR東日本・JR東日本_HB-E300系_リゾートしらかみ「橅」_HB-E301-5", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_HB-E300系_リゾートしらかみ「橅」_HB-E301-5.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-040", displayName: "图库待审・JR東日本・JR東日本_HB-E300系_リゾートしらかみ「橅」_HB-E302-5", iconName: "图库待审・JR東日本・JR東日本_HB-E300系_リゾートしらかみ「橅」_HB-E302-5", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_HB-E300系_リゾートしらかみ「橅」_HB-E302-5.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-041", displayName: "图库待审・JR東日本・JR東日本_HB-E300系_海里", iconName: "图库待审・JR東日本・JR東日本_HB-E300系_海里", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_HB-E300系_海里.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-042", displayName: "图库待审・JR東日本・JR東日本_キハ110系_TOHOKU_EMOTION", iconName: "图库待审・JR東日本・JR東日本_キハ110系_TOHOKU_EMOTION", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ110系_TOHOKU_EMOTION.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-043", displayName: "图库待审・JR東日本・JR東日本_キハ110系_おいこっと", iconName: "图库待审・JR東日本・JR東日本_キハ110系_おいこっと", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ110系_おいこっと.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-044", displayName: "图库待审・JR東日本・JR東日本_キハ110系_おもいで車両", iconName: "图库待审・JR東日本・JR東日本_キハ110系_おもいで車両", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ110系_おもいで車両.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-045", displayName: "图库待审・JR東日本・JR東日本_キハ110系（只見線）", iconName: "图库待审・JR東日本・JR東日本_キハ110系（只見線）", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ110系（只見線）.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-046", displayName: "图库待审・JR東日本・JR東日本_キハ110系（大船渡線）", iconName: "图库待审・JR東日本・JR東日本_キハ110系（大船渡線）", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ110系（大船渡線）.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-047", displayName: "图库待审・JR東日本・JR東日本_キハ110系（甲信越）", iconName: "图库待审・JR東日本・JR東日本_キハ110系（甲信越）", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ110系（甲信越）.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-048", displayName: "图库待审・JR東日本・JR東日本_キハ110系（盛岡・幌付）", iconName: "图库待审・JR東日本・JR東日本_キハ110系（盛岡・幌付）", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ110系（盛岡・幌付）.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-049", displayName: "图库待审・JR東日本・JR東日本_キハ110系（盛岡）", iconName: "图库待审・JR東日本・JR東日本_キハ110系（盛岡）", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ110系（盛岡）.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-050", displayName: "图库待审・JR東日本・JR東日本_キハ110系（陸羽東・左沢・別）", iconName: "图库待审・JR東日本・JR東日本_キハ110系（陸羽東・左沢・別）", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ110系（陸羽東・左沢・別）.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-051", displayName: "图库待审・JR東日本・JR東日本_キハ110系（陸羽東・左沢）", iconName: "图库待审・JR東日本・JR東日本_キハ110系（陸羽東・左沢）", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ110系（陸羽東・左沢）.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-052", displayName: "图库待审・JR東日本・JR東日本_キハ40・48形_越乃Shu＊Kura", iconName: "图库待审・JR東日本・JR東日本_キハ40・48形_越乃Shu＊Kura", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-053", displayName: "图库待审・JR東日本・JR東日本_キハE120形_只見線色", iconName: "图库待审・JR東日本・JR東日本_キハE120形_只見線色", asset: null, plannedAsset: "../images/列车/JR東日本/JR東日本_キハE120形_只見線色.png", aliases: [], operatorDirectory: "JR東日本", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-054", displayName: "图库待审・JR東海・c11nsk", iconName: "图库待审・JR東海・c11nsk", asset: null, plannedAsset: "../images/列车/JR東海/c11nsk.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-055", displayName: "图库待审・JR東海・c25-1", iconName: "图库待审・JR東海・c25-1", asset: null, plannedAsset: "../images/列车/JR東海/c25-1.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-056", displayName: "图库待审・JR東海・c313", iconName: "图库待审・JR東海・c313", asset: null, plannedAsset: "../images/列车/JR東海/c313.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-057", displayName: "图库待审・JR東海・c313ce", iconName: "图库待审・JR東海・c313ce", asset: null, plannedAsset: "../images/列车/JR東海/c313ce.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-058", displayName: "图库待审・JR東海・c315", iconName: "图库待审・JR東海・c315", asset: null, plannedAsset: "../images/列车/JR東海/c315.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-059", displayName: "图库待审・JR東海・c35", iconName: "图库待审・JR東海・c35", asset: null, plannedAsset: "../images/列车/JR東海/c35.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-060", displayName: "图库待审・JR東海・c373_inj", iconName: "图库待审・JR東海・c373_inj", asset: null, plannedAsset: "../images/列车/JR東海/c373_inj.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-061", displayName: "图库待审・JR東海・c385", iconName: "图库待审・JR東海・c385", asset: null, plannedAsset: "../images/列车/JR東海/c385.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-062", displayName: "图库待审・JR東海・c75", iconName: "图库待审・JR東海・c75", asset: null, plannedAsset: "../images/列车/JR東海/c75.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-063", displayName: "图库待审・JR東海・c85h", iconName: "图库待审・JR東海・c85h", asset: null, plannedAsset: "../images/列车/JR東海/c85h.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-064", displayName: "图库待审・JR東海・JR東海_383系", iconName: "图库待审・JR東海・JR東海_383系", asset: null, plannedAsset: "../images/列车/JR東海/JR東海_383系.png", aliases: [], operatorDirectory: "JR東海", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-065", displayName: "图库待审・いすみ鉄道・いすみ鉄道_いすみ300型", iconName: "图库待审・いすみ鉄道・いすみ鉄道_いすみ300型", asset: null, plannedAsset: "../images/列车/いすみ鉄道/いすみ鉄道_いすみ300型.png", aliases: [], operatorDirectory: "いすみ鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-066", displayName: "图库待审・いすみ鉄道・いすみ鉄道_いすみ350型", iconName: "图库待审・いすみ鉄道・いすみ鉄道_いすみ350型", asset: null, plannedAsset: "../images/列车/いすみ鉄道/いすみ鉄道_いすみ350型.png", aliases: [], operatorDirectory: "いすみ鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-067", displayName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ100形", iconName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ100形", asset: null, plannedAsset: "../images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ100形.png", aliases: [], operatorDirectory: "ひたちなか海浜鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-068", displayName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ100形_キハ100-40_ほしいも列車", iconName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ100形_キハ100-40_ほしいも列車", asset: null, plannedAsset: "../images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ100形_キハ100-40_ほしいも列車.png", aliases: [], operatorDirectory: "ひたちなか海浜鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-069", displayName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ11形", iconName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ11形", asset: null, plannedAsset: "../images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ11形.png", aliases: [], operatorDirectory: "ひたちなか海浜鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-070", displayName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ37100形_03", iconName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ37100形_03", asset: null, plannedAsset: "../images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ37100形_03.png", aliases: [], operatorDirectory: "ひたちなか海浜鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-071", displayName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ3710形_01", iconName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ3710形_01", asset: null, plannedAsset: "../images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ3710形_01.png", aliases: [], operatorDirectory: "ひたちなか海浜鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-072", displayName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ3710形_02", iconName: "图库待审・ひたちなか海浜鉄道・ひたちなか海浜鉄道_キハ3710形_02", asset: null, plannedAsset: "../images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ3710形_02.png", aliases: [], operatorDirectory: "ひたちなか海浜鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-073", displayName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_DE10形_1537号機_あかがね色", iconName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_DE10形_1537号機_あかがね色", asset: null, plannedAsset: "../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_DE10形_1537号機_あかがね色.png", aliases: [], operatorDirectory: "わたらせ渓谷鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-074", displayName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_DE10形_1678号機_一般色", iconName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_DE10形_1678号機_一般色", asset: null, plannedAsset: "../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_DE10形_1678号機_一般色.png", aliases: [], operatorDirectory: "わたらせ渓谷鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-075", displayName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_WKT-500形", iconName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_WKT-500形", asset: null, plannedAsset: "../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-500形.png", aliases: [], operatorDirectory: "わたらせ渓谷鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-076", displayName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_WKT-510形", iconName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_WKT-510形", asset: null, plannedAsset: "../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-510形.png", aliases: [], operatorDirectory: "わたらせ渓谷鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-077", displayName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_WKT-520形", iconName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_WKT-520形", asset: null, plannedAsset: "../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-520形.png", aliases: [], operatorDirectory: "わたらせ渓谷鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-078", displayName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_WKT-550形_わっしー", iconName: "图库待审・わたらせ渓谷鉄道・わたらせ渓谷鉄道_WKT-550形_わっしー", asset: null, plannedAsset: "../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-550形_わっしー.png", aliases: [], operatorDirectory: "わたらせ渓谷鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-080", displayName: "图库待审・上信電鉄・上信電鉄_1000形_クハ1301", iconName: "图库待审・上信電鉄・上信電鉄_1000形_クハ1301", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_1000形_クハ1301.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-081", displayName: "图库待审・上信電鉄・上信電鉄_1000形_クハ1302", iconName: "图库待审・上信電鉄・上信電鉄_1000形_クハ1302", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_1000形_クハ1302.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-082", displayName: "图库待审・上信電鉄・上信電鉄_1000形_クハ1303", iconName: "图库待审・上信電鉄・上信電鉄_1000形_クハ1303", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_1000形_クハ1303.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-083", displayName: "图库待审・上信電鉄・上信電鉄_1000形_クモハ1001", iconName: "图库待审・上信電鉄・上信電鉄_1000形_クモハ1001", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_1000形_クモハ1001.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-084", displayName: "图库待审・上信電鉄・上信電鉄_150形_クモハ155", iconName: "图库待审・上信電鉄・上信電鉄_150形_クモハ155", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_150形_クモハ155.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-085", displayName: "图库待审・上信電鉄・上信電鉄_200形_クモハ201", iconName: "图库待审・上信電鉄・上信電鉄_200形_クモハ201", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_200形_クモハ201.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-086", displayName: "图库待审・上信電鉄・上信電鉄_200形_クモハ201_旧塗装", iconName: "图库待审・上信電鉄・上信電鉄_200形_クモハ201_旧塗装", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_200形_クモハ201_旧塗装.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-087", displayName: "图库待审・上信電鉄・上信電鉄_200形_クモハ202", iconName: "图库待审・上信電鉄・上信電鉄_200形_クモハ202", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_200形_クモハ202.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-088", displayName: "图库待审・上信電鉄・上信電鉄_200形_クモハ204_茶色塗装", iconName: "图库待审・上信電鉄・上信電鉄_200形_クモハ204_茶色塗装", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_200形_クモハ204_茶色塗装.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-089", displayName: "图库待审・上信電鉄・上信電鉄_200形_クモハ207", iconName: "图库待审・上信電鉄・上信電鉄_200形_クモハ207", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_200形_クモハ207.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-090", displayName: "图库待审・上信電鉄・上信電鉄_250形_クモハ251", iconName: "图库待审・上信電鉄・上信電鉄_250形_クモハ251", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_250形_クモハ251.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-091", displayName: "图库待审・上信電鉄・上信電鉄_250形_クモハ252", iconName: "图库待审・上信電鉄・上信電鉄_250形_クモハ252", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_250形_クモハ252.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-092", displayName: "图库待审・上信電鉄・上信電鉄_7000形", iconName: "图库待审・上信電鉄・上信電鉄_7000形", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_7000形.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-093", displayName: "图库待审・上信電鉄・上信電鉄_700形_クハ751", iconName: "图库待审・上信電鉄・上信電鉄_700形_クハ751", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_700形_クハ751.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-094", displayName: "图库待审・上信電鉄・上信電鉄_700形_クハ752", iconName: "图库待审・上信電鉄・上信電鉄_700形_クハ752", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_700形_クハ752.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-095", displayName: "图库待审・上信電鉄・上信電鉄_700形_クハ753", iconName: "图库待审・上信電鉄・上信電鉄_700形_クハ753", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_700形_クハ753.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-096", displayName: "图库待审・上信電鉄・上信電鉄_700形_クハ754_JR107系リバイバルカラー", iconName: "图库待审・上信電鉄・上信電鉄_700形_クハ754_JR107系リバイバルカラー", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_700形_クハ754_JR107系リバイバルカラー.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-097", displayName: "图库待审・上信電鉄・上信電鉄_700形_クハ755", iconName: "图库待审・上信電鉄・上信電鉄_700形_クハ755", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_700形_クハ755.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-098", displayName: "图库待审・上信電鉄・上信電鉄_700形_クモハ701", iconName: "图库待审・上信電鉄・上信電鉄_700形_クモハ701", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_700形_クモハ701.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-099", displayName: "图库待审・上信電鉄・上信電鉄_700形_クモハ702", iconName: "图库待审・上信電鉄・上信電鉄_700形_クモハ702", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_700形_クモハ702.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-100", displayName: "图库待审・上信電鉄・上信電鉄_700形_クモハ703", iconName: "图库待审・上信電鉄・上信電鉄_700形_クモハ703", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_700形_クモハ703.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-101", displayName: "图库待审・上信電鉄・上信電鉄_700形_クモハ704", iconName: "图库待审・上信電鉄・上信電鉄_700形_クモハ704", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_700形_クモハ704.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-102", displayName: "图库待审・上信電鉄・上信電鉄_700形_クモハ705", iconName: "图库待审・上信電鉄・上信電鉄_700形_クモハ705", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_700形_クモハ705.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-103", displayName: "图库待审・上信電鉄・上信電鉄_デキ1形_デキ1号", iconName: "图库待审・上信電鉄・上信電鉄_デキ1形_デキ1号", asset: null, plannedAsset: "../images/列车/上信電鉄/上信電鉄_デキ1形_デキ1号.png", aliases: [], operatorDirectory: "上信電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-104", displayName: "图库待审・京浜急行電鉄・京浜急行電鉄_1000形_1300番台", iconName: "图库待审・京浜急行電鉄・京浜急行電鉄_1000形_1300番台", asset: null, plannedAsset: "../images/列车/京浜急行電鉄/京浜急行電鉄_1000形_1300番台.png", aliases: [], operatorDirectory: "京浜急行電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-105", displayName: "图库待审・京浜急行電鉄・京浜急行電鉄_1000形_1500番台", iconName: "图库待审・京浜急行電鉄・京浜急行電鉄_1000形_1500番台", asset: null, plannedAsset: "../images/列车/京浜急行電鉄/京浜急行電鉄_1000形_1500番台.png", aliases: [], operatorDirectory: "京浜急行電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-106", displayName: "图库待审・京浜急行電鉄・京浜急行電鉄_1000形_1800番台", iconName: "图库待审・京浜急行電鉄・京浜急行電鉄_1000形_1800番台", asset: null, plannedAsset: "../images/列车/京浜急行電鉄/京浜急行電鉄_1000形_1800番台.png", aliases: [], operatorDirectory: "京浜急行電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-107", displayName: "图库待审・京王電鉄・京王電鉄_2000系", iconName: "图库待审・京王電鉄・京王電鉄_2000系", asset: null, plannedAsset: "../images/列车/京王電鉄/京王電鉄_2000系.png", aliases: [], operatorDirectory: "京王電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-108", displayName: "图库待审・伊豆箱根鉄道・伊豆箱根鉄道_1300系", iconName: "图库待审・伊豆箱根鉄道・伊豆箱根鉄道_1300系", asset: null, plannedAsset: "../images/列车/伊豆箱根鉄道/伊豆箱根鉄道_1300系.png", aliases: [], operatorDirectory: "伊豆箱根鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-109", displayName: "图库待审・伊豆箱根鉄道・伊豆箱根鉄道_3000系", iconName: "图库待审・伊豆箱根鉄道・伊豆箱根鉄道_3000系", asset: null, plannedAsset: "../images/列车/伊豆箱根鉄道/伊豆箱根鉄道_3000系.png", aliases: [], operatorDirectory: "伊豆箱根鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-110", displayName: "图库待审・伊豆箱根鉄道・伊豆箱根鉄道_5000系", iconName: "图库待审・伊豆箱根鉄道・伊豆箱根鉄道_5000系", asset: null, plannedAsset: "../images/列车/伊豆箱根鉄道/伊豆箱根鉄道_5000系.png", aliases: [], operatorDirectory: "伊豆箱根鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-111", displayName: "图库待审・伊豆箱根鉄道・伊豆箱根鉄道_7000系", iconName: "图库待审・伊豆箱根鉄道・伊豆箱根鉄道_7000系", asset: null, plannedAsset: "../images/列车/伊豆箱根鉄道/伊豆箱根鉄道_7000系.png", aliases: [], operatorDirectory: "伊豆箱根鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-112", displayName: "图库待审・函館市電・toq6001", iconName: "图库待审・函館市電・toq6001", asset: null, plannedAsset: "../images/列车/函館市電/toq6001.png", aliases: [], operatorDirectory: "函館市電", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-113", displayName: "图库待审・函館市電・toq6020", iconName: "图库待审・函館市電・toq6020", asset: null, plannedAsset: "../images/列车/函館市電/toq6020.png", aliases: [], operatorDirectory: "函館市電", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-114", displayName: "图库待审・函館市電・toq9002or", iconName: "图库待审・函館市電・toq9002or", asset: null, plannedAsset: "../images/列车/函館市電/toq9002or.png", aliases: [], operatorDirectory: "函館市電", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-115", displayName: "图库待审・函館市電・toq9003or", iconName: "图库待审・函館市電・toq9003or", asset: null, plannedAsset: "../images/列车/函館市電/toq9003or.png", aliases: [], operatorDirectory: "函館市電", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-116", displayName: "图库待审・函館市電・函館市電_710形_広告車", iconName: "图库待审・函館市電・函館市電_710形_広告車", asset: null, plannedAsset: "../images/列车/函館市電/函館市電_710形_広告車.png", aliases: [], operatorDirectory: "函館市電", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-117", displayName: "图库待审・函館市電・函館市電_8000形_広告車", iconName: "图库待审・函館市電・函館市電_8000形_広告車", asset: null, plannedAsset: "../images/列车/函館市電/函館市電_8000形_広告車.png", aliases: [], operatorDirectory: "函館市電", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-118", displayName: "图库待审・函館市電・函館市電_8100形_広告車", iconName: "图库待审・函館市電・函館市電_8100形_広告車", asset: null, plannedAsset: "../images/列车/函館市電/函館市電_8100形_広告車.png", aliases: [], operatorDirectory: "函館市電", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-119", displayName: "图库待审・函館市電・函館市電_9600形_広告車", iconName: "图库待审・函館市電・函館市電_9600形_広告車", asset: null, plannedAsset: "../images/列车/函館市電/函館市電_9600形_広告車.png", aliases: [], operatorDirectory: "函館市電", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-120", displayName: "图库待审・埼玉新都市交通・埼玉新都市交通_2020系_22編成_ブライトアンバー", iconName: "图库待审・埼玉新都市交通・埼玉新都市交通_2020系_22編成_ブライトアンバー", asset: null, plannedAsset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2020系_22編成_ブライトアンバー.png", aliases: [], operatorDirectory: "埼玉新都市交通", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-121", displayName: "图库待审・埼玉新都市交通・埼玉新都市交通_2020系_23編成_ピュアルビー", iconName: "图库待审・埼玉新都市交通・埼玉新都市交通_2020系_23編成_ピュアルビー", asset: null, plannedAsset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2020系_23編成_ピュアルビー.png", aliases: [], operatorDirectory: "埼玉新都市交通", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-122", displayName: "图库待审・埼玉新都市交通・埼玉新都市交通_2020系_24編成_ゴールデントパーズ", iconName: "图库待审・埼玉新都市交通・埼玉新都市交通_2020系_24編成_ゴールデントパーズ", asset: null, plannedAsset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2020系_24編成_ゴールデントパーズ.png", aliases: [], operatorDirectory: "埼玉新都市交通", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-123", displayName: "图库待审・埼玉新都市交通・埼玉新都市交通_2020系_25編成_トワイライトアメジスト", iconName: "图库待审・埼玉新都市交通・埼玉新都市交通_2020系_25編成_トワイライトアメジスト", asset: null, plannedAsset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2020系_25編成_トワイライトアメジスト.png", aliases: [], operatorDirectory: "埼玉新都市交通", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-124", displayName: "图库待审・埼玉新都市交通・埼玉新都市交通_2020系_26編成_ブルーサファイア＆クリソベリル", iconName: "图库待审・埼玉新都市交通・埼玉新都市交通_2020系_26編成_ブルーサファイア＆クリソベリル", asset: null, plannedAsset: "../images/列车/埼玉新都市交通/埼玉新都市交通_2020系_26編成_ブルーサファイア＆クリソベリル.png", aliases: [], operatorDirectory: "埼玉新都市交通", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-125", displayName: "图库待审・多摩都市モノレール・多摩都市モノレール_1000系_1102編成_広告ラッピング対応車", iconName: "图库待审・多摩都市モノレール・多摩都市モノレール_1000系_1102編成_広告ラッピング対応車", asset: null, plannedAsset: "../images/列车/多摩都市モノレール/多摩都市モノレール_1000系_1102編成_広告ラッピング対応車.png", aliases: [], operatorDirectory: "多摩都市モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-126", displayName: "图库待审・宇都宮ライトレール・宇都宮ライトレール_HU300形_ライトライン", iconName: "图库待审・宇都宮ライトレール・宇都宮ライトレール_HU300形_ライトライン", asset: null, plannedAsset: "../images/列车/宇都宮ライトレール/宇都宮ライトレール_HU300形_ライトライン.png", aliases: [], operatorDirectory: "宇都宮ライトレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-127", displayName: "图库待审・小田急箱根・小田急箱根_1000形", iconName: "图库待审・小田急箱根・小田急箱根_1000形", asset: null, plannedAsset: "../images/列车/小田急箱根/小田急箱根_1000形.png", aliases: [], operatorDirectory: "小田急箱根", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-128", displayName: "图库待审・小田急箱根・小田急箱根_2000形", iconName: "图库待审・小田急箱根・小田急箱根_2000形", asset: null, plannedAsset: "../images/列车/小田急箱根/小田急箱根_2000形.png", aliases: [], operatorDirectory: "小田急箱根", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-129", displayName: "图库待审・小田急箱根・小田急箱根_3000・3100形", iconName: "图库待审・小田急箱根・小田急箱根_3000・3100形", asset: null, plannedAsset: "../images/列车/小田急箱根/小田急箱根_3000・3100形.png", aliases: [], operatorDirectory: "小田急箱根", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-130", displayName: "图库待审・小田急電鉄・小田急電鉄_8000形_標準色_未更新車", iconName: "图库待审・小田急電鉄・小田急電鉄_8000形_標準色_未更新車", asset: null, plannedAsset: "../images/列车/小田急電鉄/小田急電鉄_8000形_標準色_未更新車.png", aliases: [], operatorDirectory: "小田急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-131", displayName: "图库待审・山万・山万_1000形_第1編成_こあら1号", iconName: "图库待审・山万・山万_1000形_第1編成_こあら1号", asset: null, plannedAsset: "../images/列车/山万/山万_1000形_第1編成_こあら1号.png", aliases: [], operatorDirectory: "山万", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-132", displayName: "图库待审・山万・山万_1000形_第2編成_こあら2号", iconName: "图库待审・山万・山万_1000形_第2編成_こあら2号", asset: null, plannedAsset: "../images/列车/山万/山万_1000形_第2編成_こあら2号.png", aliases: [], operatorDirectory: "山万", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-133", displayName: "图库待审・山万・山万_1000形_第3編成_こあら3号", iconName: "图库待审・山万・山万_1000形_第3編成_こあら3号", asset: null, plannedAsset: "../images/列车/山万/山万_1000形_第3編成_こあら3号.png", aliases: [], operatorDirectory: "山万", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-134", displayName: "图库待审・東京メトロ・東京メトロ_05系_8～13次車", iconName: "图库待审・東京メトロ・東京メトロ_05系_8～13次車", asset: null, plannedAsset: "../images/列车/東京メトロ/東京メトロ_05系_8～13次車.png", aliases: [], operatorDirectory: "東京メトロ", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-135", displayName: "图库待审・東京メトロ・東京メトロ_10000系_8両編成", iconName: "图库待审・東京メトロ・東京メトロ_10000系_8両編成", asset: null, plannedAsset: "../images/列车/東京メトロ/東京メトロ_10000系_8両編成.png", aliases: [], operatorDirectory: "東京メトロ", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-136", displayName: "图库待审・東京モノレール・東京モノレール_1000形_1004編成", iconName: "图库待审・東京モノレール・東京モノレール_1000形_1004編成", asset: null, plannedAsset: "../images/列车/東京モノレール/東京モノレール_1000形_1004編成.png", aliases: [], operatorDirectory: "東京モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-137", displayName: "图库待审・東京モノレール・東京モノレール_1000形_橙帯", iconName: "图库待审・東京モノレール・東京モノレール_1000形_橙帯", asset: null, plannedAsset: "../images/列车/東京モノレール/東京モノレール_1000形_橙帯.png", aliases: [], operatorDirectory: "東京モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-138", displayName: "图库待审・東京モノレール・東京モノレール_1000形_赤帯", iconName: "图库待审・東京モノレール・東京モノレール_1000形_赤帯", asset: null, plannedAsset: "../images/列车/東京モノレール/東京モノレール_1000形_赤帯.png", aliases: [], operatorDirectory: "東京モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-139", displayName: "图库待审・東京モノレール・東京モノレール_1000形_青帯", iconName: "图库待审・東京モノレール・東京モノレール_1000形_青帯", asset: null, plannedAsset: "../images/列车/東京モノレール/東京モノレール_1000形_青帯.png", aliases: [], operatorDirectory: "東京モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-140", displayName: "图库待审・東急電鉄・東急電鉄_1000系_1013F_緑の電車", iconName: "图库待审・東急電鉄・東急電鉄_1000系_1013F_緑の電車", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_1000系_1013F_緑の電車.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-141", displayName: "图库待审・東急電鉄・東急電鉄_1000系_1017F_きになる電車", iconName: "图库待审・東急電鉄・東急電鉄_1000系_1017F_きになる電車", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_1000系_1017F_きになる電車.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-142", displayName: "图库待审・東急電鉄・東急電鉄_1000系_1500番台_1522F_いけたまハッピートレイン", iconName: "图库待审・東急電鉄・東急電鉄_1000系_1500番台_1522F_いけたまハッピートレイン", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_1000系_1500番台_1522F_いけたまハッピートレイン.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-143", displayName: "图库待审・東急電鉄・東急電鉄_300系_301編成_玉電カラー", iconName: "图库待审・東急電鉄・東急電鉄_300系_301編成_玉電カラー", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_300系_301編成_玉電カラー.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-144", displayName: "图库待审・東急電鉄・東急電鉄_300系_302編成_モーニングブルー", iconName: "图库待审・東急電鉄・東急電鉄_300系_302編成_モーニングブルー", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_300系_302編成_モーニングブルー.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-145", displayName: "图库待审・東急電鉄・東急電鉄_300系_303編成_クラシックブルー", iconName: "图库待审・東急電鉄・東急電鉄_300系_303編成_クラシックブルー", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_300系_303編成_クラシックブルー.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-146", displayName: "图库待审・東急電鉄・東急電鉄_300系_305編成_チェリーレッド", iconName: "图库待审・東急電鉄・東急電鉄_300系_305編成_チェリーレッド", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_300系_305編成_チェリーレッド.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-147", displayName: "图库待审・東急電鉄・東急電鉄_300系_306編成_レリーフイエロー", iconName: "图库待审・東急電鉄・東急電鉄_300系_306編成_レリーフイエロー", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_300系_306編成_レリーフイエロー.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-148", displayName: "图库待审・東急電鉄・東急電鉄_300系_307編成_ブルーイッシュラベンダー", iconName: "图库待审・東急電鉄・東急電鉄_300系_307編成_ブルーイッシュラベンダー", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_300系_307編成_ブルーイッシュラベンダー.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-149", displayName: "图库待审・東急電鉄・東急電鉄_300系_308編成_サンシャイン", iconName: "图库待审・東急電鉄・東急電鉄_300系_308編成_サンシャイン", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_300系_308編成_サンシャイン.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-150", displayName: "图库待审・東急電鉄・東急電鉄_300系_308編成_幸福の招き猫電車", iconName: "图库待审・東急電鉄・東急電鉄_300系_308編成_幸福の招き猫電車", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_300系_308編成_幸福の招き猫電車.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-151", displayName: "图库待审・東急電鉄・東急電鉄_300系_309編成_バーントオレンジ", iconName: "图库待审・東急電鉄・東急電鉄_300系_309編成_バーントオレンジ", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_300系_309編成_バーントオレンジ.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-152", displayName: "图库待审・東急電鉄・東急電鉄_300系_310編成_ターコイズグリーン", iconName: "图库待审・東急電鉄・東急電鉄_300系_310編成_ターコイズグリーン", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_300系_310編成_ターコイズグリーン.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-153", displayName: "图库待审・東急電鉄・東急電鉄_5000系_リニューアル車", iconName: "图库待审・東急電鉄・東急電鉄_5000系_リニューアル車", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_5000系_リニューアル車.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-154", displayName: "图库待审・東急電鉄・東急電鉄_6020系_追加", iconName: "图库待审・東急電鉄・東急電鉄_6020系_追加", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_6020系_追加.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-155", displayName: "图库待审・東急電鉄・東急電鉄_Y000系_うしでんしゃ", iconName: "图库待审・東急電鉄・東急電鉄_Y000系_うしでんしゃ", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_Y000系_うしでんしゃ.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-156", displayName: "图库待审・東急電鉄・東急電鉄_Y000系_ひつじでんしゃ", iconName: "图库待审・東急電鉄・東急電鉄_Y000系_ひつじでんしゃ", asset: null, plannedAsset: "../images/列车/東急電鉄/東急電鉄_Y000系_ひつじでんしゃ.png", aliases: [], operatorDirectory: "東急電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-157", displayName: "图库待审・東武鉄道・東武鉄道_10000型_更新車", iconName: "图库待审・東武鉄道・東武鉄道_10000型_更新車", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_10000型_更新車.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-158", displayName: "图库待审・東武鉄道・東武鉄道_10030型_50番台", iconName: "图库待审・東武鉄道・東武鉄道_10030型_50番台", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_10030型_50番台.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-159", displayName: "图库待审・東武鉄道・東武鉄道_10030型_50番台_更新車", iconName: "图库待审・東武鉄道・東武鉄道_10030型_50番台_更新車", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-160", displayName: "图库待审・東武鉄道・東武鉄道_100系_DRCカラー", iconName: "图库待审・東武鉄道・東武鉄道_100系_DRCカラー", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_100系_DRCカラー.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-161", displayName: "图库待审・東武鉄道・東武鉄道_100系_サニーコーラルオレンジ", iconName: "图库待审・東武鉄道・東武鉄道_100系_サニーコーラルオレンジ", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_100系_サニーコーラルオレンジ.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-162", displayName: "图库待审・東武鉄道・東武鉄道_100系_雅", iconName: "图库待审・東武鉄道・東武鉄道_100系_雅", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_100系_雅.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-163", displayName: "图库待审・東武鉄道・東武鉄道_12系客車_SL大樹", iconName: "图库待审・東武鉄道・東武鉄道_12系客車_SL大樹", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_12系客車_SL大樹.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-164", displayName: "图库待审・東武鉄道・東武鉄道_14系客車_SL大樹", iconName: "图库待审・東武鉄道・東武鉄道_14系客車_SL大樹", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_14系客車_SL大樹.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-165", displayName: "图库待审・東武鉄道・東武鉄道_200型_りょうもう_青", iconName: "图库待审・東武鉄道・東武鉄道_200型_りょうもう_青", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_200型_りょうもう_青.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-166", displayName: "图库待审・東武鉄道・東武鉄道_200系（別）", iconName: "图库待审・東武鉄道・東武鉄道_200系（別）", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_200系（別）.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-167", displayName: "图库待审・東武鉄道・東武鉄道_8000型_亀戸線", iconName: "图库待审・東武鉄道・東武鉄道_8000型_亀戸線", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_8000型_亀戸線.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-168", displayName: "图库待审・東武鉄道・東武鉄道_9000型_未更新車", iconName: "图库待审・東武鉄道・東武鉄道_9000型_未更新車", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_9000型_未更新車.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-169", displayName: "图库待审・東武鉄道・東武鉄道_C11形_SL大樹", iconName: "图库待审・東武鉄道・東武鉄道_C11形_SL大樹", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_C11形_SL大樹.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-170", displayName: "图库待审・東武鉄道・東武鉄道_DE10形_ブルーサンダー", iconName: "图库待审・東武鉄道・東武鉄道_DE10形_ブルーサンダー", asset: null, plannedAsset: "../images/列车/東武鉄道/東武鉄道_DE10形_ブルーサンダー.png", aliases: [], operatorDirectory: "東武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-171", displayName: "图库待审・横浜市交通局・横浜市交通局_10000形_1次車", iconName: "图库待审・横浜市交通局・横浜市交通局_10000形_1次車", asset: null, plannedAsset: "../images/列车/横浜市交通局/横浜市交通局_10000形_1次車.png", aliases: [], operatorDirectory: "横浜市交通局", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-172", displayName: "图库待审・流鉄株式会社・流鉄株式会社_5000形_5001編成_さくら", iconName: "图库待审・流鉄株式会社・流鉄株式会社_5000形_5001編成_さくら", asset: null, plannedAsset: "../images/列车/流鉄株式会社/流鉄株式会社_5000形_5001編成_さくら.png", aliases: [], operatorDirectory: "流鉄株式会社", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-173", displayName: "图库待审・流鉄株式会社・流鉄株式会社_5000形_5002編成_流星", iconName: "图库待审・流鉄株式会社・流鉄株式会社_5000形_5002編成_流星", asset: null, plannedAsset: "../images/列车/流鉄株式会社/流鉄株式会社_5000形_5002編成_流星.png", aliases: [], operatorDirectory: "流鉄株式会社", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-174", displayName: "图库待审・流鉄株式会社・流鉄株式会社_5000形_5004編成_若葉", iconName: "图库待审・流鉄株式会社・流鉄株式会社_5000形_5004編成_若葉", asset: null, plannedAsset: "../images/列车/流鉄株式会社/流鉄株式会社_5000形_5004編成_若葉.png", aliases: [], operatorDirectory: "流鉄株式会社", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-175", displayName: "图库待审・流鉄株式会社・流鉄株式会社_5000形_5005編成_なの花", iconName: "图库待审・流鉄株式会社・流鉄株式会社_5000形_5005編成_なの花", asset: null, plannedAsset: "../images/列车/流鉄株式会社/流鉄株式会社_5000形_5005編成_なの花.png", aliases: [], operatorDirectory: "流鉄株式会社", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-176", displayName: "图库待审・湘南モノレール・湘南モノレール_5000系_5603編成_ブルー", iconName: "图库待审・湘南モノレール・湘南モノレール_5000系_5603編成_ブルー", asset: null, plannedAsset: "../images/列车/湘南モノレール/湘南モノレール_5000系_5603編成_ブルー.png", aliases: [], operatorDirectory: "湘南モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-177", displayName: "图库待审・湘南モノレール・湘南モノレール_5000系_5605編成_グリーン", iconName: "图库待审・湘南モノレール・湘南モノレール_5000系_5605編成_グリーン", asset: null, plannedAsset: "../images/列车/湘南モノレール/湘南モノレール_5000系_5605編成_グリーン.png", aliases: [], operatorDirectory: "湘南モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-178", displayName: "图库待审・湘南モノレール・湘南モノレール_5000系_5607編成_イエロー", iconName: "图库待审・湘南モノレール・湘南モノレール_5000系_5607編成_イエロー", asset: null, plannedAsset: "../images/列车/湘南モノレール/湘南モノレール_5000系_5607編成_イエロー.png", aliases: [], operatorDirectory: "湘南モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-179", displayName: "图库待审・湘南モノレール・湘南モノレール_5000系_5609編成_バイオレット", iconName: "图库待审・湘南モノレール・湘南モノレール_5000系_5609編成_バイオレット", asset: null, plannedAsset: "../images/列车/湘南モノレール/湘南モノレール_5000系_5609編成_バイオレット.png", aliases: [], operatorDirectory: "湘南モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-180", displayName: "图库待审・湘南モノレール・湘南モノレール_5000系_5611編成_ブラック", iconName: "图库待审・湘南モノレール・湘南モノレール_5000系_5611編成_ブラック", asset: null, plannedAsset: "../images/列车/湘南モノレール/湘南モノレール_5000系_5611編成_ブラック.png", aliases: [], operatorDirectory: "湘南モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-181", displayName: "图库待审・湘南モノレール・湘南モノレール_5000系_5613編成_ピンク", iconName: "图库待审・湘南モノレール・湘南モノレール_5000系_5613編成_ピンク", asset: null, plannedAsset: "../images/列车/湘南モノレール/湘南モノレール_5000系_5613編成_ピンク.png", aliases: [], operatorDirectory: "湘南モノレール", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-182", displayName: "图库待审・相模鉄道・相模鉄道_10000系_旧塗装", iconName: "图库待审・相模鉄道・相模鉄道_10000系_旧塗装", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_10000系_旧塗装.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-183", displayName: "图库待审・相模鉄道・相模鉄道_10000系_相鉄グループカラー", iconName: "图库待审・相模鉄道・相模鉄道_10000系_相鉄グループカラー", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_10000系_相鉄グループカラー.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-184", displayName: "图库待审・相模鉄道・相模鉄道_10000系_相鉄グループカラー_別表示", iconName: "图库待审・相模鉄道・相模鉄道_10000系_相鉄グループカラー_別表示", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_10000系_相鉄グループカラー_別表示.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-185", displayName: "图库待审・相模鉄道・相模鉄道_11000系_11003編成_ほほえみ号", iconName: "图库待审・相模鉄道・相模鉄道_11000系_11003編成_ほほえみ号", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_11000系_11003編成_ほほえみ号.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-186", displayName: "图库待审・相模鉄道・相模鉄道_11000系_相鉄グループカラー_別表示", iconName: "图库待审・相模鉄道・相模鉄道_11000系_相鉄グループカラー_別表示", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_11000系_相鉄グループカラー_別表示.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-187", displayName: "图库待审・相模鉄道・相模鉄道_8000系_新塗装_緑帯", iconName: "图库待审・相模鉄道・相模鉄道_8000系_新塗装_緑帯", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_8000系_新塗装_緑帯.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-188", displayName: "图库待审・相模鉄道・相模鉄道_8000系_新塗装_赤帯", iconName: "图库待审・相模鉄道・相模鉄道_8000系_新塗装_赤帯", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_8000系_新塗装_赤帯.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-189", displayName: "图库待审・相模鉄道・相模鉄道_8000系_旧塗装", iconName: "图库待审・相模鉄道・相模鉄道_8000系_旧塗装", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_8000系_旧塗装.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-190", displayName: "图库待审・相模鉄道・相模鉄道_8000系_赤帯塗装", iconName: "图库待审・相模鉄道・相模鉄道_8000系_赤帯塗装", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_8000系_赤帯塗装.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-191", displayName: "图库待审・相模鉄道・相模鉄道_9000系_旧塗装", iconName: "图库待审・相模鉄道・相模鉄道_9000系_旧塗装", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_9000系_旧塗装.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-192", displayName: "图库待审・相模鉄道・相模鉄道_相模鉄道8000系（sote8006）", iconName: "图库待审・相模鉄道・相模鉄道_相模鉄道8000系（sote8006）", asset: null, plannedAsset: "../images/列车/相模鉄道/相模鉄道_相模鉄道8000系（sote8006）.png", aliases: [], operatorDirectory: "相模鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-193", displayName: "图库待审・真岡鐵道・真岡鐵道_C12形_C1266_SLもおか", iconName: "图库待审・真岡鐵道・真岡鐵道_C12形_C1266_SLもおか", asset: null, plannedAsset: "../images/列车/真岡鐵道/真岡鐵道_C12形_C1266_SLもおか.png", aliases: [], operatorDirectory: "真岡鐵道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-194", displayName: "图库待审・真岡鐵道・真岡鐵道_モオカ14形_標準色_車両差分1", iconName: "图库待审・真岡鐵道・真岡鐵道_モオカ14形_標準色_車両差分1", asset: null, plannedAsset: "../images/列车/真岡鐵道/真岡鐵道_モオカ14形_標準色_車両差分1.png", aliases: [], operatorDirectory: "真岡鐵道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-195", displayName: "图库待审・真岡鐵道・真岡鐵道_モオカ14形_標準色_車両差分2", iconName: "图库待审・真岡鐵道・真岡鐵道_モオカ14形_標準色_車両差分2", asset: null, plannedAsset: "../images/列车/真岡鐵道/真岡鐵道_モオカ14形_標準色_車両差分2.png", aliases: [], operatorDirectory: "真岡鐵道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-196", displayName: "图库待审・秩父鉄道・秩父鉄道_12系_SLパレオエクスプレス", iconName: "图库待审・秩父鉄道・秩父鉄道_12系_SLパレオエクスプレス", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_12系_SLパレオエクスプレス.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-197", displayName: "图库待审・秩父鉄道・秩父鉄道_12系_旧塗装", iconName: "图库待审・秩父鉄道・秩父鉄道_12系_旧塗装", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_12系_旧塗装.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-198", displayName: "图库待审・秩父鉄道・秩父鉄道_5000系_5001号", iconName: "图库待审・秩父鉄道・秩父鉄道_5000系_5001号", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_5000系_5001号.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-199", displayName: "图库待审・秩父鉄道・秩父鉄道_5000系_5002号_赤帯", iconName: "图库待审・秩父鉄道・秩父鉄道_5000系_5002号_赤帯", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_5000系_5002号_赤帯.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-200", displayName: "图库待审・秩父鉄道・秩父鉄道_5000系_5003号_青帯", iconName: "图库待审・秩父鉄道・秩父鉄道_5000系_5003号_青帯", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_5000系_5003号_青帯.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-201", displayName: "图库待审・秩父鉄道・秩父鉄道_6000系_標準色", iconName: "图库待审・秩父鉄道・秩父鉄道_6000系_標準色", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_6000系_標準色.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-202", displayName: "图库待审・秩父鉄道・秩父鉄道_6000系_秩鉄オリジナルカラー", iconName: "图库待审・秩父鉄道・秩父鉄道_6000系_秩鉄オリジナルカラー", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_6000系_秩鉄オリジナルカラー.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-203", displayName: "图库待审・秩父鉄道・秩父鉄道_7000系_7001編成", iconName: "图库待审・秩父鉄道・秩父鉄道_7000系_7001編成", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_7000系_7001編成.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-204", displayName: "图库待审・秩父鉄道・秩父鉄道_7000系_7001編成_反対側", iconName: "图库待审・秩父鉄道・秩父鉄道_7000系_7001編成_反対側", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_7000系_7001編成_反対側.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-205", displayName: "图库待审・秩父鉄道・秩父鉄道_7500系_7501編成", iconName: "图库待审・秩父鉄道・秩父鉄道_7500系_7501編成", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_7500系_7501編成.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-206", displayName: "图库待审・秩父鉄道・秩父鉄道_7500系_7501編成_反対側", iconName: "图库待审・秩父鉄道・秩父鉄道_7500系_7501編成_反対側", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_7500系_7501編成_反対側.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-207", displayName: "图库待审・秩父鉄道・秩父鉄道_7800系_7801編成", iconName: "图库待审・秩父鉄道・秩父鉄道_7800系_7801編成", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_7800系_7801編成.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-208", displayName: "图库待审・秩父鉄道・秩父鉄道_7800系_7801編成_反対側", iconName: "图库待审・秩父鉄道・秩父鉄道_7800系_7801編成_反対側", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_7800系_7801編成_反対側.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-209", displayName: "图库待审・秩父鉄道・秩父鉄道_C58形_363号機", iconName: "图库待审・秩父鉄道・秩父鉄道_C58形_363号機", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_C58形_363号機.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-210", displayName: "图库待审・秩父鉄道・秩父鉄道_デキ200形_青色", iconName: "图库待审・秩父鉄道・秩父鉄道_デキ200形_青色", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_デキ200形_青色.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-211", displayName: "图库待审・秩父鉄道・秩父鉄道_デキ200形_黒色", iconName: "图库待审・秩父鉄道・秩父鉄道_デキ200形_黒色", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_デキ200形_黒色.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-212", displayName: "图库待审・秩父鉄道・秩父鉄道_デキ500", iconName: "图库待审・秩父鉄道・秩父鉄道_デキ500", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_デキ500.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-213", displayName: "图库待审・秩父鉄道・秩父鉄道_デキ500形_緑色_デキ505", iconName: "图库待审・秩父鉄道・秩父鉄道_デキ500形_緑色_デキ505", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_デキ500形_緑色_デキ505.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-214", displayName: "图库待审・秩父鉄道・秩父鉄道_デキ500形_赤色_デキ504", iconName: "图库待审・秩父鉄道・秩父鉄道_デキ500形_赤色_デキ504", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_デキ500形_赤色_デキ504.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-215", displayName: "图库待审・秩父鉄道・秩父鉄道_デキ500形_青色_デキ503", iconName: "图库待审・秩父鉄道・秩父鉄道_デキ500形_青色_デキ503", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_デキ500形_青色_デキ503.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-216", displayName: "图库待审・秩父鉄道・秩父鉄道_デキ501", iconName: "图库待审・秩父鉄道・秩父鉄道_デキ501", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_デキ501.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-217", displayName: "图库待审・秩父鉄道・秩父鉄道_デキ502", iconName: "图库待审・秩父鉄道・秩父鉄道_デキ502", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_デキ502.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-218", displayName: "图库待审・秩父鉄道・秩父鉄道_デキ504", iconName: "图库待审・秩父鉄道・秩父鉄道_デキ504", asset: null, plannedAsset: "../images/列车/秩父鉄道/秩父鉄道_デキ504.png", aliases: [], operatorDirectory: "秩父鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-219", displayName: "图库待审・西武鉄道・西武鉄道_10000系_レッドアロークラシック", iconName: "图库待审・西武鉄道・西武鉄道_10000系_レッドアロークラシック", asset: null, plannedAsset: "../images/列车/西武鉄道/西武鉄道_10000系_レッドアロークラシック.png", aliases: [], operatorDirectory: "西武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-220", displayName: "图库待审・西武鉄道・西武鉄道_2000系_ツートンカラー", iconName: "图库待审・西武鉄道・西武鉄道_2000系_ツートンカラー", asset: null, plannedAsset: "../images/列车/西武鉄道/西武鉄道_2000系_ツートンカラー.png", aliases: [], operatorDirectory: "西武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-221", displayName: "图库待审・西武鉄道・西武鉄道_2000系_西武鉄道創立110周年記念トレイン", iconName: "图库待审・西武鉄道・西武鉄道_2000系_西武鉄道創立110周年記念トレイン", asset: null, plannedAsset: "../images/列车/西武鉄道/西武鉄道_2000系_西武鉄道創立110周年記念トレイン.png", aliases: [], operatorDirectory: "西武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-222", displayName: "图库待审・西武鉄道・西武鉄道_40000系_トキイロ", iconName: "图库待审・西武鉄道・西武鉄道_40000系_トキイロ", asset: null, plannedAsset: "../images/列车/西武鉄道/西武鉄道_40000系_トキイロ.png", aliases: [], operatorDirectory: "西武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-223", displayName: "图库待审・西武鉄道・西武鉄道_40000系_赤帯", iconName: "图库待审・西武鉄道・西武鉄道_40000系_赤帯", asset: null, plannedAsset: "../images/列车/西武鉄道/西武鉄道_40000系_赤帯.png", aliases: [], operatorDirectory: "西武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-224", displayName: "图库待审・西武鉄道・西武鉄道_4000系_白塗装", iconName: "图库待审・西武鉄道・西武鉄道_4000系_白塗装", asset: null, plannedAsset: "../images/列车/西武鉄道/西武鉄道_4000系_白塗装.png", aliases: [], operatorDirectory: "西武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-225", displayName: "图库待审・西武鉄道・西武鉄道_40050系_緑帯", iconName: "图库待审・西武鉄道・西武鉄道_40050系_緑帯", asset: null, plannedAsset: "../images/列车/西武鉄道/西武鉄道_40050系_緑帯.png", aliases: [], operatorDirectory: "西武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-226", displayName: "图库待审・西武鉄道・西武鉄道_6000系_標準塗装", iconName: "图库待审・西武鉄道・西武鉄道_6000系_標準塗装", asset: null, plannedAsset: "../images/列车/西武鉄道/西武鉄道_6000系_標準塗装.png", aliases: [], operatorDirectory: "西武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-227", displayName: "图库待审・西武鉄道・西武鉄道_L00系_第1編成_埼玉西武ライオンズ", iconName: "图库待审・西武鉄道・西武鉄道_L00系_第1編成_埼玉西武ライオンズ", asset: null, plannedAsset: "../images/列车/西武鉄道/西武鉄道_L00系_第1編成_埼玉西武ライオンズ.png", aliases: [], operatorDirectory: "西武鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-228", displayName: "图库待审・都営地下鉄・都営地下鉄_8500形（別）", iconName: "图库待审・都営地下鉄・都営地下鉄_8500形（別）", asset: null, plannedAsset: "../images/列车/都営地下鉄/都営地下鉄_8500形（別）.png", aliases: [], operatorDirectory: "都営地下鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-229", displayName: "图库待审・都営地下鉄・都営地下鉄_E5000形", iconName: "图库待审・都営地下鉄・都営地下鉄_E5000形", asset: null, plannedAsset: "../images/列车/都営地下鉄/都営地下鉄_E5000形.png", aliases: [], operatorDirectory: "都営地下鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-230", displayName: "图库待审・都営地下鉄・都営地下鉄_都電9000形", iconName: "图库待审・都営地下鉄・都営地下鉄_都電9000形", asset: null, plannedAsset: "../images/列车/都営地下鉄/都営地下鉄_都電9000形.png", aliases: [], operatorDirectory: "都営地下鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-231", displayName: "图库待审・銚子電鉄・銚子電鉄_2000形_2002編成_緑色", iconName: "图库待审・銚子電鉄・銚子電鉄_2000形_2002編成_緑色", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_2000形_2002編成_緑色.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-232", displayName: "图库待审・銚子電鉄・銚子電鉄_2000形_2002編成_銚電旧色復刻カラー", iconName: "图库待审・銚子電鉄・銚子電鉄_2000形_2002編成_銚電旧色復刻カラー", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_2000形_2002編成_銚電旧色復刻カラー.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-233", displayName: "图库待审・銚子電鉄・銚子電鉄_2000形_2002編成_銚電旧色復刻カラー_クハ2502側", iconName: "图库待审・銚子電鉄・銚子電鉄_2000形_2002編成_銚電旧色復刻カラー_クハ2502側", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_2000形_2002編成_銚電旧色復刻カラー_クハ2502側.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-234", displayName: "图库待审・銚子電鉄・銚子電鉄_2000形_2002編成_青色", iconName: "图库待审・銚子電鉄・銚子電鉄_2000形_2002編成_青色", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_2000形_2002編成_青色.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-235", displayName: "图库待审・銚子電鉄・銚子電鉄_22000形_22005編成_次郎右衛門", iconName: "图库待审・銚子電鉄・銚子電鉄_22000形_22005編成_次郎右衛門", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_22000形_22005編成_次郎右衛門.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-236", displayName: "图库待审・銚子電鉄・銚子電鉄_22000形_22007編成_銚電グリーン", iconName: "图库待审・銚子電鉄・銚子電鉄_22000形_22007編成_銚電グリーン", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_22000形_22007編成_銚電グリーン.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-237", displayName: "图库待审・銚子電鉄・銚子電鉄_3000形_3001編成_澪つくしカラー", iconName: "图库待审・銚子電鉄・銚子電鉄_3000形_3001編成_澪つくしカラー", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_3000形_3001編成_澪つくしカラー.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-238", displayName: "图库待审・銚子電鉄・銚子電鉄_3000形_3001編成_澪つくしカラー_クハ3501側", iconName: "图库待审・銚子電鉄・銚子電鉄_3000形_3001編成_澪つくしカラー_クハ3501側", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_3000形_3001編成_澪つくしカラー_クハ3501側.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-239", displayName: "图库待审・銚子電鉄・銚子電鉄_3000形_3001編成_澪つくしカラー_デハ3001側", iconName: "图库待审・銚子電鉄・銚子電鉄_3000形_3001編成_澪つくしカラー_デハ3001側", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_3000形_3001編成_澪つくしカラー_デハ3001側.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-240", displayName: "图库待审・銚子電鉄・銚子電鉄_デキ3_赤色", iconName: "图库待审・銚子電鉄・銚子電鉄_デキ3_赤色", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_デキ3_赤色.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-241", displayName: "图库待审・銚子電鉄・銚子電鉄_デキ3_黒色", iconName: "图库待审・銚子電鉄・銚子電鉄_デキ3_黒色", asset: null, plannedAsset: "../images/列车/銚子電鉄/銚子電鉄_デキ3_黒色.png", aliases: [], operatorDirectory: "銚子電鉄", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-242", displayName: "图库待审・鹿島臨海鉄道・鹿島臨海鉄道_6000形_新塗装", iconName: "图库待审・鹿島臨海鉄道・鹿島臨海鉄道_6000形_新塗装", asset: null, plannedAsset: "../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_6000形_新塗装.png", aliases: [], operatorDirectory: "鹿島臨海鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-243", displayName: "图库待审・鹿島臨海鉄道・鹿島臨海鉄道_6000形_標準色", iconName: "图库待审・鹿島臨海鉄道・鹿島臨海鉄道_6000形_標準色", asset: null, plannedAsset: "../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_6000形_標準色.png", aliases: [], operatorDirectory: "鹿島臨海鉄道", artworkStatus: "pending-source-review", plannedOnly: true },
  { id: "artwork-inventory-244", displayName: "图库待审・鹿島臨海鉄道・鹿島臨海鉄道_8000形", iconName: "图库待审・鹿島臨海鉄道・鹿島臨海鉄道_8000形", asset: null, plannedAsset: "../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png", aliases: [], operatorDirectory: "鹿島臨海鉄道", artworkStatus: "pending-source-review", plannedOnly: true }
];
UNREGISTERED_ARTWORK_CATALOG.forEach(function(record) {
  // 资产文件名只作为“时刻表计划输入”的显式标签，不进入实时别名表。
  // 这样可以让 SQL/手工时刻表在明确提供完整运营方+文件标签时使用图片，
  // 同时阻断实时车号、运行号或裸车型名通过素材文件名猜车。
  var plannedAssetName = String(record.plannedAsset || '').split('/').pop().replace(/\.png$/i, '');
  var plannedAliases = [];
  function addPlannedAlias(value) {
    value = String(value || '').trim();
    if (value && plannedAliases.indexOf(value) < 0) plannedAliases.push(value);
  }
  var operatorDirectory = String(record.operatorDirectory || '').trim();
  if (operatorDirectory && plannedAssetName) {
    addPlannedAlias(operatorDirectory + plannedAssetName);
    addPlannedAlias(operatorDirectory + ' ' + plannedAssetName);
    if (plannedAssetName.indexOf(operatorDirectory + '_') === 0) {
      addPlannedAlias(operatorDirectory + plannedAssetName.slice(operatorDirectory.length + 1));
      addPlannedAlias(plannedAssetName);
    }
  }
  record.plannedAliases = plannedAliases;
  if (!CANONICAL_VEHICLES[record.id]) CANONICAL_VEHICLES[record.id] = record;
  plannedAliases.forEach(function(alias) {
    _registerCanonicalVehiclePlannedAlias(alias, record);
  });
});

// 具有明确线路作用域且文件已存在的素材，已经完成审核，不能继续停留在
// 计划候选层。统一提升为正式 asset，使线路计划和实时身份投影使用同一
// 个规范图片；没有 lineIds 的素材仍保持待审，避免把孤立 PNG 扩散到全网。
Object.keys(CANONICAL_VEHICLES).forEach(function(id) {
  var scoped = CANONICAL_VEHICLES[id];
  if (!scoped || scoped.asset || !scoped.plannedAsset ||
      !Array.isArray(scoped.lineIds) || !scoped.lineIds.length) return;
  // 车型名没有携带车次/代际时，专用涂装 PNG 不能冒充整个系列。
  // 这些记录仍保留为计划候选，等实时/编成证据给出精确子型后再投影。
  // 线路范围本身只表示“这条线可能使用该车”，不等于已确认具体车型。
  // 只有经过人工/来源审核显式标记的记录才允许从计划图提升为正式 asset。
  if (scoped.candidateOnly === true || scoped.promotePlannedAsset !== true) return;
  scoped.asset = scoped.plannedAsset;
  scoped.artworkStatus = "verified-scoped-asset";
  scoped.plannedAsset = null;
});

// JR九州の公式資料：西九州新幹線はN700S系（6両）。
// 型式のみの計画証拠。実車の編成番号・塗装は証明しない。
// この型式専用の原生PNGは現在のリポジトリに存在しないため、
// JR西日本/JR東海のN700画像を代用せず中性マーカーを維持する。
CANONICAL_VEHICLES["jr-kyushu-n700s-nishikyushu-plan"] = {
  displayName: "JR九州N700S系（西九州新幹線）",
  iconName: "JR九州N700S系（西九州新幹線）",
  asset: null,
  plannedAsset: null,
  lineIds: ["NishiKyushuShinkansen"],
  aliases: ["JR九州N700S系", "N700S系（西九州新幹線）"],
  candidateOnly: true,
  artworkStatus: "missing-native-asset",
  evidenceSource: "https://www.jrkyushu.co.jp/train/kids/guardian/train_equipment/"
};

// 在来線：公式列車案内に基づくモデル参照。未収録PNGの仮画像は作らない。
// ソニック（883 / 885）と大阪環状線323は運用編成を確定しない。
CANONICAL_VEHICLES["jr-kyushu-883-sonic-plan"] = {
  displayName: "JR九州883系",
  iconName: "JR九州883系",
  asset: null, plannedAsset: null,
  lineIds: ["Nippo", "KagoshimaMain"],
  aliases: ["883系（ソニック）"],
  candidateOnly: true, artworkStatus: "missing-native-asset",
  evidenceSource: "https://www.jrkyushu.co.jp/trains/sp/sonic/"
};
CANONICAL_VEHICLES["jr-kyushu-885-sonic-plan"] = {
  displayName: "JR九州885系",
  iconName: "JR九州885系",
  asset: null, plannedAsset: null,
  lineIds: ["Nippo", "KagoshimaMain"],
  aliases: ["885系（ソニック）"],
  candidateOnly: true, artworkStatus: "missing-native-asset",
  evidenceSource: "https://www.jrkyushu.co.jp/trains/sp/sonic/"
};
CANONICAL_VEHICLES["jr-west-323-local-plan"] = {
  displayName: "JR西日本323系",
  iconName: "JR西日本323系",
  asset: null, plannedAsset: null,
  lineIds: ["OsakaLoop", "Yumesaki"],
  aliases: ["323系（大阪環状線）"],
  candidateOnly: true, artworkStatus: "missing-native-asset",
  evidenceSource: "https://www.jr-odekake.net/railroad/service/train-woman.html"
};

Object.keys(CANONICAL_VEHICLES).forEach(function(id) {
  var rec = CANONICAL_VEHICLES[id];
  rec.id = id;
  // 带日期的图片是事实性声明，必须携带来源信息。
  // 无效的日期记录会被刻意拒绝注册，因此不会参与解析。
  if ((rec.validFrom || rec.validTo) && (!rec.evidenceSource || rec.evidenceGrade !== "A")) {
    return;
  }
  _registerCanonicalVehicleAlias(id, rec);
  _registerCanonicalVehicleAlias(rec.displayName, rec);
  _registerCanonicalVehicleAlias(rec.iconName, rec);
  (rec.aliases || []).forEach(function(alias) {
    _registerCanonicalVehicleAlias(alias, rec);
  });
});

function resolveCanonicalVehicle(name) {
  var n = _canonicalVehicleAliasKey(name);
  if (!n || CANONICAL_VEHICLE_ALIAS_CONFLICTS[n]) return null;
  return CANONICAL_VEHICLE_ALIAS_INDEX[n] || null;
}

function _canonicalVehicleMatchesLine(rec, lineId) {
  var scoped = rec && Array.isArray(rec.lineIds) ? rec.lineIds : [];
  // 有线路上下文时，未声明线路范围的素材不能被当作全网车型。
  // 这类记录可能只是图库待审/计划候选；放行会把孤立 PNG 投影到
  // 完全无关的线路（例如把ばんえつ物語的 DE10 投到都营线）。
  if (lineId) return scoped.length > 0 && scoped.indexOf(String(lineId)) >= 0;
  return true;
}

// 直通时刻表可能以“所属方+车型”携带跨线候选（例如小田急↔JR
// 常磐直通）。候选仍必须命中规范目录声明的线路站点；只有行程站点
// 明确出现该目录线路时才允许归一化，不能把车辆图片扩散成线路默认值。
function _canonicalVehicleMatchesItinerary(rec, ctx) {
  var scoped = rec && Array.isArray(rec.lineIds) ? rec.lineIds : [];
  var itinerary = ctx && Array.isArray(ctx.itineraryStations) ? ctx.itineraryStations : [];
  if (!scoped.length || !itinerary.length) return false;
  return scoped.some(function(lineId) {
    var token = String(lineId || '').trim();
    if (!token) return false;
    return itinerary.some(function(station) {
      var raw = String(station || '');
      return raw.indexOf('.' + token + '.') >= 0 ||
        raw.indexOf('.' + token + ':') >= 0 ||
        raw.endsWith('.' + token);
    });
  });
}

// 使用规范目录声明的线路范围别名解析时刻表标签。
// 这样可以避免 E231系0番台 等通用标签
// 借用其他线路的图片，也无需增加逐线路解析分支。
function resolveCanonicalVehicleForPlan(name, ctx) {
  var n = _canonicalVehicleAliasKey(name);
  var lineId = ctx && String(ctx.lineId || "").trim();
  if (!n) return null;
  if (ctx && ctx._plannedArtworkInventory === true &&
      !CANONICAL_VEHICLE_PLANNED_ALIAS_CONFLICTS[n]) {
    var plannedInventoryRecord = CANONICAL_VEHICLE_PLANNED_ALIAS_INDEX[n];
    if (plannedInventoryRecord) return plannedInventoryRecord;
  }
  if (lineId) {
    var scoped = Object.keys(CANONICAL_VEHICLES).map(function(id) {
      var rec = CANONICAL_VEHICLES[id];
      var aliases = rec && rec.lineAliases && rec.lineAliases[lineId];
      if (!Array.isArray(aliases)) return null;
      return aliases.some(function(alias) {
        return _canonicalVehicleAliasKey(alias) === n;
      }) ? rec : null;
    }).filter(Boolean);
    if (scoped.length === 1) return scoped[0];
  }
  var direct = resolveCanonicalVehicle(name);
  if (direct && direct.displayName === "相鉄21000系" && /^(?:Mita|Namboku)$/.test(lineId) && String(ctx && ctx.trainNumber || "").trim() && !/G(?:[1-5]|[AB])?$/.test(String(ctx && ctx.trainNumber || "").toUpperCase())) return null;
  if (_canonicalVehicleMatchesLine(direct, lineId)) return direct;
  if (direct && _canonicalVehicleMatchesItinerary(direct, ctx)) return direct;
  // 即使名称带有地区/线路括号，也不能绕过 lineIds 作用域。
  // 只有没有线路上下文的独立目录查询才允许返回未限界的完整名称。
  return !lineId && direct && (
    _canonicalVehicleAliasKey(direct.displayName) === n ||
    _canonicalVehicleAliasKey(direct.iconName) === n
  ) ? direct : null;
}

// 可选的预验证内存目录可以扩展内置图片。
// 规范身份解析器仍然是
// 唯一的车型选择器：目录行不能猜测列车车型。
var _verifiedSqlArtworkPaths = null;
var _verifiedSqlArtworkByExactName = null;
var _verifiedSqlArtworkByExactFormation = null;
function hydrateVerifiedArtworkCatalog(rows) {
  if (!Array.isArray(rows)) return false;
  var paths = Object.create(null);
  var exact = Object.create(null);
  var formations = Object.create(null);
  rows.forEach(function(row) {
    var path = row && String(row.image_path || "");
    if (!(path.startsWith("images/列车/") && path.endsWith(".png") && path.split("/").length === 4)) return;
    var artwork = "../" + path;
    paths[artwork] = true;
    // 显式编组证据可以识别已验证的变体；必须要求
    // 带运营方限定的车型与精确编组，绝不能从裸系列名推断。
    var company = path.split("/")[2];
    var vehicle = String(row.vehicle_type || "").trim();
    var formation = String(row.formation_id || "").trim();
    if (company && company !== "共通" && vehicle && formation) {
      var qualifiedType = vehicle.indexOf(company) === 0 ? vehicle : company + vehicle;
      var formationLabel = formation + (/(?:F|編成)$/i.test(formation) ? "" : "編成");
      var identity = qualifiedType + "（" + formationLabel + "）";
      var validFrom = String(row.valid_from || "").slice(0, 10);
      var validTo = String(row.valid_to || "").slice(0, 10);
      if ((!validFrom || /^\d{4}-\d{2}-\d{2}$/.test(validFrom)) &&
          (!validTo || /^\d{4}-\d{2}-\d{2}$/.test(validTo)) &&
          (!validFrom || !validTo || validFrom <= validTo)) {
        if (!formations[identity]) formations[identity] = [];
        formations[identity].push({ artwork: artwork, from: validFrom, to: validTo });
      }
    }
    // 只有当数据库车型名称恰好对应一张已认证的通用车型图片时，
    // 该名称才有资格使用图片。编组/涂装/主题变体
    // 不能仅凭列车的车型名称选择。
    if (row.formation_id || row.livery || row.theme) return;
    var name = String(row.vehicle_type || "").trim();
    if (!name) return;
    if (!Object.prototype.hasOwnProperty.call(exact, name)) exact[name] = artwork;
    else if (exact[name] !== artwork) exact[name] = null;
  });
  _verifiedSqlArtworkPaths = paths;
  _verifiedSqlArtworkByExactName = exact;
  _verifiedSqlArtworkByExactFormation = formations;
  return true;
}

// 本地批准的 PNG 快照：运行时不请求 Supabase 图库。
// 保持在现有的单一 TrainIcons/TrainVehicle 身份模块内。
// 记录只授权已知的精确车辆/编组显示图片；
// 绝不能据此确定任意列车号对应的实际车辆。
hydrateVerifiedArtworkCatalog([
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2000系",
    "formation_id": "01",
    "livery": "レッドパープル",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2000系_01編成_レッドパープル.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2000系",
    "formation_id": "02",
    "livery": "オレンジ",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2000系_02編成_オレンジ.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2000系",
    "formation_id": "03",
    "livery": "グリーン",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2000系_03編成_グリーン.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2000系",
    "formation_id": "04",
    "livery": "イエロー",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2000系_04編成_イエロー.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2000系",
    "formation_id": "05",
    "livery": "ブルー",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2000系_05編成_ブルー.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2000系",
    "formation_id": "06",
    "livery": "レッド",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2000系_06編成_レッド.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2000系",
    "formation_id": "07",
    "livery": "さくら色",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2000系_07編成_さくら色.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2020系",
    "formation_id": "21",
    "livery": "グリーンクリスタル",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2020系_21編成_グリーンクリスタル.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2020系",
    "formation_id": "22",
    "livery": "ブライトアンバー",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2020系_22編成_ブライトアンバー.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2020系",
    "formation_id": "23",
    "livery": "ピュアルビー",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2020系_23編成_ピュアルビー.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2020系",
    "formation_id": "24",
    "livery": "ゴールデントパーズ",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2020系_24編成_ゴールデントパーズ.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2020系",
    "formation_id": "25",
    "livery": "トワイライトアメジスト",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2020系_25編成_トワイライトアメジスト.png"
  },
  {
    "operator": "SaitamaNewUrbanTransit",
    "vehicle_type": "2020系",
    "formation_id": "26",
    "livery": "ブルーサファイア＆クリソベリル",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/埼玉新都市交通/埼玉新都市交通_2020系_26編成_ブルーサファイア＆クリソベリル.png"
  },
  {
    "operator": "ShonanMonorail",
    "vehicle_type": "5000系",
    "formation_id": "5601",
    "livery": "red",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/湘南モノレール/湘南モノレール_5000系_5601編成_レッド.png"
  },
  {
    "operator": "ShonanMonorail",
    "vehicle_type": "5000系",
    "formation_id": "5603",
    "livery": "blue",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/湘南モノレール/湘南モノレール_5000系_5603編成_ブルー.png"
  },
  {
    "operator": "ShonanMonorail",
    "vehicle_type": "5000系",
    "formation_id": "5605",
    "livery": "green",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/湘南モノレール/湘南モノレール_5000系_5605編成_グリーン.png"
  },
  {
    "operator": "ShonanMonorail",
    "vehicle_type": "5000系",
    "formation_id": "5607",
    "livery": "yellow",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/湘南モノレール/湘南モノレール_5000系_5607編成_イエロー.png"
  },
  {
    "operator": "ShonanMonorail",
    "vehicle_type": "5000系",
    "formation_id": "5609",
    "livery": "purple",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/湘南モノレール/湘南モノレール_5000系_5609編成_バイオレット.png"
  },
  {
    "operator": "ShonanMonorail",
    "vehicle_type": "5000系",
    "formation_id": "5611",
    "livery": "black",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/湘南モノレール/湘南モノレール_5000系_5611編成_ブラック.png"
  },
  {
    "operator": "ShonanMonorail",
    "vehicle_type": "5000系",
    "formation_id": "5613",
    "livery": "pink",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/湘南モノレール/湘南モノレール_5000系_5613編成_ピンク.png"
  },
  {
    "operator": "Tokyu",
    "vehicle_type": "1000系",
    "formation_id": "1013F",
    "livery": null,
    "theme": "緑の電車",
    "valid_from": "2019-11-25",
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_1000系_1013F_緑の電車.png"
  },
  {
    "operator": "Tokyu",
    "vehicle_type": "1000系",
    "formation_id": "1017F",
    "livery": null,
    "theme": "きになる電車",
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_1000系_1017F_きになる電車.png"
  },
  {
    "operator": "Tokyu",
    "vehicle_type": "1000系1500番台",
    "formation_id": "1522F",
    "livery": null,
    "theme": "いけたまハッピートレイン",
    "valid_from": "2024-06-23",
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_1000系_1500番台_1522F_いけたまハッピートレイン.png"
  },
  {
    "operator": "TOKYU",
    "vehicle_type": "300系",
    "formation_id": "301",
    "livery": "玉電カラー",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_300系_301編成_玉電カラー.png"
  },
  {
    "operator": "TOKYU",
    "vehicle_type": "300系",
    "formation_id": "302",
    "livery": "モーニングブルー",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_300系_302編成_モーニングブルー.png"
  },
  {
    "operator": "TOKYU",
    "vehicle_type": "300系",
    "formation_id": "303",
    "livery": "クラシックブルー",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_300系_303編成_クラシックブルー.png"
  },
  {
    "operator": "TOKYU",
    "vehicle_type": "300系",
    "formation_id": "304",
    "livery": "アップルグリーン",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_300系_304編成_アップルグリーン.png"
  },
  {
    "operator": "TOKYU",
    "vehicle_type": "300系",
    "formation_id": "306",
    "livery": "レリーフイエロー",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_300系_306編成_レリーフイエロー.png"
  },
  {
    "operator": "TOKYU",
    "vehicle_type": "300系",
    "formation_id": "307",
    "livery": "ブルーイッシュラベンダー",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_300系_307編成_ブルーイッシュラベンダー.png"
  },
  {
    "operator": "TOKYU",
    "vehicle_type": "300系",
    "formation_id": "309",
    "livery": "バーントオレンジ",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_300系_309編成_バーントオレンジ.png"
  },
  {
    "operator": "TOKYU",
    "vehicle_type": "300系",
    "formation_id": "310",
    "livery": "ターコイズグリーン",
    "theme": null,
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_300系_310編成_ターコイズグリーン.png"
  },
  {
    "operator": "Yamaman",
    "vehicle_type": "1000形",
    "formation_id": "第1編成",
    "livery": null,
    "theme": "こあら1号",
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/山万/山万_1000形_第1編成_こあら1号.png"
  },
  {
    "operator": "Yamaman",
    "vehicle_type": "1000形",
    "formation_id": "第2編成",
    "livery": null,
    "theme": "こあら2号",
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/山万/山万_1000形_第2編成_こあら2号.png"
  },
  {
    "operator": "Yamaman",
    "vehicle_type": "1000形",
    "formation_id": "第3編成",
    "livery": null,
    "theme": "こあら3号",
    "valid_from": null,
    "valid_to": null,
    "image_path": "images/列车/山万/山万_1000形_第3編成_こあら3号.png"
  },
  {
    "operator": "YokohamaMinatomiraiRailway",
    "vehicle_type": "Y000系",
    "formation_id": "Y002F",
    "livery": null,
    "theme": "ひつじでんしゃ",
    "valid_from": "2020-03-29",
    "valid_to": null,
    "image_path": "images/列车/東急電鉄/東急電鉄_Y000系_ひつじでんしゃ.png"
  }
]);

function _canonicalVehicleIconPath(name, serviceDate) {
  var n = String(name || "").trim();
  if (!n) return null;
  var rec = resolveCanonicalVehicle(n);
  if (!rec) return null;
  if (rec.validFrom || rec.validTo) {
    var d = String(serviceDate || "").slice(0, 10);
    if (!d) return null;
    if (rec.validFrom && d < rec.validFrom) return null;
    if (rec.validTo && d > rec.validTo) return null;
  }
  // 可选的内存目录可以认证同一规范图片。
  // 否则继续使用此前验证过的静态映射，以支持离线运行。
  if (_verifiedSqlArtworkPaths && _verifiedSqlArtworkPaths[rec.asset]) return rec.asset;
  return rec.asset;
}

// 不存在按线路/运营方设置的默认车型选择器。

// 显示名称规范化只能在同一
  // 规范身份内扩展拼写变体。绝不能把退役车辆改写成后继车辆，
  // 把通用系列改成子系列，或把有歧义的候选改成某一具体车辆。
  function _vehicleIdentityParts(value) {
    return String(value).split('/').map(function(s){ return s.trim(); }).filter(Boolean);
  }
  function resolveVehicleDisplayName(vehicleIdentity) {
    if (!vehicleIdentity) return null;
    var parts = _vehicleIdentityParts(vehicleIdentity);
    if (parts.length !== 1) return parts.length ? parts.join(' / ') : null;
    var name = parts[0];
    var canonical = resolveCanonicalVehicle(name);
    return canonical ? canonical.displayName : name;
  }

  // 车队/涂装池仅是资产目录。已确认的车型并不
  // 证明具体编组或涂装，因此运行时绝不能用哈希随机选择。
  // 单一图片映射器：输入只能是已解析的车型身份。
  // 这里刻意不接收运行上下文（线路/运营方/列车号/来源）。
  function resolveVehicleArtwork(vehicleIdentity, serviceDate) {
    return _resolveVehicleArtworkBase(vehicleIdentity, serviceDate);
  }
  function _resolveVehicleArtworkBase(vehicleIdentity, serviceDate) {
    if (!vehicleIdentity) return null;
    var parts = _vehicleIdentityParts(vehicleIdentity);
    // 候选列表不是具体身份。
    if (parts.length !== 1) return null;
    var name = parts[0];

    // 只有在规范别名解析到同一注册身份时才允许使用。
    // 不允许线路覆盖、替代车辆、基础名称截断，
    // 退役车辆替换或近似别名选择图片。
    // SQL 目录存在认证的精确编组时，优先使用该编组；
    // 静态规范图片仍是离线兜底。
    // 规范别名冲突时两条路径都会被阻断。
    if (CANONICAL_VEHICLE_ALIAS_CONFLICTS[name]) return null;
    if (_verifiedSqlArtworkByExactFormation &&
        Object.prototype.hasOwnProperty.call(_verifiedSqlArtworkByExactFormation, name)) {
      var verified = _verifiedSqlArtworkByExactFormation[name];
      var date = String(serviceDate || "").slice(0, 10);
      var uniqueArtwork = null;
      for (var i = 0; i < verified.length; i++) {
        var candidate = verified[i];
        if ((candidate.from || candidate.to) && !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        if (candidate.from && date < candidate.from) continue;
        if (candidate.to && date > candidate.to) continue;
        if (uniqueArtwork && uniqueArtwork !== candidate.artwork) return null;
        uniqueArtwork = candidate.artwork;
      }
      return uniqueArtwork;
    }
    var canonical = _canonicalVehicleIconPath(name, serviceDate);
    if (canonical) return canonical;
    // 上游确认的车型只能在
    // 精确且无歧义的车型身份下使用 SQL 认证 PNG（绝不能按线路猜测车队）。
    // 裸系列编号可能被多个运营方共用；认证子集中的唯一记录
    // 也不能证明唯一的铁路身份。
    if (/^[0-9]{2,5}(?:-[0-9]+)?(?:系|形|型)$/.test(name)) return null;
    if (_verifiedSqlArtworkByExactName &&
        Object.prototype.hasOwnProperty.call(_verifiedSqlArtworkByExactName, name)) {
      return _verifiedSqlArtworkByExactName[name] || null;
    }
    return null;
  }

  window.TrainIcons = {
    resolveVehicleArtwork: resolveVehicleArtwork,
    resolveVehicleDisplayName: resolveVehicleDisplayName,
    resolveCanonicalVehicle: resolveCanonicalVehicle,
    CANONICAL_VEHICLES: CANONICAL_VEHICLES,
    hydrateVerifiedArtworkCatalog: hydrateVerifiedArtworkCatalog,
    // 可选的预验证内存目录可以扩展内置资产。
  };

  // 仅规范显式证据携带的运营方元数据标签。
  function normOp(op) {
    if (!op) return '';
    op = String(op).replace(/^odpt\.(?:Operator|TrainOwner):/, '');
    if (window.TransitConstants && typeof window.TransitConstants.normalizeOp === 'function') {
      return window.TransitConstants.normalizeOp(op);
    }
    return String(op).replace(/^odpt\.Operator:/, '');
  }

  // 候选串 "A / B / C" → 去重数组 ["A","B","C"]
  // GTFS-RT 的 vehicle_id/vehicle_label 有时直接携带规范车型名，
  // 但不同运营商字段名不同。只接受已注册目录中的完整车型/别名，
  // 不把纯数字车号、运行号或任意前缀当作车型证据。
  function resolveRealtimeVehicleLabel(ctx) {
    ctx = ctx || {};
    // 都营当前 GTFS-RT 会把 vehicle_id 原样复用为 trip_id；
    // 这类字段不是实体车号，禁止进入车型目录反查。
    var gtfsVehicleId = ctx.vehicleEvidenceKind === 'trip-id-only' ? '' : ctx.gtfsVehicleId;
    var values = [ctx.realtimeVehicleType, ctx.realtimeVehicleLabel,
      ctx.vehicleLabel, ctx.gtfsVehicleLabel, gtfsVehicleId,
      ctx.realtimeCarNumber, ctx.vehicleCarNumber];
    var labels = getRealtimeLabelIndex();
    for (var i = 0; i < values.length; i++) {
      var raw = String(values[i] || '').trim();
      if (!raw) continue;
      // 实时记录已有线路/运营方上下文时，车型必须在该作用域内解析。
      // 不能在线路作用域解析失败后回退到全局同名目录，否则同一系列会
      // 把别的运营方或别的线路的 PNG 覆盖到当前列车上。
      var canonical = resolveCanonicalVehicleForPlan(raw, ctx) || resolveCanonicalVehicle(raw);
      var exact = canonical && (!ctx.lineId || _canonicalVehicleMatchesLine(canonical, ctx.lineId) ||
        _canonicalVehicleMatchesItinerary(canonical, ctx))
        ? canonical : null;
      if (exact) return exact.displayName;
      for (var j = 0; j < labels.length; j++) {
        var candidate = labels[j];
        if (raw.indexOf(candidate.label) < 0) continue;
        var scoped = resolveCanonicalVehicleForPlan(candidate.label, ctx);
        if (scoped) return scoped.displayName;
      }
    }
    return '';
  }

  function splitCandidates(str) {
    var out = [];
    if (!str) return out;
    String(str).split('/').forEach(function(s) {
      var c = s.trim();
      if (c && out.indexOf(c) < 0) out.push(c);
    });
    return out;
  }

  // 图标库反查（S0–S3 候选 → 图标路径）
  function resolveArtworkForIdentity(name, formationId, serviceDate, allowPlannedAsset) {
    if (!name) return '';
    var identity = name;
    if (formationId && !/編成/.test(identity)) {
      var fid = String(formationId).trim();
      identity = name + '（' + fid + (/(?:F|編成)$/i.test(fid) ? '' : '編成') + '）';
    }
    // 同一模块、同一规范映射；不跳转到全局旧图标解析器。
    var artwork = resolveVehicleArtwork(identity, serviceDate) || '';
    if (artwork || allowPlannedAsset !== true) return artwork;
    // 计划图片对时刻表候选保持中性。只有在实时证据
    // 已建立一个精确身份后才允许使用。
    var record = resolveCanonicalVehicle(identity);
    return record && record.plannedAsset ? record.plannedAsset : '';
  }

  // ============================================================
  // 主决策：只有一条按来源优先级仲裁的路径。
  // ============================================================
  function resolve(ctx) {
    ctx = ctx || {};
    var assignmentOperator = normOp(ctx.assignmentOperator || ctx.operationOperator || '');
    var tcar = resolveTodenArakawaLiveCar(ctx) || resolveHakodateLiveCar(ctx) ||
      resolveWataraseWa99Car(ctx) || resolveRosterCar(ctx);
    // 物理车号证据可能只携带运营方短车型名（如“71-000形”）；
    // 车号证据本身已限定所属方，必须先投影回规范全名再进入统一仲裁。
    var tcarCanonical = tcar && resolveCanonicalVehicle(tcar.name);
    var tcarLabel = tcarCanonical ? tcarCanonical.displayName : (tcar && tcar.name) || '';
    // 来源提供的精确车型优先于通用车队约束。
    // 对没有车型证据的列车才保留后者（绝不创造变体）。
    var hasExplicitVehicle = !!(String(ctx.realtimeVehicleType || '').trim() ||
      String(ctx.realtimeDerivedVehicleType || '').trim() ||
      String(ctx.timetableVehicleType || '').trim() || tcar);
    var realtimeCandidateLabels = Array.isArray(ctx.realtimeVehicleCandidates)
      ? ctx.realtimeVehicleCandidates.join(' / ') : '';
    var toeiFleet = hasExplicitVehicle ? null : resolveToeiOwnerSingleFleet(ctx);
    var toeiFleetCandidates = hasExplicitVehicle || toeiFleet
      ? [] : resolveToeiOwnerFleetCandidates(ctx);
    var operationArtworkCandidates = hasExplicitVehicle
      ? [] : resolveToeiOperationArtwork(ctx);

    // 实时、实时推导及
    // 时刻表/SQL 证据共用一条身份仲裁路径。在比较来源前，先规范化
    // 已注册的精确别名：“JR E235系0番台”和“E235系0番台（山手線）”是
    // 同一已验证车型，而不是相互竞争的映射。
    // 未注册或有歧义的别名绝不猜测或合并。
    var pool = Object.create(null);
    var orderArr = [];
    function admittedIdentity(value, source) {
      var raw = String(value || '').trim();
      var scopedCanonical = resolveCanonicalVehicleForPlan(raw, ctx);
      if (scopedCanonical) return scopedCanonical.displayName;
      var direct = resolveCanonicalVehicle(raw);
      if (!direct) {
        // SQL 认证的精确车型可以没有内置目录条目，但只能在同一条
        // 已校验 PNG 路径上使用；普通实时/时刻表自由文本仍拒绝。
        if (source === 'verified-timetable-artwork' &&
            /^images\/列车\/[^/.][^/]*\/[^/.][^/]*\.png$/.test(String(ctx.verifiedTimetableArtworkPath || '')) &&
            String(ctx.verifiedTimetableArtworkPath || '').indexOf('..') < 0) return raw;
        return '';
      }
      var scoped = Array.isArray(direct.lineIds) ? direct.lineIds : [];
      // 线路上下文下，未声明 lineIds 的记录永远不能进入身份池。
      if (ctx.lineId && !scoped.length) return '';
      // 只有实体车号/车籍表是跨线直通的强证据。实时字段里的车型名称
      // 仍可能是旧缓存、错误线路或供应商复制值，不能单凭“realtime”
      // 绕过规范目录的 lineIds；普通车型必须命中当前线路或已声明的
      // itinerary 直通范围，避免无链接线路出现另一条线的 PNG。
      var crossLineRealtime = source === 'roster-physical-id' ||
        source === 'official-realtime-car-number' ||
        // 仅保留无来源上下文的离线兼容调用；正式 ODPT/GTFS 实时行
        // 一定带 railway/operator，必须走严格线路作用域。
        (source === 'realtime' && !ctx.railway && !ctx.operator && !ctx.trainOwner);
      if (ctx.lineId && scoped.indexOf(String(ctx.lineId)) < 0 && !crossLineRealtime) return '';
      return direct.displayName;
    }
    [
      { source: 'realtime', value: ctx.realtimeVehicleType },
      { source: 'realtime-derived', value: ctx.realtimeDerivedVehicleType },
      { source: 'realtime-derived-candidates', value: realtimeCandidateLabels },
      { source: 'timetable', value: tcar ? '' : ctx.timetableVehicleType },
      { source: 'verified-timetable-artwork',
        value: (!ctx.timetableVehicleType ||
          String(ctx.verifiedTimetableModel || '') === String(ctx.timetableVehicleType || ''))
          ? ctx.verifiedTimetableModel : '' },
      { source: tcar && tcar.sourceUrl ? 'roster-physical-id' : 'official-realtime-car-number', value: tcarLabel },
      { source: 'official-train-owner-single-fleet', value: toeiFleet },
      { source: 'official-realtime-owner-fleet-candidates', value: toeiFleetCandidates.join(' / ') }
    ].forEach(function(group) {
      splitCandidates(group.value).forEach(function(rawCandidate) {
        var candidate = admittedIdentity(rawCandidate, group.source);
        if (!candidate) return;
        if (!pool[candidate]) {
          pool[candidate] = { sources: [] };
          orderArr.push(candidate);
        }
        if (pool[candidate].sources.indexOf(group.source) < 0) {
          pool[candidate].sources.push(group.source);
        }
      });
    });

    // 一个已验证身份可以由多个来源共同携带；相互冲突的
    // 身份保持未解析；来源顺序或图片是否存在
    // 都不能成为选出胜者的理由。
    var chosen = orderArr.length === 1 ? orderArr[0] : '';
    var chosenSrc = chosen ? pool[chosen].sources.join('+') : '';

    var confidence = chosen ? 'high' : 'none';

    // 4）图片严格投影已经精确的车型身份。
    // 缺失图片就保持缺失；绝不替换为其他候选、线路、
    // 运营方、退役替代车辆或规则推导车型。
    var _formationCandidates = Array.isArray(ctx.formationCandidates)
      ? ctx.formationCandidates.map(function(v){ return String(v || '').trim(); }).filter(Boolean)
      : [];
    _formationCandidates = _formationCandidates.filter(function(v,i,a){ return a.indexOf(v) === i; });
    var _formationId = String(ctx.formationId || '').trim();
    if (tcar && tcar.formationId && _formationId && _formationId !== tcar.formationId &&
        _formationCandidates.indexOf(tcar.formationId) < 0) _formationCandidates.push(tcar.formationId);
    if (tcar && tcar.formationId && !_formationId && !_formationCandidates.length) {
      _formationId = tcar.formationId;
      _formationCandidates = [_formationId];
    }
    var _formationConstrained = _formationCandidates.length > 0 || !!_formationId;
    var _formationUnique = _formationCandidates.length === 1
      && !!_formationId
      && _formationCandidates[0] === _formationId;
    var iconPath = '';
    var allowRealtimePlannedAsset = ctx._realtimeVehicleResolution === true &&
      (!!String(ctx.realtimeVehicleType || '').trim() ||
       !!String(ctx.realtimeDerivedVehicleType || '').trim() ||
       !!ctx.formationId || (ctx.formationCandidates || []).length > 0 ||
       !!toeiFleet);
    if (chosen) {
      if (_formationConstrained) {
        // 只有两个字段共同指向同一值时，编组证据才具有权威性。
        // 编组证据有歧义、缺失或互相矛盾时，完全阻止图片显示。
        // 精确车辆编组证据可以使用同一
        // 车型已验证的通用 PNG（若没有专用编组 PNG）；绝不猜测其他车型。
        iconPath = _formationUnique
          ? (resolveArtworkForIdentity(chosen, _formationId, ctx.serviceDate, allowRealtimePlannedAsset) ||
             resolveArtworkForIdentity(chosen, '', ctx.serviceDate, allowRealtimePlannedAsset)) : '';
      } else {
        iconPath = resolveArtworkForIdentity(chosen, '', ctx.serviceDate, allowRealtimePlannedAsset);
        // 服务器的来源日期时刻表解析器可以提供唯一的
        // 原生精确车型 PNG，即使内置目录中没有该图片。
        // 不能信任孤立路径或任意时刻表候选：
        // 调用方必须证明同一精确车型及其认证映射。
        var dbArt = String(ctx.verifiedTimetableArtworkPath || '');
        var dbModel = admittedIdentity(ctx.verifiedTimetableModel, 'verified-timetable-artwork');
        if (!iconPath && chosen === dbModel &&
            /^images\/列车\/[^/.][^/]*\/[^/.][^/]*\.png$/.test(dbArt) &&
            dbArt.indexOf('..') < 0) {
          iconPath = '../' + dbArt;
        }
      }
    }

    // 显示名称规范化仅用于展示，绝不能改写
    // 已解析身份：名称保留精确证据字符串，图片投影
    // 已在上方基于原始身份完成。

    // B0 车型身份契约：
    // EXACT     = 有列车级/显式证据支持一辆具体车辆，
    //             或适用时刻表车队本身只有一种可能车型。
    // NARROWED  = 时刻表/所属方证据缩小了车队范围，但仍有多个车型。
    // UNKNOWN   = 不存在可用的车型证据。
    var identityStatus = 'UNKNOWN';
    var identityReason = 'no-vehicle-evidence';
    var effectiveCandidates = orderArr.slice();
    if (chosen) {
      identityStatus = 'EXACT';
      // 时刻表推导出的精确车型保留时刻表身份原因，
      // 便于下游诊断区分证据通道。
      if (tcar && chosen === tcarLabel) {
        identityReason = tcar.sourceUrl ? 'verified-roster-physical-id' : 'verified-toden-realtime-car-number';
      } else if (toeiFleet && chosen === toeiFleet) {
        identityReason = 'verified-toei-owner-single-fleet';
      } else if (chosenSrc === 'timetable') {
        identityReason = 'timetable-vehicle-evidence';
      } else {
        identityReason = 'unique-converged-vehicle-evidence';
      }
      if (pool[chosen] && pool[chosen].sources.length === 1 &&
          pool[chosen].sources[0] === 'realtime-derived-candidates') {
        identityStatus = 'NARROWED';
        identityReason = 'realtime-derived-vehicle-candidate';
      }
    } else if (effectiveCandidates.length > 0) {
      identityStatus = 'NARROWED';
      identityReason = toeiFleetCandidates.length
        ? 'official-owner-fleet-candidates' : 'non-decisive-vehicle-candidates';
    }

    // B0 硬性不变量：未解析的多候选身份绝不能泄漏
    // 候选专属的车辆/编组/涂装图片。渲染层可以使用其
    // 解析器之外的中性标记。
    if (identityStatus !== 'EXACT') iconPath = '';

    return {
      name: chosen,                                  // EXACT vehicle only; empty while ambiguous
      lineId: String(ctx.lineId || ''),
      operator: String(ctx.operator || ctx.assignmentOperator || ''),
      verifiedCarNumber: tcar && chosen === tcarLabel ? tcar.number : '',
      candidates: effectiveCandidates,               // admitted evidence candidates
      allCandidates: orderArr,                        // admitted evidence pool for diagnostics
      identityStatus: identityStatus,                 // EXACT / NARROWED / UNKNOWN
      identityReason: identityReason,
      assignmentOperator: assignmentOperator,
      sources: chosen ? (pool[chosen] ? pool[chosen].sources.slice() : (chosenSrc ? [chosenSrc] : [])) : [],
      source: chosenSrc,                             // decision source; empty when unresolved
      confidence: confidence,
      iconPath: iconPath,
      // 多车型号段的图片集合仅用于诊断/详情层核对；不泄漏到主标记。
      operationArtworkCandidates: operationArtworkCandidates.map(function(m) {
        return { vehicleType: m.vehicleType, asset: m.asset, sourceUrl: m.sourceUrl || '' };
      }),
      // 兼容原 vehicleType 候选串格式（"A / B / C"，稳定顺序）
      // 加权随机映射已确定单一车型时,vehicleTypeStr 与 name 一致(title 不再显示候选串)
      vehicleTypeStr: chosen || ''
    };
  }


  // 时刻表计划独立于带日期的实际车辆分配。
  // 展开来源缩写并保留全部候选。只有唯一的
  // 有证据计划才能提供车型标记；有歧义的计划保持中性。

  var _issuedVehiclePlans = new WeakSet();
  var _planOwnerLabels = {
    'JR-East':'JR東日本', 'JR-West':'JR西日本', 'JR-Kyushu':'JR九州',
    'JR-Central':'JR東海', 'JR-Hokkaido':'JR北海道', 'Izukyu':'伊豆急行',
    'TokyoMetro':'東京メトロ', 'Toei':'都営', 'Tokyu':'東急', 'TOKYU':'東急',
    'Tobu':'東武', 'Odakyu':'小田急', 'Seibu':'西武', 'Keio':'京王',
    'Keikyu':'京急', 'Keisei':'京成', 'Sotetsu':'相鉄',
    'YokohamaMunicipal':'横浜市営', 'TWR':'東京臨海高速鉄道',
    'Rinkai':'東京臨海高速鉄道', 'TokyoMonorail':'東京モノレール',
    'TamaMonorail':'多摩モノレール', 'Yurikamome':'ゆりかもめ',
    'EnoshimaElectric':'江ノ島電鉄',
    'ChibaUrbanMonorail':'千葉都市モノレール', 'ShonanMonorail':'湘南モノレール', 'SaitamaNewUrbanTransit':'埼玉新都市交通',
    'ToyoRapid':'東葉高速', 'SaitamaRailway':'埼玉高速鉄道', 'Hokuso':'北総', 'ChibaNewtown':'千葉ニュータウン'
  };
  function resolveTimetableVehiclePlan(input, ctx) {
    ctx=ctx||{};
    var raw=String(input||'').split(/\s*\/\s*/).map(function(v){return v.trim();}).filter(Boolean);
    if(!raw.length)return null;
    var owner=_planOwnerLabels[normOp(ctx.operator)]||'';
    var labels=Object.keys(_planOwnerLabels).map(function(k){return _planOwnerLabels[k];})
      .filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return b.length-a.length;});
    var series='';
    var candidates=raw.map(function(name){
      name=name.replace(/\(/g,'（').replace(/\)/g,'）');
      if (/^\d+番[台代]/.test(name) && series) name=series+name;
      var seriesMatch=name.match(/((?:[A-Z-]+|キハ)?\d+系)/);
      if(seriesMatch)series=seriesMatch[1];
      var declared=labels.find(function(label){return name.indexOf(label)===0;});
      if(declared)owner=declared;
      var canonical=owner ? resolveCanonicalVehicleForPlan(owner+name,ctx) : null;
      if(!canonical) {
        var direct=resolveCanonicalVehicleForPlan(name,ctx);
        var ownerAsset=direct&&(direct.asset||direct.plannedAsset);
        var assetOwner=ownerAsset?ownerAsset.split('/')[3]:'';
        var expected={'JR東日本':'JR東日本','JR東海':'JR東海','JR西日本':'JR西日本',
          '京急':'京浜急行電鉄','京成':'京成電鉄','京王':'京王電鉄','小田急':'小田急電鉄',
          '東急':'東急電鉄','東武':'東武鉄道','西武':'西武鉄道','相鉄':'相模鉄道',
          '都営':'都営地下鉄','東京メトロ':'東京メトロ'}[owner]||owner;
        // 未限定所属方的标签不能借用其他所属方的车辆。
        // 唯一例外：目录明确为本线路登记了相同车型的 lineAliases，
        // 这证明它是合法的跨社直通计划候选（如 Rinkai 的 JR E233 7000）。
        // 此授权只服务时刻表 planned 图片，不决定实际列车/编组。
        var sameLineModelAlias = direct && ctx.lineId && direct.lineAliases &&
          Array.isArray(direct.lineAliases[String(ctx.lineId)]) &&
          direct.lineAliases[String(ctx.lineId)].some(function(alias) {
            return _canonicalVehicleAliasKey(alias) === _canonicalVehicleAliasKey(name);
          });
        if(direct && (declared || direct.allowCrossOperator === true || (!owner && !ctx.operator) ||
            assetOwner===expected || /^TX-/.test(name) || sameLineModelAlias))canonical=direct;
      }
      return {label:canonical?canonical.displayName:name,canonical:canonical};
    }).filter(function(v,i,a){return a.findIndex(function(x){return x.label===v.label;})===i;});
    var allowCandidateArtwork=ctx.allowCandidateArtwork===true;
    var first=candidates.length===1?candidates[0]:null, candidate=first, icon='';
    // 单一候选可以直接投影其图库图。离线/人工时刻表中的多候选若
    // 明确共用同一张计划代表图，可以展示该计划图，但不会选择车型。
    // SQL 当前计划仍保持中性，避免把不完整的实时补充候选误当成图证据。
    if (first || allowCandidateArtwork) {
      candidate=first||candidates.find(function(v){return v.canonical&&
        (resolveVehicleArtwork(v.canonical.displayName,ctx.serviceDate)||v.canonical.asset||v.canonical.plannedAsset);});
      if(!candidate)candidate=first;
      if (!candidate) return null;
      var asset=candidate.canonical&&(resolveVehicleArtwork(candidate.canonical.displayName,ctx.serviceDate)||candidate.canonical.asset||candidate.canonical.plannedAsset||"");
      icon=asset || '';
    } else if (candidates.length > 1 && ctx._positionSource !== 'supabase-train-run') {
      var sharedAssets = candidates.map(function(v) {
        return v.canonical && (resolveVehicleArtwork(v.canonical.displayName,ctx.serviceDate) ||
          v.canonical.asset || v.canonical.plannedAsset || "");
      });
      if (sharedAssets.length && sharedAssets.every(function(v) { return !!v && v === sharedAssets[0]; })) {
        icon = sharedAssets[0];
      }
    }
    var plan={status:candidates.length===1?'PLANNED_MODEL':'PLANNED_CANDIDATES',
      models:candidates.map(function(v){return v.label;}),
      representativeModel:candidates.length===1
        ? (first||candidate ? (first||candidate).label : '')
        : (allowCandidateArtwork && candidate ? candidate.label : ''),iconPath:icon,
      source:ctx.source||'sql-timetable-plan',evidenceRole:'timetable-plan',
      sourceUrl:ctx.sourceUrl||'',formationId:'',
      lineId:String(ctx.lineId||''),operator:String(ctx.operator||''),
      allowCandidateArtwork:allowCandidateArtwork};
    _issuedVehiclePlans.add(plan);
    return plan;
  }

  // Officially documented service-type plans for undated SQL timetable projections.
// Only two exact operator + line + train-type combinations are supported.
// Never use this for live vehicle identification, exact formation or a generic
// LimitedExpress; the result flows only into vehicleResult.vehiclePlan.
function _officialConventionalServicePlan(tt, lineId, line) {
  if (!tt || tt._positionSource !== 'supabase-train-run' ||
      tt._sqlVehicleMappingLevel !== 'unresolved') return null;
  var operator = normOp(tt['odpt:operator'] || line && line.operator || '');
  var serviceType = String(tt['odpt:trainType'] || '').trim();
  if (operator === 'Keio' && lineId === 'KeioSagami' &&
      serviceType === 'odpt.TrainType:Keio.KeioLiner') {
    return {
      operator: operator, vehicleCandidates: ['京王5000系'],
      evidenceRole: 'timetable-plan', planOverride: false,
      sourceUrl: 'https://www.keio.co.jp/zasekishitei/'
    };
  }
  if (operator === 'Tobu' && lineId === 'TobuIsesaki' &&
      serviceType === 'odpt.TrainType:Tobu.TH-LINER') {
    return {
      operator: operator, vehicleCandidates: ['東武70090型'],
      evidenceRole: 'timetable-plan', planOverride: false,
      sourceUrl: 'https://www.tobu.co.jp/corporation/rail/vehicles/'
    };
  }
  // Explicit *partial* regional fleet references are NOT dispatch plans.
  // Keep the series names discoverable in timetable diagnostics while hiding
  // all PNGs and not selecting a representative train/livery.
  if (operator === 'JR-West' && lineId === 'OsakaLoop' &&
      serviceType === 'odpt.TrainType:JR-West.Local') {
    return {
      operator: operator, vehicleCandidates: ['JR西日本323系'],
      evidenceRole: 'route-fleet-reference', _fleetReferenceOnly: true,
      sourceUrl: 'https://www.westjr.co.jp/press/article/2019/05/page_14241.html'
    };
  }
  if (operator === 'JR-West' && lineId === 'TokaidoKansai' &&
      serviceType === 'odpt.TrainType:JR-West.Rapid') {
    return {
      operator: operator, vehicleCandidates: ['JR西日本223系','JR西日本225系'],
      evidenceRole: 'route-fleet-reference', _fleetReferenceOnly: true,
      sourceUrl: 'https://www.westjr.co.jp/press/article/2020/02/page_15645.html'
    };
  }
  // 西武通勤電車：公開されている車両形式と路線範囲だけを参照。
  // 車両運用や当日の編成が確定したとは扱わず、PNG も選ばない。
  // 特急・S-TRAIN・拝島ライナーにはこの通勤用フォールバックを適用しない。
  if (operator === 'Seibu' &&
      /odpt\.TrainType:Seibu\.(?:Local|Express|SemiExpress|Rapid|RapidExpress|CommuterExpress|CommuterSemiExpress)$/.test(serviceType)) {
    var seibuCommuterFleet = {
      SeibuShinjuku: {
        models: ['西武2000系','西武20000系','西武30000系','西武40000系'],
        source: 'https://www.seiburailway.jp/railway/encyclopedia/'
      },
      SeibuTamagawa: {
        models: ['西武101系'],
        source: 'https://www.seiburailway.jp/railway/encyclopedia/101/'
      },
      SeibuTamako: {
        models: ['西武9000系'],
        source: 'https://www.seiburailway.jp/railway/encyclopedia/9000/'
      }
    }[lineId];
    if (seibuCommuterFleet) {
      return {
        operator:'Seibu', vehicleCandidates:seibuCommuterFleet.models,
        evidenceRole:'route-fleet-reference', _fleetReferenceOnly:true,
        planOverride:false, sourceUrl:seibuCommuterFleet.source
      };
    }
  }
  return null;
}

function resolveTimetableRun(run, tt, lineId, line, serviceDateOverride) {
    var serviceDate = serviceDateOverride || tt['_serviceDate'] || tt['serviceDate'] || tt['operatingDate'] || '';
    var identityKey = lineId + "|" + String(serviceDate || "").slice(0, 10);
    var evidenceRevision = window.TrainOperationEvidence.getRevision();
    // 复用的时刻表对象可能收到修正后的车型、列车号或所属方
    // 证据；这些变化都不能复用此前的未知/车型计划。
    var planInputKey=JSON.stringify([tt._sqlVehicleCandidateLabel||'',tt.vehicleType||'',
      run.trainNumber||'',tt['odpt:trainType']||run.trainType||'',run.calendar||'',
      tt['odpt:operator']||line.operator||'',tt['odpt:railway']||'',
      tt['odpt:trainOwner']||tt.trainOwner||'',run.destinationStationUrn||'',
      tt._sqlVehicleMappingLevel||'',tt._sqlVehicleArtworkPath||'',
      tt._operationCode||tt.operationCode||tt.operation_code||'',
      tt['odpt:trainTimetableObject']||[],tt['odpt:originStation']||[],tt['odpt:destinationStation']||[]]);
    if (run.identity && run.identity.key === identityKey &&
        run.identity.evidenceRevision === evidenceRevision && run.identity.planInputKey === planInputKey) return run.identity;

    var trainNumber = run.trainNumber;
    var destinationStationUrn = run.destinationStationUrn;
    var _trainOwner = tt['odpt:trainOwner'] || tt['trainOwner'] || '';
    var _assignmentOperator = '';
    var _assignmentMatches = [];
    // SQL 循环时刻表提供计划/参考车型，而不是
    // 某一天观测到的实际编组。应将该单车型时刻表事实
    // 与历史运行/编组观测保持独立。
    var _plannedSqlVehicle = tt._positionSource === 'supabase-train-run' &&
      (tt._sqlVehicleMappingLevel === 'dated_schedule_rule' ||
       tt._sqlVehicleMappingLevel === 'dated_operation_owner' ||
       tt._sqlVehicleMappingLevel === 'verified_scheduled_boundary') &&
      !!String(tt.vehicleType || '').trim() &&
      String(tt.vehicleType).split('/').length === 1;
    var _baseOperationCtx = {
      lineId: lineId,
      operator: tt['odpt:operator'] || line.operator || '',
      railway: tt['odpt:railway'] || '',
      railDirection: run.railDirection || '',
      destinationStation: destinationStationUrn || '',
      timetableObjectId: run.timetableObjectId,
      serviceDate: serviceDate,
      // 精确列车号参考受日历范围约束；使用该来源
      // 运行的公开日历，绝不能从主机当前日期推断。
      trainType: tt['odpt:trainType'] || run.trainType || '',
      plannedCandidateLabel: tt._sqlVehicleCandidateLabel || '',
      itineraryStations: (tt['odpt:trainTimetableObject']||[]).reduce(function(a,stop){
        return a.concat(stop['odpt:arrivalStation']||[],stop['odpt:departureStation']||[]);
      },[]).concat(tt['odpt:originStation']||[],tt['odpt:destinationStation']||[]),
      calendarType: /Weekday$/.test(run.calendar || '') ? 'weekday'
        : /(?:SaturdayHoliday|Saturday|Holiday|Sunday)$/.test(run.calendar || '') ? 'holiday' : '',
      _plannedRun: true,
      at: (function(){ var d=new Date(Date.now()+9*60*60*1000); return d.toISOString().slice(11,16); })()
    };
    _baseOperationCtx.operationCode = String(
      tt['_operationCode'] || tt['operationCode'] || tt['operation_code'] || ''
    ).trim();
    if (!_plannedSqlVehicle && !_baseOperationCtx.operationCode) {
      _baseOperationCtx.operationCode = window.TrainOperationEvidence &&
        typeof window.TrainOperationEvidence.normalizeOperationCode === 'function'
        ? window.TrainOperationEvidence.normalizeOperationCode(trainNumber, _baseOperationCtx) : '';
    }
    // 有范围的时刻表计划是 SQL 循环记录的权威来源；应先查询它，
    // 再查询日期运行提供器，避免宽泛的历史运行规则
    // 把计划记录错误变成实际车辆分配。
    var _plannedFamilyEvidence = !_plannedSqlVehicle && window.TrainOperationEvidence &&
      typeof window.TrainOperationEvidence.resolveEvidence === 'function'
      ? window.TrainOperationEvidence.resolveEvidence(trainNumber, _baseOperationCtx, "planned")
      : null;
    var _plannedFamilyOverride = _plannedFamilyEvidence &&
      _plannedFamilyEvidence.planOverride === true &&
      (!!_plannedFamilyEvidence.vehicleType ||
       (_plannedFamilyEvidence.vehicleCandidates || []).length === 1);
    var _resolvedEvidence = !_plannedSqlVehicle && !_plannedFamilyOverride && window.TrainOperationEvidence &&
      typeof window.TrainOperationEvidence.resolveEvidence === 'function'
      ? window.TrainOperationEvidence.resolveEvidence(trainNumber, _baseOperationCtx, "fallback")
      : null;
    // 日期运行系列提供器可用于实时仲裁，但
    // 其覆盖整个后缀的车型不能变成 SQL 时刻表分配。
    // 上面的规范计划提供器才是唯一允许创建
    // 循环车型计划的来源。
    if (tt._positionSource === 'supabase-train-run' && _resolvedEvidence &&
        _resolvedEvidence.evidenceRole === 'operation-family') _resolvedEvidence = null;
    if (_resolvedEvidence) _assignmentMatches.push(_resolvedEvidence);
    if (_resolvedEvidence && _resolvedEvidence.decisive && _resolvedEvidence.operator) {
      _assignmentOperator = _resolvedEvidence.operator;
    }
    var _operationVehicleInput = _resolvedEvidence && _resolvedEvidence.vehicleType
      ? _resolvedEvidence.vehicleType
      : (_resolvedEvidence && _resolvedEvidence.vehicleCandidates || []).join(' / ');
    // 读取已有 ODPT 适配器携带的实际 SQL/手工时刻表车型证据。
    // 多个车型就继续保持多个
    // 候选：不能依据图片是否存在或线路名称猜测某一个。
    // SQL 将历史计划车辆标签与来源提供的、
    // 列车级决定性映射分开存储。让诊断保留全部候选，
    // 不能把“某线路只有一个候选”转换成实际观测车辆。
    var _sqlSourceCandidates = tt._positionSource === 'supabase-train-run'
      ? String(tt._sqlVehicleCandidateLabel || '').split(/\s*\/\s*/)
          .map(function(v) { return v.trim(); }).filter(Boolean) : [];
    // SQL 的 source_single_type_candidate 只证明“该计划条目有一个候选名称”，
    // 并未证明该服务日运行了该车型。即使唯一候选恰好有规范 PNG，
    // 也不得把它投入 EXACT 的身份仲裁；候选保留在
    // _sqlSourceCandidates，之后由计划参考通道投影为 planned。
    var _sourceCandidateOnly = tt._positionSource === 'supabase-train-run' &&
      tt._sqlVehicleMappingLevel === 'source_single_type_candidate';
    var _declaredVehicleInput = _sourceCandidateOnly
      ? '' : String(tt.vehicleType || '').trim();
    var _timetableVehicleInput = [_operationVehicleInput, _declaredVehicleInput]
      .filter(Boolean).filter(function(v,i,a) { return a.indexOf(v) === i; }).join(' / ');
    // 精确且经过边界验证的 SQL 车型可以缩小运行
    // 证据的候选列表；不能覆盖其他单车型
    // 断言，也绝不能按图片可用性从有歧义的列表中挑选车型。
    var _declaredModels = _declaredVehicleInput.split('/').map(function(v){return v.trim();}).filter(Boolean);
    var _operationModels = String(_operationVehicleInput || '').split('/').map(function(v){return v.trim();}).filter(Boolean);
    var _uniqueSqlCandidate = tt._positionSource === 'supabase-train-run' &&
      tt._sqlVehicleMappingLevel === 'source_single_type_candidate' &&
      _declaredModels.length === 1;
    if (_uniqueSqlCandidate || (_declaredModels.length === 1 && _operationModels.length > 1 &&
        _operationModels.indexOf(_declaredModels[0]) >= 0)) {
      // 同一运行的唯一来源候选优先于宽泛的线路运用族；
      // 多车型候选仍不得被压缩成单一车型。
      _timetableVehicleInput = _declaredModels[0];
    }
    // 日期有效且具有决定性的列车级车型可以缩小时刻表更宽泛的
    // 候选集合；比较规范身份，绝不能比较运行号后缀。
    if (_resolvedEvidence && _resolvedEvidence.decisive === true &&
        _operationModels.length === 1 && _declaredModels.length > 1) {
      var _exactCanonical = resolveCanonicalVehicle(_operationModels[0]);
      var _compatible = _exactCanonical && _declaredModels.some(function(candidate) {
        return resolveCanonicalVehicleForPlan(candidate,{lineId:lineId}) === _exactCanonical;
      });
      if (_compatible) _timetableVehicleInput = _operationModels[0];
    }
    // 历史通用 PNG 候选只有在
    // 只有已有的日期运行/参考解析器独立确认
    // 同一唯一车型已确认后才可使用；SQL 候选本身绝不决定身份。
    var _evidenceBackedCandidateArt = '';
    if (!_plannedSqlVehicle && _resolvedEvidence && _resolvedEvidence.decisive === true &&
        _resolvedEvidence.sourceUrl && _resolvedEvidence.observedDate &&
        _operationModels.length === 1 && _sqlSourceCandidates.length === 1 &&
        tt._sqlCandidateArtworkPath) {
      var _ruleModel = resolveCanonicalVehicle(_operationModels[0]);
      var _sourceModel = resolveCanonicalVehicle(_sqlSourceCandidates[0]);
      if (_ruleModel && _sourceModel && _ruleModel === _sourceModel) {
        _evidenceBackedCandidateArt = String(tt._sqlCandidateArtworkPath || '');
      }
    }
    var _assignmentFormations = {};
    if (_resolvedEvidence && _resolvedEvidence.formationId) {
      _splitFormationIds(_resolvedEvidence.formationId).forEach(function(fid) {
        fid = String(fid || '').trim();
        if (fid) _assignmentFormations[fid] = true;
      });
    }
    var vehCtx = {
      lineId: lineId,
      operator: _assignmentOperator || line.operator,
      trainOwner: _trainOwner,
      assignmentOperator: _assignmentOperator,
      trainNumber: trainNumber,
      trainType: run.trainType,
      destinationStation: destinationStationUrn || '',
      timetableVehicleType: _timetableVehicleInput,
      // SQL 只有在同一来源日期规范列车时刻表确认了唯一车型专属原生 PNG 后，
      // 才会提供该图片。
      // 这不是实时编组观测，也不是车型猜测。
      verifiedTimetableArtworkPath: _plannedSqlVehicle &&
        (tt._sqlVehicleMappingLevel === 'dated_schedule_rule' ||
         tt._sqlVehicleMappingLevel === 'dated_operation_owner')
          ? String(tt._sqlVehicleArtworkPath || '') : _evidenceBackedCandidateArt,
      verifiedTimetableModel: _plannedSqlVehicle &&
        (tt._sqlVehicleMappingLevel === 'dated_schedule_rule' ||
         tt._sqlVehicleMappingLevel === 'dated_operation_owner')
          ? _declaredVehicleInput : (_evidenceBackedCandidateArt ? _operationModels[0] : ''),
      timetableEvidence: _assignmentMatches,
      formationId: Object.keys(_assignmentFormations).length === 1 ? Object.keys(_assignmentFormations)[0] : '',
      formationCandidates: Object.keys(_assignmentFormations),
      serviceDate: serviceDate,
      trainId: run.timetableIdentity
    };
    var vehResult = resolve(vehCtx);
    if (vehResult.identityStatus === 'EXACT' && vehResult.name === '相鉄21000系' &&
        /^(?:Mita|Namboku)$/.test(lineId) &&
        !/G(?:[1-5]|[AB])?$/.test(String(trainNumber || '').toUpperCase())) {
      vehCtx.realtimeDerivedVehicleType = '';
      vehCtx.timetableVehicleType = _declaredVehicleInput;
      vehCtx.assignmentOperator = '';
      vehResult = resolve(vehCtx);
    }
    if(vehResult.identityStatus==='EXACT'&&!vehResult.iconPath){
      vehResult.vehiclePlan=resolveTimetableVehiclePlan(vehResult.name,{lineId:lineId,operator:line.operator,serviceDate:serviceDate,source:'known-model-representative',_plannedArtworkInventory:true});
    } else if(vehResult.identityStatus!=='EXACT'){
      var plannedEvidence=_plannedFamilyEvidence || (window.TrainOperationEvidence &&
        typeof window.TrainOperationEvidence.resolveEvidence === 'function'
        ? window.TrainOperationEvidence.resolveEvidence(trainNumber,_baseOperationCtx,'planned') : null);
      // A SQL row with no asserted model may still carry an unambiguous
      // OFFICIAL service category (KeioLiner / TH-LINER). This fallback
      // projects its reference PNG only; identityStatus remains UNKNOWN.
      if (!plannedEvidence && !_sqlSourceCandidates.length && !_declaredVehicleInput) {
        plannedEvidence = _officialConventionalServicePlan(tt, lineId, line);
      }
      var familyPlan=plannedEvidence&&(plannedEvidence.vehicleType||(plannedEvidence.vehicleCandidates||[]).join(' / '));
      var familyOverride=plannedEvidence&&(plannedEvidence.planOverride || plannedEvidence.evidenceRole==='timetable-reference' ||
        (!!plannedEvidence.operationCode && plannedEvidence.evidenceRole!=='timetable-plan'));
      var planInput=familyOverride?familyPlan:(_sqlSourceCandidates.length?_sqlSourceCandidates.join(' / '):(_declaredVehicleInput||familyPlan||''));
      var usesFamily=!!familyPlan&&(familyOverride||(!_sqlSourceCandidates.length&&!_declaredVehicleInput));
      vehResult.vehiclePlan=resolveTimetableVehiclePlan(planInput,{lineId:lineId,operator:usesFamily&&plannedEvidence.operator||(_resolvedEvidence&&_resolvedEvidence.decisive&&_resolvedEvidence.operator)||line.operator,serviceDate:serviceDate,source:usesFamily?'operation-family-plan':'sql-timetable-plan',sourceUrl:usesFamily?plannedEvidence.sourceUrl:(tt._timetableProvenance||''),itineraryStations:_baseOperationCtx.itineraryStations,_positionSource:tt._positionSource||'',_plannedArtworkInventory:true});
      if (plannedEvidence && plannedEvidence._fleetReferenceOnly === true &&
          vehResult.vehiclePlan && vehResult.identityStatus !== 'EXACT') {
        // Evidence covers a corridor or a subset of regional local services.
        // No single scheduled vehicle and no reliable livery can be inferred.
        vehResult.vehiclePlan.status = 'FLEET_REFERENCE';
        vehResult.vehiclePlan.iconPath = '';
        vehResult.vehiclePlan.representativeModel = '';
        vehResult.vehiclePlan.evidenceRole = 'route-fleet-reference';
        vehResult.vehiclePlan.sourceUrl = plannedEvidence.sourceUrl;
      }
    }
    run.identity = {
      planInputKey:planInputKey,
      key: identityKey,
      evidenceRevision: evidenceRevision,
      trainOwner: _trainOwner,
      assignmentOperator: _assignmentOperator,
      assignmentMatches: _assignmentMatches,
      assignmentFormations: Object.keys(_assignmentFormations),
      timetableVehicleInput: _timetableVehicleInput,
      plannedVehicleCandidates: _sqlSourceCandidates,
      plannedVehicleCandidateStatus: tt._positionSource === 'supabase-train-run'
        ? (tt._sqlVehicleMappingLevel || 'unresolved') : '',
      candidateArtworkConfirmedByDatedRule: !!_evidenceBackedCandidateArt,
      vehicleResult: vehResult
    };
    return run.identity;
  }

  function _operationDayDistance(later, earlier) {
    var a=String(later||'').slice(0,10).split('-').map(Number);
    var b=String(earlier||'').slice(0,10).split('-').map(Number);
    if(a.length!==3||b.length!==3||a.some(function(v){return !isFinite(v);})||b.some(function(v){return !isFinite(v);}))return NaN;
    return Math.round((Date.UTC(a[0],a[1]-1,a[2])-Date.UTC(b[0],b[1]-1,b[2]))/86400000);
  }

  function _operationCalendarKind(dateText, explicitKind) {
    var kind=String(explicitKind||'').toLowerCase();
    if(/weekday|weekdays|平日/.test(kind))return 'weekday';
    if(/holiday|saturday|sunday|休日/.test(kind))return 'holiday';
    var date=String(dateText||'').slice(0,10).split('-').map(Number);
    if(date.length!==3||date.some(function(v){return !isFinite(v);}))return '';
    var day=new Date(Date.UTC(date[0],date[1]-1,date[2])).getUTCDay();
    return day===0||day===6?'holiday':'weekday';
  }

  function _operationCodeMatches(recordCode, normalizedCode, trainNumber, ctx) {
    var expected=String(recordCode||'').toUpperCase().trim();
    if(!expected)return false;
    var candidates=[normalizedCode,ctx&&ctx.operationCode,trainNumber]
      .map(function(value){return String(value||'').toUpperCase().trim();})
      .filter(Boolean);
    if(candidates.indexOf(expected)>=0)return true;
    var expectedDigits=expected.match(/^\d+$/);
    if(!expectedDigits)return false;
    return candidates.some(function(candidate){
      var work=candidate.replace(/^[AB]/,'').replace(/[A-Z]$/,'');
      return /^\d+$/.test(work) && String(parseInt(work,10))===String(parseInt(expected,10));
    });
  }

  function resolveRecentOperationPlanReference(trainNumber,ctx) {
    ctx=ctx||{};
    var targetDate=String(ctx.serviceDate||'').slice(0,10);
    var operation=normalizeOperationCode(trainNumber,ctx) ||
      String(ctx.operationCode||trainNumber||'').toUpperCase().trim();
    var records=window.VEHICLE_OPERATION_EVIDENCE;
    if(!targetDate||!operation||!Array.isArray(records))return null;
    var targetCalendar=_operationCalendarKind(targetDate,ctx.calendarType);
    var sameCalendarEligible=records.filter(function(record){
      if(!record||String(record.validDate||'').slice(0,10)>=targetDate)return false;
      if(targetCalendar&&_operationCalendarKind(record.validDate,record.calendarType)!==targetCalendar)return false;
      if(!_operationCodeMatches(record.operationCode,operation,trainNumber,ctx))return false;
      if(record.ambiguityGroup||!record.vehicleType||!record.sourceUrl)return false;
      return _evidenceNetworkMatches(record.networkKey,ctx);
    });
    // Loo-ool 的运行表按工作日/节假日模式发布，
    // 而日期车辆备注只在运营方
    // 实际报告编组的日期录入。如果匹配的运行没有同日
    // 日历观测，单车型的 Loo-ool 运行观测仍可
    // 提供计划代表值。但它仍不具有决定性，
    // 绝不携带编组，也不会把实时身份提升为 EXACT。
    var eligible=sameCalendarEligible;
    var provenance='same-calendar-day-type operation observation; planned reference only';
    var crossCalendarReference=false;
    if(!eligible.length && targetCalendar) {
      eligible=records.filter(function(record){
        if(!record||String(record.validDate||'').slice(0,10)>=targetDate)return false;
        if(!_operationCodeMatches(record.operationCode,operation,trainNumber,ctx))return false;
        if(record.ambiguityGroup||!record.vehicleType||!record.sourceUrl)return false;
        if(record.evidenceRole&&record.evidenceRole!=='primary')return false;
        if(!/loo-ool\.com\/rail\//i.test(String(record.sourceUrl)))return false;
        return _evidenceNetworkMatches(record.networkKey,ctx);
      });
      provenance='operation-table vehicle observation; planned reference only';
      crossCalendarReference=true;
    }
    var latestDate=eligible.reduce(function(latest,record){
      var date=String(record.validDate||record.observedDate||'').slice(0,10);
      return date>latest?date:latest;
    },'');
    if(latestDate)eligible=eligible.filter(function(record){
      return String(record.validDate||record.observedDate||'').slice(0,10)===latestDate;
    });
    if(crossCalendarReference && _operationDayDistance(targetDate,latestDate)>7)return null;
    var identities={};
    eligible.forEach(function(record){
      var formation=Array.isArray(record.formationIds)?record.formationIds.join('|'):String(record.formationId||'');
      identities[String(record.vehicleType)+'|'+formation]=record;
    });
    var keys=Object.keys(identities);
    if(keys.length!==1)return null;
    var hit=identities[keys[0]];
    var sourceCalendar=_operationCalendarKind(hit.validDate,hit.calendarType);
    return {
      operator:hit.operator||ctx.operator||'JR-East',
      vehicleType:hit.vehicleType,
      formationId:'',
      operationCode:operation,
      grade:hit.grade||'C',
      sourceUrl:hit.sourceUrl,
      provenance:provenance,
      observedDate:String(hit.validDate||hit.observedDate||'').slice(0,10),
      evidenceRole:'timetable-reference',
      referenceAgeDays:_operationDayDistance(targetDate,hit.validDate),
      calendarType:sourceCalendar,
      targetCalendarType:targetCalendar,
      calendarMismatch:crossCalendarReference && !!sourceCalendar && sourceCalendar!==targetCalendar,
      decisive:false
    };
  }

  var realtimeResolutionCache = Object.create(null);
  var realtimeLabelIndexSource = null;
  var realtimeLabelIndex = [];

  function getRealtimeLabelIndex() {
    if (realtimeLabelIndexSource === CANONICAL_VEHICLES) return realtimeLabelIndex;
    var records = Object.keys(CANONICAL_VEHICLES).map(function(id) { return CANONICAL_VEHICLES[id]; }).filter(Boolean);
    var labels = [];
    records.forEach(function(rec) {
      [rec.displayName, rec.iconName].concat(rec.aliases || []).forEach(function(label) {
        var text = String(label || '').trim();
        if (!text || text.length < 4 || labels.some(function(row) { return row.label === text; })) return;
        labels.push({label:text, canonical:rec});
      });
    });
    labels.sort(function(a,b) { return b.label.length - a.label.length; });
    realtimeLabelIndexSource = CANONICAL_VEHICLES;
    realtimeLabelIndex = labels;
    return realtimeLabelIndex;
  }

  function realtimeResolutionKey(ctx) {
    var currentRevision = window.TrainOperationEvidence && typeof window.TrainOperationEvidence.getRevision === "function"
      ? window.TrainOperationEvidence.getRevision() : 0;
    var formationCandidates = Array.isArray(ctx.formationCandidates)
      ? ctx.formationCandidates.map(String).sort().join(",") : "";
    var fields = [currentRevision, ctx.lineId, ctx.positionLineId, ctx.fusionLineId,
      ctx.operator, ctx.trainOwner, ctx.assignmentOperator, ctx.operationOperator, ctx.railway,
      ctx.trainNumber, ctx.operationCode, ctx.railDirection, ctx.serviceDate, ctx.serviceTime,
      ctx.calendarType, ctx.formationId, ctx.realtimeVehicleType, ctx.realtimeVehicleLabel,
      ctx.vehicleEvidenceKind, ctx.gtfsVehicleId, ctx.realtimeCarNumber, ctx.vehicleCarNumber, ctx.trainType,
      ctx.carComposition, formationCandidates, ctx.destinationStation, ctx.fromStation, ctx.toStation];
    return fields.map(function(value) {
      return Array.isArray(value) ? value.join(",") : String(value == null ? "" : value);
    }).join("\u001f");
  }

  // 单条实时列车记录：列车号 -> 已注册线路证据 -> 身份 -> PNG。
  function resolveRealtime(ctx) {
    ctx=Object.assign({},ctx||{}, {_realtimeVehicleResolution:true});
    var _rawRealtimeCacheKey = realtimeResolutionKey(ctx);
    var _rawCachedRealtime = realtimeResolutionCache[_rawRealtimeCacheKey];
    if (_rawCachedRealtime) return Object.assign({}, _rawCachedRealtime);
    // 先消费 GTFS-RT 明确携带的规范车型标签；纯数字车号继续
    // 交给编组目录，不在这里按号码区间猜测车型。
    if (!String(ctx.realtimeVehicleType || '').trim()) {
      var _labelVehicle = resolveRealtimeVehicleLabel(ctx);
      if (_labelVehicle) ctx.realtimeVehicleType = _labelVehicle;
    }
    // 东武 GTFS-RT 有时把编成号放在 vehicle_id/vehicle_label 中，
    // 例如 1003011433F 或 11433F；先提取编成号，避免把它当作单节车号。
    var _tobuFormationContext=/(?:^|[|:_-])(?:Tobu|東武|スカイツリー|伊勢崎|日光|Tojo|東上)(?:$|[|:_-])/i.test([
      ctx.operator,ctx.trainOwner,ctx.lineId,ctx.railway
    ].join('|'));
    if (_tobuFormationContext && !String(ctx.formationId || '').trim()) {
      var _tobuFormationSource=String(ctx.realtimeCarNumber || ctx.vehicleCarNumber || '').trim();
      var _tobuFormationMatch=_tobuFormationSource.match(/(\d{3,5}F)$/i);
      if (_tobuFormationMatch) {
        ctx.formationId=_tobuFormationMatch[1].toUpperCase();
        ctx.realtimeCarNumber='';
        ctx.vehicleCarNumber='';
      }
    }
    var _realtimeCacheKey = realtimeResolutionKey(ctx);
    var _cachedRealtime = realtimeResolutionCache[_realtimeCacheKey];
    if (_cachedRealtime) return Object.assign({}, _cachedRealtime);
    var evidence=!String(ctx.realtimeVehicleType||'').trim()
      ? window.TrainOperationEvidence.resolveEvidence(ctx.trainNumber,ctx,'realtime-derived') : null;
    // A realtime decision must never accept a timetable/reference evidence
    // role, even if a custom provider accidentally returns one through the
    // shared registry.
    if (evidence && /^timetable-/.test(String(evidence.evidenceRole || ''))) evidence = null;
    // 运营番号 PNG 库是实时车型证据的共享入口。只有号段在库中
    // 唯一对应一个车型时才注入实时派生身份；Mita/Oedo 等多车型号段
    // 只保留 candidateArtwork，不会挑一张代表图。
    if (!String(ctx.realtimeVehicleType || '').trim() &&
        !(evidence && evidence.vehicleType)) {
      var operationPng = resolveOperationPng(ctx);
      if (operationPng && operationPng.status === 'EXACT' && operationPng.vehicleType) {
        ctx.realtimeDerivedVehicleType = operationPng.vehicleType;
        ctx.operationPngAsset = operationPng.asset || '';
        ctx.operationPngSourceUrl = (operationPng.sourceUrls || [])[0] || '';
      }
    }
    var planned=false;
    var input=evidence&&evidence.vehicleType||
      String(ctx.realtimeDerivedVehicleType || '');
    var realtimeVehicleCandidates=evidence&&Array.isArray(evidence.vehicleCandidates)
      ? evidence.vehicleCandidates.slice() : [];
    var formations=evidence&&evidence.decisive&&!planned&&evidence.formationId
      ? _splitFormationIds(evidence.formationId) : [];
    if(ctx.formationId)formations.push(String(ctx.formationId).trim());
    (ctx.formationCandidates||[]).forEach(function(id){if(id)formations.push(String(id).trim());});
    formations=formations.filter(function(id,i,a){return id&&a.indexOf(id)===i;});
    var adapted=Object.assign({},ctx,{
      formationId:formations.length===1?formations[0]:'',formationCandidates:formations,
      realtimeDerivedVehicleType:planned?'':input,
      realtimeVehicleCandidates:planned?[]:realtimeVehicleCandidates,
      timetableVehicleType:planned?input:''
    });
    var result=resolve(adapted);
    // 实时解析不创建任何运行计划、历史参考或代表性车型计划。
    // 没有直接实时车型/编组证据时保持 UNKNOWN；计划车型只由
    // resolveTimetableRun/TrainPositionEstimator 提供给推定位置。
    var _decision = {vehicleResult:result,evidence:evidence,isPlannedReference:planned,
      realtimeDerivedVehicleType:adapted.realtimeDerivedVehicleType,
      realtimeReferenceModel:adapted.timetableVehicleType,
      formationId:adapted.formationId,formationCandidates:formations};
    if (adapted.operationPngAsset) {
      _decision.operationPngAsset = adapted.operationPngAsset;
      _decision.operationPngSourceUrl = adapted.operationPngSourceUrl || '';
    }
    realtimeResolutionCache[_realtimeCacheKey] = _decision;
    realtimeResolutionCache[_rawRealtimeCacheKey] = _decision;
    var _cacheKeys = Object.keys(realtimeResolutionCache);
    if (_cacheKeys.length > 2048) delete realtimeResolutionCache[_cacheKeys[0]];
    return Object.assign({}, _decision);
  }

  // 每日编组证据。本层绝不猜测编组：
  // 只沿着
  // already-resolved physical runningChainId.
  var _formationEvidence = {};
  function _formationServiceDate(d) {
    var x = d instanceof Date ? d : new Date(d || Date.now());
    return x.getFullYear() + "-" + String(x.getMonth()+1).padStart(2,"0") + "-" + String(x.getDate()).padStart(2,"0");
  }
  function _normalizeFormation(lineId, formationId) {
    if (lineId !== "NewShuttle") return null;
    var id = String(formationId == null ? "" : formationId).replace(/[^0-9]/g,"");
    if (/^0[1-7]$/.test(id)) return { id:id, vehicleName:"埼玉新都市交通2000系（"+id+"編成）" };
    if (/^2[1-6]$/.test(id)) return { id:id, vehicleName:"2020系（"+id+"編成）" };
    return null;
  }
  function registerFormationEvidence(anchor) {
    if (!anchor || !anchor.runningChainId) return false;
    var f = anchor.formationId ? _normalizeFormation(anchor.lineId, anchor.formationId) : null;
    var explicitVehicle = String(anchor.vehicleName || anchor.vehicleType || "").trim();
    var vehicleName = f ? f.vehicleName : explicitVehicle;
    if (!vehicleName) return false;
    // 接纳证据绝不能依赖图片是否存在。带日期的
    // 显式车型身份即使在图库没有图片时也可以存储；
    // 只有证据随后被投影为展示内容时才解析图片。
    var date = anchor.serviceDate || _formationServiceDate(anchor.observedAt);
    var evidenceKey = date+"|"+anchor.runningChainId;
    var existing = _formationEvidence[evidenceKey];
    if (existing && existing.vehicleName && existing.vehicleName !== vehicleName) {
      // 同一实际运行链上的两个不兼容显式身份是数据
      // 冲突，绝不能让最新区段静默胜出。
      _formationEvidence[evidenceKey] = {
        lineId:anchor.lineId, runningChainId:anchor.runningChainId, serviceDate:date,
        formationId:"", vehicleName:"", conflict:true,
        conflictingVehicles:[existing.vehicleName, vehicleName].filter(function(v,i,a){return v && a.indexOf(v)===i;}),
        evidenceSource:"conflicting-explicit-vehicle-evidence",
        evidenceDetail:{ previous:existing.evidenceDetail || null, incoming:anchor.evidenceDetail || null },
        observedAt:anchor.observedAt || existing.observedAt || null
      };
      return false;
    }
    if (existing && existing.conflict) return false;
    _formationEvidence[evidenceKey] = {
      lineId:anchor.lineId, runningChainId:anchor.runningChainId, serviceDate:date,
      formationId:f ? f.id : "",
      vehicleName:vehicleName,
      evidenceSource:anchor.evidenceSource || (f ? "daily-observation" : "official-timetable-vehicle"),
      evidenceDetail:anchor.evidenceDetail || null,
      observedAt:anchor.observedAt || null
    };
    return true;
  }
  function resolveFormationEvidence(ctx) {
    if (!ctx || !ctx.runningChainId) return null;
    var date = ctx.serviceDate || _formationServiceDate(ctx.at);
    var a = _formationEvidence[date+"|"+ctx.runningChainId];
    if (!a || a.conflict) return null;
    var icon = resolveArtworkForIdentity(a.vehicleName, a.formationId, date);
    if (!icon) return null;
    return {
      formationId:a.formationId, vehicleName:a.vehicleName, iconPath:icon,
      serviceDate:a.serviceDate, source:"formation-evidence", confidence:"high",
      identityStatus:"EXACT", identityReason:"dated-running-chain-vehicle-evidence",
      evidenceSource:a.evidenceSource, evidenceDetail:a.evidenceDetail || null, observedAt:a.observedAt,
      propagatedByRunningChain:true
    };
  }
  function clearFormationEvidenceOtherDates(date) {
    var keep = date || _formationServiceDate();
    Object.keys(_formationEvidence).forEach(function(k) {
      if (k.indexOf(keep+"|") !== 0) delete _formationEvidence[k];
    });
  }

  // ============================================================
  // Public API
  // ============================================================
  // 精确证据投影到现有图库 PNG；未解析身份保持中性。
  function isGalleryPng(path) {
    var src = String(path || "");
    return src.startsWith("../images/列车/") &&
      src.endsWith(".png") && src.split("/").length === 5;
  }
  function normalizeGalleryPngPath(path) {
    // SQL/静态配置有时以站点根目录形式存储，但列车页面位于 /pages/。
    // 只规范已经是图库结构的相对/站点根路径，不补齐车型、不接受外站 URL。
    var src = String(path || "").trim();
    if (src.indexOf("images/列车/") === 0) src = "../" + src;
    else if (src.indexOf("/images/列车/") === 0) src = ".." + src;
    if (!isGalleryPng(src)) return "";
    var parts = src.split("/");
    return parts[3] !== "." && parts[3] !== ".." &&
      parts[4] !== "." && parts[4] !== ".." &&
      parts[4].indexOf("?") < 0 && parts[4].indexOf("#") < 0 ? src : "";
  }
  function selectMarkerArtwork(p, artworkFailed) {
    // 当前图面线路也属于素材授权范围；不能只根据来源记录自身的线路显示图像。
    var contextLineId = String(p && (p.displayLineId || p.lineId || p.positionLineId) || "").trim();
    var resolutionLineId = String(p && (p.vehicleResolutionLineId ||
      (p.vehicleResolution && p.vehicleResolution.lineId)) || "").trim();
    var resolutionSources = p && p.vehicleResolution && Array.isArray(p.vehicleResolution.sources)
      ? p.vehicleResolution.sources : [];
    var identityStatus = String(p && (p.vehicleIdentityStatus ||
      (p.vehicleResolution && p.vehicleResolution.identityStatus)) || "");
    // 自由文本车型、独立的 iconPath、计划候选和旧的扁平缓存均不能授权 PNG。
    // 仅复用已确认的上游解析结果；旧位置缺失投影旗标时要求嵌套解析结果也为 EXACT。
    var identityConfirmed = identityStatus === "EXACT" && !!(p &&
      (p.vehicleResolvedUpstream === true ||
       (p.vehicleResolvedUpstream == null && p.vehicleResolution &&
        p.vehicleResolution.identityStatus === "EXACT")));
    var strongRealtimeEvidence = !!(p && p.vehicleResolvedFromRealtime === true &&
      (resolutionSources.indexOf('official-realtime-car-number') >= 0 ||
       resolutionSources.indexOf('roster-physical-id') >= 0));
    var scopedProjection = !contextLineId ||
      (resolutionLineId && resolutionLineId === contextLineId) || strongRealtimeEvidence;
    // 多车型运用号候选只在位置线路与解析线路一致时保留诊断元数据。
    var candidateScopedProjection = !!contextLineId && !!resolutionLineId &&
      resolutionLineId === contextLineId;
    var iconSrc = identityConfirmed && scopedProjection
      ? normalizeGalleryPngPath(p.vehicleIconPath ||
          (p.vehicleResolution && p.vehicleResolution.iconPath) || "") : "";
    var vehiclePlan = p && p.vehiclePlan;
    var plannedMarker = false;
    // 上游已确认车型但扁平化丢失 iconPath 时，可按同一个规范身份重新
    // 获取原生 PNG；不接受计划图片、自由文本、编成不唯一时的降级反查。
    if (!iconSrc && identityConfirmed && scopedProjection && p &&
        (p.vehicleType || (p.vehicleResolution && p.vehicleResolution.name)) &&
        !p.vehicleFormationId &&
        (!p.vehicleFormationCandidates || !p.vehicleFormationCandidates.length)) {
      iconSrc = normalizeGalleryPngPath(resolveArtworkForIdentity(
        p.vehicleType || p.vehicleResolution.name, "", p.serviceDate, false));
    }
    // 候选图片只能核对出处，不能因为 PNG 只有一张就变成具体实车。
    var candidateAssets = [];
    var candidateArtwork = p && candidateScopedProjection && (p.operationArtworkCandidates ||
      (p.vehicleResolution && p.vehicleResolution.operationArtworkCandidates) || []);
    if (!iconSrc && Array.isArray(candidateArtwork)) {
      for (var cai = 0; cai < candidateArtwork.length; cai++) {
        var candidateAsset = normalizeGalleryPngPath(
          candidateArtwork[cai] && candidateArtwork[cai].asset);
        if (candidateAsset && candidateAssets.indexOf(candidateAsset) < 0) {
          candidateAssets.push(candidateAsset);
        }
      }
      // 日期规则只能为已经独立确认的同一 canonical 车型补回原生 PNG，
      // 不能给 UNKNOWN/NARROWED 挑代表图，也不能跨车型、跨线路借图。
      var exactModel = identityConfirmed && scopedProjection &&
        resolveCanonicalVehicle(p.vehicleType ||
          (p.vehicleResolution && p.vehicleResolution.name) || "");
      var candidateModel = candidateArtwork.length === 1 &&
        resolveCanonicalVehicle(candidateArtwork[0].vehicleType || "");
      if (candidateAssets.length === 1 && p.candidateArtworkConfirmedByDatedRule === true &&
          exactModel && candidateModel === exactModel) {
        iconSrc = candidateAssets[0];
        plannedMarker = true;
      }
    }
    var planMatchesLine = !contextLineId || (vehiclePlan &&
      String(vehiclePlan.lineId || "") === contextLineId);
    // 单车型、由共享计划解析器签发的时刻表位置可显示计划参考图；
    // 实时记录和多车型计划绝不能借用或抽选其中一张 PNG。
    if (!iconSrc && p && p.estimated === true && vehiclePlan && planMatchesLine &&
        _issuedVehiclePlans.has(vehiclePlan) && vehiclePlan.status === "PLANNED_MODEL" &&
        Array.isArray(vehiclePlan.models) && vehiclePlan.models.length === 1) {
      iconSrc = normalizeGalleryPngPath(vehiclePlan.iconPath);
      plannedMarker = !!iconSrc;
    }
    if (artworkFailed === true || !isGalleryPng(iconSrc)) {
      if (!iconSrc && candidateAssets.length) {
        return { kind: "candidate", iconSrc: "", planned: false,
          candidateAssets: candidateAssets.slice() };
      }
      return { kind: "unresolved", iconSrc: "" };
    }
    return { kind: "vehicle", iconSrc: iconSrc, planned: plannedMarker };
  }

  window.TrainVehicle = {
    resolveRealtime: resolveRealtime,
    resolveTimetableRun: resolveTimetableRun,
    resolve: resolve,
    resolveCanonicalVehicle: resolveCanonicalVehicle,
    getOperationPngLibrary: getOperationPngLibrary,
    resolveOperationPng: resolveOperationPng,
    selectMarkerArtwork: selectMarkerArtwork,
    registerFormationEvidence: registerFormationEvidence,
    resolveFormationEvidence: resolveFormationEvidence,
    clearFormationEvidenceOtherDates: clearFormationEvidenceOtherDates,
  };

  console.debug('[TrainVehicle] initialized（canonical EXACT/NARROWED/UNKNOWN vehicle identity contract）');
})();

})();
 
  /* 集成的日期运行与编组证据提供器。 */

(function() {
  "use strict";

  var SOURCE = "https://www.train.chokopy.net/unyo-search/Toyoko/2026-03-14/weekday";
  var EFFECTIVE = "2026-03-14";

  var weekday = {
    TOKYU:["001","002","003","004","005","006","007","008","009","010","011","012","013","014","015","016","017","018","019","020","021","022","023","024","025","026","027","028","029","030","031","051","052","053","054","055","056","057","058","059","060","061","062","063","064","065"],
    TokyoMetro:["701","702","703","704","705","707","709","711","713","715","717","719","723","725","729","731","733","741","745","747","753","763","767","771","775","777","779","781","785","787","789","791"],
    Seibu:["102","104","106","110","114","118","120","122","124","128","130","134"],
    Tobu:["803","805","813","819","821","823"],
    Sotetsu:["991","992","993","994","995"]
  };
  var holiday = {
    TOKYU:["001","002","003","004","005","006","007","008","009","010","011","012","013","014","015","016","017","018","019","020","021","022","023","024","051","052","053","054","055","056","057","058","059","060","061","062","063","064"],
    TokyoMetro:["701","702","703","704","705","707","709","711","713","717","719","723","725","729","731","733","739","743","745","747","749","753","755","757","761","767","773","775","785","787","789","791"],
    Seibu:["102","106","108","110","112","114","124","128","130","171","172","173","174","175"],
    Tobu:["803","805","811","813","817","819"],
    Sotetsu:["991","992","994"]
  };

  function serviceDay(dateText) {
    var d = new Date(String(dateText || EFFECTIVE).slice(0,10) + "T12:00:00+09:00");
    var day = d.getDay();
    return (day === 0 || day === 6) ? "holiday" : "weekday";
  }

  function operationCode(trainNumber) {
    var raw = String(trainNumber || "").toUpperCase().trim();
    // Metro/直通运行号形式，例如 A1291G、B691G、01K、21S。
    var suffix = raw.match(/(?:^|[^0-9])(?:A|B)?(\d{1,2})([KSMTG])$/);
    if (suffix) {
      var n = String(parseInt(suffix[1],10)).padStart(2,"0");
      var letter = suffix[2];
      if (letter === "K") return { operator:"TOKYU", code:n };
      if (letter === "S") return { operator:"TokyoMetro", code:n };
      if (letter === "M") return { operator:"Seibu", code:n };
      if (letter === "T") return { operator:"Tobu", code:n };
      if (letter === "G") return { operator:"Sotetsu", code:n };
    }
    // 东急六位数列车号将公开的三位运行号编码在
    // 前几位中，例如 991072 -> 运行号 991（91G）。
    var digits = raw.replace(/[^0-9]/g,"");
    if (digits.length >= 6) return { code:digits.slice(0,3) };
    if (digits.length === 3) return { code:digits };
    return null;
  }

  function inToyokoNetwork(ctx) {
    var s = [ctx.lineId,ctx.operator,ctx.railway,ctx.destinationStation].join("|");
    return /Fukutoshin|Yurakucho|Tokyu[._-]?Toyoko|Toyoko|Tokyu[._-]?ShinYokohama|ShinYokohama|Minatomirai|Sotetsu|Seibu|Tojo/i.test(s);
  }

  function resolveEvidence(trainNumber, ctx) {
    ctx = ctx || {};
    var date = String(ctx.serviceDate || "").slice(0,10);
    if (!date || date < EFFECTIVE || !inToyokoNetwork(ctx)) return null;
    var op = operationCode(trainNumber);
    if (!op) return null;

    var table = serviceDay(date) === "holiday" ? holiday : weekday;
    var owner = op.operator || "";
    if (!owner) {
      Object.keys(table).some(function(k) {
        if (table[k].indexOf(op.code) >= 0) { owner = k; return true; }
        return false;
      });
    }
    if (!owner) return null;

    // 后缀形式也必须在此时刻表中解析到已发布的运行号。
    // 不要让语法有效的 21S/99M 等绕过日期运行集合。
    if (op.operator) {
      var published = owner === "Sotetsu"
        ? ("9" + op.code)
        : ((owner === "TokyoMetro" ? "7" : owner === "Seibu" ? "1" :
            owner === "Tobu" ? "8" : "0") + op.code);
      if (table[owner].indexOf(published) < 0) return null;
      op.code = published;
    }

    var vehicleType = "";
    if (owner === "Sotetsu") {
      var sotetsuCode = op.code;
      if (table.Sotetsu.indexOf(sotetsuCode) < 0) return null;
      // 在日期运行表中，东横线 91G-95G 直通运行只对应 20000 系列；
      // 这是车型精确，不是编组精确。
      vehicleType = "相鉄20000系(10両)";
    }

    return {
      operator: owner,
      vehicleType: vehicleType,
      grade: "C",
      sourceUrl: SOURCE,
      provenance: "Chokopy 2026-03-14 Toyoko operation table",
      observedDate: date,
      operationCode: op.code
    };
  }

  var provider = {
    id:"chokopy-toyoko-20260314",
    grade:"C",
    sourceUrl:SOURCE,
    effectiveDate:EFFECTIVE,
    resolveEvidence:resolveEvidence
  };

  registerEvidenceProvider(provider);
})();

(function() {
  "use strict";
  var SOURCE="https://www.train.chokopy.net/unyo-search/Meguro/2026-03-14/weekday";
  var EFFECTIVE="2026-03-14";
  var groups={
    TOKYU:["201","202","204","205","207","208","209","210","211","212","213","214","215","216","217","218","220","221","222","223","225","226","227","229","230","231","233","234","236","238","240","241","243","246","247","248"],
    TokyoMetro:["330","332","334","336","338","340","342","344","346","350","352","354","356","360","362","364","366","368","370"],
    Toei:["421","423","425","431","433","435","437","439","441","443","445","447","449","451","453","455","457","459","461","463","465","467","469","471","473","475","477","479","481","483","485","487","489"],
    SaitamaRailway:["580","582","584","586","588","590","592","594","596"],
    Sotetsu:["631","632","633","635","637","638","639","642","643","644"]
  };
  function network(ctx){
    return /(?:^|[.:|_-])(?:Meguro|Namboku|Mita|Saitama|Sotetsu|ShinYokohama)(?:$|[.:|_-])/i.test(
      [ctx.lineId,ctx.operator,ctx.railway,ctx.destinationStation].join("|"));
  }
  function codeOf(n){
    var raw=String(n||"").toUpperCase().trim();
    var digits=raw.replace(/[^0-9]/g,"");
    if(digits.length>=6) return digits.slice(0,3);
    if(digits.length===3) return digits;
    return "";
  }
  function resolveEvidence(trainNumber,ctx){
    ctx=ctx||{};
    var date=String(ctx.serviceDate||"").slice(0,10);
    if(!date||date<EFFECTIVE||!network(ctx)) return null;
    var code=codeOf(trainNumber);
    if(!code)return null;
    var owner="";
    Object.keys(groups).some(function(k){
      if(groups[k].indexOf(code)>=0){owner=k;return true;}
      return false;
    });
    if(!owner)return null;
    // 三田线/南北线的 T 号是都营本线运行；同一数字在相铁运用表中
    // 可能重复出现，不能仅凭去掉后缀后的数字把都营车改成相铁车。
    if(owner==="Sotetsu" && /^(?:Mita|Namboku)$/.test(String(ctx.lineId||"")) && /T(?:[1-5]|[AB])?$/.test(String(trainNumber||"").toUpperCase())) return null;
    return {
      operator:owner,
      vehicleType:owner==="Sotetsu" ? "相鉄21000系(8両)" : "",
      grade:"C",
      sourceUrl:SOURCE,
      provenance:"Chokopy 2026-03-14 Meguro operation table; Sotetsu official fleet constraint for 21000",
      observedDate:date,
      operationCode:code
    };
  }
  var provider={id:"chokopy-meguro-20260314",grade:"C",sourceUrl:SOURCE,effectiveDate:EFFECTIVE,resolveEvidence:resolveEvidence};
  registerEvidenceProvider(provider);
})();

(function() {
  "use strict";
  var SOURCE="https://www.train.chokopy.net/unyo/tables/dt_20260314.html";
  var EFFECTIVE="2026-03-14";

  function network(ctx){
    return /Denentoshi|Hanzomon|Isesaki|Skytree|Tobu|田園都市|半蔵門/i.test(
      [ctx.lineId,ctx.operator,ctx.railway,ctx.destinationStation].join("|"));
  }

  function parseOperation(trainNumber){
    var raw=String(trainNumber||"").toUpperCase().trim();
    // Explicit working-number form: 26K / 57S / 50T, optionally prefixed A/B.
    var m=raw.match(/(?:^|[^0-9])(?:A|B)?(\d{1,2})([KST])$/);
    if(m) return {number:parseInt(m[1],10),letter:m[2]};
    return null;
  }

  function resolveEvidence(trainNumber,ctx){
    ctx=ctx||{};
    var date=String(ctx.serviceDate||"").slice(0,10);
    if(!date||date<EFFECTIVE||!network(ctx)) return null;
    var op=parseOperation(trainNumber);
    if(!op)return null;
    var owner=op.letter==="K"?"TOKYU":(op.letter==="S"?"TokyoMetro":"Tobu");
    return {
      operator:owner,
      // 运营方所属是结构约束；车型需要日期运行证据。
      vehicleType:"",
      grade:"C",
      sourceUrl:SOURCE,
      provenance:"Chokopy 2026-03-14 Denentoshi operation table",
      observedDate:date,
      operationCode:String(op.number).padStart(2,"0")+op.letter
    };
  }

  var provider={id:"chokopy-denentoshi-20260314",grade:"C",sourceUrl:SOURCE,effectiveDate:EFFECTIVE,resolveEvidence:resolveEvidence};
  registerEvidenceProvider(provider);
})();

(function(){"use strict";
var SOURCE="https://loo-ool.com/rail/MZ/";
var rows={"2026-04-18":{
"01K":["東急5000系(10両)","500008F"],"05K":["東急5000系(10両)","500010F"],
"06K":["東急2020系(10両)","202040F"],"07K":["東急2020系(10両)","202024F"],
"08K":["東急2020系(10両)","202045F"],"10K":["東急2020系(10両)","202029F / 202009F"],
"12K":["東急2020系(10両)","202041F"],"13K":["東急5000系(10両)","500017F"],
"14K":["東急2020系(10両)","202046F"],"15K":["東急2020系(10両)","202025F"],
"17K":["東急5000系(10両)","500012F"],"19K":["東急5000系(10両)","500005F"],
"21K":["東急2020系(10両)","202042F"],"22K":["東急5000系(10両)","500014F"],
"25K":["東急5000系(10両)","500020F"],"26K":["東急5000系(10両)","500002F"],
"50T":["東武50050系(10両)","5005065F"],"52T":["東武50050系(10両)","5005052F"],
"58T":["東武50050系(10両)","5005057F"],"60T":["東武50050系(10両)","5005066F"],
"62T":["東武50050系(10両)","5005062F"],"66T":["東武50000系(10両)","5000009F"],
"68T":["東武50050系(10両)","5005055F"],"74T":["東武50050系(10両)","5005059F"]
}};
function code(n){var m=String(n||"").toUpperCase().match(/(?:^|[^0-9])((?:[0-4][0-9]K|(?:5[0-9]|6[0-9]|7[0-9]|8[0-2])T))(?:[^0-9A-Z]|$)/);return m?m[1]:"";}
function network(ctx){return /DenEn|Denentoshi|Hanzomon|Tobu|田園都市|半蔵門/i.test([ctx.lineId,ctx.railway,ctx.destinationStation].join("|"));}
function resolveEvidence(trainNumber,ctx){ctx=ctx||{};if(!network(ctx))return null;
 var d=String(ctx.serviceDate||"").slice(0,10),r=rows[d]&&rows[d][code(trainNumber)];if(!r)return null;
 return {operator:"Tokyu",vehicleType:r[0],formationId:r[1],grade:"C",sourceUrl:SOURCE,
 provenance:"loo-ool dated Den-en-toshi/Hanzomon operation observation",observedDate:d};}
registerEvidenceProvider({id:"denentoshi-dated-formations",grade:"C",resolveEvidence:resolveEvidence});
})();

(function(){
  "use strict";
  var SOURCE_BASE="https://loo-ool.com/rail/MZ/00/";
  var rows={
    "2026-04-13":{
      "57S":{vehicleType:"東京メトロ18000系",formationId:"18110F / 18109F"},
      "63S":{vehicleType:"東京メトロ18000系",formationId:"18101F"},
      "65S":{vehicleType:"東京メトロ08系",formationId:"0854F"},
      "79S":{vehicleType:"東京メトロ8000系",formationId:"8109F"}
    }
  };
  function network(ctx){
    return /Denentoshi|Hanzomon|田園都市|半蔵門/i.test(
      [ctx.lineId,ctx.operator,ctx.railway,ctx.destinationStation].join("|"));
  }
  function opCode(trainNumber){
    var raw=String(trainNumber||"").toUpperCase();
    var m=raw.match(/(?:^|[^0-9])(?:A|B)?(\d{1,2})S$/);
    if(m)return String(parseInt(m[1],10)).padStart(2,"0")+"S";
    var p=raw.match(/^(\d{3})[-_]/);
    if(p){
      var n=parseInt(p[1],10);
      if(n>=51&&n<=93&&n%2===1)return String(n).padStart(2,"0")+"S";
    }
    return "";
  }
  function resolveEvidence(trainNumber,ctx){
    ctx=ctx||{};
    var date=String(ctx.serviceDate||"").slice(0,10);
    if(!network(ctx)||!rows[date])return null;
    var op=opCode(trainNumber);
    var rec=rows[date][op];
    if(!rec)return null;
    return {
      operator:"TokyoMetro",
      vehicleType:rec.vehicleType,
      formationId:rec.formationId,
      grade:"C",
      sourceUrl:SOURCE_BASE+date.replace(/-/g,"")+"/",
      provenance:"loo-ool dated Hanzomon/Denentoshi operation observation",
      observedDate:date,
      operationCode:op
    };
  }
  var provider={id:"loo-ool-hanzomon-dated-formations",grade:"C",sourceUrl:SOURCE_BASE,resolveEvidence:resolveEvidence};
  registerEvidenceProvider(provider);
})();

(function(){
  "use strict";
  var BASE="https://www.loo-ool.com/rail/A/00/";
  var rows={
    "2026-04-03":{
      "77":{vehicleType:"相鉄12000系",formationId:"12104F"},
      "81":{vehicleType:"東京臨海高速鉄道70-000形",formationId:"Z2"},
      "83":{vehicleType:"東京臨海高速鉄道70-000形",formationId:"Z7"},
      "85":{vehicleType:"東京臨海高速鉄道71-000形",formationId:"Z12"},
      "87":{vehicleType:"東京臨海高速鉄道70-000形",formationId:"Z1"},
      "89":{vehicleType:"東京臨海高速鉄道71-000形",formationId:"Z11"},
      "91":{vehicleType:"東京臨海高速鉄道70-000形",formationId:"Z3"}
    },
    "2026-04-04":{
      "81":{vehicleType:"東京臨海高速鉄道70-000形",formationId:"Z2"},
      "83":{vehicleType:"東京臨海高速鉄道70-000形",formationId:"Z7"},
      "85":{vehicleType:"東京臨海高速鉄道71-000形",formationId:"Z12"},
      "87":{vehicleType:"東京臨海高速鉄道70-000形",formationId:"Z1"},
      "89":{vehicleType:"東京臨海高速鉄道71-000形",formationId:"Z11"},
      "91":{vehicleType:"東京臨海高速鉄道70-000形",formationId:"Z3"}
    }
  };
  function network(ctx){
    return /Saikyo|Kawagoe|Rinkai|Sotetsu|埼京|川越|りんかい|相鉄/i.test(
      [ctx.lineId,ctx.operator,ctx.railway,ctx.destinationStation].join("|"));
  }
  function code(n){
    var raw=String(n||"").toUpperCase();
    var m=raw.match(/(?:^|[^0-9])(\d{2})(?:K|M)?$/);
    if(m)return m[1];
    return "";
  }
  function resolveEvidence(trainNumber,ctx){
    ctx=ctx||{}; var date=String(ctx.serviceDate||"").slice(0,10);
    if(!network(ctx)||!rows[date])return null;
    var c=code(trainNumber),rec=rows[date][c]; if(!rec)return null;
    var owner=/12000/.test(rec.vehicleType)?"Sotetsu":"TWR";
    return {operator:owner,vehicleType:rec.vehicleType,formationId:rec.formationId,grade:"C",
      sourceUrl:BASE+date.replace(/-/g,"")+"/",
      provenance:"loo-ool dated Saikyo/Rinkai/Sotetsu operation observation",
      observedDate:date,operationCode:c};
  }
  var provider={id:"loo-ool-saikyo-dated-formations",grade:"C",sourceUrl:BASE,resolveEvidence:resolveEvidence};
  registerEvidenceProvider(provider);
})();

(function(){
  "use strict";
  var SOURCE="https://loo-ool.com/rail/MA/";
  var EFFECTIVE="2026-03-14";
  function network(ctx){
    return /Asakusa|Keikyu|Keisei|Hokuso|NaritaSkyAccess|浅草|京急|京成|北総|成田空港/i.test(
      [ctx.lineId,ctx.operator,ctx.railway,ctx.destinationStation].join("|"));
  }
  function op(n){
    var raw=String(n||"").toUpperCase().trim();
    // ODPT 使用完整服务号，例如 1849T；来源运行
    // 表使用末两位数字（49T）。不要从
    // 前导服务/小时数字推断车型。
    var m=raw.match(/^(?:A|B)?\d{0,2}(\d{2})([TKNH])(?:\([^)]*\))?$/);
    return m?{number:parseInt(m[1],10),letter:m[2]}:null;
  }
  function resolveEvidence(trainNumber,ctx){
    ctx=ctx||{}; var date=String(ctx.serviceDate||"").slice(0,10);
    if(!date||date<EFFECTIVE||!network(ctx))return null;
    var x=op(trainNumber); if(!x)return null;
    var owner=x.letter==="T"?"Toei":x.letter==="K"?"Keisei":x.letter==="H"?"Keikyu":"Hokuso";
    return {
      operator:owner,
      vehicleType:x.letter==="T"?"都営5500形":"",
      grade:"C",sourceUrl:SOURCE,
      provenance:"loo-ool Asakusa four-company operation table; Toei current fleet cross-check",
      observedDate:date,operationCode:String(x.number).padStart(2,"0")+x.letter,
      evidenceRole:"operation-family"
    };
  }
  var provider={id:"loo-ool-asakusa-operation-families-2026",grade:"C",sourceUrl:SOURCE,effectiveDate:EFFECTIVE,resolveEvidence:resolveEvidence};
  registerEvidenceProvider(provider);
})();

(function(){
"use strict";
var BASE="https://loo-ool.com/rail/MA/00/";
var rows={
 "2026-04-12":{
  "15H":["京急1000形","1161F"],"21H":["京急1000形","1201F"],
  "73H":["京急600形","607F"],"81H":["京急600形","601F"],"85H":["京急600形","603F"],
  "61H":["京急1500形","1713F"],
  "01K":["京成3100形","3154F"],"03K":["京成3100形","3152F / 3153F"],
  "05K":["京成3100形","3156F"],"07K":["京成3100形","3153F"],
  "09K":["京成3100形","3151F"],"11K":["京成3100形","3155F"],
  "51K":["京成3000形","3026F / 3037F"],"53K":["京成3000形","3001F"],
  "55K":["京成3000形","3001F"],"59K":["京成3000形","3052F"],
  "69K":["京成3400形","3448F"],"57K":["京成3700形","3758F"],
  "63K":["京成3700形","3868F"],"67K":["京成3700形","3798F"],
  "73K":["京成3700形","3728F"]
 }
};
function network(c){return /Asakusa|Keikyu|Keisei|Hokuso|浅草|京急|京成|北総/i.test([c.lineId,c.operator,c.railway,c.destinationStation].join("|"));}
function code(n){var m=String(n||"").toUpperCase().match(/(?:^|[^0-9])(\d{1,2})([KHN])(?:\([^)]*\))?$/);return m?String(parseInt(m[1],10)).padStart(2,"0")+m[2]:"";}
function resolveEvidence(n,c){
 c=c||{};var d=String(c.serviceDate||"").slice(0,10);if(!network(c)||!rows[d])return null;
 var o=code(n),r=rows[d][o];if(!r)return null;
 var owner=o.endsWith("H")?"Keikyu":o.endsWith("K")?"Keisei":"Hokuso";
 return {operator:owner,vehicleType:r[0],formationId:r[1],grade:"C",sourceUrl:BASE+d.replace(/-/g,"")+"/",provenance:"loo-ool dated Asakusa operation observation",observedDate:d,operationCode:o};
}
var p={id:"loo-ool-asakusa-dated-formations",grade:"C",sourceUrl:BASE,resolveEvidence:resolveEvidence};
registerEvidenceProvider(p);
})();

(function(){"use strict";
var SOURCE="https://yacchann.blog13.fc2.com/?cat=21";
var rows={
 "2026-09-08":{
  "01":"1502F","02":"1503F","03":"1020F","04":"1019F","05":"7113F","06":"7104F",
  "07":"1522F","08":"7109F","09":"7101F","10":"7111F","11":"7106F","12":"1507F",
  "13":"1017F","14":"7114F","15":"7110F","16":"1523F","17":"1013F","18":"7107F",
  "19":"1012F","20":"7108F"
 },
 "2026-09-21":{"01":"7113F","02":"7108F","03":"7112F","04":"7105F","05":"1524F","06":"1522F","07":"7114F","08":"1502F","09":"1013F","10":"7102F","21":"7104F","22":"7107F","23":"1012F","24":"7109F","25":"1017F"},
 "2026-09-22":{"01":"7104F","02":"7112F","03":"1507F","04":"1524F","05":"7113F","06":"1017F","07":"1502F","08":"7108F","09":"7102F","10":"1505F","21":"7109F","22":"1522F","23":"7107F","24":"7114F","25":"7105F"},
 "2026-09-23":{"01":"7104F","02":"7105F","03":"7108F","04":"7114F","05":"1505F","06":"7107F","07":"1522F","09":"1017F","10":"7109F","21":"1502F","22":"7113F","23":"7102F","24":"1503F","25":"7112F"},
 "2026-09-24":{"01":"1507F","02":"1508F","03":"7110F","05":"1524F","06":"1505F","21":"7114F","22":"7101F","23":"1017F","24":"7108F","26":"7105F","27":"7107F","28":"1012F"},
 "2026-09-25":{"01":"1021F","02":"1501F","03":"1507F","05":"1505F","06":"1523F","21":"1503F","22":"7113F","23":"7101F","24":"1522F","26":"1508F","27":"7108F","28":"7107F"},
 "2026-09-26":{"01":"7114F","02":"7107F","03":"1523F","04":"1020F","05":"1507F","06":"1503F","07":"1504F","08":"1508F","09":"7104F","10":"7101F","21":"1522F","22":"1502F","23":"7113F","24":"1501F","25":"7102F"},
 "2026-09-27":{"01":"1522F","02":"1523F","03":"7104F","04":"1507F","05":"7108F","06":"7102F","07":"1508F","08":"7115F","09":"7101F","10":"1504F","21":"1501F","22":"7113F","23":"1502F","24":"1505F","25":"1020F"},
 "2026-09-19":{"03":"1501F","04":"7102F","05":"1017F","06":"1012F","07":"7107F","08":"1507F","09":"1502F","10":"1503F","21":"1505F","22":"7110F","24":"7113F","25":"1013F"},
 "2026-09-20":{"01":"1505F","02":"1501F","03":"7108F","04":"1017F","05":"7105F","06":"7107F","07":"1507F","08":"7114F","09":"1503F","10":"1013F","21":"7113F","22":"1012F","23":"7110F","24":"7104F","25":"7102F"}
};
var ambiguous={"2026-09-23":{"08":["1013F","1507F"]}};
function opNo(n){var m=String(n||"").match(/(?:^|[^0-9])(0[1-9]|1[0-9]|2[0-9])(?:[^0-9]|$)/);return m?m[1]:"";}
function model(f){if(/^7/.test(f))return "東急7000系";if(/^(15|152)/.test(f))return "東急1000系1500番台";if(/^10/.test(f))return "東急1000系";return "";}
function resolveEvidence(trainNumber,ctx){
 ctx=ctx||{};var hay=[ctx.lineId,ctx.railway].join("|");
 if(!/TokyuIkegami|TokyuTamagawa|Ikegami|池上|東急多摩川/i.test(hay))return null;
 var d=String(ctx.serviceDate||"").slice(0,10),n=opNo(trainNumber),f=rows[d]&&rows[d][n],amb=ambiguous[d]&&ambiguous[d][n];
 if(amb){
  var vs={};amb.forEach(function(x){var m=model(x);if(m)vs[m]=true;});
  var models=Object.keys(vs);
  if(models.length!==1)return null;
  return {operator:"TOKYU",vehicleType:models[0],formationId:amb.join(" / "),grade:"C",sourceUrl:SOURCE,
   provenance:"dated Ikegami/Tamagawa operation observation; intra-day formation change",observedDate:d};
 }
 if(!f)return null;var v=model(f);if(!v)return null;
 return {operator:"TOKYU",vehicleType:v,formationId:f,grade:"C",sourceUrl:SOURCE,
  provenance:"dated Ikegami/Tamagawa operation observation",observedDate:d};
}
registerEvidenceProvider({id:"tokyu-iketama-dated-formations",grade:"C",resolveEvidence:resolveEvidence});
})();

(function(){"use strict";
var SOURCE="https://loo-ool.com/rail/OM/";
var rows={
"2026-04-15":{
 "101":["東急9000系","900015F"],"102":["東急6020系(5両)","602055F"],
 "103":["東急9020系","902021F"],"104":["東急9000系","900006F"],
 "105":["東急6020系(5両)","602058F"],"106":["東急6020系(5両)","602059F"],
 "107":["東急6020系(5両)","602054F"],"108":["東急6020系(5両)","602051F"],
 "109":["東急9000系","900014F"],"110":["東急9000系","900004F"],
 "114":["東急9000系","900008F"],"115":["東急6020系(5両)","602057F"],
 "116":["東急6020系(5両)","602056F"],"132":["東急6020系(7両)","602022F"],
 "134":["東急6000系","600003F"],"135":["東急6000系","600004F"],
 "137":["東急6000系","600006F"]
},"2026-04-16":{
 "101":["東急9020系","902021F"],"102":["東急9000系","900008F"],
 "103":["東急6020系(5両)","602055F"],"104":["東急9000系","900001F"],
 "105":["東急9000系","900013F"],"106":["東急6020系(5両)","602053F"],
 "107":["東急6020系(5両)","602059F"],"108":["東急6020系(5両)","602054F"],
 "109":["東急6020系(5両)","602057F"],"110":["東急9000系","900014F"],
 "111":["東急9020系","902022F"],"112":["東急9000系","900015F"],
 "114":["東急6020系(5両)","602051F"],"115":["東急6020系(5両)","602052F"],
 "116":["東急6020系(5両)","602058F"],"132":["東急6000系","600001F"],
 "133":["東急6020系(7両)","602022F"],"134":["東急6000系","600005F"],
 "135":["東急6000系","600003F"],"136":["東急6000系","600004F"]
}};
function opNo(n){var m=String(n||"").match(/(?:^|[^0-9])(1(?:0[1-9]|1[0-6]|3[1-7]))(?:[^0-9]|$)/);return m?m[1]:"";}
function resolveEvidence(trainNumber,ctx){
 ctx=ctx||{};var hay=[ctx.lineId,ctx.railway].join("|");
 if(!/TokyuOimachi|Oimachi|大井町/i.test(hay))return null;
 var d=String(ctx.serviceDate||"").slice(0,10),op=opNo(trainNumber),r=rows[d]&&rows[d][op];
 if(!r)return null;
 return {operator:"TOKYU",vehicleType:r[0],formationId:r[1],grade:"C",sourceUrl:SOURCE,
 provenance:"dated Oimachi operation observation",observedDate:d};
}
registerEvidenceProvider({id:"tokyu-oimachi-dated-formations",grade:"C",resolveEvidence:resolveEvidence});
})();

(function(){"use strict";
var SOURCE="https://loo-ool.com/rail/SA/00/20250604/";
var rows={"2026-04-08":{
"11":["相鉄10000系(8両)","10703F"],"12":["相鉄13000系(8両)","13101F"],
"15":["相鉄10000系(8両)","10705F"],"50":["相鉄9000系(10両)","9706F"],
"51":["相鉄8000系(10両)","8713F"],"52":["相鉄9000系(10両)","9705F"],
"54":["相鉄9000系(10両)","9704F"],"55":["相鉄11000系(10両)","11001F"],
"56":["相鉄8000系(10両)","8708F"],"58":["相鉄11000系(10両)","11004F"],
"62":["相鉄11000系(10両)","11005F"],"64":["相鉄9000系(10両)","9707F"],
"65":["相鉄10000系(10両)","10701F"],"67":["相鉄11000系(10両)","11003F"],
"68":["相鉄9000系(10両)","9702F"],"70":["相鉄12000系(10両)","12101F"],
"71":["相鉄12000系(10両)","12104F"],"72":["相鉄12000系(10両)","12103F"],
"73":["相鉄12000系(10両)","12106F"],"91G":["相鉄20000系(10両)","20104F"],
"93G":["相鉄20000系(10両)","20102F"],"94G":["相鉄20000系(10両)","20101F"],
"95G":["相鉄20000系(10両)","20105F"]
}};
function code(n){var m=String(n||"").toUpperCase().match(/^(?:([1-8][0-9])|(9[1-5]G)|([0-9]{2}K))$/);return m?(m[1]||m[2]||m[3]):"";}
function resolveEvidence(trainNumber,ctx){ctx=ctx||{};var line=[ctx.lineId,ctx.railway].filter(Boolean).join("|");
 if(line&&!/Sotetsu|相鉄/i.test(line))return null;
 if(!line&&!/Sotetsu|相鉄/i.test(String(ctx.operator||"")))return null;
 var d=String(ctx.serviceDate||"").slice(0,10),r=rows[d]&&rows[d][code(trainNumber)];if(!r)return null;
 return {operator:"Sotetsu",vehicleType:r[0],formationId:r[1],grade:"C",sourceUrl:SOURCE,
 provenance:"dated Sotetsu operation observation",observedDate:d};}
registerEvidenceProvider({id:"sotetsu-dated-formations",grade:"C",resolveEvidence:resolveEvidence});
})();

(function(){
"use strict";
var BASE="https://loo-ool.com/rail/MH/00/";
var rows={
 "2026-04-16":{
  "02S":["東京メトロ13000系","1300086F"],
  "04S":["東京メトロ13000系","1300094F"],
  "06S":["東京メトロ13000系","1300093F"],
  "24S":["東京メトロ13000系","1300084F / 1300081F"],
  "60S":["東京メトロ13000系","1300051F"],
  "66S":["東武70000系","7000012F"],
  "01T":["東武70000系","7000007F"],
  "03T":["東武70000系","7000011F"],
  "05T":["東武70000系","7000005F"],
  "07T":["東武70000系","7000016F"],
  "21T":["東京メトロ13000系","1300059F"],
  "27T":["東武70090型","7009092F"],
  "41T":["東武70090型","7009091F"],
  "43T":["東武70090型","7009096F"],
  "45T":["東武70090型","7009094F"],
  "47T":["東武70090型","7009093F"]
 }
};
function network(c){return /Hibiya|Skytree|Isesaki|日比谷|スカイツリー|伊勢崎/i.test([c.lineId,c.operator,c.railway,c.destinationStation].join("|"));}
function code(n){var m=String(n||"").toUpperCase().match(/(?:^|[^0-9])(\d{1,2})([ST])$/);return m?String(parseInt(m[1],10)).padStart(2,"0")+m[2]:"";}
function resolveEvidence(n,c){
 c=c||{};var d=String(c.serviceDate||"").slice(0,10);if(!network(c)||!rows[d])return null;
 var o=code(n),r=rows[d][o];if(!r)return null;
 var owner=/^東武/.test(r[0])?"Tobu":"TokyoMetro";
 return {operator:owner,vehicleType:r[0],formationId:r[1],grade:"C",sourceUrl:BASE+d.replace(/-/g,"")+"/",provenance:"loo-ool dated Hibiya operation observation",observedDate:d,operationCode:o};
}
var p={id:"loo-ool-hibiya-dated-formations",grade:"C",sourceUrl:BASE,resolveEvidence:resolveEvidence};
registerEvidenceProvider(p);
})();

  // 京叶线运行证据
(function(){"use strict";
var SOURCE="https://loo-ool.com/rail/B/";
var rows={
 "2026-04-01":{"01":"233","03":"233","05":"233","09":"233","11":"233","15":"233","17":"233","19":"209","21":"233","23":"233","25":"233","27":"233","29":"233","31":"233","33":"233","35":"233","37":"233","83":"233"},
 "2026-04-14":{"01":"233","03":"233","05":"233","09":"233","11":"233","15":"233","17":"233","19":"233","21":"233","23":"233","25":"233","27":"233","29":"233","31":"233","33":"233","35":"233","37":"209","81":"233"},
 "2026-10-24":{
  // Loo-ool 的节假日运行列表对
  // 京叶线 A/Y 任务使用裸运行号。公开 ODPT 列车号会追加 A/Y 后缀，因此
  // 下方 resolveEvidence 只对 A/Y 合并这些记录，绝不对武藏野线
  // through E duties.
  "03":["JR E233系5000番台","103"],"07":["JR E233系5000番台","515"],
  "09":["JR E233系5000番台","554 / F54"],"11":["JR E233系5000番台","502"],
  "15":["JR E233系5000番台","506"],"17":["JR E233系5000番台","507"],
  "21":["JR E233系5000番台","501"],"23":["JR E233系5000番台","511"],
  "27":["JR E233系5000番台","512"],"29":["JR E233系5000番台","516"],
  "31":["JR E233系5000番台","509"],"33":["JR E233系5000番台","519"],
  "35":["JR E233系5000番台","520"],"37":["JR E233系5000番台","513"],
  "11Y":["JR E233系5000番台","502"],
  "03Y":["JR E233系5000番台","103"],"07Y":["JR E233系5000番台","515"],
  "09Y":["JR E233系5000番台","554 / F54"],"15Y":["JR E233系5000番台","506"],
  "17Y":["JR E233系5000番台","507"],"21Y":["JR E233系5000番台","501"],
  "23Y":["JR E233系5000番台","511"],"27Y":["JR E233系5000番台","512"],
  "29Y":["JR E233系5000番台","516"],"31Y":["JR E233系5000番台","509"],
  "33Y":["JR E233系5000番台","519"],"35Y":["JR E233系5000番台","520"],
  "37Y":["JR E233系5000番台","513"]
 }
};
var calendarRows={weekday:{},holiday:{
 "03E":["E231系0番台（武蔵野線）","MU38"],"05E":["E231系0番台（武蔵野線）","MU16"],
 "07E":["E231系0番台（武蔵野線）","MU5"],"09E":["E231系0番台（武蔵野線）","MU22"],
 "11E":["209系500番台（武蔵野線）","M71"],"13E":["E231系0番台（武蔵野線）","MU20"],
 "17E":["E231系0番台（武蔵野線）","MU36"],"19E":["209系500番台（武蔵野線）","M74"],
 "25E":["209系500番台（武蔵野線）","M83"],"31E":["E231系0番台（武蔵野線）","MU34"],
 "33E":["E231系0番台（武蔵野線）","MU18"],"35E":["E231系0番台（武蔵野線）","MU6"],
 "37E":["209系500番台（武蔵野線）","M73"],"39E":["E231系0番台（武蔵野線）","MU2"],
 "41E":["E231系0番台（武蔵野線）","MU35"],"43E":["E231系0番台（武蔵野線）","MU41"],
 "45E":["E231系0番台（武蔵野線）","MU33"],"47E":["E231系0番台（武蔵野線）","MU17"],
 "51E":["E231系0番台（武蔵野線）","MU13"],"53E":["E231系0番台（武蔵野線）","MU12"],
 "59E":["E231系0番台（武蔵野線）","MU21"],"63E":["E231系0番台（武蔵野線）","MU42"],
 "67E":["209系500番台（武蔵野線）","M84"],"69E":["E231系0番台（武蔵野線）","MU15"],
 "73E":["E231系0番台（武蔵野線）","MU39"],"75E":["209系500番台（武蔵野線）","M81"],
 "77E":["E231系0番台（武蔵野線）","MU7"],"79E":["E231系0番台（武蔵野線）","MU10"],
 "81E":["E231系0番台（武蔵野線）","MU19"],"83E":["E231系0番台（武蔵野線）","MU14"]
}};
var currentMusashinoRows=Object.assign({},calendarRows.holiday);
function serviceDay(date){
 var d=new Date(String(date||"")+"T12:00:00Z"),day=d.getUTCDay();
 return day===0||day===6?"holiday":"weekday";
}
function opNo(n,ctx){
 var raw=String((ctx&&ctx.operationCode)||n||"").toUpperCase().trim();
 if(/^\d{1,2}$/.test(raw))return String(parseInt(raw,10)).padStart(2,"0");
 // 京叶线公开列车号通常为四位数（例如 1219A），
 // 而 Loo-ool 运行表使用末两位运行号（19）。
 // 同时接受公开列车号和已规范化的 19A 形式。
 var m=raw.match(/(?:^|[^0-9])(?:[0-9]{1,2})?([0-9]{2})([AYE])(?:R)?(?:[^0-9A-Z]|$)/);
 return m ? m[1] : "";
}
function resolveEvidence(trainNumber,ctx){
 ctx=ctx||{};var hay=[ctx.lineId,ctx.railway].join("|");
 if(!/Keiyo|Musashino|京葉|武蔵野/i.test(hay))return null;
 var d=String(ctx.serviceDate||"").slice(0,10),raw=String((ctx&&ctx.operationCode)||trainNumber||"").toUpperCase().trim();
 var current=raw.match(/(?:^|[^0-9])([0-9]{2})([AYE])(?:R)?$/);
 var k=current?current[1]+current[2]:opNo(trainNumber,ctx);
 var bare=current&&current[2]!=="E"?current[1]:"";
 var isRealtimeObservation=ctx.positionSource==="realtime-api";
 var isRealtimeResolution=ctx._realtimeVehicleResolution===true;
 var sourceRows=(d==="2026-10-24"&&isRealtimeResolution&&!isRealtimeObservation)?{}:(rows[d]||{}),
  calendar=serviceDay(d),dayRows=calendarRows[calendar]||{};
 var musashinoRows=isRealtimeObservation&&d==="2026-10-24"?currentMusashinoRows:{};
 var v=sourceRows[k]||(bare&&sourceRows[bare])||musashinoRows[k]||(bare&&musashinoRows[bare])||dayRows[k]||(bare&&dayRows[bare]);
 if(!v)return null;
 var model=Array.isArray(v)?v[0]:(v==="209"?"JR 209系500番台":"JR E233系5000番台");
 var sourceOperation=Array.isArray(v)&&bare&&(sourceRows[bare]===v||dayRows[bare]===v)?bare:k;
 var isMusashino=Array.isArray(v)&&/E$/.test(k)&&/武蔵野線/.test(model);
 var fromCalendar=!sourceRows[k]&&!(bare&&sourceRows[bare])&&!musashinoRows[k]&&!(bare&&musashinoRows[bare]);
 var result={operator:"JR-East",vehicleType:model,formationId:Array.isArray(v)?v[1]:"",operationCode:k,
  grade:"C",sourceUrl:isMusashino
   ? "https://loo-ool.com/rail/M/22/"+d.replace(/-/g,"")+"/?U="+sourceOperation
   : SOURCE+"23/"+d.replace(/-/g,"")+"/?U="+sourceOperation,
  provenance:fromCalendar?calendar+" Musashino operation observation":"dated Keiyo operation observation"};
 if(!fromCalendar)result.observedDate=d;
 return result;
}
function resolveCalendarReference(trainNumber,ctx){
 var rec=resolveEvidence(trainNumber,ctx);
 if(!rec||rec.observedDate)return null;
 return {operator:rec.operator,vehicleType:rec.vehicleType,operationCode:rec.operationCode,
  grade:"C",sourceUrl:rec.sourceUrl,observedDate:"",evidenceRole:"timetable-reference",
  provenance:"published "+serviceDay(String(ctx&&ctx.serviceDate||""))+" Musashino operation reference"};
}
registerEvidenceProvider({id:"jr-keiyo-dated-operations",grade:"C",resolveEvidence:resolveEvidence});
registerEvidenceProvider({id:"jr-musashino-calendar-reference",grade:"C",resolveEvidence:resolveCalendarReference});
})();

(function(){"use strict";
var SOURCE="https://loo-ool.com/rail/MT/";
function op(n){var m=String(n||"").toUpperCase().match(/(?:^|[^0-9A-Z])((?:0[3579]|11)K|(?:50|52|54|56|58|60|62|64|66|68)T|(?:0[2]|1[3579]|2[13579]|3[13579]|4[13579]|5[13579]|6[13579]|7[13579]|8[13579]|9[1357])S)(?:[^0-9A-Z]|$)/);return m?m[1]:"";}
function publicOp(n){var raw=String(n||"").toUpperCase().trim(),m=raw.match(/(\d{1,2})([KST])(?:R)?$/);if(!m)return "";var code=String(parseInt(m[1],10)).padStart(2,"0")+m[2];return /^(?:0[3579]|11)K$|^(?:50|52|54|56|58|60|62|64|66|68)T$|^(?:02|1[3579]|2[13579]|3[13579]|4[13579]|5[13579]|6[13579]|7[13579]|8[13579]|9[1357])S$/.test(code)?code:"";}
function resolveEvidence(trainNumber,ctx){
 ctx=ctx||{};var hay=[ctx.lineId,ctx.railway].join("|");
 if(!/Tozai|ChuoSobu|ToyoRapid|東西|中央.*総武|東葉/i.test(hay))return null;
 var k=String(ctx.operationCode||publicOp(trainNumber)||"").toUpperCase();if(!/^(?:0[3579]|11)K$|^(?:50|52|54|56|58|60|62|64|66|68)T$|^(?:02|1[3579]|2[13579]|3[13579]|4[13579]|5[13579]|6[13579]|7[13579]|8[13579]|9[1357])S$/.test(k))return null;
 var suffix=k.slice(-1);
 if(suffix==="K")return {operator:"JR-East",vehicleType:"JR E231系800番台(10両)",operationCode:k,grade:"C",sourceUrl:SOURCE,provenance:"Tozai operation ownership / fleet constraint",observedDate:"2026-04-16"};
 if(suffix==="T"&&k==="52T"&&String(ctx.serviceDate||"").slice(0,10)==="2026-10-24")return null;
 if(suffix==="T")return {operator:"ToyoRapid",vehicleType:"東葉高速2000系(10両)",operationCode:k,grade:"C",sourceUrl:SOURCE,provenance:"Tozai operation ownership / fleet constraint",observedDate:"2026-04-16"};
 return {operator:"TokyoMetro",operationCode:k,grade:"C",sourceUrl:SOURCE,provenance:"Tozai operation ownership; Metro fleet remains multi-model",observedDate:"2026-04-16"};
}
registerEvidenceProvider({id:"tozai-operation-ownership-2026",grade:"C",resolveEvidence:resolveEvidence});
})();

(function(){"use strict";
var SOURCE="https://loo-ool.com/rail/MT/";
var rows={"2026-04-16":{
 "02S":["東京メトロ15000系(10両)","1500064F"],
 "19S":["東京メトロ05系(10両)","0522F"],
 "21S":["東京メトロ15000系(10両)","1500062F"],
 "25S":["東京メトロ05系(10両)","0520F"],
 "27S":["東京メトロ05系(10両)","0515F"],
 "31S":["東京メトロ05系(10両)","0531F"],
 "35S":["東京メトロ07系(10両)","0772F"],
 "37S":["東京メトロ05系(10両)","0521F"],
 "39S":["東京メトロ05系(10両)","0534F"],
 "43S":["東京メトロ05系(10両)","0524F"],
 "53S":["東京メトロ15000系(10両)","1500058F"],
 "55S":["東京メトロ05系(10両)","0541F"],
 "57S":["東京メトロ05系(10両)","0532F"],
 "65S":["東京メトロ05系(10両)","0538F"],
 "69S":["東京メトロ05系(10両)","0543F"],
 "71S":["東京メトロ15000系(10両)","1500061F"],
 "75S":["東京メトロ07系(10両)","0774F"],
 "77S":["東京メトロ15000系(10両)","1500057F"],
 "79S":["東京メトロ07系(10両)","0776F"],
 "81S":["東京メトロ07系(10両)","0775F"],
 "85S":["東京メトロ05系(10両)","0537F"],
 "87S":["東京メトロ15000系(10両)","1500053F"],
 "89S":["東京メトロ05系(10両)","0514F"],
 "93S":["東京メトロ05系(10両)","0533F"],
 "95S":["東京メトロ15000系(10両)","1500066F"]
},
"2026-10-24":{
 "13S":["東京メトロ15000系(10両)","51F"],"15S":["東京メトロ05系(10両)","39F"],
 "17S":["東京メトロ05系(10両)","41F"],"19S":["東京メトロ15000系(10両)","62F"],
 "21S":["東京メトロ05系(10両)","27F"],"23S":["東京メトロ05系(10両)","36F"],
 "25S":["東京メトロ05系(10両)","15F"],"27S":["東京メトロ05系(10両)","32F"],
 "29S":["東京メトロ05系(10両)","17F"],"31S":["東京メトロ05系(10両)","29F"],
 "33S":["東京メトロ07系(10両)","76F"],"35S":["東京メトロ07系(10両)","71F"],
 "37S":["東京メトロ05系(10両)","42F"],"39S":["東京メトロ05系(10両)","28F"],
 "41S":["東京メトロ05系(10両)","40F"],"43S":["東京メトロ05系(10両)","23F"],
 "45S":["東京メトロ15000系(10両)","66F"],"47S":["東京メトロ15000系(10両)","57F"],
 "49S":["東京メトロ05系(10両)","20F"],"51S":["東京メトロ05系(10両)","43F"],
 "53S":["東京メトロ05系(10両)","33F"],"55S":["東京メトロ05系(10両)","30F"],
 "57S":["東京メトロ07系(10両)","75F"],"59S":["東京メトロ15000系(10両)","61F"],
 "03K":["JR E231系800番台(10両)","K2"],"07K":["JR E231系800番台(10両)","K3"],
 "11K":["JR E231系800番台(10両)","K4"],
 "50T":["東葉高速2000系(10両)","04F"],
 "52T":["東京メトロ15000系(10両)","63F"],
 "54T":["東葉高速2000系(10両)","11F"],"56T":["東葉高速2000系(10両)","07F"],
 "58T":["東葉高速2000系(10両)","09F"],"60T":["東葉高速2000系(10両)","06F"],
 "62T":["東葉高速2000系(10両)","03F"],"64T":["東葉高速2000系(10両)","01F"]
}};
var historicalTozaiRows=Object.create(null);
("2026-10-17|13S|15000|61F 2026-10-17|15S|05|41F 2026-10-17|17S|15000|58F 2026-10-17|19S|05|22F 2026-10-17|21S|15000|55F 2026-10-17|23S|15000|51F 2026-10-17|25S|15000|56F 2026-10-17|27S|07|74F 2026-10-17|29S|05|40F 2026-10-17|31S|07|73F 2026-10-17|33S|07|72F 2026-10-17|35S|05|30F 2026-10-17|37S|15000|65F 2026-10-17|39S|15000|59F 2026-10-17|41S|05|28F 2026-10-17|43S|05|32F 2026-10-17|45S|05|38F 2026-10-17|47S|05|18F 2026-10-17|49S|05|29F 2026-10-17|51S|05|21F 2026-10-17|53S|07|71F 2026-10-17|55S|15000|57F 2026-10-17|57S|05|16F 2026-10-17|59S|05|34F 2026-10-17|03K|231|K6 2026-10-17|07K|231|K7 2026-10-17|11K|231|K5 2026-10-17|50T|2000|11F 2026-10-17|52T|2000|04F 2026-10-17|54T|2000|05F 2026-10-17|56T|2000|02F 2026-10-17|58T|2000|06F 2026-10-17|60T|2000|07F 2026-10-17|62T|2000|09F 2026-10-17|64T|2000|03F 2026-10-10|13S|15000|59F 2026-10-10|15S|05|14F 2026-10-10|17S|05|32F 2026-10-10|19S|05|30F 2026-10-10|21S|05|23F 2026-10-10|23S|15000|56F 2026-10-10|25S|07|75F 2026-10-10|27S|05|19F 2026-10-10|29S|15000|63F 2026-10-10|31S|15000|65F 2026-10-10|33S|15000|60F 2026-10-10|35S|05|21F 2026-10-10|37S|05|18F 2026-10-10|39S|05|17F 2026-10-10|41S|15000|62F 2026-10-10|43S|05|38F 2026-10-10|45S|15000|57F 2026-10-10|47S|05|28F 2026-10-10|49S|15000|66F 2026-10-10|51S|05|39F 2026-10-10|53S|05|40F 2026-10-10|55S|07|74F 2026-10-10|57S|07|76F 2026-10-10|59S|05|43F 2026-10-10|03K|231|K2 2026-10-10|07K|231|K3 2026-10-10|11K|231|K1 2026-10-10|50T|2000|05F 2026-10-10|52T|2000|03F 2026-10-10|54T|2000|07F 2026-10-10|56T|2000|04F 2026-10-10|58T|2000|09F 2026-10-10|60T|2000|01F 2026-10-10|62T|2000|02F 2026-10-10|64T|2000|06F").split(" ").forEach(function(item){
 var p=item.split("|"),d=p[0],code=p[1];
 (historicalTozaiRows[d]||(historicalTozaiRows[d]=Object.create(null)))[code]=[p[2],p[3]];
});
function modelName(v){
 return v==="05"?"東京メトロ05系(10両)":v==="07"?"東京メトロ07系(10両)":v==="15000"?"東京メトロ15000系(10両)":v==="231"?"JR E231系800番台(10両)":v==="2000"?"東葉高速2000系(10両)":v;
}
function op(n){var m=String(n||"").toUpperCase().match(/(?:^|[^0-9A-Z])((?:0[2]|1[3579]|2[13579]|3[13579]|4[13579]|5[13579]|6[13579]|7[13579]|8[13579]|9[1357])S)(?:[^0-9A-Z]|$)/);return m?m[1]:"";}
function publicOp(n,ctx){var raw=String((ctx&&ctx.operationCode)||n||"").toUpperCase().trim(),m=raw.match(/(\d{1,2})([KST])(?:R)?$/);return m?String(parseInt(m[1],10)).padStart(2,"0")+m[2]:"";}
function resolveEvidence(trainNumber,ctx){
 ctx=ctx||{};var hay=[ctx.lineId,ctx.railway].join("|");if(!/Tozai|ChuoSobu|ToyoRapid|東西|中央.*総武|東葉/i.test(hay))return null;
 var d=String(ctx.serviceDate||"").slice(0,10),code=publicOp(trainNumber,ctx),r=rows[d]&&rows[d][code];
 var historical=!r&&historicalTozaiRows[d]&&historicalTozaiRows[d][code];r=r||historical;
 if(!r)return null;
 var model=modelName(r[0]),operator=/E231/.test(model)?"JR-East":/東葉高速/.test(model)?"ToyoRapid":"TokyoMetro";
 return {operator:operator,vehicleType:model,formationId:r[1],grade:"C",
  sourceUrl:SOURCE+"22/"+d.replace(/-/g,"")+"/?U="+code,
  provenance:historical?"historical dated Tozai formation observation":"dated Tozai formation observation",observedDate:d};
}
registerEvidenceProvider({id:"tozai-dated-formations",grade:"C",resolveEvidence:resolveEvidence});
})();

(function(){"use strict";
var SOURCE="https://loo-ool.com/rail/SS/";
var rows={
"2026-04-08":{
 "2601":["西武20000系","20108F"],"2603":["西武6000系","6104F"],"2605":["西武6000系","6105F"],
 "5305":["西武20000系","20154F"],"6017":["西武9000系","9104F"],"6018":["西武9000系","9105F"],
 "6622":["西武8000系","8103F"],"602":["西武40000系","40104F"],"604":["西武40000系","40103F"],
 "101":["西武10000系","10112F"],"102":["西武10000系","10112F"],"104":["西武10000系","10110F"],"108":["西武10000系","10108F"]
},
"2026-04-09":{
 "2601":["西武20000系","20105F"],"2603":["西武6000系","6108F"],"2604":["西武6000系","6105F"],
 "6017":["西武9000系","9103F"],"6018":["西武9000系","9108F"],"6086":["西武9000系","9108F"],
 "6626":["西武8000系","8103F"],"110":["西武10000系","10110F"],"112":["西武10000系","10108F"],"126":["西武10000系","10112F"]
},
"2026-04-13":{
 "2803":["西武40000系","40103F"],"5303":["西武6000系","6101F"],"6017":["西武9000系","9105F"],
 "6018":["西武9000系","9104F"],"114":["西武10000系","10109F"],"2306":["西武6000系","6108F"],
 "2312":["西武6000系","6107F"],"2614":["西武6000系","6104F"],"2752":["西武6000系","6102F"]
},
"2026-04-17":{
 "2601":["西武30000系","30105F"],"2603":["西武6000系","6104F"],
 "2605":["西武6000系","6105F"],"2607":["西武2000系","2089F / 2457F"],
 "2609":["西武2000系","2055F"],"5305":["西武20000系","20156F"],
 "6017":["西武9000系","9104F"],"6018":["西武9000系","9105F"],
 "6622":["西武8000系","8103F"],"602":["西武40000系","40103F"],
 "604":["西武40000系","40104F"],"102":["西武10000系","10110F"],
 "104":["西武10000系","10108F"],"106":["西武10000系","10112F"],"124":["西武10000系","10109F"]
}};
function no(n){var m=String(n||"").match(/(?:^|[^0-9])(\d{2,4})(?:[^0-9]|$)/);return m?m[1]:"";}
function resolveEvidence(trainNumber,ctx){
 ctx=ctx||{};var hay=[ctx.lineId,ctx.railway].join("|");if(!/SeibuShinjuku|Haijima|西武新宿|拝島/i.test(hay))return null;
 var d=String(ctx.serviceDate||"").slice(0,10),r=rows[d]&&rows[d][no(trainNumber)];if(!r)return null;
 return {operator:"Seibu",vehicleType:r[0],formationId:r[1],grade:"C",sourceUrl:SOURCE,provenance:"dated Seibu Shinjuku train-number observation",observedDate:d};
}
registerEvidenceProvider({id:"seibu-shinjuku-dated-trains",grade:"C",resolveEvidence:resolveEvidence});
})();

(function(){"use strict";
var SOURCE="https://yozakura-room.net/oerunyo/";
var TRAIN_MAP_SOURCE="https://w.atwiki.jp/oerunyo2025/pages/19.html";
var HOLIDAY_TRAIN_MAP_SOURCE="https://w.atwiki.jp/oerunyo2025/pages/20.html";
var EFFECTIVE="2026-03-14";
function network(ctx){return /Odawara|OdakyuTama|OdakyuEnoshima|小田急|江ノ島/i.test([ctx.lineId,ctx.railway,ctx.operator].join("|"));}
var WEEKDAY_TRAIN_TO_OPERATION={
 "7004":"A11","7005":"A11","7012":"A11","7013":"A11",
 "9141":"E11","3014":"E11","9189":"E11",
 "6754":"E12","1354":"E12","1209":"E12","1208":"E12",
 "6021":"C11",
 "4300":"C12","6037":"C12","9172":"C12","4039":"C12","4032":"C12","2219":"C12","9266":"C12",
 "9155":"C13","4310":"C13","4035":"C13",
 "1202":"C14","9159":"C14","6002":"C14","6033":"C14","2210":"C14","2017":"C14","2028":"C14","2213":"C14","9234":"C14",
 "9111":"C15","2200":"C15","6025":"C15","4008":"C15","2209":"C15","9208":"C15",
 "9101":"C16","6000":"C16","2215":"C16","9244":"C16",
 "9133":"C17","2204":"C17","6035":"C17","9213":"C17","9174":"C17","6028":"C17",
 "6009":"C18",
 "4308":"C19","4065":"C19",
 "4304":"C20","6031":"C20","9225":"C20",
 "9125":"C21","4302":"C21","4063":"C21",
 "6515":"C22","4318":"C22",
 "6027":"C23","6026":"C23","4049":"C23","9218":"C23","9220":"C23"
};
var HOLIDAY_TRAIN_TO_OPERATION={
 "4001":"C11","3051":"C11","3072":"C11","2775":"C11","2776":"C11","3081":"C11","1216":"C11","1351":"C11","6751":"C11","9372":"C11",
 "9161":"E11","9136":"E11",
 "9209":"E12","9182":"E12","1214":"E12","3529":"E12","3540":"E12",
 "1700":"E61","9153":"E61","9220":"E61","2761":"E61","7642":"E61","7643":"E61","7646":"E61",
 "9133":"C15","2204":"C15","4007":"C15","9203":"C15","2000":"C15","2021":"C15","2024":"C15","2223":"C15","9296":"C15",
 "9263":"C17","2236":"C17",
 "2203":"C18","9168":"C18","1206":"C18","2725":"C18","2730":"C18","3035":"C18","3056":"C18","3551":"C18","3562":"C18","1223":"C18","9273":"C18","1003":"C18","1220":"C18","1357":"C18","6767":"C18",
 "6803":"C19","6504":"C19","3501":"C19","3512":"C19","3513":"C19","3524":"C19","3029":"C19","3050":"C19","3545":"C19","3556":"C19",
 "9193":"C16","6550":"C16","6577":"C16","6590":"C16","6617":"C16","1217":"C16","9290":"C16","6402":"C16","6205":"C16",
 "9256":"C20","2231":"C20","9328":"C20",
 "9177":"C21","2218":"C21","6001":"C21",
 "1200":"C22","1203":"C22","3014":"C22","3509":"C22","3520":"C22","9213":"C22","7637":"C22","2002":"C22","2023":"C22","2032":"C22"
};
function serviceDay(ctx){
 var date=String(ctx.serviceDate||"").slice(0,10); if(!date)return "";
 var d=new Date(date+"T12:00:00Z"),day=d.getUTCDay();
 return (day===0||day===6)?"holiday":"weekday";
}
function mappedOperation(trainNumber,ctx){
 var day=serviceDay(ctx); if(!day)return "";
 var key=String(trainNumber||"").replace(/\\D/g,"");
 return day==="holiday"?(HOLIDAY_TRAIN_TO_OPERATION[key]||""):(WEEKDAY_TRAIN_TO_OPERATION[key]||"");
}
function op(raw){
 var m=String(raw||"").toUpperCase().trim().match(/(?:^|[^A-Z0-9])([ABCE])(\d{1,2})(?:[^A-Z0-9]|$)/);
 return m?{group:m[1],number:parseInt(m[2],10)}:null;
}
function resolveEvidence(trainNumber,ctx){
 ctx=ctx||{};var date=String(ctx.serviceDate||"").slice(0,10);
 if(!date||date<EFFECTIVE||!network(ctx))return null;
 var mapped=mappedOperation(trainNumber,ctx);
 var x=op(ctx.operationCode)||op(trainNumber)||op(mapped);if(!x)return null;
 var c=[],exact="";
 if(x.group==="A"&&x.number>=11&&x.number<=34)c=["小田急3000形","小田急8000形"];
 else if(x.group==="B"&&x.number>=11&&x.number<=18)c=["小田急1000形","小田急3000形"];
 else if(x.group==="B"&&x.number>=21&&x.number<=29)c=["小田急1000形","小田急2000形"];
 else if(x.group==="C"&&x.number>=11&&x.number<=23){c=["小田急4000形"];exact="小田急4000形";}
 else if(x.group==="E")c=["小田急1000形","小田急3000形","小田急5000形","小田急8000形"];
 else return null;
 var sourceUrl=mapped ? (serviceDay(ctx)==="holiday" ? HOLIDAY_TRAIN_MAP_SOURCE : TRAIN_MAP_SOURCE) : SOURCE;
 return {operator:"Odakyu",vehicleType:exact,vehicleCandidates:c,grade:"C",sourceUrl:sourceUrl,
  provenance:"2026 Odakyu operation-group fleet constraints / verified train-number mapping",observedDate:date,operationCode:x.group+String(x.number).padStart(2,"0")};
}
var p={id:"odakyu-operation-groups-2026",grade:"C",sourceUrl:SOURCE,effectiveDate:EFFECTIVE,resolveEvidence:resolveEvidence};
registerEvidenceProvider(p);
})();

(function(){"use strict";
var SOURCE="https://loo-ool.com/rail/OD/";
var rows={"2026-08-06":{
"E12":["小田急3000形","3093F"],
"E13":["小田急3000形","1057F / 3276F"],
"E14":["小田急3000形","3094F"],
"E15":["小田急5000形","5052F"],
"E17":["小田急3000形","3082F"],
"E18":["小田急5000形","5060F"],
"E19":["小田急8000形","8051F / 8252F"],
"E20":["小田急3000形","3085F"],
"E21":["小田急1000形","1092F"],
"E22":["小田急5000形","5053F"],
"E23":["小田急3000形","3083F"],
"E24":["小田急4000形","4060F"],
"E25":["小田急1000形","1097F"],
"E26":["小田急3000形","3092F"],
"E27":["小田急8000形","8063F / 8263F"],
"E28":["小田急8000形","8053F / 8253F"],
"E29":["小田急3000形","3081F"],
"E30":["小田急8000形","8058F / 8260F"],
"E31":["小田急5000形","5055F"],
"E32":["小田急4000形","4062F"],
"E33":["小田急1000形","1094F"],
"E34":["小田急3000形","3095F"],
"E35":["小田急1000形","1096F / 5057F"],
"E61":["小田急3000形","3087F"],
"E62":["小田急5000形","5059F"],
"E63":["小田急5000形","5051F"],
"E64":["小田急5000形","5065F"],
"E65":["小田急1000形","1091F"],
"E66":["小田急5000形","5056F"],
"E67":["小田急5000形","5054F"],
"E68":["小田急5000形","5063F"],
"E69":["小田急8000形","8057F / 8262F"],
"E70":["小田急5000形","5064F"],
"E81":["小田急5000形","5062F"],
"E82":["小田急3000形","3091F"],
"E83":["小田急5000形","5066F"],
"E84":["小田急1000形","1095F"],
"E85":["小田急3000形","3084F"]
}};
function op(raw){var m=String(raw||"").toUpperCase().match(/(?:^|[^A-Z0-9])(E(?:1[1-9]|2[0-9]|3[0-5]|6[1-9]|70|8[1-5]))(?:[^A-Z0-9]|$)/);return m?m[1]:"";}
function network(ctx){return /Odawara|OdakyuTama|OdakyuEnoshima|小田急|江ノ島/i.test([ctx.lineId,ctx.railway,ctx.operator].join("|"));}
function resolveEvidence(trainNumber,ctx){ctx=ctx||{};if(!network(ctx))return null;
 var d=String(ctx.serviceDate||"").slice(0,10),code=op(ctx.operationCode)||op(trainNumber),r=rows[d]&&rows[d][code];if(!r)return null;
 return {operator:"Odakyu",vehicleType:r[0],formationId:r[1],grade:"C",sourceUrl:SOURCE,
 provenance:"loo-ool dated Odakyu operation observation",observedDate:d,operationCode:code};}
registerEvidenceProvider({id:"odakyu-dated-formations",grade:"C",resolveEvidence:resolveEvidence});
})();

// 已验证的 JR 东日本中央·总武线当前服务
// 日节假日运行表。ODPT 提供公开列车号，Loo-ool 提供
// 由末两位数字加所属字母表示的实际编组（39B、11B、
// 等）。保持此日期快照的范围严格：空来源单元格仍然保持
// 未解析，不要把循环工作日/节假日计划变成猜测。
(function(){"use strict";
var DATE="2026-10-24", SOURCE="https://loo-ool.com/rail/K/00/20261024/";
var rows={
 "03B":["E231系500番台","A536"],"07B":["E231系500番台","A548"],
 "09B":["E231系0番台（中央・総武線各駅停車）","B14"],"11B":["E231系500番台","A502"],
 "15B":["E231系0番台（中央・総武線各駅停車）","B26"],"17B":["E231系500番台","A537"],
 "19B":["E231系500番台","A540"],"21B":["E231系500番台","A518"],
 "23B":["E231系500番台","A511"],"25B":["E231系500番台","A545"],
 "27B":["E231系500番台","A528"],"29B":["E231系500番台","A552"],
 "33B":["E231系500番台","A551"],"35B":["E231系500番台","A535"],
 "37B":["E231系500番台","A506"],"39B":["E231系500番台","A530"],
 "51B":["E231系0番台（中央・総武線各駅停車）","B12"],"57B":["E231系0番台（中央・総武線各駅停車）","B11"],
 "59B":["E231系500番台","A538"],"61B":["E231系500番台","A503"],
 "67B":["E231系500番台","A514"],"69B":["E231系0番台（中央・総武線各駅停車）","B10"],
 "71B":["E231系500番台","A533"],"73B":["E231系500番台","A517"],
 "75B":["E231系500番台","A507"],"79B":["E231系500番台","A546"],
 "83B":["E231系500番台","A512"],"85B":["E231系500番台","A542"],
 "87B":["E231系500番台","A544"],"89B":["E231系500番台","A516"],
 "91B":["E231系500番台","A531"],"95B":["E231系500番台","A550"],
 "97B":["E231系500番台","A549"],"99B":["E231系500番台","A529"],
 "01C":["E231系500番台","A508"],"05C":["E231系500番台","A521"],
 "07C":["E231系500番台","A505"]
};
// 其他休日的历史编成证据。休日同一运用号可能换车，必须按日期使用。
var historicalHolidayRows=Object.create(null);
("2026-10-17|31B|5|A547 2026-10-17|41B|5|A548 2026-10-17|43B|5|A542 2026-10-17|49B|5|A526 2026-10-17|55B|0|B10 2026-10-17|63B|5|A543 2026-10-17|65B|5|A546 2026-10-10|31B|5|A538 2026-10-10|41B|0|B10 2026-10-10|43B|5|A501 2026-10-10|45B|5|A517 2026-10-10|49B|5|A543 2026-10-10|63B|5|A521 2026-10-10|65B|5|A551 2026-10-03|31B|5|A517 2026-10-03|43B|5|A528 2026-10-03|49B|5|A502 2026-10-03|55B|0|B12 2026-10-03|63B|5|A532 2026-10-03|81B|0|B26 2026-09-26|31B|5|A550 2026-09-26|41B|0|B12 2026-09-26|43B|5|A527 2026-09-26|49B|5|A532 2026-09-26|55B|5|A536 2026-09-26|63B|0|B14 2026-09-26|65B|5|A506 2026-09-26|81B|5|A539 2026-09-19|31B|5|A505 2026-09-19|41B|5|A519 2026-09-19|49B|5|A520 2026-09-19|55B|5|A516 2026-09-19|65B|5|A545 2026-09-19|81B|5|A508 2026-09-12|41B|5|A530 2026-09-12|43B|5|A527 2026-09-12|45B|5|A535 2026-09-12|49B|5|A518 2026-09-12|55B|5|A531 2026-09-12|63B|5|A528 2026-09-12|65B|5|A515 2026-09-05|41B|5|A503 2026-09-05|43B|5|A515 2026-09-05|63B|5|A510 2026-09-05|65B|5|A538 2026-09-05|81B|0|B10 2026-08-29|41B|5|A548 2026-08-29|43B|5|A524 2026-08-29|45B|5|A550 2026-08-29|49B|5|A510 2026-08-29|55B|5|A533").split(" ").forEach(function(item){
 var p=item.split("|"),d=p[0],code=p[1];
 (historicalHolidayRows[d]||(historicalHolidayRows[d]=Object.create(null)))[code]=[p[2],p[3]];
});
("2026-08-22|31B|5|A552 2026-08-22|41B|5|A533 2026-08-22|49B|5|A535 2026-08-22|55B|5|A503 2026-08-22|63B|5|A532 2026-08-22|81B|5|A536 2026-08-15|31B|5|A540 2026-08-15|41B|5|A501 2026-08-15|43B|0|B10 2026-08-15|49B|5|A532 2026-08-15|63B|5|A514 2026-08-15|81B|5|A543 2026-08-08|31B|0|B14 2026-08-08|41B|0|B26 2026-08-08|43B|5|A507 2026-08-08|45B|5|A540 2026-08-08|49B|5|A514 2026-08-08|55B|5|A519 2026-08-08|63B|5|A531 2026-08-08|81B|0|B11 2026-08-01|31B|5|A536 2026-08-01|41B|5|A503 2026-08-01|43B|5|A518 2026-08-01|55B|5|A506 2026-08-01|63B|5|A524 2026-08-01|65B|5|A517 2026-08-01|81B|5|A548 2026-07-25|41B|5|A528 2026-07-25|43B|0|B14 2026-07-25|45B|5|A501 2026-07-25|49B|5|A537 2026-07-25|55B|5|A541 2026-07-25|63B|5|A546 2026-07-25|65B|0|B26 2026-07-25|81B|5|A507 2026-07-18|41B|5|A531 2026-07-18|43B|5|A541 2026-07-18|49B|5|A515 2026-07-18|81B|5|A509 2026-07-11|31B|0|B26 2026-07-11|45B|0|B12 2026-07-11|49B|5|A517 2026-07-11|63B|5|A539 2026-07-04|41B|5|A548 2026-07-04|43B|5|A505 2026-07-04|45B|5|A507 2026-07-04|49B|5|A539 2026-07-04|55B|5|A544 2026-07-04|63B|5|A543 2026-06-27|31B|5|A508 2026-06-27|41B|0|B27 2026-06-27|45B|0|B11 2026-06-27|49B|5|A543 2026-06-27|55B|0|B14 2026-06-27|63B|5|A537 2026-06-20|41B|0|B14 2026-06-20|43B|0|B11 2026-06-20|49B|5|A545 2026-06-20|63B|5|A510 2026-06-20|65B|5|A529 2026-06-20|81B|5|A531").split(" ").forEach(function(item){
 var p=item.split("|"),d=p[0],code=p[1];
 (historicalHolidayRows[d]||(historicalHolidayRows[d]=Object.create(null)))[code]=[p[2],p[3]];
});
// 静态运行号 -> 规范 PNG 身份。运行表仅按
// 工作日/节假日拆分；当当前页面也暴露实际编组时，上方的日期记录
// 仍然是更强的来源。
var calendarModels={
 weekday:{
  "01B":"E231系500番台","03B":"E231系500番台","05B":"E231系500番台",
  "07B":"E231系0番台（中央・総武線各駅停車）","09B":"E231系500番台","11B":"E231系500番台",
  "13B":"E231系500番台","15B":"E231系500番台","17B":"E231系500番台",
  "19B":"E231系0番台（中央・総武線各駅停車）","21B":"E231系500番台","23B":"E231系500番台","25B":"E231系500番台",
  "27B":"E231系500番台","29B":"E231系500番台","31B":"E231系500番台",
  "33B":"E231系500番台","35B":"E231系500番台","37B":"E231系500番台",
  "39B":"E231系500番台","41B":"E231系500番台","43B":"E231系500番台",
  "45B":"E231系500番台","47B":"E231系0番台（中央・総武線各駅停車）","49B":"E231系0番台（中央・総武線各駅停車）","51B":"E231系500番台",
  "53B":"E231系500番台","55B":"E231系0番台（中央・総武線各駅停車）","57B":"E231系500番台",
  "59B":"E231系500番台","61B":"E231系500番台","63B":"E231系500番台",
  "65B":"E231系500番台","67B":"E231系0番台（中央・総武線各駅停車）","69B":"E231系500番台",
  "71B":"E231系500番台","73B":"E231系500番台","75B":"E231系500番台",
  "77B":"E231系500番台","79B":"E231系500番台","81B":"E231系500番台",
  "83B":"E231系500番台","85B":"E231系500番台","87B":"E231系500番台",
  "89B":"E231系500番台","91B":"E231系500番台","93B":"E231系500番台",
  "95B":"E231系500番台","97B":"E231系500番台","99B":"E231系500番台",
  "01C":"E231系500番台","03C":"E231系500番台","05C":"E231系500番台","07C":"E231系500番台"
 },
 holiday:{
  "03B":"E231系500番台","07B":"E231系500番台","09B":"E231系0番台（中央・総武線各駅停車）",
  "11B":"E231系500番台","15B":"E231系0番台（中央・総武線各駅停車）","17B":"E231系500番台",
  "19B":"E231系500番台","21B":"E231系500番台","23B":"E231系500番台",
  "25B":"E231系500番台","27B":"E231系500番台","29B":"E231系500番台",
  "33B":"E231系500番台","35B":"E231系500番台","37B":"E231系500番台",
  "39B":"E231系500番台","51B":"E231系0番台（中央・総武線各駅停車）","57B":"E231系0番台（中央・総武線各駅停車）",
  "59B":"E231系500番台","61B":"E231系500番台","67B":"E231系500番台",
  "69B":"E231系0番台（中央・総武線各駅停車）","71B":"E231系500番台","73B":"E231系500番台",
  "75B":"E231系500番台","79B":"E231系500番台","83B":"E231系500番台",
  "85B":"E231系500番台","87B":"E231系500番台","89B":"E231系500番台",
  "91B":"E231系500番台","95B":"E231系500番台","97B":"E231系500番台",
  "99B":"E231系500番台",
  "31B":"E231系500番台","41B":"E231系500番台","43B":"E231系500番台",
  "45B":"E231系500番台","49B":"E231系500番台","55B":"E231系500番台",
  "63B":"E231系500番台","65B":"E231系500番台","81B":"E231系500番台",
  "01C":"E231系500番台","05C":"E231系500番台","07C":"E231系500番台"
 }
};
// loo-ool休日運用表と同日の手動時刻表を首末駅・時刻で照合した
// 公開列車番号 -> 実運用番号。末尾2桁への推測変換は使わない。
var holidayTrainOperationCodes=Object.create(null);
Object.assign(holidayTrainOperationCodes,{"2342B":"03B","444B":"45B","457B":"57B","633B":"33B","739B":"39B","779B":"79B"});
("1000C:01C 1002B:03B 1006B:07B 1010B:11B 1014B:15B 1018B:19B 1026B:27B 1036B:37B 1043B:43B 1050B:51B 1055B:55B 1057B:57B 1058B:59B 1061B:61B 1300C:01C 1069B:69B 1072B:73B 1075B:75B 1083B:83B 1087B:87B 1089B:89B 1091B:91B 1095B:95B 1097B:97B 1098B:99B 1101C:01C 1103B:03B 1105C:05C 1106C:07C 1107B:07B 1109B:09B 1111B:11B 1115B:15B 1119B:19B 1120B:21B 1129B:29B 1134B:35B 1137B:37B 1138B:39B 1140B:41B 1142B:43B 1148B:49B 1160B:61B 1166B:67B 1168B:69B 1181B:81B 1185B:85B 1190B:91B 1196B:97B 1204C:05C 1207C:07C 1208B:09B 1227B:27B 1228B:29B 1235B:35B 1236B:37B 1239B:39B 1241B:41B 1249B:49B 1251B:51B 1254B:55B 1256B:57B 1259B:59B 1267B:67B 1269B:69B 1273B:73B 1274B:75B 1280B:81B 1282B:83B 1286B:87B 1288B:89B 1294B:95B 1299B:99B 1302B:03B 1305C:05C 1306B:07B 1310B:11B 1314B:15B 1318B:19B 1321B:21B 1326B:27B 1340B:41B 1343B:43B 1355B:55B 1357B:57B 1358B:59B 1361B:61B 1372B:73B 1375B:75B 1383B:83B 1384B:85B 1387B:87B 1389B:89B 1391B:91B 1397B:97B 1398B:99B 1401C:01C 1406C:07C 1407B:07B 1409B:09B 1411B:11B 1415B:15B 1419B:19B 1420B:21B 1429B:29B 1434B:35B 1437B:37B 1438B:39B 1442B:43B 1448B:49B 1450B:51B 1466B:67B 1468B:69B 1481B:81B 1482B:83B 1485B:85B 1490B:91B 1495B:95B 1496B:97B 1499B:99B 1500C:01C 1503B:03B 1504C:05C 1507C:07C 1508B:09B 1527B:27B 1528B:29B 1535B:35B 1536B:37B 1539B:39B 1541B:41B 1543B:43B 1549B:49B 1551B:51B 1554B:55B 1556B:57B 1574B:75B 1559B:59B 1560B:61B 1569B:69B 1573B:73B 1586B:87B 1588B:89B 1594B:95B 1602B:03B 1605C:05C 1606B:07B 1609B:09B 1610B:11B 1614B:15B 1618B:19B 1621B:21B 1623B:23B 1626B:27B 1638B:39B 1640B:41B 1655B:55B 1658B:59B 1661B:61B 1667B:67B 1672B:73B 1675B:75B 1683B:83B 1684B:85B 1689B:89B 1691B:91B 1697B:97B 1698B:99B 1706C:07C 1707B:07B 1715B:15B 1711B:11B 1719B:19B 1720B:21B 1729B:29B 1724B:25B 1734B:35B 1737B:37B 1742B:43B 1748B:49B 1750B:51B 1764B:65B 1759B:59B 1763B:63B 1766B:67B 1768B:69B 1782B:83B 1785B:85B 1787B:87B 1788B:89B 1790B:91B 1795B:95B 1799B:99B 1803B:03B 1804C:05C 1807C:07C 1818B:19B 1821B:21B 1822B:23B 1827B:27B 1828B:29B 1835B:35B 1836B:37B 1839B:39B 1841B:41B 1843B:43B 1851B:51B 1854B:55B 1860B:61B 1862B:63B 1865B:65B 1869B:69B 1873B:73B 1874B:75B 1886B:87B 1894B:95B 1896B:97B 1902B:03B 1905C:05C 1906B:07B 1910B:11B 1914B:15B 1923B:23B 1925B:25B 1926B:27B 1937B:37B 1938B:39B 1949B:49B 1958B:59B 1961B:61B 1964B:65B 1967B:67B 1972B:73B 1975B:75B 1983B:83B 1984B:85B 1989B:89B 1991B:91B 1997B:97B 1998B:99B 2006C:07C 2015B:15B 2019B:19B 2020B:21B 2029B:29B 2034B:35B 2040B:41B 2042B:43B 2050B:51B 2055B:55B 2059B:59B 2063B:63B 2068B:69B 2082B:83B 2085B:85B 2087B:87B 2088B:89B 2090B:91B 2095B:95B 2096B:97B 2104C:05C 2107B:07B 2111B:11B 2122B:23B 2124B:25B 2127B:27B 2128B:29B 2136B:37B 2139B:39B 2141B:41B 2148B:49B 2160B:61B 2162B:63B 2165B:65B 2169B:69B 2174B:75B 2183B:83B 2186B:87B 2199B:99B 2205C:05C 2207C:07C 2210B:11B 2218B:19B 2225B:25B 2235B:35B 2243B:43B 2254B:55B 2258B:59B 2264B:65B 2284B:85B 2289B:89B 2294B:95B 2298B:99B 2306B:07B 2323B:23B 2326B:27B 2338B:39B 2340B:41B 2349B:49B 2361B:61B 2363B:63B 2382B:83B 2387B:87B 2404C:05C 2419B:19B 2434B:35B 2495B:95B 2499B:99B 402B:03B 409B:09B 410B:11B 418B:19B 428B:29B 431B:31B 433B:33B 450B:51B 485B:85B 511B:11B 519B:19B 532B:33B 529B:29B 530B:31B 545B:45B 556B:57B 571B:71B 572B:73B 582B:83B 590B:91B 601C:01C 608B:09B 603B:03B 615B:15B 616B:17B 617B:17B 618B:19B 620B:21B 624B:25B 633B:33B 641B:41B 649B:49B 651B:51B 659B:59B 660B:61B 661B:61B 662B:63B 670B:71B 673B:73B 684B:85B 688B:89B 698B:99B 699B:99B 700C:01C 702B:03B 704C:05C 706C:07C 707C:07C 710B:11B 714B:15B 721B:21B 728B:29B 731B:31B 736B:37B 744B:45B 748B:49B 750B:51B 757B:57B 758B:59B 767B:67B 771B:71B 772B:73B 775B:75B 783B:83B 785B:85B 789B:89B 791B:91B 795B:95B 801C:01C 803B:03B 805C:05C 807B:07B 809B:09B 811B:11B 817B:17B 819B:19B 825B:25B 826B:27B 829B:29B 834B:35B 837B:37B 838B:39B 840B:41B 855B:55B 860B:61B 866B:67B 868B:69B 874B:75B 890B:91B 894B:95B 897B:97B 898B:99B 904C:05C 907C:07C 908B:09B 915B:15B 916B:17B 927B:27B 928B:29B 939B:39B 935B:35B 941B:41B 949B:49B 951B:51B 954B:55B 956B:57B 959B:59B 967B:67B 970B:71B 973B:73B 980B:81B 982B:83B 984B:85B 988B:89B 996B:97B 999B:99B").split(" ").forEach(function(pair){var parts=pair.split(":");holidayTrainOperationCodes[parts[0]]=parts[1];});
function calendar(ctx){
 var c=String(ctx&&ctx.calendarType||'').toLowerCase();
 if(c==='weekday'||c==='holiday')return c;
 var d=String(ctx&&ctx.serviceDate||'').slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return '';
 var day=new Date(d+'T12:00:00Z').getUTCDay();
 return day===0||day===6?'holiday':'weekday';
}
function hasCanonicalTrainNumber(trainNumber,ctx){
 var records=window.VEHICLE_OPERATION_EVIDENCE||[],date=String(ctx&&ctx.serviceDate||'').slice(0,10),n=String(trainNumber||'');
 return records.some(function(r){
  return r&&r.validDate===date&&r.networkKey==="ChuoSobuLocal"&&
   Array.isArray(r.trainNumbers)&&r.trainNumbers.indexOf(n)>=0;
 });
}
function network(ctx){
 ctx=ctx||{};
 return String(ctx.lineId||"")==="ChuoSobuLocal" &&
   /(?:^|[:.])JR-East(?:$|[.])|JR-East/i.test(String(ctx.operator||ctx.railway||""));
}
function operation(trainNumber,ctx){
 var n=String(trainNumber||"").toUpperCase().trim(),c=calendar(ctx),mapped=c==="holiday"&&holidayTrainOperationCodes[n];
 if(mapped)return mapped;
 if(c==="holiday"&&/^\d{3,4}[BC]$/.test(n))return "";
 var raw=String((ctx&&ctx.operationCode)||n).toUpperCase().trim();
 var m=raw.match(/(?:^|[^0-9A-Z])(?:[AB])?\d*(\d{2})([BC])(?:R)?$/);
 return m?m[1]+m[2]:"";
}
function resolveEvidence(trainNumber,ctx){
 ctx=ctx||{};
 if(!network(ctx))return null;
 var date=String(ctx.serviceDate||"").slice(0,10),code=operation(trainNumber,ctx),r=rows[code];
 if(date===DATE&&r){
  return {operator:"JR-East",vehicleType:r[0],formationId:r[1],operationCode:code,
   grade:"C",sourceUrl:SOURCE+"?U="+code,observedDate:DATE,
   provenance:"loo-ool 休日運用表（2026-10-24）"};
 }
 var historical=historicalHolidayRows[date]&&historicalHolidayRows[date][code];
 if(historical){
  return {operator:"JR-East",
   vehicleType:historical[0]==="0"?"E231系0番台（中央・総武線各駅停車）":"E231系500番台",
   formationId:historical[1],operationCode:code,grade:"C",
   sourceUrl:"https://loo-ool.com/rail/K/00/"+date.replace(/-/g,"")+"/?U="+code,
   observedDate:date,provenance:"loo-ool 休日运用表（历史日期）"};
 }
 // 运行表是循环的工作日/节假日来源。只有精确的
 // 日期公开列车号记录会阻止它；其他运行的运行号记录
 // 不得抑制当前列车的车型映射。
 if(hasCanonicalTrainNumber(trainNumber,ctx))return null;
 var model=calendarModels[calendar(ctx)]&&calendarModels[calendar(ctx)][code];
 if(model)return {operator:"JR-East",vehicleType:model,operationCode:code,grade:"C",
  sourceUrl:"https://loo-ool.com/rail/K/32/",observedDate:date,
  evidenceRole:calendar(ctx)==="holiday"&&!r?"holiday-model-candidate":"",
  provenance:calendar(ctx)==="holiday"&&!r
   ?"loo-ool 休日历史多数车型候选（当日无编成）"
   :"loo-ool 平日/休日运用番号→PNG映射"};
 if(!r)return null;
 return null;
}
var provider={id:"jr-chuo-sobu-holiday-formations-20261024",grade:"C",sourceUrl:SOURCE,resolveEvidence:resolveEvidence};
registerEvidenceProvider(provider);
})();
