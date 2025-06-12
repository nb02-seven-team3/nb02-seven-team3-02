// routes/record.js
import express from 'express';//웹 서버 라우팅 및 핸들러 정의
import multer from 'multer';//
import { db } from '../utils/db.js';// 데이터베이스(DB) 연결
import axios from 'axios';// Discord 알림

const router = express.Router();

// // Multer 설정: uploads/ 폴더에 저장, 파일명은 원본 + 타임스탬프
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, 'uploads/'),//upload 폴더에 저장
//   filename: (req, file, cb) => {
//     const ext = file.originalname.split('.').pop();
//     const name = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${ext}`;
//     cb(null, name);//파일 이름 어떻게 지을지
//   },
// });
// const upload = multer({ storage });

/**
 * POST /groups/:groupId/participants/:participantId/records
 * 운동 기록 등록 
 */
router.post('/', async (req, res, next) => {
    try {
      const groupId = Number(req.params.groupId);
      const participantId = Number(req.params.participantId);
      
      const {    
        exerciseType,
        description,
        time,
        distance
      } = req.body;
      const files = req.files || [];

      // // 운동 종류 검증
      // if (!isValidExercise(exerciseType)) {
      //   return res.status(400).json({
      //     message: '운동 종류는 러닝, 사이클링, 수영만 가능합니다.'
      //   });
      // }

      // 사용자 인증
      // const participant = await authenticateParticipant(
      //   participantId,
      //   nickname,
      //   password
      // );
      // if (!participant || participant.groupId !== groupId) {
      //   return res.status(401).json({
      //     message: '사용자 인증에 실패했습니다.'
      //   });
      // }

      // 사진 파일명 배열
      const photos = files.map((f) => f.filename);

      // DB에 기록 저장
      const newRecord = await db.record.create({
        data: {
          exerciseType,
          description,
          time: Number(time),
          distance: Number(distance),
          photos,
          group: { connect: { id: groupId } },
          participant: { connect: { id: participantId } }
        }
      });

      // Discord 웹훅 알림 (웹훅 URL이 설정된 경우)
      const grp = await db.group.findUnique({
        where: { id: groupId },
        select: { discordWebhookUrl: true }
      });

      if (grp?.discordWebhookUrl) {
        axios
          .post(grp.discordWebhookUrl, {
            content: `새 운동 기록: 닉네임=${nickname}, 운동=${exerciseType}, 시간=${time}초, 거리=${distance}m`
          })
          .catch(console.error);
      }

      return res.status(201).json(newRecord);
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * GET /groups/:groupId/records
 * 기록 목록 조회 (페이징, 검색, 정렬)
 */
router.get('/', async (req, res, next) => {
  try {
    const { groupId } = req.params;//그룹아이디 추출
    const { page = 1, limit = 10, sortBy = 'date', nickname = '' } = req.query;// 쿼리 파라미터 추출

    const where = {
      groupId: Number(groupId),
      participant: { nickname: { contains: nickname, mode: 'insensitive' } },
    };// 닉네임 검색
    const orderBy = sortBy === 'time' ? { time: 'desc' } : { createdAt: 'desc' };// 정렬 기준

    const records = await db.record.findMany({
      where,// 검색 조건
      orderBy,// 정렬 조건
      skip: (Number(page) - 1) * Number(limit),// 페이지네이션: 건너뛸 개수
      take: Number(limit),// 페이지네이션: 가져올 개수
      include: {
        participant: { select: { id: true, nickname: true } },
      },
    });
    res.json(records);
  } catch (err) {
    next(err);// 에러 처리
  }
});

/**
 * GET /groups/:groupId/participants/:participantId/records/:recordId
 * 단일 기록 상세 조회
 */
router.get('/:recordId', async (req, res, next) => {
  try {
    const { groupId, participantId, recordId } = req.params;// 파라미터 추출
    const record = await db.record.findUnique({
      where: { id: Number(recordId) },// 기록 ID로 조회
      include: {
        participant: { select: { nickname: true } },
      },// 참여자 닉네임 포함
    });
    if (!record || record.groupId !== Number(groupId) || record.participantId !== Number(participantId)) {
      return res.status(404).json({ message: 'Record not found.' });
    }
    const { exerciseType, description, photos, time, distance, participant } = record;
    res.json({ exerciseType, description, photos, time, distance, nickname: participant.nickname });
  } catch (err) {
    next(err);// 에러 처리
  }
}
);

export default router;