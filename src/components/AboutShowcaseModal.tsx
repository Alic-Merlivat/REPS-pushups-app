import React from 'react';
import {
  X,
  Code2,
  Cpu,
  Smartphone,
  Shield,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface AboutShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutShowcaseModal: React.FC<AboutShowcaseModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden relative text-zinc-200">
        {/* Glow Ambient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-400 text-zinc-950 flex items-center justify-center font-black shadow-lg">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base tracking-tight">Reps — A numbers game</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                  Engineering Case Study
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Full-Stack AI Computer Vision & Squad Fitness Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs relative z-10">
          {/* Overview */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 leading-relaxed text-zinc-300">
            <p>
              <strong>Reps</strong> is a production-ready fitness application designed to turn any phone or laptop camera into an intelligent, privacy-first pushup coach. Engineered with 100% on-device computer vision, real-time multiplayer synchronization, and an in-app monetization engine ready for Google Play and the Apple App Store.
            </p>
          </div>

          {/* Technical Pillars */}
          <div className="space-y-2.5">
            <h4 className="font-extrabold text-white uppercase text-[11px] tracking-wider text-zinc-400">
              Technical Highlights & Architecture
            </h4>

            <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">On-Device AI Computer Vision</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Real-time Google MediaPipe Pose landmark estimation running at 60 FPS in-browser. Zero video transmitted to servers. Uses 3D joint angle trigonometry ($\le 90^\circ$ inflection and $\ge 160^\circ$ lockout) with debouncing hysteresis.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">Real-Time Cloud Synchronization</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Firebase Cloud Firestore provides live line sync across squad members, real-time wake-up "spank" alerts, and progressive cumulative chart curves across 30d, 90d, and 1y windows.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">Mobile PWA & App Store Readiness</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Engineered with touch/pointer velocity swipe-to-delete gestures, offline service workers, web audio sound synthesis, and an Apple/Google compliant subscription paywall ($15.99/year with 5-day trial).
                </p>
              </div>
            </div>
          </div>

          {/* Tech Stack Pills */}
          <div>
            <h4 className="font-extrabold text-white uppercase text-[11px] tracking-wider text-zinc-400 mb-2">
              Technologies Used
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {[
                'React 19',
                'TypeScript 5',
                'Tailwind CSS v4',
                'Google MediaPipe',
                'Firebase Firestore',
                'Firebase Auth',
                'Recharts',
                'Web Audio API',
                'Vite PWA',
                'Google Play TWA',
              ].map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 flex items-center justify-between text-xs bg-zinc-950/90 relative z-10">
          <span className="text-[11px] text-zinc-400">
            Engineered by Nicolas Merlivat
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Explore App
          </button>
        </div>
      </div>
    </div>
  );
};
