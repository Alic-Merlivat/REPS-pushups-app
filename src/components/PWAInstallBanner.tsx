import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle, Share, PlusSquare } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed as standalone PWA or user dismissed this session
  if (isInstalled || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      await install();
      setIsInstalling(false);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General instructions modal if browser doesn't support automatic prompt
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-zinc-900 border border-emerald-500/40 rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center shrink-0 font-black shadow-md shadow-emerald-500/20">
            <Smartphone className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5 truncate">
              Install Reps App
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] uppercase font-bold">
                Mobile
              </span>
            </h4>
            <p className="text-[11px] text-zinc-400 truncate">
              Run fullscreen &amp; keep phone awake during pushups
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guide Modal for iOS Safari / Manual Chrome instructions */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-white text-center">
              Add to Mobile Home Screen
            </h3>

            {isIOS ? (
              <div className="mt-4 space-y-3 text-xs text-zinc-300">
                <p className="text-zinc-400 text-center">
                  To install on iPhone or iPad Safari:
                </p>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                      <Share className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span>1. Tap the <strong>Share</strong> button at bottom of Safari.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500 text-zinc-950 flex items-center justify-center shrink-0 font-bold">
                      ✓
                    </div>
                    <span>3. Tap <strong>Add</strong> in the top right.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-xs text-zinc-300">
                <p className="text-zinc-400 text-center">
                  In Chrome on Android:
                </p>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
                  <p>1. Tap the <strong>three dots (⋮)</strong> menu in the top right corner.</p>
                  <p>2. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
                  <p>3. Tap <strong>Install</strong> to add the Reps icon to your home screen.</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
