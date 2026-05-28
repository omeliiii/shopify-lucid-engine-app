// ── Country code utilities (DE / IT / FR only for now) ─────────────────────────

interface CountryInfo {
  label: string;
  flag: string;
}

const COUNTRY_MAP: Record<string, CountryInfo> = {
  DE: { label: 'Germany', flag: '🇩🇪' },
  IT: { label: 'Italy', flag: '🇮🇹' },
  FR: { label: 'France', flag: '🇫🇷' },
};

/** Return "Germany", "Italy", etc — falls back to the code itself. */
export function countryLabel(code: string): string {
  return COUNTRY_MAP[code.toUpperCase()]?.label ?? code;
}

/** Return "🇩🇪", "🇮🇹", etc — empty string if unknown. */
export function countryFlag(code: string): string {
  return COUNTRY_MAP[code.toUpperCase()]?.flag ?? '';
}

/** Return "🇩🇪 Germany (DE)" */
export function countryDisplay(code: string): string {
  const upper = code.toUpperCase();
  const info = COUNTRY_MAP[upper];
  if (!info) return upper;
  return `${info.flag} ${info.label} (${upper})`;
}

/** Build `{label, value}[]` from a list of ISO codes — ready for Polaris Select. */
export function countryOptions(codes: string[]): { label: string; value: string }[] {
  return codes.map((c) => {
    const upper = c.toUpperCase();
    const info = COUNTRY_MAP[upper];
    return {
      label: info ? `${info.flag} ${info.label} (${upper})` : upper,
      value: upper,
    };
  });
}
