import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import OpenAI from 'openai';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabase';
import { ThemeContext } from '../../utils/theme';
import Avatar from '../components/Avatar';
import CheckInModal from '../components/CheckInModal';
import MoodTimeline from '../components/MoodTimeline';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

const QUOTE_KEY = 'daily_quote';
const QUOTE_DATE_KEY = 'daily_quote_date';

// Composant FlameIcon local
function FlameIcon({ active }: { active: boolean }) {
  return (
    <View style={{ marginLeft: 4 }}>
      <View style={{
        width: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{
          width: 16,
          height: 20,
          borderRadius: 8,
          backgroundColor: active ? '#FF3B30' : '#C0C0C0',
          transform: [{ rotate: '-10deg' }],
          position: 'absolute',
          bottom: 0,
        }} />
        <View style={{
          width: 10,
          height: 12,
          borderRadius: 5,
          backgroundColor: active ? '#FFD580' : '#E0E0E0',
          position: 'absolute',
          bottom: 2,
          left: 3,
        }} />
      </View>
    </View>
  );
}

export default function HomePage() {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [quote, setQuote] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profile);
        setLoading(false);
        if (profile) {
          loadOrGenerateQuote(profile);
          if (Array.isArray(profile.checkins)) setCheckins(profile.checkins);
          checkIfCheckInNeeded(profile.checkins);
        }
      } else {
        setLoading(false);
      }
    });
  }, []);

  const loadOrGenerateQuote = async (profile: any) => {
    setLoadingQuote(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const storedDate = await AsyncStorage.getItem(QUOTE_DATE_KEY);
      const storedQuote = await AsyncStorage.getItem(QUOTE_KEY);
      if (storedDate === today && storedQuote) {
        setQuote(storedQuote);
        setLoadingQuote(false);
        return;
      }
      // Sinon, on génère une nouvelle citation
      const prompt = `Tu es une IA qui écrit des citations inspirantes et émotionnelles. Génère une citation du jour pour motiver et toucher émotionnellement l'utilisateur, en t'appuyant sur ces informations :\nPrénom : ${profile.name}\nObjectifs : ${profile.goals || 'non précisé'}\nPassions : ${profile.interests || 'non précisées'}\nDéclencheurs d'humeur : ${profile.mood_triggers || 'non précisés'}\nRituels bien-être : ${profile.self_care_habits || 'non précisés'}\nType de personnalité : ${profile.personality_type || 'non précisé'}\n\nLa citation doit être courte (1 à 2 phrases), poétique, et donner de la force pour la journée. Ne commence jamais par "Tu" ou "Vous". Utilise le prénom si possible.`;
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Tu es une IA qui écrit des citations inspirantes et émotionnelles.' },
          { role: 'user', content: prompt }
        ],
        stream: false,
        temperature: 0.8
      });
      const content = response.choices[0]?.message?.content || '';
      const finalQuote = content.replace(/^"|"$/g, '');
      setQuote(finalQuote);
      await AsyncStorage.setItem(QUOTE_KEY, finalQuote);
      await AsyncStorage.setItem(QUOTE_DATE_KEY, today);
    } catch (e) {
      setQuote('Crois en toi, chaque jour est une nouvelle chance.');
    } finally {
      setLoadingQuote(false);
    }
  };

  const checkIfCheckInNeeded = (userCheckins: any[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const hasCheckInToday = userCheckins.some((checkin: any) => checkin.date === today);
    
    if (!hasCheckInToday) {
      setShowCheckInModal(true);
    }
  };

  const handleCheckInSelect = async (color: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().slice(0, 10);
      const newCheckIn = {
        date: today,
        couleur: color.color,
        mot_cle: color.label
      };

      const updatedCheckins = [...checkins, newCheckIn];
      setCheckins(updatedCheckins);

      const { error } = await supabase
        .from('profiles')
        .update({ checkins: updatedCheckins })
        .eq('id', user.id);

      if (error) {
        console.error('Erreur lors de la sauvegarde du check-in:', error);
      }

      setShowCheckInModal(false);
    } catch (error) {
      console.error('Erreur lors du check-in:', error);
      setShowCheckInModal(false);
    }
  };

  const handleCheckInClose = () => {
    setShowCheckInModal(false);
  };

  // Construction du tableau des 7 derniers jours (du plus ancien au plus récent)
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const checkins7days = days.map(date => {
    const found = checkins.find(c => c.date === date);
    if (found) {
      return {
        date: found.date,
        color: found.color || found.couleur || '#eee',
        label: found.label || found.mot_cle || ''
      };
    } else {
      return {
        date,
        color: '#E0E0E0', // gris clair pour absence de check-in
        label: ''
      };
    }
  });

  // Calcul du streak (jours consécutifs de check-in jusqu'à aujourd'hui)
  let streakCount = 0;
  let streakDate = new Date();
  while (true) {
    const dateStr = streakDate.toISOString().slice(0, 10);
    if (checkins.find(c => c.date === dateStr)) {
      streakCount++;
      streakDate.setDate(streakDate.getDate() - 1);
    } else {
      break;
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} /></SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.centered}>
          {/* Badge streak en haut à droite */}
          <View style={{ position: 'absolute', top: 24, right: 24, flexDirection: 'row', alignItems: 'center', zIndex: 20 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text }}>{streakCount}</Text>
            <FlameIcon active={streakCount > 1} />
          </View>
          <MoodTimeline checkins={checkins7days} />
          <View style={styles.avatarContainer}>
            <Avatar size={160} url={profile?.avatar_url || null} onUpload={() => {}} editable={false} />
          </View>
          <Text style={[styles.hello, { color: theme.text }]}>Bonjour {profile?.name || 'utilisateur'} 👋</Text>
          <Text style={[styles.citationTitle, { color: theme.primary }]}>Ta citation du jour</Text>
          {loadingQuote ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 30 }} />
          ) : (
            <Text style={[styles.citation, { color: theme.secondary }]}>{quote}</Text>
          )}
          <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: theme.primary }]} onPress={() => router.push('/(tabs)/chatMobile')}>
            <Text style={styles.ctaText}>Démarrer la journée</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <CheckInModal
        visible={showCheckInModal}
        onClose={handleCheckInClose}
        onSelect={handleCheckInSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexContainer: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
  topContent: { alignItems: 'center', width: '100%', marginTop: 10 },
  bottomContent: { width: '100%', alignItems: 'center', marginBottom: 16 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  avatarContainer: {
    marginBottom: 18,
    alignItems: 'center',
  },
  hello: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  citationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 18,
    textAlign: 'center',
  },
  citation: {
    fontSize: 22,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 32,
    minHeight: 64,
  },
  ctaBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: 'center',
    marginTop: 10,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  ctaText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
