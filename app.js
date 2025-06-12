import 'dotenv/config';
import express from 'express';
import path from 'path';
import logger from 'morgan';

// route 가져오기
import groupRouter from './routes/group.js';
import imageRouter from './routes/image.js';
import tagRouter from './routes/tag.js';

const app = express();
app.use(express.json());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.json('OK');
});

// route 사용
app.use('/groups', groupRouter);
app.use('/images', imageRouter);
app.use('/tags', tagRouter);

//global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    return res.status(500).json({ message: 'Server Error' })
})

export default app;
