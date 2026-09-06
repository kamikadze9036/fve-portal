CREATE TABLE `electricity_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period` text NOT NULL,
	`meter_nt_kwh` real,
	`meter_vt_kwh` real,
	`pnd_export_kwh` real,
	`grid_import_kwh` real,
	`pv_generation_kwh` real,
	`pv_self_use_reported_kwh` real,
	`grid_export_kwh` real,
	`pv_purchase_kwh` real,
	`sale_revenue_czk` real,
	`flexibility_revenue_czk` real,
	`purchase_cost_czk` real,
	`avoided_cost_czk` real,
	`source_sheet` text DEFAULT 'Ruční záznam' NOT NULL,
	`source_date` text,
	`quality_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_electricity_readings_period` ON `electricity_readings` (`period`);--> statement-breakpoint
CREATE TABLE `heat_pump_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period` text NOT NULL,
	`heat_output_kwh` real,
	`hot_water_output_kwh` real,
	`heat_input_kwh` real,
	`hot_water_input_kwh` real,
	`heat_cop` real,
	`hot_water_cop` real,
	`source_sheet` text DEFAULT 'Tepelko' NOT NULL,
	`source_date` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_heat_pump_readings_period` ON `heat_pump_readings` (`period`);--> statement-breakpoint
CREATE TABLE `water_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`measured_at` text NOT NULL,
	`main_meter_m3` real,
	`garden_meter_m3` real,
	`main_consumption_m3` real,
	`garden_consumption_m3` real,
	`household_consumption_m3` real,
	`source_sheet` text DEFAULT 'Voda' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_water_readings_measured_at` ON `water_readings` (`measured_at`);