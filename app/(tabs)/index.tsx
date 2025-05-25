import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../utils/supabase';

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Bienvenue {session?.user?.email}</Text>
        <Text style={styles.subtitle}>
          Explorez notre application avec :
        </Text>
        <View style={styles.features}>
          <Text style={styles.feature}>• Chat IA pour discuter avec notre assistant</Text>
          <Text style={styles.feature}>• Gestion de votre profil dans la section Compte</Text>
        </View>
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
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  features: {
    width: '100%',
    maxWidth: 400,
  },
  feature: {
    fontSize: 16,
    marginBottom: 10,
    paddingLeft: 10,
  },
});
