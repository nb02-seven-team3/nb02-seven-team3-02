export class TagController {
    constructor(prisma) {
        this.db = prisma;
    }

    //태그 목록 조회
    async getTagList(req, res, next) {
        let orderBy;
        const { offset = 0, limit = 10, order = 'newest' } = req.query;
        switch (order) {
            case 'older':
                orderBy = { createdAt: 'asc' };
                break;
            case 'newest':
            default:
                orderBy = { createdAt: 'desc' };
        };
        try {
            const tagsList = await this.db.tag.findMany({
                orderBy,
                skip: parseInt(offset),
                take: parseInt(limit),
                select: {
                    id: true,
                    name: true,
                }
            });
            res.status(200).json(tagsList);
        } catch (error) {
            console.error('Error fetching tags:', error);
            next(error);
        }
    };

    //tag 개별 상세 조회 
    async getTag(req, res, next) {
        try {
            const id = Number(req.params.id);

            //id가 number가 아니라면 에러 반환 
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid id parameter' });
            }
            const tag = await this.db.tag.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                }
            });

            //tag 존재 확인
            if (!tag) {
                return res.status(404).json({ message: "Cannot find given tag" });
            }
            res.status(200).json(tag);
        }
        catch (error) {
            console.error('Error fetching tag:', error);
            next(error);
        }
    };
}