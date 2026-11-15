# 東武佐野線 TI — 2026-11 静的区間時間・番号PNG監査

監査日: 2026-11-15。対象 `pages/trains.html#Sano`。

## 結論と根拠の強さ

- 東武公式路線案内: 館林 → 渡瀬 → 田島 → 佐野市 → 佐野 → 堀米 → 吉水 → 田沼 → 多田 → 葛生、10駅。
- 正規路線色: TI 赤 `#FF0000`、共用TI PNG、変更なし。
- Supabase `public.manual_timetable_templates` の `line_key='Sano'` は126件（Weekday 63・SaturdayHoliday 63）、異なる番号63種類で、`manual_timetable_template_stops` に到着・発車を別々に保存している。
- 内訳は普通（奇数601E～659Eの30本、偶数602E～662Eの31本）、リバティ特急1643と1612。通常ダイヤでは片道31本・逆方向32本。
- ただし既存126件には `source_revision_date` と `source_trip_id` がない。記録された `source_path='data/timetables/Sano-manual.js'` は現行GitHubに存在しない。つまり、過去のDBにある記録を2026-11全日有効と認証できない。
- 公開GTFS衍生の2026年11月14日表と601E/603E・1612/1643などの時刻に整合あり。**一部の照合は全件の日付検証を意味しない。**

## 区間走行時間の変更（幾何代表値）

SQL停止情報について `calendar_urn='odpt.Calendar:SaturdayHoliday'` かつ普通列車に限定し、隣接駅の前駅**発時刻**→次駅**着時刻**の差を取り、上下線を同じ館林→葛生順へ揃えて区間ごとに中位数を計算した。

| 区間 | 中位数（分） | サンプル数 |
| --- | ---: | ---: |
| 館林–渡瀬 | 3 | 60 |
| 渡瀬–田島 | 5 | 60 |
| 田島–佐野市 | 3 | 60 |
| 佐野市–佐野 | 3 | 60 |
| 佐野–堀米 | 3 | 60 |
| 堀米–吉水 | 3 | 61 |
| 吉水–田沼 | 3 | 61 |
| 田沼–多田 | 2 | 61 |
| 多田–葛生 | 4 | 61 |

`durations=[3,5,3,3,3,3,3,2,4]`、走行時間代表値の和は29分。これは**駅停車時間を除外した区間の中位数の合計**であり、時刻表全区間の所要時間ではない。故に `durationTotalMin=null` を維持。

例: 601E 05:27 館林発→06:07 葛生着は40分（佐野駅に約7分の停車）、603E 05:54→06:28 は34分。具体的な列車位置・直通・折り返しは個別の到着・発時刻を使う。

## 列車番号 → PNG（表示用リファレンス）

- 普通列車61番号：`10000系列` という既存SQLの粗い車両種別ラベルのみ。車種サブタイプは確認不可。既存 `東武鉄道_10030型_50番台_更新車.png` を１枚の**参考図**として採用する（実車の形式・編成を確定しない）。
- 特急1612 / 1643：既存SQLは `東武500系`、東武公式2026年特急時刻表もリバティを掲載。既存 `東武鉄道_500系_リバティ.png` を参考図とする（個別編成・塗装は未確認）。
- 判定条件：`Sano` 統一ID、`odpt.Railway:Tobu.Sano`、Tobu運行者、列車番号・種別・方向、2026-11の表示版、Weekday/holiday明示、`supabase-train-run` かつ推定位置だけ。
- **禁止**：他路線混入、自由テキストからPNG断定、車両編成番号の推定、未検証の日時を実際の運行として認定、同時刻だけで伊勢崎線344Eを佐野線635Eと同一車両に結合。
- 番号マッピングだけでは列車位置を生成しない。実車が確定済みならその結果を優先。通常列車の編成画像も常に `actualVehicleConfirmed=false`。

## 実装境界

- 時刻表DBのhistorical-undatedデータは保存・閲覧にとどめ、本変更では `source_revision_date` や `operating_dates` に偽の値を補完しない。
- `REALTIME_POSITION_API_LINES.Sano=true` はAPIを調べる資格であり、佐野線の全線リアルタイムを証明しない。`REALTIME_POSITION_POLICY.defaultMode=HYBRID` は現状維持。
- DBレコードの実際の日付に対応するGTFS発車・着時刻とサービス例外を照合するまでは、「2026年11月全件公式確定」の表記は禁止。

## 公開出典

- 東武公式佐野線: https://www.tobu.co.jp/railway/guide/line/sano_line.html
- 公共交通オープンデータ由来のGTFS参照表（11/14）: https://tabinomemo.jp/train/timetable/tobu/14
- 東武公式特急下り（2026/3/14改正）: https://www.tobu.co.jp/pdf/timetable/time-table_02_kudari.pdf?202603=
- 東武公式特急上り（2026/3/14改正）: https://www.tobu.co.jp/pdf/timetable/time-table_02_nobori.pdf?202603=
- 東武公式車両一覧: https://www.tobu.co.jp/corporation/rail/vehicles/
