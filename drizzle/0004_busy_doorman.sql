CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` varchar(48) NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trainer_feedback` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `trainer_feedback` ADD `editedAt` timestamp;--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`);