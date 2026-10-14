import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface SubscriptionContextType {
  isPro: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  planType: 'annual' | 'monthly' | null;
  showPaywall: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  startFreeTrial: (plan: 'annual' | 'monthly') => Promise<void>;
  cancelSubscription: () => Promise<void>;
  restorePurchases: () => Promise<{ success: boolean; message: string }>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const TRIAL_STORAGE_KEY = 'reps_pro_trial_ends_at';
const PLAN_STORAGE_KEY = 'reps_pro_plan';

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState<boolean>(() => {
    return localStorage.getItem('reps_is_pro') === 'true';
  });
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);
  const [planType, setPlanType] = useState<'annual' | 'monthly' | null>(() => {
    return (localStorage.getItem(PLAN_STORAGE_KEY) as 'annual' | 'monthly') || null;
  });
  const [showPaywall, setShowPaywall] = useState<boolean>(false);

  // Sync with Firestore user profile if logged in
  useEffect(() => {
    if (!user) {
      // Check local storage trial status
      evaluateLocalTrial();
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isPro !== undefined) {
            setIsPro(Boolean(data.isPro));
            setIsTrial(Boolean(data.isTrial));
            if (data.planType) setPlanType(data.planType);

            if (data.trialEndsAt) {
              const endsAtMs = typeof data.trialEndsAt === 'number'
                ? data.trialEndsAt
                : data.trialEndsAt?.toMillis?.() || Date.now();
              const diffDays = Math.max(0, Math.ceil((endsAtMs - Date.now()) / (1000 * 60 * 60 * 24)));
              setTrialDaysRemaining(diffDays);
              setIsTrial(diffDays > 0);
            }
            return;
          }
        }
        evaluateLocalTrial();
      },
      (err) => {
        console.warn('Subscription snapshot fallback to local:', err);
        evaluateLocalTrial();
      }
    );

    return () => unsubscribe();
  }, [user]);

  const evaluateLocalTrial = () => {
    const trialEndsStr = localStorage.getItem(TRIAL_STORAGE_KEY);
    const storedIsPro = localStorage.getItem('reps_is_pro') === 'true';

    if (storedIsPro) {
      setIsPro(true);
      setIsTrial(false);
      return;
    }

    if (trialEndsStr) {
      const trialEndsMs = parseInt(trialEndsStr, 10);
      const remainingMs = trialEndsMs - Date.now();
      if (remainingMs > 0) {
        setIsPro(true);
        setIsTrial(true);
        setTrialDaysRemaining(Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
        return;
      }
    }

    setIsPro(false);
    setIsTrial(false);
    setTrialDaysRemaining(0);
  };

  const openPaywall = () => setShowPaywall(true);
  const closePaywall = () => setShowPaywall(false);

  // Start 5-day free trial ($15.99/year or $2.99/month)
  const startFreeTrial = async (plan: 'annual' | 'monthly') => {
    const fiveDaysMs = Date.now() + 5 * 24 * 60 * 60 * 1000;

    localStorage.setItem('reps_is_pro', 'true');
    localStorage.setItem(TRIAL_STORAGE_KEY, fiveDaysMs.toString());
    localStorage.setItem(PLAN_STORAGE_KEY, plan);

    setIsPro(true);
    setIsTrial(true);
    setPlanType(plan);
    setTrialDaysRemaining(5);
    setShowPaywall(false);

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          isPro: true,
          isTrial: true,
          planType: plan,
          trialEndsAt: fiveDaysMs,
          subscribedAt: Date.now(),
        });
      } catch (err) {
        console.error('Error saving subscription to Firebase:', err);
      }
    }
  };

  const cancelSubscription = async () => {
    localStorage.removeItem('reps_is_pro');
    localStorage.removeItem(TRIAL_STORAGE_KEY);
    localStorage.removeItem(PLAN_STORAGE_KEY);

    setIsPro(false);
    setIsTrial(false);
    setPlanType(null);
    setTrialDaysRemaining(0);

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          isPro: false,
          isTrial: false,
          planType: null,
        });
      } catch (err) {
        console.error('Error cancelling subscription:', err);
      }
    }
  };

  // Required by Apple StoreKit and Google Play Billing
  const restorePurchases = async (): Promise<{ success: boolean; message: string }> => {
    // In production store release, calls StoreKit/Google Play Billing plugin
    const storedIsPro = localStorage.getItem('reps_is_pro') === 'true';
    if (storedIsPro) {
      setIsPro(true);
      return { success: true, message: 'Purchases restored! Reps PRO is active.' };
    }
    return { success: false, message: 'No active subscriptions found for this account.' };
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        isTrial,
        trialDaysRemaining,
        planType,
        showPaywall,
        openPaywall,
        closePaywall,
        startFreeTrial,
        cancelSubscription,
        restorePurchases,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
