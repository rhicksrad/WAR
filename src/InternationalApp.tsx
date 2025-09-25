import { useEffect, useMemo, useState } from 'react';
import {
  aggregateByCountry,
  CountryAggregate,
  InternationalPlayerRecord,
  listInternationalDecades,
  findWarExtent
} from './utils/internationalData';
import { resolveCountryFeatureName } from './utils/countryNameMapping';
import { InternationalMap } from './components/InternationalMap';
import { InternationalTooltip } from './components/InternationalTooltip';
import { CountryDetailPanel } from './components/CountryDetailPanel';
import styles from './styles/InternationalApp.module.css';

const resolveStaticUrl = (relativePath: string) => {
  const base = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${relativePath}`;
};

const DATA_URL = resolveStaticUrl('data/intplayers.json');

const numberFormatter = new Intl.NumberFormat('en-US');
const warFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function useHomeHref() {
  const base = import.meta.env.BASE_URL ?? '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export default function InternationalApp() {
  const [players, setPlayers] = useState<InternationalPlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minWar, setMinWar] = useState(0);
  const [selectedDecade, setSelectedDecade] = useState<number | 'all'>('all');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    country: string;
    position: { x: number; y: number };
  } | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<{
    country: string;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
          throw new Error('Unable to load international players dataset');
        }
        const data = (await response.json()) as InternationalPlayerRecord[];
        if (!cancelled) {
          setPlayers(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'Unknown error loading dataset');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const decades = useMemo(() => listInternationalDecades(players), [players]);

  useEffect(() => {
    if (selectedDecade !== 'all' && !decades.includes(selectedDecade)) {
      setSelectedDecade('all');
    }
  }, [decades, selectedDecade]);

  const [, maxWarExtent] = useMemo(() => findWarExtent(players), [players]);
  const sliderMax = useMemo(() => {
    const safeMax = Math.max(maxWarExtent, 5);
    const rounded = Math.ceil(safeMax / 5) * 5;
    return Math.max(5, rounded);
  }, [maxWarExtent]);

  useEffect(() => {
    if (minWar > sliderMax) {
      setMinWar(sliderMax);
    }
  }, [sliderMax, minWar]);

  const aggregates = useMemo(() => aggregateByCountry(players, { minWar, decade: selectedDecade }), [
    players,
    minWar,
    selectedDecade
  ]);

  useEffect(() => {
    if (aggregates.length === 0) {
      setSelectedCountry(null);
      setSelectedInfo(null);
      setHoverInfo(null);
      return;
    }
    if (!selectedCountry || !aggregates.some((aggregate) => aggregate.country === selectedCountry)) {
      setSelectedCountry(aggregates[0].country);
      setSelectedInfo(null);
      setHoverInfo(null);
    }
  }, [aggregates, selectedCountry]);

  const selectedAggregate: CountryAggregate | null = useMemo(() => {
    if (!selectedCountry) {
      return null;
    }
    return aggregates.find((aggregate) => aggregate.country === selectedCountry) ?? null;
  }, [aggregates, selectedCountry]);

  const aggregateMap = useMemo(() => {
    const map = new Map<string, CountryAggregate>();
    aggregates.forEach((aggregate) => map.set(aggregate.country, aggregate));
    return map;
  }, [aggregates]);

  const hoveredAggregate = hoverInfo ? aggregateMap.get(hoverInfo.country) ?? null : null;

  const tooltipAggregate = selectedInfo ? selectedAggregate : hoveredAggregate;
  const tooltipPosition = selectedInfo ? selectedInfo.position : hoverInfo?.position ?? null;
  const tooltipPinned = Boolean(selectedInfo);
  const tooltipVisible = Boolean(tooltipAggregate && tooltipPosition);

  const unmatchedCountries = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    aggregates.forEach((aggregate) => {
      if (resolveCountryFeatureName(aggregate.country)) {
        return;
      }
      if (!seen.has(aggregate.country)) {
        seen.add(aggregate.country);
        list.push(aggregate.country);
      }
    });
    return list;
  }, [aggregates]);

  const datasetSummary = useMemo(() => {
    const countryCount = new Set(players.map((player) => player.birthCountry)).size;
    const totalWar = players.reduce((sum, player) => sum + player.warCareer, 0);
    return {
      playerCount: players.length,
      countryCount,
      totalWar: Number(totalWar.toFixed(1))
    };
  }, [players]);

  const homeHref = useHomeHref();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <a className={styles.navLink} href={homeHref}>
            ← Back to U.S. atlas
          </a>
          <span className={styles.datasetMeta}>
            {datasetSummary.countryCount} countries · {numberFormatter.format(datasetSummary.playerCount)} players ·{' '}
            {warFormatter.format(datasetSummary.totalWar)} total WAR
          </span>
        </div>
        <h1>International Birthplace WAR</h1>
        <p className={styles.subtitle}>
          Discover how career WAR is distributed among MLB players born outside the continental United States. Filter by
          birth decade and minimum career WAR to compare each country&apos;s contribution and spotlight their standout stars.
        </p>
      </header>
      <main className={styles.main}>
        <div className={styles.leftColumn}>
          <div className={styles.mapWrapper}>
            <InternationalMap
              aggregates={aggregates}
              onCountryHover={(aggregate, position) => {
                if (aggregate && position) {
                  setHoverInfo({ country: aggregate.country, position });
                } else {
                  setHoverInfo(null);
                }
              }}
              onCountrySelect={(aggregate, position) => {
                if (aggregate && position) {
                  setSelectedCountry(aggregate.country);
                  setSelectedInfo({ country: aggregate.country, position });
                  setHoverInfo(null);
                } else {
                  setSelectedInfo(null);
                  setHoverInfo(null);
                }
              }}
              selectedCountry={selectedCountry}
            />
            <InternationalTooltip
              aggregate={tooltipAggregate}
              position={tooltipPosition}
              visible={tooltipVisible}
              pinned={tooltipPinned}
            />
          </div>
          <CountryDetailPanel aggregate={selectedAggregate} />
        </div>
        <section className={styles.rightColumn}>
          <div className={styles.tableSection}>
            <div className={styles.controls}>
              <label className={styles.control}>
                <span className={styles.controlLabel}>Minimum career WAR</span>
                <div className={styles.sliderWrapper}>
                  <input
                    type="range"
                    min={0}
                    max={sliderMax}
                    step={1}
                    value={minWar}
                    onChange={(event) => setMinWar(Number(event.target.value))}
                    aria-label="Minimum career WAR filter"
                  />
                  <span className={styles.sliderValue}>{warFormatter.format(minWar)}</span>
                </div>
              </label>
              <label className={styles.control}>
                <span className={styles.controlLabel}>Birth decade</span>
                <select
                  value={selectedDecade === 'all' ? 'all' : String(selectedDecade)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedDecade(value === 'all' ? 'all' : Number(value));
                  }}
                  aria-label="Birth decade filter"
                >
                  <option value="all">All decades</option>
                  {decades.map((decade) => (
                    <option key={decade} value={String(decade)}>
                      {decade}s
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {unmatchedCountries.length > 0 && (
              <p className={styles.unmatchedNotice}>
                Territories without individual map shapes ({unmatchedCountries.join(', ')}) still appear in the table and
                detail view.
              </p>
            )}
            {loading ? (
              <div className={styles.placeholder}>Loading international player data…</div>
            ) : error ? (
              <div className={styles.error}>{error}</div>
            ) : aggregates.length === 0 ? (
              <div className={styles.placeholder}>No countries match the current filters.</div>
            ) : (
              <div className={styles.tableContainer}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Country</th>
                      <th scope="col">Players</th>
                      <th scope="col">Total WAR</th>
                      <th scope="col">Avg. WAR</th>
                      <th scope="col">Top player</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregates.map((aggregate) => {
                      const topPlayer = aggregate.players[0];
                      return (
                        <tr
                          key={aggregate.country}
                          className={aggregate.country === selectedCountry ? styles.selectedRow : undefined}
                          onClick={() => {
                            setSelectedCountry(aggregate.country);
                            setSelectedInfo(null);
                            setHoverInfo(null);
                          }}
                        >
                          <th scope="row">{aggregate.country}</th>
                          <td>{numberFormatter.format(aggregate.playerCount)}</td>
                          <td>{warFormatter.format(aggregate.totalWar)}</td>
                          <td>{warFormatter.format(aggregate.averageWar)}</td>
                          <td>
                            {topPlayer ? (
                              <span className={styles.topPlayer}>
                                <span className={styles.playerName}>{topPlayer.fullName}</span>
                                <span className={styles.playerWar}>{warFormatter.format(topPlayer.warCareer)} WAR</span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
