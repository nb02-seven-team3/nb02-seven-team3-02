import express from 'express';
import { db } from '../utils/db.js';

const router = express.Router();

import { GroupController } from '../controller/groupController.js';
const groupController = new GroupController(db);

router.get('/', groupController.getGroupList.bind(groupController));
router.get('/:id', groupController.getGroup.bind(groupController));
router.post('/', groupController.uploadGroup.bind(groupController));
router.patch('/:id', groupController.patchGroup.bind(groupController));
router.delete('/', groupController.deleteGroup.bind(groupController));

router.use('/:groupId/rank', rankRouter);
router.use('/:groupId/participants', participantRouter);
router.use('/:groupId/records', recordRouter);
router.use('/:groupId/likes', likeRouter);


export default router;