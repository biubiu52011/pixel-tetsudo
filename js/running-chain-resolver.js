/*
 * Pixel Tetsudo - 运行链解析器
 * 每条线路使用临时 ResolutionContext。运行链不等于 canonical 实体。
 */
(function() {
  "use strict";
  var _initialized = false;
  var _boundaryMap = {};
  var _branchOfMap = {};
  var _directThrough = {};

  function buildIndexes() {
    var lines = window.UNIFIED_LINES || {};
    var corridors = (window.RuntimeConfig || {}).SERVICE_CORRIDOR_LINES || {};
    _boundaryMap = {}; _branchOfMap = {}; _directThrough = {};
    Object.keys(lines).forEach(function(lineId) {
      var line = lines[lineId] || {};
      if (line.branchOf && lines[line.branchOf]) _branchOfMap[lineId] = line.branchOf;
      var boundaries = Array.isArray(line.serviceBoundaries) ? line.serviceBoundaries : [];
      _boundaryMap[lineId] = {};
      _directThrough[lineId] = [];
      boundaries.forEach(function(boundary) {
        if (!boundary || !boundary.lineId || !lines[boundary.lineId]) return;
        if (corridors[lineId] || corridors[boundary.lineId]) return;
        var joins = Array.isArray(boundary.handoverStations) ? boundary.handoverStations.filter(Boolean) : [];
        if (joins.length) {
          _boundaryMap[lineId][boundary.lineId] = joins.slice();
          _directThrough[lineId].push(boundary.lineId);
        }
      });
    });
    _initialized=true;
  }

  function scoreEvidence(a,b){
    var s=0;
    var la=(window.UNIFIED_LINES&&window.UNIFIED_LINES[a])||null;
    var lb=(window.UNIFIED_LINES&&window.UNIFIED_LINES[b])||null;
    if((_directThrough[a]||[]).indexOf(b)>=0)s+=3;
    if(la&&lb&&la.code&&lb.code&&la.code===lb.code)s+=(la.operator===lb.operator)?2:-5;
    var sa=la&&la.stations?la.stations:[];
    var sb=lb&&lb.stations?lb.stations:[];
    var set={},sc=0;
    sa.forEach(function(x){set[x]=true;});
    sb.forEach(function(x){if(set[x])sc++;});
    if(sc>0)s+=1;
    return s;
  }

  function _stationKey(v){var p=String(v||"").split(".");return p[p.length-1]||"";}
  function _servicePatternIds(a,b){
    var lines=window.UNIFIED_LINES||{}, ids={};
    [a,b].forEach(function(lineId){
      var line=lines[lineId]||{};
      (Array.isArray(line.servicePatterns)?line.servicePatterns:[]).forEach(function(pattern){
        var members=Array.isArray(pattern&&pattern.lineIds)?pattern.lineIds:[];
        if(pattern&&pattern.id&&members.indexOf(a)>=0&&members.indexOf(b)>=0)ids[pattern.id]=true;
      });
    });
    return Object.keys(ids).sort();
  }
  function _hasServicePatterns(lineId){
    var line=(window.UNIFIED_LINES||{})[lineId];
    return !!(line&&Array.isArray(line.servicePatterns)&&line.servicePatterns.length);
  }
  function _sourceTripKey(v) {
    var s=String(v||"");
    if(s.indexOf("odpt.TrainTimetable:")===0)return s.slice("odpt.TrainTimetable:".length);
    return s.indexOf("supabase:TrainRun:")===0 ? "" : s;
  }
  function _timeMin(v){if(!v)return null;var m=String(v).match(/^(\d{1,2}):(\d{2})/);if(!m)return null;return parseInt(m[1],10)*60+parseInt(m[2],10);}
  function _segment(tt,lineId){
    var a=(tt&&tt["odpt:trainTimetableObject"])||[]; if(!a.length)return null;
    var first=a[0]||{}, last=a[a.length-1]||{};
    var firstStation=_stationKey(first["odpt:departureStation"]||first["odpt:arrivalStation"]||first["odpt:station"]);
    var lastStation=_stationKey(last["odpt:arrivalStation"]||last["odpt:departureStation"]||last["odpt:station"]);
    var firstTime=_timeMin(first["odpt:departureTime"]||first["odpt:arrivalTime"]);
    var lastTime=_timeMin(last["odpt:arrivalTime"]||last["odpt:departureTime"]);
    var trainNumber=String(tt["odpt:trainNumber"]||tt["odpt:train"]||"");
    var calendar=String(tt["odpt:calendar"]||"");
    var destinations=tt["odpt:destinationStation"];
    if(!Array.isArray(destinations))destinations=destinations?[destinations]:[];
    var destination=destinations.length?_stationKey(destinations[0]):"";
    var id=String(tt["@id"]||tt["owl:sameAs"]||((tt["odpt:railway"]||lineId||"")+"|"+trainNumber));
    var sourceId=_sourceTripKey(tt._sourceTripId||tt["owl:sameAs"]||tt["@id"]);
    var previous=Array.isArray(tt._previousTimetableIds)?tt._previousTimetableIds.map(_sourceTripKey):[];
    var next=Array.isArray(tt._nextTimetableIds)?tt._nextTimetableIds.map(_sourceTripKey):[];
    return {lineId:lineId,id:id,sourceId:sourceId,previous:previous,next:next,
      trainNumber:trainNumber,calendar:calendar,destination:destination,
      firstStation:firstStation,lastStation:lastStation,firstTime:firstTime,lastTime:lastTime};
  }
  function _confirmedEdge(a,b,joins){
    if(!a||!b||!joins||!joins.length)return null;
    var forward=a.lastStation===b.firstStation&&joins.indexOf(a.lastStation)>=0;
    var reverse=b.lastStation===a.firstStation&&joins.indexOf(b.lastStation)>=0;
    if(!forward&&!reverse)return null;
    var dt=forward&&a.lastTime!==null&&b.firstTime!==null?b.firstTime-a.lastTime:
           reverse&&b.lastTime!==null&&a.firstTime!==null?a.firstTime-b.lastTime:null;
    // 时刻表来源链接可加强经过车站/时间验证的边界。
    // 不得用来源引用编造位置或绕过拓扑。
    var sourceLinked=!!((forward&&((a.next.indexOf(b.sourceId)>=0&&b.sourceId)||
      (b.previous.indexOf(a.sourceId)>=0&&a.sourceId)))||
      (reverse&&((b.next.indexOf(a.sourceId)>=0&&a.sourceId)||
      (a.previous.indexOf(b.sourceId)>=0&&b.sourceId))));
    var sameId=a.id===b.id, sameNo=a.trainNumber&&a.trainNumber===b.trainNumber;
    var sameCalendar=!!(a.calendar&&b.calendar&&a.calendar===b.calendar);
    var sameDestination=!!(a.destination&&b.destination&&a.destination===b.destination);
    var inferredBoundaryTime=false;
    if(dt===null){
      // Some normalized timetables retain the explicit boundary station but
      // omit its terminal arrival time. Join only when the same service day,
      // train number, and published destination identify one continuous run.
      if(!sameNo||!sameCalendar||!sameDestination)return null;
      dt=0;
      inferredBoundaryTime=true;
    }
    if(dt<0||dt>20)return null;
    return {dt:dt,sameId:sameId,sameNo:sameNo,sourceLinked:sourceLinked,
      numberChanged:!sameId&&!sameNo,
      inferredBoundaryTime:inferredBoundaryTime,
      score:(sourceLinked?4:0)+(sameId?4:(sameNo?2:0))+
        (inferredBoundaryTime?1:(dt<=5?3:dt<=10?2:1))};
  }
  function resolveTimetableChain(tt,lineId,candidates){
    if(!_initialized)buildIndexes();
    var base=_segment(tt,lineId); if(!base)return {runningChainId:null,evidence:"NO_SEGMENT"};
    var segments=[base], seen={}; seen[base.lineId+"|"+base.id]=true;
    (candidates||[]).forEach(function(x){
      if(!x||!x.lineId||!x.timetable)return;
      var s=_segment(x.timetable,x.lineId), key=s&&(s.lineId+"|"+s.id);
      if(s&&!seen[key]){seen[key]=true;segments.push(s);}
    });
    var adj={}; segments.forEach(function(s){adj[s.lineId+"|"+s.id]=[];});
    // 只有端点/时间候选才能形成边。保留原始
    // canonical 配对顺序以及相同的 _confirmedEdge/歧义仲裁。
    var starts=Object.create(null), pairs=[], pairSeen=Object.create(null);
    segments.forEach(function(segment,index){
      if(segment.firstStation)(starts[segment.firstStation]||(starts[segment.firstStation]=[])).push(index);
    });
    segments.forEach(function(segment,index){
      (starts[segment.lastStation]||[]).forEach(function(otherIndex){
        if(index===otherIndex)return;
        var next=segments[otherIndex];
        var sameRun=!!(segment.trainNumber&&segment.trainNumber===next.trainNumber&&
          segment.calendar&&segment.calendar===next.calendar&&
          segment.destination&&segment.destination===next.destination);
        var missingBoundaryTime=segment.lastTime===null||next.firstTime===null;
        if(missingBoundaryTime){
          if(!sameRun)return;
        }else{
          var gap=next.firstTime-segment.lastTime;
          if(gap<0||gap>20)return;
        }
        var lo=Math.min(index,otherIndex),hi=Math.max(index,otherIndex),key=lo+'|'+hi;
        if(pairSeen[key])return;
        pairSeen[key]=true;pairs.push({i:lo,j:hi});
      });
    });
    pairs.sort(function(a,b){return a.i-b.i||a.j-b.j;});
    var edgeCandidates=[];
    pairs.forEach(function(pair){
      var a=segments[pair.i],b=segments[pair.j];
      if((_directThrough[a.lineId]||[]).indexOf(b.lineId)<0)return;
      var joins=(_boundaryMap[a.lineId]&&_boundaryMap[a.lineId][b.lineId])||[];
      var ev=_confirmedEdge(a,b,joins); if(!ev||ev.unresolved)return;
      edgeCandidates.push({a:a,b:b,ev:ev,patternIds:_servicePatternIds(a.lineId,b.lineId)});
    });
    // 部分乘客服务名称对应一组已公布的运行模式，
    // 而不是可以自由组合的一条链。例如湘南新宿线中，
    // 宇都宫-横须贺和高崎-东海道是不同模式。将
    // 候选图限制在同一个 canonical 模式内；如果来源
    // 链接无法选定模式，就保持未确认，不要组合
    // 两条看似有效的半段路径。走廊元数据（上野东京线）在
    // 纳入解析范围时也使用相同门槛。
    var scopedPatternEdges=edgeCandidates.filter(function(x){return x.patternIds.length>0;});
    var scopedLineIds={};
    scopedPatternEdges.forEach(function(x){scopedLineIds[x.a.lineId]=true;scopedLineIds[x.b.lineId]=true;});
    var patternScope=Object.keys(scopedLineIds).some(_hasServicePatterns);
    if(patternScope){
      var patternSet={};
      scopedPatternEdges.forEach(function(x){x.patternIds.forEach(function(id){patternSet[id]=true;});});
      var activePatterns=Object.keys(patternSet).sort();
      if(activePatterns.length>1){
        var linkedPatternSet={};
        scopedPatternEdges.forEach(function(x){
          if(!x.ev.sourceLinked)return;
          x.patternIds.forEach(function(id){linkedPatternSet[id]=true;});
        });
        var linkedPatterns=Object.keys(linkedPatternSet).sort();
        if(linkedPatterns.length===1) activePatterns=linkedPatterns;
        else return {runningChainId:base.id,evidence:"NO_CONFIRMED_BOUNDARY_PATTERN_AMBIGUOUS"};
      }
      if(activePatterns.length===1){
        edgeCandidates=edgeCandidates.filter(function(x){
          return x.patternIds.length>0 && x.patternIds.indexOf(activePatterns[0])>=0;
        });
      }
    }
    // 只有在运行边界
    // 在两段中都唯一时，才接受不同车次。直通关系 + 交接
    // 车站 + 时间连续性不足以在存在其他候选时完成确认。
    edgeCandidates.forEach(function(ec){
      var ev=ec.ev;
      // A changed train number may join only when the pairing is unique for
      // pairing is unique for BOTH segments; a shared boundary or time gap alone
      // is insufficient.
      if(ev.numberChanged){
        var peers=edgeCandidates.filter(function(x){
          if(!x.ev.numberChanged)return false;
          return x.a===ec.a||x.b===ec.a||x.a===ec.b||x.b===ec.b;
        });
        if(peers.length!==1) {
          var sameServicePattern=ec.patternIds.length>0 && peers.length>0 && peers.every(function(x){
            return x.patternIds.some(function(id){return ec.patternIds.indexOf(id)>=0;});
          });
          if(!sameServicePattern){
            // 唯一的显式来源链接可以区分其他条件相同的
            // 换乘时间候选。歧义或无链接候选继续排除。
            var linkedPeers=peers.filter(function(x){return x.ev.sourceLinked;});
            if(!ev.sourceLinked||linkedPeers.length!==1)return;
          }
        }
      }
      var ak=ec.a.lineId+"|"+ec.a.id,bk=ec.b.lineId+"|"+ec.b.id;
      adj[ak].push({key:bk,ev:ev});adj[bk].push({key:ak,ev:ev});
    });
    var root=base.lineId+"|"+base.id,q=[root],vis={};vis[root]=true;var ids=[],strong=false,numberChanged=false,linkedBySource=false,maxGap=0;
    while(q.length){var cur=q.shift(),parts=cur.split("|");ids.push(parts.slice(1).join("|"));(adj[cur]||[]).forEach(function(e){if(e.ev.sameId)strong=true;if(e.ev.numberChanged)numberChanged=true;if(e.ev.sourceLinked)linkedBySource=true;if(e.ev.dt>maxGap)maxGap=e.ev.dt;if(!vis[e.key]){vis[e.key]=true;q.push(e.key);}});}
    ids=ids.filter(function(v,i,a){return a.indexOf(v)===i;}).sort();
    if(ids.length===1)return {runningChainId:base.id,evidence:"NO_CONFIRMED_BOUNDARY"};
    return {runningChainId:"rc:"+ids.join("~"),evidence:linkedBySource?"CONFIRMED_BOUNDARY+SOURCE_TIMETABLE_LINK":(strong?"CONFIRMED_SEGMENT_GRAPH+TIMETABLE_ID":(numberChanged?"CONFIRMED_UNIQUE_BOUNDARY+TRAIN_NUMBER_CHANGED":"CONFIRMED_SEGMENT_GRAPH+TRAIN_NUMBER")),timeGapMin:maxGap,segmentCount:ids.length};
  }

  // 所有铁路共用：这是候选键，不是实体编成，也不是
  // 权威来源对象 ID。只有唯一的实时 + 时刻表
  // 匹配才可以复用已有、经来源验证的 runningChainId。
  // 起点/始发/终点仍属于计划来源记录 ID；
  // 实时 ODPT 记录常常没有这些字段，因此不能在这里编造。
  function scheduledMatchKey(lineId, position){
    if(!lineId || !position) return "";
    var num=String(position.trainNumber || "").trim();
    var date=String(position.serviceDate || "").slice(0,10);
    var dir=String(position.railDirection || "").split(/[:.]/).pop().trim();
    if(!num || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !dir) return "";
    if(/^(?:est_|odpt[.:]|supabase:|manual-template:|planned-trip:)/i.test(num)) return "";
    // 规范化常见 ODPT 环线方向别名，但不修改
    // canonical 车站顺序、环线拓扑或地图几何。
    if(/^(Inner|InnerLoop)$/i.test(dir)) dir="INNERLOOP";
    else if(/^(Outer|OuterLoop)$/i.test(dir)) dir="OUTERLOOP";
    else dir=dir.toUpperCase();
    return "scheduled-match:"+
      [lineId,date,num,dir].map(function(v){return encodeURIComponent(String(v));}).join("|");
  }

  function isThroughAtStation(lineA,lineB,stationId){
    if(!_initialized)buildIndexes();
    var joins=(_boundaryMap[lineA]&&_boundaryMap[lineA][lineB])||[];
    return joins.indexOf(stationId)>=0;
  }

  function getResolutionContext(lineId, availableLineIds){
    if(!_initialized)buildIndexes();
    var allowed=null;
    if(Array.isArray(availableLineIds)){allowed={};availableLineIds.forEach(function(id){allowed[id]=true;});}
    var related=[], through=(_directThrough[lineId]||[]).filter(function(other){return !allowed||allowed[other];});
    var line=(window.UNIFIED_LINES&&window.UNIFIED_LINES[lineId])||null;
    var isAlias=false,aliasLineId=null;
    var branchLineId=line&&line.branchOf||null;
    var isBranch=!!branchLineId;
    return {
      lineId:lineId,
      isThroughService:through.length>0,
      relatedLines:through,
      isAlias:isAlias,
      aliasLineId:aliasLineId,
      isBranch:isBranch,
      branchLineId:branchLineId,
      identity:(through.length||isAlias||isBranch)?"RELATED":"SEPARATE",
      reason:(through.length?"THROUGH_SERVICE":(isAlias?"ALIAS_OF":(isBranch?"BRANCH_OF":"NO_DIRECT_RELATION")))
    };
  }

  // 位置优先级的适用范围窄于实体运行链身份。
  // 必须同时匹配原始铁路命名空间、服务日和方向。
  function sourcePositionMatchKey(lineId, position) {
    var key = scheduledMatchKey(lineId, position);
    var railway = position && (position.sourceRailway || position.railway);
    if (!key || !/^odpt\.Railway:[^.]+\..+/.test(railway || '')) return '';
    return key + '|' + encodeURIComponent(railway);
  }

  function init(){if(_initialized)return;buildIndexes();}

  window.RunningChainResolver={
    init:init,
    getDirectThroughLines:function(lid){if(!_initialized)buildIndexes();return (_directThrough[lid]||[]).slice();},
    getServicePatternIds:function(a,b){if(!_initialized)buildIndexes();return _servicePatternIds(a,b);},
    isThroughAtStation:isThroughAtStation,
    getResolutionContext:getResolutionContext,
    resolveTimetableChain:resolveTimetableChain,
    scheduledMatchKey:scheduledMatchKey,
    sourcePositionMatchKey:sourcePositionMatchKey,
    _getIndexes:function(){return{boundaries:_boundaryMap,branchOfMap:_branchOfMap,directThrough:_directThrough};}
  };

  if(window.UNIFIED_LINES){init();}
})();
