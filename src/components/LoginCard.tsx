import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Camera, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface LoginCardProps {
  onStartCameraDemo?: () => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({ onStartCameraDemo }) => {
  const { signIn } = useAuth();
  const [preferredName, setPreferredName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await signIn(preferredName.trim() || undefined);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in popup was closed before completing. Please try again.');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Pop-up was blocked by your browser. Please allow popups for this site.');
      } else {
        setErrorMsg(err?.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Visual Title & Description */}
      <div className="text-center mb-6">
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Reps<span className="text-emerald-400">,</span>
        </h2>
        <p className="text-base font-bold text-emerald-400/90 tracking-wide mt-1">
          A numbers game.
        </p>
        <p className="text-sm font-semibold text-zinc-200 mt-3 max-w-xs mx-auto">
          Reps will determine the ultimate push-up god 🔥.
        </p>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
          AI camera tracking, live scoreboards, and competing with friends.
        </p>
      </div>

      {/* Login Card Form */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <form onSubmit={handleGoogleSignIn} className="space-y-4">
          <div>
            <label htmlFor="athlete-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Athlete Name <span className="text-zinc-600 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="athlete-name"
              type="text"
              placeholder="e.g. Alex The Beast or John D."
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              maxLength={40}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Leave blank to automatically use your Google account display name.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-zinc-950 flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting with Google...
              </>
            ) : (
              <>
                {/* Google "G" SVG */}
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Gmail / Google
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>

          {onStartCameraDemo && (
            <button
              type="button"
              onClick={onStartCameraDemo}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-zinc-800 hover:bg-zinc-700/80 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              Try AI Camera Pushup Counter as Guest
            </button>
          )}
        </form>

        <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Your email is private. Only your name and pushup counts appear on the scoreboard.</span>
        </div>
      </div>
    </div>
  );
};
