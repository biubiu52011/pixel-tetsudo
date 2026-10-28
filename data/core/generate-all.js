// Pixel Tetsudo — canonical generated-artifact entry point.
//
// Keep data generation in one command so a source change cannot leave the
// file:// bundles and the static config bundle out of sync.
// Usage:
//   node data/core/generate-all.js          regenerate all active artifacts
//   node data/core/generate-all.js --check  verify all active artifacts
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
