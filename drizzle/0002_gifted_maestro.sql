ALTER TABLE `chrysanthemum_plantings` ADD `confirmStatus` enum('pending','confirmed','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `chrysanthemum_plantings` ADD `confirmRejectionReason` text;--> statement-breakpoint
ALTER TABLE `chrysanthemum_plantings` ADD `confirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sunflower_plantings` ADD `confirmStatus` enum('pending','confirmed','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `sunflower_plantings` ADD `confirmRejectionReason` text;--> statement-breakpoint
ALTER TABLE `sunflower_plantings` ADD `confirmedAt` timestamp;