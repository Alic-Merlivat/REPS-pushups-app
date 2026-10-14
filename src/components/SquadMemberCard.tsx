import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../firebase';
import { ThemeConfig } from '../context/ThemeContext';
import { Calendar, Trophy, Trash2, ChevronLeft, Sparkles } from 'lucide-react';

interface SquadMemberCardProps {
  friend: UserProfile;
  themeConfig: ThemeConfig;
  isSafe: boolean;
  isAlreadySpankedToday: boolean;
  isBeingSlapped: boolean;
  onSpank: (friend: UserProfile) => void;
  onRemove: (friendUid: string, name: string) => Promise<void> | void;
}

const REMOVE_THRESHOLD = -85;
const REVEAL_OFFSET = -80;

export const SquadMemberCard: React.FC<SquadMemberCardProps> = ({
  friend,
  themeConfig,
  isSafe,
  isAlreadySpankedToday,
  isBeingSlapped,
  onSpank,
  onRemove,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalGesture = useRef<boolean | null>(null);
  const currentOffsetRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync ref with state
  currentOffsetRef.current = offsetX;

  const isPastThreshold = offsetX <= REMOVE_THRESHOLD;

  // Execute removal with slide-out animation
  const handleExecuteRemove = () => {
    setIsRemoving(true);
    setOffsetX(-500); // Slide completely off screen to the left
    setTimeout(() => {
      onRemove(friend.uid, friend.displayName);
    }, 280);
  };

  // TOUCH GESTURE HANDLERS
  const handleTouchStart = (e: React.TouchEvent) => {
    // If tapping an interactive button or already removing, ignore
    if (isRemoving) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalGesture.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isRemoving) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - startXRef.current;
    const dy = currentY - startYRef.current;

    // Detect horizontal vs vertical intention
    if (isHorizontalGesture.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        isHorizontalGesture.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (!isHorizontalGesture.current) return;

    // Only allow sliding leftwards (negative offset)
    if (dx > 0) {
      // Small resistance when pulling right
      const damped = Math.min(dx * 0.15, 12);
      setOffsetX(damped);
    } else {
      // Sliding left
      let newOffset = dx;
      if (dx < -140) {
        newOffset = -140 + (dx + 140) * 0.35;
      }
      setOffsetX(newOffset);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || isRemoving) return;
    setIsDragging(false);

    if (currentOffsetRef.current <= REMOVE_THRESHOLD) {
      // Slided far enough left: remove member!
      handleExecuteRemove();
    } else if (currentOffsetRef.current <= -45) {
      // Reveal the remove button
      setOffsetX(REVEAL_OFFSET);
    } else {
      // Snap back to normal
      setOffsetX(0);
    }
  };

  // MOUSE DRAG HANDLERS (for desktop swipe-left support)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isRemoving || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isHorizontalGesture.current = null;
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isRemoving) return;
      const dx = e.clientX - startXRef.current;
      const dy = e.clientY - startYRef.current;

      if (isHorizontalGesture.current === null) {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          isHorizontalGesture.current = Math.abs(dx) > Math.abs(dy);
        }
      }

      if (!isHorizontalGesture.current) return;

      if (dx > 0) {
        setOffsetX(Math.min(dx * 0.15, 12));
      } else {
        let newOffset = dx;
        if (dx < -140) {
          newOffset = -140 + (dx + 140) * 0.35;
        }
        setOffsetX(newOffset);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (currentOffsetRef.current <= REMOVE_THRESHOLD) {
        handleExecuteRemove();
      } else if (currentOffsetRef.current <= -45) {
        setOffsetX(REVEAL_OFFSET);
      } else {
        setOffsetX(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isRemoving]);

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl select-none transition-all ${
        isRemoving
          ? 'max-h-0 opacity-0 my-0 py-0 border-0 duration-300 pointer-events-none'
          : 'max-h-36 opacity-100 duration-200'
      }`}
    >
      {/* BACKGROUND LAYER: The "Slide to Remove" Action */}
      <div
        onClick={handleExecuteRemove}
        className={`absolute inset-0 rounded-2xl flex items-center justify-end px-5 bg-gradient-to-l from-rose-600 via-rose-500 to-red-600 text-white cursor-pointer transition-all duration-150 ${
          isPastThreshold ? 'brightness-110' : ''
        }`}
        title="Tap to remove from squad"
      >
        <div
          className={`flex items-center gap-2 transform transition-transform duration-150 ${
            isPastThreshold ? 'scale-110 translate-x-0' : 'scale-100'
          }`}
        >
          <Trash2 className={`w-5 h-5 ${isPastThreshold ? 'animate-bounce' : ''}`} />
          <span className="font-extrabold text-xs uppercase tracking-wider">
            {isPastThreshold ? 'Release to Remove' : 'Remove'}
          </span>
        </div>
      </div>

      {/* FOREGROUND LAYER: The Member Block */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.85, 0.3, 1)',
        }}
        className={`relative z-10 w-full p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 sm:gap-3 cursor-grab active:cursor-grabbing ${
          themeConfig.isLightMode
            ? 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
            : 'bg-zinc-900/95 border-zinc-800/90 shadow-lg hover:border-zinc-700/80 backdrop-blur-sm'
        }`}
      >
        {/* Floating Butt Slap Animation Indicator */}
        {isBeingSlapped && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 animate-out fade-out zoom-out duration-1000">
            <span className="text-4xl filter drop-shadow-lg scale-125 animate-bounce">
              👋💥
            </span>
          </div>
        )}

        {/* 1. Profile Avatar & User Info Block */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar with Activity Dot */}
          <div className="relative shrink-0">
            {friend.photoURL ? (
              <img
                src={friend.photoURL}
                alt={friend.displayName}
                className={`w-11 h-11 rounded-2xl object-cover ring-2 ${themeConfig.avatarRing} shadow-sm`}
              />
            ) : (
              <div
                className={`w-11 h-11 rounded-2xl ${themeConfig.avatarPlaceholderBg} ${themeConfig.avatarPlaceholderText} flex items-center justify-center font-black text-sm shrink-0 border shadow-sm`}
              >
                {friend.displayName ? friend.displayName.charAt(0).toUpperCase() : 'H'}
              </div>
            )}
            {/* Status dot: Green if completed pushups within 24h */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                themeConfig.isLightMode ? 'border-white' : 'border-zinc-900'
              } ${isSafe ? 'bg-emerald-500 shadow-xs' : 'bg-amber-500'}`}
              title={isSafe ? 'Active today' : 'No pushups in last 24h'}
            />
          </div>

          {/* Name & Subtitle Status */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs sm:text-sm font-black tracking-tight truncate leading-tight select-none ${
                  themeConfig.isLightMode ? 'text-slate-900' : 'text-white'
                }`}
                title={friend.displayName}
              >
                {friend.displayName}
              </span>
              {friend.city && (
                <span className={`text-[10px] hidden sm:inline ${themeConfig.textMuted} truncate`}>
                  • {friend.city}
                </span>
              )}
            </div>

            <p className="text-[11px] leading-snug mt-0.5 truncate select-none">
              {isSafe ? (
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <span>💪</span>
                  <span>Active today ({friend.dailyReps || 0} reps)</span>
                </span>
              ) : (
                <span className={`${themeConfig.textMuted}`}>
                  Needs workout • 24h+
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 2. Reps Per Week Mini Block */}
        <div
          className={`${themeConfig.subCardBg} w-16 sm:w-20 h-11 sm:h-12 rounded-2xl border ${themeConfig.subCardBorder} text-center flex flex-col items-center justify-center shrink-0 shadow-inner px-1 transition-colors`}
        >
          <span
            className={`text-[9px] sm:text-[10px] ${themeConfig.statWeekColor} font-bold flex items-center justify-center gap-1 uppercase tracking-wider`}
          >
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            <span>Week</span>
          </span>
          <span
            className={`font-mono font-black text-xs sm:text-sm leading-tight mt-0.5 ${
              themeConfig.isLightMode ? 'text-slate-900' : 'text-white'
            }`}
          >
            {friend.weeklyReps || 0}
          </span>
        </div>

        {/* 3. Total Reps Mini Block */}
        <div
          className={`${themeConfig.subCardBg} w-16 sm:w-20 h-11 sm:h-12 rounded-2xl border ${themeConfig.subCardBorder} text-center flex flex-col items-center justify-center shrink-0 shadow-inner px-1 transition-colors`}
        >
          <span
            className={`text-[9px] sm:text-[10px] ${themeConfig.statTodayColor} font-bold flex items-center justify-center gap-1 uppercase tracking-wider`}
          >
            <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            <span>Total</span>
          </span>
          <span
            className={`font-mono font-black text-xs sm:text-sm ${themeConfig.statTodayColor} leading-tight mt-0.5`}
          >
            {friend.totalReps || 0}
          </span>
        </div>

        {/* 4. Spank Button (Shows ONLY emoji, no text) */}
        <div className="shrink-0 flex items-center gap-1">
          {isSafe ? (
            <div
              title="Safe! Completed pushups within the last 24h"
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${themeConfig.safeBadgeBg} border ${themeConfig.safeBadgeBorder} flex items-center justify-center select-none cursor-default shadow-inner text-lg sm:text-xl`}
            >
              <span>💪</span>
            </div>
          ) : isAlreadySpankedToday ? (
            <div
              title="Already spanked today! (Once per 24 hours)"
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${themeConfig.subCardBg} border ${themeConfig.subCardBorder} flex items-center justify-center select-none cursor-default shadow-inner text-lg sm:text-xl`}
            >
              <span>👋</span>
            </div>
          ) : (
            <button
              onClick={() => onSpank(friend)}
              title="Wake-up spank! Hasn't done pushups in 24 hours"
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${themeConfig.spankBtnGradient} ${themeConfig.spankBtnShadow} active:scale-95 transition-all flex items-center justify-center cursor-pointer animate-pulse hover:animate-none text-lg sm:text-xl`}
            >
              <span>👋</span>
            </button>
          )}

          {/* Slide Indicator Cue */}
          <div
            className="hidden sm:flex items-center text-zinc-500/50 hover:text-zinc-400 pl-0.5 cursor-grab"
            title="Slide left to remove"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
