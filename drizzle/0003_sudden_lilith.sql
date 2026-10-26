CREATE TABLE `daily_edits` (
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`movement_key` text NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`owner`, `day`, `movement_key`)
);
