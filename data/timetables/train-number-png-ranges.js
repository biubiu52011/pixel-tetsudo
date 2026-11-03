/* Train NUMBER -> display PNG ranges (not operating-number conversion).
 * Directly read the last two numeric characters of a published trainNumber
 * before K/F/S; preserve the original full train number as its identity.
 * The model is a representative image, never a verified physical formation.
 *
 * Saikyo / Kawagoe / Rinkai numbering:
 * https://timetables.jreast.co.jp/2611/timetable-v/628u2.html
 * https://note.com/ototetsu/n/n06a26a06db68
 */
(function(root){
  "use strict";
  var rows=[
    {lineIds:["SaikyoKawagoe","Rinkai"],from:0,to:71,suffixes:"KFS",
      model:"E233系7000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_7000番台.png"},
    {lineIds:["SaikyoKawagoe","Rinkai"],from:72,to:79,suffixes:"KFS",
      model:"相鉄12000系",
      pngPath:"../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png"},
    // 70-000 / 71-000 can both work here. The PNG is a DISPLAY DEFAULT,
    // not a claim about the actual carset or its livery.
    {lineIds:["SaikyoKawagoe","Rinkai"],from:80,to:91,suffixes:"KFS",
      model:"東京臨海高速鉄道70-000形",
      pngPath:"../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_70-000形.png"}
  ];
  rows.forEach(function(row){Object.freeze(row.lineIds);Object.freeze(row);});
  Object.freeze(rows);
  function match(trainNumber,lineId){
    var number=String(trainNumber||"").trim().toUpperCase();
    var line=String(lineId||"").trim();
    // Match the published train NUMBER itself, not a calculated operation ID.
    // Examples: 1940K -> 40; 1984S -> 84; 4614K -> 14.
    var matchNumber=number.match(/^[0-9]{1,2}([0-9]{2})([KFS])$/);
    if(!matchNumber||!line)return null;
    var numberTail=Number(matchNumber[1]), suffix=matchNumber[2];
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      if(row.lineIds.indexOf(line)<0||numberTail<row.from||
          numberTail>row.to||row.suffixes.indexOf(suffix)<0)continue;
      return {trainNumber:number,lineId:line,model:row.model,
        pngPath:row.pngPath,source:"train-number-range",
        planned:true,representative:true};
    }
    return null;
  }
  root.TrainNumberPngRanges=Object.freeze({
    version:"20261103-direct-number-v1",match:match
  });
})(window);
