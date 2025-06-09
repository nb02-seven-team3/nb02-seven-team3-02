import express from 'express';
import { db } from '../utils/db.js';
const router = express.Router();


// tag 개별 상세 조회 
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const tag = await db.tag.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
            }
        })
        if (!tag) {
            return res.status(404).json({ message: "Cannot find given tag" })
        }
        res.status(200).json(tag);
    }
    catch (error) {
        console.error('Error fetching tag:', error);
        next(error);
    }
})

// tag 목록 조회
router.get('/list', async (req, res, next) => {
    let orderBy;
    const { offset = 0, limit = 10, order = 'newest' } = req.query;
    switch (order) {
        case 'older':
            orderBy = { createdAt: 'asc' };
            break;
        case 'newest':
        default:
            orderBy = { createdAt: 'desc' };
    };

    try {
        const tagsList = await db.tag.findMany({
            where, // 확장성을 위해 where 조건 유지 
            orderBy,
            skip: parseInt(offset),
            take: parseInt(limit),
            select: {
                id: true,
                name: true,
            }
        });
        res.status(200).json(tagsList);
    } catch (error) {
        console.error('Error fetching tags:', error);
        next(error);
    }
});

// tag 생성 
router.post('/', async (req, res, next) => {
    try {
        const { name } = req.body;

        // name이 없거나 빈 문자열인 경우 처리
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ message: "Tag name connot be empty" });
        }

        // tag가 데이터베이스에 존재하는지 확인
        const existingTag = await db.tag.findUnique({
            where: { name: name.trim() },
        });

        if (existingTag) {
            console.log(`Tag ${name.trim()} already exists`);
            return res.status(409).json({ message: "Tag already exists" });
        }

        // tag가 존재하지 않으면 새로 생성
        const newTag = await db.tag.create({
            data: { name: name.trim() },
        })
        console.log(`Tag ${newTag.name} created successfully`);
        res.status(201).json(newTag);
    } catch (error) {
        console.error('Error creating tag:', error);
        next(error);
    }
});

// // tag 삭제 
// router.delete('/:id', async (req, res, next) => {
//     try {
//         const id = Number(req.params.id);
//         const tag = await db.tag.findUnique({
//             where: { id },
//         })
//         if (!tag) {
//             return res.status(404).json({ message: "Cannot find given tag" });
//         }
//         await db.tag.delete({
//             where: { id },
//         });
//         console.log(`Tag with id ${id} deleted successfully`);
//         res.status(204).send();
//     } catch (error) {
//         console.error('Error deleting tag:', error);
//         next(error);
//     }
// });

