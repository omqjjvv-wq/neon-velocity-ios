CREATE TABLE `neonPlayers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`displayName` varchar(32) NOT NULL,
	`handleKey` varchar(64) NOT NULL,
	`gameCodeHash` varchar(192) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `neonPlayers_id` PRIMARY KEY(`id`),
	CONSTRAINT `neon_players_handle_key_unique` UNIQUE(`handleKey`)
);
--> statement-breakpoint
ALTER TABLE `leaderboardEntries` ADD `neonPlayerId` int;--> statement-breakpoint
ALTER TABLE `leaderboardEntries` ADD CONSTRAINT `leaderboard_neon_player_unique` UNIQUE(`neonPlayerId`);