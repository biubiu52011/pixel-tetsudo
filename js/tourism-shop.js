/*
 * Tourism Detail - Shop 吃喝玩乐综合商家详情页（餐饮/购物/娱乐/体验）
 * 参考点评网站店铺页信息架构：
 *   顶部图集（点击全屏）→ 白色商家信息卡（费用/营业时间/交通/地址）
 *   → 介绍 → 推荐内容（餐饮/商品/游玩体验）→ 位置地图 → AI 整理注记
 * 复用 TourismDetailCore：数据加载/语言切换/距离口径/地图/翻译；渲染完全自绘（dp- 前缀命名空间，不依赖公共 hero 框架）。
 */
(function() {
  "use strict";

  var C = window.TourismDetailCore;
  if (!C) { console.error('[TourismDetailShop] Core missing'); return; }

  // 店铺涵盖餐饮、饮品、购物、娱乐及体验，金额不等于「人均消费」。
  // 统一使用「费用」标签，实际价格/免费/票价等说明保持数据原文。

  // ① 顶部图集：有图 → 大图可点开全屏；无图 → 类型渐变占位
  function buildHero(ctx) {
    var photoTag = '';
    if (ctx.spot.image) {
      photoTag = '<button class="dp-photo-tag" data-gallery="' + C.escapeHtml(ctx.spot.name || '') + '" data-gallery-idx="0">' + C.t('detail.photos') + '</button>';
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
      addr:  '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>'
    };
    var rows = '';
    if (ctx.spotFee) rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.fee + '</span><span class="dp-info-label">' + C.t('detail.info_fee') + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotFee) + '</span></div>';
    if (ctx.spotHours) rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.hours + '</span><span class="dp-info-label">' + C.t('detail.info_hours') + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotHours) + '</span></div>';
    if (ctx.spotBestTime) rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.hours + '</span><span class="dp-info-label">' + C.t('detail.best_time') + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotBestTime) + '</span></div>';
    {
      rows += '<div class="dp-info-row" data-tourism-distance-row' + ((ctx.dist.distMain || ctx.dist.distText) ? '' : ' hidden') + '><span class="dp-ico">' + ICON.dist + '</span><span class="dp-info-label">' + C.t('detail.distance') + '</span><span class="dp-info-val" data-tourism-distance>' + C.distValueHtml(ctx.dist) + '</span></div>';
    }
    if (ctx.spotAddress) {
      rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.addr + '</span><span class="dp-info-label">' + C.t('detail.address') + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotAddress) + '</span></div>';
    }
    return '<div class="dp-head">'
      + '<div class="dp-head-row"><h1 class="dp-name">' + C.escapeHtml(ctx.spotName) + '</h1>' + ctx.typeBadge
      + (ctx.spot.businessStatus === 'reported_closed'
        ? '<span class="dp-shop-status">' + C.escapeHtml(C.t('detail.reported_closed')) + '</span>' : '')
      + '</div>'
      + (rows ? '<div class="dp-info-merged">' + rows + '</div>' : '')
      + (ctx.tagsHtml ? '<div class="dp-chips">' + ctx.tagsHtml + '</div>' : '')
      + '</div>';
  }

  // 信息卡已融合进店名卡，保留空实现保持渲染调用链不变。
  function buildInfoCard(ctx) { return '' }

  // ④ 介绍
  function buildAboutCard(ctx) {
    return '<div class="dp-card"><h3 class="dp-sec-title">' + C.t('detail.about') + '</h3><p class="dp-text">' + C.escapeHtml(ctx.desc) + '</p></div>';
  }

  // 所有商家推荐统一来源 spot.menu。
  // 备注可使用经核实的店铺照片或原创主题插画，分别标注图片类型。
  // 没有可靠图片才使用店名首字占位图；没有价格的备注不造价。
  function buildRecommendedItem(spot, item, index, badgeChar) {
    item = item || {};
    var name = (spot.menu_i18n && spot.menu_i18n[index] && spot.menu_i18n[index][C.state.lang])
      || item.item || C.t('detail.i18n_missing');
    var thumb = item.img
      ? '<img class="dp-dish-img" src="' + C.escapeHtml(item.img) + '" alt="' + C.escapeHtml(name)
        + '" loading="lazy" data-gallery="' + C.escapeHtml(spot.name || '') + '" data-gallery-idx="'
        + C.galleryIndexForMenu(spot, index) + '">'
      : item.cover && (item.coverRole === 'shop' || item.coverRole === 'illustration')
        ? (function () {
          var coverLabel = C.t(item.coverRole === 'shop' ? 'detail.shop_photo' : 'detail.illustration');
          return '<img class="dp-dish-img" src="' + C.escapeHtml(item.cover) + '" alt="'
            + C.escapeHtml(spot.name || '') + ' - ' + C.escapeHtml(coverLabel)
            + '" loading="lazy"><span class="dp-dish-photo-source">' + C.escapeHtml(coverLabel) + '</span>';
        })()
        : '<span class="dp-dish-badge">' + C.escapeHtml(badgeChar) + '</span>';
    return '<div class="dp-dish"><div class="dp-dish-thumb">' + thumb + '</div>'
      + '<div class="dp-dish-name">' + C.escapeHtml(name) + '</div>'
      + (item.price != null && item.price !== ''
        ? '<div class="dp-dish-price">' + C.escapeHtml(String(item.price)) + '</div>'
        : '')
      + (item.sourceUrl && /^https:\/\//i.test(item.sourceUrl)
        ? '<a class="dp-dish-source" href="' + C.escapeHtml(item.sourceUrl)
          + '" target="_blank" rel="noopener noreferrer">' + C.escapeHtml(C.t('detail.official_source')) + '</a>'
        : '<span class="dp-dish-unverified">' + C.escapeHtml(C.t('detail.unverified')) + '</span>')
      + '</div>';
  }

  // ⑤ 只有真实商品、服务和体验才进入おすすめ；kind=note 保留在数据中作参考信息。
  function buildRecommendationsCard(spot) {
    if (spot.businessStatus === 'reported_closed') return '';
    var items = Array.isArray(spot.menu) ? spot.menu.map(function(item, index) {
      return { item: item, index: index };
    }).filter(function(entry) { return entry.item && entry.item.kind !== 'note'; }) : [];
    if (!items.length) return '';

    var title = C.escapeHtml(C.t('detail.menu'));
    var badgeChar = String(spot.name || '').trim().charAt(0) || C.t('detail.badge_initial_fallback');
    var modalId = 'dpMenuModal_' + (spot.menu._idx || 0);
    var html = '<div class="dp-card dp-menu"><div class="dp-menu-head">'
      + '<h3 class="dp-sec-title">' + title + '</h3>'
      + '<button class="dp-menu-viewall" data-modal="' + modalId + '">'
      + C.escapeHtml(C.t('detail.view_all')) + ' &rsaquo;</button></div>'
      + '<div class="dp-menu-carousel">';
    for (var i = 0; i < Math.min(items.length, 10); i++) {
      html += buildRecommendedItem(spot, items[i].item, items[i].index, badgeChar);
    }
    html += '</div></div><div class="dp-menu-modal" id="' + modalId
      + '" role="dialog" aria-modal="true" aria-label="' + title + '">'
      + '<button class="dp-menu-modal-close" aria-label="' + C.escapeHtml(C.t('detail.close'))
      + '">&times;</button><div class="dp-menu-modal-inner"><h3 class="dp-menu-modal-title">'
      + title + '</h3><div class="dp-menu-modal-grid">';
    for (var j = 0; j < items.length; j++) {
      html += buildRecommendedItem(spot, items[j].item, items[j].index, badgeChar);
    }
    return html + '</div></div></div>';
  }

  // 与真实商品区分：旧访问信息以紧凑文字形式出现，不再冒充商品图片卡片。
  function buildVisitorNotes(spot) {
    if (spot.businessStatus === 'reported_closed') {
      return '<div class="dp-card dp-visitor-notes"><p class="dp-visitor-note-text">'
        + C.escapeHtml(C.t('detail.closed_warning')) + '</p>'
        + (spot.businessStatusSource && /^https:\/\//i.test(spot.businessStatusSource)
          ? '<a class="dp-dish-source" href="' + C.escapeHtml(spot.businessStatusSource)
            + '" target="_blank" rel="noopener noreferrer">' + C.escapeHtml(C.t('detail.check_source')) + '</a>'
          : '') + '</div>';
    }
    var list = [];
    (spot.menu || []).forEach(function(item, index) {
      if (!item || item.kind !== 'note') return;
      var translated = spot.menu_i18n && spot.menu_i18n[index] && spot.menu_i18n[index][C.state.lang];
      var value = translated || item.item;
      if (typeof value === 'string' && value.trim()) list.push(value.trim());
    });
    if (!list.length) return '';
    return '<div class="dp-card dp-visitor-notes"><h3 class="dp-sec-title">'
      + C.escapeHtml(C.t('detail.visit_notes') + ' · ' + C.t('detail.unverified')) + '</h3><p class="dp-visitor-note-text">'
      + list.map(function(value) { return C.escapeHtml(value); }).join(' · ')
      + '</p></div>';
  }

  // ⑥ 位置地图
  function buildMapCard(ctx) {
    return '<div class="dp-card"><h3 class="dp-sec-title">' + C.t('detail.location') + '</h3>'
      + '<div class="map-container" id="tourismMap"><div class="map-loading">' + C.t('detail.map_loading') + '</div></div></div>';
  }

  function renderShopPage(spot, stationKey) {
    var ctx = C.buildContext(spot, stationKey);
    var html = buildHero(ctx) + buildHeadCard(ctx)
      + buildRecommendationsCard(spot) + buildInfoCard(ctx) + buildAboutCard(ctx)
      + buildVisitorNotes(spot) + buildMapCard(ctx)
      + '<div class="dp-note">' + C.escapeHtml(C.t('detail.ai_note')) + '</div>';
    var container = document.getElementById('articleContainer');
    if (!container) return;
    // Close any existing menu before language/data refresh replaces its DOM.
    if (activeMenuModal) closeMenuModal(activeMenuModal);
    container.innerHTML = '<div class="article-content article-content--shop">' + html + '</div>';
    bindMenuModal();
    C.observeMap(ctx.mapLat, ctx.mapLng, ctx.spotName);
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
  // 图集查看器全局委托（一次绑定，hero/菜单图通用）
  if (C.bindGallery) C.bindGallery();
  // 脚本位于 <body> 末尾：DOM 已完成解析，因此立即启动
  // （加载反馈会先于数据包完成而显示）。
  C.start(renderShopPage);
})();
