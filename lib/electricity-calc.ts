export type MeterReading = { meterNtKwh: number; meterVtKwh: number };
export type ElectricityInterval = { pndImportKwh: number | null; pndExportKwh: number | null; inverterImportKwh: number | null; inverterExportKwh: number | null; pvGenerationKwh: number | null; pvSelfUseReportedKwh: number | null };
export const pndImportFromMeterReadings = (previous: MeterReading | null, next: MeterReading) => previous ? next.meterNtKwh + next.meterVtKwh - previous.meterNtKwh - previous.meterVtKwh : null;
export const ownUse = (row: ElectricityInterval) => row.pvGenerationKwh != null && row.inverterExportKwh != null ? row.pvGenerationKwh - row.inverterExportKwh : row.pvSelfUseReportedKwh;
export const consumptionByPnd = (row: ElectricityInterval) => row.pvGenerationKwh != null && row.pndExportKwh != null && row.pndImportKwh != null ? row.pvGenerationKwh - row.pndExportKwh + row.pndImportKwh : null;
export const consumptionByInverter = (row: ElectricityInterval) => row.pvGenerationKwh != null && row.inverterExportKwh != null && row.inverterImportKwh != null ? row.pvGenerationKwh - row.inverterExportKwh + row.inverterImportKwh : null;
export const importDelta = (row: ElectricityInterval) => row.inverterImportKwh != null && row.pndImportKwh != null ? row.inverterImportKwh - row.pndImportKwh : null;
export const exportDelta = (row: ElectricityInterval) => row.inverterExportKwh != null && row.pndExportKwh != null ? row.inverterExportKwh - row.pndExportKwh : null;
