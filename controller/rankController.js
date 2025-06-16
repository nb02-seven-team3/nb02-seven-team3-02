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
     
      app.get ('/groups/:groupId', (req, res) => {
      const groupId = req.params.groupId;
      // groupId가 숫자 타입인지, 그리고 정수인지 모두 체크
      if (typeof groupId !== 'number' || Number.isInteger(groupId)) {
  return res.status(400).json({ error: 'groupId는 정수여야 합니다' });
}
})


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

// Express.js 라우터 예시
router.get('/rankings', async (req, res) => {
    try {
        // 1. 쿼리 파라미터에서 page와 size를 받아옵니다.
        //    - 값이 없거나 잘못된 경우 기본값을 사용합니다 (보안 및 안정성).
        const page = parseInt(req.query.page, 10) || 1;
        const size = parseInt(req.query.size, 10) || 20;

        // 2. offset 계산
        const offset = (page - 1) * size;

        // 3. 데이터베이스에서 랭킹 데이터 조회
        //    - 점수가 높은 순서대로 정렬
        //    - 🚨 중요: 점수가 같을 경우를 대비해 보조 정렬 기준(예: username)을 추가해야
        //      페이지가 넘어가도 순서가 틀어지지 않습니다. (Stable Sort)
        const query = `
            SELECT id, username, score, rank
            FROM users
            ORDER BY score DESC, username ASC
            LIMIT ?
            OFFSET ?;
        `;
        const [rankings] = await db.execute(query, [size, offset]);

        // 4. 전체 데이터 개수 조회
        const countQuery = 'SELECT COUNT(id) as total FROM users;';
        const [[{ total }]] = await db.execute(countQuery);
        const totalItems = total;
        const totalPages = Math.ceil(totalItems / size);

        // 5. API 응답 구성
        res.status(200).json({
            data: rankings, // 현재 페이지의 랭킹 데이터
            pagination: {
                currentPage: page,
                pageSize: size,
                totalItems: totalItems,
                totalPages: totalPages
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});