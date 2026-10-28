/* RAF polyfill: 无头/不可见页面 requestAnimationFrame 不触发会卡死 MapLibre 渲染循环。
   setTimeout 16ms 驱动 ≈ 60fps；用户端 RAF 正常时按此策略（__rafWorks 为 true 即跳过）。 */
(function () {
  if (typeof window.requestAnimationFrame !== 'function' || !window.__rafWorks) {
    window.__rafWorks = true;
    window.requestAnimationFrame = function (cb) {
      return setTimeout(function () { cb(performance.now()); }, 16);
    };
    window.cancelAnimationFrame = function (id) { clearTimeout(id); };
  }
})();
