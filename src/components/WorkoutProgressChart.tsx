import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  WorkoutSession,
  UserProfile,
  getUserProfile,
  subscribeToUserWorkouts,
  subscribeToMultipleUsersWorkouts,
} from '../firebase';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Play,
  Sparkles,
} from 'lucide-react';

export type ChartTimeframe = '30d' | '90d' | '1y' | 'firstDay';

interface ChartPoint {
  dateKey: string;
  displayDate: string;
  dayNumber?: number;
  reps: number | null;
  userDaily?: number | null;
  durationSeconds: number;
  sessionsCount: number;
  [key: string]: any;
}

interface SquadMemberInfo {
  uid: string;
  displayName: string;
  photoURL?: string;
  totalReps: number;
  color: string;
}

interface WorkoutProgressChartProps {
  onStartWorkout?: () => void;
  className?: string;
}

const SQUAD_COLORS = [
  '#38bdf8', // sky-400
  '#f59e0b', // amber-500
  '#a855f7', // purple-500
  '#f43f5e', // rose-500
  '#84cc16', // lime-500
];

export const WorkoutProgressChart: React.FC<WorkoutProgressChartProps> = ({
  onStartWorkout,
  className = '',
}) => {
  const { user, profile } = useAuth();
  const { themeConfig, theme } = useTheme();
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('firstDay');
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [topSquadMembers, setTopSquadMembers] = useState<SquadMemberInfo[]>([]);
  const [squadWorkouts, setSquadWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time workouts of current user
  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserWorkouts(user.uid, (data) => {
      setWorkouts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Load top 5 squad members from user's friends list
  useEffect(() => {
    let isMounted = true;
    async function loadSquadMembers() {
      if (!profile?.friends || profile.friends.length === 0) {
        setTopSquadMembers([]);
        return;
      }

      try {
        const memberPromises = profile.friends.map((uid) => getUserProfile(uid));
        const results = await Promise.all(memberPromises);
        if (!isMounted) return;

        const validProfiles = results.filter((p): p is UserProfile => p !== null);
        // Rank squad members by totalReps descending and take top 5
        const top5 = validProfiles
          .sort((a, b) => (b.totalReps || 0) - (a.totalReps || 0))
          .slice(0, 5)
          .map((m, idx) => ({
            uid: m.uid,
            displayName: m.displayName || 'Squad Member',
            photoURL: m.photoURL,
            totalReps: m.totalReps || 0,
            color: SQUAD_COLORS[idx % SQUAD_COLORS.length],
          }));

        setTopSquadMembers(top5);
      } catch (err) {
        console.error('Failed to load squad members for progress chart:', err);
      }
    }

    loadSquadMembers();
    return () => {
      isMounted = false;
    };
  }, [profile?.friends]);

  // Subscribe to workouts for the top 5 squad members
  useEffect(() => {
    if (topSquadMembers.length === 0) {
      setSquadWorkouts([]);
      return;
    }

    const squadUids = topSquadMembers.map((m) => m.uid);
    const unsubscribe = subscribeToMultipleUsersWorkouts(squadUids, (data) => {
      setSquadWorkouts(data);
    });

    return () => unsubscribe();
  }, [topSquadMembers]);

  // Aggregate pushup data according to selected timeframe (30d, 90d, 1y, firstDay)
  const { chartData, stats } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Group user's workouts by date string "YYYY-MM-DD"
    const userWorkoutsByDate: Record<string, { reps: number; duration: number; count: number }> = {};
    for (const w of workouts) {
      const key = w.dateStr;
      if (!key) continue;
      if (!userWorkoutsByDate[key]) {
        userWorkoutsByDate[key] = { reps: 0, duration: 0, count: 0 };
      }
      userWorkoutsByDate[key].reps += w.reps || 0;
      userWorkoutsByDate[key].duration += w.durationSeconds || 0;
      userWorkoutsByDate[key].count += 1;
    }

    // Group squad members workouts by userId and date string
    const squadWorkoutsByUserAndDate: Record<string, Record<string, number>> = {};
    for (const sw of squadWorkouts) {
      if (!sw.userId || !sw.dateStr) continue;
      if (!squadWorkoutsByUserAndDate[sw.userId]) {
        squadWorkoutsByUserAndDate[sw.userId] = {};
      }
      squadWorkoutsByUserAndDate[sw.userId][sw.dateStr] =
        (squadWorkoutsByUserAndDate[sw.userId][sw.dateStr] || 0) + (sw.reps || 0);
    }

    // SPECIAL MODE: "First day"
    // Normalized comparison starting from each athlete's own First Day (Day 1).
    if (timeframe === 'firstDay') {
      const userDates = Object.keys(userWorkoutsByDate).sort();
      let userStartDate = userDates.length > 0 ? new Date(userDates[0] + 'T00:00:00') : new Date(now);
      if (isNaN(userStartDate.getTime())) userStartDate = new Date(now);
      userStartDate.setHours(0, 0, 0, 0);

      const userElapsedDays = userDates.length > 0
        ? Math.max(1, Math.round((now.getTime() - userStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        : 0;

      const userCumulative: number[] = [];
      const userDailyList: number[] = [];
      let runningUserTotal = 0;
      for (let i = 0; i < userElapsedDays; i++) {
        const d = new Date(userStartDate);
        d.setDate(d.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${dayStr}`;
        const dailyReps = userWorkoutsByDate[key]?.reps || 0;
        runningUserTotal += dailyReps;
        userCumulative.push(runningUserTotal);
        userDailyList.push(dailyReps);
      }

      // Member elapsed days and cumulative progressions from their respective first day
      const memberElapsedDays: Record<string, number> = {};
      const memberCumulative: Record<string, number[]> = {};
      const memberDailyList: Record<string, number[]> = {};

      for (const member of topSquadMembers) {
        const memWorkouts = squadWorkoutsByUserAndDate[member.uid] || {};
        const memDates = Object.keys(memWorkouts).sort();

        if (memDates.length > 0) {
          let memStartDate = new Date(memDates[0] + 'T00:00:00');
          if (isNaN(memStartDate.getTime())) memStartDate = new Date(now);
          memStartDate.setHours(0, 0, 0, 0);

          const memDays = Math.max(
            1,
            Math.round((now.getTime() - memStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          );
          memberElapsedDays[member.uid] = memDays;

          const cumList: number[] = [];
          const dailyList: number[] = [];
          let runningMemTotal = 0;
          for (let i = 0; i < memDays; i++) {
            const d = new Date(memStartDate);
            d.setDate(d.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayStr = String(d.getDate()).padStart(2, '0');
            const key = `${y}-${m}-${dayStr}`;
            const dailyReps = memWorkouts[key] || 0;
            runningMemTotal += dailyReps;
            cumList.push(runningMemTotal);
            dailyList.push(dailyReps);
          }
          memberCumulative[member.uid] = cumList;
          memberDailyList[member.uid] = dailyList;
        } else if ((member.totalReps || 0) > 0) {
          // If member has profile reps but historical docs aren't present yet, initialize day 1
          memberElapsedDays[member.uid] = 1;
          memberCumulative[member.uid] = [member.totalReps];
          memberDailyList[member.uid] = [member.totalReps];
        } else {
          memberElapsedDays[member.uid] = 0;
          memberCumulative[member.uid] = [];
          memberDailyList[member.uid] = [];
        }
      }

      // Max days across all participants
      const allDays = [userElapsedDays, ...Object.values(memberElapsedDays)];
      const maxDays = Math.max(14, ...allDays);

      const points: ChartPoint[] = [];
      for (let i = 0; i < maxDays; i++) {
        const dayNumber = i + 1;
        const displayDate = `Day ${dayNumber}`;
        const hasUserData = i < userElapsedDays;

        const pointObj: ChartPoint = {
          dateKey: `Day ${dayNumber}`,
          displayDate,
          dayNumber,
          reps: hasUserData ? userCumulative[i] : null,
          userDaily: hasUserData ? userDailyList[i] : null,
          durationSeconds: 0,
          sessionsCount: 0,
        };

        for (const member of topSquadMembers) {
          const memDays = memberElapsedDays[member.uid] || 0;
          if (i < memDays) {
            pointObj[member.uid] = memberCumulative[member.uid][i];
            pointObj[`${member.uid}_daily`] = memberDailyList[member.uid][i];
          } else {
            pointObj[member.uid] = null;
          }
        }

        points.push(pointObj);
      }

      const totalReps = userCumulative.length > 0 ? userCumulative[userCumulative.length - 1] : 0;
      let activeDaysCount = 0;
      let maxRepsDay = 0;
      for (const d of userDailyList) {
        if (d > 0) activeDaysCount++;
        if (d > maxRepsDay) maxRepsDay = d;
      }
      const dailyAvg = activeDaysCount > 0 ? Math.round(totalReps / activeDaysCount) : 0;

      return {
        chartData: points,
        stats: {
          totalReps,
          dailyAvg,
          bestDayReps: maxRepsDay,
          bestDayDate: 'Best Day',
          activeDays: activeDaysCount,
        },
      };
    }

    // CALENDAR TIMEFRAMES: 30 Days, 90 Days, 1 Year
    // In 30 days, 90 days, and 1 year: reps add up cumulatively across the selected window!
    let daysCount = 30;
    if (timeframe === '30d') {
      daysCount = 30;
    } else if (timeframe === '90d') {
      daysCount = 90;
    } else if (timeframe === '1y') {
      daysCount = 365;
    }

    const points: ChartPoint[] = [];
    let totalRepsInPeriod = 0;
    let activeDaysCount = 0;
    let maxRepsDay = 0;
    let bestDayDate = '';

    // Track running cumulative total across the window
    let runningCumulativeUser = 0;
    const runningCumulativeSquad: Record<string, number> = {};
    for (const member of topSquadMembers) {
      runningCumulativeSquad[member.uid] = 0;
    }

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      let displayDate = '';
      if (daysCount <= 90) {
        displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else {
        displayDate = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      }

      const record = userWorkoutsByDate[dateKey] || { reps: 0, duration: 0, count: 0 };
      const dailyReps = record.reps;

      totalRepsInPeriod += dailyReps;
      runningCumulativeUser += dailyReps;

      if (dailyReps > 0) {
        activeDaysCount++;
        if (dailyReps > maxRepsDay) {
          maxRepsDay = dailyReps;
          bestDayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
      }

      // Reps add up (cumulative sum across the timeframe)
      const pointObj: ChartPoint = {
        dateKey,
        displayDate,
        reps: runningCumulativeUser,
        userDaily: dailyReps,
        durationSeconds: record.duration,
        sessionsCount: record.count,
      };

      for (const member of topSquadMembers) {
        const memDaily = squadWorkoutsByUserAndDate[member.uid]?.[dateKey] || 0;
        runningCumulativeSquad[member.uid] += memDaily;
        pointObj[member.uid] = runningCumulativeSquad[member.uid];
        pointObj[`${member.uid}_daily`] = memDaily;
      }

      points.push(pointObj);
    }

    // For 1-year view, sample down if needed while preserving running cumulative curve
    let finalPoints = points;
    if (daysCount > 120) {
      const weeklyPoints: ChartPoint[] = [];
      const chunkSize = 7;
      for (let i = 0; i < points.length; i += chunkSize) {
        const chunk = points.slice(i, i + chunkSize);
        const lastPoint = chunk[chunk.length - 1];
        const chunkDailySum = chunk.reduce((acc, p) => acc + (p.userDaily || 0), 0);
        const chunkDuration = chunk.reduce((acc, p) => acc + p.durationSeconds, 0);
        const chunkCount = chunk.reduce((acc, p) => acc + p.sessionsCount, 0);

        const weeklyObj: ChartPoint = {
          dateKey: lastPoint.dateKey,
          displayDate: lastPoint.displayDate,
          reps: lastPoint.reps, // cumulative at end of week
          userDaily: chunkDailySum,
          durationSeconds: chunkDuration,
          sessionsCount: chunkCount,
        };

        for (const member of topSquadMembers) {
          weeklyObj[member.uid] = lastPoint[member.uid];
          weeklyObj[`${member.uid}_daily`] = chunk.reduce((acc, p) => acc + (p[`${member.uid}_daily`] || 0), 0);
        }

        weeklyPoints.push(weeklyObj);
      }
      finalPoints = weeklyPoints;
    }

    const dailyAvg = activeDaysCount > 0 ? Math.round(totalRepsInPeriod / activeDaysCount) : 0;

    return {
      chartData: finalPoints,
      stats: {
        totalReps: totalRepsInPeriod,
        dailyAvg,
        bestDayReps: maxRepsDay,
        bestDayDate: bestDayDate || '-',
        activeDays: activeDaysCount,
      },
    };
  }, [workouts, squadWorkouts, topSquadMembers, timeframe]);

  // Dynamic X-Axis Interval Calculation
  const xAxisInterval = useMemo(() => {
    if (timeframe === 'firstDay') {
      const totalPoints = chartData.length;
      if (totalPoints <= 14) return 1;
      if (totalPoints <= 35) return 4;
      if (totalPoints <= 90) return 9;
      return Math.floor(totalPoints / 6);
    }
    return timeframe === '30d' ? 4 : timeframe === '90d' ? 12 : 6;
  }, [timeframe, chartData.length]);

  // Dark Mode Glass Tooltip showing You and Top 5 Squad Members
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ChartPoint = payload[0].payload;
      const isFirstDayMode = timeframe === 'firstDay';

      return (
        <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-2xl p-3 shadow-2xl text-xs min-w-[190px] space-y-1.5">
          <p className="text-zinc-400 font-semibold flex items-center gap-1.5 pb-1 border-b border-zinc-800">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isFirstDayMode ? `Day ${data.dayNumber} from start` : data.dateKey}</span>
          </p>

          {/* Your Reps */}
          <div className="flex items-center justify-between gap-3 text-emerald-400 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>You:</span>
            </span>
            <span className="font-mono text-sm font-black">
              {data.reps !== null && data.reps !== undefined
                ? `${data.reps} reps total`
                : '—'}
            </span>
          </div>
          {data.userDaily !== null && data.userDaily !== undefined && data.userDaily > 0 && (
            <p className="text-[10px] text-emerald-400/80 pl-3.5 -mt-0.5 font-medium">
              +{data.userDaily} reps on {isFirstDayMode ? `Day ${data.dayNumber}` : data.displayDate}
            </p>
          )}

          {/* Top Squad Members Reps */}
          {topSquadMembers.map((member) => {
            const val = data[member.uid];
            const daily = data[`${member.uid}_daily`];
            const hasData = val !== null && val !== undefined;

            return (
              <div key={member.uid} className="pt-0.5">
                <div className="flex items-center justify-between gap-3 text-zinc-300 font-medium text-[11px]">
                  <span className="flex items-center gap-1.5 truncate max-w-[120px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: member.color }}
                    />
                    <span className="truncate">{member.displayName}:</span>
                  </span>
                  <span className="font-mono text-white font-bold">
                    {hasData ? `${val} total` : '—'}
                  </span>
                </div>
                {hasData && daily > 0 && (
                  <p className="text-[10px] text-zinc-400 pl-3.5 font-medium">
                    +{daily} reps on {isFirstDayMode ? `Day ${data.dayNumber}` : data.displayDate}
                  </p>
                )}
              </div>
            );
          })}

          {!isFirstDayMode && data.sessionsCount > 0 && (
            <p className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60 flex items-center justify-between">
              <span>{data.sessionsCount} session{data.sessionsCount > 1 ? 's' : ''}</span>
              {data.durationSeconds > 0 && (
                <span>{Math.round(data.durationSeconds / 60)}m</span>
              )}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const hasAnyData = stats.totalReps > 0;

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Header with Title and Live Badge */}
      <div className="flex items-center gap-2.5 px-1 pt-1">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${themeConfig.trophyBox}`}>
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h3 className={`text-base font-black tracking-tight flex items-center gap-2 ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'}`}>
            Pushup Progress
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${themeConfig.reminderBadgeBg} ${themeConfig.reminderBadgeText}`}>
              Live
            </span>
          </h3>
          <p className={`text-xs ${themeConfig.textMuted}`}>
            {timeframe === 'firstDay'
              ? 'Progression comparison from Day 1'
              : 'Cumulative pushup progression curve'}
          </p>
        </div>
      </div>

      {/* Timeframe Filter Tabs: First day, 30 Days, 90 Days, 1 Year - Extended Full Width */}
      <div className={`grid grid-cols-4 gap-1.5 p-1 ${themeConfig.subCardBg} border ${themeConfig.subCardBorder} rounded-2xl shadow-sm`}>
        <button
          onClick={() => setTimeframe('firstDay')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
            timeframe === 'firstDay'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
          title="Compare progression curves starting from each athlete's First Day"
        >
          <span>First day</span>
        </button>
        <button
          onClick={() => setTimeframe('30d')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
            timeframe === '30d'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
        >
          <span>30 Days</span>
        </button>
        <button
          onClick={() => setTimeframe('90d')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
            timeframe === '90d'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
        >
          <span>90 Days</span>
        </button>
        <button
          onClick={() => setTimeframe('1y')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
            timeframe === '1y'
              ? `${themeConfig.activePillGradient} ${themeConfig.activePillText}`
              : `${themeConfig.inactiveNavText}`
          }`}
        >
          <span>1 Year</span>
        </button>
      </div>

      {/* Progress Chart Canvas Card */}
      <div className={`${themeConfig.cardBg} border ${themeConfig.cardBorder} rounded-3xl p-4 sm:p-5 ${themeConfig.cardShadow} relative overflow-hidden transition-colors`}>
        {/* Background Ambient Glow */}
        <div className={`absolute top-0 right-0 w-64 h-64 ${themeConfig.cardGlowColor} rounded-full blur-3xl pointer-events-none`} />

      {/* Legend: Only keep "YOU" so the user can easily tell which line is theirs */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-3 px-1 text-xs">
        {/* You Legend */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${themeConfig.userBadgeBg} border ${themeConfig.userBadgeText} font-bold`}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeConfig.chartLineColor }} />
          <span>You</span>
          <span className="font-mono text-[10px] opacity-80">({stats.totalReps})</span>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="w-full h-64 relative">
        {loading ? (
          <div className={`w-full h-full flex items-center justify-center text-xs ${themeConfig.textMuted}`}>
            Loading workout history...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -22, bottom: 0 }}
            >
              <defs>
                <linearGradient id="repsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={themeConfig.chartGradientColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={themeConfig.chartGradientColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke={themeConfig.isLightMode ? '#e2e8f0' : '#27272a'}
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="displayDate"
                stroke={themeConfig.isLightMode ? '#94a3b8' : '#52525b'}
                tick={{ fontSize: 10, fill: themeConfig.isLightMode ? '#64748b' : '#71717a' }}
                tickLine={false}
                interval={xAxisInterval}
              />

              <YAxis
                stroke={themeConfig.isLightMode ? '#94a3b8' : '#52525b'}
                tick={{ fontSize: 10, fill: themeConfig.isLightMode ? '#64748b' : '#71717a' }}
                tickLine={false}
                allowDecimals={false}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Glowing shaded area under YOUR line */}
              <Area
                type="monotone"
                dataKey="reps"
                name="You"
                fill="url(#repsGradient)"
                stroke="none"
                connectNulls={false}
              />

              {/* Squad members lines (rendered behind your line) */}
              {topSquadMembers.map((member) => (
                <Line
                  key={member.uid}
                  type="monotone"
                  dataKey={member.uid}
                  name={member.displayName}
                  stroke={member.color}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={
                    chartData.length <= 30
                      ? { r: 2.5, fill: member.color, stroke: themeConfig.isLightMode ? '#ffffff' : '#09090b', strokeWidth: 1 }
                      : false
                  }
                  activeDot={{
                    r: 5,
                    fill: member.color,
                    stroke: themeConfig.isLightMode ? '#ffffff' : '#09090b',
                    strokeWidth: 2,
                  }}
                />
              ))}

              {/* High-visibility Themed Line for YOU */}
              <Line
                type="monotone"
                dataKey="reps"
                name="You"
                stroke={themeConfig.chartLineColor}
                strokeWidth={3.5}
                connectNulls={false}
                dot={
                  chartData.length <= 30
                    ? { r: 3, fill: themeConfig.chartLineColor, stroke: themeConfig.isLightMode ? '#ffffff' : '#09090b', strokeWidth: 2 }
                    : false
                }
                activeDot={{
                  r: 6,
                  fill: themeConfig.chartLineColor,
                  stroke: themeConfig.isLightMode ? '#ffffff' : '#09090b',
                  strokeWidth: 2,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* Empty state notice if user has 0 workouts in timeframe */}
        {!loading && !hasAnyData && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center ${themeConfig.subCardBg} backdrop-blur-sm rounded-2xl p-4 text-center`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 ${themeConfig.trophyBox}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <p className={`text-xs font-bold ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'}`}>No Pushup Sessions in This Period</p>
            <p className={`text-[11px] ${themeConfig.textMuted} max-w-xs mt-0.5`}>
              Start an AI camera session now to plot your pushups on the progress curve!
            </p>
            {onStartWorkout && (
              <button
                onClick={onStartWorkout}
                className={`mt-3 px-3.5 py-1.5 ${themeConfig.startButtonGradient} ${themeConfig.startButtonText} text-xs font-black rounded-xl transition-all ${themeConfig.startButtonShadow} flex items-center gap-1.5 cursor-pointer active:scale-95`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Pushups
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Insight */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {timeframe === 'firstDay'
            ? 'Curves start on First Training day and progress forward'
            : `Showing cumulative progression curve over ${timeframe === '30d' ? '30 days' : timeframe === '90d' ? '90 days' : '1 year'}`}
        </span>
        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Target: 200 reps/day
        </span>
      </div>
    </div>
  </div>
);
};
