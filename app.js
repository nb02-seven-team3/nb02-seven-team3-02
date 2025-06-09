import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import recordRouter from './routes/record.js';

// route 가져오기
import groupRouter from './routes/group.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use('/', recordRouter);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(join(__dirname, 'public')));

console.log('▶▶▶ app.js: groupRouter 연결 직전');

// route 사용
app.use('/groups' , groupRouter );


console.log('▶▶▶ app.js: groupRouter 연결 완료');
export default app;
