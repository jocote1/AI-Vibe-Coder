import http from 'http';
import url from 'url';
import crypto from 'crypto';
import { shell } from 'electron';

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
  received_at: number;
  user_email?: string;
}

export class OAuthHandler {
  private server: http.Server | null = null;
  private port = 8989;
  private currentVerifier: string | null = null;
  private currentState: string | null = null;
  private pendingResolve: ((tokens: OAuthTokens) => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;

  // Standard Google OAuth 2.0 Client ID for desktop/installed applications
  // Users can also supply their own GCP Client ID / Project ID in settings
  private defaultClientId = '742398717839-44g9bvi7e2o495f5g1s90i3l79bovptv.apps.googleusercontent.com';

  private base64UrlEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private generateCodeVerifier(): string {
    return this.base64UrlEncode(crypto.randomBytes(32));
  }

  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return this.base64UrlEncode(hash);
  }

  public async startGooglePKCEFlow(customClientId?: string): Promise<OAuthTokens> {
    const clientId = customClientId || this.defaultClientId;
    this.currentVerifier = this.generateCodeVerifier();
    this.currentState = crypto.randomBytes(16).toString('hex');
    const challenge = this.generateCodeChallenge(this.currentVerifier);

    const redirectUri = `http://127.0.0.1:${this.port}/oauth/callback`;
    const scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/generative-language',
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&code_challenge=${encodeURIComponent(challenge)}` +
      `&code_challenge_method=S256` +
      `&state=${encodeURIComponent(this.currentState)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    await this.startLocalServer(clientId);
    await shell.openExternal(authUrl);

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      // Timeout after 3 minutes if user cancels
      setTimeout(() => {
        if (this.server) {
          this.stopLocalServer();
          reject(new Error('OAuth authentication timed out after 3 minutes.'));
        }
      }, 180000);
    });
  }

  private startLocalServer(clientId: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.stopLocalServer();
      }

      this.server = http.createServer(async (req, res) => {
        try {
          const reqUrl = url.parse(req.url || '', true);
          if (reqUrl.pathname === '/oauth/callback') {
            const { code, state, error } = reqUrl.query;

            if (error) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(this.renderHtmlResponse(false, `Authentication Error: ${error}`));
              this.pendingReject?.(new Error(`OAuth Error: ${error}`));
              this.stopLocalServer();
              return;
            }

            if (state !== this.currentState || !code || typeof code !== 'string') {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(this.renderHtmlResponse(false, 'Invalid state parameter or missing authorization code.'));
              this.pendingReject?.(new Error('State parameter mismatch or missing authorization code.'));
              this.stopLocalServer();
              return;
            }

            // Exchange authorization code for tokens
            const tokens = await this.exchangeCodeForTokens(code, clientId);
            
            // Try fetching user email from id_token or userinfo
            if (tokens.access_token) {
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: { Authorization: `Bearer ${tokens.access_token}` },
                });
                if (userRes.ok) {
                  const userInfo = await userRes.json() as { email?: string };
                  tokens.user_email = userInfo.email;
                }
              } catch (e) {
                console.warn('Could not retrieve user info:', e);
              }
            }

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(this.renderHtmlResponse(true, `Successfully authenticated as ${tokens.user_email || 'Google User'}! You can close this window.`));

            this.pendingResolve?.(tokens);
            this.stopLocalServer();
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(this.renderHtmlResponse(false, `Internal Server Error: ${err.message}`));
          this.pendingReject?.(err);
          this.stopLocalServer();
        }
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`OAuth PKCE Loopback Server listening on http://127.0.0.1:${this.port}`);
        resolve();
      });

      this.server.on('error', (err) => {
        console.error('OAuth Loopback Server error:', err);
        this.pendingReject?.(err);
      });
    });
  }

  private async exchangeCodeForTokens(code: string, clientId: string): Promise<OAuthTokens> {
    const redirectUri = `http://127.0.0.1:${this.port}/oauth/callback`;
    const tokenUrl = 'https://oauth2.googleapis.com/token';

    const params = new URLSearchParams({
      client_id: clientId,
      code_verifier: this.currentVerifier || '',
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
      id_token: data.id_token,
      received_at: Date.now(),
    };
  }

  public async refreshAccessToken(refreshToken: string, clientId?: string): Promise<OAuthTokens> {
    const cId = clientId || this.defaultClientId;
    const tokenUrl = 'https://oauth2.googleapis.com/token';

    const params = new URLSearchParams({
      client_id: cId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    return {
      access_token: data.access_token,
      refresh_token: refreshToken,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
      id_token: data.id_token,
      received_at: Date.now(),
    };
  }

  public stopLocalServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  private renderHtmlResponse(success: boolean, message: string): string {
    const bg = '#090a0f';
    const cardBg = '#10131c';
    const color = success ? '#22d3ee' : '#f43f5e';
    const title = success ? 'Authentication Successful!' : 'Authentication Failed';
    const icon = success ? '✨ 🚀' : '⚠️';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vibe-Studio Authentication</title>
        <meta charset="utf-8" />
        <style>
          body {
            background-color: ${bg};
            color: #f3f4f6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background-color: ${cardBg};
            border: 1px solid #1e2436;
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            max-width: 480px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
          }
          h1 {
            color: ${color};
            font-size: 24px;
            margin-top: 10px;
          }
          p {
            color: #94a3b8;
            font-size: 15px;
            line-height: 1.5;
          }
          .badge {
            display: inline-block;
            background: #1e2333;
            color: #a855f7;
            padding: 6px 14px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 12px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">VIBE-STUDIO AUTH</div>
          <div style="font-size: 40px;">${icon}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <p style="font-size: 12px; color: #64748b; margin-top: 20px;">You can now switch back to Vibe-Studio desktop app.</p>
        </div>
      </body>
      </html>
    `;
  }
}
