// import multer from 'multer';

// // 메모리에 파일 저장
// const storage = multer.memoryStorage();

// export const upload = multer({
//     storage: storage,
//     limits: {
//         fileSize: 5 * 1024 * 1024, // (선택) 파일 사이즈 제한: 5MB
//     },
// });

import multer from 'multer';

export const upload = multer({
    storage: multer.memoryStorage(),
});
