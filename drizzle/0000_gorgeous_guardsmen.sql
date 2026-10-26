CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`aliases` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`lat` real,
	`lon` real,
	`confirmed` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contacts_owner_idx` ON `contacts` (`owner`);