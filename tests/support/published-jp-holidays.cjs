'use strict';
// Pull the calendar from the same runtime owner as the frontend, not a test
// copy of Japanese holidays. Keep browser globals isolated in a VM context.
const fs=require('node:fs');
const vm=require('node:vm');
const context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('data/core/runtime-config.js','utf8'),context,
  {filename:'data/core/runtime-config.js'});
if(!context.window.RuntimeConfig?.PUBLISHED_JP_HOLIDAYS)
  throw new Error('Published holiday policy missing from runtime-config');
module.exports=context.window.RuntimeConfig.PUBLISHED_JP_HOLIDAYS;
