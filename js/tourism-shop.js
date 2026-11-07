/*
 * Tourism Detail - Shop 吃喝玩乐综合商家详情页（餐饮/购物/娱乐/体验）
 * 参考点评网站店铺页信息架构：
 *   顶部图集（点击全屏）→ 白色商家信息卡（费用/营业时间/交通/地址）
 *   → 推荐内容（餐饮/商品/游玩体验）→ 介绍 → 位置地图 → AI 整理注记
 * 复用 TourismDetailCore：数据加载/语言切换/距离口径/地图/翻译；渲染完全自绘（dp- 前缀命名空间，不依赖公共 hero 框架）。
 */
(function() {
  "use strict";

  var C = window.TourismDetailCore;
  if (!C) { console.error('[TourismDetailShop] Core missing'); return; }

  // 本模块只负责 UI：依据现有图片、文字长度和推荐数量自适应布局。
  function shopText(key) {
    var lang = (C.state && C.state.lang) || 'ja';
    var copy = {
      ja: { hours: '営業時間', hint: '訪問のヒント', more: '続きを読む', less: '閉じる', close: '閉じる' },
      zh: { hours: '营业时间', hint: '到访建议', more: '展开介绍', less: '收起介绍', close: '关闭' },
      en: { hours: 'Opening hours', hint: 'Visit tip', more: 'Read more', less: 'Show less', close: 'Close' },
      ko: { hours: '영업시간', hint: '방문 팁', more: '더 읽기', less: '접기', close: '닫기' }
    };
    return (copy[lang] || copy.ja)[key] || '';
  }

  function formatShopHours(value) {
    // 只调整阅读断行，不更改原本的营业时间或日期含义。
    return String(value).replace(/、(?=(?:[月火水木金土日]曜|祝日|平日|休日))/g, '\n')
      .replace(/(※)/g, '\n$1').trim();
  }

  // 店铺涵盖餐饮、饮品、购物、娱乐及体验，金额不等于「人均消费」。
  // 统一使用「费用」标签，实际价格/免费/票价等说明保持数据原文。

  // ① 顶部图集：有图 → 大图可点开全屏；无图 → 类型渐变占位
  function buildHero(ctx) {
    var photoTag = '';
    if (ctx.spot.image) {
      photoTag = '<button type="button" class="dp-photo-tag" data-gallery="' + C.escapeHtml(ctx.spot.name || '') + '" data-gallery-idx="0">' + C.t('detail.photos') + '</button>';
    }
    var img = ctx.spot.image
      ? '<img class="dp-hero-img" src="' + C.escapeHtml(ctx.spot.image) + '" alt="' + C.escapeHtml(ctx.spotName) + '" data-gallery="' + C.escapeHtml(ctx.spot.name || '') + '" data-gallery-idx="0">'
      : '';
    return '<div class="dp-hero ' + ctx.heroClass + '">' + img + '<div class="dp-hero-shade"></div>' + photoTag + '</div>';
  }

  // ② 商家信息卡：名称 + 类型徽章 + 费用 + 营业时间 + 距离 + 地址 + 分类芯片
  function buildHeadCard(ctx) {
    var ICON = {
      fee:   '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M11 8v1h.01V8h1v2h2v1h-2v3.5A1.5 1.5 0 0 0 15.5 16H14v1h1.5a2.5 2.5 0 0 0 2.5-2.5V9h-2V8h-3zm2-4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10v-1H3V5h10v3zm4-1h-3v1h3v13a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2z"/></svg>',
      hours: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>',
      dist:  '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M4 15V9a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zm2-1h12V10H6v4zm1 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM5 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1H5V7z"/></svg>',
      addr:  '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>',
      hint: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18h6m-5 4h4m-6-7c-1.3-1.1-2-2.8-2-4.5a6 6 0 0 1 12 0c0 1.7-.7 3.4-2 4.5-.8.7-1 1.1-1 2H9c0-.9-.2-1.3-1-2Z"/></svg>'
    };
    var rows = '';
    if (ctx.spotFee) rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.fee + '</span><span class="dp-info-label">' + C.t('detail.info_fee') + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotFee) + '</span></div>';
    if (ctx.spotHours) rows += '<div class="dp-info-row dp-info-row--hours"><span class="dp-ico">' + ICON.hours + '</span><span class="dp-info-label">' + C.escapeHtml(shopText('hours')) + '</span><span class="dp-info-val dp-hours-value">' + C.escapeHtml(formatShopHours(ctx.spotHours)) + '</span></div>';
    if (ctx.spotBestTime) rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.hint + '</span><span class="dp-info-label">' + C.escapeHtml(shopText('hint')) + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotBestTime) + '</span></div>';
    {
      rows += '<div class="dp-info-row" data-tourism-distance-row' + ((ctx.dist.distMain || ctx.dist.distText) ? '' : ' hidden') + '><span class="dp-ico">' + ICON.dist + '</span><span class="dp-info-label">' + C.t('detail.distance') + '</span><span class="dp-info-val" data-tourism-distance>' + C.distValueHtml(ctx.dist) + '</span></div>';
    }
    if (ctx.spotAddress) {
      rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.addr + '</span><span class="dp-info-label">' + C.t('detail.address') + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotAddress) + '</span></div>';
    }
    return '<header class="dp-head">'
      + '<div class="dp-head-row"><h1 class="dp-name">' + C.escapeHtml(ctx.spotName) + '</h1>' + (ctx.tagsHtml ? '' : ctx.typeBadge)
      + (ctx.spot.businessStatus === 'reported_closed'
        ? '<span class="dp-shop-status">' + C.escapeHtml(C.t('detail.reported_closed')) + '</span>' : '')
      + '</div>'
      + (rows ? '<div class="dp-info-merged">' + rows + '</div>' : '')
      + (ctx.tagsHtml ? '<div class="dp-chips">' + ctx.tagsHtml + '</div>' : '')
      + '</header>';
  }

  // 介绍仅在有正文时展示。
  function buildAboutCard(ctx) {
    if (!ctx.desc) return '';
    var longText = String(ctx.desc).length > 235;
    return '<section class="dp-card dp-about' + (longText ? ' dp-about--collapsible' : '') + '"><h2 class="dp-sec-title">'
      + C.escapeHtml(C.t('detail.about')) + '</h2><p class="dp-text" id="dp-about-description">'
      + C.escapeHtml(ctx.desc) + '</p>'
      + (longText ? '<button class="dp-about-toggle" type="button" aria-expanded="false" aria-controls="dp-about-description">'
        + C.escapeHtml(shopText('more')) + '</button>' : '')
      + '</section>';
  }

  // 同一菜单优先使用真实实物照片；没有实物图时改为紧凑的文字价格列表。
  function getMenuName(spot, item, index) {
    return (spot.menu_i18n && spot.menu_i18n[index] && spot.menu_i18n[index][C.state.lang])
      || item.item || C.t('detail.i18n_missing');
  }

  function getSourceLink(item) {
    if (item.sourceType !== 'official' || !item.sourceUrl || !/^https:\/\//i.test(item.sourceUrl)) return '';
    return '<a class="dp-dish-source" href="' + C.escapeHtml(item.sourceUrl)
      + '" target="_blank" rel="noopener noreferrer">' + C.escapeHtml(C.t('detail.official_source')) + '</a>';
  }

  function isMenuIllustrated(item) {
    return !!(item && (item.img || (item.cover && item.coverRole === 'illustration')));
  }

  function buildPhotoItem(spot, item, index) {
    var name = getMenuName(spot, item, index);
    var photo = item.img
      ? '<img class="dp-dish-img" src="' + C.escapeHtml(item.img) + '" alt="' + C.escapeHtml(name)
        + '" loading="lazy" data-gallery="' + C.escapeHtml(spot.name || '') + '" data-gallery-idx="'
        + C.galleryIndexForMenu(spot, index) + '">'
      : '<img class="dp-dish-img" src="' + C.escapeHtml(item.cover) + '" alt="' + C.escapeHtml(name)
        + ' - ' + C.escapeHtml(C.t('detail.illustration')) + '" loading="lazy">'
        + '<span class="dp-dish-photo-source">' + C.escapeHtml(C.t('detail.illustration')) + '</span>';
    return '<div class="dp-dish"><div class="dp-dish-thumb">' + photo + '</div>'
      + '<div class="dp-dish-name">' + C.escapeHtml(name) + '</div>'
      + (item.price != null && item.price !== ''
        ? '<div class="dp-dish-price">' + C.escapeHtml(String(item.price)) + '</div>' : '')
      + getSourceLink(item) + '</div>';
  }

  function buildTextItem(spot, item, index) {
    var name = getMenuName(spot, item, index);
    return '<div class="dp-menu-row"><div class="dp-menu-row-main"><div class="dp-dish-name">'
      + C.escapeHtml(name) + '</div>' + getSourceLink(item) + '</div>'
      + (item.price != null && item.price !== ''
        ? '<div class="dp-dish-price">' + C.escapeHtml(String(item.price)) + '</div>' : '')
      + '</div>';
  }

  function buildMenuItems(spot, entries) {
    var images = entries.filter(function(entry) { return isMenuIllustrated(entry.item); });
    var text = entries.filter(function(entry) { return !isMenuIllustrated(entry.item); });
    var html = '';
    if (images.length) {
      html += '<div class="dp-menu-carousel" aria-label="' + C.escapeHtml(C.t('detail.menu')) + '">';
      images.forEach(function(entry) { html += buildPhotoItem(spot, entry.item, entry.index); });
      html += '</div>';
    }
    if (text.length) {
      html += '<div class="dp-menu-list">';
      text.forEach(function(entry) { html += buildTextItem(spot, entry.item, entry.index); });
      html += '</div>';
    }
    return html;
  }

  // 六项以内完整展示；内容确实溢出时才出现全览按钮和弹窗。
  function buildRecommendationsCard(spot) {
    if (spot.businessStatus === 'reported_closed') return '';
    var items = Array.isArray(spot.menu) ? spot.menu.map(function(item, index) {
      return { item: item, index: index };
    }).filter(function(entry) { return entry.item && entry.item.kind !== 'note'; }) : [];
    if (!items.length) return '';

    var expanded = items.length > 6;
    var title = C.escapeHtml(C.t('detail.menu'));
    var modalId = 'dpMenuModal_0';
    var unverified = items.some(function(entry) {
      return !(entry.item.sourceType === 'official' && entry.item.sourceUrl &&
        /^https:\/\//i.test(entry.item.sourceUrl));
    });
    var html = '<section class="dp-card dp-menu" aria-labelledby="dp-recs-heading"><div class="dp-menu-head">'
      + '<h2 class="dp-sec-title" id="dp-recs-heading">' + title + '</h2>'
      + (expanded ? '<button type="button" class="dp-menu-viewall" data-modal="' + modalId + '">'
        + C.escapeHtml(C.t('detail.view_all')) + ' &rsaquo;</button>' : '')
      + '</div>' + buildMenuItems(spot, items.slice(0, 6))
      + (unverified ? '<p class="dp-menu-disclaimer">' + C.escapeHtml(C.t('detail.unverified')) + '</p>' : '')
      + '</section>';
    if (!expanded) return html;
    html += '<div class="dp-menu-modal" id="' + modalId
      + '" role="dialog" aria-modal="true" aria-labelledby="dp-menu-modal-title">'
      + '<div class="dp-menu-modal-inner"><div class="dp-menu-modal-header">'
      + '<h2 id="dp-menu-modal-title" class="dp-menu-modal-title">' + title + '</h2>'
      + '<button type="button" class="dp-menu-modal-close" aria-label="' + C.escapeHtml(shopText('close'))
      + '">&times;</button></div><div class="dp-menu-modal-grid">'
      + buildMenuItems(spot, items)
      + (unverified ? '<p class="dp-menu-disclaimer">' + C.escapeHtml(C.t('detail.unverified')) + '</p>' : '')
      + '</div></div></div>';
    return html;
  }

  // 与真实商品区分：旧访问信息以紧凑文字形式出现，不再冒充商品图片卡片。
  function buildVisitorNotes(spot) {
    if (spot.businessStatus === 'reported_closed') {
      return '<section class="dp-card dp-visitor-notes"><p class="dp-visitor-note-text">'
        + C.escapeHtml(C.t('detail.closed_warning')) + '</p>'
        + (spot.businessStatusSource && /^https:\/\//i.test(spot.businessStatusSource)
          ? '<a class="dp-dish-source" href="' + C.escapeHtml(spot.businessStatusSource)
            + '" target="_blank" rel="noopener noreferrer">' + C.escapeHtml(C.t('detail.check_source')) + '</a>'
          : '') + '</section>';
    }
    var list = [];
    (Array.isArray(spot.menu) ? spot.menu : []).forEach(function(item, index) {
      if (!item || item.kind !== 'note') return;
      var translated = spot.menu_i18n && spot.menu_i18n[index] && spot.menu_i18n[index][C.state.lang];
      var value = translated || item.item;
      if (typeof value === 'string' && value.trim()) list.push(value.trim());
    });
    if (!list.length) return '';
    return '<section class="dp-card dp-visitor-notes"><h2 class="dp-sec-title">'
      + C.escapeHtml(C.t('detail.visit_notes') + ' · ' + C.t('detail.unverified')) + '</h2><p class="dp-visitor-note-text">'
      + list.map(function(value) { return C.escapeHtml(value); }).join(' · ')
      + '</p></section>';
  }

  // ⑥ 位置地图
  function buildMapCard(ctx) {
    if (ctx.mapLat == null || ctx.mapLng == null) return '';
    return '<section class="dp-card dp-map"><h2 class="dp-sec-title">' + C.escapeHtml(C.t('detail.location')) + '</h2>'
      + '<div class="map-container" id="tourismMap"><div class="map-loading">' + C.escapeHtml(C.t('detail.map_loading')) + '</div></div></section>';
  }

  function bindAboutExpand() {
    document.querySelectorAll('button.dp-about-toggle').forEach(function(button) {
      button.addEventListener('click', function() {
        var card = button.closest('.dp-about');
        if (!card) return;
        var expanded = card.classList.toggle('is-expanded');
        button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        button.textContent = shopText(expanded ? 'less' : 'more');
      });
    });
  }

  function renderShopPage(spot, stationKey) {
    var ctx = C.buildContext(spot, stationKey);
    var html = buildHero(ctx) + buildHeadCard(ctx)
      + buildRecommendationsCard(spot) + buildAboutCard(ctx)
      + buildVisitorNotes(spot) + buildMapCard(ctx)
      + '<div class="dp-note">' + C.escapeHtml(C.t('detail.ai_note')) + '</div>';
    var container = document.getElementById('articleContainer');
    if (!container) return;
    // Close any existing menu before language/data refresh replaces its DOM.
    if (activeMenuModal) closeMenuModal(activeMenuModal);
    container.innerHTML = '<article class="article-content article-content--shop">' + html + '</article>';
    bindMenuModal();
    bindAboutExpand();
    if (ctx.mapLat != null && ctx.mapLng != null) C.observeMap(ctx.mapLat, ctx.mapLng, ctx.spotName);
    var pageTitle = ctx.spotName + ' | ' + (ctx.dist.stationName || '') + ' | PIXEL TETSUDO';
    document.title = pageTitle;
  }

  // 图片点击放大统一走 core 的图集查看器（bindGallery）。


  // Each shop recommendation modal owns its own close event, focus lifecycle
  // and background scroll lock (mirrors the established realtime dialog UX).
  var activeMenuModal = null;
  var activeMenuTrigger = null;
  var originalPageOverflow = null;

  function closeMenuModal(modal) {
    var target = modal || activeMenuModal;
    if (!target || !target.classList.contains('is-open')) return;
    target.classList.remove('is-open');
    if (activeMenuModal === target) {
      document.body.style.overflow = originalPageOverflow == null ? '' : originalPageOverflow;
      var focusBack = activeMenuTrigger;
      activeMenuModal = null;
      activeMenuTrigger = null;
      originalPageOverflow = null;
      if (focusBack && focusBack.isConnected && typeof focusBack.focus === 'function')
        focusBack.focus();
    }
  }

  function openMenuModal(modal, trigger) {
    if (!modal) return;
    if (activeMenuModal && activeMenuModal !== modal)
      closeMenuModal(activeMenuModal);
    originalPageOverflow = document.body.style.overflow;
    activeMenuModal = modal;
    activeMenuTrigger = trigger;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var close = modal.querySelector('.dp-menu-modal-close');
    if (close) close.focus();
  }

  function bindMenuModal() {
    document.querySelectorAll('button.dp-menu-viewall').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openMenuModal(document.getElementById(btn.getAttribute('data-modal')), btn);
      });
    });
    document.querySelectorAll('.dp-menu-modal').forEach(function(modal) {
      // Event delegation avoids a var-in-loop closure accidentally closing
      // the final modal instead of the one containing the pressed button.
      modal.addEventListener('click', function(e) {
        if (e.target === modal ||
            (e.target.closest && e.target.closest('.dp-menu-modal-close'))) {
          e.preventDefault();
          closeMenuModal(modal);
        }
      });
    });
  }

  document.addEventListener('keydown', function(e) {
    var modal = activeMenuModal;
    if (!modal || !modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenuModal(modal);
      return;
    }
    if (e.key !== 'Tab') return;
    var all = Array.from(modal.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
    var focusable = all.filter(function(el) { return !el.hidden && el.getClientRects().length; });
    if (!focusable.length) { e.preventDefault(); return; }
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!modal.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  });
  // 图集事件已由 TourismDetailCore.start 统一绑定，避免重复安装。
  // 脚本位于 <body> 末尾：DOM 已完成解析，因此立即启动
  // （加载反馈会先于数据包完成而显示）。
  C.start(renderShopPage);
})();
