/*
 * Pixel Tetsudo - canonical 站点外壳
 *
 * 仅负责共享站点外壳契约：
 * 页头 + 语言切换器 + 主导航 + 页脚。
 * 页面能力/CSP 和业务内容仍由各页面负责。
 */
(function () {
  "use strict";

  var NAV_ITEMS = [
    { page: "home", href: "home.html", tab: "search", key: "tab.search", fallback: "路線検索" },
    { page: "realtime", href: "realtime.html", tab: "status", key: "tab.status", fallback: "運行状況" },
    { page: "trains", href: "trains.html", tab: "trains", key: "tab.trains", fallback: "列車リアルタイム" },
    { page: "history", href: "history.html", tab: "history", key: "tab.history", fallback: "検索履歴" }
  ];

  function escapeHtml(value) {
    if (window.escapeHtml) return window.escapeHtml(String(value == null ? "" : value));
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function normalizePage(page) {
    page = String(page || "").toLowerCase();
    if (page.indexOf("tourism") === 0) return "tourism";
    return ["home", "realtime", "trains", "history"].indexOf(page) >= 0 ? page : "home";
  }

  function detectPage(root) {
    var declared = (root && root.getAttribute("data-page")) || document.body.getAttribute("data-page");
    if (declared) return normalizePage(declared);
    var path = location.pathname || "";
    if (path.indexOf("tourism-") >= 0) return "tourism";
    if (path.indexOf("realtime") >= 0) return "realtime";
    if (path.indexOf("trains") >= 0) return "trains";
    if (path.indexOf("history") >= 0) return "history";
    return "home";
  }

  function headerHtml() {
    return '<header class="pixel-header" data-site-shell="header">' +
      '<div class="header-container"><div class="header-text">' +
      '<h1 class="pixel-title" data-i18n="app.title">ピクセル鉄道</h1></div></div></header>' +
      '<div class="lang-switcher-wrapper" data-site-shell="language">' +
      '<button id="langToggleBtn" class="lang-toggle-btn" title="Switch Language" aria-haspopup="listbox" aria-controls="langSwitcher" aria-expanded="false" aria-label="Switch language">' +
      '<img src="../images/language-globe.svg" alt="Language" class="lang-icon"></button>' +
      '<div id="langSwitcher" class="lang-switcher" role="listbox" aria-label="Select language"><div class="lang-options">' +
      '<button class="lang-btn active" data-lang="ja" data-code="JA" role="option" aria-selected="true">日本語</button>' +
      '<button class="lang-btn" data-lang="zh" data-code="ZH" role="option" aria-selected="false">中文</button>' +
      '<button class="lang-btn" data-lang="ko" data-code="KO" role="option" aria-selected="false">韓国語</button>' +
      '<button class="lang-btn" data-lang="en" data-code="EN" role="option" aria-selected="false">English</button>' +
      '</div></div></div>';
  }

  function navHtml(page) {
    return '<nav class="pixel-tabs" data-site-shell="navigation">' + NAV_ITEMS.map(function (item) {
      var active = item.page === page ? " active" : "";
      var build = document.querySelector('meta[name="pt-build"]');
      var href = item.href + (build ? '?build=' + encodeURIComponent(build.content) : '');
      return '<a href="' + href + '" class="tab-btn' + active + '" data-tab="' +
        escapeHtml(item.tab) + '" data-i18n="' + escapeHtml(item.key) + '">' +
        escapeHtml(item.fallback) + '</a>';
    }).join("") + '</nav>';
  }

  function footerHtml() {
    return '<footer class="pixel-footer" data-site-shell="footer" data-i18n="app.footer">© 2026 ピクセル鉄道</footer>';
  }

  function applyBuildToken(root) {
    var params = new URLSearchParams(location.search || "");
    var build = params.get("build");
    if (!build || !root) return;
    root.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || /^(?:[a-z]+:|\/\/)/i.test(href)) return;
      try {
        var url = new URL(href, location.href);
        url.searchParams.set("build", build);
        link.setAttribute("href", url.pathname.split("/").pop() + url.search + url.hash);
      } catch (_) {}
    });
  }

  function render(root, options) {
    if (!root) throw new Error("SiteShell root is required");
    options = options || {};
    var page = normalizePage(options.page || detectPage(root));
    root.setAttribute("data-site-shell-root", "");
    root.setAttribute("data-page", page);

    var headerMount = root.querySelector('[data-site-shell-mount="header"]');
    var navMount = root.querySelector('[data-site-shell-mount="navigation"]');
    var footerMount = root.querySelector('[data-site-shell-mount="footer"]');
    if (!headerMount || !navMount || !footerMount) {
      throw new Error("SiteShell mounts are incomplete");
    }

    headerMount.innerHTML = headerHtml();
    navMount.innerHTML = navHtml(page);
    footerMount.innerHTML = footerHtml();
    applyBuildToken(root);

    root.setAttribute("data-site-shell-ready", "true");
    document.dispatchEvent(new CustomEvent("pt:site-shell-ready", { detail: { page: page } }));
    return { page: page, root: root };
  }

  function mount(options) {
    options = options || {};
    var root = options.root || document.querySelector("[data-site-shell-root]");
    return render(root, options);
  }

  window.SiteShell = {
    mount: mount,
    render: render,
    detectPage: detectPage,
    applyBuildToken: applyBuildToken,
    NAV_ITEMS: NAV_ITEMS.slice()
  };

  // 各页面使用 script-src 'self'，并明确禁止内联脚本。
  // 因此外部 canonical 外壳会在根节点
  // 解析完成后自行挂载，这正是要求的加载位置。
  var autoRoot = document.querySelector("[data-site-shell-root]");
  if (autoRoot && autoRoot.getAttribute("data-site-shell-ready") !== "true") {
    mount({ root: autoRoot });
  }
})();
