export enum ScraperSource {
  LIMITLESS = 'limitless',
  POKEMON_ZONE = 'pokemon-zone',
  POKEMON_GO_HUB = 'pokemon-go-hub',
}

export const SCRAPER_SOURCE_VALUES: ScraperSource[] = [
  ScraperSource.LIMITLESS,
  ScraperSource.POKEMON_ZONE,
  ScraperSource.POKEMON_GO_HUB,
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
