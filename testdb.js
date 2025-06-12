// testDb.js
import 'dotenv/config';               // ← 반드시 최상단에 있어야 합니다.
import { db } from './utils/db.js';

// ▶ 환경 변수 값 확인을 위해 추가
console.log('>>> DATABASE_URL =', process.env.DATABASE_URL);

(async () => {
  try {
    await db.$connect();
    console.log('✅ DB 연결 성공');
  } catch (err) {
    console.error('❌ DB 연결 실패:', err);
  } finally {
    await db.$disconnect();
  }
})();
