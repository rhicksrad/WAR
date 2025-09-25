import { extent } from 'd3-array';

export interface InternationalPlayerRecord {
  playerId: string;
  fullName: string;
  birthYear: number;
  birthDecade: number;
  birthCountry: string;
  birthCountryRaw: string | null;
  birthCity: string | null;
  warCareer: number;
}

export interface CountryAggregate {
  country: string;
  totalWar: number;
  playerCount: number;
  averageWar: number;
  players: InternationalPlayerRecord[];
}

export function listInternationalDecades(players: InternationalPlayerRecord[]): number[] {
  const decades = new Set<number>();
  players.forEach((player) => decades.add(player.birthDecade));
  return Array.from(decades).sort((a, b) => a - b);
}

export function findWarExtent(players: InternationalPlayerRecord[]): [number, number] {
  if (players.length === 0) {
    return [0, 0];
  }
  const [min, max] = extent(players, (player) => player.warCareer);
  return [min ?? 0, max ?? 0];
}

export function aggregateByCountry(
  players: InternationalPlayerRecord[],
  options?: { minWar?: number; decade?: number | 'all' }
): CountryAggregate[] {
  const minWar = options?.minWar ?? 0;
  const decade = options?.decade ?? 'all';

  const filtered = players.filter((player) => {
    if (player.warCareer < minWar) {
      return false;
    }
    if (decade !== 'all' && player.birthDecade !== decade) {
      return false;
    }
    return true;
  });

  const aggregates = new Map<string, InternationalPlayerRecord[]>();

  filtered.forEach((player) => {
    const list = aggregates.get(player.birthCountry) ?? [];
    list.push(player);
    aggregates.set(player.birthCountry, list);
  });

  return Array.from(aggregates.entries())
    .map(([country, list]) => {
      const sortedPlayers = [...list].sort((a, b) => b.warCareer - a.warCareer);
      const totalWar = sortedPlayers.reduce((sum, player) => sum + player.warCareer, 0);
      const averageWar = totalWar / sortedPlayers.length;
      return {
        country,
        totalWar: Number(totalWar.toFixed(3)),
        playerCount: sortedPlayers.length,
        averageWar: Number(averageWar.toFixed(3)),
        players: sortedPlayers
      } satisfies CountryAggregate;
    })
    .sort((a, b) => {
      if (b.totalWar === a.totalWar) {
        return a.country.localeCompare(b.country);
      }
      return b.totalWar - a.totalWar;
    });
}
