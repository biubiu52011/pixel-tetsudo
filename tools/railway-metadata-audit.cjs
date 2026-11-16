'use strict';
/**
 * Static railway, station, artwork and SQL-export snapshot audit.
 * This NEVER contacts production Supabase and NEVER authorizes a vehicle model.
 * To refresh the snapshot, rerun the connected Supabase read-only exports;
 * a snapshot is not evidence of what production will contain after this date.
 * Run: node tools/railway-metadata-audit.cjs --strict
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const readJson = (root, name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const norm = value => decodeURIComponent(String(value || '')
  .split('?')[0].replace(/^(?:\.\.\/|\.\/|\/)+/g, ''));
const clean = value => String(value || '').toLowerCase();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = arr => [...arr].sort();
const isHex = value => /^#[0-9a-f]{6}$/i.test(String(value || ''));
function listPng(root) {
  const base = path.join(root, 'images/列车');
  const paths = [];
  function visit(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) visit(file);
      else if (item.isFile() && /\.png$/i.test(item.name))
        paths.push(path.relative(root, file).replace(/\\/g, '/'));
    }
  }
  visit(base);
  return sorted(paths);
}
function fileExists(root, image) {
  const rel = norm(image);
  return rel.startsWith('images/') && fs.existsSync(path.join(root, rel));
}
function inspect(root = path.resolve(__dirname, '..')) {
  const canonical = readJson(root, 'data/core/railway_data.json');
  const gaps = readJson(root, 'data/audits/railway-metadata-known-gaps-20261117.json');
  const snapshot = readJson(root, 'data/audits/supabase-railway-audit-snapshot-20261116.json');
  const ids = Object.keys(canonical.lines || {});
  const errors = [], warnings = [];
  const palette = {}, missingCoordinates = [], missingIcons = [];
  const missingPresentation = [], missingType = [], missingRegion = [];
  const missingTranslations = [];
  const seen = new Set(ids);
  const known = gaps.palette_differences || {};
  const knownMissingCoords = new Set(gaps.lines_with_incomplete_static_coordinates || []);
  const knownPending = new Set((gaps.pending_sql_registration || []).map(x => x.id));
  const knownDrift = new Set(gaps.known_sql_station_drift_ids || []);

  for (const id of ids) {
    const line = canonical.lines[id], display = line.presentation || {};
    if (!isHex(line.color)) errors.push('Invalid base line color: ' + id);
    if (display.color && !isHex(display.color))
      errors.push('Invalid presentation line color: ' + id);
    if (!line.type) missingType.push(id);
    if (!line.region) missingRegion.push(id);
    if (!line.presentation) missingPresentation.push(id);
    if (['nameJa','nameZh','nameEn','nameKo'].some(k => !line[k]))
      missingTranslations.push(id);
    if (!Array.isArray(line.stations) || line.stations.length < 2)
      errors.push('Invalid station array: ' + id);
    else if (line.stations.some(st => {
      const p = canonical.stations?.[st];
      return !p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng);
    })) missingCoordinates.push(id);
    if (line.branchOf && !seen.has(line.branchOf))
      errors.push('Unknown branch parent: ' + id + ' -> ' + line.branchOf);
    for (const child of display.lineIds || [])
      if (!seen.has(child)) errors.push('Unknown display member: ' + id + ' -> ' + child);
    if (!line.image && !display.icon) missingIcons.push(id);
    for (const icon of [line.image, display.icon].filter(Boolean))
      if (!fileExists(root, icon)) errors.push('Missing railway icon: ' + id + ' -> ' + icon);
    if (display.color && clean(display.color) !== clean(line.color)) {
      palette[id] = {base:line.color, display:display.color};
      const exception = known[id];
      if (!exception || !same(exception, palette[id]))
        errors.push('Unreviewed palette divergence: ' + id);
    }
  }
  for (const id of missingCoordinates)
    if (!knownMissingCoords.has(id)) errors.push('New incomplete coordinates: ' + id);
  for (const id of missingIcons)
    if (!(gaps.lines_without_own_icon || []).includes(id))
      errors.push('New missing line icon: ' + id);
  for (const id of missingTranslations)
    if (id !== 'Yahiko') errors.push('New incomplete translation: ' + id);
  if (!same(canonical, readJson(root, 'data/core/railway_data.compact.json')))
    errors.push('Canonical JSON and compact bundle differ');

  const sqlIds = new Set(snapshot.railway_lines.map(row => row.id));
  for (const row of snapshot.railway_lines)
    if (!seen.has(row.id)) errors.push('SQL snapshot contains unknown route: ' + row.id);
  const unregistered = ids.filter(id => !sqlIds.has(id));
  for (const id of unregistered)
    if (!knownPending.has(id)) errors.push('New frontend-only SQL gap: ' + id);
  const drift = [];
  for (const [id, stops] of Object.entries(snapshot.line_stations || {})) {
    if (!seen.has(id)) {errors.push('SQL station list for unknown route: ' + id);continue;}
    if (!same(stops, canonical.lines[id].stations)) {
      drift.push(id);
      if (!knownDrift.has(id)) errors.push('New station order/identity conflict: ' + id);
    }
  }
  const pinnedNoStations = new Set(['ChikuhiWest','Nikko','OitoWest','TohokuRifu']);
  for (const row of snapshot.railway_lines)
    if (!Object.hasOwn(snapshot.line_stations, row.id) && !pinnedNoStations.has(row.id))
      errors.push('SQL route has no station topology: ' + row.id);

  const assets = snapshot.vehicle_image_assets || [];
  const approvedReview = new Set(gaps.review_required_asset_paths || []);
  const missingAssetFiles = [];
  for (const row of assets) {
    if (!fileExists(root, row.image_path)) {
      missingAssetFiles.push(row.image_path);
      if (!approvedReview.has(row.image_path))
        errors.push('New missing SQL PNG asset: ' + row.image_path);
    }
    if (approvedReview.has(row.image_path) && row.appearance_class !== 'requires_review')
      errors.push('Reviewed/unsafe artwork not quarantined in SQL snapshot: ' + row.image_path);
  }
  for (const file of approvedReview)
    if (!assets.some(a => a.image_path === file))
      errors.push('Known quarantined SQL asset missing from snapshot: ' + file);

  const rangeList = snapshot.published_train_png_number_ranges || [];
  const collisions = [];
  for (const row of rangeList) {
    if (!seen.has(row.line_key)) errors.push('PNG range has unknown route: ' + row.line_key);
    if (!fileExists(root, row.png_reference))
      errors.push('PNG range references missing artwork: ' + row.line_key + ' -> ' + row.png_reference);
    if (!Number.isFinite(row.min_number) || !Number.isFinite(row.max_number) ||
        row.min_number > row.max_number)
      errors.push('Malformed train number range: ' + row.line_key + ' / ' + row.segment_key);
    if (row.requires_exact_roster !== true)
      errors.push('PNG range lacks exact-train-roster guard: ' + row.line_key);
    if (row.actual_vehicle_confirmed)
      errors.push('Train-number family incorrectly asserts actual carset: ' + row.line_key);
  }
  for (let i = 0; i < rangeList.length; i++)
    for (let j = i + 1; j < rangeList.length; j++) {
      const a = rangeList[i], b = rangeList[j];
      if (a.line_key !== b.line_key || a.suffix !== b.suffix ||
          a.min_number > b.max_number || b.min_number > a.max_number) continue;
      collisions.push([a.line_key, a.segment_key, b.segment_key]);
      if (!a.requires_exact_roster || !b.requires_exact_roster)
        errors.push('Unprotected overlapping train-number rules: ' + a.line_key);
    }
  const rangeJs = fs.readFileSync(path.join(root, 'data/timetables/train-number-png-ranges.js'), 'utf8');
  for (const match of rangeJs.matchAll(/\bpngPath\s*:\s*['"]([^'"]+\.png)['"]/g))
    if (!fileExists(root, match[1]))
      errors.push('JS number->PNG path not found: ' + match[1]);

  const png = listPng(root), hashGroups = new Map();
  if (!png.length) errors.push('Train PNG library is empty or unavailable');
  for (const file of png) {
    const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    if (!hashGroups.has(sha)) hashGroups.set(sha, []);
    hashGroups.get(sha).push(file);
  }
  const duplicateGroups = [...hashGroups.values()].filter(g => g.length > 1).map(sorted);
  const baselineGroups = (gaps.known_duplicate_png_groups || []).map(sorted);
  const groupSignature = g => JSON.stringify(sorted(g));
  const knownGroupSignatures = new Set(baselineGroups.map(groupSignature));
  for (const group of duplicateGroups)
    if (!knownGroupSignatures.has(groupSignature(group)))
      errors.push('New byte-identical PNG group: ' + group.join(' / '));
  const gallery = fs.readFileSync(path.join(root, 'data/timetables/vehicle-garage-png-map.js'),'utf8');
  for (const file of approvedReview) {
    if (!fileExists(root, file)) continue; // SQL-only missing original, no substitute guessed
    if (!gallery.includes(file.replace('images/列车/', '')))
      errors.push('Quarantined gallery artwork absent in gallery registry: ' + file);
  }

  if (missingCoordinates.length) warnings.push(missingCoordinates.length +
      ' routes have at least one unresolved static station coordinate');
  if (Object.keys(palette).length) warnings.push(Object.keys(palette).length +
      ' base/presentation color differences require official palette review');
  if (unregistered.length) warnings.push(unregistered.length +
      ' GitHub routes still await trustworthy SQL topology or identity review');
  if (drift.length) warnings.push(drift.length +
      ' SQL station sequences still differ from frontend canonical topology');
  if (missingAssetFiles.length) warnings.push(missingAssetFiles.length +
      ' SQL artwork paths do not exist in GitHub; review classification required');
  return {
    errors, warnings,
    summary: {
      canonical_lines: ids.length, snapshot_sql_lines: sqlIds.size,
      sql_unregistered_lines: unregistered.length,
      line_color_differences: Object.keys(palette).length,
      missing_coordinate_lines: missingCoordinates.length,
      missing_icon_lines: missingIcons.length,
      missing_type_lines: missingType.length,
      missing_region_lines: missingRegion.length,
      missing_presentation_lines: missingPresentation.length,
      missing_translations: missingTranslations.length,
      sql_station_drift_lines: drift.length,
      source_png_files: png.length,
      sql_png_asset_records: assets.length,
      sql_missing_png_files: missingAssetFiles.length,
      sql_train_number_png_rules: rangeList.length,
      overlapping_sql_number_range_pairs: collisions.length,
      byte_identical_png_groups: duplicateGroups.length
    }
  };
}
if (require.main === module) {
  const result = inspect();
  console.log(JSON.stringify(result, null, 2));
  if (process.argv.includes('--strict') && result.errors.length) process.exitCode = 1;
}
module.exports = {inspect, listPng, norm};
