'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const audit=require('../tools/audit-tobu-odpt-number-bands.cjs');
const refs=[
 {model:'50050',png:'a.png',line:'Hanzomon',min:452,max:2282,suffix:'T',format:'full'},
 {model:'20400',png:'b.png',line:'TobuUtsunomiya',min:401,max:486,suffix:'N',format:'full'},
 {model:'10030-50',png:'c.png',line:'Koizumi',min:701,max:764,suffix:'E',format:'full'}
];
const train=(trainNumber,railway,calendar='odpt.Calendar:Weekday',overrides={})=>({
 'odpt:trainNumber':trainNumber,'odpt:railway':'odpt.Railway:Tobu.'+railway,
 'odpt:calendar':calendar,'odpt:railDirection':'odpt.RailDirection:Inbound',
 'odpt:trainType':'odpt.TrainType:Tobu.Local',...overrides
});
test('accepts only full train numbers, never car/formation IDs or modulo-number aliasing',()=>{
 assert.deepEqual(audit.parseNumber('0452t'),{code:'0452T',number:452,suffix:'T'});
 assert.deepEqual(audit.parseNumber(' 0401N '),{code:'0401N',number:401,suffix:'N'});
 assert.deepEqual(audit.parseNumber('0701E'),{code:'0701E',number:701,suffix:'E'});
 for(const value of ['50050型','DE10 1109','編成123F','4xxT','50090-1','0452 T','T452'])
  assert.equal(audit.parseNumber(value),null,value);
});
test('read-only observed code candidates cannot certify stock, service date or livery',()=>{
 const rows=[
  train('0452T','Isesaki'),train('0452T','Isesaki'), // duplicate
  train('2282T','TobuSkytree','odpt.Calendar:SaturdayHoliday'),
  train('0401N','Utsunomiya'),train('0486N','Utsunomiya'),
  train('0701E','Koizumi'),train('0764E','Koizumi'),
  train('0763X','Koizumi'),train('9001T','Tojo'),
  train('1001','Nikko'),train('0452T','Isesaki','odpt.Calendar:SaturdayHoliday')
 ];
 const result=audit.inspect(rows,{complete:false,failures:[{scope:'all',reason:'too large'}]},refs);
 assert.equal(result.status,'observed');
 assert.equal(result.complete,false);
 assert.equal(result.uniqueNumbers,9);
 assert.deepEqual(result.watched.map(x=>x.matchedPublishedCodes),[2,2,2]);
 assert.deepEqual(result.watched.map(x=>x.verifiedTrainToPng),[0,0,0]);
 assert.ok(result.watched.every(x=>x.modelFieldCrosswalkVerified===false));
 assert.equal(result.trainToPngAuthorized,0);
 assert.equal(result.failures.length,1);
 assert.ok(!JSON.stringify(result).includes('consumerKey'));
});
test('existing CSV envelopes are read without inferring intermediate service values',()=>{
 const txt=[
 '分类,运营方目录,PNG路径,线路,起始番号,结束番号,后缀,号码格式,状态',
 '私铁,東武鉄道,images/列车/東武鉄道/東武鉄道_50050型.png,Hanzomon,0452,2282,T,full,纯号段',
 '私铁,東武鉄道,images/列车/東武鉄道/東武鉄道_20400型.png,TobuUtsunomiya,0401,0486,N,full,纯号段',
 '私铁,東武鉄道,images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png,Koizumi,0701,0764,E,full,纯号段'
 ].join('\n')+'\n';
 const observed=audit.getEnvelopes(txt);
 assert.deepEqual(observed.map(x=>[x.model,x.min,x.max,x.suffix]),[
 ['50050',452,2282,'T'],['20400',401,486,'N'],['10030-50',701,764,'E']]);
 assert.throws(()=>audit.getEnvelopes(txt.replace('0764','0700')),/Reversed range/);
});
test('existing live proxy is used; no client-exposed challenge credential',()=>{
 assert.ok(audit.PROXY.includes('/functions/v1/odpt-proxy'));
 assert.ok(!audit.PROXY.includes('consumerKey'));
 assert.ok(!audit.PROXY.includes('api-challenge.odpt.org'));
 assert.equal(audit.ORIGIN,'https://biubiu52011.github.io');
});

test('unconfigured Challenge secret fails closed before requesting any train numbers',async()=>{
 let calls=0;
 const fake=async(url)=>{
  calls++;assert.match(url,/\?health=1$/);
  return {ok:true,json:async()=>({ok:true,challengeConfigured:false,credentialValuesExposed:false})};
 };
 const observation=await audit.fetchScoped(fake);
 assert.equal(calls,1);
 assert.equal(observation.records.length,0);
 assert.equal(observation.complete,false);
 assert.match(observation.failures[0].reason,/not configured/);
});
test('configured health permits only existing proxy calls, not a consumer key query',async()=>{
 let calls=0;
 const fake=async(url)=>{
  calls++;assert.ok(!url.includes('consumerKey'));
  if(url.includes('?health=1'))return {ok:true,json:async()=>({challengeConfigured:true})};
  assert.ok(url.includes('operator=Tobu'));
  return {ok:true,json:async()=>[train('0452T','Isesaki')]};
 };
 const observation=await audit.fetchScoped(fake);
 assert.equal(calls,2);
 assert.equal(observation.records.length,1);
 assert.equal(observation.complete,true);
 assert.equal(observation.failures.length,0);
});
