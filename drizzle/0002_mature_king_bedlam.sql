ALTER TABLE `leaderboardEntries` DROP INDEX `leaderboardEntries_deviceId_unique`;--> statement-breakpoint
ALTER TABLE `leaderboardEntries` DROP INDEX `leaderboard_neon_player_unique`;--> statement-breakpoint
DROP INDEX `leaderboard_score_idx` ON `leaderboardEntries`;--> statement-breakpoint
ALTER TABLE `leaderboardEntries` ADD `gameVariant` enum('original','error-dimension') DEFAULT 'original' NOT NULL;--> statement-breakpoint
ALTER TABLE `leaderboardEntries` ADD CONSTRAINT `leaderboard_device_variant_unique` UNIQUE(`deviceId`,`gameVariant`);--> statement-breakpoint
ALTER TABLE `leaderboardEntries` ADD CONSTRAINT `leaderboard_neon_player_variant_unique` UNIQUE(`neonPlayerId`,`gameVariant`);--> statement-breakpoint
CREATE INDEX `leaderboard_score_idx` ON `leaderboardEntries` (`gameVariant`,`bestScore`);