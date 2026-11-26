CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`published` integer DEFAULT false NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
