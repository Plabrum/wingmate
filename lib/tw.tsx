import { useCssElement } from 'react-native-css';
import React from 'react';
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

export const View = (props: React.ComponentProps<typeof RNView> & { className?: string }) =>
  useCssElement(RNView, props, { className: 'style' });
View.displayName = 'CSS(View)';

export const Text = (props: React.ComponentProps<typeof RNText> & { className?: string }) =>
  useCssElement(RNText, props, { className: 'style' });
Text.displayName = 'CSS(Text)';

export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string }
) => useCssElement(RNPressable, props, { className: 'style' });
Pressable.displayName = 'CSS(Pressable)';

export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  }
) =>
  useCssElement(RNScrollView, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
ScrollView.displayName = 'CSS(ScrollView)';

export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string }
) => useCssElement(RNTextInput, props, { className: 'style' });
TextInput.displayName = 'CSS(TextInput)';

export const SafeAreaView = (
  props: React.ComponentProps<typeof RNSafeAreaView> & { className?: string }
) => useCssElement(RNSafeAreaView, props, { className: 'style' });
SafeAreaView.displayName = 'CSS(SafeAreaView)';

export const AnimatedView = Animated.createAnimatedComponent(View);
