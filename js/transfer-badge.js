/* transfer-badge.js — 换乘提示徽章公共组件（window.TransferBadge）
 * 收敛自 js/search-ui.js 的 journey-transfer 构建段
 * 同质异参组件：样式统一，仅数量/线路/直通/提示文本等参数变化。
 *
 * API：
 *   TransferBadge.build(segs, idx, lang, lineBadgeFn)
 *     -> 换乘段 HTML 字符串（直通变体 journey-transfer--through /
 *        上下车番线一体徽章 / 站外换乘提示 hint）
 *     lineBadgeFn(lineId, platform) 由调用方注入（线路徽章渲染回调）。
 */
(function () {
  "use strict";

  function _txIcon(through) {
    return through
      ? '<svg class="journey-tx-icon" viewBox="0 0 14 14" width="13" height="13" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.354.146A.5.5 0 0 0 8.5.5V2h-6A2.5 2.5 0 0 0 0 4.5V6a1 1 0 0 0 2 0V4.5a.5.5 0 0 1 .5-.5h6v1.5a.5.5 0 0 0 .854.354l2.5-2.5a.5.5 0 0 0 0-.708zM5.19 8.038a.5.5 0 0 1 .31.462V10h6a.5.5 0 0 0 .5-.5V8a1 1 0 1 1 2 0v1.5a2.5 2.5 0 0 1-2.5 2.5h-6v1.5a.5.5 0 0 1-.854.354l-2.5-2.5a.5.5 0 0 1 0-.708l2.5-2.5a.5.5 0 0 1 .545-.108"/></svg>'
      : '<svg class="journey-tx-icon" viewBox="0 0 14 14" width="13" height="13" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.998 1.068a1 1 0 0 1-.29.64l-2 2-7 7A1 1 0 0 1 .292 9.292L6.586 3 5.293 1.707A1 1 0 0 1 6 0h4a1 1 0 0 1 .674.261M7.414 11l6.293-6.293a1 1 0 0 0-1.414-1.414l-7 7-2 2a.996.996 0 0 0-.05 1.36q.038.045.083.086A1 1 0 0 0 4 14h4a1 1 0 0 0 .707-1.707z"/></svg>';
  }

  function build(segs, idx, lang, lineBadgeFn) {
    var seg = segs[idx];
    var txSt = window.RailwayDB && window.RailwayDB.resolveStationName ? window.RailwayDB.resolveStationName(seg.station, lang) : (seg.station || '');
    if (seg.toStation && seg.toStation !== seg.station) {
      var targetName=window.RailwayDB && window.RailwayDB.resolveStationName ? window.RailwayDB.resolveStationName(seg.toStation,lang) : seg.toStation;
      txSt += ' → '+targetName;
    }
    var lineChange = '';
    // UI placeholder only: verified platform data can later fill data-platform-value slots.
    if (seg.fromLine || (seg.toLines && seg.toLines.length)) {
      var badgeParts = [];
      if (seg.fromLine) badgeParts.push(lineBadgeFn(seg.fromLine, null));
      if (seg.toLines && seg.toLines.length) {
        if (badgeParts.length) badgeParts.push('<svg class="journey-line-arrow" viewBox="0 0 14 14" width="12" height="12" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" transform="rotate(90 7 7)" d="M6.646.146a.5.5 0 0 1 .708 0l3.5 3.5a.5.5 0 0 1-.354.854H8V13a1 1 0 1 1-2 0V4.5H3.5a.5.5 0 0 1-.354-.854z"/></svg>');
        for (var bi = 0; bi < seg.toLines.length; bi++) badgeParts.push(lineBadgeFn(seg.toLines[bi], null));
      }
      lineChange = '<span class="journey-line-icons">' + badgeParts.join('') + '</span>';
    }
    var html = '<div class="journey-transfer';
    if (seg.through) { html += ' journey-transfer--through'; }
    html += '" data-tx-idx="' + idx + '">';
    html += '<span class="journey-transfer-icon">' + _txIcon(!!seg.through) + '</span>';
    html += '<span class="journey-transfer-station">' + window.escapeHtml(txSt) + '</span>';
    html += '<span class="journey-transfer-text';
    if (seg.through) { html += ' journey-transfer-text--through'; }
    html += '">' + (window.t ? window.t(seg.through ? 'search_result.through' : 'search_result.transfer') : (seg.through ? '直通' : '乗換')) + '</span>';
    if (lineChange) { html += lineChange; }
    // UI slots exist even for through services, but stay hidden until a confirmed downgrade.
    // No station-level guesses or walking instructions are rendered.
    {
      var tr = window.t || function(key) { return ({
        'search_result.arrival_platform':'降車番線',
        'search_result.departure_platform':'乗車番線',
        'search_result.platform_unconfirmed':'番線未確認'
      })[key] || key; };
      var unknown=window.escapeHtml(tr('search_result.platform_unconfirmed'));
      html += '<div class="journey-platform-change" role="group"'+
        (seg.through ? ' hidden' : '')+' aria-label="'+window.escapeHtml(txSt)+'">';
      html += '<div class="journey-platform-slot journey-platform-slot--arrival" data-platform-status="unconfirmed">'+
        '<span class="journey-platform-label">'+window.escapeHtml(tr('search_result.arrival_platform'))+'</span>'+
        '<span class="journey-platform-value" data-platform-value="arrival">—</span></div>';
      html += '<span class="journey-platform-arrow" aria-hidden="true">→</span>';
      html += '<div class="journey-platform-slot journey-platform-slot--departure" data-platform-status="unconfirmed">'+
        '<span class="journey-platform-label">'+window.escapeHtml(tr('search_result.departure_platform'))+'</span>'+
        '<span class="journey-platform-value" data-platform-value="departure">—</span></div>';
      html += '<span class="journey-platform-note">'+unknown+'</span></div>';
    }
    // No station-wide hints: they may describe another operator pair at this station.
    html += '</div>';
    return html;
  }

  window.TransferBadge = { build: build };
})();
