export class ZipBuilder {
  public static async exportProjectToZip(
    projectDir: string,
    customZipPath?: string
  ): Promise<{ success: boolean; outputPath: string; error?: string }> {
    if (!window.electronAPI) {
      return {
        success: false,
        outputPath: '',
        error: 'Desktop Electron environment required for ZIP export.',
      };
    }
    return await window.electronAPI.exportZip(projectDir, customZipPath);
  }
}
