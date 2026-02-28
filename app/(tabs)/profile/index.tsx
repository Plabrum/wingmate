import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useProfile } from '@/context/profile';
import { useOwnProfile } from '@/hooks/use-own-profile';
import type { OwnDatingProfile } from '@/queries/profiles';
import { getMyWingpeople, type Wingperson } from '@/queries/contacts';

import { LargeHeader } from '@/components/ui/LargeHeader';
import { TextTabBar } from '@/components/ui/TextTabBar';
import { WingStack } from '@/components/ui/WingStack';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { AboutMeTab } from '@/components/profile/AboutMeTab';
import { PhotosTab } from '@/components/profile/PhotosTab';
import { PromptsTab } from '@/components/profile/PromptsTab';
import { ErrorBanner, getInitials } from '@/components/profile/profile-helpers';

// ── Winger view ───────────────────────────────────────────────────────────────

function WingerView({ name }: { name: string | null }) {
  const router = useRouter();
  return (
    <View style={st.wingerContainer}>
      <FaceAvatar initials={getInitials(name)} size={72} />
      <Text style={st.wingerName}>{name ?? 'Winger'}</Text>
      <Text style={st.wingerRole}>Winger</Text>
      <View style={st.wingerBtn}>
        <PurpleButton
          label="Wingpeople & Invitations"
           
          onPress={() => router.push('/(tabs)/profile/wingpeople' as any)}
          outline
        />
      </View>
    </View>
  );
}

// ── Root screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { data: remoteData, loading, refresh } = useOwnProfile();

  const [activeTab, setActiveTab] = useState(0);
  const [localData, setLocalData] = useState<OwnDatingProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wingpeople, setWingpeople] = useState<Wingperson[]>([]);

  const userId = session!.user.id;

  useEffect(() => {
    setLocalData(remoteData);
  }, [remoteData]);

  useEffect(() => {
    getMyWingpeople(userId).then(({ data }) => setWingpeople(data ?? []));
  }, [userId]);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3500);
  }, []);

  const handleOptimistic = useCallback((patch: Partial<OwnDatingProfile>) => {
    setLocalData((d) => (d ? { ...d, ...patch } : d));
  }, []);

  // Roll back is the same operation — overwrite with the previous snapshot
  const handleRollback = handleOptimistic;

  if (loading && !localData) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <View style={st.loading}>
          <ActivityIndicator color={colors.purple} />
        </View>
      </SafeAreaView>
    );
  }

  if (profile?.role === 'winger') {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <LargeHeader title="My Profile" />
        <WingerView name={profile.chosen_name} />
      </SafeAreaView>
    );
  }

  if (!localData) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <LargeHeader title="My Profile" />
        <View style={st.noProfile}>
          <Text style={st.noProfileTxt}>Complete your profile setup to see your profile here.</Text>
        </View>
      </SafeAreaView>
    );
  }

   
  const wingInitials = wingpeople.map((w) => getInitials((w as any).winger?.chosen_name));

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <LargeHeader title="My Profile" />

      {/* Wingpeople row */}
      <TouchableOpacity
        style={st.wingRow}
         
        onPress={() => router.push('/(tabs)/profile/wingpeople' as any)}
        activeOpacity={0.7}
      >
        {wingInitials.length > 0 ? (
          <>
            <WingStack initials={wingInitials} size={30} />
            <Text style={st.wingCount}>
              {wingpeople.length} wingperson{wingpeople.length !== 1 ? 'e' : ''}
            </Text>
          </>
        ) : (
          <Text style={st.wingEmpty}>No wingpeople yet — tap to invite one</Text>
        )}
        <IconSymbol name="chevron.right" size={13} color={colors.inkGhost} />
      </TouchableOpacity>

      <TextTabBar
        tabs={['About Me', 'Photos', 'Prompts']}
        active={activeTab}
        setActive={setActiveTab}
      />

      {error && <ErrorBanner message={error} />}

      {activeTab === 0 && (
        <AboutMeTab
          data={localData}
          userId={userId}
          onOptimistic={handleOptimistic}
          onRollback={handleRollback}
          onError={showError}
        />
      )}
      {activeTab === 1 && (
        <PhotosTab
          data={localData}
          userId={userId}
          onOptimistic={handleOptimistic}
          onRollback={handleRollback}
          onError={showError}
          onRefresh={refresh}
        />
      )}
      {activeTab === 2 && (
        <PromptsTab
          data={localData}
          onOptimistic={handleOptimistic}
          onRollback={handleRollback}
          onError={showError}
          onRefresh={refresh}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noProfile: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  noProfileTxt: { fontSize: 16, color: colors.inkMid, textAlign: 'center' },
  wingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  wingCount: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  wingEmpty: { flex: 1, fontSize: 14, color: colors.inkMid },
  wingerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  wingerName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 16,
    fontFamily: 'Georgia',
  },
  wingerRole: { fontSize: 14, color: colors.inkMid, marginTop: 4 },
  wingerBtn: { marginTop: 32, width: '100%' },
});
