/* Train NUMBER -> display PNG ranges (not operating-number conversion).
 * Match published trainNumber DIRECTLY per line. Saikyo/Rinkai K/F/S trains
 * use their final two numerical characters; Yokohama line K trains instead
 * use the entire published 3/4-digit train number. Sotetsu M, ChuoRapid T/H,
 * and other full-number rules retain their original whole-number semantics.
 * Ome / Itsukaichi lines additionally use suffixless three/four-digit train numbers;
 * these are public train numbers too, NOT vehicle identifiers.
 * Chuo corridor regular express M numbers use full numbers PLUS the published
 * train type (LimitedExpress) because ordinary services also carry M numbers.
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
 *
 * Chuo main regular Azusa/Kaiji/Fuji Excursion train numbers in Nov 2026:
 * https://timetables.jreast.co.jp/2611/timetable-v/223d2p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/223u2p.html
 * E353 stock: https://www.jreast.co.jp/train/express/azusa_kaiji.html
 *
 * Ome (incl. Ome-Okutama) and Itsukaichi published train numbers, Nov 2026:
 * https://timetables.jreast.co.jp/2611/timetable-v/652u1.html
 * https://timetables.jreast.co.jp/2611/timetable-v/652u2.html
 * https://timetables.jreast.co.jp/2611/timetable-v/652d1p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/652d2.html
 * JR East confirms E233-0 on suffixless 843/1103 and 1379T/721T:
 * https://media.jreast.co.jp/articles/2564
 * JR East confirms Itsukaichi 2149 on Saturday/holiday dep Haijima 21:57:
 * https://timetables.jreast.co.jp/2611/train/050/053471.html
 * E233 fleet operates on Itsukaichi per JR East:
 * https://www.jreast.co.jp/train/local/e233.html
 *
 * Yokohama line 2026 Nov weekday/holiday public K train numbers:
 * https://timetables.jreast.co.jp/2611/timetable-v/608d1p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/608d2.html
 * 2221K (Haigashi-Kanagawa 22:04 -> Hashimoto 22:49 holiday):
 * https://timetables.jreast.co.jp/2611/train/145/146521.html
 * JR East E233-6000 (Yokohama line):
 * https://media.jreast.co.jp/articles/1710
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
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_0番台.png"},
    // Ome uses both T/H-numbered Chuo through trains (e.g. 434T, 405H,
    // 1378T, 1926H) and suffixless local numbers (e.g. 509, 843, 1103,
    // 1705, 2348). They are FULL public numbers, not operation-number tails.
    // The common E233-0 gallery PNG represents the model; a 4-car Ome-Okutama
    // train must not be claimed to be a verified 10-car physical formation.
    // Itsukaichi uses the same E233-0 gallery default; 2149 on 2026-11-03
    // is confirmed as a suffixless 21:57 Haijima -> Musashi-Itsukaichi train.
    {lineIds:["Ome","Itsukaichi"],numberFormat:"full",
      from:400,to:2599,suffixes:"TH",excludeTrainType:"LimitedExpress",
      model:"E233系0番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_0番台.png"},
    {lineIds:["Ome","Itsukaichi"],numberFormat:"bare",
      from:400,to:2499,suffixes:"",excludeTrainType:"LimitedExpress",
      model:"E233系0番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_0番台.png"},
    // Yokohama trains use FULL public K numbers, including 415K, 2107K,
    // 2221K, 3937K, 4013K and 4747K (2026 weekday/weekend JR timetable).
    // The E233-6000 gallery default is scoped to Yokohama only. A train
    // continuing onto KeihinTohoku/Negishi is not reclassified from the
    // display line alone; a separate validated source-railway projection
    // would be needed to paint its vehicle on another line.
    {lineIds:["Yokohama"],numberFormat:"full",
      from:400,to:4999,suffixes:"K",excludeTrainType:"LimitedExpress",
      model:"E233系6000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_6000番台.png"},
    // 2026-11 Nambu mainline JR-East F-numbered Local/Rapid services.
    // Holiday 2319F: Kawasaki 23:13 -> Musashi-Mizonokuchi 23:34.
    // E233-8000 is a representative line-stock IMAGE; E233-8500 also
    // works on this line, so F numbers never prove a physical carset.
    // https://timetables.jreast.co.jp/2611/train/140/141401.html
    // https://timetables.jreast.co.jp/2611/timetable-v/703d2.html
    // https://media.jreast.co.jp/articles/1712
    {lineIds:["Nambu"],numberFormat:"full",from:400,to:4999,
      suffixes:"F",trainTypes:["Local","Rapid"],operator:"JR-East",
      sourceOperatorFallback:true,
      sourceRailways:["odpt.Railway:JR-East.Nambu"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E233系8000番台"],
      model:"E233系8000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E233系_8000番台.png"},
    // 2026-11 Joban Rapid E231-0: exact weekday / holiday 2611 H
    // public train-number set, never a blanket 430H-2495H interval.
    // https://timetables.jreast.co.jp/2611/timetable-v/642u1.html
    // https://timetables.jreast.co.jp/2611/timetable-v/642u2.html
    {lineIds:["Joban"],numberFormat:"full",from:430,to:2495,
      suffixes:"H",operator:"JR-East",trainTypes:["Rapid"],
      sourceRailways:["odpt.Railway:JR-East.JobanRapid"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      numberIndex:"joban-e231-h-202611",
      allowedModelLabels:["E231系0番台","E231系0番台（常磐快速線・LED）"],
      model:"E231系0番台（常磐快速線・LED）",
      pngPath:"../images/列车/JR東日本/JR東日本_E231系_0番台_常磐快速線.png"},
    // 2026-11 JR East regular Hitachi 1-30M / Tokiwa 51-86M.
    // These are exact timetable-bounded limited-express public numbers,
    // NOT a claim about the particular physical E657 formation.
    // https://www.jreast.co.jp/train/express/hitachi_tokiwa.html
    // https://timetables.jreast.co.jp/2611/timetable-v/240u1p.html
    {lineIds:["Joban","JobanMain"],numberFormat:"full",from:1,to:30,
      suffixes:"M",operator:"JR-East",trainType:"LimitedExpress",
      sourceRailways:["odpt.Railway:JR-East.Joban",
        "odpt.Railway:JR-East.JobanRapid"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E657系","E657系（ひたち・ときわ）"],
      model:"E657系",
      pngPath:"../images/列车/JR東日本/JR東日本_E657系.png"},
    {lineIds:["Joban","JobanMain"],numberFormat:"full",from:51,to:86,
      suffixes:"M",operator:"JR-East",trainType:"LimitedExpress",
      sourceRailways:["odpt.Railway:JR-East.Joban",
        "odpt.Railway:JR-East.JobanRapid"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      allowedModelLabels:["E657系","E657系（ひたち・ときわ）"],
      model:"E657系",
      pngPath:"../images/列车/JR東日本/JR東日本_E657系.png"},
    // JR East's 2026-11 holiday timetable lists 1252M as a regular
    // Katsuta -> Shinagawa service with a Green car. The canonical SQL
    // JobanMain -> Joban record also carries an E531 source-model candidate.
    // On the rapid-line diagram the same through train may be labelled Rapid.
    // This is a narrow PLANNED artwork reference, not a confirmed carset.
    // https://timetables.jreast.co.jp/2611/timetable-v/642u2p.html
    // https://www.jreast.co.jp/en/train/local/e531.html
    {lineIds:["Joban","JobanMain"],numberFormat:"full",
      from:1252,to:1252,suffixes:"M",operator:"JR-East",
      trainTypes:["Local","Rapid"],calendarType:"holiday",
      sourceRailways:["odpt.Railway:JR-East.Joban",
        "odpt.Railway:JR-East.JobanRapid"],
      validFrom:"2026-11-01",validTo:"2026-11-30",
      requireCompatiblePlan:true,
      model:"E531系",
      pngPath:"../images/列车/JR東日本/JR東日本_E531系.png"},
    // JR East Tsurumi regular services changed to E131-1000 fleet in March
    // 2024. These remain scheduled DISPLAY REFERENCES, not observed sets.
    // 2026-11-03 holiday train 2200: Ogimachi 22:10 -> Tsurumi 22:27.
    // https://timetables.jreast.co.jp/2611/train/030/030851.html
    {lineIds:["Tsurumi","TsurumiUmiShibaura","TsurumiOkawa"],
      numberFormat:"bare",from:400,to:2599,suffixes:"",
      trainType:"Local",operator:"JR-East",validFrom:"2024-03-16",
      model:"E131系1000番台",
      pngPath:"../images/列车/JR東日本/JR東日本_E131系_1000番台.png"},
    // 2026 scheduled Chuo limited express: 1M (Azusa 1),
    // 3107M (Kaiji 7), 2107M (Fuji Excursion 7), 5003M (Azusa 3).
    // These intervals overlap M-number ordinary trains, so require the
    // explicit LimitedExpress train type. Special 8xxx/9xxx services retain
    // their separate date-restricted published reference rules.
    {lineIds:["ChuoRapid","ChuoMain"],numberFormat:"full",
      from:1,to:60,suffixes:"M",trainType:"LimitedExpress",
      model:"E353系",
      pngPath:"../images/列车/JR東日本/JR東日本_E353系.png"},
    {lineIds:["ChuoRapid","ChuoMain"],numberFormat:"full",
      from:2101,to:2199,suffixes:"M",trainType:"LimitedExpress",
      model:"E353系",
      pngPath:"../images/列车/JR東日本/JR東日本_E353系.png"},
    {lineIds:["ChuoRapid","ChuoMain"],numberFormat:"full",
      from:3101,to:3199,suffixes:"M",trainType:"LimitedExpress",
      model:"E353系",
      pngPath:"../images/列车/JR東日本/JR東日本_E353系.png"},
    {lineIds:["ChuoRapid","ChuoMain"],numberFormat:"full",
      from:5001,to:5099,suffixes:"M",trainType:"LimitedExpress",
      model:"E353系",
      pngPath:"../images/列车/JR東日本/JR東日本_E353系.png"}
  ];
  rows.forEach(function(row){Object.freeze(row.lineIds);Object.freeze(row);});
  Object.freeze(rows);
  function match(trainNumber,lineId,context){
    var number=String(trainNumber||"").trim().toUpperCase();
    var line=String(lineId||"").trim();
    // Match train NUMBER ranges, not an inferred operation ID.
    // One train number can have both a scoped tail and a full-number
    // interpretation: 1940K -> 40 on Saikyo, 1940K -> 1940 on Yokohama.
    // Determine the interpretation FROM THE LINE RULE, not from the suffix.
    // This is never a train number -> operation number conversion.
    var regular=number.match(/^[0-9]{1,2}([0-9]{2})([KFS])$/);
    var numbered=number.match(/^([0-9]{1,4})([KFMSTH])$/);
    var bare=number.match(/^([0-9]{3,4})$/);
    if((!regular&&!numbered&&!bare)||!line)return null;
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      if(row.lineIds.indexOf(line)<0)continue;
      var format=row.numberFormat||"tail";
      var numberValue,suffix;
      if(format==="tail"&&regular){
        numberValue=Number(regular[1]);
        suffix=regular[2];
      }else if(format==="full"&&numbered){
        numberValue=Number(numbered[1]);
        suffix=numbered[2];
      }else if(format==="bare"&&bare){
        numberValue=Number(bare[1]);
        suffix="";
      }else continue;
      if(numberValue<row.from||numberValue>row.to||
          row.suffixes.indexOf(suffix)<0)continue;
      // M suffix alone does not distinguish an express from an ordinary
      // train: require the ODPT or SQL train-type field for these rows.
      var actualType=String(context&&(context.trainType||context.typeName)||"");
      if(row.excludeTrainType &&
         (/(?:^|[.:])LimitedExpress$/i.test(actualType) ||
          /^特急$/.test(actualType) || /^limited express$/i.test(actualType)))continue;
      if(row.trainType){
        var trainType=String(context&&(context.trainType||context.typeName)||"");
        if(row.trainType==="Local"){
          if(!/(?:^|[.:])Local$/i.test(trainType)&&!/^普通$/.test(trainType))continue;
        }else if(!/(?:^|[.:])LimitedExpress$/i.test(trainType)&&
            !/^特急$/.test(trainType)&&
            !/^limited express$/i.test(trainType))continue;
      }
      if(row.operator){
        var trainOperator=String(context&&(context.trainOperator||context.operator)||"");
        // A planned SQL position can omit a trainOperator field even while
        // carrying its exact JR-East ODPT railway URN. For explicitly
        // source-scoped rows only, this verified namespace is sufficient.
        var scopedSource=String(context&&context.sourceRailway||"");
        var operatorFromSource=row.sourceOperatorFallback===true &&
          !trainOperator && Array.isArray(row.sourceRailways) &&
          row.sourceRailways.indexOf(scopedSource)>=0 &&
          scopedSource.indexOf("odpt.Railway:"+row.operator+".")===0;
        if(trainOperator!==row.operator&&
            trainOperator!=="odpt.Operator:"+row.operator&&
            !operatorFromSource)continue;
      }
      if(row.validFrom){
        var serviceDate=String(context&&context.serviceDate||"").slice(0,10);
        if(!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)||serviceDate<row.validFrom)continue;
      }
      if(row.validTo && String(context&&context.serviceDate||"").slice(0,10)>row.validTo)continue;
      if(row.calendarType && String(context&&context.calendarType||"")!==row.calendarType)continue;
      if(row.trainTypes){
        var runtimeType=String(context&&(context.trainType||context.typeName)||"").split(/[.:]/).pop();
        if(row.trainTypes.indexOf(runtimeType)<0)continue;
      }
      if(row.sourceRailways &&
          row.sourceRailways.indexOf(String(context&&context.sourceRailway||""))<0)continue;
      if(row.numberIndex==="joban-e231-h-202611"){
        var idx=root.JobanE231RapidNumberIndex;
        if(!idx || typeof idx.match!=="function" ||
            !idx.match(number,String(context&&context.calendarType||""),
              context&&context.serviceDate))continue;
      }
      if(row.allowedModelLabels && context){
        var observed=String(context.realtimeVehicleType ||
          context.realtimeDerivedVehicleType || "").trim();
        if(observed && row.allowedModelLabels.indexOf(observed)<0)continue;
        var plan=context.vehiclePlan;
        if(plan && (plan.confirmed===true || plan.status==="PLANNED_MODEL") &&
            Array.isArray(plan.models) && plan.models.length &&
            plan.models.some(function(m){return row.allowedModelLabels.indexOf(m)<0;}))
          continue;
      }
      if(row.requireCompatiblePlan && context && context.vehiclePlan &&
          Array.isArray(context.vehiclePlan.models) && context.vehiclePlan.models.length &&
          context.vehiclePlan.models.indexOf(row.model)<0)continue;
      return {trainNumber:number,lineId:line,model:row.model,
        pngPath:row.pngPath,source:"train-number-range",
        planned:true,representative:true};
    }
    return null;
  }
  root.TrainNumberPngRanges=Object.freeze({
    version:"20261103-direct-number-v12",match:match
  });
})(window);
