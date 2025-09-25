import type { ScaleQuantize } from 'd3-scale';
import styles from '../styles/Legend.module.css';

interface LegendProps {
  scale: ScaleQuantize<string> | null;
  title: string;
}

export function Legend({ scale, title }: LegendProps) {
  if (!scale) {
    return null;
  }

  const domain = scale.domain();
  const [min, max] = domain;
  const thresholds = scale.thresholds();
  const colors = scale.range();

  return (
    <div className={styles.legend} aria-hidden="true">
      <p className={styles.title}>{title}</p>
      <div className={styles.scale}>
        {colors.map((color: string, index: number) => {
          const lower = index === 0 ? min : thresholds[index - 1];
          const upper = index < thresholds.length ? thresholds[index] : max;
          return (
            <div key={color} className={styles.stop} style={{ background: color }}>
              <span>
                {lower.toFixed(0)} – {upper.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
