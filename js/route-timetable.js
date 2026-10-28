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
  function context(options) {
    options = options || {};
    var now = new Date(Date.now() + 9 * 3600000);
    var minute = parseTime(options.mode === 'now' || !options.mode ? now.getUTCHours() + ':' + String(now.getUTCMinutes()).padStart(2, '0') : options.time);
    var day = new Date(now.getTime());
    if (now.getUTCHours() < 4) day.setUTCDate(day.getUTCDate() - 1);
    return { minute:minute, mode:options.mode || 'now', date:day.toISOString().slice(0,10),
      calendars:day.getUTCDay() === 0 ? ['Holiday','Sunday','SaturdayHoliday'] : day.getUTCDay() === 6 ? ['Saturday','SaturdayHoliday'] : ['Weekday'] };
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
          var dep = stops[start]['odpt:departureTime'], arr = stop['odpt:arrivalTime'] || stop['odpt:departureTime'];
          var d = parseTime(dep), a = parseTime(arr);
          if (d != null && a != null && a >= d) out.push({dep:dep,arr:arr,depMin:d,arrMin:a,train:tt['odpt:trainNumber'] || '',destination:key(stops[stops.length-1]['odpt:arrivalStation'] || stops[stops.length-1]['odpt:departureStation'])});
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
  function load(id) {
    var client=window.ODPTClient, line=window.RailwayDB && window.RailwayDB.getLine(id);
    if(!client || !line || !client.getCachedTrainRuns) return Promise.resolve([]);
    // One dated plan source; neither empty calendars nor failures revive local tables.
    return Promise.resolve(client.getCachedTrainRuns(id)).catch(function(){return [];});
  }
  function buffer(tx) { return Math.max(3, Number(tx && tx.walkingDuration) || 0); }
  function through(tx,a,b) { return !!(tx && tx.through && a && b && a.train && a.train===b.train && b.depMin>=a.arrMin); }
  function enrichSegments(segments, options) {
    var ctx=context(options), rides=[], transfers=[];
    (segments || []).forEach(function(s,i){if(s.type==='ride') rides.push({seg:s,idx:i});else if(s.type==='transfer') transfers[rides.length-1]={seg:s,idx:i};});
    if(ctx.minute==null || !rides.length) return Promise.resolve({times:{},complete:false,reason:'invalid'});
    var ids=Array.from(new Set(rides.map(function(r){return r.seg.lineId;})));
    return Promise.all(ids.map(function(id){return load(id);})).then(function(lists){
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
      if(!states.length) return {times:{},complete:false,reason:'no-service',serviceDate:ctx.date};
      var hits=states[0].hits, times={}, connections={}, downgrade=[];
      hits.forEach(function(hit,i){times[rides[i].idx]=hit;
        if(window.PlatformResolver && window.PlatformResolver.resolve) {
          try { var platform=window.PlatformResolver.resolve(rides[i].seg.lineId,rides[i].seg.fromStation,rides[i].seg.direction);if(platform) hit.platform=platform; } catch(e) {}
        }
        if(i){var tx=transfers[i-1], same=through(tx && tx.seg,hits[i-1],hit), total=hit.depMin-hits[i-1].arrMin;
          if(tx){connections[tx.idx]={through:same,total:total,walk:same ? 0 : buffer(tx.seg),wait:same ? 0 : total-buffer(tx.seg)};if(tx.seg.through && !same) downgrade.push(tx.idx);}}
      });
      return {times:times,connections:connections,downgrade:downgrade,complete:true,serviceDate:ctx.date,departure:hits[0].dep,arrival:hits[hits.length-1].arr,durationMin:hits[hits.length-1].arrMin-hits[0].depMin,initialWait:ctx.mode==='arrive' ? 0 : hits[0].depMin-ctx.minute};
    });
  }
  window.RouteTimetable={enrichSegments:enrichSegments,findNextTrain:findNextTrain};
})();
