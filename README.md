# 🚀 Vibe-Studio
### The Autonomous, Zero-Cost, Universal AI Vibe-Coding Desktop IDE

---

## 🌟 Overview
**Vibe-Studio** is an open-source, zero-cloud-cost, local-first desktop application designed specifically for **vibe coders**. Instead of a complex traditional editor, Vibe-Studio gives you an autonomous AI studio where you can build full-stack applications through natural language prompts, live interactive previews, autonomous terminal command execution with self-healing, and one-click packaging into standalone **`.exe` files, `.zip` archives, `.jar` packages**, and native binaries.

---

## ⚡ Key Features

- 🌐 **Universal Model Hub & BYOK**:
  - **Google Gemini**: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 3.0 via Google AI Studio API or Vertex AI.
  - **DeepSeek**: DeepSeek-V3 and DeepSeek-R1 with autonomous tool-calling loops.
  - **xAI Grok**: Grok 2 & Grok 3 high-speed reasoning.
  - **OpenRouter**: Access 200+ AI models through a single API key.
  - **Ollama Local LLMs**: 100% Free, Private, Offline execution on `localhost:11434` (e.g. Llama 3.3, Qwen 2.5 Coder).
  - **Custom Endpoints**: Any OpenAI-compatible vLLM / LM Studio / LocalAI instance.

- 🔐 **Google Cloud & Vertex AI PKCE OAuth**:
  - Built-in local HTTP loopback server on `http://127.0.0.1:8989/oauth/callback` handles Google OAuth 2.0 with PKCE without requiring any hosted backend server.
  - Directly leverage your Google Cloud project quotas and Vertex AI models.

- 🛡️ **Zero-Cost Local Keychain Security**:
  - All API keys and auth tokens are encrypted using the OS-level keychain (`safeStorage` in Electron) with AES-256 fallback.

- 🤖 **Autonomous Vibe-Coder Agent Loop**:
  - `read_directory_tree(path)`: Recursive project structure inspection.
  - `read_file(path)`: Source code reading.
  - `write_file(path, content)`: Creates and overwrites files.
  - `apply_patch_diff(path, search_chunk, replace_chunk)`: Surgical multi-line patching.
  - `execute_terminal_command(command, cwd)`: Bidirectional shell command execution (`npm install`, `cargo build`, `pip install`, etc.).
  - `auto_heal_error(error_logs)`: Auto-intercepts compiler/runtime errors and applies fixes without user intervention.

- 🖥️ **Live Interactive Preview**:
  - Sandboxed iframe preview with hot-reloading dev server connector.
  - Viewport presets: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667), Zoom (50% - 150%).
  - Refresh & external browser bridge.

- 📦 **One-Click Build & Export Studio**:
  - **Clean ZIP Export**: Instant one-click compression ignoring build caches and node_modules.
  - **Windows `.exe`**: Electron standalone installer & portable executables.
  - **Python `.exe`**: Automated `PyInstaller` single-file packaging.
  - **Rust / Go**: `cargo build --release` and `go build`.
  - **Java `.jar`**: `./gradlew shadowJar` or `mvn package`.
  - **Build Status HUD**: Visual progress bar and direct Finder/Explorer reveal.

- 🔄 **Automated CI/CD**:
  - Free GitHub Actions workflow (`.github/workflows/release.yml`) compiles Windows `.exe`, macOS `.dmg`, and Linux `.AppImage` binaries automatically on every git tag.

---

## 🛠️ Development & Installation

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (Vite + Electron)
npm run electron:dev
```

### Production Build
```bash
# Build web renderer & Electron binaries
npm run build

# Package desktop application for your current OS
npm run electron:build

# Target specific operating systems
npm run electron:build:win   # Windows .exe installer & portable
npm run electron:build:mac   # macOS .dmg and universal binary
npm run electron:build:linux # Linux .AppImage & .deb
```

---

## 📁 Repository Structure

```text
vibe-studio/
├── .github/
│   └── workflows/
│       └── release.yml          # GitHub Actions: automated multi-OS release builder
├── electron/
│   ├── main.ts                  # Electron main process & IPC handlers
│   ├── preload.ts               # Secure contextBridge IPC layer
│   ├── pty-manager.ts           # Terminal & command execution engine
│   ├── oauth-handler.ts         # Local loopback server for Google OAuth PKCE
│   └── secure-storage.ts        # OS-level keychain encryption
├── src/
│   ├── components/
│   │   ├── agent/
│   │   │   ├── ChatInterface.tsx    # Vibe prompt input & streaming responses
│   │   │   ├── AgentActionLog.tsx   # Visual tool-call cards & diff viewer
│   │   │   └── ModelSelector.tsx    # Universal provider dropdown
│   │   ├── preview/
│   │   │   ├── LivePreview.tsx      # Sandboxed Webview preview with viewport controls
│   │   │   └── TerminalDrawer.tsx   # xterm.js terminal drawer
│   │   ├── export/
│   │   │   └── ExportModal.tsx      # One-click .EXE / .ZIP / .JAR build triggers
│   │   ├── settings/
│   │   │   ├── ApiKeyManager.tsx    # BYOK credentials settings
│   │   │   └── OAuthLoginModal.tsx  # Google Cloud / Vertex AI OAuth PKCE
│   │   └── editor/
│   │       └── CodeEditorModal.tsx  # Project file explorer & editor
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── provider-router.ts   # Universal AI client (Gemini, DeepSeek, Grok, Ollama)
│   │   │   ├── agent-runtime.ts     # Autonomous tool-calling and self-healing loop
│   │   │   └── tools-definition.ts  # JSON Schema tool definitions
│   │   └── builders/
│   │       ├── zip-builder.ts       # archiver zip packaging
│   │       └── exe-builder.ts       # Multi-target compiler orchestrator
│   ├── App.tsx                      # Main IDE layout
│   ├── main.tsx                     # React entrypoint
│   └── index.css                    # Tailwind CSS & cyber neon styling
├── package.json
├── electron-builder.json5           # Packaging config for Windows, Mac, Linux
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

---

## 📜 License
MIT License - 100% Open Source & Free for personal and commercial use.
