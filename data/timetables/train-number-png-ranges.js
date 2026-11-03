/* Train NUMBER -> display PNG ranges (not operating-number conversion).
 * Match the published trainNumber directly: K/F/S service numbers use the
 * final two numeric characters; Sotetsu/JR-through M numbers and ChuoRapid
 * T/H service numbers use their full train-number range.
 * Never convert any train number to an operation number.
 * Preserve the original full train number as its identity.
 * The model is a representative image, never a verified physical formation.
 *
 * Saikyo / Kawagoe / Rinkai numbering:
 * https://timetables.jreast.co.jp/2611/timetable-v/628u2.html
 * https://note.com/ototetsu/n/n06a26a06db68
 *
 * ChuoRapid 2026 weekday/weekend official train-number lists:
 * https://timetables.jreast.co.jp/2611/timetable-v/658u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/658u2.html
 * JR East E233-0 T/H stock: https://media.jreast.co.jp/articles/3342
 */
(function(root){
  "use strict";
  var rows=[
    {lineIds:["SaikyoKawagoe","Rinkai"],from:0,to:71,suffixes:"KFS",
      model:"E233系7000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_7000番台.png"},
    {lineIds:["SaikyoKawagoe"],from:72,to:79,suffixes:"KFS",
      model:"相鉄12000系",
      pngPath:"../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png"},
    // 70-000 / 71-000 can both work here. The PNG is a DISPLAY DEFAULT,
    // not a claim about the actual carset or its livery.
    {lineIds:["SaikyoKawagoe","Rinkai"],from:80,to:91,suffixes:"KFS",
      model:"東京臨海高速鉄道70-000形",
      pngPath:"../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_70-000形.png"},
    // JR East published Sotetsu-through timetable numbers use 120M+ for
    // Sotetsu limited express and 220M+ for local services. Unlike K/F/S,
    // the last two digits of 277M are NOT a stock-ownership operation number.
    // Both E233-7000 and Sotetsu 12000 can operate these services.
    // Use E233-7000 strictly as the configured representative DISPLAY PNG.
    {lineIds:["SaikyoKawagoe","SotetsuJRDirect"],numberFormat:"full",
      from:120,to:199,suffixes:"M",
      model:"E233系7000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_7000番台.png"},
    {lineIds:["SaikyoKawagoe","SotetsuJRDirect"],numberFormat:"full",
      from:220,to:299,suffixes:"M",
      model:"E233系7000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_7000番台.png"},
    // JR East 2026 ChuoRapid published 3-4 digit T/H train numbers,
    // including 1932T, 1926H, 486T and 2452T. This is the full
    // public train-number interval, not its trailing operation digits.
    // Other ChuoRapid services (e.g. 2627M) are NOT part of this range.
    {lineIds:["ChuoRapid"],numberFormat:"full",
      from:400,to:2599,suffixes:"TH",
      model:"E233系0番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_0番台.png"}
  ];
  rows.forEach(function(row){Object.freeze(row.lineIds);Object.freeze(row);});
  Object.freeze(rows);
  function match(trainNumber,lineId){
    var number=String(trainNumber||"").trim().toUpperCase();
    var line=String(lineId||"").trim();
    // Match train NUMBER ranges, not an inferred operation ID.
    // 1940K uses terminal 40; 277M and 1932T use their full number.
    var regular=number.match(/^[0-9]{1,2}([0-9]{2})([KFS])$/);
    var through=number.match(/^([0-9]{3,4})([MTH])$/);
    if((!regular&&!through)||!line)return null;
    var numberValue=regular?Number(regular[1]):Number(through[1]);
    var suffix=regular?regular[2]:through[2];
    var format=regular?"tail":"full";
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      if((row.numberFormat||"tail")!==format||
          row.lineIds.indexOf(line)<0||numberValue<row.from||
          numberValue>row.to||row.suffixes.indexOf(suffix)<0)continue;
      return {trainNumber:number,lineId:line,model:row.model,
        pngPath:row.pngPath,source:"train-number-range",
        planned:true,representative:true};
    }
    return null;
  }
  root.TrainNumberPngRanges=Object.freeze({
    version:"20261103-direct-number-v3",match:match
  });
})(window);
