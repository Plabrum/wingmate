import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Database } from '@/types/database';
import { getOwnProfile, getOwnDatingProfile, type OwnDatingProfile } from '@/queries/profiles';
import { registerPushToken } from '@/lib/push';
import { useAuth } from '@/context/auth';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type ProfileContextValue = {
  profile: ProfileRow | null;
  datingProfile: OwnDatingProfile | null;
  loadingProfile: boolean;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [datingProfile, setDatingProfile] = useState<OwnDatingProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setDatingProfile(null);
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    const [profileResult, datingResult] = await Promise.all([
      getOwnProfile(userId),
      getOwnDatingProfile(userId),
    ]);
    setProfile(profileResult.data ?? null);
    setDatingProfile(datingResult.data ?? null);
    setLoadingProfile(false);
    registerPushToken(userId);
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider
      value={{ profile, datingProfile, loadingProfile, refreshProfile: fetchProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
