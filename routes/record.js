// routes/record.js
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import { db } from '../utils/db.js';

const router = express.Router();

// Multer로 업로드 설정 (uploads/ 디렉터리, 타임스탬프-랜덤으로 파일명 생성)
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

// 운동 종류 러닝, 사이클링, 수영만 허용
const isValidExercise = type => ['러닝', '사이클링', '수영'].includes(type);

// 참여자 인증 (ID, 닉네임, 비밀번호 검증)
async function authenticateParticipant(id, nickname, password) {
  const p = await db.participant.findUnique({
    where: { id },
    select: { nickname: true, password: true, groupId: true }
  });
  if (!p || p.nickname !== nickname || p.password !== password) return false;
  return p;
}

// 새로운 운동 기록 등록
router.post(
  '/',
  upload.array('photos', 1),
  async (req, res, next) => {
    try {
      const groupId = Number(req.params.groupId);
      const participantId = Number(req.body.participantId);
      const { nickname, password, exerciseType, description, time, distance } = req.body;
      const files = req.files || [];

      // 운동 종류 검증
      if (!isValidExercise(exerciseType)) {
        return res.status(400).json({ message: '운동 종류는 러닝, 사이클링, 수영만 가능합니다.' });
      }

      // 사용자 인증
      const participant = await authenticateParticipant(participantId, nickname, password);
      if (!participant || participant.groupId !== groupId) {
        return res.status(401).json({ message: '사용자 인증에 실패했습니다.' });
      }

      // 사진 파일명 배열
      const photos = files.map(f => f.filename);

      // DB에 기록 저장
      const newRecord = await db.record.create({ data: {
        exerciseType,
        description,
        time: Number(time),
        distance: Number(distance),
        photos,
        group: { connect: { id: groupId } },
        participant: { connect: { id: participantId } }
      }});

      // Discord 웹훅 알림 (웹훅 URL이 설정된 경우)
      const grp = await db.group.findUnique({
        where: { id: groupId },
        select: { discordWebhookUrl: true }
      });
      if (grp?.discordWebhookUrl) {
        axios.post(grp.discordWebhookUrl, {
          content: `새 운동 기록: 닉네임=${nickname}, 운동=${exerciseType}, 시간=${time}초, 거리=${distance}m`
        }).catch(console.error);
      }

      return res.status(201).json(newRecord);
    } catch (err) {
      return next(err);
    }
  }
);

// 운동 기록 목록 조회 (페이지네이션·검색·정렬 지원)
router.get('/', async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const sortBy = req.query.sortBy === 'time' ? { time: 'desc' } : { createdAt: 'desc' };
    const nickname = req.query.nickname || '';

    const records = await db.record.findMany({
      where: {
        groupId,
        participant: { nickname: { contains: nickname, mode: 'insensitive' } }
      },
      orderBy: sortBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { participant: { select: { id: true, nickname: true } } }
    });

    return res.json(records);
  } catch (err) {
    return next(err);
  }
});

// 단일 운동 기록 상세 조회
router.get('/:recordId', async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const recordId = Number(req.params.recordId);

    const rec = await db.record.findUnique({
      where: { id: recordId },
      include: { participant: { select: { nickname: true } } }
    });
    if (!rec || rec.groupId !== groupId) {
      return res.status(404).json({ message: '해당 기록이 없습니다.' });
    }

    const result = {
      exerciseType: rec.exerciseType,
      description: rec.description,
      photos: rec.photos,
      time: rec.time,
      distance: rec.distance,
      nickname: rec.participant.nickname
    };

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

export default router;
