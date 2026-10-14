import React, { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { Sparkles, X, ExternalLink } from 'lucide-react';

export const AdBanner: React.FC = () => {
  const { isPro, openPaywall } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  // If user is PRO subscriber or dismissed for session, don't show ads
  if (isPro || isDismissed) return null;

  return (
    <div className="w-full max-w-lg mx-auto mb-2 px-2 animate-in fade-in">
      <div className="relative rounded-2xl bg-gradient-to-r from-zinc-900/90 via-zinc-900/95 to-zinc-950/90 border border-zinc-800/90 p-2.5 px-3 flex items-center justify-between gap-3 shadow-lg backdrop-blur-md">
        {/* Ad Tag & Content */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[9px] font-black tracking-wider text-zinc-400 uppercase shrink-0">
            Ad
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-zinc-200 truncate">
              ⚡ HydroElite • Clean Electrolytes for Pushup Recovery
            </p>
            <p className="text-[10px] text-zinc-400 truncate">
              Fast hydration. 0g sugar.
            </p>
          </div>
        </div>

        {/* Upgrade Pill Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={openPaywall}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-black transition-all cursor-pointer shadow-xs active:scale-95"
            title="Upgrade to Reps PRO to remove ads"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Remove Ads</span>
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg cursor-pointer"
            title="Dismiss ad for this session"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
