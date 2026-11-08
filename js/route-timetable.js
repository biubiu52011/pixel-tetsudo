/** Route search schedule owner: JST service day, dated sources and feasible connections. */
(function() {
  'use strict';
  function key(s) { return String(s || '').split('.').pop().replace(/-/g, ''); }
  function parseTime(s) {
    if (!/^\d{1,2}:\d{2}$/.test(String(s || ''))) return null;
    var p = s.split(':').map(Number);
    if (p[0] > 27 || p[1] > 59) return null;
    return (p[0] < 4 ? p[0] + 24 : p[0]) * 60 + p[1];
  }
  // Date facts are owned by RuntimeConfig, also used by TrainPositionEstimator.
  // Home loads the lightweight config bundle without loading the estimator.
  function calendarsForDate(date) {
    var estimator = window.TrainPositionEstimator;
    if (estimator && typeof estimator.getCalendarsForDate === 'function') {
      return estimator.getCalendarsForDate(date).map(function(c){return c.split(':').pop();});
    }
    var table = window.RuntimeConfig && window.RuntimeConfig.PUBLISHED_JP_HOLIDAYS;
    var published = table && table[date.slice(0,4)];
    var parsed = new Date(date + 'T12:00:00Z');
    if (!Array.isArray(published) || isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0,10) !== date) return [];
    var day = parsed.getUTCDay(), override = window.RuntimeConfig &&
      window.RuntimeConfig.SERVICE_DAY_CALENDAR &&
      window.RuntimeConfig.SERVICE_DAY_CALENDAR[date];
    if (override === 'holiday') day = 0;
    else if (override === 'weekday') day = 1;
    else if (override === 'saturday') day = 6;
    else if (published.indexOf(date.slice(5)) >= 0) day = 0;
    return day === 0 ? ['Holiday','SaturdayHoliday','Sunday'] :
      day === 6 ? ['Saturday','SaturdayHoliday'] : ['Weekday'];
  }
  function context(options) {
    options = options || {};
    var now = new Date(Date.now() + 9 * 3600000);
    var mode = options.mode === 'depart' || options.mode === 'arrive' ? options.mode : 'now';
    // Date picker represents a calendar date in Japan, not the service day.
    var calendarDate = mode === 'now' || !options.date ? now.toISOString().slice(0, 10) : options.date;
    var time = mode === 'now' ?
      String(now.getUTCHours()).padStart(2, '0') + ':' + String(now.getUTCMinutes()).padStart(2, '0') :
      options.time;
    var minute = parseTime(time);
    var day = new Date(String(calendarDate || '') + 'T12:00:00Z');
    if (minute == null || isNaN(day.getTime()) ||
        day.toISOString().slice(0,10) !== calendarDate) {
      return { minute:null, mode:mode, date:'', calendars:[] };
    }
    // 00:00–03:59 belong to the previous railway service day (24:00–27:59).
    if (minute >= 24 * 60) day.setUTCDate(day.getUTCDate() - 1);
    var date = day.toISOString().slice(0, 10);
    return { minute:minute, mode:mode, date:date,
      calendars:calendarsForDate(date) };
  }
  function candidates(rows, from, to, ctx) {
    var out = [];
    (rows || []).forEach(function(tt) {
      if (tt._serviceDate && tt._serviceDate !== ctx.date) return;
      var cal = String(tt['odpt:calendar'] || '').split(':').pop();
      // Dated provider rows are authoritative. Never substitute another calendar.
      if (!tt._serviceDate && (!cal || ctx.calendars.indexOf(cal) < 0)) return;
      var stops = tt['odpt:trainTimetableObject'] || [], start = -1;
      for (var i=0;i<stops.length;i++) {
        var stop = stops[i], station = key(stop['odpt:departureStation'] || stop['odpt:arrivalStation']);
        if (start < 0 && station === key(from)) start = i;
        else if (start >= 0 && station === key(to)) {
          var dep = stops[start]['odpt:departureTime'];
          var publishedArrival = stop['odpt:arrivalTime'] || null;
          var arr = publishedArrival || stop['odpt:departureTime'];
          var d = parseTime(dep), a = parseTime(arr);
          if (d != null && a != null && a >= d) out.push({
            dep:dep,arr:arr,depMin:d,arrMin:a,
            arrivalClockConfirmed:!!publishedArrival,
            train:tt['odpt:trainNumber'] || '',calendar:cal,
            trainType:tt['odpt:trainType'] || '',
            serviceName:tt._sqlServiceName || '',
            destination:key((tt['odpt:destinationStation'] || [])[0] ||
              stops[stops.length-1]['odpt:arrivalStation'] ||
              stops[stops.length-1]['odpt:departureStation']),
            canonicalId:tt._canonicalTrainTimetableId || null,
            canonicalEvidence:tt._canonicalGroupEvidence || ''
          });
          break;
        }
      }
    });
    return out;
  }
  function findNextTrain(rows, from, to, minute, calendars, filter) {
    var ctx=context(); if(calendars) ctx.calendars=calendars.map(function(c){return c.split(':').pop();});
    return candidates(rows,from,to,ctx).filter(function(h){return h.depMin>=minute && (!filter || filter[h.train]);}).sort(function(a,b){return a.arrMin-b.arrMin || a.depMin-b.depMin;})[0] || null;
  }
  function load(id, serviceDate) {
    var client=window.ODPTClient, line=window.RailwayDB && window.RailwayDB.getLine(id);
    if(!client || !line || !client.getCachedTrainRuns) return Promise.resolve([]);
    // Query the selected journey date, not the train map's current service day.
    return Promise.resolve(client.getCachedTrainRuns(id, serviceDate)).catch(function(){return [];});
  }
  function buffer(tx) { return Math.max(3, Number(tx && tx.walkingDuration) || 0); }
  function through(tx,a,b) {
    if (!(tx && tx.through && a && b && a.train && a.train===b.train &&
          a.calendar && a.calendar===b.calendar)) return false;
    // A shared train number alone cannot bridge a long layover.
    // Accept only a plausible published boundary with a short handoff.
    var gap=b.depMin-a.arrMin;
    if (gap<0 || gap>10) return false;
    if (a.canonicalEvidence==='verified_continuation' &&
        b.canonicalEvidence==='verified_continuation' &&
        a.canonicalId && b.canonicalId && a.canonicalId!==b.canonicalId)
      return false;
    return true;
  }
  function enrichSegments(segments, options) {
    var ctx=context(options), rides=[], transfers=[];
    (segments || []).forEach(function(s,i){if(s.type==='ride') rides.push({seg:s,idx:i});else if(s.type==='transfer') transfers[rides.length-1]={seg:s,idx:i};});
    if(ctx.minute==null || !rides.length) return Promise.resolve({times:{},complete:false,reason:'invalid'});
    var ids=Array.from(new Set(rides.map(function(r){return r.seg.lineId;})));
    return Promise.all(ids.map(function(id){return load(id,ctx.date);})).then(function(lists){
      var choices=rides.map(function(r){return candidates(lists[ids.indexOf(r.seg.lineId)],r.seg.fromStation,r.seg.toStation,ctx);});
      // Dynamic programming retains alternate train choices; greedy boarding can miss a later express or feasible transfer.
      var reverse=ctx.mode==='arrive', states=[{cursor:ctx.minute,hits:[],train:null}], order=rides.map(function(_,i){return i;});
      if(reverse) order.reverse();
      order.forEach(function(i){
        var next=[];
        choices[i].forEach(function(hit){
          var best=null;
          states.forEach(function(state){
            var neighbor=state.hits[reverse ? i+1 : i-1];
            var tx=transfers[reverse ? i : i-1], same=reverse ? through(tx && tx.seg,hit,neighbor) : through(tx && tx.seg,neighbor,hit);
            var gap=neighbor && !same ? buffer(tx && tx.seg) : 0;
            var feasible=reverse ? hit.arrMin+gap<=state.cursor : hit.depMin>=state.cursor+gap;
            if(feasible && (!best || (reverse ? state.hits[rides.length-1].arrMin>best.hits[rides.length-1].arrMin : state.hits[0].depMin>best.hits[0].depMin))) best=state;
          });
          if(best){var hits=best.hits.slice();hits[i]=hit;next.push({cursor:reverse ? hit.depMin : hit.arrMin,hits:hits});}
        });
        states=next;
      });
      states.sort(function(a,b){return reverse ? b.cursor-a.cursor : a.cursor-b.cursor;});
      if(!states.length) {
        // At 00:00–03:59 JST, there may be no more trains on the
        // previous railway service day. For "now" only, continue to the
        // next morning instead of leaving an empty journey until 04:00.
        // An explicit 03:00 departure or arrival search keeps its date.
        if(ctx.mode==='now' && ctx.minute>=24*60) {
          var nextDay=new Date(ctx.date+'T12:00:00Z');
          nextDay.setUTCDate(nextDay.getUTCDate()+1);
          var nextDate=nextDay.toISOString().slice(0,10);
          return enrichSegments(segments,{mode:'depart',date:nextDate,time:'04:00'})
            .then(function(nextPlan) {
              if(nextPlan && nextPlan.complete) {
                nextPlan.initialWait+=Math.max(0,28*60-ctx.minute);
                nextPlan.nextServiceMorning=true;
              }
              return nextPlan;
            });
        }
        return {times:{},complete:false,reason:'no-service',serviceDate:ctx.date};
      }
      var hits=states[0].hits, times={}, connections={}, downgrade=[];
      hits.forEach(function(hit,i){times[rides[i].idx]=hit;
        // Direction-wide ranges are not confirmed boarding platforms.
        if(window.PlatformResolver && window.PlatformResolver.resolveTrain) {
          try {
            var resolver=window.PlatformResolver,segment=rides[i].seg;
            hit.platform=resolver.resolveTrain(segment.lineId,hit.train,hit.calendar,ctx.date,segment.fromStation,hit.dep,'departure');
            hit.arrivalPlatform=resolver.resolveTrain(segment.lineId,hit.train,hit.calendar,ctx.date,segment.toStation,hit.arr,'arrival');
          } catch(e) {}
        }
        if(i){var tx=transfers[i-1], same=through(tx && tx.seg,hits[i-1],hit), total=hit.depMin-hits[i-1].arrMin;
          if(tx){connections[tx.idx]={through:same,total:total,walk:same ? 0 : buffer(tx.seg),wait:same ? 0 : total-buffer(tx.seg),arrivalPlatform:!same?(hits[i-1].arrivalPlatform||null):null,departurePlatform:!same?(hit.platform||null):null};if(tx.seg.through && !same) downgrade.push(tx.idx);}}
      });
      return {times:times,connections:connections,downgrade:downgrade,complete:true,serviceDate:ctx.date,departure:hits[0].dep,arrival:hits[hits.length-1].arr,durationMin:hits[hits.length-1].arrMin-hits[0].depMin,initialWait:ctx.mode==='arrive' ? 0 : hits[0].depMin-ctx.minute};
    });
  }
  window.RouteTimetable={enrichSegments:enrichSegments,findNextTrain:findNextTrain};
})();
