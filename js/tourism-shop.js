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
    rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.fee + '</span><span class="dp-info-label">' + C.t('detail.info_fee') + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotFee) + '</span></div>';
    rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.hours + '</span><span class="dp-info-label">' + C.t('detail.info_hours') + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotHours) + '</span></div>';
    rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.hours + '</span><span class="dp-info-label">' + C.t('detail.best_time') + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotBestTime) + '</span></div>';
    {
      rows += '<div class="dp-info-row" data-tourism-distance-row' + ((ctx.dist.distMain || ctx.dist.distText) ? '' : ' hidden') + '><span class="dp-ico">' + ICON.dist + '</span><span class="dp-info-label">' + C.t('detail.distance') + '</span><span class="dp-info-val" data-tourism-distance>' + C.distValueHtml(ctx.dist) + '</span></div>';
    }
    if (ctx.spotAddress) {
      rows += '<div class="dp-info-row"><span class="dp-ico">' + ICON.addr + '</span><span class="dp-info-label">' + C.t('detail.address') + '</span><span class="dp-info-val">' + C.escapeHtml(ctx.spotAddress) + '</span></div>';
    }
    return '<div class="dp-head">'
      + '<div class="dp-head-row"><h1 class="dp-name">' + C.escapeHtml(ctx.spotName) + '</h1>' + ctx.typeBadge + '</div>'
      + '<div class="dp-info-merged">' + rows + '</div>'
      + (ctx.tagsHtml ? '<div class="dp-chips">' + ctx.tagsHtml + '</div>' : '')
      + '</div>';
  }

  // 信息卡已融合进店名卡，保留空实现保持渲染调用链不变。
  function buildInfoCard(ctx) { return '' }

  // ④ 介绍
  function buildAboutCard(ctx) {
    return '<div class="dp-card"><h3 class="dp-sec-title">' + C.t('detail.about') + '</h3><p class="dp-text">' + C.escapeHtml(ctx.desc) + '</p></div>';
  }

  // ⑤ 推荐内容：餐饮、零售、娱乐和体验型商家统一标题；无具体项目时回退到文本贴士
  function buildRecommendationsCard(spot) {
    if (spot.menu && spot.menu.length > 0) {
      var titleKey = 'detail.menu';
      var list = spot.menu.slice(0, 10);
      var badgeChar = String(spot.name || '').trim().charAt(0) || C.t('detail.badge_initial_fallback');

      // 横向滚动预览行（含"查看全部"按钮）
      var html = '<div class="dp-card dp-menu">';
      html += '<div class="dp-menu-head"><h3 class="dp-sec-title">' + C.t(titleKey) + '</h3>';
      html += '<button class="dp-menu-viewall" data-modal="' + ('dpMenuModal_' + (spot.menu._idx || 0)) + '">' + C.t('detail.view_all') + ' &rsaquo;</button>';
      html += '</div><div class="dp-menu-carousel">';
      for (var mi = 0; mi < list.length; mi++) {
        var it = list[mi] || {};
        var itemText = (spot.menu_i18n && spot.menu_i18n[mi] && spot.menu_i18n[mi][C.state.lang])
          || it.item || C.t('detail.i18n_missing');
        var thumb = it.img
          ? '<img class="dp-dish-img" src="' + C.escapeHtml(it.img) + '" alt="' + C.escapeHtml(itemText) + '" loading="lazy" data-gallery="' + C.escapeHtml(spot.name || '') + '" data-gallery-idx="' + C.galleryIndexForMenu(spot, mi) + '">'
          : '<span class="dp-dish-badge">' + C.escapeHtml(badgeChar) + '</span>';
        html += '<div class="dp-dish"><div class="dp-dish-thumb">' + thumb + '</div>'
          + '<div class="dp-dish-name">' + C.escapeHtml(itemText) + '</div>'
          + (it.price != null && it.price !== '' ? '<div class="dp-dish-price">' + C.escapeHtml(String(it.price)) + '</div>' : '') + '</div>';
      }
      html += '</div></div>';

      // 全屏推荐内容模态
      var modalId = 'dpMenuModal_' + (spot.menu._idx || 0);
      html += '<div class="dp-menu-modal" id="' + modalId + '" role="dialog" aria-modal="true" aria-label="' + C.escapeHtml(C.t(titleKey)) + '">';
      html += '<button class="dp-menu-modal-close" aria-label="' + C.escapeHtml(C.t('detail.close')) + '">&times;</button>';
      html += '<div class="dp-menu-modal-inner"><h3 class="dp-menu-modal-title">' + C.t(titleKey) + '</h3>';
      html += '<div class="dp-menu-modal-grid">';
      for (var mi2 = 0; mi2 < spot.menu.length; mi2++) {
        var it2 = spot.menu[mi2] || {};
        var itemText2 = (spot.menu_i18n && spot.menu_i18n[mi2] && spot.menu_i18n[mi2][C.state.lang])
          || it2.item || C.t('detail.i18n_missing');
        var thumb2 = it2.img
          ? '<img class="dp-dish-img" src="' + C.escapeHtml(it2.img) + '" alt="' + C.escapeHtml(itemText2) + '" loading="lazy" data-gallery="' + C.escapeHtml(spot.name || '') + '" data-gallery-idx="' + C.galleryIndexForMenu(spot, mi2) + '">'
          : '<span class="dp-dish-badge">' + C.escapeHtml(badgeChar) + '</span>';
        html += '<div class="dp-dish"><div class="dp-dish-thumb">' + thumb2 + '</div>'
          + '<div class="dp-dish-name">' + C.escapeHtml(itemText2) + '</div>'
          + (it2.price != null && it2.price !== '' ? '<div class="dp-dish-price">' + C.escapeHtml(String(it2.price)) + '</div>' : '') + '</div>';
      }
      html += '</div></div></div>';
      return html + buildTipsCard(spot, 'detail.tips');
    }
    return buildTipsCard(spot, 'detail.menu');
  }

  function buildTipsCard(spot, titleKey) {
    // 只有实际内容才渲染提示/推荐，避免娱乐设施出现「内容未提供」的空卡片。
    if (!spot.tips || spot.tips.length === 0) return '';
    var htmlFallback = '<div class="dp-card dp-shop-picks"><h3 class="dp-sec-title">' + C.t(titleKey) + '</h3><ul class="dp-pick-list">';
    if (spot.tips && spot.tips.length > 0) {
      for (var ti = 0; ti < spot.tips.length; ti++) {
        var tipText = (spot.tips_i18n && spot.tips_i18n[C.state.lang] && spot.tips_i18n[C.state.lang][ti])
          || spot.tips[ti] || C.t('detail.i18n_missing');
        htmlFallback += '<li>' + C.escapeHtml(tipText) + '</li>';
      }
    } else {
      htmlFallback += '<li>' + C.escapeHtml(C.t('detail.i18n_missing')) + '</li>';
    }
    return htmlFallback + '</ul></div>';
  }
  // ⑥ 位置地图
  function buildMapCard(ctx) {
    return '<div class="dp-card"><h3 class="dp-sec-title">' + C.t('detail.location') + '</h3>'
      + '<div class="map-container" id="tourismMap"><div class="map-loading">' + C.t('detail.map_loading') + '</div></div></div>';
  }

  function renderShopPage(spot, stationKey) {
    var ctx = C.buildContext(spot, stationKey);
    var html = buildHero(ctx) + buildHeadCard(ctx)
      + buildRecommendationsCard(spot) + buildInfoCard(ctx) + buildAboutCard(ctx) + buildMapCard(ctx)
      + '<div class="dp-note">' + C.escapeHtml(C.t('detail.ai_note')) + '</div>';
    var container = document.getElementById('articleContainer');
    if (!container) return;
    container.innerHTML = '<div class="article-content article-content--shop">' + html + '</div>';
    bindMenuModal();
    C.observeMap(ctx.mapLat, ctx.mapLng, ctx.spotName);
    var pageTitle = ctx.spotName + ' | ' + (ctx.dist.stationName || '') + ' | PIXEL TETSUDO';
    document.title = pageTitle;
  }

  // 图片点击放大统一走 core 的图集查看器（bindGallery）。


  // 菜单全屏模态（查看全部）
  function bindMenuModal() {
    var viewBtns = document.querySelectorAll('button.dp-menu-viewall');
    for (var vi = 0; vi < viewBtns.length; vi++) {
      viewBtns[vi].addEventListener('click', function() {
        var modalId = this.getAttribute('data-modal');
        var modal = document.getElementById(modalId);
        if (modal) modal.classList.add('is-open');
      });
    }
    var modals = document.querySelectorAll('.dp-menu-modal');
    for (var mi = 0; mi < modals.length; mi++) {
      var modal = modals[mi];
      modal.querySelector('.dp-menu-modal-close').addEventListener('click', function() { modal.classList.remove('is-open'); document.body.style.overflow=''; });
      modal.addEventListener('click', function(e) { if (e.target === modal) { modal.classList.remove('is-open'); document.body.style.overflow=''; } });
    }
  }
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { var open = document.querySelector('.dp-menu-modal.is-open'); if (open) { open.classList.remove('is-open'); document.body.style.overflow=''; } } });
  // 图集查看器全局委托（一次绑定，hero/菜单图通用）
  if (C.bindGallery) C.bindGallery();
  // 脚本位于 <body> 末尾：DOM 已完成解析，因此立即启动
  // （加载反馈会先于数据包完成而显示）。
  C.start(renderShopPage);
})();
