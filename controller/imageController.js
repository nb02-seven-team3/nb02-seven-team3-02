// import { bucket } from '../utils/firebase.js';
// import { v4 as uuidv4 } from 'uuid';

// export class ImageController {
//     async uploadImage(req, res, next) {
//         try {
//             const files = req.files;

//             if (!files || files.length === 0) {
//                 return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
//             }

//             const urls = await Promise.all(
//                 files.map(async (file) => {
//                     const fileName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
//                     const firebaseFile = bucket.file(fileName);

//                     await firebaseFile.save(file.buffer, {
//                         metadata: {
//                             contentType: file.mimetype,
//                         },
//                     });

//                     // 공개 URL 생성
//                     await firebaseFile.makePublic();
//                     return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
//                 })
//             );

//             res.status(200).json({ urls });
//         } catch (error) {
//             console.error('이미지 업로드 오류:', error);
//             next(error);
//         }
//     }
// }

import { bucket } from '../utils/firebase.js';
import { v4 as uuidv4 } from 'uuid';

export class ImageController {
    async uploadImage(req, res, next) {
        try {
            const files = req.files;

            if (!files || files.length === 0) {
                return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
            }

            const urls = await Promise.all(
                files.map(async (file) => {
                    const fileName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
                    const firebaseFile = bucket.file(fileName);

                    await firebaseFile.save(file.buffer, {
                        metadata: {
                            contentType: file.mimetype,
                            cacheControl: 'public,max-age=31536000',
                        },
                    });

                    await firebaseFile.makePublic(); // 파일을 공개 설정
                    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                })
            );

            return res.status(200).json({ urls });
        } catch (error) {
            console.error('이미지 업로드 오류:', error);
            next(error);
        }
    }
}