import stateMetaData from './stateMetaData.json';

export interface StateMeta {
  name: string;
  postal: string;
  fips: string;
}

export const STATES: StateMeta[] = stateMetaData;

const byPostal = new Map(STATES.map((state) => [state.postal.toUpperCase(), state]));
const byName = new Map(STATES.map((state) => [state.name.toLowerCase(), state]));

export function findStateMeta(value: string | null | undefined): StateMeta | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const postalMatch = byPostal.get(trimmed.toUpperCase());
  if (postalMatch) {
    return postalMatch;
  }
  return byName.get(trimmed.toLowerCase());
}
