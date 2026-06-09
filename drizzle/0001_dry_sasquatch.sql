CREATE TABLE `chrysanthemum_plantings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`plantingDate` timestamp NOT NULL,
	`greenhouses` json NOT NULL,
	`totalSeedlings` int NOT NULL,
	`totalBoxes` int NOT NULL,
	`discountBoxes` int NOT NULL DEFAULT 0,
	`discountReason` text,
	`absenceReason` text,
	`launchedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chrysanthemum_plantings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(256) NOT NULL,
	`role` enum('employee','launcher','admin') NOT NULL DEFAULT 'employee',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `sunflower_plantings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`plantingDate` timestamp NOT NULL,
	`trays` int NOT NULL,
	`discountTrays` int NOT NULL DEFAULT 0,
	`discountReason` text,
	`absenceReason` text,
	`launchedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sunflower_plantings_id` PRIMARY KEY(`id`)
);
