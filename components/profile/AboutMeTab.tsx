import { StyleSheet } from 'react-native';
import { ScrollView, Text, Pressable, View } from '@/lib/tw';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';
import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';

import { colors } from '@/constants/theme';
import type { OwnDatingProfile } from '@/hooks/use-profile';
import { updateDatingProfile, invalidateProfile } from '@/hooks/use-profile';

import { Pill } from '@/components/ui/Pill';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { IconSymbol } from '@/components/ui/icon-symbol';

type DatingStatus = 'open' | 'break' | 'winging';

const STATUS_OPTIONS: { key: DatingStatus; label: string; sub: string }[] = [
  { key: 'open', label: 'Open to Dating', sub: 'Visible in Discover' },
  { key: 'break', label: 'Taking a Break', sub: 'Hidden from Discover' },
  { key: 'winging', label: 'Just Winging', sub: 'Hidden from Discover' },
];

interface Props {
  form: UseFormReturn<OwnDatingProfile>;
  data: OwnDatingProfile;
  userId: string;
}

export function AboutMeTab({ form, data, userId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dating_status = form.watch('dating_status');

  const handleStatus = async (status: DatingStatus) => {
    const prev = form.getValues('dating_status');
    form.setValue('dating_status', status);
    try {
      const { error } = await updateDatingProfile(userId, { dating_status: status });
      if (error) throw error;
      invalidateProfile(queryClient);
    } catch {
      form.setValue('dating_status', prev);
      toast.error('Could not update status. Please try again.');
    }
  };

  const detailRows = [
    { label: 'City', value: data.city },
    { label: 'Religion', value: data.religion },
    {
      label: 'Age range',
      value: data.age_to ? `${data.age_from}–${data.age_to}` : `${data.age_from}+`,
    },
    {
      label: 'Interested in',
      value: data.interested_gender.length ? data.interested_gender.join(', ') : '—',
    },
  ];

  return (
    <ScrollView
      contentContainerClassName="p-5 pb-12"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-xs font-bold text-fg-subtle uppercase tracking-[0.6px] mt-5 mb-2">
        Dating Status
      </Text>
      <View className="bg-white rounded-xl overflow-hidden">
        {STATUS_OPTIONS.map((opt, i) => {
          const active = dating_status === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => handleStatus(opt.key)}
              className="flex-row items-center px-[14px] py-[13px]"
              style={
                i < STATUS_OPTIONS.length - 1
                  ? {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.divider,
                    }
                  : undefined
              }
            >
              <View className="flex-1">
                <Text className={'text-sm font-medium ' + (active ? 'text-accent' : 'text-fg')}>
                  {opt.label}
                </Text>
                <Text className="text-xs text-fg-subtle mt-px">{opt.sub}</Text>
              </View>
              <View
                className={
                  'w-5 h-5 rounded-lg border-2 items-center justify-center ' +
                  (active ? 'border-accent' : 'border-fg-ghost')
                }
              >
                {active && <View className="w-[10px] h-[10px] rounded-[5px] bg-accent" />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {dating_status !== 'open' && (
        <View className="flex-row items-start gap-2 bg-accent-muted rounded-lg p-3 mt-[10px]">
          <IconSymbol name="eye.slash" size={15} color={colors.purple} />
          <Text className="flex-1 text-sm text-accent leading-[18px]">
            Your profile is hidden from Discover while you{"'"}re{' '}
            {dating_status === 'break' ? 'on a break' : 'just winging'}.
          </Text>
        </View>
      )}

      {dating_status !== 'winging' && (
        <>
          <Text className="text-xs font-bold text-fg-subtle uppercase tracking-[0.6px] mt-5 mb-2">
            Details
          </Text>
          <View className="bg-white rounded-xl overflow-hidden">
            {detailRows.map((row, i) => (
              <View
                key={row.label}
                className="flex-row items-center justify-between px-[14px] py-[13px]"
                style={
                  i < detailRows.length - 1
                    ? {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.divider,
                      }
                    : undefined
                }
              >
                <Text className="text-sm text-fg-muted">{row.label}</Text>
                <Text className="text-sm font-medium text-fg">{row.value}</Text>
              </View>
            ))}
          </View>

          {data.bio ? (
            <>
              <Text className="text-xs font-bold text-fg-subtle uppercase tracking-[0.6px] mt-5 mb-2">
                Bio
              </Text>
              <View className="bg-white rounded-xl overflow-hidden p-[14px]">
                <Text className="text-sm text-fg leading-[22px]">{data.bio}</Text>
              </View>
            </>
          ) : null}

          {data.interests.length > 0 && (
            <>
              <Text className="text-xs font-bold text-fg-subtle uppercase tracking-[0.6px] mt-5 mb-2">
                Interests
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {data.interests.map((interest) => (
                  <Pill key={interest} label={interest} />
                ))}
              </View>
            </>
          )}
        </>
      )}

      <View className="mt-7">
        <PurpleButton
          label="Edit Profile"
          onPress={() => router.push('/(tabs)/profile/edit' as any)}
          outline
        />
      </View>
    </ScrollView>
  );
}
