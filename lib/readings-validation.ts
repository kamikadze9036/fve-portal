export const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function dateValue(value: unknown, label = 'Datum') {
  if (typeof value !== 'string' || !isoDate.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`))) {
    throw new Error(`${label} musí být platné datum ve formátu RRRR-MM-DD.`);
  }
  return value;
}

export function nonNegative(value: unknown, label: string, required = false): number | null {
  if (value == null || value === '') {
    if (required) throw new Error(`Pole ${label} je povinné.`);
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`Pole ${label} musí být nezáporné číslo.`);
  return value;
}

export function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
