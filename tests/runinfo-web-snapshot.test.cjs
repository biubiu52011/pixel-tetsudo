"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {extractOfficialBlock} = require("../tools/refresh-runinfo-web.cjs");

test("Chiba: only active operation block, not another announcement", () => {
  const html = "<h2>運行状況</h2><div>現在、平常通り運行しております。</div>" +
    "<h2>その他情報</h2><p>運転を見合わせています。</p>";
  assert.equal(extractOfficialBlock(html,"ChibaUrbanMonorail").status,"normal");
});
test("Shonan: status icon existence does not replace official text", () => {
  const html = '<h3>モノレール運行情報</h3><img alt="青信号" src="blue.png">' +
    "<p>一部列車に遅れが出ています。</p><h3>定期券のご案内</h3>";
  const r=extractOfficialBlock(html,"ShonanMonorail");
  assert.equal(r.status,"delayed");
});
test("No operational statement must not publish arbitrary navigation", () => {
  assert.equal(extractOfficialBlock("<h2>運行状況</h2><div>問い合わせ</div>","ChibaUrbanMonorail"),null);
});
test("A future construction notice does not become live suspension", () => {
  const r=extractOfficialBlock("<h2>運行状況</h2><p>12月1日から区間運休を実施します。</p>","ChibaUrbanMonorail");
  assert.equal(r.status,"notice");
});
