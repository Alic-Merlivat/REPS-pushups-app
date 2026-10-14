/**
 * Reps Notification System
 * - Reminds users every second day at random times between 9:30 and 19:00 about daily push-up goals
 * - Sends instant notification when spanked by a squad member
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      // Send a welcome confirmation
      sendNotification('🔔 Notifications Enabled!', {
        body: 'You will receive goal reminders every 2nd day and alerts when your squad spanks you!',
        icon: '/pwa-192x192.png',
        tag: 'reps-welcome',
      });
      // Initialize the schedule
      scheduleNextEverySecondDayReminder();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Send a notification using ServiceWorkerRegistration if available, falling back to Notification API
 */
export async function sendNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const notificationOptions: NotificationOptions = {
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    ...options,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notificationOptions);
        return;
      }
    }
  } catch (e) {
    // fallback to window.Notification
  }

  try {
    new Notification(title, notificationOptions);
  } catch (err) {
    console.warn('Notification display error:', err);
  }
}

/**
 * Generates a random time between 9:30 AM (9:30) and 7:00 PM (19:00) on a given target Date.
 */
function getRandomTimeBetween930And1900(targetDate: Date): Date {
  const result = new Date(targetDate);
  // Total minutes between 9:30 (570) and 19:00 (1140) = 570 minutes range
  const minMinute = 9 * 60 + 30; // 570
  const maxMinute = 19 * 60;      // 1140
  const randomTotalMinutes = minMinute + Math.floor(Math.random() * (maxMinute - minMinute + 1));

  const hours = Math.floor(randomTotalMinutes / 60);
  const minutes = randomTotalMinutes % 60;

  result.setHours(hours, minutes, 0, 0);
  return result;
}

const STORAGE_KEY_NEXT_REMINDER = 'reps_next_reminder_ts';
const STORAGE_KEY_LAST_SENT_DATE = 'reps_last_reminder_date_str';

/**
 * Schedules the next every-second-day reminder timestamp in localStorage
 */
export function scheduleNextEverySecondDayReminder(forceDaysAhead?: number): void {
  const now = new Date();
  const daysAhead = forceDaysAhead !== undefined ? forceDaysAhead : 2;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);

  const scheduledTime = getRandomTimeBetween930And1900(targetDate);
  localStorage.setItem(STORAGE_KEY_NEXT_REMINDER, scheduledTime.getTime().toString());
}

/**
 * Periodic check: fires the reminder if the scheduled time has arrived.
 * Checks that reminders are sent every 2nd day between 9:30 and 19:00.
 */
export function checkAndTriggerGoalReminder(): void {
  if (getNotificationPermission() !== 'granted') return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const lastSentDate = localStorage.getItem(STORAGE_KEY_LAST_SENT_DATE);

  // If already sent today, wait until the next scheduled cycle
  if (lastSentDate === todayStr) return;

  const savedTs = localStorage.getItem(STORAGE_KEY_NEXT_REMINDER);
  let nextReminderTs = savedTs ? parseInt(savedTs, 10) : 0;

  // If no reminder is scheduled or saved is corrupted, schedule one for either today (if before 19:00) or 2 days later
  if (!nextReminderTs || isNaN(nextReminderTs)) {
    const scheduledToday = getRandomTimeBetween930And1900(now);
    if (now.getTime() < scheduledToday.getTime()) {
      localStorage.setItem(STORAGE_KEY_NEXT_REMINDER, scheduledToday.getTime().toString());
      nextReminderTs = scheduledToday.getTime();
    } else {
      scheduleNextEverySecondDayReminder(2);
      return;
    }
  }

  // Check if current time has passed the scheduled reminder timestamp
  if (now.getTime() >= nextReminderTs) {
    // Check if within the 9:30 - 19:00 window or shortly after
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTotalMin = currentHour * 60 + currentMin;

    if (currentTotalMin >= 570 && currentTotalMin <= 1170) {
      // Fire notification
      sendNotification('💪 Push-Up Goal Reminder!', {
        body: "Don't break your streak! Drop down and crush today's reps 💪🏼",
        icon: '/pwa-192x192.png',
        tag: 'reps-goal-reminder',
      });

      localStorage.setItem(STORAGE_KEY_LAST_SENT_DATE, todayStr);
      // Next reminder is 2 days from now at a random time between 9:30 and 19:00
      scheduleNextEverySecondDayReminder(2);
    } else if (currentTotalMin > 1170) {
      // Passed the day window without app being open, reschedule for 2 days from now
      scheduleNextEverySecondDayReminder(2);
    }
  }
}

/**
 * Triggers an instant notification when the user has been spanked by a squad member
 */
export function notifyUserSpanked(senderName?: string): void {
  const fromText = senderName ? `${senderName}` : 'a squad member';
  sendNotification('👋 SMACK! Squad Reminder', {
    body: `You were just spanked by ${fromText} for skipping Reps, you little diva 💅🏼!`,
    icon: '/pwa-192x192.png',
    tag: `spank-${Date.now()}`,
  });
}
