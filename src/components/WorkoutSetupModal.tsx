import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { PhonePlacementIllustration } from './PhonePlacementIllustration';
import { Play } from 'lucide-react';

interface WorkoutSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
}

export const WorkoutSetupModal: React.FC<WorkoutSetupModalProps> = ({
  isOpen,
  onClose,
  onStart,
}) => {
  const { themeConfig } = useTheme();
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Phone placement setup"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className={`${themeConfig.cardBg} border ${themeConfig.cardBorder} rounded-3xl max-w-md w-full ${themeConfig.cardShadow} overflow-hidden my-auto flex flex-col`}>
        {/* Full-width enlarged setup image with zero surrounding box/padding */}
        <div className="w-full overflow-hidden bg-black">
          <PhonePlacementIllustration
            className="w-full"
            imgClassName="w-full h-auto object-cover select-none block"
          />
        </div>

        {/* Action Footer (Cancel on left, Start Push-ups on right) */}
        <div className={`p-4 ${themeConfig.subCardBg} border-t ${themeConfig.subCardBorder} flex items-center justify-between gap-3`}>
          <button
            onClick={onClose}
            className={`py-3 px-5 rounded-xl text-sm font-bold ${themeConfig.textMuted} hover:${themeConfig.textColor} transition-colors cursor-pointer`}
          >
            Cancel
          </button>

          <button
            onClick={onStart}
            className={`flex-1 py-3 px-5 rounded-xl font-black text-sm ${themeConfig.startButtonGradient} ${themeConfig.startButtonText} flex items-center justify-center gap-2 ${themeConfig.startButtonShadow} active:scale-[0.98] transition-all cursor-pointer`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Ready • Start Push-ups</span>
          </button>
        </div>
      </div>
    </div>
  );
};
