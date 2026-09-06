export const grossPriceCzkPerKwh = (cost: number | null, imported: number | null) => cost != null && imported != null && imported > 0 ? cost / imported : null;
export const netCostCzk = (purchase: number | null, sale: number | null, balancing: number | null) => (purchase ?? 0) - (sale ?? 0) - (balancing ?? 0);
export const effectivePriceCzkPerKwh = (netCost: number, imported: number | null) => imported != null && imported > 0 ? netCost / imported : null;
export const annualSavings = (consumption: number | null, referencePrice: number | null, netCost: number) => consumption != null && referencePrice != null ? consumption * referencePrice - netCost : null;
export const simplePaybackYears = (investment: number, subsidy: number, savings: number | null) => savings != null && savings > 0 ? (investment - subsidy) / savings : null;

type SavingsInterval = { intervalStart: string; pvGenerationKwh: number | null; inverterExportKwh: number | null; pvSelfUseReportedKwh: number | null; saleRevenueCzk: number | null };
type SavingsSetting = { effectiveFrom: string; referencePriceCzkPerKwh: number; investmentCzk: number; subsidyCzk: number };

export function cumulativeSavings(intervals: SavingsInterval[], settings: SavingsSetting[], installDate: string) {
  let selfUseValueCzk = 0;
  let saleRevenueCzk = 0;
  let monthsIncluded = 0;
  for (const row of intervals) {
    if (row.intervalStart < installDate) continue;
    const applicable = settings.filter((setting) => setting.effectiveFrom <= row.intervalStart).at(-1);
    const used = ownUse(row);
    if (applicable && used != null) {
      selfUseValueCzk += used * applicable.referencePriceCzkPerKwh;
      monthsIncluded += 1;
    }
    saleRevenueCzk += row.saleRevenueCzk ?? 0;
  }
  const totalCzk = selfUseValueCzk + saleRevenueCzk;
  const latest = settings.filter((setting) => setting.effectiveFrom <= installDate).at(-1) ?? settings.at(-1);
  const investmentCzk = latest ? latest.investmentCzk - latest.subsidyCzk : null;
  const recoveredPercent = investmentCzk ? totalCzk / investmentCzk * 100 : null;
  return { selfUseValueCzk, saleRevenueCzk, totalCzk, monthsIncluded, investmentCzk, recoveredPercent };
}
import { ownUse } from '@/lib/electricity-calc';
