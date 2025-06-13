import axios from 'axios';
import { toCreateRecordDTO, toRecordResponseDTO } from '../dtos/record.dto.js';

export class RecordController {
    constructor(prisma) {
        this.db = prisma;
    }

    _isValidExercise(type) {
        return ['러닝', '사이클링', '수영'].includes(type);
    }

    async _authenticateParticipant(id, nickname, password) {
        const p = await this.db.participant.findUnique({
            where: { id: Number(id) },
            select: { nickname: true, password: true, groupId: true }
        });
        if (!p || p.nickname !== nickname || p.password !== password) return false;
        return p;
    }

    async uploadRecord(req, res, next) {
        try {
            const groupId = Number(req.params.groupId);

            //  DTO 함수로 변환
            const dto = toCreateRecordDTO(req.body, req.files);

            if (isNaN(groupId) || !Number.isInteger(groupId) || groupId <= 0) {
                return res.status(400).json({ message: '유효하지 않은 groupId입니다.' });
            }

            if (!this._isValidExercise(dto.exerciseType)) {
                return res.status(400).json({ message: '운동 종류는 러닝, 사이클링, 수영만 가능합니다.' });
            }

            const participant = await this._authenticateParticipant(dto.participantId, dto.nickname, dto.password);
            if (!participant || participant.groupId !== groupId) {
                return res.status(401).json({ message: '사용자 인증에 실패했습니다.' });
            }

            const newRecord = await this.db.record.create({
                data: {
                    exerciseType: dto.exerciseType,
                    description: dto.description,
                    time: dto.time,
                    distance: dto.distance,
                    photos: dto.photos,
                    group: { connect: { id: groupId } },
                    participant: { connect: { id: dto.participantId } }
                }
            });

            const grp = await this.db.group.findUnique({
                where: { id: groupId },
                select: { discordWebhookUrl: true }
            });

            if (grp?.discordWebhookUrl) {
                axios.post(grp.discordWebhookUrl, {
                    content: `새 운동 기록: 닉네임=${dto.nickname}, 운동=${dto.exerciseType}, 시간=${dto.time}초, 거리=${dto.distance}m`
                }).catch(err =>
                    console.error('Discord webhook error:', err.message));
            }

            //  DTO 변환해서 응답
            return res.status(201).json(toRecordResponseDTO({
                ...newRecord,
                participant: { id: participant.id, nickname: participant.nickname }
            }));
        } catch (err) {
            return next(err);
        }
    }

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

            // DTO 리스트 변환
            const data = records.map(toRecordResponseDTO);
            return res.json({ data, total });
        } catch (err) {
            return next(err);
        }
    }

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

            // DTO 변환 후 응답
            return res.json(toRecordResponseDTO(rec));
        } catch (err) {
            return next(err);
        }
    }
}