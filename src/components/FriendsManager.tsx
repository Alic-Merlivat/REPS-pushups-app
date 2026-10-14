import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  UserProfile,
  getUserProfile,
  searchUsers,
  addFriendByUid,
  removeFriend,
  spankSquadMember,
  getTodaySpankedFriendIds,
} from '../firebase';
import { playButtSlapSound } from '../utils/soundEffects';
import { SquadMemberCard } from './SquadMemberCard';
import {
  Users,
  Search,
  UserPlus,
  Share2,
  Calendar,
  Trophy,
  Loader2,
  Check,
  X,
  Undo2,
} from 'lucide-react';

interface FriendsManagerProps {
  onOpenInviteModal: () => void;
}

export const FriendsManager: React.FC<FriendsManagerProps> = ({ onOpenInviteModal }) => {
  const { user, profile, refreshProfile } = useAuth();
  const { themeConfig } = useTheme();
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Search by Name or Email
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUid, setAddingUid] = useState<string | null>(null);

  // Spank management
  const [spankedTodayIds, setSpankedTodayIds] = useState<Set<string>>(new Set());
  const [spankActionMsg, setSpankActionMsg] = useState<string | null>(null);
  const [activeSlapEffect, setActiveSlapEffect] = useState<string | null>(null);

  // Share feedback & Action feedback
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [removedFriendUndo, setRemovedFriendUndo] = useState<{ uid: string; name: string } | null>(null);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch full profiles of all friends & today's spanks
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) return;

      // Load today's spanks sent by current user
      try {
        const todaySpanks = await getTodaySpankedFriendIds(user.uid);
        if (isMounted) setSpankedTodayIds(todaySpanks);
      } catch (err) {
        console.error('Failed to load today spanks:', err);
      }

      if (!profile?.friends || profile.friends.length === 0) {
        if (isMounted) {
          setFriendsList([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const promises = profile.friends.map((uid) => getUserProfile(uid));
        const results = await Promise.all(promises);
        if (isMounted) {
          const validProfiles = results.filter((p): p is UserProfile => p !== null);
          setFriendsList(validProfiles);
        }
      } catch (err) {
        console.error('Failed to load friends:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [profile?.friends, user]);

  // 2. Real-time Search by Name or Email
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!value.trim() || !user) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const matches = await searchUsers(value.trim(), user.uid);
        // Exclude athletes already in friends list
        const existingFriendUids = new Set(profile?.friends || []);
        const filtered = matches.filter((m) => !existingFriendUids.has(m.uid));
        setSearchResults(filtered);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  const handleAddSearchedUser = async (friend: UserProfile) => {
    if (!user) return;
    setAddingUid(friend.uid);
    try {
      const res = await addFriendByUid(user.uid, friend.uid);
      setActionMsg({ text: res.message, isError: !res.success });
      if (res.success) {
        setSearchQuery('');
        setSearchResults([]);
        await refreshProfile();
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Error adding friend', isError: true });
    } finally {
      setAddingUid(null);
    }
  };

  // 3. 1-Tap Share Button
  const handleQuickShare = async () => {
    const inviteCode = profile?.inviteCode || 'HERO';
    const inviteUrl = `${window.location.origin}?invite=${inviteCode}`;
    const shareText = `Hey! Join my squad on Reps so we can track and motivate each other 💪🏼 Tap to connect in 1 tap:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Pushup Squad on Reps',
          text: shareText,
          url: inviteUrl,
        });
      } catch {
        // Fallback or dismissed
      }
    } else {
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setShareFeedback('Squad invite link copied! Send it to your friend to connect in 1 tap.');
        setTimeout(() => setShareFeedback(null), 3500);
      } catch {
        onOpenInviteModal();
      }
    }
  };

  // 4. Remove Friend (triggered when sliding block to the left)
  const handleRemoveFriend = async (friendUid: string, name: string) => {
    if (!user) return;

    try {
      await removeFriend(user.uid, friendUid);
      setFriendsList((prev) => prev.filter((f) => f.uid !== friendUid));
      await refreshProfile();
      setRemovedFriendUndo({ uid: friendUid, name });
      setActionMsg({ text: `Removed ${name} from your squad.`, isError: false });
      setTimeout(() => {
        setRemovedFriendUndo((curr) => (curr?.uid === friendUid ? null : curr));
      }, 7000);
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Error removing friend', isError: true });
    }
  };

  // Undo Remove Friend
  const handleUndoRemoveFriend = async () => {
    if (!user || !removedFriendUndo) return;
    const target = removedFriendUndo;
    setRemovedFriendUndo(null);
    try {
      const res = await addFriendByUid(user.uid, target.uid);
      if (res.success) {
        await refreshProfile();
        setActionMsg({ text: `Restored ${target.name} back to your squad!`, isError: false });
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Error restoring squad member', isError: true });
    }
  };

  // 5. Spank Friend (Reminder if no pushups within 24h, max once per day)
  const handleSpankFriend = async (friend: UserProfile) => {
    if (!user || !profile) return;

    // Play high-impact Butt Slap sound effect immediately!
    playButtSlapSound();

    // Trigger visual slap animation
    setActiveSlapEffect(friend.uid);
    setTimeout(() => setActiveSlapEffect(null), 1200);

    // Save spank to database
    try {
      const res = await spankSquadMember(
        { uid: user.uid, displayName: profile.displayName },
        { uid: friend.uid, displayName: friend.displayName, dailyReps: friend.dailyReps }
      );

      if (res.success) {
        setSpankedTodayIds((prev) => new Set([...prev, friend.uid]));
        setSpankActionMsg(`👋 SMACK! You spanked ${friend.displayName} for missing pushups!`);
        setTimeout(() => setSpankActionMsg(null), 4000);
      } else {
        setSpankActionMsg(res.message);
        setTimeout(() => setSpankActionMsg(null), 3000);
      }
    } catch (err) {
      console.error('Spank error:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Friend (Unboxed) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${themeConfig.squadHeaderIcon}`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg font-black tracking-tight ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'}`}>
                Workout Squad
              </h2>
              <p className={`text-xs ${themeConfig.textMuted}`}>
                Track & motivate your squad 💪🏼
              </p>
            </div>
          </div>

          {/* Redesigned 1-Tap Share Button (Removed "invite friends") */}
          <button
            onClick={handleQuickShare}
            title="Share your squad link (connects in 1 tap)"
            className={`flex items-center gap-3 px-5 sm:px-3.5 py-2 rounded-xl ${themeConfig.startButtonGradient} ${themeConfig.startButtonText} font-black text-xs ${themeConfig.startButtonShadow} transition-all active:scale-95 cursor-pointer shrink-0`}
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Share feedback toast */}
        {shareFeedback && (
          <div className={`p-3 rounded-xl ${themeConfig.reminderBadgeBg} border ${themeConfig.reminderBoxBorder} ${themeConfig.reminderBadgeText} text-xs flex items-center gap-2 animate-in fade-in`}>
            <Check className="w-4 h-4 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Instant Search by Name or Email with direct Add button */}
        <div className="relative">
          <div className={`flex items-center gap-2 ${themeConfig.searchBarBg} border ${themeConfig.searchBarBorder} rounded-2xl px-3.5 py-2.5 transition-colors shadow-inner`}>
            <Search className={`w-4 h-4 ${themeConfig.textMuted} shrink-0`} />
            <input
              type="text"
              placeholder="Search athlete by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={`flex-1 bg-transparent text-xs ${themeConfig.textColor} placeholder:${themeConfig.textMuted} focus:outline-none`}
            />
            {isSearching && <Loader2 className={`w-3.5 h-3.5 animate-spin ${themeConfig.idDotColor} shrink-0`} />}
            {searchQuery && !isSearching && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className={`${themeConfig.textMuted} hover:${themeConfig.textColor} p-0.5 cursor-pointer`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instant Search Results Dropdown */}
          {searchQuery.trim().length > 0 && (
            <div className={`mt-2 ${themeConfig.cardBg} border ${themeConfig.cardBorder} rounded-2xl p-2 shadow-2xl space-y-1.5 animate-in fade-in slide-in-from-top-1`}>
              {isSearching ? (
                <div className={`p-4 text-center text-xs ${themeConfig.textMuted} flex items-center justify-center gap-2`}>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  Searching athletes...
                </div>
              ) : searchResults.length === 0 ? (
                <div className={`p-4 text-center text-xs ${themeConfig.textMuted}`}>
                  No matching athletes found for "{searchQuery}".
                </div>
              ) : (
                searchResults.map((res) => (
                  <div
                    key={res.uid}
                    className={`p-2.5 rounded-xl ${themeConfig.subCardBg} hover:${themeConfig.cardBg} border ${themeConfig.subCardBorder} flex items-center justify-between gap-3 transition-colors`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {res.photoURL ? (
                        <img
                          src={res.photoURL}
                          alt={res.displayName}
                          className={`w-9 h-9 rounded-xl object-cover ring-1 ${themeConfig.avatarRing} shrink-0`}
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-xl ${themeConfig.avatarPlaceholderBg} ${themeConfig.avatarPlaceholderText} flex items-center justify-center font-bold text-xs shrink-0 border`}>
                          {res.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'} truncate`}>
                          {res.displayName}
                        </p>
                        <p className={`text-[10px] ${themeConfig.textMuted} truncate`}>
                          {res.email || `${res.totalReps || 0} total push-ups`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddSearchedUser(res)}
                      disabled={addingUid === res.uid}
                      className={`px-3 py-1.5 ${themeConfig.startButtonGradient} ${themeConfig.startButtonText} text-xs font-black rounded-lg shadow-sm flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0`}
                    >
                      {addingUid === res.uid ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>Add</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {actionMsg && (
          <p
            className={`text-xs mt-1 px-1 font-medium ${
              actionMsg.isError ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {actionMsg.text}
          </p>
        )}

        {/* Global Spank Alert Banner */}
        {spankActionMsg && (
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <span>{spankActionMsg}</span>
          </div>
        )}

        {/* Undo Remove Member Notification Banner */}
        {removedFriendUndo && (
          <div className="p-3 rounded-2xl bg-zinc-900 border border-rose-500/50 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-xs text-zinc-200">
              <span className="text-rose-400 font-bold">Removed</span>
              <span className="font-extrabold text-white">{removedFriendUndo.name}</span>
              <span className="text-zinc-400 hidden sm:inline">from your squad</span>
            </div>
            <button
              onClick={handleUndoRemoveFriend}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          </div>
        )}
      </div>

      {/* Squad Members Section Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className={`text-xs font-bold uppercase tracking-wider ${themeConfig.textMuted}`}>
          Squad Members ({friendsList.length})
        </span>
        <span className={`text-[11px] ${themeConfig.textMuted} flex items-center gap-1`}>
          <span>‹</span>
          <span>Slide left to remove</span>
        </span>
      </div>

      {loading ? (
        <div className={`p-10 text-center text-xs ${themeConfig.textMuted} flex flex-col items-center justify-center gap-2`}>
          <Loader2 className={`w-6 h-6 animate-spin ${themeConfig.statTodayColor}`} />
          Loading squad...
        </div>
      ) : friendsList.length === 0 ? (
        <div className={`p-8 text-center ${themeConfig.cardBg} border ${themeConfig.cardBorder} rounded-3xl ${themeConfig.cardShadow}`}>
          <div className={`w-12 h-12 rounded-2xl ${themeConfig.subCardBg} ${themeConfig.textMuted} flex items-center justify-center mx-auto mb-3 border ${themeConfig.subCardBorder}`}>
            <Users className="w-6 h-6" />
          </div>
          <h4 className={`text-sm font-bold ${themeConfig.isLightMode ? 'text-slate-800' : 'text-zinc-200'}`}>No workout friends in squad yet</h4>
          <p className={`text-xs ${themeConfig.textMuted} max-w-xs mx-auto mt-1 mb-4`}>
            Search by name or email above, or share your link to motivate each other!
          </p>
          <button
            onClick={handleQuickShare}
            className={`px-4 py-2 ${themeConfig.startButtonGradient} ${themeConfig.startButtonText} text-xs font-black rounded-xl ${themeConfig.startButtonShadow} transition-all cursor-pointer`}
          >
            Share Squad Link
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {friendsList.map((friend) => {
            // Rule: Safe if they've done pushups within 24h (dailyReps > 0)
            const isSafe = (friend.dailyReps || 0) > 0;
            const isAlreadySpankedToday = spankedTodayIds.has(friend.uid);
            const isBeingSlapped = activeSlapEffect === friend.uid;

            return (
              <SquadMemberCard
                key={friend.uid}
                friend={friend}
                themeConfig={themeConfig}
                isSafe={isSafe}
                isAlreadySpankedToday={isAlreadySpankedToday}
                isBeingSlapped={isBeingSlapped}
                onSpank={handleSpankFriend}
                onRemove={handleRemoveFriend}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
