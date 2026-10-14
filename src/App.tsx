import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { Header } from './components/Header';
import { LoginCard } from './components/LoginCard';
import { ProfileCard } from './components/ProfileCard';
import { Scoreboard } from './components/Scoreboard';
import { FriendsManager } from './components/FriendsManager';
import { InviteFriendsModal } from './components/InviteFriendsModal';
import { PushupCameraTracker } from './components/PushupCameraTracker';
import { WorkoutProgressChart } from './components/WorkoutProgressChart';
import { WorkoutSetupModal } from './components/WorkoutSetupModal';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';
import { ThemeBackground } from './components/ThemeBackground';
import { ProPaywallModal } from './components/ProPaywallModal';
import { AdBanner } from './components/AdBanner';
import { LegalModal } from './components/LegalModals';
import { SettingsModal, SettingsView } from './components/SettingsModal';
import { addFriendByInviteCode, subscribeToUserSpanks } from './firebase';
import {
  isNotificationSupported,
  getNotificationPermission,
  checkAndTriggerGoalReminder,
  notifyUserSpanked,
} from './utils/notifications';
import { playButtSlapSound } from './utils/soundEffects';
import { BUILD_VERSION } from './version';
import {
  Camera,
  Trophy,
  Users,
  Play,
  UserCheck,
} from 'lucide-react';

type NavTab = 'workout' | 'scoreboard' | 'friends';

function DashboardContent() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { theme, themeConfig } = useTheme();
  const { showPaywall, closePaywall, openPaywall } = useSubscription();
  const [activeTab, setActiveTab] = useState<NavTab>('workout');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isCameraWorkoutActive, setIsCameraWorkoutActive] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const [detectedInviteCode, setDetectedInviteCode] = useState<string | null>(null);
  const [inviteStatusMsg, setInviteStatusMsg] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Trigger Hook: Once the user logs in with their Google account, ask to Enable Notifications
  useEffect(() => {
    if (user && isNotificationSupported()) {
      const perm = getNotificationPermission();
      const hasPrompted = localStorage.getItem('reps_notifications_prompt_seen');
      if (perm === 'default' && !hasPrompted) {
        // Brief delay for smooth post-login entry
        const timer = setTimeout(() => {
          setShowNotificationModal(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  // Periodic push-up goal reminder check (every 2nd day between 9:30 & 19:00) and live Squad Spank alerts
  useEffect(() => {
    if (!user) return;

    // Check goal reminders on mount & every minute
    checkAndTriggerGoalReminder();
    const interval = setInterval(() => {
      checkAndTriggerGoalReminder();
    }, 60000);

    // Live incoming spank listener: alerts the user when spanked by squad member
    const unsubscribeSpanks = subscribeToUserSpanks(user.uid, (_count, latestSpank) => {
      if (latestSpank) {
        playButtSlapSound();
        notifyUserSpanked(latestSpank.fromName);
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribeSpanks();
    };
  }, [user]);

  // Check URL params for ?invite=CODE and auto-connect in 1 tap
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) {
      const cleanCode = code.toUpperCase();
      setDetectedInviteCode(cleanCode);
      if (user) {
        addFriendByInviteCode(user.uid, cleanCode)
          .then((res) => {
            setInviteStatusMsg(res.message);
            if (res.success) {
              refreshProfile();
              try {
                window.history.replaceState({}, '', window.location.pathname);
              } catch {
                // Ignore history update error if any
              }
              setTimeout(() => {
                setDetectedInviteCode(null);
                setInviteStatusMsg(null);
              }, 4500);
            }
          })
          .catch((err) => {
            setInviteStatusMsg(err.message || 'Error connecting to squad.');
          });
      }
    }
  }, [user]);

  const handleAcceptInvite = async () => {
    if (!user || !detectedInviteCode) return;
    try {
      const res = await addFriendByInviteCode(user.uid, detectedInviteCode);
      setInviteStatusMsg(res.message);
      if (res.success) {
        await refreshProfile();
        setTimeout(() => {
          setDetectedInviteCode(null);
          setInviteStatusMsg(null);
        }, 4000);
      }
    } catch (err: any) {
      setInviteStatusMsg(err.message || 'Error accepting invite.');
    }
  };

  const launchCameraWorkout = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen && !document.fullscreenElement) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen && !(document as any).webkitFullscreenElement) {
        await (elem as any).webkitRequestFullscreen();
      }
    } catch {
      // Ignored if browser requires user click on specific button or denies
    }
    setIsCameraWorkoutActive(true);
  };

  const handleStartWorkout = () => {
    const hasSeenGuide = localStorage.getItem('reps_has_seen_setup_guide');
    if (!hasSeenGuide) {
      // Visible only once when user starts the app for the first time
      setShowSetupModal(true);
    } else {
      // Directly start workout for subsequent starts
      launchCameraWorkout();
    }
  };

  const handleConfirmStartTracking = () => {
    localStorage.setItem('reps_has_seen_setup_guide', 'true');
    setShowSetupModal(false);
    launchCameraWorkout();
  };

  const handleCloseSetupModal = () => {
    localStorage.setItem('reps_has_seen_setup_guide', 'true');
    setShowSetupModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs font-medium tracking-wide">Connecting to Reps...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeConfig.pageBg} ${themeConfig.textColor} flex flex-col selection:bg-emerald-500 selection:text-zinc-950 pb-24 relative transition-colors duration-300`}>
      <ThemeBackground />
      <Header onOpenSettings={() => setShowSettingsModal(true)} />

      {/* Fullscreen Camera Workout Mode */}
      {isCameraWorkoutActive && (
        <PushupCameraTracker onClose={() => setIsCameraWorkoutActive(false)} />
      )}

      <main
        className={`flex-1 flex flex-col w-full mx-auto relative z-10 ${
          activeTab === 'workout'
            ? 'max-w-none px-2 sm:px-3 pt-2 pb-1'
            : 'max-w-2xl px-4 pt-5 pb-2'
        }`}
      >
        {!user ? (
          <div className="flex-1 flex flex-col space-y-4">
            <LoginCard onStartCameraDemo={handleStartWorkout} />
            <footer className="mt-auto pt-6 pb-2 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400 select-none shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Build {BUILD_VERSION}</span>
              </div>
            </footer>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Invite Banner if visiting with ?invite=CODE */}
            {detectedInviteCode && (
              <div className="p-3.5 mb-5 bg-gradient-to-r from-emerald-500/15 to-blue-500/15 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Friend Invite Detected: <span className="font-mono text-emerald-400">{detectedInviteCode}</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {inviteStatusMsg || 'Connect now to track and compete on the pushup scoreboard!'}
                    </p>
                  </div>
                </div>

                {!inviteStatusMsg && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAcceptInvite}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Accept Invite
                    </button>
                    <button
                      onClick={() => setDetectedInviteCode(null)}
                      className="px-2.5 py-1.5 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: WORKOUT */}
            {activeTab === 'workout' && (
              <div className="space-y-3 animate-in fade-in duration-200 w-full">
                {/* Profile & Aggregated Scoreboard Stats */}
                <ProfileCard />
              </div>
            )}

            {/* TAB 2: SCOREBOARD */}
            {activeTab === 'scoreboard' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <Scoreboard onStartWorkout={handleStartWorkout} />
              </div>
            )}

            {/* TAB 3: FRIENDS SQUAD */}
            {activeTab === 'friends' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <FriendsManager onOpenInviteModal={() => setShowInviteModal(true)} />
              </div>
            )}

            {/* Non-intrusive Ad Banner for Free Users (Hidden for PRO subscribers) */}
            <AdBanner />

            {/* Build Version at bottom of page */}
            <footer className={`flex flex-col items-center justify-center ${activeTab === 'workout' ? 'mt-2 pt-1 pb-1' : 'mt-auto pt-4 pb-2'}`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400 select-none shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Build {BUILD_VERSION}</span>
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar with START button next to Friends */}
      {user && (
        <nav
          aria-label="Main Navigation"
          className={`fixed bottom-0 inset-x-0 z-40 ${themeConfig.bottomNavBg} border-t ${themeConfig.bottomNavBorder} px-3 py-2 sm:py-3 transition-colors duration-300`}
        >
          <div className={`max-w-md mx-auto grid grid-cols-4 gap-1 sm:gap-1.5 p-1 ${themeConfig.bottomNavInnerBg} border ${themeConfig.bottomNavBorder} rounded-2xl shadow-xl transition-colors duration-300`}>
            <button
              onClick={() => setActiveTab('workout')}
              className={`py-2 px-1.5 sm:px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                activeTab === 'workout'
                  ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
                  : `${themeConfig.inactiveNavText}`
              }`}
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>Workout</span>
            </button>

            <button
              onClick={() => setActiveTab('scoreboard')}
              className={`py-2 px-1.5 sm:px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                activeTab === 'scoreboard'
                  ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
                  : `${themeConfig.inactiveNavText}`
              }`}
            >
              <Trophy className="w-4 h-4 stroke-[2.5]" />
              <span>Scoreboard</span>
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className={`py-2 px-1.5 sm:px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                activeTab === 'friends'
                  ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
                  : `${themeConfig.inactiveNavText}`
              }`}
            >
              <Users className="w-4 h-4 stroke-[2.5]" />
              <span>Squad</span>
            </button>

            {/* START Camera Workout Action Button */}
            <button
              onClick={handleStartWorkout}
              className={`py-2 px-1.5 sm:px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 ${themeConfig.startButtonGradient} ${themeConfig.startButtonText} ${themeConfig.startButtonShadow} transition-all active:scale-95 cursor-pointer`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START</span>
            </button>
          </div>
        </nav>
      )}

      {/* Camera Workout Setup Guide Modal (Appears only the first time users start a workout) */}
      <WorkoutSetupModal
        isOpen={showSetupModal}
        onClose={handleCloseSetupModal}
        onStart={handleConfirmStartTracking}
      />

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Enable Notifications Modal (Appears upon Google login) */}
      <NotificationPermissionModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Reps PRO Subscription Paywall Modal */}
      <ProPaywallModal
        isOpen={showPaywall}
        onClose={closePaywall}
        onOpenLegal={(type) => setLegalModalType(type)}
      />

      {/* Store Compliance Legal Modals */}
      <LegalModal
        isOpen={legalModalType !== null}
        onClose={() => setLegalModalType(null)}
        type={legalModalType || 'privacy'}
      />

      {/* App Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onStartCameraCheck={handleStartWorkout}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SubscriptionProvider>
          <DashboardContent />
        </SubscriptionProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
