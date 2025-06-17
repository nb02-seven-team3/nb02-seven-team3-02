//참여자 생성할 때 암호화 되지 않는 비밀번호를 암호화 해서 반환 한다 
//리턴 한걸 통해 암호화되어있지 않은 참여자 비밀번호와 함호화된 참여자 비밀번호를 비교하여 일치 하는지 불일치 하는지 판단 한다. 

// participant.service.js
import bcrypt from "bcrypt"; 



export class ParticipantService {
    constructor(prisma) {
        this.db = prisma;
    }

    async createParticipant(nickname, password, groupId) {
        const hashedPassword = bcrypt.hashSync(password, 10); // 비밀번호 암호화

        return await this.db.participant.create({
            data: {
                nickname,
                password: hashedPassword,
                group: {
                    connect: { id: groupId }
                }
            }
        });
    }

    async deleteParticipant(nickname, password, groupId) {
        try {
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
            if (!participant) {
                return res.status(404).json({ message: '참여자가 존재하지 않거나 비밀번호가 일치하지 않습니다.' });
            }
            const isPasswordCorrect = bcrypt.compareSync(password, participant.password);

            if (!isPasswordCorrect) {
                return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
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



