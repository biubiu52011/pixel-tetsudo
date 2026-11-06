/*
 * Tourism Detail - Spot 景点独立详情页
 * 专属样式：距離+ベストタイム快速条 + 営業時間/入場料/住所信息网格 + 正文 紹介→Tips→情報→地図
 */
(function() {
  "use strict";

  var C = window.TourismDetailCore;
  if (!C) { console.error('[TourismDetailSpot] Core missing'); return; }

  // 快速信息条：距離 + ベストタイム
  function buildQuickInfo(ctx) {
    var distItem = '<div class="qi-item" data-tourism-distance-row="ready"' + ((window.DataLoader && !window.DataLoader.isLoaded()) ? ' hidden' : '') + '><div class="qi-label">' + C.t('detail.distance') + '</div><div class="qi-value" data-tourism-distance>' + C.distValueHtml(ctx.dist) + '</div></div>';
    var bestItem = ctx.spotBestTime ? '<div class="qi-item"><div class="qi-label">' + C.t('detail.best_time') + '</div><div class="qi-value">' + C.escapeHtml(ctx.spotBestTime) + '</div></div>' : '';
    return '<div class="detail-quick-info">' + distItem + bestItem + '</div>';
  }

  // 信息网格：営業時間 / 入場料 / 住所
  function buildInfoGrid(ctx) {
    var hoursRow = ctx.spotHours ? '<div class="info-row"><span class="info-label">' + C.t('detail.info_hours') + '</span><span class="info-value">' + C.escapeHtml(ctx.spotHours) + '</span></div>' : '';
    var feeLabel = /[円前後〜～]/.test(ctx.spotFee) ? C.t('detail.info_fee_per_person') : C.t('detail.info_fee');
    var feeRow = ctx.spotFee ? '<div class="info-row"><span class="info-label">' + feeLabel + '</span><span class="info-value">' + C.escapeHtml(ctx.spotFee) + '</span></div>' : '';
    if (!hoursRow && !feeRow && !ctx.addressRow) return '';
    return '<div class="article-section"><h3 class="section-heading">' + C.t('detail.basic_info') + '</h3><div class="info-grid">'
      + hoursRow + feeRow + ctx.addressRow + '</div></div>';
  }

  function renderArticle(spot, stationKey) {
    var ctx = C.buildContext(spot, stationKey);
    var quickInfo = buildQuickInfo(ctx);
    var infoHtml = buildInfoGrid(ctx);
    var tipsHtml = C.buildTipsHtml(spot, 'detail.tips');
    var body = ctx.aboutSection + tipsHtml + infoHtml + ctx.mapSection
      + '<div class="ai-note">' + C.escapeHtml(C.t('detail.ai_note')) + '</div>';
    C.renderInto(ctx, quickInfo, body);
  }

  // 脚本位于 <body> 末尾：DOM 已完成解析，因此立即启动
  // （加载反馈会先于数据包完成而显示）。
  C.start(renderArticle);
})();
