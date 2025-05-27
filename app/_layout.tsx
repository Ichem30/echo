import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import 'react-native-reanimated';
import { ThemeProvider } from '../components/ThemeProvider';
import { supabase } from '../utils/supabase';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  console.log('RootLayout: Initializing');
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    console.log('RootLayout: Checking session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('RootLayout: Session status:', session ? 'logged in' : 'no session');
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      console.log('RootLayout: Auth state changed:', _event);
      setSession(session);
    });
  }, []);

  if (!loaded) {
    console.log('RootLayout: Fonts not loaded');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Chargement des polices...</Text>
      </View>
    );
  }

  console.log('RootLayout: Rendering main layout');
  return (
    <ThemeProvider>
      <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
        {!session && <Redirect href="/auth" />}
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}
