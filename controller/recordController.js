import axios from 'axios';

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
            const participantId = Number(req.body.participantId);
            const nickname = String(req.body.nickname);
            const password = String(req.body.password);
            const exerciseType = String(req.body.exerciseType);
            const description = String(req.body.description ?? '');
            const time = Number(req.body.time);
            const distance = Number(req.body.distance);
            const files = req.files ?? [];

            if (isNaN(groupId) || !Number.isInteger(groupId) || groupId <= 0) {
                return res.status(400).json({ message: '유효하지 않은 groupId입니다.' });
            }

            if (!this._isValidExercise(exerciseType)) {
                return res.status(400).json({ message: '운동 종류는 러닝, 사이클링, 수영만 가능합니다.' });
            }

            const participant = await this._authenticateParticipant(participantId, nickname, password);
            if (!participant || participant.groupId !== groupId) {
                return res.status(401).json({ message: '사용자 인증에 실패했습니다.' });
            }

            const photos = files.map(f => f.filename);

            const newRecord = await this.db.record.create({
                data: {
                    exerciseType,
                    description,
                    time,
                    distance,
                    photos,
                    group: { connect: { id: groupId } },
                    participant: { connect: { id: participantId } }
                }
            });

            const grp = await this.db.group.findUnique({
                where: { id: groupId },
                select: { discordWebhookUrl: true }
            });

            if (grp?.discordWebhookUrl) {
                axios.post(grp.discordWebhookUrl, {
                    content: `새 운동 기록: 닉네임=${nickname}, 운동=${exerciseType}, 시간=${time}초, 거리=${distance}m`
                }).catch(err =>
                    console.error('Discord webhook error:', err.message));
            }

            return res.status(201).json(newRecord);
        } catch (err) {
            console.error('Error creating record:', err)
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

        const data = records.map(r => ({
            id: r.id,
            exerciseType: r.exerciseType,
            description: r.description,
            time: r.time,
            distance: r.distance,
            photos: r.photos,
            author: {
                id: r.participant.id,
                nickname: r.participant.nickname
            }
        }));

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

        return res.json({
            id: rec.id,
            exerciseType: rec.exerciseType,
            description: rec.description,
            time: rec.time,
            distance: rec.distance,
            photos: rec.photos,
            author: {
                id: rec.participant.id,
                nickname: rec.participant.nickname
            }
        });
    } catch (err) {
        return next(err);
    }
}}

