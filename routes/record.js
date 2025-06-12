// routes/record.js
import express from 'express';
import multer from 'multer';
import { db } from '../utils/db.js';
import axios from 'axios';

const router = express.Router();

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    const name = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

/**
 * POST /groups/:groupId/participants/:participantId/records
 * 운동 기록 등록
 */
router.post(
  '/groups/:groupId/participants/:participantId/records',
  upload.array('photos', 1),
  async (req, res, next) => {
    try {
      const { groupId, participantId } = req.params;
      const { nickname, password, exerciseType, description, time, distance } = req.body;
      const files = req.files || [];

      const allowedTypes = ['러닝', '사이클링', '수영'];
      if (!allowedTypes.includes(exerciseType)) {
        return res.status(400).json({ message: `Invalid exerciseType. Allowed: ${allowedTypes.join(', ')}` });
      }

      const participant = await db.participant.findUnique({
        where: { id: Number(participantId) },
        select: { nickname: true, password: true, groupId: true },
      });

      if (
        !participant ||
        participant.groupId !== Number(groupId) ||
        participant.nickname !== nickname ||
        participant.password !== password
      ) {
        return res.status(401).json({ message: 'Invalid user.' });
      }

      const photoFilenames = files.map(f => f.filename);

      const newRecord = await db.record.create({
        data: {
          exerciseType,
          description,
          time: Number(time),
          distance: Number(distance),
          photos: photoFilenames,
          group: { connect: { id: Number(groupId) } },
          participant: { connect: { id: Number(participantId) } },
        },
      });

      const group = await db.group.findUnique({
        where: { id: Number(groupId) },
        select: { discordWebhookUrl: true },
      });

      if (group?.discordWebhookUrl) {
        axios.post(group.discordWebhookUrl, {
          content: `새 운동 기록 등록\n닉네임: ${nickname}\n운동: ${exerciseType}\n시간: ${time}초\n거리: ${distance}m`,
        }).catch(console.error);
      }

      res.status(201).json(newRecord);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /groups/:groupId/records
 * 기록 목록 조회
 */
router.get('/groups/:groupId/records', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 10, sortBy = 'date', nickname = '' } = req.query;

    const where = {
      groupId: Number(groupId),
      participant: { nickname: { contains: nickname, mode: 'insensitive' } },
    };
    const orderBy = sortBy === 'time' ? { time: 'desc' } : { createdAt: 'desc' };

    const records = await db.record.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        participant: { select: { id: true, nickname: true } },
      },
    });

    res.json(records);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /groups/:groupId/participants/:participantId/records/:recordId
 * 단일 기록 조회
 */
router.get('/groups/:groupId/participants/:participantId/records/:recordId', async (req, res, next) => {
  try {
    const { groupId, participantId, recordId } = req.params;
    const record = await db.record.findUnique({
      where: { id: Number(recordId) },
      include: {
        participant: { select: { nickname: true } },
      },
    });

    if (!record || record.groupId !== Number(groupId) || record.participantId !== Number(participantId)) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    const { exerciseType, description, photos, time, distance, participant } = record;
    res.json({ exerciseType, description, photos, time, distance, nickname: participant.nickname });
  } catch (err) {
    next(err);
  }
});

export default router;
