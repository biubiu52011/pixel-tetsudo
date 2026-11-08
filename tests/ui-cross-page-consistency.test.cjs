'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const blobVersion = source => crypto.createHash('sha1')
  .update('blob ' + Buffer.byteLength(source) + '\0' + source).digest('hex').slice(0,12);
const pages = ['home','realtime','trains','history','tourism-spot','tourism-shop','tourism-event'];

test('navigation, basic cards and active tabs have one owner on all seven pages', () => {
  const base = read('css/style.css');
  const scoped = read('css/ux-refinements.css');
  for (const page of pages) {
    const html = read('pages/' + page + '.html');
    assert.match(html,/\.\.\/css\/style\.css/);
    assert.match(html,/\.\.\/js\/site-shell\.js\?v=[a-f0-9]{12}/);
    assert.doesNotMatch(html,/ui-system\.css/);
  }
  for (const selector of ['.pixel-tabs{','.tab-btn{','.tab-btn.active{','.pixel-card{'])
    assert.ok(base.includes(selector), 'base owns ' + selector);
  assert.doesNotMatch(scoped, /body\[data-page="(?:realtime|trains|history)"\] \.pixel-tabs/);
  assert.doesNotMatch(scoped, /body\[data-page="(?:realtime|trains|history)"\] \.tab-btn/);
  assert.doesNotMatch(scoped, /body\[data-page="(?:realtime|trains|history)"\] \.pixel-card/);
  assert.match(scoped,/body\[data-page="realtime"\] \.rs-line-card/);
  assert.match(scoped,/body\[data-page="history"\] \.history-entry/);
});

test('return buttons share their source styles; mobile touch and focus remain', () => {
  const core = read('js/tourism-core.js');
  const tourism = read('css/tourism-styles.css');
  const trains = read('css/trains.css');
  assert.match(core,/class="back-btn detail-back-btn"/);
  assert.doesNotMatch(tourism,/^\.back-btn\s*\{/m);
  assert.match(tourism,/\.detail-back-btn:focus-visible/);
  assert.match(trains,/\.back-btn\s*\{[^}]*min-height: 44px/);
  assert.match(trains,/\.back-btn:focus-visible/);
});

test('all modified assets use the current blob version and no style leaks to home', () => {
  const assets = {
    'css/ux-refinements.css': ['realtime','trains','history'],
    'css/tourism-styles.css': ['home','history','tourism-spot','tourism-shop','tourism-event'],
    'css/trains.css': ['trains'],
    'js/tourism-core.js': ['tourism-spot','tourism-shop','tourism-event'],
    'js/tourism-shop.js': ['tourism-shop']
  };
  for (const [asset, ownerPages] of Object.entries(assets)) {
    const ver = blobVersion(read(asset));
    for (const page of ownerPages)
      assert.ok(read('pages/'+page+'.html').includes('../' + asset + '?v=' + ver), page + ':' + asset);
  }
  const lang = read('css/lang-bar.css');
  assert.match(lang,/\.lang-toggle-btn\s*\{[\s\S]*?border-radius: 50%/);
  const home = read('pages/home.html');
  assert.doesNotMatch(home,/ux-refinements\.css/);
  assert.doesNotMatch(home,/ui-system\.css/);
});

function shopHarness() {
  const triggers = [], modals = [];
  const doc = {
    activeElement:null,
    body:{style:{overflow:'auto'}},
    keyHandler:null,
    addEventListener(kind,fn){if(kind==='keydown')this.keyHandler=fn;},
    getElementById(id){return modals.find(m=>m.id===id)||null;},
    querySelectorAll(selector) {
      return selector==='button.dp-menu-viewall' ? triggers :
        selector==='.dp-menu-modal' ? modals : [];
    }
  };
  function makeModal(id) {
    const flags=new Set(),listeners={};
    const modal={
      id,listeners,
      classList:{
        add(name){flags.add(name);},
        remove(name){flags.delete(name);},
        contains(name){return flags.has(name);}
      },
      addEventListener(kind,fn){listeners[kind]=fn;},
      contains(el){return el===modal||el===this.close||el===this.link;},
      querySelector(selector){return selector==='.dp-menu-modal-close'?this.close:null;},
      querySelectorAll(){return [this.close,this.link];}
    };
    function focusable(name) {
      return { name,hidden:false,getClientRects(){return [{}];},
        focus(){doc.activeElement=this;},
        closest(selector){return selector==='.dp-menu-modal-close'&&name==='close'?modal.close:null;} };
    }
    modal.close=focusable('close');
    modal.link=focusable('link');
    modals.push(modal);
    const trigger={isConnected:true,handlers:{},getAttribute(){return id;},
      addEventListener(kind,fn){this.handlers[kind]=fn;},
      focus(){doc.activeElement=this;}};
    triggers.push(trigger);
    return {modal,trigger};
  }
  const first=makeModal('menu-one'),second=makeModal('menu-two');
  const win={TourismDetailCore:{start(){},bindGallery(){}}};
  const source=read('js/tourism-shop.js');
  // Instrument internal functions only in the test sandbox, not in production.
  const sourceWithTestAccess=source.replace(/\}\)\(\);\s*$/,
    'window.__shopTest={bindMenuModal,openMenuModal,closeMenuModal};\n})();');
  assert.notEqual(sourceWithTestAccess,source);
  vm.runInNewContext(sourceWithTestAccess,{window:win,document:doc,console},{timeout:4000});
  win.__shopTest.bindMenuModal();
  function click(target,recipient){
    const event={target,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
    recipient.listeners.click(event);
    return event;
  }
  function key(key,shiftKey=false) {
    const event={key,shiftKey,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
    doc.keyHandler(event);
    return event;
  }
  return {doc,first,second,click,key};
}

test('multiple shop recommendation modals close independently and restore focus/scroll',()=>{
  const h=shopHarness();
  h.first.trigger.handlers.click();
  assert.ok(h.first.modal.classList.contains('is-open'));
  assert.equal(h.doc.body.style.overflow,'hidden');
  assert.equal(h.doc.activeElement,h.first.modal.close);
  h.click(h.first.modal.close,h.first.modal);
  assert.ok(!h.first.modal.classList.contains('is-open'));
  assert.equal(h.doc.body.style.overflow,'auto');
  assert.equal(h.doc.activeElement,h.first.trigger);
  h.second.trigger.handlers.click();
  assert.ok(h.second.modal.classList.contains('is-open'));
  assert.equal(h.key('Escape').defaultPrevented,true);
  assert.ok(!h.second.modal.classList.contains('is-open'));
  assert.equal(h.doc.activeElement,h.second.trigger);
});

test('shop modal traps Tab but backdrop close only affects the active dialog',()=>{
  const h=shopHarness();
  h.first.trigger.handlers.click();
  h.first.modal.link.focus();
  assert.equal(h.key('Tab').defaultPrevented,true);
  assert.equal(h.doc.activeElement,h.first.modal.close);
  assert.equal(h.key('Tab',true).defaultPrevented,true);
  assert.equal(h.doc.activeElement,h.first.modal.link);
  h.click(h.first.modal,h.first.modal);
  assert.equal(h.doc.body.style.overflow,'auto');
  h.second.trigger.handlers.click();
  h.click(h.second.modal,h.second.modal);
  assert.ok(!h.second.modal.classList.contains('is-open'));
  assert.equal(h.doc.activeElement,h.second.trigger);
});

test('all seven pages allow user zoom while retaining device-width and safe-area layout',()=>{
  for(const page of pages) {
    const html=read('pages/'+page+'.html');
    const viewport=html.match(/name="viewport"\s+content="([^"]+)"/);
    assert.ok(viewport,page+' viewport');
    assert.match(viewport[1],/width=device-width/);
    assert.match(viewport[1],/initial-scale=1\.0/);
    assert.match(viewport[1],/viewport-fit=cover/);
    assert.doesNotMatch(viewport[1],/maximum-scale=1|user-scalable=no/);
  }
});

test('shared ODPT and disruption evaluator URLs match source blobs across pages',()=>{
  const consumers={
    'data/core/db-loader.js':pages,
    'data/api/odpt-unified.js':['home','realtime','trains'],
    'js/runinfo-evaluator.js':['home','realtime','trains']
  };
  for(const [asset,names] of Object.entries(consumers)){
    const version=blobVersion(read(asset));
    for(const name of names){
      const html=read('pages/'+name+'.html');
      assert.ok(html.includes('../'+asset+'?v='+version),name+' stale asset '+asset);
    }
  }
});

test('6931788 legacy realtime modal has raised inner status and information cards', () => {
  const css = read('css/ux-refinements.css');
  const html = read('pages/realtime.html');
  const framed = css.match(/body\[data-page="realtime"\] \.rs-status-section,[\s\S]*?body\[data-page="realtime"\] \.rs-cause-section \{([^}]+)\}/);
  assert.ok(framed, 'original pixel cards must have their own borders and shadows');
  assert.match(framed[1], /border-width: 3px;/);
  assert.match(framed[1], /border-radius: 4px;/);
  assert.match(framed[1], /box-shadow: 4px 4px 0/);
  assert.match(css, /\.rs-updated-section \{[\s\S]*?border: 3px solid var\(--text\)/);
  assert.match(html, /class="rs-close-glyph">×<\/span>/);
});

test('original scoped 3D navigation is shared globally without restyling cards', () => {
  const css = read('css/style.css');
  const nav = css.slice(css.indexOf('/* === Tabs === */'), css.indexOf('/* === Content === */'));
  const i = css.indexOf('/* Mobile primary navigation geometry.');
  const mobile = css.slice(i, css.indexOf('@media (max-width: 380px)', i));
  assert.ok(nav.includes('border: 2px solid var(--text);  border-radius: 5px;'));
  assert.ok(nav.includes('box-shadow: 4px 4px 0 rgba(32,33,38,.4), inset 2px 2px 0 #ffffff;'));
  assert.ok(nav.includes('white-space: nowrap;  border-radius: 3px;'));
  assert.ok(nav.includes('background: #dff5e7; border: 2px solid #006b32;'));
  assert.ok(nav.includes('box-shadow: inset 2px 2px 0 #ffffff, 2px 2px 0 #006b32;'));
  // Retain the historical page-card contract and mobile nav geometry: nav only.
  assert.ok(css.includes('.pixel-card{background: var(--card);  border: 2px solid var(--border);  border-radius: var(--radius);'));
  assert.ok(mobile.includes('grid-template-columns: repeat(4, max-content)'));
  assert.match(read('css/lang-bar.css'), /\.lang-toggle-btn \{[\s\S]*?border-radius: 50%/);
  assert.doesNotMatch(read('css/ux-refinements.css'), /body\[data-page="(?:realtime|trains|history)"\] \.pixel-tabs/);
  const version = blobVersion(css);
  for(const page of pages)
    assert.ok(read('pages/' + page + '.html').includes('../css/style.css?v=' + version), page + ' CSS version');
});

test('tourism hero keeps 2660e0d desktop composition and stacks mobile photo, title and tags', () => {
  const css = read('css/tourism-styles.css');
  const core = read('js/tourism-core.js');
  assert.match(css, /\.article-hero \{[\s\S]*?aspect-ratio: 16\/9/);
  assert.match(css, /\.hero-meta \.hero-primary,[\s\S]*?\.hero-meta \.hero-tags \{\s*display: contents;/);
  assert.match(css, /@media \(max-width: 640px\) \{[\s\S]*?\.tourism-detail-page \.article-hero--with-image \.article-hero-img \{[\s\S]*?aspect-ratio: 4 \/ 3/);
  assert.match(css, /\.tourism-detail-page \.article-hero \.hero-tags \{[\s\S]*?order: 2/);
  assert.match(css, /\.tourism-detail-page \.article-hero \.article-title \{[\s\S]*?order: 1/);
  assert.match(css, /\.tourism-detail-page \.article-hero:not\(\.article-hero--with-image\) \{[\s\S]*?min-height: 168px/);
  assert.match(css, /@media \(max-width: 380px\) \{[\s\S]*?font-size: 20px/);
  assert.match(core, /ctx\.imageHtml \? ' article-hero--with-image' : ''/);
  assert.match(core, /class="hero-primary"/);
  assert.match(core, /class="hero-tags"/);
  assert.match(core, /data-gallery-idx="0"/);
  const sandbox = { window: { currentLang: 'ja', t: x => x }, document: {}, console };
  vm.runInNewContext(core, sandbox, { timeout: 4000 });
  const build = sandbox.window.TourismDetailCore.buildContext;
  const fixture = { name_ja:'LUMINE 北千住', image:'../images/観光地/LUMINE 北千住.jpg',
    tags:['all','mall'], coord:[35.7,139.8] };
  const specific = build(fixture, null);
  assert.match(specific.tagsHtml, /tag-badge mall/);
  assert.doesNotMatch(specific.tagsHtml, /tag-badge all/);
  assert.match(specific.imageHtml, /data-gallery/);
  assert.match(specific.imageHtml, /data-gallery-idx="0"/);
  assert.match(build({ name_ja:'Other', tags:['all'] }, null).tagsHtml, /tag-badge all/);
  assert.deepEqual(fixture.tags, ['all','mall'], 'source filter tags must not change');
});

test('tourism header shares the approved route-search 3D shell', () => {
  const css = read('css/home-mobile.css');
  const html = read('pages/home.html');
  assert.match(html, /id="searchContainer" class="search-card pixel-card"/);
  assert.match(html, /id="smModule" class="sm-module pixel-card"/);
  const updated = css.slice(css.indexOf('/* HOME MODULE 3D SHELL'));
  assert.ok(updated.length && updated !== css, 'new 3D shell rules are present');
  const frame = updated.match(/body\[data-page="home"\] #searchContainer,\s*body\[data-page="home"\] #smModule\s*\{([^}]+)\}/);
  const header = updated.match(/body\[data-page="home"\] #searchContainer > \.module-title,\s*body\[data-page="home"\] #smModule > \.module-title\s*\{([^}]+)\}/);
  const heading = updated.match(/body\[data-page="home"\] #searchContainer > \.module-title h2,\s*body\[data-page="home"\] #smModule > \.module-title h2\s*\{([^}]+)\}/);
  assert.ok(frame && header && heading, 'same rules govern both module headers');
  assert.match(frame[1], /border:2px solid var\(--text\)/);
  assert.match(frame[1], /box-shadow:4px 4px 0/);
  assert.match(header[1], /border-bottom:2px solid var\(--text\)/);
  assert.match(header[1], /border-radius:3px 3px 0 0/);
  assert.match(heading[1], /font-size:17px/);
  assert.ok(html.includes('../css/home-mobile.css?v=' + blobVersion(css)), 'CSS cache key is current');
});

test('tourism hero uses its parent card corner clipping without white corner wedges', () => {
  const css = read('css/tourism-styles.css');
  const core = read('js/tourism-core.js');
  assert.match(css, /\.article-content\s*\{[^}]*border-radius:\s*6px;[^}]*overflow:\s*hidden;/);
  assert.match(css, /\.article-hero\s*\{[^}]*overflow:\s*hidden;[^}]*border-radius:\s*0;/);
  assert.match(core, /class="article-content article-content--/);
  assert.match(core, /class="article-hero /);
  assert.doesNotMatch(css, /\.article-hero\s*\{[^}]*border-radius:\s*12px 12px 0 0/);
});
