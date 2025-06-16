/*
  Warnings:

  - The `badges` column on the `Group` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `updateAt` on the `Tag` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Badges" AS ENUM ('PARTICIPANTS', 'RECORDS', 'LIKES');

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "badges",
ADD COLUMN     "badges" "Badges"[];

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "updateAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
