import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    AppState,
    AppStateStatus,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../../utils/supabase';
import { ThemeContext } from '../../utils/theme';
import { generateAPIUrl } from '../../utils/utils';
import UserProfileModal from '../components/UserProfileModal';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Vérification de la clé API
if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
  Alert.alert('Erreur', 'Clé API OpenAI manquante');
}

const SYSTEM_MESSAGE = { role: "system" as const, content: "You are a helpful assistant" };

type Message = {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
};

type Session = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  summary?: string;
  checkin_today?: any;
};

export default function ChatMobile() {
  console.log('ChatMobile monté');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?', timestamp: new Date() }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const [firstPromptSent, setFirstPromptSent] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [checkins, setCheckins] = useState<any[]>([]);

  // Nouvelles variables pour le système de sessions
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  const { theme } = React.useContext(ThemeContext);

  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    fetchUserProfile();
    fetchUserDoc();
    fetchCheckins();
    createNewSession();
  }, []);

  useEffect(() => {
    let showSub, hideSub;
    if (Platform.OS === 'ios') {
      showSub = Keyboard.addListener('keyboardWillShow', () => setIsKeyboardVisible(true));
      hideSub = Keyboard.addListener('keyboardWillHide', () => setIsKeyboardVisible(false));
    } else {
      showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
      hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    }
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Gestion AppState pour détecter fermeture/background
  useEffect(() => {
    console.log('useEffect AppState déclenché, appState:', appState);
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('handleAppStateChange:', appState, '->', nextAppState);
      if (appState.match(/active/) && nextAppState.match(/inactive|background/)) {
        // L'app va en arrière-plan ou se ferme : on génère le résumé de la session
        if (currentSession && messages.length > 1) {
          console.log('AppState: génération résumé avant background');
          await generateSessionSummary();
        }
      }
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('AppState: nouvelle session après retour au premier plan');
        await createNewSession();
      }
      setAppState(nextAppState);
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [appState, currentSession, messages]);

  // Créer une nouvelle session
  const createNewSession = async () => {
    try {
      setSessionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        console.error('Utilisateur non authentifié');
        return;
      }

      const response = await fetch(generateAPIUrl('/api/sessions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la session');
      }

      const data = await response.json();
      setCurrentSession(data.session);
      
      // Charger les messages de la session si elle existe déjà
      if (data.session.id) {
        await loadSessionMessages(data.session.id);
      }

    } catch (error) {
      console.error('Erreur création session:', error);
    } finally {
      setSessionLoading(false);
    }
  };

  // Charger les messages d'une session
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch(generateAPIUrl(`/api/sessions/${sessionId}/messages`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          const formattedMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(formattedMessages);
        }
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  // Ajouter un message à la session
  const addMessageToSession = async (message: Message) => {
    if (!currentSession?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch(generateAPIUrl('/api/messages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: currentSession.id,
          role: message.role,
          content: message.content
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.message;
      }
    } catch (error) {
      console.error('Erreur ajout message:', error);
    }
  };

  // Générer le résumé de la session
  const generateSessionSummary = async () => {
    if (!currentSession?.id || messages.length < 2) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch(generateAPIUrl(`/api/sessions/${currentSession.id}/summary`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Résumé généré:', data.summary);
      }
    } catch (error) {
      console.error('Erreur génération résumé:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && profile && profile.name) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
    }
  };

  const fetchUserDoc = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_doc')
        .eq('id', user.id)
        .single();
      if (!error && profile && profile.user_doc) {
        setUserDoc(profile.user_doc);
      } else {
        setUserDoc({ messages: [] });
      }
    } catch (error) {
      setUserDoc({ messages: [] });
    }
  };

  const fetchCheckins = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('checkins')
        .eq('id', user.id)
        .single();
      if (!error && profile && Array.isArray(profile.checkins)) {
        setCheckins(profile.checkins);
      } else {
        setCheckins([]);
      }
    } catch (error) {
      setCheckins([]);
    }
  };

  const handleProfileSubmit = () => {
    setShowProfileModal(false);
    fetchUserProfile();
  };

  const handleError = async (error: any) => {
    console.error("Error:", error);
    const errorMessage = error?.message || "Une erreur s'est produite";
    const errorMsg: Message = { 
      role: "assistant", 
      content: `Désolé, ${errorMessage}. Veuillez réessayer.`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, errorMsg]);
    await addMessageToSession(errorMsg);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleWebStream = async (response: any, assistantMessage: Message) => {
    try {
      for await (const chunk of response) {
        if (!chunk.choices[0]?.delta?.content) continue;
        const content = chunk.choices[0].delta.content;
        assistantMessage.content += content;
        setMessages(prev => [
          ...prev.slice(0, -1),
          { ...assistantMessage }
        ]);
      }
    } catch (streamError) {
      handleError(streamError);
    }
  };

  // À chaque envoi de message, ajouter à la session
  const onSend = async () => {
    if (!inputMessage.trim() || !currentSession?.id) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const userMessage: Message = { 
      role: "user", 
      content: inputMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    Keyboard.dismiss();

    // Ajouter le message utilisateur à la session
    await addMessageToSession(userMessage);

    // Construction du prompt complet
    const apiMessages = [
      await getSystemMessage(),
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: userMessage.role,
        content: userMessage.content
      }
    ];

    try {
      // Récupérer le token JWT Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Utilisateur non authentifié');
      }
      // Appel à l'API backend sécurisé
      const response = await fetch(generateAPIUrl('/api/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: apiMessages })
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Réponse non JSON : ' + text);
      }
      if (!response.ok) throw new Error(data.error || 'Erreur serveur');
      
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Ajouter le message assistant à la session
      await addMessageToSession(assistantMessage);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!firstPromptSent) setFirstPromptSent(true);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Sauvegarde à la sortie du chat
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (currentSession && messages.length > 1) {
          generateSessionSummary();
        }
      };
    }, [currentSession]) // Correction : on retire 'messages' des dépendances
  );

  // Le prompt système lit les résumés
  const getSystemMessage = () => {
    if (!userProfile) return SYSTEM_MESSAGE;
    let resumesBloc = [];
    if (userDoc && userDoc.resumes && userDoc.resumes.length > 0) {
      resumesBloc = userDoc.resumes.slice(0, 10);
    }
    // Bloc check-in mental (jour + 2 précédents)
    const today = new Date().toISOString().slice(0, 10);
    let checkinToday = null;
    let lastCheckins = [];
    if (checkins && checkins.length > 0) {
      checkinToday = checkins.find((c: any) => c.date === today);
      lastCheckins = checkins.filter((c: any) => c.date !== today).slice(0, 2);
    }
    let checkinBloc = '';
    if (checkinToday) {
      checkinBloc = `\nCheck-in mental du jour :\n- [${checkinToday.date}] Couleur : ${checkinToday.mot_cle}`;
    } else {
      checkinBloc = "\nAucun check-in mental pour aujourd'hui.";
    }
    if (lastCheckins.length > 0) {
      checkinBloc += '\nCheck-ins précédents :\n' +
        lastCheckins.map((c: any) => `- [${c.date}] Couleur : ${c.mot_cle}`).join('\n');
    }
    // Consigne humeur subtile
    let humeurInstruction = '';
    if (checkinToday) {
      humeurInstruction = `\n\nPrends en compte l'humeur du jour (${checkinToday.mot_cle}) pour adapter subtilement le ton de tes réponses, sans le mentionner explicitement à chaque message.`;
    }
    // Consigne genre/pronoms
    let genreInstruction = '';
    if (userProfile.pronouns) {
      genreInstruction = `\n\nDéduis le genre de l'utilisateur à partir de ses pronoms (« ${userProfile.pronouns} ») et utilise le bon genre et les bons accords dans tes réponses, sans le mentionner explicitement.`;
    }
    return {
      role: "system" as const,
      content: `Tu es une confidente attentionnée et bienveillante. Voici le contexte sur la personne avec qui tu parles :
      - Prénom: ${userProfile.name}
      - Âge: ${userProfile.age}
      - Pronons: ${userProfile.pronouns}
      - Profession/Études: ${userProfile.profession}
      - Routine quotidienne: ${userProfile.daily_routine}
      - Rituels bien-être: ${userProfile.self_care_habits}
      - Influences sur l'humeur: ${userProfile.mood_triggers}
      - Objectifs personnels: ${userProfile.goals}
      - Citations inspirantes: ${userProfile.favorite_quotes}
      - Type de personnalité: ${userProfile.personality_type}
      - Passions: ${userProfile.interests}

      ${checkinBloc}

      Historique des discussions récentes :
      ${resumesBloc.length > 0 ? resumesBloc.map((r: any) => `- [${r.date} ${r.heure}] Humeur : ${r.humeur} | Sujets : ${(r.sujets || []).join(', ')} | Infos clés : ${(r.infos_cles || []).join(', ')} | Résumé : ${r.resume}`).join('\n') : 'Aucun historique.'}

      Adapte ton style de communication pour être :
      1. Personnelle et empathique, en utilisant les informations de son profil
      2. Encourageante et positive, en ligne avec ses objectifs
      3. Respectueuse de ses rituels et habitudes
      4. Attentive à ses déclencheurs d'humeur
      5. Inspirante, en faisant écho à ses citations préférées
      Utilise un ton amical et intime, comme une amie proche qui la connaît bien. Tutoie-la et utilise des emojis de façon modérée pour garder un style élégant et "clean girl".${humeurInstruction}${genreInstruction}`
    };
  };

  if (sessionLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Initialisation de la session...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      {/* SUPPRESSION DU HEADER */}
      <UserProfileModal
        visible={showProfileModal}
        onClose={handleProfileSubmit}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container}>
          <FlatList
            ref={flatListRef}
            data={messages}
            contentContainerStyle={[
              styles.messageList,
              { paddingBottom: isKeyboardVisible ? 10 : tabBarHeight }
            ]}
            renderItem={({ item }) => (
              <View style={[
                styles.message,
                {
                  marginLeft: item.role === "user" ? 'auto' : 0,
                  backgroundColor: item.role === "user" ? theme.primary : theme.inputBackground
                }
              ]}>
                <Text style={[
                  styles.messageText,
                  { color: item.role === "user" ? 'white' : theme.text }
                ]}>
                  {item.content}
                </Text>
                <Text style={[
                  styles.timestamp,
                  { color: item.role === "user" ? 'rgba(255,255,255,0.7)' : theme.secondary }
                ]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            )}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        </View>
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: theme.background,
              borderTopWidth: 0.5,
              borderTopColor: '#E5E5E5',
              paddingBottom: isKeyboardVisible ? 0 : tabBarHeight
            }
          ]}
        >
          <View style={[styles.inputContainer, { backgroundColor: theme.background }]}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.inputBackground,
                }
              ]}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Message"
              placeholderTextColor={theme.secondary}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: theme.primary },
                (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={onSend}
              disabled={!inputMessage.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="send" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  messageList: {
    padding: 15,
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  inputWrapper: {
    // plus de position absolute, layout classique
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    marginRight: 10,
    padding: Platform.OS === 'ios' ? 12 : 10,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    borderRadius: 20,
    maxHeight: 100,
    minHeight: 44,
    fontSize: 16,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  customHeader: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    zIndex: 10,
  },
  customHeaderTitle: {
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});
