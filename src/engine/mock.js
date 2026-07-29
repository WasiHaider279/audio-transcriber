import { TranscriptionEngine } from './base.js';
import { getAudioDuration } from '../utils/audio.js';
import logger from '../utils/logger.js';

/**
 * Mock transcription engine for development and testing.
 *
 * Returns realistic-looking transcription data without requiring
 * any ML model download. Simulates processing time proportional
 * to audio duration for a more realistic experience.
 */
export class MockEngine extends TranscriptionEngine {
  constructor() {
    super('mock');
  }

  async initialize() {
    logger.info('MockEngine initialized — no model download required');
    this.ready = true;
  }

  async transcribe(audioPath, options = {}) {
    if (!this.ready) throw new Error('MockEngine not initialized');

    // Get real audio duration for realistic timestamps
    let duration;
    try {
      duration = await getAudioDuration(audioPath);
    } catch {
      duration = 12.5; // Fallback duration if file can't be probed
    }

    // Simulate processing delay (~10% of audio duration, capped at 2s)
    const delay = Math.min(duration * 100, 2000);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Generate mock segments that fill the audio duration
    const segments = this._generateSegments(duration);
    const fullText = segments.map((s) => s.text).join(' ');

    logger.info('MockEngine transcription complete', { duration, segmentCount: segments.length });

    return {
      text: fullText,
      segments,
      metadata: {
        duration: Math.round(duration * 100) / 100,
        language: 'en',
        engine: 'mock',
        model: 'mock-v1',
        processedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Generates realistic mock segments to fill the given duration.
   * @param {number} totalDuration - Total audio duration in seconds.
   * @returns {Segment[]}
   */
  _generateSegments(totalDuration) {
    const sampleSentences = [
      'Welcome to the transcription pipeline demo.',
      'This is a mock transcription generated for testing purposes.',
      'The system supports multiple audio formats including WAV and MP3.',
      'Timestamps are provided for each segment of speech.',
      'You can switch to the Whisper engine for real transcription.',
      'The pipeline normalizes audio to sixteen kilohertz mono before processing.',
      'Each segment includes a start time, end time, and transcribed text.',
      'This enables downstream applications to align text with audio.',
      'Thank you for testing the transcription service.',
      'The mock engine returns instantly without requiring any model download.',
    ];

    const segments = [];
    let cursor = 0;
    let sentenceIndex = 0;

    while (cursor < totalDuration) {
      // Each segment is 2-4 seconds long
      const segDuration = Math.min(
        2 + Math.random() * 2,
        totalDuration - cursor,
      );

      if (segDuration < 0.3) break; // Don't create tiny trailing segments

      segments.push({
        start: Math.round(cursor * 100) / 100,
        end: Math.round((cursor + segDuration) * 100) / 100,
        text: sampleSentences[sentenceIndex % sampleSentences.length],
      });

      cursor += segDuration;
      sentenceIndex++;
    }

    return segments;
  }
}
