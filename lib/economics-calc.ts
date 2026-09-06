export const grossPriceCzkPerKwh = (cost: number | null, imported: number | null) => cost != null && imported != null && imported > 0 ? cost / imported : null;
export const netCostCzk = (purchase: number | null, sale: number | null, balancing: number | null) => (purchase ?? 0) - (sale ?? 0) - (balancing ?? 0);
export const effectivePriceCzkPerKwh = (netCost: number, imported: number | null) => imported != null && imported > 0 ? netCost / imported : null;
export const annualSavings = (consumption: number | null, referencePrice: number | null, netCost: number) => consumption != null && referencePrice != null ? consumption * referencePrice - netCost : null;
export const simplePaybackYears = (investment: number, subsidy: number, savings: number | null) => savings != null && savings > 0 ? (investment - subsidy) / savings : null;
