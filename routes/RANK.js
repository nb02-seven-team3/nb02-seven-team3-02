//API 경로처리
app.get ('/hello', (req,res) => {
    res.send('반갑습니다!');
});

app.listen(PORT,() => {
    console.log('서버 실행 중:');
})

const express = require('express');

// 랭크 데이터 예시
const rankData = [
  { consumer_name: '철수', score: 2 },
  { consumer_name: '영희', score: 4 },
  { consumer_name: '민수', score: 1 },
];

// GET /rank
router.get('/rank', (req, res) => {
  res.json(rankData);
});

router.get('/rank',(req,res) => {
    const ranked = calculateRank(rankData);//정렬 함수
    res.json(ranked);
})

module.exports = router;

const express = require('express');
const app = express();
const PORT = 3000;

const rankRouter = require('./routes/RANK');
app.use('/api', rankRouter); // ex: GET /api/rank

app.listen(PORT, () => {
  console.log('저희 랭크 정상 영업해요!');
});

const express = require('express');
const router = express.Router();
const { calculateRank } = require('../utils/rankService');

router.get('/rank', (req, res) => {
  const ranked = calculateRank(rankData);
  res.json(ranked);
});

module.exports = router;
app .use('/api', rankRouter);
const rankRouter = require('./routes/RANK.js');