// routes/record.js
import express from 'express';
import { db } from '../utils/db.js';

const router = express.Router();

/**
 * 1) POST /groups/:groupId/participants/:participantId/records
 *    특정 그룹의 특정 참여자가 새 Record를 생성
 */
router.post(
  '/groups/:groupId/participants/:participantId/records',
  async (req, res, next) => {
    try {
      const { groupId, participantId } = req.params;
      const { exerciseType, description, time, distance, photos } = req.body;

      const newRecord = await db.record.create({
        data: {
          exerciseType,
          description,
          time,
          distance,
          photos,
          group:      { connect: { id: Number(groupId) } },
          participant:{ connect: { id: Number(participantId) } },
        },
      });
      return res.status(201).json(newRecord);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 2) GET /groups/:groupId/records
 *    특정 그룹 내 모든 Record 목록 조회 (페이징, 날짜 필터링 포함)
 */
router.get('/groups/:groupId/records', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    // 날짜 필터 조건 설정
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const records = await db.record.findMany({
      where: {
        groupId: Number(groupId),
        ...dateFilter,
      },
      orderBy: { createdAt: 'desc' },
      skip:  (Number(page) - 1) * Number(limit),
      take:  Number(limit),
      include: {
        participant: { select: { id: true, nickname: true } },
      },
    });

    return res.json(records);
  } catch (err) {
    next(err);
  }
});

/**
 * 3) GET /groups/:groupId/participants/:participantId/records
 *    특정 그룹에서 특정 참여자의 개인 Record 조회
 */
router.get(
  '/groups/:groupId/participants/:participantId/records',
  async (req, res, next) => {
    try {
      const { groupId, participantId } = req.params;

      const records = await db.record.findMany({
        where: {
          groupId:       Number(groupId),
          participantId: Number(participantId),
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(records);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/groups/:groupId/participants/:participantId/records/:recordId',
  async (req, res, next) => {
    try {
      const { groupId, participantId, recordId } = req.params;

      // 1) 해당 recordId가 존재하는지 확인
      const record = await db.record.findUnique({
        where: { id: Number(recordId) },
      });
      if (!record) {
        return res.status(404).json({ message: '해당 레코드를 찾을 수 없습니다.' });
      }

      // 2) URL 경로의 groupId/participantId와 DB의 정보가 일치하는지 확인
      if (
        record.groupId !== Number(groupId) ||
        record.participantId !== Number(participantId)
      ) {
        return res.status(400).json({ message: '잘못된 경로로 접근했습니다.' });
      }

      return res.json(record);
    } catch (err) {
      next(err);
    }
  }
);


/**
 * 5) DELETE /groups/:groupId/participants/:participantId/records/:recordId
 *    특정 Record를 삭제
 */
router.delete(
  '/groups/:groupId/participants/:participantId/records/:recordId',
  async (req, res, next) => {
    try {
      const { recordId } = req.params;
      await db.record.delete({
        where: { id: Number(recordId) },
      });
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
