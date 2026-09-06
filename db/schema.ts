import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const electricityReadings = sqliteTable('electricity_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  period: text('period').notNull(),
  meterNtKwh: real('meter_nt_kwh'),
  meterVtKwh: real('meter_vt_kwh'),
  pndExportKwh: real('pnd_export_kwh'),
  gridImportKwh: real('grid_import_kwh'),
  pvGenerationKwh: real('pv_generation_kwh'),
  pvSelfUseReportedKwh: real('pv_self_use_reported_kwh'),
  gridExportKwh: real('grid_export_kwh'),
  pvPurchaseKwh: real('pv_purchase_kwh'),
  saleRevenueCzk: real('sale_revenue_czk'),
  flexibilityRevenueCzk: real('flexibility_revenue_czk'),
  purchaseCostCzk: real('purchase_cost_czk'),
  avoidedCostCzk: real('avoided_cost_czk'),
  sourceSheet: text('source_sheet').notNull().default('Ruční záznam'),
  sourceDate: text('source_date'),
  qualityNote: text('quality_note'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('ux_electricity_readings_period').on(table.period),
]);

export const waterReadings = sqliteTable('water_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  measuredAt: text('measured_at').notNull(),
  mainMeterM3: real('main_meter_m3'),
  gardenMeterM3: real('garden_meter_m3'),
  mainConsumptionM3: real('main_consumption_m3'),
  gardenConsumptionM3: real('garden_consumption_m3'),
  householdConsumptionM3: real('household_consumption_m3'),
  sourceSheet: text('source_sheet').notNull().default('Voda'),
}, (table) => [uniqueIndex('ux_water_readings_measured_at').on(table.measuredAt)]);

export const heatPumpReadings = sqliteTable('heat_pump_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  period: text('period').notNull(),
  heatOutputKwh: real('heat_output_kwh'),
  hotWaterOutputKwh: real('hot_water_output_kwh'),
  heatInputKwh: real('heat_input_kwh'),
  hotWaterInputKwh: real('hot_water_input_kwh'),
  heatCop: real('heat_cop'),
  hotWaterCop: real('hot_water_cop'),
  sourceSheet: text('source_sheet').notNull().default('Tepelko'),
  sourceDate: text('source_date'),
  intervalEnd: text('interval_end'),
  intervalDays: integer('interval_days'),
  qualityNote: text('quality_note'),
}, (table) => [
  uniqueIndex('ux_heat_pump_readings_period').on(table.period),
]);

export const appMetadata = sqliteTable('app_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
