import { useDataContext } from '../context/DataContext';
import styles from '../styles/DataPanel.module.css';

export function DataPanel() {
  const { loadSampleData, validation, loading, error, clearStoredData } = useDataContext();

  return (
    <section className={styles.panel} aria-labelledby="data-panel-heading">
      <div className={styles.headingRow}>
        <h2 id="data-panel-heading">Data</h2>
        <div className={styles.actions}>
          <button type="button" onClick={loadSampleData} disabled={loading}>
            Load sample dataset
          </button>
          <button type="button" onClick={clearStoredData} disabled={loading}>
            Reset
          </button>
        </div>
      </div>
      <p className={styles.helperText}>
        The app boots with the bundled Baseball Reference WAR archive and state population snapshots that ship with this
        repository. Use the actions above to reset any cached overrides or preview the smaller sample dataset—no manual
        file uploads required.
      </p>
      {loading && <p className={styles.status}>Loading data…</p>}
      {error && <p className={styles.error}>Error: {error}</p>}
      {validation && (
        <div className={styles.summaryGrid}>
          <div>
            <h3>Players</h3>
            <ul>
              <li>Rows processed: {validation.players.rowCount.toLocaleString()}</li>
              <li>Accepted: {validation.players.accepted.toLocaleString()}</li>
              <li>Rejected: {validation.players.rejected.toLocaleString()}</li>
              <li>Missing states: {validation.players.missingState.toLocaleString()}</li>
            </ul>
          </div>
          <div>
            <h3>Populations</h3>
            <ul>
              <li>Rows processed: {validation.populations.rowCount.toLocaleString()}</li>
              <li>Accepted: {validation.populations.accepted.toLocaleString()}</li>
              <li>Rejected: {validation.populations.rejected.toLocaleString()}</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
