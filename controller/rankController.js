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
      if (isNaN(groupId) || !Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ message: "groupId must be integer" });
      }

      // TODO: groupId가 유효한지 검사 (예: 존재하는 그룹인지 확인)
      // groupId 기준으로 랭킹 정보 조회
      const rows = await this.db.rank.findMany({
        where: { participant: { groupId } },
        include: {
          participant: {
            include: {
              records: true
            }
          }
        }
      });

      const result = rows.map(r => {
        const records = r.participant.records;
        const recordCount = records.length;
        const recordTime = records.reduce((sum, record) => sum + record.time, 0);

        return {
          participantId: r.participantId,
          nickname: r.participant.nickname,
          recordCount,
          recordTime
        };
      });
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  };
}