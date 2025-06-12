//discord 웹훅을 위해 axios 사용
import axios from 'axios';

export class RecordController {
    constructor(prisma) {
        this.db = prisma;
    }

    // 운동 종류 러닝, 사이클링, 수영만 허용
    _isValidExercise(type) {
        return ['러닝', '사이클링', '수영'].includes(type);
    }

    // 참여자 인증 (ID, 닉네임, 비밀번호 검증)
    async _authenticateParticipant(id, nickname, password) {
        const p = await this.db.participant.findUnique({
            where: { id },
            select: { nickname: true, password: true, groupId: true }
        });
        // 닉네임, 비밀번호 일치 확인인
        if (!p || p.nickname !== nickname || p.password !== password) return false;
        return p;
    }

    //새로운 운동 기록 등록 
    async uploadRecord(req, res, next) {
        try {
            const groupId = Number(req.params.groupId);
            const participantId = Number(req.body.participantId);
            const { nickname, password, exerciseType, description, time, distance } = req.body;
            const files = req.files || [];

            // 그룹 아이디 유효성 검사사
            if (isNaN(groupId) || !Number.isInteger(groupId) || groupId <= 0) {
                return res.status(400).json({ message: '유효하지 않은 groupId입니다.' });
            }

            // 운동 종류 검증
            if (!this._isValidExercise(exerciseType)) {
                return res.status(400).json({ message: '운동 종류는 러닝, 사이클링, 수영만 가능합니다.' });
            }

            // 사용자 인증
            const participant = await authenticateParticipant(participantId, nickname, password);
            if (!participant || participant.groupId !== groupId) {
                return res.status(401).json({ message: '사용자 인증에 실패했습니다.' });
            }

            // 사진 파일명 배열 생성
            const photos = files.map(f => f.filename);

            // DB에 기록 저장
            const newRecord = await this.db.record.create({
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
    };

    // 운동 기록 목록 조회 (페이지네이션·검색·정렬 지원)
    async getRecordList(req, res, next) {
        try {
            const groupId = Number(req.params.groupId);
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const sortBy = req.query.sortBy === 'time' ? { time: 'desc' } : { createdAt: 'desc' };
            const nickname = req.query.nickname || '';

            const records = await this.db.record.findMany({
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
    };

    // 단일 운동 기록 상세 조회
    async getRecord(req, res, next) {
        try {
            const groupId = Number(req.params.groupId);
            const recordId = Number(req.params.recordId);

            const rec = await this.db.record.findUnique({
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
    };
}