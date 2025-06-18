
// import pkg from "@prisma/client";
// const { Badges } = pkg;
// import { BADGE_THRESHOLDS } from "../utils/constants.js";

// export class GroupService {

//     constructor(prisma) {
//         this.db = prisma;
//     }

//     async checkAndAwardBadges(groupId) {
//         const group = await this.db.group.findUnique({
//             where: { id: groupId },
//             include: {
//                 _count: {
//                     select: {
//                         participants: true,
//                         records: true
//                     },
//                 },
//             },
//         });

//         if (!group) {
//             throw new Error(`Group with ID ${groupId} not found.`);
//         }

//         //badge 중복 획득 방지 
//         const initialBadgeLength = group.badges.length;
//         const currentBadges = new Set(group.badges);

//         //1) participants 뱃지 확인
//         const participantsCount = group._count.participants;
//         if (participantsCount >= BADGE_THRESHOLDS.PARTICIPATION_10 && !currentBadges.has(Badges.PARTICIPATION_10)) {
//             currentBadges.add(Badges.PARTICIPATION_10);
//             console.log(`${group.name}이 PARTICIPATION_10 BADGE를 획득했습니다!`);
//         }

//         //2) records 뱃지 확인
//         const recordsCount = group._count.records;
//         if (recordsCount >= BADGE_THRESHOLDS.RECORD_100 && !currentBadges.has(Badges.RECORD_100)) {
//             currentBadges.add(Badges.RECORD_100);
//             console.log(`${group.name}이 RECORD_100 BADGE를 획득했습니다!`);
//         }

//         //3) likes 뱃지 확인
//         const likesCount = group.likeCount;
//         if (likesCount >= BADGE_THRESHOLDS.LIKE_100 && !currentBadges.has(Badges.LIKE_100)) {
//             currentBadges.add(Badges.LIKE_100);
//             console.log(`${group.name}이 LIKE_100 BADGE를 획득했습니다!`);
//         }

//         //변경 사항 발생 시 데이터베이스에 뱃지 목록 업데이트
//         if (initialBadgeLength !== currentBadges.size) {
//             try {
//                 await this.db.group.update({
//                     where: { id: groupId },
//                     data: {
//                         badges: Array.from(currentBadges),
//                     },
//                 });
//                 console.log(`${group.name}의 뱃지가 업데이트되었습니다.`);
//             } catch (error) {
//                 console.error(`뱃지 업데이트에 실패했습니다. 오류: ${error.message}`);
//             }
//         } else {
//             console.log(`${group.name}의 뱃지 목록은 이전과 동일합니다.`);
//         }
//     }
// }

