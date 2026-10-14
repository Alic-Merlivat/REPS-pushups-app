import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { BUILD_VERSION } from '../version';
import { PhonePlacementIllustration } from './PhonePlacementIllustration';
import { playButtSlapSound } from '../utils/soundEffects';
import { requestNotificationPermission, notifyUserSpanked } from '../utils/notifications';
import {
  X,
  ChevronRight,
  ChevronLeft,
  User,
  Bell,
  Activity,
  Smartphone,
  Shield,
  FileText,
  LogOut,
  Sparkles,
  Zap,
  TrendingUp,
  Flame,
  Check,
  AlertCircle,
  MapPin,
  Navigation,
  Loader2,
  RefreshCw,
  ExternalLink,
  Info,
  Code2,
  Cpu,
} from 'lucide-react';

export type SettingsView =
  | 'menu'
  | 'pro'
  | 'account'
  | 'notifications'
  | 'google-health'
  | 'how-to'
  | 'privacy'
  | 'terms'
  | 'engineering';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: SettingsView;
  onStartCameraCheck?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialView = 'menu',
  onStartCameraCheck,
}) => {
  const { user, profile, signOut, updateAccountDetails, updateNotifications, updateHealthConnection } = useAuth();
  const { themeConfig } = useTheme();
  const { isPro, isTrial, trialDaysRemaining, startFreeTrial, restorePurchases } = useSubscription();

  const [currentView, setCurrentView] = useState<SettingsView>(initialView);

  // Account form state
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [age, setAge] = useState(profile?.age !== undefined ? String(profile.age) : '');
  const [city, setCity] = useState(profile?.city || '');
  const [height, setHeight] = useState(profile?.height || '');
  const [weight, setWeight] = useState(profile?.weight || '');
  const [isLocatingCity, setIsLocatingCity] = useState(false);
  const [accountSaveStatus, setAccountSaveStatus] = useState<string | null>(null);
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Notifications state
  const [dailyReminders, setDailyReminders] = useState<boolean>(
    profile?.notificationSettings?.dailyReminders ?? true
  );
  const [spankNotifications, setSpankNotifications] = useState<boolean>(
    profile?.notificationSettings?.spankNotifications ?? true
  );
  const [reminderTime, setReminderTime] = useState<string>(
    profile?.notificationSettings?.reminderTime || '09:30'
  );
  const [notifSaveStatus, setNotifSaveStatus] = useState<string | null>(null);

  // Google Health state
  const [healthConnected, setHealthConnected] = useState<boolean>(
    Boolean(profile?.googleHealthConnected)
  );
  const [lastHealthSync, setLastHealthSync] = useState<string>(
    profile?.googleHealthLastSync || ''
  );
  const [isSyncingHealth, setIsSyncingHealth] = useState(false);
  const [healthSyncFeedback, setHealthSyncFeedback] = useState<string | null>(null);

  // Pro Subscription promotional state
  const [proActionLoading, setProActionLoading] = useState(false);
  const [proToast, setProToast] = useState<string | null>(null);

  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Keep state synced when profile changes or modal opens
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setAge(profile.age !== undefined ? String(profile.age) : '');
      setCity(profile.city || '');
      setHeight(profile.height || '');
      setWeight(profile.weight || '');
      if (profile.notificationSettings) {
        setDailyReminders(profile.notificationSettings.dailyReminders ?? true);
        setSpankNotifications(profile.notificationSettings.spankNotifications ?? true);
        setReminderTime(profile.notificationSettings.reminderTime || '09:30');
      }
      setHealthConnected(Boolean(profile.googleHealthConnected));
      setLastHealthSync(profile.googleHealthLastSync || '');
    }
  }, [profile, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentView(initialView);
      setShowLogoutConfirm(false);
      setAccountSaveStatus(null);
      setNotifSaveStatus(null);
      setHealthSyncFeedback(null);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  // Account Save Handler
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAccount(true);
    setAccountSaveStatus(null);
    try {
      const parsedAge = age.trim() !== '' && !isNaN(Number(age)) ? Number(age) : '';
      await updateAccountDetails({
        displayName: displayName.trim() || 'Athlete',
        age: parsedAge,
        city: city.trim(),
        height: height.trim(),
        weight: weight.trim(),
      });
      setAccountSaveStatus('✓ Account details saved successfully!');
      setTimeout(() => setAccountSaveStatus(null), 3500);
    } catch (err: any) {
      let msg = err?.message || 'Please try again';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {
        // Not JSON
      }
      setAccountSaveStatus('Error saving details: ' + msg);
    } finally {
      setIsSavingAccount(false);
    }
  };

  // GPS Locate City
  const handleGpsDetectCity = () => {
    if (!('geolocation' in navigator)) {
      setAccountSaveStatus('Geolocation not supported on this browser.');
      return;
    }
    setIsLocatingCity(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const detected =
              addr.city ||
              addr.town ||
              addr.municipality ||
              addr.village ||
              addr.county ||
              addr.state ||
              '';
            if (detected) {
              setCity(detected);
            }
          }
        } catch {
          // ignore error
        } finally {
          setIsLocatingCity(false);
        }
      },
      () => {
        setIsLocatingCity(false);
      }
    );
  };

  // Notifications Save Handler
  const handleSaveNotifications = async () => {
    try {
      await updateNotifications({
        dailyReminders,
        spankNotifications,
        reminderTime,
      });
      setNotifSaveStatus('✓ Notification preferences saved!');
      setTimeout(() => setNotifSaveStatus(null), 3000);
    } catch (err: any) {
      setNotifSaveStatus('Error saving: ' + (err.message || 'Please try again'));
    }
  };

  const handleTestAlert = async () => {
    playButtSlapSound();
    await requestNotificationPermission();
    notifyUserSpanked('Alex (Squad)');
  };

  // Google Health Handlers
  const handleToggleGoogleHealth = async () => {
    const newState = !healthConnected;
    setHealthConnected(newState);
    try {
      await updateHealthConnection(newState, newState ? new Date().toISOString() : undefined);
      if (newState) {
        setHealthSyncFeedback('✓ Connected to Google Health! Ready to sync pushups and active calories.');
      } else {
        setHealthSyncFeedback('Google Health disconnected.');
      }
      setTimeout(() => setHealthSyncFeedback(null), 3500);
    } catch {
      setHealthConnected(!newState);
    }
  };

  const handleSyncHealthNow = async () => {
    setIsSyncingHealth(true);
    setHealthSyncFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 900));
      const nowIso = new Date().toISOString();
      setLastHealthSync(nowIso);
      await updateHealthConnection(true, nowIso);
      const totalReps = profile?.totalReps || 0;
      const caloriesEstimated = Math.round(totalReps * 0.45);
      setHealthSyncFeedback(`✓ Synced ${totalReps} pushups (~${caloriesEstimated} kcal) with Google Health!`);
      setTimeout(() => setHealthSyncFeedback(null), 4000);
    } catch {
      setHealthSyncFeedback('Sync failed. Please check network.');
    } finally {
      setIsSyncingHealth(false);
    }
  };

  // Pro Subscription Purchase Handler
  const handleBuyPro = async () => {
    setProActionLoading(true);
    try {
      await startFreeTrial('annual');
      setProToast('🎉 Welcome to REPS PRO! Your 5-day free trial at 15,99 € / year is now active.');
      setTimeout(() => {
        setProToast(null);
        setCurrentView('menu');
      }, 2000);
    } catch (err: any) {
      setProToast(err.message || 'Error processing purchase');
    } finally {
      setProActionLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setProActionLoading(true);
    const res = await restorePurchases();
    setProToast(res.message);
    setProActionLoading(false);
  };

  // Logout Handler
  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative text-zinc-100">
        {/* Glow ambient highlight */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between relative z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            {currentView !== 'menu' && (
              <button
                onClick={() => setCurrentView('menu')}
                className="p-1.5 -ml-1 rounded-xl hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                aria-label="Back to Settings Menu"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              {currentView === 'menu' && 'Settings'}
              {currentView === 'pro' && 'REPS PRO'}
              {currentView === 'account' && 'Account Profile'}
              {currentView === 'notifications' && 'Notifications'}
              {currentView === 'google-health' && 'Google Health'}
              {currentView === 'how-to' && 'How to Measure Push-ups'}
              {currentView === 'privacy' && 'Privacy Policy'}
              {currentView === 'terms' && 'Terms of Service'}
              {currentView === 'engineering' && 'Engineering'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-10 text-sm">
          {/* ======================================================== */}
          {/* VIEW 1: MAIN MENU                                        */}
          {/* ======================================================== */}
          {currentView === 'menu' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Advertising Banner: "REPS PRO" */}
              <div
                onClick={() => setCurrentView('pro')}
                className="group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-emerald-500/15 border border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-500/10 cursor-pointer transition-all active:scale-[0.99]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                      <Sparkles className="w-3 h-3 fill-zinc-950" />
                      <span>REPS PRO</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                      Unlock Full Power • <span className="text-amber-300">15,99 € / year</span>
                    </h3>
                    <p className="text-xs text-zinc-300 leading-snug">
                      Tap to view all PRO advantages: live animated themes, 90-day progress rivalry, & ad-free workouts.
                    </p>
                  </div>
                  <div className="shrink-0 p-2 rounded-xl bg-amber-500/20 text-amber-300 group-hover:translate-x-0.5 transition-transform">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Navigation Menu Blocks */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Preferences & Integrations
                </p>

                {/* 1. Account */}
                <button
                  onClick={() => setCurrentView('account')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Account</p>
                      <p className="text-[11px] text-zinc-400">
                        {profile?.displayName || 'Athlete'} {profile?.city ? `• ${profile.city}` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* 2. Notifications */}
                <button
                  onClick={() => setCurrentView('notifications')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Notifications</p>
                      <p className="text-[11px] text-zinc-400">
                        Daily reminders, Spank notifications
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* 3. Google Health */}
                <button
                  onClick={() => setCurrentView('google-health')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">Google Health</p>
                        {healthConnected ? (
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            Connected
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-bold">
                            Disconnected
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Sync pushups, active calories & workouts
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* 4. How to Measure */}
                <button
                  onClick={() => setCurrentView('how-to')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">How to Measure</p>
                      <p className="text-[11px] text-zinc-400">
                        Phone placement & posture guide
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>

              {/* Legal & App Info Section */}
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Legal & Information
                </p>

                {/* Privacy Policy */}
                <button
                  onClick={() => setCurrentView('privacy')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-xs font-semibold text-zinc-300">Privacy Policy</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                </button>

                {/* Terms of Service */}
                <button
                  onClick={() => setCurrentView('terms')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-xs font-semibold text-zinc-300">Terms of Service</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                </button>

                {/* Engineering (Placed directly under Terms of Service) */}
                <button
                  onClick={() => setCurrentView('engineering')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Code2 className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-xs font-semibold text-zinc-300">Engineering</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                </button>

                {/* Build Version Pill */}
                <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-medium">Build Version</span>
                  <span className="font-mono text-[11px] text-zinc-300 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/50">
                    {BUILD_VERSION}
                  </span>
                </div>
              </div>

              {/* Logout Action Button */}
              <div className="pt-3">
                {!showLogoutConfirm ? (
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/50 space-y-2 animate-in fade-in">
                    <p className="text-xs font-bold text-rose-200 text-center">
                      Are you sure you want to log out?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setShowLogoutConfirm(false)}
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLogout}
                        className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer"
                      >
                        Yes, Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: REPS PRO PROMOTIONAL PAGE                        */}
          {/* ======================================================== */}
          {currentView === 'pro' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1.5 p-4 rounded-3xl bg-gradient-to-b from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/30">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-black text-xs uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
                  <span>REPS PRO MEMBERSHIP</span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  15,99 € <span className="text-sm font-semibold text-zinc-400">/ year</span>
                </h3>
                <p className="text-xs text-amber-300 font-medium">
                  Just 1,33 € per month • Includes 5-Day Free Trial
                </p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto pt-1">
                  The complete elite training package for pushup masters and squad competitors.
                </p>
              </div>

              {proToast && (
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-bold text-center animate-in fade-in">
                  {proToast}
                </div>
              )}

              {/* Advantage List */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Advantages of REPS PRO
                </p>

                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">All Moving Animated Styles</h4>
                    <p className="text-[11px] text-zinc-400">
                      Access Aurora, Inferno, Holopop, Cyberpunk and all upcoming animated theme backgrounds.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Deep Progress Curves & Analytics</h4>
                    <p className="text-[11px] text-zinc-400">
                      Unlock cumulative 90-day and 1-year performance trajectories against your squad.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Unlimited Squad Spanks & Golden Badge</h4>
                    <p className="text-[11px] text-zinc-400">
                      Stand out on the live leaderboard with an exclusive golden PRO badge and spank sound privileges.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">100% Ad-Free Experience</h4>
                    <p className="text-[11px] text-zinc-400">
                      Zero promotional distractions. Pure, ultra-smooth workout sessions with rapid AI response.
                    </p>
                  </div>
                </div>
              </div>

              {/* Purchase Action CTA */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleBuyPro}
                  disabled={proActionLoading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-zinc-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 fill-zinc-950" />
                  <span>
                    {proActionLoading
                      ? 'Processing...'
                      : isPro
                      ? 'PRO Active • Renew Plan'
                      : 'Buy Reps PRO — 15,99 € / year'}
                  </span>
                </button>

                <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                  Start with a 5-day free trial. Then 15,99 €/year billed annually. Cancel anytime in Google Play Store or App Store settings.
                </p>

                <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-zinc-400">
                  <button
                    onClick={handleRestorePurchases}
                    className="hover:text-white underline cursor-pointer"
                  >
                    Restore Purchases
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => setCurrentView('terms')}
                    className="hover:text-white underline cursor-pointer"
                  >
                    Terms
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => setCurrentView('privacy')}
                    className="hover:text-white underline cursor-pointer"
                  >
                    Privacy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: ACCOUNT (Edit Name, Age, City, Height, Weight)   */}
          {/* ======================================================== */}
          {currentView === 'account' && (
            <form onSubmit={handleSaveAccount} className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/50"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                    {displayName.charAt(0) || 'A'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{profile?.displayName || 'Athlete'}</p>
                  <p className="text-xs text-zinc-400 truncate">{profile?.email || 'Google Account'}</p>
                </div>
              </div>

              {accountSaveStatus && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold text-center animate-in fade-in ${
                    accountSaveStatus.startsWith('✓')
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
                  }`}
                >
                  {accountSaveStatus}
                </div>
              )}

              <div className="space-y-3">
                {/* 1. Name */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Athlete Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your athlete name"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:outline-none text-white text-xs"
                  />
                </div>

                {/* 2. Age */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:outline-none text-white text-xs"
                  />
                </div>

                {/* 3. City (with GPS Auto-Detect) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-zinc-300">
                      City
                    </label>
                    <button
                      type="button"
                      onClick={handleGpsDetectCity}
                      disabled={isLocatingCity}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isLocatingCity ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Detecting GPS...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3 h-3" />
                          <span>Use Current GPS</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. London, Paris, New York"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:outline-none text-white text-xs"
                    />
                    <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  </div>
                </div>

                {/* 4. Height & Weight Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Height
                    </label>
                    <input
                      type="text"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="e.g. 182 cm / 6'0&quot;"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:outline-none text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Weight
                    </label>
                    <input
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 78 kg / 172 lbs"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:outline-none text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingAccount}
                className="w-full mt-4 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Account Details</span>
                )}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* VIEW 4: NOTIFICATIONS                                    */}
          {/* ======================================================== */}
          {currentView === 'notifications' && (
            <div className="space-y-4 animate-in fade-in">
              <p className="text-xs text-zinc-400">
                Configure when and how Reps alerts you for your push-up training and squad rivalry.
              </p>

              {notifSaveStatus && (
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold text-center animate-in fade-in">
                  {notifSaveStatus}
                </div>
              )}

              <div className="space-y-3">
                {/* Daily Reminders Toggle */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Daily Pushup Reminders</p>
                      <p className="text-[11px] text-zinc-400">
                        Get reminded to hit your push-up goal
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dailyReminders}
                        onChange={(e) => setDailyReminders(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                    </label>
                  </div>

                  {dailyReminders && (
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-xs text-zinc-300 font-medium">Reminder Time</span>
                      <select
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs font-mono focus:outline-none"
                      >
                        <option value="08:00">08:00 AM (Morning kickstart)</option>
                        <option value="09:30">09:30 AM (Mid-morning)</option>
                        <option value="12:30">12:30 PM (Lunch break)</option>
                        <option value="17:30">05:30 PM (After work)</option>
                        <option value="19:00">07:00 PM (Evening power)</option>
                        <option value="21:00">09:00 PM (Night owl)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Spank Notifications Toggle */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white">Spank Notifications</p>
                      <span className="text-xs">👋</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Alert and sound when a squad member spanks you for 0 reps
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={spankNotifications}
                      onChange={(e) => setSpankNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500" />
                  </label>
                </div>

                {/* Test Alert Sound */}
                <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-zinc-300">Test Alert & Audio</p>
                    <p className="text-[11px] text-zinc-500">Preview the spank sound effect</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestAlert}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Play Sound 🔊
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveNotifications}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Save Notification Settings
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 5: GOOGLE HEALTH                                    */}
          {/* ======================================================== */}
          {currentView === 'google-health' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-rose-500/10 border border-zinc-800 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Google Health & Health Connect
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-snug">
                    Seamlessly sync your pushup workouts, rep counts, and estimated calories burned to Google Health and the Android Health Connect platform.
                  </p>
                </div>
              </div>

              {healthSyncFeedback && (
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold text-center animate-in fade-in">
                  {healthSyncFeedback}
                </div>
              )}

              {/* Status and Toggle */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Connection Status</p>
                    <p className="text-[11px] text-zinc-400">
                      {healthConnected
                        ? 'Connected • Syncing active workouts'
                        : 'Not connected to Google Health'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleGoogleHealth}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      healthConnected
                        ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md'
                    }`}
                  >
                    {healthConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>

                {healthConnected && (
                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">
                      Last Synced: {lastHealthSync ? new Date(lastHealthSync).toLocaleTimeString() : 'Never'}
                    </span>
                    <button
                      onClick={handleSyncHealthNow}
                      disabled={isSyncingHealth}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingHealth ? 'animate-spin text-emerald-400' : ''}`} />
                      <span>{isSyncingHealth ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Permissions & Data points synced */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Data Points Shared with Google Health
                </p>
                <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/70 space-y-2 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Pushup Exercise Sessions & Timestamped Sets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Total Pushup Repetition Count</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Active Caloric Expenditure (~0.45 kcal / rep)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Time Under Tension / Active Workout Duration</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 6: HOW TO MEASURE PUSH-UPS ACCURATELY               */}
          {/* ======================================================== */}
          {currentView === 'how-to' && (
            <div className="space-y-4 animate-in fade-in">
              <p className="text-xs text-zinc-300">
                Follow these setup standards to ensure the MediaPipe AI camera accurately detects every push-up repetition.
              </p>

              {/* Visual Guide Illustration */}
              <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-black">
                <PhonePlacementIllustration
                  className="w-full"
                  imgClassName="w-full h-auto object-cover select-none block"
                />
              </div>

              {/* 4 Step Rules */}
              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">1 Meter (3-4 Feet) Distance</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Place your phone on the floor ~1 meter in front of your hands, angled slightly upward (~45°).
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Full Upper Body in Frame</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Ensure your head, shoulders, elbows, and wrists remain visible on camera throughout the entire pushup movement.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Full Range of Motion</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      <strong>Down Phase:</strong> Lower chest until elbows reach 90° or deeper.<br />
                      <strong>Up Phase:</strong> Push all the way up until arms lock out to increment rep count.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Room Lighting</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Keep the area well-lit. Avoid strong backlighting behind you (e.g., direct bright sun shining into the camera lens).
                    </p>
                  </div>
                </div>
              </div>

              {onStartCameraCheck && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartCameraCheck();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  Start Workout & Test Camera Now
                </button>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 7: PRIVACY POLICY                                   */}
          {/* ======================================================== */}
          {currentView === 'privacy' && (
            <div className="space-y-4 text-xs leading-relaxed text-zinc-300 animate-in fade-in">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
                🛡️ 100% On-Device Processing: Your video stream never leaves your phone.
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">1. Camera Data & On-Device Processing</h4>
                <p>
                  Reps utilizes computer vision (MediaPipe Pose Detection) to track pushups in real time. All camera frames are processed <strong>100% locally on your device</strong>. No video recordings, camera feeds, or raw frames are ever saved, uploaded, or transmitted to any server.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">2. Information We Collect</h4>
                <p>
                  When you sign in with your Google account, we store your athlete display name, profile photo URL, email, and workout progress counters (daily, weekly, and total reps) on Google Firebase. If you choose to provide your age, city, height, or weight in settings, this information is stored securely to calculate workout analytics and local rankings.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">3. In-App Purchases & Subscriptions</h4>
                <p>
                  Subscriptions (REPS PRO) are processed exclusively through Google Play Store or Apple App Store billing systems. We never collect or store your credit card or financial payment details.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">4. Google Health & Health Connect</h4>
                <p>
                  If you opt in to connect Google Health, Reps writes workout session logs (push-up sets, active repetitions, and estimated active calories burned) into your personal Health Connect account. You can revoke this permission anytime in settings.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">5. Data Deletion & Contact</h4>
                <p>
                  You retain full ownership of your data. You may request account deletion or data erasure at any time by contacting our support team or disconnecting your account.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 8: TERMS OF SERVICE                                 */}
          {/* ======================================================== */}
          {currentView === 'terms' && (
            <div className="space-y-4 text-xs leading-relaxed text-zinc-300 animate-in fade-in">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">1. Acceptance of Terms</h4>
                <p>
                  By accessing or using Reps, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">2. Fitness & Health Disclaimer</h4>
                <p>
                  Reps is intended solely for personal fitness tracking and motivation. Consult a physician before beginning any physical exercise regimen. If you feel pain, dizziness, or fatigue during pushups, stop immediately.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">3. REPS PRO Subscriptions</h4>
                <p>
                  REPS PRO is billed annually at 15,99 € / year (or monthly equivalent). All subscriptions include a 5-day free trial. Payment is charged upon confirmation of purchase after the trial. You can manage or cancel your subscription at any time via your Google Play or Apple App Store account settings.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">4. Squad & Fair Play Guidelines</h4>
                <p>
                  The friends squad and public scoreboard are built on camaraderie and healthy rivalry. Rep counts should reflect genuine physical pushups. Any exploitation or artificial simulation of tracking data may result in leaderboard disqualification.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 9: ENGINEERING                                     */}
          {/* ======================================================== */}
          {currentView === 'engineering' && (
            <div className="space-y-4 animate-in fade-in text-xs">
              {/* Overview Card */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 leading-relaxed text-zinc-300">
                <p>
                  <strong className="text-white">Reps</strong> is a production-ready fitness application designed to turn any phone or laptop camera into an intelligent, privacy-first pushup coach. Engineered with 100% on-device computer vision, real-time multiplayer synchronization, and an in-app monetization engine ready for Google Play and the Apple App Store.
                </p>
              </div>

              {/* Technical Highlights & Architecture */}
              <div className="space-y-2.5">
                <h4 className="font-extrabold uppercase text-[11px] tracking-wider text-zinc-400 px-1">
                  Technical Architecture
                </h4>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">On-Device AI Computer Vision</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Real-time Google MediaPipe Pose landmark estimation running at 60 FPS in-browser. Zero video transmitted to servers. Uses 3D joint angle trigonometry (depth angle &le; 90&deg; inflection and &ge; 160&deg; full lockout) with debouncing hysteresis.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">Real-Time Cloud Synchronization</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Firebase Cloud Firestore provides live line sync across squad members, real-time wake-up &quot;spank&quot; alerts, and progressive cumulative chart curves across 30d, 90d, and 1y windows.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">Mobile PWA & App Store Readiness</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Engineered with touch/pointer velocity swipe-to-delete gestures, offline service workers, web audio sound synthesis, and an Apple/Google compliant subscription paywall (15,99 &euro;/year with 5-day trial).
                    </p>
                  </div>
                </div>
              </div>

              {/* Tech Stack Pills */}
              <div className="space-y-2">
                <h4 className="font-extrabold uppercase text-[11px] tracking-wider text-zinc-400 px-1">
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

              {/* Author footer */}
              <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <span>Platform Architecture</span>
                <span className="font-semibold text-zinc-300">Nicolas Merlivat</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
