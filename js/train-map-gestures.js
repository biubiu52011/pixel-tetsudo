/* The train route layout has a fixed viewBox; this independent camera handles
 * user interaction without changing station/track/train coordinates. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var MAX_ZOOM = 4;

  function attach(svg) {
    if (!svg || svg._disposeTrainMapGestures) return;
    var staticLayer = svg.querySelector(".static-layer");
    var trainLayer = svg.querySelector(".train-layer");
    if (!staticLayer || !trainLayer) return;
    var bounds = svg.__geometry && svg.__geometry.contentBounds;
    if (!bounds || !(bounds.width > 0) || !(bounds.height > 0)) return;

    var camera = document.createElementNS(NS, "g");
    camera.setAttribute("class", "tp-gesture-camera");
    camera.appendChild(staticLayer);
    camera.appendChild(trainLayer);
    svg.appendChild(camera);

    var width = bounds.width, height = bounds.height;
    var zoom = 1, x = 0, y = 0;
    var pointers = new Map(), pinch = null, lastTap = null;
    var tracking = false;

    function limit(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }
    function point(clientX, clientY) {
      var rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * width / (rect.width || 1),
        y: (clientY - rect.top) * height / (rect.height || 1)
      };
    }
    function paint() {
      x = limit(x, width * (1 - zoom), 0);
      y = limit(y, height * (1 - zoom), 0);
      camera.setAttribute("transform", "translate(" + x + " " + y + ") scale(" + zoom + ")");
      svg.classList.toggle("tp-gesture-zoomed", zoom > 1.001);
    }
    function zoomAt(factor, clientX, clientY) {
      var next = limit(zoom * factor, 1, MAX_ZOOM);
      if (next === zoom) return;
      var p = point(clientX, clientY);
      x = p.x - (p.x - x) * next / zoom;
      y = p.y - (p.y - y) * next / zoom;
      zoom = next;
      paint();
    }
    function center() {
      var r = svg.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    function stopTracking() {
      if (!tracking) return;
      tracking = false;
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onEnd, true);
      document.removeEventListener("pointercancel", onEnd, true);
    }
    function onDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Folded train badges own their taps; do not turn those into camera gestures.
      if (e.target && e.target.closest && e.target.closest("[data-train-fold-badge]")) return;
      pointers.set(e.pointerId, {
        x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY,
        type: e.pointerType, moved: false
      });
      if (!tracking) {
        tracking = true;
        document.addEventListener("pointermove", onMove, true);
        document.addEventListener("pointerup", onEnd, true);
        document.addEventListener("pointercancel", onEnd, true);
      }
      if (pointers.size === 2) {
        var pts = Array.from(pointers.values());
        pinch = {
          distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2
        };
        pts.forEach(function (p) { p.moved = true; });
        lastTap = null;
      }
      // Do not preventDefault: at normal zoom a single vertical swipe scrolls the page.
    }
    function onMove(e) {
      var p = pointers.get(e.pointerId);
      if (!p) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 8) p.moved = true;
      p.x = e.clientX;
      p.y = e.clientY;

      if (pointers.size >= 2) {
        var pts = Array.from(pointers.values()).slice(0, 2);
        var distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        var midX = (pts[0].x + pts[1].x) / 2;
        var midY = (pts[0].y + pts[1].y) / 2;
        if (pinch && pinch.distance > 0 && distance > 0) {
          var oldMid = point(pinch.x, pinch.y);
          var newMid = point(midX, midY);
          var next = limit(zoom * distance / pinch.distance, 1, MAX_ZOOM);
          x = newMid.x - (oldMid.x - x) * next / zoom;
          y = newMid.y - (oldMid.y - y) * next / zoom;
          zoom = next;
          paint();
        }
        pinch = { distance: distance, x: midX, y: midY };
        if (e.cancelable) e.preventDefault();
        return;
      }
      if (zoom > 1.001 && (p.type !== "mouse" || e.buttons === 1)) {
        var rect = svg.getBoundingClientRect();
        x += dx * width / (rect.width || 1);
        y += dy * height / (rect.height || 1);
        paint();
        if (e.cancelable) e.preventDefault();
      }
    }
    function onEnd(e) {
      var p = pointers.get(e.pointerId);
      if (!p) return;
      pointers.delete(e.pointerId);
      pinch = null;
      if (pointers.size === 0) stopTracking();
      // A double tap away from train badges zooms in; repeating it resets the view.
      if (e.type === "pointerup" && p.type === "touch" && !p.moved && pointers.size === 0) {
        var now = Date.now();
        if (lastTap && now - lastTap.at < 330 &&
            Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24) {
          zoomAt(zoom > 1.25 ? 1 / zoom : 1.75, e.clientX, e.clientY);
          lastTap = null;
        } else {
          lastTap = { at: now, x: e.clientX, y: e.clientY };
        }
      } else {
        lastTap = null;
      }
    }
    function onWheel(e) {
      // Ordinary wheel movement must still scroll long route pages.
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.cancelable) e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    }
    function onDoubleClick(e) {
      if (e.target && e.target.closest && e.target.closest("[data-train-fold-badge]")) return;
      if (e.cancelable) e.preventDefault();
      zoomAt(e.shiftKey || zoom > 1.25 ? 1 / zoom : 1.75, e.clientX, e.clientY);
    }
    function onKeyDown(e) {
      if (e.target !== svg) return;
      var c = center(), step = 35;
      if (e.key === "+" || e.key === "=") zoomAt(1.25, c.x, c.y);
      else if (e.key === "-") zoomAt(0.8, c.x, c.y);
      else if (e.key === "0") zoomAt(1 / zoom, c.x, c.y);
      else if (zoom > 1.001 && e.key === "ArrowLeft") { x += step; paint(); }
      else if (zoom > 1.001 && e.key === "ArrowRight") { x -= step; paint(); }
      else if (zoom > 1.001 && e.key === "ArrowUp") { y += step; paint(); }
      else if (zoom > 1.001 && e.key === "ArrowDown") { y -= step; paint(); }
      else return;
      e.preventDefault();
    }
    svg.setAttribute("tabindex", "0");
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("dblclick", onDoubleClick);
    svg.addEventListener("keydown", onKeyDown);
    svg._disposeTrainMapGestures = function () {
      stopTracking();
      pointers.clear();
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("dblclick", onDoubleClick);
      svg.removeEventListener("keydown", onKeyDown);
      delete svg._disposeTrainMapGestures;
    };
    paint();
  }

  window.TrainMapGestures = { attach: attach };
})();
