import prismaClient from '@prisma/client';
const { Badges } = prismaClient;
import { BADGE_THRESHOLDS } from "../utils/constants.js";

export class GroupService {

    constructor(prisma) {
        this.db = prisma;
    }

    async checkAndAwardBadges(groupId) {
        const group = await this.db.group.findUnique({
            where: { id: groupId },
            include: {
                _count: {
                    select: {
                        participants: true,
                        records: true
                    },
                },
            },
        });

        if (!group) {
            throw new Error(`Group with ID ${groupId} not found.`);
        }

        //badge 중복 획득 방지 
        const initialBadgeLength = group.badges.length;
        const currentBadges = new Set(group.badges);

        //1) participants 뱃지 확인
        const participantsCount = group._count.participants;
        if (participantsCount >= BADGE_THRESHOLDS.PARTICIPANTS && !currentBadges.has(Badges.PARTICIPANTS)) {
            currentBadges.add(Badges.PARTICIPANTS);
            console.log(`${group.name}이 PARTICIPANTS BADGE를 획득했습니다!`);
        }

        //2) records 뱃지 확인
        const recordsCount = group._count.records;
        if (recordsCount >= BADGE_THRESHOLDS.RECORDS && !currentBadges.has(Badges.RECORDS)) {
            currentBadges.add(Badges.RECORDS);
            console.log(`${group.name}이 RECORDS BADGE를 획득했습니다!`);
        }

        //3) likes 뱃지 확인
        const likesCount = group.likeCount;
        if (likesCount >= BADGE_THRESHOLDS.LIKES && !currentBadges.has(Badges.LIKES)) {
            currentBadges.add(Badges.LIKES);
            console.log(`${group.name}이 LIKES BADGE를 획득했습니다!`);
        }

        //변경 사항 발생 시 데이터베이스에 뱃지 목록 업데이트
        if (initialBadgeLength !== currentBadges.size) {
            try {
                await this.db.group.update({
                    where: { id: groupId },
                    data: {
                        badges: Array.from(currentBadges),
                    },
                });
                console.log(`${group.name}의 뱃지가 업데이트되었습니다.`);
            } catch (error) {
                console.error(`뱃지 업데이트에 실패했습니다. 오류: ${error.message}`);
            }
        } else {
            console.log(`${group.name}의 뱃지 목록은 이전과 동일합니다.`);
        }
    }
}

