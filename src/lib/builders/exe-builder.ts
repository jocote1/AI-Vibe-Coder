import { BuildProgress } from '../../types/electron';

export type BuildTargetType = 
  | 'exe-electron' 
  | 'python-exe' 
  | 'rust-bin' 
  | 'go-bin' 
  | 'java-jar' 
  | 'zip';

export interface BuildTargetInfo {
  id: BuildTargetType;
  title: string;
  badge: string;
  iconName: string;
  description: string;
  requirements: string;
  outputFormat: string;
}

export const BUILD_TARGETS: BuildTargetInfo[] = [
  {
    id: 'zip',
    title: 'Clean Project ZIP Archive',
    badge: 'Zero-Config',
    iconName: 'Archive',
    description: 'Instantly packages the complete codebase into a compressed .zip, filtering build artifacts & secrets.',
    requirements: 'Built-in (Zero dependencies)',
    outputFormat: '.zip',
  },
  {
    id: 'exe-electron',
    title: 'Windows Standalone .EXE / Desktop App',
    badge: 'Desktop',
    iconName: 'Laptop',
    description: 'Packages Web/Node applications into a native standalone Windows installer and portable .exe.',
    requirements: 'Node.js & npm',
    outputFormat: '.exe / .dmg / .AppImage',
  },
  {
    id: 'python-exe',
    title: 'Python Standalone Executable',
    badge: 'Python',
    iconName: 'Terminal',
    description: 'Compiles Python scripts (main.py / app.py) into a single-file windowed or console executable.',
    requirements: 'Python & PyInstaller (`pip install pyinstaller`)',
    outputFormat: '.exe / binary',
  },
  {
    id: 'rust-bin',
    title: 'Rust High-Performance Binary',
    badge: 'Rust',
    iconName: 'Cpu',
    description: 'Compiles optimized, blazing-fast native release binary using Cargo.',
    requirements: 'Rust toolchain (`rustc` & `cargo`)',
    outputFormat: 'Executable Binary',
  },
  {
    id: 'go-bin',
    title: 'Go Native Executable',
    badge: 'Go',
    iconName: 'Zap',
    description: 'Builds a statically linked, single-binary cross-platform executable.',
    requirements: 'Go (`go` compiler)',
    outputFormat: 'Single Binary',
  },
  {
    id: 'java-jar',
    title: 'Java Standalone JAR Package',
    badge: 'Java',
    iconName: 'Coffee',
    description: 'Builds a runnable Uber-JAR / ShadowJAR using Gradle or Maven.',
    requirements: 'JDK 17+ & Gradle or Maven',
    outputFormat: '.jar',
  },
];

export class ExeBuilder {
  public static async runBuild(
    targetType: BuildTargetType,
    projectDir: string,
    onProgress: (progress: BuildProgress) => void
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    if (!window.electronAPI) {
      return {
        success: false,
        error: 'Native build execution requires running inside Vibe-Studio desktop app.',
      };
    }

    const unsubscribe = window.electronAPI.onBuildProgress(onProgress);

    try {
      if (targetType === 'zip') {
        const res = await window.electronAPI.exportZip(projectDir);
        return res;
      }
      const res = await window.electronAPI.runBuildTarget(targetType, projectDir);
      return res;
    } finally {
      unsubscribe();
    }
  }
}
