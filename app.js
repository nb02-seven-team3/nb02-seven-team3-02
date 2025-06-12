import express from 'express';
import path from 'path';
import logger from 'morgan';

// route 가져오기
import groupRouter from './routes/group.js';
import recordRouter from './routes/record.js';
import imageRouter from './routes/image.js';
import tagRouter from './routes/tag.js';
import rankRouter from './routes/rank.js';
import participantRouter from './routes/participant.js';

const app = express();
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// route 사용
app.use('/groups', groupRouter);
app.use('/groups/:groupId/participants', participantRouter);
app.use('/groups/:groupId/participants/:participantId/records', recordRouter);
app.use('/image', imageRouter);
app.use('/tags', tagRouter);
app.use('/groups/:groupId/rank', rankRouter);

//global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    return res.status(500).json({ message: 'Server Error' })
})

export default app;
