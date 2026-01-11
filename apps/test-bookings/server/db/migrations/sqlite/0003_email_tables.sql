-- Email templates table
CREATE TABLE IF NOT EXISTS `bookings_emailtemplates` (
  `id` text PRIMARY KEY NOT NULL,
  `teamId` text NOT NULL,
  `owner` text NOT NULL,
  `order` integer DEFAULT 0 NOT NULL,
  `name` text NOT NULL,
  `subject` text NOT NULL,
  `body` text NOT NULL,
  `fromEmail` text NOT NULL,
  `triggerType` text NOT NULL,
  `recipientType` text NOT NULL,
  `isActive` integer DEFAULT false,
  `daysOffset` integer,
  `locationId` text,
  `translations` text,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `createdBy` text NOT NULL,
  `updatedBy` text NOT NULL
);

-- Email logs table
CREATE TABLE IF NOT EXISTS `bookings_emaillogs` (
  `id` text PRIMARY KEY NOT NULL,
  `teamId` text NOT NULL,
  `owner` text NOT NULL,
  `order` integer DEFAULT 0 NOT NULL,
  `bookingId` text,
  `templateId` text,
  `recipientEmail` text NOT NULL,
  `triggerType` text NOT NULL,
  `status` text NOT NULL,
  `sentAt` text,
  `error` text,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `createdBy` text NOT NULL,
  `updatedBy` text NOT NULL
);
