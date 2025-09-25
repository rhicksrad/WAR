import { CountryAggregate } from '../utils/internationalData';
import styles from '../styles/Tooltip.module.css';

interface InternationalTooltipProps {
  aggregate: CountryAggregate | null;
  position: { x: number; y: number } | null;
  visible: boolean;
  pinned: boolean;
}

const numberFormatter = new Intl.NumberFormat('en-US');
const warFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function InternationalTooltip({ aggregate, position, visible, pinned }: InternationalTooltipProps) {
  if (!visible || !aggregate || !position) {
    return null;
  }

  const topPlayers = aggregate.players.slice(0, 3);

  return (
    <div
      className={pinned ? styles.tooltipPinned : styles.tooltip}
      style={{ left: position.x, top: position.y }}
      role="dialog"
      aria-live="polite"
    >
      <h3>{aggregate.country}</h3>
      <p>
        Total WAR: <strong>{warFormatter.format(aggregate.totalWar)}</strong>
        <br />
        Players: <strong>{numberFormatter.format(aggregate.playerCount)}</strong>
        <br />
        Avg. WAR: <strong>{warFormatter.format(aggregate.averageWar)}</strong>
      </p>
      <h4>Top contributors</h4>
      <ol>
        {topPlayers.map((player) => (
          <li key={player.playerId}>
            {player.fullName} ({warFormatter.format(player.warCareer)} WAR)
          </li>
        ))}
        {topPlayers.length === 0 && <li>No players in range</li>}
      </ol>
    </div>
  );
}
