//쿼리 파라미터에서 페이지네이션 정보 추출
//맨 앞인 이유: 가독성과 재사용성
function parsePagination(query) {
  let page = parseInt(query.page, 10) || 1;
  let size = parseInt(query.size, 10) || 20;
  // 기본값 및 최소값 보정
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(size) || size < 1) size = 20;
  // 최대값 제한(예: 100)
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
      // TODO: 그룹 ID 유효성 검사 추가 완
      // TODO: groupId가 숫자인지 확인 - 아니면 400 "groupId must be integer"
      // Path 파라미터에서 groupId를 추출
      const groupId = Number(req.params.groupId);
      if (isNaN(groupId) || !Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ message: "groupId must be integer" });
      }
      //페이지네이션 정보 추출
      const { page, size, offset } = parsePagination(req.query);

      // TODO: groupId가 유효한지 검사 (예: 존재하는 그룹인지 확인)
      // groupId 기준으로 랭킹 정보 조회
      const rows = await this.db.record.findMany({
        where: { participant: { groupId } },
        include: {
          participant: {
            include: {
              records: true,
                
            }
          }
        },
            skip: offset,
            take: size
      });

      //랭킹 정보 가공, 건들지기 노노
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
  }
}
