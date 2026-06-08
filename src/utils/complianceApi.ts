import { apiFetch } from './api';

// ── Compliance / national EPR registration numbers ───────────────────────────────
//
// Each supported country has its own producer-registry identifier:
//   • DE → LUCID packaging register number (lucidRegistrationNumber)
//   • FR → SIRET number (siretNumber)
// New portals (e.g. Citeo for France) can be added by extending COMPLIANCE_FIELDS
// and the ComplianceInfo shape — the Settings form and Dashboard checklist are
// fully data-driven off this config.

export interface ComplianceInfo {
  lucidRegistrationNumber: string | null;
  siretNumber: string | null;
}

export type ComplianceFieldKey = keyof ComplianceInfo;

export interface ComplianceFieldConfig {
  /** Property name on the ComplianceInfo payload. */
  key: ComplianceFieldKey;
  /** ISO country code this registration belongs to (drives flag + label). */
  country: string;
  /** Human-readable registry/portal name (LUCID, SIRET, …). */
  portal: string;
  /** Example value shown as the input placeholder. */
  placeholder: string;
}

export const COMPLIANCE_FIELDS: ComplianceFieldConfig[] = [
  { key: 'lucidRegistrationNumber', country: 'DE', portal: 'LUCID', placeholder: 'DE1234567890123' },
  { key: 'siretNumber', country: 'FR', portal: 'SIRET', placeholder: 'FR12345678901234' },
];

/** GET /shops/compliance-info — current registration numbers for the shop. */
export async function fetchComplianceInfo(): Promise<ComplianceInfo> {
  return apiFetch('/shops/compliance-info');
}

/** PATCH /shops/compliance-info — update one or more registration numbers. */
export async function updateComplianceInfo(
  patch: Partial<ComplianceInfo>,
): Promise<ComplianceInfo> {
  return apiFetch('/shops/compliance-info', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/**
 * Registration numbers the shop still needs to provide: a field is "missing"
 * only when the shop has shipped at least one order to that country AND the
 * number has not been entered yet.
 */
export function computeMissingCompliance(
  info: ComplianceInfo | null,
  shippedCountryCodes: string[],
): ComplianceFieldConfig[] {
  if (!info) return [];
  const shipped = new Set(shippedCountryCodes.map((c) => c.toUpperCase()));
  return COMPLIANCE_FIELDS.filter(
    (f) => shipped.has(f.country) && !String(info[f.key] ?? '').trim(),
  );
}
