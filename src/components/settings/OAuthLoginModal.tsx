import React, { useState } from 'react';
import { ProviderKeys } from '../../types/ai';
import { 
  X, 
  LogIn, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  Server, 
  Settings
} from 'lucide-react';

interface OAuthLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  keys: ProviderKeys;
  onUpdateKeys: (keys: ProviderKeys) => void;
}

export const OAuthLoginModal: React.FC<OAuthLoginModalProps> = ({
  isOpen,
  onClose,
  keys,
  onUpdateKeys,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [customClientId, setCustomClientId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartGoogleOAuth = async () => {
    setIsLoggingIn(true);
    setError(null);

    try {
      if (!window.electronAPI) {
        throw new Error('Google OAuth PKCE loopback requires running inside Vibe-Studio desktop app.');
      }

      const tokens = await window.electronAPI.oauth.startGooglePKCE(customClientId || undefined);

      onUpdateKeys({
        ...keys,
        googleOAuthToken: tokens.access_token,
        googleOAuthRefreshToken: tokens.refresh_token,
        googleUserEmail: tokens.user_email || 'Authenticated User',
      });
    } catch (err: any) {
      setError(err.message || 'OAuth authentication failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnect = () => {
    onUpdateKeys({
      ...keys,
      googleOAuthToken: undefined,
      googleOAuthRefreshToken: undefined,
      googleUserEmail: undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">GOOGLE CLOUD & VERTEX AI OAUTH</h2>
              <p className="text-xs text-gray-400">Zero-backend local loopback authentication (PKCE)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Box */}
          {keys.googleOAuthToken ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-neon-green" />
                  <div>
                    <div className="text-xs font-bold text-white">Signed in with Google</div>
                    <div className="text-[11px] text-gray-300 font-mono">{keys.googleUserEmail}</div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-pink/10 hover:bg-neon-pink/20 text-neon-pink border border-neon-pink/30 text-xs font-medium transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                Your Vertex AI quotas and Google Cloud project models can now be used directly inside Vibe-Studio without API rate limits.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/70 text-xs space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-neon-cyan" />
                  Local PKCE Loopback Server
                </div>
                <p className="text-gray-300 leading-relaxed text-[11px]">
                  When you sign in, Vibe-Studio temporarily binds a local listener on <code className="text-neon-cyan font-mono">http://127.0.0.1:8989/oauth/callback</code> to receive the cryptographic authorization code directly into your local OS keychain.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-neon-pink/10 border border-neon-pink/30 text-xs text-neon-pink">
                  {error}
                </div>
              )}

              {/* Advanced Custom Client ID */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  {showAdvanced ? 'Hide Custom Client ID' : 'Custom GCP OAuth Client ID (Optional)'}
                </button>

                {showAdvanced && (
                  <div className="mt-2 p-3 rounded-xl bg-background/80 border border-border space-y-1.5">
                    <label className="text-[11px] text-gray-300 font-medium">GCP OAuth 2.0 Client ID</label>
                    <input
                      type="text"
                      value={customClientId}
                      onChange={(e) => setCustomClientId(e.target.value)}
                      placeholder="YOUR_CLIENT_ID.apps.googleusercontent.com"
                      className="w-full bg-card text-xs text-white rounded-lg border border-border px-3 py-1.5 focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Login Button */}
              <button
                onClick={handleStartGoogleOAuth}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-glow-purple cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating via Local Loopback (8989)...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign in with Google Account
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-border bg-card/80">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-gray-300 text-xs font-medium transition-all border border-border"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
