import { assert, record } from "superstruct";
import { CreateGroup, PatchGroup } from "../dtos/group.dto.js";

export class GroupController {

  constructor(prisma) {
    this.db = prisma;
  }

  async getGroupList(req, res, next) {
    try {
      const { name = '', offset = 0, limit = 10, order = 'createdAt' } = req.query;
      let orderBy;
      switch (order) {
        case 'createdAt':
          orderBy = { createdAt: 'desc' }
          break;
        case 'likeCount':
          orderBy = { likeCount: 'desc' }
          break;
        case 'participantCount':
          orderBy = {
            participants: {
              _count: 'desc'
            }
          };
          break;
        default:
          return res.status(400).json({ message: "The orderBy parameter must be one of the following values: [‘likeCount’, ‘participantCount’, ‘createdAt’]." })

      }
      console.log('orderBy:', orderBy);

      const total = await this.db.group.count({
        where: {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        },
      });

      const groupList = await this.db.group.findMany({
        where: {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        },
        include: {
          groupTags: {
            include: { tag: true },
          },
          ownerParticipant: {
            select: {
              id: true,
              nickname: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          participants: {
            select: {
              id: true,
              nickname: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          _count: {
            select: { participants: true },
          },
        },
        orderBy,
        skip: Number(offset),
        take: Number(limit),
      });
      const formatList = groupList.map((list) => ({
        id: list.id,
        name: list.name,
        description: list.description,
        photoUrl: list.photoUrl,
        goalRep: list.goalRep,
        discordWebhookUrl: list.discordWebhookUrl,
        discordInviteUrl: list.discordInviteUrl,
        likeCount: list.likeCount,
        tags: list.groupTags.map((gt) => gt.tag?.name ?? ''), // tag 객체 포함되어야 함
        owner: list.ownerParticipant
          ? {
            id: list.ownerParticipant.id,
            nickname: list.ownerParticipant.nickname,
            createdAt: list.ownerParticipant.createdAt,
            updatedAt: list.ownerParticipant.updatedAt,
          }
          : null,
        participants: list.participants.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        badges: list.badges ?? []

      }));

      res.json({
        data: formatList,
        total,
      })
    } catch (e) {
      console.log(e);
      next(e);
    }
  };
  async getGroup(req, res, next) {
    try {
      const id = Number(req.params.id);
      const groupDetail = await this.db.group.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          photoUrl: true,
          goalRep: true,
          discordWebhookUrl: true,
          discordInviteUrl: true,
          likeCount: true,
          badges: true,
          records: true,
          createdAt: true,
          updatedAt: true,
          groupTags: {
            include: {
              tag: true,
            }
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
        }
      });
      if (!groupDetail) {
        res.status(404).json({ message: "Group not found" })
      }

      // 배지 
      const badges = [];

      if (groupDetail.participants.length >= 10) {
        badges.push("PARTICIPATION_10");
      }
      if (groupDetail.records && groupDetail.records.length >= 100) {
        badges.push("RECORD_100");
      }
      if (groupDetail.likeCount >= 100) {
        badges.push("LIKE_100");
      }


      const formatDetail = {
        id: groupDetail.id,
        name: groupDetail.name,
        description: groupDetail.description,
        photoUrl: groupDetail.photoUrl,
        goalRep: groupDetail.goalRep,
        discordWebhookUrl: groupDetail.discordWebhookUrl,
        discordInviteUrl: groupDetail.discordInviteUrl,
        likeCount: groupDetail.likeCount,
        tags: groupDetail.groupTags.map(gt => gt.tag?.name ?? ''),
        owner: groupDetail.ownerParticipant
          ? {
            id: groupDetail.ownerParticipant.id,
            nickname: groupDetail.ownerParticipant.nickname,
            createdAt: groupDetail.ownerParticipant.createdAt,
            updatedAt: groupDetail.ownerParticipant.updatedAt,
          }
          : null,
        participants: groupDetail.participants.map(p => ({
          id: p.id,
          nickname: p.nickname,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        createdAt: groupDetail.createdAt,
        updatedAt: groupDetail.updatedAt,
        // badges: groupDetail.badges ?? [],
        // enum Badges {
        //   PARTICIPATION_10 
        //   RECORD_100 
        //   LIKE_100
        // }

        badges: badges
      };
      res.json(formatDetail);
    } catch (e) {
      console.log(e);
      next(e);
    }
  };

  async uploadGroup(req, res, next) {
    try {
      assert(req.body, CreateGroup);
      let {
        name,
        description,
        photoUrl,
        goalRep,
        discordWebhookUrl,
        discordInviteUrl,
        tags = [],
        ownerNickname,
        ownerPassword,
      } = req.body;

      if (!Number.isInteger(goalRep)) {
        return res.status(400).json({ message: "goalRep must be an integer" });
      }

      let finalGroupId;
      let ownerParticipantId;

      await this.db.$transaction(async (tx) => {
        // 1. 그룹 생성
        const newGroup = await tx.group.create({
          data: {
            name,
            description,
            photoUrl,
            goalRep,
            discordWebhookUrl,
            discordInviteUrl,
            badges: [],
            likeCount: 0,
            ownerNickname,
            ownerPassword,
          },
        });
        finalGroupId = newGroup.id;

        // 2. 그룹 소유자 참여자 생성
        const newParticipant = await tx.participant.create({
          data: {
            nickname: ownerNickname,
            password: ownerPassword,
            groupId: newGroup.id,
          },
        });
        ownerParticipantId = newParticipant.id;

        // 3. 태그 처리
        if (tags.length > 0) {
          const groupTagsToConnect = [];
          for (const tagName of tags) {
            if (typeof tagName !== 'string' || tagName.trim() === '') {
              throw new Error(`Invalid tag name provided: '${tagName}'.`);
            }

            const tag = await tx.tag.upsert({
              where: { name: tagName.trim() },
              update: {},
              create: { name: tagName.trim() },
            });
            groupTagsToConnect.push({ tagId: tag.id });
          }

          await tx.group.update({
            where: { id: newGroup.id },
            data: {
              groupTags: {
                create: groupTagsToConnect,
              },
            },
          });
        }

        // 4. 그룹에 ownerParticipantId 설정
        await tx.group.update({
          where: { id: newGroup.id },
          data: { ownerParticipantId },
        });
      });

      // 최종 그룹 정보 조회 및 응답 구성
      const group = await this.db.group.findUnique({
        where: { id: finalGroupId },
        include: {
          participants: true,
          groupTags: {
            include: { tag: true }
          },
        },
      });

      const response = {
        id: group.id,
        name: group.name,
        description: group.description,
        photoUrl: group.photoUrl,
        goalRep: group.goalRep,
        discordWebhookUrl: group.discordWebhookUrl,
        discordInviteUrl: group.discordInviteUrl,
        likeCount: group.likeCount,
        tags: group.groupTags.map(gt => gt.tag.name),
        owner: {
          id: ownerParticipantId,
          nickname: group.ownerNickname,
          createdAt: group.createdAt.getTime(),
          updatedAt: group.updatedAt.getTime(),
        },
        participants: group.participants.map(p => ({
          id: p.id,
          nickname: p.nickname,
          createdAt: new Date(p.createdAt).getTime(),
          updatedAt: new Date(p.updatedAt).getTime(),
        })),
        badges: group.badges,
        createdAt: new Date(group.createdAt).getTime(),
        updatedAt: new Date(group.updatedAt).getTime()

      };

      return res.json(response);
    } catch (e) {
      console.error(e);
      return next(e);
    }
  };

  async patchGroup(req, res, next) {
    try {
      assert(req.body, PatchGroup);
      const id = Number(req.params.id);
      let {
        name,
        description,
        photoUrl,
        goalRep,
        discordWebhookUrl,
        discordInviteUrl,
        tags = [],
        ownerNickname,
        ownerPassword: enterPassword,
      } = req.body;


      // 그룹 존재 여부 확인
      const group = await this.db.group.findUnique({
        where: { id },
        select: {
          ownerPassword: true,
          id: true,
        },
      });

      if (!group) {
        return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
      }

      // 비밀번호 검증 
      if (enterPassword !== group.ownerPassword) {
        return res.status(401).json({ message: '비밀번호가 틀렸습니다.' });
      }

      // ─────── Prisma 트랜잭션 시작 ───────
      const changedGroup = await this.db.$transaction(async (tx) => {
        //정보 업데이트를 위한 데이터 객체 생성
        const changeData = {};
        if (name !== undefined) {
          changeData.name = name.trim();
        }
        if (description !== undefined) {
          changeData.description = description;
        }
        if (photoUrl !== undefined) {
          changeData.photoUrl = photoUrl;
        }
        if (goalRep !== undefined) {
          changeData.goalRep = goalRep;
        }
        if (discordWebhookUrl !== undefined) {
          changeData.discordWebhookUrl = discordWebhookUrl;
        }
        if (discordInviteUrl !== undefined) {
          changeData.discordInviteUrl = discordInviteUrl;
        }
        if (ownerNickname !== undefined) {
          changeData.ownerNickname = ownerNickname;
        }

        //그룹 정보 업데이트 
        await tx.group.update({
          where: { id },
          data: changeData,
        });

        /* tag 변경 시 groupTag 관계 업데이트 
         tag 배열이 존재할 때 기존에 연결된 groupTag는 삭제하고 재연결 */
        if (tags !== undefined) {
          await tx.groupTag.deleteMany({
            where: { groupId: id },
          });


          if (tags.length > 0) {
            const groupTagsToConnect = [];
            for (const tagName of tags) {
              // tag가 문자열이 아니거나, 빈 문자열이라면 에러 발생
              if (typeof tagName !== 'string' || tagName.trim() === '') {
                throw new Error(`Invalid tag name provided: '${tagName}'.`);
              }

              // tag를 찾거나, 없으면 생성 
              const tag = await tx.tag.upsert({
                where: { name: tagName.trim() },
                update: {},
                create: { name: tagName.trim() },
              });
              groupTagsToConnect.push({ tagId: tag.id });
            }

            //group에 groupTag 연결 
            await tx.group.update({
              where: { id },
              data: {
                groupTags: {
                  create: groupTagsToConnect,
                },
              },
            });
          }
        }

        //업데이트 된 group 객체 반환 
        return tx.group.findUnique({
          where: { id },
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
      });
      const responseData = {
        id: changedGroup.id,
        name: changedGroup.name,
        description: changedGroup.description,
        photoUrl: changedGroup.photoUrl,
        goalRep: changedGroup.goalRep,
        discordWebhookUrl: changedGroup.discordWebhookUrl,
        discordInviteUrl: changedGroup.discordInviteUrl,
        likeCount: changedGroup.likeCount || 0,
        tags: changedGroup.groupTags.map(gt => gt.tag.name),
        owner: changedGroup.ownerParticipant,
        participants: changedGroup.participants,
        createdAt: changedGroup.createdAt.getTime(),
        updatedAt: changedGroup.updatedAt.getTime(),
        badges: changedGroup.badges || [],
      }
      return res.status(200).json(responseData);
    } catch (e) {
      console.log(e);
      next(e);
    }
  };

  async deleteGroup(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { ownerPassword: enterPassword } = req.body;
      const realPassword = await this.db.group.findUnique({
        where: {
          id: id
        },
        select: {
          ownerPassword: true
        },
      });

      if (!realPassword) {
        return res.status(404).json({ message: "없는 그룹입니다." });
      }


      if (enterPassword === realPassword.ownerPassword) {
        const deleteGroup = await this.db.group.delete({
          where: {
            id: id
          }
        })
        return res.json(deleteGroup);
      } else {
        return res.status(401).json({ message: "Wrong password" });
      }
    } catch (e) {
      console.log(e);
      next(e);
    }
  };
}
