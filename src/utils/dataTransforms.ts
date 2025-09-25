import { csvParse } from 'd3-dsv';
import { extent } from 'd3-array';
import { findStateMeta, StateMeta } from '../data/stateMeta';

export interface PlayerRecord {
  playerId: string;
  fullName: string;
  birthYear: number;
  birthStateRaw: string;
  warCareer: number;
  birthDecade: number;
}

export interface StatePopulationRecord {
  state: string;
  year: number;
  population: number;
  meta?: StateMeta;
}

export interface Filters {
  minYear: number;
  maxYear: number;
  minWar: number;
  selectedDecade: number | 'all';
  league?: string;
}

export interface StateAggregate {
  meta: StateMeta;
  totalWar: number;
  playerCount: number;
  warPerMillion: number | null;
  players: PlayerRecord[];
}

export interface DataValidationSummary {
  players: {
    rowCount: number;
    accepted: number;
    rejected: number;
    missingState: number;
  };
  populations: {
    rowCount: number;
    accepted: number;
    rejected: number;
  };
}

export function parsePlayersCsv(csvText: string): { data: PlayerRecord[]; summary: DataValidationSummary['players'] } {
  const rows = csvParse(csvText.trim());
  const records: PlayerRecord[] = [];
  let rejected = 0;
  let missingState = 0;

  rows.forEach((row) => {
    const value = row as Record<string, string>;
    const playerId = String(value.player_id ?? value.playerID ?? '').trim();
    const fullName = String(value.full_name ?? value.name ?? '').trim();
    const birthStateRaw = String(value.birth_state ?? value.birthState ?? '').trim();
    const birthYearValue = Number(value.birth_year ?? value.birthYear ?? value.birthyear ?? NaN);
    const warValue = Number(value.war_career ?? value.war ?? value.WAR ?? NaN);

    if (!playerId || Number.isNaN(birthYearValue) || Number.isNaN(warValue)) {
      rejected += 1;
      return;
    }

    const meta = findStateMeta(birthStateRaw);
    if (!meta) {
      missingState += 1;
    }

    records.push({
      playerId,
      fullName: fullName || playerId,
      birthYear: birthYearValue,
      birthStateRaw,
      warCareer: warValue,
      birthDecade: Math.floor(birthYearValue / 10) * 10
    });
  });

  return {
    data: records,
    summary: {
      rowCount: rows.length,
      accepted: records.length,
      rejected,
      missingState
    }
  };
}

export function parsePopulationCsv(csvText: string): { data: StatePopulationRecord[]; summary: DataValidationSummary['populations'] } {
  const rows = csvParse(csvText.trim());
  const records: StatePopulationRecord[] = [];
  let rejected = 0;

  rows.forEach((row) => {
    const value = row as Record<string, string>;
    const stateRaw = String(value.state ?? value.state_postal ?? value.state_name ?? '').trim();
    const yearValue = Number(value.year ?? value.Year ?? NaN);
    const populationValue = Number(value.population ?? value.Population ?? value.pop ?? NaN);
    if (!stateRaw || Number.isNaN(yearValue) || Number.isNaN(populationValue)) {
      rejected += 1;
      return;
    }
    const meta = findStateMeta(stateRaw);
    if (!meta) {
      rejected += 1;
      return;
    }
    records.push({
      state: meta.postal,
      year: yearValue,
      population: populationValue,
      meta
    });
  });

  return {
    data: records.sort((a, b) => {
      if (a.state === b.state) {
        return a.year - b.year;
      }
      return a.state.localeCompare(b.state);
    }),
    summary: {
      rowCount: rows.length,
      accepted: records.length,
      rejected
    }
  };
}

type PopulationLookup = Map<string, StatePopulationRecord[]>;

function buildPopulationLookup(populations: StatePopulationRecord[]): PopulationLookup {
  const lookup: PopulationLookup = new Map();
  populations.forEach((record) => {
    const list = lookup.get(record.state) ?? [];
    list.push(record);
    lookup.set(record.state, list);
  });
  lookup.forEach((list) => list.sort((a, b) => a.year - b.year));
  return lookup;
}

function findClosestPopulation(lookup: PopulationLookup, statePostal: string, targetYear: number): number | null {
  const candidates = lookup.get(statePostal);
  if (!candidates || candidates.length === 0) {
    return null;
  }
  let closest = candidates[0];
  let minDiff = Math.abs(closest.year - targetYear);
  for (let i = 1; i < candidates.length; i += 1) {
    const diff = Math.abs(candidates[i].year - targetYear);
    if (diff < minDiff) {
      closest = candidates[i];
      minDiff = diff;
    }
  }
  return closest.population;
}

export function filterPlayers(players: PlayerRecord[], filters: Filters): PlayerRecord[] {
  return players.filter((player) => {
    if (player.birthYear < filters.minYear || player.birthYear > filters.maxYear) {
      return false;
    }
    if (player.warCareer < filters.minWar) {
      return false;
    }
    if (filters.selectedDecade !== 'all' && player.birthDecade !== filters.selectedDecade) {
      return false;
    }
    return Boolean(findStateMeta(player.birthStateRaw));
  });
}

export function aggregateByState(
  players: PlayerRecord[],
  populations: StatePopulationRecord[],
  filters: Filters,
  options?: { targetDecade?: number | null }
): StateAggregate[] {
  const targetDecade =
    options?.targetDecade === null || options?.targetDecade === undefined
      ? filters.selectedDecade
      : options.targetDecade;

  const filtered = filterPlayers(players, {
    ...filters,
    selectedDecade: targetDecade === null ? 'all' : targetDecade
  });

  const populationLookup = buildPopulationLookup(populations);
  const midpointYear = Math.round((filters.minYear + filters.maxYear) / 2);
  const decadeTargetYear = options?.targetDecade != null ? options.targetDecade + 5 : midpointYear;

  const aggregates = new Map<string, StateAggregate>();

  filtered.forEach((player) => {
    const meta = findStateMeta(player.birthStateRaw);
    if (!meta) {
      return;
    }
    const aggregate = aggregates.get(meta.fips) ?? {
      meta,
      totalWar: 0,
      playerCount: 0,
      warPerMillion: null,
      players: [] as PlayerRecord[]
    };
    aggregate.totalWar += player.warCareer;
    aggregate.playerCount += 1;
    aggregate.players.push(player);
    aggregates.set(meta.fips, aggregate);
  });

  aggregates.forEach((aggregate) => {
    aggregate.players.sort((a, b) => b.warCareer - a.warCareer);
    const population = findClosestPopulation(populationLookup, aggregate.meta.postal, decadeTargetYear);
    if (population && population > 0) {
      aggregate.warPerMillion = aggregate.totalWar / (population / 1_000_000);
    } else {
      aggregate.warPerMillion = null;
    }
  });

  return Array.from(aggregates.values()).sort((a, b) => b.totalWar - a.totalWar);
}

export function getPlayerYearExtent(players: PlayerRecord[]): [number, number] | null {
  if (players.length === 0) {
    return null;
  }
  const result = extent(players, (player: PlayerRecord) => player.birthYear);
  if (!result[0] || !result[1]) {
    return null;
  }
  return [result[0], result[1]];
}

export function listDecades(players: PlayerRecord[]): number[] {
  const set = new Set<number>();
  players.forEach((player) => set.add(player.birthDecade));
  return Array.from(set).sort((a, b) => a - b);
}

export function summarizeValidation(
  playerSummary: DataValidationSummary['players'],
  populationSummary: DataValidationSummary['populations']
): DataValidationSummary {
  return {
    players: playerSummary,
    populations: populationSummary
  };
}
