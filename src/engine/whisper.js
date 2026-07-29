import { pipeline } from '@huggingface/transformers';
import { TranscriptionEngine } from './base.js';
import config from '../config.js';
import logger from '../utils/logger.js';

/**
 * Whisper transcription engine using Hugging Face Transformers.js.
 *
 * Runs OpenAI Whisper models locally via ONNX Runtime — no API keys,
 * no cloud services, fully offline after initial model download.
 *
 * First run downloads the model (~150MB–1.5GB depending on size).
 * Subsequent runs use the cached model.
 */
export class WhisperEngine extends TranscriptionEngine {
  constructor() {
    super('whisper');
    this.pipeline = null;
    this.modelId = config.whisperModel;
  }

  async initialize() {
    logger.info(`Loading Whisper model: ${this.modelId} (first run downloads the model)...`);

    const startTime = Date.now();

    this.pipeline = await pipeline(
      'automatic-speech-recognition',
      this.modelId,
      {
        dtype: 'q8',            // INT8 quantization — faster, lower memory
        device: 'cpu',          // Use CPU (no GPU dependencies needed)
      },
    );

    const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`Whisper model loaded in ${loadTime}s`);
    this.ready = true;
  }

  async transcribe(audioPath, options = {}) {
    if (!this.ready) throw new Error('WhisperEngine not initialized — call initialize() first');

    const timestampMode = options.timestamps || config.timestampMode; // 'word' | 'segment'
    logger.info('Starting Whisper transcription', { file: audioPath, timestamps: timestampMode });

    const startTime = Date.now();

    const result = await this.pipeline(audioPath, {
      return_timestamps: timestampMode === 'word' ? 'word' : true,
      chunk_length_s: 30,      // Process in 30s chunks for long audio
      stride_length_s: 5,      // 5s overlap between chunks for context
    });

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Transform chunks into our standard segment format
    const segments = (result.chunks || []).map((chunk) => ({
      start: Math.round((chunk.timestamp?.[0] ?? 0) * 100) / 100,
      end: Math.round((chunk.timestamp?.[1] ?? 0) * 100) / 100,
      text: chunk.text.trim(),
    }));

    logger.info('Whisper transcription complete', {
      processingTime: `${processingTime}s`,
      segmentCount: segments.length,
    });

    return {
      text: result.text.trim(),
      segments,
      metadata: {
        duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
        language: 'en',
        engine: 'whisper',
        model: this.modelId,
        processingTime: `${processingTime}s`,
        processedAt: new Date().toISOString(),
      },
    };
  }
}
