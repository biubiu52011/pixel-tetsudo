/* Line-scoped cold loading. SQL train-runs retains timetable ownership.
 * Classic dynamic scripts use async=false to preserve dependency order.
 */
(function () {
  "use strict";
  var loaded = Object.create(null), queue = Promise.resolve();
  function selectedUrls(lineId) {
    var id = String(lineId || "");
    if (!/^[A-Za-z0-9._:-]{1,100}$/.test(id)) throw new Error("Invalid line ID");
    var template = document.getElementById("pt-trains-detail-assets");
    if (!template || !template.content) throw new Error("Train assets missing");
    var urls = [];
    Array.prototype.forEach.call(template.content.querySelectorAll("[data-script-src]"), function(node) {
      var scope = node.getAttribute("data-line-scope");
      if (scope && scope.split(",").indexOf(id) < 0) return;
      var url = node.getAttribute("data-script-src");
      if (!/^\.\.\/(?:js|data)\/[a-zA-Z0-9_./-]+\.js\?v=[a-f0-9]{12}$/.test(url) ||
          url.indexOf("..", 3) !== -1) throw new Error("Invalid train asset URL");
      urls.push(url);
    });
    if (!urls.length || new Set(urls).size !== urls.length)
      throw new Error("Invalid or duplicate train assets");
    return urls;
  }
  function isReady(lineId) {
    try { return selectedUrls(lineId).every(function(url) { return loaded[url] === true; }); }
    catch(e) { return false; }
  }
  function insertInBatches(urls) {
    if (!urls.length) return Promise.resolve();
    return new Promise(function(resolve, reject) {
      function batch(from) {
        if (from >= urls.length) {
          window.dispatchEvent(new CustomEvent("pt:train-detail-ready"));
          resolve();
          return;
        }
        var end = Math.min(from + 4, urls.length);
        var remaining = end - from, failed = false;
        for (var i = from; i < end; i++) {
          (function(url) {
            var script = document.createElement("script");
            // For dynamically injected classic scripts, defer is ignored.
            script.async = false;
            script.src = url;
            script.onload = function() {
              loaded[url] = true;
              if (!failed && --remaining === 0) setTimeout(function() { batch(end); }, 0);
            };
            script.onerror = function() {
              if (failed) return;
              failed = true;
              reject(new Error("Train asset failed: " + this.src));
            };
            document.head.appendChild(script);
          })(urls[i]);
        }
      }
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(function() { setTimeout(function() { batch(0); }, 0); });
      } else setTimeout(function() { batch(0); }, 0);
    });
  }
  function load(lineId) {
    var urls;
    try { urls = selectedUrls(lineId); }
    catch(e) { return Promise.reject(e); }
    if (urls.every(function(url) { return loaded[url]; })) return Promise.resolve();
    // Serial queue preserves script order through rapid line switches; a
    // failed request can be retried without re-executing successful assets.
    var pending = queue.catch(function() {}).then(function() {
      return insertInBatches(urls.filter(function(url) { return !loaded[url]; }));
    });
    queue = pending;
    return pending;
  }
  window.TrainsDetailLoader = { load: load, isReady: isReady };
})();
