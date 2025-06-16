import { CreateParticipant } from "../dtos/participant.dto.js";
import { assert } from "superstruct";
import { GroupService } from "../services/group.service.js";

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

      //참가자 생성
      const participant = await this.db.participant.create({
        data: {
          nickname,
          password,
          group: {
            connect: {
              id: groupId
            }
          }
        },
      });

      await GroupService.checkAndAwardBadges(parseInt(groupId));

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
      const { groupId } = req.params;
      const { nickname, password } = req.body;

      // 참여자 존재 여부, 비밀번호 일치 등 유효성 검사
      if (!nickname || !password) {
        return res.status(412).json({ message: '데이터 형식이 올바르지 않습니다.' });
      }
      const participant = await this.db.participant.findFirst({
        where: {
          groupId: Number(groupId),
          nickname: nickname
        }
      });
      if (!participant || participant.password !== password) {
        return res.status(404).json({ message: '참여자가 존재하지 않거나 비밀번호가 일치하지 않습니다.' });
      }

      // DB에서 참여자 및 관련 기록 삭제 (트랜잭션)
      await this.db.participant.delete({
        where: { id: participant.id },
      });

      // 성공 결과 응답
      return res.status(200).json({ message: '그룹에서 정상적으로 탈퇴되었습니다.' });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };
}