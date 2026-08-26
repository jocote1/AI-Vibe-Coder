import { spawn, ChildProcess } from 'child_process';
import os from 'os';
import { BrowserWindow } from 'electron';

export interface TerminalSession {
  id: string;
  process: ChildProcess;
  cwd: string;
  shell: string;
}

export class PtyManager {
  private sessions: Map<string, TerminalSession> = new Map();
  private mainWindow: BrowserWindow | null = null;

  public setWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'powershell.exe';
    }
    return process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
  }

  public createSession(id: string, cwd?: string): void {
    if (this.sessions.has(id)) {
      this.killSession(id);
    }

    const workingDir = cwd || os.homedir();
    const shell = this.getDefaultShell();

    const proc = spawn(shell, process.platform === 'win32' ? [] : ['-l'], {
      cwd: workingDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
      shell: false,
    });

    proc.stdout?.on('data', (data: Buffer) => {
      this.mainWindow?.webContents.send('terminal:data', {
        id,
        data: data.toString('utf8'),
      });
    });

    proc.stderr?.on('data', (data: Buffer) => {
      this.mainWindow?.webContents.send('terminal:data', {
        id,
        data: data.toString('utf8'),
      });
    });

    proc.on('exit', (code) => {
      this.mainWindow?.webContents.send('terminal:exit', {
        id,
        code,
      });
      this.sessions.delete(id);
    });

    proc.on('error', (err) => {
      this.mainWindow?.webContents.send('terminal:data', {
        id,
        data: `\r\n\x1b[31m[Process Error]: ${err.message}\x1b[0m\r\n`,
      });
    });

    this.sessions.set(id, {
      id,
      process: proc,
      cwd: workingDir,
      shell,
    });
  }

  public write(id: string, data: string): void {
    const session = this.sessions.get(id);
    if (session && session.process.stdin && !session.process.stdin.destroyed) {
      session.process.stdin.write(data);
    }
  }

  public resize(_id: string, _cols: number, _rows: number): void {
    // child_process does not have a native resize pseudo-terminal ioctl,
    // but handled gracefully here for node-pty compatibility
  }

  public killSession(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      try {
        session.process.kill('SIGTERM');
      } catch (e) {
        console.warn(`Failed to kill process for session ${id}:`, e);
      }
      this.sessions.delete(id);
    }
  }

  public killAll(): void {
    for (const id of this.sessions.keys()) {
      this.killSession(id);
    }
  }

  /**
   * Execute a single command asynchronously with streaming output callbacks.
   * Used directly by the AI agent loop (execute_terminal_command).
   */
  public executeCommand(
    command: string,
    cwd: string,
    onData: (chunk: string) => void
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      const shellExecutable = isWin ? (process.env.COMSPEC || 'cmd.exe') : (process.env.SHELL || '/bin/bash');
      const shellArgs = isWin ? ['/d', '/s', '/c', command] : ['-c', command];

      let stdout = '';
      let stderr = '';

      const proc = spawn(shellExecutable, shellArgs, {
        cwd,
        env: {
          ...process.env,
          NODE_ENV: 'development',
          FORCE_COLOR: '1',
        },
      });

      proc.stdout?.on('data', (chunk: Buffer) => {
        const str = chunk.toString('utf8');
        stdout += str;
        onData(str);
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        const str = chunk.toString('utf8');
        stderr += str;
        onData(str);
      });

      proc.on('close', (code) => {
        resolve({
          exitCode: code ?? 0,
          stdout,
          stderr,
        });
      });

      proc.on('error', (err) => {
        const msg = `\nCommand failed to spawn: ${err.message}\n`;
        stderr += msg;
        onData(msg);
        resolve({
          exitCode: 1,
          stdout,
          stderr,
        });
      });
    });
  }
}
