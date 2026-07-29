import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,

  // Engine
  engine: process.env.ENGINE || 'mock',

  // Whisper
  whisperModel: process.env.WHISPER_MODEL || 'onnx-community/whisper-small',
  timestampMode: process.env.TIMESTAMP_MODE || 'segment', // 'word' | 'segment'

  // Upload
  uploadDir: path.resolve(PROJECT_ROOT, process.env.UPLOAD_DIR || 'uploads'),
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50,
  maxFileSizeBytes() {
    return this.maxFileSizeMB * 1024 * 1024;
  },

  // Audio
  supportedFormats: ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm'],
  normalizedSampleRate: 16000,

  // Paths
  projectRoot: PROJECT_ROOT,
};

export default config;
