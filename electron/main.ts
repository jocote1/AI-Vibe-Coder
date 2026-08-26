import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { execFile, exec } from 'child_process';
import { SecureStorageManager } from './secure-storage.js';
import { OAuthHandler } from './oauth-handler.js';
import { PtyManager } from './pty-manager.js';

let mainWindow: BrowserWindow | null = null;
const secureStorage = new SecureStorageManager();
const oauthHandler = new OAuthHandler();
const ptyManager = new PtyManager();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Vibe Studio',
    backgroundColor: '#090a0f',
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
  });

  ptyManager.setWindow(mainWindow);

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    ptyManager.killAll();
    oauthHandler.stopLocalServer();
  });

  return mainWindow;
}

// ----------------------------------------------------
// IPC Registration
// ----------------------------------------------------

// Dialogs
ipcMain.handle('dialog:open-directory', async () => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

// File System Helpers
ipcMain.handle('fs:read-file', async (_, filePath: string) => {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (err: any) {
    throw new Error(`Failed to read file at "${filePath}": ${err.message}`);
  }
});

ipcMain.handle('fs:write-file', async (_, filePath: string, content: string) => {
  try {
    const parent = path.dirname(filePath);
    await fs.promises.mkdir(parent, { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf8');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:exists', async (_, targetPath: string) => {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
});

ipcMain.handle('fs:apply-patch-diff', async (_, filePath: string, searchChunk: string, replaceChunk: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }
    const original = await fs.promises.readFile(filePath, 'utf8');
    if (!original.includes(searchChunk)) {
      return { success: false, error: `Target search chunk not found in ${path.basename(filePath)}` };
    }
    const updated = original.replace(searchChunk, replaceChunk);
    await fs.promises.writeFile(filePath, updated, 'utf8');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

interface FileNode {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  children?: FileNode[];
}

ipcMain.handle('fs:read-directory-tree', async (_, dirPath: string, maxDepth = 4) => {
  const IGNORE_PATTERNS = new Set(['node_modules', '.git', 'dist', 'dist-electron', '.idea', '.vscode', '__pycache__', '.next', 'target', 'build', '.gradle']);

  async function traverse(currentDir: string, depth: number): Promise<FileNode[]> {
    if (depth > maxDepth) return [];
    try {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      const nodes: FileNode[] = [];

      for (const entry of entries) {
        if (IGNORE_PATTERNS.has(entry.name)) continue;
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(dirPath, fullPath);

        if (entry.isDirectory()) {
          const children = await traverse(fullPath, depth + 1);
          nodes.push({
            name: entry.name,
            path: fullPath,
            relativePath: relPath,
            isDirectory: true,
            children,
          });
        } else {
          let size = 0;
          try {
            const stat = await fs.promises.stat(fullPath);
            size = stat.size;
          } catch {}
          nodes.push({
            name: entry.name,
            path: fullPath,
            relativePath: relPath,
            isDirectory: false,
            size,
          });
        }
      }

      // Sort directories first, then alphabetically
      return nodes.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) {
          return a.name.localeCompare(b.name);
        }
        return a.isDirectory ? -1 : 1;
      });
    } catch (err) {
      console.warn(`Error traversing directory ${currentDir}:`, err);
      return [];
    }
  }

  return await traverse(dirPath, 1);
});

// Terminal & PTY
ipcMain.handle('terminal:create-session', async (_, id: string, cwd?: string) => {
  ptyManager.createSession(id, cwd);
});

ipcMain.handle('terminal:write', async (_, id: string, data: string) => {
  ptyManager.write(id, data);
});

ipcMain.handle('terminal:kill', async (_, id: string) => {
  ptyManager.killSession(id);
});

// Autonomous Agent Command Execution
ipcMain.handle('agent:execute-command', async (_, command: string, cwd: string, taskId: string) => {
  return await ptyManager.executeCommand(command, cwd, (chunk: string) => {
    mainWindow?.webContents.send('agent:command-chunk', { taskId, chunk });
  });
});

// Secure OS Keychain Storage
ipcMain.handle('secure-storage:get', async (_, key: string) => {
  return secureStorage.getItem(key);
});

ipcMain.handle('secure-storage:set', async (_, key: string, value: string) => {
  secureStorage.setItem(key, value);
});

ipcMain.handle('secure-storage:remove', async (_, key: string) => {
  secureStorage.removeItem(key);
});

ipcMain.handle('secure-storage:get-all', async () => {
  return secureStorage.getAll();
});

ipcMain.handle('secure-storage:is-os-keychain', async () => {
  return secureStorage.isUsingOsKeychain();
});

// Google Cloud / Vertex AI OAuth PKCE
ipcMain.handle('oauth:start-google-pkce', async (_, customClientId?: string) => {
  return await oauthHandler.startGooglePKCEFlow(customClientId);
});

ipcMain.handle('oauth:refresh-token', async (_, refreshToken: string, customClientId?: string) => {
  return await oauthHandler.refreshAccessToken(refreshToken, customClientId);
});

// One-Click Builders
ipcMain.handle('builder:export-zip', async (_, sourceDir: string, targetZipPath?: string) => {
  try {
    const defaultExportName = `${path.basename(sourceDir)}-export-${Date.now()}.zip`;
    const outputPath = targetZipPath || path.join(path.dirname(sourceDir), defaultExportName);

    // Cross-platform native zero-dependency zip
    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';

      if (isWin) {
        // PowerShell Compress-Archive on Windows
        const psCommand = `powershell -NoProfile -NonInteractive -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outputPath}' -Force"`;
        exec(psCommand, (err) => {
          if (err) {
            resolve({ success: false, outputPath, error: err.message });
          } else {
            resolve({ success: true, outputPath });
          }
        });
      } else {
        // Native zip on macOS and Linux
        const zipArgs = [
          '-r',
          '-q',
          outputPath,
          '.',
          '-x',
          'node_modules/*',
          '.git/*',
          'dist/*',
          'dist-electron/*',
          '.idea/*',
          '.vscode/*',
          '__pycache__/*',
          '.next/*',
          'target/*',
          'build/*',
          '.gradle/*',
          '*.zip',
        ];

        execFile('zip', zipArgs, { cwd: sourceDir }, (err) => {
          if (err) {
            resolve({ success: false, outputPath, error: err.message });
          } else {
            resolve({ success: true, outputPath });
          }
        });
      }
    });
  } catch (err: any) {
    return { success: false, outputPath: '', error: err.message };
  }
});

ipcMain.handle('builder:run-build-target', async (_, targetType: string, projectDir: string) => {
  const sendProgress = (stage: string, progress: number, log?: string, done = false, error?: string, outputPath?: string) => {
    mainWindow?.webContents.send('builder:progress', { stage, progress, log, done, error, outputPath });
  };

  try {
    sendProgress(`Initializing ${targetType} build...`, 10, `Target directory: ${projectDir}`);

    let buildCommand = '';
    let expectedOutputName = '';

    switch (targetType) {
      case 'exe-electron':
        sendProgress('Bundling Web Assets...', 25);
        buildCommand = 'npm run build && npx electron-builder --win --x64';
        expectedOutputName = 'release';
        break;

      case 'python-exe':
        sendProgress('Analyzing Python Entrypoint...', 20);
        const mainPy = fs.existsSync(path.join(projectDir, 'main.py')) ? 'main.py' : 'app.py';
        buildCommand = `python -m PyInstaller --onefile --windowed --name "VibeApp" ${mainPy}`;
        expectedOutputName = path.join('dist', 'VibeApp.exe');
        break;

      case 'rust-bin':
        sendProgress('Running Cargo Release...', 30);
        buildCommand = 'cargo build --release';
        expectedOutputName = path.join('target', 'release');
        break;

      case 'go-bin':
        sendProgress('Building Go Binary...', 30);
        buildCommand = 'go build -o vibe-app-build';
        expectedOutputName = 'vibe-app-build';
        break;

      case 'java-jar':
        sendProgress('Running Gradle / Maven Packaging...', 30);
        if (fs.existsSync(path.join(projectDir, 'gradlew'))) {
          buildCommand = './gradlew shadowJar || ./gradlew build';
          expectedOutputName = path.join('build', 'libs');
        } else {
          buildCommand = 'mvn clean package';
          expectedOutputName = path.join('target');
        }
        break;

      default:
        throw new Error(`Unsupported build target: ${targetType}`);
    }

    sendProgress(`Executing compilation command: ${buildCommand}`, 40);

    const result = await ptyManager.executeCommand(buildCommand, projectDir, (chunk) => {
      sendProgress('Compiling...', 65, chunk);
    });

    if (result.exitCode !== 0) {
      sendProgress('Build Failed', 100, result.stderr, true, `Process exited with code ${result.exitCode}`);
      return { success: false, error: result.stderr || result.stdout };
    }

    const fullOutputPath = path.join(projectDir, expectedOutputName);
    sendProgress('Build Completed Successfully! 🎉', 100, `Output saved to: ${fullOutputPath}`, true, undefined, fullOutputPath);
    return { success: true, outputPath: fullOutputPath };
  } catch (err: any) {
    sendProgress('Build Errored', 100, err.message, true, err.message);
    return { success: false, error: err.message };
  }
});

// Shell Actions
ipcMain.handle('shell:show-item', async (_, fullPath: string) => {
  shell.showItemInFolder(fullPath);
});

ipcMain.handle('shell:open-external', async (_, targetUrl: string) => {
  shell.openExternal(targetUrl);
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
