import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  const isPrivacy = type === 'privacy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl text-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              {isPrivacy ? <Shield className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
              </h3>
              <p className="text-[11px] text-zinc-400">Reps, A numbers game</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-zinc-300">
          {isPrivacy ? (
            <>
              <div>
                <h4 className="font-bold text-white text-sm mb-1">1. Camera Data & On-Device Processing</h4>
                <p>
                  Reps utilizes computer vision (MediaPipe) to track pushups in real time. All camera frames are processed <strong>100% on-device</strong> within your browser or mobile runtime. No video, raw frames, or camera streams are ever transmitted, saved, or uploaded to our servers.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">2. Information We Collect</h4>
                <p>
                  When you sign in with your Google account, we store your display name, email, profile photo, and pushup workout counters (e.g., daily reps, total reps) securely on Google Firebase to power the scoreboard, friends squad, and historical progress graphs.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">3. In-App Purchases & Subscriptions</h4>
                <p>
                  Subscriptions are processed through the Google Play Store or Apple App Store. We do not store or process payment card details.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">4. Data Deletion</h4>
                <p>
                  You may request complete account and workout data deletion at any time by contacting support or disconnecting your account in the app.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="font-bold text-white text-sm mb-1">1. Acceptance of Terms</h4>
                <p>
                  By accessing Reps or purchasing a subscription, you agree to these Terms of Service. Reps is a fitness companion intended to help track pushups.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">2. Health & Fitness Disclaimer</h4>
                <p>
                  Always consult with a qualified physician or healthcare provider before undertaking any physical exercise program. Reps does not provide medical advice.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">3. Subscriptions & Free Trial</h4>
                <p>
                  Reps PRO is billed annually at $15.99/year or monthly at $2.99/month. If a 5-day free trial is offered, you will not be charged if cancelled at least 24 hours prior to the trial period ending. Subscriptions renew automatically unless cancelled in your Google Play or Apple App Store account settings.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">4. Refund Policy</h4>
                <p>
                  Refund requests for in-app purchases are handled directly according to Apple App Store or Google Play Store policies.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
