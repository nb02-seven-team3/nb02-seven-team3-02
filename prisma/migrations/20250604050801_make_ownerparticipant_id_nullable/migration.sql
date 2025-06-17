-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_ownerParticipantId_fkey";

-- AlterTable
ALTER TABLE "Group" ALTER COLUMN "ownerParticipantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerParticipantId_fkey" FOREIGN KEY ("ownerParticipantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
