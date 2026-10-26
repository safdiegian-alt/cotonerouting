CREATE TABLE `google_api_usage` (
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`window` integer NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner`, `kind`, `window`)
);
--> statement-breakpoint
CREATE INDEX `google_usage_window_idx` ON `google_api_usage` (`window`);--> statement-breakpoint
ALTER TABLE `contacts` ADD `place_id` text;