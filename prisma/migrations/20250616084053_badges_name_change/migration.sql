/*
  Warnings:

  - The values [PARTICIPANTS,RECORDS,LIKES] on the enum `Badges` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Badges_new" AS ENUM ('PARTICIPATION_10', 'RECORD_100', 'LIKE_100');
ALTER TABLE "Group" ALTER COLUMN "badges" TYPE "Badges_new"[] USING ("badges"::text::"Badges_new"[]);
ALTER TYPE "Badges" RENAME TO "Badges_old";
ALTER TYPE "Badges_new" RENAME TO "Badges";
DROP TYPE "Badges_old";
COMMIT;
