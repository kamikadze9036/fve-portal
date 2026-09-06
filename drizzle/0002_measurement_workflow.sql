CREATE TABLE `electricity_meter_readings` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `reading_date` text NOT NULL, `meter_nt_kwh` real NOT NULL, `meter_vt_kwh` real NOT NULL, `source` text DEFAULT 'PND' NOT NULL, `note` text, `quality_status` text DEFAULT 'platné' NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_electricity_meter_readings_date` ON `electricity_meter_readings` (`reading_date`);
--> statement-breakpoint
CREATE TABLE `electricity_interval_records` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `interval_start` text NOT NULL, `interval_end` text NOT NULL, `pnd_import_kwh` real, `pnd_export_kwh` real, `inverter_import_kwh` real, `inverter_export_kwh` real, `pv_generation_kwh` real, `house_consumption_kwh` real, `pv_self_use_reported_kwh` real, `purchase_cost_czk` real, `sale_revenue_czk` real, `grid_balancing_czk` real, `source_sheet` text DEFAULT 'Ruční záznam' NOT NULL, `quality_note` text, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_electricity_interval` ON `electricity_interval_records` (`interval_start`,`interval_end`);
--> statement-breakpoint
CREATE TABLE `interval_field_sources` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `record_id` integer NOT NULL REFERENCES `electricity_interval_records`(`id`), `field_name` text NOT NULL, `source` text NOT NULL, `captured_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_interval_field_sources` ON `interval_field_sources` (`record_id`,`field_name`);
--> statement-breakpoint
CREATE TABLE `water_meter_readings` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `measured_at` text NOT NULL, `main_meter_m3` real NOT NULL, `garden_meter_m3` real NOT NULL, `source` text DEFAULT 'ruční zápis' NOT NULL, `note` text, `quality_status` text DEFAULT 'platné' NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_water_meter_readings_date` ON `water_meter_readings` (`measured_at`);
--> statement-breakpoint
CREATE TABLE `heat_pump_meter_readings` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `measured_at` text NOT NULL, `heat_output_kwh` real, `hot_water_output_kwh` real, `heat_input_kwh` real, `hot_water_input_kwh` real, `source` text DEFAULT 'ruční zápis' NOT NULL, `note` text, `quality_status` text DEFAULT 'platné' NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_heat_pump_meter_readings_date` ON `heat_pump_meter_readings` (`measured_at`);
--> statement-breakpoint
CREATE TABLE `audit_log` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `table_name` text NOT NULL, `record_id` integer NOT NULL, `field_name` text NOT NULL, `old_value` text, `new_value` text, `changed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `changed_by` text DEFAULT 'ruční úprava' NOT NULL);
--> statement-breakpoint
CREATE TABLE `economics_settings` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `effective_from` text NOT NULL, `reference_price_czk_per_kwh` real NOT NULL, `investment_czk` real NOT NULL, `subsidy_czk` real DEFAULT 0 NOT NULL, `note` text);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_economics_settings_effective_from` ON `economics_settings` (`effective_from`);
