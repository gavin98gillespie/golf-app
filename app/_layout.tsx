import 'react-native-url-polyfill/auto';

import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_400Regular,
} from '@expo-google-fonts/fraunces';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ActionSheetProvider } from '@/components/ActionSheet';
import { SessionProvider, useSessionState } from '@/lib/hooks/useSession';
import { queryClient } from '@/lib/queryClient';
import { initSentry } from '@/lib/sentry';
import { palette } from '@/theme/linksman';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_300Light,
    Fraunces_300Light_Italic,
    Fraunces_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });
  const sessionState = useSessionState();

  // Hold the splash until both fonts and the auth session have resolved.
  // Hiding on fonts alone flashes an unstyled frame while the guards are
  // still deciding where to send the user.
  const ready = (fontsLoaded || fontError) && !sessionState.loading;

  useEffect(() => {
    initSentry();
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SessionProvider value={sessionState}>
            <ActionSheetProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  // Route groups are destinations, not pushes. Fading between
                  // them reads as a state change instead of a stack shuffle.
                  animation: 'fade',
                  contentStyle: { backgroundColor: palette.ink },
                }}
              />
            </ActionSheetProvider>
          </SessionProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
