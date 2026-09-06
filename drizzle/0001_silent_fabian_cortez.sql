CREATE TABLE `app_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `heat_pump_readings` ADD `interval_end` text;--> statement-breakpoint
ALTER TABLE `heat_pump_readings` ADD `interval_days` integer;--> statement-breakpoint
ALTER TABLE `heat_pump_readings` ADD `quality_note` text;