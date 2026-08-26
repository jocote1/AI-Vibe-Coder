import { contextBridge, ipcRenderer } from 'electron';

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

const electronAPI = {
  // Dialogs
  openDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-directory'),
  
  // File System
  readFile: (filePath: string): Promise<string> => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath: string, content: string): Promise<{ success: boolean; error?: string }> => 
    ipcRenderer.invoke('fs:write-file', filePath, content),
  readDirectoryTree: (dirPath: string, maxDepth?: number): Promise<FileNode[]> => 
    ipcRenderer.invoke('fs:read-directory-tree', dirPath, maxDepth),
  applyPatchDiff: (filePath: string, searchChunk: string, replaceChunk: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('fs:apply-patch-diff', filePath, searchChunk, replaceChunk),
  pathExists: (filePath: string): Promise<boolean> => ipcRenderer.invoke('fs:exists', filePath),
  
  // Terminal / Shell
  createTerminalSession: (id: string, cwd?: string): Promise<void> => 
    ipcRenderer.invoke('terminal:create-session', id, cwd),
  writeTerminal: (id: string, data: string): Promise<void> => 
    ipcRenderer.invoke('terminal:write', id, data),
  killTerminalSession: (id: string): Promise<void> => 
    ipcRenderer.invoke('terminal:kill', id),
  onTerminalData: (callback: (event: { id: string; data: string }) => void) => {
    const listener = (_: any, data: { id: string; data: string }) => callback(data);
    ipcRenderer.on('terminal:data', listener);
    return () => ipcRenderer.removeListener('terminal:data', listener);
  },
  onTerminalExit: (callback: (event: { id: string; code: number | null }) => void) => {
    const listener = (_: any, data: { id: string; code: number | null }) => callback(data);
    ipcRenderer.on('terminal:exit', listener);
    return () => ipcRenderer.removeListener('terminal:exit', listener);
  },

  // AI Command Execution Loop
  executeAgentCommand: (command: string, cwd: string, taskId: string): Promise<CommandResult> => 
    ipcRenderer.invoke('agent:execute-command', command, cwd, taskId),
  onAgentCommandChunk: (callback: (data: { taskId: string; chunk: string }) => void) => {
    const listener = (_: any, data: { taskId: string; chunk: string }) => callback(data);
    ipcRenderer.on('agent:command-chunk', listener);
    return () => ipcRenderer.removeListener('agent:command-chunk', listener);
  },

  // Secure OS Keychain Storage
  secureStorage: {
    getItem: (key: string): Promise<string | null> => ipcRenderer.invoke('secure-storage:get', key),
    setItem: (key: string, value: string): Promise<void> => ipcRenderer.invoke('secure-storage:set', key, value),
    removeItem: (key: string): Promise<void> => ipcRenderer.invoke('secure-storage:remove', key),
    getAll: (): Promise<Record<string, string>> => ipcRenderer.invoke('secure-storage:get-all'),
    isOsKeychain: (): Promise<boolean> => ipcRenderer.invoke('secure-storage:is-os-keychain'),
  },

  // OAuth 2.0 PKCE Loopback
  oauth: {
    startGooglePKCE: (customClientId?: string): Promise<any> => 
      ipcRenderer.invoke('oauth:start-google-pkce', customClientId),
    refreshToken: (refreshToken: string, customClientId?: string): Promise<any> => 
      ipcRenderer.invoke('oauth:refresh-token', refreshToken, customClientId),
  },

  // One-Click Builders & Exporters
  exportZip: (sourceDir: string, targetZipPath?: string): Promise<{ success: boolean; outputPath: string; error?: string }> => 
    ipcRenderer.invoke('builder:export-zip', sourceDir, targetZipPath),
  runBuildTarget: (targetType: string, projectDir: string): Promise<{ success: boolean; outputPath?: string; error?: string }> => 
    ipcRenderer.invoke('builder:run-build-target', targetType, projectDir),
  onBuildProgress: (callback: (progress: BuildProgress) => void) => {
    const listener = (_: any, progress: BuildProgress) => callback(progress);
    ipcRenderer.on('builder:progress', listener);
    return () => ipcRenderer.removeListener('builder:progress', listener);
  },

  // Native Utilities
  showItemInFolder: (fullPath: string): Promise<void> => ipcRenderer.invoke('shell:show-item', fullPath),
  openExternalUrl: (targetUrl: string): Promise<void> => ipcRenderer.invoke('shell:open-external', targetUrl),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
