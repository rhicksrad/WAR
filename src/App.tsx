import { useEffect, useMemo, useState } from 'react';
import { Tabs } from './components/Tabs';
import { DataPanel } from './components/DataPanel';
import { FiltersPanel } from './components/FiltersPanel';
import { MapView } from './components/MapView';
import { Tooltip } from './components/Tooltip';
import { StateDetailPanel } from './components/StateDetailPanel';
import { useDataContext } from './context/DataContext';
import { StateAggregate } from './utils/dataTransforms';
import styles from './styles/App.module.css';

const VIEW_OPTIONS = [
  { id: 'totalWar', label: 'Total WAR by State' },
  { id: 'warPerMillion', label: 'WAR per 1M Residents' },
  { id: 'decade', label: 'WAR by Birth Decade' }
] as const;

type ViewMode = (typeof VIEW_OPTIONS)[number]['id'];

export default function App() {
  const { players, getAggregates, decades } = useDataContext();
  const [view, setView] = useState<ViewMode>('totalWar');
  const [hoverInfo, setHoverInfo] = useState<{ fips: string; position: { x: number; y: number } } | null>(
    null
  );
  const [selectedInfo, setSelectedInfo] = useState<{
    fips: string;
    position: { x: number; y: number };
  } | null>(null);
  const [detailPage, setDetailPage] = useState(0);
  const [decadeFocus, setDecadeFocus] = useState<number | null>(null);

  useEffect(() => {
    if (decades.length > 0 && (decadeFocus === null || !decades.includes(decadeFocus))) {
      setDecadeFocus(decades[0]);
    }
  }, [decades, decadeFocus]);

  useEffect(() => {
    setDetailPage(0);
  }, [selectedInfo?.fips]);

  const aggregates = useMemo(() => {
    if (players.length === 0) {
      return [] as StateAggregate[];
    }
    if (view === 'warPerMillion') {
      return getAggregates({ metric: 'warPerMillion' });
    }
    if (view === 'decade') {
      return getAggregates({ metric: 'totalWar', decade: decadeFocus ?? undefined });
    }
    return getAggregates({ metric: 'totalWar' });
  }, [players.length, view, getAggregates, decadeFocus]);

  const aggregateMap = useMemo(() => {
    const map = new Map<string, StateAggregate>();
    aggregates.forEach((aggregate) => map.set(aggregate.meta.fips, aggregate));
    return map;
  }, [aggregates]);

  const hoveredAggregate = hoverInfo ? aggregateMap.get(hoverInfo.fips) ?? null : null;
  const selectedAggregate = selectedInfo ? aggregateMap.get(selectedInfo.fips) ?? null : null;

  const tooltipAggregate = selectedAggregate ?? hoveredAggregate;
  const tooltipPosition = selectedAggregate ? selectedInfo?.position : hoverInfo?.position ?? null;
  const tooltipPinned = Boolean(selectedAggregate);

  const handleHover = (aggregate: StateAggregate | null, position: { x: number; y: number } | null) => {
    if (aggregate && position) {
      setHoverInfo({ fips: aggregate.meta.fips, position });
    } else {
      setHoverInfo(null);
    }
  };

  const handleSelect = (
    aggregate: StateAggregate | null,
    position: { x: number; y: number } | null
  ) => {
    if (aggregate && position) {
      setSelectedInfo({ fips: aggregate.meta.fips, position });
    } else {
      setSelectedInfo(null);
    }
  };

  const handleViewChange = (nextView: string) => {
    setView(nextView as ViewMode);
    setHoverInfo(null);
  };

  useEffect(() => {
    if (view !== 'decade') {
      setDecadeFocus(null);
    } else if (decadeFocus === null && decades.length > 0) {
      setDecadeFocus(decades[0]);
    }
  }, [view, decades, decadeFocus]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Birthplace WAR Atlas</h1>
        <p className={styles.subtitle}>
          Explore how career WAR is distributed across the United States by birthplace, population, and birth decade.
        </p>
      </header>
      <main className={styles.main}>
        <div className={styles.leftColumn}>
          <DataPanel />
          <FiltersPanel />
          <Tabs
            options={VIEW_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
            activeId={view}
            onChange={handleViewChange}
          />
          {players.length === 0 ? (
            <p className={styles.placeholder}>Load player data to render the map.</p>
          ) : (
            <div className={styles.visualization}>
              {view === 'decade' && decadeFocus != null && (
                <div className={styles.decadeControl}>
                  <label htmlFor="decade-slider">Focus decade: {decadeFocus}s</label>
                  <input
                    id="decade-slider"
                    type="range"
                    min={0}
                    max={decades.length - 1}
                    value={decades.indexOf(decadeFocus)}
                    onChange={(event) => {
                      const index = Number(event.target.value);
                      setDecadeFocus(decades[index] ?? decadeFocus);
                    }}
                  />
                </div>
              )}
              <MapView
                metric={view === 'warPerMillion' ? 'warPerMillion' : 'totalWar'}
                aggregates={aggregates}
                onStateHover={handleHover}
                onStateSelect={handleSelect}
                selectedFips={selectedInfo?.fips ?? null}
                title={
                  view === 'warPerMillion'
                    ? 'Career WAR per 1M residents'
                    : view === 'decade'
                      ? `Career WAR by birthplace · ${decadeFocus ?? ''}s`
                      : 'Total career WAR by birthplace'
                }
              />
              <Tooltip
                aggregate={tooltipAggregate}
                position={tooltipPosition ?? null}
                visible={Boolean(tooltipAggregate)}
                pinned={tooltipPinned}
              />
            </div>
          )}
        </div>
        <StateDetailPanel aggregate={selectedAggregate ?? null} page={detailPage} onPageChange={setDetailPage} />
      </main>
      <footer className={styles.footer}>
        <p>
          Drop in fresh CSV exports at any time. Data is stored locally in your browser so you can pick up where you left off.
        </p>
      </footer>
    </div>
  );
}
