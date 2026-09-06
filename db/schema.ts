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

// Raw, date-based readings. The legacy tables above stay intact for rollback and
// historical display while the application is migrated to these source records.
export const electricityMeterReadings = sqliteTable('electricity_meter_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  readingDate: text('reading_date').notNull(),
  meterNtKwh: real('meter_nt_kwh').notNull(),
  meterVtKwh: real('meter_vt_kwh').notNull(),
  source: text('source').notNull().default('PND'),
  note: text('note'),
  qualityStatus: text('quality_status').notNull().default('platné'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex('ux_electricity_meter_readings_date').on(table.readingDate)]);

export const electricityIntervalRecords = sqliteTable('electricity_interval_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  intervalStart: text('interval_start').notNull(),
  intervalEnd: text('interval_end').notNull(),
  pndImportKwh: real('pnd_import_kwh'),
  pndExportKwh: real('pnd_export_kwh'),
  inverterImportKwh: real('inverter_import_kwh'),
  inverterExportKwh: real('inverter_export_kwh'),
  pvGenerationKwh: real('pv_generation_kwh'),
  houseConsumptionKwh: real('house_consumption_kwh'),
  pvSelfUseReportedKwh: real('pv_self_use_reported_kwh'),
  purchaseCostCzk: real('purchase_cost_czk'),
  saleRevenueCzk: real('sale_revenue_czk'),
  gridBalancingCzk: real('grid_balancing_czk'),
  sourceSheet: text('source_sheet').notNull().default('Ruční záznam'),
  qualityNote: text('quality_note'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex('ux_electricity_interval').on(table.intervalStart, table.intervalEnd)]);

export const intervalFieldSources = sqliteTable('interval_field_sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recordId: integer('record_id').notNull().references(() => electricityIntervalRecords.id),
  fieldName: text('field_name').notNull(),
  source: text('source').notNull(),
  capturedAt: text('captured_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex('ux_interval_field_sources').on(table.recordId, table.fieldName)]);

export const waterMeterReadings = sqliteTable('water_meter_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  measuredAt: text('measured_at').notNull(),
  mainMeterM3: real('main_meter_m3').notNull(),
  gardenMeterM3: real('garden_meter_m3').notNull(),
  source: text('source').notNull().default('ruční zápis'),
  note: text('note'),
  qualityStatus: text('quality_status').notNull().default('platné'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex('ux_water_meter_readings_date').on(table.measuredAt)]);

export const heatPumpMeterReadings = sqliteTable('heat_pump_meter_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  measuredAt: text('measured_at').notNull(),
  heatOutputKwh: real('heat_output_kwh'),
  hotWaterOutputKwh: real('hot_water_output_kwh'),
  heatInputKwh: real('heat_input_kwh'),
  hotWaterInputKwh: real('hot_water_input_kwh'),
  source: text('source').notNull().default('ruční zápis'),
  note: text('note'),
  qualityStatus: text('quality_status').notNull().default('platné'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex('ux_heat_pump_meter_readings_date').on(table.measuredAt)]);

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(), recordId: integer('record_id').notNull(), fieldName: text('field_name').notNull(),
  oldValue: text('old_value'), newValue: text('new_value'), changedAt: text('changed_at').notNull().default(sql`CURRENT_TIMESTAMP`), changedBy: text('changed_by').notNull().default('ruční úprava'),
});

export const economicsSettings = sqliteTable('economics_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }), effectiveFrom: text('effective_from').notNull(),
  referencePriceCzkPerKwh: real('reference_price_czk_per_kwh').notNull(), investmentCzk: real('investment_czk').notNull(), subsidyCzk: real('subsidy_czk').notNull().default(0), note: text('note'),
}, (table) => [uniqueIndex('ux_economics_settings_effective_from').on(table.effectiveFrom)]);
