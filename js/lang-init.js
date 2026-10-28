/*
 * i18n 语言初始化。
 */

(function() {
    "use strict";

    var STORAGE_KEY = "i18n_lang";
    var SUPPORTED = ["ja", "zh", "ko", "en"];
    var DEFAULT_LANG = "ja";
    // This existing script runs before stylesheets, so saved-language pages do
    // not first download a different language's full font.
    try {
        var fontLang = localStorage.getItem(STORAGE_KEY);
        window.currentLang = SUPPORTED.indexOf(fontLang) >= 0 ? fontLang : DEFAULT_LANG;
        document.documentElement.lang = window.currentLang;
    } catch (e) { document.documentElement.lang = DEFAULT_LANG; }

    // 供其他脚本使用的公共 API。
    var listeners = [];
    // 保持幂等：重新定义时保留已有监听器。
    if (typeof window.onLanguageChange !== 'function') {
        window.onLanguageChange = function(callback) { listeners.push(callback); };
    }
    window.triggerLanguageChange = function() {
        listeners.forEach(function(cb) { cb(); });
    };

    var currentIndex = -1;

    function updateOperatorNames() {
        if (typeof window.t === 'function' && typeof window.TransitConstants === 'object') {
            var _opNames = {};
            // 从 TransitConstants.OP_ORDER 派生，不再手写重复清单
            var _opIds = (window.TransitConstants && Array.isArray(window.TransitConstants.OP_ORDER)) ? window.TransitConstants.OP_ORDER.slice() : [];
            for (var _i = 0; _i < _opIds.length; _i++) {
                var _key = 'op.' + _opIds[_i];
                _opNames[_opIds[_i]] = window.t(_key) || _opIds[_i];
            }
            window.TransitConstants.OP_NAMES = _opNames;
            // OP_ORDER controls sorting only. Newly added operators may not be in
            // that list yet, but must still resolve their existing op.<id> i18n key.
            window.tOp = function(name) {
                if (!name) return '';
                var translated = (typeof window.t === 'function') ? window.t('op.' + name) : '';
                if (translated && translated !== 'op.' + name) return translated;
                return (window.TransitConstants && window.TransitConstants.OP_NAMES && window.TransitConstants.OP_NAMES[name]) || name;
            };
        }
    }

    function applyLang(lang) {
        if (typeof window.t !== "function") return false;
        window.currentLang = lang;
        document.documentElement.lang = lang;
        updateSwitcherUI(lang);
        updateTranslations();
        updateOperatorNames();
        _updatePageTitle();
        triggerLanguageChange();
        return true;
    }

    function updateSwitcherUI(lang) {
        document.querySelectorAll(".lang-btn").forEach(function(btn) {
            var isActive = btn.getAttribute("data-lang") === lang;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        currentIndex = Array.from(document.querySelectorAll(".lang-btn"))
            .findIndex(function(btn) { return btn.getAttribute("data-lang") === lang; });
    }

    function updateTranslations() {
        if (typeof window.t !== "function") return;
        document.querySelectorAll("[data-i18n]").forEach(function(el) {
            var key = el.getAttribute("data-i18n");
            var translated = window.t(key, el.textContent);
            if (translated !== el.textContent) el.textContent = translated;
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el) {
            var key = el.getAttribute("data-i18n-placeholder");
            var translated = window.t(key, el.placeholder);
            if (translated !== el.placeholder) el.placeholder = translated;
        });
    }


    // 动态更新页面标题。
    var _pageTitleMap = {
      ja: { home: '路線検索 | PIXEL TETSUDO', tourism: '観光詳細 - PIXEL TETSUDO', trains: '列車リアルタイム - PIXEL TETSUDO', realtime: '運行状況 - PIXEL TETSUDO', history: '履歴 - PIXEL TETSUDO' },
      en: { home: 'Route Search | PIXEL TETSUDO', tourism: 'Tourism Detail - PIXEL TETSUDO', trains: 'Real-time Trains - PIXEL TETSUDO', realtime: 'Realtime Status - PIXEL TETSUDO', history: 'History - PIXEL TETSUDO' },
      zh: { home: '路线搜索 | PIXEL TETSUDO', tourism: '景点详情 - PIXEL TETSUDO', trains: '列车实时 - PIXEL TETSUDO', realtime: '运行状态 - PIXEL TETSUDO', history: '历史记录 - PIXEL TETSUDO' },
      ko: { home: '경로 검색 | PIXEL TETSUDO', tourism: '관광 상세 - PIXEL TETSUDO', trains: '실시간 열차 - PIXEL TETSUDO', realtime: '운행 상태 - PIXEL TETSUDO', history: '검색 기록 - PIXEL TETSUDO' }
    };
    var _pageDescMap = {
      ja: { home: 'JR・私鉄・地下鉄の路線検索と運行状況、東京の観光スポット案内', tourism: '東京の観光スポット詳細 - Pixel Tetsudo', trains: 'JR\u30fb\u79c1\u9244\u306e\u5217\u8eca\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u60c5\u5831 - Pixel Tetsudo', realtime: '電車の実時間運行状況 - Pixel Tetsudo', history: '検索履歴 - Pixel Tetsudo' },
      en: { home: 'JR, Private & Subway Route Search and Realtime Status, Tokyo Tourism', tourism: 'Tokyo Tourism Spot Details - Pixel Tetsudo', trains: 'Real-time Train Info for JR & Private Lines - Pixel Tetsudo', realtime: 'Realtime Train Status - Pixel Tetsudo', history: 'Search History - Pixel Tetsudo' },
      zh: { home: 'JR、私铁、地铁路线搜索与运行状态，东京观光景点指南', tourism: '东京观光景点详情 - Pixel Tetsudo', trains: 'JR与私铁列车实时信息 - Pixel Tetsudo', realtime: '列车实时运行状态 - Pixel Tetsudo', history: '搜索历史 - Pixel Tetsudo' },
      ko: { home: 'JR·사철·지하철 노선 검색 및 운행 상황, 도쿄 관광 명소 안내', tourism: '도쿄 관광지 상세 - Pixel Tetsudo', trains: 'JR·사철 열차 실시간 정보 - Pixel Tetsudo', realtime: '열차 실시간 운행 상태 - Pixel Tetsudo', history: '검색 기록 - Pixel Tetsudo' }
    };
    function _updatePageTitle() {
      if (!window.currentLang) return;
      var hash = location.hash || '';
      var pathname = location.pathname || '';
      var page = 'home';
      if (pathname.indexOf('tourism') !== -1 || hash.indexOf('tourism') !== -1) page = 'tourism';
      else if (pathname.indexOf('trains') !== -1 || hash.indexOf('trains') !== -1) page = 'trains';
      else if (pathname.indexOf('realtime') !== -1 || hash.indexOf('realtime') !== -1) page = 'realtime';
      else if (pathname.indexOf('history') !== -1 || hash.indexOf('history') !== -1) page = 'history';
      var map = (_pageTitleMap[window.currentLang] || _pageTitleMap.ja);
      document.title = map[page] || map.home;
      // 更新 pixel-title H1 元素。
      var titleEl = document.querySelector('.pixel-title');
      if (titleEl && typeof window.t === 'function') {
        titleEl.textContent = window.t('app.title');
      }
      // 更新 meta description。
      var descMap = (_pageDescMap[window.currentLang] || _pageDescMap.ja);
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', descMap[page] || descMap.home);
      // 更新 html 的 lang 属性。
      var htmlEl = document.querySelector('html');
      if (htmlEl) htmlEl.setAttribute('lang', window.currentLang);
    }

    function openSwitcher() {
        var sw = document.getElementById("langSwitcher");
        if (sw) sw.classList.add("expanded");
        var btn = document.getElementById("langToggleBtn");
        if (btn) btn.setAttribute("aria-expanded", "true");
        var opts = document.querySelectorAll(".lang-btn");
        if (opts.length > 0 && currentIndex >= 0) {
            opts[currentIndex].focus();
        } else if (opts.length > 0) {
            opts[0].focus();
        }
    }

    function closeSwitcher(restoreFocus) {
        var sw = document.getElementById("langSwitcher");
        var wasExpanded = sw && sw.classList.contains("expanded");
        if (sw) sw.classList.remove("expanded");
        var btn = document.getElementById("langToggleBtn");
        if (btn) {
            btn.setAttribute("aria-expanded", "false");
            if (wasExpanded && restoreFocus !== false) btn.focus();
        }
    }

    function selectLanguage(lang) {
        if (SUPPORTED.indexOf(lang) === -1) return;
        applyLang(lang);
        localStorage.setItem(STORAGE_KEY, lang);
        closeSwitcher();
    }

    function init() {
        var toggleBtn = document.getElementById("langToggleBtn");
        var switcher = document.getElementById("langSwitcher");
        if (!toggleBtn || !switcher) return;

        // SiteShell 重新挂载时只替换控件，不改变语言或其订阅者。
        var savedLang = localStorage.getItem(STORAGE_KEY);
        var currentLang = SUPPORTED.indexOf(savedLang) !== -1 ? savedLang : DEFAULT_LANG;
        window.currentLang = currentLang;
        updateSwitcherUI(currentLang);
        updateTranslations();
        updateOperatorNames();
        _updatePageTitle();
    }

    // 只在 document 上绑定一次，使 SiteShell.render 可以替换自身标记。
    document.addEventListener("click", function(e) {
        var toggleBtn = document.getElementById("langToggleBtn");
        var switcher = document.getElementById("langSwitcher");
        if (!toggleBtn || !switcher) return;
        if (toggleBtn.contains(e.target)) {
            if (switcher.classList.contains("expanded")) closeSwitcher();
            else openSwitcher();
            return;
        }
        if (switcher.contains(e.target)) {
            var btn = e.target.closest(".lang-btn");
            if (btn) selectLanguage(btn.getAttribute("data-lang"));
            else closeSwitcher();
            return;
        }
        closeSwitcher(false);
    });

    document.addEventListener("keydown", function(e) {
        var switcher = document.getElementById("langSwitcher");
        if (!switcher || !switcher.classList.contains("expanded")) return;

        var opts = Array.from(document.querySelectorAll(".lang-btn"));
        if (opts.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                currentIndex = (currentIndex + 1) % opts.length;
                opts[currentIndex].focus();
                break;
            case "ArrowUp":
                e.preventDefault();
                currentIndex = (currentIndex - 1 + opts.length) % opts.length;
                opts[currentIndex].focus();
                break;
            case "Home":
                e.preventDefault();
                currentIndex = 0;
                opts[0].focus();
                break;
            case "End":
                e.preventDefault();
                currentIndex = opts.length - 1;
                opts[currentIndex].focus();
                break;
            case "Escape":
                e.preventDefault();
                closeSwitcher();
                break;
            case "Enter":
            case " ":
                if (document.activeElement.classList.contains("lang-btn")) {
                    e.preventDefault();
                    selectLanguage(document.activeElement.getAttribute("data-lang"));
                }
                break;
        }
    });

    document.addEventListener("pt:site-shell-ready", init);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
