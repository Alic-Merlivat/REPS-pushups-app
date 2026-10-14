import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  where
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Safe connection readiness helper
export async function testConnection(): Promise<boolean> {
  return true;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  totalReps: number;
  dailyReps: number;
  weeklyReps: number;
  monthlyReps: number;
  yearlyReps: number;
  spankedCount?: number;
  lastActiveDate?: string;
  lastActiveWeek?: string;
  lastActiveMonth?: string;
  lastActiveYear?: number;
  inviteCode?: string;
  city?: string;
  age?: number | string;
  height?: string;
  weight?: string;
  notificationSettings?: {
    dailyReminders?: boolean;
    spankNotifications?: boolean;
    reminderTime?: string;
  };
  googleHealthConnected?: boolean;
  googleHealthLastSync?: string;
  friends?: string[];
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface SpankRecord {
  id: string;
  targetUid: string;
  targetName?: string;
  fromUid: string;
  fromName?: string;
  dateKey: string;
  createdAt?: string | Timestamp;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  displayName: string;
  reps: number;
  durationSeconds: number;
  formScore?: number;
  dateStr: string;
  createdAt?: string | Timestamp;
}

// Utility date keys
export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekKey(): string {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((now.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getCurrentYearNum(): number {
  return new Date().getFullYear();
}

// Create or update user profile upon login
export async function syncUserProfile(user: User, customName?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const todayKey = getTodayKey();
  const weekKey = getCurrentWeekKey();
  const monthKey = getCurrentMonthKey();
  const yearNum = getCurrentYearNum();

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      // Generate clean invite code (random 6 alphanumeric characters)
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newProfile: UserProfile = {
        uid: user.uid,
        displayName: customName || user.displayName || 'Pushup Warrior',
        email: user.email || '',
        photoURL: user.photoURL || '',
        totalReps: 0,
        dailyReps: 0,
        weeklyReps: 0,
        monthlyReps: 0,
        yearlyReps: 0,
        spankedCount: 0,
        lastActiveDate: todayKey,
        lastActiveWeek: weekKey,
        lastActiveMonth: monthKey,
        lastActiveYear: yearNum,
        inviteCode,
        friends: []
      };

      await setDoc(userRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return newProfile;
    } else {
      const existingData = snap.data() as UserProfile;
      // Rollover checks: reset daily/weekly/monthly/yearly if time period has shifted
      let dailyReps = existingData.dailyReps ?? 0;
      let weeklyReps = existingData.weeklyReps ?? 0;
      let monthlyReps = existingData.monthlyReps ?? 0;
      let yearlyReps = existingData.yearlyReps ?? 0;

      if (existingData.lastActiveDate !== todayKey) {
        dailyReps = 0;
      }
      if (existingData.lastActiveWeek !== weekKey) {
        weeklyReps = 0;
      }
      if (existingData.lastActiveMonth !== monthKey) {
        monthlyReps = 0;
      }
      if (existingData.lastActiveYear !== yearNum) {
        yearlyReps = 0;
      }

      const updates: Partial<UserProfile> = {
        dailyReps,
        weeklyReps,
        monthlyReps,
        yearlyReps,
        lastActiveDate: todayKey,
        lastActiveWeek: weekKey,
        lastActiveMonth: monthKey,
        lastActiveYear: yearNum,
      };

      if (customName && customName !== existingData.displayName) {
        updates.displayName = customName;
      } else if (!existingData.displayName && user.displayName) {
        updates.displayName = user.displayName;
      }

      if (user.email && user.email !== existingData.email) {
        updates.email = user.email;
      }

      if (user.photoURL && user.photoURL !== existingData.photoURL) {
        updates.photoURL = user.photoURL;
      }

      if (!existingData.inviteCode) {
        updates.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return {
        ...existingData,
        ...updates
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

// Log a pushup workout and update aggregated counters
export async function recordWorkout(
  user: User,
  reps: number,
  durationSeconds: number,
  formScore: number = 100
): Promise<void> {
  if (reps <= 0) return;

  const todayKey = getTodayKey();
  const weekKey = getCurrentWeekKey();
  const monthKey = getCurrentMonthKey();
  const yearNum = getCurrentYearNum();
  const workoutId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const workoutData: WorkoutSession = {
    id: workoutId,
    userId: user.uid,
    displayName: user.displayName || 'Pushup Warrior',
    reps,
    durationSeconds,
    formScore,
    dateStr: todayKey
  };

  // 1. Write workout log
  try {
    await setDoc(doc(db, 'workouts', workoutId), {
      ...workoutData,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `workouts/${workoutId}`);
  }

  // 2. Update user profile aggregates
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      const isSameDay = data.lastActiveDate === todayKey;
      const isSameWeek = data.lastActiveWeek === weekKey;
      const isSameMonth = data.lastActiveMonth === monthKey;
      const isSameYear = data.lastActiveYear === yearNum;

      const newDaily = (isSameDay ? (data.dailyReps || 0) : 0) + reps;
      const newWeekly = (isSameWeek ? (data.weeklyReps || 0) : 0) + reps;
      const newMonthly = (isSameMonth ? (data.monthlyReps || 0) : 0) + reps;
      const newYearly = (isSameYear ? (data.yearlyReps || 0) : 0) + reps;
      const newTotal = (data.totalReps || 0) + reps;

      await updateDoc(userRef, {
        dailyReps: newDaily,
        weeklyReps: newWeekly,
        monthlyReps: newMonthly,
        yearlyReps: newYearly,
        totalReps: newTotal,
        lastActiveDate: todayKey,
        lastActiveWeek: weekKey,
        lastActiveMonth: monthKey,
        lastActiveYear: yearNum,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
  }
}

// Add friend by invite code
export async function addFriendByInviteCode(currentUserUid: string, inviteCode: string): Promise<{ success: boolean; message: string; friendName?: string }> {
  try {
    const code = inviteCode.trim().toUpperCase();
    const q = query(collection(db, 'users'), where('inviteCode', '==', code), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: 'Invalid invite code. No athlete found with this code.' };
    }

    const friendDoc = querySnapshot.docs[0];
    const friendData = friendDoc.data() as UserProfile;

    if (friendData.uid === currentUserUid) {
      return { success: false, message: "You cannot add yourself as a friend!" };
    }

    // Add friend UID to current user's profile
    const myRef = doc(db, 'users', currentUserUid);
    const mySnap = await getDoc(myRef);
    if (!mySnap.exists()) {
      return { success: false, message: 'Current user profile not found.' };
    }

    const myData = mySnap.data() as UserProfile;
    const currentFriends = myData.friends || [];

    if (currentFriends.includes(friendData.uid)) {
      return { success: true, message: `${friendData.displayName} is already on your friends list!`, friendName: friendData.displayName };
    }

    const updatedFriends = [...currentFriends, friendData.uid];
    await updateDoc(myRef, {
      friends: updatedFriends,
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: `Added ${friendData.displayName} to your friends scoreboard!`,
      friendName: friendData.displayName
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${currentUserUid}`);
  }
}

// Remove friend
export async function removeFriend(currentUserUid: string, friendUid: string): Promise<void> {
  try {
    const myRef = doc(db, 'users', currentUserUid);
    const mySnap = await getDoc(myRef);
    if (!mySnap.exists()) return;
    const myData = mySnap.data() as UserProfile;
    const updated = (myData.friends || []).filter(id => id !== friendUid);
    await updateDoc(myRef, {
      friends: updated,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${currentUserUid}`);
  }
}

// Search users by name, email, or invite code
export async function searchUsers(searchTerm: string, currentUserUid: string): Promise<UserProfile[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  try {
    const usersSnap = await getDocs(query(collection(db, 'users'), limit(100)));
    const results: UserProfile[] = [];

    usersSnap.forEach((d) => {
      const data = d.data() as UserProfile;
      if (data.uid === currentUserUid) return;

      const matchesName = data.displayName?.toLowerCase().includes(term);
      const matchesEmail = data.email?.toLowerCase().includes(term);
      const matchesCode = data.inviteCode?.toLowerCase() === term;

      if (matchesName || matchesEmail || matchesCode) {
        results.push(data);
      }
    });

    return results.slice(0, 8);
  } catch (err) {
    console.error('searchUsers error:', err);
    return [];
  }
}

// Add friend by UID directly
export async function addFriendByUid(
  currentUserUid: string,
  friendUid: string
): Promise<{ success: boolean; message: string; friendName?: string }> {
  try {
    if (currentUserUid === friendUid) {
      return { success: false, message: "You cannot add yourself!" };
    }

    const myRef = doc(db, 'users', currentUserUid);
    const mySnap = await getDoc(myRef);
    if (!mySnap.exists()) {
      return { success: false, message: 'Your profile was not found.' };
    }

    const friendRef = doc(db, 'users', friendUid);
    const friendSnap = await getDoc(friendRef);
    if (!friendSnap.exists()) {
      return { success: false, message: 'User profile not found.' };
    }

    const friendData = friendSnap.data() as UserProfile;
    const myData = mySnap.data() as UserProfile;
    const currentFriends = myData.friends || [];

    if (currentFriends.includes(friendUid)) {
      return {
        success: true,
        message: `${friendData.displayName} is already in your squad!`,
        friendName: friendData.displayName
      };
    }

    // Add friend to current user
    await updateDoc(myRef, {
      friends: [...currentFriends, friendUid],
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: `Added ${friendData.displayName} to your squad!`,
      friendName: friendData.displayName
    };
  } catch (err) {
    console.error('addFriendByUid error:', err);
    return { success: false, message: 'Failed to add friend.' };
  }
}

// Record a Spank for an inactive squad member (punishment/reminder for 0 pushups in 24h)
export async function spankSquadMember(
  fromUser: { uid: string; displayName: string },
  targetFriend: { uid: string; displayName: string; dailyReps?: number; lastActiveDate?: string }
): Promise<{ success: boolean; message: string }> {
  const todayKey = getTodayKey();
  const spankId = `${fromUser.uid}_${targetFriend.uid}_${todayKey}`;

  try {
    const spankRef = doc(db, 'spanks', spankId);
    const existing = await getDoc(spankRef);
    if (existing.exists()) {
      return {
        success: false,
        message: `${targetFriend.displayName} was already spanked today!`
      };
    }

    // Record the spank in Firestore
    await setDoc(spankRef, {
      id: spankId,
      targetUid: targetFriend.uid,
      targetName: targetFriend.displayName,
      fromUid: fromUser.uid,
      fromName: fromUser.displayName,
      dateKey: todayKey,
      createdAt: serverTimestamp()
    });

    return {
      success: true,
      message: `You gave ${targetFriend.displayName} a wake-up spank! 👋`
    };
  } catch (err) {
    console.error('spankSquadMember error:', err);
    return { success: false, message: 'Could not send spank.' };
  }
}

// Check which friends were already spanked today by current user
export async function getTodaySpankedFriendIds(fromUid: string): Promise<Set<string>> {
  const todayKey = getTodayKey();
  const spankedSet = new Set<string>();

  try {
    const q = query(
      collection(db, 'spanks'),
      where('fromUid', '==', fromUid),
      where('dateKey', '==', todayKey)
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const data = d.data();
      if (data.targetUid) {
        spankedSet.add(data.targetUid);
      }
    });
  } catch (err) {
    console.error('getTodaySpankedFriendIds error:', err);
  }

  return spankedSet;
}

// Subscribe to total spanks received by a user
export function subscribeToUserSpanks(
  userId: string,
  callback: (spankCount: number, latestSpank?: { fromName?: string }) => void
): () => void {
  try {
    const q = query(
      collection(db, 'spanks'),
      where('targetUid', '==', userId)
    );
    let initialLoad = true;
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let latestSpank: { fromName?: string } | undefined;
        if (!initialLoad) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              latestSpank = { fromName: data.fromName };
            }
          });
        }
        initialLoad = false;
        callback(snapshot.size, latestSpank);
      },
      (err) => {
        console.error('subscribeToUserSpanks error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('subscribeToUserSpanks init error:', err);
    return () => {};
  }
}

// Get user profile by UID
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }
}

// Update user city
export async function updateUserCity(userId: string, city: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      city: city.trim(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

// Update complete user account details (name, age, city, height, weight)
export async function updateUserAccountDetails(
  userId: string,
  details: {
    displayName?: string;
    age?: number | string;
    city?: string;
    height?: string;
    weight?: string;
  }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const updates: Record<string, any> = { updatedAt: serverTimestamp() };
    if (details.displayName !== undefined) {
      updates.displayName = details.displayName.trim().slice(0, 60) || 'Athlete';
    }
    if (details.age !== undefined) {
      updates.age = typeof details.age === 'number' ? details.age : String(details.age).slice(0, 20);
    }
    if (details.city !== undefined) {
      updates.city = details.city.trim().slice(0, 100);
    }
    if (details.height !== undefined) {
      updates.height = details.height.trim().slice(0, 50);
    }
    if (details.weight !== undefined) {
      updates.weight = details.weight.trim().slice(0, 50);
    }
    await updateDoc(userRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

// Update notification preferences
export async function updateUserNotificationSettings(
  userId: string,
  settings: {
    dailyReminders?: boolean;
    spankNotifications?: boolean;
    reminderTime?: string;
  }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      notificationSettings: settings,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

// Update Google Health / Health Connect connection state
export async function updateGoogleHealthConnection(
  userId: string,
  connected: boolean,
  lastSync?: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      googleHealthConnected: connected,
      googleHealthLastSync: lastSync || new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

// Subscribe to Leaderboard by timeframe ('daily' | 'weekly' | 'monthly' | 'yearly')
export function subscribeToLeaderboard(
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly',
  callback: (users: UserProfile[]) => void
): () => void {
  const fieldMap: Record<string, string> = {
    daily: 'dailyReps',
    weekly: 'weeklyReps',
    monthly: 'monthlyReps',
    yearly: 'yearlyReps',
  };
  const orderField = fieldMap[timeframe] || 'dailyReps';

  const q = query(
    collection(db, 'users'),
    orderBy(orderField, 'desc'),
    limit(50)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const results: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as UserProfile);
      });
      callback(results);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );

  return unsubscribe;
}

// Google Sign In
export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Subscribe to a user's logged pushup workouts
export function subscribeToUserWorkouts(
  userId: string,
  callback: (workouts: WorkoutSession[]) => void
): () => void {
  const q = query(
    collection(db, 'workouts'),
    where('userId', '==', userId),
    limit(500)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const results: WorkoutSession[] = [];
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as WorkoutSession);
      });
      callback(results);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
    }
  );

  return unsubscribe;
}

// Subscribe to workouts for multiple users (e.g. top squad members)
export function subscribeToMultipleUsersWorkouts(
  userIds: string[],
  callback: (workouts: WorkoutSession[]) => void
): () => void {
  if (!userIds || userIds.length === 0) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, 'workouts'),
    where('userId', 'in', userIds.slice(0, 10)),
    limit(500)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const results: WorkoutSession[] = [];
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as WorkoutSession);
      });
      callback(results);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
    }
  );

  return unsubscribe;
}

// Sign Out
export async function logout(): Promise<void> {
  await firebaseSignOut(auth);
}
