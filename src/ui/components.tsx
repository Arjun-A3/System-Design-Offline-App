import { ReactNode, useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAcademy } from '@/state/AppProvider';

type Role = 'display' | 'title' | 'body' | 'small' | 'label';

const roleSize: Record<Role, number> = {
  display: 30,
  title: 20,
  body: 16,
  small: 13,
  label: 12,
};

export function AppText({
  children,
  role = 'body',
  color,
  style,
}: {
  children: ReactNode;
  role?: Role;
  color?: string;
  style?: ViewStyle | object;
}) {
  const { colors, fontScale } = useAcademy();
  const size = roleSize[role] * fontScale;
  return (
    <Text
      style={[
        {
          color: color ?? (role === 'small' || role === 'label' ? colors.muted : colors.ink),
          fontSize: size,
          lineHeight: Math.round(size * (role === 'display' ? 1.2 : 1.45)),
          fontWeight: role === 'body' || role === 'small' ? '400' : '600',
          letterSpacing: role === 'label' ? 0.6 : 0,
          textTransform: role === 'label' ? 'uppercase' : 'none',
          flexShrink: 1,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Screen({
  children,
  tab = false,
  overlay,
}: {
  children: ReactNode;
  tab?: boolean;
  overlay?: ReactNode;
}) {
  const { colors } = useAcademy();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: tab ? Math.max(insets.top, 16) : 16,
          paddingBottom: insets.bottom + (tab ? 112 : 32),
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled">
        <View style={styles.column}>{children}</View>
      </ScrollView>
      {overlay}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useAcademy();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  tone = 'primary',
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useAcademy();
  const background =
    tone === 'primary' ? colors.accent : tone === 'danger' ? colors.danger : colors.surface2;
  const text = tone === 'secondary' ? colors.ink : tone === 'danger' ? '#FFF8F8' : colors.accentInk;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.45 : pressed ? 0.82 : 1 },
      ]}>
      <AppText role="body" color={text} style={{ fontWeight: '600', textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Pill({ label, active = false }: { label: string; active?: boolean }) {
  const { colors } = useAcademy();
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: active ? colors.accent : colors.surface2 },
      ]}>
      <AppText role="small" color={active ? colors.accentInk : colors.ink}>
        {label}
      </AppText>
    </View>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const { colors } = useAcademy();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function onPress() {
    void Clipboard.setStringAsync(text.trim())
      .then((saved) => {
        if (saved === false) return;
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => setCopied(false));
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copied ? 'Copied' : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.copyButton,
        { backgroundColor: colors.surface2, opacity: pressed ? 0.82 : 1 },
      ]}>
      <AppText role="small" color={colors.ink}>
        {copied ? 'Copied' : 'Copy'}
      </AppText>
    </Pressable>
  );
}

export function Toast({ notice }: { notice: { id: number; message: string } | null }) {
  const { colors, reduceMotion } = useAcademy();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    setShown(notice);
    AccessibilityInfo.announceForAccessibility(notice.message);
  }, [notice]);

  useEffect(() => {
    if (!shown) return;
    opacity.stopAnimation();
    if (reduceMotion) {
      opacity.setValue(1);
    } else {
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }
    const hide = setTimeout(() => {
      const dismiss = () => setShown((current) => (current?.id === shown.id ? null : current));
      if (reduceMotion) {
        dismiss();
        return;
      }
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) dismiss();
      });
    }, 2600);
    return () => {
      clearTimeout(hide);
      opacity.stopAnimation();
    };
  }, [shown, opacity, reduceMotion]);

  if (!shown) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        {
          bottom: insets.bottom + 20,
          backgroundColor: colors.ink,
          opacity,
          zIndex: 20,
          elevation: 8,
        },
      ]}>
      <AppText color={colors.bg}>{shown.message}</AppText>
    </Animated.View>
  );
}

export function Field(props: TextInputProps) {
  const { colors, fontScale } = useAcademy();
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[
        styles.field,
        {
          color: colors.ink,
          backgroundColor: colors.bg,
          borderColor: colors.line,
          fontSize: 16 * fontScale,
          minHeight: props.multiline ? 150 : 48,
        },
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10, maxWidth: '100%', alignSelf: 'stretch' },
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  field: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' },
  copyButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxWidth: 720,
    alignSelf: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
