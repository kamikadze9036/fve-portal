export type HeatPumpMeterReading = { heatOutputKwh: number | null; hotWaterOutputKwh: number | null; heatInputKwh: number | null; hotWaterInputKwh: number | null };
const delta = (a: number | null, b: number | null) => a == null || b == null ? null : b - a;
const cop = (output: number | null, input: number | null) => output == null || input == null || input <= 0 ? null : output / input;
export function heatPumpInterval(previous: HeatPumpMeterReading | null, next: HeatPumpMeterReading) {
  if (!previous) return null;
  const heatOutputKwh = delta(previous.heatOutputKwh, next.heatOutputKwh); const hotWaterOutputKwh = delta(previous.hotWaterOutputKwh, next.hotWaterOutputKwh);
  const heatInputKwh = delta(previous.heatInputKwh, next.heatInputKwh); const hotWaterInputKwh = delta(previous.hotWaterInputKwh, next.hotWaterInputKwh);
  const heatCop = cop(heatOutputKwh, heatInputKwh); const hotWaterCop = cop(hotWaterOutputKwh, hotWaterInputKwh);
  const totalCop = heatOutputKwh != null && hotWaterOutputKwh != null && heatInputKwh != null && hotWaterInputKwh != null ? cop(heatOutputKwh + hotWaterOutputKwh, heatInputKwh + hotWaterInputKwh) : null;
  const suspicious = [heatOutputKwh, hotWaterOutputKwh, heatInputKwh, hotWaterInputKwh].some((value) => value != null && value < 0) || [heatCop, hotWaterCop, totalCop].some((value) => value != null && (value < 1 || value > 8));
  return { heatOutputKwh, hotWaterOutputKwh, heatInputKwh, hotWaterInputKwh, heatCop, hotWaterCop, totalCop, suspicious };
}
