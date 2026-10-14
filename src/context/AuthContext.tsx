import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout, syncUserProfile, testConnection, UserProfile, handleFirestoreError, OperationType, updateUserCity, updateUserAccountDetails, updateUserNotificationSettings, updateGoogleHealthConnection } from '../firebase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (customName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileName: (newName: string) => Promise<void>;
  updateCity: (city: string) => Promise<void>;
  updateAccountDetails: (details: {
    displayName?: string;
    age?: number | string;
    city?: string;
    height?: string;
    weight?: string;
  }) => Promise<void>;
  updateNotifications: (settings: {
    dailyReminders?: boolean;
    spankNotifications?: boolean;
    reminderTime?: string;
  }) => Promise<void>;
  updateHealthConnection: (connected: boolean, lastSync?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userProfile = await syncUserProfile(currentUser);
          setProfile(userProfile);
        } catch (err) {
          console.warn('Profile sync will resume when online:', err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to profile updates in real-time when user is logged in
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeSnapshot = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    );

    return () => unsubscribeSnapshot();
  }, [user]);

  const signIn = async (customName?: string) => {
    setLoading(true);
    try {
      const loggedInUser = await loginWithGoogle();
      const userProfile = await syncUserProfile(loggedInUser, customName);
      setProfile(userProfile);
    } catch (error) {
      console.error('Sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await logout();
    setUser(null);
    setProfile(null);
  };

  const updateProfileName = async (newName: string) => {
    if (!user) return;
    await syncUserProfile(user, newName);
  };

  const updateCity = async (city: string) => {
    if (!user) return;
    await updateUserCity(user.uid, city);
    // Optimistically update local profile state
    setProfile((prev) => (prev ? { ...prev, city } : null));
  };

  const updateAccountDetails = async (details: {
    displayName?: string;
    age?: number | string;
    city?: string;
    height?: string;
    weight?: string;
  }) => {
    if (!user) return;
    await updateUserAccountDetails(user.uid, details);
    setProfile((prev) => (prev ? { ...prev, ...details } : null));
  };

  const updateNotifications = async (settings: {
    dailyReminders?: boolean;
    spankNotifications?: boolean;
    reminderTime?: string;
  }) => {
    if (!user) return;
    await updateUserNotificationSettings(user.uid, settings);
    setProfile((prev) => (prev ? {
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        ...settings,
      }
    } : null));
  };

  const updateHealthConnection = async (connected: boolean, lastSync?: string) => {
    if (!user) return;
    await updateGoogleHealthConnection(user.uid, connected, lastSync);
    setProfile((prev) => (prev ? {
      ...prev,
      googleHealthConnected: connected,
      googleHealthLastSync: lastSync || new Date().toISOString()
    } : null));
  };

  const refreshProfile = async () => {
    if (!user) return;
    const p = await syncUserProfile(user);
    setProfile(p);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut,
        updateProfileName,
        updateCity,
        updateAccountDetails,
        updateNotifications,
        updateHealthConnection,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
