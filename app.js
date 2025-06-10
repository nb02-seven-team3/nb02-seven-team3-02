import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';




// route 가져오기
import groupRouter from './routes/group.js';
import recordRouter from './routes/record.js';
import imageRouter from './routes/image.js';
import tagRouter from './routes/tag.js';
import rankRouter from './routes/rank.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);





const app = express();
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(join(__dirname, 'public')));



// route 사용

app.use('/image' , imageRouter);
app.use('/groups' , groupRouter );
app.use('/' , recordRouter);
app.use('/tags', tagRouter);
app.use('/rank', rankRouter);




app.use((err, req, res, next) => {
console.error(err.stack);
return res.status(500).json({ message: 'Server Error'})
})



export default app;
