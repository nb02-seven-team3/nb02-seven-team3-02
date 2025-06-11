// src/controllers/participant.controller.js
//사용자의 요청을 받아서 서비스 계층과 연결 하고 응답을 반환하는 역할(controller)
// 참가자 관련 비즈니스 로직이 들어있는 Service를 불러옴
import { ParticipantService } from '../services/participant.service.js';

export class ParticipantController {
  participantService = new ParticipantService();

  // ✅ 참가자 생성
  // 사용자가 닉네임, 비밀번호, 그룹 ID를 보내면 새로운 참가자를 DB에 저장
  createParticipant = async (req, res, next) => {
    try {
      const { groupId, nickname, password } = req.body;
      const newParticipant = await this.participantService.createParticipant(groupId, nickname, password);

      // 생성된 참가자 정보를 응답
      res.status(201).json({ data: newParticipant });
    } catch (error) {
      next(error);
    }
  };

  // ✅ 모든 참가자 조회
  // DB에 저장된 모든 참가자 목록을 가져옴옴
  getParticipants = async (req, res, next) => {
    try {
      const participants = await this.participantService.findAllParticipants();

      // 참가자 리스트를 응답함함
      res.status(200).json({ data: participants });
    } catch (error) {
      next(error);
    }
  };

  // ✅ 특정 참가자 조회
  // URL로 전달된 참가자 ID를 사용해서 해당 참가자만 조회
  getParticipantById = async (req, res, next) => {
    try {
      const { participantId } = req.params;
      const participant = await this.participantService.findParticipantById(participantId);

      // 찾은 참가자 정보를 응답
      res.status(200).json({ data: participant });
    } catch (error) {
      next(error);
    }
  };
}
// src/repositories/participant.repository.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 참가자 관련 DB 작업을 담당하는 클래스
export class ParticipantRepository {
  // 참가자 생성
  async create(groupId, nickname, password) {
    return await prisma.participant.create({
      data: {
        groupId: +groupId,      // 문자열일 수 있는 groupId를 숫자로 변환
        nickname,
        password,
      },
    });
  }

  // 모든 참가자 조회
  async findAll() {
    return await prisma.participant.findMany();
  }

  // 특정 참가자 조회 (ID 기반)
  async findById(participantId) {
    return await prisma.participant.findUnique({
      where: { participantId: +participantId }, // 문자열 → 숫자 변환 주의
    });
  }
}
// src/routes/participant.route.js
//사용자 요청 URL을 받아 어떤 컨트롤러 함수를 실행할지 지정
// Express 웹 서버와 컨트롤러 불러오기
import express from 'express';
import { ParticipantController } from '../controllers/participant.controller.js';

const router = express.Router();
const participantController = new ParticipantController();

// ✅ GET /api/participants
// 모든 참가자를 조회 (컨트롤러의 getParticipants 호출)
router.get('/', participantController.getParticipants.bind(participantController));

// ✅ POST /api/participants
// 새로운 참가자를 생성 (컨트롤러의 createParticipant 호출)
router.post('/', participantController.createParticipant.bind(participantController));

// ✅ GET /api/participants/:participantId
// 특정 참가자를 조회 (컨트롤러의 getParticipantById 호출)
router.get('/:participantId', participantController.getParticipantById.bind(participantController));

export default router;
