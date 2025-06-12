import express from 'express';
import { db } from '../utils/db.js';
import { ParticipantController } from '../controller/participantController.js';

const router = express.Router({ mergeParams: true });
const participantController = new ParticipantController(db);


router.post('/', participantController.uploadParticipant.bind(participantController));
router.delete('/', participantController.deleteParticipant.bind(participantController));

router.post('/', async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const { nickname, password } = req.body;

    //groupId 유효성 검사
    if (isNaN(groupId)) {
      return res.status(400).json({ message: 'Invalid groupId' });
    }

    //닉네임 중복 확인
    const nicknameChecker = await db.participant.findFirst({
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
    const participant = await db.participant.create({
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
    return res.status(201).json(participant)
  } catch (error) {
    console.log('Error creating participant:', error);
    next(error);
  }
});

// DELETE /groups/:groupId/participants/:participantId
router.delete('/:participantId', async (req, res, next) => {
    try {
        // 1. URL 경로에서 groupId와 participantId를 변수에 저장합니다.
        const { groupId, participantId } = req.params;

        // 2. DB에서 삭제할 참여자를 찾습니다.
        //    (id와 groupId를 모두 확인해서, 엉뚱한 그룹의 참여자가 삭제되는 것을 방지합니다.)
        const participantToDelete = await db.participant.findFirst({
            where: {
                id: Number(participantId),
                groupId: Number(groupId)
            }
        });

        // 3. 만약 DB에 해당 참여자가 없으면, '찾을 수 없음' 에러를 보냅니다.
        if (!participantToDelete) {
            return res.status(404).json({ message: '해당 그룹에서 참여자를 찾을 수 없습니다.' });
        }

        // 4. 찾은 참여자를 ID를 사용해 삭제합니다.
        await db.participant.delete({
            where: {
                id: Number(participantId),
            },
        });
        
        // 5. 성공했다는 메시지를 보냅니다.
        return res.status(200).json({ message: '참여자가 그룹에서 정상적으로 삭제되었습니다.' });
    } catch (error) {
        console.error(error);
        next(error);
    }
});


export default router;