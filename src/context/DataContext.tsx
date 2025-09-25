import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  aggregateByState,
  Filters,
  listDecades,
  parsePlayersCsv,
  parsePopulationCsv,
  PlayerRecord,
  StateAggregate,
  StatePopulationRecord,
  summarizeValidation,
  DataValidationSummary
} from '../utils/dataTransforms';
import { findStateMeta } from '../data/stateMeta';
import { useLocalStorage } from '../hooks/useLocalStorage';

const PLAYERS_STORAGE_KEY = 'war-birthplace-players';
const POP_STORAGE_KEY = 'war-birthplace-population';

const resolveStaticUrl = (relativePath: string) => {
  const base = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${relativePath}`;
};

const SAMPLE_PLAYERS_URL = resolveStaticUrl('sample-data/players_sample.csv');
const SAMPLE_POP_URL = resolveStaticUrl('sample-data/state_pop_sample.csv');
const BUNDLED_PLAYERS_URL = resolveStaticUrl('data/players.json');
const BUNDLED_POP_URL = resolveStaticUrl('data/state-populations.json');

const EMPTY_PLAYER_SUMMARY = { rowCount: 0, accepted: 0, rejected: 0, missingState: 0 } as const;
const EMPTY_POP_SUMMARY = { rowCount: 0, accepted: 0, rejected: 0 } as const;

interface DataContextValue {
  players: PlayerRecord[];
  populations: StatePopulationRecord[];
  filters: Filters;
  setFilters: (updater: (filters: Filters) => Filters) => void;
  loadSampleData: () => Promise<void>;
  loadPlayersFile: (file: File) => Promise<void>;
  loadPopulationFile: (file: File) => Promise<void>;
  validation?: ReturnType<typeof summarizeValidation>;
  loading: boolean;
  error: string | null;
  getAggregates: (options?: { metric: 'totalWar' | 'warPerMillion'; decade?: number | null }) => StateAggregate[];
  decades: number[];
  clearStoredData: () => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });
}

const defaultFilters: Filters = {
  minYear: 1850,
  maxYear: new Date().getFullYear(),
  minWar: 0,
  selectedDecade: 'all',
  league: 'all'
};

const snapYearDownToDecade = (value: number) => Math.floor(value / 10) * 10;
const snapYearUpToDecade = (value: number) => Math.ceil(value / 10) * 10;

export function DataProvider({ children }: { children: React.ReactNode }) {
  const storedPlayers = useLocalStorage(PLAYERS_STORAGE_KEY);
  const storedPopulations = useLocalStorage(POP_STORAGE_KEY);

  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [populations, setPopulations] = useState<StatePopulationRecord[]>([]);
  const [validation, setValidation] = useState<ReturnType<typeof summarizeValidation>>();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingestPlayers = useCallback(
    (data: PlayerRecord[], summary: DataValidationSummary['players']) => {
      setPlayers(data);
      setValidation((prev) => summarizeValidation(summary, prev?.populations ?? EMPTY_POP_SUMMARY));
    },
    []
  );

  const ingestPopulations = useCallback(
    (data: StatePopulationRecord[], summary: DataValidationSummary['populations']) => {
      setPopulations(data);
      setValidation((prev) => summarizeValidation(prev?.players ?? EMPTY_PLAYER_SUMMARY, summary));
    },
    []
  );

  const initializeFromStorage = useCallback(() => {
    if (storedPlayers.value) {
      const { data, summary } = parsePlayersCsv(storedPlayers.value);
      ingestPlayers(data, summary);
    }
    if (storedPopulations.value) {
      const { data, summary } = parsePopulationCsv(storedPopulations.value);
      ingestPopulations(data, summary);
    }
  }, [storedPlayers.value, storedPopulations.value, ingestPlayers, ingestPopulations]);

  useEffect(() => {
    initializeFromStorage();
  }, [initializeFromStorage]);

  const loadPlayersText = useCallback(
    (text: string) => {
      const { data, summary } = parsePlayersCsv(text);
      ingestPlayers(data, summary);
      storedPlayers.setValue(text);
    },
    [ingestPlayers, storedPlayers]
  );

  const loadPopulationsText = useCallback(
    (text: string) => {
      const { data, summary } = parsePopulationCsv(text);
      ingestPopulations(data, summary);
      storedPopulations.setValue(text);
    },
    [ingestPopulations, storedPopulations]
  );

  const loadSampleData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [playersResponse, popResponse] = await Promise.all([
        fetch(SAMPLE_PLAYERS_URL),
        fetch(SAMPLE_POP_URL)
      ]);
      if (!playersResponse.ok || !popResponse.ok) {
        throw new Error('Unable to fetch sample data');
      }
      const [playersText, popText] = await Promise.all([
        playersResponse.text(),
        popResponse.text()
      ]);
      loadPlayersText(playersText);
      loadPopulationsText(popText);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error loading sample data');
    } finally {
      setLoading(false);
    }
  }, [loadPlayersText, loadPopulationsText]);

  const loadPlayersFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const text = await readFileAsText(file);
        loadPlayersText(text);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unable to load players file');
      } finally {
        setLoading(false);
      }
    },
    [loadPlayersText]
  );

  const loadPopulationFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const text = await readFileAsText(file);
        loadPopulationsText(text);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unable to load population file');
      } finally {
        setLoading(false);
      }
    },
    [loadPopulationsText]
  );

  const loadBundledData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [playersResponse, popResponse] = await Promise.all([
        fetch(BUNDLED_PLAYERS_URL),
        fetch(BUNDLED_POP_URL)
      ]);
      if (!playersResponse.ok || !popResponse.ok) {
        throw new Error('Unable to load bundled datasets');
      }
      const [playersJson, popJson] = await Promise.all([
        playersResponse.json(),
        popResponse.json()
      ]);
      const playerRecords = (playersJson as PlayerRecord[]).map((record) => ({
        ...record,
        birthDecade: record.birthDecade ?? Math.floor(record.birthYear / 10) * 10
      }));
      const populationRecords = (popJson as Array<{ state: string; year: number; population: number }>).map(
        (record) => ({
          state: record.state,
          year: record.year,
          population: record.population,
          meta: findStateMeta(record.state)
        })
      );
      ingestPlayers(playerRecords, {
        rowCount: playerRecords.length,
        accepted: playerRecords.length,
        rejected: 0,
        missingState: 0
      });
      ingestPopulations(populationRecords, {
        rowCount: populationRecords.length,
        accepted: populationRecords.length,
        rejected: 0
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error loading bundled data');
    } finally {
      setLoading(false);
    }
  }, [ingestPlayers, ingestPopulations]);

  const getAggregates = useCallback(
    (options?: { metric: 'totalWar' | 'warPerMillion'; decade?: number | null }): StateAggregate[] => {
      if (players.length === 0) {
        return [];
      }
      const aggregates = aggregateByState(players, populations, filters, {
        targetDecade: options?.decade ?? null
      });
      if (options?.metric === 'warPerMillion') {
        return aggregates
          .filter((aggregate) => aggregate.warPerMillion != null)
          .sort((a, b) => (b.warPerMillion ?? 0) - (a.warPerMillion ?? 0));
      }
      return aggregates;
    },
    [players, populations, filters]
  );

  const decades = useMemo(() => listDecades(players), [players]);

  const clearStoredData = useCallback(() => {
    storedPlayers.clear();
    storedPopulations.clear();
    setPlayers([]);
    setPopulations([]);
    setValidation(undefined);
    setFilters(defaultFilters);
  }, [storedPlayers, storedPopulations]);

  useEffect(() => {
    if (players.length > 0) {
      return;
    }
    if (storedPlayers.value || storedPopulations.value) {
      return;
    }
    loadBundledData();
  }, [players.length, storedPlayers.value, storedPopulations.value, loadBundledData]);

  useEffect(() => {
    if (players.length === 0) {
      setFilters((prev) => ({
        ...prev,
        minYear: snapYearDownToDecade(defaultFilters.minYear),
        maxYear: snapYearUpToDecade(defaultFilters.maxYear)
      }));
      return;
    }
    const minYear = Math.min(...players.map((player) => player.birthYear));
    const maxYear = Math.max(...players.map((player) => player.birthYear));
    setFilters((prev) => ({
      ...prev,
      minYear: snapYearDownToDecade(minYear),
      maxYear: snapYearUpToDecade(maxYear)
    }));
  }, [players]);

  const contextValue: DataContextValue = {
    players,
    populations,
    filters,
    setFilters: (updater) => {
      setFilters((prev) => updater(prev));
    },
    loadSampleData,
    loadPlayersFile,
    loadPopulationFile,
    validation,
    loading,
    error,
    getAggregates,
    decades,
    clearStoredData
  };

  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
}

export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}
