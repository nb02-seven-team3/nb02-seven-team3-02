import express from 'express';
import { db } from '../utils/db.js';
const router = express.Router();

import { GroupController } from '../controller/groupController.js';
const groupController = new GroupController(db);

import rankRouter from './rank.js';
import participantRouter from './participant.js';
import recordRouter from './record.js';
import likeRouter from './like.js'

router.get('/', groupController.getGroupList.bind(groupController));
router.get('/:id', groupController.getGroup.bind(groupController));
router.post('/', groupController.uploadGroup.bind(groupController));
router.patch('/:id', groupController.patchGroup.bind(groupController));
router.delete('/', groupController.deleteGroup.bind(groupController));

router.use('/:groupId/rank', rankRouter);
router.use('/:groupId/participants', participantRouter);
router.use('/:groupId/records', recordRouter);
router.use('/:groupId/likes', likeRouter);


// 모든 그룹 /groups 로 요청 


// 그룹 목록 조회 /groups/list
router.get('/list', async (req,res,next) =>{
  const {name = '' , offset = 0 , limit = 10} = req.query;

  const groupList = await db.group.findMany({
    where:{
      name : {
        contains :name,
        mode : 'insensitive'
      }
    },

    select:{
      name :true,
      photoUrl :true,
      groupTags : true,
      goalRep : true,
      likeCount : true,
      _count: {
        select: {participants :true}
      },
      participants : {
      select : {
        nickname :true
      }    
     },
    },  
    orderBy : {createdAt : "desc"},
    skip : offset,
    take : limit    

  });
  res.json(groupList);

});

// 그룹 상세조회 /groups/:groupId
router.get('/:id' , async (req,res,next) =>{
  const id = Number(req.params.id);
  const groupDetail = await db.group.findUnique({
    where :{
      id : id
    },
    select:{
      name: true,
      description :true,
      participants: {
        select:{
          nickname : true
        },
      },
      photoUrl : true,

      _count:{
        select:{
          participants :true
        },   
      },
      discordInviteUrl :true
    }
  });
  if(!groupDetail){
    res.status(404).json({message : "없는 그룹입니다."})
  }else{
    res.json(groupDetail);
  }


});



// 그룹 생성 API /groups
router.post('/', async (req, res, next) => {
  try {
    let {
      name,
      description,
      ownerNickname,
      ownerPassword,
      photoUrl,
      tags = [],
      goalRep,
      discordWebhookUrl,
      discordInviteUrl,
    } = req.body;

    

    // ─────── Prisma 트랜잭션 시작 ───────
    const createdGroup = await db.$transaction(async (tx) => {
      // 1) Group 생성
      //    - ownerParticipantId는 Int? (nullable) 상태이므로 생략 가능
      const newGroup = await tx.group.create({
        data: {
          name,
          description,
          photoUrl,
          goalRep,
          discordWebhookUrl,
          discordInviteUrl,
          badges: [],       // String[] 타입
          likeCount: 0,     // Int 타입
          ownerNickname,    // non-nullable 스칼라 필드
          ownerPassword,    // non-nullable 스칼라 필드
          // ownerParticipantId 생략 (null)
        },
      });

      // 2) Participant 생성 (groupId = newGroup.id)
      const newParticipant = await tx.participant.create({
        data: {
          nickname: ownerNickname,
          password: ownerPassword,
          groupId: newGroup.id,
          // 이 한 줄이 “participant.groupId = newGroup.id” 역할
        },
      });

      // 3) Group 업데이트 (ownerParticipantId = newParticipant.id)
      const updatedGroup = await tx.group.update({
        where: { id: newGroup.id },
        data: {
          ownerParticipantId: newParticipant.id,
        },
      });

      

      // 최종적으로 “ownerParticipantId가 채워진” Group 객체를 반환
      return updatedGroup;
    });
    // ─────── Prisma 트랜잭션 끝 ───────

    return res.json(createdGroup);
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

// 그룹 수정 /groups/change/:groupId
router.patch('/change/:id', async (req,res,next) =>{
  const id = Number(req.params.id);
  const {
    name,
    description,
    photoUrl,
    goalRep,
    discordWebhookUrl,
    discordInviteUrl,
    groupTags,
  } = req.body;
  const realPassword = await db.group.findUnique({
    where : {
      id : id
    },
    select :{
      ownerPassword : true
    },
  });
  if (!realPassword){
    return res.status(404).json({message : "없는 그룹입니다."})
  }

  const enterPassword = req.body.ownerPassword;

  if(enterPassword === realPassword.ownerPassword){
    const changeGroup = await db.group.update({
      where :{
        id : id
      },
      data: {
        name,
        description,
        photoUrl,
        goalRep,
        discordWebhookUrl,
        discordInviteUrl,
        groupTags,
      }
    })
    res.json(changeGroup);
  }else{
    res.status(401).json({ message : "Wrong password"})
  }  
});

// 그룹 삭제 API /groups/remove/:groupId

router.delete('/remove/:id', async (req,res,next) =>{
  const id = Number(req.params.id);
  const {ownerPassword : enterPassword} = req.body;
  const realPassword = await db.group.findUnique({
    where : {
      id : id
    },
    select :{
      ownerPassword : true
    },
  });

  if (!realPassword){
    return res.status(404).json({message : "없는 그룹입니다."});
  }


  if(enterPassword === realPassword.ownerPassword){
    const deleteGroup = await db.group.delete({
      where:{
        id : id
      }
    })
    return res.json(deleteGroup);
  }else{
   return res.status(401).json({message : "Wrong password"});
  }
});



/**
 * 그룹 내 참가자 랭킹 조회 API
 * GET /groups/:groupId/rank
 * 
 * - 특정 그룹(groupId)의 참가자 랭킹 정보를 조회합니다.
 * - 랭킹 정보는 rank 테이블에서 조회하며, 각 참가자의 닉네임, 기록 횟수(recordCount), 기록 시간(recordTime) 등을 반환합니다.
 * - 반환 형식: [{ participantId, nickname, recordCount, recordTime }, ...]
 * - 예시 응답:
 *   [
 *     { participantId: 1, nickname: "홍길동", recordCount: 5, recordTime: 1234 },
 *     ...
 *   ]
 */
router.get('/:groupId/rank', async (req, res, next) => {
  try {
    // 완 그룹 ID 유효성 검사 추가
    // 완 groupId가 숫자인지 확인 - 에러 반환, 클라이언트 전송 코드로 바꿈
    // 위 부분 수정함!
    // Path 파라미터에서 groupId를 추출
    const groupId = Number(req.params.groupId);
    const validateGroupId = function (groupId) {
      if (typeof groupId !== 'number' || !Number.isInteger(groupId) || groupId <= 0) 
      {
    throw new Error('유효하지 않은 groupId입니다.');
  }
};

app.post('/api/group', (req, res) => {
    const { groupId } = req.body;

    // groupId가 정수가 아니면 에러를 반환합니다.
    if (!Number.isInteger(groupId)) {
        // 아래 줄은 400 Bad Request 상태와 에러 메시지를 클라이언트에게 전송합니다.
        // "groupId must be integer"를 return합니다. -> 에러 전송송
        return res.status(300).send('groupId must be an integer');
    }

    // groupId가 정수일 때 실행될 로직을 여기에 추가합니다.
    res.status(200).send({ message: 'Group ID is valid', groupId });
});



    400; "groupId must be integer"
    //그룹 유효성 검사란

    // 완 groupId가 유효한지 검사 (예: 존재하는 그룹인지 확인)
    // groupId 기준으로 랭킹 정보 조회
    const rows = await db.rank.findMany({
      where: { participant: { groupId } },
      include:{ participant: true }
    });

    // API 명세서에 맞게 응답 형식 변환
    //map을 사용하여 각 랭킹 정보를 변환 
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
});

export default router;