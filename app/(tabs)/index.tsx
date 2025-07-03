import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import OpenAI from 'openai';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabase';
import { ThemeContext } from '../../utils/theme';
import Avatar from '../components/Avatar';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

const QUOTE_KEY = 'daily_quote';
const QUOTE_DATE_KEY = 'daily_quote_date';

export default function HomePage() {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [quote, setQuote] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);

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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} /></SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={styles.centered}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  avatarContainer: {
    marginBottom: 28,
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
    marginBottom: 40,
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
