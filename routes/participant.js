import express from 'express';
import { db } from '../utils/db.js';
const router = express.Router({ mergeParams: true });


// == 참가자(Participant) API 목록 ==

// 1. 그룹 참여 API (POST /)
// 1. groupId, nickname, password 정보 가져오기(o)
// 2. 그룹 존재 여부, 닉네임 중복 등 유효성 검사
// 3. DB에 새로운 참여자 생성
// 4. 성공 결과 응답
// API 주소: POST /groups/:groupId/participants
router.post('/', async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { nickname, password } = req.body;
        const participant = await db.participant.create({
            data: {
                groupId,
                nickname,
                password
            },
        });
        return res.status(201).json(participant)
    } catch (error) {
        console.log(error);
        next(error);
    }
});

export default router;