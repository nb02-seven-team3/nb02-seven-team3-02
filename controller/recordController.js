import axios from 'axios';
import { assert } from "superstruct";
import { CreateRecord, mapExerciseType, mapDescription } from "../dtos/record.dto.js";
import { EncryptService } from "../services/encryptService.js";

const encrypt = new EncryptService();

export class RecordController {
  constructor(prisma) {
    this.db = prisma;
  }

  _isValidExercise(type) {
    return ['러닝', '사이클링', '수영', 'run', 'bike', 'swim'].includes(type);
  }

  async _authenticateParticipant(authorNickname, authorPassword) {
    const p = await this.db.participant.findUnique({
      where: { nickname: authorNickname },
      select: { id: true, nickname: true, password: true, groupId: true }
    });
    if (!p || !encrypt.passwordCheck(authorPassword, p.password)) return false;
    return p;
  }



  // 기록 목록 조회
  async getRecordList(req, res, next) {
    try {
      const groupId = Number(req.params.groupId);
      if (isNaN(groupId) || !Number.isInteger(groupId)) {
        return res.status(400).json({ message: "groupId must be integer" });
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const order = (req.query.order === 'asc' || req.query.order === 'desc') ? req.query.order : 'desc';
      const orderBy = (req.query.orderBy === 'time' || req.query.orderBy === 'createdAt') ? req.query.orderBy : 'time';
      const search = req.query.search ? String(req.query.search) : '';

      const sortOption = {};
      sortOption[orderBy] = order;

      const where = {
        groupId,
        ...(search && {
          participant: { nickname: { contains: search, mode: 'insensitive' } }
        })
      };

      const total = await this.db.record.count({ where });

      const records = await this.db.record.findMany({
        where,
        orderBy: sortOption,
        skip: (page - 1) * limit,
        take: limit,
        include: { participant: { select: { id: true, nickname: true } } }
      });

      // 명세서에 맞는 응답 구조로 바로 가공
      const data = records.map(r => ({
        id: r.id,
        exerciseType: mapExerciseType(r.exerciseType),
        description: mapDescription(r.description),
        time: r.time,
        distance: r.distance,
        photos: r.photos,
        author: {
          id: r.participant.id,
          nickname: r.participant.nickname
        }
      }));

      return res.json({
        data,
        total,
      });
    } catch (e) {
      next(e);
    }
  }

  // 기록 상세 조회
  async getRecord(req, res, next) {
    try {
      const groupId = Number(req.params.groupId);
      const recordId = Number(req.params.recordId);

      if (isNaN(groupId) || !Number.isInteger(groupId)) {
        return res.status(400).json({ message: "groupId must be integer" });
      }
      if (isNaN(recordId) || !Number.isInteger(recordId)) {
        return res.status(400).json({ message: "recordId must be integer" });
      }

      const rec = await this.db.record.findUnique({
        where: { id: recordId },
        include: { participant: { select: { id: true, nickname: true } } }
      });

      if (!rec || rec.groupId !== groupId) {
        return res.status(404).json({ message: '해당 기록이 없습니다.' });
      }

      // 명세서에 맞는 구조로 가공
      return res.json({
        id: rec.id,
        exerciseType: mapExerciseType(rec.exerciseType),
        description: mapDescription(rec.description),
        time: rec.time,
        distance: rec.distance,
        photos: rec.photos,
        author: {
          id: rec.participant.id,
          nickname: rec.participant.nickname,
        }
      });
    } catch (e) {
      next(e);
    }
  }

  // 기록 등록
  async uploadRecord(req, res, next) {
    try {
      // const photos = req.files?.map(file => `/uploads/${file.filename}`) || req.body.photos || [];
      // superstruct로 body 검증 (유효하지 않으면 400 에러 throw)
      assert(req.body, CreateRecord);

      const groupId = Number(req.params.groupId);
      const {
        authorNickname,
        authorPassword,
        exerciseType,
        description = '',
        time,
        distance,
        photos = [],
      } = req.body;

      if (!photos || photos.length === 0) {
        return res.status(400).json({ message: '레코드 이미지가 업로드되지 않았습니다.' });
      }

      const parsedPhotos = Array.isArray(photos) ? photos : [photos];

      //유효성 검사
      if (isNaN(groupId) || !Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ message: '유효하지 않은 groupId입니다.' });
      }
      if (!this._isValidExercise(exerciseType)) {
        return res.status(400).json({ message: '운동 종류는 러닝, 사이클링, 수영만 가능합니다.' });
      }

      //참가자 인증
      const participant = await this._authenticateParticipant(authorNickname, authorPassword);
      if (!participant || participant.groupId !== groupId) {

        // console.log("닉네임 인증 시도:", authorNickname);
        // console.log("DB에서 찾은 참가자:", p);
        // console.log("입력 비밀번호:", authorPassword);
        // console.log("저장된 해시:", p?.password);

        return res.status(401).json({ message: '사용자 인증에 실패했습니다.' });
      }

      const newRecord = await this.db.record.create({
        data: {
          exerciseType,
          description,
          time: Number(time),
          distance: Number(distance),
          photos: parsedPhotos,
          group: { connect: { id: groupId } },
          participant: { connect: { id: (participant.id) } }
        }
      });

      // Discord Webhook 전송
      const grp = await this.db.group.findUnique({
        where: { id: groupId },
        select: { discordWebhookUrl: true }
      });

      if (grp?.discordWebhookUrl) {
        axios.post(grp.discordWebhookUrl, {
          content: `새 운동 기록: 닉네임=${participant.nickname}, 운동=${exerciseType}, 시간=${time}초, 거리=${distance}m`
        }).catch(err =>
          console.error('Discord webhook error:', err.message));
      }

      // 등록 결과도 명세서에 맞는 구조로 바로 가공
      return res.status(201).json({
        id: newRecord.id,
        exerciseType: mapExerciseType(newRecord.exerciseType),
        description: mapDescription(newRecord.description),
        time: newRecord.time,
        distance: newRecord.distance,
        photos: newRecord.photos,
        author: {
          id: participant.id,
          nickname: participant.nickname
        }
      })
    } catch (e) {
      next(e);
    }
  }
}