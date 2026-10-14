import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { UserProfile, subscribeToUserWorkouts, subscribeToUserSpanks } from '../firebase';
import {
  Trophy,
  Calendar,
  Edit2,
  Flame,
  Clock,
  Award,
  Sparkles,
} from 'lucide-react';

interface ProfileCardProps {
  // Props can be extended if needed
}

export const ProfileCard: React.FC<ProfileCardProps> = () => {
  const { user, profile, updateProfileName } = useAuth();
  const { theme, themeConfig, cycleTheme, themeLabel } = useTheme();
  const { isPro, isTrial, trialDaysRemaining, openPaywall } = useSubscription();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName || '');
  const [bestDay, setBestDay] = useState(profile?.dailyReps || 0);
  const [activeDays, setActiveDays] = useState((profile?.dailyReps || 0) > 0 ? 1 : 0);
  const [spankedCount, setSpankedCount] = useState<number>(profile?.spankedCount || 0);

  useEffect(() => {
    if (!user) return;
    const unsubscribeWorkouts = subscribeToUserWorkouts(user.uid, (data) => {
      const workoutsByDate: Record<string, number> = {};
      for (const w of data) {
        const key = w.dateStr;
        if (!key) continue;
        workoutsByDate[key] = (workoutsByDate[key] || 0) + (w.reps || 0);
      }
      const days = Object.keys(workoutsByDate);
      let maxDay = profile?.dailyReps || 0;
      for (const d of days) {
        if (workoutsByDate[d] > maxDay) {
          maxDay = workoutsByDate[d];
        }
      }
      setBestDay(maxDay);
      setActiveDays(Math.max(days.length, (profile?.dailyReps || 0) > 0 ? 1 : 0));
    });

    const unsubscribeSpanks = subscribeToUserSpanks(user.uid, (count) => {
      setSpankedCount(count);
    });

    return () => {
      unsubscribeWorkouts();
      unsubscribeSpanks();
    };
  }, [user, profile?.dailyReps]);

  if (!profile) return null;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await updateProfileName(newName.trim());
    setIsEditingName(false);
  };

  return (
    <div className="space-y-3 w-full">
      {/* Athlete Header Card with 60% Transparency Effect */}
      <div
        className={`border ${themeConfig.cardBorder} rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 ${themeConfig.cardShadow} relative overflow-hidden w-full transition-all duration-300 backdrop-blur-xl ${
          themeConfig.isLightMode
            ? 'bg-white/40 border-white/70 shadow-xl'
            : 'bg-zinc-950/40 border-white/10 shadow-2xl'
        }`}
      >
        <div className={`absolute top-0 right-0 w-48 h-48 ${themeConfig.cardGlowColor} rounded-full blur-2xl pointer-events-none opacity-40`} />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className={`w-14 h-14 rounded-2xl object-cover ring-2 ${themeConfig.avatarRing} shadow-md shrink-0`}
              />
            ) : (
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border ${themeConfig.avatarPlaceholderBg} ${themeConfig.avatarPlaceholderText} shrink-0`}>
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-2.5 py-1 text-sm bg-zinc-950/70 border border-emerald-500 rounded-lg text-white focus:outline-none"
                    autoFocus
                    maxLength={40}
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className={`text-xl font-black tracking-tight truncate ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'}`}>
                    {profile.displayName}
                  </h2>
                  <button
                    onClick={() => {
                      setNewName(profile.displayName);
                      setIsEditingName(true);
                    }}
                    title="Edit Name"
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Style Switcher Button Next to Username on the Far Right */}
          <button
            onClick={cycleTheme}
            title="Switch Visual Style (Night → Aurora → Inferno → Holopop)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black tracking-wider transition-all active:scale-95 cursor-pointer shrink-0 ${themeConfig.styleBtnBg} ${themeConfig.styleBtnBorder} ${themeConfig.styleBtnText} ${themeConfig.styleBtnShadow}`}
          >
            <span className={`w-2 h-2 rounded-full animate-pulse ${themeConfig.styleBtnDotColor}`} />
            <span>{themeLabel}</span>
          </button>
        </div>

        {/* PRO Subscription Promotion / Trial Badge */}
        {!isPro && (
          <button
            onClick={openPaywall}
            className="mt-3.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-emerald-500/15 border border-amber-500/30 hover:border-amber-400/50 flex items-center justify-between text-xs font-bold text-amber-300 transition-all cursor-pointer shadow-sm active:scale-98"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>5-Day Free Trial • $15.99/year</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider underline">Unlock PRO ›</span>
          </button>
        )}
        {isTrial && (
          <div className="mt-3.5 w-full py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>PRO Free Trial Active</span>
            </span>
            <span className="font-mono text-xs text-zinc-400">{trialDaysRemaining} days remaining</span>
          </div>
        )}

        {/* Stats Grid with Translucent Glass Sub-Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-3 sm:mt-4">
          <div className={`${themeConfig.isLightMode ? 'bg-white/40 border-purple-200/50' : 'bg-black/30 border-white/10'} border rounded-xl p-3 backdrop-blur-md transition-colors`}>
            <div className={`flex items-center justify-between text-xs mb-1 ${themeConfig.statLabelColor}`}>
              <span>Today</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className={`text-2xl font-black tracking-tight ${themeConfig.statTodayColor}`}>
              {profile.dailyReps || 0}
            </p>
            <p className={`text-[10px] mt-0.5 ${themeConfig.statSubtextColor}`}>Pushups today</p>
          </div>

          <div className={`${themeConfig.isLightMode ? 'bg-white/40 border-purple-200/50' : 'bg-black/30 border-white/10'} border rounded-xl p-3 backdrop-blur-md transition-colors`}>
            <div className={`flex items-center justify-between text-xs mb-1 ${themeConfig.statLabelColor}`}>
              <span>This Week</span>
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className={`text-2xl font-black tracking-tight ${themeConfig.statWeekColor}`}>
              {profile.weeklyReps || 0}
            </p>
            <p className={`text-[10px] mt-0.5 ${themeConfig.statSubtextColor}`}>7-day aggregate</p>
          </div>

          <div className={`${themeConfig.isLightMode ? 'bg-white/40 border-purple-200/50' : 'bg-black/30 border-white/10'} border rounded-xl p-3 backdrop-blur-md transition-colors`}>
            <div className={`flex items-center justify-between text-xs mb-1 ${themeConfig.statLabelColor}`}>
              <span>This Month</span>
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className={`text-2xl font-black tracking-tight ${themeConfig.statMonthColor}`}>
              {profile.monthlyReps || 0}
            </p>
            <p className={`text-[10px] mt-0.5 ${themeConfig.statSubtextColor}`}>Monthly total</p>
          </div>

          <div className={`${themeConfig.isLightMode ? 'bg-white/40 border-purple-200/50' : 'bg-black/30 border-white/10'} border rounded-xl p-3 backdrop-blur-md transition-colors`}>
            <div className={`flex items-center justify-between text-xs mb-1 ${themeConfig.statLabelColor}`}>
              <span>This Year</span>
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className={`text-2xl font-black tracking-tight ${themeConfig.statYearColor}`}>
              {profile.yearlyReps || 0}
            </p>
            <p className={`text-[10px] mt-0.5 ${themeConfig.statSubtextColor}`}>Year to date</p>
          </div>

          {/* BEST DAY placed directly under THIS MONTH */}
          <div className={`${themeConfig.isLightMode ? 'bg-white/40 border-purple-200/50' : 'bg-black/30 border-white/10'} border rounded-xl p-3 backdrop-blur-md transition-colors`}>
            <div className={`flex items-center justify-between text-xs mb-1 ${themeConfig.statLabelColor}`}>
              <span className="font-semibold">Best Day</span>
              <Award className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black tracking-tight ${themeConfig.statBestColor}`}>
                {bestDay}
              </span>
              <span className={`text-xs font-semibold ${themeConfig.statSubtextColor}`}>reps</span>
            </div>
            <p className={`text-[10px] mt-0.5 ${themeConfig.statSubtextColor}`}>Single day record</p>
          </div>

          {/* ACTIVE DAYS placed directly under THIS YEAR */}
          <div className={`${themeConfig.isLightMode ? 'bg-white/40 border-purple-200/50' : 'bg-black/30 border-white/10'} border rounded-xl p-3 backdrop-blur-md transition-colors`}>
            <div className={`flex items-center justify-between text-xs mb-1 ${themeConfig.statLabelColor}`}>
              <span className="font-semibold">Active Days</span>
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black tracking-tight ${themeConfig.statActiveColor}`}>
                {activeDays}
              </span>
              <span className={`text-xs font-semibold ${themeConfig.statSubtextColor}`}>days</span>
            </div>
            <p className={`text-[10px] mt-0.5 ${themeConfig.statSubtextColor}`}>Workouts logged</p>
          </div>

          {/* SQUAD REMINDER Category: Records how many times you've been spanked by your squad */}
          <div className={`col-span-2 ${themeConfig.isLightMode ? 'bg-pink-500/20 border-pink-300/60' : 'bg-gradient-to-r from-rose-950/25 via-black/30 to-rose-950/20 border-rose-500/30'} border rounded-xl p-3 relative overflow-hidden group shadow-md transition-colors backdrop-blur-md`}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className={`font-bold flex items-center gap-1.5 ${themeConfig.reminderTitleColor}`}>
                <span className="text-sm">👋</span> SQUAD REMINDER
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className={`text-3xl font-black tracking-tight leading-none shrink-0 ${themeConfig.reminderCountColor}`}>
                {spankedCount}
              </span>
              <div className={`flex flex-col text-xs font-semibold leading-tight pt-0.5 ${themeConfig.reminderTextColor}`}>
                <span>Times spanked for skipping Reps,</span>
                <span className="mt-0.5">you little diva 💅🏼.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
