import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { scaleQuantize } from 'd3-scale';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry, Feature as GeoFeature } from 'geojson';
import { CountryAggregate } from '../utils/internationalData';
import { resolveCountryFeatureName } from '../utils/countryNameMapping';
import styles from '../styles/InternationalMap.module.css';
import { Legend } from './Legend';

interface InternationalMapProps {
  aggregates: CountryAggregate[];
  onCountryHover: (aggregate: CountryAggregate | null, position: { x: number; y: number } | null) => void;
  onCountrySelect: (aggregate: CountryAggregate | null, position: { x: number; y: number } | null) => void;
  selectedCountry: string | null;
}

interface CountryFeatureProperties {
  name?: string;
}

type CountryFeature = GeoFeature<Geometry, CountryFeatureProperties>;

const COLOR_RANGE = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];

const resolveStaticUrl = (relativePath: string) => {
  const base = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${relativePath}`;
};

export function InternationalMap({
  aggregates,
  onCountryHover,
  onCountrySelect,
  selectedCountry
}: InternationalMapProps) {
  const [collection, setCollection] = useState<FeatureCollection<Geometry, CountryFeatureProperties>>();

  useEffect(() => {
    let isMounted = true;
    async function loadTopo() {
      try {
        const response = await fetch(resolveStaticUrl('world-countries-110m.json'));
        if (!response.ok) {
          throw new Error('Unable to load world countries topology');
        }
        const topoJson = await response.json();
        const countries = feature(topoJson, topoJson.objects.countries) as unknown as FeatureCollection<
          Geometry,
          CountryFeatureProperties
        >;
        if (isMounted) {
          setCollection(countries);
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

  const projection = useMemo(() => geoNaturalEarth1().scale(170).translate([480, 305]), []);
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const featureNameSet = useMemo(() => {
    if (!collection) {
      return new Set<string>();
    }
    return new Set(
      collection.features
        .map((featureItem) => featureItem.properties?.name)
        .filter((name): name is string => Boolean(name))
    );
  }, [collection]);

  const aggregateByFeatureName = useMemo(() => {
    const map = new Map<string, CountryAggregate>();
    aggregates.forEach((aggregate) => {
      const featureName = resolveCountryFeatureName(aggregate.country);
      if (!featureName) {
        return;
      }
      if (!featureNameSet.has(featureName)) {
        return;
      }
      map.set(featureName, aggregate);
    });
    return map;
  }, [aggregates, featureNameSet]);

  const values = useMemo(() => {
    return Array.from(aggregateByFeatureName.values())
      .map((aggregate) => aggregate.totalWar)
      .filter((value) => Number.isFinite(value) && value > 0);
  }, [aggregateByFeatureName]);

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

  const selectedFeatureName = useMemo(() => {
    if (!selectedCountry) {
      return null;
    }
    const featureName = resolveCountryFeatureName(selectedCountry);
    if (!featureName) {
      return null;
    }
    return featureNameSet.has(featureName) ? featureName : null;
  }, [selectedCountry, featureNameSet]);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Total career WAR by country</h2>
      <div className={styles.mapContainer}>
        <svg viewBox="0 0 960 600" className={styles.svg} role="img" aria-label="Global WAR choropleth map">
          {(collection?.features as CountryFeature[] | undefined)?.map((featureItem) => {
            const featureName = featureItem.properties?.name ?? '';
            const aggregate = aggregateByFeatureName.get(featureName) ?? null;
            const value = aggregate ? aggregate.totalWar : null;
            const fill = colorScale && value != null ? colorScale(value) : '#f1f3f5';
            const isSelected = selectedFeatureName === featureName;
            return (
              <path
                key={featureName || featureItem.id}
                d={pathGenerator(featureItem) ?? undefined}
                fill={fill}
                stroke={isSelected ? '#212529' : '#94a3b8'}
                strokeWidth={isSelected ? 2.5 : 0.85}
                className={aggregate ? styles.countryActive : styles.country}
                onMouseMove={(event) => {
                  if (!aggregate) {
                    onCountryHover(null, null);
                    return;
                  }
                  onCountryHover(aggregate, { x: event.clientX, y: event.clientY - 12 });
                }}
                onMouseLeave={() => onCountryHover(null, null)}
                onClick={(event) => {
                  if (aggregate) {
                    onCountrySelect(aggregate, { x: event.clientX, y: event.clientY - 12 });
                  }
                }}
              />
            );
          })}
        </svg>
        <div className={styles.legendContainer}>
          <Legend scale={colorScale} title="Total career WAR" />
        </div>
      </div>
    </div>
  );
}
