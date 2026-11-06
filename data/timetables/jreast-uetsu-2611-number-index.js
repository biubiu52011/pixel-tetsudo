/* 羽越本線 Uetsu 2026-11, source-scoped *representative* PNG index.
 * Official JR East November timetable: 255d1/255u1 and 255d2/255u2.
 * https://timetables.jreast.co.jp/2611/timetable-v/255d1p.html
 * https://timetables.jreast.co.jp/2611/timetable-v/255u1p.html
 * Old manual SQL candidate is not itself proof of a 2026-11 train.
 * Fail closed on extra/undated 8xxx/9xxx and on source-route/direction
 * mismatches. The full scheduled-stop itinerary must match original
 * SQL row endpoints/stop count; extra rows with duplicated fragments
 * are not distinct trains. Source CLOCKS are historical and not certified.
 * Operating disruption (incl. Nov 7 strong winds) is NOT live GPS data.
 * Actual carsets, E653 color variants, E129/701 set numbers are UNKNOWN.
 */
(function(root){"use strict";
var roster={"Weekday":{"10M":["Sakata","Shibata",9,"Inbound","LimitedExpress"],"11M":["Shibata","Sakata",9,"Outbound","LimitedExpress"],"120D":["Shibata","Niitsu",7,"Inbound","Local"],"125D":["Niitsu","Shibata",7,"Outbound","Local"],"126D":["Shibata","Niitsu",7,"Inbound","Local"],"127D":["Niitsu","Shibata",7,"Outbound","Local"],"128D":["Shibata","Niitsu",7,"Inbound","Local"],"129D":["Niitsu","Shibata",7,"Outbound","Local"],"12M":["Sakata","Shibata",9,"Inbound","LimitedExpress"],"130D":["Shibata","Niitsu",7,"Inbound","Local"],"133D":["Niitsu","Shibata",7,"Outbound","Local"],"134D":["Shibata","Niitsu",7,"Inbound","Local"],"135D":["Niitsu","Shibata",7,"Outbound","Local"],"136D":["Shibata","Niitsu",7,"Inbound","Local"],"137D":["Niitsu","Shibata",7,"Outbound","Local"],"13M":["Shibata","Sakata",9,"Outbound","LimitedExpress"],"14M":["Akita","Shibata",14,"Inbound","LimitedExpress"],"150D":["Sakata","Amarume",5,"Inbound","Local"],"151D":["Amarume","Sakata",5,"Outbound","Local"],"1521M":["Araya","Akita",3,"Outbound","Local"],"1529M":["Araya","Akita",3,"Outbound","Local"],"152D":["Sakata","Amarume",5,"Inbound","Local"],"1532M":["Akita","Araya",3,"Inbound","Local"],"1533M":["Araya","Akita",3,"Outbound","Local"],"1534M":["Akita","Araya",3,"Inbound","Local"],"1537M":["Araya","Akita",3,"Outbound","Local"],"1538M":["Akita","Araya",3,"Inbound","Local"],"1547M":["Araya","Akita",3,"Outbound","Local"],"1548M":["Akita","Araya",3,"Inbound","Local"],"1553M":["Araya","Akita",3,"Outbound","Local"],"1554M":["Akita","Araya",3,"Inbound","Local"],"1564M":["Akita","Araya",3,"Inbound","Local"],"160D":["Sakata","Amarume",5,"Inbound","Local"],"161D":["Amarume","Sakata",5,"Outbound","Local"],"162D":["Sakata","Amarume",5,"Inbound","Local"],"163D":["Amarume","Sakata",5,"Outbound","Local"],"1924M":["Murakami","Shibata",9,"Inbound","Local"],"1925M":["Shibata","Murakami",9,"Outbound","Local"],"1926M":["Murakami","Shibata",9,"Inbound","Local"],"1928M":["Murakami","Shibata",9,"Inbound","Local"],"1932M":["Murakami","Shibata",9,"Inbound","Local"],"1937M":["Shibata","Murakami",9,"Outbound","Local"],"1941M":["Shibata","Murakami",9,"Outbound","Local"],"1946M":["Murakami","Shibata",9,"Inbound","Local"],"1951M":["Shibata","Murakami",9,"Outbound","Local"],"1M":["Shibata","Akita",14,"Outbound","LimitedExpress"],"2121D":["Niitsu","Suibara",3,"Outbound","Local"],"2122D":["Suibara","Niitsu",3,"Inbound","Local"],"2123M":["Niitsu","Shibata",7,"Outbound","Local"],"2124M":["Shibata","Niitsu",7,"Inbound","Local"],"2131M":["Niitsu","Shibata",7,"Outbound","Local"],"2132M":["Shibata","Niitsu",7,"Inbound","Local"],"220D":["Sakata","Nezugaseki",16,"Inbound","Local"],"221D":["Nezugaseki","Sakata",16,"Outbound","Local"],"222M":["Sakata","Tsuruoka",8,"Inbound","Local"],"223D":["Nezugaseki","Sakata",16,"Outbound","Local"],"224D":["Sakata","Atsumi-Onsen",14,"Inbound","Local"],"225M":["Tsuruoka","Sakata",8,"Outbound","Local"],"226D":["Sakata","Nezugaseki",16,"Inbound","Local"],"227D":["Atsumi-Onsen","Sakata",14,"Outbound","Local"],"228D":["Sakata","Nezugaseki",16,"Inbound","Local"],"229D":["Nezugaseki","Sakata",16,"Outbound","Local"],"245M":["Sakata","Fukuura",5,"Outbound","Local"],"2523M":["Ugo-Honjo","Akita",9,"Outbound","Local"],"2527M":["Ugo-Honjo","Akita",10,"Outbound","Local"],"2540M":["Akita","Ugo-Honjo",9,"Inbound","Local"],"2541M":["Ugo-Honjo","Akita",9,"Outbound","Local"],"2544M":["Akita","Ugo-Honjo",9,"Inbound","Local"],"2545M":["Ugo-Honjo","Akita",9,"Outbound","Local"],"2558M":["Akita","Ugo-Honjo",9,"Inbound","Local"],"2559M":["Ugo-Honjo","Akita",9,"Outbound","Local"],"2562M":["Akita","Ugo-Honjo",9,"Inbound","Local"],"2M":["Sakata","Shibata",9,"Inbound","LimitedExpress"],"3131D":["Amarume","Sakata",2,"Outbound","Rapid"],"3921M":["Shibata","Murakami",4,"Outbound","Rapid"],"3M":["Shibata","Sakata",9,"Outbound","LimitedExpress"],"4M":["Sakata","Shibata",9,"Inbound","LimitedExpress"],"520M":["Ugo-Honjo","Sakata",13,"Inbound","Local"],"524M":["Akita","Sakata",21,"Inbound","Local"],"525M":["Sakata","Akita",22,"Outbound","Local"],"530M":["Akita","Sakata",22,"Inbound","Local"],"531M":["Sakata","Akita",21,"Outbound","Local"],"535M":["Sakata","Akita",20,"Outbound","Local"],"536M":["Akita","Sakata",20,"Inbound","Local"],"539M":["Sakata","Akita",21,"Outbound","Local"],"542M":["Akita","Sakata",21,"Inbound","Local"],"543M":["Sakata","Akita",22,"Outbound","Local"],"546M":["Akita","Sakata",20,"Inbound","Local"],"549M":["Sakata","Akita",20,"Outbound","Local"],"550M":["Akita","Sakata",22,"Inbound","Local"],"551M":["Sakata","Akita",22,"Outbound","Local"],"552M":["Akita","Sakata",21,"Inbound","Local"],"555M":["Sakata","Akita",22,"Outbound","Local"],"556M":["Akita","Sakata",21,"Inbound","Local"],"557M":["Sakata","Akita",21,"Outbound","Local"],"560M":["Akita","Sakata",20,"Inbound","Local"],"561M":["Sakata","Akita",20,"Outbound","Local"],"5M":["Shibata","Sakata",9,"Outbound","LimitedExpress"],"6M":["Sakata","Shibata",9,"Inbound","LimitedExpress"],"7M":["Shibata","Akita",14,"Outbound","LimitedExpress"],"820D":["Nezugaseki","Niitsu",23,"Inbound","Local"],"821D":["Murakami","Sakata",24,"Outbound","Local"],"822D":["Sakata","Murakami",24,"Inbound","Local"],"823D":["Niitsu","Sakata",38,"Outbound","Local"],"824D":["Sakata","Murakami",24,"Inbound","Local"],"825D":["Murakami","Sakata",24,"Outbound","Local"],"826D":["Sakata","Murakami",24,"Inbound","Local"],"827D":["Murakami","Sakata",24,"Outbound","Local"],"828D":["Sakata","Niitsu",38,"Inbound","Local"],"829D":["Niitsu","Sakata",38,"Outbound","Local"],"830D":["Sakata","Murakami",24,"Inbound","Local"],"831D":["Murakami","Sakata",24,"Outbound","Local"],"832D":["Sakata","Niitsu",38,"Inbound","Local"],"833D":["Niitsu","Sakamachi",12,"Outbound","Local"],"834D":["Sakata","Murakami",24,"Inbound","Local"],"835D":["Murakami","Sakata",24,"Outbound","Local"],"837D":["Niitsu","Nezugaseki",23,"Outbound","Local"],"8853D":["Shibata","Sakata",9,"Outbound","Rapid"],"8854D":["Sakata","Shibata",9,"Inbound","Rapid"],"8M":["Akita","Shibata",14,"Inbound","LimitedExpress"],"920M":["Murakami","Shibata",9,"Inbound","Local"],"922M":["Murakami","Shibata",9,"Inbound","Local"],"923M":["Shibata","Murakami",9,"Outbound","Local"],"927M":["Shibata","Murakami",9,"Outbound","Local"],"929M":["Shibata","Murakami",9,"Outbound","Local"],"930M":["Murakami","Shibata",9,"Inbound","Local"],"931M":["Shibata","Murakami",9,"Outbound","Local"],"933M":["Shibata","Murakami",9,"Outbound","Local"],"934M":["Murakami","Shibata",9,"Inbound","Local"],"935M":["Shibata","Murakami",9,"Outbound","Local"],"936M":["Murakami","Shibata",9,"Inbound","Local"],"938M":["Murakami","Shibata",9,"Inbound","Local"],"939M":["Shibata","Murakami",9,"Outbound","Local"],"940M":["Murakami","Shibata",9,"Inbound","Local"],"942M":["Murakami","Shibata",9,"Inbound","Local"],"943M":["Shibata","Murakami",9,"Outbound","Local"],"944M":["Murakami","Shibata",9,"Inbound","Local"],"945M":["Shibata","Murakami",9,"Outbound","Local"],"947M":["Shibata","Murakami",9,"Outbound","Local"],"948M":["Murakami","Shibata",9,"Inbound","Local"],"949M":["Shibata","Murakami",9,"Outbound","Local"],"950M":["Murakami","Shibata",9,"Inbound","Local"],"9M":["Shibata","Sakata",9,"Outbound","LimitedExpress"]},"SaturdayHoliday":{"10M":["Sakata","Shibata",9,"Inbound","LimitedExpress"],"11M":["Shibata","Sakata",9,"Outbound","LimitedExpress"],"120D":["Shibata","Niitsu",7,"Inbound","Local"],"125D":["Niitsu","Shibata",7,"Outbound","Local"],"126D":["Shibata","Niitsu",7,"Inbound","Local"],"127D":["Niitsu","Shibata",7,"Outbound","Local"],"128D":["Shibata","Niitsu",7,"Inbound","Local"],"129D":["Niitsu","Shibata",7,"Outbound","Local"],"12M":["Sakata","Shibata",9,"Inbound","LimitedExpress"],"130D":["Shibata","Niitsu",7,"Inbound","Local"],"133D":["Niitsu","Shibata",7,"Outbound","Local"],"134D":["Shibata","Niitsu",7,"Inbound","Local"],"135D":["Niitsu","Shibata",7,"Outbound","Local"],"136D":["Shibata","Niitsu",7,"Inbound","Local"],"137D":["Niitsu","Shibata",7,"Outbound","Local"],"13M":["Shibata","Sakata",9,"Outbound","LimitedExpress"],"14M":["Akita","Shibata",14,"Inbound","LimitedExpress"],"150D":["Sakata","Amarume",5,"Inbound","Local"],"151D":["Amarume","Sakata",5,"Outbound","Local"],"1521M":["Araya","Akita",3,"Outbound","Local"],"1529M":["Araya","Akita",3,"Outbound","Local"],"152D":["Sakata","Amarume",5,"Inbound","Local"],"1532M":["Akita","Araya",3,"Inbound","Local"],"1533M":["Araya","Akita",3,"Outbound","Local"],"1534M":["Akita","Araya",3,"Inbound","Local"],"1537M":["Araya","Akita",3,"Outbound","Local"],"1538M":["Akita","Araya",3,"Inbound","Local"],"1547M":["Araya","Akita",3,"Outbound","Local"],"1548M":["Akita","Araya",3,"Inbound","Local"],"1553M":["Araya","Akita",3,"Outbound","Local"],"1554M":["Akita","Araya",3,"Inbound","Local"],"1564M":["Akita","Araya",3,"Inbound","Local"],"160D":["Sakata","Amarume",5,"Inbound","Local"],"161D":["Amarume","Sakata",5,"Outbound","Local"],"162D":["Sakata","Amarume",5,"Inbound","Local"],"163D":["Amarume","Sakata",5,"Outbound","Local"],"1924M":["Murakami","Shibata",9,"Inbound","Local"],"1925M":["Shibata","Murakami",9,"Outbound","Local"],"1926M":["Murakami","Shibata",9,"Inbound","Local"],"1928M":["Murakami","Shibata",9,"Inbound","Local"],"1932M":["Murakami","Shibata",9,"Inbound","Local"],"1937M":["Shibata","Murakami",9,"Outbound","Local"],"1941M":["Shibata","Murakami",9,"Outbound","Local"],"1946M":["Murakami","Shibata",9,"Inbound","Local"],"1951M":["Shibata","Murakami",9,"Outbound","Local"],"1M":["Shibata","Akita",14,"Outbound","LimitedExpress"],"2121D":["Niitsu","Suibara",3,"Outbound","Local"],"2122D":["Suibara","Niitsu",3,"Inbound","Local"],"2123M":["Niitsu","Shibata",7,"Outbound","Local"],"2124M":["Shibata","Niitsu",7,"Inbound","Local"],"2131M":["Niitsu","Shibata",7,"Outbound","Local"],"2132M":["Shibata","Niitsu",7,"Inbound","Local"],"220D":["Sakata","Nezugaseki",16,"Inbound","Local"],"221D":["Nezugaseki","Sakata",16,"Outbound","Local"],"222M":["Sakata","Tsuruoka",8,"Inbound","Local"],"223D":["Nezugaseki","Sakata",16,"Outbound","Local"],"224D":["Sakata","Atsumi-Onsen",14,"Inbound","Local"],"225M":["Tsuruoka","Sakata",8,"Outbound","Local"],"226D":["Sakata","Nezugaseki",16,"Inbound","Local"],"227D":["Atsumi-Onsen","Sakata",14,"Outbound","Local"],"228D":["Sakata","Nezugaseki",16,"Inbound","Local"],"229D":["Nezugaseki","Sakata",16,"Outbound","Local"],"245M":["Sakata","Fukuura",5,"Outbound","Local"],"2523M":["Ugo-Honjo","Akita",9,"Outbound","Local"],"2527M":["Ugo-Honjo","Akita",10,"Outbound","Local"],"2540M":["Akita","Ugo-Honjo",9,"Inbound","Local"],"2541M":["Ugo-Honjo","Akita",9,"Outbound","Local"],"2544M":["Akita","Ugo-Honjo",9,"Inbound","Local"],"2545M":["Ugo-Honjo","Akita",9,"Outbound","Local"],"2558M":["Akita","Ugo-Honjo",9,"Inbound","Local"],"2559M":["Ugo-Honjo","Akita",9,"Outbound","Local"],"2562M":["Akita","Ugo-Honjo",9,"Inbound","Local"],"2M":["Sakata","Shibata",9,"Inbound","LimitedExpress"],"3131D":["Amarume","Sakata",2,"Outbound","Rapid"],"3921M":["Shibata","Murakami",4,"Outbound","Rapid"],"3M":["Shibata","Sakata",9,"Outbound","LimitedExpress"],"4M":["Sakata","Shibata",9,"Inbound","LimitedExpress"],"520M":["Ugo-Honjo","Sakata",13,"Inbound","Local"],"524M":["Akita","Sakata",21,"Inbound","Local"],"525M":["Sakata","Akita",22,"Outbound","Local"],"530M":["Akita","Sakata",22,"Inbound","Local"],"531M":["Sakata","Akita",21,"Outbound","Local"],"535M":["Sakata","Akita",20,"Outbound","Local"],"536M":["Akita","Sakata",20,"Inbound","Local"],"539M":["Sakata","Akita",21,"Outbound","Local"],"542M":["Akita","Sakata",21,"Inbound","Local"],"543M":["Sakata","Akita",22,"Outbound","Local"],"546M":["Akita","Sakata",20,"Inbound","Local"],"549M":["Sakata","Akita",20,"Outbound","Local"],"550M":["Akita","Sakata",22,"Inbound","Local"],"551M":["Sakata","Akita",22,"Outbound","Local"],"552M":["Akita","Sakata",21,"Inbound","Local"],"555M":["Sakata","Akita",22,"Outbound","Local"],"556M":["Akita","Sakata",21,"Inbound","Local"],"557M":["Sakata","Akita",21,"Outbound","Local"],"560M":["Akita","Sakata",20,"Inbound","Local"],"561M":["Sakata","Akita",20,"Outbound","Local"],"5M":["Shibata","Sakata",9,"Outbound","LimitedExpress"],"6M":["Sakata","Shibata",9,"Inbound","LimitedExpress"],"7M":["Shibata","Akita",14,"Outbound","LimitedExpress"],"820D":["Nezugaseki","Niitsu",23,"Inbound","Local"],"821D":["Murakami","Sakata",24,"Outbound","Local"],"822D":["Sakata","Murakami",24,"Inbound","Local"],"823D":["Niitsu","Sakata",38,"Outbound","Local"],"824D":["Sakata","Murakami",24,"Inbound","Local"],"825D":["Murakami","Sakata",24,"Outbound","Local"],"826D":["Sakata","Murakami",24,"Inbound","Local"],"827D":["Murakami","Sakata",24,"Outbound","Local"],"828D":["Sakata","Niitsu",38,"Inbound","Local"],"829D":["Niitsu","Sakata",38,"Outbound","Local"],"830D":["Sakata","Murakami",24,"Inbound","Local"],"831D":["Murakami","Sakata",24,"Outbound","Local"],"832D":["Sakata","Niitsu",38,"Inbound","Local"],"833D":["Niitsu","Sakamachi",12,"Outbound","Local"],"834D":["Sakata","Murakami",24,"Inbound","Local"],"835D":["Murakami","Sakata",24,"Outbound","Local"],"837D":["Niitsu","Nezugaseki",23,"Outbound","Local"],"8853D":["Shibata","Sakata",9,"Outbound","Rapid"],"8854D":["Sakata","Shibata",9,"Inbound","Rapid"],"8M":["Akita","Shibata",14,"Inbound","LimitedExpress"],"920M":["Murakami","Shibata",9,"Inbound","Local"],"922M":["Murakami","Shibata",9,"Inbound","Local"],"923M":["Shibata","Murakami",9,"Outbound","Local"],"927M":["Shibata","Murakami",9,"Outbound","Local"],"929M":["Shibata","Murakami",9,"Outbound","Local"],"930M":["Murakami","Shibata",9,"Inbound","Local"],"931M":["Shibata","Murakami",9,"Outbound","Local"],"933M":["Shibata","Murakami",9,"Outbound","Local"],"934M":["Murakami","Shibata",9,"Inbound","Local"],"935M":["Shibata","Murakami",9,"Outbound","Local"],"936M":["Murakami","Shibata",9,"Inbound","Local"],"938M":["Murakami","Shibata",9,"Inbound","Local"],"939M":["Shibata","Murakami",9,"Outbound","Local"],"940M":["Murakami","Shibata",9,"Inbound","Local"],"942M":["Murakami","Shibata",9,"Inbound","Local"],"943M":["Shibata","Murakami",9,"Outbound","Local"],"944M":["Murakami","Shibata",9,"Inbound","Local"],"945M":["Shibata","Murakami",9,"Outbound","Local"],"947M":["Shibata","Murakami",9,"Outbound","Local"],"948M":["Murakami","Shibata",9,"Inbound","Local"],"949M":["Shibata","Murakami",9,"Outbound","Local"],"950M":["Murakami","Shibata",9,"Inbound","Local"],"9M":["Shibata","Sakata",9,"Outbound","LimitedExpress"]}};
var openStations=["Niitsu","Kyogase","Suibara","Kamiyama","Tsukioka","Nakaura","Shibata","Kaji","Kanazuka","Nakajo","Hirakida","Sakamachi","Hirabayashi","Iwafunemachi","Murakami","Majima","Echigo-Hayakawa","Kuwagawa","Imagawa","Echigo-Kanagawa","Gatsugi","Fuya","Nezugaseki","Koiwagawa","Atsumi-Onsen","Isagawa","Kobato","Sanze","Uzen-Mizusawa","Uzen-Oyama","Tsuruoka","Fujishima","Nishibukuro","Amarume","Kita-Amarume","Sagoshi","Higashi-Sakata","Sakata","Mototate","Minami-Chokai","Yuza","Fukuura","Mega","Kosakagawa","Kamihama","Kisakata","Kanaura","Nikaho","Nishime","Ugo-Honjo","Ugo-Iwaya","Oritawari","Ugo-Kameda","Iwaki-Minato","Michikawa","Shimohama","Katsurane","Araya","Ugo-Ushijima","Akita"];
var position={};
openStations.forEach(function(k,i){position[k]=i;});
var kairiDays=new Set(["2026-11-01","2026-11-03","2026-11-06",
 "2026-11-07","2026-11-08","2026-11-13","2026-11-14",
 "2026-11-15","2026-11-20","2026-11-21","2026-11-22",
 "2026-11-27","2026-11-28","2026-11-29"]);
var rikuuWestThrough=new Set(["150D","151D","152D","160D","161D","162D","163D","3131D"]);
var shonaiElectric=new Set(["222M","225M"]);
var verifiedInaho=new Set(["1M","2M","3M","4M","5M","6M",
 "7M","8M","9M","10M","11M","12M","13M","14M"]);
var image={
 inaho:"../images/列车/JR東日本/JR東日本_E653系_1000番台_いなほ色.png",
 e129:"../images/列车/JR東日本/JR東日本_E129系.png",
 akita:"../images/列车/JR東日本/JR東日本_701系_秋田地区.png",
 diesel:"../images/列车/JR東日本/JR東日本_GV-E400系.png",
 kairi:"../images/列车/JR東日本/JR東日本_HB-E300系_海里.png",
 kiha110:"../images/列车/JR東日本/JR東日本_キハ110系.png"
};
function calendarFor(date){
 if(!/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(date))return "";
 var dow=new Date(date+"T12:00:00Z").getUTCDay(),d=Number(date.slice(-2));
 return dow===0||dow===6||d===3||d===23?"SaturdayHoliday":"Weekday";
}
function station(s){return String(s||"").split(".").pop();}
function verify(p){
 if(!p||p.positionLineId!=="Uetsu"||
    (p.displayLineId&&p.displayLineId!=="Uetsu")||
    p.sourceRailway!=="odpt.Railway:JR-East.Uetsu"||
    p.positionSource!=="supabase-train-run"||
    p.estimated!==true)return null;
 var day=String(p.serviceDate||"").slice(0,10);
 var cal=String(p.calendarType||p.serviceId||p.timetableCalendar||"").split(/[.:]/).pop();
 if(cal==="weekday")cal="Weekday";if(cal==="holiday")cal="SaturdayHoliday";
 if(cal!==calendarFor(day))return null;
 var op=String(p.trainOperator||"").replace(/^odpt.Operator:/,"");
 if(op&&op!=="JR-East")return null;
 var n=String(p.trainNumber||"").trim().toUpperCase();
 var r=roster[cal]&&roster[cal][n];
 if(!r||r[3]!==String(p.railDirection||"").split(/[.:]/).pop()||
    r[4]!==String(p.trainType||"").split(/[.:]/).pop())return null;
 if((n==="8853D"||n==="8854D")&&!kairiDays.has(day))return null;
 if(/^8[0-9]{3}[MD]$/.test(n)&&!kairiDays.has(day))return null;
 if(/^9[0-9]{3}[MD]$/.test(n))return null;
 var raw=Array.isArray(p.scheduledStopKeys)?
  p.scheduledStopKeys.map(station):[];
 if(raw.length!==r[2]||raw[0]!==r[0]||raw[raw.length-1]!==r[1])return null;
 var direction=r[3]==="Outbound"?1:-1;
 for(var i=0;i<raw.length;i++){
  if(position[raw[i]]===undefined)return null;
  if(i&&direction*(position[raw[i]]-position[raw[i-1]])<=0)return null;
 }
 return {trainNumber:n,calendar:cal,direction:r[3],
  origin:r[0],terminus:r[1],stopCount:r[2],trainType:r[4],
  firstIndex:position[r[0]],lastIndex:position[r[1]],
  serviceDate:day,modelEvidence:"regional-fleet-family-only",
  officialNumberVerified:verifiedInaho.has(n)||
    (n==="8853D"||n==="8854D"),
  sourceClocksVerified:false,actualVehicleConfirmed:false,
  referenceOnly:true};
}
function classify(p,proof){
 var n=proof.trainNumber,t=proof.trainType,
  a=proof.firstIndex,b=proof.lastIndex,min=Math.min(a,b),max=Math.max(a,b);
 if(verifiedInaho.has(n)&&t==="LimitedExpress")
  return {model:"E653系（いなほ）",image:image.inaho,family:"inaho"};
 if((n==="8853D"||n==="8854D")&&t==="Rapid")
  return {model:"HB-E300系（海里）",image:image.kairi,family:"kairi"};
 // The JR East 2611 Riku West 256 timetable explicitly identifies
 // 150/151/152/160/161/162/163D as through services and 3131D as
 // Rapid Mogamigawa. JR East documented KiHa110 operations at the
 // 2026-01-16 railway reopening. Reuse a GENERIC KiHa110 image only.
 if(rikuuWestThrough.has(n)&&
    (t==="Local"||n==="3131D"&&t==="Rapid")&&
    ((proof.origin==="Sakata"&&proof.terminus==="Amarume")||
     (proof.origin==="Amarume"&&proof.terminus==="Sakata")))
  return {model:"キハ110系",image:image.kiha110,family:"rikuu-west-reference"};
 // 222M/225M run Sakata–Tsuruoka on 2026-11 JR East 2611;
 // Akita 701 2020 published workings provide a historical FAMILY
 // reference, not a 2026 physical trainset/formation claim.
 if(shonaiElectric.has(n)&&t==="Local"&&
    ((proof.origin==="Sakata"&&proof.terminus==="Tsuruoka")||
     (proof.origin==="Tsuruoka"&&proof.terminus==="Sakata")))
  return {model:"701系（秋田地区）",image:image.akita,family:"shonai-electric-reference"};
 if((t==="Local"||t==="Rapid")&&n.endsWith("M")&&
    min>=6&&max<=14)
  return {model:"E129系",image:image.e129,family:"e129"};
 if(t==="Local"&&n.endsWith("M")&&max<=6)
  return {model:"E129系",image:image.e129,family:"e129"};
 if(t==="Local"&&n.endsWith("M")&&min>=37)
  return {model:"701系（秋田地区）",image:image.akita,family:"akita"};
 if(t==="Local"&&n.endsWith("D")&&max<=37&&
    // Amarume–Sakata local trains may be Rikuu West through stock;
    // don't relabel them GV-E400 on number/suffix alone.
    !(min>=33&&max<=37))
  return {model:"GV-E400系",image:image.diesel,family:"diesel"};
 return null;
}
function resolve(p){
 if(!p||String(p.displayLineId||"Uetsu")!=="Uetsu"||
    p.vehicleIdentityStatus==="EXACT"||p.actualVehicleConfirmed===true||
    p.vehicleResolvedFromRealtime===true||p.vehicleFormationId||
    p.realtimeVehicleType||p.realtimeDerivedVehicleType||
    (p.vehicleResolution&&p.vehicleResolution.identityStatus==="EXACT"))return null;
 var proof=verify(p);if(!proof)return null;
 var model=classify(p,proof);if(!model)return null;
 var at=Number(p.stationIndex),to=p.segmentToIndex==null?at:Number(p.segmentToIndex);
 if(!Number.isInteger(at)||!Number.isInteger(to)||
    at<0||to<0||at>=openStations.length||to>=openStations.length)return null;
 var plan=p.vehiclePlan;
 // Undated historical SQL can produce an UNCONFIRMED 701/E721
 // candidate plan; it cannot veto a published number-scoped model.
 // Keep the veto for independently confirmed plans only.
 if(plan&&plan.status==="PLANNED_MODEL"&&plan.confirmed===true&&
    Array.isArray(plan.models)&&plan.models.length&&!plan.models.some(function(x){
       var name=String(x||"").trim();
       if(name===model.model)return true;
       // The confirmed SQL plan can certify E653 SERIES without naming
       // the "Inaho" illustrative livery. 1M–14M are explicitly checked
       // LimitedExpress Inaho train numbers; only for those may the family
       // alias use the source-scoped inaho image. No physical set/livery
       // assignment follows from this compatibility check.
       return model.family==="inaho"&&proof.trainType==="LimitedExpress"&&
         verifiedInaho.has(proof.trainNumber)&&
         (name==="E653系"||name==="E653系1000番台"||
          name==="E653系（1000番台）");
    }))return null;
 return {lineId:"Uetsu",trainNumber:proof.trainNumber,
   illustrationModel:model.model,illustrationPng:model.image,
   family:model.family,planned:true,referenceOnly:true,illustrative:true,
   authorizesPNG:false,actualVehicleConfirmed:false,
   sourceClocksVerified:false,formationId:null,
   provenance:"uetsu-2611-sql-station-evidence-and-official-fleet-family",
   officialUrl:"https://timetables.jreast.co.jp/2611/timetable-v/255"+
       (proof.direction==="Outbound"?"d":"u")+
       (proof.calendar==="Weekday"?"1":"2")+".html"};
}
// The SQL publisher may certify a single scheduled E653 MODEL (EXACT)
// without supplying a gallery PNG. That EXACT is a timetable model, not
// the day's physical consist. The generic resolver intentionally rejects
// EXACT identities; this narrow fallback only supplies an Inaho REFERENCE
// after independently checking the full original number/stops/calendar.
// Never widen generic EXACT identities or assign a physical livery/carset.
function resolvePlannedExactInaho(p){
 if(!p||p.positionLineId!=="Uetsu"||
    p.displayLineId&&p.displayLineId!=="Uetsu"||
    p.positionSource!=="supabase-train-run"||p.estimated!==true||
    p.vehicleIdentityStatus!=="EXACT"||
    p.vehicleResolvedFromRealtime===true||
    p.actualVehicleConfirmed===true||p.vehicleFormationId||
    (Array.isArray(p.vehicleFormationCandidates)&&
     p.vehicleFormationCandidates.length>0)||
    p.realtimeVehicleType||p.realtimeDerivedVehicleType)return null;
 var plan=p.vehiclePlan;
 if(!plan||plan.status!=="PLANNED_MODEL"||plan.confirmed!==true||
    plan.lineId!=="Uetsu"||plan.source!=="database-verified-published-plan"||
    !Array.isArray(plan.models)||plan.models.length!==1||
    ["E653系","E653系1000番台","E653系（1000番台）",
      "E653系（いなほ）"].indexOf(String(plan.models[0]))<0)return null;
 var sources=p.vehicleResolution&&p.vehicleResolution.sources;
 if(Array.isArray(sources)&&sources.some(function(k){
    return /^(?:official-realtime-car-number|roster-physical-id|formation-verified)$/.test(String(k));
 }))return null;
 var proof=verify(p);
 if(!proof||proof.trainType!=="LimitedExpress"||
    !verifiedInaho.has(proof.trainNumber))return null;
 var reference=resolve(Object.assign({},p,{
   vehicleIdentityStatus:"UNKNOWN",
   vehicleResolution:null
 }));
 return reference&&reference.family==="inaho"?reference:null;
}
root.JREastUetsuNumberIndex202611=Object.freeze({
 roster:roster,stations:openStations,verify:verify,resolve:resolve,
 resolvePlannedExactInaho:resolvePlannedExactInaho,
 kairiDays:Array.from(kairiDays),image:image});
var ranges=root.TrainNumberPngRanges;
if(ranges&&typeof ranges.match==="function"){
 var prev=ranges.match;
 root.TrainNumberPngRanges=Object.freeze(Object.assign({},ranges,{
  match:function(number,line,p){
   if(line!=="Uetsu")return prev(number,line,p);
   var found=resolve(Object.assign({},p||{},{trainNumber:number}));
   return found?{lineId:"Uetsu",trainNumber:found.trainNumber,
     model:found.illustrationModel,pngPath:found.illustrationPng,
     planned:true,illustrative:true,referenceOnly:true,
     actualVehicleConfirmed:false,source:found.provenance}:null;
  }
 }));
}
})(window);
