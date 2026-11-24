'use strict';
// Read-only, local diagnostics. No network, event blocking, or overlay changes.
const out = document.getElementById('diagnostics');
const violations = [];
let lastActive = null, busy = false;
const hashes = new Map();
document.addEventListener('securitypolicyviolation', e => {
  if (violations.length < 30) violations.push({
    directive: e.effectiveDirective, blocked: e.blockedURI === 'inline' ? 'inline' : 'other',
    disposition: e.disposition
  });
});
async function digest(s) {
  if (!hashes.has(s)) {
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
    hashes.set(s, 'sha256-' + btoa(String.fromCharCode(...bytes)));
  }
  return hashes.get(s);
}
async function inspect() {
  if (busy) return;
  busy = true;
  try {
    const host = document.getElementById('codex-browser-sidebar-comments-root');
    const root = host?.shadowRoot;
    const layer = root?.querySelector('.interaction-layer');
    const styles = [...(root?.querySelectorAll('style') || [])];
    const sheets = await Promise.all(styles.map(async s => ({
      bytes: new TextEncoder().encode(s.textContent).length,
      hash: await digest(s.textContent), activeSheet: Boolean(s.sheet)
    })));
    const cs = layer && getComputedStyle(layer);
    const rect = layer?.getBoundingClientRect();
    const snapshot = {host: Boolean(host), openShadowRoot: Boolean(root),
      hostCursor: host ? getComputedStyle(host).cursor : null,
      layer: layer ? { width: cs.width, height: cs.height, boxWidth: rect.width,
        boxHeight: rect.height, pointerEvents: cs.pointerEvents, cursor: cs.cursor,
        open: layer.matches(':popover-open') } : null,
      cursorElement: Boolean(root?.querySelector('.annotation-selection-cursor, [data-browser-comment-annotation-selection-cursor]')),
      styles: sheets};
    if (snapshot.layer?.open || (!lastActive && host)) lastActive = snapshot;
    const report = JSON.stringify({current: snapshot, lastActive, violations}, null, 2);
    if (out.textContent !== report) out.textContent = report;
  } catch(e) { out.textContent = String(e); } finally { busy = false; }
}
setInterval(inspect, 500);
inspect();
