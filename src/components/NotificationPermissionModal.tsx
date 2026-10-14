import React, { useState } from 'react';
import { BellRing, Bell, Calendar, Flame, X, Check, Loader2 } from 'lucide-react';
import { requestNotificationPermission } from '../utils/notifications';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionUpdated?: (granted: boolean) => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionUpdated,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isOpen) return null;

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      localStorage.setItem('reps_notifications_prompt_seen', 'true');
      if (onPermissionUpdated) onPermissionUpdated(granted);
      onClose();
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      onClose();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('reps_notifications_prompt_seen', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-lime-400/20 to-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-lg shadow-emerald-500/10">
          <BellRing className="w-8 h-8 animate-bounce duration-1000" />
        </div>

        {/* Title & Description */}
        <div className="text-center mb-5">
          <h3 className="text-xl font-black text-white tracking-tight">
            Enable Notifications
          </h3>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Stay accountable, never skip a session, and stay connected with your workout squad.
          </p>
        </div>

        {/* Feature List */}
        <div className="space-y-2.5 mb-6 text-left">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Daily Goal Reminders</p>
              <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                Every 2nd day at random times between 9:30 AM & 7:00 PM to keep your streak alive.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 mt-0.5">
              <span className="text-xs">👋</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Squad Spank Alerts</p>
              <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                Instant warnings when squad members spank you for skipping your pushups!
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleEnable}
            disabled={isRequesting}
            className="w-full py-3 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-zinc-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isRequesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4 stroke-[3]" />
            )}
            <span>Enable Notifications</span>
          </button>

          <button
            onClick={handleDismiss}
            disabled={isRequesting}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
