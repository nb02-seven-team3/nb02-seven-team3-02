import express from 'express';
import { db } from '../utils/db.js';
import { error, group } from 'console';
import { create } from 'domain';
const router = express.Router();



// 모든 그룹 /groups 로 요청 


// 그룹 목록 조회 /groups/list  기본은 최신순 정렬, 추천수 정렬 가능, 참여자 수 정렬은 participant Api 작성 후 설정할 예정
// 페이지네이션 기능 10개씩 데이터 출력
// 그룹 name 으로 검색 가능 ex) /groups/list?order=createdAt&name=그룹이름
// _count는 내장함수로 participant 수를 계산해줌, 후에 participant api완성되면 바꿀 예정
router.get('/', async (req, res, next) => {
  try {
    const { name = '', offset = 0, limit = 10, order = 'createdAt' } = req.query;
    let orderBy;
    switch (order) {
      case 'createdAt':
        orderBy = { createdAt: 'desc' }
        break;
      case 'likeCount':
        orderBy = { likeCount: 'desc' }
        break;
      default:
        return res.status(400).json({ message: "The orderBy parameter must be one of the following values: [‘likeCount’, ‘participantCount’, ‘createdAt’]." })

    }
    console.log('orderBy:', orderBy);

    const total = await db.group.count({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
    });

    const groupList = await db.group.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive'
        }
      },

      select: {
        id: true,
        name: true,
        description: true,
        photoUrl: true,
        goalRep: true,
        discordWebhookUrl: true,
        discordInviteUrl: true,
        likeCount: true,
        createdAt: true,
        updatedAt: true,
        badges: true,
        groupTags: {
          include: {
            tag: true,
          },
        },
        ownerParticipant: {
          select: {
            id: true,
            nickname: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        participants: {
          select: {
            id: true,
            nickname: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: { participants: true }
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    });
    const formatList = groupList.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      photoUrl: list.photoUrl,
      goalRep: list.goalRep,
      discordWebhookUrl: list.discordWebhookUrl,
      discordInviteUrl: list.discordInviteUrl,
      likeCount: list.likeCount,
      tags: list.groupTags.map((gt) => gt.tag?.name ?? ''), // tag 객체 포함되어야 함
      owner: list.ownerParticipant
        ? {
          id: list.ownerParticipant.id,
          nickname: list.ownerParticipant.nickname,
          createdAt: list.ownerParticipant.createdAt,
          updatedAt: list.ownerParticipant.updatedAt,
        }
        : null,
      participants: list.participants.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      badges: list.badges ?? []

    }));

    res.json({
      data: formatList,
      total,
    })
  } catch (e) {
    console.log(e);
    next(e);
  }
});



// 그룹 상세조회 /groups/:groupId
// select로 원하는 필드만 나타남
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const groupDetail = await db.group.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        photoUrl: true,
        goalRep: true,
        discordWebhookUrl: true,
        discordInviteUrl: true,
        likeCount: true,
        badges: true,
        createdAt: true,
        updatedAt: true,
        groupTags: {
          include: {
            tag: true,
          }
        },
        ownerParticipant: {
          select: {
            id: true,
            nickname: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        participants: {
          select: {
            id: true,
            nickname: true,
            createdAt: true,
            updatedAt: true,
          }
        },
      }
    });
    if (!groupDetail) {
      res.status(404).json({ message: "Group not found" })
    }
    const formatDetail = {
      id: groupDetail.id,
      name: groupDetail.name,
      description: groupDetail.description,
      photoUrl: groupDetail.photoUrl,
      goalRep: groupDetail.goalRep,
      discordWebhookUrl: groupDetail.discordWebhookUrl,
      discordInviteUrl: groupDetail.discordInviteUrl,
      likeCount: groupDetail.likeCount,
      tags: groupDetail.groupTags.map(gt => gt.tag?.name ?? ''),
      owner: groupDetail.ownerParticipant
        ? {
          id: groupDetail.ownerParticipant.id,
          nickname: groupDetail.ownerParticipant.nickname,
          createdAt: groupDetail.ownerParticipant.createdAt,
          updatedAt: groupDetail.ownerParticipant.updatedAt,
        }
        : null,
      participants: groupDetail.participants.map(p => ({
        id: p.id,
        nickname: p.nickname,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      createdAt: groupDetail.createdAt,
      updatedAt: groupDetail.updatedAt,
      badges: groupDetail.badges ?? [],
    };

    res.json(formatDetail);




  } catch (e) {
    console.log(e);
    next(e);
  }
});

// 그룹 좋아요 개수증가 
// /groups/그룹id/likes 로 post요청
// 기존 그룹 데이터에서 likeCount만 update 조회할 때마다 1씩 증가 

router.post('/:id/likes', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const group = await db.group.findUnique({
      where: { id: id },
      select: {
        likeCount: true
      }
    });
    if (!group) {
      return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
    }
    const groupLike = await db.group.update({
      where: { id: id },
      data: {
        likeCount: { increment: 1 }
      }
    });
    return res.json({ likeCount: groupLike.likeCount });
  } catch (e) {
    console.log(e);
    next(e);
  }
});

// 그룹 좋아요 취소 
// /groups/그룹id/likes/remove 로 delete요청
// 그룹의 likeCount가 어떤지 보기위해 findUnique 후 likeCount >= 0 일 때까지만 줄어들도록 수정 

router.delete('/:id/likes', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const group = await db.group.findUnique({
      where: { id: id },
      select: {
        likeCount: true
      }
    });
    if (!group) {
      return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
    }

    if (group.likeCount >= 0) {

      const removeLike = await db.group.update({
        where: { id: id },
        data: {
          likeCount: { decrement: 1 }
        }
      });
      return res.json({ likeCount: removeLike.likeCount });
    } else {
      return res.status(400).json({ message: 'likeCount는 0보다 작아질 수 없습니다.' });
    }
  } catch (e) {
    console.log(e);
    next(e);
  }
});



// 그룹 생성 API /groups
// 트랜잭션 사용 그룹이 하나도 없을 시 그룹 생성 가정 // 새로운 그룹 생성 > 그룹소유자(참여자) id 생성 > 새로운 그룹 업데이트(ownerParticipantID 추가)
router.post('/', async (req, res, next) => {
  try {
    let {
      name,
      description,
      photoUrl,
      goalRep,
      discordWebhookUrl,
      discordInviteUrl,
      tags = [],
      ownerNickname,
      ownerPassword,
    } = req.body;

    if (!Number.isInteger(goalRep)) {
      return res.status(400).json({ message: "goalRep must be an integer" });
    }

    let finalGroupId;
    let ownerParticipantId;

    await db.$transaction(async (tx) => {
      // 1. 그룹 생성
      const newGroup = await tx.group.create({
        data: {
          name,
          description,
          photoUrl,
          goalRep,
          discordWebhookUrl,
          discordInviteUrl,
          badges: [],
          likeCount: 0,
          ownerNickname,
          ownerPassword,
        },
      });
      finalGroupId = newGroup.id;

      // 2. 그룹 소유자 참여자 생성
      const newParticipant = await tx.participant.create({
        data: {
          nickname: ownerNickname,
          password: ownerPassword,
          groupId: newGroup.id,
        },
      });
      ownerParticipantId = newParticipant.id;

      // 3. 태그 처리
      if (tags.length > 0) {
        const groupTagsToConnect = [];
        for (const tagName of tags) {
          if (typeof tagName !== 'string' || tagName.trim() === '') {
            throw new Error(`Invalid tag name provided: '${tagName}'.`);
          }

          const tag = await tx.tag.upsert({
            where: { name: tagName.trim() },
            update: {},
            create: { name: tagName.trim() },
          });
          groupTagsToConnect.push({ tagId: tag.id });
        }

        await tx.group.update({
          where: { id: newGroup.id },
          data: {
            groupTags: {
              create: groupTagsToConnect,
            },
          },
        });
      }

      // 4. 그룹에 ownerParticipantId 설정
      await tx.group.update({
        where: { id: newGroup.id },
        data: { ownerParticipantId },
      });
    });

    // 최종 그룹 정보 조회 및 응답 구성
    const group = await db.group.findUnique({
      where: { id: finalGroupId },
      include: {
        participants: true,
        groupTags: {
          include: { tag: true }
        },
      },
    });

    const response = {
      id: group.id,
      name: group.name,
      description: group.description,
      photoUrl: group.photoUrl,
      goalRep: group.goalRep,
      discordWebhookUrl: group.discordWebhookUrl,
      discordInviteUrl: group.discordInviteUrl,
      likeCount: group.likeCount,
      tags: group.groupTags.map(gt => gt.tag.name),
      owner: {
        id: ownerParticipantId,
        nickname: group.ownerNickname,
        createdAt: group.createdAt.getTime(),
        updatedAt: group.updatedAt.getTime(),
      },
      participants: group.participants.map(p => ({
        id: p.id,
        nickname: p.nickname,
        createdAt: new Date(p.createdAt).getTime(),
        updatedAt: new Date(p.updatedAt).getTime(),
      })),
      badges: group.badges,
      createdAt: new Date(group.createdAt).getTime(),
      updatedAt: new Date(group.updatedAt).getTime()

    };

    return res.json(response);
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

// 그룹 수정 /groups/change/:groupId
// 프론트엔드 페이지에서 보여진 사항만 수정
// 클라이언트가 입력한 password가 그룹 생성시에 작성된 ownerpassword와 같을 시에만 수정 가능 
router.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    let {
      name,
      description,
      photoUrl,
      goalRep,
      discordWebhookUrl,
      discordInviteUrl,
      tags = [] ,
      ownerNickname,
      ownerPassword: enterPassword,
    } = req.body;


    // 그룹 존재 여부 확인
    const group = await db.group.findUnique({
      where: { id },
      select: {
        ownerPassword: true,
        id: true,
      },
    });

    if (!group) {
      return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
    }

    // 비밀번호 검증 
    if (enterPassword !== group.ownerPassword) {
      return res.status(401).json({ message: '비밀번호가 틀렸습니다.' });
    }

    // ─────── Prisma 트랜잭션 시작 ───────
    const changedGroup = await db.$transaction(async (tx) => {
      //정보 업데이트를 위한 데이터 객체 생성
      const changeData = {};
      if (name !== undefined) {
        changeData.name = name.trim();
      }
      if (description !== undefined) {
        changeData.description = description;
      }
      if (photoUrl !== undefined) {
        changeData.photoUrl = photoUrl;
      }
      if (goalRep !== undefined) {
        changeData.goalRep = goalRep;
      }
      if (discordWebhookUrl !== undefined) {
        changeData.discordWebhookUrl = discordWebhookUrl;
      }
      if (discordInviteUrl !== undefined) {
        changeData.discordInviteUrl = discordInviteUrl;
      }
      if(ownerNickname !== undefined){
        changeData.ownerNickname = ownerNickname;
      }

      //그룹 정보 업데이트 
      await tx.group.update({
        where: { id },
        data: changeData,
      });

      /* tag 변경 시 groupTag 관계 업데이트 
       tag 배열이 존재할 때 기존에 연결된 groupTag는 삭제하고 재연결 */
      if (tags !== undefined) {
        await tx.groupTag.deleteMany({
          where: { groupId: id },
        });


        if (tags.length > 0) {
          const groupTagsToConnect = [];
          for (const tagName of tags) {
            // tag가 문자열이 아니거나, 빈 문자열이라면 에러 발생
            if (typeof tagName !== 'string' || tagName.trim() === '') {
              throw new Error(`Invalid tag name provided: '${tagName}'.`);
            }

            // tag를 찾거나, 없으면 생성 
            const tag = await tx.tag.upsert({
              where: { name: tagName.trim() },
              update: {},
              create: { name: tagName.trim() },
            });
            groupTagsToConnect.push({ tagId: tag.id });
          }

          //group에 groupTag 연결 
          await tx.group.update({
            where: { id },
            data: {
              groupTags: {
                create: groupTagsToConnect,
              },
            },
          });
        }
      }

      //업데이트 된 group 객체 반환 
      return tx.group.findUnique({
        where: { id },
        include: {
          groupTags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                }
              },
            },
          },
          ownerParticipant :{
            select : { 
              id : true,
              nickname : true,
              createdAt : true,
              updatedAt : true,
            }
          },
        participants: {
            select: {
              id: true,
              nickname: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          
        },
      });
    });
    const responseData = {
      id: changedGroup.id,
      name: changedGroup.name,
      description: changedGroup.description,
      photoUrl: changedGroup.photoUrl,
      goalRep: changedGroup.goalRep,
      discordWebhookUrl: changedGroup.discordWebhookUrl,
      discordInviteUrl: changedGroup.discordInviteUrl,
      likeCount: changedGroup.likeCount || 0,
      tags: changedGroup.groupTags.map(gt => gt.tag.name),
      owner: changedGroup.ownerParticipant,
      participants: changedGroup.participants,
      createdAt: changedGroup.createdAt.getTime(),
      updatedAt: changedGroup.updatedAt.getTime(),
      badges: changedGroup.badges || [],
    }



    return res.status(200).json(responseData);
  } catch (e) {
    console.log(e);
    next(e);
  }
});

// 그룹 삭제 API /groups/remove/:groupId
// 그룹 수정과 같은 방식 
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { ownerPassword: enterPassword } = req.body;
    const realPassword = await db.group.findUnique({
      where: {
        id: id
      },
      select: {
        ownerPassword: true
      },
    });

    if (!realPassword) {
      return res.status(404).json({ message: "없는 그룹입니다." });
    }


    if (enterPassword === realPassword.ownerPassword) {
      const deleteGroup = await db.group.delete({
        where: {
          id: id
        }
      })
      return res.json(deleteGroup);
    } else {
      return res.status(401).json({ message: "Wrong password" });
    }
  } catch (e) {
    console.log(e);
    next(e);
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
    // TODO: 그룹 ID 유효성 검사 추가
    // TODO: groupId가 숫자인지 확인 - 아니면 400 "groupId must be integer"
    // Path 파라미터에서 groupId를 추출
    const groupId = Number(req.params.groupId);
    const validateGroupId = function (groupId) {
      if (typeof groupId !== 'number' || !Number.isInteger(groupId) || groupId <= 0) {
        throw new Error('유효하지 않은 groupId입니다.');
      }
    };

    400; "groupId must be integer"
    //그룹 유효성 검사란

    // TODO: groupId가 유효한지 검사 (예: 존재하는 그룹인지 확인)
    // groupId 기준으로 랭킹 정보 조회
    const rows = await db.rank.findMany({
      where: { participant: { groupId } },
      include: { participant: true }
    });

    // API 명세서에 맞게 응답 형식 변환
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
