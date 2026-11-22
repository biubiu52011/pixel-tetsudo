'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=p=>fs.readFileSync(p,'utf8');
function boot(){
  const names={ja:'山手線',zh:'山手线',ko:'야마노테선',en:'Yamanote Line'};
  const win={currentLang:'zh',RailwayDB:{
    getStations:()=>({}),getAllLines:()=>({Yamanote:{nameJa:'山手線',stations:[]}}),
    resolveStationName:()=>'',
    resolveLineName:(id,l)=>id==='Yamanote'?names[l]:''
  }};
  vm.runInNewContext(source('js/delay-translator.js'),{window:win,Promise,console});
  return win.DelayTranslator;
}
test('live railway status uses verified slots and independent grammar for all supported languages',()=>{
  const d=boot(),s='人身事故のため、山手線の一部列車に遅れが出ています。';
  for(const [lang,value] of [
    ['zh','因人身事故，山手线部分列车出现延误。'],
    ['en','Some trains on the Yamanote Line are delayed due to personal accident.'],
    ['ko','인명 사고 때문에 야마노테선 일부 열차가 지연되고 있습니다.']]){
    const result=d.translate(s,{},lang);
    assert.equal(result.translated,value);
    assert.equal(result.matched,true);
    assert.equal(result.complete,true);
  }
  assert.equal(d.translate(s,{},'ja').translated,s);
});
test('multiple clauses all survive, but unknown and future clauses fail closed',()=>{
  const d=boot(),a='人身事故のため、山手線の一部列車に遅れが出ています。';
  const b='強風のため、山手線の上下線で運転を見合わせています。';
  assert.match(d.translate(a+b,{},'zh').translated,/强风/);
  assert.equal(d.translate(a+'作業員が確認しています。',{},'zh').matched,false);
  assert.equal(d.translate('強風のため、山手線の一部列車に遅れが出る可能性があります。',{},'zh').matched,false);
  assert.equal(d.translate('人身事故のため、未知線の一部列車に遅れが出ています。',{},'zh').matched,false);
  assert.equal(d.translateFragment('未知駅での安全確認','zh'),'未知駅的安全确认');
});
test('the legacy asynchronous interface never calls third-party translation hosts',async()=>{
  const d=boot();
  assert.equal((await d.translateRemote('運転見合わせ',{},'zh')).translated,'暂停运行');
  assert.doesNotMatch(source('js/delay-translator.js'),/lingva[.]ml|fetch\(url/);
});
test('tourism editorial content uses entire reviewed translations, not word concatenation',()=>{
  const win={currentLang:'zh'};
  vm.runInNewContext(source('js/tourism-core.js'),{window:win,document:{},console});
  const core=win.TourismDetailCore;
  const spot={desc:'浅草寺の歴史',desc_i18n:{zh:'浅草寺的历史',en:'History of Sensō-ji'},desc_ko:'센소지 역사',hours_i18n:{zh:'全年无休'}};
  assert.equal(core.getFixedTranslation(spot,'desc'),'浅草寺的历史');
  assert.equal(core.getI18nField(spot,'hours'),'全年无休');
  core.state.lang='en';
  assert.equal(core.getFixedTranslation(spot,'desc'),'History of Sensō-ji');
  core.state.lang='ko';
  assert.equal(core.getFixedTranslation(spot,'desc'),'센소지 역사');
  assert.equal(core.getFixedTranslation({desc:'日本語'},'desc'),'');
});
test('unverified translations never render as official full text',()=>{
  const realtime=source('js/realtime-view.js');
  assert.match(realtime,/r\.matched!==true/);
  assert.match(realtime,/status\.translation_summary/);
  assert.match(realtime,/rs-translation-summary-note/);
  assert.match(realtime,/\\u3400-\\u9FFF/);
});

test('Saikyo/Kawagoe screenshot: official upbound delay falls back to localized factual summary',()=>{
  const d=boot(),source='埼京線は、上り線の一部の列車に遅れが出ております。';
  const fields={lineId:'SaikyoKawagoe',status:'delayed',
    interval:'上り',direction:'up',cause:'列車に遅れが出ております。'};
  for(const lang of ['zh','en','ko']){
    const r=d.translate(source,fields,lang);
    assert.equal(r.matched,true);
    assert.equal(r.structured,true);
    assert.equal(r.complete,false);
    assert.doesNotMatch(r.translated,/遅れが出て|上り線/);
  }
  assert.match(d.translate(source,fields,'zh').translated,/上行列车出现延误/);
  assert.match(d.translate(source,fields,'en').translated,/upbound trains are delayed/);
});
test('future, resolved and announcement data never becomes a claimed current delay',()=>{
  const d=boot(),source='現在の運行に関するお知らせです。';
  assert.equal(d.translate(source,{status:'notice',direction:'up'},'zh').matched,false);
  assert.equal(d.translate(source,{status:'delayed',impacts:[
    {phase:'planned',direction:'up',effect:'delay'}]},'zh').matched,false);
  assert.equal(d.translate(source,{status:'delayed',impacts:[
    {phase:'resolved',direction:'up',effect:'delay'}]},'en').matched,false);
  assert.equal(d.translate('遅延が発生する可能性があります。',{
    status:'delayed',direction:'up'},'zh').matched,false);
  const r=d.translate(source,{status:'delayed',direction:'up'},'zh');
  assert.equal(r.matched,true);
  assert.equal(r.complete,false);
  assert.match(r.translated,/上行列车出现延误/);
});
test('modal displays a scoped summary instead of translation-unavailable placeholder',()=>{
  const delay=boot();
  const code=source('js/realtime-view.js');
  const start=code.indexOf('  function _untranslatedOfficialText(');
  const end=code.indexOf('  function renderFilterBar(',start);
  assert.ok(start>0&&end>start);
  const context={
    window:{DelayTranslator:delay},
    t:key=>key==='status.translation_summary'?'已确认运行影响摘要（非全文翻译）：':'无法翻译',
    escapeHtml:x=>String(x).replace(/</g,'&lt;'),
    _needsJaTranslate:()=>true
  };
  vm.runInNewContext(code.slice(start,end)+'\nthis.renderTranslated=_translatedText;',context);
  const html=context.renderTranslated('埼京線は、上り線の一部の列車に遅れが出ております。',
    'zh',{lineId:'SaikyoKawagoe',status:'delayed',direction:'up'});
  assert.match(html,/已确认运行影响摘要/);
  assert.match(html,/上行列车出现延误/);
  assert.doesNotMatch(html,/rs-cause-untranslated|无法翻译/);
});
