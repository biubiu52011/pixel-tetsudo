"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const evaluator = require("../js/runinfo-evaluator.js");

const base = { source: "odpt", currentOperationalSource: true };
const partialText = "常磐線快速電車は、人身事故の影響で、品川〜取手駅間の上下線の一部列車に遅れと運休がでています。";

test("Joban Rapid: partial cancellations with delays are not a service suspension", () => {
  const r = evaluator.evaluate({ ...base, text: partialText });
  assert.equal(r.status, "delayed");
  assert.equal(r.symbol, "△");
  assert.equal(r.effect, "partial_cancellation");
  assert.equal(r.interval, "品川→取手駅");
  assert.equal(r.direction, "both");
  assert.equal(r.cause, "人身事故");
  assert.ok(r.impacts.some(x => x.effect === "partial_cancellation" && x.direction === "both"));
});

test("partial cancellation text overrides generic structured Suspension", () => {
  const r = evaluator.evaluate({ ...base, text: partialText, structuredStatus: "odpt.TrainInformationStatus:Suspension" });
  assert.equal(r.status, "delayed");
  assert.ok(r.evidence.some(x => x.type === "PARTIAL_CANCELLATION_OVERRIDES_GENERIC_SUSPENSION"));
});

test("independent official suspension signal is authoritative", () => {
  const r = evaluator.evaluate({ ...base, text: partialText, signalStatus: "suspended" });
  assert.equal(r.status, "suspended");
});

const cases = [
  ["一部の列車が運休しています。", "delayed"],
  ["品川駅〜取手駅間の上り線の一部列車に運休が発生しています。", "delayed"],
  ["全線の一部列車に遅れと運休がでています。", "delayed"],
  ["一部列車が運休しています。", "delayed"],
  ["全列車が運休しています。", "suspended"],
  ["全線で運休しています。", "suspended"],
  ["品川駅〜取手駅間の上下線で運転を見合わせています。", "suspended"],
  ["上り線では運転を見合わせています。", "suspended"],
  ["品川駅〜取手駅間は運休しています。", "suspended"],
  ["一部の列車で運転を見合わせています。", "suspended"],
  ["直通運転を中止しています。", "notice"],
  ["平常通り運転しています。", "normal"],
  ["人身事故のため運転を見合わせていましたが、運転を再開し、現在一部列車に遅れと運休が発生しています。", "delayed"]
];
cases.forEach(([message, status]) => {
  test(message, () => {
    assert.equal(evaluator.evaluate({ ...base, text: message }).status, status);
  });
});
