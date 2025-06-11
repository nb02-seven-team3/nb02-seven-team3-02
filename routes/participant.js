import express from 'express';
import { db } from '../utils/db.js';
const router = express.Router({ mergeParams: true });

router.post('/', async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const { nickname, password } = req.body;

    //groupId 유효성 검사
    if (isNaN(groupId)) {
      return res.status(400).json({ message: 'Invalid groupId' });
    }

    //닉네임 중복 확인
    const nicknameChecker = await db.participant.findFirst({
      where: {
        groupId: groupId,
        nickname: nickname
      }
    });

    //닉네임 중복 시 에러처리
    if (nicknameChecker) {
      return res.status(409).json({ message: "Nickname already exists in this group." })
    }

    //참가자 생성
    const participant = await db.participant.create({
      data: {
        nickname,
        password,
        group: {
          connect: {
            id: groupId
          }
        }
      },
    });
    return res.status(201).json(participant)
  } catch (error) {
    console.log('Error creating participant:', error);
    next(error);
  }
});

export default router;