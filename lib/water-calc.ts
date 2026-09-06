export type WaterMeterReading = { mainMeterM3: number; gardenMeterM3: number };
export function waterInterval(previous: WaterMeterReading | null, next: WaterMeterReading) {
  if (!previous) return null;
  const totalM3 = next.mainMeterM3 - previous.mainMeterM3;
  const gardenM3 = next.gardenMeterM3 - previous.gardenMeterM3;
  return { totalM3, gardenM3, householdM3: totalM3 - gardenM3, qualityStatus: gardenM3 < 0 || gardenM3 > totalM3 || totalM3 < 0 ? 'podezřelé' : 'platné' as const };
}
