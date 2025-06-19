-- DropForeignKey
ALTER TABLE "Record" DROP CONSTRAINT "Record_participantId_fkey";

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
