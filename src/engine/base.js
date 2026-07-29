/**
 * Abstract base class for transcription engines.
 *
 * All engines must implement `initialize()` and `transcribe()`.
 * This enforces a consistent interface so engines can be swapped
 * without changing any calling code (Strategy pattern).
 */
export class TranscriptionEngine {
  constructor(name) {
    this.name = name;
    this.ready = false;
  }

  /**
   * Initialize the engine (e.g., load models, warm up).
   * Called once at server startup.
   */
  async initialize() {
    throw new Error(`${this.name}: initialize() not implemented`);
  }

  /**
   * Transcribe an audio file.
   * @param {string} audioPath - Path to a normalized 16kHz mono WAV file.
   * @param {object} options - Engine-specific options.
   * @returns {Promise<TranscriptionResult>}
   *
   * @typedef {object} TranscriptionResult
   * @property {string} text - Full transcription text.
   * @property {Segment[]} segments - Timestamped segments.
   * @property {object} metadata - Engine/model metadata.
   *
   * @typedef {object} Segment
   * @property {number} start - Start time in seconds.
   * @property {number} end - End time in seconds.
   * @property {string} text - Transcribed text for this segment.
   */
  async transcribe(audioPath, options = {}) {
    throw new Error(`${this.name}: transcribe() not implemented`);
  }
}
