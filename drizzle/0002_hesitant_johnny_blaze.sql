CREATE TABLE `check_ins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientUserId` int NOT NULL,
	`mood` int NOT NULL,
	`energy` int NOT NULL,
	`wins` text,
	`blockers` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `check_ins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `food_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientUserId` int NOT NULL,
	`meal` varchar(80) NOT NULL,
	`calories` int,
	`notes` text,
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weight_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientUserId` int NOT NULL,
	`weight` decimal(6,2) NOT NULL,
	`unit` varchar(8) NOT NULL DEFAULT 'kg',
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weight_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientUserId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`durationMinutes` int NOT NULL,
	`notes` text,
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workout_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `invites` ADD `acceptedAt` timestamp;--> statement-breakpoint
CREATE INDEX `check_ins_client_idx` ON `check_ins` (`clientUserId`);--> statement-breakpoint
CREATE INDEX `food_logs_client_idx` ON `food_logs` (`clientUserId`);--> statement-breakpoint
CREATE INDEX `weight_entries_client_idx` ON `weight_entries` (`clientUserId`);--> statement-breakpoint
CREATE INDEX `workout_logs_client_idx` ON `workout_logs` (`clientUserId`);