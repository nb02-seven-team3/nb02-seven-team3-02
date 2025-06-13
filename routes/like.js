import express from 'express';
import { db } from '../utils/db.js';
import { LikesController } from '../controller/likesController.js';

const router = express.Router({ mergeParams: true });
const likesController = new LikesController(db);

router.post('/', likesController.uploadLike.bind(likesController));
router.delete('/', likesController.deleteLike.bind(likesController));

export default router;