import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Flame, User as UserIcon, Maximize, Minimize, Sparkles } from 'lucide-react';
import { useFullscreen } from '../hooks/useFullscreen';

interface HeaderProps {
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { user, profile } = useAuth();
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();
  const { themeConfig } = useTheme();
  const { isPro, isTrial, trialDaysRemaining, openPaywall } = useSubscription();

  return (
    <header className={`sticky top-0 z-40 ${themeConfig.headerBg} border-b ${themeConfig.headerBorder} px-4 py-3 transition-colors duration-300`}>
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${themeConfig.headerLogoGradient} flex items-center justify-center shadow-lg`}>
            <Flame className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className={`text-lg font-black tracking-tight flex items-center gap-1.5 leading-none ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'}`}>
              REPS<span className="text-emerald-400">.</span>
            </h1>
            <p className={`text-[11px] font-semibold tracking-wide mt-0.5 ${themeConfig.isLightMode ? 'text-pink-600' : 'text-emerald-400/90'}`}>
              A numbers game.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSupported && (
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (hide browser bar)'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${themeConfig.cardBg} ${themeConfig.cardBorder} ${themeConfig.textMuted} hover:text-white`}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-emerald-400" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          )}

          {user && (
            <>
              {/* PRO Status Badge or Upgrade Button */}
              {isPro ? (
                <div
                  onClick={openPaywall}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-black cursor-pointer shadow-xs active:scale-95"
                  title={isTrial ? `PRO Trial: ${trialDaysRemaining}d remaining` : 'Reps PRO Member'}
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>PRO</span>
                </div>
              ) : (
                <button
                  onClick={openPaywall}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 text-[10px] font-black hover:opacity-95 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
                  title="Unlock Reps PRO (5-Day Free Trial)"
                >
                  <Sparkles className="w-3 h-3 fill-zinc-950" />
                  <span>PRO</span>
                </button>
              )}

              {/* User Profile Picture Button: Opens the App Settings */}
              <button
                onClick={onOpenSettings}
                title="Settings & Profile"
                aria-label="Open App Settings"
                className="relative rounded-full p-0.5 hover:ring-2 hover:ring-emerald-400/70 transition-all cursor-pointer active:scale-95 group focus:outline-none"
              >
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName || 'User Profile'}
                    className={`w-8 h-8 rounded-full object-cover ring-2 ${themeConfig.avatarRing} shadow-sm group-hover:brightness-110 transition-all`}
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${themeConfig.avatarPlaceholderBg} ${themeConfig.avatarPlaceholderText} ring-2 ${themeConfig.avatarRing} shadow-sm group-hover:brightness-110 transition-all`}>
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                {/* Subtle indicator dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
