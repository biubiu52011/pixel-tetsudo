/*
 * Missing railway-line artwork fallback for static hosting.
 * images/鉄道 is not checked in; images/列车 is present and must be preserved.
 * Use colored code badges in the display layer without altering canonical
 * JSON data or its browser cache. Remove the missing prefix once icons return.
 */
(function (global) {
  "use strict";

  var missingLineIcon = /^(?:\.\.\/|\.\/|\/)?images\/鉄道\//;
  var badgeCache = Object.create(null);

  function badgeLabel(line, id) {
    var value = line.code || (line.presentation && line.presentation.code) || id || "?";
    value = String(value).trim() || "?";
    return Array.from(value).slice(0, 3).join("");
  }

  function badgeColor(line) {
    var value = String(line.color || "");
    return /^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(value) ? value : "#6b7280";
  }

  function xmlEscape(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  function badgeImage(line, id) {
    var label = badgeLabel(line, id);
    var color = badgeColor(line);
    var key = color + "|" + label;
    if (badgeCache[key]) return badgeCache[key];
    var n = Array.from(label).length;
    var fontSize = n === 1 ? 24 : (n === 2 ? 19 : 15);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">'
      + '<rect x="2.5" y="2.5" width="43" height="43" rx="8" fill="#fff" stroke="' + color + '" stroke-width="5"/>'
      + '<text x="24" y="31" text-anchor="middle" font-size="' + fontSize + '" font-weight="800"'
      + ' font-family="Arial,Helvetica,sans-serif" fill="#252a30">' + xmlEscape(label) + '</text>'
      + '</svg>';
    badgeCache[key] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    return badgeCache[key];
  }

  function prepareLines(lines) {
    var source = lines || {};
    var result = {};
    Object.keys(source).forEach(function (id) {
      var line = source[id];
      if (!line || typeof line.image !== "string" || !missingLineIcon.test(line.image)) {
        result[id] = line;
        return;
      }
      var displayLine = Object.assign({}, line);
      displayLine.imageOriginal = line.image;
      displayLine.image = badgeImage(line, id);
      displayLine.imageIsFallback = true;
      result[id] = displayLine;
    });
    return result;
  }

  global.RailwayImageFallback = { prepareLines: prepareLines, badgeImage: badgeImage };
})(window);
