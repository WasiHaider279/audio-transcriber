import { Router } from 'express';
import path from 'path';
import { validateAudioFile, normalizeAudio, cleanupFiles } from '../../utils/audio.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../utils/logger.js';
import config from '../../config.js';

/**
 * Creates the transcription router.
 * The engine is injected at setup time (dependency injection),
 * making this route testable with any engine implementation.
 *
 * @param {TranscriptionEngine} engine - Initialized transcription engine.
 * @returns {Router}
 */
export function createTranscribeRouter(engine) {
  const router = Router();

  /**
   * POST /api/transcribe
   *
   * Accepts a multipart file upload with field name "audio".
   * Validates, normalizes, transcribes, and returns timestamped results.
   */
  router.post('/', async (req, res, next) => {
    let normalizedPath = null;

    try {
      // 1. Check that a file was uploaded
      if (!req.file) {
        throw new ApiError(400, 'No audio file provided. Upload a file with field name "audio".');
      }

      const uploadedPath = req.file.path;
      logger.info('File received', {
        originalName: req.file.originalname,
        size: `${(req.file.size / 1024).toFixed(1)}KB`,
        mimetype: req.file.mimetype,
      });

      // 2. Validate the uploaded file
      const validation = await validateAudioFile(uploadedPath);
      if (!validation.valid) {
        await cleanupFiles(uploadedPath);
        throw new ApiError(400, validation.error);
      }

      // 3. Normalize to 16kHz mono WAV
      const baseName = path.parse(req.file.originalname).name;
      normalizedPath = path.join(config.uploadDir, `${baseName}_${Date.now()}_norm.wav`);
      await normalizeAudio(uploadedPath, normalizedPath);

      // 4. Transcribe
      const result = await engine.transcribe(normalizedPath);

      // 5. Cleanup temp files
      await cleanupFiles(uploadedPath, normalizedPath);
      normalizedPath = null;

      // 6. Return result
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      // Cleanup on error
      if (normalizedPath) await cleanupFiles(normalizedPath);
      next(err);
    }
  });

  return router;
}
