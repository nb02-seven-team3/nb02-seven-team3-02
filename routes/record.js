import express from 'express';
import multer from 'multer';
import axios from 'axios';
import { db } from '../utils/db.js';

const router = express.Router();

// 🔧 Multer 설정
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    const ext = file.originalname.split('.').pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 6);
    cb(null, `${timestamp}-${randomStr}.${ext}`);
  }
});
const upload = multer({ storage });

// 운동 종류 검증
const isValidExercise = type => ['러닝', '사이클링', '수영'].includes(type);

// 참여자 인증
async function authenticateParticipant(id, nickname, password) {
  const p = await db.participant.findUnique({
    where: { id },
    select: { nickname: true, password: true, groupId: true }
  });
  if (!p || p.nickname !== nickname || p.password !== password) return null;
  return p;
}

// 📌 운동 기록 등록
router.post(
  '/groups/:groupId/participants/:participantId/records',
  upload.array('photos', 1),
  async (req, res, next) => {
    try {
      const groupId = Number(req.params.groupId);
      const participantId = Number(req.params.participantId);
      const { nickname, password, exerciseType, description, time, distance } = req.body;
      const files = req.files || [];

      if (!isValidExercise(exerciseType)) {
        return res.status(400).json({ message: '운동 종류는 러닝, 사이클링, 수영만 가능합니다.' });
      }

      const participant = await authenticateParticipant(participantId, nickname, password);
      if (!participant || participant.groupId !== groupId) {
        return res.status(401).json({ message: '사용자 인증에 실패했습니다.' });
      }

      const photoFilenames = files.map(f => f.filename);

      const newRecord = await db.record.create({
        data: {
          exerciseType,
          description,
          time: Number(time),
          distance: Number(distance),
          photos: photoFilenames,
          group: { connect: { id: groupId } },
          participant: { connect: { id: participantId } },
        },
      });

      const group = await db.group.findUnique({
        where: { id: groupId },
        select: { discordWebhookUrl: true },
      });

      if (group?.discordWebhookUrl) {
        axios.post(group.discordWebhookUrl, {
          content: `새 운동 기록 등록\n닉네임: ${nickname}\n운동: ${exerciseType}\n시간: ${time}초\n거리: ${distance}m`,
        }).catch(console.error);
      }

      return res.status(201).json(newRecord);
    } catch (err) {
      next(err);
    }
  }
);

// 📌 기록 목록 조회
router.get('/groups/:groupId/records', async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const { page = 1, limit = 10, sortBy = 'date', nickname = '' } = req.query;

    const where = {
      groupId,
      participant: {
        nickname: { contains: nickname, mode: 'insensitive' },
      },
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

    return res.json(records);
  } catch (err) {
    next(err);
  }
});

// 📌 단일 기록 조회
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
    return res.json({ exerciseType, description, photos, time, distance, nickname: participant.nickname });
  } catch (err) {
    next(err);
  }
});

export default router;
