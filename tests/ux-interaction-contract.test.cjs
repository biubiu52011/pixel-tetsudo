'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function input(listId) {
  const attributes = { 'aria-controls': listId, 'aria-expanded': 'false' };
  return {
    value: '', handlers: {},
    addEventListener(name, fn) { this.handlers[name] = fn; },
    setAttribute(name, value) { attributes[name] = String(value); },
    getAttribute(name) { return attributes[name] || null; },
    removeAttribute(name) { delete attributes[name]; }
  };
}
function list() {
  let content = '';
  let options = [];
  const flags = new Set();
  return {
    dataset: {}, classList: {
      add(name) { flags.add(name); },
      remove(name) { flags.delete(name); },
      contains(name) { return flags.has(name); }
    },
    get innerHTML() { return content; },
    set innerHTML(html) {
      content = html;
      options = [...html.matchAll(/<div class="suggestion-item" role="option" id="([^"]+)" aria-selected="false" data-station-id="([^"]+)">([^<]+)<\/div>/g)]
        .map(match => {
          const attrs = { 'aria-selected': 'false', 'data-station-id': match[2] };
          return {
            id: match[1], textContent: match[3], handlers: {},
            getAttribute(key) { return attrs[key] || null; },
            setAttribute(key, value) { attrs[key] = String(value); },
            addEventListener(key, fn) { this.handlers[key] = fn; },
            scrollIntoView() {}
          };
        });
    },
    querySelectorAll() { return options; },
    querySelector() { return options.find(x => x.getAttribute('aria-selected') === 'true') || null; }
  };
}
function makeSearch() {
  const from = input('fromSuggestions'), to = input('toSuggestions');
  const fromList = list(), toList = list(), swap = input(''), search = input('');
  const elements = { fromSuggestions: fromList, toSuggestions: toList };
  const document = {
    readyState: 'loading', activeElement: from,
    addEventListener() {}, getElementById(id) { return elements[id] || null; }
  };
  const window = {
    currentLang: 'ja', escapeHtml: value => String(value),
    RouteSearch: { findStationsByTerm() {
      return [{stationId:'Tokyo',displayName:'東京'}, {stationId:'Shinjuku',displayName:'新宿'}];
    }}
  };
  // The browser owns timers; the VM fixture runs the new suggestion debounce immediately.
  vm.runInNewContext(read('js/search-ui.js'), {
    window, document, console,
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {}
  }, { timeout: 4000 });
  const ui = window.SearchUI;
  Object.assign(ui, { fromInput:from, toInput:to, swapBtn:swap, searchBtn:search });
  let searches = 0;
  ui.performSearch = () => { searches++; };
  ui.bindEvents();
  const event = (key, extras={}) => ({
    key, keyCode: extras.keyCode || 0, isComposing: !!extras.isComposing,
    defaultPrevented:false, preventDefault() { this.defaultPrevented=true; }
  });
  return { ui, from, to, fromList, toList, swap, document, window, event, searches:()=>searches };
}

test('home inputs expose labelled comboboxes and independent option lists', () => {
  const html = read('pages/home.html');
  for (const [label, field, listId] of [
    ['fromLabel','searchFrom','fromSuggestions'],
    ['toLabel','searchTo','toSuggestions']
  ]) {
    assert.match(html, new RegExp('<label class="input-label" for="' + field + '" data-i18n="search\\.' + label + '"'));
    assert.match(html, new RegExp('id="' + field + '"[\\s\\S]*?role="combobox"[\\s\\S]*?aria-controls="' + listId + '"'));
    assert.match(html, new RegExp('id="' + listId + '" class="suggestions" role="listbox"'));
  }
});

test('station combobox supports direction keys, Enter, Escape and touch selection', () => {
  const m = makeSearch();
  m.from.value='東';
  m.from.handlers.input();
  assert.equal(m.from.getAttribute('aria-expanded'), 'true');
  assert.equal(m.fromList.querySelectorAll().length, 2);
  let e = m.event('ArrowDown');
  m.from.handlers.keydown(e);
  assert.equal(e.defaultPrevented, true);
  assert.equal(m.from.getAttribute('aria-activedescendant'), 'fromSuggestions-option-0');
  e=m.event('ArrowDown');m.from.handlers.keydown(e);
  assert.equal(m.from.getAttribute('aria-activedescendant'), 'fromSuggestions-option-1');
  e=m.event('Enter');m.from.handlers.keydown(e);
  assert.equal(m.from.value, '新宿');
  assert.equal(m.from.getAttribute('data-station-id'), 'Shinjuku');
  assert.equal(m.from.getAttribute('aria-expanded'), 'false');
  assert.equal(m.searches(), 0, 'choosing an option must not also search');

  m.from.value='東';m.from.handlers.input();
  m.fromList.querySelectorAll()[0].handlers.click();
  assert.equal(m.from.getAttribute('data-station-id'), 'Tokyo');
  m.from.value='新';m.from.handlers.input();
  assert.equal(m.from.getAttribute('data-station-id'), null, 'manual editing invalidates old station');
  e=m.event('Escape');m.from.handlers.keydown(e);
  assert.equal(m.fromList.classList.contains('active'), false);
  assert.equal(m.from.getAttribute('aria-expanded'), 'false');
  m.from.handlers.keydown(m.event('Enter'));
  assert.equal(m.searches(), 1, 'plain Enter still searches');
});

test('IME composition is never mistaken for Enter and programmatic changes do not pop up', () => {
  const m=makeSearch();
  m.from.value='東';
  m.from.handlers.input();
  const e=m.event('Enter',{isComposing:true,keyCode:229});
  m.from.handlers.keydown(e);
  assert.equal(e.defaultPrevented,false);
  assert.equal(m.searches(),0);
  m.document.activeElement=m.to;
  m.ui.showSuggestions('東京','fromSuggestions',m.from);
  assert.equal(m.from.getAttribute('aria-expanded'),'false');
  m.to.value='新';m.to.handlers.input();
  m.to.handlers.keydown(m.event('ArrowUp'));
  assert.equal(m.to.getAttribute('aria-activedescendant'),'toSuggestions-option-1');
  const tab=m.event('Tab');m.to.handlers.keydown(tab);
  assert.equal(tab.defaultPrevented,false);
  assert.equal(m.toList.classList.contains('active'),false);
});

test('swap button label is localized without replacing its SVG', () => {
  const m=makeSearch();
  m.ui._updateSwapLabel();
  assert.equal(m.swap.getAttribute('aria-label'),'出発駅と到着駅を入れ替える');
  m.window.currentLang='zh';
  m.ui._updateSwapLabel();
  assert.equal(m.swap.getAttribute('aria-label'),'交换出发站和到达站');
  assert.equal(m.swap.getAttribute('title'),'交换出发站和到达站');
});

test('site shell marks exactly the active section as current', () => {
  const window={};
  const doc={querySelector(){return null;},dispatchEvent(){},body:{getAttribute(){return null;}}};
  vm.runInNewContext(read('js/site-shell.js'), {
    window, document:doc, location:{search:''}, URLSearchParams,
    CustomEvent:class {constructor(){}}, console
  }, {timeout:4000});
  const mounts={header:{},navigation:{},footer:{}};
  const root={
    setAttribute(){},
    querySelector(q) {
      if(q.includes('"header"'))return mounts.header;
      if(q.includes('"navigation"'))return mounts.navigation;
      if(q.includes('"footer"'))return mounts.footer;
      return null;
    }
  };
  window.SiteShell.render(root,{page:'realtime'});
  const nav=mounts.navigation.innerHTML;
  assert.equal((nav.match(/aria-current="page"/g)||[]).length,1);
  assert.match(nav,/href="realtime\.html" class="tab-btn active" aria-current="page"/);
  assert.doesNotMatch(nav,/href="home\.html"[^>]+aria-current="page"/);
});

test('history route link and delete button are siblings, not nested interactive controls', () => {
  const source=read('js/history.js');
  assert.match(source,/class="history-route" href="home\.html\?from=/);
  assert.match(source,/class="history-delete-btn"/);
  assert.doesNotMatch(source,/history-entry" role="link"/);
  assert.match(source,/if \(e\.target\.closest\("\.history-route"\)\) return;/);
});

test('shop and event actions meet minimum touch size without forced site-wide CSS', () => {
  const shop=read('css/tourism-shop.css');
  const event=read('css/tourism-event.css');
  assert.match(shop,/\.dp-menu-modal-close \{[^}]*width: 44px; height: 44px/);
  assert.match(shop,/\.dp-menu-viewall \{[^}]*min-height: 44px/);
  assert.match(shop,/\.dp-hero-img \{[^}]*width: 100%; height: auto/);
  assert.match(event,/\.btn-add-calendar \{[^}]*min-height: 44px/);
  for(const page of ['home','realtime','trains','history','tourism-spot','tourism-shop','tourism-event'])
    assert.doesNotMatch(read('pages/'+page+'.html'),/ui-system\.css/);
});
