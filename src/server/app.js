import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config.js';
import { createTranscribeRouter } from './routes/transcribe.js';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * Creates and configures the Express application.
 * The engine is injected so the app can be tested with any engine.
 *
 * @param {TranscriptionEngine} engine - Initialized transcription engine.
 * @returns {express.Application}
 */
export function createApp(engine) {
  const app = express();

  // ---- Middleware ----
  app.use(cors());
  app.use(express.json());

  // ---- Upload directory ----
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  // ---- Multer config ----
  const storage = multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: config.maxFileSizeBytes() },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (config.supportedFormats.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file format: ${ext}`));
      }
    },
  });

  // ---- Routes ----

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      engine: engine.name,
      ready: engine.ready,
      uptime: process.uptime(),
    });
  });

  // Transcription endpoint
  app.use('/api/transcribe', upload.single('audio'), createTranscribeRouter(engine));

  // ---- Error handling ----
  app.use(errorHandler);

  return app;
}
