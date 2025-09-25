import { useEffect, useMemo, useState } from 'react';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { scaleQuantize } from 'd3-scale';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry, Feature as GeoFeature } from 'geojson';
import { StateAggregate } from '../utils/dataTransforms';
import styles from '../styles/MapView.module.css';
import { Legend } from './Legend';

const COLOR_RANGE = ['#edf2ff', '#d0ebff', '#74c0fc', '#4dabf7', '#1c7ed6', '#1864ab'];

interface MapViewProps {
  metric: 'totalWar' | 'warPerMillion';
  aggregates: StateAggregate[];
  onStateHover: (aggregate: StateAggregate | null, position: { x: number; y: number } | null) => void;
  onStateSelect: (aggregate: StateAggregate | null, position: { x: number; y: number } | null) => void;
  selectedFips: string | null;
  title: string;
}

type StateFeature = GeoFeature<Geometry, { name: string; id: string } & Record<string, unknown>>;

export function MapView({
  metric,
  aggregates,
  onStateHover,
  onStateSelect,
  selectedFips,
  title
}: MapViewProps) {
  const [collection, setCollection] = useState<FeatureCollection<Geometry, { id: string }>>();

  useEffect(() => {
    let isMounted = true;
    async function loadTopo() {
      try {
        const response = await fetch('/us-states-10m.json');
        if (!response.ok) {
          throw new Error('Unable to load US states topology');
        }
        const topoJson = await response.json();
        const states = feature(topoJson, topoJson.objects.states) as unknown as FeatureCollection<
          Geometry,
          { id: string }
        >;
        if (isMounted) {
          setCollection(states);
        }
      } catch (error) {
        console.error(error);
      }
    }
    loadTopo();
    return () => {
      isMounted = false;
    };
  }, []);

  const projection = useMemo(() => geoAlbersUsa().scale(1000).translate([480, 300]), []);
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const aggregateByFips = useMemo(() => {
    const map = new Map<string, StateAggregate>();
    aggregates.forEach((aggregate) => map.set(aggregate.meta.fips, aggregate));
    return map;
  }, [aggregates]);

  const values = useMemo(() => {
    const metricAccessor =
      metric === 'warPerMillion'
        ? (aggregate: StateAggregate) => aggregate.warPerMillion ?? 0
        : (aggregate: StateAggregate) => aggregate.totalWar;
    return aggregates
      .map(metricAccessor)
      .filter((value) => Number.isFinite(value) && value > 0);
  }, [aggregates, metric]);

  const colorScale = useMemo(() => {
    if (values.length === 0) {
      return null;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      return scaleQuantize<string>().domain([min, max + 1]).range(COLOR_RANGE);
    }
    return scaleQuantize<string>().domain([min, max]).range(COLOR_RANGE);
  }, [values]);

  const metricAccessor = useMemo(
    () =>
      metric === 'warPerMillion'
        ? (aggregate: StateAggregate) => aggregate.warPerMillion ?? 0
        : (aggregate: StateAggregate) => aggregate.totalWar,
    [metric]
  );

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.mapContainer}>
        <svg viewBox="0 0 960 600" className={styles.svg} role="img" aria-label={title}>
          {(collection?.features as StateFeature[] | undefined)?.map((featureItem) => {
            const aggregate = aggregateByFips.get(featureItem.id as string);
            const value = aggregate ? metricAccessor(aggregate) : null;
            const fill = colorScale && value != null ? colorScale(value) : '#f1f3f5';
            return (
              <path
                key={featureItem.id as string}
                d={pathGenerator(featureItem as StateFeature) ?? undefined}
                fill={fill}
                stroke={selectedFips === featureItem.id ? '#212529' : '#adb5bd'}
                strokeWidth={selectedFips === featureItem.id ? 2.5 : 1}
                className={aggregate ? styles.stateActive : styles.state}
                onMouseMove={(event) => {
                  if (!aggregate) {
                    onStateHover(null, null);
                    return;
                  }
                  onStateHover(aggregate, { x: event.clientX, y: event.clientY - 10 });
                }}
                onMouseLeave={() => onStateHover(null, null)}
                onClick={(event) => {
                  if (aggregate) {
                    onStateSelect(aggregate, { x: event.clientX, y: event.clientY - 10 });
                  }
                }}
              />
            );
          })}
        </svg>
        <div className={styles.legendContainer}>
          <Legend
            scale={colorScale}
            title={metric === 'warPerMillion' ? 'WAR per 1M residents' : 'Total career WAR'}
          />
        </div>
      </div>
    </div>
  );
}
