/*
  Warnings:

  - A unique constraint covering the columns `[groupId,nickname]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Participant_nickname_key";

-- CreateIndex
CREATE UNIQUE INDEX "Participant_groupId_nickname_key" ON "Participant"("groupId", "nickname");
