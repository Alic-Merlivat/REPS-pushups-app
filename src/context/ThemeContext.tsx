import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'night' | 'aurora' | 'inferno' | 'holopop';

export interface ThemeConfig {
  id: AppTheme;
  name: string; // "Night", "Aurora", "Inferno", "Holopop"
  displayName: string; // "NIGHT", "AURORA", "INFERNO", "HOLOPOP"
  tagline: string;
  isLightMode?: boolean;

  // Background and Root Styles
  pageBg: string;
  textColor: string;
  textMuted: string;

  // Header & Navigation
  headerBg: string;
  headerBorder: string;
  headerLogoGradient: string;
  bottomNavBg: string;
  bottomNavInnerBg: string;
  bottomNavBorder: string;
  activePillGradient: string;
  activePillText: string;
  inactiveNavText: string;
  startButtonGradient: string;
  startButtonText: string;
  startButtonShadow: string;

  // Profile Card Styles
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  cardGlowColor: string;
  avatarRing: string;
  avatarPlaceholderBg: string;
  avatarPlaceholderText: string;
  idDotColor: string;
  idTextColor: string;

  // Metric Sub-Cards
  subCardBg: string;
  subCardBorder: string;
  statLabelColor: string;
  statSubtextColor: string;
  statTodayColor: string;
  statWeekColor: string;
  statMonthColor: string;
  statYearColor: string;
  statBestColor: string;
  statActiveColor: string;

  // Squad Reminder Box
  reminderBoxBg: string;
  reminderBoxBorder: string;
  reminderTitleColor: string;
  reminderCountColor: string;
  reminderTextColor: string;
  reminderBadgeBg: string;
  reminderBadgeText: string;

  // Style Switcher Button Styles
  styleBtnBg: string;
  styleBtnBorder: string;
  styleBtnText: string;
  styleBtnShadow: string;
  styleBtnDotColor: string;

  // Scoreboard & Leaderboard tokens
  trophyBox: string;
  chartLineColor: string;
  chartGradientColor: string;
  userRowHighlight: string;
  userRowBorder: string;
  userBadgeBg: string;
  userBadgeText: string;
  friendBadgeBg: string;
  friendBadgeText: string;

  // Squad / Friends tokens
  squadHeaderIcon: string;
  searchBarBg: string;
  searchBarBorder: string;
  searchFocusBorder: string;
  spankBtnGradient: string;
  spankBtnText: string;
  spankBtnShadow: string;
  safeBadgeBg: string;
  safeBadgeText: string;
  safeBadgeBorder: string;

  // Workout / Pushup Camera Tracker tokens
  hudRepsColor: string;
  hudProgressGradient: string;
  hudBadgeBg: string;
  hudBadgeText: string;
  hudBadgeBorder: string;
  finishButtonGradient: string;
  finishButtonText: string;
  finishButtonShadow: string;
  poseAccent: string;
  poseGlow: string;
  poseSecondary: string;
  summaryTrophyBox: string;
  summaryRepsColor: string;
}

export const THEME_CONFIGS: Record<AppTheme, ThemeConfig> = {
  night: {
    id: 'night',
    name: 'Night',
    displayName: 'NIGHT',
    tagline: 'A numbers game.',
    isLightMode: false,

    pageBg: 'bg-zinc-950',
    textColor: 'text-zinc-100',
    textMuted: 'text-zinc-400',

    headerBg: 'bg-zinc-950/80 backdrop-blur-md',
    headerBorder: 'border-zinc-800',
    headerLogoGradient: 'from-emerald-500 to-lime-400 text-zinc-950',
    bottomNavBg: 'bg-zinc-950/95 backdrop-blur-xl',
    bottomNavInnerBg: 'bg-zinc-900',
    bottomNavBorder: 'border-zinc-800',
    activePillGradient: 'bg-gradient-to-r from-emerald-500 to-lime-400 shadow-md shadow-emerald-500/20',
    activePillText: 'text-zinc-950',
    inactiveNavText: 'text-zinc-400 hover:text-white',
    startButtonGradient: 'bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300',
    startButtonText: 'text-zinc-950',
    startButtonShadow: 'shadow-lg shadow-emerald-500/25',

    cardBg: 'bg-zinc-900/85 backdrop-blur-xl',
    cardBorder: 'border-zinc-800/80',
    cardShadow: 'shadow-2xl shadow-emerald-950/20',
    cardGlowColor: 'bg-emerald-500/10',
    avatarRing: 'ring-2 ring-emerald-500/60 shadow-md',
    avatarPlaceholderBg: 'bg-zinc-800 border-emerald-500/30',
    avatarPlaceholderText: 'text-emerald-400',
    idDotColor: 'bg-emerald-400',
    idTextColor: 'text-zinc-300',

    subCardBg: 'bg-zinc-950/70 backdrop-blur-md',
    subCardBorder: 'border-zinc-800/80',
    statLabelColor: 'text-zinc-400',
    statSubtextColor: 'text-zinc-500',
    statTodayColor: 'text-white',
    statWeekColor: 'text-white',
    statMonthColor: 'text-white',
    statYearColor: 'text-white',
    statBestColor: 'text-amber-400',
    statActiveColor: 'text-emerald-400',

    reminderBoxBg: 'bg-gradient-to-r from-rose-950/25 via-zinc-950/80 to-rose-950/20',
    reminderBoxBorder: 'border-rose-500/30',
    reminderTitleColor: 'text-rose-400',
    reminderCountColor: 'text-rose-400',
    reminderTextColor: 'text-zinc-400',
    reminderBadgeBg: 'bg-rose-500/15',
    reminderBadgeText: 'text-rose-300',

    styleBtnBg: 'bg-zinc-950/80 hover:bg-zinc-900',
    styleBtnBorder: 'border-emerald-500/40',
    styleBtnText: 'text-emerald-300',
    styleBtnShadow: 'shadow-sm shadow-emerald-500/10',
    styleBtnDotColor: 'bg-emerald-400',

    trophyBox: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    chartLineColor: '#10b981',
    chartGradientColor: '#10b981',
    userRowHighlight: 'bg-emerald-500/10 hover:bg-emerald-500/15',
    userRowBorder: 'border-l-4 border-l-emerald-500',
    userBadgeBg: 'bg-emerald-500/20',
    userBadgeText: 'text-emerald-400',
    friendBadgeBg: 'bg-blue-500/20',
    friendBadgeText: 'text-blue-400',

    squadHeaderIcon: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    searchBarBg: 'bg-zinc-950',
    searchBarBorder: 'border-zinc-800 focus-within:border-emerald-500',
    searchFocusBorder: 'border-emerald-500',
    spankBtnGradient: 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-400 hover:to-amber-400',
    spankBtnText: 'text-white',
    spankBtnShadow: 'shadow-lg shadow-rose-500/25',
    safeBadgeBg: 'bg-zinc-900',
    safeBadgeText: 'text-zinc-500',
    safeBadgeBorder: 'border-zinc-800',

    hudRepsColor: 'text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.8)]',
    hudProgressGradient: 'bg-gradient-to-r from-lime-400 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]',
    hudBadgeBg: 'bg-emerald-500/40',
    hudBadgeText: 'text-emerald-200',
    hudBadgeBorder: 'border-emerald-400/50',
    finishButtonGradient: 'bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300',
    finishButtonText: 'text-zinc-950 font-black',
    finishButtonShadow: 'shadow-lg shadow-emerald-500/25',
    poseAccent: '#10b981',
    poseGlow: '#34d399',
    poseSecondary: '#bef264',
    summaryTrophyBox: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    summaryRepsColor: 'text-emerald-400',
  },

  aurora: {
    id: 'aurora',
    name: 'Aurora',
    displayName: 'AURORA',
    tagline: 'Northern lights overdrive.',
    isLightMode: false,

    pageBg: 'bg-[#08091a]',
    textColor: 'text-white',
    textMuted: 'text-slate-300',

    headerBg: 'bg-[#08091a]/80 backdrop-blur-xl',
    headerBorder: 'border-cyan-500/30',
    headerLogoGradient: 'from-cyan-400 via-teal-300 to-pink-500 text-slate-950',
    bottomNavBg: 'bg-[#070817]/95 backdrop-blur-2xl',
    bottomNavInnerBg: 'bg-slate-900/80 backdrop-blur-xl',
    bottomNavBorder: 'border-cyan-500/30',
    activePillGradient: 'bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 shadow-md shadow-cyan-500/30',
    activePillText: 'text-slate-950',
    inactiveNavText: 'text-slate-400 hover:text-cyan-200',
    startButtonGradient: 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:from-pink-400 hover:to-amber-300',
    startButtonText: 'text-white font-black',
    startButtonShadow: 'shadow-[0_0_25px_rgba(236,72,153,0.55)]',

    cardBg: 'bg-slate-900/60 backdrop-blur-2xl',
    cardBorder: 'border-cyan-500/40',
    cardShadow: 'shadow-[0_8px_32px_rgba(6,182,212,0.2)]',
    cardGlowColor: 'bg-cyan-500/15',
    avatarRing: 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]',
    avatarPlaceholderBg: 'bg-slate-800 border-cyan-400/40',
    avatarPlaceholderText: 'text-cyan-300',
    idDotColor: 'bg-cyan-400',
    idTextColor: 'text-cyan-200',

    subCardBg: 'bg-slate-950/65 backdrop-blur-md',
    subCardBorder: 'border-cyan-500/25',
    statLabelColor: 'text-cyan-200/90',
    statSubtextColor: 'text-slate-400',
    statTodayColor: 'text-pink-400 drop-shadow-[0_0_10px_rgba(244,114,182,0.4)]',
    statWeekColor: 'text-cyan-300 drop-shadow-[0_0_10px_rgba(103,232,249,0.4)]',
    statMonthColor: 'text-cyan-300',
    statYearColor: 'text-violet-300 drop-shadow-[0_0_10px_rgba(196,181,253,0.3)]',
    statBestColor: 'text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.4)]',
    statActiveColor: 'text-emerald-300 drop-shadow-[0_0_10px_rgba(110,231,183,0.4)]',

    reminderBoxBg: 'bg-gradient-to-r from-purple-950/50 via-slate-950/80 to-rose-950/40',
    reminderBoxBorder: 'border-pink-500/40',
    reminderTitleColor: 'text-pink-400',
    reminderCountColor: 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]',
    reminderTextColor: 'text-slate-300',
    reminderBadgeBg: 'bg-pink-500/20',
    reminderBadgeText: 'text-pink-300',

    styleBtnBg: 'bg-slate-950/90 hover:bg-slate-900',
    styleBtnBorder: 'border-cyan-400/50',
    styleBtnText: 'text-cyan-300',
    styleBtnShadow: 'shadow-[0_0_12px_rgba(6,182,212,0.3)]',
    styleBtnDotColor: 'bg-cyan-400',

    trophyBox: 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
    chartLineColor: '#22d3ee',
    chartGradientColor: '#22d3ee',
    userRowHighlight: 'bg-cyan-500/15 hover:bg-cyan-500/20',
    userRowBorder: 'border-l-4 border-l-cyan-400',
    userBadgeBg: 'bg-cyan-500/25 border border-cyan-400/40',
    userBadgeText: 'text-cyan-300',
    friendBadgeBg: 'bg-pink-500/20 border border-pink-400/30',
    friendBadgeText: 'text-pink-300',

    squadHeaderIcon: 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
    searchBarBg: 'bg-slate-950/80 backdrop-blur-md',
    searchBarBorder: 'border-cyan-500/30 focus-within:border-cyan-400',
    searchFocusBorder: 'border-cyan-400',
    spankBtnGradient: 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 hover:from-pink-400 hover:to-cyan-300',
    spankBtnText: 'text-white',
    spankBtnShadow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]',
    safeBadgeBg: 'bg-slate-900/80',
    safeBadgeText: 'text-cyan-200/60',
    safeBadgeBorder: 'border-cyan-500/20',

    hudRepsColor: 'text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.9)]',
    hudProgressGradient: 'bg-gradient-to-r from-teal-400 via-cyan-400 to-pink-500 shadow-[0_0_15px_rgba(34,211,238,0.9)]',
    hudBadgeBg: 'bg-cyan-500/30',
    hudBadgeText: 'text-cyan-200',
    hudBadgeBorder: 'border-cyan-400/50',
    finishButtonGradient: 'bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400',
    finishButtonText: 'text-zinc-950 font-black',
    finishButtonShadow: 'shadow-lg shadow-cyan-500/30',
    poseAccent: '#22d3ee',
    poseGlow: '#38bdf8',
    poseSecondary: '#f472b6',
    summaryTrophyBox: 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.4)]',
    summaryRepsColor: 'text-cyan-300 drop-shadow-[0_0_12px_rgba(103,232,249,0.6)]',
  },

  inferno: {
    id: 'inferno',
    name: 'Inferno',
    displayName: 'INFERNO',
    tagline: 'Molten beast mode.',
    isLightMode: false,

    pageBg: 'bg-[#0d0603]',
    textColor: 'text-orange-50',
    textMuted: 'text-amber-200/70',

    headerBg: 'bg-[#0d0603]/85 backdrop-blur-xl',
    headerBorder: 'border-orange-500/35',
    headerLogoGradient: 'from-orange-500 via-amber-400 to-red-600 text-stone-950',
    bottomNavBg: 'bg-[#0c0502]/95 backdrop-blur-2xl',
    bottomNavInnerBg: 'bg-stone-950/90',
    bottomNavBorder: 'border-orange-500/35',
    activePillGradient: 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 shadow-md shadow-orange-500/30',
    activePillText: 'text-stone-950 font-black',
    inactiveNavText: 'text-amber-200/60 hover:text-white',
    startButtonGradient: 'bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-400 hover:to-red-500',
    startButtonText: 'text-black font-black',
    startButtonShadow: 'shadow-[0_0_25px_rgba(249,115,22,0.5)]',

    cardBg: 'bg-stone-950/85 backdrop-blur-xl',
    cardBorder: 'border-orange-500/40',
    cardShadow: 'shadow-[0_8px_32px_rgba(249,115,22,0.25)]',
    cardGlowColor: 'bg-orange-500/15',
    avatarRing: 'ring-2 ring-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.7)]',
    avatarPlaceholderBg: 'bg-stone-900 border-orange-500/50',
    avatarPlaceholderText: 'text-orange-400',
    idDotColor: 'bg-orange-400',
    idTextColor: 'text-amber-200',

    subCardBg: 'bg-black/70 backdrop-blur-md',
    subCardBorder: 'border-orange-500/30',
    statLabelColor: 'text-amber-200/90',
    statSubtextColor: 'text-stone-400',
    statTodayColor: 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]',
    statWeekColor: 'text-orange-300 drop-shadow-[0_0_10px_rgba(253,186,116,0.5)]',
    statMonthColor: 'text-amber-400',
    statYearColor: 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    statBestColor: 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]',
    statActiveColor: 'text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]',

    reminderBoxBg: 'bg-gradient-to-r from-red-950/60 via-stone-950/90 to-orange-950/50',
    reminderBoxBorder: 'border-red-500/45',
    reminderTitleColor: 'text-orange-400',
    reminderCountColor: 'text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]',
    reminderTextColor: 'text-amber-200/80',
    reminderBadgeBg: 'bg-orange-500/20',
    reminderBadgeText: 'text-orange-300',

    styleBtnBg: 'bg-stone-950/90 hover:bg-stone-900',
    styleBtnBorder: 'border-orange-500/50',
    styleBtnText: 'text-orange-300',
    styleBtnShadow: 'shadow-[0_0_12px_rgba(249,115,22,0.35)]',
    styleBtnDotColor: 'bg-orange-400',

    trophyBox: 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    chartLineColor: '#f97316',
    chartGradientColor: '#f97316',
    userRowHighlight: 'bg-orange-500/15 hover:bg-orange-500/20',
    userRowBorder: 'border-l-4 border-l-orange-500',
    userBadgeBg: 'bg-orange-500/25 border border-orange-500/40',
    userBadgeText: 'text-orange-300',
    friendBadgeBg: 'bg-amber-500/20 border border-amber-400/30',
    friendBadgeText: 'text-amber-300',

    squadHeaderIcon: 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    searchBarBg: 'bg-stone-950/80 backdrop-blur-md',
    searchBarBorder: 'border-orange-500/35 focus-within:border-orange-400',
    searchFocusBorder: 'border-orange-400',
    spankBtnGradient: 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 hover:from-red-500 hover:to-amber-300',
    spankBtnText: 'text-white',
    spankBtnShadow: 'shadow-[0_0_20px_rgba(249,115,22,0.6)]',
    safeBadgeBg: 'bg-stone-900/80',
    safeBadgeText: 'text-amber-200/60',
    safeBadgeBorder: 'border-orange-500/20',

    hudRepsColor: 'text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.9)]',
    hudProgressGradient: 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 shadow-[0_0_15px_rgba(249,115,22,0.9)]',
    hudBadgeBg: 'bg-orange-500/30',
    hudBadgeText: 'text-amber-200',
    hudBadgeBorder: 'border-orange-400/50',
    finishButtonGradient: 'bg-gradient-to-r from-orange-500 via-amber-400 to-red-500 hover:from-orange-400 hover:to-red-400',
    finishButtonText: 'text-zinc-950 font-black',
    finishButtonShadow: 'shadow-lg shadow-orange-500/35',
    poseAccent: '#f97316',
    poseGlow: '#fb923c',
    poseSecondary: '#fbbf24',
    summaryTrophyBox: 'bg-orange-500/15 text-orange-400 border border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.4)]',
    summaryRepsColor: 'text-orange-400 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]',
  },

  holopop: {
    id: 'holopop',
    name: 'Holopop',
    displayName: 'HOLOPOP',
    tagline: 'Candy iridescent gloss.',
    isLightMode: true,

    pageBg: 'bg-gradient-to-b from-[#f3e8ff] via-[#ffe4e6] to-[#e0f2fe]',
    textColor: 'text-slate-900',
    textMuted: 'text-slate-600',

    headerBg: 'bg-white/70 backdrop-blur-xl',
    headerBorder: 'border-pink-300/50',
    headerLogoGradient: 'from-fuchsia-500 via-pink-500 to-cyan-400 text-white',
    bottomNavBg: 'bg-white/80 backdrop-blur-2xl',
    bottomNavInnerBg: 'bg-white/90',
    bottomNavBorder: 'border-pink-200/80',
    activePillGradient: 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-md shadow-cyan-400/30',
    activePillText: 'text-slate-950 font-black',
    inactiveNavText: 'text-slate-600 hover:text-slate-950',
    startButtonGradient: 'bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400',
    startButtonText: 'text-white font-black',
    startButtonShadow: 'shadow-[0_0_20px_rgba(249,115,22,0.4)]',

    cardBg: 'bg-white/75 backdrop-blur-2xl',
    cardBorder: 'border-white/90',
    cardShadow: 'shadow-[0_12px_36px_rgba(168,140,240,0.22)]',
    cardGlowColor: 'bg-pink-400/10',
    avatarRing: 'ring-2 ring-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.4)]',
    avatarPlaceholderBg: 'bg-pink-100 border-pink-300',
    avatarPlaceholderText: 'text-pink-500',
    idDotColor: 'bg-emerald-500',
    idTextColor: 'text-slate-700',

    subCardBg: 'bg-white/80 backdrop-blur-md',
    subCardBorder: 'border-purple-200/70',
    statLabelColor: 'text-slate-700 font-bold',
    statSubtextColor: 'text-slate-500',
    statTodayColor: 'text-pink-600 drop-shadow-[0_0_4px_rgba(219,39,119,0.2)]',
    statWeekColor: 'text-indigo-600 drop-shadow-[0_0_4px_rgba(79,70,229,0.2)]',
    statMonthColor: 'text-teal-600 drop-shadow-[0_0_4px_rgba(13,148,136,0.2)]',
    statYearColor: 'text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.2)]',
    statBestColor: 'text-amber-500 font-black',
    statActiveColor: 'text-teal-600 font-black',

    reminderBoxBg: 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-500 text-white',
    reminderBoxBorder: 'border-pink-300/70',
    reminderTitleColor: 'text-white',
    reminderCountColor: 'text-yellow-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.4)]',
    reminderTextColor: 'text-white/90',
    reminderBadgeBg: 'bg-white/20',
    reminderBadgeText: 'text-white font-bold',

    styleBtnBg: 'bg-white/90 hover:bg-white',
    styleBtnBorder: 'border-pink-300/80',
    styleBtnText: 'text-pink-600',
    styleBtnShadow: 'shadow-[0_0_12px_rgba(244,114,182,0.3)]',
    styleBtnDotColor: 'bg-pink-500',

    trophyBox: 'bg-pink-100 text-pink-600 border border-pink-300 shadow-sm',
    chartLineColor: '#ec4899',
    chartGradientColor: '#ec4899',
    userRowHighlight: 'bg-pink-500/10 hover:bg-pink-500/15',
    userRowBorder: 'border-l-4 border-l-pink-500',
    userBadgeBg: 'bg-pink-100 border border-pink-300',
    userBadgeText: 'text-pink-600',
    friendBadgeBg: 'bg-purple-100 border border-purple-300',
    friendBadgeText: 'text-purple-600',

    squadHeaderIcon: 'bg-pink-100 text-pink-600 border border-pink-300 shadow-sm',
    searchBarBg: 'bg-white/90 backdrop-blur-md',
    searchBarBorder: 'border-pink-300 focus-within:border-pink-500',
    searchFocusBorder: 'border-pink-500',
    spankBtnGradient: 'bg-gradient-to-r from-fuchsia-600 via-pink-500 to-rose-400 hover:from-fuchsia-500 hover:to-rose-300',
    spankBtnText: 'text-white font-black',
    spankBtnShadow: 'shadow-[0_0_18px_rgba(236,72,153,0.4)]',
    safeBadgeBg: 'bg-slate-100',
    safeBadgeText: 'text-slate-500',
    safeBadgeBorder: 'border-slate-200',

    hudRepsColor: 'text-pink-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.9)]',
    hudProgressGradient: 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 shadow-[0_0_15px_rgba(236,72,153,0.8)]',
    hudBadgeBg: 'bg-pink-500/30',
    hudBadgeText: 'text-pink-100',
    hudBadgeBorder: 'border-pink-400/50',
    finishButtonGradient: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-400 hover:to-indigo-400',
    finishButtonText: 'text-white font-black',
    finishButtonShadow: 'shadow-lg shadow-pink-500/35',
    poseAccent: '#ec4899',
    poseGlow: '#f472b6',
    poseSecondary: '#06b6d4',
    summaryTrophyBox: 'bg-pink-100 text-pink-600 border border-pink-300 shadow-sm',
    summaryRepsColor: 'text-pink-600 drop-shadow-[0_0_8px_rgba(219,39,119,0.3)]',
  },
};

const THEME_CYCLE: AppTheme[] = ['night', 'aurora', 'inferno', 'holopop'];

interface ThemeContextType {
  theme: AppTheme;
  themeConfig: ThemeConfig;
  setTheme: (theme: AppTheme) => void;
  cycleTheme: () => void;
  themeLabel: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('reps_app_theme') as AppTheme;
      if (saved && THEME_CONFIGS[saved]) {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'night';
  });

  const setTheme = (newTheme: AppTheme) => {
    if (THEME_CONFIGS[newTheme]) {
      setThemeState(newTheme);
      try {
        localStorage.setItem('reps_app_theme', newTheme);
      } catch {
        // Ignore storage error
      }
    }
  };

  const cycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  };

  const themeConfig = THEME_CONFIGS[theme];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeConfig,
        setTheme,
        cycleTheme,
        themeLabel: themeConfig.displayName,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
