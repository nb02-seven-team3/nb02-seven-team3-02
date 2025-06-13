export class LikesController {
    constructor(prisma) {
        this.db = prisma;
    }

    async uploadLike(req, res, next) {
        try {
            const id = Number(req.params.groupId);

            //ID 유효성 검사 진행
            if (isNaN(groupId) || !Number.isInteger(groupId) || groupId <= 0) {
                return res.status(400).json({ message: '유효하지 않은 그룹 ID입니다.' });
            }

            const group = await this.db.group.findUnique({
                where: { id: groupId },
                select: {
                    likeCount: true
                }
            });
            if (!group) {
                return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
            }
            const groupLike = await this.db.group.update({
                where: { id: groupId },
                data: {
                    likeCount: { increment: 1 }
                }
            });
            return res.json({ likeCount: groupLike.likeCount });
        } catch (e) {
            console.error('Error in uploadLike:', e);
            next(e);
        }
    };

    // 그룹의 likeCount가 어떤지 보기위해 findUnique 후 likeCount >= 0 일 때까지만 줄어들도록 수정 
    async deleteLike(req, res, next) {
        try {
            const id = Number(req.params.groupId);

            // ID 유효성 검사 진행행
            if (isNaN(groupId) || !Number.isInteger(groupId) || groupId <= 0) {
                return res.status(400).json({ message: '유효하지 않은 그룹 ID입니다.' });
            }
            const group = await this.db.group.findUnique({
                where: { id: groupId },
                select: {
                    likeCount: true
                }
            });
            if (!group) {
                return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
            }

            // 좋아요 수가 0보다 클 때만 감소함,.
            if (group.likeCount >= 0) {
                const removeLike = await this.db.group.update({
                    where: { id: groupId },
                    data: {
                        likeCount: { decrement: 1 }
                    }
                });
                return res.json({ likeCount: removeLike.likeCount });
            } else {
                return res.status(400).json({ message: 'likeCount는 0보다 작아질 수 없습니다.' });
            }
        } catch (e) {
            console.error('Error in deleteLike:', e);
            next(e);
        }
    };
}