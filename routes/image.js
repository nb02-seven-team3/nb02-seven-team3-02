import express from 'express';
import { upload } from '../utils/upload.js';
import { ImageController } from '../controller/imageController.js';

const router = express.Router();
const imageController = new ImageController();

router.post('/', upload.array('files'), imageController.uploadImage.bind(imageController))

export default router;