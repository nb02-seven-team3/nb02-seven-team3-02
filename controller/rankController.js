export class RankController {
    constructor(prisma) {
        this.db = prisma;
    }

    async getRank(req, res, next) {
        try {
            // TODO: 그룹 ID 유효성 검사 추가
            // TODO: groupId가 숫자인지 확인 - 아니면 400 "groupId must be integer"
            // Path 파라미터에서 groupId를 추출
            const groupId = Number(req.params.groupId);
            const validateGroupId = function (groupId) {
                if (typeof groupId !== 'number' || !Number.isInteger(groupId) || groupId <= 0) {
                    throw new Error('유효하지 않은 groupId입니다.');
                }
            };

            400; "groupId must be integer"
            //그룹 유효성 검사란

            // TODO: groupId가 유효한지 검사 (예: 존재하는 그룹인지 확인)
            // groupId 기준으로 랭킹 정보 조회
            const rows = await this.db.rank.findMany({
                where: { participant: { groupId } },
                include: { participant: true }
            });

            // API 명세서에 맞게 응답 형식 변환
            const ranks = rows.map((r) => ({
                participantId: r.participantId,
                nickname: r.participant.nickname,
                recordCount: r.recordCount,
                recordTime: r.recordTime,
            }));

            return res.status(200).json(ranks);
        } catch (error) {
            return next(error);
        }
    };
}