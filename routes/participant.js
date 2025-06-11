import express from 'express';
import { db } from '../utils/db.js';
const router = express.Router({ mergeParams: true });

router.post('/', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { nickname, password } = req.body;
    const participant = await db.participant.create({
      data: {
        groupId,
        nickname,
        password
      },
    });
    return res.status(201).json(participant)
  } catch (error) {
    console.log(error);
    next(error);
  }
});