CREATE TABLE `trainer_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerUserId` int NOT NULL,
	`clientUserId` int NOT NULL,
	`targetType` enum('checkIn','workout','food') NOT NULL,
	`targetId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trainer_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `trainer_feedback_client_idx` ON `trainer_feedback` (`clientUserId`);--> statement-breakpoint
CREATE INDEX `trainer_feedback_target_idx` ON `trainer_feedback` (`targetType`,`targetId`);