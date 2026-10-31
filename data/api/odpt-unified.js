/**
 * Pixel Tetsudo - 统一 ODPT API 客户端
 * 完整 API URL（含 key）直接存储，无需分离管理。
 *
 * SECURITY: 浏览器端混淆不是秘密存储；任何发送到客户端的 consumer key 都可被恢复。
 * 真正隐藏 key 需要把 ODPT 请求迁移到受控的服务端/Edge proxy。
 * 
 * 三种API类型：
 * - trainInformation: 运行情报/延误信息 (odpt:TrainInformation)
 * - train: 列车位置实时数据 (odpt:Train)
 * - trainTimetable: 列车时刻表 (odpt:TrainTimetable)
 */
(function() {
    'use strict';

    // ODPT 所有者根据页面
    // 推导仅延误启动模式，不依赖独立的预加载器标志脚本。
    var _pagePath = window.location && window.location.pathname || '';
    if (/\/(?:home|realtime|trains)\.html$/i.test(_pagePath)) {
        window.ODPT_LAZY = true;
    }

    // ========== ODPT API 链接库（完整链接，编码存储） ==========
    // 所有 API 以完整链接存于 data/api/odpt-links.js（window.ODPT_LINKS_ENC）
    // XOR + Base64 仅避免 key 以明文字符串出现，不构成秘密存储或访问控制。
    // 不要把此机制当作 credential protection；迁移到服务端/Edge proxy 后应删除客户端 key。
    var _linksCache = null;
    // 派生混淆种子（不明文存放完整种子）
    function _apiSeed() {
        var a = "PixelTetsudo".split('').reverse().join('');
        var b = "ODPT".split('').reverse().join('');
        return a + "-" + b + "-2026";
    }
    function _b64decode(s) {
        try {
            if (typeof atob === 'function') return atob(s);
            if (typeof Buffer !== 'undefined' && Buffer.from) {
                return Buffer.from(s, 'base64').toString('utf8');
            }
        } catch (e) {}
        return null;
    }
    function _xorDecode(data, seed) {
        var out = '';
        var sl = seed.length;
        for (var i = 0; i < data.length; i++) {
            out += String.fromCharCode(data.charCodeAt(i) ^ seed.charCodeAt(i % sl));
        }
        return out;
    }
    // 解码并缓存链接库
    function getApiLinks() {
        if (_linksCache) return _linksCache;
        try {
            var enc = (typeof window !== 'undefined' && window.ODPT_LINKS_ENC) ? window.ODPT_LINKS_ENC : '';
            if (!enc) { _linksCache = []; return _linksCache; }
            var json = _xorDecode(_b64decode(enc), _apiSeed());
            _linksCache = JSON.parse(json) || [];
        } catch (e) {
            console.warn('[ODPT] API link library decode failed:', e.message);
            _linksCache = [];
        }
        return _linksCache;
    }
    // 从链接库解析指定域名的 key（仅用于动态拼接场景）
    function getApiKey(base) {
        try {
            var links = getApiLinks();
            var baseHost = base.indexOf('api-challenge') >= 0 ? 'api-challenge.odpt.org' : 'api.odpt.org';
            for (var i = 0; i < links.length; i++) {
                var url = links[i] || '';
                if (url.indexOf(baseHost) < 0) continue;
                var m = url.match(/acl:consumerKey=([^&\s]+)/);
                if (m && m[1]) return m[1];
            }
        } catch (e) {}
        return null;
    }
    // 链接库可用即视为已配置（库为内置，恒为 true）
    function keysConfigured() {
        return getApiLinks().length > 0;
    }

    // ========== 完整 API URL（按运营商和类型区分） ==========
    var ODPT_ENDPOINTS = {
        // ===== Challenge API 运营商 =====
        "JR-East": {
            base: "https://api-challenge.odpt.org/api/v4/",
            train: "odpt:Train?odpt:operator=odpt.Operator:JR-East",
            gtfsVehicle: "gtfs/realtime/jreast_odpt_train_vehicle",
            gtfsTripUpdate: "gtfs/realtime/jreast_odpt_train_trip_update",
            gtfsAlert: "gtfs/realtime/jreis_odpt_train_alert",
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:JR-East",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:jre-is" // JR-East 的运行情报资源。
        },
        "Tobu": {
            base: "https://api-challenge.odpt.org/api/v4/",
            train: "odpt:Train?odpt:operator=odpt.Operator:Tobu",
            gtfsVehicle: "gtfs/realtime/tobu_odpt_train_vehicle",
            gtfsTripUpdate: "gtfs/realtime/tobu_odpt_train_trip_update",
            gtfsAlert: "gtfs/realtime/tobu_odpt_train_alert",
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:Tobu",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:Tobu"
        },
        "Keio": {
            base: "https://api-challenge.odpt.org/api/v4/",
            train: "odpt:Train?odpt:operator=odpt.Operator:Keio",  // Keio 的实时列车资源。
            gtfsVehicle: "gtfs/realtime/keio_odpt_train_vehicle",
            gtfsTripUpdate: "gtfs/realtime/keio_odpt_train_trip_update",
            gtfsAlert: "gtfs/realtime/keio_odpt_train_alert",
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:Keio",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:Keio"
        },
        "Keikyu": {
            base: "https://api-challenge.odpt.org/api/v4/",
            // 官方存在 JSON Train Location，但当前运行时暂未启用该端点。
            // 在端点重新核验并完成端到端接入前保持能力关闭；
            // 权威线路策略不得声明运行时实际不消费的来源。
            train: null,
            trainTimetable: null,  // 京急不提供列车时刻表API
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:Keikyu"
        },
        "Sotetsu": {
            base: "https://api-challenge.odpt.org/api/v4/",
            train: null,  // 相铁不提供列车位置API
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:Sotetsu",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:Sotetsu"
        },
        "Tokyu": {
            base: "https://api-challenge.odpt.org/api/v4/",
            train: null,  // 东急不提供列车位置API
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:Tokyu",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:Tokyu"
        },
        "Seibu": {
            base: "https://api-challenge.odpt.org/api/v4/",
            train: null,  // 西武不提供列车位置API
            trainTimetable: null,  // 西武不提供列车时刻表API
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:Seibu"
        },
        "Odakyu": {
            base: "https://api-challenge.odpt.org/api/v4/",
            train: null,
            trainTimetable: null,
            trainInformation: null  // 小田急不提供这三种API
        },

        // ===== Center API 运营商 =====
        "TokyoMetro": {
            base: "https://api.odpt.org/api/v4/",
            // 当前官方实时发布不是本运行时消费的已记录 JSON Train Location
            // 资源。保留时刻表/运行情报，但不要发起
            // 猜测性的 odpt:Train 请求，直到接入受支持的实时消费者。
            train: null,
            alert: "gtfs/realtime/tokyometro_odpt_train_alert",
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:TokyoMetro",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:TokyoMetro"
        },
        "Toei": {
            base: "https://api.odpt.org/api/v4/",
            // 都营实时位置由官方 GTFS-RT VehiclePosition 提供，不是 JSON odpt:Train。
            // 这里仍沿用 train 能力槽位，让现有运营商激活/轮询链路继续工作；
            // 返回值在 fetchToeiGtfsPositions 中转换为统一 ODPT 形状。
            train: "gtfs/realtime/toei_odpt_train_vehicle",
            tripUpdate: "gtfs/realtime/toei_odpt_train_trip_update",
            alert: "gtfs/realtime/toei_odpt_train_alert",
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:Toei",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:Toei"
        },
        "YokohamaMunicipal": {
            base: "https://api.odpt.org/api/v4/",
            train: null,
            gtfsVehicle: "gtfs/realtime/YokohamaMunicipalTrain_vehicle",
            gtfsTripUpdate: "gtfs/realtime/YokohamaMunicipalTrain_trip_update",
            gtfsAlert: "gtfs/realtime/YokohamaMunicipalTrain_alert",
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:YokohamaMunicipal",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:YokohamaMunicipal"
        },
        "TWR": {
            base: "https://api.odpt.org/api/v4/",
            train: null,
            alert: "gtfs/realtime/twr_odpt_train_alert",
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:TWR",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:TWR"
        },
        "MIR": {
            base: "https://api.odpt.org/api/v4/",
            train: null,
            alert: "gtfs/realtime/mir_odpt_train_alert",
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:MIR",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:MIR"
        },
        "TamaMonorail": {
            base: "https://api.odpt.org/api/v4/",
            train: null,
            alert: "gtfs/realtime/tamamonorail_odpt_train_alert",
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:TamaMonorail",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:TamaMonorail"
        },
        "HakodateCity": {
            base: "https://api.odpt.org/api/v4/",
            train: null,
            gtfsVehicle: "gtfs/realtime/odpt_HakodateCity_Alllines_vehicle",
            gtfsTripUpdate: "gtfs/realtime/odpt_HakodateCity_Alllines_trip_update",
            gtfsAlert: "gtfs/realtime/odpt_HakodateCity_Alllines_alert",
            trainTimetable: null,
            trainInformation: null
        },
        "Yurikamome": {
            base: "https://api.odpt.org/api/v4/",
            train: null,
            trainTimetable: null,  // 百合鸥不提供列车时刻表API
            trainInformation: null  // 百合鸥不提供运行情报API
        },
        "Keisei": {
            base: "https://api-challenge.odpt.org/api/v4/",
            // 官方目录中当前没有已记录的 JSON Train Location 数据集。
            // 不得仅凭运营商可用性推断实时能力。
            train: null,
            trainTimetable: "odpt:TrainTimetable?odpt:operator=odpt.Operator:Keisei",
            trainInformation: "odpt:TrainInformation?odpt:operator=odpt.Operator:Keisei"
        },
        "TokyoMonorail": {
            base: "https://api-challenge.odpt.org/api/v4/",
            train: null,  // 东京单轨不提供列车位置API
            trainTimetable: null,  // ODPT无数据
            trainInformation: null  // ODPT无数据
        }
        // MinatoMirai（港未来线）：ODPT完全无数据，移除
    };

    // 构建完整URL
    function buildUrl(operator, type) {
        var ep = ODPT_ENDPOINTS[operator];
        if (!ep || !ep[type]) return null;
        // 优先从链接库匹配完整URL（库中含 acl:consumerKey）
        var links = getApiLinks();
        for (var i = 0; i < links.length; i++) {
            var url = links[i] || '';
            if (url.indexOf(ep.base) === 0 && url.indexOf(ep[type]) >= 0) return url;
        }
        // 回退：用库中解析的 key 动态拼接（如按线路时刻表等动态参数场景）
        var key = getApiKey(ep.base);
        if (!key) {
            console.warn("[ODPT] No API link for " + operator + "/" + type);
            return null;
        }
        var separator = ep[type].indexOf("?") >= 0 ? "&" : "?";
        return ep.base + ep[type] + separator + "acl:consumerKey=" + encodeURIComponent(key);
    }

    // ========== 线路 -> 运营商映射 ==========
    var LINE_TO_OPERATOR = {
        "TokaidoCentral": "JR-Central",
        "ChuoCentral": "JR-Central",
        "KansaiCentral": "JR-Central",
        "KiseiCentral": "JR-Central",
        "Takayama": "JR-Central",
        "Taketoyo": "JR-Central",
        "Iida": "JR-Central",
        "Taita": "JR-Central",
        "Gotemba": "JR-Central",
        "Minobu": "JR-Central",
        "Sangu": "JR-Central",
        "Meisho": "JR-Central",
        "MinoAkasaka": "JR-Central",
        "Agatsuma": "JR-East",
        "Arakawa": "Toei",
        "Asakusa": "Toei",
        "BanetsuEast": "JR-East",
        "BanetsuWest": "JR-East",
        "Chiyoda": "TokyoMetro",

        "ChuoRapid": "JR-East",
        "ChuoSobuLocal": "JR-East",
        "KeikyuDaishi": "Keikyu",
        "Daishi_Tobu": "Tobu",
        "Echigo": "JR-East",
        "Fukutoshin": "TokyoMetro",
        "Ginza": "TokyoMetro",
        "Gono": "JR-East",
        "Hachinohe": "JR-East",
        "Hakushin": "JR-East",
        "Haijima": "Seibu",
        "Hanzomon": "TokyoMetro",
        "Hibiya": "TokyoMetro",
        "ChuoTatsuno": "JR-East",
        // ひたちなか海浜鉄道湊線不属于 MIR；不将其运行情报映射到つくばエクスプレス。
        "Iiyama": "JR-East",
        "Yahiko": "JR-East",
        "Ikebukuro": "Seibu",

        "Ishinomaki": "JR-East",
        "Ito": "JR-East",
        "Itsukaichi": "JR-East",
        "Joban": "JR-East",
        "JobanLocal": "JR-East",
        "JobanMain": "JR-East",
        "Joetsu": "JR-East",
        "Kamaishi": "JR-East",
        "Kitakami": "JR-East",

        "Karasuyama": "JR-East",
        "Kashima": "JR-East",
        "Kawagoe": "JR-East",
        "KeihinTohoku": "JR-East",
        "Keikyu": "Keikyu",
        "KeikyuAirport": "Keikyu",
        "KeikyuKurihama": "Keikyu",

        "KeikyuZushi": "Keikyu",

        "KeioInokashira": "Keio",
        "KeioKeibajo": "Keio",
        "KeioMain": "Keio",
        "KeioSagami": "Keio",
        "KeioShin": "Keio",
        "KeioTakao": "Keio",
        "KeioZoo": "Keio",
        "Keisei": "Keisei",
        "Keiyo": "JR-East",
        "Kesennuma": "JR-East",
        "Kiryu": "Tobu",
        "Koizumi": "Tobu",
        "Kokubunji": "Seibu",
        "Koumi": "JR-East",
        "Hanawa": "JR-East",
        "Kururi": "JR-East",
        "Marunouchi": "TokyoMetro",
        "MarunouchiBranch": "TokyoMetro",
        // MinatoMirai：ODPT无数据，移除映射
        "Mita": "Toei",
        "Mito": "JR-East",
        "Musashino": "JR-East",
        "Namboku": "TokyoMetro",
        "Nambu": "JR-East",
        "Narita": "JR-East",
        // 成田线支线、东金线和南武线浜川崎支线使用独立 railway identity。
        "NaritaAbikoBranch": "JR-East",
        "NaritaAirportBranch": "JR-East",
        "Togane": "JR-East",
        "NambuBranch": "JR-East",

        "Kinugawa": "Tobu",
        "Nippori_Toneri": "Toei", // canonical railway_data.json / SQL line ID
        "NipporiToneri": "Toei", // compatibility alias
        "Noda": "Tobu",
        "OdakyuEnoshima": "Odakyu",

        "OdakyuTama": "Odakyu",
        "Odawara": "Odakyu",
        "Oedo": "Toei",
        "Ofunato": "JR-East",
        "Oga": "JR-East",
        "Ogose": "Tobu",
        "Oito": "JR-East",
        "Ome": "JR-East",
        "Ominato": "JR-East",

        "Ou": "JR-East",
        "Oyama": "JR-East",
        "RikuEast": "JR-East",
        "RikuWest": "JR-East",
        "Rinkai": "TWR",

        "Ryomo": "JR-East",
        "Sagami": "JR-East",
        "SaikyoKawagoe": "JR-East",

        "Sano": "Tobu",
        "Yamada": "JR-East",
        "SeibuChichibu": "Seibu",
        "Seibuen": "Seibu",

        "SeibuShinjuku": "Seibu",
        "SeibuTamagawa": "Seibu",
        "SeibuTamako": "Seibu",
        "SeibuToshima": "Seibu",
        "SeibuYamaguchi": "Seibu",
        "SeibuSayama": "Seibu",

        "Senseki": "JR-East",
        "SensekiTohoku": "JR-East",
        "Senzan": "JR-East",
        "Shinetsu": "JR-East",
        "Shinjuku": "Toei",
        "Shinonoi": "JR-East",
        "ShonanShinjuku": "JR-East",

        "SobuRapid": "JR-East",
        "SotetsuMain": "Sotetsu",
        "Sotobo": "JR-East",
        "Suigun": "JR-East",
        "SuigunBranch": "JR-East",
        "Takasaki": "JR-East",
        "TamaMonorail": "TamaMonorail",
        "Tazawako": "JR-East",
        "TobuIsesaki": "Tobu",
        "TobuNikko": "Tobu",
        "TobuUtsunomiya": "Tobu",
        "TobuSkytree": "Tobu",
        "Tobu_Kameido": "Tobu",
        "Tohoku": "JR-East",
        "Tojo": "Tobu",
        "Tokaido": "JR-East",
        "TokyuDenEnToshi": "Tokyu",
        "TokyuTamagawa": "Tokyu",
        "TokyuToyoko": "Tokyu",
        "Tozai": "TokyoMetro",
        "Tsugaru": "JR-East",
        "TsukubaExpress": "MIR",
        "Tsurumi": "JR-East",
        "Uchibo": "JR-East",
        "UtsunomiyaJR": "JR-East",
        "Uetsu": "JR-East",
        "Yamagata": "JR-East",
        "ChiyodaBranch": "TokyoMetro",
        "Chuo": "JR-East",
        "Hachiko": "JR-East",
        "Hakodate2": "HakodateCity",
        "Hakodate5": "HakodateCity",
        "KeiseiChiba": "Keisei",
        "KeiseiChihara": "Keisei",
        "KeiseiKanamachi": "Keisei",
        "KeiseiOshiage": "Keisei",
        "NaritaSkyAccess": "Keisei",
        "NewShuttle": "SaitamaRailway", // ODPT 官方 operator 为 SaitamaRailway（埼玉新都市交通）。
        "Sobu": "JR-East",
        "SotetsuIzumino": "Sotetsu",
        "SotetsuShinYokohama": "Sotetsu",
        "TokaidoMain": "JR-East",
        // TokyoMonorail：ODPT无数据，移除映射
        "TokyuIkegami": "Tokyu",
        "TokyuKodomonokuni": "Tokyu",
        "TokyuMeguro": "Tokyu",
        "TokyuOimachi": "Tokyu",
        "TokyuSetagaya": "Tokyu",
        "TsurumiOkawa": "JR-East",
        "Tadami": "JR-East",
        "TsurumiUmiShibaura": "JR-East",
        "Yokohama": "JR-East",
        "Yamanote": "JR-East",
        "YokohamaBlue": "YokohamaMunicipal",
        "YokohamaGreen": "YokohamaMunicipal",
        "Yokosuka": "JR-East",
        "Yonesaka": "JR-East",
        "Yurakucho": "TokyoMetro",
        "SeibuYurakucho": "Seibu",
        "Yurikamome": "Yurikamome"
    };


    // ========== 线路 key → ODPT Railway code 别名表 ==========
    // 内部线路 key 与 ODPT odpt.Railway code 不一致时在此映射，避免 404。
    // 仅在内部 lineId 与数据源实际 owl:sameAs railway code 不同时登记已验证 alias；禁止根据英文名/命名惯例猜测 API identity。
    var LINE_RAILWAY_CODE = {
      "Hakodate2": "②_A",
      "Hakodate5": "⑤_A",
      "SaikyoKawagoe": "SaikyoKawagoe", // 大崎〜大宮〜川越
      "Kawagoe": "Kawagoe", // 川越〜高麗川
      "ShonanShinjuku": "ShonanShinjuku", // 湘南新宿ライン独立 ODPT railway
      "Takasaki": "Takasaki", // 高崎線
      "KeihinTohoku": "KeihinTohokuNegishi",
      "Marunouchi": "Marunouchi",
      "MarunouchiBranch": "MarunouchiBranch", // 丸ノ内線支線（方南町支線）独立 ODPT railway
      "Chuo": "Chuo",
      "Sobu": "Sobu",
      "TokaidoMain": "Tokaido",
      "Ou": "Ou",
      "Joban": "JobanRapid",
      "KeioMain": "Keio",
      "KeioSagami": "Sagamihara",
      "KeioZoo": "Dobutsuen",
      "KeioShin": "KeioNew",
      "TsurumiUmiShibaura": "TsurumiUmiShibauraBranch",
      "TsurumiOkawa": "TsurumiOkawaBranch",
      "ChiyodaBranch": "Chiyoda",
      "Noda": "TobuUrbanPark",
      "Nippori_Toneri": "NipporiToneri", // canonical line ID -> ODPT railway
      "NipporiToneri": "NipporiToneri", // compatibility alias
      "TobuIsesaki": "Isesaki",
      "Daishi_Tobu": "Daishi",
      "KeioInokashira": "Inokashira",
      "KeioKeibajo": "Keibajo",
      "KeioTakao": "Takao",
      "Tobu_Kameido": "Kameido",
      "TobuNikko": "Nikko",
      "Sano": "Sano",
      "Kiryu": "Kiryu",
      "Kinugawa": "Kinugawa",
      "YokohamaBlue": "Blue",
      "YokohamaGreen": "Green",
      "SotetsuMain": "Main",
      "SotetsuIzumino": "Izumino",
      "TokyuDenEnToshi": "DenEnToshi",
      "TokyuToyoko": "Toyoko",
      "TokyuMeguro": "Meguro",
      "TokyuOimachi": "Oimachi",
      "TokyuIkegami": "Ikegami",
      "TokyuSetagaya": "Setagaya",
      "TokyuTamagawa": "TokyuTamagawa",
      "TokyuKodomonokuni": "Kodomonokuni",
      "TamaMonorail": "TamaMonorail",
    
    "ChuoTatsuno": "ChuoTatsunoBranch",
    "RikuEast": "RikuEast",
    "RikuWest": "RikuWest",
    "UtsunomiyaJR": "Utsunomiya",
    // 东武宇都宫线使用独立 railway identity，与 JR 宇都宫线由 operator namespace 区分。
     "TobuUtsunomiya": "Utsunomiya", // 東武宇都宮線。JR は UtsunomiyaJR + JR-East namespace で分離
    // 都营新宿线显式登记，避免依赖命名推断。
    "Shinjuku": "Shinjuku",
    "JobanMain": "Joban",
    "Tohoku": "Tohoku",
    // 新建支线和东金线使用与本地 ID 一致的 ODPT railway code。
    "Togane": "Togane",
    "NaritaAbikoBranch": "NaritaAbikoBranch",
    "NaritaAirportBranch": "NaritaAirportBranch",
    "NambuBranch": "NambuBranch",
    "Yamagata": "OuYamagata",
    "Hanawa": "Hanawa",
    "Yahiko": "Yahiko",
    "Yonesaka": "Yonesaka",
    "Koumi": "Koumi",
    // ODPT railway code 与本地 line ID 不一致时，在此登记已核对的映射。
    // 京急（ODPT 官方用 Main/Airport/Kurihama/Zushi/Daishi）
    "Keikyu": "Main",
    "KeikyuAirport": "Airport",
    "KeikyuKurihama": "Kurihama",
    "KeikyuZushi": "Zushi",
    "KeikyuDaishi": "Daishi",
    // 京成（本線/千葉/金町/押上；千原線 KeiseiChihara ODPT 无独立 railway，维持透传不生效）
    "Keisei": "Main",
    "KeiseiChiba": "Chiba",
    "KeiseiKanamachi": "Kanamachi",
    "KeiseiOshiage": "Oshiage",
    "NaritaSkyAccess": "NaritaSkyAccess",
    // 西武线路使用各自的 ODPT railway code。
    "SeibuSayama": "Sayama",
    "Seibuen": "Seibuen",
    "SeibuShinjuku": "Shinjuku",
    "SeibuTamagawa": "Tamagawa",
    "SeibuTamako": "Tamako",
    "SeibuToshima": "Toshima",
    "SeibuYamaguchi": "Yamaguchi",
    "SeibuYurakucho": "SeibuYurakucho",
    // 小田急
    "OdakyuEnoshima": "Enoshima",
    "OdakyuTama": "Tama",
    // 相鉄（新横浜線の source-specific railway code）
    "SotetsuShinYokohama": "SotetsuShinYokohama",
    // 埼玉新都市交通（operator 已改 SaitamaRailway，railway 同名）
    "NewShuttle": "SaitamaRailway",
    // Kitakami、Yamada 等同名 railway 直接透传，无需额外垫片。
};

    // Canonical railway identity: operator namespace + railway code.
    // A railway short code is never a globally unique identity.
    function makeRailwayIdentity(operator, railwayCode) {
      if (!operator || !railwayCode) return null;
      return {
        operator: String(operator),
        railwayCode: String(railwayCode),
        key: String(operator) + "::" + String(railwayCode),
        odptRailway: "odpt.Railway:" + String(operator) + "." + String(railwayCode)
      };
    }

    function parseRailwayIdentity(value) {
      try {
        var raw = typeof value === "string" ? value : ((value && value["odpt:railway"]) || "");
        var m = String(raw).match(/^odpt\.Railway:([^.]+)\.(.+)$/);
        return m ? makeRailwayIdentity(m[1], m[2]) : null;
      } catch(e) { return null; }
    }

    function getLineRailwayIdentity(lineId) {
      if (!lineId) return null;
      var operator = LINE_TO_OPERATOR[lineId] || null;
      var code = LINE_RAILWAY_CODE[lineId] || lineId;
      return makeRailwayIdentity(operator, code);
    }

    // 解析内部线路 key 为 ODPT Railway code（带别名）
    function resolveRailwayCode(operator, railway) {
      var code = LINE_RAILWAY_CODE[railway] || railway;
      var identity = makeRailwayIdentity(operator, code);
      return identity ? identity.odptRailway : null;
    }
    // ========== API 请求限速 ==========
    // 为每个API服务维护请求队列，确保不超过频率限制
    var API_RATE_LIMIT = (window.RuntimeConfig && window.RuntimeConfig.API_RATE_LIMIT) || 150;   // 最小请求间隔（毫秒）。
    var API_MAX_CONCURRENCY = (window.RuntimeConfig && window.RuntimeConfig.API_MAX_CONCURRENCY) || 3;  // 每域最大并发（滑动窗口）
    var apiLastRequestTime = {
        'api-challenge.odpt.org': 0,
        'api.odpt.org': 0
    };
    var apiRequestQueue = {
        'api-challenge.odpt.org': [],
        'api.odpt.org': []
    };
    var _active = {};
    var apiQueueProcessing = {
        'api-challenge.odpt.org': false,
        'api.odpt.org': false
    };
    // ODPT returns 429/403 for quota and challenge failures. Keep a short
    // domain cooldown so visibility events and multiple pages cannot hammer
    // the same service while the last good snapshot remains usable.
    var API_BACKOFF_429 = (window.RuntimeConfig && window.RuntimeConfig.API_BACKOFF_429) || 120000;
    var API_BACKOFF_403 = (window.RuntimeConfig && window.RuntimeConfig.API_BACKOFF_403) || 300000;
    var apiCooldownUntil = Object.create(null);
    var apiCooldownStatus = Object.create(null);
    var _queuedFetchInflight = Object.create(null);

    function getApiDomain(url) {
        try {
            var match = String(url).match(/https?:\/\/([^\/]+)/);
            return match ? match[1] : 'unknown';
        } catch(e) { return 'unknown'; }
    }

    function processApiQueue(domain) {
        if (apiQueueProcessing[domain]) return;
        if (apiRequestQueue[domain].length === 0) return;

        apiQueueProcessing[domain] = true;

        // 每域使用并发滑动窗口，避免突发请求超过服务限制。
        function pump() {
            while (apiRequestQueue[domain].length > 0 && (_active[domain] || 0) < API_MAX_CONCURRENCY) {
                var now = Date.now();
                var cooldownUntil = apiCooldownUntil[domain] || 0;
                if (cooldownUntil > now) {
                    setTimeout(function() { pump(); }, cooldownUntil - now);
                    return;
                }
                var lastTime = apiLastRequestTime[domain] || 0;
                var waitTime = Math.max(0, API_RATE_LIMIT - (now - lastTime));
                if (waitTime > 0) {
                    setTimeout(function() { pump(); }, waitTime);
                    return;
                }
                var request = apiRequestQueue[domain].shift();
                if (!request) break;
                apiLastRequestTime[domain] = Date.now();
                _active[domain] = (_active[domain] || 0) + 1;

                // 执行实际的fetch
                fetch(request.url, {
                    headers: { "Accept": request.binary ? "application/x-protobuf" : "application/json" },
                    signal: AbortSignal.timeout(8000)
                }).then(function(resp) {
                    if (!resp.ok) {
                        var httpError = new Error("HTTP " + resp.status);
                        httpError.httpStatus = Number(resp.status) || 0;
                        if (httpError.httpStatus === 429) {
                            apiCooldownStatus[domain] = 429;
                            apiCooldownUntil[domain] = Date.now() + API_BACKOFF_429;
                        }
                        if (httpError.httpStatus === 403) {
                            apiCooldownStatus[domain] = 403;
                            apiCooldownUntil[domain] = Date.now() + API_BACKOFF_403;
                        }
                        throw httpError;
                    }
                    return request.binary ? resp.arrayBuffer() : resp.json();
                }).then(function(data) {
                    request.resolve(data);
                }).catch(function(e) {
                    console.warn("[ODPT] Rate-limited fetch failed:", e.message);
                    request.reject(e);
                }).finally(function() {
                    _active[domain] = (_active[domain] || 1) - 1;
                    pump();
                });
            }
            if ((_active[domain] || 0) === 0 && apiRequestQueue[domain].length === 0) {
                apiQueueProcessing[domain] = false;
            }
        }

        pump();
    }

    function rateLimitedFetch(url, options) {
        var binary = !!(options && options.binary);
        var requestKey = (binary ? "binary:" : "json:") + url;
        if (_queuedFetchInflight[requestKey]) return _queuedFetchInflight[requestKey];
        var queued = new Promise(function(resolve, reject) {
            var domain = getApiDomain(url);
            if (!apiRequestQueue[domain]) {
                // 未知域名，直接fetch
                fetch(url, {
                    headers: { "Accept": binary ? "application/x-protobuf" : "application/json" },
                    signal: AbortSignal.timeout(8000)
                }).then(resolve).catch(reject);
                return;
            }

            var cooldown = apiCooldownUntil[domain] || 0;
            if (cooldown > Date.now()) {
                var waitError = new Error("HTTP backoff for " + domain);
                waitError.httpStatus = apiCooldownStatus[domain] || 429;
                reject(waitError);
                return;
            }
            apiRequestQueue[domain].push({ url: url, resolve: resolve, reject: reject, binary: binary });
            processApiQueue(domain);
        });
        _queuedFetchInflight[requestKey] = queued.finally(function() { delete _queuedFetchInflight[requestKey]; });
        return _queuedFetchInflight[requestKey];
    }

    // 所有消费者共用一个请求所有者。时刻表保留现有缓存。
    var _requestInflight = Object.create(null);
    var _liveResponses = Object.create(null);
    var _requestMetrics = { started: 0, joined: 0, cacheHits: 0, failed: 0, staleRows: 0 };
    function _sourceTime(row) {
        var value = row && (row['dc:date'] || row['dct:modified']);
        return value ? Date.parse(value) || 0 : 0;
    }
    function _retainNewerRows(previous, incoming) {
        if (!Array.isArray(previous) || !Array.isArray(incoming)) return incoming;
        var old = Object.create(null);
        previous.forEach(function(row) { var id = row && (row['owl:sameAs'] || row['@id']); if (id) old[id] = row; });
        return incoming.map(function(row) {
            var id = row && (row['owl:sameAs'] || row['@id']), prior = old[id];
            if (prior && _sourceTime(prior) && _sourceTime(prior) <= Date.now() + 60000 && _sourceTime(row) && _sourceTime(row) < _sourceTime(prior)) {
                _requestMetrics.staleRows++;
                return prior;
            }
            return row;
        });
    }
    // ===== Toei GTFS-Realtime -> unified ODPT position records =====
    // The Toei feed is protobuf, while the rest of this page consumes the
    // normalized ODPT-like collection below. Keep the adapter here so the
    // existing DataFusion/renderer path remains the single consumer.
    function _gtfsField(fields, no) {
        var value = fields[no];
        return Array.isArray(value) ? value[value.length - 1] : value;
    }
    function _gtfsPush(fields, no, value) {
        if (fields[no] == null) fields[no] = value;
        else if (Array.isArray(fields[no])) fields[no].push(value);
        else fields[no] = [fields[no], value];
    }
    function _gtfsString(bytes) {
        try {
            if (typeof TextDecoder === "function") return new TextDecoder("utf-8").decode(bytes);
        } catch (e) {}
        var out = "";
        for (var i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
        return out;
    }
    function _gtfsReadVarint(bytes, state) {
        var value = 0, shift = 0, b;
        while (state.i < bytes.length) {
            b = bytes[state.i++];
            value += (b & 0x7f) * Math.pow(2, shift);
            if (!(b & 0x80)) return value;
            shift += 7;
            if (shift > 53) return value;
        }
        return value;
    }
    function _gtfsReadMessage(bytes) {
        var fields = {}, state = { i: 0 };
        while (state.i < bytes.length) {
            var tag = _gtfsReadVarint(bytes, state);
            var no = Math.floor(tag / 8), wire = tag % 8, value;
            if (!no) break;
            if (wire === 0) value = _gtfsReadVarint(bytes, state);
            else if (wire === 1) {
                value = bytes.slice(state.i, state.i + 8);
                state.i += 8;
            } else if (wire === 2) {
                var len = _gtfsReadVarint(bytes, state);
                value = bytes.slice(state.i, state.i + len);
                state.i += len;
            } else if (wire === 5) {
                value = bytes.slice(state.i, state.i + 4);
                state.i += 4;
            } else {
                break;
            }
            _gtfsPush(fields, no, value);
        }
        return fields;
    }
    function _gtfsNested(fields, no) {
        var value = _gtfsField(fields, no);
        return value && value.length != null ? _gtfsReadMessage(value) : {};
    }
    function _gtfsText(fields, no) {
        var value = _gtfsField(fields, no);
        return value && value.length != null && typeof value !== "string" ? _gtfsString(value) : String(value || "");
    }
    function _gtfsFloat(bytes) {
        if (!bytes || bytes.length < 4) return NaN;
        return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat32(0, true);
    }
    function _toeiGtfsLineId(routeId, tripId, stopId) {
        var raw = [routeId, tripId, stopId].map(function(v) { return String(v || ""); }).join(" ");
        var upper = raw.toUpperCase();
        // 都营 GTFS-RT 当前不填 route_id；trip_id 使用线路运行号前缀。
        // 旧 feed 使用 12/13=A、22/23=I、32/33=S、42/43=E、66/67=K；
        // 现行 feed 已切换为 10/11、20/21、30/31、40/41、60/61。
        // 这些是线路运行号，不是车辆型号，不能拿来直接猜 PNG。
        var tripPrefix = String(tripId || "").match(/^(10|11|12|13|20|21|22|23|30|31|32|33|40|41|42|43|60|61|66|67)/);
        if (tripPrefix) {
            var prefixLines = {
                "10": "Asakusa", "11": "Asakusa",
                "12": "Asakusa", "13": "Asakusa",
                "20": "Mita", "21": "Mita",
                "22": "Mita", "23": "Mita",
                "30": "Shinjuku", "31": "Shinjuku",
                "32": "Shinjuku", "33": "Shinjuku",
                "40": "Oedo", "41": "Oedo",
                "42": "Oedo", "43": "Oedo",
                "60": "Arakawa", "61": "Arakawa",
                "66": "Arakawa", "67": "Arakawa"
            };
            if (prefixLines[tripPrefix[1]]) return prefixLines[tripPrefix[1]];
        }
        var named = [
            { lineId: "Nippori_Toneri", names: ["NIPPORI", "TONERI", "NIPPORI_TONERI", "NIPPORITONERI", "NT"] },
            { lineId: "Asakusa", names: ["ASAKUSA", "浅草", "A"] },
            { lineId: "Mita", names: ["MITA", "三田", "I"] },
            { lineId: "Shinjuku", names: ["SHINJUKU", "新宿", "S"] },
            { lineId: "Oedo", names: ["OEDO", "大江戸", "E"] },
            { lineId: "Arakawa", names: ["ARAKAWA", "荒川", "SAKURA", "K"] }
        ];
        for (var i = 0; i < named.length; i++) {
            for (var j = 0; j < named[i].names.length; j++) {
                var token = named[i].names[j];
                if (token.length > 1 ? upper.indexOf(token) >= 0 : new RegExp("(^|[^A-Z])" + token + "([^A-Z]|$)").test(upper)) {
                    return named[i].lineId;
                }
            }
        }
        return "";
    }
    function _toeiStationLocation(stationId) {
        var id = String(stationId || "");
        var direct = window.STATION_COORDS && window.STATION_COORDS[id];
        if (!direct && window.RAILWAY_DATA && window.RAILWAY_DATA.stations) {
            direct = window.RAILWAY_DATA.stations[id];
        }
        if (Array.isArray(direct)) {
            return { lat: Number(direct[0]), lon: Number(direct[1]) };
        }
        if (direct && typeof direct === "object") {
            return { lat: Number(direct.lat), lon: Number(direct.lng != null ? direct.lng : direct.lon) };
        }
        if (window.RailwayDB && typeof window.RailwayDB.getStationLocation === "function") {
            var loc = window.RailwayDB.getStationLocation(id);
            if (Array.isArray(loc)) return { lat: Number(loc[0]), lon: Number(loc[1]) };
        }
        return null;
    }
    function _toeiGtfsLineFromPosition(lat, lon) {
        lat = Number(lat); lon = Number(lon);
        if (!isFinite(lat) || !isFinite(lon)) return "";
        var all = window.RAILWAY_DATA && window.RAILWAY_DATA.lines || window.UNIFIED_LINES || {};
        var lineIds = ["Asakusa", "Mita", "Shinjuku", "Oedo", "Arakawa", "Nippori_Toneri"];
        var ranked = [];
        lineIds.forEach(function(lineId) {
            var line = all[lineId];
            var best = Infinity;
            (line && Array.isArray(line.stations) ? line.stations : []).forEach(function(stationId) {
                var c = _toeiStationLocation(stationId);
                if (!c || !isFinite(c.lat) || !isFinite(c.lon)) return;
                var dLat = (lat - c.lat) * 111;
                var dLon = (lon - c.lon) * 91;
                best = Math.min(best, Math.sqrt(dLat * dLat + dLon * dLon));
            });
            if (isFinite(best)) ranked.push({ lineId: lineId, distanceKm: best });
        });
        ranked.sort(function(a, b) { return a.distanceKm - b.distanceKm; });
        // 坐标只能作为无线路号时的归属兜底；远离都营线的点不纳入，
        // 相邻换乘站的等距情况也不强行伪造线路。
        if (!ranked.length || ranked[0].distanceKm > 2.5) return "";
        if (ranked.length > 1 && ranked[1].distanceKm - ranked[0].distanceKm < 0.08) return "";
        return ranked[0].lineId;
    }
    function _toeiStationFromGtfs(lineId, stopId, lat, lon) {
        var all = window.UNIFIED_LINES || (window.RAILWAY_DATA && window.RAILWAY_DATA.lines) || {};
        var line = all[lineId];
        var stations = line && Array.isArray(line.stations) ? line.stations : [];
        if (!stations.length) return "";
        var raw = String(stopId || "");
        var codeMatch = raw.match(/(?:^|[^A-Z])(?:A|I|S|E|K|NT)[-_ ]?(\d{1,2})(?:$|[^0-9])/i);
        if (codeMatch) {
            var codeIndex = Number(codeMatch[1]) - 1;
            if (codeIndex >= 0 && codeIndex < stations.length) return stations[codeIndex];
        }
        var shortStop = raw.split(/[.:/]/).pop();
        for (var si = 0; si < stations.length; si++) {
            if (String(stations[si]).toLowerCase() === shortStop.toLowerCase()) return stations[si];
        }
        var best = "", bestD = Infinity, pLat = Number(lat), pLon = Number(lon);
        if (!isFinite(pLat) || !isFinite(pLon)) return "";
        for (var ci = 0; ci < stations.length; ci++) {
            var c = _toeiStationLocation(stations[ci]);
            var cLat = c ? c.lat : NaN, cLon = c ? c.lon : NaN;
            if (!isFinite(cLat) || !isFinite(cLon)) continue;
            var d = Math.pow((cLat - pLat) * 111, 2) + Math.pow((cLon - pLon) * 91, 2);
            if (d < bestD) { bestD = d; best = stations[ci]; }
        }
        return best;
    }
    function _toeiOedo600VehicleType(compactTokens) {
        // 12-600 形的 GTFS 车号可带 F、连字符或前后说明文字。
        // 本地图库只有三组可用代表图，因此把官方编组批次归并到
        // 1 次车/前期车/后期车三组；无法识别批次时由通用实时图兜底。
        var setNumber = null;
        for (var i = 0; i < compactTokens.length; i++) {
            var match = compactTokens[i].match(/12([6-9][0-9]{2})F?/);
            if (!match) continue;
            setNumber = Number(match[1]);
            break;
        }
        // GTFS trip_id/运用号没有实体编成号时不能冒充 12-600 形；
        // 交给 TrainVehicle 的运用号候选库决定参考 PNG。
        if (setNumber === null || setNumber === 600) return "";
        if (setNumber >= 611 && setNumber <= 618) return "都営12-600形（1次車）";
        if (setNumber >= 621 && setNumber <= 681) return "都営12-600形（前期車）";
        if (setNumber >= 691) return "都営12-600形（後期車）";
        return "都営12-600形";
    }
    function _toeiGtfsVehicleType(lineId, vehicleId, vehicleLabel, tripId) {
        var raw = String(vehicleId || "") + " " + String(vehicleLabel || "");
        var upper = raw.toUpperCase();
        // 都営車の実車号は feed により `12611` / `12-611` / `12-611F`
        // のように区切りが揺れる。同じ物理車号を表す表記差を先に
        // 正規化し、列車番号や trip_id は混ぜずに形式だけを判定する。
        var compactTokens = [vehicleId, vehicleLabel].map(function(value) {
            return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        }).filter(Boolean);
        function has(pattern) { return pattern.test(upper); }
        function hasCompact(pattern) {
            return compactTokens.some(function(token) { return pattern.test(token); });
        }
        // 三田線の G 運用は相鉄車。三田線へ入線できる相鉄車は
        // 8両編成の21000系なので、vehicle_id が trip_id と同じで
        // 物理車号を返さない GTFS でも、この運用証拠は车型を確定できる。
        if (lineId === "Mita" && /[0-9]{2}G[0-9A-Z]*$/i.test(String(tripId || ""))) return "相鉄21000系";
        if (lineId === "Asakusa" && (has(/5500/) || hasCompact(/55[0-9]{2,3}F?$/))) return "都営5500形";
        if (lineId === "Shinjuku") {
            var shinjukuSet = null;
            for (var si = 0; si < compactTokens.length; si++) {
                var shinjukuMatch = compactTokens[si].match(/10([3-7][0-9]{2})(?:F)?/);
                if (shinjukuMatch) { shinjukuSet = Number(shinjukuMatch[1]); break; }
            }
            if (has(/10[- ]?300/) || shinjukuSet === 300 || (shinjukuSet >= 300 && shinjukuSet <= 480)) return "都営10-300形（1・2次車）";
            if (shinjukuSet >= 490) return "都営10-300形（3次車以降）";
        }
        if (lineId === "Mita") {
            if (has(/6500|65[0-9]{2}/) || hasCompact(/65[0-9]{2,3}F?$/)) return "都営6500形";
            if (has(/6300|63[0-9]{2}/) || hasCompact(/63[0-9]{2,3}F?$/)) return "都営6300形";
        }
        if (lineId === "Oedo") {
            // 12-600 形は 12-601～、12-000 形は 12-001～の車号。
            // 先頭の系列コードを物理車号上で確認するため、
            // `12-611F` も `12611F` と同じ結果になる。
            if (compactTokens.some(function(token) { return /(^|[^0-9])12[6-9][0-9]{2}(?:F)?/.test(token); })) return _toeiOedo600VehicleType(compactTokens);
            if (compactTokens.some(function(token) { return /(^|[^0-9])120[0-9]{2}(?:F)?/.test(token); })) return "都営12-000形（4次車）";
        }
        if (lineId === "Nippori_Toneri") {
            if (has(/330形|^330[0-9]*$|[^0-9]330[0-9]*/) || hasCompact(/330[0-9]{0,2}F?$/)) return "日暮里・舎人ライナー330形";
            if (has(/320形|^320[0-9]*$|[^0-9]320[0-9]*/) || hasCompact(/320[0-9]{0,2}F?$/)) return "日暮里・舎人ライナー320形";
            if (has(/300形|^300[0-9]*$|[^0-9]300[0-9]*/) || hasCompact(/300[0-9]{0,2}F?$/)) return "日暮里・舎人ライナー300形";
        }
        return "";
    }
    function _toeiGtfsVehicleEvidenceKind(vehicleId, vehicleLabel, tripId, vehicleType) {
        var trip = String(tripId || "").trim();
        var id = String(vehicleId || "").trim();
        var label = String(vehicleLabel || "").trim();
        var physicalId = id && id !== trip ? id : "";
        var physicalLabel = label && label !== trip ? label : "";
        if (physicalId) return "physical-vehicle-id";
        if (physicalLabel) return "physical-vehicle-label";
        if (String(vehicleType || "").trim()) return "operation-derived-type";
        if (trip) return "trip-id-only";
        return "missing-vehicle-identity";
    }
    function _toeiGtfsServiceNumber(value) {
        // 都营 GTFS-RT 的 trip/vehicle id 形如 120509T0、231842G0、431817A0：
        // 前半段是 feed 内部的时间/线路编码，末尾两位加运用字母才是
        // 既有运用表的公开服务号（09T、42G、17A）。
        // A/B 是大江户线方向运用，G 是三田线相铁运用；不能把整个 GTFS
        // trip_id 当作列车号，否则无法与 SQL/运用表车次关联。
        var m = String(value || "").toUpperCase().match(/([0-9]{2})([ABGKNHT])[A-Z0-9]*$/);
        return m ? m[1] + m[2] : "";
    }
    function _toeiGtfsRailDirection(lineId, trip) {
        var directionId = Number(_gtfsField(trip, 6));
        // 大江户线的 GTFS-RT trip_id 末尾 A/B 是都营运用方向标记：
        // A 线＝内回り，B 线＝外回り。不能把环线列车压成
        // Inbound/Outbound，否则六字形环段会沿错误的端点方向显示。
        // 只在实时源给出 A/B 证据时映射；没有该证据时保留普通 GTFS 方向，
        // 不根据目的地或车号猜测环线方向（光丘开口尾段由渲染器按终点处理）。
        if (lineId === "Oedo") {
            var serviceNumber = _toeiGtfsServiceNumber(_gtfsText(trip, 1));
            var suffix = String(serviceNumber || "").slice(-1).toUpperCase();
            if (suffix === "A") return "odpt.RailDirection:Toei.InnerLoop";
            if (suffix === "B") return "odpt.RailDirection:Toei.OuterLoop";
        }
        if (directionId === 0 || directionId === 1) {
            return "odpt.RailDirection:Toei." + (directionId === 1 ? "Outbound" : "Inbound");
        }
        return "";
    }
    function _toeiGtfsTrainOwner(lineId, value) {
        var raw = String(value || "").toUpperCase();
        var suffix = String(_toeiGtfsServiceNumber(raw) || "").slice(-1);
        // 都营 GTFS-RT 的末尾字母是四直/目黑直通的所属方标记，
        // 不是车型号。保留到统一记录，供运营方筛选和车型证据链使用；
        // 仅凭所属方仍不能在多车型车队中选择 PNG。
        if (lineId === "Asakusa") {
            if (suffix === "T") return "Toei";
            if (suffix === "K") return "Keisei";
            if (suffix === "H") return "Keikyu";
            if (suffix === "N") return "Hokuso";
        }
        if (lineId === "Mita") {
            if (suffix === "T") return "Toei";
            if (suffix === "K") return "Tokyu";
            if (suffix === "G") return "Sotetsu";
        }
        if (lineId === "Shinjuku") {
            if (suffix === "T") return "Toei";
            if (suffix === "K") return "Keio";
        }
        if (lineId === "Oedo" || lineId === "Arakawa" || lineId === "Nippori_Toneri") return "Toei";
        return suffix === "T" ? "Toei" : "";
    }
    function _toeiGtfsIso(timestamp, fallback) {
        var ms = Number(timestamp) > 0 ? Number(timestamp) * 1000 : Date.now();
        return new Date(ms).toISOString();
    }
    function _decodeToeiGtfsPositions(buffer) {
        var bytes = new Uint8Array(buffer), feed = _gtfsReadMessage(bytes);
        var header = _gtfsNested(feed, 1), feedTime = Number(_gtfsField(header, 3)) || Date.now() / 1000;
        var entities = feed[2] == null ? [] : (Array.isArray(feed[2]) ? feed[2] : [feed[2]]);
        var rows = [];
        entities.forEach(function(entityBytes) {
            var entity = _gtfsReadMessage(entityBytes);
            var vehicle = _gtfsNested(entity, 4);
            if (!vehicle || !Object.keys(vehicle).length) return;
            // GTFS-RT VehiclePosition 的标准字段编号：
            // trip=1、position=2、current_stop_sequence=3、
            // current_status=4、timestamp=5、congestion_level=6、
            // stop_id=7、vehicle=8。
            // 4/5/6/7 不能按旧版字段表错位读取，否则站点和时间会丢失，
            // 实时行会全部失去站点/车型映射并退回灰点。
            var trip = _gtfsNested(vehicle, 1), position = _gtfsNested(vehicle, 2);
            var vehicleDesc = _gtfsNested(vehicle, 8);
            var routeId = _gtfsText(trip, 5);
            var tripId = _gtfsText(trip, 1);
            var stopId = _gtfsText(vehicle, 7);
            var currentStopSequence = Number(_gtfsField(vehicle, 3)) || 0;
            var vehicleId = _gtfsText(vehicleDesc, 1);
            var vehicleLabel = _gtfsText(vehicleDesc, 2);
            var lat = _gtfsFloat(_gtfsField(position, 1)), lon = _gtfsFloat(_gtfsField(position, 2));
            var lineId = _toeiGtfsLineId(routeId, tripId, stopId) || _toeiGtfsLineFromPosition(lat, lon);
            if (!lineId) return;
            var station = _toeiStationFromGtfs(lineId, stopId, lat, lon);
            if (!station) return;
            var code = lineId === "Asakusa" ? "Asakusa" : lineId === "Mita" ? "Mita" : lineId === "Shinjuku" ? "Shinjuku" : lineId === "Oedo" ? "Oedo" : lineId === "Arakawa" ? "Arakawa" : "NipporiToneri";
            var observed = Number(_gtfsField(vehicle, 5)) || feedTime;
            var id = _gtfsText(entity, 1) || tripId || _gtfsText(vehicleDesc, 1) || (lineId + "-" + station);
            var serviceNumber = _toeiGtfsServiceNumber(tripId);
            var physicalCar = vehicleId && vehicleId !== tripId ? vehicleId : "";
            var vehicleType = _toeiGtfsVehicleType(lineId, vehicleId, vehicleLabel, tripId);
            rows.push({
                "@id": "gtfs:Toei:" + id,
                "owl:sameAs": "gtfs:Toei:" + id,
                "odpt:operator": "odpt.Operator:Toei",
                "odpt:railway": "odpt.Railway:Toei." + code,
                "odpt:trainNumber": serviceNumber || String(tripId || id),
                "odpt:operationCode": serviceNumber || "",
                "gtfs:tripId": String(tripId || ""),
                "gtfs:vehicleId": String(vehicleId || ""),
                "odpt:trainOwner": _toeiGtfsTrainOwner(lineId, tripId),
                "odpt:fromStation": "odpt.Station:Toei." + code + "." + station,
                "odpt:railDirection": _toeiGtfsRailDirection(lineId, trip),
                "odpt:trainType": "odpt.TrainType:Toei.Local",
                "vehicleCarNumber": physicalCar || (vehicleLabel && vehicleLabel !== tripId ? vehicleLabel : ""),
                "vehicleLabel": String(vehicleLabel || ""),
                "gtfs:currentStopSequence": currentStopSequence,
                "odpt:vehicleType": vehicleType,
                "gtfs:vehicleEvidenceKind": _toeiGtfsVehicleEvidenceKind(vehicleId, vehicleLabel, tripId, vehicleType),
                "dc:date": _toeiGtfsIso(observed, feedTime),
                "dct:valid": _toeiGtfsIso(observed + 60, feedTime),
                "odpt:frequency": 30,
                "gtfs:latitude": lat,
                "gtfs:longitude": lon
            });
        });
        return rows;
    }
    function fetchToeiGtfsPositions(url) {
        if (!url) return Promise.reject(new Error("Toei GTFS-RT endpoint unavailable"));
        return rateLimitedFetch(url, { binary: true }).then(_decodeToeiGtfsPositions);
    }

    function _gtfsPrintableText(value) {
        var text = _gtfsText({ 1: value }, 1);
        if (!text) return "";
        // 都营 GTFS-RT 当前省略 stop_id，并把字段 2/3 编成时间事件；
        // 二进制时间戳不能当作站点 ID。
        return /^[\x20-\x7e]+$/.test(text) ? text : "";
    }
    function _toeiTripUpdateStop(bytes) {
        var stop = _gtfsReadMessage(bytes), stopId = _gtfsPrintableText(_gtfsField(stop, 2));
        var arrival = _gtfsNested(stop, 3), departure = _gtfsNested(stop, 4);
        // 当前都营 feed 的紧凑布局为
        // stop_sequence=1、arrival=2、departure=3、schedule_relationship=5，
        // 没有 stop_id；标准布局仍由上面的分支兼容。
        if (!stopId && !Object.keys(departure).length && Object.keys(_gtfsNested(stop, 2)).length) {
            arrival = _gtfsNested(stop, 2);
            departure = _gtfsNested(stop, 3);
        }
        var event = Object.keys(departure).length ? departure : arrival;
        var delay = _gtfsField(event, 1), time = _gtfsField(event, 2);
        return {
            sequence: Number(_gtfsField(stop, 1)) || 0,
            stopId: stopId,
            delay: delay == null ? null : Number(delay),
            time: time == null ? 0 : Number(time),
            relationship: Number(_gtfsField(stop, 5)) || 0
        };
    }
    function _gtfsOrderedStops(stops) {
        // GTFS-RT does not require stop_time_update entries to arrive in
        // payload order. Use the highest published stop_sequence as terminal.
        return (Array.isArray(stops) ? stops : []).map(function(stop, index) {
            return { stop: stop, index: index };
        }).sort(function(a, b) {
            var as = Number(a.stop && a.stop.sequence) || 0;
            var bs = Number(b.stop && b.stop.sequence) || 0;
            if (as !== bs) {
                if (!as) return 1;
                if (!bs) return -1;
                return as - bs;
            }
            return a.index - b.index;
        }).map(function(item) { return item.stop; });
    }
    function _toeiGtfsSequenceTerminal(lineId, direction, stopCount, lastSequence) {
        var count = Number(stopCount) || 0;
        var last = Number(lastSequence) || 0;
        if (!lineId || !count || !last) return "";
        // 大江户线是六字形环线。当前 feed 不给 stop_id，但 A/B 方向和
        // 已发布的停站数足以识别这些明确的折返终点；有歧义的短折返保持空值，
        // 避免把计划终点冒充成实时终点。
        if (lineId === "Oedo") {
            var dir = String(direction || "").split(/[.:]/).pop();
            var oedo = {
                InnerLoop: { 39: "Tochomae", 25: "Kiyosumi-Shirakawa", 20: "Shiodome", 15: "Tochomae", 11: "Tochomae" },
                OuterLoop: { 39: "Hikarigaoka", 25: "Hikarigaoka", 20: "Hikarigaoka", 15: "Kiyosumi-Shirakawa" }
            };
            return oedo[dir] && oedo[dir][count] || "";
        }
        var all = window.UNIFIED_LINES || (window.RAILWAY_DATA && window.RAILWAY_DATA.lines) || {};
        var line = all[lineId], stations = line && Array.isArray(line.stations) ? line.stations : [];
        if (!stations.length || last < 1 || last > stations.length) return "";
        // 非环线的都营 TripUpdate 目前不带方向；未知方向时不强选线路另一端。
        var name = String(direction || "").split(":").pop();
        if (!name || name === "Inbound" || name === "Outbound") return "";
        return stations[last - 1] || "";
    }
    function _toeiGtfsTerminalFromPosition(position, update) {
        if (!position || !update) return "";
        var railway = String(position["odpt:railway"] || "").split(".").pop();
        var lineId = railway === "NipporiToneri" ? "Nippori_Toneri" : railway;
        if (!lineId || lineId === "Oedo") return "";
        var all = window.UNIFIED_LINES || (window.RAILWAY_DATA && window.RAILWAY_DATA.lines) || {};
        var line = all[lineId], stations = line && Array.isArray(line.stations) ? line.stations : [];
        var currentSequence = Number(position["gtfs:currentStopSequence"]) || 0;
        var lastSequence = Number(update["gtfs:stopSequenceLast"]) || 0;
        if (!stations.length || !currentSequence || !lastSequence || lastSequence > stations.length) return "";
        var rawStation = String(position["odpt:fromStation"] || "").split(".").pop();
        var stationIndex = -1;
        stations.some(function(station, index) {
            if (String(station).toLowerCase() === rawStation.toLowerCase()) {
                stationIndex = index;
                return true;
            }
            return false;
        });
        if (stationIndex < 0) return "";
        var forwardDistance = Math.abs((currentSequence - 1) - stationIndex);
        var reverseDistance = Math.abs((stations.length - currentSequence) - stationIndex);
        if (forwardDistance <= 1 && lastSequence - 1 < stations.length) return stations[lastSequence - 1] || "";
        if (reverseDistance <= 1 && stations.length - lastSequence >= 0) return stations[stations.length - lastSequence] || "";
        // 部分都营 TripUpdate 只发布从当前区间开始的 stop_sequence，
        // 因而序号和 canonical 全线站序没有一一对齐。列车已接近某一端点
        // 且两端距离有明显差异时，可把最近端点作为来源明确的边界参考；
        // 在线路中段保持空值，避免伪造方向。
        var distanceToStart = stationIndex;
        var distanceToEnd = stations.length - 1 - stationIndex;
        if (Math.min(distanceToStart, distanceToEnd) <= 6 && Math.abs(distanceToStart - distanceToEnd) >= 5) {
            return distanceToStart < distanceToEnd ? stations[0] : stations[stations.length - 1];
        }
        return "";
    }
    function _decodeToeiGtfsTripUpdates(buffer) {
        var feed = _gtfsReadMessage(new Uint8Array(buffer)), entities = _gtfsRepeated(feed, 2), rows = [];
        entities.forEach(function(entityBytes) {
            var entity = _gtfsReadMessage(entityBytes), update = _gtfsNested(entity, 3);
            if (!Object.keys(update).length) return;
            var trip = _gtfsNested(update, 1), vehicle = _gtfsNested(update, 3);
            var tripId = _gtfsText(trip, 1), routeId = _gtfsText(trip, 5), stopUpdates = _gtfsOrderedStops(_gtfsRepeated(update, 2).map(_toeiTripUpdateStop));
            var lineId = _toeiGtfsLineId(routeId, tripId, "");
            if (!lineId) return;
            var code = lineId === "Nippori_Toneri" ? "NipporiToneri" : lineId;
            var terminal = "", origin = "";
            var tripDirection = _toeiGtfsRailDirection(lineId, trip);
            var firstSequence = stopUpdates.length ? Number(stopUpdates[0].sequence) || 0 : 0;
            var lastSequence = stopUpdates.length ? Number(stopUpdates[stopUpdates.length - 1].sequence) || 0 : 0;
            if (stopUpdates.length) {
                var firstStop = stopUpdates[0], lastStop = stopUpdates[stopUpdates.length - 1];
                origin = _toeiStationFromGtfs(lineId, firstStop.stopId, NaN, NaN);
                terminal = _toeiStationFromGtfs(lineId, lastStop.stopId, NaN, NaN);
                if (!terminal && lastStop.stopId === "") {
                    terminal = _toeiGtfsSequenceTerminal(lineId, tripDirection,
                        Math.max(stopUpdates.length, lastSequence), lastSequence);
                }
            }
            var delaySeconds = null;
            for (var si = 0; si < stopUpdates.length; si++) {
                if (stopUpdates[si].delay != null) { delaySeconds = stopUpdates[si].delay; break; }
            }
            var observed = Number(_gtfsField(update, 4)) || Date.now() / 1000;
            var entityId = _gtfsText(entity, 1) || tripId || (lineId + "-trip-update");
            var serviceNumber = _toeiGtfsServiceNumber(tripId);
            var vehicleId = _gtfsText(vehicle, 1), vehicleLabel = _gtfsText(vehicle, 2);
            var vehicleType = _toeiGtfsVehicleType(lineId, vehicleId, vehicleLabel, tripId);
            rows.push({
                "@id": "gtfs-trip-update:Toei:" + entityId,
                "owl:sameAs": "gtfs-trip-update:Toei:" + entityId,
                "odpt:operator": "odpt.Operator:Toei",
                "odpt:railway": "odpt.Railway:Toei." + code,
                "odpt:trainOwner": _toeiGtfsTrainOwner(lineId, tripId),
                "odpt:trainNumber": serviceNumber || tripId,
                "odpt:operationCode": serviceNumber || "",
                "gtfs:tripId": String(tripId || ""),
                "gtfs:vehicleId": String(vehicleId || ""),
                "odpt:fromStation": origin ? "odpt.Station:Toei." + code + "." + origin : "",
                "odpt:toStation": terminal ? "odpt.Station:Toei." + code + "." + terminal : "",
                "odpt:destinationStation": terminal ? ["odpt.Station:Toei." + code + "." + terminal] : [],
                "odpt:railDirection": tripDirection,
                "odpt:delay": delaySeconds == null ? null : Math.round(delaySeconds / 60),
                "odpt:vehicleType": vehicleType,
                "gtfs:vehicleEvidenceKind": _toeiGtfsVehicleEvidenceKind(vehicleId, vehicleLabel, tripId, vehicleType),
                "vehicleCarNumber": vehicleId && vehicleId !== tripId ? vehicleId : (vehicleLabel && vehicleLabel !== tripId ? vehicleLabel : ""),
                "vehicleLabel": String(vehicleLabel || ""),
                "gtfs:stopSequenceFirst": firstSequence,
                "gtfs:stopSequenceLast": lastSequence,
                "gtfs:stopUpdateCount": stopUpdates.length,
                "gtfs:tripUpdateTimestamp": _toeiGtfsIso(observed),
                "gtfs:tripUpdateValidUntil": _toeiGtfsIso(observed + 60)
            });
        });
        return rows;
    }
    function _mergeGtfsTripUpdates(positions, updates) {
        if (!Array.isArray(positions) || !Array.isArray(updates) || !updates.length) return positions || [];
        var byTrip = Object.create(null), byScopedNumber = Object.create(null), byNumber = Object.create(null);
        var byScopedOperation = Object.create(null), byScopedVehicle = Object.create(null);
        updates.forEach(function(update) {
            var tripId = String(update["gtfs:tripId"] || ""), number = String(update["odpt:trainNumber"] || "");
            var railway = String(update["odpt:railway"] || "").split(".").pop();
            var operation = String(update["odpt:operationCode"] || ""), vehicle = String(update["gtfs:vehicleId"] || update.vehicleCarNumber || "");
            if (tripId) byTrip[tripId] = update;
            if (number && railway) byScopedNumber[railway + "::" + number] = update;
            if (number && !byNumber[number]) byNumber[number] = update;
            else if (number) byNumber[number] = null;
            if (operation && railway) byScopedOperation[railway + "::" + operation] = update;
            if (vehicle && railway) byScopedVehicle[railway + "::" + vehicle] = update;
        });
        return positions.map(function(position) {
            var tripId = String(position["gtfs:tripId"] || ""), number = String(position["odpt:trainNumber"] || "");
            var railway = String(position["odpt:railway"] || "").split(".").pop();
            var operation = String(position["odpt:operationCode"] || ""), vehicle = String(position["gtfs:vehicleId"] || position.vehicleCarNumber || "");
            var update = (tripId && byTrip[tripId]) || (number && byScopedNumber[railway + "::" + number]) ||
                (operation && byScopedOperation[railway + "::" + operation]) ||
                (vehicle && byScopedVehicle[railway + "::" + vehicle]) ||
                (number && byNumber[number]);
            if (!update) return position;
            if (update["odpt:destinationStation"] && update["odpt:destinationStation"].length) position["odpt:destinationStation"] = update["odpt:destinationStation"];
            if (update["odpt:toStation"]) position["odpt:toStation"] = update["odpt:toStation"];
            if (!position["odpt:toStation"] && !update["odpt:toStation"]) {
                var inferredTerminal = _toeiGtfsTerminalFromPosition(position, update);
                if (inferredTerminal) {
                    var positionRailwayCode = String(position["odpt:railway"] || "").split(".").pop();
                    position["odpt:toStation"] = "odpt.Station:Toei." + positionRailwayCode + "." + inferredTerminal;
                    position["odpt:destinationStation"] = [position["odpt:toStation"]];
                    position["gtfs:destinationInference"] = "sequence-position-alignment";
                }
            }
            if (update["odpt:delay"] != null) position["odpt:delay"] = update["odpt:delay"];
            if (!position["odpt:trainOwner"] && update["odpt:trainOwner"]) position["odpt:trainOwner"] = update["odpt:trainOwner"];
            if (!position["odpt:vehicleType"] && update["odpt:vehicleType"]) position["odpt:vehicleType"] = update["odpt:vehicleType"];
            if (!position["odpt:railDirection"] && update["odpt:railDirection"]) position["odpt:railDirection"] = update["odpt:railDirection"];
            if (!position["gtfs:vehicleId"] && update["gtfs:vehicleId"]) position["gtfs:vehicleId"] = update["gtfs:vehicleId"];
            if (!position.vehicleCarNumber && update.vehicleCarNumber) position.vehicleCarNumber = update.vehicleCarNumber;
            if (!position["gtfs:vehicleEvidenceKind"] && update["gtfs:vehicleEvidenceKind"]) {
                position["gtfs:vehicleEvidenceKind"] = update["gtfs:vehicleEvidenceKind"];
            }
            position["gtfs:tripUpdateTimestamp"] = update["gtfs:tripUpdateTimestamp"] || "";
            position["gtfs:tripUpdateValidUntil"] = update["gtfs:tripUpdateValidUntil"] || "";
            return position;
        });
    }
    function fetchToeiGtfsTripUpdates(url) {
        if (!url) return Promise.reject(new Error("Toei GTFS-RT TripUpdate endpoint unavailable"));
        return rateLimitedFetch(url, { binary: true }).then(_decodeToeiGtfsTripUpdates);
    }

    function _gtfsLineIdForOperator(operator, routeId, tripId, stopId) {
        var raw = [routeId, tripId, stopId].map(function(v) { return String(v || ""); }).join(" ");
        var upper = raw.toUpperCase();
        // 函館市電 GTFS-RT 的 trip_id 使用「系統2-...／系統5-...」，
        // route_id 可能为空；按官方 trip 标识落到两条 canonical 系统。
        if (operator === "HakodateCity") {
            if (/系統\s*2(?:[-_]|$)/.test(raw)) return "Hakodate2";
            if (/系統\s*5(?:[-_]|$)/.test(raw)) return "Hakodate5";
        }
        var normalizeRailwayToken = function(value) {
            return String(value || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
        };
        var railwayMatch = String(routeId || "").match(/^odpt\.Railway:([^\.]+)\.(.+)$/i);
        var routeCode = railwayMatch ? railwayMatch[2] : "";
        var normalizedRaw = normalizeRailwayToken(raw);
        var normalizedRouteCode = normalizeRailwayToken(routeCode);
        var candidates = Object.keys(LINE_TO_OPERATOR).filter(function(lineId) {
            return LINE_TO_OPERATOR[lineId] === operator;
        });
        for (var i = 0; i < candidates.length; i++) {
            var lineId = candidates[i], code = LINE_RAILWAY_CODE[lineId] || lineId;
            if (railwayMatch && railwayMatch[1] === operator &&
                (String(code).toLowerCase() === routeCode.toLowerCase() ||
                 normalizeRailwayToken(code) === normalizedRouteCode)) return lineId;
        }
        for (var j = 0; j < candidates.length; j++) {
            var candidate = candidates[j], candidateCode = LINE_RAILWAY_CODE[candidate] || candidate;
            if (upper.indexOf(String(candidate).toUpperCase()) >= 0 ||
                upper.indexOf(String(candidateCode).toUpperCase()) >= 0 ||
                normalizedRaw.indexOf(normalizeRailwayToken(candidate)) >= 0 ||
                normalizedRaw.indexOf(normalizeRailwayToken(candidateCode)) >= 0) return candidate;
        }
        return "";
    }
    function _gtfsStationFromLine(lineId, stopId, lat, lon) {
        var all = window.UNIFIED_LINES || (window.RAILWAY_DATA && window.RAILWAY_DATA.lines) || {};
        var line = all[lineId], stations = line && Array.isArray(line.stations) ? line.stations : [];
        if (!stations.length) return "";
        var raw = String(stopId || ""), shortStop = raw.split(/[.:/]/).pop();
        // GTFS stop_id spelling is not guaranteed to preserve the canonical
        // station punctuation (for example KitaSenju vs Kita-Senju). Scope the
        // comparison to this railway, then normalize separators only; do not
        // use a global station-name guess that could cross operators.
        var normalizeStop = function(value) {
            return String(value || "").replace(/[\s_-]+/g, "").toLowerCase();
        };
        var rawKey = normalizeStop(raw), shortKey = normalizeStop(shortStop);
        // 函館市電 GTFS 将 stop_id 编成 01_01/01_02；两侧站台归并到同一 canonical 停留场。
        if (/^Hakodate(?:2|5)$/.test(lineId)) {
            var hakodateStop = shortStop.match(/^(\d{2})_\d{2}$/);
            if (hakodateStop) {
                var hakodateKey = normalizeStop("Hakodate-" + hakodateStop[1]);
                for (var h = 0; h < stations.length; h++) {
                    if (normalizeStop(stations[h]) === hakodateKey) return stations[h];
                }
            }
        }
        for (var i = 0; i < stations.length; i++) {
            var stationKey = normalizeStop(stations[i]);
            if (stationKey === rawKey || stationKey === shortKey) return stations[i];
        }
        var pLat = Number(lat), pLon = Number(lon), best = "", bestD = Infinity;
        if (isFinite(pLat) && isFinite(pLon)) {
            for (var j = 0; j < stations.length; j++) {
                var c = _toeiStationLocation(stations[j]);
                if (!c || !isFinite(c.lat) || !isFinite(c.lon)) continue;
                var d = Math.pow((c.lat - pLat) * 111, 2) + Math.pow((c.lon - pLon) * 91, 2);
                if (d < bestD) { bestD = d; best = stations[j]; }
            }
        }
        return best;
    }
    function _gtfsVehicleType(operator, lineId, vehicleId, vehicleLabel, tripId) {
        var upper = (String(vehicleId || "") + " " + String(vehicleLabel || "") + " " + String(tripId || "")).toUpperCase();
        if (operator === "HakodateCity") {
            // 函館市電の GTFS-RT vehicle_id は実車号（3001/8002 など）。
            // trip_id や vehicle_label は運行・事業者情報なので、車号以外から形式を推定しない。
            var hakodateCar = String(vehicleId || "").trim();
            if (/^300[1-4]$/.test(hakodateCar)) return "函館市電3000形";
            if (/^800[1-9]$|^8010$/.test(hakodateCar)) return "函館市電8000形";
            if (hakodateCar === "8101") return "函館市電8100形";
            if (/^700[1-3]$/.test(hakodateCar)) return "函館市電7000形";
            if (/^200[1-2]$/.test(hakodateCar)) return "函館市電2000形";
            if (/^(501|530)$/.test(hakodateCar)) return "函館市電500形";
            if (/^(716|719|723)$/.test(hakodateCar)) return "函館市電710形";
            if (hakodateCar === "812") return "函館市電800形";
            if (/^960[1-5]$/.test(hakodateCar)) return "函館市電9600形";
            if (hakodateCar === "39") return "函館市電30形";
        }
        if (operator === "YokohamaMunicipal") {
            if (/3000[A-Z]?|YOKOHAMA.*3000/.test(upper)) return "横浜市営地下鉄3000形";
            if (/4000|YOKOHAMA.*4000/.test(upper)) return "横浜市営地下鉄4000形";
        }
        // 东武 GTFS-RT 只有在 vehicle_id/vehicle_label 明确携带车型族时
        // 才作实时车型证据；纯数字车号不按区间反推车型。
        if (operator === "Tobu") {
            if (/50050/.test(upper)) return "東武50050系";
            if (/70090/.test(upper)) return "東武70090型";
            if (/70000/.test(upper)) return "東武70000系";
            if (/30000/.test(upper)) return "東武30000系";
        }
        return "";
    }
    function _gtfsDirection(operator, trip) {
        var value = Number(_gtfsField(trip, 6));
        if (value !== 0 && value !== 1) return "";
        return "odpt.RailDirection:" + operator + "." + (value === 1 ? "Outbound" : "Inbound");
    }
    function _decodeGenericGtfsPositions(buffer, operator) {
        var feed = _gtfsReadMessage(new Uint8Array(buffer));
        var header = _gtfsNested(feed, 1), feedTime = Number(_gtfsField(header, 3)) || Date.now() / 1000;
        var rows = [];
        _gtfsRepeated(feed, 2).forEach(function(entityBytes) {
            var entity = _gtfsReadMessage(entityBytes), vehicle = _gtfsNested(entity, 4);
            if (!Object.keys(vehicle).length) return;
            var trip = _gtfsNested(vehicle, 1), position = _gtfsNested(vehicle, 2), desc = _gtfsNested(vehicle, 8);
            var routeId = _gtfsText(trip, 5), tripId = _gtfsText(trip, 1), stopId = _gtfsText(vehicle, 6);
            var vehicleId = _gtfsText(desc, 1), vehicleLabel = _gtfsText(desc, 2);
            var lat = _gtfsFloat(_gtfsField(position, 1)), lon = _gtfsFloat(_gtfsField(position, 2));
            var lineId = _gtfsLineIdForOperator(operator, routeId, tripId, stopId);
            if (!lineId) return;
            var station = _gtfsStationFromLine(lineId, stopId, lat, lon);
            if (!station) return;
            var code = LINE_RAILWAY_CODE[lineId] || lineId;
            var observed = Number(_gtfsField(vehicle, 5)) || feedTime;
            var id = _gtfsText(entity, 1) || tripId || vehicleId || (lineId + "-" + station);
            rows.push({
                "@id": "gtfs:" + operator + ":" + id,
                "owl:sameAs": "gtfs:" + operator + ":" + id,
                "odpt:operator": "odpt.Operator:" + operator,
                "odpt:railway": "odpt.Railway:" + operator + "." + code,
                "odpt:trainNumber": String(tripId || id),
                "gtfs:tripId": String(tripId || ""),
                "gtfs:vehicleId": String(vehicleId || ""),
                "odpt:fromStation": "odpt.Station:" + operator + "." + code + "." + station,
                "odpt:railDirection": _gtfsDirection(operator, trip),
                "odpt:trainType": "odpt.TrainType:" + operator + ".Local",
                "vehicleCarNumber": vehicleId && vehicleId !== tripId ? vehicleId : (vehicleLabel && vehicleLabel !== tripId ? vehicleLabel : ""),
                "vehicleLabel": String(vehicleLabel || ""),
                "odpt:vehicleType": _gtfsVehicleType(operator, lineId, vehicleId, vehicleLabel, tripId),
                "dc:date": _toeiGtfsIso(observed, feedTime),
                "dct:valid": _toeiGtfsIso(observed + 60, feedTime),
                "odpt:frequency": 30,
                "gtfs:latitude": lat,
                "gtfs:longitude": lon
            });
        });
        return rows;
    }
    function fetchGenericGtfsPositions(url, operator) {
        if (!url) return Promise.reject(new Error(operator + " GTFS-RT VehiclePosition endpoint unavailable"));
        return rateLimitedFetch(url, { binary: true }).then(function(buffer) {
            return _decodeGenericGtfsPositions(buffer, operator);
        });
    }
    function _decodeGenericGtfsTripUpdates(buffer, operator) {
        var feed = _gtfsReadMessage(new Uint8Array(buffer)), rows = [];
        _gtfsRepeated(feed, 2).forEach(function(entityBytes) {
            var entity = _gtfsReadMessage(entityBytes), update = _gtfsNested(entity, 3);
            if (!Object.keys(update).length) return;
            var trip = _gtfsNested(update, 1), vehicle = _gtfsNested(update, 3);
            var tripId = _gtfsText(trip, 1), routeId = _gtfsText(trip, 5);
            var stops = _gtfsOrderedStops(_gtfsRepeated(update, 2).map(_toeiTripUpdateStop));
            var lineId = _gtfsLineIdForOperator(operator, routeId, tripId, stops.length ? stops[0].stopId : "");
            if (!lineId) return;
            var code = LINE_RAILWAY_CODE[lineId] || lineId, origin = "", terminal = "";
            if (stops.length) {
                origin = _gtfsStationFromLine(lineId, stops[0].stopId, NaN, NaN);
                terminal = _gtfsStationFromLine(lineId, stops[stops.length - 1].stopId, NaN, NaN);
            }
            var delay = null;
            for (var i = 0; i < stops.length; i++) if (stops[i].delay != null) { delay = stops[i].delay; break; }
            var observed = Number(_gtfsField(update, 4)) || Date.now() / 1000;
            var entityId = _gtfsText(entity, 1) || tripId || (lineId + "-trip-update");
            var vehicleId = _gtfsText(vehicle, 1), vehicleLabel = _gtfsText(vehicle, 2);
            rows.push({
                "@id": "gtfs-trip-update:" + operator + ":" + entityId,
                "owl:sameAs": "gtfs-trip-update:" + operator + ":" + entityId,
                "odpt:operator": "odpt.Operator:" + operator,
                "odpt:railway": "odpt.Railway:" + operator + "." + code,
                "odpt:trainNumber": String(tripId || entityId),
                "gtfs:tripId": String(tripId || ""),
                "gtfs:vehicleId": String(vehicleId || ""),
                "odpt:fromStation": origin ? "odpt.Station:" + operator + "." + code + "." + origin : "",
                "odpt:toStation": terminal ? "odpt.Station:" + operator + "." + code + "." + terminal : "",
                "odpt:destinationStation": terminal ? ["odpt.Station:" + operator + "." + code + "." + terminal] : [],
                "odpt:railDirection": _gtfsDirection(operator, trip),
                "odpt:delay": delay == null ? null : Math.round(delay / 60),
                "vehicleCarNumber": vehicleId && vehicleId !== tripId ? vehicleId : (vehicleLabel && vehicleLabel !== tripId ? vehicleLabel : ""),
                "vehicleLabel": String(vehicleLabel || ""),
                "gtfs:tripUpdateTimestamp": _toeiGtfsIso(observed),
                "gtfs:tripUpdateValidUntil": _toeiGtfsIso(observed + 60)
            });
        });
        return rows;
    }
    function fetchGenericGtfsTripUpdates(url, operator) {
        if (!url) return Promise.reject(new Error(operator + " GTFS-RT TripUpdate endpoint unavailable"));
        return rateLimitedFetch(url, { binary: true }).then(function(buffer) {
            return _decodeGenericGtfsTripUpdates(buffer, operator);
        });
    }

    function _gtfsRepeated(fields, no) {
        var value = fields && fields[no];
        if (value == null) return [];
        return Array.isArray(value) ? value : [value];
    }
    function _gtfsTranslatedString(fields, no) {
        var result = {}, rows = _gtfsRepeated(fields, no);
        rows.forEach(function(bytes) {
            var translation = _gtfsReadMessage(bytes);
            var text = _gtfsText(translation, 1), language = _gtfsText(translation, 2) || "ja";
            if (text) result[language] = text;
        });
        return result;
    }
    function _gtfsAlertCause(value) {
        return ({
            1: "原因不明", 2: "その他の原因", 3: "設備故障", 4: "ストライキ",
            5: "デモ", 6: "事故", 7: "休日", 8: "天候",
            9: "保守", 10: "工事", 11: "警察活動", 12: "医療緊急事態"
        })[Number(value)] || (Number(value) ? "GTFS原因" + Number(value) : "");
    }
    function _gtfsAlertEffect(value) {
        return ({
            1: "No Service", 2: "Reduced Service", 3: "Significant Delays",
            4: "Detour", 5: "Additional Service", 6: "Modified Service",
            7: "Other Effect", 8: "Unknown Effect", 9: "Stop Moved"
        })[Number(value)] || "";
    }
    function _gtfsAlertText(header, description) {
        var result = {}, languages = Object.create(null);
        Object.keys(header || {}).concat(Object.keys(description || {})).forEach(function(language) {
            languages[language] = true;
        });
        Object.keys(languages).forEach(function(language) {
            var parts = [];
            if (header && header[language]) parts.push(header[language]);
            if (description && description[language] && description[language] !== header[language]) parts.push(description[language]);
            if (parts.length) result[language] = parts.join(" ");
        });
        return result;
    }
    function _toeiAlertSelectors(alert) {
        var selectors = [];
        _gtfsRepeated(alert, 5).forEach(function(bytes) {
            var selector = _gtfsReadMessage(bytes), trip = _gtfsNested(selector, 4);
            selectors.push({
                routeId: _gtfsText(selector, 2),
                tripId: _gtfsText(trip, 1),
                stopId: _gtfsText(selector, 5)
            });
        });
        return selectors;
    }
    function _toeiAlertPeriods(alert) {
        return _gtfsRepeated(alert, 1).map(function(bytes) {
            var period = _gtfsReadMessage(bytes);
            return {
                start: Number(_gtfsField(period, 1)) || 0,
                end: Number(_gtfsField(period, 2)) || 0
            };
        });
    }
    function _toeiAlertValidPeriod(periods) {
        var now = Date.now() / 1000, valid = periods.filter(function(period) {
            return (!period.end || period.end >= now - 300) && (!period.start || period.start <= now + 300);
        });
        return valid[0] || periods[0] || { start: 0, end: 0 };
    }
    function _tokyoMetroGtfsLineId(routeId, tripId, stopId) {
        var raw = [routeId, tripId, stopId].map(function(v) { return String(v || ""); }).join(" ");
        var upper = raw.toUpperCase();
        if (/MARUNOUCHI.*(?:BRANCH|BRANCHLINE)|(^|[^A-Z])MB([^A-Z]|$)/.test(upper)) return "MarunouchiBranch";
        var named = [
            ["GINZA", "Ginza"], ["MARUNOUCHI", "Marunouchi"], ["TOZAI", "Tozai"],
            ["HIBIYA", "Hibiya"], ["CHIYODA", "Chiyoda"], ["YURAKUCHO", "Yurakucho"],
            ["HANZOMON", "Hanzomon"], ["NAMBOKU", "Namboku"], ["FUKUTOSHIN", "Fukutoshin"]
        ];
        for (var ni = 0; ni < named.length; ni++) {
            if (upper.indexOf(named[ni][0]) >= 0) return named[ni][1];
        }
        var symbols = {
            G: "Ginza", M: "Marunouchi", T: "Tozai", H: "Hibiya", C: "Chiyoda",
            Y: "Yurakucho", Z: "Hanzomon", N: "Namboku", F: "Fukutoshin"
        };
        for (var symbol in symbols) {
            if (new RegExp("(^|[^A-Z])" + symbol + "([^A-Z]|$)").test(upper)) return symbols[symbol];
        }
        return "";
    }
    function _twrGtfsLineId(routeId, tripId, stopId) {
        var raw = [routeId, tripId, stopId].map(function(v) { return String(v || ""); }).join(" ");
        return /RINKAI|臨海|(^|[^A-Z])R([^A-Z]|$)/i.test(raw) ? "Rinkai" : "";
    }
    function _mirGtfsLineId(routeId, tripId, stopId) {
        var raw = [routeId, tripId, stopId].map(function(v) { return String(v || ""); }).join(" ");
        return /TSUKUBA|つくば|MIR|(^|[^A-Z])TX([^A-Z]|$)/i.test(raw) ? "TsukubaExpress" : "";
    }
    function _decodeGtfsAlerts(buffer, operator) {
        var feed = _gtfsReadMessage(new Uint8Array(buffer)), entities = _gtfsRepeated(feed, 2), rows = [];
        entities.forEach(function(entityBytes) {
            var entity = _gtfsReadMessage(entityBytes), alert = _gtfsNested(entity, 5);
            if (!Object.keys(alert).length) return;
            var entityId = _gtfsText(entity, 1), periods = _toeiAlertPeriods(alert), now = Date.now() / 1000;
            if (periods.length && !periods.some(function(p) {
                return (!p.start || p.start <= now + 300) && (!p.end || p.end >= now - 300);
            })) return;
            var period = _toeiAlertValidPeriod(periods), header = _gtfsTranslatedString(alert, 10);
            var description = _gtfsTranslatedString(alert, 11), text = _gtfsAlertText(header, description);
            var cause = _gtfsAlertCause(_gtfsField(alert, 6)), effect = _gtfsAlertEffect(_gtfsField(alert, 7));
            var status = Number(_gtfsField(alert, 7)) === 1 ? "Suspension" :
                (Number(_gtfsField(alert, 7)) === 2 || Number(_gtfsField(alert, 7)) === 3 ? "Delay" : "");
            var urlMap = _gtfsTranslatedString(alert, 8), url = urlMap.ja || urlMap.en || Object.keys(urlMap).map(function(k) { return urlMap[k]; })[0] || "";
            var selectors = _toeiAlertSelectors(alert);
            if (!selectors.length) selectors = [{ routeId: "", tripId: "", stopId: "" }];
            selectors.forEach(function(selector, selectorIndex) {
                var lineId = operator === "Toei"
                    ? _toeiGtfsLineId(selector.routeId, selector.tripId, selector.stopId)
                    : operator === "TWR"
                        ? _twrGtfsLineId(selector.routeId, selector.tripId, selector.stopId)
                        : operator === "MIR"
                            ? _mirGtfsLineId(selector.routeId, selector.tripId, selector.stopId)
                            : operator === "TokyoMetro"
                                ? _tokyoMetroGtfsLineId(selector.routeId, selector.tripId, selector.stopId)
                                : _gtfsLineIdForOperator(operator, selector.routeId, selector.tripId, selector.stopId);
                var code = lineId === "Nippori_Toneri" ? "NipporiToneri" : lineId;
                var id = "gtfs-alert:" + operator + ":" + entityId + ":" + selectorIndex;
                rows.push({
                    "@id": id,
                    "owl:sameAs": id,
                    "odpt:operator": "odpt.Operator:" + operator,
                    "odpt:railway": code ? "odpt.Railway:" + operator + "." + code : "",
                    "pt:messageKind": "realtime",
                    "odpt:trainInformationStatus": status,
                    "odpt:trainInformationText": text,
                    "odpt:trainInformationCause": cause,
                    "gtfs:causeCode": Number(_gtfsField(alert, 6)) || null,
                    "odpt:trainInformationEffect": effect,
                    "odpt:trainInformationUrl": url,
                    "odpt:trainInformationRange": periods,
                    "odpt:stationFrom": selector.stopId || "",
                    "gtfs:cause": cause,
                    "gtfs:effect": effect,
                    "dc:date": period.start ? _toeiGtfsIso(period.start) : new Date().toISOString(),
                    "dct:valid": period.end ? _toeiGtfsIso(period.end) : ""
                });
            });
        });
        return rows;
    }
    function _decodeToeiGtfsAlerts(buffer) {
        return _decodeGtfsAlerts(buffer, "Toei");
    }
    function _decodeTokyoMetroGtfsAlerts(buffer) {
        return _decodeGtfsAlerts(buffer, "TokyoMetro");
    }
    function _decodeTwrGtfsAlerts(buffer) {
        return _decodeGtfsAlerts(buffer, "TWR");
    }
    function _decodeMirGtfsAlerts(buffer) {
        return _decodeGtfsAlerts(buffer, "MIR");
    }
    function fetchToeiGtfsAlerts(url) {
        if (!url) return Promise.reject(new Error("Toei GTFS-RT alert endpoint unavailable"));
        return rateLimitedFetch(url, { binary: true }).then(_decodeToeiGtfsAlerts);
    }
    function fetchTokyoMetroGtfsAlerts(url) {
        if (!url) return Promise.reject(new Error("Tokyo Metro GTFS-RT alert endpoint unavailable"));
        return rateLimitedFetch(url, { binary: true }).then(_decodeTokyoMetroGtfsAlerts);
    }
    function fetchTwrGtfsAlerts(url) {
        if (!url) return Promise.reject(new Error("TWR GTFS-RT alert endpoint unavailable"));
        return rateLimitedFetch(url, { binary: true }).then(_decodeTwrGtfsAlerts);
    }
    function fetchMirGtfsAlerts(url) {
        if (!url) return Promise.reject(new Error("MIR GTFS-RT alert endpoint unavailable"));
        return rateLimitedFetch(url, { binary: true }).then(_decodeMirGtfsAlerts);
    }
    function fetchGenericGtfsAlerts(url, operator) {
        if (!url) return Promise.reject(new Error(operator + " GTFS-RT alert endpoint unavailable"));
        return rateLimitedFetch(url, { binary: true }).then(function(buffer) {
            return _decodeGtfsAlerts(buffer, operator);
        });
    }

    function fetchODPT(url) {
        if (!url) return Promise.reject(new Error('ODPT endpoint unavailable'));
        if (_requestInflight[url]) { _requestMetrics.joined++; return _requestInflight[url]; }
        var live = /odpt:Train(?:Information)?\?/.test(url);
        var cfg = window.RuntimeConfig || {};
        var interval = (/odpt:TrainInformation\?/.test(url) && cfg.ODPT_INFORMATION_INTERVAL) || cfg.ODPT_REALTIME_INTERVAL || 30000;
        var windowId = Math.floor(Date.now() / interval), prior = _liveResponses[url];
        if (live && prior && prior.windowId === windowId) {
            _requestMetrics.cacheHits++;
            return Promise.resolve(prior.data);
        }
        _requestMetrics.started++;
        _requestInflight[url] = rateLimitedFetch(url).then(function(data) {
            if (!Array.isArray(data) && !(data && Array.isArray(data.value))) throw new Error('Invalid ODPT collection');
            if (live) {
                var rows = _retainNewerRows(prior && extractData(prior.data), extractData(data));
                data = Array.isArray(data) ? rows : Object.assign({}, data, { value: rows });
                _liveResponses[url] = { windowId: windowId, data: data };
            }
            return data;
        }).catch(function(error) {
            _requestMetrics.failed++;
            throw error; // Network failure must never become a confirmed empty timetable.
        }).finally(function() { delete _requestInflight[url]; });
        return _requestInflight[url];
    }

    function extractData(result) {
        if (!result) return [];
        return result.value || (Array.isArray(result) ? result : []);
    }

    // 现有 ODPT 客户端也拥有可选的服务端 TrainRun 缓存。
    // 这是读穿优化，不是第二个时刻表权威来源。
    var TRAIN_RUN_CACHE_ENDPOINT = "https://pnupwfmgbtxqhpzsrhfn.supabase.co/functions/v1/train-runs";
    var _trainRunCache = {};
    var _trainRunInflight = {};
    var _trainRunLastWarning = {};
    var _trainRunLastStatus = Object.create(null);
    function getTrainRunStatus(lineId) {
        return _trainRunLastStatus[lineId] || null;
    }
    function _serviceDateJst() {
        var now = new Date();
        var parts = new Intl.DateTimeFormat("en-CA", {
            timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", hourCycle:"h23"
        }).formatToParts(now), p={};
        parts.forEach(function(x){ if(x.type!=="literal") p[x.type]=x.value; });
        var y=Number(p.year), m=Number(p.month), d=Number(p.day);
        if(Number(p.hour)<4) {
            var prev=new Date(Date.UTC(y,m-1,d)-86400000);
            return prev.toISOString().slice(0,10);
        }
        return p.year+"-"+p.month+"-"+p.day;
    }
    function _dbStopClock(value, minute) {
        if (Number.isFinite(Number(minute)) && minute !== null && minute !== undefined && Number(minute) >= 1440) {
            var n = Number(minute);
            return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
        }
        return value ? String(value).slice(0, 5) : null;
    }
    function _dbDestinationStation(run) {
        if (!run) return "";
        var candidates = [run.destination_station, run.destination_station_urn,
            run.destination, run.terminal_station, run.destinationStation,
            run.terminalStation];
        for (var i = 0; i < candidates.length; i++) {
            var value = candidates[i];
            if (Array.isArray(value)) value = value[0] || "";
            if (value && typeof value === "object") {
                value = value.station_urn || value.station_key || value.urn ||
                    value.id || value["@id"] || "";
            }
            if (value != null && String(value).trim()) return String(value);
        }
        return "";
    }
    // 计划车次由已公布的服务事实识别，而不是 SQL 行 ID
    // 或 stop_sequence。将其保留在现有时刻表适配器中，使
    // SQL 列车和 ODPT 列车遵循相同的下游运行链逻辑。
    function _plannedTrainRunIdentity(run) {
        var stops = Array.isArray(run && run.stops) ? run.stops : [];
        if (stops.length < 2) return "";
        var first = stops[0] || {}, last = stops[stops.length - 1] || {};
        var origin = String(first.station_urn || first.station_key || "");
        var lastStation = String(last.station_urn || last.station_key || "");
        var terminal = _dbDestinationStation(run) || lastStation;
        var number = String(run.train_number || "").trim();
        var serviceDate = String(run.service_date || "").slice(0, 10);
        var firstClock = "";
        for (var i = 0; i < stops.length; i++) {
            var s = stops[i] || {};
            var clock = s.departure_time || s.arrival_time;
            var minute = s.departure_time ? s.departure_minute : s.arrival_minute;
            if (clock || minute != null) {
                firstClock = _dbStopClock(clock, minute);
                if (firstClock) break;
            }
        }
        if (!serviceDate || !number || !origin || !lastStation || !firstClock) return "";
        return "planned-trip:" + [
            serviceDate, run.operator || "", run.network_key || "", run.line_id || "",
            number, run.rail_direction || "", origin, firstClock, terminal, lastStation
        ].map(function(v) { return encodeURIComponent(String(v)); }).join("|");
    }
    function _trainRunToTimetable(run) {
        // 在 SQL/API 中保留取消计划及其已公布停站，但绝不
        // 将已确认的指定日期取消计划变成正在运行的列车。
        if (run && run.operation_status === "cancelled") return null;
        var scheduledId = _plannedTrainRunIdentity(run);
        if (!scheduledId) return null;
        var destinationStation = typeof _dbDestinationStation === "function" ? _dbDestinationStation(run) : "";
        // 只有经过验证、行程相同/连续的分组才共享跨线路
        // 运行 ID。单来源车次保留其服务事实身份。
        var hasSharedCanonicalTrip = run.canonical_timetable_id &&
            (run.canonical_group_evidence==="verified_continuation" ||
             run.canonical_group_evidence==="verified_shared_itinerary");
        return {
            "@id":hasSharedCanonicalTrip
                ? ("canonical-sql-trip:" + run.service_date + ":" + run.canonical_timetable_id)
                : scheduledId,
            "odpt:trainNumber":run.train_number||"",
            "odpt:railway":run.network_key && String(run.network_key).indexOf("odpt.Railway:")===0 ? run.network_key : "odpt.Railway:" + String(run.operator||LINE_TO_OPERATOR[run.line_id]||"") + "." + String(run.network_key||LINE_RAILWAY_CODE[run.line_id]||run.line_id||""),
            "odpt:calendar":({
                weekday:"odpt.Calendar:Weekday",
                saturday:"odpt.Calendar:Saturday",
                sunday:"odpt.Calendar:Sunday",
                holiday:"odpt.Calendar:Holiday",
                saturday_holiday:"odpt.Calendar:SaturdayHoliday"
            })[run.calendar_type] || "",
            "_operationCode":run.operation_code||"",
            "_operationMatch":run.operation_match||null,
            "_planRevision":run.plan_revision||null,
            "_serviceDate":run.service_date||"",
            "_sqlLineId":run.line_id||"",
            "trainOwner":run.operation_owner||"",
            "_scheduledTrainOwnerSource":run.operation_owner_source_url||"",
            // 将来源提供的实体直通链接作为证据保留，
            // 没有边界/时间核验时，不将其视为共用车辆的证明。
            "_sourceTripId":run.source_trip_id ||
                (typeof run.id === "string" && run.id.indexOf("manual-template:") !== 0 ? run.id : ""),
            "_previousTimetableIds":Array.isArray(run.previous_timetable_ids)?run.previous_timetable_ids:[],
            "_nextTimetableIds":Array.isArray(run.next_timetable_ids)?run.next_timetable_ids:[],
            "_timetableProvenance":run.timetable_provenance||"",
            "_planSource":run.plan_source || "sql-planned",
            "_operationReferences":Array.isArray(run.operation_references)?run.operation_references:[],
            "_planRevision":run.plan_revision||null,
            "_serviceId":run.service_id || "",
            "_plannedTripId":run.trip_id || "",
            "_sourceRevisionDate":run.source_revision_date||null,
            // 结构性时刻表完整不等于当前运行有效。
            "_timetableValidity":run.timetable_validity||"undated_not_current_verified",
            "_timetableDateVerified":run.timetable_date_verified===true,
            "_canonicalTrainTimetableId":run.canonical_timetable_id||null,
            "_canonicalGroupEvidence":run.canonical_group_evidence||"source_only",
            "_sqlVehicleMappingLevel":run.vehicle_mapping_level||"unresolved",
            "_sqlVehicleCandidateLabel":run.vehicle_type_candidates||"",
            "_sqlCandidateArtworkPath":run.vehicle_candidate_artwork_path||null,
            "_sqlCandidateArtworkStatus":run.vehicle_candidate_artwork_status||null,
            "_vehicleEvidenceSource":run.vehicle_evidence_source||null,
            "_vehicleEvidence":run.vehicle_evidence_url||null,
            "_sqlVehicleArtworkPath":run.vehicle_artwork_path||null,
            "odpt:railDirection":run.rail_direction||"",
            "odpt:trainType":run.train_type||"",
            "odpt:destinationStation":destinationStation ? [destinationStation] : [],
            "odpt:trainTimetableObject":(run.stops||[]).map(function(s){
                var o={};
                if(s.arrival_time) o["odpt:arrivalTime"]=_dbStopClock(s.arrival_time, s.arrival_minute);
                if(s.departure_time) o["odpt:departureTime"]=_dbStopClock(s.departure_time, s.departure_minute);
                if(s.station_urn) {
                    if(s.arrival_time) o["odpt:arrivalStation"]=s.station_urn;
                    if(s.departure_time || !s.arrival_time) o["odpt:departureStation"]=s.station_urn;
                }
                return o;
            }),
            // 车型候选不等于已经核实的出版计划车型：即使候选只有一种，
            // 也不将 source_single_type_candidate 升级为确定的 vehicleType。
            // 候选列表和证据等级仍保留在 _sqlVehicleCandidateLabel / _sqlVehicleMappingLevel。
            vehicleType:(run.vehicle_mapping_level==="dated_schedule_rule" ||
                run.vehicle_mapping_level==="dated_operation_owner" ||
                run.vehicle_mapping_level==="verified_scheduled_boundary")
                ? (run.vehicle_type_label || null) : null,
            _positionSource:"supabase-train-run"
        };
    }
    // One timetable identity: this boundary is shared by the offline adapter replay and runtime cache merge.
    // ODPT 池合并和 DataFusion 惰性加载共用一个时刻表身份。
    // 公共车次可能在多个日历、方向或车次中重复出现。
    // 不得把不完整记录视为另一条计划运行的重复项。
    function getTimetableIdentity(tt) {
        if (!tt) return "";
        var railway = String(tt['odpt:railway'] || "");
        var calendar = String(tt['odpt:calendar'] || "");
        var sourceId = tt['owl:sameAs'] || tt['@id'];
        if (sourceId) return ["source", railway, calendar, String(sourceId)].join("|");
        var number = String(tt['odpt:trainNumber'] || "");
        var stops = tt['odpt:trainTimetableObject'];
        if (!railway || !calendar || !number || !Array.isArray(stops) || stops.length < 2) return "";
        var first = stops[0] || {}, last = stops[stops.length - 1] || {};
        var origin = first['odpt:departureStation'] || first['odpt:arrivalStation'];
        var departure = first['odpt:departureTime'] || first['odpt:arrivalTime'];
        var terminus = last['odpt:arrivalStation'] || last['odpt:departureStation'];
        var arrival = last['odpt:arrivalTime'] || last['odpt:departureTime'];
        if (!origin || !departure || !terminus || !arrival) return "";
        return ["trip", railway, calendar, number, tt['odpt:railDirection'] || "",
            origin, departure, terminus, arrival, stops.length].join("|");
    }

    // 这是线路能力，不是运营商范围的 Train 可用性或实时记录数量。
    function hasRealtimePositionApi(lineId) {
        var op = LINE_TO_OPERATOR[lineId];
        if (!op || !ODPT_ENDPOINTS[op] || !(ODPT_ENDPOINTS[op].train || ODPT_ENDPOINTS[op].gtfsVehicle) ||
            !getLineRailwayIdentity(lineId)) return false;
        var cfg = window.RuntimeConfig || {};
        var jrEastScope = cfg.JR_EAST_TRAIN_LOCATION_SCOPE;
        if (op === "JR-East" && jrEastScope && Array.isArray(jrEastScope.excludes) &&
            jrEastScope.excludes.indexOf(lineId) >= 0) return false;
        if (cfg.REALTIME_POSITION_API_LINES && cfg.REALTIME_POSITION_API_LINES[lineId] === true) return true;
        if (op === "YokohamaMunicipal" && ODPT_ENDPOINTS[op].gtfsVehicle) return true;
        var policy = cfg.REALTIME_POSITION_POLICY && cfg.REALTIME_POSITION_POLICY.lines &&
            cfg.REALTIME_POSITION_POLICY.lines[lineId];
        return !!(policy && policy.mode === "FULL");
    }
    function getRealtimeCapabilities(lineIdOrOperator) {
        var lineId = LINE_TO_OPERATOR[lineIdOrOperator] ? lineIdOrOperator : "";
        var operator = lineId ? LINE_TO_OPERATOR[lineId] : String(lineIdOrOperator || "");
        var ep = ODPT_ENDPOINTS[operator] || {};
        var position = lineId ? hasRealtimePositionApi(lineId) : !!(ep.train || ep.gtfsVehicle);
        var tripUpdate = !!(ep.tripUpdate || ep.gtfsTripUpdate);
        var alert = !!(ep.alert || ep.gtfsAlert);
        var status = !!ep.trainInformation;
        var planned = !!ep.trainTimetable || !!lineId;
        var parts = [];
        if (position) parts.push("position");
        if (tripUpdate) parts.push("trip-update");
        if (alert) parts.push("alert");
        if (!parts.length && planned) parts.push("planned");
        return {
            lineId: lineId || null,
            operator: operator || null,
            position: position,
            tripUpdate: tripUpdate,
            alert: alert,
            trainInformation: status,
            planned: planned,
            mode: parts.length ? parts.join("+") : "none"
        };
    }
    function usesSqlTimetable(lineId) {
        // 时刻表是计划，与实时位置覆盖独立。
        // 服务端核验 canonical 身份、来源和服务日历。
        return typeof lineId === "string" && lineId.length > 0;
    }
    function getCachedTrainRuns(lineId) {
        // 实时位置覆盖与时刻表可用性相互独立。
        // 每条线路都可以读取已公布计划，不依赖实时观测。
        if (!usesSqlTimetable(lineId)) return Promise.resolve([]);
        var serviceDate=_serviceDateJst(), key=lineId+"|"+serviceDate, hit=_trainRunCache[key];
        Object.keys(_trainRunCache).forEach(function(k) {
            if (k.slice(k.lastIndexOf('|') + 1) !== serviceDate) delete _trainRunCache[k];
        });
        if(hit && Date.now()-hit.at<600000) return Promise.resolve(hit.rows);
        if(_trainRunInflight[key]) return _trainRunInflight[key];
        var url=TRAIN_RUN_CACHE_ENDPOINT+"?line_id="+encodeURIComponent(lineId)+"&service_date="+encodeURIComponent(serviceDate);
        var controller = new AbortController();
        var timeout = setTimeout(function() { controller.abort(); }, 8000);
        _trainRunInflight[key]=fetch(url,{credentials:"omit",signal:controller.signal}).then(function(r){
            if(!r.ok) throw new Error("TrainRun cache HTTP "+r.status);
            return r.json();
        }).then(function(body){
            if (!body || body.ok !== true) {
                throw new Error("TrainRun source rejected: " + (body && body.error || "invalid-response"));
            }
            if (_serviceDateJst() !== serviceDate) throw new Error('TrainRun service date expired in flight');
            if (body.line_id !== lineId || body.service_date !== serviceDate || !Array.isArray(body.runs)) {
                throw new Error('TrainRun response identity mismatch');
            }
            if (body.runs.some(function(run) {
                return !run || run.line_id !== lineId || run.service_date !== serviceDate;
            })) throw new Error('TrainRun row identity mismatch');
            _trainRunLastStatus[lineId] = {
                serviceDate: serviceDate, source: body.source || "",
                complete: body.complete === true, partial: body.partial === true,
                calendarStatus: body.calendar_status || "",
                sourceCoverage: body.source_coverage || "",
                selectedCalendar: body.selected_calendar || "",
                dateVerifiedRuns: Number(body.date_verified_runs) || 0,
                dateUnverifiedRuns: Number(body.date_unverified_runs) || 0,
                omittedIncompleteRuns: Number(body.omitted_incomplete_runs) || 0,
                suppressedStationOnlyFragments: Number(body.suppressed_station_only_source_fragments) || 0,
                suppressedClockReversalRuns: Number(body.suppressed_non_midnight_clock_reversal_runs) || 0,
                auditCoverageStatus: body.audit_coverage_status || "unverified",
                runs: Array.isArray(body.runs) ? body.runs.length : 0,
                updatedAt: Date.now()
            };
            if (body.source === "CALENDAR_NOT_VERIFIED" &&
                Date.now() - (_trainRunLastWarning[key] || 0) > 60000) {
                _trainRunLastWarning[key] = Date.now();
                console.warn("[ODPT] Planned service calendar is not verified:", lineId, serviceDate);
            }
            // 即使覆盖/日历
            // 尚未完全核验，已公布时刻表仍然有用。浏览器此处读取的是计划，
            // 类似纸质时刻表；完整性是查看器元数据，
            // 不是隐藏所有已公布车次的理由。车型身份和
            // 当前运行状态在下游仍是独立证据通道。
            var usable=body&&Array.isArray(body.runs)&&body.runs.length>0;
            var rows=usable?body.runs.filter(function(run){
                return run&&Array.isArray(run.stops)&&run.stops.length>=2;
            }).map(function(run){
                var tt=_trainRunToTimetable(run);
                if (!tt) return null;
                if(body.complete!==true) {
                    tt._timetableCoverage=body.partial===true ? "partial" : "unverified";
                    tt._omittedIncompleteRuns=Number(body.omitted_incomplete_runs)||0;
                }
                return tt;
            }).filter(Boolean):[];
            _trainRunCache[key]={at:Date.now(),rows:rows};
            return rows;
        }).catch(function(err){
            if (_serviceDateJst() !== serviceDate) return [];
            _trainRunLastStatus[lineId] = {
                serviceDate: serviceDate, source: "SOURCE_ERROR", complete: false,
                partial: false, calendarStatus: "unknown", runs: 0,
                error: String(err && err.message || err), updatedAt: Date.now()
            };
            // 保留用户可见回退，但不要把失败的 SQL
            // 请求伪装成已确认无服务时刻表。限制诊断频率。
            var now=Date.now();
            if(now-(_trainRunLastWarning[key]||0)>60000){
                _trainRunLastWarning[key]=now;
                console.warn("[ODPT] SQL timetable request failed:",lineId,serviceDate,err&&err.message);
            }
            return [];
        }).finally(function(){ clearTimeout(timeout); delete _trainRunInflight[key]; });
        return _trainRunInflight[key];
    }

    // 运营商由列车详情视图激活。在此维护集合
    // 让惰性页面只轮询用户实际请求的数据。
    var _activeRealtimeOperators = {};
    var _activeRealtimeLineIds = {};
    var _activatedRealtimeLines = {};
    var _realtimeActivationInflight = {};

    // Keep the complete operator snapshot for cache/persistence, but expose a
    // line-scoped view to DataFusion when a detail page has an active selection.
    // GTFS-RT endpoints are operator-wide and cannot be queried by railway.
    function _rebuildRealtimePositionViews() {
        var full = window.ODPT_TRAIN_POSITIONS || {};
        var views = {};
        Object.keys(full).forEach(function(op) {
            var allowed = _activeRealtimeLineIds[op] || [];
            var rows = Array.isArray(full[op]) ? full[op] : [];
            if (!allowed.length) {
                views[op] = rows;
                return;
            }
            views[op] = rows.filter(function(row) {
                var railway = parseRailwayIdentity(row && row["odpt:railway"]);
                // Unknown railway identity remains available for non-GTFS
                // providers whose canonical station resolver can still place it.
                if (!railway) return op !== "Toei";
                return allowed.some(function(lineId) {
                    var target = getLineRailwayIdentity(lineId);
                    return target && target.key === railway.key;
                });
            });
        });
        window.ODPT_TRAIN_POSITION_VIEWS = views;
        return views;
    }

    // ========== 公共 API ==========
    window.ODPTClient = {
        getRequestMetrics: function() { return Object.assign({}, _requestMetrics); },
        ENDPOINTS: ODPT_ENDPOINTS,
        LINE_TO_OPERATOR: LINE_TO_OPERATOR,
        LINE_RAILWAY_CODE: LINE_RAILWAY_CODE,
        JR_EAST_TRAIN_LOCATION_SCOPE:
            (window.RuntimeConfig && window.RuntimeConfig.JR_EAST_TRAIN_LOCATION_SCOPE) || null,
        makeRailwayIdentity: makeRailwayIdentity,
        parseRailwayIdentity: parseRailwayIdentity,
        getLineRailwayIdentity: getLineRailwayIdentity,
        getApiKey: getApiKey,
        getApiLinks: getApiLinks,
        keysConfigured: keysConfigured,
        validateAuthoritativeRealtimeConfig: validateAuthoritativeRealtimeConfig,
        getRealtimeCapabilities: getRealtimeCapabilities,
        getCachedTrainRuns: getCachedTrainRuns,
        getTrainRunStatus: getTrainRunStatus,
        hasRealtimePositionApi: hasRealtimePositionApi,
        usesSqlTimetable: usesSqlTimetable,
        getTimetableIdentity: getTimetableIdentity,

        clearRealtimeLines: function() {
            Object.keys(_activeRealtimeOperators).forEach(function(op) { delete _activeRealtimeOperators[op]; });
            _activeRealtimeLineIds = {};
            delete window.ODPT_TRAIN_POSITION_VIEWS;
        },

        activateRealtimeLines: function(lineIds) {
            lineIds = Array.isArray(lineIds) ? lineIds : [lineIds];
            var self = this;
            var timetablePromises = [];
            var newlyActivatedOps = {};
            var requestedOps = {};
            var requestedLineIds = {};
            var activationDate = _serviceDateJst();
            lineIds.forEach(function(lineId) {
                var requestedOp = LINE_TO_OPERATOR[lineId];
                if (requestedOp && hasRealtimePositionApi(lineId)) {
                    requestedOps[requestedOp] = true;
                    if (!requestedLineIds[requestedOp]) requestedLineIds[requestedOp] = [];
                    if (requestedLineIds[requestedOp].indexOf(lineId) < 0) requestedLineIds[requestedOp].push(lineId);
                }
            });
            // 此 API 表示当前详情范围，不是只追加的历史集合。
            // 只轮询当前打开线路/系统所需的运营商。
            Object.keys(_activeRealtimeOperators).forEach(function(op) {
                if (!requestedOps[op]) delete _activeRealtimeOperators[op];
            });
            _activeRealtimeLineIds = requestedLineIds;
            _rebuildRealtimePositionViews();

            lineIds.forEach(function(lineId) {
                var op = LINE_TO_OPERATOR[lineId];
                var identity = getLineRailwayIdentity(lineId);
                if (!op || !identity) return;

                if (hasRealtimePositionApi(lineId) && !_activeRealtimeOperators[op]) {
                    _activeRealtimeOperators[op] = true;
                    newlyActivatedOps[op] = true;
                }

                // 当前页面生命周期中已激活的线路，其时刻表已经位于
                // ODPT_TIMETABLES/_timetableCache 中。不要重复合并。
                if (_activatedRealtimeLines[lineId] === _serviceDateJst()) return;
                if (_realtimeActivationInflight[lineId]) {
                    timetablePromises.push(_realtimeActivationInflight[lineId]);
                    return;
                }
                // 只有一个服务日计划来源；实时位置保持独立。
                var sourcePromise = getCachedTrainRuns(lineId);
                _realtimeActivationInflight[lineId] = sourcePromise.then(function(rows) {
                    if (!rows || !rows.length) return;
                    if (!window.ODPT_TIMETABLES) window.ODPT_TIMETABLES = {};
                    var existing = window.ODPT_TIMETABLES[op] || [];
                    var keep = existing.filter(function(tt) {
                        var actual = parseRailwayIdentity(tt);
                        return !(actual && actual.key === identity.key);
                    });
                    window.ODPT_TIMETABLES[op] = keep.concat(rows);
                    _activatedRealtimeLines[lineId] = rows[0]._serviceDate || activationDate;
                }).catch(function(e) {
                    console.debug("[ODPT] on-demand timetable unavailable:", lineId, e && e.message);
                }).finally(function() {
                    delete _realtimeActivationInflight[lineId];
                });
                timetablePromises.push(_realtimeActivationInflight[lineId]);
            });

            // 打开已激活运营商的另一条线路不得触发
            // 另一次运营商范围 Train 获取；30 秒轮询已负责刷新。
            var newOps = Object.keys(newlyActivatedOps);
            if (!newOps.length && window.DataFusion && window.DataFusion.loadTrainPositions) {
                window.DataFusion.loadTrainPositions._calibrated = false;
                window.DataFusion.loadTrainPositions();
            }
            return Promise.all([
                Promise.all(timetablePromises),
                newOps.length ? loadRealtimeData(false, newOps, true) : Promise.resolve()
            ]);
        },

        // 获取运行情报/延误信息
        getTrainInformation: function(operator) {
            return fetchODPT(buildUrl(operator, 'trainInformation')).then(extractData);
        },

        // 获取列车实时位置。这里故意只按 operator 拉取，不按预设 railway code 过滤：
        // API 实际返回 identity 是事实源；LINE_RAILWAY_CODE 只能用于查询优化/本地映射。
        getTrainPositions: function(operator) {
            return fetchODPT(buildUrl(operator, 'train')).then(extractData);
        },

        assessRealtimeFullCandidate: function(lineId, history) {
            var samples = Array.isArray(history) ? history : [];
            var usable = samples.filter(function(s) { return s && s.lineId === lineId && s.ok && s.matchedCount > 0; });
            var minSamples = 3;
            var reasons = [];
            if (usable.length < minSamples) reasons.push("insufficient-samples");
            usable.forEach(function(s) {
                if (s.locationCoverage !== 1) reasons.push("incomplete-location-fields");
                if (s.trainNumberCoverage !== 1) reasons.push("incomplete-train-number-fields");
                if (Object.keys(s.directionCounts || {}).length < 2) reasons.push("direction-coverage-unproven");
            });
            reasons = reasons.filter(function(v, i, a) { return a.indexOf(v) === i; });
            return {
                lineId: lineId,
                sampleCount: usable.length,
                candidate: usable.length >= minSamples && reasons.length === 0,
                reasons: reasons,
                minSamples: minSamples
            };
        },

        // 盲查/诊断：枚举 operator 实际返回的 railway identity，并与本地预设反向比较。
        // 不改变生产映射，不猜别名；用于发现“API 有数据但预设 code 错/缺”的情况。
        // Inspect one requested line against the operator-wide realtime snapshot.
        // This never guesses by station overlap: only the exact ODPT railway identity
        // admitted for the line is counted. It is intentionally diagnostic while the
        // line remains HYBRID; promote to FULL only after observed coverage is proven.
        auditRealtimeLine: function(lineId, rows) {
            var expected = getLineRailwayIdentity(lineId);
            var operator = LINE_TO_OPERATOR[lineId] || "";
            var data = Array.isArray(rows) ? rows :
                ((window.ODPT_TRAIN_POSITIONS && window.ODPT_TRAIN_POSITIONS[operator]) || []);
            if (!expected) return { lineId: lineId, ok: false, reason: "missing-line-identity", rowCount: 0, matchedRows: [] };
            var matched = data.filter(function(t) {
                var actual = parseRailwayIdentity(t);
                return !!(actual && actual.key === expected.key);
            });
            var directionCounts = {};
            var locatedCount = 0;
            var numberedCount = 0;
            matched.forEach(function(t) {
                var dir = t["odpt:railDirection"] || "";
                if (dir) directionCounts[dir] = (directionCounts[dir] || 0) + 1;
                if (t["odpt:fromStation"] || t["odpt:toStation"]) locatedCount++;
                if (t["odpt:trainNumber"]) numberedCount++;
            });
            return {
                lineId: lineId,
                operator: operator,
                expectedIdentity: expected.odptRailway,
                observedAt: new Date().toISOString(),
                ok: matched.length > 0,
                rowCount: data.length,
                matchedCount: matched.length,
                numberedCount: numberedCount,
                locatedCount: locatedCount,
                locationCoverage: matched.length ? locatedCount / matched.length : 0,
                trainNumberCoverage: matched.length ? numberedCount / matched.length : 0,
                directionCounts: directionCounts,
                matchedRows: matched.map(function(t) {
                    return {
                        trainNumber: t["odpt:trainNumber"] || "",
                        trainType: t["odpt:trainType"] || "",
                        railDirection: t["odpt:railDirection"] || "",
                        fromStation: t["odpt:fromStation"] || "",
                        toStation: t["odpt:toStation"] || "",
                        delay: t["odpt:delay"] || 0
                    };
                })
            };
        },

        auditRealtimeRailwayIdentities: function(operator, rows) {
            try {
                var data = Array.isArray(rows) ? rows : [];
                var actual = {};
                data.forEach(function(t) {
                    if (!t) return;
                    var id = parseRailwayIdentity(t);
                    var raw = t["odpt:railway"] || "";
                    var key = id ? id.key : ("UNPARSED::" + raw);
                    if (!actual[key]) {
                        actual[key] = {
                            identity: id ? id.odptRailway : raw,
                            operator: id ? id.operator : "",
                            railwayCode: id ? id.railwayCode : "",
                            count: 0,
                            stations: {},
                            sampleTrainNumbers: []
                        };
                    }
                    var a = actual[key];
                    a.count++;
                    [t["odpt:fromStation"], t["odpt:toStation"]].forEach(function(st) {
                        if (st) a.stations[String(st)] = true;
                    });
                    var no = t["odpt:trainNumber"] || "";
                    if (no && a.sampleTrainNumbers.length < 5 && a.sampleTrainNumbers.indexOf(no) < 0) {
                        a.sampleTrainNumbers.push(no);
                    }
                });

                var expected = {};
                Object.keys(LINE_TO_OPERATOR).forEach(function(lineId) {
                    if (LINE_TO_OPERATOR[lineId] !== operator) return;
                    var id = getLineRailwayIdentity(lineId);
                    if (!id) return;
                    if (!expected[id.key]) expected[id.key] = { identity: id.odptRailway, lineIds: [] };
                    expected[id.key].lineIds.push(lineId);
                });

                var actualKeys = Object.keys(actual);
                var expectedKeys = Object.keys(expected);
                return {
                    operator: operator,
                    rowCount: data.length,
                    actual: actualKeys.map(function(k) {
                        var a = actual[k];
                        return {
                            identity: a.identity,
                            operator: a.operator,
                            railwayCode: a.railwayCode,
                            count: a.count,
                            stationCount: Object.keys(a.stations).length,
                            sampleTrainNumbers: a.sampleTrainNumbers
                        };
                    }),
                    unexpectedActual: actualKeys.filter(function(k) { return !expected[k]; }).map(function(k) { return actual[k].identity; }),
                    expectedWithoutCurrentRows: expectedKeys.filter(function(k) { return !actual[k]; }).map(function(k) {
                        return { identity: expected[k].identity, lineIds: expected[k].lineIds };
                    })
                };
            } catch(e) {
                return { operator: operator, rowCount: 0, actual: [], unexpectedActual: [], expectedWithoutCurrentRows: [], error: e.message };
            }
        },

        // 获取列车时刻表
        getTimetable: function(operator) {
            return fetchODPT(buildUrl(operator, 'trainTimetable')).then(extractData);
        },

        // 按线路获取时刻表（解决API返回1000条限制的问题）
        // 可按日历过滤请求；达到单请求上限时由调用方拆分后合并。
        getTimetableForRailway: function(operator, railway, opts) {
            var ep = ODPT_ENDPOINTS[operator];
            // “能力不可用”不是“source 成功返回空数组”。使用 reject 保留 UNKNOWN/ERROR
            // 语义；现有调用链均已有 rejection fallback，不会把不可用状态写成 TT_EMPTY。
            if (!ep || !ep.trainTimetable) {
                return Promise.reject(new Error("TrainTimetable endpoint unavailable: " + operator));
            }
            var key = getApiKey(ep.base);
            if (!key) {
                return Promise.reject(new Error("ODPT API key unavailable for: " + operator));
            }
            // railway格式: "odpt.Railway:TokyoMetro.Ginza" 或 "Ginza"
            var railwayParam = railway.indexOf('odpt.Railway:') === 0 ? railway : resolveRailwayCode(operator, railway);
            var url = ep.base + 'odpt:TrainTimetable?odpt:operator=odpt.Operator:' + operator + '&odpt:railway=' + railwayParam + '&acl:consumerKey=' + key;
            if (opts && opts.calendar) url += '&odpt:calendar=' + opts.calendar;
            return fetchODPT(url).then(extractData);
        },

        // 完整时刻表（搜索按需查询用）——单请求达到上限时
        // 按日历拆分合并，避免缺班次；内存缓存复用，同线并发只发一次请求。
        // 缓存优先——ODPT_TIMETABLES 已含 IDB 缓存/全量加载数据时零请求
        // （home 搜索经 lazy 模式轻量读 IDB 后命中；trains 全量加载后命中）
        getCompleteTimetable: function(operator, railway) {
            var requestedIdentity = railway.indexOf('odpt.Railway:') === 0 ? parseRailwayIdentity(railway) : makeRailwayIdentity(operator, LINE_RAILWAY_CODE[railway] || railway);
            if (!requestedIdentity) return Promise.resolve([]);
            var ck = requestedIdentity.key;
            if (this._timetableCache[ck]) return Promise.resolve(this._timetableCache[ck]);
            var cachedRows = this._getLocalTimetableRows(operator, railway);
            if (cachedRows && cachedRows.length > 0) {
                this._timetableCache[ck] = cachedRows;
                return Promise.resolve(cachedRows);
            }
            if (this._timetableInflight[ck]) return this._timetableInflight[ck];
            var self = this;
            this._timetableInflight[ck] = this.getTimetableForRailway(operator, railway).then(function(data) {
                var rows = (data && data.length > 0) ? data : [];
                if (rows.length >= ((window.RuntimeConfig && window.RuntimeConfig.TT_TRUNCATE_LIMIT) || 1000)) {
                    return splitTruncatedByCalendar(operator, railway).then(function(merged) {
                        var final = merged.length > rows.length ? merged : rows;
                        self._timetableCache[ck] = final;
                        return final;
                    }, function() { self._timetableCache[ck] = rows; return rows; });
                }
                self._timetableCache[ck] = rows;
                return rows;
            }).finally(function() { delete self._timetableInflight[ck]; });
            return this._timetableInflight[ck];
        },

        // 时刻表缓存（避免重复请求）
        _timetableCache: {},
        _timetableInflight: {},

        // 获取缓存的时刻表（按线路）
        getCachedTimetable: function(operator, railway) {
            var identity = railway.indexOf('odpt.Railway:') === 0 ? parseRailwayIdentity(railway) : makeRailwayIdentity(operator, LINE_RAILWAY_CODE[railway] || railway);
            return identity ? (this._timetableCache[identity.key] || null) : null;
        },

        // E3+E5: 从已加载的 ODPT_TIMETABLES（IDB 缓存/全量加载产物）按线过滤——命中则搜索零请求
        _getLocalTimetableRows: function(operator, railway) {
            try {
                var local = window.ODPT_TIMETABLES && window.ODPT_TIMETABLES[operator];
                if (!local || !Array.isArray(local) || local.length === 0) return null;
                var expected = railway.indexOf('odpt.Railway:') === 0 ? parseRailwayIdentity(railway) : makeRailwayIdentity(operator, LINE_RAILWAY_CODE[railway] || railway);
                if (!expected) return null;
                var rows = local.filter(function(tt) {
                    if (!tt) return false;
                    var actual = parseRailwayIdentity(tt);
                    return !!(actual && actual.key === expected.key);
                });
                return rows.length > 0 ? rows : null;
            } catch(e) { return null; }
        },

        // 缓存时刻表
        cacheTimetable: function(operator, railway, data) {
            var identity = railway.indexOf('odpt.Railway:') === 0 ? parseRailwayIdentity(railway) : makeRailwayIdentity(operator, LINE_RAILWAY_CODE[railway] || railway);
            if (identity) this._timetableCache[identity.key] = data;
        },

        // 解析时间字符串为分钟数
        _parseTimeToMinutes: function(timeStr) {
            try {
                if (!timeStr) return null;
                var parts = timeStr.split(':');
                if (parts.length < 2) return null;
                var h = parseInt(parts[0], 10);
                var m = parseInt(parts[1], 10);
                if (h >= 24) h = h - 24;  // 处理跨午夜时间
                return h * 60 + m;
            } catch(e) { return null; }
        },

        // 获取当前时间（分钟数）
        _getCurrentMinutes: function() {
            try {
                var now = new Date();
                return now.getHours() * 60 + now.getMinutes();
            } catch(e) { return 0; }
        },

        // 按当前时段过滤时刻表（只保留当前时间前后windowMinutes分钟内运行的列车）
        filterTimetableByCurrentTime: function(data, windowMinutes) {
            try {
                if (!data || !Array.isArray(data) || data.length === 0) return [];
                var window = windowMinutes || 90;  // 默认前后90分钟
                var currentMin = this._getCurrentMinutes();
                var self = this;

                return data.filter(function(tt) {
                    if (!tt) return false;
                    var tto = tt['odpt:trainTimetableObject'];
                    if (!tto || !Array.isArray(tto) || tto.length === 0) return false;

                    // 获取第一站发车时间和最后一站到达时间
                    var firstDep = self._parseTimeToMinutes(tto[0]['odpt:departureTime']);
                    var lastArr = self._parseTimeToMinutes(tto[tto.length - 1]['odpt:arrivalTime'] || tto[tto.length - 1]['odpt:departureTime']);

                    if (firstDep === null || lastArr === null) return true;  // 无法判断时保留

                    // 检查列车是否在当前时段运行
                    // 列车运行区间：[firstDep, lastArr]
                    // 当前时段：[currentMin - window, currentMin + window]
                    var inService = lastArr >= (currentMin - window) && firstDep <= (currentMin + window);
                    return inService;
                });
            } catch(e) {
                console.debug("[ODPT] filterTimetableByCurrentTime error:", e.message);
                return data || [];
            }
        },

        // 按线路获取时刻表（并按当前时段过滤）
        getTimetableForRailwayFiltered: function(operator, railway, windowMinutes) {
            var self = this;
            return this.getTimetableForRailway(operator, railway).then(function(data) {
                return self.filterTimetableByCurrentTime(data, windowMinutes);
            });
        },

        // 检查运营商是否支持某种API
        supports: function(operator, type) {
            var ep = ODPT_ENDPOINTS[operator];
            return !!(ep && ep[type]);
        }
    };

    // ========== Timetable Cache (IndexedDB primary, localStorage fallback) ==========
    // 时刻表优先存入 IndexedDB；localStorage 仅作为隐私模式或 IndexedDB 不可用时的兜底。
    var TIMETABLE_CACHE_KEY = 'odpt_timetable_cache_v6';
    // 缓存 key / TTL / 轮询间隔统一由 RuntimeConfig 提供（见 data/core/runtime-config.js）
    var LEGACY_LS_CACHE_KEY = (window.RuntimeConfig && window.RuntimeConfig.ODPT_LEGACY_LS_CACHE_KEY) || 'odpt_timetable_cache_v3';
    var TIMETABLE_CACHE_TTL = (window.RuntimeConfig && window.RuntimeConfig.ODPT_TIMETABLE_CACHE_TTL) || 86400000;
    var IDB_DB_NAME = 'pixel-tetsudo';
    var IDB_STORE = 'odpt_cache';
    var _idbDbPromise = null;

    function _idbOpen() {
        if (_idbDbPromise) return _idbDbPromise;
        _idbDbPromise = new Promise(function(resolve, reject) {
            try {
                if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
                var req = window.indexedDB.open(IDB_DB_NAME, 1);
                req.onupgradeneeded = function(e) {
                    var db = e.target.result;
                    if (!db.objectStoreNames.contains(IDB_STORE)) {
                        db.createObjectStore(IDB_STORE);
                    }
                };
                req.onsuccess = function(e) { resolve(e.target.result); };
                req.onerror = function(e) { reject(e.target.error || new Error('IDB open failed')); };
                req.onblocked = function() { reject(new Error('IDB blocked')); };
            } catch(e) { reject(e); }
        });
        // 失败后重置，允许下次重试（如用户稍后解除隐私模式）
        _idbDbPromise = _idbDbPromise.catch(function(err) { _idbDbPromise = null; throw err; });
        return _idbDbPromise;
    }
    function _idbGet(key) {
        return _idbOpen().then(function(db) {
            return new Promise(function(resolve, reject) {
                try {
                    var tx = db.transaction(IDB_STORE, 'readonly');
                    var req = tx.objectStore(IDB_STORE).get(key);
                    req.onsuccess = function() { resolve(req.result); };
                    req.onerror = function() { reject(req.error); };
                } catch(e) { reject(e); }
            });
        });
    }
    function _idbSet(key, value) {
        return _idbOpen().then(function(db) {
            return new Promise(function(resolve, reject) {
                try {
                    var tx = db.transaction(IDB_STORE, 'readwrite');
                    tx.objectStore(IDB_STORE).put(value, key);
                    tx.oncomplete = function() { resolve(); };
                    tx.onerror = function() { reject(tx.error); };
                    tx.onabort = function() { reject(tx.error); };
                } catch(e) { reject(e); }
            });
        });
    }

    // 旧 localStorage 缓存同步读取（TTL 检查 + 解压）
    function _readLocalStorageCache(key) {
        try {
            var cached = localStorage.getItem(key);
            if (!cached) return null;
            var data = JSON.parse(cached);
            if (!data || !data.timestamp) return null;
            var age = Date.now() - data.timestamp;
            if (age > TIMETABLE_CACHE_TTL) return null;
            if (data.compressed && data.timetables) {
                return decompressTimetable(data.timetables);
            }
            return data.timetables || {};
        } catch(e) {
            console.debug("[ODPT] Failed to read localStorage cache:", e.message);
            return null;
        }
    }

    // 迁移：IndexedDB 无记录时，把未过期的旧 localStorage v3 缓存搬入 IndexedDB（避免首次重下大体积时刻表）
    function _migrateLegacyLocalStorage() {
        var legacy = _readLocalStorageCache(LEGACY_LS_CACHE_KEY);
        if (!legacy) return null;
        var compressed = compressTimetable(legacy);
        var data = { timestamp: Date.now(), timetables: compressed, compressed: true, migrated: true };
        _idbSet(TIMETABLE_CACHE_KEY, data).then(function() {
            try { localStorage.removeItem(LEGACY_LS_CACHE_KEY); } catch(e) {}
            console.debug("[ODPT] Migrated legacy localStorage cache to IndexedDB");
        }).catch(function(e) {
            console.debug("[ODPT] Legacy migration to IndexedDB failed:", e && e.message);
        });
        return legacy;
    }

    // 异步读取缓存：IndexedDB 主路径 → 旧 localStorage 迁移 → localStorage 兜底
    function loadTimetableCache() {
        return _idbGet(TIMETABLE_CACHE_KEY).then(function(record) {
            if (record && record.timestamp) {
                var age = Date.now() - record.timestamp;
                if (age > TIMETABLE_CACHE_TTL) return null;
                if (record.compressed && record.timetables) {
                    return decompressTimetable(record.timetables);
                }
                return record.timetables || {};
            }
            // 本键无记录（首次 v4）：尝试迁移旧 v3 localStorage 缓存
            return _migrateLegacyLocalStorage();
        }).catch(function(e) {
            console.debug("[ODPT] IndexedDB read failed, using localStorage:", e && e.message);
            return _readLocalStorageCache(TIMETABLE_CACHE_KEY);
        });
    }

    function compressTimetable(timetables) {
        try {
            var compressed = {};
            Object.keys(timetables).forEach(function(op) {
                var data = timetables[op] || [];
                compressed[op] = data.map(function(tt) {
                    // 只保留必要字段
                    // 时刻表 stop 兼容 departureStation、arrivalStation 和旧的 odpt:station 字段。
                    // 旧压缩只取 odpt:station 导致缓存解压后站全空、推定位置全失（都电荒川线 879 条时刻表 0 位置）。
                    // 压缩时兼容三种字段，解压时全部还原。
                    var stations = (tt['odpt:trainTimetableObject'] || []).map(function(sto) {
                        return {
                            s: sto['odpt:station'] || sto['odpt:departureStation'] || sto['odpt:arrivalStation'] || '',
                            a: sto['odpt:arrivalTime'] || '',
                            d: sto['odpt:departureTime'] || ''
                        };
                    });
                    return {
                        n: tt['odpt:trainNumber'] || '',
                        r: tt['odpt:railway'] || '',
                        t: tt['odpt:trainType'] || '',
                        dir: tt['odpt:railDirection'] || '',
                        c: tt['odpt:calendar'] || '',  // 保留日历，保证缓存查询按日期过滤。
                        st: stations,
                        d: tt['odpt:destinationStation'] || []  // 保留终点站信息。
                    };
                });
            });
            return compressed;
        } catch(e) {
            console.debug("[ODPT] Compress error:", e.message);
            return timetables;
        }
    }

    function decompressTimetable(compressed) {
        try {
            var timetables = {};
            Object.keys(compressed).forEach(function(op) {
                var data = compressed[op] || [];
                timetables[op] = data.map(function(tt) {
                    var stations = (tt.st || []).map(function(sto) {
                        return {
                            'odpt:station': sto.s || '',
                            'odpt:departureStation': sto.s || '',
                            'odpt:arrivalStation': sto.s || '',
                            'odpt:arrivalTime': sto.a || '',
                            'odpt:departureTime': sto.d || ''
                        };
                    });
                    return {
                        'odpt:trainNumber': tt.n || '',
                        'odpt:railway': tt.r || '',
                        'odpt:trainType': tt.t || '',
                        'odpt:railDirection': tt.dir || '',
                        'odpt:calendar': tt.c || '',  // 还原日历字段。
                        'odpt:trainTimetableObject': stations,
                        'odpt:destinationStation': tt.d || []  // 还原终点站字段。
                    };
                });
            });
            return timetables;
        } catch(e) {
            console.debug("[ODPT] Decompress error:", e.message);
            return compressed;
        }
    }

    // localStorage 兜底保存（同步，含 partial 降级）——仅当 IndexedDB 不可用时触发
    function _saveLocalStorage(compressed, data, timetables) {
        try {
            var jsonStr = JSON.stringify(data);
            console.debug("[ODPT] Timetable cache size:", (jsonStr.length / 1024 / 1024).toFixed(2), "MB");
            localStorage.setItem(TIMETABLE_CACHE_KEY, jsonStr);
            console.debug("[ODPT] Timetable cache saved to localStorage (fallback)");
            return Promise.resolve();
        } catch(e) {
            console.debug("[ODPT] Failed to save timetable cache:", e.message);
            // 如果还是太大，尝试只保存主要运营商
            try {
                var mainOps = ['JR-East', 'TokyoMetro', 'Toei', 'Tobu', 'Keio'];
                var partial = {};
                mainOps.forEach(function(op) {
                    if (timetables[op]) partial[op] = timetables[op];
                });
                var partialCompressed = compressTimetable(partial);
                var partialData = {
                    timestamp: Date.now(),
                    timetables: partialCompressed,
                    compressed: true,
                    partial: true
                };
                localStorage.setItem(TIMETABLE_CACHE_KEY, JSON.stringify(partialData));
                console.debug("[ODPT] Partial timetable cache saved to localStorage");
            } catch(e2) {
                console.debug("[ODPT] Partial cache also failed:", e2.message);
            }
            return Promise.resolve();
        }
    }

    function saveTimetableCache(timetables) {
        var compressed = compressTimetable(timetables);
        var data = { timestamp: Date.now(), timetables: compressed, compressed: true };
        // 主路径：IndexedDB 异步写入，不阻塞主线程、容量充足
        return _idbSet(TIMETABLE_CACHE_KEY, data).then(function() {
            console.debug("[ODPT] Timetable cache saved to IndexedDB:", Object.keys(timetables).length, "operators");
            // 成功后清除旧 localStorage 残留（释放配额）
            try { localStorage.removeItem(LEGACY_LS_CACHE_KEY); } catch(e) {}
        }).catch(function(e) {
            console.debug("[ODPT] IndexedDB save failed, falling back to localStorage:", e && e.message);
            return _saveLocalStorage(compressed, data, timetables);
        });
    }

    function shouldRefreshTimetables() {
        return _idbGet(TIMETABLE_CACHE_KEY).then(function(record) {
            if (record && record.timestamp) {
                return (Date.now() - record.timestamp) > TIMETABLE_CACHE_TTL;
            }
            // 本键无记录：检查旧 localStorage 缓存是否仍有效（迁移完成前）
            var legacy = null;
            try {
                var cached = localStorage.getItem(LEGACY_LS_CACHE_KEY);
                if (cached) {
                    var d = JSON.parse(cached);
                    if (d && d.timestamp) legacy = d;
                }
            } catch(e) {}
            if (legacy) return (Date.now() - legacy.timestamp) > TIMETABLE_CACHE_TTL;
            return true;
        }).catch(function() {
            // IndexedDB 不可用：localStorage 兜底
            try {
                var cached = localStorage.getItem(TIMETABLE_CACHE_KEY);
                if (!cached) return true;
                var data = JSON.parse(cached);
                if (!data || !data.timestamp) return true;
                return (Date.now() - data.timestamp) > TIMETABLE_CACHE_TTL;
            } catch(e) {
                return true;
            }
        });
    }

    // ========== 全局数据存储 ==========
    window.ODPT_DELAY_DATA = {};       // 延误/运行情报
    window.ODPT_TRAIN_POSITIONS = {};  // 列车实时位置
    window.ODPT_TIMETABLES = {};       // 列车时刻表

    // ========== ODPT_TT_PROBED 持久化（localStorage，24h 滑动 TTL） ==========
    // probed 标记跨页面保存，避免没有时刻表的线路在每次切页时重复探测。
    var TT_PROBED_KEY = (window.RuntimeConfig && window.RuntimeConfig.ODPT_TT_PROBED_KEY) || 'odpt_tt_probed_v1';
    var TT_PROBED_TTL = (window.RuntimeConfig && window.RuntimeConfig.ODPT_TT_PROBED_TTL) || 86400000;

    function _loadProbed() {
        try {
            if (window.ODPT_TT_PROBED) return;
            var raw = localStorage.getItem(TT_PROBED_KEY);
            if (!raw) return;
            var data = JSON.parse(raw);
            if (!data || data.v !== 1 || !data.lines) return;
            if ((Date.now() - (data.ts || 0)) > TT_PROBED_TTL) return;
            window.ODPT_TT_PROBED = data.lines;
        } catch(e) {}
    }
    function _persistProbed() {
        try {
            var lines = window.ODPT_TT_PROBED || {};
            if (Object.keys(lines).length === 0) return;
            localStorage.setItem(TT_PROBED_KEY, JSON.stringify({ v: 1, ts: Date.now(), lines: lines }));
        } catch(e) {}
    }
    _loadProbed();

    // ========== ODPT_TT_EMPTY 空线标记（与 probed 分离） ==========
    // probed 语义="探测过"（有数据线也会标记，缓存过期时需重拉数据不能跳过）；
    // EMPTY 专门记录"ODPT 无数据/失败"的空线（JR 地方线 83 条大部分无 TrainTimetable），
    // 全量拉取 collectTimetableByRailway 跳过空线——91 请求 → 只拉有数据的 ~51 线，
    // 弱网下首屏等待显著缩短（配合 24h TTL，用户每天最多一次全量）。
    var TT_EMPTY_KEY = 'odpt_tt_empty_v1';
    var TT_EMPTY_TTL = 86400000 * 7;  // 7天（空线判定长期稳定，改点才可能新增时刻表）
    function _loadEmpty() {
        try {
            if (window.ODPT_TT_EMPTY) return;
            var raw = localStorage.getItem(TT_EMPTY_KEY);
            if (!raw) return;
            var data = JSON.parse(raw);
            if (!data || data.v !== 1 || !data.lines) return;
            if ((Date.now() - (data.ts || 0)) > TT_EMPTY_TTL) return;
            window.ODPT_TT_EMPTY = data.lines;
        } catch(e) {}
    }
    function _persistEmpty() {
        try {
            var lines = window.ODPT_TT_EMPTY || {};
            if (Object.keys(lines).length === 0) return;
            localStorage.setItem(TT_EMPTY_KEY, JSON.stringify({ v: 1, ts: Date.now(), lines: lines }));
        } catch(e) {}
    }
    _loadEmpty();

    // ========== 原始实时数据落盘 + stale-while-revalidate（E4: 切页零空窗） ==========
    // 页面切换后先读取原始缓存，再由后台请求更新，避免首屏等待所有 operator。
    // RTCache（IDB，key=rawDelay/rawPositions，带 ts）；新页启动先读缓存（30s 内新鲜）
    // 立即渲染，再后台拉新数据覆盖——stale-while-revalidate。
    // 注意：RTCache 的 positions/delayInfo 两键被 data-fusion 融合后数据占用（lineId 级），
    // 这里用独立 raw 键（operator 级原始数据），互不覆盖。
    var RAW_REALTIME_FRESH_MS = 15000;  // 缓存新鲜窗口，与实时轮询周期一致。
    var FUSION_READY_WAIT_MS = 15000;
    var _fusionWaiters = {};

    function waitForFusion(key, ready, run) {
        if (ready()) {
            delete _fusionWaiters[key];
            run();
            return;
        }
        var existing = _fusionWaiters[key];
        if (existing) return;
        var startedAt = Date.now();
        function tick() {
            if (ready()) {
                delete _fusionWaiters[key];
                run();
                return;
            }
            if ((Date.now() - startedAt) >= FUSION_READY_WAIT_MS) {
                delete _fusionWaiters[key];
                console.debug("[ODPT] readiness wait expired:", key);
                return;
            }
            _fusionWaiters[key] = setTimeout(tick, document.hidden ? 1000 : 300);
        }
        _fusionWaiters[key] = setTimeout(tick, document.hidden ? 1000 : 300);
    }

    function persistRawRealtime(delayOnly) {
        try {
            if (!window.RTCache || !window.RTCache.put) return;
            window.RTCache.put('rawDelay', { ts: Date.now(), data: window.ODPT_DELAY_DATA });
            // 位置仅在非惰性模式写——lazy（home）不拉 positions，写空会覆盖 trains 页刚落的真实位置
            if (!delayOnly) {
                window.RTCache.put('rawPositions', { ts: Date.now(), data: window.ODPT_TRAIN_POSITIONS });
            }
        } catch(e) { console.debug("[ODPT] persistRawRealtime error:", e.message); }
    }

    // 新页启动：读缓存（新鲜才用）→ 填充全局 → DataFusion 就绪后立即推送（重试等待）
    function loadRawRealtimeCache() {
        try {
            if (!window.RTCache || !window.RTCache.get) return Promise.resolve();
            return Promise.all([
                window.RTCache.get('rawDelay'),
                window.RTCache.get('rawPositions')
            ]).then(function(results) {
                var now = Date.now();
                var delayRec = results[0], posRec = results[1];
                var delayFresh = !!(delayRec && delayRec.ts && (now - delayRec.ts) <= RAW_REALTIME_FRESH_MS && delayRec.data && typeof delayRec.data === 'object');
                var posFresh = !!(posRec && posRec.ts && (now - posRec.ts) <= RAW_REALTIME_FRESH_MS && posRec.data && typeof posRec.data === 'object');
                if (delayFresh) window.ODPT_DELAY_DATA = delayRec.data;
                if (posFresh) {
                    window.ODPT_TRAIN_POSITIONS = posRec.data;
                    _rebuildRealtimePositionViews();
                }
                if (delayFresh || posFresh) pushCachedRealtime(delayFresh, posFresh);
            }).catch(function(e) {
                console.debug("[ODPT] loadRawRealtimeCache error:", e.message);
            });
        } catch(e) { return Promise.resolve(); }
    }

    function pushCachedRealtime(hasDelay, hasPositions) {
        waitForFusion("cached-realtime", function() {
            return !!(window.DataFusion && window.DataFusion.updateOdptData);
        }, function() {
            try {
                if (hasDelay) window.DataFusion.updateOdptData(window.ODPT_DELAY_DATA);
                if (hasPositions && window.DataFusion.loadTrainPositions && Object.keys(window.ODPT_TRAIN_POSITIONS).length > 0) {
                    window.DataFusion.loadTrainPositions();
                }
            } catch(e) { console.debug("[ODPT] cached realtime push error:", e.message); }
        });
    }

    window.addEventListener("pt:railway-ready", function() {
        if (!window.DataFusion || !window.DataFusion.updateOdptData) return;
        try {
            if (window.ODPT_DELAY_DATA) window.DataFusion.updateOdptData(window.ODPT_DELAY_DATA);
            if (window.DataFusion.loadTrainPositions &&
                window.ODPT_TRAIN_POSITIONS &&
                Object.keys(window.ODPT_TRAIN_POSITIONS).length > 0) {
                window.DataFusion.loadTrainPositions._calibrated = false;
                window.DataFusion.loadTrainPositions();
            }
            // file:// 页面先加载铁路事实包，实时请求可能恰好先返回；
            // 这时适配器没有线路/站点坐标会把整批位置安全丢弃。
            // 铁路事实就绪后，对已经激活但尚无快照的运营商补拉一次，
            // 不改变车型或线路判定责任，也不建立第二条实时链。
            var activeOps = Object.keys(_activeRealtimeOperators);
            var missingActiveSnapshot = activeOps.some(function(op) {
                return !window.ODPT_TRAIN_POSITIONS || !Array.isArray(window.ODPT_TRAIN_POSITIONS[op]);
            });
            if (activeOps.length && missingActiveSnapshot) {
                loadRealtimeData(false, activeOps, true).catch(function(e) {
                    console.debug("[ODPT] railway-ready position retry failed:", e && e.message);
                });
            }
        } catch(e) {
            console.debug("[ODPT] railway-ready realtime push error:", e.message);
        }
    });

    // ========== 加载实时数据（延误信息 + 实时位置）==========
    // 每30秒刷新一次
    // delayOnly=true 时只拉运行情报/延误，供惰性模式首页搜索徽章使用。
    /**
     * Guard authoritative realtime policy against endpoint/config drift.
     * Forward direction is strict: every authoritative line must resolve to an
     * operator whose active runtime endpoint actually exposes odpt:Train.
     * Reverse direction is intentionally not enforced because endpoint support
     * does not imply complete line coverage.
     *
     * Invalid entries are disabled in-place (fail-open to timetable fallback)
     * instead of leaving the line with no position source.
     */
    function validateAuthoritativeRealtimeConfig() {
        var cfg = window.RuntimeConfig && window.RuntimeConfig.AUTHORITATIVE_REALTIME_LINES;
        if (!cfg) return { ok: true, checked: 0, invalid: [] };

        var invalid = [];
        var checked = 0;
        Object.keys(cfg).forEach(function(lineId) {
            if (!cfg[lineId]) return;
            checked++;
            var operator = LINE_TO_OPERATOR[lineId] || null;
            var ep = operator && ODPT_ENDPOINTS[operator];
            if (!operator || !ep || !(ep.train || ep.gtfsVehicle)) {
                invalid.push({
                    lineId: lineId,
                    operator: operator,
                    reason: !operator ? "missing-operator" : (!ep ? "missing-endpoint" : "train-endpoint-disabled")
                });
                cfg[lineId] = false;
            }
        });

        if (invalid.length) {
            console.warn("[ODPT] authoritative realtime config downgraded:", invalid);
        }
        return { ok: invalid.length === 0, checked: checked, invalid: invalid };
    }

    function loadRealtimeData(delayOnly, positionOperators, skipDelayRefresh) {
        validateAuthoritativeRealtimeConfig();
        if (!skipDelayRefresh || !window.ODPT_DELAY_DATA) window.ODPT_DELAY_DATA = {};
        // Position snapshots are retained per operator. On-demand refresh must
        // not erase another already-active operator before its own poll runs.
        if (!window.ODPT_TRAIN_POSITIONS || (!delayOnly && !positionOperators)) window.ODPT_TRAIN_POSITIONS = {};
        // 注意：不清空 ODPT_TIMETABLES，时刻表使用缓存

        var ops = Object.keys(ODPT_ENDPOINTS);
        // An explicit empty operator list means "do not fetch positions" in
        // lazy mode.  The previous truthy/length check silently expanded []
        // back to every operator and caused a full-site burst of requests.
        var positionOps = Array.isArray(positionOperators) ? positionOperators : ops;
        var loaded = { delay: 0, positions: 0 };
        var delayPromises = [], posPromises = [];

        ops.forEach(function(op) {
            var ep = ODPT_ENDPOINTS[op];

            // 1. 加载运行情报/延误信息（优先推送，首屏不等列车位置）
            if (!skipDelayRefresh && ep.trainInformation) {
                var delayFetch = fetchODPT(buildUrl(op, 'trainInformation')).then(extractData);
                var alertEndpointType = ep.alert ? "alert" : (ep.gtfsAlert ? "gtfsAlert" : "");
                if (alertEndpointType) {
                    var infoResult = delayFetch.then(function(data) {
                        return { ok: true, data: data || [] };
                    }).catch(function(error) {
                        return { ok: false, data: [], error: error };
                    });
                    var alertLoader = op === "TokyoMetro" ? fetchTokyoMetroGtfsAlerts :
                        (op === "TWR" ? fetchTwrGtfsAlerts :
                            (op === "MIR" ? fetchMirGtfsAlerts :
                                (op === "Toei" ? fetchToeiGtfsAlerts : function(url) {
                                    return fetchGenericGtfsAlerts(url, op);
                                })));
                    var alertResult = alertLoader(buildUrl(op, alertEndpointType)).then(function(data) {
                        return { ok: true, data: data || [] };
                    }).catch(function(error) {
                        console.debug("[ODPT] " + op + " GTFS alert fetch failed:", error && error.message);
                        return { ok: false, data: [], error: error };
                    });
                    delayFetch = Promise.all([infoResult, alertResult]).then(function(parts) {
                        if (!parts[0].ok && !parts[1].ok) throw (parts[0].error || parts[1].error);
                        return (parts[0].data || []).concat(parts[1].data || []);
                    });
                }
                delayPromises.push(
                    delayFetch.then(function(data) {
                        // 保留全部记录；成功返回空数组表示确认无记录，失败则保留 null 状态。
                        window.ODPT_DELAY_DATA[op] = (data && data.length > 0) ? data : [];
                        window.ODPT_REALTIME_STATUS = window.ODPT_REALTIME_STATUS || {};
                        window.ODPT_REALTIME_STATUS[op + ":delay"] = { ok: true, at: Date.now() };
                        loaded.delay++;
                    }).catch(function(e) {
                        // Failed challenge/quota requests are not a confirmed
                        // empty delay feed; keep the previous value if present.
                        if (!Object.prototype.hasOwnProperty.call(window.ODPT_DELAY_DATA, op)) {
                            window.ODPT_DELAY_DATA[op] = null;
                        }
                        window.ODPT_REALTIME_STATUS = window.ODPT_REALTIME_STATUS || {};
                        window.ODPT_REALTIME_STATUS[op + ":delay"] = {
                            ok: false,
                            status: Number(e && e.httpStatus) || 0,
                            at: Date.now(),
                            message: e && e.message || "request failed"
                        };
                        console.debug("[ODPT] " + op + " trainInformation fetch failed:", e && e.message);
                    })
                );
            }

            // 2. 加载列车实时位置（第二推送，不阻塞延误首屏；delayOnly 模式跳过）
            // 东武 GTFS-RT VehiclePosition 只提供坐标和内部 trip/vehicle ID，
            // 当前流没有 route_id/stop_id，无法安全拆分重叠的东武线路。
            // 该运营商的 JSON Train 已提供 railway/fromStation/toStation，
            // 因此以它作为位置主源；GTFS-RT TripUpdate 仍可作为补充合并。
            // Prefer the operator's canonical JSON Train source whenever it is
            // available. It carries the railway/fromStation/toStation identity
            // needed by DataFusion to place a train on the correct canonical
            // line. GTFS VehiclePosition is the fallback for operators that do
            // not publish odpt:Train; using it first for JR-East discarded the
            // captured Saikyo/Kawagoe positions before they reached the map.
            var vehicleEndpointType = ep.train
                ? "train"
                : (ep.gtfsVehicle ? "gtfsVehicle" : "");
            if (!delayOnly && vehicleEndpointType && positionOps.indexOf(op) >= 0) {
                var positionFetch = (op === "Toei"
                    ? fetchToeiGtfsPositions(buildUrl(op, vehicleEndpointType))
                    : vehicleEndpointType === "gtfsVehicle"
                        ? fetchGenericGtfsPositions(buildUrl(op, vehicleEndpointType), op)
                        : fetchODPT(buildUrl(op, vehicleEndpointType)).then(extractData));
                var tripUpdateEndpointType = ep.gtfsTripUpdate ? "gtfsTripUpdate" : (ep.tripUpdate ? "tripUpdate" : "");
                if (tripUpdateEndpointType) {
                    var tripUpdateFetch = (op === "Toei"
                        ? fetchToeiGtfsTripUpdates(buildUrl(op, tripUpdateEndpointType))
                        : fetchGenericGtfsTripUpdates(buildUrl(op, tripUpdateEndpointType), op)).catch(function(error) {
                        console.debug("[ODPT] " + op + " GTFS-RT TripUpdate fetch failed:", error && error.message);
                        return [];
                    });
                    positionFetch = Promise.all([positionFetch, tripUpdateFetch]).then(function(parts) {
                        return _mergeGtfsTripUpdates(parts[0], parts[1]);
                    });
                }
                posPromises.push(
                    positionFetch.then(function(data) {
                        // 成功返回空数组也写入；单个运营商失败不拖垮全局推送。
                        window.ODPT_TRAIN_POSITIONS[op] = (data && data.length > 0) ? data : [];
                        _rebuildRealtimePositionViews();
                        window.ODPT_REALTIME_STATUS = window.ODPT_REALTIME_STATUS || {};
                        window.ODPT_REALTIME_STATUS[op] = { ok: true, count: window.ODPT_TRAIN_POSITIONS[op].length, at: Date.now() };
                        loaded.positions++;
                        // Explicit Yamanote baseline probe: record only exact
                        // JR-East.Yamanote rows; never classify other JR-East rows
                        // by station overlap or line length.
                        if (op === "JR-East" && LINE_TO_OPERATOR.Yamanote === op && _activeRealtimeOperators[op] && window.ODPTClient && window.ODPTClient.auditRealtimeLine) {
                            window.ODPT_REALTIME_AUDIT = window.ODPT_REALTIME_AUDIT || {};
                            var audit = window.ODPTClient.auditRealtimeLine("Yamanote", window.ODPT_TRAIN_POSITIONS[op]);
                            var history = window.ODPT_REALTIME_AUDIT.YamanoteHistory || [];
                            history.push(audit);
                            if (history.length > 10) history.shift();
                            window.ODPT_REALTIME_AUDIT.Yamanote = audit;
                            window.ODPT_REALTIME_AUDIT.YamanoteHistory = history;
                            window.ODPT_REALTIME_AUDIT.YamanoteFullCandidate =
                                window.ODPTClient.assessRealtimeFullCandidate("Yamanote", history);
                        }
                    }).catch(function(e) {
                        // A transient 429/403/network error is not a confirmed
                        // empty feed. Retain the last valid operator snapshot
                        // so DataFusion can keep rendering known trains.
                        window.ODPT_REALTIME_STATUS = window.ODPT_REALTIME_STATUS || {};
                        window.ODPT_REALTIME_STATUS[op] = {
                            ok: false,
                            status: Number(e && e.httpStatus) || 0,
                            at: Date.now(),
                            message: e && e.message || "request failed"
                        };
                        console.debug("[ODPT] " + op + " train positions fetch failed; retaining previous snapshot:", e && e.message);
                    })
                );
            }
        });

        // 延误信息就绪后立即推送；列车位置随后补齐，加载期间保持明确的等待状态。
        function pushDelay() {
            waitForFusion("delay", function() {
                return !!(window.DataFusion && window.DataFusion.updateOdptData);
            }, function() {
                try {
                    window.DataFusion.updateOdptData(window.ODPT_DELAY_DATA);
                } catch(e) { console.debug("[ODPT] delay push error:", e.message); }
                console.debug("[ODPT] Realtime delay loaded:", loaded.delay, "operators");
            });
        }
        function pushAll() {
            waitForFusion("all", function() {
                return !!(window.DataFusion && window.DataFusion.updateOdptData);
            }, function() {
                try {
                    window.DataFusion.updateOdptData(window.ODPT_DELAY_DATA);
                    if (window.DataFusion.loadTrainPositions) {
                        window.DataFusion.loadTrainPositions();
                    }
                } catch(e) { console.debug("[ODPT] DataFusion push error:", e.message); }
                console.debug("[ODPT] Realtime loaded - delay:", loaded.delay,
                            "operators, positions:", loaded.positions, "operators");
            });
        }
        // 列车位置推送与延误情报解耦，位置数据不等待 delayPromises 完成。
        // （TrainInformation 任一 operator 慢/超时会卡住整条 Promise 链，导致 loadTrainPositions 永不执行）
        // 同时等待 DataLayer 就绪后再分配（本地线路数据晚于 ODPT 到达时重试，不设死上限）
        function pushTrainPositions() {
            waitForFusion("positions", function() {
                if (!window.DataFusion || !window.DataFusion.loadTrainPositions) return false;
                var dl = (window.DataLayer && window.DataLayer.getAllLines) ? window.DataLayer.getAllLines() : (window.UNIFIED_LINES || {});
                return !!(dl && Object.keys(dl).length > 0);
            }, function() {
                try {
                    window.DataFusion.loadTrainPositions._calibrated = false;
                    window.DataFusion.loadTrainPositions();
                } catch(e) { console.debug("[ODPT] train positions push error:", e.message); }
                console.debug("[ODPT] Realtime positions pushed:", loaded.positions, "operators");
            });
        }

        // 延误情报独立推送；列车位置在 posPromises 就绪后推送（不阻塞、不依赖延误链）
        // 拉取完成即落盘原始数据（带 ts），供其他标签页和切页 stale-while-revalidate。
        if (!skipDelayRefresh) {
            Promise.all(delayPromises).then(function() { pushDelay(); persistRawRealtime(!!delayOnly); });
        }
        if (delayOnly) return Promise.resolve();  // 惰性模式不拉位置
        return Promise.all(posPromises).then(function() { pushTrainPositions(); persistRawRealtime(false); });
    }
    // ========== 加载时刻表数据（使用本地缓存）==========
    // 每小时刷新一次，优先使用本地缓存
    function loadTimetableData(forceRefresh) {
        // 先尝试从本地缓存加载（IndexedDB 主路径，异步；失败自动回退 localStorage）
        return loadTimetableCache().then(function(cachedTimetables) {
            if (cachedTimetables && !forceRefresh) {
                console.debug("[ODPT] Using cached timetables from IndexedDB/localStorage");
                window.ODPT_TIMETABLES = cachedTimetables;
                return;
            }
            // 缓存过期或强制刷新，从API加载
            return _loadTimetableDataFromApi();
        });
    }

    // 分线截断合并——ODPT 单请求有条数上限，按日历拆分后合并完整数据。
    // 恰 1000 条 = 截断信号，按日历拆成多次请求合并出完整数据。
    // 实测 5 条首都圈大线截断：Yamanote 1037 / Keiyo 1127 / ChuoRapid 1087 /
    // ChuoSobuLocal 1196 / KeihinTohoku 1263（合并后全量，各日历分片均 <1000）。
    // 供全量加载（collectTimetableByRailway）与按需查询（getCompleteTimetable）共用。
    function splitTruncatedByCalendar(op, lid) {
        var CAL_SPLIT = ['odpt.Calendar:Weekday', 'odpt.Calendar:Saturday', 'odpt.Calendar:Sunday', 'odpt.Calendar:Holiday', 'odpt.Calendar:SaturdayHoliday'];
        var seen = {};
        function dedup(list) {
            var out = [];
            list.forEach(function(tt) {
                if (!tt) return;
                // 同车次×同日历×同方向 = 同一条记录（日历拆分后天然区分平日/休日班次）
                var k = (tt['odpt:trainNumber'] || '') + '|' + (tt['odpt:railway'] || '') + '|' + (tt['odpt:calendar'] || '') + '|' + (tt['odpt:railDirection'] || '');
                if (seen[k]) return;
                seen[k] = true;
                out.push(tt);
            });
            return out;
        }
        var chain = Promise.resolve([]);
        CAL_SPLIT.forEach(function(cal) {
            chain = chain.then(function(acc) {
                return window.ODPTClient.getTimetableForRailway(op, lid, { calendar: cal }).then(function(part) {
                    return acc.concat(part || []);
                }, function() { return acc; });  // 单日历失败不阻断，取其余部分
            });
        });
        return chain.then(dedup);
    }

    // 从 API 全量拉取并落缓存；缓存读取与网络刷新保持独立。
    function _loadTimetableDataFromApi() {
        console.debug("[ODPT] Loading fresh timetables from API");
        var ops = Object.keys(ODPT_ENDPOINTS);
        var loaded = 0;
        var newTimetables = {};
        var timetableLoadErrors = 0;

        // JR-East 时刻表按 railway 分批拉取（单请求上限会把
        // 首都圈外线路截断——实测全量请求仅返回 ChuoRapid/Hachiko/Joban/Agatsuma/JobanRapid 5 线，
        // 其余 83 条 JR 线路时刻表全部丢失，导致时刻表推定无法覆盖地方线）
        function collectTimetableByRailway(op, localLineIds) {
            var batch = localLineIds.filter(function(lid) {
                // 跳过已确认没有时刻表的线路。
                if (window.ODPT_TT_EMPTY && window.ODPT_TT_EMPTY[lid]) return false;
                return ODPT_ENDPOINTS[op] && ODPT_ENDPOINTS[op].trainTimetable;
            });
            // 分批并行拉取；fetchODPT 负责并发窗口和请求间隔。
            // 85 条一次 Promise.all 在弱网/沙箱下可能被连接池限流卡住，每批 20 条链式
            // 推进，既完整覆盖又避免瞬时请求过多（约 4-6s 完成全量）
            var BATCH = 20;
            var idx = 0;
            function nextBatch() {
                if (idx >= batch.length) return Promise.resolve();
                var slice = batch.slice(idx, idx + BATCH);
                idx += BATCH;
                return Promise.all(slice.map(function(lid) {
                    return window.ODPTClient.getTimetableForRailway(op, lid).then(function(data) {
                        var rows = (data && data.length > 0) ? data : [];
                        // 截断线：按日历拆分重拉合并（替换截断数据）
                        if (rows.length >= ((window.RuntimeConfig && window.RuntimeConfig.TT_TRUNCATE_LIMIT) || 1000)) {
                            return splitTruncatedByCalendar(op, lid).then(function(merged) {
                                return merged.length > rows.length ? merged : rows;  // 拆分失败/无增益时回退
                            });
                        }
                        return rows;
                    }).then(function(rows) {
                        // 只有成功响应才能证明 source 对该 railway 返回空数据。
                        // 网络/CORS/限流等异常不得写入 7 天 EMPTY 负缓存，否则一次瞬时失败会
                        // 被错误升级为“ODPT 无此线路时刻表”并持续屏蔽后续正常请求。
                        return { rows: rows, sourceOk: true };
                    }).catch(function() {
                        // 请求失败保持 UNKNOWN：不得持久化为“已探测”，下次刷新仍可重试。
                        timetableLoadErrors++;
                        return { rows: [], sourceOk: false };
                    }).then(function(result) {
                        var rows = result.rows || [];
                        // PROBED 只表示 source 已成功响应；失败保持 UNKNOWN。
                        if (result.sourceOk) {
                            if (!window.ODPT_TT_PROBED) window.ODPT_TT_PROBED = {};
                            window.ODPT_TT_PROBED[lid] = true;
                            _persistProbed();
                        }
                        // EMPTY 只表示“成功请求且 source 明确返回空数组”。
                        if (result.sourceOk && rows.length === 0) {
                            if (!window.ODPT_TT_EMPTY) window.ODPT_TT_EMPTY = {};
                            window.ODPT_TT_EMPTY[lid] = true;
                            _persistEmpty();
                        }
                        if (rows.length > 0) {
                            if (!newTimetables[op]) newTimetables[op] = [];
                            newTimetables[op] = newTimetables[op].concat(rows);
                            if (!window.ODPT_TIMETABLES[op]) window.ODPT_TIMETABLES[op] = [];
                            window.ODPT_TIMETABLES[op] = window.ODPT_TIMETABLES[op].concat(rows);
                        }
                    });
                })).then(nextBatch);
            }
            return nextBatch().then(function() {
                if (newTimetables[op] && newTimetables[op].length > 0) {
                    // 池级去重——多个本地 line ID 可能共用同一 ODPT railway。
                    // 会重复 concat 同一批记录；单线拆分的 dedup 只覆盖拆分内，这里是全池去重。
                    var seenAll = Object.create(null), deduped = [];
                    newTimetables[op].forEach(function(tt) {
                        if (!tt) return;
                        var k = getTimetableIdentity(tt);
                        if (k && seenAll[k]) return;
                        if (k) seenAll[k] = true;
                        deduped.push(tt);
                    });
                    newTimetables[op] = deduped;
                    window.ODPT_TIMETABLES[op] = deduped;
                    loaded++;
                }
            });
        }

        var promises = ops.map(function(op) {
            var ep = ODPT_ENDPOINTS[op];
            if (!ep.trainTimetable) return Promise.resolve();

            // 所有运营商都按 railway 分批拉取——
            // 原来只有 JR-East 走分批，其他运营商（私铁、地铁等）全量请求被 1000 条截断，
            // 导致大部分私铁线路时刻表数据丢失，线路图上无列车位置。
            var opLineIds = [];
            Object.keys(LINE_TO_OPERATOR).forEach(function(lid) {
                if (LINE_TO_OPERATOR[lid] === op) opLineIds.push(lid);
            });
            if (opLineIds.length === 0) {
                // 没有本地线路映射的operator，回退到全量请求
                return fetchODPT(buildUrl(op, 'trainTimetable')).then(extractData).then(function(data) {
                    if (data && data.length > 0) {
                        newTimetables[op] = data;
                        window.ODPT_TIMETABLES[op] = data;
                        loaded++;
                    }
                });
            }
            return collectTimetableByRailway(op, opLineIds);
        });

        return Promise.all(promises).then(function() {
            // 只有本轮没有 source 请求失败时，才能用统一 timestamp 把聚合结果标记为完整缓存。
            // 部分成功仍保留在内存供当前页面使用，但不覆盖上一份完整持久缓存。
            if (Object.keys(newTimetables).length > 0 && timetableLoadErrors === 0) {
                return saveTimetableCache(newTimetables).then(function() {
                    console.debug("[ODPT] Timetables cached:", loaded, "operators");
                });
            }
            if (timetableLoadErrors > 0) {
                console.warn("[ODPT] Timetable refresh partial; persistent cache preserved. Failed railway requests:", timetableLoadErrors);
            }
        });
    }

    // ========== 加载所有数据（实时数据 + 时刻表）==========
    function loadAllData() {
        // 实时数据和时刻表数据并行加载，实时数据优先返回。
        // 实时数据优先返回，时刻表在后台并行拉取
        // 先读原始实时缓存（stale-while-revalidate）再启动拉取——
        // 缓存命中时新页立即渲染（DataFusion 就绪后推送），拉取完成覆盖，消除切页空窗
        var realtimePromise = loadRawRealtimeCache().then(function() {
            return loadRealtimeData();
        });
        var timetablePromise = loadTimetableData(false);
        // 实时数据先resolve，时刻表不阻塞首屏
        return realtimePromise.then(function() {
            // 时刻表后台继续加载，不阻塞
            timetablePromise.catch(function(e) { console.warn("[ODPT] Timetable load error:", e.message); });
        });
    }

    // ========== 轮询生命周期（visibilitychange 暂停/恢复） ==========
    // 后台标签页（document.hidden）暂停 30s 实时轮询与 5min 时刻表过期检查；
    // 回前台立即拉一次再恢复周期——多标签页下后台页不再产生无效 ODPT 请求。
    var REALTIME_INTERVAL = 30000;
    var TT_CHECK_INTERVAL = 300000;
    var _rtPollTimer = null;
    var _infoPollTimer = null;
    var _ttCheckTimer = null;
    var _lazyMode = false;

    function _realtimeRefresh() {
        var activeOps = Object.keys(_activeRealtimeOperators);
        var delayOnly = _lazyMode && activeOps.length === 0;
        if (delayOnly) return;
        loadRealtimeData(false, activeOps.length ? activeOps : null, true).catch(function(e) { console.warn("[ODPT] Realtime refresh error:", e.message); });
    }
    function startRealtimePolling() {
        if (!_rtPollTimer) _rtPollTimer = setInterval(_realtimeRefresh, (window.RuntimeConfig && window.RuntimeConfig.ODPT_REALTIME_INTERVAL) || REALTIME_INTERVAL);
        if (!_infoPollTimer) _infoPollTimer = setInterval(function() {
            loadRealtimeData(true).catch(function(e) { console.warn('[ODPT] Information refresh error:', e.message); });
        }, (window.RuntimeConfig && window.RuntimeConfig.ODPT_INFORMATION_INTERVAL) || REALTIME_INTERVAL);
    }
    function stopRealtimePolling() {
        if (_rtPollTimer) { clearInterval(_rtPollTimer); _rtPollTimer = null; }
        if (_infoPollTimer) { clearInterval(_infoPollTimer); _infoPollTimer = null; }
    }
    function startTtCheckPolling() {
        if (_ttCheckTimer) return;
        _ttCheckTimer = setInterval(function() {
            shouldRefreshTimetables().then(function(need) {
                if (need) {
                    console.debug("[ODPT] Timetable cache expired, refreshing...");
                    loadTimetableData(true).catch(function(e) { console.warn("[ODPT] Timetable refresh error:", e.message); });
                }
            }).catch(function(e) { console.debug("[ODPT] shouldRefreshTimetables check error:", e.message); });
        }, TT_CHECK_INTERVAL);
    }
    function stopTtCheckPolling() {
        if (_ttCheckTimer) { clearInterval(_ttCheckTimer); _ttCheckTimer = null; }
    }
    function handleVisibilityChange() {
        try {
            if (document.hidden) {
                stopRealtimePolling();
                stopTtCheckPolling();
            } else {
                // 回前台：立即拉一次（不等下一周期），再恢复定时器
                _realtimeRefresh();
                loadRealtimeData(true).catch(function() {});
                startRealtimePolling();
                // lazy 模式（delay-only）不建立时刻表过期检查轮询——保持首页零全量拉取
                if (!_lazyMode) startTtCheckPolling();
            }
        } catch(e) { console.debug("[ODPT] visibilitychange handler error:", e.message); }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', function(event) {
        // Mobile Chrome may restore a page from BFCache without a fresh script
        // initialization. Treat that restore as a foreground transition: fetch a
        // fresh LIVE snapshot now, while the timer guards prevent duplicate polls.
        if (!event.persisted || document.hidden) return;
        try {
            _realtimeRefresh();
            startRealtimePolling();
            if (!_lazyMode) startTtCheckPolling();
        } catch(e) { console.debug("[ODPT] pageshow refresh error:", e.message); }
    });

    // ========== Init ==========
    function init() {
        // 初始加载所有数据
        loadAllData().catch(function(e) { console.warn("[ODPT] Init error:", e.message); });

        // 实时数据每30秒刷新
        startRealtimePolling();

        // 时刻表每小时刷新（检查缓存是否过期）
        startTtCheckPolling();

        console.debug("[ODPT] Client initialized with", Object.keys(ODPT_ENDPOINTS).length, "operators");
    }

    // 请求尽早发起——fetch 不依赖 DOM，脚本执行即请求，不再等 DOMContentLoaded。
    // 惰性模式下首页搜索按需查询时刻表，跳过全量初始化（loadAllData
    // 会拉全部 operator 实时/时刻表，首页首屏不可承受）；搜索模块经 getCompleteTimetable 按需拉取。
    // 惰性模式仍拉延误（TrainInformation，搜索延误徽章需要）并保持周期刷新，
    // 仅跳过列车位置（Train）与时刻表全量（TrainTimetable）——首页请求量 500+ → ~30。
    // 惰性模式追加轻量读时刻表缓存（IDB，不拉 API）——getCompleteTimetable
    // 缓存优先命中 ODPT_TIMETABLES，搜索不再重复打 API；回前台同样立即刷新延误。
    // lazy 同样先读 rawDelay 缓存再拉取——切回搜索页时延误徽章即刻显示。
    if (window.ODPT_LAZY === true) {
        console.debug("[ODPT] Lazy mode enabled - delay-only init");
        _lazyMode = true;
        loadTimetableCache().then(function(cached) {
            if (cached && Object.keys(cached).length > 0) {
                window.ODPT_TIMETABLES = cached;
            }
        }).catch(function(e) { console.debug("[ODPT] Lazy timetable cache read skip:", e.message); });
        loadRawRealtimeCache().then(function() {
            return loadRealtimeData(true);
        }).catch(function(e) { console.warn("[ODPT] Lazy delay init error:", e.message); });
        startRealtimePolling();
    } else {
        init();
    }

})();
