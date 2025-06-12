export class ImageController {
    async uploadImage(req, res, next) {
        try {
            const file = req.file;

            if (!file) {
                return res.status(400).json({ message: "파일이 업로드되지 않았습니다." });
            }

            console.log('파일 정보:', req.file);
            console.log('body:', req.body);

            if (!req.file) {
                return res.status(404).json({ message: "파일 없음" });
            }
            const filename = req.file.filename;
            const fileUrl = `/uploads/${filename}`;

            res.status(200).json({
                message: '파일 업로드',
                filename: req.file.filename,
                url: fileUrl,
            });
        } catch (error) {
            console.error('이미지 업로드 중 오류 발생:', error);
            next(error);
        }
    }
}