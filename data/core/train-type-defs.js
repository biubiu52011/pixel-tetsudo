/**
 * 列車種別の表示名定義（i18n）
 * データソース: ODPT odpt:TrainType / 各社公式の種別名称
 * 用途: trains ページの列車ラベル・ツールチップで種別名（等级）を表示する
 * 覆盖各运营商的列车种别；用于 trains 页标签和工具提示。
 */
window.TRAIN_TYPE_NAMES = {
  // ===== 東急 =====
  "odpt.TrainType:Tokyu.Local":                    { ja: "各駅停車", en: "Local", zh: "各站停车", ko: "각역정차" },
  "odpt.TrainType:Tokyu.Express":                  { ja: "急行",     en: "Express", zh: "急行", ko: "급행" },
  "odpt.TrainType:Tokyu.CommuterLimitedExpress":   { ja: "通勤特急", en: "Commuter Ltd. Exp.", zh: "通勤特急", ko: "통근특급" },
  "odpt.TrainType:Tokyu.LimitedExpress":           { ja: "特急",     en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:Tokyu.F-Liner":                  { ja: "Fライナー", en: "F-Liner", zh: "F-Liner", ko: "F라이너" },
  "odpt.TrainType:Tokyu.S-TRAIN":                  { ja: "S-TRAIN",  en: "S-TRAIN", zh: "S-TRAIN", ko: "S-TRAIN" },
  "odpt.TrainType:Tokyu.SemiExpress":              { ja: "準急",     en: "Semi Express", zh: "准急", ko: "준급" },

  // ===== 京成 =====
  "odpt.TrainType:Keisei.Skyliner":                 { ja: "スカイライナー", en: "Skyliner", zh: "Skyliner", ko: "스카이라이너" },
  "odpt.TrainType:Keisei.AccessExpress":            { ja: "アクセス特急", en: "Access Express", zh: "Access特急", ko: "액세스특급" },
  "odpt.TrainType:Keisei.RapidLimitedExpress":      { ja: "快速特急", en: "Rapid Ltd. Exp.", zh: "快速特急", ko: "쾌속특급" },
  "odpt.TrainType:Keisei.LimitedExpress":           { ja: "特急", en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:Keisei.CommuterLimitedExpress":   { ja: "通勤特急", en: "Commuter Ltd. Exp.", zh: "通勤特急", ko: "통근특급" },
  "odpt.TrainType:Keisei.Rapid":                    { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
  "odpt.TrainType:Keisei.Local":                    { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:Keisei.MorningLiner":             { ja: "モーニングライナー", en: "Morning Liner", zh: "Morning Liner", ko: "모닝라이너" },
  "odpt.TrainType:Keisei.EveningLiner":             { ja: "イブニングライナー", en: "Evening Liner", zh: "Evening Liner", ko: "이브닝라이너" },

  // ===== 小田急 =====
  "odpt.TrainType:Odakyu.Local":                    { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:Odakyu.Express":                  { ja: "急行", en: "Express", zh: "急行", ko: "급행" },
  "odpt.TrainType:Odakyu.RapidExpress":             { ja: "快速急行", en: "Rapid Express", zh: "快速急行", ko: "쾌속급행" },
  "odpt.TrainType:Odakyu.LimitedExpress":           { ja: "特急", en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:Odakyu.CommuterExpress":          { ja: "通勤急行", en: "Commuter Express", zh: "通勤急行", ko: "통근급행" },
  "odpt.TrainType:Odakyu.SemiExpress":              { ja: "準急", en: "Semi Express", zh: "准急", ko: "준급" },
  "odpt.TrainType:Odakyu.CommuterSemiExpress":       { ja: "通勤準急", en: "Commuter Semi-Exp.", zh: "通勤准急", ko: "통근준급" },

  // ===== 西武 =====
  "odpt.TrainType:Seibu.Local":                     { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:Seibu.SemiExpress":               { ja: "準急", en: "Semi Express", zh: "准急", ko: "준급" },
  "odpt.TrainType:Seibu.Express":                   { ja: "急行", en: "Express", zh: "急行", ko: "급행" },
  "odpt.TrainType:Seibu.HaijimaLiner":              { ja: "拝島ライナー", en: "Haijima Liner", zh: "拜岛Liner", ko: "하이마라이너" },
  "odpt.TrainType:Seibu.Rapid":                      { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
  "odpt.TrainType:Seibu.LimitedExpress":            { ja: "特急", en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:Seibu.F-Liner":                    { ja: "Fライナー", en: "F-Liner", zh: "F-Liner", ko: "F라이너" },
  "odpt.TrainType:Seibu.S-TRAIN":                    { ja: "S-TRAIN", en: "S-TRAIN", zh: "S-TRAIN", ko: "S-TRAIN" },
  "odpt.TrainType:Seibu.CommuterExpress":            { ja: "通勤急行", en: "Commuter Express", zh: "通勤急行", ko: "통근급행" },
  "odpt.TrainType:Seibu.RapidExpress":               { ja: "快速急行", en: "Rapid Express", zh: "快速急行", ko: "쾌속급행" },
  "odpt.TrainType:Seibu.CommuterSemiExpress":        { ja: "通勤準急", en: "Commuter Semi-Exp.", zh: "通勤准急", ko: "통근준급" },

  // ===== 东武 =====
  "odpt.TrainType:Tobu.Local":                      { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:Tobu.LimitedExpress":            { ja: "特急", en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:Tobu.Rapid":                       { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
  "odpt.TrainType:Tobu.Express":                     { ja: "急行", en: "Express", zh: "急行", ko: "급행" },
  "odpt.TrainType:Tobu.SectionExpress":             { ja: "区間急行", en: "Section Express", zh: "区间急行", ko: "구간급행" },
  "odpt.TrainType:Tobu.SectionSemiExpress":          { ja: "区間準急", en: "Section Semi-Exp.", zh: "区间准急", ko: "구간준급" },
  "odpt.TrainType:Tobu.TH-LINER":                   { ja: "THライナー", en: "TH-Liner", zh: "TH-Liner", ko: "TH라이너" },
  "odpt.TrainType:Tobu.SemiExpress":                { ja: "準急", en: "Semi Express", zh: "准急", ko: "준급" },
  "odpt.TrainType:Tobu.TJ-Liner":                   { ja: "TJライナー", en: "TJ-Liner", zh: "TJ-Liner", ko: "TJ라이너" },
  "odpt.TrainType:Tobu.RapidExpress":                { ja: "快速急行", en: "Rapid Express", zh: "快速急行", ko: "쾌속급행" },
  "odpt.TrainType:Tobu.KawagoeLimitedExpress":       { ja: "川越特急", en: "Kawagoe Ltd. Exp.", zh: "川越特急", ko: "카와고에특급" },

  // ===== 都营 =====
  "odpt.TrainType:Toei.Local":                       { ja: "各駅停車", en: "Local", zh: "各站停车", ko: "각역정차" },
  "odpt.TrainType:Toei.Rapid":                       { ja: "急行", en: "Express", zh: "急行", ko: "급행" },
  "odpt.TrainType:Toei.RapidLimitedExpress":         { ja: "快速特急", en: "Rapid Ltd. Exp.", zh: "快速特急", ko: "쾌속특급" },
  "odpt.TrainType:Toei.AirportRapidLimitedExpress":   { ja: "成飛快速特急", en: "Airport R.Ltd. Exp.", zh: "机场快速特急", ko: "공항쾌속특급" },
  "odpt.TrainType:Toei.Express":                     { ja: "急行", en: "Express", zh: "急行", ko: "급행" },
  "odpt.TrainType:Toei.LimitedExpress":              { ja: "特急", en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:Toei.AccessExpress":                { ja: "アクセス急行", en: "Access Express", zh: "Access急行", ko: "액세스급행" },
  "odpt.TrainType:Toei.CommuterLimitedExpress":       { ja: "通勤特急", en: "Commuter Ltd. Exp.", zh: "通勤特急", ko: "통근특급" },

  // ===== 东京地下铁 =====
  "odpt.TrainType:TokyoMetro.Local":                 { ja: "各駅停車", en: "Local", zh: "各站停车", ko: "각역정차" },
  "odpt.TrainType:TokyoMetro.Express":               { ja: "急行", en: "Express", zh: "急行", ko: "급행" },
  "odpt.TrainType:TokyoMetro.SemiExpress":           { ja: "準急", en: "Semi Express", zh: "准急", ko: "준급" },
  "odpt.TrainType:TokyoMetro.LimitedExpress":        { ja: "特急", en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:TokyoMetro.CommuterExpress":        { ja: "通勤急行", en: "Commuter Express", zh: "通勤急行", ko: "통근급행" },
  "odpt.TrainType:TokyoMetro.F-Liner":               { ja: "Fライナー", en: "F-Liner", zh: "F-Liner", ko: "F라이너" },
  "odpt.TrainType:TokyoMetro.S-TRAIN":               { ja: "S-TRAIN", en: "S-TRAIN", zh: "S-TRAIN", ko: "S-TRAIN" },
  "odpt.TrainType:TokyoMetro.TH-LINER":              { ja: "THライナー", en: "TH-Liner", zh: "TH-Liner", ko: "TH라이너" },
  "odpt.TrainType:TokyoMetro.Rapid":                 { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
  "odpt.TrainType:TokyoMetro.CommuterRapid":          { ja: "通勤快速", en: "Commuter Rapid", zh: "通勤快速", ko: "통근쾌속" },
  "odpt.TrainType:TokyoMetro.RapidExpress":           { ja: "快速急行", en: "Rapid Express", zh: "快速急行", ko: "쾌속급행" },

  // ===== 京王 =====
  "odpt.TrainType:Keio.Local":                       { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:Keio.Express":                     { ja: "急行", en: "Express", zh: "急行", ko: "급행" },
  "odpt.TrainType:Keio.SemiExpress":                 { ja: "準急", en: "Semi Express", zh: "准急", ko: "준급" },
  "odpt.TrainType:Keio.KeioLiner":                   { ja: "京王ライナー", en: "Keio Liner", zh: "京王Liner", ko: "경왕라이너" },
  "odpt.TrainType:Keio.LimitedExpress":              { ja: "特急", en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:Keio.Rapid":                        { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },

  // ===== 京急 =====
  "odpt.TrainType:Keikyu.Local":                     { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:Keikyu.Express":                   { ja: "急行", en: "Express", zh: "急行", ko: "급행" },
  "odpt.TrainType:Keikyu.LimitedExpress":            { ja: "特急", en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:Keikyu.RapidLimitedExpress":       { ja: "快速特急", en: "Rapid Ltd. Exp.", zh: "快速特急", ko: "쾌속특급" },
  "odpt.TrainType:Keikyu.EveningWing":               { ja: "イブニングウィング", en: "Evening Wing", zh: "Evening Wing", ko: "이브닝윙" },
  "odpt.TrainType:Keikyu.AirportRapidLimitedExpress":{ ja: "空港快速特急", en: "Airport R.Ltd. Exp.", zh: "机场快速特急", ko: "공항쾌속특급" },
  "odpt.TrainType:Keikyu.AccessExpress":              { ja: "アクセス急行", en: "Access Express", zh: "Access急行", ko: "액세스급행" },
  "odpt.TrainType:Keikyu.Rapid":                      { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
  "odpt.TrainType:Keikyu.MorningWing":                { ja: "モーニングウィング", en: "Morning Wing", zh: "Morning Wing", ko: "모닝윙" },
  "odpt.TrainType:Keikyu.CommuterLimitedExpress":     { ja: "通勤特急", en: "Commuter Ltd. Exp.", zh: "通勤特急", ko: "통근특급" },

  // ===== 相铁 =====
  "odpt.TrainType:Sotetsu.Rapid":                     { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
  "odpt.TrainType:Sotetsu.Local":                    { ja: "各駅停車", en: "Local", zh: "各站停车", ko: "각역정차" },
  "odpt.TrainType:Sotetsu.LimitedExpress":           { ja: "特急", en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:Sotetsu.CommuterExpress":          { ja: "通勤急行", en: "Commuter Express", zh: "通勤急行", ko: "통근급행" },
  "odpt.TrainType:Sotetsu.CommuterLimitedExpress":    { ja: "通勤特急", en: "Commuter Ltd. Exp.", zh: "通勤特急", ko: "통근특급" },

  // ===== 临海高速（TWR）===== 
  "odpt.TrainType:TWR.Local":                         { ja: "各駅停車", en: "Local", zh: "各站停车", ko: "각역정차" },
  "odpt.TrainType:TWR.Rapid":                         { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
  "odpt.TrainType:TWR.CommuterRapid":                { ja: "通勤快速", en: "Commuter Rapid", zh: "通勤快速", ko: "통근쾌속" },

  // ===== 其他单种别线路 =====
  "odpt.TrainType:MIR.Rapid":                          { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
  "odpt.TrainType:MIR.CommuterRapid":                  { ja: "通勤快速", en: "Commuter Rapid", zh: "通勤快速", ko: "통근쾌속" },
  "odpt.TrainType:MIR.SemiRapid":                       { ja: "準急", en: "Semi Rapid", zh: "准急", ko: "준급" },
  "odpt.TrainType:MIR.Local":                          { ja: "各駅停車", en: "Local", zh: "各站停车", ko: "각역정차" },
  "odpt.TrainType:SaitamaRailway.Local":               { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:TamaMonorail.Local":                 { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:ChibaMonorail.Local":                 { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:ShonanMonorail.Local":                { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:TokyoMonorail.AirportRapid":         { ja: "空港快速", en: "Airport Rapid", zh: "机场快速", ko: "공항쾌속" },
  "odpt.TrainType:TokyoMonorail.Local":                 { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:TokyoMonorail.SectionRapid":          { ja: "区間快速", en: "Section Rapid", zh: "区间快速", ko: "구간쾌속" },
  "odpt.TrainType:YokohamaMunicipal.Local":             { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:YokohamaMunicipal.Rapid":             { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
  "odpt.TrainType:Yurikamome.Local":                    { ja: "普通", en: "Local", zh: "普通", ko: "보통" },

  // ===== JR东日本（manual 时刻表里 operator 缺省或 unknown 的情况）=====
  "odpt.TrainType:JR-East.LimitedExpress":            { ja: "特急", en: "Limited Express", zh: "特急", ko: "특급" },
  "odpt.TrainType:JR-East.Local":                      { ja: "普通", en: "Local", zh: "普通", ko: "보통" },
  "odpt.TrainType:JR-East.Rapid":                       { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
  "odpt.TrainType:JR-East.ChuoSpecialRapid":           { ja: "中央線快速", en: "Chuo Rapid", zh: "中央线快速", ko: "중앙쾌속" },
  "odpt.TrainType:JR-East.CommuterRapid":             { ja: "通勤快速", en: "Commuter Rapid", zh: "通勤快速", ko: "통근쾌속" },
  "odpt.TrainType:JR-East.OmeSpecialRapid":            { ja: "青梅線快速", en: "Ome Rapid", zh: "青梅线快速", ko: "청매쾌속" },
  "odpt.TrainType:JR-East.CommuterSpecialRapid":       { ja: "通勤快速", en: "Commuter Special Rapid", zh: "通勤快速", ko: "통근쾌속" },
  "odpt.TrainType:JR-East.SpecialRapid":               { ja: "快速", en: "Rapid", zh: "快速", ko: "쾌속" },
};
