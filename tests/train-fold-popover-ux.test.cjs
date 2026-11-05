'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('js/trains-render.js','utf8');
const css=fs.readFileSync('css/trains.css','utf8');
const start=source.indexOf('  function _openTrainFoldList(');
const end=source.indexOf('  // 列车终点/方向标签',start);
assert.ok(start>=0 && end>start,'nonmodal train list function');
const fold=source.slice(start,end);
test('fold list is not a full-screen blocking modal',()=>{
  assert.match(fold,/panel\.className='train-fold-popover'/);
  assert.doesNotMatch(fold,/rs-modal active|aria-modal|classList\.add\('modal-open'\)/);
  assert.match(css,/\.train-fold-popover \{\s*position:fixed;/);
  assert.doesNotMatch(css,/\.train-fold-popover\s*\{[^}]*background:\s*rgba\(0,0,0/);
});
test('popover is placed by +N badge and closes outside without a backdrop',()=>{
  assert.match(fold,/anchor\.getBoundingClientRect\(\)/);
  assert.match(fold,/panel\.style\.left=left\+'px'/);
  assert.match(fold,/panel\.style\.top=Math\.max\(margin,top\)\+'px'/);
  assert.match(fold,/document\.addEventListener\('pointerdown',onOutsidePointerDown,true\)/);
  assert.match(fold,/document\.removeEventListener\('pointerdown',onOutsidePointerDown,true\)/);
  assert.match(fold,/window\.removeEventListener\('resize',onViewportChange\)/);
});
test('generic unresolved Chuo stock stays accessible but does not append visible warning',()=>{
  assert.match(fold,/var isGenericChuoUnknown = lineId === "ChuoMain" && !fleetText/);
  assert.match(fold,/if \(!isGenericChuoUnknown\) \{[\s\S]*?caption\.appendChild\(fleetNote\)/);
  assert.match(fold,/entry\.setAttribute\('aria-label',captionBase\+' · '\+fleetText\)/);
  assert.match(fold,/iconBox\.classList\.add\('unresolved'\)/);
});
