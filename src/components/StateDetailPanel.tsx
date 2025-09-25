import { useMemo } from 'react';
import { StateAggregate } from '../utils/dataTransforms';
import styles from '../styles/StateDetailPanel.module.css';

interface StateDetailPanelProps {
  aggregate: StateAggregate | null;
  page: number;
  onPageChange: (page: number) => void;
}

const PAGE_SIZE = 15;

export function StateDetailPanel({ aggregate, page, onPageChange }: StateDetailPanelProps) {
  const totalPages = aggregate ? Math.ceil(aggregate.players.length / PAGE_SIZE) : 0;

  const currentPage = Math.min(page, Math.max(totalPages - 1, 0));

  const pagePlayers = useMemo(() => {
    if (!aggregate) {
      return [];
    }
    const start = currentPage * PAGE_SIZE;
    return aggregate.players.slice(start, start + PAGE_SIZE);
  }, [aggregate, currentPage]);

  if (!aggregate) {
    return (
      <aside className={styles.panel}>
        <h3>State detail</h3>
        <p>Select a state to explore its players.</p>
      </aside>
    );
  }

  const handlePrev = () => {
    onPageChange(Math.max(currentPage - 1, 0));
  };

  const handleNext = () => {
    onPageChange(Math.min(currentPage + 1, totalPages - 1));
  };

  return (
    <aside className={styles.panel}>
      <h3>{aggregate.meta.name}</h3>
      <p>
        <strong>{aggregate.playerCount}</strong> players · <strong>{aggregate.totalWar.toFixed(1)}</strong> WAR
        {aggregate.warPerMillion != null && (
          <>
            {' '}
            · <strong>{aggregate.warPerMillion.toFixed(1)}</strong> WAR per 1M residents
          </>
        )}
      </p>
      <div className={styles.listHeader}>
        <span>Player</span>
        <span>WAR</span>
      </div>
      <ul className={styles.list}>
        {pagePlayers.map((player) => (
          <li key={player.playerId}>
            <span>{player.fullName}</span>
            <span>{player.warCareer.toFixed(1)}</span>
          </li>
        ))}
        {pagePlayers.length === 0 && <li>No players match the current filters.</li>}
      </ul>
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button type="button" onClick={handlePrev} disabled={currentPage === 0}>
            Previous
          </button>
          <span>
            Page {currentPage + 1} of {totalPages}
          </span>
          <button type="button" onClick={handleNext} disabled={currentPage >= totalPages - 1}>
            Next
          </button>
        </div>
      )}
    </aside>
  );
}
