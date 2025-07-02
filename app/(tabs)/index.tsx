import { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../utils/supabase';
import CheckInModal from '../components/CheckInModal';

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [checkins, setCheckins] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchCheckins(session.user.id);
      }
    });
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (profile?.name) {
        setUserName(profile.name);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
    }
  };

  const fetchCheckins = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('checkins')
        .eq('id', userId)
        .single();
      if (!error && profile && Array.isArray(profile.checkins)) {
        setCheckins(profile.checkins);
        // Vérifie s'il y a un check-in aujourd'hui
        const today = new Date().toISOString().slice(0, 10);
        if (!profile.checkins.find((c: any) => c.date === today)) {
          setShowCheckIn(true);
        }
      } else {
        setCheckins([]);
        setShowCheckIn(true);
      }
    } catch (error) {
      setCheckins([]);
      setShowCheckIn(true);
    }
  };

  const handleCheckIn = useCallback(async (colorObj: any) => {
    if (!session?.user) return;
    const today = new Date().toISOString().slice(0, 10);
    let newCheckins = Array.isArray(checkins) ? [...checkins] : [];
    // Supprime le check-in du jour s'il existe déjà
    newCheckins = newCheckins.filter((c: any) => c.date !== today);
    newCheckins.unshift({ date: today, couleur: colorObj.color, mot_cle: colorObj.label });
    setCheckins(newCheckins);
    setShowCheckIn(false);
    await supabase
      .from('profiles')
      .update({ checkins: newCheckins })
      .eq('id', session.user.id);
  }, [session, checkins]);

  return (
    <SafeAreaView style={styles.container}>
      <CheckInModal visible={showCheckIn} onClose={() => setShowCheckIn(false)} onSelect={handleCheckIn} />
      <View style={styles.content}>
        <Text style={styles.title}>
          Bienvenue {userName || 'utilisateur'}
        </Text>
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
