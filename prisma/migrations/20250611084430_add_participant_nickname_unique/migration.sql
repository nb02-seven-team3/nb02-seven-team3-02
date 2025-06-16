/*
  Warnings:

  - A unique constraint covering the columns `[nickname]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Participant_nickname_key" ON "Participant"("nickname");
