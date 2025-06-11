// routes/record.js
import express from 'express';//웹 서버 라우팅 및 핸들러 정의
// import multer from 'multer';//
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
router.post('/', upload.array('photos', 1), async (req, res, next) => {
  try {
    const { groupId, participantId } = req.params; // 그룹참가자 ID 추출
    const { nickname, password, exerciseType, description, time, distance } = req.body; //운동기록
    const files = req.files || [];//업로드 된 파일 목록록

    // 운동 종류 러닝, 사이클링,수영 으로 제한
    const allowedTypes = ['러닝', '사이클링', '수영'];
    if (!allowedTypes.includes(exerciseType)) {
      return res
        .status(400)
        .json({ message: `Invalid exerciseType. Allowed: ${allowedTypes.join(', ')}` });
    }

    //  사용자 검증  
    const participant = await db.participant.findUnique({
      where: { id: Number(participantId) },
      select: { nickname: true, password: true, groupId: true },
    });
    if (!participant || participant.groupId !== Number(groupId) || participant.nickname !== nickname) {
      return res.status(401).json({ message: 'Invalid user.' });
    }// 잘못된 ID인 경우
    if (participant.password !== password) {
      return res.status(401).json({ message: 'Wrong password.' });
    }//잘못된 비밀번호인 경우

    //  파일명 배열 생성
    const photoFilenames = files.map(f => f.filename);

    //  Record 생성
    const newRecord = await db.record.create({
      data: {
        exerciseType, //운동 종류
        description, // 설명
        time: Number(time), //시간
        distance: Number(distance),// 거리
        photos: photoFilenames,  // photos 필드: string[]
        group: { connect: { id: Number(groupId) } },//groupId 값을 이용해 해당 그룹 레코드로 설정
        participant: { connect: { id: Number(participantId) } },//participantId 값을 이용해 작성자 정보 연결
      },
    });

    // 4) 디스코드 알림
    const group = await db.group.findUnique({
      where: { id: Number(groupId) },
      select: { discordWebhookUrl: true },// 해당 그룹의 Discord Webhook URL 조회
    });
    if (group?.discordWebhookUrl) {
      axios.post(group.discordWebhookUrl, {
        content: `새 운동 기록 등록\n닉네임: ${nickname}\n운동: ${exerciseType}\n시간: ${time}초\n거리: ${distance}m`,
      }).catch(console.error);
    }//URL이 존재하면 Discord로 알림전송 실패시 에러 출력

    res.status(201).json(newRecord);// 새로 생성된 레코드를 클라이언트에 JSON 형식
  } catch (err) {
    next(err);
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