import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  Suspense,
} from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Database } from '@/types/database';
import { getProfileData, type OwnDatingProfile, type ProfileData } from '@/queries/profiles';
import { registerPushToken } from '@/lib/push';
import { useAuth } from '@/context/auth';
import { useSuspenseQuery, invalidateQuery } from '@/lib/useSuspenseQuery';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type ProfileContextValue = {
  profile: ProfileRow | null;
  datingProfile: OwnDatingProfile | null;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

// ── ProfileDataLoader ─────────────────────────────────────────────────────────
// Suspends until own profile data is available. Rendered only when userId exists.

function ProfileDataLoader({ userId, children }: { userId: string; children: React.ReactNode }) {
  const profileFn = useCallback(() => getProfileData(userId), [userId]);
  const suspenseData = useSuspenseQuery(profileFn);

  // Local state allows refreshProfile to immediately propagate new data to
  // consumers while also invalidating the Suspense cache for future mounts.
  const [localData, setLocalData] = useState<ProfileData | null>(null);
  const data = localData ?? suspenseData;

  // Acceptable exception: mount-only side-effect for external device registration.
  // userId is stable for the lifetime of this component instance.
  useEffect(() => {
    registerPushToken(userId);
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    const newData = await getProfileData(userId);
    invalidateQuery(profileFn); // ensure next Suspense mount re-fetches
    setLocalData(newData);
  }, [userId, profileFn]);

  return (
    <ProfileContext.Provider
      value={{ profile: data.profile, datingProfile: data.datingProfile, refreshProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// ── ProfileProvider ───────────────────────────────────────────────────────────

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  if (!userId) {
    return (
      <ProfileContext.Provider
        value={{ profile: null, datingProfile: null, refreshProfile: async () => {} }}
      >
        {children}
      </ProfileContext.Provider>
    );
  }

  return (
    <Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      }
    >
      <ProfileDataLoader userId={userId}>{children}</ProfileDataLoader>
    </Suspense>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
