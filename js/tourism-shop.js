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
      ja: { hours: '営業時間', hint: '訪問のヒント', more: '続きを読む', less: '閉じる', close: '閉じる', seeMore: 'もっと見る', seeLess: '折りたたむ' },
      zh: { hours: '营业时间', hint: '到访建议', more: '展开介绍', less: '收起介绍', close: '关闭', seeMore: '查看更多', seeLess: '收起' },
      en: { hours: 'Opening hours', hint: 'Visit tip', more: 'Read more', less: 'Show less', close: 'Close', seeMore: 'Show more', seeLess: 'Show less' },
      ko: { hours: '영업시간', hint: '방문 팁', more: '더 읽기', less: '접기', close: '닫기', seeMore: '더 보기', seeLess: '접기' }
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


  // 主图与概要信息：先明确店名/费用/营业时间，再提供地址与详细标签。
  function buildHero(ctx) {
    var spot = ctx.spot;
    var galleryCount = (spot.image ? 1 : 0) + (Array.isArray(spot.menu)
      ? spot.menu.filter(function(item) { return item && item.img; }).length : 0);
    var photoTag = spot.image
      ? '<button type="button" class="dp-photo-tag" data-gallery="' + C.escapeHtml(spot.name || '')
        + '" data-gallery-idx="0">' + C.escapeHtml(C.t('detail.photos'))
        + (galleryCount > 1 ? ' <span class="dp-photo-count">' + galleryCount + '</span>' : '') + '</button>'
      : '';
    var img = spot.image
      ? '<img class="dp-hero-img" src="' + C.escapeHtml(spot.image) + '" alt="'
        + C.escapeHtml(ctx.spotName) + '" fetchpriority="high" decoding="async" data-gallery="'
        + C.escapeHtml(spot.name || '') + '" data-gallery-idx="0">'
      : '';
    return '<div class="dp-hero ' + ctx.heroClass + (spot.image ? ' dp-hero--with-image' : ' dp-hero--no-image')
      + '">' + img + '<div class="dp-hero-shade"></div>' + photoTag + '</div>';
  }

  function iconForInfo(name) {
    var paths = {
      hours: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      fee: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18m-6 5h3"/>',
      station: '<rect x="4" y="4" width="16" height="15" rx="3"/><path d="M8 8h8M8 13h8M7 19l-2 3m12-3 2 3"/>',
      pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      hint: '<path d="M9 18h6m-5 4h4m-6-7c-1.3-1.1-2-2.8-2-4.5a6 6 0 0 1 12 0c0 1.7-.7 3.4-2 4.5-.8.7-1 1.1-1 2H9c0-.9-.2-1.3-1-2Z"/>'
    };
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  }

  function buildShopTags(ctx) {
    var tags = Array.isArray(ctx.tags) ? ctx.tags.filter(function(tag) { return tag && tag !== 'all'; }) : [];
    // 通用 shop 仅作为筛选用途，存在其他标签时无需重复展示。
    if (tags.length > 1) tags = tags.filter(function(tag) { return tag !== 'shop'; });
    if (!tags.length) return ctx.typeBadge || '';
    var chips = tags.map(function(tag, i) {
      var label = C.t('tourism.tag_' + String(tag).replace(/-/g, '_'));
      return '<span class="tag-badge ' + C.escapeHtml(tag)
        + (i >= 3 ? ' dp-tag-extra' : '') + '">' + C.escapeHtml(label) + '</span>';
    }).join('');
    return '<div class="dp-chips" aria-label="' + C.escapeHtml(C.t('detail.type_shop')) + '">' + chips
      + (tags.length > 3 ? '<button type="button" class="dp-tags-toggle" aria-expanded="false">'
        + '+' + (tags.length - 3) + '</button>' : '') + '</div>';
  }

  function buildFact(kind, label, value, extraClass) {
    if (!value) return '';
    return '<div class="dp-fact ' + (extraClass || '') + '"><span class="dp-fact-icon">'
      + iconForInfo(kind) + '</span><div class="dp-fact-body"><span class="dp-fact-label">'
      + C.escapeHtml(label) + '</span><span class="dp-fact-value">' + C.escapeHtml(value)
      + '</span></div></div>';
  }

  function buildHeadCard(ctx) {
    var spot = ctx.spot;
    var hasFacts = !!(ctx.spotHours || ctx.spotFee);
    var facts = '';
    if (ctx.spotHours) facts += buildFact('hours', shopText('hours'), formatShopHours(ctx.spotHours), 'dp-fact--hours');
    if (ctx.spotFee) facts += buildFact('fee', C.t('detail.info_fee'), ctx.spotFee, 'dp-fact--fee');

    var info = '';
    info += '<div class="dp-access-row" data-tourism-distance-row'
      + ((ctx.dist.distMain || ctx.dist.distText) ? '' : ' hidden')
      + '><span class="dp-access-icon">' + iconForInfo('station') + '</span>'
      + '<span class="dp-access-label">' + C.escapeHtml(C.t('detail.distance')) + '</span>'
      + '<span class="dp-access-value" data-tourism-distance>' + C.distValueHtml(ctx.dist) + '</span></div>';
    if (ctx.spotAddress) info += '<div class="dp-access-row"><span class="dp-access-icon">'
      + iconForInfo('pin') + '</span><span class="dp-access-label">'
      + C.escapeHtml(C.t('detail.address')) + '</span><span class="dp-access-value">'
      + C.escapeHtml(ctx.spotAddress) + '</span></div>';
    if (ctx.spotBestTime) info += '<div class="dp-access-row"><span class="dp-access-icon">'
      + iconForInfo('hint') + '</span><span class="dp-access-label">'
      + C.escapeHtml(shopText('hint')) + '</span><span class="dp-access-value">'
      + C.escapeHtml(ctx.spotBestTime) + '</span></div>';

    return '<header class="dp-head"><div class="dp-head-row"><h1 class="dp-name">'
      + C.escapeHtml(ctx.spotName) + '</h1>'
      + (spot.businessStatus === 'reported_closed'
        ? '<span class="dp-shop-status">' + C.escapeHtml(C.t('detail.reported_closed')) + '</span>' : '')
      + '</div>' + buildShopTags(ctx)
      + (hasFacts ? '<div class="dp-facts' + (ctx.spotHours && ctx.spotFee ? '' : ' dp-facts--single')
        + (ctx.spotHours && String(ctx.spotHours).length > 48 ? ' dp-facts--long-hours' : '')
        + '">' + facts + '</div>' : '')
      + (info ? '<div class="dp-access">' + info + '</div>' : '') + '</header>';
  }


  function buildAboutCard(ctx, notesHtml) {
    if (!ctx.desc && !notesHtml) return '';
    var longText = String(ctx.desc || '').length > 235;
    var about = ctx.desc
      ? '<h2 class="dp-sec-title">' + C.escapeHtml(C.t('detail.about'))
        + '</h2><p class="dp-text" id="dp-about-description">'
        + C.escapeHtml(ctx.desc) + '</p>'
        + (longText ? '<button class="dp-about-toggle" type="button" aria-expanded="false"'
          + ' aria-controls="dp-about-description">' + C.escapeHtml(shopText('more')) + '</button>' : '')
      : '';
    return '<section class="dp-card dp-about' + (longText ? ' dp-about--collapsible' : '') + '">'
      + about + (notesHtml || '') + '</section>';
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
    // 顺序与原菜单一致。只有连续的真实图片条目才组成同一图片带。
    if (!entries.length) return '';
    var html = '', type = '', current = [];
    function flush() {
      if (!current.length) return;
      if (type === 'photo') {
        html += '<div class="dp-menu-carousel" aria-label="' + C.escapeHtml(C.t('detail.menu')) + '">';
        current.forEach(function(entry) { html += buildPhotoItem(spot, entry.item, entry.index); });
      } else {
        html += '<div class="dp-menu-list">';
        current.forEach(function(entry) { html += buildTextItem(spot, entry.item, entry.index); });
      }
      html += '</div>';
      current = [];
    }
    entries.forEach(function(entry) {
      var next = isMenuIllustrated(entry.item) ? 'photo' : 'text';
      if (type && next !== type) flush();
      type = next;
      current.push(entry);
    });
    flush();
    return html;
  }


  // 1–6 全量、7–12 页内展开、13+ 全览弹窗。保留专属弹窗的焦点与关闭行为。
  function buildRecommendationsCard(spot) {
    if (spot.businessStatus === 'reported_closed') return '';
    var items = Array.isArray(spot.menu) ? spot.menu.map(function(item, index) {
      return { item: item, index: index };
    }).filter(function(entry) { return entry.item && entry.item.kind !== 'note'; }) : [];
    if (!items.length) return '';

    var total = items.length;
    var inlineExpand = total > 6 && total <= 12;
    var modalExpand = total > 12;
    var title = C.escapeHtml(C.t('detail.menu'));
    var modalId = 'dpMenuModal_0';
    var unverified = items.some(function(entry) {
      return !(entry.item.sourceType === 'official' && entry.item.sourceUrl
        && /^https:\/\//i.test(entry.item.sourceUrl));
    });
    var html = '<section class="dp-card dp-menu" aria-labelledby="dp-recs-heading"><div class="dp-menu-head">'
      + '<h2 class="dp-sec-title" id="dp-recs-heading">' + title + '</h2>'
      + '<span class="dp-menu-count">' + total + '</span></div>'
      + buildMenuItems(spot, items.slice(0, 6));
    if (inlineExpand) {
      html += '<div class="dp-menu-more" id="dp-menu-more" hidden>'
        + buildMenuItems(spot, items.slice(6)) + '</div>'
        + '<button type="button" class="dp-menu-inline-toggle" aria-expanded="false"'
        + ' aria-controls="dp-menu-more" data-hidden-count="' + (total - 6) + '">'
        + C.escapeHtml(shopText('seeMore')) + ' (' + (total - 6) + ')</button>';
    }
    if (modalExpand) {
      html += '<button type="button" class="dp-menu-viewall" data-modal="' + modalId + '">'
        + C.escapeHtml(C.t('detail.view_all')) + ' &rsaquo;</button>';
    }
    html += (unverified ? '<p class="dp-menu-disclaimer">' + C.escapeHtml(C.t('detail.unverified')) + '</p>' : '')
      + '</section>';
    if (!modalExpand) return html;
    return html + '<div class="dp-menu-modal" id="' + modalId
      + '" role="dialog" aria-modal="true" aria-labelledby="dp-menu-modal-title">'
      + '<div class="dp-menu-modal-inner"><div class="dp-menu-modal-header">'
      + '<h2 id="dp-menu-modal-title" class="dp-menu-modal-title">' + title + '</h2>'
      + '<button type="button" class="dp-menu-modal-close" aria-label="' + C.escapeHtml(shopText('close'))
      + '">&times;</button></div><div class="dp-menu-modal-grid">'
      + buildMenuItems(spot, items)
      + (unverified ? '<p class="dp-menu-disclaimer">' + C.escapeHtml(C.t('detail.unverified')) + '</p>' : '')
      + '</div></div></div>';
  }


  // 访问备注附在介绍卡下方；闭店警告仍独立醒目提示。
  function buildVisitorNotes(spot) {
    if (spot.businessStatus === 'reported_closed') {
      return '<section class="dp-card dp-visitor-notes dp-visitor-notes--warning">'
        + '<p class="dp-visitor-note-text">' + C.escapeHtml(C.t('detail.closed_warning')) + '</p>'
        + (spot.businessStatusSource && /^https:\/\//i.test(spot.businessStatusSource)
          ? '<a class="dp-dish-source" href="' + C.escapeHtml(spot.businessStatusSource)
            + '" target="_blank" rel="noopener noreferrer">' + C.escapeHtml(C.t('detail.check_source')) + '</a>'
          : '') + '</section>';
    }
    var notes = [];
    (Array.isArray(spot.menu) ? spot.menu : []).forEach(function(item, index) {
      if (!item || item.kind !== 'note') return;
      var translated = spot.menu_i18n && spot.menu_i18n[index] && spot.menu_i18n[index][C.state.lang];
      var value = translated || item.item;
      if (typeof value === 'string' && value.trim()) notes.push(value.trim());
    });
    if (!notes.length) return '';
    return '<div class="dp-visit-notes"><h3 class="dp-visit-notes-title">'
      + C.escapeHtml(C.t('detail.visit_notes')) + ' · ' + C.escapeHtml(C.t('detail.unverified'))
      + '</h3><ul class="dp-visit-notes-list">'
      + notes.map(function(value) { return '<li>' + C.escapeHtml(value) + '</li>'; }).join('')
      + '</ul></div>';
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


  function bindShopContentToggles() {
    document.querySelectorAll('button.dp-tags-toggle').forEach(function(button) {
      button.addEventListener('click', function() {
        var row = button.closest('.dp-chips');
        if (!row) return;
        var expanded = row.classList.toggle('is-expanded');
        button.setAttribute('aria-expanded', String(expanded));
        button.textContent = expanded ? shopText('seeLess') : '+' + row.querySelectorAll('.dp-tag-extra').length;
      });
    });
    document.querySelectorAll('button.dp-menu-inline-toggle').forEach(function(button) {
      button.addEventListener('click', function() {
        var section = button.closest('.dp-menu');
        var more = section && section.querySelector('.dp-menu-more');
        if (!more) return;
        var expanded = button.getAttribute('aria-expanded') === 'true';
        more.hidden = expanded;
        button.setAttribute('aria-expanded', String(!expanded));
        button.textContent = expanded
          ? shopText('seeMore') + ' (' + button.getAttribute('data-hidden-count') + ')'
          : shopText('seeLess');
      });
    });
  }

  function renderShopPage(spot, stationKey) {
    var ctx = C.buildContext(spot, stationKey);
    var notes = buildVisitorNotes(spot);
    var isClosed = spot.businessStatus === 'reported_closed';
    var html = buildHero(ctx) + buildHeadCard(ctx)
      + buildRecommendationsCard(spot) + buildAboutCard(ctx, isClosed ? '' : notes)
      + (isClosed ? notes : '') + buildMapCard(ctx)
      + '<div class="dp-note">' + C.escapeHtml(C.t('detail.ai_note')) + '</div>';
    var container = document.getElementById('articleContainer');
    if (!container) return;
    // Close any existing menu before language/data refresh replaces its DOM.
    if (activeMenuModal) closeMenuModal(activeMenuModal);
    container.innerHTML = '<article class="article-content article-content--shop">' + html + '</article>';
    bindMenuModal();
    bindAboutExpand();
    bindShopContentToggles();
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
