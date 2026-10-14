import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { X, Copy, Check, Share2, Sparkles, QrCode } from 'lucide-react';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const { themeConfig } = useTheme();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen || !profile) return null;

  const inviteCode = profile.inviteCode || 'HERO';
  const inviteUrl = `${window.location.origin}?invite=${inviteCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Reps, A numbers game.',
          text: `Hey! I'm challenging you to do pushups with me on Reps, A numbers game. Add my invite code: ${inviteCode}`,
          url: inviteUrl,
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`${themeConfig.cardBg} border ${themeConfig.cardBorder} rounded-3xl p-6 max-w-sm w-full ${themeConfig.cardShadow} relative`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full ${themeConfig.textMuted} hover:${themeConfig.textColor} hover:${themeConfig.subCardBg} transition-colors cursor-pointer`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className={`w-12 h-12 rounded-2xl ${themeConfig.trophyBox} flex items-center justify-center mx-auto mb-3 shadow-sm`}>
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className={`text-xl font-black ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'}`}>Share Squad Link</h3>
          <p className={`text-xs ${themeConfig.textMuted} mt-1`}>
            Share with friends to automatically connect squads in 1 tap!
          </p>
        </div>

        {/* Invite Code Box */}
        <div className={`${themeConfig.subCardBg} border ${themeConfig.subCardBorder} rounded-2xl p-4 text-center mb-4`}>
          <p className={`text-[11px] font-semibold ${themeConfig.textMuted} uppercase tracking-wider mb-1`}>
            Your Invite Code
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className={`font-mono text-2xl font-black tracking-widest ${themeConfig.statTodayColor}`}>
              {inviteCode}
            </span>
            <button
              onClick={handleCopyCode}
              title="Copy code"
              className={`p-1.5 rounded-lg ${themeConfig.cardBg} hover:opacity-80 ${themeConfig.textColor} border ${themeConfig.cardBorder} transition-colors cursor-pointer`}
            >
              {copiedCode ? <Check className={`w-4 h-4 ${themeConfig.statTodayColor}`} /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleNativeShare}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs ${themeConfig.startButtonGradient} ${themeConfig.startButtonText} flex items-center justify-center gap-2 ${themeConfig.startButtonShadow} transition-all cursor-pointer`}
          >
            <Share2 className="w-4 h-4" />
            Share via WhatsApp / Messages / Social
          </button>

          <button
            onClick={handleCopyLink}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs ${themeConfig.subCardBg} hover:${themeConfig.cardBg} ${themeConfig.textColor} border ${themeConfig.subCardBorder} flex items-center justify-center gap-2 transition-colors cursor-pointer`}
          >
            {copiedLink ? <Check className={`w-3.5 h-3.5 ${themeConfig.statTodayColor}`} /> : <Copy className={`w-3.5 h-3.5 ${themeConfig.textMuted}`} />}
            {copiedLink ? 'Invite Link Copied!' : 'Copy Direct Link'}
          </button>
        </div>

        <p className={`text-[11px] ${themeConfig.textMuted} text-center mt-4`}>
          When friends sign up with your code, they're automatically added to your friend squad!
        </p>
      </div>
    </div>
  );
};
