-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_ownerParticipantId_fkey";

-- DropForeignKey
ALTER TABLE "GroupTag" DROP CONSTRAINT "GroupTag_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Participant" DROP CONSTRAINT "Participant_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Record" DROP CONSTRAINT "Record_groupId_fkey";

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerParticipantId_fkey" FOREIGN KEY ("ownerParticipantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTag" ADD CONSTRAINT "GroupTag_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
