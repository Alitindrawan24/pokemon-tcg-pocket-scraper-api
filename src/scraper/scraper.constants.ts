export enum ScraperSource {
  LIMITLESS = 'limitless',
  POKEMON_ZONE = 'pokemon-zone',
}

export const SCRAPER_SOURCE_VALUES: ScraperSource[] = [
  ScraperSource.LIMITLESS,
  ScraperSource.POKEMON_ZONE,
];

export const DEFAULT_SCRAPER_SOURCE = ScraperSource.LIMITLESS;

export function normalizeScraperSource(
  value?: string,
): ScraperSource | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();

  return SCRAPER_SOURCE_VALUES.find(
    (entry) => entry === (normalized as ScraperSource),
  );
}
