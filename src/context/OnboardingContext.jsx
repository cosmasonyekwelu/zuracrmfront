// src/context/OnboardingContext.jsx
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";

const DEFAULT_STEPS = {
  invite: false,
  pipeline: false,
  email: false,
  migrate: false,
  integrations: false,
};

// Safe default value so consumers never crash if the provider is missing
const defaultValue = {
  steps: DEFAULT_STEPS,
  markDone: () => {},
  reset: () => {},
  isDone: () => false,
  progressPct: 0,
  __default: true, // dev-only flag to warn
};

const OnboardingContext = createContext(defaultValue);

export function OnboardingProvider({ children }) {
  const { user } = useAuth();
  const userKey = user?.id || "anon";
  const storageKey = `zura:onboarding:${userKey}`;

  const [steps, setSteps] = useState(DEFAULT_STEPS);

  // Load per-user progress
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      setSteps((p) => ({ ...DEFAULT_STEPS, ...saved }));
    } catch {
      setSteps(DEFAULT_STEPS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist per-user progress
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(steps));
    } catch {}
  }, [storageKey, steps]);

  const markDone = useCallback((key, val = true) => {
    if (!(key in DEFAULT_STEPS)) {
      if (import.meta?.env?.DEV) console.warn(`[Onboarding] Unknown step "${key}"`);
      return;
    }
    setSteps((p) => ({ ...p, [key]: !!val }));
  }, []);

  const reset = useCallback(() => setSteps(DEFAULT_STEPS), []);

  const isDone = useCallback((key) => Boolean(steps?.[key]), [steps]);

  const progressPct = useMemo(() => {
    const total = Object.keys(DEFAULT_STEPS).length;
    const done = Object.values(steps).filter(Boolean).length;
    return Math.round((done / total) * 100);
  }, [steps]);

  const value = useMemo(
    () => ({ steps, markDone, reset, isDone, progressPct, __default: false }),
    [steps, markDone, reset, isDone, progressPct]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (ctx.__default && import.meta?.env?.DEV) {
    console.warn("[Onboarding] OnboardingProvider is missing; using safe defaults.");
  }
  return ctx;
}
