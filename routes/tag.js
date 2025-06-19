import express from 'express';
import { db } from '../utils/db.js';
const router = express.Router();

import { TagController } from '../controller/tagController.js';

const tagController = new TagController(db);

router.get('/', tagController.getTagList.bind(tagController));
router.get('/:id', tagController.getTag.bind(tagController));

export default router;