import { StateAggregate } from '../utils/dataTransforms';
import styles from '../styles/Tooltip.module.css';

interface TooltipProps {
  aggregate: StateAggregate | null;
  position: { x: number; y: number } | null;
  visible: boolean;
  pinned: boolean;
}

export function Tooltip({ aggregate, position, visible, pinned }: TooltipProps) {
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
      <h3>{aggregate.meta.name}</h3>
      <p>
        Total WAR: <strong>{aggregate.totalWar.toFixed(1)}</strong>
        <br />
        Players: <strong>{aggregate.playerCount}</strong>
        <br />
        WAR per 1M residents:{' '}
        <strong>{aggregate.warPerMillion != null ? aggregate.warPerMillion.toFixed(1) : 'n/a'}</strong>
      </p>
      <h4>Top contributors</h4>
      <ol>
        {topPlayers.map((player) => (
          <li key={player.playerId}>
            {player.fullName} ({player.warCareer.toFixed(1)} WAR)
          </li>
        ))}
        {topPlayers.length === 0 && <li>No players in range</li>}
      </ol>
    </div>
  );
}
