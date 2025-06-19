import path from 'path';
import fs from 'fs';
import multer from 'multer';

const uploadDir = path.join(process.cwd(), 'uploads');


if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
};

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },

    //(uploads/ 디렉터리, 타임스탬프-랜덤으로 파일명 생성)
    filename(req, file, cb) {
        const ext = file.originalname.split('.').pop();
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 6)
        cb(null, `${timestamp}-${randomStr}.${ext}`);
    }
});

export const upload = multer({ storage: storage });
