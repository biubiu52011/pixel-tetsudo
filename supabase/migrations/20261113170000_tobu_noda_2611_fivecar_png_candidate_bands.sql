-- 東武アーバンパークライン / Noda (TD): numbered five-car PNG candidate bands.
-- Verified exact public train-number roster: 2026-11-04, 38 each direction.
-- https://www.tobu.co.jp/cms-pdf/news/20261103204035MJuKcsv6odNCVl1zTmYjrw.pdf
-- Official 60000 5-car / 80000 & 80050 families:
-- https://www.tobu.co.jp/corporation/rail/vehicles/
-- NOT a train-number -> vehicle-series assignment: BOTH PNGs are candidates.
-- Ranges only index the exact_train_numbers whitelist. Never interpret a
-- numeric gap, a different date, or a different direction as a verified train.
-- Do not insert ambiguous data into published_train_png_number_ranges,
-- whose vehicle_model/png_reference columns represent ONE selected model.

CREATE TABLE IF NOT EXISTS public.published_tobu_noda_fivecar_png_bands (
  edition text NOT NULL DEFAULT '2611' CHECK (edition = '2611'),
  line_key text NOT NULL DEFAULT 'Noda' CHECK (line_key = 'Noda'),
  source_railway text NOT NULL DEFAULT 'odpt.Railway:Tobu.TobuUrbanPark'
    CHECK (source_railway = 'odpt.Railway:Tobu.TobuUrbanPark'),
  service_date date NOT NULL,
  direction_urn text NOT NULL
    CHECK (direction_urn IN ('odpt.RailDirection:Outbound', 'odpt.RailDirection:Inbound')),
  min_number integer NOT NULL,
  max_number integer NOT NULL CHECK (max_number >= min_number),
  suffix text NOT NULL DEFAULT 'A' CHECK (suffix = 'A'),
  exact_train_numbers text[] NOT NULL CHECK (cardinality(exact_train_numbers) > 0),
  composition_cars integer NOT NULL DEFAULT 5 CHECK (composition_cars = 5),
  candidate_models text[] NOT NULL CHECK (cardinality(candidate_models) = 2),
  candidate_png_paths text[] NOT NULL CHECK (cardinality(candidate_png_paths) = 2),
  source_url text NOT NULL,
  requires_exact_roster boolean NOT NULL DEFAULT true CHECK (requires_exact_roster),
  authorizes_png boolean NOT NULL DEFAULT false CHECK (NOT authorizes_png),
  actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK (NOT actual_vehicle_confirmed),
  PRIMARY KEY (edition,line_key,service_date,direction_urn,min_number,max_number)
);

ALTER TABLE public.published_tobu_noda_fivecar_png_bands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.published_tobu_noda_fivecar_png_bands FROM anon, authenticated;

COMMENT ON TABLE public.published_tobu_noda_fivecar_png_bands IS
  'Date/direction-scoped verified train-number bands for Tobu Noda five-car runs. Two candidate PNGs, no single-model authorization.';
COMMENT ON COLUMN public.published_tobu_noda_fivecar_png_bands.exact_train_numbers IS
  'Authority is this whitelist, not the enclosing numeric range. Only morning women-only-car operating hours were published.';

WITH rows AS (
  SELECT *
  FROM jsonb_to_recordset($noda_bands$
[
  {
    "service_date": "2026-11-04",
    "direction_urn": "odpt.RailDirection:Outbound",
    "min_number": 100,
    "max_number": 199,
    "exact_train_numbers": [
      "101A",
      "105A",
      "107A",
      "111A",
      "119A",
      "121A",
      "123A",
      "125A",
      "133A",
      "135A",
      "145A",
      "147A",
      "149A",
      "159A",
      "161A",
      "169A",
      "171A",
      "173A"
    ],
    "candidate_models": [
      "東武60000系",
      "東武80000系"
    ],
    "candidate_png_paths": [
      "../images/列车/東武鉄道/東武鉄道_60000系.png",
      "../images/列车/東武鉄道/東武鉄道_80000系.png"
    ]
  },
  {
    "service_date": "2026-11-04",
    "direction_urn": "odpt.RailDirection:Outbound",
    "min_number": 400,
    "max_number": 499,
    "exact_train_numbers": [
      "401A",
      "413A",
      "419A",
      "423A",
      "427A",
      "433A",
      "437A",
      "439A",
      "441A",
      "445A",
      "447A",
      "453A",
      "463A"
    ],
    "candidate_models": [
      "東武60000系",
      "東武80000系"
    ],
    "candidate_png_paths": [
      "../images/列车/東武鉄道/東武鉄道_60000系.png",
      "../images/列车/東武鉄道/東武鉄道_80000系.png"
    ]
  },
  {
    "service_date": "2026-11-04",
    "direction_urn": "odpt.RailDirection:Outbound",
    "min_number": 800,
    "max_number": 899,
    "exact_train_numbers": [
      "805A",
      "813A",
      "821A",
      "825A"
    ],
    "candidate_models": [
      "東武60000系",
      "東武80000系"
    ],
    "candidate_png_paths": [
      "../images/列车/東武鉄道/東武鉄道_60000系.png",
      "../images/列车/東武鉄道/東武鉄道_80000系.png"
    ]
  },
  {
    "service_date": "2026-11-04",
    "direction_urn": "odpt.RailDirection:Outbound",
    "min_number": 2100,
    "max_number": 2199,
    "exact_train_numbers": [
      "2103A",
      "2105A",
      "2107A"
    ],
    "candidate_models": [
      "東武60000系",
      "東武80000系"
    ],
    "candidate_png_paths": [
      "../images/列车/東武鉄道/東武鉄道_60000系.png",
      "../images/列车/東武鉄道/東武鉄道_80000系.png"
    ]
  },
  {
    "service_date": "2026-11-04",
    "direction_urn": "odpt.RailDirection:Inbound",
    "min_number": 100,
    "max_number": 199,
    "exact_train_numbers": [
      "104A",
      "108A",
      "110A",
      "116A",
      "118A",
      "122A",
      "128A",
      "130A",
      "132A",
      "140A",
      "142A",
      "144A",
      "152A",
      "154A",
      "156A",
      "158A",
      "164A",
      "168A"
    ],
    "candidate_models": [
      "東武60000系",
      "東武80000系"
    ],
    "candidate_png_paths": [
      "../images/列车/東武鉄道/東武鉄道_60000系.png",
      "../images/列车/東武鉄道/東武鉄道_80000系.png"
    ]
  },
  {
    "service_date": "2026-11-04",
    "direction_urn": "odpt.RailDirection:Inbound",
    "min_number": 400,
    "max_number": 499,
    "exact_train_numbers": [
      "404A",
      "406A",
      "418A",
      "424A",
      "428A",
      "432A",
      "438A",
      "442A",
      "444A",
      "448A"
    ],
    "candidate_models": [
      "東武60000系",
      "東武80000系"
    ],
    "candidate_png_paths": [
      "../images/列车/東武鉄道/東武鉄道_60000系.png",
      "../images/列车/東武鉄道/東武鉄道_80000系.png"
    ]
  },
  {
    "service_date": "2026-11-04",
    "direction_urn": "odpt.RailDirection:Inbound",
    "min_number": 700,
    "max_number": 799,
    "exact_train_numbers": [
      "706A",
      "710A"
    ],
    "candidate_models": [
      "東武60000系",
      "東武80000系"
    ],
    "candidate_png_paths": [
      "../images/列车/東武鉄道/東武鉄道_60000系.png",
      "../images/列车/東武鉄道/東武鉄道_80000系.png"
    ]
  },
  {
    "service_date": "2026-11-04",
    "direction_urn": "odpt.RailDirection:Inbound",
    "min_number": 800,
    "max_number": 899,
    "exact_train_numbers": [
      "806A",
      "818A",
      "822A",
      "830A"
    ],
    "candidate_models": [
      "東武60000系",
      "東武80000系"
    ],
    "candidate_png_paths": [
      "../images/列车/東武鉄道/東武鉄道_60000系.png",
      "../images/列车/東武鉄道/東武鉄道_80000系.png"
    ]
  },
  {
    "service_date": "2026-11-04",
    "direction_urn": "odpt.RailDirection:Inbound",
    "min_number": 2100,
    "max_number": 2199,
    "exact_train_numbers": [
      "2102A",
      "2110A"
    ],
    "candidate_models": [
      "東武60000系",
      "東武80000系"
    ],
    "candidate_png_paths": [
      "../images/列车/東武鉄道/東武鉄道_60000系.png",
      "../images/列车/東武鉄道/東武鉄道_80000系.png"
    ]
  },
  {
    "service_date": "2026-11-04",
    "direction_urn": "odpt.RailDirection:Inbound",
    "min_number": 3400,
    "max_number": 3499,
    "exact_train_numbers": [
      "3402A",
      "3404A"
    ],
    "candidate_models": [
      "東武60000系",
      "東武80000系"
    ],
    "candidate_png_paths": [
      "../images/列车/東武鉄道/東武鉄道_60000系.png",
      "../images/列车/東武鉄道/東武鉄道_80000系.png"
    ]
  }
]
$noda_bands$::jsonb) AS x (
    service_date date,
    direction_urn text,
    min_number integer,
    max_number integer,
    exact_train_numbers text[],
    candidate_models text[],
    candidate_png_paths text[]
  )
)
INSERT INTO public.published_tobu_noda_fivecar_png_bands
  (edition,line_key,source_railway,service_date,direction_urn,
   min_number,max_number,suffix,exact_train_numbers,composition_cars,
   candidate_models,candidate_png_paths,source_url,requires_exact_roster,
   authorizes_png,actual_vehicle_confirmed)
SELECT
  '2611','Noda','odpt.Railway:Tobu.TobuUrbanPark',service_date,direction_urn,
  min_number,max_number,'A',exact_train_numbers,5,
  candidate_models,candidate_png_paths,
  'https://www.tobu.co.jp/cms-pdf/news/20261103204035MJuKcsv6odNCVl1zTmYjrw.pdf',
  true,false,false
FROM rows
ON CONFLICT (edition,line_key,service_date,direction_urn,min_number,max_number)
  DO NOTHING;
