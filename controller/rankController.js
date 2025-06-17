// 쿼리 파라미터에서 페이지네이션 정보 추출
function parsePagination(query) {
  let page = parseInt(query.page, 10) || 1;
  let size = parseInt(query.size, 10) || 20;
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(size) || size < 1) size = 20;
  if (size > 100) size = 100;

  return {
    page,
    size,
    offset: (page - 1) * size
  };
}

export class RankController {
  constructor(prisma) {
    this.db = prisma;
  }

  async getRank(req, res, next) {
    try {
      const groupId = Number(req.params.groupId);
      if (isNaN(groupId) || !Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ message: "groupId must be integer" });
      }

      const { page, size, offset } = parsePagination(req.query);

      // 참여자 전체 조회 (records 포함)
      const participants = await this.db.participant.findMany({
        where: { groupId },
        include: {
          records: true
        }
      });

      // 기록 수 기준으로 정렬 후 페이지네이션 적용
      const ranked = participants
        .map(p => {
          const recordCount = p.records.length;
          const recordTime = p.records.reduce((sum, r) => sum + r.time, 0);
          return {
            participantId: p.id,
            nickname: p.nickname,
            recordCount,
            recordTime
          };
        })
        .sort((a, b) => b.recordCount - a.recordCount) // 기록 많은 순
        .slice(offset, offset + size); // 페이지네이션

      return res.status(200).json(ranked);
    } catch (error) {
      return next(error);
    }
  }
}
