export class TagController {
  constructor(prisma) {
    this.db = prisma;
  }

  //태그 목록 조회
 
  async getTagList(req, res, next) {
    const { page = 1, limit = 10, order = 'desc', orderBy = 'createdAt', search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 'asc' : 'desc';
    const filter = search
      ? {
        name: {
          contains: search,
          mode: 'insensitive',
        }
      }
      : {};
    try {
      const tagsList = await this.db.tag.findMany({
        where: filter,
        orderBy: { [orderBy]: sortOrder },
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      const total = await this.db.tag.count({ where: filter });

      res.status(200).json({ data: tagsList, total: total, });
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
          createdAt : true,
          updatedAt : true,
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