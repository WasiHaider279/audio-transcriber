import { MockEngine } from './mock.js';
import { WhisperEngine } from './whisper.js';

/**
 * Factory function that creates and returns the correct engine
 * based on the given type string.
 *
 * @param {'mock' | 'whisper'} type - Engine type to create.
 * @returns {TranscriptionEngine}
 */
export function createEngine(type) {
  switch (type) {
    case 'mock':
      return new MockEngine();
    case 'whisper':
      return new WhisperEngine();
    default:
      throw new Error(
        `Unknown engine type "${type}". Valid options: mock, whisper`,
      );
  }
}
