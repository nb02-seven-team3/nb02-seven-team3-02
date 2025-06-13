import express from 'express';
import { db } from '../utils/db.js';
import { RecordController } from '../controller/recordController.js';
import { upload } from '../utils/upload.js';

const router = express.Router({ mergeParams: true });
const recordController = new RecordController(db);

// POST /groups/:groupId/records
router.post('/', upload.array('photos', 1), recordController.uploadRecord.bind(recordController));

// GET /groups/:groupId/records
router.get('/', recordController.getRecordList.bind(recordController));

// GET /groups/:groupId/records/:recordId  ← 여기!
router.get('/:recordId', recordController.getRecord.bind(recordController));

export default router;
