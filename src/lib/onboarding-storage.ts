/** Shared keys for first-run tour (browser + optional DB flag). */

export function onboardingStorageKey(userId: string) {
  return `aura_has_seen_onboarding:${userId}`;
}

/** Set before reload to force the tour open once. */
export const ONBOARDING_REPLAY_FLAG = "aura_replay_onboarding";

export function readOnboardingSeen(userId: string): boolean {
  try {
    return localStorage.getItem(onboardingStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeOnboardingSeen(userId: string) {
  try {
    localStorage.setItem(onboardingStorageKey(userId), "1");
  } catch {
    /* ignore */
  }
}

/** Clears every onboarding key (all users on this browser). */
export function clearAllOnboardingSeen() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("aura_has_seen_onboarding")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem(ONBOARDING_REPLAY_FLAG);
  } catch {
    /* ignore */
  }
}

export function requestOnboardingReplay() {
  try {
    clearAllOnboardingSeen();
    sessionStorage.setItem(ONBOARDING_REPLAY_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function consumeOnboardingReplay(): boolean {
  try {
    if (sessionStorage.getItem(ONBOARDING_REPLAY_FLAG) === "1") {
      sessionStorage.removeItem(ONBOARDING_REPLAY_FLAG);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
