
import bcrypt from 'bcrypt';
import { CreateParticipant } from "../dtos/participant.dto.js";
import { assert } from "superstruct";
import { GroupService } from "../services/group.service.js";
import { hashPassword, comparePassword } from "../services/encryptService.js";





export class ParticipantController {
  constructor(prisma) {
    this.db = prisma;
    this.groupService = new GroupService(prisma)
  }

  async uploadParticipant(req, res, next) {
    try {
      const groupId = Number(req.params.groupId);
      const { nickname, password } = req.body;
      assert(req.body, CreateParticipant);

      //groupId 유효성 검사
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid groupId' });
      }

      //닉네임 중복 확인
      const nicknameChecker = await this.db.participant.findFirst({
        where: {
          groupId: groupId,
          nickname: nickname
        }
      });

      //닉네임 중복 시 에러처리
      if (nicknameChecker) {
        return res.status(409).json({ message: "Nickname already exists in this group." })
      }

       const hashedPassword = await hashPassword(password); // ✅
// 비밀번호 암호화

      //참가자 생성
      const participant = await this.db.participant.create({
        data: {
          nickname,
          password: hashedPassword,
          group: {
            connect: {
              id: groupId
            }
          }
        },
      });
      await this.groupService.checkAndAwardBadges(parseInt(groupId));

      //  다시 그룹 조회 
      const group = await this.db.group.findUnique({
        where: { id: groupId },
        include: {
          groupTags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                }
              },
            },
          },
          ownerParticipant: {
            select: {
              id: true,
              nickname: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          participants: {
            select: {
              id: true,
              nickname: true,
              createdAt: true,
              updatedAt: true,
            }
          },
        },
      });

      const formatGroup = {
        id: group.id,
        name: group.name,
        description: group.description,
        photoUrl: group.photoUrl,
        goalRep: group.goalRep,
        discordWebhookUrl: group.discordWebhookUrl,
        discordInviteUrl: group.discordInviteUrl,
        likeCount: group.likeCount,
        tags: group.groupTags.map(gt => gt.tag.name),
        owner: group.ownerParticipant ? {
          id: group.ownerParticipant.id,
          nickname: group.ownerParticipant.nickname,
          createdAt: group.ownerParticipant.createdAt.getTime(),
          updatedAt: group.ownerParticipant.updatedAt.getTime(),
        } : null,
        participants: group.participants.map(p => ({
          id: p.id,
          nickname: p.nickname,
          createdAt: p.createdAt.getTime(),
          updatedAt: p.updatedAt.getTime(),
        })),
        createdAt: group.createdAt.getTime(),
        updatedAt: group.updatedAt.getTime(),
        badges: group.badges,
      };

      return res.status(201).json(formatGroup)
    } catch (error) {
      console.error('Error creating participant:', error);
      next(error);
    }
  };

  async deleteParticipant(req, res, next) {
  try {
    console.log("--- 1. 삭제 요청 시작 ---");

    const participantId = Number(req.params.participantId);
    const { password: enteredPassword } = req.body; // 변수명을 헷갈리지 않게 변경

    console.log("요청된 참여자 ID:", participantId);
    console.log("입력된 비밀번호:", enteredPassword);

    console.log("--- 2. DB에서 사용자 조회 ---");
    const participant = await this.db.participant.findUnique({
      where: { id: participantId },
      select: { password: true }
    });

    console.log("DB에서 찾은 참여자 정보:", participant);
    
    // 3단계 유효성 검사
    if (!participant || !participant.password) {
      console.log("오류: 참여자를 찾지 못했거나 DB에 비밀번호가 없습니다.");
      return res.status(404).json({ message: "Participant not found or no password set." });
    }

    console.log("DB에 저장된 해시:", participant.password);
    console.log("--- 3. 비밀번호 비교 시작 ---");
    const isPasswordValid = await comparePassword(enteredPassword, participant.password);

    console.log("비교 결과 (isPasswordValid):", isPasswordValid);
    console.log("--- 4. 비교 완료 ---");

    if (!isPasswordValid) {
      console.log("오류: 비밀번호가 일치하지 않아 401을 반환합니다.");
      return res.status(401).json({ message: "Incorrect password." });
    }

    // 일단 삭제 로직은 잠시 멈추고 성공 응답을 보내서 로그를 확인합니다.
    console.log("🎉 성공! 비밀번호가 일치했습니다.");
    return res.status(200).json({ message: "Password is correct. Deletion test successful." });

  } catch (e) {
    console.error("!!! CATCH 블록에서 에러 발생 !!!");
    console.error(e);
    next(e);
  }
}
}