import express from 'express';
import { db } from '../utils/db.js';

const router = express.Router({ mergeParams: true });

router.post('/', async (req, res, next) => {
  try {
    // URL params에서 groupId 꺼내기 (예: /groups/:groupId/participants)
    const groupId = Number(req.params.groupId);
    const { nickname, password } = req.body;

    const participant = await db.participant.create({
      data: {
        groupId,
        nickname,
        password,
      },
    });

    res.status(201).json(participant);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

export default router;

