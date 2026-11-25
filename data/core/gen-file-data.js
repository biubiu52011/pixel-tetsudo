// Pixel Tetsudo — file:// protocol data bundle generator.
// Regenerates data/core/*.file.js from the canonical JSON files so the app
// works when home.html is opened by double-click (fetch is CORS-blocked under
// file://, but <script src> is not). Run: node data/core/gen-file-data.js
// The JSON files remain the single source of truth (Freeze Rule untouched).
const fs = require('fs');
const path = require('path');
const { sameGeneratedText } = require('./generated-text.js');
const dir = __dirname;

const pairs = [
  ['railway_data.json', 'railway-data.file.js', 'window.RAILWAY_DATA'],
  ['station_i18n.json', 'station-i18n.file.js', 'window.RAILWAY_I18N'],
  ['tourism_data.json', 'tourism-data.file.js', 'window.RAILWAY_TOURISM']
];

function buildArtifacts() {
  const artifacts = [];
  for (const [json, js, varName] of pairs) {
  const raw = fs.readFileSync(path.join(dir, json), 'utf8');
  // Compact the bundle (single-line JSON) so the app loads and parses it faster.
  // The canonical JSON source files stay pretty-printed for readability.
  const compact = JSON.stringify(JSON.parse(raw));
  // Escape "</script" sequences so the bundle cannot close the script tag early.
  const safe = compact.replace(/<\/script/gi, '<\\/script');
    artifacts.push({
      file: js,
      content: varName + ' = ' + safe + ';\n',
      size: safe.length,
    });
  // Also emit a compact .json twin for the http(s) branch (db-loader fetches
  // these instead of the pretty sources, cutting parse time on GitHub Pages).
  const compactJson = json.replace(/\.json$/, '.compact.json');
    artifacts.push({
      file: compactJson,
      content: compact + '\n',
      size: compact.length,
    });
  }
  return artifacts;
}

function writeArtifacts(artifacts = buildArtifacts()) {
  for (const artifact of artifacts) {
    fs.writeFileSync(path.join(dir, artifact.file), artifact.content);
    console.log('wrote', artifact.file, '(', (artifact.size / 1024).toFixed(0), 'KB )');
  }
}

function checkArtifacts(artifacts = buildArtifacts()) {
  let synchronized = true;
  for (const artifact of artifacts) {
    const target = path.join(dir, artifact.file);
    const actual = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (!sameGeneratedText(actual, artifact.content)) {
      console.error('stale generated artifact:', artifact.file);
      synchronized = false;
    }
  }
  if (synchronized) console.log('file data artifacts are synchronized');
  return synchronized;
}

function main() {
  const artifacts = buildArtifacts();
  if (process.argv.includes('--check')) {
    if (!checkArtifacts(artifacts)) process.exitCode = 1;
    return;
  }
  writeArtifacts(artifacts);
}

if (require.main === module) main();

module.exports = { buildArtifacts, writeArtifacts, checkArtifacts, pairs };
