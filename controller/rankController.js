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

// 기간 계산 유틸
function getDateRange(duration) {
  const now = new Date();
  let start, end;

  if (duration === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else { // default weekly
    const day = now.getDay(); // 0 (일) ~ 6 (토)
    const diff = day === 0 ? 6 : day - 1;
    start = new Date(now);
    start.setDate(now.getDate() - diff);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  }

  // 시간 초기화
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return [start, end];
}

export class RankController {
  constructor(prisma) {
    this.db = prisma;
  }

  async getRank(req, res, next) {
    try {
      const groupId = Number(req.params.groupId);
      const { duration = 'weekly' } = req.query;

      if (isNaN(groupId) || !Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ message: "groupId must be a positive integer" });
      }

      const { page, size, offset } = parsePagination(req.query);
      const [startDate, endDate] = getDateRange(duration);

      // 참여자 + 해당 기간의 기록만 포함
      const participants = await this.db.participant.findMany({
        where: { groupId },
        include: {
          records: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            }
          }
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
      console.error(error);
      return next(error);
    }
  }
}
