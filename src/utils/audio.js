import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import config from '../config.js';
import logger from './logger.js';

// Point fluent-ffmpeg to the bundled ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Supported audio MIME types mapped from file extensions.
 */
const MIME_MAP = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
};

/**
 * Validates that a file exists, has a supported extension, and is within size limits.
 * @param {string} filePath - Absolute path to the audio file.
 * @returns {{ valid: boolean, error?: string }}
 */
export async function validateAudioFile(filePath) {
  // Check existence
  if (!existsSync(filePath)) {
    return { valid: false, error: `File not found: ${filePath}` };
  }

  // Check extension
  const ext = path.extname(filePath).toLowerCase();
  if (!config.supportedFormats.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported format "${ext}". Supported: ${config.supportedFormats.join(', ')}`,
    };
  }

  // Check file size
  const stats = await fs.stat(filePath);
  if (stats.size > config.maxFileSizeBytes()) {
    return {
      valid: false,
      error: `File too large (${(stats.size / 1024 / 1024).toFixed(1)}MB). Max: ${config.maxFileSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Normalizes an audio file to 16kHz mono WAV — the format Whisper expects.
 * @param {string} inputPath - Path to the source audio file.
 * @param {string} outputPath - Path to write the normalized WAV.
 * @returns {Promise<string>} - Resolves with outputPath on success.
 */
export function normalizeAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    logger.info('Normalizing audio', { input: path.basename(inputPath), output: path.basename(outputPath) });

    ffmpeg(inputPath)
      .audioFrequency(config.normalizedSampleRate)
      .audioChannels(1)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => {
        logger.info('Audio normalization complete');
        resolve(outputPath);
      })
      .on('error', (err) => {
        logger.error('Audio normalization failed', { error: err.message });
        reject(new Error(`FFmpeg normalization failed: ${err.message}`));
      })
      .save(outputPath);
  });
}

/**
 * Gets the duration of an audio file in seconds.
 * @param {string} filePath - Path to the audio file.
 * @returns {Promise<number>} - Duration in seconds.
 */
export function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Could not read audio duration: ${err.message}`));
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Cleans up temporary files, silently ignoring errors.
 * @param  {...string} filePaths - Files to remove.
 */
export async function cleanupFiles(...filePaths) {
  for (const fp of filePaths) {
    try {
      if (existsSync(fp)) await fs.unlink(fp);
    } catch {
      // Best-effort cleanup — don't fail the request
    }
  }
}
