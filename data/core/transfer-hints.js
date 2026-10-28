/*
 * Transfer Station Hints Database
 * 换乘站提示数据库
 * 
 * 记录站外换乘和换乘站名不一致的情况
 * type: "outside" = 站外换乘, "name_mismatch" = 站名不一致
 * note: 具体说明文字（多语言）
 */

window.TRANSFER_HINTS = {
  // 站名不一致的换乘站
  "Akasaka-Mitsuke": {
    type: "name_mismatch",
    note: {
      ja: "（永田町駅連絡）",
      zh: "（连络永田町站）",
      en: "(Connects to Nagatacho)",
      ko: "（나가타초역 연결）"
    },
    connects: ["Nagatacho"]
  },
  "Nagatacho": {
    type: "name_mismatch",
    note: {
      ja: "（赤坂見附駅連絡）",
      zh: "（连络赤坂见附站）",
      en: "(Connects to Akasaka-Mitsuke)",
      ko: "（아카사카미츠케역 연결）"
    },
    connects: ["Akasaka-Mitsuke"]
  },
  "Omotesando": {
    type: "name_mismatch",
    note: {
      ja: "（明治神宮前駅連絡・要出站）",
      zh: "（连络明治神宫前站・需出站）",
      en: "(Connects to Meiji-Jingumae, outside transfer)",
      ko: "（메이지진구마에역 연결・역외 환승）"
    },
    connects: ["Meiji-Jingumae"],
    outside: true
  },
  "Meiji-Jingumae": {
    type: "name_mismatch",
    note: {
      ja: "（表参道駅連絡・要出站／JR原宿駅連絡）",
      zh: "（连络表参道站・需出站／连络JR原宿站）",
      en: "(Connects to Omotesando, outside transfer / Harajuku JR)",
      ko: "（오모테산도역 연결・역외 환승／JR하라주쿠역 연결）"
    },
    connects: ["Omotesando", "Harajuku"],
    outside: true
  },
  "Harajuku": {
    type: "name_mismatch",
    note: {
      ja: "（明治神宮前〈原宿〉駅連絡）",
      zh: "（连络明治神宫前〈原宿〉站）",
      en: "(Connects to Meiji-Jingumae (Harajuku))",
      ko: "（메이지진구마에〈하라주쿠〉역 연결）"
    },
    connects: ["Meiji-Jingumae"]
  },
  "Nishi-Shinjuku": {
    type: "name_mismatch",
    note: {
      ja: "（新宿西口駅連絡・要出站）",
      zh: "（连络新宿西口站・需出站）",
      en: "(Connects to Shinjuku-Nishiguchi, outside transfer)",
      ko: "（신주쿠니시구치역 연결・역외 환승）"
    },
    connects: ["Shinjuku-Nishiguchi"],
    outside: true
  },
  "Shinjuku-Nishiguchi": {
    type: "name_mismatch",
    note: {
      ja: "（西新宿駅連絡・要出站）",
      zh: "（连络西新宿站・需出站）",
      en: "(Connects to Nishi-Shinjuku, outside transfer)",
      ko: "（니시신주쿠역 연결・역외 환승）"
    },
    connects: ["Nishi-Shinjuku"],
    outside: true
  },
  "Tochomae": {
    type: "name_mismatch",
    note: {
      ja: "（新宿三丁目駅連絡・要出站）",
      zh: "（连络新宿三丁目站・需出站）",
      en: "(Connects to Shinjuku-Sanchome, outside transfer)",
      ko: "（신주쿠산초메역 연결・역외 환승）"
    },
    connects: ["Shinjuku-Sanchome"],
    outside: true
  },
  "Shinjuku-Sanchome": {
    type: "name_mismatch",
    note: {
      ja: "（都庁前駅連絡・要出站）",
      zh: "（连络都厅前站・需出站）",
      en: "(Connects to Tochomae, outside transfer)",
      ko: "（토쵸마에역 연결・역외 환승）"
    },
    connects: ["Tochomae"],
    outside: true
  },
  "Kodemmacho": {
    type: "name_mismatch",
    note: {
      ja: "（人形町駅連絡・要出站）",
      zh: "（连络人形町站・需出站）",
      en: "(Connects to Ningyocho, outside transfer)",
      ko: "（닝교초역 연결・역외 환승）"
    },
    connects: ["Ningyocho"],
    outside: true
  },
  "Ningyocho": {
    type: "name_mismatch",
    note: {
      ja: "（小伝馬町駅・水天宮前駅連絡・要出站）",
      zh: "（连络小传马町站・水天宫前站・需出站）",
      en: "(Connects to Kodemmacho / Suitengumae, outside transfer)",
      ko: "（코덴마초역・스이텐구마에역 연결・역외 환승）"
    },
    connects: ["Kodemmacho", "Suitengumae"],
    outside: true
  },
  
  "Korakuen": {
    type: "name_mismatch",
    note: {
      ja: "（春日駅連絡・要出站）",
      zh: "（连络春日站・需出站）",
      en: "(Connects to Kasuga, outside transfer)",
      ko: "（카스가역 연결・역외 환승）"
    },
    connects: ["Kasuga"],
    outside: true
  },
  "Kasuga": {
    type: "name_mismatch",
    note: {
      ja: "（後楽園駅連絡・要出站）",
      zh: "（连络后乐园站・需出站）",
      en: "(Connects to Korakuen, outside transfer)",
      ko: "（코라쿠엔역 연결・역외 환승）"
    },
    connects: ["Korakuen"],
    outside: true
  },
  "Mita": {
    type: "name_mismatch",
    note: {
      ja: "（田町駅連絡・要出站）",
      zh: "（连络田町站・需出站）",
      en: "(Connects to Tamachi, outside transfer)",
      ko: "（타마치역 연결・역외 환승）"
    },
    connects: ["Tamachi"],
    outside: true
  },
  "Tamachi": {
    type: "name_mismatch",
    note: {
      ja: "（三田駅連絡・要出站）",
      zh: "（连络三田站・需出站）",
      en: "(Connects to Mita, outside transfer)",
      ko: "（미타역 연결・역외 환승）"
    },
    connects: ["Mita"],
    outside: true
  },
  "Ueno-Hirokoji": {
    type: "name_mismatch",
    note: {
      ja: "（仲御徒町・上野御徒町・御徒町駅連絡）",
      zh: "（连络仲御徒町・上野御徒町・御徒町站）",
      en: "(Connects to Naka-Okachimachi / Ueno-Okachimachi / Okachimachi)",
      ko: "（나카오카치마치・우에노오카치마치・오카치마치역 연결）"
    },
    connects: ["Naka-Okachimachi", "Ueno-Okachimachi", "Okachimachi"]
  },
  "Naka-Okachimachi": {
    type: "name_mismatch",
    note: {
      ja: "（上野広小路・上野御徒町・御徒町駅連絡）",
      zh: "（连络上野广小路・上野御徒町・御徒町站）",
      en: "(Connects to Ueno-Hirokoji / Ueno-Okachimachi / Okachimachi)",
      ko: "（우에노히로코지・우에노오카치마치・오카치마치역 연결）"
    },
    connects: ["Ueno-Hirokoji", "Ueno-Okachimachi", "Okachimachi"]
  },
  "Ueno-Okachimachi": {
    type: "name_mismatch",
    note: {
      ja: "（上野広小路・仲御徒町・御徒町駅連絡）",
      zh: "（连络上野广小路・仲御徒町・御徒町站）",
      en: "(Connects to Ueno-Hirokoji / Naka-Okachimachi / Okachimachi)",
      ko: "（우에노히로코지・나카오카치마치・오카치마치역 연결）"
    },
    connects: ["Ueno-Hirokoji", "Naka-Okachimachi", "Okachimachi"]
  },
  "Okachimachi": {
    type: "name_mismatch",
    note: {
      ja: "（上野広小路・仲御徒町・上野御徒町駅連絡）",
      zh: "（连络上野广小路・仲御徒町・上野御徒町站）",
      en: "(Connects to Ueno-Hirokoji / Naka-Okachimachi / Ueno-Okachimachi)",
      ko: "（우에노히로코지・나카오카치마치・우에노오카치마치역 연결）"
    },
    connects: ["Ueno-Hirokoji", "Naka-Okachimachi", "Ueno-Okachimachi"]
  },
  "Awajicho": {
    type: "name_mismatch",
    note: {
      ja: "（小川町・新御茶ノ水駅連絡）",
      zh: "（连络小川町・新御茶之水站）",
      en: "(Connects to Ogawamachi / Shin-Ochanomizu)",
      ko: "（오가와마치・신오차노미즈역 연결）"
    },
    connects: ["Ogawamachi", "Shin-Ochanomizu"]
  },
  "Ogawamachi": {
    type: "name_mismatch",
    note: {
      ja: "（淡路町・新御茶ノ水駅連絡）",
      zh: "（连络淡路町・新御茶之水站）",
      en: "(Connects to Awajicho / Shin-Ochanomizu)",
      ko: "（아와지초・신오차노미즈역 연결）"
    },
    connects: ["Awajicho", "Shin-Ochanomizu"]
  },
  "Shin-Ochanomizu": {
    type: "name_mismatch",
    note: {
      ja: "（淡路町・小川町駅連絡）",
      zh: "（连络淡路町・小川町站）",
      en: "(Connects to Awajicho / Ogawamachi)",
      ko: "（아와지초・오가와마치역 연결）"
    },
    connects: ["Awajicho", "Ogawamachi"]
  },
  "Bakuro-Yokoyama": {
    type: "name_mismatch",
    note: {
      ja: "（馬喰町・東日本橋駅連絡）",
      zh: "（连络马喰町・东日本桥站）",
      en: "(Connects to Bakurocho / Higashi-Nihombashi)",
      ko: "（바쿠로초・히가시니혼바시역 연결）"
    },
    connects: ["Bakurocho", "Higashi-Nihombashi"]
  },
  "Bakurocho": {
    type: "name_mismatch",
    note: {
      ja: "（馬喰横山・東日本橋駅連絡）",
      zh: "（连络马喰横山・东日本桥站）",
      en: "(Connects to Bakuro-Yokoyama / Higashi-Nihombashi)",
      ko: "（바쿠로요코야마・히가시니혼바시역 연결）"
    },
    connects: ["Bakuro-Yokoyama", "Higashi-Nihombashi"]
  },
  "Higashi-Nihombashi": {
    type: "name_mismatch",
    note: {
      ja: "（馬喰横山・馬喰町駅連絡）",
      zh: "（连络马喰横山・马喰町站）",
      en: "(Connects to Bakuro-Yokoyama / Bakurocho)",
      ko: "（바쿠로요코야마・바쿠로초역 연결）"
    },
    connects: ["Bakuro-Yokoyama", "Bakurocho"]
  },
  "Tameike-Sanno": {
    type: "name_mismatch",
    note: {
      ja: "（国会議事堂前駅連絡）",
      zh: "（连络国会议事堂前站）",
      en: "(Connects to Kokkai-Gijidomae)",
      ko: "（국회의사당앞역 연결）"
    },
    connects: ["Kokkai-Gijidomae"]
  },
  "Kokkai-Gijidomae": {
    type: "name_mismatch",
    note: {
      ja: "（溜池山王駅連絡）",
      zh: "（连络溜池山王站）",
      en: "(Connects to Tameike-Sanno)",
      ko: "（타메이케산노역 연결）"
    },
    connects: ["Tameike-Sanno"]
  },
  "Hibiya": {
    type: "name_mismatch",
    note: {
      ja: "（有楽町駅連絡）",
      zh: "（连络有乐町站）",
      en: "(Connects to Yurakucho)",
      ko: "（유라쿠초역 연결）"
    },
    connects: ["Yurakucho"]
  },
  "Yurakucho": {
    type: "name_mismatch",
    note: {
      ja: "（日比谷駅連絡）",
      zh: "（连络日比谷站）",
      en: "(Connects to Hibiya)",
      ko: "（히비야역 연결）"
    },
    connects: ["Hibiya"]
  },
  "Shiodome": {
    type: "name_mismatch",
    note: {
      ja: "（新橋駅連絡・要出站）",
      zh: "（连络新桥站・需出站）",
      en: "(Connects to Shimbashi, outside transfer)",
      ko: "（신바시역 연결・역외 환승）"
    },
    connects: ["Shimbashi"],
    outside: true
  },
  "Shimbashi": {
    type: "name_mismatch",
    note: {
      ja: "（汐留駅連絡・要出站）",
      zh: "（连络汐留站・需出站）",
      en: "(Connects to Shiodome, outside transfer)",
      ko: "（시오도메역 연결・역외 환승）"
    },
    connects: ["Shiodome"],
    outside: true
  },
  "Akihabara": {
    type: "name_mismatch",
    note: {
      ja: "（岩本町駅連絡）",
      zh: "（连络岩本町站）",
      en: "(Connects to Iwamotocho)",
      ko: "（이와모토초역 연결）"
    },
    connects: ["Iwamotocho"]
  },
  "Iwamotocho": {
    type: "name_mismatch",
    note: {
      ja: "（秋葉原駅連絡）",
      zh: "（连络秋叶原站）",
      en: "(Connects to Akihabara)",
      ko: "（아키하바라역 연결）"
    },
    connects: ["Akihabara"]
  },
  "Kanda": {
    type: "name_mismatch",
    note: {
      ja: "（岩本町駅連絡）",
      zh: "（连络岩本町站）",
      en: "(Connects to Iwamotocho)",
      ko: "（이와모토초역 연결）"
    },
    connects: ["Iwamotocho"]
  },
  "Tokyo": {
    type: "name_mismatch",
    note: {
      ja: "（大手町駅連絡）",
      zh: "（连络大手町站）",
      en: "(Connects to Otemachi)",
      ko: "（오테마치역 연결）"
    },
    connects: ["Otemachi"]
  },
  "Otemachi": {
    type: "name_mismatch",
    note: {
      ja: "（東京駅・二重橋前駅連絡）",
      zh: "（连络东京站・二重桥前站）",
      en: "(Connects to Tokyo / Nijubashimae)",
      ko: "（도쿄역・니주바시마에역 연결）"
    },
    connects: ["Tokyo", "Nijubashimae"]
  },
  "Nijubashimae": {
    type: "name_mismatch",
    note: {
      ja: "（大手町駅連絡）",
      zh: "（连络大手町站）",
      en: "(Connects to Otemachi)",
      ko: "（오테마치역 연결）"
    },
    connects: ["Otemachi"]
  },
  "Shin-Nihonbashi": {
    type: "name_mismatch",
    note: {
      ja: "（三越前駅連絡）",
      zh: "（连络三越前站）",
      en: "(Connects to Mitsukoshimae)",
      ko: "（미쓰코시마에역 연결）"
    },
    connects: ["Mitsukoshimae"]
  },
  "Mitsukoshimae": {
    type: "name_mismatch",
    note: {
      ja: "（新日本橋駅連絡）",
      zh: "（连络新日本桥站）",
      en: "(Connects to Shin-Nihonbashi)",
      ko: "（신니혼바시역 연결）"
    },
    connects: ["Shin-Nihonbashi"]
  },
  "Sengakuji": {
    type: "name_mismatch",
    note: {
      ja: "（高輪ゲートウェイ駅連絡）",
      zh: "（连络高轮Gateway站）",
      en: "(Connects to Takanawa-Gateway)",
      ko: "（타카나와게이트웨이역 연결）"
    },
    connects: ["Takanawa-Gateway"]
  },
  "Takanawa-Gateway": {
    type: "name_mismatch",
    note: {
      ja: "（泉岳寺駅連絡）",
      zh: "（连络泉岳寺站）",
      en: "(Connects to Sengakuji)",
      ko: "（센가쿠지역 연결）"
    },
    connects: ["Sengakuji"]
  },
  "Toranomon": {
    type: "name_mismatch",
    note: {
      ja: "（虎ノ門ヒルズ駅連絡）",
      zh: "（连络虎之门Hills站）",
      en: "(Connects to Toranomon-Hills)",
      ko: "（토라노몬힐즈역 연결）"
    },
    connects: ["Toranomon-Hills"]
  },
  "Toranomon-Hills": {
    type: "name_mismatch",
    note: {
      ja: "（虎ノ門駅連絡）",
      zh: "（连络虎之门站）",
      en: "(Connects to Toranomon)",
      ko: "（토라노몬역 연결）"
    },
    connects: ["Toranomon"]
  },
  "Suitengumae": {
    type: "name_mismatch",
    note: {
      ja: "（人形町駅連絡）",
      zh: "（连络人形町站）",
      en: "(Connects to Ningyocho)",
      ko: "（닌교초역 연결）"
    },
    connects: ["Ningyocho"]
  },
  "Ginza": {
    type: "name_mismatch",
    note: {
      ja: "（銀座一丁目駅連絡）",
      zh: "（连络银座一丁目站）",
      en: "(Connects to Ginza-Itchome)",
      ko: "（긴자잇쵸메역 연결）"
    },
    connects: ["Ginza-Itchome"]
  },
  "Ginza-Itchome": {
    type: "name_mismatch",
    note: {
      ja: "（銀座駅連絡）",
      zh: "（连络银座站）",
      en: "(Connects to Ginza)",
      ko: "（긴자역 연결）"
    },
    connects: ["Ginza"]
  },
  "Tachikawa": {
    type: "name_mismatch",
    note: {
      ja: "（立川北・立川南駅連絡・要出站）",
      zh: "（连络立川北・立川南站・需出站）",
      en: "(Connects to Tachikawa-Kita / Tachikawa-Minami, outside transfer)",
      ko: "（타치카와키타・타치카와미나미역 연결・역외 환승）"
    },
    connects: ["Tachikawa-Kita", "Tachikawa-Minami"],
    outside: true
  },
  "Tachikawa-Kita": {
    type: "name_mismatch",
    note: {
      ja: "（JR立川駅連絡・要出站）",
      zh: "（连络JR立川站・需出站）",
      en: "(Connects to Tachikawa JR, outside transfer)",
      ko: "（JR타치카와역 연결・역외 환승）"
    },
    connects: ["Tachikawa"],
    outside: true
  },
  "Tachikawa-Minami": {
    type: "name_mismatch",
    note: {
      ja: "（JR立川駅連絡・要出站）",
      zh: "（连络JR立川站・需出站）",
      en: "(Connects to Tachikawa JR, outside transfer)",
      ko: "（JR타치카와역 연결・역외 환승）"
    },
    connects: ["Tachikawa"],
    outside: true
  },
  "Akitsu": {
    type: "name_mismatch",
    note: {
      ja: "（新秋津駅連絡・要出站）",
      zh: "（连络新秋津站・需出站）",
      en: "(Connects to Shin-Akitsu, outside transfer)",
      ko: "（신아키츠역 연결・역외 환승）"
    },
    connects: ["Shin-Akitsu"],
    outside: true
  },
  "Shin-Akitsu": {
    type: "name_mismatch",
    note: {
      ja: "（秋津駅連絡・要出站）",
      zh: "（连络秋津站・需出站）",
      en: "(Connects to Akitsu, outside transfer)",
      ko: "（아키츠역 연결・역외 환승）"
    },
    connects: ["Akitsu"],
    outside: true
  },
  "Otsuka": {
    type: "name_mismatch",
    note: {
      ja: "（大塚駅前駅連絡・要出站）",
      zh: "（连络大塚站前站・需出站）",
      en: "(Connects to Otsuka-Ekimae, outside transfer)",
      ko: "（오츠카에키마에역 연결・역외 환승）"
    },
    connects: ["Otsuka_Eki_Mae"],
    outside: true
  },
  "Otsuka_Eki_Mae": {
    type: "name_mismatch",
    note: {
      ja: "（JR大塚駅連絡・要出站）",
      zh: "（连络JR大塚站・需出站）",
      en: "(Connects to Otsuka JR, outside transfer)",
      ko: "（JR오츠카역 연결・역외 환승）"
    },
    connects: ["Otsuka"],
    outside: true
  },
  "Togoshi": {
    type: "name_mismatch",
    note: {
      ja: "（戸越銀座駅連絡・要出站）",
      zh: "（连络户越银座站・需出站）",
      en: "(Connects to Togoshi-ginza, outside transfer)",
      ko: "（토고시긴자역 연결・역외 환승）"
    },
    connects: ["Togoshi-ginza"],
    outside: true
  },
  "Togoshi-ginza": {
    type: "name_mismatch",
    note: {
      ja: "（戸越駅連絡・要出站）",
      zh: "（连络户越站・需出站）",
      en: "(Connects to Togoshi, outside transfer)",
      ko: "（토고시역 연결・역외 환승）"
    },
    connects: ["Togoshi"],
    outside: true
  },
  "Ushida": {
    type: "name_mismatch",
    note: {
      ja: "（京成関屋駅連絡）",
      zh: "（连络京成关屋站）",
      en: "(Connects to Keisei-Sekiya)",
      ko: "（케이세이세키야역 연결）"
    },
    connects: ["Keisei-Sekiya"]
  },
  "Keisei-Sekiya": {
    type: "name_mismatch",
    note: {
      ja: "（牛田駅連絡）",
      zh: "（连络牛田站）",
      en: "(Connects to Ushida)",
      ko: "（우시다역 연결）"
    },
    connects: ["Ushida"]
  },
  "Moto-Yawata": {
    type: "name_mismatch",
    note: {
      ja: "（京成八幡駅連絡）",
      zh: "（连络京成八幡站）",
      en: "(Connects to Keisei-Yawata)",
      ko: "（케이세이야와타역 연결）"
    },
    connects: ["Keisei-Yawata"]
  },
  "Keisei-Yawata": {
    type: "name_mismatch",
    note: {
      ja: "（本八幡駅連絡）",
      zh: "（连络本八幡站）",
      en: "(Connects to Moto-Yawata)",
      ko: "（모토야와타역 연결）"
    },
    connects: ["Moto-Yawata"]
  },
  "Shin-Koshigaya": {
    type: "name_mismatch",
    note: {
      ja: "（南越谷駅連絡・要出站）",
      zh: "（连络南越谷站・需出站）",
      en: "(Connects to Minami-Koshigaya, outside transfer)",
      ko: "（미나미코시가야역 연결・역외 환승）"
    },
    connects: ["Minami-Koshigaya"],
    outside: true
  },
  "Minami-Koshigaya": {
    type: "name_mismatch",
    note: {
      ja: "（新越谷駅連絡・要出站）",
      zh: "（连络新越谷站・需出站）",
      en: "(Connects to Shin-Koshigaya, outside transfer)",
      ko: "（신코시가야역 연결・역외 환승）"
    },
    connects: ["Shin-Koshigaya"],
    outside: true
  },
  "Asakadai": {
    type: "name_mismatch",
    note: {
      ja: "（北朝霞駅連絡・要出站）",
      zh: "（连络北朝霞站・需出站）",
      en: "(Connects to Kita-Asaka, outside transfer)",
      ko: "（키타아사카역 연결・역외 환승）"
    },
    connects: ["Kita-Asaka"],
    outside: true
  },
  "Kita-Asaka": {
    type: "name_mismatch",
    note: {
      ja: "（朝霞台駅連絡・要出站）",
      zh: "（连络朝霞台站・需出站）",
      en: "(Connects to Asakadai, outside transfer)",
      ko: "（아사카다이역 연결・역외 환승）"
    },
    connects: ["Asakadai"],
    outside: true
  },
  "Musashi-Mizonokuchi": {
    type: "name_mismatch",
    note: {
      ja: "（溝の口駅連絡・要出站）",
      zh: "（连络沟之口站・需出站）",
      en: "(Connects to Mizonokuchi, outside transfer)",
      ko: "（미조노쿠치역 연결・역외 환승）"
    },
    connects: ["Mizonokuchi"],
    outside: true
  },
  "Mizonokuchi": {
    type: "name_mismatch",
    note: {
      ja: "（武蔵溝ノ口駅連絡・要出站）",
      zh: "（连络武藏沟之口站・需出站）",
      en: "(Connects to Musashi-Mizonokuchi, outside transfer)",
      ko: "（무사시미조노쿠치역 연결・역외 환승）"
    },
    connects: ["Musashi-Mizonokuchi"],
    outside: true
  },
  "Gotokuji": {
    type: "name_mismatch",
    note: {
      ja: "（山下駅連絡）",
      zh: "（连络山下站）",
      en: "(Connects to Yamashita)",
      ko: "（야마시타역 연결）"
    },
    connects: ["Yamashita"]
  },
  "Yamashita": {
    type: "name_mismatch",
    note: {
      ja: "（豪徳寺駅連絡）",
      zh: "（连络豪德寺站）",
      en: "(Connects to Gotokuji)",
      ko: "（고토쿠지역 연결）"
    },
    connects: ["Gotokuji"]
  },
  // 站外换乘（站名一致但需要出站）
  "Ueno": {
    type: "outside",
    note: {
      ja: "（JR・地下鉄連絡、一部要出站）",
      zh: "（JR・地铁连络，部分需出站）",
      en: "(JR/Subway connection, some outside transfer)",
      ko: "（JR・지하철 연결, 일부 역외 환승）"
    }
  },
  "Shinjuku": {
    type: "outside",
    note: {
      ja: "（JR・私鉄・地下鉄連絡、一部要出站）",
      zh: "（JR・私铁・地铁连络，部分需出站）",
      en: "(JR/Private/Subway connection, some outside transfer)",
      ko: "（JR・사철・지하철 연결, 일부 역외 환승）"
    }
  },
  "Shibuya": {
    type: "outside",
    note: {
      ja: "（JR・私鉄・地下鉄連絡、一部要出站／みなとみらい線・副都心線連絡）",
      zh: "（JR・私铁・地铁连络，部分需出站／连络港未来线・副都心线）",
      en: "(JR/Private/Subway connection, some outside transfer / Minatomirai-Fukutoshin)",
      ko: "（JR・사철・지하철 연결, 일부 역외 환승／미나토미라이선・후쿠토신선 연결）"
    }
  },
  "Ikebukuro": {
    type: "outside",
    note: {
      ja: "（JR・私鉄・地下鉄連絡、一部要出站）",
      zh: "（JR・私铁・地铁连络，部分需出站）",
      en: "(JR/Private/Subway connection, some outside transfer)",
      ko: "（JR・사철・지하철 연결, 일부 역외 환승）"
    }
  },
  
  // 特殊换乘说明
  "Hamamatsucho": {
    type: "outside",
    note: {
      ja: "（東京モノレール連絡・要出站）",
      zh: "（连络东京单轨・需出站）",
      en: "(Connects to Tokyo Monorail, outside transfer)",
      ko: "（도쿄 모노레일 연결・역외 환승）"
    }
  },
  "Shinagawa": {
    type: "outside",
    note: {
      ja: "（京急連絡・要出站）",
      zh: "（连络京急・需出站）",
      en: "(Connects to Keikyu, outside transfer)",
      ko: "（케이큐 연결・역외 환승）"
    }
  },
  "Osaki": {
    type: "outside",
    targetLineKey: "line.Rinkai",
    templateKey: "transfer.outside_line"
  }
};

// 获取换乘提示
window.getTransferHint = function(stationId, lang) {
  if (!window.TRANSFER_HINTS || !window.TRANSFER_HINTS[stationId]) return null;
  var hint = window.TRANSFER_HINTS[stationId];
  var l = lang || window.currentLang || "ja";

  // Structured hints resolve entity labels through the central i18n dictionary.
  if (hint.targetLineKey && hint.templateKey && window.translations) {
    var dict = window.translations[l] || window.translations.ja || {};
    var fallbackDict = window.translations.ja || {};
    var lineName = dict[hint.targetLineKey] || fallbackDict[hint.targetLineKey] || hint.targetLineKey;
    var template = dict[hint.templateKey] || fallbackDict[hint.templateKey] || "{line}";
    return String(template).replace(/\{line\}/g, lineName);
  }

  // Legacy notes remain supported while entries are migrated to structured data.
  if (hint.note && hint.note[l]) return hint.note[l];
  if (hint.note && hint.note.ja) return hint.note.ja;
  return null;
};
