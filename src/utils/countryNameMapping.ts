const COUNTRY_NAME_OVERRIDES: Record<string, string | null> = {
  'Czech Republic': 'Czechia',
  'Dominican Republic': 'Dominican Rep.',
  'Viet Nam': 'Vietnam',
  Curacao: null,
  'American Samoa': null,
  'U.S. Virgin Islands': null,
  Guam: null,
  Aruba: null,
  Singapore: null,
  'At Sea': null
};

export function resolveCountryFeatureName(country: string): string | null {
  if (Object.prototype.hasOwnProperty.call(COUNTRY_NAME_OVERRIDES, country)) {
    return COUNTRY_NAME_OVERRIDES[country] ?? null;
  }
  return country;
}
