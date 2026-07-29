# Transcription Pipeline

A Node.js service that accepts audio files (WAV, MP3, M4A, FLAC, OGG, WebM), transcribes speech to text using OpenAI Whisper, and returns timestamped segments.

## Architecture

```
Client ──POST /api/transcribe──▶ Express Server
                                   │
                              Multer (file upload)
                                   │
                              Audio Validator
                                   │
                              FFmpeg Normalizer (→ 16kHz mono WAV)
                                   │
                              Engine Selector
                               ┌───┴───┐
                           MockEngine  WhisperEngine
                               └───┬───┘
                              JSON Response
```

**Key design decisions:**

| Decision | Choice | Why |
|---|---|---|
| STT Engine | `@huggingface/transformers` | Runs Whisper ONNX models locally — no API keys, no cloud, fully free |
| Architecture | Strategy pattern | Swap engines (mock/whisper) without changing any calling code |
| Audio handling | `fluent-ffmpeg` + `ffmpeg-static` | Normalizes any format to what Whisper expects. Bundles ffmpeg. |
| API | Express + Multer | Lightweight, battle-tested file upload handling |

## Quick Start

```bash
# Install dependencies
npm install

# Start server (mock engine by default — no model download needed)
npm start

# Test the health endpoint
curl http://localhost:3000/api/health
```

## API

### `GET /api/health`

Returns server status.

### `POST /api/transcribe`

Transcribes an uploaded audio file.

**Request:** Multipart form with field `audio` containing the file.

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@recording.wav"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Full transcription text...",
    "segments": [
      { "start": 0.0, "end": 2.5, "text": "Hello and welcome" },
      { "start": 2.5, "end": 5.1, "text": "to this demonstration" }
    ],
    "metadata": {
      "duration": 5.1,
      "language": "en",
      "engine": "whisper",
      "model": "onnx-community/whisper-small",
      "processedAt": "2026-07-30T01:12:00Z"
    }
  }
}
```

## CLI

Transcribe files directly without the HTTP server:

```bash
# JSON output (default)
node src/cli.js recording.wav

# Human-readable output
node src/cli.js recording.wav --output text

# Use real Whisper engine
node src/cli.js recording.wav --engine whisper --output text
```

## Configuration

All settings are configured via environment variables (`.env` file):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `ENGINE` | `mock` | Engine type: `mock` or `whisper` |
| `WHISPER_MODEL` | `onnx-community/whisper-small` | Hugging Face model ID |
| `TIMESTAMP_MODE` | `segment` | `segment` or `word` level timestamps |
| `UPLOAD_DIR` | `uploads` | Temp upload directory |
| `MAX_FILE_SIZE_MB` | `50` | Max upload size |

## Switching to Real Transcription

```bash
# Edit .env
ENGINE=whisper

# Restart — first run downloads the model (~460MB for whisper-small)
npm start
```

## Project Structure

```
src/
├── index.js                         # Server entry point
├── cli.js                           # CLI entry point
├── config.js                        # Centralized configuration
├── engine/
│   ├── base.js                      # Abstract engine interface
│   ├── mock.js                      # Mock engine (testing/dev)
│   ├── whisper.js                   # Whisper engine (real STT)
│   └── index.js                     # Engine factory
├── server/
│   ├── app.js                       # Express app setup
│   ├── middleware/
│   │   └── errorHandler.js          # Centralized error handling
│   └── routes/
│       └── transcribe.js            # POST /api/transcribe
└── utils/
    ├── audio.js                     # Audio validation & normalization
    └── logger.js                    # Structured logging
```
