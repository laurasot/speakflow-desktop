# SpeakFlow Desktop

Real-time dual audio capture for meetings. Captures microphone and system audio (Teams, Meet, Zoom, etc.) separately and streams them to a backend via WebSocket.

## Architecture

```
Renderer (React)          Preload (contextBridge)     Main (Node/Electron)
────────────────          ──────────────────────      ───────────────────
getUserMedia ──►          
getDisplayMedia ──►       
AudioWorklet (PCM16) ──►  window.speakflow.pushChunk ──► ipcMain → WS client → Backend
```

## Audio format

| Property    | Value       |
|-------------|-------------|
| Encoding    | PCM 16-bit LE |
| Sample rate | 16 000 Hz   |
| Channels    | Mono        |
| Chunk size  | 500 ms = 8 000 samples = 16 KB |

## WebSocket Protocol

SpeakFlow sends **binary audio** (not base64) for efficiency:

1. **JSON metadata** (text frame) → describes the chunk
2. **PCM binary** (binary frame) → raw audio data

Full protocol specification: [`PROTOCOL.md`](./PROTOCOL.md)

### Quick example

```json
// Frame 1: metadata
{
  "type": "audio_chunk",
  "session_id": "uuid",
  "source": "microphone",
  "timestamp": 1717000000123,
  "size": 16000
}

// Frame 2: binary PCM (16 KB)
<Buffer: PCM 16-bit LE, mono, 16 kHz>
```

Compatible with Deepgram, AssemblyAI, AWS Transcribe (no base64 decode needed).

## Known limitations

- System audio capture uses Chromium's WASAPI loopback — captures the **full system mix**, not per-process audio. This is by design and sufficient for meeting transcription.
- If the audio driver is in exclusive mode, `getDisplayMedia` may throw `OverconstrainedError`. Check that no other app has exclusive audio control.

## Setup

```bash
pnpm install
pnpm run dev
```

On first launch, open **Settings** and configure:
- **User ID** — identifies you in the backend
- **Backend URL** — WebSocket endpoint, e.g. `wss://your-backend.example.com/ws/audio`

## Build

```bash
pnpm run package
```

Produces a Windows installer in `dist/`.
