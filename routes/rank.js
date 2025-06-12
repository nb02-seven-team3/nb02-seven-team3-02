// routes/rankRouter.js
import express from 'express';
import { db } from '../utils/db.js';

const router = express.Router({ mergeParams: true });

// 랭크 데이터 예시
const rankData = [
  { consumer_name: '철수', score: 2 },
  { consumer_name: '영희', score: 4 },
  { consumer_name: '민수', score: 1 },
];

// 점수 계산 및 랭크 순위 매김 함수
function calculateRank(data) {
  const sorted = data.sort((a, b) => b.score - a.score);

  return sorted.map((item, index) => ({
    rank: index + 1,
    consumer_name: item.consumer_name,
    score: item.score,
  }));
}

// GET /rank - participant id 가져와서 랭크 조회 
router.get('/', async (req, res, next) => {
    const groupId = Number(req.params.groupId);
     const rankData = await db.rank.findMany({
      where: {
        participant: {
          is: {
            groupId: groupId,
          },
        },
      },
      include: {
        participant: true,
      },
    });
    
    res.json(rankData);
});

// GET /rank - 정렬된 랭킹 반환
router.get('/rank', (req, res) => {
  const ranked = calculateRank([...rankData]); // 원본 배열 보호
  res.json(ranked);
});

export default router;
