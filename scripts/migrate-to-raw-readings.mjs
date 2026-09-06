// One-off, idempotent backfill. Run manually against a backup first; never at container boot.
import Database from 'better-sqlite3';

const databasePath = process.env.DATABASE_PATH ?? '/data/fve.db';
const sqlite = new Database(databasePath);
sqlite.pragma('foreign_keys = ON');
try {
  sqlite.exec(`
    INSERT OR IGNORE INTO electricity_meter_readings (reading_date, meter_nt_kwh, meter_vt_kwh, source, note)
    SELECT date(period, '+1 month', '-1 day'), meter_nt_kwh, meter_vt_kwh, 'import ze sešitu', source_sheet
    FROM electricity_readings WHERE meter_nt_kwh IS NOT NULL AND meter_vt_kwh IS NOT NULL;

    INSERT OR IGNORE INTO electricity_interval_records
      (interval_start, interval_end, pnd_import_kwh, pnd_export_kwh, inverter_import_kwh, inverter_export_kwh, pv_generation_kwh, pv_self_use_reported_kwh, purchase_cost_czk, sale_revenue_czk, grid_balancing_czk, source_sheet, quality_note)
    SELECT period, date(period, '+1 month', '-1 day'), grid_import_kwh, pnd_export_kwh, pv_purchase_kwh, grid_export_kwh, pv_generation_kwh, pv_self_use_reported_kwh, purchase_cost_czk, sale_revenue_czk, flexibility_revenue_czk, source_sheet, quality_note
    FROM electricity_readings;

    INSERT OR IGNORE INTO water_meter_readings (measured_at, main_meter_m3, garden_meter_m3, source, note)
    SELECT measured_at, main_meter_m3, garden_meter_m3, 'import ze sešitu', source_sheet
    FROM water_readings WHERE main_meter_m3 IS NOT NULL AND garden_meter_m3 IS NOT NULL;
  `);
  const records = sqlite.prepare('SELECT id, source_sheet, pnd_import_kwh, pnd_export_kwh, inverter_import_kwh, inverter_export_kwh, pv_generation_kwh, pv_self_use_reported_kwh, purchase_cost_czk, sale_revenue_czk, grid_balancing_czk FROM electricity_interval_records').all();
  const addSource = sqlite.prepare('INSERT OR IGNORE INTO interval_field_sources (record_id, field_name, source) VALUES (?, ?, ?)');
  for (const record of records) for (const field of ['pnd_import_kwh', 'pnd_export_kwh', 'inverter_import_kwh', 'inverter_export_kwh', 'pv_generation_kwh', 'pv_self_use_reported_kwh', 'purchase_cost_czk', 'sale_revenue_czk', 'grid_balancing_czk']) {
    if (record[field] != null) addSource.run(record.id, field.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), record.source_sheet === 'Ruční záznam' ? 'ruční zápis' : 'import ze sešitu');
  }
  sqlite.prepare("INSERT OR IGNORE INTO economics_settings (effective_from, reference_price_czk_per_kwh, investment_czk, subsidy_czk, note) VALUES ('2020-01-01', 5.5, 230000, 0, 'Historické výchozí hodnoty ze sešitu')").run();
  console.log('Backfill dokončen. Kumulativní odečty TČ nebyly záměrně importovány.');
} finally { sqlite.close(); }
