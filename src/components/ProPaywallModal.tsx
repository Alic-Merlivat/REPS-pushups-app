import React, { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Sparkles,
  Check,
  ShieldCheck,
  Zap,
  TrendingUp,
  Flame,
  Award,
} from 'lucide-react';

interface ProPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLegal: (type: 'privacy' | 'terms') => void;
}

export const ProPaywallModal: React.FC<ProPaywallModalProps> = ({
  isOpen,
  onClose,
  onOpenLegal,
}) => {
  const { startFreeTrial, restorePurchases, isPro, isTrial, trialDaysRemaining } = useSubscription();
  const { themeConfig } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      await startFreeTrial(selectedPlan);
      setToastMessage('🎉 Welcome to Reps PRO! Your 5-day free trial is now active.');
      setTimeout(() => {
        setToastMessage(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setToastMessage(err.message || 'Error activating trial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    const res = await restorePurchases();
    setToastMessage(res.message);
    setIsLoading(false);
    if (res.success) {
      setTimeout(() => onClose(), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Glow Background Effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Badges */}
        <div className="p-6 pb-2 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>5-Day Free Trial Included</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Level Up with <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 bg-clip-text text-transparent">Reps PRO</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            Unlimited AI pushup vision tracking, live animated backgrounds, and elite squad rivalry.
          </p>
        </div>

        {/* Perks List */}
        <div className="px-6 py-3 space-y-2.5 relative z-10">
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">All Moving Animated Styles</p>
              <p className="text-[10px] text-zinc-400">Aurora, Inferno, Holopop & all future styles</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">Deep Progress Curves</p>
              <p className="text-[10px] text-zinc-400">90-day & 1-year cumulative charts against squad</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">Unlimited Spanks & PRO Badge</p>
              <p className="text-[10px] text-zinc-400">Golden PRO badge on live leaderboards</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">100% Ad-Free Experience</p>
              <p className="text-[10px] text-zinc-400">Clean, uninterrupted workout flow</p>
            </div>
          </div>
        </div>

        {/* Pricing Plan Selector */}
        <div className="px-6 py-2 grid grid-cols-2 gap-2.5 relative z-10">
          {/* Annual Plan (Featured) */}
          <button
            onClick={() => setSelectedPlan('annual')}
            className={`p-3 rounded-2xl border text-left transition-all relative cursor-pointer ${
              selectedPlan === 'annual'
                ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/40'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[9px] font-black uppercase tracking-wider">
              SAVE 55%
            </div>
            <p className="text-[11px] font-bold text-amber-300">ANNUAL</p>
            <p className="text-lg font-black text-white leading-tight mt-0.5">15,99 €<span className="text-[11px] font-normal text-zinc-400">/yr</span></p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Just 1,33 € / month</p>
          </button>

          {/* Monthly Plan */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedPlan === 'monthly'
                ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/40'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <p className="text-[11px] font-bold text-zinc-300">MONTHLY</p>
            <p className="text-lg font-black text-white leading-tight mt-0.5">2,99 €<span className="text-[11px] font-normal text-zinc-400">/mo</span></p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Billed monthly</p>
          </button>
        </div>

        {/* Action Button & Disclaimer */}
        <div className="p-6 pt-3 space-y-3 relative z-10">
          {toastMessage && (
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs text-center font-bold animate-in fade-in">
              {toastMessage}
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-zinc-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 fill-zinc-950" />
            <span>{isLoading ? 'Activating...' : 'Start 5-Day Free Trial (15,99 € / yr)'}</span>
          </button>

          <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
            Free for 5 days, then {selectedPlan === 'annual' ? '15,99 €/year' : '2,99 €/month'}. Cancel anytime in Google Play or Apple App Store settings.
          </p>

          {/* App Store Compliance Links */}
          <div className="flex items-center justify-center gap-4 pt-1 text-[10px] text-zinc-500">
            <button
              onClick={handleRestore}
              className="hover:text-zinc-300 underline cursor-pointer"
            >
              Restore Purchases
            </button>
            <span>•</span>
            <button
              onClick={() => onOpenLegal('terms')}
              className="hover:text-zinc-300 underline cursor-pointer"
            >
              Terms of Use
            </button>
            <span>•</span>
            <button
              onClick={() => onOpenLegal('privacy')}
              className="hover:text-zinc-300 underline cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
