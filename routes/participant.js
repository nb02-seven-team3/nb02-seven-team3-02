import express from 'express';
import { db } from '../utils/db.js';
import { ParticipantController } from '../controller/participantController.js';

const router = express.Router({ mergeParams: true });
const participantController = new ParticipantController(db);

router.post('/', participantController.uploadParticipant.bind(participantController));
router.delete('/:participantId', participantController.deleteParticipant.bind(participantController));
export default router;
