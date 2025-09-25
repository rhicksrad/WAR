import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { csvParse } from 'd3-dsv';
import { execFile } from 'child_process';
import { promisify } from 'util';
import stateMetaData from '../src/data/stateMetaData.json' with { type: 'json' };

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const publicDir = path.join(rootDir, 'public');
const dataDir = path.join(publicDir, 'data');

function parseCsv(text) {
  return csvParse(text).map((row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string') {
        normalized[key] = value.trim();
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  });
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const cleaned = String(value).trim();
  if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'nan') {
    return null;
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

const states = stateMetaData;
const statesByPostal = new Map(states.map((state) => [state.postal.toUpperCase(), state]));
const statesByName = new Map(states.map((state) => [state.name.toLowerCase(), state]));

const COUNTRY_ALIASES = new Map([
  ['USA', 'United States'],
  ['CAN', 'Canada'],
  ['D.R.', 'Dominican Republic'],
  ['P.R.', 'Puerto Rico'],
  ['V.I.', 'U.S. Virgin Islands']
]);

function normalizeCountryName(value) {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  const alias = COUNTRY_ALIASES.get(trimmed) ?? COUNTRY_ALIASES.get(trimmed.toUpperCase());
  return alias ?? trimmed;
}

function isUnitedStates(value) {
  if (!value) {
    return false;
  }
  const normalized = String(value).trim().toUpperCase();
  return normalized === 'USA' || normalized === 'UNITED STATES' || normalized === 'U.S.A.';
}

function findState(value) {
  if (!value) {
    return undefined;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return undefined;
  }
  const postalMatch = statesByPostal.get(trimmed.toUpperCase());
  if (postalMatch) {
    return postalMatch;
  }
  return statesByName.get(trimmed.toLowerCase());
}

async function readZipEntry(zipPath, entryName) {
  const { stdout } = await execFileAsync('unzip', ['-p', zipPath, entryName], {
    maxBuffer: 1024 * 1024 * 1024
  });
  return stdout.toString('utf8');
}

async function loadMasterRecords() {
  const masterPath = path.join(publicDir, 'Master.csv');
  const text = await readFile(masterPath, 'utf8');
  const rows = parseCsv(text);
  const domesticPlayers = new Map();
  const internationalPlayers = new Map();
  rows.forEach((row) => {
    const playerId = row.playerID;
    if (!playerId) {
      return;
    }
    const birthYear = normalizeNumber(row.birthYear);
    if (birthYear === null) {
      return;
    }
    const state = findState(row.birthState);
    const firstName = row.nameFirst ?? '';
    const lastName = row.nameLast ?? '';
    const fullName = `${firstName} ${lastName}`.trim() || row.nameGiven || playerId;
    const countryRaw = row.birthCountry ?? '';
    const normalizedCountry = normalizeCountryName(countryRaw);
    if (state) {
      domesticPlayers.set(playerId, {
        playerId,
        fullName,
        birthYear,
        birthStateRaw: state.postal,
        birthDecade: Math.floor(birthYear / 10) * 10,
        warCareer: 0
      });
      return;
    }

    if (!normalizedCountry || isUnitedStates(countryRaw)) {
      return;
    }

    internationalPlayers.set(playerId, {
      playerId,
      fullName,
      birthYear,
      birthDecade: Math.floor(birthYear / 10) * 10,
      birthCountry: normalizedCountry,
      birthCountryRaw: countryRaw ? String(countryRaw).trim() || null : null,
      birthCity: row.birthCity ? String(row.birthCity).trim() || null : null,
      warCareer: 0
    });
  });
  return { domesticPlayers, internationalPlayers };
}

function accumulateWar(players, rows) {
  rows.forEach((row) => {
    const playerId = row.player_ID || row.playerID;
    if (!playerId) {
      return;
    }
    const war = normalizeNumber(row.WAR ?? row.war);
    if (war === null) {
      return;
    }
    const player = players.get(playerId);
    if (!player) {
      return;
    }
    player.warCareer += war;
  });
}

async function buildPlayerDatasets() {
  const { domesticPlayers, internationalPlayers } = await loadMasterRecords();
  const zipPath = path.join(publicDir, 'war_archive-2025-09-24.zip');

  const battingText = await readZipEntry(zipPath, 'war_daily_bat.txt');
  const battingRows = parseCsv(battingText);
  accumulateWar(domesticPlayers, battingRows);
  accumulateWar(internationalPlayers, battingRows);

  const pitchingText = await readZipEntry(zipPath, 'war_daily_pitch.txt');
  const pitchingRows = parseCsv(pitchingText);
  accumulateWar(domesticPlayers, pitchingRows);
  accumulateWar(internationalPlayers, pitchingRows);

  const domesticList = Array.from(domesticPlayers.values())
    .filter((player) => Math.abs(player.warCareer) >= 0.01)
    .map((player) => ({
      ...player,
      warCareer: Number(player.warCareer.toFixed(3))
    }))
    .sort((a, b) => b.warCareer - a.warCareer);

  const internationalList = Array.from(internationalPlayers.values())
    .filter((player) => player.birthCountry && Math.abs(player.warCareer) >= 0.01)
    .map((player) => ({
      ...player,
      warCareer: Number(player.warCareer.toFixed(3)),
      birthCountryRaw: player.birthCountryRaw ?? null,
      birthCity: player.birthCity ?? null
    }))
    .sort((a, b) => b.warCareer - a.warCareer);

  return { domesticList, internationalList };
}

async function buildPopulationDataset() {
  const sourcePath = path.join(rootDir, 'data', 'state-population.csv');
  const text = await readFile(sourcePath, 'utf8');
  const rows = parseCsv(text);
  const records = rows
    .filter((row) => {
      const ageKey = row.ages ?? row.age ?? '';
      return ageKey.toLowerCase() === 'total';
    })
    .map((row) => ({
      state: row['state/region'] ?? row.state,
      year: normalizeNumber(row.year),
      population: normalizeNumber(row.population)
    }))
    .filter((row) => row.year !== null && row.population !== null)
    .map((row) => {
      const state = findState(row.state);
      if (!state) {
        return null;
      }
      return {
        state: state.postal,
        year: row.year,
        population: Math.round(row.population)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.state === b.state) {
        return a.year - b.year;
      }
      return a.state.localeCompare(b.state);
    });
  return records;
}

async function main() {
  await mkdir(dataDir, { recursive: true });
  const [{ domesticList, internationalList }, populations] = await Promise.all([
    buildPlayerDatasets(),
    buildPopulationDataset()
  ]);

  await writeFile(path.join(dataDir, 'players.json'), JSON.stringify(domesticList, null, 2));
  await writeFile(path.join(dataDir, 'intplayers.json'), JSON.stringify(internationalList, null, 2));
  await writeFile(path.join(dataDir, 'state-populations.json'), JSON.stringify(populations, null, 2));

  console.log(
    `Wrote ${domesticList.length} domestic player records, ${internationalList.length} international player records, and ${populations.length} population entries.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
