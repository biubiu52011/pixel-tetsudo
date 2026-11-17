'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

function fixture() {
  const docHandlers = {};
  const doc = {
    createElementNS() {
      return { attrs: {}, children: [],
        setAttribute(k, v) { this.attrs[k] = String(v); },
        appendChild(node) { this.children.push(node); return node; }
      };
    },
    addEventListener(k, f) { docHandlers[k] = f; },
    removeEventListener(k) { delete docHandlers[k]; }
  };
  const cameraNodes = [{ name: 'route' }, { name: 'trains' }];
  const handlers = {}, attrs = {}, classes = new Set();
  const svg = {
    __geometry: { contentBounds: { width: 400, height: 800 } },
    children: [],
    classList: { toggle(k, yes) { if (yes) classes.add(k); else classes.delete(k); }, contains(k) { return classes.has(k); } },
    querySelector(k) { if (k === '.static-layer') return cameraNodes[0]; if (k === '.train-layer') return cameraNodes[1]; },
    appendChild(node) { this.children.push(node); },
    setAttribute(k, v) { attrs[k] = String(v); },
    addEventListener(k, f) { handlers[k] = f; },
    removeEventListener(k) { delete handlers[k]; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 800 }; }
  };
  const window = {};
  vm.runInNewContext(read('js/train-map-gestures.js'), {window, document:doc, Map, Date, Math, console}, {timeout:4000});
  window.TrainMapGestures.attach(svg);
  const event = (extras={}) => ({clientX:200,clientY:300,button:0,buttons:1,pointerId:1,pointerType:'touch',cancelable:true,
    preventDefault() {this.prevented=true;},...extras});
  return { svg, handlers, docHandlers, attrs, classes, camera: svg.children[0], event };
}

test('gesture camera keeps fixed route viewBox and shared static/train layers', () => {
  const f = fixture();
  assert.deepEqual(f.camera.children.map(n=>n.name), ['route', 'trains']);
  assert.match(f.camera.attrs.transform, /scale\(1\)/);
  assert.equal(f.attrs.tabindex, '0');
  assert.equal(f.attrs.viewBox, undefined, 'camera must never overwrite fixed viewBox');
});
test('single touch keeps page scroll; pinch zoom followed by one-finger pan', () => {
  const f=fixture(), e=f.event;
  f.handlers.pointerdown(e({pointerId:1,clientX:100}));
  f.docHandlers.pointermove(e({pointerId:1,clientX:100,clientY:350}));
  assert.equal(f.classes.contains('tp-gesture-zoomed'),false);
  f.handlers.pointerdown(e({pointerId:2,clientX:200}));
  const pinch=e({pointerId:2,clientX:300});
  f.docHandlers.pointermove(pinch);
  assert.equal(pinch.prevented,true);
  assert.equal(f.classes.contains('tp-gesture-zoomed'),true);
  const before=f.camera.attrs.transform;
  f.docHandlers.pointerup(e({pointerId:2,clientX:300}));
  f.docHandlers.pointermove(e({pointerId:1,clientX:130,clientY:350}));
  assert.notEqual(f.camera.attrs.transform,before);
  f.docHandlers.pointerup(e({pointerId:1,clientX:130,clientY:350}));
  assert.equal(f.docHandlers.pointermove, undefined);
});
test('wheel preserves normal page scroll; modifier wheel and double-click zoom', () => {
  const f=fixture(), e=f.event;
  const plain=e({deltaY:-80});
  f.handlers.wheel(plain);
  assert.equal(plain.prevented,undefined);
  assert.equal(f.classes.contains('tp-gesture-zoomed'),false);
  const zoom=e({deltaY:-80,ctrlKey:true});
  f.handlers.wheel(zoom);
  assert.equal(zoom.prevented,true);
  assert.equal(f.classes.contains('tp-gesture-zoomed'),true);
  f.handlers.dblclick(e());
  assert.equal(f.classes.contains('tp-gesture-zoomed'),false);
  f.svg._disposeTrainMapGestures();
  assert.equal(f.handlers.pointerdown,undefined);
});
test('fold badges still own direct clicks and accessibility activation', () => {
  const f=fixture(), e=f.event;
  f.handlers.pointerdown(e({target:{closest(){return {};}}}));
  assert.equal(f.docHandlers.pointermove,undefined);
  f.handlers.keydown(e({target:f.svg,key:'+',preventDefault(){this.prevented=true;}}));
  assert.equal(f.classes.contains('tp-gesture-zoomed'),true);
});
