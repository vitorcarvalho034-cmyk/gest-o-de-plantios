CREATE TABLE `planting_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plantingDate` timestamp NOT NULL,
	`greenhouses` json NOT NULL,
	`totalSeedlingsSent` int NOT NULL,
	`totalSeedlingsPlanted` int NOT NULL DEFAULT 0,
	`status` enum('open','closed','divergent') NOT NULL DEFAULT 'open',
	`closeNote` text,
	`openedById` int NOT NULL,
	`closedById` int,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `planting_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chrysanthemum_plantings` ADD `sessionId` int;