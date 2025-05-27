import { Session } from '@supabase/supabase-js';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '../utils/supabase';

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Index: Starting session check');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Index: Session status:', session ? 'logged in' : 'no session');
      setSession(session);
      setLoading(false);
    }).catch(error => {
      console.error('Index: Error checking session:', error);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Index: Auth state changed:', _event);
      setSession(session);
    });
  }, []);

  if (loading) {
    console.log('Index: Loading state');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!session) {
    console.log('Index: No session, redirecting to auth');
    return <Redirect href="/auth" />;
  }

  console.log('Index: Has session, redirecting to tabs');
  return <Redirect href="/(tabs)" />;
} 