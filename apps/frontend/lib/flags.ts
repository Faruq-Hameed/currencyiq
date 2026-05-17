/** Sizes available on flagcdn.com */
export type FlagSize = 40 | 80 | 160 | 320;

/**
 * Returns a flagcdn.com URL for the given country code.
 * countryCode must be ISO alpha-2, lowercase (e.g. "ng", "us", "eu").
 * The backend already stores the resolved URL in flag_url, so this helper
 * is only needed when building URLs client-side.
 */
export function flagCdn(countryCode: string, size: FlagSize = 80): string {
  return `https://flagcdn.com/w${size}/${countryCode.toLowerCase()}.png`;
}

/**
 * Upgrade a stored flag_url (w80) to a larger size for hero displays.
 * Handles the /w80/ → /wN/ replacement safely.
 */
export function upgradeFlagSize(url: string | undefined | null, size: FlagSize): string | undefined {
  if (!url) return undefined;
  // flagcdn URLs look like: https://flagcdn.com/w80/ng.png
  return url.replace(/\/w\d+\//, `/w${size}/`);
}
