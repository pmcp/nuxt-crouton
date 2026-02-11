CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`idToken` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE INDEX `account_provider_idx` ON `account` (`providerId`,`accountId`);--> statement-breakpoint
CREATE TABLE `domain` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`domain` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`verificationToken` text NOT NULL,
	`verifiedAt` integer,
	`isPrimary` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domain_domain_unique` ON `domain` (`domain`);--> statement-breakpoint
CREATE INDEX `domain_org_idx` ON `domain` (`organizationId`);--> statement-breakpoint
CREATE INDEX `domain_domain_idx` ON `domain` (`domain`);--> statement-breakpoint
CREATE INDEX `domain_status_idx` ON `domain` (`status`);--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`inviterId` text NOT NULL,
	`organizationId` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer NOT NULL,
	`expiresAt` integer NOT NULL,
	`teamId` text,
	FOREIGN KEY (`inviterId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invitation_email_idx` ON `invitation` (`email`);--> statement-breakpoint
CREATE INDEX `invitation_org_idx` ON `invitation` (`organizationId`);--> statement-breakpoint
CREATE INDEX `invitation_status_idx` ON `invitation` (`status`);--> statement-breakpoint
CREATE TABLE `member` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `member_user_idx` ON `member` (`userId`);--> statement-breakpoint
CREATE INDEX `member_org_idx` ON `member` (`organizationId`);--> statement-breakpoint
CREATE INDEX `member_user_org_idx` ON `member` (`userId`,`organizationId`);--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`metadata` text,
	`personal` integer DEFAULT false NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL,
	`ownerId` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_unique` ON `organization` (`slug`);--> statement-breakpoint
CREATE INDEX `organization_slug_idx` ON `organization` (`slug`);--> statement-breakpoint
CREATE INDEX `organization_owner_idx` ON `organization` (`ownerId`);--> statement-breakpoint
CREATE INDEX `organization_default_idx` ON `organization` (`isDefault`);--> statement-breakpoint
CREATE INDEX `organization_personal_idx` ON `organization` (`personal`);--> statement-breakpoint
CREATE TABLE `passkey` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`publicKey` text NOT NULL,
	`userId` text NOT NULL,
	`credentialID` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`deviceType` text NOT NULL,
	`backedUp` integer DEFAULT false NOT NULL,
	`transports` text,
	`createdAt` integer,
	`aaguid` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passkey_credentialID_unique` ON `passkey` (`credentialID`);--> statement-breakpoint
CREATE INDEX `passkey_user_idx` ON `passkey` (`userId`);--> statement-breakpoint
CREATE INDEX `passkey_credential_idx` ON `passkey` (`credentialID`);--> statement-breakpoint
CREATE TABLE `rakim_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`sourceType` text NOT NULL,
	`name` text NOT NULL,
	`emailAddress` text,
	`emailSlug` text,
	`webhookUrl` text,
	`webhookSecret` text,
	`apiToken` text,
	`notionToken` text NOT NULL,
	`notionDatabaseId` text NOT NULL,
	`notionFieldMapping` text,
	`anthropicApiKey` text,
	`aiEnabled` integer NOT NULL,
	`aiSummaryPrompt` text,
	`aiTaskPrompt` text,
	`autoSync` integer NOT NULL,
	`postConfirmation` integer NOT NULL,
	`enableEmailForwarding` integer NOT NULL,
	`active` integer NOT NULL,
	`onboardingComplete` integer NOT NULL,
	`sourceMetadata` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rakim_discussions` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`sourceType` text NOT NULL,
	`sourceThreadId` text NOT NULL,
	`sourceUrl` text NOT NULL,
	`sourceConfigId` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`authorHandle` text NOT NULL,
	`participants` text,
	`status` text NOT NULL,
	`threadData` text,
	`totalMessages` integer,
	`aiSummary` text,
	`aiKeyPoints` text,
	`aiTasks` text,
	`isMultiTask` integer,
	`syncJobId` text,
	`notionTaskIds` text,
	`rawPayload` text,
	`metadata` text,
	`processedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rakim_flowinputs` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`flowId` text NOT NULL,
	`sourceType` text NOT NULL,
	`name` text NOT NULL,
	`apiToken` text,
	`webhookUrl` text,
	`webhookSecret` text,
	`emailAddress` text,
	`emailSlug` text,
	`sourceMetadata` text,
	`active` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rakim_flowoutputs` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`flowId` text NOT NULL,
	`outputType` text NOT NULL,
	`name` text NOT NULL,
	`domainFilter` text,
	`isDefault` integer,
	`outputConfig` text,
	`active` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rakim_flows` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`availableDomains` text,
	`aiEnabled` integer NOT NULL,
	`anthropicApiKey` text,
	`aiSummaryPrompt` text,
	`aiTaskPrompt` text,
	`active` integer NOT NULL,
	`onboardingComplete` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rakim_inboxmessages` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`configId` text NOT NULL,
	`messageType` text NOT NULL,
	`from` text NOT NULL,
	`to` text NOT NULL,
	`subject` text NOT NULL,
	`htmlBody` text,
	`textBody` text,
	`receivedAt` integer NOT NULL,
	`read` integer,
	`forwardedTo` text,
	`forwardedAt` integer,
	`resendEmailId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rakim_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`discussionId` text NOT NULL,
	`sourceConfigId` text NOT NULL,
	`status` text NOT NULL,
	`stage` text,
	`attempts` integer NOT NULL,
	`maxAttempts` integer NOT NULL,
	`error` text,
	`errorStack` text,
	`startedAt` integer,
	`completedAt` integer,
	`processingTime` integer,
	`taskIds` text,
	`metadata` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rakim_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`discussionId` text NOT NULL,
	`syncJobId` text NOT NULL,
	`notionPageId` text NOT NULL,
	`notionPageUrl` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text NOT NULL,
	`priority` text,
	`assignee` text,
	`summary` text,
	`sourceUrl` text NOT NULL,
	`isMultiTaskChild` integer NOT NULL,
	`taskIndex` integer,
	`metadata` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rakim_tasks_notionPageId_unique` ON `rakim_tasks` (`notionPageId`);--> statement-breakpoint
CREATE TABLE `rakim_usermappings` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`sourceType` text NOT NULL,
	`sourceWorkspaceId` text NOT NULL,
	`sourceUserId` text NOT NULL,
	`sourceUserEmail` text,
	`sourceUserName` text,
	`notionUserId` text,
	`notionUserName` text,
	`notionUserEmail` text,
	`mappingType` text NOT NULL,
	`confidence` integer,
	`active` integer NOT NULL,
	`lastSyncedAt` text,
	`metadata` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scopedAccessToken` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`token` text NOT NULL,
	`resourceType` text NOT NULL,
	`resourceId` text NOT NULL,
	`displayName` text NOT NULL,
	`role` text DEFAULT 'guest' NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`expiresAt` integer NOT NULL,
	`lastActiveAt` integer,
	`metadata` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scopedAccessToken_token_unique` ON `scopedAccessToken` (`token`);--> statement-breakpoint
CREATE INDEX `scoped_access_token_idx` ON `scopedAccessToken` (`token`);--> statement-breakpoint
CREATE INDEX `scoped_access_org_idx` ON `scopedAccessToken` (`organizationId`);--> statement-breakpoint
CREATE INDEX `scoped_access_resource_idx` ON `scopedAccessToken` (`resourceType`,`resourceId`);--> statement-breakpoint
CREATE INDEX `scoped_access_active_idx` ON `scopedAccessToken` (`isActive`,`expiresAt`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`token` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`activeOrganizationId` text,
	`impersonatingFrom` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE INDEX `session_token_idx` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_active_org_idx` ON `session` (`activeOrganizationId`);--> statement-breakpoint
CREATE INDEX `session_impersonating_idx` ON `session` (`impersonatingFrom`);--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`plan` text NOT NULL,
	`referenceId` text NOT NULL,
	`stripeCustomerId` text,
	`stripeSubscriptionId` text,
	`status` text DEFAULT 'incomplete' NOT NULL,
	`periodStart` integer,
	`periodEnd` integer,
	`cancelAtPeriodEnd` integer DEFAULT false,
	`seats` integer,
	`trialStart` integer,
	`trialEnd` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subscription_reference_idx` ON `subscription` (`referenceId`);--> statement-breakpoint
CREATE INDEX `subscription_stripe_idx` ON `subscription` (`stripeSubscriptionId`);--> statement-breakpoint
CREATE INDEX `subscription_status_idx` ON `subscription` (`status`);--> statement-breakpoint
CREATE TABLE `team_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`translations` text,
	`ai_settings` text,
	`theme_settings` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`team_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_settings_team_id_unique` ON `team_settings` (`team_id`);--> statement-breakpoint
CREATE INDEX `team_settings_team_idx` ON `team_settings` (`team_id`);--> statement-breakpoint
CREATE TABLE `twoFactor` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`secret` text NOT NULL,
	`backupCodes` text,
	`enabled` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `two_factor_user_idx` ON `twoFactor` (`userId`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`stripeCustomerId` text,
	`superAdmin` integer DEFAULT false NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`bannedReason` text,
	`bannedUntil` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_email_idx` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_stripe_customer_idx` ON `user` (`stripeCustomerId`);--> statement-breakpoint
CREATE INDEX `user_super_admin_idx` ON `user` (`superAdmin`);--> statement-breakpoint
CREATE INDEX `user_banned_idx` ON `user` (`banned`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);