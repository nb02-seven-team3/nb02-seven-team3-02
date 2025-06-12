import express from 'express';
import { db } from '../utils/db.js';
import { RecordController } from '../controller/recordController.js';
import { upload } from '../utils/upload.js';

const router = express.Router({ mergeParams: true });
const recordController = new RecordController(db);

router.post('/', upload.array('photos', 1), recordController.uploadRecord.bind(recordController));
router.get('/', recordController.getRecordList.bind(recordController));
router.get('/:id', recordController.getRecord.bind(recordController));

export default router;
