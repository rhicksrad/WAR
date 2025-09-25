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
  summarizeValidation
} from '../utils/dataTransforms';
import { useLocalStorage } from '../hooks/useLocalStorage';

const PLAYERS_STORAGE_KEY = 'war-birthplace-players';
const POP_STORAGE_KEY = 'war-birthplace-population';
const SAMPLE_PLAYERS_URL = new URL('sample-data/players_sample.csv', import.meta.env.BASE_URL).toString();
const SAMPLE_POP_URL = new URL('sample-data/state_pop_sample.csv', import.meta.env.BASE_URL).toString();

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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const storedPlayers = useLocalStorage(PLAYERS_STORAGE_KEY);
  const storedPopulations = useLocalStorage(POP_STORAGE_KEY);

  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [populations, setPopulations] = useState<StatePopulationRecord[]>([]);
  const [validation, setValidation] = useState<ReturnType<typeof summarizeValidation>>();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeFromStorage = useCallback(() => {
    if (storedPlayers.value) {
      const { data, summary } = parsePlayersCsv(storedPlayers.value);
      setPlayers(data);
      setValidation((prev) =>
        summarizeValidation(summary, prev?.populations ?? { rowCount: 0, accepted: 0, rejected: 0 })
      );
    }
    if (storedPopulations.value) {
      const { data, summary } = parsePopulationCsv(storedPopulations.value);
      setPopulations(data);
      setValidation((prev) =>
        summarizeValidation(prev?.players ?? { rowCount: 0, accepted: 0, rejected: 0, missingState: 0 }, summary)
      );
    }
  }, [storedPlayers.value, storedPopulations.value]);

  useEffect(() => {
    initializeFromStorage();
  }, [initializeFromStorage]);

  const loadPlayersText = useCallback(
    (text: string) => {
      const { data, summary } = parsePlayersCsv(text);
      setPlayers(data);
      setValidation((prev) =>
        summarizeValidation(summary, prev?.populations ?? { rowCount: 0, accepted: 0, rejected: 0 })
      );
      storedPlayers.setValue(text);
    },
    [storedPlayers]
  );

  const loadPopulationsText = useCallback(
    (text: string) => {
      const { data, summary } = parsePopulationCsv(text);
      setPopulations(data);
      setValidation((prev) =>
        summarizeValidation(prev?.players ?? { rowCount: 0, accepted: 0, rejected: 0, missingState: 0 }, summary)
      );
      storedPopulations.setValue(text);
    },
    [storedPopulations]
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
    if (players.length === 0) {
      setFilters((prev) => ({ ...prev, minYear: defaultFilters.minYear, maxYear: defaultFilters.maxYear }));
      return;
    }
    const minYear = Math.min(...players.map((player) => player.birthYear));
    const maxYear = Math.max(...players.map((player) => player.birthYear));
    setFilters((prev) => ({ ...prev, minYear, maxYear }));
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
