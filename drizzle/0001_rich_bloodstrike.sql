CREATE TABLE `client_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trainerUserId` int NOT NULL,
	`goals` text,
	`startingWeight` varchar(32),
	`labsNote` text,
	`status` enum('active','paused','cancelled') NOT NULL DEFAULT 'active',
	`disclaimerAcknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `course_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`clientUserId` int NOT NULL,
	`status` enum('active','paused','cancelled') NOT NULL DEFAULT 'active',
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `course_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_access_course_client_idx` UNIQUE(`courseId`,`clientUserId`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`accent` varchar(32) NOT NULL DEFAULT 'lime',
	`status` enum('draft','published') NOT NULL DEFAULT 'published',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerUserId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(96) NOT NULL,
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `module_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` int NOT NULL,
	`clientUserId` int NOT NULL,
	`status` enum('locked','unlocked','completed') NOT NULL DEFAULT 'locked',
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `module_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `module_progress_module_client_idx` UNIQUE(`moduleId`,`clientUserId`)
);
--> statement-breakpoint
CREATE TABLE `modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`position` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`summary` text NOT NULL,
	`contentType` enum('video','reading') NOT NULL DEFAULT 'reading',
	`contentUrl` text,
	`durationMinutes` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `modules_course_position_idx` UNIQUE(`courseId`,`position`)
);
--> statement-breakpoint
CREATE INDEX `client_profiles_trainer_idx` ON `client_profiles` (`trainerUserId`);