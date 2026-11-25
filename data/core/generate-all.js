// Pixel Tetsudo — canonical 生成产物统一入口。
//
// 将数据生成集中在一个命令中，避免源变更后 file:// 数据包与静态配置包失去同步。
// 用法：
//   node data/core/generate-all.js          重新生成全部现役产物
//   node data/core/generate-all.js --check  检查全部现役产物
'use strict';

const fileData = require('./gen-file-data.js');
const configBundle = require('./gen-config-bundle.js');

function main() {
  const check = process.argv.includes('--check');
  const fileDataOk = check
    ? fileData.checkArtifacts()
    : (fileData.writeArtifacts(), true);
  const configOk = check
    ? configBundle.checkBundle()
    : (configBundle.writeBundle(), true);

  if (check && (!fileDataOk || !configOk)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { main };
