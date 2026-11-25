// Pixel Tetsudo — file:// 协议数据包生成器。
// 从 canonical JSON 重新生成 data/core/*.file.js，使直接双击打开 home.html 时仍可运行。
// file:// 下 fetch 会被 CORS 拦截，但 <script src> 可用。运行：node data/core/gen-file-data.js
// JSON 文件仍是唯一真相源，不改变 Freeze Rule。
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
  // 将数据包压缩为单行 JSON，减少应用加载和解析成本。
  // canonical JSON 源文件保留可读缩进。
  const compact = JSON.stringify(JSON.parse(raw));
  // 转义 "</script" 序列，避免数据包提前结束 script 标签。
  const safe = compact.replace(/<\/script/gi, '<\\/script');
    artifacts.push({
      file: js,
      content: varName + ' = ' + safe + ';\n',
      size: safe.length,
    });
  // 同时为 http(s) 分支生成紧凑 .json 副本。db-loader 加载它们而不是可读源，
  // 以减少 GitHub Pages 上的解析时间。
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
    console.log('已写入', artifact.file, '(', (artifact.size / 1024).toFixed(0), 'KB )');
  }
}

function checkArtifacts(artifacts = buildArtifacts()) {
  let synchronized = true;
  for (const artifact of artifacts) {
    const target = path.join(dir, artifact.file);
    const actual = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (!sameGeneratedText(actual, artifact.content)) {
      console.error('生成产物已过期：', artifact.file);
      synchronized = false;
    }
  }
  if (synchronized) console.log('文件数据生成产物已同步');
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
