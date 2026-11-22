/*
 * i18n 语言初始化。
 */

(function() {
    "use strict";

    var STORAGE_KEY = "i18n_lang";
    var SUPPORTED = ["ja", "zh", "ko", "en"];
    var DEFAULT_LANG = "ja";
    // Select the browser language on the first visit, preserving explicit choices.
    // Run in <head> to prevent a flash of the wrong language/font.
    function preferredLanguage() {
        var locales = [];
        try {
            if (navigator.languages) locales = Array.prototype.slice.call(navigator.languages);
            if (navigator.language) locales.push(navigator.language);
        } catch (e) { /* embedded browsers may block language access */ }
        for (var i = 0; i < locales.length; i++) {
            var code = String(locales[i] || "").toLowerCase().split(/[-_]/)[0];
            if (SUPPORTED.indexOf(code) >= 0) return code;
        }
        return DEFAULT_LANG;
    }
    function savedOrPreferredLanguage() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (SUPPORTED.indexOf(saved) >= 0) return saved;
        } catch (e) { /* private browsing may block storage */ }
        return preferredLanguage();
    }
    window.currentLang = savedOrPreferredLanguage();
    document.documentElement.lang = window.currentLang;

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

    function updateSwitcherAccessibility(lang) {
        var names = {
            ja: ["言語を変更", "言語を選択"],
            zh: ["切换语言", "选择语言"],
            ko: ["언어 변경", "언어 선택"],
            en: ["Switch language", "Select language"]
        };
        var labels = names[lang] || names.ja;
        var toggle = document.getElementById("langToggleBtn");
        var list = document.getElementById("langSwitcher");
        if (toggle) {
            toggle.setAttribute("aria-label", labels[0]);
            toggle.setAttribute("title", labels[0]);
        }
        if (list) list.setAttribute("aria-label", labels[1]);
    }

    function applyLang(lang) {
        if (typeof window.t !== "function") return false;
        window.currentLang = lang;
        document.documentElement.lang = lang;
        updateSwitcherUI(lang);
        updateSwitcherAccessibility(lang);
        updateTranslations();
        updateOperatorNames();
        _updatePageTitle();
        window.triggerLanguageChange();
        // Subscribers may synchronously replace tourism/report DOM nodes.
        if (window.SiteAutoTranslate) window.SiteAutoTranslate.scan(document);
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
        document.querySelectorAll("[data-i18n-aria-label]").forEach(function(el) {
            var key = el.getAttribute("data-i18n-aria-label");
            var translated = window.t(key, el.getAttribute("aria-label"));
            if (translated !== el.getAttribute("aria-label")) {
                el.setAttribute("aria-label", translated);
            }
        });
        document.querySelectorAll("[data-i18n-title]").forEach(function(el) {
            var key = el.getAttribute("data-i18n-title");
            var translated = window.t(key, el.getAttribute("title"));
            if (translated !== el.getAttribute("title")) {
                el.setAttribute("title", translated);
            }
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
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
        closeSwitcher();
    }

    function init() {
        var toggleBtn = document.getElementById("langToggleBtn");
        var switcher = document.getElementById("langSwitcher");
        if (!toggleBtn || !switcher) return;

        // SiteShell 重新挂载时只替换控件，不改变语言或其订阅者。
        var currentLang = window.currentLang || savedOrPreferredLanguage();
        window.currentLang = currentLang;
        updateSwitcherUI(currentLang);
        updateSwitcherAccessibility(currentLang);
        updateTranslations();
        updateOperatorNames();
        _updatePageTitle();
        if (window.SiteAutoTranslate) window.SiteAutoTranslate.scan(document);
    }


    // In-site translation for opt-in Japanese free-text content.
    // Static interface copy, official station names, coordinates and train IDs
    // always use the existing dictionaries/railway resolvers instead.
    // Browser on-device Translator is a progressive enhancement: no unofficial
    // translation endpoint, key, cross-origin request or large model dependency.
    var autoCache = new Map();
    var translatorCache = new Map();
    function onDeviceTranslator(lang) {
        var target = lang === "zh" ? "zh-Hans" : lang;
        if (translatorCache.has(target)) return translatorCache.get(target);
        var api = window.Translator;
        if (!api || typeof api.create !== "function" || typeof api.availability !== "function") {
            return Promise.resolve(null);
        }
        var options = { sourceLanguage: "ja", targetLanguage: target };
        var promise = Promise.resolve().then(function() {
            return api.availability(options);
        }).then(function(availability) {
            // Never implicitly download a model (particularly on mobile data).
            if (availability !== "available") return null;
            return api.create(options);
        }).catch(function() { return null; });
        translatorCache.set(target, promise);
        return promise;
    }
    function autoTranslateText(text, lang) {
        var source = String(text == null ? "" : text);
        lang = lang || window.currentLang || DEFAULT_LANG;
        if (!source.trim() || lang === "ja") return Promise.resolve(source);
        if (SUPPORTED.indexOf(lang) < 0) return Promise.resolve(null);
        var key = lang + "\n" + source;
        if (autoCache.has(key)) return autoCache.get(key);
        var task = onDeviceTranslator(lang).then(function(translator) {
            if (!translator || typeof translator.translate !== "function") return null;
            return translator.translate(source);
        }).then(function(result) {
            return typeof result === "string" && result.trim() ? result : null;
        }).catch(function() { return null; });
        autoCache.set(key, task);
        if (autoCache.size > 200) autoCache.delete(autoCache.keys().next().value);
        return task;
    }
    function scanAutoTranslations(root) {
        root = root || document;
        if (!root || typeof root.querySelectorAll !== "function") return;
        var nodes = [];
        if (root.matches && root.matches("[data-auto-translate]")) nodes.push(root);
        root.querySelectorAll("[data-auto-translate]").forEach(function(el) { nodes.push(el); });
        nodes.forEach(function(el) {
            // Only Japanese source paragraphs explicitly marked by their owner.
            if (el.getAttribute("data-auto-translate") !== "ja") return;
            if (typeof el._ptOriginalText !== "string") el._ptOriginalText = el.textContent;
            var source = el._ptOriginalText;
            var lang = window.currentLang || DEFAULT_LANG;
            var revision = (el._ptTranslationRevision || 0) + 1;
            el._ptTranslationRevision = revision;
            if (lang === "ja") {
                el.textContent = source;
                el.setAttribute("lang", "ja");
                return;
            }
            el.textContent = source;
            el.setAttribute("lang", "ja");
            // Do not erase the original when no on-device translator exists.
            autoTranslateText(source, lang).then(function(translation) {
                if (translation && el.isConnected !== false &&
                    el._ptTranslationRevision === revision && window.currentLang === lang) {
                    el.textContent = translation;
                    el.setAttribute("lang", lang);
                    // A successful translation should not still say "unavailable".
                    var wrapper = el.parentNode;
                    if (wrapper && wrapper.classList && wrapper.classList.contains("rs-cause-untranslated")) {
                        var note = wrapper.querySelector(".rs-text-muted");
                        if (note) note.hidden = true;
                    }
                }
            });
        });
    }
    window.SiteAutoTranslate = {
        scan: scanAutoTranslations,
        translateText: autoTranslateText,
        available: function() { return !!(window.Translator &&
            typeof window.Translator.create === "function"); }
    };
    window.setSiteLanguage = function(lang) {
        if (SUPPORTED.indexOf(lang) < 0) return false;
        if (!applyLang(lang)) return false;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
        return true;
    };

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
