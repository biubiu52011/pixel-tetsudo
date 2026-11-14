/* Tojo/Ogose scoped scheduled fleet constraints, 2026-11.
 * These are PLANNED candidate families, not observed formations or
 * train-number-to-operation crosswalks. The shared TrainVehicle evidence
 * resolver remains the only authority for a particular train's PNG.
 * Keep in sync with the 20261114224500 Supabase family migration.
 */
(function () {
  'use strict';
  var MF = 'https://loo-ool.com/rail/MF/32/';
  var TOBU = 'https://www.tobu.co.jp/corporation/rail/vehicles/';
  var through = [
    ['PLAN:TOJO-WAKOSHI-TOBU-10', 'Tobu', '01T-23T odd',
      ['東武50070型', '東武9000型', '東武9050型']],
    ['PLAN:TOJO-WAKOSHI-METRO-10', 'TokyoMetro', '21S-99S odd',
      ['東京メトロ10000系', '東京メトロ17000系']],
    ['PLAN:TOJO-WAKOSHI-METRO-8', 'TokyoMetro', '01S-19S odd',
      ['東京メトロ17000系']],
    ['PLAN:TOJO-WAKOSHI-TOKYU-8', 'Tokyu', '01K-35K odd',
      ['東急5050系', '東急5000系', '横浜高速Y500系']],
    ['PLAN:TOJO-WAKOSHI-TOKYU-10', 'Tokyu', '51K-65K odd',
      ['東急5050系']]
  ];
  var rules = through.map(function (entry) {
    return {
      networkKey: 'Tojo', codePattern: entry[0], operator: entry[1],
      effectiveFrom: '2026-03-14', exactVehicleType: '',
      vehicleCandidates: entry[3], sourceUrl: MF, grade: 'B',
      allowCandidateArtwork: false,
      planScope: {
        lineIds: ['Tojo'], planOnly: true, overridePlan: true,
        operationPatterns: [entry[2]], anyStationNames: ['Wakoshi']
      }
    };
  });
  rules.push({
    networkKey: 'Tojo', codePattern: 'PLAN:TOJO-GROUND-10CAR',
    operator: 'Tobu', effectiveFrom: '2026-09-26',
    exactVehicleType: '', grade: 'B', sourceUrl: TOBU,
    allowCandidateArtwork: false,
    vehicleCandidates: ['東武9000型','東武9050型','東武10000型',
      '東武10030型','東武30000系','東武50000型','東武50070型',
      '東武50090型','東武90000系'],
    planScope: {
      lineIds: ['Tojo'], planOnly: true, allStationOperators: ['Tobu'],
      anyStationNames: ['Ikebukuro','Narimasu','Wakoshi','Shiki',
        'Kawagoe','Kawagoeshi','Shinrin-Koen','Musashi-Ranzan']
    }
  });
  rules.push({
    networkKey: 'Tojo', codePattern: 'PLAN:TOJO-WEST-4CAR',
    operator: 'Tobu', effectiveFrom: '2026-01-01',
    exactVehicleType: '', vehicleCandidates: ['東武8000型'],
    sourceUrl: TOBU, grade: 'B', allowCandidateArtwork: false,
    planScope: {
      lineIds: ['Tojo'], planOnly: true,
      anyStationNames: ['Tobu-Takezawa','Minami-Yorii',
        'Obusuma','Hachigata','Tamayodo']
    }
  });
  rules.push({
    networkKey: 'Ogose', codePattern: 'PLAN:OGOSE-4CAR',
    operator: 'Tobu', effectiveFrom: '2026-01-01',
    exactVehicleType: '', vehicleCandidates: ['東武8000型'],
    sourceUrl: TOBU, grade: 'B', allowCandidateArtwork: false,
    planScope: { lineIds: ['Ogose'], planOnly: true }
  });
  // Officially specified 50090 service family: schedule-only, never a
  // physical consist/carset claim. The train type must explicitly be TJ-Liner.
  rules.push({
    networkKey: 'Tojo', codePattern: 'PLAN:OFFICIAL-TJLINER-50090',
    operator: 'Tobu', effectiveFrom: '2026-10-30', grade: 'B',
    sourceUrl: TOBU, exactVehicleType: '東武50090型',
    vehicleCandidates: ['東武50090型'], allowCandidateArtwork: false,
    planScope: { lineIds: ['Tojo'], planOnly: true,
      trainTypes: ['TJ-Liner','TJ-LINER'] }
  });
  var existing = window.VEHICLE_FAMILY_RULES;
  if (!Array.isArray(existing)) existing = [];
  var keys = Object.create(null);
  existing.forEach(function (rule) {
    keys[String(rule.networkKey) + '|' + String(rule.codePattern)] = true;
  });
  rules.forEach(function (rule) {
    var key = rule.networkKey + '|' + rule.codePattern;
    if (!keys[key]) { keys[key] = true; existing.push(rule); }
  });
  window.VEHICLE_FAMILY_RULES = existing;
  window.TobuTojoPlannedFleetEvidence = Object.freeze({
    version: '2026-11-14', rules: Object.freeze(rules.slice())
  });
})();
