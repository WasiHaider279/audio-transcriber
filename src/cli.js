#!/usr/bin/env node

import path from 'path';
import { createEngine } from './engine/index.js';
import { validateAudioFile, normalizeAudio, cleanupFiles } from './utils/audio.js';
import config from './config.js';
import logger from './utils/logger.js';

/**
 * CLI interface for the transcription pipeline.
 *
 * Usage:
 *   node src/cli.js <audiofile> [--engine mock|whisper] [--output json|text]
 *
 * Examples:
 *   node src/cli.js recording.wav
 *   node src/cli.js interview.mp3 --engine whisper --output text
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const audioFile = args.find((a) => !a.startsWith('--'));
  const engineType = getFlag(args, '--engine') || config.engine;
  const outputFormat = getFlag(args, '--output') || 'json';

  if (!audioFile || args.includes('--help')) {
    printUsage();
    process.exit(audioFile ? 0 : 1);
  }

  const audioPath = path.resolve(audioFile);

  // 1. Validate
  logger.info(`Input file: ${audioPath}`);
  const validation = await validateAudioFile(audioPath);
  if (!validation.valid) {
    logger.error(validation.error);
    process.exit(1);
  }

  // 2. Initialize engine
  const engine = createEngine(engineType);
  await engine.initialize();

  // 3. Normalize audio
  const normalizedPath = path.join(
    config.uploadDir,
    `cli_${Date.now()}_norm.wav`,
  );

  // Ensure upload dir exists
  const fs = await import('fs');
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  await normalizeAudio(audioPath, normalizedPath);

  // 4. Transcribe
  const result = await engine.transcribe(normalizedPath);

  // 5. Cleanup
  await cleanupFiles(normalizedPath);

  // 6. Output
  if (outputFormat === 'json') {
    console.log(JSON.stringify({ success: true, data: result }, null, 2));
  } else {
    console.log('\n=== Transcription ===\n');
    console.log(result.text);
    console.log('\n=== Segments ===\n');
    for (const seg of result.segments) {
      const startFmt = formatTime(seg.start);
      const endFmt = formatTime(seg.end);
      console.log(`[${startFmt} → ${endFmt}]  ${seg.text}`);
    }
    console.log(`\n--- ${result.segments.length} segments | Engine: ${result.metadata.engine} ---\n`);
  }
}

/** Extract --flag value from args. */
function getFlag(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

/** Format seconds to MM:SS.ms */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2).padStart(5, '0');
  return `${String(mins).padStart(2, '0')}:${secs}`;
}

function printUsage() {
  console.log(`
  Transcription Pipeline CLI

  Usage:
    node src/cli.js <audiofile> [options]

  Options:
    --engine <mock|whisper>   Transcription engine (default: from .env)
    --output <json|text>      Output format (default: json)
    --help                    Show this help

  Examples:
    node src/cli.js recording.wav
    node src/cli.js interview.mp3 --engine whisper --output text
  `);
}

main().catch((err) => {
  logger.error('CLI error', { error: err.message });
  process.exit(1);
});
