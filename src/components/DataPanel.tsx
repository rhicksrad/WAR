import { ChangeEvent, useState } from 'react';
import { useDataContext } from '../context/DataContext';
import styles from '../styles/DataPanel.module.css';

export function DataPanel() {
  const {
    loadSampleData,
    loadPlayersFile,
    loadPopulationFile,
    validation,
    loading,
    error,
    clearStoredData
  } = useDataContext();
  const [playersFileName, setPlayersFileName] = useState<string | null>(null);
  const [popFileName, setPopFileName] = useState<string | null>(null);

  const handlePlayersChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPlayersFileName(file.name);
      await loadPlayersFile(file);
    }
  };

  const handlePopulationChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPopFileName(file.name);
      await loadPopulationFile(file);
    }
  };

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
        Provide <code>players.csv</code> and <code>state_pop.csv</code> files. The inputs accept Lahman-style
        exports with <code>birth_state</code>, <code>birth_year</code>, and <code>war_career</code> columns plus
        annual state population figures.
      </p>
      <div className={styles.inputGroup}>
        <label className={styles.label} htmlFor="players-file">
          Players CSV
        </label>
        <input id="players-file" type="file" accept="text/csv,.csv" onChange={handlePlayersChange} />
        {playersFileName && <span className={styles.fileName}>Loaded: {playersFileName}</span>}
      </div>
      <div className={styles.inputGroup}>
        <label className={styles.label} htmlFor="population-file">
          State population CSV
        </label>
        <input id="population-file" type="file" accept="text/csv,.csv" onChange={handlePopulationChange} />
        {popFileName && <span className={styles.fileName}>Loaded: {popFileName}</span>}
      </div>
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
