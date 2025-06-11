//유저정보
//이름
//아이디<-고유값

//user 

//점수
//그룹에서 작성하던거 수정해야할거같슨
//날짜나 뭐 시간같은 기록용 작성

//테이블명 랭크인 디비설계
//id, name, score, groupId, createdAt, updatedAt의 순서대로 작성

//위에 쓴 점수를 기준으로 정렬 작성
//하던대로 내림차순 작성하면 됨 근데 수정 필요

//API와 함수 설계
//전체 유저 랭킹 조회 (GET /rank)
//그룹별 랭킹 조회 (GET /rank/:groupId)
//유저 점수 추가/갱신 (POST /rank)
//순위 계산을 위한 유틸 함수 (getRankByGroupId()
//가 기본적

//에러처리!는 마지막에함슨
//

//수정해야할 rank 데이터 나열
//group.js에 들어가야함 이유: 그룹을 기준으로 랭크를 나누는거니까!
const conut = prisma.rank.findmany ({
     where: {participant:{groupId}}
})




router.get('/:groupId/rank' , parameter (req, res, next) => {
  const groupId = Number(req.params.groupId);
  res.json({ groupId });
});

import { getRankByGroupId } from '/utils/rankService.js';

//그룹 내 순위 불러오기 
router.get('/:groupId/rank', async (req, res, next) => {
  try {
    const groupId = Number (req.params.groupId);
    const rankData = await getRankByGroupId(groupId);

    //에러잡기 
    res.status(200).json(rankData);
  } catch (error) {
    next(error);
  }
});

//참고용 랭크 Response Body
//[{
  //"participantId": 0,
  //"nickname": "string",
  //"recordCount": 0,
  //"recordTime": 0
//}]