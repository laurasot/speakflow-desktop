# SpeakFlow Desktop

Desktop application that captures **two audio sources in real-time** (user's microphone + system audio) and streams them separately to a backend for transcription in virtual meetings.

![SpeakFlow UI](assets/screenshot.png)

## Features

* **Dual audio capture** — user's microphone + remote meeting audio (Teams, Meet, Zoom)
* **Low-latency streaming** — 500ms chunks with binary PCM audio (not base64)
* **Automatic reconnection** — 60s buffer with exponential backoff on backend failures
* **Real-time UI** — VU meters per source + live transcripts from backend
* **Secure architecture** — Electron sandbox, `contextIsolation`, no `nodeIntegration`

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Renderer (React)                                   │
│  ┌──────────────────┐   ┌──────────────────┐       │
│  │ getUserMedia     │   │ getDisplayMedia  │       │
│  │ (microphone)     │   │ (WASAPI loopback)│       │
│  └────────┬─────────┘   └────────┬─────────┘       │
│           │                      │                  │
│           └──────┬───────────────┘                  │
│                  ↓                                   │
│          AudioWorklet (PCM 16-bit mono 16kHz)       │
│                  ↓                                   │
│           IPC (ArrayBuffer)                         │
└──────────────────┼─────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│  Main Process (Node.js)                             │
│  ┌──────────────────────────────────────┐           │
│  │ Ring Buffer (120 chunks ≈ 60s audio) │           │
│  └────────────────┬─────────────────────┘           │
│                   ↓                                  │
│       WebSocket Client + Heartbeat                  │
│                   ↓                                  │
└───────────────────┼─────────────────────────────────┘
                    ↓
            Backend WebSocket
        (JSON metadata + binary PCM)
```

Every 500ms, **2 WebSocket frames** are sent:
1. JSON with metadata (`session_id`, `source`, `timestamp`, `size`)
2. Binary with PCM (~16 KB)

[**→ See full technical protocol**](./PROTOCOL.md)

## Tech Stack

**Desktop App:**
* Electron 31
* React 18 + TypeScript
* Vite (dev server + HMR)
* Zustand (state management)
* WASAPI Loopback (system capture on Windows)

**Tooling:**
* pnpm (package manager)
* electron-vite (build)
* electron-builder (packaging)
* ESLint + TypeScript strict

## Getting Started

### Prerequisites

* **Node.js** 20+
* **pnpm** 9+
* **Windows 10/11** (for now; macOS/Linux on roadmap)

### Installation

```bash
git clone https://github.com/your-org/speakflow-desktop.git
cd speakflow-desktop
pnpm install
```

### Run

```bash
pnpm run dev
```

The Electron window will open with DevTools.

### Configure

1. Click **⚙ Settings**
2. Enter:
   - **User ID:** your identifier
   - **Backend WebSocket URL:** `ws://localhost:8000/ws/audio` (or your backend)
3. **Save**

### Start Capturing

1. Select microphone (or leave "System default")
2. **▶ Start Capture**
3. Accept Windows permissions
4. You'll see:
   - 🟢 **Connected** (if backend is running)
   - VU meters **MIC** / **SYS**
   - Real-time transcripts (if backend sends them)

## Project Structure

```
speakflow-desktop/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── audio/         # WASAPI capture + permissions
│   │   ├── websocket/     # WS client + reconnection + buffer
│   │   ├── auth/          # CredentialsProvider (static/JWT)
│   │   ├── config/        # settings.json in userData
│   │   ├── ipc/           # IPC handlers
│   │   └── logging/       # structured electron-log
│   ├── preload/           # contextBridge (secure API)
│   ├── renderer/          # React UI
│   │   ├── audio/         # getUserMedia + AudioWorklet
│   │   ├── components/    # UI controls + VU + transcripts
│   │   └── store/         # Zustand store
│   └── shared/            # Shared types + constants
├── PROTOCOL.md            # WebSocket technical spec
└── electron-builder.yml   # Windows packaging config
```

## Build & Package

### Development Build

```bash
pnpm run build
```

Generates `out/` with compiled bundles.

### Production Installer

```bash
pnpm run package
```

Generates installer in `dist/` (`.exe` for Windows).

## Roadmap

- [x] Microphone + system capture (WASAPI loopback)
- [x] Binary WebSocket protocol
- [x] Ring buffer + automatic reconnection
- [x] UI with VU meters + transcripts
- [x] Persistent settings
- [ ] JWT login (seam prepared, pending implementation)
- [ ] Floating overlay over meeting
- [ ] macOS support (CoreAudio)
- [ ] Linux support (PulseAudio)
- [ ] Auto-update
- [ ] Global hotkeys (mute, stop)
- [ ] ASR language selection

## Lessons Learned

### Technical Challenges

**1. System audio capture without custom drivers**

Using `desktopCapturer` with `audio: 'loopback'` from Electron allows capturing WASAPI loopback on Windows without installing virtual drivers (VB-Audio Cable, etc.). Limitation: captures **full system mix**, not per-process.

**2. Resampling to 16 kHz without custom DSP**

`new AudioContext({ sampleRate: 16000 })` delegates resampling to Chromium's libwebrtc. Quality sufficient for ASR with zero overhead of maintaining custom polyphase decimators.

**3. Audio IPC without memory inflation**

Sending `ArrayBuffer` over IPC (instead of base64 in JSON) reduces overhead. The `ArrayBuffer` is transferred via structured clone, not serialization.

**4. Reconnection without losing audio**

Bounded ring buffer (60s) + exponential backoff. On reconnect, drains queue in order. Drop-oldest if overflow (rare with 500ms chunks).

**5. Electron sandbox without breaking capture**

Capture **must run in renderer** (Web APIs: `getUserMedia`, `AudioWorklet`). Main only handles WebSocket + IPC. Preload exposes minimal API with `contextBridge`.

### Design Decisions

- **Binary vs base64:** saves ~25% bandwidth and is directly compatible with Deepgram/AssemblyAI.
- **500ms chunks:** balance between latency (low) and network overhead (acceptable).
- **Two separate sources:** enables diarization (user vs. remote) in backend without client-side VAD.
- **pnpm:** faster resolution than npm, but requires `--skipDepsCheck` due to electron build scripts issue.

## Contributing

```bash
# Fork + clone
git checkout -b feature/my-feature
# ... changes ...
pnpm run lint
pnpm run build
git commit -m "feat: description"
# Push + PR
```

## License

MIT

---

**Technical docs:**
- [WebSocket Protocol](./PROTOCOL.md) — JSON + binary schema, backend examples
- [Project rules](./.cursor/rules/project-rules.mdc) — Electron architecture, security
