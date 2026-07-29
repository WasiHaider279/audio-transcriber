import config from './config.js';
import { createEngine } from './engine/index.js';
import { createApp } from './server/app.js';
import logger from './utils/logger.js';

async function main() {
  logger.info('=== Transcription Pipeline ===');
  logger.info(`Engine: ${config.engine}`);

  // 1. Create and initialize the transcription engine
  const engine = createEngine(config.engine);
  await engine.initialize();

  // 2. Create and start the Express server
  const app = createApp(engine);

  const server = app.listen(config.port, () => {
    logger.info(`Server listening on http://localhost:${config.port}`);
    logger.info(`Health check: http://localhost:${config.port}/api/health`);
    logger.info(`Transcribe:   POST http://localhost:${config.port}/api/transcribe`);
  });

  // 3. Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    // Force shutdown after 10s
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err.message });
  process.exit(1);
});
