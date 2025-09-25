import { ChangeEvent } from 'react';
import { useDataContext } from '../context/DataContext';
import styles from '../styles/FiltersPanel.module.css';

const MIN_WAR = 0;
const MAX_WAR = 150;
const WAR_STEP = 1;

function snapToDecade(value: number) {
  return Math.floor(value / 10) * 10;
}

export function FiltersPanel() {
  const { filters, setFilters, players, decades } = useDataContext();

  if (players.length === 0) {
    return null;
  }

  const globalMin = Math.min(...players.map((player) => player.birthYear));
  const globalMax = Math.max(...players.map((player) => player.birthYear));

  const handleMinYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = snapToDecade(Number(event.target.value));
    setFilters((prev) => ({ ...prev, minYear: Math.min(value, prev.maxYear) }));
  };

  const handleMaxYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = snapToDecade(Number(event.target.value));
    setFilters((prev) => ({ ...prev, maxYear: Math.max(value, prev.minYear) }));
  };

  const handleWarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setFilters((prev) => ({ ...prev, minWar: value }));
  };

  const handleLeagueChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, league: value }));
  };

  const handleDecadeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, selectedDecade: value === 'all' ? 'all' : Number(value) }));
  };

  return (
    <section className={styles.panel} aria-labelledby="filters-heading">
      <h2 id="filters-heading">Filters</h2>
      <div className={styles.filterRow}>
        <label htmlFor="birth-min">
          Birth year range: <strong>{filters.minYear}</strong> – <strong>{filters.maxYear}</strong>
        </label>
        <div className={styles.sliderRow}>
          <input
            id="birth-min"
            type="range"
            min={globalMin}
            max={globalMax}
            step={10}
            value={filters.minYear}
            onChange={handleMinYearChange}
          />
          <input
            id="birth-max"
            type="range"
            min={globalMin}
            max={globalMax}
            step={10}
            value={filters.maxYear}
            onChange={handleMaxYearChange}
          />
        </div>
      </div>
      <div className={styles.filterRow}>
        <label htmlFor="min-war">
          Minimum career WAR: <strong>{filters.minWar}</strong>
        </label>
        <input
          id="min-war"
          type="range"
          min={MIN_WAR}
          max={MAX_WAR}
          step={WAR_STEP}
          value={filters.minWar}
          onChange={handleWarChange}
        />
      </div>
      <div className={styles.filterRow}>
        <label htmlFor="league-filter">League (placeholder)</label>
        <select id="league-filter" value={filters.league ?? 'all'} onChange={handleLeagueChange}>
          <option value="all">All leagues</option>
          <option value="al" disabled>
            American League (coming soon)
          </option>
          <option value="nl" disabled>
            National League (coming soon)
          </option>
        </select>
      </div>
      <div className={styles.filterRow}>
        <label htmlFor="decade-filter">Birth decade focus</label>
        <select id="decade-filter" value={filters.selectedDecade} onChange={handleDecadeChange}>
          <option value="all">All decades</option>
          {decades.map((decade) => (
            <option key={decade} value={decade}>
              {decade}s
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
