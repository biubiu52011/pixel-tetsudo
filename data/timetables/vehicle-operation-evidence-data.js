/* Curated JR East 2026-Nov official Chuo Main rolling-stock references.
 * Distinct from observed vehicle formations. Copyright note: this is a
 * small list of train-number/model evidence, NOT a copy of the timetable
 * or its stop times. Date qualification is required for every special train.
 *
 * Official model classification:
 * https://www.jreast.co.jp/train/express/azusa_kaiji.html
 * Official November train-number / train-name details are cited per row.
 * Source-only local trains (211/E131/etc) are NOT assigned model PNGs
 * because JR East does not publish per-train local vehicle dispatch here.
 */
(function(root) {
  "use strict";
  var officialModelUrl="https://www.jreast.co.jp/train/express/azusa_kaiji.html";
  var holidayDates=[
    "2026-11-01","2026-11-03","2026-11-07","2026-11-08",
    "2026-11-14","2026-11-15","2026-11-21","2026-11-22",
    "2026-11-23","2026-11-28","2026-11-29"
  ];
  // Exact operating dates in November 2026. Even 9xxxM cannot be assumed
  // to operate on all holiday dates.
  var special=[
    // 2611: November date-verified supplements. The 2611 master page
    // also includes non-November trains: never infer a month from appearance.
    // Official "Shinshu" still uses E353; the 2023 JR-East press release
    // explicitly identifies its 3-car E353 planned stock.
    ["8091M","信州1号","weekday",
      ["02","04","05","06","09","10","11","12","13","16",
       "17","18","19","20","24","25","26","27","30"],
      "https://timetables.jreast.co.jp/2611/train/090/094611.html",
      "https://www.jreast.co.jp/press/2022/nagano/20230120_na01.pdf"],
    ["8092M","信州2号","weekday",
      ["02","04","05","06","09","10","11","12","13","16",
       "17","18","19","20","24","25","26","27","30"],
      "https://timetables.jreast.co.jp/2611/train/095/099331.html",
      "https://www.jreast.co.jp/press/2022/nagano/20230120_na01.pdf"],
    ["8074M","あずさ74号","holiday",
      ["01","03","08","15","23"],
      "https://timetables.jreast.co.jp/2611/train/060/064271.html"],
    ["8075M","あずさ75号","holiday",
      ["07","14","21","22"],
      "https://timetables.jreast.co.jp/2611/train/060/064261.html"],
    ["8077M","あずさ77号","holiday",
      ["07","14","21","22","28"],
      "https://timetables.jreast.co.jp/2611/train/070/071581.html"],
    ["8079M","あずさ79号","holiday",
      ["01","03","07","08","14","15","21","22","23","28"],
      "https://timetables.jreast.co.jp/2611/train/070/071591.html"],
    ["8083M","あずさ83号","holiday",["07","14","21","22","28"],
      "https://timetables.jreast.co.jp/2611/train/075/076761.html"],
    ["8170M","かいじ70号","weekday",null,
      "https://timetables.jreast.co.jp/2611/train/115/115091.html"],
    ["9085M","あずさ85号","holiday",["21"],
      "https://timetables.jreast.co.jp/2611/train/110/110741.html"],
    ["8084M","あずさ84号","holiday",
      ["01","03","08","15","22","23","29"],
      "https://timetables.jreast.co.jp/2611/train/070/071601.html"],
    ["9071M","あずさ71号","holiday",
      ["07","14","21","22"],
      "https://timetables.jreast.co.jp/2611/train/095/096802.html"],
    ["9076M","あずさ76号","holiday",["23"],
      "https://timetables.jreast.co.jp/2611/train/095/096821.html"],
    ["9078M","あずさ78号","holiday",
      ["01","03","07","08","14","15","21","22","23","28","29"],
      "https://timetables.jreast.co.jp/2611/train/095/096831.html"],
    ["9178M","富士回遊78号","holiday",
      ["01","03","07","08","14","15","21","22","23","28","29"],
      "https://timetables.jreast.co.jp/2611/train/095/096831.html"],
    ["9081M","あずさ81号","holiday",
      ["01","03","07","08","14","15","21","22","23","28","29"],
      "https://timetables.jreast.co.jp/2611/train/095/096811.html"],
    ["9181M","富士回遊81号","holiday",
      ["01","03","07","08","14","15","21","22","23","28","29"],
      "https://timetables.jreast.co.jp/2611/train/095/096811.html"],
    ["9082M","あずさ82号","holiday",
      ["01","03","08","15","22","23","29"],
      "https://timetables.jreast.co.jp/2611/train/105/109961.html"],
    ["9086M","あずさ86号","holiday",["22","23"],
      "https://timetables.jreast.co.jp/2611/train/095/096841.html"],
    ["8193M","富士回遊93号","weekday",null,
      "https://timetables.jreast.co.jp/2611/train/100/103031.html"],
    ["8194M","富士回遊94号","weekday",null,
      "https://timetables.jreast.co.jp/2611/train/100/103041.html"]
  ];
  var mapped=special.map(function(row){
    var days=row[3] ? row[3].map(function(d){return "2026-11-"+d;}) : null;
    return {
      trainNumber:row[0],serviceName:row[1],vehicleType:"E353系",
      garagePngPath:"../images/列车/JR東日本/JR東日本_E353系.png",
      operator:"JR-East",networkKey:"ChuoMain",
      sourceRailways:["odpt.Railway:JR-East.Chuo","odpt.Railway:JR-East.ChuoMain"],
      trainType:"LimitedExpress",calendarType:row[2],
      effectiveFrom:"2026-11-01",effectiveTo:"2026-11-30",
      operatingDates:days,sourceUrl:row[4],
      modelSourceUrl:row[5]||officialModelUrl,
      evidenceRole:"official-train-name-and-model",
      actualVehicleConfirmed:false
    };
  });
  // Do not repurpose this as a 211-series number-range lookup. Both the
  // incumbent 211-series and announced E131-series have documented scope
  // but no published assignment to a specific local number.
  var fleetScope=Object.freeze({
    lineId:"ChuoMain",
    segment:"Takao–Shiojiri",
    candidateModels:["211系（長野地区）","E131系200番台"],
    operator:"JR-East",actualVehicleConfirmed:false,
    sourceUrl:"https://www.jreast.co.jp/press/2026/nagano/20260507_na01.pdf"
  });
  var previous=Array.isArray(root.VEHICLE_REFERENCE_RULES) ?
    root.VEHICLE_REFERENCE_RULES : [];
  root.VEHICLE_REFERENCE_RULES=previous.concat(mapped);
  root.CHUO_MAIN_OFFICIAL_VEHICLE_REFERENCES=Object.freeze({
    revision:"2026-11",modelSourceUrl:officialModelUrl,
    rules:mapped,holidayDates:holidayDates,fleetScope:fleetScope
  });
})(window);
