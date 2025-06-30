import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { Redirect, Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

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

  useEffect(() => {
    if (!session) {
      setIsCheckingProfile(false);
      return;
    }
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCheckingProfile(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      if ((!profile || !profile.name) && pathname !== '/onboarding' && pathname !== '/auth') {
        router.replace('/onboarding');
      }
      setIsCheckingProfile(false);
    };
    checkProfile();
  }, [session, pathname]);

  if (!loaded || isCheckingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }}>
        <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#000'} />
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
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
        {!session && <Redirect href="/auth" />}
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}
