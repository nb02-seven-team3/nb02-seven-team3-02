
import bcrypt from 'bcrypt';
import { CreateParticipant } from "../dtos/participant.dto.js";
import { assert } from "superstruct";


export class ParticipantController {
  constructor(prisma) {
    this.db = prisma;
   
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

      const hashedPassword = await bcrypt.hash(password, 10);
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
      const { nickname, password: enteredPassword } = req.body;

      const participant = await this.db.participant.findUnique({
        where: { nickname },
        select: { id: true, nickname :true, password: true }
      });

      console.log(participant);
      
      if (!participant) {
        return res.status(404).json({ message: "해당 닉네임의 참가자가 존재하지 않습니다." });
      }

      const isPasswordValid = await bcrypt.compare(enteredPassword, participant.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
      }

      await this.db.participant.delete({
        where: { id: participant.id }
      });

      return res.status(200).json({ message: "참가자가 성공적으로 삭제되었습니다." });

    } catch (e) {
      console.error("!!! 참가자 삭제 에러 !!!", e);
      next(e);
    }
  }
}