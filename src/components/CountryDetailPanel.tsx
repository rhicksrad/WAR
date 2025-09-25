import { CountryAggregate } from '../utils/internationalData';
import styles from '../styles/CountryDetailPanel.module.css';

interface CountryDetailPanelProps {
  aggregate: CountryAggregate | null;
}

const numberFormatter = new Intl.NumberFormat('en-US');
const warFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function CountryDetailPanel({ aggregate }: CountryDetailPanelProps) {
  if (!aggregate) {
    return (
      <aside className={styles.panel}>
        <h3>Country detail</h3>
        <p className={styles.placeholder}>Select a country on the map or from the table to explore its standout players.</p>
      </aside>
    );
  }

  return (
    <aside className={styles.panel}>
      <h3>{aggregate.country}</h3>
      <p className={styles.summary}>
        A look at the top contributors from {aggregate.country}. Use the filters to refine the birth decade and minimum WAR
        threshold.
      </p>
      <div className={styles.badgeGrid}>
        <span className={styles.badge}>{numberFormatter.format(aggregate.playerCount)} players</span>
        <span className={styles.badge}>{warFormatter.format(aggregate.totalWar)} total WAR</span>
        <span className={styles.badge}>{warFormatter.format(aggregate.averageWar)} avg. WAR</span>
      </div>
      <div className={styles.listHeader}>Top contributors</div>
      <ol className={styles.playerList}>
        {aggregate.players.slice(0, 15).map((player) => (
          <li key={player.playerId}>
            <span className={styles.playerName}>
              <span>{player.fullName}</span>
              <span className={styles.playerMeta}>
                {player.birthCity ? `${player.birthCity}, ` : ''}
                {player.birthCountry} · Born {player.birthYear}
              </span>
            </span>
            <span className={styles.playerWar}>{warFormatter.format(player.warCareer)} WAR</span>
          </li>
        ))}
        {aggregate.players.length === 0 && <li>No players match the current filters.</li>}
      </ol>
    </aside>
  );
}
