
const BASE_URL = "http://localhost:3000";
export class ImageController {
    async uploadImage(req, res, next) {
        try {
            const files = req.files;

            if (!files || files.length === 0) {
                return res.status(400).json({ message: "파일이 업로드되지 않았습니다." });
            }

            console.log('파일 정보:', files);
            console.log('body:', req.body);

            if (!req.files) {
                return res.status(404).json({ message: "파일 없음" });
            }
            const urls = files.map(file => `${BASE_URL}/uploads/${file.filename}`);
            res.status(200).json({ urls });
        } catch (error) {
            console.error('이미지 업로드 중 오류 발생:', error);
            next(error);
        }
    }
}