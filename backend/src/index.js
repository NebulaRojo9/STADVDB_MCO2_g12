import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import titleBasicsRouter from './routes/title_basics.routes.js';
import internalRouter from './routes/internal.routes.js';
import testRouter from './routes/test.routes.js';
import { performRecovery } from './services/internal.service.js';
import { initDB } from './config/connect.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
await initDB();
await performRecovery();

// Enable CORS for the Vite dev server (and optionally other allowed origins)
const allowedOrigins = [
  'http://localhost:5173', // Vite default dev origin
  'http://localhost:3000'
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (like curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: false,
  }),
);

app.use(express.json());
app.use('/title-basics', titleBasicsRouter);
app.use('/internal', internalRouter);
app.use('/test', testRouter);

app.use(express.static(path.join(__dirname, '../dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

const port = process.env.PORT;
if (port == null) {
  console.error('PORT environment variable is not set.');
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Serve at http://localhost:${port}`);
});
