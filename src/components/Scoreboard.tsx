import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  UserProfile,
  subscribeToLeaderboard,
  addFriendByInviteCode,
} from '../firebase';
import {
  Trophy,
  Flame,
  Calendar,
  Clock,
  Crown,
  Users,
  Globe,
  MapPin,
  UserPlus,
  Check,
  Medal,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { CityModal } from './CityModal';
import { WorkoutProgressChart } from './WorkoutProgressChart';

export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type LeaderboardScope = 'all' | 'city' | 'friends';

interface ScoreboardProps {
  onStartWorkout?: () => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ onStartWorkout }) => {
  const { user, profile } = useAuth();
  const { themeConfig } = useTheme();
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [scope, setScope] = useState<LeaderboardScope>('all');
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedFriendsMap, setAddedFriendsMap] = useState<Record<string, boolean>>({});
  const [showCityModal, setShowCityModal] = useState(false);

  const formatCityName = (city?: string): string => {
    if (!city) return 'City';
    const trimmed = city.trim();
    if (!trimmed) return 'City';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToLeaderboard(timeframe, (users) => {
      setLeaderboard(users);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [timeframe]);

  // Filter based on scope
  const filteredList = leaderboard.filter((item) => {
    if (scope === 'all') return true;
    if (scope === 'city') {
      if (!profile?.city) return false;
      const targetCity = profile.city.trim().toLowerCase();
      return (item.city || '').trim().toLowerCase() === targetCity;
    }
    if (!user || !profile) return true;
    // Friends list includes user's friends + user themselves
    const myFriends = profile.friends || [];
    return item.uid === user.uid || myFriends.includes(item.uid);
  });

  const getRepsForTimeframe = (athlete: UserProfile): number => {
    switch (timeframe) {
      case 'daily':
        return athlete.dailyReps || 0;
      case 'weekly':
        return athlete.weeklyReps || 0;
      case 'monthly':
        return athlete.monthlyReps || 0;
      case 'yearly':
        return athlete.yearlyReps || 0;
    }
  };

  const handleAddFriend = async (friend: UserProfile) => {
    if (!user || !friend.inviteCode) return;
    try {
      await addFriendByInviteCode(user.uid, friend.inviteCode);
      setAddedFriendsMap((prev) => ({ ...prev, [friend.uid]: true }));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* First Visible Progress: Pushup Progress Chart (YOU) */}
      <WorkoutProgressChart onStartWorkout={onStartWorkout} />

      {/* Pushup Leaderboard Header */}
      <div className="flex items-center gap-2.5 px-1 pt-2">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${themeConfig.trophyBox}`}>
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'}`}>
            Pushup Leaderboard
          </h2>
          <p className={`text-xs ${themeConfig.textMuted}`}>
            Live rankings for every pushup
          </p>
        </div>
      </div>

      {/* Scope Toggle: Global vs City vs Squad - Extended full width */}
      <div className={`grid grid-cols-3 gap-1.5 p-1 ${themeConfig.subCardBg} border ${themeConfig.subCardBorder} rounded-2xl shadow-sm`}>
        <button
          onClick={() => setScope('all')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            scope === 'all'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Global</span>
        </button>

        <button
          onClick={() => {
            if (!profile?.city) {
              setShowCityModal(true);
            } else {
              setScope('city');
            }
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            scope === 'city'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{profile?.city ? formatCityName(profile.city) : 'City'}</span>
        </button>

        <button
          onClick={() => setScope('friends')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            scope === 'friends'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Squad</span>
        </button>
      </div>

      {/* City Filter Active Indicator Banner */}
      {scope === 'city' && profile?.city && (
        <div className={`flex items-center justify-between px-3.5 py-2 ${themeConfig.reminderBadgeBg} border ${themeConfig.reminderBoxBorder} rounded-2xl text-xs`}>
          <span className={`flex items-center gap-1.5 font-bold ${themeConfig.reminderBadgeText}`}>
            <MapPin className="w-3.5 h-3.5" />
            Leaderboard for {formatCityName(profile.city)}
          </span>
          <button
            onClick={() => setShowCityModal(true)}
            className={`text-xs font-bold ${themeConfig.textMuted} hover:${themeConfig.textColor} underline cursor-pointer`}
          >
            Change City
          </button>
        </div>
      )}

      {/* Timeframe Selector Tabs - Extended full width */}
      <div className={`grid grid-cols-4 gap-1.5 p-1 ${themeConfig.subCardBg} rounded-2xl border ${themeConfig.subCardBorder} shadow-sm`}>
        <button
          onClick={() => setTimeframe('daily')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            timeframe === 'daily'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
        >
          <Flame className="w-3.5 h-3.5 shrink-0" />
          <span>Daily</span>
        </button>

        <button
          onClick={() => setTimeframe('weekly')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            timeframe === 'weekly'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Weekly</span>
        </button>

        <button
          onClick={() => setTimeframe('monthly')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            timeframe === 'monthly'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Monthly</span>
        </button>

        <button
          onClick={() => setTimeframe('yearly')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            timeframe === 'yearly'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
        >
          <Trophy className="w-3.5 h-3.5 shrink-0" />
          <span>Yearly</span>
        </button>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className={`${themeConfig.cardBg} border ${themeConfig.cardBorder} rounded-3xl overflow-hidden ${themeConfig.cardShadow} transition-colors`}>
        {loading ? (
          <div className={`p-12 text-center ${themeConfig.textMuted} text-xs flex flex-col items-center justify-center gap-2`}>
            <div className={`w-8 h-8 border-2 ${themeConfig.avatarRing} border-t-transparent rounded-full animate-spin`} />
            Loading live rankings...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center">
            <div className={`w-12 h-12 rounded-2xl ${themeConfig.subCardBg} ${themeConfig.textMuted} flex items-center justify-center mx-auto mb-3 border ${themeConfig.subCardBorder}`}>
              {scope === 'city' ? (
                <MapPin className="w-6 h-6" />
              ) : scope === 'friends' ? (
                <Users className="w-6 h-6" />
              ) : (
                <Trophy className="w-6 h-6" />
              )}
            </div>
            <h4 className={`text-sm font-bold ${themeConfig.isLightMode ? 'text-slate-800' : 'text-zinc-200'}`}>
              {scope === 'city'
                ? `No athletes found in ${profile?.city || 'this city'} yet`
                : scope === 'friends'
                ? 'No friends on your scoreboard yet'
                : 'No pushups recorded yet for this timeframe'}
            </h4>
            <p className={`text-xs ${themeConfig.textMuted} max-w-xs mx-auto mt-1`}>
              {scope === 'city'
                ? `Log pushups to claim the #1 spot in ${profile?.city || 'your city'}!`
                : scope === 'friends'
                ? 'Add workout buddies in the Squad tab to compare pushups!'
                : 'Be the first athlete to record pushups today!'}
            </p>
          </div>
        ) : (
          <div className={`divide-y ${themeConfig.subCardBorder}`}>
            {filteredList.map((athlete, index) => {
              const rank = index + 1;
              const athleteReps = getRepsForTimeframe(athlete);
              const isCurrentUser = user?.uid === athlete.uid;
              const isFriend = profile?.friends?.includes(athlete.uid);
              const wasJustAdded = addedFriendsMap[athlete.uid];

              return (
                <div
                  key={athlete.uid}
                  className={`flex items-center justify-between p-3.5 transition-colors ${
                    isCurrentUser
                      ? `${themeConfig.userRowHighlight} ${themeConfig.userRowBorder}`
                      : `hover:${themeConfig.subCardBg}`
                  }`}
                >
                  {/* Rank + Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div className="w-7 text-center shrink-0">
                      {rank === 1 ? (
                        <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto font-black text-xs border border-amber-500/30">
                          🥇
                        </div>
                      ) : rank === 2 ? (
                        <div className="w-7 h-7 rounded-xl bg-zinc-400/20 text-zinc-300 flex items-center justify-center mx-auto font-black text-xs border border-zinc-400/30">
                          🥈
                        </div>
                      ) : rank === 3 ? (
                        <div className="w-7 h-7 rounded-xl bg-amber-700/20 text-amber-600 flex items-center justify-center mx-auto font-black text-xs border border-amber-700/30">
                          🥉
                        </div>
                      ) : (
                        <span className={`font-mono font-bold text-xs ${themeConfig.textMuted}`}>
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    {athlete.photoURL ? (
                      <img
                        src={athlete.photoURL}
                        alt={athlete.displayName}
                        className={`w-9 h-9 rounded-xl object-cover ring-1 ${themeConfig.avatarRing} shrink-0`}
                      />
                    ) : (
                      <div className={`w-9 h-9 rounded-xl ${themeConfig.avatarPlaceholderBg} ${themeConfig.avatarPlaceholderText} flex items-center justify-center font-bold text-xs shrink-0 border`}>
                        {athlete.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Name + Badges */}
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold truncate ${
                            isCurrentUser
                              ? themeConfig.statTodayColor
                              : themeConfig.isLightMode
                              ? 'text-slate-900'
                              : 'text-zinc-100'
                          }`}
                        >
                          {athlete.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className={`px-1.5 py-0.2 rounded ${themeConfig.userBadgeBg} ${themeConfig.userBadgeText} text-[9px] font-black uppercase tracking-wider shrink-0`}>
                            YOU
                          </span>
                        )}
                        {isFriend && !isCurrentUser && (
                          <span className={`px-1.5 py-0.2 rounded ${themeConfig.friendBadgeBg} ${themeConfig.friendBadgeText} text-[9px] font-bold shrink-0`}>
                            Friend
                          </span>
                        )}
                      </div>

                      <p className={`text-[10px] ${themeConfig.textMuted} flex items-center gap-1 mt-0.5 truncate`}>
                        <span>All-time: {athlete.totalReps || 0} reps</span>
                        {athlete.city && (
                          <span className="font-medium">• 📍 {formatCityName(athlete.city)}</span>
                        )}
                        {athlete.lastActiveDate && (
                          <span>• {athlete.lastActiveDate}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Pushup Count & Add Friend Button */}
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    {!isCurrentUser && !isFriend && athlete.inviteCode && (
                      <button
                        onClick={() => handleAddFriend(athlete)}
                        disabled={wasJustAdded}
                        title={`Add ${athlete.displayName} to Squad`}
                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          wasJustAdded
                            ? `${themeConfig.userBadgeBg} ${themeConfig.userBadgeText}`
                            : `${themeConfig.subCardBg} border ${themeConfig.subCardBorder} ${themeConfig.textMuted} hover:${themeConfig.textColor}`
                        }`}
                      >
                        {wasJustAdded ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    <div className="text-right">
                      <span className={`font-mono font-black text-sm sm:text-base ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'}`}>
                        {athleteReps}
                      </span>
                      <p className={`text-[9px] font-medium ${themeConfig.textMuted} uppercase -mt-0.5`}>
                        reps
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Set City Modal */}
      <CityModal
        isOpen={showCityModal}
        onClose={() => setShowCityModal(false)}
        onCitySaved={() => setScope('city')}
      />
    </div>
  );
};
