export interface FileNode {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  children?: FileNode[];
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface BuildProgress {
  stage: string;
  progress: number;
  log?: string;
  done?: boolean;
  error?: string;
  outputPath?: string;
}

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  readDirectoryTree: (dirPath: string, maxDepth?: number) => Promise<FileNode[]>;
  applyPatchDiff: (filePath: string, searchChunk: string, replaceChunk: string) => Promise<{ success: boolean; error?: string }>;
  pathExists: (filePath: string) => Promise<boolean>;
  
  createTerminalSession: (id: string, cwd?: string) => Promise<void>;
  writeTerminal: (id: string, data: string) => Promise<void>;
  killTerminalSession: (id: string) => Promise<void>;
  onTerminalData: (callback: (event: { id: string; data: string }) => void) => () => void;
  onTerminalExit: (callback: (event: { id: string; code: number | null }) => void) => () => void;

  executeAgentCommand: (command: string, cwd: string, taskId: string) => Promise<CommandResult>;
  onAgentCommandChunk: (callback: (data: { taskId: string; chunk: string }) => void) => () => void;

  secureStorage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    getAll: () => Promise<Record<string, string>>;
    isOsKeychain: () => Promise<boolean>;
  };

  oauth: {
    startGooglePKCE: (customClientId?: string) => Promise<any>;
    refreshToken: (refreshToken: string, customClientId?: string) => Promise<any>;
  };

  exportZip: (sourceDir: string, targetZipPath?: string) => Promise<{ success: boolean; outputPath: string; error?: string }>;
  runBuildTarget: (targetType: string, projectDir: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>;
  onBuildProgress: (callback: (progress: BuildProgress) => void) => () => void;

  showItemInFolder: (fullPath: string) => Promise<void>;
  openExternalUrl: (targetUrl: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
