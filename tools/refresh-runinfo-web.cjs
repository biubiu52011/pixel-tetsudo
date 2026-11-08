"use strict";
/*
 * Static-site run-information collection, executed by scheduled GitHub Actions.
 * No browser proxy, paid API, or resident server is needed. The official HTML
 * is never guessed from an icon URL; only a present operational text claim is
 * published. A failure preserves the old timestamp so browsers reject staleness.
 */
const fs = require("node:fs");
const path = require("node:path");
const evaluator = require("../js/runinfo-evaluator.js");

const TARGET = path.join(__dirname, "../data/runinfo-web-snapshot.json");
const SOURCES = {
  ChibaUrbanMonorail: { url: "https://chiba-monorail.co.jp/", heading: "運行状況" },
  ShonanMonorail: { url: "https://www.shonan-monorail.co.jp/", heading: "モノレール運行情報" }
};

function decodeEntities(s) {
  return s.replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi, (_,hex,dec) => {
    const cp = parseInt(hex || dec, hex ? 16 : 10);
    return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
  }).replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/gi, m =>
    ({ "&nbsp;":" ", "&amp;":"&", "&lt;":"<", "&gt;":">",
       "&quot;":'"', "&apos;":"'", "&#39;":"'" })[m.toLowerCase()] || m);
}

function htmlLines(html) {
  return decodeEntities(String(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(?:script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|svg)>/gi, " ")
    .replace(/<(?:\/)?(?:a|br|div|p|li|section|article|header|h[1-6]|span|tr|td|dl|dt|dd)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " "))
    .split(/\r?\n/).map(x => x.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function extractOfficialBlock(html, operator) {
  const src = SOURCES[operator];
  if (!src) return null;
  const lines = htmlLines(html);
  const start = lines.findIndex(x => x === src.heading || (x.length <= 35 && x.includes(src.heading)));
  if (start < 0) return null;
  const stop = /^(?:その他情報|定期券のご案内|遅延証明書|団体割引|最新情報|お知らせ|時刻表|お問い合わせ|サイトマップ)/;
  const body = [];
  for (let i=start+1; i<lines.length && i<start+24; i++) {
    if (stop.test(lines[i])) break;
    if (/^(?:青信号|黄信号|赤信号|アイコン|信号画像|Image)$/i.test(lines[i])) continue;
    body.push(lines[i]);
    if (body.join("").length >= 1200) break;
  }
  if (!body.length) return null;
  // HTML layouts may split a sentence across nested elements. Evaluate a
  // short ordered block and require an actual operational classification.
  const detail = body.join(" ").slice(0,1200);
  const evaluation = evaluator.evaluate({ source: "official_web",
    currentOperationalSource: true, text: detail });
  if (!["normal","delayed","suspended","notice"].includes(evaluation.status)) return null;
  const evidence = evaluation.evidence || [];
  if (!evidence.some(x => x.type && x.type.startsWith("EVENT_CURRENT_")) &&
      !evidence.some(x => x.type && x.type.startsWith("EVENT_PLANNED_"))) return null;
  return { status: evaluation.status, interval: evaluation.interval || null,
    cause: evaluation.cause || null, detail };
}

async function retrieve(op) {
  const src = SOURCES[op], res = await fetch(src.url, {
    headers: { "User-Agent": "PixelTetsudo-OfficialRunInfoCache/1.0", "Accept": "text/html" },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const type = res.headers.get("content-type") || "";
  if (type && !/(?:html|text\/plain)/i.test(type)) throw new Error("Unexpected MIME type " + type);
  const html = await res.text();
  if (html.length > 2_000_000) throw new Error("Unexpectedly large HTML");
  return extractOfficialBlock(html, op);
}

async function main() {
  let data = {version: 1, operators: {}};
  try {
    const existing = JSON.parse(fs.readFileSync(TARGET, "utf8"));
    if (existing.version === 1 && existing.operators) data = existing;
  } catch (_) {}
  const results = await Promise.allSettled(Object.keys(SOURCES).map(async op => {
    const parsed = await retrieve(op);
    if (!parsed) throw new Error("No current operational status in official HTML");
    return {op, ...parsed};
  }));
  let updates = 0;
  for (const [i,res] of results.entries()) {
    const op = Object.keys(SOURCES)[i];
    if (res.status !== "fulfilled") {
      console.warn("[runinfo] " + op + ": " + (res.reason?.message || res.reason));
      continue;
    }
    const item = res.value;
    data.operators[op] = { status: item.status, interval: item.interval,
      cause: item.cause, detail: item.detail, updatedAt: new Date().toISOString(),
      sourceUrl: SOURCES[op].url };
    updates++;
    console.log("[runinfo] " + op + ": " + item.status);
  }
  if (!updates) {
    console.warn("[runinfo] No fresh official data collected; leaving the existing snapshot unchanged.");
    return;
  }
  fs.mkdirSync(path.dirname(TARGET), {recursive:true});
  fs.writeFileSync(TARGET, JSON.stringify(data,null,2)+"\n");
}

if (require.main === module) main().catch(e => {console.error(e);process.exitCode=1;});
module.exports = {htmlLines, extractOfficialBlock, SOURCES};
