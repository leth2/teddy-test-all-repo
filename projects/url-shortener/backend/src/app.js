import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { getDatabase } from './db/database.js';
import urlRoutes from './routes/url-routes.js';
import statsRoutes from './routes/stats-routes.js';

const app = express();

// 미들웨어
app.use(cors());
app.use(express.json());

// DB 초기화 (앱 시작 시)
getDatabase();

// 라우터 연결
app.use('/api', statsRoutes);   // /api/stats
app.use('/', urlRoutes);         // /api/shorten, /:code

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 에러 핸들러
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

// 직접 실행 시 서버 시작
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`URL Shortener running on http://localhost:${PORT}`);
  });
}
