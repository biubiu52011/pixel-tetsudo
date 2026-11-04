/* Cold start: only load map, number ranges and PNG logic after line selection.
 * Dynamic classic scripts with async=false execute in insertion order. */
(function () {
  "use strict";
  var flight = null, ready = false;
  function isReady() { return ready; }
  function load() {
    if (ready) return Promise.resolve();
    if (flight) return flight;
    var template = document.getElementById("pt-trains-detail-assets");
    if (!template || !template.content) return Promise.reject(new Error("Train assets missing"));
    var urls = Array.prototype.map.call(
      template.content.querySelectorAll("[data-script-src]"),
      function (node) { return node.getAttribute("data-script-src"); }
    );
    if (!urls.length || urls.some(function(url) {
      return !/^\.\.\/(?:js|data)\/[a-zA-Z0-9_./-]+\.js\?v=[a-f0-9]{12}$/.test(url) ||
        url.indexOf("..", 3) !== -1;
    })) return Promise.reject(new Error("Invalid train asset list"));
    flight = new Promise(function (resolve, reject) {
      function batch(from) {
        if (from === urls.length) {
          ready = true;
          window.dispatchEvent(new CustomEvent("pt:train-detail-ready"));
          resolve();
          return;
        }
        var end = Math.min(from + 4, urls.length);
        var remaining = end - from, failed = false;
        for (var i = from; i < end; i++) {
          var script = document.createElement("script");
          // On dynamically inserted scripts, defer is ignored. async=false
          // preserves manifest execution order even under parallel downloads.
          script.async = false;
          script.src = urls[i];
          script.onload = function () {
            if (!failed && --remaining === 0) {
              setTimeout(function () { batch(end); }, 0);
            }
          };
          script.onerror = function () {
            if (failed) return;
            failed = true;
            reject(new Error("Train asset failed: " + this.src));
          };
          document.head.appendChild(script);
        }
      }
      // Give loading feedback a full paint opportunity first.
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(function () { setTimeout(function () { batch(0); }, 0); });
      } else setTimeout(function () { batch(0); }, 0);
    });
    return flight;
  }
  window.TrainsDetailLoader = { load: load, isReady: isReady };
})();
