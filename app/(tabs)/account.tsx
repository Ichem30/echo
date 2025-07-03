import { Session } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import Account from '../../components/Account';
import Auth from '../../components/Auth';
import { supabase } from '../../utils/supabase';
import { ThemeContext } from '../../utils/theme';

export default function AccountPage() {
  const [session, setSession] = useState<Session | null>(null);
  const { theme } = React.useContext(ThemeContext);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {session && session.user ? (
          <Account session={session} />
        ) : (
          <Auth />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
}); 