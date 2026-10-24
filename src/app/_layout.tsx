import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AcademyProvider, useAcademy } from '@/state/AppProvider';
import { AppText } from '@/ui/components';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AcademyProvider>
          <RootNavigator />
        </AcademyProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { ready, bootError, colors, scheme } = useAcademy();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  if (bootError) {
    return <AppText style={{ padding: 24 }}>{bootError}</AppText>;
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { color: colors.ink },
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[sessionId]" options={{ title: 'Lesson' }} />
        <Stack.Screen name="phase/[phaseId]" options={{ title: 'Phase' }} />
        <Stack.Screen name="resources" options={{ title: 'Resources' }} />
      </Stack>
    </>
  );
}
