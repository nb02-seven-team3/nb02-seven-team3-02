import express from 'express';
import { db } from '../utils/db.js';
import { error } from 'console';
const router = express.Router();



// 모든 그룹 /groups 로 요청 


// 그룹 목록 조회 /groups/list  기본은 최신순 정렬, 추천수 정렬 가능, 참여자 수 정렬은 participant Api 작성 후 설정할 예정
// 페이지네이션 기능 10개씩 데이터 출력
// 그룹 name 으로 검색 가능 ex) /groups/list?order=createdAt&name=그룹이름
// _count는 내장함수로 participant 수를 계산해줌, 후에 participant api완성되면 바꿀 예정
router.get('/list', async (req,res,next) =>{
  try{
  const {name = '' , offset = 0 , limit = 10 , order = 'createdAt'} = req.query;
  let orderBy;
  switch (order) {
    case 'createdAt' :
      orderBy =  {createdAt : 'desc'}
      break;
    case 'likeCount' :
      orderBy =  {likeCount : 'desc'}
      break;
    default :
      return res.status(400).json({message : "The orderBy parameter must be one of the following values: [‘likeCount’, ‘participantCount’, ‘createdAt’]."})
   
  }
  console.log('orderBy:', orderBy); 
  
  const groupList = await db.group.findMany({
    where:{
      name : {
        contains :name,
        mode : 'insensitive'
      }
    },

    select:{
      id:true,
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
    orderBy,
    skip : offset,
    take : limit    

  });
  res.json(groupList);
  }catch(e){
    console.log(e);
    next(e);
  }
});



// 그룹 상세조회 /groups/:groupId
// select로 원하는 필드만 나타남
router.get('/:id' , async (req,res,next) =>{
  try{
  const id = Number(req.params.id);
  const groupDetail = await db.group.findUnique({
    where :{
      id : id
    },
    select:{
      id:true,
      name: true,
      description :true,
      participants: {
        select:{
          nickname : true
        },
      },
      likeCount : true,
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
    res.status(404).json({message : "Group not found"})
  }else{
    res.json(groupDetail);
  }}catch(e){
    console.log(e);
    next(e);
  }
});

// 그룹 좋아요 개수증가 
// /groups/그룹id/likes 로 post요청
// 기존 그룹 데이터에서 likeCount만 update 조회할 때마다 1씩 증가 

router.post('/:id/likes' , async (req,res,next) => {
  try{
  const id = Number(req.params.id);
  const group = await db.group.findUnique({
    where: {id : id},
    select : {
      likeCount : true
    }
  });
  if (!group){
    return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
  }
  const groupLike = await db.group.update({
    where : {id : id},
    data : {
      likeCount : { increment : 1}
    }
  });
  return res.json({ likeCount : groupLike.likeCount});
  }catch(e){
    console.log(e);
    next(e);
  }
});

// 그룹 좋아요 취소 
// /groups/그룹id/likes/remove 로 delete요청
// 그룹의 likeCount가 어떤지 보기위해 findUnique 후 likeCount >= 0 일 때까지만 줄어들도록 수정 

router.delete('/:id/likes/remove', async (req,res,next) => {
  try{
  const id = Number(req.params.id);
  const group = await db.group.findUnique({
    where : {id : id },
    select : {
      likeCount : true
    }
  });
  if(!group){
    return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
  }

  if(group.likeCount >= 0 ){
  
  const removeLike = await db.group.update({
    where : { id : id},
    data: {
      likeCount : {decrement : 1}
    }
  });
  return res.json({ likeCount : removeLike.likeCount});
  }else{ 
     return res.status(400).json({ message: 'likeCount는 0보다 작아질 수 없습니다.' });
  }
  }catch(e){
    console.log(e);
    next(e);
  }
});






// 그룹 생성 API /groups
// 트랜잭션 사용 그룹이 하나도 없을 시 그룹 생성 가정함 // 새로운 그룹 생성 > 그룹소유자(참여자) id 생성 > 새로운 그룹 업데이트(ownerParticipantID 추가)
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

    
    // goalRep 정수가 아닐시에 오류처리 
    if(!Number.isInteger(goalRep)){
      return res.status(400).json({message : "goalRep must be an integer" });
    }
    

    // ─────── Prisma 트랜잭션 시작 ───────
    const createdGroup = await db.$transaction(async (tx) => {
      // 1) Group 생성
      //    - ownerParticipantId는 Int? (nullable) 상태이므로 생략 가능
      const newGroup = await tx.group.create({
        data: {
          name,
          description,
          photoUrl,
          goalRep ,
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
// 프론트엔드 페이지에서 보여진 사항만 수정
// 클라이언트가 입력한 password가 그룹 생성시에 작성된 ownerpassword와 같을 시에만 수정 가능 
router.patch('/change/:id', async (req,res,next) =>{
  try{
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

  
  if(!Number.isInteger(goalRep)){
    return res.status(400).json({message : "goalRep must be an integer" });
  }     
  
  // 실제 등록된 비밀번호를 갖고 오기 위해 findUnique

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

  //사용자가 입력한 ownerpassword body로 받음  

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
  }catch(e){
    console.log(e);
    next(e);
  }  
});

// 그룹 삭제 API /groups/remove/:groupId
// 그룹 수정과 같은 방식 
router.delete('/remove/:id', async (req,res,next) =>{
  try{
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
  }catch(e){
    console.log(e);
    next(e);
  }
});




export default router;
