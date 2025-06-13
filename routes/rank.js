import express from 'express';
import { db } from '../utils/db.js';
import { RankController } from '../controller/rankController.js';

const router = express.Router({ mergeParams: true });
const rankController = new RankController(db);

router.get('/:groupId/rank', rankController.getRank.bind(rankController));

export default router;

