import { safeStorage, app } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class SecureStorageManager {
  private storagePath: string;
  private memoryCache: Record<string, string> = {};
  private fallbackKey: Buffer;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.storagePath = path.join(userDataPath, 'vibe_keys.enc');
    // Fallback key derived from machine identifier / app data if safeStorage is unavailable
    this.fallbackKey = crypto.scryptSync(app.getPath('home') + '-vibe-studio-secret', 'vibe-salt', 32);
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(raw) as Record<string, string>;
        
        for (const [key, encryptedHex] of Object.entries(parsed)) {
          try {
            const buffer = Buffer.from(encryptedHex, 'hex');
            if (safeStorage.isEncryptionAvailable()) {
              this.memoryCache[key] = safeStorage.decryptString(buffer);
            } else {
              this.memoryCache[key] = this.decryptFallback(buffer);
            }
          } catch (err) {
            console.warn(`Failed to decrypt key "${key}":`, err);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load secure storage:', e);
    }
  }

  private save(): void {
    try {
      const encryptedData: Record<string, string> = {};
      for (const [key, val] of Object.entries(this.memoryCache)) {
        if (safeStorage.isEncryptionAvailable()) {
          const encryptedBuffer = safeStorage.encryptString(val);
          encryptedData[key] = encryptedBuffer.toString('hex');
        } else {
          const encryptedBuffer = this.encryptFallback(val);
          encryptedData[key] = encryptedBuffer.toString('hex');
        }
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(encryptedData, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save secure storage:', e);
    }
  }

  private encryptFallback(text: string): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.fallbackKey, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  private decryptFallback(buffer: Buffer): string {
    const iv = buffer.subarray(0, 16);
    const encryptedText = buffer.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.fallbackKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }

  public getItem(key: string): string | null {
    return this.memoryCache[key] || null;
  }

  public setItem(key: string, value: string): void {
    this.memoryCache[key] = value;
    this.save();
  }

  public removeItem(key: string): void {
    delete this.memoryCache[key];
    this.save();
  }

  public getAll(): Record<string, string> {
    return { ...this.memoryCache };
  }

  public isUsingOsKeychain(): boolean {
    return safeStorage.isEncryptionAvailable();
  }
}
